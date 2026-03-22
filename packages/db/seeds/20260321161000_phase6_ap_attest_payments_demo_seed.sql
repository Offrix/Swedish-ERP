INSERT INTO approval_chains (
  approval_chain_id,
  company_id,
  scope_code,
  object_type,
  status,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000006710',
  '00000000-0000-4000-8000-000000000001',
  'ap',
  'ap_supplier_invoice',
  'active',
  '{"demo":"phase6_3","scenario":"returned_payment"}'::jsonb
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
    '00000000-0000-4000-8000-000000006711',
    '00000000-0000-4000-8000-000000006710',
    1,
    '00000000-0000-4000-8000-000000000021',
    TRUE,
    '{"label":"demo_prepare_payment"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000006712',
    '00000000-0000-4000-8000-000000006710',
    2,
    '00000000-0000-4000-8000-000000000022',
    TRUE,
    '{"label":"demo_final_attest"}'::jsonb
  )
ON CONFLICT (approval_chain_id, step_order) DO UPDATE
SET approver_company_user_id = EXCLUDED.approver_company_user_id,
    delegation_allowed = EXCLUDED.delegation_allowed,
    metadata_json = EXCLUDED.metadata_json;

UPDATE suppliers
SET attest_chain_id = '00000000-0000-4000-8000-000000006710',
    updated_at = NOW()
WHERE supplier_id = '00000000-0000-4000-8000-000000006302';

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
  '00000000-0000-4000-8000-000000006741',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006302',
  'SUPINV-6701',
  'APINV-6701',
  'posted',
  'SUPINV-6701',
  DATE '2026-05-05',
  DATE '2026-06-04',
  'SEK',
  4000.00,
  1000.00,
  5000.00,
  'OCR-6701',
  'cleared',
  '00000000-0000-4000-8000-000000006331',
  TRUE,
  FALSE,
  '[]'::jsonb,
  'email',
  '{"demo":"phase6_3","scenario":"returned_payment"}'::jsonb,
  '00000000-0000-4000-8000-000000006710',
  'approved',
  FALSE,
  '[]'::jsonb,
  TIMESTAMPTZ '2026-05-05T08:20:00Z',
  'system',
  TIMESTAMPTZ '2026-06-03T09:00:00Z',
  NULL,
  NULL,
  TIMESTAMPTZ '2026-05-05T08:00:00Z'
)
ON CONFLICT (supplier_invoice_id) DO UPDATE
SET status = EXCLUDED.status,
    approval_chain_id = EXCLUDED.approval_chain_id,
    approval_status = EXCLUDED.approval_status,
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
  '00000000-0000-4000-8000-000000006742',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006741',
  1,
  'Warehouse replenishment',
  1.0000,
  4000.0000,
  4000.00,
  'VAT_SE_DOMESTIC_25',
  25.0000,
  1000.00,
  5000.00,
  '4010',
  '{"projectId":"P-100"}'::jsonb,
  'goods',
  FALSE,
  TRUE,
  'FLEX-AP',
  FALSE,
  '[]'::jsonb,
  '{"vatCode":"VAT_SE_DOMESTIC_25","vatAmount":1000,"reviewRequired":false}'::jsonb
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
  '00000000-0000-4000-8000-000000006743',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006741',
  'three_way',
  'matched',
  0,
  FALSE,
  '[{"lineNo":1,"matchMode":"three_way"}]'::jsonb,
  'system',
  TIMESTAMPTZ '2026-05-05T08:15:00Z'
)
ON CONFLICT (ap_supplier_invoice_match_run_id) DO UPDATE
SET status = EXCLUDED.status,
    line_results_json = EXCLUDED.line_results_json;

UPDATE supplier_invoices
SET latest_match_run_id = '00000000-0000-4000-8000-000000006743',
    updated_at = NOW()
WHERE supplier_invoice_id = '00000000-0000-4000-8000-000000006741';

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
    '00000000-0000-4000-8000-000000006744',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006741',
    '00000000-0000-4000-8000-000000006710',
    '00000000-0000-4000-8000-000000006711',
    1,
    '00000000-0000-4000-8000-000000000021',
    'approved',
    'system',
    '00000000-0000-4000-8000-000000000021',
    'company_admin',
    TIMESTAMPTZ '2026-05-05T08:18:00Z',
    'Demo AP prepare step approved.',
    '{"demo":"phase6_3"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000006745',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006741',
    '00000000-0000-4000-8000-000000006710',
    '00000000-0000-4000-8000-000000006712',
    2,
    '00000000-0000-4000-8000-000000000022',
    'approved',
    'system',
    '00000000-0000-4000-8000-000000000022',
    'approver',
    TIMESTAMPTZ '2026-05-05T08:20:00Z',
    'Demo AP final attest approved.',
    '{"demo":"phase6_3"}'::jsonb
  )
