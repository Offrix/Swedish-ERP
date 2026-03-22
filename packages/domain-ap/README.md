# @swedish-erp/domain-ap

Accounts payable boundary for suppliers, purchase orders, supplier invoices, matching and attest flow.

## Phase 6.1 scope

- supplier masterdata
- supplier import batches with idempotent replay
- purchase orders with inherited price, account and VAT defaults
- goods receipts linked to purchase-order lines and supplier-invoice references
- duplicate protection for receipts

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
