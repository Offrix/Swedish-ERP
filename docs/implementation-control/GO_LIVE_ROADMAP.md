# GO_LIVE_ROADMAP

Status: Bindande byggordning frÃ¥n nuvarande zip-lÃ¤ge till go-live.  
Datum: 2026-03-26  
Detta dokument ersÃ¤tter alla Ã¤ldre byggordningar, byggsekvenser och implementationsnarrativ dÃ¤r de krockar med innehÃ¥llet hÃ¤r.
Ã„ldre implementation-control-, master-control-, ADR-, runbook- och analysdokument Ã¤r historiska inputkÃ¤llor. De Ã¤r inte fortsatt bindande dÃ¤r de krockar med detta dokument.

## Absoluta regler

1. Produkten Ã¤r en generell svensk fÃ¶retagsplattform, inte ett byggprogram.
2. Bygg, field, personalliggare och ID06 Ã¤r vertikala pack ovanpÃ¥ generell core.
3. UI fÃ¥r aldrig kompensera fÃ¶r backend-brister; UI-readiness kommer sist.
4. Demo, trial och test Ã¤r tillÃ¥tna endast i explicit mode; de Ã¤r aldrig implicit runtime.
5. Reglerad logik mÃ¥ste vara versionerad, effective-dated, replaybar och receipt-sÃ¤ker.
6. Shell-appar, route-bredd, seed-data och simulerade providers rÃ¤knas inte som go-live.
7. Alla actions frÃ¥n tidigare analysdokument Ã¤r obligatoriska hÃ¤r; om nÃ¥got inte finns hÃ¤r ska det betraktas som ej tillÃ¥tet arbete tills dokumentet Ã¤ndras.

## MarkÃ¶rlegend

- `[NEW BUILD]` ny kapabilitet eller nytt package/modul/kontrakt
- `[HARDEN]` befintlig kod/arkitektur finns men mÃ¥ste bli driftmÃ¤ssig
- `[REWRITE]` nuvarande lÃ¶sning finns men Ã¤r strukturellt fel eller konfliktfylld
- `[REPLACE]` nuvarande lÃ¶sning mÃ¥ste bytas ut mot annan mekanism/provider/boundary
- `[REMOVE/DEPRECATE]` lÃ¶sning eller antagande ska bort och fÃ¥r inte fortsÃ¤tta styra
- `[MIGRATE]` data, state eller callers mÃ¥ste flyttas utan historikfÃ¶rlust
- `[OPERATIONALIZE]` process, runbook, gating eller operatÃ¶rsstÃ¶d mÃ¥ste gÃ¶ras verkligt

## HÃ¥rda blockerare som gÃ¤ller omedelbart

- `manual_rate` som normallÃ¤ge fÃ¶r ordinarie preliminÃ¤rskatt Ã¤r fÃ¶rbjudet i live-kedjor.
- `seedDemo=true` eller motsvarande implicit boot i production/pilot Ã¤r fÃ¶rbjudet.
- Blandade route-familjer i `apps/api/src/phase13-routes.mjs` och `phase14-routes.mjs` fÃ¥r inte byggas vidare som bindande slutarkitektur.
- `BankID`-stub, OCR-stub, simulerade authority receipts och simulerade provider-outcomes fÃ¥r inte rÃ¤knas som live coverage.
- Trial och live fÃ¥r aldrig dela credentials, receipts, provider refs, sequence space eller ekonomisk effekt.
- Projects fÃ¥r inte byggas som work-order-first eller construction-first. General core kommer fÃ¶re vertikal pack.

## Fasberoenden i kortform

| Fas | Namn | MÃ¥ste vara klar fÃ¶re |
|---|---|---|
| 0 | SanningslÃ¥sning | all kod och alla nya styrbeslut |
| 1 | Runtime-Ã¤rlighet | persistence, providerarbete, pilots |
| 2 | Durable persistence | alla reglerade och ekonomiska kedjor |
| 3 | Audit/evidence/observability | providers, support, enterprise gate |
| 4 | Canonical contracts/routes | auth, APIs, UI-kontrakt |
| 5 | Rulepacks/baselines | finance, payroll, filings |
| 6 | Auth/identity | filings, payouts, enterprise, support write |
| 7 | Tenant bootstrap/trial | onboarding, trial, finance-ready bolag |
| 8 | Legal form + ledger core | AR/AP/VAT/payroll/projects profitability |
| 9 | AR/AP/VAT/banking/tax account | documents, payroll, HUS, migration |
| 10 | Documents/OCR/review | AP, payroll underlag, support automation |
| 11 | HR/time/agreements | payroll, project cost allocations |
| 12 | Payroll/AGI/garnishment | filings, project profitability, go-live |
| 13 | HUS/submissions/annual | compliance go-live |
| 14 | General project core + packs | project/CRM parity, field parity |
| 15 | Reporting/search/workbench | UI-readiness, backoffice, public sandbox |
| 16 | Integrations/APIs/providers | ecosystem parity, live transports |
| 17 | Operations/cutover/support | pilot, migration, live drift |
| 18 | Pilot/gates/UI-freeze | generell go-live |

## TillÃ¥tna parallellfÃ¶nster

### ParallellfÃ¶nster A
- Fas 1.1â€“1.5 och fÃ¶rberedande delar av fas 4.3 (routeinventering) fÃ¥r kÃ¶ras samtidigt.
- Ingen domÃ¤nlogik fÃ¥r Ã¤ndra affÃ¤rsbeteende innan fas 1 Ã¤r grÃ¶n.

### ParallellfÃ¶nster B
- Fas 2.1â€“2.5 kan kÃ¶ras som domÃ¤nvÃ¥gor efter att gemensam outbox/command-logg Ã¤r klar.
- Fas 3.1â€“3.5 fÃ¥r starta nÃ¤r fas 2:s primitives finns.

### ParallellfÃ¶nster C
- Fas 5 (rulepacks) fÃ¥r lÃ¶pa parallellt med fas 6â€“9 nÃ¤r registry-skelettet Ã¤r klart.
- Fas 16 kan bÃ¶rja bygga adapter-skelett men inga live-aktiveringar sker fÃ¶re respektive domÃ¤ngate.

### ParallellfÃ¶nster D
- Fas 14 general project core kan pÃ¥bÃ¶rjas nÃ¤r fas 8, 9, 11 och 12 har lÃ¥st sina source-of-truth-kontrakt.
- Field/personalliggare/ID06 fÃ¥r inte gÃ¥ fÃ¶re general project core.

### ParallellfÃ¶nster E
- Fas 17 support/backoffice och cutover cockpit kan byggas parallellt nÃ¤r fas 13, 15 och 16 levererat canonical receipts, read models och adapter health.

## FÃ¶rbjudna parallellismer

- Fas 12 fÃ¶re fas 11.
- Fas 13 live transport fÃ¶re fas 5 och 6.
- Fas 14 work-order/field fÃ¶re fas 14 general project core.
- Fas 18 pilot eller extern trial-lansering fÃ¶re fas 17.
- UI implementation fÃ¶re fas 15 och fas 18.5.

## [x] Fas 0 â€” SanningslÃ¥sning, scope-frysning och destruktiv legacy-rensning

**MÃ¥l**  
GÃ¶ra de tvÃ¥ nya dokumenten till enda sanning, dÃ¶da felaktiga antaganden och lÃ¥sa produktkategori, providerstrategi och projektkÃ¤rnans riktning innan nÃ¥gon mer feature-kod byggs.

**Beroenden**  
- Ingen

**FÃ¥r kÃ¶ras parallellt med**  
- DokumentstÃ¤dning och traceability-matris kan kÃ¶ras samtidigt som kodinventering av seeds/stubbar.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen implementation i reglerade flÃ¶den, auth, projects eller UI fÃ¥r starta innan denna fas Ã¤r signerad.

**Delfasstatus**
- 6.1 återverifierad 2026-03-27: auth broker ersätter fortsatt BankID-stubben med Signicat-baserad BankID i sandbox/production, lokala passkeys/TOTP som identity links, WorkOS-federation med start/callback och durable broker-state; riktade unit- och API-sviter håller grönt.
- 6.2 återverifierad 2026-03-27: `SessionRevision`, trustnivåer, fresh step-up, device trust, challenge receipts, action-specific TTL och challenge-center-routes bär fortfarande riktig runtime i både authplattform och API.
- 6.3 återverifierad 2026-03-27: review center, activity och operational work items permission-trimmas fortsatt server-side med viewer/team-scope, backoffice visibility gates och cross-team denial i riktade access-sviter.
- 6.4 återverifierad 2026-03-27: impersonation, break-glass och access attestation håller fortsatt explicit approve/start/end-livscykel, TTL/expiry, watermarks, allowlists, stale-grant-detektion och policybunden supportdrift.
- 6.5 återverifierad 2026-03-27: auth har nu faktisk mode-katalog per provider, `/v1/auth/providers/isolation`, produktionsgating när auth-inventory saknas, federations-callbacks per mode och explicit testidentitetsseparation mellan non-production och production.

**Delfaser**
- [x] 0.1 [REMOVE/DEPRECATE] **DÃ¶da byggcentriska narrativ** â€” Ta bort all styrning som behandlar produkten som byggprogram. Skriv in att field/personalliggare/ID06 Ã¤r vertikala pack ovanpÃ¥ generell fÃ¶retagsplattform.
- [x] 0.2 [REWRITE] **LÃ¥s bindande produktkategori och benchmarkset** â€” Frys konkurrensbilden till finansplattformar, CRM-/projektplattformar, project-operations-ERP och bygg/field-vertikaler i exakt denna ordning.
- [x] 0.3 [REWRITE] **LÃ¶s dokumentkonflikter** â€” Resolva konflikter mellan ADR, provider-priority, legacy remediation, master build sequence och kod. SÃ¤rskilt BankID-strategi, SCIM-scope, project core och regulated submissions boundary.
- [x] 0.4 [NEW BUILD] **Skapa full traceability** â€” Mappa varje kritisk punkt frÃ¥n FULL_SYSTEM_ANALYSIS, LEGACY_AND_REALITY_RECONCILIATION och COMPETITOR_AND_MARKET_REALITY till exakt roadmapfas, delfas och exit gate.
- [x] 0.5 [OPERATIONALIZE] **InfÃ¶r hÃ¥rda stop-regler** â€” InfÃ¶r regler att shell-UI, demo-seeds, simulerade receipts, route-bredd och phase-etiketter aldrig fÃ¥r rÃ¤knas som produktmognad.

**Exit gate**  
- Alla Ã¤ldre dokument Ã¤r nedgraderade till icke-bindande om de inte uttryckligen stÃ¤mmer med denna roadmap. Produkten Ã¤r formellt definierad som generell svensk fÃ¶retagsplattform. CRM/projekt-benchmark utanfÃ¶r bygg Ã¤r lÃ¥st.

**Fasstatus**  
- Klar 2026-03-26 genom repo-governance-lÃ¥sning, historikbanner i Ã¤ldre styrdokument, traceability-matris och governance-runbook.

**Test gate**  
- Dokumentgranskning: 100 % coverage i traceability-matrisen. Ingen Ã¥tgÃ¤rd frÃ¥n analysdokumenten saknas i roadmapen.

**Audit/replay/runtime gate**  
- Auditklass `governance_reset` krÃ¤vs fÃ¶r alla borttagna antaganden och beslutade omskrivningar. Alla Ã¤ndringsbeslut loggas med beslutare, datum och ersatt sanning.

**Migration/cutover gate**  
- Ingen data-migration, men alla migrations- och seed-anti-patterns mÃ¥ste vara identifierade innan fas 1 Ã¶ppnas.

**Blockerar nÃ¤sta steg**  
- Fortsatt byggande pÃ¥ fel produktkategori, fel providerstrategi eller felaktig projektriktning.

**Blockerar go-live**  
- Go-live utan sanningslÃ¥sning blir pseudo-go-live.

