# DOMAIN_09_IMPLEMENTATION_LIBRARY

## Mål

Detta dokument beskriver exakt hur Domän 09 ska byggas så att kollektivavtal blir verklig körbar sanningskälla för payroll och time. Dokumentet är inte en översikt. Det är byggspecen för:
- avtalsfamiljer
- avtalsversioner
- katalogpublicering
- employment-binding
- lokala supplements
- exceptions och overrides
- source-artifacts
- parsing och normalisering
- clause coverage
- compiled overlays
- pay-component execution
- payroll/time-consumption
- line traceability
- retro/delta/correction
- durability, audit, replay och migration

## Fas 9

### Delfas 9.1 Agreement family/version/catalog truth model

#### Vad som ska byggas

- `AgreementFamily`
- `AgreementVersion`
- `AgreementCatalogEntry`
- `AgreementPublicationReceipt`

#### Exakta objekt

- `AgreementFamily(agreementFamilyId, companyId, canonicalCode, displayName, sectorCode, familyStatus, sourceAuthorityCode, createdAt, archivedAt)`
- `AgreementVersion(agreementVersionId, agreementFamilyId, versionCode, effectiveFrom, effectiveTo, versionStatus, rulepackCode, rulepackVersion, compileReceiptId, supersedesVersionId, replacedByVersionId, createdAt, publishedAt)`
- `AgreementCatalogEntry(agreementCatalogEntryId, agreementVersionId, catalogCode, dropdownLabel, publicationScopeCode, catalogStatus, publishedBy, publishedAt, sourceReceiptId, supersededByCatalogEntryId)`
- `AgreementPublicationReceipt(publicationReceiptId, agreementVersionId, compileReceiptId, coverageReceiptId, reviewDecisionId, actorId, createdAt)`

#### State machines

- `AgreementVersion`
  - `draft -> compiled -> review_pending -> approved -> published -> superseded | retired`
- `AgreementCatalogEntry`
  - `draft -> verified -> published -> superseded | retired`

#### Commands

- `createAgreementFamily`
- `createAgreementVersionDraft`
- `attachAgreementCompileReceipt`
- `submitAgreementVersionForReview`
- `approveAgreementVersion`
- `publishAgreementCatalogEntry`
- `retireAgreementCatalogEntry`

#### Events

- `agreement_family.created`
- `agreement_version.drafted`
- `agreement_version.compiled`
- `agreement_version.review_submitted`
- `agreement_version.approved`
- `agreement_version.published`
- `agreement_catalog_entry.superseded`

#### Invariants

- `published` version måste ha `compileReceiptId`, `coverageReceiptId` och `reviewDecisionId`
- `AgreementCatalogEntry` får bara peka på `published` version
- family code och version code måste vara deterministiska och unika inom company

#### Valideringar som blockerar fel

- deny om compile receipt saknas
- deny om coverage receipt saknas
- deny om version försöker hoppa direkt från `draft` till `published`
- deny om catalog entry försöker publicera version med öppen blocker

#### Routes/API-kontrakt

- `POST /v1/collective-agreements/families`
- `POST /v1/collective-agreements/versions/drafts`
- `POST /v1/collective-agreements/versions/{agreementVersionId}/compile-receipts`
- `POST /v1/collective-agreements/versions/{agreementVersionId}/submit-review`
- `POST /v1/backoffice/collective-agreements/versions/{agreementVersionId}/approve`
- `POST /v1/collective-agreements/catalog`

#### Permissions/review-boundaries

- family/version draft: `collective_agreement_manage`
- review submit: `collective_agreement_manage`
- approve/publish: `collective_agreement_publish_high_risk`
- strong MFA + fresh trust krävs för publish

#### Audit/evidence/receipt-krav

- varje publish måste få `AgreementPublicationReceipt`
- publish receipt måste länka source artifact, compile receipt, coverage receipt och reviewer

#### Replay/recovery/dead-letter-regler

- replay av publish får inte skapa ny catalog entry om samma `commandId` redan lyckats
- dead-letter i publish måste återköras mot samma versionstatus

#### Migrations-/cutover-/rollback-regler

- importerad avtalsversion måste mappas till samma objektmodell
- rollback måste kunna återställa föregående publicerade catalog entry

#### Officiella regler och källor

- Riksdagen, Lag (1976:580) om medbestämmande i arbetslivet

#### Tester som bevisar delfasen

