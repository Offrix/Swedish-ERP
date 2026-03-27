CREATE TABLE IF NOT EXISTS migration_mapping_sets (
  mapping_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  domain_scope TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  status TEXT NOT NULL,
  mappings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  effective_for_batches_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_import_batches (
  import_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  batch_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  hash TEXT NOT NULL,
  scope_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  mapping_set_id UUID NOT NULL REFERENCES migration_mapping_sets(mapping_set_id) ON DELETE RESTRICT,
  validation_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  object_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  imported_at TIMESTAMPTZ,
  reconciled_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS migration_corrections (
  correction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  import_batch_id UUID NOT NULL REFERENCES migration_import_batches(import_batch_id) ON DELETE CASCADE,
  source_object_id TEXT NOT NULL,
  target_object_id TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_diff_reports (
  diff_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  comparison_scope TEXT NOT NULL,
  source_snapshot_ref_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_snapshot_ref_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  difference_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  materiality_assessment TEXT NOT NULL,
  status TEXT NOT NULL,
  difference_items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS migration_cutover_plans (
  cutover_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  freeze_at TIMESTAMPTZ NOT NULL,
  last_extract_at TIMESTAMPTZ,
  validation_gate_status TEXT NOT NULL,
  rollback_point TEXT NOT NULL,
  signoff_chain_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  go_live_checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  rollback_reason_code TEXT,
  created_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322210000_phase14_migration_cockpit')
ON CONFLICT (migration_id) DO NOTHING;
