> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 9.3 pension verification

## Scope

Verifiera att FAS 9.3 levererar:
- ITP1, ITP2 och Fora-underlag med korrekt rapporteringsmodell
- extra pension som separat premiumstrom
- lonevaxling med simulering, traskelvarning och payslip-paverkan
- policyversion, effective dating och pinade lonevaxlingsregler per period
- pensionsmedforande lon fore och efter lonevaxling
- sarskild loneskatt pa pensionskostnader
- pensionsrapportering, providergruppering, provider-exportinstruktioner och fakturaavstamning
- payroll-, bokforings- och auditkoppling

## Required checks

1. Kor `node scripts/lint.mjs`.
2. Kor `node scripts/typecheck.mjs`.
3. Kor `node scripts/build.mjs`.
4. Kor `node scripts/run-tests.mjs unit`.
5. Kor `node scripts/run-tests.mjs integration`.
6. Kor `node scripts/run-tests.mjs e2e`.
7. Kor `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-phase9-pension.ps1`.
8. Kor `node scripts/db-migrate.mjs --dry-run`.
9. Kor `node scripts/db-seed.mjs --dry-run`.
10. Kor `node scripts/db-seed.mjs --demo --dry-run`.

## Expected outcome

- unit-tester verifierar ITP1, ITP2, Fora, extra pension, lonevaxling och sarskild loneskatt
- unit-tester verifierar pinned salary-exchange-policy, special payroll tax rate och payroll input snapshot
- integrationstester verifierar pension-API, payrollkoppling, bokforing, rapportering, provider-exportinstruktion och feature flag
- e2e-tester verifierar providerseparerade rapporter, lonevaxling och fakturaavstamning
- verify-scriptet hittar alla artefakter for FAS 9.3
- migration och seeds ligger i korrekt ordning efter FAS 9.2

## Exit gate

- [x] Rapportunderlag per kollektivavtal stammer
- [x] Lonevaxling varnar under troskel
- [x] Lonevaxlingspolicy och sarskild loneskatt ar pinade per period
- [x] Pension bokfors och avstams
- [x] Provider-exportinstruktion finns pa rapportobjekt och report lines
- [x] Pensionsrutter kan stangas av utan att ovriga API:t dor

