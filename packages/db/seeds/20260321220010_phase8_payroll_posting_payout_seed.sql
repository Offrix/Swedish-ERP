UPDATE pay_item_definitions
SET ledger_account_code = CASE pay_item_code
  WHEN 'MONTHLY_SALARY' THEN '7010'
  WHEN 'HOURLY_SALARY' THEN '7020'
  WHEN 'OVERTIME' THEN '7030'
  WHEN 'ADDITIONAL_TIME' THEN '7030'
  WHEN 'OB' THEN '7040'
  WHEN 'JOUR' THEN '7050'
  WHEN 'STANDBY' THEN '7050'
  WHEN 'BONUS' THEN '7060'
  WHEN 'COMMISSION' THEN '7060'
  WHEN 'VACATION_PAY' THEN '7070'
  WHEN 'VACATION_SUPPLEMENT' THEN '7070'
  WHEN 'VACATION_DEDUCTION' THEN '7070'
  WHEN 'SICK_PAY' THEN '7080'
  WHEN 'QUALIFYING_DEDUCTION' THEN '7090'
  WHEN 'CARE_OF_CHILD' THEN '7090'
  WHEN 'PARENTAL_LEAVE' THEN '7090'
  WHEN 'LEAVE_WITHOUT_PAY' THEN '7090'
  WHEN 'BENEFIT' THEN '7290'
  WHEN 'PENSION_PREMIUM' THEN '7130'
  WHEN 'SALARY_EXCHANGE_GROSS_DEDUCTION' THEN '7090'
  WHEN 'NET_DEDUCTION' THEN '2750'
  WHEN 'GARNISHMENT' THEN '2750'
  WHEN 'ADVANCE' THEN '2750'
  WHEN 'RECLAIM' THEN '2750'
  WHEN 'FINAL_PAY' THEN '7090'
  WHEN 'CORRECTION' THEN '7090'
  WHEN 'TAX_FREE_TRAVEL_ALLOWANCE' THEN '7310'
  WHEN 'TAXABLE_TRAVEL_ALLOWANCE' THEN '7310'
  WHEN 'TAX_FREE_MILEAGE' THEN '7320'
  WHEN 'TAXABLE_MILEAGE' THEN '7320'
  ELSE ledger_account_code
END
WHERE company_id = '00000000-0000-4000-8000-000000000001';

UPDATE pay_run_lines
SET
  ledger_account_code = CASE pay_item_code
    WHEN 'MONTHLY_SALARY' THEN '7010'
    WHEN 'HOURLY_SALARY' THEN '7020'
    WHEN 'OVERTIME' THEN '7030'
    WHEN 'ADDITIONAL_TIME' THEN '7030'
    WHEN 'OB' THEN '7040'
    WHEN 'JOUR' THEN '7050'
    WHEN 'STANDBY' THEN '7050'
    WHEN 'BONUS' THEN '7060'
    WHEN 'COMMISSION' THEN '7060'
    WHEN 'VACATION_PAY' THEN '7070'
    WHEN 'VACATION_SUPPLEMENT' THEN '7070'
    WHEN 'VACATION_DEDUCTION' THEN '7070'
    WHEN 'SICK_PAY' THEN '7080'
    WHEN 'QUALIFYING_DEDUCTION' THEN '7090'
    WHEN 'CARE_OF_CHILD' THEN '7090'
    WHEN 'PARENTAL_LEAVE' THEN '7090'
    WHEN 'LEAVE_WITHOUT_PAY' THEN '7090'
    WHEN 'BENEFIT' THEN '7290'
    WHEN 'PENSION_PREMIUM' THEN '7130'
    WHEN 'SALARY_EXCHANGE_GROSS_DEDUCTION' THEN '7090'
    WHEN 'NET_DEDUCTION' THEN '2750'
    WHEN 'GARNISHMENT' THEN '2750'
    WHEN 'ADVANCE' THEN '2750'
    WHEN 'RECLAIM' THEN '2750'
    WHEN 'FINAL_PAY' THEN '7090'
    WHEN 'CORRECTION' THEN '7090'
    WHEN 'TAX_FREE_TRAVEL_ALLOWANCE' THEN '7310'
    WHEN 'TAXABLE_TRAVEL_ALLOWANCE' THEN '7310'
    WHEN 'TAX_FREE_MILEAGE' THEN '7320'
    WHEN 'TAXABLE_MILEAGE' THEN '7320'
    ELSE ledger_account_code
  END,
  dimension_json = CASE pay_run_line_id
    WHEN '00000000-0000-4000-8000-000000008211' THEN '{"projectId":"project-demo-alpha","costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb
    WHEN '00000000-0000-4000-8000-000000008212' THEN '{"costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb
    ELSE COALESCE(dimension_json, '{}'::jsonb)
  END
WHERE company_id = '00000000-0000-4000-8000-000000000001';

