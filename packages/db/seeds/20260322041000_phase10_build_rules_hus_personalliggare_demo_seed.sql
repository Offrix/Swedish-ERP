INSERT INTO hus_decisions (
  hus_decision_id,
  company_id,
  hus_claim_id,
  decision_code,
  approved_amount,
  decided_on,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010409',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010406',
    'accepted',
    3000.00,
    DATE '2026-03-18',
    'phase10_3_demo_seed'
  )
ON CONFLICT (hus_decision_id) DO NOTHING;

INSERT INTO hus_payouts (
  hus_payout_id,
  company_id,
  hus_claim_id,
  paid_amount,
  paid_on,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010410',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010406',
    3000.00,
    DATE '2026-03-22',
    'phase10_3_demo_seed'
  )
ON CONFLICT (hus_payout_id) DO NOTHING;

INSERT INTO hus_credit_adjustments (
  hus_credit_adjustment_id,
  company_id,
  hus_case_id,
  adjustment_amount,
  credited_on,
  reason_code,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010411',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010401',
    500.00,
    DATE '2026-03-25',
    'customer_credit_note',
    'phase10_3_demo_seed'
  )
ON CONFLICT (hus_credit_adjustment_id) DO NOTHING;

INSERT INTO hus_recoveries (
  hus_recovery_id,
  company_id,
  hus_case_id,
  recovery_amount,
  recovered_on,
  reason_code,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010412',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010401',
    500.00,
    DATE '2026-03-28',
    'skatteverket_recovery',
    'phase10_3_demo_seed'
  )
ON CONFLICT (hus_recovery_id) DO NOTHING;

INSERT INTO project_change_orders (
  project_change_order_id,
  company_id,
  project_id,
  work_order_id,
  scope_code,
  title,
  description,
  revenue_impact_amount,
  cost_impact_amount,
  schedule_impact_minutes,
  customer_approval_required_flag,
  customer_approved_at,
  quote_reference,
  status,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010611',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010102',
    '00000000-0000-4000-8000-000000010332',
    'change',
    'Retrofit scope expansion',
    'Demo quoted change order pending customer sign-off.',
    18000.00,
    9000.00,
    120,
    TRUE,
    NULL,
    'Q-2026-BETA-002',
    'quoted',
    'phase10_3_demo_seed'
  )
ON CONFLICT (project_change_order_id) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO construction_sites (
  construction_site_id,
  company_id,
  site_code,
  site_name,
  site_address,
  builder_org_no,
  project_id,
  estimated_total_cost_ex_vat,
  threshold_required_flag,
  registration_status,
  start_date,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010511',
    '00000000-0000-4000-8000-000000000001',
    'SITE-BETA-02',
    'Beta Retrofit Site',
    'Montagevägen 25, Uppsala',
    '5569876543',
    '00000000-0000-4000-8000-000000010102',
    450000.00,
    TRUE,
    'active',
    DATE '2026-03-23',
    'phase10_3_demo_seed'
  )
ON CONFLICT (construction_site_id) DO UPDATE
SET registration_status = EXCLUDED.registration_status,
    updated_at = NOW();

INSERT INTO construction_site_registrations (
  construction_site_registration_id,
  company_id,
  construction_site_id,
  registration_reference,
  status,
  registered_on,
  checklist_items_json,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010512',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010511',
    'PL-BETA-2026-002',
    'active',
    DATE '2026-03-23',
    '["site_created","builder_confirmed","active_notice_posted"]'::jsonb,
    'phase10_3_demo_seed'
  )
ON CONFLICT (construction_site_registration_id) DO NOTHING;

INSERT INTO attendance_events (
  attendance_event_id,
  company_id,
  construction_site_id,
  employment_id,
  worker_identity_type,
  worker_identity_value,
  full_name_snapshot,
  employer_org_no,
  contractor_org_no,
  event_type,
  event_timestamp,
  source_channel,
  device_id,
  offline_flag,
  geo_context_json,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010513',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010511',
    '00000000-0000-4000-8000-000000000723',
    'personnummer',
    '199001019999',
    'Erik Larsson',
    '5563334444',
    '5569876543',
    'check_in',
    TIMESTAMPTZ '2026-03-24T05:58:00Z',
    'mobile',
    'field-device-beta',
    TRUE,
    '{"lat":59.8586,"lng":17.6389}'::jsonb,
    'phase10_3_demo_seed'
  )
ON CONFLICT (attendance_event_id) DO NOTHING;

INSERT INTO attendance_corrections (
  attendance_correction_id,
  company_id,
  attendance_event_id,
  correction_reason,
  corrected_timestamp,
  corrected_event_type,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010514',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010513',
    'Offline client clock drift corrected by supervisor.',
    TIMESTAMPTZ '2026-03-24T06:00:00Z',
    'check_in',
    'phase10_3_demo_seed'
  )
ON CONFLICT (attendance_correction_id) DO NOTHING;

INSERT INTO attendance_events (
  attendance_event_id,
  company_id,
  construction_site_id,
  employment_id,
  worker_identity_type,
  worker_identity_value,
  full_name_snapshot,
  employer_org_no,
  contractor_org_no,
  event_type,
  event_timestamp,
  source_channel,
  device_id,
  offline_flag,
  geo_context_json,
  original_attendance_event_id,
  correction_reason,
  corrected_event_type,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010515',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010511',
    '00000000-0000-4000-8000-000000000723',
    'personnummer',
    '199001019999',
    'Erik Larsson',
    '5563334444',
    '5569876543',
    'correction',
    TIMESTAMPTZ '2026-03-24T06:00:00Z',
    'admin',
    NULL,
    FALSE,
    '{}'::jsonb,
    '00000000-0000-4000-8000-000000010513',
    'Offline client clock drift corrected by supervisor.',
    'check_in',
    'phase10_3_demo_seed'
  )
ON CONFLICT (attendance_event_id) DO NOTHING;

INSERT INTO attendance_exports (
  attendance_export_id,
  company_id,
  construction_site_id,
  export_type,
  export_date,
  event_count,
  correction_count,
  control_chain_hash,
  payload_json,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010516',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010511',
    'audit',
    DATE '2026-03-24',
    2,
    1,
    'phase10_3_demo_personalliggare_export_hash',
    '{"siteCode":"SITE-BETA-02","eventCount":2,"correctionCount":1}'::jsonb,
    'phase10_3_demo_seed'
  )
ON CONFLICT (attendance_export_id) DO NOTHING;

INSERT INTO attendance_audit_events (
  attendance_audit_event_id,
  company_id,
  construction_site_id,
  actor_id,
  action,
  entity_type,
  entity_id,
  project_id,
  correlation_id,
  explanation,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010517',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010511',
    'phase10_3_demo_seed',
    'personalliggare.attendance_corrected',
    'attendance_correction',
    '00000000-0000-4000-8000-000000010514',
    '00000000-0000-4000-8000-000000010102',
    'phase10_3_demo_corr_001',
    'Corrected an offline attendance event before audit export.',
    TIMESTAMPTZ '2026-03-24T06:05:00Z'
  )
ON CONFLICT (attendance_audit_event_id) DO NOTHING;
