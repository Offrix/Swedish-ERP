INSERT INTO report_definitions (
  report_definition_id,
  company_id,
  report_code,
  version_no,
  name,
  purpose,
  status,
  default_view_mode,
  metric_catalog_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000001',
    'trial_balance',
    1,
    'Trial balance',
    'Account-level debit, credit and balance movements with report-to-journal-to-document drilldown.',
    'active',
    'period',
    '[
      {"metricCode":"total_debit","name":"Total debit","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"total_credit","name":"Total credit","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"balance_amount","name":"Balance amount","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"}
    ]'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000001',
    'income_statement',
    1,
    'Income statement',
    'Baseline revenue and cost report grouped by P&L accounts with deterministic drilldown.',
    'active',
    'period',
    '[
      {"metricCode":"pl_debit","name":"P&L debit","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"pl_credit","name":"P&L credit","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"pl_net_amount","name":"P&L net amount","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"}
    ]'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000703',
    '00000000-0000-4000-8000-000000000001',
    'balance_sheet',
    1,
    'Balance sheet',
    'Baseline balance sheet accounts with reproducible drilldown to voucher and document evidence.',
    'active',
    'period',
    '[
      {"metricCode":"bs_debit","name":"Balance sheet debit","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"bs_credit","name":"Balance sheet credit","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"bs_net_amount","name":"Balance sheet net amount","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"}
    ]'::jsonb
  )
ON CONFLICT (company_id, report_code, version_no) DO NOTHING;