ON CONFLICT (supplier_invoice_id, step_order) DO UPDATE
SET status = EXCLUDED.status,
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
    '00000000-0000-4000-8000-000000006746',
    '00000000-0000-4000-8000-000000000001',
    (SELECT voucher_series_id FROM voucher_series WHERE company_id = '00000000-0000-4000-8000-000000000001' AND series_code = 'E' LIMIT 1),
    (SELECT accounting_period_id FROM accounting_periods WHERE company_id = '00000000-0000-4000-8000-000000000001' AND starts_on = DATE '2026-01-01' AND ends_on = DATE '2026-12-31' LIMIT 1),
    DATE '2026-05-05',
    6701,
    'AP_INVOICE',
    '00000000-0000-4000-8000-000000006741',
    'system',
    'posted',
    TIMESTAMPTZ '2026-05-05T08:25:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000006751',
    '00000000-0000-4000-8000-000000000001',
    (SELECT voucher_series_id FROM voucher_series WHERE company_id = '00000000-0000-4000-8000-000000000001' AND series_code = 'E' LIMIT 1),
    (SELECT accounting_period_id FROM accounting_periods WHERE company_id = '00000000-0000-4000-8000-000000000001' AND starts_on = DATE '2026-01-01' AND ends_on = DATE '2026-12-31' LIMIT 1),
    DATE '2026-06-03',
    6702,
    'AP_PAYMENT',
    '00000000-0000-4000-8000-000000006750:reserve',
    'system',
    'posted',
    TIMESTAMPTZ '2026-06-03T09:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000006752',
    '00000000-0000-4000-8000-000000000001',
    (SELECT voucher_series_id FROM voucher_series WHERE company_id = '00000000-0000-4000-8000-000000000001' AND series_code = 'E' LIMIT 1),
    (SELECT accounting_period_id FROM accounting_periods WHERE company_id = '00000000-0000-4000-8000-000000000001' AND starts_on = DATE '2026-01-01' AND ends_on = DATE '2026-12-31' LIMIT 1),
    DATE '2026-06-04',
    6703,
    'AP_PAYMENT',
    '00000000-0000-4000-8000-000000006750:book',
    'system',
    'posted',
    TIMESTAMPTZ '2026-06-04T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000006753',
    '00000000-0000-4000-8000-000000000001',
    (SELECT voucher_series_id FROM voucher_series WHERE company_id = '00000000-0000-4000-8000-000000000001' AND series_code = 'E' LIMIT 1),
    (SELECT accounting_period_id FROM accounting_periods WHERE company_id = '00000000-0000-4000-8000-000000000001' AND starts_on = DATE '2026-01-01' AND ends_on = DATE '2026-12-31' LIMIT 1),
    DATE '2026-06-05',
    6704,
    'AP_PAYMENT',
    '00000000-0000-4000-8000-000000006750:return',
    'system',
    'posted',
    TIMESTAMPTZ '2026-06-05T08:30:00Z'
  )
ON CONFLICT (journal_entry_id) DO UPDATE
SET journal_date = EXCLUDED.journal_date,
    voucher_number = EXCLUDED.voucher_number,
    source_type = EXCLUDED.source_type,
    source_id = EXCLUDED.source_id;

UPDATE supplier_invoices
SET journal_entry_id = '00000000-0000-4000-8000-000000006746',
    updated_at = NOW()
