CREATE TABLE IF NOT EXISTS pay_item_definitions (
  pay_item_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  pay_item_code TEXT NOT NULL,
  pay_item_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  calculation_basis TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  compensation_bucket TEXT NOT NULL,
  default_unit_amount NUMERIC(18, 2),
  default_rate_factor NUMERIC(18, 4),
  tax_treatment_code TEXT NOT NULL,
  employer_contribution_treatment_code TEXT NOT NULL,
  agi_mapping_code TEXT NOT NULL,
  ledger_account_code TEXT NOT NULL,
  default_dimensions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  affects_vacation_basis BOOLEAN NOT NULL DEFAULT FALSE,
  affects_pension_basis BOOLEAN NOT NULL DEFAULT FALSE,
  included_in_net_pay BOOLEAN NOT NULL DEFAULT TRUE,
  reporting_only BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, pay_item_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_item_definitions_phase8_1_basis'
  ) THEN
    ALTER TABLE pay_item_definitions
      ADD CONSTRAINT ck_pay_item_definitions_phase8_1_basis
      CHECK (calculation_basis IN ('contract_monthly_salary', 'contract_hourly_rate', 'configured_unit_rate', 'manual_amount', 'reporting_only'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_item_definitions_phase8_1_bucket'
  ) THEN
    ALTER TABLE pay_item_definitions
      ADD CONSTRAINT ck_pay_item_definitions_phase8_1_bucket
      CHECK (compensation_bucket IN ('gross_addition', 'gross_deduction', 'net_deduction', 'reporting_only'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_pay_item_definitions_phase8_1_company_active
  ON pay_item_definitions (company_id, active, pay_item_code);

CREATE TABLE IF NOT EXISTS pay_calendars (
  pay_calendar_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  pay_calendar_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  frequency_code TEXT NOT NULL,
  cutoff_day INTEGER NOT NULL,
  pay_day INTEGER NOT NULL,
  timezone TEXT NOT NULL,
  default_currency_code TEXT NOT NULL DEFAULT 'SEK',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, pay_calendar_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_calendars_phase8_1_values'
  ) THEN
    ALTER TABLE pay_calendars
      ADD CONSTRAINT ck_pay_calendars_phase8_1_values
      CHECK (
        frequency_code IN ('monthly')
        AND cutoff_day BETWEEN 1 AND 31
        AND pay_day BETWEEN 1 AND 31
        AND default_currency_code ~ '^[A-Z]{3}$'
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_pay_calendars_phase8_1_company_active
  ON pay_calendars (company_id, active, pay_calendar_code);

ALTER TABLE pay_runs
  ADD COLUMN IF NOT EXISTS pay_calendar_id UUID REFERENCES pay_calendars(pay_calendar_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reporting_period TEXT,
  ADD COLUMN IF NOT EXISTS period_starts_on DATE,
  ADD COLUMN IF NOT EXISTS period_ends_on DATE,
  ADD COLUMN IF NOT EXISTS pay_date DATE,
  ADD COLUMN IF NOT EXISTS run_type TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS source_snapshot_hash TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS warning_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS calculation_steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE pay_runs
SET
  reporting_period = COALESCE(reporting_period, REPLACE(payroll_period, '-', '')),
  period_starts_on = COALESCE(period_starts_on, to_date(REPLACE(COALESCE(reporting_period, payroll_period), '-', '') || '01', 'YYYYMMDD')),
  period_ends_on = COALESCE(period_ends_on, (date_trunc('month', to_date(REPLACE(COALESCE(reporting_period, payroll_period), '-', '') || '01', 'YYYYMMDD')) + interval '1 month - 1 day')::date),
  pay_date = COALESCE(pay_date, (date_trunc('month', to_date(REPLACE(COALESCE(reporting_period, payroll_period), '-', '') || '01', 'YYYYMMDD')) + interval '24 day')::date),
  created_by_actor_id = COALESCE(NULLIF(created_by_actor_id, ''), 'migration'),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE reporting_period IS NULL
   OR period_starts_on IS NULL
   OR period_ends_on IS NULL
   OR pay_date IS NULL
   OR created_by_actor_id IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_runs_phase8_1_run_type'
  ) THEN
    ALTER TABLE pay_runs
      ADD CONSTRAINT ck_pay_runs_phase8_1_run_type
      CHECK (run_type IN ('regular', 'extra', 'correction', 'final'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_runs_phase8_1_status'
  ) THEN
    ALTER TABLE pay_runs
      ADD CONSTRAINT ck_pay_runs_phase8_1_status
      CHECK (status IN ('draft', 'calculated', 'approved'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_pay_runs_phase8_1_company_period
  ON pay_runs (company_id, reporting_period, run_type, status, created_at);

ALTER TABLE pay_run_lines
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pay_item_definition_id UUID REFERENCES pay_item_definitions(pay_item_definition_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pay_item_code TEXT,
  ADD COLUMN IF NOT EXISTS pay_item_type TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS compensation_bucket TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(18, 4),
  ADD COLUMN IF NOT EXISTS unit_code TEXT,
  ADD COLUMN IF NOT EXISTS unit_rate NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS tax_treatment_code TEXT,
  ADD COLUMN IF NOT EXISTS employer_contribution_treatment_code TEXT,
  ADD COLUMN IF NOT EXISTS agi_mapping_code TEXT,
  ADD COLUMN IF NOT EXISTS ledger_account_code TEXT,
  ADD COLUMN IF NOT EXISTS affects_vacation_basis BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS affects_pension_basis BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS included_in_net_pay BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reporting_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS source_period TEXT,
  ADD COLUMN IF NOT EXISTS source_pay_run_id UUID REFERENCES pay_runs(pay_run_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_line_id UUID REFERENCES pay_run_lines(pay_run_line_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calculation_status TEXT NOT NULL DEFAULT 'calculated',
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE pay_run_lines
SET
  pay_item_code = COALESCE(pay_item_code, line_code),
  display_name = COALESCE(display_name, line_code),
  source_type = COALESCE(source_type, 'legacy'),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE pay_item_code IS NULL
   OR display_name IS NULL
   OR source_type IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_run_lines_phase8_1_bucket'
  ) THEN
    ALTER TABLE pay_run_lines
      ADD CONSTRAINT ck_pay_run_lines_phase8_1_bucket
      CHECK (compensation_bucket IS NULL OR compensation_bucket IN ('gross_addition', 'gross_deduction', 'net_deduction', 'reporting_only'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_pay_run_lines_phase8_1_run
  ON pay_run_lines (pay_run_id, employment_id, display_order, created_at);

CREATE TABLE IF NOT EXISTS pay_run_events (
  pay_run_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id UUID NOT NULL REFERENCES pay_runs(pay_run_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  note TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pay_run_events_phase8_1_run
  ON pay_run_events (pay_run_id, recorded_at);

CREATE TABLE IF NOT EXISTS pay_run_payslips (
  payslip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id UUID NOT NULL REFERENCES pay_runs(pay_run_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  snapshot_hash TEXT NOT NULL,
  render_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_actor_id TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regeneration_no INTEGER NOT NULL DEFAULT 0,
  regenerated_at TIMESTAMPTZ,
  regenerated_by_actor_id TEXT,
  UNIQUE (pay_run_id, employment_id)
);

CREATE INDEX IF NOT EXISTS ix_pay_run_payslips_phase8_1_run
  ON pay_run_payslips (pay_run_id, employment_id, generated_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321200000_phase8_payroll_core')
ON CONFLICT (migration_id) DO NOTHING;
