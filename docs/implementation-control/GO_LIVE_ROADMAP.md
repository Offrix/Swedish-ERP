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

**Mål**  
Göra de två nya dokumenten till enda sanning, döda felaktiga antaganden och låsa produktkategori, providerstrategi och projektkärnans riktning innan någon mer feature-kod byggs.

**Beroenden**  
- Ingen

**Får köras parallellt med**  
- Dokumentstädning och traceability-matris kan köras samtidigt som kodinventering av seeds/stubbar.

**Får inte köras parallellt med**  
- Ingen implementation i reglerade flöden, auth, projects eller UI får starta innan denna fas är signerad.

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

## [ ] Fas 1 — Runtime-ärlighet, bootstrap-hygien och migrationssanning

**Mål**  
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
- [ ] 1.5 [NEW BUILD] **Bygg runtime honesty scanner** — Scanner ska hitta Map-baserad sanning, stub-provider, simulerade receipts, demo-data i production mode och otillåtna route-familjer.

**Exit gate**  
- API och worker startar deterministiskt per miljöläge, migrationer är rena och inga kritiska domäner kan råka boota med demo-läge i production eller pilot.

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

## [ ] Fas 2 — Durable persistence, outbox, jobs, attempts, replay och dead-letter

**Mål**  
Flytta affärssanningen från processminne till hållbar persistence med idempotent command-logg, outbox, job attempts och replay/dead-letter.

**Beroenden**  
- 1

**Får köras parallellt med**  
- Event/outbox och job-attempt-lager kan byggas parallellt.
- Domänvis repository-migrering kan ske i vågor efter att gemensamma primitives är klara.

**Får inte köras parallellt med**  
- Ingen regulated submission, payroll eller tax-account-kedja får byggas vidare på in-memory truth.

**Delfaser**
- [ ] 2.1 [NEW BUILD] **Inför canonical repositories** — Varje bounded context får repositorygränssnitt med Postgres-implementation och transaktionsbunden optimistic concurrency.
- [ ] 2.2 [NEW BUILD] **Inför command log + outbox/inbox** — Alla muterande commands ska skriva command receipt, expected version, actor, session revision och outbox-event i samma commit.
- [ ] 2.3 [HARDEN] **Hårdna job-runtime** — `packages/domain-core/src/jobs.mjs` och `apps/worker/src/worker.mjs` ska bära attempts, retry policy, dead-letter, replay plan och poison-pill-detektion.
- [ ] 2.4 [MIGRATE] **Migrera kritiska domäner bort från Map-sanning** — Org auth, ledger, VAT, AR, AP, payroll, tax-account, review-center, projects och submissions får inte längre ha produktionskritisk state enbart i Map.
- [ ] 2.5 [NEW BUILD] **Inför projections re-build** — Read models ska kunna raderas och byggas om från event/outbox utan att source-of-truth tappar historik.

**Exit gate**  
- Kritiska affärsobjekt är persistenta, replaybara och versionsstyrda. Jobs kan återupptas efter processdöd. Dead-letter och replay är operatörsstyrda, inte ad hoc-scripts.

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

## [ ] Fas 3 — Audit, evidence, observability, restore drills och secret governance

**Mål**  
Göra audit och driftbevis förstaklassiga samt säkra att systemet kan övervakas, återställas och opereras utan manuell databasmedicin.

**Beroenden**  
- 2

**Får köras parallellt med**  
- Observability och evidence pack kan byggas parallellt.
- Secret rotation och restore drills kan förberedas parallellt.

**Får inte köras parallellt med**  
- Ingen live providercredential eller signeringsnyckel får användas innan secret governance är aktiv.

**Delfaser**
- [ ] 3.1 [HARDEN] **Canonical audit envelope** — Alla commands, provider calls, approvals, impersonations, submissions och replay-åtgärder ska skriva samma auditform.
- [ ] 3.2 [NEW BUILD] **Bygg evidence-packs** — Submissions, annual packages, cutover, support cases, break-glass och project evidence ska kunna paketeras, hash-as och arkiveras.
- [ ] 3.3 [NEW BUILD] **Full observability** — Metrics, tracing, structured logs, invariant alarms, queue age alarms, provider health och projection lag ska vara synliga.
- [ ] 3.4 [OPERATIONALIZE] **Restore drills och chaos** — Återställning av databas, projection rebuild och worker restart ska övas och dokumenteras.
- [ ] 3.5 [HARDEN] **Secrets, certifikat och rotationsregler** — Separata vaults per mode, certifikatkedjor, callback-hemligheter och nyckelrotation ska vara formaliserade.

