import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14BackofficeRoutes({ req, res, url, path, platform, helpers }) {
  const {
    OPEN_RUNTIME_REPLAY_PLAN_STATUSES,
    assertBackofficeReadAccess,
    buildBackofficeJobRows,
    buildBackofficeReplayRows,
    buildBackofficeDeadLetterRows,
    buildSubmissionMonitorPayload,
    buildSubmissionMonitorScan,
    resolveBackofficeOperatorBinding,
    resolveReviewSlaNotificationTarget,
    mapQueuePriorityToIncidentSeverity
  } = helpers;

  if (req.method === "POST" && path === "/v1/backoffice/support-cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: companyId, scopeCode: "support_case" });
    writeJson(res, 201, projectMaskedSupportCaseView(platform.createSupportCase({
      sessionToken,
      companyId,
      category: body.category,
      severity: body.severity,
      requester: body.requester,
      relatedObjectRefs: body.relatedObjectRefs,
      policyScope: body.policyScope,
      approvedActions: body.approvedActions,
      ownerUserId: body.ownerUserId
    })));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/support-cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "support_case", objectId: companyId, scopeCode: "support_case" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform
        .listSupportCases({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) })
        .map(projectMaskedSupportCaseView)
    });
    return true;
  }

  const supportCloseMatch = matchPath(path, "/v1/backoffice/support-cases/:supportCaseId/close");
  if (req.method === "POST" && supportCloseMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: supportCloseMatch.supportCaseId, scopeCode: "support_case" });
    writeJson(res, 200, projectMaskedSupportCaseView(platform.closeSupportCase({
      sessionToken,
      companyId,
      supportCaseId: supportCloseMatch.supportCaseId,
      resolutionCode: body.resolutionCode,
      resolutionNote: body.resolutionNote
    })));
    return true;
  }

  const supportApprovalMatch = matchPath(path, "/v1/backoffice/support-cases/:supportCaseId/approve-actions");
  if (req.method === "POST" && supportApprovalMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: supportApprovalMatch.supportCaseId, scopeCode: "support_case" });
    writeJson(res, 200, projectMaskedSupportCaseView(platform.approveSupportCaseActions({
      sessionToken,
      companyId,
      supportCaseId: supportApprovalMatch.supportCaseId,
      approvedActions: body.approvedActions
    })));
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
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_event", objectId: companyId, scopeCode: "audit_event" });
    assertBackofficeReadAccess({ principal });
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

  if (req.method === "GET" && path === "/v1/backoffice/audit-correlations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_correlation", objectId: companyId, scopeCode: "audit_event" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      query: {
        actorId: optionalText(url.searchParams.get("actorId")),
        entityType: optionalText(url.searchParams.get("entityType")),
        entityId: optionalText(url.searchParams.get("entityId"))
      },
      items: platform.listRuntimeAuditCorrelations({
        sessionToken,
        companyId,
        actorId: optionalText(url.searchParams.get("actorId")),
        entityType: optionalText(url.searchParams.get("entityType")),
        entityId: optionalText(url.searchParams.get("entityId"))
      })
    });
    return true;
  }

  const auditCorrelationMatch = matchPath(path, "/v1/backoffice/audit-correlations/:correlationId");
  if (req.method === "GET" && auditCorrelationMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_correlation", objectId: auditCorrelationMatch.correlationId, scopeCode: "audit_event" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      correlation: platform.getRuntimeAuditCorrelation({
        sessionToken,
        companyId,
        correlationId: auditCorrelationMatch.correlationId
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
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "impersonation_session", objectId: companyId, scopeCode: "impersonation_session" });
    assertBackofficeReadAccess({ principal });
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

  const impersonationStartMatch = matchPath(path, "/v1/backoffice/impersonations/:sessionId/start");
  if (req.method === "POST" && impersonationStartMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "impersonation_session", objectId: impersonationStartMatch.sessionId, scopeCode: "impersonation_session" });
    writeJson(res, 200, platform.activateImpersonation({ sessionToken, companyId, sessionId: impersonationStartMatch.sessionId }));
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
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "access_review_batch", objectId: companyId, scopeCode: "access_review_batch" });
    assertBackofficeReadAccess({ principal });
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
      requestedActions: body.requestedActions,
      expiresInMinutes: body.expiresInMinutes
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/break-glass") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "break_glass_session", objectId: companyId, scopeCode: "break_glass_session" });
    assertBackofficeReadAccess({ principal });
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

  const breakGlassStartMatch = matchPath(path, "/v1/backoffice/break-glass/:breakGlassId/start");
  if (req.method === "POST" && breakGlassStartMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: breakGlassStartMatch.breakGlassId, scopeCode: "break_glass_session" });
    writeJson(res, 200, platform.activateBreakGlass({ sessionToken, companyId, breakGlassId: breakGlassStartMatch.breakGlassId }));
    return true;
  }

  const breakGlassCloseMatch = matchPath(path, "/v1/backoffice/break-glass/:breakGlassId/close");
  if (req.method === "POST" && breakGlassCloseMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: breakGlassCloseMatch.breakGlassId, scopeCode: "break_glass_session" });
    writeJson(res, 200, platform.closeBreakGlassSession({
      sessionToken,
      companyId,
      breakGlassId: breakGlassCloseMatch.breakGlassId,
      reasonCode: body.reasonCode
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/jobs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "async_job", objectId: companyId, scopeCode: "async_job" });
    assertBackofficeReadAccess({ principal });
    const items = await buildBackofficeJobRows({
      platform,
      companyId,
      status: optionalText(url.searchParams.get("status")),
      jobType: optionalText(url.searchParams.get("jobType")),
      operatorState: optionalText(url.searchParams.get("operatorState"))
    });
    writeJson(res, 200, {
      items,
      counters: {
        highRiskOpen: items.filter((item) => item.riskClass === "high" && !["succeeded", "cancelled"].includes(item.status)).length,
        deadLetterOpen: items.filter((item) => item.deadLetter?.operatorState && item.deadLetter.operatorState !== "closed").length,
        replayPlanned: items.filter((item) => OPEN_RUNTIME_REPLAY_PLAN_STATUSES.has(item.replayPlan?.status)).length
      }
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/replays") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "async_job_replay_plan", objectId: companyId, scopeCode: "async_job" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: await buildBackofficeReplayRows({
        platform,
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const replayApproveMatch = matchPath(path, "/v1/backoffice/replays/:replayPlanId/approve");
  if (req.method === "POST" && replayApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_job_replay_plan", objectId: replayApproveMatch.replayPlanId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: "plan_job_replay"
    });
    const replayPlan = await platform.approveRuntimeJobReplay({
      replayPlanId: replayApproveMatch.replayPlanId,
      approvedByUserId: principal.userId
    });
    const replayOperation = await platform.recordReplayOperationApproval?.({
      sessionToken,
      companyId,
      replayPlan,
      supportCaseId: body.supportCaseId ?? null,
      incidentId: body.incidentId ?? null,
      correlationId: body.correlationId ?? undefined
    }) || null;
    writeJson(res, 200, { replayPlan, replayOperation });
    return true;
  }

  const replayExecuteMatch = matchPath(path, "/v1/backoffice/replays/:replayPlanId/execute");
  if (req.method === "POST" && replayExecuteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_job_replay_plan", objectId: replayExecuteMatch.replayPlanId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: "execute_job_replay"
    });
    const replay = await platform.executeRuntimeJobReplay({
      replayPlanId: replayExecuteMatch.replayPlanId,
      actorId: principal.userId
    });
    const deadLetter = (await platform.listRuntimeDeadLetters({ companyId }))
      .find((candidate) => candidate.jobId === replay.replayPlan.jobId) || null;
    const resolvedDeadLetter = deadLetter
      ? await platform.triageRuntimeDeadLetter({
        companyId,
        deadLetterId: deadLetter.deadLetterId,
        actorId: principal.userId,
        operatorState: "resolved"
      })
      : null;
    const replayOperation = await platform.recordReplayOperationExecution?.({
      sessionToken,
      companyId,
      replayPlan: replay.replayPlan,
      replayJob: replay.replayJob,
      deadLetterId: resolvedDeadLetter?.deadLetterId || deadLetter?.deadLetterId || null,
      supportCaseId: body.supportCaseId ?? null,
      incidentId: body.incidentId ?? null,
      correlationId: body.correlationId ?? undefined
    }) || null;
    writeJson(res, 200, {
      replayPlan: replay.replayPlan,
      replayJob: replay.replayJob,
      deadLetter: resolvedDeadLetter,
      replayOperation
    });
    return true;
  }

  const backofficeJobReplayMatch = matchPath(path, "/v1/backoffice/jobs/:jobId/replay");
  if (req.method === "POST" && backofficeJobReplayMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_job", objectId: backofficeJobReplayMatch.jobId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: "plan_job_replay"
    });
    const replayPlan = await platform.planRuntimeJobReplay({
      jobId: backofficeJobReplayMatch.jobId,
      plannedByUserId: principal.userId,
      reasonCode: body.reasonCode || "backoffice_manual_replay",
      plannedPayloadStrategy: body.plannedPayloadStrategy || "reuse"
    });
    const deadLetter = (await platform.listRuntimeDeadLetters({ companyId }))
      .find((candidate) => candidate.jobId === backofficeJobReplayMatch.jobId) || null;
    const triagedDeadLetter = deadLetter
      ? await platform.triageRuntimeDeadLetter({
        companyId,
        deadLetterId: deadLetter.deadLetterId,
        actorId: principal.userId,
        operatorState: "replay_planned"
      })
      : null;
    const replayOperation = await platform.registerReplayOperation?.({
      sessionToken,
      companyId,
      replayPlan,
      deadLetterId: triagedDeadLetter?.deadLetterId || deadLetter?.deadLetterId || null,
      supportCaseId: body.supportCaseId ?? null,
      incidentId: body.incidentId ?? null,
      correlationId: body.correlationId ?? undefined
    }) || null;
    writeJson(res, 200, { replayPlan, deadLetter: triagedDeadLetter, replayOperation });
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/dead-letters") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "async_dead_letter", objectId: companyId, scopeCode: "async_job" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: await buildBackofficeDeadLetterRows({
        platform,
        companyId,
        operatorState: optionalText(url.searchParams.get("operatorState"))
      })
    });
    return true;
  }

  const deadLetterTriageMatch = matchPath(path, "/v1/backoffice/dead-letters/:deadLetterId/triage");
  if (req.method === "POST" && deadLetterTriageMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_dead_letter", objectId: deadLetterTriageMatch.deadLetterId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: body.operatorState === "replay_planned" ? "plan_job_replay" : null
    });
    writeJson(res, 200, await platform.triageRuntimeDeadLetter({
      companyId,
      deadLetterId: deadLetterTriageMatch.deadLetterId,
      actorId: principal.userId,
      operatorState: body.operatorState
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/submissions/monitor") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "submission", objectId: companyId, scopeCode: "annual_reporting" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, await buildSubmissionMonitorPayload({
      platform,
      companyId,
      submissionType: optionalText(url.searchParams.get("submissionType")),
      ownerQueue: optionalText(url.searchParams.get("ownerQueue")),
      status: optionalText(url.searchParams.get("status")),
      asOf: optionalText(url.searchParams.get("asOf"))
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/submissions/monitor/scan") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "submission",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });

    const monitor = await buildSubmissionMonitorPayload({
      platform,
      companyId,
      submissionType: optionalText(body.submissionType),
      ownerQueue: optionalText(body.ownerQueue),
      status: optionalText(body.status),
      asOf: optionalText(body.asOf)
    });
    const scan = buildSubmissionMonitorScan({
      platform,
      companyId,
      principal,
      monitor,
      asOf: monitor.asOf
    });
    writeJson(res, 200, scan);
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/review-center/sla-scan") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "review_queue",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });

    const scan = platform.runReviewCenterSlaScan({
      companyId,
      asOf: body.asOf || null,
      actorId: principal.userId
    });

    const workItems = [];
    const notifications = [];
    const activityEntries = [];
    const incidentSignals = [];

    for (const escalation of scan.escalations) {
      const workItem = platform.upsertOperationalWorkItem({
        companyId,
        queueCode: escalation.queueCode,
        ownerTeamId: escalation.ownerTeamId,
        sourceType: "review_center_sla_breach",
        sourceId: escalation.reviewItemId,
        title: `SLA breach: ${escalation.itemTitle || escalation.reviewItemId}`,
        summary: escalation.recurringBreach
          ? `Recurring SLA breach in ${escalation.queueCode} for review item ${escalation.reviewItemId}.`
          : `SLA breach in ${escalation.queueCode} for review item ${escalation.reviewItemId}.`,
        priority: escalation.priority || "high",
        deadlineAt: escalation.sourceSlaDueAt,
        blockerScope: "sla_breach",
        escalationPolicyCode: escalation.escalationPolicyCode,
        actorId: principal.userId,
        metadata: {
          reviewEscalationId: escalation.reviewEscalationId,
          reviewItemId: escalation.reviewItemId,
          reviewQueueId: escalation.reviewQueueId,
          breachCount: escalation.breachCount,
          recurringBreach: escalation.recurringBreach
        }
      });
      workItems.push(workItem);

      const notificationTarget = resolveReviewSlaNotificationTarget({
        escalation,
        principal
      });
      const notification = platform.createNotification({
        companyId,
        recipientType: notificationTarget.recipientType,
        recipientId: notificationTarget.recipientId,
        categoryCode: "review_sla_breach",
        priorityCode: escalation.priority || "high",
        sourceDomainCode: "REVIEW_CENTER",
        sourceObjectType: "review_item",
        sourceObjectId: escalation.reviewItemId,
        title: escalation.recurringBreach
          ? `Recurring SLA breach in ${escalation.queueCode}`
          : `SLA breach in ${escalation.queueCode}`,
        body: escalation.recurringBreach
          ? `Review item ${escalation.itemTitle || escalation.reviewItemId} has breached SLA repeatedly and needs intervention.`
          : `Review item ${escalation.itemTitle || escalation.reviewItemId} has breached SLA and needs follow-up.`,
        deepLink: `/review-center/items/${escalation.reviewItemId}`,
        actorId: principal.userId
      });
      notifications.push(notification);

      const activityEntry = platform.projectActivityEntry({
        companyId,
        objectType: "review_item",
        objectId: escalation.reviewItemId,
        activityType: escalation.recurringBreach ? "review_sla_breach_recurring" : "review_sla_breach",
        actorType: "system",
        actorSnapshot: {
          actorId: principal.userId,
          actorLabel: "Backoffice SLA scan"
        },
        summary: escalation.recurringBreach
          ? `Recurring SLA breach recorded for ${escalation.itemTitle || escalation.reviewItemId}.`
          : `SLA breach recorded for ${escalation.itemTitle || escalation.reviewItemId}.`,
        occurredAt: scan.asOf,
        sourceEventId: escalation.reviewEscalationId,
        visibilityScope: "company",
        relatedObjects: [
          {
            relatedObjectType: "review_queue",
            relatedObjectId: escalation.reviewQueueId,
            relationCode: "belongs_to_queue"
          },
          {
            relatedObjectType: "operational_work_item",
            relatedObjectId: workItem.workItemId,
            relationCode: "follow_up_work_item"
          }
        ],
        actorId: principal.userId
      });
      activityEntries.push(activityEntry);

      if (escalation.recurringBreach) {
        incidentSignals.push(platform.recordRuntimeIncidentSignal({
          sessionToken,
          companyId,
          signalType: "review_queue_sla_breach",
          severity: mapQueuePriorityToIncidentSeverity(escalation.priority),
          summary: `Recurring SLA breach in ${escalation.queueCode}.`,
          sourceObjectType: "review_item",
          sourceObjectId: escalation.reviewItemId,
          metadata: {
            reviewEscalationId: escalation.reviewEscalationId,
            reviewQueueId: escalation.reviewQueueId,
            escalationPolicyCode: escalation.escalationPolicyCode,
            breachCount: escalation.breachCount
          }
        }));
      }
    }

    writeJson(res, 200, {
      scan,
      workItems,
      notifications,
      activityEntries,
      incidentSignals
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/incidents") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: companyId, scopeCode: "backoffice" });
    writeJson(res, 201, projectMaskedRuntimeIncidentView(platform.openRuntimeIncident({
      sessionToken,
      companyId,
      title: body.title,
      summary: body.summary,
      severity: body.severity,
      sourceSignalId: body.sourceSignalId || null,
      commanderUserId: body.commanderUserId || principal.userId,
      linkedCorrelationId: body.linkedCorrelationId || null,
      relatedObjectRefs: Array.isArray(body.relatedObjectRefs) ? body.relatedObjectRefs : [],
      impactScope: body.impactScope || null
    })));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/incidents") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "runtime_incident", objectId: companyId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listRuntimeIncidents({
        sessionToken,
        companyId,
        status: optionalText(url.searchParams.get("status")),
        severity: optionalText(url.searchParams.get("severity"))
      }).map(projectMaskedRuntimeIncidentView)
    });
    return true;
  }

  const incidentEventsMatch = matchPath(path, "/v1/backoffice/incidents/:incidentId/events");
  if (req.method === "GET" && incidentEventsMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "runtime_incident", objectId: incidentEventsMatch.incidentId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listRuntimeIncidentEvents({
        sessionToken,
        companyId,
        incidentId: incidentEventsMatch.incidentId
      })
    });
    return true;
  }

  if (req.method === "POST" && incidentEventsMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: incidentEventsMatch.incidentId, scopeCode: "backoffice" });
    writeJson(res, 201, platform.recordRuntimeIncidentEvent({
      sessionToken,
      companyId,
      incidentId: incidentEventsMatch.incidentId,
      eventType: body.eventType || "note_added",
      note: body.note,
      relatedObjectRefs: Array.isArray(body.relatedObjectRefs) ? body.relatedObjectRefs : [],
      linkedCorrelationId: body.linkedCorrelationId || null,
      metadata: body.metadata || {}
    }));
    return true;
  }

  const incidentPostReviewMatch = matchPath(path, "/v1/backoffice/incidents/:incidentId/post-review");
  if (req.method === "GET" && incidentPostReviewMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "runtime_incident", objectId: incidentPostReviewMatch.incidentId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      postIncidentReview: platform.getRuntimeIncidentPostReview({
        sessionToken,
        companyId,
        incidentId: incidentPostReviewMatch.incidentId
      })
    });
    return true;
  }

  if (req.method === "POST" && incidentPostReviewMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: incidentPostReviewMatch.incidentId, scopeCode: "backoffice" });
    writeJson(res, 201, projectMaskedRuntimeIncidentView(platform.recordRuntimeIncidentPostReview({
      sessionToken,
      companyId,
      incidentId: incidentPostReviewMatch.incidentId,
      summary: body.summary,
      rootCauseSummary: body.rootCauseSummary,
      impactScope: body.impactScope || null,
      mitigationActions: Array.isArray(body.mitigationActions) ? body.mitigationActions : [],
      correctiveActions: Array.isArray(body.correctiveActions) ? body.correctiveActions : [],
      preventiveActions: Array.isArray(body.preventiveActions) ? body.preventiveActions : [],
      reviewedBreakGlassIds: Array.isArray(body.reviewedBreakGlassIds) ? body.reviewedBreakGlassIds : [],
      evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs : []
    })));
    return true;
  }

  const incidentStatusMatch = matchPath(path, "/v1/backoffice/incidents/:incidentId/status");
  if (req.method === "POST" && incidentStatusMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: incidentStatusMatch.incidentId, scopeCode: "backoffice" });
    writeJson(res, 200, projectMaskedRuntimeIncidentView(platform.updateRuntimeIncidentStatus({
      sessionToken,
      companyId,
      incidentId: incidentStatusMatch.incidentId,
      status: body.status,
      note: body.note || null
    })));
    return true;
  }


  return false;
}

