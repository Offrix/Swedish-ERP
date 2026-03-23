import crypto from "node:crypto";

export const SUPPORT_CASE_STATUSES = Object.freeze(["open", "triaged", "in_progress", "waiting_customer", "resolved", "closed", "escalated", "reopened"]);
export const SUPPORT_CASE_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const IMPERSONATION_MODES = Object.freeze(["read_only", "limited_write"]);
export const IMPERSONATION_STATES = Object.freeze(["requested", "approved", "active", "ended", "terminated", "denied"]);
export const ACCESS_REVIEW_STATUSES = Object.freeze(["generated", "assigned", "in_review", "remediated", "signed_off", "archived"]);
export const BREAK_GLASS_STATES = Object.freeze(["requested", "dual_approved", "active", "reviewed", "closed"]);
export const ADMIN_DIAGNOSTIC_TYPES = Object.freeze([
  "list_async_jobs",
  "list_submission_queue",
  "list_feature_flags",
  "verify_secret_refs",
  "plan_job_replay",
  "execute_job_replay"
]);

const WRITE_DIAGNOSTIC_TYPES = new Set(["plan_job_replay", "execute_job_replay"]);

export function createBackofficeModule({
  state,
  clock = () => new Date(),
  orgAuthPlatform,
  integrationPlatform,
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
        objectType: "backoffice",
        objectId: companyId,
        scopeCode: "backoffice"
      }
    });
    if (!decision.allowed) {
      throw error(403, decision.reasonCode, decision.explanation);
    }
    return principal;
  }

  return {
    supportCaseStatuses: SUPPORT_CASE_STATUSES,
    supportCaseSeverities: SUPPORT_CASE_SEVERITIES,
    impersonationModes: IMPERSONATION_MODES,
    impersonationStates: IMPERSONATION_STATES,
    accessReviewStatuses: ACCESS_REVIEW_STATUSES,
    breakGlassStates: BREAK_GLASS_STATES,
    adminDiagnosticTypes: ADMIN_DIAGNOSTIC_TYPES,
    createSupportCase,
    listSupportCases,
    approveSupportCaseActions,
    runAdminDiagnostic,
    requestImpersonation,
    listImpersonationSessions,
    approveImpersonation,
    terminateImpersonation,
    generateAccessReview,
    listAccessReviews,
    recordAccessReviewDecision,
    requestBreakGlass,
    listBreakGlassSessions,
    approveBreakGlass,
    closeBreakGlassSession,
    listAuditTrail
  };

  function createSupportCase({
    sessionToken,
    companyId,
    category,
    severity = "medium",
    requester,
    relatedObjectRefs = [],
    policyScope = "support_standard",
    approvedActions = [],
    ownerUserId = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const supportCase = {
      supportCaseId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      requester: clone(requester || { channel: "internal", requesterId: principal.userId }),
      category: text(category, "support_case_category_required"),
      severity: assertAllowed(severity, SUPPORT_CASE_SEVERITIES, "support_case_severity_invalid"),
      status: "open",
      ownerUserId: optionalText(ownerUserId),
      relatedObjectRefs: normalizeRefs(relatedObjectRefs),
      policyScope: text(policyScope, "support_case_policy_scope_required"),
      requestedActions: normalizeActions(approvedActions),
      approvedActions: [],
      actionApprovals: [],
      createdByUserId: principal.userId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.supportCases.set(supportCase.supportCaseId, supportCase);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.support_case.created",
      entityType: "support_case",
      entityId: supportCase.supportCaseId,
      explanation: `Opened support case ${supportCase.category} with severity ${supportCase.severity}.`
    });
    return clone(supportCase);
  }

  function approveSupportCaseActions({
    sessionToken,
    companyId,
    supportCaseId,
    approvedActions = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const supportCase = requireSupportCase(companyId, supportCaseId);
    if (principal.userId === supportCase.createdByUserId) {
      throw error(409, "support_case_self_approval_forbidden", "Support case approvals must come from a separate approver.");
    }
    const actions = normalizeActions(approvedActions);
    if (actions.length === 0) {
      throw error(400, "support_case_approval_actions_required", "At least one support action must be approved.");
    }
    for (const action of actions) {
      if (!supportCase.requestedActions.includes(action)) {
        throw error(409, "support_case_action_not_requested", `Support case does not request ${action}.`);
      }
    }
    supportCase.approvedActions = [...new Set([...supportCase.approvedActions, ...actions])].sort();
    supportCase.actionApprovals.push({
      approvalId: crypto.randomUUID(),
      approvedActions: [...actions],
      approvedByUserId: principal.userId,
      approvedAt: nowIso(clock)
    });
    supportCase.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.support_case.actions_approved",
      entityType: "support_case",
      entityId: supportCase.supportCaseId,
      explanation: `Approved support actions ${actions.join(", ")} for ${supportCase.supportCaseId}.`
    });
    return clone(supportCase);
  }

  function listSupportCases({ sessionToken, companyId, status = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedStatus = optionalText(status);
    return [...state.supportCases.values()]
      .filter((supportCase) => supportCase.companyId === text(companyId, "company_id_required"))
      .filter((supportCase) => (resolvedStatus ? supportCase.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function runAdminDiagnostic({
    sessionToken,
    companyId,
    supportCaseId,
    commandType,
    input = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const supportCase = requireSupportCase(companyId, supportCaseId);
    const resolvedCommandType = assertAllowed(commandType, ADMIN_DIAGNOSTIC_TYPES, "admin_diagnostic_type_invalid");
    const approvalActorId = WRITE_DIAGNOSTIC_TYPES.has(resolvedCommandType)
      ? requireApprovedSupportAction(supportCase, resolvedCommandType, principal.userId, error)
      : null;

    let resultSummary;
    if (resolvedCommandType === "list_async_jobs") {
      resultSummary = {
        jobs: integrationPlatform?.listAsyncJobs({
          companyId,
          status: optionalText(input.status),
          jobType: optionalText(input.jobType)
        }) || []
      };
    } else if (resolvedCommandType === "list_submission_queue") {
      resultSummary = {
        items: integrationPlatform?.listSubmissionActionQueue({
          companyId,
          status: optionalText(input.status),
          actionType: optionalText(input.actionType)
        }) || []
      };
    } else if (resolvedCommandType === "list_feature_flags") {
      resultSummary = {
        featureFlags: [...state.featureFlags.values()]
          .filter((flag) => flag.companyId === companyId)
          .sort((left, right) => left.flagKey.localeCompare(right.flagKey))
          .map(clone)
      };
    } else if (resolvedCommandType === "verify_secret_refs") {
      const refs = Array.isArray(input.secretRefs) ? input.secretRefs : [];
      resultSummary = {
        verified: refs.length > 0 && refs.every((entry) => typeof entry === "string" && entry.trim().length > 0),
        secretRefs: refs.map((entry) => redactSecretRef(entry))
      };
    } else if (resolvedCommandType === "plan_job_replay") {
      resultSummary = {
        replayPlan: integrationPlatform?.planJobReplay({
          companyId,
          jobId: text(input.jobId, "job_id_required"),
          actorId: principal.userId,
          approvedByActorId: approvalActorId
        })
      };
    } else {
      resultSummary = {
        replayedJob: integrationPlatform?.executeJobReplay({
          companyId,
          jobId: text(input.jobId, "job_id_required"),
          actorId: principal.userId
        })
      };
    }

    const diagnostic = {
      commandId: crypto.randomUUID(),
      companyId,
      supportCaseId: supportCase.supportCaseId,
      commandType: resolvedCommandType,
      inputRedacted: redactInput(input),
      resultSummary: clone(resultSummary),
      riskClass: WRITE_DIAGNOSTIC_TYPES.has(resolvedCommandType) ? "high" : "normal",
      executedByUserId: principal.userId,
      approvedByUserId: approvalActorId,
      executedAt: nowIso(clock)
    };
    state.adminDiagnostics.set(diagnostic.commandId, diagnostic);
    supportCase.status = WRITE_DIAGNOSTIC_TYPES.has(resolvedCommandType) ? "in_progress" : "triaged";
    supportCase.updatedAt = diagnostic.executedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.admin_diagnostic.executed",
      entityType: "admin_diagnostic",
      entityId: diagnostic.commandId,
      explanation: `Executed ${resolvedCommandType} under support case ${supportCase.supportCaseId}.`
    });
    return clone(diagnostic);
  }

  function requestImpersonation({
    sessionToken,
    companyId,
    supportCaseId,
    targetCompanyUserId,
    purposeCode,
    mode = "read_only",
    expiresInMinutes = 30,
    restrictedActions = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    requireSupportCase(companyId, supportCaseId);
    const targetCompanyUser = requireCompanyUser(companyId, targetCompanyUserId, orgAuthPlatform, error);
    const session = {
      sessionId: crypto.randomUUID(),
      companyId,
      supportCaseId,
      targetCompanyUserId: targetCompanyUser.companyUserId,
      targetUserId: targetCompanyUser.userId,
      requestedByUserId: principal.userId,
      approvedByUserId: null,
      purposeCode: text(purposeCode, "impersonation_purpose_required"),
      mode: assertAllowed(mode, IMPERSONATION_MODES, "impersonation_mode_invalid"),
      restrictedActions: normalizeActions(restrictedActions),
      status: "requested",
      startedAt: null,
      expiresAt: addMinutes(nowIso(clock), normalizePositiveInteger(expiresInMinutes, "impersonation_expiry_invalid")),
      endedAt: null,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.impersonationSessions.set(session.sessionId, session);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.impersonation.requested",
      entityType: "impersonation_session",
      entityId: session.sessionId,
      explanation: `Requested ${session.mode} impersonation for ${targetCompanyUser.companyUserId}.`
    });
    return clone(session);
  }

  function listImpersonationSessions({ sessionToken, companyId, status = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedStatus = optionalText(status);
    return [...state.impersonationSessions.values()]
      .filter((session) => session.companyId === text(companyId, "company_id_required"))
      .filter((session) => (resolvedStatus ? session.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function approveImpersonation({
    sessionToken,
    companyId,
    sessionId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const session = requireImpersonationSession(companyId, sessionId);
    if (session.status !== "requested") {
      return clone(session);
    }
    if (principal.userId === session.requestedByUserId) {
      throw error(409, "impersonation_self_approval_forbidden", "Impersonation must be approved by a separate actor.");
    }
    session.status = "active";
    session.approvedByUserId = principal.userId;
    session.startedAt = nowIso(clock);
    session.updatedAt = session.startedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.impersonation.approved",
      entityType: "impersonation_session",
      entityId: session.sessionId,
      explanation: `Approved impersonation ${session.sessionId}.`
    });
    return clone(session);
  }

  function terminateImpersonation({
    sessionToken,
    companyId,
    sessionId,
    reasonCode = "manual_end",
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const session = requireImpersonationSession(companyId, sessionId);
    if (!["active", "approved"].includes(session.status)) {
      return clone(session);
    }
    session.status = "ended";
    session.endReasonCode = text(reasonCode, "impersonation_end_reason_required");
    session.endedAt = nowIso(clock);
    session.updatedAt = session.endedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.impersonation.ended",
      entityType: "impersonation_session",
      entityId: session.sessionId,
      explanation: `Ended impersonation ${session.sessionId}.`
    });
    return clone(session);
  }

  function generateAccessReview({
    sessionToken,
    companyId,
    scopeType = "company",
    scopeRef = null,
    dueInDays = 7,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const findings = buildAccessReviewFindings(companyId, orgAuthPlatform);
    const review = {
      reviewBatchId: crypto.randomUUID(),
      companyId,
      scopeType: text(scopeType, "access_review_scope_type_required"),
      scopeRef: optionalText(scopeRef) || companyId,
      generatedAt: nowIso(clock),
      dueAt: addDays(nowIso(clock).slice(0, 10), normalizePositiveInteger(dueInDays, "access_review_due_days_invalid")),
      status: findings.length > 0 ? "in_review" : "generated",
      findings,
      signedOffByUserId: null
    };
    state.accessReviewBatches.set(review.reviewBatchId, review);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.access_review.generated",
      entityType: "access_review_batch",
      entityId: review.reviewBatchId,
      explanation: `Generated access review with ${findings.length} findings.`
    });
    return clone(review);
  }

  function listAccessReviews({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return [...state.accessReviewBatches.values()]
      .filter((review) => review.companyId === text(companyId, "company_id_required"))
      .sort((left, right) => left.generatedAt.localeCompare(right.generatedAt))
      .map(clone);
  }

  function recordAccessReviewDecision({
    sessionToken,
    companyId,
    reviewBatchId,
    findingId,
    decision,
    remediationNote = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const review = requireAccessReview(companyId, reviewBatchId);
    const finding = review.findings.find((candidate) => candidate.findingId === text(findingId, "access_review_finding_required"));
    if (!finding) {
      throw error(404, "access_review_finding_not_found", "Access review finding was not found.");
    }
    finding.decision = text(decision, "access_review_decision_required");
    finding.remediationNote = optionalText(remediationNote);
    finding.decidedByUserId = principal.userId;
    finding.decidedAt = nowIso(clock);
    review.status = review.findings.every((candidate) => candidate.decision && candidate.decision !== "pending") ? "remediated" : "in_review";
    if (review.status === "remediated") {
      review.signedOffByUserId = principal.userId;
      review.status = "signed_off";
    }
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.access_review.decided",
      entityType: "access_review_batch",
      entityId: review.reviewBatchId,
      explanation: `Recorded ${finding.decision} on finding ${finding.findingCode}.`
    });
    return clone(review);
  }

  function requestBreakGlass({
    sessionToken,
    companyId,
    incidentId,
    purposeCode,
    requestedActions = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const request = {
      breakGlassId: crypto.randomUUID(),
      companyId,
      incidentId: text(incidentId, "break_glass_incident_id_required"),
      purposeCode: text(purposeCode, "break_glass_purpose_required"),
      requestedActions: normalizeActions(requestedActions),
      requestedByUserId: principal.userId,
      approvals: [],
      status: "requested",
      activatedAt: null,
      reviewedAt: null,
      closedAt: null,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.breakGlassSessions.set(request.breakGlassId, request);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.break_glass.requested",
      entityType: "break_glass_session",
      entityId: request.breakGlassId,
      explanation: `Requested break-glass for incident ${incidentId}.`
    });
    return clone(request);
  }

  function listBreakGlassSessions({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return [...state.breakGlassSessions.values()]
      .filter((session) => session.companyId === text(companyId, "company_id_required"))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function approveBreakGlass({
    sessionToken,
    companyId,
    breakGlassId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const session = requireBreakGlass(companyId, breakGlassId);
    if (session.status === "closed") {
      return clone(session);
    }
    if (principal.userId === session.requestedByUserId) {
      throw error(409, "break_glass_self_approval_forbidden", "Break-glass approvals must come from a separate approver.");
    }
    if (!session.approvals.includes(principal.userId)) {
      session.approvals.push(principal.userId);
    }
    if (session.approvals.length >= 2) {
      session.status = "active";
      session.activatedAt = nowIso(clock);
    }
    session.updatedAt = nowIso(clock);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.break_glass.approved",
      entityType: "break_glass_session",
      entityId: session.breakGlassId,
      explanation: `Approved break-glass ${session.breakGlassId}.`
    });
    return clone(session);
  }

  function closeBreakGlassSession({
    sessionToken,
    companyId,
    breakGlassId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const session = requireBreakGlass(companyId, breakGlassId);
    if (session.status === "closed") {
      return clone(session);
    }
    if (session.status === "active") {
      session.status = "reviewed";
      session.reviewedAt = nowIso(clock);
      session.updatedAt = session.reviewedAt;
    } else if (session.status === "reviewed") {
      session.status = "closed";
      session.closedAt = nowIso(clock);
      session.updatedAt = session.closedAt;
    } else {
      throw error(409, "break_glass_close_invalid_state", "Break-glass can only be closed after activation and review.");
    }
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.break_glass.closed",
      entityType: "break_glass_session",
      entityId: session.breakGlassId,
      explanation: `Closed break-glass ${session.breakGlassId}.`
    });
    return clone(session);
  }

  function listAuditTrail({ sessionToken, companyId, entityType = null, correlationId = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedEntityType = optionalText(entityType);
    const resolvedCorrelationId = optionalText(correlationId);
    return state.auditEvents
      .filter((event) => event.companyId === text(companyId, "company_id_required"))
      .filter((event) => (resolvedEntityType ? event.entityType === resolvedEntityType : true))
      .filter((event) => (resolvedCorrelationId ? event.correlationId === resolvedCorrelationId : true))
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map(clone);
  }

  function requireSupportCase(companyId, supportCaseId) {
    const supportCase = state.supportCases.get(text(supportCaseId, "support_case_id_required"));
    if (!supportCase || supportCase.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "support_case_not_found", "Support case was not found.");
    }
    return supportCase;
  }

  function requireImpersonationSession(companyId, sessionId) {
    const session = state.impersonationSessions.get(text(sessionId, "impersonation_session_id_required"));
    if (!session || session.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "impersonation_session_not_found", "Impersonation session was not found.");
    }
    return session;
  }

  function requireAccessReview(companyId, reviewBatchId) {
    const review = state.accessReviewBatches.get(text(reviewBatchId, "access_review_batch_id_required"));
    if (!review || review.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "access_review_batch_not_found", "Access review batch was not found.");
    }
    return review;
  }

  function requireBreakGlass(companyId, breakGlassId) {
    const session = state.breakGlassSessions.get(text(breakGlassId, "break_glass_id_required"));
    if (!session || session.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "break_glass_not_found", "Break-glass session was not found.");
    }
    return session;
  }
}

