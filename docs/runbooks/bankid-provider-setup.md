# BankID Provider Setup

## Scope

This runbook governs the broker-backed BankID and enterprise federation setup used by auth phase 6.1.

## Broker model

- BankID traffic must go through the auth broker.
- v1 BankID provider is Signicat-backed.
- Enterprise federation must go through the federation broker adapter.
- Local TOTP and passkeys remain first-party factors in `auth-core`.

## Mode isolation

- `production` runtime mode must use production broker credentials and production callback domains.
- All non-production runtime modes must use sandbox credentials, sandbox callback domains and sandbox test identities.
- Sandbox completion tokens and federation authorization codes must never be available in production mode.
- `GET /v1/auth/providers/isolation` must show the active provider profile, callback domain and mode-specific test identity catalog before a mode is approved.
- Production start of BankID or federation must be blocked until auth inventory contains the required managed secret types and a matching callback secret for the active provider/mode.
- Callback secrets must match the provider-specific callback domain and callback path for the active mode; mismatched callback domains are a go-live blocker.

## Baseline pinning

- BankID challenges must pin `SE-BANKID-RP-API`.
- Federation challenges must pin `SE-ENTERPRISE-FEDERATION-BROKER`.
- Audit, challenge payloads and receipts must keep provider baseline id, code, version and checksum.

## Operational checks

- Verify sandbox `providerMode` before enabling test flows.
- Verify production and sandbox callback URLs are separated.
- Verify broker secrets are rotated independently per mode.
- Verify backoffice can inspect challenge ids, provider refs and audit trails without exposing secrets.
