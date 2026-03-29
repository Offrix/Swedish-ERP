INSERT INTO hus_cases (
  hus_case_id,
  company_id,
  case_reference,
  customer_id,
  project_id,
  customer_invoice_id,
  service_type_code,
  work_completed_on,
  currency_code,
  rule_year,
  status,
  total_gross_amount,
  total_eligible_labor_amount,
  preliminary_reduction_amount,
  customer_share_amount,
  paid_customer_amount,
  outstanding_customer_share_amount,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010401',
    '00000000-0000-4000-8000-000000000001',
    'HUS-2026-0001',
    '00000000-0000-4000-8000-000000005101',
    '00000000-0000-4000-8000-000000010101',
    '00000000-0000-4000-8000-000000005511',
    'rot',
    DATE '2026-03-10',
    'SEK',
    2026,
    'customer_paid',
    15000.00,
    10000.00,
    3000.00,
    12000.00,
    12000.00,
    0.00,
    'phase10_3_seed'
  )
ON CONFLICT (hus_case_id) DO UPDATE
SET status = EXCLUDED.status,
    total_gross_amount = EXCLUDED.total_gross_amount,
    total_eligible_labor_amount = EXCLUDED.total_eligible_labor_amount,
    preliminary_reduction_amount = EXCLUDED.preliminary_reduction_amount,
    customer_share_amount = EXCLUDED.customer_share_amount,
    paid_customer_amount = EXCLUDED.paid_customer_amount,
    outstanding_customer_share_amount = EXCLUDED.outstanding_customer_share_amount,
    updated_at = NOW();

INSERT INTO hus_case_buyers (
  hus_case_buyer_id,
  hus_case_id,
  buyer_index,
  full_name,
  personal_identity_no,
  ownership_share_ratio,
  reduction_share_amount,
  customer_share_amount
)
VALUES
  (
    '00000000-0000-4000-8000-000000010402',
    '00000000-0000-4000-8000-000000010401',
    1,
    'Anna Andersson',
    '197501019991',
    1.000000,
    3000.00,
    12000.00
  )
ON CONFLICT (hus_case_buyer_id) DO NOTHING;

INSERT INTO hus_service_lines (
  hus_service_line_id,
  hus_case_id,
  line_no,
  description,
  service_type_code,
  labor_amount,
  material_amount,
  other_amount,
  eligible_labor_amount,
  preliminary_reduction_amount,
  gross_amount
)
VALUES
  (
    '00000000-0000-4000-8000-000000010403',
    '00000000-0000-4000-8000-000000010401',
    1,
    'On-site installation work',
    'rot',
    10000.00,
    5000.00,
    0.00,
    10000.00,
    3000.00,
    15000.00
  )
ON CONFLICT (hus_service_line_id) DO NOTHING;

INSERT INTO hus_classification_decisions (
  hus_classification_decision_id,
  hus_case_id,
  rule_year,
  decision_hash,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010404',
    '00000000-0000-4000-8000-000000010401',
    2026,
    'phase10_3_seed_hus_classification_hash',
    'phase10_3_seed'
  )
ON CONFLICT (hus_classification_decision_id) DO NOTHING;

INSERT INTO hus_customer_payments (
  hus_customer_payment_id,
  company_id,
  hus_case_id,
  paid_amount,
  paid_on,
  payment_channel,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010405',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010401',
    12000.00,
    DATE '2026-03-15',
    'bankgiro',
    'phase10_3_seed'
  )
ON CONFLICT (hus_customer_payment_id) DO NOTHING;

INSERT INTO hus_claims (
  hus_claim_id,
  company_id,
  customer_invoice_id,
  hus_case_id,
  claim_type,
  status,
  version_no,
  requested_amount,
  transport_type,
  submitted_on,
  payload_hash,
  created_by_actor_id,
  payload_json,
  updated_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010406',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005511',
    '00000000-0000-4000-8000-000000010401',
    'rot',
    'claim_submitted',
    1,
    3000.00,
    'json',
    DATE '2026-03-16',
    'phase10_3_seed_hus_claim_hash',
    'phase10_3_seed',
    '{"requestedAmount":3000,"transportType":"json"}'::jsonb,
    NOW()
  )
ON CONFLICT (hus_claim_id) DO UPDATE
SET hus_case_id = EXCLUDED.hus_case_id,
    status = EXCLUDED.status,
    version_no = EXCLUDED.version_no,
    requested_amount = EXCLUDED.requested_amount,
    transport_type = EXCLUDED.transport_type,
    submitted_on = EXCLUDED.submitted_on,
    payload_hash = EXCLUDED.payload_hash,
    created_by_actor_id = EXCLUDED.created_by_actor_id,
    payload_json = EXCLUDED.payload_json,
    updated_at = NOW();

INSERT INTO hus_claim_versions (
  hus_claim_version_id,
  hus_claim_id,
  version_no,
  payload_json,
  payload_hash
)
VALUES
  (
    '00000000-0000-4000-8000-000000010407',
    '00000000-0000-4000-8000-000000010406',
    1,
    '{"requestedAmount":3000,"buyers":[{"personalIdentityNo":"197501019991"}]}'::jsonb,
    'phase10_3_seed_hus_claim_hash'
  )
ON CONFLICT (hus_claim_version_id) DO NOTHING;

INSERT INTO hus_claim_status_events (
  hus_claim_status_event_id,
  hus_claim_id,
  event_code,
  payload_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000010408',
    '00000000-0000-4000-8000-000000010406',
    'claim_submitted',
    '{"submittedOn":"2026-03-16"}'::jsonb
  )
