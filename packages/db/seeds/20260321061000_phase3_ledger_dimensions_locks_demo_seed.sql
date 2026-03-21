UPDATE accounting_periods
SET status = 'hard_closed',
    lock_reason_code = 'year_end_close',
    locked_by_actor_id = '00000000-0000-4000-8000-000000000011',
    locked_at = NOW(),
    updated_at = NOW()
WHERE company_id = '00000000-0000-4000-8000-000000000001'
  AND starts_on = DATE '2026-01-01'
  AND ends_on = DATE '2026-12-31';

INSERT INTO journal_entries (
  journal_entry_id,
  company_id,
  voucher_series_id,
  accounting_period_id,
  journal_date,
  voucher_number,
  source_type,
  source_id,
  actor_id,
  status,
  imported_flag,
  currency_code,
  metadata_json,
  idempotency_key,
  description,
  validated_at,
  posted_at,
  reversal_of_journal_entry_id,
  correction_of_journal_entry_id,
  correction_key,
  correction_type,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT voucher_series_id
    FROM voucher_series
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND series_code = 'V'
  ),
  (
    SELECT accounting_period_id
    FROM accounting_periods
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND starts_on = DATE '2027-01-01'
      AND ends_on = DATE '2027-12-31'
  ),
  DATE '2027-01-02',
  1,
  'MANUAL_JOURNAL',
  'phase3-demo-reversal-001',
  '00000000-0000-4000-8000-000000000011',
  'posted',
  FALSE,
  'SEK',
  jsonb_build_object(
    'pipelineStage', 'ledger_reversal',
    'reasonCode', 'close_correction',
    'originalJournalEntryId', '00000000-0000-4000-8000-000000000601',
    'originalPeriodUntouched', TRUE,
    'seed', 'phase3_2_demo'
  ),
  'phase3-demo-reversal-001',
  'Reversal of initial bank funding after hard close',
  NOW(),
  NOW(),
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000601',
  'phase3-demo-reversal-001',
  'full_reversal',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_entries
  WHERE company_id = '00000000-0000-4000-8000-000000000001'
    AND correction_key = 'phase3-demo-reversal-001'
);

INSERT INTO journal_lines (
  journal_line_id,
  journal_entry_id,
  company_id,
  account_id,
  debit_amount,
  credit_amount,
  dimension_json,
  source_type,
  source_id,
  actor_id,
  created_at,
  line_number,
  currency_code,
  exchange_rate
)
SELECT
  '00000000-0000-4000-8000-000000000631',
  '00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '2010'
  ),
  10000.00,
  0,
  '{}'::jsonb,
  'MANUAL_JOURNAL',
  'phase3-demo-reversal-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  1,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000631'
);

INSERT INTO journal_lines (
  journal_line_id,
  journal_entry_id,
  company_id,
  account_id,
  debit_amount,
  credit_amount,
  dimension_json,
  source_type,
  source_id,
  actor_id,
  created_at,
  line_number,
  currency_code,
  exchange_rate
)
SELECT
  '00000000-0000-4000-8000-000000000632',
  '00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '1110'
  ),
  0,
  10000.00,
  '{}'::jsonb,
  'MANUAL_JOURNAL',
  'phase3-demo-reversal-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  2,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000632'
);

INSERT INTO journal_entries (
  journal_entry_id,
  company_id,
  voucher_series_id,
  accounting_period_id,
  journal_date,
  voucher_number,
  source_type,
  source_id,
  actor_id,
  status,
  imported_flag,
  currency_code,
  metadata_json,
  idempotency_key,
  description,
  validated_at,
  posted_at,
  correction_of_journal_entry_id,
  correction_key,
  correction_type,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000604',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT voucher_series_id
    FROM voucher_series
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND series_code = 'A'
  ),
  (
    SELECT accounting_period_id
    FROM accounting_periods
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND starts_on = DATE '2027-01-01'
      AND ends_on = DATE '2027-12-31'
  ),
  DATE '2027-01-03',
  2,
  'MANUAL_JOURNAL',
  'phase3-demo-correction-001',
  '00000000-0000-4000-8000-000000000011',
  'posted',
  FALSE,
  'SEK',
  jsonb_build_object(
    'pipelineStage', 'ledger_correction',
    'reasonCode', 'project_cost_reclass',
    'originalJournalEntryId', '00000000-0000-4000-8000-000000000601',
    'originalPeriodUntouched', TRUE,
    'dimensionRequirementCode', 'project_cost',
    'seed', 'phase3_2_demo'
  ),
  'phase3-demo-correction-001',
  'Project cost correction after hard close',
  NOW(),
  NOW(),
  '00000000-0000-4000-8000-000000000601',
  'phase3-demo-correction-001',
  'delta',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_entries
  WHERE company_id = '00000000-0000-4000-8000-000000000001'
    AND correction_key = 'phase3-demo-correction-001'
);

INSERT INTO journal_lines (
  journal_line_id,
  journal_entry_id,
  company_id,
  account_id,
  debit_amount,
  credit_amount,
  dimension_json,
  source_type,
  source_id,
  actor_id,
  created_at,
  line_number,
  currency_code,
  exchange_rate
)
SELECT
  '00000000-0000-4000-8000-000000000641',
  '00000000-0000-4000-8000-000000000604',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '5410'
  ),
  1500.00,
  0,
  jsonb_build_object(
    'projectId', 'project-demo-alpha',
    'costCenterCode', 'CC-200',
    'businessAreaCode', 'BA-SERVICES'
  ),
  'MANUAL_JOURNAL',
  'phase3-demo-correction-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  1,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000641'
);

INSERT INTO journal_lines (
  journal_line_id,
  journal_entry_id,
  company_id,
  account_id,
  debit_amount,
  credit_amount,
  dimension_json,
  source_type,
  source_id,
  actor_id,
  created_at,
  line_number,
  currency_code,
  exchange_rate
)
SELECT
  '00000000-0000-4000-8000-000000000642',
  '00000000-0000-4000-8000-000000000604',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '1110'
  ),
  0,
  1500.00,
  '{}'::jsonb,
  'MANUAL_JOURNAL',
  'phase3-demo-correction-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  2,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000642'
);

UPDATE journal_entries
SET status = 'reversed',
    reversed_by_journal_entry_id = '00000000-0000-4000-8000-000000000603',
    updated_at = NOW()
WHERE journal_entry_id = '00000000-0000-4000-8000-000000000601';

UPDATE voucher_series
SET next_number = CASE series_code
  WHEN 'A' THEN GREATEST(next_number, 3)
  WHEN 'V' THEN GREATEST(next_number, 2)
  ELSE next_number
END
WHERE company_id = '00000000-0000-4000-8000-000000000001'
  AND series_code IN ('A', 'V');
