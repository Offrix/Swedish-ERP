# FAS 9.2 travel verification

## Scope

Verifiera att FAS 9.2 levererar:
- tjansteresa som objekt
- inrikes och utrikes traktamente
- 50 km-regel och overnattningskrav
- maltidsreduktion
- bilersattning och korjournalunderlag
- utlagg och reseforskott
- payroll-, AGI- och bokforingskoppling

## Required checks

1. Kor `node scripts/lint.mjs`.
2. Kor `node scripts/typecheck.mjs`.
3. Kor `node scripts/build.mjs`.
4. Kor `node scripts/run-tests.mjs unit`.
5. Kor `node scripts/run-tests.mjs integration`.
6. Kor `node scripts/run-tests.mjs e2e`.
7. Kor `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-phase9-travel.ps1`.
8. Kor `node scripts/db-migrate.mjs --dry-run`.
9. Kor `node scripts/db-seed.mjs --dry-run`.
10. Kor `node scripts/db-seed.mjs --demo --dry-run`.

## Expected outcome

- unit-tester verifierar inrikes heldag, utlandsresa over flera lander och payrollkoppling
- integrationstester verifierar travel-API, posting, AGI och feature flag
- e2e-tester verifierar multilandresa, skattepliktig milersattning och audit trail
- verify-scriptet hittar alla artefakter for FAS 9.2
- migration och seeds ligger i korrekt ordning efter FAS 9.1

## Exit gate

- [x] 50 km-krav och overnattning styr korrekt
- [x] Maltidsreduktion minskar ratt
- [x] Overskjutande del blir lon
- [x] Mileage, utlagg och reseforskott paverkar payroll deterministiskt
- [x] Travel routes kan stangas av utan att ovriga API:t dor
