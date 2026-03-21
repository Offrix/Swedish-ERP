INSERT INTO roles (role_code, system_role, description)
VALUES
  ('company_admin', TRUE, 'Company administrator with full in-company access'),
  ('approver', TRUE, 'Approver for attest and sign-off flows'),
  ('payroll_admin', TRUE, 'Payroll administrator'),
  ('field_user', TRUE, 'Field and mobile user'),
  ('bureau_user', TRUE, 'Bureau or advisor user inside delegated company scope')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO permissions (permission_code, object_type, action_code, description)
VALUES
  ('company.read', 'company', 'read', 'Read company metadata'),
  ('company.manage', 'company', 'manage', 'Manage company settings'),
  ('company_user.read', 'company_user', 'read', 'Read company users'),
  ('company_user.write', 'company_user', 'write', 'Create or update company users'),
  ('delegation.manage', 'delegation', 'manage', 'Manage delegation windows'),
  ('object_grant.manage', 'object_grant', 'manage', 'Manage object grants'),
  ('attest_chain.manage', 'approval_chain', 'manage', 'Manage approval chains'),
  ('approval.approve', 'approval', 'approve', 'Approve delegated objects'),
  ('onboarding.manage', 'onboarding', 'manage', 'Run or resume onboarding'),
  ('auth.session.revoke', 'auth_session', 'revoke', 'Revoke sessions'),
  ('auth.factor.manage', 'auth_factor', 'manage', 'Manage MFA factors')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code)
VALUES
  ('company_admin', 'company.read'),
  ('company_admin', 'company.manage'),
  ('company_admin', 'company_user.read'),
  ('company_admin', 'company_user.write'),
  ('company_admin', 'delegation.manage'),
  ('company_admin', 'object_grant.manage'),
  ('company_admin', 'attest_chain.manage'),
  ('company_admin', 'approval.approve'),
  ('company_admin', 'onboarding.manage'),
  ('company_admin', 'auth.session.revoke'),
  ('company_admin', 'auth.factor.manage'),
  ('approver', 'company.read'),
  ('approver', 'company_user.read'),
  ('payroll_admin', 'company.read'),
  ('payroll_admin', 'company_user.read'),
  ('field_user', 'company.read'),
  ('bureau_user', 'company.read'),
  ('bureau_user', 'company_user.read')
ON CONFLICT (role_code, permission_code) DO NOTHING;

UPDATE company_users
SET is_admin = TRUE,
    requires_mfa = TRUE,
    onboarding_status = 'completed'
WHERE company_user_id = '00000000-0000-4000-8000-000000000021';

INSERT INTO auth_providers (provider_code, provider_type, status, configuration_json)
VALUES ('bankid_stub', 'bankid', 'configured', '{"mode":"stub"}'::jsonb)
ON CONFLICT (provider_code) DO NOTHING;

INSERT INTO auth_identities (user_id, company_user_id, provider_type, provider_subject, status, verified_at)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000021',
  'bankid',
  '197001011234',
  'active',
  NOW()
)
ON CONFLICT (provider_type, provider_subject) DO NOTHING;

INSERT INTO auth_factors (user_id, company_user_id, factor_type, status, secret_ref, provider_subject, device_name, verified_at)
VALUES
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    'totp',
    'active',
    'JBSWY3DPEHPK3PXP',
    NULL,
    'Demo authenticator',
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    'bankid',
    'active',
    NULL,
    '197001011234',
    'Demo BankID',
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    'passkey',
    'active',
    NULL,
    NULL,
    'Demo security key',
    NOW()
  )
ON CONFLICT DO NOTHING;

INSERT INTO company_setup_blueprints (company_id, chart_template_id, voucher_series_codes_json)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'DSAM-2026',
  '["A","B","E","H","I"]'::jsonb
)
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_registrations (company_id, registration_type, registration_value, status, effective_from)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'f_tax', 'f_tax-demo', 'configured', NOW()),
  ('00000000-0000-4000-8000-000000000001', 'vat', 'vat-demo', 'configured', NOW()),
  ('00000000-0000-4000-8000-000000000001', 'employer', 'employer-demo', 'configured', NOW())
ON CONFLICT (company_id, registration_type) DO NOTHING;

INSERT INTO company_vat_setups (company_id, vat_scheme, filing_period, status)
VALUES ('00000000-0000-4000-8000-000000000001', 'se_standard', 'monthly', 'configured')
ON CONFLICT (company_id) DO NOTHING;
