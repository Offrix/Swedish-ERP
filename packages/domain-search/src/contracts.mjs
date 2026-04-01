function action(actionCode) {
  return {
    actionCode,
    actionClass: actionCode.split(".")[0],
    label: actionCode,
    httpMethod: "POST",
    routeTemplate: null,
    requiresStepUp: false,
    requiresDualControl: false,
    receiptRequired: /submit|export|replay|correct|offset|reverse|close|approve|lock/i.test(actionCode),
    reviewRequired: /approve|submit|correct|escalate/i.test(actionCode),
    forbiddenReasonCodes: []
  };
}

export const OBJECT_PROFILE_CONTRACTS = Object.freeze([
  {
    profileType: "JournalEntryProfile",
    objectType: "journalEntry",
    surfaceCodes: ["desktop.finance", "desktop.search"],
    sectionCodes: ["lines", "sourceSignals", "validation", "vatImpact", "receiptsAndEvidence", "corrections", "audit"],
    blockerCodes: ["invalid_dimensions", "locked_period", "missing_attestation", "source_object_not_final"],
    actionContracts: ["ledger.validate", "ledger.post", "ledger.reverse", "ledger.correct", "ledger.export"].map(action)
  },
  {
    profileType: "VatReturnProfile",
    objectType: "vatReturn",
    surfaceCodes: ["desktop.finance", "desktop.search"],
    sectionCodes: ["boxAmounts", "sourceDecisions", "declarationReadiness", "technicalReceipts", "materialReceipts", "corrections", "ledgerReconciliation"],
    blockerCodes: ["unresolved_vat_review_decisions", "open_source_periods", "missing_legal_form_profile", "unbalanced_ledger_reconciliation"],
    actionContracts: ["vat.calculate", "vat.lock", "vat.unlock", "vat.submit", "vat.collectReceipts", "vat.correct"].map(action)
  },
  {
    profileType: "TaxAccountReconciliationProfile",
    objectType: "taxAccountReconciliation",
    surfaceCodes: ["desktop.finance", "desktop.search"],
    sectionCodes: ["statementEvents", "matchedObligations", "offsetSuggestions", "unresolvedDifferences", "receipts", "audit"],
    blockerCodes: ["unmatched_payment", "unknown_event_type", "conflicting_obligation_link"],
    actionContracts: ["taxAccount.import", "taxAccount.match", "taxAccount.offset", "taxAccount.escalate"].map(action)
  },
  {
    profileType: "PayRunProfile",
    objectType: "payRun",
    surfaceCodes: ["desktop.payroll", "desktop.search"],
    sectionCodes: ["employees", "exceptions", "taxAndContributionSummary", "benefitsAndTravel", "garnishment", "postingPreview", "bankPaymentPreview", "agiPreview", "receiptsAndCorrections"],
    blockerCodes: ["missing_tax_table_or_sink_decision", "unresolved_agreement_exception", "unresolved_migration_diff", "negative_net_pay", "missing_garnishment_decision_snapshot"],
    actionContracts: ["payroll.calculate", "payroll.approve", "payroll.lock", "payroll.exportBank", "payroll.submitAgi", "payroll.correct"].map(action)
  },
  {
    profileType: "AgiSubmissionProfile",
    objectType: "agiSubmission",
    surfaceCodes: ["desktop.payroll", "desktop.search"],
    sectionCodes: ["submissionScope", "employeeLines", "transportEnvelope", "technicalReceipts", "materialReceipts", "correctionChain", "ledgerAndPayrollReconciliation"],
    blockerCodes: ["unsigned_pay_run", "missing_legal_identity", "unresolved_payroll_exceptions", "invalid_transport_baseline"],
    actionContracts: ["agi.submit", "agi.collectReceipt", "agi.correct", "agi.replayTransport"].map(action)
  },
  {
    profileType: "BenefitTreatmentProfile",
    objectType: "benefitTreatment",
    surfaceCodes: ["desktop.payroll", "desktop.search"],
    sectionCodes: ["documentAndEvidence", "classification", "taxability", "valuation", "payrollImpact", "ledgerImpact", "receipts"],
    blockerCodes: ["missing_receipt", "private_spend_unresolved", "valuation_uncertain", "vehicle_benefit_evidence_incomplete"],
    actionContracts: ["benefit.decide", "benefit.approve", "benefit.routeToPayroll", "benefit.correct"].map(action)
  },
  {
    profileType: "TravelClaimProfile",
    objectType: "travelClaim",
    surfaceCodes: ["desktop.payroll", "desktop.search"],
    sectionCodes: ["tripScope", "allowances", "mileage", "receipts", "taxability", "payrollImpact", "ledgerImpact"],
    blockerCodes: ["missing_itinerary", "missing_distance_basis", "foreign_travel_missing_country_timeline"],
    actionContracts: ["travel.calculate", "travel.approve", "travel.correct"].map(action)
  },
  {
    profileType: "HusClaimProfile",
    objectType: "husClaim",
    surfaceCodes: ["desktop.compliance", "desktop.search"],
    sectionCodes: ["customerAndProperty", "workAndLabourAmounts", "paymentEvidence", "lockedSubmissionFields", "technicalReceipts", "decisionReceipts", "recovery", "ledgerAndArReconciliation"],
    blockerCodes: ["customer_payment_not_verified", "labour_material_split_invalid", "buyer_identity_incomplete", "amount_exceeds_remaining_hus_room_snapshot"],
    actionContracts: ["hus.validate", "hus.lock", "hus.exportXml", "hus.submit", "hus.collectDecision", "hus.correct", "hus.createRecovery"].map(action)
  },
  {
    profileType: "TaxAccountSummaryProfile",
    objectType: "taxAccountSummary",
    surfaceCodes: ["desktop.finance", "desktop.search"],
    sectionCodes: ["balance", "openObligations", "incomingEvents", "offsets", "differences"],
    blockerCodes: [],
    actionContracts: ["taxAccount.refresh", "taxAccount.export", "taxAccount.reconcile"].map(action)
  },
  {
    profileType: "AnnualReportingPackageProfile",
    objectType: "annualReportingPackage",
    surfaceCodes: ["desktop.finance", "desktop.search"],
    sectionCodes: ["legalFormProfile", "fiscalYearScope", "financialStatements", "declarationAttachments", "validationControls", "signatures", "technicalReceipts", "materialReceipts", "corrections"],
    blockerCodes: ["unresolved_close_blockers", "unsigned_signatory_chain", "invalid_ixbrl_or_sru_checksum", "legal_form_mismatch"],
    actionContracts: ["annualPackage.validate", "annualPackage.freeze", "annualPackage.submitBolagsverket", "annualPackage.submitSkatteverket", "annualPackage.exportSru", "annualPackage.correct"].map(action)
  },
  {
    profileType: "ReviewItemProfile",
    objectType: "reviewItem",
    surfaceCodes: ["desktop.review_center", "desktop.search"],
    sectionCodes: ["reviewContext", "objectSummary", "decisionOptions", "evidence", "activity", "slaAndEscalation"],
    blockerCodes: ["wrong_queue_scope", "missing_mandatory_evidence", "insufficient_trust_level"],
    actionContracts: ["review.claim", "review.decide", "review.escalate", "review.release"].map(action)
  },
  {
    profileType: "ClassificationCaseProfile",
    objectType: "classificationCase",
    surfaceCodes: ["desktop.review_center", "desktop.search"],
    sectionCodes: ["classificationSummary", "downstreamRouting", "reviewBoundary", "evidence", "corrections", "audit"],
    blockerCodes: [],
    actionContracts: ["documentClassification.approve", "documentClassification.dispatch", "documentClassification.correct"].map(action)
  },
  {
    profileType: "WorkItemProfile",
    objectType: "workItem",
    surfaceCodes: ["desktop.review_center", "desktop.search"],
    sectionCodes: ["taskDefinition", "ownerAndQueue", "linkedObjects", "dueAndEscalation", "completionReceipt"],
    blockerCodes: [],
    actionContracts: ["workItem.claim", "workItem.start", "workItem.complete", "workItem.reassign", "workItem.escalate"].map(action)
  },
  {
    profileType: "NotificationProfile",
    objectType: "notification",
    surfaceCodes: ["desktop.notifications", "desktop.search"],
    sectionCodes: ["trigger", "audience", "deliveryReceipts", "targetLinks"],
    blockerCodes: [],
    actionContracts: ["notification.ack", "notification.snooze", "notification.route"].map(action)
  },
  {
    profileType: "ActivityStreamProfile",
    objectType: "activityStream",
    surfaceCodes: ["desktop.activity", "desktop.search"],
    sectionCodes: ["timeline", "actorRefs", "objectRefs", "correlationChain"],
    blockerCodes: [],
    actionContracts: ["activity.openObject", "activity.openAudit"].map(action)
  },
  {
    profileType: "ProjectProfile",
    objectType: "project",
    surfaceCodes: ["desktop.projects", "desktop.search"],
    sectionCodes: ["identityAndType", "commercialModel", "budgetAndForecast", "actualsAndProfitability", "resources", "deliverables", "operationalCases", "fieldPack", "compliancePack", "evidence"],
    blockerCodes: ["missing_cost_allocation_basis", "incomplete_billing_model", "unresolved_operational_case_exceptions"],
    actionContracts: ["project.activate", "project.approveBudget", "project.createWorkModel", "project.materializeProfitability", "project.closeFinancially"].map(action)
  },
  {
    profileType: "WorkOrderProfile",
    objectType: "workOrder",
    surfaceCodes: ["desktop.field", "desktop.search"],
    sectionCodes: ["assignment", "customerSite", "materials", "timeAndLabour", "signature", "photosAndEvidence", "invoicingReadiness", "syncConflicts"],
    blockerCodes: ["missing_assignment_acceptance", "pending_sync_conflict", "missing_customer_signature"],
    actionContracts: ["workOrder.dispatch", "workOrder.start", "workOrder.complete", "workOrder.markInvoiceReady", "workOrder.correct"].map(action)
  },
  {
    profileType: "AttendanceExportProfile",
    objectType: "attendanceExport",
    surfaceCodes: ["desktop.compliance", "desktop.search"],
    sectionCodes: ["workplace", "industryPack", "eventScope", "correctionChain", "exportPayload", "transportReceipts", "audit"],
    blockerCodes: ["untrusted_kiosk_device", "invalid_employer_snapshot", "open_conflicts"],
    actionContracts: ["attendance.export", "attendance.correct", "attendance.replayExport"].map(action)
  },
  {
    profileType: "Id06WorkplaceProfile",
    objectType: "id06Workplace",
    surfaceCodes: ["desktop.compliance", "desktop.search"],
    sectionCodes: ["workplaceIdentity", "companyBindings", "personBindings", "cardStatuses", "attendanceMirrors", "evidence"],
    blockerCodes: ["inactive_card", "employer_mismatch", "workplace_not_registered_for_required_pack"],
    actionContracts: ["id06.verifyCompany", "id06.verifyPerson", "id06.bindWorkplace", "id06.refreshCardStatus"].map(action)
  },
  {
    profileType: "SupportCaseProfile",
    objectType: "supportCase",
    surfaceCodes: ["backoffice.ops", "desktop.search"],
    sectionCodes: ["caseContext", "approvedSupportActions", "impersonation", "diagnostics", "audit", "signoffs"],
    blockerCodes: ["missing_dual_control", "scope_exceeds_approved_objects", "stale_approval"],
    actionContracts: ["support.approveActions", "support.startImpersonation", "support.executeDiagnostic", "support.closeCase"].map(action)
  },
  {
    profileType: "SubmissionDeadLetterProfile",
    objectType: "submissionDeadLetter",
    surfaceCodes: ["backoffice.ops", "desktop.search"],
    sectionCodes: ["submissionContext", "transportAttempts", "errorClassification", "repairActions", "replayPlan", "audit"],
    blockerCodes: ["replay_not_safe", "corrected_source_object_missing", "duplicate_terminal_receipt_already_present"],
    actionContracts: ["deadLetter.repair", "deadLetter.requeue", "deadLetter.cancel"].map(action)
  }
]);

