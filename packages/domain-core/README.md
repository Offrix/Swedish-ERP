# @swedish-erp/domain-core

Shared domain primitives, value objects and cross-cutting workflow engines used by the modular monolith.

## Phase 11.2 scope

- bureau portfolio memberships with consultant scope and client-status materialization
- client requests with deadline derivation, reminder profile binding and tracked external responses
- approval packages with snapshot references, named approver enforcement and supersede handling
- work items and comment-driven assignments for bureau collaboration
- selective mass actions with per-client results and audit-friendly outcomes

## Phase 11.3 scope

- close checklist instantiation per bureau client and accounting period
- mandatory step coverage for bank, AR, AP, VAT, suspense, manual journals, document queue and report backup
- hard-stop and critical blocker handling with senior-finance override
- snapshot-bound sign-off chains that lead to hard close
- reopen requests that supersede prior sign-offs and create successor checklist versions