- unit för version- och catalog-state machines
- integration för publish blocker utan receipts
- integration för supersession lineage

### Delfas 9.2 Effective-dating/overlap/supersede model

#### Vad som ska byggas

- `VersionSupersessionPlan`
- `AgreementEffectiveWindow`
- `AgreementWindowConflict`

#### Exakta objekt

- `VersionSupersessionPlan(planId, agreementFamilyId, outgoingVersionId, incomingVersionId, handoverDate, splitPeriodPolicyCode, createdAt)`
- `AgreementEffectiveWindow(windowId, ownerType, ownerId, validFrom, validTo, sourceDecisionId)`
- `AgreementWindowConflict(conflictId, agreementFamilyId, leftOwnerRef, rightOwnerRef, overlapFrom, overlapTo, status, blockedAt)`

#### State machines

- `VersionSupersessionPlan`
  - `draft -> validated -> executed | cancelled`

#### Commands

- `validateAgreementWindow`
- `createVersionSupersessionPlan`
- `executeVersionSupersessionPlan`

#### Events

- `agreement_window.validated`
- `agreement_window.conflict_detected`
- `agreement_version.supersession_planned`
- `agreement_version.supersession_executed`

#### Invariants

- samma family får inte ha två publicerade versioner som överlappar
- varje supersession måste peka på både incoming och outgoing version

#### Valideringar som blockerar fel

- deny om inkommande version överlappar
- deny om split-period policy saknas när versionbytet sker mitt i payrollperiod

#### Routes/API-kontrakt

- inga direkta publika write-routes; används via publish och review workflows

#### Permissions/review-boundaries

- endast publish- och compliance-roller får exekvera supersession

#### Audit/evidence/receipt-krav

- varje konflikt måste ge blocker receipt
- varje supersession måste bära plan receipt

#### Replay/recovery/dead-letter-regler

- replay av supersession får inte skapa flera länkar

#### Migrations-/cutover-/rollback-regler

- historiska imported versioner måste kunna länkas med `supersedesVersionId`

#### Officiella regler och källor

- Riksdagen, Lag (1976:580) om medbestämmande i arbetslivet

#### Tester som bevisar delfasen

- unit för overlap deny
- integration för planerad supersession

### Delfas 9.3 Assignment/employment-binding model

#### Vad som ska byggas

- `AgreementBindingDecision`
- `AgreementAssignment`
- `AgreementAssignmentReview`

#### Exakta objekt

- `AgreementBindingDecision(bindingDecisionId, companyId, employmentId, legalEmployerId, workerCategoryCode, agreementFamilyId, decisionReasonCode, decidedAt, decidedBy)`
- `AgreementAssignment(agreementAssignmentId, bindingDecisionId, agreementVersionId, employmentId, employeeId, assignmentScopeCode, effectiveFrom, effectiveTo, assignmentStatus, localSupplementId, createdAt)`
- `AgreementAssignmentReview(reviewId, agreementAssignmentId, triggerCode, status, requiredActions, createdAt)`

#### State machines

- `AgreementAssignment`
  - `planned -> active -> historical | superseded`
- `AgreementAssignmentReview`
  - `open -> approved | rejected | cancelled`

#### Commands

- `decideAgreementBinding`
- `assignAgreementToEmployment`
- `requestAgreementAssignmentReview`
- `approveAgreementAssignmentReview`

#### Events

- `agreement_binding.decided`
- `agreement_assignment.created`
- `agreement_assignment.review_requested`

#### Invariants

- assignment måste peka på binding decision
- active assignment måste vara förenlig med aktuell employment truth

#### Valideringar som blockerar fel

- deny om employmentklass inte matchar binding decision
- deny om assignment utanför version window

#### Routes/API-kontrakt

- `POST /v1/collective-agreements/assignments`
- `POST /v1/backoffice/collective-agreements/assignments/{agreementAssignmentId}/review`

#### Permissions/review-boundaries

- create assignment: `collective_agreement_manage`
- review/approve binding conflicts: `collective_agreement_publish_high_risk`

#### Audit/evidence/receipt-krav

- assignment receipt måste inkludera employment truth refs

#### Replay/recovery/dead-letter-regler

- duplicate assignment command får aldrig skapa ny aktiv assignment

#### Migrations-/cutover-/rollback-regler

- imported assignment måste också bära binding decision lineage

#### Officiella regler och källor

- LAS och kollektivavtalets dispositiva utrymme enligt MBL