**Blockerar competitor parity**  
- Byggcentrisk feltolkning blockerar parity mot Fortnox/Visma/Bokio/Wint och CRM/project-ops-marknaden.

**Blockerar competitor advantage**  
- Utan denna fas finns ingen konsekvent winning story.

**Blockerar UI-readiness**  
- UI-teamet kan inte fÃ¥ stabila kontrakt om kÃ¤rnans sanning inte Ã¤r lÃ¥st.

## [x] Fas 1 â€” Runtime-Ã¤rlighet, bootstrap-hygien och migrationssanning

**MÃ¥l**  
GÃ¶ra boot, miljÃ¶lÃ¤gen, migrationslagret och startup-beteenden sanna och deterministiska innan persistent kÃ¤rna byggs vidare.

**Beroenden**  
- 0

**FÃ¥r kÃ¶ras parallellt med**  
- Migrationsfixar och startup/refactor kan kÃ¶ras parallellt.
- Inledande stub-/seed-scanner kan kÃ¶ras parallellt med route-inventering.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen ny domÃ¤nfunktion fÃ¥r bero pÃ¥ nuvarande seedDemo-standarder eller felaktiga bootstrapstigar.

**Delfaser**
- [x] 1.1 [REWRITE] **Laga schema_migrations-inkonsistens** â€” GÃ¶r migrationshistoriken sjÃ¤lvkonsistent och stoppa alla scripts som skriver fel kolumnnamn eller dubbla format.
- [x] 1.2 [HARDEN] **InfÃ¶r explicit runtime mode** â€” Alla starter ska vÃ¤lja `trial`, `sandbox_internal`, `test`, `pilot_parallel` eller `production`; implicit demo-boot Ã¤r fÃ¶rbjudet.
- [x] 1.3 [REPLACE] **Byt `seedDemo=true` default** â€” Alla kÃ¤rndomÃ¤ner ska defaulta till `bootstrapMode=none`; demo-seed tillÃ¥ts endast via explicit trial/demo-scenario.
- [x] 1.4 [REWRITE] **Rensa startup och flat merge-risker** â€” Bryt ut startupdiagnostik och varna/faila om nÃ¥gon kÃ¤rndomÃ¤n kÃ¶rs utan persistent store i lÃ¤gen dÃ¤r det inte Ã¤r tillÃ¥tet.
- [x] 1.5 [NEW BUILD] **Bygg runtime honesty scanner** â€” Scanner ska hitta Map-baserad sanning, stub-provider, simulerade receipts, demo-data i production mode och otillÃ¥tna route-familjer.

**Delfasstatus**
- 1.1 återverifierad 2026-03-27: alla migrationer självregistrerar nu exakt ett canonical `migration_id` som matchar filnamnet, och både Node- och PowerShell-validering failar på saknad, dubbel eller felaktig migrationsregistrering.
- 1.2 återverifierad 2026-03-27: API, worker, desktop-web, field-mobile, dev-start och standardplattform väljer nu explicit runtime mode; starter-fallback till tyst `test`-mode är borttagen från bootvägarna och smoke/runtime-mode-sviten är grön.
- 1.3 återverifierad 2026-03-27: implicit `test_default_demo`-boot är borttagen från API-plattformen; demo-fixturer tillåts nu bara via explicit `bootstrapScenarioCode`, och alla berörda e2e-, integrations- och enhetstester använder namngiven explicit demo-testplattform i stället för dold autoseed.
- 1.4 återverifierad 2026-03-27: startupdiagnostik och protected-boot-gater är nu ärliga om persistent truth; API och worker blockar fortsatt skyddade starter med blockerande invariants, och critical-domain snapshots auto-provisioneras inte längre till dold temp-sqlite utan kräver explicit store-konfiguration.
- 1.5 återverifierad 2026-03-27: runtime honesty scanner körs nu som explicit fasgate i CLI och runbook, och verifierar både resident demo-data i protected runtime, Map-baserad sanning, stub-providers, simulerade receipts och förbjudna routefamiljer innan protected boot får fortsätta.

**Exit gate**  
- API och worker startar deterministiskt per miljÃ¶lÃ¤ge, migrationer Ã¤r rena och inga kritiska domÃ¤ner kan rÃ¥ka boota med demo-lÃ¤ge i production eller pilot.

**Fasstatus**  
- Klar 2026-03-26 genom migrationshistorik-repair, explicit runtime mode i alla starters, bootstrap-normalisering, startup/flat-merge-diagnostik och kÃ¶rbar runtime honesty scanner med verifierad fas-1-gate.

**Test gate**  
- Boot-tests fÃ¶r varje mode, migrationsdrift mot tom och uppgraderad databas, samt fail-fast-tester nÃ¤r persistent store saknas i fÃ¶rbjudet lÃ¤ge.

**Audit/replay/runtime gate**  
- `runtime_boot_decision` och `migration_schema_repair` auditeras. Startup loggar mode, seed policy, disabled providers och active baselines.

**Migration/cutover gate**  
- Fas 1 mÃ¥ste ge en ren migrationskedja och ett verifierat rollback-punktformat innan fas 2 fÃ¥r Ã¤ndra persistence-kontrakt.

**Blockerar nÃ¤sta steg**  
- Persistent runtime kan inte byggas sÃ¤kert ovanpÃ¥ falsk bootstrap.

**Blockerar go-live**  
- Migrationsfel och demo-seeds i prod blockerar go-live direkt.

**Blockerar competitor parity**  
- Ingen konkurrentparitet om systemet inte ens startar sanningsenligt.

**Blockerar competitor advantage**  
- Ingen premiumfÃ¶rdel utan trusted runtime.

**Blockerar UI-readiness**  
- UI-readiness blockeras av osÃ¤ker mode- och boot-sanning.

## [x] Fas 2 â€” Durable persistence, outbox, jobs, attempts, replay och dead-letter

**MÃ¥l**  
Flytta affÃ¤rssanningen frÃ¥n processminne till hÃ¥llbar persistence med idempotent command-logg, outbox, job attempts och replay/dead-letter.

**Beroenden**  
- 1

**FÃ¥r kÃ¶ras parallellt med**  
- Event/outbox och job-attempt-lager kan byggas parallellt.
- DomÃ¤nvis repository-migrering kan ske i vÃ¥gor efter att gemensamma primitives Ã¤r klara.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen regulated submission, payroll eller tax-account-kedja fÃ¥r byggas vidare pÃ¥ in-memory truth.

**Delfasstatus**  
- 2.1 återverifierad 2026-03-27: canonical repositories bär nu explicit optimistic concurrency, transaktionsbunden rollback över flera repositorygränser, bounded-context-scope utan nyckelkollisioner och verifierad Postgres-konfigurationskedja för durable repository store.
- 2.2 återverifierad 2026-03-27: command receipt, outbox och inbox ligger fortsatt i samma commit, duplicate suppression hålls på idempotency-nivå och mutationruntime bär bounded-context repository bundles utan att förlora rollback-garantin.
- 2.3 återverifierad 2026-03-27: job runtime bär explicit attemptlivscykel, retry policy, dead-letter och replay-planer; claim expiry före start skapar syntetisk attempthistorik och poison-pill-loopar stängs i dead-letter i stället för att försvinna tyst.
- 2.4 återverifierad 2026-03-27: kritiska domäner kan rehydreras från durable snapshots, sqlite-backed critical truth bootar nu korrekt även utan explicit state-filpath, runtime diagnostics släpper inte igenom Map-only truth förrän durability inventory visar verklig snapshot-backed persistence, och plattformen exponerar nu per-domän durability inventory som fasgate.
- 2.5 återverifierad 2026-03-27: projection rebuild bevarar source of truth och icke-målade projektioner, targeted full rebuild purgar bara rätt projectionsdokument och failed rebuild lämnar truth orörd tills lyckad retry rensar checkpoint-felet.

**Delfaser**
- [x] 2.1 [NEW BUILD] **InfÃ¶r canonical repositories** â€” Varje bounded context fÃ¥r repositorygrÃ¤nssnitt med Postgres-implementation och transaktionsbunden optimistic concurrency.
- [x] 2.2 [NEW BUILD] **InfÃ¶r command log + outbox/inbox** â€” Alla muterande commands ska skriva command receipt, expected version, actor, session revision och outbox-event i samma commit.
- [x] 2.3 [HARDEN] **HÃ¥rdna job-runtime** â€” `packages/domain-core/src/jobs.mjs` och `apps/worker/src/worker.mjs` ska bÃ¤ra attempts, retry policy, dead-letter, replay plan och poison-pill-detektion.
- [x] 2.4 [MIGRATE] **Migrera kritiska domÃ¤ner bort frÃ¥n Map-sanning** â€” Org auth, ledger, VAT, AR, AP, payroll, tax-account, review-center, projects och submissions fÃ¥r inte lÃ¤ngre ha produktionskritisk state enbart i Map.
- [x] 2.5 [NEW BUILD] **InfÃ¶r projections re-build** â€” Read models ska kunna raderas och byggas om frÃ¥n event/outbox utan att source-of-truth tappar historik.

**Exit gate**  
- Kritiska affÃ¤rsobjekt Ã¤r persistenta, replaybara och versionsstyrda. Jobs kan Ã¥terupptas efter processdÃ¶d. Dead-letter och replay Ã¤r operatÃ¶rsstyrda, inte ad hoc-scripts.

**Fasstatus**  
- Klar 2026-03-26 genom canonical repositories, transaktionsbunden command log/outbox, explicit attempt-livscykel, durability inventory fÃ¶r kritiska domÃ¤ner och verifierad projection rebuild parity inklusive fail/retry-kedja.

**Test gate**  
- Crash/restart-tester, concurrency/idempotency-tester, outbox-leverans med duplicate suppression, replay frÃ¥n poison-pill, projection rebuild frÃ¥n tom read model.

**Audit/replay/runtime gate**  
- Varje command fÃ¥r immutable command receipt; varje replay/dead-letter-Ã¥tgÃ¤rd fÃ¥r egen auditklass och operator evidence.

**Migration/cutover gate**  
- Data-migration per domÃ¤n mÃ¥ste ha verifierad row-count, checksums och rollback. Inga gamla Map-only artefakter fÃ¥r vara enda kÃ¤llan efter cutover.

**Blockerar nÃ¤sta steg**  
- Reglerade, ekonomiska och auth-kedjor saknar bÃ¤righet utan durable truth.

**Blockerar go-live**  
- In-memory truth blockerar go-live.

**Blockerar competitor parity**  
- Paritet mot etablerade produkter krÃ¤ver hÃ¥llbar runtime.

**Blockerar competitor advantage**  
- Replay/evidence-fÃ¶rdelen existerar inte utan detta.

**Blockerar UI-readiness**  
- UI kan inte lita pÃ¥ versionsnummer, state machines eller feeds utan durable persistence.

## [x] Fas 3 â€” Audit, evidence, observability, restore drills och secret governance

**MÃ¥l**  
GÃ¶ra audit och driftbevis fÃ¶rstaklassiga samt sÃ¤kra att systemet kan Ã¶vervakas, Ã¥terstÃ¤llas och opereras utan manuell databasmedicin.

**Beroenden**  
- 2

**FÃ¥r kÃ¶ras parallellt med**  
- Observability och evidence pack kan byggas parallellt.
- Secret rotation och restore drills kan fÃ¶rberedas parallellt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen live providercredential eller signeringsnyckel fÃ¥r anvÃ¤ndas innan secret governance Ã¤r aktiv.

