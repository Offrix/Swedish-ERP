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

## Phase 14.1 scope

- support cases with policy-bound actions and diagnostics
- audit explorer, access reviews and SoD finding decisions
- impersonation requests with approval and termination trail
- break-glass requests with dual control and ordered close

## Phase 14.2 scope

- feature flags with owner, risk class, scope and sunset metadata
- emergency disables and runtime resolution
- load profiles with target and observed recovery metrics
- restore drills and chaos scenarios with evidence

## Phase 14.3 scope

- mapping sets and approval flow per source system
- import batches, manual migration corrections and diff reports
- cutover plans with staged go-live, stabilization and rollback
- migration cockpit projection with append-only evidence

## Phase 2.1 scope

- canonical repository contracts for mutable core-domain objects
- optimistic concurrency with expected object version on updates and deletes
- transaction-bound repository operations for future command-receipt/outbox work
- Postgres-backed repository store for durable core-domain persistence primitives

## Phase 2.2 scope

- command receipts with command id, idempotency key, expected object version, actor and session revision
- outbox events linked to accepted command receipts in the same transaction boundary
- inbox message deduplication and processing state for downstream/provider receipts
- deterministic command mutation runtime that suppresses duplicates and rolls back atomically
