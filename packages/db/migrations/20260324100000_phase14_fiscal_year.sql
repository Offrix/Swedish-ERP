CREATE TABLE IF NOT EXISTS fiscal_year_profiles (
  fiscal_year_profile_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  legal_form_code TEXT NOT NULL,
  owner_taxation_code TEXT NOT NULL,
  must_use_calendar_year BOOLEAN NOT NULL,
  group_alignment_required BOOLEAN NOT NULL DEFAULT FALSE,
  rulepack_code TEXT NOT NULL,
  rulepack_version TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS fiscal_year_change_requests (
  change_request_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  requested_start_date DATE NOT NULL,
  requested_end_date DATE NOT NULL,
  year_kind TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  tax_agency_permission_required BOOLEAN NOT NULL DEFAULT FALSE,
  permission_status TEXT NOT NULL,
  permission_reference TEXT NULL,
  group_alignment_start_date DATE NULL,
  group_alignment_end_date DATE NULL,
  status TEXT NOT NULL,
  approved_by TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  implemented_at TIMESTAMPTZ NULL,
  requested_by_actor_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS fiscal_years (
  fiscal_year_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  fiscal_year_profile_id TEXT NOT NULL REFERENCES fiscal_year_profiles(fiscal_year_profile_id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  year_kind TEXT NOT NULL,
  approval_basis_code TEXT NOT NULL,
  change_request_id TEXT NULL REFERENCES fiscal_year_change_requests(change_request_id),
  status TEXT NOT NULL,
  prior_fiscal_year_id TEXT NULL,
  next_fiscal_year_id TEXT NULL,
  periods_generated_at TIMESTAMPTZ NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fiscal_years_company_interval
  ON fiscal_years(company_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS fiscal_periods (
  period_id TEXT PRIMARY KEY,
  fiscal_year_id TEXT NOT NULL REFERENCES fiscal_years(fiscal_year_id),
  company_id TEXT NOT NULL,
  period_code TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  lock_state TEXT NOT NULL,
  close_state TEXT NOT NULL,
  reopen_reason_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fiscal_periods_fiscal_year_code
  ON fiscal_periods(fiscal_year_id, period_code);
