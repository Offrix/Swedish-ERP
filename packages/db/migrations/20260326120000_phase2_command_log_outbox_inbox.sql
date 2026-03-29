CREATE TABLE IF NOT EXISTS command_receipts (
  command_receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  command_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  command_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  expected_object_version BIGINT,
  resulting_object_version BIGINT,
  actor_id TEXT NOT NULL,
  session_revision BIGINT NOT NULL,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  payload_hash TEXT NOT NULL,
  command_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'accepted',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, command_type, command_id),
  UNIQUE (company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS command_receipts_company_recorded_idx
  ON command_receipts (company_id, recorded_at, command_receipt_id);

CREATE TABLE IF NOT EXISTS command_inbox_messages (
  inbox_message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  source_system TEXT NOT NULL,
  message_id TEXT NOT NULL,
  aggregate_type TEXT,
  aggregate_id TEXT,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  causation_id TEXT,
  actor_id TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_code TEXT,
  UNIQUE (company_id, source_system, message_id)
);

CREATE INDEX IF NOT EXISTS command_inbox_messages_company_received_idx
  ON command_inbox_messages (company_id, received_at, inbox_message_id);

CREATE TABLE IF NOT EXISTS command_domain_events (
  domain_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  command_receipt_id UUID REFERENCES command_receipts(command_receipt_id),
  object_version BIGINT,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS command_domain_events_company_recorded_idx
  ON command_domain_events (company_id, recorded_at, domain_event_id);

CREATE INDEX IF NOT EXISTS command_domain_events_receipt_idx
  ON command_domain_events (command_receipt_id, recorded_at);

CREATE TABLE IF NOT EXISTS command_evidence_refs (
  evidence_ref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  command_receipt_id UUID REFERENCES command_receipts(command_receipt_id),
  domain_event_id UUID REFERENCES command_domain_events(domain_event_id),
  evidence_ref_type TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id TEXT,
  correlation_id TEXT,
  causation_id TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS command_evidence_refs_company_recorded_idx
  ON command_evidence_refs (company_id, recorded_at, evidence_ref_id);

CREATE INDEX IF NOT EXISTS command_evidence_refs_receipt_idx
  ON command_evidence_refs (command_receipt_id, recorded_at);

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS command_receipt_id UUID REFERENCES command_receipts(command_receipt_id),
  ADD COLUMN IF NOT EXISTS actor_id TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS causation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS outbox_events_command_receipt_idx
  ON outbox_events (command_receipt_id, recorded_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260326120000_phase2_command_log_outbox_inbox')
ON CONFLICT (migration_id) DO NOTHING;
