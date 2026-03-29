> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# LEGACY_CODE_REMEDIATION_MAP

Status: Bindande repo-karta för gammal kod, syntetisk logik, demo-runtime och felaktiga domängränser som måste åtgärdas före implementation av allt utom UI.

Supersession notice: Detta dokument är fortsatt användbart som legacy-input, men det är inte primär sanning om det krockar med `GO_LIVE_ROADMAP.md` eller `PHASE_IMPLEMENTATION_BIBLE.md`.

## Icke-förhandlingsbara regler

1. Kod som kan ge falsk produktmognad i drift får inte ligga kvar i default-runtime.
2. Demo-seeding, in-memory-runtime och syntetiska adapterresultat får bara finnas i test- och fixture-scope.
3. Reglerade flöden får inte använda stubbar, auto-success eller syntetiska receipts.
4. Om en gammal kodyta ersätts ska ersättningen vara kopplad till ett tydligt bounded context, tydliga API-kontrakt och tydlig replay/audit-modell.
5. All legacy-remediation ska landa innan UI påbörjas; UI får inte byggas mot felaktiga eller otydliga kontrakt.

## Remediation map

### LRM-001

- Current code area: Runtime jobs
- Current file/package/path: `packages/domain-core/src/jobs.mjs`
- Current status: Aktivt använd i runtime
- Problem in old code or old logic: Modulen importerar Postgres-job-store eager via `jobs-store-postgres.mjs` redan vid modul-load. Det gör att worker/bootstrap kan fallera trots att minnesstore är vald och blandar adapterberoende med core-kontrakt.
- Keep / Harden / Replace / Delete: Replace
- Why: Async job core måste kunna laddas utan valfri adapter, annars är runtime- och testuppdelningen falsk.
- Target bounded context: `domain-core` för canonical async jobs, separat `adapter-postgres-jobs`
- Target runtime/API/read-model change: Inför `AsyncJobStore`-interface, lazy adapter resolution och explicit `createJobStore({ kind })`. Flytta Postgres-specifikt beroende till adaptermodul.
- Migration notes: Behåll existerande job-id, idempotency-key, attempt-chain och replay-plan. Inga datamigreringar av payload behövs, bara adapterseparation.
- Test impact: Lägg till loader-test för memory utan Postgres, adapter contract tests och runtime boot tests.
- Build-step dependency: Blockerar persistent jobs, replay, webhook delivery engine och provider adapters.
- Risk if left in place: Worker kan dö vid bootstrap, och testmiljön maskerar verkliga driftfel.

### LRM-002

- Current code area: Postgres job adapter
- Current file/package/path: `packages/domain-core/src/jobs-store-postgres.mjs`
- Current status: Aktiv men oinkapslad adapter
- Problem in old code or old logic: Adapter kodar in biblioteket `postgres` direkt utan tydlig dependency boundary, tydlig health model eller adapter-level metrics/exporter.
- Keep / Harden / Replace / Delete: Harden
- Why: Postgres-adaptern behövs, men får inte vara implicit eller sakna contract tests.
- Target bounded context: `adapter-postgres-jobs`
- Target runtime/API/read-model change: Exponera `connect()`, `health()`, `claimBatch()`, `scheduleRetry()`, `deadLetter()`, `planReplay()` och `executeReplay()` som adapter-kontrakt. Lägg till explicit dependency error om drivrutin saknas.
- Migration notes: Lägg till migrations för låst lease-token, worker heartbeat och dead-letter metadata om de saknas.
- Test impact: Contract tests mot riktig Postgres, lease expiry tests, concurrent claim tests.
- Build-step dependency: Krävs innan regulated submission transport och partner operations blir verkliga.
- Risk if left in place: Job-store blir driftsvag och svår att återställa vid incident.

### LRM-003

