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
  derives_from_document_version_id,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000001',
    'ocr',
    'documents/ocr/phase2-demo-mail-001-invoice.txt',
    'text/plain',
    'seed-phase2-ocr-run-text-hash-001',
    256,
    '00000000-0000-4000-8000-000000000303:ocr:seed',
    TRUE,
    '00000000-0000-4000-8000-000000000304',
    '{"ocrRunId":"00000000-0000-4000-8000-000000000401","modelVersion":"textract-stub-seed","reasonCode":"initial_ingest"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000001',
    'classification',
    'documents/classification/phase2-demo-mail-001-invoice.json',
    'application/json',
    'seed-phase2-ocr-classification-hash-001',
    256,
    '00000000-0000-4000-8000-000000000303:classification:seed',
    TRUE,
    '00000000-0000-4000-8000-000000000402',
    '{"ocrRunId":"00000000-0000-4000-8000-000000000401","suggestedDocumentType":"supplier_invoice","confidence":0.97}'::jsonb
  )
ON CONFLICT (document_version_id) DO NOTHING;

INSERT INTO ocr_runs (
  ocr_run_id,
  document_id,
  company_id,
  source_document_version_id,
  profile_code,
  model_version,
  reason_code,
  status,
  review_required,
  suggested_document_type,
  classification_confidence,
  classification_candidates_json,
  extracted_text,
  extracted_fields_json,
  ocr_document_version_id,
  classification_document_version_id,
  metadata_json,
  created_at,
  started_at,
  completed_at
)
VALUES (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000304',
  'textract_analyze_expense_stub',
  'textract-stub-seed',
  'initial_ingest',
  'completed',
  FALSE,
  'supplier_invoice',
  0.97,
  '[{"documentType":"supplier_invoice","confidence":0.97},{"documentType":"expense_receipt","confidence":0.18},{"documentType":"contract","confidence":0.12}]'::jsonb,
  'Invoice number INV-1001 Total 1250.00 Supplier Demo Leverantor AB OCR 12345',
  '{"counterparty":{"value":"Demo Leverantor AB","confidence":0.97},"invoiceNumber":{"value":"INV-1001","confidence":0.93},"totalAmount":{"value":"1250.00","confidence":0.97}}'::jsonb,
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000403',
  '{"reviewReasonCode":null}'::jsonb,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (ocr_run_id) DO NOTHING;

INSERT INTO documents (
  document_id,
  company_id,
  document_type,
  status,
  source_channel,
  source_reference,
  received_at,
  storage_confirmed_at,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000410',
  '00000000-0000-4000-8000-000000000001',
  NULL,
  'classified',
  'email_inbox',
  'phase2-review-demo-001',
  NOW(),
  NOW(),
  '{"inboxChannelId":"00000000-0000-4000-8000-000000000301","filename":"mystery-document.pdf"}'::jsonb
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
    '00000000-0000-4000-8000-000000000411',
    '00000000-0000-4000-8000-000000000410',
    '00000000-0000-4000-8000-000000000001',
    'original',
    'documents/originals/phase2-review-demo-001.pdf',
    'application/pdf',
    'seed-phase2-review-original-hash-001',
    2048,
    'phase2-review-demo-001',
    TRUE,
    '{"filename":"mystery-document.pdf","ocrSourceText":"Document total 100.00"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000413',
    '00000000-0000-4000-8000-000000000410',
    '00000000-0000-4000-8000-000000000001',
    'ocr',
    'documents/ocr/phase2-review-demo-001.txt',
    'text/plain',
    'seed-phase2-review-ocr-hash-001',
    128,
    'phase2-review-demo-001:ocr:seed',
    TRUE,
    '{"ocrRunId":"00000000-0000-4000-8000-000000000412"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000414',
    '00000000-0000-4000-8000-000000000410',
    '00000000-0000-4000-8000-000000000001',
    'classification',
    'documents/classification/phase2-review-demo-001.json',
    'application/json',
    'seed-phase2-review-classification-hash-001',
    128,
    'phase2-review-demo-001:classification:seed',
    TRUE,
    '{"ocrRunId":"00000000-0000-4000-8000-000000000412","suggestedDocumentType":"unknown","confidence":0.45}'::jsonb
  )
ON CONFLICT (document_version_id) DO NOTHING;

UPDATE document_versions
SET derives_from_document_version_id = '00000000-0000-4000-8000-000000000411'
WHERE document_version_id = '00000000-0000-4000-8000-000000000413';

UPDATE document_versions
SET derives_from_document_version_id = '00000000-0000-4000-8000-000000000413'
WHERE document_version_id = '00000000-0000-4000-8000-000000000414';

INSERT INTO ocr_runs (
  ocr_run_id,
  document_id,
  company_id,
  source_document_version_id,
  profile_code,
  model_version,
  reason_code,
  status,
  review_required,
  suggested_document_type,
  classification_confidence,
  classification_candidates_json,
  extracted_text,
  extracted_fields_json,
  ocr_document_version_id,
  classification_document_version_id,
  metadata_json,
  created_at,
  started_at,
  completed_at
)
VALUES (
  '00000000-0000-4000-8000-000000000412',
  '00000000-0000-4000-8000-000000000410',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000411',
  'textract_generic_text_stub',
  'textract-stub-seed',
  'initial_ingest',
  'completed',
  TRUE,
  'unknown',
  0.45,
  '[{"documentType":"unknown","confidence":0.45},{"documentType":"contract","confidence":0.32}]'::jsonb,
  'Document total 100.00',
  '{}'::jsonb,
  '00000000-0000-4000-8000-000000000413',
  '00000000-0000-4000-8000-000000000414',
  '{"reviewReasonCode":"unknown_document_type"}'::jsonb,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (ocr_run_id) DO NOTHING;

INSERT INTO review_tasks (
  review_task_id,
  company_id,
  document_id,
  ocr_run_id,
  queue_code,
  task_type,
  status,
  suggested_document_type,
  suggested_fields_json,
  corrected_document_type,
  corrected_fields_json,
  confidence_score,
  created_by_actor_id,
  metadata_json,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000415',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000410',
  '00000000-0000-4000-8000-000000000412',
  'classification_low_confidence',
  'document_review',
  'open',
  'unknown',
  '{}'::jsonb,
  NULL,
  '{}'::jsonb,
  0.45,
  '00000000-0000-4000-8000-000000000011',
  '{"reasonCode":"unknown_document_type"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (review_task_id) DO NOTHING;