WHERE supplier_invoice_id = '00000000-0000-4000-8000-000000006741';

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
  '00000000-0000-4000-8000-000000006748',
  '00000000-0000-4000-8000-000000000001',
  'BANK-6701',
  'Demo Bank AB',
  '1110',
  'SEK',
  '5567010022',
  'active',
  FALSE,
  TIMESTAMPTZ '2026-06-03T08:45:00Z',
  TIMESTAMPTZ '2026-06-03T08:45:00Z'
)
ON CONFLICT (bank_account_id) DO UPDATE
SET bank_account_no = EXCLUDED.bank_account_no,
    bank_name = EXCLUDED.bank_name,
    ledger_account_no = EXCLUDED.ledger_account_no,
    account_number = EXCLUDED.account_number,
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
  '00000000-0000-4000-8000-000000006747',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006741',
  5000.00,
  DATE '2026-06-04',
  'open',
  TIMESTAMPTZ '2026-05-05T08:25:00Z',
  '00000000-0000-4000-8000-000000006746',
  'SEK',
  TIMESTAMPTZ '2026-06-05T08:30:00Z',
  NULL,
  5000.00,
  0,
  0,
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
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000006749',
  '00000000-0000-4000-8000-000000000001',
  'PAY-6701',
  '00000000-0000-4000-8000-000000006748',
  'partially_executed',
  DATE '2026-06-04',
  'SEK',
  5000.00,
  'phase6-3-demo-open-items-6701',
  'PAY-6701.csv',
  E'payee;account;amount;currency;due_date;reference\nDemo Supplier AB;5567010022;5000;SEK;2026-06-04;OCR-6701',
  'phase6-3-demo-export-6701',
  'system',
  TIMESTAMPTZ '2026-06-03T08:50:00Z',
  TIMESTAMPTZ '2026-06-03T08:55:00Z',
  TIMESTAMPTZ '2026-06-03T09:05:00Z',
  TIMESTAMPTZ '2026-06-03T09:15:00Z',
  'system',
  TIMESTAMPTZ '2026-06-03T08:45:00Z',
  TIMESTAMPTZ '2026-06-05T08:30:00Z'
)
ON CONFLICT (payment_proposal_id) DO UPDATE
SET status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    export_payload = EXCLUDED.export_payload,
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
  returned_journal_entry_id,
  bank_event_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000006750',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006749',
  '00000000-0000-4000-8000-000000006747',
  '00000000-0000-4000-8000-000000006741',
  '00000000-0000-4000-8000-000000006302',
  'PAYORD-6701',
  'returned',
  'Demo Supplier AB',
  '7777-2222',
  'OCR-6701',
  5000.00,
  'SEK',
  DATE '2026-06-04',
  'phase6-3-demo-lineage-6701',
  '00000000-0000-4000-8000-000000006751',
  '00000000-0000-4000-8000-000000006752',
  '00000000-0000-4000-8000-000000006753',
  'BANK-RETURN-DEMO-6701',
  TIMESTAMPTZ '2026-06-03T08:55:00Z',
  TIMESTAMPTZ '2026-06-05T08:30:00Z'
)
ON CONFLICT (payment_order_id) DO UPDATE
SET status = EXCLUDED.status,
    returned_journal_entry_id = EXCLUDED.returned_journal_entry_id,
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
VALUES
  (
    '00000000-0000-4000-8000-000000006754',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006750',
    'BANK-BOOK-DEMO-6701',
    'booked',
    'processed',
    '00000000-0000-4000-8000-000000006752',
    '{"demo":"phase6_3","event":"booked"}'::jsonb,
    TIMESTAMPTZ '2026-06-04T10:00:00Z',
    'system',
    TIMESTAMPTZ '2026-06-04T10:00:00Z',
    TIMESTAMPTZ '2026-06-04T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000006755',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006750',
    'BANK-RETURN-DEMO-6701',
    'returned',
    'processed',
    '00000000-0000-4000-8000-000000006753',
    '{"demo":"phase6_3","event":"returned"}'::jsonb,
    TIMESTAMPTZ '2026-06-05T08:30:00Z',
    'system',
    TIMESTAMPTZ '2026-06-05T08:30:00Z',
    TIMESTAMPTZ '2026-06-05T08:30:00Z'
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
  last_settlement_journal_entry_id,
  last_return_journal_entry_id
)
VALUES (
  '00000000-0000-4000-8000-000000006747',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006741',
  5000.00,
  DATE '2026-06-04',
  'open',
  TIMESTAMPTZ '2026-05-05T08:25:00Z',
  '00000000-0000-4000-8000-000000006746',
  'SEK',
  TIMESTAMPTZ '2026-06-05T08:30:00Z',
  NULL,
  5000.00,
  0,
  0,
  FALSE,
  '[]'::jsonb,
  '00000000-0000-4000-8000-000000006749',
  '00000000-0000-4000-8000-000000006750',
  '00000000-0000-4000-8000-000000006750',
  'BANK-RETURN-DEMO-6701',
  '00000000-0000-4000-8000-000000006751',
  '00000000-0000-4000-8000-000000006752',
  '00000000-0000-4000-8000-000000006753'
)
ON CONFLICT (ap_open_item_id) DO UPDATE
SET open_amount = EXCLUDED.open_amount,
    status = EXCLUDED.status,
    original_amount = EXCLUDED.original_amount,
    payment_proposal_id = EXCLUDED.payment_proposal_id,
    payment_order_id = EXCLUDED.payment_order_id,
    last_bank_event_id = EXCLUDED.last_bank_event_id,
    last_reservation_journal_entry_id = EXCLUDED.last_reservation_journal_entry_id,
    last_settlement_journal_entry_id = EXCLUDED.last_settlement_journal_entry_id,
    last_return_journal_entry_id = EXCLUDED.last_return_journal_entry_id,
    updated_at = EXCLUDED.updated_at;