**Exit gate**  
- Audit explorer, evidence packs och återställningsrutiner fungerar i testad drift. Secrets är isolerade per mode och provider.

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

## [ ] Fas 4 — Canonical envelopes, error contracts, idempotens, permission resolution och route-dekomposition

**Mål**  
Standardisera alla externa och interna kontrakt, bryta upp blandade route-filer och införa server-side permission resolution med action classes.

**Beroenden**  
- 2
- 3

**Får köras parallellt med**  
- Envelope-/errorkontrakt och route-split kan köras parallellt efter gemensam standard är satt.

**Får inte köras parallellt med**  
- Ingen ny routefamilj eller extern adapter får byggas på gamla blandade phase13/phase14-rutter.

**Delfaser**
- [ ] 4.1 [NEW BUILD] **Standard request/success/error envelopes** — Alla routes, public API, partner API och webhooks använder samma envelopeform, correlation-id, idempotency key och classification.
- [ ] 4.2 [HARDEN] **Action classes och permission resolution** — Varje muterande route märks med required action class, trust level, scope type och expected object version.
- [ ] 4.3 [REWRITE] **Dela upp `phase13-routes.mjs` och `phase14-routes.mjs`** — Skapa routekatalog per domän/funktion: auth, public API, partner API, backoffice, migration, annual reporting, resilience, projects, submissions.
- [ ] 4.4 [NEW BUILD] **Etablera hard boundary för regulated submissions** — Transport, attempts, receipts och recovery separeras från generella integrationskopplingar. Antingen nytt package eller tydligt submodule med egna APIs.
- [ ] 4.5 [OPERATIONALIZE] **Contract-test miniminivå** — Alla routefamiljer får golden envelopes, denial reasons, conflict semantics och idempotency-tests.

**Exit gate**  
- Blandade phase-rutter är borta från bindande ytan. Alla routes och externa payloads följer canonical envelopes, idempotens och permission resolution.

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

## [ ] Fas 5 — Rulepack-registry, effective dating, historical pinning och provider baseline registry

**Mål**  
Göra all reglerad logik, baseline-versionering och providerspecifika format spårbara, effektiverade och historiskt pinade.

**Beroenden**  
- 4

**Får köras parallellt med**  
- Rulepack registry och provider baseline registry kan byggas parallellt.
- Baseline publication workflow kan starta innan alla domäner migrerat sina regler.

**Får inte köras parallellt med**  
- Ingen regulatorisk kod får fortsätta bädda in årsändringar eller providerformat direkt i affärskod.

**Delfaser**
- [ ] 5.1 [NEW BUILD] **Rulepack registry** — Inför versionerade rulepacks för VAT, payroll tax, employer contributions, benefits, mileage, HUS, tax account classification och legal form obligations.
- [ ] 5.2 [NEW BUILD] **Provider baseline registry** — Versionera XML-scheman, API-versioner, SRU-format, iXBRL/checksums, BankID, Peppol och bankfilformat med effectiveFrom/effectiveTo/checksum.
- [ ] 5.3 [HARDEN] **Historical pinning** — Varje beslut, journal, submission och annual package ska peka på rulepack-version och baseline-version som användes.
- [ ] 5.4 [OPERATIONALIZE] **Annual change calendar** — Inför process för regeluppdateringar, diff-review, sandbox-verifiering, staged publish och rollback.
- [ ] 5.5 [REMOVE/DEPRECATE] **Stoppa hårdkodade regulatoriska specialfall** — Ta bort fri `manual_rate`-logik som standard, hårdkodade SINK/avgiftsbrancher utan snapshot och ad hoc provider-switchar.

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

## [ ] Fas 6 — Auth, identity, session trust, device trust och backoffice-boundaries

