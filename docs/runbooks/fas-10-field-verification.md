> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 10 field verification

## Syfte

Detta runbook beskriver hur FAS 10.2 verifieras end-to-end for dispatch, fältmobil, material/lager, kundsignatur och offline-sync.

## Nar den anvands

- efter implementation eller andring i FAS 10.2
- innan 10.2 markeras klar i masterplan/gates
- innan release dar field-floden paverkas

## Forkrav

1. Lokal miljo ar uppe och beroenden ar healthy.
2. Senaste migrationer och seeds ar korbara.
3. Feature flag `PHASE10_FIELD_ENABLED` ar satt till `true` i testmiljo.
4. Minst en testanvandare med field-scope finns.

## Steg for steg

1. Kontrollera dokument och promptscope.
   - bekrafta att `P10-02` laslista ar uppdaterad
   - bekrafta att 10.2 fortfarande ar omarkerad tills verifiering ar gron
2. Kor statisk verifiering.
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
3. Kor testlager for 10.2.
   - unit-test for domain-field
   - integrationstest for `/v1/field/*` routes
   - e2e-test for field-mobile flow inkl. offline envelope
4. Kor gate-specifik verifiering.
   - offline-sync tolererar natavbrott och ger korrekt `pending`/`synced`/`conflicted`
   - materialuttag reducerar saldo och kopplas till projekt
   - arbetsorder kan faktureras efter avslut och signaturkrav
5. Kor migration/seed verifiering.
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Dokumentera resultat i PR/commit.
   - vilka tester som kors
   - pass/fail
   - eventuella avvikelser och blockerare

## Verifiering

- API returnerar `phase10FieldEnabled=true` nar flaggan ar aktiv
- route-list i root inkluderar 10.2 field-endpoints
- offline conflict-fall ger explicit felkod och auditspår
- fakturering skapar kundfaktura och uppdaterar arbetsorderstatus

## Vanliga fel

- feature flag avstangd ger `503 feature_disabled` pa field-rutter
- fel bolagsscope ger `not_found` trots att objekt finns i annat bolag
- materialuttag misslyckas pa grund av otillrackligt saldo
- arbetsorderfakturering misslyckas om labor item eller fakturerbar materialrad saknas

## Aterstallning

- inaktivera 10.2-rutter med `PHASE10_FIELD_ENABLED=false` vid incident
- rensa endast felaktiga testdata i lokal miljo, inte auditspår i delad miljo
- reparera offlinekonflikter via `docs/runbooks/mobile-offline-conflict-repair.md`

## Rollback

- rollback sker genom att stoppa rollout och disable:a field-flagga
- schemarollback far endast goras enligt migreringspolicy och med verifierad plan
- redan skapade fakturor/arbetsorder korrigeras via domanfloden, inte genom tyst datamanipulation

## Ansvarig

- primart: domanansvarig for field/work order
- sekundart: API-ansvarig och testansvarig for fasen
- support deltar vid offlinekonflikter

## Exit gate

Runbooken ar klar nar verifieringen reproducerbart visar att:
- offline-sync tal natavbrott
- materialuttag gar till projekt
- arbetsorder kan faktureras
och resultatet ar dokumenterat utan oppna kritiska avvikelser.


