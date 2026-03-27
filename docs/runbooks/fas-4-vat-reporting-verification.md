> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 4.3 VAT reporting verification

## Syfte

Denna runbook verifierar att FAS 4.3 levererar OSS/IOSS-klassificering, periodisk sammanstallning och reproducerbart momsdeklarationsunderlag som kan jamforas mot ledger-evidens.

## Nar den anvands

- efter implementation av FAS 4.3
- fore commit eller push av FAS 4.3
- vid regressionskontroll av OSS, IOSS, EU-lista eller momsrapporteringsunderlag

## Forkrav

- Docker-infra ar uppe om riktiga migrationer och seeds ska koras
- repo ligger pa korrekt branch och arbetskatalog
- FAS 4.2 ar redan verifierad

## Steg for steg

1. Kor `node scripts/lint.mjs`.
2. Kor `node scripts/typecheck.mjs`.
3. Kor `node scripts/build.mjs`.
4. Kor `node scripts/run-tests.mjs unit`.
5. Kor `node scripts/run-tests.mjs integration`.
6. Kor `node scripts/run-tests.mjs e2e`.
7. Kor `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase4-vat-reporting.ps1`.
8. Kor `node scripts/db-migrate.mjs --dry-run`.
9. Kor `node scripts/db-seed.mjs --dry-run`.
10. Kor `node scripts/db-seed.mjs --demo --dry-run`.
11. Om lokal infra ar tillganglig, kor `node scripts/db-migrate.mjs`.
12. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs`.
13. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs --demo`.

## Verifiering

- B2C-distansforsaljning under troskel landar i vanlig svensk momsrapportering
- OSS- och IOSS-underlag hamnar utanför vanlig momsdeklaration och sparar eurobelopp med anvand omrakningskurs
- periodisk sammanstallning grupperar EU-varor och EU-tjanster korrekt per VAT-nummer och land
- periodisk sammanstallning kan materialiseras flera ganger utan att forsta originalkorningsresultatet
- momsdeklarationsunderlag kan jamforas mot relevanta ledger-rader for samma underlag
- rattelsekorningar sparar previous submission, correction reason och andrade boxbelopp

## Vanliga fel

- `ioss_not_eligible`
  Kontrollera att `consignment_value_eur` ar satt till 150 eller lagre for IOSS-flodet.
- `ecb_exchange_rate_required`
  Kontrollera att icke-EUR-transaktioner som gar till OSS eller IOSS skickar `ecb_exchange_rate_to_eur`.
- `vat_declaration_run_date_range_invalid`
  Kontrollera att `fromDate` inte ligger efter `toDate`.
- `vat_periodic_statement_run_not_found`
  Kontrollera att rattelsekorningen refererar till en tidigare periodic statement-run i samma bolag.
- `ledger_totals_do_not_match`
  Kontrollera att relevanta ledger-rader finns for samma `sourceType` och `sourceId` som momsbeslutet.

## Aterstallning

- skapa nytt underlag med nytt `source_id` om du behover kor samma scenario igen utan idempotent replay
- skapa ny declarations- eller periodic statement-korning i stallet for att skriva over en gammal korning
- skapa nytt regelpaket i stallet for att mutera gammal historik om rapporteringslogiken andras

## Rollback

- aterstall commit om FAS 4.3 maste dras tillbaka
- behall migreringsordningen intakt; skapa kompensationsmigrering i stallet for att redigera gammal migrering
- markera FAS 4.3 som ej verifierad i styrdokumenten om rollback gors

## Ansvarig

- huvudansvar: teknikgenomforare for repo
- granskningsansvar: moms- eller redovisningsansvarig for OSS/IOSS, EU-lista och deklarationsunderlag

## Exit gate

- [ ] B2C-distansforsaljning landar ratt
- [ ] EU-lista kan skapas om och om igen
- [ ] Momsrapport stammer mot ledgern
- [ ] migration, seeds, tester och verifieringsscript ar grona

