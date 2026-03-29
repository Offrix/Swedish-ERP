import { createHttpError } from "./route-helpers.mjs";

const DASHBOARD_CODES = Object.freeze([
  "project_portfolio",
  "finance_close",
  "payroll_submission",
  "cutover_control",
  "trial_conversion"
]);

export function listMissionControlDashboards({
  platform,
  sessionToken,
  companyId,
  bureauOrgId = null,
  clientCompanyId = null
} = {}) {
  const context = {
    platform,
    sessionToken,
    companyId,
    bureauOrgId,
    clientCompanyId,
    generatedAt: new Date().toISOString()
  };
  return DASHBOARD_CODES.map((dashboardCode) => summarizeDashboard(buildMissionControlDashboard(context, dashboardCode)));
}

export function getMissionControlDashboard({
  platform,
  sessionToken,
  companyId,
  dashboardCode,
  bureauOrgId = null,
  clientCompanyId = null
} = {}) {
  return buildMissionControlDashboard(
    {
      platform,
      sessionToken,
      companyId,
      bureauOrgId,
      clientCompanyId,
      generatedAt: new Date().toISOString()
    },
    dashboardCode
  );
}

function buildMissionControlDashboard(context, dashboardCode) {
  switch (String(dashboardCode || "").trim()) {
    case "project_portfolio":
      return buildProjectPortfolioDashboard(context);
    case "finance_close":
      return buildFinanceCloseDashboard(context);
    case "payroll_submission":
      return buildPayrollSubmissionDashboard(context);
    case "cutover_control":
      return buildCutoverControlDashboard(context);
    case "trial_conversion":
      return buildTrialConversionDashboard(context);
    default:
      throw createHttpError(404, "mission_control_dashboard_not_found", "Mission control dashboard was not found.");
  }
}

function summarizeDashboard(dashboard) {
  return {
    dashboardCode: dashboard.dashboardCode,
    title: dashboard.title,
    companyId: dashboard.companyId,
    scopeCode: dashboard.scopeCode,
    statusCode: dashboard.statusCode,
    generatedAt: dashboard.generatedAt,
    counters: clone(dashboard.counters),
    summary: clone(dashboard.summary),
    drilldownTarget: clone(dashboard.drilldownTarget)
  };
}

