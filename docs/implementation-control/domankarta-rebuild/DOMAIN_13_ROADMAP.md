# DOMAIN_13_ROADMAP

## mal

Göra Domän 13 till en verklig svensk reporting-, search-, workbench-, cockpit-, notification- och activity-korna där:
- reporting truth är durable, läsbar och bokföringsmassigt sparbar
- drilldown och exports alltid pekar på samma lasta sanning som snapshoten byggdes från
- search, object profiles, workbenches och widgets aldrig blir shadow database eller datalackageyta
- mission control visar explicit freshness, blockers och checkpoint-status
- notifications och activity är replaybara, auditbara och leveransstyrda
- gamla demo-, fake-live- och legacyspar rensas bort eller arkiveras

## varfor domänen behovs

Utan Domän 13 blir resten av plattformen operativt blind:
- controllers kan inte lita på reporting truth
- support och operations kan inte lita på workbenches och cockpits
- användare kan exponeras för stale eller overmaskad/undermaskad data
- alerts, digest och activity kan tappas eller misstolkas
- export och revisionsbevis kan se riktiga ut utan att vara det

## bindande tvärdomänsunderlag

- `FAKTURAFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör rapportering, drilldown, export och SIE4 för kundfakturor och kundreskontra.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör rapportering, drilldown, export och SIE4 för leverantörsfakturor, leverantörskreditnotor och purchase-side moms/posting truth.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör rapportering, drilldown, export och SIE4 för leverantörsreskontra efter posting, supplier advances, AP-betalningar, AP-returer, netting, fees och FX.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör rapportering, drilldown, export och SIE4 för bankkonto, statement lines, bankavstämning, bankavgifter, ränteposter, interna överföringar och bank-owned legal effect.
- `MOMSFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör momsdeklaration, periodisk sammanställning, OSS, box truth, avdragsrätt, importmoms, receipts, replacement declarations och momsrelaterad drilldown/exportparitet.
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör skattekontohistorik, `1630`-mirror, authority transactions, ränta, anstånd, utbetalningsspärr, refunds och tax-account drilldown/exportparitet.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör voucherdrilldown, huvudbok, grundbok, verifikationsserier, provbalans, correction lineage och SIE4-voucherparitet.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör `1630`-owner-binding, authority-event-klassning, HUS/grön-offsetdrilldown och tax-account mapping parity i reporting och export.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör seriespecifik drilldown, voucher identity, reservationsluckor, correction lineage och SIE4-serieparitet.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör redovisningsvaluta, rate-lineage, FX drilldown, period-end valuation visibility och foreign-amount evidence i reporting och export.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör rapportering, drilldown och export av legal basis, specialtexter, 0%-anledningar, reverse-charge-texter, HUS/grön-specialtext och blockerad rendering utan canonical reason code.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör evidence bundles, sign-off, support reveal och approvaldriven reporting/export lineage.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration dashboards, cutover watch windows, parity views och rollback/fail-forward visibility.
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör scenario coverage views, mismatch reporting, proof bundles och readiness drilldown.
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör search, activity, notifications, saved views, workbench rows, freshness checkpoints och masking i läsytor.
- `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör bokföringssidan, financial workbench, snapshot-/as-of-scope, state badges, drilldowns, export-CTA, masking, reveal och surface semantics för accounting-ytan.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör interimkonton, periodiseringsdrilldown, closing adjustments, reversal chains och reporting/exportparitet för cutoff-posting.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör asset cards, avskrivningar, impairment, disposal, fixed-asset notes och exportparitet för asset-ledger.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör inventory reports, count sessions, ownership boundary, valuation method, inkurans, 14xx/49xx-reporting och inventory exportparitet.
- `KVITTOFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör rapportering, drilldown, export och SIE4 för receipt-driven kostnader, receipt-driven moms, representation receipts, personbilskvitton och merchant refund/correction-spor.

## faser

- Fas 13.1 reporting truth / persistence / classification
- Fas 13.2 locked snapshot / preliminary / supersession
- Fas 13.3 snapshot-scopad drilldown / journal search
- Fas 13.4 reconciliation / signoff / close binding
- Fas 13.5 report export / artifact / distribution
- Fas 13.6 search projection contract / masking / retention
- Fas 13.7 search query / snippet / ranking governance
- Fas 13.8 reindex / checkpoints / replay / repair
- Fas 13.9 object profiles / freshness / action contracts
- Fas 13.10 workbenches / saved views / widgets
- Fas 13.11 mission control / cockpit snapshots
- Fas 13.12 notifications / digest / provider delivery
- Fas 13.13 activity / replay / visibility decisions
- Fas 13.14 route / surface / support boundary / audit
- Fas 13.15 runbook / seed / fake-live / legacy purge

