# Migration Cutover Concierge

## Purpose

Run the guided migration concierge without direct database access. This runbook covers source extract verification, rehearsal capture, automated variance generation, rollback drill linkage and signoff evidence export.

## Preconditions

- A cutover plan exists.
- Source mappings and import batches are already in the migration cockpit.
- Restore drill runtime is available in the same company scope.
- Operator has `company.manage` with strong MFA.

## Procedure

1. Create or open the cutover plan in `/v1/migration/cutover-plans`.
2. Complete every item in `/v1/migration/cutover-plans/:cutoverPlanId/source-extract-checklist/:itemCode`.
3. Record at least one rehearsal in `/v1/migration/cutover-plans/:cutoverPlanId/rehearsals`.
4. Generate the automated variance report in `/v1/migration/cutover-plans/:cutoverPlanId/variance-report`.
5. Link a passed restore drill through `/v1/migration/cutover-plans/:cutoverPlanId/rollback-drill`.
6. Complete the signoff chain and mandatory go-live checklist items.
7. Export immutable signoff evidence from `/v1/migration/cutover-plans/:cutoverPlanId/signoff-evidence`.
8. Verify the concierge snapshot in `/v1/migration/cutover-plans/:cutoverPlanId/concierge`.
9. Verify cockpit and mission control show the same state.

## Required checks

- Source extract checklist has no pending or blocked mandatory items.
- Latest rehearsal is not blocked.
- Automated variance report is `accepted`.
- Rollback drill is linked to a passed restore drill.
- Signoff evidence bundle is frozen.
- Cutover cockpit row carries concierge stage, variance status and rollback drill status.

## Failure handling

- If source extract is incomplete: block cutover and reopen extraction with corrected source refs.
- If rehearsal is blocked: rerun rehearsal after diff or mapping remediation.
- If variance report is blocking: resolve diff reports or pending parallel runs before continuing.
- If rollback drill is missing or failed: do not proceed to validation or switch.
- If signoff evidence cannot be frozen: treat the cutover plan as not ready.

## Evidence

- Concierge snapshot from `/v1/migration/cutover-plans/:cutoverPlanId/concierge`
- Frozen signoff evidence bundle from `/v1/migration/cutover-plans/:cutoverPlanId/signoff-evidence`
- Migration cockpit row from `/v1/migration/cockpit`
- Cutover control mission control dashboard
