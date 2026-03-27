> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 12.1 verification

## Syfte

Verifiera att årsredovisningsmotorn kan skapa versionslåsta K2/K3-paket, spåra signatörer och tvinga fram ny version när bokföringsunderlaget ändras.

## När den används

- efter implementation av FAS 12.1
- före markering av 12.1 som klar
- efter ändringar i close, annual reporting eller reporting snapshots

## Förkrav

- ledger och reporting fungerar
- hårdstängd period finns för testbolaget
- migrations- och seedfiler för FAS 12.1 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase12-annual-reporting.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.

## Verifiering

- K2- och K3-profiler kan skapa årsredovisningspaket
- paket får checksumma och versionsnummer
- signatörskedja kan bjudas in och signeras spårbart
- ändrad bokföring efter reopen ger ny paketversion
- diff mellan versioner visar förändrat underlag

## Vanliga fel

- `annual_report_period_not_closed`: perioden är inte `hard_closed`
- `annual_report_profile_code_invalid`: profilkod är inte `k2` eller `k3`
- `annual_report_signatory_not_found`: fel användare försöker signera versionen

## Återställning

- reopen av period ska användas i stället för att skriva över gammal paketversion
- ny signering ska göras på ny version om bokföringen ändras

## Rollback

- rulla tillbaka kodcommit om regressionen ligger i paketlogiken
- rulla inte tillbaka signerad historik; skapa ny version och supersedera den gamla

## Ansvarig

- huvudagenten som levererar FAS 12.1

## Exit gate

- K2/K3-spår fungerar
- årsredovisningspaket är versionslåsta
- signering och diffad ny version fungerar

