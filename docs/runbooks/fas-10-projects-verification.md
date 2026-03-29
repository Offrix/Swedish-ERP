> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 10.1 projects verification

## Scope

Verifiera att FAS 10.1 levererar:
- projekt med fakturerings- och intaktsforingsmodell
- versionerade projektbudgetar
- resursallokering med planerade minuter och bill rate
- actual cost snapshots med lon, formaner, pension och resor
- WIP tie-out mot AR-fakturering
- forecast at completion och resursbelaggning

## Required checks

1. Kor `node scripts/lint.mjs`.
2. Kor `node scripts/typecheck.mjs`.
3. Kor `node scripts/build.mjs`.
4. Kor `node scripts/run-tests.mjs unit`.
5. Kor `node scripts/run-tests.mjs integration`.
6. Kor `node scripts/run-tests.mjs e2e`.
7. Kor `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-phase10-projects.ps1`.
8. Kor `node scripts/db-migrate.mjs --dry-run`.
9. Kor `node scripts/db-seed.mjs --dry-run`.
10. Kor `node scripts/db-seed.mjs --demo --dry-run`.

## Expected outcome

- unit-tester verifierar projektbudget, WIP, cost breakdown, forecast och resursbelaggning
- integrationstester verifierar migration, seeds, project routes, snapshot-materialisering och feature flag
- e2e-tester verifierar projektflode fran projekt och budget till AR-tie-out och forecast
- verify-scriptet hittar alla artefakter for FAS 10.1
- migration och seeds ligger i korrekt ordning efter FAS 9.3

## Exit gate

- [x] Projektkostnad inkluderar lon, formaner, pension och resor
- [x] WIP kan stammas av mot fakturering
- [x] Forecast at completion fungerar
- [x] Projektrutter kan stangas av utan att ovriga API:t dor

