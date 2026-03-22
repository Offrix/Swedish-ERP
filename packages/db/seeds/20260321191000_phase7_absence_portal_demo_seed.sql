INSERT INTO leave_entries (
  leave_entry_id,
  company_id,
  employment_id,
  employee_id,
  leave_code,
  leave_type_id,
  leave_type_code,
  starts_on,
  ends_on,
  reporting_period,
  source_channel,
  status,
  signal_completeness_json,
  manager_employment_id,
  submitted_at,
  rejected_at,
  rejected_reason,
  updated_at,
  payload_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000000961',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000791',
    '00000000-0000-4000-8000-000000000781',
    'vab',
    '00000000-0000-4000-8000-000000000914',
    'vab',
    '2026-03-18',
    '2026-03-18',
    '202603',
    'employee_portal',
    'rejected',
    '{"complete": true, "missingFields": []}'::jsonb,
    '00000000-0000-4000-8000-000000000793',
    NOW(),
    NOW(),
    'Need exact child-care interval before submission.',
    NOW(),
    '{"days":[{"date":"2026-03-18","extentPercent":100,"note":"Initial VAB request."}]}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000962',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000791',
    '00000000-0000-4000-8000-000000000781',
    'vab',
    '00000000-0000-4000-8000-000000000914',
    'vab',
    '2026-03-19',
    '2026-03-20',
    '202603',
    'employee_portal',
    'approved',
    '{"complete": true, "missingFields": []}'::jsonb,
    '00000000-0000-4000-8000-000000000793',
    NOW(),
    NULL,
    NULL,
    NOW(),
    '{"days":[{"date":"2026-03-19","extentPercent":50,"note":"AM only."},{"date":"2026-03-20","extentPercent":100,"note":"Full day."}]}'::jsonb
  )
ON CONFLICT (leave_entry_id) DO NOTHING;

INSERT INTO leave_entry_events (
  leave_entry_event_id,
  leave_entry_id,
  company_id,
  event_type,
  status,
  note,
  actor_id,
  recorded_at
)
VALUES
  ('00000000-0000-4000-8000-000000000971', '00000000-0000-4000-8000-000000000961', '00000000-0000-4000-8000-000000000001', 'created', 'draft', 'Portal draft created.', 'demo', NOW()),
  ('00000000-0000-4000-8000-000000000972', '00000000-0000-4000-8000-000000000961', '00000000-0000-4000-8000-000000000001', 'submitted', 'submitted', 'Submitted to manager.', 'demo', NOW()),
  ('00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000961', '00000000-0000-4000-8000-000000000001', 'rejected', 'rejected', 'Need exact child-care interval before submission.', 'demo', NOW()),
  ('00000000-0000-4000-8000-000000000974', '00000000-0000-4000-8000-000000000962', '00000000-0000-4000-8000-000000000001', 'created', 'draft', 'Corrected portal draft created.', 'demo', NOW()),
  ('00000000-0000-4000-8000-000000000975', '00000000-0000-4000-8000-000000000962', '00000000-0000-4000-8000-000000000001', 'submitted', 'submitted', 'Corrected leave entry submitted.', 'demo', NOW()),
  ('00000000-0000-4000-8000-000000000976', '00000000-0000-4000-8000-000000000962', '00000000-0000-4000-8000-000000000001', 'approved', 'approved', 'Approved after corrected absence details.', 'demo', NOW())
ON CONFLICT (leave_entry_event_id) DO NOTHING;

INSERT INTO leave_signals (
  leave_signal_id,
  leave_entry_id,
  company_id,
  employee_id,
  employment_id,
  reporting_period,
  work_date,
  specification_no,
  signal_type,
  extent_percent,
  extent_hours,
  complete
)
VALUES
  ('00000000-0000-4000-8000-000000000981', '00000000-0000-4000-8000-000000000962', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000781', '00000000-0000-4000-8000-000000000791', '202603', '2026-03-19', 1, 'temporary_parental_benefit', 50.00, NULL, TRUE),
  ('00000000-0000-4000-8000-000000000982', '00000000-0000-4000-8000-000000000962', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000781', '00000000-0000-4000-8000-000000000791', '202603', '2026-03-20', 2, 'temporary_parental_benefit', 100.00, NULL, TRUE)
ON CONFLICT (leave_signal_id) DO NOTHING;

INSERT INTO leave_signal_locks (
  leave_signal_lock_id,
  company_id,
  employment_id,
  reporting_period,
  lock_state,
  note,
  source_reference,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000000991',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000791',
  '202604',
  'ready_for_sign',
  'April absence package staged for AGI sign-off.',
  'agi:202604:demo',
  'demo'
)
ON CONFLICT (leave_signal_lock_id) DO NOTHING;