function buildProjectPortfolioDashboard({ platform, companyId, generatedAt }) {
  const nodes = callOptional(platform, "listProjectPortfolioNodes", { companyId }, []);
  const summary =
    callOptional(platform, "getProjectPortfolioSummary", { companyId }, null) || {
      companyId,
      totalProjectCount: nodes.length,
      activeProjectCount: nodes.filter((node) => node.projectStatus === "active").length,
      atRiskProjectCount: nodes.filter((node) => node.atRiskFlag === true).length,
      blockedProjectCount: nodes.filter((node) => Number(node.blockerCount || 0) > 0).length,
      totalCriticalRiskCount: nodes.reduce((sum, node) => sum + Number(node.criticalRiskCount || 0), 0),
      totalCurrentMarginAmount: nodes.reduce((sum, node) => sum + Number(node.currentMarginAmount || 0), 0),
      totalForecastMarginAmount: nodes.reduce((sum, node) => sum + Number(node.forecastMarginAmount || 0), 0)
    };

  const rows = [...nodes]
    .sort(compareProjectRows)
    .slice(0, 50)
    .map((node) => ({
      rowId: node.projectId,
      objectType: "project",
      objectId: node.projectId,
      title: node.displayName || node.projectCode,
      subtitle: node.projectCode,
      statusCode: normalizeHealthToMissionStatus(node.healthCode),
      projectStatus: node.projectStatus,
      atRiskFlag: node.atRiskFlag === true,
      blockerCount: Number(node.blockerCount || 0),
      openRiskCount: Number(node.openRiskCount || 0),
      criticalRiskCount: Number(node.criticalRiskCount || 0),
      progressPercent: Number(node.progressPercent || 0),
      currentMarginAmount: Number(node.currentMarginAmount || 0),
      forecastMarginAmount: Number(node.forecastMarginAmount || 0),
      drilldownTarget: {
        objectType: "project",
        objectId: node.projectId,
        routePath: `/v1/projects/${node.projectId}`
      }
    }));

  const counters = {
    totalProjects: Number(summary.totalProjectCount || rows.length),
    activeProjects: Number(summary.activeProjectCount || rows.filter((row) => row.projectStatus === "active").length),
    atRiskProjects: Number(summary.atRiskProjectCount || rows.filter((row) => row.atRiskFlag).length),
    blockedProjects: Number(summary.blockedProjectCount || rows.filter((row) => row.blockerCount > 0).length),
    criticalRiskCount: Number(summary.totalCriticalRiskCount || rows.reduce((sum, row) => sum + row.criticalRiskCount, 0))
  };

  return {
    dashboardCode: "project_portfolio",
    title: "Project portfolio mission control",
    scopeCode: "company",
    companyId,
    generatedAt,
    statusCode:
      counters.criticalRiskCount > 0 ? "critical" : counters.atRiskProjects > 0 || counters.blockedProjects > 0 ? "attention" : "ok",
    summary: {
      totalCurrentMarginAmount: Number(summary.totalCurrentMarginAmount || 0),
      totalForecastMarginAmount: Number(summary.totalForecastMarginAmount || 0),
      roleDemandCount: Array.isArray(summary.roleDemand) ? summary.roleDemand.length : 0
    },
    counters,
    rows,
    actionBar: {
      availableCommands: ["projects.openPortfolio", "projects.openAtRisk", "projects.openProfitability"]
    },
    drilldownTarget: {
      routePath: "/v1/projects/portfolio/summary",
      objectType: "projectPortfolio",
      objectId: companyId
    },
    sourceRefs: [
      { sourceType: "project_portfolio_summary", sourceObjectId: companyId, recordCount: 1 },
      { sourceType: "project_portfolio_nodes", sourceObjectId: companyId, recordCount: nodes.length }
    ]
  };
}

function buildFinanceCloseDashboard({ platform, sessionToken, companyId, bureauOrgId, clientCompanyId, generatedAt }) {
  const resolvedBureauOrgId = normalizeText(bureauOrgId) || companyId;
  const workbenches = callOptional(
    platform,
    "listCloseWorkbenches",
    {
      sessionToken,
      bureauOrgId: resolvedBureauOrgId,
      clientCompanyId: normalizeText(clientCompanyId)
    },
    []
  );

  const rows = [...workbenches]
    .sort(compareCloseRows)
    .slice(0, 50)
    .map((item) => ({
      rowId: item.checklistId,
      objectType: "close_checklist",
      objectId: item.checklistId,
      title: item.periodCode || item.accountingPeriod?.periodCode || item.accountingPeriodId,
      subtitle: item.clientCompanyId,
      statusCode: resolveCloseStatusCode(item),
      checklistStatus: item.status,
      closeState: item.closeState,
      blockerCount: Array.isArray(item.blockers) ? item.blockers.length : 0,
      openHardStopBlockerCount: Number(item.openHardStopBlockerCount || 0),
      pendingSignoffCount: Array.isArray(item.signoffChain)
        ? item.signoffChain.filter((step) => !step.approvedAt && !step.approvedByUserId).length
        : 0,
      deadlineAt: item.deadlineAt || null,
      drilldownTarget: {
        objectType: "close_checklist",
        objectId: item.checklistId,
        routePath: `/v1/close/workbench/${item.checklistId}`
      }
    }));

  const counters = {
    totalChecklists: rows.length,
    blockedChecklists: rows.filter((row) => row.openHardStopBlockerCount > 0).length,
    signoffPending: rows.filter((row) => row.checklistStatus === "signoff_pending").length,
    reopened: rows.filter((row) => row.checklistStatus === "reopened").length
  };

  return {
    dashboardCode: "finance_close",
    title: "Finance close mission control",
    scopeCode: "bureau",
    companyId,
    generatedAt,
    statusCode: counters.blockedChecklists > 0 ? "critical" : counters.signoffPending > 0 || rows.length > 0 ? "attention" : "ok",
    summary: {
      bureauOrgId: resolvedBureauOrgId,
      clientScope: normalizeText(clientCompanyId),
      hardStopBlockerCount: rows.reduce((sum, row) => sum + row.openHardStopBlockerCount, 0)
    },
    counters,
    rows,
    actionBar: {
      availableCommands: ["close.openWorkbench", "close.openBlocked", "close.openReopenRequests"]
    },
    drilldownTarget: {
      routePath: "/v1/close/workbench",
      objectType: "close_workbench",
      objectId: resolvedBureauOrgId
    },
    sourceRefs: [
      { sourceType: "close_workbench", sourceObjectId: resolvedBureauOrgId, recordCount: workbenches.length }
    ]
  };
}