## dependencies

- Domän 1 för canonical repository, truth mode och replay-safe persistence.
- Domän 2 för trust levels, masking, export approvals och watermark rules.
- Domän 3 för bokföringsmassig reporting truth, close-begrepp och retentionkrav.
- Domän 4 för evidence bundles, artifact hashing och distribution controls.
- Domän 5 för provider capability manifests och outbound delivery profiles.
- Domän 16 för support/backoffice/replay/runbook-driven cockpit operations.

## vad som för koras parallellt

- 13.1 kan koras parallellt med design av 13.12 och 13.13 när repository- och classification-reglerna är lasta.
- 13.2 kan koras parallellt med 13.6 när locked snapshot- och maskingkontrakt är definierade.
- 13.7 kan koras parallellt med 13.10 när projection contracts är versionerade.
- 13.11 kan koras parallellt med 13.14 när cockpit freshness objects och surface policy family är lasta.
- 13.15 kan paborjas tidigt, men purge får inte slutforas innan ersättningsrunbooks och nya receipts finns.

## vad som inte för koras parallellt

- 13.2 får inte markeras klar före 13.1.
- 13.3 får inte markeras klar före 13.2.
- 13.4 får inte markeras klar före 13.2 och 13.3.
- 13.5 får inte markeras klar före 13.2 och 13.4.
- 13.9 får inte markeras klar före 13.6 och 13.8.
- 13.10 får inte markeras klar före 13.6, 13.7 och 13.9.
- 13.11 får inte markeras klar före 13.8, 13.9 och 13.10.
- 13.12 och 13.13 får inte markeras klara före 13.1.
- 13.14 får inte markeras klar före 13.5, 13.9, 13.10, 13.11, 13.12 och 13.13.
- 13.15 får inte slutforas före alla replacement runbooks och legacyklassningar finns.

## exit gates

- reporting, search, notifications och activity kor aldrig legal-effect mode på `memory`
- reporting snapshots har explicit `preliminary`, `locked`, `superseded`, `reopened`
- drilldown och journal search kan bevisa att de laser samma locked snapshot truth
- export artifacts har riktig storage profile, artifact hash, distribution receipt och watermark mode
- search projection contracts tillater inte ra payload som shadow database
- object profiles, workbenches och mission control visar verklig freshness/checkpoint-status
- notifications och activity har replaybar durable model
- runbooks för locked reporting och workbench operations finns och är sanna

## test gates

- repository round-trip tester för reporting/search/notifications/activity
- snapshot lock/drilldown/search consistency tests
- export artifact integrity och receipt import tests
- search masking/retention/query governance tests
- freshness/checkpoint/stale-projection tests för object profile/workbench/cockpit
- notification outbox/provider receipt tests
- activity replay/visibility decision tests
- surface-policy/export-approval/support-boundary regression tests

## delfaser

### Delfas 13.1 reporting truth / persistence / classification
- [ ] bygg `ReportingDomainRepository`, `ReportSnapshotStore`, `ReportDefinitionStore`, `ReportingTruthModeStatus` och `ReportingClassificationPolicy`
- [ ] ersätt in-memory reporting state som governing truth i `packages/domain-reporting/src/index.mjs`
- [ ] koppla startup deny till legal-effect-lagen om reporting store inte är durable
- [ ] klassificera reporting snapshots, exports och reconciliation artifacts mot rätt data- och retentionklass

### Delfas 13.2 locked snapshot / preliminary / supersession
- [ ] bygg `ReportSnapshotLifecycle`, `ReportSnapshotLockReceipt`, `ReportSnapshotSupersession`, `ReportSnapshotReopenRequest`
- [ ] infor state machine `draft -> preliminary -> locked -> superseded | reopened`
- [ ] förbjud dold statusmutation av tidigare aktiva definitions/snapshots
- [ ] verifiera reopen, supersession och immutable snapshot hash

### Delfas 13.3 snapshot-scopad drilldown / journal search
- [ ] bygg `ReportLineDrilldownArtifact`, `ReportJournalScope`, `SnapshotBoundSearchRequest`, `SnapshotBoundSearchReceipt`
- [ ] gör report drilldown och journal search strikt snapshot-scopeade
- [ ] förbjud live ledger/document lookup när snapshot-las krävs
- [ ] verifiera att drilldown före och efter ledgerfarandring visar samma lasta sanning

