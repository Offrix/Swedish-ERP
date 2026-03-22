INSERT INTO inventory_locations (
  inventory_location_id,
  company_id,
  location_code,
  display_name,
  location_type,
  project_id,
  active,
  created_by_actor_id
)
VALUES
  ('00000000-0000-4000-8000-000000010303','00000000-0000-4000-8000-000000000001','SITE-P-ALPHA','Site Alpha Container','site','00000000-0000-4000-8000-000000010101',TRUE,'phase10_2_demo_seed')
ON CONFLICT (inventory_location_id) DO UPDATE
SET location_code = EXCLUDED.location_code,
    display_name = EXCLUDED.display_name,
    location_type = EXCLUDED.location_type,
    project_id = EXCLUDED.project_id,
    active = EXCLUDED.active,
    updated_at = NOW();

INSERT INTO work_orders (
  work_order_id,
  company_id,
  project_id,
  customer_id,
  work_order_number,
  display_name,
  description,
  service_type_code,
  priority_code,
  status,
  scheduled_start_at,
  scheduled_end_at,
  actual_started_at,
  actual_ended_at,
  labor_minutes,
  labor_item_id,
  labor_rate_amount,
  signature_required,
  signature_status,
  customer_invoice_id,
  version_no,
  created_by_actor_id,
  payload_json,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010332',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010102',
    '00000000-0000-4000-8000-000000005102',
    'WO-2026-0002',
    'Field retrofit beta',
    'Demo completed field work order for mobile replay and signature',
    'retrofit',
    'urgent',
    'completed',
    TIMESTAMPTZ '2026-03-25T06:00:00Z',
    TIMESTAMPTZ '2026-03-25T10:00:00Z',
    TIMESTAMPTZ '2026-03-25T06:18:00Z',
    TIMESTAMPTZ '2026-03-25T10:12:00Z',
    234,
    '00000000-0000-4000-8000-000000005121',
    1400.00,
    TRUE,
    'captured',
    NULL,
    4,
    'phase10_2_demo_seed',
    '{"source":"phase10_2_demo_seed","scenario":"completed_work_order"}'::jsonb,
    TIMESTAMPTZ '2026-03-24T05:00:00Z',
    TIMESTAMPTZ '2026-03-25T10:12:00Z'
  )
ON CONFLICT (work_order_id) DO UPDATE
SET status = EXCLUDED.status,
    actual_started_at = EXCLUDED.actual_started_at,
    actual_ended_at = EXCLUDED.actual_ended_at,
    labor_minutes = EXCLUDED.labor_minutes,
    signature_status = EXCLUDED.signature_status,
    version_no = EXCLUDED.version_no,
    payload_json = EXCLUDED.payload_json,
    updated_at = NOW();

INSERT INTO field_dispatch_assignments (
  dispatch_assignment_id,
  company_id,
  work_order_id,
  employment_id,
  starts_at,
  ends_at,
  status,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010342',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010332',
    '00000000-0000-4000-8000-000000000722',
    TIMESTAMPTZ '2026-03-25T06:00:00Z',
    TIMESTAMPTZ '2026-03-25T10:00:00Z',
    'completed',
    'phase10_2_demo_seed'
  )
ON CONFLICT (dispatch_assignment_id) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO field_material_withdrawals (
  material_withdrawal_id,
  company_id,
  work_order_id,
  project_id,
  inventory_item_id,
  inventory_location_id,
  quantity,
  source_channel,
  note,
  created_by_actor_id,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010361',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010332',
    '00000000-0000-4000-8000-000000010102',
    '00000000-0000-4000-8000-000000010311',
    '00000000-0000-4000-8000-000000010301',
    12.0000,
    'mobile',
    'Demo offline withdrawal replayed to project beta.',
    'phase10_2_demo_seed',
    TIMESTAMPTZ '2026-03-25T07:10:00Z'
  )
ON CONFLICT (material_withdrawal_id) DO NOTHING;

INSERT INTO field_customer_signatures (
  field_customer_signature_id,
  company_id,
  work_order_id,
  signer_name,
  signed_at,
  signature_text,
  signature_hash,
  status,
  captured_by_actor_id,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010371',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010332',
    'Johan Berg',
    TIMESTAMPTZ '2026-03-25T10:11:00Z',
    'Signed onsite after completed retrofit demo.',
    'phase10_2_demo_signature_hash',
    'captured',
    'phase10_2_demo_seed',
    TIMESTAMPTZ '2026-03-25T10:11:00Z'
  )
ON CONFLICT (field_customer_signature_id) DO NOTHING;

INSERT INTO field_sync_envelopes (
  field_sync_envelope_id,
  company_id,
  client_mutation_id,
  client_device_id,
  client_user_id,
  object_type,
  local_object_id,
  server_object_id,
  mutation_type,
  base_server_version,
  merge_strategy,
  payload_hash,
  payload_json,
  sync_status,
  last_error_code,
  created_at,
  applied_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010381',
    '00000000-0000-4000-8000-000000000001',
    'demo-field-sync-001',
    'field-demo-device',
    'phase10_2_demo_seed',
    'field_material_withdrawal',
    'local-withdrawal-001',
    '00000000-0000-4000-8000-000000010361',
    'material_withdrawal.create',
    3,
    'manual_resolution',
    'phase10_2_demo_payload_hash',
    '{"workOrderId":"00000000-0000-4000-8000-000000010332","inventoryItemId":"00000000-0000-4000-8000-000000010311","inventoryLocationId":"00000000-0000-4000-8000-000000010301","quantity":12}'::jsonb,
    'synced',
    NULL,
    TIMESTAMPTZ '2026-03-25T07:09:00Z',
    TIMESTAMPTZ '2026-03-25T07:10:00Z'
  )
ON CONFLICT (company_id, client_mutation_id) DO UPDATE
SET server_object_id = EXCLUDED.server_object_id,
    sync_status = EXCLUDED.sync_status,
    payload_json = EXCLUDED.payload_json,
    applied_at = EXCLUDED.applied_at;

UPDATE inventory_balances
SET on_hand_quantity = 238.0000,
    updated_by_actor_id = 'phase10_2_demo_seed',
    updated_at = NOW()
WHERE inventory_balance_id = '00000000-0000-4000-8000-000000010321';

INSERT INTO field_events (
  field_event_id,
  company_id,
  work_order_id,
  event_code,
  payload_json,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010391',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010332',
    'mobile_sync_completed',
    '{"fieldSyncEnvelopeId":"00000000-0000-4000-8000-000000010381","source":"phase10_2_demo_seed"}'::jsonb,
    TIMESTAMPTZ '2026-03-25T07:10:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000010392',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010332',
    'customer_signature_captured',
    '{"fieldCustomerSignatureId":"00000000-0000-4000-8000-000000010371","source":"phase10_2_demo_seed"}'::jsonb,
    TIMESTAMPTZ '2026-03-25T10:11:00Z'
  )
ON CONFLICT (field_event_id) DO NOTHING;
