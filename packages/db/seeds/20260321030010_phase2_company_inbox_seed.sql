INSERT INTO inbox_channels (
  inbox_channel_id,
  company_id,
  channel_code,
  inbound_address,
  use_case,
  status,
  allowed_mime_types_json,
  max_attachment_size_bytes,
  default_document_type,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000001',
  'ap_inbox',
  'ap@inbound.example.test',
  'supplier_invoice_inbox',
  'active',
  '["application/pdf","image/jpeg","image/png"]'::jsonb,
  15728640,
  'supplier_invoice',
  '{"phase":"2.2","routing":"exact_alias"}'::jsonb
)
ON CONFLICT (inbox_channel_id) DO NOTHING;
