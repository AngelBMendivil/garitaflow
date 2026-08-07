/**
 * GaritaFlow 2.0 — Migración de Gamificación + Geo/Anti-SPAM
 * Idempotente (IF NOT EXISTS / ON CONFLICT DO NOTHING). Seguro de correr varias veces.
 *
 * Run: npx ts-node src/lib/migrate-gamification.ts
 */
import { pool } from '../db';

const SCHEMA = `
-- Configuración parametrizable desde backend (sin publicar app)
CREATE TABLE IF NOT EXISTS gamification_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Definición de badges (2 categorías + niveles especiales), editable en BD
CREATE TABLE IF NOT EXISTS badges (
  id         SERIAL PRIMARY KEY,
  category   TEXT NOT NULL CHECK (category IN ('crossings','community')),
  level      INTEGER NOT NULL,
  name       TEXT NOT NULL,
  threshold  INTEGER NOT NULL,
  special    BOOLEAN NOT NULL DEFAULT FALSE,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (category, level)
);

-- Corredores/geocercas (polígonos por garita/carril/dirección)
CREATE TABLE IF NOT EXISTS geofences (
  id                          SERIAL PRIMARY KEY,
  port_id                     INTEGER REFERENCES ports(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  lane_type                   TEXT,
  direction                   TEXT,
  polygon                     JSONB NOT NULL,             -- [[lng,lat], ...]
  active                      BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_stay_seconds        INTEGER,                    -- null = usa config global
  validation_radius_tolerance NUMERIC,                    -- metros de tolerancia
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_geofences_port ON geofences (port_id, active);

-- Pings de ubicación (para permanencia mínima y detección de abuso)
CREATE TABLE IF NOT EXISTS user_location_pings (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat          NUMERIC(9,6) NOT NULL,
  lng          NUMERIC(9,6) NOT NULL,
  accuracy     NUMERIC,
  geofence_id  INTEGER REFERENCES geofences(id) ON DELETE SET NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pings_user_time ON user_location_pings (user_id, captured_at DESC);

-- Columnas de validación en los reportes de comunidad
ALTER TABLE flow_events ADD COLUMN IF NOT EXISTS geo_validation_status  TEXT NOT NULL DEFAULT 'OUTSIDE_VALID_AREA';
ALTER TABLE flow_events ADD COLUMN IF NOT EXISTS eligible_for_gamification BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE flow_events ADD COLUMN IF NOT EXISTS moderation_status      TEXT NOT NULL DEFAULT 'clean';
ALTER TABLE flow_events ADD COLUMN IF NOT EXISTS lat                    NUMERIC(9,6);
ALTER TABLE flow_events ADD COLUMN IF NOT EXISTS lng                    NUMERIC(9,6);

-- Contadores de gamificación en el perfil (acumulativos, no se reinician)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS valid_contributions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_flags          INTEGER NOT NULL DEFAULT 0;
`;

// Config por defecto (todo configurable después vía UPDATE gamification_config)
const CONFIG: Array<[string, string]> = [
  ['min_stay_seconds', '180'],          // permanencia mínima en corredor (3 min)
  ['location_max_age_seconds', '300'],  // vigencia de ubicación (5 min)
  ['cooldown_seconds', '900'],          // 1 aporte válido cada 15 min
  ['geo_validation_enabled', 'false'],  // false hasta sembrar corredores (Fase B)
  ['low_accuracy_meters', '150'],       // ubicaciones con precisión peor a esto = sospechosas
  ['max_speed_kmh', '160'],             // saltos por encima de esto = flag de riesgo
];

const CROSSING_BADGES: Array<[number, string, number, boolean]> = [
  [1, 'Primeros Kilómetros', 10, false],
  [2, 'Border Rookie', 25, false],
  [3, 'Border Regular', 75, false],
  [4, 'Cruce Constante', 150, false],
  [5, 'Flow Commuter', 250, false],
  [6, 'Border Pro', 500, false],
  [7, 'Veterano de Garita', 750, false],
  [8, 'Cross-Border Elite', 1000, false],
  [9, 'Flow Master', 1500, false],
  [10, 'Border Legend', 2500, false],
  [11, 'Hall of Flow', 5000, true],
  [12, 'GaritaFlow Icon', 10000, true],
];

const COMMUNITY_BADGES: Array<[number, string, number, boolean]> = [
  [1, 'Flow Scout', 5, false],
  [2, 'Reportero de Línea', 15, false],
  [3, 'Ojos en la Garita', 50, false],
  [4, 'Voz Fronteriza', 100, false],
  [5, 'Guía de Cruce', 250, false],
  [6, 'Radar Fronterizo', 500, false],
  [7, 'Flow Insider', 750, false],
  [8, 'Border Sentinel', 1000, false],
  [9, 'Community Elite', 1500, false],
  [10, 'Flow Legend', 2500, false],
];

async function run() {
  console.log('🔄 Migración de gamificación...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SCHEMA);

    for (const [key, value] of CONFIG) {
      await client.query(
        `INSERT INTO gamification_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, value]
      );
    }

    const seedBadges = async (category: string, rows: Array<[number, string, number, boolean]>) => {
      for (const [level, name, threshold, special] of rows) {
        await client.query(
          `INSERT INTO badges (category, level, name, threshold, special)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (category, level) DO UPDATE
             SET name = EXCLUDED.name, threshold = EXCLUDED.threshold, special = EXCLUDED.special`,
          [category, level, name, threshold, special]
        );
      }
    };
    await seedBadges('crossings', CROSSING_BADGES);
    await seedBadges('community', COMMUNITY_BADGES);

    // Corredores APROXIMADOS (rectángulos sobre la zona de fila del lado MX).
    // Afinar después en BD. No se duplican (guard por nombre).
    const seedFence = async (
      code: string, name: string, direction: string, polygon: number[][]
    ) => {
      await client.query(
        `INSERT INTO geofences (port_id, name, lane_type, direction, polygon, active)
         SELECT p.id, $2, NULL, $3, $4::jsonb, TRUE
           FROM ports p WHERE p.code = $1
            AND NOT EXISTS (SELECT 1 FROM geofences g WHERE g.name = $2)`,
        [code, name, direction, JSON.stringify(polygon)]
      );
    };
    await seedFence('SAN_YSIDRO', 'San Ysidro — corredor aprox', 'NB', [
      [-117.0338, 32.5360], [-117.0268, 32.5360],
      [-117.0268, 32.5422], [-117.0338, 32.5422],
    ]);
    await seedFence('OTAY', 'Otay — corredor aprox', 'NB', [
      [-116.9422, 32.5398], [-116.9346, 32.5398],
      [-116.9346, 32.5462], [-116.9422, 32.5462],
    ]);

    await client.query('COMMIT');
    console.log('✅ Gamificación lista: gamification_config, badges, geofences,');
    console.log('   user_location_pings + columnas de validación en flow_events y profiles.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migración falló:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
