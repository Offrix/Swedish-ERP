import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_RULE_VERSION = "benefits-se-2026.1";
const PRICE_BASE_AMOUNT_2026 = 59200;
const CAR_BASE_FACTOR_2026 = 0.29;
const CAR_PRICE_FACTOR_2026 = 0.02785;
const CAR_ADDITIONAL_FACTOR_2026 = 0.13;
const CAR_SERVICE_MILEAGE_THRESHOLD_KM = 30000;
const CAR_SERVICE_REDUCTION_FACTOR = 0.75;
const CAR_PRIVATE_USE_LIMIT_OCCURRENCES = 10;
const CAR_PRIVATE_USE_LIMIT_KM = 100;
const FUEL_BENEFIT_MULTIPLIER = 1.2;
const HEALTH_INSURANCE_DEFAULT_RATIO = 0.6;
const WELLNESS_TAX_FREE_LIMIT_2026 = 5000;
const MEAL_VALUES_2026 = Object.freeze({
  BREAKFAST: 62,
  LUNCH_OR_DINNER: 124,
  FULL_DAY: 310
});
const GIFT_LIMITS_2026 = Object.freeze({
  CHRISTMAS: 600,
  ANNIVERSARY: 1800,
  MEMORIAL: 15000
});
const TAX_FREE_MEAL_CONTEXTS = new Set([
  "internal_representation",
  "staff_party",
  "conference",
  "hotel_breakfast_included",
  "public_transport_included"
]);
const BENEFIT_EVENT_STATUSES = Object.freeze(["valued", "approved", "dispatched_to_payroll", "corrected", "closed"]);
const BENEFIT_VALUATION_STATUSES = Object.freeze(["proposed", "approved", "superseded"]);
const PAYROLL_CONSUMPTION_STAGES = Object.freeze(["calculated", "approved"]);

export const BENEFIT_CODES = Object.freeze([
  "CAR_BENEFIT",
  "FUEL_BENEFIT",
  "WELLNESS_ALLOWANCE",
  "GIFT",
  "MEAL_BENEFIT",
  "HEALTH_INSURANCE"
]);

const BENEFIT_CATALOG_SEED = Object.freeze([
  createCatalogSeed("CAR_BENEFIT", "Bilforman", "7210", ["car_formula_2026", "manual_taxable_value"]),
  createCatalogSeed("FUEL_BENEFIT", "Drivmedelsforman", "7220", ["fuel_formula_2026", "manual_taxable_value"]),
  createCatalogSeed("HEALTH_INSURANCE", "Sjukvardsforsakring", "7230", ["health_insurance_2026", "manual_taxable_value"]),
  createCatalogSeed("MEAL_BENEFIT", "Kostforman", "7240", ["meal_table_2026", "manual_taxable_value"]),
  createCatalogSeed("GIFT", "Gava", "7260", ["gift_threshold_2026", "manual_taxable_value"]),
  createCatalogSeed("WELLNESS_ALLOWANCE", "Friskvardsbidrag", "7270", ["wellness_policy_2026", "manual_taxable_value"])
]);

export function createBenefitsPlatform(options = {}) {
  return createBenefitsEngine(options);
}