### Delfas 13.4 reconciliation / signoff / close binding
- [ ] bygg `ReconciliationLifecycle`, `ReconciliationCloseReceipt`, `ReconciliationCorrectionRequest`, `ReconciliationRerunRequirement`
- [ ] utoka run lifecycle till `draft -> open -> reviewed -> signed -> closed | reopened | correction_required`
- [ ] bind reconciliation signoff till close/reopen-kedjan i close workbench
- [ ] verifiera correction, reopen och rerun utan dold mutation

### Delfas 13.5 report export / artifact / distribution
- [ ] bygg `ReportExportArtifact`, `ReportExportStorageProfile`, `ReportExportDistributionReceipt`, `ReportExportWatermarkDecision`
- [ ] ersätt `%PDF-FAKE-1.0`, `XLSX-FAKE-1.0` och `memory://` med riktig artifactmodell
- [ ] infor artifact hash, mime type, storage ref, actor receipt och delivery receipt
- [ ] verifiera export, re-download, watermark mode och receipt import

### Delfas 13.6 search projection contract / masking / retention
- [ ] bygg `SearchProjectionContractVersion`, `SearchMaskPolicy`, `SearchRetentionProfile`, `SearchProjectionDocumentReceipt`
- [ ] förbjud ra `detailPayload`, `workbenchPayload`, `snippet` och `searchText` utan kontraktsstyrd projection builder
- [ ] separera canonical truth från index/cache-lager
- [ ] verifiera att index kan rensas och byggas om utan informationsfarlust eller lackage

### Delfas 13.7 search query / snippet / ranking governance
- [ ] bygg `SearchQueryContract`, `SearchFilterPolicy`, `SearchSnippetPolicy`, `SearchRankingProfile`
- [ ] ersätt ad hoc-`includes()`-styrning med kontraktsstyrda queryfalt, filter och sort
- [ ] förbjud snippets som lacker maskade eller irrelevanta fält
- [ ] verifiera deterministisk ranking, team-scope och deny på otillåtna querykombinationer

### Delfas 13.8 reindex / checkpoints / replay / repair
- [ ] bygg `SearchCheckpointState`, `SearchReplayPlan`, `SearchRepairRun`, `SearchProjectionFreshnessReceipt`
- [ ] gör reindex requests, rebuilds och replay first-class med explicit checkpoint lineage
- [ ] förbjud att workbenches/object profiles visar fresh när checkpoint ligger efter source truth
- [ ] verifiera full rebuild, partial replay, poison-case och repair receipts

### Delfas 13.9 object profiles / freshness / action contracts
- [ ] bygg `ObjectProfileContract`, `ObjectProfileFreshnessState`, `ObjectProfileActionContract`, `ObjectProfileAvailabilityReason`
- [ ] ersätt fallback `contract_defined` och syntetisk `targetVersion` med verkliga statusobjekt
- [ ] gör action-knappar och deny reasons kontraktsbundna till projection readiness
- [ ] verifiera `fresh`, `stale`, `blocked`, `missing_projection`

### Delfas 13.10 workbenches / saved views / widgets
- [ ] bygg `WorkbenchContract`, `WorkbenchFreshnessState`, `SavedViewLifecycle`, `WidgetContractVersion`
- [ ] gör saved views invalidationsstyrda vid kontraktsdrift
- [ ] gör widgets beroende av explicit data contract, checkpoint och permission summary
- [ ] verifiera saved-view migration, invalidation och widget rebuild efter kontraktsbyte

### Delfas 13.11 mission control / cockpit snapshots
- [ ] bygg `CockpitSnapshot`, `CockpitBlocker`, `CockpitFreshnessState`, `CockpitGenerationReceipt`
- [ ] ersätt request-time aggregation som governing cockpit truth
- [ ] gör finance close, payroll submission, cutover control och trial conversion till first-class cockpit snapshots
- [ ] verifiera stale cockpit, blocker inheritance och rebuild receipts

### Delfas 13.12 notifications / digest / provider delivery
- [ ] bygg `NotificationOutboxRecord`, `NotificationDeliveryAttempt`, `NotificationProviderReceipt`, `NotificationDigestLifecycle`
- [ ] ersätt in-memory delivery med durable outbox och provider receipt chain
- [ ] bind escalations till operator ownership, retry policy och dead-letter state
- [ ] verifiera single-send, retry, digest supersession och receipt import

