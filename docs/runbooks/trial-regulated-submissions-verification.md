# Trial regulated submissions verification

## Scope

This runbook verifies the Phase 13.6 trial-safe regulated simulator path for AGI, VAT, HUS and annual/income-tax submissions.

## Preconditions

- Runtime mode or submission mode is `trial`.
- Trial tenant has `supportsLegalEffect=false`.
- Submission package is valid and signoff-complete where signoff is required.

## Verification steps

1. Create a regulated submission in `trial` mode without any manual `transportScenarioCode`, `simulatedTransportOutcome`, `simulatedReceiptType` or provider-status overrides.
2. Dispatch the submission through the normal API or worker path.
3. Verify that transport goes through the canonical regulated submission engine, not a live adapter shortcut.
4. Verify that the first receipt is a synthetic technical receipt with:
   - `legalEffect=false`
   - `watermarkCode=TRIAL`
   - non-live simulation metadata
5. Verify that deterministic follow-up receipts are produced automatically from the simulator profile:
   - AGI/VAT/HUS: technical + material receipt
   - annual/income-tax: technical + material + final receipt
6. Verify that all attempts, receipts, reconciliation summaries and evidence packs carry trial-safe metadata:
   - `legalEffect=false`
   - `watermarkCode=TRIAL`
   - simulation profile code
7. Verify that manual scenario overrides are blocked in trial:
   - submit override -> `submission_trial_scenario_override_forbidden`
   - direct receipt override -> `submission_trial_receipt_override_forbidden`
8. Verify that evidence pack and canonical envelope remain immutable and reflect the final trial receipt chain.

## Expected outcomes

- No trial submission creates legal effect.
- No live transport fallback is activated from trial mode.
- Trial evidence is clearly watermarked and auditable.
- Trial receipts follow deterministic profile rules without operator-injected fake outcomes.

## Exit gate

- AGI, VAT, HUS and annual/income-tax trial submissions all execute through the canonical receipt/recovery model.
- All targeted unit and API tests are green.
- Full test, lint, typecheck, build and security verification are green after the implementation.
