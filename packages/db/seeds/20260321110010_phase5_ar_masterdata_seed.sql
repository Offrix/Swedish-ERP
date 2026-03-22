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
VALUES
  (
    '00000000-0000-4000-8000-000000005101',
    '00000000-0000-4000-8000-000000000001',
    'CUST-1001',
    'CUST-1001',
    'Nordic Property Services AB',
    'Nordic Property Services AB',
    '556677-8899',
    'active',
    'SE',
    'sv',
    'vat_registered',
    'SEK',
    'net_30',
    250000.00,
    'standard',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    '{"line1":"Sveavägen 10","postal_code":"11157","city":"Stockholm","country_code":"SE"}'::jsonb,
    '{"line1":"Industrigatan 2","postal_code":"43153","city":"Mölndal","country_code":"SE"}'::jsonb,
    '0007:5566778899',
    '0088',
    '1210',
    'FACILITY',
    FALSE,
    'crm:nordic-property-services',
    '{"onboarding_phase":"phase5_1_seed"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005102',
    '00000000-0000-4000-8000-000000000001',
    'CUST-1002',
    'CUST-1002',
    'BuildFast Entreprenad AB',
    'BuildFast Entreprenad AB',
    '559011-2233',
    'active',
    'SE',
    'sv',
    'vat_registered',
    'SEK',
    'net_20',
    400000.00,
    'construction',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    '{"line1":"Byggvägen 44","postal_code":"41755","city":"Göteborg","country_code":"SE"}'::jsonb,
    '{"line1":"Byggvägen 44","postal_code":"41755","city":"Göteborg","country_code":"SE"}'::jsonb,
    '0007:5590112233',
    '0088',
    '1210',
    'CONSTRUCTION',
    TRUE,
    'crm:buildfast-entreprenad',
    '{"onboarding_phase":"phase5_1_seed"}'::jsonb
  )
ON CONFLICT (customer_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    legal_name = EXCLUDED.legal_name,
    org_number = EXCLUDED.org_number,
    status = EXCLUDED.status,
    country_code = EXCLUDED.country_code,
    language_code = EXCLUDED.language_code,
    vat_status = EXCLUDED.vat_status,
    base_currency_code = EXCLUDED.base_currency_code,
    payment_terms_code = EXCLUDED.payment_terms_code,
    credit_limit = EXCLUDED.credit_limit,
    reminder_profile_code = EXCLUDED.reminder_profile_code,
    allow_reminder_fee = EXCLUDED.allow_reminder_fee,
    allow_interest = EXCLUDED.allow_interest,
    allow_partial_delivery = EXCLUDED.allow_partial_delivery,
    blocked_for_invoicing = EXCLUDED.blocked_for_invoicing,
    blocked_for_delivery = EXCLUDED.blocked_for_delivery,
    billing_address_json = EXCLUDED.billing_address_json,
    delivery_address_json = EXCLUDED.delivery_address_json,
    peppol_id = EXCLUDED.peppol_id,
    peppol_scheme = EXCLUDED.peppol_scheme,
    default_ar_account_no = EXCLUDED.default_ar_account_no,
    default_revenue_segment = EXCLUDED.default_revenue_segment,
    project_dimension_required = EXCLUDED.project_dimension_required,
    import_source_key = EXCLUDED.import_source_key,
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
    '00000000-0000-4000-8000-000000005111',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005101',
    'CONTACT-1',
    'billing',
    'Sara Lind',
    'faktura@nordicproperty.test',
    '+46701111111',
    'sv',
    'Ekonomiansvarig',
    TRUE,
    'active',
    '{"preferred_channel":"email_pdf"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005112',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005102',
    'CONTACT-1',
    'contract',
    'Johan Berg',
    'johan.berg@buildfast.test',
    '+46702222222',
    'sv',
    'Projektchef',
    TRUE,
    'active',
    '{"preferred_channel":"email"}'::jsonb
  )
