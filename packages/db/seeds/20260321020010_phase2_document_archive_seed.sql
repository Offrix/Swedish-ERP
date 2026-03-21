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
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  'supplier_invoice',
  'linked',
  'manual',
  'phase2-seed-invoice-001',
  'supplier_invoice_standard',
  NOW(),
  NOW(),
  '{"seed":"phase2","description":"Baseline archive seed"}'::jsonb
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
VALUES
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000001',
    'original',
    'documents/originals/phase2-seed-invoice-001.pdf',
    'application/pdf',
    'seed-phase2-original-hash-001',
    2048,
    'phase2-seed-invoice-001',
    TRUE,
    '{"kind":"seed_original"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000001',
    'rendered_pdf',
    'documents/derived/phase2-seed-invoice-001-rendered.pdf',
    'application/pdf',
    'seed-phase2-rendered-hash-001',
    1024,
    'phase2-seed-invoice-001',
    TRUE,
    '{"kind":"seed_derivative"}'::jsonb
  )
ON CONFLICT (document_version_id) DO NOTHING;

UPDATE document_versions
SET derives_from_document_version_id = '00000000-0000-4000-8000-000000000202'
WHERE document_version_id = '00000000-0000-4000-8000-000000000203';

INSERT INTO document_links (
  document_link_id,
  document_id,
  company_id,
  target_type,
  target_id,
  linked_by_actor_id,
  linked_at,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000204',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  'company',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  '{"purpose":"archive_demo"}'::jsonb
)
ON CONFLICT (document_link_id) DO NOTHING;
