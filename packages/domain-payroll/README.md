# @swedish-erp/domain-payroll

Payroll domain for FAS 8.1 and FAS 8.2.

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
- retro and correction lines
- final pay adjustments
- payslip snapshots and regeneration
- preview payroll rule packs

## Notes

- Posting intents and payout booking stay in FAS 8.3.
- UI consumers must treat this package as a pure domain boundary and keep payroll logic out of the surface layer.
