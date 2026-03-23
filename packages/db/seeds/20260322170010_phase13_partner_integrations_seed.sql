INSERT INTO partner_connections (
  connection_id,
  company_id,
  connection_type,
  partner_code,
  display_name,
  mode,
  rate_limit_per_minute,
  fallback_mode,
  credentials_ref,
  status,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '13000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'bank',
  'seed-bank',
  'Seed Bank Adapter',
  'sandbox',
  30,
  'queue_retry',
  'vault://bank/seed-bank',
  'active',
  'seed-phase13-2',
  NOW(),
  NOW()
)
ON CONFLICT (connection_id) DO NOTHING;

INSERT INTO partner_contract_results (
  contract_result_id,
  company_id,
  connection_id,
  connection_type,
  partner_code,
  actor_id,
  result,
  assertions_json,
  executed_at
)
VALUES (
  '13000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000101',
  'bank',
  'seed-bank',
  'seed-phase13-2',
  'passed',
  '["auth_ok","payload_schema_ok","idempotency_ok"]'::jsonb,
  NOW()
)
ON CONFLICT (contract_result_id) DO NOTHING;
