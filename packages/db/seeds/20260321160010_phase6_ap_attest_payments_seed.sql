INSERT INTO users (user_id, email, display_name, status)
VALUES ('00000000-0000-4000-8000-000000000012', 'approver@example.test', 'Phase 6 Approver', 'active')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO company_users (
  company_user_id,
  company_id,
  user_id,
  role_code,
  status,
  starts_at,
  is_admin,
  requires_mfa,
  onboarding_status
)
VALUES (
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000012',
  'approver',
  'active',
  NOW(),
  FALSE,
  FALSE,
  'completed'
)
ON CONFLICT (company_user_id) DO NOTHING;

INSERT INTO approval_chains (
  approval_chain_id,
  company_id,
  scope_code,
  object_type,
  status,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000006610',
  '00000000-0000-4000-8000-000000000001',
  'ap',
  'ap_supplier_invoice',
  'active',
  '{"seed":"phase6_3","scenario":"settled_payment"}'::jsonb
)
ON CONFLICT (approval_chain_id) DO UPDATE
SET status = EXCLUDED.status,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO approval_chain_steps (
  approval_chain_step_id,
  approval_chain_id,
  step_order,
  approver_company_user_id,
  delegation_allowed,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000006611',
    '00000000-0000-4000-8000-000000006610',
    1,
    '00000000-0000-4000-8000-000000000021',
    TRUE,
    '{"label":"prepare_payment"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000006612',
    '00000000-0000-4000-8000-000000006610',
    2,
    '00000000-0000-4000-8000-000000000022',
    TRUE,
    '{"label":"final_attest"}'::jsonb
  )
ON CONFLICT (approval_chain_id, step_order) DO UPDATE
SET approver_company_user_id = EXCLUDED.approver_company_user_id,
    delegation_allowed = EXCLUDED.delegation_allowed,
    metadata_json = EXCLUDED.metadata_json;

UPDATE suppliers
SET attest_chain_id = '00000000-0000-4000-8000-000000006610',
    updated_at = NOW()
WHERE supplier_id = '00000000-0000-4000-8000-000000006101';

INSERT INTO supplier_invoices (
  supplier_invoice_id,
  company_id,
  supplier_id,
  invoice_number,
  supplier_invoice_no,
  status,
  external_invoice_ref,
  invoice_date,
  due_date,
  currency_code,
  net_amount,
  vat_amount,
  gross_amount,
  payment_reference,
  duplicate_check_status,
  matched_purchase_order_id,
  matched_receipt_flag,
  review_required,
  review_queue_codes_json,
  source_channel,
  source_payload_json,
  approval_chain_id,
  approval_status,
  payment_hold,
  payment_hold_reason_codes_json,
  approved_at,
  approved_by_actor_id,
  scheduled_for_payment_at,
  paid_at,
  journal_entry_id,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000006641',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006101',
  'SUPINV-6601',
  'APINV-6601',
  'paid',
  'SUPINV-6601',
  DATE '2026-04-20',
  DATE '2026-05-20',
  'SEK',
  2000.00,
  500.00,
  2500.00,
  'OCR-6601',
  'cleared',
  '00000000-0000-4000-8000-000000006131',
  TRUE,
  FALSE,
  '[]'::jsonb,
  'email',
  '{"seed":"phase6_3","scenario":"settled_payment"}'::jsonb,
  '00000000-0000-4000-8000-000000006610',
  'approved',
  FALSE,
  '[]'::jsonb,
  TIMESTAMPTZ '2026-04-20T09:15:00Z',
  'system',
  TIMESTAMPTZ '2026-05-19T09:00:00Z',
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  NULL,
  TIMESTAMPTZ '2026-04-20T08:40:00Z'
)
ON CONFLICT (supplier_invoice_id) DO UPDATE
SET status = EXCLUDED.status,
    approval_chain_id = EXCLUDED.approval_chain_id,
    approval_status = EXCLUDED.approval_status,
    payment_hold = EXCLUDED.payment_hold,
    payment_hold_reason_codes_json = EXCLUDED.payment_hold_reason_codes_json,
    scheduled_for_payment_at = EXCLUDED.scheduled_for_payment_at,
    paid_at = EXCLUDED.paid_at,
    journal_entry_id = EXCLUDED.journal_entry_id,
    updated_at = NOW();

