ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_reference_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_manager_employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS starts_on DATE,
  ADD COLUMN IF NOT EXISTS ends_on DATE,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS billing_model_code TEXT,
  ADD COLUMN IF NOT EXISTS revenue_recognition_model_code TEXT,
  ADD COLUMN IF NOT EXISTS contract_value_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS ux_projects_company_reference_code_phase10_1
  ON projects (company_id, project_reference_code)
  WHERE project_reference_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS project_budget_versions (
  project_budget_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  budget_name TEXT NOT NULL,
  valid_from DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, version_no)
);

CREATE TABLE IF NOT EXISTS project_budget_lines (
  project_budget_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_budget_version_id UUID NOT NULL REFERENCES project_budget_versions(project_budget_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  line_kind TEXT NOT NULL,
  category_code TEXT NOT NULL,
  reporting_period TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  employment_id UUID REFERENCES employments(employment_id) ON DELETE SET NULL,
  activity_code TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_project_budget_lines_phase10_1_project_period
  ON project_budget_lines (project_id, reporting_period, line_kind);

CREATE TABLE IF NOT EXISTS project_resource_allocations (
  project_resource_allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL,
  billable_minutes INTEGER NOT NULL,
  bill_rate_amount NUMERIC(18,2) NOT NULL,
  cost_rate_amount NUMERIC(18,2) NOT NULL,
  activity_code TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_project_resource_allocations_phase10_1_project_period
  ON project_resource_allocations (project_id, reporting_period, employment_id);

CREATE TABLE IF NOT EXISTS project_cost_snapshots (
  project_cost_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  cutoff_date DATE NOT NULL,
  reporting_period TEXT NOT NULL,
  actual_cost_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  billed_revenue_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  recognized_revenue_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_counts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, cutoff_date, snapshot_hash)
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322020000_phase10_projects_budget_followup')
ON CONFLICT (migration_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS project_wip_snapshots (
  project_wip_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  cutoff_date DATE NOT NULL,
  reporting_period TEXT NOT NULL,
  approved_value_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  billed_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  wip_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  deferred_revenue_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'materialized',
  explanation_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, cutoff_date, snapshot_hash)
);

CREATE TABLE IF NOT EXISTS project_forecast_snapshots (
  project_forecast_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  cutoff_date DATE NOT NULL,
  reporting_period TEXT NOT NULL,
  actual_cost_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_budget_cost_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  forecast_cost_at_completion_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  billed_revenue_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_budget_revenue_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  forecast_revenue_at_completion_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_margin_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  forecast_margin_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  resource_load_percent NUMERIC(9,2) NOT NULL DEFAULT 0,
  snapshot_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, cutoff_date, snapshot_hash)
);
