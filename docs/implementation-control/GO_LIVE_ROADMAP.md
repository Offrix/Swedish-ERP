# GO_LIVE_ROADMAP

Status: Bindande byggordning från nuvarande zip-läge till go-live.  
Datum: 2026-03-26  
Detta dokument ersätter alla äldre byggordningar, byggsekvenser och implementationsnarrativ där de krockar med innehållet här.
Äldre implementation-control-, master-control-, ADR-, runbook- och analysdokument är historiska inputkällor. De är inte fortsatt bindande där de krockar med detta dokument.

## Absoluta regler

1. Produkten är en generell svensk företagsplattform, inte ett byggprogram.
2. Bygg, field, personalliggare och ID06 är vertikala pack ovanpå generell core.
3. UI får aldrig kompensera för backend-brister; UI-readiness kommer sist.
4. Demo, trial och test är tillåtna endast i explicit mode; de är aldrig implicit runtime.
5. Reglerad logik måste vara versionerad, effective-dated, replaybar och receipt-säker.
6. Shell-appar, route-bredd, seed-data och simulerade providers räknas inte som go-live.
7. Alla actions från tidigare analysdokument är obligatoriska här; om något inte finns här ska det betraktas som ej tillåtet arbete tills dokumentet ändras.

## Markörlegend

- `[NEW BUILD]` ny kapabilitet eller nytt package/modul/kontrakt
- `[HARDEN]` befintlig kod/arkitektur finns men måste bli driftmässig
- `[REWRITE]` nuvarande lösning finns men är strukturellt fel eller konfliktfylld
- `[REPLACE]` nuvarande lösning måste bytas ut mot annan mekanism/provider/boundary
- `[REMOVE/DEPRECATE]` lösning eller antagande ska bort och får inte fortsätta styra
- `[MIGRATE]` data, state eller callers måste flyttas utan historikförlust
- `[OPERATIONALIZE]` process, runbook, gating eller operatörsstöd måste göras verkligt

## Hårda blockerare som gäller omedelbart

- `manual_rate` som normalläge för ordinarie preliminärskatt är förbjudet i live-kedjor.
- `seedDemo=true` eller motsvarande implicit boot i production/pilot är förbjudet.
- Blandade route-familjer i `apps/api/src/phase13-routes.mjs` och `phase14-routes.mjs` får inte byggas vidare som bindande slutarkitektur.
- `BankID`-stub, OCR-stub, simulerade authority receipts och simulerade provider-outcomes får inte räknas som live coverage.
- Trial och live får aldrig dela credentials, receipts, provider refs, sequence space eller ekonomisk effekt.
- Projects får inte byggas som work-order-first eller construction-first. General core kommer före vertikal pack.

## Fasberoenden i kortform

| Fas | Namn | Måste vara klar före |
|---|---|---|
| 0 | Sanningslåsning | all kod och alla nya styrbeslut |
| 1 | Runtime-ärlighet | persistence, providerarbete, pilots |
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

## Tillåtna parallellfönster

### Parallellfönster A
- Fas 1.1–1.5 och förberedande delar av fas 4.3 (routeinventering) får köras samtidigt.
- Ingen domänlogik får ändra affärsbeteende innan fas 1 är grön.

### Parallellfönster B
- Fas 2.1–2.5 kan köras som domänvågor efter att gemensam outbox/command-logg är klar.
- Fas 3.1–3.5 får starta när fas 2:s primitives finns.

### Parallellfönster C
- Fas 5 (rulepacks) får löpa parallellt med fas 6–9 när registry-skelettet är klart.
- Fas 16 kan börja bygga adapter-skelett men inga live-aktiveringar sker före respektive domängate.

### Parallellfönster D
- Fas 14 general project core kan påbörjas när fas 8, 9, 11 och 12 har låst sina source-of-truth-kontrakt.
- Field/personalliggare/ID06 får inte gå före general project core.

### Parallellfönster E
- Fas 17 support/backoffice och cutover cockpit kan byggas parallellt när fas 13, 15 och 16 levererat canonical receipts, read models och adapter health.

## Förbjudna parallellismer

- Fas 12 före fas 11.
- Fas 13 live transport före fas 5 och 6.
- Fas 14 work-order/field före fas 14 general project core.
- Fas 18 pilot eller extern trial-lansering före fas 17.
- UI implementation före fas 15 och fas 18.5.

## [x] Fas 0 — Sanningslåsning, scope-frysning och destruktiv legacy-rensning

**MÃ¥l**  
Göra de två nya dokumenten till enda sanning, döda felaktiga antaganden och låsa produktkategori, providerstrategi och projektkärnans riktning innan någon mer feature-kod byggs.

**Beroenden**  
- Ingen

**Får köras parallellt med**  
- Dokumentstädning och traceability-matris kan köras samtidigt som kodinventering av seeds/stubbar.

**Får inte köras parallellt med**  
- Ingen implementation i reglerade flöden, auth, projects eller UI får starta innan denna fas är signerad.

**Delfasstatus**
- 6.1 återverifierad 2026-03-27: auth broker ersätter fortsatt BankID-stubben med Signicat-baserad BankID i sandbox/production, lokala passkeys/TOTP som identity links, WorkOS-federation med start/callback och durable broker-state; riktade unit- och API-sviter håller grönt.
- 6.2 återverifierad 2026-03-27: `SessionRevision`, trustnivåer, fresh step-up, device trust, challenge receipts, action-specific TTL och challenge-center-routes bär fortfarande riktig runtime i både authplattform och API.
- 6.3 återverifierad 2026-03-27: review center, activity och operational work items permission-trimmas fortsatt server-side med viewer/team-scope, backoffice visibility gates och cross-team denial i riktade access-sviter.
- 6.4 återverifierad 2026-03-27: impersonation, break-glass och access attestation håller fortsatt explicit approve/start/end-livscykel, TTL/expiry, watermarks, allowlists, stale-grant-detektion och policybunden supportdrift.
- 6.5 återverifierad 2026-03-27: auth har nu faktisk mode-katalog per provider, `/v1/auth/providers/isolation`, produktionsgating när auth-inventory saknas, federations-callbacks per mode och explicit testidentitetsseparation mellan non-production och production.

**Delfasstatus**
- 13.1 klar 2026-03-28: HUS-lifecycle är nu härdad med weekend-justerad submission-deadline, per-köpare årskapacitet och ROT-cap, låsta claim fields efter draft, official-capable `xml`/`direct_api` transportprofiler, blockerad authority decision på draft claim och blockerad payout tills partial-acceptance-differens är löst, verifierat i nya phase 13-unit/API-sviter samt gamla HUS-regressioner.
- 13.2 klar 2026-03-28: regulated submissions ligger nu i ett verkligt canonical package med first-class `SubmissionAttempt`- och `SubmissionEvidencePack`-objekt, canonical envelope-ref på submissiondetaljer, bakåtkompatibel shim i integrationslagret, egen API-läsning för attempts och verifiering via nya phase 13.2-unit/API-sviter, phase 12-submission-regressioner samt full svit.

**Delfaser**
- [x] 0.1 [REMOVE/DEPRECATE] **Döda byggcentriska narrativ** — Ta bort all styrning som behandlar produkten som byggprogram. Skriv in att field/personalliggare/ID06 är vertikala pack ovanpå generell företagsplattform.
- [x] 0.2 [REWRITE] **Lås bindande produktkategori och benchmarkset** — Frys konkurrensbilden till finansplattformar, CRM-/projektplattformar, project-operations-ERP och bygg/field-vertikaler i exakt denna ordning.
- [x] 0.3 [REWRITE] **Lös dokumentkonflikter** — Resolva konflikter mellan ADR, provider-priority, legacy remediation, master build sequence och kod. Särskilt BankID-strategi, SCIM-scope, project core och regulated submissions boundary.
- [x] 0.4 [NEW BUILD] **Skapa full traceability** — Mappa varje kritisk punkt från FULL_SYSTEM_ANALYSIS, LEGACY_AND_REALITY_RECONCILIATION och COMPETITOR_AND_MARKET_REALITY till exakt roadmapfas, delfas och exit gate.
- [x] 0.5 [OPERATIONALIZE] **Inför hårda stop-regler** — Inför regler att shell-UI, demo-seeds, simulerade receipts, route-bredd och phase-etiketter aldrig får räknas som produktmognad.

**Exit gate**  
- Alla äldre dokument är nedgraderade till icke-bindande om de inte uttryckligen stämmer med denna roadmap. Produkten är formellt definierad som generell svensk företagsplattform. CRM/projekt-benchmark utanför bygg är låst.

**Fasstatus**  
- Klar 2026-03-26 genom repo-governance-låsning, historikbanner i äldre styrdokument, traceability-matris och governance-runbook.

**Test gate**  
- Dokumentgranskning: 100 % coverage i traceability-matrisen. Ingen åtgärd från analysdokumenten saknas i roadmapen.

**Audit/replay/runtime gate**  
- Auditklass `governance_reset` krävs för alla borttagna antaganden och beslutade omskrivningar. Alla ändringsbeslut loggas med beslutare, datum och ersatt sanning.

**Migration/cutover gate**  
- Ingen data-migration, men alla migrations- och seed-anti-patterns måste vara identifierade innan fas 1 öppnas.

**Blockerar nästa steg**  
- Fortsatt byggande på fel produktkategori, fel providerstrategi eller felaktig projektriktning.

**Blockerar go-live**  
- Go-live utan sanningslåsning blir pseudo-go-live.

**Blockerar competitor parity**  
- Byggcentrisk feltolkning blockerar parity mot Fortnox/Visma/Bokio/Wint och CRM/project-ops-marknaden.

**Blockerar competitor advantage**  
- Utan denna fas finns ingen konsekvent winning story.

**Blockerar UI-readiness**  
- UI-teamet kan inte få stabila kontrakt om kärnans sanning inte är låst.

## [x] Fas 1 — Runtime-ärlighet, bootstrap-hygien och migrationssanning

**MÃ¥l**  
Göra boot, miljölägen, migrationslagret och startup-beteenden sanna och deterministiska innan persistent kärna byggs vidare.

**Beroenden**  
- 0

**Får köras parallellt med**  
- Migrationsfixar och startup/refactor kan köras parallellt.
- Inledande stub-/seed-scanner kan köras parallellt med route-inventering.

**Får inte köras parallellt med**  
- Ingen ny domänfunktion får bero på nuvarande seedDemo-standarder eller felaktiga bootstrapstigar.

**Delfaser**
- [x] 1.1 [REWRITE] **Laga schema_migrations-inkonsistens** — Gör migrationshistoriken självkonsistent och stoppa alla scripts som skriver fel kolumnnamn eller dubbla format.
- [x] 1.2 [HARDEN] **Inför explicit runtime mode** — Alla starter ska välja `trial`, `sandbox_internal`, `test`, `pilot_parallel` eller `production`; implicit demo-boot är förbjudet.
- [x] 1.3 [REPLACE] **Byt `seedDemo=true` default** — Alla kärndomäner ska defaulta till `bootstrapMode=none`; demo-seed tillåts endast via explicit trial/demo-scenario.
- [x] 1.4 [REWRITE] **Rensa startup och flat merge-risker** — Bryt ut startupdiagnostik och varna/faila om någon kärndomän körs utan persistent store i lägen där det inte är tillåtet.
- [x] 1.5 [NEW BUILD] **Bygg runtime honesty scanner** — Scanner ska hitta Map-baserad sanning, stub-provider, simulerade receipts, demo-data i production mode och otillåtna route-familjer.

**Delfasstatus**
- 1.1 återverifierad 2026-03-27: alla migrationer självregistrerar nu exakt ett canonical `migration_id` som matchar filnamnet, och både Node- och PowerShell-validering failar på saknad, dubbel eller felaktig migrationsregistrering.
- 1.2 återverifierad 2026-03-27: API, worker, desktop-web, field-mobile, dev-start och standardplattform väljer nu explicit runtime mode; starter-fallback till tyst `test`-mode är borttagen från bootvägarna och smoke/runtime-mode-sviten är grön.
- 1.3 återverifierad 2026-03-27: implicit `test_default_demo`-boot är borttagen från API-plattformen; demo-fixturer tillåts nu bara via explicit `bootstrapScenarioCode`, och alla berörda e2e-, integrations- och enhetstester använder namngiven explicit demo-testplattform i stället för dold autoseed.
- 1.4 återverifierad 2026-03-27: startupdiagnostik och protected-boot-gater är nu ärliga om persistent truth; API och worker blockar fortsatt skyddade starter med blockerande invariants, och critical-domain snapshots auto-provisioneras inte längre till dold temp-sqlite utan kräver explicit store-konfiguration.
- 1.5 återverifierad 2026-03-27: runtime honesty scanner körs nu som explicit fasgate i CLI och runbook, och verifierar både resident demo-data i protected runtime, Map-baserad sanning, stub-providers, simulerade receipts och förbjudna routefamiljer innan protected boot får fortsätta.