ON CONFLICT (customer_contact_id) DO UPDATE
SET role_code = EXCLUDED.role_code,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    preferred_language_code = EXCLUDED.preferred_language_code,
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
    '00000000-0000-4000-8000-000000005121',
    '00000000-0000-4000-8000-000000000001',
    'SVC-MONTHLY-OPS',
    'Månatligt driftavtal',
    'service',
    'month',
    'active',
    'standard',
    'VAT_SE_DOMESTIC_25',
    '3010',
    '["project_id"]'::jsonb,
    TRUE,
    TRUE,
    '{"category":"operations"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005122',
    '00000000-0000-4000-8000-000000000001',
    'GOODS-ONSITE-MAT',
    'Förbrukningsmaterial',
    'goods',
    'ea',
    'active',
    'standard',
    'VAT_SE_DOMESTIC_25',
    '3020',
    '[]'::jsonb,
    FALSE,
    TRUE,
    '{"category":"materials"}'::jsonb
  )
ON CONFLICT (ar_item_id) DO UPDATE
SET item_name = EXCLUDED.item_name,
    item_type = EXCLUDED.item_type,
    unit_code = EXCLUDED.unit_code,
    status = EXCLUDED.status,
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
VALUES (
  '00000000-0000-4000-8000-000000005131',
  '00000000-0000-4000-8000-000000000001',
  'SEK-STD-2026',
  'Standardprislista SEK 2026',
  'SEK',
  'active',
  DATE '2026-01-01',
  NULL,
  '{"segment":"default"}'::jsonb
)
ON CONFLICT (ar_price_list_id) DO UPDATE
SET price_list_name = EXCLUDED.price_list_name,
    currency_code = EXCLUDED.currency_code,
    status = EXCLUDED.status,
    valid_from = EXCLUDED.valid_from,
    valid_to = EXCLUDED.valid_to,
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
    '00000000-0000-4000-8000-000000005141',
    '00000000-0000-4000-8000-000000005131',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005121',
    DATE '2026-01-01',
    NULL,
    18500.0000,
    0,
    'fixed_price',
    '{"source":"seed"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005142',
    '00000000-0000-4000-8000-000000005131',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005122',
    DATE '2026-01-01',
    NULL,
    450.0000,
    1,
    'fixed_price',
    '{"source":"seed"}'::jsonb
  )
