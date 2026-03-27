CREATE TABLE IF NOT EXISTS agreement_families (
  agreement_family_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sector_code TEXT NULL,
  status TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_agreement_families_company_code UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS agreement_versions (
  agreement_version_id TEXT PRIMARY KEY,
  agreement_family_id TEXT NOT NULL REFERENCES agreement_families(agreement_family_id),
  company_id TEXT NOT NULL,
  agreement_family_code TEXT NOT NULL,
  version_code TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  rulepack_code TEXT NOT NULL,
  rulepack_version TEXT NOT NULL,
  status TEXT NOT NULL,
  rule_set_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_agreement_versions_family_version
  ON agreement_versions (agreement_family_id, version_code);

CREATE TABLE IF NOT EXISTS agreement_assignments (
  agreement_assignment_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employment_id TEXT NOT NULL,
  agreement_family_id TEXT NOT NULL REFERENCES agreement_families(agreement_family_id),
  agreement_family_code TEXT NOT NULL,
  agreement_version_id TEXT NOT NULL REFERENCES agreement_versions(agreement_version_id),
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  assignment_reason_code TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_agreement_assignments_employment
  ON agreement_assignments (company_id, employment_id, effective_from);

CREATE TABLE IF NOT EXISTS agreement_overrides (
  agreement_override_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  agreement_assignment_id TEXT NOT NULL REFERENCES agreement_assignments(agreement_assignment_id),
  agreement_version_id TEXT NOT NULL REFERENCES agreement_versions(agreement_version_id),
  override_type_code TEXT NOT NULL,
  override_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from DATE NULL,
  effective_to DATE NULL,
  reason_code TEXT NOT NULL,
  approved_by_actor_id TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_agreement_overrides_assignment
  ON agreement_overrides (agreement_assignment_id, effective_from, created_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324170000_phase18_collective_agreements')
ON CONFLICT (migration_id) DO NOTHING;
