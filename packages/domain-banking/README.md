# @swedish-erp/domain-banking

Banking boundary for:
- bank accounts
- payment proposals
- first-class payment batches
- payment orders
- statement imports
- bank statement events
- reconciliation cases
- settlement liability links

The runtime carries explicit rail and provider-baseline truth for:
- `open_banking`
- `iso20022_file`
- `bankgiro_file`

Statement-driven effects are approval-gated:
- statement import may identify `payment_order` or `tax_account` target truth
- no payment-order settlement or tax-account bridge is executed during import
- execution happens only after explicit reconciliation-case approval
