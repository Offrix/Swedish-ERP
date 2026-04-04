# DOMAIN_01_IMPLEMENTATION_LIBRARY

## Mål

Detta dokument beskriver exakt hur Domän 1 ska byggas om så att plattformen får:

- en enda verklig source of truth
- aggregate-baserad persistens
- atomiska writes
- riktig command journal
- riktiga domain events och outbox records
- korrekt idempotency och concurrency
- säkra replay/recovery-/checkpoint-flöden
- hård runtime-mode isolation
- tydlig bootstrap- och diagnostics-governance

Det här dokumentet ska kunna användas som faktisk byggspec.

## Fas 1

### Delfas 1.1 Source-Of-Truth Consolidation

#### Vad som ska byggas

Plattformen ska sluta använda en enda domänsnapshotrad som primär commitmodell för kritiska domäner. I stället ska varje kritisk mutation skriva till canonical aggregate records.

#### Exakt modell

- varje kritisk mutation måste definiera:
  - `commandType`
  - `aggregateType`
  - `aggregateId`
  - `companyId`
  - `actorId`
  - `sessionRevision`
  - `idempotencyKey`
  - `correlationId`
  - `expectedObjectVersion`
- varje mutation ska gå genom `createCommandMutationRuntime(...)`
- `createCommandMutationRuntime(...)` ska få ett riktigt canonical repository store, inte snapshot-store
- varje domän ska beskriva vilka object types som är canonical i repository store

#### Vad som inte längre får gälla

- `decorateCriticalDomainPersistence(...)` får inte vara primär write path för kritiska domäner
- `critical_domain_state_snapshots` får inte vara primär affärssanning
- `domainKey`-nivå som enda versionsgräns får inte finnas kvar för kritiska writes

#### Exakta byggregler

- `critical_domain_state_snapshots` får bara användas för:
  - checkpoint snapshots
  - export/import artifacts
  - rollback rehearsal
  - forensic support
- business truth ska ligga i canonical repository rows
- canonical repository rows ska vara per:
  - bounded context
  - object type
  - company id
  - object id

#### Vilka filer som ska ändras

- `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\command-log.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\repositories.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\repositories-postgres.mjs`
- kritiska domänpaket som idag använder snapshot-wrappern

### Delfas 1.2 Repository And Persistence Correction

#### Vad som ska byggas

En faktisk canonical repository bootstrap för API och worker.

#### Exakt modell

- inför `resolveCanonicalRepositoryStore(...)` i plattformsbootstrap
- tillåt dessa lägen:
  - `postgres` för protected runtime
  - `sqlite` endast för explicit local/test migration rehearsal om det krävs
  - `memory` endast för uttrycklig test/demo-helper
- `pilot_parallel` och `production` ska kräva:
  - explicit runtime mode
  - explicit canonical repository store
  - explicit critical state store
  - explicit job store

#### Primära tabeller

- `core_domain_records`
- `command_receipts`
- `command_domain_events`
- `outbox_events`
- `command_evidence_refs`
- `command_inbox_messages`

#### Sekundära tabeller

- `critical_domain_state_snapshots`
- `critical_domain_command_receipts`
- `critical_domain_domain_events`
- `critical_domain_outbox_messages`
- `critical_domain_evidence_refs`

Sekundära tabeller ska degraderas till transition/checkpoint-lager och därefter reduceras ytterligare när migrationen är klar.

#### Persistensregler

- canonical repositories måste vara transaktionella
- object versions måste vara per aggregate row
- delete måste kräva `expectedObjectVersion`
- all state ska kunna återläsas efter restart från canonical repositories

#### Startupregler

- `startApiServer(...)` ska verifiera:
  - canonical repository schema
  - critical state store schema
  - async job schema
- `startWorker(...)` ska verifiera:
  - canonical repository schema
  - critical state store schema
  - async job schema

### Delfas 1.3 Atomic Mutation Path Hardening

#### Vad som ska byggas

En enda tillåten commitmodell för kritiska writes.

#### Exakt commitsekvens

