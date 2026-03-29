# Transaction Boundary

This runbook governs operational verification of command journal, outbox publication lag, projection rebuild gates and replay readiness before go-live or destructive recovery work.

## Required runtime surfaces

- `GET /v1/ops/transaction-boundary?companyId=...`
- `GET /v1/ops/observability?companyId=...`
- `GET /v1/search/projection-checkpoints?companyId=...`

## Operator procedure

1. Read `/v1/ops/transaction-boundary`.
2. Confirm `commitLag.summary.lagState === "healthy"` before regulated cutover or replay.
3. If any domain shows `unpublishedCount > 0`, inspect the oldest unpublished age and resolve the blocked outbox path before proceeding.
4. Review `projectionRebuildGates.items` and block release if any item is `warning` or `blocking`.
5. Re-run `/v1/ops/observability` and confirm `laggingCommitBoundaryCount === 0`.

## Blocking conditions

- Any `commitLag.summary.lagState` other than `healthy`.
- Any `deadLetteredOutboxCount > 0`.
- Any projection rebuild gate in `warning` or `blocking`.
- Missing checkpoint sequence for a required projection.

## Evidence

- transaction boundary snapshot
- projection rebuild gate snapshot
- operator note showing the lag window was clean before release, replay or cutover

## Exit criteria

- no lagging domains
- no unpublished or dead-lettered outbox backlog in the targeted scope
- all required projection gates healthy
