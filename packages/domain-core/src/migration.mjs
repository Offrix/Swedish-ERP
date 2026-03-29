import crypto from "node:crypto";
import { cloneValue as clone } from "./clone.mjs";
import { normalizeOptionalCountryCode } from "./validation.mjs";

export const IMPORT_BATCH_STATUSES = Object.freeze(["received", "validated", "mapped", "imported", "reconciled", "accepted", "rejected", "corrected"]);
export const MAPPING_SET_STATUSES = Object.freeze(["draft", "approved"]);
export const DIFF_REPORT_STATUSES = Object.freeze(["generated", "reviewed", "accepted", "remediation_required"]);
export const DIFFERENCE_CLASSES = Object.freeze(["cosmetic", "timing", "mapping_error", "missing_data", "material"]);
export const PARALLEL_RUN_RESULT_STATUSES = Object.freeze(["completed", "manual_review_required", "accepted", "blocked"]);
export const MIGRATION_ACCEPTANCE_RECORD_STATUSES = Object.freeze(["accepted", "blocked"]);
export const CUTOVER_REHEARSAL_STATUSES = Object.freeze(["scheduled", "completed", "blocked"]);
export const CUTOVER_AUTOMATED_VARIANCE_REPORT_STATUSES = Object.freeze(["generated", "accepted", "blocking"]);
export const CUTOVER_PLAN_STATUSES = Object.freeze([
  "planned",
  "freeze_started",
  "final_extract_done",
  "validation_passed",
  "switched",
  "stabilized",
  "closed",
  "rollback_in_progress",
  "rolled_back",
  "aborted"
]);
export const PAYROLL_MIGRATION_BATCH_STATUSES = Object.freeze([
  "draft",
  "imported",
  "validated",
  "diff_open",
  "approved_for_cutover",
  "cutover_executed",
  "rolled_back"
]);
export const PAYROLL_MIGRATION_MODES = Object.freeze(["test", "live"]);
export const EMPLOYEE_MIGRATION_VALIDATION_STATES = Object.freeze(["pending", "valid", "blocking"]);
export const PAYROLL_MIGRATION_DIFF_STATUSES = Object.freeze(["open", "explained", "accepted", "blocking", "resolved"]);
export const POST_CUTOVER_CORRECTION_CASE_STATUSES = Object.freeze(["open", "approved", "implemented", "closed"]);

