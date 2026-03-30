# Phase 3.5 Security Risk Controls Verification

## Purpose

Verify that bank-grade risk controls for auth, exports, provider callbacks and privileged support actions are live, durable and restart-safe.

## Preconditions

- `Phase 3.2` secret runtime is active with external KMS/HSM posture.
- `Phase 3.4` edge controls are enabled.
- Test/demo company has seeded admin and approver identities.
- Verification is executed in a non-production environment before protected-mode rollout.

## Required Scenarios

1. Login IP spike
   - Send repeated unresolved login attempts from the same IP.
   - Verify the next request is blocked with `login_ip_temporarily_locked`.
   - Verify central alert `auth_login_ip_spike` is recorded with the triggering IP.
2. TOTP challenge-complete IP forwarding
   - Create a TOTP challenge.
   - Complete it with an invalid code through `/v1/auth/challenges/:challengeId/complete`.
   - Verify `auth_totp_account_failures` stores the real client IP, not `unknown`.
3. Passkey enrollment step-up budget
   - Establish fresh strong MFA for `identity_device_trust_manage`.
   - Request passkey registration options three times.
   - Verify the fourth request is blocked with `passkey_step_up_required`.
4. BankID open initiation limit
   - Start BankID repeatedly without completion on the same account.
   - Verify the sixth concurrent open initiation is blocked with `bankid_open_initiation_limit_reached`.
5. Export mass control
   - Materialize a reporting snapshot.
   - Request export jobs until the actor budget is exhausted.
   - Verify `report_export_rate_limited` and alert `report_export_mass_request`.
6. Support access budgets
   - Create repeated impersonation requests from the same operator.
   - Verify `impersonation_rate_limited` and alert `support_impersonation_request_spike`.
7. Break-glass per-incident open request limit
   - Open two break-glass requests against the same incident.
   - Verify the third request is blocked with `break_glass_open_request_limit_reached`.
8. Provider callback spike anomaly
   - Force edge throttling on federation callback or OCR/provider callback routes.
   - Verify central alert `provider_callback_spike` with the route profile and IP.

## Evidence To Capture

- blocked response payloads and status codes
- security alerts from `securityRuntime`
- risk summaries for the affected subject keys
- audit entries for auth, support and break-glass actions
- proof that state survives restart and is not rolled back on intentional reject

## Required Test Commands

```powershell
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase3-security-risk-runtime.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase3-security-risk-api.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase3-api-edge-hardening.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase6-auth-hardening-api.test.mjs
```

## Exit Criteria

- every scenario above passes
- alerts and risk summaries persist after intentional security rejection
- no auth or support path falls back to `unknown` IP when the request carried a forwarded client address
- no blocked path mutates secrets or snapshots incorrectly
