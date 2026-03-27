CREATE TABLE IF NOT EXISTS payroll_document_classification_payloads (
  document_classification_payroll_payload_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  classification_case_id UUID NOT NULL REFERENCES document_classification_cases(classification_case_id),
  treatment_intent_id UUID NOT NULL REFERENCES document_classification_treatment_intents(treatment_intent_id),
  document_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  employment_id UUID NOT NULL,
  reporting_period TEXT NOT NULL,
  treatment_code TEXT NOT NULL,
  pay_item_code TEXT NOT NULL,
  processing_step INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  status TEXT NOT NULL,
  pay_line_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_actor_id TEXT NOT NULL,
  reversed_at TIMESTAMPTZ NULL,
  reversed_by_actor_id TEXT NULL,
  reversal_reason_code TEXT NULL,
  replacement_treatment_intent_id UUID NULL REFERENCES document_classification_treatment_intents(treatment_intent_id),
  UNIQUE (treatment_intent_id)
);

CREATE TABLE IF NOT EXISTS payroll_document_classification_consumptions (
  document_classification_payroll_consumption_id UUID PRIMARY KEY,
  document_classification_payroll_payload_id UUID NOT NULL REFERENCES payroll_document_classification_payloads(document_classification_payroll_payload_id),
  treatment_intent_id UUID NOT NULL REFERENCES document_classification_treatment_intents(treatment_intent_id),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  employment_id UUID NOT NULL,
  pay_run_id UUID NOT NULL,
  pay_run_line_id UUID NOT NULL,
  pay_item_code TEXT NOT NULL,
  processing_step INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  source_snapshot_hash TEXT NULL,
  stage TEXT NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by_actor_id TEXT NOT NULL,
  approved_at TIMESTAMPTZ NULL,
  approved_by_actor_id TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pay_run_line_id)
);

CREATE INDEX IF NOT EXISTS ix_payroll_document_classification_payloads_company_period
  ON payroll_document_classification_payloads (company_id, employment_id, reporting_period, status);

CREATE INDEX IF NOT EXISTS ix_payroll_document_classification_payloads_case
  ON payroll_document_classification_payloads (classification_case_id, treatment_intent_id);

CREATE INDEX IF NOT EXISTS ix_payroll_document_classification_consumptions_intent
  ON payroll_document_classification_consumptions (treatment_intent_id, stage, pay_run_id);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260325032000_phase14_document_classification_payroll_bridge')
ON CONFLICT (migration_id) DO NOTHING;
