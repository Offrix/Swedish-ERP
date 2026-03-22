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
  '00000000-0000-4000-8000-000000001131',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001121',
  'cashflow',
  1,
  'period',
  base_period.accounting_period_id,
  '2026-01-01',
  '2026-12-31',
  'hard_closed',
  'phase11-demo-cashflow-source-hash',
  'phase11-demo-cashflow-content-hash',
  '{}'::jsonb,
  '[
    {"metricCode":"cash_inflow_amount","versionNo":1},
    {"metricCode":"cash_outflow_amount","versionNo":1},
    {"metricCode":"net_cash_movement_amount","versionNo":1}
  ]'::jsonb,
  3,
  'system'
FROM base_period
WHERE NOT EXISTS (
  SELECT 1
  FROM report_snapshots
  WHERE report_snapshot_id = '00000000-0000-4000-8000-000000001131'
);

INSERT INTO report_export_jobs (
  report_export_job_id,
  company_id,
  report_snapshot_id,
  report_code,
  report_version_no,
  format,
  watermark_mode,
  requested_by_actor_id,
  status,
  artifact_ref,
  artifact_name,
  artifact_content_type,
  content_hash,
  completed_at
)
SELECT
  '00000000-0000-4000-8000-000000001132',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001131',
  'cashflow',
  1,
  'pdf',
  'none',
  'system',
  'delivered',
  'memory://report-exports/demo/cashflow_2026.pdf',
  'cashflow_2026.pdf',
  'application/pdf',
  'phase11-demo-export-hash',
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM report_export_jobs
  WHERE report_export_job_id = '00000000-0000-4000-8000-000000001132'
);
