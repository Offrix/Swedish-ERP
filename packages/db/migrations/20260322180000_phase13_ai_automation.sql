CREATE TABLE IF NOT EXISTS automation_rule_packs (
  rule_pack_id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  version TEXT NOT NULL,
  checksum TEXT NOT NULL,
  source_snapshot_date DATE NOT NULL,
  semantic_change_summary TEXT NOT NULL,
  machine_readable_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  human_readable_explanation JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_vectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  migration_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'proposed',
  actor_id TEXT NOT NULL,
  confidence NUMERIC(6,4) NOT NULL,
  effective_date DATE NOT NULL,
  rule_pack_id UUID REFERENCES automation_rule_packs(rule_pack_id) ON DELETE SET NULL,
  inputs_hash TEXT NOT NULL,
  outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  needs_manual_review BOOLEAN NOT NULL DEFAULT TRUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_overrides (
  override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES automation_decisions(decision_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  override_reason_code TEXT NOT NULL,
  accepted_outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  overridden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322180000_phase13_ai_automation')
ON CONFLICT (migration_id) DO NOTHING;
