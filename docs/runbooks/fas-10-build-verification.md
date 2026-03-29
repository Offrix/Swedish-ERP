> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 10.3 build verification

## Syfte

Detta runbook beskriver hur FAS 10.3 verifieras for ATA, HUS, byggmoms och personalliggare.

## Nar den anvands

- efter implementation eller andring i FAS 10.3
- innan 10.3 markeras klar i masterplan och gates
- innan release dar byggregler eller kontrollkedjor paverkas

## Forkrav

1. Lokal miljo ar uppe och beroenden ar healthy.
2. Senaste migrationer och seeds ar korbara.
3. Feature flag `PHASE10_BUILD_ENABLED` ar satt till `true` i testmiljo.
4. Testanvandare med scope for projekt och byggfloden finns.

## Steg for steg

1. Kontrollera prompt- och dokumentscope.
   - bekrafta att `P10-03` laslista pekar pa masterplan, compliance, domandocs och runbook
   - bekrafta att 10.3 inte markeras klar innan verifieringen ar gron
2. Kor statisk verifiering.
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
3. Kor testlager for 10.3.
   - unit-test for HUS, personalliggare och projektdomanens ATA/byggmomsdel
   - integrationstest for `/v1/hus/*`, `/v1/personalliggare/*` och projektens 10.3-rutter
   - e2e-test for feature-flag, field-mobile shell och operatorflodet
4. Kor gate-specifik verifiering.
   - HUS delar upp arbetskostnad och kundandel korrekt
   - HUS-ansokan kan skapas forst efter full kundbetalning
   - byggmoms ger omvand moms for svenska byggtjanster till byggsektor-kopare
   - personalliggare bevarar originalhandelse plus korrigering och exporterar kontrollkedja
5. Kor migration- och seedverifiering.
   - `node scripts/db-migrate.mjs --dry-run`
   - `node scripts/db-seed.mjs --dry-run`
   - `node scripts/db-seed.mjs --demo --dry-run`
6. Dokumentera resultat i commit eller PR.
   - vilka tester som kors
   - pass eller fail
   - eventuella blockerare eller avvikelser

## Verifiering

- API root returnerar `phase10BuildEnabled=true` nar flaggan ar aktiv
- route-list i root inkluderar HUS-, personalliggare- och 10.3-projektrutter
- HUS-kedjan gar fran klassificering till betalning, ansokan, beslut, utbetalning och recovery
- byggmomsbedomning returnerar `VAT_SE_RC_BUILD_SELL` i det bindande byggfallet
- personalliggare-export ger kontrollbar hashkedja och auditspår

## Vanliga fel

- `503 feature_disabled` nar `PHASE10_BUILD_ENABLED=false`
- HUS-ansokan nekas om kundandelen inte ar fullt betald
- byggmoms gar till review om obligatoriska VAT-fakta saknas
- personalliggare-export blir ofullstandig om check-in korrigeras utan ny kontrollhandelse

## Aterstallning

- inaktivera 10.3-rutter med `PHASE10_BUILD_ENABLED=false` vid incident
- rensa endast lokal testdata i lokal miljo, inte auditspår i delad miljo
- korrigera HUS-fall via kredit- och recoveryfloden, inte genom tyst datamanipulation

## Rollback

- rollback sker genom att stoppa rollout och disable:a 10.3-flaggan
- schemarollback far endast goras enligt migreringspolicy och med verifierad plan
- redan skapade HUS-fall, byggmomsbeslut och personalliggarehandelser korrigeras via domanfloden

## Ansvarig

- primart: domanansvarig for bygg, HUS och personalliggare
- sekundart: API-ansvarig och testansvarig for fasen
- support deltar vid kontrollkedje- eller exportfel

## Exit gate

Runbooken ar klar nar verifieringen reproducerbart visar att:
- HUS-kundandel och ansokan stammer
- byggmoms triggas korrekt
- personalliggare exporterar kontrollbar kedja
och resultatet ar dokumenterat utan oppna kritiska avvikelser.

