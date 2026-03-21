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
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000601',
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
      AND starts_on = DATE '2026-01-01'
      AND ends_on = DATE '2026-12-31'
  ),
  DATE '2026-01-05',
  1,
  'MANUAL_JOURNAL',
  'phase3-demo-manual-001',
  '00000000-0000-4000-8000-000000000011',
  'posted',
  FALSE,
  'SEK',
  jsonb_build_object('pipelineStage', 'ledger_posting', 'seed', 'phase3_demo'),
  'phase3-demo-manual-001',
  'Initial bank funding',
  NOW(),
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_entries
  WHERE company_id = '00000000-0000-4000-8000-000000000001'
    AND idempotency_key = 'phase3-demo-manual-001'
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
  '00000000-0000-4000-8000-000000000611',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '1110'
  ),
  10000.00,
  0,
  '{}'::jsonb,
  'MANUAL_JOURNAL',
  'phase3-demo-manual-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  1,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000611'
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
  '00000000-0000-4000-8000-000000000612',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '2010'
  ),
  0,
  10000.00,
  '{}'::jsonb,
  'MANUAL_JOURNAL',
  'phase3-demo-manual-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  2,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000612'
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
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000602',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT voucher_series_id
    FROM voucher_series
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND series_code = 'X'
  ),
  (
    SELECT accounting_period_id
    FROM accounting_periods
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND starts_on = DATE '2026-01-01'
      AND ends_on = DATE '2026-12-31'
  ),
  DATE '2026-01-06',
  1,
  'MANUAL_JOURNAL',
  'phase3-demo-import-001',
  '00000000-0000-4000-8000-000000000011',
  'posted',
  TRUE,
  'SEK',
  jsonb_build_object('pipelineStage', 'ledger_posting', 'importSourceType', 'opening_balance', 'seed', 'phase3_demo'),
  'phase3-demo-import-001',
  'Historical import opening balance',
  NOW(),
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_entries
  WHERE company_id = '00000000-0000-4000-8000-000000000001'
    AND idempotency_key = 'phase3-demo-import-001'
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
  '00000000-0000-4000-8000-000000000621',
  '00000000-0000-4000-8000-000000000602',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '1110'
  ),
  2500.00,
  0,
  '{}'::jsonb,
  'MANUAL_JOURNAL',
  'phase3-demo-import-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  1,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000621'
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
  '00000000-0000-4000-8000-000000000622',
  '00000000-0000-4000-8000-000000000602',
  '00000000-0000-4000-8000-000000000001',
  (
    SELECT account_id
    FROM accounts
    WHERE company_id = '00000000-0000-4000-8000-000000000001'
      AND account_number = '2650'
  ),
  0,
  2500.00,
  '{}'::jsonb,
  'MANUAL_JOURNAL',
  'phase3-demo-import-001',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  2,
  'SEK',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM journal_lines
  WHERE journal_line_id = '00000000-0000-4000-8000-000000000622'
);

UPDATE voucher_series
SET next_number = GREATEST(next_number, 2)
WHERE company_id = '00000000-0000-4000-8000-000000000001'
  AND series_code IN ('A', 'X');
