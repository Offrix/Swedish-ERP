# Fas 16.6 ClickUp Project Adapter Verification

## Scope

Verifiera femte vendor-slicen i fas 16.6:
- ClickUp capability manifest
- `crm_handoff` connection
- adapter -> project import batch
- list/folder/space, timesheets, workload och hierarchy-context in i canonical project import
- commit till riktiga projektobjekt

## Minsta verifiering

1. Kör riktade tester:
   - `node --test tests/unit/phase16-clickup-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-clickup-project-adapter-api.test.mjs`
2. Kör full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkänt resultat

- `/v1/integrations/capability-manifests` exponerar `clickup` på `crm_handoff`
- connection kan skapas i `production` med `api_credentials`
- adapter skapar `crm_handoff`-batch med `clickup` som `sourceSystemCode`
- batchen bär adaptermetadata, baseline refs, hierarchy/workload/timesheet-context
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt utan att använda ClickUp som invoice truth
