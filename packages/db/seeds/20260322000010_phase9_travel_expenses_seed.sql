INSERT INTO travel_foreign_allowances (
  travel_foreign_allowance_id,
  tax_year,
  country_name,
  country_code,
  amount_sek,
  alias_of,
  created_at
)
VALUES
  ('00000000-0000-4000-8000-000000009201','2026','Danmark','DK',1226.00,NULL,NOW()),
  ('00000000-0000-4000-8000-000000009202','2026','Frankrike','FR',850.00,NULL,NOW()),
  ('00000000-0000-4000-8000-000000009203','2026','Tyskland','DE',760.00,NULL,NOW()),
  ('00000000-0000-4000-8000-000000009204','2026','Norge','NO',1054.00,NULL,NOW()),
  ('00000000-0000-4000-8000-000000009205','2026','USA','US',1049.00,NULL,NOW()),
  ('00000000-0000-4000-8000-000000009206','2026','Ovriga lander och omraden',NULL,850.00,NULL,NOW())
ON CONFLICT (travel_foreign_allowance_id) DO NOTHING;

INSERT INTO travel_claims (
  travel_claim_id,
  company_id,
  employee_id,
  employment_id,
  reporting_period,
  purpose,
  start_at,
  end_at,
  home_location,
  regular_work_location,
  first_destination,
  distance_from_home_km,
  distance_from_regular_work_km,
  requested_allowance_amount,
  same_location_days_before_start,
  lodging_paid_by_employer,
  pre_approved,
  approval_status,
  source_type,
  source_id,
  dimension_json,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000009211',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000711',
  '00000000-0000-4000-8000-000000000721',
  '202603',
  'Kundmote i Malmo',
  '2026-03-10T08:15:00+01:00',
  '2026-03-11T20:30:00+01:00',
  'Uppsala',
  'Uppsala',
  'Malmo',
  620.00,
  620.00,
  555.00,
  0,
  FALSE,
  TRUE,
  'approved',
  'manual_entry',
  'phase9-travel-seed-domestic-202603',
  '{"costCenterCode":"CC-100","projectId":"project-seed-alpha"}'::jsonb,
  'seed',
  NOW(),
  NOW()
)
ON CONFLICT (travel_claim_id) DO NOTHING;

INSERT INTO travel_country_segments (
  travel_country_segment_id,
  travel_claim_id,
  company_id,
  start_at,
  end_at,
  country_name,
  country_code,
  location_key,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009221',
  '00000000-0000-4000-8000-000000009211',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-10T08:15:00+01:00',
  '2026-03-11T20:30:00+01:00',
  'Sverige',
  'SE',
  'Malmo',
  NOW()
)
ON CONFLICT (travel_country_segment_id) DO NOTHING;

INSERT INTO travel_days (
  travel_day_id,
  travel_claim_id,
  company_id,
  travel_date,
  country_name,
  country_code,
  location_key,
  day_classification,
  reduction_bracket,
  base_amount,
  meal_reduction_amount,
  meal_reduction_code,
  statutory_amount,
  explanation,
  created_at
)
VALUES
  ('00000000-0000-4000-8000-000000009231','00000000-0000-4000-8000-000000009211','00000000-0000-4000-8000-000000000001','2026-03-10','Sverige','SE','Malmo','full','none',300.00,0.00,'none',300.00,'Domestic full-day allowance applied.',NOW()),
  ('00000000-0000-4000-8000-000000009232','00000000-0000-4000-8000-000000009211','00000000-0000-4000-8000-000000000001','2026-03-11','Sverige','SE','Malmo','full','none',300.00,105.00,'partial_meal',195.00,'Domestic meal reduction applied.',NOW()),
  ('00000000-0000-4000-8000-000000009233','00000000-0000-4000-8000-000000009211','00000000-0000-4000-8000-000000000001','2026-03-10','Sverige','SE','Malmo','night','none',150.00,0.00,'night_allowance',150.00,'Night allowance applied.',NOW())
ON CONFLICT (travel_day_id) DO NOTHING;

INSERT INTO travel_meal_events (
  travel_meal_event_id,
  travel_claim_id,
  company_id,
  meal_date,
  breakfast_provided,
  lunch_provided,
  dinner_provided,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009241',
  '00000000-0000-4000-8000-000000009211',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-11',
  FALSE,
  TRUE,
  FALSE,
  NOW()
)
ON CONFLICT (travel_meal_event_id) DO NOTHING;

INSERT INTO mileage_logs (
  mileage_log_id,
  travel_claim_id,
  company_id,
  mileage_date,
  vehicle_type,
  distance_km,
  claimed_rate_per_km,
  claimed_amount,
  employee_paid_all_fuel,
  note,
  valuation_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009251',
  '00000000-0000-4000-8000-000000009211',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-10',
  'OWN_CAR',
  380.00,
  2.50,
  950.00,
  TRUE,
  'Seed mileage',
  '{"legalRatePerKm":2.50,"requestedAmount":950.00,"taxFreeMaxAmount":950.00,"taxFreeAmount":950.00,"taxableAmount":0.00}'::jsonb,
  NOW()
)
ON CONFLICT (mileage_log_id) DO NOTHING;

