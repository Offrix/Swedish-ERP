# DOMAIN_00_ROADMAP

## Mål

Att göra repo:t granskningsbart, prune-bart och sanningsmässigt entydigt innan någon senare domän får räknas som korrekt analyserad.

## Varför domänen behövs

- Den nya sanningen finns nu i rebuild-trädet, men repo:t bär fortfarande gammal och konkurrerande styrning.
- Tester, verify-skript och runbooks ger delvis falska signaler.
- Flera gamla docs beskriver appytor som inte finns.
- Protected/live-runtime är blockerad av grundproblem som annars kommer att smitta varje senare domän.

## Faser

- Fas 0: docs-truth lock
- Fas 0: repo- och surface-klassificering
- Fas 0: test- och verify-sanningssanering
- Fas 0: prune- och supersession-map
- Fas 0: låg-risk-cleanup
- Fas 0: underlag till domän 1-17
- Fas 0: extern audit-rekonsilering

## Delfaser

### Delfas 0.1 Documentation Truth Lock

**Dependencies**
- inga

**Får köras parallellt med**
- inget som låser senare domäner

**Får inte köras parallellt med**
- ingen senare domänklassning

**Arbetssteg**
- [ ] slå fast rebuild-kedjan som enda sanning i root-dokumenten
- [ ] skriv om `README.md` så att den bara pekar på rebuild-dokumenten
- [ ] skriv om `scripts/lib/repo.mjs` så att gamla docs inte längre är `mandatoryDocs`
- [ ] bygg första aktiva docs-truth-listan

**Exit gate**
- `README.md`, `AGENTS.md`, settings-prompten och master-roadmap/master-library pekar på samma sanning

**Konkreta verifikationer**
- `rg -n "GO_LIVE_ROADMAP_FINAL|PHASE_IMPLEMENTATION_LIBRARY_FINAL|MASTER_BUILD_SEQUENCE_FINAL|MASTER_IMPLEMENTATION_BACKLOG" README.md scripts/lib/repo.mjs docs/implementation-control/domankarta-rebuild` får inte visa gamla styrdokument som aktiv sanning
- `rg -n "MASTER_DOMAIN_ROADMAP|MASTER_DOMAIN_IMPLEMENTATION_LIBRARY" README.md AGENTS.md docs/implementation-control/domankarta-rebuild` ska visa den nya sanningskedjan

**Konkreta tester**
- öppna `README.md` och verifiera att gamla `FINAL`-dokument bara nämns som legacy/raw material om de nämns alls
- öppna `scripts/lib/repo.mjs` och verifiera att rebuild-dokumenten, inte gamla docs, är mandatory truth

**Konkreta kontroller**
- ingen ny agentkörning ska kunna starta i gammal docs-hierarki av misstag

### Delfas 0.2 Legacy Binding Downgrade

**Dependencies**
- delfas 0.1

**Får köras parallellt med**
- delfas 0.3

**Får inte köras parallellt med**
- slutlig domän 1-17-låsning

**Arbetssteg**
- [ ] klassificera `docs/implementation-control/*` utanför rebuild-trädet
- [ ] klassificera `docs/master-control/*`
- [ ] klassificera `docs/compliance/se/*`
- [ ] klassificera `docs/domain/*`
- [ ] klassificera `docs/policies/*`
- [ ] klassificera `docs/test-plans/*`
- [ ] klassificera `docs/ui/*`
- [ ] klassificera `docs/runbooks/*` som aktivt råmaterial, rewrite, archive eller remove

**Exit gate**
- alla gamla docs-kluster har explicit status `keep/harden/rewrite/replace/migrate/archive/remove`

**Konkreta verifikationer**
- `rg -n "Status:\\s*(Bindande|Binding)" docs` får efter genomförd sanering endast ge aktiva rebuild-dokument eller uttryckligt historikmärkta dokument

**Konkreta tester**
- stickprov på minst en fil per docs-kluster ska visa korrekt nedgradering

**Konkreta kontroller**
- inga gamla docs får ligga kvar med otydlig status

