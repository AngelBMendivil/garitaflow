/**
 * GaritaFlow 2.0 — Complete Migration
 * Creates all new tables needed for the mobile app.
 * Safe to run multiple times (IF NOT EXISTS).
 *
 * Run: npx ts-node src/lib/migrate-all.ts
 */
import { pool } from '../db';

const MIGRATION = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (auth)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  auth_provider   TEXT NOT NULL DEFAULT 'email' CHECK (auth_provider IN ('email','google')),
  provider_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users (provider_id);

-- Profiles (preferences + gamification)
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  selected_city     TEXT DEFAULT 'tijuana',
  selected_garita   TEXT,
  avatar_key        TEXT DEFAULT '😎',
  total_xp          INTEGER NOT NULL DEFAULT 0,
  level             INTEGER NOT NULL DEFAULT 1,
  total_crossings   INTEGER NOT NULL DEFAULT 0,
  badges            JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crossings (crossing sessions with timer)
CREATE TABLE IF NOT EXISTS crossings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  port_id           INTEGER NOT NULL REFERENCES ports(id),
  lane_type         TEXT NOT NULL DEFAULT 'general',
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crossings_user_id ON crossings (user_id);
CREATE INDEX IF NOT EXISTS idx_crossings_port_id ON crossings (port_id);

-- Flow events (community reports)
CREATE TABLE IF NOT EXISTS flow_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  port_id     INTEGER NOT NULL REFERENCES ports(id),
  crossing_id UUID REFERENCES crossings(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  lane_type   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_events_port_id ON flow_events (port_id, created_at DESC);

-- Flow event confirmations (community upvotes)
CREATE TABLE IF NOT EXISTS flow_event_confirmations (
  event_id    UUID NOT NULL REFERENCES flow_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- Flow index cache (computed scores, refreshed every 2 min)
CREATE TABLE IF NOT EXISTS flow_index_cache (
  port_id     INTEGER PRIMARY KEY REFERENCES ports(id),
  score       NUMERIC(5,2) NOT NULL DEFAULT 50,
  components  JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push tokens (for notifications)
CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens (user_id);

-- User alerts (per-port alert preferences)
CREATE TABLE IF NOT EXISTS user_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  port_id       INTEGER NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  alert_types   TEXT[] NOT NULL DEFAULT ARRAY['flow_drop','congestion','incident'],
  frequency     TEXT NOT NULL DEFAULT 'immediate' CHECK (frequency IN ('immediate','hourly','daily')),
  quiet_start   TIME,
  quiet_end     TIME,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, port_id)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts (user_id);
`;

async function migrateAll() {
  console.log('🔄 Running GaritaFlow 2.0 full migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(MIGRATION);
    await client.query('COMMIT');
    console.log('✅ Migration complete! Tables created:');
    console.log('   users, profiles, crossings, flow_events,');
    console.log('   flow_event_confirmations, flow_index_cache,');
    console.log('   push_tokens, user_alerts');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAll();
