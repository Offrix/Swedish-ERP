ALTER TABLE vat_decisions
  ADD COLUMN IF NOT EXISTS decision_category TEXT,
  ADD COLUMN IF NOT EXISTS invoice_text_requirements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS credit_note_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_vat_decision_id UUID REFERENCES vat_decisions(vat_decision_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS vat_decision_box_amounts (
  vat_decision_box_amount_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vat_decision_id UUID NOT NULL REFERENCES vat_decisions(vat_decision_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  box_code TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  amount_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vat_decision_id, box_code, amount_type)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_vat_decision_box_amounts_phase4_2_type'
  ) THEN
    ALTER TABLE vat_decision_box_amounts
      ADD CONSTRAINT ck_vat_decision_box_amounts_phase4_2_type
      CHECK (amount_type IN ('taxable_base', 'output_vat', 'input_vat'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_vat_decision_box_amounts_company_box
  ON vat_decision_box_amounts (company_id, box_code, created_at);

CREATE TABLE IF NOT EXISTS vat_decision_posting_entries (
  vat_decision_posting_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vat_decision_id UUID NOT NULL REFERENCES vat_decisions(vat_decision_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  entry_code TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  vat_effect TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vat_decision_id, entry_code, direction)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_vat_decision_posting_entries_phase4_2_direction'
  ) THEN
    ALTER TABLE vat_decision_posting_entries
      ADD CONSTRAINT ck_vat_decision_posting_entries_phase4_2_direction
      CHECK (direction IN ('debit', 'credit'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_vat_decision_posting_entries_phase4_2_effect'
  ) THEN
    ALTER TABLE vat_decision_posting_entries
      ADD CONSTRAINT ck_vat_decision_posting_entries_phase4_2_effect
      CHECK (vat_effect IN ('taxable_base', 'output_vat', 'input_vat'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_vat_decision_posting_entries_company_effect
  ON vat_decision_posting_entries (company_id, vat_effect, created_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321090000_phase4_vat_rule_execution')
ON CONFLICT (migration_id) DO NOTHING;
