ALTER TABLE voucher_series
  ADD COLUMN IF NOT EXISTS purpose_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS imported_sequence_preservation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE voucher_series
SET purpose_codes = CASE
      WHEN series_code = 'A' THEN '["LEDGER_MANUAL","LEDGER_CORRECTION"]'::jsonb
      WHEN series_code = 'B' THEN '["AR_INVOICE","AR_DUNNING"]'::jsonb
      WHEN series_code = 'C' THEN '["AR_CREDIT_NOTE"]'::jsonb
      WHEN series_code = 'D' THEN '["AR_PAYMENT"]'::jsonb
      WHEN series_code = 'E' THEN '["AP_INVOICE","AP_PAYMENT"]'::jsonb
      WHEN series_code = 'H' THEN '["PAYROLL_RUN","PAYROLL_CORRECTION","PAYROLL_PAYOUT_MATCH"]'::jsonb
      WHEN series_code = 'I' THEN '["VAT_SETTLEMENT"]'::jsonb
      WHEN series_code = 'V' THEN '["LEDGER_REVERSAL","AR_WRITEOFF"]'::jsonb
      WHEN series_code = 'W' THEN '["HISTORICAL_IMPORT"]'::jsonb
      ELSE purpose_codes
    END,
    imported_sequence_preservation_enabled = COALESCE(imported_sequence_preservation_enabled, TRUE),
    updated_at = NOW()
WHERE purpose_codes = '[]'::jsonb
   OR purpose_codes IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_voucher_series_phase14_status'
  ) THEN
    ALTER TABLE voucher_series
      ADD CONSTRAINT ck_voucher_series_phase14_status
      CHECK (status IN ('active', 'paused', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_voucher_series_phase14_purpose_codes'
  ) THEN
    ALTER TABLE voucher_series
      ADD CONSTRAINT ck_voucher_series_phase14_purpose_codes
      CHECK (jsonb_typeof(purpose_codes) = 'array');
  END IF;
END $$;

ALTER TABLE ar_invoice_number_series
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_type_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS voucher_series_purpose_code TEXT NOT NULL DEFAULT 'AR_INVOICE',
  ADD COLUMN IF NOT EXISTS imported_sequence_preservation_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE ar_invoice_number_series
SET description = CASE
      WHEN series_code = 'C' THEN 'Customer credit note numbering'
      ELSE 'Customer invoice numbering'
    END,
    invoice_type_codes = CASE
      WHEN series_code = 'C' THEN '["credit_note"]'::jsonb
      ELSE '["standard","partial","subscription"]'::jsonb
    END,
    voucher_series_purpose_code = CASE
      WHEN series_code = 'C' THEN 'AR_CREDIT_NOTE'
      ELSE 'AR_INVOICE'
    END,
    imported_sequence_preservation_enabled = COALESCE(imported_sequence_preservation_enabled, TRUE),
    updated_at = NOW()
WHERE invoice_type_codes = '[]'::jsonb
   OR invoice_type_codes IS NULL
   OR description = ''
   OR voucher_series_purpose_code IS NULL;

ALTER TABLE ar_invoice_number_series
  DROP CONSTRAINT IF EXISTS ck_ar_invoice_number_series_phase5_2_series_code;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_invoice_number_series_phase14_series_code'
  ) THEN
    ALTER TABLE ar_invoice_number_series
      ADD CONSTRAINT ck_ar_invoice_number_series_phase14_series_code
      CHECK (series_code ~ '^[A-Z0-9_-]{1,20}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_invoice_number_series_phase14_invoice_type_codes'
  ) THEN
    ALTER TABLE ar_invoice_number_series
      ADD CONSTRAINT ck_ar_invoice_number_series_phase14_invoice_type_codes
      CHECK (jsonb_typeof(invoice_type_codes) = 'array');
  END IF;
END $$;

ALTER TABLE customer_invoices
  DROP CONSTRAINT IF EXISTS ck_customer_invoices_phase5_2_series_code;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase14_series_code'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase14_series_code
      CHECK (invoice_series_code ~ '^[A-Z0-9_-]{1,20}$');
  END IF;
END $$;

ALTER TABLE customer_invoice_issue_events
  DROP CONSTRAINT IF EXISTS ck_customer_invoice_issue_events_phase5_2_series;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoice_issue_events_phase14_series'
  ) THEN
    ALTER TABLE customer_invoice_issue_events
      ADD CONSTRAINT ck_customer_invoice_issue_events_phase14_series
      CHECK (voucher_series_code ~ '^[A-Z0-9_-]{1,20}$');
  END IF;
END $$;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324120000_phase14_configurable_series')
ON CONFLICT (migration_id) DO NOTHING;
