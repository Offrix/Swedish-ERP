# Fas 14.3 - Project billing, WIP and profitability verification

## Scope

Verifierar att project core nu bar riktiga billing models, hybrid change orders, invoice readiness och cross-domain profitability over AP, HUS, manual adjustments och billing.

## Target behavior

- Billing model-katalogen omfattar:
  - `fixed_price`
  - `time_and_material`
  - `milestone`
  - `retainer_capacity`
  - `subscription_service`
  - `advance_invoice`
  - `hybrid_change_order`
- Project profitability bygger pa payroll/AP/material/travel/HUS/billing och approved manual adjustments.
- Invoice readiness assessments materialiseras separat med `ready`, `review_required` eller `blocked`.
- Pending profitability adjustments driver review-required state i invoice readiness.
- Applied change orders skapar ny approved `RevenuePlan`, ny active `BillingPlan`, superseder tidigare commercial chain och flippar project billing model till `hybrid_change_order`.
- Workspace och evidence bundle bar profitability adjustments och invoice readiness.
- API publicerar och skyddar de nya 14.3-routefamiljerna.

## Targeted verification

```powershell
node --check packages/domain-projects/src/index.mjs
node --check packages/domain-projects/src/index.ts
node --check apps/api/src/platform.mjs
node --check apps/api/src/server.mjs
node --check apps/api/src/route-contracts.mjs
node --check tests/unit/phase14-project-billing-profitability.test.mjs
node --check tests/integration/phase14-project-billing-profitability-api.test.mjs
node --check tests/unit/projects-phase10-3.test.mjs
node --check tests/integration/phase10-build-api.test.mjs
node --check tests/e2e/phase10-build-flow.test.mjs
node --check tests/integration/api-route-metadata.test.mjs
```

```powershell
@'
await import('./tests/unit/phase14-project-billing-profitability.test.mjs');
'@ | node -

@'
await import('./tests/integration/phase14-project-billing-profitability-api.test.mjs');
'@ | node -

@'
await import('./tests/unit/projects-phase10-3.test.mjs');
'@ | node -

@'
await import('./tests/integration/phase10-build-api.test.mjs');
'@ | node -

@'
await import('./tests/e2e/phase10-build-flow.test.mjs');
'@ | node -

@'
await import('./tests/integration/api-route-metadata.test.mjs');
'@ | node -
```

## Full verification gate

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

## Expected evidence

- Unit tests verifierar AP/HUS/manual adjustment inputs, invoice readiness och hybrid change-order apply.
- API test verifierar publication och enforcement for:
  - `POST /v1/projects/:projectId/profitability-adjustments`
  - `POST /v1/projects/:projectId/profitability-adjustments/:projectProfitabilityAdjustmentId/decide`
  - `POST /v1/projects/:projectId/invoice-readiness-assessments`
  - `POST /v1/projects/:projectId/change-orders/:projectChangeOrderId/status`
- Legacy build VAT/HUS/personalliggare tests fortsatter ga via nya `priced -> approved -> applied` chain.
- Route metadata publicerar nya 14.3 contracts med stark `project` scope och `strong_mfa`.

## Exit criteria

- No legacy `quoted -> approved -> invoiced` change-order semantics remain.
- Project commercial truth now carries invoice readiness and profitability adjustments as first-class objects.
- Cross-domain profitability is no longer limited to payroll/time/billing only.
- Hybrid change orders produce deterministic commercial supersession without breaking older build/project flows.
