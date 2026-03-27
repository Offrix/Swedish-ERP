CREATE TABLE IF NOT EXISTS hus_cases (
  hus_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  case_reference TEXT NOT NULL,
  customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  service_type_code TEXT NOT NULL,
  work_completed_on DATE NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  rule_year INTEGER NOT NULL DEFAULT 2026,
  status TEXT NOT NULL DEFAULT 'draft',
  total_gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_eligible_labor_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  preliminary_reduction_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  customer_share_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_customer_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  outstanding_customer_share_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, case_reference)
);

CREATE INDEX IF NOT EXISTS ix_hus_cases_company_status_phase10_3
  ON hus_cases (company_id, status, work_completed_on);

CREATE TABLE IF NOT EXISTS hus_case_buyers (
  hus_case_buyer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  buyer_index INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  personal_identity_no TEXT NOT NULL,
  ownership_share_ratio NUMERIC(9,6) NOT NULL DEFAULT 1,
  reduction_share_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  customer_share_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hus_case_id, buyer_index)
);

CREATE TABLE IF NOT EXISTS hus_service_lines (
  hus_service_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  description TEXT NOT NULL,
  service_type_code TEXT NOT NULL,
  labor_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  material_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  eligible_labor_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  preliminary_reduction_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hus_case_id, line_no)
);

CREATE TABLE IF NOT EXISTS hus_classification_decisions (
  hus_classification_decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  rule_year INTEGER NOT NULL,
  decision_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hus_claims
  ADD COLUMN IF NOT EXISTS hus_case_id UUID REFERENCES hus_cases(hus_case_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS requested_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_type TEXT NOT NULL DEFAULT 'json',
  ADD COLUMN IF NOT EXISTS submitted_on DATE,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ix_hus_claims_company_case_phase10_3
  ON hus_claims (company_id, hus_case_id, status);

CREATE TABLE IF NOT EXISTS hus_claim_versions (
  hus_claim_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hus_claim_id UUID NOT NULL REFERENCES hus_claims(hus_claim_id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hus_claim_id, version_no)
);

CREATE TABLE IF NOT EXISTS hus_claim_status_events (
  hus_claim_status_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hus_claim_id UUID NOT NULL REFERENCES hus_claims(hus_claim_id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hus_decisions (
  hus_decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  hus_claim_id UUID NOT NULL REFERENCES hus_claims(hus_claim_id) ON DELETE CASCADE,
  decision_code TEXT NOT NULL,
  approved_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  decided_on DATE NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hus_payouts (
  hus_payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  hus_claim_id UUID NOT NULL REFERENCES hus_claims(hus_claim_id) ON DELETE CASCADE,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_on DATE NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hus_recoveries (
  hus_recovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  recovery_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  recovered_on DATE NOT NULL,
  reason_code TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hus_credit_adjustments (
  hus_credit_adjustment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  adjustment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  credited_on DATE NOT NULL,
  reason_code TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hus_customer_payments (
  hus_customer_payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_on DATE NOT NULL,
  payment_channel TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_change_orders (
  project_change_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(work_order_id) ON DELETE SET NULL,
  scope_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  revenue_impact_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_impact_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  schedule_impact_minutes INTEGER NOT NULL DEFAULT 0,
  customer_approval_required_flag BOOLEAN NOT NULL DEFAULT TRUE,
  customer_approved_at DATE,
  quote_reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_project_change_orders_phase10_3_project
  ON project_change_orders (company_id, project_id, status, created_at);

CREATE TABLE IF NOT EXISTS project_build_vat_assessments (
  project_build_vat_assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  source_document_id TEXT NOT NULL,
  source_document_type TEXT NOT NULL,
  description TEXT NOT NULL,
  buyer_country TEXT NOT NULL,
  buyer_type TEXT NOT NULL,
  buyer_vat_no TEXT,
  buyer_vat_number TEXT,
  buyer_vat_number_status TEXT NOT NULL,
  buyer_is_taxable_person BOOLEAN NOT NULL DEFAULT TRUE,
  buyer_build_sector_flag BOOLEAN NOT NULL DEFAULT FALSE,
  buyer_resells_construction_services_flag BOOLEAN NOT NULL DEFAULT FALSE,
  reverse_charge_flag BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_date DATE NOT NULL,
  delivery_date DATE,
  line_amount_ex_vat NUMERIC(18,2) NOT NULL,
  vat_rate NUMERIC(9,2) NOT NULL,
  vat_code_candidate TEXT NOT NULL,
  vat_decision_id UUID REFERENCES vat_decisions(vat_decision_id) ON DELETE SET NULL,
  vat_code TEXT NOT NULL,
  decision_category TEXT NOT NULL,
  booking_template_code TEXT NOT NULL,
  declaration_box_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  invoice_text_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_queue_item_id UUID,
  review_required_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_project_build_vat_assessments_phase10_3_project
  ON project_build_vat_assessments (company_id, project_id, invoice_date);

CREATE TABLE IF NOT EXISTS construction_sites (
  construction_site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  site_code TEXT NOT NULL,
  site_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  builder_org_no TEXT NOT NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  estimated_total_cost_ex_vat NUMERIC(18,2) NOT NULL DEFAULT 0,
  threshold_required_flag BOOLEAN NOT NULL DEFAULT FALSE,
  registration_status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, site_code)
);

CREATE INDEX IF NOT EXISTS ix_construction_sites_phase10_3_status
  ON construction_sites (company_id, registration_status, threshold_required_flag);

CREATE TABLE IF NOT EXISTS construction_site_registrations (
  construction_site_registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(construction_site_id) ON DELETE CASCADE,
  registration_reference TEXT NOT NULL,
  status TEXT NOT NULL,
  registered_on DATE,
  checklist_items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_events (
  attendance_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(construction_site_id) ON DELETE CASCADE,
  employment_id UUID REFERENCES employments(employment_id) ON DELETE SET NULL,
  worker_identity_type TEXT NOT NULL,
  worker_identity_value TEXT NOT NULL,
  full_name_snapshot TEXT NOT NULL,
  employer_org_no TEXT NOT NULL,
  contractor_org_no TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  source_channel TEXT NOT NULL,
  device_id TEXT,
  offline_flag BOOLEAN NOT NULL DEFAULT FALSE,
  geo_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  original_attendance_event_id UUID REFERENCES attendance_events(attendance_event_id) ON DELETE SET NULL,
  correction_reason TEXT,
  corrected_event_type TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_attendance_events_phase10_3_site_time
  ON attendance_events (company_id, construction_site_id, event_timestamp);

CREATE TABLE IF NOT EXISTS attendance_corrections (
  attendance_correction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  attendance_event_id UUID NOT NULL REFERENCES attendance_events(attendance_event_id) ON DELETE CASCADE,
  correction_reason TEXT NOT NULL,
  corrected_timestamp TIMESTAMPTZ,
  corrected_event_type TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kiosk_devices (
  kiosk_device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(construction_site_id) ON DELETE CASCADE,
  device_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (construction_site_id, device_code)
);

CREATE TABLE IF NOT EXISTS attendance_exports (
  attendance_export_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(construction_site_id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  export_date DATE,
  event_count INTEGER NOT NULL DEFAULT 0,
  correction_count INTEGER NOT NULL DEFAULT 0,
  control_chain_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_audit_events (
  attendance_audit_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID REFERENCES construction_sites(construction_site_id) ON DELETE SET NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  correlation_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_attendance_audit_events_phase10_3_company
  ON attendance_audit_events (company_id, construction_site_id, created_at);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322040000_phase10_build_rules_hus_personalliggare')
ON CONFLICT (migration_id) DO NOTHING;
