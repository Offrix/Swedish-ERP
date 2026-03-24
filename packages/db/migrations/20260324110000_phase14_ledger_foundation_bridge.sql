ALTER TABLE accounting_periods
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID,
ADD COLUMN IF NOT EXISTS fiscal_period_id UUID;

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID,
ADD COLUMN IF NOT EXISTS fiscal_period_id UUID,
ADD COLUMN IF NOT EXISTS accounting_method_profile_id UUID;

CREATE INDEX IF NOT EXISTS ix_accounting_periods_company_fiscal_year
  ON accounting_periods (company_id, fiscal_year_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounting_periods_company_fiscal_period
  ON accounting_periods (company_id, fiscal_period_id)
  WHERE fiscal_period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_journal_entries_company_fiscal_year
  ON journal_entries (company_id, fiscal_year_id);

CREATE INDEX IF NOT EXISTS ix_journal_entries_company_fiscal_period
  ON journal_entries (company_id, fiscal_period_id);

CREATE INDEX IF NOT EXISTS ix_journal_entries_company_method_profile
  ON journal_entries (company_id, accounting_method_profile_id);
