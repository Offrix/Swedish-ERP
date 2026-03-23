INSERT INTO public_api_tokens (
  token_id,
  company_id,
  client_id,
  mode,
  scopes_json,
  token_hash,
  actor_id,
  issued_at,
  expires_at
)
VALUES (
  '13000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000002',
  'sandbox',
  '["api_spec.read","reporting.read"]'::jsonb,
  'seed-token-hash-phase13-1',
  'demo-phase13-1',
  NOW(),
  NOW() + INTERVAL '7 days'
)
ON CONFLICT (token_id) DO NOTHING;

INSERT INTO webhook_events (
  event_id,
  event_key,
  company_id,
  event_type,
  resource_type,
  resource_id,
  mode,
  payload_json,
  payload_hash,
  created_at
)
VALUES (
  '13000000-0000-4000-8000-000000000005',
  'demo-phase13-1-event',
  '00000000-0000-4000-8000-000000000001',
  'report.snapshot.ready',
  'report_snapshot',
  'demo-report-snapshot',
  'sandbox',
  '{"reportCode":"income_statement"}'::jsonb,
  'seed-webhook-payload-hash-phase13-1',
  NOW()
)
ON CONFLICT DO NOTHING;

INSERT INTO webhook_deliveries (
  delivery_id,
  event_id,
  subscription_id,
  company_id,
  status,
  delivery_attempt_no,
  signature,
  body_hash,
  target_url,
  delivered_at,
  created_at
)
VALUES (
  '13000000-0000-4000-8000-000000000006',
  '13000000-0000-4000-8000-000000000005',
  '13000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  'sent',
  1,
  'seed-webhook-signature-phase13-1',
  'seed-webhook-body-hash-phase13-1',
  'https://example.test/webhooks/sandbox',
  NOW(),
  NOW()
)
ON CONFLICT (delivery_id) DO NOTHING;
