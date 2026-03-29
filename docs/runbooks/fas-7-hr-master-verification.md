> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 7.1 HR master verification

## Syfte

Verifiera att FAS 7.1 levererar anstalldregister, flera anstallningar, avtalshistorik, chefstrad, bankkonton, dokumentlankar och kanslig audit enligt styrdokumenten.

## Nar den anvands

- efter implementation av FAS 7.1
- fore commit och push
- efter andringar i employee-, employment-, contract-, manager- eller bankaccount-floden

## Forkrav

- repo ligger pa ratt branch och working tree ar forstadd
- Node och pnpm matchar lasta versioner
- Docker-baserad lokal databas kan startas om verklig migrering ska koras
- feature flag `PHASE7_HR_ENABLED` ar satt till `true` for aktiv verifiering

## Steg for steg

1. Kor statiska kontroller:
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
2. Kor riktade HR 7.1-tester:
   - `node --test tests/unit/hr-phase7-1.test.mjs`
   - `node --test tests/integration/phase7-hr-master-api.test.mjs`
   - `node --test tests/e2e/phase7-hr-master-flow.test.mjs`
3. Kor hela testsuiten:
   - `node scripts/run-tests.mjs all`
4. Kor verify-script:
   - `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-phase7-hr-master.ps1`
5. Verifiera migrationsordning och seed-ordning:
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Om Docker-infra ar uppe, kor verklig migrering och seed:
   - `node scripts/db-migrate.mjs`
   - `node scripts/db-seed.mjs`
   - `node scripts/db-seed.mjs --demo`
7. Verifiera att API root visar `phase7HrEnabled: true`.
8. Verifiera att `PHASE7_HR_ENABLED=false` ger `503` pa `/v1/hr/*`.

## Verifiering

Fasen ar verifierad forst nar foljande ar grona:

- samma person kan ha flera anstallningar i samma bolag
- anstallnings- och avtalsversioner bevarar historik utan overskrivning
- chefstradet blockerar sjalvreferenser och uppenbara cykler
- bankkonton maskas i svar och kansliga falt skapar auditspår
- dokument kan lankas till anstalld utan domanlogik i UI
- seed visar flera anstallningar och demo-seed visar skyddad identitet, managerbyte och utlandskt bankkonto

## Vanliga fel

- `employee_identity_already_exists`
  Samma identitet har redan registrerats for bolaget.
- `employment_manager_cycle`
  Ny chefskoppling skulle skapa en cykel i chefstradet.
- `employment_contract_compensation_required`
  Avtalsversion saknar manads- eller timkompensation.
- `employee_bank_iban_required`
  IBAN-utbetalning saknar IBAN eller BIC.
- `feature_disabled`
  `PHASE7_HR_ENABLED` ar avstangd.

## Aterstallning

- aterstall feature flag till tidigare lage om HR-rutter maste stangas
- aterskapa lokal testdata genom att nolla Docker-databasen om verifieringen kraver ren miljo
- revert:a ej manuellt skapade anvandarandringar utan uttrycklig instruktion

## Rollback

- satt `PHASE7_HR_ENABLED=false` for att stoppa HR-rutter utan att stanga hela API-processen
- anvand ny korrigerande migration i stallet for att skriva om historiska employment- eller auditspår

## Ansvarig

- huvudagent eller utvecklare som implementerar FAS 7.1

## Exit gate

- [ ] Samma person kan ha flera anstallningar
- [ ] Anstallningshistorik bevaras
- [ ] Kansliga falt loggas
- [ ] Disable-strategi fungerar

