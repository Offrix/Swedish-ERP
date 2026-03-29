> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 8.1 verification

## Scope

This runbook verifies FAS 8.1 Lonearter, lonekalender och lonekorning:

- pay item catalog
- payroll calendars
- payroll runs
- retro and correction traceability
- final pay adjustments
- payslip snapshot regeneration

## Preconditions

- Docker Desktop is running
- local infra is up through `pnpm run infra:up`
- API dependencies are installed
- FAS 7.3 is already migrated and seeded

## Verification steps

1. Run lint:
   - `node scripts/lint.mjs`
2. Run typecheck:
   - `node scripts/typecheck.mjs`
3. Run build verification:
   - `node scripts/build.mjs`
4. Run targeted Phase 8.1 tests:
   - `node --test tests/unit/payroll-phase8-1.test.mjs tests/integration/phase8-payroll-api.test.mjs tests/e2e/phase8-payroll-flow.test.mjs`
5. Run the Phase 8.1 artifact verifier:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase8-payroll-core.ps1`
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

- pay runs expose the defined 18-step payroll chain in deterministic order
- retro corrections preserve `sourcePeriod`, `sourcePayRunId` and `sourceLineId`
- final pay can include settlement, remaining vacation settlement and advance recovery
- payslips can be regenerated without mutating the original snapshot hash
- the Phase 8.1 feature flag returns `503 feature_disabled` when turned off

## Suggested database spot checks

Run these from the repo root after migration and seeding:

```powershell
docker compose -f .\infra\docker\docker-compose.yml exec -T postgres `
  psql -U swedish_erp -d swedish_erp `
  -c "select count(*) as pay_item_definitions from pay_item_definitions;" `
  -c "select count(*) as pay_calendars from pay_calendars;" `
  -c "select count(*) as pay_runs from pay_runs;" `
  -c "select count(*) as pay_run_events from pay_run_events;" `
  -c "select count(*) as pay_run_payslips from pay_run_payslips;"
```

## Exit gate

FAS 8.1 can be marked complete only when:

- all targeted tests are green
- migration and both seed streams complete without manual patches
- pay-run ordering is deterministic for the same inputs
- retro corrections remain traceable to their source period or source run
- payslip regeneration keeps the original snapshot hash while incrementing regeneration metadata
- docs, gates, prompts and verify script are updated in the same change

