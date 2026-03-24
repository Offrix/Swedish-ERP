CREATE TABLE IF NOT EXISTS document_classification_cases (
  classification_case_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  document_id UUID NOT NULL,
  parent_classification_case_id UUID NULL REFERENCES document_classification_cases(classification_case_id),
  source_ocr_run_id UUID NULL,
  source_document_type TEXT NULL,
  source_document_status TEXT NULL,
  scenario_code TEXT NOT NULL,
  status TEXT NOT NULL,
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  review_risk_class TEXT NOT NULL,
  review_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_item_id UUID NULL,
  review_queue_code TEXT NULL,
  total_amount NUMERIC(18,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  source_document_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_ocr_snapshot_json JSONB NULL,
  extracted_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_note TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  approved_by_actor_id TEXT NULL,
  dispatched_at TIMESTAMPTZ NULL,
  dispatched_by_actor_id TEXT NULL,
  corrected_at TIMESTAMPTZ NULL,
  corrected_by_actor_id TEXT NULL,
  corrected_to_case_id UUID NULL REFERENCES document_classification_cases(classification_case_id),
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS document_classification_treatment_lines (
  treatment_line_id UUID PRIMARY KEY,
  classification_case_id UUID NOT NULL REFERENCES document_classification_cases(classification_case_id),
  company_id UUID NOT NULL,
  line_type TEXT NOT NULL,
  source_line_key TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  vat_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  treatment_code TEXT NOT NULL,
  scenario_code TEXT NOT NULL,
  target_domain_code TEXT NOT NULL,
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  review_risk_class TEXT NOT NULL,
  review_reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  facts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_classification_person_links (
  person_link_id UUID PRIMARY KEY,
  classification_case_id UUID NOT NULL REFERENCES document_classification_cases(classification_case_id),
  treatment_line_id UUID NOT NULL REFERENCES document_classification_treatment_lines(treatment_line_id),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  employment_id UUID NOT NULL,
  person_relation_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_classification_treatment_intents (
  treatment_intent_id UUID PRIMARY KEY,
  classification_case_id UUID NOT NULL REFERENCES document_classification_cases(classification_case_id),
  treatment_line_id UUID NOT NULL REFERENCES document_classification_treatment_lines(treatment_line_id),
  person_link_id UUID NULL REFERENCES document_classification_person_links(person_link_id),
  company_id UUID NOT NULL,
  document_id UUID NOT NULL,
  target_domain_code TEXT NOT NULL,
  treatment_code TEXT NOT NULL,
  scenario_code TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  status TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  dispatch_result_json JSONB NULL,
  dispatched_at TIMESTAMPTZ NULL,
  dispatched_by_actor_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_classification_corrections (
  classification_correction_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  classification_case_id UUID NOT NULL REFERENCES document_classification_cases(classification_case_id),
  replacement_classification_case_id UUID NOT NULL REFERENCES document_classification_cases(classification_case_id),
  reason_code TEXT NOT NULL,
  reason_note TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_document_classification_cases_company_document
  ON document_classification_cases (company_id, document_id, created_at);

CREATE INDEX IF NOT EXISTS ix_document_classification_cases_company_status
  ON document_classification_cases (company_id, status, requires_review);

CREATE INDEX IF NOT EXISTS ix_document_classification_lines_case
  ON document_classification_treatment_lines (classification_case_id, target_domain_code);

CREATE INDEX IF NOT EXISTS ix_document_classification_intents_case
  ON document_classification_treatment_intents (classification_case_id, status, target_domain_code);
