# DOMAIN_13_IMPLEMENTATION_LIBRARY

## mal

Fas 13 ska byggas sa att:
- reporting blir en verklig, läsbar och reproducerbar sanningsyta
- search, object profiles, workbenches och mission control visar styrd projection truth med verklig freshness
- notifications och activity gör att leverera, återkora, reparera och auditera
- exports, widgets, saved views och cockpits aldrig doljer stale eller osaker data
- retention, masking, audit och support boundaries är tydligare an i dagens runtime

## bindande tvärdomänsunderlag

- `FAKTURAFLODET_BINDANDE_SANNING.md` styr hur fakturor, krediter, kundfordringar, momsutfall och issue/payment-verifikationer ska synas i reporting, drilldown, export och SIE4.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` styr hur leverantörsfakturor, kreditnotor, purchase-side momsutfall och skapandet av AP-open-items ska synas i reporting, drilldown, export och SIE4.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` styr hur leverantörsreskontra efter posting, supplier advances, AP-payment-verifikationer, AP-returer, netting, fees och FX ska synas i reporting, drilldown, export och SIE4.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` styr hur bankkonto, statement lines, bankavstämning, bankavgifter, ränteposter, interna överföringar och annan bank-owned legal effect ska synas i reporting, drilldown, export och SIE4.
- `MOMSFLODET_BINDANDE_SANNING.md` styr hur momsbeslut, box truth, periodisk sammanställning, OSS, avdragsrätt, importmoms, replacement declarations och receipts ska synas i reporting, drilldown, export och SIE4.
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` styr hur skattekonto, `1630`-mirror, authority transactions, ränta, anstånd, utbetalningsspärr, refunds och receipts ska synas i reporting, drilldown, export och SIE4.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr hur vouchers, serier, huvudbok, grundbok, provbalans, correction lineage och SIE4-voucherstruktur ska synas i reporting, drilldown och export.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` styr hur `1630`-owner-binding, authority-event-klassning, HUS/grön-offsetdrilldown och tax-account mapping parity ska synas i reporting och export.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` styr hur seriespecifik drilldown, voucher identity, reservationsluckor, correction lineage och SIE4-serieparitet ska synas i reporting och export.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` styr hur redovisningsvaluta, rate-lineage, FX drilldown, period-end valuation visibility och foreign-amount evidence ska synas i reporting och export.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr hur legal basis, specialtexter, 0%-anledningar, reverse-charge-texter, HUS/grön-specialtext och blockerad rendering utan canonical reason code ska synas i reporting och export.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr hur evidence bundles, sign-off packages, support reveal och approval lineage ska synas i reporting, drilldown och operator workbenches.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` styr hur migration dashboards, cutover watch windows, rollback/fail-forward visibility och parity status ska synas i reporting och mission control.
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` styr hur scenario coverage, mismatch findings, proof bundles och readiness verdict ska synas i reporting, drilldown och workbenches.
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` styr hur search, activity, notifications, saved views, workbench rows, freshness checkpoints och masking ska byggas i Domän 13.
- `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` styr hur bokföringssidan, financial workbench, snapshot-/as-of-scope, state badges, drilldowns, export-CTA, masking, reveal och surface semantics ska byggas i Domän 13.
- `RELEASE_GATES_OCH_ACCEPTANSKRAV_FOR_BOKFORINGSSIDAN.md` ska hållas synkad med Domän 13, Domän 17 och Domän 27 när releasegates, no-go-signoff och acceptanskrav för bokföringssidan ändras.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` styr hur interimkonton, periodiseringsbeslut, closing adjustments, reversal schedules och bokslutscutoff ska synas i reporting, drilldown, export och SIE4.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` styr hur asset cards, avskrivningsplaner, impairment, disposal och fixed-asset note-underlag ska synas i reporting, drilldown, export och SIE4.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` styr hur inventory reports, count sessions, ownership boundary, valuation method, inkurans, 14xx/49xx-reporting och inventory evidence packs ska synas i reporting, drilldown, export och SIE4.
- `KVITTOFLODET_BINDANDE_SANNING.md` styr hur receipt-driven postings, gross-cost-only-fall, representation receipts, personbilskvitton, digitala receiptoriginal och correction/refund-spor ska synas i reporting, drilldown, export och SIE4.
- Domän 13 får inte skapa egen rapporttolkning av fakturaflödet som avviker från fakturabibelns proof-ledger eller momsrutekarta.

## Fas 13

### Delfas 13.1 reporting truth / persistence / classification

- bygg:
  - `ReportingDomainRepository`
  - `ReportDefinition`
  - `ReportSnapshot`
  - `ReportingTruthModeStatus`
  - `ReportingClassificationPolicy`
- state machines:
  - `ReportingTruthModeStatus: unresolved -> repository_required -> repository_active | blocked`
- commands:
  - `requireReportingRepositoryMode`
  - `publishReportingClassificationPolicy`
  - `verifyReportingTruthMode`
- events:
  - `ReportingTruthModeVerified`
  - `ReportingTruthModeBlocked`
  - `ReportingClassificationPolicyPublished`
- invariants:
  - legal-effect reporting för aldrig koras på `memory`
  - reportingklassning måste uttryckligen skilja bokföringsmassigt bevarande från cache/read-model-data
- blockerande valideringar:
  - deny startup i `protected`, `pilot_parallel`, `production` om reporting repository inte är durable
- tester:
  - boot deny on memory store
  - repository round-trip för definitions and snapshots

### Delfas 13.2 locked snapshot / preliminary / supersession

- bygg:
  - `ReportSnapshotLifecycle`
  - `ReportSnapshotLockReceipt`
  - `ReportSnapshotSupersession`
  - `ReportSnapshotReopenRequest`
- state machines:
  - `ReportSnapshot: draft -> preliminary -> locked -> superseded | reopened`
- commands:
  - `createPreliminaryReportSnapshot`
  - `lockReportSnapshot`
  - `supersedeReportSnapshot`
  - `requestReportSnapshotReopen`
- events:
  - `ReportSnapshotLocked`
  - `ReportSnapshotSuperseded`
  - `ReportSnapshotReopenRequested`
- invariants:
  - last snapshot för aldrig skrivas över
  - supersession ska peka på bade tidigare och ny snapshot
  - reopen måste skapa ny lifecycle-gren, inte mutera historik tyst
- blockerande valideringar:
  - deny export, signoff och drilldown om snapshot inte är `locked` när policyn kraver det
- tester:
  - snapshot hash immutability
  - reopen and supersession lineage tests

### Delfas 13.3 snapshot-scopad drilldown / journal search

- bygg:
  - `ReportLineDrilldownArtifact`
  - `ReportJournalScope`
  - `SnapshotBoundSearchRequest`
  - `SnapshotBoundSearchReceipt`
- commands:
  - `buildReportLineDrilldown`
  - `searchSnapshotBoundJournalEntries`
- invariants:
  - drilldown får bara läsa journal ids och dokumentrefs som är bundna till snapshot scope
  - efterföljande ledgerfarandringar får inte ändra last drilldown-resultat
- blockerande valideringar:
  - deny live lookup om `snapshotScopeRef` saknas
- tester:
  - locked snapshot drilldown stability tests
  - journal search before/after ledger mutation tests

### Delfas 13.4 reconciliation / signoff / close binding

- bygg:
  - `ReconciliationRun`
  - `ReconciliationDifferenceItem`
  - `ReconciliationCloseReceipt`
  - `ReconciliationCorrectionRequest`
  - `ReconciliationRerunRequirement`
- state machines:
  - `ReconciliationRun: draft -> open -> reviewed -> signed -> closed | reopened | correction_required`
- commands:
  - `createReconciliationRun`
  - `reviewReconciliationRun`
  - `signOffReconciliationRun`
  - `closeReconciliationRun`
  - `reopenReconciliationRun`
- invariants:
  - signoff racker inte för close
  - close måste röra refs till locked report snapshots och close checklist items
- blockerande valideringar:
  - deny close om öppna difference items eller saknade signoffs finns
- tester:
  - signoff/close/reopen chain tests
  - correction-required rerun tests

### Delfas 13.5 report export / artifact / distribution

- bygg:
  - `ReportExportArtifact`
  - `ReportExportStorageProfile`
  - `ReportExportDistributionReceipt`
  - `ReportExportWatermarkDecision`
  - `ReportExportApproval`
- state machines:
  - `ReportExportArtifact: requested -> built -> stored -> distributed | failed | revoked`
- commands:
  - `requestReportExport`
  - `buildReportExportArtifact`
  - `storeReportExportArtifact`
  - `registerReportExportDistributionReceipt`
- invariants:
  - artifact content, hash, mime type och storage ref måste vara first-class
  - fake bytes eller `memory://` för aldrig användas i legal-effect mode
