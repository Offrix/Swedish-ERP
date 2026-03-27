> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# OBJECT_PROFILE_WORKBENCH_SEARCH_AND_COMMAND_CONTRACT_CATALOG

Status: Bindande kontraktskatalog för object profiles, workbenches, listor, sök, preview, command bar och projection rebuild. Detta dokument är det enda backendkontrakt som framtida UI får byggas ovanpå.

## Naming rules

1. Domain objects och events använder canonical field names i camelCase i alla read-models och API-payloads.
2. Listor, profiles, search cards och preview cards är read-model contracts. De är aldrig source of truth.
3. Alla kontrakt i detta dokument är server-side obligations. UI får inte uppfinna egna fält, egna blockerare eller egna action rules.

## Canonical profile envelope

Varje object profile ska returnera:

- `profileType`
- `objectType`
- `objectId`
- `companyId`
- `version`
- `status`
- `header`
- `snapshot`
- `sections`
- `relatedObjects`
- `receipts`
- `evidence`
- `allowedActions`
- `blockers`
- `permissionSummary`
- `correctionLineage`
- `auditRefs`
- `timeline`
- `searchSummary`
- `projectionInfo`

### Header contract

`header` ska innehålla:

- `title`
- `subtitle`
- `statusCode`
- `statusLabel`
- `criticalBadges[]`
- `primaryActions[]`
- `secondaryActions[]`
- `owner`
- `updatedAt`

### Snapshot contract

`snapshot` ska vara en flat summary för första beslutsnivån och ska innehålla:

- `identityFields[]`
- `financialFields[]`
- `complianceFields[]`
- `responsibilityFields[]`
- `periodFields[]`

### Section contract

Varje sektion ska innehålla:

- `sectionCode`
- `title`
- `layout` (`table`, `field_list`, `timeline`, `document_preview`, `diff`, `chart_data`, `evidence_list`)
- `fields[]`
- `warnings[]`
- `blockers[]`
- `inlineActions[]`

### Allowed action contract

Varje action i `allowedActions` ska innehålla:

- `actionCode`
- `actionClass`
- `label`
- `httpMethod`
- `routeTemplate`
- `requiresStepUp`
- `requiresDualControl`
- `receiptRequired`
- `reviewRequired`
- `forbiddenReasonCodes[]`

### Blocker contract

Varje blocker ska innehålla:

- `blockerCode`
- `severity`
- `scope`
- `message`
- `resolutionPath`
- `blockingActionCodes[]`

### Correction lineage contract

- `originObjectRef`
- `correctionChainId`
- `chainPosition`
- `replacesObjectRef`
- `supersededByObjectRef`
- `reasonCode`
- `effectiveDate`

### Audit refs contract

- `auditClass`
- `auditEventIds[]`
- `evidenceBundleIds[]`
- `receiptIds[]`
- `correlationIds[]`

## Canonical workbench envelope

Varje workbench ska returnera:

- `workbenchCode`
- `title`
- `scope`
- `defaultViewCode`
- `views[]`
- `counters`
- `filters`
- `sorts`
- `bulkActions`
- `rows`
- `previewContract`
- `commandBar`
- `savedViewsSupported`
- `projectionInfo`

## Canonical list row contract

Varje rad ska innehålla:

- `rowId`
- `objectType`
- `objectId`
- `status`
- `statusLabel`
- `primaryLabel`
- `secondaryLabel`
- `pillars` med max sex viktiga faktakolumner
- `blockerBadges[]`
- `receiptBadges[]`
- `owner`
- `updatedAt`
- `drilldownTarget`
- `previewTarget`
- `bulkActionEligibility`

## Canonical filter schema

Varje filterdefinition ska innehålla:

- `filterCode`
- `type` (`enum`, `multi_enum`, `date_range`, `money_range`, `text`, `boolean`, `owner`, `queue`, `saved_scope`)
- `label`
- `fieldPath`
- `operators[]`
- `allowedValues[]`
- `defaultValue`
- `required`

## Canonical sort schema

Varje sortdefinition ska innehålla:

- `sortCode`
- `fieldPath`
- `label`
- `defaultDirection`
- `allowedDirections`

