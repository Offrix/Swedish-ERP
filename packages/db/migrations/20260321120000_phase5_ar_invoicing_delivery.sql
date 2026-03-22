CREATE TABLE IF NOT EXISTS ar_invoice_number_series (
  ar_invoice_number_series_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  series_code TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT '',
  next_number BIGINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, series_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_invoice_number_series_phase5_2_series_code'
  ) THEN
    ALTER TABLE ar_invoice_number_series
      ADD CONSTRAINT ck_ar_invoice_number_series_phase5_2_series_code
      CHECK (series_code IN ('B', 'C'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_invoice_number_series_phase5_2_next_number'
  ) THEN
    ALTER TABLE ar_invoice_number_series
      ADD CONSTRAINT ck_ar_invoice_number_series_phase5_2_next_number
      CHECK (next_number >= 1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_invoice_number_series_phase5_2_status'
  ) THEN
    ALTER TABLE ar_invoice_number_series
      ADD CONSTRAINT ck_ar_invoice_number_series_phase5_2_status
      CHECK (status IN ('active', 'paused', 'archived'));
  END IF;
END $$;

ALTER TABLE customer_invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS invoice_series_code TEXT NOT NULL DEFAULT 'B',
  ADD COLUMN IF NOT EXISTS invoice_sequence_number BIGINT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS invoice_generation_key TEXT,
  ADD COLUMN IF NOT EXISTS issue_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(contract_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_plan_id UUID REFERENCES invoice_plans(invoice_plan_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_plan_line_id UUID REFERENCES invoice_plan_lines(invoice_plan_line_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS credit_override_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS payment_terms_code TEXT NOT NULL DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS issue_date DATE,
  ADD COLUMN IF NOT EXISTS tax_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS subscription_period_start DATE,
  ADD COLUMN IF NOT EXISTS subscription_period_end DATE,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_code TEXT NOT NULL DEFAULT 'bankgiro',
  ADD COLUMN IF NOT EXISTS delivery_method_code TEXT NOT NULL DEFAULT 'pdf_email',
  ADD COLUMN IF NOT EXISTS channel_preference_code TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS proforma_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS peppol_buyer_reference TEXT,
  ADD COLUMN IF NOT EXISTS peppol_order_reference TEXT,
  ADD COLUMN IF NOT EXISTS peppol_profile_id TEXT,
  ADD COLUMN IF NOT EXISTS peppol_process_id TEXT,
  ADD COLUMN IF NOT EXISTS peppol_document_type_id TEXT,
  ADD COLUMN IF NOT EXISTS header_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS immutable_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS posted_journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase5_2_invoice_type'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase5_2_invoice_type
      CHECK (invoice_type IN ('standard', 'credit_note', 'partial', 'subscription', 'proforma'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase5_2_series_code'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase5_2_series_code
      CHECK (invoice_series_code IN ('B', 'C'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase5_2_status'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase5_2_status
      CHECK (
        status IN (
          'draft',
          'validated',
          'approved',
          'issued',
          'delivered',
          'partially_paid',
          'paid',
          'overdue',
          'disputed',
          'credited',
          'written_off',
          'reversed',
          'delivery_failed'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase5_2_due_date'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase5_2_due_date
      CHECK (
        due_date IS NULL
        OR issue_date IS NULL
        OR payment_terms_code = 'due_on_receipt'
        OR due_date >= issue_date
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase5_2_credit_link'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase5_2_credit_link
      CHECK (
        invoice_type <> 'credit_note'
        OR original_customer_invoice_id IS NOT NULL
        OR credit_reason_code IS NOT NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase5_2_subscription_period'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase5_2_subscription_period
      CHECK (
        invoice_type <> 'subscription'
        OR (
          subscription_period_start IS NOT NULL
          AND subscription_period_end IS NOT NULL
          AND subscription_period_end >= subscription_period_start
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase5_2_issued_fields'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase5_2_issued_fields
      CHECK (
        status NOT IN ('issued', 'delivered', 'partially_paid', 'paid', 'overdue', 'disputed', 'credited', 'written_off', 'reversed')
        OR (
          invoice_number IS NOT NULL
          AND issue_date IS NOT NULL
          AND due_date IS NOT NULL
          AND payment_reference IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoices_phase5_2_invoice_number
  ON customer_invoices (company_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoices_phase5_2_series_sequence
  ON customer_invoices (company_id, invoice_series_code, invoice_sequence_number)
  WHERE invoice_sequence_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoices_phase5_2_generation_key
  ON customer_invoices (company_id, invoice_generation_key)
  WHERE invoice_generation_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoices_phase5_2_issue_key
  ON customer_invoices (company_id, issue_idempotency_key)
  WHERE issue_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_customer_invoices_phase5_2_source
  ON customer_invoices (company_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS ix_customer_invoices_phase5_2_contract_plan
  ON customer_invoices (company_id, contract_id, invoice_plan_id, status);

CREATE TABLE IF NOT EXISTS customer_invoice_lines (
  customer_invoice_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'item',
  ar_item_id UUID REFERENCES ar_items(ar_item_id) ON DELETE SET NULL,
  source_type TEXT,
  source_id TEXT,
  source_version TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
  line_amount_ex_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  vat_code TEXT,
  vat_rate NUMERIC(9, 4),
  vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  line_amount_inc_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  out_of_scope_flag BOOLEAN NOT NULL DEFAULT FALSE,
  vat_decision_id UUID REFERENCES vat_decisions(vat_decision_id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_invoice_id, line_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_lines_phase5_2_line_type'
  ) THEN
    ALTER TABLE customer_invoice_lines
      ADD CONSTRAINT ck_customer_invoice_lines_phase5_2_line_type
      CHECK (line_type IN ('item', 'text', 'fee', 'discount', 'subscription'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_lines_phase5_2_quantity'
  ) THEN
    ALTER TABLE customer_invoice_lines
      ADD CONSTRAINT ck_customer_invoice_lines_phase5_2_quantity
      CHECK (quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_lines_phase5_2_unit_price'
  ) THEN
    ALTER TABLE customer_invoice_lines
      ADD CONSTRAINT ck_customer_invoice_lines_phase5_2_unit_price
      CHECK (unit_price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_lines_phase5_2_discount'
  ) THEN
    ALTER TABLE customer_invoice_lines
      ADD CONSTRAINT ck_customer_invoice_lines_phase5_2_discount
      CHECK (discount_percent >= 0 AND discount_percent <= 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_customer_invoice_lines_phase5_2_vat
  ON customer_invoice_lines (company_id, vat_code, vat_decision_id);

CREATE TABLE IF NOT EXISTS customer_invoice_credit_links (
  customer_invoice_credit_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  credit_customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE CASCADE,
  original_customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE RESTRICT,
  credit_customer_invoice_line_id UUID REFERENCES customer_invoice_lines(customer_invoice_line_id) ON DELETE SET NULL,
  original_customer_invoice_line_id UUID REFERENCES customer_invoice_lines(customer_invoice_line_id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  credit_amount_ex_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit_vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit_amount_inc_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  override_flag BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (credit_customer_invoice_id, original_customer_invoice_id, original_customer_invoice_line_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_credit_links_phase5_2_amount_non_negative'
  ) THEN
    ALTER TABLE customer_invoice_credit_links
      ADD CONSTRAINT ck_customer_invoice_credit_links_phase5_2_amount_non_negative
      CHECK (credit_amount_inc_vat >= 0 AND credit_amount_ex_vat >= 0 AND credit_vat_amount >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS customer_invoice_issue_events (
  customer_invoice_issue_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE CASCADE,
  issue_idempotency_key TEXT NOT NULL,
  voucher_series_code TEXT NOT NULL,
  posting_source_type TEXT NOT NULL,
  voucher_number BIGINT,
  journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  event_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, issue_idempotency_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_issue_events_phase5_2_series'
  ) THEN
    ALTER TABLE customer_invoice_issue_events
      ADD CONSTRAINT ck_customer_invoice_issue_events_phase5_2_series
      CHECK (voucher_series_code IN ('B', 'C'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_issue_events_phase5_2_source'
  ) THEN
    ALTER TABLE customer_invoice_issue_events
      ADD CONSTRAINT ck_customer_invoice_issue_events_phase5_2_source
      CHECK (posting_source_type IN ('AR_INVOICE', 'AR_CREDIT_NOTE'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_issue_events_phase5_2_status'
  ) THEN
    ALTER TABLE customer_invoice_issue_events
      ADD CONSTRAINT ck_customer_invoice_issue_events_phase5_2_status
      CHECK (status IN ('reserved', 'posted', 'failed', 'reversed'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoice_issue_events_phase5_2_invoice_once
  ON customer_invoice_issue_events (customer_invoice_id)
  WHERE status IN ('reserved', 'posted');

CREATE TABLE IF NOT EXISTS customer_invoice_deliveries (
  customer_invoice_delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE CASCADE,
  channel_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt_no INTEGER NOT NULL DEFAULT 1,
  recipient_address TEXT,
  recipient_name TEXT,
  transport_provider TEXT,
  provider_message_id TEXT,
  peppol_message_id UUID REFERENCES peppol_messages(peppol_message_id) ON DELETE SET NULL,
  peppol_profile_id TEXT,
  peppol_process_id TEXT,
  peppol_document_type_id TEXT,
  peppol_validation_status TEXT,
  peppol_validation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_document_version_id UUID REFERENCES document_versions(document_version_id) ON DELETE SET NULL,
  delivery_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  receipt_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_invoice_id, channel_code, attempt_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_deliveries_phase5_2_channel'
  ) THEN
    ALTER TABLE customer_invoice_deliveries
      ADD CONSTRAINT ck_customer_invoice_deliveries_phase5_2_channel
      CHECK (channel_code IN ('pdf_email', 'peppol', 'api', 'manual'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_deliveries_phase5_2_status'
  ) THEN
    ALTER TABLE customer_invoice_deliveries
      ADD CONSTRAINT ck_customer_invoice_deliveries_phase5_2_status
      CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced', 'acknowledged'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_customer_invoice_deliveries_phase5_2_status
  ON customer_invoice_deliveries (company_id, channel_code, status, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_invoice_delivery_events (
  customer_invoice_delivery_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_invoice_delivery_id UUID NOT NULL REFERENCES customer_invoice_deliveries(customer_invoice_delivery_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  event_status TEXT NOT NULL,
  event_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_customer_invoice_delivery_events_phase5_2_delivery
  ON customer_invoice_delivery_events (customer_invoice_delivery_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS customer_invoice_payment_links (
  customer_invoice_payment_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  provider_payment_link_id TEXT,
  payment_url TEXT NOT NULL,
  link_token_hash TEXT,
  amount NUMERIC(18, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  status TEXT NOT NULL DEFAULT 'draft',
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_payment_links_phase5_2_status'
  ) THEN
    ALTER TABLE customer_invoice_payment_links
      ADD CONSTRAINT ck_customer_invoice_payment_links_phase5_2_status
      CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'completed', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_payment_links_phase5_2_amount'
  ) THEN
    ALTER TABLE customer_invoice_payment_links
      ADD CONSTRAINT ck_customer_invoice_payment_links_phase5_2_amount
      CHECK (amount >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoice_payment_links_phase5_2_provider_id
  ON customer_invoice_payment_links (company_id, provider_code, provider_payment_link_id)
  WHERE provider_payment_link_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoice_payment_links_phase5_2_active_link
  ON customer_invoice_payment_links (customer_invoice_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS ix_customer_invoice_payment_links_phase5_2_status
  ON customer_invoice_payment_links (company_id, status, expires_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321120000_phase5_ar_invoicing_delivery')
ON CONFLICT (migration_id) DO NOTHING;
