# AGI Corrections

## Purpose

This runbook governs controlled AGI rebuilds, correction versions, employer-level totals, and evidence handling for Swedish payroll AGI in reporting year 2026.

The payroll domain owns:

- approved pay-run truth for the reporting period
- employee-level AGI payloads
- employer-level AGI totals for main record field `487` and field `497`
- correction version chaining and stable employee specification numbers
- frozen evidence bundles for each AGI version state transition

## Preconditions

- the company is employer-registered
- approved pay runs exist for the reporting period
- approved tax decision snapshots exist for all included employments
- leave signals are complete and approved for any AGI-reportable absence
- any receivable, garnishment, or emergency-manual payroll decisions already passed required review

## Build Flow

1. Create the AGI submission draft for the reporting period.
2. Verify that `currentVersion.payloadJson.employerTotals` contains:
   - `field487SummaArbetsgivaravgifterOchSlf`
   - `field497SummaSkatteavdrag`
   - `contributionBuckets`
3. Verify that every employee payload carries a positive integer `specificationNumber`.
4. Verify that `currentVersion.evidenceBundleId` exists immediately after build.

## Employer Totals Rules

- Field `487` must be built on employer level, not by copying a single payslip total.
- Employer contribution totals are aggregated by reported contribution rate.
- Each rate bucket is calculated from total contribution base for that rate.
- Each rate bucket is truncated to whole kronor before the final field `487` sum is added.
- Field `497` is the whole-krona aggregate of preliminary tax, SINK tax, and A-SINK tax for the period.
- `vaxa` must be reported in AGI at full employer contribution level; the relief remains a separate skattekonto refund exposure.

## Correction Rules

- Only create a correction version from a previously submitted AGI version.
- Use a business reason in `correctionReason`.
- Reuse the same `specificationNumber` for an employee when correcting that employee in the same AGI chain.
- Never overwrite an existing version in place; build a new version.
- Revalidate and mark ready for sign before submission.

## Evidence Rules

- Every AGI version must have a frozen evidence bundle from draft onward.
- Evidence is refreshed when the version moves through:
  - draft build
  - validation
  - ready-for-sign
  - submit/receipt
- Evidence metadata must retain:
  - reporting period
  - version number
  - correction reason
  - field `487`
  - field `497`
  - changed employees
  - source pay runs

## Validation Checklist

- `payloadJson.employerTotals.field487SummaArbetsgivaravgifterOchSlf` matches approved payroll employer contribution aggregates
- `payloadJson.employerTotals.field497SummaSkatteavdrag` matches employee AGI tax fields
- every employee has exactly one tax field populated
- every employee has a stable `specificationNumber`
- no duplicate `specificationNumber` values exist in the same version
- correction versions preserve prior employee specification numbers
- `currentVersion.totalsMatch` is `true`
- `validationErrors` is empty before ready-for-sign

## Failure Handling

- If source payroll changed after build: rebuild the AGI draft from approved runs.
- If employer totals mismatch: inspect contribution buckets, especially mixed-rate runs and `vaxa`.
- If specification numbers drift: rebuild the correction version from the latest submitted version and verify chain continuity.
- If receipt contains errors: keep the version and receipt evidence, then build a new correction version instead of mutating the submitted one.

## Key Commands And Routes

Unit tests:

- `node --test tests/unit/phase12-agi-hardening.test.mjs`
- `node --test tests/unit/payroll-phase8-2.test.mjs`

API tests:

- `node --test tests/integration/phase8-payroll-tax-agi-api.test.mjs`

Routes:

- `POST /v1/payroll/agi-submissions`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/validate`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/ready-for-sign`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/submit`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/correction`