function buildAccessReviewFindings(companyId, orgAuthPlatform) {
  const snapshot = orgAuthPlatform?.snapshot?.() || {};
  const companyUsers = Array.isArray(snapshot.companyUsers) ? snapshot.companyUsers.filter((companyUser) => companyUser.companyId === companyId) : [];
  const findings = [];
  const rolesByUser = new Map();
  for (const companyUser of companyUsers) {
    if (!rolesByUser.has(companyUser.userId)) {
      rolesByUser.set(companyUser.userId, []);
    }
    rolesByUser.get(companyUser.userId).push(companyUser);
  }
  for (const [userId, records] of rolesByUser.entries()) {
    const roleCodes = records.map((record) => record.roleCode);
    if (roleCodes.includes("company_admin") && roleCodes.includes("payroll_admin")) {
      findings.push(createFinding(companyId, userId, "sod.admin_payroll_overlap", "critical", records));
    }
    if (roleCodes.includes("company_admin") && roleCodes.includes("bureau_user")) {
      findings.push(createFinding(companyId, userId, "sod.admin_bureau_overlap", "high", records));
    }
    if (records.filter((record) => record.roleCode === "company_admin").length > 1) {
      findings.push(createFinding(companyId, userId, "access.multiple_admin_assignments", "medium", records));
    }
  }
  return findings;
}

