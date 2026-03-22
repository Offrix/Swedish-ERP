INSERT INTO employees (
  employee_id,
  company_id,
  employee_no,
  given_name,
  family_name,
  preferred_name,
  display_name,
  date_of_birth,
  identity_type,
  identity_value_masked,
  protected_identity,
  work_email,
  private_email,
  phone,
  country_code
)
VALUES
  (
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000000001',
    'EMP0781',
    'Sara',
    'Nord',
    NULL,
    'Sara Nord',
    '1992-02-20',
    'samordningsnummer',
    '********9876',
    TRUE,
    'sara.nord@swedisherp.local',
    NULL,
    '+46705550123',
    'SE'
  ),
  (
    '00000000-0000-4000-8000-000000000782',
    '00000000-0000-4000-8000-000000000001',
    'EMP0782',
    'Lena',
    'Chef',
    NULL,
    'Lena Chef',
    '1980-03-15',
    'personnummer',
    '********1111',
    FALSE,
    'lena.chef@swedisherp.local',
    NULL,
    '+46705550999',
    'SE'
  ),
  (
    '00000000-0000-4000-8000-000000000783',
    '00000000-0000-4000-8000-000000000001',
    'EMP0783',
    'Olle',
    'Chef',
    NULL,
    'Olle Chef',
    '1978-11-08',
    'personnummer',
    '********2222',
    FALSE,
    'olle.chef@swedisherp.local',
    NULL,
    '+46705550888',
    'SE'
  )
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employments (
  employment_id,
  company_id,
  employee_id,
  employment_no,
  employment_type_code,
  job_title,
  department_code,
  pay_model_code,
  schedule_template_code,
  start_date,
  end_date
)
VALUES
  (
    '00000000-0000-4000-8000-000000000791',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    'EMPL0791',
    'permanent',
    'Lönespecialist',
    'PAYROLL',
    'monthly_salary',
    'office_day',
    '2024-03-01',
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000792',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000782',
    'EMPL0792',
    'permanent',
    'HR-chef',
    'HR',
    'monthly_salary',
    'office_day',
    '2022-01-01',
    '2025-03-31'
  ),
  (
    '00000000-0000-4000-8000-000000000793',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000783',
    'EMPL0793',
    'permanent',
    'People Director',
    'HR',
    'monthly_salary',
    'office_day',
    '2025-04-01',
    NULL
  )
ON CONFLICT (employment_id) DO NOTHING;

INSERT INTO employment_contracts (
  employment_contract_id,
  company_id,
  employee_id,
  employment_id,
  contract_version,
  valid_from,
  valid_to,
  salary_model_code,
  monthly_salary,
  hourly_rate,
  currency_code,
  collective_agreement_code,
  salary_revision_reason,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000000791',
    1,
    '2024-03-01',
    '2025-01-31',
    'monthly_salary',
    41000.00,
    NULL,
    'SEK',
    'TJANSTEMAN_2024',
    'initial_contract',
    'demo'
  ),
  (
    '00000000-0000-4000-8000-000000000802',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000000791',
    2,
    '2025-02-01',
    NULL,
    'monthly_salary',
    43500.00,
    NULL,
    'SEK',
    'TJANSTEMAN_2025',
    'protected_identity_reviewed',
    'demo'
  )
ON CONFLICT (employment_contract_id) DO NOTHING;

INSERT INTO employment_manager_assignments (
  employment_manager_assignment_id,
  company_id,
  employee_id,
  employment_id,
  manager_employment_id,
  manager_employee_id,
  valid_from,
  valid_to,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000000811',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000000791',
    '00000000-0000-4000-8000-000000000792',
    '00000000-0000-4000-8000-000000000782',
    '2024-03-01',
    '2025-03-31',
    'demo'
  ),
  (
    '00000000-0000-4000-8000-000000000812',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000000791',
    '00000000-0000-4000-8000-000000000793',
    '00000000-0000-4000-8000-000000000783',
    '2025-04-01',
    NULL,
    'demo'
  )
ON CONFLICT (employment_manager_assignment_id) DO NOTHING;

INSERT INTO employee_bank_accounts (
  employee_bank_account_id,
  company_id,
  employee_id,
  payout_method,
  account_holder_name,
  country_code,
  iban,
  bic,
  bank_name,
  masked_account_display,
  primary_account,
  active
)
VALUES (
  '00000000-0000-4000-8000-000000000821',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000781',
  'iban',
  'Sara Nord',
  'DE',
  '****************3000',
  'DEUTDEFF',
  'Demo Ausland Bank',
  '****************3000',
  TRUE,
  TRUE
)
ON CONFLICT (employee_bank_account_id) DO NOTHING;

INSERT INTO documents (
  document_id,
  company_id,
  document_type,
  status,
  source_channel,
  source_reference,
  retention_policy_code,
  received_at,
  storage_confirmed_at,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000831',
  '00000000-0000-4000-8000-000000000001',
  'identity_protection',
  'linked',
  'manual',
  'phase7-demo-protection-001',
  'employee_sensitive_document',
  NOW(),
  NOW(),
  '{"seed":"phase7_demo","kind":"identity_protection"}'::jsonb
)
ON CONFLICT (document_id) DO NOTHING;

INSERT INTO document_versions (
  document_version_id,
  document_id,
  company_id,
  variant_type,
  storage_key,
  mime_type,
  file_hash,
  file_size_bytes,
  source_reference,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000000832',
  '00000000-0000-4000-8000-000000000831',
  '00000000-0000-4000-8000-000000000001',
  'original',
  'documents/originals/phase7-demo-protection-001.pdf',
  'application/pdf',
  'phase7-demo-protection-001',
  2048,
  'phase7-demo-protection-001',
  '{"seed":"phase7_demo"}'::jsonb
)
ON CONFLICT (document_version_id) DO NOTHING;

INSERT INTO document_links (
  document_link_id,
  document_id,
  company_id,
  target_type,
  target_id,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000000833',
  '00000000-0000-4000-8000-000000000831',
  '00000000-0000-4000-8000-000000000001',
  'hr_employee',
  '00000000-0000-4000-8000-000000000781',
  NOW()
)
ON CONFLICT (document_link_id) DO NOTHING;

INSERT INTO audit_events (
  audit_id,
  company_id,
  actor_id,
  action,
  result,
  entity_type,
  entity_id,
  explanation,
  correlation_id,
  recorded_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000841',
    '00000000-0000-4000-8000-000000000001',
    'demo',
    'hr.employee.sensitive_fields_logged',
    'success',
    'hr_employee',
    '00000000-0000-4000-8000-000000000781',
    'Sensitive HR fields recorded: protected_identity, national_identity.',
    'phase7-demo-audit-identity',
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000842',
    '00000000-0000-4000-8000-000000000001',
    'demo',
    'hr.employee_bank_account.recorded',
    'success',
    'hr_employee',
    '00000000-0000-4000-8000-000000000781',
    'Recorded iban payout details for employee EMP0781.',
    'phase7-demo-audit-bank',
    NOW()
  )
ON CONFLICT (audit_id) DO NOTHING;
