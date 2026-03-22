WITH matched_po AS (
  SELECT
    po.purchase_order_id,
    pol.purchase_order_line_id
  FROM purchase_orders po
  LEFT JOIN purchase_order_lines pol
    ON pol.purchase_order_id = po.purchase_order_id
   AND pol.line_no = 1
  WHERE po.purchase_order_id = '00000000-0000-4000-8000-000000006131'
)
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
  created_at,
  approved_at,
  approved_by_actor_id
)
SELECT
  '00000000-0000-4000-8000-000000006401',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006101',
  'SUPINV-8901',
  'APINV-6401',
  'approved',
  'SUPINV-8901',
  DATE '2026-03-24',
  DATE '2026-04-23',
  'SEK',
  1500.00,
  375.00,
  1875.00,
  'OCR-8901',
  'cleared',
  matched_po.purchase_order_id,
  TRUE,
  FALSE,
  '[]'::jsonb,
  'email',
  '{"seed":"phase6_2","scenario":"multiple_cost_lines"}'::jsonb,
  TIMESTAMPTZ '2026-03-24T10:15:00Z',
  TIMESTAMPTZ '2026-03-24T10:25:00Z',
  'system'
FROM matched_po
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
    duplicate_check_status = EXCLUDED.duplicate_check_status,
    matched_purchase_order_id = EXCLUDED.matched_purchase_order_id,
    matched_receipt_flag = EXCLUDED.matched_receipt_flag,
    review_required = EXCLUDED.review_required,
    review_queue_codes_json = EXCLUDED.review_queue_codes_json,
    source_channel = EXCLUDED.source_channel,
    source_payload_json = EXCLUDED.source_payload_json,
    approved_at = EXCLUDED.approved_at,
    approved_by_actor_id = EXCLUDED.approved_by_actor_id,
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
VALUES
  (
    '00000000-0000-4000-8000-000000006402',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006401',
    1,
    'Office subscriptions',
    1.0000,
    1000.0000,
    1000.00,
    'VAT_SE_DOMESTIC_25',
    25.0000,
    250.00,
    1250.00,
    '5410',
    '{"costCenterCode":"OPS"}'::jsonb,
    'services',
    FALSE,
    TRUE,
    (
      SELECT purchase_order_line_id
      FROM purchase_order_lines
      WHERE purchase_order_id = '00000000-0000-4000-8000-000000006131'
        AND line_no = 1
      LIMIT 1
    ),
    (
      SELECT purchase_order_line_id
      FROM purchase_order_lines
      WHERE purchase_order_id = '00000000-0000-4000-8000-000000006131'
        AND line_no = 1
      LIMIT 1
    ),
    'STD-AP',
    FALSE,
    '[]'::jsonb,
    '{"vatCode":"VAT_SE_DOMESTIC_25","vatRate":25,"vatAmount":250,"explanation":"Ingående moms 25 procent med box 48.","decisionCategory":"domestic_supplier_charged_purchase","declarationBoxCodes":["48"],"reviewRequired":false}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000006403',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000006401',
    2,
    'Consulting support',
    1.0000,
    500.0000,
    500.00,
    'VAT_SE_DOMESTIC_25',
    25.0000,
    125.00,
    625.00,
    '5610',
    '{"costCenterCode":"CONS"}'::jsonb,
    'services',
    FALSE,
    FALSE,
    NULL,
    NULL,
    'STD-AP',
    FALSE,
    '[]'::jsonb,
    '{"vatCode":"VAT_SE_DOMESTIC_25","vatRate":25,"vatAmount":125,"explanation":"Ingående moms 25 procent med box 48.","decisionCategory":"domestic_supplier_charged_purchase","declarationBoxCodes":["48"],"reviewRequired":false}'::jsonb
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
  '00000000-0000-4000-8000-000000006404',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000006401',
  'three_way',
  'matched',
  0,
  FALSE,
  '[{"lineNo":1,"matchMode":"three_way","matchedReceiptQuantity":1},{"lineNo":2,"matchMode":"none","matchedReceiptQuantity":0}]'::jsonb,
  'system',
  TIMESTAMPTZ '2026-03-24T10:22:00Z'
)
ON CONFLICT (ap_supplier_invoice_match_run_id) DO UPDATE
SET match_mode = EXCLUDED.match_mode,
    status = EXCLUDED.status,
    variance_count = EXCLUDED.variance_count,
    review_required = EXCLUDED.review_required,
    line_results_json = EXCLUDED.line_results_json,
    created_by_actor_id = EXCLUDED.created_by_actor_id;

UPDATE supplier_invoices
SET latest_match_run_id = '00000000-0000-4000-8000-000000006404',
    updated_at = NOW()
WHERE supplier_invoice_id = '00000000-0000-4000-8000-000000006401';
