import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const HUBSPOT_CRM_PROVIDER_CODE = "hubspot_crm";
export const HUBSPOT_CRM_PROVIDER_BASELINE_CODE = "SE-HUBSPOT-CRM-OBJECTS";

export function createHubSpotCrmProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: HUBSPOT_CRM_PROVIDER_CODE,
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
        profileCode: "hubspot_crm_handoff_v1",
        baselineCode: HUBSPOT_CRM_PROVIDER_BASELINE_CODE,
        operationCodes: ["deal_import", "custom_object_import", "project_status_push"]
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
    companies = [],
    projectObjects = [],
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedDeals = Array.isArray(deals) ? deals : [];
    if (normalizedDeals.length === 0) {
      throw createError(400, "hubspot_deals_required", "HubSpot project handoff requires at least one deal.");
    }
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: HUBSPOT_CRM_PROVIDER_CODE,
      baselineCode: HUBSPOT_CRM_PROVIDER_BASELINE_CODE,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        dealCount: normalizedDeals.length,
        projectObjectCount: Array.isArray(projectObjects) ? projectObjects.length : 0
      }
    });
    const companyMap = new Map(
      (Array.isArray(companies) ? companies : [])
        .filter((company) => normalizeOptionalText(company?.id))
        .map((company) => [String(company.id), company])
    );
    const normalizedPayload = normalizedDeals.map((deal) => {
      const projectObject = resolveProjectObjectForDeal(deal, projectObjects);
      const associatedCompany = resolveAssociatedCompanyForDeal(deal, companyMap);
      const dealProperties = normalizeProperties(deal?.properties);
      const projectProperties = normalizeProperties(projectObject?.properties);
      const companyProperties = normalizeProperties(associatedCompany?.properties);
      const contractValueAmount = normalizeMoney(
        projectProperties.contract_value_amount || projectProperties.contract_value || dealProperties.amount,
        "hubspot_contract_value_required"
      );
      const pipelineCode = normalizeOptionalText(dealProperties.pipeline) || "default";
      const stageCode = normalizeOptionalText(dealProperties.dealstage) || "qualified";
      return {
        externalProjectId: normalizeOptionalText(projectObject?.id) || requireText(deal?.id, "hubspot_deal_id_required"),
        sourceSystemCode: "hubspot",
        displayName:
          normalizeOptionalText(projectProperties.project_name)
          || normalizeOptionalText(projectProperties.hs_project_name)
          || requireText(dealProperties.dealname || dealProperties.hs_deal_name || deal?.id, "hubspot_project_name_required"),
        projectCode: normalizeOptionalText(projectProperties.project_code),
        projectReferenceCode: normalizeOptionalText(projectProperties.project_reference_code) || `hubspot-${deal.id}`,
        customerLegalName:
          normalizeOptionalText(companyProperties.name)
          || normalizeOptionalText(dealProperties.company_name)
          || normalizeOptionalText(projectProperties.customer_name),
        customerOrganizationNumber:
          normalizeOptionalText(companyProperties.organization_number)
          || normalizeOptionalText(companyProperties.org_number)
          || normalizeOptionalText(projectProperties.customer_org_number),
        engagementDisplayName:
          normalizeOptionalText(projectProperties.engagement_name)
          || normalizeOptionalText(dealProperties.dealname)
          || "HubSpot engagement",
        workModelCode: normalizeOptionalText(projectProperties.work_model_code) || "time_only",
        workModelTitle: normalizeOptionalText(projectProperties.work_model_title) || "HubSpot imported work model",
        operationalPackCode: normalizeOptionalText(projectProperties.operational_pack_code) || "general_core",
        requiresWorkOrders: toBoolean(projectProperties.requires_work_orders),
        requiresMilestones: toBoolean(projectProperties.requires_milestones),
        requiresAttendance: toBoolean(projectProperties.requires_attendance),
        requiresId06: toBoolean(projectProperties.requires_id06),
        billingModelCode: normalizeOptionalText(projectProperties.billing_model_code) || "time_and_material",
        revenueRecognitionModelCode:
          normalizeOptionalText(projectProperties.revenue_recognition_model_code) || "billing_equals_revenue",
        startsOn: toDateString(projectProperties.project_start_date || dealProperties.closedate || nowIso(clock)),
        endsOn: toDateString(projectProperties.project_end_date || null),
        contractValueAmount,
        externalOpportunityId: requireText(deal?.id, "hubspot_deal_id_required"),
        externalOpportunityRef: normalizeOptionalText(dealProperties.dealname) || `hubspot-deal-${deal.id}`,
        sourceQuoteId: normalizeOptionalText(projectProperties.quote_id) || normalizeOptionalText(dealProperties.quote_id),
        externalQuoteRef: normalizeOptionalText(projectProperties.quote_reference) || normalizeOptionalText(dealProperties.quote_reference),
        quoteAcceptedOn: stageCode.includes("closed") || stageCode.includes("won") ? toDateString(dealProperties.closedate || null) : null,
        workPackageCode: normalizeOptionalText(projectProperties.work_package_code) || `HUBSPOT-${deal.id}`,
        workPackageTitle: normalizeOptionalText(projectProperties.work_package_title) || "HubSpot imported work package",
        workPackageDescription: normalizeOptionalText(projectProperties.work_package_description),
        deliveryMilestoneTitle: normalizeOptionalText(projectProperties.delivery_milestone_title),
        deliveryMilestoneDate: toDateString(projectProperties.delivery_milestone_date || null),
        billingPlanFrequencyCode: normalizeOptionalText(projectProperties.billing_frequency_code) || "one_off",
        billingPlanTriggerCode: normalizeOptionalText(projectProperties.billing_trigger_code) || "manual",
        billingPlanLines: normalizeBillingPlanLines(projectProperties.billing_plan_lines, dealProperties, contractValueAmount),
        providerCode: HUBSPOT_CRM_PROVIDER_CODE,
        providerMode: provider.providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        adapterContext: {
          dealId: String(deal.id),
          dealPipeline: pipelineCode,
          dealStage: stageCode,
          customObjectId: normalizeOptionalText(projectObject?.id),
          companyId: normalizeOptionalText(associatedCompany?.id)
        }
      };
    });
    return Object.freeze({
      companyId: resolvedCompanyId,
      sourceSystemCode: "hubspot",
      batchTypeCode: "crm_handoff",
      importModeCode: "review_required",
      sourceExportCapturedAt: toDateString(sourceExportCapturedAt || nowIso(clock)),
      sourcePayload: normalizedPayload,
      integrationConnectionId: normalizeOptionalText(integrationConnectionId),
      adapterProviderCode: HUBSPOT_CRM_PROVIDER_CODE,
      adapterProviderMode: provider.providerMode,
      adapterProviderEnvironmentRef: provider.providerEnvironmentRef,
      adapterProviderBaselineRef: providerBaselineRef,
      adapterProviderBaselineCode: providerBaselineRef.baselineCode
    });
  }
}

