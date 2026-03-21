CREATE TABLE IF NOT EXISTS inbox_channels (
  inbox_channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  channel_code TEXT NOT NULL,
  inbound_address TEXT NOT NULL,
  use_case TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  allowed_mime_types_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_attachment_size_bytes BIGINT NOT NULL,
  default_document_type TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, channel_code),
  UNIQUE (inbound_address)
);

ALTER TABLE email_ingest_messages
  ADD COLUMN IF NOT EXISTS inbox_channel_id UUID REFERENCES inbox_channels(inbox_channel_id),
  ADD COLUMN IF NOT EXISTS recipient_address TEXT,
  ADD COLUMN IF NOT EXISTS sender_address TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS raw_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_of_email_ingest_message_id UUID REFERENCES email_ingest_messages(email_ingest_message_id),
  ADD COLUMN IF NOT EXISTS routed_document_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarantined_attachment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE email_ingest_messages
  DROP CONSTRAINT IF EXISTS email_ingest_messages_company_id_message_id_key;

CREATE TABLE IF NOT EXISTS email_ingest_attachments (
  email_ingest_attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_ingest_message_id UUID NOT NULL REFERENCES email_ingest_messages(email_ingest_message_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id),
  attachment_index INTEGER NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL,
  scan_result TEXT NOT NULL DEFAULT 'clean',
  status TEXT NOT NULL DEFAULT 'received',
  quarantine_reason_code TEXT,
  document_id UUID REFERENCES documents(document_id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email_ingest_message_id, attachment_index)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_email_ingest_messages_company_channel_message
  ON email_ingest_messages (company_id, inbox_channel_id, message_id)
  WHERE inbox_channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_inbox_channels_company_status
  ON inbox_channels (company_id, status);

CREATE INDEX IF NOT EXISTS ix_email_ingest_messages_company_status
  ON email_ingest_messages (company_id, status);

CREATE INDEX IF NOT EXISTS ix_email_ingest_attachments_company_status
  ON email_ingest_attachments (company_id, status);

CREATE INDEX IF NOT EXISTS ix_email_ingest_attachments_document_id
  ON email_ingest_attachments (document_id)
  WHERE document_id IS NOT NULL;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321030000_phase2_company_inbox')
ON CONFLICT (migration_id) DO NOTHING;
