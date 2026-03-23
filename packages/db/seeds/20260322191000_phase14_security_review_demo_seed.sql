INSERT INTO access_review_batches (
  review_batch_id,
  company_id,
  scope_type,
  scope_ref,
  generated_at,
  due_at,
  status,
  signed_off_by_user_id
)
VALUES (
  '14000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'company',
  '00000000-0000-4000-8000-000000000001',
  NOW(),
  CURRENT_DATE + INTERVAL '7 days',
  'in_review',
  NULL
)
ON CONFLICT (review_batch_id) DO NOTHING;

INSERT INTO access_review_findings (
  finding_id,
  review_batch_id,
  company_id,
  user_id,
  finding_code,
  severity,
  related_company_user_ids_json,
  decision
)
VALUES (
  '14000000-0000-4000-8000-000000000003',
  '14000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000011',
  'sod.admin_payroll_overlap',
  'critical',
  '["00000000-0000-4000-8000-000000000021"]'::jsonb,
  'pending'
)
ON CONFLICT (finding_id) DO NOTHING;

INSERT INTO break_glass_sessions (
  break_glass_id,
  company_id,
  incident_id,
  purpose_code,
  requested_actions_json,
  requested_by_user_id,
  approvals_json,
  status,
  activated_at,
  reviewed_at,
  closed_at,
  created_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  'INC-2026-03-22-001',
  'support_recovery',
  '["list_async_jobs","replay_job"]'::jsonb,
  '00000000-0000-4000-8000-000000000011',
  '[]'::jsonb,
  'requested',
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (break_glass_id) DO NOTHING;