function createFinding(companyId, userId, findingCode, severity, records) {
  return {
    findingId: crypto.randomUUID(),
    companyId,
    userId,
    findingCode,
    severity,
    relatedCompanyUserIds: records.map((record) => record.companyUserId),
    decision: "pending",
    remediationNote: null,
    decidedByUserId: null,
    decidedAt: null
  };
}

function requireCompanyUser(companyId, companyUserId, orgAuthPlatform, error) {
  const snapshot = orgAuthPlatform?.snapshot?.() || {};
  const companyUser = (snapshot.companyUsers || []).find((candidate) => candidate.companyUserId === text(companyUserId, "company_user_id_required"));
  if (!companyUser || companyUser.companyId !== text(companyId, "company_id_required")) {
    throw error(404, "company_user_not_found", "Company user was not found.");
  }
  return companyUser;
}

function normalizeRefs(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => ({
    objectType: text(value?.objectType, "support_case_object_type_required"),
    objectId: text(value?.objectId, "support_case_object_id_required")
  }));
}

function normalizeActions(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => text(value, "support_case_action_invalid")))].sort();
}

function requireApprovedSupportAction(supportCase, action, actorId, error) {
  if (!supportCase.approvedActions.includes(action)) {
    throw error(403, "support_action_not_approved", `Support case does not allow ${action}.`);
  }
  const approval = [...supportCase.actionApprovals]
    .reverse()
    .find(
      (candidate) =>
        Array.isArray(candidate.approvedActions)
        && candidate.approvedActions.includes(action)
        && candidate.approvedByUserId !== supportCase.createdByUserId
        && candidate.approvedByUserId !== actorId
    );
  if (!approval) {
    throw error(403, "support_action_separation_required", `Support action ${action} requires approval from a separate actor.`);
  }
  return approval.approvedByUserId;
}

function redactInput(input) {
  const payload = clone(input || {});
  if (Array.isArray(payload.secretRefs)) {
    payload.secretRefs = payload.secretRefs.map((entry) => redactSecretRef(entry));
  }
  return payload;
}

function redactSecretRef(value) {
  const resolved = text(value, "secret_ref_required");
  if (resolved.length <= 4) {
    return "***";
  }
  return `${resolved.slice(0, 2)}***${resolved.slice(-2)}`;
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function addMinutes(timestamp, minutes) {
  const value = new Date(timestamp);
  value.setUTCMinutes(value.getUTCMinutes() + minutes);
  return value.toISOString();
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
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

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createValidationError(code, `${code} is required.`);
  }
  return value.trim();
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