export function createMigrationModule({
  state,
  clock = () => new Date(),
  orgAuthPlatform,
  hrPlatform = null,
  balancesPlatform = null,
  collectiveAgreementsPlatform = null,
  evidencePlatform = null,
  listRuntimeJobs = null,
  listRuntimeDeadLetters = null,
  listAuthoritySubmissions = null,
  audit,
  error
} = {}) {
  function authorize(sessionToken, companyId, action) {
    if (!orgAuthPlatform?.checkAuthorization) {
      throw error(500, "org_auth_platform_required", "Org/auth platform is required.");
    }
    const { principal, decision } = orgAuthPlatform.checkAuthorization({
      sessionToken,
      action,
      resource: {
        companyId,
        objectType: "migration",
        objectId: companyId,
        scopeCode: "migration"
      }
    });
    if (!decision.allowed) {
      throw error(403, decision.reasonCode, decision.explanation);
    }
    return principal;
  }

  return {
    importBatchStatuses: IMPORT_BATCH_STATUSES,
    mappingSetStatuses: MAPPING_SET_STATUSES,
    diffReportStatuses: DIFF_REPORT_STATUSES,
    differenceClasses: DIFFERENCE_CLASSES,
    parallelRunResultStatuses: PARALLEL_RUN_RESULT_STATUSES,
    migrationAcceptanceRecordStatuses: MIGRATION_ACCEPTANCE_RECORD_STATUSES,
    cutoverRehearsalStatuses: CUTOVER_REHEARSAL_STATUSES,
    cutoverAutomatedVarianceReportStatuses: CUTOVER_AUTOMATED_VARIANCE_REPORT_STATUSES,
    cutoverPlanStatuses: CUTOVER_PLAN_STATUSES,
    payrollMigrationBatchStatuses: PAYROLL_MIGRATION_BATCH_STATUSES,
    payrollMigrationModes: PAYROLL_MIGRATION_MODES,
    employeeMigrationValidationStates: EMPLOYEE_MIGRATION_VALIDATION_STATES,
    payrollMigrationDiffStatuses: PAYROLL_MIGRATION_DIFF_STATUSES,
    postCutoverCorrectionCaseStatuses: POST_CUTOVER_CORRECTION_CASE_STATUSES,
    createMappingSet,
    listMappingSets,
    approveMappingSet,
    registerImportBatch,
    listImportBatches,
    runImportBatch,
    recordManualMigrationCorrection,
    generateDiffReport,
    listDiffReports,
    recordDifferenceDecision,
    recordParallelRunResult,
    listParallelRunResults,
    acceptParallelRunResult,
    createCutoverPlan,
    listCutoverPlans,
    getCutoverConcierge,
    createMigrationAcceptanceRecord,
    listMigrationAcceptanceRecords,
    exportCutoverEvidenceBundle,
    exportCutoverSignoffEvidence,
    recordCutoverSignoff,
    updateCutoverChecklistItem,
    updateCutoverSourceExtractChecklistItem,
    recordCutoverRehearsal,
    generateCutoverAutomatedVarianceReport,
    recordCutoverRollbackDrill,
    startCutover,
    completeFinalExtract,
    passCutoverValidation,
    switchCutover,
    stabilizeCutover,
    startRollback,
    completeRollback,
    createPostCutoverCorrectionCase,
    listPostCutoverCorrectionCases,
    getMigrationCockpit,
    createPayrollMigrationBatch,
    listPayrollMigrationBatches,
    getPayrollMigrationBatch,
    importEmployeeMigrationRecords,
    registerBalanceBaselines,
    validatePayrollMigrationBatch,
    calculatePayrollMigrationDiff,
    listPayrollMigrationDiffs,
    decidePayrollMigrationDiff,
    approvePayrollMigrationBatch,
    executePayrollMigrationBatch,
    rollbackPayrollMigrationBatch,
    getEmployeeMigrationSummary,
    getOpenPayrollMigrationDiffs
  };

  function createMappingSet({
    sessionToken,
    companyId,
    sourceSystem,
    domainScope,
    versionNo = 1,
    mappings = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const mappingSet = {
      mappingSetId: crypto.randomUUID(),
      companyId,
      sourceSystem: text(sourceSystem, "mapping_set_source_system_required"),
      domainScope: text(domainScope, "mapping_set_domain_scope_required"),
      versionNo: normalizePositiveInteger(versionNo, "mapping_set_version_invalid"),
      status: "draft",
      mappings: normalizeMappings(mappings),
      reviewedByUserId: null,
      approvedByUserId: null,
      effectiveForBatches: [],
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.mappingSets.set(mappingSet.mappingSetId, mappingSet);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.mapping_set.created",
      entityType: "migration_mapping_set",
      entityId: mappingSet.mappingSetId,
      explanation: `Created mapping set ${mappingSet.domainScope}/${mappingSet.versionNo}.`
    });
    return clone(mappingSet);
  }

  function listMappingSets({ sessionToken, companyId, sourceSystem = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedSourceSystem = optionalText(sourceSystem);
    return [...state.mappingSets.values()]
      .filter((mappingSet) => mappingSet.companyId === text(companyId, "company_id_required"))
      .filter((mappingSet) => (resolvedSourceSystem ? mappingSet.sourceSystem === resolvedSourceSystem : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function approveMappingSet({
    sessionToken,
    companyId,
    mappingSetId,
    batchIds = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const mappingSet = requireMappingSet(companyId, mappingSetId);
    mappingSet.status = "approved";
    mappingSet.reviewedByUserId = principal.userId;
    mappingSet.approvedByUserId = principal.userId;
    mappingSet.effectiveForBatches = [...new Set((Array.isArray(batchIds) ? batchIds : []).map((batchId) => text(batchId, "import_batch_id_required")))];
    mappingSet.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.mapping_set.approved",
      entityType: "migration_mapping_set",
      entityId: mappingSet.mappingSetId,
      explanation: `Approved mapping set ${mappingSet.mappingSetId}.`
    });
    return clone(mappingSet);
  }

  function registerImportBatch({
    sessionToken,
    companyId,
    sourceSystem,
    batchType,
    recordCount,
    hash,
    scope = {},
    mappingSetId,
    objectRefs = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const mappingSet = requireMappingSet(companyId, mappingSetId);
    const importBatch = {
      importBatchId: crypto.randomUUID(),
      companyId,
      sourceSystem: text(sourceSystem, "import_batch_source_system_required"),
      batchType: text(batchType, "import_batch_type_required"),
      receivedAt: nowIso(clock),
      status: "received",
      recordCount: normalizePositiveInteger(recordCount, "import_batch_record_count_invalid"),
      hash: text(hash, "import_batch_hash_required"),
      scope: clone(scope || {}),
      mappingSetId: mappingSet.mappingSetId,
      validationSummary: {
        batchHashVerified: true,
        mappingApproved: mappingSet.status === "approved"
      },
      objectRefs: normalizeObjectRefs(objectRefs)
    };
    state.importBatches.set(importBatch.importBatchId, importBatch);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.import_batch.registered",
      entityType: "migration_import_batch",
      entityId: importBatch.importBatchId,
      explanation: `Registered import batch ${importBatch.batchType}.`
    });
    return clone(importBatch);
  }

  function listImportBatches({ sessionToken, companyId, status = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedStatus = optionalText(status);
    return [...state.importBatches.values()]
      .filter((batch) => batch.companyId === text(companyId, "company_id_required"))
      .filter((batch) => (resolvedStatus ? batch.status === resolvedStatus : true))
      .sort((left, right) => left.receivedAt.localeCompare(right.receivedAt))
      .map(clone);
  }

  function runImportBatch({
    sessionToken,
    companyId,
    importBatchId,
    autoAccept = false,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requireImportBatch(companyId, importBatchId);
    const mappingSet = requireMappingSet(companyId, batch.mappingSetId);
    if (!batch.hash) {
      throw error(409, "import_batch_hash_missing", "Import batch hash must be present.");
    }
    if (mappingSet.status !== "approved") {
      throw error(409, "mapping_set_not_approved", "Import batch requires an approved mapping set.");
    }
    batch.status = "validated";
    batch.validationSummary = {
      ...batch.validationSummary,
      mappingApproved: true,
      validatedAt: nowIso(clock)
    };
    batch.status = "mapped";
    batch.status = "imported";
    batch.importedAt = nowIso(clock);
    batch.status = "reconciled";
    batch.reconciledAt = nowIso(clock);
    if (autoAccept === true) {
      batch.status = "accepted";
      batch.acceptedAt = nowIso(clock);
    }
    batch.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.import_batch.run",
      entityType: "migration_import_batch",
      entityId: batch.importBatchId,
      explanation: `Imported batch ${batch.importBatchId} with ${batch.objectRefs.length} objects.`
    });
    return clone(batch);
  }

  function recordManualMigrationCorrection({
    sessionToken,
    companyId,
    importBatchId,
    sourceObjectId,
    targetObjectId,
    reasonCode,
    comment,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requireImportBatch(companyId, importBatchId);
    const correction = {
      correctionId: crypto.randomUUID(),
      companyId,
      importBatchId: batch.importBatchId,
      sourceObjectId: text(sourceObjectId, "migration_source_object_id_required"),
      targetObjectId: text(targetObjectId, "migration_target_object_id_required"),
      reasonCode: text(reasonCode, "migration_correction_reason_required"),
      comment: text(comment, "migration_correction_comment_required"),
      createdByUserId: principal.userId,
      createdAt: nowIso(clock)
    };
    state.migrationCorrections.set(correction.correctionId, correction);
    batch.status = "corrected";
    batch.updatedAt = correction.createdAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.correction.recorded",
      entityType: "migration_correction",
      entityId: correction.correctionId,
      explanation: `Recorded manual migration correction ${correction.reasonCode}.`
    });
    return clone(correction);
  }

  function generateDiffReport({
    sessionToken,
    companyId,
    comparisonScope,
    sourceSnapshotRef,
    targetSnapshotRef,
    differenceItems = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const items = normalizeDifferenceItems(differenceItems);
    const diffReport = {
      diffReportId: crypto.randomUUID(),
      companyId,
      comparisonScope: text(comparisonScope, "diff_report_scope_required"),
      sourceSnapshotRef: clone(sourceSnapshotRef || {}),
      targetSnapshotRef: clone(targetSnapshotRef || {}),
      differenceSummary: summarizeDifferenceItems(items),
      materialityAssessment: items.some((item) => item.differenceClass === "material") ? "material" : "non_material",
      status: items.some((item) => item.differenceClass === "material") ? "remediation_required" : "generated",
      differenceItems: items,
      generatedByUserId: principal.userId,
      generatedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.diffReports.set(diffReport.diffReportId, diffReport);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.diff_report.generated",
      entityType: "migration_diff_report",
      entityId: diffReport.diffReportId,
      explanation: `Generated diff report ${diffReport.comparisonScope}.`
    });
    return clone(diffReport);
  }

  function listDiffReports({ sessionToken, companyId, status = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedStatus = optionalText(status);
    return [...state.diffReports.values()]
      .filter((diffReport) => diffReport.companyId === text(companyId, "company_id_required"))
      .filter((diffReport) => (resolvedStatus ? diffReport.status === resolvedStatus : true))
      .sort((left, right) => left.generatedAt.localeCompare(right.generatedAt))
      .map(clone);
  }

  function recordDifferenceDecision({
    sessionToken,
    companyId,
    diffReportId,
    itemId,
    decision,
    comment = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const diffReport = requireDiffReport(companyId, diffReportId);
    const item = diffReport.differenceItems.find((candidate) => candidate.itemId === text(itemId, "diff_report_item_id_required"));
    if (!item) {
      throw error(404, "diff_report_item_not_found", "Diff report item was not found.");
    }
    item.decision = text(decision, "diff_report_decision_required");
    item.comment = optionalText(comment);
    item.decidedByUserId = principal.userId;
    item.decidedAt = nowIso(clock);
    diffReport.status = diffReport.differenceItems.some(
      (candidate) => candidate.differenceClass === "material" && candidate.decision !== "accepted"
    )
      ? "remediation_required"
      : "accepted";
    diffReport.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.diff_report.decided",
      entityType: "migration_diff_report",
      entityId: diffReport.diffReportId,
      explanation: `Recorded ${item.decision} for diff item ${item.itemId}.`
    });
    return clone(diffReport);
  }

  function recordParallelRunResult({
    sessionToken,
    companyId,
    comparisonScope,
    cutoverPlanId = null,
    trialEnvironmentProfileId = null,
    liveCompanyId = null,
    sourceSnapshotRef = {},
    targetSnapshotRef = {},
    thresholds = null,
    metrics = [],
    notes = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const cutoverPlan = cutoverPlanId ? requireCutoverPlan(resolvedCompanyId, cutoverPlanId) : null;
    const thresholdProfile = normalizeParallelRunThresholds(thresholds ?? cutoverPlan?.acceptedVarianceThresholds ?? {});
    const measurements = normalizeParallelRunMeasurements(metrics, thresholdProfile);
    const differenceSummary = summarizeParallelRunMeasurements(measurements);
    const parallelRunResult = {
      parallelRunResultId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      comparisonScope: text(comparisonScope, "parallel_run_scope_required"),
      cutoverPlanId: cutoverPlan?.cutoverPlanId || null,
      trialEnvironmentProfileId: optionalText(trialEnvironmentProfileId),
      liveCompanyId: optionalText(liveCompanyId),
      sourceSnapshotRef: clone(sourceSnapshotRef || {}),
      targetSnapshotRef: clone(targetSnapshotRef || {}),
      thresholdProfile,
      metrics: measurements,
      differenceSummary,
      status: resolveParallelRunResultStatus(differenceSummary),
      notes: optionalText(notes),
      recordedByUserId: principal.userId,
      completedAt: nowIso(clock),
      acceptedAt: null,
      acceptedByUserId: null,
      decisionComment: null,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.parallelRunResults.set(parallelRunResult.parallelRunResultId, parallelRunResult);
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.parallel_run.recorded",
      entityType: "migration_parallel_run_result",
      entityId: parallelRunResult.parallelRunResultId,
      explanation: `Recorded parallel run ${parallelRunResult.comparisonScope} as ${parallelRunResult.status}.`
    });
    return clone(parallelRunResult);
  }

  function listParallelRunResults({
    sessionToken,
    companyId,
    comparisonScope = null,
    cutoverPlanId = null,
    status = null
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedComparisonScope = optionalText(comparisonScope);
    const resolvedCutoverPlanId = optionalText(cutoverPlanId);
    const resolvedStatus = status == null
      ? null
      : assertAllowed(text(status, "parallel_run_result_status_required"), PARALLEL_RUN_RESULT_STATUSES, "parallel_run_result_status_invalid");
    return [...state.parallelRunResults.values()]
      .filter((parallelRunResult) => parallelRunResult.companyId === resolvedCompanyId)
      .filter((parallelRunResult) => (resolvedComparisonScope ? parallelRunResult.comparisonScope === resolvedComparisonScope : true))
      .filter((parallelRunResult) => (resolvedCutoverPlanId ? parallelRunResult.cutoverPlanId === resolvedCutoverPlanId : true))
      .filter((parallelRunResult) => (resolvedStatus ? parallelRunResult.status === resolvedStatus : true))
      .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
      .map(clone);
  }

  function acceptParallelRunResult({
    sessionToken,
    companyId,
    parallelRunResultId,
    decisionComment,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const parallelRunResult = requireParallelRunResult(companyId, parallelRunResultId);
    if (parallelRunResult.status === "blocked") {
      throw error(409, "parallel_run_result_blocked", "Blocked parallel run results must be rerun instead of manually accepted.");
    }
    if (parallelRunResult.status === "accepted") {
      return clone(parallelRunResult);
    }
    parallelRunResult.status = "accepted";
    parallelRunResult.acceptedAt = nowIso(clock);
    parallelRunResult.acceptedByUserId = principal.userId;
    parallelRunResult.decisionComment = text(decisionComment, "parallel_run_decision_comment_required");
    parallelRunResult.updatedAt = parallelRunResult.acceptedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.parallel_run.accepted",
      entityType: "migration_parallel_run_result",
      entityId: parallelRunResult.parallelRunResultId,
      explanation: `Accepted parallel run ${parallelRunResult.comparisonScope}.`
    });
    return clone(parallelRunResult);
  }

  function createCutoverPlan({
    sessionToken,
    companyId,
    freezeAt,
    rollbackPoint = null,
    rollbackPointRef = null,
    acceptedVarianceThresholds,
    stabilizationWindowHours,
    signoffChain = [],
    goLiveChecklist = [],
    sourceExtractChecklist = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedRollbackPointRef = text(rollbackPointRef || rollbackPoint, "cutover_rollback_point_required");
    const cutoverPlan = {
      cutoverPlanId: crypto.randomUUID(),
      companyId,
      freezeAt: timestamp(freezeAt, "cutover_freeze_at_required"),
      lastExtractAt: null,
      acceptedVarianceThresholds: normalizeAcceptedVarianceThresholds(acceptedVarianceThresholds),
      validationGateStatus: "pending",
      validationSummary: null,
      rollbackPointRef: resolvedRollbackPointRef,
      rollbackPoint: resolvedRollbackPointRef,
      signoffChain: normalizeSignoffChain(signoffChain),
      goLiveChecklist: normalizeChecklist(goLiveChecklist),
      sourceExtractChecklist: normalizeSourceExtractChecklist(sourceExtractChecklist),
      cutoverRehearsals: [],
      automatedVarianceReport: null,
      rollbackDrill: null,
      signoffEvidenceBundle: null,
      stabilizationWindowHours: normalizePositiveInteger(stabilizationWindowHours, "cutover_stabilization_window_hours_invalid"),
      status: "planned",
      switchedAt: null,
      stabilizedAt: null,
      rollbackStartedAt: null,
      rollbackCompletedAt: null,
      rollbackPlan: null,
      rollbackCompletionReceipt: null,
      createdByUserId: principal.userId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.cutoverPlans.set(cutoverPlan.cutoverPlanId, cutoverPlan);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover_plan.created",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Created cutover plan ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  function listCutoverPlans({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return [...state.cutoverPlans.values()]
      .filter((cutoverPlan) => cutoverPlan.companyId === text(companyId, "company_id_required"))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function getCutoverConcierge({
    sessionToken,
    companyId,
    cutoverPlanId
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const cutoverPlan = requireCutoverPlan(resolvedCompanyId, cutoverPlanId);
    const acceptanceRecords = listMigrationAcceptanceRecords({
      sessionToken,
      companyId: resolvedCompanyId,
      cutoverPlanId: cutoverPlan.cutoverPlanId
    });
    const parallelRunResults = listParallelRunResults({
      sessionToken,
      companyId: resolvedCompanyId,
      cutoverPlanId: cutoverPlan.cutoverPlanId
    });
    return buildCutoverConciergeSnapshot({
      cutoverPlan,
      acceptanceRecords,
      parallelRunResults,
      currentTimestamp: nowIso(clock)
    });
  }

  function createMigrationAcceptanceRecord({
    sessionToken,
    companyId,
    acceptanceType,
    cutoverPlanId = null,
    importBatchIds = [],
    diffReportIds = [],
    parallelRunResultIds = [],
    sourceParitySummary = {},
    signoffRefs = [],
    rollbackPointRef = null,
    notes = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const cutoverPlan = cutoverPlanId ? requireCutoverPlan(resolvedCompanyId, cutoverPlanId) : null;
    const normalizedImportBatchIds = normalizeExistingImportBatchIds(resolvedCompanyId, importBatchIds, state, error);
    const normalizedDiffReportIds = normalizeExistingDiffReportIds(resolvedCompanyId, diffReportIds, state, error);
    const normalizedParallelRunResultIds = normalizeExistingParallelRunResultIds(resolvedCompanyId, parallelRunResultIds, state, error);
    const normalizedSignoffRefs = normalizeAcceptanceSignoffRefs(signoffRefs, cutoverPlan);
    const normalizedParitySummary = normalizeSourceParitySummary(sourceParitySummary);
    const rollbackPoint = optionalText(rollbackPointRef) || cutoverPlan?.rollbackPoint || null;
    const blockingReasonCodes = computeAcceptanceBlockingReasonCodes({
      companyId: resolvedCompanyId,
      cutoverPlan,
      importBatchIds: normalizedImportBatchIds,
      diffReportIds: normalizedDiffReportIds,
      parallelRunResultIds: normalizedParallelRunResultIds,
      sourceParitySummary: normalizedParitySummary,
      signoffRefs: normalizedSignoffRefs,
      rollbackPointRef: rollbackPoint,
      state,
      error
    });

    const acceptanceRecord = {
      migrationAcceptanceRecordId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      acceptanceType: text(acceptanceType, "migration_acceptance_type_required"),
      cutoverPlanId: cutoverPlan?.cutoverPlanId || null,
      importBatchIds: normalizedImportBatchIds,
      diffReportIds: normalizedDiffReportIds,
      parallelRunResultIds: normalizedParallelRunResultIds,
      status: blockingReasonCodes.length === 0 ? "accepted" : "blocked",
      blockingReasonCodes,
      sourceParitySummary: normalizedParitySummary,
      signoffRefs: normalizedSignoffRefs,
      rollbackPointRef: rollbackPoint,
      notes: optionalText(notes),
      cutoverEvidenceBundle: null,
      recordedByUserId: principal.userId,
      recordedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    acceptanceRecord.cutoverEvidenceBundle = syncCutoverEvidenceBundle({
      acceptanceRecord,
      actorId: principal.userId,
      correlationId
    });
    state.migrationAcceptanceRecords.set(acceptanceRecord.migrationAcceptanceRecordId, acceptanceRecord);
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.acceptance_record.recorded",
      entityType: "migration_acceptance_record",
      entityId: acceptanceRecord.migrationAcceptanceRecordId,
      explanation: `Recorded ${acceptanceRecord.acceptanceType} migration acceptance as ${acceptanceRecord.status}.`
    });
    return clone(acceptanceRecord);
  }

  function exportCutoverEvidenceBundle({
    sessionToken,
    companyId,
    migrationAcceptanceRecordId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.read");
    const record = requireAcceptanceRecord(companyId, migrationAcceptanceRecordId);
    const bundle = syncCutoverEvidenceBundle({
      acceptanceRecord: record,
      actorId: principal.userId,
      correlationId
    });
    record.cutoverEvidenceBundle = bundle;
    return clone(bundle);
  }

  function exportCutoverSignoffEvidence({
    sessionToken,
    companyId,
    cutoverPlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const cutoverPlan = requireCutoverPlan(resolvedCompanyId, cutoverPlanId);
    const acceptanceRecord = findLatestMigrationAcceptanceRecord(state, resolvedCompanyId, cutoverPlan.cutoverPlanId);
    const bundle = syncCutoverSignoffEvidenceBundle({
      cutoverPlan,
      acceptanceRecord,
      actorId: principal.userId,
      correlationId
    });
    cutoverPlan.signoffEvidenceBundle = bundle;
    cutoverPlan.updatedAt = nowIso(clock);
    return clone(bundle);
  }

  function listMigrationAcceptanceRecords({
    sessionToken,
    companyId,
    acceptanceType = null,
    status = null,
    cutoverPlanId = null
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedAcceptanceType = optionalText(acceptanceType);
    const resolvedStatus = status == null
      ? null
      : assertAllowed(text(status, "migration_acceptance_status_required"), MIGRATION_ACCEPTANCE_RECORD_STATUSES, "migration_acceptance_status_invalid");
    const resolvedCutoverPlanId = optionalText(cutoverPlanId);
    return [...state.migrationAcceptanceRecords.values()]
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (resolvedAcceptanceType ? record.acceptanceType === resolvedAcceptanceType : true))
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .filter((record) => (resolvedCutoverPlanId ? record.cutoverPlanId === resolvedCutoverPlanId : true))
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map(clone);
  }

  function recordCutoverSignoff({
    sessionToken,
    companyId,
    cutoverPlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    const signoff = cutoverPlan.signoffChain.find((candidate) => candidate.userId === principal.userId);
    if (!signoff) {
      throw error(409, "cutover_signoff_actor_not_allowed", "Current actor is not part of the cutover sign-off chain.");
    }
    signoff.approvedByUserId = principal.userId;
    signoff.approvedAt = nowIso(clock);
    cutoverPlan.updatedAt = signoff.approvedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.signoff_recorded",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Recorded cutover sign-off ${signoff.label} for ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  function requireAcceptanceRecord(companyId, migrationAcceptanceRecordId) {
    const record = state.migrationAcceptanceRecords.get(text(migrationAcceptanceRecordId, "migration_acceptance_record_id_required"));
    if (!record || record.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "migration_acceptance_record_not_found", "Migration acceptance record was not found.");
    }
    return record;
  }

  function requireParallelRunResult(companyId, parallelRunResultId) {
    const record = state.parallelRunResults.get(text(parallelRunResultId, "parallel_run_result_id_required"));
    if (!record || record.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "parallel_run_result_not_found", "Parallel run result was not found.");
    }
    return record;
  }

  function syncCutoverEvidenceBundle({ acceptanceRecord, actorId, correlationId }) {
    if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
      return {
        cutoverEvidenceBundleId: crypto.randomUUID(),
        companyId: acceptanceRecord.companyId,
        migrationAcceptanceRecordId: acceptanceRecord.migrationAcceptanceRecordId,
        acceptanceType: acceptanceRecord.acceptanceType,
        cutoverPlanId: acceptanceRecord.cutoverPlanId,
        acceptedVarianceReports: acceptanceRecord.diffReportIds,
        acceptedParallelRunResults: acceptanceRecord.parallelRunResultIds,
        signoffRefs: acceptanceRecord.signoffRefs,
        sourceParitySummary: acceptanceRecord.sourceParitySummary,
        rollbackPointRef: acceptanceRecord.rollbackPointRef
      };
    }
    const payload = {
      companyId: acceptanceRecord.companyId,
      migrationAcceptanceRecordId: acceptanceRecord.migrationAcceptanceRecordId,
      acceptanceType: acceptanceRecord.acceptanceType,
      cutoverPlanId: acceptanceRecord.cutoverPlanId,
      acceptedVarianceReports: acceptanceRecord.diffReportIds,
      acceptedParallelRunResults: acceptanceRecord.parallelRunResultIds,
      importBatchIds: acceptanceRecord.importBatchIds,
      signoffRefs: acceptanceRecord.signoffRefs,
      sourceParitySummary: acceptanceRecord.sourceParitySummary,
      rollbackPointRef: acceptanceRecord.rollbackPointRef,
      status: acceptanceRecord.status,
      blockingReasonCodes: acceptanceRecord.blockingReasonCodes
    };
    const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
      companyId: acceptanceRecord.companyId,
      bundleType: "cutover_acceptance",
      sourceObjectType: "migration_acceptance_record",
      sourceObjectId: acceptanceRecord.migrationAcceptanceRecordId,
      sourceObjectVersion: acceptanceRecord.updatedAt,
      title: `Cutover acceptance ${acceptanceRecord.acceptanceType}`,
      retentionClass: "regulated",
      classificationCode: "restricted_internal",
      metadata: {
        compatibilityPayload: payload
      },
      artifactRefs: acceptanceRecord.diffReportIds.map((diffReportId) => ({
        artifactType: "variance_report",
        artifactRef: diffReportId,
        checksum: hashObject({
          diffReportId,
          acceptanceType: acceptanceRecord.acceptanceType
        })
      })).concat(
        acceptanceRecord.parallelRunResultIds.map((parallelRunResultId) => ({
          artifactType: "parallel_run_result",
          artifactRef: parallelRunResultId,
          checksum: hashObject({
            parallelRunResultId,
            acceptanceType: acceptanceRecord.acceptanceType
          })
        }))
      ),
      auditRefs: clone(acceptanceRecord.signoffRefs),
      signoffRefs: clone(acceptanceRecord.signoffRefs),
      sourceRefs: [
        {
          rollbackPointRef: acceptanceRecord.rollbackPointRef
        },
        clone(acceptanceRecord.sourceParitySummary)
      ],
      relatedObjectRefs: [
        ...acceptanceRecord.importBatchIds.map((importBatchId) => ({
          objectType: "migration_import_batch",
          objectId: importBatchId
        })),
        ...acceptanceRecord.diffReportIds.map((diffReportId) => ({
          objectType: "migration_diff_report",
          objectId: diffReportId
        })),
        ...acceptanceRecord.parallelRunResultIds.map((parallelRunResultId) => ({
          objectType: "migration_parallel_run_result",
          objectId: parallelRunResultId
        })),
        ...(acceptanceRecord.cutoverPlanId
          ? [
              {
                objectType: "migration_cutover_plan",
                objectId: acceptanceRecord.cutoverPlanId
              }
            ]
          : [])
      ],
      actorId,
      correlationId,
      previousEvidenceBundleId: acceptanceRecord.cutoverEvidenceBundle?.cutoverEvidenceBundleId || null
    });
    return {
      cutoverEvidenceBundleId: bundle.evidenceBundleId,
      companyId: acceptanceRecord.companyId,
      migrationAcceptanceRecordId: acceptanceRecord.migrationAcceptanceRecordId,
      acceptanceType: acceptanceRecord.acceptanceType,
      cutoverPlanId: acceptanceRecord.cutoverPlanId,
      acceptedVarianceReports: acceptanceRecord.diffReportIds,
      acceptedParallelRunResults: acceptanceRecord.parallelRunResultIds,
      signoffRefs: acceptanceRecord.signoffRefs,
      sourceParitySummary: acceptanceRecord.sourceParitySummary,
      rollbackPointRef: acceptanceRecord.rollbackPointRef,
      acceptanceRecordStatus: acceptanceRecord.status,
      checksum: bundle.checksum,
      status: bundle.status,
      frozenAt: bundle.frozenAt,
      archivedAt: bundle.archivedAt
    };
  }

  function syncCutoverSignoffEvidenceBundle({ cutoverPlan, acceptanceRecord, actorId, correlationId }) {
    const compatibilityPayload = {
      companyId: cutoverPlan.companyId,
      cutoverPlanId: cutoverPlan.cutoverPlanId,
      signoffRefs: clone(cutoverPlan.signoffChain || []),
      sourceExtractChecklist: clone(cutoverPlan.sourceExtractChecklist || []),
      cutoverRehearsals: clone(cutoverPlan.cutoverRehearsals || []),
      automatedVarianceReport: clone(cutoverPlan.automatedVarianceReport || null),
      rollbackDrill: clone(cutoverPlan.rollbackDrill || null),
      acceptanceRecordId: acceptanceRecord?.migrationAcceptanceRecordId || null
    };
    if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
      return {
        cutoverSignoffEvidenceBundleId: crypto.randomUUID(),
        companyId: cutoverPlan.companyId,
        cutoverPlanId: cutoverPlan.cutoverPlanId,
        signoffRefs: compatibilityPayload.signoffRefs,
        sourceExtractChecklistCount: compatibilityPayload.sourceExtractChecklist.length,
        rehearsalCount: compatibilityPayload.cutoverRehearsals.length,
        automatedVarianceReportId: compatibilityPayload.automatedVarianceReport?.cutoverVarianceReportId || null,
        rollbackDrillRestoreDrillId: compatibilityPayload.rollbackDrill?.restoreDrillId || null,
        acceptanceRecordId: compatibilityPayload.acceptanceRecordId,
        status: "frozen",
        frozenAt: nowIso(clock)
      };
    }
    const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
      companyId: cutoverPlan.companyId,
      bundleType: "cutover_signoff",
      sourceObjectType: "migration_cutover_plan",
      sourceObjectId: cutoverPlan.cutoverPlanId,
      sourceObjectVersion: cutoverPlan.updatedAt || cutoverPlan.createdAt,
      title: `Cutover signoff ${cutoverPlan.cutoverPlanId}`,
      retentionClass: "regulated",
      classificationCode: "restricted_internal",
      metadata: {
        compatibilityPayload
      },
      artifactRefs: [
        ...(cutoverPlan.sourceExtractChecklist || []).map((item) => ({
          artifactType: "source_extract_checklist_item",
          artifactRef: item.itemCode,
          checksum: hashObject({
            cutoverPlanId: cutoverPlan.cutoverPlanId,
            itemCode: item.itemCode,
            status: item.status,
            sourceExtractRef: item.sourceExtractRef || null
          })
        })),
        ...(cutoverPlan.cutoverRehearsals || []).map((rehearsal) => ({
          artifactType: "cutover_rehearsal",
          artifactRef: rehearsal.cutoverRehearsalId,
          checksum: hashObject({
            cutoverRehearsalId: rehearsal.cutoverRehearsalId,
            status: rehearsal.status,
            blockingReasonCodes: rehearsal.blockingReasonCodes || []
          })
        })),
        ...(cutoverPlan.automatedVarianceReport
          ? [
              {
                artifactType: "cutover_automated_variance_report",
                artifactRef: cutoverPlan.automatedVarianceReport.cutoverVarianceReportId,
                checksum: hashObject(cutoverPlan.automatedVarianceReport)
              }
            ]
          : []),
        ...(cutoverPlan.rollbackDrill
          ? [
              {
                artifactType: "cutover_rollback_drill",
                artifactRef: cutoverPlan.rollbackDrill.restoreDrillId,
                checksum: hashObject(cutoverPlan.rollbackDrill)
              }
            ]
          : [])
      ],
      auditRefs: clone(cutoverPlan.signoffChain || []),
      signoffRefs: clone(cutoverPlan.signoffChain || []),
      sourceRefs: [
        { rollbackPointRef: cutoverPlan.rollbackPointRef || cutoverPlan.rollbackPoint || null },
        ...(acceptanceRecord ? [{ migrationAcceptanceRecordId: acceptanceRecord.migrationAcceptanceRecordId }] : [])
      ],
      relatedObjectRefs: [
        ...(acceptanceRecord
          ? [
              {
                objectType: "migration_acceptance_record",
                objectId: acceptanceRecord.migrationAcceptanceRecordId
              }
            ]
          : []),
        ...(cutoverPlan.rollbackDrill
          ? [
              {
                objectType: "restore_drill",
                objectId: cutoverPlan.rollbackDrill.restoreDrillId
              }
            ]
          : [])
      ],
      actorId,
      correlationId,
      previousEvidenceBundleId: cutoverPlan.signoffEvidenceBundle?.cutoverSignoffEvidenceBundleId || null
    });
    return {
      cutoverSignoffEvidenceBundleId: bundle.evidenceBundleId,
      companyId: cutoverPlan.companyId,
      cutoverPlanId: cutoverPlan.cutoverPlanId,
      signoffRefs: clone(cutoverPlan.signoffChain || []),
      sourceExtractChecklistCount: (cutoverPlan.sourceExtractChecklist || []).length,
      rehearsalCount: (cutoverPlan.cutoverRehearsals || []).length,
      automatedVarianceReportId: cutoverPlan.automatedVarianceReport?.cutoverVarianceReportId || null,
      rollbackDrillRestoreDrillId: cutoverPlan.rollbackDrill?.restoreDrillId || null,
      acceptanceRecordId: acceptanceRecord?.migrationAcceptanceRecordId || null,
      checksum: bundle.checksum,
      status: bundle.status,
      frozenAt: bundle.frozenAt,
      archivedAt: bundle.archivedAt
    };
  }

  function syncPayrollMigrationHistoryEvidenceBundle({ batch, actorId, correlationId }) {
    const records = listStoredEmployeeMigrationRecords(batch);
    if (records.length === 0) {
      return null;
    }
    const historyImportSummary = buildPayrollHistoryImportSummary(batch);
    const artifactRefs = dedupeObjectList(
      records.flatMap((record) =>
        (Array.isArray(record.evidenceMappings) ? record.evidenceMappings : []).map((mapping) => ({
          artifactType: mapping.artifactType,
          artifactRef: mapping.artifactRef,
          checksum: mapping.checksum,
          roleCode: mapping.targetAreaCode,
          metadata: {
            sourceRecordRef: mapping.sourceRecordRef,
            targetAreaCode: mapping.targetAreaCode
          }
        }))
      ),
      (value) => `${value.artifactType}::${value.artifactRef}::${value.roleCode || ""}`
    );
    const sourceRefs = dedupeObjectList(
      [
        clone(batch.sourceSnapshotRef || {}),
        ...records.flatMap((record) => [
          {
            employeeId: record.employeeId,
            employmentId: record.employmentId,
            sourceEmployeeRef: record.sourceEmployeeRef
          },
          ...(Array.isArray(record.agiCarryForwardBasis?.submissionReferences)
            ? record.agiCarryForwardBasis.submissionReferences.map((submissionReference) => ({
                submissionReference,
                reportedThroughPeriod: record.agiCarryForwardBasis?.reportedThroughPeriod || null
              }))
            : [])
        ])
      ].filter((value) => value && Object.keys(value).length > 0),
      (value) => hashObject(value)
    );
    const relatedObjectRefs = dedupeObjectList(
      records.flatMap((record) => [
        {
          objectType: "employee",
          objectId: record.employeeId
        },
        {
          objectType: "employment",
          objectId: record.employmentId
        }
      ]),
      (value) => `${value.objectType}::${value.objectId}`
    );
    if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
      return {
        historyEvidenceBundleId: crypto.randomUUID(),
        companyId: batch.companyId,
        payrollMigrationBatchId: batch.payrollMigrationBatchId,
        artifactCount: artifactRefs.length,
        requiredEvidenceAreas: collectPayrollHistoryRequiredEvidenceAreas(records),
        historyImportSummary
      };
    }
    const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
      companyId: batch.companyId,
      bundleType: "payroll_history_import",
      sourceObjectType: "payroll_migration_batch",
      sourceObjectId: batch.payrollMigrationBatchId,
      sourceObjectVersion: batch.updatedAt || batch.createdAt,
      title: `Payroll history import ${batch.batchReference || batch.payrollMigrationBatchId}`,
      retentionClass: "regulated",
      classificationCode: "restricted_internal",
      metadata: {
        compatibilityPayload: {
          payrollMigrationBatchId: batch.payrollMigrationBatchId,
          migrationMode: batch.migrationMode,
          effectiveCutoverDate: batch.effectiveCutoverDate,
          firstTargetReportingPeriod: batch.firstTargetReportingPeriod,
          historyImportSummary
        }
      },
      artifactRefs,
      sourceRefs,
      relatedObjectRefs,
      actorId,
      correlationId,
      previousEvidenceBundleId: batch.historyEvidenceBundle?.historyEvidenceBundleId || null
    });
    return {
      historyEvidenceBundleId: bundle.evidenceBundleId,
      companyId: batch.companyId,
      payrollMigrationBatchId: batch.payrollMigrationBatchId,
      artifactCount: bundle.artifactCount,
      requiredEvidenceAreas: collectPayrollHistoryRequiredEvidenceAreas(records),
      historyImportSummary,
      checksum: bundle.checksum,
      status: bundle.status,
      frozenAt: bundle.frozenAt,
      archivedAt: bundle.archivedAt
    };
  }

  function updateCutoverChecklistItem({
    sessionToken,
    companyId,
    cutoverPlanId,
    itemCode,
    status,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    const checklistItem = cutoverPlan.goLiveChecklist.find((candidate) => candidate.itemCode === text(itemCode, "cutover_checklist_item_code_required"));
    if (!checklistItem) {
      throw error(404, "cutover_checklist_item_not_found", "Cutover checklist item was not found.");
    }
    checklistItem.status = normalizeChecklistStatus(status);
    checklistItem.updatedByUserId = principal.userId;
    checklistItem.updatedAt = nowIso(clock);
    if (checklistItem.status === "completed") {
      checklistItem.completedAt = checklistItem.updatedAt;
    }
    cutoverPlan.updatedAt = checklistItem.updatedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.checklist_updated",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Updated checklist item ${checklistItem.itemCode} to ${checklistItem.status}.`
    });
    return clone(cutoverPlan);
  }

  function updateCutoverSourceExtractChecklistItem({
    sessionToken,
    companyId,
    cutoverPlanId,
    itemCode,
    status,
    sourceExtractRef = null,
    verificationSummary = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    const checklistItem = cutoverPlan.sourceExtractChecklist.find(
      (candidate) => candidate.itemCode === text(itemCode, "cutover_source_extract_item_code_required")
    );
    if (!checklistItem) {
      throw error(404, "cutover_source_extract_item_not_found", "Cutover source extract checklist item was not found.");
    }
    checklistItem.status = normalizeChecklistStatus(status);
    checklistItem.sourceExtractRef = optionalText(sourceExtractRef) || checklistItem.sourceExtractRef || null;
    checklistItem.verificationSummary = optionalText(verificationSummary);
    checklistItem.updatedByUserId = principal.userId;
    checklistItem.updatedAt = nowIso(clock);
    if (checklistItem.status === "completed") {
      checklistItem.completedAt = checklistItem.updatedAt;
      checklistItem.verifiedByUserId = principal.userId;
    }
    cutoverPlan.updatedAt = checklistItem.updatedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.source_extract_checklist_updated",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Updated source extract checklist item ${checklistItem.itemCode} to ${checklistItem.status}.`
    });
    return clone(cutoverPlan);
  }

  function recordCutoverRehearsal({
    sessionToken,
    companyId,
    cutoverPlanId,
    rehearsalType = "dress_rehearsal",
    scopeCode = "full_company",
    status = "completed",
    summary = null,
    scheduledFor = null,
    observedIssueCount = 0,
    diffReportIds = [],
    parallelRunResultIds = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const cutoverPlan = requireCutoverPlan(resolvedCompanyId, cutoverPlanId);
    const normalizedDiffReportIds = normalizeExistingDiffReportIds(resolvedCompanyId, diffReportIds, state, error);
    const normalizedParallelRunResultIds = normalizeExistingParallelRunResultIds(resolvedCompanyId, parallelRunResultIds, state, error);
    const blockingReasonCodes = [];
    for (const diffReportId of normalizedDiffReportIds) {
      const diffReport = statefulRequire("diffReports", resolvedCompanyId, diffReportId, "diff_report_not_found", state, error);
      if (diffReport.status !== "accepted") {
        blockingReasonCodes.push("variance_report_not_accepted");
        break;
      }
    }
    for (const parallelRunResultId of normalizedParallelRunResultIds) {
      const parallelRunResult = statefulRequire("parallelRunResults", resolvedCompanyId, parallelRunResultId, "parallel_run_result_not_found", state, error);
      if (parallelRunResult.status !== "accepted") {
        blockingReasonCodes.push(parallelRunResult.status === "blocked" ? "parallel_run_blocked" : "parallel_run_not_accepted");
        break;
      }
    }
    const resolvedObservedIssueCount = normalizeNonNegativeInteger(observedIssueCount);
    if (resolvedObservedIssueCount > 0) {
      blockingReasonCodes.push("rehearsal_issues_open");
    }
    const requestedStatus = assertAllowed(text(status, "cutover_rehearsal_status_required"), CUTOVER_REHEARSAL_STATUSES, "cutover_rehearsal_status_invalid");
    const resolvedStatus = requestedStatus === "completed" && blockingReasonCodes.length > 0 ? "blocked" : requestedStatus;
    const rehearsal = {
      cutoverRehearsalId: crypto.randomUUID(),
      rehearsalType: text(rehearsalType, "cutover_rehearsal_type_required"),
      scopeCode: text(scopeCode, "cutover_rehearsal_scope_required"),
      status: resolvedStatus,
      summary: optionalText(summary),
      scheduledFor: scheduledFor ? timestamp(scheduledFor, "cutover_rehearsal_scheduled_for_invalid") : null,
      observedIssueCount: resolvedObservedIssueCount,
      blockingReasonCodes: [...new Set(blockingReasonCodes)],
      diffReportIds: normalizedDiffReportIds,
      parallelRunResultIds: normalizedParallelRunResultIds,
      recordedByUserId: principal.userId,
      recordedAt: nowIso(clock)
    };
    cutoverPlan.cutoverRehearsals = [...(Array.isArray(cutoverPlan.cutoverRehearsals) ? cutoverPlan.cutoverRehearsals : []), rehearsal];
    cutoverPlan.updatedAt = rehearsal.recordedAt;
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.rehearsal_recorded",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Recorded cutover rehearsal ${rehearsal.cutoverRehearsalId} as ${rehearsal.status}.`
    });
    return clone(rehearsal);
  }

  function generateCutoverAutomatedVarianceReport({
    sessionToken,
    companyId,
    cutoverPlanId,
    diffReportIds = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const cutoverPlan = requireCutoverPlan(resolvedCompanyId, cutoverPlanId);
    const latestAcceptanceRecord = findLatestMigrationAcceptanceRecord(state, resolvedCompanyId, cutoverPlan.cutoverPlanId);
    const normalizedDiffReportIds = Array.isArray(diffReportIds) && diffReportIds.length > 0
      ? normalizeExistingDiffReportIds(resolvedCompanyId, diffReportIds, state, error)
      : normalizeExistingDiffReportIds(resolvedCompanyId, latestAcceptanceRecord?.diffReportIds || [], state, error);
    const parallelRunResults = [...state.parallelRunResults.values()]
      .filter((parallelRunResult) => parallelRunResult.companyId === resolvedCompanyId)
      .filter((parallelRunResult) => parallelRunResult.cutoverPlanId === cutoverPlan.cutoverPlanId);
    const diffReports = normalizedDiffReportIds.map((diffReportId) =>
      statefulRequire("diffReports", resolvedCompanyId, diffReportId, "diff_report_not_found", state, error)
    );
    const unresolvedMaterialDifferences = diffReports.reduce(
      (sum, diffReport) => sum + Number(diffReport.summary?.material || 0),
      0
    );
    const blockedDiffReportCount = diffReports.filter((diffReport) => diffReport.status === "remediation_required").length;
    const pendingParallelRunAcceptanceCount = parallelRunResults.filter((result) => ["completed", "manual_review_required"].includes(result.status)).length;
    const blockedParallelRunCount = parallelRunResults.filter((result) => result.status === "blocked").length;
    const maxAbsDeltaValue = parallelRunResults.reduce(
      (maxValue, result) => Math.max(maxValue, Number(result.differenceSummary?.maxAbsDeltaValue || 0)),
      0
    );
    const maxAbsDeltaPercent = parallelRunResults.reduce(
      (maxValue, result) => Math.max(maxValue, Number(result.differenceSummary?.maxAbsDeltaPercent || 0)),
      0
    );
    const blockingReasonCodes = [];
    if (diffReports.length === 0) {
      blockingReasonCodes.push("variance_reports_missing");
    }
    if (parallelRunResults.length === 0) {
      blockingReasonCodes.push("parallel_runs_missing");
    }
    if (unresolvedMaterialDifferences > 0 || blockedDiffReportCount > 0) {
      blockingReasonCodes.push("material_variances_open");
    }
    if (pendingParallelRunAcceptanceCount > 0) {
      blockingReasonCodes.push("parallel_run_acceptance_pending");
    }
    if (blockedParallelRunCount > 0) {
      blockingReasonCodes.push("parallel_run_blocked");
    }
    const status = blockingReasonCodes.length === 0
      ? "accepted"
      : blockedDiffReportCount > 0 || blockedParallelRunCount > 0 || unresolvedMaterialDifferences > 0
        ? "blocking"
        : "generated";
    const report = {
      cutoverVarianceReportId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      cutoverPlanId: cutoverPlan.cutoverPlanId,
      status,
      diffReportIds: normalizedDiffReportIds,
      parallelRunResultIds: parallelRunResults.map((result) => result.parallelRunResultId),
      unresolvedMaterialDifferences,
      blockedDiffReportCount,
      pendingParallelRunAcceptanceCount,
      blockedParallelRunCount,
      maxAbsDeltaValue,
      maxAbsDeltaPercent,
      paritySummary: clone(latestAcceptanceRecord?.sourceParitySummary || {}),
      blockingReasonCodes: [...new Set(blockingReasonCodes)],
      generatedByUserId: principal.userId,
      generatedAt: nowIso(clock)
    };
    cutoverPlan.automatedVarianceReport = report;
    cutoverPlan.updatedAt = report.generatedAt;
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.variance_report_generated",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Generated automated variance report ${report.cutoverVarianceReportId} as ${report.status}.`
    });
    return clone(report);
  }

  function recordCutoverRollbackDrill({
    sessionToken,
    companyId,
    cutoverPlanId,
    restoreDrillId,
    drillCode = null,
    verificationSummary = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const cutoverPlan = requireCutoverPlan(resolvedCompanyId, cutoverPlanId);
    const linkedRestoreDrill = state.restoreDrills.get(text(restoreDrillId, "restore_drill_id_required"));
    if (!linkedRestoreDrill || linkedRestoreDrill.companyId !== resolvedCompanyId) {
      throw error(404, "restore_drill_not_found", "Restore drill was not found.");
    }
    const rollbackDrill = {
      restoreDrillId: linkedRestoreDrill.restoreDrillId,
      drillCode: optionalText(drillCode) || linkedRestoreDrill.drillCode,
      drillType: linkedRestoreDrill.drillType,
      status: linkedRestoreDrill.status,
      targetRtoMinutes: linkedRestoreDrill.targetRtoMinutes,
      targetRpoMinutes: linkedRestoreDrill.targetRpoMinutes,
      actualRtoMinutes: linkedRestoreDrill.actualRtoMinutes,
      actualRpoMinutes: linkedRestoreDrill.actualRpoMinutes,
      verificationSummary: optionalText(verificationSummary) || linkedRestoreDrill.verificationSummary || null,
      recordedByUserId: principal.userId,
      recordedAt: nowIso(clock)
    };
    cutoverPlan.rollbackDrill = rollbackDrill;
    cutoverPlan.updatedAt = rollbackDrill.recordedAt;
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.rollback_drill_linked",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Linked rollback drill ${rollbackDrill.restoreDrillId} to ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(rollbackDrill);
  }

  function startCutover({
    sessionToken,
    companyId,
    cutoverPlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (!cutoverPlan.rollbackPoint) {
      throw error(409, "cutover_rollback_point_missing", "Cutover requires a rollback point.");
    }
    cutoverPlan.status = "freeze_started";
    cutoverPlan.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.started",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Started cutover ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  function completeFinalExtract({
    sessionToken,
    companyId,
    cutoverPlanId,
    lastExtractAt = nowIso(clock),
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    cutoverPlan.lastExtractAt = timestamp(lastExtractAt, "cutover_last_extract_at_required");
    cutoverPlan.status = "final_extract_done";
    cutoverPlan.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.final_extract_completed",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Completed final extract for ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  async function passCutoverValidation({
    sessionToken,
    companyId,
    cutoverPlanId,
    contractTestsPassed = false,
    goldenScenariosPassed = false,
    runbooksAcknowledged = false,
    restoreDrillFreshnessDays = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (cutoverPlan.status !== "final_extract_done") {
      throw error(409, "cutover_validation_invalid_state", "Cutover validation requires completed final extract.");
    }
    const acceptanceRecord = findLatestAcceptedMigrationAcceptanceRecord(state, companyId, cutoverPlan.cutoverPlanId);
    const blockingReasonCodes = await computeCutoverValidationBlockingReasonCodes({
      companyId,
      cutoverPlan,
      acceptanceRecord,
      contractTestsPassed: contractTestsPassed === true,
      goldenScenariosPassed: goldenScenariosPassed === true,
      runbooksAcknowledged: runbooksAcknowledged === true,
      restoreDrillFreshnessDays: normalizeOptionalPositiveInteger(restoreDrillFreshnessDays, "cutover_restore_drill_freshness_days_invalid"),
      state,
      clock,
      listRuntimeJobs,
      listRuntimeDeadLetters
    });
    if (blockingReasonCodes.length > 0) {
      cutoverPlan.validationGateStatus = "blocked";
      cutoverPlan.validationSummary = {
        status: "blocked",
        acceptanceRecordId: acceptanceRecord?.migrationAcceptanceRecordId || null,
        contractTestsPassed: contractTestsPassed === true,
        goldenScenariosPassed: goldenScenariosPassed === true,
        runbooksAcknowledged: runbooksAcknowledged === true,
        restoreDrillFreshnessDays: normalizeOptionalPositiveInteger(restoreDrillFreshnessDays, "cutover_restore_drill_freshness_days_invalid"),
        blockingReasonCodes,
        validatedAt: nowIso(clock)
      };
      cutoverPlan.updatedAt = cutoverPlan.validationSummary.validatedAt;
      throw error(
        409,
        "cutover_validation_blocked",
        `Cutover validation is blocked: ${blockingReasonCodes.join(", ")}.`
      );
    }
    cutoverPlan.validationGateStatus = "passed";
    cutoverPlan.status = "validation_passed";
    cutoverPlan.validationSummary = {
      status: "passed",
      acceptanceRecordId: acceptanceRecord?.migrationAcceptanceRecordId || null,
      contractTestsPassed: true,
      goldenScenariosPassed: true,
      runbooksAcknowledged: true,
      restoreDrillFreshnessDays: normalizeOptionalPositiveInteger(restoreDrillFreshnessDays, "cutover_restore_drill_freshness_days_invalid"),
      blockingReasonCodes: [],
      validatedAt: nowIso(clock)
    };
    cutoverPlan.updatedAt = cutoverPlan.validationSummary.validatedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.validation_passed",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Validation passed for ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  function switchCutover({
    sessionToken,
    companyId,
    cutoverPlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (cutoverPlan.validationGateStatus !== "passed" || cutoverPlan.status !== "validation_passed") {
      throw error(409, "cutover_validation_required", "Cutover switch requires validation gate to pass.");
    }
    if (cutoverPlan.signoffChain.length === 0 || cutoverPlan.signoffChain.some((step) => !step.approvedAt || !step.approvedByUserId)) {
      throw error(409, "cutover_signoff_incomplete", "Cutover switch requires a fully signed sign-off chain.");
    }
    if (cutoverPlan.goLiveChecklist.some((item) => item.mandatory !== false && item.status !== "completed")) {
      throw error(409, "cutover_checklist_incomplete", "Cutover switch requires all mandatory checklist items to be completed.");
    }
    if (hasBlockingDiffReports(state, companyId)) {
      throw error(409, "cutover_blocking_differences", "Cutover switch requires all blocking diff reports to be resolved.");
    }
    cutoverPlan.status = "switched";
    cutoverPlan.switchedAt = nowIso(clock);
    cutoverPlan.updatedAt = cutoverPlan.switchedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.switched",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Switched cutover ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  function stabilizeCutover({
    sessionToken,
    companyId,
    cutoverPlanId,
    close = false,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (close === true) {
      if (cutoverPlan.status !== "stabilized") {
        throw error(409, "cutover_close_requires_stabilized", "Cutover must be stabilized before closure.");
      }
      const closeAt = nowIso(clock);
      const earliestCloseAt = addHoursIso(cutoverPlan.switchedAt, cutoverPlan.stabilizationWindowHours);
      if (closeAt < earliestCloseAt) {
        throw error(409, "cutover_stabilization_window_open", "Cutover cannot close before the stabilization window has elapsed.");
      }
      cutoverPlan.status = "closed";
      cutoverPlan.updatedAt = closeAt;
    } else {
      if (cutoverPlan.status !== "switched") {
        throw error(409, "cutover_stabilize_invalid_state", "Cutover must be switched before stabilization.");
      }
      cutoverPlan.status = "stabilized";
      cutoverPlan.stabilizedAt = nowIso(clock);
      cutoverPlan.updatedAt = cutoverPlan.stabilizedAt;
    }
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.stabilized",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Updated cutover ${cutoverPlan.cutoverPlanId} to ${cutoverPlan.status}.`
    });
    return clone(cutoverPlan);
  }

  function startRollback({
    sessionToken,
    companyId,
    cutoverPlanId,
    reasonCode,
    rollbackOwnerUserId = null,
    supportSignoffRef = null,
    securitySignoffRef = null,
    complianceSignoffRef = null,
    suspendIntegrationCodes = [],
    freezeOperationalIntake = null,
    recoveryPlanCode = null,
    recoveryPlanNote = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (!cutoverPlan.rollbackPoint) {
      throw error(409, "cutover_rollback_point_missing", "Rollback requires a rollback point.");
    }
    const rollbackMode = resolveCutoverRollbackMode(cutoverPlan, error);
    const postSwitchSubmittedRegulatedSubmissions = listPostSwitchSubmittedRegulatedSubmissions({
      companyId,
      switchedAt: cutoverPlan.switchedAt,
      listAuthoritySubmissions
    });
    if (rollbackMode === "post_switch_compensation") {
      const resolvedRollbackOwnerUserId = text(
        rollbackOwnerUserId || principal.userId,
        "cutover_rollback_owner_user_id_required"
      );
      const resolvedSupportSignoffRef = text(supportSignoffRef, "cutover_rollback_support_signoff_ref_required");
      const resolvedSecuritySignoffRef = text(securitySignoffRef, "cutover_rollback_security_signoff_ref_required");
      const normalizedSuspendIntegrationCodes = normalizeUniqueCodes(
        suspendIntegrationCodes,
        "cutover_rollback_suspend_integration_code_required"
      );
      if (normalizedSuspendIntegrationCodes.length === 0) {
        throw error(
          409,
          "cutover_rollback_suspend_integrations_required",
          "Post-switch rollback requires explicit suspended integrations."
        );
      }
      let regulatedSubmissionRecoveryPlan = null;
      if (postSwitchSubmittedRegulatedSubmissions.length > 0) {
        regulatedSubmissionRecoveryPlan = {
          recoveryPlanCode: text(recoveryPlanCode, "cutover_rollback_recovery_plan_required"),
          recoveryPlanNote: optionalText(recoveryPlanNote),
          complianceSignoffRef: text(
            complianceSignoffRef,
            "cutover_rollback_compliance_signoff_ref_required"
          ),
          protectedSubmissionRefs: postSwitchSubmittedRegulatedSubmissions.map((submission) => ({
            submissionId: submission.submissionId,
            submissionType: submission.submissionType,
            submittedAt: submission.submittedAt,
            status: submission.status
          })),
          filingHistoryPreserved: true,
          correctionRecoveryRequired: true
        };
      }
      cutoverPlan.rollbackPlan = {
        rollbackPlanId: crypto.randomUUID(),
        rollbackExecutionMode: rollbackMode,
        rollbackReasonCode: text(reasonCode, "cutover_rollback_reason_required"),
        rollbackPointRef: cutoverPlan.rollbackPointRef || cutoverPlan.rollbackPoint,
        rollbackOwnerUserId: resolvedRollbackOwnerUserId,
        supportSignoffRef: resolvedSupportSignoffRef,
        securitySignoffRef: resolvedSecuritySignoffRef,
        complianceSignoffRef: regulatedSubmissionRecoveryPlan?.complianceSignoffRef || optionalText(complianceSignoffRef),
        suspendIntegrationCodes: normalizedSuspendIntegrationCodes,
        freezeOperationalIntake: freezeOperationalIntake === true,
        reverseSwitchMarkers: true,
        preserveAuditEvidence: true,
        preserveImmutableReceipts: true,
        purgeTargetOnlyImportedObjects: false,
        regulatedSubmissionRecoveryPlan,
        startedAt: nowIso(clock),
        startedByUserId: principal.userId,
        completedAt: null,
        completedByUserId: null,
        completionReceipt: null
      };
    } else {
      cutoverPlan.rollbackPlan = {
        rollbackPlanId: crypto.randomUUID(),
        rollbackExecutionMode: rollbackMode,
        rollbackReasonCode: text(reasonCode, "cutover_rollback_reason_required"),
        rollbackPointRef: cutoverPlan.rollbackPointRef || cutoverPlan.rollbackPoint,
        rollbackOwnerUserId: principal.userId,
        supportSignoffRef: null,
        securitySignoffRef: null,
        complianceSignoffRef: null,
        suspendIntegrationCodes: [],
        freezeOperationalIntake: false,
        reverseSwitchMarkers: false,
        preserveAuditEvidence: true,
        preserveImmutableReceipts: true,
        purgeTargetOnlyImportedObjects: true,
        regulatedSubmissionRecoveryPlan: null,
        startedAt: nowIso(clock),
        startedByUserId: principal.userId,
        completedAt: null,
        completedByUserId: null,
        completionReceipt: null
      };
    }
    cutoverPlan.status = "rollback_in_progress";
    cutoverPlan.rollbackReasonCode = cutoverPlan.rollbackPlan.rollbackReasonCode;
    cutoverPlan.rollbackStartedAt = cutoverPlan.rollbackPlan.startedAt;
    cutoverPlan.updatedAt = cutoverPlan.rollbackStartedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.rollback_started",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Started ${cutoverPlan.rollbackPlan.rollbackExecutionMode} rollback for ${cutoverPlan.cutoverPlanId}.`,
      metadata: {
        rollbackExecutionMode: cutoverPlan.rollbackPlan.rollbackExecutionMode,
        protectedSubmissionCount: cutoverPlan.rollbackPlan.regulatedSubmissionRecoveryPlan?.protectedSubmissionRefs.length || 0
      }
    });
    return clone(cutoverPlan);
  }

  function completeRollback({
    sessionToken,
    companyId,
    cutoverPlanId,
    integrationsSuspended = null,
    switchMarkersReversed = null,
    auditEvidencePreserved = null,
    immutableReceiptsPreserved = null,
    stagedObjectsPurged = null,
    recoveryPlanActivated = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (cutoverPlan.status !== "rollback_in_progress") {
      throw error(409, "cutover_rollback_not_started", "Rollback must be started before completion.");
    }
    const rollbackPlan = cutoverPlan.rollbackPlan;
    if (!rollbackPlan) {
      throw error(409, "cutover_rollback_plan_missing", "Rollback completion requires a rollback plan.");
    }
    const completionReceipt = buildRollbackCompletionReceipt({
      rollbackPlan,
      integrationsSuspended,
      switchMarkersReversed,
      auditEvidencePreserved,
      immutableReceiptsPreserved,
      stagedObjectsPurged,
      recoveryPlanActivated,
      error
    });
    cutoverPlan.status = "rolled_back";
    cutoverPlan.rollbackCompletedAt = nowIso(clock);
    cutoverPlan.updatedAt = cutoverPlan.rollbackCompletedAt;
    cutoverPlan.rollbackCompletionReceipt = completionReceipt;
    cutoverPlan.rollbackPlan = {
      ...rollbackPlan,
      completedAt: cutoverPlan.rollbackCompletedAt,
      completedByUserId: principal.userId,
      completionReceipt
    };
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.rollback_completed",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Completed ${rollbackPlan.rollbackExecutionMode} rollback for ${cutoverPlan.cutoverPlanId}.`,
      metadata: {
        rollbackExecutionMode: rollbackPlan.rollbackExecutionMode,
        protectedSubmissionCount: rollbackPlan.regulatedSubmissionRecoveryPlan?.protectedSubmissionRefs.length || 0
      }
    });
    return clone(cutoverPlan);
  }

  function createPostCutoverCorrectionCase({
    sessionToken,
    companyId,
    cutoverPlanId,
    reasonCode,
    linkedSourceBatchIds = [],
    targetObjectRefs = [],
    regulatedSubmissionRefs = [],
    acceptanceReportDelta = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (!["switched", "stabilized", "closed", "rollback_in_progress", "rolled_back"].includes(cutoverPlan.status)) {
      throw error(
        409,
        "post_cutover_correction_requires_post_switch_state",
        "Post-cutover correction cases require a switched or later cutover state."
      );
    }
    const timestampValue = nowIso(clock);
    const correctionCase = {
      postCutoverCorrectionCaseId: crypto.randomUUID(),
      companyId,
      cutoverPlanId: cutoverPlan.cutoverPlanId,
      reasonCode: text(reasonCode, "post_cutover_correction_reason_required"),
      linkedSourceBatchIds: normalizeExistingImportBatchIds(companyId, linkedSourceBatchIds, state, error),
      targetObjectRefs: normalizeObjectRefs(targetObjectRefs),
      regulatedSubmissionRefs: normalizeRegulatedSubmissionRefs(regulatedSubmissionRefs),
      acceptanceReportDelta: normalizeAcceptanceReportDelta(acceptanceReportDelta),
      correctionChainRefs: [],
      status: "open",
      createdByUserId: principal.userId,
      createdAt: timestampValue,
      updatedAt: timestampValue
    };
    state.postCutoverCorrectionCases.set(correctionCase.postCutoverCorrectionCaseId, correctionCase);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.post_cutover_correction_case.created",
      entityType: "migration_post_cutover_correction_case",
      entityId: correctionCase.postCutoverCorrectionCaseId,
      explanation: `Opened post-cutover correction case ${correctionCase.reasonCode}.`
    });
    return clone(correctionCase);
  }

  function listPostCutoverCorrectionCases({ sessionToken, companyId, cutoverPlanId = null, status = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedCutoverPlanId = optionalText(cutoverPlanId);
    const resolvedStatus = status == null
      ? null
      : assertAllowed(text(status, "post_cutover_correction_case_status_required"), POST_CUTOVER_CORRECTION_CASE_STATUSES, "post_cutover_correction_case_status_invalid");
    return [...state.postCutoverCorrectionCases.values()]
      .filter((correctionCase) => correctionCase.companyId === resolvedCompanyId)
      .filter((correctionCase) => (resolvedCutoverPlanId ? correctionCase.cutoverPlanId === resolvedCutoverPlanId : true))
      .filter((correctionCase) => (resolvedStatus ? correctionCase.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function getMigrationCockpit({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const mappingSets = listMappingSets({ sessionToken, companyId: resolvedCompanyId });
    const importBatches = listImportBatches({ sessionToken, companyId: resolvedCompanyId });
    const corrections = [...state.migrationCorrections.values()]
      .filter((correction) => correction.companyId === resolvedCompanyId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
    const diffReports = listDiffReports({ sessionToken, companyId: resolvedCompanyId });
    const parallelRunResults = listParallelRunResults({ sessionToken, companyId: resolvedCompanyId });
    const cutoverPlans = listCutoverPlans({ sessionToken, companyId: resolvedCompanyId });
    const acceptanceRecords = listMigrationAcceptanceRecords({ sessionToken, companyId: resolvedCompanyId });
    const postCutoverCorrectionCases = listPostCutoverCorrectionCases({ sessionToken, companyId: resolvedCompanyId });
    const currentTimestamp = nowIso(clock);
    return {
      mappingSets,
      importBatches,
      corrections,
      diffReports,
      parallelRunResults,
      cutoverPlans,
      acceptanceRecords,
      postCutoverCorrectionCases,
      datasetSummary: buildMigrationDatasetSummary({ importBatches, diffReports, parallelRunResults, acceptanceRecords, postCutoverCorrectionCases }),
      conciergeSummary: buildMigrationConciergeSummary({ cutoverPlans }),
      cutoverBoard: buildMigrationCutoverBoard({
        companyId: resolvedCompanyId,
        cutoverPlans,
        parallelRunResults,
        acceptanceRecords,
        postCutoverCorrectionCases,
        currentTimestamp
      }),
      parallelRunBoard: buildMigrationParallelRunBoard({
        companyId: resolvedCompanyId,
        parallelRunResults,
        cutoverPlans,
        currentTimestamp
      }),
      acceptanceBoard: buildMigrationAcceptanceBoard({
        companyId: resolvedCompanyId,
        acceptanceRecords,
        cutoverPlans,
        postCutoverCorrectionCases,
        currentTimestamp
      })
    };
  }

  function createPayrollMigrationBatch({
    sessionToken,
    companyId,
    sourceSystemCode,
    migrationMode = "test",
    migrationScope = "payroll",
    effectiveCutoverDate,
    firstTargetReportingPeriod,
    mappingSetId = null,
    cutoverPlanId = null,
    requiredBalanceTypeCodes = [],
    requiredApprovalRoleCodes = ["payroll_owner"],
    sourceSnapshotRef = {},
    batchReference = null,
    note = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedSourceSystemCode = text(sourceSystemCode, "payroll_migration_source_system_required");
    const mappingSet = mappingSetId ? requireMappingSet(resolvedCompanyId, mappingSetId) : null;
    if (mappingSet && mappingSet.status !== "approved") {
      throw error(409, "mapping_set_not_approved", "Payroll migration requires an approved mapping set.");
    }
    if (mappingSet && mappingSet.sourceSystem !== resolvedSourceSystemCode) {
      throw error(409, "payroll_migration_mapping_source_mismatch", "Mapping set source system must match payroll migration source system.");
    }
    if (cutoverPlanId) {
      requireCutoverPlan(resolvedCompanyId, cutoverPlanId);
    }
    const batch = {
      payrollMigrationBatchId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      sourceSystemCode: resolvedSourceSystemCode,
      migrationMode: assertAllowed(optionalText(migrationMode) || "test", PAYROLL_MIGRATION_MODES, "payroll_migration_mode_invalid"),
      migrationScope: text(migrationScope, "payroll_migration_scope_required"),
      status: "draft",
      effectiveCutoverDate: dateOnly(effectiveCutoverDate, "payroll_migration_effective_cutover_date_required"),
      firstTargetReportingPeriod: reportingPeriod(firstTargetReportingPeriod, "payroll_migration_first_target_period_required"),
      mappingSetId: mappingSet?.mappingSetId || null,
      cutoverPlanId: cutoverPlanId ? text(cutoverPlanId, "cutover_plan_id_required") : null,
      requiredBalanceTypeCodes: normalizeUniqueCodes(requiredBalanceTypeCodes, "payroll_migration_balance_type_code_required"),
      requiredApprovalRoleCodes: normalizeRequiredRoleCodes(requiredApprovalRoleCodes),
      sourceSnapshotRef: clone(sourceSnapshotRef || {}),
      batchReference: optionalText(batchReference),
      note: optionalText(note),
      approvedForCutover: false,
      approvedForCutoverAt: null,
      approvedForCutoverByUserId: null,
      executedAt: null,
      executedByUserId: null,
      rolledBackAt: null,
      rolledBackByUserId: null,
      historyImportSummary: createEmptyPayrollHistoryImportSummary(),
      historyEvidenceBundle: null,
      validationSummary: {
        recordCount: 0,
        baselineCount: 0,
        blockingIssueCount: 0,
        warningCount: 0,
        lastValidatedAt: null,
        lastValidatedByUserId: null,
        issues: []
      },
      executionReceipt: null,
      rollbackReceipt: null,
      createdByUserId: principal.userId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.payrollMigrationBatches.set(batch.payrollMigrationBatchId, batch);
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.batch.created",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Created payroll migration batch ${batch.sourceSystemCode}/${batch.migrationMode}.`
    });
    return presentPayrollMigrationBatch(batch);
  }

  function listPayrollMigrationBatches({ sessionToken, companyId, status = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedStatus = optionalText(status);
    return [...state.payrollMigrationBatches.values()]
      .filter((batch) => batch.companyId === resolvedCompanyId)
      .filter((batch) => (resolvedStatus ? batch.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentPayrollMigrationBatchSummary);
  }

  function getPayrollMigrationBatch({ sessionToken, companyId, payrollMigrationBatchId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return presentPayrollMigrationBatch(requirePayrollMigrationBatch(companyId, payrollMigrationBatchId));
  }

  function importEmployeeMigrationRecords({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    records = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    assertPayrollMigrationMutable(batch);
    const normalizedRecords = normalizeEmployeeMigrationRecords(records, {
      companyId: batch.companyId,
      batch,
      hrPlatform,
      collectiveAgreementsPlatform
    });
    for (const record of normalizedRecords) {
      const existing = [...state.employeeMigrationRecords.values()].find(
        (candidate) =>
          candidate.companyId === batch.companyId &&
          candidate.payrollMigrationBatchId === batch.payrollMigrationBatchId &&
          candidate.employmentId === record.employmentId
      );
      const stored = {
        ...record,
        employeeMigrationRecordId: existing?.employeeMigrationRecordId || crypto.randomUUID(),
        importedByUserId: principal.userId,
        importedAt: nowIso(clock),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock)
      };
      state.employeeMigrationRecords.set(stored.employeeMigrationRecordId, stored);
    }
    batch.status = "imported";
    batch.historyImportSummary = buildPayrollHistoryImportSummary(batch);
    batch.historyEvidenceBundle = syncPayrollMigrationHistoryEvidenceBundle({
      batch,
      actorId: principal.userId,
      correlationId
    });
    batch.updatedAt = nowIso(clock);
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.records.imported",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Imported ${normalizedRecords.length} payroll migration employee record(s).`
    });
    return presentPayrollMigrationBatch(batch);
  }

  function registerBalanceBaselines({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    baselines = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    assertPayrollMigrationMutable(batch);
    const normalizedBaselines = normalizeBalanceBaselines(baselines, {
      companyId: batch.companyId,
      batch,
      balancesPlatform
    });
    for (const baseline of normalizedBaselines) {
      const existing = [...state.balanceBaselines.values()].find(
        (candidate) =>
          candidate.companyId === batch.companyId &&
          candidate.payrollMigrationBatchId === batch.payrollMigrationBatchId &&
          candidate.balanceTypeCode === baseline.balanceTypeCode &&
          candidate.employeeId === baseline.employeeId &&
          candidate.employmentId === baseline.employmentId
      );
      const stored = {
        ...baseline,
        balanceBaselineId: existing?.balanceBaselineId || crypto.randomUUID(),
        registeredByUserId: principal.userId,
        registeredAt: nowIso(clock),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock)
      };
      state.balanceBaselines.set(stored.balanceBaselineId, stored);
    }
    batch.status = batch.status === "draft" ? "imported" : batch.status;
    batch.updatedAt = nowIso(clock);
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.balance_baselines.registered",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Registered ${normalizedBaselines.length} balance baseline(s).`
    });
    return presentPayrollMigrationBatch(batch);
  }

  function validatePayrollMigrationBatch({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    batch.historyImportSummary = buildPayrollHistoryImportSummary(batch);
    batch.historyEvidenceBundle = syncPayrollMigrationHistoryEvidenceBundle({
      batch,
      actorId: principal.userId,
      correlationId
    });
    const validationSummary = computePayrollMigrationValidationSummary({
      batch,
      balancesPlatform
    });
    batch.validationSummary = {
      ...validationSummary,
      lastValidatedAt: nowIso(clock),
      lastValidatedByUserId: principal.userId
    };
    batch.status = validationSummary.blockingIssueCount > 0 ? "imported" : determinePayrollMigrationReadyState(batch);
    batch.updatedAt = nowIso(clock);
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.batch.validated",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Validated payroll migration batch ${batch.payrollMigrationBatchId}.`
    });
    return presentPayrollMigrationBatch(batch);
  }

  function calculatePayrollMigrationDiff({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    sourceTotals = {},
    targetTotals = {},
    differenceItems = [],
    toleranceSek = 0,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    assertPayrollMigrationMutable(batch);
    const items = buildPayrollMigrationDifferenceItems({
      sourceTotals,
      targetTotals,
      differenceItems,
      toleranceSek
    });
    for (const item of items) {
      state.payrollMigrationDiffs.set(item.payrollMigrationDiffId, {
        ...item,
        companyId: batch.companyId,
        payrollMigrationBatchId: batch.payrollMigrationBatchId,
        createdByUserId: principal.userId,
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      });
    }
    batch.status = determinePayrollMigrationReadyState(batch);
    batch.updatedAt = nowIso(clock);
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.diff.generated",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Generated ${items.length} payroll migration diff item(s).`
    });
    return {
      payrollMigrationBatchId: batch.payrollMigrationBatchId,
      items: listStoredPayrollMigrationDiffs(batch).map(clone),
      summary: summarizePayrollMigrationDiffsForBatch(batch)
    };
  }

  function listPayrollMigrationDiffs({ sessionToken, companyId, payrollMigrationBatchId, status = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    const resolvedStatus = optionalText(status);
    return listStoredPayrollMigrationDiffs(batch)
      .filter((diff) => (resolvedStatus ? diff.status === resolvedStatus : true))
      .map(clone);
  }

  function decidePayrollMigrationDiff({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    payrollMigrationDiffId,
    decision,
    explanation,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    const diff = requirePayrollMigrationDiff(batch.companyId, batch.payrollMigrationBatchId, payrollMigrationDiffId);
    diff.status = assertAllowed(text(decision, "payroll_migration_diff_decision_required"), PAYROLL_MIGRATION_DIFF_STATUSES, "payroll_migration_diff_status_invalid");
    diff.explanation = text(explanation, "payroll_migration_diff_explanation_required");
    diff.decidedByUserId = principal.userId;
    diff.decidedAt = nowIso(clock);
    diff.updatedAt = diff.decidedAt;
    batch.status = determinePayrollMigrationReadyState(batch);
    batch.updatedAt = diff.updatedAt;
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.diff.decided",
      entityType: "payroll_migration_diff",
      entityId: diff.payrollMigrationDiffId,
      explanation: `Recorded payroll migration diff decision ${diff.status}.`
    });
    return clone(diff);
  }

  function approvePayrollMigrationBatch({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    approvalRoleCode,
    note = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    const resolvedApprovalRoleCode = normalizeCode(approvalRoleCode, "payroll_migration_approval_role_required");
    if (!batch.requiredApprovalRoleCodes.includes(resolvedApprovalRoleCode)) {
      throw error(409, "payroll_migration_approval_role_not_required", "Approval role is not part of the required cutover chain.");
    }
    const existing = [...state.payrollMigrationApprovals.values()].find(
      (candidate) =>
        candidate.companyId === batch.companyId &&
        candidate.payrollMigrationBatchId === batch.payrollMigrationBatchId &&
        candidate.approvalRoleCode === resolvedApprovalRoleCode
    );
    const approval = {
      payrollMigrationApprovalId: existing?.payrollMigrationApprovalId || crypto.randomUUID(),
      companyId: batch.companyId,
      payrollMigrationBatchId: batch.payrollMigrationBatchId,
      approvalRoleCode: resolvedApprovalRoleCode,
      approvedByUserId: principal.userId,
      approvedAt: nowIso(clock),
      note: optionalText(note),
      createdAt: existing?.createdAt || nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.payrollMigrationApprovals.set(approval.payrollMigrationApprovalId, approval);
    const readyForCutover = isPayrollMigrationCutoverReady(batch);
    batch.approvedForCutover = readyForCutover;
    batch.approvedForCutoverAt = readyForCutover ? approval.approvedAt : null;
    batch.approvedForCutoverByUserId = readyForCutover ? principal.userId : null;
    batch.status = readyForCutover ? "approved_for_cutover" : determinePayrollMigrationReadyState(batch);
    batch.updatedAt = approval.updatedAt;
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.batch.approved",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Recorded payroll migration approval ${approval.approvalRoleCode}.`
    });
    return presentPayrollMigrationBatch(batch);
  }

  function executePayrollMigrationBatch({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    if (!isPayrollMigrationCutoverReady(batch)) {
      throw error(409, "payroll_migration_not_ready_for_cutover", "Payroll migration cutover requires green validation, resolved diffs and complete approvals.");
    }
    if (!balancesPlatform) {
      throw error(500, "balances_platform_required", "Balances platform is required to execute payroll migration cutover.");
    }
    const realized = [];
    for (const baseline of listStoredBalanceBaselines(batch)) {
      if (baseline.explicitZeroConfirmation === true && Number(baseline.openingQuantity || 0) === 0) {
        continue;
      }
      const existingAccount =
        balancesPlatform
          .listBalanceAccounts({
            companyId: batch.companyId,
            balanceTypeCode: baseline.balanceTypeCode,
            ownerTypeCode: baseline.ownerTypeCode,
            employeeId: baseline.employeeId,
            employmentId: baseline.employmentId,
            status: "open"
          })
          .find(Boolean) || null;
      const account =
        existingAccount ||
        balancesPlatform.openBalanceAccount({
          companyId: batch.companyId,
          balanceTypeCode: baseline.balanceTypeCode,
          ownerTypeCode: baseline.ownerTypeCode,
          employeeId: baseline.employeeId,
          employmentId: baseline.employmentId,
          openedOn: baseline.effectiveDate,
          externalReference: batch.batchReference || batch.payrollMigrationBatchId,
          actorId: principal.userId
        });
      const transaction = balancesPlatform.recordBalanceTransaction({
        companyId: batch.companyId,
        balanceAccountId: account.balanceAccountId,
        effectiveDate: baseline.effectiveDate,
        transactionTypeCode: "baseline",
        quantityDelta: baseline.openingQuantity,
        sourceDomainCode: "PAYROLL_MIGRATION",
        sourceObjectType: "payroll_migration_batch",
        sourceObjectId: batch.payrollMigrationBatchId,
        sourceReference: baseline.balanceBaselineId,
        idempotencyKey: `payroll-migration-baseline:${batch.payrollMigrationBatchId}:${baseline.balanceBaselineId}`,
        explanation: baseline.explanation || "Payroll migration opening balance baseline.",
        actorId: principal.userId
      });
      realized.push({
        balanceBaselineId: baseline.balanceBaselineId,
        balanceAccountId: account.balanceAccountId,
        balanceTransactionId: transaction.balanceTransactionId,
        quantityDelta: baseline.openingQuantity
      });
    }
    batch.status = "cutover_executed";
    batch.approvedForCutover = true;
    batch.executedAt = nowIso(clock);
    batch.executedByUserId = principal.userId;
    batch.updatedAt = batch.executedAt;
    batch.executionReceipt = {
      realizedBalanceTransactions: realized,
      historyImportSummary: clone(batch.historyImportSummary || createEmptyPayrollHistoryImportSummary()),
      historyEvidenceBundleId: batch.historyEvidenceBundle?.historyEvidenceBundleId || null,
      executedAt: batch.executedAt,
      executedByUserId: principal.userId
    };
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.batch.executed",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Executed payroll migration cutover with ${realized.length} realized balance baseline(s).`
    });
    return presentPayrollMigrationBatch(batch);
  }

  function rollbackPayrollMigrationBatch({
    sessionToken,
    companyId,
    payrollMigrationBatchId,
    reasonCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    if (batch.status !== "cutover_executed") {
      throw error(409, "payroll_migration_cutover_not_executed", "Payroll migration rollback requires an executed cutover.");
    }
    if (!balancesPlatform) {
      throw error(500, "balances_platform_required", "Balances platform is required to roll back payroll migration cutover.");
    }
    const rollbackTransactions = [];
    for (const realized of Array.isArray(batch.executionReceipt?.realizedBalanceTransactions) ? batch.executionReceipt.realizedBalanceTransactions : []) {
      const transaction = balancesPlatform.recordBalanceTransaction({
        companyId: batch.companyId,
        balanceAccountId: realized.balanceAccountId,
        effectiveDate: dateOnly(batch.effectiveCutoverDate, "payroll_migration_effective_cutover_date_required"),
        transactionTypeCode: "correction",
        quantityDelta: -Number(realized.quantityDelta || 0),
        sourceDomainCode: "PAYROLL_MIGRATION",
        sourceObjectType: "payroll_migration_rollback",
        sourceObjectId: batch.payrollMigrationBatchId,
        sourceReference: text(reasonCode, "payroll_migration_rollback_reason_required"),
        idempotencyKey: `payroll-migration-rollback:${batch.payrollMigrationBatchId}:${realized.balanceBaselineId}`,
        explanation: `Rollback of payroll migration batch ${batch.payrollMigrationBatchId}.`,
        actorId: principal.userId
      });
      rollbackTransactions.push({
        balanceBaselineId: realized.balanceBaselineId,
        balanceTransactionId: transaction.balanceTransactionId
      });
    }
    batch.status = "rolled_back";
    batch.rolledBackAt = nowIso(clock);
    batch.rolledBackByUserId = principal.userId;
    batch.updatedAt = batch.rolledBackAt;
    batch.rollbackReceipt = {
      reasonCode: text(reasonCode, "payroll_migration_rollback_reason_required"),
      rollbackTransactions,
      rolledBackAt: batch.rolledBackAt,
      rolledBackByUserId: principal.userId
    };
    audit({
      companyId: batch.companyId,
      actorId: principal.userId,
      correlationId,
      action: "payroll_migration.batch.rolled_back",
      entityType: "payroll_migration_batch",
      entityId: batch.payrollMigrationBatchId,
      explanation: `Rolled back payroll migration batch ${batch.payrollMigrationBatchId}.`
    });
    return presentPayrollMigrationBatch(batch);
  }

  function getEmployeeMigrationSummary({ sessionToken, companyId, payrollMigrationBatchId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    return listStoredEmployeeMigrationRecords(batch).map((record) => ({
      ...clone(record),
      baselineCoverage: summarizeEmployeeBaselineCoverage(batch, record),
      historyCoverage: summarizeEmployeeHistoryCoverage(record)
    }));
  }

  function getOpenPayrollMigrationDiffs({ sessionToken, companyId, payrollMigrationBatchId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const batch = requirePayrollMigrationBatch(companyId, payrollMigrationBatchId);
    return listStoredPayrollMigrationDiffs(batch)
      .filter((diff) => ["open", "explained", "blocking"].includes(diff.status))
      .map(clone);
  }

  function requireMappingSet(companyId, mappingSetId) {
    const mappingSet = state.mappingSets.get(text(mappingSetId, "mapping_set_id_required"));
    if (!mappingSet || mappingSet.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "mapping_set_not_found", "Mapping set was not found.");
    }
    return mappingSet;
  }

  function requireImportBatch(companyId, importBatchId) {
    const batch = state.importBatches.get(text(importBatchId, "import_batch_id_required"));
    if (!batch || batch.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "import_batch_not_found", "Import batch was not found.");
    }
    return batch;
  }

  function requireDiffReport(companyId, diffReportId) {
    const diffReport = state.diffReports.get(text(diffReportId, "diff_report_id_required"));
    if (!diffReport || diffReport.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "diff_report_not_found", "Diff report was not found.");
    }
    return diffReport;
  }

  function requireCutoverPlan(companyId, cutoverPlanId) {
    const cutoverPlan = state.cutoverPlans.get(text(cutoverPlanId, "cutover_plan_id_required"));
    if (!cutoverPlan || cutoverPlan.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "cutover_plan_not_found", "Cutover plan was not found.");
    }
    return cutoverPlan;
  }

  function requirePayrollMigrationBatch(companyId, payrollMigrationBatchId) {
    const batch = state.payrollMigrationBatches.get(text(payrollMigrationBatchId, "payroll_migration_batch_id_required"));
    if (!batch || batch.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "payroll_migration_batch_not_found", "Payroll migration batch was not found.");
    }
    return batch;
  }

  function requirePayrollMigrationDiff(companyId, payrollMigrationBatchId, payrollMigrationDiffId) {
    const diff = state.payrollMigrationDiffs.get(text(payrollMigrationDiffId, "payroll_migration_diff_id_required"));
    if (!diff || diff.companyId !== text(companyId, "company_id_required") || diff.payrollMigrationBatchId !== text(payrollMigrationBatchId, "payroll_migration_batch_id_required")) {
      throw error(404, "payroll_migration_diff_not_found", "Payroll migration diff was not found.");
    }
    return diff;
  }

  function assertPayrollMigrationMutable(batch) {
    if (["cutover_executed", "rolled_back"].includes(batch.status)) {
      throw error(409, "payroll_migration_batch_locked", "Payroll migration batch is locked after execution or rollback.");
    }
  }

  function listStoredEmployeeMigrationRecords(batch) {
    return [...state.employeeMigrationRecords.values()]
      .filter((record) => record.companyId === batch.companyId && record.payrollMigrationBatchId === batch.payrollMigrationBatchId)
      .sort((left, right) => left.employmentId.localeCompare(right.employmentId));
  }

  function listStoredBalanceBaselines(batch) {
    return [...state.balanceBaselines.values()]
      .filter((baseline) => baseline.companyId === batch.companyId && baseline.payrollMigrationBatchId === batch.payrollMigrationBatchId)
      .sort((left, right) => left.balanceTypeCode.localeCompare(right.balanceTypeCode) || String(left.employmentId || left.employeeId).localeCompare(String(right.employmentId || right.employeeId)));
  }

  function listStoredPayrollMigrationDiffs(batch) {
    return [...state.payrollMigrationDiffs.values()]
      .filter((diff) => diff.companyId === batch.companyId && diff.payrollMigrationBatchId === batch.payrollMigrationBatchId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function listStoredPayrollMigrationApprovals(batch) {
    return [...state.payrollMigrationApprovals.values()]
      .filter((approval) => approval.companyId === batch.companyId && approval.payrollMigrationBatchId === batch.payrollMigrationBatchId)
      .sort((left, right) => left.approvedAt.localeCompare(right.approvedAt));
  }

  function presentPayrollMigrationBatchSummary(batch) {
    return {
      ...clone(batch),
      employeeRecordCount: listStoredEmployeeMigrationRecords(batch).length,
      balanceBaselineCount: listStoredBalanceBaselines(batch).length,
      diffSummary: summarizePayrollMigrationDiffsForBatch(batch),
      approvalSummary: summarizePayrollMigrationApprovalsForBatch(batch),
      validationSummary: clone(batch.validationSummary || {})
    };
  }

  function presentPayrollMigrationBatch(batch) {
    return {
      ...presentPayrollMigrationBatchSummary(batch),
      employeeRecords: listStoredEmployeeMigrationRecords(batch).map((record) => ({
        ...clone(record),
        baselineCoverage: summarizeEmployeeBaselineCoverage(batch, record),
        historyCoverage: summarizeEmployeeHistoryCoverage(record)
      })),
      balanceBaselines: listStoredBalanceBaselines(batch).map(clone),
      diffs: listStoredPayrollMigrationDiffs(batch).map(clone),
      approvals: listStoredPayrollMigrationApprovals(batch).map(clone)
    };
  }

  function summarizePayrollMigrationDiffsForBatch(batch) {
    return listStoredPayrollMigrationDiffs(batch).reduce(
      (summary, diff) => {
        summary.totalCount += 1;
        summary[diff.status] = Number(summary[diff.status] || 0) + 1;
        summary.blockingCount += diff.status === "blocking" ? 1 : 0;
        return summary;
      },
      { totalCount: 0, blockingCount: 0 }
    );
  }

  function summarizePayrollMigrationApprovalsForBatch(batch) {
    const approvals = listStoredPayrollMigrationApprovals(batch);
    return {
      requiredRoleCodes: clone(batch.requiredApprovalRoleCodes || []),
      approvedRoleCodes: approvals.map((approval) => approval.approvalRoleCode),
      approvedCount: approvals.length,
      requiredCount: Array.isArray(batch.requiredApprovalRoleCodes) ? batch.requiredApprovalRoleCodes.length : 0
    };
  }

  function summarizeEmployeeBaselineCoverage(batch, record) {
    const baselines = listStoredBalanceBaselines(batch).filter(
      (baseline) =>
        baseline.employeeId === record.employeeId &&
        baseline.employmentId === record.employmentId
    );
    const requiredCodes = Array.isArray(batch.requiredBalanceTypeCodes) ? batch.requiredBalanceTypeCodes : [];
    const coveredCodes = baselines.map((baseline) => baseline.balanceTypeCode);
    return {
      requiredBalanceTypeCodes: clone(requiredCodes),
      coveredBalanceTypeCodes: [...new Set(coveredCodes)].sort(),
      missingBalanceTypeCodes: requiredCodes.filter((code) => !coveredCodes.includes(code))
    };
  }

  function buildPayrollHistoryImportSummary(batch) {
    const records = listStoredEmployeeMigrationRecords(batch);
    return records.reduce(
      (summary, record) => {
        const historyCoverage = summarizeEmployeeHistoryCoverage(record);
        summary.employeeCount += 1;
        summary.employmentHistorySegmentCount += historyCoverage.employmentHistorySegmentCount;
        summary.benefitHistoryItemCount += historyCoverage.benefitHistoryItemCount;
        summary.travelHistoryItemCount += historyCoverage.travelHistoryItemCount;
        summary.agiSubmissionReferenceCount += historyCoverage.agiSubmissionReferenceCount;
        summary.evidenceMappingCount += historyCoverage.evidenceMappingCount;
        summary.employeesMissingEmployeeMasterCount += historyCoverage.employeeMasterPresent ? 0 : 1;
        summary.employeesMissingEmploymentHistoryCount += historyCoverage.employmentHistorySegmentCount > 0 ? 0 : 1;
        summary.employeesMissingEvidenceMappingCount += historyCoverage.missingRequiredEvidenceAreas.length > 0 ? 1 : 0;
        summary.missingRequiredEvidenceAreaCount += historyCoverage.missingRequiredEvidenceAreas.length;
        return summary;
      },
      createEmptyPayrollHistoryImportSummary()
    );
  }

  function summarizeEmployeeHistoryCoverage(record) {
    const evidenceMappings = Array.isArray(record.evidenceMappings) ? record.evidenceMappings : [];
    const coveredEvidenceAreas = [...new Set(evidenceMappings.map((mapping) => mapping.targetAreaCode))].sort();
    const requiredEvidenceAreas = resolveRequiredEvidenceAreas(record);
    return {
      employeeMasterPresent: record.employeeMasterSnapshot != null,
      employmentHistorySegmentCount: Array.isArray(record.employmentHistory) ? record.employmentHistory.length : 0,
      benefitHistoryItemCount: Array.isArray(record.benefitHistory) ? record.benefitHistory.length : 0,
      travelHistoryItemCount: Array.isArray(record.travelHistory) ? record.travelHistory.length : 0,
      agiSubmissionReferenceCount: Array.isArray(record.agiCarryForwardBasis?.submissionReferences)
        ? record.agiCarryForwardBasis.submissionReferences.length
        : 0,
      evidenceMappingCount: evidenceMappings.length,
      requiredEvidenceAreas,
      coveredEvidenceAreas,
      missingRequiredEvidenceAreas: requiredEvidenceAreas.filter((areaCode) => !coveredEvidenceAreas.includes(areaCode))
    };
  }

  function computePayrollMigrationValidationSummary({ batch, balancesPlatform }) {
    const issues = [];
    const records = listStoredEmployeeMigrationRecords(batch);
    const baselines = listStoredBalanceBaselines(batch);
    if (records.length === 0) {
      issues.push({
        code: "payroll_migration_records_missing",
        severity: "blocking",
        message: "At least one employee migration record is required."
      });
    }
    if (batch.mappingSetId) {
      const mappingSet = requireMappingSet(batch.companyId, batch.mappingSetId);
      if (mappingSet.status !== "approved") {
        issues.push({
          code: "payroll_migration_mapping_set_not_approved",
          severity: "blocking",
          message: "Payroll migration mapping set must be approved."
        });
      }
    }
    for (const record of records) {
      for (const validationError of Array.isArray(record.validationErrors) ? record.validationErrors : []) {
        issues.push({
          code: validationError.code,
          severity: validationError.severity || "blocking",
          message: `${record.employmentId}: ${validationError.message}`
        });
      }
      const missingBalanceCodes = summarizeEmployeeBaselineCoverage(batch, record).missingBalanceTypeCodes;
      for (const missingBalanceCode of missingBalanceCodes) {
        issues.push({
          code: "payroll_migration_balance_missing",
          severity: "blocking",
          message: `${record.employmentId}: Missing balance baseline or zero confirmation for ${missingBalanceCode}.`
        });
      }
    }
    if (balancesPlatform) {
      for (const requiredBalanceTypeCode of Array.isArray(batch.requiredBalanceTypeCodes) ? batch.requiredBalanceTypeCodes : []) {
        balancesPlatform.getBalanceType({
          companyId: batch.companyId,
          balanceTypeCode: requiredBalanceTypeCode
        });
      }
    }
    return {
      recordCount: records.length,
      baselineCount: baselines.length,
      blockingIssueCount: issues.filter((issue) => issue.severity === "blocking").length,
      warningCount: issues.filter((issue) => issue.severity !== "blocking").length,
      issues
    };
  }

  function determinePayrollMigrationReadyState(batch) {
    const blockingIssues = Number(batch.validationSummary?.blockingIssueCount || 0);
    if (blockingIssues > 0) {
      return "imported";
    }
    if (listStoredPayrollMigrationDiffs(batch).some((diff) => ["open", "explained", "blocking"].includes(diff.status))) {
      return "diff_open";
    }
    if (batch.approvedForCutover === true && hasAllRequiredPayrollApprovals(batch)) {
      return "approved_for_cutover";
    }
    return "validated";
  }

  function hasAllRequiredPayrollApprovals(batch) {
    const approvals = listStoredPayrollMigrationApprovals(batch);
    const approvedRoles = new Set(approvals.map((approval) => approval.approvalRoleCode));
    return (Array.isArray(batch.requiredApprovalRoleCodes) ? batch.requiredApprovalRoleCodes : []).every((roleCode) => approvedRoles.has(roleCode));
  }

  function isPayrollMigrationCutoverReady(batch) {
    return Number(batch.validationSummary?.blockingIssueCount || 0) === 0
      && hasAllRequiredPayrollApprovals(batch)
      && !listStoredPayrollMigrationDiffs(batch).some((diff) => ["open", "explained", "blocking"].includes(diff.status));
  }
}

function normalizeMappings(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    sourceField: text(value?.sourceField, "mapping_source_field_required"),
    targetField: text(value?.targetField, "mapping_target_field_required"),
    transformCode: optionalText(value?.transformCode)
  }));
}