**Mål**  
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
- [ ] 6.1 [REPLACE] **Byt BankID-stub mot auth broker** — Implementera auth broker med Signicat-baserad BankID-provider i v1, passkeys/TOTP lokalt och WorkOS eller likvärdig broker för enterprise federation.
- [ ] 6.2 [NEW BUILD] **Session trust och challenge center** — Inför `SessionRevision`, trustnivåer, fresh step-up, device trust, challenge completion receipts och action-specific TTL.
- [ ] 6.3 [HARDEN] **Scope, queue och visibility enforcement** — Search, notifications, activity, review/work ownership och API responses ska permission-trimmas server-side.
- [ ] 6.4 [NEW BUILD] **Impersonation, break-glass och access attestation** — Implementera tidsbegränsade, vattenmärkta sessions, dual approvals, allowlists och kvartalsvisa access reviews.
- [ ] 6.5 [OPERATIONALIZE] **Sandbox/prod isolation för identitet** — Separata credentials, callback-domäner, webhook-hemligheter och testidentiteter per mode.

**Exit gate**  
- BankID/passkeys/TOTP fungerar, enterprise federation kan anslutas via broker, backoffice-write kräver korrekt approvals och step-up, och permissions är server-side enforced.

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

## [ ] Fas 7 — Tenant bootstrap, modulaktivering och trial/testkonto-system

**Mål**  
Skapa en separat källa för tenant bootstrap, module activation, finance readiness och trial/live-livscykel så att onboarding, demo, pilot och go-live blir säkra.

**Beroenden**  
- 5
- 6

**Får köras parallellt med**  
- Trial foundation och standard bootstrap kan byggas parallellt efter att canonical objects är satta.

**Får inte köras parallellt med**  
- Ingen säljbar trial eller kundonboarding får lanseras innan trial-isolering och upgrade-regler finns.

**Delfaser**
- [ ] 7.1 [NEW BUILD] **Inför `domain-tenant-control`** — Nytt package äger `TenantBootstrap`, `CompanySetupProfile`, `ModuleActivationProfile`, `GoLivePlan`, `TrialEnvironmentProfile`, `ParallelRunPlan`, `PromotionPlan`.
- [ ] 7.2 [HARDEN] **Bygg finance-ready bootstrap** — Legal form, accounting method, fiscal year, chart template, VAT profile, reporting obligation profile, role template och queue structure ska skapas i korrekt ordning.
- [ ] 7.3 [NEW BUILD] **Bygg trial/testkonto-isolering** — Trial tenants får eget mode, vattenmärkning, fake/sandbox providers, blocked live credentials och skydd mot verkliga ekonomiska konsekvenser.
- [ ] 7.4 [NEW BUILD] **Seed scenarios, reset och refresh** — Bygg deterministiska seed-scenarier per bolagstyp och reset/refresh utan att blanda trial-data med live-data.
- [ ] 7.5 [MIGRATE] **Bygg upgrade trial->live** — Promotion skapar ny live tenant/company profile från godkänd masterdata; trial ledger, receipts, provider refs och submissions får aldrig flyttas rakt in i live.

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

## [ ] Fas 8 — Legal form, accounting method, fiscal year, ledger, posting recipes och close-kärna

**Mål**  
Bygga den svenska bokföringskärnan som resten av systemet vilar på: legal form, periodkalender, posting recipes, voucher series, locks och correction/reopen.

**Beroenden**  
- 7

**Får köras parallellt med**  
- Legal form/accounting method/fiscal year kan färdigställas parallellt med chart/voucher series.
- Close-readiness kan förberedas parallellt efter posting engine.

**Får inte köras parallellt med**  
- AR/AP/VAT/payroll/posting får inte öppnas innan ledger/posting recipe-engine är canonical.

**Delfaser**
- [ ] 8.1 [HARDEN] **Legal form profiles och reporting obligations** — Aktiebolag, ekonomisk förening, enskild firma, handels-/kommanditbolag med effective-dated obligations och signatory classes.
- [ ] 8.2 [HARDEN] **Accounting method och fiscal year** — Kontant/faktureringsmetod, brutet räkenskapsår, periodstater, lås, reopen-request och årsskiftesskydd.
- [ ] 8.3 [NEW BUILD] **Voucher series, chart governance och dimensionsdisciplin** — Serier, dimensionsset, cost centers, service lines och project dimensions ska vara låsta och versionsstyrda.
- [ ] 8.4 [HARDEN] **Posting recipe engine** — Signal-till-bokning-matris implementeras: AR/AP/payroll/bank/tax account/HUS/year-end adjustments.
- [ ] 8.5 [OPERATIONALIZE] **Close, reopen, reversal och correction engine** — Close blockers, signoff, reopen impact analysis, reversal/correction replacement och återlåsning.

