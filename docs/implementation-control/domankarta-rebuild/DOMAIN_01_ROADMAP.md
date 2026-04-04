# DOMAIN_01_ROADMAP

## Mål

Göra plattformskärnan till entydig, aggregate-baserad, deterministisk och produktionsmässig source of truth för hela resten av produkten.

## Varför domänen behövs

Om Domän 1 inte är hård kan resten av systemet aldrig bli korrekt:

- bokföring får fel truth-granularity
- lön och regulated submissions får fel replay/recovery-beteende
- migration/cutover/rollback får fel återställningspunkt
- support/ops får receipts och evidens som ser starkare ut än de är
- protected runtime kan starta i fel lagringsläge

## Faser

- Fas 1.1 source-of-truth consolidation
- Fas 1.2 repository and persistence correction
- Fas 1.3 atomic mutation path hardening
- Fas 1.4 outbox/inbox/journal hardening
- Fas 1.5 idempotency and concurrency hardening
- Fas 1.6 worker lifecycle hardening
- Fas 1.7 replay/restore/projection rebuild hardening
- Fas 1.8 import/cutover/rollback hardening
- Fas 1.9 environment isolation hardening
- Fas 1.10 bootstrap/config/diagnostics/observability hardening

## Delfaser

### Fas 1.1 Source-Of-Truth Consolidation

#### mål

Flytta source of truth från domain-wide snapshots till aggregate-baserade canonical repositories och command runtime.

#### arbete

- ersätt `critical_domain_state_snapshots` som primär truth för kritiska writes
- definiera vilka aggregat som måste bli canonical first-class records per domän
- gör `createCommandMutationRuntime(...)` till enda tillåtna write path för kritiska mutationer
- mappa varje nuvarande write-method i `apps/api/src/platform.mjs` till explicit command type, aggregate type och aggregate id
- dokumentera vilka nuvarande snapshot-metoder som ska degraderas till read-model, checkpoint eller export-artifact

#### dependencies

- Domän 0 cleanup och prune map måste vara låst
- inga nya domäner får byggas vidare på domain-snapshot-truth under tiden

#### vad som får köras parallellt

- inventering av aggregate-katalog per domän
- kartläggning av gamla mutation-metoder
- design av command type-katalog

#### vad som inte får köras parallellt

- migrering av write path och snapshot-roll samtidigt i samma domän
- aktivering av ny canonical runtime före schema- och cutoverplan är låst

#### exit gate

- ingen kritisk mutation använder längre `decorateCriticalDomainPersistence(...)` som primär source-of-truth path
- varje kritisk mutation har explicit aggregate target
- snapshots är formellt sekundära

#### konkreta verifikationer

- verifiera att global sökning utanför tester visar runtime-anrop till `createCommandMutationRuntime(...)`
- verifiera att nya write paths skriver canonical repository records, command receipt, domain events och outbox i samma transaktion
- verifiera att `critical_domain_state_snapshots` inte längre används som primär commit-path för writes

#### konkreta tester

- nytt integrationstest som kör en verklig mutation via API och därefter läser canonical repository row + command receipt + outbox
- nytt test som bevisar att två olika aggregat i samma domän inte delar versionräknare
- nytt fail-test som bevisar rollback om repository-save misslyckas efter att receipt börjat byggas

#### konkreta kontroller vi måste kunna utföra

- kontrollera en mutation från HTTP request till repository row, receipt row, domain event och outbox row med samma correlation id
- kontrollera att aggregate version ökar endast för rätt aggregate
- kontrollera att ingen sekundär snapshotrad ensam avgör om mutationen är committad

### Fas 1.2 Repository And Persistence Correction

#### mål

Införa riktig aggregate-lagring, explicit Postgres runtime och hård persistensmodell.

#### arbete

- wirea `createPostgresCanonicalRepositoryStore(...)` in i plattformen
- skapa bootstrap för canonical repository store i API och worker runtime
- bygg migrationsplan från domain-snapshot-truth till aggregate rows
- skriv ny verifiering för repository schema contract som blockerande startup-krav
- definiera vilka tabeller som är primära, härledda och checkpoint-only

#### dependencies

- Fas 1.1 måste ha pekat ut exakt aggregate-katalog

#### vad som får köras parallellt

- Postgres bootstrap
- schema contract verifiering
- read migration av gamla snapshots till canonical records

#### vad som inte får köras parallellt

- write cutover till ny repository truth innan replay- och rollbackplan finns

#### exit gate

- protected runtime kan inte starta utan canonical repository store
- repository schema contract verifieras vid startup
- gamla snapshot-only writes är stängda

#### konkreta verifikationer

