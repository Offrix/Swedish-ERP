import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const ASANA_PROVIDER_CODE = "asana";
export const ASANA_PROVIDER_BASELINE_CODE = "SE-ASANA-PROJECTS";

export function createAsanaProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: ASANA_PROVIDER_CODE,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    environmentMode,
    requiredCredentialKinds: ["api_credentials"],
    sandboxSupported: true,
    trialSafe: true,
    productionSupported: true,
    supportsLegalEffectInProduction: false,
    profiles: [
      {
        profileCode: "asana_project_handoff_v1",
        baselineCode: ASANA_PROVIDER_BASELINE_CODE,
        operationCodes: [
          "project_import",
          "portfolio_import",
          "project_status_push",
          "time_tracking_import",
          "workload_import"
        ]
      }
    ]
  });

  return {
    ...provider,
    prepareProjectImportBatch
  };

  function prepareProjectImportBatch({
    companyId,
    integrationConnectionId = null,
    projects = [],
    portfolios = [],
    tasks = [],
    timeEntries = [],
    workloadSnapshots = [],
    statusUpdates = [],
    users = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedProjects = Array.isArray(projects) ? projects : [];
    if (normalizedProjects.length === 0) {
      throw createError(400, "asana_projects_required", "Asana handoff requires at least one project.");
    }

    const portfoliosById = indexById(portfolios);
    const flatTasks = flattenTasks(tasks);
    const tasksByProjectId = indexManyBy(flatTasks, (task) => resolveField(task, ["projectId", "project_id", "project.gid", "memberships.0.project.gid"]));
    const timeEntriesByProjectId = indexManyBy(timeEntries, (entry) => resolveField(entry, ["projectId", "project_id", "project.gid"]));
    const workloadByProjectId = indexManyBy(workloadSnapshots, (entry) => resolveField(entry, ["projectId", "project_id", "project.gid"]));
    const statusesByProjectId = indexManyBy(statusUpdates, (entry) => resolveField(entry, ["projectId", "project_id", "project.gid"]));
    const usersById = indexById(users);
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: ASANA_PROVIDER_CODE,
      baselineCode: ASANA_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        projectCount: normalizedProjects.length,
        taskCount: flatTasks.length,
        portfolioCount: Array.isArray(portfolios) ? portfolios.length : 0,
        workloadSnapshotCount: Array.isArray(workloadSnapshots) ? workloadSnapshots.length : 0
      }
    });

    const exportCapturedAt = toDateString(sourceExportCapturedAt || nowIso(clock));
    const sourcePayload = normalizedProjects.map((project, index) => {
      const projectId = requireText(resolveField(project, ["gid", "id"]), "asana_project_id_required");
      const projectTasks = tasksByProjectId.get(projectId) || [];
      const projectTimeEntries = timeEntriesByProjectId.get(projectId) || [];
      const projectWorkload = workloadByProjectId.get(projectId) || [];
      const projectStatuses = statusesByProjectId.get(projectId) || [];
      const portfolio = resolvePortfolioForProject(project, portfoliosById);
      const metrics = buildProjectMetrics({
        project,
        projectTasks,
        projectTimeEntries,
        projectWorkload,
        projectStatuses,
        usersById,
        exportCapturedAt
      });
      const billingModelCode = normalizeBillingModelCode(resolveField(project, [
        "billingModel",
        "billing_model",
        "custom_fields.billing_model",
        "commercial.billingModel"
      ])) || "time_and_material";
      const contractValueAmount = resolveContractValueAmount({
        project,
        projectTasks,
        projectWorkload,
        metrics
      });
      return {
        externalProjectId: projectId,
        sourceSystemCode: "asana",
        displayName:
          normalizeOptionalText(resolveField(project, ["name", "title"]))
          || `Asana project ${index + 1}`,
        projectCode: normalizeOptionalText(resolveField(project, ["code", "custom_fields.project_code"])),
        projectReferenceCode:
          normalizeOptionalText(resolveField(project, ["referenceCode", "reference_code", "custom_fields.reference_code"]))
          || `asana-${projectId}`,
        customerLegalName: normalizeOptionalText(resolveField(project, [
          "customer.name",
          "client.name",
          "account.name",
          "custom_fields.customer_name"
        ])),
        customerOrganizationNumber: normalizeOptionalText(resolveField(project, [
          "customer.organization_number",
          "client.organization_number",
          "custom_fields.customer_org_number"
        ])),
        engagementDisplayName:
          normalizeOptionalText(resolveField(project, ["notes", "brief", "description"]))
          || normalizeOptionalText(resolveField(portfolio, ["name"]))
          || "Asana imported engagement",
        workModelCode: billingModelCode === "fixed_price" ? "fixed_scope" : "time_only",
        workModelTitle: "Asana project delivery",
        operationalPackCode: "general_core",
        requiresWorkOrders: false,
        requiresMilestones: metrics.milestoneCount > 0,
        requiresAttendance: false,
        requiresId06: false,
        billingModelCode,
        revenueRecognitionModelCode: billingModelCode === "fixed_price" ? "over_time" : "billing_equals_revenue",
        startsOn: resolveProjectStartDate(project, projectTasks, exportCapturedAt),
        endsOn: resolveProjectEndDate(project, projectTasks),
        contractValueAmount,
        externalOpportunityId: normalizeOptionalText(resolveField(project, ["custom_fields.deal_id", "custom_fields.opportunity_id"])),
        externalOpportunityRef: normalizeOptionalText(resolveField(project, ["custom_fields.deal_name", "custom_fields.opportunity_name"])),
        sourceQuoteId: null,
        externalQuoteRef: normalizeOptionalText(resolveField(project, ["custom_fields.quote_reference", "custom_fields.proposal_number"])),
        quoteAcceptedOn: toDateString(resolveField(project, ["custom_fields.quote_accepted_on", "custom_fields.proposal_accepted_on"])),
        workPackageCode:
          normalizeOptionalText(resolveField(portfolio, ["custom_fields.code", "code"]))
          || `ASANA-${projectId}`,
        workPackageTitle: normalizeOptionalText(resolveField(portfolio, ["name"])) || "Asana imported work package",
        workPackageDescription:
          normalizeOptionalText(resolveField(project, ["notes", "brief", "description"]))
          || normalizeOptionalText(resolveField(portfolio, ["notes", "description"])),
        deliveryMilestoneTitle: metrics.nextMilestoneTitle,
        deliveryMilestoneDate: metrics.nextMilestoneDate,
        billingPlanFrequencyCode: billingModelCode === "fixed_price" ? "milestone" : "one_off",
        billingPlanTriggerCode: "manual",
        billingPlanLines: normalizeBillingPlanLines({
          project,
          projectTasks,
          startsOn: resolveProjectStartDate(project, projectTasks, exportCapturedAt),
          contractValueAmount
        }),
        providerCode: ASANA_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          projectId,
          projectUrl: normalizeOptionalText(resolveField(project, ["permalink_url", "url"])),
          portfolioId: normalizeOptionalText(resolveField(portfolio, ["gid", "id"])),
          portfolioName: normalizeOptionalText(resolveField(portfolio, ["name"])),
          currentStatus: metrics.currentStatus,
          riskSeverity: metrics.riskSeverity,
          openTaskCount: metrics.openTaskCount,
          completedTaskCount: metrics.completedTaskCount,
          overdueTaskCount: metrics.overdueTaskCount,
          blockedTaskCount: metrics.blockedTaskCount,
          milestoneCount: metrics.milestoneCount,
          assignedPeopleCount: metrics.assignedPeopleCount,
          assignedPeoplePreview: metrics.assignedPeoplePreview,
          estimatedHours: metrics.estimatedHours,
          loggedHours: metrics.loggedHours,
          plannedHours: metrics.plannedHours,
          capacityHours: metrics.capacityHours,
          workloadPressureCode: metrics.workloadPressureCode,
          statusUpdateCount: projectStatuses.length,
          timeTrackingEnabled: metrics.timeTrackingEnabled
        }
      };
    });

    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "asana",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: exportCapturedAt,
      sourcePayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: ASANA_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function resolvePortfolioForProject(project, portfoliosById) {
  const portfolioId = normalizeOptionalText(resolveField(project, [
    "portfolioId",
    "portfolio_id",
    "portfolio.gid",
    "memberships.0.portfolio.gid"
  ]));
  if (!portfolioId) {
    return null;
  }
  return portfoliosById.get(portfolioId) || null;
}

