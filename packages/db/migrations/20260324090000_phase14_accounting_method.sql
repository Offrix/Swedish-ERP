CREATE TABLE IF NOT EXISTS accounting_method_eligibility_assessments (
  assessment_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  assessment_date DATE NOT NULL,
  legal_form_code TEXT NOT NULL,
  net_turnover_basis_sek NUMERIC(18,2) NOT NULL,
  entity_type_basis TEXT NOT NULL,
  financial_entity_classification TEXT NOT NULL,
  financial_entity_exclusion BOOLEAN NOT NULL DEFAULT FALSE,
  rulepack_code TEXT NOT NULL,
  rulepack_version TEXT NOT NULL,
  eligible_for_cash_method BOOLEAN NOT NULL,
  blocking_reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  assessed_by_actor_id TEXT NOT NULL,
  assessed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS accounting_method_profiles (
  method_profile_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  method_code TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  fiscal_year_start_date DATE NULL,
  legal_basis_code TEXT NOT NULL,
  eligibility_assessment_id TEXT NOT NULL REFERENCES accounting_method_eligibility_assessments(assessment_id),
  eligibility_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  onboarding_override BOOLEAN NOT NULL DEFAULT FALSE,
  method_change_request_id TEXT NULL,
  approved_by TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  activated_by TEXT NULL,
  activated_at TIMESTAMPTZ NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  superseded_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounting_method_profiles_company_effective
  ON accounting_method_profiles(company_id, effective_from, COALESCE(effective_to, DATE '9999-12-31'));

CREATE TABLE IF NOT EXISTS accounting_method_change_requests (
  method_change_request_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  current_method_code TEXT NULL,
  requested_method_code TEXT NOT NULL,
  requested_effective_from DATE NOT NULL,
  fiscal_year_start_date DATE NULL,
  reason_code TEXT NOT NULL,
  requested_by_actor_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  decision_note TEXT NULL,
  approved_by TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  implemented_at TIMESTAMPTZ NULL,
  onboarding_override BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounting_method_change_requests_company_effective
  ON accounting_method_change_requests(company_id, requested_effective_from);

CREATE TABLE IF NOT EXISTS accounting_method_year_end_catch_up_runs (
  year_end_catch_up_run_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  fiscal_year_end_date DATE NOT NULL,
  method_profile_id TEXT NOT NULL REFERENCES accounting_method_profiles(method_profile_id),
  method_code TEXT NOT NULL,
  rulepack_version TEXT NOT NULL,
  timing_signal TEXT NOT NULL,
  status TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  captured_item_count INTEGER NOT NULL,
  totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounting_method_year_end_catch_up_snapshot
  ON accounting_method_year_end_catch_up_runs(company_id, fiscal_year_end_date, snapshot_hash);
