# @swedish-erp/domain-integrations

Integration boundary for bank, Peppol, inbound email, BankID/eID, invoice delivery preparation, payment-link adapters and generic authority submissions.

## Scope

- invoice delivery preparation for PDF email and Peppol
- payment-link preparation for issued AR invoices
- submission envelopes with idempotency, receipt chains and action queue for AGI, VAT, HUS, Peppol and annual flows

## Guarantees

- transport failures and domain rejections stay separated in status and queue handling
- receipt history is append-only and duplicate receipts do not create duplicate state transitions
- retries create new attempts instead of mutating historical submissions
