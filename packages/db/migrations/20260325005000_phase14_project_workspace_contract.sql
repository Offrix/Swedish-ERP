BEGIN;

CREATE TABLE IF NOT EXISTS project_deviations (
  project_deviation_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  deviation_type_code TEXT NOT NULL,
  severity_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_user_id UUID NULL,
  source_domain_code TEXT NOT NULL,
  source_object_id TEXT NULL,
  resolution_note TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_deviations_company_project
  ON project_deviations(company_id, project_id, status, created_at);

-- phase14 project workspace contract
INSERT INTO schema_migrations (migration_id)
VALUES ('20260325005000_phase14_project_workspace_contract')
ON CONFLICT (migration_id) DO NOTHING;

COMMIT;
