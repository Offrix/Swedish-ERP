# Fas 16.6 Asana Project Adapter Verification

## Scope

Verifiera fjärde vendor-slicen i fas 16.6:
- Asana capability manifest
- `crm_handoff` connection
- adapter -> project import batch
- portfolio/workload/native time-tracking-metadata in i canonical project import
- commit till riktiga projektobjekt

## Minsta verifiering

1. Kör riktade tester:
   - `node --test tests/unit/phase16-asana-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-asana-project-adapter-api.test.mjs`
2. Kör full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkänt resultat

- `/v1/integrations/capability-manifests` exponerar `asana` på `crm_handoff`
- connection kan skapas i `production` med `api_credentials`
- adapter skapar `crm_handoff`-batch med `asana` som `sourceSystemCode`
- batchen bär adaptermetadata, baseline refs, portfolio/workload/time-tracking-context
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt utan att använda Asana som invoice truth
