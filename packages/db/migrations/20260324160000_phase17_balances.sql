CREATE TABLE IF NOT EXISTS balance_types (
  balance_type_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  balance_type_code TEXT NOT NULL,
  label TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  negative_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  minimum_balance NUMERIC(18,4) NULL,
  maximum_balance NUMERIC(18,4) NULL,
  carry_forward_mode_code TEXT NOT NULL,
  carry_forward_cap_quantity NUMERIC(18,4) NULL,
  expiry_mode_code TEXT NOT NULL,
  expiry_days INTEGER NULL,
  expiry_month_day TEXT NULL,
  expiry_year_offset INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_balance_types_company_code UNIQUE (company_id, balance_type_code)
);

CREATE TABLE IF NOT EXISTS balance_accounts (
  balance_account_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  balance_type_id TEXT NOT NULL REFERENCES balance_types(balance_type_id),
  balance_type_code TEXT NOT NULL,
  owner_type_code TEXT NOT NULL,
  employee_id TEXT NULL,
  employment_id TEXT NULL,
  status TEXT NOT NULL,
  opened_on DATE NOT NULL,
  closed_on DATE NULL,
  external_reference TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_balance_accounts_owner
  ON balance_accounts (company_id, balance_type_code, owner_type_code, COALESCE(employee_id, ''), COALESCE(employment_id, ''));

CREATE TABLE IF NOT EXISTS balance_transactions (
  balance_transaction_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  balance_account_id TEXT NOT NULL REFERENCES balance_accounts(balance_account_id),
  balance_type_id TEXT NOT NULL REFERENCES balance_types(balance_type_id),
  balance_type_code TEXT NOT NULL,
  owner_type_code TEXT NOT NULL,
  employee_id TEXT NULL,
  employment_id TEXT NULL,
  effective_date DATE NOT NULL,
  transaction_type_code TEXT NOT NULL,
  quantity_delta NUMERIC(18,4) NOT NULL,
  quantity_after NUMERIC(18,4) NOT NULL,
  unit_code TEXT NOT NULL,
  source_domain_code TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  source_reference TEXT NULL,
  idempotency_key TEXT NULL,
  explanation TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_balance_transactions_idempotency
  ON balance_transactions (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_balance_transactions_account_date
  ON balance_transactions (balance_account_id, effective_date, created_at);

CREATE TABLE IF NOT EXISTS balance_carry_forward_runs (
  balance_carry_forward_run_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  source_date DATE NOT NULL,
  target_date DATE NOT NULL,
  balance_type_code TEXT NULL,
  processed_count INTEGER NOT NULL DEFAULT 0,
  processed_items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_balance_carry_forward_runs_idempotency
  ON balance_carry_forward_runs (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS balance_expiry_runs (
  balance_expiry_run_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  run_date DATE NOT NULL,
  balance_type_code TEXT NULL,
  processed_count INTEGER NOT NULL DEFAULT 0,
  processed_items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_balance_expiry_runs_idempotency
  ON balance_expiry_runs (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324160000_phase17_balances')
ON CONFLICT (migration_id) DO NOTHING;