function createEmptyPayrollHistoryImportSummary() {
  return {
    employeeCount: 0,
    employmentHistorySegmentCount: 0,
    benefitHistoryItemCount: 0,
    travelHistoryItemCount: 0,
    agiSubmissionReferenceCount: 0,
    evidenceMappingCount: 0,
    employeesMissingEmployeeMasterCount: 0,
    employeesMissingEmploymentHistoryCount: 0,
    employeesMissingEvidenceMappingCount: 0,
    missingRequiredEvidenceAreaCount: 0
  };
}

function resolveRequiredEvidenceAreas(record) {
  return [
    "EMPLOYEE_MASTER",
    "EMPLOYMENT_HISTORY",
    "YTD_BASIS",
    "AGI_HISTORY",
    ...(Array.isArray(record?.benefitHistory) && record.benefitHistory.length > 0 ? ["BENEFIT_HISTORY"] : []),
    ...(Array.isArray(record?.travelHistory) && record.travelHistory.length > 0 ? ["TRAVEL_HISTORY"] : [])
  ];
}

function collectPayrollHistoryRequiredEvidenceAreas(records) {
  return [...new Set((Array.isArray(records) ? records : []).flatMap((record) => resolveRequiredEvidenceAreas(record)))].sort();
}

function dedupeObjectList(values, makeKey) {
  const map = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    const key = makeKey(value);
    if (!map.has(key)) {
      map.set(key, clone(value));
    }
  }
  return [...map.values()];
}

