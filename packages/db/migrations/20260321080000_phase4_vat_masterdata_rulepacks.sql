CREATE TABLE IF NOT EXISTS rule_packs (
  rule_pack_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  version TEXT NOT NULL,
  checksum TEXT NOT NULL,
  source_snapshot_date DATE NOT NULL,
  semantic_change_summary TEXT NOT NULL,
  machine_readable_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  human_readable_explanation_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_vectors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  migration_notes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain, jurisdiction, effective_from, version)
);

CREATE INDEX IF NOT EXISTS ix_rule_packs_domain_jurisdiction_effective
  ON rule_packs (domain, jurisdiction, effective_from DESC, effective_to, version DESC);

CREATE TABLE IF NOT EXISTS vat_codes (
  vat_code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  vat_code TEXT NOT NULL,
  label TEXT NOT NULL,
  vat_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
  rate_type TEXT NOT NULL,
  declaration_box_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  booking_template_code TEXT NOT NULL,
  active_flag BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, vat_code, valid_from)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_vat_codes_phase4_1_rate_type'
  ) THEN
    ALTER TABLE vat_codes
      ADD CONSTRAINT ck_vat_codes_phase4_1_rate_type
      CHECK (rate_type IN ('standard_or_special', 'zero_or_exempt'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_vat_codes_company_code_active
  ON vat_codes (company_id, vat_code, active_flag, valid_from DESC);

CREATE TABLE IF NOT EXISTS vat_review_queue_items (
  vat_review_queue_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  inputs_hash TEXT NOT NULL,
  rule_pack_id TEXT NOT NULL REFERENCES rule_packs(rule_pack_id),
  effective_date DATE NOT NULL,
  review_reason_code TEXT NOT NULL,
  review_queue_code TEXT NOT NULL,
  vat_code_candidate TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_vat_review_queue_items_phase4_1_status'
  ) THEN
    ALTER TABLE vat_review_queue_items
      ADD CONSTRAINT ck_vat_review_queue_items_phase4_1_status
      CHECK (status IN ('open', 'resolved', 'waived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_vat_review_queue_items_company_status
  ON vat_review_queue_items (company_id, status, created_at);

ALTER TABLE vat_decisions
  ADD COLUMN IF NOT EXISTS vat_code TEXT,
  ADD COLUMN IF NOT EXISTS rule_pack_version TEXT,
  ADD COLUMN IF NOT EXISTS source_snapshot_date DATE,
  ADD COLUMN IF NOT EXISTS inputs_hash TEXT,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'decided',
  ADD COLUMN IF NOT EXISTS declaration_box_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_template_code TEXT,
  ADD COLUMN IF NOT EXISTS outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_queue_code TEXT,
  ADD COLUMN IF NOT EXISTS review_queue_item_id UUID REFERENCES vat_review_queue_items(vat_review_queue_item_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT 'system';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_vat_decisions_phase4_1_rule_pack'
  ) THEN
    ALTER TABLE vat_decisions
      ADD CONSTRAINT fk_vat_decisions_phase4_1_rule_pack
      FOREIGN KEY (rule_pack_id) REFERENCES rule_packs(rule_pack_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_vat_decisions_phase4_1_status'
  ) THEN
    ALTER TABLE vat_decisions
      ADD CONSTRAINT ck_vat_decisions_phase4_1_status
      CHECK (status IN ('decided', 'review_required'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_vat_decisions_company_replay
  ON vat_decisions (company_id, source_type, source_id, rule_pack_id, inputs_hash);

CREATE INDEX IF NOT EXISTS ix_vat_decisions_company_effective
  ON vat_decisions (company_id, effective_date, status, created_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321080000_phase4_vat_masterdata_rulepacks')
ON CONFLICT (migration_id) DO NOTHING;
