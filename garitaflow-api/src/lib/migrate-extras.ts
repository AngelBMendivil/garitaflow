/**
 * GaritaFlow — Extras: has_sentri en profiles + bitácora client_logs.
 * Idempotente. Run: npx ts-node src/lib/migrate-extras.ts
 */
import { pool } from '../db';

const SCHEMA = `
-- Preferencia: el usuario tiene SENTRI (para no recomendarle SENTRI si no)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_sentri BOOLEAN NOT NULL DEFAULT FALSE;

-- Vehículo personalizado (se muestra en la tarjeta de compartir)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_color TEXT;

-- Bitácora de errores/eventos del cliente (para diagnóstico y futura admin)
CREATE TABLE IF NOT EXISTS client_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  level       TEXT NOT NULL DEFAULT 'error',   -- error | warn | info
  event       TEXT NOT NULL,                    -- ej. 'request_failed'
  message     TEXT,
  context     JSONB,                            -- { method, path, status, ... }
  platform    TEXT,
  app_version TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_logs_time ON client_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_logs_user ON client_logs (user_id, created_at DESC);
`;

async function run() {
  console.log('🔄 Migración extras (has_sentri + client_logs)...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SCHEMA);
    await client.query('COMMIT');
    console.log('✅ Listo: profiles.has_sentri + vehicle_key/color + tabla client_logs.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Falló:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
