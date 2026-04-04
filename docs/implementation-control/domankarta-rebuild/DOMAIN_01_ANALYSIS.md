# DOMAIN_01_ANALYSIS

## Scope

Domän 1 täcker plattformskärnan som resten av produkten står på:

- source of truth
- repository- och persistensmodell
- transaktionsgränser
- command journal
- domain events
- outbox/inbox
- idempotency
- concurrency
- worker-livscykel
- replay/recovery
- snapshot/export/import
- projection rebuild
- import/cutover/rollback
- runtime-mode isolation
- bootstrap/config/diagnostics/observability

Verifieringen i denna rebuild har gjorts mot:

- prompt 1
- gamla `DOMAIN_01_ANALYSIS.md`
- gamla `DOMAIN_01_ROADMAP.md`
- gamla `DOMAIN_01_IMPLEMENTATION_LIBRARY.md`
- faktisk kod i `apps/api/src/platform.mjs`, `apps/api/src/server.mjs`, `apps/worker/src/worker.mjs`, `packages/domain-core/src/*.mjs`, migrations och tester
- officiella PostgreSQL-källor för commit-durability, isoleringsnivåer och atomisk `INSERT ... ON CONFLICT`

## Verified Reality

- Repository-backed durability finns i faktisk runtime när `criticalDomainStateStoreKind` sätts till `sqlite` eller `postgres`. Detta bevisas av `createApiPlatform(...)`, `decorateCriticalDomainPersistence(...)` och gröna tester i `tests/unit/phase2-critical-domain-persistence.test.mjs`.
- Restart-rehydrering fungerar för repository-backed domäner via snapshot-import/export och kritisk state store. Bevis: grönt test `Phase 2.1 rehydrates repository-backed domain truth from sqlite-backed aggregate envelopes`.
- Kritiska domäner exponerar durability-inventory och object versions per domän. Bevis: `platform.listCriticalDomainDurability()` och grönt test `Phase 2.1 platform exposes per-domain durability inventory för all repository-backed domains`.
- Runtime diagnostics finns och flaggar blockerare som `missing_persistent_store`, `critical_domain_store_not_persistent`, `flat_merge_collision`, `map_only_critical_truth`, `stub_provider_present` och `secret_runtime_not_bank_grade`. Bevis: `scripts/lib/runtime-diagnostics.mjs` och grönt integrationstest `tests/integration/phase1-runtime-diagnostics-api.test.mjs`.
- Worker-startup stoppar på blockerande diagnostics via `assertRuntimeStartupAllowed(...)`. Bevis: `apps/worker/src/worker.mjs:494-502`.
- API-startup stoppar på blockerande diagnostics via `assertRuntimeStartupAllowed(...)`. Bevis: `apps/api/src/server.mjs:194-207`.
- Command mutation runtime finns som riktig kod med en bättre transaktionsmodell än snapshot-wrappern: samma transaktion skriver repository-objekt, command receipt, domain events, outbox och evidence refs. Bevis: `packages/domain-core/src/command-log.mjs` och gröna tester i `tests/unit/phase2-command-log.test.mjs`.
- Canonical repository stores finns som riktig kod för in-memory och Postgres. Bevis: `packages/domain-core/src/repositories.mjs`, `packages/domain-core/src/repositories-postgres.mjs` och gröna tester i `tests/unit/phase2-canonical-repositories.test.mjs` samt `tests/unit/phase2-postgres-repository-config.test.mjs`.
- Checkpoints, replay drills och commit-lag/projection-gates är verkliga runtime-objekt, inte bara docs. Bevis: `tests/unit/phase2-runtime-operationalization.test.mjs` och `tests/integration/phase2-runtime-ops-api.test.mjs`.

## Partial Reality