function normalizePayrollMigrationYtdBasis(value, validationErrors) {
  const basis = value && typeof value === "object" ? value : {};
  let grossCompensationSek = null;
  let preliminaryTaxSek = null;
  let employerContributionBasisSek = null;
  let reportedThroughPeriod = null;
  try {
    grossCompensationSek = normalizeNumber(basis.grossCompensationSek, "payroll_migration_ytd_gross_compensation_required");
    preliminaryTaxSek = normalizeNumber(basis.preliminaryTaxSek, "payroll_migration_ytd_preliminary_tax_required");
    employerContributionBasisSek = normalizeNumber(
      basis.employerContributionBasisSek,
      "payroll_migration_ytd_employer_contribution_basis_required"
    );
    reportedThroughPeriod = reportingPeriod(
      basis.reportedThroughPeriod,
      "payroll_migration_ytd_reported_through_period_required"
    );
  } catch {
    validationErrors.push({
      code: "payroll_migration_ytd_missing_fields",
      severity: "blocking",
      message: "YTD basis requires gross compensation, preliminary tax, employer contribution basis and reportedThroughPeriod."
    });
  }
  return {
    grossCompensationSek,
    preliminaryTaxSek,
    employerContributionBasisSek,
    taxableBenefitsSek: basis.taxableBenefitsSek == null ? 0 : normalizeNumber(basis.taxableBenefitsSek, "payroll_migration_ytd_taxable_benefits_invalid"),
    pensionBasisSek: basis.pensionBasisSek == null ? null : normalizeNumber(basis.pensionBasisSek, "payroll_migration_ytd_pension_basis_invalid"),
    reportedThroughPeriod
  };
}

