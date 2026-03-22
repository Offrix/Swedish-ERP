INSERT INTO benefit_catalog (
  benefit_catalog_id,
  company_id,
  benefit_code,
  display_name,
  default_ledger_account_code,
  default_agi_mapping_code,
  default_pay_item_code,
  supported_valuation_methods_json,
  active,
  created_at,
  updated_at
)
VALUES
  ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000000001','CAR_BENEFIT','Bilforman','7210','taxable_benefit','BENEFIT','["car_formula_2026","manual_taxable_value"]'::jsonb,TRUE,NOW(),NOW()),
  ('00000000-0000-4000-8000-000000009102','00000000-0000-4000-8000-000000000001','FUEL_BENEFIT','Drivmedelsforman','7220','taxable_benefit','BENEFIT','["fuel_formula_2026","manual_taxable_value"]'::jsonb,TRUE,NOW(),NOW()),
  ('00000000-0000-4000-8000-000000009103','00000000-0000-4000-8000-000000000001','HEALTH_INSURANCE','Sjukvardsforsakring','7230','taxable_benefit','BENEFIT','["health_insurance_2026","manual_taxable_value"]'::jsonb,TRUE,NOW(),NOW()),
  ('00000000-0000-4000-8000-000000009104','00000000-0000-4000-8000-000000000001','MEAL_BENEFIT','Kostforman','7240','taxable_benefit','BENEFIT','["meal_table_2026","manual_taxable_value"]'::jsonb,TRUE,NOW(),NOW()),
  ('00000000-0000-4000-8000-000000009105','00000000-0000-4000-8000-000000000001','GIFT','Gava','7260','taxable_benefit','BENEFIT','["gift_threshold_2026","manual_taxable_value"]'::jsonb,TRUE,NOW(),NOW()),
  ('00000000-0000-4000-8000-000000009106','00000000-0000-4000-8000-000000000001','WELLNESS_ALLOWANCE','Friskvardsbidrag','7270','taxable_benefit','BENEFIT','["wellness_policy_2026","manual_taxable_value"]'::jsonb,TRUE,NOW(),NOW())
ON CONFLICT (benefit_catalog_id) DO NOTHING;

INSERT INTO benefit_events (
  benefit_event_id,
  company_id,
  employee_id,
  employment_id,
  benefit_catalog_id,
  benefit_code,
  reporting_period,
  tax_year,
  occurred_on,
  start_date,
  end_date,
  source_type,
  source_id,
  payroll_run_id,
  supporting_document_id,
  dimension_json,
  payload_json,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000009111',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000711',
  '00000000-0000-4000-8000-000000000721',
  '00000000-0000-4000-8000-000000009103',
  'HEALTH_INSURANCE',
  '202603',
  '2026',
  '2026-03-10',
  NULL,
  NULL,
  'manual_entry',
  'phase9-seed-health-insurance-202603',
  NULL,
  '00000000-0000-4000-8000-000000000761',
  '{"costCenterCode":"CC-100"}'::jsonb,
  '{"insurancePremium":1000.00,"taxablePremiumRatio":0.60}'::jsonb,
  'seed',
  NOW(),
  NOW()
)
ON CONFLICT (benefit_event_id) DO NOTHING;

INSERT INTO benefit_valuations (
  benefit_valuation_id,
  benefit_event_id,
  company_id,
  benefit_code,
  reporting_period,
  tax_year,
  valuation_method,
  employer_paid_value,
  market_value,
  taxable_value_before_offsets,
  taxable_value,
  tax_free_value,
  employee_paid_value,
  net_deduction_value,
  agi_mapping_code,
  ledger_account_code,
  taxability,
  cash_salary_required_for_withholding,
  decision_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009121',
  '00000000-0000-4000-8000-000000009111',
  '00000000-0000-4000-8000-000000000001',
  'HEALTH_INSURANCE',
  '202603',
  '2026',
  'health_insurance_2026',
  1000.00,
  1000.00,
  600.00,
  600.00,
  400.00,
  0.00,
  0.00,
  'taxable_benefit',
  '7230',
  'partially_taxable',
  TRUE,
  '{
    "decisionCode":"BENEFIT_HEALTH_INSURANCE_2026",
    "ruleVersion":"benefits-se-2026.1",
    "outputs":{
      "insurancePremium":1000.00,
      "taxablePremiumRatio":0.60,
      "marketValue":1000.00,
      "taxableValue":600.00
    },
    "explanation":[
      "Health insurance used the taxable premium share for mixed taxable and tax-free coverage."
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT (benefit_valuation_id) DO NOTHING;

INSERT INTO benefit_documents (
  benefit_document_id,
  benefit_event_id,
  company_id,
  document_id,
  linked_by_actor_id,
  linked_at
)
VALUES (
  '00000000-0000-4000-8000-000000009131',
  '00000000-0000-4000-8000-000000009111',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000761',
  'seed',
  NOW()
)
ON CONFLICT (benefit_event_id, document_id) DO NOTHING;

INSERT INTO benefit_posting_intents (
  benefit_posting_intent_id,
  benefit_event_id,
  company_id,
  processing_step,
  intent_type,
  ledger_account_code,
  amount,
  payroll_line_payload_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009141',
  '00000000-0000-4000-8000-000000009111',
  '00000000-0000-4000-8000-000000000001',
  6,
  'benefit_taxable_value',
  '7230',
  600.00,
  '{
    "processingStep":6,
    "payItemCode":"BENEFIT",
    "amount":600.00,
    "sourceType":"benefit_event",
    "sourceId":"00000000-0000-4000-8000-000000009111",
    "note":"Sjukvardsforsakring 202603",
    "dimensionJson":{"costCenterCode":"CC-100"},
    "overrides":{
      "displayName":"Sjukvardsforsakring",
      "ledgerAccountCode":"7230",
      "agiMappingCode":"taxable_benefit",
      "taxTreatmentCode":"taxable",
      "employerContributionTreatmentCode":"included",
      "includedInNetPay":false,
      "reportingOnly":true
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT (benefit_posting_intent_id) DO NOTHING;

INSERT INTO benefit_agi_mappings (
  benefit_agi_mapping_id,
  benefit_event_id,
  company_id,
  reporting_period,
  agi_mapping_code,
  reportable_amount,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009151',
  '00000000-0000-4000-8000-000000009111',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  'taxable_benefit',
  600.00,
  NOW()
)
ON CONFLICT (benefit_agi_mapping_id) DO NOTHING;

INSERT INTO audit_events (
  audit_id,
  company_id,
  actor_id,
  action,
  result,
  entity_type,
  entity_id,
  explanation,
  correlation_id,
  recorded_at
)
VALUES (
  '00000000-0000-4000-8000-000000009161',
  '00000000-0000-4000-8000-000000000001',
  'seed',
  'benefit.event.seeded',
  'success',
  'benefit_event',
  '00000000-0000-4000-8000-000000009111',
  'Seeded a health insurance benefit event for payroll and AGI verification.',
  'phase9-seed-health-insurance',
  NOW()
)
ON CONFLICT (audit_id) DO NOTHING;
