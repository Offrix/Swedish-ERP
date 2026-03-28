# Payroll Correction And AGI Replay

## Purpose

This runbook verifies Phase 12.3 runtime guarantees for payroll corrections and AGI version handling:

- pay-run calculation order is deterministic
- posting intent and bank payment previews have stable snapshot hashes
- AGI versions become immutable after `ready_for_sign`
- corrections create a new AGI version instead of mutating the submitted one

## Preconditions

- payroll bootstrap is loaded for the target tenant
- tax decision snapshots are available for the affected employments
- prior-period pay run exists when testing retro corrections

## Verification Steps

1. Create two equivalent pay runs with the same semantic manual inputs in different input order.
2. Verify `postingIntentSnapshotHash` and `bankPaymentSnapshotHash` are identical.
3. Create and validate an AGI submission for the reporting period.
4. Move the submission to `ready_for_sign`.
5. Verify a new validate attempt returns `agi_version_immutable`.
6. Submit the AGI version and verify it remains immutable.
7. Create a correction pay run for the same reporting period.
8. Approve the correction pay run and create an AGI correction version.
9. Verify the original AGI version remains immutable and the new correction draft can be validated independently.

## Expected Results

- preview hashes are deterministic for equivalent calculation inputs
- AGI version `1` is never edited after `ready_for_sign`
- correction creates version `2` with its own validation lifecycle
- changed employee tracking stays attached to the correction version

## Evidence

- unit test: `tests/unit/phase12-payrun-engine-agi-immutability.test.mjs`
- integration test: `tests/integration/phase8-payroll-tax-agi-api.test.mjs`
- full payroll regression suite and full repository verification