function buildPayrollSubmissionDashboard({ platform, companyId, generatedAt }) {
  const agiSubmissions = callOptional(platform, "listAgiSubmissions", { companyId }, []);
  const authoritySubmissions = callOptional(platform, "listAuthoritySubmissions", { companyId, submissionType: "agi_monthly" }, []);
  const authorityBySourceObjectId = groupLatestBy(authoritySubmissions, (submission) => normalizeText(submission.sourceObjectId));

  const rows = agiSubmissions
    .map((submission) => {
      const latestVersion = submission.currentVersion || submission.versions?.at(-1) || null;
      const latestReceipt = latestVersion?.receipts?.at(-1) || null;
      const authoritySubmission = authorityBySourceObjectId.get(submission.agiSubmissionId) || null;
      const effectiveStatus = normalizeText(authoritySubmission?.status) || normalizeText(submission.status) || normalizeText(latestVersion?.state) || "draft";
      const validationErrorCount = Array.isArray(latestVersion?.validationErrors) ? latestVersion.validationErrors.length : 0;
      return {
        rowId: submission.agiSubmissionId,
        objectType: "agi_submission",
        objectId: submission.agiSubmissionId,
        title: submission.reportingPeriod,
        subtitle: authoritySubmission?.submissionId || latestVersion?.agiSubmissionVersionId || null,
        statusCode: resolvePayrollSubmissionStatusCode({ effectiveStatus, validationErrorCount, latestReceiptStatus: latestReceipt?.receiptStatus || null }),
        submissionStatus: effectiveStatus,
        reportingPeriod: submission.reportingPeriod,
        validationErrorCount,
        versionCount: Array.isArray(submission.versions) ? submission.versions.length : 0,
        latestReceiptStatus: latestReceipt?.receiptStatus || null,
        authoritySubmissionId: authoritySubmission?.submissionId || null,
        authoritySubmissionStatus: authoritySubmission?.status || null,
        drilldownTarget: {
          objectType: "agi_submission",
          objectId: submission.agiSubmissionId,
          routePath: `/v1/payroll/agi-submissions/${submission.agiSubmissionId}`
        }
      };
    })
    .sort(comparePayrollRows)
    .slice(0, 50);

  const counters = {
    totalSubmissions: rows.length,
    accepted: rows.filter((row) => row.submissionStatus === "accepted").length,
    pending: rows.filter((row) => ["draft", "validated", "ready_for_sign", "signed", "submitted"].includes(row.submissionStatus)).length,
    rejected: rows.filter((row) => ["rejected", "partially_rejected"].includes(row.submissionStatus)).length
  };

  return {
    dashboardCode: "payroll_submission",
    title: "Payroll submission mission control",
    scopeCode: "company",
    companyId,
    generatedAt,
    statusCode: counters.rejected > 0 ? "critical" : counters.pending > 0 ? "attention" : "ok",
    summary: {
      authoritySubmissionCount: authoritySubmissions.length,
      unmatchedAuthoritySubmissionCount: authoritySubmissions.filter(
        (submission) => !agiSubmissions.some((agiSubmission) => agiSubmission.agiSubmissionId === submission.sourceObjectId)
      ).length
    },
    counters,
    rows,
    actionBar: {
      availableCommands: ["payroll.openAgiQueue", "payroll.openReceipts", "submissions.openMonitor"]
    },
    drilldownTarget: {
      routePath: "/v1/payroll/agi-submissions",
      objectType: "agi_submission",
      objectId: companyId
    },
    sourceRefs: [
      { sourceType: "agi_submission", sourceObjectId: companyId, recordCount: agiSubmissions.length },
      { sourceType: "authority_submission", sourceObjectId: companyId, recordCount: authoritySubmissions.length }
    ]
  };
}

