# WIP and Revenue Recognition

## Scope

This runbook covers the regulated project WIP to ledger bridge:

- revenue-recognition plan creation
- activation of the governing plan
- profitability and WIP snapshot validation
- ledger posting for contract assets, deferred revenue and cost WIP
- replay and idempotency by project and reporting period

## Preconditions

- the ledger catalog must be installed for the company
- the accounting year and target journal period must exist and be open
- an active project revenue-recognition plan must exist
- the governing plan should point to an approved project revenue plan unless the method is `billing_equals_revenue`
- profitability blockers must be empty
- WIP snapshot status must not be `review_required`

## Operating sequence

1. Create the project revenue-recognition plan.
2. Verify or override the journal rules:
   - revenue account
   - contract asset account
   - deferred revenue account
   - cost WIP asset account
   - cost WIP change account
3. Activate the plan that should govern the project.
4. Run the bridge for the selected cutoff date.
5. Review the bridge record:
   - method code
   - recognized revenue target
   - target and delta for contract asset
   - target and delta for deferred revenue
   - target and delta for cost WIP
   - journal entry reference when status is `posted`
6. Export or review the project evidence bundle when audit proof is needed.

## Accounting behavior

- `billing_equals_revenue`
  - no contract-asset or deferred-revenue bridge is created
- `over_time`
  - recognized revenue above billed revenue posts contract asset
  - billed revenue above recognized revenue posts deferred revenue
- `deferred_until_milestone`
  - before revenue recognition, actual project cost can be capitalized as cost WIP

## Control points

- WIP ledger bridge is blocked if no active recognition plan exists
- WIP ledger bridge is blocked if profitability blockers remain
- WIP ledger bridge is blocked if WIP snapshot review is required
- ledger posting is idempotent by project, reporting period and balance-state hash
- a rerun with unchanged balance state must reuse the earlier bridge outcome instead of creating duplicate journals

## Evidence and audit

- the bridge stores references to:
  - revenue-recognition plan
  - cost snapshot
  - WIP snapshot
  - profitability snapshot
  - posting intent
  - journal entry
- posted bridges emit `project.wip_ledger_bridge.posted`
- no-op bridges emit `project.wip_ledger_bridge.noop`

## Recovery

- if the journal rules were wrong, correct the governing revenue-recognition plan and rerun only after the accounting effect has been reversed according to ledger controls
- if source finance truth changed, rerun the same cutoff; the idempotency key ensures unchanged state will not duplicate entries
- if a historical reporting period is closed, reopen it through ledger controls before attempting a corrective bridge
