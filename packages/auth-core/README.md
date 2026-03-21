# @swedish-erp/auth-core

Phase 0 foundation for authentication, authorization and identity context.

## Scope

- Principal identity contract.
- Role and permission primitives.
- Signed auth context shape passed to domain and integration layers.
- Audit-actor mapping contract.

## Guardrails

- No domain-specific role logic here.
- No transport-specific auth implementation here.
- Authorization decisions must be explainable and auditable.

