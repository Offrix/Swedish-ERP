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
VALUES (
  'payroll-employer-contribution-se-2026.1',
  'payroll',
  'SE',
  '2026-01-01',
  NULL,
  '2026.1',
  'phase8-payroll-employer-contribution-se-2026-1',
  '2026-03-22',
  'Phase 8.1 payroll preview pack for employer contribution classes.',
  '{
    "contributionClasses": {
      "full": { "ratePercent": 31.42 },
      "reduced_age_pension_only": { "ratePercent": 10.21 },
      "no_contribution": { "ratePercent": 0.0 }
    }
  }'::jsonb,
  '[
    "Phase 8.1 keeps employer contribution previews deterministic before the full AGI implementation.",
    "Reduced-rate eligibility stays explicit in the pay-run input."
  ]'::jsonb,
  '[
    { "vectorId": "payroll-full-2026" },
    { "vectorId": "payroll-reduced-2026" },
    { "vectorId": "payroll-none-2026" }
  ]'::jsonb,
  '[
    "Phase 8.2 extends the payroll pack with tax and AGI mapping."
  ]'::jsonb
)
ON CONFLICT (rule_pack_id) DO NOTHING;

INSERT INTO pay_item_definitions (
  pay_item_definition_id,
  company_id,
  pay_item_code,
  pay_item_type,
  display_name,
  calculation_basis,
  unit_code,
  compensation_bucket,
  tax_treatment_code,
  employer_contribution_treatment_code,
  agi_mapping_code,
  ledger_account_code,
  affects_vacation_basis,
  affects_pension_basis,
  included_in_net_pay,
  reporting_only,
  created_by_actor_id
)
VALUES
  ('00000000-0000-4000-8000-000000008101','00000000-0000-4000-8000-000000000001','MONTHLY_SALARY','monthly_salary','Manadslon','contract_monthly_salary','month','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',TRUE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008102','00000000-0000-4000-8000-000000000001','HOURLY_SALARY','hourly_salary','Timlon','contract_hourly_rate','hour','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',TRUE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008103','00000000-0000-4000-8000-000000000001','OVERTIME','overtime','Overtid','contract_hourly_rate','hour','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008104','00000000-0000-4000-8000-000000000001','ADDITIONAL_TIME','additional_time','Mertid','contract_hourly_rate','hour','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008105','00000000-0000-4000-8000-000000000001','OB','ob','OB','configured_unit_rate','hour','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008106','00000000-0000-4000-8000-000000000001','JOUR','jour','Jour','configured_unit_rate','hour','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008107','00000000-0000-4000-8000-000000000001','STANDBY','standby','Beredskap','configured_unit_rate','hour','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008108','00000000-0000-4000-8000-000000000001','BONUS','bonus','Bonus','manual_amount','amount','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008109','00000000-0000-4000-8000-000000000001','COMMISSION','commission','Provision','manual_amount','amount','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008110','00000000-0000-4000-8000-000000000001','VACATION_PAY','vacation_pay','Semesterlon','configured_unit_rate','day','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008111','00000000-0000-4000-8000-000000000001','VACATION_SUPPLEMENT','vacation_supplement','Semestertillagg','configured_unit_rate','day','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008112','00000000-0000-4000-8000-000000000001','VACATION_DEDUCTION','vacation_deduction','Semesteravdrag','configured_unit_rate','day','gross_deduction','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008113','00000000-0000-4000-8000-000000000001','SICK_PAY','sick_pay','Sjuklon','configured_unit_rate','day','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008114','00000000-0000-4000-8000-000000000001','QUALIFYING_DEDUCTION','qualifying_deduction','Karens','configured_unit_rate','day','gross_deduction','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008115','00000000-0000-4000-8000-000000000001','CARE_OF_CHILD','care_of_child','VAB','configured_unit_rate','day','gross_deduction','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008116','00000000-0000-4000-8000-000000000001','PARENTAL_LEAVE','parental_leave','Foraldraledighet','configured_unit_rate','day','gross_deduction','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008117','00000000-0000-4000-8000-000000000001','LEAVE_WITHOUT_PAY','leave_without_pay','Tjanstledighet','configured_unit_rate','day','gross_deduction','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008118','00000000-0000-4000-8000-000000000001','TAX_FREE_TRAVEL_ALLOWANCE','tax_free_travel_allowance','Traktamente skattefritt','manual_amount','amount','reporting_only','non_taxable','excluded','phase8_2_pending','phase8_3_pending',FALSE,FALSE,FALSE,TRUE,'seed'),
  ('00000000-0000-4000-8000-000000008119','00000000-0000-4000-8000-000000000001','TAXABLE_TRAVEL_ALLOWANCE','taxable_travel_allowance','Traktamente skattepliktigt','manual_amount','amount','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008120','00000000-0000-4000-8000-000000000001','TAX_FREE_MILEAGE','tax_free_mileage','Milersattning skattefri','manual_amount','amount','reporting_only','non_taxable','excluded','phase8_2_pending','phase8_3_pending',FALSE,FALSE,FALSE,TRUE,'seed'),
  ('00000000-0000-4000-8000-000000008121','00000000-0000-4000-8000-000000000001','TAXABLE_MILEAGE','taxable_mileage','Milersattning skattepliktig','manual_amount','amount','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008122','00000000-0000-4000-8000-000000000001','BENEFIT','benefit','Forman','manual_amount','amount','reporting_only','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,FALSE,TRUE,'seed'),
  ('00000000-0000-4000-8000-000000008123','00000000-0000-4000-8000-000000000001','PENSION_PREMIUM','pension_premium','Pensionspremie','manual_amount','amount','reporting_only','non_taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,FALSE,TRUE,'seed'),
  ('00000000-0000-4000-8000-000000008124','00000000-0000-4000-8000-000000000001','SALARY_EXCHANGE_GROSS_DEDUCTION','salary_exchange_gross_deduction','Lonevaxling bruttoloneavdrag','manual_amount','amount','gross_deduction','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008125','00000000-0000-4000-8000-000000000001','NET_DEDUCTION','net_deduction','Nettoloneavdrag','manual_amount','amount','net_deduction','non_taxable','excluded','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008126','00000000-0000-4000-8000-000000000001','GARNISHMENT','garnishment','Utmatning','manual_amount','amount','net_deduction','non_taxable','excluded','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008127','00000000-0000-4000-8000-000000000001','ADVANCE','advance','Forskott','manual_amount','amount','net_deduction','non_taxable','excluded','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008128','00000000-0000-4000-8000-000000000001','RECLAIM','reclaim','Aterkrav','manual_amount','amount','net_deduction','non_taxable','excluded','phase8_2_pending','phase8_3_pending',FALSE,FALSE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008129','00000000-0000-4000-8000-000000000001','FINAL_PAY','final_pay','Slutlon','manual_amount','amount','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed'),
  ('00000000-0000-4000-8000-000000008130','00000000-0000-4000-8000-000000000001','CORRECTION','correction','Korrigering','manual_amount','amount','gross_addition','taxable','included','phase8_2_pending','phase8_3_pending',FALSE,TRUE,TRUE,FALSE,'seed')
ON CONFLICT (pay_item_definition_id) DO NOTHING;

INSERT INTO pay_calendars (
  pay_calendar_id,
  company_id,
  pay_calendar_code,
  display_name,
  frequency_code,
  cutoff_day,
  pay_day,
  timezone,
  default_currency_code,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000008190',
  '00000000-0000-4000-8000-000000000001',
  'MONTHLY_STANDARD',
  'Monthly standard calendar',
  'monthly',
  5,
  25,
  'Europe/Stockholm',
  'SEK',
  'seed'
)
ON CONFLICT (pay_calendar_id) DO NOTHING;

INSERT INTO pay_runs (
  pay_run_id,
  company_id,
  payroll_period,
  reporting_period,
  period_starts_on,
  period_ends_on,
  pay_date,
  pay_calendar_id,
  run_type,
  status,
  source_snapshot_hash,
  warning_codes_json,
  calculation_steps_json,
  payload_json,
  calculated_at,
  approved_at,
  created_by_actor_id,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000008201',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  '202603',
  '2026-03-01',
  '2026-03-31',
  '2026-03-25',
  '00000000-0000-4000-8000-000000008190',
  'regular',
  'approved',
  'phase8-seed-payrun-202603-regular',
  '[]'::jsonb,
  '[
    { "stepNo": 1, "stepCode": "employment_and_period", "status": "completed" },
    { "stepNo": 3, "stepCode": "base_salary", "status": "completed" },
    { "stepNo": 4, "stepCode": "variable_pay_items", "status": "completed" },
    { "stepNo": 5, "stepCode": "retro_corrections", "status": "completed" },
    { "stepNo": 15, "stepCode": "payslips", "status": "completed" }
  ]'::jsonb,
  '{"seed":"phase8","kind":"regular_pay_run"}'::jsonb,
  NOW(),
  NOW(),
  'seed',
  NOW()
)
ON CONFLICT (pay_run_id) DO NOTHING;

INSERT INTO pay_run_lines (
  pay_run_line_id,
  pay_run_id,
  company_id,
  employment_id,
  employee_id,
  pay_item_definition_id,
  line_code,
  pay_item_code,
  pay_item_type,
  display_name,
  compensation_bucket,
  quantity,
  unit_code,
  unit_rate,
  amount,
  tax_treatment_code,
  employer_contribution_treatment_code,
  agi_mapping_code,
  ledger_account_code,
  affects_vacation_basis,
  affects_pension_basis,
  included_in_net_pay,
  reporting_only,
  source_type,
  source_id,
  calculation_status,
  note,
  display_order,
  payload_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000008211',
    '00000000-0000-4000-8000-000000008201',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000721',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000008101',
    'MONTHLY_SALARY',
    'MONTHLY_SALARY',
    'monthly_salary',
    'Manadslon',
    'gross_addition',
    1.0000,
    'month',
    40500.00,
    40500.00,
    'taxable',
    'included',
    'phase8_2_pending',
    'phase8_3_pending',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'employment_contract',
    '00000000-0000-4000-8000-000000000732',
    'calculated',
    'Base salary from active contract version 2.',
    10,
    '{"seed":"phase8","stepNo":3}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000008212',
    '00000000-0000-4000-8000-000000008201',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000721',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000008108',
    'BONUS',
    'BONUS',
    'bonus',
    'Bonus',
    'gross_addition',
    1.0000,
    'amount',
    1200.00,
    1200.00,
    'taxable',
    'included',
    'phase8_2_pending',
    'phase8_3_pending',
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    'manual_input',
    'phase8-seed-bonus-202603',
    'calculated',
    'Seed bonus to keep the baseline pay run non-trivial.',
    80,
    '{"seed":"phase8","stepNo":4}'::jsonb
  )
ON CONFLICT (pay_run_line_id) DO NOTHING;

INSERT INTO pay_run_events (
  pay_run_event_id,
  pay_run_id,
  company_id,
  event_type,
  actor_id,
  note,
  recorded_at
)
VALUES
  ('00000000-0000-4000-8000-000000008221','00000000-0000-4000-8000-000000008201','00000000-0000-4000-8000-000000000001','created','seed','Created regular payroll run 202603.',NOW()),
  ('00000000-0000-4000-8000-000000008222','00000000-0000-4000-8000-000000008201','00000000-0000-4000-8000-000000000001','calculated','seed','Calculated one payslip for the baseline payroll run.',NOW()),
  ('00000000-0000-4000-8000-000000008223','00000000-0000-4000-8000-000000008201','00000000-0000-4000-8000-000000000001','approved','seed','Approved the baseline payroll run.',NOW())
ON CONFLICT (pay_run_event_id) DO NOTHING;

INSERT INTO pay_run_payslips (
  payslip_id,
  pay_run_id,
  company_id,
  employment_id,
  employee_id,
  snapshot_hash,
  render_payload_json,
  generated_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000008231',
  '00000000-0000-4000-8000-000000008201',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000721',
  '00000000-0000-4000-8000-000000000711',
  'phase8-seed-payslip-202603-regular',
  '{
    "reportingPeriod": "202603",
    "payDate": "2026-03-25",
    "runType": "regular",
    "totals": {
      "grossEarnings": 41700.00,
      "grossDeductions": 0.00,
      "netDeductions": 0.00,
      "netPay": null,
      "preliminaryTaxStatus": "phase8_2_pending",
      "employerContributionPreviewStatus": "preview_rule_pack"
    },
    "warnings": [
      {
        "code": "payroll_tax_pending_phase8_2"
      }
    ]
  }'::jsonb,
  'seed'
)
ON CONFLICT (payslip_id) DO NOTHING;