**Exit gate**  
- API och worker startar deterministiskt per miljöläge, migrationer är rena och inga kritiska domäner kan råka boota med demo-läge i production eller pilot.

**Fasstatus**  
- Klar 2026-03-26 genom migrationshistorik-repair, explicit runtime mode i alla starters, bootstrap-normalisering, startup/flat-merge-diagnostik och körbar runtime honesty scanner med verifierad fas-1-gate.

**Test gate**  
- Boot-tests för varje mode, migrationsdrift mot tom och uppgraderad databas, samt fail-fast-tester när persistent store saknas i förbjudet läge.

**Audit/replay/runtime gate**  
- `runtime_boot_decision` och `migration_schema_repair` auditeras. Startup loggar mode, seed policy, disabled providers och active baselines.

**Migration/cutover gate**  
- Fas 1 måste ge en ren migrationskedja och ett verifierat rollback-punktformat innan fas 2 får ändra persistence-kontrakt.

**Blockerar nästa steg**  
- Persistent runtime kan inte byggas säkert ovanpå falsk bootstrap.

**Blockerar go-live**  
- Migrationsfel och demo-seeds i prod blockerar go-live direkt.

**Blockerar competitor parity**  
- Ingen konkurrentparitet om systemet inte ens startar sanningsenligt.

**Blockerar competitor advantage**  
- Ingen premiumfördel utan trusted runtime.

**Blockerar UI-readiness**  
- UI-readiness blockeras av osäker mode- och boot-sanning.

## [x] Fas 2 — Durable persistence, outbox, jobs, attempts, replay och dead-letter

**MÃ¥l**  
Flytta affärssanningen från processminne till hållbar persistence med idempotent command-logg, outbox, job attempts och replay/dead-letter.

**Beroenden**  
- 1

**Får köras parallellt med**  
- Event/outbox och job-attempt-lager kan byggas parallellt.
- Domänvis repository-migrering kan ske i vågor efter att gemensamma primitives är klara.

**Får inte köras parallellt med**  
- Ingen regulated submission, payroll eller tax-account-kedja får byggas vidare på in-memory truth.

**Delfasstatus**  
- 2.1 återverifierad 2026-03-27: canonical repositories bär nu explicit optimistic concurrency, transaktionsbunden rollback över flera repositorygränser, bounded-context-scope utan nyckelkollisioner och verifierad Postgres-konfigurationskedja för durable repository store.
- 2.2 återverifierad 2026-03-27: command receipt, outbox och inbox ligger fortsatt i samma commit, duplicate suppression hålls på idempotency-nivå och mutationruntime bär bounded-context repository bundles utan att förlora rollback-garantin.
- 2.3 återverifierad 2026-03-27: job runtime bär explicit attemptlivscykel, retry policy, dead-letter och replay-planer; claim expiry före start skapar syntetisk attempthistorik och poison-pill-loopar stängs i dead-letter i stället för att försvinna tyst.
- 2.4 återverifierad 2026-03-27: kritiska domäner kan rehydreras från durable snapshots, sqlite-backed critical truth bootar nu korrekt även utan explicit state-filpath, runtime diagnostics släpper inte igenom Map-only truth förrän durability inventory visar verklig snapshot-backed persistence, och plattformen exponerar nu per-domän durability inventory som fasgate.
- 2.5 återverifierad 2026-03-27: projection rebuild bevarar source of truth och icke-målade projektioner, targeted full rebuild purgar bara rätt projectionsdokument och failed rebuild lämnar truth orörd tills lyckad retry rensar checkpoint-felet.

**Delfaser**
- [x] 2.1 [NEW BUILD] **Inför canonical repositories** — Varje bounded context får repositorygränssnitt med Postgres-implementation och transaktionsbunden optimistic concurrency.
- [x] 2.2 [NEW BUILD] **Inför command log + outbox/inbox** — Alla muterande commands ska skriva command receipt, expected version, actor, session revision och outbox-event i samma commit.
- [x] 2.3 [HARDEN] **Hårdna job-runtime** — `packages/domain-core/src/jobs.mjs` och `apps/worker/src/worker.mjs` ska bära attempts, retry policy, dead-letter, replay plan och poison-pill-detektion.
- [x] 2.4 [MIGRATE] **Migrera kritiska domäner bort från Map-sanning** — Org auth, ledger, VAT, AR, AP, payroll, tax-account, review-center, projects och submissions får inte längre ha produktionskritisk state enbart i Map.
- [x] 2.5 [NEW BUILD] **Inför projections re-build** — Read models ska kunna raderas och byggas om från event/outbox utan att source-of-truth tappar historik.

**Exit gate**  
- Kritiska affärsobjekt är persistenta, replaybara och versionsstyrda. Jobs kan återupptas efter processdöd. Dead-letter och replay är operatörsstyrda, inte ad hoc-scripts.

**Fasstatus**  
- Klar 2026-03-26 genom canonical repositories, transaktionsbunden command log/outbox, explicit attempt-livscykel, durability inventory för kritiska domäner och verifierad projection rebuild parity inklusive fail/retry-kedja.

**Test gate**  
- Crash/restart-tester, concurrency/idempotency-tester, outbox-leverans med duplicate suppression, replay från poison-pill, projection rebuild från tom read model.

**Audit/replay/runtime gate**  
- Varje command får immutable command receipt; varje replay/dead-letter-åtgärd får egen auditklass och operator evidence.

**Migration/cutover gate**  
- Data-migration per domän måste ha verifierad row-count, checksums och rollback. Inga gamla Map-only artefakter får vara enda källan efter cutover.

**Blockerar nästa steg**  
- Reglerade, ekonomiska och auth-kedjor saknar bärighet utan durable truth.

**Blockerar go-live**  
- In-memory truth blockerar go-live.

**Blockerar competitor parity**  
- Paritet mot etablerade produkter kräver hållbar runtime.

**Blockerar competitor advantage**  
- Replay/evidence-fördelen existerar inte utan detta.

**Blockerar UI-readiness**  
- UI kan inte lita på versionsnummer, state machines eller feeds utan durable persistence.

## [x] Fas 3 — Audit, evidence, observability, restore drills och secret governance

**MÃ¥l**  
Göra audit och driftbevis förstaklassiga samt säkra att systemet kan övervakas, återställas och opereras utan manuell databasmedicin.

**Beroenden**  
- 2

**Får köras parallellt med**  
- Observability och evidence pack kan byggas parallellt.
- Secret rotation och restore drills kan förberedas parallellt.

**Får inte köras parallellt med**  
- Ingen live providercredential eller signeringsnyckel får användas innan secret governance är aktiv.

**Delfasstatus**  
- 3.1 återverifierad 2026-03-27: canonical audit envelope är fortsatt gemensam writer-form för auth, review, search, documents, activity, notifications, id06 och kvarvarande legacy-audit-writers, med verifierad integrity hash, audit-envelope-version, correlation-id, canonical `recordedAt`, deterministisk voucherkoppling och DSAM/A–Z-ledgergrunder som fortsatt grön under riktad 3.1-svit.
- 3.2 återverifierad 2026-03-27: evidence-pack-kraven i bibeln är nu mappade punkt för punkt till faktisk kod, runbook och exit gate; annual reporting, regulated submissions, support, break-glass, cutover och project exports använder central frozen evidence-bundle-kedja med checksum, supersession och arkivering av tidigare bundle.
- 3.3 återverifierad 2026-03-27: full observability är nu mappad punkt för punkt till faktisk kod, alarms, drilldown och exit gate; provider health, projection lag, queue age, invariant alarms, structured logs och trace chains exponeras i samma company-scoped payload och håller under riktad runtime- och API-svit.
- 3.4 återverifierad 2026-03-27: restore drills bär fortsatt verklig livscykel (`scheduled -> running -> passed|failed`) med explicit coverage för `database_restore`, `projection_rebuild` och `worker_restart`; riktad 3.4-svit samt resilience- och migration-cockpit-tester bekräftar restore-plan-koppling, chaos-signaler och rollbackdisciplin.
- 3.5 återverifierad 2026-03-27: secrets, callback-hemligheter och certifikatkedjor är fortsatt formaliserade som egna runtime-objekt med mode-bunden vaultvalidering, rotationsposter, dual-running-overlap, certifikatsförnyelsefönster och observability-sammanfattning; riktad 3.5-svit bekräftar att rotation och certifikatsummering håller.

**Delfaser**
- [x] 3.1 [HARDEN] **Canonical audit envelope** — Alla commands, provider calls, approvals, impersonations, submissions och replay-åtgärder ska skriva samma auditform.
- [x] 3.2 [NEW BUILD] **Bygg evidence-packs** — Submissions, annual packages, cutover, support cases, break-glass och project evidence ska kunna paketeras, hash-as och arkiveras.
- [x] 3.3 [NEW BUILD] **Full observability** — Metrics, tracing, structured logs, invariant alarms, queue age alarms, provider health och projection lag ska vara synliga.
- [x] 3.4 [OPERATIONALIZE] **Restore drills och chaos** — Återställning av databas, projection rebuild och worker restart ska övas och dokumenteras.
- [x] 3.5 [HARDEN] **Secrets, certifikat och rotationsregler** — Separata vaults per mode, certifikatkedjor, callback-hemligheter och nyckelrotation ska vara formaliserade.

**Exit gate**  
- Audit explorer, evidence packs och återställningsrutiner fungerar i testad drift. Secrets är isolerade per mode och provider.

**Fasstatus**  
- Klar 2026-03-27 genom återverifierad canonical audit envelope inklusive id06, central frozen evidence-bundle-kedja, full observability-payload, restore drill/chaos-coverage och mode-isolerad secret/certificate-runtime.

**Test gate**  
- Restore-from-backup, queue-lag alarms, secret rotation smoke tests, evidence checksum verification, chaos tests på worker/process restart.

**Audit/replay/runtime gate**  
- Audit är själv auditerad: varje auditwrite har integrity hash, correlation id och actor/session metadata.

**Migration/cutover gate**  
- Inga dataflyttar utan checksummor och restoreplan. Cutover-planer måste peka på verifierade rollbackpunkter.

**Blockerar nästa steg**  
- Utan observability och evidence går regulated och support-kedjor inte att härda.

**Blockerar go-live**  
- Go-live utan restore drills och secret governance är förbjudet.

**Blockerar competitor parity**  
- Parity kräver supportbarhet och trygg drift.

**Blockerar competitor advantage**  
- Audit/evidence som differentierare kräver denna fas.

**Blockerar UI-readiness**  
- Operatörsytor senare kräver read models och auditdata som redan finns här.

## [x] Fas 4 — Canonical envelopes, error contracts, idempotens, permission resolution och route-dekomposition

**MÃ¥l**  
Standardisera alla externa och interna kontrakt, bryta upp blandade route-filer och införa server-side permission resolution med action classes.

**Beroenden**  
- 2
- 3

**Får köras parallellt med**  
- Envelope-/errorkontrakt och route-split kan köras parallellt efter gemensam standard är satt.

**Får inte köras parallellt med**  
- Ingen ny routefamilj eller extern adapter får byggas på gamla blandade phase13/phase14-rutter.

