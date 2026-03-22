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
  ('00000000-0000-4000-8000-000000010301','00000000-0000-4000-8000-000000000001','MAIN-WH','Main Warehouse','warehouse',NULL,TRUE,'phase10_2_seed'),
  ('00000000-0000-4000-8000-000000010302','00000000-0000-4000-8000-000000000001','TRUCK-01','Field Truck 01','truck',NULL,TRUE,'phase10_2_seed')
ON CONFLICT (inventory_location_id) DO UPDATE
SET location_code = EXCLUDED.location_code,
    display_name = EXCLUDED.display_name,
    location_type = EXCLUDED.location_type,
    project_id = EXCLUDED.project_id,
    active = EXCLUDED.active,
    updated_at = NOW();

INSERT INTO inventory_items (
  inventory_item_id,
  company_id,
  item_code,
  display_name,
  unit_code,
  ar_item_id,
  sales_unit_price_amount,
  active,
  created_by_actor_id
)
VALUES
  ('00000000-0000-4000-8000-000000010311','00000000-0000-4000-8000-000000000001','MAT-CABLE','Installation cable','m','00000000-0000-4000-8000-000000005122',45.00,TRUE,'phase10_2_seed')
ON CONFLICT (inventory_item_id) DO UPDATE
SET item_code = EXCLUDED.item_code,
    display_name = EXCLUDED.display_name,
    unit_code = EXCLUDED.unit_code,
    ar_item_id = EXCLUDED.ar_item_id,
    sales_unit_price_amount = EXCLUDED.sales_unit_price_amount,
    active = EXCLUDED.active,
    updated_at = NOW();

INSERT INTO inventory_balances (
  inventory_balance_id,
  company_id,
  inventory_item_id,
  inventory_location_id,
  on_hand_quantity,
  reserved_quantity,
  updated_by_actor_id
)
VALUES
  ('00000000-0000-4000-8000-000000010321','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010311','00000000-0000-4000-8000-000000010301',250.0000,0.0000,'phase10_2_seed'),
  ('00000000-0000-4000-8000-000000010322','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010311','00000000-0000-4000-8000-000000010302',20.0000,0.0000,'phase10_2_seed')
ON CONFLICT (inventory_item_id, inventory_location_id) DO UPDATE
SET on_hand_quantity = EXCLUDED.on_hand_quantity,
    reserved_quantity = EXCLUDED.reserved_quantity,
    updated_by_actor_id = EXCLUDED.updated_by_actor_id,
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
    '00000000-0000-4000-8000-000000010331',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010101',
    '00000000-0000-4000-8000-000000005101',
    'WO-2026-0001',
    'Install site equipment',
    'Field demo work order',
    'installation',
    'high',
    'dispatched',
    TIMESTAMPTZ '2026-03-24T07:00:00Z',
    TIMESTAMPTZ '2026-03-24T11:00:00Z',
    0,
    '00000000-0000-4000-8000-000000005121',
    1250.00,
    TRUE,
    'pending',
    NULL,
    1,
    'phase10_2_seed',
    '{"source":"phase10_2_seed","mobileReady":true}'::jsonb,
    TIMESTAMPTZ '2026-03-22T08:00:00Z',
    TIMESTAMPTZ '2026-03-22T08:00:00Z'
  )
ON CONFLICT (work_order_id) DO UPDATE
SET customer_id = EXCLUDED.customer_id,
    work_order_number = EXCLUDED.work_order_number,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    service_type_code = EXCLUDED.service_type_code,
    priority_code = EXCLUDED.priority_code,
    status = EXCLUDED.status,
    scheduled_start_at = EXCLUDED.scheduled_start_at,
    scheduled_end_at = EXCLUDED.scheduled_end_at,
    labor_minutes = EXCLUDED.labor_minutes,
    labor_item_id = EXCLUDED.labor_item_id,
    labor_rate_amount = EXCLUDED.labor_rate_amount,
    signature_required = EXCLUDED.signature_required,
    signature_status = EXCLUDED.signature_status,
    customer_invoice_id = EXCLUDED.customer_invoice_id,
    version_no = EXCLUDED.version_no,
    created_by_actor_id = EXCLUDED.created_by_actor_id,
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
    '00000000-0000-4000-8000-000000010341',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010331',
    '00000000-0000-4000-8000-000000000722',
    TIMESTAMPTZ '2026-03-24T07:00:00Z',
    TIMESTAMPTZ '2026-03-24T11:00:00Z',
    'planned',
    'phase10_2_seed'
  )
ON CONFLICT (dispatch_assignment_id) DO UPDATE
SET employment_id = EXCLUDED.employment_id,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    status = EXCLUDED.status,
    updated_at = NOW();

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
    '00000000-0000-4000-8000-000000010351',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010331',
    'dispatch_created',
    '{"dispatchAssignmentId":"00000000-0000-4000-8000-000000010341","source":"phase10_2_seed"}'::jsonb,
    TIMESTAMPTZ '2026-03-22T08:01:00Z'
  )
ON CONFLICT (field_event_id) DO NOTHING;