**Delfasstatus**  
- 3.1 återverifierad 2026-03-27: canonical audit envelope är fortsatt gemensam writer-form för auth, review, search, documents, activity, notifications, id06 och kvarvarande legacy-audit-writers, med verifierad integrity hash, audit-envelope-version, correlation-id, canonical `recordedAt`, deterministisk voucherkoppling och DSAM/A–Z-ledgergrunder som fortsatt grön under riktad 3.1-svit.
- 3.2 återverifierad 2026-03-27: evidence-pack-kraven i bibeln är nu mappade punkt för punkt till faktisk kod, runbook och exit gate; annual reporting, regulated submissions, support, break-glass, cutover och project exports använder central frozen evidence-bundle-kedja med checksum, supersession och arkivering av tidigare bundle.
- 3.3 återverifierad 2026-03-27: full observability är nu mappad punkt för punkt till faktisk kod, alarms, drilldown och exit gate; provider health, projection lag, queue age, invariant alarms, structured logs och trace chains exponeras i samma company-scoped payload och håller under riktad runtime- och API-svit.
- 3.4 återverifierad 2026-03-27: restore drills bär fortsatt verklig livscykel (`scheduled -> running -> passed|failed`) med explicit coverage för `database_restore`, `projection_rebuild` och `worker_restart`; riktad 3.4-svit samt resilience- och migration-cockpit-tester bekräftar restore-plan-koppling, chaos-signaler och rollbackdisciplin.
- 3.5 återverifierad 2026-03-27: secrets, callback-hemligheter och certifikatkedjor är fortsatt formaliserade som egna runtime-objekt med mode-bunden vaultvalidering, rotationsposter, dual-running-overlap, certifikatsförnyelsefönster och observability-sammanfattning; riktad 3.5-svit bekräftar att rotation och certifikatsummering håller.

**Delfaser**
- [x] 3.1 [HARDEN] **Canonical audit envelope** â€” Alla commands, provider calls, approvals, impersonations, submissions och replay-Ã¥tgÃ¤rder ska skriva samma auditform.
- [x] 3.2 [NEW BUILD] **Bygg evidence-packs** â€” Submissions, annual packages, cutover, support cases, break-glass och project evidence ska kunna paketeras, hash-as och arkiveras.
- [x] 3.3 [NEW BUILD] **Full observability** â€” Metrics, tracing, structured logs, invariant alarms, queue age alarms, provider health och projection lag ska vara synliga.
- [x] 3.4 [OPERATIONALIZE] **Restore drills och chaos** â€” Ã…terstÃ¤llning av databas, projection rebuild och worker restart ska Ã¶vas och dokumenteras.
- [x] 3.5 [HARDEN] **Secrets, certifikat och rotationsregler** â€” Separata vaults per mode, certifikatkedjor, callback-hemligheter och nyckelrotation ska vara formaliserade.

**Exit gate**  
- Audit explorer, evidence packs och Ã¥terstÃ¤llningsrutiner fungerar i testad drift. Secrets Ã¤r isolerade per mode och provider.

**Fasstatus**  
- Klar 2026-03-27 genom återverifierad canonical audit envelope inklusive id06, central frozen evidence-bundle-kedja, full observability-payload, restore drill/chaos-coverage och mode-isolerad secret/certificate-runtime.

**Test gate**  
- Restore-from-backup, queue-lag alarms, secret rotation smoke tests, evidence checksum verification, chaos tests pÃ¥ worker/process restart.

**Audit/replay/runtime gate**  
- Audit Ã¤r sjÃ¤lv auditerad: varje auditwrite har integrity hash, correlation id och actor/session metadata.

**Migration/cutover gate**  
- Inga dataflyttar utan checksummor och restoreplan. Cutover-planer mÃ¥ste peka pÃ¥ verifierade rollbackpunkter.

**Blockerar nÃ¤sta steg**  
- Utan observability och evidence gÃ¥r regulated och support-kedjor inte att hÃ¤rda.

**Blockerar go-live**  
- Go-live utan restore drills och secret governance Ã¤r fÃ¶rbjudet.

**Blockerar competitor parity**  
- Parity krÃ¤ver supportbarhet och trygg drift.

**Blockerar competitor advantage**  
- Audit/evidence som differentierare krÃ¤ver denna fas.

**Blockerar UI-readiness**  
- OperatÃ¶rsytor senare krÃ¤ver read models och auditdata som redan finns hÃ¤r.

## [x] Fas 4 â€” Canonical envelopes, error contracts, idempotens, permission resolution och route-dekomposition

**MÃ¥l**  
Standardisera alla externa och interna kontrakt, bryta upp blandade route-filer och infÃ¶ra server-side permission resolution med action classes.

**Beroenden**  
- 2
- 3

**FÃ¥r kÃ¶ras parallellt med**  
- Envelope-/errorkontrakt och route-split kan kÃ¶ras parallellt efter gemensam standard Ã¤r satt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen ny routefamilj eller extern adapter fÃ¥r byggas pÃ¥ gamla blandade phase13/phase14-rutter.

**Delfasstatus**  
- 4.1 återverifierad 2026-03-27: standard request/success/error envelopes är nu bevisade mot bibelns fulla kontrakt över API, public API, partner API och webhook-ytor; feature-flag-block och 404 fallback går via canonical error envelopes i stället för success-path, och full svit plus riktade envelope-/webhook-/partner-/public-API-tester håller grönt.
- 4.2 återverifierad 2026-03-27: action classes, trust levels, scope types och expected object version är fortsatt publicerade i route-contract registry för hela muterande route-ytan, och denial semantics är återbevisade både i route metadata och i riktade access-/desktop-only-/permission-sviter.
- 4.3 återverifierad 2026-03-27: `phase14-routes.mjs` är fortsatt ren orchestration plus hjälpfunktioner medan tax-account, balances, fiscal-year, review, resilience, migration och collective-agreements ligger i egna routekataloger; `phase13-routes.mjs` delegerar endast till public-, partner-, job- och automation-kataloger och bär inte längre egna duplicerade routeblock.
- 4.4 återverifierad 2026-03-27: regulated submissions ligger fortsatt separerat från generella integrationsytan i `packages/domain-integrations/src/regulated-submissions.mjs`; `index.mjs` delegerar bara till modulen och riktade phase 12-API- och e2e-sviter bekräftar att envelope/attempt/receipt/replay/recovery-kedjan är verklig runtime.
- 4.5 återverifierad 2026-03-27: contract-minimum-sviten för fiscal-year, tax-account, balances och collective-agreements är fortsatt grön med canonical success envelopes, permission denials, conflict semantics och idempotency-bevis; route metadata och surface-access-sviter visar att denial- och contract-gaten fortfarande håller.

**Delfaser**
- [x] 4.1 [NEW BUILD] **Standard request/success/error envelopes** â€” Alla routes, public API, partner API och webhooks anvÃ¤nder samma envelopeform, correlation-id, idempotency key och classification.
- [x] 4.2 [HARDEN] **Action classes och permission resolution** â€” Varje muterande route mÃ¤rks med required action class, trust level, scope type och expected object version. Route-contract registry tÃ¤cker nu hela POST/PUT/PATCH/DELETE-ytan och `authz/check` kan resolva public, self och company-scoped routes.
- [x] 4.3 [REWRITE] **Dela upp `phase13-routes.mjs` och `phase14-routes.mjs`** â€” Skapa routekatalog per domÃ¤n/funktion: auth, public API, partner API, backoffice, migration, annual reporting, resilience, projects, submissions.
- [x] 4.4 [NEW BUILD] **Etablera hard boundary fÃ¶r regulated submissions** â€” Transport, attempts, receipts och recovery separeras frÃ¥n generella integrationskopplingar. Antingen nytt package eller tydligt submodule med egna APIs.
- [x] 4.5 [OPERATIONALIZE] **Contract-test miniminivÃ¥** â€” Alla routefamiljer fÃ¥r golden envelopes, denial reasons, conflict semantics och idempotency-tests.

**Exit gate**  
- Blandade phase-rutter Ã¤r borta frÃ¥n bindande ytan. Alla routes och externa payloads fÃ¶ljer canonical envelopes, idempotens och permission resolution.

**Fasstatus**  
- Klar 2026-03-27 genom återbevisade canonical envelopes och permission contracts, verklig routekatalog-split, hard boundary för regulated submissions och explicit contract-minimum-svit för de extraherade routefamiljerna inklusive idempotenshärdning där den saknades.

**Test gate**  
- Contract tests fÃ¶r success/error envelopes, denial reasons, sequence handling och route auth. Snapshot tests fÃ¶r payload shape.

**Audit/replay/runtime gate**  
- Varje denied, conflicted eller replayed request fÃ¥r egen auditrad med denial reason och permission source.

**Migration/cutover gate**  
- API-versioner och routeflyttar mÃ¥ste vara bakÃ¥tkompatibla via explicit deprecation-plan; inga tysta path-byten i pilot/production.

**Blockerar nÃ¤sta steg**  
- Auth, regulated flows och external APIs blir ohÃ¥llbara utan detta.

**Blockerar go-live**  
- Blandade routefamiljer och ostandardiserade errors blockerar go-live och support.

**Blockerar competitor parity**  
- API/webhook parity krÃ¤ver konsistenta kontrakt.

**Blockerar competitor advantage**  
- Operator-first API/support story krÃ¤ver denna fas.

**Blockerar UI-readiness**  
- UI-kontrakt kan inte frysas innan envelopes och permissions Ã¤r stabila.

## [x] Fas 5 â€” Rulepack-registry, effective dating, historical pinning och provider baseline registry

**MÃ¥l**  
GÃ¶ra all reglerad logik, baseline-versionering och providerspecifika format spÃ¥rbara, effektiverade och historiskt pinade.

**Beroenden**  
- 4

**FÃ¥r kÃ¶ras parallellt med**  
- Rulepack registry och provider baseline registry kan byggas parallellt.
- Baseline publication workflow kan starta innan alla domÃ¤ner migrerat sina regler.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen regulatorisk kod fÃ¥r fortsÃ¤tta bÃ¤dda in Ã¥rsÃ¤ndringar eller providerformat direkt i affÃ¤rskod.

**Delfaser**
- [x] 5.1 [NEW BUILD] **Rulepack registry** â€” InfÃ¶r versionerade rulepacks fÃ¶r VAT, payroll tax, employer contributions, benefits, mileage, HUS, tax account classification och legal form obligations.
- [x] 5.2 [NEW BUILD] **Provider baseline registry** â€” Versionera XML-scheman, API-versioner, SRU-format, iXBRL/checksums, BankID, Peppol och bankfilformat med effectiveFrom/effectiveTo/checksum.
- [x] 5.3 [HARDEN] **Historical pinning** â€” Varje beslut, journal, submission och annual package ska peka pÃ¥ rulepack-version och baseline-version som anvÃ¤ndes.
- [x] 5.4 [OPERATIONALIZE] **Annual change calendar** â€” InfÃ¶r process fÃ¶r regeluppdateringar, diff-review, sandbox-verifiering, staged publish och rollback.
- [x] 5.5 [REMOVE/DEPRECATE] **Stoppa hÃ¥rdkodade regulatoriska specialfall** â€” Ta bort fri `manual_rate`-logik som standard, hÃ¥rdkodade SINK/avgiftsbrancher utan snapshot och ad hoc provider-switchar.