- verifiera att `verifyRuntimeCanonicalRepositorySchemaContract(...)` körs i faktisk startup-path
- verifiera att canonical repository connection inte faller tillbaka till implicit memory i protected mode
- verifiera att minst en kritisk domän har migrerats fullt till aggregate rows

#### konkreta tester

- startup-test som ska faila i protected mode utan repository Postgres
- integrationstest som startar API med canonical repository Postgres och skriver/läser verkliga aggregate rows
- migrationstest som flyttar snapshot-state till aggregate rows utan dubbelräkning

#### konkreta kontroller vi måste kunna utföra

- lista canonical tables och bekräfta att de innehåller affärsobjekt, inte bara testdata
- kontrollera att startup stoppar utan repository schema
- kontrollera att ett restartat system återläser canonical truth utan att snapshots behövs som primär källa

### Fas 1.3 Atomic Mutation Path Hardening

#### mål

Göra varje kritisk mutation atomisk, replaybar och auditbar.

#### arbete

- flytta mutationer till command runtime med explicit mutation-funktion
- skriv explicita domain events i mutation-koden
- skriv explicita outbox records i mutation-koden
- skriv explicita evidence refs i mutation-koden
- förbjud generisk “method committed”-journal för kritiska paths

#### dependencies

- Fas 1.1 och 1.2

#### vad som får köras parallellt

- eventmodell
- evidencemodell
- outboxmodell

#### vad som inte får köras parallellt

- byta journalmodell utan att samtidigt låsa idempotency och retry-regler

#### exit gate

- varje kritisk command har explicit receipt, explicit domain event och explicit outbox/evidence där det krävs
- inga kritiska writes journalförs bara som generic summary

#### konkreta verifikationer

- verifiera att varje command har fast `commandType`
- verifiera att eventtyper inte härleds från metodnamn
- verifiera att outbox rows innehåller riktig affärshändelse, inte bara “command.accepted”

#### konkreta tester

- per kritisk domän: accepted, duplicate och rollback-fall
- test som bevisar att outbox inte skrivs om receipt/repository save faller
- test som bevisar att domain event payload är tillräcklig för replay och audit

#### konkreta kontroller vi måste kunna utföra

- följa en mutation från request till receipt/event/outbox/evidence i databasen
- verifiera att samma command id ger duplicate-svar och inte ny mutation
- verifiera att payload hash och idempotency key är stabila vid replay

### Fas 1.4 Outbox / Inbox / Journal Hardening

#### mål

Separera affärssanning, integrationsutskick och inbound processing på ett deterministiskt sätt.

#### arbete

- lås `outbox_events` som enda lagliga dispatch-källa för vidare asynk arbete
- bygg inbox-deduplikering i alla inbound integrationsvägar som påverkar kritiska domäner
- definiera publish-state, retry-state och poison-state för outbox
- bygg receipt-länk mellan command, domain event, outbox och evidence

#### dependencies

- Fas 1.3

#### vad som får köras parallellt

- inbound inbox-implementation
- outbox dispatch policy
- event to integration mapping

#### vad som inte får köras parallellt

- real provider-adapters i senare domäner innan outbox-kedjan är låst

#### exit gate

- alla kritiska externa side effects har outbox-spår
- alla inbound kritiska meddelanden har inbox-spår med dedupe

#### konkreta verifikationer

- verifiera att inga kritiska providers anropas direkt från domänmutationsmetoder
- verifiera att inbound dubbelmeddelanden inte ger dubbelmutation

#### konkreta tester

- inbox duplicate test
- outbox publish-retry-dead-letter test
- test som bevisar korrelation mellan receipt, domain event och outbound event

#### konkreta kontroller vi måste kunna utföra

- ta ett command id och slå upp hela kedjan till outbox publish
- ta ett inbound message id och visa att ändra leveransen blev dedupad

### Fas 1.5 Idempotency And Concurrency Hardening

#### mål

Flytta concurrency och idempotency från domänsnapshot-nivå till aggregate-nivå.

#### arbete

- inför aggregate-baserad `expectedObjectVersion`
- inför conflicts per aggregate row
- behåll unika constraints för `(company_id, command_type, command_id)` och `(company_id, idempotency_key)`
- skriv retry-policy för serialization failure och optimistic concurrency conflict

#### dependencies

- Fas 1.2 och 1.3

#### vad som får köras parallellt

- aggregate versioning
- retry policy
- duplicate suppression

#### vad som inte får köras parallellt

- slå på Serializable eller Repeatable Read för komplexa writes utan att retry-semantik är implementerad

#### exit gate

- inga två aggregat delar versionssekvens
- duplicate suppression och concurrency-skydd fungerar samtidigt

#### konkreta verifikationer