export function createBenefitsEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  hrPlatform = null,
  documentPlatform = null
} = {}) {
  const state = {
    catalog: new Map(),
    catalogIdsByCompany: new Map(),
    catalogIdsByCode: new Map(),
    events: new Map(),
    eventIdsByCompany: new Map(),
    eventIdsByEmployment: new Map(),
    eventIdBySourceKey: new Map(),
    valuations: new Map(),
    valuationIdByEvent: new Map(),
    deductions: new Map(),
    deductionIdsByEvent: new Map(),
    documents: new Map(),
    documentIdsByEvent: new Map(),
    postingIntents: new Map(),
    postingIntentIdsByEvent: new Map(),
    agiMappings: new Map(),
    agiMappingIdsByEvent: new Map(),
    payrollConsumptions: new Map(),
    payrollConsumptionIdsByEvent: new Map(),
    payrollConsumptionIdByKey: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedCatalog(state, clock, DEMO_COMPANY_ID);
  }

  return {
    benefitCodes: BENEFIT_CODES,
    listBenefitCatalog,
    getBenefitCatalogItem,
    listBenefitEvents,
    getBenefitEvent,
    createBenefitEvent,
    approveBenefitEvent,
    listBenefitAuditEvents,
    listPayrollBenefitPayloads,
    registerBenefitPayrollConsumption
  };

  function listBenefitCatalog({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.catalogIdsByCompany.get(resolvedCompanyId) || [])
      .map((benefitCatalogId) => state.catalog.get(benefitCatalogId))
      .filter(Boolean)
      .sort((left, right) => left.benefitCode.localeCompare(right.benefitCode))
      .map(copy);
  }

  function getBenefitCatalogItem({ companyId, benefitCode } = {}) {
    return copy(requireCatalogItem(state, companyId, benefitCode));
  }

  function listBenefitEvents({ companyId, reportingPeriod = null, employeeId = null, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.eventIdsByCompany.get(resolvedCompanyId) || [])
      .map((benefitEventId) => state.events.get(benefitEventId))
      .filter(Boolean)
      .filter((candidate) => (reportingPeriod ? candidate.reportingPeriod === normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid") : true))
      .filter((candidate) => (employeeId ? candidate.employeeId === employeeId : true))
      .filter((candidate) => (employmentId ? candidate.employmentId === employmentId : true))
      .sort((left, right) => left.occurredOn.localeCompare(right.occurredOn) || left.createdAt.localeCompare(right.createdAt))
      .map((candidate) => presentBenefitEvent(state, candidate));
  }

  function getBenefitEvent({ companyId, benefitEventId } = {}) {
    return presentBenefitEvent(state, requireBenefitEvent(state, companyId, benefitEventId));
  }

  function createBenefitEvent({
    companyId,
    employeeId,
    employmentId,
    benefitCode,
    reportingPeriod = null,
    occurredOn = null,
    startDate = null,
    endDate = null,
    sourceType = "manual_entry",
    sourceId = null,
    sourcePayload = {},
    employeePaidValue = 0,
    netDeductionValue = 0,
    supportingDocumentId = null,
    dimensionJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    const resolvedBenefitCode = assertAllowed(normalizeCode(benefitCode, "benefit_code_required"), BENEFIT_CODES, "benefit_code_invalid");
    const catalogItem = requireCatalogItem(state, resolvedCompanyId, resolvedBenefitCode);
    assertEmploymentLink({ hrPlatform, companyId: resolvedCompanyId, employeeId: resolvedEmployeeId, employmentId: resolvedEmploymentId });

    const resolvedOccurredOn = normalizeOptionalDate(occurredOn, "benefit_occurred_on_invalid");
    const resolvedStartDate = normalizeOptionalDate(startDate, "benefit_start_date_invalid");
    const resolvedEndDate = normalizeOptionalDate(endDate, "benefit_end_date_invalid");
    if (resolvedStartDate && resolvedEndDate && resolvedEndDate < resolvedStartDate) {
      throw createError(400, "benefit_dates_invalid", "Benefit end date cannot be earlier than the start date.");
    }

    const resolvedReportingPeriod =
      normalizeOptionalReportingPeriod(reportingPeriod) ||
      toReportingPeriod(resolvePrimaryDate({ occurredOn: resolvedOccurredOn, startDate: resolvedStartDate, endDate: resolvedEndDate, clock }));
    const resolvedOccurredDate = resolvedOccurredOn || resolvedStartDate || periodFirstDate(resolvedReportingPeriod);
    const resolvedSourceType = normalizeOptionalText(sourceType) || "manual_entry";
    const resolvedSourceId = normalizeOptionalText(sourceId);
    const dedupeKey = resolvedSourceId ? `${resolvedCompanyId}:${resolvedEmploymentId}:${resolvedSourceType}:${resolvedSourceId}` : null;
    if (dedupeKey && state.eventIdBySourceKey.has(dedupeKey)) {
      return presentBenefitEvent(state, state.events.get(state.eventIdBySourceKey.get(dedupeKey)));
    }

    const eventDraft = {
      benefitEventId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      benefitCode: resolvedBenefitCode,
      reportingPeriod: resolvedReportingPeriod,
      taxYear: resolvedReportingPeriod.slice(0, 4),
      occurredOn: resolvedOccurredDate,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      supportingDocumentId: normalizeOptionalText(supportingDocumentId),
      dimensionJson: normalizeDimensions(dimensionJson),
      payloadJson: copy(sourcePayload || {}),
      status: BENEFIT_EVENT_STATUSES[0],
      approvedAt: null,
      approvedByActorId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    const valuation = valueBenefitEvent({
      catalogItem,
      eventDraft,
      sourcePayload: eventDraft.payloadJson,
      employeePaidValue: normalizeMoney(employeePaidValue, "benefit_employee_paid_invalid"),
      netDeductionValue: normalizeMoney(netDeductionValue, "benefit_net_deduction_invalid")
    });

    storeBenefitEvent({
      state,
      clock,
      eventDraft,
      valuation,
      catalogItem,
      correlationId,
      documentPlatform
    });
    if (dedupeKey) {
      state.eventIdBySourceKey.set(dedupeKey, eventDraft.benefitEventId);
    }
    pushAudit(state, clock, {
      companyId: eventDraft.companyId,
      actorId: eventDraft.createdByActorId,
      correlationId,
      action: "benefit.event.created",
      entityType: "benefit_event",
      entityId: eventDraft.benefitEventId,
      explanation: `Created ${eventDraft.benefitCode} event for reporting period ${eventDraft.reportingPeriod}.`
    });
    return presentBenefitEvent(state, eventDraft);
  }

  function approveBenefitEvent({ companyId, benefitEventId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const event = requireBenefitEvent(state, companyId, benefitEventId);
    const valuation = requireValuationByEvent(state, event.benefitEventId);
    if (event.status === "corrected" || event.status === "closed") {
      throw createError(409, "benefit_event_not_approvable", "Closed or corrected benefit events cannot be approved.");
    }
    if (event.status === "approved" || event.status === "dispatched_to_payroll") {
      return presentBenefitEvent(state, event);
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const now = nowIso(clock);
    event.status = "approved";
    event.approvedAt = now;
    event.approvedByActorId = resolvedActorId;
    event.updatedAt = now;
    valuation.status = "approved";
    valuation.approvedAt = now;
    valuation.approvedByActorId = resolvedActorId;
    state.events.set(event.benefitEventId, event);
    state.valuations.set(valuation.benefitValuationId, valuation);
    pushAudit(state, clock, {
      companyId: event.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "benefit.event.approved",
      entityType: "benefit_event",
      entityId: event.benefitEventId,
      explanation: `Approved ${event.benefitCode} valuation for payroll and AGI handoff.`
    });
    return presentBenefitEvent(state, event);
  }

  function listBenefitAuditEvents({ companyId, benefitEventId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (benefitEventId ? event.entityId === benefitEventId : true))
      .map(copy);
  }

  function listPayrollBenefitPayloads({ companyId, employmentId, reportingPeriod } = {}) {
    const events = listBenefitEvents({ companyId, employmentId, reportingPeriod }).filter(isPayrollDispatchableBenefitEvent);
    return {
      events,
      payLinePayloads: events.flatMap((event) => event.postingIntents.map((intent) => copy(intent.payrollLinePayloadJson))),
      warnings: events.flatMap((event) => event.valuation.decision.warnings).filter(Boolean)
    };
  }

  function registerBenefitPayrollConsumption({
    companyId,
    benefitEventId,
    payRunId,
    payRunLineId,
    payItemCode,
    processingStep,
    sourceType = "benefit_event",
    amount,
    sourceSnapshotHash = null,
    stage = "calculated",
    actorId = "system"
  } = {}) {
    const event = requireBenefitEvent(state, companyId, benefitEventId);
    if (!isPayrollDispatchableBenefitEvent(event)) {
      throw createError(409, "benefit_event_not_approved_for_payroll", "Benefit event must be approved before payroll consumption.");
    }
    const resolvedStage = assertAllowed(stage, PAYROLL_CONSUMPTION_STAGES, "benefit_payroll_consumption_stage_invalid");
    const resolvedPayRunId = requireText(payRunId, "benefit_payroll_consumption_pay_run_id_required");
    const resolvedPayRunLineId = requireText(payRunLineId, "benefit_payroll_consumption_pay_run_line_id_required");
    const resolvedPayItemCode = requireText(payItemCode, "benefit_payroll_consumption_pay_item_code_required");
    const resolvedProcessingStep = normalizeProcessingStep(processingStep, "benefit_payroll_consumption_processing_step_invalid");
    const resolvedAmount = normalizeMoney(amount, "benefit_payroll_consumption_amount_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const now = nowIso(clock);
    const existingId = state.payrollConsumptionIdByKey.get(resolvedPayRunLineId);
    const existing = existingId ? state.payrollConsumptions.get(existingId) : null;
    if (existing) {
      existing.stage = upgradeConsumptionStage(existing.stage, resolvedStage);
      existing.amount = resolvedAmount;
      existing.sourceType = requireText(sourceType, "benefit_payroll_consumption_source_type_required");
      existing.sourceSnapshotHash = normalizeOptionalText(sourceSnapshotHash);
      existing.updatedAt = now;
      if (existing.stage === "approved" && !existing.approvedAt) {
        existing.approvedAt = now;
        existing.approvedByActorId = resolvedActorId;
      }
      event.status = "dispatched_to_payroll";
      event.updatedAt = now;
      state.events.set(event.benefitEventId, event);
      state.payrollConsumptions.set(existing.benefitPayrollConsumptionId, existing);
      return copy(existing);
    }

    const record = {
      benefitPayrollConsumptionId: crypto.randomUUID(),
      benefitEventId: event.benefitEventId,
      companyId: event.companyId,
      employeeId: event.employeeId,
      employmentId: event.employmentId,
      payRunId: resolvedPayRunId,
      payRunLineId: resolvedPayRunLineId,
      payItemCode: resolvedPayItemCode,
      processingStep: resolvedProcessingStep,
      sourceType: requireText(sourceType, "benefit_payroll_consumption_source_type_required"),
      amount: resolvedAmount,
      sourceSnapshotHash: normalizeOptionalText(sourceSnapshotHash),
      stage: resolvedStage,
      calculatedAt: now,
      calculatedByActorId: resolvedActorId,
      approvedAt: resolvedStage === "approved" ? now : null,
      approvedByActorId: resolvedStage === "approved" ? resolvedActorId : null,
      updatedAt: now
    };
    state.payrollConsumptions.set(record.benefitPayrollConsumptionId, record);
    appendToIndex(state.payrollConsumptionIdsByEvent, event.benefitEventId, record.benefitPayrollConsumptionId);
    state.payrollConsumptionIdByKey.set(resolvedPayRunLineId, record.benefitPayrollConsumptionId);
    event.status = "dispatched_to_payroll";
    event.updatedAt = now;
    state.events.set(event.benefitEventId, event);
    pushAudit(state, clock, {
      companyId: event.companyId,
      actorId: resolvedActorId,
      correlationId: resolvedPayRunId,
      action: resolvedStage === "approved" ? "benefit.payroll.consumption.approved" : "benefit.payroll.consumption.registered",
      entityType: "benefit_event",
      entityId: event.benefitEventId,
      explanation: `Registered payroll consumption for pay item ${resolvedPayItemCode} in pay run ${resolvedPayRunId}.`
    });
    return copy(record);
  }
}

function valueBenefitEvent({ catalogItem, eventDraft, sourcePayload, employeePaidValue, netDeductionValue }) {
  const resolvedMethod = normalizeOptionalText(sourcePayload.valuationMethod) || catalogItem.supportedValuationMethods[0];
  const evaluator = BENEFIT_EVALUATORS[eventDraft.benefitCode];
  if (!evaluator) {
    throw createError(400, "benefit_code_unsupported", `Benefit code ${eventDraft.benefitCode} is not implemented.`);
  }
  const normalizedInputs = {
    reportingPeriod: eventDraft.reportingPeriod,
    taxYear: eventDraft.taxYear,
    occurredOn: eventDraft.occurredOn,
    startDate: eventDraft.startDate,
    endDate: eventDraft.endDate,
    employeePaidValue,
    netDeductionValue,
    sourcePayload: copy(sourcePayload)
  };
  const evaluated = evaluator({
    catalogItem,
    inputs: normalizedInputs,
    resolvedMethod
  });
  const decision = {
    decisionCode: evaluated.decisionCode,
    inputsHash: buildSnapshotHash({
      benefitCode: eventDraft.benefitCode,
      reportingPeriod: eventDraft.reportingPeriod,
      inputs: normalizedInputs,
      outputs: evaluated.outputs
    }),
    ruleVersion: DEFAULT_RULE_VERSION,
    effectiveDate: eventDraft.occurredOn,
    outputs: copy(evaluated.outputs),
    warnings: copy(evaluated.warnings),
    explanation: copy(evaluated.explanation)
  };

  return {
    benefitValuationId: crypto.randomUUID(),
    benefitEventId: eventDraft.benefitEventId,
    companyId: eventDraft.companyId,
    benefitCode: eventDraft.benefitCode,
    reportingPeriod: eventDraft.reportingPeriod,
    taxYear: eventDraft.taxYear,
    valuationMethod: resolvedMethod,
    employerPaidValue: roundMoney(evaluated.employerPaidValue),
    marketValue: roundMoney(evaluated.marketValue),
    taxableValueBeforeOffsets: roundMoney(evaluated.taxableValueBeforeOffsets),
    taxableValue: roundMoney(evaluated.taxableValue),
    taxFreeValue: roundMoney(evaluated.taxFreeValue),
    employeePaidValue: roundMoney(employeePaidValue),
    netDeductionValue: roundMoney(netDeductionValue),
    agiMappingCode: evaluated.taxableValue > 0 ? catalogItem.defaultAgiMappingCode : "not_reported",
    ledgerAccountCode: evaluated.ledgerAccountCode || catalogItem.defaultLedgerAccountCode,
    taxability: resolveTaxability({
      taxableValue: evaluated.taxableValue,
      employerPaidValue: evaluated.employerPaidValue
    }),
    cashSalaryRequiredForWithholding: roundMoney(evaluated.taxableValue) > 0,
    status: BENEFIT_VALUATION_STATUSES[0],
    approvedAt: null,
    approvedByActorId: null,
    decision
  };
}

function storeBenefitEvent({ state, clock, eventDraft, valuation, catalogItem, correlationId, documentPlatform }) {
  state.events.set(eventDraft.benefitEventId, eventDraft);
  appendToIndex(state.eventIdsByCompany, eventDraft.companyId, eventDraft.benefitEventId);
  appendToIndex(state.eventIdsByEmployment, eventDraft.employmentId, eventDraft.benefitEventId);

  state.valuations.set(valuation.benefitValuationId, valuation);
  state.valuationIdByEvent.set(eventDraft.benefitEventId, valuation.benefitValuationId);

  const deductionRecord = {
    benefitDeductionId: crypto.randomUUID(),
    benefitEventId: eventDraft.benefitEventId,
    companyId: eventDraft.companyId,
    employeePaidValue: valuation.employeePaidValue,
    netDeductionValue: valuation.netDeductionValue,
    createdAt: eventDraft.createdAt
  };
  state.deductions.set(deductionRecord.benefitDeductionId, deductionRecord);
  appendToIndex(state.deductionIdsByEvent, eventDraft.benefitEventId, deductionRecord.benefitDeductionId);

  for (const intent of buildPostingIntents({ catalogItem, eventDraft, valuation })) {
    state.postingIntents.set(intent.benefitPostingIntentId, intent);
    appendToIndex(state.postingIntentIdsByEvent, eventDraft.benefitEventId, intent.benefitPostingIntentId);
  }

  for (const mapping of buildAgiMappings({ eventDraft, valuation })) {
    state.agiMappings.set(mapping.benefitAgiMappingId, mapping);
    appendToIndex(state.agiMappingIdsByEvent, eventDraft.benefitEventId, mapping.benefitAgiMappingId);
  }

  if (eventDraft.supportingDocumentId) {
    const record = {
      benefitDocumentId: crypto.randomUUID(),
      benefitEventId: eventDraft.benefitEventId,
      companyId: eventDraft.companyId,
      documentId: eventDraft.supportingDocumentId,
      linkedAt: eventDraft.createdAt,
      linkedByActorId: eventDraft.createdByActorId
    };
    state.documents.set(record.benefitDocumentId, record);
    appendToIndex(state.documentIdsByEvent, eventDraft.benefitEventId, record.benefitDocumentId);

    if (documentPlatform?.linkDocumentRecord) {
      documentPlatform.linkDocumentRecord({
        companyId: eventDraft.companyId,
        documentId: eventDraft.supportingDocumentId,
        targetType: "benefit_event",
        targetId: eventDraft.benefitEventId,
        metadataJson: {
          benefitCode: eventDraft.benefitCode,
          reportingPeriod: eventDraft.reportingPeriod
        },
        actorId: eventDraft.createdByActorId,
        correlationId
      });
    }
  }
}

function buildPostingIntents({ catalogItem, eventDraft, valuation }) {
  const intents = [];
  if (valuation.taxableValue > 0) {
    intents.push({
      benefitPostingIntentId: crypto.randomUUID(),
      benefitEventId: eventDraft.benefitEventId,
      companyId: eventDraft.companyId,
      processingStep: 6,
      intentType: "benefit_taxable_value",
      ledgerAccountCode: valuation.ledgerAccountCode,
      amount: valuation.taxableValue,
      payrollLinePayloadJson: {
        processingStep: 6,
        payItemCode: catalogItem.defaultPayItemCode,
        amount: valuation.taxableValue,
        sourceType: "benefit_event",
        sourceId: eventDraft.benefitEventId,
        note: `${catalogItem.displayName} ${eventDraft.reportingPeriod}`,
        dimensionJson: copy(eventDraft.dimensionJson || {}),
        overrides: {
          displayName: catalogItem.displayName,
          ledgerAccountCode: valuation.ledgerAccountCode,
          agiMappingCode: valuation.agiMappingCode,
          taxTreatmentCode: "taxable",
          employerContributionTreatmentCode: "included",
          includedInNetPay: false,
          reportingOnly: true
        }
      },
      createdAt: eventDraft.createdAt
    });
  }
  if (valuation.netDeductionValue > 0) {
    intents.push({
      benefitPostingIntentId: crypto.randomUUID(),
      benefitEventId: eventDraft.benefitEventId,
      companyId: eventDraft.companyId,
      processingStep: 13,
      intentType: "benefit_net_deduction",
      ledgerAccountCode: "2750",
      amount: valuation.netDeductionValue,
      payrollLinePayloadJson: {
        processingStep: 13,
        payItemCode: "NET_DEDUCTION",
        amount: valuation.netDeductionValue,
        sourceType: "benefit_net_deduction",
        sourceId: eventDraft.benefitEventId,
        note: `Nettoloneavdrag ${catalogItem.displayName.toLowerCase()}`,
        dimensionJson: copy(eventDraft.dimensionJson || {}),
        overrides: {
          displayName: `Nettoloneavdrag ${catalogItem.displayName.toLowerCase()}`,
          ledgerAccountCode: "2750",
          agiMappingCode: "not_reported",
          taxTreatmentCode: "non_taxable",
          employerContributionTreatmentCode: "excluded",
          includedInNetPay: true,
          reportingOnly: false
        }
      },
      createdAt: eventDraft.createdAt
    });
  }
  return intents;
}

function buildAgiMappings({ eventDraft, valuation }) {
  if (valuation.taxableValue <= 0) {
    return [];
  }
  return [
    {
      benefitAgiMappingId: crypto.randomUUID(),
      benefitEventId: eventDraft.benefitEventId,
      companyId: eventDraft.companyId,
      reportingPeriod: eventDraft.reportingPeriod,
      agiMappingCode: valuation.agiMappingCode,
      reportableAmount: valuation.taxableValue,
      createdAt: eventDraft.createdAt
    }
  ];
}

const BENEFIT_EVALUATORS = {
  CAR_BENEFIT: evaluateCarBenefit,
  FUEL_BENEFIT: evaluateFuelBenefit,
  WELLNESS_ALLOWANCE: evaluateWellnessAllowance,
  GIFT: evaluateGift,
  MEAL_BENEFIT: evaluateMealBenefit,
  HEALTH_INSURANCE: evaluateHealthInsurance
};

function evaluateCarBenefit({ inputs, resolvedMethod }) {
  if (resolvedMethod === "manual_taxable_value") {
    const manualTaxableValue = normalizeMoney(inputs.sourcePayload.manualTaxableValue, "benefit_car_manual_value_invalid");
    const employerPaidValue = normalizeMoney(inputs.sourcePayload.employerPaidValue ?? manualTaxableValue, "benefit_car_employer_paid_invalid");
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_CAR_MANUAL_VALUE",
      marketValue: employerPaidValue,
      employerPaidValue,
      taxableValueBeforeOffsets: manualTaxableValue,
      employeePaidValue: inputs.employeePaidValue,
      netDeductionValue: inputs.netDeductionValue,
      ledgerAccountCode: "7210",
      outputs: {
        valuationMethod: resolvedMethod,
        manualTaxableValue
      },
      warnings: [],
      explanation: [
        "Manual taxable value was supplied for bilforman.",
        "Use this path for special vehicle decisions or documented tax-agency adjustments."
      ]
    });
  }

  const anyDayInMonthCounts = overlapReportingPeriod(inputs.reportingPeriod, inputs.startDate, inputs.endDate);
  if (!anyDayInMonthCounts) {
    throw createError(400, "benefit_car_period_mismatch", "Car benefit does not overlap the supplied reporting period.");
  }
  const privateUseOccurrences = normalizeInteger(inputs.sourcePayload.privateUseOccurrences ?? 0, "benefit_car_private_use_occurrences_invalid");
  const privateUseKm = normalizeMoney(inputs.sourcePayload.privateUseKm ?? 0, "benefit_car_private_use_km_invalid");
  const hasMileageLog = inputs.sourcePayload.hasMileageLog === true;
  if (
    hasMileageLog &&
    privateUseOccurrences <= CAR_PRIVATE_USE_LIMIT_OCCURRENCES &&
    privateUseKm <= CAR_PRIVATE_USE_LIMIT_KM
  ) {
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_CAR_RINGA_OMFATTNING",
      marketValue: 0,
      employerPaidValue: 0,
      taxableValueBeforeOffsets: 0,
      employeePaidValue: 0,
      netDeductionValue: 0,
      ledgerAccountCode: "7210",
      outputs: {
        valuationMethod: resolvedMethod,
        privateUseOccurrences,
        privateUseKm,
        hasMileageLog
      },
      warnings: [],
      explanation: [
        "Private use stayed within ringa omfattning.",
        "A mileage log was supplied and both thresholds remained within 10 occasions and 100 km."
      ]
    });
  }

  const newCarPrice = normalizeMoney(inputs.sourcePayload.newCarPrice, "benefit_car_new_car_price_required");
  const extraEquipmentValue = normalizeMoney(inputs.sourcePayload.extraEquipmentValue ?? 0, "benefit_car_extra_equipment_invalid");
  const vehicleTaxAnnual = normalizeMoney(inputs.sourcePayload.vehicleTaxAnnual ?? 0, "benefit_car_vehicle_tax_invalid");
  const basePrice = roundMoney(newCarPrice + extraEquipmentValue);
  let annualValue = roundMoney(
    PRICE_BASE_AMOUNT_2026 * CAR_BASE_FACTOR_2026 +
      basePrice * CAR_PRICE_FACTOR_2026 +
      basePrice * CAR_ADDITIONAL_FACTOR_2026 +
      vehicleTaxAnnual
  );
  const serviceMileageKm = normalizeMoney(inputs.sourcePayload.serviceMileageKm ?? 0, "benefit_car_service_mileage_invalid");
  const applyServiceMileageReduction = inputs.sourcePayload.applyServiceMileageReduction === true;
  const warnings = [];
  if (applyServiceMileageReduction) {
    if (serviceMileageKm < CAR_SERVICE_MILEAGE_THRESHOLD_KM) {
      throw createError(
        400,
        "benefit_car_service_mileage_threshold_not_met",
        "Service mileage reduction requires at least 30 000 km in service for the year."
      );
    }
    annualValue = roundMoney(annualValue * CAR_SERVICE_REDUCTION_FACTOR);
  }
  if (!hasMileageLog && privateUseOccurrences > 0) {
    warnings.push("benefit_car_missing_mileage_log");
  }
  const monthlyValue = roundMoney(annualValue / 12);
  return finalizeBenefitAmounts({
    decisionCode: "BENEFIT_CAR_FORMULA_2026",
    marketValue: monthlyValue,
    employerPaidValue: monthlyValue,
    taxableValueBeforeOffsets: monthlyValue,
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7210",
    outputs: {
      valuationMethod: resolvedMethod,
      priceBaseAmount2026: PRICE_BASE_AMOUNT_2026,
      newCarPrice,
      extraEquipmentValue,
      vehicleTaxAnnual,
      annualValue,
      monthlyValue,
      serviceMileageKm,
      applyServiceMileageReduction,
      privateUseOccurrences,
      privateUseKm,
      hasMileageLog,
      fullMonthApplied: true
    },
    warnings,
    explanation: [
      "Any car benefit day in the reporting month values the full month.",
      `Annual value uses 2026 factors with 0.29 x PBB, ${CAR_PRICE_FACTOR_2026 * 100}% of price base and 13% of price base plus annual vehicle tax.`,
      applyServiceMileageReduction
        ? "Service mileage reduction was applied after the documented threshold was met."
        : "Service mileage reduction was not applied."
    ]
  });
}

function evaluateFuelBenefit({ inputs, resolvedMethod }) {
  if (resolvedMethod === "manual_taxable_value") {
    const manualTaxableValue = normalizeMoney(inputs.sourcePayload.manualTaxableValue, "benefit_fuel_manual_value_invalid");
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_FUEL_MANUAL_VALUE",
      marketValue: manualTaxableValue,
      employerPaidValue: manualTaxableValue,
      taxableValueBeforeOffsets: manualTaxableValue,
      employeePaidValue: inputs.employeePaidValue,
      netDeductionValue: inputs.netDeductionValue,
      ledgerAccountCode: "7220",
      outputs: {
        valuationMethod: resolvedMethod,
        manualTaxableValue
      },
      warnings: [],
      explanation: ["Manual taxable value was supplied for drivmedelsforman."]
    });
  }

  const fuelType = normalizeOptionalText(inputs.sourcePayload.fuelType) || "liquid_fuel";
  const workplaceChargingTaxExempt = inputs.sourcePayload.workplaceChargingTaxExempt === true;
  if (fuelType === "electricity" && workplaceChargingTaxExempt === true && inputs.occurredOn <= "2026-06-30") {
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_FUEL_WORKPLACE_CHARGING_TAX_FREE",
      marketValue: 0,
      employerPaidValue: 0,
      taxableValueBeforeOffsets: 0,
      employeePaidValue: 0,
      netDeductionValue: 0,
      ledgerAccountCode: "7220",
      outputs: {
        valuationMethod: resolvedMethod,
        fuelType,
        workplaceChargingTaxExempt
      },
      warnings: [],
      explanation: ["Workplace charging remained tax free within the temporary exemption window ending 2026-06-30."]
    });
  }

  const vehicleContext = normalizeOptionalText(inputs.sourcePayload.vehicleContext) || "benefit_car";
  const marketValuePrivateFuel = resolveFuelMarketValue(inputs.sourcePayload);
  const multiplier = vehicleContext === "private_car" ? 1 : FUEL_BENEFIT_MULTIPLIER;
  return finalizeBenefitAmounts({
    decisionCode: vehicleContext === "private_car" ? "BENEFIT_FUEL_PRIVATE_CAR" : "BENEFIT_FUEL_BENEFIT_CAR",
    marketValue: marketValuePrivateFuel,
    employerPaidValue: marketValuePrivateFuel,
    taxableValueBeforeOffsets: roundMoney(marketValuePrivateFuel * multiplier),
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7220",
    outputs: {
      valuationMethod: resolvedMethod,
      vehicleContext,
      fuelType,
      marketValuePrivateFuel,
      multiplier
    },
    warnings: [],
    explanation: [
      vehicleContext === "private_car"
        ? "Employer-paid fuel for a private car is valued at market value."
        : "Employer-paid private fuel for a benefit car is valued at market value times 1.2.",
      "Private and service use must be supportable through mileage documentation when total fuel costs are allocated."
    ]
  });
}

