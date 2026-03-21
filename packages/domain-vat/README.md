# @swedish-erp/domain-vat

VAT decision boundary with rule-pack driven classification and declaration-box outputs.

## Phase 4.3 scope

- Sweden baseline rates: 25/12/6/0.
- EU baseline: B2B and B2C with threshold-below, OSS and IOSS branches.
- Import/export handling and construction reverse charge.
- Credit-note mirroring from original VAT decision.
- Declaration-box amount outputs per decision.
- Self-assessed VAT double-booking outputs for import/reverse-charge purchases.
- Declaration-box summarization helper across decided VAT decisions.
- VAT declaration runs with correction metadata and ledger comparison.
- Periodic statement materialization with reproducible EU-list lines.
