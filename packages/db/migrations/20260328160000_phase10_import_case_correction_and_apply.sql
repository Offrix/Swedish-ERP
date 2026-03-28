ALTER TABLE import_cases
  ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS applied_target_domain_code TEXT NULL,
  ADD COLUMN IF NOT EXISTS applied_target_object_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS applied_target_object_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS applied_command_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS applied_payload_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS applied_by_actor_id TEXT NULL;

CREATE TABLE IF NOT EXISTS import_case_correction_requests (
  import_case_correction_request_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  import_case_id UUID NOT NULL REFERENCES import_cases(import_case_id),
  status TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_note TEXT NULL,
  requested_by_actor_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ NULL,
  decided_by_actor_id TEXT NULL,
  decision_code TEXT NULL,
  decision_note TEXT NULL,
  replacement_import_case_id UUID NULL REFERENCES import_cases(import_case_id)
);

CREATE INDEX IF NOT EXISTS ix_import_case_correction_requests_case
  ON import_case_correction_requests (import_case_id, status, requested_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_import_cases_applied_command
  ON import_cases (company_id, applied_command_key)
  WHERE applied_command_key IS NOT NULL;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260328160000_phase10_import_case_correction_and_apply')
ON CONFLICT (migration_id) DO NOTHING;
