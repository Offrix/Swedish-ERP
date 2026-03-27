CREATE TABLE IF NOT EXISTS support_cases (
  support_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  requester_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  related_object_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_scope TEXT NOT NULL,
  approved_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_diagnostics (
  command_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  support_case_id UUID NOT NULL REFERENCES support_cases(support_case_id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  input_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_class TEXT NOT NULL,
  executed_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  support_case_id UUID NOT NULL REFERENCES support_cases(support_case_id) ON DELETE CASCADE,
  target_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  target_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  requested_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  approved_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  purpose_code TEXT NOT NULL,
  mode TEXT NOT NULL,
  restricted_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  end_reason_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_review_batches (
  review_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  scope_ref TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at DATE NOT NULL,
  status TEXT NOT NULL,
  signed_off_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS access_review_findings (
  finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_batch_id UUID NOT NULL REFERENCES access_review_batches(review_batch_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  finding_code TEXT NOT NULL,
  severity TEXT NOT NULL,
  related_company_user_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision TEXT NOT NULL DEFAULT 'pending',
  remediation_note TEXT,
  decided_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS break_glass_sessions (
  break_glass_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  incident_id TEXT NOT NULL,
  purpose_code TEXT NOT NULL,
  requested_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  approvals_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  activated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322190000_phase14_security_review')
ON CONFLICT (migration_id) DO NOTHING;