- Plattformen har nu repository-backed durability, men den primära API-runtime kör fortfarande mutationer genom en snapshot-wrapper per domän i stället för att göra canonical repositories + command runtime till förstaklassig produktionsväg.
- Command journal finns, men den generiska journaling som faktiskt används i `decorateCriticalDomainPersistence(...)` skapar generiska `domain.method.committed`-poster och tomma outbox-listor om inte resultatobjekt råkar bära evidence-spår.
- Concurrency-kontroll finns, men är fortfarande domän-snapshot-baserad i critical state store, inte aggregate-baserad i produktionsruntime.
- Environment separation finns som modell (`trial`, `sandbox_internal`, `test`, `pilot_parallel`, `production`), men default-resolvern för critical state store faller fortfarande tillbaka till `memory` om explicit Postgres- eller sqlite-konfiguration saknas.
- Import/cutover/rollback har verkliga stödobjekt, men de bygger ännu ovanpå samma domänsnapshotmodell som resten av plattformen och är därför inte tillräckligt hårda som slutlig source of truth.

## Legacy

- Den gamla Domän 1-analysen överdriver vissa blockerare som nu är åtgärdade, till exempel total avsaknad av durable runtime och total avsaknad av restart-rehydrering.
- Äldre dokument och gamla binding-dokument som beskriver plattformen som rent `Map`-baserad sanning är nu delvis för gamla. Kod och tester visar att snapshot-backed repository envelope nu finns.
- Samtidigt är äldre optimism om “repository envelope = löst” också missvisande, eftersom canonical repository store fortfarande inte är aktiv primärruntime.

## Dead Code

- `packages/domain-core/src/command-log.mjs` är inte död kod, men den är dead-path i faktisk API-runtime just nu. Sökning i `apps/`, `packages/`, `scripts/` utanför tester visar ingen runtime-wiring av `createCommandMutationRuntime(...)`.
- `packages/domain-core/src/repositories-postgres.mjs` är inte död kod, men även denna är i praktiken oanvänd i huvudplattformen utanför tester och exportlager.

## Misleading / False Completeness

- `truthMode: "repository_envelope"` betyder i nuvarande runtime inte att canonical repositories är förstaklassig commit-path. Det betyder bara att en domänadapter kan exportera/importera en snapshot som journalförs.
- `critical_domain_command_receipts`, `critical_domain_domain_events`, `critical_domain_outbox_messages` och `critical_domain_evidence_refs` ser ut som aggregate- och command-log-sanning, men de hänger fortfarande under en snapshot-tabell med `domain_key` som primärnyckel.
- Gröna phase2-tester bevisar att byggstenar finns. De bevisar inte att plattformen redan kör den hårdaste möjliga commitmodellen i faktisk runtime.

## Source Of Truth Findings

### Finding D1-C1

- severity: critical
- kategori: source_of_truth
- exakt problem: `critical_domain_state_snapshots` använder `domain_key` som enda primärnyckel. Det finns ingen `company_id`, `aggregate_type` eller `aggregate_id` i snapshot-tabellen som faktisk source of truth.
- varför det är farligt: flera bolag och flera aggregat i samma domän skrivs ihop till en enda domänsnapshot. Det gör att concurrency, rollback, rebuild och import/export blir domänbrett i stället för aggregate-baserat. Det skapar shadow truth och fel granularity för återställning.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260326121500_phase2_critical_domain_state_runtime.sql`
- radreferens om möjligt: 1-9
- rekommenderad riktning: ersätt domain-snapshot-tabellen som primär truth med aggregate-baserade canonical repositories. Behåll snapshot endast som härledd checkpoint/export-artifact.
- status: replace

### Finding D1-C2

- severity: critical
- kategori: mutation_path
- exakt problem: faktisk API-runtime kör writes via `decorateCriticalDomainPersistence(...)`, där domänmetoden körs först, snapshot exporteras efteråt och journalen byggs generiskt runt resultatet.
- varför det är farligt: commit path blir “mutera domänadapter -> exportera snapshot -> skriv generisk receipt/event” i stället för “skriv canonical repository mutation + explicit domain events/outbox/evidence i samma transaktion”. Det är en svagare modell för invariants, audit och replay.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- radreferens om möjligt: 1750-2085
- rekommenderad riktning: gör `createCommandMutationRuntime(...)` och canonical repositories till enda tillåtna write path för kritiska domäner. Snapshot-wrappern ska degraderas till import/export/checkpoint-lager.
- status: rewrite

### Finding D1-H1

- severity: high
- kategori: source_of_truth
- exakt problem: canonical repository stores och command runtime finns, men de är inte wired i faktisk plattformsbootstrap utanför tester.
- varför det är farligt: repo:t ger intryck av att en starkare commitmodell redan är aktiv, fast den bara bevisas i enhetstester. Det skapar falsk completeness och fördröjer riktig konsolidering av source of truth.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\command-log.mjs`
- radreferens om möjligt: 36-422
- rekommenderad riktning: inför explicit runtime-wiring av canonical repository store och command runtime i `createApiPlatform(...)`.
- status: rewrite

