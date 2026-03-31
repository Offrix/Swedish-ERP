# Break-Glass

## Purpose

Operate emergency incident access through time-limited, dual-approved, incident-bound, allowlisted break-glass sessions.

## Preconditions

- Runtime incident exists.
- Requested actions are explicitly allowlisted by technical policy.
- Two distinct approvers are available.
- Operator is authenticated with strong MFA.
- Default support and backoffice views remain masked until the session is active.

## Flow

1. Request break-glass with incident id, purpose code, requested actions, and expiry.
2. Verify requested actions are members of the technical break-glass allowlist.
3. First approver records approval.
4. Second distinct approver moves the session to `dual_approved`.
5. Operator starts the session.
6. Verify session watermark:
   - `BREAK-GLASS`
   - incident reference
   - expiry timestamp
   - allowlist policy code
7. Perform only the requested emergency actions.
8. End the session with explicit reason code.
9. Reference the ended session in incident post-review.
10. Export the break-glass evidence bundle through `GET /v1/backoffice/break-glass/:breakGlassId/evidence?companyId=...` when audit or post-review requires it.

## Guardrails

- Requester cannot self-approve.
- Break-glass cannot start before dual approval.
- Actions outside the break-glass allowlist are rejected.
- Default list and detail views stay masked before activation and after closure.
- Expired sessions cannot be started and auto-end on expiry.
- Break-glass never grants database access.
- Incident post-review must cover every linked break-glass session.

## Verification

- Unit and integration tests must cover:
  - self-approval denial
  - dual-approval transition
  - invalid action rejection against the allowlist
  - masked default views before activation
  - explicit activation step
  - watermark presence
  - ended-session post-review linkage
  - evidence export for audit and post-review
