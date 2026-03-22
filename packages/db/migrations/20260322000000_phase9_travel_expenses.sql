CREATE TABLE IF NOT EXISTS travel_foreign_allowances (
  travel_foreign_allowance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year TEXT NOT NULL,
  country_name TEXT NOT NULL,
  country_code TEXT,
  amount_sek NUMERIC(18, 2),
  alias_of TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tax_year, country_name)
);

CREATE TABLE IF NOT EXISTS travel_claims (
  travel_claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  purpose TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  home_location TEXT,
  regular_work_location TEXT,
  first_destination TEXT,
  distance_from_home_km NUMERIC(18, 2) NOT NULL DEFAULT 0,
  distance_from_regular_work_km NUMERIC(18, 2) NOT NULL DEFAULT 0,
  requested_allowance_amount NUMERIC(18, 2),
  same_location_days_before_start INTEGER NOT NULL DEFAULT 0,
  lodging_paid_by_employer BOOLEAN NOT NULL DEFAULT FALSE,
  pre_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status TEXT NOT NULL DEFAULT 'submitted',
  source_type TEXT NOT NULL,
  source_id TEXT,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE travel_claims
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(employee_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS employment_id UUID REFERENCES employments(employment_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reporting_period TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS home_location TEXT,
  ADD COLUMN IF NOT EXISTS regular_work_location TEXT,
  ADD COLUMN IF NOT EXISTS first_destination TEXT,
  ADD COLUMN IF NOT EXISTS distance_from_home_km NUMERIC(18, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_from_regular_work_km NUMERIC(18, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requested_allowance_amount NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS same_location_days_before_start INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lodging_paid_by_employer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pre_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS dimension_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE travel_claims
  ALTER COLUMN distance_from_home_km SET DEFAULT 0,
  ALTER COLUMN distance_from_regular_work_km SET DEFAULT 0,
  ALTER COLUMN same_location_days_before_start SET DEFAULT 0,
  ALTER COLUMN lodging_paid_by_employer SET DEFAULT FALSE,
  ALTER COLUMN pre_approved SET DEFAULT FALSE,
  ALTER COLUMN approval_status SET DEFAULT 'submitted',
  ALTER COLUMN dimension_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_travel_claims_phase9_2_dates'
  ) THEN
    ALTER TABLE travel_claims
      ADD CONSTRAINT ck_travel_claims_phase9_2_dates
      CHECK (end_at > start_at);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_travel_claims_phase9_2_status'
  ) THEN
    ALTER TABLE travel_claims
      ADD CONSTRAINT ck_travel_claims_phase9_2_status
      CHECK (approval_status IN ('submitted', 'approved', 'rejected'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_travel_claims_phase9_2_source
  ON travel_claims (company_id, employment_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_travel_claims_phase9_2_company_period
  ON travel_claims (company_id, reporting_period, created_at);

CREATE TABLE IF NOT EXISTS travel_days (
  travel_day_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  travel_date DATE NOT NULL,
  country_name TEXT NOT NULL,
  country_code TEXT,
  location_key TEXT NOT NULL,
  day_classification TEXT NOT NULL,
  reduction_bracket TEXT NOT NULL,
  base_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  meal_reduction_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  meal_reduction_code TEXT NOT NULL,
  statutory_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_travel_days_phase9_2_claim
  ON travel_days (travel_claim_id, travel_date, day_classification);

CREATE TABLE IF NOT EXISTS travel_meal_events (
  travel_meal_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  breakfast_provided BOOLEAN NOT NULL DEFAULT FALSE,
  lunch_provided BOOLEAN NOT NULL DEFAULT FALSE,
  dinner_provided BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_travel_meal_events_phase9_2_claim
  ON travel_meal_events (travel_claim_id, meal_date);

CREATE TABLE IF NOT EXISTS travel_country_segments (
  travel_country_segment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  country_name TEXT NOT NULL,
  country_code TEXT,
  location_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_travel_country_segments_phase9_2_claim
  ON travel_country_segments (travel_claim_id, start_at);

CREATE TABLE IF NOT EXISTS mileage_logs (
  mileage_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  mileage_date DATE NOT NULL,
  vehicle_type TEXT NOT NULL,
  distance_km NUMERIC(18, 2) NOT NULL DEFAULT 0,
  claimed_rate_per_km NUMERIC(18, 2),
  claimed_amount NUMERIC(18, 2),
  employee_paid_all_fuel BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  valuation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mileage_logs
  ADD COLUMN IF NOT EXISTS travel_claim_id UUID REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mileage_date DATE,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(18, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_rate_per_km NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS claimed_amount NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS employee_paid_all_fuel BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS valuation_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE mileage_logs
  ALTER COLUMN distance_km SET DEFAULT 0,
  ALTER COLUMN employee_paid_all_fuel SET DEFAULT TRUE,
  ALTER COLUMN valuation_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_mileage_logs_phase9_2_vehicle'
  ) THEN
    ALTER TABLE mileage_logs
      ADD CONSTRAINT ck_mileage_logs_phase9_2_vehicle
      CHECK (vehicle_type IN ('OWN_CAR', 'BENEFIT_CAR', 'BENEFIT_CAR_ELECTRIC'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_mileage_logs_phase9_2_claim
  ON mileage_logs (travel_claim_id, mileage_date);

CREATE TABLE IF NOT EXISTS expense_receipts (
  expense_receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  expense_type TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency_code TEXT NOT NULL,
  exchange_rate NUMERIC(18, 6) NOT NULL DEFAULT 1,
  document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  has_receipt_support BOOLEAN NOT NULL DEFAULT TRUE,
  valuation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expense_receipts
  ADD COLUMN IF NOT EXISTS travel_claim_id UUID REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS expense_date DATE,
  ADD COLUMN IF NOT EXISTS expense_type TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS currency_code TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18, 6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS has_receipt_support BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS valuation_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE expense_receipts
  ALTER COLUMN exchange_rate SET DEFAULT 1,
  ALTER COLUMN has_receipt_support SET DEFAULT TRUE,
  ALTER COLUMN valuation_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_expense_receipts_phase9_2_payment'
  ) THEN
    ALTER TABLE expense_receipts
      ADD CONSTRAINT ck_expense_receipts_phase9_2_payment
      CHECK (payment_method IN ('private_card', 'company_card', 'cash'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_expense_receipts_phase9_2_claim
  ON expense_receipts (travel_claim_id, expense_date, payment_method);

CREATE TABLE IF NOT EXISTS travel_advances (
  travel_advance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  advance_date DATE NOT NULL,
  amount_sek NUMERIC(18, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_travel_advances_phase9_2_claim
  ON travel_advances (travel_claim_id, advance_date);

CREATE TABLE IF NOT EXISTS travel_valuations (
  travel_valuation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL UNIQUE REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  tax_year TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  travel_type TEXT NOT NULL,
  statutory_tax_free_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  statutory_tax_free_max_allowance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  requested_allowance_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_free_travel_allowance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  taxable_travel_allowance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_free_mileage NUMERIC(18, 2) NOT NULL DEFAULT 0,
  taxable_mileage NUMERIC(18, 2) NOT NULL DEFAULT 0,
  expense_reimbursement_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  company_card_expense_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  travel_advance_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_travel_payout_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  advance_net_deduction_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  source_snapshot_hash TEXT NOT NULL,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_travel_valuations_phase9_2_type'
  ) THEN
    ALTER TABLE travel_valuations
      ADD CONSTRAINT ck_travel_valuations_phase9_2_type
      CHECK (travel_type IN ('domestic', 'foreign'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_travel_valuations_phase9_2_company_period
  ON travel_valuations (company_id, reporting_period, created_at);

CREATE TABLE IF NOT EXISTS travel_posting_intents (
  travel_posting_intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_claim_id UUID NOT NULL REFERENCES travel_claims(travel_claim_id) ON DELETE CASCADE,
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
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_travel_posting_intents_phase9_2_step'
  ) THEN
    ALTER TABLE travel_posting_intents
      ADD CONSTRAINT ck_travel_posting_intents_phase9_2_step
      CHECK (processing_step IN (7, 13));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_travel_posting_intents_phase9_2_claim
  ON travel_posting_intents (travel_claim_id, processing_step, created_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322000000_phase9_travel_expenses')
ON CONFLICT (migration_id) DO NOTHING;
