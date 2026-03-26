ALTER TABLE async_job_attempts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'running',
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;

UPDATE async_job_attempts
SET status = CASE
  WHEN result_code = 'claim_expired' OR error_code = 'worker_claim_expired' THEN 'claim_expired'
  WHEN finished_at IS NULL THEN 'running'
  WHEN next_retry_at IS NOT NULL THEN 'retry_scheduled'
  WHEN error_code IS NOT NULL THEN 'dead_lettered'
  ELSE 'succeeded'
END,
claimed_at = COALESCE(claimed_at, started_at),
claim_expires_at = COALESCE(claim_expires_at, next_retry_at);

CREATE INDEX IF NOT EXISTS ix_async_job_attempts_job_status
  ON async_job_attempts (job_id, status, attempt_no);
