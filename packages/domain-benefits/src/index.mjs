import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
export const BENEFITS_RULEPACK_CODE = "RP-BENEFITS-SE";
const DEFAULT_RULE_VERSION = "benefits-se-2026.1";
const DEFAULT_BENEFIT_RULESET = Object.freeze({
  ruleYear: 2026,
  priceBaseAmount: 59200,
  carBaseFactor: 0.29,
  carPriceFactor: 0.02785,
  carAdditionalFactor: 0.13,
  carServiceMileageThresholdKm: 30000,
  fuelBenefitMultiplier: 1.2,
  healthInsuranceDefaultRatio: 0.6,
  wellnessTaxFreeLimit: 5000,
  workplaceChargingTaxExemptUntil: "2026-06-30",
  mealValues: Object.freeze({
    BREAKFAST: 62,
    LUNCH_OR_DINNER: 124,
    FULL_DAY: 310
  }),
  giftLimits: Object.freeze({
    CHRISTMAS: 600,
    ANNIVERSARY: 1800,
    MEMORIAL: 15000
  })
});
const BENEFIT_RULE_PACKS = Object.freeze([
  {
    rulePackId: "benefits-se-2026.1",
    rulePackCode: BENEFITS_RULEPACK_CODE,
    domain: "benefits",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: "2026.1",
    checksum: "benefits-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Pins 2026 Swedish benefit valuation tables for car, fuel, meal, wellness, gift and health insurance.",
    machineReadableRules: copy(DEFAULT_BENEFIT_RULESET),
    humanReadableExplanation: [
      "Benefit valuations are effective-dated and carried by rulepack ref instead of hardcoded annual constants.",
      "Car, fuel, meal, wellness, gift and health-insurance defaults all resolve from the published Swedish benefit pack."
    ],
    testVectors: [
      { vectorId: "benefits-car-2026" },
      { vectorId: "benefits-meal-2026" },
      { vectorId: "benefits-wellness-2026" },
      { vectorId: "benefits-gift-2026" }
    ],
    migrationNotes: ["Historical benefit events must pin the resolved rulepack id on every valuation and downstream payroll handoff."]
  }
]);
const CAR_SERVICE_REDUCTION_FACTOR = 0.75;
const CAR_PRIVATE_USE_LIMIT_OCCURRENCES = 10;
const CAR_PRIVATE_USE_LIMIT_KM = 100;
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
const LEGACY_BENEFIT_METHOD_ALIASES = Object.freeze({
  car_formula_2026: "car_formula",
  fuel_formula_2026: "fuel_formula",
  health_insurance_2026: "health_insurance_policy",
  meal_table_2026: "meal_table",
  gift_threshold_2026: "gift_threshold",
  wellness_policy_2026: "wellness_policy"
});

export const BENEFIT_CODES = Object.freeze([
  "CAR_BENEFIT",
  "FUEL_BENEFIT",
  "WELLNESS_ALLOWANCE",
  "GIFT",
  "MEAL_BENEFIT",
  "HEALTH_INSURANCE"
]);

const BENEFIT_CATALOG_SEED = Object.freeze([
  createCatalogSeed("CAR_BENEFIT", "Bilforman", "7210", ["car_formula", "manual_taxable_value"]),
  createCatalogSeed("FUEL_BENEFIT", "Drivmedelsforman", "7220", ["fuel_formula", "manual_taxable_value"]),
  createCatalogSeed("HEALTH_INSURANCE", "Sjukvardsforsakring", "7230", ["health_insurance_policy", "manual_taxable_value"]),
  createCatalogSeed("MEAL_BENEFIT", "Kostforman", "7240", ["meal_table", "manual_taxable_value"]),
  createCatalogSeed("GIFT", "Gava", "7260", ["gift_threshold", "manual_taxable_value"]),
  createCatalogSeed("WELLNESS_ALLOWANCE", "Friskvardsbidrag", "7270", ["wellness_policy", "manual_taxable_value"])
]);

export function createBenefitsPlatform(options = {}) {
  return createBenefitsEngine(options);
}

