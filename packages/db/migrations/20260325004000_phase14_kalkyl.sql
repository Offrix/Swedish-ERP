CREATE TABLE IF NOT EXISTS estimate_versions (
  estimate_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  estimate_no TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  supersedes_estimate_version_id UUID REFERENCES estimate_versions(estimate_version_id) ON DELETE SET NULL,
  superseded_by_estimate_version_id UUID REFERENCES estimate_versions(estimate_version_id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES ar_customers(customer_id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  quote_conversion_json JSONB,
  project_budget_conversion_json JSONB,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, estimate_no, version_no)
);

CREATE INDEX IF NOT EXISTS ix_estimate_versions_phase14_company_status
  ON estimate_versions (company_id, estimate_no, status, version_no DESC);

INSERT INTO schema_migrations(version, description)
VALUES ('20260325004000_phase14_kalkyl', 'Phase 14 kalkyl bounded context')
ON CONFLICT (version) DO NOTHING;
