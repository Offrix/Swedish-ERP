ALTER TABLE async_job_replay_plans
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_outcome_code TEXT,
  ADD COLUMN IF NOT EXISTS last_error_class TEXT;

UPDATE async_job_replay_plans
SET status = 'pending_approval'
WHERE status = 'planned';

UPDATE async_job_replay_plans
SET status = 'scheduled',
    scheduled_at = COALESCE(scheduled_at, executed_at)
WHERE status = 'executed';
