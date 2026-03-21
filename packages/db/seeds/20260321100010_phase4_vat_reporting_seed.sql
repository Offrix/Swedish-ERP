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
    'vat-se-2025.6',
    'vat',
    'SE',
    DATE '2025-01-01',
    DATE '2025-12-31',
    '2025.6',
    'phase4-3-vat-se-2025-6',
    DATE '2026-03-21',
    'Expanded 2025 VAT reporting for OSS/IOSS, periodic statements and declaration snapshots.',
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
      "optionalFields":["credit_note_flag","original_vat_decision_id","deduction_ratio","ecb_exchange_rate_to_eur","consignment_value_eur"],
      "reviewQueueCode":"vat_decision_review"
    }'::jsonb,
    '[
      "OSS and IOSS decisions must be separated from the ordinary VAT return and preserve the exchange rate used for euro reporting.",
      "Periodic statements must be reproducible and allow corrections without mutating the original run."
    ]'::jsonb,
    '[
      {"vectorId":"vat-2025-oss","decisionCode":"VAT_SE_EU_B2C_OSS"},
      {"vectorId":"vat-2025-ioss","decisionCode":"VAT_SE_EU_B2C_IOSS"}
    ]'::jsonb,
    '["4.3 adds reporting artifacts for special EU VAT schemes."]'::jsonb
  ),
  (
    'vat-se-2026.3',
    'vat',
    'SE',
    DATE '2026-01-01',
    NULL,
    '2026.3',
    'phase4-3-vat-se-2026-3',
    DATE '2026-03-21',
    'Expanded VAT scenario engine with OSS/IOSS classification, periodic statements and declaration reporting.',
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
      "optionalFields":["credit_note_flag","original_vat_decision_id","deduction_ratio","ecb_exchange_rate_to_eur","consignment_value_eur"],
      "reviewQueueCode":"vat_decision_review"
    }'::jsonb,
    '[
      "B2C distance sales below threshold stay in the ordinary VAT return while OSS and IOSS stay outside it.",
      "VAT declaration runs and periodic statements must be reproducible, versionable and comparable to ledger evidence."
    ]'::jsonb,
    '[
      {"vectorId":"vat-2026-oss","decisionCode":"VAT_SE_EU_B2C_OSS"},
      {"vectorId":"vat-2026-ioss","decisionCode":"VAT_SE_EU_B2C_IOSS"},
      {"vectorId":"vat-2026-periodic-statement","decisionCode":"VAT_SE_EU_GOODS_B2B"}
    ]'::jsonb,
    '["4.3 adds OSS/IOSS and declaration reporting while preserving previous 4.x packs for replay."]'::jsonb
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
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', 'VAT_SE_EU_B2C_IOSS', 'EU B2C IOSS', 25, 'standard_or_special', '["IOSS"]'::jsonb, 'vat_se_eu_b2c_ioss', TRUE, DATE '2026-01-01', NULL, NOW())
ON CONFLICT (company_id, vat_code, valid_from) DO UPDATE
SET label = EXCLUDED.label,
    vat_rate = EXCLUDED.vat_rate,
    rate_type = EXCLUDED.rate_type,
    declaration_box_codes_json = EXCLUDED.declaration_box_codes_json,
    booking_template_code = EXCLUDED.booking_template_code,
    active_flag = EXCLUDED.active_flag,
    valid_to = EXCLUDED.valid_to,
    updated_at = NOW();