function evaluateMealBenefit({ inputs, resolvedMethod }) {
  if (resolvedMethod === "manual_taxable_value") {
    const manualTaxableValue = normalizeMoney(inputs.sourcePayload.manualTaxableValue, "benefit_meal_manual_value_invalid");
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_MEAL_MANUAL_VALUE",
      marketValue: manualTaxableValue,
      employerPaidValue: manualTaxableValue,
      taxableValueBeforeOffsets: manualTaxableValue,
      employeePaidValue: inputs.employeePaidValue,
      netDeductionValue: inputs.netDeductionValue,
      ledgerAccountCode: "7240",
      outputs: {
        valuationMethod: resolvedMethod,
        manualTaxableValue
      },
      warnings: [],
      explanation: ["Manual taxable value was supplied for kostforman."]
    });
  }

  const mealCode = assertAllowed(normalizeCode(inputs.sourcePayload.mealCode || "LUNCH_OR_DINNER", "benefit_meal_code_required"), Object.keys(MEAL_VALUES_2026), "benefit_meal_code_invalid");
  const quantity = Math.max(1, normalizeInteger(inputs.sourcePayload.quantity ?? 1, "benefit_meal_quantity_invalid"));
  const taxExemptContextCode = normalizeOptionalText(inputs.sourcePayload.taxExemptContextCode);
  if (taxExemptContextCode && TAX_FREE_MEAL_CONTEXTS.has(taxExemptContextCode)) {
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_MEAL_TAX_FREE_CONTEXT",
      marketValue: 0,
      employerPaidValue: 0,
      taxableValueBeforeOffsets: 0,
      employeePaidValue: 0,
      netDeductionValue: 0,
      ledgerAccountCode: "7240",
      outputs: {
        valuationMethod: resolvedMethod,
        mealCode,
        quantity,
        taxExemptContextCode
      },
      warnings: [],
      explanation: ["Meal context matched a tax-free situation under the configured rule set."]
    });
  }
  const marketValue = roundMoney(MEAL_VALUES_2026[mealCode] * quantity);
  return finalizeBenefitAmounts({
    decisionCode: "BENEFIT_MEAL_TABLE_2026",
    marketValue,
    employerPaidValue: marketValue,
    taxableValueBeforeOffsets: marketValue,
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7240",
    outputs: {
      valuationMethod: resolvedMethod,
      mealCode,
      quantity,
      dailyRate: MEAL_VALUES_2026[mealCode]
    },
    warnings: [],
    explanation: ["Meal benefit used the 2026 benefit table and allowed employee offsets to reduce the taxable value."]
  });
}

