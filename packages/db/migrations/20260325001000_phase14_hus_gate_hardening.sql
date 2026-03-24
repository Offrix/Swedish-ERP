ALTER TABLE hus_cases
  ADD COLUMN IF NOT EXISTS work_completed_from DATE,
  ADD COLUMN IF NOT EXISTS work_completed_to DATE,
  ADD COLUMN IF NOT EXISTS housing_form_code TEXT,
  ADD COLUMN IF NOT EXISTS property_designation TEXT,
  ADD COLUMN IF NOT EXISTS apartment_designation TEXT,
  ADD COLUMN IF NOT EXISTS housing_association_org_number TEXT,
  ADD COLUMN IF NOT EXISTS service_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS service_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS service_city TEXT,
  ADD COLUMN IF NOT EXISTS executor_fskatt_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS executor_fskatt_validated_on DATE,
  ADD COLUMN IF NOT EXISTS invoice_gate_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invoice_blocker_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS invoice_gate_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS claim_eligibility_status TEXT NOT NULL DEFAULT 'blocked',
  ADD COLUMN IF NOT EXISTS claim_blocker_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS claim_ready_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_amount_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_amount_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_out_amount_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovered_amount_total NUMERIC(18,2) NOT NULL DEFAULT 0;

ALTER TABLE hus_service_lines
  ADD COLUMN IF NOT EXISTS worked_hours NUMERIC(18,2);

ALTER TABLE hus_customer_payments
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS external_trace_id TEXT,
  ADD COLUMN IF NOT EXISTS evidence_status TEXT NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS claim_capacity_amount NUMERIC(18,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS hus_decision_differences (
  hus_decision_difference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  hus_claim_id UUID NOT NULL REFERENCES hus_claims(hus_claim_id) ON DELETE CASCADE,
  hus_decision_id UUID NOT NULL REFERENCES hus_decisions(hus_decision_id) ON DELETE CASCADE,
  rejected_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  suggested_resolution_code TEXT NOT NULL,
  resolution_code TEXT,
  resolution_note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_hus_decision_differences_phase14_status
  ON hus_decision_differences (company_id, hus_case_id, status, created_at);

CREATE TABLE IF NOT EXISTS hus_recovery_candidates (
  hus_recovery_candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  hus_case_id UUID NOT NULL REFERENCES hus_cases(hus_case_id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  previous_accepted_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  correct_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  source_adjustment_id UUID,
  resolution_code TEXT,
  resolved_at TIMESTAMPTZ,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_hus_recovery_candidates_phase14_status
  ON hus_recovery_candidates (company_id, hus_case_id, status, created_at);

INSERT INTO schema_migrations(version, description)
VALUES ('20260325001000_phase14_hus_gate_hardening', 'Phase 14 HUS gate hardening')
ON CONFLICT (version) DO NOTHING;