#### Tester som bevisar delfasen

- integration för binding mismatch blocker
- unit för rebinding efter employment change

### Delfas 9.4 Local-supplement model

#### Vad som ska byggas

- `AgreementLocalSupplement`
- `AgreementLocalSupplementScope`
- `AgreementLocalSupplementReview`

#### Exakta objekt

- `AgreementLocalSupplement(localSupplementId, agreementVersionId, supplementCode, displayName, supplementStatus, sourceArtifactId, scopeRef, validFrom, validTo, overlayDraftId, supersededBySupplementId, createdAt)`
- `AgreementLocalSupplementScope(scopeId, scopeType, employmentId, orgUnitId, workplaceId, tenantWide, validatedAt)`
- `AgreementLocalSupplementReview(reviewId, localSupplementId, decisionStatus, reviewerId, reviewedAt, evidenceRef)`

#### State machines

- `AgreementLocalSupplement`
  - `draft -> review_pending -> approved -> active -> superseded | retired`

#### Commands

- `createLocalSupplementDraft`
- `submitLocalSupplementForReview`
- `approveLocalSupplement`
- `supersedeLocalSupplement`

#### Events

- `local_supplement.drafted`
- `local_supplement.approved`
- `local_supplement.superseded`

#### Invariants

- två supplements får aldrig dela samma identity
- supplement måste vara giltigt för `eventDate` för att få påverka overlay

#### Valideringar som blockerar fel

- deny om scope saknas
- deny om supplement används utanför eget datumfönster

#### Routes/API-kontrakt

- `POST /v1/collective-agreements/local-supplements/drafts`
- `POST /v1/backoffice/collective-agreements/local-supplements/{localSupplementId}/approve`

#### Permissions/review-boundaries

- create draft: `collective_agreement_manage`
- approve: `collective_agreement_publish_high_risk`

#### Audit/evidence/receipt-krav

- supplement approval receipt måste innehålla scope, target och coverage diff

#### Replay/recovery/dead-letter-regler

- replay får inte skriva över tidigare supplement

#### Migrations-/cutover-/rollback-regler

- importerade lokala avtal måste bli egna supplementobjekt

#### Officiella regler och källor

- signed local supplement artifact från arbetsgivar-/fackkälla där tillgänglig

#### Tester som bevisar delfasen

- unit för multi-supplement same version
- integration för validity gating

### Delfas 9.5 Override/exception governance model

#### Vad som ska byggas

- `AgreementOverrideRequest`
- `AgreementOverrideApproval`
- `AgreementOverrideActivation`

#### Exakta objekt

- `AgreementOverrideRequest(overrideRequestId, agreementAssignmentId, overrideFamilyCode, clauseCode, requestedPayload, reasonCode, impactPreviewId, requestedBy, requestedAt, status)`
- `AgreementOverrideApproval(overrideApprovalId, overrideRequestId, approverId, approvalDecisionCode, freshTrustEvidenceRef, approvedAt)`
- `AgreementOverrideActivation(overrideActivationId, overrideRequestId, activeFrom, activeTo, activatedBy, activatedAt, replaySafeId)`

#### State machines

- `AgreementOverrideRequest`
  - `draft -> review_pending -> approved -> active -> retired | rejected`

#### Commands

- `requestAgreementOverride`
- `approveAgreementOverride`
- `activateAgreementOverride`
- `retireAgreementOverride`

#### Events

- `agreement_override.requested`
- `agreement_override.approved`
- `agreement_override.activated`
- `agreement_override.retired`

#### Invariants

- requester och approver får inte vara samma actor
- override måste vara typad på clause-nivå
- override får inte bli aktiv utan impact preview

#### Valideringar som blockerar fel

- deny om `approvedBy == requestedBy`
- deny om payload inte matchar typad override family
- deny om fresh trust saknas

#### Routes/API-kontrakt

- `POST /v1/collective-agreements/assignments/{agreementAssignmentId}/override-requests`
- `POST /v1/backoffice/collective-agreements/override-requests/{overrideRequestId}/approve`
- `POST /v1/backoffice/collective-agreements/override-requests/{overrideRequestId}/activate`

#### Permissions/review-boundaries

- request: `collective_agreement_override_request`
- approve/activate: `collective_agreement_override_approve_high_risk`

#### Audit/evidence/receipt-krav

- request, approval och activation måste ha separata receipts

#### Replay/recovery/dead-letter-regler

