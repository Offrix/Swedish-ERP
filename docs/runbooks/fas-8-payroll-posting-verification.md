# FAS 8.3 payroll posting and payout verification

## Syfte

Verifiera att FAS 8.3 levererar loneverifikationer, bankbetalningsunderlag, kostnadsfordelning per dimension och reproducerbara semesterskuldssnapshots utan att lagga domanlogik i UI.

## Nar den anvands

- efter implementation av FAS 8.3
- fore commit och push
- efter andringar i payroll posting, payout export, bankmatchning eller vacation liability-floden

## Forkrav

- repo ligger pa ratt branch och working tree ar forstadd
- Node och pnpm matchar lasta versioner
- Docker-baserad lokal databas kan startas om verklig migrering ska koras
- feature flag `PHASE8_PAYROLL_ENABLED` ar satt till `true` for aktiv verifiering
- FAS 8.1 och FAS 8.2 ar redan migrerade och seedade

## Steg for steg

1. Kor statiska kontroller:
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
2. Kor riktade FAS 8.3-tester:
   - `node --test tests/unit/payroll-phase8-3.test.mjs`
   - `node --test tests/integration/phase8-payroll-posting-api.test.mjs`
   - `node --test tests/e2e/phase8-payroll-posting-flow.test.mjs`
3. Kor hela testsuiten:
   - `node scripts/run-tests.mjs all`
4. Kor verify-script:
   - `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-phase8-payroll-posting.ps1`
5. Verifiera migrationsordning och seed-ordning:
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Om Docker-infra ar uppe, kor verklig migrering och seed:
   - `node scripts/db-migrate.mjs`
   - `node scripts/db-seed.mjs`
   - `node scripts/db-seed.mjs --demo`
7. Verifiera att API root visar `phase8PayrollEnabled: true`.
8. Verifiera att `PHASE8_PAYROLL_ENABLED=false` ger `503` pa payroll-rutter, inklusive posting-, payout- och vacation-liability-endpoints.

## Verifiering

Fasen ar verifierad forst nar foljande ar grona:

- loneverifikationer bokar kostnader, nettolon, skatt och skuldposter med deterministisk journalstruktur
- kostnadsfordelning per projekt, kostnadsstalle och affarsomrade bevaras fran pay run lines till journalrader
- payout batch exporterar deterministiskt bankbetalningsunderlag fran godkand lonekorning och primara mottagarkonton
- matchning mot bankhandelse markerar batchen som matched utan dubbelbokning
- semesterskuldssnapshot for samma rapportperiod ateranvander samma snapshot vid identiskt underlag
- baseline-seed visar posting, payout batch och semesterskuldssnapshot och demo-seed visar dimensionsfordelning och bankmatchning

## Vanliga fel

- `voucher_series_not_found`
  DSAM-katalog och voucher-serier ar inte installerade for bolaget innan payroll posting skapas.
- `bank_account_not_found`
  Bolaget saknar aktivt utbetalningskonto for payroll payout batch.
- `employee_bank_account_not_found`
  En anstalld i lonekorningen saknar primart mottagarkonto.
- `pay_run_not_approved`
  Lonekorningen ar inte godkand innan posting eller payout batch skapas.
- `feature_disabled`
  `PHASE8_PAYROLL_ENABLED` ar avstangd.

## Aterstallning

- aterstall feature flag till tidigare lage om payroll-rutter maste stangas
- aterskapa lokal testdata genom att nolla Docker-databasen om verifieringen kraver ren miljo
- revert:a ej manuellt skapade anvandarandringar utan uttrycklig instruktion

## Rollback

- satt `PHASE8_PAYROLL_ENABLED=false` for att stoppa payroll-rutter utan att stanga hela API-processen
- anvand ny korrigerande migration i stallet for att skriva om historiska pay runs, postings, payout batches eller semesterskuldssnapshots

## Ansvarig

- huvudagent eller utvecklare som implementerar FAS 8.3

## Exit gate

- [ ] Bokforing per projekt/kostnadsstalle fungerar
- [ ] Utbetalningar matchas mot bank
- [ ] Semesterskuld kan aterskapas
- [ ] Disable-strategi fungerar