function buildProjectMetrics({
  project,
  projectTasks,
  projectTimeEntries,
  projectWorkload,
  projectStatuses,
  usersById,
  exportCapturedAt
}) {
  const exportDate = toDateString(exportCapturedAt) || nowIso(() => new Date()).slice(0, 10);
  const assigneeIds = new Set();
  let openTaskCount = 0;
  let completedTaskCount = 0;
  let overdueTaskCount = 0;
  let blockedTaskCount = 0;
  let milestoneCount = 0;
  let nextMilestoneTitle = null;
  let nextMilestoneDate = null;

  for (const task of projectTasks) {
    for (const assigneeId of resolveAssigneeIds(task)) {
      assigneeIds.add(assigneeId);
    }
    const dueDate = toDateString(resolveField(task, ["due_on", "dueDate", "due_date"]));
    const completed = toBoolean(resolveField(task, ["completed", "isCompleted"])) || !!resolveField(task, ["completed_at", "completedAt"]);
    if (completed) {
      completedTaskCount += 1;
    } else {
      openTaskCount += 1;
      if (dueDate && dueDate < exportDate) {
        overdueTaskCount += 1;
      }
    }
    if (toBoolean(resolveField(task, ["blocked", "custom_fields.blocked"])) || normalizeOptionalText(resolveField(task, ["custom_fields.status"])) === "blocked") {
      blockedTaskCount += 1;
    }
    if (toBoolean(resolveField(task, ["resource_subtype_is_milestone", "isMilestone", "is_milestone"])) || normalizeOptionalText(resolveField(task, ["resource_subtype"])) === "milestone") {
      milestoneCount += 1;
      if (!completed && !nextMilestoneDate && dueDate) {
        nextMilestoneDate = dueDate;
        nextMilestoneTitle = normalizeOptionalText(resolveField(task, ["name"])) || "Asana milestone";
      }
    }
  }

  for (const entry of projectWorkload) {
    const personId = normalizeOptionalText(resolveField(entry, ["personId", "person_id", "user.gid", "userId"]));
    if (personId) {
      assigneeIds.add(personId);
    }
  }

  const estimatedHours = round2(projectTasks.reduce((sum, task) => {
    const minutes = resolveNumber(resolveField(task, ["estimated_minutes", "estimatedMinutes"]));
    if (minutes !== null) {
      return sum + (minutes / 60);
    }
    return sum + (resolveNumber(resolveField(task, ["estimated_hours", "estimatedHours"])) || 0);
  }, 0));
  const loggedHours = round2(projectTimeEntries.reduce((sum, entry) => {
    const minutes = resolveNumber(resolveField(entry, ["duration_minutes", "durationMinutes"]));
    if (minutes !== null) {
      return sum + (minutes / 60);
    }
    return sum + (resolveNumber(resolveField(entry, ["hours", "duration_hours"])) || 0);
  }, 0));
  const plannedHours = round2(projectWorkload.reduce((sum, entry) => {
    return sum + (resolveNumber(resolveField(entry, ["plannedHours", "planned_hours", "assignedHours", "assigned_hours"])) || 0);
  }, 0));
  const capacityHours = round2(projectWorkload.reduce((sum, entry) => {
    return sum + (resolveNumber(resolveField(entry, ["capacityHours", "capacity_hours", "availableHours", "available_hours"])) || 0);
  }, 0));
  const workloadPressureCode =
    plannedHours > 0 && capacityHours > 0 && plannedHours > capacityHours
      ? "over_capacity"
      : (plannedHours > 0 && capacityHours > 0 ? "balanced" : "unknown");
  const currentStatus =
    normalizeOptionalText(resolveField(project, ["current_status", "currentStatus", "custom_fields.project_status"]))
    || normalizeOptionalText(resolveField(projectStatuses[0], ["text", "status", "title"]))
    || "on_track";
  const riskSeverity = normalizeRiskSeverity({
    projectSeverity:
      resolveField(project, ["custom_fields.risk_severity", "risk_severity", "current_status.color"])
      || resolveField(projectStatuses[0], ["color", "severity"]),
    blockedTaskCount,
    overdueTaskCount
  });
  const assignedPeoplePreview = [...assigneeIds]
    .slice(0, 5)
    .map((assigneeId) => normalizeOptionalText(resolveField(usersById.get(assigneeId), ["name"])) || assigneeId);

  return {
    openTaskCount,
    completedTaskCount,
    overdueTaskCount,
    blockedTaskCount,
    milestoneCount,
    nextMilestoneTitle,
    nextMilestoneDate,
    assignedPeopleCount: assigneeIds.size,
    assignedPeoplePreview,
    estimatedHours,
    loggedHours,
    plannedHours,
    capacityHours,
    workloadPressureCode,
    currentStatus,
    riskSeverity,
    timeTrackingEnabled: estimatedHours > 0 || loggedHours > 0 || projectTimeEntries.length > 0
  };
}

