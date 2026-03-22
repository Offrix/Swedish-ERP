INSERT INTO leave_types (
  leave_type_id,
  company_id,
  leave_type_code,
  display_name,
  signal_type,
  requires_manager_approval,
  requires_supporting_document,
  active,
  created_by_actor_id
)
VALUES
  ('00000000-0000-4000-8000-000000000911', '00000000-0000-4000-8000-000000000001', 'sick_leave', 'Sjukfrånvaro', 'none', TRUE, FALSE, TRUE, 'seed'),
  ('00000000-0000-4000-8000-000000000912', '00000000-0000-4000-8000-000000000001', 'vacation', 'Semester', 'none', TRUE, FALSE, TRUE, 'seed'),
  ('00000000-0000-4000-8000-000000000913', '00000000-0000-4000-8000-000000000001', 'parental_leave', 'Föräldraledighet', 'parental_benefit', TRUE, FALSE, TRUE, 'seed'),
  ('00000000-0000-4000-8000-000000000914', '00000000-0000-4000-8000-000000000001', 'vab', 'VAB', 'temporary_parental_benefit', TRUE, FALSE, TRUE, 'seed')
ON CONFLICT (leave_type_id) DO NOTHING;

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
  approved_at,
  updated_at,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000000921',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000721',
  '00000000-0000-4000-8000-000000000711',
  'parental_leave',
  '00000000-0000-4000-8000-000000000913',
  'parental_leave',
  '2026-03-03',
  '2026-03-04',
  '202603',
  'employee_portal',
  'approved',
  '{"complete": true, "missingFields": []}'::jsonb,
  '00000000-0000-4000-8000-000000000723',
  NOW(),
  NOW(),
  NOW(),
  '{"days":[{"date":"2026-03-03","extentPercent":100},{"date":"2026-03-04","extentPercent":100}]}'::jsonb
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
  ('00000000-0000-4000-8000-000000000931', '00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000001', 'created', 'draft', 'Seeded leave entry.', 'seed', NOW()),
  ('00000000-0000-4000-8000-000000000932', '00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000001', 'submitted', 'submitted', 'Submitted for manager approval.', 'seed', NOW()),
  ('00000000-0000-4000-8000-000000000933', '00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000001', 'approved', 'approved', 'Approved by manager.', 'seed', NOW())
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
  ('00000000-0000-4000-8000-000000000941', '00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000711', '00000000-0000-4000-8000-000000000721', '202603', '2026-03-03', 1, 'parental_benefit', 100.00, NULL, TRUE),
  ('00000000-0000-4000-8000-000000000942', '00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000711', '00000000-0000-4000-8000-000000000721', '202603', '2026-03-04', 2, 'parental_benefit', 100.00, NULL, TRUE)
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
  '00000000-0000-4000-8000-000000000951',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000721',
  '202603',
  'signed',
  'March absence data locked after AGI sign-off.',
  'agi:202603:seed',
  'seed'
)
ON CONFLICT (leave_signal_lock_id) DO NOTHING;