### Delfas 0.3 Surface Reality Map

**Dependencies**
- delfas 0.1

**Får köras parallellt med**
- delfas 0.2
- delfas 0.4

**Får inte köras parallellt med**
- UI-domänlåsning

**Arbetssteg**
- [ ] inventera faktiska appar under `apps/`
- [ ] lista alla docs som refererar `apps/backoffice`
- [ ] lista alla docs som refererar `apps/public-web`
- [ ] märk varje sådan referens som `legacy planned surface`, `rewrite`, `archive` eller `remove`
- [ ] bygg en tydlig ytkarta: `verified runtime`, `verified shell`, `missing`, `historical`

**Exit gate**
- ingen aktiv sanning får anta appytor som inte finns

**Konkreta verifikationer**
- `Get-ChildItem apps -Directory` ska matcha surface-matrisen
- `rg -l "apps/backoffice|apps/public-web" docs` ska mappas till konkreta prune-beslut

**Konkreta tester**
- öppna minst ett dokument från `docs/ui`, `docs/policies`, `docs/domain` och `docs/runbooks` som refererar saknad appyta och verifiera att status är satt

**Konkreta kontroller**
- senare domäner får inte utgå från implicit existerande backoffice/public-web

### Delfas 0.4 Code And Runtime Classification

**Dependencies**
- delfas 0.1

**Får köras parallellt med**
- delfas 0.3
- delfas 0.5

**Får inte köras parallellt med**
- borttagning av kod utan prune-beslut

**Arbetssteg**
- [ ] klassificera entrypoints i `apps/api`, `apps/worker`, `apps/desktop-web`, `apps/field-mobile`
- [ ] klassificera `scripts/lib/repo.mjs`
- [ ] klassificera placeholderkod i `packages/integration-core`, `packages/test-fixtures`, `src/swedish_erp_python`, `infra/terraform`, `infra/ecs`
- [ ] bär vidare runtime-blockers från honesty-scan som tvärdomänsberoenden

**Exit gate**
- varje större kodkluster har status och rekommenderad åtgärd

**Konkreta verifikationer**
- aktiv kod måste ha import-, route-, handler- eller testkoppling
- dead/placeholder-kluster måste sakna sådan koppling eller ha explicit placeholdertext

**Konkreta tester**
- verifiera att `apps/api/src/platform.mjs` importerar aktiva domäner
- verifiera att `apps/worker/src/worker.mjs` inte bara är heartbeat/noop

**Konkreta kontroller**
- inget placeholderpaket får fortsätta vara `required` i repo-verktygen

### Delfas 0.5 Runtime Blocker Register

**Dependencies**
- delfas 0.4

**Får köras parallellt med**
- delfas 0.6

**Får inte köras parallellt med**
- protected/live-klassning av senare domäner

**Arbetssteg**
- [ ] kör honesty-scan i production-läge
- [ ] extrahera blockerklasser: persistence, flat merge, source of truth, provider reality, secret runtime
- [ ] knyt varje blocker till konkreta filer
- [ ] markera dem som hårda beroenden för senare domäner

**Exit gate**
- runtime blocker register finns och används som input till master-roadmapen

**Konkreta verifikationer**
- `startupAllowed` ska vara dokumenterat med faktisk findinglista
- varje blocker ska peka på konkret kodfil

**Konkreta tester**
- kör `node scripts/runtime-honesty-scan.mjs ... --json` och spara blockerklasserna i dokumentationen

**Konkreta kontroller**
- inget protected/live-påstående får passera förbi ett öppet blockerfynd

### Delfas 0.6 Test Truth Classification

**Dependencies**
- delfas 0.1

**Får köras parallellt med**
- delfas 0.4
- delfas 0.7

**Får inte köras parallellt med**
- go-live- eller parity-bevisning i senare domäner

**Arbetssteg**
- [ ] räkna och märk alla tester som använder `createExplicitDemoApiPlatform`
- [ ] hitta alla testfiler med absoluta lokala paths
- [ ] skilj `demo/test`, `smoke`, `metadata`, `runtime`, `environment-blocked`
- [ ] bygg test-truth-registret

