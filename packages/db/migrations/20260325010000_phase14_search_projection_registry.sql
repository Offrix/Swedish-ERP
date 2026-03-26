BEGIN;

CREATE TABLE IF NOT EXISTS search_projection_contracts (
  projection_contract_id TEXT PRIMARY KEY,
  company_id UUID NOT NULL,
  projection_code TEXT NOT NULL,
  object_type TEXT NOT NULL,
  source_domain_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  projection_version_no INTEGER NOT NULL,
  visibility_scope TEXT NOT NULL,
  supports_global_search BOOLEAN NOT NULL DEFAULT TRUE,
  supports_saved_views BOOLEAN NOT NULL DEFAULT TRUE,
  surface_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  filter_field_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_documents (
  search_document_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  projection_code TEXT NOT NULL,
  source_domain_code TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  display_title TEXT NOT NULL,
  display_subtitle TEXT NULL,
  document_status TEXT NOT NULL,
  status TEXT NOT NULL,
  search_text TEXT NOT NULL,
  snippet TEXT NULL,
  filter_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  permission_scope_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  surface_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_version TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL,
  indexed_version INTEGER NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL,
  stale_at TIMESTAMPTZ NULL,
  tombstoned_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_search_documents_projection_object UNIQUE (company_id, projection_code, object_id)
);

CREATE TABLE IF NOT EXISTS search_reindex_requests (
  search_reindex_request_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  projection_code TEXT NULL,
  reason_code TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  error_code TEXT NULL,
  indexed_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  tombstoned_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS saved_views (
  saved_view_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  surface_code TEXT NOT NULL,
  title TEXT NOT NULL,
  query_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility_code TEXT NOT NULL,
  shared_with_team_id UUID NULL,
  status TEXT NOT NULL,
  broken_reason_code TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  dashboard_widget_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  surface_code TEXT NOT NULL,
  widget_type_code TEXT NOT NULL,
  layout_slot TEXT NOT NULL,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_search_documents_company_status
  ON search_documents (company_id, status, projection_code, updated_at DESC);

CREATE INDEX IF NOT EXISTS ix_saved_views_company_owner
  ON saved_views (company_id, owner_user_id, surface_code, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS ix_dashboard_widgets_company_owner
  ON dashboard_widgets (company_id, owner_user_id, surface_code, updated_at DESC);

-- phase14 search projection registry
INSERT INTO schema_migrations (migration_id)
VALUES ('20260325010000_phase14_search_projection_registry')
ON CONFLICT (migration_id) DO NOTHING;

COMMIT;
