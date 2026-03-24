CREATE TABLE IF NOT EXISTS project_payroll_cost_allocations (
  project_payroll_cost_allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  project_cost_snapshot_id UUID NOT NULL REFERENCES project_cost_snapshots(project_cost_snapshot_id) ON DELETE CASCADE,
  pay_run_id UUID NOT NULL REFERENCES payroll_runs(pay_run_id) ON DELETE CASCADE,
  pay_run_line_id UUID NULL REFERENCES payroll_run_lines(pay_run_line_id) ON DELETE SET NULL,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  pay_date DATE NOT NULL,
  pay_item_code TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT,
  processing_step INTEGER,
  cost_bucket_code TEXT NOT NULL,
  allocation_basis_code TEXT NOT NULL,
  allocation_share NUMERIC(12,6) NOT NULL,
  allocated_amount NUMERIC(18,2) NOT NULL,
  source_line_amount NUMERIC(18,2),
  contribution_base_amount NUMERIC(18,2),
  project_minutes INTEGER,
  total_minutes INTEGER,
  source_line_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_project_payroll_cost_allocations_snapshot
  ON project_payroll_cost_allocations (project_cost_snapshot_id, pay_run_id, employment_id);

CREATE INDEX IF NOT EXISTS ix_project_payroll_cost_allocations_project_period
  ON project_payroll_cost_allocations (project_id, reporting_period, cost_bucket_code);
