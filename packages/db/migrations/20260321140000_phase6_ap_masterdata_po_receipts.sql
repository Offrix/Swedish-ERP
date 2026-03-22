ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS supplier_no TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS org_number TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'SE',
  ADD COLUMN IF NOT EXISTS base_currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS payment_terms_code TEXT NOT NULL DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS payment_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS bankgiro TEXT,
  ADD COLUMN IF NOT EXISTS plusgiro TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS default_expense_account_no TEXT,
  ADD COLUMN IF NOT EXISTS default_input_vat_code TEXT,
  ADD COLUMN IF NOT EXISTS default_dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blocked_for_posting BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_for_payment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_po BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_credit_without_link BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reverse_charge_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_class TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS import_source_key TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE suppliers
SET supplier_no = COALESCE(supplier_no, supplier_code, 'SUP-' || SUBSTRING(supplier_id::text FROM 1 FOR 8))
WHERE supplier_no IS NULL;

UPDATE suppliers
SET legal_name = COALESCE(legal_name, display_name)
WHERE legal_name IS NULL;

ALTER TABLE suppliers
  ALTER COLUMN supplier_no SET NOT NULL,
  ALTER COLUMN legal_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_suppliers_phase6_supplier_no_not_blank'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT ck_suppliers_phase6_supplier_no_not_blank
      CHECK (LENGTH(BTRIM(supplier_no)) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_suppliers_phase6_status'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT ck_suppliers_phase6_status
      CHECK (status IN ('draft', 'active', 'blocked', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_suppliers_phase6_country_code'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT ck_suppliers_phase6_country_code
      CHECK (country_code ~ '^[A-Z]{2}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_suppliers_phase6_currency_code'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT ck_suppliers_phase6_currency_code
      CHECK (base_currency_code ~ '^[A-Z]{3}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_suppliers_phase6_requires_receipt_requires_po'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT ck_suppliers_phase6_requires_receipt_requires_po
      CHECK (NOT requires_receipt OR requires_po);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_suppliers_phase6_risk_class'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT ck_suppliers_phase6_risk_class
      CHECK (risk_class IN ('low', 'normal', 'high', 'critical'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_suppliers_phase6_bank_formats'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT ck_suppliers_phase6_bank_formats
      CHECK (
        (bankgiro IS NULL OR bankgiro ~ '^[0-9]{3,4}-?[0-9]{4}$')
        AND (plusgiro IS NULL OR plusgiro ~ '^[0-9]{1,8}-?[0-9]$')
        AND (iban IS NULL OR iban ~ '^[A-Z]{2}[0-9A-Z]{13,32}$')
        AND (bic IS NULL OR bic ~ '^[A-Z0-9]{8}([A-Z0-9]{3})?$')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_phase6_supplier_no
  ON suppliers (company_id, supplier_no);

CREATE INDEX IF NOT EXISTS ix_suppliers_phase6_org_number
  ON suppliers (company_id, org_number);

CREATE INDEX IF NOT EXISTS ix_suppliers_phase6_import_source_key
  ON suppliers (company_id, import_source_key)
  WHERE import_source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS supplier_contacts (
  supplier_contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  contact_no TEXT NOT NULL,
  role_code TEXT NOT NULL DEFAULT 'general',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, supplier_id, contact_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_contacts_phase6_role'
  ) THEN
    ALTER TABLE supplier_contacts
      ADD CONSTRAINT ck_supplier_contacts_phase6_role
      CHECK (role_code IN ('accounts_payable', 'purchasing', 'delivery', 'contract', 'general'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_contacts_phase6_status'
  ) THEN
    ALTER TABLE supplier_contacts
      ADD CONSTRAINT ck_supplier_contacts_phase6_status
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_supplier_contacts_phase6_lookup
  ON supplier_contacts (company_id, supplier_id, is_primary DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS ap_tolerance_profiles (
  ap_tolerance_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  tolerance_profile_code TEXT NOT NULL,
  tolerance_profile_name TEXT NOT NULL,
  price_tolerance_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
  quantity_tolerance_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
  total_tolerance_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  auto_accept_within_tolerance BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, tolerance_profile_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_tolerance_profiles_phase6_ranges'
  ) THEN
    ALTER TABLE ap_tolerance_profiles
      ADD CONSTRAINT ck_ap_tolerance_profiles_phase6_ranges
      CHECK (
        price_tolerance_percent >= 0
        AND quantity_tolerance_percent >= 0
        AND total_tolerance_amount >= 0
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_tolerance_profiles_phase6_status'
  ) THEN
    ALTER TABLE ap_tolerance_profiles
      ADD CONSTRAINT ck_ap_tolerance_profiles_phase6_status
      CHECK (status IN ('active', 'inactive', 'archived'));
  END IF;
END $$;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS po_no TEXT,
  ADD COLUMN IF NOT EXISTS ordered_on DATE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requested_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS supplier_reference TEXT,
  ADD COLUMN IF NOT EXISTS buyer_reference TEXT,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS payment_terms_code TEXT NOT NULL DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS closed_on DATE,
  ADD COLUMN IF NOT EXISTS cancelled_on DATE,
  ADD COLUMN IF NOT EXISTS ap_tolerance_profile_id UUID REFERENCES ap_tolerance_profiles(ap_tolerance_profile_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_expense_account_no TEXT,
  ADD COLUMN IF NOT EXISTS default_input_vat_code TEXT,
  ADD COLUMN IF NOT EXISTS default_dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_amount_ex_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount_inc_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS import_source_key TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE purchase_orders
SET po_no = COALESCE(po_no, po_number, 'PO-' || SUBSTRING(purchase_order_id::text FROM 1 FOR 8))
WHERE po_no IS NULL;

ALTER TABLE purchase_orders
  ALTER COLUMN po_no SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_orders_phase6_status'
  ) THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT ck_purchase_orders_phase6_status
      CHECK (status IN ('draft', 'approved', 'sent', 'partially_received', 'fully_received', 'closed', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_orders_phase6_currency'
  ) THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT ck_purchase_orders_phase6_currency
      CHECK (currency_code ~ '^[A-Z]{3}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_orders_phase6_totals_non_negative'
  ) THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT ck_purchase_orders_phase6_totals_non_negative
      CHECK (
        total_amount_ex_vat >= 0
        AND total_vat_amount >= 0
        AND total_amount_inc_vat >= 0
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_orders_phase6_closed_cancelled_dates'
  ) THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT ck_purchase_orders_phase6_closed_cancelled_dates
      CHECK (
        (closed_on IS NULL OR ordered_on IS NULL OR closed_on >= ordered_on)
        AND (cancelled_on IS NULL OR ordered_on IS NULL OR cancelled_on >= ordered_on)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_orders_phase6_po_no
  ON purchase_orders (company_id, po_no);

CREATE INDEX IF NOT EXISTS ix_purchase_orders_phase6_supplier_status
  ON purchase_orders (company_id, supplier_id, status, ordered_on DESC);

CREATE INDEX IF NOT EXISTS ix_purchase_orders_phase6_import_source_key
  ON purchase_orders (company_id, import_source_key)
  WHERE import_source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  purchase_order_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'item',
  article_code TEXT,
  description TEXT NOT NULL,
  quantity_ordered NUMERIC(18, 4) NOT NULL DEFAULT 0,
  quantity_cancelled NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
  amount_ex_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  vat_code TEXT,
  vat_rate NUMERIC(9, 4),
  vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  amount_inc_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  expense_account_no TEXT,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  cost_center_code TEXT,
  business_unit_code TEXT,
  dimension_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_receipt BOOLEAN NOT NULL DEFAULT TRUE,
  over_delivery_tolerance_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_order_id, line_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_lines_phase6_line_type'
  ) THEN
    ALTER TABLE purchase_order_lines
      ADD CONSTRAINT ck_purchase_order_lines_phase6_line_type
      CHECK (line_type IN ('item', 'service', 'text', 'fee', 'asset'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_lines_phase6_status'
  ) THEN
    ALTER TABLE purchase_order_lines
      ADD CONSTRAINT ck_purchase_order_lines_phase6_status
      CHECK (status IN ('open', 'partially_received', 'fully_received', 'cancelled', 'closed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_lines_phase6_quantity'
  ) THEN
    ALTER TABLE purchase_order_lines
      ADD CONSTRAINT ck_purchase_order_lines_phase6_quantity
      CHECK (
        quantity_ordered >= 0
        AND quantity_cancelled >= 0
        AND quantity_cancelled <= quantity_ordered
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_lines_phase6_values'
  ) THEN
    ALTER TABLE purchase_order_lines
      ADD CONSTRAINT ck_purchase_order_lines_phase6_values
      CHECK (
        unit_price >= 0
        AND amount_ex_vat >= 0
        AND vat_amount >= 0
        AND amount_inc_vat >= 0
        AND discount_percent >= 0
        AND discount_percent <= 100
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_lines_phase6_tolerance'
  ) THEN
    ALTER TABLE purchase_order_lines
      ADD CONSTRAINT ck_purchase_order_lines_phase6_tolerance
      CHECK (over_delivery_tolerance_percent >= 0 AND over_delivery_tolerance_percent <= 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_purchase_order_lines_phase6_po
  ON purchase_order_lines (company_id, purchase_order_id, line_no);

CREATE TABLE IF NOT EXISTS purchase_order_receipts (
  purchase_order_receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE RESTRICT,
  receipt_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  receipt_date DATE NOT NULL,
  received_by_actor_id TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'manual',
  comment TEXT,
  source_document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
  source_document_version_id UUID REFERENCES document_versions(document_version_id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, receipt_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_receipts_phase6_status'
  ) THEN
    ALTER TABLE purchase_order_receipts
      ADD CONSTRAINT ck_purchase_order_receipts_phase6_status
      CHECK (status IN ('received', 'posted', 'reversed', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_receipts_phase6_channel'
  ) THEN
    ALTER TABLE purchase_order_receipts
      ADD CONSTRAINT ck_purchase_order_receipts_phase6_channel
      CHECK (source_channel IN ('manual', 'import', 'api', 'mobile', 'integration'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_purchase_order_receipts_phase6_po
  ON purchase_order_receipts (company_id, purchase_order_id, receipt_date DESC);

CREATE TABLE IF NOT EXISTS purchase_order_receipt_lines (
  purchase_order_receipt_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_receipt_id UUID NOT NULL REFERENCES purchase_order_receipts(purchase_order_receipt_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  purchase_order_line_id UUID NOT NULL REFERENCES purchase_order_lines(purchase_order_line_id) ON DELETE RESTRICT,
  received_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  accepted_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  rejected_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  variance_code TEXT,
  status TEXT NOT NULL DEFAULT 'accepted',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_order_receipt_id, purchase_order_line_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_receipt_lines_phase6_status'
  ) THEN
    ALTER TABLE purchase_order_receipt_lines
      ADD CONSTRAINT ck_purchase_order_receipt_lines_phase6_status
      CHECK (status IN ('accepted', 'partial', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_purchase_order_receipt_lines_phase6_quantities'
  ) THEN
    ALTER TABLE purchase_order_receipt_lines
      ADD CONSTRAINT ck_purchase_order_receipt_lines_phase6_quantities
      CHECK (
        received_quantity >= 0
        AND accepted_quantity >= 0
        AND rejected_quantity >= 0
        AND accepted_quantity + rejected_quantity <= received_quantity
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_purchase_order_receipt_lines_phase6_line
  ON purchase_order_receipt_lines (company_id, purchase_order_line_id, created_at DESC);

CREATE OR REPLACE FUNCTION fn_purchase_order_receipt_line_phase6_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_po_status TEXT;
  v_qty_ordered NUMERIC(18, 4);
  v_qty_cancelled NUMERIC(18, 4);
  v_over_delivery NUMERIC(9, 4);
  v_already_accepted NUMERIC(18, 4);
  v_allowed_qty NUMERIC(18, 4);
BEGIN
  SELECT po.status,
         pol.quantity_ordered,
         pol.quantity_cancelled,
         pol.over_delivery_tolerance_percent
  INTO v_po_status,
       v_qty_ordered,
       v_qty_cancelled,
       v_over_delivery
  FROM purchase_order_lines pol
  JOIN purchase_orders po
    ON po.purchase_order_id = pol.purchase_order_id
  WHERE pol.purchase_order_line_id = NEW.purchase_order_line_id;

  IF v_po_status IS NULL THEN
    RAISE EXCEPTION 'PO line % does not exist for receipt validation', NEW.purchase_order_line_id;
  END IF;

  IF v_po_status NOT IN ('approved', 'sent', 'partially_received') THEN
    RAISE EXCEPTION 'PO status % does not allow new receipts', v_po_status;
  END IF;

  SELECT COALESCE(SUM(prl.accepted_quantity), 0)
  INTO v_already_accepted
  FROM purchase_order_receipt_lines prl
  JOIN purchase_order_receipts pr
    ON pr.purchase_order_receipt_id = prl.purchase_order_receipt_id
  WHERE prl.purchase_order_line_id = NEW.purchase_order_line_id
    AND prl.purchase_order_receipt_line_id <> COALESCE(NEW.purchase_order_receipt_line_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND pr.status IN ('received', 'posted');

  v_allowed_qty := (v_qty_ordered - v_qty_cancelled) * (1 + (COALESCE(v_over_delivery, 0) / 100));

  IF v_already_accepted + NEW.accepted_quantity > v_allowed_qty THEN
    RAISE EXCEPTION
      'Receipt quantity %.4f exceeds allowed %.4f for PO line %',
      v_already_accepted + NEW.accepted_quantity,
      v_allowed_qty,
      NEW.purchase_order_line_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_order_receipt_line_phase6_validate ON purchase_order_receipt_lines;

CREATE TRIGGER trg_purchase_order_receipt_line_phase6_validate
BEFORE INSERT OR UPDATE OF accepted_quantity, purchase_order_line_id
ON purchase_order_receipt_lines
FOR EACH ROW
EXECUTE FUNCTION fn_purchase_order_receipt_line_phase6_validate();

CREATE TABLE IF NOT EXISTS ap_import_batches (
  ap_import_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  import_type TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'manual_file',
  source_file_name TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  row_count INTEGER NOT NULL DEFAULT 0,
  applied_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
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
    WHERE conname = 'ck_ap_import_batches_phase6_import_type'
  ) THEN
    ALTER TABLE ap_import_batches
      ADD CONSTRAINT ck_ap_import_batches_phase6_import_type
      CHECK (import_type IN ('suppliers', 'purchase_orders'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_import_batches_phase6_source_channel'
  ) THEN
    ALTER TABLE ap_import_batches
      ADD CONSTRAINT ck_ap_import_batches_phase6_source_channel
      CHECK (source_channel IN ('manual_file', 'api', 'integration', 'peppol', 'email'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_import_batches_phase6_status'
  ) THEN
    ALTER TABLE ap_import_batches
      ADD CONSTRAINT ck_ap_import_batches_phase6_status
      CHECK (status IN ('received', 'validated', 'applied', 'partial', 'failed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ap_import_rows (
  ap_import_row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ap_import_batch_id UUID NOT NULL REFERENCES ap_import_batches(ap_import_batch_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  row_no INTEGER NOT NULL,
  entity_external_key TEXT,
  status TEXT NOT NULL DEFAULT 'validated',
  supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES purchase_orders(purchase_order_id) ON DELETE SET NULL,
  error_code TEXT,
  error_message TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ap_import_batch_id, row_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_import_rows_phase6_status'
  ) THEN
    ALTER TABLE ap_import_rows
      ADD CONSTRAINT ck_ap_import_rows_phase6_status
      CHECK (status IN ('validated', 'applied', 'failed', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ap_import_rows_phase6_status
  ON ap_import_rows (company_id, status, created_at DESC);

ALTER TABLE supplier_invoices
  ADD COLUMN IF NOT EXISTS external_invoice_ref TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS document_version_id UUID REFERENCES document_versions(document_version_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_hash TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_check_status TEXT NOT NULL DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS duplicate_fingerprint_hash TEXT,
  ADD COLUMN IF NOT EXISTS matched_purchase_order_id UUID REFERENCES purchase_orders(purchase_order_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_receipt_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_currency'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase6_currency
      CHECK (currency_code ~ '^[A-Z]{3}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_duplicate_status'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase6_duplicate_status
      CHECK (duplicate_check_status IN ('not_checked', 'exact_duplicate', 'suspect_duplicate', 'cleared'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase6_gross_non_negative'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase6_gross_non_negative
      CHECK (gross_amount IS NULL OR gross_amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_supplier_invoices_phase6_duplicate_scan
  ON supplier_invoices (company_id, supplier_id, external_invoice_ref, invoice_date, gross_amount, currency_code);

CREATE TABLE IF NOT EXISTS ap_supplier_invoice_fingerprints (
  ap_supplier_invoice_fingerprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
  supplier_invoice_id UUID REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE SET NULL,
  external_invoice_ref TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  gross_amount NUMERIC(18, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  document_hash TEXT NOT NULL,
  payment_reference TEXT,
  fingerprint_hash TEXT NOT NULL,
  duplicate_kind TEXT NOT NULL DEFAULT 'exact',
  status TEXT NOT NULL DEFAULT 'blocked',
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, supplier_id, fingerprint_hash)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_fingerprints_phase6_duplicate_kind'
  ) THEN
    ALTER TABLE ap_supplier_invoice_fingerprints
      ADD CONSTRAINT ck_ap_supplier_invoice_fingerprints_phase6_duplicate_kind
      CHECK (duplicate_kind IN ('exact', 'suspect'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_fingerprints_phase6_status'
  ) THEN
    ALTER TABLE ap_supplier_invoice_fingerprints
      ADD CONSTRAINT ck_ap_supplier_invoice_fingerprints_phase6_status
      CHECK (status IN ('blocked', 'review_required', 'accepted', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_fingerprints_phase6_amount'
  ) THEN
    ALTER TABLE ap_supplier_invoice_fingerprints
      ADD CONSTRAINT ck_ap_supplier_invoice_fingerprints_phase6_amount
      CHECK (gross_amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ap_supplier_invoice_fingerprints_phase6_suspect
  ON ap_supplier_invoice_fingerprints (company_id, supplier_id, invoice_date, gross_amount, status);

CREATE TABLE IF NOT EXISTS ap_supplier_invoice_receipt_links (
  ap_supplier_invoice_receipt_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(supplier_invoice_id) ON DELETE CASCADE,
  purchase_order_receipt_line_id UUID NOT NULL REFERENCES purchase_order_receipt_lines(purchase_order_receipt_line_id) ON DELETE RESTRICT,
  purchase_order_line_id UUID NOT NULL REFERENCES purchase_order_lines(purchase_order_line_id) ON DELETE RESTRICT,
  linked_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  linked_amount_ex_vat NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'linked',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_actor_id TEXT NOT NULL,
  UNIQUE (company_id, supplier_invoice_id, purchase_order_receipt_line_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_receipt_links_phase6_values'
  ) THEN
    ALTER TABLE ap_supplier_invoice_receipt_links
      ADD CONSTRAINT ck_ap_supplier_invoice_receipt_links_phase6_values
      CHECK (linked_quantity >= 0 AND linked_amount_ex_vat >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_supplier_invoice_receipt_links_phase6_status'
  ) THEN
    ALTER TABLE ap_supplier_invoice_receipt_links
      ADD CONSTRAINT ck_ap_supplier_invoice_receipt_links_phase6_status
      CHECK (status IN ('linked', 'unlinked', 'reversed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ap_supplier_invoice_receipt_links_phase6_invoice
  ON ap_supplier_invoice_receipt_links (company_id, supplier_invoice_id, status);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321140000_phase6_ap_masterdata_po_receipts')
ON CONFLICT (migration_id) DO NOTHING;
