> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Projection Rebuild

## Purpose

Phase 2.5 requires read models to be purgeable and rebuildable without changing source-of-truth data.
The current rebuild control-plane is centered on search projections and their checkpoints.

## Core Rules

- Source-of-truth is never the search/read-model layer.
- Rebuilds may delete and recreate projection documents.
- Rebuilds must leave source domains untouched.
- Every rebuild must update a `ProjectionCheckpoint`.

## Rebuild Modes

- `delta`
  Re-index changed or missing projection documents and tombstone missing source objects.
- `full`
  Purge targeted projection documents first, then rebuild them from source-domain projection documents.

## Objects

- `SearchReindexRequest`
- `ProjectionCheckpoint`
- `SearchDocument`

## Operator Steps

1. Verify the target company and projection scope.
2. Inspect current checkpoints.
3. Choose `delta` for ordinary repair or `full` when the read model must be rebuilt from empty.
4. Start rebuild.
5. Wait for completion or inspect failed request.
6. Verify checkpoint status, document counts and sampled search results.

## Verification

After a successful rebuild:

- `ProjectionCheckpoint.status` must be `completed`
- `lastRequestId` must point at the finished rebuild request
- `lastRebuildMode` must match the requested mode
- `lastSourceHash` must be populated
- `lastDocumentCount` must reflect the active rebuilt projection rows

## Failure Handling

If rebuild fails:

- request status becomes `failed`
- checkpoint status becomes `failed`
- `lastErrorCode` and `lastErrorMessage` must be populated
- source-of-truth objects must remain unchanged
- retry must create a new `SearchReindexRequest`; the failed request remains immutable for audit and the next successful rebuild must clear checkpoint error fields instead of overwriting history

## Go-Live Gate

Phase 2.5 is not complete until:

- projection documents can be purged and rebuilt
- checkpoints exist per company and projection
- rebuild is available through API and worker/runtime
- tests prove parity after rebuild from empty read model
- retry after failed rebuild is verified and does not mutate source-of-truth