function evaluateWellnessAllowance({ inputs, resolvedMethod }) {
  if (resolvedMethod === "manual_taxable_value") {
    const manualTaxableValue = normalizeMoney(inputs.sourcePayload.manualTaxableValue, "benefit_wellness_manual_value_invalid");
    const employerPaidValue = normalizeMoney(inputs.sourcePayload.employerPaidValue ?? manualTaxableValue, "benefit_wellness_employer_paid_invalid");
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_WELLNESS_MANUAL_VALUE",
      marketValue: employerPaidValue,
      employerPaidValue,
      taxableValueBeforeOffsets: manualTaxableValue,
      employeePaidValue: inputs.employeePaidValue,
      netDeductionValue: inputs.netDeductionValue,
      ledgerAccountCode: "7270",
      outputs: {
        valuationMethod: resolvedMethod,
        manualTaxableValue
      },
      warnings: [],
      explanation: ["Manual taxable value was supplied for friskvardsbidrag."]
    });
  }

  const reimbursementAmount = normalizeMoney(
    inputs.sourcePayload.reimbursementAmount ?? inputs.sourcePayload.employerPaidValue,
    "benefit_wellness_reimbursement_required"
  );
  const calendarYearGrantedBeforeEvent = normalizeMoney(
    inputs.sourcePayload.calendarYearGrantedBeforeEvent ?? 0,
    "benefit_wellness_year_total_invalid"
  );
  const totalForYear = roundMoney(calendarYearGrantedBeforeEvent + reimbursementAmount);
  const equalTermsOffered = inputs.sourcePayload.equalTermsOffered !== false;
  const providedAsGiftCard = inputs.sourcePayload.providedAsGiftCard === true;
  const carryOverFromPriorYear = inputs.sourcePayload.carryOverFromPriorYear === true;
  const hasRequiredReceiptFacts =
    Boolean(normalizeOptionalText(inputs.sourcePayload.activityType)) &&
    Boolean(normalizeOptionalText(inputs.sourcePayload.activityDate)) &&
    Boolean(normalizeOptionalText(inputs.sourcePayload.vendorName));
  const warnings = [];
  if (totalForYear > WELLNESS_TAX_FREE_LIMIT_2026 && calendarYearGrantedBeforeEvent > 0) {
    warnings.push("benefit_wellness_prior_events_may_need_reassessment");
  }
  const taxFreeEligible =
    equalTermsOffered &&
    !providedAsGiftCard &&
    !carryOverFromPriorYear &&
    hasRequiredReceiptFacts &&
    totalForYear <= WELLNESS_TAX_FREE_LIMIT_2026;
  return finalizeBenefitAmounts({
    decisionCode: taxFreeEligible ? "BENEFIT_WELLNESS_TAX_FREE" : "BENEFIT_WELLNESS_TAXABLE",
    marketValue: reimbursementAmount,
    employerPaidValue: reimbursementAmount,
    taxableValueBeforeOffsets: taxFreeEligible ? 0 : reimbursementAmount,
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7270",
    outputs: {
      valuationMethod: resolvedMethod,
      reimbursementAmount,
      calendarYearGrantedBeforeEvent,
      totalForYear,
      equalTermsOffered,
      providedAsGiftCard,
      carryOverFromPriorYear,
      hasRequiredReceiptFacts
    },
    warnings,
    explanation: [
      taxFreeEligible
        ? "Wellness reimbursement stayed within the tax-free annual limit and met the policy conditions."
        : "Wellness reimbursement became taxable because one or more tax-free conditions failed or the annual limit was exceeded."
    ]
  });
}

