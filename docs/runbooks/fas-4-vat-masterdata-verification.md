# FAS 4.1 VAT masterdata and decision verification

## Syfte

Denna runbook verifierar att FAS 4.1 levererar VAT masterdata, datumstyrda regelpaket, spårbara momsbeslut och granskningskö för oklara fall.

## När den används

- efter implementation av FAS 4.1
- före commit eller push av FAS 4.1
- vid regressionskontroll av VAT masterdata, regelpaket eller beslutsobjekt

## Förkrav

- Docker-infra är uppe om riktiga migrationer och seeds ska köras
- repo ligger på korrekt branch och arbetskatalog
- FAS 3.1, 3.2 och 3.3 är redan verifierade

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs unit`.
5. Kör `node scripts/run-tests.mjs integration`.
6. Kör `node scripts/run-tests.mjs e2e`.
7. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase4-vat.ps1`.
8. Kör `node scripts/db-migrate.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --dry-run`.
10. Kör `node scripts/db-seed.mjs --demo --dry-run`.
11. Om lokal infra är tillgänglig, kör `node scripts/db-migrate.mjs`.
12. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs`.
13. Om lokal infra är tillgänglig, kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- `GET /v1/vat/codes` returnerar VAT masterdata med deklarationsboxar och bokföringsmallar
- `GET /v1/vat/rule-packs` returnerar datumstyrda regelpaket för svensk momsdomän
- `POST /v1/vat/decisions` returnerar spårbart beslut med `inputsHash`, `rulePackId`, `effectiveDate`, warnings och förklaring
- historiska beslutsdatum landar i rätt regelpaket utan att senare regelpaket skrivs över
- transaktioner med saknade eller motsägelsefulla VAT-fakta går till granskningskö i stället för tyst auto-bokning

## Vanliga fel

- `rule_pack_not_found`
  Kontrollera att `tax_date` eller `invoice_date` ligger inom ett seedat VAT-regelpakets datumintervall.
- `unknown_vat_code_candidate`
  Kontrollera att `vat_code_candidate` finns i VAT masterdata.
- `missing_mandatory_vat_fields`
  Kontrollera att alla obligatoriska VAT-fält skickas i transaktionsraden.
- `candidate_conflicts_with_inputs`
  Kontrollera att kandidatkodens struktur stämmer med land, EU-status, reverse charge eller export/import-flaggor.

## Återställning

- återkör beslut med nytt `source_id` om du behöver jämföra flera VAT-scenarier utan att bryta idempotent replay
- skapa nytt regelpaket i stället för att mutera gammalt paket om en regel ändras
- skapa ny review queue-post genom nytt underlag i stället för att skriva över gammal förklaring

## Rollback

- återställ commit om FAS 4.1 måste dras tillbaka
- behåll migreringsordningen intakt; skapa kompensationsmigrering i stället för att redigera gammal migrering
- markera FAS 4.1 som ej verifierad i styrdokumenten om rollback görs

## Ansvarig

- huvudansvar: teknikgenomförare för repo
- granskningsansvar: moms- eller redovisningsansvarig för VAT-beslut och granskningskö

## Exit gate

- [ ] alla transaktionstyper får ett spårbart momsbeslut
- [ ] historiska regler kan återspelas
- [ ] oklara fall går till granskningskö
- [ ] migration, seeds, tester och verifieringsscript är gröna