function resolveContractValueAmount({ project, projectTasks, projectWorkload, metrics }) {
  const directValue =
    resolveNumber(resolveField(project, [
      "contractValue",
      "contract_value",
      "budget.amount",
      "budget",
      "custom_fields.contract_value"
    ]))
    || null;
  if (directValue && directValue > 0) {
    return normalizeMoney(directValue, "asana_contract_value_required");
  }
  const taskValue = projectTasks.reduce((sum, task) => {
    return sum + (resolveNumber(resolveField(task, ["budget.amount", "budget", "custom_fields.contract_value"])) || 0);
  }, 0);
  if (taskValue > 0) {
    return normalizeMoney(taskValue, "asana_contract_value_required");
  }
  const derivedValue = Math.max(metrics.estimatedHours, metrics.plannedHours, metrics.loggedHours) * 1000;
  if (derivedValue > 0) {
    return normalizeMoney(derivedValue, "asana_contract_value_required");
  }
  if (projectWorkload.length > 0) {
    return normalizeMoney(1000, "asana_contract_value_required");
  }
  throw createError(400, "asana_contract_value_required", "Asana handoff requires contract value, budget or estimated effort.");
}

function resolveProjectStartDate(project, projectTasks, exportCapturedAt) {
  return (
    toDateString(resolveField(project, ["start_on", "startDate", "start_date"]))
    || minDate(projectTasks.map((task) => resolveField(task, ["start_on", "startDate", "start_date"])))
    || exportCapturedAt
  );
}

