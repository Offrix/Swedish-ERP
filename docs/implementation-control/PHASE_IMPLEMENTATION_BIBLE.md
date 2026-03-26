# PHASE_IMPLEMENTATION_BIBLE

Status: Bindande implementationsspec för hela återstående arbetet från nuvarande zip-läge till go-live.  
Datum: 2026-03-26  
Detta dokument är självbärande och normativt. Det ersätter äldre implementationsspecar när de krockar med innehållet här.
Äldre implementation-control-, master-control-, ADR-, runbook- och analysdokument är historiska inputkällor. De är inte fortsatt bindande där de krockar med detta dokument.

## 0. Syfte och beslut som redan är fattade

Detta dokument definierar exakt hur varje fas i `GO_LIVE_ROADMAP.md` ska byggas och fungera.  
Följande är redan avgjort och får inte återöppnas utan formellt governance-beslut:

1. Produkten är en generell svensk företagsplattform, inte ett byggprogram.
2. General project core ska fungera för alla branscher; field/personalliggare/ID06 är valbara vertikala pack.
3. `ledger` är enda källan till bokföring; `payroll` är enda källan till AGI constituents; `vat` äger momsbeslut; `hus` äger claim-lifecycle; `tax-account` äger skattekontosubledger; `annual-reporting` äger packages; `domain-regulated-submissions` äger attempts/receipts/recovery.
4. UI bär aldrig domänlogik. Alla framtida ytor vilar på object profiles, workbenches, read models och server-side permission resolution.
5. Trial/test och live är olika driftvärldar. De får aldrig dela credentials, providers, receipts, sequence spaces eller ekonomisk effekt.
6. Demo/stub/simulering är bara tillåten i explicit non-live mode.
7. Regulativ logik ska vara deterministisk, versionsstyrd, effective-dated och historiskt pinad.

## 1. Canonical cross-phase primitives

### 1.1 Environment and mode model

Alla requests, jobs, submissions, integrations, evidence packs och supportsessions ska bära ett explicit `environmentMode`:

- `trial`
- `sandbox_internal`
- `test`
- `pilot_parallel`
- `production`

Tilläggsfält som alltid ska finnas där relevant:

- `supportsLegalEffect` boolean
- `modeWatermarkCode`
- `sequenceSpace`
- `providerEnvironmentRef`
- `dataRetentionClass`
- `correlationId`
- `idempotencyKey` för muterande operationer
- `expectedObjectVersion` där optimistic concurrency krävs

### 1.2 Canonical object fields

Alla muterbara affärsobjekt ska minst ha:

- primär-id
- `companyId`
- `status`
- `version`
- `createdAt`
- `updatedAt`
- `createdByActorId`
- `lastChangedByActorId`
- `sourceFingerprint` när objektet härrör från import/provider
- `rulepackVersionRef` där regler styr utfallet
- `effectiveFrom` / `effectiveTo` där historisk giltighet krävs
- `evidenceRefs[]` när objektet leder till regulatoriskt eller operativt beviskrav

### 1.3 Canonical command envelope

Varje muterande command ska bära:

- `commandId`
- `commandType`
- `companyId`
- `actorId`
- `sessionRevisionId`
- `environmentMode`
- `idempotencyKey`
- `expectedObjectVersion`
- `requiredActionClass`
- `requiredTrustLevel`
- `requestedAt`
- `payloadHash`
- `causationRef`
- `correlationId`

Command receipt ska skrivas i samma commit som eventuell state-mutation och outbox emission.

### 1.4 Canonical error envelope

Alla API-svar och partner/public API-svar använder:

- `meta.requestId`
- `meta.correlationId`
- `meta.apiVersion`
- `meta.mode`
- `error.code`
- `error.message`
- `error.classification` (`validation`, `permission`, `conflict`, `technical`, `rate_limited`, `downstream`)
- `error.retryable`
- `error.reviewRequired`
- `error.denialReasonCode`
- `error.supportRef`
- `error.details[]`

### 1.5 Global source-of-truth matrix

| Domän | Äger sanningen för |
|---|---|
| `domain-tenant-control` | tenant bootstrap, module activation, mode, promotion, pilot/parallel-run state |
| `domain-org-auth` | identity-to-tenant membership, roles, grants, delegations |
| `auth-core` | passkeys, TOTP, session trust, challenge completion, device trust |
| `domain-accounting-method` | kontantmetod/faktureringsmetod och timingregler |
| `domain-fiscal-year` | periodkalender, periodstater, lås och reopen-impact |
| `domain-legal-form` | legal form profiles, reporting obligations, signatory classes |
| `domain-ledger` | journals, posting truth, voucher series, correction packages |
| `domain-reporting` | report snapshots och derived reports, aldrig bokföringssanning |
| `domain-vat` | momsbeslut, momsperioder, deklarationsunderlag |
| `domain-ar` | kundfaktura, reskontra, allocations, collection state |
| `domain-ap` | leverantörsfaktura, attest, payment prep |
| `domain-banking` | statements, payment orders, settlement links |
| `domain-tax-account` | skattekontosubledger, classification, discrepancy cases |
| `domain-documents` | originaldokument, versioner, hashes |
| `document-engine` | OCR pipeline execution, aldrig original truth |
| `domain-document-classification` | classification/extraction decisions |
| `domain-import-cases` | import blockers, corrections, approval chain |
| `domain-review-center` | review item state och queue-based decisions |
| `domain-notifications` | notifications och delivery state |
| `domain-activity` | append-only activity projection |
| `domain-core` | jobs, generic work items, migration/cutover control-plane primitives |
| `domain-hr` | employee/employment masterdata |
| `domain-time` | approved time/absence inputs |
| `domain-balances` | leave/balance accounts |
| `domain-collective-agreements` | avtalade rate/rule tables |
| `domain-payroll` | pay runs, AGI constituents, payroll posting intents |
| `domain-benefits` | benefits decisions och classifications |
| `domain-travel` | travel/mileage/traktamente decisions |
| `domain-pension` | pension basis, salary exchange, provider instructions |
| `domain-hus` | HUS claim lifecycle |
| `domain-regulated-submissions` | submission envelopes, attempts, receipts, correction/recovery |
| `domain-annual-reporting` | annual reporting packages, declaration packages |
| `domain-projects` | project commercial truth, profitability rules, portfolio data |
| `domain-field` | operational cases, dispatch, field evidence, sync conflicts |
| `domain-personalliggare` | workplace, attendance, attendance corrections/exports |
| `domain-id06` | ID06 identity graph, card/workplace bindings |
| `domain-egenkontroll` | checklist templates/instances/signoffs |
| `domain-search` | search/read models/object profiles/workbenches only |
| `domain-integrations` | credentials, consent, provider refs, webhooks, partner/public API control plane |

### 1.6 Global versioning and effective dating rules

1. Alla regulatoriska beslut och snapshot-objekt ska bära `effectiveFrom`, `effectiveTo`, `decisionSource`, `decisionReference`, `rulepackVersionRef`.
2. Gamla objekt skrivs aldrig över. Nya beslut skapar ny version eller nytt snapshot.
3. Corrections skapar ny version och explicit länk till föregående version.
4. Replay får bara återköra samma payloadversion eller explicit correctionflow; replay får aldrig i smyg producera ny payload.
5. Provider baseline versions ska pinas på transport-/filingsobjekt precis som rulepacks pinas på affärsobjekt.

### 1.7 Global review boundary rules

Mänsklig review ska alltid krävas när något av följande gäller:

- `review_required = true` i rulepack
- source data är ofullständig eller motsägelsefull
- payload hash ändras efter signoff
- `manual_rate` eller annan emergency fallback används
- Skatteverkets eller annan myndighets beslut saknas där officiellt beslut krävs
- ambiguous bank/tax-account matching
- HUS buyer/property/allocation uncertainty
- break-glass, write-capable impersonation, provider fallback i live
- cutover-varians över accepterad threshold
- projections/search visibility conflict som kan dölja eller exponera fel data

### 1.8 Global receipts, replay and dead-letter rules

- Dead-letter hanterar endast tekniskt stoppad bearbetning, aldrig affärsbeslut.
- Replay av samma payloadversion måste vara idempotent mot extern kanal.
- Correction kräver ny payloadversion.
- Submission receipts och webhook deliveries måste kunna exporteras som evidence packs.
- Trial receipts ska vara deterministiska men märkas med `legalEffect=false`.

## Fas 0 — Sanningslåsning, scope-frysning och destruktiv legacy-rensning

**Mål**  
Göra de två nya dokumenten till enda sanning, döda felaktiga antaganden och låsa produktkategori, providerstrategi och projektkärnans riktning innan någon mer feature-kod byggs.

**Varför fasen behövs**  
Repo:t har motstridiga sanningar. Utan explicit destruktiv reconciliation kommer teamet bygga på fel kategori, fel providerstrategi och fel benchmark.

**Exakt vad som ska uppnås**  
Sätt de två nya dokumenten som enda bindande källa. Frys produktdefinition, benchmark, providerbeslut och project-core-riktning. Döp om eller nedgradera äldre dokument så att de inte längre kan tolkas som aktiva styrdokument.

**Kodområden som påverkas**
- `README.md`
- `docs/implementation-control/MASTER_BUILD_SEQUENCE_FINAL.md`
- `docs/implementation-control/LEGACY_CODE_REMEDIATION_MAP.md`
- `docs/implementation-control/COMPETITOR_WIN_MATRIX.md`
- `docs/implementation-control/PROVIDER_PRIORITY_AND_REGULATORY_BASELINES.md`
- `docs/adr/ADR-0009-identity-signing-and-enterprise-auth-strategy.md`
- `apps/api/src/platform.mjs`

**Behåll**
- README:s breda produktdefinition
- bounded context-principen
- separerade objektfamiljer för review/work items/notifications/activity

**Förstärk / härda**
- MASTER_BUILD_SEQUENCE_FINAL som inputkälla men inte som primär sanning
- COMPETITOR_WIN_MATRIX med nya CRM/project benchmarks

**Skriv om**
- providerstrategi där ADR och provider priority krockar
- alla dokument som fortfarande antyder byggcentrisk identitet

**Ersätt**
- phase-etiketter som mognadssignal
- route-/testyta som proxy för live readiness

**Ta bort / deprecate**
- allt som säger att desktop/field shell = produktprogress
- allt som antar att BankID/OCR/submissions redan är live

**Migrera**
- inga dataobjekt; endast styrsignaler och dokumentstatus

**Nya objekt**
- `TraceabilityRow`
- `DecisionOverride`
- `DeprecatedGuidanceMarker`

**Source of truth**  
Dessa governanceobjekt lever i docs/build governance och eventuell intern catalog, inte i affärsdomänerna.

**State machines**  
TraceabilityRow: `identified -> mapped -> accepted -> locked`; DeprecatedGuidanceMarker: `active -> superseded -> archived`.

**Commands**
- `lockPrimaryGuidance`
- `markDocumentSuperseded`
- `registerTraceabilityRow`
- `resolveArchitectureConflict`

**Events**
- `guidance.locked`
- `document.superseded`
- `traceability.row.mapped`
- `architecture.conflict.resolved`

**API-kontrakt / routefamiljer**
- Ingen extern API-yta; intern governance-catalog kan exponera read-only endpoints för traceability.

**Permissions och enforcement**  
Endast arkitekturägare, produktägare och release-governance-roll får mutera governance-sanningen.

**Review boundaries**  
Alla konfliktlösningar kräver minst två signatärer: arkitektur + produkt/kompliance.

**Blockerande valideringar**  
['Ingen featuregren får startas om dess analysis-fynd saknar roadmappost.']

**Audit / evidence**  
Alla governance-beslut får auditklass `governance_decision` med ersatt källa och orsak.

**Rulepacks / versionering / effective dating**  
Äldre dokument får bara leva kvar om de uttryckligen överensstämmer med nya docs; annars markeras de `superseded`.

**Testkrav**  
['Dokumentcoverage-test', 'linter som kräver traceability-id på fasbeskrivningar']

**Migrations- och cutoverkrav**  
Ingen cutover-data här; endast styrningscutover.

**Runbooks som krävs**
- `docs/runbooks/governance-change-control.md`

**Roadmap-delfaser och exakt implementation**
- **0.1 [REMOVE/DEPRECATE] Döda byggcentriska narrativ** — Ta bort all styrning som behandlar produkten som byggprogram. Skriv in att field/personalliggare/ID06 är vertikala pack ovanpå generell företagsplattform. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **0.2 [REWRITE] Lås bindande produktkategori och benchmarkset** — Frys konkurrensbilden till finansplattformar, CRM-/projektplattformar, project-operations-ERP och bygg/field-vertikaler i exakt denna ordning. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **0.3 [REWRITE] Lös dokumentkonflikter** — Resolva konflikter mellan ADR, provider-priority, legacy remediation, master build sequence och kod. Särskilt BankID-strategi, SCIM-scope, project core och regulated submissions boundary. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **0.4 [NEW BUILD] Skapa full traceability** — Mappa varje kritisk punkt från FULL_SYSTEM_ANALYSIS, LEGACY_AND_REALITY_RECONCILIATION och COMPETITOR_AND_MARKET_REALITY till exakt roadmapfas, delfas och exit gate. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **0.5 [OPERATIONALIZE] Inför hårda stop-regler** — Inför regler att shell-UI, demo-seeds, simulerade receipts, route-bredd och phase-etiketter aldrig får räknas som produktmognad. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Alla äldre dokument är nedgraderade till icke-bindande om de inte uttryckligen stämmer med denna roadmap. Produkten är formellt definierad som generell svensk företagsplattform. CRM/projekt-benchmark utanför bygg är låst.

## Fas 1 — Runtime-ärlighet, bootstrap-hygien och migrationssanning

**Mål**  
Göra boot, miljölägen, migrationslagret och startup-beteenden sanna och deterministiska innan persistent kärna byggs vidare.

**Varför fasen behövs**  
Nuvarande runtime kan starta i demo-läge, bär inkonsekvent migrationshistoria och saknar hård sanningskontroll kring mode/persistence.

**Exakt vad som ska uppnås**  
Få en deterministisk boot och en migrationsmotor som inte ljuger om sin egen sanning.

