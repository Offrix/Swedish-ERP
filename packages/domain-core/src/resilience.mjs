import crypto from "node:crypto";

export const FEATURE_FLAG_SCOPE_TYPES = Object.freeze(["global", "company", "company_user"]);
export const FEATURE_FLAG_TYPES = Object.freeze(["release", "ops", "entitlement", "kill_switch"]);
export const FEATURE_FLAG_RISK_CLASSES = Object.freeze(["low", "medium", "high"]);
export const LOAD_PROFILE_STATUSES = Object.freeze(["draft", "passed", "failed"]);
export const RESTORE_DRILL_STATUSES = Object.freeze(["planned", "passed", "failed"]);
export const CHAOS_SCENARIO_STATUSES = Object.freeze(["planned", "executed", "failed"]);

export function createResilienceModule({
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

  return {
    featureFlagScopeTypes: FEATURE_FLAG_SCOPE_TYPES,
    featureFlagTypes: FEATURE_FLAG_TYPES,
    featureFlagRiskClasses: FEATURE_FLAG_RISK_CLASSES,
    loadProfileStatuses: LOAD_PROFILE_STATUSES,
    restoreDrillStatuses: RESTORE_DRILL_STATUSES,
    chaosScenarioStatuses: CHAOS_SCENARIO_STATUSES,
    upsertFeatureFlag,
    listFeatureFlags,
    requestEmergencyDisable,
    listEmergencyDisables,
    recordLoadProfile,
    listLoadProfiles,
    recordRestoreDrill,
    listRestoreDrills,
    recordChaosScenario,
    listChaosScenarios,
    resolveRuntimeFlags
  };

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
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const resolvedFlagKey = text(flagKey, "feature_flag_key_required");
    const resolvedScope = normalizeScope(companyId, scopeType, scopeRef);
    const recordKey = buildFeatureFlagRecordKey(companyId, resolvedFlagKey, resolvedScope.scopeType, resolvedScope.scopeRef);
    const existing = state.featureFlags.get(recordKey);
    const featureFlag = existing || {
      featureFlagId: crypto.randomUUID(),
      companyId,
      flagKey: resolvedFlagKey,
      description: text(description || resolvedFlagKey, "feature_flag_description_required"),
      flagType: assertAllowed(flagType, FEATURE_FLAG_TYPES, "feature_flag_type_invalid"),
      scopeType: resolvedScope.scopeType,
      scopeRef: resolvedScope.scopeRef,
      defaultEnabled: defaultEnabled !== false,
      enabled: enabled == null ? defaultEnabled !== false : enabled === true,
      ownerUserId: text(ownerUserId || principal.userId, "feature_flag_owner_required"),
      riskClass: assertAllowed(riskClass, FEATURE_FLAG_RISK_CLASSES, "feature_flag_risk_class_invalid"),
      sunsetAt: dateOnly(sunsetAt || nowIso(clock).slice(0, 10), "feature_flag_sunset_at_required"),
      emergencyDisabled: false,
      emergencyReasonCode: null,
      changedByUserId: principal.userId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    featureFlag.description = text(description || featureFlag.description, "feature_flag_description_required");
    featureFlag.flagType = assertAllowed(flagType || featureFlag.flagType, FEATURE_FLAG_TYPES, "feature_flag_type_invalid");
    featureFlag.defaultEnabled = defaultEnabled !== false;
    featureFlag.enabled = enabled == null ? featureFlag.enabled : enabled === true;
    featureFlag.ownerUserId = text(ownerUserId || featureFlag.ownerUserId, "feature_flag_owner_required");
    featureFlag.riskClass = assertAllowed(riskClass || featureFlag.riskClass, FEATURE_FLAG_RISK_CLASSES, "feature_flag_risk_class_invalid");
    featureFlag.sunsetAt = dateOnly(sunsetAt || featureFlag.sunsetAt, "feature_flag_sunset_at_required");
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
      explanation: `Updated feature flag ${featureFlag.flagKey}.`
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
      .map(clone);
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
      activatedAt: nowIso(clock),
      expiresAt: addMinutes(nowIso(clock), normalizePositiveInteger(expiresInMinutes, "emergency_disable_expiry_invalid")),
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
    evidence = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, companyId, "company.manage");
    const drill = {
      restoreDrillId: crypto.randomUUID(),
      companyId,
      drillCode: text(drillCode, "restore_drill_code_required"),
      targetRtoMinutes: normalizePositiveInteger(targetRtoMinutes, "restore_drill_target_rto_invalid"),
      targetRpoMinutes: normalizePositiveInteger(targetRpoMinutes, "restore_drill_target_rpo_invalid"),
      actualRtoMinutes: normalizePositiveInteger(actualRtoMinutes, "restore_drill_actual_rto_invalid"),
      actualRpoMinutes: normalizePositiveInteger(actualRpoMinutes, "restore_drill_actual_rpo_invalid"),
      status: assertAllowed(status, RESTORE_DRILL_STATUSES, "restore_drill_status_invalid"),
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
      [...resolvedFlags.entries()].map(([flagKey, featureFlag]) => [flagKey, featureFlag.enabled === true && featureFlag.emergencyDisabled !== true])
    );
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
}

function buildFeatureFlagRecordKey(companyId, flagKey, scopeType, scopeRef) {
  return `${companyId}:${flagKey}:${scopeType}:${normalizeScopeRef(scopeRef) || "global"}`;
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
