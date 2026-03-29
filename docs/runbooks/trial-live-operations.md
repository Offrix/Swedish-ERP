# Trial/live operations

## Purpose

This runbook verifies the operational split between trial and live so support, sales engineering and backoffice can run trial tenants without leaking live behavior.

## Verification scope

- Trial support policy is readable and updateable through `/v1/trial/support-policy`.
- Trial operations snapshot is readable through `/v1/trial/operations`.
- Trial alerts and queue views are readable through:
  - `/v1/trial/operations/alerts`
  - `/v1/trial/operations/queues`
- Promotion workflows are readable through `/v1/trial/promotions/workflows`.
- Sales/demo analytics are readable through `/v1/trial/analytics`.
- Trial conversion mission control includes operational summary, alerts, queue pressure and sales/demo analytics.
- Trial reset requires explicit reset rights, not just generic company manage access.
- Trial reset revokes sibling sessions through an audited company operation path.

## Verification steps

1. Create at least one trial environment that is eligible for reset.
2. Create one actor with generic trial manage access but without reset rights.
3. Create one actor with explicit trial reset rights through the trial support policy.
4. Verify that the non-authorized actor receives `trial_environment_reset_right_required`.
5. Verify that the authorized actor can reset the trial and that sibling sessions are revoked.
6. Create trial environments that produce:
   - expiring-soon alert
   - expired/reset-stuck alert
   - promotion-stalled alert
   - parallel-run-active alert
7. Read `/v1/trial/operations` and verify:
   - five queue views exist
   - alert summary is populated
   - promotion workflows are present
   - sales/demo analytics are present
8. Read `/v1/mission-control/dashboards/trial_conversion` and verify:
   - `summary.operationsSummary` exists
   - `summary.salesDemoAnalytics` exists
   - counters include alert counts

## Expected results

- Trial operations are separated from live operations in API shape and mission control.
- Support policy governs reset rights and thresholds.
- Reset rights are enforced server-side.
- Trial resets revoke active company sessions except the acting operator session.
- Analytics and queue views are deterministic and auditable.

## Test coverage

- `tests/unit/phase17-trial-live-ops-split.test.mjs`
- `tests/integration/phase17-trial-live-ops-api.test.mjs`
- `tests/integration/phase15-mission-control-api.test.mjs`
- `tests/integration/api-route-metadata.test.mjs`
- `tests/integration/phase1-tenant-setup-api.test.mjs`
