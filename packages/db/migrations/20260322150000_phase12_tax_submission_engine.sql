ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS annual_report_package_id UUID REFERENCES annual_report_packages(package_id) ON DELETE CASCADE;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS fiscal_year TEXT;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS source_fingerprint TEXT NOT NULL DEFAULT 'migration_backfill';
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS authority_overview_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS exports_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT 'migration_backfill';
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE tax_declaration_packages
SET
  status = COALESCE(NULLIF(status, ''), 'ready'),
  source_fingerprint = COALESCE(NULLIF(source_fingerprint, ''), output_checksum, 'migration_backfill'),
  authority_overview_json = COALESCE(authority_overview_json, '{}'::jsonb),
  exports_json = COALESCE(exports_json, '[]'::jsonb),
  created_by_actor_id = COALESCE(NULLIF(created_by_actor_id, ''), 'migration_backfill'),
  updated_at = COALESCE(updated_at, NOW()),
  fiscal_year = COALESCE(NULLIF(fiscal_year, ''), SUBSTRING(COALESCE(created_at, NOW())::text FROM 1 FOR 4))
WHERE
  status IS NULL
  OR source_fingerprint IS NULL
  OR authority_overview_json IS NULL
  OR exports_json IS NULL
  OR created_by_actor_id IS NULL
  OR updated_at IS NULL
  OR fiscal_year IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_tax_declaration_packages_status'
  ) THEN
    ALTER TABLE tax_declaration_packages
      ADD CONSTRAINT ck_tax_declaration_packages_status
      CHECK (status IN ('ready', 'submitted', 'accepted', 'rejected', 'superseded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_tax_declaration_packages_scope_v2
  ON tax_declaration_packages (company_id, annual_report_package_id, annual_report_version_id, status, fiscal_year);

CREATE TABLE IF NOT EXISTS submission_envelopes (
  submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_submission_id UUID,
  previous_submission_id UUID,
  supersedes_submission_id UUID,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL,
  period_id TEXT,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  payload_version TEXT NOT NULL,
  attempt_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ready',
  provider_key TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  signed_state TEXT NOT NULL DEFAULT 'pending',
  signatory_role_required TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  retry_class TEXT NOT NULL DEFAULT 'manual_only',
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_by_actor_id TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_submission_envelopes_status'
  ) THEN
    ALTER TABLE submission_envelopes
      ADD CONSTRAINT ck_submission_envelopes_status
      CHECK (status IN ('ready', 'signed', 'submitted', 'received', 'accepted', 'transport_failed', 'retry_pending', 'domain_rejected', 'finalized', 'superseded'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_submission_envelopes_signed_state'
  ) THEN
    ALTER TABLE submission_envelopes
      ADD CONSTRAINT ck_submission_envelopes_signed_state
      CHECK (signed_state IN ('pending', 'signed', 'not_required'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_submission_envelopes_retry_class'
  ) THEN
    ALTER TABLE submission_envelopes
      ADD CONSTRAINT ck_submission_envelopes_retry_class
      CHECK (retry_class IN ('automatic', 'manual_only', 'forbidden'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_submission_envelopes_idempotency
  ON submission_envelopes (company_id, idempotency_key, payload_hash);

CREATE INDEX IF NOT EXISTS ix_submission_envelopes_scope
  ON submission_envelopes (company_id, submission_type, status, created_at);

CREATE TABLE IF NOT EXISTS submission_receipts (
  receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission_envelopes(submission_id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  receipt_type TEXT NOT NULL,
  provider_status TEXT,
  normalized_status TEXT NOT NULL,
  raw_reference TEXT,
  message_text TEXT,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  received_by_actor_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, sequence_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_submission_receipts_type'
  ) THEN
    ALTER TABLE submission_receipts
      ADD CONSTRAINT ck_submission_receipts_type
      CHECK (receipt_type IN ('technical_ack', 'business_ack', 'final_ack', 'technical_nack', 'business_nack'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_submission_receipts_submission
  ON submission_receipts (submission_id, received_at);

CREATE TABLE IF NOT EXISTS submission_action_queue (
  queue_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission_envelopes(submission_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  owner_queue TEXT NOT NULL,
  owner_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  retry_after TIMESTAMPTZ,
  required_input_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_code TEXT,
  root_cause_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_submission_action_queue_action_type'
  ) THEN
    ALTER TABLE submission_action_queue
      ADD CONSTRAINT ck_submission_action_queue_action_type
      CHECK (action_type IN ('retry', 'collect_more_data', 'correct_payload', 'contact_provider', 'close_as_duplicate'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_submission_action_queue_status'
  ) THEN
    ALTER TABLE submission_action_queue
      ADD CONSTRAINT ck_submission_action_queue_status
      CHECK (status IN ('open', 'claimed', 'waiting_input', 'resolved', 'closed', 'auto_resolved'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_submission_action_queue_scope
  ON submission_action_queue (company_id, status, owner_queue, created_at);
