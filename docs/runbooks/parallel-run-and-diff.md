# Parallel run and diff

## Purpose

Operational runbook for `17.4` parallel-run execution across finance, payroll, HUS, personalliggare and project profitability before cutover acceptance.

## Preconditions

- Cutover plan exists with `acceptedVarianceThresholds`.
- Source extracts and target snapshots are frozen for the comparison window.
- Trial/live isolation is still intact for any trial-originated comparison.
- Migration operator has `company.manage` within `migration_cockpit`.

## Flow

1. Create or verify the cutover plan and its variance thresholds.
2. Run source and target snapshot generation for each required scope:
   - `finance`
   - `payroll`
   - `hus`
   - `personalliggare`
   - `project_profitability`
3. Record the comparison:
   - `POST /v1/migration/parallel-run-results`
4. Review the result:
   - `status=completed` means thresholds passed but still requires explicit operator acceptance.
   - `status=manual_review_required` means at least one metric exceeded threshold and needs documented approval.
   - `status=blocked` means a hard-block metric failed and the run must be rerun after remediation.
5. Accept non-blocked results with documented rationale:
   - `POST /v1/migration/parallel-run-results/:parallelRunResultId/accept`
6. Link accepted parallel-run results into migration acceptance:
   - `POST /v1/migration/acceptance-records`
7. Verify the cockpit:
   - `GET /v1/migration/cockpit?companyId=...`
   - confirm `parallelRunBoard`
   - confirm `cutoverBoard.items[*].parallelRunSummary`
8. Verify mission control:
   - `GET /v1/mission-control/dashboards/cutover_control?companyId=...`

## Guardrails

- Blocked parallel-run results must never be manually accepted.
- Acceptance records must not reference non-accepted parallel-run results.
- Parallel-run metrics must carry thresholds unless explicitly marked informational.
- Trial-originated comparisons must remain non-legal-effect and must not mutate live finance or filing state.

## Verification

- Unit: `tests/unit/phase14-migration.test.mjs`
- API: `tests/integration/phase14-migration-api.test.mjs`
- E2E: `tests/e2e/phase14-migration-flow.test.mjs`
- Mission control: `tests/integration/phase15-mission-control-api.test.mjs`
- Route metadata: `tests/integration/api-route-metadata.test.mjs`
