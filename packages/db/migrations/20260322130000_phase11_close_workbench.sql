CREATE TABLE IF NOT EXISTS close_checklists (
  checklist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES bureau_portfolio_memberships(portfolio_id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  accounting_period_id UUID NOT NULL REFERENCES accounting_periods(accounting_period_id) ON DELETE CASCADE,
  checklist_template_code TEXT NOT NULL DEFAULT 'monthly_standard',
  checklist_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  close_state TEXT NOT NULL DEFAULT 'open',
  owner_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  created_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  target_close_date DATE NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  deadline_basis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  signoff_chain_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_snapshot_id UUID REFERENCES report_snapshots(report_snapshot_id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  supersedes_checklist_id UUID REFERENCES close_checklists(checklist_id) ON DELETE SET NULL,
  superseded_by_checklist_id UUID REFERENCES close_checklists(checklist_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_company_id, accounting_period_id, checklist_version)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_close_checklists_status'
  ) THEN
    ALTER TABLE close_checklists
      ADD CONSTRAINT ck_close_checklists_status
      CHECK (status IN ('created', 'in_progress', 'review_ready', 'signoff_pending', 'signed_off', 'closed', 'reopened'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_close_checklists_state'
  ) THEN
    ALTER TABLE close_checklists
      ADD CONSTRAINT ck_close_checklists_state
      CHECK (close_state IN ('open', 'subledger_locked', 'vat_locked', 'ledger_locked', 'signed_off', 'hard_closed', 'reopened'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_close_checklists_scope
  ON close_checklists (bureau_org_id, client_company_id, accounting_period_id, status, deadline_at);

CREATE TABLE IF NOT EXISTS close_checklist_steps (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES close_checklists(checklist_id) ON DELETE CASCADE,
  step_code TEXT NOT NULL,
  title TEXT NOT NULL,
  mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  sequence_no INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  owner_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  accounting_period_id UUID NOT NULL REFERENCES accounting_periods(accounting_period_id) ON DELETE CASCADE,
  deadline_at TIMESTAMPTZ NOT NULL,
  evidence_type TEXT NOT NULL,
  reconciliation_area_code TEXT,
  reconciliation_run_id UUID REFERENCES reconciliation_runs(reconciliation_run_id) ON DELETE SET NULL,
  evidence_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  blocker_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (checklist_id, step_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_close_checklist_steps_status'
  ) THEN
    ALTER TABLE close_checklist_steps
      ADD CONSTRAINT ck_close_checklist_steps_status
      CHECK (status IN ('not_started', 'in_progress', 'awaiting_review', 'complete', 'blocked', 'reopened'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_close_checklist_steps_checklist
  ON close_checklist_steps (checklist_id, sequence_no, status);

CREATE TABLE IF NOT EXISTS close_blockers (
  blocker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES close_checklists(checklist_id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES close_checklist_steps(step_id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  owner_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  opened_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  override_state TEXT NOT NULL DEFAULT 'not_requested',
  waiver_until DATE,
  approved_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  approved_by_role_code TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_close_blockers_severity'
  ) THEN
    ALTER TABLE close_blockers
      ADD CONSTRAINT ck_close_blockers_severity
      CHECK (severity IN ('informational', 'warning', 'hard_stop', 'critical'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_close_blockers_status'
  ) THEN
    ALTER TABLE close_blockers
      ADD CONSTRAINT ck_close_blockers_status
      CHECK (status IN ('open', 'waived', 'resolved', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_close_blockers_checklist
  ON close_blockers (checklist_id, severity, status, waiver_until);

CREATE TABLE IF NOT EXISTS close_signoff_records (
  signoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES close_checklists(checklist_id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  signatory_role TEXT NOT NULL,
  signatory_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  signatory_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  decision TEXT NOT NULL DEFAULT 'approved',
  decision_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_snapshot_ref_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  comment TEXT,
  superseded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_close_signoff_records_active
  ON close_signoff_records (checklist_id, sequence_no)
  WHERE superseded_at IS NULL;

CREATE TABLE IF NOT EXISTS close_reopen_requests (
  reopen_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES close_checklists(checklist_id) ON DELETE CASCADE,
  successor_checklist_id UUID REFERENCES close_checklists(checklist_id) ON DELETE SET NULL,
  requested_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  approved_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  approved_by_role_code TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  impact_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_close_reopen_requests_checklist
  ON close_reopen_requests (checklist_id, created_at DESC);
