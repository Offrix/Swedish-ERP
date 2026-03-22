import crypto from "node:crypto";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const PAY_RUN_TYPES = Object.freeze(["regular", "extra", "correction", "final"]);
export const PAY_RUN_STATUSES = Object.freeze(["calculated", "approved"]);
export const PAYROLL_FREQUENCY_CODES = Object.freeze(["monthly"]);
export const PAYROLL_TAX_MODES = Object.freeze(["pending", "manual_rate", "sink"]);
export const AGI_SUBMISSION_STATES = Object.freeze([
  "draft",
  "validated",
  "ready_for_sign",
  "submitted",
  "accepted",
  "partially_rejected",
  "rejected",
  "superseded"
]);
export const PAYROLL_COMPENSATION_BUCKETS = Object.freeze([
  "gross_addition",
  "gross_deduction",
  "net_deduction",
  "reporting_only"
]);
export const PAYROLL_CALCULATION_BASES = Object.freeze([
  "contract_monthly_salary",
  "contract_hourly_rate",
  "configured_unit_rate",
  "manual_amount",
  "reporting_only"
]);

export const PAYROLL_STEP_DEFINITIONS = Object.freeze([
  createStepDefinition(1, "employment_and_period", "Fetch employment and payroll period."),
  createStepDefinition(2, "source_snapshot", "Fetch schedules, time, absence and balances."),
  createStepDefinition(3, "base_salary", "Create base salary."),
  createStepDefinition(4, "variable_pay_items", "Apply variable pay items."),
  createStepDefinition(5, "retro_corrections", "Apply retroactive corrections."),
  createStepDefinition(6, "benefits", "Apply benefit payloads."),
  createStepDefinition(7, "travel_and_expense", "Apply travel and expense payloads that affect payroll."),
  createStepDefinition(8, "gross_deductions", "Apply gross deductions."),
  createStepDefinition(9, "pension_base", "Calculate pensionable base."),
  createStepDefinition(10, "taxable_base", "Calculate taxable base."),
  createStepDefinition(11, "preliminary_tax", "Calculate preliminary tax."),
  createStepDefinition(12, "employer_contributions", "Calculate employer contributions."),
  createStepDefinition(13, "net_deductions", "Apply net deductions."),
  createStepDefinition(14, "net_pay", "Calculate net pay."),
  createStepDefinition(15, "payslips", "Create payslips."),
  createStepDefinition(16, "agi_preview", "Create AGI preview payload."),
  createStepDefinition(17, "posting_intent_preview", "Create accounting preview payload."),
  createStepDefinition(18, "bank_payment_preview", "Create bank payment preview payload.")
]);

const EMPLOYER_CONTRIBUTION_RULE_PACKS = Object.freeze([
  {
    rulePackId: "payroll-employer-contribution-se-2026.1",
    domain: "payroll",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: "2026.1",
    checksum: "phase8-payroll-employer-contribution-se-2026-1",
    sourceSnapshotDate: "2026-03-22",
    semanticChangeSummary: "Phase 8.2 payroll rule pack for 2026 employer contribution classes.",
    machineReadableRules: {
      contributionClasses: {
        full: { ratePercent: 31.42 },
        reduced_age_pension_only: { ratePercent: 10.21 },
        no_contribution: { ratePercent: 0 }
      }
    },
    humanReadableExplanation: [
      "Employer contribution outcome is driven by rule pack, payout date and the resolved statutory profile.",
      "Reduced-rate eligibility remains explicit so the platform stays deterministic and auditable."
    ],
    testVectors: [{ vectorId: "payroll-full-2026" }, { vectorId: "payroll-reduced-2026" }, { vectorId: "payroll-none-2026" }],
    migrationNotes: ["Phase 8.2 adds AGI submissions and SINK support on top of this contribution pack."]
  },
  {
    rulePackId: "payroll-tax-se-2026.1",
    domain: "payroll",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: "2026.1",
    checksum: "phase8-payroll-tax-se-2026-1",
    sourceSnapshotDate: "2026-03-22",
    semanticChangeSummary: "Phase 8.2 payroll tax pack for manual-rate ordinary tax and SINK.",
    machineReadableRules: {
      ordinaryTaxModes: {
        manual_rate: {
          requiresExplicitRate: true
        }
      },
      sink: {
        standardRatePercent: 22.5,
        seaIncomeRatePercent: 15
      }
    },
    humanReadableExplanation: [
      "Ordinary tax remains explicit through a configured rate until later tax-table phases.",
      "SINK is versioned through the rule pack with standard and sea-income rates."
    ],
    testVectors: [{ vectorId: "payroll-manual-rate-2026" }, { vectorId: "payroll-sink-2026" }, { vectorId: "payroll-sink-sea-2026" }],
    migrationNotes: ["Phase 8.2 uses this tax pack for AGI-ready payroll tax decisions."]
  }
]);

