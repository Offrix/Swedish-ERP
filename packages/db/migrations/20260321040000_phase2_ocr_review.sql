ALTER TABLE inbox_channels
  ADD COLUMN IF NOT EXISTS classification_confidence_threshold NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS field_confidence_threshold NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS default_review_queue_code TEXT NOT NULL DEFAULT 'classification_low_confidence';

CREATE TABLE IF NOT EXISTS ocr_runs (
  ocr_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id),
  source_document_version_id UUID NOT NULL REFERENCES document_versions(document_version_id),
  profile_code TEXT NOT NULL,
  model_version TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  suggested_document_type TEXT NOT NULL DEFAULT 'unknown',
  classification_confidence NUMERIC(5, 4) NOT NULL DEFAULT 0,
  classification_candidates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_text TEXT NOT NULL DEFAULT '',
  extracted_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ocr_document_version_id UUID REFERENCES document_versions(document_version_id),
  classification_document_version_id UUID REFERENCES document_versions(document_version_id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_code TEXT
);

CREATE TABLE IF NOT EXISTS review_tasks (
  review_task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  ocr_run_id UUID NOT NULL REFERENCES ocr_runs(ocr_run_id) ON DELETE CASCADE,
  queue_code TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'document_review',
  status TEXT NOT NULL DEFAULT 'open',
  suggested_document_type TEXT,
  suggested_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  corrected_document_type TEXT,
  corrected_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
  created_by_actor_id TEXT NOT NULL,
  claimed_by_actor_id TEXT,
  claimed_at TIMESTAMPTZ,
  correction_comment TEXT,
  corrected_at TIMESTAMPTZ,
  approved_by_actor_id TEXT,
  approved_at TIMESTAMPTZ,
  manual_classification_version_id UUID REFERENCES document_versions(document_version_id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ocr_runs_document_created
  ON ocr_runs (document_id, created_at);

CREATE INDEX IF NOT EXISTS ix_review_tasks_document_status
  ON review_tasks (document_id, status);

CREATE INDEX IF NOT EXISTS ix_review_tasks_company_queue_status
  ON review_tasks (company_id, queue_code, status);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321040000_phase2_ocr_review')
ON CONFLICT (migration_id) DO NOTHING;
