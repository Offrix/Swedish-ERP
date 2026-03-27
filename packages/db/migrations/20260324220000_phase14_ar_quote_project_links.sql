ALTER TABLE quote_versions
  ADD COLUMN IF NOT EXISTS commercial_snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE customer_invoices
  ADD COLUMN IF NOT EXISTS source_quote_version_id UUID REFERENCES quote_versions(quote_version_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_link_status TEXT NOT NULL DEFAULT 'unlinked';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_invoices_phase14_project_link_status'
  ) THEN
    ALTER TABLE customer_invoices
      ADD CONSTRAINT ck_customer_invoices_phase14_project_link_status
      CHECK (project_link_status IN ('unlinked', 'single_project', 'multi_project'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_customer_invoices_phase14_source_quote_version
  ON customer_invoices (company_id, source_quote_version_id);

CREATE INDEX IF NOT EXISTS ix_customer_invoices_phase14_project_link
  ON customer_invoices (company_id, primary_project_id, project_link_status, status);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324220000_phase14_ar_quote_project_links')
ON CONFLICT (migration_id) DO NOTHING;