- retry får inte skapa flera aktiveringar

#### Migrations-/cutover-/rollback-regler

- legacy overrides får inte migreras som aktiva utan ny review

#### Officiella regler och källor

- NIST SP 800-53 Rev. 5 AC-5 och AC-6

#### Tester som bevisar delfasen

- integration för self-approval deny
- integration för step-up/fresh-trust requirement

### Delfas 9.6 Intake/extraction/review/publication model

#### Vad som ska byggas

- `AgreementIntakeCase`
- `AgreementSourceArtifact`
- `AgreementIntakeExtraction`
- `AgreementReviewDecision`

#### Exakta objekt

- `AgreementIntakeCase(agreementIntakeCaseId, companyId, requestedPublicationTarget, sourceArtifactId, requestedEmploymentId, intakeStatus, submittedBy, submittedAt)`
- `AgreementSourceArtifact(sourceArtifactId, companyId, storageRef, artifactTypeCode, sourceAuthorityCode, checksum, importedAt)`
- `AgreementIntakeExtraction(extractionId, agreementIntakeCaseId, extractionStatus, extractionOutputRef, extractedBy, extractedAt)`
- `AgreementReviewDecision(reviewDecisionId, agreementIntakeCaseId, decisionCode, targetObjectRef, reviewedBy, reviewedAt, evidenceRef)`

#### State machines

- `AgreementIntakeCase`
  - `received -> extraction_in_progress -> review_pending -> approved_for_publication | approved_for_local_supplement | rejected`

#### Commands

- `submitAgreementIntakeCase`
- `registerAgreementSourceArtifact`
- `startAgreementIntakeExtraction`
- `completeAgreementIntakeExtraction`
- `reviewAgreementIntakeCase`

#### Events

- `agreement_intake.submitted`
- `agreement_source_artifact.registered`
- `agreement_intake.extraction_completed`
- `agreement_intake.reviewed`

#### Invariants

- intake case måste peka på source artifact
- extraction och review måste vara separata receipts

#### Valideringar som blockerar fel

- deny om source artifact saknas
- deny om review försöker skapa version utan extraction output

#### Routes/API-kontrakt

- `POST /v1/backoffice/agreement-intake/cases`
- `POST /v1/backoffice/agreement-intake/cases/{agreementIntakeCaseId}/start-extraction`
- `POST /v1/backoffice/agreement-intake/cases/{agreementIntakeCaseId}/complete-extraction`
- `POST /v1/backoffice/agreement-intake/cases/{agreementIntakeCaseId}/review`

#### Permissions/review-boundaries

- intake: `backoffice.agreement_intake_manage`
- review/publication: `collective_agreement_publish_high_risk`

#### Audit/evidence/receipt-krav

- varje steg måste bära correlation id och evidence refs

#### Replay/recovery/dead-letter-regler

- extraction replay får inte skapa dubbla versioner

#### Migrations-/cutover-/rollback-regler

- historiska intake artifacts måste kunna arkiveras utan att tappa lineage

#### Officiella regler och källor

- signed agreement source artifacts från officiell arbetsgivar-/fackkälla där tillgänglig

#### Tester som bevisar delfasen

- integration för artifact-required intake flow
- integration för publish vs local supplement separation

### Delfas 9.7 Agreement-source parsing/normalization model

#### Vad som ska byggas

- `AgreementClauseExtractionArtifact`
- `CanonicalAgreementClause`
- `AgreementCompilationReceipt`

#### Exakta objekt

- `AgreementClauseExtractionArtifact(extractionArtifactId, sourceArtifactId, parserVersion, rawClauseJson, createdAt)`
- `CanonicalAgreementClause(canonicalClauseId, agreementVersionDraftId, clauseGroupCode, clauseCode, normalizedPayload, coverageStatus, sourceClauseRef)`
- `AgreementCompilationReceipt(compileReceiptId, agreementVersionDraftId, compilerVersion, compiledOverlayRef, compileStatus, diagnostics, createdAt)`

#### State machines

- `AgreementCompilationReceipt`
  - `draft -> compiled -> failed`

#### Commands

- `extractAgreementClauses`
- `normalizeAgreementClauses`
- `compileAgreementVersion`

#### Events

- `agreement_clauses.extracted`
- `agreement_clauses.normalized`
- `agreement_version.compiled`

#### Invariants

- compiled version måste bygga på canonical clauses

#### Valideringar som blockerar fel

