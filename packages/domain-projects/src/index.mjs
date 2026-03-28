import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const PROJECT_STATUSES = Object.freeze(["draft", "active", "on_hold", "closed", "archived"]);
export const PROJECT_BILLING_MODEL_CODES = Object.freeze([
  "time_and_material",
  "fixed_price",
  "milestone",
  "retainer_capacity",
  "subscription_service",
  "advance_invoice",
  "hybrid_change_order"
]);
export const PROJECT_REVENUE_RECOGNITION_MODEL_CODES = Object.freeze([
  "billing_equals_revenue",
  "over_time",
  "deferred_until_milestone"
]);
export const PROJECT_ENGAGEMENT_STATUSES = Object.freeze(["draft", "active", "paused", "closed", "cancelled"]);
export const PROJECT_WORK_MODEL_CODES = Object.freeze([
  "time_only",
  "milestone_only",
  "retainer_capacity",
  "fixed_scope",
  "subscription_service",
  "field_service_optional",
  "service_order",
  "work_order",
  "construction_stage",
  "internal_delivery"
]);
export const PROJECT_WORK_PACKAGE_STATUSES = Object.freeze(["draft", "active", "completed", "cancelled"]);
export const PROJECT_DELIVERY_MILESTONE_STATUSES = Object.freeze(["planned", "ready", "achieved", "accepted", "cancelled"]);
export const PROJECT_WORK_LOG_STATUSES = Object.freeze(["recorded", "approved", "rejected"]);
export const PROJECT_REVENUE_PLAN_STATUSES = Object.freeze(["draft", "approved", "superseded"]);
export const PROJECT_BILLING_PLAN_STATUSES = Object.freeze(["draft", "active", "superseded", "cancelled"]);
export const PROJECT_STATUS_UPDATE_HEALTH_CODES = Object.freeze(["green", "amber", "red"]);
export const PROJECT_PROFITABILITY_ADJUSTMENT_STATUSES = Object.freeze(["pending_review", "approved", "rejected"]);
export const PROJECT_PROFITABILITY_ADJUSTMENT_IMPACT_CODES = Object.freeze(["revenue", "cost", "margin"]);
export const PROJECT_INVOICE_READINESS_STATUSES = Object.freeze(["ready", "review_required", "blocked"]);
export const PROJECT_BUDGET_LINE_KINDS = Object.freeze(["cost", "revenue"]);
export const PROJECT_BUDGET_CATEGORY_CODES = Object.freeze([
  "labor",
  "benefits",
  "pension",
  "travel",
  "material",
  "subcontractor",
  "other_cost",
  "revenue"
]);
export const PROJECT_RESOURCE_ALLOCATION_STATUSES = Object.freeze(["planned", "confirmed", "released"]);
export const PROJECT_CAPACITY_RESERVATION_STATUSES = Object.freeze(["draft", "approved", "released", "cancelled"]);
export const PROJECT_ASSIGNMENT_PLAN_STATUSES = Object.freeze(["draft", "approved", "in_progress", "completed", "cancelled"]);
export const PROJECT_RISK_STATUSES = Object.freeze(["open", "mitigating", "accepted", "closed"]);
export const PROJECT_RISK_SEVERITY_CODES = Object.freeze(["low", "medium", "high", "critical"]);
export const PROJECT_RISK_PROBABILITY_CODES = Object.freeze(["low", "medium", "high"]);
export const PROJECT_SNAPSHOT_STATUSES = Object.freeze(["materialized", "review_required"]);
export const PROJECT_CHANGE_ORDER_STATUSES = Object.freeze(["draft", "priced", "approved", "applied", "rejected", "cancelled"]);
export const PROJECT_CHANGE_ORDER_SCOPE_CODES = Object.freeze(["change", "addition", "deduction"]);
export const PROJECT_DEVIATION_STATUSES = Object.freeze(["open", "acknowledged", "in_progress", "resolved", "closed"]);
export const PROJECT_DEVIATION_SEVERITY_CODES = Object.freeze(["minor", "major", "critical"]);

export function createProjectsPlatform(options = {}) {
  return createProjectEngine(options);
}

