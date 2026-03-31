# `@swedish-erp/domain-sie`

Bounded context for SIE4 import/export, opening-balance intake and historical journal import with preserved voucher series and numbering.

## Phase 7.6 scope

- First-class SIE4 export jobs with checksum, scope metadata and immutable content.
- First-class SIE4 import jobs for opening balances and journal history.
- Automatic account hydration from imported `#KONTO` records before posting.
- Opening-balance import through the ledger opening-balance engine.
- Historical journal import that preserves imported voucher series and voucher numbers.
- Durable export/import for SIE job state without placing secrets in snapshots.
