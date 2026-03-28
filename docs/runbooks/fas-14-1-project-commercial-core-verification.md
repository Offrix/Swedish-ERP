# Fas 14.1 project-commercial core verification

## Syfte

Verifiera att general project-commercial core fungerar som en egen kommersiell kärna utan att tvinga in field/build-semantik i alla projektflöden.

## Scope

Den här verifieringen täcker:

- `Project`
- `Engagement`
- `WorkModel`
- `WorkPackage`
- `DeliveryMilestone`
- `WorkLog`
- `RevenuePlan`
- `ProfitabilitySnapshot`
- `ProjectDeviation`
- `ProjectEvidenceBundle`
- project-scope route contracts för commercial-core-mutationer

## Förutsättningar

- API:n kör med `phase10ProjectsEnabled=true`
- auth-flödet ger ett `company_admin`- eller motsvarande desktop-operatörssession-token
- ledger chart kan installeras för testbolaget

## Verifieringssteg

1. Skapa ett nytt projekt via `POST /v1/projects`.
2. Skapa ett `Engagement` via `POST /v1/projects/:projectId/engagements`.
3. Skapa en `WorkModel` via `POST /v1/projects/:projectId/work-models`.
4. Skapa ett `WorkPackage` via `POST /v1/projects/:projectId/work-packages`.
5. Skapa ett `DeliveryMilestone` via `POST /v1/projects/:projectId/delivery-milestones`.
6. Registrera ett `WorkLog` via `POST /v1/projects/:projectId/work-logs`.
7. Skapa ett `RevenuePlan` via `POST /v1/projects/:projectId/revenue-plans`.
8. Godkänn planen via `POST /v1/projects/:projectId/revenue-plans/:projectRevenuePlanId/approve`.
9. Materialisera `ProfitabilitySnapshot` via `POST /v1/projects/:projectId/profitability-snapshots`.
10. Läs workspace via `GET /v1/projects/:projectId/workspace`.
11. Bekräfta att root-metadata publicerar alla commercial-core-rutter.

## Förväntat resultat

- workspace visar:
  - `engagementCount > 0`
  - `workModelCount > 0`
  - `workPackageCount > 0`
  - `deliveryMilestoneCount > 0`
  - `approvedRevenuePlanCount > 0`
  - `currentProfitabilitySnapshotId != null`
- `warningCodes` saknar:
  - `engagement_missing`
  - `work_model_missing`
  - `approved_revenue_plan_missing`
- `complianceIndicatorStrip` innehåller `commercial_core` med status `ok`
- revenue plan är `approved`
- profitability snapshot refererar godkänd revenue plan
- audit trail innehåller:
  - `project.engagement.created`
  - `project.work_model.created`
  - `project.work_package.created`
  - `project.delivery_milestone.created`
  - `project.work_log.recorded`
  - `project.revenue_plan.created`
  - `project.revenue_plan.approved`
  - `project.profitability.materialized`

## Route contract gate

Följande muterande rutter måste publiceras med `strong_mfa` och project-scope:

- `POST /v1/projects/:projectId/engagements`
- `POST /v1/projects/:projectId/work-models`
- `POST /v1/projects/:projectId/work-packages`
- `POST /v1/projects/:projectId/delivery-milestones`
- `POST /v1/projects/:projectId/work-logs`
- `POST /v1/projects/:projectId/revenue-plans`
- `POST /v1/projects/:projectId/revenue-plans/:projectRevenuePlanId/approve`
- `POST /v1/projects/:projectId/profitability-snapshots`

## Regressionkommandon

Kör riktade verifieringar:

```powershell
@'
await import('./tests/unit/phase14-project-commercial-core.test.mjs');
'@ | node -

@'
await import('./tests/integration/phase14-project-commercial-core-api.test.mjs');
'@ | node -

@'
await import('./tests/integration/api-route-metadata.test.mjs');
'@ | node -
```

Kör därefter full verifiering:

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

## Exit gate

Fas 14.1 är inte klar förrän:

- commercial-core-objekten finns i domänruntime
- commercial-core-objekten finns i API:t
- workspace/evidence export bär objekten
- route metadata publicerar ytan korrekt
- work-model-katalogen täcker consulting, service, work-order, construction och internal-delivery
- riktade tester och full verifiering är gröna
