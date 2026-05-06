-- ═══════════════════════════════════════════════════════════════
-- UACS — Security Migration (JWT Blocklist)
-- Run this AFTER your main supabase_schema.sql
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS token_blocklist (
  jti         TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Index to quickly find expired tokens for cron job cleanup
CREATE INDEX IF NOT EXISTS idx_token_blocklist_expires_at ON token_blocklist(expires_at);

-- Row-Level Security (Supabase RLS)
ALTER TABLE token_blocklist ENABLE ROW LEVEL SECURITY;

-- Backend uses service role key which bypasses RLS anyway