1. normalisera command envelope
2. verifiera schema contract
3. öppna databastransaktion
4. kontrollera duplicate via:
   - `(company_id, command_type, command_id)`
   - `(company_id, idempotency_key)`
5. hämta aggregate row med aktuell `objectVersion`
6. verifiera `expectedObjectVersion`
7. kör mutation mot canonical repositories
8. samla explicita domain events
9. samla explicita outbox-meddelanden
10. samla explicita evidence refs
11. skriv `command_receipt`
12. skriv `command_domain_events`
13. skriv `outbox_events`
14. skriv `command_evidence_refs`
15. committa transaktionen
16. returnera receipt envelope

#### Invariansregler

- inga externa side effects får ske före commit
- inga direkta provider-anrop från kritisk domänmutation
- inga dolda writes till snapshot-store som enda truth
- mutation som misslyckar ska lämna:
  - ingen repository-row-förändring
  - ingen receipt
  - ingen outbox
  - ingen evidence-ref

#### Eventregler

- eventtyp ska vara explicit i koden
- eventpayload ska bära tillräcklig affärssemantik för replay och audit
- generiska `*.committed` får bara användas för icke-kritiska eller rent interna tekniska transitions om de uttryckligen klassas som sådana

### Delfas 1.4 Outbox / Inbox / Journal Hardening

#### Vad som ska byggas

Ett deterministiskt integrationslager ovanpå canonical truth.

#### Outboxmodell

Varje outbox-row ska minst innehålla:

- `eventId`
- `companyId`
- `eventType`
- `aggregateType`
- `aggregateId`
- `commandReceiptId`
- `payload`
- `occurredAt`
- `recordedAt`
- `actorId`
- `correlationId`
- `causationId`
- `idempotencyKey`
- `status`

#### Inboxmodell

Varje inbound message ska minst innehålla:

- `inboxMessageId`
- `companyId`
- `sourceSystem`
- `messageId`
- `aggregateType`
- `aggregateId`
- `payloadHash`
- `payload`
- `correlationId`
- `causationId`
- `actorId`
- `status`
- `receivedAt`
- `processedAt`
- `errorCode`

#### Regler

- inbound duplicate detection måste ske före downstream mutation
- outbox-dispatch får bara läsa `pending` rows
- dispatchresultat får inte ändra affärssanning
- misslyckad dispatch får bara påverka outbox-operativ state

### Delfas 1.5 Idempotency And Concurrency Hardening

#### Vad som ska byggas

Aggregate-riktig versionering och konflikthantering.

#### Exakt modell

- `expectedObjectVersion` ska valideras mot aggregate row
- `resultingObjectVersion` ska vara aggregate row version efter commit
- concurrency conflict ska returnera:
  - expected version
  - actual version
  - aggregate type
  - aggregate id
  - company id

#### Databasregler

- använd unika constraints för duplicate suppression
- använd optimistic concurrency på aggregate row
- för komplexa multi-row invariants i Postgres ska `SERIALIZABLE` eller motsvarande hård transaktionsregel användas där det verkligen behövs, med explicit retry-policy för SQLSTATE `40001`

#### Officiell primärkälla som styr här

- PostgreSQL dokumenterar att `COMMIT` gör ändringar synliga och durabla vid crash när transaktionen committats
- PostgreSQL dokumenterar att Serializable ska ge samma effekt som seriell körning eller annars tvinga retry
- PostgreSQL dokumenterar att `INSERT ... ON CONFLICT DO UPDATE` ger atomiskt `INSERT` eller `UPDATE`

Källor:

