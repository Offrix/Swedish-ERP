BEGIN;

ALTER TABLE search_reindex_requests
  ADD COLUMN IF NOT EXISTS rebuild_mode TEXT NOT NULL DEFAULT 'delta';

ALTER TABLE search_reindex_requests
  ADD COLUMN IF NOT EXISTS purged_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS search_projection_checkpoints (
  projection_checkpoint_id TEXT PRIMARY KEY,
  company_id UUID NOT NULL,
  projection_code TEXT NOT NULL,
  source_domain_code TEXT NOT NULL,
  status TEXT NOT NULL,
  checkpoint_sequence_no INTEGER NOT NULL DEFAULT 0,
  last_request_id UUID NULL,
  last_requested_at TIMESTAMPTZ NULL,
  last_started_at TIMESTAMPTZ NULL,
  last_completed_at TIMESTAMPTZ NULL,
  last_error_code TEXT NULL,
  last_error_message TEXT NULL,
  last_rebuild_mode TEXT NOT NULL DEFAULT 'delta',
  last_indexed_count INTEGER NOT NULL DEFAULT 0,
  last_unchanged_count INTEGER NOT NULL DEFAULT 0,
  last_tombstoned_count INTEGER NOT NULL DEFAULT 0,
  last_purged_count INTEGER NOT NULL DEFAULT 0,
  last_document_count INTEGER NOT NULL DEFAULT 0,
  last_source_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_search_projection_checkpoints_company_projection UNIQUE (company_id, projection_code)
);

CREATE INDEX IF NOT EXISTS ix_search_projection_checkpoints_company_status
  ON search_projection_checkpoints (company_id, status, projection_code);

-- phase2 projection checkpoints and rebuild metadata
INSERT INTO schema_migrations (migration_id)
VALUES ('20260326130000_phase2_projection_checkpoints')
ON CONFLICT (migration_id) DO NOTHING;

COMMIT;
