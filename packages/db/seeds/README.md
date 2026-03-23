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
- Phase 7.2 adds schedule templates, assignments, clock-event history, time-entry balances and locked payroll periods
- Phase 7.3 adds leave types, employee-portal absence history, manager approvals, AGI-sensitive leave signals and signed lock artifacts
- Phase 8.1 adds payroll rule-pack previews, pay item catalog seed data, payroll calendars and regular/extra/correction/final pay-run demo artifacts
- Phase 8.2 adds statutory payroll profiles, tax/SINK rule-pack seed data, AGI submissions, correction versions, receipts and absence-payload demo artifacts
- Phase 8.3 adds payroll posting, dimension-aware journal lines, payout export, bank-match and vacation-liability demo artifacts
- Phase 9.1 adds benefits catalog baseline data plus health-insurance, car-benefit, fuel-benefit and wellness demo artifacts
- Phase 9.2 adds official 2026 foreign allowance reference data plus domestic and foreign travel claim demo artifacts with traktamente, mileage, expenses and travel advances
- Phase 9.3 adds Collectum, Fora, extra-pension and salary-exchange demo artifacts plus provider report and reconciliation evidence
- Phase 10.1 adds project baseline profiles, budget versions, resource allocations and forecast-revision demo artifacts for project follow-up verification
- Phase 10.2 seeds field warehouse and truck stock, a dispatchable work order, demo signatures and sync-envelope artifacts for mobile and material verification
- Phase 10.3 seeds HUS baseline and recovery flows, ATA/build-VAT decisions and personalliggare threshold, correction and control-chain export artifacts
- Phase 11.1 adds reporting metric-catalog baseline data, custom report-definition seed data and demo cashflow/export-job artifacts
- Phase 11.2 seeds bureau-delivery settings plus demo portfolio, client request, approval package, work-item, comment and mass-action artifacts
- Phase 11.3 seeds close deadline settings plus demo close checklist, checklist-step, blocker and close work-item artifacts
- Phase 12.1 seeds a signed K2 annual-report package, signatory chain, submission event and derived tax-package artifact for annual-reporting verification
- Phase 12.2 seeds annual-tax package metadata plus demo submission envelope, receipt chain and action-queue artifacts for declaration and operator verification
- Phase 13.1 seeds public API client, compatibility baseline, sandbox token, webhook subscription and delivery demo artifacts
- Phase 13.2 seeds partner connections, contract-test results, fallback operations, async jobs and replay-plan demo artifacts
- Phase 13.3 seeds automation rule-pack metadata plus posting, classification, anomaly and override demo artifacts
- Phase 14.1 seeds support case, diagnostic, impersonation, access review, SoD finding and break-glass demo artifacts
- Phase 14.2 seeds feature flags, emergency disables, load profiles, restore drills and chaos-scenario demo artifacts
- Phase 14.3 seeds mapping sets, import batches, diff reports, cutover-plan stages and rollback demo artifacts
