# MASTER_BUILD_SEQUENCE_FINAL

Status: Bindande slutlig byggordning före UI.

Detta dokument ersätter alla tidigare lösa rekommendationer om ordning. Ingen implementation före UI får ske utanför denna ordning. UI får inte starta förrän Step 18 är passerad.

## Styrande principer

1. Runtime-ärlighet går före all ny funktionalitet.
2. Source of truth, idempotens, receipts och replay ska låsas innan nya reglerade flöden byggs.
3. Reglerade motorer byggs före read models.
4. Read models, object profiles och workbench-kontrakt byggs före UI.
5. Ingen AI-automation får besluta om bokning, submission eller reglerad klassning utan uttrycklig server-side policy.
6. Varje steg är stängt först när exit gate, test gate och audit/runtime gate är gröna.
7. Inga demo-seeds, in-memory-genvägar eller syntetiska adapterresultat får finnas kvar i produktionsvägen.

## Absoluta blockerare som ska bort omedelbart

- syntetiska webhook-deliveries
- syntetiska partneroperationer
- worker med i praktiken endast noop-handler
- bootstrap som kräver optional dependencies trots memory-path
- stubbat BankID och ofullständig enterprise federation
- avsaknad av verkligt backoffice
- personalliggare utan generell workplace-modell och utan ID06-domän
- löneflöden som förlitar sig på manuell skattesats som huvudmodell
- filings utan verklig receipt- och recoverykedja

## Byggordning

### Step 1 — Gör runtime och bootstrap ärliga

**Mål**
- separera memory- och Postgres-path
- avskaffa eager-importer som bryter bootstrap
- säkra ren checkout-uppstart för API, worker och tester
- ta bort demo-defaults som ser ut som produktionsstöd

**Beror på**
- inget

**Får köras parallellt med**
- ingen annan implementering

**Leverabler**
- ren composition bootstrap
- explicit runtime profiles: `test`, `local`, `staging`, `prod`
- smoke tests för API, worker, migrations och seed-path
- feature flag för att förbjuda demo seeds i icke-demo environment

**Exit gate**
- API och worker startar från ren checkout utan optional adapter-paket
- inga route-familjer läcker in-memory-sanning när persistence är vald
- demo-seeds kan inte laddas i staging eller prod

**Test gate**
- unit smoke
- bootstrap smoke
- migration dry-run
- local environment smoke

**Audit/replay/runtime gate**
- bootstrap loggar vald runtime profile
- startup nekar prod utan persistence, audit sink och secret provider

**Blockerar nästa steg**
- Step 2

**Blockerar UI**
- ja; UI får inte börja på falsk runtime

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 2 — Bygg persistence, outbox, jobs, attempts, replay och dead-letter

**Mål**
- göra async runtime verklig
- skapa enhetlig modell för jobbförsök, receipts, replay plans, dead-letter och återupptag

**Beror på**
- Step 1

**Får köras parallellt med**
- design av standard event envelope
- ingen domänutbyggnad

**Leverabler**
- `Job`, `JobAttempt`, `ReplayPlan`, `DeadLetterCase`, `ExecutionReceipt`
- persistent outbox
- worker registry per job type
- exponential backoff och retry class per job family
- replay approvals för reglerade flöden
- admin-safe mass retry endast via backoffice-scope

**Exit gate**
- OCR, webhook delivery, submission transport, search reindex och notification delivery körs via samma workerplattform
- minst fem kritiska job types kan startas, fallera, återförsökas, dead-letteras och replayas

**Test gate**
- idempotency tests
- retry classification tests
- poison message tests
- replay safety tests
- kill-switch tests

**Audit/replay/runtime gate**
- varje attempt lagrar correlation id, causation id, payload hash, result code och retry class
- replay kräver explicit reason code och approvals när källobjektet är reglerat

**Blockerar nästa steg**
- Steps 3–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 3 — Lås audit, evidence, resilience, observability och restore drills

**Mål**
- göra varje reglerad och integrationskritisk händelse spårbar
- göra recovery och incidentstyrning körbar

**Beror på**
- Step 2

