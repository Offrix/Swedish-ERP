# Bank Statement And Payment Reconciliation

This runbook covers phases 8.4 and 9.4/9.6 and defines the operator chain for:
- `PaymentBatch`
- `StatementImport`
- `SettlementLiabilityLink`
- `PaymentProposal` / `PaymentOrder`
- statement matching against `payment_order` and `tax_account_event`
- first-class statement posting for bank fees, bank interest and explicit settlements

## Goal

Ensure that no bank movement is treated as reconciled or posted without a traceable rail, import chain, approval case and ledger path.

## Preconditions

- the company has an active bank account in `banking`
- a valid rail is configured where payment export is used:
  - `open_banking`
  - `iso20022_file`
  - `bankgiro_file`
- a real source object exists for payment-order or tax-account bridges
- ledger is installed and available for first-class statement posting

## 1. Check Payment Batch Before Export

Verify on `PaymentBatch`:
- `paymentRailCode`
- `paymentFileFormatCode`
- `providerCode`
- `providerBaselineCode`
- `status = draft`
- `orderCount`
- `totalAmount`

Block export if:
- the batch lacks rail or baseline
- any order lacks liability mapping
- the proposal is not `approved`

## 2. Check Export Artifact

After export, all of the following must exist:
- `exportFileName`
- `exportPayload`
- `exportPayloadHash`
- `status = exported`

Rail-specific expectations:
- `open_banking`: JSON payload with orders and beneficiary account
- `iso20022_file`: XML envelope with `format="pain.001"`
- `bankgiro_file`: CSV envelope

## 3. Check Submission To Bank Rail

After submit and accept:
- `PaymentBatch.status` must move `submitted -> accepted_by_bank`
- all included `PaymentOrder` records must move `reserved -> sent -> accepted`
- `providerReference` must be retained when the rail returns one

## 4. Check Statement Import

Each statement import must create a first-class `StatementImport` with:
- `statementImportNo`
- `sourceChannelCode`
- `statementFileFormatCode`
- `providerCode`
- `providerBaselineCode` where the rail is not manual
- `providerReference`
- `importedCount`
- `duplicateCount`
- `matchedPaymentOrderCount`
- `matchedTaxAccountCount`
- `matchedStatementPostingCount`
- `reconciliationRequiredCount`

Important:
- statement import may classify a line as `matched_payment_order`, `matched_tax_account` or `matched_statement_posting`
- statement import must never create AP settlement, tax-account bridge or ledger journal directly
- those effects require an open `BankReconciliationCase` and an explicit approve resolution

Allowed `sourceChannelCode` values:
- `open_banking_sync`
- `camt053_file`
- `manual_statement`

## 5. Check Settlement Liability Links

Every rail event that affects a payable or receivable must have a `SettlementLiabilityLink`.

For AP payment:
- `liabilityObjectType = ap_open_item`
- `paymentOrderId` must exist
- `status` moves `pending -> matched -> settled | rejected | returned`
- `bankStatementEventId` is set when a statement line matches the payment
- `matched` means the line is identified but still blocked behind explicit approval

For tax-account statement bridge:
- `liabilityObjectType = tax_account_event`
- `bankStatementEventId` must exist
- `status = settled` only after the tax-account event is actually created

## 6. Reconciliation Required

If a statement line cannot be matched:
- `BankStatementEvent.processingStatus = reconciliation_required`
- `BankReconciliationCase.status = open`
- no ledger effect may be created from the statement line

If a statement line matches but still requires a posting gate:
- `BankStatementEvent.matchStatus` may be `matched_payment_order`, `matched_tax_account` or `matched_statement_posting`
- `BankStatementEvent.processingStatus` must still be `reconciliation_required`
- `BankReconciliationCase.pendingActionCode` must carry the exact approve action
- no AP settlement, tax-account bridge or statement posting may run before explicit approval

This applies especially to:
- wrong `paymentOrderId`
- incomplete tax-account bridge
- bank fee, bank interest or settlement without a valid offset account
- unknown counterparty without a real liability source

## 7. Operator Checklist

1. Read `PaymentBatch`.
2. Verify rail, baseline and order count.
3. Verify export artifact.
4. Verify `StatementImport`.
5. Verify `SettlementLiabilityLink`.
6. Verify that every line with `reconciliation_required` has a case.
7. Verify that `matched_payment_order` does not move to settled before explicit approval.
8. Verify that `matched_statement_posting` gets `journalEntryId` only after explicit approval.
9. Verify that a settled payment order has a liability link in `settled`.

## 8. Failure Indicators

Stop further operations if any of the following happens:
- statement import exists without a first-class `StatementImport`
- payment order is booked without a `SettlementLiabilityLink`
- payment order or tax-account bridge runs directly during import without approval
- bank fee, bank interest or settlement is posted during import without approval
- bank fee, bank interest or settlement lacks `journalEntryId` after approval
- rail or baseline disappears between proposal and batch
- tax-account bridge creates a statement match without a liability link
- batch reaches `accepted_by_bank` without an export artifact

## 9. Required Tests

The following suites must be green:
- `tests/unit/phase27-banking-runtime.test.mjs`
- `tests/integration/phase27-banking-runtime-api.test.mjs`
- `tests/unit/phase9-banking-payment-rails.test.mjs`
- `tests/integration/phase9-banking-payment-rails-api.test.mjs`
- `tests/e2e/phase9-banking-payment-rails-flow.test.mjs`
