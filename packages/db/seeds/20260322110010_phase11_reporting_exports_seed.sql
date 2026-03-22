INSERT INTO report_metric_definitions (
  report_metric_definition_id,
  company_id,
  metric_code,
  version_no,
  name,
  owner_role_code,
  drilldown_level,
  formula_ref,
  source_domains_json,
  status
)
VALUES
  ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000000001', 'cash_inflow_amount', 1, 'Cash inflow', 'finance_manager', 'journal_entry', 'sum(positive_cash_movements)', '["ledger"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000000001', 'cash_outflow_amount', 1, 'Cash outflow', 'finance_manager', 'journal_entry', 'sum(abs(negative_cash_movements))', '["ledger"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001103', '00000000-0000-4000-8000-000000000001', 'net_cash_movement_amount', 1, 'Net cash movement', 'finance_manager', 'journal_entry', 'sum(cash_inflow-cash_outflow)', '["ledger"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001104', '00000000-0000-4000-8000-000000000001', 'ar_open_amount', 1, 'AR open amount', 'finance_manager', 'ar_open_item', 'sum(ar_open_item.open_amount)', '["ar"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001105', '00000000-0000-4000-8000-000000000001', 'ar_overdue_amount', 1, 'AR overdue amount', 'finance_manager', 'ar_open_item', 'sum(ar_open_item.open_amount where due_on < cutoff)', '["ar"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001106', '00000000-0000-4000-8000-000000000001', 'ar_invoice_count', 1, 'AR invoice count', 'finance_manager', 'ar_open_item', 'count(distinct ar_open_item.customer_invoice_id)', '["ar"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001107', '00000000-0000-4000-8000-000000000001', 'ap_open_amount', 1, 'AP open amount', 'finance_manager', 'ap_open_item', 'sum(ap_open_item.open_amount)', '["ap"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001108', '00000000-0000-4000-8000-000000000001', 'ap_overdue_amount', 1, 'AP overdue amount', 'finance_manager', 'ap_open_item', 'sum(ap_open_item.open_amount where due_on < cutoff)', '["ap"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001109', '00000000-0000-4000-8000-000000000001', 'ap_invoice_count', 1, 'AP invoice count', 'finance_manager', 'ap_open_item', 'count(distinct ap_open_item.supplier_invoice_id)', '["ap"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001110', '00000000-0000-4000-8000-000000000001', 'project_actual_cost_amount', 1, 'Project actual cost', 'project_controller', 'project_snapshot', 'project_cost_snapshot.actual_cost_amount', '["projects"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001111', '00000000-0000-4000-8000-000000000001', 'project_billed_revenue_amount', 1, 'Project billed revenue', 'project_controller', 'project_snapshot', 'project_cost_snapshot.billed_revenue_amount', '["projects","ar"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001112', '00000000-0000-4000-8000-000000000001', 'project_wip_amount', 1, 'Project WIP', 'project_controller', 'project_snapshot', 'project_wip_snapshot.wip_amount', '["projects"]'::jsonb, 'active'),
  ('00000000-0000-4000-8000-000000001113', '00000000-0000-4000-8000-000000000001', 'project_forecast_margin_amount', 1, 'Project forecast margin', 'project_controller', 'project_snapshot', 'project_forecast_snapshot.forecast_margin_amount', '["projects"]'::jsonb, 'active')
ON CONFLICT (company_id, metric_code, version_no) DO NOTHING;

INSERT INTO report_definitions (
  report_definition_id,
  company_id,
  report_code,
  version_no,
  name,
  purpose,
  status,
  default_view_mode,
  metric_catalog_json,
  definition_kind,
  base_report_code,
  row_dimension_code,
  default_filters_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000001121',
    '00000000-0000-4000-8000-000000000001',
    'cashflow',
    1,
    'Cashflow',
    'Deterministic cash movement report grouped by cashflow bucket with journal and document drilldown.',
    'active',
    'period',
    '[
      {"metricCode":"cash_inflow_amount","name":"Cash inflow","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"cash_outflow_amount","name":"Cash outflow","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"},
      {"metricCode":"net_cash_movement_amount","name":"Net cash movement","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"journal_entry"}
    ]'::jsonb,
    'official',
    NULL,
    'cashflow_bucket',
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000001122',
    '00000000-0000-4000-8000-000000000001',
    'ar_open_items',
    1,
    'AR open items',
    'Customer receivables report grouped by customer with deterministic open-amount and overdue drilldown.',
    'active',
    'period',
    '[
      {"metricCode":"ar_open_amount","name":"AR open amount","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"ar_open_item"},
      {"metricCode":"ar_overdue_amount","name":"AR overdue amount","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"ar_open_item"},
      {"metricCode":"ar_invoice_count","name":"AR invoice count","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"ar_open_item"}
    ]'::jsonb,
    'official',
    NULL,
    'customer',
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000001123',
    '00000000-0000-4000-8000-000000000001',
    'ap_open_items',
    1,
    'AP open items',
    'Supplier payables report grouped by supplier with deterministic open-amount and overdue drilldown.',
    'active',
    'period',
    '[
      {"metricCode":"ap_open_amount","name":"AP open amount","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"ap_open_item"},
      {"metricCode":"ap_overdue_amount","name":"AP overdue amount","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"ap_open_item"},
      {"metricCode":"ap_invoice_count","name":"AP invoice count","ownerRoleCode":"finance_manager","versionNo":1,"drilldownLevel":"ap_open_item"}
    ]'::jsonb,
    'official',
    NULL,
    'supplier',
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000001124',
    '00000000-0000-4000-8000-000000000001',
    'project_portfolio',
    1,
    'Project portfolio',
    'Project-level cost, billed revenue, WIP and forecast margin report with snapshot drilldown.',
    'active',
    'period',
    '[
      {"metricCode":"project_actual_cost_amount","name":"Project actual cost","ownerRoleCode":"project_controller","versionNo":1,"drilldownLevel":"project_snapshot"},
      {"metricCode":"project_billed_revenue_amount","name":"Project billed revenue","ownerRoleCode":"project_controller","versionNo":1,"drilldownLevel":"project_snapshot"},
      {"metricCode":"project_wip_amount","name":"Project WIP","ownerRoleCode":"project_controller","versionNo":1,"drilldownLevel":"project_snapshot"},
      {"metricCode":"project_forecast_margin_amount","name":"Project forecast margin","ownerRoleCode":"project_controller","versionNo":1,"drilldownLevel":"project_snapshot"}
    ]'::jsonb,
    'official',
    NULL,
    'project',
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000001125',
    '00000000-0000-4000-8000-000000000001',
    'project_portfolio_focus',
    1,
    'Project portfolio focus',
    'Light report builder definition for project snapshots with selected margin and WIP metrics.',
    'active',
    'period',
    '[
      {"metricCode":"project_billed_revenue_amount","name":"Project billed revenue","ownerRoleCode":"project_controller","versionNo":1,"drilldownLevel":"project_snapshot"},
      {"metricCode":"project_wip_amount","name":"Project WIP","ownerRoleCode":"project_controller","versionNo":1,"drilldownLevel":"project_snapshot"},
      {"metricCode":"project_forecast_margin_amount","name":"Project forecast margin","ownerRoleCode":"project_controller","versionNo":1,"drilldownLevel":"project_snapshot"}
    ]'::jsonb,
    'light_builder',
    'project_portfolio',
    'project',
    '{"projectStatuses":["active","on_hold"]}'::jsonb
  )
ON CONFLICT (company_id, report_code, version_no) DO NOTHING;
