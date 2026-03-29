import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE = "dynamics365_project_operations";
export const DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_BASELINE_CODE = "SE-D365-PROJECT-OPERATIONS";

export function createDynamics365ProjectOperationsProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
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
        profileCode: "dynamics365_project_operations_handoff_v1",
        baselineCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_BASELINE_CODE,
        operationCodes: [
          "project_contract_import",
          "project_import",
          "actual_import",
          "billing_backlog_import",
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
    contracts = [],
    contractLines = [],
    projects = [],
    customers = [],
    actuals = [],
    billingBacklogItems = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedProjects = Array.isArray(projects) ? projects : [];
    if (normalizedProjects.length === 0) {
      throw createError(400, "dynamics_projects_required", "Dynamics 365 Project Operations handoff requires at least one project.");
    }

    const contractsById = indexById(contracts);
    const contractLinesById = indexById(contractLines);
    const customersById = indexById(customers);
    const actualsByProjectId = indexManyBy(actuals, (entry) => resolveField(entry, ["projectId", "project_id", "project.id"]));
    const backlogByProjectId = indexManyBy(billingBacklogItems, (entry) => resolveField(entry, ["projectId", "project_id", "project.id"]));
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
      baselineCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        projectCount: normalizedProjects.length,
        contractCount: Array.isArray(contracts) ? contracts.length : 0,
        actualCount: Array.isArray(actuals) ? actuals.length : 0,
        billingBacklogCount: Array.isArray(billingBacklogItems) ? billingBacklogItems.length : 0
      }
    });

    const exportCapturedAt = toDateString(sourceExportCapturedAt || nowIso(clock));
    const sourcePayload = normalizedProjects.map((project, index) => {
      const projectId = requireText(resolveField(project, ["id"]), "dynamics_project_id_required");
      const contractId = normalizeOptionalText(resolveField(project, ["contractId", "contract_id", "projectContractId", "project_contract_id"]));
      const contract = contractsById.get(contractId) || null;
      const contractLineId =
        normalizeOptionalText(resolveField(project, ["contractLineId", "contract_line_id", "projectContractLineId", "project_contract_line_id"]))
        || normalizeOptionalText(resolveField(contract, ["primaryContractLineId", "primary_contract_line_id"]));
      const contractLine = contractLinesById.get(contractLineId) || null;
      const customer =
        customersById.get(normalizeOptionalText(resolveField(project, ["customerId", "customer_id", "customer.id"])))
        || customersById.get(normalizeOptionalText(resolveField(contract, ["customerId", "customer_id", "customer.id"])))
        || null;
      const projectActuals = actualsByProjectId.get(projectId) || [];
      const projectBacklog = backlogByProjectId.get(projectId) || [];
      const billingModelCode = normalizeBillingModelCode({
        project,
        contractLine
      });
      const metrics = buildProjectMetrics({
        project,
        contract,
        contractLine,
        billingModelCode,
        projectActuals,
        projectBacklog
      });
      const contractValueAmount = resolveContractValueAmount({
        project,
        contract,
        contractLine,
        metrics
      });
      const startsOn = resolveStartDate(project, exportCapturedAt);
      return {
        externalProjectId: projectId,
        sourceSystemCode: "dynamics365_project_operations",
        displayName:
          normalizeOptionalText(resolveField(project, ["name", "displayName", "display_name"]))
          || `Dynamics project ${index + 1}`,
        projectCode:
          normalizeOptionalText(resolveField(project, ["projectNumber", "project_number", "code"]))
          || normalizeOptionalText(resolveField(contract, ["contractNumber", "contract_number"]))
          || `D365-${projectId}`,
        projectReferenceCode:
          normalizeOptionalText(resolveField(project, ["reference", "referenceCode", "reference_code"]))
          || `d365-${projectId}`,
        customerLegalName:
          normalizeOptionalText(resolveField(customer, ["name", "displayName", "display_name"]))
          || normalizeOptionalText(resolveField(project, ["customer.name"])),
        customerOrganizationNumber:
          normalizeOptionalText(resolveField(customer, ["organizationNumber", "organization_number", "vat"]))
          || normalizeOptionalText(resolveField(project, ["customer.organization_number"])),
        engagementDisplayName:
          normalizeOptionalText(resolveField(project, ["description", "projectDescription", "project_description"]))
          || normalizeOptionalText(resolveField(contractLine, ["name", "description"]))
          || "Dynamics project operations engagement",
        workModelCode: billingModelCode === "fixed_price" ? "fixed_scope" : "time_only",
        workModelTitle: "Dynamics 365 Project Operations delivery",
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
        externalOpportunityId: contractId,
        externalOpportunityRef:
          normalizeOptionalText(resolveField(contract, ["name", "contractNumber", "contract_number"]))
          || normalizeOptionalText(resolveField(contractLine, ["name", "description"])),
        sourceQuoteId: normalizeOptionalText(resolveField(contract, ["quoteId", "quote_id"])),
        externalQuoteRef: normalizeOptionalText(resolveField(contract, ["quoteNumber", "quote_number"])),
        quoteAcceptedOn: toDateString(resolveField(contract, ["confirmedOn", "confirmed_on", "createdOn", "created_on"])),
        workPackageCode:
          normalizeOptionalText(resolveField(contractLine, ["lineNumber", "line_number", "name"]))
          || `D365-WP-${projectId}`,
        workPackageTitle:
          normalizeOptionalText(resolveField(contractLine, ["name", "description"]))
          || "Dynamics governed work package",
        workPackageDescription:
          normalizeOptionalText(resolveField(project, ["description", "projectDescription", "project_description"]))
          || normalizeOptionalText(resolveField(contractLine, ["description", "name"])),
        deliveryMilestoneTitle: metrics.nextMilestoneTitle,
        deliveryMilestoneDate: metrics.nextMilestoneDate,
        billingPlanFrequencyCode: billingModelCode === "fixed_price" ? "milestone" : "one_off",
        billingPlanTriggerCode: "manual",
        billingPlanLines: normalizeBillingPlanLines({
          startsOn,
          contractValueAmount,
          metrics
        }),
        providerCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          projectId,
          contractId,
          contractLineId,
          customerId: normalizeOptionalText(resolveField(customer, ["id"])),
          billingMethod: billingModelCode,
          priceListCount: metrics.priceListCount,
          actualCount: metrics.actualCount,
          invoiceableTransactionCount: metrics.invoiceableTransactionCount,
          readyToInvoiceAmount: metrics.readyToInvoiceAmount,
          spentAmount: metrics.spentAmount,
          unbilledActualAmount: metrics.unbilledActualAmount,
          onAccountAmount: metrics.onAccountAmount,
          fundingLimitAmount: metrics.fundingLimitAmount,
          profitabilityStatus: metrics.profitabilityStatus
        }
      };
    });

    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "dynamics365_project_operations",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: exportCapturedAt,
      sourcePayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function buildProjectMetrics({
  project,
  contract,
  contractLine,
  billingModelCode,
  projectActuals,
  projectBacklog
}) {
  const readyToInvoiceAmount = round2(projectBacklog.reduce((sum, row) => {
    return sum + (resolveNumber(resolveField(row, ["readyToInvoiceAmount", "ready_to_invoice_amount", "amount"])) || 0);
  }, 0));
  const spentAmount =
    resolveNumber(resolveField(contract, ["spentAmount", "spent_amount"]))
    || round2(projectActuals.reduce((sum, row) => sum + (resolveNumber(resolveField(row, ["salesAmount", "sales_amount", "amount"])) || 0), 0));
  const onAccountAmount = round2(projectBacklog.reduce((sum, row) => {
    return sum + (resolveNumber(resolveField(row, ["onAccountAmount", "on_account_amount"])) || 0);
  }, 0));
  const fundingLimitAmount =
    resolveNumber(resolveField(contractLine, ["fundingLimitAmount", "funding_limit_amount"]))
    || resolveNumber(resolveField(contract, ["fundingLimitAmount", "funding_limit_amount"]))
    || 0;
  const unbilledActualAmount = Math.max(readyToInvoiceAmount - onAccountAmount, 0);
  const profitabilityStatus =
    readyToInvoiceAmount > 0 || spentAmount > 0
      ? "in_progress"
      : "not_started";
  const milestone = projectBacklog.find((row) => normalizeOptionalText(resolveField(row, ["billingType", "billing_type"])) === "milestone");
  return {
    priceListCount:
      resolveNumber(resolveField(contract, ["priceListCount", "price_list_count"]))
      || resolveNumber(resolveField(contractLine, ["priceListCount", "price_list_count"]))
      || 0,
    actualCount: projectActuals.length,
    invoiceableTransactionCount:
      resolveNumber(resolveField(contract, ["readyToInvoiceCount", "ready_to_invoice_count"]))
      || projectBacklog.length,
    readyToInvoiceAmount,
    spentAmount: round2(spentAmount),
    unbilledActualAmount: round2(unbilledActualAmount),
    onAccountAmount,
    fundingLimitAmount: round2(fundingLimitAmount),
    profitabilityStatus,
    milestoneCount: projectBacklog.filter((row) => normalizeOptionalText(resolveField(row, ["billingType", "billing_type"])) === "milestone").length,
    nextMilestoneTitle: normalizeOptionalText(resolveField(milestone, ["name", "description"])),
    nextMilestoneDate: toDateString(resolveField(milestone, ["plannedInvoiceDate", "planned_invoice_date", "invoiceDate", "invoice_date"]))
  };
}

