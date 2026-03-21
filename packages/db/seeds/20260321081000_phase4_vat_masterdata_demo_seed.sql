INSERT INTO vat_review_queue_items (
  vat_review_queue_item_id,
  company_id,
  source_type,
  source_id,
  inputs_hash,
  rule_pack_id,
  effective_date,
  review_reason_code,
  review_queue_code,
  vat_code_candidate,
  status,
  warnings_json,
  explanation_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000000821',
  '00000000-0000-4000-8000-000000000001',
  'AR_INVOICE',
  'phase4-vat-demo-review',
  'phase4-vat-demo-review-hash',
  'vat-se-2026.1',
  DATE '2026-03-21',
  'missing_mandatory_vat_fields',
  'vat_decision_review',
  'VAT_SE_DOMESTIC_25',
  'open',
  '[{"code":"missing_mandatory_vat_fields","message":"Missing mandatory VAT fields: buyer_vat_number_status"}]'::jsonb,
  '[
    "company_id=00000000-0000-4000-8000-000000000001",
    "rule_pack_id=vat-se-2026.1",
    "missing_fields=buyer_vat_number_status",
    "Decision routed to manual review because mandatory VAT facts are incomplete."
  ]'::jsonb,
  'system'
)
ON CONFLICT (vat_review_queue_item_id) DO NOTHING;

INSERT INTO vat_decisions (
  vat_decision_id,
  company_id,
  source_type,
  source_id,
  decision_code,
  rule_pack_id,
  explanation_json,
  vat_code,
  rule_pack_version,
  source_snapshot_date,
  inputs_hash,
  effective_date,
  status,
  declaration_box_codes_json,
  booking_template_code,
  outputs_json,
  warnings_json,
  review_queue_code,
  review_queue_item_id,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000000822',
    '00000000-0000-4000-8000-000000000001',
    'AR_INVOICE',
    'phase4-vat-demo-domestic',
    'VAT_SE_DOMESTIC_25',
    'vat-se-2026.1',
    '[
      "rule_pack_id=vat-se-2026.1",
      "vat_code=VAT_SE_DOMESTIC_25",
      "seller_country=SE",
      "buyer_country=SE",
      "goods_or_services=goods",
      "vat_rate=25",
      "source_type=AR_INVOICE"
    ]'::jsonb,
    'VAT_SE_DOMESTIC_25',
    '2026.1',
    DATE '2026-03-21',
    'phase4-vat-demo-domestic-hash',
    DATE '2026-03-21',
    'decided',
    '["05","10"]'::jsonb,
    'vat_se_domestic_25',
    '{"vatCode":"VAT_SE_DOMESTIC_25","declarationBoxCodes":["05","10"],"bookingTemplateCode":"vat_se_domestic_25","vatRate":25,"rateType":"standard_or_special"}'::jsonb,
    '[]'::jsonb,
    NULL,
    NULL,
    'system'
  ),
  (
    '00000000-0000-4000-8000-000000000823',
    '00000000-0000-4000-8000-000000000001',
    'AR_INVOICE',
    'phase4-vat-demo-review',
    'VAT_REVIEW_REQUIRED',
    'vat-se-2026.1',
    '[
      "company_id=00000000-0000-4000-8000-000000000001",
      "rule_pack_id=vat-se-2026.1",
      "missing_fields=buyer_vat_number_status",
      "Decision routed to manual review because mandatory VAT facts are incomplete."
    ]'::jsonb,
    'VAT_REVIEW_REQUIRED',
    '2026.1',
    DATE '2026-03-21',
    'phase4-vat-demo-review-hash',
    DATE '2026-03-21',
    'review_required',
    '[]'::jsonb,
    'vat_review_required',
    '{"vatCode":"VAT_REVIEW_REQUIRED","declarationBoxCodes":[],"bookingTemplateCode":"vat_review_required","vatRate":0,"rateType":"zero_or_exempt"}'::jsonb,
    '[{"code":"missing_mandatory_vat_fields","message":"Missing mandatory VAT fields: buyer_vat_number_status"}]'::jsonb,
    'vat_decision_review',
    '00000000-0000-4000-8000-000000000821',
    'system'
  )
ON CONFLICT (vat_decision_id) DO NOTHING;