function normalizeEmployeeMasterSnapshot(value, validationErrors) {
  if (!value || typeof value !== "object") {
    validationErrors.push({
      code: "payroll_migration_employee_master_missing",
      severity: "blocking",
      message: "Employee master snapshot is required for payroll history import."
    });
    return null;
  }
  let sourceEmployeeNumber = null;
  let displayName = null;
  try {
    sourceEmployeeNumber = text(
      value.sourceEmployeeNumber ?? value.employeeNumber ?? value.employeeNo,
      "payroll_migration_employee_master_number_required"
    );
    displayName = text(
      value.displayName ?? [value.givenName, value.familyName].filter(Boolean).join(" ").trim(),
      "payroll_migration_employee_master_name_required"
    );
  } catch {
    validationErrors.push({
      code: "payroll_migration_employee_master_incomplete",
      severity: "blocking",
      message: "Employee master snapshot requires sourceEmployeeNumber and displayName."
    });
  }
  return {
    sourceEmployeeNumber,
    displayName,
    givenName: optionalText(value.givenName),
    familyName: optionalText(value.familyName),
    taxProfileCode: optionalText(value.taxProfileCode),
    employeeStatusCode: optionalText(value.employeeStatusCode),
    countryCode: normalizeOptionalCountryCode(value.countryCode, "payroll_migration_employee_master_country_invalid")
  };
}

function normalizeEmploymentHistory(values, validationErrors) {
  if (!Array.isArray(values) || values.length === 0) {
    validationErrors.push({
      code: "payroll_migration_employment_history_missing",
      severity: "blocking",
      message: "Employment history with at least one segment is required."
    });
    return [];
  }
  const segments = values.map((value) => ({
    startDate: dateOnly(value?.startDate, "payroll_migration_employment_history_start_date_required"),
    endDate: value?.endDate == null ? null : dateOnly(value.endDate, "payroll_migration_employment_history_end_date_invalid"),
    employmentTypeCode: normalizeCode(value?.employmentTypeCode, "payroll_migration_employment_type_required"),
    jobTitle: text(value?.jobTitle, "payroll_migration_job_title_required"),
    payModelCode: normalizeCode(value?.payModelCode, "payroll_migration_pay_model_required"),
    salaryBasisCode: optionalText(value?.salaryBasisCode),
    organizationPlacementRef: optionalText(value?.organizationPlacementRef),
    costCenterCode: optionalText(value?.costCenterCode),
    salaryAmountSek: value?.salaryAmountSek == null ? null : normalizeNumber(value.salaryAmountSek, "payroll_migration_salary_amount_invalid")
  })).sort((left, right) => left.startDate.localeCompare(right.startDate));
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.endDate && segment.endDate < segment.startDate) {
      validationErrors.push({
        code: "payroll_migration_employment_history_dates_invalid",
        severity: "blocking",
        message: "Employment history endDate cannot be earlier than startDate."
      });
    }
    if (index > 0) {
      const previousSegment = segments[index - 1];
      if (!previousSegment.endDate || previousSegment.endDate >= segment.startDate) {
        validationErrors.push({
          code: "payroll_migration_employment_history_overlap",
          severity: "blocking",
          message: "Employment history segments cannot overlap."
        });
        break;
      }
    }
  }
  return segments;
}

function normalizeBenefitHistory(values, validationErrors) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    benefitTypeCode: normalizeCode(value?.benefitTypeCode, "payroll_migration_benefit_type_required"),
    reportedPeriod: reportingPeriod(value?.reportedPeriod, "payroll_migration_benefit_reported_period_required"),
    taxableAmountSek: normalizeNumber(value?.taxableAmountSek ?? 0, "payroll_migration_benefit_taxable_amount_invalid"),
    netDeductionSek: value?.netDeductionSek == null ? 0 : normalizeNumber(value.netDeductionSek, "payroll_migration_benefit_net_deduction_invalid"),
    sourceRecordRef: text(value?.sourceRecordRef, "payroll_migration_benefit_source_record_ref_required"),
    note: optionalText(value?.note)
  }));
}

function normalizeTravelHistory(values, validationErrors) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    travelTypeCode: normalizeCode(value?.travelTypeCode, "payroll_migration_travel_type_required"),
    reportedPeriod: reportingPeriod(value?.reportedPeriod, "payroll_migration_travel_reported_period_required"),
    taxFreeAmountSek: normalizeNumber(value?.taxFreeAmountSek ?? 0, "payroll_migration_travel_tax_free_amount_invalid"),
    taxableAmountSek: normalizeNumber(value?.taxableAmountSek ?? 0, "payroll_migration_travel_taxable_amount_invalid"),
    mileageKm: value?.mileageKm == null ? null : normalizeNumber(value.mileageKm, "payroll_migration_travel_mileage_invalid"),
    sourceRecordRef: text(value?.sourceRecordRef, "payroll_migration_travel_source_record_ref_required"),
    note: optionalText(value?.note)
  }));
}

function normalizePayrollMigrationEvidenceMappings(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    targetAreaCode: assertAllowed(
      normalizeCode(value?.targetAreaCode, "payroll_migration_evidence_target_area_required"),
      ["EMPLOYEE_MASTER", "EMPLOYMENT_HISTORY", "YTD_BASIS", "AGI_HISTORY", "BENEFIT_HISTORY", "TRAVEL_HISTORY"],
      "payroll_migration_evidence_target_area_invalid"
    ),
    sourceRecordRef: text(value?.sourceRecordRef, "payroll_migration_evidence_source_record_ref_required"),
    artifactType: text(value?.artifactType, "payroll_migration_evidence_artifact_type_required"),
    artifactRef: text(value?.artifactRef, "payroll_migration_evidence_artifact_ref_required"),
    checksum: optionalText(value?.checksum),
    note: optionalText(value?.note)
  }));
}

function resolvePayrollMigrationAgreementReference({
  companyId,
  agreementVersionId,
  agreementCatalogEntryId,
  collectiveAgreementsPlatform,
  validationErrors
}) {
  const resolvedAgreementVersionId = optionalText(agreementVersionId);
  const resolvedAgreementCatalogEntryId = optionalText(agreementCatalogEntryId);
  let resolvedVersionId = resolvedAgreementVersionId;
  if (resolvedAgreementCatalogEntryId) {
    const matchingCatalogEntry = collectiveAgreementsPlatform?.listAgreementCatalogEntries
      ? collectiveAgreementsPlatform
          .listAgreementCatalogEntries({ companyId })
          .find((candidate) => candidate.agreementCatalogEntryId === resolvedAgreementCatalogEntryId)
      : null;
    if (!matchingCatalogEntry) {
      validationErrors.push({
        code: "payroll_migration_catalog_entry_not_found",
        severity: "blocking",
        message: "Published agreement catalog entry is required when referenced by payroll history import."
      });
    } else {
      resolvedVersionId = matchingCatalogEntry.agreementVersionId;
      if (resolvedAgreementVersionId && matchingCatalogEntry.agreementVersionId !== resolvedAgreementVersionId) {
        validationErrors.push({
          code: "payroll_migration_agreement_reference_mismatch",
          severity: "blocking",
          message: "Agreement catalog entry and agreement version must point to the same published version."
        });
      }
    }
  } else if (resolvedVersionId && collectiveAgreementsPlatform?.getAgreementVersion) {
    collectiveAgreementsPlatform.getAgreementVersion({ companyId, agreementVersionId: resolvedVersionId });
  }
  return {
    agreementVersionId: resolvedVersionId,
    agreementCatalogEntryId: resolvedAgreementCatalogEntryId
  };
}

function normalizeAgiCarryForwardBasis(value, validationErrors) {
  const basis = value && typeof value === "object" ? value : {};
  let reportedThroughPeriod = null;
  try {
    reportedThroughPeriod = reportingPeriod(
      basis.reportedThroughPeriod,
      "payroll_migration_agi_reported_through_period_required"
    );
  } catch {
    validationErrors.push({
      code: "payroll_migration_agi_basis_missing",
      severity: "blocking",
      message: "AGI carry-forward basis requires reportedThroughPeriod."
    });
  }
  return {
    reportedThroughPeriod,
    lastSubmittedAt: basis.lastSubmittedAt ? timestamp(basis.lastSubmittedAt, "payroll_migration_agi_last_submitted_invalid") : null,
    submissionReferences: Array.isArray(basis.submissionReferences)
      ? basis.submissionReferences.map((candidate) => text(candidate, "payroll_migration_agi_submission_reference_required"))
      : []
  };
}

function normalizeEmployeeMigrationRecords(records, { companyId, batch, hrPlatform, collectiveAgreementsPlatform }) {
  if (!Array.isArray(records) || records.length === 0) {
    throw createValidationError("payroll_migration_records_required", "At least one payroll migration record is required.");
  }
  return records.map((value) => {
    const employeeId = text(value?.employeeId, "payroll_migration_employee_id_required");
    const employmentId = text(value?.employmentId, "payroll_migration_employment_id_required");
    if (hrPlatform?.getEmployee) {
      hrPlatform.getEmployee({ companyId, employeeId });
    }
    if (hrPlatform?.getEmployment) {
      hrPlatform.getEmployment({ companyId, employeeId, employmentId });
    }
    const validationErrors = [];
    const employeeMasterSnapshot = normalizeEmployeeMasterSnapshot(
      value?.employeeMasterSnapshot ?? value?.employeeMaster ?? null,
      validationErrors
    );
    const employmentHistory = normalizeEmploymentHistory(value?.employmentHistory, validationErrors);
    const benefitHistory = normalizeBenefitHistory(value?.benefitHistory, validationErrors);
    const travelHistory = normalizeTravelHistory(value?.travelHistory, validationErrors);
    const evidenceMappings = normalizePayrollMigrationEvidenceMappings(value?.evidenceMappings);
    const agreementReference = resolvePayrollMigrationAgreementReference({
      companyId,
      agreementVersionId: value?.agreementVersionId,
      agreementCatalogEntryId: value?.agreementCatalogEntryId,
      collectiveAgreementsPlatform,
      validationErrors
    });
    const ytdBasis = normalizePayrollMigrationYtdBasis(value?.ytdBasis, validationErrors);
    const agiCarryForwardBasis = normalizeAgiCarryForwardBasis(value?.agiCarryForwardBasis, validationErrors);
    const requiredEvidenceAreas = resolveRequiredEvidenceAreas({
      benefitHistory,
      travelHistory
    });
    const coveredEvidenceAreas = [...new Set(evidenceMappings.map((mapping) => mapping.targetAreaCode))];
    const missingRequiredEvidenceAreas = requiredEvidenceAreas.filter((areaCode) => !coveredEvidenceAreas.includes(areaCode));
    if (missingRequiredEvidenceAreas.length > 0) {
      validationErrors.push({
        code: "payroll_migration_evidence_mapping_missing",
        severity: batch.migrationMode === "live" ? "blocking" : "warning",
        message: `Evidence mapping is missing for ${missingRequiredEvidenceAreas.join(", ")}.`
      });
    }
    return {
      payrollMigrationBatchId: batch.payrollMigrationBatchId,
      companyId,
      personId: text(value?.personId, "payroll_migration_person_id_required"),
      employeeId,
      employmentId,
      sourceEmployeeRef: optionalText(value?.sourceEmployeeRef) || text(value?.personId, "payroll_migration_person_id_required"),
      employeeMasterSnapshot,
      employmentHistory,
      ytdBasis,
      priorPayslipSummary: clone(value?.priorPayslipSummary || {}),
      agiCarryForwardBasis,
      benefitHistory,
      travelHistory,
      evidenceMappings,
      agreementVersionId: agreementReference.agreementVersionId,
      agreementCatalogEntryId: agreementReference.agreementCatalogEntryId,
      validationState: validationErrors.some((validationError) => (validationError.severity || "blocking") === "blocking") ? "blocking" : "valid",
      validationErrors
    };
  });
}

