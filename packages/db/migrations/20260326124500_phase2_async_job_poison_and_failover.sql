ALTER TABLE async_jobs
  ADD COLUMN IF NOT EXISTS claim_expiry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_claim_expired_at TIMESTAMPTZ;

ALTER TABLE async_job_dead_letters
  ADD COLUMN IF NOT EXISTS poison_pill_detected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS poison_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS poison_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS poison_detected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ix_async_job_dead_letters_poison
  ON async_job_dead_letters (poison_pill_detected, entered_at DESC)
  WHERE poison_pill_detected = TRUE;
