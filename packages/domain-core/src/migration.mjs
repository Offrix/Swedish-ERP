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

export function createMigrationModule({
  state,
  clock = () => new Date(),
  orgAuthPlatform,
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
    getMigrationCockpit
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