function resolveProjectEndDate(project, projectTasks) {
  return (
    toDateString(resolveField(project, ["due_on", "dueDate", "due_date"]))
    || maxDate(projectTasks.map((task) => resolveField(task, ["due_on", "dueDate", "due_date"])))
  );
}

function normalizeBillingPlanLines({ project, projectTasks, startsOn, contractValueAmount }) {
  const explicitLines = resolveField(project, ["billingPlanLines", "billing_plan_lines", "custom_fields.billing_plan_lines"]);
  if (Array.isArray(explicitLines) && explicitLines.length > 0) {
    return explicitLines.map((line, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(line, ["plannedInvoiceDate", "planned_invoice_date", "invoiceDate", "invoice_date"]))
        || addDays(startsOn, index * 14),
      amount: normalizeMoney(resolveField(line, ["amount", "value"]), "asana_billing_line_amount_required"),
      triggerCode: normalizeOptionalText(resolveField(line, ["triggerCode", "trigger_code"])) || "manual"
    }));
  }
  const milestoneTasks = projectTasks.filter((task) =>
    toBoolean(resolveField(task, ["resource_subtype_is_milestone", "isMilestone", "is_milestone"]))
    || normalizeOptionalText(resolveField(task, ["resource_subtype"])) === "milestone"
  );
  if (milestoneTasks.length > 0) {
    const perMilestoneAmount = round2(contractValueAmount / milestoneTasks.length);
    return milestoneTasks.map((task, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(task, ["due_on", "dueDate", "due_date"]))
        || addDays(startsOn, index * 14),
      amount: index === milestoneTasks.length - 1
        ? round2(contractValueAmount - (perMilestoneAmount * (milestoneTasks.length - 1)))
        : perMilestoneAmount,
      triggerCode: "manual"
    }));
  }
  return [
    {
      plannedInvoiceDate: startsOn,
      amount: contractValueAmount,
      triggerCode: "manual"
    }
  ];
}

