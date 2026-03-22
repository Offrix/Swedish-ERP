# FAS 6.3 AP attest, payments and returns verification

## Syfte

Verifiera att FAS 6.3 levererar flerstegsattest, betalningsforslag, utbetalningsbokning, bankreturer och idempotent aterimport enligt styrdokumenten.

## Nar den anvands

- efter implementation av FAS 6.3
- fore commit och push
- efter andringar i attestkedjor, bankfloden eller AP-betalningsbokning

## Forkrav

- repo ligger pa ratt branch och working tree ar forstadd
- Node och pnpm matchar lasta versioner
- Docker-baserad lokal databas kan startas om verklig migrering ska koras
- feature flag `PHASE6_AP_ENABLED` ar satt till `true` for aktiv verifiering

## Steg for steg

1. Kor statiska kontroller:
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
2. Kor riktade AP 6.3-tester:
   - `node --test tests/unit/ap-phase6-3.test.mjs`
   - `node --test tests/integration/phase6-ap-payments-api.test.mjs`
   - `node --test tests/e2e/phase6-ap-payments-flow.test.mjs`
3. Kor hela testsuiten:
   - `node scripts/run-tests.mjs all`
4. Kor verify-script:
   - `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-phase6-ap-payments.ps1`
5. Verifiera migrationsordning och seed-ordning:
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Om Docker-infra ar uppe, kor verklig migrering och seed:
   - `node scripts/db-migrate.mjs`
   - `node scripts/db-seed.mjs`
   - `node scripts/db-seed.mjs --demo`
7. Verifiera att API root visar `phase6ApEnabled: true`.
8. Verifiera att `PHASE6_AP_ENABLED=false` ger `503` pa `/v1/ap/*` och `/v1/banking/*`.

## Verifiering

Fasen ar verifierad forst nar foljande ar grona:

- minst tva atteststeg kravs innan fakturan blir `approved`
- postning blockeras mellan steg ett och slutattest
- obehoriga kan inte exportera eller exekvera betalningar
- betalningsforslag kan skapas, godkannas, exporteras, skickas och accepteras
- reservation bokar skuld mot `2450`
- bankbokning bokar `2450` mot valt bankkonto
- retur aterskapar leverantorsskuld utan att skapa dublett vid replay
- seed visar ett avvecklat betalflode och demo-seed visar ett returflode som oppnar posten igen

## Vanliga fel

- `approval_step_not_authorized`
  Fel anvandare eller fel roll forsoker attestera nasta steg.
- `supplier_invoice_review_required`
  Fakturan ar inte slutattesterad eller har oppna review-koder.
- `payment_proposal_not_approved`
  Betalningsforslaget ar inte godkant innan export eller submit.
- `payment_order_not_returnable`
  Banken skickar retur pa betalning som aldrig bokts.
- `feature_disabled`
  `PHASE6_AP_ENABLED` ar avstangd.

## Aterstallning

- aterstall feature flag till tidigare lage om AP- eller bankrutter maste stangas
- aterskapa lokal testdata genom att nolla Docker-databasen om verifieringen kraver ren miljo
- revert:a ej manuellt skapade anvandarandringar utan uttrycklig instruktion

## Rollback

- satt `PHASE6_AP_ENABLED=false` for att stoppa AP- och banking-rutter utan att stanga hela API-processen
- anvand ny korrigerande migration i stallet for att skriva om historiska betal- eller returspår

## Ansvarig

- huvudagent eller utvecklare som implementerar FAS 6.3

## Exit gate

- [ ] Flerstegsattest ar verifierad
- [ ] Obehoriga kan inte betala
- [ ] Utbetalningar bokfors korrekt
- [ ] Returer kan aterimporteras idempotent
- [ ] Disable-strategi fungerar
