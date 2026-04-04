# DOMAIN_15_IMPLEMENTATION_LIBRARY

## mal

Fas 15 ska byggas sa att:
- migration blir en verklig svensk canonical ingest- och cutovermotor
- varje källfamilj gör genom discovery, auth, extract manifest, canonical dataset, landing receipt och cutover receipt
- source-, target-, cutoff-, parity- och rollback-sanning är tekniskt verklig och inte beroende av manuellt inmatade metrics
- payroll, bureau och trial/live-promotion använder samma hårda migrationsprinciper utan att blandas ihop

## bindande tvärdomänsunderlag

- `FAKTURAFLODET_BINDANDE_SANNING.md` styr hur historiska kundfakturor, krediter, betalallokeringar, överbetalningar, kundförluster, HUS-fakturor och fakturakanaler ska canonicaliseras vid migration.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` styr hur historisk leverantörsreskontra efter posting, supplier advances, AP-betalningar, AP-returer, fees, FX och exported-but-not-booked supplier payment batches ska canonicaliseras vid migration.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` styr hur historiska bankkonton, statement imports, bankline identities, reconciliation outcomes, bank-owned postings och bank balance snapshots ska canonicaliseras vid migration.
- `MOMSFLODET_BINDANDE_SANNING.md` styr hur historiska momsbeslut, box truth, periodisk sammanställning, OSS, importmoms, replacement-declaration lineage och VAT receipts ska canonicaliseras vid migration.
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` styr hur historiska skattekontotransaktioner, `1630`-mirror, ränta, anstånd, refunds, payout blocks och authority receipts ska canonicaliseras vid migration.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr hur historiska vouchers, serier, öppningsbalanser, kontrollkontobindningar, correction chains, period states och SIE4-vouchertruth ska canonicaliseras vid migration.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` styr hur historiska interimkonton, periodiseringsbeslut, closing adjustments, reversal schedules och cutoff-truth ska canonicaliseras vid migration.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` styr hur historiska asset cards, anskaffningsvarden, ackumulerade avskrivningar, impairments, disposals och fixed-asset-truth ska canonicaliseras vid migration.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` styr hur historiska opening inventories, ownership profiles, valuation methods, count-baselines, inkuranshistorik och carrying value ska canonicaliseras vid migration.
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` styr hur open PO, supplier confirmations, received-not-invoiced, invoice-before-receipt holds, ownership acceptance och match history ska canonicaliseras vid migration.
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` styr hur quotes, agreements, orders, change orders, billing triggers och invoice handoff history ska canonicaliseras vid migration.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` styr hur project roots, WIP snapshots, recognition decisions, billable readiness och profitability history ska canonicaliseras vid migration.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` styr hur work orders, time captures, material captures, signoff refs, billable decisions och invoice handoff history ska canonicaliseras vid migration.
- `KVITTOFLODET_BINDANDE_SANNING.md` styr hur historiska receipts, digitala original, pappersoriginal, receipt-driven momsavdrag, gross-cost-only-fall, duplicate fingerprinting och merchant refunds/corrections ska canonicaliseras vid migration.
- `LONEFLODET_BINDANDE_SANNING.md` styr hur historiska pay calendars, payroll input snapshots, pay runs, payslips, corrections, final-pay cases, employee receivables, payout readiness och replay-safe payroll states ska canonicaliseras vid migration.
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` styr hur historiska pay item catalog entries, account profiles, line effect classes, BAS-lönekonton, deduction anchors, receivable anchors och accrual anchors ska canonicaliseras vid migration.
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` styr hur historiska tax decisions, table references, one-time tax basis, jamkningsbeslut, SINK/A-SINK evidence och no-tax certificate lineage ska canonicaliseras vid migration.
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` styr hur historiska contribution decisions, age-regime evidence, temporary reduction windows, växa-support linkage och contribution basis receipts ska canonicaliseras vid migration.
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` styr hur historiska benefit cases, valuation snapshots, ownership decisions, taxable-vs-tax-free lineage och payroll benefit handoffs ska canonicaliseras vid migration.
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` styr hur historiska travel cases, itinerary snapshots, traktamentsbeslut, meal reductions, mileage resolutions och travel payroll handoffs ska canonicaliseras vid migration.
- `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` styr hur historiska pension arrangements, salary exchange agreements, top-up policy refs, special payroll tax lineage och pension payroll handoffs ska canonicaliseras vid migration.
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` styr hur historiska semesterår, intjäningsprofiler, sparade dagar, semesterlonsbeslut, förskottssemesterrecovery och semesterskuldssnapshots ska canonicaliseras vid migration.
- `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` styr hur historiska sjukperioder, karensbeslut, deltidsfrånvaro, läkarintygsstatus, högriskskyddsbeslut och sjuk-payroll-handoffs ska canonicaliseras vid migration.
- `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` styr hur historiska myndighetsbeslut, löneutmatningshistorik, remitteringar, superseded orders och öppna myndighetsskulder ska canonicaliseras vid migration.
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` styr hur historiska negative-net cases, employee receivables, settlement history, bankrepayments och blockerade kvittningsfall ska canonicaliseras vid migration.
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` styr hur historiska payroll payout batches, settlement receipts, returned salary payments, reopened liabilities och reissue history ska canonicaliseras vid migration.
- `AGI_FLODET_BINDANDE_SANNING.md` styr hur historiska AGI-perioder, huvuduppgifter, individuppgifter, receipts, correction chains, removal cases och frånvarotransfereringar ska canonicaliseras vid migration.
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` styr hur historiska AGI-faltrutor, skattefaltsklassning, huvuduppgiftssummor, adjustment-rutor och field-map versions ska canonicaliseras vid migration.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` styr hur historisk `1630`-mirror, authority-event-klassning, payroll/VAT-clearing mot skattekonto, HUS/grön-offsets och unknown authority events ska canonicaliseras vid migration.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` styr hur historiska verifikationsserier, voucher identities, reservationsluckor, correction policies, posting dates och SIE4-serieparitet ska canonicaliseras vid migration.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` styr hur historisk redovisningsvaluta, rate lineage, omräkningsdatum, FX gain/loss, period-end valuation och rounding ska canonicaliseras vid migration.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr hur historisk legal basis, specialtexter, reason-code-lineage, HUS/grön claims och invoice-payload-orsaker ska canonicaliseras vid migration.
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` styr hur historiska HUS-cases, buyer allocations, split-invoice receivables, claim versions, decisions, payouts, tax-account-offsets och recovery chains ska canonicaliseras vid migration.
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` styr hur historiska green-tech cases, installation lines, split-invoice receivables, claim versions, decisions, payouts, tax-account-offsets, VAT timing decisions och recovery chains ska canonicaliseras vid migration.
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` styr hur historiska hard-close states, årsredovisningspaket, K2/K3-classification, INK2/INK2R/INK2S sets, uppskjuten-skatt decisions, filing evidence och årsbokslutskedjor ska canonicaliseras vid migration.
- `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` styr hur historiska utdelningsbeslut, equity sources, owner liabilities, KU31 data, kupongskattekedjor och owner-distribution evidence ska canonicaliseras vid migration.
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` styr hur historiska SIE type 4 files, voucher serialization, `#RAR`, `#KONTO`, `#VER`, `#TRANS`, dimensionsmetadata och roundtrip/parity-evidence ska canonicaliseras vid migration.
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` styr hur historiska momsrapporter, AGI-underlag, reskontror, huvudbok, verifikationslista och balans- eller resultatuppstallningar ska canonicaliseras och jamforas vid migration.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr hur migration evidence bundles, cutover sign-off, delegated approvals, support reveal och break-glass lineage ska byggas.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` styr source bindings, capability receipts, extract manifests, canonical datasets, import batches, parallel run, cutover, watch window, rollback, fail-forward och migration parity som denna domän måste implementera.
- Domän 15 får inte importera fakturahistorik i en modell som bryter mot fakturabibelns objekt, state machines eller proof-ledger.

