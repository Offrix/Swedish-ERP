import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const CLICKUP_PROVIDER_CODE = "clickup";
export const CLICKUP_PROVIDER_BASELINE_CODE = "SE-CLICKUP-PROJECTS";

export function createClickUpProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: CLICKUP_PROVIDER_CODE,
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
        profileCode: "clickup_project_handoff_v1",
        baselineCode: CLICKUP_PROVIDER_BASELINE_CODE,
        operationCodes: [
          "list_import",
          "task_import",
          "timesheet_import",
          "workload_import",
          "project_status_push"
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
    spaces = [],
    folders = [],
    lists = [],
    tasks = [],
    timeEntries = [],
    timesheets = [],
    workloadSnapshots = [],
    users = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedLists = Array.isArray(lists) ? lists : [];
    if (normalizedLists.length === 0) {
      throw createError(400, "clickup_lists_required", "ClickUp handoff requires at least one list.");
    }

    const spacesById = indexById(spaces);
    const foldersById = indexById(folders);
    const flatTasks = flattenTasks(tasks);
    const tasksByListId = indexManyBy(flatTasks, (task) => resolveField(task, ["listId", "list_id", "list.id"]));
    const timeEntriesByListId = indexManyBy(timeEntries, (entry) => resolveField(entry, ["listId", "list_id", "list.id"]));
    const timesheetsByListId = indexManyBy(timesheets, (entry) => resolveField(entry, ["listId", "list_id", "list.id"]));
    const workloadByListId = indexManyBy(workloadSnapshots, (entry) => resolveField(entry, ["listId", "list_id", "list.id"]));
    const usersById = indexById(users);
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: CLICKUP_PROVIDER_CODE,
      baselineCode: CLICKUP_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        listCount: normalizedLists.length,
        taskCount: flatTasks.length,
        folderCount: Array.isArray(folders) ? folders.length : 0,
        timesheetCount: Array.isArray(timesheets) ? timesheets.length : 0
      }
    });

    const exportCapturedAt = toDateString(sourceExportCapturedAt || nowIso(clock));
    const sourcePayload = normalizedLists.map((list, index) => {
      const listId = requireText(resolveField(list, ["id"]), "clickup_list_id_required");
      const folder = foldersById.get(normalizeOptionalText(resolveField(list, ["folderId", "folder_id", "folder.id"]))) || null;
      const space =
        spacesById.get(normalizeOptionalText(resolveField(list, ["spaceId", "space_id", "space.id"])))
        || spacesById.get(normalizeOptionalText(resolveField(folder, ["spaceId", "space_id", "space.id"])))
        || null;
      const listTasks = tasksByListId.get(listId) || [];
      const listTimeEntries = timeEntriesByListId.get(listId) || [];
      const listTimesheets = timesheetsByListId.get(listId) || [];
      const listWorkload = workloadByListId.get(listId) || [];
      const metrics = buildListMetrics({
        list,
        listTasks,
        listTimeEntries,
        listTimesheets,
        listWorkload,
        usersById,
        exportCapturedAt
      });
      const billingModelCode = normalizeBillingModelCode(resolveField(list, [
        "billingModel",
        "billing_model",
        "customFields.billing_model"
      ])) || "time_and_material";
      const contractValueAmount = resolveContractValueAmount({
        list,
        listTasks,
        listWorkload,
        metrics
      });
      return {
        externalProjectId: listId,
        sourceSystemCode: "clickup",
        displayName:
          normalizeOptionalText(resolveField(list, ["name"]))
          || `ClickUp list ${index + 1}`,
        projectCode: normalizeOptionalText(resolveField(list, ["code", "customFields.project_code"])),
        projectReferenceCode:
          normalizeOptionalText(resolveField(list, ["referenceCode", "reference_code", "customFields.reference_code"]))
          || `clickup-${listId}`,
        customerLegalName: normalizeOptionalText(resolveField(list, [
          "customer.name",
          "client.name",
          "customFields.customer_name"
        ])),
        customerOrganizationNumber: normalizeOptionalText(resolveField(list, [
          "customer.organization_number",
          "client.organization_number",
          "customFields.customer_org_number"
        ])),
        engagementDisplayName:
          normalizeOptionalText(resolveField(list, ["content", "description"]))
          || normalizeOptionalText(resolveField(folder, ["name"]))
          || "ClickUp imported engagement",
        workModelCode: billingModelCode === "fixed_price" ? "fixed_scope" : "time_only",
        workModelTitle: "ClickUp project delivery",
        operationalPackCode: "general_core",
        requiresWorkOrders: false,
        requiresMilestones: metrics.milestoneCount > 0,
        requiresAttendance: false,
        requiresId06: false,
        billingModelCode,
        revenueRecognitionModelCode: billingModelCode === "fixed_price" ? "over_time" : "billing_equals_revenue",
        startsOn: resolveStartDate(list, listTasks, exportCapturedAt),
        endsOn: resolveEndDate(list, listTasks),
        contractValueAmount,
        externalOpportunityId: normalizeOptionalText(resolveField(list, ["customFields.deal_id", "customFields.opportunity_id"])),
        externalOpportunityRef: normalizeOptionalText(resolveField(list, ["customFields.deal_name", "customFields.opportunity_name"])),
        sourceQuoteId: null,
        externalQuoteRef: normalizeOptionalText(resolveField(list, ["customFields.quote_reference", "customFields.proposal_number"])),
        quoteAcceptedOn: toDateString(resolveField(list, ["customFields.quote_accepted_on", "customFields.proposal_accepted_on"])),
        workPackageCode:
          normalizeOptionalText(resolveField(folder, ["code", "customFields.code"]))
          || `CLICKUP-${listId}`,
        workPackageTitle: normalizeOptionalText(resolveField(folder, ["name"])) || "ClickUp imported work package",
        workPackageDescription:
          normalizeOptionalText(resolveField(list, ["content", "description"]))
          || normalizeOptionalText(resolveField(space, ["name"])),
        deliveryMilestoneTitle: metrics.nextMilestoneTitle,
        deliveryMilestoneDate: metrics.nextMilestoneDate,
        billingPlanFrequencyCode: billingModelCode === "fixed_price" ? "milestone" : "one_off",
        billingPlanTriggerCode: "manual",
        billingPlanLines: normalizeBillingPlanLines({
          list,
          listTasks,
          startsOn: resolveStartDate(list, listTasks, exportCapturedAt),
          contractValueAmount
        }),
        providerCode: CLICKUP_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          listId,
          listUrl: normalizeOptionalText(resolveField(list, ["url"])),
          folderId: normalizeOptionalText(resolveField(folder, ["id"])),
          folderName: normalizeOptionalText(resolveField(folder, ["name"])),
          spaceId: normalizeOptionalText(resolveField(space, ["id"])),
          spaceName: normalizeOptionalText(resolveField(space, ["name"])),
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
          timesheetApprovalStatus: metrics.timesheetApprovalStatus,
          timesheetCount: listTimesheets.length
        }
      };
    });

    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "clickup",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: exportCapturedAt,
      sourcePayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: CLICKUP_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function buildListMetrics({
  list,
  listTasks,
  listTimeEntries,
  listTimesheets,
  listWorkload,
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

  for (const task of listTasks) {
    for (const assigneeId of resolveAssigneeIds(task)) {
      assigneeIds.add(assigneeId);
    }
    const status = normalizeOptionalText(resolveField(task, ["status.status", "status", "customFields.status"])) || "open";
    const dueDate = toDateString(resolveField(task, ["due_date", "dueDate", "date_closed"]));
    if (isClosedStatus(status) || !!resolveField(task, ["date_closed"])) {
      completedTaskCount += 1;
    } else {
      openTaskCount += 1;
      if (dueDate && dueDate < exportDate) {
        overdueTaskCount += 1;
      }
    }
    if (normalizeOptionalText(status)?.toLowerCase() === "blocked") {
      blockedTaskCount += 1;
    }
    if (toBoolean(resolveField(task, ["milestone", "isMilestone"])) || normalizeOptionalText(resolveField(task, ["custom_id"]))?.startsWith("MS-")) {
      milestoneCount += 1;
      if (!nextMilestoneDate && dueDate) {
        nextMilestoneDate = dueDate;
        nextMilestoneTitle = normalizeOptionalText(resolveField(task, ["name"])) || "ClickUp milestone";
      }
    }
  }

  for (const entry of listWorkload) {
    const assigneeId = normalizeOptionalText(resolveField(entry, ["userId", "user_id", "user.id"]));
    if (assigneeId) {
      assigneeIds.add(assigneeId);
    }
  }

  const estimatedHours = round2(listTasks.reduce((sum, task) => {
    return sum + (resolveNumber(resolveField(task, ["time_estimate_hours", "timeEstimateHours"])) || 0);
  }, 0));
  const loggedHours = round2(listTimeEntries.reduce((sum, entry) => {
    return sum + (resolveNumber(resolveField(entry, ["hours", "duration_hours"])) || 0);
  }, 0));
  const plannedHours = round2(listWorkload.reduce((sum, entry) => {
    return sum + (resolveNumber(resolveField(entry, ["plannedHours", "planned_hours", "allocatedHours", "allocated_hours"])) || 0);
  }, 0));
  const capacityHours = round2(listWorkload.reduce((sum, entry) => {
    return sum + (resolveNumber(resolveField(entry, ["capacityHours", "capacity_hours", "availableHours", "available_hours"])) || 0);
  }, 0));
  const workloadPressureCode =
    plannedHours > 0 && capacityHours > 0 && plannedHours > capacityHours
      ? "over_capacity"
      : (plannedHours > 0 && capacityHours > 0 ? "balanced" : "unknown");
  const currentStatus =
    normalizeOptionalText(resolveField(list, ["status.status", "status", "customFields.project_status"]))
    || normalizeOptionalText(resolveField(listTimesheets[0], ["approvalStatus", "approval_status"]))
    || "on_track";
  const riskSeverity = blockedTaskCount > 0 || overdueTaskCount > 0 ? "medium" : "low";
  const timesheetApprovalStatus =
    normalizeOptionalText(resolveField(listTimesheets[0], ["approvalStatus", "approval_status"]))
    || "not_started";
  const assignedPeoplePreview = [...assigneeIds]
    .slice(0, 5)
    .map((assigneeId) => normalizeOptionalText(resolveField(usersById.get(assigneeId), ["username", "name"])) || assigneeId);

  return {
    currentStatus,
    riskSeverity,
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
    timesheetApprovalStatus
  };
}

function resolveContractValueAmount({ list, listTasks, listWorkload, metrics }) {
  const directValue =
    resolveNumber(resolveField(list, [
      "contractValue",
      "contract_value",
      "customFields.contract_value",
      "contentValue"
    ]))
    || null;
  if (directValue && directValue > 0) {
    return normalizeMoney(directValue, "clickup_contract_value_required");
  }
  const taskValue = listTasks.reduce((sum, task) => {
    return sum + (resolveNumber(resolveField(task, ["customFields.contract_value", "contractValue", "contract_value"])) || 0);
  }, 0);
  if (taskValue > 0) {
    return normalizeMoney(taskValue, "clickup_contract_value_required");
  }
  const derivedValue = Math.max(metrics.estimatedHours, metrics.plannedHours, metrics.loggedHours) * 1000;
  if (derivedValue > 0) {
    return normalizeMoney(derivedValue, "clickup_contract_value_required");
  }
  if (listWorkload.length > 0) {
    return normalizeMoney(1000, "clickup_contract_value_required");
  }
  throw createError(400, "clickup_contract_value_required", "ClickUp handoff requires contract value, budget or planned effort.");
}

function resolveStartDate(list, listTasks, exportCapturedAt) {
  return (
    toDateString(resolveField(list, ["start_date", "startDate"]))
    || minDate(listTasks.map((task) => resolveField(task, ["start_date", "startDate"])))
    || exportCapturedAt
  );
}

function resolveEndDate(list, listTasks) {
  return (
    toDateString(resolveField(list, ["due_date", "dueDate"]))
    || maxDate(listTasks.map((task) => resolveField(task, ["due_date", "dueDate"])))
  );
}

function normalizeBillingPlanLines({ list, listTasks, startsOn, contractValueAmount }) {
  const explicitLines = resolveField(list, ["billingPlanLines", "billing_plan_lines", "customFields.billing_plan_lines"]);
  if (Array.isArray(explicitLines) && explicitLines.length > 0) {
    return explicitLines.map((line, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(line, ["plannedInvoiceDate", "planned_invoice_date", "invoiceDate", "invoice_date"]))
        || addDays(startsOn, index * 14),
      amount: normalizeMoney(resolveField(line, ["amount", "value"]), "clickup_billing_line_amount_required"),
      triggerCode: normalizeOptionalText(resolveField(line, ["triggerCode", "trigger_code"])) || "manual"
    }));
  }
  const milestoneTasks = listTasks.filter((task) =>
    toBoolean(resolveField(task, ["milestone", "isMilestone"]))
    || normalizeOptionalText(resolveField(task, ["custom_id"]))?.startsWith("MS-")
  );
  if (milestoneTasks.length > 0) {
    const perMilestoneAmount = round2(contractValueAmount / milestoneTasks.length);
    return milestoneTasks.map((task, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(task, ["due_date", "dueDate"]))
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
    const id = normalizeOptionalText(resolveField(record, ["id"]));
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
  const assignees = resolveField(task, ["assignees", "watchers"]);
  if (Array.isArray(assignees)) {
    return assignees.map((entry) => normalizeOptionalText(resolveField(entry, ["id"])) || normalizeOptionalText(entry)).filter(Boolean);
  }
  const single = normalizeOptionalText(resolveField(task, ["assignee.id", "assigneeId", "assignee_id"]));
  return single ? [single] : [];
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

function isClosedStatus(value) {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  return ["done", "closed", "complete", "completed"].includes(normalized || "");
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