- deny om canonical clauses saknas
- deny om parser lämnar oklassade clauses

#### Routes/API-kontrakt

- inga direkta tenant-routes; backoffice/compiler-only

#### Permissions/review-boundaries

- compiler/extraction kräver specialiserad operatorroll

#### Audit/evidence/receipt-krav

- compiler receipt måste bära parserversion, compilerdiagnostics och source artifact checksum

#### Replay/recovery/dead-letter-regler

- compiler replay måste vara deterministisk på samma artifact checksum

#### Migrations-/cutover-/rollback-regler

- legacy avtal utan canonical clauses måste migreras som `incomplete` och inte publiceras

#### Officiella regler och källor

- signed agreement artifact / official employer+union source

#### Tester som bevisar delfasen

- unit för parser och compiler
- regression för deterministic compile output

### Delfas 9.8 Clause-coverage/unsupported-clause model

#### Vad som ska byggas

- `AgreementClauseCoverage`
- `UnsupportedAgreementClause`
- `AgreementCoverageReceipt`

#### Exakta objekt

- `AgreementClauseCoverage(coverageId, agreementVersionDraftId, clauseCode, coverageStatus, executionCapabilityCode, reviewedBy, reviewedAt)`
- `UnsupportedAgreementClause(unsupportedClauseId, agreementVersionDraftId, clauseCode, blockerReasonCode, sourceClauseRef, status, createdAt)`
- `AgreementCoverageReceipt(coverageReceiptId, agreementVersionDraftId, summaryJson, blockerCount, createdAt)`

#### State machines

- `AgreementClauseCoverage`
  - `unmapped -> partial -> supported | blocked`

#### Commands

- `recordClauseCoverage`
- `markUnsupportedClause`
- `finalizeCoverageReceipt`

#### Events

- `agreement_clause.coverage_recorded`
- `agreement_clause.blocked`
- `agreement_coverage.finalized`

#### Invariants

- ingen publicering utan finalized coverage receipt

#### Valideringar som blockerar fel

- deny publish om unsupported blocker count > 0

#### Routes/API-kontrakt

- backoffice-only coverage routes

#### Permissions/review-boundaries

- coverage write kräver compliance-roll

#### Audit/evidence/receipt-krav

- varje unsupported clause måste vara auditad och synlig i blocker board

#### Replay/recovery/dead-letter-regler

- coverage replay får inte tappa blocker status

#### Migrations-/cutover-/rollback-regler

- imported avtal utan coverage receipt blockeras från live

#### Officiella regler och källor

- signed agreement artifacts
- arbetsrättsliga primärkällor där klausulen bygger på dispositiv lag

#### Tester som bevisar delfasen

- unit för coverage transitions
- integration för publish blocker

### Delfas 9.9 Executable-overlay/rate-component model

#### Vad som ska byggas

- `CompiledAgreementOverlay`
- `AgreementRateComponent`
- `AgreementConflictDiagnostic`

#### Exakta objekt

- `CompiledAgreementOverlay(compiledOverlayId, agreementVersionId, compiledRuleJson, compiledAt, compileReceiptId)`
- `AgreementRateComponent(componentId, compiledOverlayId, payItemCode, calculationMode, basisCode, multiplier, unitRate, percent, intervalSpecJson, autoGenerate, clauseRef)`
- `AgreementConflictDiagnostic(diagnosticId, compiledOverlayId, severity, conflictCode, leftClauseRef, rightClauseRef, blockedAt)`

#### State machines

- `CompiledAgreementOverlay`
  - `compiled -> activated -> superseded`

#### Commands

- `buildCompiledAgreementOverlay`
- `activateCompiledAgreementOverlay`

#### Events

- `agreement_overlay.compiled`
- `agreement_overlay.activated`

#### Invariants

- compiled overlay måste vara immutable

#### Valideringar som blockerar fel

- deny activation om diagnostics innehåller blockerande konflikt

#### Routes/API-kontrakt

- read-only route för compiled overlay preview

#### Permissions/review-boundaries

- compile/activate endast compliance/publish roles

#### Audit/evidence/receipt-krav

- compiled overlay receipt måste innehålla diagnostics

#### Replay/recovery/dead-letter-regler

- replay av compile på samma clause set måste ge samma hash

#### Migrations-/cutover-/rollback-regler

- compiled overlay ska kunna rebuildas från canonical clauses

#### Officiella regler och källor

- signed agreement artifacts + dispositiv lag där relevant

