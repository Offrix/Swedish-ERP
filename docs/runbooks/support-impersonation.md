# Support Impersonation

## Purpose

Operate time-limited support impersonation sessions without bypassing tenant permissions, dual-control, or audit requirements.

## Preconditions

- Active support case exists and is scoped to the affected company.
- Read-only impersonation has approved `impersonation_read_only`.
- Limited-write impersonation has approved `impersonation_read_only` and `impersonation_limited_write` from two distinct approvers.
- Operator is authenticated with strong MFA.

## Flow

1. Create impersonation request with target company user, purpose code, mode, expiry, and restricted action allowlist when mode is `limited_write`.
2. Separate approver approves request.
3. Operator starts the approved session.
4. Verify session watermark:
   - `SUPPORT-IMPERSONATION`
   - support case reference
   - target company user reference
   - expiry timestamp
5. Perform allowed support work only.
6. End the session with explicit reason code.
7. Export evidence bundle if the case requires audit export.

## Guardrails

- Read-only mode cannot carry restricted write actions.
- Limited-write mode must define explicit restricted actions.
- Expired sessions cannot be started.
- Requester cannot self-approve.
- No session may continue past `expiresAt`.

## Verification

- Unit and integration tests must cover:
  - self-approval denial
  - dual approval for limited-write
  - watermark presence
  - expiry denial on start
  - termination audit trail
