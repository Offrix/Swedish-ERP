import crypto from "node:crypto";
import {
  CLOSE_BLOCKER_SEVERITIES,
  CLOSE_BLOCKER_STATUSES,
  CLOSE_CHECKLIST_STATUSES,
  CLOSE_STEP_STATUSES,
  PERIOD_CLOSE_STATES,
  createCloseModule
} from "./close.mjs";
import {
  ACCESS_REVIEW_STATUSES,
  ADMIN_DIAGNOSTIC_TYPES,
  BREAK_GLASS_STATES,
  IMPERSONATION_MODES,
  IMPERSONATION_STATES,
  SUPPORT_CASE_SEVERITIES,
  SUPPORT_CASE_STATUSES,
  createBackofficeModule
} from "./backoffice.mjs";
import {
  EMERGENCY_DISABLE_STATUSES,
  CHAOS_SCENARIO_STATUSES,
  FEATURE_FLAG_SCOPE_TYPES,
  FEATURE_FLAG_TYPES,
  FEATURE_FLAG_RISK_CLASSES,
  INCIDENT_EVENT_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_SIGNAL_STATES,
  INCIDENT_SIGNAL_TYPES,
  INCIDENT_STATUSES,
  LOAD_PROFILE_STATUSES,
  RUNTIME_RESTORE_PLAN_STATUSES,
  RESTORE_DRILL_STATUSES,
  buildAuditCorrelationRecordKey,
  createResilienceModule
} from "./resilience.mjs";
import {
  CUTOVER_PLAN_STATUSES,
  DIFFERENCE_CLASSES,
  DIFF_REPORT_STATUSES,
  EMPLOYEE_MIGRATION_VALIDATION_STATES,
  IMPORT_BATCH_STATUSES,
  MAPPING_SET_STATUSES,
  MIGRATION_ACCEPTANCE_RECORD_STATUSES,
  POST_CUTOVER_CORRECTION_CASE_STATUSES,
  PAYROLL_MIGRATION_BATCH_STATUSES,
  PAYROLL_MIGRATION_DIFF_STATUSES,
  PAYROLL_MIGRATION_MODES,
  createMigrationModule
} from "./migration.mjs";
import {
  ASYNC_JOB_ERROR_CLASSES,
  ASYNC_JOB_OPERATOR_STATES,
  ASYNC_JOB_REPLAY_STATUSES,
  ASYNC_JOB_RISK_CLASSES,
  ASYNC_JOB_STATUSES,
  createAsyncJobsModule
} from "./jobs.mjs";

export const PORTFOLIO_STATUS_CODES = Object.freeze(["active", "waiting_for_client", "in_review", "ready_for_close", "blocked"]);
export const CLIENT_REQUEST_STATUSES = Object.freeze(["draft", "sent", "acknowledged", "in_progress", "delivered", "accepted", "closed", "overdue", "escalated", "reopened"]);
export const APPROVAL_PACKAGE_STATUSES = Object.freeze(["prepared", "sent_for_approval", "viewed", "approved", "rejected", "revised", "superseded"]);
export const WORK_ITEM_STATUSES = Object.freeze(["open", "acknowledged", "waiting_external", "snoozed", "resolved", "escalated", "blocked", "closed"]);
export const OPERATIONAL_WORK_ITEM_PRIORITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const COMMENT_VISIBILITY_CODES = Object.freeze(["internal", "external_shared", "restricted_internal"]);
export const MASS_ACTION_TYPES = Object.freeze(["send_reminder", "reassign_owner"]);
export {
  CLOSE_CHECKLIST_STATUSES,
  CLOSE_STEP_STATUSES,
  CLOSE_BLOCKER_SEVERITIES,
  CLOSE_BLOCKER_STATUSES,
  PERIOD_CLOSE_STATES,
  SUPPORT_CASE_STATUSES,
  SUPPORT_CASE_SEVERITIES,
  IMPERSONATION_MODES,
  IMPERSONATION_STATES,
  ACCESS_REVIEW_STATUSES,
  BREAK_GLASS_STATES,
  ADMIN_DIAGNOSTIC_TYPES,
  FEATURE_FLAG_SCOPE_TYPES,
  FEATURE_FLAG_TYPES,
  FEATURE_FLAG_RISK_CLASSES,
  EMERGENCY_DISABLE_STATUSES,
  LOAD_PROFILE_STATUSES,
  RESTORE_DRILL_STATUSES,
  CHAOS_SCENARIO_STATUSES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_SIGNAL_TYPES,
  INCIDENT_SIGNAL_STATES,
  INCIDENT_EVENT_TYPES,
  RUNTIME_RESTORE_PLAN_STATUSES,
  ASYNC_JOB_STATUSES,
  ASYNC_JOB_RISK_CLASSES,
  ASYNC_JOB_REPLAY_STATUSES,
  ASYNC_JOB_OPERATOR_STATES,
  ASYNC_JOB_ERROR_CLASSES,
  IMPORT_BATCH_STATUSES,
  MAPPING_SET_STATUSES,
  DIFF_REPORT_STATUSES,
  DIFFERENCE_CLASSES,
  MIGRATION_ACCEPTANCE_RECORD_STATUSES,
  CUTOVER_PLAN_STATUSES,
  POST_CUTOVER_CORRECTION_CASE_STATUSES,
  PAYROLL_MIGRATION_BATCH_STATUSES,
  PAYROLL_MIGRATION_MODES,
  EMPLOYEE_MIGRATION_VALIDATION_STATES,
  PAYROLL_MIGRATION_DIFF_STATUSES
};

export function createCorePlatform(options = {}) {
  return createCoreEngine(options);
}

