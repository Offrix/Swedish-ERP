ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS source_reference TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_of_document_id UUID REFERENCES documents(document_id),
  ADD COLUMN IF NOT EXISTS storage_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE document_versions
  ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS source_reference TEXT,
  ADD COLUMN IF NOT EXISTS derives_from_document_version_id UUID REFERENCES document_versions(document_version_id),
  ADD COLUMN IF NOT EXISTS linked_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE document_links
  ADD COLUMN IF NOT EXISTS linked_by_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS ux_document_versions_original_per_document
  ON document_versions (document_id)
  WHERE variant_type = 'original';

CREATE INDEX IF NOT EXISTS ix_document_versions_company_hash
  ON document_versions (company_id, file_hash);

CREATE INDEX IF NOT EXISTS ix_document_versions_company_source_reference
  ON document_versions (company_id, source_reference)
  WHERE source_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_document_links_document_target
  ON document_links (document_id, target_type, target_id);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321020000_phase2_document_archive')
ON CONFLICT (migration_id) DO NOTHING;
