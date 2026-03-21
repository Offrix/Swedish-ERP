WITH base_period AS (
  SELECT accounting_period_id
  FROM accounting_periods
  WHERE company_id = '00000000-0000-4000-8000-000000000001'
    AND starts_on = '2026-01-01'
    AND ends_on = '2026-12-31'
  LIMIT 1
)
INSERT INTO report_snapshots (
  report_snapshot_id,
  company_id,
  report_definition_id,
  report_code,
  report_version_no,
  view_mode,
  accounting_period_id,
  from_date,
  to_date,
  period_status,
  source_snapshot_hash,
  content_hash,
  filter_json,
  metric_versions_json,
  line_count,
  created_by_actor_id
)
SELECT
  '00000000-0000-4000-8000-000000000711',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000701',
  'trial_balance',
  1,
  'period',
  base_period.accounting_period_id,
  '2026-01-01',
  '2026-12-31',
  'hard_closed',
  'phase3-3-demo-source-hash',
  'phase3-3-demo-content-hash',
  '{}'::jsonb,
  '[{"metricCode":"total_debit","versionNo":1},{"metricCode":"total_credit","versionNo":1},{"metricCode":"balance_amount","versionNo":1}]'::jsonb,
  3,
  'system'
FROM base_period
WHERE NOT EXISTS (
  SELECT 1
  FROM report_snapshots
  WHERE report_snapshot_id = '00000000-0000-4000-8000-000000000711'
);

WITH base_period AS (
  SELECT accounting_period_id
  FROM accounting_periods
  WHERE company_id = '00000000-0000-4000-8000-000000000001'
    AND starts_on = '2026-01-01'
    AND ends_on = '2026-12-31'
  LIMIT 1
)
INSERT INTO reconciliation_runs (
  reconciliation_run_id,
  company_id,
  accounting_period_id,
  area_code,
  version_no,
  cutoff_date,
  status,
  ledger_account_numbers,
  ledger_balance_amount,
  subledger_balance_amount,
  difference_amount,
  materiality_threshold_amount,
  snapshot_hash,
  checklist_snapshot_ref,
  signoff_required,
  evidence_snapshot_ref,
  created_by_actor_id
)
SELECT
  '00000000-0000-4000-8000-000000000712',
  '00000000-0000-4000-8000-000000000001',
  base_period.accounting_period_id,
  'bank',
  1,
  '2026-12-31',
  'signed',
  ARRAY['1110']::TEXT[],
  0,
  0,
  0,
  0,
  'phase3-3-demo-reconciliation-hash',
  'close-snapshot-demo-2026-01',
  TRUE,
  'phase3-3-demo-reconciliation-hash',
  'system'
FROM base_period
WHERE NOT EXISTS (
  SELECT 1
  FROM reconciliation_runs
  WHERE reconciliation_run_id = '00000000-0000-4000-8000-000000000712'
);

INSERT INTO reconciliation_signoffs (
  reconciliation_signoff_id,
  reconciliation_run_id,
  company_id,
  signatory_role,
  signatory_user_id,
  decision,
  comment,
  evidence_snapshot_ref,
  evidence_refs_json
)
SELECT
  '00000000-0000-4000-8000-000000000713',
  '00000000-0000-4000-8000-000000000712',
  '00000000-0000-4000-8000-000000000001',
  'close_signatory',
  'user-demo-admin',
  'approved',
  'Demo sign-off for reporting and reconciliation verification.',
  'phase3-3-demo-reconciliation-hash',
  '["close-snapshot-demo-2026-01"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM reconciliation_signoffs
  WHERE reconciliation_signoff_id = '00000000-0000-4000-8000-000000000713'
);
