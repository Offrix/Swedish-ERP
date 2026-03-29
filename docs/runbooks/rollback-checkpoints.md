# Rollback Checkpoints

This runbook governs creation, sealing, usage and expiry of rollback checkpoints before destructive imports, cutover, replay windows and other high-risk runtime operations.

## Required runtime surfaces

- `GET /v1/backoffice/checkpoints?companyId=...`
- `POST /v1/backoffice/checkpoints`
- `POST /v1/backoffice/checkpoints/:rollbackCheckpointId/seal`
- `POST /v1/backoffice/checkpoints/:rollbackCheckpointId/use`
- `POST /v1/backoffice/checkpoints/:rollbackCheckpointId/expire`

## Operator procedure

1. Create a checkpoint with snapshot references before the destructive action.
2. Seal the checkpoint after validating snapshot references and scope.
3. For regulated scopes, provide a separate approver before usage.
4. Use the checkpoint only through the checkpoint route, never by ad hoc notes or database edits.
5. Expire stale checkpoints when the protected action window has closed.

## Regulated scope rule

Scopes containing regulated finance, submissions, payroll, tax, HUS, annual reporting or migration cutover require dual review on usage.

## Evidence

- checkpoint snapshot references
- seal summary
- usage summary
- approver ids for regulated scope usage
- expiry reason when a checkpoint is retired unused

## Exit criteria

- every destructive operation has a sealed checkpoint
- regulated checkpoint usage has dual review
- no stale open checkpoints remain before go-live