## Canonical command bar contract

Varje workbench eller profile ska ha:

- `contextObject`
- `availableCommands[]`
- `recentCommands[]`
- `quickFilters[]`
- `createActions[]`
- `dangerZoneActions[]`

## Canonical search result card contract

Varje global searchträff ska innehålla:

- `resultType`
- `objectType`
- `objectId`
- `title`
- `subtitle`
- `statusLabel`
- `badges[]`
- `snippet`
- `relatedContext[]`
- `openTarget`
- `previewTarget`
- `permissionTrimmed`
- `staleProjection`

## Canonical preview card contract

Varje preview ska innehålla:

- `previewType`
- `header`
- `summaryFields[]`
- `latestReceipts[]`
- `latestActivity[]`
- `latestBlockers[]`
- `allowedActions[]`
- `openFullProfileTarget`

## Projection rebuild contract

Varje rebuildkontrakt ska innehålla:

- `projectionCode`
- `objectType`
- `objectId`
- `sourceVersion`
- `targetVersion`
- `rebuildReasonCode`
- `requestedBy`
- `requestedAt`
- `jobId`
- `status`
- `receiptId`

## Object profiles

### 1. JournalEntryProfile

- Object type: `journalEntry`
- Required header:
  - voucher number
  - voucher series
  - posting status
  - accounting period
  - posting date
- Required sections:
  - `lines`
  - `sourceSignals`
  - `validation`
  - `vatImpact`
  - `receiptsAndEvidence`
  - `corrections`
  - `audit`
- Related objects:
  - source invoice, pay run, HUS claim, tax account reconciliation, annual package
- Allowed actions:
  - `ledger.validate`
  - `ledger.post`
  - `ledger.reverse`
  - `ledger.correct`
  - `ledger.export`
- Blocker badges:
  - invalid dimensions
  - locked period
  - missing attestation
  - source object not final
- Required list row fields:
  - voucherNumber
  - voucherSeries
  - postingDate
  - status
  - sourceObjectType
  - sourceObjectId
  - amount
- Filters:
  - status
  - voucher series
  - source type
  - period
  - project
  - correction chain
- Sorts:
  - postingDate
  - voucherNumber
  - updatedAt

### 2. VatReturnProfile

- Object type: `vatReturn`
- Required header:
  - return period
  - status
  - submission state
  - locked baseline version
- Required sections:
  - `boxAmounts`
  - `sourceDecisions`
  - `declarationReadiness`
  - `technicalReceipts`
  - `materialReceipts`
  - `corrections`
  - `ledgerReconciliation`
- Allowed actions:
  - `vat.calculate`
  - `vat.lock`
  - `vat.unlock`
  - `vat.submit`
  - `vat.collectReceipts`
  - `vat.correct`
- Blockers:
  - unresolved VAT review decisions
  - open source periods
  - missing legal form profile
  - unbalanced ledger reconciliation
- List fields:
  - periodKey
  - status
  - lockedRulepackVersion
  - submissionStatus
  - payableAmount
  - latestReceiptStatus

### 3. TaxAccountReconciliationProfile

- Object type: `taxAccountReconciliation`
- Required sections:
  - `statementEvents`
  - `matchedObligations`
  - `offsetSuggestions`
  - `unresolvedDifferences`
  - `receipts`
  - `audit`
- Allowed actions:
  - `taxAccount.import`
  - `taxAccount.match`
  - `taxAccount.offset`
  - `taxAccount.escalate`
- Blockers:
  - unmatched payment
  - unknown event type
  - conflicting obligation link

### 4. PayRunProfile

- Object type: `payRun`
- Required header:
  - payroll period
  - payout date
  - run state
  - employee count
- Required sections:
  - `employees`
  - `exceptions`
  - `taxAndContributionSummary`
  - `benefitsAndTravel`
  - `garnishment`
  - `postingPreview`
  - `bankPaymentPreview`
  - `agiPreview`
  - `receiptsAndCorrections`
- Allowed actions:
  - `payroll.calculate`
  - `payroll.approve`
  - `payroll.lock`
  - `payroll.exportBank`
  - `payroll.submitAgi`
  - `payroll.correct`