function buildCutoverControlDashboard({ platform, sessionToken, companyId, generatedAt }) {
  const cockpit =
    callOptional(platform, "getMigrationCockpit", { sessionToken, companyId }, null) || {
      cutoverBoard: { items: [], counters: {} },
      parallelRunBoard: { items: [], counters: {} },
      acceptanceBoard: { items: [], counters: {} }
    };
  const cutoverBoard = cockpit.cutoverBoard || { items: [], counters: {} };
  const parallelRunBoard = cockpit.parallelRunBoard || { items: [], counters: {} };
  const acceptanceBoard = cockpit.acceptanceBoard || { items: [], counters: {} };

  const rows = (cutoverBoard.items || [])
    .map((item) => ({
      rowId: item.cutoverPlanId,
      objectType: "migration_cutover_plan",
      objectId: item.cutoverPlanId,
      title: item.cutoverPlanId,
      subtitle: item.status,
      statusCode: resolveCutoverStatusCode(item),
      cutoverStatus: item.status,
      validationGateStatus: item.validationGateStatus,
      blockedCount: Number(item.blockedCount || 0),
      postCutoverCorrectionOpenCount: Number(item.postCutoverCorrectionOpenCount || 0),
      parallelRunPendingAcceptanceCount: Number(item.parallelRunSummary?.pendingAcceptance || 0),
      parallelRunBlockedCount: Number(item.parallelRunSummary?.blocked || 0),
      conciergeStageCode: item.conciergeStageCode || null,
      sourceExtractOpenCount: Number(item.sourceExtractSummary?.pending || 0) + Number(item.sourceExtractSummary?.blocked || 0),
      rehearsalBlockedCount: Number(item.rehearsalSummary?.blocked || 0),
      rollbackDrillStatus: item.rollbackDrillStatus || null,
      automatedVarianceStatus: item.automatedVarianceStatus || null,
      signoffEvidenceStatus: item.signoffEvidenceStatus || null,
      escalationPolicyCode: item.escalationPolicyCode || null,
      attentionReasonCodes: Array.isArray(item.attentionReasonCodes) ? item.attentionReasonCodes : [],
      drilldownTarget: {
        objectType: "migration_cutover_plan",
        objectId: item.cutoverPlanId,
        routePath: "/v1/migration/cockpit"
      }
    }))
    .sort(compareCutoverRows)
    .slice(0, 50);

  const counters = {
    totalPlans: Number(cutoverBoard.counters?.total || rows.length),
    validationBlocked: Number(cutoverBoard.counters?.validationBlocked || 0),
    readyToSwitch: Number(cutoverBoard.counters?.readyToSwitch || 0),
    rollbackInProgress: Number(cutoverBoard.counters?.rollbackInProgress || 0),
    acceptanceBlocked: Number(cutoverBoard.counters?.acceptanceBlocked || acceptanceBoard.items?.filter((item) => item.status === "blocked").length || 0),
    parallelRunReviewRequired: Number(parallelRunBoard.counters?.manualReviewRequired || 0) + Number(parallelRunBoard.counters?.completedAwaitingAcceptance || 0),
    parallelRunBlocked: Number(parallelRunBoard.counters?.blocked || 0),
    sourceExtractIncomplete: rows.filter((row) => row.sourceExtractOpenCount > 0).length,
    rehearsalBlocked: rows.filter((row) => row.rehearsalBlockedCount > 0).length,
    rollbackDrillMissing: rows.filter((row) => !row.rollbackDrillStatus || row.rollbackDrillStatus !== "passed").length
  };

  return {
    dashboardCode: "cutover_control",
    title: "Cutover control mission control",
    scopeCode: "company",
    companyId,
    generatedAt,
    statusCode:
      counters.rollbackInProgress > 0 || counters.validationBlocked > 0 || counters.acceptanceBlocked > 0 || counters.parallelRunBlocked > 0
        ? "critical"
        : counters.totalPlans > 0 || counters.parallelRunReviewRequired > 0
          ? "attention"
          : "ok",
    summary: {
      acceptanceRecordCount: Array.isArray(acceptanceBoard.items) ? acceptanceBoard.items.length : 0,
      correctionOpenCount: rows.reduce((sum, row) => sum + row.postCutoverCorrectionOpenCount, 0),
      parallelRunResultCount: Array.isArray(parallelRunBoard.items) ? parallelRunBoard.items.length : 0,
      conciergeAttentionCount: rows.filter((row) => row.sourceExtractOpenCount > 0 || row.rehearsalBlockedCount > 0 || row.rollbackDrillStatus !== "passed" || row.automatedVarianceStatus === "blocking").length
    },
    counters,
    rows,
    actionBar: {
      availableCommands: ["migration.openCockpit", "migration.openAcceptance", "migration.openCorrections", "migration.openConcierge"]
    },
    drilldownTarget: {
      routePath: "/v1/migration/cockpit",
      objectType: "migration_cockpit",
      objectId: companyId
    },
    sourceRefs: [
      { sourceType: "migration_cutover_board", sourceObjectId: companyId, recordCount: Array.isArray(cutoverBoard.items) ? cutoverBoard.items.length : 0 },
      { sourceType: "migration_acceptance_board", sourceObjectId: companyId, recordCount: Array.isArray(acceptanceBoard.items) ? acceptanceBoard.items.length : 0 }
    ]
  };
}

