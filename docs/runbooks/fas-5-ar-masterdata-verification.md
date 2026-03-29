> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 5.1 AR masterdata verification

## Syfte

Denna runbook verifierar att FAS 5.1 levererar kundregister, kontaktpersoner, artiklar, prislistor, versionsstyrda offerter, avtal med korrekt fakturaplan och idempotent kundimport.

## Nar den anvands

- efter implementation av FAS 5.1
- fore commit eller push av FAS 5.1
- vid regressionskontroll av AR-masterdata, offerter, avtal eller kundimport

## Forkrav

- Docker-infra ar uppe om riktiga migrationer och seeds ska koras
- repo ligger pa korrekt branch och arbetskatalog
- FAS 4.3 ar redan verifierad

## Steg for steg

1. Kor `node scripts/lint.mjs`.
2. Kor `node scripts/typecheck.mjs`.
3. Kor `node scripts/build.mjs`.
4. Kor `node scripts/run-tests.mjs unit`.
5. Kor `node scripts/run-tests.mjs integration`.
6. Kor `node scripts/run-tests.mjs e2e`.
7. Kor `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase5-ar-masterdata.ps1`.
8. Kor `node scripts/db-migrate.mjs --dry-run`.
9. Kor `node scripts/db-seed.mjs --dry-run`.
10. Kor `node scripts/db-seed.mjs --demo --dry-run`.
11. Om lokal infra ar tillganglig, kor `node scripts/db-migrate.mjs`.
12. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs`.
13. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs --demo`.

## Verifiering

- kundnummer ar unika per bolag
- kundimport kan koras idempotent med samma `batchKey` och samma payload
- ny kundimportbatch kan uppdatera befintlig kund utan att skapa dublett
- prislistor validerar datumintervall och rader overlappar inte per artikel och valuta
- offert skickas i en version och revidering skapar ny draft-version utan att skriva over tidigare utskickad version
- endast accepterad offert far konverteras till avtal
- aktivt avtal genererar fakturaplan utan luckor eller overlagringar
- fakturaplan forklarar periodstart, periodslut och planerat fakturadatum per rad

## Vanliga fel

- `customer_no_not_unique`
  Kontrollera att kundnumret inte redan finns i samma bolag.
- `peppol_fields_incomplete`
  Kontrollera att Peppol-scheme och Peppol-identifierare skickas tillsammans.
- `vat_code_not_found`
  Kontrollera att artikeln pekar pa en VAT-kod som finns i bolagets VAT-masterdata.
- `quote_transition_invalid`
  Kontrollera att offertens status foljer kedjan `draft -> sent -> accepted/rejected/expired -> converted`.
- `quote_must_be_accepted`
  Kontrollera att offerten forst ar accepterad innan den konverteras till aktivt avtal.
- `invoice_plan_gap_or_overlap`
  Kontrollera att avtalets start- och slutdatum samt frekvens skapar en sammanhangande periodkedja.
- `customer_import_batch_conflict`
  Kontrollera att samma `batchKey` inte ateranvands med annan payload.

## Aterstallning

- skapa ny offertversion i stallet for att mutera en skickad offert
- skapa nytt avtal eller avsluta gammalt avtal i stallet for att skriva om historisk fakturaplan
- skapa ny importbatch med nytt `batchKey` om korrigerat underlag behover koras

## Rollback

- aterstall commit om FAS 5.1 maste dras tillbaka
- behall migreringsordningen intakt; skapa kompensationsmigrering i stallet for att redigera gammal migrering
- markera FAS 5.1 som ej verifierad i styrdokumenten om rollback gors

## Ansvarig

- huvudansvar: teknikgenomforare for repo
- granskningsansvar: redovisnings- eller order-to-cash-ansvarig for kunddata, offerter, avtal och fakturaplan

## Exit gate

- [ ] Offerter versionshanteras
- [ ] Avtal genererar korrekt fakturaplan
- [ ] Kunddata kan importeras
- [ ] migration, seeds, tester och verifieringsscript ar grona

