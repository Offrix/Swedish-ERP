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
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000006451',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006301',
  'BL-INV-4451',
  'APINV-6451',
  'pending_approval',
  'BL-INV-4451',
  DATE '2026-04-15',
  DATE '2026-05-15',
  'SEK',
  30000.00,
  7500.00,
  37500.00,
  'OCR-4451',
  'cleared',
  '00000000-0000-4000-8000-000000006331',
  FALSE,
  TRUE,
  '["match_variance"]'::jsonb,
  'email',
  '{"demo":"phase6_2","scenario":"receipt_variance_review"}'::jsonb,
  TIMESTAMPTZ '2026-04-15T07:50:00Z'
)
ON CONFLICT (supplier_invoice_id) DO UPDATE
SET status = EXCLUDED.status,
    supplier_invoice_no = EXCLUDED.supplier_invoice_no,
    external_invoice_ref = EXCLUDED.external_invoice_ref,
    invoice_date = EXCLUDED.invoice_date,
    due_date = EXCLUDED.due_date,
    currency_code = EXCLUDED.currency_code,
    net_amount = EXCLUDED.net_amount,
    vat_amount = EXCLUDED.vat_amount,
    gross_amount = EXCLUDED.gross_amount,
    payment_reference = EXCLUDED.payment_reference,
    matched_purchase_order_id = EXCLUDED.matched_purchase_order_id,
    matched_receipt_flag = EXCLUDED.matched_receipt_flag,
    review_required = EXCLUDED.review_required,
    review_queue_codes_json = EXCLUDED.review_queue_codes_json,
    source_channel = EXCLUDED.source_channel,
    source_payload_json = EXCLUDED.source_payload_json,
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
  purchase_order_line_id,
  matched_purchase_order_line_id,
  tolerance_profile_code,
  review_required,
  review_queue_codes_json,
  vat_proposal_json
)
VALUES (
  '00000000-0000-4000-8000-000000006452',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006451',
  1,
  'Warehouse material over receipt',
  6.0000,
  5000.0000,
  30000.00,
  'VAT_SE_DOMESTIC_25',
  25.0000,
  7500.00,
  37500.00,
  '4010',
  '{"projectId":"P-100"}'::jsonb,
  'goods',
  FALSE,
  TRUE,
  (
    SELECT purchase_order_line_id
    FROM purchase_order_lines
    WHERE purchase_order_id = '00000000-0000-4000-8000-000000006331'
      AND line_no = 1
    LIMIT 1
  ),
  (
    SELECT purchase_order_line_id
    FROM purchase_order_lines
    WHERE purchase_order_id = '00000000-0000-4000-8000-000000006331'
      AND line_no = 1
    LIMIT 1
  ),
  'FLEX-AP',
  TRUE,
  '["match_variance"]'::jsonb,
  '{"vatCode":"VAT_SE_DOMESTIC_25","vatRate":25,"vatAmount":7500,"explanation":"Ingående moms 25 procent med box 48.","decisionCategory":"domestic_supplier_charged_purchase","declarationBoxCodes":["48"],"reviewRequired":false}'::jsonb
)
ON CONFLICT (ap_supplier_invoice_line_id) DO UPDATE
SET description = EXCLUDED.description,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    net_amount = EXCLUDED.net_amount,
    vat_code = EXCLUDED.vat_code,
    vat_rate = EXCLUDED.vat_rate,
    vat_amount = EXCLUDED.vat_amount,
    gross_amount = EXCLUDED.gross_amount,
    expense_account_no = EXCLUDED.expense_account_no,
    dimension_json = EXCLUDED.dimension_json,
    goods_or_services = EXCLUDED.goods_or_services,
    reverse_charge_flag = EXCLUDED.reverse_charge_flag,
    receipt_required = EXCLUDED.receipt_required,
    purchase_order_line_id = EXCLUDED.purchase_order_line_id,
    matched_purchase_order_line_id = EXCLUDED.matched_purchase_order_line_id,
    tolerance_profile_code = EXCLUDED.tolerance_profile_code,
    review_required = EXCLUDED.review_required,
    review_queue_codes_json = EXCLUDED.review_queue_codes_json,
    vat_proposal_json = EXCLUDED.vat_proposal_json,
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
  '00000000-0000-4000-8000-000000006453',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006451',
  'three_way',
  'review_required',
  1,
  TRUE,
  '[{"lineNo":1,"matchMode":"three_way","matchedReceiptQuantity":4.0,"variances":["receipt_variance"]}]'::jsonb,
  'system',
  TIMESTAMPTZ '2026-04-15T08:05:00Z'
)
ON CONFLICT (ap_supplier_invoice_match_run_id) DO UPDATE
SET match_mode = EXCLUDED.match_mode,
    status = EXCLUDED.status,
    variance_count = EXCLUDED.variance_count,
    review_required = EXCLUDED.review_required,
    line_results_json = EXCLUDED.line_results_json;

INSERT INTO ap_supplier_invoice_variances (
  ap_supplier_invoice_variance_id,
  company_id,
  supplier_invoice_id,
  ap_supplier_invoice_line_id,
  variance_code,
  review_queue_code,
  severity,
  status,
  message,
  expected_value_json,
  actual_value_json,
  tolerance_value_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000006454',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006451',
  '00000000-0000-4000-8000-000000006452',
  'receipt_variance',
  'match_variance',
  'error',
  'open',
  'Received quantity is lower than invoiced quantity.',
  '{"expectedQuantity":6}'::jsonb,
  '{"actualReceiptQuantity":4}'::jsonb,
  '{"quantityTolerancePercent":5}'::jsonb,
  TIMESTAMPTZ '2026-04-15T08:05:30Z'
)
ON CONFLICT (ap_supplier_invoice_variance_id) DO UPDATE
SET severity = EXCLUDED.severity,
    status = EXCLUDED.status,
    message = EXCLUDED.message,
    expected_value_json = EXCLUDED.expected_value_json,
    actual_value_json = EXCLUDED.actual_value_json,
    tolerance_value_json = EXCLUDED.tolerance_value_json,
    updated_at = NOW();

UPDATE supplier_invoices
SET latest_match_run_id = '00000000-0000-4000-8000-000000006453',
    updated_at = NOW()
WHERE supplier_invoice_id = '00000000-0000-4000-8000-000000006451';
