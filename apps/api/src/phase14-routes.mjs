import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14Route({ req, res, url, path, platform }) {
  if (req.method === "POST" && path === "/v1/backoffice/support-cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: companyId, scopeCode: "support_case" });
    writeJson(res, 201, platform.createSupportCase({
      sessionToken,
      companyId,
      category: body.category,
      severity: body.severity,
      requester: body.requester,
      relatedObjectRefs: body.relatedObjectRefs,
      policyScope: body.policyScope,
      approvedActions: body.approvedActions,
      ownerUserId: body.ownerUserId
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/support-cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "support_case", objectId: companyId, scopeCode: "support_case" });
    writeJson(res, 200, { items: platform.listSupportCases({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const supportApprovalMatch = matchPath(path, "/v1/backoffice/support-cases/:supportCaseId/approve-actions");
  if (req.method === "POST" && supportApprovalMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: supportApprovalMatch.supportCaseId, scopeCode: "support_case" });
    writeJson(res, 200, platform.approveSupportCaseActions({
      sessionToken,
      companyId,
      supportCaseId: supportApprovalMatch.supportCaseId,
      approvedActions: body.approvedActions
    }));
    return true;
  }

  const supportDiagnosticMatch = matchPath(path, "/v1/backoffice/support-cases/:supportCaseId/diagnostics");
  if (req.method === "POST" && supportDiagnosticMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "admin_diagnostic", objectId: supportDiagnosticMatch.supportCaseId, scopeCode: "admin_diagnostic" });
    writeJson(res, 201, platform.runAdminDiagnostic({
      sessionToken,
      companyId,
      supportCaseId: supportDiagnosticMatch.supportCaseId,
      commandType: body.commandType,
      input: body.input || {}
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/audit-events") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_event", objectId: companyId, scopeCode: "audit_event" });
    writeJson(res, 200, {
      items: platform.listAuditTrail({
        sessionToken,
        companyId,
        entityType: optionalText(url.searchParams.get("entityType")),
        correlationId: optionalText(url.searchParams.get("correlationId"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/impersonations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "impersonation_session", objectId: companyId, scopeCode: "impersonation_session" });
    writeJson(res, 201, platform.requestImpersonation({
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      targetCompanyUserId: body.targetCompanyUserId,
      purposeCode: body.purposeCode,
      mode: body.mode,
      expiresInMinutes: body.expiresInMinutes,
      restrictedActions: body.restrictedActions
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/impersonations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "impersonation_session", objectId: companyId, scopeCode: "impersonation_session" });
    writeJson(res, 200, { items: platform.listImpersonationSessions({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const impersonationApproveMatch = matchPath(path, "/v1/backoffice/impersonations/:sessionId/approve");
  if (req.method === "POST" && impersonationApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "impersonation_session", objectId: impersonationApproveMatch.sessionId, scopeCode: "impersonation_session" });
    writeJson(res, 200, platform.approveImpersonation({ sessionToken, companyId, sessionId: impersonationApproveMatch.sessionId }));
    return true;
  }

  const impersonationEndMatch = matchPath(path, "/v1/backoffice/impersonations/:sessionId/end");
  if (req.method === "POST" && impersonationEndMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "impersonation_session", objectId: impersonationEndMatch.sessionId, scopeCode: "impersonation_session" });
    writeJson(res, 200, platform.terminateImpersonation({ sessionToken, companyId, sessionId: impersonationEndMatch.sessionId, reasonCode: body.reasonCode }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/access-reviews") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "access_review_batch", objectId: companyId, scopeCode: "access_review_batch" });
    writeJson(res, 201, platform.generateAccessReview({
      sessionToken,
      companyId,
      scopeType: body.scopeType,
      scopeRef: body.scopeRef,
      dueInDays: body.dueInDays
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/access-reviews") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "access_review_batch", objectId: companyId, scopeCode: "access_review_batch" });
    writeJson(res, 200, { items: platform.listAccessReviews({ sessionToken, companyId }) });
    return true;
  }

  const accessReviewDecisionMatch = matchPath(path, "/v1/backoffice/access-reviews/:reviewBatchId/findings/:findingId");
  if (req.method === "POST" && accessReviewDecisionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "access_review_batch", objectId: accessReviewDecisionMatch.reviewBatchId, scopeCode: "access_review_batch" });
    writeJson(res, 200, platform.recordAccessReviewDecision({
      sessionToken,
      companyId,
      reviewBatchId: accessReviewDecisionMatch.reviewBatchId,
      findingId: accessReviewDecisionMatch.findingId,
      decision: body.decision,
      remediationNote: body.remediationNote
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/break-glass") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: companyId, scopeCode: "break_glass_session" });
    writeJson(res, 201, platform.requestBreakGlass({
      sessionToken,
      companyId,
      incidentId: body.incidentId,
      purposeCode: body.purposeCode,
      requestedActions: body.requestedActions
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/break-glass") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "break_glass_session", objectId: companyId, scopeCode: "break_glass_session" });
    writeJson(res, 200, { items: platform.listBreakGlassSessions({ sessionToken, companyId }) });
    return true;
  }

  const breakGlassApproveMatch = matchPath(path, "/v1/backoffice/break-glass/:breakGlassId/approve");
  if (req.method === "POST" && breakGlassApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: breakGlassApproveMatch.breakGlassId, scopeCode: "break_glass_session" });
    writeJson(res, 200, platform.approveBreakGlass({ sessionToken, companyId, breakGlassId: breakGlassApproveMatch.breakGlassId }));
    return true;
  }

  const breakGlassCloseMatch = matchPath(path, "/v1/backoffice/break-glass/:breakGlassId/close");
  if (req.method === "POST" && breakGlassCloseMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: breakGlassCloseMatch.breakGlassId, scopeCode: "break_glass_session" });
    writeJson(res, 200, platform.closeBreakGlassSession({ sessionToken, companyId, breakGlassId: breakGlassCloseMatch.breakGlassId }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/feature-flags") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "feature_flag", objectId: companyId, scopeCode: "feature_flag" });
    writeJson(res, 201, platform.upsertFeatureFlag({
      sessionToken,
      companyId,
      flagKey: body.flagKey,
      description: body.description,
      defaultEnabled: body.defaultEnabled,
      flagType: body.flagType,
      scopeType: body.scopeType,
      scopeRef: body.scopeRef,
      enabled: body.enabled,
      ownerUserId: body.ownerUserId,
      riskClass: body.riskClass,
      sunsetAt: body.sunsetAt
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/feature-flags") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "feature_flag", objectId: companyId, scopeCode: "feature_flag" });
    writeJson(res, 200, {
      items: platform.listFeatureFlags({ sessionToken, companyId, flagKey: optionalText(url.searchParams.get("flagKey")) }),
      resolved: platform.resolveRuntimeFlags({ companyId, companyUserId: optionalText(url.searchParams.get("companyUserId")) })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/emergency-disables") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "emergency_disable", objectId: companyId, scopeCode: "emergency_disable" });
    writeJson(res, 201, platform.requestEmergencyDisable({
      sessionToken,
      companyId,
      flagKey: body.flagKey,
      scopeType: body.scopeType,
      scopeRef: body.scopeRef,
      reasonCode: body.reasonCode,
      expiresInMinutes: body.expiresInMinutes
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/emergency-disables") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "emergency_disable", objectId: companyId, scopeCode: "emergency_disable" });
    writeJson(res, 200, { items: platform.listEmergencyDisables({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/load-profiles") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "load_profile", objectId: companyId, scopeCode: "load_profile" });
    writeJson(res, 201, platform.recordLoadProfile({
      sessionToken,
      companyId,
      profileCode: body.profileCode,
      targetThroughputPerMinute: body.targetThroughputPerMinute,
      observedP95Ms: body.observedP95Ms,
      queueRecoverySeconds: body.queueRecoverySeconds,
      status: body.status
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/load-profiles") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "load_profile", objectId: companyId, scopeCode: "load_profile" });
    writeJson(res, 200, { items: platform.listLoadProfiles({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/restore-drills") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "restore_drill", objectId: companyId, scopeCode: "restore_drill" });
    writeJson(res, 201, platform.recordRestoreDrill({
      sessionToken,
      companyId,
      drillCode: body.drillCode,
      targetRtoMinutes: body.targetRtoMinutes,
      targetRpoMinutes: body.targetRpoMinutes,
      actualRtoMinutes: body.actualRtoMinutes,
      actualRpoMinutes: body.actualRpoMinutes,
      status: body.status,
      evidence: body.evidence
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/restore-drills") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "restore_drill", objectId: companyId, scopeCode: "restore_drill" });
    writeJson(res, 200, { items: platform.listRestoreDrills({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/chaos-scenarios") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "chaos_scenario", objectId: companyId, scopeCode: "chaos_scenario" });
    writeJson(res, 201, platform.recordChaosScenario({
      sessionToken,
      companyId,
      scenarioCode: body.scenarioCode,
      failureMode: body.failureMode,
      queueRecoverySeconds: body.queueRecoverySeconds,
      impactSummary: body.impactSummary,
      status: body.status,
      evidence: body.evidence
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/chaos-scenarios") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "chaos_scenario", objectId: companyId, scopeCode: "chaos_scenario" });
    writeJson(res, 200, { items: platform.listChaosScenarios({ sessionToken, companyId }) });
    return true;
  }

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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_mapping_set", objectId: companyId, scopeCode: "migration_mapping_set" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_import_batch", objectId: companyId, scopeCode: "migration_import_batch" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_diff_report", objectId: companyId, scopeCode: "migration_diff_report" });
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
      signoffChain: body.signoffChain,
      goLiveChecklist: body.goLiveChecklist
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cutover-plans") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cutover_plan", objectId: companyId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, { items: platform.listCutoverPlans({ sessionToken, companyId }) });
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
    writeJson(res, 200, platform.passCutoverValidation({ sessionToken, companyId, cutoverPlanId: cutoverValidateMatch.cutoverPlanId }));
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
    writeJson(res, 200, platform.startRollback({ sessionToken, companyId, cutoverPlanId: cutoverRollbackMatch.cutoverPlanId, reasonCode: body.reasonCode }));
    return true;
  }

  const cutoverRollbackCompleteMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/rollback/complete");
  if (req.method === "POST" && cutoverRollbackCompleteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverRollbackCompleteMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.completeRollback({ sessionToken, companyId, cutoverPlanId: cutoverRollbackCompleteMatch.cutoverPlanId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cockpit") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cockpit", objectId: companyId, scopeCode: "migration_cockpit" });
    writeJson(res, 200, platform.getMigrationCockpit({ sessionToken, companyId }));
    return true;
  }

  return false;
}
