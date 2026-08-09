/**
 * GaritaFlow — Tanda 4: alarma de cruce recurrente + avisos predictivos.
 * Idempotente. Run: npx ts-node src/lib/migrate-alarms.ts
 */
import { pool } from '../db';

const SCHEMA = `
-- Cruces recurrentes del usuario (tipo alarma)
CREATE TABLE IF NOT EXISTS recurring_crossings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  port_id       INTEGER NOT NULL REFERENCES ports(id),
  lane_type     TEXT NOT NULL DEFAULT 'GENERAL',
  mode          TEXT NOT NULL DEFAULT 'VEHICULAR',
  days_of_week  INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',  -- 0=Dom .. 6=Sáb
  target_time   TEXT NOT NULL,                              -- 'HH:MM' hora de cruce (local de la garita)
  lead_minutes  INTEGER NOT NULL DEFAULT 45,               -- cuánto antes avisar
  sensitivity   TEXT NOT NULL DEFAULT 'medium' CHECK (sensitivity IN ('low','medium','high')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_crossings (user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_crossings (active);

-- Log de avisos enviados (anti-spam: 1 evaluación por ventana de cruce)
CREATE TABLE IF NOT EXISTS recurring_notifications_log (
  id            BIGSERIAL PRIMARY KEY,
  recurring_id  UUID NOT NULL REFERENCES recurring_crossings(id) ON DELETE CASCADE,
  scenario      TEXT NOT NULL,        -- over | clear | saturation | none
  sent          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recnotif_rec_time ON recurring_notifications_log (recurring_id, created_at DESC);
`;

// Umbrales parametrizables (viven en gamification_config para no crear otra tabla)
const CONFIG: Array<[string, string]> = [
  ['alarm_over_pct', '30'],         // % sobre lo normal → "sal antes"
  ['alarm_saturation_pct', '70'],   // % sobre lo normal → "sobresaturación"
  ['alarm_clear_pct', '25'],        // % bajo lo normal → "despejado"
  ['alarm_min_samples', '5'],       // mínimo de datos históricos para confiar
  ['alarm_dedupe_minutes', '180'],  // no re-evaluar la misma alarma dentro de esta ventana
];

async function run() {
  console.log('🔄 Migración de alarmas...');
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
    await client.query('COMMIT');
    console.log('✅ Alarmas listas: recurring_crossings, recurring_notifications_log + umbrales.');
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