**Får köras parallellt med**
- Step 4 designarbete
- ingen domänfunktion som kräver ny auditmodell får mergeas innan Step 3 är grön

**Leverabler**
- canonical `AuditEvent` envelope
- evidence store med payload hash och immutable attachments
- trace correlation mellan API, worker, rules och submissions
- restore drill registry
- emergency disable registry
- incident taxonomy och service health signals

**Exit gate**
- alla kommando- och submitvägar skapar audit chain
- restore drill kan köras utan manuella SQL-ingrepp
- emergency disable kan stoppa submission, payouts och webhook delivery selektivt

**Test gate**
- audit completeness tests
- restore drill rehearsal
- emergency disable tests
- tamper detection tests

**Audit/replay/runtime gate**
- audit får inte vara best effort; write failure blockerar reglerad mutation
- evidence pack måste kunna återskapas från immutable artefakter

**Blockerar nästa steg**
- Steps 4–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- delvis; blockerar särskilt enterprise och compliance parity

**Blockerar competitor advantage**
- ja

### Step 4 — Lås canonical envelopes, error contracts, idempotens och permission resolution

**Mål**
- göra API, events, commands och webhooks konsekventa
- förhindra ad hoc-kontrakt i varje domän

**Beror på**
- Steps 1–3

**Får köras parallellt med**
- Step 5 regelmotorarbete

**Leverabler**
- canonical command envelope
- canonical event envelope
- canonical error envelope
- idempotency contract för alla muterande endpoints
- optimistic concurrency contract på reglerade objekt
- permission resolution service med object grants, queue grants och support scopes

**Exit gate**
- alla `POST`, `PUT`, `PATCH` och async-operationsendpoints accepterar idempotency key eller server-generated operation key
- error envelope har standardiserade fält för `code`, `message`, `retry_class`, `correlation_id`, `details`
- resolved permissions är enda vägen till read model visibility

**Test gate**
- idempotency replay tests
- optimistic concurrency tests
- permission trimming tests
- error contract snapshot tests

**Audit/replay/runtime gate**
- duplicate request får samma operation receipt
- permission denial ska auditloggas på högriskobjekt

**Blockerar nästa steg**
- Steps 5–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja för partner/public API

**Blockerar competitor advantage**
- ja

### Step 5 — Lås rulepack-registry, effective dating och historisk pinning

**Mål**
- göra regelmotorer reproducerbara över tid

**Beror på**
- Steps 2–4

**Får köras parallellt med**
- domänspecifikationer för accounting method, fiscal year, payroll, HUS, personalliggare

**Leverabler**
- `RulepackRegistryEntry`
- `RulepackVersion`
- `RuleEvaluationSnapshot`
- tenant override model
- rollout, rollback och supersede chain
- signerad publiceringsmodell för regulatoriska rulepacks

**Exit gate**
- varje beräkning och submission bär rulepack code, version och evaluation date
- replay använder originalversion som default
- framtida regeländring kan inte ändra historiskt utfall utan correction flow

**Test gate**
- version pinning tests
- rollback tests
- historical replay tests
- tenant override isolation tests

**Audit/replay/runtime gate**
- publicering och rollback av rulepacks är auditbara
- ingen domän får konsumera “latest” utan explicit evaluation date

**Blockerar nästa steg**
- Steps 6–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 6 — Lås auth, identity, session trust och backoffice-boundaries

**Mål**
- göra stark identitet, federation, step-up, support access och break-glass verkliga

**Beror på**
- Steps 1–5

**Får köras parallellt med**
- Step 7 legal/regulatory domain work
- inga support- eller signeringsflöden får lanseras före Step 6 är grön

**Leverabler**
- auth broker
- Signicat/BankID provider
- SAML/OIDC federation broker
- passkey och TOTP flows
- device trust och session trust model
- impersonation, break-glass och access review engine
- service principal / OAuth client model för partner/public API

**Exit gate**
- admin login, filing sign, payout approval och break-glass approval kräver rätt trust nivå
- enterprise SSO kan aktiveras tenantvis utan kodbranch
- supportsessioner är ticket-bundna och auditbara

**Test gate**
- MFA and passkey tests
- step-up tests
- federation tests
- impersonation segregation tests
- break-glass expiry tests