export function createCoreEngine({
  orgAuthPlatform = null,
  reportingPlatform = null,
  ledgerPlatform = null,
  integrationPlatform = null,
  hrPlatform = null,
  balancesPlatform = null,
  collectiveAgreementsPlatform = null,
  asyncJobStore = null,
  clock = () => new Date()
} = {}) {
  const state = {
    portfolios: new Map(),
    requests: new Map(),
    approvals: new Map(),
    workItems: new Map(),
    operationalWorkItems: new Map(),
    comments: new Map(),
    closeChecklists: new Map(),
    closeBlockers: new Map(),
    closeSignoffs: new Map(),
    closeReopenRequests: new Map(),
    supportCases: new Map(),
    impersonationSessions: new Map(),
    accessReviewBatches: new Map(),
    adminDiagnostics: new Map(),
    breakGlassSessions: new Map(),
    featureFlags: new Map(),
    emergencyDisables: new Map(),
    loadProfiles: new Map(),
    restoreDrills: new Map(),
    chaosScenarios: new Map(),
    auditCorrelations: new Map(),
    incidentSignals: new Map(),
    runtimeIncidents: new Map(),
    runtimeIncidentEvents: new Map(),
    runtimeIncidentPostReviews: new Map(),
    runtimeRestorePlans: new Map(),
    mappingSets: new Map(),
    importBatches: new Map(),
    migrationCorrections: new Map(),
    diffReports: new Map(),
    cutoverPlans: new Map(),
    migrationAcceptanceRecords: new Map(),
    postCutoverCorrectionCases: new Map(),
    payrollMigrationBatches: new Map(),
    employeeMigrationRecords: new Map(),
    balanceBaselines: new Map(),
    payrollMigrationDiffs: new Map(),
    payrollMigrationApprovals: new Map(),
    auditEvents: []
  };

  function now() {
    return new Date(clock()).toISOString();
  }

  function audit({
    companyId,
    actorId,
    correlationId = crypto.randomUUID(),
    action,
    entityType,
    entityId,
    explanation,
    metadata = {}
  }) {
    const event = {
      auditEventId: crypto.randomUUID(),
      companyId,
      actorId,
      correlationId,
      action,
      entityType,
      entityId,
      explanation,
      metadata: clone(metadata || {}),
      recordedAt: now()
    };
    state.auditEvents.push(event);
    recordAuditCorrelationEvent(state, event);
    return event;
  }

  function requireCompany(companyId) {
    if (!orgAuthPlatform?.getCompanyProfile) {
      throw error(500, "org_auth_platform_required", "Org/auth platform is required.");
    }
    return orgAuthPlatform.getCompanyProfile({ companyId });
  }

  function requireBureauUser(bureauOrgId, companyUserId) {
    const companyUser = (orgAuthPlatform?.snapshot()?.companyUsers || []).find((candidate) => candidate.companyUserId === companyUserId);
    if (!companyUser || companyUser.companyId !== bureauOrgId) {
      throw error(404, "bureau_company_user_not_found", "Bureau company user was not found in the bureau org.");
    }
    return companyUser;
  }

  function authorize(sessionToken, bureauOrgId, action) {
    if (!orgAuthPlatform?.checkAuthorization) {
      throw error(500, "org_auth_platform_required", "Org/auth platform is required.");
    }
    const { principal, decision } = orgAuthPlatform.checkAuthorization({
      sessionToken,
      action,
      resource: {
        companyId: bureauOrgId,
        objectType: "bureau_portfolio",
        objectId: bureauOrgId,
        scopeCode: "bureau_portfolio"
      }
    });
    if (!decision.allowed) {
      throw error(403, decision.reasonCode, decision.explanation);
    }
    return principal;
  }

  function authorizeCompany(sessionToken, companyId, action) {
    if (!orgAuthPlatform?.checkAuthorization) {
      throw error(500, "org_auth_platform_required", "Org/auth platform is required.");
    }
    const { principal, decision } = orgAuthPlatform.checkAuthorization({
      sessionToken,
      action,
      resource: {
        companyId,
        objectType: "operational_work_item",
        objectId: companyId,
        scopeCode: "backoffice"
      }
    });
    if (!decision.allowed) {
      throw error(403, decision.reasonCode, decision.explanation);
    }
    return principal;
  }

  function requirePortfolio(portfolioId) {
    const portfolio = state.portfolios.get(portfolioId);
    if (!portfolio) {
      throw error(404, "portfolio_membership_not_found", "Portfolio membership was not found.");
    }
    return portfolio;
  }

  function canSeePortfolio(principal, portfolio) {
    return principal.companyId === portfolio.bureauOrgId
      && isActivePortfolioMembership(portfolio, clock())
      && (principal.permissions.includes("company.manage") || portfolio.responsibleConsultantId === principal.companyUserId || portfolio.backupConsultantId === principal.companyUserId);
  }

  function requireVisiblePortfolio(principal, bureauOrgId, clientCompanyId) {
    const portfolio = [...state.portfolios.values()].find((candidate) => candidate.bureauOrgId === bureauOrgId && candidate.clientCompanyId === clientCompanyId);
    if (!portfolio) {
      throw error(404, "portfolio_membership_not_found", "No portfolio membership matched the client company.");
    }
    if (!canSeePortfolio(principal, portfolio)) {
      throw error(403, "bureau_scope_denied", "The current principal is outside the portfolio scope for this client.");
    }
    return portfolio;
  }

  function assertVisible(principal, portfolioId) {
    if (!canSeePortfolio(principal, requirePortfolio(portfolioId))) {
      throw error(403, "bureau_scope_denied", "The current principal is outside the portfolio scope for this client.");
    }
  }

  function findActivePortfolioForClient(bureauOrgId, clientCompanyId) {
    const portfolio = [...state.portfolios.values()].find(
      (candidate) => candidate.bureauOrgId === bureauOrgId
        && candidate.clientCompanyId === clientCompanyId
        && isActivePortfolioMembership(candidate, clock())
    );
    if (!portfolio) {
      throw error(404, "portfolio_membership_not_found", "An active bureau portfolio membership was not found for the client.");
    }
    return portfolio;
  }

  const closeModule = createCloseModule({
    state,
    authorize,
    assertVisible,
    requireCompany,
    requireBureauUser,
    findActivePortfolioForClient,
    upsertWorkItem,
    reportingPlatform,
    ledgerPlatform,
    now,
    audit,
    error
  });
  const backofficeModule = createBackofficeModule({
    state,
    clock,
    orgAuthPlatform,
    integrationPlatform,
    audit,
    error
  });
  const resilienceModule = createResilienceModule({
    state,
    clock,
    orgAuthPlatform,
    audit,
    error
  });
  const { incidentHooks, ...publicResilienceModule } = resilienceModule;
  const asyncJobsModule = createAsyncJobsModule({
    clock,
    audit,
    error,
    store: asyncJobStore || undefined,
    incidentHooks,
    resolveRuntimeFlags: publicResilienceModule.resolveRuntimeFlags
  });
  const migrationModule = createMigrationModule({
    state,
    clock,
    orgAuthPlatform,
    hrPlatform,
    balancesPlatform,
    collectiveAgreementsPlatform,
    listRuntimeJobs: asyncJobsModule.listAsyncJobs,
    listRuntimeDeadLetters: asyncJobsModule.listAsyncDeadLetters,
    listAuthoritySubmissions: integrationPlatform?.listAuthoritySubmissions,
    audit,
    error
  });

  return {
    portfolioStatusCodes: PORTFOLIO_STATUS_CODES,
    clientRequestStatuses: CLIENT_REQUEST_STATUSES,
    approvalPackageStatuses: APPROVAL_PACKAGE_STATUSES,
      workItemStatuses: WORK_ITEM_STATUSES,
      operationalWorkItemPriorities: OPERATIONAL_WORK_ITEM_PRIORITIES,
      commentVisibilityCodes: COMMENT_VISIBILITY_CODES,
      massActionTypes: MASS_ACTION_TYPES,
      closeChecklistStatuses: CLOSE_CHECKLIST_STATUSES,
      closeStepStatuses: CLOSE_STEP_STATUSES,
      closeBlockerSeverities: CLOSE_BLOCKER_SEVERITIES,
      closeBlockerStatuses: CLOSE_BLOCKER_STATUSES,
      periodCloseStates: PERIOD_CLOSE_STATES,
      supportCaseStatuses: SUPPORT_CASE_STATUSES,
      supportCaseSeverities: SUPPORT_CASE_SEVERITIES,
      impersonationModes: IMPERSONATION_MODES,
      impersonationStates: IMPERSONATION_STATES,
      accessReviewStatuses: ACCESS_REVIEW_STATUSES,
      breakGlassStates: BREAK_GLASS_STATES,
      adminDiagnosticTypes: ADMIN_DIAGNOSTIC_TYPES,
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
      asyncJobStatuses: ASYNC_JOB_STATUSES,
      asyncJobRiskClasses: ASYNC_JOB_RISK_CLASSES,
      asyncJobReplayStatuses: ASYNC_JOB_REPLAY_STATUSES,
      asyncJobOperatorStates: ASYNC_JOB_OPERATOR_STATES,
      asyncJobErrorClasses: ASYNC_JOB_ERROR_CLASSES,
      importBatchStatuses: IMPORT_BATCH_STATUSES,
      mappingSetStatuses: MAPPING_SET_STATUSES,
      diffReportStatuses: DIFF_REPORT_STATUSES,
      differenceClasses: DIFFERENCE_CLASSES,
      migrationAcceptanceRecordStatuses: MIGRATION_ACCEPTANCE_RECORD_STATUSES,
      postCutoverCorrectionCaseStatuses: POST_CUTOVER_CORRECTION_CASE_STATUSES,
      cutoverPlanStatuses: CUTOVER_PLAN_STATUSES,
      createPortfolioMembership,
      listPortfolioMemberships,
    createClientRequest,
    listClientRequests,
    sendClientRequest,
    submitClientResponse,
    acceptClientRequest,
    createApprovalPackage,
    listApprovalPackages,
    sendApprovalPackage,
    recordApprovalResponse,
    runPortfolioMassAction,
    listWorkItems,
    claimWorkItem,
    resolveWorkItem,
      listOperationalWorkItems,
      claimOperationalWorkItem,
      resolveOperationalWorkItem,
      upsertOperationalWorkItem,
      createComment,
      listComments,
      instantiateCloseChecklist: closeModule.instantiateCloseChecklist,
      listCloseWorkbenches: closeModule.listCloseWorkbenches,
      getCloseWorkbench: closeModule.getCloseWorkbench,
      completeCloseChecklistStep: closeModule.completeCloseChecklistStep,
      openCloseBlocker: closeModule.openCloseBlocker,
      resolveCloseBlocker: closeModule.resolveCloseBlocker,
      approveCloseOverride: closeModule.approveCloseOverride,
      signOffCloseChecklist: closeModule.signOffCloseChecklist,
      requestCloseReopen: closeModule.requestCloseReopen,
      createSupportCase: backofficeModule.createSupportCase,
      listSupportCases: backofficeModule.listSupportCases,
      closeSupportCase: backofficeModule.closeSupportCase,
      approveSupportCaseActions: backofficeModule.approveSupportCaseActions,
      runAdminDiagnostic: backofficeModule.runAdminDiagnostic,
      requestImpersonation: backofficeModule.requestImpersonation,
      listImpersonationSessions: backofficeModule.listImpersonationSessions,
      approveImpersonation: backofficeModule.approveImpersonation,
      terminateImpersonation: backofficeModule.terminateImpersonation,
      generateAccessReview: backofficeModule.generateAccessReview,
      listAccessReviews: backofficeModule.listAccessReviews,
      recordAccessReviewDecision: backofficeModule.recordAccessReviewDecision,
      requestBreakGlass: backofficeModule.requestBreakGlass,
      listBreakGlassSessions: backofficeModule.listBreakGlassSessions,
      approveBreakGlass: backofficeModule.approveBreakGlass,
      closeBreakGlassSession: backofficeModule.closeBreakGlassSession,
      listAuditTrail: backofficeModule.listAuditTrail,
      upsertFeatureFlag: publicResilienceModule.upsertFeatureFlag,
      listFeatureFlags: publicResilienceModule.listFeatureFlags,
      requestEmergencyDisable: publicResilienceModule.requestEmergencyDisable,
      listEmergencyDisables: publicResilienceModule.listEmergencyDisables,
      releaseEmergencyDisable: publicResilienceModule.releaseEmergencyDisable,
      recordLoadProfile: publicResilienceModule.recordLoadProfile,
      listLoadProfiles: publicResilienceModule.listLoadProfiles,
      recordRestoreDrill: publicResilienceModule.recordRestoreDrill,
      listRestoreDrills: publicResilienceModule.listRestoreDrills,
      recordChaosScenario: publicResilienceModule.recordChaosScenario,
      listChaosScenarios: publicResilienceModule.listChaosScenarios,
      resolveRuntimeFlags: publicResilienceModule.resolveRuntimeFlags,
      getRuntimeControlPlaneSummary: publicResilienceModule.getRuntimeControlPlaneSummary,
      listRuntimeAuditCorrelations: publicResilienceModule.listRuntimeAuditCorrelations,
      getRuntimeAuditCorrelation: publicResilienceModule.getRuntimeAuditCorrelation,
      listRuntimeIncidentSignals: publicResilienceModule.listRuntimeIncidentSignals,
      recordRuntimeIncidentSignal: publicResilienceModule.recordRuntimeIncidentSignal,
      acknowledgeRuntimeIncidentSignal: publicResilienceModule.acknowledgeRuntimeIncidentSignal,
      openRuntimeIncident: publicResilienceModule.openRuntimeIncident,
      listRuntimeIncidents: publicResilienceModule.listRuntimeIncidents,
      getRuntimeIncidentPostReview: publicResilienceModule.getRuntimeIncidentPostReview,
      listRuntimeIncidentEvents: publicResilienceModule.listRuntimeIncidentEvents,
      recordRuntimeIncidentEvent: publicResilienceModule.recordRuntimeIncidentEvent,
      recordRuntimeIncidentPostReview: publicResilienceModule.recordRuntimeIncidentPostReview,
      updateRuntimeIncidentStatus: publicResilienceModule.updateRuntimeIncidentStatus,
      createRuntimeRestorePlan: publicResilienceModule.createRuntimeRestorePlan,
      listRuntimeRestorePlans: publicResilienceModule.listRuntimeRestorePlans,
      approveRuntimeRestorePlan: publicResilienceModule.approveRuntimeRestorePlan,
      startRuntimeRestorePlan: publicResilienceModule.startRuntimeRestorePlan,
      completeRuntimeRestorePlan: publicResilienceModule.completeRuntimeRestorePlan,
      abortRuntimeRestorePlan: publicResilienceModule.abortRuntimeRestorePlan,
      enqueueRuntimeJob: asyncJobsModule.enqueueAsyncJob,
      claimAvailableRuntimeJobs: asyncJobsModule.claimAvailableAsyncJobs,
      startRuntimeJobAttempt: asyncJobsModule.startAsyncJobAttempt,
      completeRuntimeJob: asyncJobsModule.completeAsyncJob,
      failRuntimeJob: asyncJobsModule.failAsyncJob,
      cancelRuntimeJob: asyncJobsModule.cancelAsyncJob,
      getRuntimeJob: asyncJobsModule.getAsyncJob,
      listRuntimeJobs: asyncJobsModule.listAsyncJobs,
      listRuntimeJobAttempts: asyncJobsModule.listAsyncJobAttempts,
      listRuntimeDeadLetters: asyncJobsModule.listAsyncDeadLetters,
      triageRuntimeDeadLetter: asyncJobsModule.triageAsyncDeadLetter,
      planRuntimeJobReplay: asyncJobsModule.planAsyncJobReplay,
      approveRuntimeJobReplay: asyncJobsModule.approveAsyncJobReplay,
      executeRuntimeJobReplay: asyncJobsModule.executeAsyncJobReplay,
      listRuntimeJobReplayPlans: asyncJobsModule.listAsyncJobReplayPlans,
      closeRuntimeJobStore: asyncJobsModule.closeAsyncJobStore,
      createMappingSet: migrationModule.createMappingSet,
      listMappingSets: migrationModule.listMappingSets,
      approveMappingSet: migrationModule.approveMappingSet,
      registerImportBatch: migrationModule.registerImportBatch,
      listImportBatches: migrationModule.listImportBatches,
      runImportBatch: migrationModule.runImportBatch,
      recordManualMigrationCorrection: migrationModule.recordManualMigrationCorrection,
      generateDiffReport: migrationModule.generateDiffReport,
      listDiffReports: migrationModule.listDiffReports,
      recordDifferenceDecision: migrationModule.recordDifferenceDecision,
      createCutoverPlan: migrationModule.createCutoverPlan,
      listCutoverPlans: migrationModule.listCutoverPlans,
      createMigrationAcceptanceRecord: migrationModule.createMigrationAcceptanceRecord,
      listMigrationAcceptanceRecords: migrationModule.listMigrationAcceptanceRecords,
      createPostCutoverCorrectionCase: migrationModule.createPostCutoverCorrectionCase,
      listPostCutoverCorrectionCases: migrationModule.listPostCutoverCorrectionCases,
      recordCutoverSignoff: migrationModule.recordCutoverSignoff,
      updateCutoverChecklistItem: migrationModule.updateCutoverChecklistItem,
      startCutover: migrationModule.startCutover,
      completeFinalExtract: migrationModule.completeFinalExtract,
      passCutoverValidation: migrationModule.passCutoverValidation,
        switchCutover: migrationModule.switchCutover,
        stabilizeCutover: migrationModule.stabilizeCutover,
        startRollback: migrationModule.startRollback,
        completeRollback: migrationModule.completeRollback,
        getMigrationCockpit: migrationModule.getMigrationCockpit,
        createPayrollMigrationBatch: migrationModule.createPayrollMigrationBatch,
        listPayrollMigrationBatches: migrationModule.listPayrollMigrationBatches,
        getPayrollMigrationBatch: migrationModule.getPayrollMigrationBatch,
        importEmployeeMigrationRecords: migrationModule.importEmployeeMigrationRecords,
        registerBalanceBaselines: migrationModule.registerBalanceBaselines,
        validatePayrollMigrationBatch: migrationModule.validatePayrollMigrationBatch,
        calculatePayrollMigrationDiff: migrationModule.calculatePayrollMigrationDiff,
        listPayrollMigrationDiffs: migrationModule.listPayrollMigrationDiffs,
        decidePayrollMigrationDiff: migrationModule.decidePayrollMigrationDiff,
        approvePayrollMigrationBatch: migrationModule.approvePayrollMigrationBatch,
        executePayrollMigrationBatch: migrationModule.executePayrollMigrationBatch,
        rollbackPayrollMigrationBatch: migrationModule.rollbackPayrollMigrationBatch,
        getEmployeeMigrationSummary: migrationModule.getEmployeeMigrationSummary,
        getOpenPayrollMigrationDiffs: migrationModule.getOpenPayrollMigrationDiffs,
        runClientRequestReminderJob,
        runClientRequestEscalationJob,
        runPortfolioStatusRecomputeJob,
      snapshotCore: snapshot
  };

  function createPortfolioMembership({
    sessionToken,
    bureauOrgId,
    clientCompanyId,
    responsibleConsultantId,
    backupConsultantId = null,
    statusProfile = "standard",
    criticality = "standard",
    activeFrom,
    activeTo = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.manage");
    requireCompany(bureauOrgId);
    requireCompany(clientCompanyId);
    requireBureauUser(bureauOrgId, responsibleConsultantId);
    if (backupConsultantId) {
      requireBureauUser(bureauOrgId, backupConsultantId);
    }
    const activeStart = dateOnly(activeFrom, "portfolio_active_from_required");
    const activeEnd = optionalDate(activeTo, "portfolio_active_to_invalid");
    const overlappingMembership = [...state.portfolios.values()].find(
      (candidate) =>
        candidate.bureauOrgId === bureauOrgId
        && candidate.clientCompanyId === clientCompanyId
        && periodsOverlap(
          candidate.activeFrom,
          candidate.activeTo,
          activeStart,
          activeEnd
        )
    );
    if (overlappingMembership) {
      throw error(409, "portfolio_membership_overlap", "Client already has an active portfolio membership in the selected period.");
    }
    const portfolio = {
      portfolioId: crypto.randomUUID(),
      bureauOrgId,
      clientCompanyId,
      responsibleConsultantId,
      backupConsultantId,
      statusProfile: text(statusProfile, "portfolio_status_profile_required"),
      criticality: text(criticality, "portfolio_criticality_required"),
      activeFrom: activeStart,
      activeTo: activeEnd,
      createdAt: now(),
      updatedAt: now()
    };
    state.portfolios.set(portfolio.portfolioId, portfolio);
    audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.portfolio.created", entityType: "portfolio_membership", entityId: portfolio.portfolioId, explanation: `Linked ${clientCompanyId} to bureau org ${bureauOrgId}.` });
    return materializePortfolio(portfolio);
  }

  function listPortfolioMemberships({ sessionToken, bureauOrgId, search = null } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    evaluateDeadlines();
    const needle = norm(search);
    return [...state.portfolios.values()]
      .filter((portfolio) => portfolio.bureauOrgId === bureauOrgId)
      .filter((portfolio) => canSeePortfolio(principal, portfolio))
      .map(materializePortfolio)
      .filter((item) => !needle || [item.clientCompany.legalName, item.clientCompany.orgNumber, item.responsibleConsultant.displayName, item.backupConsultant?.displayName || ""].some((value) => String(value).toLowerCase().includes(needle.toLowerCase())))
      .sort((a, b) => (a.nextDeadlineAt || "9999").localeCompare(b.nextDeadlineAt || "9999"));
  }

  function materializePortfolio(portfolio) {
    const requests = [...state.requests.values()].filter((request) => request.portfolioId === portfolio.portfolioId);
    const approvals = [...state.approvals.values()].filter((approval) => approval.portfolioId === portfolio.portfolioId);
    const nextDeadlineAt = [...requests.map((request) => request.deadlineAt), ...approvals.map((approval) => approval.approvalDeadlineAt)].filter(Boolean).sort()[0] || null;
    const clientStatus = requests.some((request) => ["overdue", "escalated"].includes(request.status) && request.blockerScope !== "none") || approvals.some((approval) => approval.status === "rejected")
      ? "blocked"
      : requests.some((request) => request.status === "delivered")
        ? "in_review"
        : requests.some((request) => request.status === "sent") || approvals.some((approval) => approval.status === "sent_for_approval")
          ? "waiting_for_client"
          : requests.length > 0 || approvals.length > 0
            ? "ready_for_close"
            : "active";
    return {
      ...clone(portfolio),
      clientCompany: clone(requireCompany(portfolio.clientCompanyId)),
      responsibleConsultant: projectCompanyUser(requireBureauUser(portfolio.bureauOrgId, portfolio.responsibleConsultantId)),
      backupConsultant: portfolio.backupConsultantId ? projectCompanyUser(requireBureauUser(portfolio.bureauOrgId, portfolio.backupConsultantId)) : null,
      clientStatus,
      nextDeadlineAt
    };
  }

  function createClientRequest({
    sessionToken,
    bureauOrgId,
    clientCompanyId,
    periodId = null,
    sourceObjectType,
    sourceObjectId,
    requestType = "document_request",
    requestedFromContactId,
    requestedFromContact = null,
    blockerScope = "none",
    targetDate = null,
    deadlineAt = null,
    requestedPayload = {},
    reminderProfile = null,
    ownerConsultantId = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const portfolio = requireVisiblePortfolio(principal, bureauOrgId, clientCompanyId);
    const deadline = deriveDeadline({ clientCompanyId, blockerScope, targetDate, deadlineAt, purpose: "request" });
    const request = {
      requestId: crypto.randomUUID(),
      bureauOrgId,
      portfolioId: portfolio.portfolioId,
      clientCompanyId,
      periodId: norm(periodId),
      sourceObjectType: text(sourceObjectType, "client_request_source_type_required"),
      sourceObjectId: text(sourceObjectId, "client_request_source_id_required"),
      requestType: text(requestType, "client_request_type_required"),
      requestedFromContactId: text(requestedFromContactId, "client_request_contact_required"),
      requestedFromContact: contact(requestedFromContact, requestedFromContactId),
      ownerConsultantId: ownerConsultantId || portfolio.responsibleConsultantId,
      deadlineAt: deadline.deadlineAt,
      deadlineBasis: deadline.deadlineBasis,
      reminderProfile: norm(reminderProfile) || reminderProfileFor(clientCompanyId),
      blockerScope,
      requestedPayload: clone(requestedPayload || {}),
      responseAccessCode: null,
      responses: [],
      status: "draft",
      createdAt: now(),
      updatedAt: now()
    };
    state.requests.set(request.requestId, request);
    audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.request.created", entityType: "bureau_client_request", entityId: request.requestId, explanation: `Created ${request.requestType} for ${clientCompanyId}.` });
    return clone(request);
  }

  function listClientRequests({ sessionToken, bureauOrgId, clientCompanyId = null, status = null } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    evaluateDeadlines();
    const statusFilter = norm(status);
    return [...state.requests.values()]
      .filter((request) => request.bureauOrgId === bureauOrgId)
      .filter((request) => !clientCompanyId || request.clientCompanyId === clientCompanyId)
      .filter((request) => canSeePortfolio(principal, requirePortfolio(request.portfolioId)))
      .filter((request) => !statusFilter || request.status === statusFilter)
      .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt))
      .map(clone);
  }

  function sendClientRequest({ sessionToken, bureauOrgId, requestId, correlationId = crypto.randomUUID() } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const request = requireRequest(requestId);
    assertVisible(principal, request.portfolioId);
    if (request.status !== "draft") {
      throw error(409, "client_request_send_invalid_state", "Only draft requests can be sent.");
    }
    request.status = "sent";
    request.responseAccessCode = request.responseAccessCode || accessCode();
    request.updatedAt = now();
    upsertWorkItem({ bureauOrgId, portfolioId: request.portfolioId, clientCompanyId: request.clientCompanyId, sourceType: "bureau_client_request", sourceId: request.requestId, ownerCompanyUserId: request.ownerConsultantId, deadlineAt: request.deadlineAt, blockerScope: request.blockerScope, status: "waiting_external", actorId: principal.userId, correlationId, reasonCode: "request_sent" });
    audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.request.sent", entityType: "bureau_client_request", entityId: request.requestId, explanation: `Sent request ${request.requestId}.` });
    return clone(request);
  }

  function submitClientResponse({ requestId, responseAccessCode, respondedByContactId, responseType = "documents_delivered", comment = null, attachments = [] } = {}) {
    evaluateDeadlines();
    const request = requireRequest(requestId);
    if (!["sent", "overdue", "escalated"].includes(request.status)) {
      throw error(409, "client_request_response_invalid_state", "Client response is not allowed in the current state.");
    }
    if (request.responseAccessCode !== text(responseAccessCode, "client_request_access_code_required")) {
      throw error(403, "client_request_access_denied", "Response access code was invalid.");
    }
    if (text(respondedByContactId, "client_request_response_contact_required") !== request.requestedFromContactId) {
      throw error(403, "client_request_contact_mismatch", "Response contact does not match the request.");
    }
    const resolvedResponseType = text(responseType, "client_request_response_type_required");
    request.status = statusForClientResponseType(resolvedResponseType);
    request.responses.push({ responseId: crypto.randomUUID(), responseType: resolvedResponseType, respondedByContactId, comment: norm(comment), attachments: normalizeAttachments(attachments), respondedAt: now() });
    request.updatedAt = now();
    transitionWorkItem("bureau_client_request", request.requestId, request.status === "delivered" ? "resolved" : "waiting_external", "client", "client_response_received");
    audit({ companyId: request.bureauOrgId, actorId: "client", correlationId: `response:${request.requestId}`, action: "bureau.request.responded", entityType: "bureau_client_request", entityId: request.requestId, explanation: `Received client material for ${request.requestId}.` });
    return clone(request);
  }

  function acceptClientRequest({ sessionToken, bureauOrgId, requestId, correlationId = crypto.randomUUID() } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const request = requireRequest(requestId);
    assertVisible(principal, request.portfolioId);
    if (request.status !== "delivered") {
      throw error(409, "client_request_accept_invalid_state", "Only delivered requests can be accepted.");
    }
    request.status = "accepted";
    request.updatedAt = now();
    transitionWorkItem("bureau_client_request", request.requestId, "closed", principal.userId, "request_accepted");
    audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.request.accepted", entityType: "bureau_client_request", entityId: request.requestId, explanation: `Accepted request ${request.requestId}.` });
    return clone(request);
  }

  function createApprovalPackage({ sessionToken, bureauOrgId, clientCompanyId, periodId = null, approvalType = "period_close", snapshotRef, targetDate = null, approvalDeadlineAt = null, namedApproverContactId, namedApproverContact = null, requiresNamedApprover = true, attachments = [], correlationId = crypto.randomUUID() } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const portfolio = requireVisiblePortfolio(principal, bureauOrgId, clientCompanyId);
    const deadline = deriveDeadline({ clientCompanyId, blockerScope: "reporting", targetDate, deadlineAt: approvalDeadlineAt, purpose: "approval" });
    const normalizedSnapshot = snapshotRefPayload(snapshotRef);
    validateSnapshotRef(normalizedSnapshot, clientCompanyId);
    const approval = {
      approvalPackageId: crypto.randomUUID(),
      bureauOrgId,
      portfolioId: portfolio.portfolioId,
      clientCompanyId,
      periodId: norm(periodId),
      approvalType: text(approvalType, "approval_type_required"),
      snapshotRef: normalizedSnapshot,
      approvalDeadlineAt: deadline.deadlineAt,
      deadlineBasis: deadline.deadlineBasis,
      namedApproverContactId: text(namedApproverContactId, "approval_named_approver_required"),
      namedApproverContact: contact(namedApproverContact, namedApproverContactId),
      requiresNamedApprover: requiresNamedApprover !== false,
      attachments: normalizeAttachments(attachments),
      responseAccessCode: null,
      responses: [],
      status: "prepared",
      createdAt: now(),
      updatedAt: now()
    };
    state.approvals.set(approval.approvalPackageId, approval);
    audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.approval.created", entityType: "bureau_approval_package", entityId: approval.approvalPackageId, explanation: `Prepared approval package ${approval.approvalPackageId}.` });
    return clone(approval);
  }

  function listApprovalPackages({ sessionToken, bureauOrgId, clientCompanyId = null, status = null } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    evaluateDeadlines();
    const statusFilter = norm(status);
    return [...state.approvals.values()]
      .filter((approval) => approval.bureauOrgId === bureauOrgId)
      .filter((approval) => !clientCompanyId || approval.clientCompanyId === clientCompanyId)
      .filter((approval) => canSeePortfolio(principal, requirePortfolio(approval.portfolioId)))
      .filter((approval) => !statusFilter || approval.status === statusFilter)
      .sort((a, b) => a.approvalDeadlineAt.localeCompare(b.approvalDeadlineAt))
      .map(clone);
  }

  function sendApprovalPackage({ sessionToken, bureauOrgId, approvalPackageId, correlationId = crypto.randomUUID() } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const approval = requireApproval(approvalPackageId);
    assertVisible(principal, approval.portfolioId);
    if (approval.status !== "prepared") {
      throw error(409, "approval_package_send_invalid_state", "Only prepared packages can be sent.");
    }
    for (const candidate of state.approvals.values()) {
      if (candidate.approvalPackageId !== approval.approvalPackageId && candidate.clientCompanyId === approval.clientCompanyId && candidate.approvalType === approval.approvalType && candidate.periodId === approval.periodId && candidate.status !== "superseded" && candidate.snapshotRef.snapshotHash !== approval.snapshotRef.snapshotHash) {
        const previousStatus = candidate.status;
        candidate.status = "superseded";
        candidate.updatedAt = now();
        transitionWorkItem("bureau_approval_package", candidate.approvalPackageId, "closed", principal.userId, "approval_superseded");
        audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.approval.superseded", entityType: "bureau_approval_package", entityId: candidate.approvalPackageId, explanation: `Superseded approval package ${candidate.approvalPackageId} from ${previousStatus}.` });
      }
    }
    approval.status = "sent_for_approval";
    approval.responseAccessCode = approval.responseAccessCode || accessCode();
    approval.updatedAt = now();
    upsertWorkItem({ bureauOrgId, portfolioId: approval.portfolioId, clientCompanyId: approval.clientCompanyId, sourceType: "bureau_approval_package", sourceId: approval.approvalPackageId, ownerCompanyUserId: requirePortfolio(approval.portfolioId).responsibleConsultantId, deadlineAt: approval.approvalDeadlineAt, blockerScope: "reporting", status: "waiting_external", actorId: principal.userId, correlationId, reasonCode: "approval_sent" });
    audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.approval.sent", entityType: "bureau_approval_package", entityId: approval.approvalPackageId, explanation: `Sent approval package ${approval.approvalPackageId}.` });
    return clone(approval);
  }

  function recordApprovalResponse({ approvalPackageId, responseAccessCode, respondedByContactId, responseType, comment = null, attachments = [], delegatedFromContactId = null } = {}) {
    evaluateDeadlines();
    const approval = requireApproval(approvalPackageId);
    if (approval.status !== "sent_for_approval") {
      throw error(409, "approval_response_invalid_state", "Approval response is not allowed in the current state.");
    }
    if (approval.responseAccessCode !== text(responseAccessCode, "approval_access_code_required")) {
      throw error(403, "approval_access_denied", "Approval access code was invalid.");
    }
    const responder = text(respondedByContactId, "approval_response_contact_required");
    if (approval.requiresNamedApprover && responder !== approval.namedApproverContactId && norm(delegatedFromContactId) !== approval.namedApproverContactId) {
      throw error(403, "approver_mismatch", "Approval response did not come from the named approver.");
    }
    const resolvedType = text(responseType, "approval_response_type_required");
    approval.responses.push({ approvalResponseId: crypto.randomUUID(), responseType: resolvedType, respondedByContactId: responder, delegatedFromContactId: norm(delegatedFromContactId), comment: norm(comment), attachments: normalizeAttachments(attachments), respondedAt: now() });
    approval.status = statusForApprovalResponseType(resolvedType);
    approval.updatedAt = now();
    transitionWorkItem(
      "bureau_approval_package",
      approval.approvalPackageId,
      approval.status === "approved" ? "closed" : approval.status === "viewed" ? "waiting_external" : "resolved",
      "client",
      approval.status === "approved" ? "approval_granted" : approval.status === "viewed" ? "approval_viewed" : "approval_rejected"
    );
    audit({ companyId: approval.bureauOrgId, actorId: "client", correlationId: `approval:${approval.approvalPackageId}`, action: "bureau.approval.responded", entityType: "bureau_approval_package", entityId: approval.approvalPackageId, explanation: `Recorded ${resolvedType} on approval package ${approval.approvalPackageId}.` });
    return clone(approval);
  }

  function runPortfolioMassAction({ sessionToken, bureauOrgId, actionType, clientCompanyIds, newResponsibleConsultantId = null, correlationId = crypto.randomUUID() } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.manage");
    const targets = uniq(clientCompanyIds, "portfolio_mass_action_clients_required");
    const resolvedAction = text(actionType, "portfolio_mass_action_type_required");
    const results = [];
    for (const clientCompanyId of targets) {
      const portfolio = [...state.portfolios.values()].find((candidate) => candidate.bureauOrgId === bureauOrgId && candidate.clientCompanyId === clientCompanyId);
      if (!portfolio) {
        results.push({ clientCompanyId, status: "failed", message: "portfolio_membership_not_found" });
        continue;
      }
      if (resolvedAction === "send_reminder") {
        const reminderCount = [...state.requests.values()].filter((request) => request.portfolioId === portfolio.portfolioId && ["sent", "overdue", "escalated"].includes(request.status)).length + [...state.approvals.values()].filter((approval) => approval.portfolioId === portfolio.portfolioId && approval.status === "sent_for_approval").length;
        audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.mass_action.reminder", entityType: "portfolio_membership", entityId: portfolio.portfolioId, explanation: `Sent ${reminderCount} reminders for client ${clientCompanyId}.` });
        results.push({ clientCompanyId, status: reminderCount > 0 ? "success" : "no_action", reminderCount });
        continue;
      }
      if (resolvedAction === "reassign_owner") {
        requireBureauUser(bureauOrgId, newResponsibleConsultantId);
        portfolio.responsibleConsultantId = newResponsibleConsultantId;
        portfolio.updatedAt = now();
        results.push({ clientCompanyId, status: "success", responsibleConsultantId: newResponsibleConsultantId });
        audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "bureau.mass_action.reassign_owner", entityType: "portfolio_membership", entityId: portfolio.portfolioId, explanation: `Reassigned ${clientCompanyId} to ${newResponsibleConsultantId}.` });
        continue;
      }
      throw error(400, "portfolio_mass_action_type_invalid", "Mass action type is not supported.");
    }
    return { massActionId: crypto.randomUUID(), bureauOrgId, actionType: resolvedAction, results };
  }

  function listWorkItems({ sessionToken, bureauOrgId, clientCompanyId = null, ownerCompanyUserId = null, status = null } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    evaluateDeadlines();
    const statusFilter = norm(status);
    return [...state.workItems.values()]
      .filter((workItem) => workItem.bureauOrgId === bureauOrgId)
      .filter((workItem) => canSeePortfolio(principal, requirePortfolio(workItem.portfolioId)))
      .filter((workItem) => !clientCompanyId || workItem.clientCompanyId === clientCompanyId)
      .filter((workItem) => !ownerCompanyUserId || workItem.ownerCompanyUserId === ownerCompanyUserId)
      .filter((workItem) => !statusFilter || workItem.status === statusFilter)
      .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt))
      .map(clone);
  }

  function claimWorkItem({
    sessionToken,
    bureauOrgId,
    workItemId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const workItem = requireScopedWorkItem(bureauOrgId, workItemId);
    assertVisible(principal, workItem.portfolioId);
    if (["resolved", "closed"].includes(workItem.status)) {
      throw error(409, "work_item_not_claimable", "Resolved work items cannot be claimed.");
    }
    const previousStatus = workItem.status;
    workItem.ownerCompanyUserId = principal.companyUserId;
    workItem.claimedAt = now();
    workItem.claimedByCompanyUserId = principal.companyUserId;
    if (workItem.status !== "acknowledged") {
      workItem.status = "acknowledged";
      workItem.statusHistory.push({
        fromStatus: previousStatus,
        toStatus: workItem.status,
        actorId: principal.userId,
        reasonCode: "claimed",
        changedAt: workItem.claimedAt
      });
    }
    workItem.updatedAt = workItem.claimedAt;
    audit({
      companyId: bureauOrgId,
      actorId: principal.userId,
      correlationId,
      action: "core.work_item.claimed",
      entityType: "core_work_item",
      entityId: workItem.workItemId,
      explanation: `Claimed work item ${workItem.workItemId}.`
    });
    return clone(workItem);
  }

  function resolveWorkItem({
    sessionToken,
    bureauOrgId,
    workItemId,
    resolutionCode,
    completionNote = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const workItem = requireScopedWorkItem(bureauOrgId, workItemId);
    assertVisible(principal, workItem.portfolioId);
    if (workItem.status === "closed") {
      throw error(409, "work_item_already_closed", "Closed work items cannot be resolved again.");
    }
    if (workItem.status !== "resolved") {
      const resolvedAt = now();
      workItem.statusHistory.push({
        fromStatus: workItem.status,
        toStatus: "resolved",
        actorId: principal.userId,
        reasonCode: text(resolutionCode, "work_item_resolution_code_required"),
        changedAt: resolvedAt
      });
      workItem.status = "resolved";
      workItem.resolutionCode = text(resolutionCode, "work_item_resolution_code_required");
      workItem.completionNote = norm(completionNote);
      workItem.resolvedAt = resolvedAt;
      workItem.resolvedByCompanyUserId = principal.companyUserId;
      workItem.updatedAt = resolvedAt;
      audit({
        companyId: bureauOrgId,
        actorId: principal.userId,
        correlationId,
        action: "core.work_item.resolved",
        entityType: "core_work_item",
        entityId: workItem.workItemId,
        explanation: `Resolved work item ${workItem.workItemId} with ${workItem.resolutionCode}.`
      });
    }
    return clone(workItem);
  }

  function listOperationalWorkItems({
    sessionToken,
    companyId,
    queueCode = null,
    ownerTeamId = null,
    ownerCompanyUserId = null,
    status = null,
    sourceType = null
  } = {}) {
    authorizeCompany(sessionToken, companyId, "company.read");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const statusFilter = norm(status);
    const queueFilter = norm(queueCode);
    const ownerTeamFilter = norm(ownerTeamId);
    const ownerFilter = norm(ownerCompanyUserId);
    const sourceFilter = norm(sourceType);
    return [...state.operationalWorkItems.values()]
      .filter((workItem) => workItem.companyId === resolvedCompanyId)
      .filter((workItem) => !queueFilter || workItem.queueCode === queueFilter)
      .filter((workItem) => !ownerTeamFilter || workItem.ownerTeamId === ownerTeamFilter)
      .filter((workItem) => !ownerFilter || workItem.ownerCompanyUserId === ownerFilter)
      .filter((workItem) => !statusFilter || workItem.status === statusFilter)
      .filter((workItem) => !sourceFilter || workItem.sourceType === sourceFilter)
      .sort((left, right) => left.deadlineAt.localeCompare(right.deadlineAt) || left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function claimOperationalWorkItem({
    sessionToken,
    companyId,
    workItemId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorizeCompany(sessionToken, companyId, "company.manage");
    const workItem = requireOperationalWorkItem(companyId, workItemId);
    if (["resolved", "closed"].includes(workItem.status)) {
      throw error(409, "operational_work_item_not_claimable", "Resolved operational work items cannot be claimed.");
    }
    const previousStatus = workItem.status;
    const claimedAt = now();
    workItem.ownerCompanyUserId = principal.companyUserId;
    workItem.claimedAt = claimedAt;
    workItem.claimedByCompanyUserId = principal.companyUserId;
    if (workItem.status !== "acknowledged") {
      workItem.status = "acknowledged";
      workItem.statusHistory.push({
        fromStatus: previousStatus,
        toStatus: workItem.status,
        actorId: principal.userId,
        reasonCode: "claimed",
        changedAt: claimedAt
      });
    }
    workItem.updatedAt = claimedAt;
    audit({
      companyId,
      actorId: principal.userId,
      correlationId,
      action: "core.operational_work_item.claimed",
      entityType: "operational_work_item",
      entityId: workItem.workItemId,
      explanation: `Claimed operational work item ${workItem.workItemId}.`
    });
    return clone(workItem);
  }

  function resolveOperationalWorkItem({
    sessionToken,
    companyId,
    workItemId,
    resolutionCode,
    completionNote = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const principal = authorizeCompany(sessionToken, companyId, "company.manage");
    const workItem = requireOperationalWorkItem(companyId, workItemId);
    if (workItem.status === "closed") {
      throw error(409, "operational_work_item_already_closed", "Closed operational work items cannot be resolved again.");
    }
    if (workItem.status !== "resolved") {
      const resolvedAt = now();
      workItem.statusHistory.push({
        fromStatus: workItem.status,
        toStatus: "resolved",
        actorId: principal.userId,
        reasonCode: text(resolutionCode, "operational_work_item_resolution_code_required"),
        changedAt: resolvedAt
      });
      workItem.status = "resolved";
      workItem.resolutionCode = text(resolutionCode, "operational_work_item_resolution_code_required");
      workItem.completionNote = norm(completionNote);
      workItem.resolvedAt = resolvedAt;
      workItem.resolvedByCompanyUserId = principal.companyUserId;
      workItem.updatedAt = resolvedAt;
      audit({
        companyId,
        actorId: principal.userId,
        correlationId,
        action: "core.operational_work_item.resolved",
        entityType: "operational_work_item",
        entityId: workItem.workItemId,
        explanation: `Resolved operational work item ${workItem.workItemId} with ${workItem.resolutionCode}.`
      });
    }
    return clone(workItem);
  }

  function createComment({ sessionToken, bureauOrgId, objectType, objectId, visibility = "internal", body, mentionCompanyUserIds = [], createAssignment = false, correlationId = crypto.randomUUID() } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const portfolioId = resolvePortfolioId(objectType, objectId);
    assertVisible(principal, portfolioId);
    const resolvedVisibility = text(visibility, "comment_visibility_required");
    if (!COMMENT_VISIBILITY_CODES.includes(resolvedVisibility)) {
      throw error(400, "comment_visibility_invalid", "Comment visibility is not supported.");
    }
    if (resolvedVisibility === "external_shared" && !["bureau_client_request", "bureau_approval_package"].includes(text(objectType, "comment_object_type_required"))) {
      throw error(400, "comment_visibility_not_allowed", "External comments are only allowed on requests and approval packages.");
    }
    const mentions = Array.isArray(mentionCompanyUserIds) ? [...new Set(mentionCompanyUserIds.filter(Boolean))] : [];
    for (const companyUserId of mentions) {
      requireBureauUser(bureauOrgId, companyUserId);
    }
    const comment = { commentId: crypto.randomUUID(), objectType: text(objectType, "comment_object_type_required"), objectId: text(objectId, "comment_object_id_required"), portfolioId, clientCompanyId: resolveClientCompanyId(objectType, objectId), visibility: resolvedVisibility, authorUserId: principal.userId, body: text(body, "comment_body_required"), mentions, createdAt: now() };
    state.comments.set(comment.commentId, comment);
    if (createAssignment && mentions.length > 0) {
      upsertWorkItem({ bureauOrgId, portfolioId, clientCompanyId: comment.clientCompanyId, sourceType: "core_comment", sourceId: comment.commentId, ownerCompanyUserId: mentions[0], deadlineAt: now(), blockerScope: "none", status: "open", actorId: principal.userId, correlationId, reasonCode: "comment_assignment" });
    }
    audit({ companyId: bureauOrgId, actorId: principal.userId, correlationId, action: "core.comment.created", entityType: "core_comment", entityId: comment.commentId, explanation: `Created comment ${comment.commentId} on ${comment.objectType}:${comment.objectId}.` });
    return clone(comment);
  }

  function listComments({ sessionToken, bureauOrgId, objectType, objectId } = {}) {
    const principal = authorize(sessionToken, bureauOrgId, "company.read");
    const portfolioId = resolvePortfolioId(objectType, objectId);
    assertVisible(principal, portfolioId);
    return [...state.comments.values()].filter((comment) => comment.objectType === objectType && comment.objectId === objectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(clone);
  }

  function runClientRequestReminderJob({ bureauOrgId = null } = {}) {
    evaluateDeadlines({ bureauOrgId });
    const items = [...state.requests.values()].filter(
      (request) =>
        (!bureauOrgId || request.bureauOrgId === bureauOrgId)
        && ["sent", "overdue", "escalated"].includes(request.status)
    );
    return {
      reminderJobId: crypto.randomUUID(),
      bureauOrgId: norm(bureauOrgId),
      reminderCount: items.length,
      requestIds: items.map((item) => item.requestId)
    };
  }

  function runClientRequestEscalationJob({ bureauOrgId = null } = {}) {
    const changedRequestIds = evaluateDeadlines({ bureauOrgId });
    return {
      escalationJobId: crypto.randomUUID(),
      bureauOrgId: norm(bureauOrgId),
      escalatedCount: changedRequestIds.length,
      requestIds: changedRequestIds
    };
  }

  function runPortfolioStatusRecomputeJob({ bureauOrgId } = {}) {
    if (bureauOrgId) {
      return [...state.portfolios.values()]
        .filter((portfolio) => portfolio.bureauOrgId === bureauOrgId)
        .map(materializePortfolio);
    }
    return [...state.portfolios.values()].map(materializePortfolio);
  }

  function evaluateDeadlines({ bureauOrgId = null } = {}) {
    const changedRequestIds = [];
    for (const request of state.requests.values()) {
      if (bureauOrgId && request.bureauOrgId !== bureauOrgId) {
        continue;
      }
      if (request.status !== "sent") {
        continue;
      }
      if (new Date(now()) > new Date(addBusinessDays(request.deadlineAt, 1)) && request.blockerScope !== "none") {
        request.status = "escalated";
        request.updatedAt = now();
        transitionWorkItem("bureau_client_request", request.requestId, "escalated", "system", "deadline_escalated");
        changedRequestIds.push(request.requestId);
      } else if (new Date(now()) > new Date(request.deadlineAt)) {
        request.status = "overdue";
        request.updatedAt = now();
        transitionWorkItem("bureau_client_request", request.requestId, "escalated", "system", "deadline_overdue");
        changedRequestIds.push(request.requestId);
      }
    }
    return changedRequestIds;
  }

  function upsertWorkItem({ bureauOrgId, portfolioId, clientCompanyId, sourceType, sourceId, ownerCompanyUserId, deadlineAt, blockerScope, status, actorId, correlationId, reasonCode }) {
    const sourceKey = `${sourceType}:${sourceId}`;
    const existing = [...state.workItems.values()].find((workItem) => workItem.sourceKey === sourceKey);
    if (existing) {
      existing.ownerCompanyUserId = ownerCompanyUserId;
      existing.deadlineAt = deadlineAt;
      existing.blockerScope = blockerScope;
      existing.status = status;
      existing.updatedAt = now();
      return clone(existing);
    }
    const workItem = { workItemId: crypto.randomUUID(), bureauOrgId, portfolioId, clientCompanyId, sourceType, sourceId, sourceKey, ownerCompanyUserId, deadlineAt, blockerScope, status, createdAt: now(), updatedAt: now(), statusHistory: [{ fromStatus: null, toStatus: status, actorId, reasonCode, changedAt: now() }] };
    state.workItems.set(workItem.workItemId, workItem);
    audit({ companyId: bureauOrgId, actorId, correlationId, action: "core.work_item.created", entityType: "core_work_item", entityId: workItem.workItemId, explanation: `Created work item ${workItem.workItemId} for ${sourceKey}.` });
    return clone(workItem);
  }

  function upsertOperationalWorkItem({
    companyId,
    queueCode,
    ownerTeamId = null,
    ownerCompanyUserId = null,
    sourceType,
    sourceId,
    title,
    summary = null,
    priority = "medium",
    deadlineAt,
    blockerScope = "none",
    status = "open",
    escalationPolicyCode = null,
    metadata = {},
    actorId = "system",
    correlationId = crypto.randomUUID(),
    reasonCode = "operational_escalation"
  } = {}) {
    const statusProvided = arguments.length > 0
      && arguments[0] != null
      && Object.prototype.hasOwnProperty.call(arguments[0], "status");
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedSourceType = text(sourceType, "operational_work_item_source_type_required");
    const resolvedSourceId = text(sourceId, "operational_work_item_source_id_required");
    const resolvedSourceKey = `${resolvedCompanyId}:${resolvedSourceType}:${resolvedSourceId}`;
    const resolvedDeadlineAt = timestamp(deadlineAt, "operational_work_item_deadline_invalid");
    const resolvedPriority = assertAllowed(norm(priority), OPERATIONAL_WORK_ITEM_PRIORITIES, "operational_work_item_priority_invalid");
    const resolvedStatus = text(status, "operational_work_item_status_required");
    const existing = [...state.operationalWorkItems.values()].find((workItem) => workItem.sourceKey === resolvedSourceKey);
    if (existing) {
      const previousStatus = existing.status;
      existing.queueCode = text(queueCode, "operational_work_item_queue_code_required");
      existing.ownerTeamId = norm(ownerTeamId);
      existing.ownerCompanyUserId = norm(ownerCompanyUserId);
      existing.title = text(title, "operational_work_item_title_required");
      existing.summary = norm(summary);
      existing.priority = resolvedPriority;
      existing.deadlineAt = resolvedDeadlineAt;
      existing.blockerScope = text(blockerScope, "operational_work_item_blocker_scope_required");
      existing.escalationPolicyCode = norm(escalationPolicyCode);
      existing.metadataJson = clone(metadata || {});
      const updatedAt = now();
      const shouldReopenClosedItem = !statusProvided && ["resolved", "closed"].includes(existing.status);
      if (statusProvided || shouldReopenClosedItem) {
        const nextStatus = shouldReopenClosedItem ? "open" : resolvedStatus;
        if (previousStatus !== nextStatus) {
          existing.statusHistory.push({
            fromStatus: previousStatus,
            toStatus: nextStatus,
            actorId: text(actorId, "actor_id_required"),
            reasonCode,
            changedAt: updatedAt
          });
          existing.status = nextStatus;
        }
        if (!["resolved", "closed"].includes(existing.status)) {
          existing.resolvedAt = null;
          existing.resolvedByCompanyUserId = null;
          existing.resolutionCode = null;
          existing.completionNote = null;
          if (existing.status === "open") {
            existing.claimedAt = null;
            existing.claimedByCompanyUserId = null;
            existing.ownerCompanyUserId = norm(ownerCompanyUserId);
          }
        }
      }
      existing.updatedAt = updatedAt;
      return clone(existing);
    }
    const createdAt = now();
    const workItem = {
      workItemId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      queueCode: text(queueCode, "operational_work_item_queue_code_required"),
      ownerTeamId: norm(ownerTeamId),
      ownerCompanyUserId: norm(ownerCompanyUserId),
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      sourceKey: resolvedSourceKey,
      title: text(title, "operational_work_item_title_required"),
      summary: norm(summary),
      priority: resolvedPriority,
      deadlineAt: resolvedDeadlineAt,
      blockerScope: text(blockerScope, "operational_work_item_blocker_scope_required"),
      status: resolvedStatus,
      escalationPolicyCode: norm(escalationPolicyCode),
      claimedAt: null,
      claimedByCompanyUserId: null,
      resolvedAt: null,
      resolvedByCompanyUserId: null,
      resolutionCode: null,
      completionNote: null,
      createdByActorId: text(actorId, "actor_id_required"),
      createdAt,
      updatedAt: createdAt,
      metadataJson: clone(metadata || {}),
      statusHistory: [{ fromStatus: null, toStatus: resolvedStatus, actorId: text(actorId, "actor_id_required"), reasonCode, changedAt: createdAt }]
    };
    state.operationalWorkItems.set(workItem.workItemId, workItem);
    audit({
      companyId: resolvedCompanyId,
      actorId: text(actorId, "actor_id_required"),
      correlationId,
      action: "core.operational_work_item.created",
      entityType: "operational_work_item",
      entityId: workItem.workItemId,
      explanation: `Created operational work item ${workItem.workItemId} for ${resolvedSourceType}:${resolvedSourceId}.`
    });
    return clone(workItem);
  }

  function transitionWorkItem(sourceType, sourceId, nextStatus, actorId, reasonCode) {
    const workItem = [...state.workItems.values()].find((candidate) => candidate.sourceKey === `${sourceType}:${sourceId}`);
    if (!workItem || workItem.status === nextStatus) {
      return;
    }
    const previousStatus = workItem.status;
    workItem.status = nextStatus;
    workItem.updatedAt = now();
    workItem.statusHistory.push({ fromStatus: previousStatus, toStatus: nextStatus, actorId, reasonCode, changedAt: now() });
  }

  function requireScopedWorkItem(bureauOrgId, workItemId) {
    const workItem = state.workItems.get(text(workItemId, "work_item_id_required"));
    if (!workItem || workItem.bureauOrgId !== bureauOrgId) {
      throw error(404, "work_item_not_found", "Work item was not found.");
    }
    return workItem;
  }

  function requireOperationalWorkItem(companyId, workItemId) {
    const workItem = state.operationalWorkItems.get(text(workItemId, "operational_work_item_id_required"));
    if (!workItem || workItem.companyId !== text(companyId, "company_id_required")) {
      throw error(404, "operational_work_item_not_found", "Operational work item was not found.");
    }
    return workItem;
  }

  function deriveDeadline({ clientCompanyId, blockerScope, targetDate, deadlineAt, purpose }) {
    if (deadlineAt) {
      return { deadlineAt: timestamp(deadlineAt, "client_deadline_invalid"), deadlineBasis: { basisType: "explicit_deadline", basisValue: timestamp(deadlineAt, "client_deadline_invalid") } };
    }
    const target = dateOnly(targetDate, "client_target_date_required");
    const settings = requireCompany(clientCompanyId).settingsJson?.bureauDelivery || {};
    const key = purpose === "approval" ? "approvalLeadBusinessDays" : blockerScope === "close" ? "closeLeadBusinessDays" : blockerScope === "reporting" ? "reportingLeadBusinessDays" : blockerScope === "submission" ? "submissionLeadBusinessDays" : "generalLeadBusinessDays";
    const leadDays = Number(settings[key]);
    if (!Number.isInteger(leadDays) || leadDays <= 0) {
      throw error(400, "client_deadline_settings_missing", `Company settings are missing a positive ${key} value.`);
    }
    return { deadlineAt: `${subtractBusinessDays(target, leadDays)}T09:00:00.000Z`, deadlineBasis: { basisType: key, basisValue: target, bufferBusinessDays: leadDays } };
  }

  function reminderProfileFor(clientCompanyId) {
    return norm(requireCompany(clientCompanyId).settingsJson?.bureauDelivery?.reminderProfile) || "standard";
  }

  function resolvePortfolioId(objectType, objectId) {
    const resolvedType = text(objectType, "comment_object_type_required");
    if (resolvedType === "portfolio_membership") {
      return requirePortfolio(objectId).portfolioId;
    }
    if (resolvedType === "bureau_client_request") {
      return requireRequest(objectId).portfolioId;
    }
      if (resolvedType === "bureau_approval_package") {
        return requireApproval(objectId).portfolioId;
      }
      if (resolvedType === "close_checklist") {
        return requireCloseChecklist(objectId).portfolioId;
      }
      if (resolvedType === "close_checklist_step") {
        return requireCloseChecklist(requireCloseStep(objectId).checklistId).portfolioId;
      }
      if (resolvedType === "close_blocker") {
        return requireCloseChecklist(requireCloseBlocker(objectId).checklistId).portfolioId;
      }
      if (resolvedType === "close_reopen_request") {
        return requireCloseChecklist(requireCloseReopenRequest(objectId).checklistId).portfolioId;
      }
      if (resolvedType === "core_work_item") {
        return requireWorkItem(objectId).portfolioId;
      }
    throw error(400, "comment_object_type_invalid", "Comment object type is not supported.");
  }

  function resolveClientCompanyId(objectType, objectId) {
    const resolvedType = text(objectType, "comment_object_type_required");
    if (resolvedType === "portfolio_membership") {
      return requirePortfolio(objectId).clientCompanyId;
    }
    if (resolvedType === "bureau_client_request") {
      return requireRequest(objectId).clientCompanyId;
    }
      if (resolvedType === "bureau_approval_package") {
        return requireApproval(objectId).clientCompanyId;
      }
      if (resolvedType === "close_checklist") {
        return requireCloseChecklist(objectId).clientCompanyId;
      }
      if (resolvedType === "close_checklist_step") {
        return requireCloseChecklist(requireCloseStep(objectId).checklistId).clientCompanyId;
      }
      if (resolvedType === "close_blocker") {
        return requireCloseChecklist(requireCloseBlocker(objectId).checklistId).clientCompanyId;
      }
      if (resolvedType === "close_reopen_request") {
        return requireCloseChecklist(requireCloseReopenRequest(objectId).checklistId).clientCompanyId;
      }
      if (resolvedType === "core_work_item") {
        return requireWorkItem(objectId).clientCompanyId;
      }
    throw error(400, "comment_object_type_invalid", "Comment object type is not supported.");
  }

  function requireRequest(requestId) {
    const request = state.requests.get(requestId);
    if (!request) {
      throw error(404, "client_request_not_found", "Client request was not found.");
    }
    return request;
  }

  function requireApproval(approvalPackageId) {
    const approval = state.approvals.get(approvalPackageId);
    if (!approval) {
      throw error(404, "approval_package_not_found", "Approval package was not found.");
    }
    return approval;
  }

    function requireWorkItem(workItemId) {
      const workItem = state.workItems.get(workItemId);
    if (!workItem) {
      throw error(404, "work_item_not_found", "Work item was not found.");
    }
      return workItem;
    }

    function requireCloseChecklist(checklistId) {
      const checklist = state.closeChecklists.get(checklistId);
      if (!checklist) {
        throw error(404, "close_checklist_not_found", "Close checklist was not found.");
      }
      return checklist;
    }

    function requireCloseStep(stepId) {
      for (const checklist of state.closeChecklists.values()) {
        const step = (checklist.steps || []).find((candidate) => candidate.stepId === stepId);
        if (step) {
          return step;
        }
      }
      throw error(404, "close_step_not_found", "Close checklist step was not found.");
    }

    function requireCloseBlocker(blockerId) {
      const blocker = state.closeBlockers.get(blockerId);
      if (!blocker) {
        throw error(404, "close_blocker_not_found", "Close blocker was not found.");
      }
      return blocker;
    }

    function requireCloseReopenRequest(reopenRequestId) {
      const reopenRequest = state.closeReopenRequests.get(reopenRequestId);
      if (!reopenRequest) {
        throw error(404, "close_reopen_request_not_found", "Close reopen request was not found.");
      }
      return reopenRequest;
    }

  function validateSnapshotRef(snapshotRef, clientCompanyId) {
    if (!reportingPlatform || snapshotRef.snapshotType !== "report_snapshot") {
      return;
    }
    reportingPlatform.getReportSnapshot({ companyId: clientCompanyId, reportSnapshotId: snapshotRef.reportSnapshotId });
  }

  function snapshot() {
    return clone({
      portfolios: [...state.portfolios.values()],
      requests: [...state.requests.values()],
        approvals: [...state.approvals.values()],
        workItems: [...state.workItems.values()],
        operationalWorkItems: [...state.operationalWorkItems.values()],
        comments: [...state.comments.values()],
        closeChecklists: [...state.closeChecklists.values()],
        closeBlockers: [...state.closeBlockers.values()],
        closeSignoffs: [...state.closeSignoffs.values()],
        closeReopenRequests: [...state.closeReopenRequests.values()],
        supportCases: [...state.supportCases.values()],
        impersonationSessions: [...state.impersonationSessions.values()],
        accessReviewBatches: [...state.accessReviewBatches.values()],
        adminDiagnostics: [...state.adminDiagnostics.values()],
        breakGlassSessions: [...state.breakGlassSessions.values()],
        featureFlags: [...state.featureFlags.values()],
        emergencyDisables: [...state.emergencyDisables.values()],
        loadProfiles: [...state.loadProfiles.values()],
        restoreDrills: [...state.restoreDrills.values()],
        chaosScenarios: [...state.chaosScenarios.values()],
        runtimeIncidents: [...state.runtimeIncidents.values()],
        runtimeIncidentEvents: [...state.runtimeIncidentEvents.values()],
        runtimeIncidentPostReviews: [...state.runtimeIncidentPostReviews.values()],
        runtimeRestorePlans: [...state.runtimeRestorePlans.values()],
        mappingSets: [...state.mappingSets.values()],
          importBatches: [...state.importBatches.values()],
          migrationCorrections: [...state.migrationCorrections.values()],
          diffReports: [...state.diffReports.values()],
          cutoverPlans: [...state.cutoverPlans.values()],
          migrationAcceptanceRecords: [...state.migrationAcceptanceRecords.values()],
          postCutoverCorrectionCases: [...state.postCutoverCorrectionCases.values()],
          payrollMigrationBatches: [...state.payrollMigrationBatches.values()],
          employeeMigrationRecords: [...state.employeeMigrationRecords.values()],
          balanceBaselines: [...state.balanceBaselines.values()],
          payrollMigrationDiffs: [...state.payrollMigrationDiffs.values()],
          payrollMigrationApprovals: [...state.payrollMigrationApprovals.values()],
          auditEvents: [...state.auditEvents]
        });
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function snapshotRefPayload(value) {
  if (!value || typeof value !== "object") {
    throw error(400, "approval_snapshot_ref_required", "Approval package requires a snapshot reference.");
  }
  return {
    snapshotType: text(value.snapshotType || "report_snapshot", "approval_snapshot_type_required"),
    reportSnapshotId: text(value.reportSnapshotId, "approval_snapshot_id_required"),
    snapshotHash: text(value.snapshotHash || value.reportSnapshotId, "approval_snapshot_hash_required")
  };
}

function projectCompanyUser(companyUser) {
  return {
    companyUserId: companyUser.companyUserId,
    userId: companyUser.userId,
    roleCode: companyUser.roleCode,
    displayName: companyUser.user?.displayName || companyUser.userId,
    email: companyUser.user?.email || null
  };
}

function contact(value, contactId) {
  const normalized = value && typeof value === "object" ? value : {};
  return {
    contactId: text(contactId, "contact_id_required"),
    displayName: norm(normalized.displayName) || contactId,
    email: norm(normalized.email),
    phone: norm(normalized.phone)
  };
}

function normalizeAttachments(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value, index) => ({
    attachmentId: norm(value?.attachmentId) || crypto.randomUUID(),
    name: norm(value?.name) || `attachment_${index + 1}`,
    documentId: norm(value?.documentId),
    storageKey: norm(value?.storageKey),
    categoryCode: norm(value?.categoryCode)
  }));
}

function uniq(values, code) {
  if (!Array.isArray(values) || values.length === 0) {
    throw error(400, code, "At least one value is required.");
  }
  return [...new Set(values.map((value) => text(value, code)))];
}

function assertAllowed(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw error(400, code, `${code} is invalid.`);
  }
  return value;
}

function addBusinessDays(value, amount) {
  const date = new Date(typeof value === "string" && value.includes("T") ? value : `${String(value).slice(0, 10)}T09:00:00.000Z`);
  let remaining = amount;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (![0, 6].includes(date.getUTCDay())) {
      remaining -= 1;
    }
  }
  return date.toISOString();
}

function periodsOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  const normalizedLeftEnd = leftEnd || "9999-12-31";
  const normalizedRightEnd = rightEnd || "9999-12-31";
  return leftStart <= normalizedRightEnd && rightStart <= normalizedLeftEnd;
}

function isActivePortfolioMembership(portfolio, asOf = new Date()) {
  const currentDate = new Date(asOf).toISOString().slice(0, 10);
  return portfolio.activeFrom <= currentDate && (!portfolio.activeTo || portfolio.activeTo >= currentDate);
}

function statusForClientResponseType(responseType) {
  if (responseType === "acknowledged") {
    return "acknowledged";
  }
  if (responseType === "in_progress") {
    return "in_progress";
  }
  if (responseType === "documents_delivered") {
    return "delivered";
  }
  throw error(400, "client_request_response_type_invalid", "Client response type is not supported.");
}

function statusForApprovalResponseType(responseType) {
  if (responseType === "viewed") {
    return "viewed";
  }
  if (responseType === "approved") {
    return "approved";
  }
  if (["rejected", "partially_approved", "needs_more_info"].includes(responseType)) {
    return "rejected";
  }
  throw error(400, "approval_response_type_invalid", "Approval response type is not supported.");
}

function subtractBusinessDays(value, amount) {
  const date = new Date(`${String(value).slice(0, 10)}T09:00:00.000Z`);
  let remaining = amount;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() - 1);
    if (![0, 6].includes(date.getUTCDay())) {
      remaining -= 1;
    }
  }
  return date.toISOString().slice(0, 10);
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw error(400, code, `${code} is required.`);
  }
  return value.trim();
}

function norm(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function dateOnly(value, code) {
  const resolved = text(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw error(400, code, `${code} must be in YYYY-MM-DD format.`);
  }
  return resolved;
}

function optionalDate(value, code) {
  return value == null || value === "" ? null : dateOnly(value, code);
}

function timestamp(value, code) {
  const parsed = new Date(text(value, code));
  if (Number.isNaN(parsed.getTime())) {
    throw error(400, code, `${code} must be a valid timestamp.`);
  }
  return parsed.toISOString();
}

function accessCode() {
  return crypto.randomBytes(12).toString("hex");
}

function recordAuditCorrelationEvent(state, event) {
  if (!event?.companyId || !event?.correlationId) {
    return;
  }
  const recordKey = buildAuditCorrelationRecordKey(event.companyId, event.correlationId);
  const existing = state.auditCorrelations.get(recordKey) || {
    correlationId: event.correlationId,
    companyId: event.companyId,
    firstSeenAt: event.recordedAt,
    lastSeenAt: event.recordedAt,
    actionCount: 0,
    actorIds: [],
    actions: [],
    relatedEntities: [],
    latestAction: null
  };
  existing.lastSeenAt = event.recordedAt;
  existing.actionCount = Number(existing.actionCount || 0) + 1;
  existing.latestAction = event.action;
  pushUnique(existing.actorIds, event.actorId);
  pushUnique(existing.actions, event.action);
  pushUniqueEntity(existing.relatedEntities, event.entityType, event.entityId);
  state.auditCorrelations.set(recordKey, existing);
}

function pushUnique(values, candidate) {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return;
  }
  if (!values.includes(candidate)) {
    values.push(candidate);
  }
}

function pushUniqueEntity(values, entityType, entityId) {
  if (typeof entityType !== "string" || entityType.trim().length === 0 || typeof entityId !== "string" || entityId.trim().length === 0) {
    return;
  }
  const key = `${entityType}:${entityId}`;
  if (!values.some((entry) => `${entry.entityType}:${entry.entityId}` === key)) {
    values.push({ entityType, entityId });
  }
}

function error(status, code, message) {
  const instance = new Error(message);
  instance.status = status;
  instance.code = code;
  return instance;
}
