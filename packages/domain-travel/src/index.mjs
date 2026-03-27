import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { COUNTRY_NAME_BY_CODE, FOREIGN_NORMAL_AMOUNTS_2026 } from "./normal-amounts-2026.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_RULE_VERSION = "travel-se-2026.1";

const DOMESTIC_FULL_DAY_2026 = 300;
const DOMESTIC_HALF_DAY_2026 = 150;
const DOMESTIC_LONG_TRIP_THREE_MONTHS_FULL_DAY_2026 = 210;
const DOMESTIC_LONG_TRIP_TWO_YEARS_FULL_DAY_2026 = 150;
const DOMESTIC_NIGHT_ALLOWANCE_2026 = 150;
const DOMESTIC_DISTANCE_THRESHOLD_KM = 50;
const TRAVEL_PREAPPROVAL_THRESHOLD_SEK = 5000;

const TRAVEL_APPROVAL_STATUSES = Object.freeze(["submitted", "approved", "rejected"]);
const MILEAGE_VEHICLE_TYPES = Object.freeze(["OWN_CAR", "BENEFIT_CAR", "BENEFIT_CAR_ELECTRIC"]);
const EXPENSE_PAYMENT_METHODS = Object.freeze(["private_card", "company_card", "cash"]);

const DOMESTIC_MEAL_REDUCTION_TABLE_2026 = Object.freeze({
  300: Object.freeze({ breakfast: 60, lunchOrDinner: 105, lunchAndDinner: 210, fullDay: 270 }),
  210: Object.freeze({ breakfast: 42, lunchOrDinner: 74, lunchAndDinner: 147, fullDay: 189 }),
  150: Object.freeze({ breakfast: 30, lunchOrDinner: 53, lunchAndDinner: 105, fullDay: 135 }),
  90: Object.freeze({ breakfast: 18, lunchOrDinner: 32, lunchAndDinner: 63, fullDay: 81 })
});

const FOREIGN_MEAL_REDUCTION_RATES = Object.freeze({
  breakfast: 0.15,
  lunchOrDinner: 0.35,
  lunchAndDinner: 0.7,
  fullDay: 0.85
});

const MILEAGE_RATES_PER_KM_2026 = Object.freeze({
  OWN_CAR: 2.5,
  BENEFIT_CAR: 1.2,
  BENEFIT_CAR_ELECTRIC: 0.95
});
const PAYROLL_CONSUMPTION_STAGES = Object.freeze(["calculated", "approved"]);

const NORDIC_COUNTRIES = new Set(["Sverige", "Danmark", "Finland", "Island", "Norge"]);
const COUNTRY_ALIAS_OVERRIDES = Object.freeze({
  sverige: "Sverige",
  sweden: "Sverige",
  denmark: "Danmark",
  danmark: "Danmark",
  finland: "Finland",
  france: "Frankrike",
  frankrike: "Frankrike",
  germany: "Tyskland",
  tyskland: "Tyskland",
  norway: "Norge",
  norge: "Norge",
  austria: "Osterrike",
  osterrike: "Osterrike",
  netherlands: "Nederlanderna",
  nederlanderna: "Nederlanderna",
  reunion: "Reunion",
  "ovriga lander och omraden": "Ovriga lander och omraden",
  "other countries and areas": "Ovriga lander och omraden"
});

export function createTravelPlatform(options = {}) {
  return createTravelEngine(options);
}

