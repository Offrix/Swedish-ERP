# Phase 7.1 Legal Form and Close Requirements Verification

## Purpose

Verify that legal-form and fiscal-year obligations drive declaration profiles, fiscal-year restrictions and year-end close requirements instead of static close templates.

## Verify legal-form close requirements

1. Create or identify an approved legal-form profile and approved reporting-obligation profile for the target fiscal year.
2. Resolve close requirements through `GET /v1/legal-forms/close-requirements`.
3. Confirm the response carries:
   - `closeTemplateCode`
   - `reportingObligationProfileId`
   - `requiresAnnualReport`
   - `requiresYearEndAccounts`
   - `allowsSimplifiedYearEnd`
   - `mandatoryStepBlueprints`
4. For an AB or economic association year-end, confirm `closeTemplateCode` is `year_end_annual_report`.
5. Confirm year-end requirements add the expected manual review steps:
   - `income_tax_package_review`
   - `annual_report_package_review`
   - `bolagsverket_filing_readiness`
6. If `requiresYearEndAccounts` is true, confirm the year-end review step is present:
   - `year_end_accounts_review`
   - or `simplified_year_end_review` when simplified year-end is allowed.

## Verify close workbench integration

1. Create a close checklist for a fiscal-year-ending accounting period through `POST /v1/close/checklists`.
2. Confirm the checklist carries:
   - `checklistTemplateCode`
   - `closeRequirementSnapshot`
3. Confirm the checklist template matches the legal-form close requirement response.
4. Confirm the checklist steps include the extra year-end steps returned by the close-requirement resolver.
5. Create a non-year-end checklist and confirm it stays on `monthly_standard`.

## Verify fiscal-year hardening

1. Attempt to create a fiscal-year profile with an unsupported legal-form code.
2. Confirm the command fails with `legal_form_code_invalid`.
3. For sole traders or physical-person taxation, confirm broken fiscal years are rejected and calendar-year constraints remain enforced.

## Regression gate

- `node --test tests/unit/phase7-legal-form-close-requirements.test.mjs`
- `node --test tests/integration/phase7-legal-form-close-requirements-api.test.mjs`
- `node --test tests/unit/phase34-legal-form.test.mjs`
- `node --test tests/unit/phase14-fiscal-year.test.mjs`
- `node --test tests/unit/core-phase11-3.test.mjs`
- `node --test tests/integration/phase11-close-api.test.mjs`
- `node --test tests/integration/phase34-legal-form-api.test.mjs`
- `node --test tests/integration/phase14-fiscal-year-api.test.mjs`
