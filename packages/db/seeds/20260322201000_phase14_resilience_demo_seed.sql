INSERT INTO feature_flags (
  feature_flag_id,
  company_id,
  flag_key,
  description,
  flag_type,
  scope_type,
  scope_ref,
  default_enabled,
  enabled,
  owner_user_id,
  risk_class,
  sunset_at,
  emergency_disabled,
  emergency_reason_code,
  changed_by_user_id,
  created_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'payments.kill_switch',
  'Emergency disable for outgoing payment side effects.',
  'kill_switch',
  'company',
  '00000000-0000-4000-8000-000000000001',
  FALSE,
  FALSE,
  '00000000-0000-4000-8000-000000000011',
  'high',
  DATE '2026-12-31',
  TRUE,
  'incident_lockdown',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  NOW()
)
ON CONFLICT (feature_flag_id) DO NOTHING;

INSERT INTO load_profiles (
  load_profile_id,
  company_id,
  profile_code,
  target_throughput_per_minute,
  observed_p95_ms,
  queue_recovery_seconds,
  status,
  recorded_by_user_id,
  recorded_at
)
VALUES (
  '14000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000001',
  'pilot_target',
  1200,
  180,
  45,
  'passed',
  '00000000-0000-4000-8000-000000000011',
  NOW()
)
ON CONFLICT (load_profile_id) DO NOTHING;

INSERT INTO restore_drills (
  restore_drill_id,
  company_id,
  drill_code,
  target_rto_minutes,
  target_rpo_minutes,
  actual_rto_minutes,
  actual_rpo_minutes,
  status,
  evidence_json,
  recorded_by_user_id,
  recorded_at
)
VALUES (
  '14000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000001',
  'daily_backup_restore',
  60,
  15,
  42,
  10,
  'passed',
  '{"restorePoint":"phase14-demo"}'::jsonb,
  '00000000-0000-4000-8000-000000000011',
  NOW()
)
ON CONFLICT (restore_drill_id) DO NOTHING;

INSERT INTO chaos_scenarios (
  chaos_scenario_id,
  company_id,
  scenario_code,
  failure_mode,
  queue_recovery_seconds,
  impact_summary,
  status,
  evidence_json,
  recorded_by_user_id,
  recorded_at
)
VALUES (
  '14000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000001',
  'worker_restart',
  'worker_process_crash',
  35,
  'Worker queue recovered within target window.',
  'executed',
  '{"deadLetterBacklog":0}'::jsonb,
  '00000000-0000-4000-8000-000000000011',
  NOW()
)
ON CONFLICT (chaos_scenario_id) DO NOTHING;

INSERT INTO emergency_disables (
  emergency_disable_id,
  company_id,
  flag_key,
  reason_code,
  requested_by_user_id,
  status,
  activated_at,
  expires_at,
  created_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000001',
  'payments.kill_switch',
  'incident_lockdown',
  '00000000-0000-4000-8000-000000000011',
  'active',
  NOW() - INTERVAL '10 minutes',
  NOW() + INTERVAL '110 minutes',
  NOW(),
  NOW()
)
ON CONFLICT (emergency_disable_id) DO NOTHING;
