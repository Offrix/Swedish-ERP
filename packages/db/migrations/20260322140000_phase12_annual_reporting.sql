CREATE TABLE IF NOT EXISTS annual_report_packages (
  package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  accounting_period_id UUID NOT NULL REFERENCES accounting_periods(accounting_period_id) ON DELETE CASCADE,
  fiscal_year TEXT NOT NULL,
  profile_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  current_version_id UUID,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, accounting_period_id, profile_code)
);

ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS package_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE;
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS accounting_period_id UUID REFERENCES accounting_periods(accounting_period_id) ON DELETE CASCADE;
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS fiscal_year TEXT;
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS profile_code TEXT NOT NULL DEFAULT 'k2';
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS current_version_id UUID;
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT 'migration_backfill';
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE annual_report_packages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE annual_report_packages
SET
  profile_code = COALESCE(NULLIF(profile_code, ''), 'k2'),
  status = COALESCE(NULLIF(status, ''), 'draft'),
  created_by_actor_id = COALESCE(NULLIF(created_by_actor_id, ''), 'migration_backfill'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  profile_code IS NULL
  OR status IS NULL
  OR created_by_actor_id IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_annual_report_packages_package_id
  ON annual_report_packages (package_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'annual_report_packages'
      AND column_name = 'financial_year'
  ) THEN
    EXECUTE 'ALTER TABLE annual_report_packages ALTER COLUMN financial_year DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'annual_report_packages'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE annual_report_packages
      ADD CONSTRAINT annual_report_packages_pkey PRIMARY KEY (package_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_annual_report_packages_profile'
  ) THEN
    ALTER TABLE annual_report_packages
      ADD CONSTRAINT ck_annual_report_packages_profile
      CHECK (profile_code IN ('k2', 'k3'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_annual_report_packages_status'
  ) THEN
    ALTER TABLE annual_report_packages
      ADD CONSTRAINT ck_annual_report_packages_status
      CHECK (status IN ('draft', 'ready_for_signature', 'signed', 'submitted', 'locked', 'superseded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_annual_report_packages_scope
  ON annual_report_packages (company_id, fiscal_year, profile_code, status);

CREATE TABLE IF NOT EXISTS annual_report_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES annual_report_packages(package_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  profile_code TEXT NOT NULL,
  package_status TEXT NOT NULL DEFAULT 'draft',
  accounting_period_id UUID NOT NULL REFERENCES accounting_periods(accounting_period_id) ON DELETE CASCADE,
  balance_sheet_report_snapshot_id UUID REFERENCES report_snapshots(report_snapshot_id) ON DELETE SET NULL,
  income_statement_report_snapshot_id UUID REFERENCES report_snapshots(report_snapshot_id) ON DELETE SET NULL,
  documents_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  text_sections_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  note_sections_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_package_outputs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_fingerprint TEXT NOT NULL,
  checksum TEXT NOT NULL,
  diff_from_previous_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  supersedes_version_id UUID REFERENCES annual_report_versions(version_id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_id, version_no)
);

ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS version_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES annual_report_packages(package_id) ON DELETE CASCADE;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS version_no INTEGER;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS profile_code TEXT NOT NULL DEFAULT 'k2';
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS package_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS accounting_period_id UUID REFERENCES accounting_periods(accounting_period_id) ON DELETE CASCADE;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS balance_sheet_report_snapshot_id UUID REFERENCES report_snapshots(report_snapshot_id) ON DELETE SET NULL;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS income_statement_report_snapshot_id UUID REFERENCES report_snapshots(report_snapshot_id) ON DELETE SET NULL;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS documents_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS text_sections_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS note_sections_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS tax_package_outputs_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS source_fingerprint TEXT NOT NULL DEFAULT 'migration_backfill';
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS checksum TEXT NOT NULL DEFAULT 'migration_backfill';
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS diff_from_previous_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT 'migration_backfill';
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS supersedes_version_id UUID REFERENCES annual_report_versions(version_id) ON DELETE SET NULL;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE annual_report_versions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE annual_report_versions
SET
  profile_code = COALESCE(NULLIF(profile_code, ''), 'k2'),
  package_status = COALESCE(NULLIF(package_status, ''), 'draft'),
  documents_json = COALESCE(documents_json, '[]'::jsonb),
  text_sections_json = COALESCE(text_sections_json, '{}'::jsonb),
  note_sections_json = COALESCE(note_sections_json, '{}'::jsonb),
  tax_package_outputs_json = COALESCE(tax_package_outputs_json, '[]'::jsonb),
  source_fingerprint = COALESCE(NULLIF(source_fingerprint, ''), 'migration_backfill'),
  checksum = COALESCE(NULLIF(checksum, ''), 'migration_backfill'),
  diff_from_previous_json = COALESCE(diff_from_previous_json, '[]'::jsonb),
  created_by_actor_id = COALESCE(NULLIF(created_by_actor_id, ''), 'migration_backfill'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  profile_code IS NULL
  OR package_status IS NULL
  OR documents_json IS NULL
  OR text_sections_json IS NULL
  OR note_sections_json IS NULL
  OR tax_package_outputs_json IS NULL
  OR source_fingerprint IS NULL
  OR checksum IS NULL
  OR diff_from_previous_json IS NULL
  OR created_by_actor_id IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_annual_report_versions_version_id
  ON annual_report_versions (version_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'annual_report_versions'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE annual_report_versions
      ADD CONSTRAINT annual_report_versions_pkey PRIMARY KEY (version_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_annual_report_versions_status'
  ) THEN
    ALTER TABLE annual_report_versions
      ADD CONSTRAINT ck_annual_report_versions_status
      CHECK (package_status IN ('draft', 'ready_for_signature', 'signed', 'submitted', 'locked', 'superseded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_annual_report_versions_scope
  ON annual_report_versions (company_id, package_id, version_no, package_status);

ALTER TABLE annual_report_packages
  DROP CONSTRAINT IF EXISTS fk_annual_report_packages_current_version;

ALTER TABLE annual_report_packages
  ADD CONSTRAINT fk_annual_report_packages_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES annual_report_versions(version_id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS annual_report_signatories (
  signatory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES annual_report_packages(package_id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES annual_report_versions(version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  company_user_id UUID NOT NULL REFERENCES company_users(company_user_id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  signatory_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  comment TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS signatory_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES annual_report_packages(package_id) ON DELETE CASCADE;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES annual_report_versions(version_id) ON DELETE CASCADE;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS company_user_id UUID REFERENCES company_users(company_user_id) ON DELETE RESTRICT;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(user_id) ON DELETE RESTRICT;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS signatory_role TEXT;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'invited';
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE annual_report_signatories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE annual_report_signatories
SET
  status = COALESCE(NULLIF(status, ''), 'invited'),
  invited_at = COALESCE(invited_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  status IS NULL
  OR invited_at IS NULL
  OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'annual_report_signatories'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE annual_report_signatories
      ADD CONSTRAINT annual_report_signatories_pkey PRIMARY KEY (signatory_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_annual_report_signatories_status'
  ) THEN
    ALTER TABLE annual_report_signatories
      ADD CONSTRAINT ck_annual_report_signatories_status
      CHECK (status IN ('invited', 'signed', 'declined', 'superseded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_annual_report_signatories_version
  ON annual_report_signatories (package_id, version_id, status, invited_at);

CREATE TABLE IF NOT EXISTS annual_report_submission_events (
  submission_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES annual_report_packages(package_id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES annual_report_versions(version_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_checksum TEXT NOT NULL,
  provider_reference TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS submission_event_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES annual_report_packages(package_id) ON DELETE CASCADE;
ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES annual_report_versions(version_id) ON DELETE CASCADE;
ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS payload_checksum TEXT;
ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS provider_reference TEXT;
ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE annual_report_submission_events
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE annual_report_submission_events
SET
  payload_json = COALESCE(payload_json, '{}'::jsonb),
  recorded_at = COALESCE(recorded_at, NOW())
WHERE
  payload_json IS NULL
  OR recorded_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'annual_report_submission_events'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE annual_report_submission_events
      ADD CONSTRAINT annual_report_submission_events_pkey PRIMARY KEY (submission_event_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_annual_report_submission_events_version
  ON annual_report_submission_events (package_id, version_id, recorded_at);

CREATE TABLE IF NOT EXISTS tax_declaration_packages (
  tax_declaration_package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_version_id UUID NOT NULL REFERENCES annual_report_versions(version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  package_code TEXT NOT NULL,
  output_checksum TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS tax_declaration_package_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS annual_report_version_id UUID REFERENCES annual_report_versions(version_id) ON DELETE CASCADE;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS package_code TEXT;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS output_checksum TEXT;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE tax_declaration_packages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE tax_declaration_packages
SET
  payload_json = COALESCE(payload_json, '{}'::jsonb),
  created_at = COALESCE(created_at, NOW())
WHERE
  payload_json IS NULL
  OR created_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'tax_declaration_packages'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE tax_declaration_packages
      ADD CONSTRAINT tax_declaration_packages_pkey PRIMARY KEY (tax_declaration_package_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_tax_declaration_packages_version
  ON tax_declaration_packages (annual_report_version_id, package_code);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322140000_phase12_annual_reporting')
ON CONFLICT (migration_id) DO NOTHING;
