INSERT INTO documents (
  document_id,
  company_id,
  document_type,
  status,
  source_channel,
  source_reference,
  retention_policy_code,
  duplicate_of_document_id,
  received_at,
  storage_confirmed_at,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000205',
  '00000000-0000-4000-8000-000000000001',
  'supplier_invoice',
  'stored',
  'manual',
  'phase2-demo-duplicate-001',
  'supplier_invoice_standard',
  '00000000-0000-4000-8000-000000000201',
  NOW(),
  NOW(),
  '{"seed":"phase2_demo","duplicateOf":"00000000-0000-4000-8000-000000000201"}'::jsonb
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
  '00000000-0000-4000-8000-000000000206',
  '00000000-0000-4000-8000-000000000205',
  '00000000-0000-4000-8000-000000000001',
  'original',
  'documents/originals/phase2-demo-duplicate-001.pdf',
  'application/pdf',
  'seed-phase2-original-hash-001',
  2048,
  'phase2-demo-duplicate-001',
  TRUE,
  '{"kind":"seed_duplicate"}'::jsonb
)
ON CONFLICT (document_version_id) DO NOTHING;