function buildTrialConversionDashboard({ platform, sessionToken, companyId, generatedAt }) {
  const trials = callOptional(platform, "listTrialEnvironments", { sessionToken, companyId }, []);
  const promotions = callOptional(platform, "listPromotionPlans", { sessionToken, companyId }, []);
  const parallelRuns = callOptional(platform, "listParallelRunPlans", { sessionToken, companyId }, []);
  const operations = callOptional(platform, "getTrialOperationsSnapshot", { sessionToken, companyId }, null);
  const promotionByTrialId = groupLatestBy(promotions, (plan) => normalizeText(plan.trialEnvironmentProfileId));
  const parallelByTrialId = groupLatestBy(parallelRuns, (plan) => normalizeText(plan.trialEnvironmentProfileId));
  const alerts = Array.isArray(operations?.alerts) ? operations.alerts : [];
  const queueViews = Array.isArray(operations?.queueViews) ? operations.queueViews : [];
  const promotionWorkflows = Array.isArray(operations?.promotionWorkflows) ? operations.promotionWorkflows : [];
  const alertsByTrialId = new Map();
  for (const alert of alerts) {
    const trialEnvironmentProfileId = normalizeText(alert.trialEnvironmentProfileId);
    if (!trialEnvironmentProfileId) {
      continue;
    }
    if (!alertsByTrialId.has(trialEnvironmentProfileId)) {
      alertsByTrialId.set(trialEnvironmentProfileId, []);
    }
    alertsByTrialId.get(trialEnvironmentProfileId).push(alert);
  }
  const workflowByTrialId = new Map(
    promotionWorkflows
      .filter((workflow) => normalizeText(workflow.trialEnvironmentProfileId))
      .map((workflow) => [workflow.trialEnvironmentProfileId, workflow])
  );

  const rows = trials
    .map((trial) => {
      const promotion = promotionByTrialId.get(trial.trialEnvironmentProfileId) || null;
      const parallelRun = parallelByTrialId.get(trial.trialEnvironmentProfileId) || null;
      const workflow = workflowByTrialId.get(trial.trialEnvironmentProfileId) || null;
      const trialAlerts = alertsByTrialId.get(trial.trialEnvironmentProfileId) || [];
      return {
        rowId: trial.trialEnvironmentProfileId,
        objectType: "trial_environment_profile",
        objectId: trial.trialEnvironmentProfileId,
        title: trial.label,
        subtitle: trial.seedScenarioCode,
        statusCode: resolveTrialStatusCode(trial, promotion, parallelRun),
        trialStatus: trial.status,
        trialIsolationStatus: trial.trialIsolationStatus,
        promotionStatus: promotion?.status || null,
        parallelRunStatus: parallelRun?.status || null,
        workflowStageCode: workflow?.currentStageCode || null,
        pendingApprovalClasses: workflow?.pendingApprovalClasses || [],
        requiredPostPromotionTaskCodes: workflow?.requiredPostPromotionTaskCodes || [],
        promotionEligibleFlag: trial.promotionEligibleFlag === true,
        supportsLegalEffect: trial.supportsLegalEffect === true,
        providerPolicyCode: trial.providerPolicyCode || null,
        alertCount: trialAlerts.length,
        criticalAlertCount: trialAlerts.filter((alert) => alert.severityCode === "critical").length,
        attentionAlertCount: trialAlerts.filter((alert) => alert.severityCode === "attention").length,
        activeAlertCodes: trialAlerts.map((alert) => alert.alertCode),
        drilldownTarget: {
          objectType: "trial_environment_profile",
          objectId: trial.trialEnvironmentProfileId,
          routePath: "/v1/trial/environments"
        }
      };
    })
    .sort(compareTrialRows)
    .slice(0, 50);

  const counters = {
    activeTrials: rows.filter((row) => row.trialStatus === "active").length,
    pendingPromotion: rows.filter((row) => ["validated", "approved"].includes(row.promotionStatus)).length,
    executedPromotion: rows.filter((row) => row.promotionStatus === "executed").length,
    parallelRunStarted: rows.filter((row) => row.parallelRunStatus === "started").length,
    alertCount: alerts.length,
    criticalAlertCount: alerts.filter((alert) => alert.severityCode === "critical").length,
    openQueueCount: queueViews.filter((queue) => queue.openCount > 0).length,
    stalledPromotionCount: promotionWorkflows.filter((workflow) => workflow.currentStageCode === "awaiting_approval" || workflow.currentStageCode === "ready_for_execution").length
  };

  return {
    dashboardCode: "trial_conversion",
    title: "Trial conversion mission control",
    scopeCode: "company",
    companyId,
    generatedAt,
    statusCode:
      counters.criticalAlertCount > 0 || rows.some((row) => row.supportsLegalEffect || row.trialIsolationStatus !== "isolated")
        ? "critical"
        : counters.alertCount > 0 || counters.pendingPromotion > 0 || counters.parallelRunStarted > 0 || counters.activeTrials > 0
          ? "attention"
          : "ok",
    summary: {
      trialCount: trials.length,
      promotionPlanCount: promotions.length,
      parallelRunPlanCount: parallelRuns.length,
      operationsSummary: operations?.summary || null,
      supportPolicy: operations?.supportPolicy || null,
      salesDemoAnalytics: operations?.salesDemoAnalytics || null
    },
    counters,
    rows,
    actionBar: {
      availableCommands: [
        "trial.openOperations",
        "trial.openEnvironments",
        "trial.openPromotions",
        "trial.openParallelRuns",
        "trial.openSupportPolicy"
      ]
    },
    drilldownTarget: {
      routePath: "/v1/trial/operations",
      objectType: "trial_operations_snapshot",
      objectId: companyId
    },
    sourceRefs: [
      { sourceType: "trial_environment_profile", sourceObjectId: companyId, recordCount: trials.length },
      { sourceType: "promotion_plan", sourceObjectId: companyId, recordCount: promotions.length },
      { sourceType: "parallel_run_plan", sourceObjectId: companyId, recordCount: parallelRuns.length },
      { sourceType: "trial_operation_alert", sourceObjectId: companyId, recordCount: alerts.length },
      { sourceType: "trial_operations_queue", sourceObjectId: companyId, recordCount: queueViews.length }
    ]
  };
}