**Exit gate**  
- Ledger är enda bokföringssanning. Periodlås, reopen, correction och legal-form-profiler fungerar och är versionsstyrda.

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

## [ ] Fas 9 — AR, AP, VAT, banking, tax account och document-posting gates

**Mål**  
Knyta dokument, leverantörer, kunder, bank och skattekonto till bokföringskärnan utan att tillåta otillåtna autopostningar eller fuzzy matching.

**Beroenden**  
- 8

**Får köras parallellt med**  
- AR och AP kan byggas parallellt.
- VAT och banking kan byggas parallellt efter posting engine.
- Tax account kan byggas parallellt med banking när classification registry finns.

**Får inte köras parallellt med**  
- Ingen automatisk posting från OCR, statement import eller tax account discrepancy detection utan blockerande gates.

**Delfaser**
- [ ] 9.1 [HARDEN] **AR end-to-end** — Kundfakturor, kreditnotor, abonnemang, collection/payment links, allocations, reskontra, invoice readiness och revenue dimensions.
- [ ] 9.2 [HARDEN] **AP end-to-end** — Leverantörsfakturor, krediter, attest, matchning, payment prep och cost allocations med review gates.
- [ ] 9.3 [HARDEN] **VAT decision engine** — VAT source of truth, decision inputs/outputs, timing, lock/unlock, declaration basis och review boundaries.
- [ ] 9.4 [NEW BUILD] **Banking och payment rails** — Open banking, bankfiler, payment batches/orders, statement import, matchning, settlement liability mapping.
- [ ] 9.5 [HARDEN] **Tax account subledger** — Skattekontohändelser, import, klassificering, offset, discrepancy cases, liability match och reconciliation blockers.
- [ ] 9.6 [HARDEN] **Document-posting gates** — Inget dokument, statement eller tax event bokas förrän explicit affärsdomän har godkänt sakobjektet.

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

**Mål**  
Göra document-to-decision-kedjan verklig: originaldokument, OCR, klassificering, import cases, review queues och evidence-hashar.

**Beroenden**  
- 9

**Får köras parallellt med**  
- OCR-adapter och classification pipeline kan byggas parallellt.
- Review center och import-case mapping kan byggas parallellt.

**Får inte köras parallellt med**  
- Inget OCR- eller classificationsförslag får leda till posting, payroll eller filing utan reviewgräns där required.

**Delfaser**
- [ ] 10.1 [HARDEN] **Originaldokument och versionskedja** — Original, hash, checksum, source fingerprint, retention class och evidence refs.
- [ ] 10.2 [REPLACE] **Byt OCR-stub mot riktig provider** — Google Document AI eller vald baseline-adapter med confidence, rerun, page limits, async callback och low-confidence review.
- [ ] 10.3 [HARDEN] **Classification/extraction pipeline** — Canonical extraction model för AP, AR, payroll underlag, benefits/travel och attachments.
- [ ] 10.4 [HARDEN] **Import cases och blocker codes** — Completeness, blocking reasons, correction requests, human decisions och replay-safe mapping till downstream domain.
- [ ] 10.5 [OPERATIONALIZE] **Review center queues/SLA/escalation** — Riskklass, queue ownership, SLA, claim/start/reassign/decide/close och audit.

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

**Mål**  
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

