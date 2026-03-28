# @swedish-erp/domain-tax-account

Tax account event import, reconciliation and offset handling for Swedish tax liabilities.

## Scope

- tax account event import and mapping
- reconciliation runs and discrepancy cases
- approved offsets and settlement visibility
- manual event classification against expected liabilities
- discrepancy review, resolution and waiver lifecycle
- tax-account blocker status for close/filing gates

## Primary operations

- `registerExpectedTaxLiability`
- `importTaxAccountEvents`
- `createTaxAccountReconciliation`
- `classifyTaxAccountEvent`
- `listTaxAccountOffsetSuggestions`
- `approveOffsetSuggestion`
- `approveTaxAccountOffset`
- `reviewTaxAccountDifferenceCase`
- `resolveTaxAccountDifferenceCase`
- `waiveTaxAccountDifferenceCase`
