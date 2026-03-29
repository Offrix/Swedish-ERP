> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 6.2 AP invoice ingest and matching verification

## Syfte

Verifiera att FAS 6.2 levererar leverantorsfakturaingest, OCR/radniva, forklarbart momsforslag, 2-vags- och 3-vagsmatchning, variansstyrd review och korrekt AP-postning enligt styrdokumenten.

## Nar den anvands

- efter implementation av FAS 6.2
- fore commit och push
- efter andringar i dokumenttolkning, AP-matchning eller AP-postning

## Forkrav

- repo ligger pa ratt branch och working tree ar forstadd
- Node och pnpm matchar lasta versioner
- Docker-baserad lokal databas kan startas om verklig migrering ska koras
- feature flags `PHASE2_DOCUMENT_ARCHIVE_ENABLED`, `PHASE2_COMPANY_INBOX_ENABLED`, `PHASE2_OCR_REVIEW_ENABLED` och `PHASE6_AP_ENABLED` ar satta till `true` for aktiv verifiering

## Steg for steg

1. Kor statiska kontroller:
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
2. Kor riktade AP 6.2-tester:
   - `node --test tests/unit/ap-phase6-2.test.mjs`
   - `node --test tests/integration/phase6-ap-invoice-matching-api.test.mjs`
   - `node --test tests/e2e/phase6-ap-invoice-matching-flow.test.mjs`
3. Kor hela testsuiten:
   - `node scripts/run-tests.mjs all`
4. Kor verify-script:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase6-ap-invoice-matching.ps1`
5. Verifiera migrationsordning och seed-ordning:
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Om Docker-infra ar uppe, kor verklig migrering och seed:
   - `node scripts/db-migrate.mjs`
   - `node scripts/db-seed.mjs`
   - `node scripts/db-seed.mjs --demo`
7. Verifiera att API root visar `phase6ApEnabled: true`.
8. Verifiera att `PHASE6_AP_ENABLED=false` ger `503` pa `/v1/ap/*`.

## Verifiering

Fasen ar verifierad forst nar foljande ar grona:

- OCR-baserad leverantorsfaktura blir AP-draft med flera kodningsrader
- AP-ingest kan lasa leverantor, fakturanummer, datum, valuta, belopp och rader fran dokumentmotorn
- momsforslag per rad ar forklarbart och visar kontomappning eller revieworsak
- 2-vagsmatchning kan godkanna faktura utan receipt-krav
- 3-vagsmatchning skapar receipt-varians nar fakturerad kvantitet overstiger mottagen kvantitet
- reviewRequired blockerar postning tills avvikelserna ar losta
- postad faktura skapar journal med flera kostnadskonton, ingaende moms och AP-skuld
- seed och demo-seed innehaller baade godkant fler-radsflode och variansflode

## Vanliga fel

- `classification_low_confidence`
  Dokumenttypen nar inte kanalens auto-threshold och maste granskas innan AP-draft.
- `ocr_low_confidence`
  Viktiga fakturafalt eller raddata ar for svaga for automatisk AP-ingest.
- `duplicate_suspect`
  Fakturafingerprint eller dokumenthash tyder pa sannolik dubblett.
- `receipt_variance`
  Fakturerad kvantitet overstiger mottagen kvantitet i 3-vagsmatchning.
- `supplier_invoice_review_required`
  Fakturan har oppna review-koder eller varians och far inte postas.
- `feature_disabled`
  `PHASE6_AP_ENABLED` eller beroende dokumentflaggor ar avstangda.

## Aterstallning

- aterstall feature flags till tidigare lage om AP-rutter eller dokumentfloden maste stangas
- rensa lokal testdata genom att aterskapa databasen i Docker om verifieringen kraver ren miljo
- revert:a ej manuellt skapade anvandarandringar utan uttrycklig instruktion

## Rollback

- satt `PHASE6_AP_ENABLED=false` for att stoppa AP-rutter utan att stanga hela API-processen
- satt dokumentflaggor till `false` om OCR- eller dokumentingest maste stoppas separat
- om en migration maste dras tillbaka anvands ny korrigerande migration i stallet for att skriva om historik

## Ansvarig

- huvudagent eller utvecklare som implementerar FAS 6.2

## Exit gate

- [ ] Flera kostnadsrader bokas ratt
- [ ] Momsforslag kan forklaras
- [ ] Avvikelser kraver granskning
- [ ] Disable-strategi fungerar
- [ ] Seed och demo-seed verifierar samma floden