INSERT INTO ap_supplier_invoice_lines (
  ap_supplier_invoice_line_id,
  company_id,
  supplier_invoice_id,
  line_no,
  description,
  quantity,
  unit_price,
  net_amount,
  vat_code,
  vat_rate,
  vat_amount,
  gross_amount,
  expense_account_no,
  dimension_json,
  goods_or_services,
  reverse_charge_flag,
  receipt_required,
  tolerance_profile_code,
  review_required,
  review_queue_codes_json,
  vat_proposal_json
)
VALUES (
  '00000000-0000-4000-8000-000000006642',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006641',
  1,
  'Infrastructure subscription',
  1.0000,
  2000.0000,
  2000.00,
  'VAT_SE_DOMESTIC_25',
  25.0000,
  500.00,
  2500.00,
  '5610',
  '{"costCenterCode":"IT"}'::jsonb,
  'services',
  FALSE,
  TRUE,
  'STD-AP',
  FALSE,
  '[]'::jsonb,
  '{"vatCode":"VAT_SE_DOMESTIC_25","vatAmount":500,"reviewRequired":false}'::jsonb
)
ON CONFLICT (ap_supplier_invoice_line_id) DO UPDATE
SET description = EXCLUDED.description,
    net_amount = EXCLUDED.net_amount,
    vat_amount = EXCLUDED.vat_amount,
    gross_amount = EXCLUDED.gross_amount,
    updated_at = NOW();

INSERT INTO ap_supplier_invoice_match_runs (
  ap_supplier_invoice_match_run_id,
  company_id,
  supplier_invoice_id,
  match_mode,
  status,
  variance_count,
  review_required,
  line_results_json,
  created_by_actor_id,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000006643',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006641',
  'three_way',
  'matched',
  0,
  FALSE,
  '[{"lineNo":1,"matchMode":"three_way"}]'::jsonb,
  'system',
  TIMESTAMPTZ '2026-04-20T08:55:00Z'
)
ON CONFLICT (ap_supplier_invoice_match_run_id) DO UPDATE
SET status = EXCLUDED.status,
    variance_count = EXCLUDED.variance_count,
    review_required = EXCLUDED.review_required,
    line_results_json = EXCLUDED.line_results_json;

UPDATE supplier_invoices
SET latest_match_run_id = '00000000-0000-4000-8000-000000006643',
    updated_at = NOW()
WHERE supplier_invoice_id = '00000000-0000-4000-8000-000000006641';

INSERT INTO ap_supplier_invoice_approval_steps (
  ap_supplier_invoice_approval_step_id,
  company_id,
  supplier_invoice_id,
  approval_chain_id,
  approval_chain_step_id,
  step_order,
  approver_company_user_id,
  status,
  acted_by_actor_id,
  acted_by_company_user_id,
  acted_by_role_code,
  acted_at,
  explanation,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000006644',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006641',
    '00000000-0000-4000-8000-000000006610',
    '00000000-0000-4000-8000-000000006611',
    1,
    '00000000-0000-4000-8000-000000000021',
    'approved',
    'system',
    '00000000-0000-4000-8000-000000000021',
    'company_admin',
    TIMESTAMPTZ '2026-04-20T09:05:00Z',
    'Prepared supplier invoice for final attest.',
    '{"seed":"phase6_3"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000006645',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006641',
    '00000000-0000-4000-8000-000000006610',
    '00000000-0000-4000-8000-000000006612',
    2,
    '00000000-0000-4000-8000-000000000022',
    'approved',
    'system',
    '00000000-0000-4000-8000-000000000022',
    'approver',
    TIMESTAMPTZ '2026-04-20T09:15:00Z',
    'Final AP attest completed before payment proposal.',
    '{"seed":"phase6_3"}'::jsonb
  )
ON CONFLICT (supplier_invoice_id, step_order) DO UPDATE
SET status = EXCLUDED.status,
    acted_by_actor_id = EXCLUDED.acted_by_actor_id,
    acted_by_company_user_id = EXCLUDED.acted_by_company_user_id,
    acted_by_role_code = EXCLUDED.acted_by_role_code,
    acted_at = EXCLUDED.acted_at,
    explanation = EXCLUDED.explanation,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO journal_entries (
  journal_entry_id,
  company_id,
  voucher_series_id,
  accounting_period_id,
  journal_date,
  voucher_number,
  source_type,
  source_id,
  actor_id,
  status,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000006647',
    '00000000-0000-4000-8000-000000000001',
    (SELECT voucher_series_id FROM voucher_series WHERE company_id = '00000000-0000-4000-8000-000000000001' AND series_code = 'E' LIMIT 1),
    (SELECT accounting_period_id FROM accounting_periods WHERE company_id = '00000000-0000-4000-8000-000000000001' AND starts_on = DATE '2026-01-01' AND ends_on = DATE '2026-12-31' LIMIT 1),
    DATE '2026-04-20',
    6601,
    'AP_INVOICE',
    '00000000-0000-4000-8000-000000006641',
    'system',
    'posted',
    TIMESTAMPTZ '2026-04-20T09:20:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000006652',
    '00000000-0000-4000-8000-000000000001',
    (SELECT voucher_series_id FROM voucher_series WHERE company_id = '00000000-0000-4000-8000-000000000001' AND series_code = 'E' LIMIT 1),
    (SELECT accounting_period_id FROM accounting_periods WHERE company_id = '00000000-0000-4000-8000-000000000001' AND starts_on = DATE '2026-01-01' AND ends_on = DATE '2026-12-31' LIMIT 1),
    DATE '2026-05-19',
    6602,
    'AP_PAYMENT',
    '00000000-0000-4000-8000-000000006651:reserve',
    'system',
    'posted',
    TIMESTAMPTZ '2026-05-19T09:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000006653',
    '00000000-0000-4000-8000-000000000001',
    (SELECT voucher_series_id FROM voucher_series WHERE company_id = '00000000-0000-4000-8000-000000000001' AND series_code = 'E' LIMIT 1),
    (SELECT accounting_period_id FROM accounting_periods WHERE company_id = '00000000-0000-4000-8000-000000000001' AND starts_on = DATE '2026-01-01' AND ends_on = DATE '2026-12-31' LIMIT 1),
    DATE '2026-05-21',
    6603,
    'AP_PAYMENT',
    '00000000-0000-4000-8000-000000006651:book',
    'system',
    'posted',
    TIMESTAMPTZ '2026-05-21T07:00:00Z'
  )
