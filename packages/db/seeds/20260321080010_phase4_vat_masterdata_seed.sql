INSERT INTO rule_packs (
  rule_pack_id,
  domain,
  jurisdiction,
  effective_from,
  effective_to,
  version,
  checksum,
  source_snapshot_date,
  semantic_change_summary,
  machine_readable_rules_json,
  human_readable_explanation_json,
  test_vectors_json,
  migration_notes_json
)
VALUES
  (
    'vat-se-2025.4',
    'vat',
    'SE',
    DATE '2025-01-01',
    DATE '2025-12-31',
    '2025.4',
    'phase4-1-vat-se-2025-4',
    DATE '2025-12-31',
    'Historical VAT decision baseline before 2026 pack refresh.',
    '{
      "requiredFields":[
        "seller_country","buyer_country","buyer_type","buyer_vat_no","supply_type","goods_or_services",
        "invoice_date","delivery_date","currency","line_amount_ex_vat","vat_rate","vat_code_candidate",
        "project_id","source_type","source_id","seller_vat_registration_country","buyer_is_taxable_person",
        "buyer_vat_number","buyer_vat_number_status","supply_subtype","property_related_flag",
        "construction_service_flag","transport_end_country","import_flag","export_flag","reverse_charge_flag",
        "oss_flag","ioss_flag","tax_date","prepayment_date","line_discount","line_quantity","line_uom",
        "tax_rate_candidate","exemption_reason","invoice_text_code","report_box_code"
      ],
      "reviewQueueCode":"vat_decision_review"
    }'::jsonb,
    '[
      "Use the candidate only when the mandatory VAT facts are present and structurally consistent.",
      "Missing or contradictory facts must route to manual review instead of silent booking."
    ]'::jsonb,
    '[
      {"vectorId":"vat-historical-domestic-25","decisionCode":"VAT_SE_DOMESTIC_25"},
      {"vectorId":"vat-historical-review-required","decisionCode":"VAT_REVIEW_REQUIRED"}
    ]'::jsonb,
    '["Historical rule pack retained for deterministic replay."]'::jsonb
  ),
  (
    'vat-se-2026.1',
    'vat',
    'SE',
    DATE '2026-01-01',
    NULL,
    '2026.1',
    'phase4-1-vat-se-2026-1',
    DATE '2026-03-21',
    'Initial production VAT masterdata and decision object baseline for 2026.',
    '{
      "requiredFields":[
        "seller_country","buyer_country","buyer_type","buyer_vat_no","supply_type","goods_or_services",
        "invoice_date","delivery_date","currency","line_amount_ex_vat","vat_rate","vat_code_candidate",
        "project_id","source_type","source_id","seller_vat_registration_country","buyer_is_taxable_person",
        "buyer_vat_number","buyer_vat_number_status","supply_subtype","property_related_flag",
        "construction_service_flag","transport_end_country","import_flag","export_flag","reverse_charge_flag",
        "oss_flag","ioss_flag","tax_date","prepayment_date","line_discount","line_quantity","line_uom",
        "tax_rate_candidate","exemption_reason","invoice_text_code","report_box_code"
      ],
      "reviewQueueCode":"vat_decision_review"
    }'::jsonb,
    '[
      "Resolve a rule pack by jurisdiction and date before a VAT decision is accepted.",
      "If a transaction misses mandatory fields or the candidate conflicts with structural facts, queue it for review."
    ]'::jsonb,
    '[
      {"vectorId":"vat-domestic-25","decisionCode":"VAT_SE_DOMESTIC_25"},
      {"vectorId":"vat-eu-goods-b2b","decisionCode":"VAT_SE_EU_GOODS_B2B"},
      {"vectorId":"vat-review-missing-fields","decisionCode":"VAT_REVIEW_REQUIRED"}
    ]'::jsonb,
    '["4.1 pack establishes masterdata, decision object traceability and review routing."]'::jsonb
  )
ON CONFLICT (rule_pack_id) DO NOTHING;

INSERT INTO vat_codes (
  vat_code_id,
  company_id,
  vat_code,
  label,
  vat_rate,
  rate_type,
  declaration_box_codes_json,
  booking_template_code,
  active_flag,
  valid_from,
  valid_to
)
VALUES
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_25', 'Domestic 25 %', 25, 'standard_or_special', '["05","10"]'::jsonb, 'vat_se_domestic_25', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_12', 'Domestic 12 %', 12, 'standard_or_special', '["05","11"]'::jsonb, 'vat_se_domestic_12', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_6', 'Domestic 6 %', 6, 'standard_or_special', '["05","12"]'::jsonb, 'vat_se_domestic_6', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EXEMPT', 'Exempt or zero-rated', 0, 'zero_or_exempt', '["40"]'::jsonb, 'vat_se_exempt', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000805', '00000000-0000-4000-8000-000000000001', 'VAT_SE_RC_BUILD_SELL', 'Construction reverse charge', 25, 'standard_or_special', '["41","30"]'::jsonb, 'vat_se_rc_build_sell', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000806', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_GOODS_B2B', 'EU goods B2B', 0, 'zero_or_exempt', '["35"]'::jsonb, 'vat_se_eu_goods_b2b', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000807', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_SERVICES_B2B', 'EU services B2B', 0, 'zero_or_exempt', '["38"]'::jsonb, 'vat_se_eu_services_b2b', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000808', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_B2C_OSS', 'EU B2C OSS', 0, 'zero_or_exempt', '["OSS"]'::jsonb, 'vat_se_eu_b2c_oss', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000809', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EXPORT_GOODS_0', 'Export goods', 0, 'zero_or_exempt', '["36"]'::jsonb, 'vat_se_export_goods_0', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000810', '00000000-0000-4000-8000-000000000001', 'VAT_SE_IMPORT_GOODS', 'Import goods', 25, 'standard_or_special', '["50","60"]'::jsonb, 'vat_se_import_goods', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000001', 'VAT_SE_NON_EU_SERVICE_PURCHASE_RC', 'Non-EU service purchase reverse charge', 25, 'standard_or_special', '["22","30","48"]'::jsonb, 'vat_se_non_eu_service_purchase_rc', TRUE, DATE '2026-01-01', NULL),
  ('00000000-0000-4000-8000-000000000812', '00000000-0000-4000-8000-000000000001', 'VAT_REVIEW_REQUIRED', 'Manual VAT review required', 0, 'zero_or_exempt', '[]'::jsonb, 'vat_review_required', TRUE, DATE '2026-01-01', NULL)
ON CONFLICT (company_id, vat_code, valid_from) DO NOTHING;
