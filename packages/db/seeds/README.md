# Seeds

Seed naming convention:

- `YYYYMMDDHHMMSS_<slug>.sql`

Seed files are intended for local Docker bootstrap only.

Seed execution policy:

- `pnpm run db:seed` applies every non-demo seed in timestamp order
- `pnpm run seed:demo` applies all seeds, including `_demo_` files, in timestamp order
- Phase 3.1 adds DSAM chart and voucher series baseline seed plus demo journals for ledger verification
- Phase 3.2 adds dimension catalogs, next-period correction baseline data and demo reversals/corrections for ledger verification
- Phase 3.3 adds report definitions plus demo report snapshots and signed reconciliation evidence for reporting verification
- Phase 4.1 adds VAT rule-pack seed data, VAT code masterdata and demo VAT decisions with review queue evidence
- Phase 4.2 adds VAT execution seed data for declaration-box amounts, posting entries and credit-note mirroring
- Phase 4.3 adds VAT declaration-run, OSS/IOSS and periodic-statement demo artifacts for reporting verification
- Phase 5.1 adds AR customer masterdata, contacts, items, price lists, quote versions, contracts, invoice plans and import-batch demo artifacts
- Phase 5.2 adds AR invoice-number series, invoice lines, credit-link, delivery and payment-link demo artifacts
- Phase 5.3 adds AR open-item, allocation, bank-match, unmatched-receipt, dunning, writeoff and aging demo artifacts
- Phase 6.1 adds AP supplier masterdata, contacts, tolerance profiles, PO lines, receipt lines, import-batch results and invoice-receipt link demo artifacts
- Phase 6.2 adds AP supplier-invoice ingest, match-run, variance and multi-line posting demo artifacts
- Phase 6.3 adds AP approval-chain, payment-proposal, payout-booking and returned-payment demo artifacts
- Phase 7.1 adds employee masterdata, multiple employments, contract-history, manager-tree, payout-account and sensitive-audit demo artifacts