## Repository / Persistence Findings

### Finding D1-C3

- severity: critical
- kategori: persistence
- exakt problem: critical domain store fallbackar till `memory` om ingen explicit connection string eller store kind anges.
- varför det är farligt: det går fortfarande att skapa en production-mode plattform i processminne. `startApiServer(...)` stoppar detta, men `createApiPlatform(...)` och `createApiServer(...)` kan fortfarande användas felaktigt i tooling, scripts och testhelpers.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- radreferens om möjligt: 1703-1746
- rekommenderad riktning: förbjud implicit `memory` i alla protected modes redan vid platform creation. `memory` ska bara vara tillåten för explicit test/sandbox med tydligt flaggkrav.
- status: harden

### Finding D1-H2

- severity: high
- kategori: persistence
- exakt problem: journalraderna (`command_receipts`, `domain_events`, `outbox_messages`, `evidence_refs`) innehåller `aggregate_type` och `aggregate_id`, men deras `resulting_object_version` kommer från domänsnapshotens `object_version`.
- varför det är farligt: versionsnumret ser aggregate-specifikt ut men är i verkligheten domänbrett. Det gör receipts och replay-signaler semantiskt missvisande.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\critical-domain-state-store-postgres.mjs`
- radreferens om möjligt: 703-920
- rekommenderad riktning: flytta `expectedObjectVersion` och `resultingObjectVersion` till canonical aggregate repositories där de faktiskt speglar aggregatet som muteras.
- status: rewrite

### Finding D1-H3

- severity: high
- kategori: durability
- exakt problem: senaste snapshot skrivs över per domän i `critical_domain_state_snapshots`. Det finns ingen immutable snapshot history i primär truth-tabellen.
- varför det är farligt: forensic restore, partial replay och multi-point recovery blir beroende av externa artifacts i stället för att truth-lagret självt bevarar revisionsgränser.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\critical-domain-state-store-postgres.mjs`
- radreferens om möjligt: 641-698 och 857-894
- rekommenderad riktning: håll canonical repositories immutable via command receipts/events och behandla snapshots som härledda checkpoints med egen historik.
- status: harden

## Transaction Boundary Findings

### Finding D1-C4

