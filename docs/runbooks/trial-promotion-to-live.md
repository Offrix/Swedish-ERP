# Trial Promotion To Live

## Purpose

This runbook governs promotion from an isolated trial tenant to a new live company profile.
Promotion is never in-place. The live company is born through a separate onboarding/bootstrap path.

## Preconditions

- trial environment status is `active`
- trial environment isolation is intact
- trial environment is still promotion eligible
- promotion validation report status is `eligible`
- promotion approval coverage is complete:
  - implementation
  - finance
  - security

## Portable Data Only

Portable data may include:

- company masterdata
- registrations
- settings
- chart selection
- explicitly selected document templates
- explicitly selected portable documents
- explicitly selected project templates
- staged user/role carry-over instructions

The following must never be copied directly into live:

- trial journals
- trial payroll runs
- trial submission receipts
- provider refs
- provider tokens
- trial evidence bundles
- synthetic bank events
- synthetic tax-account events
- synthetic support artifacts

## Execution Flow

1. Create `PromotionValidationReport`.
2. Create `PortableDataBundle`.
3. Verify approval coverage is complete.
4. Move trial environment to `promotion_in_progress`.
5. Create a new live onboarding run using approved admin contact.
6. Apply registrations.
7. Apply chart template and voucher series.
8. Apply VAT setup.
9. Apply fiscal periods.
10. Materialize finance foundation for the new live company.
11. Freeze promotion evidence.
12. Archive the trial environment with `archivedReasonCode=promoted_to_live`.

## Post-Promotion Tasks

The execution summary must explicitly carry the required post-promotion tasks:

- configure live provider credentials
- import opening balances
- import payroll history if applicable
- import open items and history
- configure bank connections
- configure authority registration

## Verification

- live company id is different from the source trial company id
- live company reaches `finance_ready`
- trial environment becomes `archived`
- trial promotion evidence bundle exists
- validation report and portable data bundle are attached to the promotion plan
- no forbidden trial artifact is present in the live company payload

## Exit Gate

Promotion is only complete when:

- the promotion plan status is `executed`
- the live company bootstrap path is complete
- finance foundation is materialized for the live company
- the trial environment is archived
- the promotion evidence bundle is frozen
