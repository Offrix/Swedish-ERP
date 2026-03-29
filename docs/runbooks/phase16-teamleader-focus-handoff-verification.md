# Fas 16.6 Teamleader Focus Handoff Verification

## Scope

Verifiera andra vendor-slicen i fas 16.6:
- Teamleader Focus capability manifest
- `crm_handoff` connection
- adapter -> project import batch
- commit till riktiga projektobjekt

## Minsta verifiering

1. Kör riktade tester:
   - `node --test tests/unit/phase16-teamleader-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-teamleader-project-adapter-api.test.mjs`
2. Kör full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkänt resultat

- `/v1/integrations/capability-manifests` exponerar `teamleader_focus` på `crm_handoff`
- connection kan skapas i `production` med `api_credentials`
- adapter skapar `crm_handoff`-batch med `teamleader` som `sourceSystemCode`
- batchen bär adaptermetadata och baseline refs
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt
