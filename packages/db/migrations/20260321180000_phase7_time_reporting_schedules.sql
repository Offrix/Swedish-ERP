CREATE TABLE IF NOT EXISTS time_schedule_templates (
  time_schedule_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  schedule_template_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Stockholm',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, schedule_template_code)
);

CREATE TABLE IF NOT EXISTS time_schedule_template_days (
  time_schedule_template_day_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_schedule_template_id UUID NOT NULL REFERENCES time_schedule_templates(time_schedule_template_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,
  planned_minutes INTEGER NOT NULL DEFAULT 0,
  ob_minutes INTEGER NOT NULL DEFAULT 0,
  jour_minutes INTEGER NOT NULL DEFAULT 0,
  standby_minutes INTEGER NOT NULL DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (time_schedule_template_id, weekday)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_schedule_template_days_phase7_2_weekday'
  ) THEN
    ALTER TABLE time_schedule_template_days
      ADD CONSTRAINT ck_time_schedule_template_days_phase7_2_weekday
      CHECK (weekday BETWEEN 1 AND 7);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_schedule_template_days_phase7_2_minutes'
  ) THEN
    ALTER TABLE time_schedule_template_days
      ADD CONSTRAINT ck_time_schedule_template_days_phase7_2_minutes
      CHECK (
        planned_minutes >= 0
        AND ob_minutes >= 0
        AND jour_minutes >= 0
        AND standby_minutes >= 0
        AND break_minutes >= 0
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS time_schedule_assignments (
  time_schedule_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  time_schedule_template_id UUID NOT NULL REFERENCES time_schedule_templates(time_schedule_template_id) ON DELETE RESTRICT,
  valid_from DATE NOT NULL,
  valid_to DATE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_schedule_assignments_phase7_2_dates'
  ) THEN
    ALTER TABLE time_schedule_assignments
      ADD CONSTRAINT ck_time_schedule_assignments_phase7_2_dates
      CHECK (valid_to IS NULL OR valid_to >= valid_from);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_time_schedule_assignments_phase7_2_employment
  ON time_schedule_assignments (company_id, employment_id, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS time_clock_events (
  time_clock_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  work_date DATE NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'field_mobile',
  project_id UUID,
  activity_code TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_clock_events_phase7_2_type'
  ) THEN
    ALTER TABLE time_clock_events
      ADD CONSTRAINT ck_time_clock_events_phase7_2_type
      CHECK (event_type IN ('clock_in', 'clock_out'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_time_clock_events_phase7_2_employment
  ON time_clock_events (company_id, employment_id, work_date, occurred_at);

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS activity_code TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worked_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ob_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jour_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standby_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flex_delta_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comp_delta_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_schedule_template_id UUID REFERENCES time_schedule_templates(time_schedule_template_id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_entries_phase7_2_source_type'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT ck_time_entries_phase7_2_source_type
      CHECK (source_type IN ('manual', 'clock', 'import'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_entries_phase7_2_minutes'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT ck_time_entries_phase7_2_minutes
      CHECK (
        break_minutes >= 0
        AND worked_minutes >= 0
        AND scheduled_minutes >= 0
        AND overtime_minutes >= 0
        AND ob_minutes >= 0
        AND jour_minutes >= 0
        AND standby_minutes >= 0
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_entries_phase7_2_span'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT ck_time_entries_phase7_2_span
      CHECK (
        (starts_at IS NULL AND ends_at IS NULL)
        OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at > starts_at)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_time_entries_phase7_2_employment
  ON time_entries (company_id, employment_id, work_date, project_id);

CREATE TABLE IF NOT EXISTS time_balance_transactions (
  time_balance_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  balance_type TEXT NOT NULL,
  effective_date DATE NOT NULL,
  delta_minutes INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  explanation TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_balance_transactions_phase7_2_type'
  ) THEN
    ALTER TABLE time_balance_transactions
      ADD CONSTRAINT ck_time_balance_transactions_phase7_2_type
      CHECK (balance_type IN ('flex_minutes', 'comp_minutes', 'overtime_minutes'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_time_balance_transactions_phase7_2_employment
  ON time_balance_transactions (company_id, employment_id, effective_date, balance_type);

CREATE TABLE IF NOT EXISTS time_period_locks (
  time_period_lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employment_id UUID REFERENCES employments(employment_id) ON DELETE CASCADE,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  reason_code TEXT NOT NULL,
  note TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_time_period_locks_phase7_2_dates'
  ) THEN
    ALTER TABLE time_period_locks
      ADD CONSTRAINT ck_time_period_locks_phase7_2_dates
      CHECK (ends_on >= starts_on);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_time_period_locks_phase7_2_scope
  ON time_period_locks (company_id, employment_id, starts_on, ends_on);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321180000_phase7_time_reporting_schedules')
ON CONFLICT (migration_id) DO NOTHING;
