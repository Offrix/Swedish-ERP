# Fas 16.6 Dynamics 365 Project Operations Verification

## Scope

Verifiera enterprise-slicen i fas 16.6:
- Dynamics 365 Project Operations capability manifest
- `crm_handoff` connection
- adapter -> project import batch
- commit till riktiga projektobjekt

## Minsta verifiering

1. Kor riktade tester:
   - `node --test tests/unit/phase16-dynamics-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-dynamics-project-adapter-api.test.mjs`
2. Kor full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkant resultat

- `/v1/integrations/capability-manifests` exponerar `dynamics365_project_operations` pa `crm_handoff`
- connection kan skapas i `production` med `api_credentials`
- adapter skapar `crm_handoff`-batch med `dynamics365_project_operations` som `sourceSystemCode`
- batchen bar contract, actual och billing backlog context utan att gora Dynamics till invoice truth
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt
