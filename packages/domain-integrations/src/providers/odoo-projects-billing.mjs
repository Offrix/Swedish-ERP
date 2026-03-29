import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const ODOO_PROJECTS_BILLING_PROVIDER_CODE = "odoo_projects_billing";
export const ODOO_PROJECTS_BILLING_PROVIDER_BASELINE_CODE = "SE-ODOO-PROJECTS-BILLING";

export function createOdooProjectsBillingProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
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
        profileCode: "odoo_projects_billing_handoff_v1",
        baselineCode: ODOO_PROJECTS_BILLING_PROVIDER_BASELINE_CODE,
        operationCodes: [
          "project_import",
          "task_import",
          "timesheet_import",
          "sales_order_import",
          "project_billing_sync"
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
    saleOrders = [],
    saleOrderLines = [],
    partners = [],
    tasks = [],
    timesheets = [],
    invoices = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedProjects = Array.isArray(projects) ? projects : [];
    if (normalizedProjects.length === 0) {
      throw createError(400, "odoo_projects_required", "Odoo handoff requires at least one project.");
    }

    const saleOrdersById = indexById(saleOrders);
    const partnersById = indexById(partners);
    const saleOrderLinesById = indexById(saleOrderLines);
    const tasksByProjectId = indexManyBy(tasks, (entry) => resolveField(entry, ["projectId", "project_id", "project.id"]));
    const timesheetsByProjectId = indexManyBy(timesheets, (entry) => resolveField(entry, ["projectId", "project_id", "project.id"]));
    const invoicesByProjectId = indexManyBy(invoices, (entry) => resolveField(entry, ["projectId", "project_id", "project.id"]));
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
      baselineCode: ODOO_PROJECTS_BILLING_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        projectCount: normalizedProjects.length,
        saleOrderCount: Array.isArray(saleOrders) ? saleOrders.length : 0,
        timesheetCount: Array.isArray(timesheets) ? timesheets.length : 0,
        invoiceCount: Array.isArray(invoices) ? invoices.length : 0
      }
    });

    const exportCapturedAt = toDateString(sourceExportCapturedAt || nowIso(clock));
    const sourcePayload = normalizedProjects.map((project, index) => {
      const projectId = requireText(resolveField(project, ["id"]), "odoo_project_id_required");
      const saleOrderId =
        normalizeOptionalText(resolveField(project, ["saleOrderId", "sale_order_id", "sale.order.id"]))
        || normalizeOptionalText(resolveField(project, ["saleLine.saleOrderId", "sale_line.sale_order_id"]));
      const saleOrder = saleOrdersById.get(saleOrderId) || null;
      const saleOrderLineId =
        normalizeOptionalText(resolveField(project, ["saleOrderLineId", "sale_order_line_id", "saleLineId", "sale_line_id"]))
        || normalizeOptionalText(resolveField(saleOrder, ["lineId", "line_id"]));
      const saleOrderLine = saleOrderLinesById.get(saleOrderLineId) || null;
      const partner =
        partnersById.get(normalizeOptionalText(resolveField(project, ["partnerId", "partner_id", "partner.id"])))
        || partnersById.get(normalizeOptionalText(resolveField(saleOrder, ["partnerId", "partner_id", "partner.id"])))
        || null;
      const projectTasks = tasksByProjectId.get(projectId) || [];
      const projectTimesheets = timesheetsByProjectId.get(projectId) || [];
      const projectInvoices = invoicesByProjectId.get(projectId) || [];
      const billingModelCode = normalizeBillingModelCode({
        project,
        saleOrderLine,
        saleOrder
      });
      const metrics = buildProjectMetrics({
        project,
        billingModelCode,
        projectTasks,
        projectTimesheets,
        projectInvoices
      });
      const contractValueAmount = resolveContractValueAmount({
        project,
        saleOrder,
        saleOrderLine,
        metrics
      });
      const startsOn = resolveStartDate(project, exportCapturedAt);
      return {
        externalProjectId: projectId,
        sourceSystemCode: "odoo",
        displayName:
          normalizeOptionalText(resolveField(project, ["name", "displayName", "display_name"]))
          || `Odoo project ${index + 1}`,
        projectCode:
          normalizeOptionalText(resolveField(project, ["code", "projectCode", "project_code"]))
          || normalizeOptionalText(resolveField(saleOrder, ["name", "number", "reference"])),
        projectReferenceCode:
          normalizeOptionalText(resolveField(project, ["reference", "referenceCode", "reference_code"]))
          || `odoo-${projectId}`,
        customerLegalName:
          normalizeOptionalText(resolveField(partner, ["name", "displayName", "display_name"]))
          || normalizeOptionalText(resolveField(project, ["partner.name", "customer.name"])),
        customerOrganizationNumber:
          normalizeOptionalText(resolveField(partner, ["vat", "organizationNumber", "organization_number"]))
          || normalizeOptionalText(resolveField(project, ["partner.vat", "customer.organization_number"])),
        engagementDisplayName:
          normalizeOptionalText(resolveField(project, ["description", "projectDescription", "project_description"]))
          || normalizeOptionalText(resolveField(saleOrder, ["clientOrderRef", "client_order_ref"]))
          || "Odoo imported engagement",
        workModelCode: billingModelCode === "fixed_price" ? "fixed_scope" : "time_only",
        workModelTitle: "Odoo project delivery",
        operationalPackCode: "general_core",
        requiresWorkOrders: false,
        requiresMilestones: metrics.milestoneCount > 0,
        requiresAttendance: false,
        requiresId06: false,
        billingModelCode,
        revenueRecognitionModelCode: billingModelCode === "fixed_price" ? "over_time" : "billing_equals_revenue",
        startsOn,
        endsOn: resolveEndDate(project),
        contractValueAmount,
        externalOpportunityId: saleOrderId,
        externalOpportunityRef: normalizeOptionalText(resolveField(saleOrder, ["name", "number", "reference"])),
        sourceQuoteId: normalizeOptionalText(resolveField(saleOrder, ["quotationId", "quotation_id", "origin"])),
        externalQuoteRef: normalizeOptionalText(resolveField(saleOrder, ["clientOrderRef", "client_order_ref", "origin"])),
        quoteAcceptedOn: toDateString(resolveField(saleOrder, ["confirmationDate", "confirmation_date", "date_order"])),
        workPackageCode:
          normalizeOptionalText(resolveField(saleOrderLine, ["productCode", "product_code"]))
          || `ODOO-${projectId}`,
        workPackageTitle:
          normalizeOptionalText(resolveField(saleOrderLine, ["name", "description"]))
          || "Odoo imported work package",
        workPackageDescription:
          normalizeOptionalText(resolveField(project, ["description", "projectDescription", "project_description"]))
          || normalizeOptionalText(resolveField(saleOrderLine, ["name", "description"])),
        deliveryMilestoneTitle: metrics.nextMilestoneTitle,
        deliveryMilestoneDate: metrics.nextMilestoneDate,
        billingPlanFrequencyCode: billingModelCode === "fixed_price" ? "milestone" : "one_off",
        billingPlanTriggerCode: "manual",
        billingPlanLines: normalizeBillingPlanLines({
          startsOn,
          contractValueAmount,
          saleOrderLine,
          metrics
        }),
        providerCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          projectId,
          analyticAccountId: normalizeOptionalText(resolveField(project, ["analyticAccountId", "analytic_account_id", "analyticAccount.id"])),
          saleOrderId,
          saleOrderLineId,
          invoicePolicy: metrics.invoicePolicy,
          pricingModel: billingModelCode,
          taskCount: metrics.taskCount,
          milestoneCount: metrics.milestoneCount,
          billableHours: metrics.billableHours,
          nonBillableHours: metrics.nonBillableHours,
          invoicedHours: metrics.invoicedHours,
          uninvoicedHours: metrics.uninvoicedHours,
          invoiceCount: metrics.invoiceCount,
          invoicedAmount: metrics.invoicedAmount,
          remainingAmount: metrics.remainingAmount,
          profitabilityStatus: metrics.profitabilityStatus
        }
      };
    });

    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "odoo",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: exportCapturedAt,
      sourcePayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function buildProjectMetrics({
  project,
  billingModelCode,
  projectTasks,
  projectTimesheets,
  projectInvoices
}) {
  const billableHours = round2(projectTimesheets.reduce((sum, row) => {
    return sum + (resolveNumber(resolveField(row, ["billableHours", "billable_hours", "unitAmount", "unit_amount"])) || 0);
  }, 0));
  const nonBillableHours = round2(projectTimesheets.reduce((sum, row) => {
    return sum + (resolveNumber(resolveField(row, ["nonBillableHours", "non_billable_hours"])) || 0);
  }, 0));
  const invoicedHours = round2(projectTimesheets.reduce((sum, row) => {
    return sum + (resolveNumber(resolveField(row, ["invoicedHours", "invoiced_hours"])) || 0);
  }, 0));
  const uninvoicedHours = round2(Math.max(billableHours - invoicedHours, 0));
  const invoicedAmount = round2(projectInvoices.reduce((sum, row) => {
    return sum + (resolveNumber(resolveField(row, ["amountTotal", "amount_total", "total"])) || 0);
  }, 0));
  const plannedRevenue =
    resolveNumber(resolveField(project, ["plannedRevenue", "planned_revenue", "saleAmountTotal", "sale_amount_total"]))
    || 0;
  const remainingAmount = round2(Math.max(plannedRevenue - invoicedAmount, 0));
  const profitabilityStatus =
    plannedRevenue > 0 && invoicedAmount >= plannedRevenue
      ? "at_or_above_budget"
      : (invoicedAmount > 0 || billableHours > 0 ? "in_progress" : "not_started");
  const milestoneTask = projectTasks.find((task) => toBoolean(resolveField(task, ["isMilestone", "is_milestone"])) === true);
  return {
    invoicePolicy: billingModelCode === "fixed_price" ? "milestones_or_prepaid" : "timesheets",
    taskCount: projectTasks.length,
    milestoneCount: projectTasks.filter((task) => toBoolean(resolveField(task, ["isMilestone", "is_milestone"])) === true).length,
    billableHours,
    nonBillableHours,
    invoicedHours,
    uninvoicedHours,
    invoiceCount: projectInvoices.length,
    invoicedAmount,
    remainingAmount,
    profitabilityStatus,
    nextMilestoneTitle: normalizeOptionalText(resolveField(milestoneTask, ["name", "displayName", "display_name"])),
    nextMilestoneDate: toDateString(resolveField(milestoneTask, ["deadline", "date_deadline", "plannedDate", "planned_date"]))
  };
}

