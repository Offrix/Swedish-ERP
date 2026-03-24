CREATE TABLE IF NOT EXISTS bank_statement_events (
  bank_statement_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(bank_account_id) ON DELETE CASCADE,
  external_reference TEXT NOT NULL,
  booking_date DATE NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  counterparty_name TEXT,
  reference_text TEXT,
  statement_category_code TEXT NOT NULL DEFAULT 'generic',
  linked_payment_order_id UUID REFERENCES payment_orders(payment_order_id) ON DELETE SET NULL,
  payment_order_action TEXT,
  match_status TEXT NOT NULL DEFAULT 'reconciliation_required',
  processing_status TEXT NOT NULL DEFAULT 'received',
  matched_object_type TEXT,
  matched_object_id TEXT,
  reconciliation_case_id UUID,
  tax_account_event_id UUID,
  failure_reason_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, bank_account_id, external_reference, booking_date, amount)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_statement_events_phase14_category'
  ) THEN
    ALTER TABLE bank_statement_events
      ADD CONSTRAINT ck_bank_statement_events_phase14_category
      CHECK (statement_category_code IN ('generic', 'tax_account'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_statement_events_phase14_match_status'
  ) THEN
    ALTER TABLE bank_statement_events
      ADD CONSTRAINT ck_bank_statement_events_phase14_match_status
      CHECK (match_status IN ('matched_payment_order', 'matched_tax_account', 'reconciliation_required'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_statement_events_phase14_processing_status'
  ) THEN
    ALTER TABLE bank_statement_events
      ADD CONSTRAINT ck_bank_statement_events_phase14_processing_status
      CHECK (processing_status IN ('received', 'processed', 'reconciliation_required'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bank_statement_events_phase14_match
  ON bank_statement_events (company_id, bank_account_id, match_status, processing_status, booking_date);

CREATE TABLE IF NOT EXISTS bank_reconciliation_cases (
  bank_reconciliation_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(bank_account_id) ON DELETE CASCADE,
  bank_statement_event_id UUID NOT NULL REFERENCES bank_statement_events(bank_statement_event_id) ON DELETE CASCADE,
  case_type_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  difference_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  reason_code TEXT NOT NULL,
  resolution_code TEXT,
  resolution_note TEXT,
  resolved_by_actor_id TEXT,
  resolved_at TIMESTAMPTZ,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_reconciliation_cases_phase14_status'
  ) THEN
    ALTER TABLE bank_reconciliation_cases
      ADD CONSTRAINT ck_bank_reconciliation_cases_phase14_status
      CHECK (status IN ('open', 'in_review', 'resolved', 'written_off'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bank_reconciliation_cases_phase14_status
  ON bank_reconciliation_cases (company_id, status, created_at DESC);

ALTER TABLE payment_proposals
  ADD COLUMN IF NOT EXISTS failure_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS failure_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS last_statement_event_id UUID REFERENCES bank_statement_events(bank_statement_event_id) ON DELETE SET NULL;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324240000_phase14_banking_runtime_statement_reconciliation')
ON CONFLICT (migration_id) DO NOTHING;