function evaluateGift({ inputs, resolvedMethod }) {
  if (resolvedMethod === "manual_taxable_value") {
    const manualTaxableValue = normalizeMoney(inputs.sourcePayload.manualTaxableValue, "benefit_gift_manual_value_invalid");
    const employerPaidValue = normalizeMoney(inputs.sourcePayload.employerPaidValue ?? manualTaxableValue, "benefit_gift_employer_paid_invalid");
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_GIFT_MANUAL_VALUE",
      marketValue: employerPaidValue,
      employerPaidValue,
      taxableValueBeforeOffsets: manualTaxableValue,
      employeePaidValue: inputs.employeePaidValue,
      netDeductionValue: inputs.netDeductionValue,
      ledgerAccountCode: "7260",
      outputs: {
        valuationMethod: resolvedMethod,
        manualTaxableValue
      },
      warnings: [],
      explanation: ["Manual taxable value was supplied for employee gift."]
    });
  }

  const giftType = assertAllowed(normalizeCode(inputs.sourcePayload.giftType || "OTHER", "benefit_gift_type_required"), ["CHRISTMAS", "ANNIVERSARY", "MEMORIAL", "OTHER"], "benefit_gift_type_invalid");
  const giftValueInclVat = normalizeMoney(inputs.sourcePayload.giftValueInclVat, "benefit_gift_value_required");
  const employmentYears = normalizeMoney(inputs.sourcePayload.employmentYears ?? 0, "benefit_gift_employment_years_invalid");
  const employeeAge = normalizeInteger(inputs.sourcePayload.employeeAge ?? 0, "benefit_gift_employee_age_invalid");
  const employmentEnding = inputs.sourcePayload.employmentEnding === true;
  const roundBirthday = inputs.sourcePayload.roundBirthday === true;
  const qualifiesMemorialGift =
    giftType === "MEMORIAL" &&
    (employmentYears >= 20 || employmentEnding || (employeeAge >= 50 && roundBirthday === true));
  const threshold = GIFT_LIMITS_2026[giftType] ?? 0;
  const taxFreeEligible =
    (giftType === "CHRISTMAS" || giftType === "ANNIVERSARY" || qualifiesMemorialGift) &&
    giftValueInclVat <= threshold;
  return finalizeBenefitAmounts({
    decisionCode: taxFreeEligible ? "BENEFIT_GIFT_TAX_FREE" : "BENEFIT_GIFT_TAXABLE",
    marketValue: giftValueInclVat,
    employerPaidValue: giftValueInclVat,
    taxableValueBeforeOffsets: taxFreeEligible ? 0 : giftValueInclVat,
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7260",
    outputs: {
      valuationMethod: resolvedMethod,
      giftType,
      giftValueInclVat,
      threshold,
      employmentYears,
      employeeAge,
      employmentEnding,
      roundBirthday,
      qualifiesMemorialGift
    },
    warnings: [],
    explanation: [
      taxFreeEligible
        ? "Gift stayed within the tax-free threshold for the qualifying occasion."
        : "Gift became taxable from the first krona because the occasion or threshold conditions were not met."
    ]
  });
}

