# Fas 14.2 - CRM-linked handoff verification

## Scope

Verifierar att accepterad offert kan bli ett kanoniskt projekt utan att CRM eller quote-kallan blir source of truth for project runtime.

## Target behavior

- Accepted quote kan handoffas till project core via `POST /v1/projects/quote-handoffs`.
- Handoffen skapar kanoniska projektobjekt:
  - `OpportunityLink`
  - `QuoteLink`
  - `Engagement`
  - `WorkModel`
  - godkand `RevenuePlan`
  - aktiv `BillingPlan`
  - `ProjectStatusUpdate`
- Workspace visar `customerContext`, billing plan och lanksammanhang.
- Evidence bundle bar med sig handoff-objekten.
- Dubblett-handoff pa samma quote/version skapar inte nytt projekt.

## Targeted verification

```powershell
node --check packages/domain-projects/src/index.mjs
node --check packages/domain-projects/src/index.ts
node --check apps/api/src/server.mjs
node --check apps/api/src/route-contracts.mjs
node --check tests/unit/phase14-project-crm-handoff.test.mjs
node --check tests/integration/phase14-project-crm-handoff-api.test.mjs
node --check tests/integration/api-route-metadata.test.mjs
```

```powershell
@'
await import('./tests/unit/phase14-project-crm-handoff.test.mjs');
'@ | node -

@'
await import('./tests/integration/phase14-project-crm-handoff-api.test.mjs');
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

- Unit test verifierar canonical handoff, audit trail och dubblettskydd.
- API test verifierar route publication, auth path, object creation och workspace payload.
- Route metadata verifierar contracts for:
  - `POST /v1/projects/quote-handoffs`
  - `POST /v1/projects/:projectId/opportunity-links`
  - `POST /v1/projects/:projectId/quote-links`
  - `POST /v1/projects/:projectId/billing-plans`
  - `POST /v1/projects/:projectId/status-updates`

## Exit criteria

- Ingen quote-to-project dubbelregistrering finns kvar i handoff-flodet.
- CRM/quote-kallan fungerar endast som upstream context.
- Project runtime bär fortsatt source of truth for customer context, billing readiness och status chain efter handoff.
