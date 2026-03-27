import crypto from "node:crypto";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const COMPANY_SETUP_PROFILE_STATUSES = Object.freeze([
  "draft",
  "bootstrap_running",
  "finance_ready",
  "pilot",
  "production_live",
  "suspended"
]);
export const TRIAL_ENVIRONMENT_PROFILE_STATUSES = Object.freeze([
  "draft",
  "active",
  "reset_in_progress",
  "archived"
]);
export const PROMOTION_PLAN_STATUSES = Object.freeze([
  "draft",
  "validated",
  "approved",
  "executed",
  "cancelled"
]);
export const PARALLEL_RUN_PLAN_STATUSES = Object.freeze([
  "draft",
  "started",
  "completed",
  "cancelled"
]);

const DEFAULT_ONBOARDING_STEP_CODES = Object.freeze([
  "company_profile",
  "registrations",
  "chart_template",
  "vat_setup",
  "fiscal_periods"
]);
const FORBIDDEN_LIVE_CARRY_OVER_CODES = Object.freeze([
  "auth_secret",
  "bank_rail",
  "ledger_history",
  "payroll_run",
  "provider_ref",
  "submission_receipt",
  "token"
]);

export function createTenantControlPlatform(options = {}) {
  return createTenantControlEngine(options);
}

export function createTenantControlEngine({
  clock = () => new Date(),
  orgAuthPlatform = null,
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null
} = {}) {
  const state = {
    tenantBootstraps: new Map(),
    bootstrapStepStates: new Map(),
    companySetupProfiles: new Map(),
    companySetupProfileIdByCompany: new Map(),
    moduleDefinitions: new Map(),
    moduleActivationProfiles: new Map(),
    trialEnvironmentProfiles: new Map(),
    trialEnvironmentIdsByCompany: new Map(),
    promotionPlans: new Map(),
    promotionPlanIdsByCompany: new Map(),
    parallelRunPlans: new Map(),
    parallelRunPlanIdsByCompany: new Map(),
    tenantControlEvents: [],
    auditEvents: []
  };

  if (seedDemo) {
    syncAllFromOrgAuth();
  }

  return {
    companySetupProfileStatuses: COMPANY_SETUP_PROFILE_STATUSES,
    trialEnvironmentProfileStatuses: TRIAL_ENVIRONMENT_PROFILE_STATUSES,
    promotionPlanStatuses: PROMOTION_PLAN_STATUSES,
    parallelRunPlanStatuses: PARALLEL_RUN_PLAN_STATUSES,
    createTenantBootstrap,
    getTenantBootstrap,
    getTenantBootstrapChecklist,
    updateTenantBootstrapStep,
    getCompanySetupProfile,
    registerTenantModuleDefinition,
    listTenantModuleDefinitions,
    activateTenantModule,
    listTenantModuleActivations,
    suspendTenantModuleActivation,
    createTrialEnvironment,
    listTrialEnvironments,
    resetTrialEnvironment,
    promoteTrialToLive,
    listPromotionPlans,
    startParallelRun,
    listParallelRunPlans,
    snapshotTenantControl,
    exportDurableState,
    importDurableState
  };

  function createTenantBootstrap({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName,
    accountingYear
  } = {}) {
    const delegated = requireOrgAuthPlatform().createOnboardingRun({
      legalName,
      orgNumber,
      adminEmail,
      adminDisplayName,
      accountingYear
    });
    syncRunFromOrgAuth(delegated.runId);
    return presentTenantBootstrap(delegated.runId);
  }

  function getTenantBootstrap({ tenantBootstrapId, resumeToken = null } = {}) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId, resumeToken);
    return presentTenantBootstrap(bootstrap.tenantBootstrapId);
  }

  function getTenantBootstrapChecklist({ tenantBootstrapId, resumeToken = null } = {}) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId, resumeToken);
    return {
      tenantBootstrapId: bootstrap.tenantBootstrapId,
      companyId: bootstrap.companyId,
      status: bootstrap.status,
      currentStep: bootstrap.currentStep,
      checklist: buildChecklist(bootstrap.tenantBootstrapId)
    };
  }

  function updateTenantBootstrapStep({
    tenantBootstrapId,
    resumeToken = null,
    stepCode,
    payload
  } = {}) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId, resumeToken);
    requireOrgAuthPlatform().updateOnboardingStep({
      runId: bootstrap.onboardingRunId,
      resumeToken: bootstrap.resumeToken,
      stepCode,
      payload
    });
    syncRunFromOrgAuth(bootstrap.onboardingRunId);
    return presentTenantBootstrap(bootstrap.tenantBootstrapId);
  }

  function getCompanySetupProfile({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "company_setup_profile",
      objectId: companyId,
      scopeCode: "tenant_setup"
    });
    const profile = state.companySetupProfiles.get(requireCompanySetupProfileId(companyId));
    if (!profile) {
      throw httpError(404, "company_setup_profile_not_found", "Company setup profile was not found.");
    }
    return copy(profile);
  }

  function registerTenantModuleDefinition({
    sessionToken,
    companyId,
    moduleCode,
    label,
    riskClass,
    coreModule,
    dependencyModuleCodes,
    requiredPolicyCodes,
    requiredRulepackCodes,
    requiresCompletedTenantSetup,
    allowSuspend
  } = {}) {
    const definition = requireOrgAuthPlatform().registerModuleDefinition({
      sessionToken,
      companyId,
      moduleCode,
      label,
      riskClass,
      coreModule,
      dependencyModuleCodes,
      requiredPolicyCodes,
      requiredRulepackCodes,
      requiresCompletedTenantSetup,
      allowSuspend
    });
    syncAllFromOrgAuth();
    return copy(requireModuleDefinition(companyId, definition.moduleCode));
  }

  function listTenantModuleDefinitions({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "module_definition",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    syncAllFromOrgAuth();
    return [...state.moduleDefinitions.values()]
      .filter((record) => record.companyId === requireText(companyId, "company_id_required"))
      .sort((left, right) => left.moduleCode.localeCompare(right.moduleCode))
      .map(copy);
  }

  function activateTenantModule({
    sessionToken,
    companyId,
    moduleCode,
    effectiveFrom,
    activationReason,
    approvalActorIds
  } = {}) {
    const activation = requireOrgAuthPlatform().activateModule({
      sessionToken,
      companyId,
      moduleCode,
      effectiveFrom,
      activationReason,
      approvalActorIds
    });
    syncAllFromOrgAuth();
    return copy(requireModuleActivationProfile(companyId, activation.moduleCode));
  }

  function listTenantModuleActivations({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "module_activation_profile",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    syncAllFromOrgAuth();
    return [...state.moduleActivationProfiles.values()]
      .filter((record) => record.companyId === requireText(companyId, "company_id_required"))
      .sort((left, right) => left.moduleCode.localeCompare(right.moduleCode))
      .map(copy);
  }

  function suspendTenantModuleActivation({
    sessionToken,
    companyId,
    moduleCode,
    reasonCode
  } = {}) {
    const activation = requireOrgAuthPlatform().suspendModuleActivation({
      sessionToken,
      companyId,
      moduleCode,
      reasonCode
    });
    syncAllFromOrgAuth();
    return copy(requireModuleActivationProfile(companyId, activation.moduleCode));
  }

  function createTrialEnvironment({
    sessionToken,
    companyId,
    label = null,
    seedScenarioCode = null,
    watermarkCode = "trial",
    expiresAt = null
  } = {}) {
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_MANAGE",
      objectType: "trial_environment_profile",
      objectId: companyId,
      scopeCode: "trial_environment"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const now = nowIso();
    const record = {
      trialEnvironmentProfileId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      label: normalizeOptionalText(label) || `Trial ${resolvedCompanyId.slice(0, 8)}`,
      status: "active",
      watermarkCode: requireText(watermarkCode, "trial_watermark_required"),
      seedScenarioCode: normalizeOptionalText(seedScenarioCode),
      liveCredentialPolicy: "blocked",
      liveSubmissionPolicy: "blocked",
      liveBankRailPolicy: "blocked",
      liveEconomicEffectPolicy: "blocked",
      resetCount: 0,
      lastResetAt: null,
      expiresAt: normalizeOptionalText(expiresAt),
      createdByUserId: principal.userId,
      createdAt: now,
      updatedAt: now
    };
    state.trialEnvironmentProfiles.set(record.trialEnvironmentProfileId, record);
    appendToIndex(state.trialEnvironmentIdsByCompany, resolvedCompanyId, record.trialEnvironmentProfileId);
    appendDomainEvent("trial.environment.created", {
      companyId: resolvedCompanyId,
      trialEnvironmentProfileId: record.trialEnvironmentProfileId,
      actorUserId: principal.userId,
      seedScenarioCode: record.seedScenarioCode
    });
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      action: "tenant_control.trial_environment.created",
      entityType: "trial_environment_profile",
      entityId: record.trialEnvironmentProfileId,
      metadata: {
        watermarkCode: record.watermarkCode,
        seedScenarioCode: record.seedScenarioCode
      }
    });
    return copy(record);
  }

  function listTrialEnvironments({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "trial_environment_profile",
      objectId: companyId,
      scopeCode: "trial_environment"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.trialEnvironmentIdsByCompany.get(resolvedCompanyId) || [])
      .map((trialEnvironmentProfileId) => state.trialEnvironmentProfiles.get(trialEnvironmentProfileId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function resetTrialEnvironment({
    sessionToken,
    trialEnvironmentProfileId,
    reasonCode = "manual_reset"
  } = {}) {
    const trialEnvironment = requireTrialEnvironment(trialEnvironmentProfileId);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: trialEnvironment.companyId,
      action: "COMPANY_MANAGE",
      objectType: "trial_environment_profile",
      objectId: trialEnvironmentProfileId,
      scopeCode: "trial_environment"
    });
    trialEnvironment.status = "reset_in_progress";
    trialEnvironment.updatedAt = nowIso();
    trialEnvironment.status = "active";
    trialEnvironment.resetCount += 1;
    trialEnvironment.lastResetAt = nowIso();
    trialEnvironment.updatedAt = trialEnvironment.lastResetAt;
    appendDomainEvent("trial.environment.reset", {
      companyId: trialEnvironment.companyId,
      trialEnvironmentProfileId,
      actorUserId: principal.userId,
      reasonCode
    });
    appendAuditEvent({
      companyId: trialEnvironment.companyId,
      actorId: principal.userId,
      action: "tenant_control.trial_environment.reset",
      entityType: "trial_environment_profile",
      entityId: trialEnvironmentProfileId,
      metadata: {
        reasonCode,
        resetCount: trialEnvironment.resetCount
      }
    });
    return copy(trialEnvironment);
  }

  function promoteTrialToLive({
    sessionToken,
    trialEnvironmentProfileId,
    carryOverSelectionCodes = [],
    approvalActorIds = [],
    executeNow = false
  } = {}) {
    const trialEnvironment = requireTrialEnvironment(trialEnvironmentProfileId);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: trialEnvironment.companyId,
      action: "COMPANY_MANAGE",
      objectType: "promotion_plan",
      objectId: trialEnvironmentProfileId,
      scopeCode: "promotion_plan"
    });
    const normalizedCarryOverSelectionCodes = normalizeStringList(carryOverSelectionCodes);
    const forbiddenCarryOvers = normalizedCarryOverSelectionCodes.filter((code) =>
      FORBIDDEN_LIVE_CARRY_OVER_CODES.includes(code)
    );
    if (forbiddenCarryOvers.length > 0) {
      throw httpError(
        409,
        "trial_promotion_forbidden_carry_over",
        `Trial promotion cannot carry live-forbidden refs: ${forbiddenCarryOvers.join(", ")}.`
      );
    }
    const normalizedApprovalActorIds = normalizeStringList(approvalActorIds);
    const now = nowIso();
    const plan = {
      promotionPlanId: crypto.randomUUID(),
      companyId: trialEnvironment.companyId,
      trialEnvironmentProfileId,
      status:
        executeNow && normalizedApprovalActorIds.length > 0
          ? "executed"
          : normalizedApprovalActorIds.length > 0
            ? "approved"
            : "validated",
      carryOverSelectionCodes: normalizedCarryOverSelectionCodes,
      approvalActorIds: normalizedApprovalActorIds,
      requiresCutover: true,
      forbiddenCarryOvers,
      createdByUserId: principal.userId,
      createdAt: now,
      updatedAt: now,
      executedAt: executeNow && normalizedApprovalActorIds.length > 0 ? now : null
    };
    state.promotionPlans.set(plan.promotionPlanId, plan);
    appendToIndex(state.promotionPlanIdsByCompany, plan.companyId, plan.promotionPlanId);
    if (plan.status === "executed") {
      appendDomainEvent("trial.promoted_to_live", {
        companyId: plan.companyId,
        promotionPlanId: plan.promotionPlanId,
        actorUserId: principal.userId
      });
    }
    appendAuditEvent({
      companyId: plan.companyId,
      actorId: principal.userId,
      action: "tenant_control.trial_promotion.created",
      entityType: "promotion_plan",
      entityId: plan.promotionPlanId,
      metadata: {
        status: plan.status,
        carryOverSelectionCodes: plan.carryOverSelectionCodes,
        approvalActorIds: plan.approvalActorIds
      }
    });
    return copy(plan);
  }

  function listPromotionPlans({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "promotion_plan",
      objectId: companyId,
      scopeCode: "promotion_plan"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.promotionPlanIdsByCompany.get(resolvedCompanyId) || [])
      .map((promotionPlanId) => state.promotionPlans.get(promotionPlanId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function startParallelRun({
    sessionToken,
    companyId,
    trialEnvironmentProfileId,
    liveCompanyId = null,
    runWindowDays = 30
  } = {}) {
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_MANAGE",
      objectType: "parallel_run_plan",
      objectId: companyId,
      scopeCode: "parallel_run"
    });
    const trialEnvironment = requireTrialEnvironment(trialEnvironmentProfileId);
    if (trialEnvironment.companyId !== requireText(companyId, "company_id_required")) {
      throw httpError(409, "parallel_run_trial_scope_mismatch", "Trial environment belongs to another company.");
    }
    const now = nowIso();
    const record = {
      parallelRunPlanId: crypto.randomUUID(),
      companyId,
      trialEnvironmentProfileId,
      liveCompanyId: normalizeOptionalText(liveCompanyId),
      status: "started",
      runWindowDays: normalizePositiveInteger(runWindowDays, "parallel_run_window_invalid"),
      createdByUserId: principal.userId,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    };
    state.parallelRunPlans.set(record.parallelRunPlanId, record);
    appendToIndex(state.parallelRunPlanIdsByCompany, companyId, record.parallelRunPlanId);
    appendDomainEvent("parallel_run.started", {
      companyId,
      parallelRunPlanId: record.parallelRunPlanId,
      actorUserId: principal.userId
    });
    appendAuditEvent({
      companyId,
      actorId: principal.userId,
      action: "tenant_control.parallel_run.started",
      entityType: "parallel_run_plan",
      entityId: record.parallelRunPlanId,
      metadata: {
        runWindowDays: record.runWindowDays,
        trialEnvironmentProfileId
      }
    });
    return copy(record);
  }

  function listParallelRunPlans({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "parallel_run_plan",
      objectId: companyId,
      scopeCode: "parallel_run"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.parallelRunPlanIdsByCompany.get(resolvedCompanyId) || [])
      .map((parallelRunPlanId) => state.parallelRunPlans.get(parallelRunPlanId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function snapshotTenantControl() {
    return copy({
      tenantBootstraps: [...state.tenantBootstraps.values()],
      bootstrapStepStates: [...state.bootstrapStepStates.values()],
      companySetupProfiles: [...state.companySetupProfiles.values()],
      moduleDefinitions: [...state.moduleDefinitions.values()],
      moduleActivationProfiles: [...state.moduleActivationProfiles.values()],
      trialEnvironmentProfiles: [...state.trialEnvironmentProfiles.values()],
      promotionPlans: [...state.promotionPlans.values()],
      parallelRunPlans: [...state.parallelRunPlans.values()],
      tenantControlEvents: [...state.tenantControlEvents],
      auditEvents: [...state.auditEvents]
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function syncAllFromOrgAuth() {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    if (!orgAuthSnapshot) {
      return;
    }
    syncBootstrapState(orgAuthSnapshot);
    syncModuleState(orgAuthSnapshot);
  }

  function syncRunFromOrgAuth(runId) {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    if (!orgAuthSnapshot) {
      return;
    }
    syncBootstrapState(orgAuthSnapshot, runId);
  }

  function syncBootstrapState(orgAuthSnapshot, runId = null) {
    const runFilter = normalizeOptionalText(runId);
    const companiesById = new Map((orgAuthSnapshot.companies || []).map((record) => [record.companyId, record]));
    if (!runFilter) {
      state.tenantBootstraps.clear();
      state.bootstrapStepStates.clear();
      state.companySetupProfiles.clear();
      state.companySetupProfileIdByCompany.clear();
    }

    for (const run of orgAuthSnapshot.onboardingRuns || []) {
      if (runFilter && run.runId !== runFilter) {
        continue;
      }
      const stepStates = (orgAuthSnapshot.onboardingStepStates || []).filter((record) => record.runId === run.runId);
      const tenantSetupProfile = (orgAuthSnapshot.tenantSetupProfiles || []).find(
        (record) => record.companyId === run.companyId
      );
      upsertBootstrapMirror({
        run,
        stepStates,
        tenantSetupProfile,
        company: companiesById.get(run.companyId) || null
      });
    }

    for (const tenantSetupProfile of orgAuthSnapshot.tenantSetupProfiles || []) {
      if (runFilter) {
        const run = (orgAuthSnapshot.onboardingRuns || []).find((record) => record.runId === runFilter);
        if (!run || run.companyId !== tenantSetupProfile.companyId) {
          continue;
        }
      }
      if (!state.companySetupProfileIdByCompany.has(tenantSetupProfile.companyId)) {
        upsertCompanySetupProfile({
          companyId: tenantSetupProfile.companyId,
          tenantBootstrapId: null,
          bootstrapStatus: null,
          currentStep: null,
          tenantSetupProfile,
          company: companiesById.get(tenantSetupProfile.companyId) || null
        });
      }
    }
  }

  function syncModuleState(orgAuthSnapshot) {
    state.moduleDefinitions.clear();
    state.moduleActivationProfiles.clear();
    for (const record of orgAuthSnapshot.moduleDefinitions || []) {
      state.moduleDefinitions.set(createCompanyScopedKey(record.companyId, record.moduleCode), {
        ...copy(record),
        moduleActivationProfileId: null
      });
    }
    for (const record of orgAuthSnapshot.moduleActivations || []) {
      state.moduleActivationProfiles.set(createCompanyScopedKey(record.companyId, record.moduleCode), {
        ...copy(record),
        moduleActivationProfileId: record.moduleActivationId
      });
    }
  }

  function upsertBootstrapMirror({ run, stepStates, tenantSetupProfile, company } = {}) {
    const existing = state.tenantBootstraps.get(run.runId) || null;
    for (const stepState of stepStates) {
      state.bootstrapStepStates.set(createStepStateKey(stepState.runId, stepState.stepCode), copy(stepState));
    }
    const bootstrap = {
      tenantBootstrapId: run.runId,
      onboardingRunId: run.runId,
      companyId: run.companyId,
      resumeToken: run.resumeToken,
      status: mapCompanySetupStatus(tenantSetupProfile?.status, run.status),
      bootstrapStatus: run.status,
      currentStep: run.currentStep,
      legalName: company?.legalName || null,
      orgNumber: company?.orgNumber || null,
      companyStatus: company?.status || null,
      payloadJson: copy(run.payloadJson || {}),
      createdAt: existing?.createdAt || run.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    state.tenantBootstraps.set(run.runId, bootstrap);
    upsertCompanySetupProfile({
      companyId: run.companyId,
      tenantBootstrapId: run.runId,
      bootstrapStatus: run.status,
      currentStep: run.currentStep,
      tenantSetupProfile,
      company
    });
  }

  function upsertCompanySetupProfile({
    companyId,
    tenantBootstrapId,
    bootstrapStatus,
    currentStep,
    tenantSetupProfile,
    company
  } = {}) {
    const existingId = state.companySetupProfileIdByCompany.get(companyId);
    const existing = existingId ? state.companySetupProfiles.get(existingId) : null;
    const companySetupProfileId =
      existingId ||
      tenantSetupProfile?.tenantSetupProfileId ||
      crypto.randomUUID();
    const status = mapCompanySetupStatus(tenantSetupProfile?.status, bootstrapStatus, company?.status);
    const record = {
      companySetupProfileId,
      tenantSetupProfileId: tenantSetupProfile?.tenantSetupProfileId || companySetupProfileId,
      companyId,
      tenantBootstrapId,
      status,
      bootstrapStatus,
      currentStep,
      onboardingCompletedAt: tenantSetupProfile?.onboardingCompletedAt || null,
      approvedAt: tenantSetupProfile?.approvedAt || null,
      suspendedAt: tenantSetupProfile?.suspendedAt || null,
      suspendedReasonCode: tenantSetupProfile?.suspendedReasonCode || null,
      financeReadyAt:
        status === "finance_ready" || status === "pilot" || status === "production_live"
          ? tenantSetupProfile?.onboardingCompletedAt || nowIso()
          : null,
      companyStatus: company?.status || null,
      createdAt: existing?.createdAt || tenantSetupProfile?.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    state.companySetupProfiles.set(companySetupProfileId, record);
    state.companySetupProfileIdByCompany.set(companyId, companySetupProfileId);
  }

  function requireTenantBootstrap(tenantBootstrapId, resumeToken = null) {
    const bootstrap = state.tenantBootstraps.get(requireText(tenantBootstrapId, "tenant_bootstrap_id_required"));
    if (!bootstrap) {
      throw httpError(404, "tenant_bootstrap_not_found", "Tenant bootstrap was not found.");
    }
    if (resumeToken && bootstrap.resumeToken !== resumeToken) {
      throw httpError(403, "tenant_bootstrap_resume_token_invalid", "Resume token is invalid for this tenant bootstrap.");
    }
    return bootstrap;
  }

  function requireCompanySetupProfileId(companyId) {
    const companySetupProfileId = state.companySetupProfileIdByCompany.get(requireText(companyId, "company_id_required"));
    if (!companySetupProfileId) {
      throw httpError(404, "company_setup_profile_not_found", "Company setup profile was not found.");
    }
    return companySetupProfileId;
  }

  function requireModuleDefinition(companyId, moduleCode) {
    const record = state.moduleDefinitions.get(createCompanyScopedKey(companyId, moduleCode));
    if (!record) {
      throw httpError(404, "module_definition_not_found", "Module definition was not found.");
    }
    return record;
  }

  function requireModuleActivationProfile(companyId, moduleCode) {
    const record = state.moduleActivationProfiles.get(createCompanyScopedKey(companyId, moduleCode));
    if (!record) {
      throw httpError(404, "module_activation_profile_not_found", "Module activation profile was not found.");
    }
    return record;
  }

  function requireTrialEnvironment(trialEnvironmentProfileId) {
    const record = state.trialEnvironmentProfiles.get(requireText(trialEnvironmentProfileId, "trial_environment_profile_id_required"));
    if (!record) {
      throw httpError(404, "trial_environment_profile_not_found", "Trial environment profile was not found.");
    }
    return record;
  }

  function presentTenantBootstrap(tenantBootstrapId) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId);
    return {
      tenantBootstrapId: bootstrap.tenantBootstrapId,
      runId: bootstrap.onboardingRunId,
      resumeToken: bootstrap.resumeToken,
      companyId: bootstrap.companyId,
      status: bootstrap.bootstrapStatus,
      companySetupStatus: bootstrap.status,
      currentStep: bootstrap.currentStep,
      payloadJson: copy(bootstrap.payloadJson || {}),
      checklist: buildChecklist(bootstrap.tenantBootstrapId)
    };
  }

  function buildChecklist(tenantBootstrapId) {
    const resolvedTenantBootstrapId = requireText(tenantBootstrapId, "tenant_bootstrap_id_required");
    return DEFAULT_ONBOARDING_STEP_CODES.map((stepCode) => {
      const stepState = state.bootstrapStepStates.get(createStepStateKey(resolvedTenantBootstrapId, stepCode));
      return {
        stepCode,
        status: stepState?.status || "pending",
        completedAt: stepState?.completedAt || null,
        dataJson: copy(stepState?.dataJson || {})
      };
    });
  }

  function authorizeCompanyAction({
    sessionToken,
    companyId,
    action,
    objectType,
    objectId,
    scopeCode
  } = {}) {
    const platform = requireOrgAuthPlatform();
    const { principal, decision } = platform.checkAuthorization({
      sessionToken,
      action: platform.actions[action],
      resource: {
        companyId: requireText(companyId, "company_id_required"),
        objectType: requireText(objectType, "object_type_required"),
        objectId: requireText(objectId, "object_id_required"),
        scopeCode: requireText(scopeCode, "scope_code_required")
      }
    });
    if (!decision.allowed) {
      throw httpError(403, "forbidden", "The current session is not authorized for this action.");
    }
    return principal;
  }

  function requireOrgAuthPlatform() {
    if (!orgAuthPlatform) {
      throw httpError(500, "tenant_control_org_auth_unavailable", "Tenant control requires org-auth orchestration.");
    }
    return orgAuthPlatform;
  }

  function getOrgAuthSnapshot() {
    const platform = requireOrgAuthPlatform();
    if (typeof platform.snapshot !== "function") {
      return null;
    }
    return platform.snapshot();
  }

  function appendDomainEvent(eventCode, payload) {
    state.tenantControlEvents.push({
      eventId: crypto.randomUUID(),
      eventCode: requireText(eventCode, "event_code_required"),
      payloadJson: copy(payload || {}),
      emittedAt: nowIso()
    });
  }

  function appendAuditEvent({ companyId, actorId, action, entityType, entityId, metadata = {} } = {}) {
    state.auditEvents.push({
      auditEventId: crypto.randomUUID(),
      companyId: requireText(companyId, "company_id_required"),
      actorId: normalizeOptionalText(actorId),
      action: requireText(action, "audit_action_required"),
      entityType: requireText(entityType, "audit_entity_type_required"),
      entityId: requireText(entityId, "audit_entity_id_required"),
      metadata: copy(metadata || {}),
      recordedAt: nowIso()
    });
  }
}

function mapCompanySetupStatus(tenantStatus, bootstrapStatus = null, companyStatus = null) {
  if (tenantStatus === "suspended") {
    return "suspended";
  }
  if (companyStatus === "trial") {
    return "pilot";
  }
  if (tenantStatus === "active") {
    return companyStatus === "active" ? "finance_ready" : "finance_ready";
  }
  if (tenantStatus === "setup_pending" || bootstrapStatus === "in_progress") {
    return "bootstrap_running";
  }
  return "draft";
}

function createCompanyScopedKey(companyId, recordCode) {
  return `${requireText(companyId, "company_id_required")}::${requireText(recordCode, "record_code_required")}`;
}

function createStepStateKey(tenantBootstrapId, stepCode) {
  return `${requireText(tenantBootstrapId, "tenant_bootstrap_id_required")}::${requireText(stepCode, "step_code_required")}`;
}

function appendToIndex(index, key, value) {
  const resolvedKey = requireText(key, "index_key_required");
  const next = [...new Set([...(index.get(resolvedKey) || []), value])];
  index.set(resolvedKey, next);
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim() === "") {
    throw httpError(400, code, `${code.replaceAll("_", " ")}.`);
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeStringList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeOptionalText(String(value || ""))).filter(Boolean))].sort();
}

function normalizePositiveInteger(value, code) {
  const resolved = Number(value);
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw httpError(400, code, `${code.replaceAll("_", " ")}.`);
  }
  return resolved;
}

function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