**Audit/replay/runtime gate**
- support och break-glass kan inte kringgå domänkommandon
- varje step-up binder till session revision och action class

**Blockerar nästa steg**
- Steps 7–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 7 — Bygg svensk kärna för accounting method, fiscal year och legal form

**Mål**
- etablera svensk regelgrund för när bokning och deklaration ska styras

**Beror på**
- Steps 1–6

**Får köras parallellt med**
- Step 8 ledger foundation
- inte med UI-read models

**Leverabler**
- `AccountingMethodProfile`, `MethodChangeRequest`, `MethodEligibilityAssessment`
- `FiscalYearProfile`, `FiscalYear`, `FiscalPeriod`, `FiscalYearChangeRequest`
- `LegalFormProfile`, `DeclarationProfile`, `ReportingObligationProfile`

**Exit gate**
- ett bolag har exakt en giltig accounting method per dag
- periodkalendern är deterministisk och laglig
- legal-form profile styr reporting obligations

**Test gate**
- accounting method eligibility tests
- broken year tests
- legal form package selection tests

**Audit/replay/runtime gate**
- change request och approval chain är append-only
- historiska perioder kan inte omräknas utan explicit correction chain

**Blockerar nästa steg**
- Steps 8–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja för svensk redovisning och skatt

**Blockerar competitor advantage**
- ja

### Step 8 — Bygg ledger, posting recipes, voucher series, periodlås och reopen/correction engine

**Mål**
- göra ledger till enda bokföringssanning

**Beror på**
- Step 7

**Får köras parallellt med**
- Step 9 VAT och tax-account design
- inte med AP/AR/posting automation

**Leverabler**
- configurable voucher series
- posting recipe registry
- period lock and reopen flow
- correction impact analyzer
- reversal linkage
- manual journal with dual control support

**Exit gate**
- inga andra domäner kan skriva journalrader direkt
- periodlås blockerar mutation och kräver reopen case
- correction impact analys visar påverkan på VAT, AGI, HUS, annual package och tax account

**Test gate**
- double-entry tests
- period lock tests
- reopen approval tests
- reversal and correction chain tests

**Audit/replay/runtime gate**
- varje postat journal har immutable provenance
- reopen, reversal och correction bär reason code och approval chain

**Blockerar nästa steg**
- Steps 9–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 9 — Bygg VAT, tax account, AP, AR, banking och document-posting gates

**Mål**
- få ett komplett decision-to-ledger-flöde

**Beror på**
- Steps 7–8

**Får köras parallellt med**
- Step 10 dokumentklassning
- Step 11 HR/time design

**Leverabler**
- VAT decision engine
- tax account subledger och offset engine
- AP import/pay readiness
- AR issue/legal field gates
- banking payment orders, statement imports och returns
- posting-intent contracts från AP/AR/banking/tax account

**Exit gate**
- AR, AP, bank och tax account skapar endast posting intents; ledger postar
- VAT declaration mapping är spårbar till approved VAT decisions
- tax account discrepancies går till review och close blockers

**Test gate**
- VAT rules tests
- tax account offset tests
- AR/AP issue gate tests
- bank return and settlement tests

**Audit/replay/runtime gate**
- varje extern bank- och skattekontohändelse har source fingerprint och dedupe key
- close blocker skapas när differens kvarstår

**Blockerar nästa steg**
- Steps 10–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 10 — Bygg documents, OCR, classification, import cases och review center

**Mål**
- göra document-to-decision till en verklig och säker kedja

**Beror på**
- Steps 2–9

**Får köras parallellt med**
- Step 11 HR/time/balances
- Step 15 search/read models design

**Leverabler**
- document archive and versioning
- OCR snapshot and extraction lineage
- classification cases och treatment lines
- import cases för multi-document AP/VAT
- review center med queues, decisions, SLA och escalation
- AI boundary enforcement

**Exit gate**
- dokument med låg confidence eller personpåverkan kräver server-side review
- review center äger beslut, inte UI
- approved classification kan dispatcha till AP, benefits, payroll eller HUS utan att hoppa över evidens

