# Fas 16.6 HubSpot CRM Handoff Verification

## Scope

Verifiera första CRM/project-adaptern i fas 16.6:
- HubSpot capability manifest
- `crm_handoff` integration connection
- health check med credentials
- adapter -> project import batch
- commit av importbatch till riktiga projektobjekt

## Minsta verifiering

1. Kör riktade tester:
   - `node --test tests/unit/phase16-hubspot-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-hubspot-project-adapter-api.test.mjs`
2. Kör full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkänt resultat

- `/v1/integrations/capability-manifests` exponerar `crm_handoff` för `hubspot_crm`
- HubSpot connection kan skapas i `production` med `api_credentials`
- health check passerar credential gate
- adapterbaserad `POST /v1/projects/import-batches` skapar batch med:
  - `batchTypeCode = crm_handoff`
  - `sourceSystemCode = hubspot`
  - `adapterProviderCode = hubspot_crm`
  - row-level `adapterContext`
  - row-level `providerBaselineRef`
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt

## Fel som ska stoppa release

- HubSpot adapter kan skapa batch utan credentials-configurerad connection
- adaptermetadata tappas bort mellan integrationslager och project import
- importbatch kan inte committas till riktiga projektobjekt
- trial/sandbox/production-surface för `crm_handoff` avviker från capability manifest
