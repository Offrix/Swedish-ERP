import crypto from "node:crypto";

export const SUPPORT_CASE_STATUSES = Object.freeze(["open", "triaged", "in_progress", "waiting_customer", "resolved", "closed", "escalated", "reopened"]);
export const SUPPORT_CASE_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const IMPERSONATION_MODES = Object.freeze(["read_only", "limited_write"]);
export const IMPERSONATION_STATES = Object.freeze(["requested", "approved", "active", "terminated", "expired", "denied"]);
export const ACCESS_REVIEW_STATUSES = Object.freeze(["generated", "assigned", "in_review", "remediated", "signed_off", "archived"]);
export const BREAK_GLASS_STATES = Object.freeze(["requested", "dual_approved", "active", "ended"]);
export const MANAGED_SECRET_TYPES = Object.freeze(["api_secret", "oauth_client_secret", "webhook_signing_secret", "certificate_private_key"]);
export const MANAGED_SECRET_STATUSES = Object.freeze(["active", "dual_running", "retired"]);
export const SECRET_ROTATION_RECORD_STATUSES = Object.freeze(["rotated", "failed", "revoked"]);
export const CERTIFICATE_CHAIN_STATUSES = Object.freeze(["active", "renewal_due", "expired", "revoked"]);
export const CALLBACK_SECRET_STATUSES = Object.freeze(["active", "dual_running", "retired"]);
export const ACCESS_REVIEW_CADENCE_CODES = Object.freeze(["quarterly"]);
export const ADMIN_DIAGNOSTIC_TYPES = Object.freeze([
  "list_async_jobs",
  "list_submission_queue",
  "list_feature_flags",
  "verify_secret_refs",
  "plan_job_replay",
  "execute_job_replay"
]);

const WRITE_DIAGNOSTIC_TYPES = new Set(["plan_job_replay", "execute_job_replay"]);
const SUPPORT_ACTION_IMPERSONATION_READ_ONLY = "impersonation_read_only";
const SUPPORT_ACTION_IMPERSONATION_LIMITED_WRITE = "impersonation_limited_write";
const CANONICAL_VAULT_MODE_CODES = Object.freeze(["trial", "sandbox_internal", "test", "pilot_parallel", "production"]);
const VAULT_MODE_ALIASES = Object.freeze({
  trial: "trial",
  sandbox: "sandbox_internal",
  sandbox_internal: "sandbox_internal",
  test: "test",
  pilot: "pilot_parallel",
  pilot_parallel: "pilot_parallel",
  prod: "production",
  production: "production"
});

