# Fas 14.7 — Project trial/demo flows och migration verification

## Syfte

Verifiera att projektkärnan nu bär:
- säljbara project trial scenarios
- import från CRM/project tools via canonical import batches
- trial-safe invoice simulations utan legal effect
- separat live-conversion-path för projektdata

## MÅSTE vara sant

- Trial scenario materialization skapar riktiga project objects i projects domain:
  - `Project`
  - `ProjectEngagement`
  - `ProjectWorkModel`
  - `ProjectWorkPackage`
  - `ProjectDeliveryMilestone`
  - approved `ProjectRevenuePlan`
  - active `ProjectBillingPlan`
  - `ProjectStatusUpdate`
- Trial scenarios får aldrig skapa legal effect.
- Invoice simulations får aldrig skapa riktiga AR-, ledger-, payout- eller provider-händelser.
- Project import batches måste kunna commitas till riktiga projects utan att CRM blir source of truth.
- Live conversion plan måste bära portable project masterdata men uttryckligen blockera trial artifacts.

## API-ytor

- `GET /v1/projects/trial-scenarios`
- `POST /v1/projects/trial-scenarios/:scenarioCode/materialize`
- `GET /v1/projects/import-batches`
- `POST /v1/projects/import-batches`
- `POST /v1/projects/import-batches/:projectImportBatchId/commit`
- `GET /v1/projects/:projectId/invoice-simulations`
- `POST /v1/projects/:projectId/invoice-simulations`
- `GET /v1/projects/:projectId/live-conversion-plans`
- `POST /v1/projects/:projectId/live-conversion-plans`

## Verifiering

1. Kör unit-test:
   - `node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase14-project-trial-demo-runtime.test.mjs`
2. Kör integrationstest:
   - `node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase14-project-trial-demo-api.test.mjs`
3. Kör route-metadata:
   - `node --test --test-isolation=none C:\Users\snobb\Desktop\Swedish ERP\tests\integration\api-route-metadata.test.mjs`
4. Kör regressionsytor för project/workspace:
   - `node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase32-project-workspace.test.mjs`
   - `node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase32-project-workspace-api.test.mjs`
5. Kör full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkännandekriterier

- Trial scenario list returnerar canonical scenario catalog.
- Scenario materialization producerar client-ready demo project utan legal effect.
- Import batch kan skapas och commitas till riktiga project records.
- Invoice simulation returnerar preview-totaler och `legalEffectFlag=false`.
- Live conversion plan blir `ready` när project masterdata är portable och blockerar trial artifacts.
- Workspace och evidence bundle bär de nya 14.7-objekten.