function resolveContractValueAmount({ project, contract, contractLine, metrics }) {
  const directValue =
    resolveNumber(resolveField(contractLine, ["totalAmount", "total_amount", "contractValue", "contract_value"]))
    || resolveNumber(resolveField(contract, ["totalAmount", "total_amount", "contractValue", "contract_value"]))
    || resolveNumber(resolveField(project, ["contractValue", "contract_value", "plannedSalesAmount", "planned_sales_amount"]))
    || null;
  if (directValue && directValue > 0) {
    return normalizeMoney(directValue, "dynamics_contract_value_required");
  }
  const derived = Math.max(metrics.readyToInvoiceAmount, metrics.spentAmount, metrics.unbilledActualAmount);
  if (derived > 0) {
    return normalizeMoney(derived, "dynamics_contract_value_required");
  }
  throw createError(400, "dynamics_contract_value_required", "Dynamics project operations handoff requires contract value or invoiceable basis.");
}

function normalizeBillingPlanLines({ startsOn, contractValueAmount, metrics }) {
  return [
    {
      plannedInvoiceDate: metrics.nextMilestoneDate || startsOn,
      amount: contractValueAmount,
      triggerCode: metrics.milestoneCount > 0 ? "milestone" : "manual"
    }
  ];
}

function normalizeBillingModelCode({ project, contractLine }) {
  const normalized = [
    normalizeOptionalText(resolveField(project, ["billingMethod", "billing_method"])),
    normalizeOptionalText(resolveField(contractLine, ["billingMethod", "billing_method"]))
  ].find(Boolean);
  if (!normalized) {
    return "time_and_material";
  }
  if (["time_and_material", "time and material", "tm", "time_material"].includes(normalized)) {
    return "time_and_material";
  }
  if (["fixed_price", "fixed price", "fixed"].includes(normalized)) {
    return "fixed_price";
  }
  return "time_and_material";
}

function resolveStartDate(project, exportCapturedAt) {
  return toDateString(resolveField(project, ["startDate", "start_date", "createdOn", "created_on"])) || exportCapturedAt;
}

function resolveEndDate(project) {
  return toDateString(resolveField(project, ["endDate", "end_date"]));
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

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
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