- Current code area: Worker runtime
- Current file/package/path: `apps/worker/src/worker.mjs`
- Current status: Aktiv men demomässig
- Problem in old code or old logic: Default-handlern är i praktiken bara `system.noop`. Verkliga jobb för OCR, webhook-delivery, provider operations, regulated submissions, replay och dead-letter-restoration saknas.
- Keep / Harden / Replace / Delete: Replace
- Why: En worker som bara kan no-op är inte en driftkomponent utan en demo-loop.
- Target bounded context: `runtime-worker`
- Target runtime/API/read-model change: Bygg typed handler registry per bounded context: `ocr.process`, `webhook.deliver`, `partner.operation.dispatch`, `submission.transport`, `submission.collectReceipt`, `search.reindex`, `projection.rebuild`, `deadLetter.repair`.
- Migration notes: Job-type-koder ska vara stabila och bakåtkompatibla. Inga gamla `system.noop`-jobb får finnas i produktion.
- Test impact: End-to-end tests för claim, success, retry, dead-letter, replay och worker restart.
- Build-step dependency: Blockerar alla asynkrona integrationer och regulated transports.
- Risk if left in place: Plattformen ser implementerad ut men kan inte driva verkliga jobb.

### LRM-004

- Current code area: Worker defaults
- Current file/package/path: `apps/worker/.env.example`, `apps/worker/README.md`
- Current status: Demoorienterad
- Problem in old code or old logic: Defaultläge pekar mot memory-store och beskriver in-memory som normal körning.
- Keep / Harden / Replace / Delete: Replace
- Why: Memory default gör att lokala tester och pilotmiljöer driver mot fel arkitektur.
- Target bounded context: Runtime/bootstrap
- Target runtime/API/read-model change: Alla icke-testmiljöer ska kräva persistent store, explicit database DSN och explicit queue health checks.
- Migration notes: Inför environment profile `test`, `dev-persistent`, `staging`, `prod`; `memory` tillåts endast i unit/integration tests.
- Test impact: Bootstrap matrix tests per environment profile.
- Build-step dependency: Krävs före pilot readiness.
- Risk if left in place: Dolda skillnader mellan test och drift.

### LRM-005

- Current code area: Public API webhook engine
- Current file/package/path: `packages/domain-integrations/src/public-api.mjs`
- Current status: Aktiv men syntetisk
- Problem in old code or old logic: Webhook-deliveries markeras som `sent` vid event emission utan verkligt HTTP-anrop, utan signering, utan response-klassificering och utan retry/dead-letter-kedja.
- Keep / Harden / Replace / Delete: Replace
- Why: Webhooks utan verklig leveranslogik ger falska receipts och förstör replay/audit.
- Target bounded context: `domain-integrations` transport-lager + `runtime-worker`
- Target runtime/API/read-model change: Flytta delivery till asynkron delivery-queue med signed payloads, TLS validation, timeout policy, retry policy, suppression policy, dead-letter och replay-from-sequence.
- Migration notes: Behåll `subscriptionId`, `eventId`, `deliveryId`; lägg till `attemptNo`, `responseCode`, `responseClass`, `nextRetryAt`, `deadLetterReason`.
- Test impact: Contract tests med mock HTTP endpoint, signature verification tests, retry saturation tests.
- Build-step dependency: Blockerar public API och partner API.
- Risk if left in place: Partnerkonsumenter får falsk leveransstatus och missar data.

### LRM-006

- Current code area: Partner adapter engine
- Current file/package/path: `packages/domain-integrations/src/partners.mjs`
- Current status: Aktiv men syntetisk
- Problem in old code or old logic: Contract tests returnerar `passed` utan verkligt adapterprov. Partner operations går direkt till `succeeded` med syntetisk `providerReference`. ID06 är bara en connectionType och inte en verklig kapabilitet.
- Keep / Harden / Replace / Delete: Replace
- Why: Detta är syntetisk integrationslogik, inte ett integrationslager.
- Target bounded context: `domain-integrations` + provider adapters per area
- Target runtime/API/read-model change: Inför adapter capability manifest, contract-test packs, request/response mappers, provider receipts, transport errors, fallback modes, replay-safe classes och provider-specific health checks.
- Migration notes: Behåll generella objekt `PartnerConnection`, `PartnerOperation`, `AsyncJob`; ersätt bara semantics och provider registry.
- Test impact: Adapter-specific contract tests för bank, peppol, OCR, spend, ID06, signatures.
- Build-step dependency: Blockerar integrationsvåg 1.
- Risk if left in place: Plattformen kan inte på ett verifierbart sätt prata med externa system.

