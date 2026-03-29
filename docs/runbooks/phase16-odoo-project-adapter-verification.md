# Fas 16.6 Odoo Project Billing Verification

## Scope

Verifiera Odoo-slicen i fas 16.6:
- Odoo capability manifest
- `crm_handoff` connection
- adapter -> project import batch
- commit till riktiga projektobjekt

## Minsta verifiering

1. Kor riktade tester:
   - `node --test tests/unit/phase16-odoo-project-adapter.test.mjs`
   - `node --test tests/integration/phase16-odoo-project-adapter-api.test.mjs`
2. Kor full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkant resultat

- `/v1/integrations/capability-manifests` exponerar `odoo_projects_billing` pa `crm_handoff`
- connection kan skapas i `production` med `api_credentials`
- adapter skapar `crm_handoff`-batch med `odoo` som `sourceSystemCode`
- batchen bar sales order, timesheet och profitability context utan att gora Odoo till invoice truth
- commit skapar riktiga project/opportunity/work-model/billing-plan-objekt
