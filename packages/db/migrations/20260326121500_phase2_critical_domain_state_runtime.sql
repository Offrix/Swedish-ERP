CREATE TABLE IF NOT EXISTS critical_domain_state_snapshots (
  domain_key TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  snapshot_json JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  persisted_at TIMESTAMPTZ NOT NULL,
  object_version INTEGER NOT NULL CHECK (object_version > 0),
  durability_policy TEXT,
  adapter_kind TEXT
);

CREATE TABLE IF NOT EXISTS critical_domain_command_receipts (
  command_receipt_id UUID PRIMARY KEY,
  domain_key TEXT NOT NULL REFERENCES critical_domain_state_snapshots(domain_key),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  command_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  command_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  expected_object_version INTEGER,
  resulting_object_version INTEGER,
  actor_id UUID NOT NULL,
  session_revision INTEGER NOT NULL CHECK (session_revision > 0),
  correlation_id UUID NOT NULL,
  causation_id UUID,
  payload_hash TEXT NOT NULL,
  command_payload_json JSONB NOT NULL,
  metadata_json JSONB NOT NULL,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  UNIQUE (company_id, command_type, command_id),
  UNIQUE (company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS critical_domain_command_receipts_company_recorded_idx
  ON critical_domain_command_receipts (company_id, recorded_at, command_receipt_id);

CREATE TABLE IF NOT EXISTS critical_domain_domain_events (
  domain_event_id UUID PRIMARY KEY,
  domain_key TEXT NOT NULL REFERENCES critical_domain_state_snapshots(domain_key),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  command_receipt_id UUID REFERENCES critical_domain_command_receipts(command_receipt_id),
  object_version INTEGER,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  actor_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  causation_id UUID,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS critical_domain_domain_events_company_recorded_idx
  ON critical_domain_domain_events (company_id, recorded_at, domain_event_id);

CREATE INDEX IF NOT EXISTS critical_domain_domain_events_receipt_idx
  ON critical_domain_domain_events (command_receipt_id, recorded_at);

CREATE TABLE IF NOT EXISTS critical_domain_outbox_messages (
  outbox_message_id UUID PRIMARY KEY,
  domain_key TEXT NOT NULL REFERENCES critical_domain_state_snapshots(domain_key),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  command_receipt_id UUID REFERENCES critical_domain_command_receipts(command_receipt_id),
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  actor_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  causation_id UUID,
  idempotency_key TEXT,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS critical_domain_outbox_messages_company_recorded_idx
  ON critical_domain_outbox_messages (company_id, recorded_at, outbox_message_id);

CREATE INDEX IF NOT EXISTS critical_domain_outbox_messages_receipt_idx
  ON critical_domain_outbox_messages (command_receipt_id, recorded_at);

CREATE TABLE IF NOT EXISTS critical_domain_evidence_refs (
  evidence_ref_id UUID PRIMARY KEY,
  domain_key TEXT NOT NULL REFERENCES critical_domain_state_snapshots(domain_key),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  command_receipt_id UUID REFERENCES critical_domain_command_receipts(command_receipt_id),
  domain_event_id UUID REFERENCES critical_domain_domain_events(domain_event_id),
  evidence_ref_type TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  actor_id UUID,
  correlation_id UUID,
  causation_id UUID,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS critical_domain_evidence_refs_company_recorded_idx
  ON critical_domain_evidence_refs (company_id, recorded_at, evidence_ref_id);

CREATE INDEX IF NOT EXISTS critical_domain_evidence_refs_receipt_idx
  ON critical_domain_evidence_refs (command_receipt_id, recorded_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260326121500_phase2_critical_domain_state_runtime')
ON CONFLICT (migration_id) DO NOTHING;
