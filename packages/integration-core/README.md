# @swedish-erp/integration-core

Phase 0 transport-neutral integration contracts for government submissions, Peppol and other adapters.

## Scope

- Port interfaces for submit/sync/fetch.
- Envelope and receipt contracts.
- Adapter status and retry metadata.

## Constraints

- Domain packages must depend on ports only.
- No protocol-specific assumptions in domain logic.

