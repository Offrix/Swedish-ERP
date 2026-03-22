INSERT INTO customers (
  customer_id,
  company_id,
  customer_code,
  customer_no,
  display_name,
  legal_name,
  org_number,
  status,
  country_code,
  language_code,
  vat_status,
  base_currency_code,
  payment_terms_code,
  credit_limit,
  reminder_profile_code,
  allow_reminder_fee,
  allow_interest,
  allow_partial_delivery,
  blocked_for_invoicing,
  blocked_for_delivery,
  billing_address_json,
  delivery_address_json,
  peppol_id,
  peppol_scheme,
  default_ar_account_no,
  default_revenue_segment,
  project_dimension_required,
  import_source_key,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000005301',
  '00000000-0000-4000-8000-000000000001',
  'CUST-2001',
  'CUST-2001',
  'Scandi Retail Group AB',
  'Scandi Retail Group AB',
  '559122-3344',
  'active',
  'SE',
  'sv',
  'vat_registered',
  'SEK',
  'net_14',
  1500000.00,
  'enterprise',
  TRUE,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  '{"line1":"Klarabergsgatan 50","postal_code":"11121","city":"Stockholm","country_code":"SE"}'::jsonb,
  '{"line1":"Södra Hamngatan 28","postal_code":"41106","city":"Göteborg","country_code":"SE"}'::jsonb,
  '0007:5591223344',
  '0088',
  '1210',
  'RETAIL',
  TRUE,
  'import:erp_legacy:customer_887',
  '{"demo_tag":"phase5_ar_masterdata"}'::jsonb
)
ON CONFLICT (customer_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    legal_name = EXCLUDED.legal_name,
    org_number = EXCLUDED.org_number,
    status = EXCLUDED.status,
    payment_terms_code = EXCLUDED.payment_terms_code,
    credit_limit = EXCLUDED.credit_limit,
    reminder_profile_code = EXCLUDED.reminder_profile_code,
    billing_address_json = EXCLUDED.billing_address_json,
    delivery_address_json = EXCLUDED.delivery_address_json,
    payload_json = EXCLUDED.payload_json,
    updated_at = NOW();

INSERT INTO customer_contacts (
  customer_contact_id,
  company_id,
  customer_id,
  contact_no,
  role_code,
  full_name,
  email,
  phone,
  preferred_language_code,
  title,
  is_primary,
  status,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005311',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005301',
    'CONTACT-BILLING',
    'billing',
    'Emma Olsson',
    'ap@scandiretail.test',
    '+46703333333',
    'sv',
    'Finance Manager',
    TRUE,
    'active',
    '{"channel":"peppol"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005312',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005301',
    'CONTACT-CONTRACT',
    'contract',
    'Niklas Sundberg',
    'niklas.sundberg@scandiretail.test',
    '+46704444444',
    'sv',
    'Head of Procurement',
    FALSE,
    'active',
    '{"channel":"email"}'::jsonb
  )
ON CONFLICT (customer_contact_id) DO UPDATE
SET role_code = EXCLUDED.role_code,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    title = EXCLUDED.title,
    is_primary = EXCLUDED.is_primary,
    status = EXCLUDED.status,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO ar_items (
  ar_item_id,
  company_id,
  item_code,
  item_name,
  item_type,
  unit_code,
  status,
  vat_behavior_code,
  default_vat_code,
  default_revenue_account_no,
  dimensions_required_json,
  recurring_flag,
  project_bound_flag,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005321',
    '00000000-0000-4000-8000-000000000001',
    'SUB-PLATFORM-STD',
    'Plattformsabonnemang Standard',
    'subscription',
    'month',
    'active',
    'standard',
    'VAT_SE_DOMESTIC_25',
    '3310',
    '[]'::jsonb,
    TRUE,
    FALSE,
    '{"service_tier":"standard"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005322',
    '00000000-0000-4000-8000-000000000001',
    'SVC-ONBOARD-PROJ',
    'Projektimplementering',
    'project',
    'hour',
    'active',
    'standard',
    'VAT_SE_DOMESTIC_25',
    '3420',
    '["project_id","cost_center"]'::jsonb,
    FALSE,
    TRUE,
    '{"service_tier":"project"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005323',
    '00000000-0000-4000-8000-000000000001',
    'FEE-BILLING',
    'Faktureringsavgift',
    'fee',
    'ea',
    'active',
    'out_of_scope',
    NULL,
    '3520',
    '[]'::jsonb,
    FALSE,
    FALSE,
    '{"fee_type":"billing"}'::jsonb
  )
ON CONFLICT (ar_item_id) DO UPDATE
SET item_name = EXCLUDED.item_name,
    item_type = EXCLUDED.item_type,
    unit_code = EXCLUDED.unit_code,
    vat_behavior_code = EXCLUDED.vat_behavior_code,
    default_vat_code = EXCLUDED.default_vat_code,
    default_revenue_account_no = EXCLUDED.default_revenue_account_no,
    dimensions_required_json = EXCLUDED.dimensions_required_json,
    recurring_flag = EXCLUDED.recurring_flag,
    project_bound_flag = EXCLUDED.project_bound_flag,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO ar_price_lists (
  ar_price_list_id,
  company_id,
  price_list_code,
  price_list_name,
  currency_code,
  status,
  valid_from,
  valid_to,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005331',
    '00000000-0000-4000-8000-000000000001',
    'SEK-ENT-2026',
    'Enterprise prislista SEK',
    'SEK',
    'active',
    DATE '2026-01-01',
    NULL,
    '{"segment":"enterprise"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005332',
    '00000000-0000-4000-8000-000000000001',
    'SEK-ENT-2027',
    'Enterprise prislista SEK 2027',
    'SEK',
    'draft',
    DATE '2027-01-01',
    NULL,
    '{"segment":"enterprise_future"}'::jsonb
  )
ON CONFLICT (ar_price_list_id) DO UPDATE
SET price_list_name = EXCLUDED.price_list_name,
    status = EXCLUDED.status,
    valid_from = EXCLUDED.valid_from,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO ar_price_list_items (
  ar_price_list_item_id,
  ar_price_list_id,
  company_id,
  ar_item_id,
  valid_from,
  valid_to,
  unit_price,
  minimum_quantity,
  pricing_model_code,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005341',
    '00000000-0000-4000-8000-000000005331',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005321',
    DATE '2026-01-01',
    NULL,
    24900.0000,
    0,
    'fixed_price',
    '{"tier":"std"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005342',
    '00000000-0000-4000-8000-000000005331',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005322',
    DATE '2026-01-01',
    NULL,
    1450.0000,
    1,
    'usage',
    '{"tier":"project"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005343',
    '00000000-0000-4000-8000-000000005331',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005323',
    DATE '2026-01-01',
    NULL,
    49.0000,
    0,
    'fixed_price',
    '{"tier":"fee"}'::jsonb
  )
ON CONFLICT (ar_price_list_item_id) DO UPDATE
SET unit_price = EXCLUDED.unit_price,
    pricing_model_code = EXCLUDED.pricing_model_code,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO quotes (
  quote_id,
  company_id,
  customer_id,
  quote_no,
  version_number,
  status,
  valid_from,
  valid_to,
  currency_code,
  payment_terms_code,
  ar_price_list_id,
  generation_key,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000005351',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005301',
  'Q-2026-0100',
  2,
  'accepted',
  DATE '2026-02-01',
  DATE '2026-03-15',
  'SEK',
  'net_14',
  '00000000-0000-4000-8000-000000005331',
  'quote:Q-2026-0100:v2',
  '{"sales_case":"enterprise_rollout"}'::jsonb
)
ON CONFLICT (quote_id) DO UPDATE
SET version_number = EXCLUDED.version_number,
    status = EXCLUDED.status,
    valid_from = EXCLUDED.valid_from,
    valid_to = EXCLUDED.valid_to,
    ar_price_list_id = EXCLUDED.ar_price_list_id,
    generation_key = EXCLUDED.generation_key,
    payload_json = EXCLUDED.payload_json,
    updated_at = NOW();

INSERT INTO quote_versions (
  quote_version_id,
  quote_id,
  company_id,
  version_number,
  status,
  valid_from,
  valid_to,
  currency_code,
  payment_terms_code,
  discount_model_code,
  payload_json,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000005361',
    '00000000-0000-4000-8000-000000005351',
    '00000000-0000-4000-8000-000000000001',
    1,
    'sent',
    DATE '2026-02-01',
    DATE '2026-03-01',
    'SEK',
    'net_14',
    'line',
    '{"revision":"initial"}'::jsonb,
    'system'
  ),
  (
    '00000000-0000-4000-8000-000000005362',
    '00000000-0000-4000-8000-000000005351',
    '00000000-0000-4000-8000-000000000001',
    2,
    'accepted',
    DATE '2026-02-10',
    DATE '2026-03-15',
    'SEK',
    'net_14',
    'header',
    '{"revision":"discount_adjusted"}'::jsonb,
    'system'
  )
ON CONFLICT (quote_version_id) DO NOTHING;

INSERT INTO quote_version_lines (
  quote_version_line_id,
  quote_version_id,
  company_id,
  line_no,
  line_type,
  ar_item_id,
  description,
  quantity,
  unit_price,
  discount_percent,
  net_amount,
  vat_code,
  vat_rate,
  period_start,
  period_end,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005371',
    '00000000-0000-4000-8000-000000005362',
    '00000000-0000-4000-8000-000000000001',
    1,
    'item',
    '00000000-0000-4000-8000-000000005321',
    'Plattformsabonnemang 12 månader',
    12.0000,
    24900.0000,
    5.0000,
    283860.00,
    'VAT_SE_DOMESTIC_25',
    25.0000,
    DATE '2026-04-01',
    DATE '2027-03-31',
    '{"bundle":"platform"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005372',
    '00000000-0000-4000-8000-000000005362',
    '00000000-0000-4000-8000-000000000001',
    2,
    'item',
    '00000000-0000-4000-8000-000000005322',
    'Implementering 160 timmar',
    160.0000,
    1450.0000,
    0.0000,
    232000.00,
    'VAT_SE_DOMESTIC_25',
    25.0000,
    DATE '2026-04-01',
    DATE '2026-06-30',
    '{"bundle":"project"}'::jsonb
  )
ON CONFLICT (quote_version_line_id) DO NOTHING;

INSERT INTO contracts (
  contract_id,
  company_id,
  customer_id,
  quote_id,
  contract_no,
  status,
  starts_on,
  ends_on,
  currency_code,
  payment_terms_code,
  indexation_code,
  min_fee_amount,
  credit_rule_code,
  termination_policy_code,
  allow_partial_delivery,
  payload_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000005381',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005301',
  '00000000-0000-4000-8000-000000005351',
  'A-2026-0100',
  'active',
  DATE '2026-04-01',
  DATE '2027-03-31',
  'SEK',
  'net_14',
  'cpi_annually',
  24900.00,
  'strict',
  'notice_required',
  TRUE,
  '{"linked_quote_version":2}'::jsonb,
  'system'
)
ON CONFLICT (contract_id) DO UPDATE
SET status = EXCLUDED.status,
    starts_on = EXCLUDED.starts_on,
    ends_on = EXCLUDED.ends_on,
    min_fee_amount = EXCLUDED.min_fee_amount,
    credit_rule_code = EXCLUDED.credit_rule_code,
    payload_json = EXCLUDED.payload_json,
    updated_at = NOW();

INSERT INTO contract_versions (
  contract_version_id,
  contract_id,
  company_id,
  version_number,
  status,
  starts_on,
  ends_on,
  payload_json,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000005391',
    '00000000-0000-4000-8000-000000005381',
    '00000000-0000-4000-8000-000000000001',
    1,
    'active',
    DATE '2026-04-01',
    DATE '2027-03-31',
    '{"source":"demo","revision":"initial"}'::jsonb,
    'system'
  ),
  (
    '00000000-0000-4000-8000-000000005392',
    '00000000-0000-4000-8000-000000005381',
    '00000000-0000-4000-8000-000000000001',
    2,
    'active',
    DATE '2026-07-01',
    DATE '2027-03-31',
    '{"source":"demo","revision":"index_uplift"}'::jsonb,
    'system'
  )
ON CONFLICT (contract_version_id) DO NOTHING;

INSERT INTO contract_version_lines (
  contract_version_line_id,
  contract_version_id,
  company_id,
  line_no,
  ar_item_id,
  description,
  quantity,
  unit_price,
  billing_frequency_code,
  service_period_required,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005401',
    '00000000-0000-4000-8000-000000005392',
    '00000000-0000-4000-8000-000000000001',
    1,
    '00000000-0000-4000-8000-000000005321',
    'Plattformsabonnemang månatligen',
    1.0000,
    26145.0000,
    'monthly',
    TRUE,
    '{"line_group":"recurring"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005402',
    '00000000-0000-4000-8000-000000005392',
    '00000000-0000-4000-8000-000000000001',
    2,
    '00000000-0000-4000-8000-000000005322',
    'Projektimplementering engångsblock',
    80.0000,
    1500.0000,
    'milestone',
    TRUE,
    '{"line_group":"project"}'::jsonb
  )
ON CONFLICT (contract_version_line_id) DO NOTHING;

INSERT INTO invoice_plans (
  invoice_plan_id,
  company_id,
  contract_id,
  plan_code,
  status,
  frequency_code,
  start_on,
  end_on,
  next_run_on,
  generation_timezone,
  idempotency_scope_key,
  payload_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000005411',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005381',
  'PLAN-A-2026-0100',
  'active',
  'monthly',
  DATE '2026-04-01',
  DATE '2027-03-31',
  DATE '2026-04-01',
  'Europe/Stockholm',
  'invoice_plan:PLAN-A-2026-0100',
  '{"source":"demo"}'::jsonb,
  'system'
)
ON CONFLICT (invoice_plan_id) DO UPDATE
SET status = EXCLUDED.status,
    frequency_code = EXCLUDED.frequency_code,
    next_run_on = EXCLUDED.next_run_on,
    payload_json = EXCLUDED.payload_json,
    updated_at = NOW();

INSERT INTO invoice_plan_lines (
  invoice_plan_line_id,
  invoice_plan_id,
  company_id,
  sequence_no,
  planned_invoice_date,
  period_start,
  period_end,
  ar_item_id,
  contract_version_line_id,
  quantity,
  unit_price,
  line_amount,
  currency_code,
  status,
  generation_key,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005421',
    '00000000-0000-4000-8000-000000005411',
    '00000000-0000-4000-8000-000000000001',
    1,
    DATE '2026-04-01',
    DATE '2026-04-01',
    DATE '2026-04-30',
    '00000000-0000-4000-8000-000000005321',
    '00000000-0000-4000-8000-000000005401',
    1.0000,
    26145.0000,
    26145.00,
    'SEK',
    'generated',
    'invoice_plan:PLAN-A-2026-0100:line-1',
    '{"source":"demo","reason":"first_cycle"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005422',
    '00000000-0000-4000-8000-000000005411',
    '00000000-0000-4000-8000-000000000001',
    2,
    DATE '2026-05-01',
    DATE '2026-05-01',
    DATE '2026-05-31',
    '00000000-0000-4000-8000-000000005321',
    '00000000-0000-4000-8000-000000005401',
    1.0000,
    26145.0000,
    26145.00,
    'SEK',
    'planned',
    'invoice_plan:PLAN-A-2026-0100:line-2',
    '{"source":"demo"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005423',
    '00000000-0000-4000-8000-000000005411',
    '00000000-0000-4000-8000-000000000001',
    3,
    DATE '2026-06-30',
    DATE '2026-04-01',
    DATE '2026-06-30',
    '00000000-0000-4000-8000-000000005322',
    '00000000-0000-4000-8000-000000005402',
    80.0000,
    1500.0000,
    120000.00,
    'SEK',
    'planned',
    'invoice_plan:PLAN-A-2026-0100:line-3',
    '{"source":"demo","milestone":"implementation_wave_1"}'::jsonb
  )
ON CONFLICT (invoice_plan_line_id) DO UPDATE
SET planned_invoice_date = EXCLUDED.planned_invoice_date,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    line_amount = EXCLUDED.line_amount,
    status = EXCLUDED.status,
    generation_key = EXCLUDED.generation_key,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO ar_customer_import_batches (
  ar_customer_import_batch_id,
  company_id,
  source_channel,
  source_file_name,
  status,
  row_count,
  applied_count,
  failed_count,
  started_at,
  completed_at,
  summary_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000005431',
  '00000000-0000-4000-8000-000000000001',
  'manual_file',
  'customers_demo_import.csv',
  'partial',
  3,
  2,
  1,
  TIMESTAMPTZ '2026-03-21T11:30:00Z',
  TIMESTAMPTZ '2026-03-21T11:30:04Z',
  '{"note":"one failed row to exercise import review"}'::jsonb,
  'system'
)
ON CONFLICT (ar_customer_import_batch_id) DO NOTHING;

INSERT INTO ar_customer_import_rows (
  ar_customer_import_row_id,
  ar_customer_import_batch_id,
  company_id,
  row_no,
  external_key,
  status,
  customer_id,
  error_code,
  error_message,
  payload_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005441',
    '00000000-0000-4000-8000-000000005431',
    '00000000-0000-4000-8000-000000000001',
    1,
    'import:erp_legacy:customer_887',
    'applied',
    '00000000-0000-4000-8000-000000005301',
    NULL,
    NULL,
    '{"customer_no":"CUST-2001","org_number":"559122-3344"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005442',
    '00000000-0000-4000-8000-000000005431',
    '00000000-0000-4000-8000-000000000001',
    2,
    'import:erp_legacy:customer_901',
    'applied',
    '00000000-0000-4000-8000-000000005101',
    NULL,
    NULL,
    '{"customer_no":"CUST-1001","org_number":"556677-8899"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005443',
    '00000000-0000-4000-8000-000000005431',
    '00000000-0000-4000-8000-000000000001',
    3,
    'import:erp_legacy:customer_invalid',
    'failed',
    NULL,
    'invalid_org_number',
    'Organisation number failed validation for country SE',
    '{"customer_no":"CUST-ERR","org_number":"ABC"}'::jsonb
  )
ON CONFLICT (ar_customer_import_row_id) DO NOTHING;