**Exit gate**
- varje acceptancekritisk testfamilj har tydlig sanningsklass

**Konkreta verifikationer**
- `rg -n "createExplicitDemoApiPlatform" tests` ska ha dokumenterat totalantal och familjegruppering
- `rg -n "C:/Users/snobb/Desktop/Swedish ERP|C:\\Users\\snobb\\Desktop\\Swedish ERP" tests` ska vara 0 i kvarvarande acceptancekritiska tester

**Konkreta tester**
- kör minst ett känt demo-test, ett känt runtime-test och ett känt stale-test och dokumentera skillnaden

**Konkreta kontroller**
- miljöblocker får inte misstas för repo-buggar

### Delfas 0.7 Script And Runbook Truth Classification

**Dependencies**
- delfas 0.1

**Får köras parallellt med**
- delfas 0.6

**Får inte köras parallellt med**
- operationsklassning i senare domäner

**Arbetssteg**
- [ ] klassificera `package.json` scriptfamiljer
- [ ] klassificera `scripts/verify-*.ps1`
- [ ] klassificera `build/lint/typecheck/security` som baseline eller readiness
- [ ] hitta runbooks med absoluta paths eller falskt bindningsspråk
- [ ] bygg script/runbook-truth-registret

**Exit gate**
- varje verify-script och varje aktiv runbook har korrekt bevisnivå och status

**Konkreta verifikationer**
- `rg -n "C:/Users/snobb/Desktop/Swedish ERP|C:\\Users\\snobb\\Desktop\\Swedish ERP" docs/runbooks scripts AGENTS.md` ska vara 0 i material som fortfarande är aktivt

**Konkreta tester**
- kör `lint`, `typecheck`, `build`, `security` och dokumentera exakt vad de faktiskt bevisar
- kör `doctor` och dokumentera vilka blocker som är miljörelaterade

**Konkreta kontroller**
- inget script eller runbook får heta något som antyder bredare bevisvärde än det faktiskt har

### Delfas 0.8 False Completeness Map

**Dependencies**
- delfas 0.3
- delfas 0.4
- delfas 0.6
- delfas 0.7

**Får köras parallellt med**
- delfas 0.9

**Får inte köras parallellt med**
- actual archive/remove utan referenskontroll

**Arbetssteg**
- [ ] lista alla gröna signaler som är smalare än namnet antyder
- [ ] lista alla docs som antar saknade ytor
- [ ] lista alla demo-spår som kan misstas för live-bevis
- [ ] koppla false-completeness-källor till konkreta cleanup-åtgärder

**Exit gate**
- false-completeness-kartan täcker docs, kod, tester och scripts

**Konkreta verifikationer**
- varje falsk signal har en tydlig motåtgärd i prune-map eller roadmap

**Konkreta tester**
- jämför minst en grön structure gate med ett öppet runtime blocker och dokumentera skillnaden

**Konkreta kontroller**
- ingen “grön” signal får stå kvar utan etikett för bevisvärde

### Delfas 0.9 Repo Prune And Supersession Map

**Dependencies**
- delfas 0.2
- delfas 0.4
- delfas 0.6
- delfas 0.7
- delfas 0.8

**Får köras parallellt med**
- delfas 0.10

**Får inte köras parallellt med**
- faktisk borttagning utan referensscan

**Arbetssteg**
- [ ] skriv `DOMAIN_00_REPO_PRUNE_MAP.md`
- [ ] lägg beslut på docs, code, tests, scripts/runbooks
- [ ] skilj `migrate` från `archive` och `remove`
- [ ] peka ut exakt vart innehåll ska flyttas innan gamla docs kan tas bort

**Exit gate**
- prune-mapen går att agera på utan gissning

**Konkreta verifikationer**
- varje `remove`-kandidat ska sakna aktiv import/script/reference eller ha tydlig legalt ofarlig status
- varje `migrate`-kandidat ska ha målplats

