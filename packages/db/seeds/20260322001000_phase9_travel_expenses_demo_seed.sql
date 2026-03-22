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
  '00000000-0000-4000-8000-000000009311',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000781',
  '00000000-0000-4000-8000-000000000791',
  '202603',
  'Demoresa till Paris och Frankfurt',
  '2026-03-16T07:00:00+01:00',
  '2026-03-18T21:30:00+01:00',
  'Stockholm',
  'Stockholm',
  'Paris',
  720.00,
  720.00,
  1774.00,
  0,
  FALSE,
  TRUE,
  'approved',
  'manual_entry',
  'phase9-travel-demo-foreign-202603',
  '{"costCenterCode":"CC-300","projectId":"project-demo-beta"}'::jsonb,
  'demo',
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
VALUES
  ('00000000-0000-4000-8000-000000009321','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-16T07:00:00+01:00','2026-03-17T11:00:00+01:00','Frankrike','FR','Paris',NOW()),
  ('00000000-0000-4000-8000-000000009322','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-17T11:00:00+01:00','2026-03-18T21:30:00+01:00','Tyskland','DE','Frankfurt',NOW())
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
  ('00000000-0000-4000-8000-000000009331','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-16','Frankrike','FR','Paris','full','none',850.00,128.00,'breakfast',722.00,'Foreign meal reduction percentages applied.',NOW()),
  ('00000000-0000-4000-8000-000000009332','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-17','Tyskland','DE','Frankfurt','full','none',760.00,266.00,'partial_meal',494.00,'Foreign meal reduction percentages applied.',NOW()),
  ('00000000-0000-4000-8000-000000009333','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-18','Tyskland','DE','Frankfurt','full','none',760.00,0.00,'none',760.00,'Foreign full-day allowance applied.',NOW()),
  ('00000000-0000-4000-8000-000000009334','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-16','Frankrike','FR','Paris','night','none',425.00,0.00,'night_allowance',425.00,'Night allowance applied.',NOW()),
  ('00000000-0000-4000-8000-000000009335','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-17','Tyskland','DE','Frankfurt','night','none',380.00,0.00,'night_allowance',380.00,'Night allowance applied.',NOW())
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
VALUES
  ('00000000-0000-4000-8000-000000009341','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-16',TRUE,FALSE,FALSE,NOW()),
  ('00000000-0000-4000-8000-000000009342','00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000000001','2026-03-17',FALSE,TRUE,FALSE,NOW())
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
  '00000000-0000-4000-8000-000000009351',
  '00000000-0000-4000-8000-000000009311',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-18',
  'BENEFIT_CAR',
  210.00,
  1.40,
  294.00,
  FALSE,
  'Demo mileage',
  '{"legalRatePerKm":1.20,"requestedAmount":294.00,"taxFreeMaxAmount":0.00,"taxFreeAmount":0.00,"taxableAmount":294.00,"warningCode":"travel_mileage_tax_free_denied_benefit_car_fuel"}'::jsonb,
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
VALUES
  (
    '00000000-0000-4000-8000-000000009361',
    '00000000-0000-4000-8000-000000009311',
    '00000000-0000-4000-8000-000000000001',
    '2026-03-16',
    'lodging',
    'company_card',
    1800.00,
    'SEK',
    1.0,
    '00000000-0000-4000-8000-000000000831',
    TRUE,
    '{"amountSek":1800.00}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000009362',
    '00000000-0000-4000-8000-000000009311',
    '00000000-0000-4000-8000-000000000001',
    '2026-03-18',
    'taxi',
    'private_card',
    320.00,
    'SEK',
    1.0,
    '00000000-0000-4000-8000-000000000831',
    TRUE,
    '{"amountSek":320.00}'::jsonb,
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
  '00000000-0000-4000-8000-000000009371',
  '00000000-0000-4000-8000-000000009311',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-15',
  500.00,
  'Demo travel advance',
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
  '00000000-0000-4000-8000-000000009381',
  '00000000-0000-4000-8000-000000009311',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  '2026',
  'travel-se-2026.1',
  'foreign',
  TRUE,
  2781.00,
  1774.00,
  1774.00,
  0.00,
  0.00,
  294.00,
  320.00,
  1800.00,
  500.00,
  1888.00,
  0.00,
  'phase9-demo-travel-valuation',
  '["travel_mileage_tax_free_denied_benefit_car_fuel","travel_preapproval_required"]'::jsonb,
  '["Foreign travel rules applied.","Overnight condition is met.","Distance threshold is met against both home and the regular workplace.","The travel includes at least one non-Nordic country."]'::jsonb,
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
    '00000000-0000-4000-8000-000000009391',
    '00000000-0000-4000-8000-000000009311',
    '00000000-0000-4000-8000-000000000001',
    7,
    'travel_allowance_tax_free',
    '7310',
    1774.00,
    '{"processingStep":7,"payItemCode":"TAX_FREE_TRAVEL_ALLOWANCE","amount":1774.00,"sourceType":"travel_claim","sourceId":"00000000-0000-4000-8000-000000009311","note":"Traktamente skattefritt 202603","dimensionJson":{"costCenterCode":"CC-300","projectId":"project-demo-beta"},"overrides":{"displayName":"Traktamente skattefritt","ledgerAccountCode":"7310","agiMappingCode":"tax_free_allowance","taxTreatmentCode":"non_taxable","employerContributionTreatmentCode":"excluded","includedInNetPay":true,"reportingOnly":false}}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000009392',
    '00000000-0000-4000-8000-000000009311',
    '00000000-0000-4000-8000-000000000001',
    7,
    'mileage_taxable',
    '7320',
    294.00,
    '{"processingStep":7,"payItemCode":"TAXABLE_MILEAGE","amount":294.00,"sourceType":"travel_claim","sourceId":"00000000-0000-4000-8000-000000009311","note":"Milersattning skattepliktig 202603","dimensionJson":{"costCenterCode":"CC-300","projectId":"project-demo-beta"},"overrides":{"displayName":"Milersattning skattepliktig","ledgerAccountCode":"7320","agiMappingCode":"cash_compensation","taxTreatmentCode":"taxable","employerContributionTreatmentCode":"included","includedInNetPay":true,"reportingOnly":false}}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000009393',
    '00000000-0000-4000-8000-000000009311',
    '00000000-0000-4000-8000-000000000001',
    7,
    'expense_reimbursement',
    '7330',
    320.00,
    '{"processingStep":7,"payItemCode":"EXPENSE_REIMBURSEMENT","amount":320.00,"sourceType":"travel_claim","sourceId":"00000000-0000-4000-8000-000000009311","note":"Utlag privatkort 202603","dimensionJson":{"costCenterCode":"CC-300","projectId":"project-demo-beta"},"overrides":{"displayName":"Utlag privatkort","ledgerAccountCode":"7330","agiMappingCode":"not_reported","taxTreatmentCode":"non_taxable","employerContributionTreatmentCode":"excluded","includedInNetPay":true,"reportingOnly":false}}'::jsonb,
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
  '00000000-0000-4000-8000-000000009399',
  '00000000-0000-4000-8000-000000000001',
  'demo',
  'travel.claim.seeded',
  'success',
  'travel_claim',
  '00000000-0000-4000-8000-000000009311',
  'Seeded a foreign multi-country travel claim with company-card lodging, private-card taxi and taxable mileage.',
  'phase9-travel-demo-foreign',
  NOW()
)
ON CONFLICT (audit_id) DO NOTHING;