export function createBackofficeModule({
  state,
  clock = () => new Date(),
  orgAuthPlatform,
  integrationPlatform,
  evidencePlatform = null,
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
    managedSecretTypes: MANAGED_SECRET_TYPES,
    managedSecretStatuses: MANAGED_SECRET_STATUSES,
    secretRotationRecordStatuses: SECRET_ROTATION_RECORD_STATUSES,
    certificateChainStatuses: CERTIFICATE_CHAIN_STATUSES,
    callbackSecretStatuses: CALLBACK_SECRET_STATUSES,
    adminDiagnosticTypes: ADMIN_DIAGNOSTIC_TYPES,
    createSupportCase,
    listSupportCases,
    closeSupportCase,
    approveSupportCaseActions,
    registerManagedSecret,
    listManagedSecrets,
    rotateManagedSecret,
    listSecretRotationRecords,
    registerCertificateChain,
    listCertificateChains,
    registerCallbackSecret,
    listCallbackSecrets,
    getSecretManagementSummary,
    runAdminDiagnostic,
    requestImpersonation,
    listImpersonationSessions,
    approveImpersonation,
    activateImpersonation,
    terminateImpersonation,
    generateAccessReview,
    listAccessReviews,
    recordAccessReviewDecision,
    requestBreakGlass,
    listBreakGlassSessions,
    approveBreakGlass,
    activateBreakGlass,
    closeBreakGlassSession,
    exportSupportCaseEvidenceBundle,
    registerReplayOperation,
    recordReplayOperationApproval,
    recordReplayOperationExecution,
    listReplayOperations,
    exportBreakGlassEvidenceBundle,
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

  function closeSupportCase({
    sessionToken,
    companyId,
    supportCaseId,
    resolutionCode,
    resolutionNote = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const supportCase = requireSupportCase(companyId, supportCaseId);
    if (supportCase.status === "closed") {
      return clone(supportCase);
    }
    const closedAt = nowIso(clock);
    supportCase.status = "closed";
    supportCase.resolutionCode = text(resolutionCode, "support_case_resolution_code_required");
    supportCase.resolutionNote = optionalText(resolutionNote);
    supportCase.resolvedAt = supportCase.resolvedAt || closedAt;
    supportCase.resolvedByUserId = supportCase.resolvedByUserId || principal.userId;
    supportCase.closedAt = closedAt;
    supportCase.closedByUserId = principal.userId;
    supportCase.updatedAt = closedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.support_case.closed",
      entityType: "support_case",
      entityId: supportCase.supportCaseId,
      explanation: `Closed support case ${supportCase.supportCaseId} with ${supportCase.resolutionCode}.`
    });
    return clone(supportCase);
  }

  function exportSupportCaseEvidenceBundle({
    sessionToken,
    companyId,
    supportCaseId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.read");
    const supportCase = requireSupportCase(companyId, supportCaseId);
    return syncSupportCaseEvidenceBundle({
      supportCase,
      actorId: principal.userId,
      correlationId
    });
  }

  async function registerReplayOperation({
    sessionToken,
    companyId,
    replayPlan,
    supportCaseId = null,
    incidentId = null,
    deadLetterId = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedReplayPlan = requireReplayPlan(replayPlan, resolvedCompanyId);
    const supportCase = optionalText(supportCaseId) ? requireSupportCase(resolvedCompanyId, supportCaseId) : null;
    const runtimeIncident = optionalText(incidentId) ? requireRuntimeIncident(resolvedCompanyId, incidentId) : null;
    let replayOperation = findReplayOperationByPlanId(resolvedCompanyId, resolvedReplayPlan.replayPlanId);
    if (!replayOperation) {
      replayOperation = {
        replayOperationId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        replayPlanId: resolvedReplayPlan.replayPlanId,
        jobId: resolvedReplayPlan.jobId,
        replayJobId: resolvedReplayPlan.replayJobId || null,
        deadLetterId: optionalText(deadLetterId),
        supportCaseId: supportCase?.supportCaseId || null,
        incidentId: runtimeIncident?.incidentId || null,
        reasonCode: resolvedReplayPlan.reasonCode,
        plannedPayloadStrategy: resolvedReplayPlan.plannedPayloadStrategy,
        status: resolvedReplayPlan.status,
        plannedByUserId: resolvedReplayPlan.plannedByUserId || principal.userId,
        approvedByUserId: resolvedReplayPlan.approvedByUserId || null,
        executedByUserId: null,
        plannedAt: resolvedReplayPlan.createdAt,
        approvedAt: resolvedReplayPlan.approvedAt || null,
        executedAt: resolvedReplayPlan.executedAt || null,
        latestPlanUpdatedAt: resolvedReplayPlan.updatedAt || resolvedReplayPlan.createdAt,
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      };
    } else {
      replayOperation.deadLetterId = optionalText(deadLetterId) || replayOperation.deadLetterId;
      replayOperation.supportCaseId = supportCase?.supportCaseId || replayOperation.supportCaseId;
      replayOperation.incidentId = runtimeIncident?.incidentId || replayOperation.incidentId;
      replayOperation.replayJobId = resolvedReplayPlan.replayJobId || replayOperation.replayJobId;
      replayOperation.status = resolvedReplayPlan.status;
      replayOperation.latestPlanUpdatedAt = resolvedReplayPlan.updatedAt || replayOperation.latestPlanUpdatedAt;
      replayOperation.updatedAt = nowIso(clock);
    }
    state.replayOperations.set(replayOperation.replayOperationId, replayOperation);
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.replay_operation.planned",
      entityType: "replay_operation",
      entityId: replayOperation.replayOperationId,
      explanation: `Registered replay operation for async job ${resolvedReplayPlan.jobId}.`
    });
    return clone(replayOperation);
  }

  async function recordReplayOperationApproval({
    sessionToken,
    companyId,
    replayPlan,
    supportCaseId = null,
    incidentId = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedReplayPlan = requireReplayPlan(replayPlan, resolvedCompanyId);
    const replayOperation = requireReplayOperationByPlanId(resolvedCompanyId, resolvedReplayPlan.replayPlanId);
    if (optionalText(supportCaseId)) {
      replayOperation.supportCaseId = requireSupportCase(resolvedCompanyId, supportCaseId).supportCaseId;
    }
    if (optionalText(incidentId)) {
      replayOperation.incidentId = requireRuntimeIncident(resolvedCompanyId, incidentId).incidentId;
    }
    replayOperation.status = resolvedReplayPlan.status;
    replayOperation.approvedByUserId = resolvedReplayPlan.approvedByUserId || principal.userId;
    replayOperation.approvedAt = resolvedReplayPlan.approvedAt || nowIso(clock);
    replayOperation.latestPlanUpdatedAt = resolvedReplayPlan.updatedAt || replayOperation.latestPlanUpdatedAt;
    replayOperation.updatedAt = nowIso(clock);
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.replay_operation.approved",
      entityType: "replay_operation",
      entityId: replayOperation.replayOperationId,
      explanation: `Approved replay operation ${replayOperation.replayOperationId}.`
    });
    return clone(replayOperation);
  }

  async function recordReplayOperationExecution({
    sessionToken,
    companyId,
    replayPlan,
    replayJob = null,
    deadLetterId = null,
    supportCaseId = null,
    incidentId = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedReplayPlan = requireReplayPlan(replayPlan, resolvedCompanyId);
    const replayOperation = requireReplayOperationByPlanId(resolvedCompanyId, resolvedReplayPlan.replayPlanId);
    if (optionalText(supportCaseId)) {
      replayOperation.supportCaseId = requireSupportCase(resolvedCompanyId, supportCaseId).supportCaseId;
    }
    if (optionalText(incidentId)) {
      replayOperation.incidentId = requireRuntimeIncident(resolvedCompanyId, incidentId).incidentId;
    }
    replayOperation.deadLetterId = optionalText(deadLetterId) || replayOperation.deadLetterId;
    replayOperation.status = resolvedReplayPlan.status;
    replayOperation.replayJobId = replayJob?.jobId || resolvedReplayPlan.replayJobId || replayOperation.replayJobId;
    replayOperation.executedByUserId = principal.userId;
    replayOperation.executedAt = resolvedReplayPlan.executedAt || replayOperation.executedAt || nowIso(clock);
    replayOperation.latestPlanUpdatedAt = resolvedReplayPlan.updatedAt || replayOperation.latestPlanUpdatedAt;
    replayOperation.updatedAt = nowIso(clock);
    audit({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.replay_operation.executed",
      entityType: "replay_operation",
      entityId: replayOperation.replayOperationId,
      explanation: `Executed replay operation ${replayOperation.replayOperationId}.`
    });
    return clone(replayOperation);
  }

  async function listReplayOperations({ sessionToken, companyId, status = null } = {}) {
    if (sessionToken) {
      authorize(sessionToken, companyId, "company.read");
    }
    const resolvedCompanyId = text(companyId, "company_id_required");
    return [...state.replayOperations.values()]
      .filter((operation) => operation.companyId === resolvedCompanyId)
      .map(clone)
      .filter((operation) => (optionalText(status) ? operation.status === status : true))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  function registerManagedSecret({
    sessionToken,
    companyId,
    mode,
    providerCode,
    secretType,
    secretRef,
    ownerUserId,
    backupOwnerUserId = null,
    rotationCadenceDays,
    supportsDualRunning = true,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const parsedSecret = parseVaultSecretRef(secretRef, {
      code: "managed_secret_ref_invalid",
      allowLegacyModeAliases: true
    });
    const resolvedMode = normalizeVaultMode(mode, "managed_secret_mode_invalid");
    const resolvedProviderCode = text(providerCode, "managed_secret_provider_code_required");
    const resolvedCadenceDays = normalizePositiveInteger(rotationCadenceDays, "managed_secret_rotation_cadence_invalid");
    if (parsedSecret.canonicalMode !== resolvedMode) {
      throw error(409, "managed_secret_mode_mismatch", "Managed secret ref must use the same runtime mode as the managed secret record.");
    }
    if (parsedSecret.providerCode !== resolvedProviderCode) {
      throw error(409, "managed_secret_provider_mismatch", "Managed secret ref must use the same provider code as the managed secret record.");
    }
    ensureSecretRefIsUniqueAcrossInventory({
      state,
      companyId,
      secretRef: parsedSecret.originalRef
    });
    const createdAt = nowIso(clock);
    const managedSecret = {
      managedSecretId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      mode: resolvedMode,
      providerCode: resolvedProviderCode,
      secretType: assertAllowed(secretType, MANAGED_SECRET_TYPES, "managed_secret_type_invalid"),
      currentSecretRef: parsedSecret.originalRef,
      currentSecretVersion: parsedSecret.secretName,
      previousSecretRef: null,
      previousSecretVersion: null,
      vaultRef: parsedSecret.vaultRef,
      ownerUserId: text(ownerUserId, "managed_secret_owner_user_id_required"),
      backupOwnerUserId: optionalText(backupOwnerUserId),
      rotationCadenceDays: resolvedCadenceDays,
      supportsDualRunning: supportsDualRunning !== false,
      status: "active",
      lastRotatedAt: createdAt,
      nextRotationDueAt: addDaysToTimestamp(createdAt, resolvedCadenceDays),
      metadataJson: clone(metadataJson || {}),
      createdByUserId: principal.userId,
      createdAt,
      updatedAt: createdAt
    };
    state.managedSecrets.set(managedSecret.managedSecretId, managedSecret);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.managed_secret.registered",
      entityType: "managed_secret",
      entityId: managedSecret.managedSecretId,
      explanation: `Registered ${managedSecret.secretType} for ${managedSecret.providerCode} in ${managedSecret.mode}.`
    });
    return projectManagedSecret(managedSecret);
  }

  function listManagedSecrets({ sessionToken, companyId, mode = null, providerCode = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedMode = optionalText(mode) ? normalizeVaultMode(mode, "managed_secret_mode_invalid") : null;
    const resolvedProviderCode = optionalText(providerCode);
    return [...state.managedSecrets.values()]
      .filter((record) => record.companyId === text(companyId, "company_id_required"))
      .filter((record) => (resolvedMode ? record.mode === resolvedMode : true))
      .filter((record) => (resolvedProviderCode ? record.providerCode === resolvedProviderCode : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(projectManagedSecret);
  }

  function rotateManagedSecret({
    sessionToken,
    companyId,
    managedSecretId,
    nextSecretRef,
    nextSecretVersion = null,
    verificationMode = "synthetic_smoke",
    dualRunningUntil = null,
    callbackSecretIds = [],
    certificateChainIds = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const managedSecret = requireManagedSecret(state, error, companyId, managedSecretId);
    const parsedNextSecretRef = parseVaultSecretRef(nextSecretRef, {
      code: "managed_secret_next_secret_ref_invalid",
      allowLegacyModeAliases: true
    });
    if (parsedNextSecretRef.canonicalMode !== managedSecret.mode) {
      throw error(409, "managed_secret_rotation_mode_mismatch", "Next secret ref must remain in the same runtime mode vault.");
    }
    if (parsedNextSecretRef.providerCode !== managedSecret.providerCode) {
      throw error(409, "managed_secret_rotation_provider_mismatch", "Next secret ref must remain under the same provider code.");
    }
    if (parsedNextSecretRef.originalRef === managedSecret.currentSecretRef) {
      throw error(409, "managed_secret_rotation_duplicate_ref", "Next secret ref must differ from the current secret ref.");
    }
    ensureSecretRefIsUniqueAcrossInventory({
      state,
      companyId,
      secretRef: parsedNextSecretRef.originalRef,
      ignoredManagedSecretId: managedSecret.managedSecretId
    });
    const rotatedAt = nowIso(clock);
    const normalizedDualRunningUntil = optionalIsoTimestamp(dualRunningUntil, "managed_secret_dual_running_until_invalid");
    if (normalizedDualRunningUntil && managedSecret.supportsDualRunning !== true) {
      throw error(409, "managed_secret_dual_running_not_supported", "This managed secret type does not support dual-running overlap.");
    }
    const linkedCallbackSecretIds = normalizeIdList(callbackSecretIds, "callback_secret_id_required");
    const linkedCertificateChainIds = normalizeIdList(certificateChainIds, "certificate_chain_id_required");
    managedSecret.previousSecretRef = managedSecret.currentSecretRef;
    managedSecret.previousSecretVersion = managedSecret.currentSecretVersion;
    managedSecret.currentSecretRef = parsedNextSecretRef.originalRef;
    managedSecret.currentSecretVersion = optionalText(nextSecretVersion) || parsedNextSecretRef.secretName;
    managedSecret.lastRotatedAt = rotatedAt;
    managedSecret.nextRotationDueAt = addDaysToTimestamp(rotatedAt, managedSecret.rotationCadenceDays);
    managedSecret.status = normalizedDualRunningUntil ? "dual_running" : "active";
    managedSecret.updatedAt = rotatedAt;
    const rotationRecord = {
      secretRotationRecordId: crypto.randomUUID(),
      companyId,
      managedSecretId: managedSecret.managedSecretId,
      mode: managedSecret.mode,
      providerCode: managedSecret.providerCode,
      secretType: managedSecret.secretType,
      previousSecretVersion: managedSecret.previousSecretVersion,
      nextSecretVersion: managedSecret.currentSecretVersion,
      previousSecretRef: managedSecret.previousSecretRef,
      nextSecretRef: managedSecret.currentSecretRef,
      requestedByUserId: principal.userId,
      verificationMode: text(verificationMode, "secret_rotation_verification_mode_required"),
      dualRunningUntil: normalizedDualRunningUntil,
      linkedCallbackSecretIds,
      linkedCertificateChainIds,
      rotatedAt,
      status: "rotated"
    };
    for (const callbackSecretId of linkedCallbackSecretIds) {
      const callbackSecret = requireCallbackSecret(state, error, companyId, callbackSecretId);
      if (callbackSecret.mode !== managedSecret.mode || callbackSecret.providerCode !== managedSecret.providerCode) {
        throw error(409, "callback_secret_rotation_scope_mismatch", "Linked callback secret must belong to the same mode and provider.");
      }
      callbackSecret.previousSecretRef = managedSecret.previousSecretRef;
      callbackSecret.currentSecretRef = managedSecret.currentSecretRef;
      callbackSecret.currentSecretVersion = managedSecret.currentSecretVersion;
      callbackSecret.lastRotatedAt = rotatedAt;
      callbackSecret.nextRotationDueAt = addDaysToTimestamp(rotatedAt, callbackSecret.rotationCadenceDays);
      callbackSecret.overlapEndsAt = normalizedDualRunningUntil;
      callbackSecret.status = normalizedDualRunningUntil ? "dual_running" : "active";
      callbackSecret.updatedAt = rotatedAt;
    }
    for (const certificateChainId of linkedCertificateChainIds) {
      const certificateChain = requireCertificateChain(state, error, companyId, certificateChainId);
      if (certificateChain.mode !== managedSecret.mode || certificateChain.providerCode !== managedSecret.providerCode) {
        throw error(409, "certificate_chain_rotation_scope_mismatch", "Linked certificate chain must belong to the same mode and provider.");
      }
      certificateChain.privateKeySecretRef = managedSecret.currentSecretRef;
      certificateChain.privateKeySecretVersion = managedSecret.currentSecretVersion;
      certificateChain.updatedAt = rotatedAt;
    }
    state.secretRotationRecords.set(rotationRecord.secretRotationRecordId, rotationRecord);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.secret.rotated",
      entityType: "managed_secret",
      entityId: managedSecret.managedSecretId,
      explanation: `Rotated ${managedSecret.secretType} for ${managedSecret.providerCode} in ${managedSecret.mode}.`,
      metadata: {
        secretRotationRecordId: rotationRecord.secretRotationRecordId,
        dualRunningUntil: rotationRecord.dualRunningUntil
      }
    });
    return projectSecretRotationRecord(rotationRecord);
  }

  function listSecretRotationRecords({ sessionToken, companyId, mode = null, providerCode = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedMode = optionalText(mode) ? normalizeVaultMode(mode, "managed_secret_mode_invalid") : null;
    const resolvedProviderCode = optionalText(providerCode);
    return [...state.secretRotationRecords.values()]
      .filter((record) => record.companyId === text(companyId, "company_id_required"))
      .filter((record) => (resolvedMode ? record.mode === resolvedMode : true))
      .filter((record) => (resolvedProviderCode ? record.providerCode === resolvedProviderCode : true))
      .sort((left, right) => right.rotatedAt.localeCompare(left.rotatedAt))
      .map(projectSecretRotationRecord);
  }

  function registerCertificateChain({
    sessionToken,
    companyId,
    mode,
    providerCode,
    certificateLabel,
    callbackDomain,
    subjectCommonName,
    sanDomains = [],
    certificateSecretRef = null,
    privateKeySecretRef,
    ownerUserId,
    backupOwnerUserId = null,
    issuedAt = null,
    notBefore = null,
    notAfter,
    renewalWindowDays = 30,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedMode = normalizeVaultMode(mode, "certificate_chain_mode_invalid");
    const resolvedProviderCode = text(providerCode, "certificate_chain_provider_code_required");
    const parsedPrivateKeySecret = parseVaultSecretRef(privateKeySecretRef, {
      code: "certificate_chain_private_key_ref_invalid",
      allowLegacyModeAliases: true
    });
    if (parsedPrivateKeySecret.canonicalMode !== resolvedMode || parsedPrivateKeySecret.providerCode !== resolvedProviderCode) {
      throw error(409, "certificate_chain_private_key_scope_mismatch", "Certificate private key secret must live in the same mode and provider vault.");
    }
    const parsedCertificateSecret = optionalText(certificateSecretRef)
      ? parseVaultSecretRef(certificateSecretRef, {
          code: "certificate_chain_secret_ref_invalid",
          allowLegacyModeAliases: true
        })
      : null;
    if (parsedCertificateSecret && (parsedCertificateSecret.canonicalMode !== resolvedMode || parsedCertificateSecret.providerCode !== resolvedProviderCode)) {
      throw error(409, "certificate_chain_secret_scope_mismatch", "Certificate bundle secret must live in the same mode and provider vault.");
    }
    const createdAt = nowIso(clock);
    const certificateChain = {
      certificateChainId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      mode: resolvedMode,
      providerCode: resolvedProviderCode,
      certificateLabel: text(certificateLabel, "certificate_chain_label_required"),
      callbackDomain: text(callbackDomain, "certificate_chain_callback_domain_required"),
      subjectCommonName: text(subjectCommonName, "certificate_chain_subject_common_name_required"),
      sanDomains: normalizeStringList(sanDomains, "certificate_chain_san_domain_required"),
      certificateSecretRef: parsedCertificateSecret?.originalRef || null,
      privateKeySecretRef: parsedPrivateKeySecret.originalRef,
      privateKeySecretVersion: parsedPrivateKeySecret.secretName,
      ownerUserId: text(ownerUserId, "certificate_chain_owner_user_id_required"),
      backupOwnerUserId: optionalText(backupOwnerUserId),
      issuedAt: optionalIsoTimestamp(issuedAt, "certificate_chain_issued_at_invalid"),
      notBefore: optionalIsoTimestamp(notBefore, "certificate_chain_not_before_invalid"),
      notAfter: isoTimestamp(notAfter, "certificate_chain_not_after_required"),
      renewalWindowDays: normalizePositiveInteger(renewalWindowDays, "certificate_chain_renewal_window_invalid"),
      createdByUserId: principal.userId,
      createdAt,
      updatedAt: createdAt
    };
    certificateChain.renewalDueAt = subtractDaysFromTimestamp(certificateChain.notAfter, certificateChain.renewalWindowDays);
    certificateChain.status = resolveCertificateChainStatus(certificateChain, clock);
    state.certificateChains.set(certificateChain.certificateChainId, certificateChain);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.certificate_chain.registered",
      entityType: "certificate_chain",
      entityId: certificateChain.certificateChainId,
      explanation: `Registered certificate chain ${certificateChain.certificateLabel} for ${certificateChain.providerCode} in ${certificateChain.mode}.`
    });
    return projectCertificateChain(certificateChain, clock);
  }

  function listCertificateChains({ sessionToken, companyId, mode = null, providerCode = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedMode = optionalText(mode) ? normalizeVaultMode(mode, "certificate_chain_mode_invalid") : null;
    const resolvedProviderCode = optionalText(providerCode);
    return [...state.certificateChains.values()]
      .filter((record) => record.companyId === text(companyId, "company_id_required"))
      .filter((record) => (resolvedMode ? record.mode === resolvedMode : true))
      .filter((record) => (resolvedProviderCode ? record.providerCode === resolvedProviderCode : true))
      .sort((left, right) => left.callbackDomain.localeCompare(right.callbackDomain))
      .map((record) => projectCertificateChain(record, clock));
  }

  function registerCallbackSecret({
    sessionToken,
    companyId,
    mode,
    providerCode,
    callbackLabel,
    callbackDomain,
    callbackPath,
    currentSecretRef,
    managedSecretId = null,
    ownerUserId,
    backupOwnerUserId = null,
    rotationCadenceDays,
    overlapEndsAt = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedMode = normalizeVaultMode(mode, "callback_secret_mode_invalid");
    const resolvedProviderCode = text(providerCode, "callback_secret_provider_code_required");
    const parsedSecret = parseVaultSecretRef(currentSecretRef, {
      code: "callback_secret_ref_invalid",
      allowLegacyModeAliases: true
    });
    const resolvedCadenceDays = normalizePositiveInteger(rotationCadenceDays, "callback_secret_rotation_cadence_invalid");
    if (parsedSecret.canonicalMode !== resolvedMode || parsedSecret.providerCode !== resolvedProviderCode) {
      throw error(409, "callback_secret_scope_mismatch", "Callback secret must live in the same mode and provider vault.");
    }
    const linkedManagedSecretId = optionalText(managedSecretId);
    if (linkedManagedSecretId) {
      const managedSecret = requireManagedSecret(state, error, companyId, linkedManagedSecretId);
      if (managedSecret.mode !== resolvedMode || managedSecret.providerCode !== resolvedProviderCode) {
        throw error(409, "callback_secret_managed_secret_scope_mismatch", "Linked managed secret must belong to the same mode and provider.");
      }
    }
    const createdAt = nowIso(clock);
    const callbackSecret = {
      callbackSecretId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      mode: resolvedMode,
      providerCode: resolvedProviderCode,
      callbackLabel: text(callbackLabel, "callback_secret_label_required"),
      callbackDomain: text(callbackDomain, "callback_secret_callback_domain_required"),
      callbackPath: text(callbackPath, "callback_secret_callback_path_required"),
      managedSecretId: linkedManagedSecretId,
      currentSecretRef: parsedSecret.originalRef,
      currentSecretVersion: parsedSecret.secretName,
      previousSecretRef: null,
      ownerUserId: text(ownerUserId, "callback_secret_owner_user_id_required"),
      backupOwnerUserId: optionalText(backupOwnerUserId),
      rotationCadenceDays: resolvedCadenceDays,
      overlapEndsAt: optionalIsoTimestamp(overlapEndsAt, "callback_secret_overlap_ends_at_invalid"),
      status: optionalText(overlapEndsAt) ? "dual_running" : "active",
      lastRotatedAt: createdAt,
      nextRotationDueAt: addDaysToTimestamp(createdAt, resolvedCadenceDays),
      createdByUserId: principal.userId,
      createdAt,
      updatedAt: createdAt
    };
    state.callbackSecrets.set(callbackSecret.callbackSecretId, callbackSecret);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.callback_secret.registered",
      entityType: "callback_secret",
      entityId: callbackSecret.callbackSecretId,
      explanation: `Registered callback secret ${callbackSecret.callbackLabel} for ${callbackSecret.providerCode} in ${callbackSecret.mode}.`
    });
    return projectCallbackSecret(callbackSecret);
  }

  function listCallbackSecrets({ sessionToken, companyId, mode = null, providerCode = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedMode = optionalText(mode) ? normalizeVaultMode(mode, "callback_secret_mode_invalid") : null;
    const resolvedProviderCode = optionalText(providerCode);
    return [...state.callbackSecrets.values()]
      .filter((record) => record.companyId === text(companyId, "company_id_required"))
      .filter((record) => (resolvedMode ? record.mode === resolvedMode : true))
      .filter((record) => (resolvedProviderCode ? record.providerCode === resolvedProviderCode : true))
      .sort((left, right) => left.callbackDomain.localeCompare(right.callbackDomain))
      .map(projectCallbackSecret);
  }

  function getSecretManagementSummary({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const managedSecrets = [...state.managedSecrets.values()].filter((record) => record.companyId === resolvedCompanyId);
    const certificateChains = [...state.certificateChains.values()].filter((record) => record.companyId === resolvedCompanyId);
    const callbackSecrets = [...state.callbackSecrets.values()].filter((record) => record.companyId === resolvedCompanyId);
    const secretRotationRecords = [...state.secretRotationRecords.values()].filter((record) => record.companyId === resolvedCompanyId);
    const evaluatedCertificateChains = certificateChains.map((record) => projectCertificateChain(record, clock));
    const modeIsolationViolations = [
      ...managedSecrets.flatMap((record) => detectManagedSecretIsolationViolations(record)),
      ...callbackSecrets.flatMap((record) => detectCallbackSecretIsolationViolations(record)),
      ...certificateChains.flatMap((record) => detectCertificateChainIsolationViolations(record))
    ];
    return {
      companyId: resolvedCompanyId,
      generatedAt: nowIso(clock),
      managedSecretCount: managedSecrets.length,
      rotationDueCount: managedSecrets.filter((record) => new Date(record.nextRotationDueAt) <= new Date(clock())).length,
      dualRunningSecretCount: managedSecrets.filter((record) => record.status === "dual_running").length,
      secretRotationRecordCount: secretRotationRecords.length,
      expiringCertificateCount: evaluatedCertificateChains.filter((record) => record.status === "renewal_due").length,
      expiredCertificateCount: evaluatedCertificateChains.filter((record) => record.status === "expired").length,
      dualRunningCallbackSecretCount: callbackSecrets.filter((record) => record.status === "dual_running").length,
      modeIsolationViolationCount: modeIsolationViolations.length,
      modeIsolationViolations,
      recentSecretRotations: secretRotationRecords
        .sort((left, right) => right.rotatedAt.localeCompare(left.rotatedAt))
        .slice(0, 10)
        .map(projectSecretRotationRecord)
    };
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
      const inventory = [...state.managedSecrets.values()].filter((entry) => entry.companyId === companyId);
      const parsedRefs = refs.map((entry) => {
        try {
          const parsed = parseVaultSecretRef(entry, {
            code: "secret_ref_invalid",
            allowLegacyModeAliases: true
          });
          const inventoryMatch = inventory.find((candidate) => candidate.currentSecretRef === parsed.originalRef || candidate.previousSecretRef === parsed.originalRef);
          return {
            secretRef: redactSecretRef(entry),
            valid: true,
            canonicalMode: parsed.canonicalMode,
            providerCode: parsed.providerCode,
            registered: Boolean(inventoryMatch)
          };
        } catch {
          return {
            secretRef: redactSecretRef(entry),
            valid: false,
            canonicalMode: null,
            providerCode: null,
            registered: false
          };
        }
      });
      resultSummary = {
        verified:
          parsedRefs.length > 0
          && parsedRefs.every((entry) => entry.valid)
          && (inventory.length === 0 || parsedRefs.every((entry) => entry.registered)),
        secretRefs: parsedRefs.map((entry) => entry.secretRef),
        secretRefInventory: parsedRefs
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
    const resolvedMode = assertAllowed(mode, IMPERSONATION_MODES, "impersonation_mode_invalid");
    const normalizedRestrictedActions = normalizeActions(restrictedActions);
    const createdAt = nowIso(clock);
    const expiresAt = addMinutes(createdAt, normalizePositiveInteger(expiresInMinutes, "impersonation_expiry_invalid"));
    if (resolvedMode === "read_only" && normalizedRestrictedActions.length > 0) {
      throw error(409, "impersonation_read_only_restricted_actions_forbidden", "Read-only impersonation cannot define restricted write actions.");
    }
    if (resolvedMode === "limited_write" && normalizedRestrictedActions.length === 0) {
      throw error(400, "impersonation_restricted_actions_required", "Limited-write impersonation requires a restricted action allowlist.");
    }
    const session = {
      sessionId: crypto.randomUUID(),
      companyId,
      supportCaseId,
      targetCompanyUserId: targetCompanyUser.companyUserId,
      targetUserId: targetCompanyUser.userId,
      requestedByUserId: principal.userId,
      approvedByUserId: null,
      purposeCode: text(purposeCode, "impersonation_purpose_required"),
      mode: resolvedMode,
      restrictedActions: normalizedRestrictedActions,
      approvalActorIds: [],
      status: "requested",
      approvedAt: null,
      activatedByUserId: null,
      startedAt: null,
      expiresAt,
      watermark: buildSessionWatermark({
        sessionKind: "impersonation",
        mode: resolvedMode,
        referenceCode: supportCaseId,
        targetCompanyUserId: targetCompanyUser.companyUserId,
        expiresAt
      }),
      endedAt: null,
      endReasonCode: null,
      createdAt,
      updatedAt: createdAt
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
      .map((session) => expireImpersonationSessionIfNeeded(session, clock))
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
    const supportCase = requireSupportCase(companyId, session.supportCaseId);
    const approvalActorIds = resolveImpersonationApprovalActors({
      supportCase,
      session,
      error
    });
    session.status = "approved";
    session.approvedByUserId = principal.userId;
    session.approvalActorIds = approvalActorIds;
    session.approvedAt = nowIso(clock);
    session.updatedAt = session.approvedAt;
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

  function activateImpersonation({
    sessionToken,
    companyId,
    sessionId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const session = requireImpersonationSession(companyId, sessionId);
    if (session.status === "active" || session.status === "terminated") {
      return clone(session);
    }
    if (session.status === "expired") {
      throw error(409, "impersonation_session_expired", "Impersonation session has expired.");
    }
    if (session.status !== "approved") {
      throw error(409, "impersonation_start_invalid_state", "Impersonation can only start after approval.");
    }
    const startedAt = nowIso(clock);
    if (new Date(session.expiresAt) < new Date(startedAt)) {
      session.status = "expired";
      session.endedAt = startedAt;
      session.endReasonCode = "expired";
      session.updatedAt = startedAt;
      throw error(409, "impersonation_session_expired", "Impersonation session has expired.");
    }
    session.status = "active";
    session.activatedByUserId = principal.userId;
    session.startedAt = startedAt;
    session.updatedAt = startedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.impersonation.started",
      entityType: "impersonation_session",
      entityId: session.sessionId,
      explanation: `Started impersonation ${session.sessionId}.`
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
    if (!["requested", "approved", "active", "expired"].includes(session.status)) {
      return clone(session);
    }
    if (session.status !== "expired") {
      session.status = "terminated";
    }
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
    const reviewPeriod = resolveQuarterlyReviewWindow(clock);
    const findings = buildAccessReviewFindings(companyId, orgAuthPlatform, {
      reviewPeriod,
      clock
    });
    const review = {
      reviewBatchId: crypto.randomUUID(),
      companyId,
      scopeType: text(scopeType, "access_review_scope_type_required"),
      scopeRef: optionalText(scopeRef) || companyId,
      cadenceCode: ACCESS_REVIEW_CADENCE_CODES[0],
      generatedAt: nowIso(clock),
      dueAt: addDays(nowIso(clock).slice(0, 10), normalizePositiveInteger(dueInDays, "access_review_due_days_invalid")),
      reviewPeriodStart: reviewPeriod.startDate,
      reviewPeriodEnd: reviewPeriod.endDate,
      staleGrantThresholdDate: reviewPeriod.staleGrantThresholdDate,
      status: findings.length > 0 ? "in_review" : "generated",
      findings,
      coverageSummary: summarizeAccessReviewCoverage(companyId, orgAuthPlatform, findings),
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
    expiresInMinutes = 30,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const createdAt = nowIso(clock);
    const expiresAt = addMinutes(createdAt, normalizePositiveInteger(expiresInMinutes, "break_glass_expiry_invalid"));
    const normalizedRequestedActions = normalizeActions(requestedActions);
    if (normalizedRequestedActions.length === 0) {
      throw error(400, "break_glass_requested_actions_required", "Break-glass requires at least one allowlisted action.");
    }
    const request = {
      breakGlassId: crypto.randomUUID(),
      companyId,
      incidentId: text(incidentId, "break_glass_incident_id_required"),
      purposeCode: text(purposeCode, "break_glass_purpose_required"),
      requestedActions: normalizedRequestedActions,
      requestedByUserId: principal.userId,
      approvals: [],
      status: "requested",
      dualApprovedAt: null,
      activatedByUserId: null,
      activatedAt: null,
      expiresAt,
      watermark: buildSessionWatermark({
        sessionKind: "break_glass",
        mode: "critical",
        referenceCode: incidentId,
        targetCompanyUserId: null,
        expiresAt
      }),
      endedAt: null,
      endReasonCode: null,
      createdAt,
      updatedAt: createdAt
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
      .map((session) => expireBreakGlassSessionIfNeeded(session, clock))
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
    if (session.status === "ended") {
      return clone(session);
    }
    if (principal.userId === session.requestedByUserId) {
      throw error(409, "break_glass_self_approval_forbidden", "Break-glass approvals must come from a separate approver.");
    }
    if (!session.approvals.includes(principal.userId)) {
      session.approvals.push(principal.userId);
    }
    if (session.approvals.length >= 2) {
      session.status = "dual_approved";
      session.dualApprovedAt = nowIso(clock);
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

  function activateBreakGlass({
    sessionToken,
    companyId,
    breakGlassId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const session = requireBreakGlass(companyId, breakGlassId);
    if (session.status === "active" || session.status === "ended") {
      return clone(session);
    }
    if (session.status !== "dual_approved") {
      throw error(409, "break_glass_start_invalid_state", "Break-glass can only start after dual approval.");
    }
    const activatedAt = nowIso(clock);
    if (new Date(session.expiresAt) < new Date(activatedAt)) {
      session.status = "ended";
      session.endReasonCode = "expired";
      session.endedAt = activatedAt;
      session.updatedAt = activatedAt;
      throw error(409, "break_glass_session_expired", "Break-glass session has expired.");
    }
    session.status = "active";
    session.activatedAt = activatedAt;
    session.activatedByUserId = principal.userId;
    session.updatedAt = activatedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.break_glass.started",
      entityType: "break_glass_session",
      entityId: session.breakGlassId,
      explanation: `Started break-glass ${session.breakGlassId}.`
    });
    return clone(session);
  }

  function closeBreakGlassSession({
    sessionToken,
    companyId,
    breakGlassId,
    reasonCode = "manual_end",
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const session = requireBreakGlass(companyId, breakGlassId);
    if (session.status === "ended") {
      return clone(session);
    }
    if (session.status !== "active") {
      throw error(409, "break_glass_close_invalid_state", "Break-glass can only be closed after activation.");
    }
    session.status = "ended";
    session.endReasonCode = text(reasonCode, "break_glass_end_reason_required");
    session.endedAt = nowIso(clock);
    session.updatedAt = session.endedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "backoffice.break_glass.ended",
      entityType: "break_glass_session",
      entityId: session.breakGlassId,
      explanation: `Ended break-glass ${session.breakGlassId}.`
    });
    return clone(session);
  }

  function exportBreakGlassEvidenceBundle({
    sessionToken,
    companyId,
    breakGlassId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.read");
    const session = requireBreakGlass(companyId, breakGlassId);
    return syncBreakGlassEvidenceBundle({
      session,
      actorId: principal.userId,
      correlationId
    });
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

  function requireRuntimeIncident(companyId, incidentId) {
    const runtimeIncident = state.runtimeIncidents.get(text(incidentId, "incident_id_required"));
    if (!runtimeIncident || runtimeIncident.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "runtime_incident_not_found", "Runtime incident was not found.");
    }
    return runtimeIncident;
  }

  function requireReplayPlan(replayPlan, companyId) {
    if (!replayPlan || typeof replayPlan !== "object") {
      throw error(400, "replay_plan_required", "Replay plan is required.");
    }
    if (replayPlan.companyId !== companyId) {
      throw error(409, "replay_plan_company_mismatch", "Replay plan must belong to the same company.");
    }
    return clone(replayPlan);
  }

  function findReplayOperationByPlanId(companyId, replayPlanId) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedReplayPlanId = text(replayPlanId, "async_job_replay_plan_id_required");
    for (const replayOperation of state.replayOperations.values()) {
      if (replayOperation.companyId === resolvedCompanyId && replayOperation.replayPlanId === resolvedReplayPlanId) {
        return replayOperation;
      }
    }
    return null;
  }

  function requireReplayOperationByPlanId(companyId, replayPlanId) {
    const replayOperation = findReplayOperationByPlanId(companyId, replayPlanId);
    if (!replayOperation) {
      throw error(404, "replay_operation_not_found", "Replay operation was not found.");
    }
    return replayOperation;
  }

  function requireImpersonationSession(companyId, sessionId) {
    const session = state.impersonationSessions.get(text(sessionId, "impersonation_session_id_required"));
    if (!session || session.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "impersonation_session_not_found", "Impersonation session was not found.");
    }
    return expireImpersonationSessionIfNeeded(session, clock);
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
    return expireBreakGlassSessionIfNeeded(session, clock);
  }

  function syncSupportCaseEvidenceBundle({ supportCase, actorId, correlationId }) {
    if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
      throw error(500, "evidence_platform_required", "Evidence platform is required.");
    }
    const diagnostics = [...state.adminDiagnostics.values()]
      .filter((diagnostic) => diagnostic.companyId === supportCase.companyId && diagnostic.supportCaseId === supportCase.supportCaseId)
      .sort((left, right) => left.executedAt.localeCompare(right.executedAt));
    const payload = {
      supportCaseId: supportCase.supportCaseId,
      companyId: supportCase.companyId,
      category: supportCase.category,
      severity: supportCase.severity,
      status: supportCase.status,
      requester: clone(supportCase.requester),
      policyScope: supportCase.policyScope,
      requestedActions: [...supportCase.requestedActions],
      approvedActions: [...supportCase.approvedActions],
      actionApprovals: clone(supportCase.actionApprovals),
      relatedObjectRefs: normalizeRefs(supportCase.relatedObjectRefs),
      diagnosticRefs: diagnostics.map((diagnostic) => ({
        commandId: diagnostic.commandId,
        commandType: diagnostic.commandType,
        riskClass: diagnostic.riskClass,
        executedAt: diagnostic.executedAt
      })),
      resolutionCode: supportCase.resolutionCode || null,
      resolutionNote: supportCase.resolutionNote || null,
      closedAt: supportCase.closedAt || null
    };
    const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
      companyId: supportCase.companyId,
      bundleType: "support_case",
      sourceObjectType: "support_case",
      sourceObjectId: supportCase.supportCaseId,
      sourceObjectVersion: supportCase.updatedAt,
      title: `Support case ${supportCase.supportCaseId}`,
      retentionClass: "regulated",
      classificationCode: "restricted_internal",
      metadata: {
        compatibilityPayload: payload
      },
      artifactRefs: diagnostics.map((diagnostic) => ({
        artifactType: "admin_diagnostic",
        artifactRef: diagnostic.commandId,
        checksum: hashObject({
          commandType: diagnostic.commandType,
          resultSummary: diagnostic.resultSummary,
          executedAt: diagnostic.executedAt
        }),
        roleCode: diagnostic.riskClass,
        metadata: {
          commandType: diagnostic.commandType
        }
      })),
      auditRefs: clone(supportCase.actionApprovals),
      sourceRefs: payload.diagnosticRefs,
      relatedObjectRefs: payload.relatedObjectRefs,
      actorId,
      correlationId,
      previousEvidenceBundleId: supportCase.currentEvidenceBundleId || null
    });
    supportCase.currentEvidenceBundleId = bundle.evidenceBundleId;
    return clone({
      supportCaseEvidenceBundleId: bundle.evidenceBundleId,
      evidenceBundleId: bundle.evidenceBundleId,
      checksum: bundle.checksum,
      status: bundle.status,
      frozenAt: bundle.frozenAt,
      archivedAt: bundle.archivedAt,
      ...payload,
      supportCaseStatus: payload.status,
      status: bundle.status
    });
  }

  function syncBreakGlassEvidenceBundle({ session, actorId, correlationId }) {
    if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
      throw error(500, "evidence_platform_required", "Evidence platform is required.");
    }
    const payload = {
      breakGlassId: session.breakGlassId,
      companyId: session.companyId,
      incidentId: session.incidentId,
      purposeCode: session.purposeCode,
      requestedActions: [...session.requestedActions],
      requestedByUserId: session.requestedByUserId,
      approvals: [...session.approvals],
      status: session.status,
      dualApprovedAt: session.dualApprovedAt,
      activatedAt: session.activatedAt,
      expiresAt: session.expiresAt,
      endedAt: session.endedAt,
      endReasonCode: session.endReasonCode || null,
      watermark: clone(session.watermark)
    };
    const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
      companyId: session.companyId,
      bundleType: "break_glass",
      sourceObjectType: "break_glass_session",
      sourceObjectId: session.breakGlassId,
      sourceObjectVersion: session.updatedAt,
      title: `Break-glass ${session.breakGlassId}`,
      retentionClass: "regulated",
      classificationCode: "restricted_internal",
      metadata: {
        compatibilityPayload: payload
      },
      artifactRefs: payload.approvals.map((approvalActorId) => ({
        artifactType: "break_glass_approval",
        artifactRef: approvalActorId,
        checksum: hashObject({
          approvalActorId,
          breakGlassId: session.breakGlassId
        }),
        roleCode: "approval"
      })),
      auditRefs: payload.approvals.map((approvalActorId) => ({
        approvalActorId
      })),
      sourceRefs: [
        {
          incidentId: session.incidentId,
          status: session.status
        }
      ],
      relatedObjectRefs: [
        {
          objectType: "runtime_incident",
          objectId: session.incidentId
        }
      ],
      actorId,
      correlationId,
      previousEvidenceBundleId: session.currentEvidenceBundleId || null
    });
    session.currentEvidenceBundleId = bundle.evidenceBundleId;
    return clone({
      breakGlassEvidenceBundleId: bundle.evidenceBundleId,
      evidenceBundleId: bundle.evidenceBundleId,
      checksum: bundle.checksum,
      status: bundle.status,
      frozenAt: bundle.frozenAt,
      archivedAt: bundle.archivedAt,
      ...payload,
      breakGlassStatus: payload.status,
      status: bundle.status
    });
  }
}

function buildAccessReviewFindings(companyId, orgAuthPlatform, { reviewPeriod, clock = () => new Date() } = {}) {
  const snapshot = orgAuthPlatform?.snapshot?.() || {};
  const companyUsers = Array.isArray(snapshot.companyUsers) ? snapshot.companyUsers.filter((companyUser) => companyUser.companyId === companyId) : [];
  const findings = [];
  const rolesByUser = new Map();
  const activeDelegations = Array.isArray(snapshot.delegations)
    ? snapshot.delegations.filter((delegation) => delegation.companyId === companyId && delegation.status === "active")
    : [];
  const activeObjectGrants = Array.isArray(snapshot.objectGrants)
    ? snapshot.objectGrants.filter((grant) => grant.companyId === companyId && grant.status === "active")
    : [];
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
  const staleThresholdDate = reviewPeriod?.staleGrantThresholdDate || addDays(nowIso(clock).slice(0, 10), -90);
  for (const delegation of activeDelegations) {
    const delegationAgeAnchor = delegation.startsAt || delegation.createdAt || null;
    if (delegationAgeAnchor && delegationAgeAnchor.slice(0, 10) <= staleThresholdDate) {
      findings.push({
        findingId: crypto.randomUUID(),
        companyId,
        userId: null,
        findingCode: "access.stale_delegation",
        severity: "high",
        relatedCompanyUserIds: [delegation.fromCompanyUserId, delegation.toCompanyUserId],
        relatedDelegationIds: [delegation.delegationId],
        relatedObjectGrantIds: [],
        decision: "pending",
        remediationNote: null,
        decidedByUserId: null,
        decidedAt: null
      });
    }
  }
  for (const grant of activeObjectGrants) {
    const grantAgeAnchor = grant.startsAt || grant.createdAt || null;
    if (grantAgeAnchor && grantAgeAnchor.slice(0, 10) <= staleThresholdDate) {
      findings.push({
        findingId: crypto.randomUUID(),
        companyId,
        userId: null,
        findingCode: "access.stale_object_grant",
        severity: "medium",
        relatedCompanyUserIds: [grant.companyUserId],
        relatedDelegationIds: [],
        relatedObjectGrantIds: [grant.objectGrantId],
        decision: "pending",
        remediationNote: null,
        decidedByUserId: null,
        decidedAt: null
      });
    }
  }
  return findings;
}

function summarizeAccessReviewCoverage(companyId, orgAuthPlatform, findings) {
  const snapshot = orgAuthPlatform?.snapshot?.() || {};
  const companyUsers = Array.isArray(snapshot.companyUsers) ? snapshot.companyUsers.filter((companyUser) => companyUser.companyId === companyId) : [];
  const activeDelegations = Array.isArray(snapshot.delegations)
    ? snapshot.delegations.filter((delegation) => delegation.companyId === companyId && delegation.status === "active")
    : [];
  const activeObjectGrants = Array.isArray(snapshot.objectGrants)
    ? snapshot.objectGrants.filter((grant) => grant.companyId === companyId && grant.status === "active")
    : [];
  return {
    companyUserCount: companyUsers.length,
    activeDelegationCount: activeDelegations.length,
    activeObjectGrantCount: activeObjectGrants.length,
    findingCount: findings.length,
    pendingFindingCount: findings.filter((finding) => finding.decision === "pending").length
  };
}

function createFinding(companyId, userId, findingCode, severity, records) {
  return {
    findingId: crypto.randomUUID(),
    companyId,
    userId,
    findingCode,
    severity,
    relatedCompanyUserIds: records.map((record) => record.companyUserId),
    relatedDelegationIds: [],
    relatedObjectGrantIds: [],
    decision: "pending",
    remediationNote: null,
    decidedByUserId: null,
    decidedAt: null
  };
}

function resolveQuarterlyReviewWindow(clock = () => new Date()) {
  const now = new Date(clock());
  const month = now.getUTCMonth();
  const quarterIndex = Math.floor(month / 3);
  const quarterStartMonth = quarterIndex * 3;
  const quarterEndMonth = quarterStartMonth + 2;
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), quarterEndMonth + 1, 0));
  const staleGrantThresholdDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  staleGrantThresholdDate.setUTCDate(staleGrantThresholdDate.getUTCDate() - 90);
  return {
    quarterCode: `${startDate.getUTCFullYear()}-Q${quarterIndex + 1}`,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    staleGrantThresholdDate: staleGrantThresholdDate.toISOString().slice(0, 10)
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

function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function resolveImpersonationApprovalActors({ supportCase, session, error }) {
  const readOnlyApprovers = listApprovedSupportActors(
    supportCase,
    SUPPORT_ACTION_IMPERSONATION_READ_ONLY,
    session.requestedByUserId
  );
  if (readOnlyApprovers.length === 0) {
    throw error(
      403,
      "impersonation_read_only_approval_required",
      "Impersonation requires approved read-only support access before activation."
    );
  }
  if (session.mode === "read_only") {
    return [readOnlyApprovers[0]];
  }

  const limitedWriteApprovers = listApprovedSupportActors(
    supportCase,
    SUPPORT_ACTION_IMPERSONATION_LIMITED_WRITE,
    session.requestedByUserId
  );
  if (limitedWriteApprovers.length === 0) {
    throw error(
      403,
      "impersonation_limited_write_approval_required",
      "Limited-write impersonation requires an explicit write-capable approval."
    );
  }
  const approvalPair = findDistinctApprovalPair(readOnlyApprovers, limitedWriteApprovers);
  if (!approvalPair) {
    throw error(
      403,
      "impersonation_limited_write_dual_approval_required",
      "Limited-write impersonation requires two distinct approval actors."
    );
  }
  return approvalPair;
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

function listApprovedSupportActors(supportCase, action, excludedActorId) {
  if (!supportCase.approvedActions.includes(action)) {
    return [];
  }
  return [...new Set(
    supportCase.actionApprovals
      .filter(
        (candidate) =>
          Array.isArray(candidate.approvedActions)
          && candidate.approvedActions.includes(action)
          && candidate.approvedByUserId !== supportCase.createdByUserId
          && candidate.approvedByUserId !== excludedActorId
      )
      .map((candidate) => candidate.approvedByUserId)
  )];
}

function findDistinctApprovalPair(primaryActors, secondaryActors) {
  for (const primaryActorId of primaryActors) {
    for (const secondaryActorId of secondaryActors) {
      if (primaryActorId !== secondaryActorId) {
        return [primaryActorId, secondaryActorId];
      }
    }
  }
  return null;
}

function redactInput(input) {
  const payload = clone(input || {});
  if (Array.isArray(payload.secretRefs)) {
    payload.secretRefs = payload.secretRefs.map((entry) => redactSecretRef(entry));
  }
  if (typeof payload.secretRef === "string") {
    payload.secretRef = redactSecretRef(payload.secretRef);
  }
  if (typeof payload.currentSecretRef === "string") {
    payload.currentSecretRef = redactSecretRef(payload.currentSecretRef);
  }
  if (typeof payload.nextSecretRef === "string") {
    payload.nextSecretRef = redactSecretRef(payload.nextSecretRef);
  }
  if (typeof payload.privateKeySecretRef === "string") {
    payload.privateKeySecretRef = redactSecretRef(payload.privateKeySecretRef);
  }
  if (typeof payload.certificateSecretRef === "string") {
    payload.certificateSecretRef = redactSecretRef(payload.certificateSecretRef);
  }
  return payload;
}

function redactSecretRef(value) {
  const resolved = typeof value === "string" && value.trim().length > 0 ? value.trim() : "***";
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

function addDaysToTimestamp(timestamp, days) {
  const value = new Date(timestamp);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function subtractDaysFromTimestamp(timestamp, days) {
  const value = new Date(timestamp);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString();
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

function isoTimestamp(value, code) {
  const resolved = new Date(text(value, code));
  if (Number.isNaN(resolved.getTime())) {
    throw createValidationError(code, `${code} must be a valid ISO timestamp.`);
  }
  return resolved.toISOString();
}

function optionalIsoTimestamp(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return isoTimestamp(value, code);
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

function buildSessionWatermark({
  sessionKind,
  mode,
  referenceCode,
  targetCompanyUserId = null,
  expiresAt
} = {}) {
  const resolvedKind = text(sessionKind, "session_watermark_kind_required");
  const resolvedMode = text(mode, "session_watermark_mode_required");
  const resolvedReferenceCode = text(referenceCode, "session_watermark_reference_required");
  const resolvedExpiresAt = isoTimestamp(expiresAt, "session_watermark_expires_at_required");
  const watermarkCode = resolvedKind === "break_glass" ? "BREAK-GLASS" : "SUPPORT-IMPERSONATION";
  const labelSuffix = resolvedKind === "break_glass" ? resolvedReferenceCode : `${resolvedReferenceCode}${targetCompanyUserId ? `:${targetCompanyUserId}` : ""}`;
  return {
    watermarkCode,
    label: `${watermarkCode}:${labelSuffix}`,
    bannerText: resolvedKind === "break_glass"
      ? `Emergency support session for incident ${resolvedReferenceCode}`
      : `Support impersonation session for case ${resolvedReferenceCode}`,
    severity: resolvedKind === "break_glass" ? "critical" : resolvedMode === "limited_write" ? "high" : "medium",
    sessionKind: resolvedKind,
    mode: resolvedMode,
    referenceCode: resolvedReferenceCode,
    targetCompanyUserId: optionalText(targetCompanyUserId),
    expiresAt: resolvedExpiresAt
  };
}

function expireImpersonationSessionIfNeeded(session, clock = () => new Date()) {
  if (!session || ["terminated", "expired"].includes(session.status)) {
    return session;
  }
  if (new Date(session.expiresAt) >= new Date(clock())) {
    return session;
  }
  session.status = "expired";
  session.endReasonCode = session.endReasonCode || "expired";
  session.endedAt = session.endedAt || nowIso(clock);
  session.updatedAt = session.endedAt;
  return session;
}

function expireBreakGlassSessionIfNeeded(session, clock = () => new Date()) {
  if (!session || session.status === "ended") {
    return session;
  }
  if (new Date(session.expiresAt) >= new Date(clock())) {
    return session;
  }
  session.status = "ended";
  session.endReasonCode = session.endReasonCode || "expired";
  session.endedAt = session.endedAt || nowIso(clock);
  session.updatedAt = session.endedAt;
  return session;
}

function normalizeStringList(values, code) {
  if (!Array.isArray(values) || values.length === 0) {
    throw createValidationError(code, `${code} must contain at least one value.`);
  }
  return [...new Set(values.map((entry) => text(entry, code)))];
}

function normalizeIdList(values, code) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((entry) => text(entry, code)))];
}

function normalizeVaultMode(value, code) {
  const resolved = text(value, code).toLowerCase();
  const canonicalMode = VAULT_MODE_ALIASES[resolved] || null;
  if (!canonicalMode || !CANONICAL_VAULT_MODE_CODES.includes(canonicalMode)) {
    throw createValidationError(code, `${code} does not allow ${resolved}.`);
  }
  return canonicalMode;
}

function parseVaultSecretRef(value, { code = "secret_ref_invalid", allowLegacyModeAliases = false } = {}) {
  const resolved = text(value, code);
  const match = /^vault:\/\/([^/]+)\/([^/]+)\/(.+)$/u.exec(resolved);
  if (!match) {
    throw createValidationError(code, `${code} must use vault://<mode>/<provider>/<secret-name>.`);
  }
  const rawMode = match[1].trim().toLowerCase();
  const canonicalMode = allowLegacyModeAliases ? normalizeVaultMode(rawMode, code) : rawMode;
  if (!CANONICAL_VAULT_MODE_CODES.includes(canonicalMode)) {
    throw createValidationError(code, `${code} must use one of ${CANONICAL_VAULT_MODE_CODES.join(", ")}.`);
  }
  const providerCode = text(match[2], code);
  const secretName = text(match[3], code);
  return {
    originalRef: resolved,
    rawMode,
    canonicalMode,
    providerCode,
    secretName,
    vaultRef: `vault://${canonicalMode}/${providerCode}`
  };
}

function requireManagedSecret(state, error, companyId, managedSecretId) {
  const managedSecret = state.managedSecrets.get(text(managedSecretId, "managed_secret_id_required"));
  if (!managedSecret || managedSecret.companyId !== text(companyId, "company_id_required")) {
    throw error(404, "managed_secret_not_found", "Managed secret was not found.");
  }
  return managedSecret;
}

function requireCertificateChain(state, error, companyId, certificateChainId) {
  const certificateChain = state.certificateChains.get(text(certificateChainId, "certificate_chain_id_required"));
  if (!certificateChain || certificateChain.companyId !== text(companyId, "company_id_required")) {
    throw error(404, "certificate_chain_not_found", "Certificate chain was not found.");
  }
  return certificateChain;
}

function requireCallbackSecret(state, error, companyId, callbackSecretId) {
  const callbackSecret = state.callbackSecrets.get(text(callbackSecretId, "callback_secret_id_required"));
  if (!callbackSecret || callbackSecret.companyId !== text(companyId, "company_id_required")) {
    throw error(404, "callback_secret_not_found", "Callback secret was not found.");
  }
  return callbackSecret;
}

function ensureSecretRefIsUniqueAcrossInventory({ state, companyId, secretRef, ignoredManagedSecretId = null }) {
  for (const record of state.managedSecrets.values()) {
    if (record.companyId !== companyId) {
      continue;
    }
    if (ignoredManagedSecretId && record.managedSecretId === ignoredManagedSecretId) {
      continue;
    }
    if (record.currentSecretRef === secretRef || record.previousSecretRef === secretRef) {
      throw createValidationError("managed_secret_ref_duplicate", "Secret ref is already registered in managed secret inventory.");
    }
  }
}

function resolveCertificateChainStatus(record, clock) {
  const now = new Date(clock());
  const notAfter = new Date(record.notAfter);
  if (notAfter < now) {
    return "expired";
  }
  const renewalDueAt = new Date(record.renewalDueAt);
  if (renewalDueAt <= now) {
    return "renewal_due";
  }
  return "active";
}

function projectManagedSecret(record) {
  return {
    managedSecretId: record.managedSecretId,
    companyId: record.companyId,
    mode: record.mode,
    providerCode: record.providerCode,
    secretType: record.secretType,
    ownerUserId: record.ownerUserId,
    backupOwnerUserId: record.backupOwnerUserId,
    vaultRef: record.vaultRef,
    currentSecretRef: redactSecretRef(record.currentSecretRef),
    previousSecretRef: record.previousSecretRef ? redactSecretRef(record.previousSecretRef) : null,
    currentSecretVersion: record.currentSecretVersion,
    previousSecretVersion: record.previousSecretVersion,
    rotationCadenceDays: record.rotationCadenceDays,
    lastRotatedAt: record.lastRotatedAt,
    nextRotationDueAt: record.nextRotationDueAt,
    supportsDualRunning: record.supportsDualRunning,
    status: record.status,
    metadataJson: clone(record.metadataJson),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function projectSecretRotationRecord(record) {
  return {
    secretRotationRecordId: record.secretRotationRecordId,
    companyId: record.companyId,
    managedSecretId: record.managedSecretId,
    mode: record.mode,
    providerCode: record.providerCode,
    secretType: record.secretType,
    previousSecretVersion: record.previousSecretVersion,
    nextSecretVersion: record.nextSecretVersion,
    previousSecretRef: record.previousSecretRef ? redactSecretRef(record.previousSecretRef) : null,
    nextSecretRef: redactSecretRef(record.nextSecretRef),
    requestedByUserId: record.requestedByUserId,
    verificationMode: record.verificationMode,
    dualRunningUntil: record.dualRunningUntil,
    linkedCallbackSecretIds: [...record.linkedCallbackSecretIds],
    linkedCertificateChainIds: [...record.linkedCertificateChainIds],
    rotatedAt: record.rotatedAt,
    status: record.status
  };
}

function projectCertificateChain(record, clock) {
  const status = resolveCertificateChainStatus(record, clock);
  return {
    certificateChainId: record.certificateChainId,
    companyId: record.companyId,
    mode: record.mode,
    providerCode: record.providerCode,
    certificateLabel: record.certificateLabel,
    callbackDomain: record.callbackDomain,
    subjectCommonName: record.subjectCommonName,
    sanDomains: [...record.sanDomains],
    certificateSecretRef: record.certificateSecretRef ? redactSecretRef(record.certificateSecretRef) : null,
    privateKeySecretRef: redactSecretRef(record.privateKeySecretRef),
    privateKeySecretVersion: record.privateKeySecretVersion,
    ownerUserId: record.ownerUserId,
    backupOwnerUserId: record.backupOwnerUserId,
    issuedAt: record.issuedAt,
    notBefore: record.notBefore,
    notAfter: record.notAfter,
    renewalWindowDays: record.renewalWindowDays,
    renewalDueAt: record.renewalDueAt,
    status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function projectCallbackSecret(record) {
  return {
    callbackSecretId: record.callbackSecretId,
    companyId: record.companyId,
    mode: record.mode,
    providerCode: record.providerCode,
    callbackLabel: record.callbackLabel,
    callbackDomain: record.callbackDomain,
    callbackPath: record.callbackPath,
    managedSecretId: record.managedSecretId,
    currentSecretRef: redactSecretRef(record.currentSecretRef),
    previousSecretRef: record.previousSecretRef ? redactSecretRef(record.previousSecretRef) : null,
    currentSecretVersion: record.currentSecretVersion,
    ownerUserId: record.ownerUserId,
    backupOwnerUserId: record.backupOwnerUserId,
    rotationCadenceDays: record.rotationCadenceDays,
    overlapEndsAt: record.overlapEndsAt,
    status: record.status,
    lastRotatedAt: record.lastRotatedAt,
    nextRotationDueAt: record.nextRotationDueAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function detectManagedSecretIsolationViolations(record) {
  try {
    const parsedCurrent = parseVaultSecretRef(record.currentSecretRef, {
      code: "managed_secret_ref_invalid",
      allowLegacyModeAliases: true
    });
    const violations = [];
    if (parsedCurrent.canonicalMode !== record.mode) {
      violations.push({
        objectType: "managed_secret",
        objectId: record.managedSecretId,
        violationCode: "managed_secret_mode_mismatch",
        detail: `${record.managedSecretId} points to ${parsedCurrent.canonicalMode} while record mode is ${record.mode}.`
      });
    }
    if (parsedCurrent.providerCode !== record.providerCode) {
      violations.push({
        objectType: "managed_secret",
        objectId: record.managedSecretId,
        violationCode: "managed_secret_provider_mismatch",
        detail: `${record.managedSecretId} points to provider ${parsedCurrent.providerCode} while record provider is ${record.providerCode}.`
      });
    }
    return violations;
  } catch {
    return [{
      objectType: "managed_secret",
      objectId: record.managedSecretId,
      violationCode: "managed_secret_ref_invalid",
      detail: `${record.managedSecretId} stores an invalid vault reference.`
    }];
  }
}

function detectCallbackSecretIsolationViolations(record) {
  try {
    const parsedCurrent = parseVaultSecretRef(record.currentSecretRef, {
      code: "callback_secret_ref_invalid",
      allowLegacyModeAliases: true
    });
    const violations = [];
    if (parsedCurrent.canonicalMode !== record.mode) {
      violations.push({
        objectType: "callback_secret",
        objectId: record.callbackSecretId,
        violationCode: "callback_secret_mode_mismatch",
        detail: `${record.callbackSecretId} points to ${parsedCurrent.canonicalMode} while record mode is ${record.mode}.`
      });
    }
    if (parsedCurrent.providerCode !== record.providerCode) {
      violations.push({
        objectType: "callback_secret",
        objectId: record.callbackSecretId,
        violationCode: "callback_secret_provider_mismatch",
        detail: `${record.callbackSecretId} points to provider ${parsedCurrent.providerCode} while record provider is ${record.providerCode}.`
      });
    }
    return violations;
  } catch {
    return [{
      objectType: "callback_secret",
      objectId: record.callbackSecretId,
      violationCode: "callback_secret_ref_invalid",
      detail: `${record.callbackSecretId} stores an invalid callback secret reference.`
    }];
  }
}

function detectCertificateChainIsolationViolations(record) {
  try {
    const parsedPrivateKey = parseVaultSecretRef(record.privateKeySecretRef, {
      code: "certificate_chain_private_key_ref_invalid",
      allowLegacyModeAliases: true
    });
    const violations = [];
    if (parsedPrivateKey.canonicalMode !== record.mode) {
      violations.push({
        objectType: "certificate_chain",
        objectId: record.certificateChainId,
        violationCode: "certificate_chain_mode_mismatch",
        detail: `${record.certificateChainId} private key points to ${parsedPrivateKey.canonicalMode} while record mode is ${record.mode}.`
      });
    }
    if (parsedPrivateKey.providerCode !== record.providerCode) {
      violations.push({
        objectType: "certificate_chain",
        objectId: record.certificateChainId,
        violationCode: "certificate_chain_provider_mismatch",
        detail: `${record.certificateChainId} private key points to provider ${parsedPrivateKey.providerCode} while record provider is ${record.providerCode}.`
      });
    }
    return violations;
  } catch {
    return [{
      objectType: "certificate_chain",
      objectId: record.certificateChainId,
      violationCode: "certificate_chain_private_key_invalid",
      detail: `${record.certificateChainId} stores an invalid private key secret reference.`
    }];
  }
}

function createValidationError(code, message) {
  const instance = new Error(message);
  instance.status = 400;
  instance.code = code;
  return instance;
}