**Konkreta tester**
- stickprovssök referenser före varje `remove`-status

**Konkreta kontroller**
- inget tas bort för att det “känns gammalt”; det måste finnas konkret bevis

### Delfas 0.10 Low-Risk Cleanup Execution

**Dependencies**
- delfas 0.7
- delfas 0.8
- delfas 0.9

**Får köras parallellt med**
- inget som flyttar aktiv sanning samtidigt

**Får inte köras parallellt med**
- high-risk remove-beslut utan referensscan

**Arbetssteg**
- [ ] arkivera gamla styrdokument som inte längre får styra
- [ ] arkivera uppenbara placeholderkluster
- [ ] ta bort lokala absoluta paths i aktivt kvarvarande material
- [ ] uppdatera root-manifest och root-readme efter cleanup

**Exit gate**
- låg-risk-cleanup är verkställd utan att sanningskedjan tappas

**Konkreta verifikationer**
- varje cleanup-åtgärd ska peka på prune-map-beslut eller referensscan
- root-readme och root-manifest ska matcha den nya sanningskedjan efter cleanup

**Konkreta tester**
- stickprov före och efter cleanup på minst en `archive`, en `rewrite` och en borttagen lokal path

**Konkreta kontroller**
- inget tas bort bara för att det känns gammalt; cleanup måste vara prune-map-styrd

### Delfas 0.11 Domain Input Export

**Dependencies**
- delfas 0.5
- delfas 0.9

**Får köras parallellt med**
- inget som ändrar sanningshierarkin

**Får inte köras parallellt med**
- slutlig domänlåsning utan input från prune-map

**Arbetssteg**
- [ ] bygg capability-kluster från faktisk kod, inte gamla docs
- [ ] markera tvärdomänsblocker
- [ ] markera osäkra gränser
- [ ] för över allt till master-roadmap och master-library

**Exit gate**
- Domän 1 kan starta utan att gå vilse i gammal dokumentation

**Konkreta verifikationer**
- varje kluster måste kunna härledas till packages, apps, routes eller worker

**Konkreta tester**
- stickprovskontrollera att minst ett verkligt kodspår finns för varje kluster

**Konkreta kontroller**
- Domän 0 får inte själv bli en ny falsk completeness-hierarki

### Delfas 0.12 External Audit Reconciliation

**Dependencies**
- delfas 0.11

**Får köras parallellt med**
- inget som ändrar auditunderlagets källfiler

**Får inte köras parallellt med**
- import av externa auditfynd utan disposition

**Arbetssteg**
- [ ] läs `C:\Users\snobb\Downloads\bokforing_rebuild_issue_register.json` som verifieringsunderlag
- [ ] läs `C:\Users\snobb\Downloads\bokforing_rebuild_audit_report.md` som verifieringsunderlag
- [ ] skriv och håll `BOKFORING_REBUILD_AUDIT_RECONCILIATION_2026-04-04.md` uppdaterad med stale claims, öppna hygiene-fynd och carry-forward-kluster
- [ ] markera direkta corpusclaims som stale eller stängda när rebuilden redan passerat dem
- [ ] håll kvar bara verkligt öppna docs-hygienfynd för BOM, absoluta lokala paths och dokumentportabilitet
- [ ] mappa varje importerad `issue_ref` till exakt en disposition och ett existerande fasägarskap eller ny blocker

**Exit gate**
- inget externt auditfinding får vara odifferentierat mellan stale, redan implementerat och verkligt öppet

**Konkreta verifikationer**
- direkta count-claims i auditpaketet ska ha jämförts mot aktuell repomätning
- varje carry-forward-kluster ska vara explicit synligt i masterkedjan eller markerat stängt

**Konkreta tester**
- stickprov på minst en stale claim, en redan stängd claim och en verkligt öppen hygiene-claim

**Konkreta kontroller**
- extern audit får aldrig bli ny bindande sanning; den får bara användas som rekonsilerat verifieringsunderlag