**Test gate**
- OCR/classification tests
- review SOD tests
- document-to-AP tests
- document-to-payroll tests

**Audit/replay/runtime gate**
- originaldokument, OCR och beslutskedja är immutable
- replay får inte skriva över historisk klassning

**Blockerar nästa steg**
- Steps 11–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 11 — Bygg HR, time, balances, collective agreements och migration engine

**Mål**
- skapa korrekt inputbas för lön

**Beror på**
- Steps 5–10

**Får köras parallellt med**
- Step 12 payroll engine
- Step 14 projects generic core design

**Leverabler**
- multi-employment model
- attendance/time approval
- generic balances
- collective agreement registry, versioning och tenant assignment
- payroll migration engine med mapping, diff, cutover och rollback readiness

**Exit gate**
- employments, balances och agreement assignments är effective-dated
- cutover diff är obligatoriskt före payroll go-live
- local agreement overrides är auditbara

**Test gate**
- balance carry-forward tests
- agreement activation tests
- payroll migration tests
- multi-employment tests

**Audit/replay/runtime gate**
- migration batches, diffs och signoffs är append-only
- agreement activation kräver approved compiled rulepack

**Blockerar nästa steg**
- Steps 12–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 12 — Bygg payroll, AGI, benefits, travel, pension och garnishment

**Mål**
- göra hire-to-pay och payroll-to-AGI produktionsklara

**Beror på**
- Step 11 samt Steps 7–10

**Får köras parallellt med**
- Step 13 HUS/submissions
- inte med payroll pilot

**Leverabler**
- full tax decision engine
- AGI constituent engine
- employer contribution engine
- benefits valuation
- travel/traktamente and mileage
- pension and salary exchange
- Kronofogden garnishment engine
- payroll posting intents och payment batches

**Exit gate**
- ordinary salary, hourly salary, retro, engångsbelopp, SINK, benefits, salary exchange och garnishment passerar golden scenarios
- AGI periods kan signeras, skickas, rättas och följas upp
- manuell procentsats är inte huvudmodell för preliminär skatt

**Test gate**
- payroll tax tests
- AGI submission tests
- benefits and travel tests
- garnishment tests
- project cost allocation tests

**Audit/replay/runtime gate**
- varje pay run, AGI version och garnishment deduction bär calculation fingerprint
- correction skapar ny version, aldrig overwrite

**Blockerar nästa steg**
- Steps 13–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 13 — Bygg HUS/ROT/RUT, regulated submissions, receipts och recovery

**Mål**
- göra HUS och andra myndighetsflöden tekniskt och materiellt säkra

**Beror på**
- Steps 2–12

**Får köras parallellt med**
- Step 16 integrationsplattform
- inte med pilot

**Leverabler**
- HUS claim versioning
- XML import/export serializer mot aktuell Skatteverket-schema-version
- generic submission envelope/receipt chain
- technical receipt vs business decision separation
- correction, replay, retry, dead-letter och recovery flows
- annual filing package transport

**Exit gate**
- AGI, VAT, HUS och annual filing använder samma receiptmodell
- HUS partial acceptance, rejection och recovery går hela vägen till ledger och customer debt
- VAT correction sker genom ny full declaration version

**Test gate**
- HUS edge tests
- submission receipt tests
- annual filing tests
- tax submission verification tests

**Audit/replay/runtime gate**
- technical ACK, business ACK och final outcome hålls isär
- replay av samma payload skapar inte nytt source object

**Blockerar nästa steg**
- Steps 14–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 14 — Bygg generell project core, field runtime, personalliggare, ID06 och egenkontroll

**Mål**
- göra project-to-profitability och field-to-invoice till generella kärnflöden med vertikala pack ovanpå

**Beror på**
- Steps 8–13

**Får köras parallellt med**
- Step 15 read models och reporting
- inte med field pilot

**Leverabler**
- generic projects core
- work orders och service orders
- dispatch
- materials and evidence
- payroll cost allocation to project
- personalliggare generalized workplace model
- `domain-id06`
- kiosk/device trust
- offline sync and conflict engine
- egenkontroll
- multi-contractor snapshots