export function createBenefitsEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  ruleRegistry = null,
  hrPlatform = null,
  documentPlatform = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({ clock, seedRulePacks: BENEFIT_RULE_PACKS });
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

  const engine = {
    benefitCodes: BENEFIT_CODES,
    listBenefitRulePacks,
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

  Object.defineProperty(engine, "rulePackGovernance", {
    value: Object.freeze({
      listRulePacks: (filters = {}) => rules.listRulePacks({ domain: "benefits", jurisdiction: "SE", ...filters }),
      getRulePack: (filters) => rules.getRulePack(filters),
      createDraftRulePackVersion: (input) => rules.createDraftRulePackVersion(input),
      validateRulePackVersion: (input) => rules.validateRulePackVersion(input),
      approveRulePackVersion: (input) => rules.approveRulePackVersion(input),
      publishRulePackVersion: (input) => rules.publishRulePackVersion(input),
      rollbackRulePackVersion: (input) => rules.rollbackRulePackVersion(input),
      listRulePackRollbacks: (filters = {}) => rules.listRulePackRollbacks({ domain: "benefits", jurisdiction: "SE", ...filters })
    }),
    enumerable: false
  });

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function listBenefitRulePacks(filters = {}) {
    return rules.listRulePacks({ domain: "benefits", jurisdiction: "SE", ...filters });
  }

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
      netDeductionValue: normalizeMoney(netDeductionValue, "benefit_net_deduction_invalid"),
      rules
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
      warnings: [...new Set(events.flatMap((event) => event.valuation.decision.warnings).filter(Boolean))]
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

function valueBenefitEvent({ catalogItem, eventDraft, sourcePayload, employeePaidValue, netDeductionValue, rules }) {
  const resolvedMethod = resolveBenefitValuationMethod({
    benefitCode: eventDraft.benefitCode,
    requestedMethod: sourcePayload.valuationMethod,
    supportedMethods: catalogItem.supportedValuationMethods
  });
  const evaluator = BENEFIT_EVALUATORS[eventDraft.benefitCode];
  if (!evaluator) {
    throw createError(400, "benefit_code_unsupported", `Benefit code ${eventDraft.benefitCode} is not implemented.`);
  }
  const rulePack = resolveBenefitRulePack(rules, eventDraft.occurredOn);
  const benefitRules = requireBenefitRules(rulePack);
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
    resolvedMethod,
    rulePack,
    benefitRules
  });
  const ruleVersion = rulePack.version || DEFAULT_RULE_VERSION;
  const reviewCodes = buildBenefitReviewCodes({
    benefitCode: eventDraft.benefitCode,
    warnings: evaluated.warnings,
    employeePaidValue,
    netDeductionValue
  });
  const decision = {
    decisionCode: evaluated.decisionCode,
    inputsHash: buildSnapshotHash({
      benefitCode: eventDraft.benefitCode,
      reportingPeriod: eventDraft.reportingPeriod,
      inputs: normalizedInputs,
      outputs: evaluated.outputs
    }),
    rulePackId: rulePack.rulePackId,
    rulePackCode: rulePack.rulePackCode,
    ruleVersion,
    selectionMode: rulePack.selectionMode || "effective_date",
    effectiveDate: eventDraft.occurredOn,
    outputs: copy(evaluated.outputs),
    warnings: copy(evaluated.warnings),
    reviewCodes: copy(reviewCodes),
    explanation: copy(evaluated.explanation)
  };
  const offsetBreakdown = buildBenefitOffsetBreakdown({
    employeePaidValue,
    netDeductionValue,
    taxableValueBeforeOffsets: evaluated.taxableValueBeforeOffsets,
    taxableValue: evaluated.taxableValue
  });

  return {
    benefitValuationId: crypto.randomUUID(),
    benefitEventId: eventDraft.benefitEventId,
    companyId: eventDraft.companyId,
    benefitCode: eventDraft.benefitCode,
    reportingPeriod: eventDraft.reportingPeriod,
    taxYear: eventDraft.taxYear,
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    ruleVersion,
    valuationMethod: resolvedMethod,
    employerPaidValue: roundMoney(evaluated.employerPaidValue),
    marketValue: roundMoney(evaluated.marketValue),
    taxableValueBeforeOffsets: roundMoney(evaluated.taxableValueBeforeOffsets),
    taxableValue: roundMoney(evaluated.taxableValue),
    taxFreeValue: roundMoney(evaluated.taxFreeValue),
    employeePaidValue: roundMoney(employeePaidValue),
    netDeductionValue: roundMoney(netDeductionValue),
    offsetBreakdown,
    agiMappingCode: evaluated.taxableValue > 0 ? catalogItem.defaultAgiMappingCode : "not_reported",
    ledgerAccountCode: evaluated.ledgerAccountCode || catalogItem.defaultLedgerAccountCode,
    taxability: resolveTaxability({
      taxableValue: evaluated.taxableValue,
      employerPaidValue: evaluated.employerPaidValue
    }),
    reviewCodes: copy(reviewCodes),
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

function resolveBenefitValuationMethod({ benefitCode, requestedMethod, supportedMethods }) {
  const normalizedRequestedMethod = LEGACY_BENEFIT_METHOD_ALIASES[normalizeOptionalText(requestedMethod)] || normalizeOptionalText(requestedMethod);
  if (!normalizedRequestedMethod) {
    if (Array.isArray(supportedMethods) && supportedMethods.length > 0) {
      return supportedMethods[0];
    }
    throw createError(400, "benefit_valuation_method_missing", `No valuation method is configured for ${benefitCode}.`);
  }
  const allowedMethods = Array.isArray(supportedMethods) ? supportedMethods : [];
  if (!allowedMethods.includes(normalizedRequestedMethod)) {
    throw createError(400, "benefit_valuation_method_invalid", `Valuation method ${normalizedRequestedMethod} is not allowed for ${benefitCode}.`);
  }
  return normalizedRequestedMethod;
}

function resolveBenefitRulePack(rules, effectiveDate) {
  const resolvedDate = normalizeRequiredDate(effectiveDate, "benefit_rulepack_effective_date_required");
  const rulePack = rules?.resolveRulePack({
    rulePackCode: BENEFITS_RULEPACK_CODE,
    domain: "benefits",
    jurisdiction: "SE",
    effectiveDate: resolvedDate
  });
  if (!rulePack) {
    throw createError(409, "benefit_rulepack_missing", `No published benefit rulepack is available for ${resolvedDate}.`);
  }
  return rulePack;
}

function requireBenefitRules(rulePack) {
  const rules = rulePack?.machineReadableRules;
  if (!rules || typeof rules !== "object") {
    throw createError(500, "benefit_rulepack_invalid", "Benefit rulepack is missing machine-readable rules.");
  }
  return rules;
}

function resolveBenefitRuleYear(rulePack) {
  const explicitYear = Number(rulePack?.machineReadableRules?.ruleYear);
  if (Number.isInteger(explicitYear) && explicitYear >= 2000) {
    return explicitYear;
  }
  const effectiveFrom = normalizeOptionalDate(rulePack?.effectiveFrom, "benefit_rulepack_effective_from_invalid");
  if (effectiveFrom) {
    return Number(effectiveFrom.slice(0, 4));
  }
  return Number(new Date().getUTCFullYear());
}

function evaluateCarBenefit({ inputs, resolvedMethod, rulePack, benefitRules }) {
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
  const ruleYear = resolveBenefitRuleYear(rulePack);
  let annualValue = roundMoney(
    benefitRules.priceBaseAmount * benefitRules.carBaseFactor +
      basePrice * benefitRules.carPriceFactor +
      basePrice * benefitRules.carAdditionalFactor +
      vehicleTaxAnnual
  );
  const serviceMileageKm = normalizeMoney(inputs.sourcePayload.serviceMileageKm ?? 0, "benefit_car_service_mileage_invalid");
  const applyServiceMileageReduction = inputs.sourcePayload.applyServiceMileageReduction === true;
  const warnings = [];
  if (applyServiceMileageReduction) {
    if (serviceMileageKm < benefitRules.carServiceMileageThresholdKm) {
      throw createError(
        400,
        "benefit_car_service_mileage_threshold_not_met",
        `Service mileage reduction requires at least ${benefitRules.carServiceMileageThresholdKm} km in service for the year.`
      );
    }
    annualValue = roundMoney(annualValue * CAR_SERVICE_REDUCTION_FACTOR);
  }
  if (!hasMileageLog && privateUseOccurrences > 0) {
    warnings.push("benefit_car_missing_mileage_log");
  }
  const monthlyValue = roundMoney(annualValue / 12);
  return finalizeBenefitAmounts({
    decisionCode: `BENEFIT_CAR_FORMULA_${ruleYear}`,
    marketValue: monthlyValue,
    employerPaidValue: monthlyValue,
    taxableValueBeforeOffsets: monthlyValue,
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7210",
    outputs: {
      valuationMethod: resolvedMethod,
      rulePackId: rulePack.rulePackId,
      rulePackCode: rulePack.rulePackCode,
      ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
      ruleYear,
      priceBaseAmount: benefitRules.priceBaseAmount,
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
      `Annual value uses published ${ruleYear} factors with ${benefitRules.carBaseFactor} x PBB, ${benefitRules.carPriceFactor * 100}% of price base and ${benefitRules.carAdditionalFactor * 100}% of price base plus annual vehicle tax.`,
      applyServiceMileageReduction
        ? "Service mileage reduction was applied after the documented threshold was met."
        : "Service mileage reduction was not applied."
    ]
  });
}

function evaluateFuelBenefit({ inputs, resolvedMethod, rulePack, benefitRules }) {
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
  const ruleYear = resolveBenefitRuleYear(rulePack);
  if (
    fuelType === "electricity" &&
    workplaceChargingTaxExempt === true &&
    (!benefitRules.workplaceChargingTaxExemptUntil || inputs.occurredOn <= benefitRules.workplaceChargingTaxExemptUntil)
  ) {
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
        workplaceChargingTaxExempt,
        rulePackId: rulePack.rulePackId,
        rulePackCode: rulePack.rulePackCode,
        ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
        workplaceChargingTaxExemptUntil: benefitRules.workplaceChargingTaxExemptUntil || null
      },
      warnings: [],
      explanation: [
        `Workplace charging remained tax free within the temporary exemption window ending ${benefitRules.workplaceChargingTaxExemptUntil}.`
      ]
    });
  }

  const vehicleContext = normalizeOptionalText(inputs.sourcePayload.vehicleContext) || "benefit_car";
  const marketValuePrivateFuel = resolveFuelMarketValue(inputs.sourcePayload);
  const multiplier = vehicleContext === "private_car" ? 1 : benefitRules.fuelBenefitMultiplier;
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
      multiplier,
      rulePackId: rulePack.rulePackId,
      rulePackCode: rulePack.rulePackCode,
      ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
      ruleYear
    },
    warnings: [],
    explanation: [
      vehicleContext === "private_car"
        ? "Employer-paid fuel for a private car is valued at market value."
        : `Employer-paid private fuel for a benefit car is valued at market value times ${benefitRules.fuelBenefitMultiplier}.`,
      "Private and service use must be supportable through mileage documentation when total fuel costs are allocated."
    ]
  });
}