function normalizeBalanceBaselines(baselines, { companyId, batch, balancesPlatform }) {
  if (!Array.isArray(baselines) || baselines.length === 0) {
    throw createValidationError("payroll_migration_balance_baselines_required", "At least one payroll migration balance baseline is required.");
  }
  return baselines.map((value) => {
    const balanceTypeCode = normalizeCode(value?.balanceTypeCode, "payroll_migration_balance_type_code_required");
    if (balancesPlatform?.getBalanceType) {
      balancesPlatform.getBalanceType({ companyId, balanceTypeCode });
    }
    const employeeId = optionalText(value?.employeeId);
    const employmentId = optionalText(value?.employmentId);
    const ownerTypeCode = optionalText(value?.ownerTypeCode) || (employmentId ? "employment" : employeeId ? "employee" : "company");
    const explicitZeroConfirmation = value?.explicitZeroConfirmation === true;
    const openingQuantity = value?.openingQuantity == null ? (explicitZeroConfirmation ? 0 : null) : normalizeNumber(value.openingQuantity, "payroll_migration_opening_quantity_invalid");
    if (openingQuantity == null) {
      throw createValidationError("payroll_migration_opening_quantity_required", "Opening quantity is required unless explicit zero confirmation is set.");
    }
    return {
      payrollMigrationBatchId: batch.payrollMigrationBatchId,
      companyId,
      personId: optionalText(value?.personId),
      employeeId,
      employmentId,
      ownerTypeCode: assertAllowed(ownerTypeCode, ["company", "employee", "employment"], "payroll_migration_owner_type_invalid"),
      balanceTypeCode,
      openingQuantity,
      openingValue: value?.openingValue == null ? null : normalizeNumber(value.openingValue, "payroll_migration_opening_value_invalid"),
      effectiveDate: dateOnly(value?.effectiveDate || batch.effectiveCutoverDate, "payroll_migration_balance_effective_date_required"),
      explicitZeroConfirmation,
      explanation: optionalText(value?.explanation)
    };
  });
}

function buildPayrollMigrationDifferenceItems({ sourceTotals = {}, targetTotals = {}, differenceItems = [], toleranceSek = 0 }) {
  const explicitItems = Array.isArray(differenceItems) ? differenceItems : [];
  if (explicitItems.length > 0) {
    return explicitItems.map((value) => {
      const sourceValue = normalizeNumber(value?.sourceValue ?? 0, "payroll_migration_diff_source_value_invalid");
      const targetValue = normalizeNumber(value?.targetValue ?? 0, "payroll_migration_diff_target_value_invalid");
      const differenceAmount = roundMoney(targetValue - sourceValue);
      return {
        payrollMigrationDiffId: crypto.randomUUID(),
        differenceType: text(value?.differenceType, "payroll_migration_diff_type_required"),
        sourceValue,
        targetValue,
        differenceAmount,
        differenceDescription: text(value?.differenceDescription || value?.differenceType, "payroll_migration_diff_description_required"),
        status:
          value?.status != null
            ? assertAllowed(value.status, PAYROLL_MIGRATION_DIFF_STATUSES, "payroll_migration_diff_status_invalid")
            : Math.abs(differenceAmount) > Math.abs(Number(toleranceSek || 0))
              ? "blocking"
              : "open",
        explanation: optionalText(value?.explanation),
        decidedByUserId: null,
        decidedAt: null
      };
    });
  }

  return [...new Set([...Object.keys(sourceTotals || {}), ...Object.keys(targetTotals || {})])]
    .map((key) => {
      const sourceValue = normalizeNumber(sourceTotals?.[key] ?? 0, "payroll_migration_diff_source_value_invalid");
      const targetValue = normalizeNumber(targetTotals?.[key] ?? 0, "payroll_migration_diff_target_value_invalid");
      const differenceAmount = roundMoney(targetValue - sourceValue);
      if (differenceAmount === 0) {
        return null;
      }
      return {
        payrollMigrationDiffId: crypto.randomUUID(),
        differenceType: key,
        sourceValue,
        targetValue,
        differenceAmount,
        differenceDescription: `Difference detected for ${key}.`,
        status: Math.abs(differenceAmount) > Math.abs(Number(toleranceSek || 0)) ? "blocking" : "open",
        explanation: null,
        decidedByUserId: null,
        decidedAt: null
      };
    })
    .filter(Boolean);
}

function normalizeObjectRefs(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    sourceObjectId: text(value?.sourceObjectId, "migration_source_object_id_required"),
    targetObjectId: optionalText(value?.targetObjectId),
    objectType: text(value?.objectType, "migration_object_type_required"),
    state: optionalText(value?.state) || "received"
  }));
}

function normalizeDifferenceItems(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    itemId: crypto.randomUUID(),
    objectType: text(value?.objectType, "diff_report_object_type_required"),
    sourceObjectId: text(value?.sourceObjectId, "diff_report_source_object_id_required"),
    targetObjectId: optionalText(value?.targetObjectId),
    differenceClass: assertAllowed(value?.differenceClass, DIFFERENCE_CLASSES, "diff_report_difference_class_invalid"),
    comment: optionalText(value?.comment),
    decision: optionalText(value?.decision) || "pending"
  }));
}

function normalizeExistingImportBatchIds(companyId, values, state, error) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => text(value, "import_batch_id_required")))].map((importBatchId) => {
    const batch = statefulRequire("importBatches", companyId, importBatchId, "import_batch_not_found", state, error);
    return batch.importBatchId;
  });
}

function normalizeExistingDiffReportIds(companyId, values, state, error) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => text(value, "diff_report_id_required")))].map((diffReportId) => {
    const diffReport = statefulRequire("diffReports", companyId, diffReportId, "diff_report_not_found", state, error);
    return diffReport.diffReportId;
  });
}

function normalizeExistingParallelRunResultIds(companyId, values, state, error) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => text(value, "parallel_run_result_id_required")))].map((parallelRunResultId) => {
    const parallelRunResult = statefulRequire("parallelRunResults", companyId, parallelRunResultId, "parallel_run_result_not_found", state, error);
    return parallelRunResult.parallelRunResultId;
  });
}

function normalizeAcceptanceSignoffRefs(values, cutoverPlan) {
  if (Array.isArray(values) && values.length > 0) {
    return values.map((value) => ({
      userId: text(value?.userId, "migration_acceptance_signoff_user_required"),
      roleCode: text(value?.roleCode, "migration_acceptance_signoff_role_required"),
      label: text(value?.label, "migration_acceptance_signoff_label_required"),
      approvedAt: timestamp(value?.approvedAt, "migration_acceptance_signoff_approved_at_required")
    }));
  }
  if (!cutoverPlan) {
    return [];
  }
  return (cutoverPlan.signoffChain || []).map((step) => ({
    userId: step.userId,
    roleCode: step.roleCode,
    label: step.label,
    approvedAt: step.approvedAt || null
  }));
}

function normalizeAcceptedVarianceThresholds(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createValidationError(
      "cutover_accepted_variance_thresholds_required",
      "Cutover plan requires acceptedVarianceThresholds."
    );
  }
  const normalizedEntries = Object.entries(value).map(([thresholdCode, thresholdValue]) => [
    text(thresholdCode, "cutover_variance_threshold_code_required"),
    normalizeNumber(thresholdValue, "cutover_variance_threshold_value_invalid")
  ]);
  if (normalizedEntries.length === 0) {
    throw createValidationError(
      "cutover_accepted_variance_thresholds_required",
      "Cutover plan requires at least one accepted variance threshold."
    );
  }
  return Object.fromEntries(normalizedEntries);
}

function normalizeSourceParitySummary(value) {
  const summary = clone(value || {});
  return {
    countParity: normalizeParityCheck(summary.countParity),
    amountParity: normalizeParityCheck(summary.amountParity),
    duplicateSummary: normalizeSummaryCount(summary.duplicateSummary),
    rejectedRowSummary: normalizeSummaryCount(summary.rejectedRowSummary),
    reviewRequiredSummary: normalizeSummaryCount(summary.reviewRequiredSummary),
    unresolvedMaterialDifferences: normalizeNonNegativeInteger(summary.unresolvedMaterialDifferences),
    sourceParityPassed: normalizeOptionalBoolean(summary.sourceParityPassed),
    openingBalanceParityPassed: normalizeOptionalBoolean(summary.openingBalanceParityPassed),
    openReceivablesParityPassed: normalizeOptionalBoolean(summary.openReceivablesParityPassed),
    openPayablesParityPassed: normalizeOptionalBoolean(summary.openPayablesParityPassed),
    payrollYtdParityPassed: normalizeOptionalBoolean(summary.payrollYtdParityPassed),
    agiHistoryParityPassed: normalizeOptionalBoolean(summary.agiHistoryParityPassed),
    taxAccountParityPassed: normalizeOptionalBoolean(summary.taxAccountParityPassed),
    notes: optionalText(summary.notes)
  };
}

function normalizeParityCheck(value) {
  const payload = clone(value || {});
  return {
    passed: payload.passed === true,
    sourceCount: normalizeNonNegativeInteger(payload.sourceCount),
    targetCount: normalizeNonNegativeInteger(payload.targetCount),
    delta: Number(payload.delta || 0)
  };
}

function normalizeSummaryCount(value) {
  if (typeof value === "number") {
    return normalizeNonNegativeInteger(value);
  }
  const payload = clone(value || {});
  return {
    count: normalizeNonNegativeInteger(payload.count),
    samples: Array.isArray(payload.samples) ? payload.samples.map((sample) => text(sample, "migration_acceptance_sample_invalid")) : []
  };
}

function computeAcceptanceBlockingReasonCodes({
  companyId,
  cutoverPlan,
  importBatchIds,
  diffReportIds,
  parallelRunResultIds,
  sourceParitySummary,
  signoffRefs,
  rollbackPointRef,
  state,
  error
}) {
  const reasons = [];
  if (sourceParitySummary.countParity.passed !== true) {
    reasons.push("count_parity_failed");
  }
  if (sourceParitySummary.amountParity.passed !== true) {
    reasons.push("amount_parity_failed");
  }
  if (sourceParitySummary.unresolvedMaterialDifferences > 0) {
    reasons.push("material_variances_open");
  }
  for (const importBatchId of importBatchIds) {
    const batch = statefulRequire("importBatches", companyId, importBatchId, "import_batch_not_found", state, error);
    if (batch.status !== "accepted") {
      reasons.push("mandatory_dataset_not_accepted");
      break;
    }
  }
  for (const diffReportId of diffReportIds) {
    const diffReport = statefulRequire("diffReports", companyId, diffReportId, "diff_report_not_found", state, error);
    if (diffReport.status !== "accepted") {
      reasons.push("variance_report_not_accepted");
      break;
    }
  }
  for (const parallelRunResultId of parallelRunResultIds) {
    const parallelRunResult = statefulRequire("parallelRunResults", companyId, parallelRunResultId, "parallel_run_result_not_found", state, error);
    if (parallelRunResult.status === "blocked") {
      reasons.push("parallel_run_blocked");
      break;
    }
    if (parallelRunResult.status !== "accepted") {
      reasons.push("parallel_run_not_accepted");
      break;
    }
  }
  if (cutoverPlan) {
    if ((cutoverPlan.signoffChain || []).some((step) => !step.approvedAt || !step.approvedByUserId)) {
      reasons.push("cutover_signoff_incomplete");
    }
    if ((cutoverPlan.goLiveChecklist || []).some((item) => item.mandatory !== false && item.status !== "completed")) {
      reasons.push("cutover_checklist_incomplete");
    }
  }
  if (signoffRefs.length === 0 || signoffRefs.some((ref) => !ref.approvedAt)) {
    reasons.push("signoffs_missing");
  }
  if (!rollbackPointRef) {
    reasons.push("rollback_point_missing");
  }
  for (const [flag, reason] of [
    [sourceParitySummary.sourceParityPassed, "source_parity_not_confirmed"],
    [sourceParitySummary.openingBalanceParityPassed, "opening_balance_parity_not_confirmed"],
    [sourceParitySummary.openReceivablesParityPassed, "open_receivables_parity_not_confirmed"],
    [sourceParitySummary.openPayablesParityPassed, "open_payables_parity_not_confirmed"],
    [sourceParitySummary.payrollYtdParityPassed, "payroll_ytd_parity_not_confirmed"],
    [sourceParitySummary.agiHistoryParityPassed, "agi_history_parity_not_confirmed"],
    [sourceParitySummary.taxAccountParityPassed, "tax_account_parity_not_confirmed"]
  ]) {
    if (flag === false) {
      reasons.push(reason);
    }
  }
  return [...new Set(reasons)];
}

async function computeCutoverValidationBlockingReasonCodes({
  companyId,
  cutoverPlan,
  acceptanceRecord,
  contractTestsPassed,
  goldenScenariosPassed,
  runbooksAcknowledged,
  restoreDrillFreshnessDays,
  state,
  clock,
  listRuntimeJobs,
  listRuntimeDeadLetters
}) {
  const reasons = [];
  if (!acceptanceRecord) {
    reasons.push("cutover_acceptance_record_missing");
  } else {
    const sourceParitySummary = acceptanceRecord.sourceParitySummary || {};
    if (sourceParitySummary.unresolvedMaterialDifferences > 0 || hasBlockingDiffReports(state, companyId)) {
      reasons.push("material_variances_open");
    }
    for (const [flag, reason] of [
      [sourceParitySummary.openingBalanceParityPassed, "opening_balance_parity_not_confirmed"],
      [sourceParitySummary.openReceivablesParityPassed, "open_receivables_parity_not_confirmed"],
      [sourceParitySummary.openPayablesParityPassed, "open_payables_parity_not_confirmed"],
      [sourceParitySummary.taxAccountParityPassed, "tax_account_parity_not_confirmed"]
    ]) {
      if (flag !== true) {
        reasons.push(reason);
      }
    }
  }
  if (await hasOpenRegulatedSubmissionDeadLetters({ companyId, listRuntimeJobs, listRuntimeDeadLetters })) {
    reasons.push("regulated_submission_dead_letters_open");
  }
  if (hasUnresolvedPrivilegedAccessFindings(state, companyId)) {
    reasons.push("privileged_access_findings_open");
  }
  if (contractTestsPassed !== true) {
    reasons.push("contract_tests_not_green");
  }
  if (goldenScenariosPassed !== true) {
    reasons.push("golden_scenarios_not_green");
  }
  if (runbooksAcknowledged !== true) {
    reasons.push("runbooks_not_acknowledged");
  }
  if (!hasFreshRestoreDrill({ state, companyId, restoreDrillFreshnessDays, clock })) {
    reasons.push("restore_drill_not_fresh_enough");
  }
  return [...new Set(reasons)];
}

function normalizeOptionalBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function normalizeOptionalPositiveInteger(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizePositiveInteger(value, code);
}

function normalizeNonNegativeInteger(value) {
  if (value == null || value === "") {
    return 0;
  }
  const resolved = Number(value);
  if (!Number.isInteger(resolved) || resolved < 0) {
    throw createValidationError("migration_non_negative_integer_invalid", "Value must be a non-negative integer.");
  }
  return resolved;
}

function statefulRequire(mapKey, companyId, objectId, notFoundCode, state, error) {
  const record = state[mapKey]?.get?.(objectId);
  if (!record || record.companyId !== companyId) {
    throw error(404, notFoundCode, `${objectId} was not found.`);
  }
  return record;
}

function summarizeDifferenceItems(items) {
  return items.reduce(
    (summary, item) => {
      summary.totalCount += 1;
      summary[item.differenceClass] = Number(summary[item.differenceClass] || 0) + 1;
      return summary;
    },
    { totalCount: 0 }
  );
}

function normalizeSignoffChain(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value, index) => ({
    sequence: index + 1,
    userId: text(value?.userId, "cutover_signoff_user_id_required"),
    roleCode: text(value?.roleCode, "cutover_signoff_role_required"),
    label: text(value?.label || `step_${index + 1}`, "cutover_signoff_label_required"),
    approvedByUserId: null,
    approvedAt: null
  }));
}

function normalizeChecklist(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value, index) => ({
    itemCode: text(value?.itemCode || `item_${index + 1}`, "cutover_checklist_item_code_required"),
    label: text(value?.label, "cutover_checklist_label_required"),
    mandatory: value?.mandatory !== false,
    status: normalizeChecklistStatus(optionalText(value?.status) || "open"),
    completedAt: null,
    updatedByUserId: null,
    updatedAt: null
  }));
}

function normalizeSourceExtractChecklist(values) {
  const resolvedValues = Array.isArray(values) && values.length > 0 ? values : buildDefaultSourceExtractChecklist();
  return resolvedValues.map((value, index) => ({
    itemCode: text(value?.itemCode || `extract_${index + 1}`, "cutover_source_extract_item_code_required"),
    label: text(value?.label, "cutover_source_extract_label_required"),
    mandatory: value?.mandatory !== false,
    status: normalizeChecklistStatus(optionalText(value?.status) || "open"),
    sourceExtractRef: optionalText(value?.sourceExtractRef),
    verificationSummary: optionalText(value?.verificationSummary),
    verifiedByUserId: null,
    completedAt: null,
    updatedByUserId: null,
    updatedAt: null
  }));
}

function buildDefaultSourceExtractChecklist() {
  return [
    { itemCode: "masterdata_extract", label: "Master data extract verified" },
    { itemCode: "open_items_extract", label: "Open items extract verified" },
    { itemCode: "history_extract", label: "Historical balances and reporting extract verified" },
    { itemCode: "attachments_extract", label: "Documents and attachments extract verified" }
  ];
}

function summarizeSourceExtractChecklist(values) {
  const items = Array.isArray(values) ? values : [];
  const mandatoryItems = items.filter((item) => item.mandatory !== false);
  return {
    total: mandatoryItems.length,
    completed: mandatoryItems.filter((item) => item.status === "completed").length,
    blocked: mandatoryItems.filter((item) => item.status === "blocked").length,
    pending: mandatoryItems.filter((item) => item.status === "open").length
  };
}

function summarizeCutoverRehearsals(values) {
  const items = Array.isArray(values) ? values : [];
  return {
    total: items.length,
    completed: items.filter((item) => item.status === "completed").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    scheduled: items.filter((item) => item.status === "scheduled").length,
    latestRecordedAt: items
      .map((item) => item.recordedAt || item.scheduledFor || null)
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left))[0] || null
  };
}

function resolveCutoverConciergeStageCode({
  cutoverPlan,
  sourceExtractSummary,
  rehearsalSummary,
  rollbackDrillStatus,
  automatedVarianceStatus
}) {
  if (cutoverPlan.status === "rolled_back") {
    return "rolled_back";
  }
  if (sourceExtractSummary.pending > 0 || sourceExtractSummary.blocked > 0) {
    return "source_extract";
  }
  if (rehearsalSummary.total === 0 || rehearsalSummary.blocked > 0) {
    return "rehearsal";
  }
  if (!automatedVarianceStatus || automatedVarianceStatus === "blocking") {
    return "variance_review";
  }
  if (!rollbackDrillStatus || rollbackDrillStatus !== "passed") {
    return "rollback_drill";
  }
  if ((cutoverPlan.signoffChain || []).some((step) => !step.approvedAt || !step.approvedByUserId)) {
    return "signoff";
  }
  if ((cutoverPlan.goLiveChecklist || []).some((item) => item.mandatory !== false && item.status !== "completed")) {
    return "go_live_checklist";
  }
  if (!cutoverPlan.signoffEvidenceBundle) {
    return "signoff_evidence";
  }
  if (cutoverPlan.status === "validation_passed") {
    return "ready_to_switch";
  }
  if (cutoverPlan.status === "switched" || cutoverPlan.status === "stabilized" || cutoverPlan.status === "closed") {
    return "live_window";
  }
  return "guided_cutover";
}

function normalizeChecklistStatus(value) {
  const resolved = text(value, "cutover_checklist_status_required");
  if (!["open", "completed", "blocked"].includes(resolved)) {
    throw createValidationError("cutover_checklist_status_invalid", `cutover_checklist_status_invalid does not allow ${resolved}.`);
  }
  return resolved;
}

function normalizeRegulatedSubmissionRefs(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    submissionId: text(value?.submissionId, "post_cutover_correction_submission_id_required"),
    submissionType: text(value?.submissionType || "unknown", "post_cutover_correction_submission_type_required"),
    submittedAt: value?.submittedAt ? timestamp(value.submittedAt, "post_cutover_correction_submission_submitted_at_required") : null
  }));
}

function normalizeAcceptanceReportDelta(value) {
  if (value == null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw createValidationError(
      "post_cutover_correction_acceptance_report_delta_invalid",
      "acceptanceReportDelta must be an object."
    );
  }
  return clone(value);
}

function normalizeParallelRunThresholds(value) {
  if (value == null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw createValidationError("parallel_run_thresholds_invalid", "Parallel run thresholds must be an object.");
  }
  return Object.fromEntries(
    Object.entries(value).map(([thresholdCode, thresholdValue]) => [
      text(thresholdCode, "parallel_run_threshold_code_required"),
      normalizeNumber(thresholdValue, "parallel_run_threshold_value_invalid")
    ])
  );
}

