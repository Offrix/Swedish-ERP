BEGIN;

CREATE TABLE IF NOT EXISTS legal_form_profiles (
  legal_form_profile_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  legal_form_code TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  filing_profile_code TEXT NOT NULL,
  signatory_class_code TEXT NOT NULL,
  declaration_profile_code TEXT NOT NULL,
  status TEXT NOT NULL,
  rulepack_code TEXT NOT NULL,
  rulepack_version TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by_profile_id UUID NULL
);

CREATE TABLE IF NOT EXISTS reporting_obligation_profiles (
  reporting_obligation_profile_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  legal_form_profile_id UUID NOT NULL,
  legal_form_code TEXT NOT NULL,
  fiscal_year_key TEXT NOT NULL,
  fiscal_year_id UUID NULL,
  accounting_period_id UUID NULL,
  requires_annual_report BOOLEAN NOT NULL DEFAULT FALSE,
  requires_year_end_accounts BOOLEAN NOT NULL DEFAULT FALSE,
  allows_simplified_year_end BOOLEAN NOT NULL DEFAULT FALSE,
  requires_bolagsverket_filing BOOLEAN NOT NULL DEFAULT FALSE,
  requires_tax_declaration_package BOOLEAN NOT NULL DEFAULT TRUE,
  declaration_profile_code TEXT NOT NULL,
  signatory_class_code TEXT NOT NULL,
  filing_profile_code TEXT NOT NULL,
  package_family_code TEXT NOT NULL,
  status TEXT NOT NULL,
  rulepack_code TEXT NOT NULL,
  rulepack_version TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by_reporting_obligation_profile_id UUID NULL
);

CREATE INDEX IF NOT EXISTS ix_legal_form_profiles_company_effective
  ON legal_form_profiles (company_id, effective_from DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS ix_reporting_obligation_profiles_company_year
  ON reporting_obligation_profiles (company_id, fiscal_year_key, status, updated_at DESC);

INSERT INTO schema_migrations(version, description)
VALUES ('20260325020000', 'phase14 legal form profiles')
ON CONFLICT (version) DO NOTHING;

COMMIT;