INSERT INTO payroll_postings (
  payroll_posting_id,
  company_id,
  pay_run_id,
  reporting_period,
  run_type,
  status,
  journal_entry_id,
  payload_hash,
  source_snapshot_hash,
  totals_json,
  journal_lines_json,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000008511',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000008201',
  '202603',
  'regular',
  'posted',
  NULL,
  'phase8-3-seed-posting-202603',
  'phase8-3-seed-posting-source-202603',
  '{
    "preliminaryTaxAmount": 12510.00,
    "employerContributionAmount": 13101.14,
    "netPayAmount": 29190.00,
    "vacationLiabilityAmount": 41700.00,
    "vacationLiabilityDeltaAmount": 41700.00
  }'::jsonb,
  '[
    {"accountNumber":"7010","debitAmount":40500.00,"creditAmount":0.00,"dimensionJson":{"projectId":"project-demo-alpha","costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}},
    {"accountNumber":"7060","debitAmount":1200.00,"creditAmount":0.00,"dimensionJson":{"costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}},
    {"accountNumber":"2710","debitAmount":0.00,"creditAmount":12510.00,"dimensionJson":{}},
    {"accountNumber":"7110","debitAmount":13101.14,"creditAmount":0.00,"dimensionJson":{}},
    {"accountNumber":"2540","debitAmount":0.00,"creditAmount":13101.14,"dimensionJson":{}},
    {"accountNumber":"7780","debitAmount":41700.00,"creditAmount":0.00,"dimensionJson":{}},
    {"accountNumber":"2730","debitAmount":0.00,"creditAmount":41700.00,"dimensionJson":{}},
    {"accountNumber":"2790","debitAmount":0.00,"creditAmount":29190.00,"dimensionJson":{}}
  ]'::jsonb,
  'seed',
  NOW(),
  NOW()
)
ON CONFLICT (company_id, pay_run_id) DO NOTHING;

INSERT INTO payroll_posting_lines (
  payroll_posting_line_id,
  payroll_posting_id,
  company_id,
  account_number,
  debit_amount,
  credit_amount,
  dimension_json,
  created_at
)
VALUES
  ('00000000-0000-4000-8000-000000008512','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','7010',40500.00,0.00,'{"projectId":"project-demo-alpha","costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008513','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','7060',1200.00,0.00,'{"costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008514','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','2710',0.00,12510.00,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008515','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','7110',13101.14,0.00,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008516','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','2540',0.00,13101.14,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008517','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','7780',41700.00,0.00,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008518','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','2730',0.00,41700.00,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008519','00000000-0000-4000-8000-000000008511','00000000-0000-4000-8000-000000000001','2790',0.00,29190.00,'{}'::jsonb,NOW())
ON CONFLICT (payroll_posting_line_id) DO NOTHING;

INSERT INTO payroll_payout_batches (
  payroll_payout_batch_id,
  company_id,
  pay_run_id,
  reporting_period,
  bank_account_id,
  status,
  total_amount,
  payment_date,
  export_file_name,
  export_payload,
  export_payload_hash,
  matched_at,
  matched_by_actor_id,
  matched_journal_entry_id,
  bank_event_id,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000008521',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000008201',
  '202603',
  '00000000-0000-4000-8000-000000006649',
  'exported',
  29190.00,
  '2026-03-25',
  'PAYROLL-202603-seed.csv',
  'employee_no;payee;account;amount;currency;reference
EMP0711;Anna Berg;5000:**********;29190.00;SEK;LON 202603 EMP0711',
  'phase8-3-seed-payout-202603',
  NULL,
  NULL,
  NULL,
  NULL,
  'seed',
  NOW(),
  NOW()
)
ON CONFLICT (company_id, pay_run_id) DO NOTHING;

INSERT INTO payroll_payout_batch_lines (
  payroll_payout_line_id,
  payroll_payout_batch_id,
  company_id,
  employment_id,
  employee_id,
  employee_bank_account_id,
  payout_method,
  payee_name,
  account_target,
  amount,
  currency_code,
  payment_reference,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000008522',
  '00000000-0000-4000-8000-000000008521',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000721',
  '00000000-0000-4000-8000-000000000711',
  '00000000-0000-4000-8000-000000000751',
  'domestic_account',
  'Anna Berg',
  '5000:**********',
  29190.00,
  'SEK',
  'LON 202603 EMP0711',
  NOW()
)
ON CONFLICT (payroll_payout_line_id) DO NOTHING;

INSERT INTO vacation_liability_snapshots (
  vacation_liability_snapshot_id,
  company_id,
  reporting_period,
  pay_run_ids_json,
  totals_json,
  employee_snapshots_json,
  snapshot_hash,
  created_by_actor_id,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000008531',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  '["00000000-0000-4000-8000-000000008201"]'::jsonb,
  '{
    "vacationBasisAmount": 41700.00,
    "vacationSettlementAmount": 0.00,
    "liabilityAmount": 41700.00
  }'::jsonb,
  '[
    {
      "employmentId": "00000000-0000-4000-8000-000000000721",
      "employeeId": "00000000-0000-4000-8000-000000000711",
      "vacationBasisAmount": 41700.00,
      "vacationSettlementAmount": 0.00,
      "liabilityAmount": 41700.00
    }
  ]'::jsonb,
  'phase8-3-seed-vacation-202603',
  'seed',
  NOW()
)
ON CONFLICT (company_id, reporting_period, snapshot_hash) DO NOTHING;

UPDATE pay_runs
SET
  posting_status = 'posted',
  posting_journal_entry_id = NULL,
  payout_batch_status = 'exported',
  payout_batch_id = '00000000-0000-4000-8000-000000008521',
  updated_at = NOW()
WHERE pay_run_id = '00000000-0000-4000-8000-000000008201';
