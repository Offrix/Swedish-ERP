ALTER TABLE supplier_invoices
  ADD COLUMN IF NOT EXISTS classification_case_id UUID,
  ADD COLUMN IF NOT EXISTS classification_case_status TEXT,
  ADD COLUMN IF NOT EXISTS classification_review_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS classification_treatment_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS classification_target_domain_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS person_linked_document_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS person_linked_document_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS import_case_id UUID,
  ADD COLUMN IF NOT EXISTS import_case_status TEXT,
  ADD COLUMN IF NOT EXISTS import_case_completeness_status TEXT,
  ADD COLUMN IF NOT EXISTS import_case_blocking_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_import_case BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS static_review_queue_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS match_review_queue_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dynamic_review_queue_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS static_payment_hold_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dynamic_payment_hold_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_readiness_status TEXT NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS payment_readiness_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supplier_invoices_phase14_payment_readiness_status'
  ) THEN
    ALTER TABLE supplier_invoices
      ADD CONSTRAINT ck_supplier_invoices_phase14_payment_readiness_status
      CHECK (payment_readiness_status IN ('not_ready', 'blocked', 'ready'));
  END IF;
END $$;

ALTER TABLE ap_open_items
  ADD COLUMN IF NOT EXISTS payment_readiness_status TEXT NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS payment_readiness_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS import_case_id UUID,
  ADD COLUMN IF NOT EXISTS classification_case_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ap_open_items_phase14_payment_readiness_status'
  ) THEN
    ALTER TABLE ap_open_items
      ADD CONSTRAINT ck_ap_open_items_phase14_payment_readiness_status
      CHECK (payment_readiness_status IN ('not_ready', 'blocked', 'ready'));
  END IF;
END $$;

ALTER TABLE ap_supplier_invoice_lines
  ADD COLUMN IF NOT EXISTS import_case_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_supplier_invoices_phase14_import_case
  ON supplier_invoices (company_id, import_case_id)
  WHERE import_case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_supplier_invoices_phase14_classification_case
  ON supplier_invoices (company_id, classification_case_id)
  WHERE classification_case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_supplier_invoices_phase14_payment_readiness
  ON supplier_invoices (company_id, payment_readiness_status, payment_hold, review_required, due_date);

CREATE INDEX IF NOT EXISTS ix_ap_open_items_phase14_payment_readiness
  ON ap_open_items (company_id, payment_readiness_status, payment_hold, due_on);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324230000_phase14_ap_import_person_payment_readiness')
ON CONFLICT (migration_id) DO NOTHING;