### LRM-007

- Current code area: API server bootstrap
- Current file/package/path: `apps/api/src/server.mjs`
- Current status: Stor, monolitisk route-yta
- Problem in old code or old logic: Filen bär routing, health, shell-listor och flera syntetiska testvärden, inklusive stubbad OCR-modelversion. Den blandar control-plane, data-plane och temporära routekataloger.
- Keep / Harden / Replace / Delete: Harden
- Why: API-servern ska vara kompositionsyta, inte semantisk soptipp.
- Target bounded context: `api-gateway` och route modules per context
- Target runtime/API/read-model change: Dela upp i route modules per bounded context och per surface: internal desktop/backoffice, public API, partner API, provider ingress. Ta bort hårdkodade stubbar.
- Migration notes: Bevara existerande path-space där det redan är korrekt; flytta payload-shapes till central kontraktskatalog.
- Test impact: Route smoke tests, idempotency tests, permission tests, contract snapshot tests.
- Build-step dependency: Blockerar payloadkataloger, permission enforcement och UI-readiness.
- Risk if left in place: Kodbasen fortsätter växa runt fel ansvarsfördelning.

### LRM-008

- Current code area: Platform composition
- Current file/package/path: `apps/api/src/platform.mjs`
- Current status: Aktiv central merge
- Problem in old code or old logic: Flat merge-order gör att enskilda domäner kan kollidera på metodnamn och maskerar vilka kontrakt som faktiskt kommer från vilken domän. Demo-seeding kan smyga in via plattformsbygget.
- Keep / Harden / Replace / Delete: Harden
- Why: Source-of-truth och capabilities måste vara explicit upplåsta.
- Target bounded context: `api-platform`
- Target runtime/API/read-model change: Exponera namespaced capabilities, registrerad contract manifest per domain och explicit collision-fail vid bootstrap.
- Migration notes: Introducera `platform.getDomain("x").method()` internt; route-lager får inte använda flat kollisionskänsliga exports.
- Test impact: Domain capability manifest tests, collision tests, seed-off tests.
- Build-step dependency: Blockerar säker expansion av nya domäner.
- Risk if left in place: Metodkrockar och dold semantik.

### LRM-009

- Current code area: Demo-seeded domain engines
- Current file/package/path: `packages/domain-review-center/src/engine.mjs`, `packages/domain-vat/src/index.mjs`, flera `packages/domain-*/src/*`
- Current status: Blandning av verklig logik och demo-seeding
- Problem in old code or old logic: Flera domäner seedar demo-data eller använder demo-company-id i default-paths.
- Keep / Harden / Replace / Delete: Replace
- Why: Demo-data i runtime förstör audit, testreproducerbarhet och tenant isolation.
- Target bounded context: Samtliga domäner med separat fixture-loader
- Target runtime/API/read-model change: Flytta all seeding till `packages/db/seeds/*` och test fixtures; produktionsbootstrap ska alltid starta tomt eller från explicit tenant setup.
- Migration notes: Inga affärsobjekt får längre ha implicit demo-identitet.
- Test impact: Fixture-loader tests, empty-bootstrap tests.
- Build-step dependency: Blockerar go-live och pilot.
- Risk if left in place: Oavsiktliga dataobjekt i kundmiljö.

### LRM-010

- Current code area: VAT engine
- Current file/package/path: `packages/domain-vat/src/index.mjs`
- Current status: Stark kärna men fel distribution av rulepacks
- Problem in old code or old logic: Regelpaket och koddimensioner ligger hårdkodade i domänkoden tillsammans med seeded versions och demo-konstanter.
- Keep / Harden / Replace / Delete: Harden
- Why: VAT-logik ska drivas av publicerat rulepackregister, inte av inline seeded arrays.
- Target bounded context: `domain-vat` + `rulepack-registry`
- Target runtime/API/read-model change: Läs rulepacks från publicerad registry med checksum, effective dating, rollback chain och testvector-bevis.
- Migration notes: Seedade packs `vat-se-2025.6` och `vat-se-2026.3` migreras till registry.
- Test impact: Historical pinning tests, rulepack publication tests.
- Build-step dependency: Blockerar rulepack governance.
- Risk if left in place: Lagregler blir kodändringar i stället för publicerade baseline-byten.

