ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS attest_chain_id UUID REFERENCES approval_chains(approval_chain_id) ON DELETE SET NULL;

ALTER TABLE supplier_invoices
  ADD COLUMN IF NOT EXISTS approval_chain_id UUID REFERENCES approval_chains(approval_chain_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_hold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_hold_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_for_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_2_status'
  ) THEN
    ALTER TABLE supplier_invoices
      DROP CONSTRAINT ck_supplier_invoices_phase6_2_status;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_3_status'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase6_3_status
      CHECK (status IN ('draft', 'matching', 'pending_approval', 'approved', 'posted', 'scheduled_for_payment', 'paid', 'credited', 'voided'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_3_approval_status'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase6_3_approval_status
      CHECK (approval_status IN ('not_required', 'pending', 'approved'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_supplier_invoices_phase6_3_approval_queue
  ON supplier_invoices (company_id, status, approval_status, payment_hold, due_date);

CREATE INDEX IF NOT EXISTS ix_suppliers_phase6_3_attest_chain
  ON suppliers (company_id, attest_chain_id)
  WHERE attest_chain_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ap_supplier_invoice_approval_steps (
  ap_supplier_invoice_approval_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE CASCADE,
  approval_chain_id UUID NOT NULL REFERENCES approval_chains(approval_chain_id) ON DELETE RESTRICT,
  approval_chain_step_id UUID REFERENCES approval_chain_steps(approval_chain_step_id) ON DELETE SET NULL,
  step_order INTEGER NOT NULL,
  approver_company_user_id UUID REFERENCES company_users(company_user_id) ON DELETE SET NULL,
  approver_role_code TEXT REFERENCES roles(role_code),
  status TEXT NOT NULL DEFAULT 'pending',
  acted_by_actor_id TEXT,
  acted_by_company_user_id UUID REFERENCES company_users(company_user_id) ON DELETE SET NULL,
  acted_by_role_code TEXT,
  acted_at TIMESTAMPTZ,
  explanation TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_invoice_id, step_order)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_approval_steps_phase6_3_status'
  ) THEN
    ALTER TABLE ap_supplier_invoice_approval_steps
      ADD CONSTRAINT ck_ap_supplier_invoice_approval_steps_phase6_3_status
      CHECK (status IN ('pending', 'approved', 'rejected', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ap_supplier_invoice_approval_steps_phase6_3_invoice
  ON ap_supplier_invoice_approval_steps (company_id, supplier_invoice_id, step_order);

CREATE TABLE IF NOT EXISTS bank_accounts (
  bank_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  bank_account_no TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  ledger_account_no TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  clearing_number TEXT,
  account_number TEXT,
  bankgiro TEXT,
  plusgiro TEXT,
  iban TEXT,
  bic TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, bank_account_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_accounts_phase6_3_status'
  ) THEN
    ALTER TABLE bank_accounts
      ADD CONSTRAINT ck_bank_accounts_phase6_3_status
      CHECK (status IN ('active', 'blocked', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_accounts_phase6_3_currency'
  ) THEN
    ALTER TABLE bank_accounts
      ADD CONSTRAINT ck_bank_accounts_phase6_3_currency
      CHECK (currency_code ~ '^[A-Z]{3}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_accounts_phase6_3_account_number
  ON bank_accounts (company_id, account_number)
  WHERE account_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_accounts_phase6_3_bankgiro
  ON bank_accounts (company_id, bankgiro)
  WHERE bankgiro IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_accounts_phase6_3_plusgiro
  ON bank_accounts (company_id, plusgiro)
  WHERE plusgiro IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_accounts_phase6_3_iban
  ON bank_accounts (company_id, iban)
  WHERE iban IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_proposals (
  payment_proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  payment_proposal_no TEXT NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(bank_account_id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_date DATE NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  source_open_item_set_hash TEXT NOT NULL,
  export_file_name TEXT,
  export_payload TEXT,
  export_payload_hash TEXT,
  approved_by_actor_id TEXT,
  approved_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  accepted_by_bank_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, payment_proposal_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_payment_proposals_phase6_3_status'
  ) THEN
    ALTER TABLE payment_proposals
      ADD CONSTRAINT ck_payment_proposals_phase6_3_status
      CHECK (status IN ('draft', 'approved', 'exported', 'submitted', 'accepted_by_bank', 'partially_executed', 'settled', 'failed', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_payment_proposals_phase6_3_currency'
  ) THEN
    ALTER TABLE payment_proposals
      ADD CONSTRAINT ck_payment_proposals_phase6_3_currency
      CHECK (currency_code ~ '^[A-Z]{3}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_proposals_phase6_3_open_item_set
  ON payment_proposals (company_id, source_open_item_set_hash);

CREATE INDEX IF NOT EXISTS ix_payment_proposals_phase6_3_status
  ON payment_proposals (company_id, status, payment_date);

CREATE TABLE IF NOT EXISTS payment_orders (
  payment_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  payment_proposal_id UUID NOT NULL REFERENCES payment_proposals(payment_proposal_id) ON DELETE CASCADE,
  ap_open_item_id UUID NOT NULL REFERENCES ap_open_items(ap_open_item_id) ON DELETE RESTRICT,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
  payment_order_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared',
  payee_name TEXT NOT NULL,
  bankgiro TEXT,
  plusgiro TEXT,
  account_number TEXT,
  iban TEXT,
  bic TEXT,
  payment_reference TEXT,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  due_date DATE,
  lineage_key TEXT NOT NULL,
  reserved_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  booked_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  rejected_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  returned_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  bank_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, payment_order_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_payment_orders_phase6_3_status'
  ) THEN
    ALTER TABLE payment_orders
      ADD CONSTRAINT ck_payment_orders_phase6_3_status
      CHECK (status IN ('prepared', 'reserved', 'sent', 'accepted', 'booked', 'returned', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_payment_orders_phase6_3_currency'
  ) THEN
    ALTER TABLE payment_orders
      ADD CONSTRAINT ck_payment_orders_phase6_3_currency
      CHECK (currency_code ~ '^[A-Z]{3}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_orders_phase6_3_lineage_key
  ON payment_orders (company_id, lineage_key);

CREATE INDEX IF NOT EXISTS ix_payment_orders_phase6_3_proposal
  ON payment_orders (company_id, payment_proposal_id, status);

CREATE TABLE IF NOT EXISTS bank_payment_events (
  bank_payment_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  payment_order_id UUID NOT NULL REFERENCES payment_orders(payment_order_id) ON DELETE CASCADE,
  bank_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_by_actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, event_type, bank_event_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_payment_events_phase6_3_type'
  ) THEN
    ALTER TABLE bank_payment_events
      ADD CONSTRAINT ck_bank_payment_events_phase6_3_type
      CHECK (event_type IN ('booked', 'rejected', 'returned'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bank_payment_events_phase6_3_status'
  ) THEN
    ALTER TABLE bank_payment_events
      ADD CONSTRAINT ck_bank_payment_events_phase6_3_status
      CHECK (status IN ('received', 'processed', 'replayed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bank_payment_events_phase6_3_payment_order
  ON bank_payment_events (company_id, payment_order_id, created_at DESC);

ALTER TABLE ap_open_items
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_hold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_hold_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_proposal_id UUID REFERENCES payment_proposals(payment_proposal_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_order_id UUID REFERENCES payment_orders(payment_order_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_payment_order_id UUID REFERENCES payment_orders(payment_order_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_bank_event_id TEXT,
  ADD COLUMN IF NOT EXISTS last_reservation_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_settlement_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_return_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_rejection_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_open_items_phase6_3_amounts'
  ) THEN
    ALTER TABLE ap_open_items
      ADD CONSTRAINT ck_ap_open_items_phase6_3_amounts
      CHECK (
        original_amount >= 0
        AND open_amount >= 0
        AND reserved_amount >= 0
        AND paid_amount >= 0
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_open_items_phase6_3_status'
  ) THEN
    ALTER TABLE ap_open_items
      ADD CONSTRAINT ck_ap_open_items_phase6_3_status
      CHECK (status IN ('open', 'paid', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ap_open_items_phase6_3_status_due
  ON ap_open_items (company_id, status, due_on);

CREATE INDEX IF NOT EXISTS ix_ap_open_items_phase6_3_payment_links
  ON ap_open_items (company_id, payment_proposal_id, payment_order_id);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321160000_phase6_ap_attest_payments')
ON CONFLICT (migration_id) DO NOTHING;
