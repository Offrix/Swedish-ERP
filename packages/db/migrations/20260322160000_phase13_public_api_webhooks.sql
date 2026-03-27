CREATE TABLE IF NOT EXISTS public_api_compatibility_baselines (
  baseline_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  route_hash TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_api_clients (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  client_secret_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_api_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public_api_clients(client_id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  token_hash TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_public_api_tokens_hash
  ON public_api_tokens (token_hash);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public_api_clients(client_id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  event_types_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_url TEXT NOT NULL,
  description TEXT,
  secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_webhook_events_company_key
  ON webhook_events (company_id, event_key);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES webhook_events(event_id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(subscription_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  delivery_attempt_no INTEGER NOT NULL DEFAULT 1,
  signature TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  target_url TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260322160000_phase13_public_api_webhooks')
ON CONFLICT (migration_id) DO NOTHING;
