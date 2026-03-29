# Fas 16.6 monday Work Management Verification

## Scope

Verifiera tredje vendor-slicen i fas 16.6:
- monday work management capability manifest
- `crm_handoff` connection
- adapter -> project import batch
- portfolio/workload/risk-metadata in i canonical project import
- commit till riktiga projektobjekt

## Minsta verifiering

1. Kör riktade tester:
   - `node --test tests/unit/phase16-monday-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-monday-project-adapter-api.test.mjs`
2. Kör full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkänt resultat

- `/v1/integrations/capability-manifests` exponerar `monday_work_management` på `crm_handoff`
- connection kan skapas i `production` med `api_credentials`
- adapter skapar `crm_handoff`-batch med `monday` som `sourceSystemCode`
- batchen bär adaptermetadata, baseline refs, portfolio/workload/risk-context
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt utan att använda monday som invoice truth