### LRM-011

- Current code area: Payroll engine
- Current file/package/path: `packages/domain-payroll/src/index.mjs`
- Current status: Bred men inte regulatoriskt komplett
- Problem in old code or old logic: Ordinarie preliminärskatt är fortfarande `manual_rate`. Arbetsgivaravgifts-rulepack saknar den verifierade 2026-nedsättningen för 19–23 år. Det gör motorn olämplig för faktisk svensk lönekörning.
- Keep / Harden / Replace / Delete: Replace
- Why: Svensk lön kräver tabellskatt, jämkning, SINK, åldersregler, tillfälliga regeländringar och AGI-kedja.
- Target bounded context: `domain-payroll`, `rulepack-registry`
- Target runtime/API/read-model change: Bygg tax-table resolver, jämkningsprofil, SINK-beslut, employer contribution classes, protected amount / garnishment engine och annual rulepack pinning.
- Migration notes: Befintliga pay item templates kan behållas men tax evaluation måste bytas ut.
- Test impact: 2026 tax table tests, age reduction tests, SINK tests, correction/replay tests.
- Build-step dependency: Blockerar payroll go-live.
- Risk if left in place: Fel skatteavdrag och fel arbetsgivaravgifter.

### LRM-012

- Current code area: Collective agreement engine
- Current file/package/path: `packages/domain-collective-agreements/src/engine.mjs`
- Current status: Tenant-self-service-orienterad
- Problem in old code or old logic: Kunden kan skapa agreement families och versioner direkt per company. Det strider mot central library-modellen och är fel för kostnadskontroll, kvalitet och återanvändning.
- Keep / Harden / Replace / Delete: Replace
- Why: Kollektivavtal ska vara centralt förvaltade, publicerade och testade innan tenant-aktivering.
- Target bounded context: `domain-collective-agreements` som central catalog + `backoffice-agreement-intake`
- Target runtime/API/read-model change: Ersätt self-service create/publish med published catalog selection, support-managed intake, internal extraction, human payroll/compliance approval och compiled rulepack publication.
- Migration notes: Migrera befintliga tenant-assignment-objekt till `TenantAgreementSelection`. Blockera nya family/version-creates från tenant scope.
- Test impact: Catalog publication tests, tenant selection tests, local supplement approval tests.
- Build-step dependency: Blockerar korrekt kollektivavtalsstyrd lön.
- Risk if left in place: Hög AI-kostnad, fragmenterad avtalslogik och oreglerad löneberäkning.

### LRM-013

- Current code area: Personalliggare engine
- Current file/package/path: `packages/domain-personalliggare/src/index.mjs`
- Current status: Byggarbetsplatscentrerad
- Problem in old code or old logic: Kärnobjektet är `constructionSite`, industry pack-listan är i praktiken bara `bygg` och workplace abstraheras inte generellt. Detta gör domänen svår att använda för fler branscher och skapar fel beroende mot projects.
- Keep / Harden / Replace / Delete: Replace
- Why: Personalliggare ska byggas på generell workplace-model med industry packs.
- Target bounded context: `domain-personalliggare`
- Target runtime/API/read-model change: Inför `Workplace`, `WorkplaceRegistration`, `AttendanceIdentitySnapshot`, `AttendanceEvent`, `AttendanceCorrection`, `AttendanceExport`, `KioskDevice` och `IndustryPackActivation`.
- Migration notes: `constructionSiteId` mappas till `workplaceId` inom bygg-pack. Historiska exports och attendance events ska bevaras.
- Test impact: Multi-industry tests, threshold tests, correction chain tests, kiosk trust tests.
- Build-step dependency: Blockerar generaliserad operationskärna och ID06-koppling.
- Risk if left in place: Byggcentrerad produktkärna.

### LRM-014

