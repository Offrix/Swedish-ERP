import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const MONDAY_WORK_MANAGEMENT_PROVIDER_CODE = "monday_work_management";
export const MONDAY_WORK_MANAGEMENT_PROVIDER_BASELINE_CODE = "SE-MONDAY-WORK-MANAGEMENT-PROJECTS";

export function createMondayWorkManagementProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
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
        profileCode: "monday_work_management_handoff_v1",
        baselineCode: MONDAY_WORK_MANAGEMENT_PROVIDER_BASELINE_CODE,
        operationCodes: [
          "board_import",
          "portfolio_import",
          "project_status_push",
          "resource_capacity_import",
          "time_tracking_import"
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
    boards = [],
    items = [],
    portfolios = [],
    workloadAllocations = [],
    timeEntries = [],
    riskSignals = [],
    users = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedBoards = Array.isArray(boards) ? boards : [];
    if (normalizedBoards.length === 0) {
      throw createError(400, "monday_boards_required", "monday.com project handoff requires at least one board.");
    }

    const portfoliosById = indexById(portfolios);
    const flatItems = flattenItems(items);
    const itemsByBoardId = indexManyBy(flatItems, (item) => resolveField(item, ["boardId", "board_id", "board.id", "parentBoardId"]));
    const workloadByBoardId = indexManyBy(workloadAllocations, (entry) => resolveField(entry, ["boardId", "board_id", "board.id"]));
    const timeEntriesByBoardId = indexManyBy(timeEntries, (entry) => resolveField(entry, ["boardId", "board_id", "board.id"]));
    const risksByBoardId = indexManyBy(riskSignals, (entry) => resolveField(entry, ["boardId", "board_id", "board.id"]));
    const usersById = indexById(users);
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
      baselineCode: MONDAY_WORK_MANAGEMENT_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        boardCount: normalizedBoards.length,
        itemCount: flatItems.length,
        portfolioCount: Array.isArray(portfolios) ? portfolios.length : 0,
        workloadAllocationCount: Array.isArray(workloadAllocations) ? workloadAllocations.length : 0
      }
    });

    const exportCapturedAt = toDateString(sourceExportCapturedAt || nowIso(clock));
    const sourcePayload = normalizedBoards.map((board, index) => {
      const boardId = requireText(resolveField(board, ["id"]), "monday_board_id_required");
      const boardItems = itemsByBoardId.get(boardId) || [];
      const workloadEntries = workloadByBoardId.get(boardId) || [];
      const boardTimeEntries = timeEntriesByBoardId.get(boardId) || [];
      const boardRisks = risksByBoardId.get(boardId) || [];
      const portfolio = resolvePortfolioForBoard(board, portfoliosById);
      const contractValueAmount = resolveContractValueAmount({
        board,
        boardItems,
        workloadEntries,
        boardRisks
      });
      const billingModelCode = normalizeBillingModelCode(resolveField(board, [
        "billingModel",
        "billing_model",
        "financials.billingModel",
        "project.billingModel"
      ])) || "time_and_material";
      const hasTrackedTime =
        boardTimeEntries.length > 0
        || boardItems.some((item) => resolveNumber(resolveField(item, ["loggedHours", "logged_hours", "timeTracking.loggedHours"])) > 0);
      const hasMilestones =
        toBoolean(resolveField(board, ["requiresMilestones", "requires_milestones"]))
        || boardItems.some((item) => toBoolean(resolveField(item, ["isMilestone", "is_milestone"])));
      const startsOn = resolveProjectStartDate(board, boardItems, exportCapturedAt);
      const endsOn = resolveProjectEndDate(board, boardItems);
      const metrics = buildBoardMetrics({
        board,
        boardItems,
        workloadEntries,
        boardTimeEntries,
        boardRisks,
        usersById,
        exportCapturedAt
      });
      const workModelCode =
        billingModelCode === "fixed_price"
          ? "fixed_scope"
          : (hasTrackedTime ? "time_only" : "general_scope");
      return {
        externalProjectId: boardId,
        sourceSystemCode: "monday",
        displayName:
          normalizeOptionalText(resolveField(board, ["name", "title"]))
          || `monday board ${index + 1}`,
        projectCode: normalizeOptionalText(resolveField(board, ["projectCode", "project_code", "code"])),
        projectReferenceCode:
          normalizeOptionalText(resolveField(board, ["referenceCode", "reference_code", "shortCode", "short_code"]))
          || `monday-${boardId}`,
        customerLegalName: normalizeOptionalText(resolveField(board, [
          "customer.name",
          "customerName",
          "customer_name",
          "client.name",
          "account.name"
        ])),
        customerOrganizationNumber: normalizeOptionalText(resolveField(board, [
          "customer.organizationNumber",
          "customer.organization_number",
          "organizationNumber",
          "organization_number",
          "client.organization_number"
        ])),
        engagementDisplayName:
          normalizeOptionalText(resolveField(board, ["description", "summary"]))
          || normalizeOptionalText(resolveField(portfolio, ["name", "title"]))
          || "monday imported engagement",
        workModelCode,
        workModelTitle: hasTrackedTime ? "monday work management tracked delivery" : "monday work management project delivery",
        operationalPackCode: "general_core",
        requiresWorkOrders: false,
        requiresMilestones: hasMilestones,
        requiresAttendance: false,
        requiresId06: false,
        billingModelCode,
        revenueRecognitionModelCode: billingModelCode === "fixed_price" ? "over_time" : "billing_equals_revenue",
        startsOn,
        endsOn,
        contractValueAmount,
        externalOpportunityId: normalizeOptionalText(resolveField(board, ["crm.dealId", "crm.deal_id", "linkedDealId", "linked_deal_id"])),
        externalOpportunityRef: normalizeOptionalText(resolveField(board, ["crm.dealName", "crm.deal_name", "dealName", "deal_name"])),
        sourceQuoteId: null,
        externalQuoteRef: normalizeOptionalText(resolveField(board, ["proposalNumber", "proposal_number", "quoteReference", "quote_reference"])),
        quoteAcceptedOn: toDateString(resolveField(board, ["proposalAcceptedAt", "proposal_accepted_at", "quoteAcceptedOn", "quote_accepted_on"])),
        workPackageCode:
          normalizeOptionalText(resolveField(portfolio, ["code", "portfolioCode", "portfolio_code"]))
          || `MONDAY-${boardId}`,
        workPackageTitle:
          normalizeOptionalText(resolveField(portfolio, ["name", "title"]))
          || "monday imported work package",
        workPackageDescription:
          normalizeOptionalText(resolveField(board, ["purpose", "description"]))
          || normalizeOptionalText(resolveField(portfolio, ["description"])),
        deliveryMilestoneTitle: metrics.nextMilestoneTitle,
        deliveryMilestoneDate: metrics.nextMilestoneDate,
        billingPlanFrequencyCode: billingModelCode === "fixed_price" ? "milestone" : "one_off",
        billingPlanTriggerCode: "manual",
        billingPlanLines: normalizeBillingPlanLines({
          board,
          boardItems,
          startsOn,
          contractValueAmount
        }),
        providerCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          boardId,
          boardUrl: normalizeOptionalText(resolveField(board, ["url", "boardUrl", "board_url"])),
          boardKind: normalizeOptionalText(resolveField(board, ["type", "boardKind", "board_kind"])) || "project_board",
          portfolioId: normalizeOptionalText(resolveField(portfolio, ["id"])),
          portfolioName: normalizeOptionalText(resolveField(portfolio, ["name", "title"])),
          healthStatus: metrics.healthStatus,
          riskSeverity: metrics.riskSeverity,
          openItemCount: metrics.openItemCount,
          completedItemCount: metrics.completedItemCount,
          overdueItemCount: metrics.overdueItemCount,
          blockedItemCount: metrics.blockedItemCount,
          assignedPeopleCount: metrics.assignedPeopleCount,
          assignedPeoplePreview: metrics.assignedPeoplePreview,
          plannedHours: metrics.plannedHours,
          loggedHours: metrics.loggedHours,
          capacityHours: metrics.capacityHours,
          workloadPressureCode: metrics.workloadPressureCode,
          riskSignalCount: metrics.riskSignalCount
        }
      };
    });

    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "monday",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: exportCapturedAt,
      sourcePayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function resolvePortfolioForBoard(board, portfoliosById) {
  const portfolioId = normalizeOptionalText(resolveField(board, [
    "portfolioId",
    "portfolio_id",
    "portfolio.id",
    "workspace.portfolioId"
  ]));
  if (!portfolioId) {
    return null;
  }
  return portfoliosById.get(portfolioId) || null;
}

