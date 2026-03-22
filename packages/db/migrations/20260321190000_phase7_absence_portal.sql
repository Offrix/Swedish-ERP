ALTER TABLE leave_entries
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(employee_id),
  ADD COLUMN IF NOT EXISTS leave_type_id UUID,
  ADD COLUMN IF NOT EXISTS leave_type_code TEXT,
  ADD COLUMN IF NOT EXISTS reporting_period TEXT,
  ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'employee_portal',
  ADD COLUMN IF NOT EXISTS manager_employment_id UUID REFERENCES employments(employment_id),
  ADD COLUMN IF NOT EXISTS signal_completeness_json JSONB NOT NULL DEFAULT '{"complete": true, "missingFields": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS supporting_document_id UUID REFERENCES documents(document_id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE leave_entries AS leave_entry
SET employee_id = employment.employee_id
FROM employments AS employment
WHERE leave_entry.employment_id = employment.employment_id
  AND leave_entry.employee_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_leave_entries_company_employee
  ON leave_entries (company_id, employee_id, starts_on);
CREATE INDEX IF NOT EXISTS idx_leave_entries_company_status
  ON leave_entries (company_id, status, starts_on);
CREATE INDEX IF NOT EXISTS idx_leave_entries_reporting_period
  ON leave_entries (company_id, reporting_period);

CREATE TABLE IF NOT EXISTS leave_types (
  leave_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  leave_type_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  signal_type TEXT NOT NULL DEFAULT 'none',
  requires_manager_approval BOOLEAN NOT NULL DEFAULT TRUE,
  requires_supporting_document BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_types_signal_type_chk CHECK (signal_type IN ('none', 'parental_benefit', 'temporary_parental_benefit')),
  CONSTRAINT leave_types_company_code_uniq UNIQUE (company_id, leave_type_code)
);

CREATE TABLE IF NOT EXISTS leave_entry_events (
  leave_entry_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_entry_id UUID NOT NULL REFERENCES leave_entries(leave_entry_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  actor_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_entry_events_entry_recorded
  ON leave_entry_events (leave_entry_id, recorded_at);

CREATE TABLE IF NOT EXISTS leave_signals (
  leave_signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_entry_id UUID NOT NULL REFERENCES leave_entries(leave_entry_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id),
  employee_id UUID REFERENCES employees(employee_id),
  employment_id UUID REFERENCES employments(employment_id),
  reporting_period TEXT NOT NULL,
  work_date DATE NOT NULL,
  specification_no INTEGER NOT NULL,
  signal_type TEXT NOT NULL,
  extent_percent NUMERIC(6, 2),
  extent_hours NUMERIC(8, 2),
  complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_signals_reporting_period_chk CHECK (reporting_period ~ '^[0-9]{6}$'),
  CONSTRAINT leave_signals_signal_type_chk CHECK (signal_type IN ('parental_benefit', 'temporary_parental_benefit')),
  CONSTRAINT leave_signals_extent_chk CHECK (extent_percent IS NOT NULL OR extent_hours IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_signals_entry_spec
  ON leave_signals (leave_entry_id, specification_no);
CREATE INDEX IF NOT EXISTS idx_leave_signals_employee_period
  ON leave_signals (company_id, employee_id, reporting_period, work_date);

CREATE TABLE IF NOT EXISTS leave_signal_locks (
  leave_signal_lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  employment_id UUID REFERENCES employments(employment_id),
  reporting_period TEXT NOT NULL,
  lock_state TEXT NOT NULL,
  note TEXT,
  source_reference TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_signal_locks_reporting_period_chk CHECK (reporting_period ~ '^[0-9]{6}$'),
  CONSTRAINT leave_signal_locks_state_chk CHECK (lock_state IN ('ready_for_sign', 'signed', 'submitted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_signal_locks_scope_period
  ON leave_signal_locks (company_id, COALESCE(employment_id, '00000000-0000-0000-0000-000000000000'::uuid), reporting_period, lock_state);
CREATE INDEX IF NOT EXISTS idx_leave_types_company_active
  ON leave_types (company_id, active);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321190000_phase7_absence_portal')
ON CONFLICT (migration_id) DO NOTHING;