- Blockers:
  - missing tax table or SINK decision
  - unresolved agreement exception
  - unresolved migration diff
  - negative net pay
  - missing garnishment decision snapshot

### 5. AgiSubmissionProfile

- Object type: `agiSubmission`
- Required sections:
  - `submissionScope`
  - `employeeLines`
  - `transportEnvelope`
  - `technicalReceipts`
  - `materialReceipts`
  - `correctionChain`
  - `ledgerAndPayrollReconciliation`
- Allowed actions:
  - `agi.submit`
  - `agi.collectReceipt`
  - `agi.correct`
  - `agi.replayTransport`
- Blockers:
  - unsigned pay run
  - missing legal identity
  - unresolved payroll exceptions
  - invalid transport baseline

### 6. BenefitTreatmentProfile

- Object type: `benefitTreatment`
- Required sections:
  - `documentAndEvidence`
  - `classification`
  - `taxability`
  - `valuation`
  - `payrollImpact`
  - `ledgerImpact`
  - `receipts`
- Allowed actions:
  - `benefit.decide`
  - `benefit.approve`
  - `benefit.routeToPayroll`
  - `benefit.correct`
- Blockers:
  - missing receipt
  - private-spend unresolved
  - valuation uncertain
  - vehicle benefit evidence incomplete

### 7. TravelClaimProfile

- Object type: `travelClaim`
- Required sections:
  - `tripScope`
  - `allowances`
  - `mileage`
  - `receipts`
  - `taxability`
  - `payrollImpact`
  - `ledgerImpact`
- Allowed actions:
  - `travel.calculate`
  - `travel.approve`
  - `travel.correct`
- Blockers:
  - missing itinerary
  - missing distance basis
  - foreign travel missing country timeline

### 8. HusClaimProfile

- Object type: `husClaim`
- Required sections:
  - `customerAndProperty`
  - `workAndLabourAmounts`
  - `paymentEvidence`
  - `lockedSubmissionFields`
  - `technicalReceipts`
  - `decisionReceipts`
  - `recovery`
  - `ledgerAndArReconciliation`
- Allowed actions:
  - `hus.validate`
  - `hus.lock`
  - `hus.exportXml`
  - `hus.submit`
  - `hus.collectDecision`
  - `hus.correct`
  - `hus.createRecovery`
- Blockers:
  - customer payment not verified
  - labour/material split invalid
  - buyer identity incomplete
  - amount exceeds remaining HUS room snapshot

### 9. TaxAccountSummaryProfile

- Object type: `taxAccountSummary`
- Required sections:
  - `balance`
  - `openObligations`
  - `incomingEvents`
  - `offsets`
  - `differences`
- Allowed actions:
  - `taxAccount.refresh`
  - `taxAccount.export`
  - `taxAccount.reconcile`

### 10. AnnualReportingPackageProfile

- Object type: `annualReportingPackage`
- Required sections:
  - `legalFormProfile`
  - `fiscalYearScope`
  - `financialStatements`
  - `declarationAttachments`
  - `validationControls`
  - `signatures`
  - `technicalReceipts`
  - `materialReceipts`
  - `corrections`
- Allowed actions:
  - `annualPackage.validate`
  - `annualPackage.freeze`
  - `annualPackage.submitBolagsverket`
  - `annualPackage.submitSkatteverket`
  - `annualPackage.exportSru`
  - `annualPackage.correct`
- Blockers:
  - unresolved close blockers
  - unsigned signatory chain
  - invalid iXBRL or SRU checksum
  - legal form mismatch

### 11. ReviewItemProfile

- Object type: `reviewItem`
- Required sections:
  - `reviewContext`
  - `objectSummary`
  - `decisionOptions`
  - `evidence`
  - `activity`
  - `slaAndEscalation`
- Allowed actions:
  - `review.claim`
  - `review.decide`
  - `review.escalate`
  - `review.release`
- Blockers:
  - wrong queue scope
  - missing mandatory evidence
  - insufficient trust level

### 12. WorkItemProfile