**Kodområden som påverkas**
- `packages/db/migrations/*.sql`
- `packages/db/seeds/*.sql`
- `packages/domain-core/src/jobs.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/platform.mjs`
- `apps/worker/src/worker.mjs`
- `packages/domain-org-auth/src/index.mjs`
- `packages/domain-ledger/src/index.mjs`
- `packages/domain-vat/src/index.mjs`
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-projects/src/index.mjs`

**Behåll**
- tydlig plattformskomposition i apps/api/src/platform.mjs
- worker som egen runtime-app

**Förstärk / härda**
- startup checks
- mode selection
- seed and fixture loading

**Skriv om**
- schema_migrations-format
- seedDemo defaulting
- boot path selection

**Ersätt**
- implicit demo boot med explicit bootstrapMode
- best-effort runtime warnings med fail-fast i förbjudna lägen

**Ta bort / deprecate**
- alla produktionsstarter som använder seedDemo utan explicit trial flag

**Migrera**
- migrationshistorik
- seeds till scenario-baserad loader

**Nya objekt**
- `RuntimeModeProfile`
- `BootstrapModePolicy`
- `MigrationHistoryRow`
- `RuntimeInvariantFinding`

**Source of truth**  
`RuntimeModeProfile` och `BootstrapModePolicy` ägs av ny tenant/runtime-control boundary; migrationshistoria ägs av db/migration layer.

**State machines**  
RuntimeModeProfile: `declared -> validated -> active -> suspended`; RuntimeInvariantFinding: `detected -> waived | fixed`.

**Commands**
- `declareRuntimeMode`
- `validateRuntimeMode`
- `repairMigrationHistory`
- `scanRuntimeInvariants`
- `applyBootstrapScenario`

**Events**
- `runtime.mode.declared`
- `runtime.mode.validated`
- `migration.history.repaired`
- `runtime.invariant.detected`

**API-kontrakt / routefamiljer**
- `GET /v1/system/runtime-mode`, `GET /v1/system/invariants`, `POST /v1/system/bootstrap/validate`

**Permissions och enforcement**  
Bara platform-admin i non-production; production kräver release admin + break-glass för kritiska reparationer.

**Review boundaries**  
Alla migration repairs kräver dual review och backup hash innan apply.

**Blockerande valideringar**  
['Production/pilot boot nekas om invariant scanner hittar Map-only critical truth, seedDemo misuse eller missing persistent store.']

**Audit / evidence**  
Boot decisions loggas med mode, active store, disabled adapters, seed policy, git/version ref.

**Rulepacks / versionering / effective dating**  
Mode måste vara explicit; `production` och `pilot_parallel` får aldrig autoseeda.

**Testkrav**  
['fresh DB migrate', 'upgrade DB migrate', 'boot matrix per mode', 'negative tests for forbidden seeds', 'invariant scanner coverage']

**Migrations- och cutoverkrav**  
Migration engine måste skapa en verifierbar rollbackpoint-format som senare cutover plan använder.

**Runbooks som krävs**
- `docs/runbooks/runtime-mode-validation.md`
- `docs/runbooks/migration-history-repair.md`

**Roadmap-delfaser och exakt implementation**
- **1.1 [REWRITE] Laga schema_migrations-inkonsistens** — Gör migrationshistoriken självkonsistent och stoppa alla scripts som skriver fel kolumnnamn eller dubbla format. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **1.2 [HARDEN] Inför explicit runtime mode** — Alla starter ska välja `trial`, `sandbox_internal`, `test`, `pilot_parallel` eller `production`; implicit demo-boot är förbjudet. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **1.3 [REPLACE] Byt `seedDemo=true` default** — Alla kärndomäner ska defaulta till `bootstrapMode=none`; demo-seed tillåts endast via explicit trial/demo-scenario. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **1.4 [REWRITE] Rensa startup och flat merge-risker** — Bryt ut startupdiagnostik och varna/faila om någon kärndomän körs utan persistent store i lägen där det inte är tillåtet. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **1.5 [NEW BUILD] Bygg runtime honesty scanner** — Scanner ska hitta Map-baserad sanning, stub-provider, simulerade receipts, demo-data i production mode och otillåtna route-familjer. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
API och worker startar deterministiskt per miljöläge, migrationer är rena och inga kritiska domäner kan råka boota med demo-läge i production eller pilot.

## Fas 2 — Durable persistence, outbox, jobs, attempts, replay och dead-letter

**Mål**  
Flytta affärssanningen från processminne till hållbar persistence med idempotent command-logg, outbox, job attempts och replay/dead-letter.

**Varför fasen behövs**  
Affärssanningen ligger för ofta i processminne. Utan durable repos, command log och outbox/replay är alla regulated claims om receipts och recovery ihåliga.

**Exakt vad som ska uppnås**  
Inför en konsekvent persistent kärna med repository interfaces, optimistic concurrency, command receipts, outbox/inbox och robust worker-job model.

**Kodområden som påverkas**
- `packages/domain-core/src/jobs.mjs`
- `packages/events/src/index.mjs`
- `packages/domain-*/src/index.mjs`
- `packages/domain-*/src/engine.mjs`
- `apps/worker/src/worker.mjs`
- `packages/db/migrations/*.sql`
- `apps/api/src/platform.mjs`

**Behåll**
- domänseparationen
- worker pattern
- event- och auditorienteringen

**Förstärk / härda**
- jobs
- retry logic
- projection rebuild
- read model lag tracking

**Skriv om**
- critical Map stores till repo-backed stores
- mutation flow so command and outbox share transaction

**Ersätt**
- process-local truth as authoritative source

**Ta bort / deprecate**
- ad hoc mutation without expected object version

**Migrera**
- state from Map snapshots to persisted tables per domain

**Nya objekt**
- `CommandReceipt`
- `OutboxMessage`
- `InboxMessage`
- `JobAttempt`
- `ReplayPlan`
- `DeadLetterItem`
- `ProjectionCheckpoint`

**Source of truth**  
Varje domän äger sina egna tables men CommandReceipt/Outbox/JobAttempt/ProjectionCheckpoint ägs av domain-core/platform persistence.

**State machines**  
JobAttempt: `queued -> claimed -> running -> succeeded | failed | retry_scheduled | dead_lettered`; ReplayPlan: `planned -> approved -> running -> completed | abandoned`.

**Commands**
- `appendCommandReceipt`
- `enqueueOutboxMessage`
- `claimJob`
- `completeJobAttempt`
- `scheduleJobRetry`
- `deadLetterJob`
- `planReplay`
- `runProjectionRebuild`

**Events**
- `command.accepted`
- `outbox.message.enqueued`
- `job.retry_scheduled`
- `job.dead_lettered`
- `replay.planned`
- `projection.rebuilt`

**API-kontrakt / routefamiljer**
- Primärt interna APIs; backoffice read/write endpoints kommer i fas 17.

**Permissions och enforcement**  
Backoffice replay/dead-letter kräver särskilda support roles; business actors får aldrig manipulera job state direkt.

**Review boundaries**  
Replay av high-risk eller regulated items kräver review och ibland dual control beroende på riskklass.

**Blockerande valideringar**  
['No domain may call external provider or emit final business event without persisted command receipt and outbox.']

**Audit / evidence**  
Replay/dead-letter/operator interventions får egen auditklass med before/after state hash.

**Rulepacks / versionering / effective dating**  
Idempotency key + expectedObjectVersion på alla muterande operations. Projection rebuild får aldrig ändra source of truth.

**Testkrav**  
['crash recovery', 'duplicate command suppression', 'outbox once-and-at-least-once semantics', 'projection rebuild parity', 'worker failover']

**Migrations- och cutoverkrav**  
Domänvis data backfill med checksums och row counts; pilot cutover förbjuds tills critical domains har lämnat Map-only mode.

**Runbooks som krävs**
- `docs/runbooks/outbox-replay-and-dead-letter.md`
- `docs/runbooks/projection-rebuild.md`

**Roadmap-delfaser och exakt implementation**
- **2.1 [NEW BUILD] Inför canonical repositories** — Varje bounded context får repositorygränssnitt med Postgres-implementation och transaktionsbunden optimistic concurrency. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **2.2 [NEW BUILD] Inför command log + outbox/inbox** — Alla muterande commands ska skriva command receipt, expected version, actor, session revision och outbox-event i samma commit. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **2.3 [HARDEN] Hårdna job-runtime** — `packages/domain-core/src/jobs.mjs` och `apps/worker/src/worker.mjs` ska bära attempts, retry policy, dead-letter, replay plan och poison-pill-detektion. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **2.4 [MIGRATE] Migrera kritiska domäner bort från Map-sanning** — Org auth, ledger, VAT, AR, AP, payroll, tax-account, review-center, projects och submissions får inte längre ha produktionskritisk state enbart i Map. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **2.5 [NEW BUILD] Inför projections re-build** — Read models ska kunna raderas och byggas om från event/outbox utan att source-of-truth tappar historik. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Kritiska affärsobjekt är persistenta, replaybara och versionsstyrda. Jobs kan återupptas efter processdöd. Dead-letter och replay är operatörsstyrda, inte ad hoc-scripts.

## Fas 3 — Audit, evidence, observability, restore drills och secret governance

**Mål**  
Göra audit och driftbevis förstaklassiga samt säkra att systemet kan övervakas, återställas och opereras utan manuell databasmedicin.

**Varför fasen behövs**  
Utan observability, restore drills, evidence packs och secret governance kan systemet inte drivas regulatoriskt eller enterprise-mässigt.

**Exakt vad som ska uppnås**  
Standardisera audit/evidence och operational telemetry så att varje kritisk kedja går att bevisa, återställa och supporta.

**Kodområden som påverkas**
- `packages/domain-activity/src/engine.mjs`
- `packages/domain-notifications/src/engine.mjs`
- `packages/domain-review-center/src/engine.mjs`
- `packages/domain-search/src/index.mjs`
- `apps/api/src/server.mjs`
- `apps/worker/src/worker.mjs`
- `infra/*`
- `docs/runbooks/*`

**Behåll**
- activity as append-only projection
- review center as distinct boundary

**Förstärk / härda**
- metrics, tracing, evidence bundle hashing, secret isolation

**Skriv om**
- support logging that lacks correlation or classification

**Ersätt**
- manual restore confidence with practiced drills

**Ta bort / deprecate**
- shared secrets across modes

**Migrera**
- existing ad hoc logs to structured log and audit classes

**Nya objekt**
- `EvidenceBundle`
- `EvidenceArtifact`
- `InvariantAlarm`
- `SecretRotationRecord`
- `RestoreDrillRecord`

**Source of truth**  
Activity remains projection, audit/evidence stored centrally but linked to source objects.

**State machines**  
EvidenceBundle: `open -> frozen -> archived`; RestoreDrillRecord: `scheduled -> running -> passed | failed`.

**Commands**
- `createEvidenceBundle`
- `freezeEvidenceBundle`
- `rotateSecret`
- `runRestoreDrill`
- `raiseInvariantAlarm`

**Events**
- `evidence.bundle.frozen`
- `secret.rotated`
- `restore.drill.completed`
- `alarm.raised`

**API-kontrakt / routefamiljer**
- Backoffice evidence and alarm APIs in later phases; internal telemetry endpoints now.

**Permissions och enforcement**  
Security admin owns secret rotation; incident commander owns restore drills; evidence export restricted by scope/classification.

**Review boundaries**  
Failed restore drills or alarm suppressions require incident review.

**Blockerande valideringar**  
['No live provider or filing if secret isolation, alarming and evidence bundling are missing.']

**Audit / evidence**  
Evidence packages include checksum, source refs, actor, time, mode and retention class.

**Rulepacks / versionering / effective dating**  
Every regulated outcome must be exportable as evidence pack. Every secret has owner, rotation cadence and mode-bound vault.

**Testkrav**  
['evidence integrity tests', 'alarm emission tests', 'restore drill tests', 'secret rotation smoke tests']

**Migrations- och cutoverkrav**  
Cutover requires existing restore drill pass within policy window.

**Runbooks som krävs**
- `docs/runbooks/evidence-bundle-export.md`
- `docs/runbooks/secret-rotation.md`
- `docs/runbooks/restore-drill.md`

**Roadmap-delfaser och exakt implementation**
- **3.1 [HARDEN] Canonical audit envelope** — Alla commands, provider calls, approvals, impersonations, submissions och replay-åtgärder ska skriva samma auditform. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **3.2 [NEW BUILD] Bygg evidence-packs** — Submissions, annual packages, cutover, support cases, break-glass och project evidence ska kunna paketeras, hash-as och arkiveras. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **3.3 [NEW BUILD] Full observability** — Metrics, tracing, structured logs, invariant alarms, queue age alarms, provider health och projection lag ska vara synliga. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **3.4 [OPERATIONALIZE] Restore drills och chaos** — Återställning av databas, projection rebuild och worker restart ska övas och dokumenteras. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **3.5 [HARDEN] Secrets, certifikat och rotationsregler** — Separata vaults per mode, certifikatkedjor, callback-hemligheter och nyckelrotation ska vara formaliserade. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Audit explorer, evidence packs och återställningsrutiner fungerar i testad drift. Secrets är isolerade per mode och provider.

## Fas 4 — Canonical envelopes, error contracts, idempotens, permission resolution och route-dekomposition

**Mål**  
Standardisera alla externa och interna kontrakt, bryta upp blandade route-filer och införa server-side permission resolution med action classes.

**Varför fasen behövs**  
Route space, error shapes and permissions are too mixed. Future UI and external integrations need hard contracts, not phase-based buckets.

**Exakt vad som ska uppnås**  
Decompose routes, introduce canonical envelopes and make action permissions first-class metadata on every mutating call.

**Kodområden som påverkas**
- `apps/api/src/phase13-routes.mjs`
- `apps/api/src/phase14-routes.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/platform.mjs`
- `packages/auth-core/src/index.mjs`
- `packages/domain-org-auth/src/index.mjs`
- `packages/domain-integrations/src/public-api.mjs`
- `packages/domain-integrations/src/partners.mjs`
- `docs/implementation-control/PUBLIC_PARTNER_API_AND_WEBHOOK_PAYLOAD_CATALOG.md`

**Behåll**
- existing public API and webhook semantics that are already strong
- scope-thinking in org-auth

**Förstärk / härda**
- canonical request/response/error envelopes
- idempotency and correlation IDs
- permission resolution metadata

**Skriv om**
- route organization into domain-specific route files under apps/api/src/routes/

**Ersätt**
- mixed phase route buckets with stable domain route families

**Ta bort / deprecate**
- new feature additions to phase13/phase14 files after split starts

**Migrera**
- callers and tests to new route paths if renamed; add deprecation shims

**Nya objekt**
- `ApiActionContract`
- `PermissionResolution`
- `DenialReason`
- `RouteCapabilityManifest`

**Source of truth**  
Action contracts live in API layer; permission resolution source of truth remains org-auth.

**State machines**  
ApiActionContract versions: `draft -> published -> deprecated`; deprecations time-bound and versioned.

**Commands**
- `publishApiContract`
- `resolvePermission`
- `registerRouteCapability`
- `deprecateRouteFamily`

**Events**
- `api.contract.published`
- `permission.resolved`
- `route.family.deprecated`

**API-kontrakt / routefamiljer**
- New route families e.g. `/v1/auth/*`, `/v1/public-api/*`, `/v1/partners/*`, `/v1/backoffice/*`, `/v1/migration/*`, `/v1/submissions/*`, `/v1/annual-reporting/*`

**Permissions och enforcement**  
Every mutating route declares `required_action_class`, `required_trust_level`, `required_scope_type`; every read route declares visibility/filter semantics.

**Review boundaries**  
Breaking API contract changes require compatibility review and signed deprecation window.

**Blockerande valideringar**  
['UI contract freeze, partner integrations and support tools are blocked until route split and envelopes exist.']

**Audit / evidence**  
Denied calls, conflicts and replayed idempotent calls must write audit with denial reason.

**Rulepacks / versionering / effective dating**  
External API payloads may never expose internal persistence shape. Internal callers use same contracts unless explicitly private.

**Testkrav**  
['route snapshot tests', 'error envelope tests', 'permission denial tests', 'deprecation shims tests']

**Migrations- och cutoverkrav**  
Route split must be shadowed and deprecation-planned before pilot; no silent breaking changes.

**Runbooks som krävs**
- `docs/runbooks/api-contract-change.md`
- `docs/runbooks/route-family-deprecation.md`

**Roadmap-delfaser och exakt implementation**
- **4.1 [NEW BUILD] Standard request/success/error envelopes** — Alla routes, public API, partner API och webhooks använder samma envelopeform, correlation-id, idempotency key och classification. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **4.2 [HARDEN] Action classes och permission resolution** — Varje muterande route märks med required action class, trust level, scope type och expected object version. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **4.3 [REWRITE] Dela upp `phase13-routes.mjs` och `phase14-routes.mjs`** — Skapa routekatalog per domän/funktion: auth, public API, partner API, backoffice, migration, annual reporting, resilience, projects, submissions. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **4.4 [NEW BUILD] Etablera hard boundary för regulated submissions** — Transport, attempts, receipts och recovery separeras från generella integrationskopplingar. Antingen nytt package eller tydligt submodule med egna APIs. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **4.5 [OPERATIONALIZE] Contract-test miniminivå** — Alla routefamiljer får golden envelopes, denial reasons, conflict semantics och idempotency-tests. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Blandade phase-rutter är borta från bindande ytan. Alla routes och externa payloads följer canonical envelopes, idempotens och permission resolution.

## Fas 5 — Rulepack-registry, effective dating, historical pinning och provider baseline registry

**Mål**  
Göra all reglerad logik, baseline-versionering och providerspecifika format spårbara, effektiverade och historiskt pinade.

**Varför fasen behövs**  
Regler får inte leva som osynliga conditionals i affärskod. Historisk pinning krävs för correction, receipts och legal defensibility.

**Exakt vad som ska uppnås**  
Publicera rulepacks och provider baselines som versionerade, effective-dated artefakter som varje affärsbeslut refererar till.

**Kodområden som påverkas**
- `packages/rule-engine/src/index.mjs`
- `packages/domain-vat/src/index.mjs`
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-hus/src/index.mjs`
- `packages/domain-tax-account/src/engine.mjs`
- `packages/domain-legal-form/src/index.mjs`
- `packages/domain-accounting-method/src/index.mjs`
- `packages/domain-fiscal-year/src/index.mjs`
- `packages/domain-annual-reporting/src/index.mjs`
- `docs/implementation-control/RULEPACK_IMPLEMENTATION_CATALOG.md`
- `docs/implementation-control/PROVIDER_PRIORITY_AND_REGULATORY_BASELINES.md`

**Behåll**
- rule-engine package
- separate domains for tax/VAT/HUS/legal form

**Förstärk / härda**
- date-based rules
- provider baseline management
- explanation payloads

**Skriv om**
- hard-coded annual rule changes into registry-driven publish flow

**Ersätt**
- implicit rule selection with explicit snapshot selection

**Ta bort / deprecate**
- free-form emergency logic without reason/evidence

**Migrera**
- existing records to pinned rulepack references

**Nya objekt**
- `RulepackVersion`
- `RulepackPublication`
- `ProviderBaselineVersion`
- `DecisionSnapshotRef`
- `EmergencyOverrideRequest`

**Source of truth**  
Rulepack registry is its own source for rules; business domains store snapshot refs only.

**State machines**  
RulepackVersion: `draft -> verified -> published -> retired`; EmergencyOverrideRequest: `raised -> approved -> active -> expired`.

**Commands**
- `publishRulepack`
- `publishProviderBaseline`
- `pinDecisionSnapshot`
- `requestEmergencyOverride`

**Events**
- `rulepack.published`
- `provider.baseline.published`
- `decision.snapshot.pinned`
- `override.activated`

**API-kontrakt / routefamiljer**
- Internal/admin APIs for registry publishing and read-only APIs for explanations

**Permissions och enforcement**  
Only compliance admin + domain owner can publish; emergency overrides need dual control and time limit.

**Review boundaries**  
Every annual rule change requires official source snapshot and sandbox verification before publish.

**Blockerande valideringar**  
['Payroll/VAT/HUS/annual may not progress without pinned rulepacks.']

**Audit / evidence**  
Every publish stores official source URL/date/checksum and reviewer approvals.

**Rulepacks / versionering / effective dating**  
Historical objects never retarget to newer rulepack automatically. Corrections create new decision snapshots but retain old refs.

**Testkrav**  
['date-boundary tests', 'same-input historical reproduction', 'override expiry tests']

**Migrations- och cutoverkrav**  
Backfill all live-eligible objects with snapshot refs before pilot.

**Runbooks som krävs**
- `docs/runbooks/rulepack-publication.md`
- `docs/runbooks/provider-baseline-update.md`

**Roadmap-delfaser och exakt implementation**
- **5.1 [NEW BUILD] Rulepack registry** — Inför versionerade rulepacks för VAT, payroll tax, employer contributions, benefits, mileage, HUS, tax account classification och legal form obligations. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **5.2 [NEW BUILD] Provider baseline registry** — Versionera XML-scheman, API-versioner, SRU-format, iXBRL/checksums, BankID, Peppol och bankfilformat med effectiveFrom/effectiveTo/checksum. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **5.3 [HARDEN] Historical pinning** — Varje beslut, journal, submission och annual package ska peka på rulepack-version och baseline-version som användes. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **5.4 [OPERATIONALIZE] Annual change calendar** — Inför process för regeluppdateringar, diff-review, sandbox-verifiering, staged publish och rollback. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **5.5 [REMOVE/DEPRECATE] Stoppa hårdkodade regulatoriska specialfall** — Ta bort fri `manual_rate`-logik som standard, hårdkodade SINK/avgiftsbrancher utan snapshot och ad hoc provider-switchar. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
All reglerad logik och alla providerformat går att spåra till version, baseline, effective dating och checksum.

## Fas 6 — Auth, identity, session trust, device trust och backoffice-boundaries

**Mål**  
Göra identitet, step-up, federation, impersonation och break-glass verkliga och separera customer-facing och backoffice-boundaries tekniskt.

**Varför fasen behövs**  
Auth och support write-flöden är för känsliga för att leva på stubbar och lösa boundaries.

**Exakt vad som ska uppnås**  
Implementera riktig svensk stark identitet, federation, session trust, device trust, challenge center, impersonation och break-glass.

**Kodområden som påverkas**
- `packages/auth-core/src/index.mjs`
- `packages/domain-org-auth/src/index.mjs`
- `apps/api/src/routes/auth-*.mjs (new)`
- `apps/api/src/routes/backoffice-*.mjs (new)`
- `docs/runbooks/bankid-provider-setup.md`
- `docs/implementation-control/AUTH_IDENTITY_SCOPE_AND_BACKOFFICE.md`

**Behåll**
- identity object model from auth spec
- roles/scopes/queue grants in org-auth

**Förstärk / härda**
- session revision, trust TTL, queue ownership, visibility reasoning

**Skriv om**
- current BankID stub integration
- support impersonation into explicit allowlisted sessions

**Ersätt**
- providerMode=stub with broker-backed provider adapter

**Ta bort / deprecate**
- implicit privilege escalation through federation or linking

**Migrera**
- existing users/roles/delegations to linked identity model

**Nya objekt**
- `IdentityAccount`
- `PersonIdentity`
- `SessionRevision`
- `ChallengeRequest`
- `DeviceTrustRecord`
- `ImpersonationSession`
- `BreakGlassSession`
- `AccessReviewBatch`

**Source of truth**  
Identity/membership truth remains org-auth; session/factor truth lives in auth-core; broker/provider refs live in integrations/auth adapter layer.

**State machines**  
ChallengeRequest: `pending -> completed | cancelled | expired`; ImpersonationSession: `requested -> approved -> active -> terminated | expired`; BreakGlassSession: `requested -> dual_approved -> active -> ended`.

**Commands**
- `enrollPasskey`
- `enrollTotp`
- `startBankIdChallenge`
- `completeChallenge`
- `createImpersonationSession`
- `approveBreakGlass`
- `runAccessReview`

**Events**
- `auth.factor.enrolled`
- `auth.challenge.completed`
- `impersonation.started`
- `break_glass.ended`
- `access_review.completed`

**API-kontrakt / routefamiljer**
- `/v1/auth/challenges`, `/v1/auth/devices`, `/v1/backoffice/impersonations`, `/v1/backoffice/break-glass`, `/v1/backoffice/access-reviews`

**Permissions och enforcement**  
Strong actions require `strong` or `strong_signed` trust; break-glass never grants direct database access.

**Review boundaries**  
Write-capable impersonation requires support lead + security admin; break-glass requires incident id and two-person approval.

**Blockerande valideringar**  
['No filing/payout/payroll approval/support write until trust model is active.']

**Audit / evidence**  
All factor enrollments, auth completions, linking and impersonation actions are audit critical.

**Rulepacks / versionering / effective dating**  
Sandbox and production credentials, callback domains, cookies and test identities are fully separate.

**Testkrav**  
['BankID sandbox/prod isolation', 'federation claim mapping', 'step-up TTL', 'allowlist enforcement', 'access review stale grant detection']

**Migrations- och cutoverkrav**  
Migrate identities with reversible linking; dry-run enterprise SSO mapping before enabling.

**Runbooks som krävs**
- `docs/runbooks/bankid-provider-setup.md`
- `docs/runbooks/support-impersonation.md`
- `docs/runbooks/break-glass.md`

**Roadmap-delfaser och exakt implementation**
- **6.1 [REPLACE] Byt BankID-stub mot auth broker** — Implementera auth broker med Signicat-baserad BankID-provider i v1, passkeys/TOTP lokalt och WorkOS eller likvärdig broker för enterprise federation. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **6.2 [NEW BUILD] Session trust och challenge center** — Inför `SessionRevision`, trustnivåer, fresh step-up, device trust, challenge completion receipts och action-specific TTL. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **6.3 [HARDEN] Scope, queue och visibility enforcement** — Search, notifications, activity, review/work ownership och API responses ska permission-trimmas server-side. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **6.4 [NEW BUILD] Impersonation, break-glass och access attestation** — Implementera tidsbegränsade, vattenmärkta sessions, dual approvals, allowlists och kvartalsvisa access reviews. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **6.5 [OPERATIONALIZE] Sandbox/prod isolation för identitet** — Separata credentials, callback-domäner, webhook-hemligheter och testidentiteter per mode. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
BankID/passkeys/TOTP fungerar, enterprise federation kan anslutas via broker, backoffice-write kräver korrekt approvals och step-up, och permissions är server-side enforced.

## Fas 7 — Tenant bootstrap, modulaktivering och trial/testkonto-system

**Mål**  
Skapa en separat källa för tenant bootstrap, module activation, finance readiness och trial/live-livscykel så att onboarding, demo, pilot och go-live blir säkra.

**Varför fasen behövs**  
Nuvarande onboarding skapar en del objekt men inte en full finance-ready eller trial-safe tenant. Trial kräver egen sanning och egen promotion path.

**Exakt vad som ska uppnås**  
Inför tenant/bootstrap/trial boundary som styr company setup, module activation, trial mode, promotion, pilot parallel run och live cutover.

**Kodområden som påverkas**
- `packages/domain-tenant-control/src/index.mjs (new)`
- `packages/domain-org-auth/src/index.mjs`
- `packages/domain-legal-form/src/index.mjs`
- `packages/domain-accounting-method/src/index.mjs`
- `packages/domain-fiscal-year/src/index.mjs`
- `packages/domain-ledger/src/index.mjs`
- `packages/domain-vat/src/index.mjs`
- `packages/domain-search/src/contracts.mjs`
- `apps/api/src/platform.mjs`
- `apps/api/src/routes/tenant-setup-routes.mjs (new)`

**Behåll**
- onboarding-run concepts in org-auth

**Förstärk / härda**
- company setup profiles, module activation dependencies

**Skriv om**
- onboarding from partial bootstrap to canonical finance-ready orchestration

**Ersätt**
- implicit demo tenant semantics with explicit trial mode semantics

**Ta bort / deprecate**
- promotion by copying trial ledger or provider refs into live

**Migrera**
- existing onboarding objects into tenant-control profiles

**Nya objekt**
- `TenantBootstrap`
- `CompanySetupProfile`
- `ModuleActivationProfile`
- `GoLivePlan`
- `TrialEnvironmentProfile`
- `SeedScenario`
- `PromotionPlan`
- `ParallelRunPlan`

**Source of truth**  
New `domain-tenant-control` owns mode, bootstrap, activation, promotion and parallel run. Org-auth owns identities and memberships only.

**State machines**  
CompanySetupProfile: `draft -> bootstrap_running -> finance_ready -> pilot -> production_live | suspended`; TrialEnvironmentProfile: `draft -> active -> reset_in_progress -> archived`; PromotionPlan: `draft -> validated -> approved -> executed | cancelled`.

**Commands**
- `createTenantBootstrap`
- `activateModule`
- `createTrialEnvironment`
- `resetTrialEnvironment`
- `promoteTrialToLive`
- `startParallelRun`

**Events**
- `tenant.bootstrap.completed`
- `module.activated`
- `trial.environment.reset`
- `trial.promoted_to_live`
- `parallel_run.started`

**API-kontrakt / routefamiljer**
- `/v1/tenant/bootstrap`, `/v1/tenant/modules`, `/v1/trial/environments`, `/v1/trial/promotions`

**Permissions och enforcement**  
Tenant admin and implementation lead roles only; promotion to live requires finance + security + implementation approval.

**Review boundaries**  
Promotion review checks masterdata completeness, no carried live-forbidden refs, and explicit carry-over policy.

**Blockerande valideringar**  
['Trial may never use live credentials, live submissions, live bank rails or real economic effect.']

**Audit / evidence**  
Trial creation/reset/promotion all emit auditable evidence with source scenario and carry-over selections.

**Rulepacks / versionering / effective dating**  
Promotion copies only approved masterdata and explicitly portable documents/settings. Ledger history, payroll runs, receipts, provider refs, tokens and trial evidence remain archived in trial tenant only.

**Testkrav**  
['trial isolation', 'reset idempotency', 'promotion negative tests', 'finance-ready bootstrap coverage per legal form']

**Migrations- och cutoverkrav**  
Live tenant born from promotion still requires cutover or import for balances, employees, banks and filings as appropriate.

**Runbooks som krävs**
- `docs/runbooks/trial-tenant-reset.md`
- `docs/runbooks/trial-promotion-to-live.md`
- `docs/runbooks/finance-ready-bootstrap.md`

**Roadmap-delfaser och exakt implementation**
- **7.1 [NEW BUILD] Inför `domain-tenant-control`** — Nytt package äger `TenantBootstrap`, `CompanySetupProfile`, `ModuleActivationProfile`, `GoLivePlan`, `TrialEnvironmentProfile`, `ParallelRunPlan`, `PromotionPlan`. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **7.2 [HARDEN] Bygg finance-ready bootstrap** — Legal form, accounting method, fiscal year, chart template, VAT profile, reporting obligation profile, role template och queue structure ska skapas i korrekt ordning. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **7.3 [NEW BUILD] Bygg trial/testkonto-isolering** — Trial tenants får eget mode, vattenmärkning, fake/sandbox providers, blocked live credentials och skydd mot verkliga ekonomiska konsekvenser. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **7.4 [NEW BUILD] Seed scenarios, reset och refresh** — Bygg deterministiska seed-scenarier per bolagstyp och reset/refresh utan att blanda trial-data med live-data. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **7.5 [MIGRATE] Bygg upgrade trial->live** — Promotion skapar ny live tenant/company profile från godkänd masterdata; trial ledger, receipts, provider refs och submissions får aldrig flyttas rakt in i live. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Tenant kan bli finance-ready eller trial-safe via samma orchestrator. Trial är marknadsmässig, säker och isolerad. Promotion till live är definierad och testad.

## Fas 8 — Legal form, accounting method, fiscal year, ledger, posting recipes och close-kärna

**Mål**  
Bygga den svenska bokföringskärnan som resten av systemet vilar på: legal form, periodkalender, posting recipes, voucher series, locks och correction/reopen.

**Varför fasen behövs**  
Legal form, accounting method, fiscal year and ledger are the irreversible foundation for every economic consequence in the platform.

**Exakt vad som ska uppnås**  
Lock journal semantics, posting recipes, voucher series, period locks and correction behavior so later domains can only produce booking intents, not freestyle journals.

**Kodområden som påverkas**
- `packages/domain-legal-form/src/index.mjs`
- `packages/domain-accounting-method/src/index.mjs`
- `packages/domain-fiscal-year/src/index.mjs`
- `packages/domain-ledger/src/index.mjs`
- `packages/domain-reporting/src/index.mjs`
- `apps/api/src/routes/ledger-*.mjs (new or refactored)`

**Behåll**
- ledger append-only principle
- fiscal year and accounting method as distinct domains

**Förstärk / härda**
- posting recipe registry
- voucher series
- reopen impact analysis
- close blockers

**Skriv om**
- any direct downstream posting that bypasses recipe engine

**Ersätt**
- manual reopen/correction paths with object-based requests

**Ta bort / deprecate**
- silent journal mutation after posted

**Migrera**
- existing posting flows to source-object and source-version references

**Nya objekt**
- `PostingRecipeVersion`
- `VoucherSeriesProfile`
- `ReopenRequest`
- `CorrectionPackage`
- `CloseBlocker`

**Source of truth**  
Ledger owns journals. Accounting method owns timing. Fiscal year owns periods/locks. Legal form owns obligations. Reporting owns snapshots only.

**State machines**  
ReopenRequest: `draft -> impact_assessed -> approved -> executed -> relocked`; CorrectionPackage: `draft -> approved -> posted`.

**Commands**
- `publishPostingRecipe`
- `lockPeriod`
- `requestReopen`
- `approveCorrectionPackage`
- `postHistoricalImport`

**Events**
- `ledger.journal.posted`
- `period.locked`
- `period.reopened`
- `correction.posted`

**API-kontrakt / routefamiljer**
- `/v1/ledger/journals`, `/v1/ledger/period-locks`, `/v1/close/reopen-requests`, `/v1/close/adjustments`

**Permissions och enforcement**  
Posting recipe admin separate from finance approver. Reopen needs finance close approval. Historical import needs cutover scope.

**Review boundaries**  
Year-end adjustments, reopen and manual journal corrections require explicit review.

**Blockerande valideringar**  
['No downstream domain may auto-post directly; they emit posting intents only.']

**Audit / evidence**  
Every journal binds recipe code, source object/version, fiscal period, voucher series and actor/session.

**Rulepacks / versionering / effective dating**  
Only approved adjustment objects may create year-end adjustments. Period lock blocks all mutating commands touching the period.

**Testkrav**  
['signal-to-ledger matrix', 'period lock negative tests', 'reopen impact tests', 'historical import balancing tests']

**Migrations- och cutoverkrav**  
Opening balances and historical journals use dedicated import journal types and require variance acceptance.

**Runbooks som krävs**
- `docs/runbooks/ledger-close-and-reopen.md`
- `docs/runbooks/historical-import-posting.md`

**Roadmap-delfaser och exakt implementation**
- **8.1 [HARDEN] Legal form profiles och reporting obligations** — Aktiebolag, ekonomisk förening, enskild firma, handels-/kommanditbolag med effective-dated obligations och signatory classes. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **8.2 [HARDEN] Accounting method och fiscal year** — Kontant/faktureringsmetod, brutet räkenskapsår, periodstater, lås, reopen-request och årsskiftesskydd. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **8.3 [NEW BUILD] Voucher series, chart governance och dimensionsdisciplin** — Serier, dimensionsset, cost centers, service lines och project dimensions ska vara låsta och versionsstyrda. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **8.4 [HARDEN] Posting recipe engine** — Signal-till-bokning-matris implementeras: AR/AP/payroll/bank/tax account/HUS/year-end adjustments. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **8.5 [OPERATIONALIZE] Close, reopen, reversal och correction engine** — Close blockers, signoff, reopen impact analysis, reversal/correction replacement och återlåsning. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Ledger är enda bokföringssanning. Periodlås, reopen, correction och legal-form-profiler fungerar och är versionsstyrda.

## Fas 9 — AR, AP, VAT, banking, tax account och document-posting gates

**Mål**  
Knyta dokument, leverantörer, kunder, bank och skattekonto till bokföringskärnan utan att tillåta otillåtna autopostningar eller fuzzy matching.

**Varför fasen behövs**  
AR/AP/VAT/banking/tax account are the daily operating spine. They must be tightly coupled to ledger but never allowed to auto-book from noisy upstream data.

**Exakt vad som ska uppnås**  
Implement safe commercial and cash movement chains with review boundaries and reconciliation.

**Kodområden som påverkas**
- `packages/domain-ar/src/index.mjs`
- `packages/domain-ap/src/index.mjs`
- `packages/domain-vat/src/index.mjs`
- `packages/domain-banking/src/index.mjs`
- `packages/domain-tax-account/src/index.mjs`
- `packages/domain-tax-account/src/engine.mjs`
- `packages/domain-ledger/src/index.mjs`
- `apps/api/src/routes/ar-*.mjs, ap-*.mjs, vat-*.mjs, banking-*.mjs, tax-account-*.mjs (new/refactored)`

**Behåll**
- separate AR/AP/VAT/tax-account domains

**Förstärk / härda**
- invoice/credit/payment chains
- VAT decisions
- bank statement import
- tax-account matching and discrepancy handling

**Skriv om**
- any ambiguous auto-match logic without review case

**Ersätt**
- simulated bank/tax account outcomes in live path

**Ta bort / deprecate**
- posting from OCR or statement line without approved domain object

**Migrera**
- open items, bank history, tax account history and payment references

**Nya objekt**
- `InvoiceSettlementLink`
- `PaymentBatch`
- `StatementImport`
- `VatDecision`
- `TaxAccountDiscrepancyCase`
- `OffsetSuggestion`

**Source of truth**  
AR owns customer invoice truth; AP owns supplier invoice truth; VAT owns VAT decisions; banking owns statements/payment orders; tax-account owns subledger and classifications.

**State machines**  
StatementLine match: `imported -> proposed_match -> approved_match -> posted | rejected`; TaxAccountDiscrepancyCase: `open -> reviewed -> resolved | waived`.

**Commands**
- `issueInvoice`
- `postSupplierInvoice`
- `approveStatementMatch`
- `lockVatReturn`
- `classifyTaxAccountEvent`
- `approveOffsetSuggestion`

**Events**
- `ar.invoice.issued`
- `ap.invoice.posted`
- `bank.statement.line.matched_and_approved`
- `vat.return.locked`
- `tax_account.event.classified_and_approved`

**API-kontrakt / routefamiljer**
- `/v1/ar/*`, `/v1/ap/*`, `/v1/vat/*`, `/v1/banking/*`, `/v1/tax-account/*`

**Permissions och enforcement**  
Finance operator vs approver split; tax-account discrepancy approval separate from ordinary bookkeeping.

**Review boundaries**  
Unmatched bank lines, uncertain VAT, conflicting tax account matches and HUS-related invoice splits require review.

**Blockerande valideringar**  
['VAT return lock, tax account open discrepancy or unresolved bank mismatch can block close and filings.']

**Audit / evidence**  
Statement imports, match approvals and tax-account classifications carry evidence fingerprints and actor approvals.

**Rulepacks / versionering / effective dating**  
No unmatched or ambiguous tax account event is posted automatically. Payment link settlement is not the same as bank match.

**Testkrav**  
['AR/AP/VAT/tax-account end-to-end', 'duplicate statement dedupe', 'partial offset', 'subscription invoice to revenue recognition basic coverage']

**Migrations- och cutoverkrav**  
Must import open items and tax account history with variance reports before first parallel run.

**Runbooks som krävs**
- `docs/runbooks/tax-account-difference-resolution.md`
- `docs/runbooks/bank-statement-and-payment-reconciliation.md`

**Roadmap-delfaser och exakt implementation**
- **9.1 [HARDEN] AR end-to-end** — Kundfakturor, kreditnotor, abonnemang, collection/payment links, allocations, reskontra, invoice readiness och revenue dimensions. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **9.2 [HARDEN] AP end-to-end** — Leverantörsfakturor, krediter, attest, matchning, payment prep och cost allocations med review gates. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **9.3 [HARDEN] VAT decision engine** — VAT source of truth, decision inputs/outputs, timing, lock/unlock, declaration basis och review boundaries. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **9.4 [NEW BUILD] Banking och payment rails** — Open banking, bankfiler, payment batches/orders, statement import, matchning, settlement liability mapping. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **9.5 [HARDEN] Tax account subledger** — Skattekontohändelser, import, klassificering, offset, discrepancy cases, liability match och reconciliation blockers. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **9.6 [HARDEN] Document-posting gates** — Inget dokument, statement eller tax event bokas förrän explicit affärsdomän har godkänt sakobjektet. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
AR/AP/VAT/banking/tax account fungerar end-to-end med review, reconciliation och blockers. Inga förbjudna autopostningar finns kvar.

## Fas 10 — Documents, OCR, classification, import cases och review center

**Mål**  
Göra document-to-decision-kedjan verklig: originaldokument, OCR, klassificering, import cases, review queues och evidence-hashar.

**Varför fasen behövs**  
Documents and OCR are entry points for AP, expense, payroll and support. They must be evidence-safe and never silently cause economic effects.

**Exakt vad som ska uppnås**  
Build canonical document chain from binary to approved downstream object, with OCR/classification suggestions and strong review controls.

**Kodområden som påverkas**
- `packages/domain-documents/src/index.mjs`
- `packages/document-engine/src/index.mjs`
- `packages/domain-document-classification/src/index.mjs`
- `packages/domain-document-classification/src/engine.mjs`
- `packages/domain-import-cases/src/index.mjs`
- `packages/domain-import-cases/src/engine.mjs`
- `packages/domain-review-center/src/index.mjs`
- `packages/domain-review-center/src/engine.mjs`

**Behåll**
- documents as source of originals
- import cases as separate boundary

**Förstärk / härda**
- OCR runs, extraction normalization, review linking

**Skriv om**
- stub OCR and simplistic sourceText assumptions

**Ersätt**
- textract/document stub with provider-backed canonical model

**Ta bort / deprecate**
- any path from OCR suggestion to posting without approval where rules require review

**Migrera**
- existing document metadata and import cases to canonical hashes and evidence refs

**Nya objekt**
- `DocumentVersion`
- `OcrRun`
- `ExtractionProjection`
- `ClassificationDecision`
- `ImportCase`
- `ImportCorrectionRequest`

**Source of truth**  
Documents own originals and versions; OCR and classification are derived, never primary truth.

**State machines**  
ImportCase: `draft -> intake_complete -> blocked_review -> approved -> applied | rejected`; OcrRun: `queued -> running -> completed | failed | superseded`.

**Commands**
- `uploadDocumentVersion`
- `startOcrRun`
- `applyClassificationDecision`
- `openImportCase`
- `approveImportCase`

**Events**
- `document.version.created`
- `ocr.run.completed`
- `classification.decision.applied`
- `import_case.approved`

**API-kontrakt / routefamiljer**
- `/v1/documents/*`, `/v1/documents/:id/ocr/runs`, `/v1/import-cases/*`, `/v1/review-center/*`

**Permissions och enforcement**  
Document viewers separate from approvers; payroll/finance/compliance reviews separated by queue grants.

**Review boundaries**  
Low confidence, ambiguous supplier/customer extraction, payroll-sensitive document types and HUS evidence always route through review as configured by rulepack.

**Blockerande valideringar**  
['Incomplete payment evidence, missing mandatory classification fields or open import blockers prevent downstream application.']

**Audit / evidence**  
Every OCR and review decision stores source document hash, provider reference, confidence stats and actor.

**Rulepacks / versionering / effective dating**  
Document approvals never mutate ledger directly; they only create or unlock downstream commands.

**Testkrav**  
['ocr low-confidence path', 'rerun and supersede', 'import blocker codes', 'review SLA escalation']

**Migrations- och cutoverkrav**  
Historical documents can be archive-imported without activating live downstream application until explicitly approved.

**Runbooks som krävs**
- `docs/runbooks/document-reprocessing.md`
- `docs/runbooks/import-case-review.md`

**Roadmap-delfaser och exakt implementation**
- **10.1 [HARDEN] Originaldokument och versionskedja** — Original, hash, checksum, source fingerprint, retention class och evidence refs. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **10.2 [REPLACE] Byt OCR-stub mot riktig provider** — Google Document AI eller vald baseline-adapter med confidence, rerun, page limits, async callback och low-confidence review. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **10.3 [HARDEN] Classification/extraction pipeline** — Canonical extraction model för AP, AR, payroll underlag, benefits/travel och attachments. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **10.4 [HARDEN] Import cases och blocker codes** — Completeness, blocking reasons, correction requests, human decisions och replay-safe mapping till downstream domain. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **10.5 [OPERATIONALIZE] Review center queues/SLA/escalation** — Riskklass, queue ownership, SLA, claim/start/reassign/decide/close och audit. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Dokument går från original till godkänt sakobjekt via spårbar OCR/extraction/review-kedja utan förbjudna autopostningar.

## Fas 11 — HR, time, balances, collective agreements och migration intake

**Mål**  
Göra people masterdata, time/absence, balances och avtalade regler till stabila inputs för payroll, projects och migration.

**Varför fasen behövs**  
People operations require stable snapshots of employment, time, balances and agreements; otherwise payroll and project profitability become legally or commercially wrong.

**Exakt vad som ska uppnås**  
Build a deterministic input layer for pay runs and project cost allocations, plus a centrally published collective-agreement catalog with support-managed intake, internal extraction/review and tenant-safe assignment.

**Kodområden som påverkas**
- `packages/domain-hr/src/index.mjs`
- `packages/domain-time/src/index.mjs`
- `packages/domain-balances/src/index.mjs`
- `packages/domain-balances/src/engine.mjs`
- `packages/domain-collective-agreements/src/index.mjs`
- `packages/domain-collective-agreements/src/engine.mjs`
- `packages/domain-core/src/migration.mjs`

**Behåll**
- separate HR/time/balances/agreements packages

**Förstärk / härda**
- effective-dated employment model
- absence and balance locking
- agreement assignment
- centrally published collective-agreement catalog and support-governed local supplements

**Skriv om**
- loosely coupled YTD and import assumptions

**Ersätt**
- manual pre-payroll spreadsheets with canonical snapshots

**Ta bort / deprecate**
- unapproved time as payroll or invoice truth

**Migrera**
- employee history, YTD, balances, agreement assignments

**Nya objekt**
- `EmploymentSnapshot`
- `ApprovedTimeSet`
- `AbsenceDecision`
- `BalanceAccount`
- `AgreementCatalogEntry`
- `AgreementIntakeCase`
- `AgreementAssignment`
- `LocalAgreementSupplement`
- `PayrollInputSnapshot`

**Source of truth**  
HR owns people/employment; time owns time/absence events; balances own leave and carryovers; agreements own published catalog, support-managed intake, rate/rule tables and local supplements. Tenant users may only assign published catalog entries or explicitly approved local supplements.

**State machines**  
EmploymentSnapshot is effective-dated, not workflow-driven; ApprovedTimeSet: `draft -> approved -> locked`; AgreementIntakeCase: `received -> extraction_in_progress -> review_pending -> approved_for_publication | approved_for_local_supplement | rejected`; AgreementCatalogEntry: `draft -> verified -> published -> superseded -> retired`; LocalAgreementSupplement: `draft -> review_pending -> approved -> superseded | retired`.

**Commands**
- `createEmployment`
- `approveTimeSet`
- `approveAbsenceDecision`
- `submitAgreementIntakeCase`
- `publishAgreementCatalogEntry`
- `approveLocalAgreementSupplement`
- `assignCollectiveAgreement`
- `assignPublishedCollectiveAgreement`
- `freezePayrollInputSnapshot`

**Events**
- `employment.snapshot.created`
- `time_set.approved`
- `balance.adjusted`
- `collective_agreement.intake.received`
- `collective_agreement.catalog.published`
- `collective_agreement.assigned`
- `collective_agreement.local_supplement.approved`

**API-kontrakt / routefamiljer**
- `/v1/hr/*`, `/v1/time/*`, `/v1/balances/*`, `/v1/collective-agreements/*`, `/v1/collective-agreements/catalog/*`, `/v1/backoffice/agreement-intake/*`

**Permissions och enforcement**  
HR operator vs payroll operator separation; agreement activation requires payroll approver or HR policy admin. Endast support/backoffice får skapa intake cases, publicera katalogposter och godkänna lokala supplements. Vanliga tenant-användare får inte ladda upp avtal i standardprodukt-UI; de får bara välja från publicerad dropdown-katalog eller från uttryckligen godkända lokala supplements.

**Review boundaries**  
Retroactive employment changes, balance corrections affecting closed periods, missing agreement assignments, nya avtal, avtalsextraktioner, lokala supplements och retroaktiva avtalsändringar kräver review.

**Blockerande valideringar**  
['No pay run if employment snapshot, tax decision or approved time set is missing.', 'No tenant may upload arbitrary collective-agreement files through standard UI.', 'No collective-agreement assignment may point to unpublished catalog entries or unapproved local supplements.']

**Audit / evidence**  
Employment changes and balance corrections must capture reason code and effective window. Agreement intake, AI-assisted extraction, review decisions, publication, supplement approval and assignment must all carry evidence refs, approver identities and effective windows.

**Rulepacks / versionering / effective dating**  
Attendance/personalliggare is never payroll time. Approved time is input, not direct pay result. Every published agreement catalog entry maps to one or more pinned rulepack versions; local supplements create explicit overlay versions without mutating the published base agreement.

**Testkrav**  
['employment timeline', 'absence lock post signoff', 'agreement rule application', 'support-managed agreement intake', 'published dropdown assignment restrictions', 'local supplement overlay behavior', 'YTD import variance']

**Migrations- och cutoverkrav**  
Legacy time and YTD imports must reconcile against source payroll reports before pilot payroll.

**Runbooks som krävs**
- `docs/runbooks/hr-masterdata-cutover.md`
- `docs/runbooks/collective-agreement-intake.md`
- `docs/runbooks/collective-agreement-activation.md`

**Roadmap-delfaser och exakt implementation**
- **11.1 [HARDEN] HR/employment source of truth** — Employee, employment, organization placement, salary basis, cost center, service line och effective dating. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **11.2 [HARDEN] Time, absence och balances** — Approved time inputs, absence types, carryovers, leave locks och AGI-sensitive absence boundaries. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **11.3 [HARDEN] Collective agreement catalog och engine** — Centralt publicerat avtalsbibliotek, supportstyrd intake av nya avtal, intern AI-assisterad extraktion med mänsklig payroll/compliance-approval, publicerad dropdown-selektion, agreement assignment, effective dates, pay item derivation, rate tables, lokala supplements och override governance. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **11.4 [MIGRATE] Payroll-adjacent history import** — Employee master, employment history, YTD, balances, AGI history, benefits/travel history och evidence mapping. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **11.5 [NEW BUILD] Payroll input snapshots** — Lås input fingerprints och snapshot objects som pay run senare konsumerar. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Payroll, projects och review kan lita på HR/time/balances/agreements som canonical inputs med effective dating, publicerad avtalskatalog, supportstyrda lokala tillägg och importstöd.

## Fas 12 — Payroll, AGI, benefits, travel, pension, salary exchange och Kronofogden

**Mål**  
Bygga svensk produktionssäker lön med tabellskatt/jämkning/SINK, employer contributions, benefits, travel, pension och löneutmätning.

**Varför fasen behövs**  
Payroll is the most dangerous domain to overestimate. It needs precise statutory decisions, immutable versions and safe correction chains.

**Exakt vad som ska uppnås**  
Make payroll legally correct, reproducible and operationally safe from input freeze through AGI-ready output and bank/tax consequences.

**Kodområden som påverkas**
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-benefits/src/index.mjs`
- `packages/domain-travel/src/index.mjs`
- `packages/domain-pension/src/index.mjs`
- `packages/domain-tax-account/src/index.mjs`
- `packages/domain-search/src/contracts.mjs`
- `apps/api/src/routes/payroll-*.mjs (new/refactored)`

**Behåll**
- broad payroll object model, AGI object orientation, correction chain direction

**Förstärk / härda**
- calculation ordering, fingerprints, tax decisions, contribution decisions, benefit/tax classification, pay run approvals

**Skriv om**
- ordinary preliminary tax logic
- SINK fallback handling
- garnishment and remittance integration

**Ersätt**
- manual_rate default and stub receipts in live path

**Ta bort / deprecate**
- free-form payroll overrides without decision objects and audit

**Migrera**
- existing pay runs and AGI objects to pinned decision snapshots

**Nya objekt**
- `TaxDecisionSnapshot`
- `EmployerContributionDecisionSnapshot`
- `PayRunFingerprint`
- `AgiVersion`
- `GarnishmentDecisionSnapshot`
- `RemittanceInstruction`

**Source of truth**  
Payroll owns pay run, AGI constituents and correction chain. Travel/benefits/pension supply approved inputs; tax account consumes liabilities later.

**State machines**  
PayRun: `draft -> calculated -> reviewed -> approved -> posted -> corrected | cancelled`; AgiVersion: `draft -> ready_for_sign -> submitted -> technically_accepted | technically_rejected -> materially_accepted | materially_rejected -> corrected`.

**Commands**
- `calculatePayRun`
- `approvePayRun`
- `postPayRun`
- `createCorrectionRun`
- `lockAgiVersion`
- `submitAgiVersion`
- `registerGarnishmentDecision`

**Events**
- `payroll.run.calculated`
- `payroll.run.posted`
- `payroll.agi.version.locked`
- `payroll.agi.submitted`
- `garnishment.decision.registered`

**API-kontrakt / routefamiljer**
- `/v1/payroll/runs`, `/v1/payroll/agi/*`, `/v1/payroll/garnishments/*`, `/v1/benefits/*`, `/v1/travel/*`, `/v1/pension/*`

**Permissions och enforcement**  
Payroll operator, payroll approver, compliance reviewer; dual control for emergency tax fallback and garnishment overrides.

**Review boundaries**  
Manual emergency tax, missing SINK decision, mixed contribution uncertainty, unclear benefits classification, retroactive corrections into closed periods all require review.

**Blockerande valideringar**  
['No live payroll without tax snapshot, contribution snapshot, approved time/absence and open period.']

**Audit / evidence**  
Every tax decision, override, benefit classification and AGI version stores evidence and snapshot refs.

**Rulepacks / versionering / effective dating**  
Preliminary tax must come from official table/jämkning/engångsskatteprofil or SINK decision; emergency manual only as exceptional path. Garnishment after tax only, from decision snapshot + annual rulepack.

**Testkrav**  
['monthly payroll golden scenarios', 'SINK renewal', 'benefit thresholds 2026', 'travel/mileage', 'salary exchange', 'garnishment', 'AGI correction chain']

**Migrations- och cutoverkrav**  
Payroll history import must preserve YTD, previous AGI refs and correction capability before first live month.

**Runbooks som krävs**
- `docs/runbooks/payroll-correction-and-agi-replay.md`
- `docs/runbooks/garnishment-remittance.md`

**Roadmap-delfaser och exakt implementation**
- **12.1 [REPLACE] Byt `manual_rate` som standard** — Inför `TaxDecisionSnapshot` med tabell, jämkning, engångsskatt, SINK och emergency manual endast med dual review. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **12.2 [HARDEN] Employer contributions och växa-stöd** — Implementera ålderslogik, reducerade nivåer, blandade component-split och växa-stöd via skattekonto/decision snapshots. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **12.3 [HARDEN] Pay run engine och AGI constituents** — Fingerprints, ordering, posting intents, payment batch, immutable AGI version, changed-employee flags. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **12.4 [HARDEN] Benefits, net deductions, travel, mileage** — Skatteklassificering, nettolöneavdrag, traktamente, milersättning, expense split och review codes. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **12.5 [HARDEN] Pension och salary exchange** — Policy, effective dating, pension basis, special payroll tax, provider export instruction. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **12.6 [NEW BUILD] Kronofogden/löneutmätning** — Decision snapshots, förbehållsbelopp, protected amount, remittance liability, payment order och audit chain. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **12.7 [OPERATIONALIZE] Payroll trial guards** — Trial mode får producera hela pay-run/AGI-kedjan men endast mot non-live receipts, non-live bank rails och watermarked evidence. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Produktionssäker svensk payroll-logik finns inklusive tabellskatt/jämkning/SINK, AGI constituents, benefits/travel/pension och Kronofogden-remittance.

## Fas 13 — HUS, regulated submissions, receipts/recovery, declarations och annual reporting

**Mål**  
Slutföra alla reglerade submission-kedjor: AGI, VAT, HUS, annual reporting/declarations med receipts, recovery, correction och tax-account-koppling.

**Varför fasen behövs**  
Receipts, replay and legal effect are central to AGI, VAT, HUS and annual filing. Mixing them into generic integrations keeps them synthetic and hard to reason about.

**Exakt vad som ska uppnås**  
Implement canonical regulated submissions and full filing/recovery behavior across domains.

**Kodområden som påverkas**
- `packages/domain-regulated-submissions/src/index.mjs (new)`
- `packages/domain-hus/src/index.mjs`
- `packages/domain-annual-reporting/src/index.mjs`
- `packages/domain-vat/src/index.mjs`
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-integrations/src/index.mjs`
- `packages/domain-tax-account/src/index.mjs`
- `apps/api/src/routes/submissions-*.mjs (new)`
- `apps/api/src/routes/hus-*.mjs, annual-reporting-*.mjs, declarations-*.mjs (refactored)`

**Behåll**
- HUS domain, annual reporting domain, canonical receipt ideas from existing docs

**Förstärk / härda**
- envelope/attempt/receipt/correction/evidence
- signoff and hash locking
- reconciliation to tax account and ledger

**Skriv om**
- simulated transport and receipt collection in live path
- mixed submission concerns in generic integrations

**Ersätt**
- synthetic provider outcome injection with adapter-mediated official transport or sanctioned fallback

**Ta bort / deprecate**
- silent correction over existing payload version

**Migrera**
- existing submission objects to canonical regulated-submissions package

**Nya objekt**
- `SubmissionEnvelope`
- `SubmissionAttempt`
- `SubmissionReceipt`
- `SubmissionActionQueueItem`
- `SubmissionCorrectionLink`
- `SubmissionEvidencePack`

**Source of truth**  
Business domains own payload truth; domain-regulated-submissions owns transport lifecycle, receipts and recovery metadata.

**State machines**  
SubmissionEnvelope: `draft -> locked -> queued -> submitted -> awaiting_receipts -> technically_accepted | technically_rejected -> materially_accepted | materially_rejected -> corrected | abandoned`.

**Commands**
- `lockSubmissionEnvelope`
- `dispatchSubmission`
- `collectSubmissionReceipts`
- `planSubmissionReplay`
- `openCorrectionLink`
- `freezeSubmissionEvidencePack`

**Events**
- `submission.locked`
- `submission.dispatched`
- `submission.receipt.collected`
- `submission.corrected`
- `submission.replayed`

**API-kontrakt / routefamiljer**
- `/v1/submissions/*`, `/v1/hus/*`, `/v1/annual-reporting/*`, `/v1/declarations/*`

**Permissions och enforcement**  
Submission signing and final dispatch require `strong_signed`; replay and abandonment restricted to compliance/backoffice roles.

**Review boundaries**  
Technical accept but material reject always opens review. Replay of previously accepted payload denied; correction required instead.

**Blockerande valideringar**  
['No submission if payload hash mismatches signoff, payment evidence missing, or prior discrepancy unresolved.']

**Audit / evidence**  
Every attempt and receipt persists provider ref, payload hash, actor, mode and legal effect flag.

**Rulepacks / versionering / effective dating**  
Technical receipt is never equal to final legal acceptance. Correction always means new payload version. Trial submissions always set `legalEffect=false`.

**Testkrav**  
['AGI/VAT/HUS/annual transport matrix', 'replay same payload idempotency', 'correction chain', 'partial HUS acceptance and recovery', 'annual signatory mismatch']

**Migrations- och cutoverkrav**  
Historical filings imported immutable; new corrections build from canonical package copies, not edited history.

**Runbooks som krävs**
- `docs/runbooks/submission-replay-and-recovery.md`
- `docs/runbooks/hus-claim-recovery.md`
- `docs/runbooks/annual-filing-correction.md`

**Roadmap-delfaser och exakt implementation**
- **13.1 [HARDEN] HUS/ROT/RUT lifecycle** — Verified payment, locked fields, buyer allocation, deadlines, XML/direct transport, decisions, partial acceptance, recovery. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **13.2 [NEW BUILD] Submission envelope/attempt/receipt core** — Canonical objects för envelope, attempt, receipt, correction link, action queue item, evidence pack. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **13.3 [REPLACE] Byt simulerad transport mot riktiga adapters** — AGI, Moms, HUS och annual filing använder riktiga transportsätt eller explicita official fallbacks med samma canonical payload. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **13.4 [HARDEN] Annual package, declarations och signoff** — Locked report snapshots, package hash, legal form profile, signatory chain, SRU/iXBRL/official API handling. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **13.5 [HARDEN] Receipt, replay, dead-letter och recovery** — Technical vs material receipt, idempotent replay, correction-only new payload, operator interventions och reconciliation rules. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **13.6 [NEW BUILD] Trial-safe regulated simulators** — Trial mode får only-simulate official transport med deterministic fake receipts, explicit `legalEffect=false` och audit watermarks. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Alla reglerade flöden går via samma receipt/recovery-modell. HUS, AGI, VAT och annual filing är transport- och operator-mässigt kompletta.

## Fas 14 — Generell project core, CRM-linked commercial chain, profitability, portfolio, field och vertikala packs

**Mål**  
Bygga projektfältet som generell projekt- och uppdragsmotor för alla branscher, med CRM-handoff, resource/portfolio/profitability och valbara field/personalliggare/ID06-pack ovanpå.

**Varför fasen behövs**  
Projects is where market position will be won or lost outside pure finance. The system must support all project-based companies, not only construction.

**Exakt vad som ska uppnås**  
Build a general project-commercial core with CRM-linked handoff, profitability, resource/capacity/portfolio and optional vertical packs for field, attendance, ID06 and checklists.

**Kodområden som påverkas**
- `packages/domain-projects/src/index.mjs`
- `packages/domain-kalkyl/src/index.mjs`
- `packages/domain-field/src/index.mjs`
- `packages/domain-personalliggare/src/index.mjs`
- `packages/domain-id06/src/index.mjs`
- `packages/domain-egenkontroll/src/index.mjs`
- `packages/domain-ar/src/index.mjs`
- `packages/domain-ap/src/index.mjs`
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-hus/src/index.mjs`
- `packages/domain-search/src/contracts.mjs`
- `apps/api/src/routes/projects-*.mjs, operations-*.mjs, workplaces-*.mjs, id06-*.mjs (new/refactored)`

**Behåll**
- existing project core objects
- existing field/personalliggare/ID06 pack split

**Förstärk / härda**
- general project core
- profitability model
- pack boundaries
- offline conflict semantics

**Skriv om**
- construction-first assumptions
- work-order-first defaulting
- missing CRM-commercial handoff

**Ersätt**
- project as only operational object with layered engagement/commercial model

**Ta bort / deprecate**
- field/mobile logic as universal source of work truth

**Migrera**
- existing field/build objects to sit on top of general project IDs and engagement IDs

**Nya objekt**
- `Project`
- `Engagement`
- `WorkModel`
- `WorkPackage`
- `DeliveryMilestone`
- `WorkLog`
- `CostAllocation`
- `RevenuePlan`
- `ProfitabilitySnapshot`
- `ProjectDeviation`
- `ProjectEvidenceBundle`
- `OpportunityLink`
- `QuoteLink`
- `ChangeOrder`
- `BillingPlan`
- `ResourceReservation`
- `PortfolioNode`
- `ProjectStatusUpdate`
- `ProjectRisk`

**Source of truth**  
Project commercial truth lives in project core. CRM is upstream context only. Field/attendance/ID06 packs never redefine project commercial semantics.

**State machines**  
Project: `draft -> active -> on_hold -> completed -> financially_closed -> archived`; ChangeOrder: `draft -> priced -> approved -> applied | rejected`; ResourceReservation: `draft -> reserved -> confirmed -> released`.

**Commands**
- `createProject`
- `createEngagement`
- `approveRevenuePlan`
- `recordWorkLog`
- `approveCostAllocation`
- `convertQuoteToProject`
- `createChangeOrder`
- `reserveCapacity`
- `materializeProfitabilitySnapshot`
- `createOperationalCase`
- `recordAttendanceEvent`
- `validateId06Card`

**Events**
- `project.created`
- `project.engagement.created`
- `project.change_order.approved`
- `project.profitability.materialized`
- `operations.case.completed`
- `attendance.event.recorded`
- `id06.card.validated`

**API-kontrakt / routefamiljer**
- `/v1/projects/*`, `/v1/operations/*`, `/v1/workplaces/*`, `/v1/id06/*`, `/v1/projects/portfolio/*`

**Permissions och enforcement**  
Project manager, operations coordinator, field operator, personalliggare operator, ID06 coordinator; none of these grant ledger/payroll filing rights by default.

**Review boundaries**  
Change orders affecting pricing or HUS eligibility, manual profitability adjustments, invoice readiness disputes, attendance corrections and ID06 exceptions all require review cases.

**Blockerande valideringar**  
['No generic project release until consulting, service, retainer and construction scenarios all pass. No field pack assumptions in pure consulting/service flows.']

**Audit / evidence**  
Change orders, signatures, evidence captures, attendance corrections and ID06 validations all carry evidence refs and actor/session details.

**Rulepacks / versionering / effective dating**  
Billing models must support fixed price, T&M, milestone, retainer, subscription service, advance invoice and hybrid. Profitability must unify payroll/AP/material/travel/HUS/billing. Attendance is not payroll time.

**Testkrav**  
['consulting project', 'retainer capacity', 'service order with signature', 'construction workplace with ID06 and attendance', 'change order margin impact', 'forecast vs actual']

**Migrations- och cutoverkrav**  
Import projects, open work, unbilled time, customer refs, quotes and profitability baselines from selected external systems.

**Runbooks som krävs**
- `docs/runbooks/project-cutover.md`
- `docs/runbooks/field-offline-conflicts.md`
- `docs/runbooks/personalliggare-correction.md`
- `docs/runbooks/id06-verification.md`

**Roadmap-delfaser och exakt implementation**
- **14.1 [HARDEN] General project-commercial core** — Project, Engagement, WorkModel, WorkPackage, DeliveryMilestone, WorkLog, CostAllocation, RevenuePlan, ProfitabilitySnapshot, ProjectDeviation, ProjectEvidenceBundle. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **14.2 [NEW BUILD] CRM-linked handoff** — Opportunity/quote-to-project conversion, change order chain, billing plan, status updates, customer context och acceptance handoff från CRM utan att göra CRM till source of truth. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **14.3 [NEW BUILD] Billing models och WIP/profitability** — Fixed price, time & materials, milestone, retainer capacity, subscription service, advance invoice, hybrid change order och profitability från payroll/AP/material/travel/HUS/billing. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **14.4 [NEW BUILD] Resource, portfolio och riskstyrning** — Capacity reservations, assignment planning, skills/roles, project portfolio, risk register, status updates, budget vs actual vs forecast. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **14.5 [HARDEN] Field/service/work-order pack** — OperationalCase, DispatchAssignment, MaterialUsage, FieldEvidence, SignatureRecord, SyncEnvelope, ConflictRecord. Work orders ska vara optional pack. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **14.6 [HARDEN] Personalliggare, ID06 och egenkontroll packs** — Attendance som separat sanning, ID06 identity graph, workplace bindings, checklist/signoff, construction pack som vertikal overlay. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **14.7 [NEW BUILD] Project trial/demo flows och migration** — Seed project scenarios, import from CRM/project tools, client-ready demo data, safe invoicing simulation och eventual live conversion path. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Project core fungerar för konsult, byrå, service, installation, maintenance, construction, campaign och supportprogram utan att tvinga byggsemantik på alla. Profitability är verklig. Field/personalliggare/ID06 är layer-packs.

## Fas 15 — Reporting, search, object profiles, saved views, notifications, activity och work items

**Mål**  
Materialisera read models, operator views och separata objektfamiljer som framtida UI och backoffice ska vila på.

**Varför fasen behövs**  
The product needs a backend-first operator experience. Search, object profiles, workbenches and notifications/activity/work items are the bridge from domain truth to UI truth.

**Exakt vad som ska uppnås**  
Materialize stable read models, search ACLs and operator contracts across finance, payroll, compliance, projects, support and migration.

**Kodområden som påverkas**
- `packages/domain-reporting/src/index.mjs`
- `packages/domain-search/src/contracts.mjs`
- `packages/domain-search/src/index.mjs`
- `packages/domain-review-center/src/index.mjs`
- `packages/domain-notifications/src/index.mjs`
- `packages/domain-activity/src/index.mjs`
- `packages/domain-core/src/index.mjs`

**Behåll**
- object profile/workbench philosophy
- separate families for notifications/activity/work items

**Förstärk / härda**
- projection ownership, ACL trimming, saved views, queue dashboards

**Skriv om**
- any search ACL duplication or ad hoc view assembly

**Ersätt**
- UI-specific data shaping with canonical profile/workbench contracts

**Ta bort / deprecate**
- any domain using search as source of truth

**Migrera**
- existing saved views and read models to projection registry/versioning

**Nya objekt**
- `ReadModelRegistryEntry`
- `ObjectProfile`
- `WorkbenchDefinition`
- `SavedView`
- `NotificationDigest`
- `QueueOwnershipSnapshot`

**Source of truth**  
Reporting/search are derived only. Source of truth stays in domains; object profiles/workbenches are canonical read contracts.

**State machines**  
SavedView: `draft -> published -> superseded -> archived`; Notification: `queued -> sent | failed | snoozed | expired`.

**Commands**
- `publishWorkbenchDefinition`
- `materializeReportSnapshot`
- `saveView`
- `buildNotificationDigest`
- `assignWorkItem`

**Events**
- `report.snapshot.materialized`
- `workbench.published`
- `saved_view.saved`
- `notification.sent`
- `work_item.assigned`

**API-kontrakt / routefamiljer**
- `/v1/search/*`, `/v1/workbenches/*`, `/v1/saved-views/*`, `/v1/notifications/*`, `/v1/activity/*`, `/v1/work-items/*`

**Permissions och enforcement**  
Search and workbench visibility resolved server-side by org-auth scopes and object grants; support views separated from tenant views.

**Review boundaries**  
Publishing breaking workbench changes requires compatibility review because UI and API consumers depend on them.

**Blockerande valideringar**  
['No UI or operator cockpit until these read models are stable.']

**Audit / evidence**  
Search denials, sensitive visibility reasons and work item escalations are auditable.

**Rulepacks / versionering / effective dating**  
Read models must rebuild from source events. Saved views must be versioned and migration-safe.

**Testkrav**  
['projection rebuild', 'saved view compatibility', 'search ACL', 'notification digest timing', 'queue ownership']

**Migrations- och cutoverkrav**  
Projection registry must support versioned rebuild through pilot upgrades.

**Runbooks som krävs**
- `docs/runbooks/search-index-rebuild-and-repair.md`
- `docs/runbooks/workbench-compatibility.md`

**Roadmap-delfaser och exakt implementation**
- **15.1 [HARDEN] Reporting snapshots och metrics** — Trial balance, P&L, balance sheet, cashflow, open items, payroll reports, project portfolio, tax account summary och submission dashboards. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **15.2 [HARDEN] Search, object profiles och workbenches** — Permission-trimmade object profiles, blockers, sections, actions, workbench composition och saved views. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **15.3 [HARDEN] Notifications och activity som egna familjer** — Recipient, channel, digest, snooze, escalation och append-only activity feeds. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **15.4 [HARDEN] Work items, queues och ownership** — Queue grants, SLA, escalation, assignment, dual-control blockers och operator views. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **15.5 [NEW BUILD] Project/finance/compliance mission control** — Portfolio dashboards, close blockers, payroll submission monitoring, cutover dashboards, trial conversion dashboard. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Read models och workbench-kontrakt finns för alla kritiska operatörsytor. Search är aldrig source of truth men alltid korrekt permission-trimmad.

## Fas 16 — Integrationsplattform, public API, partner API, webhooks och prioriterade provideradapters

**Mål**  
Göra integrationslagret verkligt: connections, credentials, consent, provider health, public sandbox, partner ops, signed webhooks och rätt adapterordning.

**Varför fasen behövs**  
Integrations are a product category of their own here: ecosystem parity, regulated transport, public APIs and demo/trial safety all depend on a real adapter layer.

**Exakt vad som ska uppnås**  
Build real integrations control-plane and prioritized providers/adapters with contract tests, health checks, replay and environment isolation.

**Kodområden som påverkas**
- `packages/domain-integrations/src/index.mjs`
- `packages/domain-integrations/src/public-api.mjs`
- `packages/domain-integrations/src/partners.mjs`
- `packages/domain-integrations/src/providers/*.mjs (new)`
- `apps/api/src/routes/public-api-*.mjs, partners-*.mjs, webhooks-*.mjs (new/refactored)`
- `docs/implementation-control/INTEGRATIONS_API_EVENTS_AND_WEBHOOKS.md`
- `docs/implementation-control/PUBLIC_PARTNER_API_AND_WEBHOOK_PAYLOAD_CATALOG.md`

**Behåll**
- public API sandbox catalog concept
- webhook signing/retry direction
- partner connection catalog concept

**Förstärk / härda**
- credential storage, health checks, fallback modes, contract-test packs, webhook sequencing

**Skriv om**
- synthetic executors in live path
- generic crm provider assumptions into explicit provider manifests

**Ersätt**
- stubbed finance/auth/document providers with real adapters

**Ta bort / deprecate**
- shared sequence spaces or credentials across sandbox/test/prod

**Migrera**
- existing client/subscription/provider refs into canonical connection models

**Nya objekt**
- `IntegrationConnection`
- `CredentialSetMetadata`
- `ConsentGrant`
- `IntegrationOperation`
- `OperationReceipt`
- `WebhookSubscription`
- `WebhookDelivery`
- `AdapterCapabilityManifest`

**Source of truth**  
Business domains own business truth. Integrations own credentials, consents, provider refs, delivery state and transport operations only.

**State machines**  
IntegrationOperation: `queued -> running -> succeeded | failed | fallback | rate_limited | retry_scheduled`; WebhookDelivery: `queued -> running -> sent | failed | dead_lettered | suppressed | disabled`.

**Commands**
- `createIntegrationConnection`
- `authorizeConsent`
- `dispatchIntegrationOperation`
- `runAdapterContractTest`
- `dispatchWebhookDeliveries`
- `rotateClientSecret`

**Events**
- `integration.connection.authorized`
- `integration.operation.succeeded`
- `webhook.delivery.sent`
- `partner.contract_test.completed`

**API-kontrakt / routefamiljer**
- `/v1/integrations/*`, `/v1/public-api/*`, `/v1/partners/*`, `/v1/webhooks/*`, `/v1/public/sandbox/catalog`

**Permissions och enforcement**  
Integration admin, API admin, partner operator. Business roles never mutate credentials directly.

**Review boundaries**  
Provider activation for live mode requires domain owner + security review + contract tests green.

**Blockerande valideringar**  
['No adapter is live until its domain gates are green and sandbox/prod isolation is proven.']

**Audit / evidence**  
Credential and consent changes, fallback activation, rate-limited retries and replay all write audit.

**Rulepacks / versionering / effective dating**  
Provider IDs never become source-of-truth IDs. Trial-safe adapters may only emit `supportsLegalEffect=false`. CRM/project adapters may enrich but not replace core project/finance truth.

**Testkrav**  
['contract tests per provider', 'rate limit handling', 'signature verification', 'sandbox/prod isolation', 'fallback paths']

**Migrations- och cutoverkrav**  
Existing API clients and subscriptions rotated with deprecation windows and secret rollover.

**Runbooks som krävs**
- `docs/runbooks/provider-cutover-and-secret-rotation.md`
- `docs/runbooks/public-api-verification.md`
- `docs/runbooks/partner-adapter-contract-tests.md`

**Roadmap-delfaser och exakt implementation**
- **16.1 [HARDEN] Integration core, credentials och consent** — Capability manifest, credential metadata, consent grant, health checks, rate limits, fallback modes, environment isolation. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **16.2 [HARDEN] Public API och sandbox catalog** — Client credentials, scope catalog, versioned spec, sandbox catalog, report snapshots, tax account summary, example webhook events. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **16.3 [HARDEN] Partner API, contract tests och adapter health** — Connection catalog, operation dispatch, async jobs, retry/dead-letter/replay, contract-test packs per adapter. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **16.4 [REPLACE] Byt simulerade finance-adapters mot verkliga** — Enable Banking, bankfil/ISO20022, Stripe, Pagero, Google Document AI, Postmark, Twilio, Pleo, official tax transports. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **16.5 [HARDEN] Auth/signing/federation adapters** — Signicat, WorkOS, passkey/TOTP, signing/evidence archive. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **16.6 [NEW BUILD] CRM/project ecosystem adapters i rätt ordning** — HubSpot först, Teamleader sedan, monday/Asana/ClickUp import/sync därefter, Zoho och Odoo som project-billing-källor, Dynamics senare enterprise-spår. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **16.7 [NEW BUILD] Trial-safe adapter layer** — Alla adapters måste ha `trial_safe`, `sandbox_supported`, `supportsLegalEffect` och receipt-mode så att trial aldrig kan skapa live-ekonomi eller live-filings. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Public API/webhooks är stabila, partner adapters har contract tests, prioriterade providers är live där domängater tillåter, och trial/prod är strikt separerade.

## Fas 17 — Operations, backoffice, support, migration, cutover, parallel run och trial/live drift

**Mål**  
Slutföra operator- och supportsystemet: incidents, support cases, replay, dead-letter, submission monitoring, migration cockpit, cutover och trial/live operations.

**Varför fasen behövs**  
Strong domains still fail commercially if migration, support, incidents, replay and cutover are not first-class operations.

**Exakt vad som ska uppnås**  
Turn support/backoffice and migration/cutover into real productized control planes with masked data, approvals and evidence.

**Kodområden som påverkas**
- `packages/domain-core/src/migration.mjs`
- `packages/domain-core/src/index.mjs`
- `packages/domain-review-center/src/index.mjs`
- `packages/domain-notifications/src/index.mjs`
- `packages/domain-activity/src/index.mjs`
- `packages/domain-search/src/contracts.mjs`
- `apps/worker/src/worker.mjs`
- `apps/api/src/routes/backoffice-*.mjs, migration-*.mjs, incidents-*.mjs (new/refactored)`

**Behåll**
- existing migration cockpit concepts
- break-glass and support case direction
- submission monitoring idea

**Förstärk / härda**
- masked support views
- incident state machines
- variance reports
- cutover plans
- parallel-run diffing

**Skriv om**
- any support process that assumes database access or silent manual fix

**Ersätt**
- spreadsheet cutover management with canonical cockpit evidence

**Ta bort / deprecate**
- untracked support writes

**Migrera**
- existing cutover plans, diff reports and acceptance records into canonical migration core

**Nya objekt**
- `SupportCase`
- `Incident`
- `ReplayOperation`
- `SubmissionMonitorSnapshot`
- `ImportBatch`
- `MappingSet`
- `VarianceReport`
- `CutoverEvidenceBundle`
- `CutoverChecklistItem`
- `ParallelRunResult`

**Source of truth**  
Domain-core migration/control-plane owns import/cutover artifacts; support/backoffice own cases and incidents; business objects remain in respective domains.

**State machines**  
Incident: `open -> mitigated -> resolved -> postmortem_complete`; CutoverPlan: `draft -> freeze_started -> final_extract_done -> import_complete -> accepted -> switched | rolled_back`.

**Commands**
- `openSupportCase`
- `openIncident`
- `planReplayOperation`
- `createMappingSet`
- `registerImportBatch`
- `createCutoverPlan`
- `recordCutoverSignoff`
- `startCutover`
- `recordParallelRunResult`

**Events**
- `support.case.opened`
- `incident.opened`
- `migration.import_batch.registered`
- `migration.cutover.started`
- `parallel_run.completed`

**API-kontrakt / routefamiljer**
- `/v1/backoffice/*`, `/v1/incidents/*`, `/v1/migration/*`

**Permissions och enforcement**  
Support lead, support admin, security admin, incident commander, implementation lead, cutover approver; scopes separated from tenant business roles.

**Review boundaries**  
Write-capable support, rollback decision and cutover acceptance all need dual or chained approvals.

**Blockerande valideringar**  
['No pilot or general live switch until cutover and rollback are rehearsed and green.']

**Audit / evidence**  
All support actions, masking overrides, replay operations, variance waivers and cutover signoffs are audit critical.

**Rulepacks / versionering / effective dating**  
Parallel run is mandatory for payroll, finance, HUS, personalliggare and project profitability when source quality or regulatory risk demands it.

**Testkrav**  
['masked support tests', 'incident escalation tests', 'cutover rehearsal', 'rollback rehearsal', 'parallel run thresholds']

**Migrations- och cutoverkrav**  
This phase is the cutover engine. It must produce reusable evidence bundles per migration cohort.

**Runbooks som krävs**
- `docs/runbooks/migration-cutover.md`
- `docs/runbooks/parallel-run-and-diff.md`
- `docs/runbooks/support-case-and-replay.md`

**Roadmap-delfaser och exakt implementation**
- **17.1 [HARDEN] Support case, incident, replay och dead-letter ops** — Support scopes, masked data views, replay planning, dead-letter triage, incident commander flows, submission monitoring. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **17.2 [HARDEN] Backoffice-gränser och evidence** — Write-capable impersonation allowlists, break-glass, masking, session watermarks, evidence packs och export for audit. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **17.3 [HARDEN] Migration cockpit och acceptance** — Mapping sets, import batches, variance reports, acceptance records, cutover plans, signoff chains, rollback points. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **17.4 [OPERATIONALIZE] Parallel run och diff motor** — Finance, payroll, HUS, personalliggare och project profitability parallel runs med diff thresholds och manual acceptance. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **17.5 [NEW BUILD] Trial/live operations split** — Separata queuevyer, support policies, alerts, dashboards, reset rights, promotion workflows och sales/demo analytics. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **17.6 [NEW BUILD] Market-winning cutover concierge** — Guided migration, source extract checklist, rehearsals, automated variance report, signoff evidence, rollback drill. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Support och backoffice kan driva systemet utan direkt DB-access. Cutover, rollback, parallel run och trial/live drift är bevisade i test och pilot.

## Fas 18 — Pilot, enterprise gate, competitor parity, competitor advantage och UI-readiness

**Mål**  
Bevisa att backend-kontrakten bär verkliga kundscenarier, låsa UI-kontrakt och öppna go-live först efter parity, advantage och enterprise-gater är passerade.

**Varför fasen behövs**  
The product should only go live after pilots, parity scorecards, operator evidence and frozen UI contracts prove that the backend is real.

**Exakt vad som ska uppnås**  
Run pilots, freeze UI contracts and verify parity/advantage before general launch.

**Kodområden som påverkas**
- `tests/e2e/*.mjs`
- `tests/integration/*.mjs`
- `docs/test-plans/*`
- `apps/desktop-web/src/server.mjs`
- `apps/field-mobile/src/server.mjs`
- `packages/domain-search/src/contracts.mjs`
- `docs/runbooks/*`

**Behåll**
- extensive test suite
- shell apps as temporary host surfaces only

**Förstärk / härda**
- pilot cohorts
- UI contract freeze
- parity scoring
- advantage release bundle

**Skriv om**
- any launch narrative based on docs or shells instead of green gates

**Ersätt**
- ad hoc pilot validation with scored gates and evidence

**Ta bort / deprecate**
- implicit go-live assumptions when one vertical looks green

**Migrera**
- test plans into final pilot/acceptance matrix

**Nya objekt**
- `ParityScorecard`
- `PilotCohort`
- `UiContractFreezeRecord`
- `AdvantageReleaseBundle`
- `GeneralAvailabilityDecision`

**Source of truth**  
These are release-governance artifacts; source truth for business data remains in domains.

**State machines**  
PilotCohort: `planned -> running -> accepted | rejected`; GeneralAvailabilityDecision: `draft -> reviewed -> approved | blocked`.

**Commands**
- `startPilotCohort`
- `recordParityScorecard`
- `freezeUiContract`
- `approveGeneralAvailability`

**Events**
- `pilot.started`
- `parity.scorecard.recorded`
- `ui.contract.frozen`
- `release.approved`

**API-kontrakt / routefamiljer**
- Read-only release governance APIs are optional; most release artifacts live in governance/backoffice surfaces.

**Permissions och enforcement**  
Release admin, product owner, architecture owner, compliance owner, support lead and security owner must co-sign GA for regulated scope.

**Review boundaries**  
Any red parity or enterprise gate blocks GA even if subsets are green.

**Blockerande valideringar**  
['No general live launch until parity and regulatory gates are green.']

**Audit / evidence**  
Each pilot outcome and GA decision includes evidence bundle, cohort data and rollback preparedness.

**Rulepacks / versionering / effective dating**  
Limited release allowed only if scope is explicitly restricted and red domains are disabled. General release requires green parity in all hygiene domains.

**Testkrav**  
['pilot acceptance matrix', 'ui contract snapshot tests', 'trial-to-live end-to-end', 'enterprise auth/security review']

**Migrations- och cutoverkrav**  
Every pilot cohort must produce reusable cutover templates and rollback evidence before GA.

**Runbooks som krävs**
- `docs/runbooks/pilot-execution.md`
- `docs/runbooks/general-availability-decision.md`

**Roadmap-delfaser och exakt implementation**
- **18.1 [OPERATIONALIZE] Intern dogfood + finance pilot** — Kör eget bolag/egna testbolag genom finance, VAT, payroll, HUS, tax account, annual och supportflöden. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **18.2 [OPERATIONALIZE] Pilotkohorter per segment** — AB med ekonomi+lön, service/projektbolag, HUS-bolag, construction/service med personalliggare/ID06, enterprise SSO-kund. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **18.3 [NEW BUILD] Competitor parity board** — Mät svart på vitt parity mot Fortnox, Visma, Bokio, Wint, Teamleader, monday, Asana, ClickUp, Zoho, Odoo, Bygglet, Byggdagboken. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **18.4 [NEW BUILD] Competitor advantage release pack** — Släpp differentiators: tax account cockpit, unified receipts/recovery, migration concierge, safe trial-to-live, project profitability mission control. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **18.5 [HARDEN] UI readiness contract freeze** — Lås object profiles, workbenches, commands, blockers, list/read/detail/action contracts och permission reasons för desktop/backoffice/field. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.
- **18.6 [OPERATIONALIZE] Final go-live gate** — Release checklist: technical, regulated, support, migration, security, parity, advantage, trial-sales readiness. Påverkar kodområdena ovan och är inte klar förrän dess respektive objekt, commands, events, permissions och tester finns implementerade enligt denna fas.

**Exit gate**  
Pilots har klarats, enterprise gate är grön, parity är uppnådd i kärnområden, differentiators är live eller påslagna, och UI-kontrakten är frozen.


## Appendix A — Exakt normativ logik för bokföring, moms, skatt, lön, AGI, Kronofogden, HUS, skattekonto och annual reporting

### A.1 Journaltyper

Följande journaltyper är tillåtna:

- `operational_posting`
- `settlement_posting`
- `payroll_posting`
- `tax_account_posting`
- `year_end_adjustment`
- `reversal`
- `correction_replacement`
- `historical_import`

Alla journaler ska binda till:

- voucher series
- fiscal year
- accounting period
- source object
- source object version
- posting recipe code
- rulepack version
- actor/session context

### A.2 Signal-till-bokning-matris

#### Kundfaktura
Signal: `ar.invoice.issued`

Bokning:
- debit kundfordran
- credit intäkt
- credit utgående moms
- om HUS-reduktion används med reducerat kundbelopp: dela fordran i kundfordran och HUS-fordran enligt HUS-reglerna

#### Kundkredit
Signal: `ar.credit_note.issued`

Bokning:
- debit intäktsreduktion
- debit utgående moms
- credit kundfordran eller återbetalningsskuld beroende på läge

#### Leverantörsfaktura
Signal: `ap.invoice.posted`

Bokning:
- debit kostnad eller tillgång
- debit ingående moms när avdragsrätt finns
- credit leverantörsskuld

#### Leverantörskredit
Signal: `ap.credit_note.posted`

Bokning:
- credit kostnads- eller tillgångsreduktion
- credit ingående momsreduktion
- debit leverantörsskuld eller återbetalningsfordran

#### Lönekörning
Signal: `payroll.run.posted`

Bokning:
- debit lönekostnad
- debit arbetsgivaravgiftskostnad
- credit personalskatteskuld
- credit nettolöneskuld
- credit skuld för arbetsgivaravgifter
- credit eller debit övriga nettolöneavdrag, benefits clearing och pensionsrelaterade skulder beroende på utfall
- salary exchange reducerar kontant bruttolön men skapar pensionsinstruktion och särskild löneskatt där tillämpligt

#### Bankutbetalning eller inbetalning
Signal: `bank.payment_order.settled` eller `bank.statement.line.matched_and_approved`

Bokning:
- debit/credit bankkonto
- motbokning mot kundfordran, leverantörsskuld, nettolöneskuld, skatteskuld eller annan settlement liability

#### Skattekontohändelse
Signal: `tax_account.event.classified_and_approved`

Bokning:
- debit/credit skattekonto-clearing
- debit/credit skatteskuld, moms, kostnadsränta, intäktsränta eller annan skatterelaterad skuld/fordran enligt klassificering
- unmatched eller oklar händelse bokas inte automatiskt

#### HUS-utfall
Signaler:
- `hus.claim.accepted`
- `hus.claim.partially_accepted`
- `hus.recovery.confirmed`

Bokning:
- vid accepterad claim: debit bank eller HUS-clearing, credit HUS-fordran
- vid delgodkännande: acceptera del bokas som ovan; restbelopp blir kundfordran eller discrepancy case
- vid återkrav: debit kundfordran eller HUS-recovery-fordran, credit tidigare HUS-intäkt/fordran-clearing beroende på ursprung

#### Year-end adjustments
Signal: `close.adjustment.approved`

Bokning:
- endast från explicit adjustment object
- periodiseringar, avskrivningar, omklassningar, upplupna poster och skattetransaktioner via godkänt adjustment case

### A.3 Det som aldrig får bokas automatiskt

- bokningar direkt från OCR
- bokningar direkt från klassificeringsförslag
- bokningar direkt från tax account discrepancy detection
- bokningar från personalliggare eller ID06
- bokningar från tidsrapport utan payroll- eller faktureringsregel
- bokningar från AI-anomalier
- bokningar från webhook eller partner call utan explicit affärsdomäns command
- bokningar från HUS-draft
- bokningar från annual package-draft

### A.4 Periodlås, reopen, reversal och correction

- `period_locked` nekar alla commands som ändrar perioden
- `ReopenRequest` måste räkna impact på VAT, AGI, HUS, tax account settlement och annual packages
- reopen får endast godkännas av finance close approval
- correction görs som reversal eller correction replacement, aldrig genom tyst mutation
- efter correction ska perioden återlåsas

### A.5 Accounting method och fiscal year

#### Kontantmetod
- intäkter/kostnader påverkar i huvudsak bokföring när betalning sker enligt tillåten policy
- AR/AP-objekt får fortfarande finnas som kommersiell sanning, men ledger timing styrs av accounting method

#### Faktureringsmetod
- AR/AP bokförs vid fakturapostering och sedan vid settlement

#### Byten
- accounting method change får bara ske genom effective-dated change request
- historik skrivs aldrig över
- change request måste räkna om vilka perioder och rapporter som påverkas

#### Fiscal year
- räkenskapsår måste definiera periodkalender och close-ordning
- brutet räkenskapsår stöds genom explicit year profile, inte ad hoc datumlogik

### A.6 Momslogik

`vat` är enda source of truth för momsbeslut.

VAT decision inputs ska minst omfatta:
- ledger lines och klassificerade källtransaktioner
- VAT codes och taxability
- accounting method timing
- credit note mirror rules
- correction/reopen status
- import/export or special regime flags där relevant

VAT decision output ska minst innehålla:
- beslut per period
- belopp per deklarationsruta
- rulepack version
- payload hash för submission
- review blockers
- evidence refs

Submission rules:
- return får inte submitas förrän period är låst
- correction efter inlämning skapar ny version
- same payload replay är idempotent; ändrad payload kräver correctionflow

### A.7 Lönelogik och beräkningsordning

Pay run får endast beräknas från:
- aktiv employment snapshot
- approved time and absence inputs
- active balance accounts
- active collective agreement assignment
- approved benefit decisions
- approved travel and mileage decisions
- statutory tax decision snapshot
- employer contribution decision snapshot
- approved garnishment decision snapshot när tillämpligt

Beräkningsordning:

1. lås pay-run scope och input fingerprints
2. ladda employments och statutory profiles per utbetalningsdatum
3. materialisera fasta lönerader
4. materialisera godkända rörliga lönerader
5. materialisera förmåner och traktamenten
6. beräkna bruttolön
7. tillämpa salary exchange och bruttolöneavdrag enligt aktiv policy
8. beräkna skattepliktig lön
9. välj preliminärskatt eller SINK enligt tax decision snapshot
10. beräkna arbetsgivaravgifter enligt employer contribution decision snapshot
11. beräkna nettolöneavdrag och utmätningsbelopp
12. beräkna nettolön
13. skapa AGI constituents
14. skapa posting intents
15. skapa payment batch
16. lås pay run fingerprint

### A.8 Preliminärskatt

Huvudregel:
- preliminär skatt ska beräknas från officiell skattetabell, jämkningsbeslut eller godkänd engångsskatteprofil för betalningsdatumet
- `manual_rate` får endast användas som emergency fallback med dual review och reason code

`TaxDecisionSnapshot` måste bära:
- `decision_type`: `tabell`, `jamkning`, `engangsskatt`, `sink`, `emergency_manual`
- `income_year`
- `valid_from`
- `valid_to`
- `municipality_code`
- `table_code`
- `column_code`
- `adjustment_fixed_amount`
- `adjustment_percentage`
- `decision_source`
- `decision_reference`
- `evidence_ref`

Regler:
- ordinarie månadslön använder tabell eller jämkning
- engångsbelopp använder engångsskatt enligt beslutsprofil
- sidoinkomst och extra utbetalningar följer beslutssnapshot, inte fri manuell procentsats
- om SINK saknas men kan vara relevant ska systemet använda lagstadgad fallback och öppna review case

### A.9 SINK

- SINK gäller endast när beslut finns för begränsat skattskyldig mottagare
- från 2026-01-01 är SINK 22,5 %
- nytt beslut krävs per inkomstår
- om beslut saknas när SINK skulle kunna gälla: använd tvingande fallback enligt lag och öppna review case

### A.10 Arbetsgivaravgifter och växa-stöd

`EmployerContributionDecisionSnapshot` ska bära:
- `decision_type`
- `age_bucket`
- `legal_basis_code`
- `valid_from`
- `valid_to`
- `base_limit`
- `full_rate`
- `reduced_rate`
- `special_conditions`

Regler:
- full arbetsgivaravgift 2026: 31,42 %
- personer som fyllt 67 vid årets ingång 2026: 10,21 %
- tillfällig nedsättning 2026-04-01 till 2027-09-30 för 19–23 år vid årets ingång: 20,81 % upp till 25 000 kr per månad; överstigande del med full avgift
- blandad avgiftsnivå inom samma person/månad ska delas i contribution components
- växa-stöd ska modelleras som särskild decision snapshot och skattekontokonsekvens, inte bara som dold procentsats

### A.11 AGI

`payroll` äger AGI constituents och submission periods.

AGI version ska lagra:
- employee-level constituents
- changed-employee flags
- payload hash
- signature chain
- technical receipt
- material decision
- correction links

Regler:
- AGI byggs från approved/posted pay runs
- AGI-sensitive absence får inte ändras efter `ready_for_sign`
- rättelse skapar ny AGI version; tidigare version ligger kvar immutable
- deklarationsdag följer bolagets rapportklass och periodregler (ordinarie 12:e eller 26:e där regler kräver)

### A.12 Benefits / förmåner

Varje förmånsbeslut klassificeras i minst:
- skattefri
- skattepliktig men ej avgiftspliktig
- skattepliktig och avgiftspliktig
- kräver nettolöneavdrag
- kräver lönerevision eller manuell review

Verifierade 2026-nivåer som ska ligga i rulepack:
- friskvård skattefritt endast inom 5 000 kr/år och övriga villkor
- julgåva 600 kr
- jubileumsgåva 1 800 kr
- minnesgåva 15 000 kr
- kostförmån 2026: frukost 62 kr, lunch/middag 124 kr, helt fri kost 310 kr
- bilförmån ringa privat användning: högst 10 tillfällen och högst 100 mil/år

### A.13 Nettolöneavdrag, resor, traktamente, pension och salary exchange

- nettolöneavdrag uppstår endast från explicit beslut eller approved payroll adjustment
- traktamente/milersättning räknas i `travel` och konsumeras i `payroll`
- skattefri/skattepliktig del separeras före AGI mapping
- pension base beräknas från policy- och agreement-styrda lönekomponenter
- salary exchange kräver aktivt avtal, effective dating, minsta kvarvarande nivå enligt policy och särskild löneskatt där tillämpligt

### A.14 Kronofogden / löneutmätning

- löneutmätning beräknas efter preliminär skatt
- source of truth är Kronofogdens beslutssnapshot
- protected amount / förbehållsbelopp hämtas från beslut + årsspecifikt rulepack
- fri manuell överskrivning är förbjuden utan dual review
- remittering till Kronofogden blir särskild skuld och payment order
- följande ska lagras:
  - beslutssnapshot
  - hushållsprofil
  - protected amount baseline
  - beräknat utmätningsbelopp
  - remittance instruction
  - settlement / returned / corrected state

### A.15 HUS / ROT / RUT

Claim får bara skapas när:
- arbete är klassificerat som godkänt HUS-arbete
- kundfaktura är utfärdad med alla lagkrav uppfyllda
- kundens betalning är verifierad
- obligatoriska uppgifter om köpare, fastighet/BRF, arbetskostnad, material och timmar är låsta
- ansökan inkommer senast 31 januari året efter betalningsåret

Rulepack 2026 ska minst innehålla:
- kombinerat HUS-tak 75 000 kr per person och år
- ROT 30 % av arbetskostnaden från 2026-01-01
- proportionalitetsregler för partial payments

Claim version måste frysa:
- köpare och id
- utförarens organisationsnummer
- faktura-id
- service type/legal classification
- arbetskostnad inklusive moms
- materialkostnad
- timmar
- arbetsdatum
- betalningsdatum och betalt belopp per köpare
- fastighets-/BRF-uppgifter
- begärt belopp
- payload hash

### A.16 Skattekonto

`tax-account` är separat subledger och ska spegla Skatteverkets händelser som egen objektmodell.

Regler:
- import kräver source fingerprint + dedupe key
- auto-match får bara ske när liability match är entydig
- partial offset är tillåten
- unmatched eller conflicting match skapar discrepancy case och close blocker
- differensbokning kräver review approval
- reconciliation ska ske mot:
  - AGI liabilities
  - VAT liabilities
  - special payroll tax
  - räntor och avgifter

### A.17 Legal form, declarations och annual reporting

Legal form families som minst måste stödjas:
- aktiebolag
- enskild näringsverksamhet
- handelsbolag
- kommanditbolag
- ekonomisk förening

Reporting obligations:
- aktiebolag: årsredovisning + Inkomstdeklaration 2
- ekonomisk förening: årsredovisning enligt profil + Inkomstdeklaration 2
- enskild firma: NE/NEA
- handels-/kommanditbolag: Inkomstdeklaration 4 och ev. årsredovisningsplikt enligt profile

Annual package rules:
- package byggs bara från låsta report snapshots
- package har evidence pack med source fingerprints
- signoff sker på låst package hash
- correction skapar ny package version
- filing skiljer technical receipt, domain acceptance och final outcome

### A.18 Review boundaries och blockerande valideringar

Blockera flödet när:
- posting intent saknar recipe eller rulepack
- period är låst
- accounting method eller fiscal year saknas
- VAT decision är oklar
- tax decision snapshot saknas för payroll
- AGI-sensitive absence ändrats efter signoff
- HUS claim saknar komplett betalningsbevis
- submission payload hash inte matchar signoff
- tax account discrepancy är öppen vid close
- annual package saknar legal form profile eller reporting obligation profile

### A.19 Receipts, replay och recovery

- alla regulatoriska submissions använder samma envelope/receipt-modell
- replay av samma payloadversion ska vara idempotent mot transportlagret
- correction kräver ny payloadversion
- dead-letter får inte lösa affärsfel
- recovery måste knytas till source object, submission version och economic consequence

## Appendix B — Exakt integrationsordning, providerstrategi och kontraktskrav

### B.1 Bindande integrationsprinciper

1. Business object IDs får aldrig ersättas av provider IDs.
2. Samma affärskontrakt ska kunna köras i `sandbox`, `test`, `trial` och `production`; providerskillnad kapslas i adapter.
3. Alla adapters måste exponera capability manifest, contract-test pack, retry policy, health check, dead-letter strategy, replay safety och `supportsLegalEffect`.
4. Varje adapter måste ha explicit `modeMatrix`:
   - `trial_safe`
   - `sandbox_supported`
   - `test_supported`
   - `production_supported`
   - `supportsLegalEffect`
5. Contract tests måste köras mot sandbox eller simulator innan live-aktivering.

### B.2 Prioriterad providerordning

#### Wave 1 — måste finnas före bred go-live
- BankID/eID och signering: Signicat via auth broker
- Enterprise federation: WorkOS eller likvärdig broker
- Passkeys/TOTP: in-house via `auth-core`
- Open banking: Enable Banking
- Bankfiler: ISO 20022 `pain.001`, `camt.053`, `camt.054`, Bankgirot/Autogiro där behövligt
- PSP/payment links: Stripe
- Peppol/e-faktura: Pagero Online
- OCR: Google Document AI Invoice Parser + generell OCR
- Notifications: Postmark (e-post), Twilio (SMS), pushadapter
- Spend/cards: Pleo eller likvärdig current API
- AGI transport: officiell Skatteverket-kanal
- Moms transport: officiell Skatteverket-kanal eller officiell XML fallback
- HUS transport: officiell Skatteverket-kanal eller officiell signed XML fallback
- Annual filing/declarations: officiell Bolagsverket/Skatteverket/SRU-kedja
- CRM/project adapters: HubSpot först, Teamleader sedan

#### Wave 2 — parity plus expansion
- monday.com import/sync
- Asana import/sync
- ClickUp import/sync
- Zoho CRM/Projects/Billing
- Odoo project/time-and-materials migration/integration
- Dynamics 365 Project Operations enterprise integration
- Direkt BankID-adapter endast vid tydligt behov; affärskärnan ska fortfarande prata auth broker

### B.3 Adapterkatalog och ägande

- `packages/domain-integrations/src/providers/signicat-bankid.mjs`
- `packages/domain-integrations/src/providers/workos-federation.mjs`
- `packages/domain-integrations/src/providers/enable-banking.mjs`
- `packages/domain-integrations/src/providers/iso20022-files.mjs`
- `packages/domain-integrations/src/providers/stripe-payment-links.mjs`
- `packages/domain-integrations/src/providers/pagero-peppol.mjs`
- `packages/domain-integrations/src/providers/google-document-ai.mjs`
- `packages/domain-integrations/src/providers/postmark-email.mjs`
- `packages/domain-integrations/src/providers/twilio-sms.mjs`
- `packages/domain-integrations/src/providers/pleo-spend.mjs`
- `packages/domain-integrations/src/providers/skatteverket-agi.mjs`
- `packages/domain-integrations/src/providers/skatteverket-vat.mjs`
- `packages/domain-integrations/src/providers/skatteverket-hus.mjs`
- `packages/domain-integrations/src/providers/bolagsverket-annual.mjs`
- `packages/domain-integrations/src/providers/hubspot-crm.mjs`
- `packages/domain-integrations/src/providers/teamleader-focus.mjs`
- `packages/domain-integrations/src/providers/monday-work-management.mjs`
- `packages/domain-integrations/src/providers/asana.mjs`
- `packages/domain-integrations/src/providers/clickup.mjs`
- `packages/domain-integrations/src/providers/zoho-crm-projects.mjs`
- `packages/domain-integrations/src/providers/odoo-projects.mjs`
- `packages/domain-integrations/src/providers/dynamics-project-operations.mjs`

### B.4 Contract-test minimum per adapter

Varje adapter måste testas för:

- happy path
- auth/credential failure
- throttling/rate limit
- duplicate delivery / duplicate callback
- timeout
- malformed payload
- replay safe path
- dead-letter path
- sandbox/prod mix-up prevention
- correlation and idempotency propagation

### B.5 Exakta source-of-truth-regler per integrationsområde

- Bank/open banking: `banking` äger statement/payment truth, `integrations` äger consent/provider refs
- Payment links: `ar` äger invoice/payment requirement, adapter speglar PSP events
- Peppol: `ar`/`ap` äger invoice truth, adapter äger serialization/delivery receipts
- OCR: `documents` äger original, adapter äger extraction run
- BankID/federation: `org-auth`/`auth-core` äger identity/session truth, adapter äger provider order/collect refs
- CRM/project: `projects` och `ar` äger project/invoice truth; CRM är upstream context/handoff only
- Official filings: payload truth i business domain, transport and receipts in regulated submissions/integrations

### B.6 Webhook contract rules

- sekvensnummer per subscription och mode
- signering med HMAC eller detached signature enligt adapterklass
- standard headers:
  - `X-Correlation-Id`
  - `X-Request-Timestamp`
  - `X-Signature`
  - `X-Delivery-Id`
  - `X-Sequence-No`
- retries med exponential backoff inom policy
- dead-letter efter max attempts
- consumer contract måste tåla duplicate deliveries

### B.7 Driftansvar

- Domain owner ansvarar för canonical payload
- Integration owner ansvarar för adapter, credentials, health checks, contract tests, fallback policy
- Support/backoffice ansvarar för replay/dead-letter/operator intervention
- Compliance owner ansvarar för official baselines och regulatorisk versionering

## Appendix C — Exakt trial/testkonto-system

### C.1 Syfte

Trial-systemet är inte en snygg demo. Det är en säker, säljbar, verifierbar produktmiljö där kund kan prova riktiga arbetsflöden utan verkliga ekonomiska eller regulatoriska konsekvenser.

### C.2 Trial-object model

Nya eller explicit härdade objekt:

- `TrialEnvironmentProfile`
- `SeedScenario`
- `TrialWatermarkPolicy`
- `TrialProviderPolicy`
- `TrialResetRequest`
- `PromotionPlan`
- `PortableDataBundle`
- `PromotionValidationReport`

`TrialEnvironmentProfile` ska minst bära:
- `trialEnvironmentId`
- `tenantId`
- `companyId`
- `seedScenarioCode`
- `watermarkCode`
- `providerPolicyCode`
- `supportsRealCredentials` = false
- `supportsLegalEffect` = false
- `status`
- `expiresAt`
- `resetCount`
- `promotionEligibleFlag`

State:
`draft -> active -> reset_in_progress -> expired | archived | promotion_in_progress`

### C.3 Isolering

Trial ska isoleras på alla lager:

#### Identitet
- separata callback-domäner och cookies
- separata auth credentials
- testidentiteter eller trial accounts
- support sessions watermarkade som `TRIAL`

#### Data
- separat tenant/company namespace
- separat sequence space
- separat evidence- och receipt-klass
- trial data får aldrig blandas i production read models

#### Providers
- endast `trial_safe` adapters
- live credentials förbjudna
- adapters som saknar sandbox måste ersättas av simulatoradapter i trial
- `supportsLegalEffect=false` på alla trial submissions och trial payment rails

#### Ekonomisk effekt
- trial ledger tillåts som intern bokföringssanning i trial-tenant, men aldrig som live ekonomisk effekt
- inga riktiga bankutbetalningar
- inga riktiga AGI/VAT/HUS/annual filings
- inga riktiga skattekontohämtningar eller live offsets
- inga riktiga PSP settlements

### C.4 Trial provider strategy

Trial adapters ska returnera realistiska men tydligt märkta receipts:

- bank: syntetiska statements, synthetic payment settlement refs
- payroll/AGI: synthetic technical and material receipts marked `legalEffect=false`
- HUS: synthetic claim decisions with deterministic acceptance/partial acceptance/recovery scenarios
- annual: synthetic filing receipts
- OCR: genuine OCR against sandbox documents is allowed if provider supports safe sandbox, otherwise simulator
- webhooks/public API: fully functioning sandbox catalog with watermarked data

### C.5 Seed scenarios

Minst följande seed scenarios ska finnas:

1. `service_company_basic`
2. `consulting_time_and_milestone`
3. `salary_employer_with_agi`
4. `hus_eligible_services_company`
5. `project_service_with_field_pack`
6. `construction_service_pack`
7. `retainer_capacity_agency`
8. `trade_and_supplier_invoices`

Varje scenario ska leverera:
- legal form
- chart template
- VAT setup
- employees and employments where relevant
- documents and OCR samples
- projects and invoices where relevant
- synthetic statements and tax account data where relevant
- work items, notifications and review examples

### C.6 Reset and refresh

Reset ska:
- terminera öppna trial sessions
- arkivera gammal trial data eller förkasta enligt retention policy
- återställa seed scenario deterministiskt
- skapa nytt reset evidence bundle
- inte påverka andra tenants

Refresh ska kunna:
- fylla på nya dokument, work items och extra seed data
- bevara valda masterdata men nollställa processdata efter policy

### C.7 Upgrade / promotion from trial to live

Promotion är inte in-place. Den ska skapa ny live-tenant eller nytt live-company profile genom explicit kopiering av tillåten data.

Får kopieras:
- company masterdata
- användare/roller efter ny approval
- kunder/leverantörer om de godkänts
- projekttemplates
- chart selections
- settings
- utvalda dokument markerade som portable

Får aldrig kopieras direkt:
- trial journals
- trial payroll runs
- trial submissions or receipts
- provider refs/tokens/consents
- trial evidence packs
- synthetic bank/tax-account events
- synthetic support artifacts

Promotionflow:
1. kör `PromotionValidationReport`
2. välj carry-over policy
3. skapa live tenant/company
4. importera portable data via canonical imports
5. konfigurera riktiga credentials och registreringar
6. kör finance-ready validation
7. starta parallel run eller direct live according to go-live plan

### C.8 Support/backoffice separation for trial

- trial support queue separat från production support queue
- reset rights endast för särskild support/admin-roll
- write-capable support i trial får aldrig läcka över till live-tenants
- dashboards måste visa trial counts, expiry, promotion pipeline, reset volumes och stuck trial flows

### C.9 Evidence, banners, watermarks and permissions

Även utan slutlig UI-design ska alla responses och read models bära:
- `mode`
- `supportsLegalEffect`
- `watermarkCode`
- `promotionEligibleFlag`

All exported evidence från trial ska innehålla:
- tydlig trial watermark
- no legal effect statement
- seed scenario code
- synthetic receipt marker

### C.10 Trial as market-winning capability

Trial ska slå marknaden genom att ge:
- verkliga finance/payroll/project flows without legal risk
- deterministic reset
- safe promotion to live
- prebuilt role-based scenarios
- demonstrerbar project profitability, compliance cockpit och support workbench
- bättre sales-to-onboarding-handoff än konkurrenterna

## Appendix D — Exakt hur project core och projektfältet ska byggas för alla branscher

### D.1 Benchmark som är bindande

#### Work management / portfolio / resource benchmarks
- monday.com — unified work platform, portfolios, resource visibility, AI risk detection
- Asana — portfolios, goals, resource/time tracking, workload
- ClickUp — timesheets, workload, approvals, hierarchy, docs/chat/time reporting

#### CRM-linked project execution
- Teamleader Focus — CRM + quotations + projects + work orders + time + invoicing
- Zoho CRM/Projects/Billing — deal-triggered project start, client context, timesheets, project billing
- HubSpot — connected CRM, custom objects, workflows, project tracking inside customer context

#### Project operations / service ERP
- Dynamics 365 Project Operations — quote, costing, pricing, resource scheduling, time/expense, pro forma invoicing, project finance
- Odoo — time and materials, project/task/timesheet/expense -> invoice, field worksheet/signature

#### Vertical field/build references only
- Bygglet
- Byggdagboken

Dessa är referenser för field/personalliggare/ID06/evidence/offline, inte för hela produkten.

### D.2 Bindande designprincip

Project core ska byggas som **general project-commercial core first**.  
Work orders, service orders, personalliggare och ID06 är **valbara overlays**, inte universella basobjekt.

### D.3 Core object model

Minsta kärnobjekt:

- `Project`
- `Engagement`
- `OpportunityLink`
- `QuoteLink`
- `WorkModel`
- `WorkPackage`
- `DeliveryMilestone`
- `WorkLog`
- `CostAllocation`
- `RevenuePlan`
- `BillingPlan`
- `ChangeOrder`
- `ResourceReservation`
- `PortfolioNode`
- `ProjectStatusUpdate`
- `ProjectRisk`
- `ProfitabilitySnapshot`
- `ProjectDeviation`
- `ProjectEvidenceBundle`

### D.4 Supported project/commercial models

Systemet ska stödja:

- `time_only`
- `milestone_only`
- `retainer_capacity`
- `subscription_service`
- `service_order`
- `work_order`
- `construction_stage`
- `internal_delivery`

Och billing/contract models:
- fixed price
- time & materials
- milestone billing
- retainer/prepaid capacity
- subscription service
- advance/on-account billing
- hybrid models via approved `ChangeOrder`

### D.5 Exact project commercial chain

1. opportunity/quote finns i CRM eller internt quoteobjekt
2. accepted quote skapar `OpportunityLink`, `QuoteLink` och `Engagement`
3. `WorkModel` styr om operational pack krävs
4. `WorkPackage` och `DeliveryMilestone` beskriver scope och billing triggers
5. `WorkLog`, AP cost allocations, material usage, travel, payroll cost allocations matar profitability
6. `BillingPlan` och `RevenuePlan` styr AR suggestion/invoice readiness
7. `ProfitabilitySnapshot` materialiseras periodiskt och on-demand
8. `ChangeOrder` justerar scope/pris/tidplan utan att skriva över historik

### D.6 Exact profitability model

`recognizedRevenue - directLaborCost - subcontractorCost - materialCost - equipmentCost - travelCost - overheadCost +/- husAdjustmentAmount +/- approvedAdjustments`

Revenue sources:
- invoices
- milestone recognition
- retainer recognition
- approved manual adjustment with audit

Cost sources:
- payroll cost allocations
- AP allocations
- material usage
- subcontractor allocations
- travel claims
- approved overhead allocations

Output dimensions:
- project
- engagement
- work package optional
- customer optional
- business unit
- cost center
- service line

### D.7 Resource, portfolio and risk management

Måste byggas för parity mot monday/Asana/ClickUp/Dynamics:

- `ResourceReservation` med person/role/skill/capacity window
- `PortfolioNode` för flera projekt
- `ProjectStatusUpdate` med health, progress, blockers, at-risk reason
- `ProjectRisk` med severity, owner, mitigation, due date
- workload/capacity views byggda från reservations + approved work/time
- budget vs actual vs forecast views

### D.8 CRM coupling rules

- CRM är upstream context och handoff
- CRM äger inte profitability
- CRM äger inte invoice truth
- accepted quote måste alltid skapa canonical `Engagement`
- customer data synkas med explicit external refs
- project status kan pushas tillbaka till CRM, men canonical progress/profitability lever i projects

### D.9 Field pack

Field pack läggs ovanpå project core när onsite/dispatch/material/signature krävs.

Objekt:
- `OperationalCase`
- `DispatchAssignment`
- `MaterialReservation`
- `MaterialUsage`
- `FieldEvidence`
- `SignatureRecord`
- `SyncEnvelope`
- `ConflictRecord`

Rules:
- invoice-ready blockeras av öppna conflicts
- no server-side last-write-wins på costed/reglerade objects
- field completion genererar aldrig faktura direkt utan invoicing rule

### D.10 Personalliggare pack

Objekt:
- `Workplace`
- `WorkplaceRegistration`
- `AttendanceIdentitySnapshot`
- `EmployerSnapshot`
- `AttendanceEvent`
- `AttendanceCorrection`
- `AttendanceExport`
- `KioskDevice`
- `IndustryPackActivation`

Rules:
- attendance är append-only
- correction skapar ny correction object + successor event
- attendance är inte payroll time
- attendance är inte billable time

### D.11 ID06 pack

Objekt:
- `Id06CompanyVerification`
- `Id06PersonVerification`
- `Id06CardStatus`
- `Id06EmployerLink`
- `Id06WorkplaceBinding`
- `Id06AttendanceMirror`
- `Id06EvidenceBundle`

Rules:
- identity graph: person, employer, workplace binding = separata noder
- ID06 får blockera access-dependent action men får aldrig förstöra tidigare audit trail
- ID06 status är effective-dated

### D.12 Construction and other industry packs

Construction pack får lägga till:
- threshold rules
- pre-start registration
- builder/main contractor snapshots
- electronic attendance export
- stronger change-order templates (ÄTA-style) ovanpå generic `ChangeOrder`

Andra framtida pack får lägga till sektorsspecifik evidence/attendance men får inte förändra project core semantics.

### D.13 Prioriterad integrationsordning för projects

1. HubSpot — bästa första CRM-handoff och custom objects/workflows
2. Teamleader Focus — bästa SMB-benchmark för CRM + quotes + projects + work orders + invoicing
3. monday.com — project/portfolio import and sync
4. Asana — project/portfolio/time import and sync
5. ClickUp — project/time/timesheets/workload import and sync
6. Zoho CRM/Projects/Billing — service project billing and client context
7. Odoo — time/materials and project billing migration/integration
8. Dynamics 365 Project Operations — enterprise project operations later wave

### D.14 Market-winning project moves

Följande ska byggas som faktiska features, inte idéer:

1. **Quote-to-project-to-profit chain**  
   Accepterad offert ska bli `Engagement`, `BillingPlan`, `WorkModel` och initial `RevenuePlan` utan manuell dubbelregistrering.

2. **Cross-domain profitability**  
   Ett projekt ska kunna se lönsamhet från payroll, AP, materials, travel, HUS, AR och overhead i samma snapshot.

3. **Risk + resource mission control**  
   Portfolio, workload, margin at risk, due invoices, open field cases, open HUS risks, open compliance blockers i samma workbench.

4. **Generic change-order engine**  
   ÄTA-liknande förändringskedja som fungerar för konsult, service, installation och bygg — inte bara bygg.

5. **Safe project trials**  
   Projektflöden ska vara demonsterbara i trial med quotes, time, costs, invoices och profitability utan legal effect.

6. **Migration from CRM/PM tools**  
   Import av kunder, deals/quotes, open projects, unbilled time och templates från prioriterade källor ska vara en faktisk go-to-market-fördel.

## Appendix E — Konkurrentparity, competitor advantage och bindande winning moves

### E.1 Vad vi måste matcha

#### Finansplattformar
Måste matcha Fortnox/Visma/Bokio/Wint/Björn Lunden på:
- finance-ready tenant setup
- bokföring/AP/AR/bank/VAT
- payroll/AGI
- annual reporting/declarations
- HUS där relevant
- integrations/API/webhooks
- migrering och supportbar vardagsdrift

#### CRM/project/service-plattformar
Måste matcha monday/Asana/ClickUp/Teamleader/Zoho/Odoo/Dynamics på:
- portfolio/project status
- resource/capacity
- quote/deal to project handoff
- time/expense/material to invoice
- project profitability
- customer context through execution

#### Field/build verticals
Måste matcha Bygglet/Byggdagboken på:
- work order/service order
- material/photo/signature evidence
- personalliggare
- enkel field execution
- change-order semantics
- ID06/compliance där relevant

### E.2 Vad vi måste slå

Vi ska vara bättre på:
- tax account as first-class domain
- receipts/recovery/replay for AGI/VAT/HUS/annual
- operator-first support and backoffice
- deterministic rulepacks and historical pinning
- cutover concierge and parallel-run evidence
- trial-to-live safety
- cross-domain project profitability
- strict source-of-truth separation

### E.3 Bindande winning moves som måste byggas

1. **Tax account cockpit**  
   Skattekonto ska inte vara sidofunktion. Det ska vara en first-class operational domain med discrepancy cases, offset suggestions och reconciliation blockers.

2. **Unified submission cockpit**  
   En och samma operatorupplevelse för AGI, VAT, HUS och annual filing: envelopes, receipts, retries, corrections, dead letters, evidence.

3. **Migration concierge**  
   Guided import, mapping, diff, signoff, parallel run, rollback. Detta ska sälja byten från Fortnox/Visma/Teamleader/monday-liknande verktyg.

4. **Safe trial to live**  
   Trial ska vara verklig nog för sälj och onboarding men fullständigt isolerad från live. Promotion ska vara säker och supportbar.

5. **Project profitability mission control**  
   Projektlönsamhet ska visa margin, billed/unbilled, payroll cost, AP cost, field cost, HUS adjustments, risks och open blockers i samma workbench.

6. **Operator-first backoffice**  
   Support, incidents, replay, dead letters, submission monitoring och cutover ska vara bättre än marknaden, inte bara interna adminskärmar.

### E.4 Verifierade benchmarkkällor som styr project/CRM-designen

- monday.com: https://www.monday.com/ och https://support.monday.com/hc/en-us/articles/115005305649-Get-started-with-monday-work-management
- Asana: https://asana.com/product/portfolios och https://asana.com/features/resource-management/time-tracking
- ClickUp: https://clickup.com/features/timesheets och https://clickup.com/project-time-tracking
- Teamleader: https://www.teamleader.eu/ och https://www.teamleader.eu/solutions/work-orders
- Zoho CRM/Projects/Billing: https://www.zoho.com/crm/project-management.html och https://www.zoho.com/billing/help/time-tracking/projects/
- HubSpot: https://www.hubspot.com/products/custom-objects och https://developers.hubspot.com/docs/guides/api/crm/objects/custom-objects
- Dynamics 365 Project Operations: https://www.microsoft.com/en-us/dynamics-365/products/project-operations och https://learn.microsoft.com/en-us/dynamics365/project-operations/welcome-to-project-operations
- Odoo: https://www.odoo.com/documentation/17.0/applications/sales/sales/invoicing/time_materials.html

### E.5 Go-live parity test

Ingen generell lansering förrän följande är gröna:

- Finance hygiene
- Payroll correctness
- Regulated submissions receipts/recovery
- General project core
- Field pack where targeted
- Trial-to-live
- Migration/cutover
- API/webhooks
- BankID/SSO/backoffice

## Appendix F — Global testkrav, golden scenarios och obligatoriska runbooks

### F.1 Testlager

Varje fas måste ha:
- unit tests
- integration tests
- e2e tests
- contract tests för externa payloads där relevant
- restore/replay/chaos tests för operationally critical flows
- migration/cutover tests där data flyttas
- sandbox/prod isolation tests där provider eller environment används

### F.2 Minsta golden scenarios för go-live

1. **Finance-ready AB**  
   bootstrap -> chart -> VAT -> first AR/AP -> bank match -> close -> annual package

2. **Payroll standard**  
   employee/employment -> approved time -> pay run -> posting -> AGI version -> technical receipt -> material receipt

3. **Payroll edge**  
   SINK + ordinary tax + benefit + travel + salary exchange + garnishment in same release cycle

4. **HUS**  
   invoice -> verified payment -> claim -> partial acceptance -> recovery

5. **Tax account**  
   import -> classify -> reconcile to VAT/AGI -> discrepancy -> approve offset

6. **Project consulting**  
   quote -> project -> time -> invoice -> profitability snapshot

7. **Project service/field**  
   quote -> service order -> dispatch -> material/signature -> invoice ready -> profitability

8. **Construction vertical**  
   project -> workplace -> attendance -> ID06 -> checklist -> billing/hus link where relevant

9. **Migration/cutover**  
   import masterdata/open items/history -> diff -> parallel run -> signoff -> cutover -> rollback rehearsal

10. **Trial to live**  
    create trial -> run finance/payroll/project flows -> reset -> promote selected masterdata -> configure live credentials -> finance-ready validation

### F.3 Runbooks som måste finnas innan go-live

- runtime mode validation
- migration history repair
- outbox replay and dead-letter
- projection rebuild
- evidence bundle export
- secret rotation
- restore drill
- API contract change
- bankid provider setup
- support impersonation
- break-glass
- finance-ready bootstrap
- trial reset
- trial promotion to live
- ledger close and reopen
- historical import posting
- tax account difference resolution
- bank statement and payment reconciliation
- document reprocessing
- import case review
- HR masterdata cutover
- collective agreement activation
- payroll correction and AGI replay
- garnishment remittance
- submission replay and recovery
- HUS claim recovery
- annual filing correction
- project cutover
- field offline conflicts
- personalliggare correction
- ID06 verification
- search index rebuild and repair
- workbench compatibility
- provider cutover and secret rotation
- public API verification
- partner adapter contract tests
- migration cutover
- parallel run and diff
- support case and replay
- pilot execution
- general availability decision