ON CONFLICT (ar_price_list_item_id) DO UPDATE
SET valid_from = EXCLUDED.valid_from,
    valid_to = EXCLUDED.valid_to,
    unit_price = EXCLUDED.unit_price,
    minimum_quantity = EXCLUDED.minimum_quantity,
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
  '00000000-0000-4000-8000-000000005151',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005101',
  'Q-2026-0001',
  1,
  'accepted',
  DATE '2026-01-10',
  DATE '2026-02-10',
  'SEK',
  'net_30',
  '00000000-0000-4000-8000-000000005131',
  'quote:Q-2026-0001:v1',
  '{"source":"seed"}'::jsonb
)
ON CONFLICT (quote_id) DO UPDATE
SET customer_id = EXCLUDED.customer_id,
    quote_no = EXCLUDED.quote_no,
    version_number = EXCLUDED.version_number,
    status = EXCLUDED.status,
    valid_from = EXCLUDED.valid_from,
    valid_to = EXCLUDED.valid_to,
    currency_code = EXCLUDED.currency_code,
    payment_terms_code = EXCLUDED.payment_terms_code,
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
VALUES (
  '00000000-0000-4000-8000-000000005161',
  '00000000-0000-4000-8000-000000005151',
  '00000000-0000-4000-8000-000000000001',
  1,
  'accepted',
  DATE '2026-01-10',
  DATE '2026-02-10',
  'SEK',
  'net_30',
  'line',
  '{"source":"seed"}'::jsonb,
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
VALUES (
  '00000000-0000-4000-8000-000000005171',
  '00000000-0000-4000-8000-000000005161',
  '00000000-0000-4000-8000-000000000001',
  1,
  'item',
  '00000000-0000-4000-8000-000000005121',
  'Driftavtal januari',
  1.0000,
  18500.0000,
  0.0000,
  18500.00,
  'VAT_SE_DOMESTIC_25',
  25.0000,
  DATE '2026-01-01',
  DATE '2026-01-31',
  '{"source":"seed"}'::jsonb
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
  '00000000-0000-4000-8000-000000005181',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005101',
  '00000000-0000-4000-8000-000000005151',
  'A-2026-0001',
  'active',
  DATE '2026-02-01',
  NULL,
  'SEK',
  'net_30',
  'cpi_annually',
  18500.00,
  'standard',
  'notice_required',
  TRUE,
  '{"source":"seed"}'::jsonb,
  'system'
)
ON CONFLICT (contract_id) DO UPDATE
SET customer_id = EXCLUDED.customer_id,
    quote_id = EXCLUDED.quote_id,
    contract_no = EXCLUDED.contract_no,
    status = EXCLUDED.status,
    starts_on = EXCLUDED.starts_on,
    ends_on = EXCLUDED.ends_on,
    currency_code = EXCLUDED.currency_code,
    payment_terms_code = EXCLUDED.payment_terms_code,
    indexation_code = EXCLUDED.indexation_code,
    min_fee_amount = EXCLUDED.min_fee_amount,
    credit_rule_code = EXCLUDED.credit_rule_code,
    termination_policy_code = EXCLUDED.termination_policy_code,
    allow_partial_delivery = EXCLUDED.allow_partial_delivery,
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
VALUES (
  '00000000-0000-4000-8000-000000005191',
  '00000000-0000-4000-8000-000000005181',
  '00000000-0000-4000-8000-000000000001',
  1,
  'active',
  DATE '2026-02-01',
  NULL,
  '{"source":"seed"}'::jsonb,
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
VALUES (
  '00000000-0000-4000-8000-000000005201',
  '00000000-0000-4000-8000-000000005191',
  '00000000-0000-4000-8000-000000000001',
  1,
  '00000000-0000-4000-8000-000000005121',
  'Månadsdebitering driftavtal',
  1.0000,
  18500.0000,
  'monthly',
  TRUE,
  '{"source":"seed"}'::jsonb
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
  '00000000-0000-4000-8000-000000005211',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005181',
  'PLAN-A-2026-0001',
  'active',
  'monthly',
  DATE '2026-02-01',
  NULL,
  DATE '2026-03-01',
  'Europe/Stockholm',
  'invoice_plan:PLAN-A-2026-0001',
  '{"source":"seed"}'::jsonb,
  'system'
)
ON CONFLICT (invoice_plan_id) DO UPDATE
SET contract_id = EXCLUDED.contract_id,
    plan_code = EXCLUDED.plan_code,
    status = EXCLUDED.status,
    frequency_code = EXCLUDED.frequency_code,
    start_on = EXCLUDED.start_on,
    end_on = EXCLUDED.end_on,
    next_run_on = EXCLUDED.next_run_on,
    generation_timezone = EXCLUDED.generation_timezone,
    idempotency_scope_key = EXCLUDED.idempotency_scope_key,
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
VALUES (
  '00000000-0000-4000-8000-000000005221',
  '00000000-0000-4000-8000-000000005211',
  '00000000-0000-4000-8000-000000000001',
  1,
  DATE '2026-03-01',
  DATE '2026-02-01',
  DATE '2026-02-28',
  '00000000-0000-4000-8000-000000005121',
  '00000000-0000-4000-8000-000000005201',
  1.0000,
  18500.0000,
  18500.00,
  'SEK',
  'planned',
  'invoice_plan:PLAN-A-2026-0001:line-1',
  '{"source":"seed"}'::jsonb
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
  '00000000-0000-4000-8000-000000005231',
  '00000000-0000-4000-8000-000000000001',
  'manual_file',
  'customers_phase5_seed.csv',
  'applied',
  2,
  2,
  0,
  TIMESTAMPTZ '2026-03-21T11:00:00Z',
  TIMESTAMPTZ '2026-03-21T11:00:03Z',
  '{"note":"seed import baseline"}'::jsonb,
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
  payload_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005241',
    '00000000-0000-4000-8000-000000005231',
    '00000000-0000-4000-8000-000000000001',
    1,
    'crm:nordic-property-services',
    'applied',
    '00000000-0000-4000-8000-000000005101',
    '{"customer_no":"CUST-1001"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005242',
    '00000000-0000-4000-8000-000000005231',
    '00000000-0000-4000-8000-000000000001',
    2,
    'crm:buildfast-entreprenad',
    'applied',
    '00000000-0000-4000-8000-000000005102',
    '{"customer_no":"CUST-1002"}'::jsonb
  )
ON CONFLICT (ar_customer_import_row_id) DO NOTHING;
