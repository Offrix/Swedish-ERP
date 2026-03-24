INSERT INTO import_cases (
  import_case_id,
  company_id,
  case_reference,
  status,
  goods_origin_country,
  customs_reference,
  currency_code,
  requires_customs_evidence,
  completeness_status,
  blocking_reason_codes_json,
  review_required,
  review_risk_class,
  review_queue_code,
  import_vat_base_amount,
  import_vat_amount,
  component_totals_json,
  created_by_actor_id,
  metadata_json
) VALUES (
  '20260324-7000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'IMP-SEED-001',
  'collecting_documents',
  'CN',
  'CUST-SEED-001',
  'SEK',
  TRUE,
  'blocking',
  '["CUSTOMS_EVIDENCE_MISSING"]'::jsonb,
  TRUE,
  'high',
  'VAT_REVIEW',
  12500.00,
  0.00,
  '{"GOODS":10000.00,"FREIGHT":2500.00}'::jsonb,
  'system',
  '{"rulepackCode":"RP-IMPORT-CASE-SE","rulepackVersion":"2026.1"}'::jsonb
) ON CONFLICT (import_case_id) DO NOTHING;

INSERT INTO import_case_document_links (
  import_case_document_link_id,
  import_case_id,
  company_id,
  document_id,
  role_code,
  metadata_json,
  linked_by_actor_id
) VALUES (
  '20260324-7000-4000-8000-000000000011',
  '20260324-7000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '20260324-7000-4000-8000-000000000101',
  'PRIMARY_SUPPLIER_DOCUMENT',
  '{"seed":true}'::jsonb,
  'system'
) ON CONFLICT (import_case_document_link_id) DO NOTHING;

INSERT INTO import_case_components (
  import_case_component_id,
  import_case_id,
  company_id,
  component_type,
  amount,
  currency_code,
  vat_relevance_code,
  ledger_treatment_code,
  metadata_json,
  created_by_actor_id
) VALUES
(
  '20260324-7000-4000-8000-000000000021',
  '20260324-7000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'GOODS',
  10000.00,
  'SEK',
  'IMPORT_VAT_BASE',
  'GOODS',
  '{"seed":true}'::jsonb,
  'system'
),
(
  '20260324-7000-4000-8000-000000000022',
  '20260324-7000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'FREIGHT',
  2500.00,
  'SEK',
  'IMPORT_VAT_BASE',
  'FREIGHT',
  '{"seed":true}'::jsonb,
  'system'
) ON CONFLICT (import_case_component_id) DO NOTHING;
