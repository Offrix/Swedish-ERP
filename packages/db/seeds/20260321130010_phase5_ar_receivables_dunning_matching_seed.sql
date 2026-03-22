INSERT INTO ar_open_items (
  ar_open_item_id,
  company_id,
  customer_invoice_id,
  customer_id,
  original_customer_invoice_id,
  source_type,
  source_id,
  source_version,
  idempotency_key,
  open_amount,
  due_on,
  status,
  currency_code,
  functional_currency_code,
  original_amount,
  paid_amount,
  credited_amount,
  writeoff_amount,
  disputed_amount,
  opened_on,
  closed_on,
  last_activity_at,
  aging_bucket_code,
  collection_stage_code,
  dispute_flag,
  dunning_hold_flag,
  metadata_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005701',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005511',
    '00000000-0000-4000-8000-000000005101',
    '00000000-0000-4000-8000-000000005511',
    'AR_INVOICE',
    'INV-1001',
    '1',
    'open_item:INV-1001',
    13125.00,
    DATE '2026-03-31',
    'partially_settled',
    'SEK',
    'SEK',
    23125.00,
    10000.00,
    0.00,
    0.00,
    0.00,
    DATE '2026-03-01',
    NULL,
    TIMESTAMPTZ '2026-04-02T10:00:00Z',
    '1_30',
    'stage_1',
    FALSE,
    FALSE,
    '{"seed":"phase5_3"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005702',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005512',
    '00000000-0000-4000-8000-000000005101',
    '00000000-0000-4000-8000-000000005512',
    'AR_INVOICE',
    'INV-1002',
    '1',
    'open_item:INV-1002',
    49.00,
    DATE '2026-04-30',
    'written_off',
    'SEK',
    'SEK',
    23125.00,
    23076.00,
    0.00,
    49.00,
    0.00,
    DATE '2026-04-01',
    DATE '2026-05-12',
    TIMESTAMPTZ '2026-05-12T14:00:00Z',
    '1_30',
    'closed',
    FALSE,
    FALSE,
    '{"seed":"phase5_3"}'::jsonb
  )
ON CONFLICT (ar_open_item_id) DO UPDATE
SET open_amount = EXCLUDED.open_amount,
    status = EXCLUDED.status,
    paid_amount = EXCLUDED.paid_amount,
    writeoff_amount = EXCLUDED.writeoff_amount,
    aging_bucket_code = EXCLUDED.aging_bucket_code,
    collection_stage_code = EXCLUDED.collection_stage_code,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO ar_open_item_events (
  ar_open_item_event_id,
  ar_open_item_id,
  company_id,
  event_code,
  event_reason_code,
  event_source_type,
  event_source_id,
  amount_delta,
  open_amount_before,
  open_amount_after,
  snapshot_json,
  occurred_at,
  created_by_actor_id
)
VALUES
  (
    '00000000-0000-4000-8000-000000005711',
    '00000000-0000-4000-8000-000000005701',
    '00000000-0000-4000-8000-000000000001',
    'payment_allocation_confirmed',
    'exact_reference_match',
    'BANK_MATCH',
    'seed-bank-txn-1001',
    -10000.00,
    23125.00,
    13125.00,
    '{"allocation_id":"00000000-0000-4000-8000-000000005731"}'::jsonb,
    TIMESTAMPTZ '2026-04-02T10:00:00Z',
    'system'
  ),
  (
    '00000000-0000-4000-8000-000000005712',
    '00000000-0000-4000-8000-000000005702',
    '00000000-0000-4000-8000-000000000001',
    'writeoff_posted',
    'small_difference_policy',
    'WRITE_OFF',
    'seed-writeoff-1002',
    -49.00,
    49.00,
    0.00,
    '{"writeoff_id":"00000000-0000-4000-8000-000000005781"}'::jsonb,
    TIMESTAMPTZ '2026-05-12T14:00:00Z',
    'system'
  )
ON CONFLICT (ar_open_item_event_id) DO NOTHING;

INSERT INTO ar_payment_matching_runs (
  ar_payment_matching_run_id,
  company_id,
  source_channel,
  external_batch_ref,
  idempotency_key,
  status,
  run_started_at,
  run_completed_at,
  stats_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000005721',
  '00000000-0000-4000-8000-000000000001',
  'bank_file',
  'seed-statement-2026-04-02',
  'payment_match_run:seed:2026-04-02',
  'completed',
  TIMESTAMPTZ '2026-04-02T09:59:00Z',
  TIMESTAMPTZ '2026-04-02T10:01:00Z',
  '{"processed":2,"matched":1,"review_required":1}'::jsonb,
  'system'
)
ON CONFLICT (ar_payment_matching_run_id) DO NOTHING;

INSERT INTO ar_payment_match_candidates (
  ar_payment_match_candidate_id,
  ar_payment_matching_run_id,
  company_id,
  ar_open_item_id,
  customer_id,
  bank_transaction_uid,
  statement_line_hash,
  payer_reference,
  amount,
  currency_code,
  value_date,
  match_score,
  status,
  reason_code,
  payload_json
)
VALUES
  (
    '00000000-0000-4000-8000-000000005722',
    '00000000-0000-4000-8000-000000005721',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000005701',
    '00000000-0000-4000-8000-000000005101',
    'seed-bank-txn-1001',
    'seed-hash-1001',
    '1234567890',
    10000.00,
    'SEK',
    DATE '2026-04-02',
    0.9900,
    'confirmed',
    'exact_reference_and_amount',
    '{"source":"seed"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000005723',
    '00000000-0000-4000-8000-000000005721',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    NULL,
    'seed-bank-txn-unknown-1',
    'seed-hash-unknown-1',
    NULL,
    5000.00,
    'SEK',
    DATE '2026-04-02',
    0.2100,
    'rejected',
    'no_confident_match',
    '{"source":"seed"}'::jsonb
  )
