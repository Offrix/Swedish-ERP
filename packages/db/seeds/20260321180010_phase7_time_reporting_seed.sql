INSERT INTO time_schedule_templates (
  time_schedule_template_id,
  company_id,
  schedule_template_code,
  display_name,
  timezone,
  active
)
VALUES
  (
    '00000000-0000-4000-8000-000000001811',
    '00000000-0000-4000-8000-000000000001',
    'office_day',
    'Office day schedule',
    'Europe/Stockholm',
    TRUE
  ),
  (
    '00000000-0000-4000-8000-000000001812',
    '00000000-0000-4000-8000-000000000001',
    'field_flex',
    'Field flex schedule',
    'Europe/Stockholm',
    TRUE
  )
ON CONFLICT (time_schedule_template_id) DO NOTHING;

INSERT INTO time_schedule_template_days (
  time_schedule_template_day_id,
  time_schedule_template_id,
  company_id,
  weekday,
  planned_minutes,
  ob_minutes,
  jour_minutes,
  standby_minutes,
  start_time,
  end_time,
  break_minutes
)
VALUES
  ('00000000-0000-4000-8000-000000001821', '00000000-0000-4000-8000-000000001811', '00000000-0000-4000-8000-000000000001', 1, 480, 0, 0, 0, '08:00', '17:00', 60),
  ('00000000-0000-4000-8000-000000001822', '00000000-0000-4000-8000-000000001811', '00000000-0000-4000-8000-000000000001', 2, 480, 0, 0, 0, '08:00', '17:00', 60),
  ('00000000-0000-4000-8000-000000001823', '00000000-0000-4000-8000-000000001811', '00000000-0000-4000-8000-000000000001', 3, 480, 0, 0, 0, '08:00', '17:00', 60),
  ('00000000-0000-4000-8000-000000001824', '00000000-0000-4000-8000-000000001811', '00000000-0000-4000-8000-000000000001', 4, 480, 0, 0, 0, '08:00', '17:00', 60),
  ('00000000-0000-4000-8000-000000001825', '00000000-0000-4000-8000-000000001811', '00000000-0000-4000-8000-000000000001', 5, 480, 0, 0, 0, '08:00', '17:00', 60),
  ('00000000-0000-4000-8000-000000001826', '00000000-0000-4000-8000-000000001812', '00000000-0000-4000-8000-000000000001', 1, 450, 0, 0, 0, '07:00', '15:30', 30),
  ('00000000-0000-4000-8000-000000001827', '00000000-0000-4000-8000-000000001812', '00000000-0000-4000-8000-000000000001', 2, 450, 0, 0, 0, '07:00', '15:30', 30),
  ('00000000-0000-4000-8000-000000001828', '00000000-0000-4000-8000-000000001812', '00000000-0000-4000-8000-000000000001', 3, 450, 0, 0, 0, '07:00', '15:30', 30),
  ('00000000-0000-4000-8000-000000001829', '00000000-0000-4000-8000-000000001812', '00000000-0000-4000-8000-000000000001', 4, 450, 30, 0, 30, '07:00', '15:30', 30),
  ('00000000-0000-4000-8000-000000001830', '00000000-0000-4000-8000-000000001812', '00000000-0000-4000-8000-000000000001', 5, 450, 30, 60, 30, '07:00', '15:30', 30)
ON CONFLICT (time_schedule_template_day_id) DO NOTHING;

INSERT INTO time_schedule_assignments (
  time_schedule_assignment_id,
  company_id,
  employment_id,
  time_schedule_template_id,
  valid_from,
  valid_to,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000001841',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000721',
    '00000000-0000-4000-8000-000000001811',
    '2026-01-01',
    NULL,
    'seed'
  ),
  (
    '00000000-0000-4000-8000-000000001842',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000722',
    '00000000-0000-4000-8000-000000001812',
    '2026-01-01',
    NULL,
    'seed'
  )
ON CONFLICT (time_schedule_assignment_id) DO NOTHING;

INSERT INTO time_clock_events (
  time_clock_event_id,
  company_id,
  employment_id,
  event_type,
  occurred_at,
  work_date,
  source_channel,
  project_id,
  activity_code,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000001851',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000722',
    'clock_in',
    '2026-02-05T06:55:00Z',
    '2026-02-05',
    'field_mobile',
    '00000000-0000-4000-8000-000000000205',
    'onsite_service',
    'seed'
  ),
  (
    '00000000-0000-4000-8000-000000001852',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000722',
    'clock_out',
    '2026-02-05T16:05:00Z',
    '2026-02-05',
    'field_mobile',
    '00000000-0000-4000-8000-000000000205',
    'onsite_service',
    'seed'
  )
ON CONFLICT (time_clock_event_id) DO NOTHING;

INSERT INTO time_entries (
  time_entry_id,
  company_id,
  employment_id,
  project_id,
  work_date,
  quantity,
  status,
  payload_json,
  activity_code,
  source_type,
  starts_at,
  ends_at,
  break_minutes,
  worked_minutes,
  scheduled_minutes,
  overtime_minutes,
  ob_minutes,
  jour_minutes,
  standby_minutes,
  flex_delta_minutes,
  comp_delta_minutes,
  time_schedule_template_id
)
VALUES (
  '00000000-0000-4000-8000-000000001861',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000722',
  '00000000-0000-4000-8000-000000000205',
  '2026-02-05',
  9.00,
  'submitted',
  '{"seed":"phase7_time","sourceClockEventIds":["00000000-0000-4000-8000-000000001851","00000000-0000-4000-8000-000000001852"]}'::jsonb,
  'onsite_service',
  'clock',
  '2026-02-05T06:55:00Z',
  '2026-02-05T16:05:00Z',
  30,
  540,
  450,
  60,
  30,
  0,
  30,
  90,
  0,
  '00000000-0000-4000-8000-000000001812'
)
ON CONFLICT (time_entry_id) DO NOTHING;

INSERT INTO time_balance_transactions (
  time_balance_transaction_id,
  company_id,
  employment_id,
  balance_type,
  effective_date,
  delta_minutes,
  source_type,
  source_id,
  explanation,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000001871',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000722',
    'flex_minutes',
    '2026-02-05',
    90,
    'time_entry',
    '00000000-0000-4000-8000-000000001861',
    'Field flex delta from seeded time entry.',
    'seed'
  ),
  (
    '00000000-0000-4000-8000-000000001872',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000722',
    'overtime_minutes',
    '2026-02-05',
    60,
    'time_entry',
    '00000000-0000-4000-8000-000000001861',
    'Seeded overtime from field assignment.',
    'seed'
  )
ON CONFLICT (time_balance_transaction_id) DO NOTHING;

INSERT INTO time_period_locks (
  time_period_lock_id,
  company_id,
  employment_id,
  starts_on,
  ends_on,
  reason_code,
  note,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000001881',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000721',
  '2026-01-01',
  '2026-01-31',
  'payroll_cutoff',
  'January 2026 office schedule is locked after payroll cutoff.',
  'seed'
)
ON CONFLICT (time_period_lock_id) DO NOTHING;
