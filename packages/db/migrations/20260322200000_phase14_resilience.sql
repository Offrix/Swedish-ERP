CREATE TABLE IF NOT EXISTS feature_flags (
  feature_flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  description TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_ref TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  owner_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  risk_class TEXT NOT NULL,
  sunset_at DATE NOT NULL,
  emergency_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_reason_code TEXT,
  changed_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_feature_flags_scope
  ON feature_flags (company_id, flag_key, scope_type, COALESCE(scope_ref, 'global'));

CREATE TABLE IF NOT EXISTS emergency_disables (
  emergency_disable_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  requested_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS load_profiles (
  load_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  profile_code TEXT NOT NULL,
  target_throughput_per_minute INTEGER NOT NULL,
  observed_p95_ms INTEGER NOT NULL,
  queue_recovery_seconds INTEGER NOT NULL,
  status TEXT NOT NULL,
  recorded_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restore_drills (
  restore_drill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  drill_code TEXT NOT NULL,
  target_rto_minutes INTEGER NOT NULL,
  target_rpo_minutes INTEGER NOT NULL,
  actual_rto_minutes INTEGER NOT NULL,
  actual_rpo_minutes INTEGER NOT NULL,
  status TEXT NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chaos_scenarios (
  chaos_scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  scenario_code TEXT NOT NULL,
  failure_mode TEXT NOT NULL,
  queue_recovery_seconds INTEGER NOT NULL,
  impact_summary TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