ON CONFLICT (hus_claim_status_event_id) DO NOTHING;

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
    '00000000-0000-4000-8000-000000010601',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010101',
    '00000000-0000-4000-8000-000000010331',
    'addition',
    'Additional cable routing',
    'Customer-approved extra cable routing for the installation work order.',
    25000.00,
    12000.00,
    180,
    TRUE,
    DATE '2026-03-18',
    'Q-2026-ALPHA-001',
    'approved',
    'phase10_3_seed'
  )
ON CONFLICT (project_change_order_id) DO UPDATE
SET status = EXCLUDED.status,
    customer_approved_at = EXCLUDED.customer_approved_at,
    updated_at = NOW();

INSERT INTO vat_decisions (
  vat_decision_id,
  company_id,
  source_type,
  source_id,
  decision_code,
  rule_pack_id,
  explanation_json,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000010602',
    '00000000-0000-4000-8000-000000000001',
    'PROJECT_CHANGE_ORDER',
    '00000000-0000-4000-8000-000000010601',
    'VAT_SE_RC_BUILD_SELL',
    'vat-se-2026.3',
    '["construction service","reverse charge sale"]'::jsonb,
    TIMESTAMPTZ '2026-03-18T09:00:00Z'
  )
ON CONFLICT (vat_decision_id) DO NOTHING;

INSERT INTO project_build_vat_assessments (
  project_build_vat_assessment_id,
  company_id,
  project_id,
  source_document_id,
  source_document_type,
  description,
  buyer_country,
  buyer_type,
  buyer_vat_no,
  buyer_vat_number,
  buyer_vat_number_status,
  buyer_is_taxable_person,
  buyer_build_sector_flag,
  buyer_resells_construction_services_flag,
  reverse_charge_flag,
  invoice_date,
  delivery_date,
  line_amount_ex_vat,
  vat_rate,
  vat_code_candidate,
  vat_decision_id,
  vat_code,
  decision_category,
  booking_template_code,
  declaration_box_codes,
  invoice_text_requirements,
  explanation_json,
  warnings_json,
  review_required_flag,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010603',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010101',
    '00000000-0000-4000-8000-000000010601',
    'project_change_order',
    'Construction reverse-charge assessment for approved change order.',
    'SE',
    'company',
    'SE556677889901',
    'SE556677889901',
    'valid',
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    DATE '2026-03-18',
    DATE '2026-03-18',
    25000.00,
    25.00,
    'VAT_SE_RC_BUILD_SELL',
    '00000000-0000-4000-8000-000000010602',
    'VAT_SE_RC_BUILD_SELL',
    'construction_reverse_charge_sale',
    'vat_se_rc_build_sell',
    '["41"]'::jsonb,
    '["buyer_vat_number_required","reverse_charge_invoice_text_required"]'::jsonb,
    '["construction service","reverse charge sale"]'::jsonb,
    '[]'::jsonb,
    FALSE,
    'phase10_3_seed'
  )
ON CONFLICT (project_build_vat_assessment_id) DO NOTHING;

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
    '00000000-0000-4000-8000-000000010501',
    '00000000-0000-4000-8000-000000000001',
    'SITE-ALPHA-01',
    'Alpha Renovation Site',
    'Bygggatan 10, Stockholm',
    '5561234567',
    '00000000-0000-4000-8000-000000010101',
    250000.00,
    TRUE,
    'registered',
    DATE '2026-03-20',
    'phase10_3_seed'
  )
ON CONFLICT (construction_site_id) DO UPDATE
SET registration_status = EXCLUDED.registration_status,
    threshold_required_flag = EXCLUDED.threshold_required_flag,
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
    '00000000-0000-4000-8000-000000010502',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010501',
    'PL-ALPHA-2026-001',
    'registered',
    DATE '2026-03-20',
    '["site_created","builder_confirmed","notice_posted"]'::jsonb,
    'phase10_3_seed'
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
    '00000000-0000-4000-8000-000000010503',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010501',
    '00000000-0000-4000-8000-000000000722',
    'personnummer',
    '198902029999',
    'Sara Nilsson',
    '5561112227',
    '5561234567',
    'check_in',
    TIMESTAMPTZ '2026-03-21T06:45:00Z',
    'mobile',
    'field-device-alpha',
    FALSE,
    '{"lat":59.3293,"lng":18.0686}'::jsonb,
    'phase10_3_seed'
  )
ON CONFLICT (attendance_event_id) DO NOTHING;

INSERT INTO kiosk_devices (
  kiosk_device_id,
  company_id,
  construction_site_id,
  device_code,
  display_name,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000010504',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010501',
    'KIOSK-ALPHA-01',
    'Alpha Site Gate Kiosk',
    'phase10_3_seed'
  )
ON CONFLICT (kiosk_device_id) DO NOTHING;

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
    '00000000-0000-4000-8000-000000010505',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010501',
    'daily',
    DATE '2026-03-21',
    1,
    0,
    'phase10_3_seed_personalliggare_export_hash',
    '{"siteCode":"SITE-ALPHA-01","eventCount":1}'::jsonb,
    'phase10_3_seed'
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
    '00000000-0000-4000-8000-000000010506',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000010501',
    'phase10_3_seed',
    'personalliggare.export.created',
    'attendance_export',
    '00000000-0000-4000-8000-000000010505',
    '00000000-0000-4000-8000-000000010101',
    'phase10_3_seed_corr_001',
    'Created the baseline attendance export for build verification.',
    TIMESTAMPTZ '2026-03-21T17:00:00Z'
  )
ON CONFLICT (attendance_audit_event_id) DO NOTHING;
