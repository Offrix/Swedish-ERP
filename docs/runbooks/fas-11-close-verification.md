> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 11.3 verification

## Syfte

Verifiera att close workbench, bokslutschecklistor, blockers, sign-off och reopen fungerar enligt FAS 11.3.

## När den används

- efter implementation av FAS 11.3
- före markering av 11.3 som klar i styrdokumenten
- vid regressionskontroll efter ändringar i close, reporting eller periodlåsning

## Förkrav

- repo är bootstrapat
- test- och verifieringskommandon kan köras lokalt
- databasmigreringar och seeds för FAS 11.3 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase11-close.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.
10. Kör `node scripts/db-migrate.mjs`.
11. Kör `node scripts/db-seed.mjs`.
12. Kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- close workbench-rutter syns i API-rooten
- checklista kan skapas för portföljklient och period
- signed reconciliation runs kan kopplas till bank, AR, AP och VAT-steg
- öppna `hard_stop` blockers stoppar sign-off
- waiver med senior finance-roll tillåter fortsatt sign-off
- komplett sign-off-kedja leder till `hard_closed`
- reopen skapar ny checklistversion och supersedar tidigare sign-off
- samma period kan återskapas med samma rapportutfall

## Vanliga fel

- `close_signoff_chain_required`: sign-off chain saknas i create-checklist-anropet
- `reconciliation_not_ready`: steg försöker använda avstämning som inte är signerad
- `close_blocker_open`: `hard_stop` eller `critical` blocker är fortfarande öppen
- `senior_finance_role_required`: reopen eller override saknar senior finance-approver
- `dual_control_required`: samma person försöker vara både requester och approver

## Återställning

- ta bort testdata genom att starta om lokal testmiljö och köra om seeds
- om period har låsts felaktigt, använd reopen-flödet i stället för att skriva över historik

## Rollback

- rulla tillbaka commit som introducerade FAS 11.3 om regressionen är i kod
- rulla inte tillbaka signerad historik i databasen; använd reopen och ny version

## Ansvarig

- huvudagenten som levererar FAS 11.3

## Exit gate

- alla steg ovan gröna
- close workbench, blockers, sign-off och reopen verifierade
- FAS 11.3 kan markeras klar i plan och verifieringsgrindar

