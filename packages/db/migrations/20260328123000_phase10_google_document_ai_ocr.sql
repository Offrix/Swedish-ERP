ALTER TABLE ocr_runs
  ALTER COLUMN model_version DROP NOT NULL;

ALTER TABLE ocr_runs
  ALTER COLUMN status SET DEFAULT 'queued';

ALTER TABLE ocr_runs
  ADD COLUMN IF NOT EXISTS provider_code TEXT NOT NULL DEFAULT 'google_document_ai',
  ADD COLUMN IF NOT EXISTS provider_environment_ref TEXT NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS processing_mode TEXT NOT NULL DEFAULT 'sync',
  ADD COLUMN IF NOT EXISTS provider_operation_ref TEXT,
  ADD COLUMN IF NOT EXISTS provider_callback_mode TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS page_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_sync_pages INTEGER,
  ADD COLUMN IF NOT EXISTS max_batch_pages INTEGER,
  ADD COLUMN IF NOT EXISTS processor_type TEXT,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS text_confidence NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS superseded_by_ocr_run_id UUID REFERENCES ocr_runs(ocr_run_id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ix_ocr_runs_document_status_created
  ON ocr_runs (document_id, status, created_at);

CREATE INDEX IF NOT EXISTS ix_ocr_runs_provider_operation_ref
  ON ocr_runs (provider_operation_ref)
  WHERE provider_operation_ref IS NOT NULL;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260328123000_phase10_google_document_ai_ocr')
ON CONFLICT (migration_id) DO NOTHING;
