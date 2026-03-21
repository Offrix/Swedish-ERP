CREATE TABLE IF NOT EXISTS report_definitions (
  report_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  report_code TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  default_view_mode TEXT NOT NULL DEFAULT 'period',
  metric_catalog_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, report_code, version_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_definitions_phase3_3_status'
  ) THEN
    ALTER TABLE report_definitions
      ADD CONSTRAINT ck_report_definitions_phase3_3_status
      CHECK (status IN ('draft', 'active', 'superseded', 'retired'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_definitions_phase3_3_view_mode'
  ) THEN
    ALTER TABLE report_definitions
      ADD CONSTRAINT ck_report_definitions_phase3_3_view_mode
      CHECK (default_view_mode IN ('transactions', 'period', 'rolling_12', 'fiscal_year'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS report_snapshots (
  report_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  report_definition_id UUID REFERENCES report_definitions(report_definition_id) ON DELETE SET NULL,
  report_code TEXT NOT NULL,
  report_version_no INTEGER NOT NULL,
  view_mode TEXT NOT NULL,
  accounting_period_id UUID REFERENCES accounting_periods(accounting_period_id) ON DELETE SET NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  period_status TEXT NOT NULL,
  source_snapshot_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  filter_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metric_versions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  line_count INTEGER NOT NULL DEFAULT 0,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_snapshots_phase3_3_view_mode'
  ) THEN
    ALTER TABLE report_snapshots
      ADD CONSTRAINT ck_report_snapshots_phase3_3_view_mode
      CHECK (view_mode IN ('transactions', 'period', 'rolling_12', 'fiscal_year'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_report_snapshots_company_code_period
  ON report_snapshots (company_id, report_code, from_date, to_date);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  reconciliation_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  accounting_period_id UUID NOT NULL REFERENCES accounting_periods(accounting_period_id) ON DELETE CASCADE,
  area_code TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  cutoff_date DATE NOT NULL,
  status TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ledger_account_numbers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ledger_balance_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  subledger_balance_amount NUMERIC(18, 2),
  difference_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  materiality_threshold_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  snapshot_hash TEXT NOT NULL,
  checklist_snapshot_ref TEXT,
  signoff_required BOOLEAN NOT NULL DEFAULT TRUE,
  evidence_snapshot_ref TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, accounting_period_id, area_code, version_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_reconciliation_runs_phase3_3_status'
  ) THEN
    ALTER TABLE reconciliation_runs
      ADD CONSTRAINT ck_reconciliation_runs_phase3_3_status
      CHECK (status IN ('draft', 'in_progress', 'ready_for_signoff', 'signed', 'closed', 'reopened'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_reconciliation_runs_phase3_3_area'
  ) THEN
    ALTER TABLE reconciliation_runs
      ADD CONSTRAINT ck_reconciliation_runs_phase3_3_area
      CHECK (area_code IN ('bank', 'ar', 'ap', 'vat', 'tax_and_social_fees', 'payroll', 'pension', 'accruals', 'assets', 'project_wip', 'suspense'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_reconciliation_runs_company_period_area
  ON reconciliation_runs (company_id, accounting_period_id, area_code, status);

CREATE TABLE IF NOT EXISTS reconciliation_difference_items (
  reconciliation_difference_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_run_id UUID NOT NULL REFERENCES reconciliation_runs(reconciliation_run_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL,
  state TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  owner_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  explanation TEXT,
  waived_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_reconciliation_difference_items_phase3_3_state'
  ) THEN
    ALTER TABLE reconciliation_difference_items
      ADD CONSTRAINT ck_reconciliation_difference_items_phase3_3_state
      CHECK (state IN ('open', 'investigating', 'proposed_adjustment', 'resolved', 'waived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_reconciliation_difference_items_run_state
  ON reconciliation_difference_items (reconciliation_run_id, state);

CREATE TABLE IF NOT EXISTS reconciliation_signoffs (
  reconciliation_signoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_run_id UUID NOT NULL REFERENCES reconciliation_runs(reconciliation_run_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  signatory_role TEXT NOT NULL,
  signatory_user_id TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'approved',
  comment TEXT,
  evidence_snapshot_ref TEXT NOT NULL,
  evidence_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_reconciliation_signoffs_phase3_3_decision'
  ) THEN
    ALTER TABLE reconciliation_signoffs
      ADD CONSTRAINT ck_reconciliation_signoffs_phase3_3_decision
      CHECK (decision IN ('approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_reconciliation_signoffs_run_signed
  ON reconciliation_signoffs (reconciliation_run_id, signed_at);
