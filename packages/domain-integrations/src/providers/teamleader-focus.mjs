import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const TEAMLEADER_FOCUS_PROVIDER_CODE = "teamleader_focus";
export const TEAMLEADER_FOCUS_PROVIDER_BASELINE_CODE = "SE-TEAMLEADER-FOCUS-CRM-PROJECTS";

export function createTeamleaderFocusProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
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
        profileCode: "teamleader_focus_handoff_v1",
        baselineCode: TEAMLEADER_FOCUS_PROVIDER_BASELINE_CODE,
        operationCodes: ["deal_import", "quotation_import", "project_handoff", "work_order_sync"]
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
    quotations = [],
    projects = [],
    workOrders = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedDeals = Array.isArray(deals) ? deals : [];
    if (normalizedDeals.length === 0) {
      throw createError(400, "teamleader_deals_required", "Teamleader project handoff requires at least one deal.");
    }
    const quotationsByDealId = indexBy(quotations, ["dealId", "deal_id", "deal.id"]);
    const projectsByDealId = indexBy(projects, ["dealId", "deal_id", "linkedDealId", "linked_deal_id"]);
    const workOrdersByProjectId = indexManyBy(workOrders, ["projectId", "project_id", "linkedProjectId", "linked_project_id"]);
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
      baselineCode: TEAMLEADER_FOCUS_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        dealCount: normalizedDeals.length,
        quotationCount: Array.isArray(quotations) ? quotations.length : 0,
        projectCount: Array.isArray(projects) ? projects.length : 0
      }
    });

    const sourcePayload = normalizedDeals.map((deal, index) => {
      const dealId = requireText(resolveField(deal, ["id"]), "teamleader_deal_id_required");
      const quotation = quotationsByDealId.get(dealId) || null;
      const project = projectsByDealId.get(dealId) || null;
      const projectId = normalizeOptionalText(resolveField(project, ["id"]));
      const linkedWorkOrders = projectId ? workOrdersByProjectId.get(projectId) || [] : [];
      const dealTitle = normalizeOptionalText(resolveField(deal, ["title", "name"])) || `Teamleader deal ${index + 1}`;
      const projectTitle =
        normalizeOptionalText(resolveField(project, ["title", "name"]))
        || normalizeOptionalText(resolveField(quotation, ["title", "name"]))
        || dealTitle;
      const customerName =
        normalizeOptionalText(resolveField(deal, ["customer.name", "company.name", "contact.name"]))
        || normalizeOptionalText(resolveField(project, ["customer.name"]))
        || normalizeOptionalText(resolveField(quotation, ["customer.name"]));
      const customerOrganizationNumber =
        normalizeOptionalText(resolveField(deal, ["customer.organizationNumber", "customer.organization_number", "company.organization_number"]))
        || normalizeOptionalText(resolveField(project, ["customer.organization_number"]))
        || normalizeOptionalText(resolveField(quotation, ["customer.organization_number"]));
      const quotationTotal =
        resolveNumber(resolveField(quotation, ["totalPrice.amount", "total_price.amount", "total.price", "total"]))
        || resolveNumber(resolveField(project, ["budget.amount", "budget", "price.amount"]))
        || resolveNumber(resolveField(deal, ["estimatedValue.amount", "estimated_value.amount", "amount"]));
      const contractValueAmount = normalizeMoney(quotationTotal, "teamleader_contract_value_required");
      const projectBillingMethod = normalizeOptionalText(resolveField(project, ["billingMethod", "billing_method"]));
      const hasWorkOrders = linkedWorkOrders.length > 0;
      const workModelCode =
        hasWorkOrders ? "service_order" : (projectBillingMethod === "fixed_price" ? "fixed_scope" : "time_only");
      const billingModelCode =
        normalizeBillingModelCode(projectBillingMethod)
        || (hasWorkOrders ? "hybrid_change_order" : "fixed_price");
      const startsOn = toDateString(
        resolveField(project, ["startsOn", "starts_on", "startDate", "start_date"])
        || resolveField(quotation, ["acceptedAt", "accepted_at"])
        || resolveField(deal, ["wonAt", "won_at", "createdAt", "created_at"])
        || nowIso(clock)
      );
      const endsOn = toDateString(resolveField(project, ["endsOn", "ends_on", "endDate", "end_date"]));
      return {
        externalProjectId: projectId || dealId,
        sourceSystemCode: "teamleader",
        displayName: projectTitle,
        projectCode: normalizeOptionalText(resolveField(project, ["reference", "projectCode", "project_code"])),
        projectReferenceCode:
          normalizeOptionalText(resolveField(project, ["reference", "projectReferenceCode", "project_reference_code"]))
          || `teamleader-${dealId}`,
        customerLegalName: customerName,
        customerOrganizationNumber,
        engagementDisplayName: normalizeOptionalText(resolveField(project, ["description"])) || projectTitle,
        workModelCode,
        workModelTitle: hasWorkOrders ? "Teamleader service order handoff" : "Teamleader project handoff",
        operationalPackCode: hasWorkOrders ? "field_optional" : "general_core",
        requiresWorkOrders: hasWorkOrders,
        requiresMilestones: billingModelCode === "fixed_price",
        requiresAttendance: false,
        requiresId06: false,
        billingModelCode,
        revenueRecognitionModelCode: billingModelCode === "fixed_price" ? "over_time" : "billing_equals_revenue",
        startsOn,
        endsOn,
        contractValueAmount,
        externalOpportunityId: dealId,
        externalOpportunityRef: dealTitle,
        sourceQuoteId: null,
        externalQuoteRef:
          normalizeOptionalText(resolveField(quotation, ["number", "reference"]))
          || normalizeOptionalText(resolveField(quotation, ["title"]))
          || null,
        quoteAcceptedOn: toDateString(resolveField(quotation, ["acceptedAt", "accepted_at"])),
        workPackageCode:
          normalizeOptionalText(resolveField(project, ["phaseCode", "phase_code"]))
          || (hasWorkOrders ? `TL-WO-${dealId}` : `TL-PROJ-${dealId}`),
        workPackageTitle: hasWorkOrders ? "Linked Teamleader work orders" : "Teamleader imported work package",
        workPackageDescription: normalizeOptionalText(resolveField(project, ["description"])),
        deliveryMilestoneTitle: normalizeOptionalText(resolveField(project, ["deliveryMilestone", "milestone_title"])),
        deliveryMilestoneDate: toDateString(resolveField(project, ["deliveryDate", "delivery_date"])),
        billingPlanFrequencyCode: hasWorkOrders ? "one_off" : "one_off",
        billingPlanTriggerCode: hasWorkOrders ? "manual" : "manual",
        billingPlanLines: normalizeBillingPlanLines({
          quotation,
          project,
          startsOn,
          contractValueAmount
        }),
        providerCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          dealId,
          quotationId: normalizeOptionalText(resolveField(quotation, ["id"])),
          projectId,
          workOrderCount: linkedWorkOrders.length
        }
      };
    });

    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "teamleader",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: toDateString(sourceExportCapturedAt || nowIso(clock)),
      sourcePayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function indexBy(records, candidatePaths) {
  const map = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const key = normalizeOptionalText(resolveField(record, candidatePaths));
    if (key && !map.has(key)) {
      map.set(key, record);
    }
  }
  return map;
}

function indexManyBy(records, candidatePaths) {
  const map = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const key = normalizeOptionalText(resolveField(record, candidatePaths));
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
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeBillingModelCode(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (normalized === "time_and_material" || normalized === "time_and_materials") {
    return "time_and_material";
  }
  if (normalized === "fixed" || normalized === "fixed_price") {
    return "fixed_price";
  }
  return null;
}

function normalizeBillingPlanLines({ quotation, project, startsOn, contractValueAmount }) {
  const explicitLines = resolveField(project, ["billingPlanLines", "billing_plan_lines"])
    || resolveField(quotation, ["billingPlanLines", "billing_plan_lines"]);
  if (Array.isArray(explicitLines) && explicitLines.length > 0) {
    return explicitLines.map((line, index) => ({
      plannedInvoiceDate: toDateString(resolveField(line, ["plannedInvoiceDate", "planned_invoice_date", "invoiceDate", "invoice_date"])) || addDays(startsOn, index * 14),
      amount: normalizeMoney(resolveField(line, ["amount", "total"]), "teamleader_billing_line_amount_required"),
      triggerCode: normalizeOptionalText(resolveField(line, ["triggerCode", "trigger_code"])) || "manual"
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
