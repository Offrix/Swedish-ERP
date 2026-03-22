import crypto from "node:crypto";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const PROJECT_STATUSES = Object.freeze(["draft", "active", "on_hold", "closed", "archived"]);
export const PROJECT_BILLING_MODEL_CODES = Object.freeze(["time_and_material", "fixed_price", "milestone"]);
export const PROJECT_REVENUE_RECOGNITION_MODEL_CODES = Object.freeze([
  "billing_equals_revenue",
  "over_time",
  "deferred_until_milestone"
]);
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
export const PROJECT_SNAPSHOT_STATUSES = Object.freeze(["materialized", "review_required"]);

export function createProjectsPlatform(options = {}) {
  return createProjectEngine(options);
}

export function createProjectEngine({
  clock = () => new Date(),
  seedDemo = true,
  arPlatform = null,
  hrPlatform = null,
  timePlatform = null,
  payrollPlatform = null
} = {}) {
  const state = {
    projects: new Map(),
    projectIdsByCompany: new Map(),
    projectIdByAlias: new Map(),
    budgetVersions: new Map(),
    budgetVersionIdsByProject: new Map(),
    resourceAllocations: new Map(),
    resourceAllocationIdsByProject: new Map(),
    costSnapshots: new Map(),
    costSnapshotIdsByProject: new Map(),
    wipSnapshots: new Map(),
    wipSnapshotIdsByProject: new Map(),
    forecastSnapshots: new Map(),
    forecastSnapshotIdsByProject: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedProjectDemo(state, clock);
  }

  return {
    projectStatuses: PROJECT_STATUSES,
    projectBillingModelCodes: PROJECT_BILLING_MODEL_CODES,
    projectRevenueRecognitionModelCodes: PROJECT_REVENUE_RECOGNITION_MODEL_CODES,
    projectBudgetLineKinds: PROJECT_BUDGET_LINE_KINDS,
    projectBudgetCategoryCodes: PROJECT_BUDGET_CATEGORY_CODES,
    projectResourceAllocationStatuses: PROJECT_RESOURCE_ALLOCATION_STATUSES,
    projectSnapshotStatuses: PROJECT_SNAPSHOT_STATUSES,
    listProjects,
    getProject,
    createProject,
    listProjectBudgetVersions,
    createProjectBudgetVersion,
    listProjectResourceAllocations,
    createProjectResourceAllocation,
    listProjectCostSnapshots,
    materializeProjectCostSnapshot,
    listProjectWipSnapshots,
    materializeProjectWipSnapshot,
    listProjectForecastSnapshots,
    materializeProjectForecastSnapshot,
    listProjectAuditEvents
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

  function listProjectCostSnapshots({ companyId, projectId } = {}) {
    const project = requireProject(state, companyId, projectId);
    return (state.costSnapshotIdsByProject.get(project.projectId) || [])
      .map((snapshotId) => state.costSnapshots.get(snapshotId))
      .filter(Boolean)
      .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate) || left.createdAt.localeCompare(right.createdAt))
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
      hrPlatform,
      timePlatform,
      payrollPlatform
    });
    const existing = listProjectCostSnapshots({ companyId: project.companyId, projectId: project.projectId }).find(
      (candidate) => candidate.snapshotHash === model.snapshotHash
    );
    if (existing) {
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
      hrPlatform,
      timePlatform,
      payrollPlatform
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
      hrPlatform,
      timePlatform,
      payrollPlatform
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

  function listProjectAuditEvents({ companyId, projectId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedProjectId = normalizeOptionalText(projectId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedProjectId ? event.projectId === requireProject(state, resolvedCompanyId, resolvedProjectId).projectId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }
}

function buildProjectMetricsModel({ state, project, cutoffDate, arPlatform, hrPlatform, timePlatform, payrollPlatform }) {
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
  const approvedValueAmount = calculateApprovedValueAmount({
    project,
    reportingPeriod,
    budgetSummary,
    timeSummary,
    state
  });
  const recognizedRevenueAmount =
    project.revenueRecognitionModelCode === "billing_equals_revenue"
      ? billingSummary.billedRevenueAmount
      : approvedValueAmount;
  const explanationCodes = [];
  if (project.billingModelCode === "time_and_material" && timeSummary.actualMinutes > 0 && approvedValueAmount === 0) {
    explanationCodes.push("rate_missing_review");
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
  const forecastCostAtCompletionAmount = roundMoney(payrollSummary.actualCostAmount + remainingBudgetCostAmount);
  const forecastRevenueAtCompletionAmount = roundMoney(recognizedRevenueAmount + remainingBudgetRevenueAmount);
  const currentMarginAmount = roundMoney(recognizedRevenueAmount - payrollSummary.actualCostAmount);
  const forecastMarginAmount = roundMoney(forecastRevenueAtCompletionAmount - forecastCostAtCompletionAmount);
  const resourceLoadPercent = roundPercentage(
    timeSummary.plannedMinutesToDate === 0 ? 0 : (timeSummary.actualMinutes / timeSummary.plannedMinutesToDate) * 100
  );
  const snapshotStatus = explanationCodes.some((code) => code.endsWith("_review")) ? "review_required" : "materialized";
  const snapshotHash = hashObject({
    projectId: project.projectId,
    cutoffDate: resolvedCutoffDate,
    actualCostAmount: payrollSummary.actualCostAmount,
    actualMinutes: timeSummary.actualMinutes,
    approvedValueAmount,
    billedRevenueAmount: billingSummary.billedRevenueAmount,
    recognizedRevenueAmount,
    remainingBudgetCostAmount,
    remainingBudgetRevenueAmount,
    resourceLoadPercent,
    explanationCodes
  });
  return {
    companyId: project.companyId,
    projectId: project.projectId,
    cutoffDate: resolvedCutoffDate,
    reportingPeriod,
    actualCostAmount: payrollSummary.actualCostAmount,
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
    costBreakdown: payrollSummary.costBreakdown,
    sourceCounts: {
      payRuns: payrollSummary.payRunCount,
      timeEntries: timeSummary.entryCount,
      invoices: billingSummary.invoiceCount
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
  const includedPayRuns = [];
  const costBreakdown = {
    salaryAmount: 0,
    benefitAmount: 0,
    pensionAmount: 0,
    travelAmount: 0,
    otherAmount: 0
  };

  for (const payRun of payRuns) {
    if (payRun.reportingPeriod > reportingPeriod) {
      continue;
    }
    if (payRun.payDate > cutoffDate || payRun.status === "draft") {
      continue;
    }
    let usedRun = false;
    for (const line of payRun.lines || []) {
      const amount = Number(line.amount || 0);
      if (amount <= 0) {
        continue;
      }
      const explicitMatch = matchesProjectDimension(line.dimensionJson, aliases);
      const share = explicitMatch ? 1 : resolveImplicitProjectShare(timeSummary, line.employmentId, payRun.reportingPeriod);
      if (share <= 0) {
        continue;
      }
      const allocatedAmount = roundMoney(amount * share);
      if (allocatedAmount === 0) {
        continue;
      }
      usedRun = true;
      if (isPensionLine(line)) {
        costBreakdown.pensionAmount = roundMoney(costBreakdown.pensionAmount + allocatedAmount);
      } else if (isBenefitLine(line)) {
        costBreakdown.benefitAmount = roundMoney(costBreakdown.benefitAmount + allocatedAmount);
      } else if (isTravelLine(line)) {
        costBreakdown.travelAmount = roundMoney(costBreakdown.travelAmount + allocatedAmount);
      } else if (isSalaryLine(line, project)) {
        costBreakdown.salaryAmount = roundMoney(costBreakdown.salaryAmount + allocatedAmount);
      } else {
        costBreakdown.otherAmount = roundMoney(costBreakdown.otherAmount + allocatedAmount);
      }
    }
    if (usedRun) {
      includedPayRuns.push(payRun.payRunId);
    }
  }

  const actualCostAmount = roundMoney(
    Object.values(costBreakdown).reduce((sum, value) => sum + Number(value || 0), 0)
  );
  return {
    actualCostAmount,
    costBreakdown,
    payRunCount: includedPayRuns.length
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

function calculateApprovedValueAmount({ project, reportingPeriod, budgetSummary, timeSummary, state }) {
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

function pushAudit(state, clock, entry) {
  state.auditEvents.push({
    auditEventId: crypto.randomUUID(),
    companyId: entry.companyId,
    actorId: entry.actorId,
    correlationId: entry.correlationId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    projectId: entry.projectId || null,
    createdAt: nowIso(clock),
    explanation: entry.explanation
  });
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

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createError(statusCode, error, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
}
