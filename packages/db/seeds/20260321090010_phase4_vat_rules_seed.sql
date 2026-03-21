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
    'vat-se-2025.5',
    'vat',
    'SE',
    DATE '2025-01-01',
    DATE '2025-12-31',
    '2025.5',
    'phase4-2-vat-se-2025-5',
    DATE '2026-03-21',
    'Expanded 2025 VAT rule execution for domestic, EU, import, export and reverse charge flows.',
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
      "optionalFields":["credit_note_flag","original_vat_decision_id","deduction_ratio"],
      "reviewQueueCode":"vat_decision_review"
    }'::jsonb,
    '[
      "Domestic, EU, import, export and reverse-charge scenarios derive declaration boxes and VAT postings from transaction facts.",
      "Credit notes mirror the original VAT decision and missing originals route to manual review."
    ]'::jsonb,
    '[
      {"vectorId":"vat-2025-import","decisionCode":"VAT_SE_IMPORT_GOODS"},
      {"vectorId":"vat-2025-build-sell","decisionCode":"VAT_SE_RC_BUILD_SELL"}
    ]'::jsonb,
    '["4.2 expands historical replay to detailed declaration boxes and reverse-charge VAT postings."]'::jsonb
  ),
  (
    'vat-se-2026.2',
    'vat',
    'SE',
    DATE '2026-01-01',
    NULL,
    '2026.2',
    'phase4-2-vat-se-2026-2',
    DATE '2026-03-21',
    'Expanded VAT scenario engine with declaration-box amounts, credit-note mirroring and reverse-charge double booking.',
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
      "optionalFields":["credit_note_flag","original_vat_decision_id","deduction_ratio"],
      "reviewQueueCode":"vat_decision_review"
    }'::jsonb,
    '[
      "Transaction facts determine the VAT code, declaration boxes and VAT posting impact for Sweden, EU, import, export and reverse charge.",
      "When a credit note references an original VAT decision, the original decision is mirrored with negative declaration-box amounts and posting lines."
    ]'::jsonb,
    '[
      {"vectorId":"vat-2026-domestic-12","decisionCode":"VAT_SE_DOMESTIC_12"},
      {"vectorId":"vat-2026-eu-purchase-rc","decisionCode":"VAT_SE_EU_SERVICES_PURCHASE_RC"},
      {"vectorId":"vat-2026-credit-note","decisionCode":"VAT_SE_DOMESTIC_25"}
    ]'::jsonb,
    '["4.2 adds executable scenario rules while preserving older rule packs for replay."]'::jsonb
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
  valid_to,
  updated_at
)
VALUES
  ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_25', 'Domestic 25 %', 25, 'standard_or_special', '["05","10"]'::jsonb, 'vat_se_domestic_25', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_12', 'Domestic 12 %', 12, 'standard_or_special', '["05","11"]'::jsonb, 'vat_se_domestic_12', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_6', 'Domestic 6 %', 6, 'standard_or_special', '["05","12"]'::jsonb, 'vat_se_domestic_6', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EXEMPT', 'Exempt or zero-rated', 0, 'zero_or_exempt', '["42"]'::jsonb, 'vat_se_exempt', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000905', '00000000-0000-4000-8000-000000000001', 'VAT_SE_RC_BUILD_SELL', 'Construction reverse charge sale', 0, 'zero_or_exempt', '["41"]'::jsonb, 'vat_se_rc_build_sell', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000906', '00000000-0000-4000-8000-000000000001', 'VAT_SE_RC_BUILD_PURCHASE', 'Construction reverse charge purchase', 25, 'standard_or_special', '["24","30","48"]'::jsonb, 'vat_se_rc_build_purchase', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000907', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_GOODS_B2B', 'EU goods B2B sale', 0, 'zero_or_exempt', '["35"]'::jsonb, 'vat_se_eu_goods_b2b', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000908', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_SERVICES_B2B', 'EU services B2B sale', 0, 'zero_or_exempt', '["39"]'::jsonb, 'vat_se_eu_services_b2b', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000909', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_B2C_OSS', 'EU B2C OSS', 25, 'standard_or_special', '["OSS"]'::jsonb, 'vat_se_eu_b2c_oss', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000910', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EXPORT_GOODS_0', 'Export goods', 0, 'zero_or_exempt', '["36"]'::jsonb, 'vat_se_export_goods_0', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000911', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EXPORT_SERVICE_0', 'Export service', 0, 'zero_or_exempt', '["40"]'::jsonb, 'vat_se_export_service_0', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000912', '00000000-0000-4000-8000-000000000001', 'VAT_SE_IMPORT_GOODS', 'Import goods', 25, 'standard_or_special', '["50","60","61","62","48"]'::jsonb, 'vat_se_import_goods', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000913', '00000000-0000-4000-8000-000000000001', 'VAT_SE_NON_EU_SERVICE_PURCHASE_RC', 'Non-EU service purchase reverse charge', 25, 'standard_or_special', '["22","30","31","32","48"]'::jsonb, 'vat_se_non_eu_service_purchase_rc', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000914', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_GOODS_PURCHASE_RC', 'EU goods purchase reverse charge', 25, 'standard_or_special', '["20","30","31","32","48"]'::jsonb, 'vat_se_eu_goods_purchase_rc', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000915', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_SERVICES_PURCHASE_RC', 'EU services purchase reverse charge', 25, 'standard_or_special', '["21","30","31","32","48"]'::jsonb, 'vat_se_eu_services_purchase_rc', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000916', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_GOODS_PURCHASE_RC', 'Domestic goods purchase reverse charge', 25, 'standard_or_special', '["23","30","31","32","48"]'::jsonb, 'vat_se_domestic_goods_purchase_rc', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000917', '00000000-0000-4000-8000-000000000001', 'VAT_SE_DOMESTIC_SERVICES_PURCHASE_RC', 'Domestic services purchase reverse charge', 25, 'standard_or_special', '["24","30","31","32","48"]'::jsonb, 'vat_se_domestic_services_purchase_rc', TRUE, DATE '2026-01-01', NULL, NOW()),
  ('00000000-0000-4000-8000-000000000918', '00000000-0000-4000-8000-000000000001', 'VAT_REVIEW_REQUIRED', 'Manual VAT review required', 0, 'zero_or_exempt', '[]'::jsonb, 'vat_review_required', TRUE, DATE '2026-01-01', NULL, NOW())
ON CONFLICT (company_id, vat_code, valid_from) DO UPDATE
SET label = EXCLUDED.label,
    vat_rate = EXCLUDED.vat_rate,
    rate_type = EXCLUDED.rate_type,
    declaration_box_codes_json = EXCLUDED.declaration_box_codes_json,
    booking_template_code = EXCLUDED.booking_template_code,
    active_flag = EXCLUDED.active_flag,
    valid_to = EXCLUDED.valid_to,
    updated_at = NOW();