- [PostgreSQL COMMIT](https://www.postgresql.org/docs/16/sql-commit.html)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html)
- [PostgreSQL INSERT / ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)

#### Retryregler

- serialization failure -> retry hela command transaktionen
- duplicate command -> returnera duplicate receipt, ingen ny mutation
- permanent valideringsfail -> ingen retry
- optimistic concurrency conflict -> returnera conflict till caller eller kör kontrollerad applikationsretry om command är uttryckligen idempotent

### Delfas 1.6 Worker Lifecycle Hardening

#### Vad som ska byggas

Worker ska bli ett operativt konsumtionslager ovanpå command/outbox-truth.

#### Exakt modell

- jobb skapas från:
  - outbox dispatch policy
  - explicit ops-commands
  - projection rebuild policies
- jobb får aldrig skapa affärssanning genom att skriva direkt utanför canonical runtime
- varje jobb ska kunna länkas till:
  - source command receipt
  - source aggregate
  - correlation id

#### Attemptmodell

Varje attempt ska bära:

- `jobId`
- `attemptNo`
- `workerId`
- `claimToken`
- `status`
- `claimedAt`
- `claimExpiresAt`
- `startedAt`
- `finishedAt`
- `resultCode`
- `errorClass`
- `errorCode`
- `errorMessage`
- `resultPayload`
- `nextRetryAt`

#### Replaymodell

Replay plan ska vara ett förstaklassigt objekt som pekar på:

- `jobId`
- `companyId`
- `plannedByUserId`
- `reasonCode`
- `plannedPayloadStrategy`
- `status`
- `approvedByUserId`
- `replayJobId`
- `plannedAt`
- `approvedAt`
- `scheduledAt`
- `startedAt`
- `completedAt`
- `failedAt`
- `lastOutcomeCode`
- `lastErrorClass`

### Delfas 1.7 Replay / Recovery / Projection Rebuild Hardening

#### Vad som ska byggas

En recoverymodell där:

- canonical repositories och command history är primär sanning
- snapshots är checkpoints
- projections är härledda

#### Snapshot role and limits

Snapshots får användas för:

- checkpoint före riskfylld operation
- rollback rehearsal
- forensic export
- snabb rehydrering under kontrollerad bootstrap

Snapshots får inte användas för:

- normal affärsmutation
- normal migrering
- dold direktreparation i produktion

#### Projection rebuild model

- projections ska ha egna contracts och checkpoints
- rebuild ska gå från canonical command/event truth
- projection checkpoint får inte blandas ihop med affärssanning

### Delfas 1.8 Import / Cutover / Rollback / Parallel-Run Model

#### Vad som ska byggas

Import och cutover ska använda samma kärnmodell som live.

#### Exakta regler

- import ska skapa commands, inte snapshotoverwrite
- parallel run ska kunna jämföra:
  - imported canonical dataset
  - live calculated dataset
  - diff report
  - acceptance record
- rollback ska peka på:
  - checkpoint artifact
  - affected commands
  - affected aggregates
  - evidence bundle

#### Rollback checkpoint requirements

- checkpoint ska ha status `open -> sealed -> used`
- seal kräver review
- use kräver approval actor ids
- evidence refs ska vara obligatoriska vid användning

### Delfas 1.9 Environment-Mode Model

#### Vad som ska byggas

En tekniskt hård separation mellan:

- `trial`
- `sandbox_internal`
- `test`
- `pilot_parallel`
- `production`

#### Exakta regler

- `pilot_parallel` och `production` ska vara protected modes
- protected mode kräver:
  - explicit runtime mode
  - explicit canonical repository store
  - explicit critical state store
  - explicit async job store
  - explicit no-seed bootstrap
- `memory` får inte vara default i protected runtime
- `createApiServer(...)` och liknande helpers ska antingen:
  - asserta startup-blockers själva
  - eller vara tydligt märkta som test-only

### Delfas 1.10 Bootstrap / Config / Diagnostics Model

#### Vad som ska byggas

En bootstrap- och diagnosticsmodell som gör unsafe runtime omöjlig att missta för deploybar.

#### Exakta diagnostics som minst måste finnas

- `missing_persistent_store`
- `critical_domain_store_not_persistent`
- `canonical_repository_store_missing`
- `flat_merge_collision`
- `map_only_critical_truth`
- `stub_provider_present`
- `secret_runtime_not_bank_grade`
- `forbidden_route_family_present` där relevant
- `simulated_receipt_runtime` där relevant

#### Observability model

Följande mätvärden ska vara förstaklassiga:

- command receipt lag
- outbox lag
- projection rebuild gate state
- replay backlog
- dead letter count
- worker claim expiry count
- protected runtime startup blockers

## Source-Of-Truth-Modell

Den enda giltiga affärssanningen för kritiska writes ska vara:

- canonical repository rows
- command receipts
- explicita domain events
- outbox rows
- evidence refs

Domänsnapshotar är sekundära.

## Repository-Modell

- repository rows ska vara aggregate-baserade
- varje row ska vara scopead på company id
- varje row ska bära `objectVersion`
- save/delete ska vara version-kontrollerade

## Transaction Boundary Model

- en kritisk command = en databastransaktion
- transaktionen ska omfatta repository rows, receipt, events, outbox och evidence
- externa side effects sker efter commit via outbox/worker

## Command Journal Model

- command receipt är bindande kvitto på committad mutation
- duplicate receipt är bindande kvitto på suppressed duplicate
- payload hash ska vara stabil
- metadata ska bära auditrelevant information men inte hemligheter

## Event Model

- events ska vara explicita
- events ska vara replaybara
- events ska vara tillräckligt rika för correction/rebuild/audit

## Outbox / Inbox Model

- outbox = downstream dispatch truth
- inbox = inbound dedupe truth
- ingen provider callback eller webhook får hoppa förbi inbox-modellen om den kan ändra kritisk state

## Idempotency Model

- duplicate suppression ska ske på command-nivå
- idempotency keys ska vara stabila över retries
- retried command får aldrig ge dubbel outbox eller dubbel evidence

## Concurrency Model

- concurrency ska vara aggregate-baserad
- serialization failures måste kunna retrys
- domänbrett `objectVersion` får inte användas som slutlig modell för kritiska writes

## Worker Lifecycle Model

- worker processar operativ state
- worker äger inte affärssanning
- replay skapar ny kontrollerad execution, inte ny dold sanning

## Replay / Recovery Model

- replay går från command/event/outbox-truth
- recovery använder checkpoint-artifacts
- restore får aldrig förutsätta att senaste domänsnapshot ensam är sanningen

## Snapshot Role And Limits

- snapshot = snabb återladdning eller checkpoint
- snapshot != canonical truth

## Projection Rebuild Model

- projections är disposable och rebuildbara
- projection checkpoint ska kunna rensas och byggas upp från canonical truth

## Import / Cutover / Rollback / Parallel-Run Model

- import bygger commands
- cutover bygger evidence
- rollback använder checkpoint + command refs + evidence bundle
- parallel run jämför canonical beräkning mot källsystem

## Bootstrap / Config / Diagnostics Model

- explicit mode
- explicit stores
- explicit schema verification
- explicit startup blockers

## Observability Model

- logs och metrics ska gå att knyta till company id, aggregate id, command id och correlation id
- lag metrics ska skilja på:
  - receipt-lag
  - outbox-lag
  - projection-lag
  - replay-lag

## Recovery / Runbook Requirements

Domän 1 måste ha runbooks för:

- canonical repository bootstrap
- startup blocker triage
- command replay
- projection rebuild
- rollback checkpoint use
- restore rehearsal
- protected runtime startup failure

## Vilka bevis som krävs innan något märks som durable eller production-ready

- protected runtime startar inte utan persistent canonical repo store
- minst ett integrationstest visar full mutation path via API till canonical rows + receipt + event + outbox
- minst ett test visar restart-rehydrering från canonical truth
- minst ett test visar aggregate-level conflict
- minst ett test visar duplicate suppression
- minst ett test visar rollback på mutationsfel
- minst ett test visar replay drill utan dubbel affärseffekt
- diagnostics rapporterar tydligt startup blockers och stoppar protected boot

## Vilka risker som kräver mänsklig flaggning

- byte av primär source of truth i befintlig miljö
- schema- och datamigrering från domain snapshots till aggregate rows
- beslut om exakt isoleringsnivå per tung multi-aggregate command
- verkligt cutover mellan gammal och ny commitmodell
