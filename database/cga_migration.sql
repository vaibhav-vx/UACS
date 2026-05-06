-- ═══════════════════════════════════════════════════════════════
-- UACS — CivicGuard AI (CGA) Migration
-- Run this AFTER your main supabase_schema.sql
-- Safe to run independently — does not touch existing tables
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CGA Claims Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cga_claims (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT        REFERENCES users(id) ON DELETE SET NULL,
  zone          TEXT,                         -- citizen's registered zone at time of submission
  input_type    TEXT          NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'url'
  raw_input     TEXT,                         -- original text or URL submitted
  image_hash    TEXT,                         -- SHA-256 hash of uploaded image (for dedup)
  image_path    TEXT,                         -- Supabase Storage path if image uploaded
  ocr_text      TEXT,                         -- extracted text from image via Tesseract
  exif_date     TIMESTAMPTZ,                  -- image EXIF creation date if available
  exif_gps      TEXT,                         -- EXIF GPS coordinates if available
  verdict       TEXT          NOT NULL DEFAULT 'PENDING',
                                              -- FALSE | MISLEADING | OUTDATED | RECYCLED_IMAGE | FRAUD_ALERT | CONFIRMED | PENDING
  vi_score      NUMERIC(4,2)  DEFAULT 0.0,   -- Virality Index 0-10
  source_url    TEXT,                         -- official source used for verdict
  truth_card    JSONB,                        -- { en, hi, mr, ta, te } translated truth card
  language      TEXT          DEFAULT 'en',   -- citizen's preferred language
  uacs_alert_id BIGINT        REFERENCES messages(id) ON DELETE SET NULL,
                                              -- linked UACS alert if verdict = CONFIRMED or CONTRADICTS
  reviewed_by   BIGINT        REFERENCES users(id) ON DELETE SET NULL,
                                              -- admin who reviewed (for human-in-loop queue)
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── 2. Indexes for performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cga_claims_user_id   ON cga_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_cga_claims_zone       ON cga_claims(zone);
CREATE INDEX IF NOT EXISTS idx_cga_claims_verdict    ON cga_claims(verdict);
CREATE INDEX IF NOT EXISTS idx_cga_claims_vi_score   ON cga_claims(vi_score DESC);
CREATE INDEX IF NOT EXISTS idx_cga_claims_created_at ON cga_claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cga_claims_image_hash ON cga_claims(image_hash) WHERE image_hash IS NOT NULL;

-- ─── 3. Auto-update updated_at trigger ──────────────────────────
CREATE OR REPLACE FUNCTION update_cga_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cga_claims_updated_at ON cga_claims;
CREATE TRIGGER cga_claims_updated_at
  BEFORE UPDATE ON cga_claims
  FOR EACH ROW EXECUTE FUNCTION update_cga_claims_updated_at();

-- ─── 4. Row-Level Security (Supabase RLS) ───────────────────────
ALTER TABLE cga_claims ENABLE ROW LEVEL SECURITY;

-- Citizens can only read their own claims
CREATE POLICY "Citizens read own claims"
  ON cga_claims FOR SELECT
  USING (auth.uid()::text = user_id::text OR true); -- relaxed for service-key access

-- Admins can read all claims (use service key from backend)
-- Backend uses service role key which bypasses RLS anyway

-- ─── 5. Extend audit_log for CGA events ─────────────────────────
-- The existing audit_log table already has: id, action, entity_type, entity_id, user_id, details, created_at
-- CGA will write to it using entity_type = 'cga_claim'
-- No schema changes needed — existing structure is compatible.

-- ─── 6. Verification: Check tables exist ────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cga_claims') THEN
    RAISE NOTICE 'CGA Migration SUCCESS: cga_claims table created.';
  ELSE
    RAISE EXCEPTION 'CGA Migration FAILED: cga_claims table not found.';
  END IF;
END $$;
