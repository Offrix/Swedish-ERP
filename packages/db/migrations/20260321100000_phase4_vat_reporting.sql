ALTER TABLE vat_decisions
  ADD COLUMN IF NOT EXISTS transaction_line_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reporting_channel TEXT NOT NULL DEFAULT 'regular_vat_return',
  ADD COLUMN IF NOT EXISTS eu_list_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oss_record_json JSONB,
  ADD COLUMN IF NOT EXISTS ioss_record_json JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_vat_decisions_phase4_3_reporting_channel'
  ) THEN
    ALTER TABLE vat_decisions
      ADD CONSTRAINT ck_vat_decisions_phase4_3_reporting_channel
      CHECK (reporting_channel IN ('regular_vat_return', 'oss', 'ioss'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vat_declaration_runs (
  vat_declaration_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  declaration_box_summary_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  oss_summary_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ioss_summary_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ledger_comparison_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_submission_id UUID REFERENCES vat_declaration_runs(vat_declaration_run_id) ON DELETE SET NULL,
  correction_reason TEXT,
  changed_boxes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  changed_amounts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  signer TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  source_snapshot_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_vat_declaration_runs_company_period
  ON vat_declaration_runs (company_id, from_date, to_date, created_at DESC);

CREATE TABLE IF NOT EXISTS vat_periodic_statement_runs (
  vat_periodic_statement_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  line_count INTEGER NOT NULL DEFAULT 0,
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  previous_submission_id UUID REFERENCES vat_periodic_statement_runs(vat_periodic_statement_run_id) ON DELETE SET NULL,
  correction_reason TEXT,
  source_snapshot_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  generated_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_vat_periodic_statement_runs_company_period
  ON vat_periodic_statement_runs (company_id, from_date, to_date, created_at DESC);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321100000_phase4_vat_reporting')
ON CONFLICT (migration_id) DO NOTHING;