**Exit gate**
- projects är generellt och inte byggcentrerat
- construction pack fungerar utan att förorena generic project model
- ID06-kedjan är verklig: card, person-company relation, workplace assignment, work pass, export och audit

**Test gate**
- field/mobile conflict tests
- personalliggare industry tests
- ID06 work-pass tests
- project profitability tests

**Audit/replay/runtime gate**
- offline sync är idempotent
- attendance corrections skapar explicit correction events
- workplace/export evidence är immutable

**Blockerar nästa steg**
- Steps 15–18

**Blockerar UI**
- ja

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 15 — Bygg reporting, search, object profiles, workbench contracts och saved views

**Mål**
- göra backend redo för UI utan omtag

**Beror på**
- Steps 4–14

**Får köras parallellt med**
- Step 16 integrationsytor
- Step 17 operations/backoffice runtime

**Leverabler**
- reporting projections
- search registry och permission-trimmed queries
- object profile contracts
- workbench list/filter/sort/search/drilldown contracts
- command bar actions
- queue counters, SLA och ownership projections
- desktop/mobile/backoffice/public boundary contracts

**Exit gate**
- varje kritiskt objekt har object profile och list contracts
- notification/activity/work-item separation finns som separata read models
- UI-readiness checklist kan köras utan manuell tolkning

**Test gate**
- read model determinism tests
- permission-trimmed search tests
- saved view tests
- projection rebuild tests

**Audit/replay/runtime gate**
- projections kan rebuildas från events och immutable source state
- stale projection och missing index ger tydlig operatorstatus

**Blockerar nästa steg**
- Steps 16–18

**Blockerar UI**
- ja, detta steg är huvudblockerare för UI-start

**Blockerar enterprise readiness**
- delvis

**Blockerar competitor parity**
- delvis

**Blockerar competitor advantage**
- ja

### Step 16 — Bygg integrationsplattform, public API, partner API och verkliga webhooks

**Mål**
- göra plattformen körbar för banker, myndigheter, e-faktura, CRM, cards och partnerekosystem

**Beror på**
- Steps 2–15

**Får köras parallellt med**
- Step 17 operations/backoffice

**Leverabler**
- provider-neutral adapter SDK
- connection, consent och health model
- public API
- partner API
- webhook subscriptions, deliveries och replay
- contract test suite
- sandbox/test/prod separation
- secrets rotation och certificate lifecycle

**Exit gate**
- minst en verklig provider i varje kritisk kategori: bank, e-faktura/Peppol, notifications, identity, Skatteverket-facing transport där tillåtet, signing/archive
- webhook deliveries gör riktig HTTP transport med receipts, retries och dead-letter
- partner onboarding kan verifieras utan syntetisk success

**Test gate**
- contract tests
- provider health tests
- webhook signature tests
- consent expiry tests
- sandbox/prod isolation tests

**Audit/replay/runtime gate**
- varje outbound delivery har attempt chain och response hash
- credentials och certifikatversion ingår i audit utan att exponera hemligheter

**Blockerar nästa steg**
- Steps 17–18

**Blockerar UI**
- inte absolut, men blockerar verklig go-live

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

### Step 17 — Bygg operations, backoffice, support, submission monitoring och cutover

**Mål**
- göra plattformen körbar under drift, incident och go-live

**Beror på**
- Steps 2–16

**Får köras parallellt med**
- pilotförberedelser
- ingen UI-implementation

**Leverabler**
- backoffice bounded context och app-backend
- support cases
- impersonation and break-glass
- audit explorer
- replay operations
- dead-letter operations
- submission monitoring
- cutover cockpit
- migration acceptance records
- SLA/escalation engine

**Exit gate**
- operatörer kan hantera replay, dead-letter, submissions, support och access reviews utan DB-ingrepp
- go-live cutover kräver approval, diff signoff och rollback plan
- incident modes och emergency disable är körbara

**Test gate**
- support/backoffice tests
- replay and dead-letter tests
- migration/cutover tests
- incident mode tests

**Audit/replay/runtime gate**
- backoffice får aldrig vara genväg runt domänkommandon
- varje operatörsåtgärd är ticket- eller incidentbunden

**Blockerar nästa steg**
- Step 18