**Delfasstatus**  
- 4.1 återverifierad 2026-03-27: standard request/success/error envelopes är nu bevisade mot bibelns fulla kontrakt över API, public API, partner API och webhook-ytor; feature-flag-block och 404 fallback går via canonical error envelopes i stället för success-path, och full svit plus riktade envelope-/webhook-/partner-/public-API-tester håller grönt.
- 4.2 återverifierad 2026-03-27: action classes, trust levels, scope types och expected object version är fortsatt publicerade i route-contract registry för hela muterande route-ytan, och denial semantics är återbevisade både i route metadata och i riktade access-/desktop-only-/permission-sviter.
- 4.3 återverifierad 2026-03-27: `phase14-routes.mjs` är fortsatt ren orchestration plus hjälpfunktioner medan tax-account, balances, fiscal-year, review, resilience, migration och collective-agreements ligger i egna routekataloger; `phase13-routes.mjs` delegerar endast till public-, partner-, job- och automation-kataloger och bär inte längre egna duplicerade routeblock.
- 4.4 återverifierad 2026-03-27: regulated submissions ligger fortsatt separerat från generella integrationsytan i `packages/domain-integrations/src/regulated-submissions.mjs`; `index.mjs` delegerar bara till modulen och riktade phase 12-API- och e2e-sviter bekräftar att envelope/attempt/receipt/replay/recovery-kedjan är verklig runtime.
- 4.5 återverifierad 2026-03-27: contract-minimum-sviten för fiscal-year, tax-account, balances och collective-agreements är fortsatt grön med canonical success envelopes, permission denials, conflict semantics och idempotency-bevis; route metadata och surface-access-sviter visar att denial- och contract-gaten fortfarande håller.

**Delfaser**
- [x] 4.1 [NEW BUILD] **Standard request/success/error envelopes** — Alla routes, public API, partner API och webhooks använder samma envelopeform, correlation-id, idempotency key och classification.
- [x] 4.2 [HARDEN] **Action classes och permission resolution** — Varje muterande route märks med required action class, trust level, scope type och expected object version. Route-contract registry täcker nu hela POST/PUT/PATCH/DELETE-ytan och `authz/check` kan resolva public, self och company-scoped routes.
- [x] 4.3 [REWRITE] **Dela upp `phase13-routes.mjs` och `phase14-routes.mjs`** — Skapa routekatalog per domän/funktion: auth, public API, partner API, backoffice, migration, annual reporting, resilience, projects, submissions.
- [x] 4.4 [NEW BUILD] **Etablera hard boundary för regulated submissions** — Transport, attempts, receipts och recovery separeras från generella integrationskopplingar. Antingen nytt package eller tydligt submodule med egna APIs.
- [x] 4.5 [OPERATIONALIZE] **Contract-test miniminivå** — Alla routefamiljer får golden envelopes, denial reasons, conflict semantics och idempotency-tests.

**Exit gate**  
- Blandade phase-rutter är borta från bindande ytan. Alla routes och externa payloads följer canonical envelopes, idempotens och permission resolution.

**Fasstatus**  
- Klar 2026-03-27 genom återbevisade canonical envelopes och permission contracts, verklig routekatalog-split, hard boundary för regulated submissions och explicit contract-minimum-svit för de extraherade routefamiljerna inklusive idempotenshärdning där den saknades.

**Test gate**  
- Contract tests för success/error envelopes, denial reasons, sequence handling och route auth. Snapshot tests för payload shape.

**Audit/replay/runtime gate**  
- Varje denied, conflicted eller replayed request får egen auditrad med denial reason och permission source.

**Migration/cutover gate**  
- API-versioner och routeflyttar måste vara bakåtkompatibla via explicit deprecation-plan; inga tysta path-byten i pilot/production.

**Blockerar nästa steg**  
- Auth, regulated flows och external APIs blir ohållbara utan detta.

**Blockerar go-live**  
- Blandade routefamiljer och ostandardiserade errors blockerar go-live och support.

**Blockerar competitor parity**  
- API/webhook parity kräver konsistenta kontrakt.

**Blockerar competitor advantage**  
- Operator-first API/support story kräver denna fas.

**Blockerar UI-readiness**  
- UI-kontrakt kan inte frysas innan envelopes och permissions är stabila.

## [x] Fas 5 — Rulepack-registry, effective dating, historical pinning och provider baseline registry

**MÃ¥l**  
Göra all reglerad logik, baseline-versionering och providerspecifika format spårbara, effektiverade och historiskt pinade.

**Beroenden**  
- 4

**Får köras parallellt med**  
- Rulepack registry och provider baseline registry kan byggas parallellt.
- Baseline publication workflow kan starta innan alla domäner migrerat sina regler.

**Får inte köras parallellt med**  
- Ingen regulatorisk kod får fortsätta bädda in årsändringar eller providerformat direkt i affärskod.

**Delfaser**
- [x] 5.1 [NEW BUILD] **Rulepack registry** — Inför versionerade rulepacks för VAT, payroll tax, employer contributions, benefits, mileage, HUS, tax account classification och legal form obligations.
- [x] 5.2 [NEW BUILD] **Provider baseline registry** — Versionera XML-scheman, API-versioner, SRU-format, iXBRL/checksums, BankID, Peppol och bankfilformat med effectiveFrom/effectiveTo/checksum.
- [x] 5.3 [HARDEN] **Historical pinning** — Varje beslut, journal, submission och annual package ska peka på rulepack-version och baseline-version som användes.
- [x] 5.4 [OPERATIONALIZE] **Annual change calendar** — Inför process för regeluppdateringar, diff-review, sandbox-verifiering, staged publish och rollback.
- [x] 5.5 [REMOVE/DEPRECATE] **Stoppa hårdkodade regulatoriska specialfall** — Ta bort fri `manual_rate`-logik som standard, hårdkodade SINK/avgiftsbrancher utan snapshot och ad hoc provider-switchar.

**Delfasstatus**
- 5.1 klar 2026-03-27: central rulepack-registry styr nu accounting-method, fiscal-year, legal-form obligations, HUS och tax-account med effective-dated resolution i stället för hårdkodade versionssträngar; annual context bär nu pinned rulepack refs, dedikerad 5.1-svit bevisar date-cutover över flera domäner och `docs/runbooks/rulepack-publication.md` finns nu som operativ publiceringsrunbook.
- 5.2 klar 2026-03-27: central provider baseline-registry styr nu BankID RP API, Peppol BIS Billing, payment link API, open banking, bankfilformat, SRU, authority audit exports och iXBRL-format genom effective-dated baselines med checksum och rollbackstöd; auth-, integrations-, partner- och annual-reporting-runtime bär nu pinned provider baseline refs, dedikerad 5.2-svit samt AR-, annual- och partner-sviter bevisar resolutionen och `docs/runbooks/provider-baseline-update.md` finns nu som operativ publiceringsrunbook.
- 5.3 klar 2026-03-27: annual packages, tax declaration packages, regulated submissions, AGI submissions, payroll postings, payout batches och ledger reversal/correction-kedjor bär nu historiskt pinnade `rulepackRefs`, `providerBaselineRefs` och `decisionSnapshotRefs`; `/v1/submissions` släpper igenom pinningdata utan att tappa den i API-lagret, corrections och retries ärver samma refs deterministiskt och dedikerad 5.3-svit samt annual-, payroll- och submission-API-sviter bevisar att refs överlever dispatch, evidence packs, retry, correction, payout match och ledger-omkastningar.
- 5.4 klar 2026-03-27: annual change calendar kör nu som verklig ops-kedja med source snapshots, diff review, sandbox verification, dual approvals, staged publish, publish-blockering före `stagedPublishAt`, rollback och egna `/v1/ops/rule-governance/changes*`-rutter; dedikerad 5.4 unit/integration-svit samt `docs/runbooks/regulatory-change-calendar.md` bevisar processen.
- 5.5 klar 2026-03-27: payroll blockerar nu fri `manual_rate` utan explicit reason code, SINK kräver dokumenterad beslutsreferens, arbetsgivaravgiftens `no_contribution`-specialfall kommer från rulepack-data i stället för hårdkodad årtalsbranch, partner-baselines löses via central baseline selection-manifest + provider registry i stället för ad hoc switchar och pensionsrapporternas providerpolicy ligger i central policy-manifest; dedikerad 5.5 unit/integration-svit samt återkörda payroll-, partner-, pension- och document-flow-sviter bevisar att specialfallen inte längre lever som fria brancher.

**Fasstatus**  
- Klar 2026-03-27 genom central rulepack-registry, provider baseline-registry, historisk pinning, annual change calendar och bortstädade regulatoriska specialfall i payroll-, partner- och providerpolicylagret.

**Exit gate**  
- All reglerad logik och alla providerformat går att spåra till version, baseline, effective dating och checksum.

**Test gate**  
- Golden date-cutover tests, same-object-historical reproduction, baseline checksum verification, rollback to previous rulepack in sandbox.

**Audit/replay/runtime gate**  
- Publicering av nytt rulepack/baseline får auditklass `regulatory_change_published`. Emergency overrides kräver dual control.

**Migration/cutover gate**  
- Gamla objekt måste få backfilled pinned rulepack/baseline refs innan de används i correction/replay.

**Blockerar nästa steg**  
- Payroll, VAT, HUS, annual reporting och tax account blir juridiskt opålitliga utan historisk pinning.

**Blockerar go-live**  
- Go-live utan rulepack registry är förbjudet i reglerade områden.

**Blockerar competitor parity**  
- Svensk parity kräver exakt årslogik.

**Blockerar competitor advantage**  
- Historisk reproducerbarhet är en kärndifferentierare.

**Blockerar UI-readiness**  
- UI kan inte visa säkra blockers, explanations eller receipts utan rulepack refs.

## [x] Fas 6 — Auth, identity, session trust, device trust och backoffice-boundaries

**MÃ¥l**  
Göra identitet, step-up, federation, impersonation och break-glass verkliga och separera customer-facing och backoffice-boundaries tekniskt.

**Beroenden**  
- 4
- 5

**Får köras parallellt med**  
- Passkeys/TOTP och session/device trust kan byggas parallellt.
- Federation och backoffice approvals kan påbörjas parallellt efter auth broker-gränssnittet är satt.

**Får inte köras parallellt med**  
- Inga regulated submissions eller write-capable supportflöden får öppnas innan step-up och backoffice-boundaries är tvingande.

**Delfaser**
- [x] 6.1 [REPLACE] **Byt BankID-stub mot auth broker** — Klar: auth broker ersätter stubben, Signicat-baserad BankID kör i sandbox/production via broker, passkeys/TOTP länkas som lokala identity accounts, WorkOS-baserad federation har start/callback-routes, durable broker-state och runbook. Återverifierad 2026-03-27.
- [x] 6.2 [NEW BUILD] **Session trust och challenge center** — Klar: `SessionRevision`, trustnivåer, fresh step-up, device trust, challenge completion receipts, action-specific TTL, challenge-center routes och durable restore finns nu i runtime och API. Återverifierad 2026-03-27.
- [x] 6.3 [HARDEN] **Scope, queue och visibility enforcement** — Klar: review center queues/items, activity feeds och operational work items permission-trimmas nu server-side med viewer/team-scope, backoffice visibility gates och cross-team denial tests. Återverifierad 2026-03-27.
- [x] 6.4 [NEW BUILD] **Impersonation, break-glass och access attestation** — Klar: impersonation och break-glass har nu explicit approve/start/end-livscykel, TTL/expiry, watermark-payloads, allowlistbunden aktivering, kvartalsvis access-review-fönster, stale-grant-detektion och runbooks för support- och incidentdrift. Återverifierad 2026-03-27.
- [x] 6.5 [OPERATIONALIZE] **Sandbox/prod isolation för identitet** — Klar: auth har nu mode-katalog per provider, `/v1/auth/providers/isolation`, produktionsgating när auth-inventory saknas, federations-callbacks per mode och explicit testidentitetsseparation mellan non-production och production. Återverifierad 2026-03-27.

**Exit gate**  
- BankID/passkeys/TOTP fungerar, enterprise federation kan anslutas via broker, backoffice-write kräver korrekt approvals och step-up, och permissions är server-side enforced.

**Delfasstatus**
- 6.1 återverifierad 2026-03-27
- 6.2 återverifierad 2026-03-27
- 6.3 återverifierad 2026-03-27
- 6.4 återverifierad 2026-03-27
- 6.5 återverifierad 2026-03-27

**Test gate**  
- BankID sandbox/prod isolation, passkey enroll/revoke, TOTP recovery, SSO login, impersonation denial tests, dual control tests, access review tests.

**Audit/replay/runtime gate**  
- Alla auth-händelser, linkings, factor changes, impersonations och break-glass actions får immutable audit och evidence refs.

