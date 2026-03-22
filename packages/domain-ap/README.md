# @swedish-erp/domain-ap

Accounts payable boundary for suppliers, purchase orders, supplier invoices, matching, review gating and attest flow.

## Phase 6.1 and 6.2 scope

- supplier masterdata
- supplier import batches with idempotent replay
- purchase orders with inherited price, account and VAT defaults
- goods receipts linked to purchase-order lines and supplier-invoice references
- duplicate protection for receipts
- supplier-invoice ingest from API or document OCR
- multi-line coding with explainable VAT proposals
- 2-way and 3-way matching with variance creation
- posting block when review or receipt variance is open
- AP open items and posted journal linkage for supplier invoices

## Runtime surface

- `createApPlatform(options)`
- `createApEngine(options)`

## Guarantees

- supplier numbers are unique per company
- supplier import batch keys are idempotent per company and payload
- bank-detail changes from import activate payment blocking and audit
- purchase orders cannot move from `draft` directly to `sent`
- receipts only register against approved or sent purchase orders
- cumulative receipt quantity cannot exceed configured overdelivery tolerance
- supplier invoices cannot post unless approved and free from open review variances