export function createProjectEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  arPlatform = null,
  apPlatform = null,
  hrPlatform = null,
  timePlatform = null,
  payrollPlatform = null,
  vatPlatform = null,
  evidencePlatform = null,
  fieldPlatform = null,
  husPlatform = null,
  personalliggarePlatform = null,
  egenkontrollPlatform = null,
  kalkylPlatform = null,
  getFieldPlatform = null,
  getHusPlatform = null,
  getPersonalliggarePlatform = null,
  getEgenkontrollPlatform = null,
  getKalkylPlatform = null
} = {}) {
  const state = {
    projects: new Map(),
    projectIdsByCompany: new Map(),
    projectIdByAlias: new Map(),
    projectEngagements: new Map(),
    projectEngagementIdsByProject: new Map(),
    projectWorkModels: new Map(),
    projectWorkModelIdsByProject: new Map(),
    projectWorkPackages: new Map(),
    projectWorkPackageIdsByProject: new Map(),
    projectDeliveryMilestones: new Map(),
    projectDeliveryMilestoneIdsByProject: new Map(),
    projectWorkLogs: new Map(),
    projectWorkLogIdsByProject: new Map(),
    projectRevenuePlans: new Map(),
    projectRevenuePlanIdsByProject: new Map(),
    projectProfitabilitySnapshots: new Map(),
    projectProfitabilitySnapshotIdsByProject: new Map(),
    budgetVersions: new Map(),
    budgetVersionIdsByProject: new Map(),
    resourceAllocations: new Map(),
    resourceAllocationIdsByProject: new Map(),
    costSnapshots: new Map(),
    costSnapshotIdsByProject: new Map(),
    projectPayrollCostAllocations: new Map(),
    projectPayrollCostAllocationIdsByProject: new Map(),
    projectPayrollCostAllocationIdsBySnapshot: new Map(),
    wipSnapshots: new Map(),
    wipSnapshotIdsByProject: new Map(),
    forecastSnapshots: new Map(),
    forecastSnapshotIdsByProject: new Map(),
    projectDeviations: new Map(),
    projectDeviationIdsByCompany: new Map(),
    projectDeviationIdsByProject: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedProjectDemo(state, clock);
  }

  return {
    projectStatuses: PROJECT_STATUSES,
    projectBillingModelCodes: PROJECT_BILLING_MODEL_CODES,
    projectRevenueRecognitionModelCodes: PROJECT_REVENUE_RECOGNITION_MODEL_CODES,
    projectEngagementStatuses: PROJECT_ENGAGEMENT_STATUSES,
    projectWorkModelCodes: PROJECT_WORK_MODEL_CODES,
    projectWorkPackageStatuses: PROJECT_WORK_PACKAGE_STATUSES,
    projectDeliveryMilestoneStatuses: PROJECT_DELIVERY_MILESTONE_STATUSES,
    projectWorkLogStatuses: PROJECT_WORK_LOG_STATUSES,
    projectRevenuePlanStatuses: PROJECT_REVENUE_PLAN_STATUSES,
    projectBillingPlanStatuses: PROJECT_BILLING_PLAN_STATUSES,
    projectStatusUpdateHealthCodes: PROJECT_STATUS_UPDATE_HEALTH_CODES,
    projectProfitabilityAdjustmentStatuses: PROJECT_PROFITABILITY_ADJUSTMENT_STATUSES,
    projectProfitabilityAdjustmentImpactCodes: PROJECT_PROFITABILITY_ADJUSTMENT_IMPACT_CODES,
    projectInvoiceReadinessStatuses: PROJECT_INVOICE_READINESS_STATUSES,
    projectBudgetLineKinds: PROJECT_BUDGET_LINE_KINDS,
    projectBudgetCategoryCodes: PROJECT_BUDGET_CATEGORY_CODES,
    projectResourceAllocationStatuses: PROJECT_RESOURCE_ALLOCATION_STATUSES,
    projectCapacityReservationStatuses: PROJECT_CAPACITY_RESERVATION_STATUSES,
    projectAssignmentPlanStatuses: PROJECT_ASSIGNMENT_PLAN_STATUSES,
    projectRiskStatuses: PROJECT_RISK_STATUSES,
    projectRiskSeverityCodes: PROJECT_RISK_SEVERITY_CODES,
    projectRiskProbabilityCodes: PROJECT_RISK_PROBABILITY_CODES,
    projectSnapshotStatuses: PROJECT_SNAPSHOT_STATUSES,
    projectChangeOrderStatuses: PROJECT_CHANGE_ORDER_STATUSES,
    projectChangeOrderScopeCodes: PROJECT_CHANGE_ORDER_SCOPE_CODES,
    projectDeviationStatuses: PROJECT_DEVIATION_STATUSES,
    projectDeviationSeverityCodes: PROJECT_DEVIATION_SEVERITY_CODES,
    listProjects,
    getProject,
    getProjectWorkspace,
    createProject,
    listProjectOpportunityLinks,
    createProjectOpportunityLink,
    listProjectQuoteLinks,
    createProjectQuoteLink,
    listProjectEngagements,
    createProjectEngagement,
    listProjectWorkModels,
    createProjectWorkModel,
    listProjectWorkPackages,
    createProjectWorkPackage,
    listProjectDeliveryMilestones,
    createProjectDeliveryMilestone,
    listProjectWorkLogs,
    recordProjectWorkLog,
    listProjectRevenuePlans,
    createProjectRevenuePlan,
    approveProjectRevenuePlan,
    listProjectBillingPlans,
    createProjectBillingPlan,
    listProjectStatusUpdates,
    createProjectStatusUpdate,
    listProjectProfitabilityAdjustments,
    createProjectProfitabilityAdjustment,
    decideProjectProfitabilityAdjustment,
    listProjectInvoiceReadinessAssessments,
    materializeProjectInvoiceReadinessAssessment,
    convertQuoteToProject,
    listProjectProfitabilitySnapshots,
    materializeProjectProfitabilitySnapshot,
    listProjectBudgetVersions,
    createProjectBudgetVersion,
    listProjectResourceAllocations,
    createProjectResourceAllocation,
    listProjectCapacityReservations,
    createProjectCapacityReservation,
    transitionProjectCapacityReservationStatus,
    listProjectAssignmentPlans,
    createProjectAssignmentPlan,
    transitionProjectAssignmentPlanStatus,
    listProjectRisks,
    createProjectRisk,
    transitionProjectRiskStatus,
    listProjectPortfolioNodes,
    getProjectPortfolioSummary,
    listProjectCostSnapshots,
    listProjectPayrollCostAllocations,
    materializeProjectCostSnapshot,
    listProjectWipSnapshots,
    materializeProjectWipSnapshot,
    listProjectForecastSnapshots,
    materializeProjectForecastSnapshot,
    listProjectChangeOrders,
    createProjectChangeOrder,
    transitionProjectChangeOrderStatus,
    listProjectBuildVatAssessments,
    createProjectBuildVatAssessment,
    listProjectDeviations,
    createProjectDeviation,
    assignProjectDeviation,
    transitionProjectDeviationStatus,
    exportProjectEvidenceBundle,
    listProjectAuditEvents,
    exportDurableState,
    importDurableState
  };

  function listProjects({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalText(status);
    return (state.projectIdsByCompany.get(resolvedCompanyId) || [])
      .map((projectId) => state.projects.get(projectId))
      .filter(Boolean)
      .filter((project) => (resolvedStatus ? project.status === resolvedStatus : true))
      .sort((left, right) => left.projectCode.localeCompare(right.projectCode))
      .map(copy);
  }

  function getProject({ companyId, projectId } = {}) {
    return copy(requireProject(state, companyId, projectId));
  }

  function getProjectWorkspace({ companyId, projectId, cutoffDate = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const currentBudgetVersion = findLatestBudgetVersion(state, project.projectId);
    const currentCostSnapshot = selectWorkspaceSnapshot(listProjectCostSnapshots({ companyId: project.companyId, projectId: project.projectId }), cutoffDate);
    const currentWipSnapshot = selectWorkspaceSnapshot(listProjectWipSnapshots({ companyId: project.companyId, projectId: project.projectId }), cutoffDate);
    const currentForecastSnapshot = selectWorkspaceSnapshot(
      listProjectForecastSnapshots({ companyId: project.companyId, projectId: project.projectId }),
      cutoffDate
    );
    const currentProfitabilitySnapshot = selectWorkspaceSnapshot(
      listProjectProfitabilitySnapshots({ companyId: project.companyId, projectId: project.projectId }),
      cutoffDate
    );
    const engagements = listProjectEngagements({ companyId: project.companyId, projectId: project.projectId });
    const workModels = listProjectWorkModels({ companyId: project.companyId, projectId: project.projectId });
    const workPackages = listProjectWorkPackages({ companyId: project.companyId, projectId: project.projectId });
    const deliveryMilestones = listProjectDeliveryMilestones({ companyId: project.companyId, projectId: project.projectId });
    const revenuePlans = listProjectRevenuePlans({ companyId: project.companyId, projectId: project.projectId });
    const opportunityLinks = listProjectOpportunityLinks({ companyId: project.companyId, projectId: project.projectId });
    const quoteLinks = listProjectQuoteLinks({ companyId: project.companyId, projectId: project.projectId });
    const billingPlans = listProjectBillingPlans({ companyId: project.companyId, projectId: project.projectId });
    const statusUpdates = listProjectStatusUpdates({ companyId: project.companyId, projectId: project.projectId });
    const currentStatusUpdate = selectWorkspaceSnapshot(statusUpdates, cutoffDate, "statusDate");
    const profitabilityAdjustments = listProjectProfitabilityAdjustments({ companyId: project.companyId, projectId: project.projectId });
    const invoiceReadinessAssessments = listProjectInvoiceReadinessAssessments({ companyId: project.companyId, projectId: project.projectId });
    const capacityReservations = listProjectCapacityReservations({ companyId: project.companyId, projectId: project.projectId });
    const assignmentPlans = listProjectAssignmentPlans({ companyId: project.companyId, projectId: project.projectId });
    const projectRisks = listProjectRisks({ companyId: project.companyId, projectId: project.projectId });
    const openProjectRisks = projectRisks.filter((risk) => risk.status !== "closed");
    const currentBillingPlan = billingPlans.filter((record) => record.status === "active").pop() || billingPlans.at(-1) || null;
    const currentInvoiceReadinessAssessment = selectWorkspaceSnapshot(invoiceReadinessAssessments, cutoffDate, "assessedAt");
    const customerContext = summarizeProjectCustomerContext({
      project,
      opportunityLinks,
      quoteLinks,
      arPlatform
    });
    const payrollAllocations = currentCostSnapshot
      ? listProjectPayrollCostAllocations({
          companyId: project.companyId,
          projectId: project.projectId,
          projectCostSnapshotId: currentCostSnapshot.projectCostSnapshotId
        })
      : [];
    const fieldSummary = summarizeFieldWorkspace({
      companyId: project.companyId,
      projectId: project.projectId,
      fieldPlatform: resolvePlatform(getFieldPlatform, fieldPlatform)
    });
    const husSummary = summarizeHusWorkspace({
      companyId: project.companyId,
      projectId: project.projectId,
      husPlatform: resolvePlatform(getHusPlatform, husPlatform)
    });
    const personalliggareSummary = summarizePersonalliggareWorkspace({
      companyId: project.companyId,
      projectId: project.projectId,
      personalliggarePlatform: resolvePlatform(getPersonalliggarePlatform, personalliggarePlatform)
    });
    const egenkontrollSummary = summarizeEgenkontrollWorkspace({
      companyId: project.companyId,
      projectId: project.projectId,
      egenkontrollPlatform: resolvePlatform(getEgenkontrollPlatform, egenkontrollPlatform)
    });
    const kalkylSummary = summarizeKalkylWorkspace({
      companyId: project.companyId,
      projectId: project.projectId,
      kalkylPlatform: resolvePlatform(getKalkylPlatform, kalkylPlatform)
    });
    const projectDeviations = listProjectDeviations({
      companyId: project.companyId,
      projectId: project.projectId
    });
    const openProjectDeviations = projectDeviations.filter((deviation) => !["resolved", "closed"].includes(deviation.status));
    const resourceCapacitySummary = buildProjectResourceCapacitySummary({
      currentCostSnapshot,
      capacityReservations,
      assignmentPlans,
      resourceAllocations: listProjectResourceAllocations({ companyId: project.companyId, projectId: project.projectId })
    });
    const budgetActualForecastSummary = buildProjectBudgetActualForecastSummary({
      currentBudgetVersion,
      currentCostSnapshot,
      currentForecastSnapshot,
      currentProfitabilitySnapshot
    });
    const currentPortfolioNode = buildProjectPortfolioNode({
      state,
      companyId: project.companyId,
      project,
      cutoffDate,
      currentBudgetVersion,
      currentCostSnapshot,
      currentForecastSnapshot,
      currentProfitabilitySnapshot,
      currentInvoiceReadinessAssessment,
      currentStatusUpdate,
      openProjectRisks,
      resourceCapacitySummary
    });
    const warningCodes = [];
    if (!currentBudgetVersion) {
      warningCodes.push("budget_missing");
    }
    if (!currentCostSnapshot) {
      warningCodes.push("cost_snapshot_missing");
    }
    if (!currentWipSnapshot) {
      warningCodes.push("wip_snapshot_missing");
    }
    if (!currentForecastSnapshot) {
      warningCodes.push("forecast_snapshot_missing");
    }
    if (engagements.length === 0) {
      warningCodes.push("engagement_missing");
    }
    if (workModels.length === 0) {
      warningCodes.push("work_model_missing");
    }
    if (revenuePlans.filter((record) => record.status === "approved").length === 0) {
      warningCodes.push("approved_revenue_plan_missing");
    }
    if (currentInvoiceReadinessAssessment?.status === "blocked") {
      warningCodes.push("invoice_readiness_blocked");
    }
    if (currentInvoiceReadinessAssessment?.status === "review_required") {
      warningCodes.push("invoice_readiness_review_required");
    }
    if (personalliggareSummary.alertCount > 0) {
      warningCodes.push("personalliggare_attention_required");
    }
    if (egenkontrollSummary.openDeviationCount > 0) {
      warningCodes.push("egenkontroll_open_deviations");
    }
    if (fieldSummary.pendingSignatureCount > 0) {
      warningCodes.push("field_pending_signatures");
    }
    if (husSummary.attentionCount > 0) {
      warningCodes.push("hus_attention_required");
    }
    if (openProjectRisks.some((risk) => ["high", "critical"].includes(risk.severityCode))) {
      warningCodes.push("project_risk_attention_required");
    }
    if (resourceCapacitySummary.uncoveredAssignmentMinutes > 0) {
      warningCodes.push("capacity_assignment_gap");
    }
    return {
      projectId: project.projectId,
      projectCode: project.projectCode,
      projectReferenceCode: project.projectReferenceCode,
      projectStatus: project.status,
      customerId: project.customerId,
      projectManagerEmployeeId: project.projectManagerEmployeeId,
      billingModelCode: project.billingModelCode,
      revenueRecognitionModelCode: project.revenueRecognitionModelCode,
      budgetVersionId: currentBudgetVersion?.projectBudgetVersionId || null,
      currentCostSnapshotId: currentCostSnapshot?.projectCostSnapshotId || null,
      currentWipSnapshotId: currentWipSnapshot?.projectWipSnapshotId || null,
      currentForecastSnapshotId: currentForecastSnapshot?.projectForecastSnapshotId || null,
      currentProfitabilitySnapshotId: currentProfitabilitySnapshot?.projectProfitabilitySnapshotId || null,
      currentBillingPlanId: currentBillingPlan?.projectBillingPlanId || null,
      currentInvoiceReadinessAssessmentId: currentInvoiceReadinessAssessment?.projectInvoiceReadinessAssessmentId || null,
      latestEstimateVersionId: kalkylSummary.latestEstimateVersionId,
      latestEstimateStatus: kalkylSummary.latestEstimateStatus,
      opportunityLinkCount: opportunityLinks.length,
      quoteLinkCount: quoteLinks.length,
      billingPlanCount: billingPlans.length,
      profitabilityAdjustmentCount: profitabilityAdjustments.length,
      invoiceReadinessAssessmentCount: invoiceReadinessAssessments.length,
      capacityReservationCount: capacityReservations.length,
      assignmentPlanCount: assignmentPlans.length,
      openProjectRiskCount: openProjectRisks.length,
      criticalProjectRiskCount: openProjectRisks.filter((risk) => risk.severityCode === "critical").length,
      engagementCount: engagements.length,
      workModelCount: workModels.length,
      workPackageCount: workPackages.length,
      deliveryMilestoneCount: deliveryMilestones.length,
      approvedRevenuePlanCount: revenuePlans.filter((record) => record.status === "approved").length,
      openWorkOrderCount: fieldSummary.openWorkOrderCount,
      husCaseCount: husSummary.totalCaseCount,
      personalliggareAlertCount: personalliggareSummary.alertCount,
      openProjectDeviationCount: openProjectDeviations.length,
      warningCodes,
      payrollActuals: {
        actualCostAmount: currentCostSnapshot?.actualCostAmount || 0,
        actualMinutes: currentCostSnapshot?.actualMinutes || 0,
        payrollAllocationCount: payrollAllocations.length
      },
      budgetActualForecastSummary,
      resourceCapacitySummary,
      currentPortfolioNode,
      fieldSummary,
      husSummary,
      personalliggareSummary,
      egenkontrollSummary,
      kalkylSummary,
      customerContext,
      latestStatusUpdate: currentStatusUpdate ? copy(currentStatusUpdate) : null,
      currentBudgetVersion: currentBudgetVersion ? copy(currentBudgetVersion) : null,
      currentCostSnapshot: currentCostSnapshot ? copy(currentCostSnapshot) : null,
      currentWipSnapshot: currentWipSnapshot ? copy(currentWipSnapshot) : null,
      currentForecastSnapshot: currentForecastSnapshot ? copy(currentForecastSnapshot) : null,
      currentProfitabilitySnapshot: currentProfitabilitySnapshot ? copy(currentProfitabilitySnapshot) : null,
      currentBillingPlan: currentBillingPlan ? copy(currentBillingPlan) : null,
      currentInvoiceReadinessAssessment: currentInvoiceReadinessAssessment ? copy(currentInvoiceReadinessAssessment) : null,
      projectOpportunityLinks: opportunityLinks.map(copy),
      projectQuoteLinks: quoteLinks.map(copy),
      projectEngagements: engagements.map(copy),
      projectWorkModels: workModels.map(copy),
      projectWorkPackages: workPackages.map(copy),
      projectDeliveryMilestones: deliveryMilestones.map(copy),
      projectRevenuePlans: revenuePlans.map(copy),
      projectBillingPlans: billingPlans.map(copy),
      projectStatusUpdates: statusUpdates.map(copy),
      projectCapacityReservations: capacityReservations.map(copy),
      projectAssignmentPlans: assignmentPlans.map(copy),
      projectRisks: projectRisks.map(copy),
      projectProfitabilityAdjustments: profitabilityAdjustments.map(copy),
      projectInvoiceReadinessAssessments: invoiceReadinessAssessments.map(copy),
      complianceIndicatorStrip: buildWorkspaceIndicatorStrip({
        currentBudgetVersion,
        currentCostSnapshot,
        currentWipSnapshot,
        currentForecastSnapshot,
        currentProfitabilitySnapshot,
        fieldSummary,
        husSummary,
        personalliggareSummary,
        egenkontrollSummary,
        kalkylSummary,
        openProjectDeviationCount: openProjectDeviations.length,
        engagementCount: engagements.length,
        approvedRevenuePlanCount: revenuePlans.filter((record) => record.status === "approved").length,
        currentInvoiceReadinessAssessment
      }),
      projectDeviations: openProjectDeviations.map(copy)
    };
  }

  function createProject({
    companyId,
    projectId = null,
    projectCode = null,
    projectReferenceCode = null,
    displayName,
    customerId = null,
    projectManagerEmployeeId = null,
    startsOn,
    endsOn = null,
    currencyCode = "SEK",
    status = "draft",
    billingModelCode = null,
    revenueRecognitionModelCode = null,
    contractValueAmount = 0,
    dimensionJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedProjectCode = requireText(projectCode || generateProjectCode(state, resolvedCompanyId), "project_code_required");
    const resolvedProjectId = normalizeOptionalText(projectId) || toProjectSlug(resolvedProjectCode);
    const resolvedReferenceCode = requireText(projectReferenceCode || resolvedProjectId, "project_reference_code_required");
    const resolvedStatus = assertAllowed(status, PROJECT_STATUSES, "project_status_invalid");
    const resolvedStartsOn = normalizeRequiredDate(startsOn, "project_start_date_required");
    const resolvedEndsOn = normalizeOptionalDate(endsOn, "project_end_date_invalid");
    if (resolvedEndsOn && resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "project_date_range_invalid", "Project end date cannot be earlier than the start date.");
    }
    const resolvedBillingModelCode = normalizeOptionalText(billingModelCode);
    const resolvedRevenueRecognitionModelCode = normalizeOptionalText(revenueRecognitionModelCode);
    if (resolvedStatus === "active") {
      assertAllowed(resolvedBillingModelCode, PROJECT_BILLING_MODEL_CODES, "project_billing_model_required");
      assertAllowed(
        resolvedRevenueRecognitionModelCode,
        PROJECT_REVENUE_RECOGNITION_MODEL_CODES,
        "project_revenue_recognition_model_required"
      );
    } else {
      if (resolvedBillingModelCode) {
        assertAllowed(resolvedBillingModelCode, PROJECT_BILLING_MODEL_CODES, "project_billing_model_invalid");
      }
      if (resolvedRevenueRecognitionModelCode) {
        assertAllowed(
          resolvedRevenueRecognitionModelCode,
          PROJECT_REVENUE_RECOGNITION_MODEL_CODES,
          "project_revenue_recognition_model_invalid"
        );
      }
    }
    if (state.projects.has(resolvedProjectId)) {
      return copy(state.projects.get(resolvedProjectId));
    }
    ensureUniqueAlias(state, resolvedCompanyId, resolvedProjectId);
    ensureUniqueAlias(state, resolvedCompanyId, resolvedProjectCode);
    ensureUniqueAlias(state, resolvedCompanyId, resolvedReferenceCode);
    if (customerId && arPlatform?.getCustomer) {
      arPlatform.getCustomer({ companyId: resolvedCompanyId, customerId });
    }
    if (projectManagerEmployeeId) {
      findEmploymentContextByEmployeeId({
        companyId: resolvedCompanyId,
        employeeId: projectManagerEmployeeId,
        hrPlatform
      });
    }
    const record = {
      projectId: resolvedProjectId,
      companyId: resolvedCompanyId,
      projectCode: resolvedProjectCode,
      projectReferenceCode: resolvedReferenceCode,
      displayName: requireText(displayName, "project_display_name_required"),
      customerId: normalizeOptionalText(customerId),
      projectManagerEmployeeId: normalizeOptionalText(projectManagerEmployeeId),
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      currencyCode: normalizeUpperCode(currencyCode, "project_currency_required", 3),
      status: resolvedStatus,
      billingModelCode: resolvedBillingModelCode,
      revenueRecognitionModelCode: resolvedRevenueRecognitionModelCode,
      contractValueAmount: normalizeMoney(contractValueAmount, "project_contract_value_invalid"),
      dimensionJson: normalizeDimensions(dimensionJson),
      opportunityLinks: [],
      quoteLinks: [],
      billingPlans: [],
      statusUpdates: [],
      capacityReservations: [],
      assignmentPlans: [],
      risks: [],
      profitabilityAdjustments: [],
      invoiceReadinessAssessments: [],
      changeOrders: [],
      buildVatAssessments: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projects.set(record.projectId, record);
    appendToIndex(state.projectIdsByCompany, record.companyId, record.projectId);
    state.projectIdByAlias.set(toCompanyScopedKey(record.companyId, record.projectId), record.projectId);
    state.projectIdByAlias.set(toCompanyScopedKey(record.companyId, record.projectCode), record.projectId);
    state.projectIdByAlias.set(toCompanyScopedKey(record.companyId, record.projectReferenceCode), record.projectId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.created",
      entityType: "project",
      entityId: record.projectId,
      projectId: record.projectId,
      explanation: `Created project ${record.projectCode}.`
    });
    return copy(record);
  }

  function listProjectOpportunityLinks({ companyId, projectId } = {}) {
    return copy(requireProject(state, companyId, projectId).opportunityLinks || []).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.projectOpportunityLinkId.localeCompare(right.projectOpportunityLinkId)
    );
  }

  function createProjectOpportunityLink({
    companyId,
    projectId,
    projectOpportunityLinkId = null,
    externalSystemCode,
    externalOpportunityId,
    externalOpportunityRef = null,
    stageCode = "accepted",
    customerId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedCustomerId = normalizeOptionalText(customerId) || project.customerId || null;
    if (resolvedCustomerId && arPlatform?.getCustomer) {
      arPlatform.getCustomer({
        companyId: project.companyId,
        customerId: resolvedCustomerId
      });
    }
    const duplicate = (project.opportunityLinks || []).find(
      (record) =>
        record.externalSystemCode === normalizeCode(externalSystemCode, "project_opportunity_external_system_required")
        && record.externalOpportunityId === requireText(externalOpportunityId, "project_opportunity_external_id_required")
    );
    if (duplicate) {
      return copy(duplicate);
    }
    const record = {
      projectOpportunityLinkId: normalizeOptionalText(projectOpportunityLinkId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      customerId: resolvedCustomerId,
      externalSystemCode: normalizeCode(externalSystemCode, "project_opportunity_external_system_required"),
      externalOpportunityId: requireText(externalOpportunityId, "project_opportunity_external_id_required"),
      externalOpportunityRef: normalizeOptionalText(externalOpportunityRef),
      stageCode: normalizeCode(stageCode, "project_opportunity_stage_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    project.opportunityLinks.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.opportunity_link.created",
      entityType: "project_opportunity_link",
      entityId: record.projectOpportunityLinkId,
      projectId: record.projectId,
      explanation: `Linked opportunity ${record.externalOpportunityId} to ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectQuoteLinks({ companyId, projectId } = {}) {
    return copy(requireProject(state, companyId, projectId).quoteLinks || []).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.projectQuoteLinkId.localeCompare(right.projectQuoteLinkId)
    );
  }

  function createProjectQuoteLink({
    companyId,
    projectId,
    projectQuoteLinkId = null,
    sourceQuoteId = null,
    sourceQuoteVersionId = null,
    externalSystemCode = "internal_ar",
    externalQuoteRef = null,
    acceptedOn = null,
    customerId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const quote = normalizeOptionalText(sourceQuoteId)
      ? requireProjectSourceQuote({ arPlatform, companyId: project.companyId, sourceQuoteId })
      : null;
    const quoteVersion = quote
      ? selectProjectSourceQuoteVersion({ quote, sourceQuoteVersionId })
      : null;
    const resolvedCustomerId = normalizeOptionalText(customerId) || quote?.customerId || project.customerId || null;
    const duplicate = (project.quoteLinks || []).find(
      (record) =>
        (quote && record.sourceQuoteId === quote.quoteId && record.sourceQuoteVersionId === quoteVersion.quoteVersionId)
        || (!quote && record.externalSystemCode === normalizeCode(externalSystemCode, "project_quote_external_system_required")
          && record.externalQuoteRef === requireText(externalQuoteRef, "project_quote_external_ref_required"))
    );
    if (duplicate) {
      return copy(duplicate);
    }
    const record = {
      projectQuoteLinkId: normalizeOptionalText(projectQuoteLinkId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      customerId: resolvedCustomerId,
      sourceQuoteId: quote?.quoteId || null,
      sourceQuoteVersionId: quoteVersion?.quoteVersionId || null,
      quoteNo: quote?.quoteNo || null,
      quoteTitle: quoteVersion?.title || null,
      quoteStatus: quoteVersion?.status || null,
      acceptedOn: normalizeOptionalDate(acceptedOn, "project_quote_link_accepted_on_invalid") || quoteVersion?.acceptedAt?.slice(0, 10) || null,
      externalSystemCode: normalizeCode(externalSystemCode, "project_quote_external_system_required"),
      externalQuoteRef: normalizeOptionalText(externalQuoteRef) || quote?.quoteNo || null,
      totalAmount: quoteVersion ? normalizeMoney(quoteVersion.totalAmount, "project_quote_total_invalid") : null,
      currencyCode: quoteVersion?.currencyCode || project.currencyCode,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    project.quoteLinks.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.quote_link.created",
      entityType: "project_quote_link",
      entityId: record.projectQuoteLinkId,
      projectId: record.projectId,
      explanation: `Linked quote ${record.externalQuoteRef || record.sourceQuoteId} to ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectEngagements({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.projectEngagementIdsByProject.get(project.projectId) || [])
      .map((engagementId) => state.projectEngagements.get(engagementId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.engagementCode.localeCompare(right.engagementCode))
      .map(copy);
  }

  function createProjectEngagement({
    companyId,
    projectId,
    projectEngagementId = null,
    engagementCode = null,
    displayName,
    customerId = null,
    workModelCode,
    startsOn,
    endsOn = null,
    status = "draft",
    externalOpportunityRef = null,
    externalQuoteRef = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStartsOn = normalizeRequiredDate(startsOn || project.startsOn, "project_engagement_start_date_required");
    const resolvedEndsOn = normalizeOptionalDate(endsOn, "project_engagement_end_date_invalid");
    if (resolvedEndsOn && resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "project_engagement_date_range_invalid", "Engagement end date cannot be earlier than the start date.");
    }
    const record = {
      projectEngagementId: normalizeOptionalText(projectEngagementId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      engagementCode: requireText(engagementCode || `${project.projectCode}-ENG-${String((state.projectEngagementIdsByProject.get(project.projectId) || []).length + 1).padStart(2, "0")}`, "project_engagement_code_required"),
      displayName: requireText(displayName, "project_engagement_display_name_required"),
      customerId: normalizeOptionalText(customerId) || project.customerId || null,
      workModelCode: assertAllowed(workModelCode, PROJECT_WORK_MODEL_CODES, "project_work_model_invalid"),
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      status: assertAllowed(status, PROJECT_ENGAGEMENT_STATUSES, "project_engagement_status_invalid"),
      externalOpportunityRef: normalizeOptionalText(externalOpportunityRef),
      externalQuoteRef: normalizeOptionalText(externalQuoteRef),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projectEngagements.set(record.projectEngagementId, record);
    appendToIndex(state.projectEngagementIdsByProject, project.projectId, record.projectEngagementId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.engagement.created",
      entityType: "project_engagement",
      entityId: record.projectEngagementId,
      projectId: record.projectId,
      explanation: `Created engagement ${record.engagementCode} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectWorkModels({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (state.projectWorkModelIdsByProject.get(project.projectId) || [])
      .map((workModelId) => state.projectWorkModels.get(workModelId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.projectWorkModelId.localeCompare(right.projectWorkModelId))
      .map(copy);
  }

  function createProjectWorkModel({
    companyId,
    projectId,
    projectWorkModelId = null,
    projectEngagementId = null,
    modelCode,
    title,
    operationalPackCode = "general_core",
    requiresWorkOrders = false,
    requiresMilestones = false,
    requiresAttendance = false,
    requiresId06 = false,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const engagement =
      normalizeOptionalText(projectEngagementId)
        ? requireProjectEngagement(state, project.companyId, project.projectId, projectEngagementId)
        : null;
    const record = {
      projectWorkModelId: normalizeOptionalText(projectWorkModelId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      projectEngagementId: engagement?.projectEngagementId || null,
      modelCode: assertAllowed(modelCode, PROJECT_WORK_MODEL_CODES, "project_work_model_invalid"),
      title: requireText(title, "project_work_model_title_required"),
      operationalPackCode: requireText(operationalPackCode, "project_operational_pack_code_required"),
      requiresWorkOrders: requiresWorkOrders === true,
      requiresMilestones: requiresMilestones === true,
      requiresAttendance: requiresAttendance === true,
      requiresId06: requiresId06 === true,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projectWorkModels.set(record.projectWorkModelId, record);
    appendToIndex(state.projectWorkModelIdsByProject, project.projectId, record.projectWorkModelId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.work_model.created",
      entityType: "project_work_model",
      entityId: record.projectWorkModelId,
      projectId: record.projectId,
      explanation: `Created work model ${record.modelCode} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectWorkPackages({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.projectWorkPackageIdsByProject.get(project.projectId) || [])
      .map((workPackageId) => state.projectWorkPackages.get(workPackageId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.workPackageCode.localeCompare(right.workPackageCode))
      .map(copy);
  }

  function createProjectWorkPackage({
    companyId,
    projectId,
    projectWorkPackageId = null,
    projectEngagementId = null,
    projectWorkModelId = null,
    workPackageCode = null,
    title,
    description = null,
    startsOn,
    endsOn = null,
    status = "draft",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const engagement =
      normalizeOptionalText(projectEngagementId)
        ? requireProjectEngagement(state, project.companyId, project.projectId, projectEngagementId)
        : null;
    const workModel =
      normalizeOptionalText(projectWorkModelId)
        ? requireProjectWorkModel(state, project.companyId, project.projectId, projectWorkModelId)
        : null;
    const resolvedStartsOn = normalizeRequiredDate(startsOn || project.startsOn, "project_work_package_start_date_required");
    const resolvedEndsOn = normalizeOptionalDate(endsOn, "project_work_package_end_date_invalid");
    if (resolvedEndsOn && resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "project_work_package_date_range_invalid", "Work package end date cannot be earlier than the start date.");
    }
    const record = {
      projectWorkPackageId: normalizeOptionalText(projectWorkPackageId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      projectEngagementId: engagement?.projectEngagementId || null,
      projectWorkModelId: workModel?.projectWorkModelId || null,
      workPackageCode: requireText(workPackageCode || `${project.projectCode}-WP-${String((state.projectWorkPackageIdsByProject.get(project.projectId) || []).length + 1).padStart(2, "0")}`, "project_work_package_code_required"),
      title: requireText(title, "project_work_package_title_required"),
      description: normalizeOptionalText(description),
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      status: assertAllowed(status, PROJECT_WORK_PACKAGE_STATUSES, "project_work_package_status_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projectWorkPackages.set(record.projectWorkPackageId, record);
    appendToIndex(state.projectWorkPackageIdsByProject, project.projectId, record.projectWorkPackageId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.work_package.created",
      entityType: "project_work_package",
      entityId: record.projectWorkPackageId,
      projectId: record.projectId,
      explanation: `Created work package ${record.workPackageCode} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectDeliveryMilestones({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.projectDeliveryMilestoneIdsByProject.get(project.projectId) || [])
      .map((milestoneId) => state.projectDeliveryMilestones.get(milestoneId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.targetDate.localeCompare(right.targetDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectDeliveryMilestone({
    companyId,
    projectId,
    projectDeliveryMilestoneId = null,
    projectWorkPackageId = null,
    title,
    targetDate,
    plannedRevenueAmount = 0,
    status = "planned",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const workPackage =
      normalizeOptionalText(projectWorkPackageId)
        ? requireProjectWorkPackage(state, project.companyId, project.projectId, projectWorkPackageId)
        : null;
    const record = {
      projectDeliveryMilestoneId: normalizeOptionalText(projectDeliveryMilestoneId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      projectWorkPackageId: workPackage?.projectWorkPackageId || null,
      title: requireText(title, "project_delivery_milestone_title_required"),
      targetDate: normalizeRequiredDate(targetDate, "project_delivery_milestone_target_date_required"),
      plannedRevenueAmount: normalizeMoney(plannedRevenueAmount, "project_delivery_milestone_revenue_invalid"),
      status: assertAllowed(status, PROJECT_DELIVERY_MILESTONE_STATUSES, "project_delivery_milestone_status_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projectDeliveryMilestones.set(record.projectDeliveryMilestoneId, record);
    appendToIndex(state.projectDeliveryMilestoneIdsByProject, project.projectId, record.projectDeliveryMilestoneId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.delivery_milestone.created",
      entityType: "project_delivery_milestone",
      entityId: record.projectDeliveryMilestoneId,
      projectId: record.projectId,
      explanation: `Created delivery milestone ${record.projectDeliveryMilestoneId} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectWorkLogs({ companyId, projectId, workDate = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedWorkDate = normalizeOptionalDate(workDate, "project_work_log_date_invalid");
    return (state.projectWorkLogIdsByProject.get(project.projectId) || [])
      .map((workLogId) => state.projectWorkLogs.get(workLogId))
      .filter(Boolean)
      .filter((record) => (resolvedWorkDate ? record.workDate === resolvedWorkDate : true))
      .sort((left, right) => left.workDate.localeCompare(right.workDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function recordProjectWorkLog({
    companyId,
    projectId,
    projectWorkLogId = null,
    projectWorkPackageId = null,
    projectDeliveryMilestoneId = null,
    employmentId = null,
    workDate,
    minutes,
    description,
    billableFlag = true,
    status = "approved",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const workPackage =
      normalizeOptionalText(projectWorkPackageId)
        ? requireProjectWorkPackage(state, project.companyId, project.projectId, projectWorkPackageId)
        : null;
    const deliveryMilestone =
      normalizeOptionalText(projectDeliveryMilestoneId)
        ? requireProjectDeliveryMilestone(state, project.companyId, project.projectId, projectDeliveryMilestoneId)
        : null;
    if (employmentId) {
      findEmploymentContextByEmploymentId({
        companyId: project.companyId,
        employmentId,
        hrPlatform
      });
    }
    const record = {
      projectWorkLogId: normalizeOptionalText(projectWorkLogId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      projectWorkPackageId: workPackage?.projectWorkPackageId || null,
      projectDeliveryMilestoneId: deliveryMilestone?.projectDeliveryMilestoneId || null,
      employmentId: normalizeOptionalText(employmentId),
      workDate: normalizeRequiredDate(workDate, "project_work_log_date_required"),
      minutes: normalizeWholeNumber(minutes, "project_work_log_minutes_invalid"),
      description: requireText(description, "project_work_log_description_required"),
      billableFlag: billableFlag !== false,
      status: assertAllowed(status, PROJECT_WORK_LOG_STATUSES, "project_work_log_status_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projectWorkLogs.set(record.projectWorkLogId, record);
    appendToIndex(state.projectWorkLogIdsByProject, project.projectId, record.projectWorkLogId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.work_log.recorded",
      entityType: "project_work_log",
      entityId: record.projectWorkLogId,
      projectId: record.projectId,
      explanation: `Recorded project work log ${record.projectWorkLogId} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectRevenuePlans({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.projectRevenuePlanIdsByProject.get(project.projectId) || [])
      .map((projectRevenuePlanId) => state.projectRevenuePlans.get(projectRevenuePlanId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.versionNo - right.versionNo)
      .map(copy);
  }

  function createProjectRevenuePlan({
    companyId,
    projectId,
    projectRevenuePlanId = null,
    versionLabel,
    lines,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const normalizedLines = normalizeRevenuePlanLines(lines);
    const versionNo = nextProjectRevenuePlanVersionNo(state, project.projectId);
    const record = {
      projectRevenuePlanId: normalizeOptionalText(projectRevenuePlanId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      versionNo,
      versionLabel: requireText(versionLabel, "project_revenue_plan_version_label_required"),
      status: "draft",
      lines: normalizedLines,
      totals: summarizeRevenuePlanLines(normalizedLines),
      approvedAt: null,
      approvedByActorId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projectRevenuePlans.set(record.projectRevenuePlanId, record);
    appendToIndex(state.projectRevenuePlanIdsByProject, project.projectId, record.projectRevenuePlanId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.revenue_plan.created",
      entityType: "project_revenue_plan",
      entityId: record.projectRevenuePlanId,
      projectId: record.projectId,
      explanation: `Created revenue plan version ${record.versionNo} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function approveProjectRevenuePlan({
    companyId,
    projectId,
    projectRevenuePlanId,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectRevenuePlan(state, project.companyId, project.projectId, projectRevenuePlanId);
    if (record.status === "approved") {
      return copy(record);
    }
    for (const candidate of listProjectRevenuePlans({ companyId: project.companyId, projectId: project.projectId, status: "approved" })) {
      const mutableCandidate = state.projectRevenuePlans.get(candidate.projectRevenuePlanId);
      mutableCandidate.status = "superseded";
      mutableCandidate.updatedAt = nowIso(clock);
    }
    record.status = "approved";
    record.approvedAt = nowIso(clock);
    record.approvedByActorId = requireText(actorId, "actor_id_required");
    record.updatedAt = record.approvedAt;
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.approvedByActorId,
      correlationId,
      action: "project.revenue_plan.approved",
      entityType: "project_revenue_plan",
      entityId: record.projectRevenuePlanId,
      projectId: record.projectId,
      explanation: `Approved revenue plan version ${record.versionNo} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectBillingPlans({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (project.billingPlans || [])
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .slice()
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.projectBillingPlanId.localeCompare(right.projectBillingPlanId))
      .map(copy);
  }

  function createProjectBillingPlan({
    companyId,
    projectId,
    projectBillingPlanId = null,
    projectQuoteLinkId = null,
    frequencyCode = "one_off",
    triggerCode = "manual",
    startsOn = null,
    endsOn = null,
    status = "draft",
    lines = [],
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const quoteLink = normalizeOptionalText(projectQuoteLinkId)
      ? requireProjectQuoteLink(project, projectQuoteLinkId)
      : null;
    const resolvedStartsOn = normalizeRequiredDate(startsOn || project.startsOn, "project_billing_plan_start_required");
    const resolvedEndsOn = normalizeOptionalDate(endsOn || project.endsOn, "project_billing_plan_end_invalid");
    if (resolvedEndsOn && resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "project_billing_plan_date_range_invalid", "Billing plan end date cannot be earlier than start date.");
    }
    const normalizedLines = normalizeBillingPlanLines({
      lines,
      defaultPlannedInvoiceDate: quoteLink?.acceptedOn || resolvedStartsOn,
      defaultAmount: quoteLink?.totalAmount || project.contractValueAmount,
      project
    });
    const resolvedStatus = assertAllowed(status, PROJECT_BILLING_PLAN_STATUSES, "project_billing_plan_status_invalid");
    if (resolvedStatus === "active") {
      for (const candidate of project.billingPlans || []) {
        if (candidate.status === "active") {
          candidate.status = "superseded";
          candidate.updatedAt = nowIso(clock);
        }
      }
    }
    const record = {
      projectBillingPlanId: normalizeOptionalText(projectBillingPlanId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      projectQuoteLinkId: quoteLink?.projectQuoteLinkId || null,
      frequencyCode: normalizeCode(frequencyCode, "project_billing_plan_frequency_required"),
      triggerCode: normalizeCode(triggerCode, "project_billing_plan_trigger_required"),
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      status: resolvedStatus,
      currencyCode: project.currencyCode,
      lines: normalizedLines,
      totalPlannedAmount: roundMoney(normalizedLines.reduce((sum, line) => sum + Number(line.amount || 0), 0)),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    project.billingPlans.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.billing_plan.created",
      entityType: "project_billing_plan",
      entityId: record.projectBillingPlanId,
      projectId: record.projectId,
      explanation: `Created ${record.status} billing plan for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectStatusUpdates({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (project.statusUpdates || [])
      .slice()
      .sort((left, right) => left.statusDate.localeCompare(right.statusDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectStatusUpdate({
    companyId,
    projectId,
    projectStatusUpdateId = null,
    statusDate = null,
    healthCode,
    progressPercent = 0,
    blockerCodes = [],
    atRiskReason = null,
    note = null,
    sourceSystemCode = "project_core",
    externalStatusRef = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedHealthCode = assertAllowed(healthCode, PROJECT_STATUS_UPDATE_HEALTH_CODES, "project_status_update_health_invalid");
    const resolvedProgressPercent = normalizePercentage(progressPercent, "project_status_update_progress_invalid");
    const resolvedBlockerCodes = uniqueTexts(blockerCodes).map((code) => normalizeCode(code, "project_status_update_blocker_code_invalid"));
    const record = {
      projectStatusUpdateId: normalizeOptionalText(projectStatusUpdateId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      statusDate: normalizeRequiredDate(statusDate || new Date(clock()).toISOString().slice(0, 10), "project_status_update_date_required"),
      healthCode: resolvedHealthCode,
      progressPercent: resolvedProgressPercent,
      blockerCodes: resolvedBlockerCodes,
      atRiskReason: normalizeOptionalText(atRiskReason),
      note: normalizeOptionalText(note),
      sourceSystemCode: normalizeCode(sourceSystemCode, "project_status_update_source_system_required"),
      externalStatusRef: normalizeOptionalText(externalStatusRef),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    if (!Array.isArray(project.statusUpdates)) {
      project.statusUpdates = [];
    }
    project.statusUpdates.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.status_update.created",
      entityType: "project_status_update",
      entityId: record.projectStatusUpdateId,
      projectId: record.projectId,
      explanation: `Recorded ${record.healthCode} status update for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectProfitabilityAdjustments({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (project.profitabilityAdjustments || [])
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectProfitabilityAdjustment({
    companyId,
    projectId,
    projectProfitabilityAdjustmentId = null,
    impactCode,
    amount,
    effectiveDate,
    reasonCode,
    note = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = {
      projectProfitabilityAdjustmentId: normalizeOptionalText(projectProfitabilityAdjustmentId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      impactCode: assertAllowed(impactCode, PROJECT_PROFITABILITY_ADJUSTMENT_IMPACT_CODES, "project_profitability_adjustment_impact_invalid"),
      amount: normalizeMoney(amount, "project_profitability_adjustment_amount_invalid"),
      effectiveDate: normalizeRequiredDate(effectiveDate, "project_profitability_adjustment_effective_date_required"),
      reasonCode: normalizeCode(reasonCode, "project_profitability_adjustment_reason_required"),
      note: normalizeOptionalText(note),
      status: "pending_review",
      approvedAt: null,
      approvedByActorId: null,
      rejectedAt: null,
      rejectedByActorId: null,
      rejectionReason: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    project.profitabilityAdjustments.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.profitability_adjustment.created",
      entityType: "project_profitability_adjustment",
      entityId: record.projectProfitabilityAdjustmentId,
      projectId: record.projectId,
      explanation: `Opened ${record.impactCode} profitability adjustment for ${project.projectCode}.`
    });
    return copy(record);
  }

  function decideProjectProfitabilityAdjustment({
    companyId,
    projectId,
    projectProfitabilityAdjustmentId,
    decision,
    rejectionReason = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectProfitabilityAdjustment(project, projectProfitabilityAdjustmentId);
    if (record.status !== "pending_review") {
      return copy(record);
    }
    const resolvedDecision = assertAllowed(decision, ["approved", "rejected"], "project_profitability_adjustment_decision_invalid");
    record.status = resolvedDecision;
    record.updatedAt = nowIso(clock);
    if (resolvedDecision === "approved") {
      record.approvedAt = nowIso(clock);
      record.approvedByActorId = requireText(actorId, "actor_id_required");
      record.rejectedAt = null;
      record.rejectedByActorId = null;
      record.rejectionReason = null;
    } else {
      record.rejectedAt = nowIso(clock);
      record.rejectedByActorId = requireText(actorId, "actor_id_required");
      record.rejectionReason = requireText(rejectionReason, "project_profitability_adjustment_rejection_reason_required");
      record.approvedAt = null;
      record.approvedByActorId = null;
    }
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: `project.profitability_adjustment.${resolvedDecision}`,
      entityType: "project_profitability_adjustment",
      entityId: record.projectProfitabilityAdjustmentId,
      projectId: record.projectId,
      explanation: `${resolvedDecision === "approved" ? "Approved" : "Rejected"} profitability adjustment for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectInvoiceReadinessAssessments({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (project.invoiceReadinessAssessments || [])
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate) || left.assessedAt.localeCompare(right.assessedAt))
      .map(copy);
  }

  function materializeProjectInvoiceReadinessAssessment({
    companyId,
    projectId,
    cutoffDate,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const assessment = buildProjectInvoiceReadinessAssessment({
      state,
      project,
      cutoffDate,
      arPlatform,
      apPlatform,
      hrPlatform,
      timePlatform,
      payrollPlatform,
      husPlatform: resolvePlatform(getHusPlatform, husPlatform),
      clock
    });
    const existing = listProjectInvoiceReadinessAssessments({ companyId: project.companyId, projectId: project.projectId }).find(
      (candidate) => candidate.snapshotHash === assessment.snapshotHash
    );
    if (existing) {
      return existing;
    }
    const record = {
      projectInvoiceReadinessAssessmentId: crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      ...assessment,
      assessedByActorId: requireText(actorId, "actor_id_required"),
      assessedAt: nowIso(clock)
    };
    project.invoiceReadinessAssessments.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.assessedByActorId,
      correlationId,
      action: "project.invoice_readiness.assessed",
      entityType: "project_invoice_readiness_assessment",
      entityId: record.projectInvoiceReadinessAssessmentId,
      projectId: record.projectId,
      explanation: `Assessed invoice readiness for ${project.projectCode} at ${record.cutoffDate}.`
    });
    return copy(record);
  }

  function convertQuoteToProject({
    companyId,
    sourceQuoteId,
    sourceQuoteVersionId = null,
    projectId = null,
    projectCode = null,
    projectReferenceCode = null,
    displayName = null,
    startsOn = null,
    endsOn = null,
    billingModelCode = "fixed_price",
    revenueRecognitionModelCode = "over_time",
    workModelCode = "milestone_only",
    billingPlanFrequencyCode = "one_off",
    billingPlanTriggerCode = "quote_acceptance",
    externalSystemCode = "internal_ar",
    externalOpportunityId = null,
    externalOpportunityRef = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const quote = requireProjectSourceQuote({
      arPlatform,
      companyId,
      sourceQuoteId
    });
    const quoteVersion = selectProjectSourceQuoteVersion({
      quote,
      sourceQuoteVersionId
    });
    const existingProject = findProjectByQuoteLink({
      state,
      companyId,
      sourceQuoteId: quote.quoteId,
      sourceQuoteVersionId: quoteVersion.quoteVersionId
    });
    if (existingProject) {
      return {
        project: copy(existingProject),
        quoteLink: listProjectQuoteLinks({ companyId, projectId: existingProject.projectId }).find(
          (record) => record.sourceQuoteId === quote.quoteId && record.sourceQuoteVersionId === quoteVersion.quoteVersionId
        ) || null
      };
    }
    const project = createProject({
      companyId,
      projectId,
      projectCode,
      projectReferenceCode,
      displayName: displayName || quoteVersion.title,
      customerId: quote.customerId,
      startsOn: startsOn || quoteVersion.acceptedAt?.slice(0, 10) || quoteVersion.validUntil,
      endsOn,
      currencyCode: quoteVersion.currencyCode,
      status: "active",
      billingModelCode,
      revenueRecognitionModelCode,
      contractValueAmount: quoteVersion.totalAmount,
      actorId,
      correlationId
    });
    const opportunityLink =
      normalizeOptionalText(externalOpportunityId)
        ? createProjectOpportunityLink({
            companyId: project.companyId,
            projectId: project.projectId,
            externalSystemCode,
            externalOpportunityId,
            externalOpportunityRef,
            customerId: quote.customerId,
            stageCode: "accepted",
            actorId,
            correlationId
          })
        : null;
    const quoteLink = createProjectQuoteLink({
      companyId: project.companyId,
      projectId: project.projectId,
      sourceQuoteId: quote.quoteId,
      sourceQuoteVersionId: quoteVersion.quoteVersionId,
      externalSystemCode,
      externalQuoteRef: quote.quoteNo,
      acceptedOn: quoteVersion.acceptedAt?.slice(0, 10) || startsOn || project.startsOn,
      customerId: quote.customerId,
      actorId,
      correlationId
    });
    const engagement = createProjectEngagement({
      companyId: project.companyId,
      projectId: project.projectId,
      displayName: quoteVersion.title,
      customerId: quote.customerId,
      workModelCode,
      startsOn: project.startsOn,
      endsOn: project.endsOn,
      status: "active",
      externalOpportunityRef: externalOpportunityRef || externalOpportunityId,
      externalQuoteRef: quote.quoteNo,
      actorId,
      correlationId
    });
    const workModel = createProjectWorkModel({
      companyId: project.companyId,
      projectId: project.projectId,
      projectEngagementId: engagement.projectEngagementId,
      modelCode: workModelCode,
      title: `${quoteVersion.title} work model`,
      operationalPackCode: ["work_order", "service_order", "construction_stage"].includes(workModelCode) ? "field_optional" : "general_core",
      requiresWorkOrders: ["work_order", "service_order", "construction_stage"].includes(workModelCode),
      requiresMilestones: ["milestone_only", "construction_stage", "fixed_scope"].includes(workModelCode),
      actorId,
      correlationId
    });
    const revenuePlan = createProjectRevenuePlan({
      companyId: project.companyId,
      projectId: project.projectId,
      versionLabel: `Quote ${quote.quoteNo} handoff`,
      lines: [
        {
          recognitionDate: project.startsOn,
          triggerTypeCode: "quote_acceptance",
          amount: quoteVersion.totalAmount,
          note: `Generated from accepted quote ${quote.quoteNo}.`
        }
      ],
      actorId,
      correlationId
    });
    const approvedRevenuePlan = approveProjectRevenuePlan({
      companyId: project.companyId,
      projectId: project.projectId,
      projectRevenuePlanId: revenuePlan.projectRevenuePlanId,
      actorId,
      correlationId
    });
    const billingPlan = createProjectBillingPlan({
      companyId: project.companyId,
      projectId: project.projectId,
      projectQuoteLinkId: quoteLink.projectQuoteLinkId,
      frequencyCode: billingPlanFrequencyCode,
      triggerCode: billingPlanTriggerCode,
      startsOn: project.startsOn,
      endsOn: project.endsOn,
      status: "active",
      actorId,
      correlationId
    });
    const statusUpdate = createProjectStatusUpdate({
      companyId: project.companyId,
      projectId: project.projectId,
      statusDate: project.startsOn,
      healthCode: "green",
      progressPercent: 0,
      note: `Created from accepted quote ${quote.quoteNo}.`,
      sourceSystemCode: externalSystemCode,
      externalStatusRef: quote.quoteId,
      actorId,
      correlationId
    });
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "project.quote_handoff.completed",
      entityType: "project",
      entityId: project.projectId,
      projectId: project.projectId,
      explanation: `Converted accepted quote ${quote.quoteNo} into project ${project.projectCode}.`
    });
    return {
      project,
      opportunityLink,
      quoteLink,
      engagement,
      workModel,
      revenuePlan: approvedRevenuePlan,
      billingPlan,
      statusUpdate
    };
  }

  function listProjectProfitabilitySnapshots({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (state.projectProfitabilitySnapshotIdsByProject.get(project.projectId) || [])
      .map((snapshotId) => state.projectProfitabilitySnapshots.get(snapshotId))
      .filter(Boolean)
      .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function materializeProjectProfitabilitySnapshot({
    companyId,
    projectId,
    cutoffDate,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const model = buildProjectMetricsModel({
      state,
      project,
      cutoffDate,
      arPlatform,
      apPlatform,
      hrPlatform,
      timePlatform,
      payrollPlatform,
      husPlatform: resolvePlatform(getHusPlatform, husPlatform)
    });
    const approvedRevenuePlan = listProjectRevenuePlans({
      companyId: project.companyId,
      projectId: project.projectId,
      status: "approved"
    }).pop() || null;
    const plannedRevenueAmount = approvedRevenuePlan ? calculateRevenuePlanAmountAtCutoff(approvedRevenuePlan, model.cutoffDate) : 0;
    const record = {
      projectProfitabilitySnapshotId: crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      cutoffDate: model.cutoffDate,
      reportingPeriod: model.reportingPeriod,
      plannedRevenueAmount,
      billedRevenueAmount: model.billedRevenueAmount,
      recognizedRevenueAmount: model.recognizedRevenueAmount,
      actualCostAmount: model.actualCostAmount,
      currentMarginAmount: model.currentMarginAmount,
      forecastMarginAmount: model.forecastMarginAmount,
      workPackageCount: listProjectWorkPackages({ companyId: project.companyId, projectId: project.projectId }).length,
      deliveryMilestoneCount: listProjectDeliveryMilestones({ companyId: project.companyId, projectId: project.projectId }).length,
      openDeviationCount: listProjectDeviations({ companyId: project.companyId, projectId: project.projectId }).filter((record) => !["resolved", "closed"].includes(record.status)).length,
      approvedRevenuePlanId: approvedRevenuePlan?.projectRevenuePlanId || null,
      sourceSnapshotRefs: {
        costSnapshotId: listProjectCostSnapshots({ companyId: project.companyId, projectId: project.projectId }).at(-1)?.projectCostSnapshotId || null,
        wipSnapshotId: listProjectWipSnapshots({ companyId: project.companyId, projectId: project.projectId }).at(-1)?.projectWipSnapshotId || null,
        forecastSnapshotId: listProjectForecastSnapshots({ companyId: project.companyId, projectId: project.projectId }).at(-1)?.projectForecastSnapshotId || null
      },
      snapshotHash: hashObject({
        projectId: project.projectId,
        cutoffDate: model.cutoffDate,
        plannedRevenueAmount,
        billedRevenueAmount: model.billedRevenueAmount,
        recognizedRevenueAmount: model.recognizedRevenueAmount,
        actualCostAmount: model.actualCostAmount,
        currentMarginAmount: model.currentMarginAmount,
        forecastMarginAmount: model.forecastMarginAmount,
        approvedRevenuePlanId: approvedRevenuePlan?.projectRevenuePlanId || null
      }),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    const existing = listProjectProfitabilitySnapshots({ companyId: project.companyId, projectId: project.projectId }).find(
      (candidate) => candidate.snapshotHash === record.snapshotHash
    );
    if (existing) {
      return existing;
    }
    state.projectProfitabilitySnapshots.set(record.projectProfitabilitySnapshotId, record);
    appendToIndex(state.projectProfitabilitySnapshotIdsByProject, project.projectId, record.projectProfitabilitySnapshotId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.profitability.materialized",
      entityType: "project_profitability_snapshot",
      entityId: record.projectProfitabilitySnapshotId,
      projectId: record.projectId,
      explanation: `Materialized profitability snapshot for ${project.projectCode} at ${record.cutoffDate}.`
    });
    return copy(record);
  }

  function listProjectBudgetVersions({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (state.budgetVersionIdsByProject.get(project.projectId) || [])
      .map((budgetVersionId) => state.budgetVersions.get(budgetVersionId))
      .filter(Boolean)
      .sort((left, right) => left.versionNo - right.versionNo)
      .map(copy);
  }

  function createProjectBudgetVersion({
    companyId,
    projectId,
    budgetName,
    validFrom,
    lines,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const normalizedLines = normalizeBudgetLines(lines);
    if (normalizedLines.length === 0) {
      throw createError(400, "project_budget_lines_required", "Project budgets require at least one line.");
    }
    const versionNo = nextVersionNo(state, project.projectId);
    const record = {
      projectBudgetVersionId: crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      versionNo,
      budgetName: requireText(budgetName, "project_budget_name_required"),
      validFrom: normalizeRequiredDate(validFrom, "project_budget_valid_from_required"),
      status: "approved",
      totals: summarizeBudgetLines(normalizedLines),
      lines: normalizedLines,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.budgetVersions.set(record.projectBudgetVersionId, record);
    appendToIndex(state.budgetVersionIdsByProject, project.projectId, record.projectBudgetVersionId);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.budget.approved",
      entityType: "project_budget_version",
      entityId: record.projectBudgetVersionId,
      projectId: project.projectId,
      explanation: `Approved budget version ${record.versionNo} for project ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectResourceAllocations({ companyId, projectId, reportingPeriod = null, employmentId = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedReportingPeriod = reportingPeriod
      ? normalizeReportingPeriod(reportingPeriod, "project_reporting_period_invalid")
      : null;
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    return (state.resourceAllocationIdsByProject.get(project.projectId) || [])
      .map((allocationId) => state.resourceAllocations.get(allocationId))
      .filter(Boolean)
      .filter((allocation) => (resolvedReportingPeriod ? allocation.reportingPeriod === resolvedReportingPeriod : true))
      .filter((allocation) => (resolvedEmploymentId ? allocation.employmentId === resolvedEmploymentId : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.employmentId.localeCompare(right.employmentId))
      .map(copy);
  }

  function createProjectResourceAllocation({
    companyId,
    projectId,
    employmentId,
    reportingPeriod,
    plannedMinutes,
    billableMinutes = null,
    billRateAmount,
    costRateAmount,
    activityCode = null,
    status = "planned",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    findEmploymentContextByEmploymentId({
      companyId: project.companyId,
      employmentId: resolvedEmploymentId,
      hrPlatform
    });
    const record = {
      projectResourceAllocationId: crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      employmentId: resolvedEmploymentId,
      reportingPeriod: normalizeReportingPeriod(reportingPeriod, "project_reporting_period_required"),
      plannedMinutes: normalizeWholeNumber(plannedMinutes, "project_planned_minutes_invalid"),
      billableMinutes:
        billableMinutes == null
          ? normalizeWholeNumber(plannedMinutes, "project_planned_minutes_invalid")
          : normalizeWholeNumber(billableMinutes, "project_billable_minutes_invalid"),
      billRateAmount: normalizeMoney(billRateAmount, "project_bill_rate_invalid"),
      costRateAmount: normalizeMoney(costRateAmount, "project_cost_rate_invalid"),
      activityCode: normalizeOptionalText(activityCode),
      status: assertAllowed(status, PROJECT_RESOURCE_ALLOCATION_STATUSES, "project_resource_status_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.resourceAllocations.set(record.projectResourceAllocationId, record);
    appendToIndex(state.resourceAllocationIdsByProject, project.projectId, record.projectResourceAllocationId);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.resource_allocation.created",
      entityType: "project_resource_allocation",
      entityId: record.projectResourceAllocationId,
      projectId: project.projectId,
      explanation: `Created resource allocation for employment ${record.employmentId} in ${record.reportingPeriod}.`
    });
    return copy(record);
  }

  function listProjectCapacityReservations({ companyId, projectId, status = null, employmentId = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    return (project.capacityReservations || [])
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .filter((record) => (resolvedEmploymentId ? record.employmentId === resolvedEmploymentId : true))
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectCapacityReservation({
    companyId,
    projectId,
    projectCapacityReservationId = null,
    employmentId = null,
    roleCode,
    skillCodes = [],
    startsOn,
    endsOn,
    reservedMinutes,
    billableMinutes = null,
    note = null,
    status = "draft",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    if (resolvedEmploymentId) {
      findEmploymentContextByEmploymentId({
        companyId: project.companyId,
        employmentId: resolvedEmploymentId,
        hrPlatform
      });
    }
    const resolvedStartsOn = normalizeRequiredDate(startsOn, "project_capacity_reservation_start_required");
    const resolvedEndsOn = normalizeRequiredDate(endsOn, "project_capacity_reservation_end_required");
    if (resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "project_capacity_reservation_range_invalid", "Capacity reservation end date cannot be earlier than start date.");
    }
    const resolvedReservedMinutes = normalizeWholeNumber(reservedMinutes, "project_capacity_reservation_minutes_invalid");
    if (resolvedReservedMinutes <= 0) {
      throw createError(400, "project_capacity_reservation_minutes_invalid", "Capacity reservation minutes must be greater than zero.");
    }
    const record = {
      projectCapacityReservationId: normalizeOptionalText(projectCapacityReservationId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      employmentId: resolvedEmploymentId,
      roleCode: normalizeCode(roleCode, "project_capacity_reservation_role_required"),
      skillCodes: uniqueTexts(skillCodes).map((code) => normalizeCode(code, "project_capacity_reservation_skill_invalid")),
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      reservedMinutes: resolvedReservedMinutes,
      billableMinutes:
        billableMinutes == null
          ? resolvedReservedMinutes
          : normalizeWholeNumber(billableMinutes, "project_capacity_reservation_billable_minutes_invalid"),
      note: normalizeOptionalText(note),
      status: assertAllowed(status, PROJECT_CAPACITY_RESERVATION_STATUSES, "project_capacity_reservation_status_invalid"),
      approvedAt: null,
      approvedByActorId: null,
      releasedAt: null,
      releasedByActorId: null,
      cancelledAt: null,
      cancelledByActorId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    if (!Array.isArray(project.capacityReservations)) {
      project.capacityReservations = [];
    }
    project.capacityReservations.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.capacity_reservation.created",
      entityType: "project_capacity_reservation",
      entityId: record.projectCapacityReservationId,
      projectId: project.projectId,
      explanation: `Created ${record.status} capacity reservation for ${project.projectCode}.`
    });
    return copy(record);
  }

  function transitionProjectCapacityReservationStatus({
    companyId,
    projectId,
    projectCapacityReservationId,
    nextStatus,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectCapacityReservation(project, projectCapacityReservationId);
    const resolvedNextStatus = assertAllowed(
      nextStatus,
      PROJECT_CAPACITY_RESERVATION_STATUSES,
      "project_capacity_reservation_status_invalid"
    );
    assertProjectCapacityReservationTransition(record.status, resolvedNextStatus);
    if (resolvedNextStatus === "approved") {
      record.approvedAt = nowIso(clock);
      record.approvedByActorId = requireText(actorId, "actor_id_required");
    }
    if (resolvedNextStatus === "released") {
      record.releasedAt = nowIso(clock);
      record.releasedByActorId = requireText(actorId, "actor_id_required");
    }
    if (resolvedNextStatus === "cancelled") {
      record.cancelledAt = nowIso(clock);
      record.cancelledByActorId = requireText(actorId, "actor_id_required");
    }
    record.status = resolvedNextStatus;
    record.updatedAt = nowIso(clock);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "project.capacity_reservation.status_changed",
      entityType: "project_capacity_reservation",
      entityId: record.projectCapacityReservationId,
      projectId: project.projectId,
      explanation: `Capacity reservation ${record.projectCapacityReservationId} moved to ${record.status}.`
    });
    return copy(record);
  }

  function listProjectAssignmentPlans({ companyId, projectId, status = null, employmentId = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    return (project.assignmentPlans || [])
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .filter((record) => (resolvedEmploymentId ? record.employmentId === resolvedEmploymentId : true))
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectAssignmentPlan({
    companyId,
    projectId,
    projectAssignmentPlanId = null,
    employmentId = null,
    projectWorkPackageId = null,
    projectCapacityReservationId = null,
    roleCode,
    skillCodes = [],
    startsOn,
    endsOn,
    plannedMinutes,
    billableMinutes = null,
    deliveryModeCode = "hybrid",
    note = null,
    status = "draft",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    if (resolvedEmploymentId) {
      findEmploymentContextByEmploymentId({
        companyId: project.companyId,
        employmentId: resolvedEmploymentId,
        hrPlatform
      });
    }
    const resolvedWorkPackageId = normalizeOptionalText(projectWorkPackageId);
    if (resolvedWorkPackageId) {
      requireProjectWorkPackage(state, project.companyId, project.projectId, resolvedWorkPackageId);
    }
    const resolvedCapacityReservationId = normalizeOptionalText(projectCapacityReservationId);
    const capacityReservation = resolvedCapacityReservationId ? requireProjectCapacityReservation(project, resolvedCapacityReservationId) : null;
    const resolvedRoleCode = normalizeCode(roleCode, "project_assignment_plan_role_required");
    if (capacityReservation) {
      if (capacityReservation.roleCode !== resolvedRoleCode) {
        throw createError(409, "project_assignment_plan_role_mismatch", "Assignment role must match the linked capacity reservation.");
      }
      if (resolvedEmploymentId && capacityReservation.employmentId && capacityReservation.employmentId !== resolvedEmploymentId) {
        throw createError(409, "project_assignment_plan_employment_mismatch", "Assignment employment must match the linked capacity reservation.");
      }
    }
    const resolvedStartsOn = normalizeRequiredDate(startsOn, "project_assignment_plan_start_required");
    const resolvedEndsOn = normalizeRequiredDate(endsOn, "project_assignment_plan_end_required");
    if (resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "project_assignment_plan_range_invalid", "Assignment end date cannot be earlier than start date.");
    }
    const resolvedPlannedMinutes = normalizeWholeNumber(plannedMinutes, "project_assignment_plan_minutes_invalid");
    if (resolvedPlannedMinutes <= 0) {
      throw createError(400, "project_assignment_plan_minutes_invalid", "Assignment planned minutes must be greater than zero.");
    }
    const record = {
      projectAssignmentPlanId: normalizeOptionalText(projectAssignmentPlanId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      employmentId: resolvedEmploymentId,
      projectWorkPackageId: resolvedWorkPackageId,
      projectCapacityReservationId: resolvedCapacityReservationId,
      roleCode: resolvedRoleCode,
      skillCodes: uniqueTexts(skillCodes).map((code) => normalizeCode(code, "project_assignment_plan_skill_invalid")),
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      plannedMinutes: resolvedPlannedMinutes,
      billableMinutes:
        billableMinutes == null
          ? resolvedPlannedMinutes
          : normalizeWholeNumber(billableMinutes, "project_assignment_plan_billable_minutes_invalid"),
      deliveryModeCode: normalizeCode(deliveryModeCode, "project_assignment_plan_delivery_mode_required"),
      note: normalizeOptionalText(note),
      status: assertAllowed(status, PROJECT_ASSIGNMENT_PLAN_STATUSES, "project_assignment_plan_status_invalid"),
      approvedAt: null,
      approvedByActorId: null,
      startedAt: null,
      startedByActorId: null,
      completedAt: null,
      completedByActorId: null,
      cancelledAt: null,
      cancelledByActorId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    if (!Array.isArray(project.assignmentPlans)) {
      project.assignmentPlans = [];
    }
    project.assignmentPlans.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.assignment_plan.created",
      entityType: "project_assignment_plan",
      entityId: record.projectAssignmentPlanId,
      projectId: project.projectId,
      explanation: `Created ${record.status} assignment plan for ${project.projectCode}.`
    });
    return copy(record);
  }

  function transitionProjectAssignmentPlanStatus({
    companyId,
    projectId,
    projectAssignmentPlanId,
    nextStatus,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectAssignmentPlan(project, projectAssignmentPlanId);
    const resolvedNextStatus = assertAllowed(nextStatus, PROJECT_ASSIGNMENT_PLAN_STATUSES, "project_assignment_plan_status_invalid");
    assertProjectAssignmentPlanTransition(record.status, resolvedNextStatus);
    if (resolvedNextStatus === "approved") {
      if (record.projectCapacityReservationId) {
        const linkedReservation = requireProjectCapacityReservation(project, record.projectCapacityReservationId);
        if (linkedReservation.status !== "approved") {
          throw createError(
            409,
            "project_assignment_plan_capacity_not_approved",
            "Assignment plans linked to a capacity reservation require an approved reservation before approval."
          );
        }
      }
      record.approvedAt = nowIso(clock);
      record.approvedByActorId = requireText(actorId, "actor_id_required");
    }
    if (resolvedNextStatus === "in_progress") {
      record.startedAt = nowIso(clock);
      record.startedByActorId = requireText(actorId, "actor_id_required");
    }
    if (resolvedNextStatus === "completed") {
      record.completedAt = nowIso(clock);
      record.completedByActorId = requireText(actorId, "actor_id_required");
    }
    if (resolvedNextStatus === "cancelled") {
      record.cancelledAt = nowIso(clock);
      record.cancelledByActorId = requireText(actorId, "actor_id_required");
    }
    record.status = resolvedNextStatus;
    record.updatedAt = nowIso(clock);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "project.assignment_plan.status_changed",
      entityType: "project_assignment_plan",
      entityId: record.projectAssignmentPlanId,
      projectId: project.projectId,
      explanation: `Assignment plan ${record.projectAssignmentPlanId} moved to ${record.status}.`
    });
    return copy(record);
  }

  function listProjectRisks({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (project.risks || [])
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.identifiedOn.localeCompare(right.identifiedOn) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectRisk({
    companyId,
    projectId,
    projectRiskId = null,
    title,
    description = null,
    categoryCode = "delivery",
    severityCode,
    probabilityCode,
    ownerEmployeeId = null,
    mitigationPlan = null,
    dueDate = null,
    identifiedOn = null,
    sourceProjectStatusUpdateId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedOwnerEmployeeId = normalizeOptionalText(ownerEmployeeId);
    if (resolvedOwnerEmployeeId) {
      findEmploymentContextByEmployeeId({
        companyId: project.companyId,
        employeeId: resolvedOwnerEmployeeId,
        hrPlatform
      });
    }
    const resolvedStatusUpdateId = normalizeOptionalText(sourceProjectStatusUpdateId);
    if (resolvedStatusUpdateId) {
      requireProjectStatusUpdate(project, resolvedStatusUpdateId);
    }
    const record = {
      projectRiskId: normalizeOptionalText(projectRiskId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      title: requireText(title, "project_risk_title_required"),
      description: normalizeOptionalText(description),
      categoryCode: normalizeCode(categoryCode, "project_risk_category_required"),
      severityCode: assertAllowed(severityCode, PROJECT_RISK_SEVERITY_CODES, "project_risk_severity_invalid"),
      probabilityCode: assertAllowed(probabilityCode, PROJECT_RISK_PROBABILITY_CODES, "project_risk_probability_invalid"),
      status: "open",
      ownerEmployeeId: resolvedOwnerEmployeeId,
      mitigationPlan: normalizeOptionalText(mitigationPlan),
      dueDate: normalizeOptionalDate(dueDate, "project_risk_due_date_invalid"),
      identifiedOn: normalizeRequiredDate(identifiedOn || new Date(clock()).toISOString().slice(0, 10), "project_risk_identified_on_required"),
      sourceProjectStatusUpdateId: resolvedStatusUpdateId,
      acceptedAt: null,
      closedAt: null,
      closedByActorId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    if (!Array.isArray(project.risks)) {
      project.risks = [];
    }
    project.risks.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.risk.created",
      entityType: "project_risk",
      entityId: record.projectRiskId,
      projectId: project.projectId,
      explanation: `Created ${record.severityCode}/${record.probabilityCode} risk for ${project.projectCode}.`
    });
    return copy(record);
  }

  function transitionProjectRiskStatus({
    companyId,
    projectId,
    projectRiskId,
    nextStatus,
    mitigationPlan = undefined,
    dueDate = undefined,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectRisk(project, projectRiskId);
    const resolvedNextStatus = assertAllowed(nextStatus, PROJECT_RISK_STATUSES, "project_risk_status_invalid");
    assertProjectRiskTransition(record.status, resolvedNextStatus);
    if (mitigationPlan !== undefined) {
      record.mitigationPlan = normalizeOptionalText(mitigationPlan);
    }
    if (dueDate !== undefined) {
      record.dueDate = normalizeOptionalDate(dueDate, "project_risk_due_date_invalid");
    }
    if (resolvedNextStatus === "accepted") {
      record.acceptedAt = nowIso(clock);
    }
    if (resolvedNextStatus === "closed") {
      record.closedAt = nowIso(clock);
      record.closedByActorId = requireText(actorId, "actor_id_required");
    }
    record.status = resolvedNextStatus;
    record.updatedAt = nowIso(clock);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "project.risk.status_changed",
      entityType: "project_risk",
      entityId: record.projectRiskId,
      projectId: project.projectId,
      explanation: `Project risk ${record.projectRiskId} moved to ${record.status}.`
    });
    return copy(record);
  }

  function listProjectPortfolioNodes({ companyId, status = null, healthCode = null, atRiskOnly = false, cutoffDate = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalText(status);
    const resolvedHealthCode = normalizeOptionalText(healthCode);
    return listProjects({ companyId: resolvedCompanyId, status: resolvedStatus })
      .map((project) =>
        buildProjectPortfolioNode({
          state,
          companyId: resolvedCompanyId,
          project,
          cutoffDate
        })
      )
      .filter((node) => (resolvedHealthCode ? node.healthCode === resolvedHealthCode : true))
      .filter((node) => (atRiskOnly ? node.atRiskFlag === true : true))
      .sort((left, right) => left.projectCode.localeCompare(right.projectCode) || left.projectId.localeCompare(right.projectId))
      .map(copy);
  }

  function getProjectPortfolioSummary({ companyId, cutoffDate = null } = {}) {
    const nodes = listProjectPortfolioNodes({ companyId, cutoffDate });
    const roleDemandMap = new Map();
    const skillDemandMap = new Map();
    const employmentCapacityMap = new Map();
    for (const node of nodes) {
      for (const item of node.roleDemand || []) {
        accumulatePortfolioDemand(roleDemandMap, item.roleCode, item);
      }
      for (const item of node.skillDemand || []) {
        accumulatePortfolioDemand(skillDemandMap, item.skillCode, item);
      }
      for (const item of node.employmentCapacity || []) {
        accumulatePortfolioDemand(employmentCapacityMap, item.employmentId, item);
      }
    }
    return {
      companyId: requireText(companyId, "company_id_required"),
      totalProjectCount: nodes.length,
      activeProjectCount: nodes.filter((node) => node.projectStatus === "active").length,
      atRiskProjectCount: nodes.filter((node) => node.atRiskFlag === true).length,
      blockedProjectCount: nodes.filter((node) => node.blockerCount > 0).length,
      totalOpenRiskCount: nodes.reduce((sum, node) => sum + node.openRiskCount, 0),
      totalHighRiskCount: nodes.reduce((sum, node) => sum + node.highRiskCount, 0),
      totalCriticalRiskCount: nodes.reduce((sum, node) => sum + node.criticalRiskCount, 0),
      totalBudgetCostAmount: roundMoney(nodes.reduce((sum, node) => sum + node.budgetCostAmount, 0)),
      totalBudgetRevenueAmount: roundMoney(nodes.reduce((sum, node) => sum + node.budgetRevenueAmount, 0)),
      totalActualCostAmount: roundMoney(nodes.reduce((sum, node) => sum + node.actualCostAmount, 0)),
      totalBilledRevenueAmount: roundMoney(nodes.reduce((sum, node) => sum + node.billedRevenueAmount, 0)),
      totalForecastCostAtCompletionAmount: roundMoney(nodes.reduce((sum, node) => sum + node.forecastCostAtCompletionAmount, 0)),
      totalForecastRevenueAtCompletionAmount: roundMoney(nodes.reduce((sum, node) => sum + node.forecastRevenueAtCompletionAmount, 0)),
      totalCurrentMarginAmount: roundMoney(nodes.reduce((sum, node) => sum + node.currentMarginAmount, 0)),
      totalForecastMarginAmount: roundMoney(nodes.reduce((sum, node) => sum + node.forecastMarginAmount, 0)),
      totalReservedMinutes: nodes.reduce((sum, node) => sum + node.reservedMinutes, 0),
      totalAssignedMinutes: nodes.reduce((sum, node) => sum + node.assignedMinutes, 0),
      totalActualMinutes: nodes.reduce((sum, node) => sum + node.actualMinutes, 0),
      roleDemand: [...roleDemandMap.values()].sort((left, right) => String(left.roleCode).localeCompare(String(right.roleCode))),
      skillDemand: [...skillDemandMap.values()].sort((left, right) => String(left.skillCode).localeCompare(String(right.skillCode))),
      employmentCapacity: [...employmentCapacityMap.values()].sort((left, right) => String(left.employmentId).localeCompare(String(right.employmentId))),
      items: nodes
    };
  }

  function listProjectCostSnapshots({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (state.costSnapshotIdsByProject.get(project.projectId) || [])
      .map((snapshotId) => state.costSnapshots.get(snapshotId))
      .filter(Boolean)
      .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function listProjectPayrollCostAllocations({
    companyId,
    projectId,
    projectCostSnapshotId = null,
    payRunId = null,
    employmentId = null
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedSnapshotId = normalizeOptionalText(projectCostSnapshotId);
    const resolvedPayRunId = normalizeOptionalText(payRunId);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    if (resolvedSnapshotId) {
      const snapshot = state.costSnapshots.get(resolvedSnapshotId);
      if (!snapshot || snapshot.companyId !== project.companyId || snapshot.projectId !== project.projectId) {
        throw createError(404, "project_cost_snapshot_not_found", "Project cost snapshot was not found.");
      }
    }
    const sourceIds = resolvedSnapshotId
      ? state.projectPayrollCostAllocationIdsBySnapshot.get(resolvedSnapshotId) || []
      : state.projectPayrollCostAllocationIdsByProject.get(project.projectId) || [];
    return sourceIds
      .map((allocationId) => state.projectPayrollCostAllocations.get(allocationId))
      .filter(Boolean)
      .filter((allocation) => (resolvedPayRunId ? allocation.payRunId === resolvedPayRunId : true))
      .filter((allocation) => (resolvedEmploymentId ? allocation.employmentId === resolvedEmploymentId : true))
      .sort(
        (left, right) =>
          left.reportingPeriod.localeCompare(right.reportingPeriod) ||
          left.payDate.localeCompare(right.payDate) ||
          left.createdAt.localeCompare(right.createdAt) ||
          left.projectPayrollCostAllocationId.localeCompare(right.projectPayrollCostAllocationId)
      )
      .map(copy);
  }

  function materializeProjectCostSnapshot({
    companyId,
    projectId,
    cutoffDate,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const model = buildProjectMetricsModel({
      state,
      project,
      cutoffDate,
      arPlatform,
      apPlatform,
      hrPlatform,
      timePlatform,
      payrollPlatform,
      husPlatform: resolvePlatform(getHusPlatform, husPlatform)
    });
    const existing = listProjectCostSnapshots({ companyId: project.companyId, projectId: project.projectId }).find(
      (candidate) => candidate.snapshotHash === model.snapshotHash
    );
    if (existing) {
      if (
        listProjectPayrollCostAllocations({
          companyId: project.companyId,
          projectId: project.projectId,
          projectCostSnapshotId: existing.projectCostSnapshotId
        }).length === 0 &&
        model.payrollAllocations.length > 0
      ) {
        persistProjectPayrollCostAllocations(state, existing.projectCostSnapshotId, model.payrollAllocations, clock);
      }
      return existing;
    }
    const record = {
      projectCostSnapshotId: crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      cutoffDate: model.cutoffDate,
      reportingPeriod: model.reportingPeriod,
      actualCostAmount: model.actualCostAmount,
      actualMinutes: model.actualMinutes,
      billedRevenueAmount: model.billedRevenueAmount,
      recognizedRevenueAmount: model.recognizedRevenueAmount,
      costBreakdown: model.costBreakdown,
      sourceCounts: model.sourceCounts,
      snapshotHash: model.snapshotHash,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.costSnapshots.set(record.projectCostSnapshotId, record);
    appendToIndex(state.costSnapshotIdsByProject, project.projectId, record.projectCostSnapshotId);
    persistProjectPayrollCostAllocations(state, record.projectCostSnapshotId, model.payrollAllocations, clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.cost_snapshot.materialized",
      entityType: "project_cost_snapshot",
      entityId: record.projectCostSnapshotId,
      projectId: project.projectId,
      explanation: `Materialized project cost snapshot for ${project.projectCode} at ${record.cutoffDate}.`
    });
    return copy(record);
  }

  function listProjectWipSnapshots({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (state.wipSnapshotIdsByProject.get(project.projectId) || [])
      .map((snapshotId) => state.wipSnapshots.get(snapshotId))
      .filter(Boolean)
      .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function materializeProjectWipSnapshot({
    companyId,
    projectId,
    cutoffDate,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const model = buildProjectMetricsModel({
      state,
      project,
      cutoffDate,
      arPlatform,
      apPlatform,
      hrPlatform,
      timePlatform,
      payrollPlatform,
      husPlatform: resolvePlatform(getHusPlatform, husPlatform)
    });
    const existing = listProjectWipSnapshots({ companyId: project.companyId, projectId: project.projectId }).find(
      (candidate) => candidate.snapshotHash === model.snapshotHash
    );
    if (existing) {
      return existing;
    }
    const record = {
      projectWipSnapshotId: crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      cutoffDate: model.cutoffDate,
      reportingPeriod: model.reportingPeriod,
      approvedValueAmount: model.approvedValueAmount,
      billedAmount: model.billedRevenueAmount,
      wipAmount: model.wipAmount,
      deferredRevenueAmount: model.deferredRevenueAmount,
      status: model.snapshotStatus,
      explanationCodes: model.explanationCodes,
      snapshotHash: model.snapshotHash,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.wipSnapshots.set(record.projectWipSnapshotId, record);
    appendToIndex(state.wipSnapshotIdsByProject, project.projectId, record.projectWipSnapshotId);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.wip_snapshot.materialized",
      entityType: "project_wip_snapshot",
      entityId: record.projectWipSnapshotId,
      projectId: project.projectId,
      explanation: `Materialized WIP snapshot for ${project.projectCode} at ${record.cutoffDate}.`
    });
    return copy(record);
  }

  function listProjectForecastSnapshots({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (state.forecastSnapshotIdsByProject.get(project.projectId) || [])
      .map((snapshotId) => state.forecastSnapshots.get(snapshotId))
      .filter(Boolean)
      .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function materializeProjectForecastSnapshot({
    companyId,
    projectId,
    cutoffDate,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const model = buildProjectMetricsModel({
      state,
      project,
      cutoffDate,
      arPlatform,
      apPlatform,
      hrPlatform,
      timePlatform,
      payrollPlatform,
      husPlatform: resolvePlatform(getHusPlatform, husPlatform)
    });
    const existing = listProjectForecastSnapshots({ companyId: project.companyId, projectId: project.projectId }).find(
      (candidate) => candidate.snapshotHash === model.snapshotHash
    );
    if (existing) {
      return existing;
    }
    const record = {
      projectForecastSnapshotId: crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      cutoffDate: model.cutoffDate,
      reportingPeriod: model.reportingPeriod,
      actualCostAmount: model.actualCostAmount,
      remainingBudgetCostAmount: model.remainingBudgetCostAmount,
      forecastCostAtCompletionAmount: model.forecastCostAtCompletionAmount,
      billedRevenueAmount: model.billedRevenueAmount,
      remainingBudgetRevenueAmount: model.remainingBudgetRevenueAmount,
      forecastRevenueAtCompletionAmount: model.forecastRevenueAtCompletionAmount,
      currentMarginAmount: model.currentMarginAmount,
      forecastMarginAmount: model.forecastMarginAmount,
      resourceLoadPercent: model.resourceLoadPercent,
      snapshotHash: model.snapshotHash,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.forecastSnapshots.set(record.projectForecastSnapshotId, record);
    appendToIndex(state.forecastSnapshotIdsByProject, project.projectId, record.projectForecastSnapshotId);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.forecast_snapshot.materialized",
      entityType: "project_forecast_snapshot",
      entityId: record.projectForecastSnapshotId,
      projectId: project.projectId,
      explanation: `Materialized forecast snapshot for ${project.projectCode} at ${record.cutoffDate}.`
    });
    return copy(record);
  }

  function listProjectChangeOrders({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return project.changeOrders
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectChangeOrder({
    companyId,
    projectId,
    projectChangeOrderId = null,
    scopeCode,
    title,
    description = null,
    linkedWorkOrderId = null,
    revenueImpactAmount = 0,
    costImpactAmount = 0,
    scheduleImpactMinutes = 0,
    customerApprovalRequiredFlag = true,
    quoteReference = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = {
      projectChangeOrderId: normalizeOptionalText(projectChangeOrderId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      scopeCode: assertAllowed(scopeCode, PROJECT_CHANGE_ORDER_SCOPE_CODES, "project_change_order_scope_invalid"),
      title: requireText(title, "project_change_order_title_required"),
      description: normalizeOptionalText(description),
      linkedWorkOrderId: normalizeOptionalText(linkedWorkOrderId),
      revenueImpactAmount: normalizeMoney(revenueImpactAmount, "project_change_order_revenue_invalid"),
      costImpactAmount: normalizeMoney(costImpactAmount, "project_change_order_cost_invalid"),
      scheduleImpactMinutes: normalizeWholeNumber(scheduleImpactMinutes, "project_change_order_schedule_invalid"),
      customerApprovalRequiredFlag: customerApprovalRequiredFlag === true,
      customerApprovedAt: null,
      pricedAt: null,
      pricedByActorId: null,
      appliedAt: null,
      appliedByActorId: null,
      appliedRevenuePlanId: null,
      appliedBillingPlanId: null,
      status: "draft",
      quoteReference: normalizeOptionalText(quoteReference),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    project.changeOrders.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.change_order.created",
      entityType: "project_change_order",
      entityId: record.projectChangeOrderId,
      projectId: project.projectId,
      explanation: `Created ${record.scopeCode} change order ${record.projectChangeOrderId} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function transitionProjectChangeOrderStatus({
    companyId,
    projectId,
    projectChangeOrderId,
    nextStatus,
    customerApprovedAt = null,
    effectiveDate = null,
    billingPlanFrequencyCode = null,
    billingPlanTriggerCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectChangeOrder(project, projectChangeOrderId);
    const resolvedNextStatus = assertAllowed(nextStatus, PROJECT_CHANGE_ORDER_STATUSES, "project_change_order_status_invalid");
    assertProjectChangeOrderTransition(record.status, resolvedNextStatus);
    if (resolvedNextStatus === "priced") {
      record.pricedAt = nowIso(clock);
      record.pricedByActorId = requireText(actorId, "actor_id_required");
    }
    if (resolvedNextStatus === "approved" && record.customerApprovalRequiredFlag) {
      record.customerApprovedAt = normalizeRequiredDate(
        customerApprovedAt || new Date(clock()).toISOString().slice(0, 10),
        "project_change_order_customer_approval_required"
      );
    }
    if (resolvedNextStatus === "applied") {
      const appliedOutcome = applyProjectChangeOrder({
        state,
        project,
        record,
        effectiveDate,
        billingPlanFrequencyCode,
        billingPlanTriggerCode,
        actorId,
        correlationId,
        clock,
        createProjectRevenuePlan,
        approveProjectRevenuePlan,
        createProjectBillingPlan,
        listProjectRevenuePlans,
        listProjectBillingPlans
      });
      record.appliedAt = appliedOutcome.appliedAt;
      record.appliedByActorId = requireText(actorId, "actor_id_required");
      record.appliedRevenuePlanId = appliedOutcome.appliedRevenuePlanId;
      record.appliedBillingPlanId = appliedOutcome.appliedBillingPlanId;
      if (project.billingModelCode !== "hybrid_change_order") {
        project.billingModelCode = "hybrid_change_order";
      }
      project.contractValueAmount = roundMoney(project.contractValueAmount + Number(record.revenueImpactAmount || 0));
    }
    record.status = resolvedNextStatus;
    record.updatedAt = nowIso(clock);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "project.change_order.status_changed",
      entityType: "project_change_order",
      entityId: record.projectChangeOrderId,
      projectId: project.projectId,
      explanation: `Project change order ${record.projectChangeOrderId} moved to ${record.status}.`
    });
    if (resolvedNextStatus === "approved") {
      pushAudit(state, clock, {
        companyId: project.companyId,
        actorId: requireText(actorId, "actor_id_required"),
        correlationId,
        action: "project.change_order.approved",
        entityType: "project_change_order",
        entityId: record.projectChangeOrderId,
        projectId: project.projectId,
        explanation: `Approved project change order ${record.projectChangeOrderId}.`
      });
    }
    if (resolvedNextStatus === "applied") {
      pushAudit(state, clock, {
        companyId: project.companyId,
        actorId: requireText(actorId, "actor_id_required"),
        correlationId,
        action: "project.change_order.applied",
        entityType: "project_change_order",
        entityId: record.projectChangeOrderId,
        projectId: project.projectId,
        explanation: `Applied project change order ${record.projectChangeOrderId} to commercial chain.`
      });
    }
    return copy(record);
  }

  function listProjectBuildVatAssessments({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return project.buildVatAssessments
      .slice()
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createProjectBuildVatAssessment({
    companyId,
    projectId,
    projectBuildVatAssessmentId = null,
    sourceDocumentId = null,
    sourceDocumentType = "project_change_order",
    description,
    invoiceDate,
    deliveryDate = null,
    buyerCountry = "SE",
    buyerType = "company",
    buyerVatNo = null,
    buyerVatNumber = null,
    buyerVatNumberStatus = "valid",
    buyerIsTaxablePerson = true,
    buyerBuildSectorFlag = false,
    buyerResellsConstructionServicesFlag = false,
    lineAmountExVat,
    vatRate = 25,
    goodsOrServices = "services",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    if (!vatPlatform?.evaluateVatDecision) {
      throw createError(503, "vat_platform_unavailable", "VAT platform is not available.");
    }
    const resolvedSourceType = requireText(sourceDocumentType, "project_build_vat_source_type_required");
    const resolvedSourceId = normalizeOptionalText(sourceDocumentId) || crypto.randomUUID();
    const reverseChargeFlag = buyerBuildSectorFlag === true || buyerResellsConstructionServicesFlag === true;
    const resolvedVatRate = normalizeMoney(vatRate, "project_build_vat_rate_invalid");
    const vatCodeCandidate = resolveProjectBuildVatCodeCandidate({
      reverseChargeFlag,
      vatRate: resolvedVatRate
    });
    const transactionLine = {
      seller_country: "SE",
      buyer_country: requireText(buyerCountry, "project_build_vat_buyer_country_required").toUpperCase(),
      buyer_type: requireText(buyerType, "project_build_vat_buyer_type_required").toLowerCase(),
      buyer_vat_no: normalizeOptionalText(buyerVatNo) || normalizeOptionalText(buyerVatNumber),
      supply_type: "sale",
      goods_or_services: requireText(goodsOrServices, "project_build_vat_goods_or_services_required").toLowerCase(),
      invoice_date: normalizeRequiredDate(invoiceDate, "project_build_vat_invoice_date_required"),
      delivery_date: normalizeRequiredDate(
        deliveryDate || invoiceDate,
        "project_build_vat_delivery_date_invalid"
      ),
      currency: project.currencyCode,
      line_amount_ex_vat: normalizeMoney(lineAmountExVat, "project_build_vat_amount_invalid"),
      vat_rate: resolvedVatRate,
      vat_code_candidate: vatCodeCandidate,
      project_id: project.projectId,
      source_type: resolvedSourceType.toUpperCase(),
      source_id: resolvedSourceId,
      seller_vat_registration_country: "SE",
      buyer_is_taxable_person: buyerIsTaxablePerson === true,
      buyer_vat_number: normalizeOptionalText(buyerVatNumber) || normalizeOptionalText(buyerVatNo),
      buyer_vat_number_status: requireText(buyerVatNumberStatus, "project_build_vat_number_status_required").toLowerCase(),
      supply_subtype: "construction_service",
      property_related_flag: true,
      construction_service_flag: true,
      transport_end_country: requireText(buyerCountry, "project_build_vat_buyer_country_required").toUpperCase(),
      import_flag: false,
      export_flag: false,
      reverse_charge_flag: reverseChargeFlag,
      oss_flag: false,
      ioss_flag: false,
      tax_date: normalizeRequiredDate(invoiceDate, "project_build_vat_tax_date_required"),
      prepayment_date: normalizeRequiredDate(invoiceDate, "project_build_vat_prepayment_date_required"),
      line_discount: 0,
      line_quantity: 1,
      line_uom: "unit",
      tax_rate_candidate: resolvedVatRate,
      exemption_reason: "not_applicable",
      invoice_text_code: reverseChargeFlag ? "reverse_charge_invoice_text_required" : null,
      report_box_code: resolveProjectVatReportBoxCode(vatCodeCandidate)
    };
    const evaluation = vatPlatform.evaluateVatDecision({
      companyId: project.companyId,
      transactionLine,
      actorId,
      correlationId
    });
    const vatDecision = evaluation.vatDecision;
    const record = {
      projectBuildVatAssessmentId: normalizeOptionalText(projectBuildVatAssessmentId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      sourceDocumentId: resolvedSourceId,
      sourceDocumentType: resolvedSourceType,
      description: requireText(description, "project_build_vat_description_required"),
      buyerCountry: transactionLine.buyer_country,
      buyerType: transactionLine.buyer_type,
      buyerVatNo: transactionLine.buyer_vat_no,
      buyerVatNumber: transactionLine.buyer_vat_number,
      buyerVatNumberStatus: transactionLine.buyer_vat_number_status,
      buyerIsTaxablePerson: transactionLine.buyer_is_taxable_person,
      buyerBuildSectorFlag: buyerBuildSectorFlag === true,
      buyerResellsConstructionServicesFlag: buyerResellsConstructionServicesFlag === true,
      reverseChargeFlag,
      invoiceDate: transactionLine.invoice_date,
      deliveryDate: transactionLine.delivery_date,
      lineAmountExVat: transactionLine.line_amount_ex_vat,
      vatRate: transactionLine.vat_rate,
      vatCodeCandidate,
      vatDecisionId: vatDecision.vatDecisionId,
      vatCode: vatDecision.vatCode,
      decisionCategory: vatDecision.decisionCategory,
      bookingTemplateCode: vatDecision.bookingTemplateCode,
      declarationBoxCodes: copy(vatDecision.declarationBoxCodes || []),
      invoiceTextRequirements: copy(vatDecision.invoiceTextRequirements || []),
      explanation: vatDecision.explanation,
      warnings: copy(vatDecision.warnings || []),
      reviewQueueItemId: vatDecision.reviewQueueItemId || null,
      reviewRequiredFlag: vatDecision.status === "review_required",
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    project.buildVatAssessments.push(record);
    project.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: project.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.build_vat_assessment.created",
      entityType: "project_build_vat_assessment",
      entityId: record.projectBuildVatAssessmentId,
      projectId: project.projectId,
      explanation: `Evaluated build VAT ${record.vatCode} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function listProjectDeviations({ companyId, projectId, status = null } = {}) {
    const project = requireProject(state, companyId, projectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.projectDeviationIdsByProject.get(project.projectId) || [])
      .map((projectDeviationId) => state.projectDeviations.get(projectDeviationId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.projectDeviationId.localeCompare(right.projectDeviationId))
      .map(copy);
  }

  function createProjectDeviation({
    companyId,
    projectId,
    projectDeviationId = null,
    deviationTypeCode,
    severityCode = "major",
    title,
    description,
    ownerUserId = null,
    sourceDomainCode = "projects",
    sourceObjectId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = {
      projectDeviationId: normalizeOptionalText(projectDeviationId) || crypto.randomUUID(),
      companyId: project.companyId,
      projectId: project.projectId,
      deviationTypeCode: normalizeCode(deviationTypeCode, "project_deviation_type_required"),
      severityCode: requireEnum(PROJECT_DEVIATION_SEVERITY_CODES, severityCode, "project_deviation_severity_invalid"),
      title: requireText(title, "project_deviation_title_required"),
      description: requireText(description, "project_deviation_description_required"),
      status: "open",
      ownerUserId: normalizeOptionalText(ownerUserId),
      sourceDomainCode: normalizeCode(sourceDomainCode, "project_deviation_source_domain_required"),
      sourceObjectId: normalizeOptionalText(sourceObjectId),
      resolutionNote: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.projectDeviations.set(record.projectDeviationId, record);
    appendToIndex(state.projectDeviationIdsByCompany, record.companyId, record.projectDeviationId);
    appendToIndex(state.projectDeviationIdsByProject, record.projectId, record.projectDeviationId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "project.deviation.created",
      entityType: "project_deviation",
      entityId: record.projectDeviationId,
      projectId: record.projectId,
      explanation: `Created project deviation ${record.deviationTypeCode} for ${project.projectCode}.`
    });
    return copy(record);
  }

  function assignProjectDeviation({
    companyId,
    projectId,
    projectDeviationId,
    ownerUserId,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectDeviation(state, project.companyId, project.projectId, projectDeviationId);
    record.ownerUserId = requireText(ownerUserId, "project_deviation_owner_required");
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "project.deviation.assigned",
      entityType: "project_deviation",
      entityId: record.projectDeviationId,
      projectId: record.projectId,
      explanation: `Assigned project deviation ${record.projectDeviationId} to ${record.ownerUserId}.`
    });
    return copy(record);
  }

  function transitionProjectDeviationStatus({
    companyId,
    projectId,
    projectDeviationId,
    nextStatus,
    resolutionNote = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const project = requireProject(state, companyId, projectId);
    const record = requireProjectDeviation(state, project.companyId, project.projectId, projectDeviationId);
    const resolvedNextStatus = requireEnum(PROJECT_DEVIATION_STATUSES, nextStatus, "project_deviation_status_invalid");
    assertProjectDeviationTransition(record.status, resolvedNextStatus);
    if (["resolved", "closed"].includes(resolvedNextStatus)) {
      record.resolutionNote = requireText(resolutionNote || record.resolutionNote, "project_deviation_resolution_note_required");
    }
    record.status = resolvedNextStatus;
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "project.deviation.status_changed",
      entityType: "project_deviation",
      entityId: record.projectDeviationId,
      projectId: record.projectId,
      explanation: `Changed project deviation ${record.projectDeviationId} to ${record.status}.`
    });
    return copy(record);
  }

  function listProjectAuditEvents({ companyId, projectId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedProjectId = normalizeOptionalText(projectId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedProjectId ? event.projectId === requireProject(state, resolvedCompanyId, resolvedProjectId).projectId : true))
        .sort(compareAuditEvents)
        .map(copy);
  }

function exportProjectEvidenceBundle({
    companyId,
    projectId,
    cutoffDate = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
      throw createError(500, "evidence_platform_required", "Evidence platform is required.");
    }
    const project = requireProject(state, companyId, projectId);
    const workspace = getProjectWorkspace({
      companyId: project.companyId,
      projectId: project.projectId,
      cutoffDate
    });
    const projectAuditEvents = listProjectAuditEvents({
      companyId: project.companyId,
      projectId: project.projectId
    });
    const payload = {
      projectId: project.projectId,
      projectCode: project.projectCode,
      projectReferenceCode: project.projectReferenceCode,
      projectStatus: project.status,
      billingModelCode: project.billingModelCode,
      revenueRecognitionModelCode: project.revenueRecognitionModelCode,
      cutoffDate: normalizeOptionalText(cutoffDate),
      warningCodes: [...workspace.warningCodes],
      customerContext: copy(workspace.customerContext),
      projectOpportunityLinks: copy(workspace.projectOpportunityLinks || []),
      projectQuoteLinks: copy(workspace.projectQuoteLinks || []),
      projectEngagements: copy(workspace.projectEngagements || []),
      projectWorkModels: copy(workspace.projectWorkModels || []),
      projectWorkPackages: copy(workspace.projectWorkPackages || []),
      projectDeliveryMilestones: copy(workspace.projectDeliveryMilestones || []),
      projectRevenuePlans: copy(workspace.projectRevenuePlans || []),
      projectBillingPlans: copy(workspace.projectBillingPlans || []),
      projectStatusUpdates: copy(workspace.projectStatusUpdates || []),
      projectCapacityReservations: copy(workspace.projectCapacityReservations || []),
      projectAssignmentPlans: copy(workspace.projectAssignmentPlans || []),
      projectRisks: copy(workspace.projectRisks || []),
      projectProfitabilityAdjustments: copy(workspace.projectProfitabilityAdjustments || []),
      projectInvoiceReadinessAssessments: copy(workspace.projectInvoiceReadinessAssessments || []),
      currentProfitabilitySnapshot: copy(workspace.currentProfitabilitySnapshot),
      currentBillingPlan: copy(workspace.currentBillingPlan),
      currentInvoiceReadinessAssessment: copy(workspace.currentInvoiceReadinessAssessment),
      budgetActualForecastSummary: copy(workspace.budgetActualForecastSummary),
      resourceCapacitySummary: copy(workspace.resourceCapacitySummary),
      currentPortfolioNode: copy(workspace.currentPortfolioNode),
      complianceIndicatorStrip: copy(workspace.complianceIndicatorStrip),
      projectDeviations: copy(workspace.projectDeviations),
      fieldSummary: copy(workspace.fieldSummary),
      husSummary: copy(workspace.husSummary),
      personalliggareSummary: copy(workspace.personalliggareSummary),
      egenkontrollSummary: copy(workspace.egenkontrollSummary),
      kalkylSummary: copy(workspace.kalkylSummary)
    };
    const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
      companyId: project.companyId,
      bundleType: "project_workspace",
      sourceObjectType: "project",
      sourceObjectId: project.projectId,
      sourceObjectVersion: [
        workspace.budgetVersionId,
        workspace.currentCostSnapshotId,
        workspace.currentWipSnapshotId,
        workspace.currentForecastSnapshotId
      ]
        .filter(Boolean)
        .join(":") || workspace.projectStatus,
      title: `Project evidence ${project.projectCode}`,
      retentionClass: "regulated",
      classificationCode: "restricted_internal",
      metadata: {
        compatibilityPayload: payload
      },
      artifactRefs: [
        ...[
          ["project_budget_snapshot", workspace.budgetVersionId],
          ["project_cost_snapshot", workspace.currentCostSnapshotId],
          ["project_wip_snapshot", workspace.currentWipSnapshotId],
          ["project_forecast_snapshot", workspace.currentForecastSnapshotId],
          ["project_profitability_snapshot", workspace.currentProfitabilitySnapshotId],
          ["project_billing_plan", workspace.currentBillingPlanId],
          ["project_invoice_readiness_assessment", workspace.currentInvoiceReadinessAssessmentId],
          ["project_status_update", workspace.latestStatusUpdate?.projectStatusUpdateId || null]
        ]
          .filter(([, artifactRef]) => artifactRef)
          .map(([artifactType, artifactRef]) => ({
            artifactType,
            artifactRef,
            checksum: hashObject({
              artifactType,
              artifactRef,
              projectId: project.projectId
            })
          })),
        ...workspace.projectDeviations.map((deviation) => ({
          artifactType: "project_deviation",
          artifactRef: deviation.projectDeviationId,
          checksum: hashObject({
            projectDeviationId: deviation.projectDeviationId,
            status: deviation.status,
            severityCode: deviation.severityCode
          }),
          roleCode: deviation.severityCode
        })),
        ...(workspace.projectRisks || []).map((risk) => ({
          artifactType: "project_risk",
          artifactRef: risk.projectRiskId,
          checksum: hashObject({
            projectRiskId: risk.projectRiskId,
            status: risk.status,
            severityCode: risk.severityCode
          }),
          roleCode: risk.severityCode
        }))
      ],
      auditRefs: projectAuditEvents.map((event) => ({
        auditId: event.auditId || event.auditEventId,
        action: event.action,
        recordedAt: event.recordedAt
      })),
      sourceRefs: [
        {
          cutoffDate: normalizeOptionalText(cutoffDate),
          warningCodeCount: workspace.warningCodes.length
        }
      ],
      relatedObjectRefs: workspace.projectDeviations.map((deviation) => ({
        objectType: "project_deviation",
        objectId: deviation.projectDeviationId
      })).concat(
        (workspace.projectProfitabilityAdjustments || []).map((adjustment) => ({
          objectType: "project_profitability_adjustment",
          objectId: adjustment.projectProfitabilityAdjustmentId
        })),
        (workspace.projectCapacityReservations || []).map((reservation) => ({
          objectType: "project_capacity_reservation",
          objectId: reservation.projectCapacityReservationId
        })),
        (workspace.projectAssignmentPlans || []).map((assignmentPlan) => ({
          objectType: "project_assignment_plan",
          objectId: assignmentPlan.projectAssignmentPlanId
        })),
        (workspace.projectRisks || []).map((risk) => ({
          objectType: "project_risk",
          objectId: risk.projectRiskId
        })),
        workspace.currentInvoiceReadinessAssessment
          ? [
              {
                objectType: "project_invoice_readiness_assessment",
                objectId: workspace.currentInvoiceReadinessAssessment.projectInvoiceReadinessAssessmentId
              }
            ]
          : []
      ),
      actorId,
      correlationId
    });
    return {
      projectEvidenceBundleId: bundle.evidenceBundleId,
      evidenceBundleId: bundle.evidenceBundleId,
      checksum: bundle.checksum,
      status: bundle.status,
      frozenAt: bundle.frozenAt,
      archivedAt: bundle.archivedAt,
      ...payload
    };
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }
}

function requireProjectDeviation(state, companyId, projectId, projectDeviationId) {
  const record = state.projectDeviations.get(requireText(projectDeviationId, "project_deviation_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.projectId !== requireText(projectId, "project_id_required")) {
    throw createError(404, "project_deviation_not_found", "Project deviation was not found.");
  }
  return record;
}

function requireProjectStatusUpdate(project, projectStatusUpdateId) {
  const record = (project.statusUpdates || []).find(
    (candidate) => candidate.projectStatusUpdateId === requireText(projectStatusUpdateId, "project_status_update_id_required")
  );
  if (!record) {
    throw createError(404, "project_status_update_not_found", "Project status update was not found.");
  }
  return record;
}

function requireProjectCapacityReservation(project, projectCapacityReservationId) {
  const record = (project.capacityReservations || []).find(
    (candidate) =>
      candidate.projectCapacityReservationId === requireText(projectCapacityReservationId, "project_capacity_reservation_id_required")
  );
  if (!record) {
    throw createError(404, "project_capacity_reservation_not_found", "Project capacity reservation was not found.");
  }
  return record;
}

function requireProjectAssignmentPlan(project, projectAssignmentPlanId) {
  const record = (project.assignmentPlans || []).find(
    (candidate) => candidate.projectAssignmentPlanId === requireText(projectAssignmentPlanId, "project_assignment_plan_id_required")
  );
  if (!record) {
    throw createError(404, "project_assignment_plan_not_found", "Project assignment plan was not found.");
  }
  return record;
}

function requireProjectRisk(project, projectRiskId) {
  const record = (project.risks || []).find((candidate) => candidate.projectRiskId === requireText(projectRiskId, "project_risk_id_required"));
  if (!record) {
    throw createError(404, "project_risk_not_found", "Project risk was not found.");
  }
  return record;
}

function assertProjectDeviationTransition(currentStatus, nextStatus) {
  const allowed = {
    open: ["acknowledged", "in_progress", "resolved", "closed"],
    acknowledged: ["in_progress", "resolved", "closed"],
    in_progress: ["resolved", "closed"],
    resolved: ["closed"],
    closed: []
  };
  if (currentStatus === nextStatus) {
    return;
  }
  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw createError(409, "project_deviation_transition_invalid", `Cannot move project deviation from ${currentStatus} to ${nextStatus}.`);
  }
}

function assertProjectCapacityReservationTransition(currentStatus, nextStatus) {
  const allowed = {
    draft: ["approved", "cancelled"],
    approved: ["released", "cancelled"],
    released: [],
    cancelled: []
  };
  if (currentStatus === nextStatus) {
    return;
  }
  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw createError(
      409,
      "project_capacity_reservation_transition_invalid",
      `Cannot move project capacity reservation from ${currentStatus} to ${nextStatus}.`
    );
  }
}

function assertProjectAssignmentPlanTransition(currentStatus, nextStatus) {
  const allowed = {
    draft: ["approved", "cancelled"],
    approved: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: []
  };
  if (currentStatus === nextStatus) {
    return;
  }
  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw createError(409, "project_assignment_plan_transition_invalid", `Cannot move project assignment plan from ${currentStatus} to ${nextStatus}.`);
  }
}

function assertProjectRiskTransition(currentStatus, nextStatus) {
  const allowed = {
    open: ["mitigating", "accepted", "closed"],
    mitigating: ["accepted", "closed"],
    accepted: ["closed"],
    closed: []
  };
  if (currentStatus === nextStatus) {
    return;
  }
  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw createError(409, "project_risk_transition_invalid", `Cannot move project risk from ${currentStatus} to ${nextStatus}.`);
  }
}

function resolvePlatform(getter, directPlatform) {
  return typeof getter === "function" ? getter() || directPlatform || null : directPlatform || null;
}

function selectWorkspaceSnapshot(records, cutoffDate, dateField = "cutoffDate") {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }
  if (!cutoffDate) {
    return copy(records[records.length - 1]);
  }
  const candidates = records
    .filter((record) => normalizeOptionalText(record?.[dateField]))
    .sort((left, right) => String(left[dateField]).localeCompare(String(right[dateField])));
  const exact = candidates.find((record) => record[dateField] === cutoffDate);
  if (exact) {
    return copy(exact);
  }
  const latestEligible = [...candidates].reverse().find((record) => String(record[dateField]) <= cutoffDate);
  return copy(latestEligible || candidates.at(-1) || records[records.length - 1]);
}

function summarizeFieldWorkspace({ companyId, projectId, fieldPlatform }) {
  if (!fieldPlatform) {
    return {
      projectId,
      totalWorkOrderCount: 0,
      openWorkOrderCount: 0,
      inProgressWorkOrderCount: 0,
      completedUnbilledWorkOrderCount: 0,
      pendingSignatureCount: 0,
      dispatchAssignedCount: 0,
      materialWithdrawalCount: 0,
      materialWithdrawalAmount: 0,
      latestOperationalUpdateAt: null,
      workOrders: []
    };
  }
  if (typeof fieldPlatform.getProjectFieldSummary === "function") {
    return fieldPlatform.getProjectFieldSummary({ companyId, projectId });
  }
  const workOrders = typeof fieldPlatform.listWorkOrders === "function" ? fieldPlatform.listWorkOrders({ companyId, projectId }) : [];
  return {
    projectId,
    totalWorkOrderCount: workOrders.length,
    openWorkOrderCount: workOrders.filter((workOrder) => ["ready_for_dispatch", "dispatched", "in_progress"].includes(workOrder.status)).length,
    inProgressWorkOrderCount: workOrders.filter((workOrder) => workOrder.status === "in_progress").length,
    completedUnbilledWorkOrderCount: workOrders.filter((workOrder) => workOrder.status === "completed").length,
    pendingSignatureCount: workOrders.filter((workOrder) => workOrder.signatureRequired && workOrder.signatureStatus === "pending").length,
    dispatchAssignedCount: workOrders.reduce((sum, workOrder) => sum + (workOrder.dispatchAssignments || []).length, 0),
    materialWithdrawalCount: workOrders.reduce((sum, workOrder) => sum + (workOrder.materialWithdrawals || []).length, 0),
    materialWithdrawalAmount: roundMoney(
      workOrders.reduce(
        (sum, workOrder) =>
          sum +
          (workOrder.materialWithdrawals || []).reduce(
            (workOrderSum, withdrawal) => workOrderSum + Number(withdrawal.quantity || 0) * Number(withdrawal.salesUnitPriceAmount || 0),
            0
          ),
        0
      )
    ),
    latestOperationalUpdateAt:
      workOrders
        .map((workOrder) => workOrder.updatedAt || workOrder.createdAt || null)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
    workOrders: workOrders.map(copy)
  };
}

function summarizeHusWorkspace({ companyId, projectId, husPlatform }) {
  const cases = husPlatform?.listHusCases ? husPlatform.listHusCases({ companyId }).filter((record) => record.projectId === projectId) : [];
  const attentionStatuses = new Set(["invoice_blocked", "claim_partially_accepted", "claim_rejected", "recovery_pending"]);
  return {
    projectId,
    totalCaseCount: cases.length,
    openCaseCount: cases.filter((record) => !["closed", "paid_out"].includes(record.status)).length,
    attentionCount: cases.filter((record) => attentionStatuses.has(record.status)).length,
    latestCaseId: cases.at(-1)?.husCaseId || null,
    cases: cases.map((record) => ({
      husCaseId: record.husCaseId,
      caseReference: record.caseReference,
      status: record.status,
      claimEligibilityStatus: record.claimEligibilityStatus,
      claimReadyAmount: record.claimReadyAmount,
      customerInvoiceId: record.customerInvoiceId
    }))
  };
}

function summarizePersonalliggareWorkspace({ companyId, projectId, personalliggarePlatform }) {
  const sites = personalliggarePlatform?.listConstructionSites
    ? personalliggarePlatform.listConstructionSites({ companyId }).filter((record) => record.projectId === projectId)
    : [];
  const alertCount = sites.filter(
    (site) =>
      site.thresholdRequiredFlag === true &&
      (
        !["registered", "active"].includes(site.registrationStatus) ||
        site.equipmentStatus !== "trusted" ||
        site.thresholdEvaluationStatus !== "active"
      )
  ).length;
  return {
    projectId,
    siteCount: sites.length,
    alertCount,
    activeSiteCount: sites.filter((site) => site.thresholdEvaluationStatus === "active").length,
    sites: sites.map((site) => ({
      constructionSiteId: site.constructionSiteId,
      siteCode: site.siteCode,
      thresholdEvaluationStatus: site.thresholdEvaluationStatus,
      registrationStatus: site.registrationStatus,
      equipmentStatus: site.equipmentStatus
    }))
  };
}

function summarizeEgenkontrollWorkspace({ companyId, projectId, egenkontrollPlatform }) {
  const instances = egenkontrollPlatform?.listChecklistInstances
    ? egenkontrollPlatform.listChecklistInstances({ companyId, projectId })
    : [];
  const deviations = egenkontrollPlatform?.listChecklistDeviations
    ? egenkontrollPlatform.listChecklistDeviations({ companyId }).filter((record) => record.projectId === projectId)
    : [];
  return {
    projectId,
    checklistInstanceCount: instances.length,
    openDeviationCount: deviations.filter((record) => record.status !== "resolved").length,
    closedChecklistCount: instances.filter((record) => record.status === "closed").length,
    instances: instances.map((instance) => ({
      checklistInstanceId: instance.checklistInstanceId,
      status: instance.status,
      workOrderId: instance.workOrderId,
      unresolvedDeviationCount: instance.summary?.unresolvedDeviationCount || 0
    }))
  };
}

function summarizeKalkylWorkspace({ companyId, projectId, kalkylPlatform }) {
  const estimates = kalkylPlatform?.listEstimateVersions
    ? kalkylPlatform.listEstimateVersions({ companyId }).filter((record) => record.projectId === projectId)
    : [];
  const latestEstimate = [...estimates].sort((left, right) => `${left.updatedAt || left.createdAt}${left.estimateVersionId}`.localeCompare(`${right.updatedAt || right.createdAt}${right.estimateVersionId}`)).pop() || null;
  return {
    projectId,
    estimateCount: estimates.length,
    latestEstimateVersionId: latestEstimate?.estimateVersionId || null,
    latestEstimateStatus: latestEstimate?.status || null,
    latestEstimateTotals: latestEstimate?.totals || null
  };
}

function buildProjectBudgetActualForecastSummary({
  currentBudgetVersion,
  currentCostSnapshot,
  currentForecastSnapshot,
  currentProfitabilitySnapshot
}) {
  const budgetCostAmount = Number(currentBudgetVersion?.totals?.costAmount || 0);
  const budgetRevenueAmount = Number(currentBudgetVersion?.totals?.revenueAmount || 0);
  const actualCostAmount = Number(currentCostSnapshot?.actualCostAmount || 0);
  const billedRevenueAmount = Number(currentCostSnapshot?.billedRevenueAmount || 0);
  const forecastCostAtCompletionAmount = Number(currentForecastSnapshot?.forecastCostAtCompletionAmount || actualCostAmount || 0);
  const forecastRevenueAtCompletionAmount = Number(currentForecastSnapshot?.forecastRevenueAtCompletionAmount || billedRevenueAmount || 0);
  const currentMarginAmount = Number(currentProfitabilitySnapshot?.currentMarginAmount || billedRevenueAmount - actualCostAmount);
  const forecastMarginAmount = Number(currentForecastSnapshot?.forecastMarginAmount || currentProfitabilitySnapshot?.forecastMarginAmount || 0);
  return {
    budgetCostAmount: roundMoney(budgetCostAmount),
    budgetRevenueAmount: roundMoney(budgetRevenueAmount),
    actualCostAmount: roundMoney(actualCostAmount),
    billedRevenueAmount: roundMoney(billedRevenueAmount),
    forecastCostAtCompletionAmount: roundMoney(forecastCostAtCompletionAmount),
    forecastRevenueAtCompletionAmount: roundMoney(forecastRevenueAtCompletionAmount),
    currentMarginAmount: roundMoney(currentMarginAmount),
    forecastMarginAmount: roundMoney(forecastMarginAmount),
    budgetCostVarianceAmount: roundMoney(actualCostAmount - budgetCostAmount),
    budgetRevenueVarianceAmount: roundMoney(forecastRevenueAtCompletionAmount - budgetRevenueAmount)
  };
}

function buildProjectResourceCapacitySummary({
  currentCostSnapshot,
  capacityReservations = [],
  assignmentPlans = [],
  resourceAllocations = []
}) {
  const activeReservations = capacityReservations.filter((record) => !["released", "cancelled"].includes(record.status));
  const activeAssignments = assignmentPlans.filter((record) => record.status !== "cancelled");
  const reservedMinutes = activeReservations.reduce((sum, record) => sum + Number(record.reservedMinutes || 0), 0);
  const assignedMinutes = activeAssignments.reduce((sum, record) => sum + Number(record.plannedMinutes || 0), 0);
  const actualMinutes = Number(currentCostSnapshot?.actualMinutes || 0);
  const plannedAllocationMinutes = resourceAllocations
    .filter((record) => record.status !== "released")
    .reduce((sum, record) => sum + Number(record.plannedMinutes || 0), 0);
  const uncoveredAssignmentMinutes = Math.max(assignedMinutes - reservedMinutes, 0);
  const unusedReservedMinutes = Math.max(reservedMinutes - assignedMinutes, 0);
  const resourceLoadPercent =
    reservedMinutes > 0
      ? normalizePercentage(Math.min((actualMinutes / reservedMinutes) * 100, 100), "project_resource_capacity_percent_invalid")
      : 0;
  return {
    reservedMinutes,
    assignedMinutes,
    actualMinutes,
    plannedAllocationMinutes,
    uncoveredAssignmentMinutes,
    unusedReservedMinutes,
    resourceLoadPercent,
    reservationCount: activeReservations.length,
    assignmentCount: activeAssignments.length
  };
}

function buildProjectPortfolioNode({
  state,
  companyId,
  project,
  cutoffDate = null,
  currentBudgetVersion = null,
  currentCostSnapshot = null,
  currentForecastSnapshot = null,
  currentProfitabilitySnapshot = null,
  currentInvoiceReadinessAssessment = null,
  currentStatusUpdate = null,
  openProjectRisks = null,
  resourceCapacitySummary = null
}) {
  const resolvedProject = project;
  if (!resolvedProject) {
    throw createError(500, "project_required", "Project is required when building portfolio node.");
  }
  const budgetVersion = currentBudgetVersion || findLatestBudgetVersion(state, resolvedProject.projectId);
  const costSnapshot =
    currentCostSnapshot || selectWorkspaceSnapshot(listProjectCostSnapshotsForState(state, resolvedProject), cutoffDate);
  const forecastSnapshot =
    currentForecastSnapshot || selectWorkspaceSnapshot(listProjectForecastSnapshotsForState(state, resolvedProject), cutoffDate);
  const profitabilitySnapshot =
    currentProfitabilitySnapshot || selectWorkspaceSnapshot(listProjectProfitabilitySnapshotsForState(state, resolvedProject), cutoffDate);
  const statusUpdate =
    currentStatusUpdate || selectWorkspaceSnapshot((resolvedProject.statusUpdates || []).slice().sort(compareStatusUpdates), cutoffDate, "statusDate");
  const risks = openProjectRisks || (resolvedProject.risks || []).filter((risk) => risk.status !== "closed");
  const invoiceReadinessAssessment =
    currentInvoiceReadinessAssessment
    || selectWorkspaceSnapshot((resolvedProject.invoiceReadinessAssessments || []).slice().sort(compareAssessedAt), cutoffDate, "assessedAt");
  const capacitySummary =
    resourceCapacitySummary
    || buildProjectResourceCapacitySummary({
      currentCostSnapshot: costSnapshot,
      capacityReservations: resolvedProject.capacityReservations || [],
      assignmentPlans: resolvedProject.assignmentPlans || [],
      resourceAllocations: (state.resourceAllocationIdsByProject.get(resolvedProject.projectId) || [])
        .map((allocationId) => state.resourceAllocations.get(allocationId))
        .filter(Boolean)
    });
  const budgetActualForecastSummary = buildProjectBudgetActualForecastSummary({
    currentBudgetVersion: budgetVersion,
    currentCostSnapshot: costSnapshot,
    currentForecastSnapshot: forecastSnapshot,
    currentProfitabilitySnapshot: profitabilitySnapshot
  });
  const blockerCount = Number(statusUpdate?.blockerCodes?.length || 0);
  const highRiskCount = risks.filter((risk) => risk.severityCode === "high").length;
  const criticalRiskCount = risks.filter((risk) => risk.severityCode === "critical").length;
  const overdueReferenceDate = normalizeOptionalText(cutoffDate) || new Date().toISOString().slice(0, 10);
  const overdueRiskCount = risks.filter((risk) => risk.dueDate && risk.dueDate < overdueReferenceDate).length;
  const healthCode = resolveProjectPortfolioHealthCode({
    statusUpdate,
    blockerCount,
    highRiskCount,
    criticalRiskCount,
    invoiceReadinessAssessment
  });
  const atRiskFlag = healthCode !== "green" || criticalRiskCount > 0 || overdueRiskCount > 0;
  return {
    projectId: resolvedProject.projectId,
    projectCode: resolvedProject.projectCode,
    projectReferenceCode: resolvedProject.projectReferenceCode,
    displayName: resolvedProject.displayName,
    projectStatus: resolvedProject.status,
    customerId: resolvedProject.customerId,
    projectManagerEmployeeId: resolvedProject.projectManagerEmployeeId,
    billingModelCode: resolvedProject.billingModelCode,
    healthCode,
    progressPercent: Number(statusUpdate?.progressPercent || 0),
    blockerCount,
    openRiskCount: risks.length,
    highRiskCount,
    criticalRiskCount,
    overdueRiskCount,
    atRiskFlag,
    budgetCostAmount: budgetActualForecastSummary.budgetCostAmount,
    budgetRevenueAmount: budgetActualForecastSummary.budgetRevenueAmount,
    actualCostAmount: budgetActualForecastSummary.actualCostAmount,
    billedRevenueAmount: budgetActualForecastSummary.billedRevenueAmount,
    forecastCostAtCompletionAmount: budgetActualForecastSummary.forecastCostAtCompletionAmount,
    forecastRevenueAtCompletionAmount: budgetActualForecastSummary.forecastRevenueAtCompletionAmount,
    currentMarginAmount: budgetActualForecastSummary.currentMarginAmount,
    forecastMarginAmount: budgetActualForecastSummary.forecastMarginAmount,
    reservedMinutes: capacitySummary.reservedMinutes,
    assignedMinutes: capacitySummary.assignedMinutes,
    actualMinutes: capacitySummary.actualMinutes,
    uncoveredAssignmentMinutes: capacitySummary.uncoveredAssignmentMinutes,
    unusedReservedMinutes: capacitySummary.unusedReservedMinutes,
    resourceLoadPercent: Number(forecastSnapshot?.resourceLoadPercent || capacitySummary.resourceLoadPercent || 0),
    latestStatusUpdateId: statusUpdate?.projectStatusUpdateId || null,
    latestStatusDate: statusUpdate?.statusDate || null,
    currentForecastSnapshotId: forecastSnapshot?.projectForecastSnapshotId || null,
    currentProfitabilitySnapshotId: profitabilitySnapshot?.projectProfitabilitySnapshotId || null,
    currentInvoiceReadinessAssessmentId: invoiceReadinessAssessment?.projectInvoiceReadinessAssessmentId || null,
    roleDemand: summarizeDemandByRole(resolvedProject),
    skillDemand: summarizeDemandBySkill(resolvedProject),
    employmentCapacity: summarizeEmploymentCapacity(resolvedProject, capacitySummary.actualMinutes)
  };
}

function resolveProjectPortfolioHealthCode({ statusUpdate, blockerCount, highRiskCount, criticalRiskCount, invoiceReadinessAssessment }) {
  if (criticalRiskCount > 0 || invoiceReadinessAssessment?.status === "blocked") {
    return "red";
  }
  if (statusUpdate?.healthCode === "red") {
    return "red";
  }
  if (highRiskCount > 0 || blockerCount > 0 || invoiceReadinessAssessment?.status === "review_required") {
    return "amber";
  }
  return statusUpdate?.healthCode || "green";
}

function summarizeDemandByRole(project) {
  const demand = new Map();
  for (const reservation of project.capacityReservations || []) {
    if (["released", "cancelled"].includes(reservation.status)) {
      continue;
    }
    appendDemandSummary(demand, reservation.roleCode, {
      roleCode: reservation.roleCode,
      reservedMinutes: Number(reservation.reservedMinutes || 0),
      assignedMinutes: 0,
      projectCount: 1
    });
  }
  for (const assignment of project.assignmentPlans || []) {
    if (assignment.status === "cancelled") {
      continue;
    }
    appendDemandSummary(demand, assignment.roleCode, {
      roleCode: assignment.roleCode,
      reservedMinutes: 0,
      assignedMinutes: Number(assignment.plannedMinutes || 0),
      projectCount: 1
    });
  }
  return [...demand.values()].sort((left, right) => left.roleCode.localeCompare(right.roleCode));
}

function summarizeDemandBySkill(project) {
  const demand = new Map();
  for (const reservation of project.capacityReservations || []) {
    if (["released", "cancelled"].includes(reservation.status)) {
      continue;
    }
    for (const skillCode of reservation.skillCodes || []) {
      appendDemandSummary(demand, skillCode, {
        skillCode,
        reservedMinutes: Number(reservation.reservedMinutes || 0),
        assignedMinutes: 0,
        projectCount: 1
      });
    }
  }
  for (const assignment of project.assignmentPlans || []) {
    if (assignment.status === "cancelled") {
      continue;
    }
    for (const skillCode of assignment.skillCodes || []) {
      appendDemandSummary(demand, skillCode, {
        skillCode,
        reservedMinutes: 0,
        assignedMinutes: Number(assignment.plannedMinutes || 0),
        projectCount: 1
      });
    }
  }
  return [...demand.values()].sort((left, right) => left.skillCode.localeCompare(right.skillCode));
}

function summarizeEmploymentCapacity(project, actualMinutes) {
  const capacity = new Map();
  const employmentIds = new Set([
    ...(project.capacityReservations || []).map((record) => record.employmentId).filter(Boolean),
    ...(project.assignmentPlans || []).map((record) => record.employmentId).filter(Boolean)
  ]);
  for (const employmentId of employmentIds) {
    appendDemandSummary(capacity, employmentId, {
      employmentId,
      reservedMinutes: (project.capacityReservations || [])
        .filter((record) => record.employmentId === employmentId && !["released", "cancelled"].includes(record.status))
        .reduce((sum, record) => sum + Number(record.reservedMinutes || 0), 0),
      assignedMinutes: (project.assignmentPlans || [])
        .filter((record) => record.employmentId === employmentId && record.status !== "cancelled")
        .reduce((sum, record) => sum + Number(record.plannedMinutes || 0), 0),
      actualMinutes: 0,
      projectCount: 1
    });
  }
  return [...capacity.values()].sort((left, right) => left.employmentId.localeCompare(right.employmentId));
}

function appendDemandSummary(map, key, values) {
  const existing = map.get(key) || {
    ...values,
    reservedMinutes: 0,
    assignedMinutes: 0,
    actualMinutes: 0,
    projectCount: 0
  };
  existing.reservedMinutes += Number(values.reservedMinutes || 0);
  existing.assignedMinutes += Number(values.assignedMinutes || 0);
  existing.actualMinutes += Number(values.actualMinutes || 0);
  existing.projectCount += Number(values.projectCount || 0);
  map.set(key, existing);
}

function accumulatePortfolioDemand(map, key, item) {
  appendDemandSummary(map, key, item);
}

function listProjectCostSnapshotsForState(state, project) {
  return (state.costSnapshotIdsByProject.get(project.projectId) || [])
    .map((snapshotId) => state.costSnapshots.get(snapshotId))
    .filter(Boolean)
    .sort(compareCutoffDate);
}

function listProjectForecastSnapshotsForState(state, project) {
  return (state.forecastSnapshotIdsByProject.get(project.projectId) || [])
    .map((snapshotId) => state.forecastSnapshots.get(snapshotId))
    .filter(Boolean)
    .sort(compareCutoffDate);
}

function listProjectProfitabilitySnapshotsForState(state, project) {
  return (state.projectProfitabilitySnapshotIdsByProject.get(project.projectId) || [])
    .map((snapshotId) => state.projectProfitabilitySnapshots.get(snapshotId))
    .filter(Boolean)
    .sort(compareCutoffDate);
}

function compareCutoffDate(left, right) {
  return String(left.cutoffDate).localeCompare(String(right.cutoffDate)) || String(left.createdAt).localeCompare(String(right.createdAt));
}

function compareStatusUpdates(left, right) {
  return String(left.statusDate).localeCompare(String(right.statusDate)) || String(left.createdAt).localeCompare(String(right.createdAt));
}

function compareAssessedAt(left, right) {
  return String(left.assessedAt).localeCompare(String(right.assessedAt));
}

function buildWorkspaceIndicatorStrip({
  currentBudgetVersion,
  currentCostSnapshot,
  currentWipSnapshot,
  currentForecastSnapshot,
  currentProfitabilitySnapshot,
  currentInvoiceReadinessAssessment,
  fieldSummary,
  husSummary,
  personalliggareSummary,
  egenkontrollSummary,
  kalkylSummary,
  openProjectDeviationCount,
  engagementCount,
  approvedRevenuePlanCount
}) {
  return [
    {
      indicatorCode: "budget",
      status: currentBudgetVersion ? "ok" : "warning",
      count: currentBudgetVersion ? 1 : 0
    },
    {
      indicatorCode: "snapshots",
      status: currentCostSnapshot && currentWipSnapshot && currentForecastSnapshot && currentProfitabilitySnapshot ? "ok" : "warning",
      count: [currentCostSnapshot, currentWipSnapshot, currentForecastSnapshot, currentProfitabilitySnapshot].filter(Boolean).length
    },
    {
      indicatorCode: "commercial_core",
      status: engagementCount > 0 && approvedRevenuePlanCount > 0 ? "ok" : "warning",
      count: engagementCount + approvedRevenuePlanCount
    },
    {
      indicatorCode: "invoice_readiness",
      status:
        currentInvoiceReadinessAssessment?.status === "blocked"
          ? "warning"
          : currentInvoiceReadinessAssessment?.status === "review_required"
            ? "warning"
            : currentInvoiceReadinessAssessment
              ? "ok"
              : "warning",
      count: currentInvoiceReadinessAssessment ? 1 : 0
    },
    {
      indicatorCode: "field",
      status: fieldSummary.pendingSignatureCount > 0 || fieldSummary.completedUnbilledWorkOrderCount > 0 ? "warning" : "ok",
      count: fieldSummary.openWorkOrderCount
    },
    {
      indicatorCode: "hus",
      status: husSummary.attentionCount > 0 ? "warning" : "ok",
      count: husSummary.totalCaseCount
    },
    {
      indicatorCode: "personalliggare",
      status: personalliggareSummary.alertCount > 0 ? "warning" : "ok",
      count: personalliggareSummary.alertCount
    },
    {
      indicatorCode: "egenkontroll",
      status: egenkontrollSummary.openDeviationCount > 0 ? "warning" : "ok",
      count: egenkontrollSummary.openDeviationCount
    },
    {
      indicatorCode: "kalkyl",
      status: kalkylSummary.latestEstimateStatus && ["approved", "quoted", "converted"].includes(kalkylSummary.latestEstimateStatus) ? "ok" : "warning",
      count: kalkylSummary.estimateCount
    },
    {
      indicatorCode: "project_deviations",
      status: openProjectDeviationCount > 0 ? "warning" : "ok",
      count: openProjectDeviationCount
    }
  ];
}

function buildScopedProjectDeviationKey(companyId, projectId) {
  return `${companyId}:${projectId}`;
}

function buildProjectMetricsModel({ state, project, cutoffDate, arPlatform, apPlatform, hrPlatform, timePlatform, payrollPlatform, husPlatform }) {
  const resolvedCutoffDate = normalizeRequiredDate(cutoffDate, "project_cutoff_date_required");
  const reportingPeriod = toReportingPeriodFromDate(resolvedCutoffDate);
  const budgetVersion = findLatestBudgetVersion(state, project.projectId);
  const budgetSummary = summarizeBudgetVersion(budgetVersion, reportingPeriod);
  const aliases = collectProjectAliases(project);
  const timeSummary = collectTimeSummary({
    companyId: project.companyId,
    cutoffDate: resolvedCutoffDate,
    reportingPeriod,
    aliases,
    hrPlatform,
    timePlatform,
    state,
    projectId: project.projectId
  });
  const payrollSummary = collectPayrollSummary({
    companyId: project.companyId,
    reportingPeriod,
    cutoffDate: resolvedCutoffDate,
    aliases,
    project,
    timeSummary,
    payrollPlatform
  });
  const billingSummary = collectBillingSummary({
    companyId: project.companyId,
    cutoffDate: resolvedCutoffDate,
    aliases,
    arPlatform
  });
  const apSummary = collectApSummary({
    companyId: project.companyId,
    cutoffDate: resolvedCutoffDate,
    aliases,
    apPlatform
  });
  const profitabilityAdjustmentSummary = collectApprovedProjectProfitabilityAdjustments({
    project,
    cutoffDate: resolvedCutoffDate
  });
  const husProfitabilitySummary = collectHusProfitabilitySummary({
    companyId: project.companyId,
    projectId: project.projectId,
    cutoffDate: resolvedCutoffDate,
    husPlatform
  });
  const approvedValueAmount = calculateApprovedValueAmount({
    project,
    cutoffDate: resolvedCutoffDate,
    reportingPeriod,
    budgetSummary,
    timeSummary,
    state,
    billingSummary
  });
  const baseRecognizedRevenueAmount =
    project.revenueRecognitionModelCode === "billing_equals_revenue"
      ? billingSummary.billedRevenueAmount
      : approvedValueAmount;
  const recognizedRevenueAmount = roundMoney(
    baseRecognizedRevenueAmount +
    profitabilityAdjustmentSummary.revenueAdjustmentAmount +
    husProfitabilitySummary.husAdjustmentAmount
  );
  const explanationCodes = [];
  if (project.billingModelCode === "time_and_material" && timeSummary.actualMinutes > 0 && approvedValueAmount === 0) {
    explanationCodes.push("rate_missing_review");
  }
  if (apSummary.invoiceCount > 0) {
    explanationCodes.push("ap_costs_included");
  }
  if (husProfitabilitySummary.husAdjustmentAmount !== 0) {
    explanationCodes.push("hus_adjustment_included");
  }
  if (profitabilityAdjustmentSummary.adjustmentCount > 0) {
    explanationCodes.push("manual_adjustment_included");
  }
  if (approvedValueAmount < billingSummary.billedRevenueAmount) {
    explanationCodes.push("deferred_revenue_balance");
  }
  const wipAmount = roundMoney(Math.max(0, approvedValueAmount - billingSummary.billedRevenueAmount));
  const deferredRevenueAmount = roundMoney(
    Math.max(0, billingSummary.billedRevenueAmount - recognizedRevenueAmount)
  );
  const remainingBudgetCostAmount = budgetSummary.futureCostAmount;
  const remainingBudgetRevenueAmount = budgetSummary.futureRevenueAmount;
  const actualCostAmount = roundMoney(
    payrollSummary.actualCostAmount +
    apSummary.actualCostAmount +
    profitabilityAdjustmentSummary.costAdjustmentAmount
  );
  const forecastCostAtCompletionAmount = roundMoney(actualCostAmount + remainingBudgetCostAmount);
  const forecastRevenueAtCompletionAmount = roundMoney(recognizedRevenueAmount + remainingBudgetRevenueAmount);
  const currentMarginAmount = roundMoney(
    recognizedRevenueAmount -
    actualCostAmount +
    profitabilityAdjustmentSummary.marginAdjustmentAmount
  );
  const forecastMarginAmount = roundMoney(forecastRevenueAtCompletionAmount - forecastCostAtCompletionAmount);
  const resourceLoadPercent = roundPercentage(
    timeSummary.plannedMinutesToDate === 0 ? 0 : (timeSummary.actualMinutes / timeSummary.plannedMinutesToDate) * 100
  );
  const snapshotStatus = explanationCodes.some((code) => code.endsWith("_review")) ? "review_required" : "materialized";
  const snapshotHash = hashObject({
    projectId: project.projectId,
    cutoffDate: resolvedCutoffDate,
    actualCostAmount,
    actualMinutes: timeSummary.actualMinutes,
    approvedValueAmount,
    billedRevenueAmount: billingSummary.billedRevenueAmount,
    recognizedRevenueAmount,
    remainingBudgetCostAmount,
    remainingBudgetRevenueAmount,
    resourceLoadPercent,
    explanationCodes,
    apCostHash: hashObject(apSummary.lines.map((line) => ({
      supplierInvoiceId: line.supplierInvoiceId,
      supplierInvoiceLineId: line.supplierInvoiceLineId,
      costBucketCode: line.costBucketCode,
      amount: line.amount
    }))),
    profitabilityAdjustmentHash: profitabilityAdjustmentSummary.snapshotHash,
    husAdjustmentAmount: husProfitabilitySummary.husAdjustmentAmount,
    payrollAllocationHash: hashObject(
      payrollSummary.payrollAllocations.map((allocation) => ({
        payRunId: allocation.payRunId,
        payRunLineId: allocation.payRunLineId,
        employmentId: allocation.employmentId,
        allocationBasisCode: allocation.allocationBasisCode,
        allocationShare: allocation.allocationShare,
        allocatedAmount: allocation.allocatedAmount,
        sourceType: allocation.sourceType,
        sourceId: allocation.sourceId,
        costBucketCode: allocation.costBucketCode,
        sourceLineIds: allocation.sourceLineIds
      }))
    )
  });
  return {
    companyId: project.companyId,
    projectId: project.projectId,
    cutoffDate: resolvedCutoffDate,
    reportingPeriod,
    actualCostAmount,
    actualMinutes: timeSummary.actualMinutes,
    billedRevenueAmount: billingSummary.billedRevenueAmount,
    recognizedRevenueAmount,
    approvedValueAmount,
    wipAmount,
    deferredRevenueAmount,
    remainingBudgetCostAmount,
    remainingBudgetRevenueAmount,
    forecastCostAtCompletionAmount,
    forecastRevenueAtCompletionAmount,
    currentMarginAmount,
    forecastMarginAmount,
    resourceLoadPercent,
    costBreakdown: mergeProjectCostBreakdown(payrollSummary.costBreakdown, apSummary.costBreakdown),
    payrollAllocations: payrollSummary.payrollAllocations,
    apAllocations: apSummary.lines,
    approvedAdjustmentAmount: profitabilityAdjustmentSummary.netAdjustmentAmount,
    manualRevenueAdjustmentAmount: profitabilityAdjustmentSummary.revenueAdjustmentAmount,
    manualCostAdjustmentAmount: profitabilityAdjustmentSummary.costAdjustmentAmount,
    marginAdjustmentAmount: profitabilityAdjustmentSummary.marginAdjustmentAmount,
    husAdjustmentAmount: husProfitabilitySummary.husAdjustmentAmount,
    sourceCounts: {
      payRuns: payrollSummary.payRunCount,
      payRunLines: payrollSummary.payRunLineCount,
      payrollAllocations: payrollSummary.payrollAllocationCount,
      timeEntries: timeSummary.entryCount,
      invoices: billingSummary.invoiceCount,
      supplierInvoices: apSummary.invoiceCount,
      supplierInvoiceLines: apSummary.lineCount,
      profitabilityAdjustments: profitabilityAdjustmentSummary.adjustmentCount,
      husCases: husProfitabilitySummary.caseCount
    },
    explanationCodes,
    snapshotStatus,
    snapshotHash
  };
}

function collectTimeSummary({ companyId, cutoffDate, reportingPeriod, aliases, hrPlatform, timePlatform, state, projectId }) {
  const entries = [];
  const totalMinutesByEmploymentPeriod = new Map();
  const projectMinutesByEmploymentPeriod = new Map();

  for (const employment of listEmploymentContexts(companyId, hrPlatform)) {
    const timeEntries = timePlatform?.listTimeEntries
      ? timePlatform.listTimeEntries({
          companyId,
          employmentId: employment.employmentId
        })
      : [];
    for (const entry of timeEntries) {
      if (entry.workDate > cutoffDate) {
        continue;
      }
      const entryPeriod = toReportingPeriodFromDate(entry.workDate);
      if (entry.workedMinutes <= 0) {
        continue;
      }
      const key = `${entry.employmentId}:${entryPeriod}`;
      totalMinutesByEmploymentPeriod.set(key, (totalMinutesByEmploymentPeriod.get(key) || 0) + Number(entry.workedMinutes || 0));
      if (matchesProjectValue(entry.projectId, aliases)) {
        projectMinutesByEmploymentPeriod.set(key, (projectMinutesByEmploymentPeriod.get(key) || 0) + Number(entry.workedMinutes || 0));
        entries.push(copy(entry));
      }
    }
  }

  let plannedMinutesToDate = 0;
  for (const allocationId of state.resourceAllocationIdsByProject.get(projectId) || []) {
    const allocation = state.resourceAllocations.get(allocationId);
    if (!allocation || allocation.reportingPeriod > reportingPeriod) {
      continue;
    }
    plannedMinutesToDate += Number(allocation.plannedMinutes || 0);
  }

  return {
    entries,
    entryCount: entries.length,
    actualMinutes: entries.reduce((sum, entry) => sum + Number(entry.workedMinutes || 0), 0),
    plannedMinutesToDate: normalizeWholeNumber(plannedMinutesToDate, "project_planned_minutes_invalid"),
    totalMinutesByEmploymentPeriod,
    projectMinutesByEmploymentPeriod
  };
}

function collectPayrollSummary({ companyId, reportingPeriod, cutoffDate, aliases, project, timeSummary, payrollPlatform }) {
  const payRuns = payrollPlatform?.listPayRuns ? payrollPlatform.listPayRuns({ companyId }) : [];
  const includedPayRuns = new Set();
  const includedPayRunLines = new Set();
  const costBreakdown = createExtendedProjectCostBreakdown();
  const payrollAllocations = [];

  for (const payRun of payRuns) {
    if (payRun.reportingPeriod > reportingPeriod) {
      continue;
    }
    if (payRun.payDate > cutoffDate || payRun.status === "draft") {
      continue;
    }
    const contributionBaseByEmployment = new Map();
    const projectContributionBaseByEmployment = new Map();
    const contributionBasisCodeByEmployment = new Map();
    const contributionLineIdsByEmployment = new Map();
    for (const line of payRun.lines || []) {
      const amount = Number(line.amount || 0);
      if (amount <= 0) {
        continue;
      }
      const explicitMatch = matchesProjectDimension(line.dimensionJson, aliases);
      const shareContext = explicitMatch
        ? createExplicitProjectShareContext()
        : resolveImplicitProjectShareContext(timeSummary, line.employmentId, payRun.reportingPeriod);
      if (shareContext.share <= 0) {
        continue;
      }
      const allocatedAmount = roundMoney(amount * shareContext.share);
      if (allocatedAmount === 0) {
        continue;
      }
      const costBucketCode = resolveProjectCostBucketCode(line);
      appendCostBreakdownAmount(costBreakdown, costBucketCode, allocatedAmount);
      includedPayRuns.add(payRun.payRunId);
      includedPayRunLines.add(line.payRunLineId);
      payrollAllocations.push(
        createProjectPayrollAllocationSeed({
          companyId,
          projectId: project.projectId,
          payRun,
          line,
          employmentId: line.employmentId,
          costBucketCode,
          allocationBasisCode: shareContext.allocationBasisCode,
          allocationShare: shareContext.share,
          allocatedAmount,
          sourceLineAmount: amount,
          contributionBaseAmount: isEmployerContributionEligibleLine(line) ? amount : null,
          projectMinutes: shareContext.projectMinutes,
          totalMinutes: shareContext.totalMinutes,
          sourceLineIds: [line.payRunLineId]
        })
      );
      if (isEmployerContributionEligibleLine(line)) {
        addMoneyToMap(contributionBaseByEmployment, line.employmentId, amount);
        addMoneyToMap(projectContributionBaseByEmployment, line.employmentId, amount * shareContext.share);
        appendToIndex(contributionLineIdsByEmployment, line.employmentId, line.payRunLineId);
        if (!contributionBasisCodeByEmployment.has(line.employmentId)) {
          contributionBasisCodeByEmployment.set(line.employmentId, shareContext.allocationBasisCode);
        } else if (contributionBasisCodeByEmployment.get(line.employmentId) !== shareContext.allocationBasisCode) {
          contributionBasisCodeByEmployment.set(line.employmentId, "mixed_project_basis");
        }
      }
    }
    for (const payslip of payRun.payslips || []) {
      const payslipEmploymentId = normalizeOptionalText(payslip.employmentId || payslip.employment?.employmentId);
      if (!payslipEmploymentId) {
        continue;
      }
      const totalContributionBase = roundMoney(contributionBaseByEmployment.get(payslipEmploymentId) || 0);
      const projectContributionBase = roundMoney(projectContributionBaseByEmployment.get(payslipEmploymentId) || 0);
      const employerContributionAmount = roundMoney(Number(payslip.totals?.employerContributionPreviewAmount || 0));
      if (totalContributionBase <= 0 || projectContributionBase <= 0 || employerContributionAmount <= 0) {
        continue;
      }
      const allocationShare = Math.min(1, roundShare(projectContributionBase / totalContributionBase));
      const allocatedAmount = roundMoney(employerContributionAmount * allocationShare);
      if (allocatedAmount === 0) {
        continue;
      }
      costBreakdown.employerContributionAmount = roundMoney(
        costBreakdown.employerContributionAmount + allocatedAmount
      );
      includedPayRuns.add(payRun.payRunId);
      payrollAllocations.push(
        createProjectPayrollAllocationSeed({
          companyId,
          projectId: project.projectId,
          payRun,
          line: null,
          employmentId: payslipEmploymentId,
          costBucketCode: "employer_contribution",
          allocationBasisCode: contributionBasisCodeByEmployment.get(payslipEmploymentId) || "implicit_time_share",
          allocationShare,
          allocatedAmount,
          sourceType: "employer_contribution_preview",
          sourceId: payslip.payslipId,
          processingStep: 12,
          payItemCode: null,
          sourceLineAmount: employerContributionAmount,
          contributionBaseAmount: totalContributionBase,
          projectMinutes: null,
          totalMinutes: null,
          sourceLineIds: [...new Set(contributionLineIdsByEmployment.get(payslipEmploymentId) || [])]
        })
      );
    }
  }

  const actualCostAmount = roundMoney(
    Object.values(costBreakdown).reduce((sum, value) => sum + Number(value || 0), 0)
  );
  return {
    actualCostAmount,
    costBreakdown,
    payRunCount: includedPayRuns.size,
    payRunLineCount: includedPayRunLines.size,
    payrollAllocationCount: payrollAllocations.length,
    payrollAllocations
  };
}

function collectBillingSummary({ companyId, cutoffDate, aliases, arPlatform }) {
  const invoices = arPlatform?.listInvoices ? arPlatform.listInvoices({ companyId }) : [];
  const eligibleStatuses = new Set(["issued", "delivered", "partially_paid", "paid", "settled"]);
  let billedRevenueAmount = 0;
  let invoiceCount = 0;

  for (const invoice of invoices) {
    if (!eligibleStatuses.has(invoice.status)) {
      continue;
    }
    if ((invoice.issueDate || "9999-12-31") > cutoffDate) {
      continue;
    }
    let matchedInvoice = false;
    for (const line of invoice.lines || []) {
      if (!matchesProjectValue(line.projectId, aliases)) {
        continue;
      }
      billedRevenueAmount = roundMoney(billedRevenueAmount + Number(line.lineAmount || 0));
      matchedInvoice = true;
    }
    if (matchedInvoice) {
      invoiceCount += 1;
    }
  }

  return {
    billedRevenueAmount,
    invoiceCount
  };
}

function collectApSummary({ companyId, cutoffDate, aliases, apPlatform }) {
  const invoices = apPlatform?.listSupplierInvoices ? apPlatform.listSupplierInvoices({ companyId }) : [];
  const costBreakdown = createExtendedProjectCostBreakdown();
  const lines = [];
  let invoiceCount = 0;
  for (const invoice of invoices) {
    if (invoice.status !== "posted") {
      continue;
    }
    if ((invoice.invoiceDate || "9999-12-31") > cutoffDate) {
      continue;
    }
    let matchedInvoice = false;
    for (const line of invoice.lines || []) {
      if (!matchesProjectDimension(line.dimensionsJson, aliases)) {
        continue;
      }
      const amount = roundMoney((invoice.invoiceType === "credit_note" ? -1 : 1) * Number(line.netAmount || 0));
      if (amount === 0) {
        continue;
      }
      const costBucketCode = resolveApCostBucketCode(line);
      appendCostBreakdownAmount(costBreakdown, costBucketCode, amount);
      lines.push({
        supplierInvoiceId: invoice.supplierInvoiceId,
        supplierInvoiceLineId: line.supplierInvoiceLineId || null,
        costBucketCode,
        amount,
        expenseAccountNumber: line.expenseAccountNumber || null,
        invoiceDate: invoice.invoiceDate
      });
      matchedInvoice = true;
    }
    if (matchedInvoice) {
      invoiceCount += 1;
    }
  }
  return {
    actualCostAmount: roundMoney(lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)),
    costBreakdown,
    invoiceCount,
    lineCount: lines.length,
    lines
  };
}

function createExtendedProjectCostBreakdown() {
  return {
    salaryAmount: 0,
    benefitAmount: 0,
    pensionAmount: 0,
    travelAmount: 0,
    employerContributionAmount: 0,
    materialAmount: 0,
    subcontractorAmount: 0,
    equipmentAmount: 0,
    overheadAmount: 0,
    otherAmount: 0
  };
}

function mergeProjectCostBreakdown(left = {}, right = {}) {
  const merged = createExtendedProjectCostBreakdown();
  for (const key of Object.keys(merged)) {
    merged[key] = roundMoney(Number(left?.[key] || 0) + Number(right?.[key] || 0));
  }
  return merged;
}

function resolveApCostBucketCode(line) {
  const explicitBucket = normalizeOptionalText(line?.dimensionsJson?.projectCostBucketCode);
  if (explicitBucket) {
    const resolvedExplicitBucket = normalizeCode(explicitBucket, "project_ap_cost_bucket_invalid").toLowerCase();
    if (
      new Set(["material", "subcontractor", "equipment", "overhead", "travel", "other"]).has(resolvedExplicitBucket)
    ) {
      return resolvedExplicitBucket;
    }
  }
  const accountNumber = String(line?.expenseAccountNumber || "").trim();
  if (/^58/.test(accountNumber)) {
    return "travel";
  }
  if (/^(40|41|49)/.test(accountNumber)) {
    return "material";
  }
  if (/^(42|44|45|46)/.test(accountNumber)) {
    return "subcontractor";
  }
  if (/^(52|54|55|56|57)/.test(accountNumber)) {
    return "equipment";
  }
  if (/^(50|51|53|59|69|70)/.test(accountNumber)) {
    return "overhead";
  }
  return "other";
}

function collectApprovedProjectProfitabilityAdjustments({ project, cutoffDate }) {
  const approved = (project.profitabilityAdjustments || [])
    .filter((record) => record.status === "approved")
    .filter((record) => record.effectiveDate <= cutoffDate);
  const revenueAdjustmentAmount = roundMoney(
    approved.filter((record) => record.impactCode === "revenue").reduce((sum, record) => sum + Number(record.amount || 0), 0)
  );
  const costAdjustmentAmount = roundMoney(
    approved.filter((record) => record.impactCode === "cost").reduce((sum, record) => sum + Number(record.amount || 0), 0)
  );
  const marginAdjustmentAmount = roundMoney(
    approved.filter((record) => record.impactCode === "margin").reduce((sum, record) => sum + Number(record.amount || 0), 0)
  );
  return {
    adjustmentCount: approved.length,
    revenueAdjustmentAmount,
    costAdjustmentAmount,
    marginAdjustmentAmount,
    netAdjustmentAmount: roundMoney(revenueAdjustmentAmount - costAdjustmentAmount + marginAdjustmentAmount),
    snapshotHash: hashObject(
      approved.map((record) => ({
        projectProfitabilityAdjustmentId: record.projectProfitabilityAdjustmentId,
        status: record.status,
        impactCode: record.impactCode,
        amount: record.amount,
        effectiveDate: record.effectiveDate
      }))
    )
  };
}

function collectHusProfitabilitySummary({ companyId, projectId, cutoffDate, husPlatform }) {
  const cases = husPlatform?.listHusCases ? husPlatform.listHusCases({ companyId }).filter((record) => record.projectId === projectId) : [];
  let payoutAmount = 0;
  let recoveryAmount = 0;
  for (const record of cases) {
    for (const payout of record.payouts || []) {
      if ((payout.payoutDate || "9999-12-31") <= cutoffDate) {
        payoutAmount = roundMoney(payoutAmount + Number(payout.payoutAmount || 0));
      }
    }
    for (const recovery of record.recoveries || []) {
      if ((recovery.recoveryDate || "9999-12-31") <= cutoffDate) {
        recoveryAmount = roundMoney(recoveryAmount + Number(recovery.recoveryAmount || 0));
      }
    }
  }
  return {
    caseCount: cases.length,
    husAdjustmentAmount: roundMoney(payoutAmount - recoveryAmount),
    payoutAmount,
    recoveryAmount
  };
}

function resolveEligibleBillingPlanAmount({ project, cutoffDate, billingPlan }) {
  if (!billingPlan) {
    return 0;
  }
  return roundMoney(
    (billingPlan.lines || [])
      .filter((line) => (line.plannedInvoiceDate || "9999-12-31") <= cutoffDate)
      .filter((line) => isBillingPlanLineEligibleForProject(project, line))
      .reduce((sum, line) => sum + Number(line.amount || 0), 0)
  );
}

function isBillingPlanLineEligibleForProject(project, line) {
  if (!line.projectDeliveryMilestoneId) {
    return true;
  }
  const milestone = (project.deliveryMilestones || []).find((record) => record.projectDeliveryMilestoneId === line.projectDeliveryMilestoneId);
  if (!milestone) {
    return false;
  }
  return ["achieved", "accepted"].includes(milestone.status);
}

function buildProjectInvoiceReadinessAssessment({
  state,
  project,
  cutoffDate,
  arPlatform,
  apPlatform,
  hrPlatform,
  timePlatform,
  payrollPlatform,
  husPlatform
}) {
  const resolvedCutoffDate = normalizeRequiredDate(cutoffDate, "project_invoice_readiness_cutoff_date_required");
  const model = buildProjectMetricsModel({
    state,
    project,
    cutoffDate: resolvedCutoffDate,
    arPlatform,
    apPlatform,
    hrPlatform,
    timePlatform,
    payrollPlatform,
    husPlatform
  });
  const activeBillingPlan = (project.billingPlans || []).filter((record) => record.status === "active").pop() || null;
  const approvedRevenuePlan = [...(state.projectRevenuePlanIdsByProject.get(project.projectId) || [])]
    .map((projectRevenuePlanId) => state.projectRevenuePlans.get(projectRevenuePlanId))
    .filter(Boolean)
    .filter((record) => record.status === "approved")
    .sort((left, right) => left.versionNo - right.versionNo)
    .pop() || null;
  const eligibleBillingPlanAmount = resolveEligibleBillingPlanAmount({
    project,
    cutoffDate: resolvedCutoffDate,
    billingPlan: activeBillingPlan
  });
  const pendingManualAdjustments = (project.profitabilityAdjustments || []).filter(
    (record) => record.status === "pending_review" && record.effectiveDate <= resolvedCutoffDate
  );
  const unresolvedCommercialChangeOrders = (project.changeOrders || []).filter(
    (record) => ["draft", "priced", "approved"].includes(record.status)
  );
  const latestStatusUpdate = (project.statusUpdates || [])
    .filter((record) => record.statusDate <= resolvedCutoffDate)
    .sort((left, right) => left.statusDate.localeCompare(right.statusDate) || left.createdAt.localeCompare(right.createdAt))
    .pop() || null;

  const blockerCodes = [];
  const reviewCodes = [];

  if (!approvedRevenuePlan) {
    blockerCodes.push("approved_revenue_plan_missing");
  }
  if (!activeBillingPlan) {
    blockerCodes.push("active_billing_plan_missing");
  }
  if (["retainer_capacity", "subscription_service", "advance_invoice", "hybrid_change_order"].includes(project.billingModelCode)) {
    if (eligibleBillingPlanAmount <= 0) {
      blockerCodes.push("billing_plan_line_not_yet_eligible");
    }
  }
  if (unresolvedCommercialChangeOrders.some((record) => record.status === "approved")) {
    reviewCodes.push("approved_change_order_pending_apply");
  }
  if (pendingManualAdjustments.length > 0) {
    reviewCodes.push("profitability_adjustment_pending_review");
  }
  if (latestStatusUpdate?.healthCode === "red") {
    reviewCodes.push("project_status_red");
  }
  if (model.actualCostAmount > 0 && model.approvedValueAmount === 0 && blockerCodes.length === 0) {
    reviewCodes.push("costs_present_without_approved_value");
  }
  if (model.deferredRevenueAmount > 0) {
    reviewCodes.push("deferred_revenue_balance");
  }

  const status = blockerCodes.length > 0 ? "blocked" : reviewCodes.length > 0 ? "review_required" : "ready";
  const unbilledApprovedValueAmount = roundMoney(Math.max(0, model.approvedValueAmount - model.billedRevenueAmount));
  const invoiceReadyAmount =
    status === "blocked"
      ? 0
      : roundMoney(
          Math.max(
            0,
            ["retainer_capacity", "subscription_service", "advance_invoice", "hybrid_change_order"].includes(project.billingModelCode)
              ? eligibleBillingPlanAmount
              : unbilledApprovedValueAmount
          )
        );

  return {
    cutoffDate: resolvedCutoffDate,
    status,
    blockerCodes,
    reviewCodes,
    approvedRevenuePlanId: approvedRevenuePlan?.projectRevenuePlanId || null,
    activeBillingPlanId: activeBillingPlan?.projectBillingPlanId || null,
    invoiceReadyAmount,
    eligibleBillingPlanAmount: roundMoney(eligibleBillingPlanAmount),
    unbilledApprovedValueAmount,
    approvedValueAmount: model.approvedValueAmount,
    billedRevenueAmount: model.billedRevenueAmount,
    actualCostAmount: model.actualCostAmount,
    currentMarginAmount: model.currentMarginAmount,
    pendingManualAdjustmentCount: pendingManualAdjustments.length,
    unresolvedChangeOrderCount: unresolvedCommercialChangeOrders.length,
    snapshotHash: hashObject({
      projectId: project.projectId,
      cutoffDate: resolvedCutoffDate,
      status,
      blockerCodes,
      reviewCodes,
      approvedRevenuePlanId: approvedRevenuePlan?.projectRevenuePlanId || null,
      activeBillingPlanId: activeBillingPlan?.projectBillingPlanId || null,
      invoiceReadyAmount,
      unbilledApprovedValueAmount,
      currentMarginAmount: model.currentMarginAmount
    })
  };
}

function calculateApprovedValueAmount({ project, cutoffDate, reportingPeriod, budgetSummary, timeSummary, state, billingSummary }) {
  if (project.billingModelCode === "time_and_material") {
    let total = 0;
    for (const entry of timeSummary.entries) {
      const allocation = resolveResourceAllocation(state, project.projectId, entry.employmentId, toReportingPeriodFromDate(entry.workDate));
      if (!allocation) {
        continue;
      }
      total = roundMoney(total + (Number(entry.workedMinutes || 0) / 60) * Number(allocation.billRateAmount || 0));
    }
    return total;
  }
  if (project.billingModelCode === "fixed_price" || project.billingModelCode === "milestone") {
    return budgetSummary.currentRevenueAmount;
  }
  if (["retainer_capacity", "subscription_service", "advance_invoice", "hybrid_change_order"].includes(project.billingModelCode)) {
    const activeBillingPlan = (project.billingPlans || []).filter((record) => record.status === "active").pop() || null;
    const eligibleBillingPlanAmount = resolveEligibleBillingPlanAmount({
      project,
      cutoffDate,
      billingPlan: activeBillingPlan
    });
    if (project.billingModelCode === "advance_invoice") {
      return Math.max(eligibleBillingPlanAmount, billingSummary.billedRevenueAmount);
    }
    return eligibleBillingPlanAmount;
  }
  return 0;
}

function resolveImplicitProjectShare(timeSummary, employmentId, reportingPeriod) {
  const totalKey = `${employmentId}:${reportingPeriod}`;
  const totalMinutes = Number(timeSummary.totalMinutesByEmploymentPeriod.get(totalKey) || 0);
  const projectMinutes = Number(timeSummary.projectMinutesByEmploymentPeriod.get(totalKey) || 0);
  if (totalMinutes <= 0 || projectMinutes <= 0) {
    return 0;
  }
  return projectMinutes / totalMinutes;
}

function resolveImplicitProjectShareContext(timeSummary, employmentId, reportingPeriod) {
  const totalKey = `${employmentId}:${reportingPeriod}`;
  const totalMinutes = Number(timeSummary.totalMinutesByEmploymentPeriod.get(totalKey) || 0);
  const projectMinutes = Number(timeSummary.projectMinutesByEmploymentPeriod.get(totalKey) || 0);
  if (totalMinutes <= 0 || projectMinutes <= 0) {
    return {
      allocationBasisCode: "implicit_time_share",
      share: 0,
      projectMinutes: projectMinutes || 0,
      totalMinutes: totalMinutes || 0
    };
  }
  return {
    allocationBasisCode: "implicit_time_share",
    share: roundShare(projectMinutes / totalMinutes),
    projectMinutes,
    totalMinutes
  };
}

function createExplicitProjectShareContext() {
  return {
    allocationBasisCode: "explicit_project_dimension",
    share: 1,
    projectMinutes: null,
    totalMinutes: null
  };
}

function resolveResourceAllocation(state, projectId, employmentId, reportingPeriod) {
  return (state.resourceAllocationIdsByProject.get(projectId) || [])
    .map((allocationId) => state.resourceAllocations.get(allocationId))
    .filter(Boolean)
    .filter((allocation) => allocation.employmentId === employmentId)
    .filter((allocation) => allocation.reportingPeriod <= reportingPeriod)
    .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod))
    .pop() || null;
}

function summarizeBudgetVersion(budgetVersion, reportingPeriod) {
  if (!budgetVersion) {
    return {
      currentCostAmount: 0,
      futureCostAmount: 0,
      currentRevenueAmount: 0,
      futureRevenueAmount: 0
    };
  }
  let currentCostAmount = 0;
  let futureCostAmount = 0;
  let currentRevenueAmount = 0;
  let futureRevenueAmount = 0;
  for (const line of budgetVersion.lines || []) {
    if (line.lineKind === "cost") {
      if (line.reportingPeriod <= reportingPeriod) {
        currentCostAmount = roundMoney(currentCostAmount + Number(line.amount || 0));
      } else {
        futureCostAmount = roundMoney(futureCostAmount + Number(line.amount || 0));
      }
    } else if (line.lineKind === "revenue") {
      if (line.reportingPeriod <= reportingPeriod) {
        currentRevenueAmount = roundMoney(currentRevenueAmount + Number(line.amount || 0));
      } else {
        futureRevenueAmount = roundMoney(futureRevenueAmount + Number(line.amount || 0));
      }
    }
  }
  return {
    currentCostAmount,
    futureCostAmount,
    currentRevenueAmount,
    futureRevenueAmount
  };
}

function normalizeBudgetLines(lines) {
  if (!Array.isArray(lines)) {
    throw createError(400, "project_budget_lines_invalid", "Project budget lines must be an array.");
  }
  return lines.map((line) => normalizeBudgetLine(line));
}

function normalizeBudgetLine(line) {
  if (!line || typeof line !== "object") {
    throw createError(400, "project_budget_line_invalid", "Each project budget line must be an object.");
  }
  const lineKind = assertAllowed(line.lineKind, PROJECT_BUDGET_LINE_KINDS, "project_budget_line_kind_invalid");
  const categoryCode = assertAllowed(
    line.categoryCode || (lineKind === "revenue" ? "revenue" : "other_cost"),
    PROJECT_BUDGET_CATEGORY_CODES,
    "project_budget_category_invalid"
  );
  if (lineKind === "revenue" && categoryCode !== "revenue") {
    throw createError(400, "project_budget_revenue_category_invalid", "Revenue budget lines must use the revenue category.");
  }
  if (lineKind === "cost" && categoryCode === "revenue") {
    throw createError(400, "project_budget_cost_category_invalid", "Cost budget lines cannot use the revenue category.");
  }
  return {
    projectBudgetLineId: crypto.randomUUID(),
    lineKind,
    categoryCode,
    reportingPeriod: normalizeReportingPeriod(line.reportingPeriod, "project_budget_reporting_period_invalid"),
    amount: normalizeMoney(line.amount, "project_budget_amount_invalid"),
    employmentId: normalizeOptionalText(line.employmentId),
    activityCode: normalizeOptionalText(line.activityCode),
    note: normalizeOptionalText(line.note)
  };
}

function summarizeBudgetLines(lines) {
  let costAmount = 0;
  let revenueAmount = 0;
  for (const line of lines) {
    if (line.lineKind === "cost") {
      costAmount = roundMoney(costAmount + Number(line.amount || 0));
    } else {
      revenueAmount = roundMoney(revenueAmount + Number(line.amount || 0));
    }
  }
  return {
    costAmount,
    revenueAmount
  };
}

function seedProjectDemo(state, clock) {
  const alpha = {
    projectId: "project-demo-alpha",
    companyId: DEMO_COMPANY_ID,
    projectCode: "P-ALPHA",
    projectReferenceCode: "project-demo-alpha",
    displayName: "Demo Project Alpha",
    customerId: null,
    projectManagerEmployeeId: null,
    startsOn: "2026-01-01",
    endsOn: null,
    currencyCode: "SEK",
    status: "active",
    billingModelCode: "time_and_material",
    revenueRecognitionModelCode: "billing_equals_revenue",
    contractValueAmount: 180000,
    dimensionJson: {},
    opportunityLinks: [],
    quoteLinks: [],
    billingPlans: [],
    statusUpdates: [],
    capacityReservations: [],
    assignmentPlans: [],
    risks: [],
    profitabilityAdjustments: [],
    invoiceReadinessAssessments: [],
    changeOrders: [],
    buildVatAssessments: [],
    createdByActorId: "system",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  const beta = {
    projectId: "project-demo-beta",
    companyId: DEMO_COMPANY_ID,
    projectCode: "P-BETA",
    projectReferenceCode: "project-demo-beta",
    displayName: "Demo Project Beta",
    customerId: null,
    projectManagerEmployeeId: null,
    startsOn: "2026-01-01",
    endsOn: null,
    currencyCode: "SEK",
    status: "active",
    billingModelCode: "fixed_price",
    revenueRecognitionModelCode: "over_time",
    contractValueAmount: 260000,
    dimensionJson: {},
    opportunityLinks: [],
    quoteLinks: [],
    billingPlans: [],
    statusUpdates: [],
    capacityReservations: [],
    assignmentPlans: [],
    risks: [],
    profitabilityAdjustments: [],
    invoiceReadinessAssessments: [],
    changeOrders: [],
    buildVatAssessments: [],
    createdByActorId: "system",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  for (const project of [alpha, beta]) {
    state.projects.set(project.projectId, project);
    appendToIndex(state.projectIdsByCompany, project.companyId, project.projectId);
    state.projectIdByAlias.set(toCompanyScopedKey(project.companyId, project.projectId), project.projectId);
    state.projectIdByAlias.set(toCompanyScopedKey(project.companyId, project.projectCode), project.projectId);
    state.projectIdByAlias.set(toCompanyScopedKey(project.companyId, project.projectReferenceCode), project.projectId);
  }
  const budgetSeed = [
    createBudgetSeedVersion(state, alpha, clock, [
      createBudgetSeedLine("cost", "labor", "202603", 42000),
      createBudgetSeedLine("cost", "benefits", "202603", 2500),
      createBudgetSeedLine("cost", "pension", "202603", 3200),
      createBudgetSeedLine("cost", "travel", "202603", 1800),
      createBudgetSeedLine("revenue", "revenue", "202603", 78000),
      createBudgetSeedLine("cost", "labor", "202604", 43000),
      createBudgetSeedLine("revenue", "revenue", "202604", 82000)
    ]),
    createBudgetSeedVersion(state, beta, clock, [
      createBudgetSeedLine("cost", "labor", "202603", 48000),
      createBudgetSeedLine("cost", "material", "202603", 22000),
      createBudgetSeedLine("revenue", "revenue", "202603", 90000),
      createBudgetSeedLine("cost", "labor", "202604", 51000),
      createBudgetSeedLine("revenue", "revenue", "202604", 110000)
    ])
  ];
  for (const version of budgetSeed) {
    state.budgetVersions.set(version.projectBudgetVersionId, version);
    appendToIndex(state.budgetVersionIdsByProject, version.projectId, version.projectBudgetVersionId);
  }
  const allocations = [
    createResourceSeedAllocation(alpha, "employment-demo-alpha", "202603", 9600, 9600, 900, 450, clock),
    createResourceSeedAllocation(alpha, "employment-demo-alpha", "202604", 9600, 9600, 900, 450, clock),
    createResourceSeedAllocation(beta, "employment-demo-beta", "202603", 9600, 9600, 1100, 500, clock)
  ];
  for (const allocation of allocations) {
    state.resourceAllocations.set(allocation.projectResourceAllocationId, allocation);
    appendToIndex(state.resourceAllocationIdsByProject, allocation.projectId, allocation.projectResourceAllocationId);
  }
}

function createBudgetSeedVersion(state, project, clock, lines) {
  return {
    projectBudgetVersionId: crypto.randomUUID(),
    companyId: project.companyId,
    projectId: project.projectId,
    versionNo: nextVersionNo(state, project.projectId),
    budgetName: `${project.projectCode} baseline`,
    validFrom: project.startsOn,
    status: "approved",
    totals: summarizeBudgetLines(lines),
    lines,
    createdByActorId: "system",
    createdAt: nowIso(clock)
  };
}

function createBudgetSeedLine(lineKind, categoryCode, reportingPeriod, amount) {
  return {
    projectBudgetLineId: crypto.randomUUID(),
    lineKind,
    categoryCode,
    reportingPeriod,
    amount,
    employmentId: null,
    activityCode: null,
    note: "seed"
  };
}

function createResourceSeedAllocation(project, employmentId, reportingPeriod, plannedMinutes, billableMinutes, billRateAmount, costRateAmount, clock) {
  return {
    projectResourceAllocationId: crypto.randomUUID(),
    companyId: project.companyId,
    projectId: project.projectId,
    employmentId,
    reportingPeriod,
    plannedMinutes,
    billableMinutes,
    billRateAmount,
    costRateAmount,
    activityCode: null,
    status: "planned",
    createdByActorId: "system",
    createdAt: nowIso(clock)
  };
}

function listEmploymentContexts(companyId, hrPlatform) {
  if (!hrPlatform?.listEmployees || !hrPlatform?.listEmployments) {
    return [];
  }
  const result = [];
  for (const employee of hrPlatform.listEmployees({ companyId })) {
    for (const employment of hrPlatform.listEmployments({
      companyId,
      employeeId: employee.employeeId
    })) {
      result.push({
        employeeId: employee.employeeId,
        employmentId: employment.employmentId
      });
    }
  }
  return result;
}

function findEmploymentContextByEmploymentId({ companyId, employmentId, hrPlatform }) {
  const match = listEmploymentContexts(companyId, hrPlatform).find((candidate) => candidate.employmentId === employmentId);
  if (!match) {
    throw createError(404, "employment_not_found", "Employment was not found.");
  }
  return match;
}

function findEmploymentContextByEmployeeId({ companyId, employeeId, hrPlatform }) {
  const contexts = listEmploymentContexts(companyId, hrPlatform).filter((candidate) => candidate.employeeId === employeeId);
  if (contexts.length === 0) {
    throw createError(404, "employee_not_found", "Employee was not found.");
  }
  return contexts[0];
}

function findLatestBudgetVersion(state, projectId) {
  return (state.budgetVersionIdsByProject.get(projectId) || [])
    .map((budgetVersionId) => state.budgetVersions.get(budgetVersionId))
    .filter(Boolean)
    .sort((left, right) => left.versionNo - right.versionNo)
    .pop() || null;
}

function nextVersionNo(state, projectId) {
  return (
    (state.budgetVersionIdsByProject.get(projectId) || [])
      .map((budgetVersionId) => state.budgetVersions.get(budgetVersionId))
      .filter(Boolean)
      .sort((left, right) => left.versionNo - right.versionNo)
      .pop()?.versionNo || 0
  ) + 1;
}

function collectProjectAliases(project) {
  return new Set([project.projectId, project.projectCode, project.projectReferenceCode].filter(Boolean));
}

function matchesProjectDimension(dimensionJson, aliases) {
  if (!dimensionJson || typeof dimensionJson !== "object" || Array.isArray(dimensionJson)) {
    return false;
  }
  return matchesProjectValue(normalizeOptionalText(dimensionJson.projectId), aliases);
}

function matchesProjectValue(value, aliases) {
  const normalizedValue = normalizeOptionalText(value);
  if (!normalizedValue) {
    return false;
  }
  return aliases.has(normalizedValue);
}

function isPensionLine(line) {
  return new Set(["PENSION_PREMIUM", "FORA_PREMIUM", "EXTRA_PENSION_PREMIUM", "PENSION_SPECIAL_PAYROLL_TAX"]).has(
    line.payItemCode
  );
}

function isBenefitLine(line) {
  return line.sourceType === "benefit_event";
}

function isTravelLine(line) {
  return line.sourceType === "travel_claim";
}

function isSalaryLine(line) {
  return !line.reportingOnly && line.compensationBucket !== "net_deduction";
}

function resolveProjectCostBucketCode(line) {
  if (isPensionLine(line)) {
    return "pension";
  }
  if (isBenefitLine(line)) {
    return "benefit";
  }
  if (isTravelLine(line)) {
    return "travel";
  }
  if (isSalaryLine(line)) {
    return "salary";
  }
  return "other";
}

function appendCostBreakdownAmount(costBreakdown, costBucketCode, amount) {
  if (costBucketCode === "salary") {
    costBreakdown.salaryAmount = roundMoney(costBreakdown.salaryAmount + amount);
    return;
  }
  if (costBucketCode === "benefit") {
    costBreakdown.benefitAmount = roundMoney(costBreakdown.benefitAmount + amount);
    return;
  }
  if (costBucketCode === "pension") {
    costBreakdown.pensionAmount = roundMoney(costBreakdown.pensionAmount + amount);
    return;
  }
  if (costBucketCode === "travel") {
    costBreakdown.travelAmount = roundMoney(costBreakdown.travelAmount + amount);
    return;
  }
  if (costBucketCode === "employer_contribution") {
    costBreakdown.employerContributionAmount = roundMoney(costBreakdown.employerContributionAmount + amount);
    return;
  }
  if (costBucketCode === "material") {
    costBreakdown.materialAmount = roundMoney(costBreakdown.materialAmount + amount);
    return;
  }
  if (costBucketCode === "subcontractor") {
    costBreakdown.subcontractorAmount = roundMoney(costBreakdown.subcontractorAmount + amount);
    return;
  }
  if (costBucketCode === "equipment") {
    costBreakdown.equipmentAmount = roundMoney(costBreakdown.equipmentAmount + amount);
    return;
  }
  if (costBucketCode === "overhead") {
    costBreakdown.overheadAmount = roundMoney(costBreakdown.overheadAmount + amount);
    return;
  }
  costBreakdown.otherAmount = roundMoney(costBreakdown.otherAmount + amount);
}

function isEmployerContributionEligibleLine(line) {
  return line?.employerContributionTreatmentCode === "included";
}

function createProjectPayrollAllocationSeed({
  companyId,
  projectId,
  payRun,
  line,
  employmentId,
  costBucketCode,
  allocationBasisCode,
  allocationShare,
  allocatedAmount,
  sourceType = null,
  sourceId = null,
  processingStep = null,
  payItemCode = null,
  sourceLineAmount = null,
  contributionBaseAmount = null,
  projectMinutes = null,
  totalMinutes = null,
  sourceLineIds = []
}) {
  return {
    companyId,
    projectId,
    payRunId: payRun.payRunId,
    payRunLineId: line?.payRunLineId || null,
    employmentId: requireText(employmentId, "project_payroll_cost_allocation_employment_required"),
    reportingPeriod: payRun.reportingPeriod,
    payDate: payRun.payDate,
    payItemCode: normalizeOptionalText(payItemCode ?? line?.payItemCode),
    sourceType: requireText(sourceType || line?.sourceType || "payroll_line", "project_payroll_cost_allocation_source_type_required"),
    sourceId: normalizeOptionalText(sourceId ?? line?.sourceId),
    processingStep:
      processingStep == null
        ? line?.processingStep == null
          ? null
          : Number(line.processingStep)
        : Number(processingStep),
    costBucketCode: requireText(costBucketCode, "project_payroll_cost_allocation_bucket_required"),
    allocationBasisCode: requireText(allocationBasisCode, "project_payroll_cost_allocation_basis_required"),
    allocationShare: roundShare(allocationShare),
    allocatedAmount: normalizeMoney(allocatedAmount, "project_payroll_cost_allocation_amount_invalid"),
    sourceLineAmount: sourceLineAmount == null ? null : normalizeMoney(sourceLineAmount, "project_payroll_cost_source_amount_invalid"),
    contributionBaseAmount:
      contributionBaseAmount == null
        ? null
        : normalizeMoney(contributionBaseAmount, "project_payroll_cost_contribution_base_invalid"),
    projectMinutes: projectMinutes == null ? null : normalizeWholeNumber(projectMinutes, "project_payroll_cost_project_minutes_invalid"),
    totalMinutes: totalMinutes == null ? null : normalizeWholeNumber(totalMinutes, "project_payroll_cost_total_minutes_invalid"),
    dimensionJson: normalizeDimensions(line?.dimensionJson || {}),
    sourceLineIds: [...new Set((sourceLineIds || []).filter(Boolean))]
  };
}

function persistProjectPayrollCostAllocations(state, projectCostSnapshotId, payrollAllocations, clock) {
  for (const allocation of payrollAllocations) {
    const record = {
      projectPayrollCostAllocationId: crypto.randomUUID(),
      companyId: allocation.companyId,
      projectId: allocation.projectId,
      projectCostSnapshotId,
      payRunId: allocation.payRunId,
      payRunLineId: allocation.payRunLineId,
      employmentId: allocation.employmentId,
      reportingPeriod: allocation.reportingPeriod,
      payDate: allocation.payDate,
      payItemCode: allocation.payItemCode,
      sourceType: allocation.sourceType,
      sourceId: allocation.sourceId,
      processingStep: allocation.processingStep,
      costBucketCode: allocation.costBucketCode,
      allocationBasisCode: allocation.allocationBasisCode,
      allocationShare: allocation.allocationShare,
      allocatedAmount: allocation.allocatedAmount,
      sourceLineAmount: allocation.sourceLineAmount,
      contributionBaseAmount: allocation.contributionBaseAmount,
      projectMinutes: allocation.projectMinutes,
      totalMinutes: allocation.totalMinutes,
      sourceLineIds: copy(allocation.sourceLineIds || []),
      dimensionJson: normalizeDimensions(allocation.dimensionJson),
      createdAt: nowIso(clock)
    };
    state.projectPayrollCostAllocations.set(record.projectPayrollCostAllocationId, record);
    appendToIndex(state.projectPayrollCostAllocationIdsByProject, record.projectId, record.projectPayrollCostAllocationId);
    appendToIndex(state.projectPayrollCostAllocationIdsBySnapshot, record.projectCostSnapshotId, record.projectPayrollCostAllocationId);
  }
}

function requireProject(state, companyId, projectId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedProjectId = requireText(projectId, "project_id_required");
  const direct = state.projects.get(resolvedProjectId);
  if (direct && direct.companyId === resolvedCompanyId) {
    return direct;
  }
  const aliasedProjectId = state.projectIdByAlias.get(toCompanyScopedKey(resolvedCompanyId, resolvedProjectId));
  const record = aliasedProjectId ? state.projects.get(aliasedProjectId) : null;
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "project_not_found", "Project was not found.");
  }
  return record;
}

function requireProjectEngagement(state, companyId, projectId, projectEngagementId) {
  const record = state.projectEngagements.get(requireText(projectEngagementId, "project_engagement_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.projectId !== requireText(projectId, "project_id_required")) {
    throw createError(404, "project_engagement_not_found", "Project engagement was not found.");
  }
  return record;
}

function requireProjectWorkModel(state, companyId, projectId, projectWorkModelId) {
  const record = state.projectWorkModels.get(requireText(projectWorkModelId, "project_work_model_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.projectId !== requireText(projectId, "project_id_required")) {
    throw createError(404, "project_work_model_not_found", "Project work model was not found.");
  }
  return record;
}

function requireProjectWorkPackage(state, companyId, projectId, projectWorkPackageId) {
  const record = state.projectWorkPackages.get(requireText(projectWorkPackageId, "project_work_package_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.projectId !== requireText(projectId, "project_id_required")) {
    throw createError(404, "project_work_package_not_found", "Project work package was not found.");
  }
  return record;
}

function requireProjectDeliveryMilestone(state, companyId, projectId, projectDeliveryMilestoneId) {
  const record = state.projectDeliveryMilestones.get(requireText(projectDeliveryMilestoneId, "project_delivery_milestone_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.projectId !== requireText(projectId, "project_id_required")) {
    throw createError(404, "project_delivery_milestone_not_found", "Project delivery milestone was not found.");
  }
  return record;
}

function requireProjectRevenuePlan(state, companyId, projectId, projectRevenuePlanId) {
  const record = state.projectRevenuePlans.get(requireText(projectRevenuePlanId, "project_revenue_plan_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.projectId !== requireText(projectId, "project_id_required")) {
    throw createError(404, "project_revenue_plan_not_found", "Project revenue plan was not found.");
  }
  return record;
}

function requireProjectChangeOrder(project, projectChangeOrderId) {
  const resolvedProjectChangeOrderId = requireText(projectChangeOrderId, "project_change_order_id_required");
  const record = (project.changeOrders || []).find((candidate) => candidate.projectChangeOrderId === resolvedProjectChangeOrderId);
  if (!record) {
    throw createError(404, "project_change_order_not_found", "Project change order was not found.");
  }
  return record;
}

function requireProjectProfitabilityAdjustment(project, projectProfitabilityAdjustmentId) {
  const resolvedProjectProfitabilityAdjustmentId = requireText(
    projectProfitabilityAdjustmentId,
    "project_profitability_adjustment_id_required"
  );
  const record = (project.profitabilityAdjustments || []).find(
    (candidate) => candidate.projectProfitabilityAdjustmentId === resolvedProjectProfitabilityAdjustmentId
  );
  if (!record) {
    throw createError(404, "project_profitability_adjustment_not_found", "Project profitability adjustment was not found.");
  }
  return record;
}

function assertProjectChangeOrderTransition(currentStatus, nextStatus) {
  const allowed = {
    draft: new Set(["priced", "cancelled"]),
    priced: new Set(["approved", "rejected", "cancelled"]),
    approved: new Set(["applied", "cancelled"]),
    rejected: new Set(),
    cancelled: new Set(),
    applied: new Set()
  };
  if (currentStatus === nextStatus) {
    return;
  }
  if (!allowed[currentStatus]?.has(nextStatus)) {
    throw createError(
      409,
      "project_change_order_transition_invalid",
      `Project change order cannot move from ${currentStatus} to ${nextStatus}.`
    );
  }
}

function applyProjectChangeOrder({
  project,
  record,
  effectiveDate,
  billingPlanFrequencyCode,
  billingPlanTriggerCode,
  actorId,
  correlationId,
  clock,
  createProjectRevenuePlan,
  approveProjectRevenuePlan,
  createProjectBillingPlan
}) {
  const resolvedEffectiveDate = normalizeRequiredDate(
    effectiveDate || record.customerApprovedAt || new Date(clock()).toISOString().slice(0, 10),
    "project_change_order_effective_date_required"
  );
  const resolvedActorId = requireText(actorId, "actor_id_required");
  let appliedRevenuePlanId = null;
  let appliedBillingPlanId = null;

  if (Number(record.revenueImpactAmount || 0) !== 0) {
    const createdRevenuePlan = createProjectRevenuePlan({
      companyId: project.companyId,
      projectId: project.projectId,
      versionLabel: `change-order-${record.projectChangeOrderId.slice(0, 8)}`,
      lines: [
        {
          recognitionDate: resolvedEffectiveDate,
          triggerTypeCode: "change_order",
          amount: record.revenueImpactAmount,
          note: record.title
        }
      ],
      actorId: resolvedActorId,
      correlationId
    });
    const approvedRevenuePlan = approveProjectRevenuePlan({
      companyId: project.companyId,
      projectId: project.projectId,
      projectRevenuePlanId: createdRevenuePlan.projectRevenuePlanId,
      actorId: resolvedActorId,
      correlationId
    });
    appliedRevenuePlanId = approvedRevenuePlan.projectRevenuePlanId;

    const createdBillingPlan = createProjectBillingPlan({
      companyId: project.companyId,
      projectId: project.projectId,
      frequencyCode: billingPlanFrequencyCode || "one_off",
      triggerCode: billingPlanTriggerCode || "change_order_approval",
      startsOn: resolvedEffectiveDate,
      status: "active",
      lines: [
        {
          plannedInvoiceDate: resolvedEffectiveDate,
          amount: record.revenueImpactAmount,
          triggerCode: billingPlanTriggerCode || "change_order_approval",
          note: record.title
        }
      ],
      actorId: resolvedActorId,
      correlationId
    });
    appliedBillingPlanId = createdBillingPlan.projectBillingPlanId;
  }

  return {
    appliedAt: nowIso(clock),
    appliedRevenuePlanId,
    appliedBillingPlanId
  };
}

function requireProjectQuoteLink(project, projectQuoteLinkId) {
  const record = (project.quoteLinks || []).find(
    (candidate) => candidate.projectQuoteLinkId === requireText(projectQuoteLinkId, "project_quote_link_id_required")
  );
  if (!record) {
    throw createError(404, "project_quote_link_not_found", "Project quote link was not found.");
  }
  return record;
}

function requireProjectSourceQuote({ arPlatform, companyId, sourceQuoteId }) {
  if (!arPlatform?.getQuote) {
    throw createError(503, "ar_quote_runtime_unavailable", "AR quote runtime is required for project quote handoff.");
  }
  return arPlatform.getQuote({
    companyId: requireText(companyId, "company_id_required"),
    quoteId: requireText(sourceQuoteId, "project_source_quote_id_required")
  });
}

function selectProjectSourceQuoteVersion({ quote, sourceQuoteVersionId = null }) {
  const targetVersionId = normalizeOptionalText(sourceQuoteVersionId) || quote.currentVersionId;
  const version = (quote.versions || []).find((candidate) => candidate.quoteVersionId === targetVersionId);
  if (!version) {
    throw createError(404, "project_source_quote_version_not_found", "Quote version was not found for project handoff.");
  }
  if (!["accepted", "converted"].includes(version.status)) {
    throw createError(409, "project_source_quote_not_accepted", "Only accepted or converted quote versions may create a project handoff.");
  }
  return version;
}

function findProjectByQuoteLink({ state, companyId, sourceQuoteId, sourceQuoteVersionId }) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  for (const projectId of state.projectIdsByCompany.get(resolvedCompanyId) || []) {
    const project = state.projects.get(projectId);
    if (!project) {
      continue;
    }
    const linked = (project.quoteLinks || []).some(
      (record) => record.sourceQuoteId === sourceQuoteId && record.sourceQuoteVersionId === sourceQuoteVersionId
    );
    if (linked) {
      return copy(project);
    }
  }
  return null;
}

function normalizeBillingPlanLines({ lines, defaultPlannedInvoiceDate, defaultAmount, project }) {
  const sourceLines = Array.isArray(lines) && lines.length > 0
    ? lines
    : [
        {
          plannedInvoiceDate: defaultPlannedInvoiceDate || project.startsOn,
          amount: defaultAmount || 0
        }
      ];
  return sourceLines.map((line) => {
    if (!line || typeof line !== "object") {
      throw createError(400, "project_billing_plan_line_invalid", "Billing plan lines must be objects.");
    }
    return {
      projectBillingPlanLineId: crypto.randomUUID(),
      plannedInvoiceDate: normalizeRequiredDate(line.plannedInvoiceDate, "project_billing_plan_date_required"),
      amount: normalizeMoney(line.amount, "project_billing_plan_amount_invalid"),
      triggerCode: normalizeCode(line.triggerCode || "manual", "project_billing_plan_line_trigger_required"),
      note: normalizeOptionalText(line.note),
      projectWorkPackageId: normalizeOptionalText(line.projectWorkPackageId),
      projectDeliveryMilestoneId: normalizeOptionalText(line.projectDeliveryMilestoneId),
      sourceQuoteVersionId: normalizeOptionalText(line.sourceQuoteVersionId)
    };
  });
}

function summarizeProjectCustomerContext({ project, opportunityLinks, quoteLinks, arPlatform }) {
  const customer = project.customerId && arPlatform?.getCustomer
    ? arPlatform.getCustomer({
        companyId: project.companyId,
        customerId: project.customerId
      })
    : null;
  return {
    customerId: project.customerId,
    customerNo: customer?.customerNo || null,
    customerName: customer?.legalName || null,
    activeOpportunityRef: opportunityLinks.at(-1)?.externalOpportunityRef || opportunityLinks.at(-1)?.externalOpportunityId || null,
    activeQuoteRef: quoteLinks.at(-1)?.externalQuoteRef || quoteLinks.at(-1)?.quoteNo || null
  };
}

function normalizeRevenuePlanLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw createError(400, "project_revenue_plan_lines_required", "Revenue plans require at least one line.");
  }
  return lines.map((line) => normalizeRevenuePlanLine(line));
}

function normalizeRevenuePlanLine(line) {
  if (!line || typeof line !== "object") {
    throw createError(400, "project_revenue_plan_line_invalid", "Each revenue plan line must be an object.");
  }
  return {
    projectRevenuePlanLineId: crypto.randomUUID(),
    recognitionDate: normalizeRequiredDate(line.recognitionDate, "project_revenue_plan_recognition_date_required"),
    triggerTypeCode: normalizeCode(line.triggerTypeCode || "manual", "project_revenue_plan_trigger_type_required"),
    amount: normalizeMoney(line.amount, "project_revenue_plan_amount_invalid"),
    note: normalizeOptionalText(line.note),
    projectWorkPackageId: normalizeOptionalText(line.projectWorkPackageId),
    projectDeliveryMilestoneId: normalizeOptionalText(line.projectDeliveryMilestoneId)
  };
}

function summarizeRevenuePlanLines(lines) {
  return {
    plannedRevenueAmount: roundMoney((lines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0))
  };
}

function nextProjectRevenuePlanVersionNo(state, projectId) {
  return (
    (state.projectRevenuePlanIdsByProject.get(projectId) || [])
      .map((projectRevenuePlanId) => state.projectRevenuePlans.get(projectRevenuePlanId))
      .filter(Boolean)
      .sort((left, right) => left.versionNo - right.versionNo)
      .pop()?.versionNo || 0
  ) + 1;
}

function calculateRevenuePlanAmountAtCutoff(revenuePlan, cutoffDate) {
  return roundMoney(
    (revenuePlan.lines || [])
      .filter((line) => line.recognitionDate <= cutoffDate)
      .reduce((sum, line) => sum + Number(line.amount || 0), 0)
  );
}

function normalizePercentage(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw createError(400, code, "Percentage must be between 0 and 100.");
  }
  return Math.round(parsed * 100) / 100;
}

function uniqueTexts(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function resolveProjectBuildVatCodeCandidate({ reverseChargeFlag, vatRate }) {
  if (reverseChargeFlag) {
    return "VAT_SE_RC_BUILD_SELL";
  }
  if (roundMoney(vatRate) === 25) {
    return "VAT_SE_DOMESTIC_25";
  }
  if (roundMoney(vatRate) === 12) {
    return "VAT_SE_DOMESTIC_12";
  }
  if (roundMoney(vatRate) === 6) {
    return "VAT_SE_DOMESTIC_6";
  }
  if (roundMoney(vatRate) === 0) {
    return "VAT_SE_EXEMPT";
  }
  throw createError(400, "project_build_vat_rate_unsupported", "Unsupported VAT rate for project build VAT.");
}

function resolveProjectVatReportBoxCode(vatCodeCandidate) {
  if (vatCodeCandidate === "VAT_SE_RC_BUILD_SELL") {
    return "41";
  }
  if (vatCodeCandidate === "VAT_SE_DOMESTIC_25") {
    return "10";
  }
  if (vatCodeCandidate === "VAT_SE_DOMESTIC_12") {
    return "11";
  }
  if (vatCodeCandidate === "VAT_SE_DOMESTIC_6") {
    return "12";
  }
  if (vatCodeCandidate === "VAT_SE_EXEMPT") {
    return "42";
  }
  return "manual_review";
}

function ensureUniqueAlias(state, companyId, alias) {
  if (state.projectIdByAlias.has(toCompanyScopedKey(companyId, alias))) {
    throw createError(409, "project_alias_not_unique", `Project alias ${alias} already exists.`);
  }
}

function generateProjectCode(state, companyId) {
  const count = (state.projectIdsByCompany.get(companyId) || []).length + 100;
  return `P-${String(count).padStart(3, "0")}`;
}

function toProjectSlug(value) {
  return requireText(String(value), "project_slug_required")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRequiredDate(value, code) {
  const normalized = normalizeOptionalDate(value, code);
  if (!normalized) {
    throw createError(400, code, "Date is required.");
  }
  return normalized;
}

function normalizeOptionalDate(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, "Date must use YYYY-MM-DD.");
  }
  return normalized;
}

function normalizeReportingPeriod(value, code) {
  const normalized = requireText(value, code);
  if (!/^\d{6}$/.test(normalized)) {
    throw createError(400, code, "Reporting period must use YYYYMM.");
  }
  return normalized;
}

function toReportingPeriodFromDate(dateValue) {
  const resolvedDate = normalizeRequiredDate(dateValue, "project_cutoff_date_required");
  return `${resolvedDate.slice(0, 4)}${resolvedDate.slice(5, 7)}`;
}

function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, "Required value is missing.");
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeCode(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function requireEnum(allowedValues, value, code) {
  const normalized = requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toLowerCase();
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `Value ${normalized} is not allowed.`);
  }
  return normalized;
}

function normalizeUpperCode(value, code, length = null) {
  const normalized = requireText(value, code).toUpperCase();
  if (length != null && normalized.length !== length) {
    throw createError(400, code, `Expected ${length} characters.`);
  }
  return normalized;
}

function normalizeMoney(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw createError(400, code, "Expected a finite numeric amount.");
  }
  return roundMoney(numberValue);
}

function roundShare(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000000) / 1000000;
}

function normalizeWholeNumber(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw createError(400, code, "Expected a non-negative number.");
  }
  return Math.round(numberValue);
}

function normalizeDimensions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return copy(value);
}

function assertAllowed(value, allowedValues, code) {
  const normalized = requireText(value, code);
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `Value ${normalized} is not allowed.`);
  }
  return normalized;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function toCompanyScopedKey(companyId, value) {
  return `${companyId}:${value}`;
}

function appendToIndex(map, key, value) {
  const current = map.get(key) || [];
  current.push(value);
  map.set(key, current);
}

function addMoneyToMap(map, key, amount) {
  const resolvedKey = requireText(key, "map_key_required");
  map.set(resolvedKey, roundMoney(Number(map.get(resolvedKey) || 0) + Number(amount || 0)));
}

function pushAudit(state, clock, entry) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "projects_action",
      event: entry
    })
  );
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function compareAuditEvents(left, right) {
  return resolveAuditRecordedAt(left).localeCompare(resolveAuditRecordedAt(right))
    || String(left.auditId || left.auditEventId || "").localeCompare(String(right.auditId || right.auditEventId || ""));
}

function resolveAuditRecordedAt(event) {
  return String(event?.recordedAt || event?.createdAt || event?.occurredAt || "");
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createError(statusCode, error, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
}
