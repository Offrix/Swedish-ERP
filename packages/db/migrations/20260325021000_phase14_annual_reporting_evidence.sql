BEGIN;

CREATE TABLE IF NOT EXISTS annual_evidence_packs (
  evidence_pack_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  package_id UUID NOT NULL,
  version_id UUID NULL,
  accounting_period_id UUID NOT NULL,
  fiscal_year_id UUID NULL,
  fiscal_year_key TEXT NOT NULL,
  legal_form_profile_id UUID NOT NULL,
  reporting_obligation_profile_id UUID NOT NULL,
  declaration_profile_code TEXT NOT NULL,
  package_family_code TEXT NOT NULL,
  component_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_snapshot_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  close_snapshot_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  rulepack_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_checksums_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_fingerprint TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS annual_reporting_submission_links (
  annual_reporting_submission_link_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  package_id UUID NOT NULL,
  version_id UUID NOT NULL,
  evidence_pack_id UUID NOT NULL,
  submission_id UUID NOT NULL,
  submission_family_code TEXT NOT NULL,
  correction_of_submission_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_annual_evidence_packs_company_package
  ON annual_evidence_packs (company_id, package_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_annual_reporting_submission_links_company_package
  ON annual_reporting_submission_links (company_id, package_id, created_at DESC);

-- phase14 annual reporting evidence and submission links
INSERT INTO schema_migrations (migration_id)
VALUES ('20260325021000_phase14_annual_reporting_evidence')
ON CONFLICT (migration_id) DO NOTHING;

COMMIT;
