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
