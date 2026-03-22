# FAS 7.3 absence and employee portal verification

## Syfte

Verifiera att FAS 7.3 levererar franvarotyper, chefsgodkannande, historik for admin och anstalld, kompletta franvarosignaler och AGI-liknande lasning av franvarodata.

## Nar den anvands

- efter implementation av FAS 7.3
- fore commit och push
- efter andringar i leave type-, leave entry-, manager approval-, employee portal- eller leave signal-lock floden

## Forkrav

- repo ligger pa ratt branch och working tree ar forstadd
- Node och pnpm matchar lasta versioner
- Docker-baserad lokal databas kan startas om verklig migrering ska koras
- feature flag `PHASE7_ABSENCE_ENABLED` ar satt till `true` for aktiv verifiering
- FAS 7.1 och FAS 7.2 ar redan migrerade och seedade

## Steg for steg

1. Kor statiska kontroller:
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
2. Kor riktade FAS 7.3-tester:
   - `node --test tests/unit/time-phase7-3.test.mjs`
   - `node --test tests/integration/phase7-absence-api.test.mjs`
   - `node --test tests/e2e/phase7-absence-flow.test.mjs`
3. Kor hela testsuiten:
   - `node scripts/run-tests.mjs all`
4. Kor verify-script:
   - `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-phase7-absence-portal.ps1`
5. Verifiera migrationsordning och seed-ordning:
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Om Docker-infra ar uppe, kor verklig migrering och seed:
   - `node scripts/db-migrate.mjs`
   - `node scripts/db-seed.mjs`
   - `node scripts/db-seed.mjs --demo`
7. Verifiera att API root visar `phase7AbsenceEnabled: true`.
8. Verifiera att `PHASE7_ABSENCE_ENABLED=false` ger `503` pa `/v1/hr/leave*` och `/v1/hr/employee-portal*`.

## Verifiering

Fasen ar verifierad forst nar foljande ar grona:

- franvarotyper kan skapas med korrekt signaltyp och managerkrav
- en anstalld kan skapa och skicka franvaro via employee portal utan att domanregler ligger i UI
- chefsgodkannande knyts till aktiv manager assignment och blockerar obehoriga approvers
- admin och anstalld ser samma historik med events och signaler fran olika vyer
- AGI-kanslig franvaro blockerar submit eller uppdatering om reporting period eller extent saknas
- AGI-liknande lock blockerar sena andringar efter `ready_for_sign`, `signed` eller `submitted`
- baseline-seed visar godkand franvaro med signaler och demo-seed visar avslag, korrigerad portalhistorik och signeringslas

## Vanliga fel

- `leave_manager_approval_missing`
  Det finns ingen aktiv manager assignment for franvaroperioden.
- `leave_signals_incomplete`
  AGI-kanslig franvaro saknar reporting period eller komplett dagextent.
- `leave_signals_locked`
  Franvarodata ar last for perioden eftersom AGI-signering har borjat eller avslutats.
- `employee_portal_employee_not_found`
  Inloggad company user ar inte kopplad till en employee via workEmail eller privateEmail.
- `leave_approval_denied`
  Inloggad approver ar inte aktiv chef for franvaroraden.
- `feature_disabled`
  `PHASE7_ABSENCE_ENABLED` ar avstangd.

## Aterstallning

- aterstall feature flag till tidigare lage om leave- eller portalrutter maste stangas
- aterskapa lokal testdata genom att nolla Docker-databasen om verifieringen kraver ren miljo
- revert:a ej manuellt skapade anvandarandringar utan uttrycklig instruktion

## Rollback

- satt `PHASE7_ABSENCE_ENABLED=false` for att stoppa FAS 7.3-rutter utan att stanga hela API-processen
- anvand ny korrigerande migration i stallet for att skriva om historiska leave entries, signals eller approval-event

## Ansvarig

- huvudagent eller utvecklare som implementerar FAS 7.3

## Exit gate

- [ ] Franvaro kan inte andras efter AGI-signering
- [ ] Historik visas for anstalld och admin
- [ ] Uppgifter for franvarosignaler ar kompletta
- [ ] Disable-strategi fungerar
