ALTER TABLE customer_invoices
  ADD COLUMN IF NOT EXISTS supply_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS buyer_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS special_legal_text TEXT,
  ADD COLUMN IF NOT EXISTS amendment_reason TEXT,
  ADD COLUMN IF NOT EXISTS export_evidence_reference TEXT,
  ADD COLUMN IF NOT EXISTS currency_vat_amount_sek NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS hus_case_id UUID,
  ADD COLUMN IF NOT EXISTS hus_property_designation TEXT,
  ADD COLUMN IF NOT EXISTS hus_buyer_identity_number TEXT,
  ADD COLUMN IF NOT EXISTS hus_service_type_code TEXT,
  ADD COLUMN IF NOT EXISTS invoice_field_scenario_code TEXT,
  ADD COLUMN IF NOT EXISTS invoice_field_status TEXT,
  ADD COLUMN IF NOT EXISTS invoice_field_blocking_rule_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_field_evaluated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS customer_invoice_field_evaluations (
  customer_invoice_field_evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE CASCADE,
  scenario_code TEXT NOT NULL,
  rulepack_version TEXT NOT NULL,
  status TEXT NOT NULL,
  blocking_rule_count INTEGER NOT NULL DEFAULT 0,
  required_field_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_field_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warning_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_by_actor_id TEXT NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_invoice_field_requirements (
  customer_invoice_field_requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_invoice_field_evaluation_id UUID NOT NULL REFERENCES customer_invoice_field_evaluations(customer_invoice_field_evaluation_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  customer_invoice_id UUID NOT NULL REFERENCES customer_invoices(customer_invoice_id) ON DELETE CASCADE,
  scenario_code TEXT NOT NULL,
  field_code TEXT NOT NULL,
  requirement_level TEXT NOT NULL,
  blocking_flag BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_customer_invoice_field_evaluations_invoice
  ON customer_invoice_field_evaluations (customer_invoice_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS ix_customer_invoice_field_requirements_invoice
  ON customer_invoice_field_requirements (customer_invoice_id, scenario_code, field_code);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260324210000_phase14_invoice_field_rules')
ON CONFLICT (migration_id) DO NOTHING;