- blockerande valideringar:
  - deny distribution om artifact hash, storage ref eller approval saknas
- tester:
  - artifact hash reproducibility
  - distribution receipt import tests

### Delfas 13.6 search projection contract / masking / retention

- bygg:
  - `SearchProjectionContractVersion`
  - `SearchProjectionFieldPolicy`
  - `SearchMaskPolicy`
  - `SearchRetentionProfile`
  - `SearchProjectionDocumentReceipt`
- state machines:
  - `SearchProjectionContractVersion: draft -> approved -> active | superseded | revoked`
- commands:
  - `publishSearchProjectionContractVersion`
  - `indexProjectionDocument`
  - `purgeSearchProjectionDocument`
- invariants:
  - sakindex får bara innehålla kontraktsgodkanda projected fields
  - raw source payload för aldrig lagras som index-truth
  - retention för cache/index måste kunna vara kortare an BFL-bevarande för canonical accounting truth
- blockerande valideringar:
  - deny index write om field policy eller mask policy saknas
- officiella regler och källor:
  - [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
  - [IMY: grundlaggande principer enligt GDPR](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/grundlaggande-principer/)
- tester:
  - projected-field-only tests
  - retention and purge safety tests

### Delfas 13.7 search query / snippet / ranking governance

- bygg:
  - `SearchQueryContract`
  - `SearchFilterPolicy`
  - `SearchSnippetPolicy`
  - `SearchRankingProfile`
- commands:
  - `executeGovernedSearchQuery`
  - `previewSearchSnippet`
  - `publishSearchRankingProfile`
- invariants:
  - queryable fields, filter operators och sort orders måste vara deklarativa
  - snippets för aldrig innehålla maskade fält eller oexplicit payload
- blockerande valideringar:
  - deny unsupported query/filter/sort
  - deny snippet generation för fält utanför policy
- tester:
  - deterministic ranking tests
  - snippet masking tests

### Delfas 13.8 reindex / checkpoints / replay / repair

- bygg:
  - `SearchCheckpointState`
  - `SearchReplayPlan`
  - `SearchRepairRun`
  - `SearchProjectionFreshnessReceipt`
- state machines:
  - `SearchCheckpointState: pending -> caught_up | stale | blocked | replay_required`
  - `SearchRepairRun: planned -> started -> completed | failed`
- commands:
  - `requestSearchReindex`
  - `planSearchReplay`
  - `executeSearchRepairRun`
- invariants:
  - freshness måste harledas från explicit checkpoint, inte från `now`
  - replay och repair ska lamna receipts med source version range
- blockerande valideringar:
  - deny `fresh` status om checkpoint ligger efter senaste source version
- tester:
  - full rebuild tests
  - stale-to-fresh transition tests

### Delfas 13.9 object profiles / freshness / action contracts

- bygg:
  - `ObjectProfileContract`
  - `ObjectProfileFreshnessState`
  - `ObjectProfileActionContract`
  - `ObjectProfileAvailabilityReason`
- state machines:
  - `ObjectProfileFreshnessState: missing_projection -> stale | fresh | blocked`
- commands:
  - `materializeObjectProfile`
  - `publishObjectProfileActionContract`
- invariants:
  - `targetVersion` måste vara verklig projected version
  - action availability måste vara kontrakts- och permissionbunden
- blockerande valideringar:
  - deny `fresh` när source version > projected version
  - deny actionable profile när contract version mismatch finns
- tester:
  - stale/fresh/object-missing tests
  - permission-reason rendering tests

### Delfas 13.10 workbenches / saved views / widgets

- bygg:
  - `WorkbenchContract`
  - `WorkbenchFreshnessState`
  - `SavedViewLifecycle`
  - `WidgetContractVersion`
  - `SavedViewInvalidationReceipt`
- state machines:
  - `SavedViewLifecycle: draft -> active | invalidated | superseded | archived`
- commands:
  - `publishWorkbenchContract`
  - `createSavedView`
  - `invalidateSavedView`
  - `publishWidgetContractVersion`
- invariants:
  - saved views får inte fortsatta som aktiva efter brytande kontraktsdrift
  - widgets måste röra checkpoint ref, contract ref och permission summary
- blockerande valideringar:
  - deny widget render om freshness state är `blocked`
- tester:
  - saved-view invalidation tests
  - widget contract migration tests

### Delfas 13.11 mission control / cockpit snapshots

- bygg:
  - `CockpitSnapshot`
  - `CockpitBlocker`
  - `CockpitFreshnessState`
  - `CockpitGenerationReceipt`
- state machines:
  - `CockpitSnapshot: pending -> generated -> fresh | stale | blocked | superseded`
- commands:
  - `generateCockpitSnapshot`
  - `markCockpitSnapshotStale`
  - `acknowledgeCockpitBlocker`
- invariants:
  - cockpit för aldrig utge sig för att vara live truth utan freshness proof
  - blocker inheritance från underliggande queues/checkpoints måste vara explicit
- blockerande valideringar:
  - deny operational go/no-go-beslut på cockpit utan `fresh` eller explicit override receipt
- tester:
  - cockpit stale/blocker tests
  - snapshot supersession tests

### Delfas 13.12 notifications / digest / provider delivery

- bygg:
  - `NotificationOutboxRecord`
  - `NotificationDeliveryAttempt`
  - `NotificationProviderReceipt`
  - `NotificationDigest`
  - `NotificationEscalationDecision`
- state machines:
  - `NotificationOutboxRecord: queued -> dispatched -> delivered | retry_scheduled | dead_letter`
  - `NotificationDigest: draft -> ready -> delivered | superseded | failed`
- commands:
  - `queueNotification`
  - `dispatchNotificationOutboxRecord`
  - `importNotificationProviderReceipt`
  - `buildNotificationDigest`
- invariants:
  - varje leveransfarsak måste ha idempotency key
  - provider receipt måste knytas till exakt delivery attempt
- blockerande valideringar:
  - deny provider-level `delivered` utan receipt import
- tester:
  - single-send and retry tests
  - digest supersession tests

### Delfas 13.13 activity / replay / visibility decisions

- bygg:
  - `ActivityProjectionEvent`
  - `ActivityReplayRun`
  - `ActivityVisibilityDecision`
  - `ActivityRetentionRule`
- state machines:
  - `ActivityReplayRun: planned -> started -> completed | failed`
  - `ActivityVisibilityDecision: proposed -> approved -> active | expired | revoked`
- commands:
  - `projectActivityEvent`
  - `replayActivityProjection`
  - `approveActivityVisibilityDecision`
- invariants:
  - hide/unhide ska vara separat policyobjekt, inte mutation av källaktiviteten
  - activity feed måste kunna återbyggas från source events och receipts
- blockerande valideringar:
  - deny destructive hide som raderar original activity proof
- tester:
  - replay determinism tests
  - hide/unhide decision tests

### Delfas 13.14 route / surface / support boundary / audit

- bygg:
  - `MissionControlSurfacePolicy`
  - `ReportingExportApproval`
  - `WorkbenchExportApproval`
  - `ReadSurfaceAuditReceipt`
  - `SurfacePermissionReason`
- commands:
  - `publishMissionControlSurfacePolicy`
  - `approveReportingExport`
  - `approveWorkbenchExport`
- invariants:
  - mission control måste ha egen surface family
  - exports från reporting/search/workbench/cockpit kraver watermark och actor receipt där policy kraver det
- blockerande valideringar:
  - deny export utan approval/watermark
  - deny support read utanför mask policy
- tester:
  - route trust regression tests
  - support/export boundary tests

### Delfas 13.15 runbook / seed / fake-live / legacy purge

- bygg:
  - `Domain13RunbookClassification`
  - `Domain13LegacyTruthRecord`
  - `Domain13SeedIsolationReceipt`
- commands:
  - `classifyDomain13Runbook`
  - `archiveDomain13LegacyDocument`
  - `isolateDomain13DemoSeed`
  - `removeDomain13FakeLiveClaim`
- invariants:
  - ingen doc, seed eller demo artifact för pasta live capability som runtime inte stödjer
  - demo seeds för aldrig na protected/live bootstrap
- blockerande valideringar:
  - deny docs release om gamla bindningspastaenden återstar
  - deny protected boot om demo seed ingor i legal-effect config
- tester:
  - docs capability lint
  - seed isolation boot deny tests

## vilka bevis som krävs innan domän 13 marks som klar

- durable repositories och riktiga migrations används för reporting/search/notifications/activity
- reporting snapshots kan lasas, återöppnas och supersederas utan dold mutation
- drilldown, journal search och exports visar samma snapshot truth
- search/workbenches/object profiles/cockpits visar verklig freshness från checkpoints
- notifications och activity kan replayas och repareras med receipts
- runbooks och seeds är sanerade från gamla bindningspastaenden och fake-live material

## vilka risker som kraver mansklig flaggning

- retentionkonflikter mellan bokföringsmassigt bevarande och dataminimering
- exportdistribution till extern provider där konto, certifikat eller verklig leveranskanal saknas
- policybeslut om vilka cockpitytor som för användas för operativt go/no-go-beslut
- irreversibel purge eller arkivering av aldre reporting/search artifacts




