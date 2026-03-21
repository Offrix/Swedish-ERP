ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversal_of_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id),
  ADD COLUMN IF NOT EXISTS reversed_by_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id);

ALTER TABLE journal_lines
  ADD COLUMN IF NOT EXISTS line_number INTEGER,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18, 8);

WITH ranked_lines AS (
  SELECT
    journal_line_id,
    ROW_NUMBER() OVER (PARTITION BY journal_entry_id ORDER BY created_at, journal_line_id) AS ranked_line_number
  FROM journal_lines
)
UPDATE journal_lines
SET line_number = ranked_lines.ranked_line_number
FROM ranked_lines
WHERE journal_lines.journal_line_id = ranked_lines.journal_line_id
  AND journal_lines.line_number IS NULL;

ALTER TABLE journal_lines
  ALTER COLUMN line_number SET DEFAULT 1;

UPDATE journal_lines
SET line_number = 1
WHERE line_number IS NULL;

ALTER TABLE journal_lines
  ALTER COLUMN line_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_journal_entries_phase3_status'
  ) THEN
    ALTER TABLE journal_entries
      ADD CONSTRAINT ck_journal_entries_phase3_status
      CHECK (status IN ('draft', 'validated', 'posted', 'reversed', 'locked_by_period'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_journal_lines_phase3_non_negative'
  ) THEN
    ALTER TABLE journal_lines
      ADD CONSTRAINT ck_journal_lines_phase3_non_negative
      CHECK (debit_amount >= 0 AND credit_amount >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_journal_lines_phase3_single_sided'
  ) THEN
    ALTER TABLE journal_lines
      ADD CONSTRAINT ck_journal_lines_phase3_single_sided
      CHECK (
        (debit_amount > 0 AND credit_amount = 0)
        OR (credit_amount > 0 AND debit_amount = 0)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_entries_company_idempotency_key
  ON journal_entries (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_journal_entries_company_source
  ON journal_entries (company_id, source_type, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_lines_entry_line_number
  ON journal_lines (journal_entry_id, line_number);
