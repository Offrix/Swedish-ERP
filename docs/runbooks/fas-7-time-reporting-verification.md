# FAS 7.2 verification

## Scope

This runbook verifies FAS 7.2 Tidrapportering, schema och saldon:

- clock in and clock out events
- schedule templates and assignments
- time entries linked to project and activity
- reproducible balances for flex, comp and overtime
- period locking for time

## Preconditions

- Docker Desktop is running
- local infra is up through `pnpm run infra:up`
- API dependencies are installed
- FAS 7.1 is already migrated and seeded

## Verification steps

1. Run lint:
   - `node scripts/lint.mjs`
2. Run typecheck:
   - `node scripts/typecheck.mjs`
3. Run build verification:
   - `node scripts/build.mjs`
4. Run targeted Phase 7.2 tests:
   - `node --test tests/unit/time-phase7-2.test.mjs tests/integration/phase7-time-api.test.mjs tests/e2e/phase7-time-flow.test.mjs`
5. Run the Phase 7.2 artifact verifier:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase7-time-reporting.ps1`
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

- time entries can be created for a valid employment
- a time entry can carry both `projectId` and `activityCode`
- schedule assignments resolve the planned minutes for the work date
- balances for flex, comp and overtime are reproducible for the same cutoff date
- a locked period rejects new time entries and new clock events
- the Phase 7.2 feature flag returns `503 feature_disabled` when turned off

## Suggested database spot checks

Run these from the repo root after migration and seeding:

```powershell
docker compose -f .\infra\docker\docker-compose.yml exec -T postgres `
  psql -U swedish_erp -d swedish_erp `
  -c "select count(*) as schedule_templates from time_schedule_templates;" `
  -c "select count(*) as schedule_assignments from time_schedule_assignments;" `
  -c "select count(*) as clock_events from time_clock_events;" `
  -c "select count(*) as time_entries from time_entries;" `
  -c "select count(*) as balance_transactions from time_balance_transactions;" `
  -c "select count(*) as period_locks from time_period_locks;"
```

## Exit gate

FAS 7.2 can be marked complete only when:

- all targeted tests are green
- migration and both seed streams complete without manual patches
- balances are reproducible for the same cutoff date
- period locking blocks new mutations inside the locked range
- docs, gates, prompts and verify script are updated in the same change
