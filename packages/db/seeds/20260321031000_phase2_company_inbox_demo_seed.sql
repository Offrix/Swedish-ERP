INSERT INTO email_ingest_messages (
  email_ingest_message_id,
  company_id,
  inbox_channel_id,
  message_id,
  mailbox_code,
  recipient_address,
  sender_address,
  subject,
  raw_storage_key,
  status,
  routed_document_count,
  quarantined_attachment_count,
  payload_json,
  received_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000301',
  '<phase2-demo-mail-001@inbound.example.test>',
  'ap_inbox',
  'ap@inbound.example.test',
  'supplier@example.test',
  'Demo supplier invoice email',
  'raw-mail/company/00000000-0000-4000-8000-000000000001/channel/00000000-0000-4000-8000-000000000301/2026/03/21/phase2-demo-mail-001.eml',
  'accepted',
  1,
  1,
  '{"demo":true,"source":"phase2_company_inbox"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (email_ingest_message_id) DO NOTHING;

INSERT INTO documents (
  document_id,
  company_id,
  document_type,
  status,
  source_channel,
  source_reference,
  retention_policy_code,
  received_at,
  storage_confirmed_at,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000001',
  'supplier_invoice',
  'stored',
  'email_inbox',
  '<phase2-demo-mail-001@inbound.example.test>:0',
  'supplier_invoice_standard',
  NOW(),
  NOW(),
  '{"phase":"2.2","rawMailId":"00000000-0000-4000-8000-000000000302","sourceAttachmentIndex":0,"mailboxCode":"ap_inbox"}'::jsonb
)
ON CONFLICT (document_id) DO NOTHING;

INSERT INTO document_versions (
  document_version_id,
  document_id,
  company_id,
  variant_type,
  storage_key,
  mime_type,
  file_hash,
  file_size_bytes,
  source_reference,
  is_immutable,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000304',
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000001',
  'original',
  'documents/originals/phase2-demo-mail-001-invoice.pdf',
  'application/pdf',
  'seed-phase2-company-inbox-original-hash-001',
  4096,
  '<phase2-demo-mail-001@inbound.example.test>:0',
  TRUE,
  '{"phase":"2.2","filename":"invoice.pdf"}'::jsonb
)
ON CONFLICT (document_version_id) DO NOTHING;

INSERT INTO email_ingest_attachments (
  email_ingest_attachment_id,
  email_ingest_message_id,
  company_id,
  attachment_index,
  filename,
  mime_type,
  file_hash,
  file_size_bytes,
  storage_key,
  scan_result,
  status,
  quarantine_reason_code,
  document_id,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    0,
    'invoice.pdf',
    'application/pdf',
    'seed-phase2-company-inbox-original-hash-001',
    4096,
    'documents/originals/phase2-demo-mail-001-invoice.pdf',
    'clean',
    'queued',
    NULL,
    '00000000-0000-4000-8000-000000000303',
    '{"phase":"2.2","routed":true}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000306',
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    1,
    'malware.exe',
    'application/x-msdownload',
    'seed-phase2-company-inbox-invalid-hash-001',
    1024,
    'documents/quarantine/phase2-demo-mail-001-malware.exe',
    'malware',
    'quarantined',
    'mime_type_not_allowed',
    NULL,
    '{"phase":"2.2","routed":false}'::jsonb
  )
ON CONFLICT (email_ingest_attachment_id) DO NOTHING;
