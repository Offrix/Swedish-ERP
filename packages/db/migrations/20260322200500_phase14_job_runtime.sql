CREATE TABLE IF NOT EXISTS async_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  source_event_id TEXT,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  idempotency_key TEXT,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claim_token UUID,
  worker_id TEXT,
  claimed_at TIMESTAMPTZ,
  claim_expires_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_result_code TEXT,
  last_error_class TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  correlation_id TEXT NOT NULL,
  enqueued_by TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_async_jobs_idempotency
  ON async_jobs (company_id, job_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_async_jobs_available
  ON async_jobs (status, available_at, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS ix_async_jobs_claim_expiry
  ON async_jobs (status, claim_expires_at)
  WHERE claim_expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS async_job_attempts (
  job_attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES async_jobs(job_id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL,
  worker_id TEXT NOT NULL,
  claim_token UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  result_code TEXT,
  error_class TEXT,
  error_code TEXT,
  error_message TEXT,
  result_payload_json JSONB,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_async_job_attempts_job_attempt_no
  ON async_job_attempts (job_id, attempt_no);

CREATE INDEX IF NOT EXISTS ix_async_job_attempts_job
  ON async_job_attempts (job_id, started_at);

CREATE TABLE IF NOT EXISTS async_job_dead_letters (
  dead_letter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES async_jobs(job_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  latest_attempt_id UUID REFERENCES async_job_attempts(job_attempt_id) ON DELETE SET NULL,
  terminal_reason TEXT NOT NULL,
  operator_state TEXT NOT NULL,
  replay_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  entered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_async_job_dead_letters_company_state
  ON async_job_dead_letters (company_id, operator_state, entered_at DESC);

CREATE TABLE IF NOT EXISTS async_job_replay_plans (
  replay_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES async_jobs(job_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  planned_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  planned_payload_strategy TEXT NOT NULL,
  status TEXT NOT NULL,
  approved_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  replay_job_id UUID REFERENCES async_jobs(job_id) ON DELETE SET NULL,
  planned_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_async_job_replay_plans_job
  ON async_job_replay_plans (job_id, status, created_at DESC);
