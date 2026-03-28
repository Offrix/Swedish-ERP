# FAS 14.5 Verification

## Goal

Verify that field/service/work-order behavior now runs on a canonical `OperationalCase` layer, with work orders as an optional pack and with first-class reservations, evidence and conflict gating.

## Required checks

1. Operational cases can be created without the `work_order` pack and do not leak into `/v1/field/work-orders`.
2. Work-order pack cases still support dispatch, material usage, signatures, completion and invoice creation.
3. Material reservations are first-class objects and reduce reserved inventory without silently auto-invoicing.
4. Field evidence is materialized for material usage, signature capture and sync results.
5. Offline conflicts become first-class conflict records.
6. Open conflicts block invoice readiness until explicitly resolved.
7. Field control read models remain denied to ordinary field users.

## Verification commands

```powershell
node --test --test-isolation=none tests/unit/field-phase10-2.test.mjs
node --test --test-isolation=none tests/integration/phase10-field-api.test.mjs
node --test --test-isolation=none tests/e2e/phase10-field-flow.test.mjs
node --test --test-isolation=none tests/unit/phase14-field-operational-pack.test.mjs
node --test --test-isolation=none tests/integration/phase14-field-operational-pack-api.test.mjs
node --test --test-isolation=none tests/integration/api-route-metadata.test.mjs
node --test --test-isolation=none tests/integration/phase14-surface-access-matrix-api.test.mjs
```

## Expected outcomes

- `OperationalCase`, `MaterialReservation`, `MaterialUsage`, `FieldEvidence`, `SignatureRecord`, `SyncEnvelope` and `ConflictRecord` are all visible in runtime/API behavior.
- `FIELD_OFFLINE_POLICIES` does not use `server_wins` for regulated or costed field objects.
- `POST /v1/field/work-orders/:workOrderId/invoice` returns `409 field_operational_case_open_conflicts` while unresolved conflicts exist.
- `POST /v1/field/operational-cases/:operationalCaseId/conflicts/:conflictRecordId/resolve` clears the blocker and allows invoicing to proceed.
- Root route metadata exposes the canonical operational-case routes and route contracts.
