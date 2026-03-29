import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const ZOHO_CRM_PROJECTS_PROVIDER_CODE = "zoho_crm_projects";
export const ZOHO_CRM_PROJECTS_PROVIDER_BASELINE_CODE = "SE-ZOHO-CRM-PROJECTS-BILLING";

export function createZohoCrmProjectsProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
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
        profileCode: "zoho_crm_projects_billing_handoff_v1",
        baselineCode: ZOHO_CRM_PROJECTS_PROVIDER_BASELINE_CODE,
        operationCodes: [
          "deal_import",
          "project_import",
          "timesheet_import",
          "project_billing_sync",
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
    deals = [],
    projects = [],
    contacts = [],
    timesheets = [],
    invoices = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedProjects = Array.isArray(projects) ? projects : [];
    if (normalizedProjects.length === 0) {
      throw createError(400, "zoho_projects_required", "Zoho handoff requires at least one project.");
    }

    const dealsById = indexById(deals);
    const contactsById = indexById(contacts);
    const timesheetsByProjectId = indexManyBy(timesheets, (entry) => resolveField(entry, ["projectId", "project_id", "project.id"]));
    const invoicesByProjectId = indexManyBy(invoices, (entry) => resolveField(entry, ["projectId", "project_id", "project.id"]));
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
      baselineCode: ZOHO_CRM_PROJECTS_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        projectCount: normalizedProjects.length,
        dealCount: Array.isArray(deals) ? deals.length : 0,
        timesheetCount: Array.isArray(timesheets) ? timesheets.length : 0,
        invoiceCount: Array.isArray(invoices) ? invoices.length : 0
      }
    });

    const exportCapturedAt = toDateString(sourceExportCapturedAt || nowIso(clock));
    const sourcePayload = normalizedProjects.map((project, index) => {
      const projectId = requireText(resolveField(project, ["id"]), "zoho_project_id_required");
      const deal = dealsById.get(normalizeOptionalText(resolveField(project, ["dealId", "deal_id", "crmDealId", "crm_deal_id"]))) || null;
      const primaryContact =
        contactsById.get(normalizeOptionalText(resolveField(project, ["contactId", "contact_id", "customer.id"])))
        || contactsById.get(normalizeOptionalText(resolveField(deal, ["contactId", "contact_id", "customer.id"])))
        || null;
      const projectTimesheets = timesheetsByProjectId.get(projectId) || [];
      const projectInvoices = invoicesByProjectId.get(projectId) || [];
      const metrics = buildProjectMetrics({
        project,
        projectTimesheets,
        projectInvoices,
        exportCapturedAt
      });
      const billingModelCode = normalizeBillingModelCode(resolveField(project, [
        "billingMethod",
        "billing_method",
        "billing.method",
        "projectBillingMethod"
      ])) || "time_and_material";
      const contractValueAmount = resolveContractValueAmount({
        project,
        deal,
        metrics
      });
      return {
        externalProjectId: projectId,
        sourceSystemCode: "zoho",
        displayName:
          normalizeOptionalText(resolveField(project, ["name", "projectName", "project_name"]))
          || `Zoho project ${index + 1}`,
        projectCode: normalizeOptionalText(resolveField(project, ["code", "projectCode", "project_code"])),
        projectReferenceCode:
          normalizeOptionalText(resolveField(project, ["referenceCode", "reference_code"]))
          || `zoho-${projectId}`,
        customerLegalName:
          normalizeOptionalText(resolveField(primaryContact, ["accountName", "account_name", "name", "companyName"]))
          || normalizeOptionalText(resolveField(project, ["customer.name", "customerName"]))
          || normalizeOptionalText(resolveField(deal, ["accountName", "account_name"])),
        customerOrganizationNumber:
          normalizeOptionalText(resolveField(primaryContact, ["organizationNumber", "organization_number"]))
          || normalizeOptionalText(resolveField(project, ["customer.organization_number"])),
        engagementDisplayName:
          normalizeOptionalText(resolveField(project, ["description", "projectOverview", "project_overview"]))
          || normalizeOptionalText(resolveField(deal, ["name", "dealName", "deal_name"]))
          || "Zoho imported engagement",
        workModelCode: billingModelCode === "fixed_price" ? "fixed_scope" : "time_only",
        workModelTitle: "Zoho service project delivery",
        operationalPackCode: "general_core",
        requiresWorkOrders: false,
        requiresMilestones: metrics.hasMilestones,
        requiresAttendance: false,
        requiresId06: false,
        billingModelCode,
        revenueRecognitionModelCode: billingModelCode === "fixed_price" ? "over_time" : "billing_equals_revenue",
        startsOn: resolveStartDate(project, exportCapturedAt),
        endsOn: resolveEndDate(project),
        contractValueAmount,
        externalOpportunityId: normalizeOptionalText(resolveField(deal, ["id", "dealId", "deal_id"])),
        externalOpportunityRef: normalizeOptionalText(resolveField(deal, ["name", "dealName", "deal_name"])),
        sourceQuoteId: null,
        externalQuoteRef:
          normalizeOptionalText(resolveField(deal, ["quoteNumber", "quote_number", "estimateNumber", "estimate_number"]))
          || normalizeOptionalText(resolveField(project, ["estimateNumber", "estimate_number"])),
        quoteAcceptedOn: toDateString(resolveField(deal, ["closedDate", "closed_date", "wonAt", "won_at"])),
        workPackageCode:
          normalizeOptionalText(resolveField(project, ["serviceLineCode", "service_line_code"]))
          || `ZOHO-${projectId}`,
        workPackageTitle: normalizeOptionalText(resolveField(project, ["serviceLineName", "service_line_name"])) || "Zoho imported work package",
        workPackageDescription:
          normalizeOptionalText(resolveField(project, ["description", "projectOverview", "project_overview"]))
          || normalizeOptionalText(resolveField(deal, ["description"])),
        deliveryMilestoneTitle: metrics.nextMilestoneTitle,
        deliveryMilestoneDate: metrics.nextMilestoneDate,
        billingPlanFrequencyCode: billingModelCode === "fixed_price" ? "milestone" : "one_off",
        billingPlanTriggerCode: "manual",
        billingPlanLines: normalizeBillingPlanLines({
          project,
          projectTimesheets,
          startsOn: resolveStartDate(project, exportCapturedAt),
          contractValueAmount
        }),
        providerCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          projectId,
          projectStatus: metrics.projectStatus,
          billableHours: metrics.billableHours,
          nonBillableHours: metrics.nonBillableHours,
          billedHours: metrics.billedHours,
          unbilledHours: metrics.unbilledHours,
          invoiceCount: metrics.invoiceCount,
          billedAmount: metrics.billedAmount,
          unbilledAmount: metrics.unbilledAmount,
          profitabilityStatus: metrics.profitabilityStatus,
          clientPortalEnabled: metrics.clientPortalEnabled,
          customerContactId: normalizeOptionalText(resolveField(primaryContact, ["id"])),
          customerContactEmail: normalizeOptionalText(resolveField(primaryContact, ["email"])),
          billingMethod: billingModelCode
        }
      };
    });

    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "zoho",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: exportCapturedAt,
      sourcePayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function buildProjectMetrics({ project, projectTimesheets, projectInvoices }) {
  const billableHours = round2(projectTimesheets.reduce((sum, row) => sum + (resolveNumber(resolveField(row, ["billableHours", "billable_hours", "hours"])) || 0), 0));
  const nonBillableHours = round2(projectTimesheets.reduce((sum, row) => sum + (resolveNumber(resolveField(row, ["nonBillableHours", "non_billable_hours"])) || 0), 0));
  const billedHours = round2(projectTimesheets.reduce((sum, row) => sum + (resolveNumber(resolveField(row, ["billedHours", "billed_hours"])) || 0), 0));
  const unbilledHours = round2(Math.max(billableHours - billedHours, 0));
  const billedAmount = round2(projectInvoices.reduce((sum, row) => sum + (resolveNumber(resolveField(row, ["total", "amount"])) || 0), 0));
  const budgetAmount = resolveNumber(resolveField(project, ["budgetAmount", "budget_amount", "budget"])) || 0;
  const unbilledAmount = round2(Math.max(budgetAmount - billedAmount, 0));
  const profitabilityStatus =
    budgetAmount > 0 && billedAmount >= budgetAmount
      ? "at_or_above_budget"
      : (billedAmount > 0 ? "in_progress" : "not_started");
  return {
    projectStatus:
      normalizeOptionalText(resolveField(project, ["status", "projectStatus", "project_status"]))
      || "active",
    billableHours,
    nonBillableHours,
    billedHours,
    unbilledHours,
    invoiceCount: projectInvoices.length,
    billedAmount,
    unbilledAmount,
    profitabilityStatus,
    clientPortalEnabled: toBoolean(resolveField(project, ["clientPortalEnabled", "client_portal_enabled"])),
    hasMilestones: toBoolean(resolveField(project, ["hasMilestones", "has_milestones"])),
    nextMilestoneTitle: normalizeOptionalText(resolveField(project, ["nextMilestoneTitle", "next_milestone_title"])),
    nextMilestoneDate: toDateString(resolveField(project, ["nextMilestoneDate", "next_milestone_date"]))
  };
}

