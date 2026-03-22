ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_no TEXT,
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS given_name TEXT,
  ADD COLUMN IF NOT EXISTS family_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS identity_type TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS identity_value_masked TEXT,
  ADD COLUMN IF NOT EXISTS protected_identity BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS work_email TEXT,
  ADD COLUMN IF NOT EXISTS private_email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'SE',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE employees
SET
  employee_no = COALESCE(employee_no, employee_number, 'EMP' || UPPER(SUBSTRING(REPLACE(employee_id::text, '-', '') FROM 1 FOR 8))),
  employee_number = COALESCE(employee_number, employee_no, 'EMP' || UPPER(SUBSTRING(REPLACE(employee_id::text, '-', '') FROM 1 FOR 8))),
  given_name = COALESCE(given_name, display_name),
  family_name = COALESCE(family_name, display_name),
  identity_type = COALESCE(identity_type, 'other'),
  protected_identity = COALESCE(protected_identity, FALSE),
  country_code = COALESCE(country_code, 'SE'),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE employee_no IS NULL
   OR employee_number IS NULL
   OR given_name IS NULL
   OR family_name IS NULL
   OR identity_type IS NULL
   OR protected_identity IS NULL
   OR country_code IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employees_phase7_1_identity_type'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT ck_employees_phase7_1_identity_type
      CHECK (identity_type IN ('personnummer', 'samordningsnummer', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employees_phase7_1_country_code'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT ck_employees_phase7_1_country_code
      CHECK (country_code ~ '^[A-Z]{2}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_employees_phase7_1_employee_no
  ON employees (company_id, employee_no)
  WHERE employee_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_employees_phase7_1_identity
  ON employees (company_id, identity_type, identity_value_masked)
  WHERE identity_value_masked IS NOT NULL;

ALTER TABLE employments
  ADD COLUMN IF NOT EXISTS employment_no TEXT,
  ADD COLUMN IF NOT EXISTS employment_type_code TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS department_code TEXT,
  ADD COLUMN IF NOT EXISTS pay_model_code TEXT,
  ADD COLUMN IF NOT EXISTS schedule_template_code TEXT,
  ADD COLUMN IF NOT EXISTS starts_on DATE,
  ADD COLUMN IF NOT EXISTS ends_on DATE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE employments
SET
  employment_no = COALESCE(employment_no, 'EMPL' || UPPER(SUBSTRING(REPLACE(employment_id::text, '-', '') FROM 1 FOR 8))),
  employment_type_code = COALESCE(employment_type_code, 'legacy'),
  job_title = COALESCE(job_title, 'Legacy employment'),
  pay_model_code = COALESCE(pay_model_code, 'legacy'),
  start_date = COALESCE(start_date, starts_on, CURRENT_DATE),
  end_date = COALESCE(end_date, ends_on),
  starts_on = COALESCE(starts_on, start_date, CURRENT_DATE),
  ends_on = COALESCE(ends_on, end_date),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE employment_no IS NULL
   OR employment_type_code IS NULL
   OR job_title IS NULL
   OR pay_model_code IS NULL
   OR start_date IS NULL
   OR starts_on IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employments_phase7_1_dates'
  ) THEN
    ALTER TABLE employments
      ADD CONSTRAINT ck_employments_phase7_1_dates
      CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_employments_phase7_1_no
  ON employments (company_id, employment_no)
  WHERE employment_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_employments_phase7_1_employee
  ON employments (company_id, employee_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS employment_contracts (
  employment_contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  contract_version INTEGER NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  salary_model_code TEXT NOT NULL,
  monthly_salary NUMERIC(18, 2),
  hourly_rate NUMERIC(18, 2),
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  collective_agreement_code TEXT,
  salary_revision_reason TEXT,
  terms_document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employment_id, contract_version)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employment_contracts_phase7_1_dates'
  ) THEN
    ALTER TABLE employment_contracts
      ADD CONSTRAINT ck_employment_contracts_phase7_1_dates
      CHECK (valid_to IS NULL OR valid_to >= valid_from);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employment_contracts_phase7_1_values'
  ) THEN
    ALTER TABLE employment_contracts
      ADD CONSTRAINT ck_employment_contracts_phase7_1_values
      CHECK (
        (monthly_salary IS NULL OR monthly_salary >= 0)
        AND (hourly_rate IS NULL OR hourly_rate >= 0)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_employment_contracts_phase7_1_employment
  ON employment_contracts (company_id, employment_id, contract_version);

CREATE TABLE IF NOT EXISTS employment_manager_assignments (
  employment_manager_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  manager_employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE RESTRICT,
  manager_employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
  valid_from DATE NOT NULL,
  valid_to DATE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employment_manager_assignments_phase7_1_dates'
  ) THEN
    ALTER TABLE employment_manager_assignments
      ADD CONSTRAINT ck_employment_manager_assignments_phase7_1_dates
      CHECK (valid_to IS NULL OR valid_to >= valid_from);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employment_manager_assignments_phase7_1_self'
  ) THEN
    ALTER TABLE employment_manager_assignments
      ADD CONSTRAINT ck_employment_manager_assignments_phase7_1_self
      CHECK (employment_id <> manager_employment_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_employment_manager_assignments_phase7_1_employment
  ON employment_manager_assignments (company_id, employment_id, valid_from);

CREATE TABLE IF NOT EXISTS employee_bank_accounts (
  employee_bank_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  payout_method TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'SE',
  clearing_number TEXT,
  account_number TEXT,
  bankgiro TEXT,
  plusgiro TEXT,
  iban TEXT,
  bic TEXT,
  bank_name TEXT,
  masked_account_display TEXT NOT NULL,
  primary_account BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employee_bank_accounts_phase7_1_method'
  ) THEN
    ALTER TABLE employee_bank_accounts
      ADD CONSTRAINT ck_employee_bank_accounts_phase7_1_method
      CHECK (payout_method IN ('domestic_account', 'bankgiro', 'plusgiro', 'iban'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_employee_bank_accounts_phase7_1_country'
  ) THEN
    ALTER TABLE employee_bank_accounts
      ADD CONSTRAINT ck_employee_bank_accounts_phase7_1_country
      CHECK (country_code ~ '^[A-Z]{2}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_bank_accounts_phase7_1_primary
  ON employee_bank_accounts (employee_id)
  WHERE primary_account = TRUE AND active = TRUE;

CREATE INDEX IF NOT EXISTS ix_employee_bank_accounts_phase7_1_employee
  ON employee_bank_accounts (company_id, employee_id, primary_account, created_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321170000_phase7_hr_master')
ON CONFLICT (migration_id) DO NOTHING;