export function createTravelEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  hrPlatform = null,
  documentPlatform = null
} = {}) {
  const state = {
    foreignAllowanceTables: new Map(),
    foreignAllowanceIdsByTaxYear: new Map(),
    claims: new Map(),
    claimIdsByCompany: new Map(),
    claimIdsByEmployment: new Map(),
    claimIdBySourceKey: new Map(),
    claimDays: new Map(),
    claimDayIdsByClaim: new Map(),
    mealEvents: new Map(),
    mealEventIdsByClaim: new Map(),
    countrySegments: new Map(),
    countrySegmentIdsByClaim: new Map(),
    mileageLogs: new Map(),
    mileageLogIdsByClaim: new Map(),
    expenseReceipts: new Map(),
    expenseReceiptIdsByClaim: new Map(),
    travelAdvances: new Map(),
    travelAdvanceIdsByClaim: new Map(),
    valuations: new Map(),
    valuationIdByClaim: new Map(),
    postingIntents: new Map(),
    postingIntentIdsByClaim: new Map(),
    payrollConsumptions: new Map(),
    payrollConsumptionIdsByClaim: new Map(),
    payrollConsumptionIdByKey: new Map(),
    auditEvents: []
  };

  seedForeignAllowances(state, { taxYear: "2026", allowances: FOREIGN_NORMAL_AMOUNTS_2026, clock });
  if (seedDemo) {
    seedTravelDemo(state, { clock, companyId: DEMO_COMPANY_ID });
  }

  return {
    travelApprovalStatuses: TRAVEL_APPROVAL_STATUSES,
    mileageVehicleTypes: MILEAGE_VEHICLE_TYPES,
    expensePaymentMethods: EXPENSE_PAYMENT_METHODS,
    listForeignNormalAmounts,
    getForeignNormalAmount,
    listTravelClaims,
    getTravelClaim,
    createTravelClaim,
    listTravelAuditEvents,
    listPayrollTravelPayloads,
    registerTravelPayrollConsumption
  };

  function listForeignNormalAmounts({ taxYear = "2026" } = {}) {
    const resolvedTaxYear = normalizeTaxYear(taxYear);
    return (state.foreignAllowanceIdsByTaxYear.get(resolvedTaxYear) || [])
      .map((allowanceId) => state.foreignAllowanceTables.get(allowanceId))
      .filter(Boolean)
      .sort((left, right) => left.countryName.localeCompare(right.countryName))
      .map(copy);
  }

  function getForeignNormalAmount({ taxYear = "2026", countryCode = null, countryName = null } = {}) {
    const resolvedTaxYear = normalizeTaxYear(taxYear);
    const resolvedCountryName = requireCountryName(countryCode || countryName, "travel_country_required");
    const allowance = lookupForeignNormalAmount(state, resolvedTaxYear, resolvedCountryName);
    if (!allowance) {
      throw createError(404, "travel_country_allowance_not_found", `Foreign normal amount was not found for ${resolvedCountryName}.`);
    }
    return copy(allowance);
  }

  function listTravelClaims({ companyId, reportingPeriod = null, employeeId = null, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod, "travel_reporting_period_invalid") : null;
    return (state.claimIdsByCompany.get(resolvedCompanyId) || [])
      .map((travelClaimId) => state.claims.get(travelClaimId))
      .filter(Boolean)
      .filter((claim) => (resolvedReportingPeriod ? claim.reportingPeriod === resolvedReportingPeriod : true))
      .filter((claim) => (employeeId ? claim.employeeId === employeeId : true))
      .filter((claim) => (employmentId ? claim.employmentId === employmentId : true))
      .sort((left, right) => left.startAt.localeCompare(right.startAt) || left.createdAt.localeCompare(right.createdAt))
      .map((claim) => presentTravelClaim(state, claim));
  }

  function getTravelClaim({ companyId, travelClaimId } = {}) {
    return presentTravelClaim(state, requireTravelClaim(state, companyId, travelClaimId));
  }

  function createTravelClaim({
    companyId,
    employeeId,
    employmentId,
    purpose,
    startAt,
    endAt,
    reportingPeriod = null,
    homeLocation = null,
    regularWorkLocation = null,
    firstDestination = null,
    distanceFromHomeKm = 0,
    distanceFromRegularWorkKm = 0,
    countryCode = null,
    countryName = null,
    countrySegments = [],
    mealEvents = [],
    mileageLogs = [],
    expenseReceipts = [],
    travelAdvances = [],
    requestedAllowanceAmount = null,
    sameLocationDaysBeforeStart = 0,
    sameLocationKey = null,
    lodgingPaidByEmployer = false,
    preApproved = false,
    approvalStatus = "approved",
    sourceType = "manual_entry",
    sourceId = null,
    dimensionJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    requireEmploymentLink({ hrPlatform, companyId: resolvedCompanyId, employeeId: resolvedEmployeeId, employmentId: resolvedEmploymentId });

    const resolvedStartAt = normalizeRequiredDateTime(startAt, "travel_start_at_required");
    const resolvedEndAt = normalizeRequiredDateTime(endAt, "travel_end_at_required");
    if (toTimestamp(resolvedEndAt) <= toTimestamp(resolvedStartAt)) {
      throw createError(400, "travel_date_range_invalid", "Travel end time must be later than the start time.");
    }

    const resolvedReportingPeriod =
      normalizeOptionalReportingPeriod(reportingPeriod) || toReportingPeriod(resolvedStartAt.slice(0, 10));
    const resolvedSourceType = normalizeOptionalText(sourceType) || "manual_entry";
    const resolvedSourceId = normalizeOptionalText(sourceId);
    const dedupeKey = resolvedSourceId ? `${resolvedCompanyId}:${resolvedEmploymentId}:${resolvedSourceType}:${resolvedSourceId}` : null;
    if (dedupeKey && state.claimIdBySourceKey.has(dedupeKey)) {
      return presentTravelClaim(state, state.claims.get(state.claimIdBySourceKey.get(dedupeKey)));
    }

    const claim = {
      travelClaimId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      reportingPeriod: resolvedReportingPeriod,
      purpose: requireText(purpose, "travel_purpose_required"),
      startAt: resolvedStartAt,
      endAt: resolvedEndAt,
      homeLocation: normalizeOptionalText(homeLocation),
      regularWorkLocation: normalizeOptionalText(regularWorkLocation),
      firstDestination: normalizeOptionalText(firstDestination),
      distanceFromHomeKm: normalizeMoney(distanceFromHomeKm, "travel_distance_home_invalid"),
      distanceFromRegularWorkKm: normalizeMoney(distanceFromRegularWorkKm, "travel_distance_regular_invalid"),
      requestedAllowanceAmount: normalizeOptionalMoney(requestedAllowanceAmount, "travel_requested_allowance_invalid"),
      sameLocationDaysBeforeStart: normalizeIntegerInRange(sameLocationDaysBeforeStart, 0, 5000, "travel_same_location_days_invalid"),
      lodgingPaidByEmployer: lodgingPaidByEmployer === true,
      preApproved: preApproved === true,
      approvalStatus: assertAllowed(approvalStatus, TRAVEL_APPROVAL_STATUSES, "travel_approval_status_invalid"),
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      dimensionJson: normalizeDimensions(dimensionJson),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    const resolvedSegments = normalizeCountrySegments({
      startAt: resolvedStartAt,
      endAt: resolvedEndAt,
      countrySegments,
      countryCode,
      countryName,
      firstDestination,
      sameLocationKey
    });
    const normalizedMealEvents = normalizeMealEvents({ mealEvents, startAt: resolvedStartAt, endAt: resolvedEndAt });
    const normalizedMileageLogs = normalizeMileageLogs({ mileageLogs, startAt: resolvedStartAt, endAt: resolvedEndAt });
    const normalizedExpenseReceipts = normalizeExpenseReceipts({ expenseReceipts, startAt: resolvedStartAt, endAt: resolvedEndAt });
    const normalizedAdvances = normalizeTravelAdvances({ travelAdvances });

    const valuation = valueTravelClaim({
      state,
      clock,
      claim,
      countrySegments: resolvedSegments,
      mealEvents: normalizedMealEvents,
      mileageLogs: normalizedMileageLogs,
      expenseReceipts: normalizedExpenseReceipts,
      travelAdvances: normalizedAdvances
    });

    storeTravelClaim({
      state,
      claim,
      valuation,
      countrySegments: resolvedSegments,
      mealEvents: normalizedMealEvents,
      mileageLogs: normalizedMileageLogs,
      expenseReceipts: normalizedExpenseReceipts,
      travelAdvances: normalizedAdvances,
      documentPlatform,
      correlationId,
      clock
    });

    if (dedupeKey) {
      state.claimIdBySourceKey.set(dedupeKey, claim.travelClaimId);
    }

    pushAudit(state, clock, {
      companyId: claim.companyId,
      actorId: claim.createdByActorId,
      correlationId,
      action: "travel.claim.created",
      entityType: "travel_claim",
      entityId: claim.travelClaimId,
      explanation: `Created travel claim for reporting period ${claim.reportingPeriod}.`
    });
    return presentTravelClaim(state, claim);
  }

  function listTravelAuditEvents({ companyId, travelClaimId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (travelClaimId ? event.entityId === travelClaimId : true))
      .map(copy);
  }

  function listPayrollTravelPayloads({ companyId, employmentId, reportingPeriod } = {}) {
    const claims = listTravelClaims({
      companyId,
      employmentId,
      reportingPeriod
    }).filter((claim) => claim.approvalStatus === "approved");

    return {
      claims,
      payLinePayloads: claims.flatMap((claim) => claim.postingIntents.map((intent) => copy(intent.payrollLinePayloadJson)).filter(Boolean)),
      warnings: claims.flatMap((claim) => claim.valuation.warnings || [])
    };
  }

  function registerTravelPayrollConsumption({
    companyId,
    travelClaimId,
    payRunId,
    payRunLineId,
    payItemCode,
    processingStep,
    sourceType = "travel_claim",
    amount,
    sourceSnapshotHash = null,
    stage = "calculated",
    actorId = "system"
  } = {}) {
    const claim = requireTravelClaim(state, companyId, travelClaimId);
    const resolvedStage = assertAllowed(stage, PAYROLL_CONSUMPTION_STAGES, "travel_payroll_consumption_stage_invalid");
    const resolvedPayRunId = requireText(payRunId, "travel_payroll_consumption_pay_run_id_required");
    const resolvedPayRunLineId = requireText(payRunLineId, "travel_payroll_consumption_pay_run_line_id_required");
    const resolvedPayItemCode = requireText(payItemCode, "travel_payroll_consumption_pay_item_code_required");
    const resolvedProcessingStep = normalizeProcessingStep(processingStep, "travel_payroll_consumption_processing_step_invalid");
    const resolvedAmount = normalizeMoney(amount, "travel_payroll_consumption_amount_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const now = nowIso(clock);
    const existingId = state.payrollConsumptionIdByKey.get(resolvedPayRunLineId);
    const existing = existingId ? state.payrollConsumptions.get(existingId) : null;
    if (existing) {
      existing.stage = upgradeConsumptionStage(existing.stage, resolvedStage);
      existing.amount = resolvedAmount;
      existing.sourceType = requireText(sourceType, "travel_payroll_consumption_source_type_required");
      existing.sourceSnapshotHash = normalizeOptionalText(sourceSnapshotHash);
      existing.updatedAt = now;
      if (existing.stage === "approved" && !existing.approvedAt) {
        existing.approvedAt = now;
        existing.approvedByActorId = resolvedActorId;
      }
      state.payrollConsumptions.set(existing.travelPayrollConsumptionId, existing);
      return copy(existing);
    }

    const record = {
      travelPayrollConsumptionId: crypto.randomUUID(),
      travelClaimId: claim.travelClaimId,
      companyId: claim.companyId,
      employeeId: claim.employeeId,
      employmentId: claim.employmentId,
      payRunId: resolvedPayRunId,
      payRunLineId: resolvedPayRunLineId,
      payItemCode: resolvedPayItemCode,
      processingStep: resolvedProcessingStep,
      sourceType: requireText(sourceType, "travel_payroll_consumption_source_type_required"),
      amount: resolvedAmount,
      sourceSnapshotHash: normalizeOptionalText(sourceSnapshotHash),
      stage: resolvedStage,
      calculatedAt: now,
      calculatedByActorId: resolvedActorId,
      approvedAt: resolvedStage === "approved" ? now : null,
      approvedByActorId: resolvedStage === "approved" ? resolvedActorId : null,
      updatedAt: now
    };
    state.payrollConsumptions.set(record.travelPayrollConsumptionId, record);
    appendToIndex(state.payrollConsumptionIdsByClaim, claim.travelClaimId, record.travelPayrollConsumptionId);
    state.payrollConsumptionIdByKey.set(resolvedPayRunLineId, record.travelPayrollConsumptionId);
    pushAudit(state, clock, {
      companyId: claim.companyId,
      actorId: resolvedActorId,
      correlationId: resolvedPayRunId,
      action: resolvedStage === "approved" ? "travel.payroll.consumption.approved" : "travel.payroll.consumption.registered",
      entityType: "travel_claim",
      entityId: claim.travelClaimId,
      explanation: `Registered payroll consumption for pay item ${resolvedPayItemCode} in pay run ${resolvedPayRunId}.`
    });
    return copy(record);
  }
}

function valueTravelClaim({ state, claim, countrySegments, mealEvents, mileageLogs, expenseReceipts, travelAdvances }) {
  const travelType = countrySegments.every((segment) => segment.countryName === "Sverige") ? "domestic" : "foreign";
  const dateKeys = buildDateKeys(claim.startAt.slice(0, 10), claim.endAt.slice(0, 10));
  const hasOvernight = dateKeys.length > 1;
  const distanceRuleMet =
    Number(claim.distanceFromHomeKm || 0) > DOMESTIC_DISTANCE_THRESHOLD_KM &&
    Number(claim.distanceFromRegularWorkKm || 0) > DOMESTIC_DISTANCE_THRESHOLD_KM;
  const statutoryTaxFreeAllowed = hasOvernight && distanceRuleMet;

  const dayRows = buildDayRows({
    state,
    claim,
    travelType,
    countrySegments,
    mealEvents,
    hasOvernight,
    statutoryTaxFreeAllowed
  });
  const nightRows = buildNightRows({
    state,
    claim,
    travelType,
    countrySegments,
    expenseReceipts,
    hasOvernight,
    statutoryTaxFreeAllowed
  });

  const statutoryTaxFreeMaxAllowance = roundMoney(
    [...dayRows, ...nightRows].reduce((sum, row) => sum + Number(row.statutoryAmount || 0), 0)
  );
  const requestedAllowanceAmount =
    claim.requestedAllowanceAmount == null ? statutoryTaxFreeMaxAllowance : roundMoney(claim.requestedAllowanceAmount);
  const taxFreeTravelAllowance = roundMoney(Math.min(requestedAllowanceAmount, statutoryTaxFreeMaxAllowance));
  const taxableTravelAllowance = roundMoney(Math.max(0, requestedAllowanceAmount - taxFreeTravelAllowance));

  const mileageRows = mileageLogs.map((log) => valueMileageLog(log));
  const taxFreeMileage = roundMoney(mileageRows.reduce((sum, row) => sum + Number(row.taxFreeAmount || 0), 0));
  const taxableMileage = roundMoney(mileageRows.reduce((sum, row) => sum + Number(row.taxableAmount || 0), 0));

  const expenseRows = expenseReceipts.map((receipt) => valueExpenseReceipt(receipt));
  const expenseReimbursementAmount = roundMoney(
    expenseRows
      .filter((row) => row.paymentMethod === "private_card" || row.paymentMethod === "cash")
      .reduce((sum, row) => sum + Number(row.amountSek || 0), 0)
  );
  const companyCardExpenseAmount = roundMoney(
    expenseRows
      .filter((row) => row.paymentMethod === "company_card")
      .reduce((sum, row) => sum + Number(row.amountSek || 0), 0)
  );
  const travelAdvanceAmount = roundMoney(travelAdvances.reduce((sum, advance) => sum + Number(advance.amountSek || 0), 0));
  const payoutBeforeAdvance = roundMoney(
    taxFreeTravelAllowance + taxableTravelAllowance + taxFreeMileage + taxableMileage + expenseReimbursementAmount
  );
  const netTravelPayoutAmount = roundMoney(Math.max(0, payoutBeforeAdvance - travelAdvanceAmount));
  const advanceNetDeductionAmount = roundMoney(Math.max(0, travelAdvanceAmount - payoutBeforeAdvance));

  const estimatedTotalCost = roundMoney(
    requestedAllowanceAmount +
      mileageRows.reduce((sum, row) => sum + Number(row.requestedAmount || 0), 0) +
      expenseRows.reduce((sum, row) => sum + Number(row.amountSek || 0), 0)
  );
  const outsideNordic = countrySegments.some((segment) => !NORDIC_COUNTRIES.has(segment.countryName));
  const preApprovalRequired = estimatedTotalCost > TRAVEL_PREAPPROVAL_THRESHOLD_SEK || outsideNordic;

  const warnings = [];
  if (!hasOvernight && requestedAllowanceAmount > 0) {
    warnings.push("travel_overnight_missing");
  }
  if (!distanceRuleMet && requestedAllowanceAmount > 0) {
    warnings.push("travel_distance_rule_not_met");
  }
  if (taxableTravelAllowance > 0) {
    warnings.push("travel_allowance_excess_taxable");
  }
  for (const mileageRow of mileageRows) {
    if (mileageRow.warningCode) {
      warnings.push(mileageRow.warningCode);
    }
  }
  if (preApprovalRequired && claim.preApproved !== true) {
    warnings.push("travel_preapproval_required");
  }

  return {
    travelValuationId: crypto.randomUUID(),
    travelClaimId: claim.travelClaimId,
    companyId: claim.companyId,
    reportingPeriod: claim.reportingPeriod,
    taxYear: claim.reportingPeriod.slice(0, 4),
    ruleVersion: DEFAULT_RULE_VERSION,
    travelType,
    statutoryTaxFreeAllowed,
    statutoryTaxFreeMaxAllowance,
    requestedAllowanceAmount,
    taxFreeTravelAllowance,
    taxableTravelAllowance,
    taxFreeMileage,
    taxableMileage,
    expenseReimbursementAmount,
    companyCardExpenseAmount,
    travelAdvanceAmount,
    netTravelPayoutAmount,
    advanceNetDeductionAmount,
    sourceSnapshotHash: buildSnapshotHash({
      claim,
      countrySegments,
      mealEvents,
      mileageLogs,
      expenseReceipts,
      travelAdvances
    }),
    warnings: [...new Set(warnings)],
    explanation: buildTravelExplanation({
      travelType,
      statutoryTaxFreeAllowed,
      hasOvernight,
      distanceRuleMet,
      preApprovalRequired,
      outsideNordic
    }),
    dayRows,
    nightRows,
    mileageRows,
    expenseRows,
    postingIntents: buildTravelPostingIntents({
      claim,
      taxFreeTravelAllowance,
      taxableTravelAllowance,
      taxFreeMileage,
      taxableMileage,
      expenseReimbursementAmount,
      advanceNetDeductionAmount
    })
  };
}

function buildDayRows({ state, claim, travelType, countrySegments, mealEvents, statutoryTaxFreeAllowed }) {
  const dateKeys = buildDateKeys(claim.startAt.slice(0, 10), claim.endAt.slice(0, 10));
  const rows = [];
  let currentLocationKey = null;
  let continuousDays = Number(claim.sameLocationDaysBeforeStart || 0);

  for (let index = 0; index < dateKeys.length; index += 1) {
    const dateKey = dateKeys[index];
    const dayClassification = classifyTravelDay({
      startAt: claim.startAt,
      endAt: claim.endAt,
      dayIndex: index,
      dayCount: dateKeys.length
    });
    const country = resolveCountryForTravelDay({
      segments: countrySegments,
      dateKey,
      fallbackCountryName: travelType === "domestic" ? "Sverige" : countrySegments[0]?.countryName || "Ovriga lander och omraden"
    });

    if (country.locationKey === currentLocationKey) {
      continuousDays += 1;
    } else {
      currentLocationKey = country.locationKey;
      continuousDays = index === 0 ? Number(claim.sameLocationDaysBeforeStart || 0) + 1 : 1;
    }

    const reductionBracket = resolveLongTripBracket(continuousDays);
    const baseAmount = resolveBaseTravelAmount({
      state,
      taxYear: claim.reportingPeriod.slice(0, 4),
      countryName: country.countryName,
      travelType,
      dayClassification,
      reductionBracket
    });
    const mealReduction = resolveMealReduction({
      travelType,
      baseAmount,
      mealEvent: mealEvents.find((candidate) => candidate.date === dateKey) || null
    });
    const statutoryAmount = statutoryTaxFreeAllowed ? roundMoney(Math.max(0, baseAmount - mealReduction.amount)) : 0;

    rows.push({
      travelClaimDayId: crypto.randomUUID(),
      date: dateKey,
      countryName: country.countryName,
      countryCode: country.countryCode,
      locationKey: country.locationKey,
      dayClassification,
      reductionBracket,
      baseAmount,
      mealReductionAmount: mealReduction.amount,
      mealReductionCode: mealReduction.code,
      statutoryAmount,
      explanation: mealReduction.explanation
    });
  }

  return rows;
}

function buildNightRows({ state, claim, travelType, countrySegments, expenseReceipts, hasOvernight, statutoryTaxFreeAllowed }) {
  if (!hasOvernight) {
    return [];
  }

  const nights = buildNightDateKeys(claim.startAt.slice(0, 10), claim.endAt.slice(0, 10));
  const hasVerifiedLodging = expenseReceipts.some((receipt) => receipt.expenseType === "lodging" && receipt.hasReceiptSupport);
  return nights.map((dateKey) => {
    const country = resolveCountryForNight({
      segments: countrySegments,
      dateKey,
      fallbackCountryName: travelType === "domestic" ? "Sverige" : countrySegments[0]?.countryName || "Ovriga lander och omraden"
    });
    let statutoryAmount = 0;
    if (statutoryTaxFreeAllowed && claim.lodgingPaidByEmployer !== true && !hasVerifiedLodging) {
      statutoryAmount =
        travelType === "domestic"
          ? DOMESTIC_NIGHT_ALLOWANCE_2026
          : roundMoney(resolveForeignNightAllowance({ state, taxYear: claim.reportingPeriod.slice(0, 4), countryName: country.countryName }));
    }
    return {
      travelClaimDayId: crypto.randomUUID(),
      date: dateKey,
      countryName: country.countryName,
      countryCode: country.countryCode,
      locationKey: country.locationKey,
      dayClassification: "night",
      reductionBracket: "none",
      baseAmount: statutoryAmount,
      mealReductionAmount: 0,
      mealReductionCode: "night_allowance",
      statutoryAmount,
      explanation: claim.lodgingPaidByEmployer || hasVerifiedLodging ? "No night allowance because lodging is already covered." : "Night allowance applied."
    };
  });
}

function buildTravelPostingIntents({
  claim,
  taxFreeTravelAllowance,
  taxableTravelAllowance,
  taxFreeMileage,
  taxableMileage,
  expenseReimbursementAmount,
  advanceNetDeductionAmount
}) {
  const intents = [];
  if (taxFreeTravelAllowance > 0) {
    intents.push(createTravelPostingIntent({
      claim,
      processingStep: 7,
      intentType: "travel_allowance_tax_free",
      ledgerAccountCode: "7310",
      amount: taxFreeTravelAllowance,
      payItemCode: "TAX_FREE_TRAVEL_ALLOWANCE",
      displayName: "Traktamente skattefritt",
      agiMappingCode: "tax_free_allowance",
      taxTreatmentCode: "non_taxable",
      employerContributionTreatmentCode: "excluded"
    }));
  }
  if (taxableTravelAllowance > 0) {
    intents.push(createTravelPostingIntent({
      claim,
      processingStep: 7,
      intentType: "travel_allowance_taxable",
      ledgerAccountCode: "7310",
      amount: taxableTravelAllowance,
      payItemCode: "TAXABLE_TRAVEL_ALLOWANCE",
      displayName: "Traktamente skattepliktigt",
      agiMappingCode: "cash_compensation",
      taxTreatmentCode: "taxable",
      employerContributionTreatmentCode: "included"
    }));
  }
  if (taxFreeMileage > 0) {
    intents.push(createTravelPostingIntent({
      claim,
      processingStep: 7,
      intentType: "mileage_tax_free",
      ledgerAccountCode: "7320",
      amount: taxFreeMileage,
      payItemCode: "TAX_FREE_MILEAGE",
      displayName: "Milersattning skattefri",
      agiMappingCode: "tax_free_allowance",
      taxTreatmentCode: "non_taxable",
      employerContributionTreatmentCode: "excluded"
    }));
  }
  if (taxableMileage > 0) {
    intents.push(createTravelPostingIntent({
      claim,
      processingStep: 7,
      intentType: "mileage_taxable",
      ledgerAccountCode: "7320",
      amount: taxableMileage,
      payItemCode: "TAXABLE_MILEAGE",
      displayName: "Milersattning skattepliktig",
      agiMappingCode: "cash_compensation",
      taxTreatmentCode: "taxable",
      employerContributionTreatmentCode: "included"
    }));
  }
  if (expenseReimbursementAmount > 0) {
    intents.push(createTravelPostingIntent({
      claim,
      processingStep: 7,
      intentType: "expense_reimbursement",
      ledgerAccountCode: "7330",
      amount: expenseReimbursementAmount,
      payItemCode: "EXPENSE_REIMBURSEMENT",
      displayName: "Utlag privatkort",
      agiMappingCode: "not_reported",
      taxTreatmentCode: "non_taxable",
      employerContributionTreatmentCode: "excluded"
    }));
  }
  if (advanceNetDeductionAmount > 0) {
    intents.push(createTravelPostingIntent({
      claim,
      processingStep: 13,
      intentType: "travel_advance_settlement",
      ledgerAccountCode: "2750",
      amount: advanceNetDeductionAmount,
      payItemCode: "ADVANCE",
      displayName: "Avrakning reseforskott",
      agiMappingCode: "not_reported",
      taxTreatmentCode: "non_taxable",
      employerContributionTreatmentCode: "excluded"
    }));
  }
  return intents;
}

function createTravelPostingIntent({
  claim,
  processingStep,
  intentType,
  ledgerAccountCode,
  amount,
  payItemCode,
  displayName,
  agiMappingCode,
  taxTreatmentCode,
  employerContributionTreatmentCode
}) {
  return {
    travelPostingIntentId: crypto.randomUUID(),
    travelClaimId: claim.travelClaimId,
    companyId: claim.companyId,
    processingStep,
    intentType,
    ledgerAccountCode,
    amount: roundMoney(amount),
    payrollLinePayloadJson: {
      processingStep,
      payItemCode,
      amount: roundMoney(amount),
      sourceType: "travel_claim",
      sourceId: claim.travelClaimId,
      note: `${displayName} ${claim.reportingPeriod}`,
      dimensionJson: copy(claim.dimensionJson || {}),
      overrides: {
        displayName,
        ledgerAccountCode,
        agiMappingCode,
        taxTreatmentCode,
        employerContributionTreatmentCode,
        includedInNetPay: true,
        reportingOnly: false
      }
    },
    createdAt: claim.createdAt
  };
}

function storeTravelClaim({
  state,
  claim,
  valuation,
  countrySegments,
  mealEvents,
  mileageLogs,
  expenseReceipts,
  travelAdvances,
  documentPlatform,
  correlationId,
  clock
}) {
  state.claims.set(claim.travelClaimId, claim);
  appendToIndex(state.claimIdsByCompany, claim.companyId, claim.travelClaimId);
  appendToIndex(state.claimIdsByEmployment, claim.employmentId, claim.travelClaimId);

  state.valuations.set(valuation.travelValuationId, valuation);
  state.valuationIdByClaim.set(claim.travelClaimId, valuation.travelValuationId);

  for (const dayRow of [...valuation.dayRows, ...valuation.nightRows]) {
    state.claimDays.set(dayRow.travelClaimDayId, dayRow);
    appendToIndex(state.claimDayIdsByClaim, claim.travelClaimId, dayRow.travelClaimDayId);
  }
  for (const mealEvent of mealEvents) {
    const record = {
      travelMealEventId: crypto.randomUUID(),
      travelClaimId: claim.travelClaimId,
      ...mealEvent
    };
    state.mealEvents.set(record.travelMealEventId, record);
    appendToIndex(state.mealEventIdsByClaim, claim.travelClaimId, record.travelMealEventId);
  }
  for (const segment of countrySegments) {
    const record = {
      travelCountrySegmentId: crypto.randomUUID(),
      travelClaimId: claim.travelClaimId,
      ...segment
    };
    state.countrySegments.set(record.travelCountrySegmentId, record);
    appendToIndex(state.countrySegmentIdsByClaim, claim.travelClaimId, record.travelCountrySegmentId);
  }
  for (let index = 0; index < mileageLogs.length; index += 1) {
    const record = {
      travelMileageLogId: crypto.randomUUID(),
      travelClaimId: claim.travelClaimId,
      ...mileageLogs[index],
      valuation: valuation.mileageRows[index]
    };
    state.mileageLogs.set(record.travelMileageLogId, record);
    appendToIndex(state.mileageLogIdsByClaim, claim.travelClaimId, record.travelMileageLogId);
  }
  for (let index = 0; index < expenseReceipts.length; index += 1) {
    const record = {
      travelExpenseReceiptId: crypto.randomUUID(),
      travelClaimId: claim.travelClaimId,
      ...expenseReceipts[index],
      valuation: valuation.expenseRows[index]
    };
    state.expenseReceipts.set(record.travelExpenseReceiptId, record);
    appendToIndex(state.expenseReceiptIdsByClaim, claim.travelClaimId, record.travelExpenseReceiptId);
    if (record.documentId && documentPlatform?.linkDocumentRecord) {
      documentPlatform.linkDocumentRecord({
        companyId: claim.companyId,
        documentId: record.documentId,
        targetType: "travel_claim",
        targetId: claim.travelClaimId,
        metadataJson: {
          expenseType: record.expenseType,
          paymentMethod: record.paymentMethod,
          reportingPeriod: claim.reportingPeriod
        },
        actorId: claim.createdByActorId,
        correlationId
      });
    }
  }
  for (const travelAdvance of travelAdvances) {
    const record = {
      travelAdvanceId: crypto.randomUUID(),
      travelClaimId: claim.travelClaimId,
      ...travelAdvance
    };
    state.travelAdvances.set(record.travelAdvanceId, record);
    appendToIndex(state.travelAdvanceIdsByClaim, claim.travelClaimId, record.travelAdvanceId);
  }
  for (const intent of valuation.postingIntents) {
    state.postingIntents.set(intent.travelPostingIntentId, intent);
    appendToIndex(state.postingIntentIdsByClaim, claim.travelClaimId, intent.travelPostingIntentId);
  }

  pushAudit(state, clock, {
    companyId: claim.companyId,
    actorId: claim.createdByActorId,
    correlationId,
    action: "travel.claim.valued",
    entityType: "travel_claim",
    entityId: claim.travelClaimId,
    explanation: `Calculated travel claim with tax-free allowance ${valuation.taxFreeTravelAllowance}.`
  });
}

function presentTravelClaim(state, claim) {
  if (!claim) {
    return null;
  }
  const valuation = state.valuations.get(state.valuationIdByClaim.get(claim.travelClaimId)) || null;
  const payrollConsumptions = listChildRecords(state.payrollConsumptionIdsByClaim, state.payrollConsumptions, claim.travelClaimId);
  return {
    ...copy(claim),
    travelDays: (state.claimDayIdsByClaim.get(claim.travelClaimId) || [])
      .map((travelClaimDayId) => state.claimDays.get(travelClaimDayId))
      .filter(Boolean)
      .map(copy),
    mealEvents: (state.mealEventIdsByClaim.get(claim.travelClaimId) || [])
      .map((travelMealEventId) => state.mealEvents.get(travelMealEventId))
      .filter(Boolean)
      .map(copy),
    countrySegments: (state.countrySegmentIdsByClaim.get(claim.travelClaimId) || [])
      .map((travelCountrySegmentId) => state.countrySegments.get(travelCountrySegmentId))
      .filter(Boolean)
      .map(copy),
    mileageLogs: (state.mileageLogIdsByClaim.get(claim.travelClaimId) || [])
      .map((travelMileageLogId) => state.mileageLogs.get(travelMileageLogId))
      .filter(Boolean)
      .map(copy),
    expenseReceipts: (state.expenseReceiptIdsByClaim.get(claim.travelClaimId) || [])
      .map((travelExpenseReceiptId) => state.expenseReceipts.get(travelExpenseReceiptId))
      .filter(Boolean)
      .map(copy),
    travelAdvances: (state.travelAdvanceIdsByClaim.get(claim.travelClaimId) || [])
      .map((travelAdvanceId) => state.travelAdvances.get(travelAdvanceId))
      .filter(Boolean)
      .map(copy),
    postingIntents: (state.postingIntentIdsByClaim.get(claim.travelClaimId) || [])
      .map((travelPostingIntentId) => state.postingIntents.get(travelPostingIntentId))
      .filter(Boolean)
      .map(copy),
    valuation: valuation ? copy(valuation) : null,
    payrollConsumptions,
    payrollDispatchStatus: summarizePayrollConsumptions(payrollConsumptions)
  };
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

function listChildRecords(index, table, key) {
  return (index.get(key) || []).map((id) => table.get(id)).filter(Boolean).map(copy);
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

function valueMileageLog(log) {
  const legalRatePerKm = MILEAGE_RATES_PER_KM_2026[log.vehicleType];
  const requestedAmount =
    log.claimedAmount != null ? roundMoney(log.claimedAmount) : roundMoney(Number(log.distanceKm || 0) * Number(log.claimedRatePerKm || legalRatePerKm));
  const taxFreeMaxAmount =
    log.vehicleType === "OWN_CAR" || log.employeePaidAllFuel === true ? roundMoney(Number(log.distanceKm || 0) * legalRatePerKm) : 0;
  const taxFreeAmount = roundMoney(Math.min(requestedAmount, taxFreeMaxAmount));
  const taxableAmount = roundMoney(Math.max(0, requestedAmount - taxFreeAmount));
  return {
    ...copy(log),
    legalRatePerKm,
    requestedAmount,
    taxFreeMaxAmount,
    taxFreeAmount,
    taxableAmount,
    warningCode:
      log.vehicleType !== "OWN_CAR" && log.employeePaidAllFuel !== true
        ? "travel_mileage_tax_free_denied_benefit_car_fuel"
        : taxableAmount > 0
          ? "travel_mileage_excess_taxable"
          : null
  };
}

function valueExpenseReceipt(receipt) {
  const amountSek = roundMoney(receipt.currencyCode === "SEK" ? receipt.amount : receipt.amount * receipt.exchangeRate);
  return {
    ...copy(receipt),
    amountSek
  };
}

function resolveCountryForTravelDay({ segments, dateKey, fallbackCountryName }) {
  const offset = extractOffset(segments[0]?.startAt || `${dateKey}T00:00:00+00:00`);
  const windowStart = `${dateKey}T06:00:00${offset}`;
  const windowEnd = `${addDays(dateKey, 1)}T00:00:00${offset}`;
  return resolveCountryByOverlap({ segments, windowStart, windowEnd, fallbackCountryName });
}

function resolveCountryForNight({ segments, dateKey, fallbackCountryName }) {
  const offset = extractOffset(segments[0]?.startAt || `${dateKey}T00:00:00+00:00`);
  const windowStart = `${dateKey}T00:00:00${offset}`;
  const windowEnd = `${dateKey}T06:00:00${offset}`;
  return resolveCountryByOverlap({ segments, windowStart, windowEnd, fallbackCountryName });
}

function resolveCountryByOverlap({ segments, windowStart, windowEnd, fallbackCountryName }) {
  const ranked = (segments || [])
    .map((segment) => {
      const overlapStart = Math.max(toTimestamp(windowStart), toTimestamp(segment.startAt));
      const overlapEnd = Math.min(toTimestamp(windowEnd), toTimestamp(segment.endAt));
      return {
        ...segment,
        overlapMs: Math.max(0, overlapEnd - overlapStart)
      };
    })
    .filter((segment) => segment.overlapMs > 0)
    .sort((left, right) => right.overlapMs - left.overlapMs || left.startAt.localeCompare(right.startAt));
  if (ranked.length > 0) {
    return {
      countryName: ranked[0].countryName,
      countryCode: ranked[0].countryCode,
      locationKey: ranked[0].locationKey
    };
  }
  return {
    countryName: fallbackCountryName,
    countryCode: fallbackCountryName === "Sverige" ? "SE" : null,
    locationKey: fallbackCountryName
  };
}

function resolveBaseTravelAmount({ state, taxYear, countryName, travelType, dayClassification, reductionBracket }) {
  if (travelType === "domestic") {
    if (reductionBracket === "after_two_years") {
      return DOMESTIC_LONG_TRIP_TWO_YEARS_FULL_DAY_2026;
    }
    if (reductionBracket === "after_three_months") {
      return DOMESTIC_LONG_TRIP_THREE_MONTHS_FULL_DAY_2026;
    }
    return dayClassification === "half" ? DOMESTIC_HALF_DAY_2026 : DOMESTIC_FULL_DAY_2026;
  }
  const normalAmount = lookupForeignNormalAmount(state, taxYear, countryName)?.amountSek;
  if (!normalAmount) {
    throw createError(404, "travel_country_allowance_not_found", `Foreign normal amount was not found for ${countryName}.`);
  }
  if (reductionBracket === "after_two_years") {
    return roundMoney(normalAmount * 0.5);
  }
  if (reductionBracket === "after_three_months") {
    return roundMoney(normalAmount * 0.7);
  }
  return dayClassification === "half" ? roundMoney(normalAmount * 0.5) : normalAmount;
}

function resolveForeignNightAllowance({ state, taxYear, countryName }) {
  const normalAmount = lookupForeignNormalAmount(state, taxYear, countryName)?.amountSek;
  if (!normalAmount) {
    throw createError(404, "travel_country_allowance_not_found", `Foreign normal amount was not found for ${countryName}.`);
  }
  return roundMoney(normalAmount * 0.5);
}

function resolveMealReduction({ travelType, baseAmount, mealEvent }) {
  if (!mealEvent) {
    return {
      amount: 0,
      code: "none",
      explanation: "No employer-paid meals for this day."
    };
  }
  const breakfast = mealEvent.breakfastProvided === true;
  const lunch = mealEvent.lunchProvided === true;
  const dinner = mealEvent.dinnerProvided === true;
  if (!breakfast && !lunch && !dinner) {
    return {
      amount: 0,
      code: "none",
      explanation: "No employer-paid meals for this day."
    };
  }

  if (travelType === "domestic") {
    const reductionTable = DOMESTIC_MEAL_REDUCTION_TABLE_2026[String(baseAmount)] || DOMESTIC_MEAL_REDUCTION_TABLE_2026[300];
    const amount =
      breakfast && lunch && dinner
        ? reductionTable.fullDay
        : lunch && dinner
          ? reductionTable.lunchAndDinner
          : lunch || dinner
            ? reductionTable.lunchOrDinner + (breakfast ? reductionTable.breakfast : 0)
            : reductionTable.breakfast;
    return {
      amount,
      code: breakfast && lunch && dinner ? "full_day" : lunch && dinner ? "lunch_and_dinner" : lunch || dinner ? "partial_meal" : "breakfast",
      explanation: "Domestic meal reduction table applied."
    };
  }

  const reductionRate =
    breakfast && lunch && dinner
      ? FOREIGN_MEAL_REDUCTION_RATES.fullDay
      : lunch && dinner
        ? FOREIGN_MEAL_REDUCTION_RATES.lunchAndDinner
        : lunch || dinner
          ? FOREIGN_MEAL_REDUCTION_RATES.lunchOrDinner + (breakfast ? FOREIGN_MEAL_REDUCTION_RATES.breakfast : 0)
          : FOREIGN_MEAL_REDUCTION_RATES.breakfast;
  return {
    amount: Math.round(Number(baseAmount || 0) * reductionRate),
    code: breakfast && lunch && dinner ? "full_day" : lunch && dinner ? "lunch_and_dinner" : lunch || dinner ? "partial_meal" : "breakfast",
    explanation: "Foreign meal reduction percentages applied."
  };
}

function classifyTravelDay({ startAt, endAt, dayIndex, dayCount }) {
  if (dayCount === 1) {
    return localTimeMinutes(startAt) < 12 * 60 || localTimeMinutes(endAt) > 19 * 60 ? "full" : "half";
  }
  if (dayIndex === 0) {
    return localTimeMinutes(startAt) < 12 * 60 ? "full" : "half";
  }
  if (dayIndex === dayCount - 1) {
    return localTimeMinutes(endAt) > 19 * 60 ? "full" : "half";
  }
  return "full";
}

function resolveLongTripBracket(continuousDays) {
  if (continuousDays > 730) {
    return "after_two_years";
  }
  if (continuousDays > 90) {
    return "after_three_months";
  }
  return "none";
}

function normalizeCountrySegments({ startAt, endAt, countrySegments, countryCode, countryName, firstDestination, sameLocationKey }) {
  const provided = Array.isArray(countrySegments) ? countrySegments : [];
  if (provided.length === 0) {
    const resolvedCountryName = requireCountryName(countryCode || countryName || "SE", "travel_country_required");
    return [
      {
        startAt,
        endAt,
        countryCode: resolveCountryCode(countryCode || countryName || resolvedCountryName),
        countryName: resolvedCountryName,
        locationKey: normalizeOptionalText(sameLocationKey) || normalizeOptionalText(firstDestination) || resolvedCountryName
      }
    ];
  }
  return provided
    .map((segment) => {
      const resolvedCountryName = requireCountryName(segment.countryCode || segment.countryName, "travel_country_required");
      return {
        startAt: normalizeRequiredDateTime(segment.startAt, "travel_country_segment_start_invalid"),
        endAt: normalizeRequiredDateTime(segment.endAt, "travel_country_segment_end_invalid"),
        countryCode: resolveCountryCode(segment.countryCode || resolvedCountryName),
        countryName: resolvedCountryName,
        locationKey: normalizeOptionalText(segment.locationKey) || resolvedCountryName
      };
    })
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .map((segment, index, segments) => {
      if (toTimestamp(segment.endAt) <= toTimestamp(segment.startAt)) {
        throw createError(400, "travel_country_segment_range_invalid", "Travel country segment end time must be later than the start time.");
      }
      return {
        ...segment,
        startAt: index === 0 ? startAt : segment.startAt,
        endAt: index === segments.length - 1 ? endAt : segment.endAt
      };
    });
}

function normalizeMealEvents({ mealEvents, startAt, endAt }) {
  const startDate = startAt.slice(0, 10);
  const endDate = endAt.slice(0, 10);
  return (Array.isArray(mealEvents) ? mealEvents : []).map((mealEvent) => {
    const date = normalizeRequiredDate(mealEvent.date, "travel_meal_date_required");
    if (date < startDate || date > endDate) {
      throw createError(400, "travel_meal_date_out_of_range", "Meal event must be within the travel date range.");
    }
    return {
      date,
      breakfastProvided: mealEvent.breakfastProvided === true,
      lunchProvided: mealEvent.lunchProvided === true,
      dinnerProvided: mealEvent.dinnerProvided === true
    };
  });
}

function normalizeMileageLogs({ mileageLogs, startAt, endAt }) {
  const startDate = startAt.slice(0, 10);
  const endDate = endAt.slice(0, 10);
  return (Array.isArray(mileageLogs) ? mileageLogs : []).map((log) => {
    const date = normalizeRequiredDate(log.date, "travel_mileage_date_required");
    if (date < startDate || date > endDate) {
      throw createError(400, "travel_mileage_date_out_of_range", "Mileage log date must be within the travel date range.");
    }
    return {
      date,
      vehicleType: assertAllowed(normalizeUpperCode(log.vehicleType, "travel_vehicle_type_required"), MILEAGE_VEHICLE_TYPES, "travel_vehicle_type_invalid"),
      distanceKm: normalizeMoney(log.distanceKm, "travel_distance_km_invalid"),
      claimedRatePerKm: normalizeOptionalMoney(log.claimedRatePerKm, "travel_claimed_rate_invalid"),
      claimedAmount: normalizeOptionalMoney(log.claimedAmount, "travel_claimed_amount_invalid"),
      employeePaidAllFuel: log.employeePaidAllFuel !== false,
      note: normalizeOptionalText(log.note)
    };
  });
}

function normalizeExpenseReceipts({ expenseReceipts, startAt, endAt }) {
  const startDate = startAt.slice(0, 10);
  const endDate = endAt.slice(0, 10);
  return (Array.isArray(expenseReceipts) ? expenseReceipts : []).map((receipt) => {
    const date = normalizeRequiredDate(receipt.date, "travel_expense_date_required");
    if (date < addDays(startDate, -7) || date > addDays(endDate, 7)) {
      throw createError(400, "travel_expense_date_out_of_range", "Expense receipt date must stay close to the travel range.");
    }
    return {
      date,
      expenseType: normalizeOptionalText(receipt.expenseType) || "other",
      paymentMethod: assertAllowed(normalizeOptionalText(receipt.paymentMethod) || "private_card", EXPENSE_PAYMENT_METHODS, "travel_expense_payment_method_invalid"),
      amount: normalizeMoney(receipt.amount, "travel_expense_amount_invalid"),
      currencyCode: normalizeUpperCode(receipt.currencyCode || "SEK", "travel_expense_currency_invalid", 3),
      exchangeRate: normalizeOptionalNumber(receipt.exchangeRate, "travel_expense_exchange_rate_invalid") || 1,
      documentId: normalizeOptionalText(receipt.documentId),
      hasReceiptSupport: receipt.hasReceiptSupport !== false
    };
  });
}

function normalizeTravelAdvances({ travelAdvances }) {
  return (Array.isArray(travelAdvances) ? travelAdvances : []).map((advance) => ({
    date: normalizeRequiredDate(advance.date, "travel_advance_date_required"),
    amountSek: normalizeMoney(advance.amountSek, "travel_advance_amount_invalid"),
    note: normalizeOptionalText(advance.note)
  }));
}

function seedForeignAllowances(state, { taxYear, allowances, clock }) {
  const resolvedTaxYear = normalizeTaxYear(taxYear);
  const aliasEntries = [];
  for (const [countryName, config] of Object.entries(allowances || {})) {
    const allowanceRecord = {
      travelForeignAllowanceId: crypto.randomUUID(),
      taxYear: resolvedTaxYear,
      countryName,
      countryCode: resolveCountryCode(countryName),
      amountSek: config.amountSek == null ? null : roundMoney(config.amountSek),
      aliasOf: config.aliasOf || null,
      createdAt: nowIso(clock)
    };
    state.foreignAllowanceTables.set(allowanceRecord.travelForeignAllowanceId, allowanceRecord);
    appendToIndex(state.foreignAllowanceIdsByTaxYear, resolvedTaxYear, allowanceRecord.travelForeignAllowanceId);
    if (allowanceRecord.aliasOf) {
      aliasEntries.push(allowanceRecord);
    }
  }
  for (const aliasRecord of aliasEntries) {
    const target = lookupForeignNormalAmount(state, resolvedTaxYear, aliasRecord.aliasOf);
    if (target) {
      aliasRecord.amountSek = target.amountSek;
    }
  }
}

function seedTravelDemo(state, { companyId, clock }) {
  pushAudit(state, clock, {
    companyId,
    actorId: "seed",
    correlationId: "phase9-travel-seed",
    action: "travel.catalog.seeded",
    entityType: "travel_foreign_allowance",
    entityId: "2026",
    explanation: "Seeded the 2026 foreign normal amount table for travel verification."
  });
}

function lookupForeignNormalAmount(state, taxYear, countryName) {
  const resolvedName = requireCountryName(countryName, "travel_country_required");
  return (state.foreignAllowanceIdsByTaxYear.get(taxYear) || [])
    .map((allowanceId) => state.foreignAllowanceTables.get(allowanceId))
    .filter(Boolean)
    .find((allowance) => canonicalizeCountryKey(allowance.countryName) === canonicalizeCountryKey(resolvedName));
}

function requireCountryName(value, code) {
  const resolvedValue = requireText(value, code);
  if (resolvedValue.toUpperCase() === "SE" || canonicalizeCountryKey(resolvedValue) === "sverige") {
    return "Sverige";
  }
  const codeName = COUNTRY_NAME_BY_CODE[resolvedValue.toUpperCase()];
  if (codeName) {
    return codeName;
  }
  const normalized = canonicalizeCountryKey(resolvedValue);
  const alias = COUNTRY_ALIAS_OVERRIDES[normalized];
  if (alias) {
    return alias;
  }
  const direct = Object.keys(FOREIGN_NORMAL_AMOUNTS_2026).find(
    (countryName) => canonicalizeCountryKey(countryName) === normalized
  );
  if (direct) {
    return direct;
  }
  return resolvedValue;
}

function resolveCountryCode(value) {
  if (!value) {
    return null;
  }
  const text = String(value).trim();
  if (/^[A-Za-z]{2}$/.test(text)) {
    return text.toUpperCase();
  }
  const match = Object.entries(COUNTRY_NAME_BY_CODE).find(
    ([, countryName]) => canonicalizeCountryKey(countryName) === canonicalizeCountryKey(text)
  );
  return match ? match[0] : null;
}

function requireEmploymentLink({ hrPlatform, companyId, employeeId, employmentId }) {
  if (!hrPlatform?.getEmployment) {
    return;
  }
  hrPlatform.getEmployment({
    companyId,
    employeeId,
    employmentId
  });
}

function requireTravelClaim(state, companyId, travelClaimId) {
  const claim = state.claims.get(requireText(travelClaimId, "travel_claim_id_required"));
  if (!claim || claim.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "travel_claim_not_found", "Travel claim was not found.");
  }
  return claim;
}

function buildTravelExplanation({ travelType, statutoryTaxFreeAllowed, hasOvernight, distanceRuleMet, preApprovalRequired, outsideNordic }) {
  const explanation = [];
  explanation.push(travelType === "domestic" ? "Domestic travel rules applied." : "Foreign travel rules applied.");
  explanation.push(
    hasOvernight
      ? "Overnight condition is met."
      : "Overnight condition is not met, so any requested allowance above zero becomes taxable."
  );
  explanation.push(
    distanceRuleMet
      ? "Distance threshold is met against both home and the regular workplace."
      : "Distance threshold is not met against both home and the regular workplace."
  );
  explanation.push(
    statutoryTaxFreeAllowed
      ? "Statutory tax-free travel allowance can be used."
      : "Statutory tax-free travel allowance cannot be used for this claim."
  );
  if (outsideNordic) {
    explanation.push("The travel includes at least one non-Nordic country.");
  }
  if (preApprovalRequired) {
    explanation.push("Policy pre-approval is required because total cost exceeds threshold or the trip is outside the Nordics.");
  }
  return explanation;
}

function buildDateKeys(startDate, endDate) {
  const dates = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function buildNightDateKeys(startDate, endDate) {
  const dates = [];
  let cursor = startDate;
  while (cursor < endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function extractOffset(value) {
  const match = String(value).match(/([+-]\d{2}:\d{2}|Z)$/);
  return match ? match[1] : "+00:00";
}

function localTimeMinutes(value) {
  const match = String(value).match(/T(\d{2}):(\d{2})/);
  if (!match) {
    return 0;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function toTimestamp(value) {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    throw createError(400, "travel_datetime_invalid", `Invalid datetime: ${value}`);
  }
  return timestamp;
}

function normalizeTaxYear(value) {
  const resolvedValue = requireText(value, "travel_tax_year_required");
  if (!/^\d{4}$/.test(resolvedValue)) {
    throw createError(400, "travel_tax_year_invalid", "Tax year must use YYYY format.");
  }
  return resolvedValue;
}

function normalizeReportingPeriod(value, code) {
  const resolvedValue = requireText(value, code);
  if (!/^\d{6}$/.test(resolvedValue)) {
    throw createError(400, code, "Reporting period must use YYYYMM format.");
  }
  return resolvedValue;
}

function normalizeOptionalReportingPeriod(value) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeReportingPeriod(String(value), "travel_reporting_period_invalid");
}

function toReportingPeriod(dateKey) {
  const resolvedDate = normalizeRequiredDate(dateKey, "travel_reporting_period_date_invalid");
  return `${resolvedDate.slice(0, 4)}${resolvedDate.slice(5, 7)}`;
}

function normalizeRequiredDate(value, code) {
  const resolvedValue = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedValue)) {
    throw createError(400, code, "Date must use YYYY-MM-DD format.");
  }
  const parsed = new Date(`${resolvedValue}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== resolvedValue) {
    throw createError(400, code, "Date is invalid.");
  }
  return resolvedValue;
}

function normalizeRequiredDateTime(value, code) {
  const resolvedValue = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)?$/.test(resolvedValue)) {
    throw createError(400, code, "Datetime must use ISO-8601 format.");
  }
  if (!Number.isFinite(Date.parse(resolvedValue))) {
    throw createError(400, code, "Datetime is invalid.");
  }
  if (/([+-]\d{2}:\d{2}|Z)$/.test(resolvedValue)) {
    return resolvedValue.length === 16 ? `${resolvedValue}:00` : resolvedValue;
  }
  return resolvedValue.length === 16 ? `${resolvedValue}:00` : resolvedValue;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const resolvedValue = String(value).trim();
  return resolvedValue ? resolvedValue : null;
}

function requireText(value, code) {
  const resolvedValue = normalizeOptionalText(value);
  if (!resolvedValue) {
    throw createError(400, code, `${code} is required.`);
  }
  return resolvedValue;
}

function normalizeUpperCode(value, code, expectedLength = null) {
  const resolvedValue = requireText(value, code).toUpperCase();
  if (expectedLength != null && resolvedValue.length !== Number(expectedLength)) {
    throw createError(400, code, `Code must be exactly ${expectedLength} characters.`);
  }
  return resolvedValue;
}

function normalizeMoney(value, code) {
  const normalized = normalizeOptionalNumber(value, code);
  if (normalized == null) {
    throw createError(400, code, "Amount is required.");
  }
  return roundMoney(normalized);
}

function normalizeOptionalMoney(value, code) {
  const normalized = normalizeOptionalNumber(value, code);
  return normalized == null ? null : roundMoney(normalized);
}

function normalizeOptionalNumber(value, code) {
  if (value == null || value === "") {
    return null;
  }
  const numericValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(numericValue)) {
    throw createError(400, code, "Value must be numeric.");
  }
  return numericValue;
}

function normalizeIntegerInRange(value, min, max, code) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) {
    throw createError(400, code, `Value must be an integer between ${min} and ${max}.`);
  }
  return numericValue;
}

function normalizeDimensions(value) {
  if (value == null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw createError(400, "travel_dimensions_invalid", "Dimension payload must be an object.");
  }
  return copy(value);
}

function assertAllowed(value, allowedValues, code) {
  const resolvedValue = requireText(value, code);
  if (!(allowedValues || []).includes(resolvedValue)) {
    throw createError(400, code, `Value ${resolvedValue} is not allowed.`);
  }
  return resolvedValue;
}

function canonicalizeCountryKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function appendToIndex(index, key, value) {
  const resolvedKey = requireText(key, "index_key_required");
  const currentValues = index.get(resolvedKey) || [];
  currentValues.push(value);
  index.set(resolvedKey, currentValues);
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function buildSnapshotHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "travel_action",
      event
    })
  );
}

function copy(value) {
  if (value == null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = Number(status) || 500;
  error.code = code || "travel_error";
  return error;
}
