CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  priority_code TEXT NOT NULL,
  source_domain_code TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,
  deep_link TEXT NULL,
  last_read_at TIMESTAMPTZ NULL,
  acknowledged_at TIMESTAMPTZ NULL,
  snoozed_until TIMESTAMPTZ NULL,
  dedupe_key TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  CONSTRAINT uq_notifications_company_dedupe_key UNIQUE (company_id, dedupe_key)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  notification_delivery_id UUID PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(notification_id),
  company_id UUID NOT NULL,
  channel_code TEXT NOT NULL,
  attempt_no INTEGER NOT NULL,
  status TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NULL,
  failure_reason_code TEXT NULL
);

CREATE TABLE IF NOT EXISTS notification_actions (
  notification_action_id UUID PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(notification_id),
  company_id UUID NOT NULL,
  action_code TEXT NOT NULL,
  acted_by TEXT NOT NULL,
  acted_at TIMESTAMPTZ NOT NULL,
  result_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_entries (
  activity_entry_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  source_event_id TEXT NOT NULL,
  visibility_scope TEXT NOT NULL,
  status TEXT NOT NULL,
  hidden_reason_code TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  projection_key TEXT NOT NULL,
  CONSTRAINT uq_activity_entries_projection_key UNIQUE (projection_key)
);

CREATE TABLE IF NOT EXISTS activity_relations (
  activity_relation_id UUID PRIMARY KEY,
  activity_entry_id UUID NOT NULL REFERENCES activity_entries(activity_entry_id),
  related_object_type TEXT NOT NULL,
  related_object_id TEXT NOT NULL,
  relation_code TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_notifications_company_recipient_status
  ON notifications (company_id, recipient_type, recipient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_notification_deliveries_notification
  ON notification_deliveries (notification_id, attempt_no);

CREATE INDEX IF NOT EXISTS ix_activity_entries_company_object
  ON activity_entries (company_id, object_type, object_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_activity_entries_company_visibility
  ON activity_entries (company_id, visibility_scope, occurred_at DESC);
