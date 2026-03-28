CREATE TABLE IF NOT EXISTS document_classification_extraction_projections (
  extraction_projection_id UUID PRIMARY KEY,
  classification_case_id UUID NOT NULL REFERENCES document_classification_cases(classification_case_id),
  treatment_line_id UUID NOT NULL REFERENCES document_classification_treatment_lines(treatment_line_id),
  company_id UUID NOT NULL,
  document_id UUID NOT NULL,
  source_ocr_run_id UUID NULL,
  extraction_family_code TEXT NOT NULL,
  candidate_object_type TEXT NOT NULL,
  target_domain_code TEXT NOT NULL,
  document_role_code TEXT NOT NULL,
  attachment_role_code TEXT NOT NULL,
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  review_risk_class TEXT NOT NULL,
  review_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachment_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_document_classification_extraction_projections_case
  ON document_classification_extraction_projections (classification_case_id, target_domain_code);

CREATE INDEX IF NOT EXISTS ix_document_classification_extraction_projections_company_document
  ON document_classification_extraction_projections (company_id, document_id, extraction_family_code);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260328143000_phase10_document_extraction_projections')
ON CONFLICT (migration_id) DO NOTHING;