#### Tester som bevisar delfasen

- unit för compiled hash determinism
- integration för diagnostics blocker

### Delfas 9.10 Pay-component execution model

#### Vad som ska byggas

- `AgreementPayComponentExecution`
- `AgreementBasisSnapshot`

#### Exakta objekt

- `AgreementPayComponentExecution(executionId, employmentId, payRunId, payItemCode, eventDate, componentRef, basisSnapshotRef, quantity, calculatedUnitRate, calculatedAmount, createdAt)`
- `AgreementBasisSnapshot(basisSnapshotId, basisCode, snapshotValue, sourceRef, snappedAt)`

#### State machines

- `AgreementPayComponentExecution`
  - `calculated -> materialized -> explained`

#### Commands

- `calculateAgreementPayComponent`
- `materializeAgreementPayLine`

#### Events

- `agreement_pay_component.calculated`
- `agreement_pay_component.materialized`

#### Invariants

- inget agreement-driven belopp utan basis snapshot

#### Valideringar som blockerar fel

- deny om basis code okänd
- deny om quantity source saknas

#### Routes/API-kontrakt

- inga direkta routes; konsumeras via payroll

#### Permissions/review-boundaries

- intern payroll-runtime only

#### Audit/evidence/receipt-krav

- execution receipt måste kunna öppnas från pay line trace

#### Replay/recovery/dead-letter-regler

- replay av execution får inte ge dubbel materialisering

#### Migrations-/cutover-/rollback-regler

- imported historic lines måste bära explicit basis snapshot ref

#### Officiella regler och källor

- dispositiva lagregler enligt semester- och arbetstidslag där avtalet bygger vidare

#### Tester som bevisar delfasen

- unit för calculation modes
- integration för materialization receipts

### Delfas 9.11 Payroll/time-consumption and event-date model

#### Vad som ska byggas

- gemensam `AgreementResolutionService`
- event-scoped resolution i payroll

#### Exakta objekt

- `AgreementResolutionResult(resolutionId, employmentId, eventDate, agreementVersionId, localSupplementId, overrideActivationIds, compiledOverlayId, resolvedAt)`

#### State machines

- immutable resolution results

#### Commands

- `resolveAgreementForEventDate`

#### Events

- `agreement_resolution.completed`

#### Invariants

- payroll och time måste använda samma resolution algorithm

#### Valideringar som blockerar fel

- deny single-overlay-per-period i avtalsstyrda linjer när flera resolution windows finns

#### Routes/API-kontrakt

- `GET /v1/collective-agreements/active` ska kunna visa resolution per datum

#### Permissions/review-boundaries

- read-only payroll ops read

#### Audit/evidence/receipt-krav

- resolution receipt måste sparas i snapshot och pay line trace

#### Replay/recovery/dead-letter-regler

- resolution måste vara deterministisk på samma eventDate och samma inputs

#### Migrations-/cutover-/rollback-regler

- imported event dates måste kunna resolvas mot imported versions

#### Officiella regler och källor

- Arbetstidslag (1982:673)
- Semesterlag (1977:480)

#### Tester som bevisar delfasen

- split-period scenarios
- supplement end-date scenarios
- parity between time and payroll

### Delfas 9.12 Payslip-traceability/explainability model

#### Vad som ska byggas

- `AgreementLineTrace`
- `AgreementExplainabilityView`

#### Exakta objekt

- `AgreementLineTrace(lineTraceId, payRunId, payLineRef, agreementVersionId, assignmentId, supplementId, overrideActivationId, clauseCode, componentRef, basisSnapshotRef, executionId, createdAt)`
- `AgreementExplainabilityView(lineTraceId, maskedSummary, fullSummaryRef, supportMaskingPolicyCode, generatedAt)`

#### State machines

- immutable trace rows

#### Commands

- `attachAgreementLineTrace`
- `renderAgreementExplainability`

#### Events

- `agreement_line_trace.attached`
- `agreement_explainability.rendered`

#### Invariants

- varje agreement-driven pay line måste ha trace row

#### Valideringar som blockerar fel

- deny pay run approval om agreement-driven line saknar trace

#### Routes/API-kontrakt

- `GET /v1/payroll/payslips/{payslipId}/agreement-trace`
- `GET /v1/backoffice/payroll/payslips/{payslipId}/agreement-trace`

#### Permissions/review-boundaries

- full trace kräver payroll ops/high-risk read
- support får maskad explainability