function evaluateHealthInsurance({ inputs, resolvedMethod }) {
  if (resolvedMethod === "manual_taxable_value") {
    const manualTaxableValue = normalizeMoney(inputs.sourcePayload.manualTaxableValue, "benefit_health_manual_value_invalid");
    const employerPaidValue = normalizeMoney(inputs.sourcePayload.employerPaidValue ?? manualTaxableValue, "benefit_health_employer_paid_invalid");
    return finalizeBenefitAmounts({
      decisionCode: "BENEFIT_HEALTH_INSURANCE_MANUAL_VALUE",
      marketValue: employerPaidValue,
      employerPaidValue,
      taxableValueBeforeOffsets: manualTaxableValue,
      employeePaidValue: inputs.employeePaidValue,
      netDeductionValue: inputs.netDeductionValue,
      ledgerAccountCode: "7230",
      outputs: {
        valuationMethod: resolvedMethod,
        manualTaxableValue
      },
      warnings: [],
      explanation: ["Manual taxable value was supplied for health insurance."]
    });
  }

  const insurancePremium = normalizeMoney(inputs.sourcePayload.insurancePremium, "benefit_health_premium_required");
  const taxablePremiumRatio = normalizeRatio(inputs.sourcePayload.taxablePremiumRatio ?? HEALTH_INSURANCE_DEFAULT_RATIO, "benefit_health_ratio_invalid");
  if (taxablePremiumRatio < HEALTH_INSURANCE_DEFAULT_RATIO && inputs.sourcePayload.documentedLowerRatio !== true) {
    throw createError(
      400,
      "benefit_health_lower_ratio_documentation_required",
      "A taxable premium ratio below 60 percent requires documented support."
    );
  }
  return finalizeBenefitAmounts({
    decisionCode: "BENEFIT_HEALTH_INSURANCE_2026",
    marketValue: insurancePremium,
    employerPaidValue: insurancePremium,
    taxableValueBeforeOffsets: roundMoney(insurancePremium * taxablePremiumRatio),
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7230",
    outputs: {
      valuationMethod: resolvedMethod,
      insurancePremium,
      taxablePremiumRatio
    },
    warnings: [],
    explanation: [
      "Health insurance used the taxable premium share for mixed taxable and tax-free coverage.",
      "A documented lower ratio is required if the taxable share is set below the 60 percent default."
    ]
  });
}

