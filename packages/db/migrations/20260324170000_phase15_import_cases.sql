CREATE TABLE IF NOT EXISTS import_cases (
  import_case_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  parent_import_case_id UUID NULL REFERENCES import_cases(import_case_id),
  source_classification_case_id UUID NULL,
  case_reference TEXT NOT NULL,
  status TEXT NOT NULL,
  goods_origin_country TEXT NULL,
  customs_reference TEXT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  requires_customs_evidence BOOLEAN NULL,
  completeness_status TEXT NOT NULL,
  blocking_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  review_risk_class TEXT NOT NULL,
  review_item_id UUID NULL,
  review_queue_code TEXT NOT NULL,
  approval_note TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  approved_by_actor_id TEXT NULL,
  import_vat_base_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  import_vat_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  component_totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  corrected_at TIMESTAMPTZ NULL,
  corrected_by_actor_id TEXT NULL,
  corrected_to_import_case_id UUID NULL REFERENCES import_cases(import_case_id),
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_import_cases_company_reference
  ON import_cases (company_id, case_reference);

CREATE TABLE IF NOT EXISTS import_case_document_links (
  import_case_document_link_id UUID PRIMARY KEY,
  import_case_id UUID NOT NULL REFERENCES import_cases(import_case_id),
  company_id UUID NOT NULL,
  document_id UUID NOT NULL,
  role_code TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_by_actor_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_import_case_document_links_case_document
  ON import_case_document_links (import_case_id, document_id);

CREATE INDEX IF NOT EXISTS ix_import_case_document_links_company_document
  ON import_case_document_links (company_id, document_id, linked_at);

CREATE TABLE IF NOT EXISTS import_case_components (
  import_case_component_id UUID PRIMARY KEY,
  import_case_id UUID NOT NULL REFERENCES import_cases(import_case_id),
  company_id UUID NOT NULL,
  source_document_id UUID NULL,
  component_type TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  vat_relevance_code TEXT NOT NULL,
  ledger_treatment_code TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_import_case_components_case
  ON import_case_components (import_case_id, component_type, vat_relevance_code);

CREATE TABLE IF NOT EXISTS import_case_corrections (
  import_case_correction_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  import_case_id UUID NOT NULL REFERENCES import_cases(import_case_id),
  replacement_import_case_id UUID NOT NULL REFERENCES import_cases(import_case_id),
  reason_code TEXT NOT NULL,
  reason_note TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324170000_phase15_import_cases')
ON CONFLICT (migration_id) DO NOTHING;
