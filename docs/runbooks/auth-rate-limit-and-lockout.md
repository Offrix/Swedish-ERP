# Auth Rate Limit And Lockout

## Scope

This runbook governs login-start throttling and TOTP lockout in the phase 6 auth runtime.

## Login-start guardrails

- `POST /v1/auth/login` must refuse additional pending logins when the same account already has three live pending sessions.
- Repeated unresolved login starts for the same `companyId + email` must trigger a temporary lockout.
- A temporary login lockout is a hard denial and must return `429`.
- Lockout evidence must be visible in auth audit with scope `login_identifier`.

## TOTP guardrails

- Invalid TOTP verification attempts must be counted per enrolled factor.
- Repeated invalid TOTP codes must trigger a temporary lockout and return `429`.
- When TOTP lockout is triggered, the attacked pending session must be revoked immediately.
- After the lockout window expires, a fresh login with a valid TOTP code must succeed again.

## Verification

- Verify three pending login starts succeed and the fourth is blocked with `login_rate_limited`.
- Verify repeated unresolved login starts end in `login_temporarily_locked`.
- Verify repeated invalid TOTP codes end in `totp_temporarily_locked`.
- Verify the attacked session is revoked when TOTP lockout triggers.
- Verify auth audit contains blocked/denied records for both login-start and TOTP guardrails.
