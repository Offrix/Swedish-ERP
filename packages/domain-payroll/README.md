# @swedish-erp/domain-payroll

Payroll core for FAS 8.1.

## Scope

- pay item catalog
- pay calendars
- payroll runs
- retro and correction lines
- final pay adjustments
- payslip snapshots and regeneration
- preview employer contribution rule packs

## Notes

- Tax, AGI mapping and full statutory submission stay in FAS 8.2.
- Posting intents and payout booking stay in FAS 8.3.
- UI consumers must treat this package as a pure domain boundary and keep payroll logic out of the surface layer.
