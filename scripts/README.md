# Scripts

Helper scripts for local setup, structure verification and phased rollout checks.

- `build.mjs`: syntax-checks runnable JavaScript files.
- `db-migrate.mjs`: applies SQL migrations through Docker or lists them in dry-run mode.
- `db-seed.mjs`: applies baseline or demo seed SQL through Docker.
- `dev.mjs`: starts `api`, `desktop-web`, `field-mobile` and `worker`.
- `doctor.mjs`: verifies local tool presence and locked runtime versions.
- `healthcheck.mjs`: pings local health endpoints.
- `lint.mjs`: validates repo structure and document consistency.
- `runtime-log.mjs`: prints configured and discovered runtime versions.
- `security-scan.mjs`: scans for tracked secrets and unsafe env files.
- `typecheck.mjs`: validates runtime alignment and FAS 0 package boundaries.
- `run-tests.mjs`: dispatches Node test suites by layer.
- `verify-phase0.ps1`: validates required package and infra skeleton.
- `verify-phase1.ps1`: validates required FAS 1 auth, org and onboarding artifacts.
- `verify-phase2-document-archive.ps1`: validates required FAS 2.1 document archive artifacts.
- `verify-phase2-company-inbox.ps1`: validates required FAS 2.2 company inbox and mail ingest artifacts.
- `verify-phase2-ocr-review.ps1`: validates required FAS 2.3 OCR, classification and review artifacts.
- `verify-phase3-ledger-foundation.ps1`: validates required FAS 3.1 ledger foundation artifacts.
- `verify-phase3-ledger-rules.ps1`: validates required FAS 3.2 ledger dimension, period-lock and correction artifacts.
- `verify-phase3-reporting.ps1`: validates required FAS 3.3 reporting, drilldown and reconciliation artifacts.
- `verify-phase4-vat.ps1`: validates required FAS 4.1 VAT masterdata, rule-pack and decision artifacts.
- `verify-phase4-vat-rules.ps1`: validates required FAS 4.2 VAT rule-execution, box-amount and credit-note artifacts.
- `verify-phase4-vat-reporting.ps1`: validates required FAS 4.3 OSS/IOSS, periodic statement and VAT declaration reporting artifacts.
- `verify-phase5-ar-masterdata.ps1`: validates required FAS 5.1 customer, item, quote, contract and import artifacts.
- `verify-phase5-ar-invoicing.ps1`: validates required FAS 5.2 invoice, credit-note, delivery and payment-link artifacts.
- `verify-phase5-ar-receivables.ps1`: validates required FAS 5.3 open-item, allocation, dunning, writeoff and aging artifacts.
- `verify-phase6-ap-masterdata.ps1`: validates required FAS 6.1 supplier, purchase-order, receipt and import artifacts.
- `verify-phase6-ap-invoice-matching.ps1`: validates required FAS 6.2 supplier-invoice ingest, OCR line extraction, matching and variance artifacts.
- `verify-phase6-ap-payments.ps1`: validates required FAS 6.3 approval-chain, payment-proposal, payout-booking and bank-return artifacts.
- `verify-phase7-hr-master.ps1`: validates required FAS 7.1 employee, employment, contract-history, bank-account and audit artifacts.
- `verify-db.ps1`: validates migration file naming.
- `new-migration.ps1`: creates timestamped migration file in `packages/db/migrations`.
- `dev-up.ps1`: starts docker infra.
- `dev-down.ps1`: stops docker infra.
