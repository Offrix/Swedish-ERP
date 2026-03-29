# Fas 16.1 integration core verification

## Syfte

Verifiera att integrationskärnan är verklig och inte bara routebredd:
- capability manifests är publicerade med explicit mode-matris
- `IntegrationConnection`, `CredentialSetMetadata`, `ConsentGrant` och `IntegrationHealthCheck` finns som first-class runtimeobjekt
- credentials får inte återanvändas mellan `trial`/`sandbox`/`test`/`pilot_parallel`/`production`
- provider environment ref, fallback mode och rate limit policy bärs i control-plane

## Körordning

1. Kör riktad unit-svit:

```powershell
node --test tests/unit/phase16-integration-core.test.mjs
```

2. Kör riktad API-svit:

```powershell
node --test tests/integration/phase16-integration-core-api.test.mjs
```

3. Kör route metadata gate:

```powershell
node --test tests/integration/api-route-metadata.test.mjs
```

4. Kör full verifiering:

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

## Förväntat resultat

- `GET /v1/integrations/capability-manifests` visar partner- och document-ai-manifests
- manifests bär `modeMatrix`, `allowedEnvironmentModes`, `trialSafe`, `sandboxSupported` och `supportsLegalEffect`
- `POST /v1/integrations/connections` materialiserar canonical connection med credentials metadata
- `POST /v1/integrations/connections/:connectionId/consents` skapar authorized consent grant
- `POST /v1/integrations/connections/:connectionId/health-checks` visar credentials, consent, fallback, rate-limit och isolation
- återanvändning av samma credential-set över olika environment modes blockeras med `integration_credentials_mode_reuse_forbidden`

## Exit gate

Fas 16.1 får bara markeras klar när:
- alla tre riktade sviter är gröna
- full svit är grön
- roadmapen är uppdaterad med konkret 16.1-status
- inga live-stubbar eller delade credential-referenser finns kvar i control-plane
