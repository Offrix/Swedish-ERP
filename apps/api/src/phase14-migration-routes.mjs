import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14MigrationRoutes({ req, res, url, path, platform, helpers }) {
  const { assertPayrollOperationsReadAccess } = helpers;

  if (req.method === "POST" && path === "/v1/migration/mapping-sets") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_mapping_set", objectId: companyId, scopeCode: "migration_mapping_set" });
    writeJson(res, 201, platform.createMappingSet({
      sessionToken,
      companyId,
      sourceSystem: body.sourceSystem,
      domainScope: body.domainScope,
      versionNo: body.versionNo,
      mappings: body.mappings
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/mapping-sets") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_mapping_set", objectId: companyId, scopeCode: "migration_mapping_set" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listMappingSets({ sessionToken, companyId, sourceSystem: optionalText(url.searchParams.get("sourceSystem")) }) });
    return true;
  }

  const mappingApproveMatch = matchPath(path, "/v1/migration/mapping-sets/:mappingSetId/approve");
  if (req.method === "POST" && mappingApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_mapping_set", objectId: mappingApproveMatch.mappingSetId, scopeCode: "migration_mapping_set" });
    writeJson(res, 200, platform.approveMappingSet({ sessionToken, companyId, mappingSetId: mappingApproveMatch.mappingSetId, batchIds: body.batchIds }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/import-batches") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_import_batch", objectId: companyId, scopeCode: "migration_import_batch" });
    writeJson(res, 201, platform.registerImportBatch({
      sessionToken,
      companyId,
      sourceSystem: body.sourceSystem,
      batchType: body.batchType,
      recordCount: body.recordCount,
      hash: body.hash,
      scope: body.scope,
      mappingSetId: body.mappingSetId,
      objectRefs: body.objectRefs
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/import-batches") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_import_batch", objectId: companyId, scopeCode: "migration_import_batch" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listImportBatches({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const importRunMatch = matchPath(path, "/v1/migration/import-batches/:importBatchId/run");
  if (req.method === "POST" && importRunMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_import_batch", objectId: importRunMatch.importBatchId, scopeCode: "migration_import_batch" });
    writeJson(res, 200, platform.runImportBatch({ sessionToken, companyId, importBatchId: importRunMatch.importBatchId, autoAccept: body.autoAccept }));
    return true;
  }

  const importCorrectionMatch = matchPath(path, "/v1/migration/import-batches/:importBatchId/corrections");
  if (req.method === "POST" && importCorrectionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_correction", objectId: importCorrectionMatch.importBatchId, scopeCode: "migration_correction" });
    writeJson(res, 201, platform.recordManualMigrationCorrection({
      sessionToken,
      companyId,
      importBatchId: importCorrectionMatch.importBatchId,
      sourceObjectId: body.sourceObjectId,
      targetObjectId: body.targetObjectId,
      reasonCode: body.reasonCode,
      comment: body.comment
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/diff-reports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_diff_report", objectId: companyId, scopeCode: "migration_diff_report" });
    const diffReport = platform.generateDiffReport({
      sessionToken,
      companyId,
      comparisonScope: body.comparisonScope,
      sourceSnapshotRef: body.sourceSnapshotRef,
      targetSnapshotRef: body.targetSnapshotRef,
      differenceItems: body.differenceItems
    });
    platform.emitWebhookEvent({ companyId, eventType: "migration.diff.generated", resourceType: "migration_diff_report", resourceId: diffReport.diffReportId, payload: diffReport });
    writeJson(res, 201, diffReport);
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/diff-reports") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_diff_report", objectId: companyId, scopeCode: "migration_diff_report" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listDiffReports({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const diffDecisionMatch = matchPath(path, "/v1/migration/diff-reports/:diffReportId/items/:itemId");
  if (req.method === "POST" && diffDecisionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_diff_report", objectId: diffDecisionMatch.diffReportId, scopeCode: "migration_diff_report" });
    writeJson(res, 200, platform.recordDifferenceDecision({
      sessionToken,
      companyId,
      diffReportId: diffDecisionMatch.diffReportId,
      itemId: diffDecisionMatch.itemId,
      decision: body.decision,
      comment: body.comment
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/cutover-plans") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: companyId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 201, platform.createCutoverPlan({
      sessionToken,
      companyId,
      freezeAt: body.freezeAt,
      rollbackPoint: body.rollbackPoint,
      rollbackPointRef: body.rollbackPointRef,
      acceptedVarianceThresholds: body.acceptedVarianceThresholds,
      stabilizationWindowHours: body.stabilizationWindowHours,
      signoffChain: body.signoffChain,
      goLiveChecklist: body.goLiveChecklist
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cutover-plans") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cutover_plan", objectId: companyId, scopeCode: "migration_cutover_plan" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listCutoverPlans({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/acceptance-records") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_acceptance_record", objectId: companyId, scopeCode: "migration_cockpit" });
    writeJson(res, 201, platform.createMigrationAcceptanceRecord({
      sessionToken,
      companyId,
      acceptanceType: body.acceptanceType,
      cutoverPlanId: body.cutoverPlanId,
      importBatchIds: body.importBatchIds,
      diffReportIds: body.diffReportIds,
      sourceParitySummary: body.sourceParitySummary,
      signoffRefs: body.signoffRefs,
      rollbackPointRef: body.rollbackPointRef,
      notes: body.notes
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/acceptance-records") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_acceptance_record", objectId: companyId, scopeCode: "migration_cockpit" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listMigrationAcceptanceRecords({
        sessionToken,
        companyId,
        acceptanceType: optionalText(url.searchParams.get("acceptanceType")),
        status: optionalText(url.searchParams.get("status")),
        cutoverPlanId: optionalText(url.searchParams.get("cutoverPlanId"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/post-cutover-correction-cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_post_cutover_correction_case", objectId: companyId, scopeCode: "migration_cockpit" });
    writeJson(res, 201, platform.createPostCutoverCorrectionCase({
      sessionToken,
      companyId,
      cutoverPlanId: body.cutoverPlanId,
      reasonCode: body.reasonCode,
      linkedSourceBatchIds: body.linkedSourceBatchIds,
      targetObjectRefs: body.targetObjectRefs,
      regulatedSubmissionRefs: body.regulatedSubmissionRefs,
      acceptanceReportDelta: body.acceptanceReportDelta
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/post-cutover-correction-cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_post_cutover_correction_case", objectId: companyId, scopeCode: "migration_cockpit" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listPostCutoverCorrectionCases({
        sessionToken,
        companyId,
        cutoverPlanId: optionalText(url.searchParams.get("cutoverPlanId")),
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const cutoverSignoffMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/signoffs");
  if (req.method === "POST" && cutoverSignoffMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverSignoffMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.recordCutoverSignoff({ sessionToken, companyId, cutoverPlanId: cutoverSignoffMatch.cutoverPlanId }));
    return true;
  }

  const cutoverChecklistMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode");
  if (req.method === "POST" && cutoverChecklistMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverChecklistMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.updateCutoverChecklistItem({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverChecklistMatch.cutoverPlanId,
      itemCode: cutoverChecklistMatch.itemCode,
      status: body.status
    }));
    return true;
  }

  const cutoverStartMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/start");
  if (req.method === "POST" && cutoverStartMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverStartMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.startCutover({ sessionToken, companyId, cutoverPlanId: cutoverStartMatch.cutoverPlanId }));
    return true;
  }

  const cutoverExtractMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/final-extract");
  if (req.method === "POST" && cutoverExtractMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverExtractMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.completeFinalExtract({ sessionToken, companyId, cutoverPlanId: cutoverExtractMatch.cutoverPlanId, lastExtractAt: body.lastExtractAt }));
    return true;
  }

  const cutoverValidateMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/validate");
  if (req.method === "POST" && cutoverValidateMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverValidateMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, await platform.passCutoverValidation({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverValidateMatch.cutoverPlanId,
      contractTestsPassed: body.contractTestsPassed === true,
      goldenScenariosPassed: body.goldenScenariosPassed === true,
      runbooksAcknowledged: body.runbooksAcknowledged === true,
      restoreDrillFreshnessDays: body.restoreDrillFreshnessDays
    }));
    return true;
  }

  const cutoverSwitchMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/switch");
  if (req.method === "POST" && cutoverSwitchMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverSwitchMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.switchCutover({ sessionToken, companyId, cutoverPlanId: cutoverSwitchMatch.cutoverPlanId }));
    return true;
  }

  const cutoverStabilizeMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/stabilize");
  if (req.method === "POST" && cutoverStabilizeMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverStabilizeMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.stabilizeCutover({ sessionToken, companyId, cutoverPlanId: cutoverStabilizeMatch.cutoverPlanId, close: body.close === true }));
    return true;
  }

  const cutoverRollbackMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/rollback");
  if (req.method === "POST" && cutoverRollbackMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverRollbackMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.startRollback({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverRollbackMatch.cutoverPlanId,
      reasonCode: body.reasonCode,
      rollbackOwnerUserId: body.rollbackOwnerUserId,
      supportSignoffRef: body.supportSignoffRef,
      securitySignoffRef: body.securitySignoffRef,
      complianceSignoffRef: body.complianceSignoffRef,
      suspendIntegrationCodes: body.suspendIntegrationCodes,
      freezeOperationalIntake: body.freezeOperationalIntake,
      recoveryPlanCode: body.recoveryPlanCode,
      recoveryPlanNote: body.recoveryPlanNote
    }));
    return true;
  }

  const cutoverRollbackCompleteMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/rollback/complete");
  if (req.method === "POST" && cutoverRollbackCompleteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverRollbackCompleteMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.completeRollback({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverRollbackCompleteMatch.cutoverPlanId,
      integrationsSuspended: body.integrationsSuspended,
      switchMarkersReversed: body.switchMarkersReversed,
      auditEvidencePreserved: body.auditEvidencePreserved,
      immutableReceiptsPreserved: body.immutableReceiptsPreserved,
      stagedObjectsPurged: body.stagedObjectsPurged,
      recoveryPlanActivated: body.recoveryPlanActivated
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cockpit") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cockpit", objectId: companyId, scopeCode: "migration_cockpit" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getMigrationCockpit({ sessionToken, companyId }));
    return true;
  }

  return false;
}
