INSERT INTO public_api_compatibility_baselines (
  baseline_id,
  company_id,
  version,
  route_hash,
  actor_id,
  recorded_at
)
VALUES (
  '13000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '2026-03-22',
  'seed-route-hash-phase13-1',
  'seed-phase13-1',
  NOW()
)
ON CONFLICT (baseline_id) DO NOTHING;

INSERT INTO public_api_clients (
  client_id,
  company_id,
  display_name,
  mode,
  scopes_json,
  status,
  client_secret_hash,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '13000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Seed Public API Client',
  'sandbox',
  '["api_spec.read","reporting.read","webhook.manage"]'::jsonb,
  'active',
  'seed-client-secret-hash-phase13-1',
  'seed-phase13-1',
  NOW(),
  NOW()
)
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO webhook_subscriptions (
  subscription_id,
  company_id,
  client_id,
  mode,
  event_types_json,
  target_url,
  description,
  secret,
  status,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '13000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000002',
  'sandbox',
  '["report.snapshot.ready","automation.decision.ready"]'::jsonb,
  'https://example.test/webhooks/sandbox',
  'Seed sandbox webhook',
  'seed-webhook-secret-phase13-1',
  'active',
  'seed-phase13-1',
  NOW(),
  NOW()
)
ON CONFLICT (subscription_id) DO NOTHING;
