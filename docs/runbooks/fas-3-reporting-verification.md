> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 3.3 reporting and reconciliation verification

## Syfte

Denna runbook verifierar att FAS 3.3 levererar historiskt reproducerbara rapporter, drilldown till källdokument och avstämningsobjekt med signerad evidence-snapshot.

## När den används

- efter implementation av FAS 3.3
- före commit eller push av FAS 3.3
- vid regressionskontroll av reporting-, ledger- eller dokumentlänksflöden

## Förkrav

- Docker-infra är uppe om riktiga migrationer och seeds ska köras
- repo ligger på korrekt branch och arbetskatalog
- FAS 3.1 och FAS 3.2 är redan verifierade

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs unit`.
5. Kör `node scripts/run-tests.mjs integration`.
6. Kör `node scripts/run-tests.mjs e2e`.
7. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase3-reporting.ps1`.
8. Kör `node scripts/db-migrate.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --dry-run`.
10. Kör `node scripts/db-seed.mjs --demo --dry-run`.
11. Om lokal infra är tillgänglig, kör `node scripts/db-migrate.mjs`.
12. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs`.
13. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- `trial_balance`, `income_statement` och `balance_sheet` kan materialiseras som reportsnapshots
- samma reportsnapshot går att läsa tillbaka efter senare bokningar utan att siffrorna ändras
- report line drilldown returnerar journal entries och länkade dokument
- journal search kan filtrera på snapshot, konto och fritext
- reconciliation run sparar snapshot hash och kan signeras med evidence refs
- sign-off pekar på exakt samma evidence snapshot som reconciliation run byggdes från

## Vanliga fel

- `report_definition_not_found`
  Kontrollera att `reportCode` är en av `trial_balance`, `income_statement` eller `balance_sheet`.
- `period_window_required`
  Kontrollera att antingen `accountingPeriodId` eller giltigt datumintervall skickas.
- `report_line_not_found`
  Kontrollera att `lineKey` motsvarar ett konto som faktiskt finns i snapshoten.
- `reconciliation_not_ready_for_signoff`
  Kontrollera att alla differenser är `resolved` eller `waived`, eller att subledgerbeloppet matchar ledgern.

## Återställning

- ta bort lokala testdata genom att återköra databasen från scratch om demo-seed gjort miljön svårtolkad
- kör om reportsnapshot från nytt id i stället för att mutera gammal snapshot
- skapa ny reconciliation run-version i stället för att skriva över signerad version

## Rollback

- återställ commit om FAS 3.3 måste dras tillbaka
- behåll migreringsordningen intakt; skapa ny kompensationsmigrering i stället för att redigera gammal migrering
- markera FAS 3.3 som ej verifierad i styrdokumenten om rollback görs

## Ansvarig

- huvudansvar: teknikgenomförare för repo
- granskningsansvar: finance-/close-ansvarig för sign-off-flödet

## Exit gate

- [ ] reportsnapshots är historiskt reproducerbara
- [ ] drilldown når journal och länkade dokument
- [ ] reconciliation sign-off sparar evidence snapshot
- [ ] migration, seeds, tester och verifieringsscript är gröna

