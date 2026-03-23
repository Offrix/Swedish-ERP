INSERT INTO async_jobs (
  job_id,
  company_id,
  job_type,
  job_payload_hash,
  job_payload_ref,
  payload_json,
  status,
  priority,
  risk_class,
  idempotency_key,
  source_event_id,
  source_action_id,
  correlation_id,
  retry_policy_json,
  timeout_seconds,
  created_by_actor_id,
  created_at,
  available_at,
  last_error_class
)
VALUES (
  '13000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000001',
  'bank.payment_sync',
  'seed-job-payload-hash-phase13-2',
  'partner-operation-seed',
  '{"batch":"demo"}'::jsonb,
  'dead_lettered',
  'high',
  'high_risk',
  'seed-phase13-2-job-key',
  'seed-event',
  'seed-action',
  '13000000-0000-4000-8000-000000000104',
  '{"maxAttempts":3,"backoffMinutes":[1,5,15],"timeoutSeconds":120}'::jsonb,
  120,
  'demo-phase13-2',
  NOW(),
  NOW(),
  'downstream_unknown'
)
ON CONFLICT (job_id) DO NOTHING;

INSERT INTO async_dead_letters (
  dead_letter_id,
  job_id,
  company_id,
  entered_at,
  terminal_reason,
  operator_state,
  replay_allowed,
  risk_class
)
VALUES (
  '13000000-0000-4000-8000-000000000105',
  '13000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000001',
  NOW(),
  'downstream_unknown',
  'unseen',
  TRUE,
  'high_risk'
)
ON CONFLICT (dead_letter_id) DO NOTHING;

INSERT INTO partner_operations (
  operation_id,
  company_id,
  connection_id,
  connection_type,
  partner_code,
  operation_code,
  payload_hash,
  payload_json,
  actor_id,
  fallback_mode,
  status,
  job_id,
  provider_reference,
  fallback_triggered,
  fallback_reason_code,
  created_at,
  updated_at
)
VALUES (
  '13000000-0000-4000-8000-000000000106',
  '00000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000101',
  'bank',
  'seed-bank',
  'payment_status_sync',
  'seed-partner-operation-hash-phase13-2',
  '{"batch":"demo","direction":"fallback"}'::jsonb,
  'demo-phase13-2',
  'queue_retry',
  'fallback',
  '13000000-0000-4000-8000-000000000103',
  NULL,
  TRUE,
  'provider_timeout',
  NOW(),
  NOW()
)
ON CONFLICT (operation_id) DO NOTHING;