**Delfasstatus**
- 5.1 klar 2026-03-27: central rulepack-registry styr nu accounting-method, fiscal-year, legal-form obligations, HUS och tax-account med effective-dated resolution i stället för hårdkodade versionssträngar; annual context bär nu pinned rulepack refs, dedikerad 5.1-svit bevisar date-cutover över flera domäner och `docs/runbooks/rulepack-publication.md` finns nu som operativ publiceringsrunbook.
- 5.2 klar 2026-03-27: central provider baseline-registry styr nu BankID RP API, Peppol BIS Billing, payment link API, open banking, bankfilformat, SRU, authority audit exports och iXBRL-format genom effective-dated baselines med checksum och rollbackstöd; auth-, integrations-, partner- och annual-reporting-runtime bär nu pinned provider baseline refs, dedikerad 5.2-svit samt AR-, annual- och partner-sviter bevisar resolutionen och `docs/runbooks/provider-baseline-update.md` finns nu som operativ publiceringsrunbook.
- 5.3 klar 2026-03-27: annual packages, tax declaration packages, regulated submissions, AGI submissions, payroll postings, payout batches och ledger reversal/correction-kedjor bär nu historiskt pinnade `rulepackRefs`, `providerBaselineRefs` och `decisionSnapshotRefs`; `/v1/submissions` släpper igenom pinningdata utan att tappa den i API-lagret, corrections och retries ärver samma refs deterministiskt och dedikerad 5.3-svit samt annual-, payroll- och submission-API-sviter bevisar att refs överlever dispatch, evidence packs, retry, correction, payout match och ledger-omkastningar.
- 5.4 klar 2026-03-27: annual change calendar kör nu som verklig ops-kedja med source snapshots, diff review, sandbox verification, dual approvals, staged publish, publish-blockering före `stagedPublishAt`, rollback och egna `/v1/ops/rule-governance/changes*`-rutter; dedikerad 5.4 unit/integration-svit samt `docs/runbooks/regulatory-change-calendar.md` bevisar processen.
- 5.5 klar 2026-03-27: payroll blockerar nu fri `manual_rate` utan explicit reason code, SINK kräver dokumenterad beslutsreferens, arbetsgivaravgiftens `no_contribution`-specialfall kommer från rulepack-data i stället för hårdkodad årtalsbranch, partner-baselines löses via central baseline selection-manifest + provider registry i stället för ad hoc switchar och pensionsrapporternas providerpolicy ligger i central policy-manifest; dedikerad 5.5 unit/integration-svit samt återkörda payroll-, partner-, pension- och document-flow-sviter bevisar att specialfallen inte längre lever som fria brancher.

**Fasstatus**  
- Klar 2026-03-27 genom central rulepack-registry, provider baseline-registry, historisk pinning, annual change calendar och bortstädade regulatoriska specialfall i payroll-, partner- och providerpolicylagret.

**Exit gate**  
- All reglerad logik och alla providerformat gÃ¥r att spÃ¥ra till version, baseline, effective dating och checksum.

**Test gate**  
- Golden date-cutover tests, same-object-historical reproduction, baseline checksum verification, rollback to previous rulepack in sandbox.

**Audit/replay/runtime gate**  
- Publicering av nytt rulepack/baseline fÃ¥r auditklass `regulatory_change_published`. Emergency overrides krÃ¤ver dual control.

**Migration/cutover gate**  
- Gamla objekt mÃ¥ste fÃ¥ backfilled pinned rulepack/baseline refs innan de anvÃ¤nds i correction/replay.

**Blockerar nÃ¤sta steg**  
- Payroll, VAT, HUS, annual reporting och tax account blir juridiskt opÃ¥litliga utan historisk pinning.

**Blockerar go-live**  
- Go-live utan rulepack registry Ã¤r fÃ¶rbjudet i reglerade omrÃ¥den.

**Blockerar competitor parity**  
- Svensk parity krÃ¤ver exakt Ã¥rslogik.

**Blockerar competitor advantage**  
- Historisk reproducerbarhet Ã¤r en kÃ¤rndifferentierare.

**Blockerar UI-readiness**  
- UI kan inte visa sÃ¤kra blockers, explanations eller receipts utan rulepack refs.

## [x] Fas 6 â€” Auth, identity, session trust, device trust och backoffice-boundaries

**MÃ¥l**  
GÃ¶ra identitet, step-up, federation, impersonation och break-glass verkliga och separera customer-facing och backoffice-boundaries tekniskt.

**Beroenden**  
- 4
- 5

**FÃ¥r kÃ¶ras parallellt med**  
- Passkeys/TOTP och session/device trust kan byggas parallellt.
- Federation och backoffice approvals kan pÃ¥bÃ¶rjas parallellt efter auth broker-grÃ¤nssnittet Ã¤r satt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Inga regulated submissions eller write-capable supportflÃ¶den fÃ¥r Ã¶ppnas innan step-up och backoffice-boundaries Ã¤r tvingande.

**Delfaser**
- [x] 6.1 [REPLACE] **Byt BankID-stub mot auth broker** â€” Klar: auth broker ersÃ¤tter stubben, Signicat-baserad BankID kÃ¶r i sandbox/production via broker, passkeys/TOTP lÃ¤nkas som lokala identity accounts, WorkOS-baserad federation har start/callback-routes, durable broker-state och runbook. Ã…terverifierad 2026-03-27.
- [x] 6.2 [NEW BUILD] **Session trust och challenge center** â€” Klar: `SessionRevision`, trustnivÃ¥er, fresh step-up, device trust, challenge completion receipts, action-specific TTL, challenge-center routes och durable restore finns nu i runtime och API. Ã…terverifierad 2026-03-27.
- [x] 6.3 [HARDEN] **Scope, queue och visibility enforcement** â€” Klar: review center queues/items, activity feeds och operational work items permission-trimmas nu server-side med viewer/team-scope, backoffice visibility gates och cross-team denial tests. Ã…terverifierad 2026-03-27.
- [x] 6.4 [NEW BUILD] **Impersonation, break-glass och access attestation** â€” Klar: impersonation och break-glass har nu explicit approve/start/end-livscykel, TTL/expiry, watermark-payloads, allowlistbunden aktivering, kvartalsvis access-review-fönster, stale-grant-detektion och runbooks för support- och incidentdrift. Återverifierad 2026-03-27.
- [x] 6.5 [OPERATIONALIZE] **Sandbox/prod isolation fÃ¶r identitet** â€” Klar: auth har nu mode-katalog per provider, `/v1/auth/providers/isolation`, produktionsgating nÃ¤r auth-inventory saknas, federations-callbacks per mode och explicit testidentitetsseparation mellan non-production och production. Ã…terverifierad 2026-03-27.

**Exit gate**  
- BankID/passkeys/TOTP fungerar, enterprise federation kan anslutas via broker, backoffice-write krÃ¤ver korrekt approvals och step-up, och permissions Ã¤r server-side enforced.

**Delfasstatus**
- 6.1 återverifierad 2026-03-27
- 6.2 återverifierad 2026-03-27
- 6.3 återverifierad 2026-03-27
- 6.4 återverifierad 2026-03-27
- 6.5 återverifierad 2026-03-27

**Test gate**  
- BankID sandbox/prod isolation, passkey enroll/revoke, TOTP recovery, SSO login, impersonation denial tests, dual control tests, access review tests.

**Audit/replay/runtime gate**  
- Alla auth-hÃ¤ndelser, linkings, factor changes, impersonations och break-glass actions fÃ¥r immutable audit och evidence refs.

**Migration/cutover gate**  
- Befintliga konton migreras till nya identity-linking-modellen utan att dubbla accounts eller role leaks uppstÃ¥r.

**Blockerar nÃ¤sta steg**  
- Payroll, filings, payouts, backoffice och partner APIs krÃ¤ver korrekt auth fÃ¶rst.

**Blockerar go-live**  
- Go-live utan stark identitet och server-side permission enforcement Ã¤r fÃ¶rbjudet.

**Blockerar competitor parity**  
- Parity krÃ¤ver BankID och fungerande auth.

**Blockerar competitor advantage**  
- Enterprise advantage krÃ¤ver federation, attestation och backoffice-boundaries.

**Blockerar UI-readiness**  
- UI-kontrakt fÃ¶r actions och challenge center blockerar tills trustnivÃ¥er Ã¤r satta.

## [ ] Fas 7 â€” Tenant bootstrap, modulaktivering och trial/testkonto-system

**MÃ¥l**  
Skapa en separat kÃ¤lla fÃ¶r tenant bootstrap, module activation, finance readiness och trial/live-livscykel sÃ¥ att onboarding, demo, pilot och go-live blir sÃ¤kra.

**Beroenden**  
- 5
- 6

**FÃ¥r kÃ¶ras parallellt med**  
- Trial foundation och standard bootstrap kan byggas parallellt efter att canonical objects Ã¤r satta.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen sÃ¤ljbar trial eller kundonboarding fÃ¥r lanseras innan trial-isolering och upgrade-regler finns.

**Delfaser**
- [x] 7.1 [NEW BUILD] **InfÃ¶r `domain-tenant-control`** â€” Nytt package Ã¤ger `TenantBootstrap`, `CompanySetupProfile`, `ModuleActivationProfile`, `GoLivePlan`, `TrialEnvironmentProfile`, `ParallelRunPlan`, `PromotionPlan`.
- [x] 7.2 [HARDEN] **Bygg finance-ready bootstrap** â€” Legal form, accounting method, fiscal year, chart template, VAT profile, reporting obligation profile, role template och queue structure ska skapas i korrekt ordning.
- [x] 7.3 [NEW BUILD] **Bygg trial/testkonto-isolering** â€” Trial tenants fÃ¥r eget mode, vattenmÃ¤rkning, fake/sandbox providers, blocked live credentials och skydd mot verkliga ekonomiska konsekvenser.
- [x] 7.4 [NEW BUILD] **Seed scenarios, reset och refresh** â€” Klar: canonical seed-katalog med åtta scenarier finns nu, legacy-alias mappas deterministiskt, refresh-pack kan fylla på processdata utan att röra masterdata, reset revokerar övriga öppna trial-sessioner, arkiverar process-state metadata och fryser evidence-bundles för reset/refresh innan scenariot reseedas.
- [x] 7.5 [MIGRATE] **Bygg upgrade trial->live** â€” Klar: promotion bygger nu `PromotionValidationReport` och `PortableDataBundle`, kräver explicit approval coverage, föder ny live-company via separat onboarding/bootstrap-path, kopierar endast portable masterdata/settings/importbatches och blockerar direktcarry av trial ledger, receipts, provider refs, submissions och evidence.

**Delfasstatus**
- 7.1 Ã¥terverifierad 2026-03-27
- 7.2 klar 2026-03-27
- 7.3 klar 2026-03-27
- 7.4 klar 2026-03-28
- 7.5 klar 2026-03-28

**Exit gate**  
- Tenant kan bli finance-ready eller trial-safe via samma orchestrator. Trial Ã¤r marknadsmÃ¤ssig, sÃ¤ker och isolerad. Promotion till live Ã¤r definierad och testad.

**Test gate**  
- Bootstrap tests per legal form, trial isolation tests, trial reset tests, promotion masterdata copy tests, denial tests fÃ¶r live credentials i trial.

**Audit/replay/runtime gate**  
- Alla bootstrap-, activation-, reset- och promotionsteg loggas med operator, seed scenario, source snapshot och carry-over policy.

**Migration/cutover gate**  
- Promotion till live anvÃ¤nder egen cutover-path; ingen rÃ¥ kopiering frÃ¥n trial till live utan explicit import/promotion contract.

**Blockerar nÃ¤sta steg**  
- Go-live, pilots och market-winning trial blockerades utan detta.

**Blockerar go-live**  
- Ingen finance-ready tenantsetup = inget go-live.

**Blockerar competitor parity**  
- Parity krÃ¤ver snabb onboarding; trial saknas = sÃ¤ljfriktion mot Bokio/Teamleader/monday-liknande produkter.

**Blockerar competitor advantage**  
- SÃ¤ker trial-to-live Ã¤r en uttalad winning move.

**Blockerar UI-readiness**  
- UI-readiness senare krÃ¤ver stabil bootstrap/status/mode-modell.

## [x] Fas 8 â€” Legal form, accounting method, fiscal year, ledger, posting recipes och close-kÃ¤rna

**MÃ¥l**  
Bygga den svenska bokfÃ¶ringskÃ¤rnan som resten av systemet vilar pÃ¥: legal form, periodkalender, posting recipes, voucher series, locks och correction/reopen.

**Beroenden**  
- 7