function resolveContractValueAmount({ board, boardItems, workloadEntries, boardRisks }) {
  const boardValue =
    resolveNumber(resolveField(board, [
      "contractValue",
      "contract_value",
      "projectValue",
      "project_value",
      "budget.amount",
      "budget",
      "financials.contractValue"
    ]))
    || null;
  if (boardValue && boardValue > 0) {
    return normalizeMoney(boardValue, "monday_contract_value_required");
  }
  const itemValue = boardItems.reduce((sum, item) => {
    const value = resolveNumber(resolveField(item, [
      "contractValue",
      "contract_value",
      "budget.amount",
      "budget",
      "financials.contractValue"
    ]));
    return sum + (value || 0);
  }, 0);
  if (itemValue > 0) {
    return normalizeMoney(itemValue, "monday_contract_value_required");
  }
  const workloadBackfill = workloadEntries.reduce((sum, entry) => {
    const hours = resolveNumber(resolveField(entry, ["plannedHours", "planned_hours", "assignedHours", "assigned_hours"])) || 0;
    return sum + hours;
  }, 0) * 1000;
  if (workloadBackfill > 0) {
    return normalizeMoney(workloadBackfill, "monday_contract_value_required");
  }
  if (Array.isArray(boardRisks) && boardRisks.length > 0) {
    return normalizeMoney(1000, "monday_contract_value_required");
  }
  throw createError(400, "monday_contract_value_required", "monday.com handoff requires contract value, budget or workload estimate.");
}

