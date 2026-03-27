CREATE TABLE IF NOT EXISTS id06_company_verifications (
  id06_company_verification_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  org_no TEXT NOT NULL,
  company_name TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  status TEXT NOT NULL,
  external_company_ref TEXT NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  verified_at TIMESTAMPTZ NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS id06_person_verifications (
  id06_person_verification_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employment_id TEXT NULL,
  worker_identity_type TEXT NOT NULL,
  worker_identity_value TEXT NOT NULL,
  full_name_snapshot TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  status TEXT NOT NULL,
  external_person_ref TEXT NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  verified_at TIMESTAMPTZ NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS id06_employer_links (
  id06_employer_link_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employer_org_no TEXT NOT NULL,
  worker_identity_type TEXT NOT NULL,
  worker_identity_value TEXT NOT NULL,
  id06_company_verification_id TEXT NOT NULL,
  id06_person_verification_id TEXT NOT NULL,
  status TEXT NOT NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS id06_card_statuses (
  id06_card_status_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employer_org_no TEXT NOT NULL,
  worker_identity_type TEXT NOT NULL,
  worker_identity_value TEXT NOT NULL,
  card_reference TEXT NOT NULL,
  masked_card_number TEXT NULL,
  provider_code TEXT NOT NULL,
  status TEXT NOT NULL,
  valid_from DATE NULL,
  valid_to DATE NULL,
  validated_at TIMESTAMPTZ NULL,
  id06_employer_link_id TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS id06_workplace_bindings (
  id06_workplace_binding_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  workplace_id TEXT NOT NULL,
  workplace_identifier TEXT NOT NULL,
  construction_site_id TEXT NULL,
  employer_org_no TEXT NOT NULL,
  worker_identity_type TEXT NOT NULL,
  worker_identity_value TEXT NOT NULL,
  id06_card_status_id TEXT NOT NULL,
  status TEXT NOT NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  activated_at TIMESTAMPTZ NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS id06_work_passes (
  id06_work_pass_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  workplace_id TEXT NOT NULL,
  id06_workplace_binding_id TEXT NOT NULL,
  work_pass_code TEXT NOT NULL,
  status TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  valid_from DATE NULL,
  valid_to DATE NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS id06_evidence_bundles (
  id06_evidence_bundle_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  workplace_id TEXT NOT NULL,
  workplace_identifier TEXT NOT NULL,
  binding_count INTEGER NOT NULL,
  work_pass_count INTEGER NOT NULL,
  attendance_mirror_count INTEGER NOT NULL,
  evidence_hash TEXT NOT NULL,
  exported_at TIMESTAMPTZ NOT NULL,
  created_by_actor_id TEXT NOT NULL
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260325034000_phase14_id06_domain')
ON CONFLICT (migration_id) DO NOTHING;