INSERT INTO expense_receipts (
  expense_receipt_id,
  travel_claim_id,
  company_id,
  expense_date,
  expense_type,
  payment_method,
  amount,
  currency_code,
  exchange_rate,
  document_id,
  has_receipt_support,
  valuation_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009261',
  '00000000-0000-4000-8000-000000009211',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-10',
  'parking',
  'private_card',
  140.00,
  'SEK',
  1.0,
  '00000000-0000-4000-8000-000000000761',
  TRUE,
  '{"amountSek":140.00}'::jsonb,
  NOW()
)
ON CONFLICT (expense_receipt_id) DO NOTHING;

INSERT INTO travel_advances (
  travel_advance_id,
  travel_claim_id,
  company_id,
  advance_date,
  amount_sek,
  note,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009271',
  '00000000-0000-4000-8000-000000009211',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-09',
  300.00,
  'Seed travel advance',
  NOW()
)
ON CONFLICT (travel_advance_id) DO NOTHING;

INSERT INTO travel_valuations (
  travel_valuation_id,
  travel_claim_id,
  company_id,
  reporting_period,
  tax_year,
  rule_version,
  travel_type,
  statutory_tax_free_allowed,
  statutory_tax_free_max_allowance,
  requested_allowance_amount,
  tax_free_travel_allowance,
  taxable_travel_allowance,
  tax_free_mileage,
  taxable_mileage,
  expense_reimbursement_amount,
  company_card_expense_amount,
  travel_advance_amount,
  net_travel_payout_amount,
  advance_net_deduction_amount,
  source_snapshot_hash,
  warnings_json,
  explanation_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000009281',
  '00000000-0000-4000-8000-000000009211',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  '2026',
  'travel-se-2026.1',
  'domestic',
  TRUE,
  645.00,
  555.00,
  555.00,
  0.00,
  950.00,
  0.00,
  140.00,
  0.00,
  300.00,
  1345.00,
  0.00,
  'phase9-seed-travel-valuation',
  '[]'::jsonb,
  '["Domestic travel rules applied.","Overnight condition is met.","Distance threshold is met against both home and the regular workplace."]'::jsonb,
  NOW()
)
ON CONFLICT (travel_valuation_id) DO NOTHING;

INSERT INTO travel_posting_intents (
  travel_posting_intent_id,
  travel_claim_id,
  company_id,
  processing_step,
  intent_type,
  ledger_account_code,
  amount,
  payroll_line_payload_json,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000009291',
    '00000000-0000-4000-8000-000000009211',
    '00000000-0000-4000-8000-000000000001',
    7,
    'travel_allowance_tax_free',
    '7310',
    555.00,
    '{"processingStep":7,"payItemCode":"TAX_FREE_TRAVEL_ALLOWANCE","amount":555.00,"sourceType":"travel_claim","sourceId":"00000000-0000-4000-8000-000000009211","note":"Traktamente skattefritt 202603","dimensionJson":{"costCenterCode":"CC-100","projectId":"project-seed-alpha"},"overrides":{"displayName":"Traktamente skattefritt","ledgerAccountCode":"7310","agiMappingCode":"tax_free_allowance","taxTreatmentCode":"non_taxable","employerContributionTreatmentCode":"excluded","includedInNetPay":true,"reportingOnly":false}}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000009292',
    '00000000-0000-4000-8000-000000009211',
    '00000000-0000-4000-8000-000000000001',
    7,
    'mileage_tax_free',
    '7320',
    950.00,
    '{"processingStep":7,"payItemCode":"TAX_FREE_MILEAGE","amount":950.00,"sourceType":"travel_claim","sourceId":"00000000-0000-4000-8000-000000009211","note":"Milersattning skattefri 202603","dimensionJson":{"costCenterCode":"CC-100","projectId":"project-seed-alpha"},"overrides":{"displayName":"Milersattning skattefri","ledgerAccountCode":"7320","agiMappingCode":"tax_free_allowance","taxTreatmentCode":"non_taxable","employerContributionTreatmentCode":"excluded","includedInNetPay":true,"reportingOnly":false}}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000009293',
    '00000000-0000-4000-8000-000000009211',
    '00000000-0000-4000-8000-000000000001',
    7,
    'expense_reimbursement',
    '7330',
    140.00,
    '{"processingStep":7,"payItemCode":"EXPENSE_REIMBURSEMENT","amount":140.00,"sourceType":"travel_claim","sourceId":"00000000-0000-4000-8000-000000009211","note":"Utlag privatkort 202603","dimensionJson":{"costCenterCode":"CC-100","projectId":"project-seed-alpha"},"overrides":{"displayName":"Utlag privatkort","ledgerAccountCode":"7330","agiMappingCode":"not_reported","taxTreatmentCode":"non_taxable","employerContributionTreatmentCode":"excluded","includedInNetPay":true,"reportingOnly":false}}'::jsonb,
    NOW()
  )
ON CONFLICT (travel_posting_intent_id) DO NOTHING;

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
  '00000000-0000-4000-8000-000000009299',
  '00000000-0000-4000-8000-000000000001',
  'seed',
  'travel.claim.seeded',
  'success',
  'travel_claim',
  '00000000-0000-4000-8000-000000009211',
  'Seeded a domestic travel claim with traktamente, mileage and expense reimbursement.',
  'phase9-travel-seed-domestic',
  NOW()
)
ON CONFLICT (audit_id) DO NOTHING;