function evaluateMealBenefit({ inputs, resolvedMethod, rulePack, benefitRules }) {
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

  const mealCode = assertAllowed(
    normalizeCode(inputs.sourcePayload.mealCode || "LUNCH_OR_DINNER", "benefit_meal_code_required"),
    Object.keys(benefitRules.mealValues || {}),
    "benefit_meal_code_invalid"
  );
  const quantity = Math.max(1, normalizeInteger(inputs.sourcePayload.quantity ?? 1, "benefit_meal_quantity_invalid"));
  const taxExemptContextCode = normalizeOptionalText(inputs.sourcePayload.taxExemptContextCode);
  const ruleYear = resolveBenefitRuleYear(rulePack);
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
        taxExemptContextCode,
        rulePackId: rulePack.rulePackId,
        rulePackCode: rulePack.rulePackCode,
        ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
        ruleYear
      },
      warnings: [],
      explanation: ["Meal context matched a tax-free situation under the configured rule set."]
    });
  }
  const dailyRate = normalizeMoney(benefitRules.mealValues?.[mealCode], "benefit_meal_rate_missing");
  const marketValue = roundMoney(dailyRate * quantity);
  return finalizeBenefitAmounts({
    decisionCode: `BENEFIT_MEAL_TABLE_${ruleYear}`,
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
      dailyRate,
      rulePackId: rulePack.rulePackId,
      rulePackCode: rulePack.rulePackCode,
      ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
      ruleYear
    },
    warnings: [],
    explanation: [`Meal benefit used the published ${ruleYear} benefit table and allowed employee offsets to reduce the taxable value.`]
  });
}

