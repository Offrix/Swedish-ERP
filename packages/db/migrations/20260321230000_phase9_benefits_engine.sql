CREATE TABLE IF NOT EXISTS benefit_catalog (
  benefit_catalog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  benefit_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  default_ledger_account_code TEXT NOT NULL,
  default_agi_mapping_code TEXT NOT NULL DEFAULT 'taxable_benefit',
  default_pay_item_code TEXT NOT NULL DEFAULT 'BENEFIT',
  supported_valuation_methods_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, benefit_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_benefit_catalog_phase9_1_code'
  ) THEN
    ALTER TABLE benefit_catalog
      ADD CONSTRAINT ck_benefit_catalog_phase9_1_code
      CHECK (benefit_code IN (
        'CAR_BENEFIT',
        'FUEL_BENEFIT',
        'WELLNESS_ALLOWANCE',
        'GIFT',
        'MEAL_BENEFIT',
        'HEALTH_INSURANCE'
      ));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS benefit_events (
  benefit_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  benefit_catalog_id UUID REFERENCES benefit_catalog(benefit_catalog_id) ON DELETE SET NULL,
  benefit_code TEXT NOT NULL,
  reporting_period TEXT NOT NULL,
  tax_year TEXT NOT NULL,
  occurred_on DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  source_type TEXT NOT NULL,
  source_id TEXT,
  payroll_run_id UUID REFERENCES pay_runs(pay_run_id) ON DELETE SET NULL,
  supporting_document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE benefit_events
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(employee_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS benefit_catalog_id UUID REFERENCES benefit_catalog(benefit_catalog_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reporting_period TEXT,
  ADD COLUMN IF NOT EXISTS tax_year TEXT,
  ADD COLUMN IF NOT EXISTS occurred_on DATE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS payroll_run_id UUID REFERENCES pay_runs(pay_run_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supporting_document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dimension_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE benefit_events
  ALTER COLUMN dimension_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN payload_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_benefit_events_phase9_1_code'
  ) THEN
    ALTER TABLE benefit_events
      ADD CONSTRAINT ck_benefit_events_phase9_1_code
      CHECK (benefit_code IN (
        'CAR_BENEFIT',
        'FUEL_BENEFIT',
        'WELLNESS_ALLOWANCE',
        'GIFT',
        'MEAL_BENEFIT',
        'HEALTH_INSURANCE'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_benefit_events_phase9_1_dates'
  ) THEN
    ALTER TABLE benefit_events
      ADD CONSTRAINT ck_benefit_events_phase9_1_dates
      CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_benefit_events_phase9_1_company_period
  ON benefit_events (company_id, reporting_period, benefit_code, created_at);

CREATE INDEX IF NOT EXISTS ix_benefit_events_phase9_1_employment
  ON benefit_events (employment_id, reporting_period, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_benefit_events_phase9_1_source
  ON benefit_events (company_id, employment_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS benefit_valuations (
  benefit_valuation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_event_id UUID NOT NULL REFERENCES benefit_events(benefit_event_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  benefit_code TEXT NOT NULL,
  reporting_period TEXT NOT NULL,
  tax_year TEXT NOT NULL,
  valuation_method TEXT NOT NULL,
  employer_paid_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  market_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  taxable_value_before_offsets NUMERIC(18, 2) NOT NULL DEFAULT 0,
  taxable_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_free_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  employee_paid_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_deduction_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  agi_mapping_code TEXT NOT NULL DEFAULT 'not_reported',
  ledger_account_code TEXT NOT NULL,
  taxability TEXT NOT NULL,
  cash_salary_required_for_withholding BOOLEAN NOT NULL DEFAULT FALSE,
  decision_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (benefit_event_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_benefit_valuations_phase9_1_taxability'
  ) THEN
    ALTER TABLE benefit_valuations
      ADD CONSTRAINT ck_benefit_valuations_phase9_1_taxability
      CHECK (taxability IN ('tax_free', 'partially_taxable', 'taxable'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_benefit_valuations_phase9_1_company_period
  ON benefit_valuations (company_id, reporting_period, benefit_code, created_at);

CREATE TABLE IF NOT EXISTS benefit_deductions (
  benefit_deduction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_event_id UUID NOT NULL REFERENCES benefit_events(benefit_event_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_benefit_deductions_phase9_1_type'
  ) THEN
    ALTER TABLE benefit_deductions
      ADD CONSTRAINT ck_benefit_deductions_phase9_1_type
      CHECK (deduction_type IN ('employee_payment', 'net_deduction'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_benefit_deductions_phase9_1_event
  ON benefit_deductions (benefit_event_id, deduction_type, created_at);

CREATE TABLE IF NOT EXISTS benefit_documents (
  benefit_document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_event_id UUID NOT NULL REFERENCES benefit_events(benefit_event_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE RESTRICT,
  linked_by_actor_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (benefit_event_id, document_id)
);

CREATE INDEX IF NOT EXISTS ix_benefit_documents_phase9_1_event
  ON benefit_documents (benefit_event_id, linked_at);

CREATE TABLE IF NOT EXISTS benefit_posting_intents (
  benefit_posting_intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_event_id UUID NOT NULL REFERENCES benefit_events(benefit_event_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  processing_step INTEGER NOT NULL,
  intent_type TEXT NOT NULL,
  ledger_account_code TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  payroll_line_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_benefit_posting_intents_phase9_1_step'
  ) THEN
    ALTER TABLE benefit_posting_intents
      ADD CONSTRAINT ck_benefit_posting_intents_phase9_1_step
      CHECK (processing_step IN (6, 13));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_benefit_posting_intents_phase9_1_event
  ON benefit_posting_intents (benefit_event_id, processing_step, created_at);

CREATE TABLE IF NOT EXISTS benefit_agi_mappings (
  benefit_agi_mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_event_id UUID NOT NULL REFERENCES benefit_events(benefit_event_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  agi_mapping_code TEXT NOT NULL,
  reportable_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_benefit_agi_mappings_phase9_1_company_period
  ON benefit_agi_mappings (company_id, reporting_period, agi_mapping_code, created_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321230000_phase9_benefits_engine')
ON CONFLICT (migration_id) DO NOTHING;