function resolveProjectObjectForDeal(deal, projectObjects) {
  const dealId = normalizeOptionalText(deal?.id);
  return (Array.isArray(projectObjects) ? projectObjects : []).find((candidate) => {
    const candidateDealId =
      normalizeOptionalText(candidate?.properties?.dealId)
      || normalizeOptionalText(candidate?.properties?.deal_id)
      || normalizeOptionalText(candidate?.associations?.deals?.results?.[0]?.id);
    return candidateDealId && candidateDealId === dealId;
  }) || null;
}

function resolveAssociatedCompanyForDeal(deal, companyMap) {
  const companyId = normalizeOptionalText(deal?.associations?.companies?.results?.[0]?.id);
  return companyId ? companyMap.get(companyId) || null : null;
}

function normalizeProperties(properties) {
  return properties && typeof properties === "object" ? properties : {};
}

function normalizeBillingPlanLines(lines, dealProperties, contractValueAmount) {
  if (Array.isArray(lines) && lines.length > 0) {
    return lines.map((line) => ({
      plannedInvoiceDate: toDateString(line?.plannedInvoiceDate || line?.invoiceDate || dealProperties.closedate || null),
      amount: Number(line?.amount || 0),
      triggerCode: normalizeOptionalText(line?.triggerCode) || "manual"
    }));
  }
  if (Number.isFinite(contractValueAmount) && contractValueAmount > 0) {
    return [
      {
        plannedInvoiceDate: toDateString(dealProperties.closedate || null),
        amount: contractValueAmount,
        triggerCode: "manual"
      }
    ];
  }
  return [];
}

function toBoolean(value) {
  if (value === true || value === false) {
    return value;
  }
  if (typeof value === "string") {
    return ["true", "1", "yes"].includes(value.trim().toLowerCase());
  }
  return false;
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