function resolveContractValueAmount({ project, deal, metrics }) {
  const directValue =
    resolveNumber(resolveField(project, ["budgetAmount", "budget_amount", "budget", "projectValue", "project_value"]))
    || resolveNumber(resolveField(deal, ["amount", "dealAmount", "deal_amount"]))
    || null;
  if (directValue && directValue > 0) {
    return normalizeMoney(directValue, "zoho_contract_value_required");
  }
  const derived = Math.max(metrics.billedAmount, metrics.unbilledAmount, metrics.billableHours * 1000);
  if (derived > 0) {
    return normalizeMoney(derived, "zoho_contract_value_required");
  }
  throw createError(400, "zoho_contract_value_required", "Zoho handoff requires project budget, deal amount or billable basis.");
}

function resolveStartDate(project, exportCapturedAt) {
  return toDateString(resolveField(project, ["startDate", "start_date", "createdTime", "created_time"])) || exportCapturedAt;
}

function resolveEndDate(project) {
  return toDateString(resolveField(project, ["endDate", "end_date", "deadline"]));
}

function normalizeBillingPlanLines({ project, projectTimesheets, startsOn, contractValueAmount }) {
  const explicitLines = resolveField(project, ["billingPlanLines", "billing_plan_lines"]);
  if (Array.isArray(explicitLines) && explicitLines.length > 0) {
    return explicitLines.map((line, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(line, ["plannedInvoiceDate", "planned_invoice_date", "invoiceDate", "invoice_date"]))
        || addDays(startsOn, index * 14),
      amount: normalizeMoney(resolveField(line, ["amount", "value"]), "zoho_billing_line_amount_required"),
      triggerCode: normalizeOptionalText(resolveField(line, ["triggerCode", "trigger_code"])) || "manual"
    }));
  }
  if (projectTimesheets.length > 0) {
    return [
      {
        plannedInvoiceDate: startsOn,
        amount: contractValueAmount,
        triggerCode: "manual"
      }
    ];
  }
  return [
    {
      plannedInvoiceDate: startsOn,
      amount: contractValueAmount,
      triggerCode: "manual"
    }
  ];
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
  if (["fixed", "fixed_price", "project_rate"].includes(normalized)) {
    return "fixed_price";
  }
  if (["staff_hours", "hourly", "time_and_material", "time_and_materials"].includes(normalized)) {
    return "time_and_material";
  }
  return null;
}

function toBoolean(value) {
  if (value === true || value === false) {
    return value;
  }
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  return ["true", "1", "yes"].includes(normalized || "");
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