**FÃ¥r kÃ¶ras parallellt med**  
- Legal form/accounting method/fiscal year kan fÃ¤rdigstÃ¤llas parallellt med chart/voucher series.
- Close-readiness kan fÃ¶rberedas parallellt efter posting engine.

**FÃ¥r inte kÃ¶ras parallellt med**  
- AR/AP/VAT/payroll/posting fÃ¥r inte Ã¶ppnas innan ledger/posting recipe-engine Ã¤r canonical.

**Delfaser**
- [x] 8.1 [HARDEN] **Legal form profiles och reporting obligations** â€” Klar: legal-form-motorn validerar nu signatory/filing/declaration-profiler per bolagsform, partnerships med årsredovisningsplikt får egen filing-profile, declaration-resolution följer godkänd reporting obligation i stället för legal-form-default och nya annual obligations kan supersedera tidigare godkända profiler utan att öppna dubbla drafts.
- [x] 8.2 [HARDEN] **Accounting method och fiscal year** â€” Klar: accounting-method-profiler och change requests kräver nu explicit fiscal-year-boundary utanför onboarding, äldre öppna requests för samma boundary supersederas deterministiskt och fiscal-year-change-requests kräver group-alignment-referenser när profil eller reason code kräver det, samtidigt som duplicerade öppna intervall blockeras eller ersätts kontrollerat via resubmission med permission-underlag.
- [x] 8.3 [NEW BUILD] **Voucher series, chart governance och dimensionsdisciplin** â€” Klar: ledger-kärnan har nu versionsstyrda konto- och voucher-series-profiler, styrd dimensionskatalog med service lines, journalstämpling av account/voucher/dimension-versioner och blockerar nu både repurpose av använda serier och kontoklassändringar efter faktisk användning.
- [x] 8.4 [HARDEN] **Posting recipe engine** â€” Klar: ledger har nu en central posting-intent/posting-recipe-motor med explicita recipe codes, journaltyper, source object version och signalbinding, samtidigt som AR/AP/payroll inte längre får skapa/validera/posta journaler direkt utan går via samma recipe-kedja som binder metadata och voucher-purpose deterministiskt.
- [x] 8.5 [OPERATIONALIZE] **Close, reopen, reversal och correction engine** â€” Klar: close-kÃ¤rnan bÃ¤r nu strukturerade reopen requests med impact analysis, objektbaserade close adjustments som postar verklig reversal/correction replacement i ledger och separat relock-steg som Ã¥terlÃ¥ser perioden till `soft_locked` innan ny signoff.

**Delfasstatus**
- 8.1 klar 2026-03-28: legal-form- och annual-obligation-kedjan stoppar nu ogiltiga Bolagsverket-/årsredovisningskombinationer, declaration-profile använder den godkända reporting obligationens filing profile och revised annual obligations supersederar tidigare approved versioner deterministiskt; unit- och API-sviter samt fullsvit är återgrönade.
- 8.2 klar 2026-03-28: accounting-method-kedjan kräver nu explicit fiscal-year-boundary för profiler och change requests utanför onboarding, äldre öppna method requests supersederas deterministiskt på samma boundary och fiscal-year-change-requests kräver group-alignment-referenser där profil eller reason code kräver det, samtidigt som duplicerade öppna intervall antingen blockeras eller ersätts kontrollerat via resubmission med permission-underlag; unit-, API- och fullsvit är återgrönade.
- 8.3 klar 2026-03-28: ledger governance bygger nu versionsstyrda konto- och voucher-series-profiler, styrd dimensionskatalog inklusive service lines och journalstämpling av account/voucher/dimension-versioner; nya runtime- och API-sviter bevisar required-dimension-gates, att använda serier inte kan repurposas och att använda konton inte kan byta kontoklass, och fullsviten är återgrönad.
- 8.4 klar 2026-03-28: posting recipe-engine finns nu som central ledger-motor med registry för AR/AP/payroll/bank/tax-account/HUS/year-end, tvingar explicit source object version, binder postingRecipeCode/journalType/postingSignalCode i journalmetadata och downstream-domänerna AR/AP/payroll går nu via `applyPostingIntent` i stället för direkta `createJournalEntry`/`validateJournalEntry`/`postJournalEntry`-kedjor; nya unit- och API-asserts bevisar metadata och fullsviten är återgrönad.
- 8.5 klar 2026-03-28: reopen flÃ¶dar nu via strukturerade `ReopenRequest`-objekt med impact analysis, close adjustments kan skapa verklig reversal eller correction replacement mot journaler inom den Ã¥terÃ¶ppnade close-windown, och separat relock-steg lÃ¥ser tillbaka perioden till `soft_locked` innan ny signoff; riktade unit-, close-API- och route-metadata-sviter samt `docs/runbooks/ledger-close-and-reopen.md` bevisar kedjan.

**Exit gate**  
- Ledger Ã¤r enda bokfÃ¶ringssanning. PeriodlÃ¥s, reopen, correction och legal-form-profiler fungerar och Ã¤r versionsstyrda.

**Fasstatus**  
- Klar 2026-03-28 genom legal-form- och fiscal-year-hÃ¤rdning, versionsstyrd ledger governance, central posting recipe-engine och ny close/reopen/correction/relock-kedja med objektbaserade requests, close adjustments och operativ runbook.

**Test gate**  
- Golden postings per signal, lock/reopen tests, close blocker tests, fiscal-year boundary tests, historical reproduction with pinned rulepacks.

**Audit/replay/runtime gate**  
- Alla postings bÃ¤r source object/version, recipe code, rulepack version, voucher series och actor/session context.

**Migration/cutover gate**  
- Opening balances och historical imports fÃ¥r endast landa genom `historical_import`-journaltyp och verifierad differenshantering.

**Blockerar nÃ¤sta steg**  
- All finance, tax, payroll och projects profitability blockerar utan detta.

**Blockerar go-live**  
- BokfÃ¶ringsmotor utan locks/corrections blockerar go-live.

**Blockerar competitor parity**  
- Parity mot ekonomiaktÃ¶rer krÃ¤ver detta.

**Blockerar competitor advantage**  
- Controlled reopen/correction Ã¤r del av premiumfÃ¶rdel.

**Blockerar UI-readiness**  
- UI-readiness fÃ¶r reports/workbenches blockerar tills ledger och close Ã¤r stabila.

## [ ] Fas 9 â€” AR, AP, VAT, banking, tax account och document-posting gates

**MÃ¥l**  
Knyta dokument, leverantÃ¶rer, kunder, bank och skattekonto till bokfÃ¶ringskÃ¤rnan utan att tillÃ¥ta otillÃ¥tna autopostningar eller fuzzy matching.

**Beroenden**  
- 8

**FÃ¥r kÃ¶ras parallellt med**  
- AR och AP kan byggas parallellt.
- VAT och banking kan byggas parallellt efter posting engine.
- Tax account kan byggas parallellt med banking nÃ¤r classification registry finns.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen automatisk posting frÃ¥n OCR, statement import eller tax account discrepancy detection utan blockerande gates.

**Delfasstatus**
- 9.1 klar 2026-03-28: AR-kedjan Ã¤r nu Ã¥terverifierad end-to-end med kundfakturor, kreditnotor, abonnemang, payment links, allocations, reskontra, legal invoice-readiness och revenue dimensions som bÃ¤rs hela vÃ¤gen till ledgerpostning med governed dimensionkrav.
- 9.2 klar 2026-03-28: AP-kedjan bÃ¤r nu first-class leverantÃ¶rskredit med `AP_CREDIT_NOTE`, explicit payment-preparation per open item, blockerad proposal/export fÃ¶r kredit/open-item <= 0 och governed allocation review-gates som stoppar posting tills ledgerkrÃ¤vda dimensioner finns och Ã¤r giltiga.
- 9.3 klar 2026-03-28: VAT-kedjan bÃ¤r nu first-class declaration basis med blocker codes, review-resolution som muterar verkligt momsbeslut, periodlÃ¥s/unlock fÃ¶r deklarationsfÃ¶nster och route-/auditkedja som blockerar nya momsbeslut tills perioden uttryckligen lÃ¥sts upp igen.
- 9.4 klar 2026-03-28: banking bÃ¤r nu first-class `PaymentBatch`, `StatementImport` och `SettlementLiabilityLink` med open-banking- och bankfilrails, baseline-spÃ¥rning, read-routes, explicit statement-importmetadata och end-to-end settlement mapping mot bÃ¥de AP-open items och tax-account-events.

**Delfaser**
- [x] 9.1 [HARDEN] **AR end-to-end** â€” Kundfakturor, kreditnotor, abonnemang, collection/payment links, allocations, reskontra, invoice readiness och revenue dimensions.
- [x] 9.2 [HARDEN] **AP end-to-end** â€” LeverantÃ¶rsfakturor, krediter, attest, matchning, payment prep och cost allocations med review gates.
- [x] 9.3 [HARDEN] **VAT decision engine** â€” VAT source of truth, decision inputs/outputs, timing, lock/unlock, declaration basis och review boundaries.
- [x] 9.4 [NEW BUILD] **Banking och payment rails** â€” Open banking, bankfiler, payment batches/orders, statement import, matchning, settlement liability mapping.
- [x] 9.5 [HARDEN] **Tax account subledger** â€” SkattekontohÃ¤ndelser, import, klassificering, offset, discrepancy cases, liability match och reconciliation blockers.
- [x] 9.6 [HARDEN] **Document-posting gates** â€” Inget dokument, statement eller tax event bokas fÃ¶rrÃ¤n explicit affÃ¤rsdomÃ¤n har godkÃ¤nt sakobjektet.

**Exit gate**  
- AR/AP/VAT/banking/tax account fungerar end-to-end med review, reconciliation och blockers. Inga fÃ¶rbjudna autopostningar finns kvar.

**Test gate**  
- Invoice-to-ledger, AP-to-payment, statement-match, VAT-return basis, tax-account reconciliation, negative cases for unmatched or conflicting events.

**Audit/replay/runtime gate**  
- Payment orders, matches, tax account classifications och VAT locks har full audit och evidence chain.

**Migration/cutover gate**  
- Open AR/AP, statement history, tax account history och opening balances mÃ¥ste kunna importeras och diffas fÃ¶re pilot.

**Blockerar nÃ¤sta steg**  
- Documents, payroll, HUS och projects profitability krÃ¤ver stabil finance-adjacent sanning.

**Blockerar go-live**  
- Bank, VAT eller skattekonto utan reconciliation blockerar go-live.

**Blockerar competitor parity**  
- Parity mot Fortnox/Visma/Bokio krÃ¤ver detta.

**Blockerar competitor advantage**  
- Tax account as first-class domain och stronger gates krÃ¤ver denna fas.

**Blockerar UI-readiness**  
- Finance UI kan inte designas tryggt utan full route- och blockerlogik.

## [ ] Fas 10 â€” Documents, OCR, classification, import cases och review center

**MÃ¥l**  
GÃ¶ra document-to-decision-kedjan verklig: originaldokument, OCR, klassificering, import cases, review queues och evidence-hashar.

**Beroenden**  
- 9

**FÃ¥r kÃ¶ras parallellt med**  
- OCR-adapter och classification pipeline kan byggas parallellt.
- Review center och import-case mapping kan byggas parallellt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Inget OCR- eller classificationsfÃ¶rslag fÃ¥r leda till posting, payroll eller filing utan reviewgrÃ¤ns dÃ¤r required.

**Delfaser**
- [ ] 10.1 [HARDEN] **Originaldokument och versionskedja** â€” Original, hash, checksum, source fingerprint, retention class och evidence refs.
- [ ] 10.2 [REPLACE] **Byt OCR-stub mot riktig provider** â€” Google Document AI eller vald baseline-adapter med confidence, rerun, page limits, async callback och low-confidence review.
- [ ] 10.3 [HARDEN] **Classification/extraction pipeline** â€” Canonical extraction model fÃ¶r AP, AR, payroll underlag, benefits/travel och attachments.
- [ ] 10.4 [HARDEN] **Import cases och blocker codes** â€” Completeness, blocking reasons, correction requests, human decisions och replay-safe mapping till downstream domain.
- [ ] 10.5 [OPERATIONALIZE] **Review center queues/SLA/escalation** â€” Riskklass, queue ownership, SLA, claim/start/reassign/decide/close och audit.