**Migration/cutover gate**  
- Befintliga konton migreras till nya identity-linking-modellen utan att dubbla accounts eller role leaks uppstår.

**Blockerar nästa steg**  
- Payroll, filings, payouts, backoffice och partner APIs kräver korrekt auth först.

**Blockerar go-live**  
- Go-live utan stark identitet och server-side permission enforcement är förbjudet.

**Blockerar competitor parity**  
- Parity kräver BankID och fungerande auth.

**Blockerar competitor advantage**  
- Enterprise advantage kräver federation, attestation och backoffice-boundaries.

**Blockerar UI-readiness**  
- UI-kontrakt för actions och challenge center blockerar tills trustnivåer är satta.

## [x] Fas 7 — Tenant bootstrap, modulaktivering och trial/testkonto-system

**MÃ¥l**  
Skapa en separat källa för tenant bootstrap, module activation, finance readiness och trial/live-livscykel så att onboarding, demo, pilot och go-live blir säkra.

**Beroenden**  
- 5
- 6

**Får köras parallellt med**  
- Trial foundation och standard bootstrap kan byggas parallellt efter att canonical objects är satta.

**Får inte köras parallellt med**  
- Ingen säljbar trial eller kundonboarding får lanseras innan trial-isolering och upgrade-regler finns.

**Delfaser**
- [x] 7.1 [NEW BUILD] **Inför `domain-tenant-control`** — Nytt package äger `TenantBootstrap`, `CompanySetupProfile`, `ModuleActivationProfile`, `GoLivePlan`, `TrialEnvironmentProfile`, `ParallelRunPlan`, `PromotionPlan`.
- [x] 7.2 [HARDEN] **Bygg finance-ready bootstrap** — Legal form, accounting method, fiscal year, chart template, VAT profile, reporting obligation profile, role template och queue structure ska skapas i korrekt ordning.
- [x] 7.3 [NEW BUILD] **Bygg trial/testkonto-isolering** — Trial tenants får eget mode, vattenmärkning, fake/sandbox providers, blocked live credentials och skydd mot verkliga ekonomiska konsekvenser.
- [x] 7.4 [NEW BUILD] **Seed scenarios, reset och refresh** — Klar: canonical seed-katalog med åtta scenarier finns nu, legacy-alias mappas deterministiskt, refresh-pack kan fylla på processdata utan att röra masterdata, reset revokerar övriga öppna trial-sessioner, arkiverar process-state metadata och fryser evidence-bundles för reset/refresh innan scenariot reseedas.
- [x] 7.5 [MIGRATE] **Bygg upgrade trial->live** — Klar: promotion bygger nu `PromotionValidationReport` och `PortableDataBundle`, kräver explicit approval coverage, föder ny live-company via separat onboarding/bootstrap-path, kopierar endast portable masterdata/settings/importbatches och blockerar direktcarry av trial ledger, receipts, provider refs, submissions och evidence.

**Delfasstatus**
- 7.1 återverifierad 2026-03-27
- 7.2 klar 2026-03-27
- 7.3 klar 2026-03-27
- 7.4 klar 2026-03-28
- 7.5 klar 2026-03-28

**Exit gate**  
- Tenant kan bli finance-ready eller trial-safe via samma orchestrator. Trial är marknadsmässig, säker och isolerad. Promotion till live är definierad och testad.

**Test gate**  
- Bootstrap tests per legal form, trial isolation tests, trial reset tests, promotion masterdata copy tests, denial tests för live credentials i trial.

**Audit/replay/runtime gate**  
- Alla bootstrap-, activation-, reset- och promotionsteg loggas med operator, seed scenario, source snapshot och carry-over policy.

**Migration/cutover gate**  
- Promotion till live använder egen cutover-path; ingen rå kopiering från trial till live utan explicit import/promotion contract.

**Blockerar nästa steg**  
- Go-live, pilots och market-winning trial blockerades utan detta.

**Blockerar go-live**  
- Ingen finance-ready tenantsetup = inget go-live.

**Blockerar competitor parity**  
- Parity kräver snabb onboarding; trial saknas = säljfriktion mot Bokio/Teamleader/monday-liknande produkter.

**Blockerar competitor advantage**  
- Säker trial-to-live är en uttalad winning move.

**Blockerar UI-readiness**  
- UI-readiness senare kräver stabil bootstrap/status/mode-modell.

## [x] Fas 8 — Legal form, accounting method, fiscal year, ledger, posting recipes och close-kärna

**MÃ¥l**  
Bygga den svenska bokföringskärnan som resten av systemet vilar på: legal form, periodkalender, posting recipes, voucher series, locks och correction/reopen.

**Beroenden**  
- 7

**Får köras parallellt med**  
- Legal form/accounting method/fiscal year kan färdigställas parallellt med chart/voucher series.
- Close-readiness kan förberedas parallellt efter posting engine.

**Får inte köras parallellt med**  
- AR/AP/VAT/payroll/posting får inte öppnas innan ledger/posting recipe-engine är canonical.

**Delfaser**
- [x] 8.1 [HARDEN] **Legal form profiles och reporting obligations** — Klar: legal-form-motorn validerar nu signatory/filing/declaration-profiler per bolagsform, partnerships med årsredovisningsplikt får egen filing-profile, declaration-resolution följer godkänd reporting obligation i stället för legal-form-default och nya annual obligations kan supersedera tidigare godkända profiler utan att öppna dubbla drafts.
- [x] 8.2 [HARDEN] **Accounting method och fiscal year** — Klar: accounting-method-profiler och change requests kräver nu explicit fiscal-year-boundary utanför onboarding, äldre öppna requests för samma boundary supersederas deterministiskt och fiscal-year-change-requests kräver group-alignment-referenser när profil eller reason code kräver det, samtidigt som duplicerade öppna intervall blockeras eller ersätts kontrollerat via resubmission med permission-underlag.
- [x] 8.3 [NEW BUILD] **Voucher series, chart governance och dimensionsdisciplin** — Klar: ledger-kärnan har nu versionsstyrda konto- och voucher-series-profiler, styrd dimensionskatalog med service lines, journalstämpling av account/voucher/dimension-versioner och blockerar nu både repurpose av använda serier och kontoklassändringar efter faktisk användning.
- [x] 8.4 [HARDEN] **Posting recipe engine** — Klar: ledger har nu en central posting-intent/posting-recipe-motor med explicita recipe codes, journaltyper, source object version och signalbinding, samtidigt som AR/AP/payroll inte längre får skapa/validera/posta journaler direkt utan går via samma recipe-kedja som binder metadata och voucher-purpose deterministiskt.
- [x] 8.5 [OPERATIONALIZE] **Close, reopen, reversal och correction engine** — Klar: close-kärnan bär nu strukturerade reopen requests med impact analysis, objektbaserade close adjustments som postar verklig reversal/correction replacement i ledger och separat relock-steg som återlåser perioden till `soft_locked` innan ny signoff.

**Delfasstatus**
- 8.1 klar 2026-03-28: legal-form- och annual-obligation-kedjan stoppar nu ogiltiga Bolagsverket-/årsredovisningskombinationer, declaration-profile använder den godkända reporting obligationens filing profile och revised annual obligations supersederar tidigare approved versioner deterministiskt; unit- och API-sviter samt fullsvit är återgrönade.
- 8.2 klar 2026-03-28: accounting-method-kedjan kräver nu explicit fiscal-year-boundary för profiler och change requests utanför onboarding, äldre öppna method requests supersederas deterministiskt på samma boundary och fiscal-year-change-requests kräver group-alignment-referenser där profil eller reason code kräver det, samtidigt som duplicerade öppna intervall antingen blockeras eller ersätts kontrollerat via resubmission med permission-underlag; unit-, API- och fullsvit är återgrönade.
- 8.3 klar 2026-03-28: ledger governance bygger nu versionsstyrda konto- och voucher-series-profiler, styrd dimensionskatalog inklusive service lines och journalstämpling av account/voucher/dimension-versioner; nya runtime- och API-sviter bevisar required-dimension-gates, att använda serier inte kan repurposas och att använda konton inte kan byta kontoklass, och fullsviten är återgrönad.
- 8.4 klar 2026-03-28: posting recipe-engine finns nu som central ledger-motor med registry för AR/AP/payroll/bank/tax-account/HUS/year-end, tvingar explicit source object version, binder postingRecipeCode/journalType/postingSignalCode i journalmetadata och downstream-domänerna AR/AP/payroll går nu via `applyPostingIntent` i stället för direkta `createJournalEntry`/`validateJournalEntry`/`postJournalEntry`-kedjor; nya unit- och API-asserts bevisar metadata och fullsviten är återgrönad.
- 8.5 klar 2026-03-28: reopen flödar nu via strukturerade `ReopenRequest`-objekt med impact analysis, close adjustments kan skapa verklig reversal eller correction replacement mot journaler inom den återöppnade close-windown, och separat relock-steg låser tillbaka perioden till `soft_locked` innan ny signoff; riktade unit-, close-API- och route-metadata-sviter samt `docs/runbooks/ledger-close-and-reopen.md` bevisar kedjan.

**Exit gate**  
- Ledger är enda bokföringssanning. Periodlås, reopen, correction och legal-form-profiler fungerar och är versionsstyrda.

**Fasstatus**  
- Klar 2026-03-28 genom legal-form- och fiscal-year-härdning, versionsstyrd ledger governance, central posting recipe-engine och ny close/reopen/correction/relock-kedja med objektbaserade requests, close adjustments och operativ runbook.

**Test gate**  
- Golden postings per signal, lock/reopen tests, close blocker tests, fiscal-year boundary tests, historical reproduction with pinned rulepacks.

**Audit/replay/runtime gate**  
- Alla postings bär source object/version, recipe code, rulepack version, voucher series och actor/session context.

**Migration/cutover gate**  
- Opening balances och historical imports får endast landa genom `historical_import`-journaltyp och verifierad differenshantering.

**Blockerar nästa steg**  
- All finance, tax, payroll och projects profitability blockerar utan detta.

**Blockerar go-live**  
- Bokföringsmotor utan locks/corrections blockerar go-live.

**Blockerar competitor parity**  
- Parity mot ekonomiaktörer kräver detta.

**Blockerar competitor advantage**  
- Controlled reopen/correction är del av premiumfördel.

**Blockerar UI-readiness**  
- UI-readiness för reports/workbenches blockerar tills ledger och close är stabila.

## [x] Fas 9 — AR, AP, VAT, banking, tax account och document-posting gates

**MÃ¥l**  
Knyta dokument, leverantörer, kunder, bank och skattekonto till bokföringskärnan utan att tillåta otillåtna autopostningar eller fuzzy matching.

**Beroenden**  
- 8

**Får köras parallellt med**  
- AR och AP kan byggas parallellt.
- VAT och banking kan byggas parallellt efter posting engine.
- Tax account kan byggas parallellt med banking när classification registry finns.

**Får inte köras parallellt med**  
- Ingen automatisk posting från OCR, statement import eller tax account discrepancy detection utan blockerande gates.

**Delfasstatus**
- 9.1 klar 2026-03-28: AR-kedjan är nu återverifierad end-to-end med kundfakturor, kreditnotor, abonnemang, payment links, allocations, reskontra, legal invoice-readiness och revenue dimensions som bärs hela vägen till ledgerpostning med governed dimensionkrav.
- 9.2 klar 2026-03-28: AP-kedjan bär nu first-class leverantörskredit med `AP_CREDIT_NOTE`, explicit payment-preparation per open item, blockerad proposal/export för kredit/open-item <= 0 och governed allocation review-gates som stoppar posting tills ledgerkrävda dimensioner finns och är giltiga.
- 9.3 klar 2026-03-28: VAT-kedjan bär nu first-class declaration basis med blocker codes, review-resolution som muterar verkligt momsbeslut, periodlås/unlock för deklarationsfönster och route-/auditkedja som blockerar nya momsbeslut tills perioden uttryckligen låsts upp igen.
- 9.4 klar 2026-03-28: banking bär nu first-class `PaymentBatch`, `StatementImport` och `SettlementLiabilityLink` med open-banking- och bankfilrails, baseline-spårning, read-routes, explicit statement-importmetadata och end-to-end settlement mapping mot både AP-open items och tax-account-events.

**Delfaser**
- [x] 9.1 [HARDEN] **AR end-to-end** — Kundfakturor, kreditnotor, abonnemang, collection/payment links, allocations, reskontra, invoice readiness och revenue dimensions.
- [x] 9.2 [HARDEN] **AP end-to-end** — Leverantörsfakturor, krediter, attest, matchning, payment prep och cost allocations med review gates.
- [x] 9.3 [HARDEN] **VAT decision engine** — VAT source of truth, decision inputs/outputs, timing, lock/unlock, declaration basis och review boundaries.
- [x] 9.4 [NEW BUILD] **Banking och payment rails** — Open banking, bankfiler, payment batches/orders, statement import, matchning, settlement liability mapping.
- [x] 9.5 [HARDEN] **Tax account subledger** — Skattekontohändelser, import, klassificering, offset, discrepancy cases, liability match och reconciliation blockers.
- [x] 9.6 [HARDEN] **Document-posting gates** — Inget dokument, statement eller tax event bokas förrän explicit affärsdomän har godkänt sakobjektet.

**Exit gate**  
- AR/AP/VAT/banking/tax account fungerar end-to-end med review, reconciliation och blockers. Inga förbjudna autopostningar finns kvar.

**Test gate**  
- Invoice-to-ledger, AP-to-payment, statement-match, VAT-return basis, tax-account reconciliation, negative cases for unmatched or conflicting events.

**Audit/replay/runtime gate**  
- Payment orders, matches, tax account classifications och VAT locks har full audit och evidence chain.

**Migration/cutover gate**  
- Open AR/AP, statement history, tax account history och opening balances måste kunna importeras och diffas före pilot.

**Blockerar nästa steg**  
- Documents, payroll, HUS och projects profitability kräver stabil finance-adjacent sanning.

**Blockerar go-live**  
- Bank, VAT eller skattekonto utan reconciliation blockerar go-live.

**Blockerar competitor parity**  
- Parity mot Fortnox/Visma/Bokio kräver detta.

**Blockerar competitor advantage**  
- Tax account as first-class domain och stronger gates kräver denna fas.

**Blockerar UI-readiness**  
- Finance UI kan inte designas tryggt utan full route- och blockerlogik.

## [ ] Fas 10 — Documents, OCR, classification, import cases och review center

**MÃ¥l**  
Göra document-to-decision-kedjan verklig: originaldokument, OCR, klassificering, import cases, review queues och evidence-hashar.

**Beroenden**  
- 9

**Får köras parallellt med**  
- OCR-adapter och classification pipeline kan byggas parallellt.
- Review center och import-case mapping kan byggas parallellt.

**Får inte köras parallellt med**  
- Inget OCR- eller classificationsförslag får leda till posting, payroll eller filing utan reviewgräns där required.

**Delfasstatus**
- 10.1 klar 2026-03-28: dokumentkedjan bär nu explicit `retentionClassCode`, `sourceFingerprint`, `checksumAlgorithm`, `checksumSha256`, `originalDocumentVersionId`, `latestDocumentVersionId` och `evidenceRefs`, med canonical migrationsregistrering och läsrutter för dokument- och versionskedjan.
- 10.2 klar 2026-03-28: OCR-stubben är nu ersatt med Google Document AI-baserad adapterkedja med explicita profiler, provider-baselines, sync-vs-async processing mode, page limits, operation refs, callback-route, rerun-supersede, provider confidence/quality och blockerande low-confidence review i stället för falsk lokal textract-stub.
- 10.3 klar 2026-03-28: classification/extraction-pipelinen materialiserar nu canonical `ExtractionProjection`-objekt med `extractionFamilyCode`, `candidateObjectType`, `documentRoleCode`, `targetDomainCode`, `normalizedFieldsJson`, `attachmentRefs` och `payloadHash`, auto-deriverar AP-, travel-, benefits-, payroll- och attachmentkandidater från OCR-fält när line inputs saknas och blockerar person- eller finance-känsliga dokument från att glida vidare utan korrekt review- och downstream-gating.
- 10.4 klar 2026-03-28: import cases bär nu explicita blocker codes för saknade huvudunderlag, tullbevis, komponenter, import-VAT, upstream-klassificering och öppna correction requests, materialiserar correction request-objekt med mänsklig approve/reject-kedja och replacement-case-korrigering, och applicerar downstream-mappning replay-säkert via idempotent `appliedCommandKey` + payload hash; nya API-rutter, lagringsmigrering och `docs/runbooks/import-case-review.md` verifierar kedjan.
- 10.5 klar 2026-03-28: review center exponerar nu full operativ livscykel via API med `claim`, `start`, `request-more-input`, `reassign`, `decide` och `close`, samtidigt som queue ownership, SLA-scan, first/recurring breach-escalation och auditkedja verifieras i unit-, API-, route-metadata- och backoffice-sviter; `docs/runbooks/review-center-operations.md` beskriver nu den faktiska operativa kedjan.

**Delfaser**
- [x] 10.1 [HARDEN] **Originaldokument och versionskedja** — Original, hash, checksum, source fingerprint, retention class och evidence refs.
- [x] 10.2 [REPLACE] **Byt OCR-stub mot riktig provider** — Google Document AI eller vald baseline-adapter med confidence, rerun, page limits, async callback och low-confidence review.
- [x] 10.3 [HARDEN] **Classification/extraction pipeline** — Canonical extraction model för AP, AR, payroll underlag, benefits/travel och attachments.
- [x] 10.4 [HARDEN] **Import cases och blocker codes** — Completeness, blocking reasons, correction requests, human decisions och replay-safe mapping till downstream domain.
- [x] 10.5 [OPERATIONALIZE] **Review center queues/SLA/escalation** — Riskklass, queue ownership, SLA, claim/start/reassign/decide/close och audit.

**Exit gate**  
- Dokument går från original till godkänt sakobjekt via spårbar OCR/extraction/review-kedja utan förbjudna autopostningar.

**Test gate**  
- OCR happy path, low-confidence path, timeout/retry, classification drift tests, import-case blocker tests, queue SLA escalation tests.

**Audit/replay/runtime gate**  
- Alla OCR-runs, classification suggestions, overrides och review decisions får evidence refs och actor data.

**Migration/cutover gate**  
- Historiska dokument kan importeras som archive-only eller active-review; aldrig som obevakad source of truth utan fingerprinting.

**Blockerar nästa steg**  
- Payroll, AP, expense, HUS och migration kräver verklig dokumentmotor.

**Blockerar go-live**  
- Supplier invoice, expense och document-driven operations blockerar utan detta.

**Blockerar competitor parity**  
- OCR och document review är hygien.

**Blockerar competitor advantage**  
- Document-to-decision with evidence is a winning move.

**Blockerar UI-readiness**  
- Document, inbox och review UI blockerar tills denna fas är klar.

## [ ] Fas 11 — HR, time, balances, collective agreements och migration intake

**MÃ¥l**  
Göra people masterdata, time/absence, balances, centralt publicerade kollektivavtal och supportstyrda avtalsavvikelser till stabila inputs för payroll, projects och migration.

**Beroenden**  
- 7
- 9
- 10

**Får köras parallellt med**  
- HR masterdata och time/absence kan byggas parallellt.
- Balances och collective agreements kan byggas parallellt efter masterdata.

**Får inte köras parallellt med**  
- Ingen payroll- eller project-costing-kedja får använda oapproved time/absence eller odaterade employment snapshots.

**Delfasstatus**
- 11.1 klar 2026-03-28: HR/employment är nu härdad med effektiva placement- och salary-basis-objekt, overlap-blockers för placements/contracts/manager assignments, completeness-signaler i employment snapshot och nya HR-rutter för governed placement/salary basis samt cutover-runbook.
- 11.2 klar 2026-03-28: Time/absence/balances är nu härdade med governed `ApprovedTimeSet`, låsning av approved payroll-input per period, AGI-känsliga leave-boundaries, `AbsenceDecision` i admin- och portalflöden, time-base-kontrakt för active approved set och uppdaterade verifieringsrunbooks.
- 11.3 klar 2026-03-28: Collective agreements är nu härdade med centralt publicerat avtalsbibliotek, supportstyrd intake, intern extraktions- och reviewkedja, publicerad dropdown-selektion, governed agreement assignment via publicerade katalogposter, lokala supplements med approval och uppdaterade intake-/activation-runbooks.
- 11.4 klar 2026-03-28: Payroll-adjacent history import är nu utbyggd med employee master snapshots, employment history, YTD, AGI carry-forward, benefit/travel history, explicit evidence mapping, frozen history evidence bundle, live-gating på saknad evidence coverage och ny verifieringsrunbook för pilot cutover.

**Delfaser**
- [x] 11.1 [HARDEN] **HR/employment source of truth** — Employee, employment, organization placement, salary basis, cost center, service line och effective dating.
- [x] 11.2 [HARDEN] **Time, absence och balances** — Approved time inputs, absence types, carryovers, leave locks och AGI-sensitive absence boundaries.
- [x] 11.3 [HARDEN] **Collective agreement catalog och engine** — Centralt publicerat avtalsbibliotek, supportstyrd intake av nya avtal, intern AI-assisterad extraktion med mänsklig payroll/compliance-approval, publicerad dropdown-selektion, agreement assignment, effective dates, pay item derivation, rate tables, lokala supplements och override governance.
- [x] 11.4 [MIGRATE] **Payroll-adjacent history import** — Employee master, employment history, YTD, balances, AGI history, benefits/travel history och evidence mapping.
- [x] 11.5 [NEW BUILD] **Payroll input snapshots** — Lås input fingerprints och snapshot objects som pay run senare konsumerar.

**Exit gate**  
- Payroll, projects och review kan lita på HR/time/balances/agreements som canonical inputs med effective dating, publicerad avtalskatalog, supportstyrda lokala tillägg och importstöd.

**Test gate**  
- Employment history timeline tests, balance carryover tests, collective agreement rate tests, support-managed agreement intake, published dropdown selection restrictions, local supplement approval tests, historical import/YTD validation.

**Audit/replay/runtime gate**  
- Anställningsändringar, balance adjustments, agreement assignments, agreement intake/publication/local supplements och manual overrides måste auditeras med reason codes.

**Migration/cutover gate**  
- Importkatalog för HR/payroll-historik ska kunna diffas mot legacy och signas av innan första pay run i pilot.

**Blockerar nästa steg**  
- Payroll correctness blockerar utan denna fas.

**Blockerar go-live**  
- Lön utan korrekt masterdata/time/agreements blockerar go-live.

**Blockerar competitor parity**  
- Parity mot lönekonkurrenter kräver detta.

**Blockerar competitor advantage**  
- Cross-domain cost allocation och project profitability kräver denna fas.

**Blockerar UI-readiness**  
- HR/time/payroll UI blockerar utan stabil people truth.

## [ ] Fas 12 — Payroll, AGI, benefits, travel, pension, salary exchange och Kronofogden

**MÃ¥l**  
Bygga svensk produktionssäker lön med tabellskatt/jämkning/SINK, employer contributions, benefits, travel, pension och löneutmätning.

**Beroenden**  
- 5
- 9
- 11

**Får köras parallellt med**  
- Benefits/travel och pension kan byggas parallellt.
- Kronofogden-remittance kan förberedas parallellt efter tax decision snapshots.

**Får inte köras parallellt med**  
- AGI-submission, live payroll eller bank payment batch får inte öppnas innan preliminärskatt och garnishment är korrekt.

**Delfaser**
- [x] 12.1 [REPLACE] **Byt `manual_rate` som standard** — Inför `TaxDecisionSnapshot` med tabell, jämkning, engångsskatt, SINK och emergency manual endast med dual review.
- [x] 12.2 [HARDEN] **Employer contributions och växa-stöd** — Implementera ålderslogik, reducerade nivåer, blandade component-split och växa-stöd via skattekonto/decision snapshots.
- [x] 12.3 [HARDEN] **Pay run engine och AGI constituents** — Fingerprints, ordering, posting intents, payment batch, immutable AGI version, changed-employee flags.
- [x] 12.4 [HARDEN] **Benefits, net deductions, travel, mileage** — Skatteklassificering, nettolöneavdrag, traktamente, milersättning, expense split och review codes.
- [x] 12.5 [HARDEN] **Pension och salary exchange** — Policy, effective dating, pension basis, special payroll tax, provider export instruction.
- [x] 12.6 [NEW BUILD] **Kronofogden/löneutmätning** — Decision snapshots, förbehållsbelopp, protected amount, remittance liability, payment order och audit chain.
- [x] 12.7 [OPERATIONALIZE] **Payroll trial guards** — Trial mode får producera hela pay-run/AGI-kedjan men endast mot non-live receipts, non-live bank rails och watermarked evidence.

**Exit gate**  
- Produktionssäker svensk payroll-logik finns inklusive tabellskatt/jämkning/SINK, AGI constituents, benefits/travel/pension och Kronofogden-remittance.

**Test gate**  
- Golden payslips per tax type, SINK yearly renewal, employer contribution edge cases, benefits thresholds, travel rules, garnishment calculations, correction runs.

**Audit/replay/runtime gate**  
- Alla tax decisions, manual fallbacks, garnishment overrides, salary exchange policies och AGI versions får full audit och evidence.

**Migration/cutover gate**  
- Payroll history och YTD måste kunna importeras, diffas och valideras före första live-run; corrections får inte tappa historik.

**Blockerar nästa steg**  
- HUS, annual reporting, project profitability och pilotgo-live blockerar utan säker payroll.

**Blockerar go-live**  
- Manual-rate payroll eller saknad garnishment blockerar go-live.

**Blockerar competitor parity**  
- Parity mot lönemarknaden kräver denna fas.

**Blockerar competitor advantage**  
- Payroll correctness + correction chain + supportability är stor differentierare.

**Blockerar UI-readiness**  
- Payroll UI kan inte frysas före detta.

## [ ] Fas 13 — HUS, regulated submissions, receipts/recovery, declarations och annual reporting

**MÃ¥l**  
Slutföra alla reglerade submission-kedjor: AGI, VAT, HUS, annual reporting/declarations med receipts, recovery, correction och tax-account-koppling.

**Beroenden**  
- 5
- 9
- 12

**Får köras parallellt med**  
- HUS och annual reporting kan byggas parallellt efter generic submission model.
- AGI/VAT transportadaptrar kan byggas parallellt.

**Får inte köras parallellt med**  
- Ingen live submission eller live filing får ske innan technical receipt, material receipt, correction och replay är definierade och testade.

**Delfasstatus**
- 13.1 klar 2026-03-28: HUS-lifecycle är nu härdad med weekend-justerad submission-deadline, per-köpare årskapacitet och ROT-cap, låsta claim fields efter draft, official-capable `xml`/`direct_api` transportprofiler, blockerad authority decision på draft claim och blockerad payout tills partial-acceptance-differens är löst, verifierat i nya phase 13-unit/API-sviter samt gamla HUS-regressioner.
- 13.2 klar 2026-03-28: regulated submissions ligger nu i ett verkligt canonical package med first-class `SubmissionAttempt`- och `SubmissionEvidencePack`-objekt, canonical envelope-ref på submissiondetaljer, bakåtkompatibel shim i integrationslagret, egen API-läsning för attempts och verifiering via nya phase 13.2-unit/API-sviter, phase 12-submission-regressioner samt full svit.
- 13.3 klar 2026-03-28: canonical regulated submissions väljer nu faktisk transportadapter per AGI/VAT/HUS/annual submission med pinned channel/fallback-plan i stället för fri `simulatedTransportOutcome` i live path; worker och API accepterar bara scenariostyrning i icke-live, production/pilot går via explicit official fallback med `contact_provider`-queue, attempts/evidence bär adapter- och fallbackmetadata och queued transportjobb lämnar inte längre submissionen falskt i `queued` efter genomförd dispatch.
- 13.4 klar 2026-03-28: annual reporting och declarations är nu låsta mot verklig signoff-hash och locked version, tax declaration packages bär legal-form/reporting profile och signatory metadata, submission-dispatch blockerar unsigned eller stale annual payloads och nya runbooks täcker annual filing correction utan att skriva över historik.
- 13.5 klar 2026-03-28: regulated submissions bär nu first-class recovery- och reconciliation-spår utöver receipts/attempts, material reject öppnar recovery och blockerar replay till correction-only path, technical reject/transport fail skapar replay-safe recovery, evidence packs bär recovery refs + reconciliation summary och API exponerar recovery/reconciliation/resolve för operatorflödet.
- 13.6 klar 2026-03-28: trial mode använder nu en riktig deterministic regulated simulator i stället för ad hoc fake-parametrar, med auto-materialiserade non-live receipts för AGI/VAT/HUS/annual, explicit `legalEffect=false`, `TRIAL`-watermark på attempts/receipts/evidence/reconciliation, blockerade manuella trial-overrides och ny verifieringsrunbook för trial-regulated flows.

**Delfaser**
- [x] 13.1 [HARDEN] **HUS/ROT/RUT lifecycle** — Verified payment, locked fields, buyer allocation, deadlines, XML/direct transport, decisions, partial acceptance, recovery.
- [x] 13.2 [NEW BUILD] **Submission envelope/attempt/receipt core** — Canonical objects för envelope, attempt, receipt, correction link, action queue item, evidence pack.
- [x] 13.3 [REPLACE] **Byt simulerad transport mot riktiga adapters** — AGI, Moms, HUS och annual filing använder riktiga transportsätt eller explicita official fallbacks med samma canonical payload.
- [x] 13.4 [HARDEN] **Annual package, declarations och signoff** — Locked report snapshots, package hash, legal form profile, signatory chain, SRU/iXBRL/official API handling.
- [x] 13.5 [HARDEN] **Receipt, replay, dead-letter och recovery** — Technical vs material receipt, idempotent replay, correction-only new payload, operator interventions och reconciliation rules.
- [x] 13.6 [NEW BUILD] **Trial-safe regulated simulators** — Trial mode får only-simulate official transport med deterministic fake receipts, explicit `legalEffect=false` och audit watermarks.

**Exit gate**  
- Alla reglerade flöden går via samma receipt/recovery-modell. HUS, AGI, VAT och annual filing är transport- och operator-mässigt kompletta.

**Test gate**  
- Submission success, technical fail, material fail, replay same payload, correction new version, HUS partial acceptance/recovery, annual filing signatory mismatches.

**Audit/replay/runtime gate**  
- Submission, signoff, receipt collection, correction, replay och dead-letter intervention får immutable audit och evidence bundle.

**Migration/cutover gate**  
- Historiska filings och receipts kan importeras som immutable history men aldrig redigeras; nya corrections startar från pinned package versions.

**Blockerar nästa steg**  
- Cutover, pilot och compliance parity blockerar utan detta.

**Blockerar go-live**  
- Inget go-live utan verkliga receipt-kedjor.

**Blockerar competitor parity**  
- Parity mot Visma/Fortnox/Wint kräver deklarations- och filingkedjor.

**Blockerar competitor advantage**  
- Unified submissions/recovery cockpit är en central premiumfördel.

**Blockerar UI-readiness**  
- Submission och compliance UI blockerar tills canonical receipts finns.

## [ ] Fas 14 — Generell project core, CRM-linked commercial chain, profitability, portfolio, field och vertikala packs

**MÃ¥l**  
Bygga projektfältet som generell projekt- och uppdragsmotor för alla branscher, med CRM-handoff, resource/portfolio/profitability och valbara field/personalliggare/ID06-pack ovanpå.

**Beroenden**  
- 8
- 9
- 11
- 12

**Får köras parallellt med**  
- Project commercial core och profitability engine kan byggas parallellt.
- Field/personalliggare/ID06 packs kan byggas parallellt efter general core.
- CRM/project adapters kan påbörjas i fas 16 men kontrakten låses här.

**Får inte köras parallellt med**  
- Ingen work-order eller bygglogik får tvingas in som universell projektmodell. Inga CRM-objekt får bli source of truth för projektfinans eller profitability.

- 14.1 klar 2026-03-28: general project-commercial core har nu verkliga `engagements`, `work-models`, `work-packages`, `delivery-milestones`, `work-logs`, `revenue-plans` och `profitability-snapshots` i både domänruntime och API, route contracts publicerar rätt project-scope/action classes, workspace/evidence bundle bär commercial-core-objekten och profitability refs, work-model-katalogen täcker consulting/service/work-order/construction/internal-delivery-spår och verifieras via nya phase 14.1 unit/API-sviter, route-metadata och fullsvit; se `docs/runbooks/fas-14-1-project-commercial-core-verification.md`.
- 14.2 klar 2026-03-28: accepted quote handoff bygger nu kanoniska `OpportunityLink`, `QuoteLink`, `Engagement`, `WorkModel`, godkand `RevenuePlan`, aktiv `BillingPlan` och `ProjectStatusUpdate` i projects-runtimen, workspace/evidence bundle bär `customerContext` och handoff-objekten, project API publicerar quote-handoff- och link-plan/status-routes med starka project-scope contracts och duplicate handoff pa samma quote/version returnerar befintligt projekt i stallet for dubbelregistrering; se `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`.
- 14.3 klar 2026-03-28: project profitability bär nu riktiga billing models for `fixed_price`, `time_and_material`, `milestone`, `retainer_capacity`, `subscription_service`, `advance_invoice` och `hybrid_change_order`, AP/HUS/approved manual adjustments matar cost- och profitability snapshots, `ProjectProfitabilityAdjustment` och `ProjectInvoiceReadinessAssessment` är first-class runtime/API-objekt, workspace/evidence bundle publicerar dem, change orders går nu `draft -> priced -> approved -> applied` och applied change orders superseder commercial chain via ny approved `RevenuePlan` och active `BillingPlan`; se `docs/runbooks/fas-14-3-project-billing-profitability-verification.md`.
- 14.4 klar 2026-03-28: `ProjectCapacityReservation`, `ProjectAssignmentPlan`, `ProjectRisk` och company-wide project portfolio är nu first-class runtime/API-objekt, workspace/evidence bundle bär capacity/risk/portfolio-data, `status-updates` driver portfolio health, budget-vs-actual-vs-forecast materialiseras per projekt och i portfolio-summary, risk/warning-codes blockerar inte tyst och project API publicerar portfolio-, reservation-, assignment- och risk-routes med starka project-scope contracts; se `docs/runbooks/fas-14-4-resource-portfolio-risk-verification.md`.
- 14.5 klar 2026-03-28: field-packet bar nu first-class `OperationalCase`, `MaterialReservation`, `MaterialUsage`, `FieldEvidence` och `ConflictRecord` ovanpa optional `work_order`-pack, work orders lacker inte langre in som universell modell, sync-policys anvander inte `server_wins` pa reglerade eller kostnadsdrivande objekt, invoice readiness blockeras av oppna conflicts och nya operational-case-routes publicerar reservations-, evidence- och conflict-resolution-floden med egna contracts; se `docs/runbooks/fas-14-5-field-operational-pack-verification.md`.
- 14.7 klar 2026-03-28: project trial/demo-flöden är nu first-class runtime/API med publicerad scenariokatalog, scenario-materialisering till kanoniska project-commercial-objekt, governed CRM/project-importbatcher, trial-safe invoice simulations utan legal effekt, portable live conversion plans, workspace/evidence bundle som bär trial/import/simulation/conversion-objekt och verifieringsrunbook för end-to-end trial till live-promotion; se `docs/runbooks/fas-14-7-project-trial-demo-verification.md`.

**Delfaser**
- [x] 14.1 [HARDEN] **General project-commercial core** — Project, Engagement, WorkModel, WorkPackage, DeliveryMilestone, WorkLog, CostAllocation, RevenuePlan, ProfitabilitySnapshot, ProjectDeviation, ProjectEvidenceBundle.
- [x] 14.2 [NEW BUILD] **CRM-linked handoff** — Opportunity/quote-to-project conversion, change order chain, billing plan, status updates, customer context och acceptance handoff från CRM utan att göra CRM till source of truth.
- [x] 14.3 [NEW BUILD] **Billing models och WIP/profitability** — Fixed price, time & materials, milestone, retainer capacity, subscription service, advance invoice, hybrid change order och profitability från payroll/AP/material/travel/HUS/billing.
- [x] 14.4 [NEW BUILD] **Resource, portfolio och riskstyrning** — Capacity reservations, assignment planning, skills/roles, project portfolio, risk register, status updates, budget vs actual vs forecast.
- [x] 14.5 [HARDEN] **Field/service/work-order pack** - OperationalCase, DispatchAssignment, MaterialUsage, FieldEvidence, SignatureRecord, SyncEnvelope, ConflictRecord. Work orders ska vara optional pack.
- [x] 14.6 [HARDEN] **Personalliggare, ID06 och egenkontroll packs** — Attendance som separat sanning, ID06 identity graph, workplace bindings, checklist/signoff, construction pack som vertikal overlay.
- [x] 14.7 [NEW BUILD] **Project trial/demo flows och migration** — Seed project scenarios, import from CRM/project tools, client-ready demo data, safe invoicing simulation och eventual live conversion path.

**Exit gate**  
- Project core fungerar för konsult, byrå, service, installation, maintenance, construction, campaign och supportprogram utan att tvinga byggsemantik på alla. Profitability är verklig. Field/personalliggare/ID06 är layer-packs.

**Test gate**  
- Consulting time/milestone, retainer capacity, field service order with signature, construction workplace with attendance/ID06, change order profitability, forecast vs actual.

**Audit/replay/runtime gate**  
- Project approvals, change orders, invoicing readiness, field evidence, attendance corrections, ID06 validations och profitability adjustments ska auditeras.

**Migration/cutover gate**  
- Projekt, quotes, open work, unbilled time, tasks, customers och profitability baselines ska kunna importeras från utvalda externa system.

**Blockerar nästa steg**  
- CRM/project parity och field vertical parity blockerar utan denna fas.

**Blockerar go-live**  
- Service- och projektbolag kan inte drivas i systemet utan detta.

**Blockerar competitor parity**  
- Parity mot monday/Asana/ClickUp/Teamleader/Zoho/Odoo/Dynamics/Bygglet kräver denna fas.

**Blockerar competitor advantage**  
- General core + stronger profitability + regulated coupling är vår tydligaste project-market win move.

**Blockerar UI-readiness**  
- Project UI och field mobile blockerar tills general core och packgränser är stabila.

## [ ] Fas 15 — Reporting, search, object profiles, saved views, notifications, activity och work items

**MÃ¥l**  
Materialisera read models, operator views och separata objektfamiljer som framtida UI och backoffice ska vila på.

**Beroenden**  
- 8
- 9
- 10
- 12
- 13
- 14

**Får köras parallellt med**  
- Reporting/read models och search/object profiles kan byggas parallellt.
- Notifications/activity/work items kan byggas parallellt efter permission resolution.

**Får inte köras parallellt med**  
- Ingen UI-readiness eller support cockpit får deklareras innan read models, saved views och queue ownership finns som backend-kontrakt.

**Delfaser**
- [x] 15.1 [HARDEN] **Reporting snapshots och metrics** — Trial balance, P&L, balance sheet, cashflow, open items, payroll reports, project portfolio, tax account summary och submission dashboards.
- [x] 15.2 [HARDEN] **Search, object profiles och workbenches** — Permission-trimmade object profiles, blockers, sections, actions, workbench composition och saved views.
- [x] 15.3 [HARDEN] **Notifications och activity som egna familjer** — Recipient, channel, digest, snooze, escalation och append-only activity feeds.
- [x] 15.4 [HARDEN] **Work items, queues och ownership** — Queue grants, SLA, escalation, assignment, dual-control blockers och operator views.
- [x] 15.5 [NEW BUILD] **Project/finance/compliance mission control** - Portfolio dashboards, close blockers, payroll submission monitoring, cutover dashboards, trial conversion dashboard.

**Exit gate**  
- Read models och workbench-kontrakt finns för alla kritiska operatörsytor. Search är aldrig source of truth men alltid korrekt permission-trimmad.

**Test gate**  
- Projection rebuild, ACL search tests, workbench blockers, notification visibility, digest generation, saved view compatibility tests.

**Audit/replay/runtime gate**  
- View generation och queue actions har audit trail; sensitive visibility denials loggas med reason codes.

**Migration/cutover gate**  
- Projection versioning och saved-view migration måste stödja bakåtkompatibilitet genom pilot.

**Blockerar nästa steg**  
- Public API sandbox catalog, backoffice och UI-readiness kräver dessa read models.

**Blockerar go-live**  
- Operatörer kan inte driva systemet utan dashboards/work items.

**Blockerar competitor parity**  
- Parity kräver användbara read models, även om UI kommer senare.

**Blockerar competitor advantage**  
- Object profiles + operator-first workbench är en kärndifferentierare.

**Blockerar UI-readiness**  
- Denna fas är det direkta UI-underlaget.

## [ ] Fas 16 — Integrationsplattform, public API, partner API, webhooks och prioriterade provideradapters

**MÃ¥l**  
Göra integrationslagret verkligt: connections, credentials, consent, provider health, public sandbox, partner ops, signed webhooks och rätt adapterordning.

**Beroenden**  
- 4
- 5
- 6
- 9
- 10
- 12
- 13
- 15

**Får köras parallellt med**  
- Public API/webhooks och partner control-plane kan byggas parallellt.
- Olika provideradapters kan byggas parallellt efter capability manifest, men live-aktivering följer domängater.

**Får inte köras parallellt med**  
- Inga live providers får aktiveras före sina domängater. ID06 får inte råka använda trial/sandbox på fel sätt. CRM/project-adapters får inte styra core semantics.

**Delfasstatus**
- 16.1 klar 2026-03-29: integrationslagret bär nu first-class `IntegrationConnection`, `CredentialSetMetadata`, `ConsentGrant` och `IntegrationHealthCheck`; capability manifests exponerar explicit `modeMatrix`, `allowedEnvironmentModes`, fallback/rate-limit-policy och provider environment refs; legacy partner creation backfillar canonical control-plane metadata; `/v1/integrations/capability-manifests` och `/v1/integrations/connections*` är verkliga runtime-ytor och credential-reuse över `trial`/`sandbox`/`test`/`pilot_parallel`/`production` blockeras deterministiskt, verifierat i nya phase 16.1 unit/API-sviter, route-metadata-svit och full verifiering.
- 16.2 klar 2026-03-29: public API-specen är nu explicit versionslåst med `supportedVersions`, `currentVersion`, `canonicalApiVersion`, `scopeCatalog`, endpoint-katalog och webhook-event-katalog; compatibility baselines validerar version, bär `specHash` och `endpointCount`; sandbox-katalogen är uttryckligen watermarked/non-legal-effect med client-credentials-kontrakt, report snapshot-exempel, tax-account summary-exempel och example webhook events; verifierat i nya phase 16.2 unit/API-sviter, regressionssviter för phase 13 och full verifiering.
- 16.3 klar 2026-03-29: partneradapters bär nu first-class contract-test-pack-katalog, läsbar adapter health history och health summary, connection-aware async jobs/dead letters samt produktionsspärr som kräver grönaste senaste contract test innan live-dispatch; `/v1/partners/contract-test-packs`, `/v1/partners/connections/:connectionId/health-checks`, `/v1/partners/connections/:connectionId/health-summary` och `/v1/jobs/dead-letters` är verkliga runtime-ytor, verifierat i nya phase 16.3 unit/API-sviter, äldre phase 13 partnerregressioner och full verifiering.

**Delfaser**
- [x] 16.1 [HARDEN] **Integration core, credentials och consent** — Capability manifest, credential metadata, consent grant, health checks, rate limits, fallback modes, environment isolation.
- [x] 16.2 [HARDEN] **Public API och sandbox catalog** — Client credentials, scope catalog, versioned spec, sandbox catalog, report snapshots, tax account summary, example webhook events.
- [x] 16.3 [HARDEN] **Partner API, contract tests och adapter health** — Connection catalog, operation dispatch, async jobs, retry/dead-letter/replay, contract-test packs per adapter.
- [x] 16.4 [REPLACE] **Byt simulerade finance-adapters mot verkliga** — Enable Banking, bankfil/ISO20022, Stripe, Pagero, Google Document AI, Postmark, Twilio, Pleo, official tax transports.
- 16.4 klar 2026-03-29: wave-1 provider runtime är nu first-class i integrationsmotorn med riktiga providerfiler för Stripe, Pagero, Postmark, Twilio, Pleo, Enable Banking, ISO20022 och official tax/annual transports; AR-flöden använder inte längre `internal_mock`, kontrollplanet exponerar nya capability-manifests och generiska integration connections, och verifieringsrunbook för 16.4 finns på plats.
- [x] 16.5 [HARDEN] **Auth/signing/federation adapters** — Signicat, WorkOS, passkey/TOTP, signing/evidence archive.
- 16.5 klar 2026-03-29: Signicat BankID, WorkOS federation, lokala passkey/TOTP och Signicat-baserad signing/evidence-archive är nu first-class capability manifests i kontrollplanet; async callback-health kräver callback domain/path där det behövs, credentialless local factors fungerar utan falska secret-krav, och både regulated submissions och annual reporting bär nu riktiga signature archive refs i evidence/runtime. Verifieringsrunbook finns i `docs/runbooks/phase16-auth-signing-adapters-verification.md`.
- [x] 16.6 [NEW BUILD] **CRM/project ecosystem adapters i rätt ordning** — HubSpot först, Teamleader sedan, monday/Asana/ClickUp import/sync därefter, Zoho och Odoo som project-billing-källor, Dynamics senare enterprise-spår.
- 16.6 klar 2026-03-29: `crm_handoff` har nu first-class adapters för HubSpot, Teamleader Focus, monday work management, Asana, ClickUp, Zoho CRM/Projects/Billing, Odoo Projects Billing och Dynamics 365 Project Operations, alla med capability manifests, governed import-batches, provider baselines, snapshot/restore, verifieringsrunbooks och gröna unit/API/full-gates utan att göra upstream-systemen till invoice truth.
- [x] 16.7 [NEW BUILD] **Trial-safe adapter layer** — Alla adapters måste ha `trial_safe`, `sandbox_supported`, `supportsLegalEffect` och receipt-mode så att trial aldrig kan skapa live-ekonomi eller live-filings.
- 16.7 klar 2026-03-29: adapterlagret bär nu explicit `receiptModePolicy`, resolved connection `receiptMode` och miljösäkrad `supportsLegalEffect` för både direct och partner adapters; trial-health kräver `trial_receipt_mode`, icke trial-säkra adapters blockeras från trial-connection creation och trial kan inte längre råka skapa provider receipts med legal effekt trots gemensam runtime/bootstrap.

**Exit gate**  
- Public API/webhooks är stabila, partner adapters har contract tests, prioriterade providers är live där domängater tillåter, och trial/prod är strikt separerade.

**Test gate**  
- Webhook signing/retry, OAuth/token rotation, provider contract tests, sandbox/prod isolation, rate limit handling, replay and dead-letter operator flows.

**Audit/replay/runtime gate**  
- Credential changes, consent grants, provider outages, fallback activation och replay ska auditeras med provider refs men aldrig använda provider id som affärssanning.

**Migration/cutover gate**  
- Legacy integration references och client secrets måste roteras in i nya modeller utan driftstopp.

**Blockerar nästa steg**  
- Operations, trial launch, pilots och ecosystem parity blockerar utan detta.

**Blockerar go-live**  
- Go-live kräver riktiga providers där live-effekt behövs.

**Blockerar competitor parity**  
- Parity mot Fortnox/Teamleader/monday-liknande ecosystem kräver denna fas.

**Blockerar competitor advantage**  
- Best-in-class APIs, receipts och sandbox stories kräver denna fas.

**Blockerar UI-readiness**  
- UI och admin views för integrations måste vila på stabil control-plane.

## [ ] Fas 17 — Operations, backoffice, support, migration, cutover, parallel run och trial/live drift

**MÃ¥l**  
Slutföra operator- och supportsystemet: incidents, support cases, replay, dead-letter, submission monitoring, migration cockpit, cutover och trial/live operations.

**Beroenden**  
- 3
- 6
- 13
- 15
- 16

**Får köras parallellt med**  
- Support/backoffice och migration cockpit kan byggas parallellt.
- Parallel-run tooling kan köras parallellt med pilot preparations.

**Får inte köras parallellt med**  
- Ingen extern pilot eller go-live får ske innan cutover, rollback och support operations är körbara utan databasingrepp.

**Delfaser**
- [x] 17.1 [HARDEN] **Support case, incident, replay och dead-letter ops** — Support scopes, masked data views, replay planning, dead-letter triage, incident commander flows, submission monitoring.
- 17.1 klar 2026-03-29: backoffice bär nu first-class `ReplayOperation` ovanpå async replay-planer, dead-letter- och submission-monitor-rader länkar tillbaka till replayoperationen, support case- och incidentvyer är maskade som default i API-svaren och verifieringsrunbook finns i `docs/runbooks/support-case-and-replay.md`; delfasen är grön i nya phase 17.1-unit/API-sviter samt full gate.
- [x] 17.2 [HARDEN] **Backoffice-gränser och evidence** — Klar 2026-03-29: support case-, impersonation- och break-glass-sessioner har nu first-class audit-export via API, impersonation bygger egen frozen evidence bundle med watermark/allowlist/approval-kedja, masked backoffice-vyer ligger kvar som default read-model, och driftstöd finns i uppdaterade support- och break-glass-runbooks. Verifierat via phase 3.2-, phase 14-security-, phase 14-security-api- och route-metadata-sviter samt full gate.
- [x] 17.3 [HARDEN] **Migration cockpit och acceptance** — Klar 2026-03-29: migration cockpit bär nu first-class acceptance-evidence-export via `/v1/migration/acceptance-records/:migrationAcceptanceRecordId/evidence`, `CutoverEvidenceBundle` returnerar canonical `migrationAcceptanceRecordId` och `acceptanceType`, och driftstöd finns i nya `docs/runbooks/migration-cutover.md`. Verifierat via phase 14 migration unit/API/e2e, route-metadata och full gate.
- [x] 17.4 [OPERATIONALIZE] **Parallel run och diff motor** — Klar 2026-03-29: migration core bär nu canonical `ParallelRunResult` med threshold-motor, manual acceptance, acceptance-blockers och cockpit/mission-control-board för finance, payroll, HUS, personalliggare och project profitability. Driftstöd finns i nya `docs/runbooks/parallel-run-and-diff.md`. Verifierat via phase 14 migration unit/API/e2e, mission-control, route-metadata och full gate.
- [x] 17.5 [NEW BUILD] **Trial/live operations split** — Klar 2026-03-29: tenant-control bär nu canonical `trialSupportPolicy`, `trialOperationsSnapshot`, queuevyer, alerts, promotion workflows, sales/demo analytics och explicit reset-rights. API ytor finns på `/v1/trial/support-policy`, `/v1/trial/operations`, `/v1/trial/operations/alerts`, `/v1/trial/operations/queues`, `/v1/trial/promotions/workflows` och `/v1/trial/analytics`, och mission control-dashen `trial_conversion` visar nu operationssammanfattning och analytics. Driftstöd finns i nya `docs/runbooks/trial-live-operations.md`. Verifierat via phase 17 unit/API, phase 15 mission-control, route-metadata, phase 1 tenant setup och full gate.
- [ ] 17.6 [NEW BUILD] **Market-winning cutover concierge** — Guided migration, source extract checklist, rehearsals, automated variance report, signoff evidence, rollback drill.

**Exit gate**  
- Support och backoffice kan driva systemet utan direkt DB-access. Cutover, rollback, parallel run och trial/live drift är bevisade i test och pilot.

**Test gate**  
- Replay and dead-letter tests, masked support sessions, cutover rehearsal, rollback rehearsal, parallel-run diff thresholds, incident escalation tests.

**Audit/replay/runtime gate**  
- Alla support- och cutoveraktiviteter får immutable audit, evidence bundle och actor approvals.

**Migration/cutover gate**  
- Fasen är själv migration/cutover-motorn; inga externa go-lives utan signerat acceptance bundle och rollback path.

**Blockerar nästa steg**  
- Pilot och live release blockerar utan detta.

**Blockerar go-live**  
- Go-live utan cutover/rollback/support-ops är förbjudet.

**Blockerar competitor parity**  
- Market parity kräver att kunder kan migrera in och få support.

**Blockerar competitor advantage**  
- Cutover concierge och support workbench är stor premiumfördel.

**Blockerar UI-readiness**  
- Backoffice och cockpit-UI saknar grund utan denna fas.

## [ ] Fas 18 — Pilot, enterprise gate, competitor parity, competitor advantage och UI-readiness

**MÃ¥l**  
Bevisa att backend-kontrakten bär verkliga kundscenarier, låsa UI-kontrakt och öppna go-live först efter parity, advantage och enterprise-gater är passerade.

**Beroenden**  
- 17

**Får köras parallellt med**  
- Olika pilotkohorter kan köras parallellt när respektive domängater är gröna.

**Får inte köras parallellt med**  
- Ingen generell lansering före godkänd pilot, enterprise gate och competitor parity gate. UI-start får inte ske innan backend-kontrakt är frozen.

**Delfaser**
- [ ] 18.1 [OPERATIONALIZE] **Intern dogfood + finance pilot** — Kör eget bolag/egna testbolag genom finance, VAT, payroll, HUS, tax account, annual och supportflöden.
- [ ] 18.2 [OPERATIONALIZE] **Pilotkohorter per segment** — AB med ekonomi+lön, service/projektbolag, HUS-bolag, construction/service med personalliggare/ID06, enterprise SSO-kund.
- [ ] 18.3 [NEW BUILD] **Competitor parity board** — Mät svart på vitt parity mot Fortnox, Visma, Bokio, Wint, Teamleader, monday, Asana, ClickUp, Zoho, Odoo, Bygglet, Byggdagboken.
- [ ] 18.4 [NEW BUILD] **Competitor advantage release pack** — Släpp differentiators: tax account cockpit, unified receipts/recovery, migration concierge, safe trial-to-live, project profitability mission control.
- [ ] 18.5 [HARDEN] **UI readiness contract freeze** — Lås object profiles, workbenches, commands, blockers, list/read/detail/action contracts och permission reasons för desktop/backoffice/field.
- [ ] 18.6 [OPERATIONALIZE] **Final go-live gate** — Release checklist: technical, regulated, support, migration, security, parity, advantage, trial-sales readiness.

**Exit gate**  
- Pilots har klarats, enterprise gate är grön, parity är uppnådd i kärnområden, differentiators är live eller påslagna, och UI-kontrakten är frozen.

**Test gate**  
- Pilot acceptance tests, enterprise security review, parity scorecards, trial-to-live conversion tests, UI contract snapshots.

**Audit/replay/runtime gate**  
- Varje pilot, gate och releasebeslut auditeras med evidence bundle och signoff chain.

**Migration/cutover gate**  
- Varje pilotkons bästa cutover- och rollback-data måste finnas som mall före breddlansering.

**Blockerar nästa steg**  
- Det finns inget nästa steg; detta är sista grind före generell go-live.

**Blockerar go-live**  
- Alla röda gater här blockerar go-live.

**Blockerar competitor parity**  
- Om parity-board har rött i hygienområden får go-live inte ske.

**Blockerar competitor advantage**  
- Om winning moves inte är realiserade får produkten inte kallas marknadsledande, men begränsad release kan ske endast om parity är grön.

**Blockerar UI-readiness**  
- UI-arbete får inte passera kontraktsfrysningen innan denna fas.


## Appendix A — Traceability från FULL_SYSTEM_ANALYSIS

| Kritisk analysfynd | Representeras i fas |
|---|---|
| Systemet är fortfarande arkitekturdominerat | 1, 2, 3, 4 |
| För mycket in-memory truth | 1, 2 |
| Migrationslagrets inkonsistens | 1 |
| Finance-kärnan är starkare än produktskalet | 8, 9, 15, 18 |
| Payroll bred men inte regulatoriskt säker | 5, 11, 12, 13 |
| BankID/provider reality är stubbad | 6, 16 |
| Integrations- och submission-lager delvis syntetiskt | 4, 13, 16 |
| Desktop/field är shells | 14, 15, 18.5 |
| Tenant setup är inte full finance-ready | 7 |
| Tax account behöver bli verklig operativ domän | 9, 13 |
| HUS är stark men extern submission/receipt behöver verklighet | 13 |
| Annual reporting package finns men filing/signing måste realiseras | 13 |
| Review/work items/notifications/activity är stark backend men saknar full operatörsyta | 15, 17, 18 |
| Migration/cutover är mer cockpit än verklig motor | 17, 18 |
| Public API/webhooks är starkare än äldre docs säger | 4, 16 |
| Projects måste vara generell core, inte byggcentrisk | 0, 14 |
| Go-live blockeras av runtime truth, payroll correctness, provider reality, migration, productsurface | 2, 12, 13, 16, 17, 18 |

## Appendix B — Traceability från LEGACY_AND_REALITY_RECONCILIATION

| Legacy/konflikt | Åtgärd i roadmap |
|---|---|
| Produkten feltolkas som byggprogram | 0.1–0.2 |
| `phase14.3` eller versionetiketter används som mognadssignal | 0.5 |
| Worker underskattas men måste härdas på riktigt | 2.3, 3, 17 |
| Webhooks felaktigt betraktade som fejk | 4, 16 |
| BankID misstolkas som klart pga strong auth objects | 6.1–6.5 |
| OCR misstolkas som verklig providerkedja | 10.2–10.4 |
| Submission transport misstolkas som verklig | 13.2–13.5 |
| Partner integrations misstolkas som verkliga | 16.3–16.7 |
| Onboarding övertolkas som finance-ready tenant | 7 |
| Migrationslager övertolkas som säkert pga många SQL-filer | 1, 17 |
| Demo-seeding riskerar att blandas ihop med produktionsverklighet | 1.2–1.3, 7.3–7.4 |
| Search/workbench underskattas som bara framtids-UI | 15 |
| Route/test-bredd likställs med live providerkedjor | 0.5, 16, 18 |

## Appendix C — Market, competitor parity och competitor advantage som måste byggas

### Finans- och företagsplattform parity
- Fortnox/Visma/Bokio/Wint/Björn Lunden kräver minst: finance-ready setup, bank/payments, AP/AR, VAT, payroll, AGI, annual, HUS, skattekonto, API/webhooks, migration/support.
- Dessa krav lever i faserna 7–13, 16–18.

### CRM- och projektplattform parity
- monday.com, Asana och ClickUp sätter standard för portfolio, resource visibility, workload, status, timesheets och multi-project oversight.
- Teamleader, Zoho och HubSpot sätter standard för CRM-anknuten quote-to-project, time-to-invoice, customer context och SMB project operations.
- Dynamics 365 Project Operations och Odoo sätter standard för project-based commercial models: fixed price, time & materials, schedules, pro forma/billing plans, costing and profitability.
- Dessa krav lever i fas 14, 15, 16 och 18.

### Bygg/field parity utan byggcentrering
- Bygglet och Byggdagboken sätter standard för work order, material, foto/signatur, personalliggare, enkel field execution och ÄTA-liknande flöden.
- Dessa krav lever i fas 14 och 18, men får aldrig definiera produktens kärna.

### VÃ¥ra bindande winning moves
1. Tax account som förstaklassig domän.
2. Full regulated receipts/recovery cockpit.
3. Migration concierge med diff, parallel run, rollback och acceptance evidence.
4. Säljbar, säker trial-to-live.
5. General project core med verklig profitability, CRM-handoff och vertikala packs.
6. Operator-first support/backoffice med replay, dead-letter och submission monitoring.

## Appendix D — Provider- och adapterordning som är bindande

### Wave 1 före första breda go-live
- Signicat-baserad BankID/eID och signering via auth broker
- WorkOS eller likvärdig broker för enterprise federation
- Enable Banking
- ISO 20022/Bankgiro-baseline
- Stripe Payment Links
- Pagero Online/Peppol
- Google Document AI
- Postmark + Twilio
- Pleo eller likvärdig spend feed
- Officiella Skatteverket/Bolagsverket-transportvägar eller explicit officiell fallback
- HubSpot adapter
- Teamleader adapter

### Wave 2 efter parity men före bred enterprise expansion
- monday.com / Asana / ClickUp import/sync
- Zoho CRM/Projects/Billing
- Odoo project-billing migrations
- Dynamics 365 Project Operations enterprise integration
- Direkt BankID-adapter endast om brokerstrategin behöver kompletteras av kommersiella eller regulatoriska skäl

## Slutregel

Denna roadmap är den enda bindande byggordningen. Ingen implementation, ingen featuregren och ingen UI-plan får köra utanför denna ordning utan uttrycklig ändring i detta dokument.
