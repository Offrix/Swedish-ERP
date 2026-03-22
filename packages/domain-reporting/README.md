# @swedish-erp/domain-reporting

Reporting boundary for financial statements, subledger/project reporting, drilldown, export jobs and historical reproducibility.

## Phase 3.3 scope

- Trial balance, income statement and balance sheet snapshots with deterministic filters and content hashes.
- Journal search with snapshot scoping, account filtering and drilldown to linked documents.
- Reconciliation runs with versioned area/period scope, difference items and sign-off evidence binding.
- Reporting snapshots stay immutable after later ledger mutations so historical outputs remain reproducible.

## Phase 11.1 scope

- Cashflow, AR open-item, AP open-item and project-portfolio snapshots built on deterministic source payloads.
- Metric catalog with stable codes, owners and versioned definitions for official and custom report views.
- Light report builder that derives custom definitions from official report sources without introducing arbitrary BI logic.
- Export jobs for Excel/PDF with snapshot binding, watermark mode and supersede-aware job lifecycle.
