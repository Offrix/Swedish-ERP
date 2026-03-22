# FAS 5.3 AR receivables verification

## Syfte

Denna runbook verifierar att FAS 5.3 levererar oppna poster, delbetalningar, felmatchningsreversal, bankmatchning, paminnelseflode, writeoff-stod och deterministisk aldersanalys.

## Nar den anvands

- efter implementation av FAS 5.3
- fore commit eller push av FAS 5.3
- vid regressionskontroll av kundreskontra, paminnelser, bankmatchning eller aging

## Forkrav

- Docker-infra ar uppe om riktiga migrationer och seeds ska koras
- repo ligger pa korrekt branch och arbetskatalog
- FAS 5.2 ar redan verifierad

## Steg for steg

1. Kor `node scripts/lint.mjs`.
2. Kor `node scripts/typecheck.mjs`.
3. Kor `node scripts/build.mjs`.
4. Kor `node scripts/run-tests.mjs unit`.
5. Kor `node scripts/run-tests.mjs integration`.
6. Kor `node scripts/run-tests.mjs e2e`.
7. Kor `node scripts/security-scan.mjs`.
8. Kor `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase5-ar-receivables.ps1`.
9. Kor `node scripts/db-migrate.mjs --dry-run`.
10. Kor `node scripts/db-seed.mjs --dry-run`.
11. Kor `node scripts/db-seed.mjs --demo --dry-run`.
12. Om lokal infra ar tillganglig, kor `node scripts/db-migrate.mjs`.
13. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs`.
14. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs --demo`.

## Verifiering

- issue av debiterbar faktura skapar exakt en oppen post som ar sparbar till faktura och journal
- delbetalning minskar restbelopp utan att skriva over historik
- bankmatchning skapar allocation med serie `D` och `AR_PAYMENT` som kalltyp
- overbetalning landar i unmatched receipt i stallet for att tyst stanga fordran
- felmatchning kan reverseras sa att oppen post ateroppnas och receipt trail bevaras
- tvistade eller hold-markerade poster gar inte automatiskt till paminnelse, inkasso eller writeoff
- paminnelseavgift och ranteberakning bokforas deterministiskt och pa samma underlag vid omkorning
- aging snapshot lagrar bucket summeringar och kundsummeringar med reproducerbar hash

## Vanliga fel

- `allocation_exceeds_open_amount`
  Kontrollera att allocation inte overstiger oppet restbelopp pa posten.
- `allocation_exceeds_unmatched_receipt`
  Kontrollera att allokeringen inte overstiger kvarvarande unmatched receipt.
- `ar_payment_transactions_required`
  Kontrollera att bankmatchningskorningen far minst en transaktion.
- `dunning_hold`
  Kontrollera om posten ar tvistad, satt pa hold eller redan stangd for automatisk atgard.
- `writeoff_approval_required`
  Kontrollera att writeoff over policygrans har godkand attest innan bokning.
- `aging_snapshot_conflict`
  Kontrollera att samma cutoff och datamodell inte forsokts lagras med motsagande payload.

## Aterstallning

- reversera fel allocation i stallet for att skriva om betalhistorik
- skapa ny bankmatchningskorning eller ny unmatched receipt-allokering i stallet for att mutera tidigare run
- skapa ny paminnelsekorning eller writeoff-post i stallet for att skriva over historiska reskontrahandelser

## Rollback

- aterstall commit om FAS 5.3 maste dras tillbaka
- behall migreringsordningen intakt; skapa kompensationsmigrering i stallet for att redigera gammal migrering
- markera FAS 5.3 som ej verifierad i styrdokumenten om rollback gors

## Ansvarig

- huvudansvar: teknikgenomforare for repo
- granskningsansvar: order-to-cash-ansvarig for kundreskontra, bankmatchning, paminnelser och writeoff-policy

## Exit gate

- [ ] Delbetalningar hanteras
- [ ] Felmatchningar kan backas
- [ ] Aldersanalys ar korrekt
- [ ] migration, seeds, tester och verifieringsscript ar grona
