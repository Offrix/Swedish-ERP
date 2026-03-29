> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 11.2 bureau portfolio verification

## Syfte

Denna runbook verifierar att FAS 11.2 levererar byråportfölj, scope-filtrering, deadlinehärledning från bolagsinställningar, klientbegäranden, approval packages, massåtgärder och spårbara work items utan att lägga domänlogik i UI.

## När den används

- efter implementation av FAS 11.2
- före commit eller push av FAS 11.2
- vid regressionskontroll av byråscope, klientstatus, requests, approvals och samarbetsflöden

## Förkrav

- Docker-infra är uppe om riktiga migrationer och seeds ska köras
- repo ligger på korrekt branch och arbetskatalog
- FAS 11.1 är redan verifierad

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs unit`.
5. Kör `node scripts/run-tests.mjs integration`.
6. Kör `node scripts/run-tests.mjs e2e`.
7. Kör `node scripts/security-scan.mjs`.
8. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase11-bureau.ps1`.
9. Kör `node scripts/db-migrate.mjs --dry-run`.
10. Kör `node scripts/db-seed.mjs --dry-run`.
11. Kör `node scripts/db-seed.mjs --demo --dry-run`.
12. Om lokal infra är tillgänglig, kör `node scripts/db-migrate.mjs`.
13. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs`.
14. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- byråanvändare ser endast klienter i aktiv portfolio membership eller med administrativt scope
- deadline för requests och approval packages härleds deterministiskt från `settingsJson.bureauDelivery`
- dokumentbegäranden kan skickas, besvaras, accepteras och spåras per klient, period och objekt
- approval packages pekar på versionsbundet underlag och named approver-regel bryts inte
- massåtgärder returnerar per-klient-resultat utan att göra körningen odeterministisk
- work items och kommentarer skapar spårbar auditkedja för ansvarig konsult och klientinteraktion

## Vanliga fel

- `portfolio_membership_overlap`
  Kontrollera att klienten inte redan har en aktiv portfolio membership som överlappar samma tidsfönster.
- `client_deadline_settings_missing`
  Kontrollera att klientbolaget har fullständig `bureauDelivery` i `settingsJson`.
- `bureau_scope_denied`
  Kontrollera att användaren är ansvarig konsult, backup-konsult eller har `company.manage` i byråbolaget.
- `approver_mismatch`
  Kontrollera att approval response kommer från namngiven approver eller uttryckligen delegerat ombud.

## Återställning

- rensa lokala testdata genom att återköra databasen från scratch om demo-seed gjort miljön svårläst
- skapa nytt request eller nytt approval package i stället för att skriva om gammal historik
- skapa ny portfolio membership-version i stället för att mutera tidigare ansvarskedja retroaktivt

## Rollback

- återställ commit om FAS 11.2 måste dras tillbaka
- behåll migreringsordningen intakt; skapa kompensationsmigrering i stället för att skriva om gammal migrering
- markera FAS 11.2 som ej verifierad i styrdokumenten om rollback görs

## Ansvarig

- huvudansvar: teknikgenomförare för repo
- granskningsansvar: byråansvarig eller leveransansvarig för klientportfölj, deadlines och approvals

## Exit gate

- [ ] byrån ser bara klienter i scope
- [ ] deadlines härleds från bolagsinställningar
- [ ] klientdokument kan begäras och spåras
- [ ] massåtgärder och auditkedja är verifierade
- [ ] migration, seeds, tester och verifieringsscript är gröna

