CREATE TABLE IF NOT EXISTS core_domain_records (
  bounded_context_code TEXT NOT NULL DEFAULT 'core',
  object_type TEXT NOT NULL,
  company_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  status TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  object_version BIGINT NOT NULL DEFAULT 1,
  last_actor_id TEXT,
  last_correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bounded_context_code, object_type, company_id, object_id)
);

CREATE INDEX IF NOT EXISTS core_domain_records_company_lookup_idx
  ON core_domain_records (company_id, object_type, updated_at, object_id);

CREATE INDEX IF NOT EXISTS core_domain_records_correlation_lookup_idx
  ON core_domain_records (last_correlation_id)
  WHERE last_correlation_id IS NOT NULL;
