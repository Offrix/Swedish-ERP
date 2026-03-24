CREATE TABLE IF NOT EXISTS checklist_templates (
  checklist_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  industry_pack_code TEXT NOT NULL,
  risk_class_code TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  sections_json JSONB NOT NULL,
  required_signoff_role_codes JSONB NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, template_code, version)
);

CREATE INDEX IF NOT EXISTS ix_checklist_templates_phase14_company_status
  ON checklist_templates (company_id, template_code, status, version DESC);

CREATE TABLE IF NOT EXISTS checklist_instances (
  checklist_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(checklist_template_id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(work_order_id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  assigned_to_user_id TEXT,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_checklist_instances_phase14_company_project
  ON checklist_instances (company_id, project_id, status, created_at);

CREATE TABLE IF NOT EXISTS checklist_point_outcomes (
  checklist_point_outcome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  checklist_instance_id UUID NOT NULL REFERENCES checklist_instances(checklist_instance_id) ON DELETE CASCADE,
  point_code TEXT NOT NULL,
  point_label TEXT NOT NULL,
  result_code TEXT NOT NULL,
  note TEXT,
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision_no INTEGER NOT NULL,
  supersedes_checklist_point_outcome_id UUID REFERENCES checklist_point_outcomes(checklist_point_outcome_id) ON DELETE SET NULL,
  superseded_at TIMESTAMPTZ,
  payload_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_checklist_point_outcomes_phase14_instance_revision
  ON checklist_point_outcomes (checklist_instance_id, point_code, revision_no);

CREATE TABLE IF NOT EXISTS checklist_deviations (
  checklist_deviation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  checklist_instance_id UUID NOT NULL REFERENCES checklist_instances(checklist_instance_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(work_order_id) ON DELETE SET NULL,
  point_code TEXT NOT NULL,
  severity_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  owner_user_id TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by_actor_id TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by_actor_id TEXT,
  resolution_note TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_checklist_deviations_phase14_instance_status
  ON checklist_deviations (company_id, checklist_instance_id, status, severity_code, created_at);

CREATE TABLE IF NOT EXISTS checklist_signoffs (
  checklist_signoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  checklist_instance_id UUID NOT NULL REFERENCES checklist_instances(checklist_instance_id) ON DELETE CASCADE,
  signoff_role_code TEXT NOT NULL,
  note TEXT,
  signed_by_actor_id TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (checklist_instance_id, signoff_role_code)
);

CREATE INDEX IF NOT EXISTS ix_checklist_signoffs_phase14_instance
  ON checklist_signoffs (company_id, checklist_instance_id, signed_at);

INSERT INTO schema_migrations(version, description)
VALUES ('20260325003000_phase14_egenkontroll', 'Phase 14 egenkontroll bounded context')
ON CONFLICT (version) DO NOTHING;
