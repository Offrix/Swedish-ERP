# Support Impersonation

## Purpose

Operate time-limited support impersonation sessions without bypassing tenant permissions, two-person approval, masking defaults, or audit requirements.

## Preconditions

- Active support case exists and is scoped to the affected company.
- Read-only impersonation has approved `impersonation_read_only`.
- Limited-write impersonation has approved `impersonation_read_only` and `impersonation_limited_write` from two distinct approvers.
- Operator is authenticated with strong MFA.
- Default backoffice views remain masked until an approved impersonation session is active.

## Flow

1. Create impersonation request with target company user, purpose code, mode, expiry, and restricted action allowlist when mode is `limited_write`.
2. Verify requested restricted actions are members of the technical support allowlist policy.
3. Separate approver approves request.
4. Operator starts the approved session.
5. Verify session watermark:
   - `SUPPORT-IMPERSONATION`
   - support case reference
   - masked target company user reference
   - expiry timestamp
   - allowlist policy code
6. Perform only the approved support work. Limited-write mode may execute only allowlisted actions.
7. End the session with explicit reason code.
8. Export the audit bundle through `GET /v1/backoffice/impersonations/:sessionId/evidence?companyId=...`.
9. Export the parent support case bundle through `GET /v1/backoffice/support-cases/:supportCaseId/evidence?companyId=...` when the operator chain must be archived as one case package.

## Guardrails

- Read-only mode cannot carry restricted write actions.
- Limited-write mode must define explicit restricted actions.
- Restricted actions outside the support allowlist are rejected.
- Default list and detail views stay masked before activation and after termination.
- Requester cannot self-approve.
- Expired sessions cannot be started.
- No session may continue past `expiresAt`.

## Verification

- Unit and integration tests must cover:
  - self-approval denial
  - dual approval for limited-write
  - masked default views before activation
  - allowlist rejection for unsupported restricted actions
  - watermark presence
  - expiry denial on start
  - termination audit trail
  - evidence export for impersonation and parent support case
