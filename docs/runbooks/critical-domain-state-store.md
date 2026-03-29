> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Critical Domain State Store

## Purpose

Phase 2.4 moves critical domain truth away from process-local `Map` state into a restart-safe persistence layer.
The API platform now hydrates and persists critical-domain snapshots for:

- `orgAuth`
- `ledger`
- `vat`
- `ar`
- `ap`
- `payroll`
- `taxAccount`
- `reviewCenter`
- `projects`
- `integrations`

## Runtime Modes

- `sqlite_critical_domain_state_store`
  Use for durable restart-safe critical-domain truth.
- `memory_critical_domain_state_store`
  Use only in non-durable local and test flows where restart safety is not required.

Only non-memory critical-domain stores count as `durable_snapshot` truth in runtime diagnostics.

## Persistence Contract

Each critical domain must expose:

- `exportDurableState()`
- `importDurableState(snapshot)`
- `getCriticalDomainDurability()`
- `flushDurableState()`

The API platform hydrates the domain immediately after creation and persists after every successful mutating method.
Read-only methods do not trigger persistence writes.

## Storage

SQLite-backed state is stored in table:

- `critical_domain_state_snapshots`

Columns:

- `domain_key`
- `schema_version`
- `snapshot_json`
- `snapshot_hash`
- `persisted_at`

## Startup Verification

1. Start the platform in the target runtime mode.
2. Call `/v1/system/invariants`.
3. Verify `map_only_critical_truth` is absent when durable critical-domain storage is configured.
4. Verify `getCriticalDomainDurability()` returns `durable_snapshot` for every critical domain.

## Restart Drill

1. Start platform with `ERP_CRITICAL_DOMAIN_STATE_STORE=sqlite` or explicit platform sqlite configuration.
2. Create or mutate at least one object in a critical domain.
3. Stop the API or worker cleanly so the state store closes.
4. Restart with the same SQLite path.
5. Re-read the object and verify the same business identifiers and payload are present.

## Shutdown

The API and worker runtimes must call `closeCriticalDomainStateStore()` on shutdown.
This prevents file-handle leakage and keeps restart drills deterministic.

## Failure Handling

- If a critical domain lacks `exportDurableState()` or `importDurableState(snapshot)`, it is treated as non-durable and remains subject to `map_only_critical_truth`.
- If the SQLite file is missing, a new store is initialized and domains start empty.
- If snapshot hydration fails, startup should be treated as a durability incident and blocked from protected go-live paths until corrected.

## Phase 2.4 Exit Evidence

Phase 2.4 is only complete when all of the following are true:

- every critical domain is wrapped by the critical-domain persistence layer
- durable restart tests pass
- runtime diagnostics clear `map_only_critical_truth` only for durable critical-domain stores
- API and worker shutdown close the critical-domain state store
- this runbook exists and matches runtime behavior