#### Audit/evidence/receipt-krav

- trace-read måste auditloggas

#### Replay/recovery/dead-letter-regler

- replay ska kunna återskapa trace från immutable snapshots

#### Migrations-/cutover-/rollback-regler

- historiska imported lines måste markeras `trace_incomplete` om full trace saknas

#### Officiella regler och källor

- audit- och arbetsrättslig bevisbörda för löneuträkning

#### Tester som bevisar delfasen

- integration för explainability route
- unit för trace serialization

### Delfas 9.13 Golden-scenario and expected-outcome model

#### Vad som ska byggas

- `AgreementGoldenScenario`
- `AgreementExpectedOutcome`

#### Exakta objekt

- `AgreementGoldenScenario(goldenScenarioId, agreementVersionId, scenarioCode, inputFixtureRef, expectedOutcomeRef, scenarioStatus, verifiedAt)`
- `AgreementExpectedOutcome(expectedOutcomeId, goldenScenarioId, expectedLinesJson, expectedWarningsJson, expectedTraceJson)`

#### State machines

- `AgreementGoldenScenario`
  - `draft -> verified -> stale -> retired`

#### Commands

- `registerAgreementGoldenScenario`
- `verifyAgreementGoldenScenario`

#### Events

- `agreement_golden_scenario.verified`

#### Invariants

- varje publicerad version måste ha required scenario set

#### Valideringar som blockerar fel

- deny publish om required golden scenarios saknas

#### Routes/API-kontrakt

- internal verification only

#### Permissions/review-boundaries

- compliance and payroll engineering

#### Audit/evidence/receipt-krav

- scenario verification receipt måste sparas med test artifact

#### Replay/recovery/dead-letter-regler

- scenario rerun måste skapa nytt receipt, inte skriva över gammalt

#### Migrations-/cutover-/rollback-regler

- imported live version utan golden scenarios måste blockeras från bred GA

#### Officiella regler och källor

- signed agreement artifacts + dispositiva lagar beroende på scenario

#### Tester som bevisar delfasen

- golden scenario suite per clause family

### Delfas 9.14 Retro/delta/correction model

#### Vad som ska byggas

- `AgreementRetroImpactCase`
- `AgreementDeltaComputation`

#### Exakta objekt

- `AgreementRetroImpactCase(retroImpactCaseId, sourceChangeRef, impactedPayRuns, impactStatus, createdAt)`
- `AgreementDeltaComputation(deltaComputationId, retroImpactCaseId, originalLineTraceRefs, newLineTraceRefs, deltaLinesJson, reviewedAt)`

#### State machines

- `AgreementRetroImpactCase`
  - `detected -> review_pending -> approved -> executed | rejected`

#### Commands

- `detectAgreementRetroImpact`
- `approveAgreementRetroImpact`
- `executeAgreementRetroDelta`

#### Events

- `agreement_retro.detected`
- `agreement_retro.executed`

#### Invariants

- historiska lines får inte skrivas över

#### Valideringar som blockerar fel

- deny silent recompute of historical payslip

#### Routes/API-kontrakt

- backoffice correction routes only

#### Permissions/review-boundaries

- payroll correction high-risk

#### Audit/evidence/receipt-krav

- delta receipt måste länka original och ny line trace

#### Replay/recovery/dead-letter-regler

- delta execution måste vara idempotent

#### Migrations-/cutover-/rollback-regler

- imported retro cases måste vara explicita eller markeras unsupported

#### Officiella regler och källor

- dispositiva lagar + avtalskällan som ändrats

#### Tester som bevisar delfasen

- integration för retro delta
- regression för no silent overwrite

### Delfas 9.15 Durable persistence/audit/replay model

#### Vad som ska byggas

- persistent repository/store för all agreement objects
- replay-safe mutation journal

#### Exakta objekt

- `AgreementMutationJournalEntry(entryId, commandId, aggregateType, aggregateId, mutationType, receiptId, createdAt)`

#### State machines

- immutable journal entries

#### Commands

- alla commands ovan måste persistas genom canonical repository

#### Events

- mutation journal events per aggregate

#### Invariants

- ingen in-memory-only live truth

#### Valideringar som blockerar fel

- protected/live boot deny om agreement repository saknas

#### Routes/API-kontrakt

- inga user-facing routes; bootstrap och diagnostics måste exponera repository status

#### Permissions/review-boundaries

- ops-only