function resolveProjectStartDate(board, boardItems, exportCapturedAt) {
  return (
    toDateString(resolveField(board, [
      "startDate",
      "start_date",
      "timeline.start",
      "dates.start"
    ]))
    || minDate(boardItems.map((item) => resolveField(item, ["startDate", "start_date", "timeline.start"])))
    || exportCapturedAt
  );
}

function resolveProjectEndDate(board, boardItems) {
  return (
    toDateString(resolveField(board, [
      "endDate",
      "end_date",
      "timeline.end",
      "dates.end"
    ]))
    || maxDate(boardItems.map((item) => resolveField(item, ["endDate", "end_date", "dueDate", "due_date", "timeline.end"])))
  );
}

function buildBoardMetrics({
  board,
  boardItems,
  workloadEntries,
  boardTimeEntries,
  boardRisks,
  usersById,
  exportCapturedAt
}) {
  const exportDate = toDateString(exportCapturedAt) || nowIso(() => new Date()).slice(0, 10);
  const assigneeIds = new Set();
  let openItemCount = 0;
  let completedItemCount = 0;
  let overdueItemCount = 0;
  let blockedItemCount = 0;
  let nextMilestoneTitle = null;
  let nextMilestoneDate = null;

  for (const item of boardItems) {
    for (const assigneeId of resolveAssigneeIds(item)) {
      assigneeIds.add(assigneeId);
    }
    const status = normalizeOptionalText(resolveField(item, ["status", "statusLabel", "status.label", "state"])) || "working";
    const dueDate = toDateString(resolveField(item, ["dueDate", "due_date", "timeline.end"]));
    if (isCompletedStatus(status)) {
      completedItemCount += 1;
    } else {
      openItemCount += 1;
      if (dueDate && dueDate < exportDate) {
        overdueItemCount += 1;
      }
    }
    if (isBlockedStatus(status) || toBoolean(resolveField(item, ["blocked", "isBlocked", "atRisk"]))) {
      blockedItemCount += 1;
    }
    if (!nextMilestoneDate && dueDate && !isCompletedStatus(status)) {
      nextMilestoneDate = dueDate;
      nextMilestoneTitle =
        normalizeOptionalText(resolveField(item, ["name", "title"]))
        || "Next monday milestone";
    }
  }

  for (const entry of workloadEntries) {
    const personId = normalizeOptionalText(resolveField(entry, ["personId", "person_id", "userId", "user_id"]));
    if (personId) {
      assigneeIds.add(personId);
    }
  }

  const plannedHours = round2(workloadEntries.reduce((sum, entry) => {
    return sum + (resolveNumber(resolveField(entry, ["plannedHours", "planned_hours", "assignedHours", "assigned_hours"])) || 0);
  }, 0));
  const capacityHours = round2(workloadEntries.reduce((sum, entry) => {
    return sum + (resolveNumber(resolveField(entry, ["capacityHours", "capacity_hours", "availableHours", "available_hours"])) || 0);
  }, 0));
  const loggedHours = round2(
    boardTimeEntries.reduce((sum, entry) => sum + (resolveNumber(resolveField(entry, ["hours", "durationHours", "duration_hours"])) || 0), 0)
    || boardItems.reduce((sum, item) => sum + (resolveNumber(resolveField(item, ["loggedHours", "logged_hours", "timeTracking.loggedHours"])) || 0), 0)
  );
  const workloadPressureCode =
    plannedHours > 0 && capacityHours > 0 && plannedHours > capacityHours
      ? "over_capacity"
      : (plannedHours > 0 && capacityHours > 0 ? "balanced" : "unknown");
  const riskSeverity = normalizeRiskSeverity({
    boardSeverity: resolveField(board, ["riskSeverity", "risk_severity", "health.riskSeverity"]),
    boardRisks,
    blockedItemCount,
    overdueItemCount
  });
  const healthStatus =
    normalizeOptionalText(resolveField(board, ["healthStatus", "health_status", "projectHealth", "project_health"]))
    || (riskSeverity === "high" ? "at_risk" : (riskSeverity === "medium" ? "attention" : "healthy"));
  const assignedPeoplePreview = [...assigneeIds]
    .slice(0, 5)
    .map((assigneeId) => normalizeOptionalText(resolveField(usersById.get(assigneeId), ["name", "displayName", "display_name"])) || assigneeId);

  return {
    openItemCount,
    completedItemCount,
    overdueItemCount,
    blockedItemCount,
    assignedPeopleCount: assigneeIds.size,
    assignedPeoplePreview,
    plannedHours,
    capacityHours,
    loggedHours,
    riskSignalCount: boardRisks.length,
    workloadPressureCode,
    riskSeverity,
    healthStatus,
    nextMilestoneTitle,
    nextMilestoneDate
  };
}