function finalizeBenefitAmounts({
  decisionCode,
  marketValue,
  employerPaidValue,
  taxableValueBeforeOffsets,
  employeePaidValue,
  netDeductionValue,
  ledgerAccountCode,
  outputs,
  warnings,
  explanation
}) {
  const totalOffsets = roundMoney(employeePaidValue + netDeductionValue);
  if (totalOffsets > roundMoney(taxableValueBeforeOffsets)) {
    throw createError(400, "benefit_offsets_exceed_taxable_value", "Employee payment and net deduction cannot exceed the taxable value before offsets.");
  }
  const taxableValue = roundMoney(Math.max(0, taxableValueBeforeOffsets - totalOffsets));
  const taxFreeValue = roundMoney(Math.max(0, employerPaidValue - taxableValue));
  return {
    decisionCode,
    marketValue: roundMoney(marketValue),
    employerPaidValue: roundMoney(employerPaidValue),
    taxableValueBeforeOffsets: roundMoney(taxableValueBeforeOffsets),
    taxableValue,
    taxFreeValue,
    ledgerAccountCode,
    outputs: {
      ...copy(outputs || {}),
      marketValue: roundMoney(marketValue),
      employerPaidValue: roundMoney(employerPaidValue),
      taxableValueBeforeOffsets: roundMoney(taxableValueBeforeOffsets),
      employeePaidValue: roundMoney(employeePaidValue),
      netDeductionValue: roundMoney(netDeductionValue),
      taxableValue,
      taxFreeValue
    },
    warnings: copy(warnings || []),
    explanation: copy(explanation || [])
  };
}

function resolveFuelMarketValue(sourcePayload) {
  if (sourcePayload.marketValuePrivateFuel != null) {
    return normalizeMoney(sourcePayload.marketValuePrivateFuel, "benefit_fuel_market_value_invalid");
  }
  const totalFuelMarketValue = normalizeMoney(sourcePayload.totalFuelMarketValue, "benefit_fuel_total_market_value_required");
  const privateKilometers = normalizeMoney(sourcePayload.privateKilometers, "benefit_fuel_private_km_required");
  const totalKilometers = normalizeMoney(sourcePayload.totalKilometers, "benefit_fuel_total_km_required");
  if (totalKilometers <= 0 || privateKilometers < 0 || privateKilometers > totalKilometers) {
    throw createError(400, "benefit_fuel_kilometers_invalid", "Fuel allocation requires valid private and total kilometer values.");
  }
  return roundMoney(totalFuelMarketValue * (privateKilometers / totalKilometers));
}

function resolveTaxability({ taxableValue, employerPaidValue }) {
  if (roundMoney(taxableValue) <= 0) {
    return "tax_free";
  }
  if (roundMoney(taxableValue) < roundMoney(employerPaidValue)) {
    return "partially_taxable";
  }
  return "taxable";
}

