# FAS 8.2 verification

## Scope

This runbook verifies FAS 8.2 Skatt, arbetsgivaravgifter, SINK och AGI:

- employment statutory profiles
- payroll tax and employer contribution previews
- SINK validity and fallback behavior
- AGI draft, validation, ready-for-sign and submission flow
- AGI receipt, signature, error and correction-version history
- leave-signal locking for AGI-sensitive absence

## Preconditions

- Docker Desktop is running
- local infra is up through `pnpm run infra:up`
- API dependencies are installed
- FAS 8.1 is already migrated and seeded

## Verification steps

1. Run lint:
   - `node scripts/lint.mjs`
2. Run typecheck:
   - `node scripts/typecheck.mjs`
3. Run build verification:
   - `node scripts/build.mjs`
4. Run targeted Phase 8.2 tests:
   - `node --test tests/unit/payroll-phase8-2.test.mjs tests/integration/phase8-payroll-tax-agi-api.test.mjs tests/e2e/phase8-payroll-tax-agi-flow.test.mjs`
5. Run the Phase 8.2 artifact verifier:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase8-payroll-tax-agi.ps1`
6. Verify migration order:
   - `node scripts/db-migrate.mjs --dry-run`
7. Verify seed order:
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
8. Apply migrations:
   - `node scripts/db-migrate.mjs`
9. Apply baseline seeds:
   - `node scripts/db-seed.mjs`
10. Apply demo seeds:
    - `node scripts/db-seed.mjs --demo`

## Required assertions

- manual-rate taxation populates `preliminary_tax` per employee without UI-side calculation
- SINK populates `sink_tax` per employee and keeps fallback data explicit
- AGI drafts materialize employee payloads, line traceability and absence payloads from approved payroll runs
- `ready_for_sign`, `signed` and `submitted` leave-signal locks block late AGI-sensitive absence edits
- submitted AGI versions keep immutable signatures, receipts and receipt errors
- correction versions preserve version history and only flag materially changed employees

## Suggested database spot checks

Run these from the repo root after migration and seeding:

```powershell
docker compose -f .\infra\docker\docker-compose.yml exec -T postgres `
  psql -U swedish_erp -d swedish_erp `
  -c "select count(*) as employment_statutory_profiles from employment_statutory_profiles;" `
  -c "select count(*) as agi_periods from agi_periods;" `
  -c "select count(*) as agi_submissions from agi_submissions;" `
  -c "select count(*) as agi_submission_versions from agi_submission_versions;" `
  -c "select count(*) as agi_receipts from agi_receipts;" `
  -c "select count(*) as agi_errors from agi_errors;"
```

## Exit gate

FAS 8.2 can be marked complete only when:

- all targeted tests are green
- migration and both seed streams complete without manual patches
- AGI payloads expose the correct tax field per employee
- AGI-sensitive absence is locked before sign and stays locked after submit
- correction versions preserve immutable history, receipt trail and changed-employee traceability
- docs, gates, prompts and verify script are updated in the same change