function evaluateWellnessAllowance({ inputs, resolvedMethod, rulePack, benefitRules }) {
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
  const ruleYear = resolveBenefitRuleYear(rulePack);
  if (totalForYear > benefitRules.wellnessTaxFreeLimit && calendarYearGrantedBeforeEvent > 0) {
    warnings.push("benefit_wellness_prior_events_may_need_reassessment");
  }
  const taxFreeEligible =
    equalTermsOffered &&
    !providedAsGiftCard &&
    !carryOverFromPriorYear &&
    hasRequiredReceiptFacts &&
    totalForYear <= benefitRules.wellnessTaxFreeLimit;
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
      hasRequiredReceiptFacts,
      taxFreeLimit: benefitRules.wellnessTaxFreeLimit,
      rulePackId: rulePack.rulePackId,
      rulePackCode: rulePack.rulePackCode,
      ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
      ruleYear
    },
    warnings,
    explanation: [
      taxFreeEligible
        ? "Wellness reimbursement stayed within the tax-free annual limit and met the policy conditions."
        : `Wellness reimbursement became taxable because one or more tax-free conditions failed or the annual limit of ${benefitRules.wellnessTaxFreeLimit} SEK was exceeded.`
    ]
  });
}

function evaluateGift({ inputs, resolvedMethod, rulePack, benefitRules }) {
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
  const ruleYear = resolveBenefitRuleYear(rulePack);
  const qualifiesMemorialGift =
    giftType === "MEMORIAL" &&
    (employmentYears >= 20 || employmentEnding || (employeeAge >= 50 && roundBirthday === true));
  const threshold = benefitRules.giftLimits?.[giftType] ?? 0;
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
      qualifiesMemorialGift,
      rulePackId: rulePack.rulePackId,
      rulePackCode: rulePack.rulePackCode,
      ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
      ruleYear
    },
    warnings: [],
    explanation: [
      taxFreeEligible
        ? "Gift stayed within the tax-free threshold for the qualifying occasion."
        : "Gift became taxable from the first krona because the occasion or threshold conditions were not met."
    ]
  });
}