function projectMaskedSupportCaseView(supportCase) {
  return {
    ...supportCase,
    requester: maskRequester(supportCase?.requester || null),
    relatedObjectRefs: maskObjectRefs(supportCase?.relatedObjectRefs || []),
    masking: {
      masked: true,
      maskedFields: ["requester", "relatedObjectRefs"],
      maskingPolicyCode: "support_case.default_masked_view"
    }
  };
}

function projectMaskedRuntimeIncidentView(response) {
  if (response?.incident) {
    return {
      ...response,
      incident: projectMaskedRuntimeIncidentView(response.incident)
    };
  }
  return {
    ...response,
    relatedObjectRefs: maskObjectRefs(response?.relatedObjectRefs || []),
    masking: {
      masked: true,
      maskedFields: ["relatedObjectRefs"],
      maskingPolicyCode: "runtime_incident.default_masked_view"
    }
  };
}

function maskRequester(requester) {
  if (!requester || typeof requester !== "object") {
    return requester;
  }
  const maskedRequester = { ...requester };
  for (const key of Object.keys(maskedRequester)) {
    if (key === "channel") {
      continue;
    }
    if (typeof maskedRequester[key] === "string" && maskedRequester[key].length > 0) {
      maskedRequester[key] = maskValue(maskedRequester[key]);
    }
  }
  return maskedRequester;
}

function maskObjectRefs(objectRefs) {
  return (Array.isArray(objectRefs) ? objectRefs : []).map((objectRef) => ({
    ...objectRef,
    objectId: typeof objectRef?.objectId === "string" ? maskValue(objectRef.objectId) : objectRef?.objectId,
    rawObjectIdRedacted: typeof objectRef?.objectId === "string"
  }));
}

function maskValue(value) {
  if (typeof value !== "string" || value.length === 0) {
    return value;
  }
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}