**Delfaser**
- [ ] 11.1 [HARDEN] **HR/employment source of truth** — Employee, employment, organization placement, salary basis, cost center, service line och effective dating.
- [ ] 11.2 [HARDEN] **Time, absence och balances** — Approved time inputs, absence types, carryovers, leave locks och AGI-sensitive absence boundaries.
- [ ] 11.3 [HARDEN] **Collective agreement catalog och engine** — Centralt publicerat avtalsbibliotek, supportstyrd intake av nya avtal, intern AI-assisterad extraktion med mänsklig payroll/compliance-approval, publicerad dropdown-selektion, agreement assignment, effective dates, pay item derivation, rate tables, lokala supplements och override governance.
- [ ] 11.4 [MIGRATE] **Payroll-adjacent history import** — Employee master, employment history, YTD, balances, AGI history, benefits/travel history och evidence mapping.
- [ ] 11.5 [NEW BUILD] **Payroll input snapshots** — Lås input fingerprints och snapshot objects som pay run senare konsumerar.

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

**Mål**  
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
- [ ] 12.1 [REPLACE] **Byt `manual_rate` som standard** — Inför `TaxDecisionSnapshot` med tabell, jämkning, engångsskatt, SINK och emergency manual endast med dual review.
- [ ] 12.2 [HARDEN] **Employer contributions och växa-stöd** — Implementera ålderslogik, reducerade nivåer, blandade component-split och växa-stöd via skattekonto/decision snapshots.
- [ ] 12.3 [HARDEN] **Pay run engine och AGI constituents** — Fingerprints, ordering, posting intents, payment batch, immutable AGI version, changed-employee flags.
- [ ] 12.4 [HARDEN] **Benefits, net deductions, travel, mileage** — Skatteklassificering, nettolöneavdrag, traktamente, milersättning, expense split och review codes.
- [ ] 12.5 [HARDEN] **Pension och salary exchange** — Policy, effective dating, pension basis, special payroll tax, provider export instruction.
- [ ] 12.6 [NEW BUILD] **Kronofogden/löneutmätning** — Decision snapshots, förbehållsbelopp, protected amount, remittance liability, payment order och audit chain.
- [ ] 12.7 [OPERATIONALIZE] **Payroll trial guards** — Trial mode får producera hela pay-run/AGI-kedjan men endast mot non-live receipts, non-live bank rails och watermarked evidence.

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

**Mål**  
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

**Delfaser**
- [ ] 13.1 [HARDEN] **HUS/ROT/RUT lifecycle** — Verified payment, locked fields, buyer allocation, deadlines, XML/direct transport, decisions, partial acceptance, recovery.
- [ ] 13.2 [NEW BUILD] **Submission envelope/attempt/receipt core** — Canonical objects för envelope, attempt, receipt, correction link, action queue item, evidence pack.
- [ ] 13.3 [REPLACE] **Byt simulerad transport mot riktiga adapters** — AGI, Moms, HUS och annual filing använder riktiga transportsätt eller explicita official fallbacks med samma canonical payload.
- [ ] 13.4 [HARDEN] **Annual package, declarations och signoff** — Locked report snapshots, package hash, legal form profile, signatory chain, SRU/iXBRL/official API handling.
- [ ] 13.5 [HARDEN] **Receipt, replay, dead-letter och recovery** — Technical vs material receipt, idempotent replay, correction-only new payload, operator interventions och reconciliation rules.
- [ ] 13.6 [NEW BUILD] **Trial-safe regulated simulators** — Trial mode får only-simulate official transport med deterministic fake receipts, explicit `legalEffect=false` och audit watermarks.

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

**Mål**  
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

**Delfaser**
- [ ] 14.1 [HARDEN] **General project-commercial core** — Project, Engagement, WorkModel, WorkPackage, DeliveryMilestone, WorkLog, CostAllocation, RevenuePlan, ProfitabilitySnapshot, ProjectDeviation, ProjectEvidenceBundle.
- [ ] 14.2 [NEW BUILD] **CRM-linked handoff** — Opportunity/quote-to-project conversion, change order chain, billing plan, status updates, customer context och acceptance handoff från CRM utan att göra CRM till source of truth.
- [ ] 14.3 [NEW BUILD] **Billing models och WIP/profitability** — Fixed price, time & materials, milestone, retainer capacity, subscription service, advance invoice, hybrid change order och profitability från payroll/AP/material/travel/HUS/billing.
- [ ] 14.4 [NEW BUILD] **Resource, portfolio och riskstyrning** — Capacity reservations, assignment planning, skills/roles, project portfolio, risk register, status updates, budget vs actual vs forecast.
- [ ] 14.5 [HARDEN] **Field/service/work-order pack** — OperationalCase, DispatchAssignment, MaterialUsage, FieldEvidence, SignatureRecord, SyncEnvelope, ConflictRecord. Work orders ska vara optional pack.
- [ ] 14.6 [HARDEN] **Personalliggare, ID06 och egenkontroll packs** — Attendance som separat sanning, ID06 identity graph, workplace bindings, checklist/signoff, construction pack som vertikal overlay.
- [ ] 14.7 [NEW BUILD] **Project trial/demo flows och migration** — Seed project scenarios, import from CRM/project tools, client-ready demo data, safe invoicing simulation och eventual live conversion path.

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

