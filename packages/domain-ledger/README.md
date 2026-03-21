# @swedish-erp/domain-ledger

Ledger boundary for DSAM chart seeding, voucher series, journal entry validation and immutable posting.

## Phase 3.1 scope

- DSAM account catalog installation from compliance section 24.2.
- Voucher series A-Z per company with deterministic numbering.
- Journal draft, validation and posting lifecycle.
- Balanced debit/credit checks before posting.
- Open-period enforcement and locked-period rejection.
- Idempotent posting keys per company.
- Imported history marking without silent mutation of posted entries.