### Delfas 13.13 activity / replay / visibility decisions
- [ ] bygg `ActivityProjectionEvent`, `ActivityReplayRun`, `ActivityVisibilityDecision`, `ActivityRetentionRule`
- [ ] separera visibility/hide-policy från själva activity entryn
- [ ] gör rebuild till riktig replay från source events med receipts
- [ ] verifiera replay, dedupe, hide/unhide och retention cutoff

### Delfas 13.14 route / surface / support boundary / audit
- [ ] bygg `MissionControlSurfacePolicy`, `ReportingExportApproval`, `WorkbenchExportApproval`, `ReadSurfaceAuditReceipt`
- [ ] lagg mission control i egen surface-policy-familj
- [ ] bind reporting/search/workbench/cockpit exports till approval, watermark och actor receipt
- [ ] verifiera support deny matrix, export approvals och permission reasons end-to-end

### Delfas 13.15 runbook / seed / fake-live / legacy purge
- [ ] håll `locked-reporting.md` sann och synkad med bokföringssidan, reporting artifacts och locked snapshot-governance i rebuild-kedjan
- [ ] håll `workbench-operations.md` sann och synkad med workbench fresh/stale/masking/rebuild-governance i rebuild-kedjan
- [ ] håll `RELEASE_GATES_OCH_ACCEPTANSKRAV_FOR_BOKFORINGSSIDAN.md` synkad med Domän 13, 17 och 27
- [ ] skriv om `docs/runbooks/fas-11-reporting-verification.md`
- [ ] skriv om `docs/runbooks/fas-15-1-reporting-snapshots-verification.md`
- [ ] skriv om `docs/runbooks/search-index-rebuild-and-repair.md`
- [ ] skriv om `docs/runbooks/notifications-activity-operations.md`
- [ ] skriv om `docs/runbooks/workbench-compatibility.md`
- [ ] skriv om `docs/runbooks/phase15-mission-control-verification.md`
- [ ] flytta `packages/db/seeds/20260321071000_phase3_reporting_reconciliation_demo_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322111000_phase11_reporting_exports_demo_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322131000_phase11_close_workbench_demo_seed.sql` till test-only, archive eller remove
- [ ] migrera bort legacy `core_work_items` från close/reporting-paths

## konkreta verifieringar

- las ett report snapshot, ändra ledgern och verifiera att drilldown fortfarande visar snapshot-bunden sanning
- bygg export artifact, validera hash/storage ref och importera distribution receipt utan att artifact bytes ändras
- kor reindex från tomt index och verifiera att workbench gör från `blocked` till `fresh` med checkpoint proof
- skapa notification, leverera via outbox och verifiera att exakt en provider receipt binds till delivery attempt
- kor activity replay från source events och verifiera att dolda poster fortfarande kan sparas via separat visibility decision

## konkreta tester

- unit: snapshot lifecycle, export artifact hashing, query governance, freshness derivation, digest lifecycle
- integration: reporting export API, search object profile/workbench API, mission control API, notifications/activity API
- regression: support masking, route trust, saved-view invalidation, stale cockpit blocking
- repair: reindex replay, notification retry/dead-letter, activity replay, reconciliation reopen/rerun

## konkreta kontroller vi måste kunna utfora

- kontrollera att ingen reporting/search/notification/activity-surface kan starta legal-effect mode med `memory`
- kontrollera att `targetVersion`, `sourceVersion`, `freshnessState` och checkpoint refs är riktiga objekt, inte syntetiska defaults
- kontrollera att inga export artifacts skrivs som `memory://` eller fake mime content
- kontrollera att search index inte innehåller ra PII-payload utanför kontraktsstyrda projected fields
- kontrollera att alla runbooks i domänen pekar på rebuild-sanningen och inte gamla finaldokument

## markeringar

- keep: reporting routes, search routes, widgets, mission control surfaces som koncept
- harden: permission reasons, saved-view compatibility, activity visibility decisions, surface policies
- rewrite: reporting snapshot lifecycle, reconciliation lifecycle, mission control freshness, search query governance
- replace: fake export artifacts, in-memory notification delivery, in-memory reporting/search truth
- migrate: work items från legacy `upsertWorkItem` till operational model
- archive: gamla reporting/search verification docs och demo seeds som pastar mer an runtime stödjer
- remove: fake-live artifact payloads och osanna bindningspastaenden




