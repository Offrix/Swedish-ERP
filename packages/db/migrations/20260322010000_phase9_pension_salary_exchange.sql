CREATE TABLE IF NOT EXISTS pension_plans (
  pension_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  plan_code TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  collective_agreement_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  report_model_code TEXT NOT NULL,
  default_pay_item_code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, plan_code)
);

CREATE TABLE IF NOT EXISTS employee_pension_enrollments (
  pension_enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  employee_id UUID NOT NULL REFERENCES employees(employee_id),
  employment_id UUID NOT NULL REFERENCES employments(employment_id),
  pension_plan_id UUID REFERENCES pension_plans(pension_plan_id),
  plan_code TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  collective_agreement_code TEXT NOT NULL,
  contribution_mode TEXT NOT NULL,
  contribution_rate_percent NUMERIC(9,4),
  fixed_contribution_amount NUMERIC(18,2),
  contribution_basis_code TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE,
  status TEXT NOT NULL DEFAULT 'active',
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_exchange_agreements (
  salary_exchange_agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  employee_id UUID NOT NULL REFERENCES employees(employee_id),
  employment_id UUID NOT NULL REFERENCES employments(employment_id),
  provider_code TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE,
  status TEXT NOT NULL,
  exchange_mode TEXT NOT NULL,
  exchange_value NUMERIC(18,2) NOT NULL,
  employer_markup_percent NUMERIC(9,4) NOT NULL,
  threshold_amount NUMERIC(18,2) NOT NULL,
  basis_treatment_code TEXT NOT NULL,
  exception_decision_reference TEXT,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pension_basis_snapshots (
  pension_basis_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  employee_id UUID NOT NULL REFERENCES employees(employee_id),
  employment_id UUID NOT NULL REFERENCES employments(employment_id),
  reporting_period TEXT NOT NULL,
  monthly_gross_salary_before_exchange NUMERIC(18,2) NOT NULL DEFAULT 0,
  salary_exchange_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  pensionable_base_before_exchange NUMERIC(18,2) NOT NULL DEFAULT 0,
  pensionable_base_after_exchange NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_pension_premium_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  special_payroll_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  warning_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pension_reports (
  pension_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  reporting_period TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  report_status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  invoice_due_date DATE,
  totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pension_report_lines (
  pension_report_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pension_report_id UUID NOT NULL REFERENCES pension_reports(pension_report_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id),
  employee_id UUID REFERENCES employees(employee_id),
  employment_id UUID REFERENCES employments(employment_id),
  plan_code TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  collective_agreement_code TEXT NOT NULL,
  reporting_basis_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  contribution_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pension_reconciliations (
  pension_reconciliation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  pension_report_id UUID REFERENCES pension_reports(pension_report_id),
  reporting_period TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  expected_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  invoiced_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  invoice_document_id UUID REFERENCES documents(document_id),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pension_events
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(employee_id),
  ADD COLUMN IF NOT EXISTS reporting_period TEXT,
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS provider_code TEXT,
  ADD COLUMN IF NOT EXISTS collective_agreement_code TEXT,
  ADD COLUMN IF NOT EXISTS report_basis_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS contribution_rate_percent NUMERIC(9,4),
  ADD COLUMN IF NOT EXISTS contribution_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS salary_exchange_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS extra_pension_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS report_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS invoice_reconciliation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payroll_line_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warning_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322010000_phase9_pension_salary_exchange')
ON CONFLICT (migration_id) DO NOTHING;
