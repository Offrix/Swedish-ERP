CREATE TABLE IF NOT EXISTS review_queues (
  review_queue_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  queue_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NULL,
  owner_team_id TEXT NULL,
  status TEXT NOT NULL,
  default_risk_class TEXT NOT NULL,
  default_sla_hours INTEGER NOT NULL,
  allowed_source_domains_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_decision_types_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_review_queues_company_code UNIQUE (company_id, queue_code)
);

CREATE TABLE IF NOT EXISTS review_items (
  review_item_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  review_queue_id UUID NOT NULL REFERENCES review_queues(review_queue_id),
  review_type_code TEXT NOT NULL,
  source_domain_code TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  source_reference TEXT NULL,
  source_object_label TEXT NULL,
  required_decision_type TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NULL,
  status TEXT NOT NULL,
  policy_code TEXT NULL,
  requested_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  actor_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_by_actor_id TEXT NULL,
  claimed_at TIMESTAMPTZ NULL,
  waiting_input_reason_code TEXT NULL,
  waiting_input_note TEXT NULL,
  latest_decision_id UUID NULL,
  latest_assignment_id UUID NULL,
  escalation_count INTEGER NOT NULL DEFAULT 0,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_due_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NULL,
  closed_by_actor_id TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS review_decisions (
  review_decision_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  review_item_id UUID NOT NULL REFERENCES review_items(review_item_id),
  queue_code_before_decision TEXT NOT NULL,
  decision_code TEXT NOT NULL,
  resulting_status TEXT NOT NULL,
  decided_by_actor_id TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  reason_code TEXT NOT NULL,
  note TEXT NULL,
  override_reason_code TEXT NULL,
  decision_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  resulting_command_json JSONB NULL,
  target_queue_id UUID NULL REFERENCES review_queues(review_queue_id),
  target_queue_code TEXT NULL
);

CREATE TABLE IF NOT EXISTS review_assignments (
  review_assignment_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  review_item_id UUID NOT NULL REFERENCES review_items(review_item_id),
  assigned_user_id TEXT NULL,
  assigned_team_id TEXT NULL,
  assigned_by_actor_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL,
  reason_code TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_review_queues_company_status
  ON review_queues (company_id, status, queue_code);

CREATE INDEX IF NOT EXISTS ix_review_items_company_queue_status
  ON review_items (company_id, review_queue_id, status, sla_due_at);

CREATE INDEX IF NOT EXISTS ix_review_items_company_source
  ON review_items (company_id, source_domain_code, source_object_type, source_object_id);

CREATE INDEX IF NOT EXISTS ix_review_decisions_item
  ON review_decisions (review_item_id, decided_at);

CREATE INDEX IF NOT EXISTS ix_review_assignments_item
  ON review_assignments (review_item_id, assigned_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324140000_phase14_review_center')
ON CONFLICT (migration_id) DO NOTHING;