function resolveContractValueAmount({ project, saleOrder, saleOrderLine, metrics }) {
  const directValue =
    resolveNumber(resolveField(saleOrderLine, ["priceTotal", "price_total", "priceSubtotal", "price_subtotal"]))
    || resolveNumber(resolveField(project, ["plannedRevenue", "planned_revenue", "saleAmountTotal", "sale_amount_total", "allocatedBudget", "allocated_budget"]))
    || resolveNumber(resolveField(saleOrder, ["amountTotal", "amount_total"]))
    || null;
  if (directValue && directValue > 0) {
    return normalizeMoney(directValue, "odoo_contract_value_required");
  }
  const derived = Math.max(metrics.invoicedAmount, metrics.remainingAmount, metrics.billableHours * 1000);
  if (derived > 0) {
    return normalizeMoney(derived, "odoo_contract_value_required");
  }
  throw createError(400, "odoo_contract_value_required", "Odoo handoff requires sales order, planned revenue or billable basis.");
}

function normalizeBillingPlanLines({ startsOn, contractValueAmount, saleOrderLine, metrics }) {
  const orderedMilestones = resolveField(saleOrderLine, ["milestones", "billingMilestones", "billing_milestones"]);
  if (Array.isArray(orderedMilestones) && orderedMilestones.length > 0) {
    return orderedMilestones.map((line, index) => ({
      plannedInvoiceDate:
        toDateString(resolveField(line, ["plannedInvoiceDate", "planned_invoice_date", "deadline"]))
        || addDays(startsOn, index * 14),
      amount: normalizeMoney(resolveField(line, ["amount", "value", "priceTotal", "price_total"]), "odoo_billing_line_amount_required"),
      triggerCode: normalizeOptionalText(resolveField(line, ["triggerCode", "trigger_code"])) || "manual"
    }));
  }
  return [
    {
      plannedInvoiceDate: startsOn,
      amount: contractValueAmount,
      triggerCode: metrics.milestoneCount > 0 ? "milestone" : "manual"
    }
  ];
}

function normalizeBillingModelCode({ project, saleOrderLine, saleOrder }) {
  const normalized = [
    normalizeOptionalText(resolveField(project, ["billingModel", "billing_model", "pricingType", "pricing_type"])),
    normalizeOptionalText(resolveField(saleOrderLine, ["invoicePolicy", "invoice_policy"])),
    normalizeOptionalText(resolveField(saleOrder, ["invoicePolicy", "invoice_policy"]))
  ].find(Boolean);
  if (!normalized) {
    return "time_and_material";
  }
  if ([
    "based_on_timesheets",
    "delivery",
    "timesheet",
    "timesheets",
    "time_and_material",
    "time_and_materials"
  ].includes(normalized)) {
    return "time_and_material";
  }
  if ([
    "ordered_quantities",
    "milestones",
    "milestone",
    "fixed",
    "fixed_price",
    "prepaid"
  ].includes(normalized)) {
    return "fixed_price";
  }
  return "time_and_material";
}

function resolveStartDate(project, exportCapturedAt) {
  return toDateString(resolveField(project, ["dateStart", "date_start", "createDate", "create_date"])) || exportCapturedAt;
}

function resolveEndDate(project) {
  return toDateString(resolveField(project, ["date", "dateEnd", "date_end"]));
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
