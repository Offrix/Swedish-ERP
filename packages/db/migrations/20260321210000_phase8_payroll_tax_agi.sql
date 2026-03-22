UPDATE pay_item_definitions
SET agi_mapping_code = CASE
  WHEN pay_item_code = 'BENEFIT' THEN 'taxable_benefit'
  WHEN pay_item_code = 'PENSION_PREMIUM' THEN 'pension_premium'
  WHEN pay_item_code IN ('TAX_FREE_TRAVEL_ALLOWANCE', 'TAX_FREE_MILEAGE') THEN 'tax_free_allowance'
  WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM') THEN 'not_reported'
  ELSE 'cash_compensation'
END
WHERE agi_mapping_code = 'phase8_2_pending';

UPDATE pay_run_lines
SET agi_mapping_code = CASE
  WHEN pay_item_code = 'BENEFIT' THEN 'taxable_benefit'
  WHEN pay_item_code = 'PENSION_PREMIUM' THEN 'pension_premium'
  WHEN pay_item_code IN ('TAX_FREE_TRAVEL_ALLOWANCE', 'TAX_FREE_MILEAGE') THEN 'tax_free_allowance'
  WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM') THEN 'not_reported'
  ELSE 'cash_compensation'
END
WHERE agi_mapping_code = 'phase8_2_pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_item_definitions_phase8_2_agi_mapping'
  ) THEN
    ALTER TABLE pay_item_definitions
      ADD CONSTRAINT ck_pay_item_definitions_phase8_2_agi_mapping
      CHECK (agi_mapping_code IN ('cash_compensation', 'taxable_benefit', 'tax_free_allowance', 'pension_premium', 'not_reported'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_run_lines_phase8_2_agi_mapping'
  ) THEN
    ALTER TABLE pay_run_lines
      ADD CONSTRAINT ck_pay_run_lines_phase8_2_agi_mapping
      CHECK (agi_mapping_code IN ('cash_compensation', 'taxable_benefit', 'tax_free_allowance', 'pension_premium', 'not_reported'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS employment_statutory_profiles (
  employment_statutory_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  tax_mode TEXT NOT NULL,
  tax_rate_percent NUMERIC(8, 4),
  contribution_class_code TEXT,
  sink_decision_type TEXT,
  sink_valid_from DATE,
  sink_valid_to DATE,
  sink_rate_percent NUMERIC(8, 4),
  sink_sea_income BOOLEAN NOT NULL DEFAULT FALSE,
  sink_decision_document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  fallback_tax_mode TEXT,
  fallback_tax_rate_percent NUMERIC(8, 4),
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employment_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employment_statutory_profiles_phase8_2_modes'
  ) THEN
    ALTER TABLE employment_statutory_profiles
      ADD CONSTRAINT ck_employment_statutory_profiles_phase8_2_modes
      CHECK (
        tax_mode IN ('pending', 'manual_rate', 'sink')
        AND (fallback_tax_mode IS NULL OR fallback_tax_mode IN ('pending', 'manual_rate', 'sink'))
        AND (sink_valid_to IS NULL OR sink_valid_from IS NULL OR sink_valid_to >= sink_valid_from)
        AND (tax_rate_percent IS NULL OR tax_rate_percent >= 0)
        AND (sink_rate_percent IS NULL OR sink_rate_percent >= 0)
        AND (fallback_tax_rate_percent IS NULL OR fallback_tax_rate_percent >= 0)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_employment_statutory_profiles_phase8_2_company
  ON employment_statutory_profiles (company_id, employment_id, tax_mode, updated_at);

CREATE TABLE IF NOT EXISTS agi_periods (
  agi_period_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, reporting_period)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_agi_periods_phase8_2_period'
  ) THEN
    ALTER TABLE agi_periods
      ADD CONSTRAINT ck_agi_periods_phase8_2_period
      CHECK (reporting_period ~ '^[0-9]{6}$' AND ends_on >= starts_on);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS agi_submissions (
  agi_submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  agi_period_id UUID NOT NULL REFERENCES agi_periods(agi_period_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  current_version_id UUID,
  latest_submitted_version_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, agi_period_id)
);

ALTER TABLE agi_submissions
  ADD COLUMN IF NOT EXISTS agi_period_id UUID,
  ADD COLUMN IF NOT EXISTS reporting_period TEXT,
  ADD COLUMN IF NOT EXISTS current_version_id UUID,
  ADD COLUMN IF NOT EXISTS latest_submitted_version_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE agi_submissions submissions
SET reporting_period = TO_CHAR(periods.starts_on, 'YYYYMM')
FROM accounting_periods periods
WHERE submissions.reporting_period IS NULL
  AND submissions.accounting_period_id = periods.accounting_period_id;

UPDATE agi_submissions
SET created_by_actor_id = COALESCE(created_by_actor_id, 'phase8_migration'),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE created_by_actor_id IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_agi_submissions_phase8_2_period'
  ) THEN
    ALTER TABLE agi_submissions
      ADD CONSTRAINT fk_agi_submissions_phase8_2_period
      FOREIGN KEY (agi_period_id) REFERENCES agi_periods(agi_period_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_agi_submissions_phase8_2_status'
  ) THEN
    ALTER TABLE agi_submissions
      ADD CONSTRAINT ck_agi_submissions_phase8_2_status
      CHECK (status IN ('draft', 'validated', 'ready_for_sign', 'submitted', 'accepted', 'partially_rejected', 'rejected', 'superseded'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_agi_submissions_phase8_2_company_period_id
  ON agi_submissions (company_id, agi_period_id);

CREATE INDEX IF NOT EXISTS ix_agi_submissions_phase8_2_company_period
  ON agi_submissions (company_id, reporting_period, status, created_at);

CREATE TABLE IF NOT EXISTS agi_submission_versions (
  agi_submission_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agi_submission_id UUID NOT NULL REFERENCES agi_submissions(agi_submission_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',
  previous_version_id UUID,
  previous_submitted_version_id UUID,
  correction_reason TEXT,
  source_pay_run_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_snapshot_hash TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  adapter_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_employee_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  lock_employment_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals_match BOOLEAN NOT NULL DEFAULT TRUE,
  validated_at TIMESTAMPTZ,
  ready_for_sign_at TIMESTAMPTZ,
  ready_for_sign_by_actor_id TEXT,
  submitted_at TIMESTAMPTZ,
  submitted_by_actor_id TEXT,
  submission_mode TEXT,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agi_submission_id, version_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_agi_submission_versions_phase8_2_state'
  ) THEN
    ALTER TABLE agi_submission_versions
      ADD CONSTRAINT ck_agi_submission_versions_phase8_2_state
      CHECK (state IN ('draft', 'validated', 'ready_for_sign', 'submitted', 'accepted', 'partially_rejected', 'rejected', 'superseded'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_agi_submission_versions_phase8_2_previous_version'
  ) THEN
    ALTER TABLE agi_submission_versions
      ADD CONSTRAINT fk_agi_submission_versions_phase8_2_previous_version
      FOREIGN KEY (previous_version_id) REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_agi_submission_versions_phase8_2_previous_submitted'
  ) THEN
    ALTER TABLE agi_submission_versions
      ADD CONSTRAINT fk_agi_submission_versions_phase8_2_previous_submitted
      FOREIGN KEY (previous_submitted_version_id) REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_agi_submissions_phase8_2_current_version'
  ) THEN
    ALTER TABLE agi_submissions
      ADD CONSTRAINT fk_agi_submissions_phase8_2_current_version
      FOREIGN KEY (current_version_id) REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_agi_submissions_phase8_2_latest_submitted_version'
  ) THEN
    ALTER TABLE agi_submissions
      ADD CONSTRAINT fk_agi_submissions_phase8_2_latest_submitted_version
      FOREIGN KEY (latest_submitted_version_id) REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_agi_submission_versions_phase8_2_submission
  ON agi_submission_versions (agi_submission_id, version_no, state, created_at);

CREATE TABLE IF NOT EXISTS agi_employees (
  agi_employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agi_submission_version_id UUID NOT NULL REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  person_identifier_type TEXT NOT NULL,
  person_identifier TEXT,
  protected_identity BOOLEAN NOT NULL DEFAULT FALSE,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_agi_employees_phase8_2_version
  ON agi_employees (agi_submission_version_id, employee_id, created_at);

CREATE TABLE IF NOT EXISTS agi_employee_lines (
  agi_employee_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agi_employee_id UUID NOT NULL REFERENCES agi_employees(agi_employee_id) ON DELETE CASCADE,
  agi_submission_version_id UUID NOT NULL REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  source_pay_run_id UUID REFERENCES pay_runs(pay_run_id) ON DELETE SET NULL,
  source_pay_run_line_id UUID REFERENCES pay_run_lines(pay_run_line_id) ON DELETE SET NULL,
  pay_item_code TEXT NOT NULL,
  agi_mapping_code TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  directional_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_agi_employee_lines_phase8_2_employee
  ON agi_employee_lines (agi_employee_id, agi_submission_version_id, created_at);

CREATE TABLE IF NOT EXISTS agi_absence_payloads (
  agi_absence_payload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agi_submission_version_id UUID NOT NULL REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE CASCADE,
  agi_employee_id UUID NOT NULL REFERENCES agi_employees(agi_employee_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  employment_id UUID REFERENCES employments(employment_id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  reporting_period TEXT NOT NULL,
  work_date DATE NOT NULL,
  extent_percent NUMERIC(8, 4),
  extent_hours NUMERIC(18, 4),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_agi_absence_payloads_phase8_2_version
  ON agi_absence_payloads (agi_submission_version_id, employment_id, work_date);

CREATE TABLE IF NOT EXISTS agi_receipts (
  agi_receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agi_submission_version_id UUID NOT NULL REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  receipt_status TEXT NOT NULL,
  receipt_code TEXT NOT NULL,
  message TEXT,
  received_by_actor_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_agi_receipts_phase8_2_status'
  ) THEN
    ALTER TABLE agi_receipts
      ADD CONSTRAINT ck_agi_receipts_phase8_2_status
      CHECK (receipt_status IN ('accepted', 'partially_rejected', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_agi_receipts_phase8_2_version
  ON agi_receipts (agi_submission_version_id, receipt_status, received_at);

CREATE TABLE IF NOT EXISTS agi_errors (
  agi_error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agi_submission_version_id UUID NOT NULL REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  agi_receipt_id UUID REFERENCES agi_receipts(agi_receipt_id) ON DELETE SET NULL,
  error_code TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_agi_errors_phase8_2_severity'
  ) THEN
    ALTER TABLE agi_errors
      ADD CONSTRAINT ck_agi_errors_phase8_2_severity
      CHECK (severity IN ('warning', 'error'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_agi_errors_phase8_2_version
  ON agi_errors (agi_submission_version_id, severity, created_at);

CREATE TABLE IF NOT EXISTS agi_signatures (
  agi_signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agi_submission_version_id UUID NOT NULL REFERENCES agi_submission_versions(agi_submission_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  signed_by_actor_id TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_ref TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_agi_signatures_phase8_2_version
  ON agi_signatures (agi_submission_version_id, signed_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321210000_phase8_payroll_tax_agi')
ON CONFLICT (migration_id) DO NOTHING;
