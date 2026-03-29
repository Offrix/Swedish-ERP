# Replay And Dead Letter

This runbook governs controlled replay drills and production replay operations. No replay or dead-letter handling may happen through direct database edits.

## Required runtime surfaces

- `GET /v1/backoffice/dead-letters?companyId=...`
- `GET /v1/backoffice/replays?companyId=...`
- `GET /v1/backoffice/replay-drills?companyId=...`
- `POST /v1/backoffice/replay-drills`
- `POST /v1/backoffice/replay-drills/:replayDrillId/start`
- `POST /v1/backoffice/replay-drills/:replayDrillId/complete`

## Replay drill procedure

1. Select a representative dead-letter or replay target scope.
2. Record a replay drill with expected outcome and target reference.
3. Start the drill when the operator window opens.
4. Execute the controlled replay flow through the existing replay operation path.
5. Complete the drill with `passed` or `failed` and attach evidence.
6. Confirm `GET /v1/backoffice/replay-drills` reports a passed latest drill and `coverageMissing === false`.

## Blocking conditions

- replay performed without recorded drill or replay operation
- drill completed without verification summary
- drill fails idempotency, evidence completeness or recovery expectations

## Evidence

- replay drill record
- linked replay plan or dead-letter reference
- verification summary
- receipt or evidence reference from the replayed path

## Exit criteria

- latest replay drill in scope is passed
- replay remains deterministic and audit-visible
- dead-letter handling stays tool-driven, not manual