export const WORKBENCH_CONTRACTS = Object.freeze([
  {
    workbenchCode: "FinanceWorkbench",
    title: "Finance workbench",
    surfaceCodes: ["desktop.finance", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["journalEntry", "importCase", "invoice", "bankReconciliation", "vatReturn", "taxAccountReconciliation"],
    counterCodes: ["postingBlockedCount", "unreconciledBankCount", "vatReviewCount", "taxAccountDifferenceCount"],
    bulkActionCodes: ["finance.validateJournals", "finance.assignReviewer", "finance.exportSelected"],
    savedViewCodes: ["periodClose", "unposted", "bankExceptions", "vatReady"],
    commandBarActionCodes: ["ledger.createManualJournal", "banking.importStatement", "vat.recalculate", "close.openBlockers"]
  },
  {
    workbenchCode: "PayrollWorkbench",
    title: "Payroll workbench",
    surfaceCodes: ["desktop.payroll", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["payRun", "payrollException", "garnishmentDecision", "agiSubmission", "payrollMigration"],
    counterCodes: ["blockingExceptions", "agiReceiptPendingCount", "migrationDiffCount"],
    bulkActionCodes: ["payroll.assignReviewer", "agi.collectReceipts"],
    savedViewCodes: ["currentPeriod", "readyForApproval", "agiPending", "migrationCutover"],
    commandBarActionCodes: ["payroll.createRun", "payroll.openExceptions", "agi.openQueue"]
  },
  {
    workbenchCode: "ReviewCenterWorkbench",
    title: "Review center workbench",
    surfaceCodes: ["desktop.review_center", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["reviewItem"],
    counterCodes: ["critical", "high", "overdue", "unclaimed"],
    bulkActionCodes: ["review.claimSelected", "review.reassignSelected", "review.escalateSelected"],
    savedViewCodes: [],
    commandBarActionCodes: ["review.openQueue"]
  },
  {
    workbenchCode: "SubmissionMonitoringWorkbench",
    title: "Submission monitoring workbench",
    surfaceCodes: ["desktop.compliance", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["authoritySubmission", "submissionDeadLetter"],
    counterCodes: ["technicalPending", "materialPending", "deadLettered", "replayPlanned"],
    bulkActionCodes: ["submission.collectReceipts", "submission.planReplay", "submission.openDeadLetter"],
    savedViewCodes: [],
    commandBarActionCodes: ["submission.refreshStatus"]
  },
  {
    workbenchCode: "ProjectControlWorkbench",
    title: "Project control workbench",
    surfaceCodes: ["desktop.projects", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["project", "projectSnapshot", "projectDeviation", "operationalCase"],
    counterCodes: ["marginNegativeCount", "billingBlockedCount", "forecastDriftCount"],
    bulkActionCodes: [],
    savedViewCodes: ["consulting", "retainer", "serviceOps", "construction"],
    commandBarActionCodes: ["project.create", "project.materializeProfitability"]
  },
  {
    workbenchCode: "FieldOpsWorkbench",
    title: "Field operations workbench",
    surfaceCodes: ["desktop.field", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["serviceOrder", "workOrder", "dispatchAssignment", "syncConflict"],
    counterCodes: ["dispatchUnassigned", "signaturePending", "syncConflictCount"],
    bulkActionCodes: ["field.assignDispatch", "field.markRoute", "field.openConflictQueue"],
    savedViewCodes: [],
    commandBarActionCodes: ["field.createWorkOrder", "field.openDispatch"]
  },
  {
    workbenchCode: "ComplianceWorkbench",
    title: "Compliance workbench",
    surfaceCodes: ["desktop.compliance", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["husClaim", "attendanceExport", "id06Workplace", "reportingObligation"],
    counterCodes: ["husSubmissionReady", "attendanceCorrectionsPending", "id06InvalidCount"],
    bulkActionCodes: [],
    savedViewCodes: [],
    commandBarActionCodes: ["hus.openReadyClaims", "attendance.openExports", "id06.openBindings"]
  },
  {
    workbenchCode: "BackofficeOpsWorkbench",
    title: "Backoffice operations workbench",
    surfaceCodes: ["backoffice.ops", "desktop.search"],
    defaultViewCode: "default",
    rowObjectTypes: ["supportCase", "asyncJob", "submissionDeadLetter", "replayPlan", "accessReview", "breakGlassSession"],
    counterCodes: ["highRiskOpen", "deadLetterOpen", "breakGlassActive", "accessReviewPending"],
    bulkActionCodes: ["ops.assignOwner", "ops.planReplay", "ops.closeResolved"],
    savedViewCodes: [],
    commandBarActionCodes: ["ops.openSupport", "ops.openDeadLetters", "ops.openAccessReviews"]
  }
]);

export function getObjectProfileContract(objectType) {
  return OBJECT_PROFILE_CONTRACTS.find((contract) => contract.objectType === objectType) || null;
}

export function getWorkbenchContract(workbenchCode) {
  return WORKBENCH_CONTRACTS.find((contract) => contract.workbenchCode === workbenchCode) || null;
}
