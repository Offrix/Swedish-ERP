ALTER TABLE construction_sites
  ADD COLUMN IF NOT EXISTS industry_pack_code TEXT NOT NULL DEFAULT 'bygg',
  ADD COLUMN IF NOT EXISTS site_type_code TEXT NOT NULL DEFAULT 'construction_site',
  ADD COLUMN IF NOT EXISTS workplace_identifier TEXT,
  ADD COLUMN IF NOT EXISTS threshold_evaluation_status TEXT NOT NULL DEFAULT 'threshold_pending',
  ADD COLUMN IF NOT EXISTS equipment_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE attendance_events
  ADD COLUMN IF NOT EXISTS attendance_identity_snapshot_id UUID,
  ADD COLUMN IF NOT EXISTS contractor_snapshot_id UUID,
  ADD COLUMN IF NOT EXISTS client_event_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'captured',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS workplace_identifier TEXT;

ALTER TABLE kiosk_devices
  ADD COLUMN IF NOT EXISTS trust_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enrollment_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS trusted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS attendance_identity_snapshots (
  attendance_identity_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(construction_site_id) ON DELETE CASCADE,
  employment_id UUID REFERENCES employments(employment_id) ON DELETE SET NULL,
  worker_identity_type TEXT NOT NULL,
  worker_identity_value TEXT NOT NULL,
  full_name_snapshot TEXT NOT NULL,
  employer_org_no TEXT NOT NULL,
  contractor_org_no TEXT NOT NULL,
  role_at_workplace TEXT NOT NULL,
  identity_snapshot_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (construction_site_id, identity_snapshot_key)
);

CREATE INDEX IF NOT EXISTS ix_attendance_identity_snapshots_phase14_site
  ON attendance_identity_snapshots (company_id, construction_site_id, worker_identity_value);

CREATE TABLE IF NOT EXISTS contractor_snapshots (
  contractor_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(construction_site_id) ON DELETE CASCADE,
  employer_org_no TEXT NOT NULL,
  contractor_org_no TEXT NOT NULL,
  role_at_workplace TEXT NOT NULL,
  contractor_snapshot_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (construction_site_id, contractor_snapshot_key)
);

CREATE INDEX IF NOT EXISTS ix_contractor_snapshots_phase14_site
  ON contractor_snapshots (company_id, construction_site_id, contractor_org_no);

CREATE TABLE IF NOT EXISTS kiosk_device_trust_events (
  kiosk_device_trust_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(construction_site_id) ON DELETE CASCADE,
  kiosk_device_id UUID NOT NULL REFERENCES kiosk_devices(kiosk_device_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_kiosk_device_trust_events_phase14_site
  ON kiosk_device_trust_events (company_id, construction_site_id, kiosk_device_id, created_at);

INSERT INTO schema_migrations(version, description)
VALUES ('20260325002000_phase14_personalliggare_identity_graph', 'Phase 14 personalliggare identity graph')
ON CONFLICT (version) DO NOTHING;