- Current code area: Projects engine
- Current file/package/path: `packages/domain-projects/src/index.mjs`
- Current status: Delvis generell men fortfarande field/order-vinklad
- Problem in old code or old logic: Project workspace och profitability är för starkt färgade av work orders, dispatch och bygg/field-koppling. Konsult-, byrå-, retainer- och interna projekt får inte förstaklassig modell.
- Keep / Harden / Replace / Delete: Replace
- Why: Projects måste vara generell verksamhetsmotor.
- Target bounded context: `domain-projects` core + vertikala packs
- Target runtime/API/read-model change: Definiera generell project core, generic work models, optional operational cases och vertikala packs för field/personalliggare/ID06.
- Migration notes: Behåll profitability snapshots, budget versions, forecast och change orders; gör work order till optional pack.
- Test impact: Consulting project tests, recurring service tests, field tests, construction tests.
- Build-step dependency: Blockerar icke-byggbolag och competitor parity.
- Risk if left in place: Hela produkten dras mot fel kärnmodell.

### LRM-015

- Current code area: Desktop shell
- Current file/package/path: `apps/desktop-web/src/server.mjs`
- Current status: Endast shell
- Problem in old code or old logic: Appen serverar bara ett statiskt chrome-shell och marknadsförande kort. Den får inte presenteras som verklig produktprogress.
- Keep / Harden / Replace / Delete: Delete
- Why: UI ska inte byggas nu; en shell-app i huvudrepo skapar falska beroenden och fel fokus.
- Target bounded context: Ingen. Flyttas till separat prototype-scope eller tas bort från default build.
- Target runtime/API/read-model change: Exkludera från mandatory build; behåll endast UI-readiness contracts.
- Migration notes: Ingen datamigrering. Dokumentera att backend är source of truth.
- Test impact: Ta bort UI-shell smoke tests från gate.
- Build-step dependency: Blockerar inte backend men blockerar tydlig fokusdisciplin.
- Risk if left in place: Team bygger runt shell i stället för runt kontrakt.

### LRM-016

- Current code area: Field mobile shell
- Current file/package/path: `apps/field-mobile/src/server.mjs`
- Current status: Endast shell
- Problem in old code or old logic: Ytan signalerar offline-first, personalliggare och signatur utan att backend-kontrakten är fullständigt låsta.
- Keep / Harden / Replace / Delete: Delete
- Why: Fältmobil får inte definiera semantik före backend.
- Target bounded context: Ingen. Flyttas till prototype-scope eller tas bort från default build.
- Target runtime/API/read-model change: Behåll bara `field-mobile` backend boundary, sync envelope och action matrix.
- Migration notes: Ingen.
- Test impact: Ta bort shell-baserad UI smoke från pass gates.
- Build-step dependency: Blockerar inte backend men skapar falsk readiness.
- Risk if left in place: Fältkrav kan bakas in från fel håll.

### LRM-017

- Current code area: Seed packages
- Current file/package/path: `packages/db/seeds/*`, `packages/db/seeds/README.md`
- Current status: Omfattande demo-/phase-seeds
- Problem in old code or old logic: Seed-paketet riskerar att bli de facto affärsmodell och blandar demoobjekt med verkliga faser.
- Keep / Harden / Replace / Delete: Harden
- Why: Fixtures behövs, men ska vara strikt separerade från runtime.
- Target bounded context: `db-fixtures`
- Target runtime/API/read-model change: Dela i `unit-fixtures`, `integration-fixtures`, `golden-fixtures`, `migration-fixtures`. Ingen runtime-bootstrap får använda dem implicit.
- Migration notes: Namnge fixtures per scenario och rulepack-version.
- Test impact: Mer deterministiska golden tests.
- Build-step dependency: Blockerar inte funktion men blockerar testdisciplin.
- Risk if left in place: Demo-data läcker in i acceptance.

### LRM-018