- Object type: `workItem`
- Required sections:
  - `taskDefinition`
  - `ownerAndQueue`
  - `linkedObjects`
  - `dueAndEscalation`
  - `completionReceipt`
- Allowed actions:
  - `workItem.claim`
  - `workItem.start`
  - `workItem.complete`
  - `workItem.reassign`
  - `workItem.escalate`

### 13. NotificationProfile

- Object type: `notification`
- Required sections:
  - `trigger`
  - `audience`
  - `deliveryReceipts`
  - `targetLinks`
- Allowed actions:
  - `notification.ack`
  - `notification.snooze`
  - `notification.route`

### 14. ActivityStreamProfile

- Object type: `activityStream`
- Required sections:
  - `timeline`
  - `actorRefs`
  - `objectRefs`
  - `correlationChain`
- Allowed actions:
  - `activity.openObject`
  - `activity.openAudit`

### 15. ProjectProfile

- Object type: `project`
- Required sections:
  - `identityAndType`
  - `commercialModel`
  - `budgetAndForecast`
  - `actualsAndProfitability`
  - `resources`
  - `deliverables`
  - `operationalCases`
  - `fieldPack`
  - `compliancePack`
  - `evidence`
- Allowed actions:
  - `project.activate`
  - `project.approveBudget`
  - `project.createWorkModel`
  - `project.materializeProfitability`
  - `project.closeFinancially`
- Blockers:
  - missing cost allocation basis
  - incomplete billing model
  - unresolved operational case exceptions

### 16. WorkOrderProfile

- Object type: `workOrder`
- Required sections:
  - `assignment`
  - `customerSite`
  - `materials`
  - `timeAndLabour`
  - `signature`
  - `photosAndEvidence`
  - `invoicingReadiness`
  - `syncConflicts`
- Allowed actions:
  - `workOrder.dispatch`
  - `workOrder.start`
  - `workOrder.complete`
  - `workOrder.markInvoiceReady`
  - `workOrder.correct`
- Blockers:
  - missing assignment acceptance
  - pending sync conflict
  - missing customer signature where required

### 17. AttendanceExportProfile

- Object type: `attendanceExport`
- Required sections:
  - `workplace`
  - `industryPack`
  - `eventScope`
  - `correctionChain`
  - `exportPayload`
  - `transportReceipts`
  - `audit`
- Allowed actions:
  - `attendance.export`
  - `attendance.correct`
  - `attendance.replayExport`
- Blockers:
  - untrusted kiosk device
  - invalid employer snapshot
  - open conflicts

### 18. Id06WorkplaceProfile

- Object type: `id06Workplace`
- Required sections:
  - `workplaceIdentity`
  - `companyBindings`
  - `personBindings`
  - `cardStatuses`
  - `attendanceMirrors`
  - `evidence`
- Allowed actions:
  - `id06.verifyCompany`
  - `id06.verifyPerson`
  - `id06.bindWorkplace`
  - `id06.refreshCardStatus`
- Blockers:
  - inactive card
  - employer mismatch
  - workplace not registered for required pack

### 19. SupportCaseProfile

- Object type: `supportCase`
- Required sections:
  - `caseContext`
  - `approvedSupportActions`
  - `impersonation`
  - `diagnostics`
  - `audit`
  - `signoffs`
- Allowed actions:
  - `support.approveActions`
  - `support.startImpersonation`
  - `support.executeDiagnostic`
  - `support.closeCase`
- Blockers:
  - missing dual control
  - scope exceeds approved objects
  - stale approval

### 20. SubmissionDeadLetterProfile

- Object type: `submissionDeadLetter`
- Required sections:
  - `submissionContext`
  - `transportAttempts`
  - `errorClassification`
  - `repairActions`
  - `replayPlan`
  - `audit`
- Allowed actions:
  - `deadLetter.repair`
  - `deadLetter.requeue`
  - `deadLetter.cancel`
- Blockers:
  - replay not safe
  - corrected source object missing
  - duplicate terminal receipt already present

## Workbenches

### FinanceWorkbench

- Rows:
  - journal entries
  - AP import cases
  - AR invoices
  - bank reconciliation items
  - VAT returns
  - tax account reconciliations