const PAY_ITEM_TEMPLATES = Object.freeze([
  createPayItemTemplate("MONTHLY_SALARY", "monthly_salary", "Manadslon", "contract_monthly_salary", "month", "gross_addition", true, true),
  createPayItemTemplate("HOURLY_SALARY", "hourly_salary", "Timlon", "contract_hourly_rate", "hour", "gross_addition", true, true),
  createPayItemTemplate("OVERTIME", "overtime", "Overtid", "contract_hourly_rate", "hour", "gross_addition", false, true),
  createPayItemTemplate("ADDITIONAL_TIME", "additional_time", "Mertid", "contract_hourly_rate", "hour", "gross_addition", false, true),
  createPayItemTemplate("OB", "ob", "OB", "configured_unit_rate", "hour", "gross_addition", false, true),
  createPayItemTemplate("JOUR", "jour", "Jour", "configured_unit_rate", "hour", "gross_addition", false, true),
  createPayItemTemplate("STANDBY", "standby", "Beredskap", "configured_unit_rate", "hour", "gross_addition", false, true),
  createPayItemTemplate("BONUS", "bonus", "Bonus", "manual_amount", "amount", "gross_addition", false, true),
  createPayItemTemplate("COMMISSION", "commission", "Provision", "manual_amount", "amount", "gross_addition", false, true),
  createPayItemTemplate("VACATION_PAY", "vacation_pay", "Semesterlon", "configured_unit_rate", "day", "gross_addition", false, true),
  createPayItemTemplate("VACATION_SUPPLEMENT", "vacation_supplement", "Semestertillagg", "configured_unit_rate", "day", "gross_addition", false, true),
  createPayItemTemplate("VACATION_DEDUCTION", "vacation_deduction", "Semesteravdrag", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("SICK_PAY", "sick_pay", "Sjuklon", "configured_unit_rate", "day", "gross_addition", false, true),
  createPayItemTemplate("QUALIFYING_DEDUCTION", "qualifying_deduction", "Karens", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("CARE_OF_CHILD", "care_of_child", "VAB", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("PARENTAL_LEAVE", "parental_leave", "Foraldraledighet", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("LEAVE_WITHOUT_PAY", "leave_without_pay", "Tjanstledighet", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("TAX_FREE_TRAVEL_ALLOWANCE", "tax_free_travel_allowance", "Traktamente skattefritt", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("TAXABLE_TRAVEL_ALLOWANCE", "taxable_travel_allowance", "Traktamente skattepliktigt", "manual_amount", "amount", "gross_addition", false, false),
  createPayItemTemplate("TAX_FREE_MILEAGE", "tax_free_mileage", "Milersattning skattefri", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("TAXABLE_MILEAGE", "taxable_mileage", "Milersattning skattepliktig", "manual_amount", "amount", "gross_addition", false, false),
  createPayItemTemplate("BENEFIT", "benefit", "Forman", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("PENSION_PREMIUM", "pension_premium", "Pensionspremie", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("SALARY_EXCHANGE_GROSS_DEDUCTION", "salary_exchange_gross_deduction", "Lonevaxling bruttoloneavdrag", "manual_amount", "amount", "gross_deduction", false, false),
  createPayItemTemplate("NET_DEDUCTION", "net_deduction", "Nettoloneavdrag", "manual_amount", "amount", "net_deduction", false, false),
  createPayItemTemplate("GARNISHMENT", "garnishment", "Utmatning", "manual_amount", "amount", "net_deduction", false, false),
  createPayItemTemplate("ADVANCE", "advance", "Forskott", "manual_amount", "amount", "net_deduction", false, false),
  createPayItemTemplate("RECLAIM", "reclaim", "Aterkrav", "manual_amount", "amount", "net_deduction", false, false),
  createPayItemTemplate("FINAL_PAY", "final_pay", "Slutlon", "manual_amount", "amount", "gross_addition", false, true),
  createPayItemTemplate("CORRECTION", "correction", "Korrigering", "manual_amount", "amount", "gross_addition", false, true)
]);

export function createPayrollPlatform(options = {}) {
  return createPayrollEngine(options);
}

export function createPayrollEngine({
  clock = () => new Date(),
  seedDemo = true,
  orgAuthPlatform = null,
  hrPlatform = null,
  timePlatform = null,
  ruleRegistry = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({ clock, seedRulePacks: EMPLOYER_CONTRIBUTION_RULE_PACKS });
  const state = {
    payItems: new Map(),
    payItemIdsByCompany: new Map(),
    payItemIdsByCode: new Map(),
    payCalendars: new Map(),
    payCalendarIdsByCompany: new Map(),
    payCalendarIdsByCode: new Map(),
    payRuns: new Map(),
    payRunIdsByCompany: new Map(),
    payRunEvents: new Map(),
    payRunEventIdsByRun: new Map(),
    payRunLines: new Map(),
    payRunLineIdsByRun: new Map(),
    payRunLineIdsByEmployment: new Map(),
    payslips: new Map(),
    payslipIdsByRun: new Map(),
    payslipIdsByRunEmployment: new Map(),
    employmentStatutoryProfiles: new Map(),
    employmentStatutoryProfileIdByEmployment: new Map(),
    employmentStatutoryProfileIdsByCompany: new Map(),
    agiPeriods: new Map(),
    agiPeriodIdByCompanyPeriod: new Map(),
    agiSubmissionIdsByCompany: new Map(),
    agiSubmissions: new Map(),
    agiSubmissionVersions: new Map(),
    agiSubmissionVersionIdsBySubmission: new Map(),
    agiEmployees: new Map(),
    agiEmployeeIdsByVersion: new Map(),
    agiEmployeeLines: new Map(),
    agiEmployeeLineIdsByEmployee: new Map(),
    agiAbsencePayloads: new Map(),
    agiAbsencePayloadIdsByVersion: new Map(),
    agiReceipts: new Map(),
    agiReceiptIdsByVersion: new Map(),
    agiErrors: new Map(),
    agiErrorIdsByVersion: new Map(),
    agiSignatures: new Map(),
    agiSignatureIdsByVersion: new Map()
  };

  if (seedDemo) {
    seedPayrollDemo(state, { clock, companyId: DEMO_COMPANY_ID });
  }

  return {
    payRunTypes: PAY_RUN_TYPES,
    payRunStatuses: PAY_RUN_STATUSES,
    payrollStepDefinitions: PAYROLL_STEP_DEFINITIONS.map(copy),
    listEmployerContributionRulePacks,
    listPayrollRulePacks,
    listPayItems,
    getPayItem,
    createPayItem,
    listPayCalendars,
    getPayCalendar,
    createPayCalendar,
    listEmploymentStatutoryProfiles,
    upsertEmploymentStatutoryProfile,
    listPayRuns,
    getPayRun,
    createPayRun,
    approvePayRun,
    listPaySlips,
    getPaySlip,
    regeneratePaySlip,
    listAgiSubmissions,
    getAgiSubmission,
    createAgiSubmission,
    validateAgiSubmission,
    markAgiSubmissionReadyForSign,
    submitAgiSubmission,
    createAgiCorrectionVersion
  };

  function listEmployerContributionRulePacks({ effectiveDate = null } = {}) {
    return listPayrollRulePacks({ effectiveDate }).filter(
      (candidate) => candidate.machineReadableRules?.contributionClasses != null
    );
  }

  function listPayrollRulePacks({ effectiveDate = null } = {}) {
    return rules
      .listRulePacks({ domain: "payroll", jurisdiction: "SE" })
      .filter((candidate) => !effectiveDate || candidate.effectiveFrom <= effectiveDate)
      .map(copy);
  }

  function listPayItems({ companyId, activeOnly = false } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.payItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((payItemId) => state.payItems.get(payItemId))
      .filter(Boolean)
      .filter((candidate) => (activeOnly ? candidate.active !== false : true))
      .sort((left, right) => left.payItemCode.localeCompare(right.payItemCode))
      .map(copy);
  }

  function getPayItem({ companyId, payItemId = null, payItemCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (payItemId) {
      const payItem = state.payItems.get(requireText(payItemId, "pay_item_id_required"));
      if (!payItem || payItem.companyId !== resolvedCompanyId) {
        throw createError(404, "pay_item_not_found", "Pay item was not found.");
      }
      return copy(payItem);
    }
    const resolvedCode = requireText(payItemCode, "pay_item_code_required");
    const payItem = lookupByCode(state.payItemIdsByCode, state.payItems, resolvedCompanyId, resolvedCode);
    if (!payItem) {
      throw createError(404, "pay_item_not_found", "Pay item was not found.");
    }
    return copy(payItem);
  }

  function createPayItem({
    companyId,
    payItemCode,
    payItemType,
    displayName,
    calculationBasis,
    unitCode,
    compensationBucket,
    defaultUnitAmount = null,
    defaultRateFactor = null,
    taxTreatmentCode = "phase8_2_pending",
    employerContributionTreatmentCode = "phase8_2_pending",
    agiMappingCode = null,
    ledgerAccountCode = "phase8_3_pending",
    defaultDimensions = {},
    affectsVacationBasis = false,
    affectsPensionBasis = false,
    includedInNetPay = true,
    reportingOnly = false,
    active = true,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCode = normalizeCode(payItemCode, "pay_item_code_required");
    ensureUniqueCode(state.payItemIdsByCode, resolvedCompanyId, resolvedCode, "pay_item_code_exists");
    const record = {
      payItemId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      payItemCode: resolvedCode,
      payItemType: requireText(payItemType, "pay_item_type_required"),
      displayName: requireText(displayName, "pay_item_display_name_required"),
      calculationBasis: assertAllowed(calculationBasis, PAYROLL_CALCULATION_BASES, "pay_item_calculation_basis_invalid"),
      unitCode: requireText(unitCode, "pay_item_unit_code_required"),
      compensationBucket: assertAllowed(compensationBucket, PAYROLL_COMPENSATION_BUCKETS, "pay_item_bucket_invalid"),
      defaultUnitAmount: normalizeOptionalMoney(defaultUnitAmount, "pay_item_default_unit_amount_invalid"),
      defaultRateFactor: normalizeOptionalNumber(defaultRateFactor, "pay_item_default_rate_factor_invalid"),
      taxTreatmentCode: requireText(String(taxTreatmentCode), "pay_item_tax_treatment_required"),
      employerContributionTreatmentCode: requireText(
        String(employerContributionTreatmentCode),
        "pay_item_contribution_treatment_required"
      ),
      agiMappingCode: requireText(String(agiMappingCode || resolveDefaultAgiMappingCode(resolvedCode)), "pay_item_agi_mapping_required"),
      ledgerAccountCode: requireText(String(ledgerAccountCode), "pay_item_ledger_account_required"),
      defaultDimensions: copy(defaultDimensions || {}),
      affectsVacationBasis: affectsVacationBasis === true,
      affectsPensionBasis: affectsPensionBasis === true,
      includedInNetPay: includedInNetPay !== false,
      reportingOnly: reportingOnly === true,
      active: active !== false,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    state.payItems.set(record.payItemId, record);
    appendToIndex(state.payItemIdsByCompany, resolvedCompanyId, record.payItemId);
    setIndexValue(state.payItemIdsByCode, resolvedCompanyId, resolvedCode, record.payItemId);
    return copy(record);
  }

  function listPayCalendars({ companyId, activeOnly = false } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.payCalendarIdsByCompany.get(resolvedCompanyId) || [])
      .map((payCalendarId) => state.payCalendars.get(payCalendarId))
      .filter(Boolean)
      .filter((candidate) => (activeOnly ? candidate.active !== false : true))
      .sort((left, right) => left.payCalendarCode.localeCompare(right.payCalendarCode))
      .map(copy);
  }

  function getPayCalendar({ companyId, payCalendarId = null, payCalendarCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (payCalendarId) {
      const payCalendar = state.payCalendars.get(requireText(payCalendarId, "pay_calendar_id_required"));
      if (!payCalendar || payCalendar.companyId !== resolvedCompanyId) {
        throw createError(404, "pay_calendar_not_found", "Pay calendar was not found.");
      }
      return copy(payCalendar);
    }
    const resolvedCode = normalizeCode(payCalendarCode, "pay_calendar_code_required");
    const payCalendar = lookupByCode(state.payCalendarIdsByCode, state.payCalendars, resolvedCompanyId, resolvedCode);
    if (!payCalendar) {
      throw createError(404, "pay_calendar_not_found", "Pay calendar was not found.");
    }
    return copy(payCalendar);
  }

  function createPayCalendar({
    companyId,
    payCalendarCode,
    displayName,
    frequencyCode = "monthly",
    cutoffDay = 5,
    payDay = 25,
    timezone = "Europe/Stockholm",
    defaultCurrencyCode = "SEK",
    active = true,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCode = normalizeCode(payCalendarCode, "pay_calendar_code_required");
    ensureUniqueCode(state.payCalendarIdsByCode, resolvedCompanyId, resolvedCode, "pay_calendar_code_exists");
    const record = {
      payCalendarId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      payCalendarCode: resolvedCode,
      displayName: requireText(displayName, "pay_calendar_display_name_required"),
      frequencyCode: assertAllowed(frequencyCode, PAYROLL_FREQUENCY_CODES, "pay_calendar_frequency_invalid"),
      cutoffDay: normalizeIntegerInRange(cutoffDay, 1, 31, "pay_calendar_cutoff_day_invalid"),
      payDay: normalizeIntegerInRange(payDay, 1, 31, "pay_calendar_pay_day_invalid"),
      timezone: requireText(timezone, "pay_calendar_timezone_required"),
      defaultCurrencyCode: normalizeUpperCode(defaultCurrencyCode, "pay_calendar_currency_invalid", 3),
      active: active !== false,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.payCalendars.set(record.payCalendarId, record);
    appendToIndex(state.payCalendarIdsByCompany, resolvedCompanyId, record.payCalendarId);
    setIndexValue(state.payCalendarIdsByCode, resolvedCompanyId, resolvedCode, record.payCalendarId);
    return copy(record);
  }

  function listEmploymentStatutoryProfiles({ companyId, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const ids = employmentId
      ? [state.employmentStatutoryProfileIdByEmployment.get(requireText(employmentId, "employment_id_required"))].filter(Boolean)
      : state.employmentStatutoryProfileIdsByCompany.get(resolvedCompanyId) || [];
    return ids
      .map((employmentStatutoryProfileId) => state.employmentStatutoryProfiles.get(employmentStatutoryProfileId))
      .filter(Boolean)
      .filter((candidate) => candidate.companyId === resolvedCompanyId)
      .sort((left, right) => left.employmentId.localeCompare(right.employmentId))
      .map(copy);
  }

  function upsertEmploymentStatutoryProfile({
    companyId,
    employmentId,
    taxMode = "pending",
    taxRatePercent = null,
    contributionClassCode = null,
    sinkDecisionType = null,
    sinkValidFrom = null,
    sinkValidTo = null,
    sinkRatePercent = null,
    sinkSeaIncome = false,
    sinkDecisionDocumentId = null,
    fallbackTaxMode = null,
    fallbackTaxRatePercent = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    if (hrPlatform) {
      const matches = resolveEmploymentScope({
        companyId: resolvedCompanyId,
        employmentIds: [resolvedEmploymentId],
        period: { startsOn: "1900-01-01", endsOn: "2999-12-31" },
        hrPlatform
      });
      if (matches.length !== 1) {
        throw createError(404, "employment_not_found", "Employment was not found for statutory profile.");
      }
    }
    const normalized = normalizeStatutoryProfile({
      employmentId: resolvedEmploymentId,
      taxMode,
      taxRatePercent,
      contributionClassCode,
      sinkDecisionType,
      sinkValidFrom,
      sinkValidTo,
      sinkRatePercent,
      sinkSeaIncome,
      sinkDecisionDocumentId,
      fallbackTaxMode,
      fallbackTaxRatePercent
    });
    const existingId = state.employmentStatutoryProfileIdByEmployment.get(resolvedEmploymentId);
    const existing = existingId ? state.employmentStatutoryProfiles.get(existingId) : null;
    const record = {
      employmentStatutoryProfileId: existing?.employmentStatutoryProfileId || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      ...normalized,
      createdByActorId: existing?.createdByActorId || requireText(actorId, "actor_id_required"),
      createdAt: existing?.createdAt || nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.employmentStatutoryProfiles.set(record.employmentStatutoryProfileId, record);
    if (!existing) {
      appendToIndex(state.employmentStatutoryProfileIdsByCompany, resolvedCompanyId, record.employmentStatutoryProfileId);
    }
    state.employmentStatutoryProfileIdByEmployment.set(resolvedEmploymentId, record.employmentStatutoryProfileId);
    return copy(record);
  }

  function listPayRuns({ companyId, reportingPeriod = null, runType = null, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.payRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((payRunId) => state.payRuns.get(payRunId))
      .filter(Boolean)
      .filter((candidate) => (reportingPeriod ? candidate.reportingPeriod === reportingPeriod : true))
      .filter((candidate) => (runType ? candidate.runType === runType : true))
      .filter((candidate) => (employmentId ? candidate.employmentIds.includes(employmentId) : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
      .map((candidate) => enrichPayRun(state, candidate));
  }

  function getPayRun({ companyId, payRunId } = {}) {
    const payRun = requirePayRun(state, companyId, payRunId);
    return enrichPayRun(state, payRun);
  }

  function approvePayRun({ companyId, payRunId, actorId = "system" } = {}) {
    const payRun = requirePayRun(state, companyId, payRunId);
    if (payRun.status === "approved") {
      return enrichPayRun(state, payRun);
    }
    payRun.status = "approved";
    payRun.approvedAt = nowIso(clock);
    payRun.updatedAt = payRun.approvedAt;
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "approved",
      actorId,
      note: "Payroll run approved.",
      recordedAt: nowIso(clock)
    });
    return enrichPayRun(state, payRun);
  }

  function createPayRun({
    companyId,
    payCalendarId,
    reportingPeriod,
    payDate = null,
    runType = "regular",
    employmentIds = null,
    manualInputs = [],
    retroAdjustments = [],
    finalPayAdjustments = [],
    leavePayItemMappings = [],
    statutoryProfiles = [],
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const payCalendar = requirePayCalendar(state, resolvedCompanyId, payCalendarId);
    const resolvedRunType = assertAllowed(runType, PAY_RUN_TYPES, "pay_run_type_invalid");
    const period = resolvePayrollPeriod({
      reportingPeriod,
      payDate,
      payCalendar
    });
    const selectedEmployments = resolveEmploymentScope({
      companyId: resolvedCompanyId,
      employmentIds,
      period,
      hrPlatform
    });
    const normalizedManualInputs = normalizeManualInputs({
      companyId: resolvedCompanyId,
      manualInputs,
      state
    });
    const normalizedRetroAdjustments = normalizeRetroAdjustments({
      companyId: resolvedCompanyId,
      retroAdjustments,
      state
    });
    const normalizedFinalPayAdjustments = normalizeFinalPayAdjustments(finalPayAdjustments);
    const normalizedLeaveMappings = normalizeLeaveMappings(leavePayItemMappings);
    const normalizedStatutoryProfiles = mergeStatutoryProfileMaps({
      baseProfiles: listEmploymentStatutoryProfiles({ companyId: resolvedCompanyId }),
      overrideProfiles: statutoryProfiles
    });

    const run = {
      payRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      payCalendarId: payCalendar.payCalendarId,
      payCalendarCode: payCalendar.payCalendarCode,
      reportingPeriod: period.reportingPeriod,
      periodStartsOn: period.startsOn,
      periodEndsOn: period.endsOn,
      payDate: period.payDate,
      runType: resolvedRunType,
      status: "calculated",
      employmentIds: selectedEmployments.map((employment) => employment.employmentId),
      sourceSnapshotHash: "",
      warningCodes: [],
      calculatedAt: nowIso(clock),
      approvedAt: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      calculationSteps: []
    };

    const employmentResults = [];
    const warnings = [];
    const sourceSnapshot = {
      payRunId: run.payRunId,
      reportingPeriod: period.reportingPeriod,
      runType: run.runType,
      employmentIds: run.employmentIds,
      manualInputs: normalizedManualInputs,
      retroAdjustments: normalizedRetroAdjustments,
      finalPayAdjustments: normalizedFinalPayAdjustments,
      leavePayItemMappings: normalizedLeaveMappings,
      statutoryProfiles: [...normalizedStatutoryProfiles.values()]
    };

    for (const employment of selectedEmployments) {
      const result = calculateEmploymentRun({
        state,
        rules,
        employment,
        period,
        runType: run.runType,
        manualInputs: normalizedManualInputs.filter((item) => item.employmentId === employment.employmentId),
        retroAdjustments: normalizedRetroAdjustments.filter((item) => item.employmentId === employment.employmentId),
        finalPayAdjustments: normalizedFinalPayAdjustments.filter((item) => item.employmentId === employment.employmentId),
        leavePayItemMappings: normalizedLeaveMappings,
        statutoryProfile: normalizedStatutoryProfiles.get(employment.employmentId) || null,
        hrPlatform,
        timePlatform,
        clock
      });
      employmentResults.push(result);
      warnings.push(...result.warnings);
      sourceSnapshot[employment.employmentId] = result.sourceSnapshot;
    }

    run.sourceSnapshotHash = buildSnapshotHash(sourceSnapshot);
    run.warningCodes = [...new Set(warnings.map((warning) => warning.code))].sort();
    run.calculationSteps = PAYROLL_STEP_DEFINITIONS.map((definition) =>
      summarizeStep(definition, employmentResults.map((result) => result.steps[definition.stepNo]))
    );

    state.payRuns.set(run.payRunId, run);
    appendToIndex(state.payRunIdsByCompany, resolvedCompanyId, run.payRunId);
    appendRunEvent(state, {
      payRunId: run.payRunId,
      companyId: run.companyId,
      eventType: "created",
      actorId,
      note: `Created ${run.runType} payroll run ${run.reportingPeriod}.`,
      recordedAt: nowIso(clock)
    });
    appendRunEvent(state, {
      payRunId: run.payRunId,
      companyId: run.companyId,
      eventType: "calculated",
      actorId,
      note: `Calculated ${employmentResults.length} payslip(s).`,
      recordedAt: nowIso(clock)
    });

    for (const result of employmentResults) {
      for (const line of result.lines) {
        const stored = {
          ...copy(line),
          payRunLineId: crypto.randomUUID(),
          payRunId: run.payRunId,
          companyId: run.companyId,
          createdAt: nowIso(clock)
        };
        state.payRunLines.set(stored.payRunLineId, stored);
        appendToIndex(state.payRunLineIdsByRun, run.payRunId, stored.payRunLineId);
        appendToIndex(state.payRunLineIdsByEmployment, `${run.payRunId}:${stored.employmentId}`, stored.payRunLineId);
      }

      const payslip = createStoredPayslip({
        companyId: run.companyId,
        payRunId: run.payRunId,
        period,
        runType: run.runType,
        result,
        generatedByActorId: actorId,
        generatedAt: nowIso(clock)
      });
      state.payslips.set(payslip.payslipId, payslip);
      appendToIndex(state.payslipIdsByRun, run.payRunId, payslip.payslipId);
      setIndexValue(state.payslipIdsByRunEmployment, run.payRunId, payslip.employmentId, payslip.payslipId);
    }

    return getPayRun({
      companyId: run.companyId,
      payRunId: run.payRunId
    });
  }

  function listPaySlips({ companyId, payRunId } = {}) {
    const payRun = requirePayRun(state, companyId, payRunId);
    return (state.payslipIdsByRun.get(payRun.payRunId) || [])
      .map((payslipId) => state.payslips.get(payslipId))
      .filter(Boolean)
      .sort((left, right) => left.employeeId.localeCompare(right.employeeId))
      .map(enrichPayslip);
  }

  function getPaySlip({ companyId, payRunId, employmentId } = {}) {
    requirePayRun(state, companyId, payRunId);
    const payslipId = lookupCompositeValue(state.payslipIdsByRunEmployment, payRunId, requireText(employmentId, "employment_id_required"));
    if (!payslipId) {
      throw createError(404, "payslip_not_found", "Payslip was not found.");
    }
    const payslip = state.payslips.get(payslipId);
    if (!payslip || payslip.companyId !== companyId) {
      throw createError(404, "payslip_not_found", "Payslip was not found.");
    }
    return enrichPayslip(payslip);
  }

  function regeneratePaySlip({ companyId, payRunId, employmentId, actorId = "system" } = {}) {
    const payslip = getStoredPayslip({ companyId, payRunId, employmentId, state });
    const snapshotHash = buildSnapshotHash(payslip.renderPayload);
    if (snapshotHash !== payslip.snapshotHash) {
      throw createError(409, "payslip_snapshot_mismatch", "Stored payslip payload no longer matches the original hash.");
    }
    payslip.regenerationNo += 1;
    payslip.regeneratedAt = nowIso(clock);
    payslip.regeneratedByActorId = requireText(actorId, "actor_id_required");
    appendRunEvent(state, {
      payRunId,
      companyId,
      eventType: "payslip_regenerated",
      actorId,
      note: `Regenerated payslip for employment ${employmentId}.`,
      recordedAt: nowIso(clock)
    });
    return enrichPayslip(payslip);
  }

  function listAgiSubmissions({ companyId, reportingPeriod = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod, "agi_reporting_period_invalid") : null;
    return (state.agiSubmissionIdsByCompany.get(resolvedCompanyId) || [])
      .map((agiSubmissionId) => state.agiSubmissions.get(agiSubmissionId))
      .filter(Boolean)
      .filter((candidate) => (resolvedReportingPeriod ? candidate.reportingPeriod === resolvedReportingPeriod : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
      .map((candidate) => enrichAgiSubmission(state, candidate));
  }

  function getAgiSubmission({ companyId, agiSubmissionId } = {}) {
    return enrichAgiSubmission(state, requireAgiSubmission(state, companyId, agiSubmissionId));
  }

  function createAgiSubmission({ companyId, reportingPeriod, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "agi_reporting_period_required");
    const existing = findAgiSubmissionByPeriod(state, resolvedCompanyId, resolvedReportingPeriod);
    if (existing) {
      throw createError(409, "agi_submission_exists", "AGI submission already exists for the selected period.");
    }
    const periodRecord = ensureAgiPeriodRecord(state, resolvedCompanyId, resolvedReportingPeriod, clock);
    const submission = {
      agiSubmissionId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      agiPeriodId: periodRecord.agiPeriodId,
      reportingPeriod: resolvedReportingPeriod,
      currentVersionId: null,
      latestSubmittedVersionId: null,
      status: "draft",
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.agiSubmissions.set(submission.agiSubmissionId, submission);
    appendToIndex(state.agiSubmissionIdsByCompany, resolvedCompanyId, submission.agiSubmissionId);

    const materialized = materializeAgiSubmissionVersion({
      state,
      companyId: resolvedCompanyId,
      reportingPeriod: resolvedReportingPeriod,
      submissionId: submission.agiSubmissionId,
      previousVersion: null,
      correctionReason: null,
      clock,
      orgAuthPlatform,
      hrPlatform,
      timePlatform
    });
    persistAgiMaterialization(state, materialized);
    submission.currentVersionId = materialized.version.agiSubmissionVersionId;
    submission.status = materialized.version.state;
    submission.updatedAt = nowIso(clock);
    return getAgiSubmission({
      companyId: resolvedCompanyId,
      agiSubmissionId: submission.agiSubmissionId
    });
  }

  function validateAgiSubmission({ companyId, agiSubmissionId } = {}) {
    const submission = requireAgiSubmission(state, companyId, agiSubmissionId);
    const version = requireAgiSubmissionVersion(state, submission.currentVersionId);
    const validation = evaluateAgiValidation({
      state,
      submission,
      version,
      orgAuthPlatform,
      timePlatform
    });
    version.validationErrors = validation.errors;
    version.validationWarnings = validation.warnings;
    version.totalsMatch = validation.totalsMatch;
    version.validatedAt = nowIso(clock);
    version.state = validation.errors.length === 0 ? "validated" : "draft";
    version.updatedAt = version.validatedAt;
    submission.status = version.state;
    submission.updatedAt = version.validatedAt;
    return enrichAgiSubmission(state, submission);
  }

  function markAgiSubmissionReadyForSign({ companyId, agiSubmissionId, actorId = "system" } = {}) {
    const submission = requireAgiSubmission(state, companyId, agiSubmissionId);
    validateAgiSubmission({ companyId, agiSubmissionId });
    const version = requireAgiSubmissionVersion(state, submission.currentVersionId);
    if ((version.validationErrors || []).length > 0) {
      throw createError(409, "agi_submission_validation_failed", "AGI submission has blocking validation errors.");
    }
    if (version.state !== "validated") {
      throw createError(409, "agi_submission_not_validated", "AGI submission must be validated before sign preparation.");
    }
    version.state = "ready_for_sign";
    version.readyForSignAt = nowIso(clock);
    version.readyForSignByActorId = requireText(actorId, "actor_id_required");
    version.updatedAt = version.readyForSignAt;
    lockAgiLeaveSignals({
      version,
      timePlatform,
      actorId,
      lockState: "ready_for_sign"
    });
    submission.status = version.state;
    submission.updatedAt = version.readyForSignAt;
    return enrichAgiSubmission(state, submission);
  }

  function submitAgiSubmission({
    companyId,
    agiSubmissionId,
    actorId = "system",
    mode = "test",
    simulatedOutcome = "accepted",
    receiptMessage = null,
    receiptErrors = []
  } = {}) {
    const submission = requireAgiSubmission(state, companyId, agiSubmissionId);
    const version = requireAgiSubmissionVersion(state, submission.currentVersionId);
    if (version.state !== "ready_for_sign") {
      throw createError(409, "agi_submission_not_ready_for_sign", "AGI submission must be ready_for_sign before submit.");
    }

    appendAgiSignature(state, {
      version,
      actorId,
      clock
    });
    lockAgiLeaveSignals({
      version,
      timePlatform,
      actorId,
      lockState: "signed"
    });

    version.state = "submitted";
    version.submittedAt = nowIso(clock);
    version.submittedByActorId = requireText(actorId, "actor_id_required");
    version.submissionMode = requireText(mode, "agi_submission_mode_required");
    version.updatedAt = version.submittedAt;
    submission.status = version.state;
    submission.updatedAt = version.submittedAt;

    lockAgiLeaveSignals({
      version,
      timePlatform,
      actorId,
      lockState: "submitted"
    });

    const receipt = appendAgiReceipt(state, {
      version,
      simulatedOutcome,
      message: receiptMessage,
      actorId,
      clock
    });
    const normalizedReceiptErrors = normalizeAgiReceiptErrors(receiptErrors);
    if (normalizedReceiptErrors.length > 0) {
      appendAgiErrors(state, {
        version,
        receiptId: receipt.agiReceiptId,
        errors: normalizedReceiptErrors,
        clock
      });
    }

    version.state = resolveReceiptOutcomeState(receipt.receiptStatus);
    version.updatedAt = nowIso(clock);
    submission.latestSubmittedVersionId = version.agiSubmissionVersionId;
    submission.status = version.state;
    submission.updatedAt = version.updatedAt;
    if (version.previousSubmittedVersionId && ["accepted", "partially_rejected"].includes(version.state)) {
      const previousVersion = requireAgiSubmissionVersion(state, version.previousSubmittedVersionId);
      previousVersion.state = "superseded";
      previousVersion.supersededAt = version.updatedAt;
      previousVersion.updatedAt = version.updatedAt;
    }
    return enrichAgiSubmission(state, submission);
  }

  function createAgiCorrectionVersion({ companyId, agiSubmissionId, correctionReason, actorId = "system" } = {}) {
    const submission = requireAgiSubmission(state, companyId, agiSubmissionId);
    const previousSubmittedVersion = submission.latestSubmittedVersionId
      ? requireAgiSubmissionVersion(state, submission.latestSubmittedVersionId)
      : null;
    if (!previousSubmittedVersion) {
      throw createError(409, "agi_correction_requires_submitted_version", "A correction version requires a previously submitted AGI version.");
    }
    const materialized = materializeAgiSubmissionVersion({
      state,
      companyId: submission.companyId,
      reportingPeriod: submission.reportingPeriod,
      submissionId: submission.agiSubmissionId,
      previousVersion: previousSubmittedVersion,
      correctionReason: requireText(correctionReason, "agi_correction_reason_required"),
      clock,
      orgAuthPlatform,
      hrPlatform,
      timePlatform
    });
    persistAgiMaterialization(state, materialized);
    submission.currentVersionId = materialized.version.agiSubmissionVersionId;
    submission.status = materialized.version.state;
    submission.updatedAt = nowIso(clock);
    return enrichAgiSubmission(state, submission);
  }
}

function findAgiSubmissionByPeriod(state, companyId, reportingPeriod) {
  return (state.agiSubmissionIdsByCompany.get(companyId) || [])
    .map((agiSubmissionId) => state.agiSubmissions.get(agiSubmissionId))
    .filter(Boolean)
    .find((candidate) => candidate.reportingPeriod === reportingPeriod) || null;
}

function ensureAgiPeriodRecord(state, companyId, reportingPeriod, clock) {
  const key = `${companyId}:${reportingPeriod}`;
  const existingId = state.agiPeriodIdByCompanyPeriod.get(key);
  if (existingId) {
    return copy(state.agiPeriods.get(existingId));
  }
  const record = {
    agiPeriodId: crypto.randomUUID(),
    companyId,
    reportingPeriod,
    startsOn: `${reportingPeriod.slice(0, 4)}-${reportingPeriod.slice(4, 6)}-01`,
    endsOn: endOfMonth(Number(reportingPeriod.slice(0, 4)), Number(reportingPeriod.slice(4, 6))),
    createdAt: nowIso(clock)
  };
  state.agiPeriods.set(record.agiPeriodId, record);
  state.agiPeriodIdByCompanyPeriod.set(key, record.agiPeriodId);
  return copy(record);
}

function requireAgiSubmission(state, companyId, agiSubmissionId) {
  const submission = state.agiSubmissions.get(requireText(agiSubmissionId, "agi_submission_id_required"));
  if (!submission || submission.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "agi_submission_not_found", "AGI submission was not found.");
  }
  return submission;
}

function requireAgiSubmissionVersion(state, agiSubmissionVersionId) {
  const version = state.agiSubmissionVersions.get(requireText(agiSubmissionVersionId, "agi_submission_version_id_required"));
  if (!version) {
    throw createError(404, "agi_submission_version_not_found", "AGI submission version was not found.");
  }
  return version;
}

function enrichAgiSubmission(state, submission) {
  const currentVersion = submission.currentVersionId ? state.agiSubmissionVersions.get(submission.currentVersionId) || null : null;
  const versions = (state.agiSubmissionVersionIdsBySubmission.get(submission.agiSubmissionId) || [])
    .map((agiSubmissionVersionId) => state.agiSubmissionVersions.get(agiSubmissionVersionId))
    .filter(Boolean)
    .sort((left, right) => left.versionNo - right.versionNo)
    .map((version) => ({
      ...copy(version),
      employees: (state.agiEmployeeIdsByVersion.get(version.agiSubmissionVersionId) || [])
        .map((agiEmployeeId) => state.agiEmployees.get(agiEmployeeId))
        .filter(Boolean)
        .map((employee) => ({
          ...copy(employee),
          lines: (state.agiEmployeeLineIdsByEmployee.get(employee.agiEmployeeId) || [])
            .map((agiEmployeeLineId) => state.agiEmployeeLines.get(agiEmployeeLineId))
            .filter(Boolean)
            .map(copy)
        })),
      absencePayloads: (state.agiAbsencePayloadIdsByVersion.get(version.agiSubmissionVersionId) || [])
        .map((agiAbsencePayloadId) => state.agiAbsencePayloads.get(agiAbsencePayloadId))
        .filter(Boolean)
        .map(copy),
      receipts: (state.agiReceiptIdsByVersion.get(version.agiSubmissionVersionId) || [])
        .map((agiReceiptId) => state.agiReceipts.get(agiReceiptId))
        .filter(Boolean)
        .map(copy),
      errors: (state.agiErrorIdsByVersion.get(version.agiSubmissionVersionId) || [])
        .map((agiErrorId) => state.agiErrors.get(agiErrorId))
        .filter(Boolean)
        .map(copy),
      signatures: (state.agiSignatureIdsByVersion.get(version.agiSubmissionVersionId) || [])
        .map((agiSignatureId) => state.agiSignatures.get(agiSignatureId))
        .filter(Boolean)
        .map(copy)
    }));
  return {
    ...copy(submission),
    currentVersion: currentVersion ? versions.find((candidate) => candidate.agiSubmissionVersionId === currentVersion.agiSubmissionVersionId) || null : null,
    versions
  };
}

function persistAgiMaterialization(state, materialized) {
  const version = copy(materialized.version);
  state.agiSubmissionVersions.set(version.agiSubmissionVersionId, version);
  appendToIndex(state.agiSubmissionVersionIdsBySubmission, version.agiSubmissionId, version.agiSubmissionVersionId);

  for (const employee of materialized.employees) {
    const record = {
      ...copy(employee),
      agiSubmissionVersionId: version.agiSubmissionVersionId
    };
    state.agiEmployees.set(record.agiEmployeeId, record);
    appendToIndex(state.agiEmployeeIdsByVersion, version.agiSubmissionVersionId, record.agiEmployeeId);
  }
  for (const line of materialized.employeeLines) {
    const record = {
      ...copy(line),
      agiSubmissionVersionId: version.agiSubmissionVersionId
    };
    state.agiEmployeeLines.set(record.agiEmployeeLineId, record);
    appendToIndex(state.agiEmployeeLineIdsByEmployee, record.agiEmployeeId, record.agiEmployeeLineId);
  }
  for (const absencePayload of materialized.absencePayloads) {
    const record = {
      ...copy(absencePayload),
      agiSubmissionVersionId: version.agiSubmissionVersionId
    };
    state.agiAbsencePayloads.set(record.agiAbsencePayloadId, record);
    appendToIndex(state.agiAbsencePayloadIdsByVersion, version.agiSubmissionVersionId, record.agiAbsencePayloadId);
  }
}

function materializeAgiSubmissionVersion({
  state,
  companyId,
  reportingPeriod,
  submissionId,
  previousVersion = null,
  correctionReason = null,
  clock,
  orgAuthPlatform,
  hrPlatform,
  timePlatform
}) {
  const approvedRuns = collectApprovedPayRunsForPeriod(state, companyId, reportingPeriod);
  const sourceSnapshotHash = buildAgiSourceSnapshotHash(approvedRuns);
  const companyContext = resolveCompanyComplianceContext(orgAuthPlatform, companyId);
  const materializedAt = nowIso(clock);
  const employeeGroups = buildAgiEmployeeGroups({
    state,
    companyId,
    reportingPeriod,
    approvedRuns,
    hrPlatform,
    timePlatform
  });
  const employees = [];
  const employeeLines = [];
  const absencePayloads = [];
  const validationWarnings = [];
  const lockEmploymentIds = new Set();

  for (const group of employeeGroups) {
    const materializedEmployee = materializeAgiEmployeeGroup({
      companyId,
      reportingPeriod,
      group,
      createdAt: materializedAt
    });
    employees.push(materializedEmployee.employee);
    employeeLines.push(...materializedEmployee.lines);
    absencePayloads.push(...materializedEmployee.absencePayloads);
    validationWarnings.push(...materializedEmployee.warnings);
    for (const employmentId of materializedEmployee.lockEmploymentIds) {
      lockEmploymentIds.add(employmentId);
    }
  }

  const payload = {
    employer: {
      companyId,
      legalName: companyContext.legalName,
      orgNumber: companyContext.orgNumber,
      employerRegistrationValue: companyContext.employerRegistrationValue
    },
    reportingPeriod,
    sourcePayRunIds: approvedRuns.map((run) => run.payRunId),
    totals: summarizeAgiEmployeeTotals(employees),
    employees: employees.map((employee) => copy(employee.payloadJson)),
    generatedAt: materializedAt,
    correctionReason: correctionReason || null,
    previousSubmittedVersionId: previousVersion?.agiSubmissionVersionId || null
  };
  const changedEmployeeIds = previousVersion ? diffAgiEmployees(previousVersion.payloadJson?.employees || [], payload.employees) : [];
  const version = {
    agiSubmissionVersionId: crypto.randomUUID(),
    agiSubmissionId: submissionId,
    companyId,
    reportingPeriod,
    versionNo: previousVersion ? previousVersion.versionNo + 1 : 1,
    state: "draft",
    previousVersionId: previousVersion?.agiSubmissionVersionId || null,
    previousSubmittedVersionId: previousVersion?.agiSubmissionVersionId || null,
    correctionReason: correctionReason || null,
    sourcePayRunIds: approvedRuns.map((run) => run.payRunId),
    sourceSnapshotHash,
    payloadHash: buildSnapshotHash(payload),
    payloadJson: payload,
    adapterPayloadJson: {
      mode: "test",
      payloadVersion: "agi-json-v1",
      payload
    },
    changedEmployeeIds,
    lockEmploymentIds: [...lockEmploymentIds].sort(),
    validationErrors: [],
    validationWarnings,
    totalsMatch: true,
    createdAt: materializedAt,
    updatedAt: materializedAt
  };
  return {
    version,
    employees,
    employeeLines,
    absencePayloads
  };
}

function collectApprovedPayRunsForPeriod(state, companyId, reportingPeriod) {
  return (state.payRunIdsByCompany.get(companyId) || [])
    .map((payRunId) => state.payRuns.get(payRunId))
    .filter(Boolean)
    .filter((payRun) => payRun.reportingPeriod === reportingPeriod)
    .filter((payRun) => payRun.status === "approved")
    .sort((left, right) => left.payDate.localeCompare(right.payDate) || left.createdAt.localeCompare(right.createdAt));
}

function buildAgiSourceSnapshotHash(payRuns) {
  return buildSnapshotHash(
    (payRuns || []).map((payRun) => ({
      payRunId: payRun.payRunId,
      reportingPeriod: payRun.reportingPeriod,
      payDate: payRun.payDate,
      runType: payRun.runType,
      status: payRun.status,
      sourceSnapshotHash: payRun.sourceSnapshotHash
    }))
  );
}

function buildAgiEmployeeGroups({ state, companyId, reportingPeriod, approvedRuns, hrPlatform, timePlatform }) {
  const groups = new Map();
  for (const payRun of approvedRuns) {
    const payslips = (state.payslipIdsByRun.get(payRun.payRunId) || [])
      .map((payslipId) => state.payslips.get(payslipId))
      .filter(Boolean);
    for (const payslip of payslips) {
      const employeeId = payslip.employeeId;
      const employee = resolveEmployeeComplianceSnapshot({ companyId, employeeId, hrPlatform });
      const current = groups.get(employeeId) || {
        employee,
        lines: [],
        payslips: [],
        leaveSignals: [],
        leaveEntries: [],
        employmentIds: new Set()
      };
      current.payslips.push(copy(payslip));
      current.employmentIds.add(payslip.employmentId);
      groups.set(employeeId, current);
    }
    const lines = (state.payRunLineIdsByRun.get(payRun.payRunId) || [])
      .map((payRunLineId) => state.payRunLines.get(payRunLineId))
      .filter(Boolean);
    for (const line of lines) {
      const employee = resolveEmployeeComplianceSnapshot({ companyId, employeeId: line.employeeId, hrPlatform });
      const current = groups.get(line.employeeId) || {
        employee,
        lines: [],
        payslips: [],
        leaveSignals: [],
        leaveEntries: [],
        employmentIds: new Set()
      };
      current.lines.push(copy(line));
      current.employmentIds.add(line.employmentId);
      groups.set(line.employeeId, current);
    }
  }

  if (timePlatform?.listLeaveSignals || timePlatform?.listLeaveEntries) {
    for (const group of groups.values()) {
      for (const employmentId of group.employmentIds) {
        if (timePlatform?.listLeaveSignals) {
          group.leaveSignals.push(
            ...timePlatform.listLeaveSignals({
              companyId,
              employmentId,
              reportingPeriod
            })
          );
        }
        if (timePlatform?.listLeaveEntries) {
          group.leaveEntries.push(
            ...timePlatform
              .listLeaveEntries({
                companyId,
                employmentId
              })
              .filter((entry) => entry.reportingPeriod === reportingPeriod)
          );
        }
      }
    }
  }

  return [...groups.values()].sort((left, right) => left.employee.employeeId.localeCompare(right.employee.employeeId));
}

function materializeAgiEmployeeGroup({ companyId, reportingPeriod, group, createdAt }) {
  const fieldTotals = {
    cashCompensationAmount: 0,
    taxableBenefitAmount: 0,
    taxFreeAllowanceAmount: 0,
    pensionPremiumAmount: 0
  };
  const mappingIssues = [];
  const agiEmployeeId = crypto.randomUUID();
  const lineRecords = group.lines.map((line) => {
    const effectiveAmount = directionalAmount(line);
    if (line.agiMappingCode === "cash_compensation") {
      fieldTotals.cashCompensationAmount = roundMoney(fieldTotals.cashCompensationAmount + effectiveAmount);
    } else if (line.agiMappingCode === "taxable_benefit") {
      fieldTotals.taxableBenefitAmount = roundMoney(fieldTotals.taxableBenefitAmount + Math.abs(line.amount || 0));
    } else if (line.agiMappingCode === "tax_free_allowance") {
      fieldTotals.taxFreeAllowanceAmount = roundMoney(fieldTotals.taxFreeAllowanceAmount + Math.abs(line.amount || 0));
    } else if (line.agiMappingCode === "pension_premium") {
      fieldTotals.pensionPremiumAmount = roundMoney(fieldTotals.pensionPremiumAmount + Math.abs(line.amount || 0));
    } else if (line.agiMappingCode !== "not_reported") {
      mappingIssues.push({
        code: "agi_mapping_invalid",
        payItemCode: line.payItemCode,
        agiMappingCode: line.agiMappingCode
      });
    }
    return {
      agiEmployeeLineId: crypto.randomUUID(),
      agiEmployeeId,
      agiSubmissionVersionId: null,
      companyId,
      employeeId: group.employee.employeeId,
      sourcePayRunId: line.payRunId,
      sourcePayRunLineId: line.payRunLineId,
      payItemCode: line.payItemCode,
      agiMappingCode: line.agiMappingCode,
      amount: roundMoney(line.amount || 0),
      directionalAmount: effectiveAmount,
      payloadJson: copy(line)
    };
  });

  const taxFieldCodes = new Set(
    group.payslips
      .map((payslip) => payslip.renderPayload?.totals?.taxDecision?.outputs?.taxFieldCode || null)
      .filter(Boolean)
  );
  const preliminaryTaxAmount = roundMoney(
    group.payslips
      .filter((payslip) => payslip.renderPayload?.totals?.taxDecision?.outputs?.taxFieldCode === "preliminary_tax")
      .reduce((sum, payslip) => sum + Number(payslip.renderPayload?.totals?.preliminaryTax || 0), 0)
  );
  const sinkTaxAmount = roundMoney(
    group.payslips
      .filter((payslip) => payslip.renderPayload?.totals?.taxDecision?.outputs?.taxFieldCode === "sink_tax")
      .reduce((sum, payslip) => sum + Number(payslip.renderPayload?.totals?.preliminaryTax || 0), 0)
  );

  const absencePayloads = group.leaveSignals.map((signal) => ({
    agiAbsencePayloadId: crypto.randomUUID(),
    agiSubmissionVersionId: null,
    agiEmployeeId,
    companyId,
    employeeId: group.employee.employeeId,
    employmentId: signal.employmentId,
    signalType: signal.signalType,
    reportingPeriod: signal.reportingPeriod,
    workDate: signal.workDate,
    extentPercent: signal.extentPercent ?? null,
    extentHours: signal.extentHours ?? null,
    payloadJson: copy(signal)
  }));

  const reportableLeaveEntries = group.leaveEntries.filter((entry) => (entry.signals || []).length > 0);
  const incompleteAbsence = reportableLeaveEntries.some(
    (entry) => entry.signalCompleteness?.complete === false || (entry.signals || []).some((signal) => signal.complete !== true)
  );
  const unapprovedAbsenceCount = reportableLeaveEntries.filter((entry) => entry.status !== "approved").length;
  const employeePayload = {
    employeeId: group.employee.employeeId,
    personIdentifierType: normalizeOptionalText(group.employee.identityType) || "other",
    personIdentifier: normalizeOptionalText(group.employee.identityValue) || normalizeOptionalText(group.employee.identityValueMasked),
    protectedIdentity: group.employee.protectedIdentity === true,
    countryCode: group.employee.countryCode || null,
    compensationFields: fieldTotals,
    taxFields: {
      preliminaryTax: taxFieldCodes.has("preliminary_tax") ? preliminaryTaxAmount : null,
      sinkTax: taxFieldCodes.has("sink_tax") ? sinkTaxAmount : null
    },
    taxFieldCount: taxFieldCodes.size,
    sourcePayRunIds: [...new Set(group.lines.map((line) => line.payRunId).filter(Boolean))].sort(),
    sourcePayRunLineIds: [...new Set(group.lines.map((line) => line.payRunLineId).filter(Boolean))].sort(),
    sourceEmploymentIds: [...group.employmentIds].sort(),
    mappingIssues,
    absence: {
      signalCount: absencePayloads.length,
      incomplete: incompleteAbsence,
      unapprovedEntryCount: unapprovedAbsenceCount
    }
  };
  const employeeRecord = {
    agiEmployeeId,
    agiSubmissionVersionId: null,
    companyId,
    employeeId: group.employee.employeeId,
    personIdentifierType: employeePayload.personIdentifierType,
    personIdentifier: employeePayload.personIdentifier,
    protectedIdentity: employeePayload.protectedIdentity,
    payloadHash: buildSnapshotHash(employeePayload),
    payloadJson: employeePayload,
    createdAt
  };

  const warnings = [];
  if (mappingIssues.length > 0) {
    warnings.push(createWarning("agi_mapping_invalid", `Employee ${group.employee.employeeId} has invalid AGI mappings.`));
  }

  return {
    employee: employeeRecord,
    lines: lineRecords,
    absencePayloads,
    warnings,
    lockEmploymentIds: reportableLeaveEntries.map((entry) => entry.employmentId)
  };
}

function summarizeAgiEmployeeTotals(employees) {
  return employees.reduce(
    (summary, employee) => {
      const payload = employee.payloadJson;
      summary.employeeCount += 1;
      summary.cashCompensationAmount = roundMoney(summary.cashCompensationAmount + Number(payload.compensationFields.cashCompensationAmount || 0));
      summary.taxableBenefitAmount = roundMoney(summary.taxableBenefitAmount + Number(payload.compensationFields.taxableBenefitAmount || 0));
      summary.taxFreeAllowanceAmount = roundMoney(summary.taxFreeAllowanceAmount + Number(payload.compensationFields.taxFreeAllowanceAmount || 0));
      summary.pensionPremiumAmount = roundMoney(summary.pensionPremiumAmount + Number(payload.compensationFields.pensionPremiumAmount || 0));
      summary.preliminaryTaxAmount = roundMoney(summary.preliminaryTaxAmount + Number(payload.taxFields.preliminaryTax || 0));
      summary.sinkTaxAmount = roundMoney(summary.sinkTaxAmount + Number(payload.taxFields.sinkTax || 0));
      return summary;
    },
    {
      employeeCount: 0,
      cashCompensationAmount: 0,
      taxableBenefitAmount: 0,
      taxFreeAllowanceAmount: 0,
      pensionPremiumAmount: 0,
      preliminaryTaxAmount: 0,
      sinkTaxAmount: 0
    }
  );
}

function diffAgiEmployees(previousEmployees, currentEmployees) {
  const previousByEmployee = new Map((previousEmployees || []).map((employee) => [employee.employeeId, buildSnapshotHash(employee)]));
  const currentByEmployee = new Map((currentEmployees || []).map((employee) => [employee.employeeId, buildSnapshotHash(employee)]));
  return [...new Set([...previousByEmployee.keys(), ...currentByEmployee.keys()])]
    .filter((employeeId) => previousByEmployee.get(employeeId) !== currentByEmployee.get(employeeId))
    .sort();
}

function evaluateAgiValidation({ state, submission, version, orgAuthPlatform, timePlatform }) {
  const errors = [];
  const warnings = [...(version.validationWarnings || [])];
  const companyContext = resolveCompanyComplianceContext(orgAuthPlatform, submission.companyId);
  if (!companyContext.employerRegistered) {
    errors.push(createAgiValidationError("company_employer_registration_missing", "Company is not employer-registered."));
  }
  if (!companyContext.orgNumber) {
    errors.push(createAgiValidationError("company_org_number_missing", "Company org number is required for AGI submission."));
  }

  const currentSourceSnapshotHash = buildAgiSourceSnapshotHash(collectApprovedPayRunsForPeriod(state, submission.companyId, submission.reportingPeriod));
  if (currentSourceSnapshotHash !== version.sourceSnapshotHash) {
    errors.push(createAgiValidationError("agi_source_changed_since_build", "Approved payroll runs changed after the AGI draft was built."));
  }

  const payload = version.payloadJson || {};
  const employees = Array.isArray(payload.employees) ? payload.employees : [];
  if (employees.length === 0) {
    errors.push(createAgiValidationError("agi_employee_payload_missing", "AGI submission requires at least one employee payload."));
  }
  for (const employee of employees) {
    if (!employee.personIdentifier || employee.personIdentifierType === "other") {
      errors.push(createAgiValidationError("agi_employee_identity_incomplete", `Employee ${employee.employeeId} is missing a compliant identifier.`));
    }
    if (employee.taxFieldCount !== 1) {
      errors.push(createAgiValidationError("agi_tax_field_invalid", `Employee ${employee.employeeId} must populate exactly one tax field.`));
    }
    if (Array.isArray(employee.mappingIssues) && employee.mappingIssues.length > 0) {
      errors.push(createAgiValidationError("agi_mapping_missing", `Employee ${employee.employeeId} has AGI mapping gaps.`));
    }
    if (employee.absence?.incomplete === true || Number(employee.absence?.unapprovedEntryCount || 0) > 0) {
      errors.push(createAgiValidationError("agi_absence_incomplete", `Employee ${employee.employeeId} has incomplete or unattested AGI-related absence.`));
    }
  }

  if (version.previousSubmittedVersionId && (version.changedEmployeeIds || []).length > 0 && !version.correctionReason) {
    errors.push(createAgiValidationError("agi_correction_reason_required", "Changed employees require a correction reason."));
  }

  const totals = summarizeAgiEmployeeTotals(
    (state.agiEmployeeIdsByVersion.get(version.agiSubmissionVersionId) || [])
      .map((agiEmployeeId) => state.agiEmployees.get(agiEmployeeId))
      .filter(Boolean)
  );
  const expectedTotals = payload.totals || {};
  const totalsMatch =
    roundMoney(totals.cashCompensationAmount) === roundMoney(expectedTotals.cashCompensationAmount || 0) &&
    roundMoney(totals.taxableBenefitAmount) === roundMoney(expectedTotals.taxableBenefitAmount || 0) &&
    roundMoney(totals.preliminaryTaxAmount) === roundMoney(expectedTotals.preliminaryTaxAmount || 0) &&
    roundMoney(totals.sinkTaxAmount) === roundMoney(expectedTotals.sinkTaxAmount || 0) &&
    totals.employeeCount === Number(expectedTotals.employeeCount || 0);
  if (!totalsMatch) {
    errors.push(createAgiValidationError("agi_totals_mismatch", "AGI totals do not match the employee payloads."));
  }

  const leaveLocksExist =
    timePlatform?.listLeaveSignalLocks &&
    (version.lockEmploymentIds || []).some(
      (employmentId) =>
        timePlatform.listLeaveSignalLocks({
          companyId: submission.companyId,
          employmentId,
          reportingPeriod: submission.reportingPeriod
        }).length > 0
    );
  if (leaveLocksExist) {
    warnings.push(createWarning("agi_leave_signals_locked", "Leave signal locks already exist for this version chain."));
  }
  return {
    errors,
    warnings,
    totalsMatch
  };
}

function createAgiValidationError(code, message) {
  return {
    code,
    message
  };
}

function lockAgiLeaveSignals({ version, timePlatform, actorId, lockState }) {
  if (!timePlatform?.lockLeaveSignals) {
    return;
  }
  for (const employmentId of version.lockEmploymentIds || []) {
    timePlatform.lockLeaveSignals({
      companyId: version.companyId,
      employmentId,
      reportingPeriod: version.reportingPeriod,
      lockState,
      sourceReference: `agi:${version.agiSubmissionVersionId}`,
      actorId
    });
  }
}

function appendAgiSignature(state, { version, actorId, clock }) {
  const existing = (state.agiSignatureIdsByVersion.get(version.agiSubmissionVersionId) || []).length > 0;
  if (existing) {
    return;
  }
  const signature = {
    agiSignatureId: crypto.randomUUID(),
    agiSubmissionVersionId: version.agiSubmissionVersionId,
    companyId: version.companyId,
    signedByActorId: requireText(actorId, "actor_id_required"),
    signedAt: nowIso(clock),
    signatureRef: `test-signature:${version.agiSubmissionVersionId}`
  };
  state.agiSignatures.set(signature.agiSignatureId, signature);
  appendToIndex(state.agiSignatureIdsByVersion, version.agiSubmissionVersionId, signature.agiSignatureId);
}

function appendAgiReceipt(state, { version, simulatedOutcome, message, actorId, clock }) {
  const receipt = {
    agiReceiptId: crypto.randomUUID(),
    agiSubmissionVersionId: version.agiSubmissionVersionId,
    companyId: version.companyId,
    receiptStatus: assertAllowed(simulatedOutcome, ["accepted", "partially_rejected", "rejected"], "agi_receipt_status_invalid"),
    receiptCode: `test:${simulatedOutcome}`,
    message: normalizeOptionalText(message) || `Test-mode AGI receipt: ${simulatedOutcome}.`,
    receivedByActorId: requireText(actorId, "actor_id_required"),
    receivedAt: nowIso(clock),
    payloadJson: {
      mode: "test",
      outcome: simulatedOutcome
    }
  };
  state.agiReceipts.set(receipt.agiReceiptId, receipt);
  appendToIndex(state.agiReceiptIdsByVersion, version.agiSubmissionVersionId, receipt.agiReceiptId);
  return receipt;
}

function appendAgiErrors(state, { version, receiptId, errors, clock }) {
  for (const error of errors) {
    const record = {
      agiErrorId: crypto.randomUUID(),
      agiSubmissionVersionId: version.agiSubmissionVersionId,
      companyId: version.companyId,
      agiReceiptId: receiptId,
      errorCode: requireText(error.errorCode, "agi_error_code_required"),
      message: requireText(error.message, "agi_error_message_required"),
      severity: requireText(error.severity || "error", "agi_error_severity_required"),
      payloadJson: copy(error.payload || {}),
      createdAt: nowIso(clock)
    };
    state.agiErrors.set(record.agiErrorId, record);
    appendToIndex(state.agiErrorIdsByVersion, version.agiSubmissionVersionId, record.agiErrorId);
  }
}

function normalizeAgiReceiptErrors(receiptErrors) {
  if (!Array.isArray(receiptErrors)) {
    return [];
  }
  return receiptErrors.map((error) => ({
    errorCode: requireText(error.errorCode || error.code, "agi_error_code_required"),
    message: requireText(error.message, "agi_error_message_required"),
    severity: normalizeOptionalText(error.severity) || "error",
    payload: copy(error.payload || {})
  }));
}

function resolveReceiptOutcomeState(receiptStatus) {
  if (receiptStatus === "accepted") {
    return "accepted";
  }
  if (receiptStatus === "partially_rejected") {
    return "partially_rejected";
  }
  return "rejected";
}

function resolveCompanyComplianceContext(orgAuthPlatform, companyId) {
  const company = orgAuthPlatform?.getCompanyProfile ? orgAuthPlatform.getCompanyProfile({ companyId }) : null;
  const registrations = orgAuthPlatform?.listCompanyRegistrations ? orgAuthPlatform.listCompanyRegistrations({ companyId }) : [];
  const employerRegistration = registrations.find(
    (registration) => registration.registrationType === "employer" && registration.status === "configured"
  );
  return {
    legalName: company?.legalName || null,
    orgNumber: company?.orgNumber || null,
    employerRegistered: employerRegistration != null,
    employerRegistrationValue: employerRegistration?.registrationValue || null
  };
}

function resolveEmployeeComplianceSnapshot({ companyId, employeeId, hrPlatform }) {
  if (hrPlatform?.getEmployeeComplianceSnapshot) {
    return hrPlatform.getEmployeeComplianceSnapshot({ companyId, employeeId });
  }
  if (hrPlatform?.getEmployee) {
    return hrPlatform.getEmployee({ companyId, employeeId });
  }
  return {
    employeeId,
    identityType: "other",
    identityValue: null,
    identityValueMasked: null,
    protectedIdentity: false,
    countryCode: "SE"
  };
}

function buildAgiPreview({ companyId, period, employee, employment, lines, leaveEntries, timePlatform, taxPreview, payslipTotals, warnings }) {
  const leaveSignals = timePlatform?.listLeaveSignals
    ? timePlatform.listLeaveSignals({
        companyId,
        employmentId: employment.employmentId,
        reportingPeriod: period.reportingPeriod
      })
    : [];
  const mappingSummary = {
    cashCompensationLineCount: lines.filter((line) => line.agiMappingCode === "cash_compensation").length,
    taxableBenefitLineCount: lines.filter((line) => line.agiMappingCode === "taxable_benefit").length,
    taxFreeAllowanceLineCount: lines.filter((line) => line.agiMappingCode === "tax_free_allowance").length,
    pensionPremiumLineCount: lines.filter((line) => line.agiMappingCode === "pension_premium").length
  };
  const invalidMappings = lines.filter(
    (line) => !["cash_compensation", "taxable_benefit", "tax_free_allowance", "pension_premium", "not_reported"].includes(line.agiMappingCode)
  );
  if (invalidMappings.length > 0) {
    warnings.push(createWarning("agi_mapping_invalid", `Payroll run has invalid AGI mapping codes for employment ${employment.employmentNo}.`));
  }
  const previewPayload = {
    employeeId: employee.employeeId,
    reportingPeriod: period.reportingPeriod,
    taxFieldCode: taxPreview.taxFieldCode,
    preliminaryTax: taxPreview.amount,
    leaveSignalCount: leaveSignals.length,
    reportableLeaveEntryCount: leaveEntries.filter((entry) => (entry.signals || []).length > 0).length,
    mappingSummary
  };
  const details = {
    payloadHash: buildSnapshotHash(previewPayload),
    ...previewPayload
  };
  if (invalidMappings.length > 0 || !taxPreview.taxFieldCode) {
    return {
      step: createPendingStep(16, {
        status: "validation_required",
        ...details
      })
    };
  }
  return {
    step: createCompletedStep(16, details)
  };
}

function resolveEffectiveTaxProfile({ statutoryProfile, effectiveDate, rulePack }) {
  if (!statutoryProfile) {
    return null;
  }
  if (statutoryProfile.taxMode === "sink") {
    const insideInterval =
      (!statutoryProfile.sinkValidFrom || statutoryProfile.sinkValidFrom <= effectiveDate) &&
      (!statutoryProfile.sinkValidTo || statutoryProfile.sinkValidTo >= effectiveDate);
    if (insideInterval) {
      const sinkDefaults = rulePack.machineReadableRules?.sink || {};
      return {
        ...copy(statutoryProfile),
        taxMode: "sink",
        sinkRatePercent:
          statutoryProfile.sinkRatePercent ??
          (statutoryProfile.sinkSeaIncome === true ? sinkDefaults.seaIncomeRatePercent : sinkDefaults.standardRatePercent)
      };
    }
    if (statutoryProfile.fallbackTaxMode) {
      return {
        ...copy(statutoryProfile),
        taxMode: statutoryProfile.fallbackTaxMode,
        taxRatePercent: statutoryProfile.fallbackTaxRatePercent ?? statutoryProfile.taxRatePercent ?? null,
        fallbackApplied: true
      };
    }
    return {
      ...copy(statutoryProfile),
      taxMode: "pending",
      fallbackApplied: false
    };
  }
  return copy(statutoryProfile);
}

function calculateEmploymentRun({
  state,
  rules,
  employment,
  period,
  runType,
  manualInputs,
  retroAdjustments,
  finalPayAdjustments,
  leavePayItemMappings,
  statutoryProfile,
  hrPlatform,
  timePlatform,
  clock
}) {
  const employee = resolveEmployeeSnapshot({ employment, hrPlatform });
  const contract = resolveActiveEmploymentContract(employment, period.endsOn);
  const employeeBankAccounts = hrPlatform?.listEmployeeBankAccounts
    ? hrPlatform.listEmployeeBankAccounts({
        companyId: employment.companyId,
        employeeId: employment.employeeId
      })
    : [];
  const primaryBankAccount = employeeBankAccounts.find((account) => account.primaryAccount) || employeeBankAccounts[0] || null;

  const timeEntries = listEmploymentTimeEntries({ companyId: employment.companyId, employmentId: employment.employmentId, period, timePlatform });
  const leaveEntries = listEmploymentLeaveEntries({ companyId: employment.companyId, employmentId: employment.employmentId, period, timePlatform });
  const balances = timePlatform?.listTimeBalances
    ? timePlatform.listTimeBalances({
        companyId: employment.companyId,
        employmentId: employment.employmentId,
        cutoffDate: period.endsOn
      })
    : {
        balances: {
          flex_minutes: 0,
          comp_minutes: 0,
          overtime_minutes: 0
        }
      };

  const sourceSnapshot = {
    employee,
    employment,
    contract,
    primaryBankAccount,
    timeEntries,
    leaveEntries,
    balances
  };

  const warnings = [];
  const lines = [];
  const steps = {};

  steps[1] = createCompletedStep(1, {
    employmentId: employment.employmentId,
    employmentNo: employment.employmentNo,
    employeeId: employment.employeeId,
    reportingPeriod: period.reportingPeriod
  });
  steps[2] = createCompletedStep(2, {
    timeEntryCount: timeEntries.length,
    leaveEntryCount: leaveEntries.length,
    balanceSnapshotHash: buildSnapshotHash(balances)
  });

  const baseLines = createBaseSalaryLines({
    companyId: employment.companyId,
    employment,
    contract,
    runType,
    state,
    warnings
  });
  lines.push(...baseLines);
  steps[3] = createCompletedStep(3, summarizeLineStep(baseLines));

  const variableLines = createVariableLines({
    companyId: employment.companyId,
    employment,
    contract,
    timeEntries,
    leaveEntries,
    leavePayItemMappings,
    manualInputs: manualInputs.filter((input) => input.processingStep === 4),
    state,
    warnings
  });
  const finalPayLines = createFinalPayLines({
    companyId: employment.companyId,
    employment,
    finalPayAdjustments,
    state
  });
  lines.push(...variableLines);
  lines.push(...finalPayLines.grossAdditions);
  steps[4] = createCompletedStep(4, summarizeLineStep([...variableLines, ...finalPayLines.grossAdditions]));

  const retroLines = createRetroCorrectionLines({
    companyId: employment.companyId,
    employment,
    retroAdjustments,
    state
  });
  lines.push(...retroLines);
  steps[5] = createCompletedStep(5, summarizeLineStep(retroLines));

  const benefitLines = createStepLinesFromManualInputs({
    processingStep: 6,
    employment,
    inputs: manualInputs,
    state
  });
  lines.push(...benefitLines);
  steps[6] = createCompletedStep(6, summarizeLineStep(benefitLines));

  const travelLines = createStepLinesFromManualInputs({
    processingStep: 7,
    employment,
    inputs: manualInputs,
    state
  });
  lines.push(...travelLines);
  steps[7] = createCompletedStep(7, summarizeLineStep(travelLines));
  const grossDeductionLines = [
    ...createStepLinesFromManualInputs({
      processingStep: 8,
      employment,
      inputs: manualInputs,
      state
    }),
    ...finalPayLines.grossDeductions
  ];
  lines.push(...grossDeductionLines);
  steps[8] = createCompletedStep(8, summarizeLineStep(grossDeductionLines));

  const pensionableBase = roundMoney(
    lines
      .filter((line) => line.affectsPensionBasis)
      .reduce((sum, line) => sum + directionalAmount(line), 0)
  );
  steps[9] = createCompletedStep(9, {
    pensionableBase
  });

  const taxableBase = roundMoney(
    lines
      .filter((line) => line.taxTreatmentCode === "taxable")
      .reduce((sum, line) => sum + directionalAmount(line), 0)
  );
  const employerContributionBase = roundMoney(
    lines
      .filter((line) => line.employerContributionTreatmentCode === "included")
      .reduce((sum, line) => sum + directionalAmount(line), 0)
  );
  steps[10] = createCompletedStep(10, {
    taxableBase
  });

  const taxPreview = buildTaxPreview({
    rules,
    taxableBase,
    payDate: period.payDate,
    employee,
    statutoryProfile,
    warnings
  });
  steps[11] = taxPreview.step;

  const employerContributionPreview = buildEmployerContributionPreview({
    rules,
    contributionBase: employerContributionBase,
    employee,
    statutoryProfile,
    payDate: period.payDate
  });
  steps[12] = employerContributionPreview.step;

  const netDeductionLines = [
    ...createStepLinesFromManualInputs({
      processingStep: 13,
      employment,
      inputs: manualInputs,
      state
    }),
    ...finalPayLines.netDeductions
  ];
  lines.push(...netDeductionLines);
  steps[13] = createCompletedStep(13, summarizeLineStep(netDeductionLines));

  const lineTotals = summarizeTotals({
    lines,
    preliminaryTax: taxPreview.amount,
    employerContributionPreviewAmount: employerContributionPreview.amount
  });
  steps[14] = createCompletedStep(14, {
    grossEarnings: lineTotals.grossEarnings,
    grossDeductions: lineTotals.grossDeductions,
    netDeductions: lineTotals.netDeductions,
    netPay: lineTotals.netPay
  });

  const payslipRenderPayload = {
    reportingPeriod: period.reportingPeriod,
    payDate: period.payDate,
    runType,
    employee,
    employment,
    contract,
    bankAccount: primaryBankAccount,
    lines,
    totals: {
      ...lineTotals,
      pensionableBase,
      taxableBase,
      employerContributionBase,
      preliminaryTax: taxPreview.amount,
      preliminaryTaxStatus: taxPreview.status,
      taxDecision: taxPreview.decisionObject,
      employerContributionPreviewAmount: employerContributionPreview.amount,
      employerContributionPreviewStatus: employerContributionPreview.status,
      employerContributionDecision: employerContributionPreview.decisionObject
    },
    balances: balances.balances || balances,
    warnings
  };
  steps[15] = createCompletedStep(15, {
    snapshotHash: buildSnapshotHash(payslipRenderPayload),
    warningCount: warnings.length
  });

  const agiPreview = buildAgiPreview({
    companyId: employment.companyId,
    period,
    employee,
    employment,
    lines,
    leaveEntries,
    timePlatform,
    taxPreview,
    payslipTotals: payslipRenderPayload.totals,
    warnings
  });
  steps[16] = agiPreview.step;
  steps[17] = createPendingStep(17, {
    status: "phase8_3_pending",
    previewItemCount: 0
  });
  steps[18] = createPendingStep(18, {
    status: lineTotals.netPay == null ? "phase8_2_pending_tax" : "phase8_3_pending_payout",
    bankAccountPresent: primaryBankAccount != null
  });

  return {
    employee,
    employment,
    contract,
    sourceSnapshot,
    lines: lines.map(copy),
    warnings: warnings.map(copy),
    steps,
    payslipRenderPayload
  };
}

function createBaseSalaryLines({ companyId, employment, contract, runType, state, warnings }) {
  if (!contract) {
    warnings.push(createWarning("employment_contract_missing", "No active employment contract matched the payroll period."));
    return [];
  }
  if (runType !== "regular") {
    return [];
  }
  if (contract.salaryModelCode === "monthly_salary" && contract.monthlySalary != null) {
    const payItem = getRequiredPayItemByCode(state, companyId, "MONTHLY_SALARY");
    return [
      createPayLine({
        payItem,
        employment,
        quantity: 1,
        unitRate: contract.monthlySalary,
        amount: contract.monthlySalary,
        sourceType: "employment_contract",
        sourceId: contract.employmentContractId
      })
    ];
  }
  return [];
}

function createVariableLines({ companyId, employment, contract, timeEntries, leaveEntries, leavePayItemMappings, manualInputs, state, warnings }) {
  const lines = [];
  const hourlyRate = contract?.hourlyRate ?? null;
  const overtimeHours = roundQuantity(timeEntries.reduce((sum, entry) => sum + (entry.overtimeMinutes || 0), 0) / 60);
  const obHours = roundQuantity(timeEntries.reduce((sum, entry) => sum + (entry.obMinutes || 0), 0) / 60);
  const jourHours = roundQuantity(timeEntries.reduce((sum, entry) => sum + (entry.jourMinutes || 0), 0) / 60);
  const standbyHours = roundQuantity(timeEntries.reduce((sum, entry) => sum + (entry.standbyMinutes || 0), 0) / 60);
  const workedHours = roundQuantity(timeEntries.reduce((sum, entry) => sum + (entry.workedMinutes || 0), 0) / 60);

  if (contract?.salaryModelCode === "hourly_salary" && hourlyRate != null && workedHours > 0) {
    const payItem = getRequiredPayItemByCode(state, companyId, "HOURLY_SALARY");
    const baseHours = roundQuantity(Math.max(0, workedHours - overtimeHours));
    if (baseHours > 0) {
      lines.push(
        createPayLine({
          payItem,
          employment,
          quantity: baseHours,
          unitRate: hourlyRate,
          amount: roundMoney(baseHours * hourlyRate),
          sourceType: "time_entry",
          sourceId: buildSourceSummaryId(timeEntries.map((entry) => entry.timeEntryId))
        })
      );
    }
  }

  for (const definition of [
    { code: "OVERTIME", quantity: overtimeHours },
    { code: "OB", quantity: obHours },
    { code: "JOUR", quantity: jourHours },
    { code: "STANDBY", quantity: standbyHours }
  ]) {
    if (!definition.quantity) {
      continue;
    }
    const payItem = getRequiredPayItemByCode(state, companyId, definition.code);
    const configured = buildConfiguredQuantityLine({
      payItem,
      employment,
      contract,
      quantity: definition.quantity,
      sourceType: "time_entry",
      sourceId: buildSourceSummaryId(timeEntries.map((entry) => entry.timeEntryId)),
      warnings
    });
    if (configured) {
      lines.push(configured);
    }
  }

  const leaveGroups = aggregateLeaveEntries(leaveEntries);
  for (const group of leaveGroups) {
    const mapping = leavePayItemMappings.find(
      (candidate) =>
        (candidate.leaveTypeId && candidate.leaveTypeId === group.leaveTypeId) ||
        (candidate.leaveTypeCode && candidate.leaveTypeCode === group.leaveTypeCode)
    );
    if (!mapping) {
      warnings.push(
        createWarning(
          "leave_pay_item_mapping_missing",
          `No payroll mapping matched leave type ${group.leaveTypeCode} for employment ${employment.employmentNo}.`
        )
      );
      continue;
    }
    const payItem = getRequiredPayItemByCode(state, companyId, mapping.payItemCode);
    const configured = buildConfiguredQuantityLine({
      payItem,
      employment,
      contract,
      quantity: group.quantityDays,
      unitRate: mapping.unitRate,
      rateFactor: mapping.rateFactor,
      sourceType: "leave_entry",
      sourceId: buildSourceSummaryId(group.leaveEntryIds),
      warnings
    });
    if (configured) {
      lines.push(configured);
    }
  }

  for (const manualInput of manualInputs) {
    const payItem = requirePayItemByCode(state, companyId, manualInput.payItemCode);
    lines.push(
      createPayLine({
        payItem,
        employment,
        quantity: manualInput.quantity,
        unitRate: manualInput.unitRate,
        amount: manualInput.amount,
        sourceType: manualInput.sourceType,
        sourceId: manualInput.sourceId,
        sourcePeriod: manualInput.sourcePeriod,
        note: manualInput.note
      })
    );
  }

  return lines;
}

function createRetroCorrectionLines({ companyId, employment, retroAdjustments, state }) {
  const lines = [];
  for (const adjustment of retroAdjustments) {
    const payItem = requirePayItemByCode(state, companyId, adjustment.payItemCode);
    lines.push(
      createPayLine({
        payItem,
        employment,
        quantity: adjustment.quantity,
        unitRate: adjustment.unitRate,
        amount: adjustment.amount,
        sourceType: "retro_adjustment",
        sourceId: adjustment.sourcePayRunId || adjustment.sourceLineId || adjustment.originalPeriod,
        sourcePeriod: adjustment.originalPeriod,
        sourcePayRunId: adjustment.sourcePayRunId,
        sourceLineId: adjustment.sourceLineId,
        note: adjustment.note || `Retro correction for ${adjustment.originalPeriod}.`
      })
    );
  }
  return lines;
}

function createFinalPayLines({ companyId, employment, finalPayAdjustments, state }) {
  const grossAdditions = [];
  const grossDeductions = [];
  const netDeductions = [];
  for (const adjustment of finalPayAdjustments) {
    if (adjustment.finalSettlementAmount != null) {
      const payItem = requirePayItemByCode(state, companyId, "FINAL_PAY");
      grossAdditions.push(
        createPayLine({
          payItem,
          employment,
          quantity: 1,
          amount: adjustment.finalSettlementAmount,
          sourceType: "final_pay",
          sourceId: adjustment.terminationDate,
          note: adjustment.note || "Final pay settlement."
        })
      );
    }
    if (adjustment.remainingVacationSettlementAmount != null) {
      const payItem = requirePayItemByCode(state, companyId, "VACATION_PAY");
      grossAdditions.push(
        createPayLine({
          payItem,
          employment,
          quantity: adjustment.remainingVacationDays || 1,
          amount: adjustment.remainingVacationSettlementAmount,
          sourceType: "final_pay",
          sourceId: adjustment.terminationDate,
          note: "Remaining vacation settlement."
        })
      );
    }
    if (adjustment.advanceVacationRecoveryAmount != null) {
      const payItem = requirePayItemByCode(state, companyId, "CORRECTION");
      netDeductions.push(
        createPayLine({
          payItem: {
            ...payItem,
            compensationBucket: "net_deduction"
          },
          employment,
          quantity: 1,
          amount: adjustment.advanceVacationRecoveryAmount,
          sourceType: "final_pay",
          sourceId: adjustment.terminationDate,
          note: "Advance vacation recovery."
        })
      );
    }
  }
  return { grossAdditions, grossDeductions, netDeductions };
}

function createStepLinesFromManualInputs({ processingStep, employment, inputs, state }) {
  return inputs
    .filter((input) => input.processingStep === processingStep)
    .map((input) => {
      const payItem = requirePayItemByCode(state, employment.companyId, input.payItemCode);
      return createPayLine({
        payItem,
        employment,
        quantity: input.quantity,
        unitRate: input.unitRate,
        amount: input.amount,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourcePeriod: input.sourcePeriod,
        note: input.note
      });
    });
}

function buildTaxPreview({ rules, taxableBase, payDate, employee, statutoryProfile, warnings }) {
  const resolvedPayDate = normalizeRequiredDate(payDate, "pay_run_pay_date_invalid");
  const rulePack = rules.resolveRulePack({
    domain: "payroll",
    jurisdiction: "SE",
    effectiveDate: resolvedPayDate
  });
  const normalizedTaxableBase = roundMoney(Math.max(0, taxableBase || 0));
  const effectiveProfile = resolveEffectiveTaxProfile({
    statutoryProfile,
    effectiveDate: resolvedPayDate,
    rulePack
  });
  const decisionObjectBase = {
    inputs_hash: buildSnapshotHash({
      taxableBase: normalizedTaxableBase,
      payDate: resolvedPayDate,
      employeeId: employee?.employeeId || null,
      statutoryProfile: statutoryProfile || null,
      effectiveProfile
    }),
    rule_pack_id: rulePack.rulePackId,
    effective_date: resolvedPayDate,
    warnings: [],
    outputs: {
      taxableBase: normalizedTaxableBase
    }
  };

  if (!effectiveProfile || effectiveProfile.taxMode === "pending") {
    warnings.push(createWarning("payroll_tax_profile_missing", "Preliminary tax requires a complete statutory profile or SINK decision."));
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: "PAYROLL_TAX_PROFILE_MISSING",
      outputs: {
        ...decisionObjectBase.outputs,
        preliminaryTax: null,
        taxFieldCode: null,
        status: "pending"
      },
      warnings: ["payroll_tax_profile_missing"],
      explanation: ["No effective tax mode could be resolved for the pay date."]
    };
    return {
      amount: null,
      status: "pending",
      taxFieldCode: null,
      decisionObject,
      step: createPendingStep(11, {
        status: "pending",
        taxableBase: normalizedTaxableBase,
        decisionObject
      })
    };
  }

  if (effectiveProfile.taxMode === "manual_rate") {
    const taxRatePercent = effectiveProfile.taxRatePercent;
    if (taxRatePercent == null) {
      warnings.push(createWarning("payroll_tax_rate_missing", "Manual-rate tax mode requires taxRatePercent."));
      const decisionObject = {
        ...decisionObjectBase,
        decision_code: "PAYROLL_TAX_RATE_MISSING",
        outputs: {
          ...decisionObjectBase.outputs,
          preliminaryTax: null,
          taxFieldCode: "preliminary_tax",
          status: "pending"
        },
        warnings: ["payroll_tax_rate_missing"],
        explanation: ["taxMode=manual_rate but taxRatePercent was not configured."]
      };
      return {
        amount: null,
        status: "pending",
        taxFieldCode: "preliminary_tax",
        decisionObject,
        step: createPendingStep(11, {
          status: "pending",
          taxableBase: normalizedTaxableBase,
          decisionObject
        })
      };
    }
    const amount = roundMoney(normalizedTaxableBase * (taxRatePercent / 100));
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: "PAYROLL_TAX_MANUAL_RATE",
      outputs: {
        ...decisionObjectBase.outputs,
        taxMode: effectiveProfile.taxMode,
        taxRatePercent,
        taxFieldCode: "preliminary_tax",
        preliminaryTax: amount
      },
      explanation: [
        `taxMode=${effectiveProfile.taxMode}`,
        `taxRatePercent=${taxRatePercent}`,
        `taxableBase=${normalizedTaxableBase}`
      ]
    };
    return {
      amount,
      status: effectiveProfile.fallbackApplied ? "resolved_fallback_manual_rate" : "resolved_manual_rate",
      taxFieldCode: "preliminary_tax",
      decisionObject,
      step: createCompletedStep(11, {
        taxMode: effectiveProfile.taxMode,
        taxRatePercent,
        preliminaryTax: amount,
        taxFieldCode: "preliminary_tax",
        fallbackApplied: effectiveProfile.fallbackApplied === true,
        decisionObject
      })
    };
  }

  if (effectiveProfile.taxMode === "sink") {
    const sinkRatePercent = effectiveProfile.sinkRatePercent;
    const amount = roundMoney(normalizedTaxableBase * (sinkRatePercent / 100));
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: effectiveProfile.sinkSeaIncome ? "PAYROLL_TAX_SINK_SEA_INCOME" : "PAYROLL_TAX_SINK",
      outputs: {
        ...decisionObjectBase.outputs,
        taxMode: "sink",
        taxFieldCode: "sink_tax",
        sinkRatePercent,
        sinkSeaIncome: effectiveProfile.sinkSeaIncome,
        sinkDecisionType: effectiveProfile.sinkDecisionType,
        preliminaryTax: amount
      },
      explanation: [
        `taxMode=sink`,
        `sinkRatePercent=${sinkRatePercent}`,
        `sinkSeaIncome=${effectiveProfile.sinkSeaIncome === true}`,
        `taxableBase=${normalizedTaxableBase}`
      ]
    };
    return {
      amount,
      status: effectiveProfile.sinkSeaIncome ? "resolved_sink_sea_income" : "resolved_sink",
      taxFieldCode: "sink_tax",
      decisionObject,
      step: createCompletedStep(11, {
        taxMode: "sink",
        sinkRatePercent,
        sinkSeaIncome: effectiveProfile.sinkSeaIncome === true,
        preliminaryTax: amount,
        taxFieldCode: "sink_tax",
        fallbackApplied: effectiveProfile.fallbackApplied === true,
        decisionObject
      })
    };
  }

  warnings.push(createWarning("payroll_tax_mode_invalid", `Unsupported tax mode ${effectiveProfile.taxMode}.`));
  const decisionObject = {
    ...decisionObjectBase,
    decision_code: "PAYROLL_TAX_MODE_INVALID",
    outputs: {
      ...decisionObjectBase.outputs,
      preliminaryTax: null,
      taxFieldCode: null,
      status: "pending"
    },
    warnings: ["payroll_tax_mode_invalid"],
    explanation: [`Unsupported tax mode ${effectiveProfile.taxMode}.`]
  };
  return {
    amount: null,
    status: "pending",
    taxFieldCode: null,
    decisionObject,
    step: createPendingStep(11, {
      status: "pending",
      taxableBase: normalizedTaxableBase,
      decisionObject
    })
  };
}

function buildEmployerContributionPreview({ rules, contributionBase, employee, statutoryProfile, payDate }) {
  const rulePack = rules.resolveRulePack({
    domain: "payroll",
    jurisdiction: "SE",
    effectiveDate: normalizeRequiredDate(payDate, "pay_run_pay_date_invalid")
  });
  const machineRules = rulePack.machineReadableRules.contributionClasses || {};
  const birthYear = employee?.dateOfBirth ? Number(String(employee.dateOfBirth).slice(0, 4)) : null;
  const contributionClassCode =
    birthYear != null && birthYear <= 1937
      ? "no_contribution"
      : statutoryProfile?.contributionClassCode || "full";
  const classDefinition = machineRules[contributionClassCode] || machineRules.full;
  const normalizedContributionBase = roundMoney(Math.max(0, contributionBase || 0));
  const amount = roundMoney(normalizedContributionBase * ((classDefinition?.ratePercent || 0) / 100));
  const decisionObject = {
    decision_code: "PAYROLL_EMPLOYER_CONTRIBUTION",
    inputs_hash: buildSnapshotHash({
      contributionBase: normalizedContributionBase,
      employeeId: employee?.employeeId || null,
      contributionClassCode,
      statutoryProfile: statutoryProfile || null
    }),
    rule_pack_id: rulePack.rulePackId,
    effective_date: normalizeRequiredDate(payDate, "pay_run_pay_date_invalid"),
    outputs: {
      contributionBase: normalizedContributionBase,
      contributionClassCode,
      ratePercent: classDefinition?.ratePercent || 0,
      employerContributionPreviewAmount: amount
    },
    warnings: [],
    explanation: [
      `rulePackId=${rulePack.rulePackId}`,
      `rulePackChecksum=${rulePack.checksum}`,
      `contributionClassCode=${contributionClassCode}`,
      `ratePercent=${classDefinition?.ratePercent || 0}`,
      `contributionBase=${normalizedContributionBase}`
    ]
  };
  return {
    amount,
    status: "resolved_rule_pack",
    decisionObject,
    step: createCompletedStep(12, {
      rulePackId: rulePack.rulePackId,
      rulePackChecksum: rulePack.checksum,
      contributionClassCode,
      ratePercent: classDefinition?.ratePercent || 0,
      contributionBase: normalizedContributionBase,
      employerContributionPreviewAmount: amount,
      decisionObject
    })
  };
}

function summarizeTotals({ lines, preliminaryTax, employerContributionPreviewAmount }) {
  const grossEarnings = roundMoney(sumDirectional(lines, "gross_addition"));
  const grossDeductions = roundMoney(sumDirectional(lines, "gross_deduction"));
  const netDeductions = roundMoney(sumDirectional(lines, "net_deduction"));
  const grossAfterDeductions = roundMoney(grossEarnings - grossDeductions);
  const netPay =
    preliminaryTax == null ? null : roundMoney(grossAfterDeductions - preliminaryTax - netDeductions);

  return {
    grossEarnings,
    grossDeductions,
    grossAfterDeductions,
    preliminaryTax,
    netDeductions,
    netPay,
    employerContributionPreviewAmount: employerContributionPreviewAmount ?? null
  };
}

function seedPayrollDemo(state, { companyId, clock }) {
  for (const template of PAY_ITEM_TEMPLATES) {
    seedPayItem(state, {
      companyId,
      actorId: "seed",
      createdAt: nowIso(clock),
      ...template
    });
  }

  seedPayCalendar(state, {
    companyId,
    payCalendarCode: "MONTHLY_STANDARD",
    displayName: "Monthly standard calendar",
    frequencyCode: "monthly",
    cutoffDay: 5,
    payDay: 25,
    timezone: "Europe/Stockholm",
    defaultCurrencyCode: "SEK",
    actorId: "seed",
    createdAt: nowIso(clock)
  });
}

function seedPayItem(state, template) {
  const record = {
    payItemId: crypto.randomUUID(),
    companyId: template.companyId,
    payItemCode: template.payItemCode,
    payItemType: template.payItemType,
    displayName: template.displayName,
    calculationBasis: template.calculationBasis,
    unitCode: template.unitCode,
    compensationBucket: template.compensationBucket,
    defaultUnitAmount: template.defaultUnitAmount ?? null,
    defaultRateFactor: template.defaultRateFactor ?? null,
    taxTreatmentCode: template.taxTreatmentCode ?? "phase8_2_pending",
    employerContributionTreatmentCode: template.employerContributionTreatmentCode ?? "phase8_2_pending",
    agiMappingCode: template.agiMappingCode ?? resolveDefaultAgiMappingCode(template.payItemCode),
    ledgerAccountCode: template.ledgerAccountCode ?? "phase8_3_pending",
    defaultDimensions: copy(template.defaultDimensions || {}),
    affectsVacationBasis: template.affectsVacationBasis === true,
    affectsPensionBasis: template.affectsPensionBasis === true,
    includedInNetPay: template.includedInNetPay !== false,
    reportingOnly: template.reportingOnly === true,
    active: true,
    createdByActorId: template.actorId,
    createdAt: template.createdAt,
    updatedAt: template.createdAt
  };
  state.payItems.set(record.payItemId, record);
  appendToIndex(state.payItemIdsByCompany, record.companyId, record.payItemId);
  setIndexValue(state.payItemIdsByCode, record.companyId, record.payItemCode, record.payItemId);
}

function seedPayCalendar(state, template) {
  const record = {
    payCalendarId: crypto.randomUUID(),
    companyId: template.companyId,
    payCalendarCode: template.payCalendarCode,
    displayName: template.displayName,
    frequencyCode: template.frequencyCode,
    cutoffDay: template.cutoffDay,
    payDay: template.payDay,
    timezone: template.timezone,
    defaultCurrencyCode: template.defaultCurrencyCode,
    active: true,
    createdByActorId: template.actorId,
    createdAt: template.createdAt,
    updatedAt: template.createdAt
  };
  state.payCalendars.set(record.payCalendarId, record);
  appendToIndex(state.payCalendarIdsByCompany, record.companyId, record.payCalendarId);
  setIndexValue(state.payCalendarIdsByCode, record.companyId, record.payCalendarCode, record.payCalendarId);
}

function createStoredPayslip({ companyId, payRunId, period, runType, result, generatedByActorId, generatedAt }) {
  const renderPayload = copy({
    reportingPeriod: period.reportingPeriod,
    payDate: period.payDate,
    runType,
    employee: result.employee,
    employment: result.employment,
    contract: result.contract,
    lines: result.lines,
    balances: result.payslipRenderPayload.balances,
    totals: result.payslipRenderPayload.totals,
    warnings: result.warnings
  });
  return {
    payslipId: crypto.randomUUID(),
    companyId,
    payRunId,
    employmentId: result.employment.employmentId,
    employeeId: result.employee.employeeId,
    snapshotHash: buildSnapshotHash(renderPayload),
    renderPayload,
    generatedByActorId,
    generatedAt,
    regenerationNo: 0,
    regeneratedAt: null,
    regeneratedByActorId: null
  };
}

function enrichPayRun(state, payRun) {
  return {
    ...copy(payRun),
    events: (state.payRunEventIdsByRun.get(payRun.payRunId) || [])
      .map((eventId) => state.payRunEvents.get(eventId))
      .filter(Boolean)
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map(copy),
    lines: (state.payRunLineIdsByRun.get(payRun.payRunId) || [])
      .map((lineId) => state.payRunLines.get(lineId))
      .filter(Boolean)
      .sort((left, right) => left.employmentId.localeCompare(right.employmentId) || left.displayOrder - right.displayOrder)
      .map(copy),
    payslips: (state.payslipIdsByRun.get(payRun.payRunId) || [])
      .map((payslipId) => state.payslips.get(payslipId))
      .filter(Boolean)
      .sort((left, right) => left.employeeId.localeCompare(right.employeeId))
      .map(enrichPayslip)
  };
}

function enrichPayslip(payslip) {
  return {
    ...copy(payslip.renderPayload),
    payslipId: payslip.payslipId,
    payRunId: payslip.payRunId,
    snapshotHash: payslip.snapshotHash,
    generatedAt: payslip.generatedAt,
    generatedByActorId: payslip.generatedByActorId,
    regenerationNo: payslip.regenerationNo,
    regeneratedAt: payslip.regeneratedAt,
    regeneratedByActorId: payslip.regeneratedByActorId
  };
}

function appendRunEvent(state, { payRunId, companyId, eventType, actorId, note, recordedAt = new Date().toISOString() }) {
  const event = {
    payRunEventId: crypto.randomUUID(),
    payRunId,
    companyId,
    eventType,
    actorId,
    note,
    recordedAt
  };
  state.payRunEvents.set(event.payRunEventId, event);
  appendToIndex(state.payRunEventIdsByRun, payRunId, event.payRunEventId);
}

function resolvePayrollPeriod({ reportingPeriod, payDate, payCalendar }) {
  const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "payroll_reporting_period_required");
  const year = Number(resolvedReportingPeriod.slice(0, 4));
  const month = Number(resolvedReportingPeriod.slice(4, 6));
  const startsOn = `${resolvedReportingPeriod.slice(0, 4)}-${resolvedReportingPeriod.slice(4, 6)}-01`;
  const endsOn = endOfMonth(year, month);
  return {
    reportingPeriod: resolvedReportingPeriod,
    startsOn,
    endsOn,
    payDate: payDate ? normalizeRequiredDate(payDate, "pay_run_pay_date_invalid") : buildPayDate(year, month, payCalendar.payDay)
  };
}

function resolveEmploymentScope({ companyId, employmentIds, period, hrPlatform }) {
  if (!hrPlatform) {
    return (employmentIds || []).map((employmentId) => ({
      companyId,
      employmentId,
      employeeId: employmentId,
      employmentNo: employmentId,
      contracts: []
    }));
  }

  const allEmployments = [];
  for (const employee of hrPlatform.listEmployees({ companyId })) {
    for (const employment of hrPlatform.listEmployments({
      companyId,
      employeeId: employee.employeeId
    })) {
      if (employment.startDate > period.endsOn) {
        continue;
      }
      if (employment.endDate && employment.endDate < period.startsOn) {
        continue;
      }
      allEmployments.push(copy(employment));
    }
  }

  if (employmentIds == null || employmentIds.length === 0) {
    return allEmployments.sort((left, right) => left.employmentNo.localeCompare(right.employmentNo));
  }

  const wanted = new Set(employmentIds.map((value) => requireText(value, "employment_id_required")));
  return allEmployments
    .filter((employment) => wanted.has(employment.employmentId))
    .sort((left, right) => left.employmentNo.localeCompare(right.employmentNo));
}

function resolveEmployeeSnapshot({ employment, hrPlatform }) {
  if (!hrPlatform) {
    return {
      employeeId: employment.employeeId,
      displayName: employment.employeeId,
      dateOfBirth: null
    };
  }
  return hrPlatform.getEmployee({
    companyId: employment.companyId,
    employeeId: employment.employeeId
  });
}

function resolveActiveEmploymentContract(employment, effectiveDate) {
  const contracts = Array.isArray(employment.contracts) ? employment.contracts : [];
  const matches = contracts
    .filter((contract) => contract.validFrom <= effectiveDate)
    .filter((contract) => !contract.validTo || contract.validTo >= effectiveDate)
    .sort((left, right) => right.contractVersion - left.contractVersion);
  return matches[0] ? copy(matches[0]) : null;
}

function listEmploymentTimeEntries({ companyId, employmentId, period, timePlatform }) {
  if (!timePlatform?.listTimeEntries) {
    return [];
  }
  return timePlatform
    .listTimeEntries({ companyId, employmentId })
    .filter((entry) => entry.workDate >= period.startsOn && entry.workDate <= period.endsOn)
    .map(copy);
}

function listEmploymentLeaveEntries({ companyId, employmentId, period, timePlatform }) {
  if (!timePlatform?.listLeaveEntries) {
    return [];
  }
  return timePlatform
    .listLeaveEntries({ companyId, employmentId, status: "approved" })
    .filter((entry) => {
      if (entry.reportingPeriod) {
        return entry.reportingPeriod === period.reportingPeriod;
      }
      return entry.startDate <= period.endsOn && entry.endDate >= period.startsOn;
    })
    .map(copy);
}

function aggregateLeaveEntries(leaveEntries) {
  const groups = new Map();
  for (const entry of leaveEntries) {
    const key = `${entry.leaveTypeId}:${entry.leaveTypeCode}`;
    const current = groups.get(key) || {
      leaveTypeId: entry.leaveTypeId,
      leaveTypeCode: entry.leaveTypeCode,
      quantityDays: 0,
      leaveEntryIds: []
    };
    current.quantityDays = roundQuantity(
      current.quantityDays +
        (entry.days || []).reduce((sum, day) => sum + ((Number(day.extentPercent) || 0) / 100), 0)
    );
    current.leaveEntryIds.push(entry.leaveEntryId);
    groups.set(key, current);
  }
  return [...groups.values()];
}

function buildConfiguredQuantityLine({ payItem, employment, contract, quantity, unitRate = null, rateFactor = null, sourceType, sourceId, warnings }) {
  const resolvedQuantity = roundQuantity(quantity || 0);
  if (!resolvedQuantity) {
    return null;
  }

  const resolvedRateFactor = rateFactor ?? payItem.defaultRateFactor ?? 1;
  if (payItem.calculationBasis === "contract_hourly_rate") {
    if (contract?.hourlyRate == null) {
      warnings.push(createWarning("hourly_rate_missing", `Pay item ${payItem.payItemCode} requires an hourly rate for ${employment.employmentNo}.`));
      return createPayLine({
        payItem,
        employment,
        quantity: resolvedQuantity,
        amount: 0,
        unitRate: null,
        sourceType,
        sourceId,
        calculationStatus: "rate_required"
      });
    }
    const effectiveRate = roundMoney(contract.hourlyRate * resolvedRateFactor);
    return createPayLine({
      payItem,
      employment,
      quantity: resolvedQuantity,
      unitRate: effectiveRate,
      amount: roundMoney(resolvedQuantity * effectiveRate),
      sourceType,
      sourceId
    });
  }

  const effectiveUnitRate = normalizeOptionalMoney(unitRate ?? payItem.defaultUnitAmount, "pay_item_effective_unit_rate_invalid");
  if (effectiveUnitRate == null && payItem.calculationBasis !== "reporting_only") {
    warnings.push(
      createWarning(
        "pay_item_rate_missing",
        `Pay item ${payItem.payItemCode} requires a configured unit amount or manual amount for ${employment.employmentNo}.`
      )
    );
    return createPayLine({
      payItem,
      employment,
      quantity: resolvedQuantity,
      amount: 0,
      unitRate: null,
      sourceType,
      sourceId,
      calculationStatus: "rate_required"
    });
  }

  return createPayLine({
    payItem,
    employment,
    quantity: resolvedQuantity,
    unitRate: effectiveUnitRate,
    amount: payItem.calculationBasis === "reporting_only" ? 0 : roundMoney(resolvedQuantity * effectiveUnitRate * resolvedRateFactor),
    sourceType,
    sourceId
  });
}

function createPayLine({
  payItem,
  employment,
  quantity = null,
  unitRate = null,
  amount = 0,
  sourceType,
  sourceId,
  sourcePeriod = null,
  sourcePayRunId = null,
  sourceLineId = null,
  note = null,
  calculationStatus = "calculated"
}) {
  return {
    employmentId: employment.employmentId,
    employeeId: employment.employeeId,
    payItemCode: payItem.payItemCode,
    payItemType: payItem.payItemType,
    displayName: payItem.displayName,
    compensationBucket: payItem.compensationBucket,
    quantity: quantity == null ? null : roundQuantity(quantity),
    unitCode: payItem.unitCode,
    unitRate: unitRate == null ? null : roundMoney(unitRate),
    amount: roundMoney(amount),
    taxTreatmentCode: payItem.taxTreatmentCode,
    employerContributionTreatmentCode: payItem.employerContributionTreatmentCode,
    agiMappingCode: payItem.agiMappingCode,
    ledgerAccountCode: payItem.ledgerAccountCode,
    affectsVacationBasis: payItem.affectsVacationBasis,
    affectsPensionBasis: payItem.affectsPensionBasis,
    includedInNetPay: payItem.includedInNetPay,
    reportingOnly: payItem.reportingOnly,
    sourceType: requireText(String(sourceType || "manual"), "pay_line_source_type_required"),
    sourceId: normalizeOptionalText(sourceId),
    sourcePeriod: normalizeOptionalReportingPeriod(sourcePeriod),
    sourcePayRunId: normalizeOptionalText(sourcePayRunId),
    sourceLineId: normalizeOptionalText(sourceLineId),
    calculationStatus,
    note: normalizeOptionalText(note),
    displayOrder: payItemDisplayOrder(payItem.payItemCode)
  };
}

function normalizeManualInputs({ companyId, manualInputs, state }) {
  if (!Array.isArray(manualInputs)) {
    return [];
  }
  return manualInputs.map((input) => {
    const resolvedEmploymentId = requireText(input.employmentId, "payroll_input_employment_id_required");
    const payItemCode = normalizeCode(input.payItemCode, "payroll_input_pay_item_code_required");
    const payItem = requirePayItemByCode(state, companyId, payItemCode);
    const processingStep = normalizeProcessingStep(input.processingStep, payItem.compensationBucket);
    return {
      employmentId: resolvedEmploymentId,
      payItemCode,
      quantity: input.quantity == null ? null : roundQuantity(input.quantity),
      unitRate: normalizeOptionalMoney(input.unitRate, "payroll_input_unit_rate_invalid"),
      amount: normalizeOptionalMoney(input.amount, "payroll_input_amount_invalid"),
      sourceType: normalizeOptionalText(input.sourceType) || "manual_input",
      sourceId: normalizeOptionalText(input.sourceId),
      sourcePeriod: normalizeOptionalReportingPeriod(input.sourcePeriod),
      note: normalizeOptionalText(input.note),
      processingStep
    };
  });
}

function normalizeRetroAdjustments({ companyId, retroAdjustments, state }) {
  if (!Array.isArray(retroAdjustments)) {
    return [];
  }
  return retroAdjustments.map((adjustment) => {
    const payItemCode = normalizeCode(adjustment.payItemCode || "CORRECTION", "retro_pay_item_code_required");
    requirePayItemByCode(state, companyId, payItemCode);
    return {
      employmentId: requireText(adjustment.employmentId, "retro_employment_id_required"),
      payItemCode,
      quantity: adjustment.quantity == null ? 1 : roundQuantity(adjustment.quantity),
      unitRate: normalizeOptionalMoney(adjustment.unitRate, "retro_unit_rate_invalid"),
      amount: normalizeRequiredMoney(adjustment.amount, "retro_amount_required"),
      originalPeriod: normalizeReportingPeriod(adjustment.originalPeriod, "retro_original_period_required"),
      sourcePayRunId: normalizeOptionalText(adjustment.sourcePayRunId),
      sourceLineId: normalizeOptionalText(adjustment.sourceLineId),
      note: normalizeOptionalText(adjustment.note)
    };
  });
}

function normalizeFinalPayAdjustments(finalPayAdjustments) {
  if (!Array.isArray(finalPayAdjustments)) {
    return [];
  }
  return finalPayAdjustments.map((adjustment) => ({
    employmentId: requireText(adjustment.employmentId, "final_pay_employment_id_required"),
    terminationDate: normalizeRequiredDate(adjustment.terminationDate, "final_pay_termination_date_required"),
    finalSettlementAmount: normalizeOptionalMoney(adjustment.finalSettlementAmount, "final_pay_settlement_amount_invalid"),
    remainingVacationDays: adjustment.remainingVacationDays == null ? null : roundQuantity(adjustment.remainingVacationDays),
    remainingVacationSettlementAmount: normalizeOptionalMoney(
      adjustment.remainingVacationSettlementAmount,
      "final_pay_vacation_settlement_invalid"
    ),
    advanceVacationRecoveryAmount: normalizeOptionalMoney(
      adjustment.advanceVacationRecoveryAmount,
      "final_pay_advance_recovery_invalid"
    ),
    note: normalizeOptionalText(adjustment.note)
  }));
}

function normalizeLeaveMappings(leavePayItemMappings) {
  if (!Array.isArray(leavePayItemMappings)) {
    return [];
  }
  return leavePayItemMappings.map((mapping) => ({
    leaveTypeId: normalizeOptionalText(mapping.leaveTypeId),
    leaveTypeCode: mapping.leaveTypeCode ? normalizeCode(mapping.leaveTypeCode, "leave_mapping_code_invalid") : null,
    payItemCode: normalizeCode(mapping.payItemCode, "leave_mapping_pay_item_code_required"),
    unitRate: normalizeOptionalMoney(mapping.unitRate, "leave_mapping_unit_rate_invalid"),
    rateFactor: normalizeOptionalNumber(mapping.rateFactor, "leave_mapping_rate_factor_invalid")
  }));
}

function normalizeStatutoryProfiles(statutoryProfiles) {
  const map = new Map();
  if (!Array.isArray(statutoryProfiles)) {
    return map;
  }
  for (const profile of statutoryProfiles) {
    const normalized = normalizeStatutoryProfile(profile);
    map.set(normalized.employmentId, normalized);
  }
  return map;
}

function normalizeStatutoryProfile(profile = {}) {
  const taxMode = assertAllowed(normalizeOptionalText(profile.taxMode) || "pending", PAYROLL_TAX_MODES, "statutory_profile_tax_mode_invalid");
  const sinkValidFrom = normalizeOptionalDate(profile.sinkValidFrom, "statutory_profile_sink_valid_from_invalid");
  const sinkValidTo = normalizeOptionalDate(profile.sinkValidTo, "statutory_profile_sink_valid_to_invalid");
  if (sinkValidFrom && sinkValidTo && sinkValidTo < sinkValidFrom) {
    throw createError(400, "statutory_profile_sink_interval_invalid", "SINK validity interval is invalid.");
  }
  const fallbackTaxMode = normalizeOptionalText(profile.fallbackTaxMode)
    ? assertAllowed(profile.fallbackTaxMode, PAYROLL_TAX_MODES, "statutory_profile_fallback_tax_mode_invalid")
    : null;
  return {
    employmentId: requireText(profile.employmentId, "statutory_profile_employment_id_required"),
    taxMode,
    taxRatePercent: normalizeOptionalNumber(profile.taxRatePercent, "statutory_profile_tax_rate_invalid"),
    contributionClassCode: normalizeOptionalText(profile.contributionClassCode),
    sinkDecisionType: normalizeOptionalText(profile.sinkDecisionType),
    sinkValidFrom,
    sinkValidTo,
    sinkRatePercent: normalizeOptionalNumber(profile.sinkRatePercent, "statutory_profile_sink_rate_invalid"),
    sinkSeaIncome: profile.sinkSeaIncome === true,
    sinkDecisionDocumentId: normalizeOptionalText(profile.sinkDecisionDocumentId),
    fallbackTaxMode,
    fallbackTaxRatePercent: normalizeOptionalNumber(profile.fallbackTaxRatePercent, "statutory_profile_fallback_tax_rate_invalid")
  };
}

function mergeStatutoryProfileMaps({ baseProfiles = [], overrideProfiles = [] } = {}) {
  const merged = new Map();
  for (const profile of Array.isArray(baseProfiles) ? baseProfiles : []) {
    const normalized = normalizeStatutoryProfile(profile);
    merged.set(normalized.employmentId, normalized);
  }
  for (const [employmentId, profile] of normalizeStatutoryProfiles(overrideProfiles)) {
    merged.set(employmentId, profile);
  }
  return merged;
}

function normalizeProcessingStep(processingStep, compensationBucket) {
  if (processingStep != null) {
    return normalizeIntegerInRange(processingStep, 4, 13, "payroll_processing_step_invalid");
  }
  if (compensationBucket === "gross_deduction") {
    return 8;
  }
  if (compensationBucket === "net_deduction") {
    return 13;
  }
  return 4;
}

function getStoredPayslip({ companyId, payRunId, employmentId, state }) {
  const payslipId = lookupCompositeValue(state.payslipIdsByRunEmployment, payRunId, requireText(employmentId, "employment_id_required"));
  if (!payslipId) {
    throw createError(404, "payslip_not_found", "Payslip was not found.");
  }
  const payslip = state.payslips.get(payslipId);
  if (!payslip || payslip.companyId !== companyId) {
    throw createError(404, "payslip_not_found", "Payslip was not found.");
  }
  return payslip;
}

function requirePayRun(state, companyId, payRunId) {
  const payRun = state.payRuns.get(requireText(payRunId, "pay_run_id_required"));
  if (!payRun || payRun.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "pay_run_not_found", "Payroll run was not found.");
  }
  return payRun;
}

function requirePayCalendar(state, companyId, payCalendarId) {
  const payCalendar = state.payCalendars.get(requireText(payCalendarId, "pay_calendar_id_required"));
  if (!payCalendar || payCalendar.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "pay_calendar_not_found", "Pay calendar was not found.");
  }
  return payCalendar;
}

function requirePayItemByCode(state, companyId, payItemCode) {
  const payItem = lookupByCode(state.payItemIdsByCode, state.payItems, requireText(companyId, "company_id_required"), payItemCode);
  if (!payItem) {
    throw createError(404, "pay_item_not_found", `Pay item ${payItemCode} was not found.`);
  }
  return payItem;
}

function getRequiredPayItemByCode(state, companyId, payItemCode) {
  return requirePayItemByCode(state, companyId, payItemCode);
}

function lookupByCode(index, values, companyId, code) {
  const scoped = index.get(requireText(companyId, "company_id_required"));
  if (!scoped) {
    return null;
  }
  const id = scoped.get(normalizeCode(code, "lookup_code_required"));
  return id ? values.get(id) || null : null;
}

function lookupCompositeValue(index, scope, code) {
  const scoped = index.get(scope);
  return scoped ? scoped.get(code) || null : null;
}

function createStepDefinition(stepNo, stepCode, description) {
  return Object.freeze({
    stepNo,
    stepCode,
    description
  });
}

function createPayItemTemplate(
  payItemCode,
  payItemType,
  displayName,
  calculationBasis,
  unitCode,
  compensationBucket,
  affectsVacationBasis,
  affectsPensionBasis
) {
  const taxTreatmentCode =
    payItemCode.startsWith("TAX_FREE_") || ["NET_DEDUCTION", "GARNISHMENT", "ADVANCE", "RECLAIM", "PENSION_PREMIUM"].includes(payItemCode)
      ? "non_taxable"
      : "taxable";
  const employerContributionTreatmentCode =
    payItemCode.startsWith("TAX_FREE_") || ["NET_DEDUCTION", "GARNISHMENT", "ADVANCE", "RECLAIM"].includes(payItemCode)
      ? "excluded"
      : "included";
  return Object.freeze({
    payItemCode,
    payItemType,
    displayName,
    calculationBasis,
    unitCode,
    compensationBucket,
    taxTreatmentCode,
    employerContributionTreatmentCode,
    agiMappingCode: resolveDefaultAgiMappingCode(payItemCode),
    ledgerAccountCode: "phase8_3_pending",
    affectsVacationBasis,
    affectsPensionBasis,
    includedInNetPay: compensationBucket !== "reporting_only",
    reportingOnly: compensationBucket === "reporting_only"
  });
}

function resolveDefaultAgiMappingCode(payItemCode) {
  const resolvedCode = normalizeCode(payItemCode, "pay_item_code_required");
  if (["BENEFIT"].includes(resolvedCode)) {
    return "taxable_benefit";
  }
  if (["PENSION_PREMIUM"].includes(resolvedCode)) {
    return "pension_premium";
  }
  if (["TAX_FREE_TRAVEL_ALLOWANCE", "TAX_FREE_MILEAGE"].includes(resolvedCode)) {
    return "tax_free_allowance";
  }
  if (["NET_DEDUCTION", "GARNISHMENT", "ADVANCE", "RECLAIM"].includes(resolvedCode)) {
    return "not_reported";
  }
  return "cash_compensation";
}

function createCompletedStep(stepNo, details) {
  return {
    stepNo,
    status: "completed",
    details: copy(details || {})
  };
}

function createPendingStep(stepNo, details) {
  return {
    stepNo,
    status: "pending",
    details: copy(details || {})
  };
}

function summarizeStep(definition, employmentSteps) {
  const items = employmentSteps.filter(Boolean);
  const statuses = new Set(items.map((item) => item.status));
  return {
    stepNo: definition.stepNo,
    stepCode: definition.stepCode,
    description: definition.description,
    status: statuses.size === 1 && statuses.has("completed") ? "completed" : "mixed",
    employmentCount: items.length,
    employmentStatuses: items.map((item) => item.status)
  };
}

function summarizeLineStep(lines) {
  return {
    lineCount: lines.length,
    totalAmount: roundMoney(lines.reduce((sum, line) => sum + directionalAmount(line), 0))
  };
}

function createWarning(code, message) {
  return {
    code,
    message
  };
}

function payItemDisplayOrder(payItemCode) {
  const index = PAY_ITEM_TEMPLATES.findIndex((template) => template.payItemCode === payItemCode);
  return index >= 0 ? index + 1 : 999;
}

function sumDirectional(lines, compensationBucket) {
  return lines
    .filter((line) => line.compensationBucket === compensationBucket)
    .reduce((sum, line) => sum + Math.abs(line.amount), 0);
}

function directionalAmount(line) {
  const amount = roundMoney(line.amount || 0);
  if (line.compensationBucket === "gross_deduction" || line.compensationBucket === "net_deduction") {
    return -Math.abs(amount);
  }
  return amount;
}

function buildSourceSummaryId(ids) {
  const filtered = (ids || []).filter(Boolean);
  return filtered.length === 0 ? null : buildSnapshotHash(filtered.sort());
}

function normalizeOptionalDate(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeRequiredDate(value, code);
}

function buildPayDate(year, month, payDay) {
  const resolvedDay = String(Math.min(payDay, daysInMonth(year, month))).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${resolvedDay}`;
}

function endOfMonth(year, month) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function appendToIndex(index, key, value) {
  const items = index.get(key) || [];
  items.push(value);
  index.set(key, items);
}

function setIndexValue(index, scope, code, value) {
  const scoped = index.get(scope) || new Map();
  scoped.set(code, value);
  index.set(scope, scoped);
}

function ensureUniqueCode(index, scope, code, errorCode) {
  const scoped = index.get(scope);
  if (scoped && scoped.has(code)) {
    throw createError(409, errorCode, `${code} already exists.`);
  }
}

function createInternalRuleRegistry({ seedRulePacks }) {
  const rulePacks = new Map();
  for (const rulePack of seedRulePacks) {
    rulePacks.set(rulePack.rulePackId, copy(rulePack));
  }
  return {
    listRulePacks({ domain, jurisdiction }) {
      return [...rulePacks.values()]
        .filter((candidate) => (domain ? candidate.domain === domain : true))
        .filter((candidate) => (jurisdiction ? candidate.jurisdiction === jurisdiction : true))
        .sort((left, right) => left.rulePackId.localeCompare(right.rulePackId))
        .map(copy);
    },
    resolveRulePack({ domain, jurisdiction, effectiveDate }) {
      const matches = [...rulePacks.values()]
        .filter((candidate) => candidate.domain === domain)
        .filter((candidate) => candidate.jurisdiction === jurisdiction)
        .filter((candidate) => candidate.effectiveFrom <= effectiveDate)
        .filter((candidate) => !candidate.effectiveTo || candidate.effectiveTo >= effectiveDate)
        .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom));
      if (matches.length === 0) {
        throw createError(404, "rule_pack_not_found", "Rule pack was not found.");
      }
      return copy(matches[0]);
    }
  };
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

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function normalizeRequiredDate(value, code) {
  const resolved = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createError(400, code, `${resolved} must be an ISO date.`);
  }
  return resolved;
}

function normalizeReportingPeriod(value, code) {
  const resolved = requireText(value, code);
  if (!/^\d{6}$/.test(resolved)) {
    throw createError(400, code, `${resolved} must use YYYYMM format.`);
  }
  return resolved;
}

function normalizeOptionalReportingPeriod(value) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeReportingPeriod(value, "reporting_period_invalid");
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeCode(value, code) {
  return requireText(String(value || ""), code)
    .replaceAll(/[^A-Za-z0-9_]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
    .toUpperCase();
}

function normalizeUpperCode(value, code, length) {
  const resolved = requireText(String(value || ""), code).toUpperCase();
  if (resolved.length !== length) {
    throw createError(400, code, `${resolved} must be ${length} characters.`);
  }
  return resolved;
}

function normalizeOptionalMoney(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeRequiredMoney(value, code);
}

function normalizeRequiredMoney(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw createError(400, code, `${value} must be numeric.`);
  }
  return roundMoney(numeric);
}

function normalizeOptionalNumber(value, code) {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw createError(400, code, `${value} must be numeric.`);
  }
  return numeric;
}

function normalizeIntegerInRange(value, min, max, code) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    throw createError(400, code, `${value} must be an integer between ${min} and ${max}.`);
  }
  return numeric;
}

function assertAllowed(value, allowedValues, code) {
  const resolved = requireText(String(value || ""), code);
  if (!allowedValues.includes(resolved)) {
    throw createError(400, code, `${resolved} is not allowed.`);
  }
  return resolved;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
