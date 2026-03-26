import crypto from "node:crypto";

export const FEATURE_FLAG_SCOPE_TYPES = Object.freeze(["global", "company", "company_user"]);
export const FEATURE_FLAG_TYPES = Object.freeze(["release", "ops", "entitlement", "kill_switch"]);
export const FEATURE_FLAG_RISK_CLASSES = Object.freeze(["low", "medium", "high"]);
export const EMERGENCY_DISABLE_STATUSES = Object.freeze(["active", "released"]);
export const LOAD_PROFILE_STATUSES = Object.freeze(["draft", "passed", "failed"]);
export const RESTORE_DRILL_STATUSES = Object.freeze(["planned", "passed", "failed"]);
export const CHAOS_SCENARIO_STATUSES = Object.freeze(["planned", "executed", "failed"]);
export const INCIDENT_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const INCIDENT_STATUSES = Object.freeze(["open", "triaged", "mitigating", "stabilized", "resolved", "post_review", "closed"]);
export const INCIDENT_SIGNAL_TYPES = Object.freeze([
  "async_job_retry_scheduled",
  "async_job_dead_letter",
  "async_job_replay_planned",
  "async_job_replay_executed",
  "review_queue_sla_breach",
  "restore_drill_failed",
  "chaos_scenario_failed",
  "emergency_disable_activated"
]);
export const INCIDENT_SIGNAL_STATES = Object.freeze(["open", "acknowledged", "promoted", "closed"]);
export const INCIDENT_EVENT_TYPES = Object.freeze([
  "opened",
  "note_added",
  "triaged",
  "status_changed",
  "mitigation_started",
  "stabilized",
  "monitoring_started",
  "post_review_started",
  "post_review_completed",
  "hotfix_deployed",
  "kill_switch_activated",
  "restore_plan_attached",
  "restore_started",
  "restore_completed",
  "replay_executed",
  "resolved",
  "closed"
]);
export const RUNTIME_RESTORE_PLAN_STATUSES = Object.freeze(["draft", "approved", "executing", "completed", "aborted"]);