- severity: critical
- kategori: transaction_boundary
- exakt problem: den starka transaktionsmodellen i `createCommandMutationRuntime(...)` används inte av huvudplattformen, trots att den uttryckligen skriver repository mutation, command receipt, domain event, outbox och evidence i samma transaktion.
- varför det är farligt: kärnplattformen och dess verkliga transaktionsgränser är svagare än de byggstenar repo:t redan har. Det innebär att produktionsruntime inte använder sin bästa tillgängliga integritetsmodell.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\command-log.mjs`
- radreferens om möjligt: 36-315
- rekommenderad riktning: flytta alla kritiska writes till command runtime. Förbjud direkta domänadapter-writes för kritiska domäner.
- status: replace

### Finding D1-H4

- severity: high
- kategori: transaction_boundary
- exakt problem: critical domain store och async job store är separata persistence-paths med separata connection resolvers och separata schema contracts.
- varför det är farligt: command truth och job enqueue kan fortfarande glida isär om samma business-operation kräver båda. Då uppstår lost wakeup-, replay- och reconciliation-risker.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- radreferens om möjligt: 1703-1746 samt `packages/domain-core/src/jobs-store-postgres.mjs`
- rekommenderad riktning: definiera explicit atomic handoff-regel mellan command truth och job scheduling. För kritiska writes ska outbox eller command journal vara den enda källan för vidare asynk dispatch.
- status: harden

## Command Journal / Event / Outbox Findings

### Finding D1-H5

- severity: high
- kategori: journaling
- exakt problem: snapshot-wrappern genererar generiska committed-events baserat på metodnamn och resultatsammanfattning i stället för explicita domänhändelser från domänlogiken.
- varför det är farligt: eventkedjan blir för grov för korrekt replay, correction och audit. Den speglar att “något committades”, inte exakt vilken affärshändelse som inträffade.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- radreferens om möjligt: 1882-2056
- rekommenderad riktning: varje kritisk write ska explicit deklarera command type, domain events, outbox-meddelanden och evidence refs i mutation runtime.
- status: rewrite

### Finding D1-M1

- severity: medium
- kategori: journaling
- exakt problem: `listCriticalDomainCommandReceipts(...)`, `listCriticalDomainDomainEvents(...)`, `listCriticalDomainOutboxMessages(...)` och `listCriticalDomainEvidenceRefs(...)` läser från snapshot-storejournal, inte från canonical repositories.
- varför det är farligt: operativa dashboards kan få en bild av att command log är canonical fast den i själva verket är sekundär till domänsnapshoten.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- radreferens om möjligt: 1190-1238
- rekommenderad riktning: läs command/event/outbox/evidence från canonical command journal när denna tagits i drift.
- status: harden

## Idempotency / Concurrency Findings

### Finding D1-H6

- severity: high
- kategori: concurrency
- exakt problem: `recordMutation(...)` deduplicerar korrekt på `(company_id, command_type, command_id)` och `(company_id, idempotency_key)`, men concurrency-kontrollen för state ligger fortfarande på `domain_key` + `object_version`.
- varför det är farligt: två oberoende aggregat i samma domän konkurrerar om samma domänversion och samma snapshotrad. Det skalar dåligt och försvårar korrekta retry/replay-strategier.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-core\src\critical-domain-state-store-postgres.mjs`
- radreferens om möjligt: 703-836
- rekommenderad riktning: behåll idempotency-reglerna men flytta versionering till aggregate-rader i canonical repositories.
- status: rewrite

## Worker / Replay / Recovery Findings

### Finding D1-H7

- severity: high
- kategori: worker_recovery
- exakt problem: worker lifecycle är vältestad och startupskyddad, men dess underliggande async job store är fortfarande ett separat subsystem från command truth.
- varför det är farligt: replay plans, dead letters och claims blir driftmässigt starka, men de har ännu inte en hård canonical länk till aggregate truth och command journal.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\worker\src\worker.mjs`
- radreferens om möjligt: 488-587
- rekommenderad riktning: definiera command journal som källa för jobbskapande och replay-orkestrering. Job store ska vara operativ state, inte source of truth för business mutations.
- status: harden

## Import / Cutover / Rollback Findings

### Finding D1-M2

- severity: medium
- kategori: recovery
- exakt problem: snapshot artifacts används för export/import av hela domänbilder via `exportCriticalDomainSnapshotArtifact(...)` och `importCriticalDomainSnapshotArtifact(...)`.
- varför det är farligt: modellen är användbar för checkpoints, men får inte bli primär migrerings- eller recovery-sanning för kritiska affärsaggregat.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- radreferens om möjligt: 1790-1867
- rekommenderad riktning: begränsa snapshot artifacts till checkpoint, rollback rehearsal, forensic export och rebuild bootstrap. All verklig migrering ska gå via canonical aggregate- och command-paths.
- status: harden

## Environment / Bootstrap / Diagnostics Findings

### Finding D1-H8

- severity: high
- kategori: environment
- exakt problem: runtime-mode modellen är tydlig och testad, men implicit fallback till `test` i `resolveRuntimeModeProfile(...)` och implicit `memory` i state-store-resolvern gör det för lätt att köra i svagare lägen än avsett.
- varför det är farligt: miljöfel blir för tysta. En operator eller script kan tro att protected-liknande körning är hårdare än den faktiskt är.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\scripts\lib\runtime-mode.mjs`
- radreferens om möjligt: 82-107
- rekommenderad riktning: gör explicit runtime mode obligatorisk för alla icke-testade entrypoints och förbjud fallback till `memory` i protected modes redan vid bootstrap.
- status: harden

