INSERT INTO users (user_id, email, display_name, status)
VALUES ('00000000-0000-4000-8000-000000000012', 'approver@example.test', 'Phase 1 Approver', 'active')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO company_users (
  company_user_id,
  company_id,
  user_id,
  role_code,
  status,
  starts_at,
  is_admin,
  requires_mfa,
  onboarding_status
)
VALUES (
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000012',
  'approver',
  'active',
  NOW(),
  FALSE,
  FALSE,
  'completed'
)
ON CONFLICT (company_user_id) DO NOTHING;

INSERT INTO auth_factors (user_id, company_user_id, factor_type, status, secret_ref, device_name, verified_at)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000022',
  'totp',
  'active',
  'KRSXG5DSNFXGOIDB',
  'Approver authenticator',
  NOW()
)
ON CONFLICT DO NOTHING;

INSERT INTO delegations (
  delegation_id,
  company_id,
  from_company_user_id,
  to_company_user_id,
  scope_code,
  starts_at,
  ends_at,
  status,
  permission_code,
  resource_type,
  resource_id
)
VALUES (
  '00000000-0000-4000-8000-000000000023',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000022',
  'customer_invoice',
  TIMESTAMPTZ '2026-03-01T00:00:00Z',
  TIMESTAMPTZ '2026-12-31T23:59:59Z',
  'active',
  'approval.approve',
  'customer_invoice',
  'INV-10001'
)
ON CONFLICT (delegation_id) DO NOTHING;

INSERT INTO approval_chains (
  approval_chain_id,
  company_id,
  scope_code,
  object_type,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000000024',
  '00000000-0000-4000-8000-000000000001',
  'customer_invoice',
  'customer_invoice',
  'active'
)
ON CONFLICT (approval_chain_id) DO NOTHING;

INSERT INTO approval_chain_steps (
  approval_chain_step_id,
  approval_chain_id,
  step_order,
  approver_company_user_id,
  delegation_allowed,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000025',
  '00000000-0000-4000-8000-000000000024',
  1,
  '00000000-0000-4000-8000-000000000022',
  TRUE,
  '{"label":"invoice_approval"}'::jsonb
)
ON CONFLICT (approval_chain_id, step_order) DO NOTHING;

INSERT INTO companies (company_id, legal_name, org_number, status, settings_json)
VALUES (
  '00000000-0000-4000-8000-000000000013',
  'Onboarding Demo AB',
  '559900-0013',
  'draft',
  '{"accountingYear":"2026"}'::jsonb
)
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO onboarding_runs (
  onboarding_run_id,
  company_id,
  started_by_user_id,
  resume_token_hash,
  status,
  current_step,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000000026',
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000011',
  encode(digest('phase1-demo-resume-token', 'sha256'), 'hex'),
  'in_progress',
  'registrations',
  '{"accountingYear":"2026"}'::jsonb
)
ON CONFLICT (onboarding_run_id) DO NOTHING;

INSERT INTO onboarding_step_states (
  onboarding_step_state_id,
  onboarding_run_id,
  step_code,
  status,
  completed_at,
  data_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000000027',
    '00000000-0000-4000-8000-000000000026',
    'company_profile',
    'completed',
    NOW(),
    '{"legalName":"Onboarding Demo AB","orgNumber":"559900-0013"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000028',
    '00000000-0000-4000-8000-000000000026',
    'registrations',
    'pending',
    NULL,
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000029',
    '00000000-0000-4000-8000-000000000026',
    'chart_template',
    'pending',
    NULL,
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000026',
    'vat_setup',
    'pending',
    NULL,
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000032',
    '00000000-0000-4000-8000-000000000026',
    'fiscal_periods',
    'pending',
    NULL,
    '{}'::jsonb
  )
ON CONFLICT (onboarding_run_id, step_code) DO NOTHING;
