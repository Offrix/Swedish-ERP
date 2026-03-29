# Support Case And Replay Verification

## Scope

Verify the Phase 17.1 operator chain for:
- masked support-case views
- masked incident views
- replay-operation lifecycle
- dead-letter triage bindings
- incident-backed replay approval and execution
- submission-monitor surfacing of replay/dead-letter state

## Targeted tests

- `node --test tests/unit/phase17-replay-operations.test.mjs`
- `node --test tests/integration/phase17-backoffice-ops-api.test.mjs`
- `node --test tests/unit/phase14-security.test.mjs`

## Manual operator flow

1. Open a support case through `/v1/backoffice/support-cases`.
2. Confirm requester and related object refs are masked in both create and list responses.
3. Dead-letter a runtime job with `replayAllowed=true`.
4. Create or reuse an active incident that references the dead letter or submission.
5. Plan replay through `/v1/backoffice/jobs/:jobId/replay` with `incidentId` or `supportCaseId`.
6. Confirm response contains:
   - `replayPlan`
   - `replayOperation`
   - triaged dead-letter state
7. Confirm `/v1/backoffice/replays` shows the replay operation as a first-class row with linked job and dead letter.
8. Approve replay through `/v1/backoffice/replays/:replayPlanId/approve`.
9. Confirm replay operation records approver and approved timestamp.
10. Execute replay through `/v1/backoffice/replays/:replayPlanId/execute`.
11. Confirm replay operation records replay job, scheduled state and resolved dead-letter operator state.
12. Confirm `/v1/backoffice/submissions/monitor` carries replay/dead-letter linkage for submission-linked failures.

## Acceptance

- No replay can be planned from backoffice without active support-case or incident binding.
- No replay approval can happen without first-class replay-operation linkage.
- Support and incident read views are masked by default.
- Submission monitoring exposes replay/dead-letter state without losing the canonical job or submission link.
- Replay and dead-letter actions remain audit-visible and deterministic.

## Full gate

- `node scripts/run-tests.mjs all`
- `node scripts/lint.mjs`
- `node scripts/typecheck.mjs`
- `node scripts/build.mjs`
- `node scripts/security-scan.mjs`
