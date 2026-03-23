CREATE TABLE IF NOT EXISTS partner_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL,
  partner_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  rate_limit_per_minute INTEGER NOT NULL,
  fallback_mode TEXT NOT NULL,
  credentials_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_contract_results (
  contract_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES partner_connections(connection_id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL,
  partner_code TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  result TEXT NOT NULL,
  assertions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_operations (
  operation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES partner_connections(connection_id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL,
  partner_code TEXT NOT NULL,
  operation_code TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id TEXT NOT NULL,
  fallback_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  job_id UUID,
  provider_reference TEXT,
  fallback_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_reason_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS async_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  job_payload_hash TEXT NOT NULL,
  job_payload_ref TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  source_event_id TEXT,
  source_action_id TEXT,
  correlation_id UUID NOT NULL,
  retry_policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeout_seconds INTEGER NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error_class TEXT,
  replay_of_job_id UUID REFERENCES async_jobs(job_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_async_jobs_idempotency
  ON async_jobs (company_id, idempotency_key);

CREATE TABLE IF NOT EXISTS async_job_attempts (
  job_attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES async_jobs(job_id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  worker_id TEXT,
  result TEXT,
  error_class TEXT,
  error_message_redacted TEXT,
  result_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_retry_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_async_job_attempts_sequence
  ON async_job_attempts (job_id, attempt_no);

CREATE TABLE IF NOT EXISTS async_dead_letters (
  dead_letter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES async_jobs(job_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminal_reason TEXT NOT NULL,
  operator_state TEXT NOT NULL DEFAULT 'unseen',
  replay_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  risk_class TEXT NOT NULL
);