## Fas 15

### Delfas 15.1 source-discovery / family-detection hardening

- bygg:
  - `SourceSystemProfile`
  - `SourceFamilyDetectionReceipt`
  - `SourceArtifactFingerprint`
  - `SourceDiscoveryBlocker`
- state machines:
  - `SourceSystemProfile: discovered -> classified | blocked | superseded`
- commands:
  - `discoverSourceSystem`
  - `classifySourceSystemFamily`
  - `attachSourceDiscoveryEvidence`
  - `blockSourceSystemProfile`
- events:
  - `SourceSystemDiscovered`
  - `SourceSystemFamilyClassified`
  - `SourceSystemBlocked`
- invariants:
  - one-click får bara kora discovery och skapa ett dry-run-startobjekt
  - `familyCode` får inte sattas utan evidens
  - `documents_only` för aldrig ge `economicTruth=true`
- blockerande valideringar:
  - deny extract om family är `unknown`, `ambiguous` eller `documents_only`
- officiella regler och källor:
  - [Föreningen SIE-Gruppen: format](https://sie.se/format/)
- tester:
  - SIE header detection
  - CSV/Excel fingerprint detection
  - ambiguous family blocking

### Delfas 15.2 source-connection / consent / capability-detection hardening

- bygg:
  - `SourceConnection`
  - `ConsentGrant`
  - `CapabilitySnapshot`
  - `SourceConnectionHealthState`
  - `SourceConnectionExpiryBlocker`
- state machines:
  - `SourceConnection: draft -> authorized | expired | revoked | blocked`
  - `ConsentGrant: pending -> granted | expired | revoked`
- commands:
  - `registerSourceConnection`
  - `grantSourceConsent`
  - `revokeSourceConsent`
  - `deriveCapabilitySnapshot`
- events:
  - `SourceConnectionAuthorized`
  - `SourceConnectionExpired`
  - `CapabilitySnapshotDerived`
- invariants:
  - migrationsdomänen får inte läsa raa secrets; bara secret refs och trust posture
  - extract kraver effektivt giltig consent
  - capability snapshot ska versioneras när auth scopes eller provider baseline ändras
- blockerande valideringar:
  - deny extract när required scopes eller capabilities saknas
- officiella regler och källor:
  - [Fortnox: scopes](https://www.fortnox.se/en/developer/guides-and-good-to-know/scopes)
  - [Visma Developer: authentication](https://developer.vismaonline.com/docs/authentication)
- tester:
  - consent expiry blocking
  - scope change -> capability snapshot rotation
  - file-only bundle path without OAuth

### Delfas 15.3 cutoff-basis / date-hierarchy hardening

- bygg:
  - `CutoffBasis`
  - `CutoffBinding`
  - `CutoffConflictReceipt`
- state machines:
  - `CutoffBasis: draft -> frozen | superseded | blocked`
- commands:
  - `createCutoffBasis`
  - `freezeCutoffBasis`
  - `bindCutoffBasisToDataset`
  - `blockCutoffConflict`
- events:
  - `CutoffBasisFrozen`
  - `CutoffConflictDetected`
- invariants:
  - ett cutover-plan får bara använda en aktiv cutoff-basis-version
  - opening balances, journal history, open items, payroll YTD och AGI history måste röra explicita cutofffalt
  - diff, parallel run, import och switch måste använda samma basis-hash
- blockerande valideringar:
  - deny acceptance om dataset i samma plan bör olika cutoff-basis-versioner
- officiella regler och källor:
  - [Bokföringsnamnden: arkivering](https://www.bfn.se/fragor-och-svar/arkivering/)
  - [Skatteverket: när ska arbetsgivardeklaration lamnas](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/narskajaglamnaarbetsgivardeklaration.4.361dc8c15312eff6fd13c11.html)
- tester:
  - opening balance date validation
  - journal/open-item overlap blocking
  - payroll/AGI period mismatch blocking

### Delfas 15.4 wave-1 ingress canonicalization hardening

- bygg:
  - `ExtractManifest`
  - `ExtractArtifactRef`
  - `IngressFamilyPolicy`
  - `IngressSchemaVersion`
- state machines:
  - `ExtractManifest: requested -> extracted -> frozen | blocked | superseded`
- commands:
  - `extractFromApiSource`
  - `extractFromSie4`
  - `extractFromCsvTemplate`
  - `extractFromExcelTemplate`
  - `extractFromBureauBundle`
- events:
  - `ExtractManifestCreated`
  - `ExtractManifestFrozen`
  - `IngressExtractionBlocked`
- invariants:
  - alla wave-1-ingressvagar måste producera samma manifestmodell
  - SIE4 får inte behandlas som speciallane utanför canonical path
  - unsupported format eller unknown tags får inte tyst ignoreras
- blockerande valideringar:
  - deny extract utan source profile, connection och cutoff basis
- officiella regler och källor:
  - [Föreningen SIE-Gruppen: format](https://sie.se/format/)
  - [Bokio: importera bokföring](https://www.bokio.se/hjalp/komma-igang/importera-bokforing/importera-bokforing-steg-for-steg/)
  - [Bokio: exportera bokföring](https://www.bokio.se/hjalp/bokforing/exportera-bokforing/hur-exporterar-jag-bokforing-fran-bokio/)
- tester:
  - strict SIE parsing
  - CSV/Excel schema enforcement
  - bureau manifest requirement

### Delfas 15.5 canonical-dataset / lineage / raw-artifact governance hardening

- bygg:
  - `CanonicalDataset`
  - `CanonicalDatasetFamily`
  - `DatasetLineageEdge`
  - `RawSourceArtifact`
  - `RawArtifactAccessPolicy`
  - `RawArtifactRetentionProfile`
- state machines:
  - `CanonicalDataset: built -> frozen | superseded | blocked`
  - `RawSourceArtifact: registered -> sealed | archived | purged`
- commands:
  - `registerRawSourceArtifact`
  - `buildCanonicalDataset`
  - `freezeCanonicalDataset`
  - `archiveRawSourceArtifact`
- events:
  - `RawSourceArtifactRegistered`
  - `CanonicalDatasetBuilt`
  - `CanonicalDatasetFrozen`
- invariants:
  - varje dataset måste ha schemaVersion, checksum, lineageRefs och coverage class
  - raartefakter måste vara krypterade, hashade och accessstyrda
  - saknat kritiskt dataset är blocker, inte warning
- blockerande valideringar:
  - deny import, variance och cutover om obligatorisk dataset family saknas
- officiella regler och källor:
  - [Bokföringsnamnden: arkivering](https://www.bfn.se/fragor-och-svar/arkivering/)
  - [Bokföringsnamnden: overfaring av rakenskapsinformation](https://www.bfn.se/vad-innebar-den-andrade-regeln-om-overforing-av-rakenskapsinformation-i-bokforingslagen/)
- tester:
  - dataset checksum stability
  - lineage traceability
  - raw artifact retention/access policy enforcement

### Delfas 15.6 mapping / auto-mapping / confidence / blocker-code hardening

- bygg:
  - `MappingSet`
  - `AutoMappingCandidate`
  - `MappingConfidenceScore`
  - `BlockedFieldDecision`
  - `FieldCoverageReceipt`
- state machines:
  - `MappingSet: draft -> reviewed -> approved | blocked | superseded`
  - `AutoMappingCandidate: proposed -> accepted | rejected | superseded`
- commands:
  - `generateAutoMappingCandidates`
  - `approveMappingSet`
  - `rejectMappingCandidate`
  - `recordFieldCoverageDecision`
- events:
  - `AutoMappingCandidatesGenerated`
  - `MappingSetApproved`
  - `MappingCoverageBlocked`
- invariants:
  - mapping approval kraver coverage- och blocker-status
  - manual override måste röra explanation, actor och source lineage
  - blocked field får inte doljas i approved mapping set
- blockerande valideringar:
  - deny import om required sourcefalt saknar resolved mapping
- tester:
  - confidence scoring
  - blocked field persistence
  - override receipt immutability

### Delfas 15.7 variance / materiality / waiver / signoff hardening

- bygg:
  - `VarianceReport`
  - `VarianceItem`
  - `MaterialityDecision`
  - `WaiverRecord`
  - `VarianceSignoff`
- state machines:
  - `VarianceReport: generated -> reviewed -> accepted | remediation_required | superseded`
  - `WaiverRecord: proposed -> approved | expired | revoked`
- commands:
  - `generateVarianceReport`
  - `decideVarianceItem`
  - `approveVarianceWaiver`
  - `signVarianceReport`
- events:
  - `VarianceReportGenerated`
  - `VarianceWaiverApproved`
  - `VarianceReportAccepted`
- invariants:
  - variance måste räknas av motorn från canonical source + target truth
  - material diff får inte accepteras utan signoff eller waiver där policy kraver det
  - waiver måste vara tidsboxad och scopead till specifika variance items
- blockerande valideringar:
  - deny acceptance om blockerande variance item saknar resolved state
- officiella regler och källor:
  - [Bokföringsnamnden: arkivering](https://www.bfn.se/fragor-och-svar/arkivering/)
- tester:
  - materiality classification
  - waiver expiry
  - engine-generated diff only

### Delfas 15.8 target-write / identity-resolution / duplicate / double-count hardening

- bygg:
  - `TargetWritePolicy`
  - `IdentityResolutionRule`
  - `DuplicateDetectionReceipt`
  - `DoubleCountGuard`
  - `TargetWriteReceipt`
- state machines:
  - `TargetWriteReceipt: planned -> written | blocked | replayed`
- commands:
  - `planTargetWrites`
  - `resolveCanonicalIdentity`
  - `enforceDoubleCountGuard`
  - `writeTargetObjects`
- events:
  - `TargetWritePlanned`
  - `TargetWriteBlocked`
  - `TargetObjectsWritten`
- invariants:
  - varje object family måste ha explicit create/merge/replace/block-policy
  - provider/source refs får inte bli canonical ids
  - samma ekonomiska sanning får inte kunna landa två ganger genom olika ingressvagar
- blockerande valideringar:
  - deny import om identity resolution är ambiguous eller double-count guard traffar
- tester:
  - duplicate customer/vendor tests
  - open-item double-count tests
  - external-ref isolation tests

### Delfas 15.9 import-execution / domain-landing / idempotency hardening

- bygg:
  - `ImportBatchExecution`
  - `ImportWriteReceipt`
  - `LandingFailureRecord`
  - `ImportReplayReceipt`
- state machines:
  - `ImportBatchExecution: received -> validated -> landing -> landed | blocked | replay_required`
- commands:
  - `executeImportBatch`
  - `replayFailedImportLanding`
  - `recordLandingFailure`
- events:
  - `ImportBatchLandingStarted`
  - `ImportBatchLandingCompleted`
  - `ImportBatchLandingFailed`
- invariants:
  - import får bara landa via riktiga targetdomän-kommandon
  - status får inte hoppa direkt till `reconciled` utan target receipts
  - idempotency gäller bade batch och per target object
- blockerande valideringar:
  - deny accepted batch om target receipts saknas
- tester:
  - batch idempotency
  - object-level replay
  - failure receipts

### Delfas 15.10 parallel-run / parity / threshold hardening

- bygg:
  - `ParallelRunPlan`
  - `ParallelRunMeasurement`
  - `ParallelRunThresholdProfile`
  - `ParityDecision`
  - `ParallelRunAcceptanceReceipt`
- state machines:
  - `ParallelRunPlan: planned -> running -> completed | manual_review_required | blocked | accepted`
- commands:
  - `startParallelRunPlan`
  - `computeParallelRunMeasurements`
  - `acceptParallelRunPlan`
- events:
  - `ParallelRunMeasurementsComputed`
  - `ParallelRunBlocked`
  - `ParallelRunAccepted`
- invariants:
  - measurements måste komma från source + target receipts och shared cutoff basis
  - caller får inte injecta metrics
  - manual acceptance får bara ske inom policygranser
- blockerande valideringar:
  - deny acceptance när hard block-threshold eller basis mismatch finns
- tester:
  - threshold evaluation
  - shared cutoff-basis enforcement
  - manual review policy

### Delfas 15.11 cutover-plan / final-extract / delta-extract / switch hardening

- bygg:
  - `CutoverPlan`
  - `FreezeWindowState`
  - `FinalExtractArtifact`
  - `DeltaExtractArtifact`
  - `SwitchReceipt`
  - `CutoverValidationReceipt`
- state machines:
  - `CutoverPlan: planned -> freeze_started -> final_extract_done -> validation_passed -> switched -> stabilized -> closed | rollback_in_progress | rolled_back | aborted`
- commands:
  - `startCutoverFreeze`
  - `completeFinalExtract`
  - `computeDeltaExtract`
  - `validateCutoverPlan`
  - `switchCutoverTruth`
- events:
  - `CutoverFreezeStarted`
  - `FinalExtractCompleted`
  - `CutoverValidationPassed`
  - `CutoverSwitched`
- invariants:
  - final extract måste ge manifest, checksum, dataset refs och actor receipt
  - delta extract måste vara explicit skillnad efter freeze
  - switch får inte vara ren statustransition
- blockerande valideringar:
  - deny switch om final extract artifact eller parity acceptance saknas
- tester:
  - final extract artifact creation
  - delta extract correctness
  - switch receipt generation

### Delfas 15.12 rollback / restore / checkpoint / compensation hardening

- bygg:
  - `CutoverCheckpoint`
  - `RollbackPlan`
  - `RollbackExecutionReceipt`
  - `RollbackCompensationPlan`
  - `RollbackModeDecision`
- state machines:
  - `RollbackPlan: planned -> executing -> completed | blocked`
- commands:
  - `createCutoverCheckpoint`
  - `decideRollbackMode`
  - `executeRestoreBackedRollback`
  - `executeCompensationRollback`
- events:
  - `RollbackModeDecided`
  - `RollbackExecuted`
  - `RollbackBlocked`
- invariants:
  - rollback måste explicit vara `restore_backed` eller `post_switch_compensation`
  - restore-backed rollback kraver checkpoint lineage och godkänd restore drill
  - compensation-mode kraver explicit policy för regulated filings
- blockerande valideringar:
  - deny rollback om checkpoint eller compensation plan saknas för valt mode
- tester:
  - rollback mode selection
  - restore-backed rollback
  - regulated compensation requirements

### Delfas 15.13 post-cutover correction / watch-window hardening

- bygg:
  - `PostCutoverCorrectionCase`
  - `WatchWindowState`
  - `WatchSignal`
  - `CorrectionClosureReceipt`
- state machines:
  - `PostCutoverCorrectionCase: open -> approved -> implemented -> closed | reopened`
  - `WatchWindowState: active -> stable | blocked | closed`
- commands:
  - `openPostCutoverCorrectionCase`
  - `recordWatchSignal`
  - `closeWatchWindow`
- events:
  - `WatchSignalRecorded`
  - `PostCutoverCorrectionOpened`
  - `WatchWindowClosed`
- invariants:
  - cutover close får inte ske medan watch window är blockerad
  - correction lane måste röra owner, SLA och signoff där policy kraver det
- blockerande valideringar:
  - deny cutover close om correction cases eller watch blockers är öppna
- tester:
  - watch-window blocker propagation
  - correction reopen
  - cutover close denial

### Delfas 15.14 payroll-history / YTD / AGI / balance landing hardening

- bygg:
  - `PayrollMigrationBatch`
  - `EmployeeMigrationRecord`
  - `PayrollHistoryLandingReceipt`
  - `YtdCarryForwardReceipt`
  - `AgiCarryForwardReceipt`
  - `PayrollMigrationExecutionReceipt`
- state machines:
  - `PayrollMigrationBatch: draft -> imported -> validated -> diff_open -> approved_for_cutover -> cutover_executed | rolled_back | blocked`
- commands:
  - `importPayrollHistoryRecords`
  - `validatePayrollHistoryCoverage`
  - `finalizePayrollMigrationLanding`
  - `rollbackPayrollMigrationLanding`
- events:
  - `PayrollHistoryImported`
  - `PayrollMigrationValidated`
  - `PayrollMigrationFinalized`
  - `PayrollMigrationRolledBack`
- invariants:
  - finalize får inte reduceras till balance baseline-posting
  - YTD/AGI carry-forward måste kunna lasas av riktig payrollruntime efter migration
  - history evidence bundle måste tacka varje required evidence area
- blockerande valideringar:
  - deny finalize om landing receipt saknas för required payrollomraden
- officiella regler och källor:
  - [Skatteverket: när ska arbetsgivardeklaration lamnas](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/narskajaglamnaarbetsgivardeklaration.4.361dc8c15312eff6fd13c11.html)
  - [Skatteverket: ratta en arbetsgivardeklaration](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/rattaenarbetsgivardeklaration.4.2cf1b5cd163796a5c8b6698.html)
- tester:
  - payroll evidence coverage
  - YTD/AGI landing semantics
  - finalize/rollback receipts

### Delfas 15.15 bureau-portfolio / delegated-approval / cohort hardening

- bygg:
  - `BureauMigrationPortfolio`
  - `ClientMigrationScope`
  - `DelegatedMigrationApproval`
  - `MigrationCohortDashboard`
  - `ClientScopeIsolationReceipt`
- state machines:
  - `DelegatedMigrationApproval: requested -> approved | rejected | revoked`
- commands:
  - `createBureauMigrationPortfolio`
  - `delegateMigrationApproval`
  - `buildMigrationCohortDashboard`
- events:
  - `BureauPortfolioCreated`
  - `MigrationApprovalDelegated`
  - `CohortDashboardBuilt`
- invariants:
  - byra och klientdata för aldrig bloda mellan scopes
  - dashboard måste bygga på riktiga plan-, dataset- och cutoverobjekt
- blockerande valideringar:
  - deny delegated signoff om actor scope inte matchar klientscope
- tester:
  - multi-client isolation
  - delegated approval boundary
  - cohort dashboard truth

### Delfas 15.16 trial-live-promotion / non-in-place isolation hardening

- bygg:
  - `PromotionMigrationLink`
  - `PromotionIsolationReceipt`
  - `ForbiddenCarryOverDecision`
- state machines:
  - `PromotionMigrationLink: drafted -> validated -> executed | blocked`
- commands:
  - `linkPromotionToMigrationCutover`
  - `verifyPromotionIsolation`
- events:
  - `PromotionLinkedToMigration`
  - `PromotionIsolationVerified`
- invariants:
  - copy-to-new-live-tenant är enda tillåtna promotion mode där promotion används
  - migration cutover och promotion får inte skapa två oberoende live-sanningar
- blockerande valideringar:
  - deny promotion om forbidden carry-över refs eller artifacts finns
- tester:
  - copy-not-mutate enforcement
  - forbidden carry-över blocking
  - promotion/migration evidence linkage

### Delfas 15.17 route / surface / runbook / seed / legacy purge

- bygg:
  - `MigrationRouteContract`
  - `MigrationSurfaceMap`
  - `RunbookTruthReceipt`
  - `MigrationSeedScopePolicy`
  - `LegacyMigrationClaimRemovalReceipt`
- commands:
  - `publishMigrationRouteContract`
  - `rewriteMigrationRunbookTruth`
  - `classifyMigrationSeedScope`
  - `removeLegacyMigrationClaim`
- invariants:
  - `/v1/sie/*`, `/v1/migration/*`, `/v1/import-cases/*`, `/v1/payroll/migrations/*` och trial-promotion surfaces måste ha tydligt separerade syften
  - runbooks får inte beskriva cockpitmetadata som teknisk migrationsmotor
  - demo seeds får inte finnas i protected/livevagar
- blockerande valideringar:
  - deny release om route contract och runbook truth driver från rebuild-sanningen
- tester:
  - route truth lint
  - runbook truth lint
  - protected-mode demo-seed deny

### Delfas 15.18 Swedish source priority / competitor migration friction hardening

- bygg:
  - `SourcePriorityWave`
  - `MigrationMarketEvidence`
  - `SourceFrictionDecision`
- commands:
  - `publishSourcePriorityWave`
  - `recordMigrationMarketEvidence`
  - `classifySourceMigrationFriction`
- invariants:
  - svenska wave-1-källor måste prioriteras före long-tail adapters
  - varje prioriterad source family måste ha officiell auth/export/import-evidens
  - unsupported high-friction source måste klassas explicit, inte antydas som klar
- blockerande valideringar:
  - deny wave-1-ready claim om official-source evidence saknas
- officiella regler och källor:
  - [Fortnox: scopes](https://www.fortnox.se/en/developer/guides-and-good-to-know/scopes)
  - [Visma Developer: authentication](https://developer.vismaonline.com/docs/authentication)
  - [Bokio: importera bokföring](https://www.bokio.se/hjalp/komma-igang/importera-bokforing/importera-bokforing-steg-for-steg/)
  - [Bokio: exportera bokföring](https://www.bokio.se/hjalp/bokforing/exportera-bokforing/hur-exporterar-jag-bokforing-fran-bokio/)
- tester:
  - source-priority lint
  - wave-1 evidence completeness

## vilka bevis som krävs innan något marks som migrationsklart, cutoverklart eller production-ready

- verklig runtime för discovery, extract, canonical datasets, landing, parity, cutover och rollback
- durable state för alla objekt som styr extract, cutoff, landing, parity, signoff eller rollback
- motorberaknade diffar och parallel-run measurements
- officiella källor lasta för SIE, bokföringsarkivering, AGI-rättelser och source-provider-auth
- receipts för target writes, final extract, switch, rollback och post-cutover correction
- runbooks som beskriver den faktiska rebuild-sanningen, inte aldre claims

## vilka risker som kraver mansklig flaggning

- val av verkliga externa konton, OAuth credentials, certifikat eller provideravtal
- irreversibla policybeslut för regulated rollback efter skickade filings
- slutlig wave-1-prioritering om två svenska källfamiljer konkurrerar om samma leveransfanster
- businessbeslut om vilken payroll-/HR-historik som måste landa som canonical truth vs archived evidence only