function callOptional(target, methodName, input, fallbackValue) {
  if (!target || typeof target[methodName] !== "function") {
    return clone(fallbackValue);
  }
  return target[methodName](input);
}

function groupLatestBy(items, keyResolver) {
  const grouped = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = keyResolver(item);
    if (!key) {
      continue;
    }
    const previous = grouped.get(key);
    if (!previous || String(item.updatedAt || item.createdAt || "") > String(previous.updatedAt || previous.createdAt || "")) {
      grouped.set(key, item);
    }
  }
  return grouped;
}

function resolveCloseStatusCode(item) {
  if (Number(item.openHardStopBlockerCount || 0) > 0) {
    return "critical";
  }
  if (["reopened", "signoff_pending", "review_ready", "in_progress"].includes(String(item.status || ""))) {
    return "attention";
  }
  return "ok";
}

function resolvePayrollSubmissionStatusCode({ effectiveStatus, validationErrorCount, latestReceiptStatus }) {
  if (validationErrorCount > 0 || ["rejected", "partially_rejected"].includes(effectiveStatus) || latestReceiptStatus === "rejected") {
    return "critical";
  }
  if (["draft", "validated", "ready_for_sign", "signed", "submitted"].includes(effectiveStatus)) {
    return "attention";
  }
  return "ok";
}

