> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 9.1 verification

## Scope

This runbook verifies FAS 9.1 Formansmotor:

- benefit catalog
- taxable, tax-free and partially taxable valuation decisions
- bil, drivmedel, friskvard, gavor, kost och sjukvardsforsakring
- employee payment offsets and nettoloneavdrag
- payroll, AGI and posting integration

## Preconditions

- Docker Desktop is running
- local infra is up through `pnpm run infra:up`
- API dependencies are installed
- FAS 8.3 is already migrated and seeded

## Verification steps

1. Run lint:
   - `node scripts/lint.mjs`
2. Run typecheck:
   - `node scripts/typecheck.mjs`
3. Run build verification:
   - `node scripts/build.mjs`
4. Run targeted Phase 9.1 tests:
   - `node --test tests/unit/benefits-phase9-1.test.mjs tests/integration/phase9-benefits-api.test.mjs tests/e2e/phase9-benefits-flow.test.mjs`
5. Run the Phase 9.1 artifact verifier:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase9-benefits.ps1`
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

- benefits with and without cash salary are handled without UI-side valuation logic
- car benefit start in the middle of a month still produces the correct full-month taxable value when the rules require it
- taxable benefit events generate deterministic payroll lines, AGI mappings and posting intents
- employee payment and nettoloneavdrag reduce the taxable value only when the rule allows it
- the Phase 9.1 feature flag returns `503 feature_disabled` when turned off

## Suggested database spot checks

Run these from the repo root after migration and seeding:

```powershell
docker compose -f .\infra\docker\docker-compose.yml exec -T postgres `
  psql -U swedish_erp -d swedish_erp `
  -c "select count(*) as benefit_catalog from benefit_catalog;" `
  -c "select count(*) as benefit_events from benefit_events;" `
  -c "select count(*) as benefit_valuations from benefit_valuations;" `
  -c "select count(*) as benefit_posting_intents from benefit_posting_intents;" `
  -c "select count(*) as benefit_agi_mappings from benefit_agi_mappings;"
```

## Exit gate

FAS 9.1 can be marked complete only when:

- all targeted tests are green
- migration and both seed streams complete without manual patches
- benefits can be registered both with and without cash salary in the same deterministic engine
- bilforman start and stop behavior matches the configured month-valuation rule
- AGI payloads and payroll postings expose the same taxable benefit amount
- docs, gates, prompts and verify script are updated in the same change