function flattenTasks(tasks) {
  const flat = [];
  for (const task of Array.isArray(tasks) ? tasks : []) {
    flat.push(task);
    const subtasks = resolveField(task, ["subtasks", "subTasks", "children"]);
    if (Array.isArray(subtasks) && subtasks.length > 0) {
      flat.push(...flattenTasks(subtasks));
    }
  }
  return flat;
}

function indexById(records) {
  const map = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const id = normalizeOptionalText(resolveField(record, ["gid", "id"]));
    if (id && !map.has(id)) {
      map.set(id, record);
    }
  }
  return map;
}

function indexManyBy(records, keyResolver) {
  const map = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const key = normalizeOptionalText(keyResolver(record));
    if (!key) {
      continue;
    }
    const existing = map.get(key) || [];
    existing.push(record);
    map.set(key, existing);
  }
  return map;
}

function resolveAssigneeIds(task) {
  const assignee = resolveField(task, ["assignee.gid", "assignee.id", "assigneeId", "assignee_id"]);
  const assigneeId = normalizeOptionalText(assignee);
  return assigneeId ? [assigneeId] : [];
}

function resolveField(record, candidatePaths) {
  for (const candidatePath of Array.isArray(candidatePaths) ? candidatePaths : []) {
    const value = resolvePath(record, candidatePath);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function resolvePath(record, path) {
  if (!record || typeof record !== "object") {
    return null;
  }
  const segments = String(path).split(".");
  let current = record;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return null;
      }
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }
  return current;
}

function resolveNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeBillingModelCode(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (["fixed", "fixed_price", "milestone"].includes(normalized)) {
    return "fixed_price";
  }
  if (["time_and_material", "time_and_materials", "retainer"].includes(normalized)) {
    return "time_and_material";
  }
  if (["hybrid", "change_order"].includes(normalized)) {
    return "hybrid_change_order";
  }
  return null;
}

function normalizeRiskSeverity({ projectSeverity, blockedTaskCount, overdueTaskCount }) {
  const normalized = normalizeOptionalText(projectSeverity)?.toLowerCase();
  if (["red", "high", "critical", "at_risk"].includes(normalized || "")) {
    return "high";
  }
  if (["yellow", "medium", "attention", "on_hold"].includes(normalized || "")) {
    return "medium";
  }
  if (blockedTaskCount > 0 || overdueTaskCount > 0) {
    return "medium";
  }
  return "low";
}

function toBoolean(value) {
  if (value === true || value === false) {
    return value;
  }
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  return ["true", "1", "yes"].includes(normalized || "");
}

function minDate(values) {
  const normalized = values.map((value) => toDateString(value)).filter(Boolean).sort();
  return normalized[0] || null;
}

function maxDate(values) {
  const normalized = values.map((value) => toDateString(value)).filter(Boolean).sort();
  return normalized.length > 0 ? normalized[normalized.length - 1] : null;
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function addDays(dateString, days) {
  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + Number(days || 0));
  return parsed.toISOString().slice(0, 10);
}

function toDateString(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
