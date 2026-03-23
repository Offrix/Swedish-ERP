INSERT INTO support_cases (
  support_case_id,
  company_id,
  requester_json,
  category,
  severity,
  status,
  owner_user_id,
  related_object_refs_json,
  policy_scope,
  approved_actions_json,
  created_by_user_id,
  created_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"channel":"internal","requesterId":"00000000-0000-4000-8000-000000000011"}'::jsonb,
  'auth_debug',
  'high',
  'open',
  '00000000-0000-4000-8000-000000000011',
  '[]'::jsonb,
  'support_standard',
  '["plan_job_replay"]'::jsonb,
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  NOW()
)
ON CONFLICT (support_case_id) DO NOTHING;
