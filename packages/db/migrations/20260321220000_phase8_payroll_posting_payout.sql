ALTER TABLE pay_run_lines
  ADD COLUMN IF NOT EXISTS dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE pay_runs
  ADD COLUMN IF NOT EXISTS posting_status TEXT,
  ADD COLUMN IF NOT EXISTS posting_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_batch_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_runs_phase8_3_posting_status'
  ) THEN
    ALTER TABLE pay_runs
      ADD CONSTRAINT ck_pay_runs_phase8_3_posting_status
      CHECK (posting_status IS NULL OR posting_status IN ('draft', 'posted'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_pay_runs_phase8_3_payout_status'
  ) THEN
    ALTER TABLE pay_runs
      ADD CONSTRAINT ck_pay_runs_phase8_3_payout_status
      CHECK (payout_batch_status IS NULL OR payout_batch_status IN ('exported', 'matched'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payroll_postings (
  payroll_posting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  pay_run_id UUID NOT NULL REFERENCES pay_runs(pay_run_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  payload_hash TEXT NOT NULL,
  source_snapshot_hash TEXT NOT NULL,
  totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  journal_lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, pay_run_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_payroll_postings_phase8_3_status'
  ) THEN
    ALTER TABLE payroll_postings
      ADD CONSTRAINT ck_payroll_postings_phase8_3_status
      CHECK (status IN ('draft', 'posted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_payroll_postings_phase8_3_company_period
  ON payroll_postings (company_id, reporting_period, created_at);

CREATE TABLE IF NOT EXISTS payroll_posting_lines (
  payroll_posting_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_posting_id UUID NOT NULL REFERENCES payroll_postings(payroll_posting_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  debit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payroll_posting_lines_phase8_3_posting
  ON payroll_posting_lines (payroll_posting_id, account_number, created_at);

CREATE TABLE IF NOT EXISTS payroll_payout_batches (
  payroll_payout_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  pay_run_id UUID NOT NULL REFERENCES pay_runs(pay_run_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(bank_account_id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'exported',
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL,
  export_file_name TEXT NOT NULL,
  export_payload TEXT NOT NULL,
  export_payload_hash TEXT NOT NULL,
  matched_at TIMESTAMPTZ,
  matched_by_actor_id TEXT,
  matched_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  bank_event_id TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, pay_run_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_payroll_payout_batches_phase8_3_status'
  ) THEN
    ALTER TABLE payroll_payout_batches
      ADD CONSTRAINT ck_payroll_payout_batches_phase8_3_status
      CHECK (status IN ('exported', 'matched'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_payroll_payout_batches_phase8_3_company_period
  ON payroll_payout_batches (company_id, reporting_period, created_at);

CREATE TABLE IF NOT EXISTS payroll_payout_batch_lines (
  payroll_payout_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_payout_batch_id UUID NOT NULL REFERENCES payroll_payout_batches(payroll_payout_batch_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  employee_bank_account_id UUID REFERENCES employee_bank_accounts(employee_bank_account_id) ON DELETE SET NULL,
  payout_method TEXT,
  payee_name TEXT NOT NULL,
  account_target TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  payment_reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payroll_payout_batch_lines_phase8_3_batch
  ON payroll_payout_batch_lines (payroll_payout_batch_id, employee_id, created_at);

CREATE TABLE IF NOT EXISTS vacation_liability_snapshots (
  vacation_liability_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  pay_run_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  employee_snapshots_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, reporting_period, snapshot_hash)
);

CREATE INDEX IF NOT EXISTS ix_vacation_liability_snapshots_phase8_3_company_period
  ON vacation_liability_snapshots (company_id, reporting_period, created_at);

ALTER TABLE pay_runs
  ADD COLUMN IF NOT EXISTS payout_batch_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_pay_runs_phase8_3_payout_batch'
  ) THEN
    ALTER TABLE pay_runs
      ADD CONSTRAINT fk_pay_runs_phase8_3_payout_batch
      FOREIGN KEY (payout_batch_id)
      REFERENCES payroll_payout_batches(payroll_payout_batch_id)
      ON DELETE SET NULL;
  END IF;
END $$;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321220000_phase8_payroll_posting_payout')
ON CONFLICT (migration_id) DO NOTHING;
