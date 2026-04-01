# Tax Account Ledger Mirror

This runbook defines how authority-side tax-account events must be mirrored into ledger.

## Scope

- VAT assessments
- AGI assessments
- F-tax assessments
- HUS assessments
- approved tax-account offsets that are not already mirrored by bank statement posting
- manual tax-account adjustments after explicit classification

## Core rule

Tax account owns authority truth. Ledger owns posting truth. Every debit-side authority event that changes the tax-account position must either:

1. create a ledger mirror journal, or
2. remain in discrepancy handling until finance chooses the correct counter account.

## Standard postings

- authority account mirror: `1630`
- VAT assessment: debit `2650`, credit `1630`
- AGI assessment: debit liability account, credit `1630`
- F-tax assessment: debit `2510`, credit `1630`
- HUS assessment: debit `2560`, credit `1630`
- standalone refund/payment offset: debit `1630`, credit liability account

## Duplicate protection

- bank-originated tax-account settlement events must not create an extra tax-account ledger mirror
- if `sourceObjectType = bank_statement_event`, the bank statement journal is the financial mirror and tax-account offset only closes the authority-side reconciliation

## Manual adjustments

- `MANUAL_ADJUSTMENT` must carry explicit `effectDirection`
- if no deterministic counter account exists, finance must classify the event manually and provide `ledgerCounterAccountNumber`
- unresolved manual adjustments must stay as discrepancy cases

## Verification

- every mirrored event has non-null `journalEntryId`
- no duplicate settlement journal exists for bank-bridged tax-account events
- discrepancy workbench shows:
  - open case count
  - open case type counts
  - unreconciled event count
  - pending ledger mirror count
