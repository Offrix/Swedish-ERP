ALTER TABLE report_definitions
  ADD COLUMN IF NOT EXISTS definition_kind TEXT NOT NULL DEFAULT 'official',
  ADD COLUMN IF NOT EXISTS base_report_code TEXT,
  ADD COLUMN IF NOT EXISTS row_dimension_code TEXT,
  ADD COLUMN IF NOT EXISTS default_filters_json JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_definitions_phase11_definition_kind'
  ) THEN
    ALTER TABLE report_definitions
      ADD CONSTRAINT ck_report_definitions_phase11_definition_kind
      CHECK (definition_kind IN ('official', 'light_builder'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS report_metric_definitions (
  report_metric_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  metric_code TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  owner_role_code TEXT NOT NULL,
  drilldown_level TEXT NOT NULL,
  formula_ref TEXT NOT NULL,
  source_domains_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, metric_code, version_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_metric_definitions_phase11_status'
  ) THEN
    ALTER TABLE report_metric_definitions
      ADD CONSTRAINT ck_report_metric_definitions_phase11_status
      CHECK (status IN ('draft', 'active', 'deprecated', 'retired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_report_metric_definitions_company_metric
  ON report_metric_definitions (company_id, metric_code, version_no, status);

CREATE TABLE IF NOT EXISTS report_export_jobs (
  report_export_job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  report_snapshot_id UUID NOT NULL REFERENCES report_snapshots(report_snapshot_id) ON DELETE CASCADE,
  report_code TEXT NOT NULL,
  report_version_no INTEGER NOT NULL,
  format TEXT NOT NULL,
  watermark_mode TEXT NOT NULL DEFAULT 'none',
  requested_by_actor_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  artifact_ref TEXT,
  artifact_name TEXT,
  artifact_content_type TEXT,
  content_hash TEXT,
  superseded_by_export_job_id UUID REFERENCES report_export_jobs(report_export_job_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_export_jobs_phase11_format'
  ) THEN
    ALTER TABLE report_export_jobs
      ADD CONSTRAINT ck_report_export_jobs_phase11_format
      CHECK (format IN ('excel', 'pdf'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_export_jobs_phase11_watermark'
  ) THEN
    ALTER TABLE report_export_jobs
      ADD CONSTRAINT ck_report_export_jobs_phase11_watermark
      CHECK (watermark_mode IN ('none', 'preliminary', 'superseded'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_export_jobs_phase11_status'
  ) THEN
    ALTER TABLE report_export_jobs
      ADD CONSTRAINT ck_report_export_jobs_phase11_status
      CHECK (status IN ('queued', 'running', 'materialized', 'delivered', 'failed', 'retry_pending', 'superseded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_report_export_jobs_company_snapshot
  ON report_export_jobs (company_id, report_snapshot_id, format, status);

CREATE INDEX IF NOT EXISTS ix_report_export_jobs_company_report
  ON report_export_jobs (company_id, report_code, created_at);
