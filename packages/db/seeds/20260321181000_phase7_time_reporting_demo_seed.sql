INSERT INTO time_schedule_templates (
  time_schedule_template_id,
  company_id,
  schedule_template_code,
  display_name,
  timezone,
  active
)
VALUES (
  '00000000-0000-4000-8000-000000001911',
  '00000000-0000-4000-8000-000000000001',
  'shift_ob_jour',
  'Shift schedule with OB and jour',
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
  ('00000000-0000-4000-8000-000000001921', '00000000-0000-4000-8000-000000001911', '00000000-0000-4000-8000-000000000001', 4, 480, 120, 60, 0, '12:00', '21:00', 60),
  ('00000000-0000-4000-8000-000000001922', '00000000-0000-4000-8000-000000001911', '00000000-0000-4000-8000-000000000001', 5, 480, 120, 60, 0, '12:00', '21:00', 60)
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
VALUES (
  '00000000-0000-4000-8000-000000001931',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000791',
  '00000000-0000-4000-8000-000000001911',
  '2026-03-01',
  NULL,
  'demo'
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
    '00000000-0000-4000-8000-000000001941',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000791',
    'clock_in',
    '2026-03-12T11:55:00Z',
    '2026-03-12',
    'field_mobile',
    '00000000-0000-4000-8000-000000000205',
    'payroll_close',
    'demo'
  ),
  (
    '00000000-0000-4000-8000-000000001942',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000791',
    'clock_out',
    '2026-03-12T22:05:00Z',
    '2026-03-12',
    'field_mobile',
    '00000000-0000-4000-8000-000000000205',
    'payroll_close',
    'demo'
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
  '00000000-0000-4000-8000-000000001951',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000791',
  '00000000-0000-4000-8000-000000000205',
  '2026-03-12',
  10.00,
  'submitted',
  '{"demo":"phase7_time","sourceClockEventIds":["00000000-0000-4000-8000-000000001941","00000000-0000-4000-8000-000000001942"]}'::jsonb,
  'payroll_close',
  'clock',
  '2026-03-12T11:55:00Z',
  '2026-03-12T22:05:00Z',
  30,
  580,
  480,
  60,
  120,
  60,
  0,
  100,
  30,
  '00000000-0000-4000-8000-000000001911'
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
    '00000000-0000-4000-8000-000000001961',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000791',
    'flex_minutes',
    '2026-03-12',
    100,
    'time_entry',
    '00000000-0000-4000-8000-000000001951',
    'Demo flex delta from shift entry.',
    'demo'
  ),
  (
    '00000000-0000-4000-8000-000000001962',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000791',
    'comp_minutes',
    '2026-03-12',
    30,
    'time_entry',
    '00000000-0000-4000-8000-000000001951',
    'Demo comp accrual from shift entry.',
    'demo'
  ),
  (
    '00000000-0000-4000-8000-000000001963',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000791',
    'overtime_minutes',
    '2026-03-12',
    60,
    'time_entry',
    '00000000-0000-4000-8000-000000001951',
    'Demo overtime from shift entry.',
    'demo'
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
  '00000000-0000-4000-8000-000000001971',
  '00000000-0000-4000-8000-000000000001',
  NULL,
  '2026-02-01',
  '2026-02-28',
  'payroll_submission',
  'Company-wide February period locked after payroll submission.',
  'demo'
)
ON CONFLICT (time_period_lock_id) DO NOTHING;
