ALTER TABLE accounting_periods
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS lock_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS locked_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;

UPDATE accounting_periods
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_accounting_periods_phase3_2_status'
  ) THEN
    ALTER TABLE accounting_periods
      ADD CONSTRAINT ck_accounting_periods_phase3_2_status
      CHECK (status IN ('open', 'soft_locked', 'hard_closed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ledger_dimension_values (
  dimension_value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  dimension_key TEXT NOT NULL,
  dimension_code TEXT NOT NULL,
  dimension_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, dimension_key, dimension_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ledger_dimension_values_dimension_key'
  ) THEN
    ALTER TABLE ledger_dimension_values
      ADD CONSTRAINT ck_ledger_dimension_values_dimension_key
      CHECK (dimension_key IN ('projectId', 'costCenterCode', 'businessAreaCode'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ledger_dimension_values_status'
  ) THEN
    ALTER TABLE ledger_dimension_values
      ADD CONSTRAINT ck_ledger_dimension_values_status
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ledger_dimension_values_company_dimension
  ON ledger_dimension_values (company_id, dimension_key, status);

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS correction_of_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id),
  ADD COLUMN IF NOT EXISTS correction_key TEXT,
  ADD COLUMN IF NOT EXISTS correction_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_journal_entries_phase3_2_correction_type'
  ) THEN
    ALTER TABLE journal_entries
      ADD CONSTRAINT ck_journal_entries_phase3_2_correction_type
      CHECK (
        correction_type IS NULL
        OR correction_type IN ('delta', 'full_reversal', 'reversal_and_rebook')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_entries_company_correction_key
  ON journal_entries (company_id, correction_key)
  WHERE correction_key IS NOT NULL;