- Current code area: Public/partner/automation routes
- Current file/package/path: `apps/api/src/phase13-routes.mjs`
- Current status: Stor mixed-context routefil
- Problem in old code or old logic: Public API admin, webhooks, partners och automation ligger i samma fil med blandad auth- och async-semantik.
- Keep / Harden / Replace / Delete: Replace
- Why: Detta är control-plane och data-plane för flera ytor med olika riskklass.
- Target bounded context: `api-public-control`, `api-public-data`, `api-partner-control`, `api-automation-control`
- Target runtime/API/read-model change: Splitta routes, inför standardiserade error envelopes, idempotency enforcement, async operation receipts och replay-from-sequence-kontrakt.
- Migration notes: Behåll path-space där möjligt men märk control-plane vs data-plane tydligt.
- Test impact: Contract snapshot tests, auth-scope tests, webhook replay tests.
- Build-step dependency: Blockerar external developer experience.
- Risk if left in place: Felaktig auth, dålig versionering och svag contract governance.

### LRM-019

- Current code area: Legal form, collective agreements, migration and phase 14 routes
- Current file/package/path: `apps/api/src/phase14-routes.mjs`
- Current status: Stor mixed-context routefil
- Problem in old code or old logic: Legal form, annual reporting, collective agreements, security, migration och payroll migration samsas i en routefil. Vissa rutter speglar gamla domänbeslut, särskilt kollektivavtalsself-service.
- Keep / Harden / Replace / Delete: Replace
- Why: Regelstyrda och högrisk-flöden kräver egna kontrollplan.
- Target bounded context: `api-legal-form`, `api-annual-reporting`, `api-collective-agreements`, `api-migration`, `api-security`
- Target runtime/API/read-model change: Flytta till kontraktskatalogstyrda route modules och skriv om kollektivavtalsrutter till published catalog + support-managed intake.
- Migration notes: Rutter för migration och cutover kan i huvudsak behållas men payloads ska låsas mot nya docs.
- Test impact: Acceptance tests per route family.
- Build-step dependency: Blockerar module activation, migration cockpit och payroll agreement support.
- Risk if left in place: Fortsatt arkitekturskuld och motstridiga flows.

### LRM-020

- Current code area: Support/backoffice actions
- Current file/package/path: `packages/domain-core/src/backoffice.mjs`
- Current status: God riktning men ofullständigt härdad
- Problem in old code or old logic: Impersonation och admin diagnostics finns, men session recording, field-level data masking, evidence pack, challenge center-krav och SoD-klassning är inte fullt förstaklassiga.
- Keep / Harden / Replace / Delete: Harden
- Why: Backoffice måste vara verklig enterprise operations-yta, inte bara hjälpfunktioner.
- Target bounded context: `backoffice`, `auth-core`, `org-auth`
- Target runtime/API/read-model change: Inför support-case-bound scopes, replay approvals, session transcript refs, object mask policies, dual control och break-glass timers.
- Migration notes: Befintliga support case-objekt kan behållas men måste utökas.
- Test impact: Impersonation restriction tests, break-glass SoD tests, masking tests.
- Build-step dependency: Blockerar enterprise readiness.
- Risk if left in place: Support blir bakdörr.

## Delete now

- `apps/desktop-web/src/server.mjs`
- `apps/field-mobile/src/server.mjs`

## Replace now

- `packages/domain-core/src/jobs.mjs`
- `apps/worker/src/worker.mjs`
- `packages/domain-integrations/src/public-api.mjs`
- `packages/domain-integrations/src/partners.mjs`
- `packages/domain-collective-agreements/src/engine.mjs`
- `packages/domain-personalliggare/src/index.mjs`
- `packages/domain-projects/src/index.mjs`
- `apps/api/src/phase13-routes.mjs`
- `apps/api/src/phase14-routes.mjs`

## Harden now

- `packages/domain-core/src/jobs-store-postgres.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/platform.mjs`
- `packages/domain-vat/src/index.mjs`
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-core/src/backoffice.mjs`
- `packages/db/seeds/*`

## Exit gate

- [ ] Ingen default-runtime använder in-memory eller demo-seeding utanför test scope.
- [ ] Inga webhook- eller partneroperationer auto-succeedar utan verklig transport.
- [ ] Collective agreements, projects och personalliggare följer nya bounded-context-regler.
- [ ] Routefilerna är splittade per bounded context och surface.
- [ ] Legacy-kod som lämnas kvar är uttryckligen märkt `keep` eller `harden` med aktivt testskydd.

