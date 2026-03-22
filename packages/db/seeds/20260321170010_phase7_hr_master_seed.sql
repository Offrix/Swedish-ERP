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
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000001',
    'EMP0711',
    'Anna',
    'Berg',
    NULL,
    'Anna Berg',
    '1988-04-12',
    'personnummer',
    '********1234',
    FALSE,
    'anna.berg@swedisherp.local',
    'anna.private@swedisherp.local',
    '+46701234567',
    'SE'
  ),
  (
    '00000000-0000-4000-8000-000000000712',
    '00000000-0000-4000-8000-000000000001',
    'EMP0712',
    'Johan',
    'Chef',
    NULL,
    'Johan Chef',
    '1984-09-01',
    'personnummer',
    '********5678',
    FALSE,
    'johan.chef@swedisherp.local',
    NULL,
    '+46707654321',
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
    '00000000-0000-4000-8000-000000000721',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    'EMPL0721',
    'permanent',
    'Ekonom',
    'FINANCE',
    'monthly_salary',
    'office_day',
    '2024-01-01',
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000722',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    'EMPL0722',
    'hourly_assignment',
    'Projektresurs',
    'PROJECTS',
    'hourly_salary',
    'field_flex',
    '2025-06-01',
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000723',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000712',
    'EMPL0723',
    'permanent',
    'Ekonomichef',
    'FINANCE',
    'monthly_salary',
    'office_day',
    '2023-01-01',
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
    '00000000-0000-4000-8000-000000000731',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000721',
    1,
    '2024-01-01',
    '2024-12-31',
    'monthly_salary',
    38000.00,
    NULL,
    'SEK',
    'TJANSTEMAN_2024',
    'initial_contract',
    'seed'
  ),
  (
    '00000000-0000-4000-8000-000000000732',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000721',
    2,
    '2025-01-01',
    NULL,
    'monthly_salary',
    40500.00,
    NULL,
    'SEK',
    'TJANSTEMAN_2025',
    'annual_revision',
    'seed'
  ),
  (
    '00000000-0000-4000-8000-000000000733',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000722',
    1,
    '2025-06-01',
    NULL,
    'hourly_salary',
    NULL,
    350.00,
    'SEK',
    NULL,
    'project_assignment',
    'seed'
  ),
  (
    '00000000-0000-4000-8000-000000000734',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000712',
    '00000000-0000-4000-8000-000000000723',
    1,
    '2023-01-01',
    NULL,
    'monthly_salary',
    52000.00,
    NULL,
    'SEK',
    'TJANSTEMAN_2025',
    'manager_contract',
    'seed'
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
    '00000000-0000-4000-8000-000000000741',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000721',
    '00000000-0000-4000-8000-000000000723',
    '00000000-0000-4000-8000-000000000712',
    '2024-01-01',
    NULL,
    'seed'
  ),
  (
    '00000000-0000-4000-8000-000000000742',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000722',
    '00000000-0000-4000-8000-000000000723',
    '00000000-0000-4000-8000-000000000712',
    '2025-06-01',
    NULL,
    'seed'
  )
ON CONFLICT (employment_manager_assignment_id) DO NOTHING;

INSERT INTO employee_bank_accounts (
  employee_bank_account_id,
  company_id,
  employee_id,
  payout_method,
  account_holder_name,
  country_code,
  clearing_number,
  account_number,
  bank_name,
  masked_account_display,
  primary_account,
  active
)
VALUES (
  '00000000-0000-4000-8000-000000000751',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000711',
  'domestic_account',
  'Anna Berg',
  'SE',
  '5000',
  '********4321',
  'Swedish ERP Bank',
  '********4321',
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
  '00000000-0000-4000-8000-000000000761',
  '00000000-0000-4000-8000-000000000001',
  'employment_contract',
  'linked',
  'manual',
  'phase7-seed-employment-contract-001',
  'employment_record_standard',
  NOW(),
  NOW(),
  '{"seed":"phase7","kind":"employment_contract"}'::jsonb
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
  '00000000-0000-4000-8000-000000000762',
  '00000000-0000-4000-8000-000000000761',
  '00000000-0000-4000-8000-000000000001',
  'original',
  'documents/originals/phase7-seed-employment-contract-001.pdf',
  'application/pdf',
  'phase7-seed-employment-contract-001',
  1536,
  'phase7-seed-employment-contract-001',
  '{"seed":"phase7"}'::jsonb
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
  '00000000-0000-4000-8000-000000000763',
  '00000000-0000-4000-8000-000000000761',
  '00000000-0000-4000-8000-000000000001',
  'hr_employee',
  '00000000-0000-4000-8000-000000000711',
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
    '00000000-0000-4000-8000-000000000771',
    '00000000-0000-4000-8000-000000000001',
    'seed',
    'hr.employee.sensitive_fields_logged',
    'success',
    'hr_employee',
    '00000000-0000-4000-8000-000000000711',
    'Sensitive HR fields recorded: national_identity, private_contact.',
    'phase7-seed-audit-identity',
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000772',
    '00000000-0000-4000-8000-000000000001',
    'seed',
    'hr.employee_bank_account.recorded',
    'success',
    'hr_employee',
    '00000000-0000-4000-8000-000000000711',
    'Recorded domestic_account payout details for employee EMP0711.',
    'phase7-seed-audit-bank',
    NOW()
  )
ON CONFLICT (audit_id) DO NOTHING;