- verifiera att version ökar per aggregate, inte per domän
- verifiera att concurrency-conflict innehåller expected och actual objectVersion för rätt aggregate
- verifiera att retry-policy skiljer serialization failure från permanent valideringsfail

#### konkreta tester

- simultan write mot samma aggregate -> en commit, en conflict
- samtidiga writes mot olika aggregat -> båda kan committa
- duplicate command -> duplicate receipt, ingen ny write

#### konkreta kontroller vi måste kunna utföra

- kontrollera att två olika aggregate ids i samma domän har separata versionshistoriker
- kontrollera att retries inte skapar dubbel outbox/evidence

### Fas 1.6 Worker Lifecycle Hardening

#### mål

Koppla worker-runtime hårt till canonical truth och säkra claims, attempts, replay och poison handling.

#### arbete

- definiera hur jobb skapas från command/outbox-truth
- förbjud business mutations direkt via job store
- bind replay plans och dead letters till command receipts och aggregate refs
- lås heartbeat, claim expiry och poison semantics

#### dependencies

- Fas 1.4 och 1.5

#### vad som får köras parallellt

- worker claim-lager
- replay plan-lager
- poison/dead-letter-lager

#### vad som inte får köras parallellt

- provider-dispatch i senare domäner innan worker truth-modellen är låst

#### exit gate

- workerjobb är operativ state, inte affärssanning
- varje replay plan pekar på command/evidence path

#### konkreta verifikationer

- verifiera att jobbskapande kommer från outbox eller explicit ops-command, aldrig direkt från dold domänmutation
- verifiera att replay plan kan kopplas till source command receipt

#### konkreta tester

- claim -> start -> heartbeat -> finalize
- retry_scheduled -> dead_lettered -> replay_planned -> completed
- poison pill detection without duplicate business mutation

#### konkreta kontroller vi måste kunna utföra

- ta ett dead letter och spåra tillbaka till käll-command och aggregate
- bekräfta att replay inte skapar ny sanning utanför canonical runtime

### Fas 1.7 Replay / Restore / Projection Rebuild Hardening

#### mål

Göra replay, restore, checkpoints och rebuild till styrda operativa verktyg ovanpå canonical truth.

#### arbete

- gör snapshots till checkpoint-artifacts, inte primär truth
- bygg projection rebuild från command/event truth
- definiera restoreflöde för aggregate-based repos
- definiera vad som får replayas och vad som måste correction-orkestreras

#### dependencies

- Fas 1.3 till 1.6

#### vad som får köras parallellt

- replay drill runtime
- projection rebuild runtime
- checkpoint evidence

#### vad som inte får köras parallellt

- broad restore automation innan source of truth är aggregate-baserad

#### exit gate

- replay och rebuild kan köras utan att snapshots agerar primär affärssanning

#### konkreta verifikationer

- verifiera att projection rebuild läser command/event truth
- verifiera att restore checkpoint refererar till immutable evidence/artifacts

#### konkreta tester

- replay drill med duplicate protection
- restore checkpoint rehearsal
- projection rebuild from canonical event history

#### konkreta kontroller vi måste kunna utföra

- ta en projection och återskapa den från canonical truth
- ta en checkpoint och visa exakt vilka artifacts den låser

### Fas 1.8 Import / Cutover / Rollback Hardening

#### mål

Göra import, cutover och rollback säkra ovanpå samma kärnmodell som live-runtime använder.

#### arbete

- lås import-write path till canonical commands
- förbjud domain snapshot import som normal migreringsväg
- definiera rollbackpoint per aggregate/data set, inte bara per domänbild
- bygg parallel-run receipts och cutover evidence på canonical truth

#### dependencies

- Fas 1.1 till 1.7

#### vad som får köras parallellt

- import mapping design
- cutover checkpoint design
- rollback evidence design

#### vad som inte får köras parallellt

- live cutover implementation innan aggregate truth är verklig

#### exit gate

- import och cutover använder samma command-/repository-path som vanlig runtime

#### konkreta verifikationer

- verifiera att migrationsbatcher inte skriver direkt till snapshot state
- verifiera att rollback checkpoints kan referera aggregate-specific evidence

#### konkreta tester

- import replay test
- cutover rollback test
- parallel-run reconciliation test

#### konkreta kontroller vi måste kunna utföra

- spåra varje importerad rad till command receipt och aggregate row
- visa att rollback kan avgränsas utan att återställa en hel domänsnapshot

### Fas 1.9 Environment Isolation Hardening

#### mål

Göra runtime mode separation tekniskt hård och omöjlig att feltolka.

#### arbete

- förbjud implicit fallback till `test` eller `memory` i protected paths
- lås `pilot_parallel` och `production` till explicit store, explicit bootstrap-policy och explicit provider mode
- markera alla unsafe helpers som test-only

