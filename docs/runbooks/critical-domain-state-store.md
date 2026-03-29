> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Critical Domain State Store

## Purpose

Phase 2.1 moves production domain truth away from process-local `Map` state into restart-safe repository envelopes with explicit durability metadata.
The API platform now hydrates and persists aggregate envelopes for every stateful production domain in `API_PLATFORM_BUILD_ORDER`, excluding the stateless `automation` surface:

- `orgAuth`
- `tenantControl`
- `documents`
- `evidence`
- `observability`
- `accountingMethod`
- `fiscalYear`
- `legalForm`
- `ledger`
- `vat`
- `integrations`
- `ar`
- `ap`
- `banking`
- `payroll`
- `taxAccount`
- `reviewCenter`
- `notifications`
- `activity`
- `hr`
- `balances`
- `collectiveAgreements`
- `time`
- `benefits`
- `travel`
- `pension`
- `documentClassification`
- `importCases`
- `projects`
- `kalkyl`
- `reporting`
- `search`
- `core`
- `hus`
- `personalliggare`
- `id06`
- `field`
- `egenkontroll`
- `annualReporting`

## Runtime Modes

- `sqlite_critical_domain_state_store`
  Use for durable restart-safe repository truth.
- `memory_critical_domain_state_store`
  Use only in non-durable local and test flows where restart safety is not required. This mode still uses repository envelopes, but diagnostics must continue to flag it as non-durable.

Only non-memory critical-domain stores count as `repository_envelope` truth in runtime diagnostics. Memory mode reports `in_memory_repository_envelope` and must still raise `map_only_critical_truth`.

## Persistence Contract

Each durable domain must expose either:

- `exportDurableState()`
- `importDurableState(snapshot)`

or an internal hidden `__durableState` object that the API platform can serialize and rehydrate through the canonical snapshot adapter.

The API platform hydrates the domain immediately after creation and persists after every successful mutating method. Persisted envelopes carry:

- `domainKey`
- `schemaVersion`
- `snapshotJson`
- `snapshotHash`
- `persistedAt`
- `objectVersion`
- `durabilityPolicy`
- `adapterKind`

Current phase 2.1 still detects mutating methods heuristically. That remains temporary and is removed in phase 2.2 when command journal and atomic commit path become canonical.

## Storage

SQLite-backed state is stored in table:

- `critical_domain_state_snapshots`

Columns:

- `domain_key`
- `schema_version`
- `snapshot_json`
- `snapshot_hash`
- `persisted_at`
- `object_version`
- `durability_policy`
- `adapter_kind`

## Startup Verification

1. Start the platform in the target runtime mode.
2. Call `/v1/system/invariants`.
3. Verify `map_only_critical_truth` is absent only when durable sqlite-backed repository storage is configured.
4. Verify `listCriticalDomainDurability()` returns every stateful production domain except `automation`.
5. Verify every returned domain reports:
   - `truthMode = repository_envelope` for sqlite-backed runs
   - `truthMode = in_memory_repository_envelope` for memory-backed runs
   - monotonically increasing `objectVersion`
   - non-empty `snapshotHash`
   - explicit `durabilityPolicy`
   - explicit `adapterKind`

## Restart Drill

1. Start platform with `ERP_CRITICAL_DOMAIN_STATE_STORE=sqlite` or explicit platform sqlite configuration.
2. Create or mutate at least one object in multiple durable domains, including at least:
   - `orgAuth`
   - `reviewCenter`
   - `annualReporting`
3. Stop the API or worker cleanly so the state store closes.
4. Restart with the same SQLite path.
5. Re-read the objects and verify the same business identifiers and payload are present.
6. Verify `objectVersion` increased only on actual mutations and not on restart hydration.

## Shutdown

The API and worker runtimes must call `closeCriticalDomainStateStore()` on shutdown.
This prevents file-handle leakage and keeps restart drills deterministic.

## Failure Handling

- If a stateful production domain lacks both an explicit durability adapter and a hidden `__durableState`, startup must fail fast.
- If the SQLite file is missing, a new store is initialized and domains start empty.
- If snapshot hydration fails, startup should be treated as a durability incident and blocked from protected go-live paths until corrected.
- If persisted `expectedObjectVersion` and current `objectVersion` conflict, treat the write as an optimistic concurrency incident and retry only through the canonical command path.
- If a save fails after in-memory mutation, the platform must restore the pre-mutation snapshot before surfacing the error.

## Phase 2.1 Exit Evidence

Phase 2.1 is only complete when all of the following are true:

- every stateful production domain is wrapped by the critical-domain persistence layer
- durable restart tests pass
- runtime diagnostics clear `map_only_critical_truth` only for durable sqlite-backed repository stores
- API and worker shutdown close the critical-domain state store
- repository envelopes expose `objectVersion`, `durabilityPolicy` and `adapterKind`
- failed aggregate saves restore pre-mutation state
- this runbook exists and matches runtime behavior

