# Migration Cutover

## Purpose

Operate the migration cockpit as the canonical control plane for mapping, import, acceptance, cutover, rollback, and audit export.

## Preconditions

- Approved mapping sets exist for the active source systems.
- Import batches are registered and either accepted or explicitly blocked with documented reasons.
- Diff reports exist for the active migration cohort and unresolved material differences are zero before go-live acceptance.
- Cutover plan includes rollback point, accepted variance thresholds, stabilization window, signoff chain, and checklist items.
- Latest restore drill is green within allowed freshness.

## Flow

1. Create and approve mapping sets.
2. Register import batches and run them through canonical import execution.
3. Record any manual migration corrections explicitly.
4. Generate variance and diff reports for the cohort.
5. Create cutover plan with rollback point, thresholds, checklist, and signoff chain.
6. Record cutover signoffs through `POST /v1/migration/cutover-plans/:cutoverPlanId/signoffs`.
7. Complete checklist items through `POST /v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode`.
8. Start cutover and record final extract.
9. Record migration acceptance through `POST /v1/migration/acceptance-records`.
10. Export the frozen acceptance evidence bundle through `GET /v1/migration/acceptance-records/:migrationAcceptanceRecordId/evidence?companyId=...`.
11. Validate cutover gates.
12. Switch cutover only after validation is green.
13. Stabilize the cohort and close only when the stabilization window and post-switch checks are green.
14. If rollback is required, start and complete rollback through the canonical rollback endpoints, preserving acceptance and evidence history.

## Guardrails

- No cutover switch without accepted migration acceptance record and green validation.
- No silent spreadsheet-side signoffs or rollback decisions.
- Rollback must preserve immutable receipts and audit evidence.
- Post-switch rollback requires explicit rollback plan and signoff chain.
- Closed cutover plans must go through post-cutover correction handling, not silent rewinds.

## Verification

- Unit, integration, and e2e tests must cover:
  - mapping, import, and diff flow
  - cutover signoff chain
  - acceptance record creation
  - acceptance evidence export
  - validation blocking on unresolved issues
  - rollback planning and rollback completion