- Required counters:
  - `postingBlockedCount`
  - `unreconciledBankCount`
  - `vatReviewCount`
  - `taxAccountDifferenceCount`
- Bulk actions:
  - validate journals
  - assign reviewer
  - export selected
- Saved views:
  - `periodClose`
  - `unposted`
  - `bankExceptions`
  - `vatReady`
- Command bar:
  - new manual journal
  - import statement
  - recalculate VAT
  - open close blockers

### PayrollWorkbench

- Rows:
  - pay runs
  - payroll exceptions
  - garnishment decisions
  - AGI submissions
  - payroll migrations
- Counters:
  - `blockingExceptions`
  - `agiReceiptPendingCount`
  - `migrationDiffCount`
- Bulk actions:
  - assign payroll reviewer
  - collect AGI receipts
- Saved views:
  - `currentPeriod`
  - `readyForApproval`
  - `agiPending`
  - `migrationCutover`

### ReviewCenterWorkbench

- Rows:
  - review items
  - queue ownership
  - SLA risk
- Counters:
  - `critical`
  - `high`
  - `overdue`
  - `unclaimed`
- Bulk actions:
  - claim selected
  - reassign selected
  - escalate selected

### SubmissionMonitoringWorkbench

- Rows:
  - AGI, VAT, HUS, annual filings
- Counters:
  - `technicalPending`
  - `materialPending`
  - `deadLettered`
  - `replayPlanned`
- Bulk actions:
  - collect receipts
  - plan replay
  - open dead letter

### ProjectControlWorkbench

- Rows:
  - projects
  - profitability snapshots
  - deviations
  - operational cases
- Counters:
  - `marginNegativeCount`
  - `billingBlockedCount`
  - `forecastDriftCount`
- Saved views:
  - `consulting`
  - `retainer`
  - `serviceOps`
  - `construction`

### FieldOpsWorkbench

- Rows:
  - service orders
  - work orders
  - dispatch assignments
  - sync conflicts
- Counters:
  - `dispatchUnassigned`
  - `signaturePending`
  - `syncConflictCount`
- Bulk actions:
  - assign dispatch
  - mark route
  - open conflict queue

### ComplianceWorkbench

- Rows:
  - HUS claims
  - personalliggare exports
  - ID06 validations
  - legal form reporting obligations
- Counters:
  - `husSubmissionReady`
  - `attendanceCorrectionsPending`
  - `id06InvalidCount`

### BackofficeOpsWorkbench

- Rows:
  - support cases
  - async jobs
  - dead letters
  - replay plans
  - access reviews
  - break-glass sessions
- Counters:
  - `highRiskOpen`
  - `deadLetterOpen`
  - `breakGlassActive`
  - `accessReviewPending`
- Bulk actions:
  - assign owner
  - plan replay
  - close resolved

## Global search coverage

Global search måste indexera minst:

- journal entries
- invoices
- bank reconciliation items
- pay runs
- AGI submissions
- benefits
- travel claims
- HUS claims
- tax account reconciliations
- annual packages
- review items
- work items
- notifications
- activity anchors
- projects
- work orders
- workplaces
- ID06 people/cards/workplaces
- support cases
- dead letters

## Permission summary contract

Varje profile, row, preview och search card ska bära:

- `canView`
- `canOpen`
- `canEdit`
- `canApprove`
- `canSubmit`
- `canReplay`
- `canImpersonate`
- `denialReasonCodes[]`

## Projection rebuild rules

1. Rebuild får aldrig mutera source object.
2. Rebuild ska vara idempotent på `projectionCode + objectId + sourceVersion`.
3. Rebuild ska skapa receipt och audit event.
4. Rebuild ska gå till work item om den misslyckas två gånger eller om source object är terminalt korrigerat.

## Exit gate

- [ ] Varje kritiskt objekt har låst object profile contract.
- [ ] Varje kritisk arbetsklass har låst workbench contract.
- [ ] Search, preview, list, command bar och rebuild semantics är låsta.
- [ ] Permission summary och blocker badges är server-side definierade.
- [ ] UI kan byggas utan att uppfinna payload shapes eller action semantics.