function normalizeParallelRunMeasurements(values, thresholdProfile) {
  if (!Array.isArray(values) || values.length === 0) {
    throw createValidationError("parallel_run_metrics_required", "Parallel run requires at least one metric.");
  }
  return values.map((value, index) => {
    const metricCode = text(value?.metricCode || `metric_${index + 1}`, "parallel_run_metric_code_required");
    const label = text(value?.label || metricCode, "parallel_run_metric_label_required");
    const sourceValue = normalizeNumber(value?.sourceValue, "parallel_run_metric_source_value_invalid");
    const targetValue = normalizeNumber(value?.targetValue, "parallel_run_metric_target_value_invalid");
    const deltaValue = value?.deltaValue == null
      ? roundMoney(targetValue - sourceValue)
      : normalizeNumber(value.deltaValue, "parallel_run_metric_delta_value_invalid");
    const deltaPercent = value?.deltaPercent == null
      ? computeParallelRunDeltaPercent({ sourceValue, deltaValue })
      : normalizeNumber(value.deltaPercent, "parallel_run_metric_delta_percent_invalid");
    const thresholdCode = optionalText(value?.thresholdCode);
    const thresholdValue = value?.thresholdValue != null
      ? normalizeNumber(value.thresholdValue, "parallel_run_metric_threshold_value_invalid")
      : thresholdCode && Object.prototype.hasOwnProperty.call(thresholdProfile, thresholdCode)
        ? normalizeNumber(thresholdProfile[thresholdCode], "parallel_run_metric_threshold_value_invalid")
        : null;
    const thresholdPercent = value?.thresholdPercent != null
      ? normalizeNumber(value.thresholdPercent, "parallel_run_metric_threshold_percent_invalid")
      : null;
    const informational = value?.informational === true;
    const hardBlock = value?.hardBlock === true;
    if (!informational && thresholdValue == null && thresholdPercent == null) {
      throw createValidationError("parallel_run_threshold_missing", `Parallel run metric ${metricCode} requires a threshold.`);
    }
    const thresholdBreached =
      !informational
      && (
        (thresholdValue != null && Math.abs(deltaValue) > Math.abs(thresholdValue))
        || (thresholdPercent != null && Math.abs(deltaPercent) > Math.abs(thresholdPercent))
      );
    return {
      metricCode,
      label,
      unitCode: optionalText(value?.unitCode) || "count",
      sourceValue,
      targetValue,
      deltaValue,
      deltaPercent,
      thresholdCode,
      thresholdValue,
      thresholdPercent,
      informational,
      hardBlock,
      comment: optionalText(value?.comment),
      outcomeCode: thresholdBreached ? (hardBlock ? "blocked" : "outside_threshold") : informational ? "informational" : "within_threshold"
    };
  });
}

function computeParallelRunDeltaPercent({ sourceValue, deltaValue }) {
  if (sourceValue === 0) {
    return deltaValue === 0 ? 0 : 100;
  }
  return roundMoney((deltaValue / sourceValue) * 100);
}

function summarizeParallelRunMeasurements(measurements) {
  return {
    totalMetrics: measurements.length,
    breachedMetrics: measurements.filter((measurement) => measurement.outcomeCode === "outside_threshold").length,
    blockingMetrics: measurements.filter((measurement) => measurement.outcomeCode === "blocked").length,
    informationalMetrics: measurements.filter((measurement) => measurement.outcomeCode === "informational").length,
    withinThresholdMetrics: measurements.filter((measurement) => measurement.outcomeCode === "within_threshold").length,
    maxAbsDeltaValue: measurements.reduce((maxValue, measurement) => Math.max(maxValue, Math.abs(Number(measurement.deltaValue || 0))), 0),
    maxAbsDeltaPercent: measurements.reduce((maxValue, measurement) => Math.max(maxValue, Math.abs(Number(measurement.deltaPercent || 0))), 0)
  };
}

function resolveParallelRunResultStatus(differenceSummary) {
  if ((differenceSummary?.blockingMetrics || 0) > 0) {
    return "blocked";
  }
  if ((differenceSummary?.breachedMetrics || 0) > 0) {
    return "manual_review_required";
  }
  return "completed";
}

function buildMigrationDatasetSummary({ importBatches, diffReports, parallelRunResults, acceptanceRecords, postCutoverCorrectionCases }) {
  return {
    importBatchCount: importBatches.length,
    acceptedImportBatchCount: importBatches.filter((batch) => batch.status === "accepted").length,
    correctedImportBatchCount: importBatches.filter((batch) => batch.status === "corrected").length,
    blockingDiffReportCount: diffReports.filter((diffReport) => diffReport.status === "remediation_required").length,
    acceptedDiffReportCount: diffReports.filter((diffReport) => diffReport.status === "accepted").length,
    parallelRunResultCount: parallelRunResults.length,
    acceptedParallelRunResultCount: parallelRunResults.filter((result) => result.status === "accepted").length,
    pendingParallelRunAcceptanceCount: parallelRunResults.filter((result) => ["completed", "manual_review_required"].includes(result.status)).length,
    blockedParallelRunResultCount: parallelRunResults.filter((result) => result.status === "blocked").length,
    acceptedAcceptanceRecordCount: acceptanceRecords.filter((record) => record.status === "accepted").length,
    blockedAcceptanceRecordCount: acceptanceRecords.filter((record) => record.status === "blocked").length,
    openPostCutoverCorrectionCaseCount: postCutoverCorrectionCases.filter((correctionCase) => correctionCase.status === "open").length
  };
}

function buildMigrationConciergeSummary({ cutoverPlans }) {
  return {
    totalPlans: cutoverPlans.length,
    sourceExtractIncompleteCount: cutoverPlans.filter((cutoverPlan) => summarizeSourceExtractChecklist(cutoverPlan.sourceExtractChecklist).pending > 0).length,
    rehearsalMissingCount: cutoverPlans.filter((cutoverPlan) => summarizeCutoverRehearsals(cutoverPlan.cutoverRehearsals).total === 0).length,
    rollbackDrillMissingCount: cutoverPlans.filter((cutoverPlan) => !cutoverPlan.rollbackDrill).length,
    varianceReportBlockingCount: cutoverPlans.filter((cutoverPlan) => cutoverPlan.automatedVarianceReport?.status === "blocking").length,
    signoffEvidenceMissingCount: cutoverPlans.filter((cutoverPlan) => !cutoverPlan.signoffEvidenceBundle).length
  };
}

function buildCutoverConciergeSnapshot({ cutoverPlan, acceptanceRecords, parallelRunResults, currentTimestamp }) {
  const latestAcceptanceRecord = [...acceptanceRecords]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
  const sourceExtractSummary = summarizeSourceExtractChecklist(cutoverPlan.sourceExtractChecklist);
  const rehearsalSummary = summarizeCutoverRehearsals(cutoverPlan.cutoverRehearsals);
  const automatedVarianceReport = clone(cutoverPlan.automatedVarianceReport || null);
  const rollbackDrill = clone(cutoverPlan.rollbackDrill || null);
  return {
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    conciergeStageCode: resolveCutoverConciergeStageCode({
      cutoverPlan,
      sourceExtractSummary,
      rehearsalSummary,
      rollbackDrillStatus: rollbackDrill?.status || null,
      automatedVarianceStatus: automatedVarianceReport?.status || null
    }),
    sourceExtractChecklist: clone(cutoverPlan.sourceExtractChecklist || []),
    sourceExtractSummary,
    rehearsals: clone(cutoverPlan.cutoverRehearsals || []).sort((left, right) => (right.recordedAt || "").localeCompare(left.recordedAt || "")),
    rehearsalSummary,
    automatedVarianceReport,
    rollbackDrill,
    signoffEvidenceBundle: clone(cutoverPlan.signoffEvidenceBundle || null),
    latestAcceptanceRecordId: latestAcceptanceRecord?.migrationAcceptanceRecordId || null,
    latestAcceptanceStatus: latestAcceptanceRecord?.status || null,
    parallelRunSummary: {
      total: parallelRunResults.length,
      accepted: parallelRunResults.filter((result) => result.status === "accepted").length,
      blocked: parallelRunResults.filter((result) => result.status === "blocked").length,
      pendingAcceptance: parallelRunResults.filter((result) => ["completed", "manual_review_required"].includes(result.status)).length
    },
    nextActionCodes: buildCutoverConciergeNextActionCodes({
      cutoverPlan,
      sourceExtractSummary,
      rehearsalSummary,
      automatedVarianceReport,
      rollbackDrill
    }),
    generatedAt: currentTimestamp
  };
}

function buildCutoverConciergeNextActionCodes({ cutoverPlan, sourceExtractSummary, rehearsalSummary, automatedVarianceReport, rollbackDrill }) {
  const actionCodes = [];
  if (sourceExtractSummary.pending > 0 || sourceExtractSummary.blocked > 0) {
    actionCodes.push("migration.completeSourceExtractChecklist");
  }
  if (rehearsalSummary.total === 0 || rehearsalSummary.blocked > 0) {
    actionCodes.push("migration.recordCutoverRehearsal");
  }
  if (!automatedVarianceReport || automatedVarianceReport.status === "blocking") {
    actionCodes.push("migration.generateAutomatedVarianceReport");
  }
  if (!rollbackDrill || rollbackDrill.status !== "passed") {
    actionCodes.push("migration.linkRollbackDrill");
  }
  if ((cutoverPlan.signoffChain || []).some((step) => !step.approvedAt || !step.approvedByUserId)) {
    actionCodes.push("migration.completeSignoffChain");
  }
  if ((cutoverPlan.goLiveChecklist || []).some((item) => item.mandatory !== false && item.status !== "completed")) {
    actionCodes.push("migration.completeGoLiveChecklist");
  }
  if (!cutoverPlan.signoffEvidenceBundle) {
    actionCodes.push("migration.exportSignoffEvidence");
  }
  return actionCodes;
}

function buildMigrationCutoverBoard({
  companyId,
  cutoverPlans,
  parallelRunResults,
  acceptanceRecords,
  postCutoverCorrectionCases,
  currentTimestamp
}) {
  const parallelRunResultsByCutoverPlanId = new Map();
  for (const parallelRunResult of parallelRunResults) {
    if (!parallelRunResult.cutoverPlanId) {
      continue;
    }
    if (!parallelRunResultsByCutoverPlanId.has(parallelRunResult.cutoverPlanId)) {
      parallelRunResultsByCutoverPlanId.set(parallelRunResult.cutoverPlanId, []);
    }
    parallelRunResultsByCutoverPlanId.get(parallelRunResult.cutoverPlanId).push(parallelRunResult);
  }
  const acceptanceRecordsByCutoverPlanId = new Map();
  for (const acceptanceRecord of acceptanceRecords) {
    if (!acceptanceRecord.cutoverPlanId) {
      continue;
    }
    if (!acceptanceRecordsByCutoverPlanId.has(acceptanceRecord.cutoverPlanId)) {
      acceptanceRecordsByCutoverPlanId.set(acceptanceRecord.cutoverPlanId, []);
    }
    acceptanceRecordsByCutoverPlanId.get(acceptanceRecord.cutoverPlanId).push(acceptanceRecord);
  }
  const correctionCasesByCutoverPlanId = new Map();
  for (const correctionCase of postCutoverCorrectionCases) {
    if (!correctionCasesByCutoverPlanId.has(correctionCase.cutoverPlanId)) {
      correctionCasesByCutoverPlanId.set(correctionCase.cutoverPlanId, []);
    }
    correctionCasesByCutoverPlanId.get(correctionCase.cutoverPlanId).push(correctionCase);
  }
  const items = cutoverPlans
    .map((cutoverPlan) =>
      buildMigrationCutoverBoardRow({
        cutoverPlan,
        parallelRunResults: parallelRunResultsByCutoverPlanId.get(cutoverPlan.cutoverPlanId) || [],
        acceptanceRecords: acceptanceRecordsByCutoverPlanId.get(cutoverPlan.cutoverPlanId) || [],
        correctionCases: correctionCasesByCutoverPlanId.get(cutoverPlan.cutoverPlanId) || [],
        currentTimestamp
      })
    )
    .sort((left, right) => resolveMigrationCutoverBoardTimestamp(right).localeCompare(resolveMigrationCutoverBoardTimestamp(left)));
  const queueSummary = buildMigrationQueueSummary({
    queueCode: "MIGRATION_CUTOVER",
    ownerQueue: "migration_operator",
    items,
    currentTimestamp
  });
  return {
    boardCode: "MigrationCutoverCockpit",
    title: "Migration cutover cockpit",
    scope: "company",
    companyId,
    defaultViewCode: "attention",
    views: [
      { viewCode: "attention", label: "Needs attention", filter: { requiresAttention: true } },
      { viewCode: "planned", label: "Planned", filter: { status: ["planned", "freeze_started", "final_extract_done", "validation_passed"] } },
      { viewCode: "switched", label: "Switched", filter: { status: ["switched", "stabilized"] } },
      { viewCode: "rollback", label: "Rollback", filter: { status: ["rollback_in_progress", "rolled_back"] } }
    ],
    filters: [
      { filterCode: "status", inputType: "enum", values: CUTOVER_PLAN_STATUSES },
      { filterCode: "requiresAttention", inputType: "boolean" },
      { filterCode: "validationGateStatus", inputType: "enum", values: ["pending", "blocked", "passed"] }
    ],
    sortOptions: [
      { sortCode: "recent", field: "boardTimestamp", direction: "desc" },
      { sortCode: "freezeAt", field: "freezeAt", direction: "asc" },
      { sortCode: "status", field: "status", direction: "asc" }
    ],
    commandBar: {
      contextObject: { objectType: "migrationCutoverCockpit", objectId: companyId },
      availableCommands: [
        { actionCode: "migration.openCutoverPlans", label: "Open cutover plans" },
        { actionCode: "migration.openParallelRuns", label: "Open parallel runs" },
        { actionCode: "migration.openAcceptanceRecords", label: "Open acceptance records" },
        { actionCode: "migration.openCorrections", label: "Open corrections" }
      ],
      recentCommands: [],
      quickFilters: ["attention", "rollback", "switched"],
      createActions: ["migration.createCutoverPlan"]
    },
    items,
    queueSummary,
    counters: {
      total: items.length,
      planned: items.filter((item) => item.status === "planned").length,
      validationBlocked: items.filter((item) => item.validationGateStatus === "blocked").length,
      readyToSwitch: items.filter((item) => item.status === "validation_passed" && item.attentionReasonCodes.length === 0).length,
      switched: items.filter((item) => item.status === "switched").length,
      stabilized: items.filter((item) => item.status === "stabilized").length,
      rollbackInProgress: items.filter((item) => item.status === "rollback_in_progress").length,
      rolledBack: items.filter((item) => item.status === "rolled_back").length,
      correctionOpen: items.filter((item) => item.postCutoverCorrectionOpenCount > 0).length,
      parallelRunBlocked: items.filter((item) => item.parallelRunSummary.blocked > 0).length,
      parallelRunPendingAcceptance: items.filter((item) => item.parallelRunSummary.pendingAcceptance > 0).length,
      attentionRequired: items.filter((item) => item.requiresAttention).length,
      acceptanceBlocked: items.filter((item) => item.latestAcceptanceStatus === "blocked").length,
      checklistBlocked: items.filter((item) => item.checklistSummary.blockedMandatory > 0).length
    },
    projectionInfo: {
      projectionCode: "MigrationCutoverCockpit",
      objectType: "workbench",
      objectId: companyId,
      sourceVersion: currentTimestamp,
      targetVersion: currentTimestamp,
      staleProjection: false
    }
  };
}

function buildMigrationCutoverBoardRow({ cutoverPlan, parallelRunResults, acceptanceRecords, correctionCases, currentTimestamp }) {
  const latestAcceptanceRecord = [...acceptanceRecords]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
  const parallelRunSummary = {
    total: parallelRunResults.length,
    accepted: parallelRunResults.filter((result) => result.status === "accepted").length,
    pendingAcceptance: parallelRunResults.filter((result) => ["completed", "manual_review_required"].includes(result.status)).length,
    blocked: parallelRunResults.filter((result) => result.status === "blocked").length,
    scopes: [...new Set(parallelRunResults.map((result) => result.comparisonScope))].sort()
  };
  const signoffSummary = {
    total: cutoverPlan.signoffChain.length,
    approved: cutoverPlan.signoffChain.filter((step) => step.approvedAt && step.approvedByUserId).length
  };
  signoffSummary.pending = Math.max(signoffSummary.total - signoffSummary.approved, 0);
  const mandatoryChecklistItems = cutoverPlan.goLiveChecklist.filter((item) => item.mandatory !== false);
  const checklistSummary = {
    totalMandatory: mandatoryChecklistItems.length,
    completedMandatory: mandatoryChecklistItems.filter((item) => item.status === "completed").length,
    blockedMandatory: mandatoryChecklistItems.filter((item) => item.status === "blocked").length
  };
  checklistSummary.pendingMandatory = Math.max(
    checklistSummary.totalMandatory - checklistSummary.completedMandatory - checklistSummary.blockedMandatory,
    0
  );
  const sourceExtractSummary = summarizeSourceExtractChecklist(cutoverPlan.sourceExtractChecklist);
  const rehearsalSummary = summarizeCutoverRehearsals(cutoverPlan.cutoverRehearsals);
  const rollbackDrillStatus = cutoverPlan.rollbackDrill?.status || null;
  const automatedVarianceStatus = cutoverPlan.automatedVarianceReport?.status || null;
  const conciergeStageCode = resolveCutoverConciergeStageCode({
    cutoverPlan,
    sourceExtractSummary,
    rehearsalSummary,
    rollbackDrillStatus,
    automatedVarianceStatus
  });
  const openCorrectionCases = correctionCases.filter((correctionCase) => correctionCase.status === "open");
  const attentionReasonCodes = [];
  if (cutoverPlan.validationGateStatus === "blocked") {
    attentionReasonCodes.push("validation_blocked");
  }
  if (latestAcceptanceRecord?.status === "blocked") {
    attentionReasonCodes.push("acceptance_blocked");
  }
  if (cutoverPlan.status === "rollback_in_progress") {
    attentionReasonCodes.push("rollback_in_progress");
  }
  if (openCorrectionCases.length > 0) {
    attentionReasonCodes.push("post_cutover_correction_open");
  }
  if (parallelRunSummary.pendingAcceptance > 0) {
    attentionReasonCodes.push("parallel_run_acceptance_pending");
  }
  if (parallelRunSummary.blocked > 0) {
    attentionReasonCodes.push("parallel_run_blocked");
  }
  if (checklistSummary.blockedMandatory > 0) {
    attentionReasonCodes.push("checklist_blocked");
  }
  if (sourceExtractSummary.pending > 0 || sourceExtractSummary.blocked > 0) {
    attentionReasonCodes.push("source_extract_incomplete");
  }
  if (rehearsalSummary.total === 0) {
    attentionReasonCodes.push("cutover_rehearsal_missing");
  } else if (rehearsalSummary.blocked > 0) {
    attentionReasonCodes.push("cutover_rehearsal_blocked");
  }
  if (!automatedVarianceStatus) {
    attentionReasonCodes.push("automated_variance_missing");
  } else if (automatedVarianceStatus === "blocking") {
    attentionReasonCodes.push("automated_variance_blocking");
  }
  if (!rollbackDrillStatus) {
    attentionReasonCodes.push("rollback_drill_missing");
  } else if (rollbackDrillStatus !== "passed") {
    attentionReasonCodes.push("rollback_drill_not_passed");
  }
  if (signoffSummary.pending === 0 && !cutoverPlan.signoffEvidenceBundle) {
    attentionReasonCodes.push("signoff_evidence_missing");
  }
  const boardTimestamp = resolveMigrationCutoverBoardTimestamp({
    rollbackCompletedAt: cutoverPlan.rollbackCompletedAt,
    rollbackStartedAt: cutoverPlan.rollbackStartedAt,
    stabilizedAt: cutoverPlan.stabilizedAt,
    switchedAt: cutoverPlan.switchedAt,
    latestAcceptanceRecordedAt: latestAcceptanceRecord?.recordedAt || null,
    lastExtractAt: cutoverPlan.lastExtractAt,
    freezeAt: cutoverPlan.freezeAt
  });
  return {
    objectType: "migrationCutover",
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    boardTimestamp,
    status: cutoverPlan.status,
    validationGateStatus: cutoverPlan.validationGateStatus,
    freezeAt: cutoverPlan.freezeAt,
    lastExtractAt: cutoverPlan.lastExtractAt,
    rollbackPointRef: cutoverPlan.rollbackPointRef || cutoverPlan.rollbackPoint || null,
    switchedAt: cutoverPlan.switchedAt,
    stabilizedAt: cutoverPlan.stabilizedAt,
    rollbackStartedAt: cutoverPlan.rollbackStartedAt || null,
    rollbackCompletedAt: cutoverPlan.rollbackCompletedAt || null,
    signoffSummary,
    checklistSummary,
    sourceExtractSummary,
    rehearsalSummary,
    parallelRunSummary,
    conciergeStageCode,
    latestAcceptanceRecordId: latestAcceptanceRecord?.migrationAcceptanceRecordId || null,
    latestAcceptanceStatus: latestAcceptanceRecord?.status || null,
    latestAcceptanceRecordedAt: latestAcceptanceRecord?.recordedAt || null,
    latestAcceptanceBlockingReasonCodes: latestAcceptanceRecord?.blockingReasonCodes || [],
    validationBlockingReasonCodes: cutoverPlan.validationSummary?.blockingReasonCodes || [],
    rollbackExecutionMode: cutoverPlan.rollbackPlan?.rollbackExecutionMode || null,
    rollbackDrillStatus,
    rollbackDrillRestoreDrillId: cutoverPlan.rollbackDrill?.restoreDrillId || null,
    regulatedSubmissionRecoveryRequired: cutoverPlan.rollbackPlan?.regulatedSubmissionRecoveryPlan != null,
    automatedVarianceStatus,
    automatedVarianceBlockingReasonCodes: cutoverPlan.automatedVarianceReport?.blockingReasonCodes || [],
    signoffEvidenceBundleId: cutoverPlan.signoffEvidenceBundle?.cutoverSignoffEvidenceBundleId || null,
    signoffEvidenceStatus: cutoverPlan.signoffEvidenceBundle?.status || null,
    postCutoverCorrectionCaseCount: correctionCases.length,
    postCutoverCorrectionOpenCount: openCorrectionCases.length,
    queueCode: "MIGRATION_CUTOVER",
    ownerQueue: "migration_operator",
    blockedCount:
      (latestAcceptanceRecord?.blockingReasonCodes?.length || 0)
      + parallelRunSummary.pendingAcceptance
      + parallelRunSummary.blocked
      + (cutoverPlan.validationSummary?.blockingReasonCodes?.length || 0)
      + checklistSummary.blockedMandatory
      + sourceExtractSummary.pending
      + sourceExtractSummary.blocked
      + (rehearsalSummary.total === 0 ? 1 : 0)
      + rehearsalSummary.blocked
      + (!automatedVarianceStatus ? 1 : automatedVarianceStatus === "blocking" ? 1 : 0)
      + (!rollbackDrillStatus ? 1 : rollbackDrillStatus !== "passed" ? 1 : 0)
      + (signoffSummary.pending === 0 && !cutoverPlan.signoffEvidenceBundle ? 1 : 0)
      + signoffSummary.pending
      + openCorrectionCases.length,
    escalationPolicyCode: cutoverPlan.status === "rollback_in_progress"
      ? "cutover_rollback_hot"
      : cutoverPlan.status === "validation_passed"
        ? "cutover_switch_window"
        : "cutover_go_live_blocker",
    availableActionCodes: resolveMigrationCutoverActionCodes(cutoverPlan).concat("migration.openConcierge"),
    requiresAttention: attentionReasonCodes.length > 0,
    attentionReasonCodes: [...new Set(attentionReasonCodes)],
    ageHours: computeAgeHours(cutoverPlan.createdAt || cutoverPlan.freezeAt || currentTimestamp, currentTimestamp)
  };
}

