-- ══════════════════════════════════════════════════════════
-- UACS — Supabase PostgreSQL Schema (Unified & Robust)
-- ══════════════════════════════════════════════════════════

-- ── TABLE: messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  master_content   TEXT NOT NULL,
  urgency          TEXT NOT NULL CHECK(urgency IN ('low', 'medium', 'high', 'critical')),
  target_zone      TEXT,
  channels         TEXT NOT NULL,
  languages        TEXT NOT NULL,
  translations     TEXT NOT NULL,
  status           TEXT NOT NULL CHECK(status IN ('draft', 'pending', 'active', 'expired')),
  sent_by          TEXT,
  approved_by      TEXT,
  sent_at          TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  expiry_action    TEXT,
  expiry_message   TEXT,
  expiry_reason    TEXT,
  lat              DECIMAL(10, 8),
  lng              DECIMAL(11, 8),
  radius           INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: audit_log ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id               SERIAL PRIMARY KEY,
  message_id       INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  action           TEXT CHECK(action IN ('created', 'approved', 'dispatched', 'expired', 'edited', 'rejected')),
  performed_by     TEXT,
  channel          TEXT,
  notes            TEXT,
  timestamp        TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: users ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL, -- Actually stores mobile number
  password         TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'admin',
  location         TEXT,
  zone             TEXT DEFAULT 'General',
  language         TEXT DEFAULT 'english',
  lat              DECIMAL(10, 8),
  lng              DECIMAL(11, 8),
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users DROP COLUMN IF EXISTS department;

-- ── TABLE: recipients ────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipients (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  zone             TEXT,
  lat              DECIMAL(10, 8),
  lng              DECIMAL(11, 8),
  language         TEXT DEFAULT 'en',
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: safety_reports ────────────────────────────────
CREATE TABLE IF NOT EXISTS safety_reports (
  id               SERIAL PRIMARY KEY,
  message_id       INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_name        TEXT,
  zone             TEXT,
  status           TEXT NOT NULL CHECK(status IN ('safe', 'assistance')),
  lat              DECIMAL(10, 8),
  lng              DECIMAL(11, 8),
  emergency_contact_notified BOOLEAN DEFAULT FALSE,
  assisted         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Column Backfills (In case tables already existed) ────
DO $$ 
BEGIN 
  -- Users table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='zone') THEN
    ALTER TABLE users ADD COLUMN zone TEXT DEFAULT 'General';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='language') THEN
    ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'english';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lat') THEN
    ALTER TABLE users ADD COLUMN lat DECIMAL(10, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lng') THEN
    ALTER TABLE users ADD COLUMN lng DECIMAL(11, 8);
  END IF;

  -- Recipients table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipients' AND column_name='lat') THEN
    ALTER TABLE recipients ADD COLUMN lat DECIMAL(10, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipients' AND column_name='lng') THEN
    ALTER TABLE recipients ADD COLUMN lng DECIMAL(11, 8);
  END IF;

  -- Audit Log table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='channel') THEN
    ALTER TABLE audit_log ADD COLUMN channel TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='details') THEN
    ALTER TABLE audit_log RENAME COLUMN details TO notes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='notes') THEN
    ALTER TABLE audit_log ADD COLUMN notes TEXT;
  END IF;

  -- Safety Reports table additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='safety_reports' AND column_name='lat') THEN
    ALTER TABLE safety_reports ADD COLUMN lat DECIMAL(10, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='safety_reports' AND column_name='lng') THEN
    ALTER TABLE safety_reports ADD COLUMN lng DECIMAL(11, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='safety_reports' AND column_name='emergency_contact_notified') THEN
    ALTER TABLE safety_reports ADD COLUMN emergency_contact_notified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='safety_reports' AND column_name='assisted') THEN
    ALTER TABLE safety_reports ADD COLUMN assisted BOOLEAN DEFAULT FALSE;
  END IF;

  -- Messages table additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='expiry_reason') THEN
    ALTER TABLE messages ADD COLUMN expiry_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='lat') THEN
    ALTER TABLE messages ADD COLUMN lat DECIMAL(10, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='lng') THEN
    ALTER TABLE messages ADD COLUMN lng DECIMAL(11, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='radius') THEN
    ALTER TABLE messages ADD COLUMN radius INTEGER;
  END IF;

END $$;

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_status     ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_message_id    ON audit_log(message_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp     ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_recipients_zone     ON recipients(zone);
CREATE INDEX IF NOT EXISTS idx_recipients_phone    ON recipients(phone);

-- ── Disable Row Level Security (Universal Access) ─────────
ALTER TABLE messages       DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      DISABLE ROW LEVEL SECURITY;
ALTER TABLE users          DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipients     DISABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reports DISABLE ROW LEVEL SECURITY;

-- ── Seed: Users (ON CONFLICT DO NOTHING) ──────────────────
-- Admin: Vaibhav
INSERT INTO users (name, email, password, role, location)
VALUES ('Vaibhav', '8169825915', '$2b$10$V.fsgQjclQDmQGHtwzZ4Iu1CapFxE1BaC7Zsyb8ScqxlpOobfljci', 'admin', 'Central Command')
ON CONFLICT (email) DO NOTHING;

-- User: Krish
INSERT INTO users (name, email, password, role, location)
VALUES ('Krish', '7710962809', '$2b$10$TyeeN/X2YUank/zgd78eW.ZYhZKDnKHiQPvVqFtwWp93GWPEA.5k2', 'user', 'Field Ops')
ON CONFLICT (email) DO NOTHING;

-- User: Vedant
INSERT INTO users (name, email, password, role, location)
VALUES ('Vedant', '9653159474', '$2b$10$1EE6ZSSKILdPJ4ctzsXyfOcyRfSOSukR7UiPp8ydimEcXNYjxa7Pu', 'user', 'Field Ops')
ON CONFLICT (email) DO NOTHING;

-- User: Anurag
INSERT INTO users (name, email, password, role, location)
VALUES ('Anurag', '8482832474', '$2b$10$nSghXzF79jHXZcScY6TdDOFjanWVSTJJ/FSN6wtql/xkWt1PRFv9u', 'user', 'Field Ops')
ON CONFLICT (email) DO NOTHING;

-- Fallback Admin
INSERT INTO users (name, email, password, role, location)
VALUES ('Admin', 'admin@uacs.gov', '$2b$10$JYVIN2TSVvPymoxantR9se2dWU1rABAh2mZY5sq.x5/Jojv/SvhyK', 'admin', 'System')
ON CONFLICT (email) DO NOTHING;

-- ── Verify ───────────────────────────────────────────────
SELECT 'users' as tbl, COUNT(*) as rows FROM users
UNION ALL SELECT 'recipients', COUNT(*) FROM recipients
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL SELECT 'safety_reports', COUNT(*) FROM safety_reports;
