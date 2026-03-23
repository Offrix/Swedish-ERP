# @swedish-erp/domain-integrations

Integration boundary for bank, Peppol, inbound email, BankID/eID, invoice delivery preparation, payment-link adapters and generic authority submissions.

## Scope

- invoice delivery preparation for PDF email and Peppol
- payment-link preparation for issued AR invoices
- public API clients, compatibility baselines, OAuth-style token exchange and webhook subscriptions
- partner connections, contract tests, rate-limit aware operations and async job orchestration
- submission envelopes with idempotency, receipt chains and action queue for AGI, VAT, HUS, Peppol and annual flows

## Guarantees

- scopes, company boundaries and sandbox mode constrain public reads deterministically
- compatibility baselines and webhook deliveries are append-only and idempotent
- partner operations preserve fallback and rate-limit outcomes as first-class history
- transport failures and domain rejections stay separated in status and queue handling
- receipt history is append-only and duplicate receipts do not create duplicate state transitions
- retries create new attempts instead of mutating historical submissions
