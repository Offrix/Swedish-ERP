# @swedish-erp/db

Database foundation with migration framework, seed files and baseline governance tables.

## Commitments

- One migration stream in `migrations/`.
- One seed stream in `seeds/`.
- Monotonic timestamped SQL files.
- `schema_migrations` table for applied tracking.
- Core audit/idempotency/outbox tables available before domain rollout.
- Placeholder domain tables exist for every table family listed i `docs/MASTER_BUILD_PLAN.md`.
- Phase 1 org/auth/onboarding tables live in the same monotonic migration stream.
- Phase 3.1 ledger hardening, DSAM chart seed and demo journals live in the same monotonic stream.
- Phase 3.2 ledger dimension catalogs, period-lock metadata and correction links live in the same monotonic stream.
- Phase 3.3 reporting definitions, report snapshots and reconciliation sign-off objects live in the same monotonic stream.
- Phase 4.1 adds VAT masterdata, dated rule packs, traceable VAT decisions and manual review queue objects in the same monotonic stream.
- Phase 4.2 adds declaration-box amounts, posting entries and credit-note traceability for VAT execution in the same monotonic stream.
- Phase 4.3 adds VAT declaration runs, OSS/IOSS reporting artifacts and periodic statement runs in the same monotonic stream.
- Phase 5.1 adds customer masterdata, contacts, items, price lists, quote versions, contracts, invoice plans and import batches in the same monotonic stream.
- Phase 5.2 adds invoice number series, invoice lines, credit links, issue events, delivery events and payment-link persistence in the same monotonic stream.
- Phase 5.3 adds open items, allocation events, payment-matching runs, unmatched receipts, dunning runs, writeoffs and aging snapshots in the same monotonic stream.
- Phase 6.1 adds supplier masterdata hardening, contacts, tolerance profiles, purchase-order lines, receipt objects, AP import batches and invoice-receipt links in the same monotonic stream.
- Phase 6.2 adds supplier-invoice ingest metadata, invoice coding lines, match runs, variances and AP posting linkage in the same monotonic stream.
- Phase 6.3 adds AP invoice approval steps, bank accounts, payment proposals, payment orders, bank payment events and return-aware AP open-item linkage in the same monotonic stream.
- Phase 7.1 adds employees, employments, employment contract history, manager assignments and employee payout accounts in the same monotonic stream.
- Phase 7.2 adds time schedule templates, assignments, clock events, enriched time entries, balance transactions and period locks in the same monotonic stream.
- Phase 7.3 adds leave types, leave-entry history, absence signals, manager approval state and AGI-sensitive signal locks in the same monotonic stream.
- Phase 8.1 adds payroll item definitions, payroll calendars, payroll run metadata, payroll run events and stored payslip snapshots in the same monotonic stream.
- Phase 8.2 adds statutory payroll profiles, tax/SINK rule-pack persistence, AGI periods, AGI submission versions, receipts, errors, signatures and absence payloads in the same monotonic stream.
- Phase 8.3 adds payroll postings, posting lines, payout batches, payout lines, pay-run posting state and vacation liability snapshots in the same monotonic stream.
- Phase 9.1 adds benefit catalog, benefit events, valuations, deductions, posting intents and AGI mappings in the same monotonic stream.
- Phase 9.2 adds foreign allowance tables, travel claims, travel days, country segments, meal events, mileage logs, expense receipts, advances, valuations and payroll intents in the same monotonic stream.
- Phase 9.3 adds pension plans, enrollments, salary exchange agreements, pension basis snapshots, provider reports, report lines and reconciliation objects in the same monotonic stream.
- Phase 10.1 adds project profile hardening, budget versions, budget lines, resource allocations, actual-cost snapshots, WIP snapshots and forecast snapshots in the same monotonic stream.
- Phase 10.2 extends `work_orders` and adds inventory locations, inventory items, stock balances, dispatch assignments, material withdrawals, customer signatures and offline sync envelopes for field execution.

## Usage

- Create migration: `pnpm db:new-migration --name=<slug>`
- Verify migration naming: `pnpm verify:db`
- Dry-run migrations: `pnpm run db:migrate -- --dry-run`
- Apply migrations through Docker infra: `pnpm run db:migrate`
- Apply all baseline seeds in order: `pnpm run db:seed`
- Apply baseline and demo seeds in order: `pnpm run seed:demo`