function resolveCutoverStatusCode(item) {
  if (Number(item.blockedCount || 0) > 0 || ["rollback_in_progress", "rolled_back"].includes(String(item.status || ""))) {
    return "critical";
  }
  if (item.requiresAttention === true || String(item.status || "") !== "stabilized") {
    return "attention";
  }
  return "ok";
}

function resolveTrialStatusCode(trial, promotion, parallelRun) {
  if (trial.supportsLegalEffect === true || trial.trialIsolationStatus !== "isolated") {
    return "critical";
  }
  if (promotion?.status || parallelRun?.status || trial.status === "active") {
    return "attention";
  }
  return "ok";
}

function compareProjectRows(left, right) {
  return (
    Number(right.criticalRiskCount || 0) - Number(left.criticalRiskCount || 0)
    || Number(right.blockerCount || 0) - Number(left.blockerCount || 0)
    || Number(right.atRiskFlag === true) - Number(left.atRiskFlag === true)
    || String(left.title || "").localeCompare(String(right.title || ""))
  );
}

function compareCloseRows(left, right) {
  return (
    Number(right.openHardStopBlockerCount || 0) - Number(left.openHardStopBlockerCount || 0)
    || String(left.deadlineAt || "").localeCompare(String(right.deadlineAt || ""))
    || String(left.title || "").localeCompare(String(right.title || ""))
  );
}

function comparePayrollRows(left, right) {
  return (
    severityRank(right.statusCode) - severityRank(left.statusCode)
    || String(right.reportingPeriod || "").localeCompare(String(left.reportingPeriod || ""))
  );
}

function compareCutoverRows(left, right) {
  return (
    severityRank(right.statusCode) - severityRank(left.statusCode)
    || Number(right.blockedCount || 0) - Number(left.blockedCount || 0)
    || String(right.objectId || "").localeCompare(String(left.objectId || ""))
  );
}

function compareTrialRows(left, right) {
  return (
    severityRank(right.statusCode) - severityRank(left.statusCode)
    || String(left.title || "").localeCompare(String(right.title || ""))
  );
}

function severityRank(statusCode) {
  if (statusCode === "critical") {
    return 2;
  }
  if (statusCode === "attention") {
    return 1;
  }
  return 0;
}

function normalizeHealthToMissionStatus(healthCode) {
  if (healthCode === "red") {
    return "critical";
  }
  if (healthCode === "amber") {
    return "attention";
  }
  return "ok";
}

function normalizeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