**Mål**  
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
- [ ] 15.1 [HARDEN] **Reporting snapshots och metrics** — Trial balance, P&L, balance sheet, cashflow, open items, payroll reports, project portfolio, tax account summary och submission dashboards.
- [ ] 15.2 [HARDEN] **Search, object profiles och workbenches** — Permission-trimmade object profiles, blockers, sections, actions, workbench composition och saved views.
- [ ] 15.3 [HARDEN] **Notifications och activity som egna familjer** — Recipient, channel, digest, snooze, escalation och append-only activity feeds.
- [ ] 15.4 [HARDEN] **Work items, queues och ownership** — Queue grants, SLA, escalation, assignment, dual-control blockers och operator views.
- [ ] 15.5 [NEW BUILD] **Project/finance/compliance mission control** — Portfolio dashboards, close blockers, payroll submission monitoring, cutover dashboards, trial conversion dashboard.

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

**Mål**  
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

**Delfaser**
- [ ] 16.1 [HARDEN] **Integration core, credentials och consent** — Capability manifest, credential metadata, consent grant, health checks, rate limits, fallback modes, environment isolation.
- [ ] 16.2 [HARDEN] **Public API och sandbox catalog** — Client credentials, scope catalog, versioned spec, sandbox catalog, report snapshots, tax account summary, example webhook events.
- [ ] 16.3 [HARDEN] **Partner API, contract tests och adapter health** — Connection catalog, operation dispatch, async jobs, retry/dead-letter/replay, contract-test packs per adapter.
- [ ] 16.4 [REPLACE] **Byt simulerade finance-adapters mot verkliga** — Enable Banking, bankfil/ISO20022, Stripe, Pagero, Google Document AI, Postmark, Twilio, Pleo, official tax transports.
- [ ] 16.5 [HARDEN] **Auth/signing/federation adapters** — Signicat, WorkOS, passkey/TOTP, signing/evidence archive.
- [ ] 16.6 [NEW BUILD] **CRM/project ecosystem adapters i rätt ordning** — HubSpot först, Teamleader sedan, monday/Asana/ClickUp import/sync därefter, Zoho och Odoo som project-billing-källor, Dynamics senare enterprise-spår.
- [ ] 16.7 [NEW BUILD] **Trial-safe adapter layer** — Alla adapters måste ha `trial_safe`, `sandbox_supported`, `supportsLegalEffect` och receipt-mode så att trial aldrig kan skapa live-ekonomi eller live-filings.

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

**Mål**  
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
- [ ] 17.1 [HARDEN] **Support case, incident, replay och dead-letter ops** — Support scopes, masked data views, replay planning, dead-letter triage, incident commander flows, submission monitoring.
- [ ] 17.2 [HARDEN] **Backoffice-gränser och evidence** — Write-capable impersonation allowlists, break-glass, masking, session watermarks, evidence packs och export for audit.
- [ ] 17.3 [HARDEN] **Migration cockpit och acceptance** — Mapping sets, import batches, variance reports, acceptance records, cutover plans, signoff chains, rollback points.
- [ ] 17.4 [OPERATIONALIZE] **Parallel run och diff motor** — Finance, payroll, HUS, personalliggare och project profitability parallel runs med diff thresholds och manual acceptance.
- [ ] 17.5 [NEW BUILD] **Trial/live operations split** — Separata queuevyer, support policies, alerts, dashboards, reset rights, promotion workflows och sales/demo analytics.
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

**Mål**  
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

### Våra bindande winning moves
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