ON CONFLICT (journal_entry_id) DO UPDATE
SET journal_date = EXCLUDED.journal_date,
    voucher_number = EXCLUDED.voucher_number,
    source_type = EXCLUDED.source_type,
    source_id = EXCLUDED.source_id;

UPDATE supplier_invoices
SET journal_entry_id = '00000000-0000-4000-8000-000000006647',
    updated_at = NOW()
WHERE supplier_invoice_id = '00000000-0000-4000-8000-000000006641';

INSERT INTO bank_accounts (
  bank_account_id,
  company_id,
  bank_account_no,
  bank_name,
  ledger_account_no,
  currency_code,
  account_number,
  status,
  is_default,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000006649',
  '00000000-0000-4000-8000-000000000001',
  'BANK-6601',
  'Seed Bank AB',
  '1110',
  'SEK',
  '5566010011',
  'active',
  TRUE,
  TIMESTAMPTZ '2026-05-19T08:45:00Z',
  TIMESTAMPTZ '2026-05-19T08:45:00Z'
)
ON CONFLICT (bank_account_id) DO UPDATE
SET bank_account_no = EXCLUDED.bank_account_no,
    bank_name = EXCLUDED.bank_name,
    ledger_account_no = EXCLUDED.ledger_account_no,
    account_number = EXCLUDED.account_number,
    is_default = EXCLUDED.is_default,
    updated_at = EXCLUDED.updated_at;

INSERT INTO ap_open_items (
  ap_open_item_id,
  company_id,
  supplier_invoice_id,
  open_amount,
  due_on,
  status,
  created_at,
  journal_entry_id,
  currency_code,
  updated_at,
  closed_at,
  original_amount,
  reserved_amount,
  paid_amount,
  payment_hold,
  payment_hold_reason_codes_json
)
VALUES (
  '00000000-0000-4000-8000-000000006648',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006641',
  0,
  DATE '2026-05-20',
  'paid',
  TIMESTAMPTZ '2026-04-20T09:20:00Z',
  '00000000-0000-4000-8000-000000006647',
  'SEK',
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  2500.00,
  0,
  2500.00,
  FALSE,
  '[]'::jsonb
)
ON CONFLICT (ap_open_item_id) DO NOTHING;

INSERT INTO payment_proposals (
  payment_proposal_id,
  company_id,
  payment_proposal_no,
  bank_account_id,
  status,
  payment_date,
  currency_code,
  total_amount,
  source_open_item_set_hash,
  export_file_name,
  export_payload,
  export_payload_hash,
  approved_by_actor_id,
  approved_at,
  exported_at,
  submitted_at,
  accepted_by_bank_at,
  settled_at,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000006650',
  '00000000-0000-4000-8000-000000000001',
  'PAY-6601',
  '00000000-0000-4000-8000-000000006649',
  'settled',
  DATE '2026-05-20',
  'SEK',
  2500.00,
  'phase6-3-seed-open-items-6601',
  'PAY-6601.csv',
  E'payee;account;amount;currency;due_date;reference\nSeed Supplier AB;5566010011;2500;SEK;2026-05-20;OCR-6601',
  'phase6-3-seed-export-6601',
  'system',
  TIMESTAMPTZ '2026-05-19T08:50:00Z',
  TIMESTAMPTZ '2026-05-19T08:55:00Z',
  TIMESTAMPTZ '2026-05-19T09:05:00Z',
  TIMESTAMPTZ '2026-05-19T09:15:00Z',
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  'system',
  TIMESTAMPTZ '2026-05-19T08:45:00Z',
  TIMESTAMPTZ '2026-05-21T07:00:00Z'
)
ON CONFLICT (payment_proposal_id) DO UPDATE
SET status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    export_payload = EXCLUDED.export_payload,
    settled_at = EXCLUDED.settled_at,
    updated_at = EXCLUDED.updated_at;

