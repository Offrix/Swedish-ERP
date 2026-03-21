ALTER TABLE company_users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_mfa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'not_started';

CREATE INDEX IF NOT EXISTS idx_company_users_company_user_status
  ON company_users (company_id, user_id, status);

ALTER TABLE delegations
  ADD COLUMN IF NOT EXISTS permission_code TEXT,
  ADD COLUMN IF NOT EXISTS resource_type TEXT,
  ADD COLUMN IF NOT EXISTS resource_id TEXT;

CREATE INDEX IF NOT EXISTS idx_delegations_company_scope_window
  ON delegations (company_id, scope_code, starts_at, ends_at, status);

CREATE TABLE IF NOT EXISTS roles (
  role_code TEXT PRIMARY KEY,
  system_role BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_code TEXT PRIMARY KEY,
  object_type TEXT NOT NULL,
  action_code TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code TEXT NOT NULL REFERENCES roles(role_code) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(permission_code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE IF NOT EXISTS object_grants (
  object_grant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(permission_code),
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_object_grants_unique_active_scope
  ON object_grants (company_id, company_user_id, permission_code, object_type, object_id, starts_at);

CREATE TABLE IF NOT EXISTS approval_chains (
  approval_chain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  scope_code TEXT NOT NULL,
  object_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_chain_steps (
  approval_chain_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_chain_id UUID NOT NULL REFERENCES approval_chains(approval_chain_id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role_code TEXT REFERENCES roles(role_code),
  approver_company_user_id UUID REFERENCES company_users(company_user_id),
  delegation_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (approval_chain_id, step_order)
);

CREATE TABLE IF NOT EXISTS auth_identities (
  auth_identity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_user_id UUID REFERENCES company_users(company_user_id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  verified_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_type, provider_subject)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  required_factor_count INTEGER NOT NULL DEFAULT 1,
  amr_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_company_status
  ON auth_sessions (company_id, status, expires_at);

CREATE TABLE IF NOT EXISTS auth_factors (
  factor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_user_id UUID REFERENCES company_users(company_user_id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_enrollment',
  secret_ref TEXT,
  credential_id TEXT,
  public_key TEXT,
  provider_subject TEXT,
  device_name TEXT,
  verified_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_factors_company_user_type
  ON auth_factors (company_user_id, factor_type, status);

CREATE TABLE IF NOT EXISTS auth_challenges (
  challenge_id TEXT PRIMARY KEY,
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  company_user_id UUID REFERENCES company_users(company_user_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  challenge TEXT,
  external_ref TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_providers (
  provider_code TEXT PRIMARY KEY,
  provider_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'configured',
  configuration_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_setup_blueprints (
  company_id UUID PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
  chart_template_id TEXT NOT NULL,
  voucher_series_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  configured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_registrations (
  company_registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  registration_type TEXT NOT NULL,
  registration_value TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  effective_from TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, registration_type)
);

CREATE TABLE IF NOT EXISTS company_vat_setups (
  company_vat_setup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(company_id) ON DELETE CASCADE,
  vat_scheme TEXT NOT NULL,
  filing_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_runs (
  onboarding_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  started_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  resume_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_step TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_step_states (
  onboarding_step_state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_run_id UUID NOT NULL REFERENCES onboarding_runs(onboarding_run_id) ON DELETE CASCADE,
  step_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (onboarding_run_id, step_code)
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321010000_phase1_org_auth_onboarding')
ON CONFLICT (migration_id) DO NOTHING;
