ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS retention_class_code text,
  ADD COLUMN IF NOT EXISTS source_fingerprint text,
  ADD COLUMN IF NOT EXISTS original_document_version_id uuid,
  ADD COLUMN IF NOT EXISTS latest_document_version_id uuid,
  ADD COLUMN IF NOT EXISTS evidence_refs_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE document_versions
  ADD COLUMN IF NOT EXISTS checksum_algorithm text,
  ADD COLUMN IF NOT EXISTS checksum_sha256 text,
  ADD COLUMN IF NOT EXISTS source_fingerprint text,
  ADD COLUMN IF NOT EXISTS retention_class_code text,
  ADD COLUMN IF NOT EXISTS evidence_refs_json jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE documents
SET retention_class_code = COALESCE(NULLIF(retention_class_code, ''), retention_policy_code, 'unspecified')
WHERE retention_class_code IS NULL;

UPDATE document_versions
SET checksum_algorithm = COALESCE(NULLIF(checksum_algorithm, ''), 'sha256'),
    checksum_sha256 = COALESCE(NULLIF(checksum_sha256, ''), content_hash),
    retention_class_code = COALESCE(NULLIF(retention_class_code, ''), 'unspecified')
WHERE checksum_algorithm IS NULL
   OR checksum_sha256 IS NULL
   OR retention_class_code IS NULL;

CREATE INDEX IF NOT EXISTS ix_documents_company_source_fingerprint
  ON documents (company_id, source_fingerprint);

CREATE INDEX IF NOT EXISTS ix_document_versions_company_checksum_sha256
  ON document_versions (company_id, checksum_sha256);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260328101500_phase10_document_evidence_chain')
ON CONFLICT (migration_id) DO NOTHING;
