# Break-Glass

## Purpose

Operate emergency incident access through time-limited, dual-approved, allowlisted break-glass sessions.

## Preconditions

- Runtime incident exists.
- Requested actions are explicitly allowlisted.
- Two distinct approvers are available.
- Operator is authenticated with strong MFA.

## Flow

1. Request break-glass with incident id, purpose code, requested actions, and expiry.
2. First approver records approval.
3. Second distinct approver moves the session to `dual_approved`.
4. Operator starts the session.
5. Verify session watermark:
   - `BREAK-GLASS`
   - incident reference
   - expiry timestamp
6. Perform only the requested emergency actions.
7. End the session with explicit reason code.
8. Reference the ended session in incident post-review.
9. Export the break-glass evidence bundle when audit or post-review requires it.

## Guardrails

- Requester cannot self-approve.
- Break-glass cannot start before dual approval.
- Expired sessions cannot be started and auto-end on expiry.
- Break-glass never grants database access.
- Incident post-review must cover every linked break-glass session.

## Verification

- Unit and integration tests must cover:
  - self-approval denial
  - dual-approval transition
  - explicit activation step
  - watermark presence
  - ended-session post-review linkage