**Exit gate**  
- Dokument gÃ¥r frÃ¥n original till godkÃ¤nt sakobjekt via spÃ¥rbar OCR/extraction/review-kedja utan fÃ¶rbjudna autopostningar.

**Test gate**  
- OCR happy path, low-confidence path, timeout/retry, classification drift tests, import-case blocker tests, queue SLA escalation tests.

**Audit/replay/runtime gate**  
- Alla OCR-runs, classification suggestions, overrides och review decisions fÃ¥r evidence refs och actor data.

**Migration/cutover gate**  
- Historiska dokument kan importeras som archive-only eller active-review; aldrig som obevakad source of truth utan fingerprinting.

**Blockerar nÃ¤sta steg**  
- Payroll, AP, expense, HUS och migration krÃ¤ver verklig dokumentmotor.

**Blockerar go-live**  
- Supplier invoice, expense och document-driven operations blockerar utan detta.

**Blockerar competitor parity**  
- OCR och document review Ã¤r hygien.

**Blockerar competitor advantage**  
- Document-to-decision with evidence is a winning move.

**Blockerar UI-readiness**  
- Document, inbox och review UI blockerar tills denna fas Ã¤r klar.

## [ ] Fas 11 â€” HR, time, balances, collective agreements och migration intake

**MÃ¥l**  
GÃ¶ra people masterdata, time/absence, balances, centralt publicerade kollektivavtal och supportstyrda avtalsavvikelser till stabila inputs fÃ¶r payroll, projects och migration.

**Beroenden**  
- 7
- 9
- 10

**FÃ¥r kÃ¶ras parallellt med**  
- HR masterdata och time/absence kan byggas parallellt.
- Balances och collective agreements kan byggas parallellt efter masterdata.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen payroll- eller project-costing-kedja fÃ¥r anvÃ¤nda oapproved time/absence eller odaterade employment snapshots.

**Delfaser**
- [ ] 11.1 [HARDEN] **HR/employment source of truth** â€” Employee, employment, organization placement, salary basis, cost center, service line och effective dating.
- [ ] 11.2 [HARDEN] **Time, absence och balances** â€” Approved time inputs, absence types, carryovers, leave locks och AGI-sensitive absence boundaries.
- [ ] 11.3 [HARDEN] **Collective agreement catalog och engine** â€” Centralt publicerat avtalsbibliotek, supportstyrd intake av nya avtal, intern AI-assisterad extraktion med mÃ¤nsklig payroll/compliance-approval, publicerad dropdown-selektion, agreement assignment, effective dates, pay item derivation, rate tables, lokala supplements och override governance.
- [ ] 11.4 [MIGRATE] **Payroll-adjacent history import** â€” Employee master, employment history, YTD, balances, AGI history, benefits/travel history och evidence mapping.
- [ ] 11.5 [NEW BUILD] **Payroll input snapshots** â€” LÃ¥s input fingerprints och snapshot objects som pay run senare konsumerar.

**Exit gate**  
- Payroll, projects och review kan lita pÃ¥ HR/time/balances/agreements som canonical inputs med effective dating, publicerad avtalskatalog, supportstyrda lokala tillÃ¤gg och importstÃ¶d.

**Test gate**  
- Employment history timeline tests, balance carryover tests, collective agreement rate tests, support-managed agreement intake, published dropdown selection restrictions, local supplement approval tests, historical import/YTD validation.

**Audit/replay/runtime gate**  
- AnstÃ¤llningsÃ¤ndringar, balance adjustments, agreement assignments, agreement intake/publication/local supplements och manual overrides mÃ¥ste auditeras med reason codes.

**Migration/cutover gate**  
- Importkatalog fÃ¶r HR/payroll-historik ska kunna diffas mot legacy och signas av innan fÃ¶rsta pay run i pilot.

**Blockerar nÃ¤sta steg**  
- Payroll correctness blockerar utan denna fas.

**Blockerar go-live**  
- LÃ¶n utan korrekt masterdata/time/agreements blockerar go-live.

**Blockerar competitor parity**  
- Parity mot lÃ¶nekonkurrenter krÃ¤ver detta.

**Blockerar competitor advantage**  
- Cross-domain cost allocation och project profitability krÃ¤ver denna fas.

**Blockerar UI-readiness**  
- HR/time/payroll UI blockerar utan stabil people truth.

## [ ] Fas 12 â€” Payroll, AGI, benefits, travel, pension, salary exchange och Kronofogden

**MÃ¥l**  
Bygga svensk produktionssÃ¤ker lÃ¶n med tabellskatt/jÃ¤mkning/SINK, employer contributions, benefits, travel, pension och lÃ¶neutmÃ¤tning.

**Beroenden**  
- 5
- 9
- 11

**FÃ¥r kÃ¶ras parallellt med**  
- Benefits/travel och pension kan byggas parallellt.
- Kronofogden-remittance kan fÃ¶rberedas parallellt efter tax decision snapshots.

**FÃ¥r inte kÃ¶ras parallellt med**  
- AGI-submission, live payroll eller bank payment batch fÃ¥r inte Ã¶ppnas innan preliminÃ¤rskatt och garnishment Ã¤r korrekt.

**Delfaser**
- [ ] 12.1 [REPLACE] **Byt `manual_rate` som standard** â€” InfÃ¶r `TaxDecisionSnapshot` med tabell, jÃ¤mkning, engÃ¥ngsskatt, SINK och emergency manual endast med dual review.
- [ ] 12.2 [HARDEN] **Employer contributions och vÃ¤xa-stÃ¶d** â€” Implementera Ã¥lderslogik, reducerade nivÃ¥er, blandade component-split och vÃ¤xa-stÃ¶d via skattekonto/decision snapshots.
- [ ] 12.3 [HARDEN] **Pay run engine och AGI constituents** â€” Fingerprints, ordering, posting intents, payment batch, immutable AGI version, changed-employee flags.
- [ ] 12.4 [HARDEN] **Benefits, net deductions, travel, mileage** â€” Skatteklassificering, nettolÃ¶neavdrag, traktamente, milersÃ¤ttning, expense split och review codes.
- [ ] 12.5 [HARDEN] **Pension och salary exchange** â€” Policy, effective dating, pension basis, special payroll tax, provider export instruction.
- [ ] 12.6 [NEW BUILD] **Kronofogden/lÃ¶neutmÃ¤tning** â€” Decision snapshots, fÃ¶rbehÃ¥llsbelopp, protected amount, remittance liability, payment order och audit chain.
- [ ] 12.7 [OPERATIONALIZE] **Payroll trial guards** â€” Trial mode fÃ¥r producera hela pay-run/AGI-kedjan men endast mot non-live receipts, non-live bank rails och watermarked evidence.

**Exit gate**  
- ProduktionssÃ¤ker svensk payroll-logik finns inklusive tabellskatt/jÃ¤mkning/SINK, AGI constituents, benefits/travel/pension och Kronofogden-remittance.

**Test gate**  
- Golden payslips per tax type, SINK yearly renewal, employer contribution edge cases, benefits thresholds, travel rules, garnishment calculations, correction runs.

**Audit/replay/runtime gate**  
- Alla tax decisions, manual fallbacks, garnishment overrides, salary exchange policies och AGI versions fÃ¥r full audit och evidence.

**Migration/cutover gate**  
- Payroll history och YTD mÃ¥ste kunna importeras, diffas och valideras fÃ¶re fÃ¶rsta live-run; corrections fÃ¥r inte tappa historik.

**Blockerar nÃ¤sta steg**  
- HUS, annual reporting, project profitability och pilotgo-live blockerar utan sÃ¤ker payroll.

**Blockerar go-live**  
- Manual-rate payroll eller saknad garnishment blockerar go-live.

**Blockerar competitor parity**  
- Parity mot lÃ¶nemarknaden krÃ¤ver denna fas.

**Blockerar competitor advantage**  
- Payroll correctness + correction chain + supportability Ã¤r stor differentierare.

**Blockerar UI-readiness**  
- Payroll UI kan inte frysas fÃ¶re detta.

## [ ] Fas 13 â€” HUS, regulated submissions, receipts/recovery, declarations och annual reporting

**MÃ¥l**  
SlutfÃ¶ra alla reglerade submission-kedjor: AGI, VAT, HUS, annual reporting/declarations med receipts, recovery, correction och tax-account-koppling.

**Beroenden**  
- 5
- 9
- 12

**FÃ¥r kÃ¶ras parallellt med**  
- HUS och annual reporting kan byggas parallellt efter generic submission model.
- AGI/VAT transportadaptrar kan byggas parallellt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen live submission eller live filing fÃ¥r ske innan technical receipt, material receipt, correction och replay Ã¤r definierade och testade.

**Delfaser**
- [ ] 13.1 [HARDEN] **HUS/ROT/RUT lifecycle** â€” Verified payment, locked fields, buyer allocation, deadlines, XML/direct transport, decisions, partial acceptance, recovery.
- [ ] 13.2 [NEW BUILD] **Submission envelope/attempt/receipt core** â€” Canonical objects fÃ¶r envelope, attempt, receipt, correction link, action queue item, evidence pack.
- [ ] 13.3 [REPLACE] **Byt simulerad transport mot riktiga adapters** â€” AGI, Moms, HUS och annual filing anvÃ¤nder riktiga transportsÃ¤tt eller explicita official fallbacks med samma canonical payload.
- [ ] 13.4 [HARDEN] **Annual package, declarations och signoff** â€” Locked report snapshots, package hash, legal form profile, signatory chain, SRU/iXBRL/official API handling.
- [ ] 13.5 [HARDEN] **Receipt, replay, dead-letter och recovery** â€” Technical vs material receipt, idempotent replay, correction-only new payload, operator interventions och reconciliation rules.
- [ ] 13.6 [NEW BUILD] **Trial-safe regulated simulators** â€” Trial mode fÃ¥r only-simulate official transport med deterministic fake receipts, explicit `legalEffect=false` och audit watermarks.

**Exit gate**  
- Alla reglerade flÃ¶den gÃ¥r via samma receipt/recovery-modell. HUS, AGI, VAT och annual filing Ã¤r transport- och operator-mÃ¤ssigt kompletta.

**Test gate**  
- Submission success, technical fail, material fail, replay same payload, correction new version, HUS partial acceptance/recovery, annual filing signatory mismatches.

**Audit/replay/runtime gate**  
- Submission, signoff, receipt collection, correction, replay och dead-letter intervention fÃ¥r immutable audit och evidence bundle.

**Migration/cutover gate**  
- Historiska filings och receipts kan importeras som immutable history men aldrig redigeras; nya corrections startar frÃ¥n pinned package versions.

**Blockerar nÃ¤sta steg**  
- Cutover, pilot och compliance parity blockerar utan detta.

**Blockerar go-live**  
- Inget go-live utan verkliga receipt-kedjor.

**Blockerar competitor parity**  
- Parity mot Visma/Fortnox/Wint krÃ¤ver deklarations- och filingkedjor.

**Blockerar competitor advantage**  
- Unified submissions/recovery cockpit Ã¤r en central premiumfÃ¶rdel.

**Blockerar UI-readiness**  
- Submission och compliance UI blockerar tills canonical receipts finns.

## [ ] Fas 14 â€” Generell project core, CRM-linked commercial chain, profitability, portfolio, field och vertikala packs

**MÃ¥l**  
Bygga projektfÃ¤ltet som generell projekt- och uppdragsmotor fÃ¶r alla branscher, med CRM-handoff, resource/portfolio/profitability och valbara field/personalliggare/ID06-pack ovanpÃ¥.