ON CONFLICT (ar_payment_match_candidate_id) DO NOTHING;

INSERT INTO ar_allocations (
  ar_allocation_id,
  company_id,
  ar_open_item_id,
  customer_invoice_id,
  allocation_type,
  source_channel,
  status,
  allocated_amount,
  currency_code,
  functional_amount,
  allocated_on,
  bank_transaction_uid,
  statement_line_hash,
  external_event_ref,
  ar_payment_matching_run_id,
  reversal_of_allocation_id,
  reason_code,
  metadata_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000005731',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005701',
  '00000000-0000-4000-8000-000000005511',
  'payment',
  'bank_file',
  'confirmed',
  10000.00,
  'SEK',
  10000.00,
  DATE '2026-04-02',
  'seed-bank-txn-1001',
  'seed-hash-1001',
  'bank_line:seed-bank-txn-1001',
  '00000000-0000-4000-8000-000000005721',
  NULL,
  'exact_match',
  '{"source":"seed"}'::jsonb,
  'system'
)
ON CONFLICT (ar_allocation_id) DO NOTHING;

INSERT INTO ar_unmatched_bank_receipts (
  ar_unmatched_bank_receipt_id,
  company_id,
  bank_transaction_uid,
  statement_line_hash,
  value_date,
  amount,
  currency_code,
  payer_reference,
  customer_hint,
  status,
  linked_ar_allocation_id,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000005741',
  '00000000-0000-4000-8000-000000000001',
  'seed-bank-txn-unknown-1',
  'seed-hash-unknown-1',
  DATE '2026-04-02',
  5000.00,
  'SEK',
  NULL,
  NULL,
  'unmatched',
  NULL,
  '{"source":"seed","note":"requires manual review"}'::jsonb
)
ON CONFLICT (ar_unmatched_bank_receipt_id) DO NOTHING;

INSERT INTO ar_dunning_runs (
  ar_dunning_run_id,
  company_id,
  run_date,
  stage_code,
  status,
  calculation_window_start,
  calculation_window_end,
  idempotency_key,
  summary_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000005751',
  '00000000-0000-4000-8000-000000000001',
  DATE '2026-04-30',
  'stage_1',
  'executed',
  DATE '2026-04-01',
  DATE '2026-04-30',
  'dunning:stage_1:2026-04-30',
  '{"items":1,"fees_generated":1,"interest_generated":1}'::jsonb,
  'system'
)
ON CONFLICT (ar_dunning_run_id) DO NOTHING;

INSERT INTO ar_dunning_run_items (
  ar_dunning_run_item_id,
  ar_dunning_run_id,
  company_id,
  ar_open_item_id,
  customer_invoice_id,
  stage_code,
  fee_amount,
  interest_amount,
  fee_customer_invoice_id,
  interest_customer_invoice_id,
  action_status,
  skip_reason_code,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000005761',
  '00000000-0000-4000-8000-000000005751',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005701',
  '00000000-0000-4000-8000-000000005511',
  'stage_1',
  60.00,
  25.00,
  NULL,
  NULL,
  'booked',
  NULL,
  '{"source":"seed"}'::jsonb
)
ON CONFLICT (ar_dunning_run_item_id) DO NOTHING;

INSERT INTO ar_writeoffs (
  ar_writeoff_id,
  company_id,
  ar_open_item_id,
  customer_invoice_id,
  ar_allocation_id,
  status,
  reason_code,
  policy_limit_amount,
  requires_approval,
  approved_by_actor_id,
  writeoff_amount,
  currency_code,
  functional_amount,
  ledger_account_no,
  writeoff_date,
  reversal_of_writeoff_id,
  metadata_json,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000005781',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000005702',
  '00000000-0000-4000-8000-000000005512',
  NULL,
  'posted',
  'small_difference_policy',
  100.00,
  FALSE,
  NULL,
  49.00,
  'SEK',
  49.00,
  '6900',
  DATE '2026-05-12',
  NULL,
  '{"source":"seed"}'::jsonb,
  'system'
)
ON CONFLICT (ar_writeoff_id) DO NOTHING;

INSERT INTO ar_aging_snapshots (
  ar_aging_snapshot_id,
  company_id,
  cutoff_date,
  source_hash,
  open_item_count,
  bucket_totals_json,
  customer_totals_json,
  generated_by_actor_id,
  generated_at
)
VALUES (
  '00000000-0000-4000-8000-000000005791',
  '00000000-0000-4000-8000-000000000001',
  DATE '2026-04-30',
  'aging-seed-2026-04-30-v1',
  1,
  '{"current":0,"1_30":13125.00,"31_60":0,"61_90":0,"91_plus":0}'::jsonb,
  '{"00000000-0000-4000-8000-000000005101":13125.00}'::jsonb,
  'system',
  TIMESTAMPTZ '2026-04-30T23:00:00Z'
)
ON CONFLICT (ar_aging_snapshot_id) DO NOTHING;
