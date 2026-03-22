# @swedish-erp/domain-payroll

Payroll domain for FAS 8.1, FAS 8.2 and FAS 8.3.

## Scope

- pay item catalog
- pay calendars
- payroll runs
- employment statutory profiles
- deterministic tax previews
- employer contribution previews
- SINK support
- AGI payload materialization
- AGI submission versions, receipts, signatures and correction chains
- payroll postings with dimension-preserving cost allocation
- payout batches, deterministic export payloads and bank matching
- reproducible vacation liability snapshots
- retro and correction lines
- final pay adjustments
- payslip snapshots and regeneration
- preview payroll rule packs

## Notes

- Benefits, travel, pension and salary exchange stay in FAS 9.
- UI consumers must treat this package as a pure domain boundary and keep payroll logic out of the surface layer.