### Finding D1-M3

- severity: medium
- kategori: diagnostics
- exakt problem: diagnostics är starka nog att stoppa `startApiServer(...)` och `startWorker(...)`, men `createApiServer(...)` kan fortfarande användas direkt utan startup assert.
- varför det är farligt: lokala verktyg, scripts och tester kan kringgå samma säkerhetsgräns som server-entrypointen har.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\server.mjs`
- radreferens om möjligt: 52-178 och 183-207
- rekommenderad riktning: inför explicit unsafe/test-only markering för `createApiServer(...)` eller flytta startup-assert till serverkonstruktionen när runtime mode är protected.
- status: harden

## Security / Durability / Observability Findings

### Finding D1-H9

- severity: high
- kategori: security_runtime
- exakt problem: runtime diagnostics fortsätter att flagga `secret_runtime_not_bank_grade` som blockerande i protected mode.
- varför det är farligt: plattformskärnan är inte go-live-säker om dess secrets- och crypto-path fortfarande bedöms som otillräcklig av den egna honesty-scanen.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\scripts\lib\runtime-diagnostics.mjs`
- radreferens om möjligt: findings verifieras av `tests/integration/phase1-runtime-diagnostics-api.test.mjs`
- rekommenderad riktning: Domän 2 måste ta över detta som hård blockerare, men Domän 1 måste samtidigt markera att protected startup aldrig får klassas green så länge findingen finns.
- status: harden

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| Durable critical domain truth | repository-backed | verified reality when sqlite/postgres is explicit, otherwise memory fallback | `apps/api/src/platform.mjs:1703-1746`, `tests/unit/phase2-critical-domain-persistence.test.mjs` | yes |
| Restart rehydration | available | verified reality | `tests/unit/phase2-critical-domain-persistence.test.mjs` | no |
| Canonical repository runtime | production-ready | exists in code/tests, not wired into actual platform runtime | `packages/domain-core/src/command-log.mjs`, `packages/domain-core/src/repositories-postgres.mjs`, global search outside tests | yes |
| Command receipts / domain events / outbox / evidence | first-class | exists in critical snapshot store and in canonical runtime, but active runtime uses the snapshot-store variant | `apps/api/src/platform.mjs:1190-1238`, `packages/domain-core/src/critical-domain-state-store-postgres.mjs:703-920`, `packages/domain-core/src/command-log.mjs` | yes |
| Aggregate-level concurrency | expected | not verified in active runtime; current versioning is domain-wide snapshot version | migration `20260326121500_phase2_critical_domain_state_runtime.sql:1-9`, `critical-domain-state-store-postgres.mjs:703-836` | yes |
| Replay drills / rollback checkpoints | first-class | verified reality | `tests/unit/phase2-runtime-operationalization.test.mjs`, `tests/integration/phase2-runtime-ops-api.test.mjs` | no |
| Protected runtime startup guard | enforced | verified reality in `startApiServer` and worker startup | `apps/api/src/server.mjs:194-207`, `apps/worker/src/worker.mjs:494-502` | partial |
| Protected runtime creation without startup guard | forbidden | not forbidden; can still instantiate platform/server objects unsafely | `createApiPlatform(...)`, `createApiServer(...)` direct usage | yes |
| Runtime diagnostics honesty scan | truthful | verified reality and materially useful | `scripts/lib/runtime-diagnostics.mjs`, `tests/integration/phase1-runtime-diagnostics-api.test.mjs` | no |

## Concrete Runtime Verification Matrix