function buildMigrationParallelRunBoard({ companyId, parallelRunResults, cutoverPlans, currentTimestamp }) {
  const cutoverPlansById = new Map(cutoverPlans.map((cutoverPlan) => [cutoverPlan.cutoverPlanId, cutoverPlan]));
  const items = parallelRunResults
    .map((parallelRunResult) =>
      buildMigrationParallelRunBoardRow({
        parallelRunResult,
        cutoverPlan: parallelRunResult.cutoverPlanId ? cutoverPlansById.get(parallelRunResult.cutoverPlanId) || null : null,
        currentTimestamp
      })
    )
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
  const queueSummary = buildMigrationQueueSummary({
    queueCode: "MIGRATION_PARALLEL_RUN",
    ownerQueue: "migration_operator",
    items,
    currentTimestamp
  });
  return {
    boardCode: "MigrationParallelRunBoard",
    title: "Migration parallel run board",
    scope: "company",
    companyId,
    defaultViewCode: "review",
    views: [
      { viewCode: "review", label: "Needs review", filter: { status: ["completed", "manual_review_required", "blocked"] } },
      { viewCode: "accepted", label: "Accepted", filter: { status: ["accepted"] } },
      { viewCode: "blocked", label: "Blocked", filter: { status: ["blocked"] } }
    ],
    filters: [
      { filterCode: "status", inputType: "enum", values: PARALLEL_RUN_RESULT_STATUSES },
      { filterCode: "comparisonScope", inputType: "string" },
      { filterCode: "cutoverPlanId", inputType: "string" }
    ],
    sortOptions: [
      { sortCode: "recent", field: "recordedAt", direction: "desc" },
      { sortCode: "scope", field: "comparisonScope", direction: "asc" }
    ],
    commandBar: {
      contextObject: { objectType: "migrationParallelRunBoard", objectId: companyId },
      availableCommands: [
        { actionCode: "migration.openParallelRuns", label: "Open parallel runs" },
        { actionCode: "migration.openCutoverCockpit", label: "Open cutover cockpit" }
      ],
      recentCommands: [],
      quickFilters: ["review", "accepted", "blocked"],
      createActions: ["migration.recordParallelRunResult"]
    },
    items,
    queueSummary,
    counters: {
      total: items.length,
      accepted: items.filter((item) => item.status === "accepted").length,
      completedAwaitingAcceptance: items.filter((item) => item.status === "completed").length,
      manualReviewRequired: items.filter((item) => item.status === "manual_review_required").length,
      blocked: items.filter((item) => item.status === "blocked").length
    },
    projectionInfo: {
      projectionCode: "MigrationParallelRunBoard",
      objectType: "workbench",
      objectId: companyId,
      sourceVersion: currentTimestamp,
      targetVersion: currentTimestamp,
      staleProjection: false
    }
  };
}

function buildMigrationParallelRunBoardRow({ parallelRunResult, cutoverPlan, currentTimestamp }) {
  const summary = parallelRunResult.differenceSummary || {};
  const attentionReasonCodes = [];
  if (parallelRunResult.status === "manual_review_required") {
    attentionReasonCodes.push("parallel_run_manual_review_required");
  }
  if (parallelRunResult.status === "blocked") {
    attentionReasonCodes.push("parallel_run_blocked");
  }
  if (parallelRunResult.status === "completed") {
    attentionReasonCodes.push("parallel_run_acceptance_pending");
  }
  return {
    objectType: "migrationParallelRunResult",
    parallelRunResultId: parallelRunResult.parallelRunResultId,
    comparisonScope: parallelRunResult.comparisonScope,
    cutoverPlanId: parallelRunResult.cutoverPlanId,
    cutoverStatus: cutoverPlan?.status || null,
    trialEnvironmentProfileId: parallelRunResult.trialEnvironmentProfileId || null,
    liveCompanyId: parallelRunResult.liveCompanyId || null,
    status: parallelRunResult.status,
    recordedAt: parallelRunResult.completedAt,
    acceptedAt: parallelRunResult.acceptedAt || null,
    acceptedByUserId: parallelRunResult.acceptedByUserId || null,
    thresholdProfile: parallelRunResult.thresholdProfile || {},
    metricCount: Number(summary.totalMetrics || 0),
    breachedMetricCount: Number(summary.breachedMetrics || 0),
    hardBlockCount: Number(summary.blockingMetrics || 0),
    maxAbsDeltaValue: Number(summary.maxAbsDeltaValue || 0),
    maxAbsDeltaPercent: Number(summary.maxAbsDeltaPercent || 0),
    queueCode: "MIGRATION_PARALLEL_RUN",
    ownerQueue: "migration_operator",
    blockedCount: Number(summary.breachedMetrics || 0) + Number(summary.blockingMetrics || 0),
    escalationPolicyCode:
      parallelRunResult.status === "blocked"
        ? "parallel_run_blocked"
        : parallelRunResult.status === "manual_review_required"
          ? "parallel_run_manual_review"
          : "parallel_run_acceptance",
    requiresAttention: attentionReasonCodes.length > 0,
    attentionReasonCodes,
    ageHours: computeAgeHours(parallelRunResult.completedAt, currentTimestamp)
  };
}

function buildMigrationAcceptanceBoard({
  companyId,
  acceptanceRecords,
  cutoverPlans,
  postCutoverCorrectionCases,
  currentTimestamp
}) {
  const cutoverPlansById = new Map(cutoverPlans.map((cutoverPlan) => [cutoverPlan.cutoverPlanId, cutoverPlan]));
  const correctionCasesByCutoverPlanId = new Map();
  for (const correctionCase of postCutoverCorrectionCases) {
    if (!correctionCasesByCutoverPlanId.has(correctionCase.cutoverPlanId)) {
      correctionCasesByCutoverPlanId.set(correctionCase.cutoverPlanId, []);
    }
    correctionCasesByCutoverPlanId.get(correctionCase.cutoverPlanId).push(correctionCase);
  }
  const items = acceptanceRecords
    .map((acceptanceRecord) =>
      buildMigrationAcceptanceBoardRow({
        acceptanceRecord,
        cutoverPlan: cutoverPlansById.get(acceptanceRecord.cutoverPlanId) || null,
        correctionCases: correctionCasesByCutoverPlanId.get(acceptanceRecord.cutoverPlanId) || [],
        currentTimestamp
      })
    )
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
  const queueSummary = buildMigrationQueueSummary({
    queueCode: "MIGRATION_ACCEPTANCE",
    ownerQueue: "migration_operator",
    items,
    currentTimestamp
  });
  return {
    boardCode: "MigrationAcceptanceBoard",
    title: "Migration acceptance board",
    scope: "company",
    companyId,
    defaultViewCode: "blocked",
    views: [
      { viewCode: "blocked", label: "Blocked", filter: { status: ["blocked"] } },
      { viewCode: "accepted", label: "Accepted", filter: { status: ["accepted"] } },
      { viewCode: "goLiveReadiness", label: "Go-live readiness", filter: { acceptanceType: ["go_live_readiness"] } }
    ],
    filters: [
      { filterCode: "status", inputType: "enum", values: MIGRATION_ACCEPTANCE_RECORD_STATUSES },
      { filterCode: "acceptanceType", inputType: "string" },
      { filterCode: "cutoverPlanId", inputType: "string" }
    ],
    sortOptions: [
      { sortCode: "recent", field: "recordedAt", direction: "desc" },
      { sortCode: "status", field: "status", direction: "asc" }
    ],
    commandBar: {
      contextObject: { objectType: "migrationAcceptanceBoard", objectId: companyId },
      availableCommands: [
        { actionCode: "migration.openAcceptanceRecords", label: "Open acceptance records" },
        { actionCode: "migration.openCutoverCockpit", label: "Open cutover cockpit" }
      ],
      recentCommands: [],
      quickFilters: ["blocked", "accepted", "goLiveReadiness"],
      createActions: []
    },
    items,
    queueSummary,
    counters: {
      total: items.length,
      accepted: items.filter((item) => item.status === "accepted").length,
      blocked: items.filter((item) => item.status === "blocked").length,
      goLiveReadinessAccepted: items.filter((item) => item.acceptanceType === "go_live_readiness" && item.status === "accepted").length,
      linkedCorrectionOpen: items.filter((item) => item.postCutoverCorrectionOpenCount > 0).length
    },
    projectionInfo: {
      projectionCode: "MigrationAcceptanceBoard",
      objectType: "workbench",
      objectId: companyId,
      sourceVersion: currentTimestamp,
      targetVersion: currentTimestamp,
      staleProjection: false
    }
  };
}

function buildMigrationAcceptanceBoardRow({ acceptanceRecord, cutoverPlan, correctionCases, currentTimestamp }) {
  const openCorrectionCases = correctionCases.filter((correctionCase) => correctionCase.status === "open");
  const unresolvedMaterialDifferences = acceptanceRecord.sourceParitySummary?.unresolvedMaterialDifferences || 0;
  const blockingReasonCodes = acceptanceRecord.blockingReasonCodes || [];
  const attentionReasonCodes = [];
  if (acceptanceRecord.status === "blocked") {
    attentionReasonCodes.push("acceptance_blocked");
  }
  if (unresolvedMaterialDifferences > 0) {
    attentionReasonCodes.push("material_differences_unresolved");
  }
  if (openCorrectionCases.length > 0) {
    attentionReasonCodes.push("post_cutover_correction_open");
  }
  return {
    objectType: "migrationAcceptanceRecord",
    migrationAcceptanceRecordId: acceptanceRecord.migrationAcceptanceRecordId,
    acceptanceType: acceptanceRecord.acceptanceType,
    cutoverPlanId: acceptanceRecord.cutoverPlanId,
    cutoverStatus: cutoverPlan?.status || null,
    status: acceptanceRecord.status,
    recordedAt: acceptanceRecord.recordedAt,
    rollbackPointRef: acceptanceRecord.rollbackPointRef,
    blockingReasonCodes,
    unresolvedMaterialDifferences,
    signoffRefCount: (acceptanceRecord.signoffRefs || []).length,
    postCutoverCorrectionOpenCount: openCorrectionCases.length,
    queueCode: "MIGRATION_ACCEPTANCE",
    ownerQueue: "migration_operator",
    blockedCount: blockingReasonCodes.length + openCorrectionCases.length,
    escalationPolicyCode: acceptanceRecord.status === "blocked" ? "migration_acceptance_blocked" : "migration_acceptance_review",
    requiresAttention: attentionReasonCodes.length > 0,
    attentionReasonCodes,
    ageHours: computeAgeHours(acceptanceRecord.recordedAt, currentTimestamp),
    paritySummary: {
      openingBalanceParityPassed: acceptanceRecord.sourceParitySummary?.openingBalanceParityPassed === true,
      openReceivablesParityPassed: acceptanceRecord.sourceParitySummary?.openReceivablesParityPassed === true,
      openPayablesParityPassed: acceptanceRecord.sourceParitySummary?.openPayablesParityPassed === true,
      payrollYtdParityPassed: acceptanceRecord.sourceParitySummary?.payrollYtdParityPassed === true,
      agiHistoryParityPassed: acceptanceRecord.sourceParitySummary?.agiHistoryParityPassed === true,
      taxAccountParityPassed: acceptanceRecord.sourceParitySummary?.taxAccountParityPassed === true
    }
  };
}

function buildMigrationQueueSummary({ queueCode, ownerQueue, items, currentTimestamp }) {
  const openItems = items.filter((item) => !["closed", "rolled_back"].includes(item.status));
  return [
    {
      queueCode,
      ownerQueue,
      openCount: openItems.length,
      blockedCount: items.reduce((sum, item) => sum + (item.blockedCount || 0), 0),
      attentionRequiredCount: items.filter((item) => item.requiresAttention).length,
      oldestOpenAgeHours: openItems.reduce(
        (maxAge, item) => Math.max(maxAge, computeAgeHours(item.recordedAt || item.freezeAt || currentTimestamp, currentTimestamp)),
        0
      )
    }
  ];
}

function resolveMigrationCutoverActionCodes(cutoverPlan) {
  if (["planned", "freeze_started", "final_extract_done"].includes(cutoverPlan.status)) {
    return ["migration.recordSignoff", "migration.updateChecklist", "migration.validateCutover"];
  }
  if (cutoverPlan.status === "validation_passed") {
    return ["migration.switchCutover", "migration.openAcceptanceRecords"];
  }
  if (["switched", "stabilized"].includes(cutoverPlan.status)) {
    return ["migration.openCorrectionCase", "migration.startRollback", "migration.openSupport"];
  }
  if (cutoverPlan.status === "rollback_in_progress") {
    return ["migration.completeRollback", "migration.openIncident"];
  }
  return ["migration.openAcceptanceRecords"];
}

function computeAgeHours(referenceTimestamp, currentTimestamp) {
  if (!referenceTimestamp || !currentTimestamp) {
    return 0;
  }
  const delta = new Date(currentTimestamp).getTime() - new Date(referenceTimestamp).getTime();
  return delta > 0 ? Math.floor(delta / 3600000) : 0;
}

function resolveMigrationCutoverBoardTimestamp(item) {
  return (
    item.rollbackCompletedAt
    || item.rollbackStartedAt
    || item.stabilizedAt
    || item.switchedAt
    || item.latestAcceptanceRecordedAt
    || item.lastExtractAt
    || item.freezeAt
    || ""
  );
}

function hasBlockingDiffReports(state, companyId) {
  const reports = [...state.diffReports.values()].filter((diffReport) => diffReport.companyId === companyId);
  if (reports.length === 0) {
    return true;
  }
  return reports.some((diffReport) => diffReport.status === "remediation_required");
}

function findLatestAcceptedMigrationAcceptanceRecord(state, companyId, cutoverPlanId) {
  return [...state.migrationAcceptanceRecords.values()]
    .filter((record) => record.companyId === companyId)
    .filter((record) => record.cutoverPlanId === cutoverPlanId)
    .filter((record) => record.status === "accepted")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
}

function findLatestMigrationAcceptanceRecord(state, companyId, cutoverPlanId) {
  return [...state.migrationAcceptanceRecords.values()]
    .filter((record) => record.companyId === companyId)
    .filter((record) => record.cutoverPlanId === cutoverPlanId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
}

function hasUnresolvedPrivilegedAccessFindings(state, companyId) {
  return [...state.accessReviewBatches.values()]
    .filter((review) => review.companyId === companyId)
    .some(
      (review) =>
        review.findings.length > 0
        && !["signed_off", "archived"].includes(review.status)
    );
}

async function hasOpenRegulatedSubmissionDeadLetters({ companyId, listRuntimeJobs, listRuntimeDeadLetters }) {
  if (typeof listRuntimeJobs !== "function" || typeof listRuntimeDeadLetters !== "function") {
    return false;
  }
  const [jobs, deadLetters] = await Promise.all([
    listRuntimeJobs({ companyId, status: "dead_lettered" }),
    listRuntimeDeadLetters({ companyId })
  ]);
  const deadLetterByJobId = new Map((deadLetters || []).map((deadLetter) => [deadLetter.jobId, deadLetter]));
  return (jobs || []).some((job) => {
    const deadLetter = deadLetterByJobId.get(job.jobId);
    if (!deadLetter || ["resolved", "closed"].includes(deadLetter.operatorState)) {
      return false;
    }
    return job.sourceObjectType === "submission" || job.jobType.startsWith("submission.");
  });
}

function resolveCutoverRollbackMode(cutoverPlan, error) {
  if (["planned", "freeze_started", "final_extract_done", "validation_passed"].includes(cutoverPlan.status)) {
    return "pre_switch_purge";
  }
  if (["switched", "stabilized"].includes(cutoverPlan.status)) {
    return "post_switch_compensation";
  }
  if (cutoverPlan.status === "closed") {
    throw error(
      409,
      "cutover_rollback_window_closed",
      "Closed cutovers require post-cutover correction cases instead of rollback."
    );
  }
  throw error(409, "cutover_rollback_invalid_state", "Rollback is not allowed for the current cutover state.");
}

function listPostSwitchSubmittedRegulatedSubmissions({ companyId, switchedAt, listAuthoritySubmissions }) {
  if (!switchedAt || typeof listAuthoritySubmissions !== "function") {
    return [];
  }
  const switchedAtTime = new Date(timestamp(switchedAt, "cutover_switched_at_required")).getTime();
  return (listAuthoritySubmissions({ companyId }) || [])
    .filter((submission) => submission?.submittedAt)
    .filter((submission) => new Date(submission.submittedAt).getTime() >= switchedAtTime)
    .map(clone);
}

function buildRollbackCompletionReceipt({
  rollbackPlan,
  integrationsSuspended,
  switchMarkersReversed,
  auditEvidencePreserved,
  immutableReceiptsPreserved,
  stagedObjectsPurged,
  recoveryPlanActivated,
  error
}) {
  if (rollbackPlan.rollbackExecutionMode === "pre_switch_purge") {
    if (stagedObjectsPurged !== true) {
      throw error(
        409,
        "cutover_rollback_stage_purge_confirmation_required",
        "Pre-switch rollback completion requires stagedObjectsPurged=true."
      );
    }
    if (auditEvidencePreserved !== true) {
      throw error(
        409,
        "cutover_rollback_audit_preservation_required",
        "Rollback completion requires auditEvidencePreserved=true."
      );
    }
    return {
      rollbackExecutionMode: rollbackPlan.rollbackExecutionMode,
      stagedObjectsPurged: true,
      integrationsSuspended: false,
      switchMarkersReversed: false,
      auditEvidencePreserved: true,
      immutableReceiptsPreserved: true,
      recoveryPlanActivated: false
    };
  }

  if (integrationsSuspended !== true) {
    throw error(
      409,
      "cutover_rollback_integrations_suspend_confirmation_required",
      "Post-switch rollback completion requires integrationsSuspended=true."
    );
  }
  if (switchMarkersReversed !== true) {
    throw error(
      409,
      "cutover_rollback_switch_marker_confirmation_required",
      "Post-switch rollback completion requires switchMarkersReversed=true."
    );
  }
  if (auditEvidencePreserved !== true) {
    throw error(
      409,
      "cutover_rollback_audit_preservation_required",
      "Rollback completion requires auditEvidencePreserved=true."
    );
  }
  if (immutableReceiptsPreserved !== true) {
    throw error(
      409,
      "cutover_rollback_immutable_receipt_preservation_required",
      "Post-switch rollback completion requires immutableReceiptsPreserved=true."
    );
  }
  if (rollbackPlan.regulatedSubmissionRecoveryPlan && recoveryPlanActivated !== true) {
    throw error(
      409,
      "cutover_rollback_recovery_plan_activation_required",
      "Rollback completion requires regulated submission recovery plan activation."
    );
  }
  return {
    rollbackExecutionMode: rollbackPlan.rollbackExecutionMode,
    stagedObjectsPurged: false,
    integrationsSuspended: true,
    switchMarkersReversed: true,
    auditEvidencePreserved: true,
    immutableReceiptsPreserved: true,
    recoveryPlanActivated: rollbackPlan.regulatedSubmissionRecoveryPlan ? true : false
  };
}

function hasFreshRestoreDrill({ state, companyId, restoreDrillFreshnessDays, clock }) {
  if (!restoreDrillFreshnessDays || restoreDrillFreshnessDays <= 0) {
    return false;
  }
  const latestPassedDrill = [...state.restoreDrills.values()]
    .filter((drill) => drill.companyId === companyId)
    .filter((drill) => drill.status === "passed")
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))[0];
  if (!latestPassedDrill) {
    return false;
  }
  const latestRecordedAt = new Date(latestPassedDrill.recordedAt);
  const freshnessBoundary = new Date(clock());
  freshnessBoundary.setUTCDate(freshnessBoundary.getUTCDate() - restoreDrillFreshnessDays);
  return latestRecordedAt.getTime() >= freshnessBoundary.getTime();
}

function addHoursIso(timestampValue, hours) {
  const value = new Date(timestamp(timestampValue, "cutover_switched_at_required"));
  value.setUTCHours(value.getUTCHours() + normalizePositiveInteger(hours, "cutover_stabilization_window_hours_invalid"));
  return value.toISOString();
}

function normalizeUniqueCodes(values, code) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => normalizeCode(value, code)))];
}

function normalizeRequiredRoleCodes(values) {
  const normalized = normalizeUniqueCodes(values, "payroll_migration_approval_role_required");
  return normalized.length > 0 ? normalized : ["PAYROLL_OWNER"];
}

function normalizePositiveInteger(value, code) {
  const resolved = Number(value);
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw createValidationError(code, `${code} must be a positive integer.`);
  }
  return resolved;
}

function assertAllowed(value, allowedValues, code) {
  const resolved = text(value, code);
  if (!allowedValues.includes(resolved)) {
    throw createValidationError(code, `${code} does not allow ${resolved}.`);
  }
  return resolved;
}

function normalizeNumber(value, code) {
  const resolved = Number(value);
  if (!Number.isFinite(resolved)) {
    throw createValidationError(code, `${code} must be a finite number.`);
  }
  return roundMoney(resolved);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function timestamp(value, code) {
  const parsed = new Date(text(value, code));
  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError(code, `${code} must be a valid timestamp.`);
  }
  return parsed.toISOString();
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createValidationError(code, `${code} is required.`);
  }
  return value.trim();
}

function normalizeCode(value, code) {
  return text(value, code).replace(/\s+/g, "_").toUpperCase();
}

function reportingPeriod(value, code) {
  const resolved = text(value, code);
  if (!/^\d{4}-\d{2}$/.test(resolved)) {
    throw createValidationError(code, `${code} must be in YYYY-MM format.`);
  }
  return resolved;
}

function dateOnly(value, code) {
  const resolved = text(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createValidationError(code, `${code} must be in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${resolved}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError(code, `${code} must be a valid date.`);
  }
  return resolved;
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}


function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function createValidationError(code, message) {
  const instance = new Error(message);
  instance.status = 400;
  instance.code = code;
  return instance;
}
