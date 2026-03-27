CREATE TABLE IF NOT EXISTS bureau_portfolio_memberships (
  portfolio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  responsible_consultant_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  backup_consultant_company_user_id UUID REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  status_profile TEXT NOT NULL DEFAULT 'standard',
  criticality TEXT NOT NULL DEFAULT 'standard',
  active_from DATE NOT NULL,
  active_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bureau_org_id, client_company_id, active_from)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bureau_portfolio_memberships_active_window'
  ) THEN
    ALTER TABLE bureau_portfolio_memberships
      ADD CONSTRAINT ck_bureau_portfolio_memberships_active_window
      CHECK (active_to IS NULL OR active_to >= active_from);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bureau_portfolio_memberships_scope
  ON bureau_portfolio_memberships (bureau_org_id, client_company_id, responsible_consultant_company_user_id, active_to);

CREATE TABLE IF NOT EXISTS bureau_client_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES bureau_portfolio_memberships(portfolio_id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  accounting_period_id UUID REFERENCES accounting_periods(accounting_period_id) ON DELETE SET NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  request_type TEXT NOT NULL,
  requested_from_contact_id TEXT NOT NULL,
  requested_from_contact_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_consultant_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  deadline_at TIMESTAMPTZ NOT NULL,
  deadline_basis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reminder_profile TEXT NOT NULL,
  blocker_scope TEXT NOT NULL DEFAULT 'none',
  requested_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_access_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bureau_client_requests_status'
  ) THEN
    ALTER TABLE bureau_client_requests
      ADD CONSTRAINT ck_bureau_client_requests_status
      CHECK (status IN ('draft', 'sent', 'acknowledged', 'in_progress', 'delivered', 'accepted', 'closed', 'overdue', 'escalated', 'reopened', 'recipient_invalid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bureau_client_requests_scope
  ON bureau_client_requests (bureau_org_id, client_company_id, status, deadline_at);

CREATE TABLE IF NOT EXISTS bureau_client_request_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES bureau_client_requests(request_id) ON DELETE CASCADE,
  response_type TEXT NOT NULL,
  responded_by_contact_id TEXT NOT NULL,
  comment TEXT,
  attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  responded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_bureau_client_request_responses_request
  ON bureau_client_request_responses (request_id, responded_at);

CREATE TABLE IF NOT EXISTS bureau_approval_packages (
  approval_package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES bureau_portfolio_memberships(portfolio_id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  accounting_period_id UUID REFERENCES accounting_periods(accounting_period_id) ON DELETE SET NULL,
  approval_type TEXT NOT NULL,
  package_version INTEGER NOT NULL DEFAULT 1,
  snapshot_type TEXT NOT NULL DEFAULT 'report_snapshot',
  report_snapshot_id UUID REFERENCES report_snapshots(report_snapshot_id) ON DELETE SET NULL,
  snapshot_hash TEXT NOT NULL,
  approval_deadline_at TIMESTAMPTZ NOT NULL,
  deadline_basis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  named_approver_contact_id TEXT NOT NULL,
  named_approver_contact_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_named_approver BOOLEAN NOT NULL DEFAULT TRUE,
  attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_access_code TEXT,
  status TEXT NOT NULL DEFAULT 'prepared',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_bureau_approval_packages_status'
  ) THEN
    ALTER TABLE bureau_approval_packages
      ADD CONSTRAINT ck_bureau_approval_packages_status
      CHECK (status IN ('prepared', 'sent_for_approval', 'viewed', 'approved', 'rejected', 'revised', 'superseded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bureau_approval_packages_scope
  ON bureau_approval_packages (bureau_org_id, client_company_id, status, approval_deadline_at);

CREATE TABLE IF NOT EXISTS bureau_approval_responses (
  approval_response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_package_id UUID NOT NULL REFERENCES bureau_approval_packages(approval_package_id) ON DELETE CASCADE,
  response_type TEXT NOT NULL,
  responded_by_contact_id TEXT NOT NULL,
  delegated_from_contact_id TEXT,
  comment TEXT,
  attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  responded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_bureau_approval_responses_package
  ON bureau_approval_responses (approval_package_id, responded_at);

CREATE TABLE IF NOT EXISTS core_work_items (
  work_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES bureau_portfolio_memberships(portfolio_id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  owner_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  deadline_at TIMESTAMPTZ NOT NULL,
  blocker_scope TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'open',
  status_history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_type, source_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_core_work_items_status'
  ) THEN
    ALTER TABLE core_work_items
      ADD CONSTRAINT ck_core_work_items_status
      CHECK (status IN ('open', 'acknowledged', 'waiting_external', 'snoozed', 'resolved', 'escalated', 'blocked', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_core_work_items_scope
  ON core_work_items (bureau_org_id, client_company_id, owner_company_user_id, status, deadline_at);

CREATE TABLE IF NOT EXISTS core_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES bureau_portfolio_memberships(portfolio_id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal',
  author_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  mention_company_user_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_core_comments_visibility'
  ) THEN
    ALTER TABLE core_comments
      ADD CONSTRAINT ck_core_comments_visibility
      CHECK (visibility IN ('internal', 'external_shared', 'restricted_internal'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_core_comments_scope
  ON core_comments (bureau_org_id, client_company_id, object_type, object_id, created_at);

CREATE TABLE IF NOT EXISTS core_mass_action_runs (
  mass_action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_org_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  selected_client_company_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  initiated_by_company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_mass_action_results (
  mass_action_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mass_action_id UUID NOT NULL REFERENCES core_mass_action_runs(mass_action_id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_core_mass_action_results_action
  ON core_mass_action_results (mass_action_id, client_company_id, status);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322120000_phase11_bureau_portfolio')
ON CONFLICT (migration_id) DO NOTHING;
