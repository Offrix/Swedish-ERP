# Security Data Classification

## Purpose

This runbook verifies the canonical `S0` to `S5` security classification inventory required by phase `3.1`.

## Scope

- central security class catalog
- field classification registry
- auth factor and auth challenge secret envelopes
- managed secrets, callback secrets and certificate chains
- integration credential metadata
- snapshot class mask validation

## Verification Steps

1. Confirm the runtime exposes the classification catalog:
   - `GET /v1/security/classes?companyId=<companyId>`
2. Verify the catalog returns canonical classes `S0`, `S1`, `S2`, `S3`, `S4`, `S5`.
3. Verify field classifications include at least:
   - `managed_secret.current_secret_ref -> S4`
   - `certificate_chain.private_key_secret_ref -> S5`
   - `auth_identity_mode.credential_secret_ref -> S4`
   - `integration.secret_manager_ref -> S4`
4. Verify inventory summary returns counts for:
   - managed secrets
   - callback secrets
   - certificate chains
   - auth factor secrets
   - auth challenge secrets
   - integration credential sets
5. Verify auth isolation catalogs expose:
   - `credentialSecretClassCode = S4`
   - `webhookSecretClassCode = S4`
6. Verify snapshot artifact creation rejects non-canonical class codes.
7. Verify masked routes remain read-only for non-backoffice actors.

## Required Tests

- `node --test tests/unit/phase3-security-classification.test.mjs`
- `node --test tests/integration/phase3-security-classification-api.test.mjs`
- `node --test tests/unit/phase3-secret-rotation.test.mjs`
- `node --test tests/integration/phase3-secret-rotation-api.test.mjs`
- `node --test tests/integration/api-route-metadata.test.mjs`

## Exit Gate

Phase `3.1` is green only when:

- the runtime classification catalog is available
- all secret-bearing inventories carry explicit class codes
- integration credentials are included in the catalog
- auth identity mode catalogs expose secret class codes
- snapshot artifacts reject unknown class masks
- route metadata includes the security classification endpoint
