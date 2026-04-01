# HR / Time Cutover

## Purpose

Verify that payroll cutover starts from canonical people truth, not loose legacy exports.

## Required intake set

- `employeeMasterSnapshot`
- `employmentHistory`
- `ytdBasis`
- `agiCarryForwardBasis`
- `absenceHistory` when historic absence affects payroll continuity
- `benefitHistory` when prior taxable benefits exist
- `travelHistory` when prior reimbursements or mileage history exists
- `pensionHistory` when prior pension basis/premiums must carry forward
- `agreementSnapshot` when collective agreement logic must survive first live payroll

## Verification steps

1. Create payroll migration batch with cutover date and first target reporting period.
2. Import employee records with source evidence mapped per area.
3. Confirm `/v1/payroll/migrations/:id/employees` shows:
   - canonical employee master
   - ordered employment history without overlaps
   - absence, benefit, travel and pension histories where present
   - agreement snapshot for agreement-driven employments
4. Run validation and confirm:
   - no missing required evidence areas
   - no missing required balance baselines
   - no blocking validation issues
5. Freeze evidence bundle and confirm required evidence areas list matches imported snapshot families.
6. Do not approve cutover before open migration diffs are decided.

## Blocking conditions

- overlapping employment history
- missing YTD basis
- missing AGI carry-forward basis
- missing evidence mappings for imported snapshot families
- agreement-driven employment without agreement snapshot evidence

## Evidence

- payroll history evidence bundle
- per-employee coverage snapshot from `/v1/payroll/migrations/:id/employees`
- validation summary
- approved migration diffs before cutover approval
