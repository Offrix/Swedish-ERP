ALTER TABLE supplier_invoices
  ADD COLUMN IF NOT EXISTS supplier_invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_queue_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS duplicate_of_supplier_invoice_id UUID REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_actor_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_2_source_channel'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase6_2_source_channel
      CHECK (source_channel IN ('manual', 'email', 'api', 'peppol', 'integration'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_2_status'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase6_2_status
      CHECK (
        status IN (
          'draft',
          'matching',
          'pending_approval',
          'approved',
          'posted',
          'scheduled_for_payment',
          'paid',
          'credited',
          'voided'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_invoices_phase6_2_supplier_invoice_no
  ON supplier_invoices (company_id, supplier_invoice_no)
  WHERE supplier_invoice_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_supplier_invoices_phase6_2_status
  ON supplier_invoices (company_id, status, review_required, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_supplier_invoices_phase6_2_document
  ON supplier_invoices (company_id, document_id)
  WHERE document_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ap_supplier_invoice_lines (
  ap_supplier_invoice_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  vat_code TEXT,
  vat_rate NUMERIC(9, 4) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  expense_account_no TEXT,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  goods_or_services TEXT NOT NULL DEFAULT 'services',
  reverse_charge_flag BOOLEAN NOT NULL DEFAULT FALSE,
  construction_service_flag BOOLEAN NOT NULL DEFAULT FALSE,
  deduction_ratio NUMERIC(9, 4) NOT NULL DEFAULT 1,
  receipt_required BOOLEAN NOT NULL DEFAULT FALSE,
  purchase_order_line_id UUID REFERENCES purchase_order_lines(purchase_order_line_id) ON DELETE SET NULL,
  purchase_order_line_reference TEXT,
  matched_purchase_order_line_id UUID REFERENCES purchase_order_lines(purchase_order_line_id) ON DELETE SET NULL,
  tolerance_profile_code TEXT,
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  review_queue_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  vat_proposal_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_invoice_id, line_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_lines_phase6_2_values'
  ) THEN
    ALTER TABLE ap_supplier_invoice_lines
      ADD CONSTRAINT ck_ap_supplier_invoice_lines_phase6_2_values
      CHECK (
        quantity > 0
        AND unit_price >= 0
        AND net_amount >= 0
        AND vat_amount >= 0
        AND gross_amount >= 0
        AND deduction_ratio >= 0
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_lines_phase6_2_goods_services'
  ) THEN
    ALTER TABLE ap_supplier_invoice_lines
      ADD CONSTRAINT ck_ap_supplier_invoice_lines_phase6_2_goods_services
      CHECK (goods_or_services IN ('goods', 'services'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ap_supplier_invoice_lines_phase6_2_invoice
  ON ap_supplier_invoice_lines (company_id, supplier_invoice_id, line_no);

CREATE TABLE IF NOT EXISTS ap_supplier_invoice_match_runs (
  ap_supplier_invoice_match_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE CASCADE,
  match_mode TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'matched',
  variance_count INTEGER NOT NULL DEFAULT 0,
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  line_results_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_match_runs_phase6_2_match_mode'
  ) THEN
    ALTER TABLE ap_supplier_invoice_match_runs
      ADD CONSTRAINT ck_ap_supplier_invoice_match_runs_phase6_2_match_mode
      CHECK (match_mode IN ('none', 'two_way', 'three_way'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_match_runs_phase6_2_status'
  ) THEN
    ALTER TABLE ap_supplier_invoice_match_runs
      ADD CONSTRAINT ck_ap_supplier_invoice_match_runs_phase6_2_status
      CHECK (status IN ('matched', 'review_required'));
  END IF;
END $$;

ALTER TABLE supplier_invoices
  ADD COLUMN IF NOT EXISTS latest_match_run_id UUID REFERENCES ap_supplier_invoice_match_runs(ap_supplier_invoice_match_run_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_ap_supplier_invoice_match_runs_phase6_2_invoice
  ON ap_supplier_invoice_match_runs (company_id, supplier_invoice_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ap_supplier_invoice_variances (
  ap_supplier_invoice_variance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE CASCADE,
  ap_supplier_invoice_line_id UUID REFERENCES ap_supplier_invoice_lines(ap_supplier_invoice_line_id) ON DELETE SET NULL,
  variance_code TEXT NOT NULL,
  review_queue_code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  status TEXT NOT NULL DEFAULT 'open',
  message TEXT NOT NULL,
  expected_value_json JSONB,
  actual_value_json JSONB,
  tolerance_value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_variances_phase6_2_severity'
  ) THEN
    ALTER TABLE ap_supplier_invoice_variances
      ADD CONSTRAINT ck_ap_supplier_invoice_variances_phase6_2_severity
      CHECK (severity IN ('warning', 'error'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_variances_phase6_2_status'
  ) THEN
    ALTER TABLE ap_supplier_invoice_variances
      ADD CONSTRAINT ck_ap_supplier_invoice_variances_phase6_2_status
      CHECK (status IN ('open', 'accepted', 'corrected', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ap_supplier_invoice_variances_phase6_2_invoice
  ON ap_supplier_invoice_variances (company_id, supplier_invoice_id, status, created_at DESC);

ALTER TABLE ap_open_items
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321150000_phase6_ap_invoice_ingest_matching')
ON CONFLICT (migration_id) DO NOTHING;