export function createResilienceModule({
  state,
  clock = () => new Date(),
  orgAuthPlatform,
  audit,
  error
} = {}) {
  const incidentHooks = {
    onAsyncJobRetryScheduled({ job, attempt, retryAt = null } = {}) {
      if (!job) {
        return null;
      }
      return recordIncidentSignalInternal({
        companyId: job.companyId,
        signalType: "async_job_retry_scheduled",
        severity: job.riskClass === "high" ? "high" : "medium",
        summary: `Retry scheduled for async job ${job.jobType}.`,
        correlationId: job.correlationId,
        sourceObjectType: "async_job",
        sourceObjectId: job.jobId,
        actorId: attempt?.workerId || "system",
        metadata: {
          attemptId: attempt?.jobAttemptId || null,
          attemptNo: attempt?.attemptNo || null,
          retryAt,
          errorClass: attempt?.errorClass || job.lastErrorClass || null,
          errorCode: attempt?.errorCode || job.lastErrorCode || null
        }
      });
    },

    onAsyncJobDeadLetter({ job, attempt, deadLetter } = {}) {
      if (!job || !deadLetter) {
        return null;
      }
      return recordIncidentSignalInternal({
        companyId: job.companyId,
        signalType: "async_job_dead_letter",
        severity: job.riskClass === "high" ? "critical" : "high",
        summary: `Async job ${job.jobType} entered dead letter.`,
        correlationId: job.correlationId,
        sourceObjectType: "async_job",
        sourceObjectId: job.jobId,
        actorId: attempt?.workerId || "system",
        metadata: {
          deadLetterId: deadLetter.deadLetterId,
          attemptId: attempt?.jobAttemptId || null,
          attemptNo: attempt?.attemptNo || null,
          errorClass: attempt?.errorClass || job.lastErrorClass || null,
          errorCode: attempt?.errorCode || job.lastErrorCode || null,
          terminalReason: deadLetter.terminalReason || null
        }
      });
    },

    onAsyncJobReplayPlanned({ replayPlan, job } = {}) {
      if (!replayPlan) {
        return null;
      }
      return recordIncidentSignalInternal({
        companyId: replayPlan.companyId,
        signalType: "async_job_replay_planned",
        severity: "medium",
        summary: `Replay planned for async job ${job?.jobType || replayPlan.jobId}.`,
        correlationId: job?.correlationId || null,
        sourceObjectType: "async_job_replay_plan",
        sourceObjectId: replayPlan.replayPlanId,
        actorId: replayPlan.plannedByUserId || "system",
        metadata: {
          jobId: replayPlan.jobId,
          plannedPayloadStrategy: replayPlan.plannedPayloadStrategy,
          reasonCode: replayPlan.reasonCode
        }
      });
    },

    onAsyncJobReplayExecuted({ replayPlan, replayJob, actorId = null } = {}) {
      if (!replayPlan || !replayJob) {
        return null;
      }
      return recordIncidentSignalInternal({
        companyId: replayPlan.companyId,
        signalType: "async_job_replay_executed",
        severity: "medium",
        summary: `Replay executed for async job ${replayJob.jobType}.`,
        correlationId: replayJob.correlationId,
        sourceObjectType: "async_job_replay_plan",
        sourceObjectId: replayPlan.replayPlanId,
        actorId: actorId || replayPlan.approvedByUserId || "system",
        metadata: {
          sourceJobId: replayPlan.jobId,
          replayJobId: replayJob.jobId
        }
      });
    }
  };

  return {
    featureFlagScopeTypes: FEATURE_FLAG_SCOPE_TYPES,
    featureFlagTypes: FEATURE_FLAG_TYPES,
    featureFlagRiskClasses: FEATURE_FLAG_RISK_CLASSES,
    emergencyDisableStatuses: EMERGENCY_DISABLE_STATUSES,
    loadProfileStatuses: LOAD_PROFILE_STATUSES,
    restoreDrillStatuses: RESTORE_DRILL_STATUSES,
    chaosScenarioStatuses: CHAOS_SCENARIO_STATUSES,
    incidentSeverities: INCIDENT_SEVERITIES,
    incidentStatuses: INCIDENT_STATUSES,
    incidentSignalTypes: INCIDENT_SIGNAL_TYPES,
    incidentSignalStates: INCIDENT_SIGNAL_STATES,
    incidentEventTypes: INCIDENT_EVENT_TYPES,
    runtimeRestorePlanStatuses: RUNTIME_RESTORE_PLAN_STATUSES,
    upsertFeatureFlag,
    listFeatureFlags,
    requestEmergencyDisable,
    listEmergencyDisables,
    releaseEmergencyDisable,
    recordLoadProfile,
    listLoadProfiles,
    recordRestoreDrill,
    listRestoreDrills,
    recordChaosScenario,
    listChaosScenarios,
    resolveRuntimeFlags,
    getRuntimeControlPlaneSummary,
    listRuntimeAuditCorrelations,
    getRuntimeAuditCorrelation,
    recordRuntimeIncidentSignal,
    listRuntimeIncidentSignals,
    acknowledgeRuntimeIncidentSignal,
    openRuntimeIncident,
    listRuntimeIncidents,
    getRuntimeIncidentPostReview,
    listRuntimeIncidentEvents,
    recordRuntimeIncidentEvent,
    recordRuntimeIncidentPostReview,
    updateRuntimeIncidentStatus,
    createRuntimeRestorePlan,
    listRuntimeRestorePlans,
    approveRuntimeRestorePlan,
    startRuntimeRestorePlan,
    completeRuntimeRestorePlan,
    abortRuntimeRestorePlan,
    incidentHooks
  };

  function authorize(sessionToken, companyId, action) {
    if (!orgAuthPlatform?.checkAuthorization) {
      throw error(500, "org_auth_platform_required", "Org/auth platform is required.");
    }
    const { principal, decision } = orgAuthPlatform.checkAuthorization({
      sessionToken,
      action,
      resource: {
        companyId,
        objectType: "resilience",
        objectId: companyId,
        scopeCode: "resilience"
      }
    });
    if (!decision.allowed) {
      throw error(403, decision.reasonCode, decision.explanation);
    }
    return principal;
  }

  function upsertFeatureFlag({
    sessionToken,
    companyId,
    flagKey,
    description,
    defaultEnabled = true,
    flagType = "ops",
    scopeType = "global",
    scopeRef = null,
    enabled = null,
    ownerUserId,
    riskClass = "medium",
    sunsetAt,
    changeReason = null,
    approvalActorIds = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedFlagKey = text(flagKey, "feature_flag_key_required");
    const resolvedScope = normalizeScope(companyId, scopeType, scopeRef);
    const recordKey = buildFeatureFlagRecordKey(companyId, resolvedFlagKey, resolvedScope.scopeType, resolvedScope.scopeRef);
    const existing = state.featureFlags.get(recordKey);
    const resolvedDescription = text(description || existing?.description || resolvedFlagKey, "feature_flag_description_required");
    const resolvedFlagType = assertAllowed(flagType || existing?.flagType || "ops", FEATURE_FLAG_TYPES, "feature_flag_type_invalid");
    const resolvedOwnerUserId = text(ownerUserId || existing?.ownerUserId || principal.userId, "feature_flag_owner_required");
    const resolvedRiskClass = assertAllowed(riskClass || existing?.riskClass || "medium", FEATURE_FLAG_RISK_CLASSES, "feature_flag_risk_class_invalid");
    const resolvedSunsetAt = dateOnly(sunsetAt || existing?.sunsetAt || nowIso(clock).slice(0, 10), "feature_flag_sunset_at_required");
    const resolvedDefaultEnabled = defaultEnabled !== false;
    const resolvedEnabled = enabled == null ? existing?.enabled ?? resolvedDefaultEnabled : enabled === true;
    const normalizedApprovalActorIds = normalizeActorIds(approvalActorIds, "feature_flag_approval_actor_ids_invalid");
    const resolvedChangeReason = optionalText(changeReason);
    if (requiresFeatureFlagDualApproval({ riskClass: resolvedRiskClass })) {
      if (normalizedApprovalActorIds.length === 0) {
        throw error(409, "feature_flag_approval_required", "High-risk feature flag changes require a separate approver.");
      }
      if (normalizedApprovalActorIds.includes(principal.userId)) {
        throw error(409, "feature_flag_self_approval_forbidden", "High-risk feature flag changes require a separate approver.");
      }
      validateFeatureFlagApprovalActors({
        authState: orgAuthPlatform?.snapshot?.(),
        companyId,
        clock,
        approvalActorIds: normalizedApprovalActorIds
      });
      if (!resolvedChangeReason) {
        throw error(409, "feature_flag_change_reason_required", "High-risk feature flag changes require a change reason.");
      }
    }
    const previousSnapshot = existing ? clone(existing) : null;
    const featureFlag = existing || {
      featureFlagId: crypto.randomUUID(),
      companyId,
      flagKey: resolvedFlagKey,
      description: resolvedDescription,
      flagType: resolvedFlagType,
      scopeType: resolvedScope.scopeType,
      scopeRef: resolvedScope.scopeRef,
      defaultEnabled: resolvedDefaultEnabled,
      enabled: resolvedEnabled,
      ownerUserId: resolvedOwnerUserId,
      riskClass: resolvedRiskClass,
      sunsetAt: resolvedSunsetAt,
      emergencyDisabled: false,
      emergencyReasonCode: null,
      changeReason: resolvedChangeReason,
      approvalActorIds: normalizedApprovalActorIds,
      changedByUserId: principal.userId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    featureFlag.description = resolvedDescription;
    featureFlag.flagType = resolvedFlagType;
    featureFlag.defaultEnabled = resolvedDefaultEnabled;
    featureFlag.enabled = resolvedEnabled;
    featureFlag.ownerUserId = resolvedOwnerUserId;
    featureFlag.riskClass = resolvedRiskClass;
    featureFlag.sunsetAt = resolvedSunsetAt;
    featureFlag.changeReason = resolvedChangeReason;
    featureFlag.approvalActorIds = normalizedApprovalActorIds;
    featureFlag.changedByUserId = principal.userId;
    featureFlag.updatedAt = nowIso(clock);
    state.featureFlags.set(recordKey, featureFlag);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.feature_flag.upserted",
      entityType: "feature_flag",
      entityId: featureFlag.featureFlagId,
      explanation: `Updated feature flag ${featureFlag.flagKey}.`,
      metadata: {
        flagKey: featureFlag.flagKey,
        scopeType: featureFlag.scopeType,
        scopeRef: featureFlag.scopeRef,
        previousEnabled: previousSnapshot?.enabled ?? null,
        newEnabled: featureFlag.enabled,
        previousRiskClass: previousSnapshot?.riskClass ?? null,
        newRiskClass: featureFlag.riskClass,
        previousFlagType: previousSnapshot?.flagType ?? null,
        newFlagType: featureFlag.flagType,
        changeReason: featureFlag.changeReason,
        approvalActorIds: featureFlag.approvalActorIds
      }
    });
    return clone(featureFlag);
  }

  function listFeatureFlags({ sessionToken, companyId, flagKey = null } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedFlagKey = optionalText(flagKey);
    return [...state.featureFlags.values()]
      .filter((featureFlag) => featureFlag.companyId === text(companyId, "company_id_required"))
      .filter((featureFlag) => (resolvedFlagKey ? featureFlag.flagKey === resolvedFlagKey : true))
      .sort((left, right) => left.flagKey.localeCompare(right.flagKey))
      .map((featureFlag) => ({
        ...clone(featureFlag),
        expired: isFeatureFlagExpired(featureFlag, currentDateKey(clock))
      }));
  }

  function requestEmergencyDisable({
    sessionToken,
    companyId,
    flagKey,
    scopeType = null,
    scopeRef = null,
    reasonCode,
    expiresInMinutes = 60,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const featureFlag = requireFeatureFlag(companyId, flagKey, { scopeType, scopeRef });
    const existingActiveDisable = [...state.emergencyDisables.values()].find(
      (disable) =>
        disable.companyId === companyId
        && disable.flagKey === featureFlag.flagKey
        && disable.scopeType === featureFlag.scopeType
        && normalizeScopeRef(disable.scopeRef) === normalizeScopeRef(featureFlag.scopeRef)
        && disable.status === "active"
    );
    if (existingActiveDisable) {
      throw error(409, "emergency_disable_already_active", "An active emergency disable already exists for this scoped flag.");
    }
    const previousEnabled = featureFlag.enabled === true;
    featureFlag.enabled = false;
    featureFlag.emergencyDisabled = true;
    featureFlag.emergencyReasonCode = text(reasonCode, "emergency_disable_reason_required");
    featureFlag.updatedAt = nowIso(clock);
    const disable = {
      emergencyDisableId: crypto.randomUUID(),
      companyId,
      flagKey: featureFlag.flagKey,
      scopeType: featureFlag.scopeType,
      scopeRef: featureFlag.scopeRef,
      reasonCode: featureFlag.emergencyReasonCode,
      requestedByUserId: principal.userId,
      status: "active",
      previousEnabled,
      activatedAt: nowIso(clock),
      expiresAt: addMinutes(nowIso(clock), normalizePositiveInteger(expiresInMinutes, "emergency_disable_expiry_invalid")),
      releasedByUserId: null,
      releasedAt: null,
      verificationSummary: null,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.emergencyDisables.set(disable.emergencyDisableId, disable);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.emergency_disable.activated",
      entityType: "emergency_disable",
      entityId: disable.emergencyDisableId,
      explanation: `Emergency-disabled ${featureFlag.flagKey}.`
    });
    recordIncidentSignalInternal({
      companyId,
      signalType: "emergency_disable_activated",
      severity: featureFlag.riskClass === "high" || featureFlag.flagType === "kill_switch" ? "critical" : "high",
      summary: `Emergency disable activated for feature flag ${featureFlag.flagKey}.`,
      correlationId,
      sourceObjectType: "emergency_disable",
      sourceObjectId: disable.emergencyDisableId,
      actorId: principal.userId,
      metadata: {
        flagKey: featureFlag.flagKey,
        scopeType: featureFlag.scopeType,
        scopeRef: featureFlag.scopeRef,
        reasonCode: disable.reasonCode,
        expiresAt: disable.expiresAt
      }
    });
    return {
      featureFlag: clone(featureFlag),
      emergencyDisable: clone(disable)
    };
  }

  function listEmergencyDisables({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return [...state.emergencyDisables.values()]
      .filter((disable) => disable.companyId === text(companyId, "company_id_required"))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function releaseEmergencyDisable({
    sessionToken,
    companyId,
    emergencyDisableId,
    verificationSummary,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const disable = requireEmergencyDisable(companyId, emergencyDisableId);
    if (disable.status !== "active") {
      throw error(409, "emergency_disable_not_active", "Only active emergency disables can be released.");
    }
    const featureFlag = requireFeatureFlag(companyId, disable.flagKey, {
      scopeType: disable.scopeType,
      scopeRef: disable.scopeRef
    });
    if (requiresSeparateEmergencyDisableRelease(featureFlag) && disable.requestedByUserId === principal.userId) {
      throw error(
        409,
        "emergency_disable_self_release_forbidden",
        "High-risk or global emergency disables require a separate actor for release."
      );
    }
    featureFlag.enabled = disable.previousEnabled === true;
    featureFlag.emergencyDisabled = false;
    featureFlag.emergencyReasonCode = null;
    featureFlag.updatedAt = nowIso(clock);
    disable.status = "released";
    disable.releasedByUserId = principal.userId;
    disable.releasedAt = nowIso(clock);
    disable.verificationSummary = text(verificationSummary, "emergency_disable_verification_summary_required");
    disable.updatedAt = disable.releasedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.emergency_disable.released",
      entityType: "emergency_disable",
      entityId: disable.emergencyDisableId,
      explanation: `Released emergency disable for ${featureFlag.flagKey}.`
    });
    return {
      featureFlag: clone(featureFlag),
      emergencyDisable: clone(disable)
    };
  }

  function recordLoadProfile({
    sessionToken,
    companyId,
    profileCode,
    targetThroughputPerMinute,
    observedP95Ms,
    queueRecoverySeconds,
    status = "passed",
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const profile = {
      loadProfileId: crypto.randomUUID(),
      companyId,
      profileCode: text(profileCode, "load_profile_code_required"),
      targetThroughputPerMinute: normalizePositiveInteger(targetThroughputPerMinute, "load_profile_target_invalid"),
      observedP95Ms: normalizePositiveInteger(observedP95Ms, "load_profile_latency_invalid"),
      queueRecoverySeconds: normalizePositiveInteger(queueRecoverySeconds, "load_profile_queue_recovery_invalid"),
      status: assertAllowed(status, LOAD_PROFILE_STATUSES, "load_profile_status_invalid"),
      recordedByUserId: principal.userId,
      recordedAt: nowIso(clock)
    };
    state.loadProfiles.set(profile.loadProfileId, profile);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.load_profile.recorded",
      entityType: "load_profile",
      entityId: profile.loadProfileId,
      explanation: `Recorded load profile ${profile.profileCode}.`
    });
    return clone(profile);
  }

  function listLoadProfiles({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return [...state.loadProfiles.values()]
      .filter((profile) => profile.companyId === text(companyId, "company_id_required"))
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map(clone);
  }

  function recordRestoreDrill({
    sessionToken,
    companyId,
    drillCode,
    targetRtoMinutes,
    targetRpoMinutes,
    actualRtoMinutes,
    actualRpoMinutes,
    status = "passed",
    restorePlanId = null,
    verificationSummary = null,
    evidence = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedRestorePlanId = optionalText(restorePlanId);
    const restorePlan = resolvedRestorePlanId ? requireRuntimeRestorePlan(companyId, resolvedRestorePlanId) : null;
    if (restorePlan && restorePlan.status === "draft") {
      throw error(409, "restore_plan_not_ready", "A restore plan must be approved before it can be referenced by a restore drill.");
    }
    const drill = {
      restoreDrillId: crypto.randomUUID(),
      companyId,
      drillCode: text(drillCode, "restore_drill_code_required"),
      targetRtoMinutes: normalizePositiveInteger(targetRtoMinutes, "restore_drill_target_rto_invalid"),
      targetRpoMinutes: normalizePositiveInteger(targetRpoMinutes, "restore_drill_target_rpo_invalid"),
      actualRtoMinutes: normalizePositiveInteger(actualRtoMinutes, "restore_drill_actual_rto_invalid"),
      actualRpoMinutes: normalizePositiveInteger(actualRpoMinutes, "restore_drill_actual_rpo_invalid"),
      status: assertAllowed(status, RESTORE_DRILL_STATUSES, "restore_drill_status_invalid"),
      restorePlanId: restorePlan?.restorePlanId || null,
      verificationSummary: optionalText(verificationSummary),
      evidence: clone(evidence || {}),
      recordedByUserId: principal.userId,
      recordedAt: nowIso(clock)
    };
    state.restoreDrills.set(drill.restoreDrillId, drill);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.restore_drill.recorded",
      entityType: "restore_drill",
      entityId: drill.restoreDrillId,
      explanation: `Recorded restore drill ${drill.drillCode}.`
    });
    if (drill.status === "failed") {
      recordIncidentSignalInternal({
        companyId,
        signalType: "restore_drill_failed",
        severity: "high",
        summary: `Restore drill ${drill.drillCode} failed.`,
        correlationId,
        sourceObjectType: "restore_drill",
        sourceObjectId: drill.restoreDrillId,
        actorId: principal.userId,
        metadata: {
          restorePlanId: drill.restorePlanId,
          actualRtoMinutes: drill.actualRtoMinutes,
          targetRtoMinutes: drill.targetRtoMinutes,
          actualRpoMinutes: drill.actualRpoMinutes,
          targetRpoMinutes: drill.targetRpoMinutes
        }
      });
    }
    return clone(drill);
  }

  function listRestoreDrills({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return [...state.restoreDrills.values()]
      .filter((drill) => drill.companyId === text(companyId, "company_id_required"))
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map(clone);
  }

  function recordChaosScenario({
    sessionToken,
    companyId,
    scenarioCode,
    failureMode,
    queueRecoverySeconds,
    impactSummary,
    status = "executed",
    evidence = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const scenario = {
      chaosScenarioId: crypto.randomUUID(),
      companyId,
      scenarioCode: text(scenarioCode, "chaos_scenario_code_required"),
      failureMode: text(failureMode, "chaos_failure_mode_required"),
      queueRecoverySeconds: normalizePositiveInteger(queueRecoverySeconds, "chaos_queue_recovery_invalid"),
      impactSummary: text(impactSummary, "chaos_impact_summary_required"),
      status: assertAllowed(status, CHAOS_SCENARIO_STATUSES, "chaos_scenario_status_invalid"),
      evidence: clone(evidence || {}),
      recordedByUserId: principal.userId,
      recordedAt: nowIso(clock)
    };
    state.chaosScenarios.set(scenario.chaosScenarioId, scenario);
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.chaos_scenario.recorded",
      entityType: "chaos_scenario",
      entityId: scenario.chaosScenarioId,
      explanation: `Recorded chaos scenario ${scenario.scenarioCode}.`
    });
    if (scenario.status === "failed") {
      recordIncidentSignalInternal({
        companyId,
        signalType: "chaos_scenario_failed",
        severity: "high",
        summary: `Chaos scenario ${scenario.scenarioCode} failed recovery expectations.`,
        correlationId,
        sourceObjectType: "chaos_scenario",
        sourceObjectId: scenario.chaosScenarioId,
        actorId: principal.userId,
        metadata: {
          failureMode: scenario.failureMode,
          queueRecoverySeconds: scenario.queueRecoverySeconds
        }
      });
    }
    return clone(scenario);
  }

  function listChaosScenarios({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    return [...state.chaosScenarios.values()]
      .filter((scenario) => scenario.companyId === text(companyId, "company_id_required"))
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map(clone);
  }

  function resolveRuntimeFlags({ companyId, companyUserId = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedCompanyUserId = normalizeScopeRef(companyUserId);
    const resolvedFlags = [...state.featureFlags.values()]
      .filter((featureFlag) => featureFlag.companyId === resolvedCompanyId)
      .filter((featureFlag) => flagMatchesRuntimeScope(featureFlag, resolvedCompanyId, resolvedCompanyUserId))
      .reduce((accumulator, featureFlag) => {
        const existing = accumulator.get(featureFlag.flagKey);
        if (
          !existing
          || featureFlagPrecedence(featureFlag) > featureFlagPrecedence(existing)
          || (featureFlagPrecedence(featureFlag) === featureFlagPrecedence(existing) && featureFlag.updatedAt > existing.updatedAt)
        ) {
          accumulator.set(featureFlag.flagKey, featureFlag);
        }
        return accumulator;
      }, new Map());
    return Object.fromEntries(
      [...resolvedFlags.entries()].map(([flagKey, featureFlag]) => [
        flagKey,
        featureFlag.enabled === true
          && featureFlag.emergencyDisabled !== true
          && !isFeatureFlagExpired(featureFlag, currentDateKey(clock))
      ])
    );
  }

  function getRuntimeControlPlaneSummary({ sessionToken, companyId } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const signals = listRuntimeIncidentSignalsForCompany(resolvedCompanyId);
    const incidents = listRuntimeIncidentsForCompany(resolvedCompanyId);
    const restorePlans = listRuntimeRestorePlansForCompany(resolvedCompanyId);
    const restoreDrills = [...state.restoreDrills.values()].filter((drill) => drill.companyId === resolvedCompanyId);
    const expiredFeatureFlags = [...state.featureFlags.values()]
      .filter((featureFlag) => featureFlag.companyId === resolvedCompanyId)
      .filter((featureFlag) => isFeatureFlagExpired(featureFlag, currentDateKey(clock)));
    const activeEmergencyDisableCount = [...state.emergencyDisables.values()].filter(
      (disable) => disable.companyId === resolvedCompanyId && disable.status === "active"
    ).length;
    return {
      companyId: resolvedCompanyId,
      activeEmergencyDisableCount,
      expiredFeatureFlagCount: expiredFeatureFlags.length,
      openIncidentSignalCount: signals.filter((signal) => signal.state === "open").length,
      openIncidentCount: incidents.filter((incident) => !["resolved", "post_review", "closed"].includes(incident.status)).length,
      pendingRestorePlanCount: restorePlans.filter((plan) => ["draft", "approved", "executing"].includes(plan.status)).length,
      failedRestoreDrillCount: restoreDrills.filter((drill) => drill.status === "failed").length,
      expiredFeatureFlags: expiredFeatureFlags.slice(0, 5).map((featureFlag) => ({
        featureFlagId: featureFlag.featureFlagId,
        flagKey: featureFlag.flagKey,
        scopeType: featureFlag.scopeType,
        scopeRef: featureFlag.scopeRef,
        sunsetAt: featureFlag.sunsetAt,
        ownerUserId: featureFlag.ownerUserId
      })),
      recentIncidentSignals: signals.slice(0, 5).map(clone),
      recentIncidents: incidents.slice(0, 5).map(clone),
      recentRestorePlans: restorePlans.slice(0, 5).map(clone)
    };
  }

  function listRuntimeAuditCorrelations({
    sessionToken,
    companyId,
    actorId = null,
    entityType = null,
    entityId = null
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedActorId = optionalText(actorId);
    const resolvedEntityType = optionalText(entityType);
    const resolvedEntityId = optionalText(entityId);
    return [...state.auditCorrelations.values()]
      .filter((record) => record.companyId === text(companyId, "company_id_required"))
      .filter((record) => (resolvedActorId ? record.actorIds.includes(resolvedActorId) : true))
      .filter((record) => (resolvedEntityType ? record.relatedEntities.some((entry) => entry.entityType === resolvedEntityType) : true))
      .filter((record) => (resolvedEntityId ? record.relatedEntities.some((entry) => entry.entityId === resolvedEntityId) : true))
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .map(clone);
  }

  function getRuntimeAuditCorrelation({
    sessionToken,
    companyId,
    correlationId
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const record = state.auditCorrelations.get(buildAuditCorrelationRecordKey(companyId, correlationId));
    if (!record) {
      throw error(404, "audit_correlation_not_found", "Audit correlation was not found.");
    }
    return clone(record);
  }

  function listRuntimeIncidentSignals({
    sessionToken,
    companyId,
    signalType = null,
    signalState = null
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedSignalType = optionalText(signalType);
    const resolvedSignalState = optionalText(signalState);
    return listRuntimeIncidentSignalsForCompany(text(companyId, "company_id_required"))
      .filter((signal) => (resolvedSignalType ? signal.signalType === resolvedSignalType : true))
      .filter((signal) => (resolvedSignalState ? signal.state === resolvedSignalState : true))
      .map(clone);
  }

  function recordRuntimeIncidentSignal({
    sessionToken,
    companyId,
    signalType,
    severity = "medium",
    summary,
    sourceObjectType,
    sourceObjectId,
    metadata = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    return recordIncidentSignalInternal({
      companyId: text(companyId, "company_id_required"),
      signalType,
      severity,
      summary,
      correlationId,
      sourceObjectType: text(sourceObjectType, "runtime_incident_signal_source_object_type_required"),
      sourceObjectId: text(sourceObjectId, "runtime_incident_signal_source_object_id_required"),
      actorId: principal.userId,
      metadata
    });
  }

  function acknowledgeRuntimeIncidentSignal({
    sessionToken,
    companyId,
    incidentSignalId,
    note = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const signal = requireIncidentSignal(companyId, incidentSignalId);
    if (signal.state === "closed" || signal.state === "promoted") {
      return clone(signal);
    }
    signal.state = "acknowledged";
    signal.acknowledgedByUserId = principal.userId;
    signal.acknowledgedAt = nowIso(clock);
    signal.updatedAt = signal.acknowledgedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.incident_signal.acknowledged",
      entityType: "incident_signal",
      entityId: signal.incidentSignalId,
      explanation: note && note.trim().length > 0
        ? `Acknowledged incident signal ${signal.signalType}: ${note.trim()}.`
        : `Acknowledged incident signal ${signal.signalType}.`
    });
    return clone(signal);
  }

  function openRuntimeIncident({
    sessionToken,
    companyId,
    title,
    summary,
    severity = "high",
    sourceSignalId = null,
    linkedCorrelationId = null,
    relatedObjectRefs = [],
    impactScope = null,
    commanderUserId = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const signal = sourceSignalId ? requireIncidentSignal(companyId, sourceSignalId) : null;
    const incident = {
      incidentId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      title: text(title, "runtime_incident_title_required"),
      summary: text(summary, "runtime_incident_summary_required"),
      severity: assertAllowed(severity, INCIDENT_SEVERITIES, "runtime_incident_severity_invalid"),
      status: "open",
      sourceSignalId: signal?.incidentSignalId || null,
      linkedCorrelationIds: normalizeCorrelationIds([linkedCorrelationId, signal?.correlationId]),
      relatedObjectRefs: normalizeObjectRefs([
        ...normalizeObjectRefs(relatedObjectRefs),
        ...(signal ? [{ objectType: signal.sourceObjectType, objectId: signal.sourceObjectId }] : [])
      ]),
      impactScope: normalizeIncidentImpactScope(impactScope),
      postReviewRequired: true,
      postReviewCompletedAt: null,
      postIncidentReviewId: null,
      commanderUserId: text(commanderUserId || principal.userId, "runtime_incident_commander_required"),
      openedByUserId: principal.userId,
      openedAt: nowIso(clock),
      resolvedAt: null,
      closedAt: null,
      updatedAt: nowIso(clock)
    };
    state.runtimeIncidents.set(incident.incidentId, incident);
    const event = createIncidentEventInternal({
      incident,
      eventType: "opened",
      note: incident.summary,
      actorId: principal.userId,
      correlationId,
      metadata: {
        sourceSignalId: incident.sourceSignalId
      }
    });
    if (signal) {
      signal.state = "promoted";
      signal.promotedIncidentId = incident.incidentId;
      signal.updatedAt = event.createdAt;
    }
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_incident.opened",
      entityType: "runtime_incident",
      entityId: incident.incidentId,
      explanation: `Opened runtime incident ${incident.title}.`
    });
    return {
      incident: materializeRuntimeIncident(incident),
      event: clone(event)
    };
  }

  function listRuntimeIncidents({
    sessionToken,
    companyId,
    status = null,
    severity = null
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedStatus = optionalText(status);
    const resolvedSeverity = optionalText(severity);
    return listRuntimeIncidentsForCompany(text(companyId, "company_id_required"))
      .filter((incident) => (resolvedStatus ? incident.status === resolvedStatus : true))
      .filter((incident) => (resolvedSeverity ? incident.severity === resolvedSeverity : true))
      .map(materializeRuntimeIncident);
  }

  function getRuntimeIncidentPostReview({
    sessionToken,
    companyId,
    incidentId
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    requireRuntimeIncident(companyId, incidentId);
    const review = findRuntimeIncidentPostReview(companyId, incidentId);
    if (!review) {
      throw error(404, "runtime_incident_post_review_not_found", "Runtime incident post-review was not found.");
    }
    return clone(review);
  }

  function listRuntimeIncidentEvents({
    sessionToken,
    companyId,
    incidentId
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    requireRuntimeIncident(companyId, incidentId);
    return [...state.runtimeIncidentEvents.values()]
      .filter((eventRecord) => eventRecord.companyId === text(companyId, "company_id_required"))
      .filter((eventRecord) => eventRecord.incidentId === text(incidentId, "runtime_incident_id_required"))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function recordRuntimeIncidentEvent({
    sessionToken,
    companyId,
    incidentId,
    eventType = "note_added",
    note,
    relatedObjectRefs = [],
    linkedCorrelationId = null,
    metadata = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const incident = requireRuntimeIncident(companyId, incidentId);
    const event = createIncidentEventInternal({
      incident,
      eventType,
      note,
      actorId: principal.userId,
      correlationId,
      relatedObjectRefs,
      linkedCorrelationId,
      metadata
    });
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_incident.event_recorded",
      entityType: "runtime_incident",
      entityId: incident.incidentId,
      explanation: `Recorded ${event.eventType} for runtime incident ${incident.title}.`
    });
    return {
      incident: materializeRuntimeIncident(incident),
      event: clone(event)
    };
  }

  function recordRuntimeIncidentPostReview({
    sessionToken,
    companyId,
    incidentId,
    summary,
    rootCauseSummary,
    impactScope = null,
    mitigationActions = [],
    correctiveActions = [],
    preventiveActions = [],
    reviewedBreakGlassIds = [],
    evidenceRefs = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const incident = requireRuntimeIncident(companyId, incidentId);
    if (!["resolved", "post_review"].includes(incident.status)) {
      throw error(409, "runtime_incident_post_review_requires_resolved_incident", "Incident must be resolved before post-review can be recorded.");
    }
    const linkedBreakGlassSessions = listBreakGlassSessionsForIncident(companyId, incidentId);
    const unresolvedBreakGlassSessions = linkedBreakGlassSessions.filter(
      (session) => !["reviewed", "closed"].includes(session.status)
    );
    if (unresolvedBreakGlassSessions.length > 0) {
      throw error(409, "runtime_incident_break_glass_review_pending", "All linked break-glass sessions must be reviewed before post-review can be completed.");
    }
    const normalizedReviewedBreakGlassIds = normalizeReviewedBreakGlassIds(reviewedBreakGlassIds);
    if (
      linkedBreakGlassSessions.length > 0
      && linkedBreakGlassSessions.some((session) => !normalizedReviewedBreakGlassIds.includes(session.breakGlassId))
    ) {
      throw error(409, "runtime_incident_post_review_break_glass_coverage_required", "Post-review must explicitly cover every linked break-glass session.");
    }
    const existingReview = findRuntimeIncidentPostReview(companyId, incidentId);
    const recordedAt = nowIso(clock);
    const review = existingReview || {
      postIncidentReviewId: crypto.randomUUID(),
      incidentId: incident.incidentId,
      companyId: incident.companyId,
      createdAt: recordedAt
    };
    review.status = "completed";
    review.summary = text(summary, "runtime_incident_post_review_summary_required");
    review.rootCauseSummary = text(rootCauseSummary, "runtime_incident_post_review_root_cause_required");
    review.impactScope = normalizeIncidentImpactScope(impactScope || incident.impactScope || null);
    review.mitigationActions = normalizeIncidentActionItems(mitigationActions, "runtime_incident_post_review_mitigation_actions_invalid");
    review.correctiveActions = normalizeIncidentActionItems(correctiveActions, "runtime_incident_post_review_corrective_actions_invalid");
    review.preventiveActions = normalizeIncidentActionItems(preventiveActions, "runtime_incident_post_review_preventive_actions_invalid");
    review.reviewedBreakGlassIds = normalizedReviewedBreakGlassIds;
    review.evidenceRefs = normalizeObjectRefs(evidenceRefs);
    review.completedByUserId = principal.userId;
    review.completedAt = recordedAt;
    review.updatedAt = recordedAt;
    state.runtimeIncidentPostReviews.set(review.postIncidentReviewId, review);

    incident.status = "post_review";
    incident.postIncidentReviewId = review.postIncidentReviewId;
    incident.postReviewCompletedAt = recordedAt;
    incident.updatedAt = recordedAt;
    if (review.impactScope) {
      incident.impactScope = clone(review.impactScope);
    }

    const event = createIncidentEventInternal({
      incident,
      eventType: "post_review_completed",
      note: review.summary,
      actorId: principal.userId,
      correlationId,
      relatedObjectRefs: normalizeObjectRefs([
        ...review.evidenceRefs,
        ...linkedBreakGlassSessions.map((session) => ({
          objectType: "break_glass_session",
          objectId: session.breakGlassId
        }))
      ]),
      metadata: {
        postIncidentReviewId: review.postIncidentReviewId,
        reviewedBreakGlassIds: review.reviewedBreakGlassIds,
        correctiveActionCount: review.correctiveActions.length,
        preventiveActionCount: review.preventiveActions.length
      }
    });
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_incident.post_review_completed",
      entityType: "runtime_incident",
      entityId: incident.incidentId,
      explanation: `Completed post-review for runtime incident ${incident.title}.`
    });
    return {
      incident: materializeRuntimeIncident(incident),
      postIncidentReview: clone(review),
      event: clone(event)
    };
  }

  function updateRuntimeIncidentStatus({
    sessionToken,
    companyId,
    incidentId,
    status,
    note = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const incident = requireRuntimeIncident(companyId, incidentId);
    const nextStatus = normalizeIncidentStatus(status);
    if (incident.status === nextStatus) {
      return {
        incident: materializeRuntimeIncident(incident),
        event: null
      };
    }
    const previousStatus = incident.status;
    if (nextStatus === "closed" && !findRuntimeIncidentPostReview(companyId, incidentId)) {
      throw error(409, "runtime_incident_post_review_required", "Incident requires completed post-review before it can be closed.");
    }
    assertIncidentStatusTransition({ incident, nextStatus });
    incident.status = nextStatus;
    incident.updatedAt = nowIso(clock);
    if (nextStatus === "resolved") {
      incident.resolvedAt = incident.updatedAt;
    }
    if (nextStatus === "post_review") {
      incident.closedAt = null;
    }
    if (nextStatus === "closed") {
      incident.closedAt = incident.updatedAt;
    }
    const event = createIncidentEventInternal({
      incident,
      eventType: incidentStatusEventType(nextStatus),
      note: note || `Status changed from ${previousStatus} to ${nextStatus}.`,
      actorId: principal.userId,
      correlationId,
      metadata: {
        previousStatus,
        nextStatus
      }
    });
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_incident.status_changed",
      entityType: "runtime_incident",
      entityId: incident.incidentId,
      explanation: `Changed runtime incident ${incident.title} status to ${nextStatus}.`
    });
    return {
      incident: materializeRuntimeIncident(incident),
      event: clone(event)
    };
  }

  function createRuntimeRestorePlan({
    sessionToken,
    companyId,
    incidentId = null,
    restoreScope,
    targetTimestamp,
    planSummary,
    relatedObjectRefs = [],
    linkedCorrelationId = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const incident = incidentId ? requireRuntimeIncident(companyId, incidentId) : null;
    const restorePlan = {
      restorePlanId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      incidentId: incident?.incidentId || null,
      restoreScope: text(restoreScope, "runtime_restore_plan_scope_required"),
      targetTimestamp: normalizeIsoTimestamp(targetTimestamp, "runtime_restore_plan_target_timestamp_invalid"),
      planSummary: text(planSummary, "runtime_restore_plan_summary_required"),
      linkedCorrelationIds: normalizeCorrelationIds([linkedCorrelationId, ...(incident?.linkedCorrelationIds || [])]),
      relatedObjectRefs: normalizeObjectRefs(relatedObjectRefs),
      status: "draft",
      createdByUserId: principal.userId,
      approvedByUserId: null,
      startedByUserId: null,
      completedByUserId: null,
      abortedByUserId: null,
      createdAt: nowIso(clock),
      approvedAt: null,
      startedAt: null,
      completedAt: null,
      abortedAt: null,
      updatedAt: nowIso(clock),
      verificationSummary: null
    };
    state.runtimeRestorePlans.set(restorePlan.restorePlanId, restorePlan);
    if (incident) {
      createIncidentEventInternal({
        incident,
        eventType: "restore_plan_attached",
        note: `Attached restore plan ${restorePlan.restorePlanId}.`,
        actorId: principal.userId,
        correlationId,
        relatedObjectRefs: [
          ...restorePlan.relatedObjectRefs,
          { objectType: "runtime_restore_plan", objectId: restorePlan.restorePlanId }
        ]
      });
    }
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_restore_plan.created",
      entityType: "runtime_restore_plan",
      entityId: restorePlan.restorePlanId,
      explanation: `Created runtime restore plan for scope ${restorePlan.restoreScope}.`
    });
    return clone(restorePlan);
  }

  function listRuntimeRestorePlans({
    sessionToken,
    companyId,
    status = null
  } = {}) {
    authorize(sessionToken, companyId, "company.read");
    const resolvedStatus = optionalText(status);
    return listRuntimeRestorePlansForCompany(text(companyId, "company_id_required"))
      .filter((plan) => (resolvedStatus ? plan.status === resolvedStatus : true))
      .map(clone);
  }

  function approveRuntimeRestorePlan({
    sessionToken,
    companyId,
    restorePlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const restorePlan = requireRuntimeRestorePlan(companyId, restorePlanId);
    if (restorePlan.status !== "draft") {
      throw error(409, "runtime_restore_plan_not_draft", "Only draft restore plans can be approved.");
    }
    if (restorePlan.createdByUserId === principal.userId) {
      throw error(409, "runtime_restore_plan_self_approval_forbidden", "Restore plans require a separate approver.");
    }
    restorePlan.status = "approved";
    restorePlan.approvedByUserId = principal.userId;
    restorePlan.approvedAt = nowIso(clock);
    restorePlan.updatedAt = restorePlan.approvedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_restore_plan.approved",
      entityType: "runtime_restore_plan",
      entityId: restorePlan.restorePlanId,
      explanation: `Approved runtime restore plan ${restorePlan.restorePlanId}.`
    });
    return clone(restorePlan);
  }

  function startRuntimeRestorePlan({
    sessionToken,
    companyId,
    restorePlanId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const restorePlan = requireRuntimeRestorePlan(companyId, restorePlanId);
    if (restorePlan.status !== "approved") {
      throw error(409, "runtime_restore_plan_not_approved", "Only approved restore plans can be started.");
    }
    restorePlan.status = "executing";
    restorePlan.startedByUserId = principal.userId;
    restorePlan.startedAt = nowIso(clock);
    restorePlan.updatedAt = restorePlan.startedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_restore_plan.started",
      entityType: "runtime_restore_plan",
      entityId: restorePlan.restorePlanId,
      explanation: `Started runtime restore plan ${restorePlan.restorePlanId}.`
    });
    return clone(restorePlan);
  }

  function completeRuntimeRestorePlan({
    sessionToken,
    companyId,
    restorePlanId,
    verificationSummary,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const restorePlan = requireRuntimeRestorePlan(companyId, restorePlanId);
    if (restorePlan.status !== "executing") {
      throw error(409, "runtime_restore_plan_not_executing", "Only executing restore plans can be completed.");
    }
    restorePlan.status = "completed";
    restorePlan.completedByUserId = principal.userId;
    restorePlan.completedAt = nowIso(clock);
    restorePlan.updatedAt = restorePlan.completedAt;
    restorePlan.verificationSummary = text(verificationSummary, "runtime_restore_plan_verification_summary_required");
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_restore_plan.completed",
      entityType: "runtime_restore_plan",
      entityId: restorePlan.restorePlanId,
      explanation: `Completed runtime restore plan ${restorePlan.restorePlanId}.`
    });
    return clone(restorePlan);
  }

  function abortRuntimeRestorePlan({
    sessionToken,
    companyId,
    restorePlanId,
    reasonCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const restorePlan = requireRuntimeRestorePlan(companyId, restorePlanId);
    if (["completed", "aborted"].includes(restorePlan.status)) {
      return clone(restorePlan);
    }
    restorePlan.status = "aborted";
    restorePlan.abortedByUserId = principal.userId;
    restorePlan.abortedAt = nowIso(clock);
    restorePlan.updatedAt = restorePlan.abortedAt;
    restorePlan.abortReasonCode = text(reasonCode, "runtime_restore_plan_abort_reason_required");
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "resilience.runtime_restore_plan.aborted",
      entityType: "runtime_restore_plan",
      entityId: restorePlan.restorePlanId,
      explanation: `Aborted runtime restore plan ${restorePlan.restorePlanId}.`
    });
    return clone(restorePlan);
  }

  function listRuntimeIncidentSignalsForCompany(companyId) {
    return [...state.incidentSignals.values()]
      .filter((signal) => signal.companyId === companyId)
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  }

  function listRuntimeIncidentsForCompany(companyId) {
    return [...state.runtimeIncidents.values()]
      .filter((incident) => incident.companyId === companyId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  function listRuntimeRestorePlansForCompany(companyId) {
    return [...state.runtimeRestorePlans.values()]
      .filter((plan) => plan.companyId === companyId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  function findRuntimeIncidentPostReview(companyId, incidentId) {
    return [...(state.runtimeIncidentPostReviews?.values() || [])]
      .filter((review) => review.companyId === companyId && review.incidentId === incidentId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
  }

  function listBreakGlassSessionsForIncident(companyId, incidentId) {
    return [...(state.breakGlassSessions?.values() || [])]
      .filter((session) => session.companyId === companyId && session.incidentId === incidentId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function materializeRuntimeIncident(incident) {
    const linkedBreakGlassSessions = listBreakGlassSessionsForIncident(incident.companyId, incident.incidentId).map(clone);
    const review = findRuntimeIncidentPostReview(incident.companyId, incident.incidentId);
    return {
      ...clone(incident),
      breakGlassSessionCount: linkedBreakGlassSessions.length,
      breakGlassSessions: linkedBreakGlassSessions,
      postReviewRequired: true,
      postIncidentReview: review ? clone(review) : null
    };
  }

  function normalizeIncidentStatus(status) {
    const resolvedStatus = optionalText(status);
    const canonicalStatus = resolvedStatus === "monitoring" ? "stabilized" : resolvedStatus;
    return assertAllowed(canonicalStatus, INCIDENT_STATUSES, "runtime_incident_status_invalid");
  }

  function assertIncidentStatusTransition({ incident, nextStatus } = {}) {
    const allowedTransitions = {
      open: ["triaged", "mitigating"],
      triaged: ["mitigating"],
      mitigating: ["stabilized"],
      stabilized: ["resolved"],
      resolved: ["post_review"],
      post_review: ["closed"],
      closed: []
    };
    if ((allowedTransitions[incident.status] || []).includes(nextStatus)) {
      return;
    }
    throw error(
      409,
      "runtime_incident_status_transition_invalid",
      `Runtime incident cannot transition from ${incident.status} to ${nextStatus}.`
    );
  }

  function incidentStatusEventType(nextStatus) {
    const eventTypes = {
      triaged: "triaged",
      mitigating: "mitigation_started",
      stabilized: "stabilized",
      resolved: "resolved",
      post_review: "post_review_started",
      closed: "closed"
    };
    return eventTypes[nextStatus] || "status_changed";
  }

  function recordIncidentSignalInternal({
    companyId,
    signalType,
    severity = "medium",
    summary,
    correlationId = crypto.randomUUID(),
    sourceObjectType,
    sourceObjectId,
    actorId = "system",
    metadata = {}
  } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedSignalType = assertAllowed(signalType, INCIDENT_SIGNAL_TYPES, "runtime_incident_signal_type_invalid");
    const resolvedSeverity = assertAllowed(severity, INCIDENT_SEVERITIES, "runtime_incident_signal_severity_invalid");
    const resolvedSourceObjectType = text(sourceObjectType, "runtime_incident_signal_source_object_type_required");
    const resolvedSourceObjectId = text(sourceObjectId, "runtime_incident_signal_source_object_id_required");
    const signal = findOpenIncidentSignal({
      companyId: resolvedCompanyId,
      signalType: resolvedSignalType,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId
    }) || {
      incidentSignalId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      signalType: resolvedSignalType,
      severity: resolvedSeverity,
      summary: text(summary, "runtime_incident_signal_summary_required"),
      correlationId,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      state: "open",
      occurrenceCount: 0,
      metadata: {},
      acknowledgedByUserId: null,
      acknowledgedAt: null,
      promotedIncidentId: null,
      createdAt: nowIso(clock),
      firstSeenAt: nowIso(clock),
      lastSeenAt: nowIso(clock),
      updatedAt: nowIso(clock),
      closedAt: null
    };
    signal.severity = highestSeverity(signal.severity, resolvedSeverity);
    signal.summary = text(summary || signal.summary, "runtime_incident_signal_summary_required");
    signal.correlationId = signal.correlationId || correlationId;
    signal.metadata = clone(metadata || {});
    signal.occurrenceCount = Number(signal.occurrenceCount || 0) + 1;
    signal.lastSeenAt = nowIso(clock);
    signal.updatedAt = signal.lastSeenAt;
    state.incidentSignals.set(signal.incidentSignalId, signal);
    audit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId: signal.correlationId,
      action: "resilience.incident_signal.recorded",
      entityType: "incident_signal",
      entityId: signal.incidentSignalId,
      explanation: `Recorded runtime incident signal ${signal.signalType}.`
    });
    return clone(signal);
  }

  function createIncidentEventInternal({
    incident,
    eventType,
    note,
    actorId,
    correlationId,
    relatedObjectRefs = [],
    linkedCorrelationId = null,
    metadata = {}
  } = {}) {
    const resolvedEventType = assertAllowed(eventType, INCIDENT_EVENT_TYPES, "runtime_incident_event_type_invalid");
    const event = {
      incidentEventId: crypto.randomUUID(),
      incidentId: incident.incidentId,
      companyId: incident.companyId,
      eventType: resolvedEventType,
      note: text(note, "runtime_incident_event_note_required"),
      actorId: text(actorId, "runtime_incident_event_actor_required"),
      correlationId: optionalText(correlationId) || null,
      linkedCorrelationId: optionalText(linkedCorrelationId) || null,
      relatedObjectRefs: normalizeObjectRefs(relatedObjectRefs),
      metadata: clone(metadata || {}),
      createdAt: nowIso(clock)
    };
    state.runtimeIncidentEvents.set(event.incidentEventId, event);
    incident.updatedAt = event.createdAt;
    incident.linkedCorrelationIds = normalizeCorrelationIds([
      ...(incident.linkedCorrelationIds || []),
      event.correlationId,
      event.linkedCorrelationId
    ]);
    if (event.relatedObjectRefs.length > 0) {
      incident.relatedObjectRefs = mergeObjectRefs(incident.relatedObjectRefs || [], event.relatedObjectRefs);
    }
    return event;
  }

  function requireFeatureFlag(companyId, flagKey, { scopeType = null, scopeRef = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedFlagKey = text(flagKey, "feature_flag_key_required");
    const candidates = [...state.featureFlags.values()].filter(
      (featureFlag) =>
        featureFlag.companyId === resolvedCompanyId
        && featureFlag.flagKey === resolvedFlagKey
    );
    let narrowed = candidates;
    if (scopeType != null || scopeRef != null) {
      const resolvedScope = normalizeScope(resolvedCompanyId, scopeType || "global", scopeRef);
      narrowed = candidates.filter(
        (featureFlag) =>
          featureFlag.scopeType === resolvedScope.scopeType
          && normalizeScopeRef(featureFlag.scopeRef) === normalizeScopeRef(resolvedScope.scopeRef)
      );
    } else if (candidates.length > 1) {
      throw error(409, "feature_flag_scope_required", "Multiple scoped feature flags exist for this key. Specify scopeType and scopeRef.");
    }
    const featureFlag = narrowed.sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
    if (!featureFlag) {
      throw error(404, "feature_flag_not_found", "Feature flag was not found.");
    }
    return featureFlag;
  }

  function requireEmergencyDisable(companyId, emergencyDisableId) {
    const disable = state.emergencyDisables.get(text(emergencyDisableId, "emergency_disable_id_required"));
    if (!disable || disable.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "emergency_disable_not_found", "Emergency disable was not found.");
    }
    return disable;
  }

  function requireIncidentSignal(companyId, incidentSignalId) {
    const signal = state.incidentSignals.get(text(incidentSignalId, "runtime_incident_signal_id_required"));
    if (!signal || signal.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "runtime_incident_signal_not_found", "Runtime incident signal was not found.");
    }
    return signal;
  }

  function requireRuntimeIncident(companyId, incidentId) {
    const incident = state.runtimeIncidents.get(text(incidentId, "runtime_incident_id_required"));
    if (!incident || incident.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "runtime_incident_not_found", "Runtime incident was not found.");
    }
    return incident;
  }

  function requireRuntimeRestorePlan(companyId, restorePlanId) {
    const restorePlan = state.runtimeRestorePlans.get(text(restorePlanId, "runtime_restore_plan_id_required"));
    if (!restorePlan || restorePlan.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "runtime_restore_plan_not_found", "Runtime restore plan was not found.");
    }
    return restorePlan;
  }

  function findOpenIncidentSignal({ companyId, signalType, sourceObjectType, sourceObjectId } = {}) {
    return [...state.incidentSignals.values()].find(
      (signal) =>
        signal.companyId === companyId
        && signal.signalType === signalType
        && signal.sourceObjectType === sourceObjectType
        && signal.sourceObjectId === sourceObjectId
        && ["open", "acknowledged"].includes(signal.state)
    ) || null;
  }
}

function buildFeatureFlagRecordKey(companyId, flagKey, scopeType, scopeRef) {
  return `${companyId}:${flagKey}:${scopeType}:${normalizeScopeRef(scopeRef) || "global"}`;
}

export function buildAuditCorrelationRecordKey(companyId, correlationId) {
  return `${text(companyId, "company_id_required")}:${text(correlationId, "correlation_id_required")}`;
}

function normalizeScope(companyId, scopeType, scopeRef) {
  const resolvedScopeType = assertAllowed(scopeType || "global", FEATURE_FLAG_SCOPE_TYPES, "feature_flag_scope_type_invalid");
  if (resolvedScopeType === "global") {
    return { scopeType: resolvedScopeType, scopeRef: null };
  }
  if (resolvedScopeType === "company") {
    const resolvedScopeRef = text(scopeRef || companyId, "feature_flag_scope_ref_required");
    if (resolvedScopeRef !== text(companyId, "company_id_required")) {
      throw createValidationError("feature_flag_scope_ref_invalid", "Company-scoped flags must target the owning company.");
    }
    return { scopeType: resolvedScopeType, scopeRef: resolvedScopeRef };
  }
  return {
    scopeType: resolvedScopeType,
    scopeRef: text(scopeRef, "feature_flag_scope_ref_required")
  };
}

function normalizeScopeRef(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function featureFlagPrecedence(featureFlag) {
  const precedence = {
    global: 1,
    company: 2,
    company_user: 3
  };
  return precedence[featureFlag.scopeType] || 0;
}

function requiresSeparateEmergencyDisableRelease(featureFlag) {
  return featureFlag.scopeType === "global" || featureFlag.flagType === "kill_switch" || featureFlag.riskClass === "high";
}

function requiresFeatureFlagDualApproval({ riskClass } = {}) {
  return riskClass === "high";
}

function validateFeatureFlagApprovalActors({ authState, companyId, approvalActorIds, clock = () => new Date() } = {}) {
  if (!authState) {
    throw error(500, "org_auth_snapshot_required", "Org/auth snapshot is required for high-risk feature flag approvals.");
  }
  const resolvedCompanyId = text(companyId, "company_id_required");
  const now = nowIso(clock);
  for (const actorId of approvalActorIds) {
    const companyUser = [...(authState.companyUsers || [])].find(
      (candidate) =>
        candidate.companyId === resolvedCompanyId
        && candidate.userId === actorId
        && candidate.status === "active"
        && isActiveAuthWindow({ startsAt: candidate.startsAt, endsAt: candidate.endsAt, now })
        && canApproveFeatureFlagChange({
          authState,
          companyId: resolvedCompanyId,
          companyUserId: candidate.companyUserId,
          roleCode: candidate.roleCode,
          now
        })
    );
    if (!companyUser) {
      throw error(
        409,
        "feature_flag_approver_unauthorized",
        `Approval actor ${actorId} is not an active authorized approver for high-risk feature flags.`
      );
    }
  }
}

function canApproveFeatureFlagChange({ authState, companyId, companyUserId, roleCode, now } = {}) {
  if (roleCode === "company_admin") {
    return true;
  }
  const hasObjectGrant = [...(authState.objectGrants || [])].some(
    (grant) =>
      grant.companyId === companyId
      && grant.companyUserId === companyUserId
      && grant.status === "active"
      && grant.permissionCode === "company.manage"
      && ["feature_flag", "resilience"].includes(grant.objectType)
      && grant.objectId === companyId
      && isActiveAuthWindow({ startsAt: grant.startsAt, endsAt: grant.endsAt, now })
  );
  if (hasObjectGrant) {
    return true;
  }
  return [...(authState.delegations || [])].some(
    (delegation) =>
      delegation.companyId === companyId
      && delegation.toCompanyUserId === companyUserId
      && delegation.status === "active"
      && delegation.permissionCode === "company.manage"
      && ["feature_flag", "resilience"].includes(delegation.scopeCode)
      && isActiveAuthWindow({ startsAt: delegation.startsAt, endsAt: delegation.endsAt, now })
      && (!delegation.resourceType || ["feature_flag", "resilience"].includes(delegation.resourceType))
      && (!delegation.resourceId || delegation.resourceId === companyId)
  );
}

function isActiveAuthWindow({ startsAt, endsAt, now } = {}) {
  if (startsAt && startsAt > now) {
    return false;
  }
  if (endsAt && endsAt < now) {
    return false;
  }
  return true;
}

function currentDateKey(clock = () => new Date()) {
  return nowIso(clock).slice(0, 10);
}

function isFeatureFlagExpired(featureFlag, dateKey = currentDateKey()) {
  return typeof featureFlag?.sunsetAt === "string" && featureFlag.sunsetAt < dateKey;
}

function flagMatchesRuntimeScope(featureFlag, companyId, companyUserId) {
  if (featureFlag.scopeType === "global") {
    return true;
  }
  if (featureFlag.scopeType === "company") {
    return normalizeScopeRef(featureFlag.scopeRef) === normalizeScopeRef(companyId);
  }
  return companyUserId != null && normalizeScopeRef(featureFlag.scopeRef) === normalizeScopeRef(companyUserId);
}

function addMinutes(timestamp, minutes) {
  const value = new Date(timestamp);
  value.setUTCMinutes(value.getUTCMinutes() + minutes);
  return value.toISOString();
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function dateOnly(value, code) {
  const resolved = text(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createValidationError(code, `${code} must be an ISO date.`);
  }
  return resolved;
}

function normalizeIsoTimestamp(value, code) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createValidationError(code, `${code} must be a valid timestamp.`);
  }
  return date.toISOString();
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

function normalizeCorrelationIds(values) {
  const result = [];
  for (const value of values || []) {
    const resolved = optionalText(value);
    if (resolved && !result.includes(resolved)) {
      result.push(resolved);
    }
  }
  return result;
}

function normalizeObjectRefs(values) {
  const refs = [];
  for (const entry of values || []) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const objectType = optionalText(entry.objectType);
    const objectId = optionalText(entry.objectId);
    if (!objectType || !objectId) {
      continue;
    }
    const key = `${objectType}:${objectId}`;
    if (!refs.some((ref) => `${ref.objectType}:${ref.objectId}` === key)) {
      refs.push({
        objectType,
        objectId,
        label: optionalText(entry.label)
      });
    }
  }
  return refs;
}

function normalizeIncidentImpactScope(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const scope = {};
  if (typeof value.customerVisible === "boolean") {
    scope.customerVisible = value.customerVisible;
  }
  if (typeof value.dataIntegrityRisk === "boolean") {
    scope.dataIntegrityRisk = value.dataIntegrityRisk;
  }
  if (typeof value.financialRisk === "boolean") {
    scope.financialRisk = value.financialRisk;
  }
  if (typeof value.regulatoryRisk === "boolean") {
    scope.regulatoryRisk = value.regulatoryRisk;
  }
  const tenantCount = normalizeOptionalPositiveInteger(value.tenantCount);
  const userCount = normalizeOptionalPositiveInteger(value.userCount);
  if (tenantCount != null) {
    scope.tenantCount = tenantCount;
  }
  if (userCount != null) {
    scope.userCount = userCount;
  }
  const systems = normalizeStringArray(value.systems);
  const regulatedDomains = normalizeStringArray(value.regulatedDomains);
  if (systems.length > 0) {
    scope.systems = systems;
  }
  if (regulatedDomains.length > 0) {
    scope.regulatedDomains = regulatedDomains;
  }
  const summary = optionalText(value.summary);
  if (summary) {
    scope.summary = summary;
  }
  return Object.keys(scope).length > 0 ? scope : null;
}

function normalizeIncidentActionItems(values, code) {
  if (values == null) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw createValidationError(code, `${code} must be an array.`);
  }
  return values.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw createValidationError(code, `${code} must only contain objects.`);
    }
    return {
      actionCode: text(entry.actionCode || entry.code || entry.summary, code),
      summary: text(entry.summary || entry.actionCode || entry.code, code),
      ownerTeamId: optionalText(entry.ownerTeamId),
      dueAt: optionalText(entry.dueAt),
      status: optionalText(entry.status) || "planned"
    };
  });
}

