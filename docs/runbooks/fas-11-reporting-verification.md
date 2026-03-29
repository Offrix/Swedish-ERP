> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 11.1 reporting and drilldown verification

## Syfte

Denna runbook verifierar att FAS 11.1 levererar historiskt reproducerbara rapporter, drilldown till källdokument, ett lätt rapportbyggarflöde och exportjobb för Excel/PDF.

## När den används

- efter implementation av FAS 11.1
- före commit eller push av FAS 11.1
- vid regressionskontroll av rapporter, drilldown, metric catalog och exportjobb

## Förkrav

- Docker-infra är uppe om riktiga migrationer och seeds ska köras
- repo ligger på korrekt branch och arbetskatalog
- FAS 3.1, FAS 3.2, FAS 3.3, FAS 5.3, FAS 6.3 och FAS 10.1 är redan verifierade

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs unit`.
5. Kör `node scripts/run-tests.mjs integration`.
6. Kör `node scripts/run-tests.mjs e2e`.
7. Kör `node scripts/security-scan.mjs`.
8. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase11-reporting.ps1`.
9. Kör `node scripts/db-migrate.mjs --dry-run`.
10. Kör `node scripts/db-seed.mjs --dry-run`.
11. Kör `node scripts/db-seed.mjs --demo --dry-run`.
12. Om lokal infra är tillgänglig, kör `node scripts/db-migrate.mjs`.
13. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs`.
14. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- `trial_balance`, `income_statement`, `balance_sheet`, `cashflow`, `ar_open_items`, `ap_open_items` och `project_portfolio` kan materialiseras som reportsnapshots
- samma reportsnapshot går att läsa tillbaka efter senare bokningar utan att siffrorna ändras
- report line drilldown returnerar journal entries, snapshotreferenser eller länkade dokument beroende på källa
- metric catalog visar versionsstyrda mått med stabila koder och ägarskap
- custom report definitions kan skapas ovanpå officiella källrapporter utan att bryta reproducerbarhet
- exportjobb för Excel/PDF materialiseras med snapshot-hash, watermark mode och spårbar jobbhistorik

## Vanliga fel

- `report_definition_not_found`
  Kontrollera att `reportCode` finns bland officiella eller custom definitioner för aktuellt bolag.
- `metric_definition_not_found`
  Kontrollera att alla metrics i custom definitionen finns i metric catalog för samma bolag/version.
- `report_export_job_not_found`
  Kontrollera att `reportExportJobId` tillhör aktuellt bolag och inte har blivit superseded av nyare snapshot.
- `period_window_required`
  Kontrollera att antingen `accountingPeriodId` eller giltigt datumintervall skickas.

## Återställning

- ta bort lokala testdata genom att återköra databasen från scratch om demo-seed gjort miljön svårtolkad
- skapa ny custom definition-version i stället för att mutera gammal definition
- skapa ny exportjobbskörning i stället för att skriva över tidigare levererad artefakt

## Rollback

- återställ commit om FAS 11.1 måste dras tillbaka
- behåll migreringsordningen intakt; skapa ny kompensationsmigrering i stället för att redigera gammal migrering
- markera FAS 11.1 som ej verifierad i styrdokumenten om rollback görs

## Ansvarig

- huvudansvar: teknikgenomförare för repo
- granskningsansvar: finance/controller-ansvarig för rapportdefinitioner och metric governance

## Exit gate

- [ ] rapporter är historiskt reproducerbara
- [ ] belopp kan spåras till källdokument eller stödjande snapshot
- [ ] export till Excel/PDF fungerar
- [ ] migration, seeds, tester och verifieringsscript är gröna

