# Bank Statement Reconciliation

This runbook is the narrow verification runbook required by phase 8.4.

It covers:
- `BankStatementEvent`
- `StatementImport`
- `BankReconciliationCase`
- first-class statement posting for:
  - `bank_fee`
  - `interest_income`
  - `interest_expense`
  - `settlement`

## Goal

Ensure that bank statement lines move through:
- `imported`
- `classified`
- `matched`
- `posted | exception`

with explicit approval and real ledger evidence.

## Required Runtime Conditions

- ledger is installed for the company
- bank account exists with valid `ledgerAccountNumber`
- offset ledger account exists for `settlement`
- statement import produced `matched_statement_posting`
- reconciliation case is `open` with `pendingActionCode = approve_bank_statement_posting`

## Approval Procedure

1. Import the bank statement line.
2. Confirm the line is `matched_statement_posting`.
3. Open the `BankReconciliationCase`.
4. Verify:
   - booking date
   - amount
   - category
   - bank account
   - offset account
   - counterparty/reference text
5. Resolve the case with:
   - `resolutionCode = approve_bank_statement_posting`
6. Verify the event now has:
   - `processingStatus = processed`
   - `matchedObjectType = journal_entry`
   - `matchedObjectId`
   - `journalEntryId`

## Expected Posting Rules

For `bank_fee`:
- debit `6060`
- credit bank account ledger

For `interest_income`:
- debit bank account ledger
- credit `7950`

For `interest_expense`:
- debit `7910`
- credit bank account ledger

For `settlement`:
- the statement line must carry explicit `offsetLedgerAccountNumber`
- bank and offset accounts must be different
- positive amount:
  - debit bank account ledger
  - credit offset account
- negative amount:
  - credit bank account ledger
  - debit offset account

## Failure Handling

Do not approve if:
- ledger is missing
- bank account ledger mapping is missing
- offset account is missing
- amount is zero
- bank account and offset account are the same
- the statement line lacks enough metadata to explain the posting

If approval cannot proceed:
- keep the line in exception handling
- do not create manual database fixes
- resolve through controlled reconciliation handling only

## Required Evidence

For each approved line retain:
- statement import id
- bank statement event id
- reconciliation case id
- journal entry id
- actor id
- resolution note
- category code
- bank and offset account numbers

## Required Tests

- `tests/unit/phase27-banking-runtime.test.mjs`
- `tests/integration/phase27-banking-runtime-api.test.mjs`
- `tests/unit/phase9-banking-payment-rails.test.mjs`
- `tests/integration/phase9-banking-payment-rails-api.test.mjs`