#### dependencies

- Fas 1.2

#### vad som får köras parallellt

- runtime mode enforcement
- helper cleanup
- env manifest cleanup

#### vad som inte får köras parallellt

- protected deployment innan env-policy blockerar fel mode/store

#### exit gate

- protected modes kräver explicit runtime mode, explicit persistent store och explicit no-seed policy

#### konkreta verifikationer

- verifiera att `createApiPlatform(...)` failar i protected mode utan explicit persistent store
- verifiera att helperplattformar är märkta test/demo-only och inte återanvänds i live-paths

#### konkreta tester

- protected mode with missing store -> fail
- protected mode with scenario seed -> fail
- test mode with explicit unsafe flag -> allowed

#### konkreta kontroller vi måste kunna utföra

- kontrollera startupmanifest och se exakt mode, store, bootstrap policy och provider env

### Fas 1.10 Bootstrap / Config / Diagnostics / Observability Hardening

#### mål

Göra bootstrap, config och diagnostics så hårda att fel runtime aldrig ser grön ut.

#### arbete

- flytta startup asserts till alla relevanta entrypoints
- bygg blocking diagnostics för canonical repo saknas, weak secret runtime och forbidden provider/state/store modes
- skriv structured observability för receipt lag, outbox lag, projection lag och replay backlog
- gör config resolution deterministisk och tydligt loggad

#### dependencies

- Fas 1.1 till 1.9

#### vad som får köras parallellt

- diagnostics rules
- structured logs/metrics
- startup assertions

#### vad som inte får köras parallellt

- production claims innan diagnostics blockerar alla kända unsafe kombinationer

#### exit gate

- inga protected entrypoints kan starta med known-blocking diagnostics
- runtime mode, active store, critical store och canonical repository store rapporteras explicit

#### konkreta verifikationer

- verifiera att API och worker båda blockerar samma unsafe kombinationer
- verifiera att diagnostics visar canonical repo blocker, not just snapshot-store blocker

#### konkreta tester

- integrationstest för `/v1/system/runtime-mode`
- integrationstest för `/v1/system/invariants`
- startup fail-test för missing canonical repository schema

#### konkreta kontroller vi måste kunna utföra

- läsa ett enda diagnostics-svar och avgöra om runtime är deploybar eller inte
- visa commit lag, projection lag och replay backlog utan att gissa

## Dependencies

- Fas 0 måste vara låst
- Domän 2 och framåt får inte byggas som om Domän 1 redan vore löst

## Vad som får köras parallellt

- read-only repo-inventering
- testverifiering
- official-source verifiering
- aggregate-katalogdesign

## Vad som inte får köras parallellt

- ersätta source of truth och samtidigt rensa bort gamla recovery-spår utan rollbackplan
- slå på protected runtime i verkliga miljöer innan diagnostics och canonical repo gating är klara

## Exit Gates

- canonical repositories är primär truth för kritiska writes
- command runtime är primär mutation path
- snapshots är sekundära och checkpoint-orienterade
- protected runtime kan inte köras i `memory`
- aggregate-level idempotency och concurrency är verifierade

## Test Gates

- gröna enhets- och integrationstester för canonical repo path
- gröna rollback-, duplicate-, replay- och rebuildtester
- gröna startup-failtester för unsafe kombinationer

## Durability Gates

- persistent canonical repo store krävs i protected runtime
- critical snapshot store får inte ensam bära business truth

## Idempotency Gates

- duplicate command ger duplicate receipt och ingen ny business mutation
- inbox duplicate ger ingen ny downstream mutation

## Concurrency Gates

- optimistic concurrency sker per aggregate
- serialization/retry-path är definierad och testad

## Environment Gates

- explicit runtime mode i protected paths
- explicit persistent stores
- inga seeds/autoseeds i `pilot_parallel` eller `production`

## Recovery / Replay Gates

- replay utgår från canonical truth
- checkpoints och restore drills använder artifacts, inte primär affärssanning

## Import / Cutover Gates

- import skriver via samma command path som normal runtime
- rollback/cutover evidence pekar på canonical truth

## Markeringar

- keep: runtime mode model, startup diagnostics, worker startup guard, replay drill/checkpoint runtime
- harden: protected bootstrap gating, job-store handoff, observability, snapshot role limits
- rewrite: `decorateCriticalDomainPersistence(...)`, journalmodell, aggregate versioning, operational list APIs
- replace: domain-snapshot primary truth som commitmodell
- migrate: gamla snapshot-state till canonical repositories
- archive: gamla Domän 1-dokument när rebuild-versionen tagits i bruk
- remove: implicit protected memory paths när ersättande explicit gating finns
