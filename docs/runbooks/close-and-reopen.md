# Close And Reopen

## Purpose

This runbook is the binding operator procedure for phase `7.7` close, hard-close and reopen handling.
It defines how a period is prepared, signed off, hard-closed, reopened and relocked with correct actor attribution, evidence and sign-off chain.

## Scope

- close checklist workbench
- blocker and override handling
- sign-off chain
- hard-close ledger lock
- reopen requests
- close adjustments
- relock flow

## Preconditions

- target company has active fiscal year, accounting period and ledger chart
- close checklist exists for the target accounting period
- mandatory checklist steps are completed
- required reconciliation runs and report snapshots are attached
- sign-off chain contains at least two distinct signatories before hard close

## Hard Close Procedure

1. Open the close workbench for the target accounting period.
2. Resolve or explicitly waive all blockers.
3. Complete all mandatory checklist steps with reconciliation ids or evidence refs.
4. Record sign-offs in sequence through `POST /v1/close/checklists/:checklistId/signoff`.
5. Verify the final sign-off returns:
   - `status=closed`
   - `closeState=hard_closed`
   - `closedByUserId`
   - `closedByCompanyUserId`
   - `hardCloseEvidenceRef`
6. Verify the linked accounting period now carries:
   - `status=hard_closed`
   - `lockedByActorId` equal to the final signatory
   - `lockApprovalMode=close_signoff_chain`
   - non-empty `lockApprovalActorIds`
   - non-empty `lockApprovalEvidenceRef`

## Reopen Procedure

1. Create reopen request with:
   - `reasonCode`
   - `impactSummary`
   - structured `impactAnalysis`
   - `approvedByCompanyUserId`
2. Verify reopen returns:
   - executed reopen request
   - superseded checklist
   - successor checklist
3. Confirm the accounting period is reopened with the requester as `reopenedByActorId`.
4. Record required close adjustments before relock.
5. Relock through `POST /v1/close/reopen-requests/:reopenRequestId/relock`.

## Dual-Control Rules

- hard close requires at least two distinct signatories
- reopen requester and approver must be different people
- blocker overrides require senior finance role
- close adjustments require approval actor separate from requester where the API demands it

## Verification Checklist

1. Hard close cannot complete with only one signatory.
2. Final signatory becomes the period lock actor.
3. Hard-close lock carries sign-off-chain evidence reference.
4. Reopen produces immutable evidence and successor checklist version.
5. Relock returns the period to the target lock state without deleting reopen history.

## Required Tests

- `node --test tests/unit/core-phase11-3.test.mjs`
- `node --test tests/integration/phase11-close-api.test.mjs`
- `node scripts/run-tests.mjs all`

## Exit Gate

Phase `7.7` is green only when:

- hard close is attributed to the actual final signatory
- ledger lock carries sign-off-chain attribution and evidence
- single-signatory hard close is rejected
- reopen and relock preserve evidence, signoffs and successor checklist lineage