| capability | claimed source of truth | actual runtime path | proof in code/tests | status | blocker |
| --- | --- | --- | --- | --- | --- |
| Domain persistence | repository envelope | `decorateCriticalDomainPersistence(...)` över per-domain snapshot store | `apps/api/src/platform.mjs:1750-2085`, green phase2 persistence tests | partial reality | yes |
| Command mutation atomicity | same transaction för mutation + receipt + outbox | only in `createCommandMutationRuntime(...)`, not in main platform runtime | `packages/domain-core/src/command-log.mjs`, `tests/unit/phase2-command-log.test.mjs` | partial reality | yes |
| Commit durability | durable commit | PostgreSQL can guaräntee durable `COMMIT`, but current runtime still allows `memory` fallback and sqlite path | [PostgreSQL COMMIT](https://www.postgresql.org/docs/16/sql-commit.html), `apps/api/src/platform.mjs:1703-1746` | partial reality | yes |
| Concurrency isolation | safe optimistic concurrency | unique/idempotent at receipt level; domain-wide `object_version` at state level | [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html), `critical-domain-state-store-postgres.mjs:703-836` | partial reality | yes |
| UPSERT/idempotency guaräntee | atomic insert/update behavior | canonical repository path can use proper transaction semantics, but active runtime journaling is still snapshot-based | [PostgreSQL INSERT](https://www.postgresql.org/docs/current/sql-insert.html), `command-log.mjs`, `repositories-postgres.mjs` | partial reality | yes |
| Environment isolation | explicit runtime mode separation | verified för mode model; weak in fallback behavior | `scripts/lib/runtime-mode.mjs`, `tests/unit/phase1-runtime-mode.test.mjs` | partial reality | yes |
| Replay/recovery readiness | operationally real | verified för drills/checkpoints; still layered on snapshot truth | `tests/unit/phase2-runtime-operationalization.test.mjs`, `tests/integration/phase2-runtime-ops-api.test.mjs` | partial reality | yes |

## Critical Findings

- D1-C1: domain-level snapshot primary key makes critical truth too coarse.
- D1-C2: actual write path is snapshot-wrapper-first, not canonical command runtime.
- D1-C3: protected platform can still be instantiated with implicit memory store if startup wrapper is bypassed.
- D1-C4: strongest atomic mutation runtime exists but is not the actual platform runtime.

## High Findings

- D1-H1: canonical repository store exists but is not wired in actual runtime.
- D1-H2: receipt/event aggregate metadata is semantically stronger than the underlying domain-wide objectVersion.
- D1-H3: snapshot table keeps latest state only, not immutable truth history.
- D1-H4: critical truth and async jobs still split across separate stores without a single atomic handoff rule.
- D1-H5: generic committed-events are too weak för full replay/audit truth.
- D1-H6: concurrency is still domain-wide instead of aggregate-wide.
- D1-H7: worker/replay operational model is stronger than its linkage to business source of truth.
- D1-H8: runtime mode and store fallback rules are still too permissive.
- D1-H9: secret runtime remains a protected-mode blocker.

## Medium Findings

- D1-M1: operational list APIs read from snapshot-store journal, not canonical journal.
- D1-M2: snapshot artifacts risk becoming overused as migration truth.
- D1-M3: `createApiServer(...)` can be used without startup assert.

## Low Findings

- Inga low-fynd är viktiga nog att lyfta separat i rebuild-versionen. Domän 1 har fortfarande för många högre blockerare.

## Go-Live Blockers

- Canonical repository runtime är inte primär write path.
- Critical truth ligger fortfarande i domain-snapshot-tabell med `domain_key` som primärnyckel.
- Protected runtime kan fortfarande konstrueras med implicit `memory` om fel entrypoint används.
- Async job store och command truth har inte en enda explicit atomic handoff-modell.
- `secret_runtime_not_bank_grade` är fortfarande blockerande i honesty-scanen.

## Repo Reality Vs Intended Platform Model

Repo:t är starkare än den gamla Domän 1-analysen sa, men svagare än vad en verklig go-live-plattform kräver.

Det som är sant nu:

- repository envelope finns
- restart-rehydrering finns
- runtime diagnostics finns
- worker/checkpoint/replay-drill finns
- canonical repositories och command runtime finns som byggstenar

Det som fortfarande inte är sant:

- canonical repositories är inte primär runtime
- aggregate source of truth är inte hårt låst
- domain snapshot-lagret bär fortfarande för mycket sanning
- protected mode är inte tillräckligt idiotspärrat vid fel bootstrapväg

Domän 1 klassas därför som:

- total klassning: `partial reality`
- rekommenderad riktning: `rewrite + replace + harden`