INSERT INTO payment_orders (
  payment_order_id,
  company_id,
  payment_proposal_id,
  ap_open_item_id,
  supplier_invoice_id,
  supplier_id,
  payment_order_no,
  status,
  payee_name,
  bankgiro,
  payment_reference,
  amount,
  currency_code,
  due_date,
  lineage_key,
  reserved_journal_entry_id,
  booked_journal_entry_id,
  bank_event_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000006651',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006650',
  '00000000-0000-4000-8000-000000006648',
  '00000000-0000-4000-8000-000000006641',
  '00000000-0000-4000-8000-000000006101',
  'PAYORD-6601',
  'booked',
  'Seed Supplier AB',
  '5555-1111',
  'OCR-6601',
  2500.00,
  'SEK',
  DATE '2026-05-20',
  'phase6-3-lineage-6601',
  '00000000-0000-4000-8000-000000006652',
  '00000000-0000-4000-8000-000000006653',
  'BANK-BOOK-SEED-6601',
  TIMESTAMPTZ '2026-05-19T08:55:00Z',
  TIMESTAMPTZ '2026-05-21T07:00:00Z'
)
ON CONFLICT (payment_order_id) DO UPDATE
SET status = EXCLUDED.status,
    booked_journal_entry_id = EXCLUDED.booked_journal_entry_id,
    bank_event_id = EXCLUDED.bank_event_id,
    updated_at = EXCLUDED.updated_at;

INSERT INTO bank_payment_events (
  bank_payment_event_id,
  company_id,
  payment_order_id,
  bank_event_id,
  event_type,
  status,
  journal_entry_id,
  payload_json,
  processed_at,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000006654',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006651',
  'BANK-BOOK-SEED-6601',
  'booked',
  'processed',
  '00000000-0000-4000-8000-000000006653',
  '{"seed":"phase6_3","event":"booked"}'::jsonb,
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  'system',
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  TIMESTAMPTZ '2026-05-21T07:00:00Z'
)
ON CONFLICT (bank_payment_event_id) DO UPDATE
SET status = EXCLUDED.status,
    journal_entry_id = EXCLUDED.journal_entry_id,
    payload_json = EXCLUDED.payload_json,
    processed_at = EXCLUDED.processed_at,
    updated_at = EXCLUDED.updated_at;

INSERT INTO ap_open_items (
  ap_open_item_id,
  company_id,
  supplier_invoice_id,
  open_amount,
  due_on,
  status,
  created_at,
  journal_entry_id,
  currency_code,
  updated_at,
  closed_at,
  original_amount,
  reserved_amount,
  paid_amount,
  payment_hold,
  payment_hold_reason_codes_json,
  payment_proposal_id,
  payment_order_id,
  last_payment_order_id,
  last_bank_event_id,
  last_reservation_journal_entry_id,
  last_settlement_journal_entry_id
)
VALUES (
  '00000000-0000-4000-8000-000000006648',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006641',
  0,
  DATE '2026-05-20',
  'paid',
  TIMESTAMPTZ '2026-04-20T09:20:00Z',
  '00000000-0000-4000-8000-000000006647',
  'SEK',
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  TIMESTAMPTZ '2026-05-21T07:00:00Z',
  2500.00,
  0,
  2500.00,
  FALSE,
  '[]'::jsonb,
  '00000000-0000-4000-8000-000000006650',
  '00000000-0000-4000-8000-000000006651',
  '00000000-0000-4000-8000-000000006651',
  'BANK-BOOK-SEED-6601',
  '00000000-0000-4000-8000-000000006652',
  '00000000-0000-4000-8000-000000006653'
)
ON CONFLICT (ap_open_item_id) DO UPDATE
SET open_amount = EXCLUDED.open_amount,
    status = EXCLUDED.status,
    closed_at = EXCLUDED.closed_at,
    original_amount = EXCLUDED.original_amount,
    paid_amount = EXCLUDED.paid_amount,
    payment_proposal_id = EXCLUDED.payment_proposal_id,
    payment_order_id = EXCLUDED.payment_order_id,
    last_bank_event_id = EXCLUDED.last_bank_event_id,
    last_reservation_journal_entry_id = EXCLUDED.last_reservation_journal_entry_id,
    last_settlement_journal_entry_id = EXCLUDED.last_settlement_journal_entry_id,
    updated_at = EXCLUDED.updated_at;
