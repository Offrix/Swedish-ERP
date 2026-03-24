import crypto from "node:crypto";

export const IMPORT_BATCH_STATUSES = Object.freeze(["received", "validated", "mapped", "imported", "reconciled", "accepted", "rejected", "corrected"]);
export const MAPPING_SET_STATUSES = Object.freeze(["draft", "approved"]);
export const DIFF_REPORT_STATUSES = Object.freeze(["generated", "reviewed", "accepted", "remediation_required"]);
export const DIFFERENCE_CLASSES = Object.freeze(["cosmetic", "timing", "mapping_error", "missing_data", "material"]);
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

export function createMigrationModule({
  state,
  clock = () => new Date(),
  orgAuthPlatform,
  hrPlatform = null,
  balancesPlatform = null,
  collectiveAgreementsPlatform = null,
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
    cutoverPlanStatuses: CUTOVER_PLAN_STATUSES,
    payrollMigrationBatchStatuses: PAYROLL_MIGRATION_BATCH_STATUSES,
    payrollMigrationModes: PAYROLL_MIGRATION_MODES,
    employeeMigrationValidationStates: EMPLOYEE_MIGRATION_VALIDATION_STATES,
    payrollMigrationDiffStatuses: PAYROLL_MIGRATION_DIFF_STATUSES,
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
    createCutoverPlan,
    listCutoverPlans,
    recordCutoverSignoff,
    updateCutoverChecklistItem,
    startCutover,
    completeFinalExtract,
    passCutoverValidation,
    switchCutover,
    stabilizeCutover,
    startRollback,
    completeRollback,
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

  function createCutoverPlan({
    sessionToken,
    companyId,
    freezeAt,
    rollbackPoint,
    signoffChain = [],
    goLiveChecklist = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = {
      cutoverPlanId: crypto.randomUUID(),
      companyId,
      freezeAt: timestamp(freezeAt, "cutover_freeze_at_required"),
      lastExtractAt: null,
      validationGateStatus: "pending",
      rollbackPoint: text(rollbackPoint, "cutover_rollback_point_required"),
      signoffChain: normalizeSignoffChain(signoffChain),
      goLiveChecklist: normalizeChecklist(goLiveChecklist),
      status: "planned",
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

  function passCutoverValidation({
    sessionToken,
    companyId,
    cutoverPlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (cutoverPlan.status !== "final_extract_done") {
      throw error(409, "cutover_validation_invalid_state", "Cutover validation requires completed final extract.");
    }
    cutoverPlan.validationGateStatus = "passed";
    cutoverPlan.status = "validation_passed";
    cutoverPlan.updatedAt = nowIso(clock);
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
    cutoverPlan.updatedAt = nowIso(clock);
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
    if (cutoverPlan.status !== "switched") {
      throw error(409, "cutover_stabilize_invalid_state", "Cutover must be switched before stabilization.");
    }
    cutoverPlan.status = close === true ? "closed" : "stabilized";
    cutoverPlan.updatedAt = nowIso(clock);
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
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (!cutoverPlan.rollbackPoint) {
      throw error(409, "cutover_rollback_point_missing", "Rollback requires a rollback point.");
    }
    cutoverPlan.status = "rollback_in_progress";
    cutoverPlan.rollbackReasonCode = text(reasonCode, "cutover_rollback_reason_required");
    cutoverPlan.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.rolled_back",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Rolled back cutover ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  function completeRollback({
    sessionToken,
    companyId,
    cutoverPlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const cutoverPlan = requireCutoverPlan(companyId, cutoverPlanId);
    if (cutoverPlan.status !== "rollback_in_progress") {
      throw error(409, "cutover_rollback_not_started", "Rollback must be started before completion.");
    }
    cutoverPlan.status = "rolled_back";
    cutoverPlan.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "migration.cutover.rollback_completed",
      entityType: "migration_cutover_plan",
      entityId: cutoverPlan.cutoverPlanId,
      explanation: `Completed rollback for ${cutoverPlan.cutoverPlanId}.`
    });
    return clone(cutoverPlan);
  }

  function getMigrationCockpit({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return {
      mappingSets: listMappingSets({ sessionToken, companyId }),
      importBatches: listImportBatches({ sessionToken, companyId }),
      corrections: [...state.migrationCorrections.values()]
        .filter((correction) => correction.companyId === text(companyId, "company_id_required"))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map(clone),
      diffReports: listDiffReports({ sessionToken, companyId }),
      cutoverPlans: listCutoverPlans({ sessionToken, companyId })
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
      baselineCoverage: summarizeEmployeeBaselineCoverage(batch, record)
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
        baselineCoverage: summarizeEmployeeBaselineCoverage(batch, record)
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
    const agreementVersionId = optionalText(value?.agreementVersionId);
    if (agreementVersionId && collectiveAgreementsPlatform?.getAgreementVersion) {
      collectiveAgreementsPlatform.getAgreementVersion({ companyId, agreementVersionId });
    }
    const validationErrors = [];
    return {
      payrollMigrationBatchId: batch.payrollMigrationBatchId,
      companyId,
      personId: text(value?.personId, "payroll_migration_person_id_required"),
      employeeId,
      employmentId,
      sourceEmployeeRef: optionalText(value?.sourceEmployeeRef) || text(value?.personId, "payroll_migration_person_id_required"),
      ytdBasis: normalizePayrollMigrationYtdBasis(value?.ytdBasis, validationErrors),
      priorPayslipSummary: clone(value?.priorPayslipSummary || {}),
      agiCarryForwardBasis: normalizeAgiCarryForwardBasis(value?.agiCarryForwardBasis, validationErrors),
      agreementVersionId,
      validationState: validationErrors.length > 0 ? "blocking" : "valid",
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

function normalizeChecklistStatus(value) {
  const resolved = text(value, "cutover_checklist_status_required");
  if (!["open", "completed", "blocked"].includes(resolved)) {
    throw createValidationError("cutover_checklist_status_invalid", `cutover_checklist_status_invalid does not allow ${resolved}.`);
  }
  return resolved;
}

function hasBlockingDiffReports(state, companyId) {
  const reports = [...state.diffReports.values()].filter((diffReport) => diffReport.companyId === companyId);
  if (reports.length === 0) {
    return true;
  }
  return reports.some((diffReport) => diffReport.status === "remediation_required");
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

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createValidationError(code, message) {
  const instance = new Error(message);
  instance.status = 400;
  instance.code = code;
  return instance;
}
