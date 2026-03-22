# FAS 6.1 AP masterdata verification

## Syfte

Verifiera att FAS 6.1 levererar leverantörsregister, inköpsorder, mottagningsobjekt, importflöden, dubblettskydd och disable-strategi enligt styrdokumenten.

## När den används

- efter implementation av FAS 6.1
- före commit och push
- efter större refaktor av AP masterdata, PO eller mottagning

## Förkrav

- repo ligger på rätt branch och working tree är förstådd
- Node och pnpm matchar låsta versioner
- Docker-baserad lokal databas kan startas om verklig migrering ska köras
- feature flag `PHASE6_AP_ENABLED` är satt till `true` för verifiering av aktiva AP-rutter

## Steg för steg

1. Kör statiska kontroller:
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
2. Kör riktade AP-tester:
   - `node --test tests/unit/ap-phase6-1.test.mjs`
   - `node --test tests/integration/phase6-ap-masterdata-api.test.mjs`
   - `node --test tests/e2e/phase6-ap-masterdata-flow.test.mjs`
3. Kör hela testsuiten:
   - `node scripts/run-tests.mjs all`
4. Kör verify-script:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase6-ap-masterdata.ps1`
5. Verifiera migrationsordning och seed-ordning:
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Om Docker-infra är uppe, kör verklig migrering och seed:
   - `node scripts/db-migrate.mjs`
   - `node scripts/db-seed.mjs`
   - `node scripts/db-seed.mjs --demo`
7. Verifiera att API root visar `phase6ApEnabled: true`.
8. Verifiera att `PHASE6_AP_ENABLED=false` ger `503` på `/v1/ap/*`.

## Verifiering

Fasen är verifierad först när följande är gröna:

- leverantörer kan skapas och importeras idempotent
- bankdetaljändring sätter betalningsspärr och auditspår
- PO ärvda defaults fungerar för konto, moms och pris
- PO kan inte skickas utan godkännande
- mottagning kan registreras mot PO-linje
- mottagning kan filtreras på `supplierInvoiceReference`
- dubblettskydd returnerar samma receipt vid identisk extern referens eller identisk hashad payload
- överleverans över tolerans blockeras
- seed och demo-seed innehåller leverantör, kontakt, toleransprofil, PO, receipt, importbatch och invoice-receipt-link

## Vanliga fel

- `supplier_import_batch_conflict`
  Batch key har återanvänts med annan payload.
- `purchase_order_import_update_blocked`
  Import försöker ändra PO som redan fått mottagning eller stängts.
- `purchase_order_must_be_approved`
  Flödet försöker skicka en draft-PO.
- `receipt_overdelivery_exceeded`
  Summerad mottagen mängd överstiger tillåten tolerans.
- `feature_disabled`
  `PHASE6_AP_ENABLED` är avstängd.

## Återställning

- återställ feature flag till tidigare läge om AP-rutter måste stängas
- rulla tillbaka lokala seedade testdata genom att återskapa databasen i Docker om verifieringen kräver ren miljö
- revert:a ej manuellt skapade användarändringar utan uttrycklig instruktion

## Rollback

- sätt `PHASE6_AP_ENABLED=false` för att stoppa AP-rutter utan att stänga hela API-processen
- om en migration måste dras tillbaka används ny korrigerande migration i stället för att skriva om historik

## Ansvarig

- huvudagent eller utvecklare som implementerar FAS 6.1

## Exit gate

- [ ] Leverantörer och PO kan importeras
- [ ] Mottagning kopplar till faktura
- [ ] Dubblettskydd finns
- [ ] Disable-strategi fungerar
- [ ] Seed och demo-seed verifierar samma flöden