function normalizeReviewedBreakGlassIds(values) {
  if (values == null) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw createValidationError("runtime_incident_post_review_break_glass_ids_invalid", "Reviewed break-glass ids must be an array.");
  }
  return normalizeStringArray(values);
}

function mergeObjectRefs(left, right) {
  return normalizeObjectRefs([...(left || []), ...(right || [])]);
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const result = [];
  for (const value of values) {
    const resolved = optionalText(value);
    if (resolved && !result.includes(resolved)) {
      result.push(resolved);
    }
  }
  return result;
}

function normalizeOptionalPositiveInteger(value) {
  if (value == null || value === "") {
    return null;
  }
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return null;
  }
  return numericValue;
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeActorIds(values, code) {
  if (values == null) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw createValidationError(code, `${code} must be an array.`);
  }
  const actorIds = [];
  for (const value of values) {
    const resolved = optionalText(value);
    if (!resolved) {
      throw createValidationError(code, `${code} must only contain non-empty actor ids.`);
    }
    if (!actorIds.includes(resolved)) {
      actorIds.push(resolved);
    }
  }
  return actorIds;
}

function highestSeverity(currentSeverity, nextSeverity) {
  const ranking = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };
  if (!currentSeverity) {
    return nextSeverity;
  }
  return (ranking[nextSeverity] || 0) > (ranking[currentSeverity] || 0) ? nextSeverity : currentSeverity;
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
