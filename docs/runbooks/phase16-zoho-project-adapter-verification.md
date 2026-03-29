# Fas 16.6 Zoho CRM Projects Billing Verification

## Scope

Verifiera Zoho-slicen i fas 16.6:
- Zoho capability manifest
- `crm_handoff` connection
- adapter -> project import batch
- commit till riktiga projektobjekt

## Minsta verifiering

1. Kor riktade tester:
   - `node --test tests/unit/phase16-zoho-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-zoho-project-adapter-api.test.mjs`
2. Kor full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkant resultat

- `/v1/integrations/capability-manifests` exponerar `zoho_crm_projects` pa `crm_handoff`
- connection kan skapas i `production` med `api_credentials`
- adapter skapar `crm_handoff`-batch med `zoho` som `sourceSystemCode`
- batchen bar adaptermetadata for projekt, fakturering och profitability context
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt
