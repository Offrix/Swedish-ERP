> Statusnotis: Detta dokument är inte längre bindande sanning eller acceptansbevis. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Historiska `[x]`-markeringar i detta dokument är icke-bindande och får inte användas som leveransbevis.
# GO_LIVE_ROADMAP

Status: Historical input document superseded by the final go-live documents.
Datum: 2026-03-26
Detta dokument får endast användas som historiskt inputmaterial när det inte krockar med finaldokumenten ovan.
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

**MÃƒÂ¥l**  
GÃ¶ra de tvÃ¥ nya dokumenten till enda sanning, dÃ¶da felaktiga antaganden och lÃ¥sa produktkategori, providerstrategi och projektkÃ¤rnans riktning innan nÃ¥gon mer feature-kod byggs.

**Beroenden**  
- Ingen

**FÃ¥r kÃ¶ras parallellt med**  
- DokumentstÃ¤dning och traceability-matris kan kÃ¶ras samtidigt som kodinventering av seeds/stubbar.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen implementation i reglerade flÃ¶den, auth, projects eller UI fÃ¥r starta innan denna fas Ã¤r signerad.

**Delfasstatus**
- 6.1 Ã¥terverifierad 2026-03-27: auth broker ersÃ¤tter fortsatt BankID-stubben med Signicat-baserad BankID i sandbox/production, lokala passkeys/TOTP som identity links, WorkOS-federation med start/callback och durable broker-state; riktade unit- och API-sviter hÃ¥ller grÃ¶nt.
- 6.2 Ã¥terverifierad 2026-03-27: `SessionRevision`, trustnivÃ¥er, fresh step-up, device trust, challenge receipts, action-specific TTL och challenge-center-routes bÃ¤r fortfarande riktig runtime i bÃ¥de authplattform och API.
- 6.3 Ã¥terverifierad 2026-03-27: review center, activity och operational work items permission-trimmas fortsatt server-side med viewer/team-scope, backoffice visibility gates och cross-team denial i riktade access-sviter.
- 6.4 Ã¥terverifierad 2026-03-27: impersonation, break-glass och access attestation hÃ¥ller fortsatt explicit approve/start/end-livscykel, TTL/expiry, watermarks, allowlists, stale-grant-detektion och policybunden supportdrift.
- 6.5 Ã¥terverifierad 2026-03-27: auth har nu faktisk mode-katalog per provider, `/v1/auth/providers/isolation`, produktionsgating nÃ¤r auth-inventory saknas, federations-callbacks per mode och explicit testidentitetsseparation mellan non-production och production.

**Delfasstatus**
- 13.1 klar 2026-03-28: HUS-lifecycle Ã¤r nu hÃ¤rdad med weekend-justerad submission-deadline, per-kÃ¶pare Ã¥rskapacitet och ROT-cap, lÃ¥sta claim fields efter draft, official-capable `xml`/`direct_api` transportprofiler, blockerad authority decision pÃ¥ draft claim och blockerad payout tills partial-acceptance-differens Ã¤r lÃ¶st, verifierat i nya phase 13-unit/API-sviter samt gamla HUS-regressioner.
- 13.1 Ã¥terhÃ¤rdad 2026-03-29: accepterade och delvis accepterade HUS-claims materialiserar nu canonical ledgerjournaler via `HUS_CLAIM_ACCEPTED`/`HUS_CLAIM_PARTIALLY_ACCEPTED`, recovery gÃ¥r via `HUS_RECOVERY_CONFIRMED`, och bÃ¥de beslut och recoveries bÃ¤r journalEntryId + pinned HUS-rulepackmetadata i runtime/API.
- 13.2 klar 2026-03-28: regulated submissions ligger nu i ett verkligt canonical package med first-class `SubmissionAttempt`- och `SubmissionEvidencePack`-objekt, canonical envelope-ref pÃ¥ submissiondetaljer, bakÃ¥tkompatibel shim i integrationslagret, egen API-lÃ¤sning fÃ¶r attempts och verifiering via nya phase 13.2-unit/API-sviter, phase 12-submission-regressioner samt full svit.

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

**MÃƒÂ¥l**  
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
- 1.1 Ã¥terverifierad 2026-03-27: alla migrationer sjÃ¤lvregistrerar nu exakt ett canonical `migration_id` som matchar filnamnet, och bÃ¥de Node- och PowerShell-validering failar pÃ¥ saknad, dubbel eller felaktig migrationsregistrering.
- 1.2 Ã¥terverifierad 2026-03-27: API, worker, desktop-web, field-mobile, dev-start och standardplattform vÃ¤ljer nu explicit runtime mode; starter-fallback till tyst `test`-mode Ã¤r borttagen frÃ¥n bootvÃ¤garna och smoke/runtime-mode-sviten Ã¤r grÃ¶n.
- 1.3 Ã¥terverifierad 2026-03-27: implicit `test_default_demo`-boot Ã¤r borttagen frÃ¥n API-plattformen; demo-fixturer tillÃ¥ts nu bara via explicit `bootstrapScenarioCode`, och alla berÃ¶rda e2e-, integrations- och enhetstester anvÃ¤nder namngiven explicit demo-testplattform i stÃ¤llet fÃ¶r dold autoseed.
- 1.4 Ã¥terverifierad 2026-03-27: startupdiagnostik och protected-boot-gater Ã¤r nu Ã¤rliga om persistent truth; API och worker blockar fortsatt skyddade starter med blockerande invariants, och critical-domain snapshots auto-provisioneras inte lÃ¤ngre till dold temp-sqlite utan krÃ¤ver explicit store-konfiguration.
- 1.5 Ã¥terverifierad 2026-03-27: runtime honesty scanner kÃ¶rs nu som explicit fasgate i CLI och runbook, och verifierar bÃ¥de resident demo-data i protected runtime, Map-baserad sanning, stub-providers, simulerade receipts och fÃ¶rbjudna routefamiljer innan protected boot fÃ¥r fortsÃ¤tta.

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

**MÃƒÂ¥l**  
Flytta affÃ¤rssanningen frÃ¥n processminne till hÃ¥llbar persistence med idempotent command-logg, outbox, job attempts och replay/dead-letter.

**Beroenden**  
- 1

**FÃ¥r kÃ¶ras parallellt med**  
- Event/outbox och job-attempt-lager kan byggas parallellt.
- DomÃ¤nvis repository-migrering kan ske i vÃ¥gor efter att gemensamma primitives Ã¤r klara.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen regulated submission, payroll eller tax-account-kedja fÃ¥r byggas vidare pÃ¥ in-memory truth.

**Delfasstatus**  
- 2.1 Ã¥terverifierad 2026-03-27: canonical repositories bÃ¤r nu explicit optimistic concurrency, transaktionsbunden rollback Ã¶ver flera repositorygrÃ¤nser, bounded-context-scope utan nyckelkollisioner och verifierad Postgres-konfigurationskedja fÃ¶r durable repository store.
- 2.2 Ã¥terverifierad 2026-03-27: command receipt, outbox och inbox ligger fortsatt i samma commit, duplicate suppression hÃ¥lls pÃ¥ idempotency-nivÃ¥ och mutationruntime bÃ¤r bounded-context repository bundles utan att fÃ¶rlora rollback-garantin.
- 2.3 Ã¥terverifierad 2026-03-27: job runtime bÃ¤r explicit attemptlivscykel, retry policy, dead-letter och replay-planer; claim expiry fÃ¶re start skapar syntetisk attempthistorik och poison-pill-loopar stÃ¤ngs i dead-letter i stÃ¤llet fÃ¶r att fÃ¶rsvinna tyst.
- 2.4 Ã¥terverifierad 2026-03-27: kritiska domÃ¤ner kan rehydreras frÃ¥n durable snapshots, sqlite-backed critical truth bootar nu korrekt Ã¤ven utan explicit state-filpath, runtime diagnostics slÃ¤pper inte igenom Map-only truth fÃ¶rrÃ¤n durability inventory visar verklig snapshot-backed persistence, och plattformen exponerar nu per-domÃ¤n durability inventory som fasgate.
- 2.4 Ã¥terhÃ¤rdad 2026-03-29: kritisk domÃ¤npersistence rullar nu tillbaka in-memory mutation till fÃ¶regÃ¥ende durable snapshot om state-save fallerar, sÃ¥ split-brain mellan processminne och critical-domain store inte lÃ¤mnas kvar efter misslyckad persist.
- 2.5 Ã¥terverifierad 2026-03-27: projection rebuild bevarar source of truth och icke-mÃ¥lade projektioner, targeted full rebuild purgar bara rÃ¤tt projectionsdokument och failed rebuild lÃ¤mnar truth orÃ¶rd tills lyckad retry rensar checkpoint-felet.

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

**MÃƒÂ¥l**  
GÃ¶ra audit och driftbevis fÃ¶rstaklassiga samt sÃ¤kra att systemet kan Ã¶vervakas, Ã¥terstÃ¤llas och opereras utan manuell databasmedicin.

**Beroenden**  
- 2

**FÃ¥r kÃ¶ras parallellt med**  
- Observability och evidence pack kan byggas parallellt.
- Secret rotation och restore drills kan fÃ¶rberedas parallellt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen live providercredential eller signeringsnyckel fÃ¥r anvÃ¤ndas innan secret governance Ã¤r aktiv.

**Delfasstatus**  
- 3.1 Ã¥terverifierad 2026-03-27: canonical audit envelope Ã¤r fortsatt gemensam writer-form fÃ¶r auth, review, search, documents, activity, notifications, id06 och kvarvarande legacy-audit-writers, med verifierad integrity hash, audit-envelope-version, correlation-id, canonical `recordedAt`, deterministisk voucherkoppling och DSAM/Aâ€“Z-ledgergrunder som fortsatt grÃ¶n under riktad 3.1-svit.
- 3.2 Ã¥terverifierad 2026-03-27: evidence-pack-kraven i bibeln Ã¤r nu mappade punkt fÃ¶r punkt till faktisk kod, runbook och exit gate; annual reporting, regulated submissions, support, break-glass, cutover och project exports anvÃ¤nder central frozen evidence-bundle-kedja med checksum, supersession och arkivering av tidigare bundle.
- 3.3 Ã¥terverifierad 2026-03-27: full observability Ã¤r nu mappad punkt fÃ¶r punkt till faktisk kod, alarms, drilldown och exit gate; provider health, projection lag, queue age, invariant alarms, structured logs och trace chains exponeras i samma company-scoped payload och hÃ¥ller under riktad runtime- och API-svit.
- 3.4 Ã¥terverifierad 2026-03-27: restore drills bÃ¤r fortsatt verklig livscykel (`scheduled -> running -> passed|failed`) med explicit coverage fÃ¶r `database_restore`, `projection_rebuild` och `worker_restart`; riktad 3.4-svit samt resilience- och migration-cockpit-tester bekrÃ¤ftar restore-plan-koppling, chaos-signaler och rollbackdisciplin.
- 3.5 Ã¥terverifierad 2026-03-27: secrets, callback-hemligheter och certifikatkedjor Ã¤r fortsatt formaliserade som egna runtime-objekt med mode-bunden vaultvalidering, rotationsposter, dual-running-overlap, certifikatsfÃ¶rnyelsefÃ¶nster och observability-sammanfattning; riktad 3.5-svit bekrÃ¤ftar att rotation och certifikatsummering hÃ¥ller.

**Delfaser**
- [x] 3.1 [HARDEN] **Canonical audit envelope** â€” Alla commands, provider calls, approvals, impersonations, submissions och replay-Ã¥tgÃ¤rder ska skriva samma auditform.
- [x] 3.2 [NEW BUILD] **Bygg evidence-packs** â€” Submissions, annual packages, cutover, support cases, break-glass och project evidence ska kunna paketeras, hash-as och arkiveras.
- [x] 3.3 [NEW BUILD] **Full observability** â€” Metrics, tracing, structured logs, invariant alarms, queue age alarms, provider health och projection lag ska vara synliga.
- [x] 3.4 [OPERATIONALIZE] **Restore drills och chaos** â€” Ã…terstÃ¤llning av databas, projection rebuild och worker restart ska Ã¶vas och dokumenteras.
- [x] 3.5 [HARDEN] **Secrets, certifikat och rotationsregler** â€” Separata vaults per mode, certifikatkedjor, callback-hemligheter och nyckelrotation ska vara formaliserade.

**Exit gate**  
- Audit explorer, evidence packs och Ã¥terstÃ¤llningsrutiner fungerar i testad drift. Secrets Ã¤r isolerade per mode och provider.

**Fasstatus**  
- Klar 2026-03-27 genom Ã¥terverifierad canonical audit envelope inklusive id06, central frozen evidence-bundle-kedja, full observability-payload, restore drill/chaos-coverage och mode-isolerad secret/certificate-runtime.

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

**MÃƒÂ¥l**  
Standardisera alla externa och interna kontrakt, bryta upp blandade route-filer och infÃ¶ra server-side permission resolution med action classes.

**Beroenden**  
- 2
- 3

**FÃ¥r kÃ¶ras parallellt med**  
- Envelope-/errorkontrakt och route-split kan kÃ¶ras parallellt efter gemensam standard Ã¤r satt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen ny routefamilj eller extern adapter fÃ¥r byggas pÃ¥ gamla blandade phase13/phase14-rutter.

**Delfasstatus**  
- 4.1 Ã¥terverifierad 2026-03-27: standard request/success/error envelopes Ã¤r nu bevisade mot bibelns fulla kontrakt Ã¶ver API, public API, partner API och webhook-ytor; feature-flag-block och 404 fallback gÃ¥r via canonical error envelopes i stÃ¤llet fÃ¶r success-path, och full svit plus riktade envelope-/webhook-/partner-/public-API-tester hÃ¥ller grÃ¶nt.
- 4.2 Ã¥terverifierad 2026-03-27: action classes, trust levels, scope types och expected object version Ã¤r fortsatt publicerade i route-contract registry fÃ¶r hela muterande route-ytan, och denial semantics Ã¤r Ã¥terbevisade bÃ¥de i route metadata och i riktade access-/desktop-only-/permission-sviter.
- 4.3 Ã¥terverifierad 2026-03-27: `phase14-routes.mjs` Ã¤r fortsatt ren orchestration plus hjÃ¤lpfunktioner medan tax-account, balances, fiscal-year, review, resilience, migration och collective-agreements ligger i egna routekataloger; `phase13-routes.mjs` delegerar endast till public-, partner-, job- och automation-kataloger och bÃ¤r inte lÃ¤ngre egna duplicerade routeblock.
- 4.4 Ã¥terverifierad 2026-03-27: regulated submissions ligger fortsatt separerat frÃ¥n generella integrationsytan i `packages/domain-integrations/src/regulated-submissions.mjs`; `index.mjs` delegerar bara till modulen och riktade phase 12-API- och e2e-sviter bekrÃ¤ftar att envelope/attempt/receipt/replay/recovery-kedjan Ã¤r verklig runtime.
- 4.5 Ã¥terverifierad 2026-03-27: contract-minimum-sviten fÃ¶r fiscal-year, tax-account, balances och collective-agreements Ã¤r fortsatt grÃ¶n med canonical success envelopes, permission denials, conflict semantics och idempotency-bevis; route metadata och surface-access-sviter visar att denial- och contract-gaten fortfarande hÃ¥ller.

**Delfaser**
- [x] 4.1 [NEW BUILD] **Standard request/success/error envelopes** â€” Alla routes, public API, partner API och webhooks anvÃ¤nder samma envelopeform, correlation-id, idempotency key och classification.
- [x] 4.2 [HARDEN] **Action classes och permission resolution** â€” Varje muterande route mÃ¤rks med required action class, trust level, scope type och expected object version. Route-contract registry tÃ¤cker nu hela POST/PUT/PATCH/DELETE-ytan och `authz/check` kan resolva public, self och company-scoped routes.
- [x] 4.3 [REWRITE] **Dela upp `phase13-routes.mjs` och `phase14-routes.mjs`** â€” Skapa routekatalog per domÃ¤n/funktion: auth, public API, partner API, backoffice, migration, annual reporting, resilience, projects, submissions.
- [x] 4.4 [NEW BUILD] **Etablera hard boundary fÃ¶r regulated submissions** â€” Transport, attempts, receipts och recovery separeras frÃ¥n generella integrationskopplingar. Antingen nytt package eller tydligt submodule med egna APIs.
- [x] 4.5 [OPERATIONALIZE] **Contract-test miniminivÃ¥** â€” Alla routefamiljer fÃ¥r golden envelopes, denial reasons, conflict semantics och idempotency-tests.

**Exit gate**  
- Blandade phase-rutter Ã¤r borta frÃ¥n bindande ytan. Alla routes och externa payloads fÃ¶ljer canonical envelopes, idempotens och permission resolution.

**Fasstatus**  
- Klar 2026-03-27 genom Ã¥terbevisade canonical envelopes och permission contracts, verklig routekatalog-split, hard boundary fÃ¶r regulated submissions och explicit contract-minimum-svit fÃ¶r de extraherade routefamiljerna inklusive idempotenshÃ¤rdning dÃ¤r den saknades.

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

**MÃƒÂ¥l**  
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
- 5.1 klar 2026-03-27: central rulepack-registry styr nu accounting-method, fiscal-year, legal-form obligations, HUS och tax-account med effective-dated resolution i stÃ¤llet fÃ¶r hÃ¥rdkodade versionsstrÃ¤ngar; annual context bÃ¤r nu pinned rulepack refs, dedikerad 5.1-svit bevisar date-cutover Ã¶ver flera domÃ¤ner och `docs/runbooks/rulepack-publication.md` finns nu som operativ publiceringsrunbook.
- 5.2 klar 2026-03-27: central provider baseline-registry styr nu BankID RP API, Peppol BIS Billing, payment link API, open banking, bankfilformat, SRU, authority audit exports och iXBRL-format genom effective-dated baselines med checksum och rollbackstÃ¶d; auth-, integrations-, partner- och annual-reporting-runtime bÃ¤r nu pinned provider baseline refs, dedikerad 5.2-svit samt AR-, annual- och partner-sviter bevisar resolutionen och `docs/runbooks/provider-baseline-update.md` finns nu som operativ publiceringsrunbook.
- 5.3 klar 2026-03-27: annual packages, tax declaration packages, regulated submissions, AGI submissions, payroll postings, payout batches och ledger reversal/correction-kedjor bÃ¤r nu historiskt pinnade `rulepackRefs`, `providerBaselineRefs` och `decisionSnapshotRefs`; `/v1/submissions` slÃ¤pper igenom pinningdata utan att tappa den i API-lagret, corrections och retries Ã¤rver samma refs deterministiskt och dedikerad 5.3-svit samt annual-, payroll- och submission-API-sviter bevisar att refs Ã¶verlever dispatch, evidence packs, retry, correction, payout match och ledger-omkastningar.
- 5.4 klar 2026-03-27: annual change calendar kÃ¶r nu som verklig ops-kedja med source snapshots, diff review, sandbox verification, dual approvals, staged publish, publish-blockering fÃ¶re `stagedPublishAt`, rollback och egna `/v1/ops/rule-governance/changes*`-rutter; dedikerad 5.4 unit/integration-svit samt `docs/runbooks/regulatory-change-calendar.md` bevisar processen.
- 5.5 klar 2026-03-27: payroll blockerar nu fri `manual_rate` utan explicit reason code, SINK krÃ¤ver dokumenterad beslutsreferens, arbetsgivaravgiftens `no_contribution`-specialfall kommer frÃ¥n rulepack-data i stÃ¤llet fÃ¶r hÃ¥rdkodad Ã¥rtalsbranch, partner-baselines lÃ¶ses via central baseline selection-manifest + provider registry i stÃ¤llet fÃ¶r ad hoc switchar och pensionsrapporternas providerpolicy ligger i central policy-manifest; dedikerad 5.5 unit/integration-svit samt Ã¥terkÃ¶rda payroll-, partner-, pension- och document-flow-sviter bevisar att specialfallen inte lÃ¤ngre lever som fria brancher.

**Fasstatus**  
- Klar 2026-03-27 genom central rulepack-registry, provider baseline-registry, historisk pinning, annual change calendar och bortstÃ¤dade regulatoriska specialfall i payroll-, partner- och providerpolicylagret.

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

**MÃƒÂ¥l**  
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
- [x] 6.4 [NEW BUILD] **Impersonation, break-glass och access attestation** â€” Klar: impersonation och break-glass har nu explicit approve/start/end-livscykel, TTL/expiry, watermark-payloads, allowlistbunden aktivering, kvartalsvis access-review-fÃ¶nster, stale-grant-detektion och runbooks fÃ¶r support- och incidentdrift. Ã…terverifierad 2026-03-27.
- [x] 6.5 [OPERATIONALIZE] **Sandbox/prod isolation fÃ¶r identitet** â€” Klar: auth har nu mode-katalog per provider, `/v1/auth/providers/isolation`, produktionsgating nÃ¤r auth-inventory saknas, federations-callbacks per mode och explicit testidentitetsseparation mellan non-production och production. Ã…terverifierad 2026-03-27.

**Exit gate**  
- BankID/passkeys/TOTP fungerar, enterprise federation kan anslutas via broker, backoffice-write krÃ¤ver korrekt approvals och step-up, och permissions Ã¤r server-side enforced.

**Delfasstatus**
- 6.1 Ã¥terverifierad 2026-03-27
- 6.2 Ã¥terverifierad 2026-03-27
- 6.3 Ã¥terverifierad 2026-03-27
- 6.4 Ã¥terverifierad 2026-03-27
- 6.5 Ã¥terverifierad 2026-03-27
- 6.x Ã¥terhÃ¤rdad 2026-03-29: login-start har nu pending-session-rate-limit och unresolved-identifier-lockout, TOTP och passkey har faktorbaserad invalid-attempt-lockout med session-revokering, BankID collect och federation callback har broker-challenge-lockout med session-revokering, TOTP-hemligheter Ã¤r flyttade frÃ¥n rÃ¥ `authFactors` till sealed durable secret envelopes, och BankID/WorkOS broker-hemligheter exporteras nu som sealed durable envelopes i stÃ¤llet fÃ¶r rÃ¥ challenge-tokens; verifierat i nya phase 6 unit/API-sviter och runbook `docs/runbooks/auth-rate-limit-and-lockout.md`.

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

## [x] Fas 7 â€” Tenant bootstrap, modulaktivering och trial/testkonto-system

**MÃƒÂ¥l**  
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
- [x] 7.4 [NEW BUILD] **Seed scenarios, reset och refresh** â€” Klar: canonical seed-katalog med Ã¥tta scenarier finns nu, legacy-alias mappas deterministiskt, refresh-pack kan fylla pÃ¥ processdata utan att rÃ¶ra masterdata, reset revokerar Ã¶vriga Ã¶ppna trial-sessioner, arkiverar process-state metadata och fryser evidence-bundles fÃ¶r reset/refresh innan scenariot reseedas.
- [x] 7.5 [MIGRATE] **Bygg upgrade trial->live** â€” Klar: promotion bygger nu `PromotionValidationReport` och `PortableDataBundle`, krÃ¤ver explicit approval coverage, fÃ¶der ny live-company via separat onboarding/bootstrap-path, kopierar endast portable masterdata/settings/importbatches och blockerar direktcarry av trial ledger, receipts, provider refs, submissions och evidence.

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

**MÃƒÂ¥l**  
Bygga den svenska bokfÃ¶ringskÃ¤rnan som resten av systemet vilar pÃ¥: legal form, periodkalender, posting recipes, voucher series, locks och correction/reopen.

**Beroenden**  
- 7

**FÃ¥r kÃ¶ras parallellt med**  
- Legal form/accounting method/fiscal year kan fÃ¤rdigstÃ¤llas parallellt med chart/voucher series.
- Close-readiness kan fÃ¶rberedas parallellt efter posting engine.

**FÃ¥r inte kÃ¶ras parallellt med**  
- AR/AP/VAT/payroll/posting fÃ¥r inte Ã¶ppnas innan ledger/posting recipe-engine Ã¤r canonical.

**Delfaser**
- [x] 8.1 [HARDEN] **Legal form profiles och reporting obligations** â€” Klar: legal-form-motorn validerar nu signatory/filing/declaration-profiler per bolagsform, partnerships med Ã¥rsredovisningsplikt fÃ¥r egen filing-profile, declaration-resolution fÃ¶ljer godkÃ¤nd reporting obligation i stÃ¤llet fÃ¶r legal-form-default och nya annual obligations kan supersedera tidigare godkÃ¤nda profiler utan att Ã¶ppna dubbla drafts.
- [x] 8.2 [HARDEN] **Accounting method och fiscal year** â€” Klar: accounting-method-profiler och change requests krÃ¤ver nu explicit fiscal-year-boundary utanfÃ¶r onboarding, Ã¤ldre Ã¶ppna requests fÃ¶r samma boundary supersederas deterministiskt och fiscal-year-change-requests krÃ¤ver group-alignment-referenser nÃ¤r profil eller reason code krÃ¤ver det, samtidigt som duplicerade Ã¶ppna intervall blockeras eller ersÃ¤tts kontrollerat via resubmission med permission-underlag.
- [x] 8.3 [NEW BUILD] **Voucher series, chart governance och dimensionsdisciplin** â€” Klar: ledger-kÃ¤rnan har nu versionsstyrda konto- och voucher-series-profiler, styrd dimensionskatalog med service lines, journalstÃ¤mpling av account/voucher/dimension-versioner och blockerar nu bÃ¥de repurpose av anvÃ¤nda serier och kontoklassÃ¤ndringar efter faktisk anvÃ¤ndning.
- [x] 8.4 [HARDEN] **Posting recipe engine** â€” Klar: ledger har nu en central posting-intent/posting-recipe-motor med explicita recipe codes, journaltyper, source object version och signalbinding, samtidigt som AR/AP/payroll inte lÃ¤ngre fÃ¥r skapa/validera/posta journaler direkt utan gÃ¥r via samma recipe-kedja som binder metadata och voucher-purpose deterministiskt.
- [x] 8.5 [OPERATIONALIZE] **Close, reopen, reversal och correction engine** â€” Klar: close-kÃ¤rnan bÃ¤r nu strukturerade reopen requests med impact analysis, objektbaserade close adjustments som postar verklig reversal/correction replacement i ledger och separat relock-steg som Ã¥terlÃ¥ser perioden till `soft_locked` innan ny signoff.

**Delfasstatus**
- 8.1 klar 2026-03-28: legal-form- och annual-obligation-kedjan stoppar nu ogiltiga Bolagsverket-/Ã¥rsredovisningskombinationer, declaration-profile anvÃ¤nder den godkÃ¤nda reporting obligationens filing profile och revised annual obligations supersederar tidigare approved versioner deterministiskt; unit- och API-sviter samt fullsvit Ã¤r Ã¥tergrÃ¶nade.
- 8.2 klar 2026-03-28: accounting-method-kedjan krÃ¤ver nu explicit fiscal-year-boundary fÃ¶r profiler och change requests utanfÃ¶r onboarding, Ã¤ldre Ã¶ppna method requests supersederas deterministiskt pÃ¥ samma boundary och fiscal-year-change-requests krÃ¤ver group-alignment-referenser dÃ¤r profil eller reason code krÃ¤ver det, samtidigt som duplicerade Ã¶ppna intervall antingen blockeras eller ersÃ¤tts kontrollerat via resubmission med permission-underlag; unit-, API- och fullsvit Ã¤r Ã¥tergrÃ¶nade.
- 8.3 klar 2026-03-28: ledger governance bygger nu versionsstyrda konto- och voucher-series-profiler, styrd dimensionskatalog inklusive service lines och journalstÃ¤mpling av account/voucher/dimension-versioner; nya runtime- och API-sviter bevisar required-dimension-gates, att anvÃ¤nda serier inte kan repurposas och att anvÃ¤nda konton inte kan byta kontoklass, och fullsviten Ã¤r Ã¥tergrÃ¶nad.
- 8.3 Ã¥terhÃ¤rdad 2026-03-29: DSAM-kontoplanens kontoklass hÃ¤rleds nu deterministiskt frÃ¥n BAS-kontonumret i stÃ¤llet fÃ¶r att lita pÃ¥ seedad rÃ¥klass, vilket korrigerar 6000-serien till klass 6 och 7000-serien till klass 7 utan att Ã¶ppna fÃ¶r manuell omklassning efter anvÃ¤ndning.
- 8.4 klar 2026-03-28: posting recipe-engine finns nu som central ledger-motor med registry fÃ¶r AR/AP/payroll/bank/tax-account/HUS/year-end, tvingar explicit source object version, binder postingRecipeCode/journalType/postingSignalCode i journalmetadata och downstream-domÃ¤nerna AR/AP/payroll gÃ¥r nu via `applyPostingIntent` i stÃ¤llet fÃ¶r direkta `createJournalEntry`/`validateJournalEntry`/`postJournalEntry`-kedjor; nya unit- och API-asserts bevisar metadata och fullsviten Ã¤r Ã¥tergrÃ¶nad.
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

## [x] Fas 9 â€” AR, AP, VAT, banking, tax account och document-posting gates

**MÃƒÂ¥l**  
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
- 9.1/9.2/9.3 Ã¥terhÃ¤rdad 2026-03-29: AR issue och AP supplier invoices krÃ¤ver nu persisted line-level `vatDecisionId` i stÃ¤llet fÃ¶r lokal VAT-berÃ¤kning eller `vatDecisionId: null`; domestic supplier-charged purchases materialiserar first-class momsbeslut med box 48/input VAT, AP credit notes speglar originalets momsbeslut via `original_vat_decision_id` och AR receivables/overpayments Ã¤r omverifierade mot korrekt gross/VAT-belopp.
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

## [x] Fas 10 â€” Documents, OCR, classification, import cases och review center

**MÃƒÂ¥l**  
GÃ¶ra document-to-decision-kedjan verklig: originaldokument, OCR, klassificering, import cases, review queues och evidence-hashar.

**Beroenden**  
- 9

**FÃ¥r kÃ¶ras parallellt med**  
- OCR-adapter och classification pipeline kan byggas parallellt.
- Review center och import-case mapping kan byggas parallellt.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Inget OCR- eller classificationsfÃ¶rslag fÃ¥r leda till posting, payroll eller filing utan reviewgrÃ¤ns dÃ¤r required.

**Delfasstatus**
- 10.1 klar 2026-03-28: dokumentkedjan bÃ¤r nu explicit `retentionClassCode`, `sourceFingerprint`, `checksumAlgorithm`, `checksumSha256`, `originalDocumentVersionId`, `latestDocumentVersionId` och `evidenceRefs`, med canonical migrationsregistrering och lÃ¤srutter fÃ¶r dokument- och versionskedjan.
- 10.2 klar 2026-03-28: OCR-stubben Ã¤r nu ersatt med Google Document AI-baserad adapterkedja med explicita profiler, provider-baselines, sync-vs-async processing mode, page limits, operation refs, callback-route, rerun-supersede, provider confidence/quality och blockerande low-confidence review i stÃ¤llet fÃ¶r falsk lokal textract-stub.
- 10.3 klar 2026-03-28: classification/extraction-pipelinen materialiserar nu canonical `ExtractionProjection`-objekt med `extractionFamilyCode`, `candidateObjectType`, `documentRoleCode`, `targetDomainCode`, `normalizedFieldsJson`, `attachmentRefs` och `payloadHash`, auto-deriverar AP-, travel-, benefits-, payroll- och attachmentkandidater frÃ¥n OCR-fÃ¤lt nÃ¤r line inputs saknas och blockerar person- eller finance-kÃ¤nsliga dokument frÃ¥n att glida vidare utan korrekt review- och downstream-gating.
- 10.4 klar 2026-03-28: import cases bÃ¤r nu explicita blocker codes fÃ¶r saknade huvudunderlag, tullbevis, komponenter, import-VAT, upstream-klassificering och Ã¶ppna correction requests, materialiserar correction request-objekt med mÃ¤nsklig approve/reject-kedja och replacement-case-korrigering, och applicerar downstream-mappning replay-sÃ¤kert via idempotent `appliedCommandKey` + payload hash; nya API-rutter, lagringsmigrering och `docs/runbooks/import-case-review.md` verifierar kedjan.
- 10.5 klar 2026-03-28: review center exponerar nu full operativ livscykel via API med `claim`, `start`, `request-more-input`, `reassign`, `decide` och `close`, samtidigt som queue ownership, SLA-scan, first/recurring breach-escalation och auditkedja verifieras i unit-, API-, route-metadata- och backoffice-sviter; `docs/runbooks/review-center-operations.md` beskriver nu den faktiska operativa kedjan.

**Delfaser**
- [x] 10.1 [HARDEN] **Originaldokument och versionskedja** â€” Original, hash, checksum, source fingerprint, retention class och evidence refs.
- [x] 10.2 [REPLACE] **Byt OCR-stub mot riktig provider** â€” Google Document AI eller vald baseline-adapter med confidence, rerun, page limits, async callback och low-confidence review.
- [x] 10.3 [HARDEN] **Classification/extraction pipeline** â€” Canonical extraction model fÃ¶r AP, AR, payroll underlag, benefits/travel och attachments.
- [x] 10.4 [HARDEN] **Import cases och blocker codes** â€” Completeness, blocking reasons, correction requests, human decisions och replay-safe mapping till downstream domain.
- [x] 10.5 [OPERATIONALIZE] **Review center queues/SLA/escalation** â€” Riskklass, queue ownership, SLA, claim/start/reassign/decide/close och audit.

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

## [x] Fas 11 â€” HR, time, balances, collective agreements och migration intake

**MÃƒÂ¥l**  
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

**Delfasstatus**
- 11.1 klar 2026-03-28: HR/employment Ã¤r nu hÃ¤rdad med effektiva placement- och salary-basis-objekt, overlap-blockers fÃ¶r placements/contracts/manager assignments, completeness-signaler i employment snapshot och nya HR-rutter fÃ¶r governed placement/salary basis samt cutover-runbook.
- 11.2 klar 2026-03-28: Time/absence/balances Ã¤r nu hÃ¤rdade med governed `ApprovedTimeSet`, lÃ¥sning av approved payroll-input per period, AGI-kÃ¤nsliga leave-boundaries, `AbsenceDecision` i admin- och portalflÃ¶den, time-base-kontrakt fÃ¶r active approved set och uppdaterade verifieringsrunbooks.
- 11.3 klar 2026-03-28: Collective agreements Ã¤r nu hÃ¤rdade med centralt publicerat avtalsbibliotek, supportstyrd intake, intern extraktions- och reviewkedja, publicerad dropdown-selektion, governed agreement assignment via publicerade katalogposter, lokala supplements med approval och uppdaterade intake-/activation-runbooks.
- 11.4 klar 2026-03-28: Payroll-adjacent history import Ã¤r nu utbyggd med employee master snapshots, employment history, YTD, AGI carry-forward, benefit/travel history, explicit evidence mapping, frozen history evidence bundle, live-gating pÃ¥ saknad evidence coverage och ny verifieringsrunbook fÃ¶r pilot cutover.

**Delfaser**
- [x] 11.1 [HARDEN] **HR/employment source of truth** â€” Employee, employment, organization placement, salary basis, cost center, service line och effective dating.
- [x] 11.2 [HARDEN] **Time, absence och balances** â€” Approved time inputs, absence types, carryovers, leave locks och AGI-sensitive absence boundaries.
- [x] 11.3 [HARDEN] **Collective agreement catalog och engine** â€” Centralt publicerat avtalsbibliotek, supportstyrd intake av nya avtal, intern AI-assisterad extraktion med mÃ¤nsklig payroll/compliance-approval, publicerad dropdown-selektion, agreement assignment, effective dates, pay item derivation, rate tables, lokala supplements och override governance.
- [x] 11.4 [MIGRATE] **Payroll-adjacent history import** â€” Employee master, employment history, YTD, balances, AGI history, benefits/travel history och evidence mapping.
- [x] 11.5 [NEW BUILD] **Payroll input snapshots** â€” LÃ¥s input fingerprints och snapshot objects som pay run senare konsumerar.

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

## [x] Fas 12 â€” Payroll, AGI, benefits, travel, pension, salary exchange och Kronofogden

**MÃƒÂ¥l**  
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
- [x] 12.1 [REPLACE] **Byt `manual_rate` som standard** â€” InfÃ¶r `TaxDecisionSnapshot` med tabell, jÃ¤mkning, engÃ¥ngsskatt, SINK och emergency manual endast med dual review.
- [x] 12.2 [HARDEN] **Employer contributions och vÃ¤xa-stÃ¶d** â€” Implementera Ã¥lderslogik, reducerade nivÃ¥er, blandade component-split och vÃ¤xa-stÃ¶d via skattekonto/decision snapshots.
- [x] 12.3 [HARDEN] **Pay run engine och AGI constituents** â€” Fingerprints, ordering, posting intents, payment batch, immutable AGI version, changed-employee flags.
- [x] 12.4 [HARDEN] **Benefits, net deductions, travel, mileage** â€” Skatteklassificering, nettolÃ¶neavdrag, traktamente, milersÃ¤ttning, expense split och review codes.
- [x] 12.5 [HARDEN] **Pension och salary exchange** â€” Policy, effective dating, pension basis, special payroll tax, provider export instruction.
- [x] 12.6 [NEW BUILD] **Kronofogden/lÃ¶neutmÃ¤tning** â€” Decision snapshots, fÃ¶rbehÃ¥llsbelopp, protected amount, remittance liability, payment order och audit chain.
- [x] 12.7 [OPERATIONALIZE] **Payroll trial guards** â€” Trial mode fÃ¥r producera hela pay-run/AGI-kedjan men endast mot non-live receipts, non-live bank rails och watermarked evidence.

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

## [x] Fas 13 â€” HUS, regulated submissions, receipts/recovery, declarations och annual reporting

**MÃƒÂ¥l**  
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

**Delfasstatus**
- 13.1 klar 2026-03-28: HUS-lifecycle Ã¤r nu hÃ¤rdad med weekend-justerad submission-deadline, per-kÃ¶pare Ã¥rskapacitet och ROT-cap, lÃ¥sta claim fields efter draft, official-capable `xml`/`direct_api` transportprofiler, blockerad authority decision pÃ¥ draft claim och blockerad payout tills partial-acceptance-differens Ã¤r lÃ¶st, verifierat i nya phase 13-unit/API-sviter samt gamla HUS-regressioner.
- 13.1 Ã¥terhÃ¤rdad 2026-03-29: accepterade och delvis accepterade HUS-claims materialiserar nu canonical ledgerjournaler via `HUS_CLAIM_ACCEPTED`/`HUS_CLAIM_PARTIALLY_ACCEPTED`, recovery gÃ¥r via `HUS_RECOVERY_CONFIRMED`, och bÃ¥de beslut och recoveries bÃ¤r journalEntryId + pinned HUS-rulepackmetadata i runtime/API.
- 13.2 klar 2026-03-28: regulated submissions ligger nu i ett verkligt canonical package med first-class `SubmissionAttempt`- och `SubmissionEvidencePack`-objekt, canonical envelope-ref pÃ¥ submissiondetaljer, bakÃ¥tkompatibel shim i integrationslagret, egen API-lÃ¤sning fÃ¶r attempts och verifiering via nya phase 13.2-unit/API-sviter, phase 12-submission-regressioner samt full svit.
- 13.3 klar 2026-03-28: canonical regulated submissions vÃ¤ljer nu faktisk transportadapter per AGI/VAT/HUS/annual submission med pinned channel/fallback-plan i stÃ¤llet fÃ¶r fri `simulatedTransportOutcome` i live path; worker och API accepterar bara scenariostyrning i icke-live, production/pilot gÃ¥r via explicit official fallback med `contact_provider`-queue, attempts/evidence bÃ¤r adapter- och fallbackmetadata och queued transportjobb lÃ¤mnar inte lÃ¤ngre submissionen falskt i `queued` efter genomfÃ¶rd dispatch.
- 13.4 klar 2026-03-28: annual reporting och declarations Ã¤r nu lÃ¥sta mot verklig signoff-hash och locked version, tax declaration packages bÃ¤r legal-form/reporting profile och signatory metadata, submission-dispatch blockerar unsigned eller stale annual payloads och nya runbooks tÃ¤cker annual filing correction utan att skriva Ã¶ver historik.
- 13.5 klar 2026-03-28: regulated submissions bÃ¤r nu first-class recovery- och reconciliation-spÃ¥r utÃ¶ver receipts/attempts, material reject Ã¶ppnar recovery och blockerar replay till correction-only path, technical reject/transport fail skapar replay-safe recovery, evidence packs bÃ¤r recovery refs + reconciliation summary och API exponerar recovery/reconciliation/resolve fÃ¶r operatorflÃ¶det.
- 13.6 klar 2026-03-28: trial mode anvÃ¤nder nu en riktig deterministic regulated simulator i stÃ¤llet fÃ¶r ad hoc fake-parametrar, med auto-materialiserade non-live receipts fÃ¶r AGI/VAT/HUS/annual, explicit `legalEffect=false`, `TRIAL`-watermark pÃ¥ attempts/receipts/evidence/reconciliation, blockerade manuella trial-overrides och ny verifieringsrunbook fÃ¶r trial-regulated flows.

**Delfaser**
- [x] 13.1 [HARDEN] **HUS/ROT/RUT lifecycle** â€” Verified payment, locked fields, buyer allocation, deadlines, XML/direct transport, decisions, partial acceptance, recovery.
- [x] 13.2 [NEW BUILD] **Submission envelope/attempt/receipt core** â€” Canonical objects fÃ¶r envelope, attempt, receipt, correction link, action queue item, evidence pack.
- [x] 13.3 [REPLACE] **Byt simulerad transport mot riktiga adapters** â€” AGI, Moms, HUS och annual filing anvÃ¤nder riktiga transportsÃ¤tt eller explicita official fallbacks med samma canonical payload.
- [x] 13.4 [HARDEN] **Annual package, declarations och signoff** â€” Locked report snapshots, package hash, legal form profile, signatory chain, SRU/iXBRL/official API handling.
- [x] 13.5 [HARDEN] **Receipt, replay, dead-letter och recovery** â€” Technical vs material receipt, idempotent replay, correction-only new payload, operator interventions och reconciliation rules.
- [x] 13.6 [NEW BUILD] **Trial-safe regulated simulators** â€” Trial mode fÃ¥r only-simulate official transport med deterministic fake receipts, explicit `legalEffect=false` och audit watermarks.

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

## [x] Fas 14 â€” Generell project core, CRM-linked commercial chain, profitability, portfolio, field och vertikala packs

**MÃƒÂ¥l**  
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

- 14.1 klar 2026-03-28: general project-commercial core har nu verkliga `engagements`, `work-models`, `work-packages`, `delivery-milestones`, `work-logs`, `revenue-plans` och `profitability-snapshots` i bÃ¥de domÃ¤nruntime och API, route contracts publicerar rÃ¤tt project-scope/action classes, workspace/evidence bundle bÃ¤r commercial-core-objekten och profitability refs, work-model-katalogen tÃ¤cker consulting/service/work-order/construction/internal-delivery-spÃ¥r och verifieras via nya phase 14.1 unit/API-sviter, route-metadata och fullsvit; se `docs/runbooks/fas-14-1-project-commercial-core-verification.md`.
- 14.2 klar 2026-03-28: accepted quote handoff bygger nu kanoniska `OpportunityLink`, `QuoteLink`, `Engagement`, `WorkModel`, godkand `RevenuePlan`, aktiv `BillingPlan` och `ProjectStatusUpdate` i projects-runtimen, workspace/evidence bundle bÃ¤r `customerContext` och handoff-objekten, project API publicerar quote-handoff- och link-plan/status-routes med starka project-scope contracts och duplicate handoff pa samma quote/version returnerar befintligt projekt i stallet for dubbelregistrering; se `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`.
- 14.3 klar 2026-03-28: project profitability bÃ¤r nu riktiga billing models for `fixed_price`, `time_and_material`, `milestone`, `retainer_capacity`, `subscription_service`, `advance_invoice` och `hybrid_change_order`, AP/HUS/approved manual adjustments matar cost- och profitability snapshots, `ProjectProfitabilityAdjustment` och `ProjectInvoiceReadinessAssessment` Ã¤r first-class runtime/API-objekt, workspace/evidence bundle publicerar dem, change orders gÃ¥r nu `draft -> priced -> approved -> applied` och applied change orders superseder commercial chain via ny approved `RevenuePlan` och active `BillingPlan`; se `docs/runbooks/fas-14-3-project-billing-profitability-verification.md`.
- 14.4 klar 2026-03-28: `ProjectCapacityReservation`, `ProjectAssignmentPlan`, `ProjectRisk` och company-wide project portfolio Ã¤r nu first-class runtime/API-objekt, workspace/evidence bundle bÃ¤r capacity/risk/portfolio-data, `status-updates` driver portfolio health, budget-vs-actual-vs-forecast materialiseras per projekt och i portfolio-summary, risk/warning-codes blockerar inte tyst och project API publicerar portfolio-, reservation-, assignment- och risk-routes med starka project-scope contracts; se `docs/runbooks/fas-14-4-resource-portfolio-risk-verification.md`.
- 14.5 klar 2026-03-28: field-packet bar nu first-class `OperationalCase`, `MaterialReservation`, `MaterialUsage`, `FieldEvidence` och `ConflictRecord` ovanpa optional `work_order`-pack, work orders lacker inte langre in som universell modell, sync-policys anvander inte `server_wins` pa reglerade eller kostnadsdrivande objekt, invoice readiness blockeras av oppna conflicts och nya operational-case-routes publicerar reservations-, evidence- och conflict-resolution-floden med egna contracts; se `docs/runbooks/fas-14-5-field-operational-pack-verification.md`.
- 14.7 klar 2026-03-28: project trial/demo-flÃ¶den Ã¤r nu first-class runtime/API med publicerad scenariokatalog, scenario-materialisering till kanoniska project-commercial-objekt, governed CRM/project-importbatcher, trial-safe invoice simulations utan legal effekt, portable live conversion plans, workspace/evidence bundle som bÃ¤r trial/import/simulation/conversion-objekt och verifieringsrunbook fÃ¶r end-to-end trial till live-promotion; se `docs/runbooks/fas-14-7-project-trial-demo-verification.md`.

**Delfaser**
- [x] 14.1 [HARDEN] **General project-commercial core** â€” Project, Engagement, WorkModel, WorkPackage, DeliveryMilestone, WorkLog, CostAllocation, RevenuePlan, ProfitabilitySnapshot, ProjectDeviation, ProjectEvidenceBundle.
- [x] 14.2 [NEW BUILD] **CRM-linked handoff** â€” Opportunity/quote-to-project conversion, change order chain, billing plan, status updates, customer context och acceptance handoff frÃ¥n CRM utan att gÃ¶ra CRM till source of truth.
- [x] 14.3 [NEW BUILD] **Billing models och WIP/profitability** â€” Fixed price, time & materials, milestone, retainer capacity, subscription service, advance invoice, hybrid change order och profitability frÃ¥n payroll/AP/material/travel/HUS/billing.
- [x] 14.4 [NEW BUILD] **Resource, portfolio och riskstyrning** â€” Capacity reservations, assignment planning, skills/roles, project portfolio, risk register, status updates, budget vs actual vs forecast.
- [x] 14.5 [HARDEN] **Field/service/work-order pack** - OperationalCase, DispatchAssignment, MaterialUsage, FieldEvidence, SignatureRecord, SyncEnvelope, ConflictRecord. Work orders ska vara optional pack.
- [x] 14.6 [HARDEN] **Personalliggare, ID06 och egenkontroll packs** â€” Attendance som separat sanning, ID06 identity graph, workplace bindings, checklist/signoff, construction pack som vertikal overlay.
- [x] 14.7 [NEW BUILD] **Project trial/demo flows och migration** â€” Seed project scenarios, import from CRM/project tools, client-ready demo data, safe invoicing simulation och eventual live conversion path.

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

## [x] Fas 15 â€” Reporting, search, object profiles, saved views, notifications, activity och work items

**MÃƒÂ¥l**  
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
- [x] 15.1 [HARDEN] **Reporting snapshots och metrics** â€” Trial balance, P&L, balance sheet, cashflow, open items, payroll reports, project portfolio, tax account summary och submission dashboards.
- [x] 15.2 [HARDEN] **Search, object profiles och workbenches** â€” Permission-trimmade object profiles, blockers, sections, actions, workbench composition och saved views.
- [x] 15.3 [HARDEN] **Notifications och activity som egna familjer** â€” Recipient, channel, digest, snooze, escalation och append-only activity feeds.
- [x] 15.4 [HARDEN] **Work items, queues och ownership** â€” Queue grants, SLA, escalation, assignment, dual-control blockers och operator views.
- [x] 15.5 [NEW BUILD] **Project/finance/compliance mission control** - Portfolio dashboards, close blockers, payroll submission monitoring, cutover dashboards, trial conversion dashboard.

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

## [x] Fas 16 â€” Integrationsplattform, public API, partner API, webhooks och prioriterade provideradapters

**MÃƒÂ¥l**  
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

**Delfasstatus**
- 16.1 klar 2026-03-29: integrationslagret bÃ¤r nu first-class `IntegrationConnection`, `CredentialSetMetadata`, `ConsentGrant` och `IntegrationHealthCheck`; capability manifests exponerar explicit `modeMatrix`, `allowedEnvironmentModes`, fallback/rate-limit-policy och provider environment refs; legacy partner creation backfillar canonical control-plane metadata; `/v1/integrations/capability-manifests` och `/v1/integrations/connections*` Ã¤r verkliga runtime-ytor och credential-reuse Ã¶ver `trial`/`sandbox`/`test`/`pilot_parallel`/`production` blockeras deterministiskt, verifierat i nya phase 16.1 unit/API-sviter, route-metadata-svit och full verifiering.
- 16.2 klar 2026-03-29: public API-specen Ã¤r nu explicit versionslÃ¥st med `supportedVersions`, `currentVersion`, `canonicalApiVersion`, `scopeCatalog`, endpoint-katalog och webhook-event-katalog; compatibility baselines validerar version, bÃ¤r `specHash` och `endpointCount`; sandbox-katalogen Ã¤r uttryckligen watermarked/non-legal-effect med client-credentials-kontrakt, report snapshot-exempel, tax-account summary-exempel och example webhook events; verifierat i nya phase 16.2 unit/API-sviter, regressionssviter fÃ¶r phase 13 och full verifiering.
- 16.2 Ã¥terhÃ¤rdad 2026-03-29: webhook subscription-signing secrets ligger nu i sealed secret envelopes med `secretRef` och preview endast i subscription-state; integrationssnapshot och durable export innehÃ¥ller inte lÃ¤ngre rÃ¥ webhook secrets, men import/restore behÃ¥ller signerad delivery-kedja och bakÃ¥tkompatibel legacy-migrering.
- 16.3 klar 2026-03-29: partneradapters bÃ¤r nu first-class contract-test-pack-katalog, lÃ¤sbar adapter health history och health summary, connection-aware async jobs/dead letters samt produktionsspÃ¤rr som krÃ¤ver grÃ¶naste senaste contract test innan live-dispatch; `/v1/partners/contract-test-packs`, `/v1/partners/connections/:connectionId/health-checks`, `/v1/partners/connections/:connectionId/health-summary` och `/v1/jobs/dead-letters` Ã¤r verkliga runtime-ytor, verifierat i nya phase 16.3 unit/API-sviter, Ã¤ldre phase 13 partnerregressioner och full verifiering.

**Delfaser**
- [x] 16.1 [HARDEN] **Integration core, credentials och consent** â€” Capability manifest, credential metadata, consent grant, health checks, rate limits, fallback modes, environment isolation.
- [x] 16.2 [HARDEN] **Public API och sandbox catalog** â€” Client credentials, scope catalog, versioned spec, sandbox catalog, report snapshots, tax account summary, example webhook events.
- [x] 16.3 [HARDEN] **Partner API, contract tests och adapter health** â€” Connection catalog, operation dispatch, async jobs, retry/dead-letter/replay, contract-test packs per adapter.
- [x] 16.4 [REPLACE] **Byt simulerade finance-adapters mot verkliga** â€” Enable Banking, bankfil/ISO20022, Stripe, Pagero, Google Document AI, Postmark, Twilio, Pleo, official tax transports.
- 16.4 klar 2026-03-29: wave-1 provider runtime Ã¤r nu first-class i integrationsmotorn med riktiga providerfiler fÃ¶r Stripe, Pagero, Postmark, Twilio, Pleo, Enable Banking, ISO20022 och official tax/annual transports; AR-flÃ¶den anvÃ¤nder inte lÃ¤ngre `internal_mock`, kontrollplanet exponerar nya capability-manifests och generiska integration connections, och verifieringsrunbook fÃ¶r 16.4 finns pÃ¥ plats.
- [x] 16.5 [HARDEN] **Auth/signing/federation adapters** â€” Signicat, WorkOS, passkey/TOTP, signing/evidence archive.
- 16.5 klar 2026-03-29: Signicat BankID, WorkOS federation, lokala passkey/TOTP och Signicat-baserad signing/evidence-archive Ã¤r nu first-class capability manifests i kontrollplanet; async callback-health krÃ¤ver callback domain/path dÃ¤r det behÃ¶vs, credentialless local factors fungerar utan falska secret-krav, och bÃ¥de regulated submissions och annual reporting bÃ¤r nu riktiga signature archive refs i evidence/runtime. Verifieringsrunbook finns i `docs/runbooks/phase16-auth-signing-adapters-verification.md`.
- [x] 16.6 [NEW BUILD] **CRM/project ecosystem adapters i rÃ¤tt ordning** â€” HubSpot fÃ¶rst, Teamleader sedan, monday/Asana/ClickUp import/sync dÃ¤refter, Zoho och Odoo som project-billing-kÃ¤llor, Dynamics senare enterprise-spÃ¥r.
- 16.6 klar 2026-03-29: `crm_handoff` har nu first-class adapters fÃ¶r HubSpot, Teamleader Focus, monday work management, Asana, ClickUp, Zoho CRM/Projects/Billing, Odoo Projects Billing och Dynamics 365 Project Operations, alla med capability manifests, governed import-batches, provider baselines, snapshot/restore, verifieringsrunbooks och grÃ¶na unit/API/full-gates utan att gÃ¶ra upstream-systemen till invoice truth.
- [x] 16.7 [NEW BUILD] **Trial-safe adapter layer** â€” Alla adapters mÃ¥ste ha `trial_safe`, `sandbox_supported`, `supportsLegalEffect` och receipt-mode sÃ¥ att trial aldrig kan skapa live-ekonomi eller live-filings.
- 16.7 klar 2026-03-29: adapterlagret bÃ¤r nu explicit `receiptModePolicy`, resolved connection `receiptMode` och miljÃ¶sÃ¤krad `supportsLegalEffect` fÃ¶r bÃ¥de direct och partner adapters; trial-health krÃ¤ver `trial_receipt_mode`, icke trial-sÃ¤kra adapters blockeras frÃ¥n trial-connection creation och trial kan inte lÃ¤ngre rÃ¥ka skapa provider receipts med legal effekt trots gemensam runtime/bootstrap.

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

## [x] Fas 17 â€” Operations, backoffice, support, migration, cutover, parallel run och trial/live drift

**MÃƒÂ¥l**  
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
- [x] 17.1 [HARDEN] **Support case, incident, replay och dead-letter ops** â€” Support scopes, masked data views, replay planning, dead-letter triage, incident commander flows, submission monitoring.
- 17.1 klar 2026-03-29: backoffice bÃ¤r nu first-class `ReplayOperation` ovanpÃ¥ async replay-planer, dead-letter- och submission-monitor-rader lÃ¤nkar tillbaka till replayoperationen, support case- och incidentvyer Ã¤r maskade som default i API-svaren och verifieringsrunbook finns i `docs/runbooks/support-case-and-replay.md`; delfasen Ã¤r grÃ¶n i nya phase 17.1-unit/API-sviter samt full gate.
- [x] 17.2 [HARDEN] **Backoffice-grÃ¤nser och evidence** â€” Klar 2026-03-29: support case-, impersonation- och break-glass-sessioner har nu first-class audit-export via API, impersonation bygger egen frozen evidence bundle med watermark/allowlist/approval-kedja, masked backoffice-vyer ligger kvar som default read-model, och driftstÃ¶d finns i uppdaterade support- och break-glass-runbooks. Verifierat via phase 3.2-, phase 14-security-, phase 14-security-api- och route-metadata-sviter samt full gate.
- [x] 17.3 [HARDEN] **Migration cockpit och acceptance** â€” Klar 2026-03-29: migration cockpit bÃ¤r nu first-class acceptance-evidence-export via `/v1/migration/acceptance-records/:migrationAcceptanceRecordId/evidence`, `CutoverEvidenceBundle` returnerar canonical `migrationAcceptanceRecordId` och `acceptanceType`, och driftstÃ¶d finns i nya `docs/runbooks/migration-cutover.md`. Verifierat via phase 14 migration unit/API/e2e, route-metadata och full gate.
- [x] 17.4 [OPERATIONALIZE] **Parallel run och diff motor** â€” Klar 2026-03-29: migration core bÃ¤r nu canonical `ParallelRunResult` med threshold-motor, manual acceptance, acceptance-blockers och cockpit/mission-control-board fÃ¶r finance, payroll, HUS, personalliggare och project profitability. DriftstÃ¶d finns i nya `docs/runbooks/parallel-run-and-diff.md`. Verifierat via phase 14 migration unit/API/e2e, mission-control, route-metadata och full gate.
- [x] 17.5 [NEW BUILD] **Trial/live operations split** â€” Klar 2026-03-29: tenant-control bÃ¤r nu canonical `trialSupportPolicy`, `trialOperationsSnapshot`, queuevyer, alerts, promotion workflows, sales/demo analytics och explicit reset-rights. API ytor finns pÃ¥ `/v1/trial/support-policy`, `/v1/trial/operations`, `/v1/trial/operations/alerts`, `/v1/trial/operations/queues`, `/v1/trial/promotions/workflows` och `/v1/trial/analytics`, och mission control-dashen `trial_conversion` visar nu operationssammanfattning och analytics. DriftstÃ¶d finns i nya `docs/runbooks/trial-live-operations.md`. Verifierat via phase 17 unit/API, phase 15 mission-control, route-metadata, phase 1 tenant setup och full gate.
- [x] 17.6 [NEW BUILD] **Market-winning cutover concierge** â€” Klar 2026-03-29: migration core bÃ¤r nu first-class concierge ovanpÃ¥ cutover-planen med canonical `sourceExtractChecklist`, rehearsal-logg, automated variance report, linked rollback drill och frozen signoff evidence. API ytor finns pÃ¥ `/v1/migration/cutover-plans/:cutoverPlanId/concierge`, `/source-extract-checklist/:itemCode`, `/rehearsals`, `/variance-report`, `/rollback-drill` och `/signoff-evidence`; cockpit och mission control visar nu concierge stage, extractstatus, variance- och rollbackdrillstatus. DriftstÃ¶d finns i nya `docs/runbooks/migration-cutover-concierge.md`. Verifierat via phase 17.6 unit/API/e2e, phase 14 migration unit/API/e2e, phase 15 mission-control, route-metadata och full gate.

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

## [x] Fas 18 â€” Pilot, enterprise gate, competitor parity, competitor advantage och UI-readiness

**MÃƒÂ¥l**  
Bevisa att backend-kontrakten bÃ¤r verkliga kundscenarier, lÃ¥sa UI-kontrakt och Ã¶ppna go-live fÃ¶rst efter parity, advantage och enterprise-gater Ã¤r passerade.

**Beroenden**  
- 17

**FÃ¥r kÃ¶ras parallellt med**  
- Olika pilotkohorter kan kÃ¶ras parallellt nÃ¤r respektive domÃ¤ngater Ã¤r grÃ¶na.

**FÃ¥r inte kÃ¶ras parallellt med**  
- Ingen generell lansering fÃ¶re godkÃ¤nd pilot, enterprise gate och competitor parity gate. UI-start fÃ¥r inte ske innan backend-kontrakt Ã¤r frozen.

**Delfaser**
- [x] 18.1 [OPERATIONALIZE] **Intern dogfood + finance pilot** â€” KÃ¶r eget bolag/egna testbolag genom finance, VAT, payroll, HUS, tax account, annual och supportflÃ¶den. Klar 2026-03-29: `PilotExecution` runtime, scenario gating, rollback preparedness, approvals, evidence export, trial/parallel-run linkage, API-routes och unit/integration/e2e-verifiering.
- [x] 18.2 [OPERATIONALIZE] **Pilotkohorter per segment** â€” AB med ekonomi+lÃ¶n, service/projektbolag, HUS-bolag, construction/service med personalliggare/ID06, enterprise SSO-kund. Klar 2026-03-29: `PilotCohort` runtime, segmentkrav per scenario, cohort acceptance/reject-gates, evidence export, API-routes samt unit/integration/e2e-verifiering fÃ¶r service/projekt och construction/ID06.
- [x] 18.3 [NEW BUILD] **Competitor parity board** â€” MÃ¤t svart pÃ¥ vitt parity mot Fortnox, Visma, Bokio, Wint, Teamleader, monday, Asana, ClickUp, Zoho, Odoo, Bygglet, Byggdagboken. Klar 2026-03-29: `ParityScorecard` runtime, benchmarkkatalog per konkurrentkategori, koppling till accepterade pilotkohorter, evidence export samt unit/integration/e2e-verifiering fÃ¶r finance-, project- och field-parity.
- [x] 18.4 [NEW BUILD] **Competitor advantage release pack** â€” SlÃ¤pp differentiators: tax account cockpit, unified receipts/recovery, migration concierge, safe trial-to-live, project profitability mission control. Klar 2026-03-29: `AdvantageReleaseBundle` runtime, create/list/read/evidence-routes, strikt move-matris fÃ¶r exakt fem differentiators, blocked/released-summary mot grÃ¶n parity i finance/project/field samt unit/integration/e2e-verifiering av missing parity, full green release och evidence export.
- [x] 18.5 [HARDEN] **UI readiness contract freeze** â€” LÃ¥s object profiles, workbenches, commands, blockers, list/read/detail/action contracts och permission reasons fÃ¶r desktop/backoffice/field. Klar 2026-03-29: `UiContractFreezeRecord` runtime, released-advantage-gate, hashad contract snapshot frÃ¥n verkliga object profile/workbench/read/action-kÃ¤llor, explicit permission-reason-katalog, create/list/read/evidence-routes samt unit/integration/e2e-verifiering och metadata-runbook.
- [x] 18.6 [OPERATIONALIZE] **Final go-live gate** â€” Release checklist: technical, regulated, support, migration, security, parity, advantage, trial-sales readiness. Klar 2026-03-29: `GoLiveGateRecord` runtime, create/list/read/evidence-routes, fem-segments pilotcoverage, green parity/advantage/UI-freeze gating, explicit eight-category release checklist, blocked-vs-approved GA decision och unit/integration/e2e-verifiering samt GA-runbook.

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

### VÃƒÂ¥ra bindande winning moves
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
