ALTER TABLE ar_open_items
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS functional_currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credited_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS writeoff_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputed_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS closed_on DATE,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aging_bucket_code TEXT NOT NULL DEFAULT 'current',
  ADD COLUMN IF NOT EXISTS collection_stage_code TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dispute_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dunning_hold_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_open_items_phase5_3_status'
  ) THEN
    ALTER TABLE ar_open_items
      ADD CONSTRAINT ck_ar_open_items_phase5_3_status
      CHECK (status IN ('open', 'partially_settled', 'settled', 'disputed', 'written_off', 'reversed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_open_items_phase5_3_aging_bucket'
  ) THEN
    ALTER TABLE ar_open_items
      ADD CONSTRAINT ck_ar_open_items_phase5_3_aging_bucket
      CHECK (aging_bucket_code IN ('current', '1_30', '31_60', '61_90', '91_plus'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_open_items_phase5_3_collection_stage'
  ) THEN
    ALTER TABLE ar_open_items
      ADD CONSTRAINT ck_ar_open_items_phase5_3_collection_stage
      CHECK (collection_stage_code IN ('none', 'stage_1', 'stage_2', 'escalated', 'hold', 'closed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_open_items_phase5_3_non_negative_amounts'
  ) THEN
    ALTER TABLE ar_open_items
      ADD CONSTRAINT ck_ar_open_items_phase5_3_non_negative_amounts
      CHECK (
        open_amount >= 0
        AND original_amount >= 0
        AND paid_amount >= 0
        AND credited_amount >= 0
        AND writeoff_amount >= 0
        AND disputed_amount >= 0
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_open_items_phase5_3_idempotency
  ON ar_open_items (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ar_open_items_phase5_3_due_status
  ON ar_open_items (company_id, due_on, status, aging_bucket_code);

CREATE INDEX IF NOT EXISTS ix_ar_open_items_phase5_3_customer
  ON ar_open_items (company_id, customer_id, status, due_on);

CREATE TABLE IF NOT EXISTS ar_open_item_events (
  ar_open_item_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_open_item_id UUID NOT NULL REFERENCES ar_open_items(ar_open_item_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  event_reason_code TEXT,
  event_source_type TEXT NOT NULL,
  event_source_id TEXT NOT NULL,
  amount_delta NUMERIC(18, 2) NOT NULL DEFAULT 0,
  open_amount_before NUMERIC(18, 2) NOT NULL,
  open_amount_after NUMERIC(18, 2) NOT NULL,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ar_open_item_events_phase5_3_item_time
  ON ar_open_item_events (ar_open_item_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS ar_payment_matching_runs (
  ar_payment_matching_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  source_channel TEXT NOT NULL,
  external_batch_ref TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  run_started_at TIMESTAMPTZ NOT NULL,
  run_completed_at TIMESTAMPTZ,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_payment_matching_runs_phase5_3_channel'
  ) THEN
    ALTER TABLE ar_payment_matching_runs
      ADD CONSTRAINT ck_ar_payment_matching_runs_phase5_3_channel
      CHECK (source_channel IN ('bank_feed', 'bank_file', 'webhook', 'manual'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_payment_matching_runs_phase5_3_status'
  ) THEN
    ALTER TABLE ar_payment_matching_runs
      ADD CONSTRAINT ck_ar_payment_matching_runs_phase5_3_status
      CHECK (status IN ('received', 'matched', 'review_required', 'completed', 'failed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ar_payment_match_candidates (
  ar_payment_match_candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_payment_matching_run_id UUID NOT NULL REFERENCES ar_payment_matching_runs(ar_payment_matching_run_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  ar_open_item_id UUID REFERENCES ar_open_items(ar_open_item_id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  bank_transaction_uid TEXT NOT NULL,
  statement_line_hash TEXT NOT NULL,
  payer_reference TEXT,
  amount NUMERIC(18, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  value_date DATE NOT NULL,
  match_score NUMERIC(9, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'proposed',
  reason_code TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, bank_transaction_uid, ar_open_item_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_payment_match_candidates_phase5_3_status'
  ) THEN
    ALTER TABLE ar_payment_match_candidates
      ADD CONSTRAINT ck_ar_payment_match_candidates_phase5_3_status
      CHECK (status IN ('proposed', 'confirmed', 'rejected', 'reversed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ar_payment_match_candidates_phase5_3_review
  ON ar_payment_match_candidates (company_id, status, value_date DESC);

CREATE TABLE IF NOT EXISTS ar_allocations (
  ar_allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  ar_open_item_id UUID NOT NULL REFERENCES ar_open_items(ar_open_item_id) ON DELETE RESTRICT,
  customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  allocation_type TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  allocated_amount NUMERIC(18, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  functional_amount NUMERIC(18, 2) NOT NULL,
  allocated_on DATE NOT NULL,
  bank_transaction_uid TEXT,
  statement_line_hash TEXT,
  external_event_ref TEXT,
  ar_payment_matching_run_id UUID REFERENCES ar_payment_matching_runs(ar_payment_matching_run_id) ON DELETE SET NULL,
  reversal_of_allocation_id UUID REFERENCES ar_allocations(ar_allocation_id) ON DELETE SET NULL,
  reason_code TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_allocations_phase5_3_type'
  ) THEN
    ALTER TABLE ar_allocations
      ADD CONSTRAINT ck_ar_allocations_phase5_3_type
      CHECK (allocation_type IN ('payment', 'credit_note', 'prepayment', 'writeoff_adjustment'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_allocations_phase5_3_channel'
  ) THEN
    ALTER TABLE ar_allocations
      ADD CONSTRAINT ck_ar_allocations_phase5_3_channel
      CHECK (source_channel IN ('bank_feed', 'bank_file', 'webhook', 'manual', 'system'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_allocations_phase5_3_status'
  ) THEN
    ALTER TABLE ar_allocations
      ADD CONSTRAINT ck_ar_allocations_phase5_3_status
      CHECK (status IN ('proposed', 'confirmed', 'reversed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_allocations_phase5_3_amount_positive'
  ) THEN
    ALTER TABLE ar_allocations
      ADD CONSTRAINT ck_ar_allocations_phase5_3_amount_positive
      CHECK (allocated_amount > 0 AND functional_amount > 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_allocations_phase5_3_external_ref
  ON ar_allocations (company_id, external_event_ref, ar_open_item_id)
  WHERE external_event_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ar_allocations_phase5_3_open_item
  ON ar_allocations (ar_open_item_id, status, allocated_on DESC);

CREATE INDEX IF NOT EXISTS ix_ar_allocations_phase5_3_bank_lineage
  ON ar_allocations (company_id, bank_transaction_uid, statement_line_hash);

CREATE TABLE IF NOT EXISTS ar_unmatched_bank_receipts (
  ar_unmatched_bank_receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  bank_transaction_uid TEXT NOT NULL,
  statement_line_hash TEXT NOT NULL,
  value_date DATE NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  payer_reference TEXT,
  customer_hint TEXT,
  status TEXT NOT NULL DEFAULT 'unmatched',
  linked_ar_allocation_id UUID REFERENCES ar_allocations(ar_allocation_id) ON DELETE SET NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, bank_transaction_uid, statement_line_hash)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_unmatched_bank_receipts_phase5_3_status'
  ) THEN
    ALTER TABLE ar_unmatched_bank_receipts
      ADD CONSTRAINT ck_ar_unmatched_bank_receipts_phase5_3_status
      CHECK (status IN ('unmatched', 'partially_allocated', 'allocated', 'reversed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ar_dunning_runs (
  ar_dunning_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  stage_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  calculation_window_start DATE NOT NULL,
  calculation_window_end DATE NOT NULL,
  idempotency_key TEXT NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_dunning_runs_phase5_3_stage'
  ) THEN
    ALTER TABLE ar_dunning_runs
      ADD CONSTRAINT ck_ar_dunning_runs_phase5_3_stage
      CHECK (stage_code IN ('stage_1', 'stage_2', 'escalated'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_dunning_runs_phase5_3_status'
  ) THEN
    ALTER TABLE ar_dunning_runs
      ADD CONSTRAINT ck_ar_dunning_runs_phase5_3_status
      CHECK (status IN ('draft', 'executed', 'reversed', 'cancelled'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ar_dunning_run_items (
  ar_dunning_run_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_dunning_run_id UUID NOT NULL REFERENCES ar_dunning_runs(ar_dunning_run_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  ar_open_item_id UUID NOT NULL REFERENCES ar_open_items(ar_open_item_id) ON DELETE RESTRICT,
  customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  stage_code TEXT NOT NULL,
  fee_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  interest_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  fee_customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  interest_customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  action_status TEXT NOT NULL DEFAULT 'proposed',
  skip_reason_code TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ar_dunning_run_id, ar_open_item_id, stage_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_dunning_run_items_phase5_3_stage'
  ) THEN
    ALTER TABLE ar_dunning_run_items
      ADD CONSTRAINT ck_ar_dunning_run_items_phase5_3_stage
      CHECK (stage_code IN ('stage_1', 'stage_2', 'escalated'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_dunning_run_items_phase5_3_action_status'
  ) THEN
    ALTER TABLE ar_dunning_run_items
      ADD CONSTRAINT ck_ar_dunning_run_items_phase5_3_action_status
      CHECK (action_status IN ('proposed', 'booked', 'skipped', 'reversed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_dunning_run_items_phase5_3_non_negative'
  ) THEN
    ALTER TABLE ar_dunning_run_items
      ADD CONSTRAINT ck_ar_dunning_run_items_phase5_3_non_negative
      CHECK (fee_amount >= 0 AND interest_amount >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ar_writeoffs (
  ar_writeoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  ar_open_item_id UUID NOT NULL REFERENCES ar_open_items(ar_open_item_id) ON DELETE RESTRICT,
  customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  ar_allocation_id UUID REFERENCES ar_allocations(ar_allocation_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  reason_code TEXT NOT NULL,
  policy_limit_amount NUMERIC(18, 2),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_actor_id TEXT,
  writeoff_amount NUMERIC(18, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  functional_amount NUMERIC(18, 2) NOT NULL,
  ledger_account_no TEXT NOT NULL DEFAULT '6900',
  writeoff_date DATE NOT NULL,
  reversal_of_writeoff_id UUID REFERENCES ar_writeoffs(ar_writeoff_id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_writeoffs_phase5_3_status'
  ) THEN
    ALTER TABLE ar_writeoffs
      ADD CONSTRAINT ck_ar_writeoffs_phase5_3_status
      CHECK (status IN ('proposed', 'approved', 'posted', 'reversed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_writeoffs_phase5_3_amount_positive'
  ) THEN
    ALTER TABLE ar_writeoffs
      ADD CONSTRAINT ck_ar_writeoffs_phase5_3_amount_positive
      CHECK (writeoff_amount > 0 AND functional_amount > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ar_writeoffs_phase5_3_open_item
  ON ar_writeoffs (ar_open_item_id, status, writeoff_date DESC);

CREATE TABLE IF NOT EXISTS ar_aging_snapshots (
  ar_aging_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  cutoff_date DATE NOT NULL,
  source_hash TEXT NOT NULL,
  open_item_count INTEGER NOT NULL DEFAULT 0,
  bucket_totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_actor_id TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, cutoff_date, source_hash)
);

CREATE INDEX IF NOT EXISTS ix_ar_aging_snapshots_phase5_3_cutoff
  ON ar_aging_snapshots (company_id, cutoff_date DESC);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321130000_phase5_ar_receivables_dunning_matching')
ON CONFLICT (migration_id) DO NOTHING;
