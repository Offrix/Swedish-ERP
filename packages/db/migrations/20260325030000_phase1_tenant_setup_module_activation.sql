CREATE TABLE IF NOT EXISTS tenant_setup_profiles (
  tenant_setup_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(company_id) ON DELETE CASCADE,
  onboarding_run_id UUID REFERENCES onboarding_runs(onboarding_run_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'setup_pending',
  onboarding_completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_reason_code TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_setup_profiles_company_status
  ON tenant_setup_profiles (company_id, status);

CREATE TABLE IF NOT EXISTS module_definitions (
  module_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  label TEXT NOT NULL,
  risk_class TEXT NOT NULL DEFAULT 'low',
  core_module BOOLEAN NOT NULL DEFAULT FALSE,
  dependency_module_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_policy_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_rulepack_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_completed_tenant_setup BOOLEAN NOT NULL DEFAULT TRUE,
  allow_suspend BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_module_definitions_company_risk
  ON module_definitions (company_id, risk_class, module_code);

CREATE TABLE IF NOT EXISTS module_activations (
  module_activation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  effective_from DATE NOT NULL,
  activation_reason TEXT NOT NULL,
  approval_actor_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_reason_code TEXT,
  validation_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_module_activations_company_status
  ON module_activations (company_id, status, effective_from);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260325030000_phase1_tenant_setup_module_activation')
ON CONFLICT (migration_id) DO NOTHING;
