UPDATE pay_run_lines
SET dimension_json = CASE pay_run_line_id
  WHEN '00000000-0000-4000-8000-000000008311' THEN '{"projectId":"project-demo-alpha","costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb
  WHEN '00000000-0000-4000-8000-000000008312' THEN '{"costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb
  WHEN '00000000-0000-4000-8000-000000008313' THEN '{"projectId":"project-demo-beta","costCenterCode":"CC-200","businessAreaCode":"BA-FIELD"}'::jsonb
  WHEN '00000000-0000-4000-8000-000000008314' THEN '{"projectId":"project-demo-beta","costCenterCode":"CC-200","businessAreaCode":"BA-FIELD"}'::jsonb
  WHEN '00000000-0000-4000-8000-000000008315' THEN '{"costCenterCode":"CC-200","businessAreaCode":"BA-FIELD"}'::jsonb
  WHEN '00000000-0000-4000-8000-000000008316' THEN '{"costCenterCode":"CC-200","businessAreaCode":"BA-FIELD"}'::jsonb
  WHEN '00000000-0000-4000-8000-000000008317' THEN '{"costCenterCode":"CC-200","businessAreaCode":"BA-FIELD"}'::jsonb
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
  '00000000-0000-4000-8000-000000008611',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000008301',
  '202603',
  'regular',
  'posted',
  NULL,
  'phase8-3-demo-posting-202603',
  'phase8-3-demo-posting-source-202603',
  '{
    "preliminaryTaxAmount": 10732.50,
    "employerContributionAmount": 14987.34,
    "netPayAmount": 32767.50,
    "vacationLiabilityAmount": 43500.00,
    "vacationLiabilityDeltaAmount": 43500.00
  }'::jsonb,
  '[
    {"accountNumber":"7010","debitAmount":43500.00,"creditAmount":0.00,"dimensionJson":{"projectId":"project-demo-alpha","costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}},
    {"accountNumber":"7290","debitAmount":4200.00,"creditAmount":0.00,"dimensionJson":{"costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}},
    {"accountNumber":"2710","debitAmount":0.00,"creditAmount":10732.50,"dimensionJson":{}},
    {"accountNumber":"7110","debitAmount":14987.34,"creditAmount":0.00,"dimensionJson":{}},
    {"accountNumber":"2540","debitAmount":0.00,"creditAmount":14987.34,"dimensionJson":{}},
    {"accountNumber":"7780","debitAmount":43500.00,"creditAmount":0.00,"dimensionJson":{}},
    {"accountNumber":"2730","debitAmount":0.00,"creditAmount":43500.00,"dimensionJson":{}},
    {"accountNumber":"2790","debitAmount":0.00,"creditAmount":32767.50,"dimensionJson":{}}
  ]'::jsonb,
  'demo',
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
  ('00000000-0000-4000-8000-000000008612','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','7010',43500.00,0.00,'{"projectId":"project-demo-alpha","costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008613','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','7290',4200.00,0.00,'{"costCenterCode":"CC-100","businessAreaCode":"BA-SERVICES"}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008614','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','2710',0.00,10732.50,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008615','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','7110',14987.34,0.00,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008616','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','2540',0.00,14987.34,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008617','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','7780',43500.00,0.00,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008618','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','2730',0.00,43500.00,'{}'::jsonb,NOW()),
  ('00000000-0000-4000-8000-000000008619','00000000-0000-4000-8000-000000008611','00000000-0000-4000-8000-000000000001','2790',0.00,32767.50,'{}'::jsonb,NOW())
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
  '00000000-0000-4000-8000-000000008621',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000008301',
  '202603',
  '00000000-0000-4000-8000-000000006748',
  'matched',
  32767.50,
  '2026-03-25',
  'PAYROLL-202603-demo.csv',
  'employee_no;payee;account;amount;currency;reference
EMP0781;Sara Nord;****************3000;32767.50;SEK;LON 202603 EMP0781',
  'phase8-3-demo-payout-202603',
  NOW(),
  'demo',
  NULL,
  'bank-demo-payroll-booked-202603-1',
  'demo',
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
  '00000000-0000-4000-8000-000000008622',
  '00000000-0000-4000-8000-000000008621',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000791',
  '00000000-0000-4000-8000-000000000781',
  '00000000-0000-4000-8000-000000000821',
  'iban',
  'Sara Nord',
  '****************3000',
  32767.50,
  'SEK',
  'LON 202603 EMP0781',
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
  '00000000-0000-4000-8000-000000008631',
  '00000000-0000-4000-8000-000000000001',
  '202604',
  '[
    "00000000-0000-4000-8000-000000008301",
    "00000000-0000-4000-8000-000000008302",
    "00000000-0000-4000-8000-000000008303",
    "00000000-0000-4000-8000-000000008304"
  ]'::jsonb,
  '{
    "vacationBasisAmount": 67100.00,
    "vacationSettlementAmount": 4800.00,
    "liabilityAmount": 62300.00
  }'::jsonb,
  '[
    {
      "employmentId": "00000000-0000-4000-8000-000000000791",
      "employeeId": "00000000-0000-4000-8000-000000000781",
      "vacationBasisAmount": 67100.00,
      "vacationSettlementAmount": 4800.00,
      "liabilityAmount": 62300.00
    }
  ]'::jsonb,
  'phase8-3-demo-vacation-202604',
  'demo',
  NOW()
)
ON CONFLICT (company_id, reporting_period, snapshot_hash) DO NOTHING;

UPDATE pay_runs
SET
  posting_status = CASE
    WHEN pay_run_id IN (
      '00000000-0000-4000-8000-000000008301',
      '00000000-0000-4000-8000-000000008302',
      '00000000-0000-4000-8000-000000008303',
      '00000000-0000-4000-8000-000000008304'
    ) THEN 'posted'
    ELSE posting_status
  END,
  payout_batch_status = CASE
    WHEN pay_run_id = '00000000-0000-4000-8000-000000008301' THEN 'matched'
    ELSE payout_batch_status
  END,
  payout_batch_id = CASE
    WHEN pay_run_id = '00000000-0000-4000-8000-000000008301' THEN '00000000-0000-4000-8000-000000008621'
    ELSE payout_batch_id
  END,
  updated_at = NOW()
WHERE pay_run_id IN (
  '00000000-0000-4000-8000-000000008301',
  '00000000-0000-4000-8000-000000008302',
  '00000000-0000-4000-8000-000000008303',
  '00000000-0000-4000-8000-000000008304'
);