function seedCatalog(state, clock, companyId) {
  for (const seed of BENEFIT_CATALOG_SEED) {
    const record = {
      benefitCatalogId: crypto.randomUUID(),
      companyId,
      benefitCode: seed.benefitCode,
      displayName: seed.displayName,
      defaultLedgerAccountCode: seed.defaultLedgerAccountCode,
      defaultAgiMappingCode: "taxable_benefit",
      defaultPayItemCode: "BENEFIT",
      supportedValuationMethods: seed.supportedValuationMethods,
      active: true,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.catalog.set(record.benefitCatalogId, record);
    appendToIndex(state.catalogIdsByCompany, companyId, record.benefitCatalogId);
    setScopedIndex(state.catalogIdsByCode, companyId, record.benefitCode, record.benefitCatalogId);
  }
}

function presentBenefitEvent(state, event) {
  const payrollConsumptions = listChildRecords(state.payrollConsumptionIdsByEvent, state.payrollConsumptions, event.benefitEventId);
  return copy({
    ...event,
    catalogItem: requireCatalogItem(state, event.companyId, event.benefitCode),
    valuation: requireValuationByEvent(state, event.benefitEventId),
    deductions: listChildRecords(state.deductionIdsByEvent, state.deductions, event.benefitEventId),
    documents: listChildRecords(state.documentIdsByEvent, state.documents, event.benefitEventId),
    postingIntents: listChildRecords(state.postingIntentIdsByEvent, state.postingIntents, event.benefitEventId),
    agiMappings: listChildRecords(state.agiMappingIdsByEvent, state.agiMappings, event.benefitEventId),
    payrollConsumptions,
    payrollDispatchStatus: summarizePayrollConsumptions(payrollConsumptions)
  });
}

function summarizePayrollConsumptions(records) {
  const items = Array.isArray(records) ? records : [];
  return {
    totalCount: items.length,
    calculatedCount: items.filter((record) => record.stage === "calculated").length,
    approvedCount: items.filter((record) => record.stage === "approved").length,
    latestStage: items.some((record) => record.stage === "approved") ? "approved" : items.length > 0 ? "calculated" : "not_dispatched",
    payRunIds: Array.from(new Set(items.map((record) => record.payRunId))).sort()
  };
}

function isPayrollDispatchableBenefitEvent(event) {
  const status = normalizeOptionalText(event?.status);
  return status === "approved" || status === "dispatched_to_payroll";
}

function upgradeConsumptionStage(currentStage, nextStage) {
  return currentStage === "approved" || nextStage === "approved" ? "approved" : "calculated";
}

function normalizeProcessingStep(value, code) {
  const resolved = Number(value);
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw createError(400, code, `${code} must be a positive integer.`);
  }
  return resolved;
}

function requireCatalogItem(state, companyId, benefitCode) {
  const companyBucket = state.catalogIdsByCode.get(requireText(companyId, "company_id_required"));
  const benefitCatalogId = companyBucket?.get(normalizeCode(benefitCode, "benefit_code_required")) || null;
  if (!benefitCatalogId) {
    throw createError(404, "benefit_catalog_not_found", "Benefit catalog item was not found.");
  }
  return state.catalog.get(benefitCatalogId);
}

function requireBenefitEvent(state, companyId, benefitEventId) {
  const event = state.events.get(requireText(benefitEventId, "benefit_event_id_required"));
  if (!event || event.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "benefit_event_not_found", "Benefit event was not found.");
  }
  return event;
}

function requireValuationByEvent(state, benefitEventId) {
  const valuationId = state.valuationIdByEvent.get(requireText(benefitEventId, "benefit_event_id_required"));
  if (!valuationId) {
    throw createError(404, "benefit_valuation_not_found", "Benefit valuation was not found.");
  }
  return state.valuations.get(valuationId);
}

function listChildRecords(index, table, key) {
  return (index.get(key) || []).map((id) => table.get(id)).filter(Boolean).map(copy);
}

function assertEmploymentLink({ hrPlatform, companyId, employeeId, employmentId }) {
  if (!hrPlatform?.getEmployment) {
    return;
  }
  const employment = hrPlatform.getEmployment({ companyId, employeeId, employmentId });
  if (!employment || employment.employeeId !== employeeId) {
    throw createError(404, "benefit_employment_not_found", "Employment was not found for the supplied employee.");
  }
}

function overlapReportingPeriod(reportingPeriod, startDate, endDate) {
  const startsOn = startDate || periodFirstDate(reportingPeriod);
  const endsOn = endDate || periodLastDate(reportingPeriod);
  return startsOn <= periodLastDate(reportingPeriod) && endsOn >= periodFirstDate(reportingPeriod);
}

function periodFirstDate(reportingPeriod) {
  const resolved = normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid");
  return `${resolved.slice(0, 4)}-${resolved.slice(4, 6)}-01`;
}

function periodLastDate(reportingPeriod) {
  const [year, month] = periodFirstDate(reportingPeriod).split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function toReportingPeriod(dateValue) {
  const resolved = normalizeRequiredDate(dateValue, "benefit_date_required");
  return `${resolved.slice(0, 4)}${resolved.slice(5, 7)}`;
}

function resolvePrimaryDate({ occurredOn, startDate, endDate, clock }) {
  return occurredOn || startDate || endDate || new Date(clock()).toISOString().slice(0, 10);
}

function normalizeReportingPeriod(value, code) {
  const resolved = requireText(value, code);
  if (!/^\d{6}$/.test(resolved)) {
    throw createError(400, code, "Reporting period must use YYYYMM format.");
  }
  return resolved;
}

function normalizeOptionalReportingPeriod(value) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeReportingPeriod(value, "reporting_period_invalid");
}

function normalizeRequiredDate(value, code) {
  const resolved = normalizeOptionalDate(value, code);
  if (!resolved) {
    throw createError(400, code, "Date is required.");
  }
  return resolved;
}

function normalizeOptionalDate(value, code) {
  if (value == null || value === "") {
    return null;
  }
  const resolved = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createError(400, code, "Date must use YYYY-MM-DD format.");
  }
  return resolved;
}

function normalizeMoney(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createError(400, code, "Amount must be a non-negative number.");
  }
  return roundMoney(numeric);
}

function normalizeInteger(value, code) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw createError(400, code, "Value must be a non-negative integer.");
  }
  return numeric;
}

function normalizeRatio(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createError(400, code, "Ratio must be numeric.");
  }
  if (numeric <= 1) {
    return numeric;
  }
  if (numeric <= 100) {
    return numeric / 100;
  }
  throw createError(400, code, "Ratio must be between 0 and 1 or 0 and 100 percent.");
}

function normalizeDimensions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const normalized = {};
  for (const [key, candidate] of Object.entries(value)) {
    const text = normalizeOptionalText(candidate);
    if (text) {
      normalized[key] = text;
    }
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const resolved = String(value).trim();
  return resolved.length > 0 ? resolved : null;
}

function normalizeCode(value, code) {
  return requireText(String(value || ""), code)
    .replaceAll(/[^A-Za-z0-9_]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
    .toUpperCase();
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function assertAllowed(value, allowedValues, code) {
  const resolved = requireText(String(value || ""), code);
  if (!allowedValues.includes(resolved)) {
    throw createError(400, code, `${resolved} is not allowed.`);
  }
  return resolved;
}

function createCatalogSeed(benefitCode, displayName, defaultLedgerAccountCode, supportedValuationMethods) {
  return Object.freeze({
    benefitCode,
    displayName,
    defaultLedgerAccountCode,
    supportedValuationMethods: Object.freeze([...supportedValuationMethods])
  });
}

function appendToIndex(index, key, value) {
  const items = index.get(key) || [];
  items.push(value);
  index.set(key, items);
}

function setScopedIndex(index, scope, key, value) {
  const bucket = index.get(scope) || new Map();
  bucket.set(key, value);
  index.set(scope, bucket);
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "benefits_action",
      event
    })
  );
}

function buildSnapshotHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function copy(value) {
  return value == null ? value : structuredClone(value);
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