function evaluateHealthInsurance({ inputs, resolvedMethod, rulePack, benefitRules }) {
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
  const taxablePremiumRatio = normalizeRatio(inputs.sourcePayload.taxablePremiumRatio ?? benefitRules.healthInsuranceDefaultRatio, "benefit_health_ratio_invalid");
  const ruleYear = resolveBenefitRuleYear(rulePack);
  if (taxablePremiumRatio < benefitRules.healthInsuranceDefaultRatio && inputs.sourcePayload.documentedLowerRatio !== true) {
    throw createError(
      400,
      "benefit_health_lower_ratio_documentation_required",
      `A taxable premium ratio below ${Math.round(benefitRules.healthInsuranceDefaultRatio * 100)} percent requires documented support.`
    );
  }
  return finalizeBenefitAmounts({
    decisionCode: `BENEFIT_HEALTH_INSURANCE_${ruleYear}`,
    marketValue: insurancePremium,
    employerPaidValue: insurancePremium,
    taxableValueBeforeOffsets: roundMoney(insurancePremium * taxablePremiumRatio),
    employeePaidValue: inputs.employeePaidValue,
    netDeductionValue: inputs.netDeductionValue,
    ledgerAccountCode: "7230",
    outputs: {
      valuationMethod: resolvedMethod,
      insurancePremium,
      taxablePremiumRatio,
      defaultTaxablePremiumRatio: benefitRules.healthInsuranceDefaultRatio,
      rulePackId: rulePack.rulePackId,
      rulePackCode: rulePack.rulePackCode,
      ruleVersion: rulePack.version || DEFAULT_RULE_VERSION,
      ruleYear
    },
    warnings: [],
    explanation: [
      "Health insurance used the taxable premium share for mixed taxable and tax-free coverage.",
      `A documented lower ratio is required if the taxable share is set below the ${Math.round(benefitRules.healthInsuranceDefaultRatio * 100)} percent default.`
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

function buildBenefitOffsetBreakdown({ employeePaidValue = 0, netDeductionValue = 0, taxableValueBeforeOffsets = 0, taxableValue = 0 }) {
  return {
    employeePaidValue: roundMoney(employeePaidValue),
    netDeductionValue: roundMoney(netDeductionValue),
    totalOffsetValue: roundMoney(Number(employeePaidValue || 0) + Number(netDeductionValue || 0)),
    taxableValueBeforeOffsets: roundMoney(taxableValueBeforeOffsets),
    remainingTaxableValue: roundMoney(taxableValue),
    mixedOffsetMethods: roundMoney(employeePaidValue) > 0 && roundMoney(netDeductionValue) > 0
  };
}

function buildBenefitReviewCodes({ benefitCode, warnings = [], employeePaidValue = 0, netDeductionValue = 0 }) {
  const reviewCodes = new Set();
  for (const warning of warnings || []) {
    switch (warning) {
      case "benefit_car_missing_mileage_log":
        reviewCodes.add("benefit_car_mileage_log_review");
        break;
      case "benefit_wellness_prior_events_may_need_reassessment":
        reviewCodes.add("benefit_wellness_reassessment_review");
        break;
      default:
        reviewCodes.add(`benefit_warning_${warning}`);
        break;
    }
  }
  if (roundMoney(employeePaidValue) > 0 && roundMoney(netDeductionValue) > 0) {
    reviewCodes.add("benefit_mixed_offset_review");
  }
  if (benefitCode === "FUEL_BENEFIT" && roundMoney(netDeductionValue) > 0) {
    reviewCodes.add("benefit_net_deduction_offset_review");
  }
  return [...reviewCodes].sort();
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


function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
