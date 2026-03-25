# FAS 5.2 AR invoicing verification

## Syfte

Denna runbook verifierar att FAS 5.2 levererar standard-, kredit-, del- och abonnemangsfakturor med korrekt issue-idempotens, leveranskanaler och betalningslänkar.

## Nar den anvands

- efter implementation av FAS 5.2
- fore commit eller push av FAS 5.2
- vid regressionskontroll av kundfakturor, kreditfakturor, Peppol-leverans eller betallankar

## Forkrav

- Docker-infra ar uppe om riktiga migrationer och seeds ska koras
- repo ligger pa korrekt branch och arbetskatalog
- FAS 5.1 ar redan verifierad

## Steg for steg

1. Kor `node scripts/lint.mjs`.
2. Kor `node scripts/typecheck.mjs`.
3. Kor `node scripts/build.mjs`.
4. Kor `node scripts/run-tests.mjs unit`.
5. Kor `node scripts/run-tests.mjs integration`.
6. Kor `node scripts/run-tests.mjs e2e`.
7. Kor `node scripts/security-scan.mjs`.
8. Kor `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase5-ar-invoicing.ps1`.
9. Kor `node scripts/db-migrate.mjs --dry-run`.
10. Kor `node scripts/db-seed.mjs --dry-run`.
11. Kor `node scripts/db-seed.mjs --demo --dry-run`.
12. Om lokal infra ar tillganglig, kor `node scripts/db-migrate.mjs`.
13. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs`.
14. Om lokal infra ar tillganglig, kor `node scripts/db-seed.mjs --demo`.

## Verifiering

- samma issue-anrop skapar inte en andra journal eller branner nytt fakturanummer
- kreditfaktura anvander serie `C` och stanger korrekt rest pa ursprungsfakturan
- standard-, del- och abonnemangsfakturor kan skapas utan att lagga domanlogik i UI
- PDF-leverans kraver mottagare och Peppol-leverans kraver strukturerad mottagare plus buyer reference eller order reference
- betalningslank far bara skapas for utstalld debiterbar faktura och krav pa explicit provider code verifieras
- kundfordringskonto valjs efter geografi och utgaende moms landar pa ratt 2610/2620/2630-konto

## Vanliga fel

- `ledger_platform_missing`
  Kontrollera att ledger-katalogen ar installerad innan issue.
- `invoice_validation_failed`
  Kontrollera att kunden inte ar blockerad for invoicing och att datum, kund och rader ar kompletta.
- `credit_link_missing`
  Kontrollera att kreditfakturan pekar pa en giltig ursprungsfaktura.
- `credit_amount_exceeds_original`
  Kontrollera att kreditbeloppet inte overstiger kvarvarande krediterbart belopp.
- `peppol_identifier_missing`
  Kontrollera att kunden har Peppol-scheme och identifierare.
- `peppol_reference_missing`
  Kontrollera att buyer reference eller order reference skickas vid outbound Peppol.
- `payment_link_not_allowed_for_credit_note`
  Kontrollera att betalningslank inte skapas for kreditfakturor.
- `payment_link_provider_code_required`
  Kontrollera att anropet anger explicit provider code; demo- eller sandboxprovider far inte antas tyst.

## Aterstallning

- skapa ny kreditfaktura eller ny standardfaktura i stallet for att mutera issued historik
- skapa ny leverans med korrekt kanal eller referens i stallet for att skriva over tidigare teknisk leverans
- skapa nytt issueforsok via samma idempotency key om journalen redan finns och bara svaret tappats bort

## Rollback

- aterstall commit om FAS 5.2 maste dras tillbaka
- behall migreringsordningen intakt; skapa kompensationsmigrering i stallet for att redigera gammal migrering
- markera FAS 5.2 som ej verifierad i styrdokumenten om rollback gors

## Ansvarig

- huvudansvar: teknikgenomforare for repo
- granskningsansvar: order-to-cash-ansvarig for fakturafloden, kreditregler och leveranskanaler

## Exit gate

- [ ] Faktura bokfors bara en gang
- [ ] Kreditfaktura stanger ratt poster
- [ ] Peppol-export validerar
- [ ] migration, seeds, tester och verifieringsscript ar grona