**Blockerar UI**
- delvis; blockerar inte prototyp-UI men blockerar verklig produktstart

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- delvis

**Blockerar competitor advantage**
- ja

### Step 18 — Kör UI readiness gate, pilot gate och enterprise gate

**Mål**
- stoppa UI tills backendkontrakten verkligen är färdiga
- stoppa pilot tills runtime, receipts och ops är bevisade

**Beror på**
- Steps 1–17

**Får köras parallellt med**
- ingen ny featurebyggnation; endast variance-fixar

**Leverabler**
- UI readiness report
- enterprise readiness report
- competitor parity report
- competitor advantage readiness report
- mandatory runbooks, tests och golden scenarios signerade

**Exit gate**
- `UI_READINESS_GATE.md` passerar utan öppna blockerare
- V1–V7-liknande verifieringar är gröna
- parallel runs för finance, payroll, HUS och personalliggare har genomförts
- variance-fixar är stängda

**Test gate**
- full golden scenario suite
- full replay suite
- restore drill suite
- regulated submission suite
- permission/SOD suite

**Audit/replay/runtime gate**
- restore drill och replay har körts med dokumenterade resultat
- receipt reconciliation till ledger, payroll och tax account är bevisad

**Blockerar nästa steg**
- UI implementation
- bred go-live

**Blockerar UI**
- detta steg är den explicita UI-startspärren

**Blockerar enterprise readiness**
- ja

**Blockerar competitor parity**
- ja

**Blockerar competitor advantage**
- ja

## Tillåtna parallellfönster

### Parallel window A
Efter Step 5:
- skriva domain specs
- skriva test plans
- skriva runbooks
- inte bygga UI
- inte bygga providers som saknar jobs/runtime

### Parallel window B
Efter Step 10:
- design av payroll migration
- design av project profitability projections
- design av object profiles
- inte slutlig read-model implementation

### Parallel window C
Efter Step 12:
- HUS serializers
- annual package transport adapters
- projects/field/personalliggare/ID06 implementation
- operations/backoffice design

### Parallel window D
Efter Step 15:
- full integration adapter build
- search tuning
- backoffice workbench APIs
- ingen UI rendering

## Hårda stop-regler

- Ingen submission får byggas före Step 13.
- Ingen integration får markeras klar före Step 16.
- Inget support- eller impersonationflöde får gå live före Step 17.
- Ingen UI-implementation får börja före Step 18.
- Ingen pilot får starta före Step 18.
- Ingen competitor-parity-bedömning får markeras grön om bank, payroll, filings, auth eller backoffice saknas.

## Definition av blockerande nivåer

### Blocker for UI
Saknad object profile, saknad read model, saknat workbench contract, saknad permission boundary, saknat async receipt contract eller saknad action eligibility model.

### Blocker for enterprise readiness
Saknad strong auth, saknad support/backoffice, saknad restore/replay, saknad SoD, saknad audit/evidence, saknad true integrationsruntime eller saknad submission recovery.

### Blocker for competitor parity
Saknad bank/payments, saknad payroll/AGI, saknad VAT/declarations, saknad field/personalliggare, saknad HUS, saknad API/webhooks eller saknad onboarding/migration.

### Blocker for competitor advantage
Saknad unified review center, saknad tax account reconciliation, saknad end-to-end receipts, saknad generic project core med construction packs, saknad operator-first backoffice, saknad object profiles och global search.

## Slutregel

Codex får endast bygga UI efter att detta dokument, `DOMAIN_OWNERSHIP_AND_SOURCE_OF_TRUTH.md`, `ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC.md`, `INTEGRATIONS_API_EVENTS_AND_WEBHOOKS.md`, `AUTH_IDENTITY_SCOPE_AND_BACKOFFICE.md`, `OPERATIONS_REVIEW_NOTIFICATIONS_ACTIVITY_WORK_ITEMS.md`, `PROJECTS_FIELD_PERSONALLIGGARE_ID06_GENERAL_SPEC.md`, `REGULATED_SUBMISSIONS_RECEIPTS_AND_RECOVERY.md` och `UI_READINESS_GATE.md` är implementerade i kod, tester och runbooks.