**Beroenden**  
- 8
- 9
- 11
- 12

**FÃ¥r kÃ¶ras parallellt med**  
- Project commercial core och profitability engine kan byggas parallellt.
- Field/personalliggare/ID06 packs kan byggas parallellt efter general core.
- CRM/project adapters kan pÃ¥bÃ¶rjas i fas 16 men kontrakten lÃ¥ses hÃ¤r.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen work-order eller bygglogik fÃ¥r tvingas in som universell projektmodell. Inga CRM-objekt fÃ¥r bli source of truth fÃ¶r projektfinans eller profitability.

**Delfaser**
- [ ] 14.1 [HARDEN] **General project-commercial core** â€” Project, Engagement, WorkModel, WorkPackage, DeliveryMilestone, WorkLog, CostAllocation, RevenuePlan, ProfitabilitySnapshot, ProjectDeviation, ProjectEvidenceBundle.
- [ ] 14.2 [NEW BUILD] **CRM-linked handoff** â€” Opportunity/quote-to-project conversion, change order chain, billing plan, status updates, customer context och acceptance handoff frÃ¥n CRM utan att gÃ¶ra CRM till source of truth.
- [ ] 14.3 [NEW BUILD] **Billing models och WIP/profitability** â€” Fixed price, time & materials, milestone, retainer capacity, subscription service, advance invoice, hybrid change order och profitability frÃ¥n payroll/AP/material/travel/HUS/billing.
- [ ] 14.4 [NEW BUILD] **Resource, portfolio och riskstyrning** â€” Capacity reservations, assignment planning, skills/roles, project portfolio, risk register, status updates, budget vs actual vs forecast.
- [ ] 14.5 [HARDEN] **Field/service/work-order pack** â€” OperationalCase, DispatchAssignment, MaterialUsage, FieldEvidence, SignatureRecord, SyncEnvelope, ConflictRecord. Work orders ska vara optional pack.
- [ ] 14.6 [HARDEN] **Personalliggare, ID06 och egenkontroll packs** â€” Attendance som separat sanning, ID06 identity graph, workplace bindings, checklist/signoff, construction pack som vertikal overlay.
- [ ] 14.7 [NEW BUILD] **Project trial/demo flows och migration** â€” Seed project scenarios, import from CRM/project tools, client-ready demo data, safe invoicing simulation och eventual live conversion path.

**Exit gate**  
- Project core fungerar fÃ¶r konsult, byrÃ¥, service, installation, maintenance, construction, campaign och supportprogram utan att tvinga byggsemantik pÃ¥ alla. Profitability Ã¤r verklig. Field/personalliggare/ID06 Ã¤r layer-packs.

**Test gate**  
- Consulting time/milestone, retainer capacity, field service order with signature, construction workplace with attendance/ID06, change order profitability, forecast vs actual.

**Audit/replay/runtime gate**  
- Project approvals, change orders, invoicing readiness, field evidence, attendance corrections, ID06 validations och profitability adjustments ska auditeras.

**Migration/cutover gate**  
- Projekt, quotes, open work, unbilled time, tasks, customers och profitability baselines ska kunna importeras frÃ¥n utvalda externa system.

**Blockerar nÃ¤sta steg**  
- CRM/project parity och field vertical parity blockerar utan denna fas.

**Blockerar go-live**  
- Service- och projektbolag kan inte drivas i systemet utan detta.

**Blockerar competitor parity**  
- Parity mot monday/Asana/ClickUp/Teamleader/Zoho/Odoo/Dynamics/Bygglet krÃ¤ver denna fas.

**Blockerar competitor advantage**  
- General core + stronger profitability + regulated coupling Ã¤r vÃ¥r tydligaste project-market win move.

**Blockerar UI-readiness**  
- Project UI och field mobile blockerar tills general core och packgrÃ¤nser Ã¤r stabila.

## [ ] Fas 15 â€” Reporting, search, object profiles, saved views, notifications, activity och work items

**MÃ¥l**  
Materialisera read models, operator views och separata objektfamiljer som framtida UI och backoffice ska vila pÃ¥.

**Beroenden**  
- 8
- 9
- 10
- 12
- 13
- 14

**FÃ¥r kÃ¶ras parallellt med**  
- Reporting/read models och search/object profiles kan byggas parallellt.
- Notifications/activity/work items kan byggas parallellt efter permission resolution.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen UI-readiness eller support cockpit fÃ¥r deklareras innan read models, saved views och queue ownership finns som backend-kontrakt.

**Delfaser**
- [ ] 15.1 [HARDEN] **Reporting snapshots och metrics** â€” Trial balance, P&L, balance sheet, cashflow, open items, payroll reports, project portfolio, tax account summary och submission dashboards.
- [ ] 15.2 [HARDEN] **Search, object profiles och workbenches** â€” Permission-trimmade object profiles, blockers, sections, actions, workbench composition och saved views.
- [ ] 15.3 [HARDEN] **Notifications och activity som egna familjer** â€” Recipient, channel, digest, snooze, escalation och append-only activity feeds.
- [ ] 15.4 [HARDEN] **Work items, queues och ownership** â€” Queue grants, SLA, escalation, assignment, dual-control blockers och operator views.
- [ ] 15.5 [NEW BUILD] **Project/finance/compliance mission control** â€” Portfolio dashboards, close blockers, payroll submission monitoring, cutover dashboards, trial conversion dashboard.

**Exit gate**  
- Read models och workbench-kontrakt finns fÃ¶r alla kritiska operatÃ¶rsytor. Search Ã¤r aldrig source of truth men alltid korrekt permission-trimmad.

**Test gate**  
- Projection rebuild, ACL search tests, workbench blockers, notification visibility, digest generation, saved view compatibility tests.

**Audit/replay/runtime gate**  
- View generation och queue actions har audit trail; sensitive visibility denials loggas med reason codes.

**Migration/cutover gate**  
- Projection versioning och saved-view migration mÃ¥ste stÃ¶dja bakÃ¥tkompatibilitet genom pilot.

**Blockerar nÃ¤sta steg**  
- Public API sandbox catalog, backoffice och UI-readiness krÃ¤ver dessa read models.

**Blockerar go-live**  
- OperatÃ¶rer kan inte driva systemet utan dashboards/work items.

**Blockerar competitor parity**  
- Parity krÃ¤ver anvÃ¤ndbara read models, Ã¤ven om UI kommer senare.

**Blockerar competitor advantage**  
- Object profiles + operator-first workbench Ã¤r en kÃ¤rndifferentierare.

**Blockerar UI-readiness**  
- Denna fas Ã¤r det direkta UI-underlaget.

## [ ] Fas 16 â€” Integrationsplattform, public API, partner API, webhooks och prioriterade provideradapters

**MÃ¥l**  
GÃ¶ra integrationslagret verkligt: connections, credentials, consent, provider health, public sandbox, partner ops, signed webhooks och rÃ¤tt adapterordning.

**Beroenden**  
- 4
- 5
- 6
- 9
- 10
- 12
- 13
- 15

**FÃ¥r kÃ¶ras parallellt med**  
- Public API/webhooks och partner control-plane kan byggas parallellt.
- Olika provideradapters kan byggas parallellt efter capability manifest, men live-aktivering fÃ¶ljer domÃ¤ngater.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Inga live providers fÃ¥r aktiveras fÃ¶re sina domÃ¤ngater. ID06 fÃ¥r inte rÃ¥ka anvÃ¤nda trial/sandbox pÃ¥ fel sÃ¤tt. CRM/project-adapters fÃ¥r inte styra core semantics.

**Delfaser**
- [ ] 16.1 [HARDEN] **Integration core, credentials och consent** â€” Capability manifest, credential metadata, consent grant, health checks, rate limits, fallback modes, environment isolation.
- [ ] 16.2 [HARDEN] **Public API och sandbox catalog** â€” Client credentials, scope catalog, versioned spec, sandbox catalog, report snapshots, tax account summary, example webhook events.
- [ ] 16.3 [HARDEN] **Partner API, contract tests och adapter health** â€” Connection catalog, operation dispatch, async jobs, retry/dead-letter/replay, contract-test packs per adapter.
- [ ] 16.4 [REPLACE] **Byt simulerade finance-adapters mot verkliga** â€” Enable Banking, bankfil/ISO20022, Stripe, Pagero, Google Document AI, Postmark, Twilio, Pleo, official tax transports.
- [ ] 16.5 [HARDEN] **Auth/signing/federation adapters** â€” Signicat, WorkOS, passkey/TOTP, signing/evidence archive.
- [ ] 16.6 [NEW BUILD] **CRM/project ecosystem adapters i rÃ¤tt ordning** â€” HubSpot fÃ¶rst, Teamleader sedan, monday/Asana/ClickUp import/sync dÃ¤refter, Zoho och Odoo som project-billing-kÃ¤llor, Dynamics senare enterprise-spÃ¥r.
- [ ] 16.7 [NEW BUILD] **Trial-safe adapter layer** â€” Alla adapters mÃ¥ste ha `trial_safe`, `sandbox_supported`, `supportsLegalEffect` och receipt-mode sÃ¥ att trial aldrig kan skapa live-ekonomi eller live-filings.

**Exit gate**  
- Public API/webhooks Ã¤r stabila, partner adapters har contract tests, prioriterade providers Ã¤r live dÃ¤r domÃ¤ngater tillÃ¥ter, och trial/prod Ã¤r strikt separerade.

**Test gate**  
- Webhook signing/retry, OAuth/token rotation, provider contract tests, sandbox/prod isolation, rate limit handling, replay and dead-letter operator flows.

**Audit/replay/runtime gate**  
- Credential changes, consent grants, provider outages, fallback activation och replay ska auditeras med provider refs men aldrig anvÃ¤nda provider id som affÃ¤rssanning.

**Migration/cutover gate**  
- Legacy integration references och client secrets mÃ¥ste roteras in i nya modeller utan driftstopp.

**Blockerar nÃ¤sta steg**  
- Operations, trial launch, pilots och ecosystem parity blockerar utan detta.

**Blockerar go-live**  
- Go-live krÃ¤ver riktiga providers dÃ¤r live-effekt behÃ¶vs.

**Blockerar competitor parity**  
- Parity mot Fortnox/Teamleader/monday-liknande ecosystem krÃ¤ver denna fas.

**Blockerar competitor advantage**  
- Best-in-class APIs, receipts och sandbox stories krÃ¤ver denna fas.

**Blockerar UI-readiness**  
- UI och admin views fÃ¶r integrations mÃ¥ste vila pÃ¥ stabil control-plane.

## [ ] Fas 17 â€” Operations, backoffice, support, migration, cutover, parallel run och trial/live drift

**MÃ¥l**  
SlutfÃ¶ra operator- och supportsystemet: incidents, support cases, replay, dead-letter, submission monitoring, migration cockpit, cutover och trial/live operations.

**Beroenden**  
- 3
- 6
- 13
- 15
- 16

**FÃ¥r kÃ¶ras parallellt med**  
- Support/backoffice och migration cockpit kan byggas parallellt.
- Parallel-run tooling kan kÃ¶ras parallellt med pilot preparations.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen extern pilot eller go-live fÃ¥r ske innan cutover, rollback och support operations Ã¤r kÃ¶rbara utan databasingrepp.