#### Audit/evidence/receipt-krav

- varje mutation måste ha receipt + journal entry

#### Replay/recovery/dead-letter-regler

- replay från journal måste återskapa samma aggregate state

#### Migrations-/cutover-/rollback-regler

- migration måste backfilla repository rows före go-live

#### Officiella regler och källor

- auditability and deterministic replay requirements

#### Tester som bevisar delfasen

- integration för restart och replay determinism

### Delfas 9.16 Backoffice/security/SoD/audit model

#### Vad som ska byggas

- high-risk route classification
- masked support read model

#### Exakta objekt

- `AgreementHighRiskActionReceipt(receiptId, actionCode, actorId, trustLevel, secondApproverId, watermarkRef, createdAt)`
- `AgreementSupportProjection(projectionId, maskedFieldsJson, traceRefs, generatedAt)`

#### State machines

- receipts immutable

#### Commands

- `approveHighRiskAgreementAction`
- `renderAgreementSupportProjection`

#### Events

- `agreement_high_risk_action.approved`
- `agreement_support_projection.rendered`

#### Invariants

- support får inte mutera agreement truth

#### Valideringar som blockerar fel

- deny high-risk action without fresh trust
- deny same-actor dual control

#### Routes/API-kontrakt

- route contracts per action family

#### Permissions/review-boundaries

- publish, supplement, override och retro måste vara separata

#### Audit/evidence/receipt-krav

- full receipt för varje high-risk action

#### Replay/recovery/dead-letter-regler

- approval replay får inte grant:a duplicate action

#### Migrations-/cutover-/rollback-regler

- legacy broad roles måste migreras eller nekas

#### Officiella regler och källor

- NIST SP 800-53 Rev. 5 AC-5/AC-6

#### Tester som bevisar delfasen

- integration för route trust boundaries

### Delfas 9.17 Seed/bootstrap/fake-live removal model

#### Vad som ska byggas

- test-only fixture path för agreement seeds

#### Exakta objekt

- `AgreementFixtureBundle(fixtureBundleId, scopeCode, fixtureDataRef, testOnly, createdAt)`

#### State machines

- `draft -> active_test_only -> archived`

#### Commands

- `registerAgreementFixtureBundle`

#### Events

- `agreement_fixture.registered`

#### Invariants

- inga fixture bundles i protected/live

#### Valideringar som blockerar fel

- deny startup om `seedDemo` eller seed-SQL används i protected/live

#### Routes/API-kontrakt

- inga live-routes

#### Permissions/review-boundaries

- test-only

#### Audit/evidence/receipt-krav

- bootstrap diagnostics måste exponera seed state

#### Replay/recovery/dead-letter-regler

- none outside test

#### Migrations-/cutover-/rollback-regler

- arkivera nuvarande seed SQL från live migrationskedja

#### Officiella regler och källor

- none; this is internal integrity hardening

#### Tester som bevisar delfasen

- unit för protected-mode seed deny

### Delfas 9.18 Migration/snapshot-consistency model

#### Vad som ska byggas

- `ImportedAgreementObject`
- `AgreementImportMappingReceipt`

#### Exakta objekt

- `ImportedAgreementObject(importedAgreementObjectId, sourceSystemCode, sourceRecordRef, targetObjectType, targetObjectId, importedAt)`
- `AgreementImportMappingReceipt(mappingReceiptId, importedAgreementObjectId, canonicalRefsJson, evidenceRef, createdAt)`

#### State machines

- `imported -> mapped -> verified`

#### Commands

- `importAgreementHistory`
- `verifyImportedAgreementMappings`

#### Events

- `agreement_import.mapped`
- `agreement_import.verified`

#### Invariants

- imported agreement history måste kunna resolvas per datum i canonical engine

#### Valideringar som blockerar fel

- deny cutover när imported agreement snapshot saknar canonical mapping

#### Routes/API-kontrakt

- import/backoffice only

#### Permissions/review-boundaries

- migration ops och payroll compliance

#### Audit/evidence/receipt-krav

- imported mappings måste ha evidence refs till source exports

#### Replay/recovery/dead-letter-regler

- import replay får inte duplicera canonical objects

#### Migrations-/cutover-/rollback-regler

- cutover receipt måste innehålla agreement mapping summary

#### Officiella regler och källor

- source system export documentation where relevant

#### Tester som bevisar delfasen

- e2e för imported agreement resolution
- integration för cutover blocker på missing mapping