function normalizeBillingPlanLines({ board, boardItems, startsOn, contractValueAmount }) {
  const explicitLines =
    resolveField(board, ["billingPlanLines", "billing_plan_lines", "financials.billingPlanLines"])
    || null;
  if (Array.isArray(explicitLines) && explicitLines.length > 0) {
    return explicitLines.map((line, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(line, ["plannedInvoiceDate", "planned_invoice_date", "invoiceDate", "invoice_date"]))
        || addDays(startsOn, index * 14),
      amount: normalizeMoney(resolveField(line, ["amount", "value"]), "monday_billing_line_amount_required"),
      triggerCode: normalizeOptionalText(resolveField(line, ["triggerCode", "trigger_code"])) || "manual"
    }));
  }
  const milestoneItems = boardItems.filter((item) => toBoolean(resolveField(item, ["isMilestone", "is_milestone"])));
  if (milestoneItems.length > 0) {
    const perMilestoneAmount = round2(contractValueAmount / milestoneItems.length);
    return milestoneItems.map((item, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(item, ["dueDate", "due_date", "timeline.end"]))
        || addDays(startsOn, index * 14),
      amount: index === milestoneItems.length - 1
        ? round2(contractValueAmount - (perMilestoneAmount * (milestoneItems.length - 1)))
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

function flattenItems(items) {
  const flat = [];
  for (const item of Array.isArray(items) ? items : []) {
    flat.push(item);
    const subitems = resolveField(item, ["subitems", "subItems", "children"]);
    if (Array.isArray(subitems) && subitems.length > 0) {
      flat.push(...flattenItems(subitems));
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

function resolveAssigneeIds(item) {
  const directAssignees = resolveField(item, ["assigneeIds", "assignee_ids", "people"]);
  if (Array.isArray(directAssignees)) {
    return directAssignees
      .map((entry) => normalizeOptionalText(resolveField(entry, ["id"])) || normalizeOptionalText(entry))
      .filter(Boolean);
  }
  const rawValue = resolveField(item, ["ownerId", "owner_id", "personId", "person_id"]);
  const resolved = normalizeOptionalText(rawValue);
  return resolved ? [resolved] : [];
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

function normalizeRiskSeverity({ boardSeverity, boardRisks, blockedItemCount, overdueItemCount }) {
  const direct = normalizeOptionalText(boardSeverity);
  if (direct) {
    return normalizeSeverityCode(direct);
  }
  const riskLevels = boardRisks.map((entry) => normalizeSeverityCode(resolveField(entry, ["severity", "level", "riskLevel", "risk_level"])));
  if (riskLevels.includes("high")) {
    return "high";
  }
  if (riskLevels.includes("medium")) {
    return "medium";
  }
  if (blockedItemCount > 0 || overdueItemCount > 0) {
    return "medium";
  }
  return "low";
}

function normalizeSeverityCode(value) {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (!normalized) {
    return "low";
  }
  if (["critical", "high", "severe"].includes(normalized)) {
    return "high";
  }
  if (["medium", "warning", "attention", "at_risk"].includes(normalized)) {
    return "medium";
  }
  return "low";
}

function isCompletedStatus(value) {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  return ["done", "complete", "completed", "closed"].includes(normalized || "");
}

function isBlockedStatus(value) {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  return ["blocked", "stuck", "at_risk", "risk"].includes(normalized || "");
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
