/**
 * Run this with: npx ts-node src/lib/migrate.ts
 * Adds push_tokens and user_alerts tables (safe to re-run)
 */
import { pool } from '../db';

const MIGRATION = `
-- push_tokens: one row per device per user
CREATE TABLE IF NOT EXISTS push_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens (user_id);

-- user_alerts: per-user alert preferences per port
CREATE TABLE IF NOT EXISTS user_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  port_id         UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  alert_types     TEXT[] NOT NULL DEFAULT ARRAY['flow_drop','congestion','incident'],
  frequency       TEXT NOT NULL DEFAULT 'immediate' CHECK (frequency IN ('immediate','hourly','daily')),
  quiet_start     TIME,
  quiet_end       TIME,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, port_id)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts (user_id);
`;

async function migrate() {
  console.log('Running migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(MIGRATION);
    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