**Delfaser**
- [ ] 17.1 [HARDEN] **Support case, incident, replay och dead-letter ops** â€” Support scopes, masked data views, replay planning, dead-letter triage, incident commander flows, submission monitoring.
- [ ] 17.2 [HARDEN] **Backoffice-grÃ¤nser och evidence** â€” Write-capable impersonation allowlists, break-glass, masking, session watermarks, evidence packs och export for audit.
- [ ] 17.3 [HARDEN] **Migration cockpit och acceptance** â€” Mapping sets, import batches, variance reports, acceptance records, cutover plans, signoff chains, rollback points.
- [ ] 17.4 [OPERATIONALIZE] **Parallel run och diff motor** â€” Finance, payroll, HUS, personalliggare och project profitability parallel runs med diff thresholds och manual acceptance.
- [ ] 17.5 [NEW BUILD] **Trial/live operations split** â€” Separata queuevyer, support policies, alerts, dashboards, reset rights, promotion workflows och sales/demo analytics.
- [ ] 17.6 [NEW BUILD] **Market-winning cutover concierge** â€” Guided migration, source extract checklist, rehearsals, automated variance report, signoff evidence, rollback drill.

**Exit gate**  
- Support och backoffice kan driva systemet utan direkt DB-access. Cutover, rollback, parallel run och trial/live drift Ã¤r bevisade i test och pilot.

**Test gate**  
- Replay and dead-letter tests, masked support sessions, cutover rehearsal, rollback rehearsal, parallel-run diff thresholds, incident escalation tests.

**Audit/replay/runtime gate**  
- Alla support- och cutoveraktiviteter fÃ¥r immutable audit, evidence bundle och actor approvals.

**Migration/cutover gate**  
- Fasen Ã¤r sjÃ¤lv migration/cutover-motorn; inga externa go-lives utan signerat acceptance bundle och rollback path.

**Blockerar nÃ¤sta steg**  
- Pilot och live release blockerar utan detta.

**Blockerar go-live**  
- Go-live utan cutover/rollback/support-ops Ã¤r fÃ¶rbjudet.

**Blockerar competitor parity**  
- Market parity krÃ¤ver att kunder kan migrera in och fÃ¥ support.

**Blockerar competitor advantage**  
- Cutover concierge och support workbench Ã¤r stor premiumfÃ¶rdel.

**Blockerar UI-readiness**  
- Backoffice och cockpit-UI saknar grund utan denna fas.

## [ ] Fas 18 â€” Pilot, enterprise gate, competitor parity, competitor advantage och UI-readiness

**MÃ¥l**  
Bevisa att backend-kontrakten bÃ¤r verkliga kundscenarier, lÃ¥sa UI-kontrakt och Ã¶ppna go-live fÃ¶rst efter parity, advantage och enterprise-gater Ã¤r passerade.

**Beroenden**  
- 17

**FÃ¥r kÃ¶ras parallellt med**  
- Olika pilotkohorter kan kÃ¶ras parallellt nÃ¤r respektive domÃ¤ngater Ã¤r grÃ¶na.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen generell lansering fÃ¶re godkÃ¤nd pilot, enterprise gate och competitor parity gate. UI-start fÃ¥r inte ske innan backend-kontrakt Ã¤r frozen.

**Delfaser**
- [ ] 18.1 [OPERATIONALIZE] **Intern dogfood + finance pilot** â€” KÃ¶r eget bolag/egna testbolag genom finance, VAT, payroll, HUS, tax account, annual och supportflÃ¶den.
- [ ] 18.2 [OPERATIONALIZE] **Pilotkohorter per segment** â€” AB med ekonomi+lÃ¶n, service/projektbolag, HUS-bolag, construction/service med personalliggare/ID06, enterprise SSO-kund.
- [ ] 18.3 [NEW BUILD] **Competitor parity board** â€” MÃ¤t svart pÃ¥ vitt parity mot Fortnox, Visma, Bokio, Wint, Teamleader, monday, Asana, ClickUp, Zoho, Odoo, Bygglet, Byggdagboken.
- [ ] 18.4 [NEW BUILD] **Competitor advantage release pack** â€” SlÃ¤pp differentiators: tax account cockpit, unified receipts/recovery, migration concierge, safe trial-to-live, project profitability mission control.
- [ ] 18.5 [HARDEN] **UI readiness contract freeze** â€” LÃ¥s object profiles, workbenches, commands, blockers, list/read/detail/action contracts och permission reasons fÃ¶r desktop/backoffice/field.
- [ ] 18.6 [OPERATIONALIZE] **Final go-live gate** â€” Release checklist: technical, regulated, support, migration, security, parity, advantage, trial-sales readiness.

**Exit gate**  
- Pilots har klarats, enterprise gate Ã¤r grÃ¶n, parity Ã¤r uppnÃ¥dd i kÃ¤rnomrÃ¥den, differentiators Ã¤r live eller pÃ¥slagna, och UI-kontrakten Ã¤r frozen.

**Test gate**  
- Pilot acceptance tests, enterprise security review, parity scorecards, trial-to-live conversion tests, UI contract snapshots.

**Audit/replay/runtime gate**  
- Varje pilot, gate och releasebeslut auditeras med evidence bundle och signoff chain.

**Migration/cutover gate**  
- Varje pilotkons bÃ¤sta cutover- och rollback-data mÃ¥ste finnas som mall fÃ¶re breddlansering.

**Blockerar nÃ¤sta steg**  
- Det finns inget nÃ¤sta steg; detta Ã¤r sista grind fÃ¶re generell go-live.

**Blockerar go-live**  
- Alla rÃ¶da gater hÃ¤r blockerar go-live.

**Blockerar competitor parity**  
- Om parity-board har rÃ¶tt i hygienomrÃ¥den fÃ¥r go-live inte ske.

**Blockerar competitor advantage**  
- Om winning moves inte Ã¤r realiserade fÃ¥r produkten inte kallas marknadsledande, men begrÃ¤nsad release kan ske endast om parity Ã¤r grÃ¶n.

**Blockerar UI-readiness**  
- UI-arbete fÃ¥r inte passera kontraktsfrysningen innan denna fas.


## Appendix A â€” Traceability frÃ¥n FULL_SYSTEM_ANALYSIS

| Kritisk analysfynd | Representeras i fas |
|---|---|
| Systemet Ã¤r fortfarande arkitekturdominerat | 1, 2, 3, 4 |
| FÃ¶r mycket in-memory truth | 1, 2 |
| Migrationslagrets inkonsistens | 1 |
| Finance-kÃ¤rnan Ã¤r starkare Ã¤n produktskalet | 8, 9, 15, 18 |
| Payroll bred men inte regulatoriskt sÃ¤ker | 5, 11, 12, 13 |
| BankID/provider reality Ã¤r stubbad | 6, 16 |
| Integrations- och submission-lager delvis syntetiskt | 4, 13, 16 |
| Desktop/field Ã¤r shells | 14, 15, 18.5 |
| Tenant setup Ã¤r inte full finance-ready | 7 |
| Tax account behÃ¶ver bli verklig operativ domÃ¤n | 9, 13 |
| HUS Ã¤r stark men extern submission/receipt behÃ¶ver verklighet | 13 |
| Annual reporting package finns men filing/signing mÃ¥ste realiseras | 13 |
| Review/work items/notifications/activity Ã¤r stark backend men saknar full operatÃ¶rsyta | 15, 17, 18 |
| Migration/cutover Ã¤r mer cockpit Ã¤n verklig motor | 17, 18 |
| Public API/webhooks Ã¤r starkare Ã¤n Ã¤ldre docs sÃ¤ger | 4, 16 |
| Projects mÃ¥ste vara generell core, inte byggcentrisk | 0, 14 |
| Go-live blockeras av runtime truth, payroll correctness, provider reality, migration, productsurface | 2, 12, 13, 16, 17, 18 |

## Appendix B â€” Traceability frÃ¥n LEGACY_AND_REALITY_RECONCILIATION

| Legacy/konflikt | Ã…tgÃ¤rd i roadmap |
|---|---|
| Produkten feltolkas som byggprogram | 0.1â€“0.2 |
| `phase14.3` eller versionetiketter anvÃ¤nds som mognadssignal | 0.5 |
| Worker underskattas men mÃ¥ste hÃ¤rdas pÃ¥ riktigt | 2.3, 3, 17 |
| Webhooks felaktigt betraktade som fejk | 4, 16 |
| BankID misstolkas som klart pga strong auth objects | 6.1â€“6.5 |
| OCR misstolkas som verklig providerkedja | 10.2â€“10.4 |
| Submission transport misstolkas som verklig | 13.2â€“13.5 |
| Partner integrations misstolkas som verkliga | 16.3â€“16.7 |
| Onboarding Ã¶vertolkas som finance-ready tenant | 7 |
| Migrationslager Ã¶vertolkas som sÃ¤kert pga mÃ¥nga SQL-filer | 1, 17 |
| Demo-seeding riskerar att blandas ihop med produktionsverklighet | 1.2â€“1.3, 7.3â€“7.4 |
| Search/workbench underskattas som bara framtids-UI | 15 |
| Route/test-bredd likstÃ¤lls med live providerkedjor | 0.5, 16, 18 |

## Appendix C â€” Market, competitor parity och competitor advantage som mÃ¥ste byggas

### Finans- och fÃ¶retagsplattform parity
- Fortnox/Visma/Bokio/Wint/BjÃ¶rn Lunden krÃ¤ver minst: finance-ready setup, bank/payments, AP/AR, VAT, payroll, AGI, annual, HUS, skattekonto, API/webhooks, migration/support.
- Dessa krav lever i faserna 7â€“13, 16â€“18.

### CRM- och projektplattform parity
- monday.com, Asana och ClickUp sÃ¤tter standard fÃ¶r portfolio, resource visibility, workload, status, timesheets och multi-project oversight.
- Teamleader, Zoho och HubSpot sÃ¤tter standard fÃ¶r CRM-anknuten quote-to-project, time-to-invoice, customer context och SMB project operations.
- Dynamics 365 Project Operations och Odoo sÃ¤tter standard fÃ¶r project-based commercial models: fixed price, time & materials, schedules, pro forma/billing plans, costing and profitability.
- Dessa krav lever i fas 14, 15, 16 och 18.

### Bygg/field parity utan byggcentrering
- Bygglet och Byggdagboken sÃ¤tter standard fÃ¶r work order, material, foto/signatur, personalliggare, enkel field execution och Ã„TA-liknande flÃ¶den.
- Dessa krav lever i fas 14 och 18, men fÃ¥r aldrig definiera produktens kÃ¤rna.

### VÃ¥ra bindande winning moves
1. Tax account som fÃ¶rstaklassig domÃ¤n.
2. Full regulated receipts/recovery cockpit.
3. Migration concierge med diff, parallel run, rollback och acceptance evidence.
4. SÃ¤ljbar, sÃ¤ker trial-to-live.
5. General project core med verklig profitability, CRM-handoff och vertikala packs.
6. Operator-first support/backoffice med replay, dead-letter och submission monitoring.

## Appendix D â€” Provider- och adapterordning som Ã¤r bindande

### Wave 1 fÃ¶re fÃ¶rsta breda go-live
- Signicat-baserad BankID/eID och signering via auth broker
- WorkOS eller likvÃ¤rdig broker fÃ¶r enterprise federation
- Enable Banking
- ISO 20022/Bankgiro-baseline
- Stripe Payment Links
- Pagero Online/Peppol
- Google Document AI
- Postmark + Twilio
- Pleo eller likvÃ¤rdig spend feed
- Officiella Skatteverket/Bolagsverket-transportvÃ¤gar eller explicit officiell fallback
- HubSpot adapter
- Teamleader adapter

### Wave 2 efter parity men fÃ¶re bred enterprise expansion
- monday.com / Asana / ClickUp import/sync
- Zoho CRM/Projects/Billing
- Odoo project-billing migrations
- Dynamics 365 Project Operations enterprise integration
- Direkt BankID-adapter endast om brokerstrategin behÃ¶ver kompletteras av kommersiella eller regulatoriska skÃ¤l

## Slutregel

Denna roadmap Ã¤r den enda bindande byggordningen. Ingen implementation, ingen featuregren och ingen UI-plan fÃ¥r kÃ¶ra utanfÃ¶r denna ordning utan uttrycklig Ã¤ndring i detta dokument.







