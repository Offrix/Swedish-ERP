# @swedish-erp/auth-core

Authentication and authorization primitives for FAS 1.

## Scope

- Principal identity contract.
- Role and permission primitives.
- Server-side authorization decisions with explainable outcomes.
- Session token issuance and revocation helpers.
- TOTP utilities and MFA requirement helpers.
- Audit-actor mapping contract.

## Guardrails

- No domain-specific role logic here.
- No transport-specific auth implementation here.
- Authorization decisions must be explainable and auditable.
- Secrets and factor proofs are handled as credentials, not UI state.
