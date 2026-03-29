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

## Passkey guardrails

- Invalid passkey assertions must be counted per enrolled passkey factor.
- Repeated invalid passkey assertions must trigger a temporary lockout and return `429`.
- When passkey lockout is triggered, the attacked pending session must be revoked immediately.
- After the lockout window expires, a fresh login with a valid passkey assertion must succeed again.

## Broker challenge guardrails

- Invalid BankID collect completion attempts must be counted per pending BankID challenge.
- Invalid federation callback completions must be counted per pending federation request.
- Repeated invalid broker completion attempts must trigger a temporary lockout and return `429`.
- When broker challenge lockout is triggered, the attacked pending session must be revoked immediately.

## Secret handling

- TOTP plaintext must never be present in exported durable auth factor state.
- Durable auth factor objects may carry refs only; sealed secret envelopes carry encrypted factor secrets separately.
- Durable auth-broker exports must never contain raw BankID completion tokens, QR secrets, WorkOS state values or federation authorization codes.
- Restore/import must preserve factor usability without reintroducing plaintext into exported state.
- Restore/import must preserve BankID collect and federation callback completion without reintroducing raw broker secrets.

## Verification

- Verify three pending login starts succeed and the fourth is blocked with `login_rate_limited`.
- Verify repeated unresolved login starts end in `login_temporarily_locked`.
- Verify repeated invalid TOTP codes end in `totp_temporarily_locked`.
- Verify repeated invalid passkey assertions end in `passkey_temporarily_locked`.
- Verify repeated invalid BankID collect attempts end in `bankid_temporarily_locked`.
- Verify repeated invalid federation callback attempts end in `federation_temporarily_locked`.
- Verify the attacked session is revoked when TOTP lockout triggers.
- Verify the attacked session is revoked when passkey lockout triggers.
- Verify the attacked session is revoked when BankID or federation broker lockout triggers.
- Verify auth audit contains blocked/denied records for both login-start and TOTP guardrails.
- Verify auth audit contains blocked/denied records for passkey guardrails.
- Verify auth audit contains blocked/denied records for broker challenge guardrails.
- Verify exported durable state does not contain raw TOTP secrets.
- Verify exported durable state does not contain raw BankID or federation broker challenge secrets.
