import crypto from "node:crypto";
import { createProviderBaselineRegistry, createRulePackRegistry } from "../../rule-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import {
  normalizeOptionalIsoDate as normalizeOptionalIsoDateKernel,
  normalizeOptionalOcrReference as normalizeOptionalOcrReferenceKernel,
  normalizeRequiredIanaTimeZone,
  normalizeRequiredIsoDate as normalizeRequiredIsoDateKernel
} from "../../domain-core/src/validation.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";
import { createConfiguredSecretStore } from "../../domain-core/src/secret-runtime.mjs";
import {
  getSkatteverketMonthlyTaxTable2026Meta,
  getSkatteverketOneTimeTaxTable2026Meta,
  lookupSkatteverketMonthlyTaxTable2026,
  lookupSkatteverketOneTimeTaxTable2026
} from "./skatteverket-tax-tables.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const PAY_RUN_TYPES = Object.freeze(["regular", "extra", "correction", "final"]);
export const PAY_RUN_STATUSES = Object.freeze(["calculated", "approved"]);
export const PAYROLL_EXCEPTION_STATUSES = Object.freeze(["open", "resolved", "waived"]);
export const PAYROLL_EXCEPTION_SEVERITIES = Object.freeze(["info", "warning", "error"]);
export const PAYROLL_FREQUENCY_CODES = Object.freeze(["monthly"]);
export const PAYROLL_TAX_MODES = Object.freeze(["pending", "manual_rate", "sink"]);
export const PAYROLL_TAX_DECISION_TYPES = Object.freeze([
  "tabell",
  "jamkning",
  "jamkning_fast",
  "jamkning_procent",
  "engangsskatt",
  "sink",
  "a_sink",
  "asink",
  "emergency_manual"
]);
export const PAYROLL_TAX_DECISION_STATUSES = Object.freeze(["draft", "approved", "superseded"]);
export const PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_TYPES = Object.freeze([
  "full",
  "reduced_age_pension_only",
  "temporary_youth_reduction",
  "vaxa",
  "no_contribution",
  "emergency_manual"
]);
export const PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_STATUSES = Object.freeze(["draft", "approved", "superseded"]);
export const PAYROLL_GARNISHMENT_DECISION_TYPES = Object.freeze(["authority_order", "manual_override"]);
export const PAYROLL_GARNISHMENT_DECISION_STATUSES = Object.freeze(["draft", "approved", "superseded"]);
export const PAYROLL_GARNISHMENT_DEDUCTION_MODEL_CODES = Object.freeze(["max_above_protected_amount", "fixed_amount"]);
export const PAYROLL_GARNISHMENT_HOUSEHOLD_TYPE_CODES = Object.freeze(["single_adult", "cohabiting_adults"]);
export const PAYROLL_GARNISHMENT_REMITTANCE_STATUSES = Object.freeze([
  "payment_order_ready",
  "settled",
  "returned",
  "corrected"
]);
export const EMPLOYEE_RECEIVABLE_STATUSES = Object.freeze([
  "open",
  "scheduled_offset",
  "partially_settled",
  "settled",
  "written_off"
]);
const RECEIVABLE_SETTLEMENT_PLAN_STATUSES = Object.freeze(["scheduled", "completed", "cancelled"]);
const RECEIVABLE_SETTLEMENT_INSTALLMENT_STATUSES = Object.freeze([
  "planned",
  "partially_executed",
  "executed",
  "cancelled"
]);
const RECEIVABLE_OFFSET_DECISION_STATUSES = Object.freeze(["pending_execution", "executed", "cancelled"]);
const RECEIVABLE_WRITE_OFF_DECISION_STATUSES = Object.freeze(["draft", "approved", "superseded"]);
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
export const PAYROLL_POSTING_STATUSES = Object.freeze(["draft", "posted"]);
export const PAYROLL_PAYOUT_BATCH_STATUSES = Object.freeze(["exported", "matched"]);
const PAYROLL_EXTERNAL_CONSUMPTION_STAGES = Object.freeze(["calculated", "approved"]);
const PAYROLL_EMERGENCY_OVERRIDE_DECISION_TYPES = Object.freeze(["emergency_manual"]);
const PAYROLL_DUAL_REVIEW_EMPLOYER_CONTRIBUTION_DECISION_TYPES = Object.freeze(["vaxa", "emergency_manual"]);
const PAYROLL_EMPLOYEE_RECEIVABLE_ACCOUNT = "1300";
const PAYROLL_EMPLOYEE_WRITE_OFF_EXPENSE_ACCOUNT = "7790";

function isJamkningDecisionType(decisionType) {
  return decisionType === "jamkning" || decisionType === "jamkning_fast" || decisionType === "jamkning_procent";
}

function isASinkDecisionType(decisionType) {
  return decisionType === "a_sink" || decisionType === "asink";
}

function canonicalizeTaxDecisionType({
  decisionType,
  adjustmentFixedAmount = null,
  adjustmentPercentage = null,
  withholdingRatePercent = null
}) {
  if (decisionType === "a_sink") {
    return "asink";
  }
  if (decisionType !== "jamkning") {
    return decisionType;
  }
  if (adjustmentPercentage != null || withholdingRatePercent != null) {
    return "jamkning_procent";
  }
  return "jamkning_fast";
}

function resolveTaxDecisionTypeFilter(decisionType) {
  const canonicalDecisionType = canonicalizeTaxDecisionType({ decisionType });
  if (decisionType === "jamkning") {
    return new Set(["jamkning_fast", "jamkning_procent"]);
  }
  return new Set([canonicalDecisionType]);
}
export const PAYROLL_AGI_PROVIDER_CODE = "skatteverket_agi";
export const PAYROLL_AGI_PROVIDER_BASELINE_CODE = "SE-SKATTEVERKET-AGI-API";
export const PAYROLL_PROVIDER_BASELINES = Object.freeze([
  Object.freeze({
    providerBaselineId: "skatteverket-agi-api-se-2026.1",
    baselineCode: PAYROLL_AGI_PROVIDER_BASELINE_CODE,
    providerCode: PAYROLL_AGI_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "authority_transport_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "skatteverket-agi-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Skatteverket AGI transport baseline for official dispatch and receipt collection."
  })
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
const PAYROLL_EMPLOYER_CONTRIBUTION_RULE_PACK_CODE = "SE-EMPLOYER-CONTRIBUTIONS";
const PAYROLL_TAX_RULE_PACK_CODE = "SE-PAYROLL-TAX";
const PAYROLL_GARNISHMENT_RULE_PACK_CODE = "SE-GARNISHMENT";
const PAYROLL_TAX_TABLE_BASELINE_2026 = Object.freeze(getSkatteverketMonthlyTaxTable2026Meta());
const PAYROLL_ONE_TIME_TAX_TABLE_BASELINE_2026 = Object.freeze(getSkatteverketOneTimeTaxTable2026Meta());
const PAYROLL_EXCEPTION_RULES = Object.freeze({
  employment_contract_missing: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  payroll_tax_profile_missing: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  payroll_tax_rate_missing: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  payroll_tax_mode_invalid: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  pending_time_approvals_exist: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  approved_time_set_missing: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  approved_time_entries_outside_time_set: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  pending_absence_approvals_exist: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  absence_decision_missing: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "recalculate" }),
  payroll_migration_batch_not_ready: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "fix_source" }),
  payroll_migration_open_diffs: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "fix_source" }),
  payroll_migration_validation_blocking: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "fix_source" }),
  collective_agreement_resolution_failed: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "fix_source" }),
  collective_agreement_no_active_assignment: Object.freeze({ severity: "error", blocking: true, resolutionPolicy: "fix_source" }),
  collective_agreement_missing: Object.freeze({ severity: "warning", blocking: false, resolutionPolicy: "manual_review" }),
  negative_net_pay: Object.freeze({ severity: "warning", blocking: false, resolutionPolicy: "recalculate" }),
  benefit_without_cash_salary: Object.freeze({ severity: "warning", blocking: false, resolutionPolicy: "manual_review" }),
  travel_preapproval_required: Object.freeze({ severity: "warning", blocking: false, resolutionPolicy: "manual_review" }),
  travel_allowance_excess_taxable: Object.freeze({ severity: "warning", blocking: false, resolutionPolicy: "manual_review" }),
  benefit_car_missing_mileage_log: Object.freeze({ severity: "warning", blocking: false, resolutionPolicy: "manual_review" }),
  benefit_wellness_prior_events_may_need_reassessment: Object.freeze({
    severity: "warning",
    blocking: false,
    resolutionPolicy: "manual_review"
  }),
  salary_exchange_threshold_warning: Object.freeze({ severity: "warning", blocking: false, resolutionPolicy: "manual_review" }),
  salary_exchange_social_insurance_review_required: Object.freeze({
    severity: "warning",
    blocking: false,
    resolutionPolicy: "manual_review"
  }),
  garnishment_dual_review_required: Object.freeze({
    severity: "warning",
    blocking: false,
    resolutionPolicy: "manual_review"
  })
});

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
    rulePackCode: PAYROLL_EMPLOYER_CONTRIBUTION_RULE_PACK_CODE,
    domain: "payroll",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-04-01",
    version: "2026.1",
    checksum: "phase8-payroll-employer-contribution-se-2026-1",
    sourceSnapshotDate: "2026-03-22",
    semanticChangeSummary: "Phase 8.2 payroll rule pack for 2026 employer contribution classes before the temporary youth relief starts.",
    machineReadableRules: {
      contributionClasses: {
        full: { ratePercent: 31.42 },
        reduced_age_pension_only: { ratePercent: 10.21 },
        vaxa: {
          reducedRatePercent: 10.21,
          standardRatePercent: 31.42,
          thresholdAmount: 25000,
          availabilityFrom: "2026-01-01",
          refundProcessCode: "tax_account_credit_2026",
          supportWindowMonths: 24,
          supportEmployeeCountLimit: 2
        },
        no_contribution: {
          ratePercent: 0,
          eligibilityBirthYearOnOrBefore: 1937
        }
      }
    },
    humanReadableExplanation: [
      "Employer contribution outcome is driven by rule pack, payout date and the resolved statutory profile.",
      "Reduced-rate eligibility remains explicit so the platform stays deterministic and auditable.",
      "Vaxa support is modelled as a pinned refund exposure against the tax account instead of a hidden inline reduction."
    ],
    testVectors: [
      { vectorId: "payroll-full-2026" },
      { vectorId: "payroll-reduced-2026" },
      { vectorId: "payroll-none-2026" },
      { vectorId: "payroll-vaxa-refund-2026" }
    ],
    migrationNotes: ["Phase 8.2 adds AGI submissions and SINK support on top of this contribution pack."]
  },
  {
    rulePackId: "payroll-employer-contribution-se-2026.2",
    rulePackCode: PAYROLL_EMPLOYER_CONTRIBUTION_RULE_PACK_CODE,
    domain: "payroll",
    jurisdiction: "SE",
    effectiveFrom: "2026-04-01",
    effectiveTo: null,
    version: "2026.2",
    checksum: "phase8-payroll-employer-contribution-se-2026-2",
    sourceSnapshotDate: "2026-03-25",
    semanticChangeSummary: "Adds the temporary 2026-2027 youth employer-contribution reduction with threshold split while preserving existing explicit classes.",
    machineReadableRules: {
      contributionClasses: {
        full: { ratePercent: 31.42 },
        reduced_age_pension_only: { ratePercent: 10.21 },
        vaxa: {
          reducedRatePercent: 10.21,
          standardRatePercent: 31.42,
          thresholdAmount: 25000,
          availabilityFrom: "2026-01-01",
          refundProcessCode: "tax_account_credit_2026",
          supportWindowMonths: 24,
          supportEmployeeCountLimit: 2
        },
        no_contribution: {
          ratePercent: 0,
          eligibilityBirthYearOnOrBefore: 1937
        },
        temporary_youth_reduction: {
          reducedRatePercent: 20.81,
          standardRatePercent: 31.42,
          thresholdAmount: 25000,
          eligibleAgeYears: { min: 19, max: 23 },
          eligibilityFrom: "2026-04-01",
          eligibilityTo: "2027-09-30"
        }
      }
    },
    humanReadableExplanation: [
      "Employer contribution outcome is driven by rule pack, payout date and the resolved statutory profile.",
      "For pay dates from 1 April 2026 through 30 September 2027 the platform auto-applies the temporary youth reduction for employees who are 19-23 during the payout year, up to SEK 25,000 per month.",
      "Vaxa support remains a separate refund exposure against the tax account with the underlying 31.42/10.21 reference rates pinned in the rule pack."
    ],
    testVectors: [
      { vectorId: "payroll-full-2026" },
      { vectorId: "payroll-reduced-2026" },
      { vectorId: "payroll-none-2026" },
      { vectorId: "payroll-youth-threshold-2026" },
      { vectorId: "payroll-vaxa-refund-2026" }
    ],
    migrationNotes: ["Phase 8.2 adds the temporary youth reduction from 1 April 2026 without mutating the pre-April historical pack."]
  },
  {
    rulePackId: "payroll-tax-se-2026.1",
    rulePackCode: PAYROLL_TAX_RULE_PACK_CODE,
    domain: "payroll",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: "2026.1",
    checksum: "phase8-payroll-tax-se-2026-1",
    sourceSnapshotDate: PAYROLL_TAX_TABLE_BASELINE_2026.sourceSnapshotDate,
    semanticChangeSummary: "Phase 11.1 payroll tax pack pins official 2026 monthly tax tables plus SINK and A-SINK baselines.",
    machineReadableRules: {
      ordinaryTaxModes: {
        manual_rate: {
          requiresExplicitRate: true
        }
      },
      tableBaseline: {
        sourceUrl: PAYROLL_TAX_TABLE_BASELINE_2026.sourceUrl,
        sourceSnapshotDate: PAYROLL_TAX_TABLE_BASELINE_2026.sourceSnapshotDate,
        sourceSha256: PAYROLL_TAX_TABLE_BASELINE_2026.sourceSha256,
        tableFormatCode: "skatteverket_allmanna_tabeller_manad_2026_txt",
        monthlyThresholdForPercentageRows: 80001
      },
      oneTimeTableBaseline: {
        sourceUrl: PAYROLL_ONE_TIME_TAX_TABLE_BASELINE_2026.sourceUrl,
        sourceSnapshotDate: PAYROLL_ONE_TIME_TAX_TABLE_BASELINE_2026.sourceSnapshotDate,
        sourceSha256: PAYROLL_ONE_TIME_TAX_TABLE_BASELINE_2026.sourceSha256,
        tableFormatCode: "skatteverket_teknisk_beskrivning_skv_433_2026_engangsbelopp"
      },
      sink: {
        standardRatePercent: 22.5,
        seaIncomeRatePercent: 15
      },
      aSink: {
        standardRatePercent: 15
      }
    },
    humanReadableExplanation: [
      "Ordinary table tax resolves from the official Skatteverket 2026 monthly tax-table baseline by table and column.",
      "One-time tax resolves from the official 2026 engångstabell by annual income basis and tax column.",
      "SINK is versioned through the rule pack with standard and sea-income rates.",
      "A-SINK is versioned as a separate fixed-rate path for foreign artists and athletes."
    ],
    testVectors: [
      { vectorId: "payroll-tax-table-34-col1-40000-2026" },
      { vectorId: "payroll-tax-table-34-col1-82000-2026" },
      { vectorId: "payroll-one-time-tax-col1-annual-480000-10000-2026" },
      { vectorId: "payroll-manual-rate-2026" },
      { vectorId: "payroll-sink-2026" },
      { vectorId: "payroll-sink-sea-2026" },
      { vectorId: "payroll-a-sink-2026" }
    ],
    migrationNotes: ["Phase 8.2 uses this tax pack for AGI-ready payroll tax decisions."]
  },
  {
    rulePackId: "payroll-garnishment-se-2026.1",
    rulePackCode: PAYROLL_GARNISHMENT_RULE_PACK_CODE,
    domain: "payroll",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: "2026.1",
    checksum: "phase12-payroll-garnishment-se-2026-1",
    sourceSnapshotDate: "2025-12-01",
    semanticChangeSummary: "Pins 2026 Kronofogden normalbelopp and payroll-side garnishment processing after preliminary tax.",
    machineReadableRules: {
      calculationStageCode: "after_preliminary_tax",
      normalAmountByHouseholdType: {
        single_adult: 6243,
        cohabiting_adults: 10314
      },
      childNormalAmountsByAgeBucket: {
        "0_6": 3336,
        "7_10": 4004,
        "11_14": 4672,
        "15_plus": 5339
      },
      manualOverrideRequiresDualReview: true,
      remittanceModeCode: "monthly_employer_remittance"
    },
    humanReadableExplanation: [
      "Garnishment is calculated after preliminary tax and may never reduce cash salary below the protected amount in the approved decision snapshot.",
      "Payroll keeps the approved decision snapshot, household baseline and remittance audit chain for each affected pay run."
    ],
    testVectors: [
      { vectorId: "garnishment-max-above-protected-2026" },
      { vectorId: "garnishment-fixed-cap-2026" }
    ],
    migrationNotes: ["Phase 12.6 introduces first-class garnishment decisions and remittance instructions."]
  }
]);

const PAY_ITEM_TEMPLATES = Object.freeze([
  createPayItemTemplate("MONTHLY_SALARY", "monthly_salary", "Manadslon", "contract_monthly_salary", "month", "gross_addition", true, true),
  createPayItemTemplate("HOURLY_SALARY", "hourly_salary", "Timlon", "contract_hourly_rate", "hour", "gross_addition", true, true),
  createPayItemTemplate("OVERTIME", "overtime", "Overtid", "contract_hourly_rate", "hour", "gross_addition", true, true),
  createPayItemTemplate("ADDITIONAL_TIME", "additional_time", "Mertid", "contract_hourly_rate", "hour", "gross_addition", true, true),
  createPayItemTemplate("OB", "ob", "OB", "configured_unit_rate", "hour", "gross_addition", true, true),
  createPayItemTemplate("JOUR", "jour", "Jour", "configured_unit_rate", "hour", "gross_addition", true, true),
  createPayItemTemplate("STANDBY", "standby", "Beredskap", "configured_unit_rate", "hour", "gross_addition", true, true),
  createPayItemTemplate("BONUS", "bonus", "Bonus", "manual_amount", "amount", "gross_addition", true, true),
  createPayItemTemplate("COMMISSION", "commission", "Provision", "manual_amount", "amount", "gross_addition", true, true),
  createPayItemTemplate("VACATION_PAY", "vacation_pay", "Semesterlon", "configured_unit_rate", "day", "gross_addition", false, true),
  createPayItemTemplate("VACATION_SUPPLEMENT", "vacation_supplement", "Semestertillagg", "configured_unit_rate", "day", "gross_addition", false, true),
  createPayItemTemplate("VACATION_DEDUCTION", "vacation_deduction", "Semesteravdrag", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("SICK_ABSENCE_DEDUCTION", "sick_absence_deduction", "Sjukavdrag", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("SICK_PAY", "sick_pay", "Sjuklon", "configured_unit_rate", "day", "gross_addition", false, true),
  createPayItemTemplate("QUALIFYING_DEDUCTION", "qualifying_deduction", "Karens", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("CARE_OF_CHILD", "care_of_child", "VAB", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("PARENTAL_LEAVE", "parental_leave", "Foraldraledighet", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("LEAVE_WITHOUT_PAY", "leave_without_pay", "Tjanstledighet", "configured_unit_rate", "day", "gross_deduction", false, false),
  createPayItemTemplate("TAX_FREE_TRAVEL_ALLOWANCE", "tax_free_travel_allowance", "Traktamente skattefritt", "manual_amount", "amount", "gross_addition", false, false),
  createPayItemTemplate("TAXABLE_TRAVEL_ALLOWANCE", "taxable_travel_allowance", "Traktamente skattepliktigt", "manual_amount", "amount", "gross_addition", false, false),
  createPayItemTemplate("TAX_FREE_MILEAGE", "tax_free_mileage", "Milersattning skattefri", "manual_amount", "amount", "gross_addition", false, false),
  createPayItemTemplate("TAXABLE_MILEAGE", "taxable_mileage", "Milersattning skattepliktig", "manual_amount", "amount", "gross_addition", false, false),
  createPayItemTemplate("EXPENSE_REIMBURSEMENT", "expense_reimbursement", "Utlag", "manual_amount", "amount", "gross_addition", false, false),
  createPayItemTemplate("BENEFIT", "benefit", "Forman", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("PENSION_PREMIUM", "pension_premium", "Pensionspremie", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("FORA_PREMIUM", "fora_premium", "Fora-premie", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("EXTRA_PENSION_PREMIUM", "extra_pension_premium", "Extra pension", "manual_amount", "amount", "reporting_only", false, false),
  createPayItemTemplate("PENSION_SPECIAL_PAYROLL_TAX", "pension_special_payroll_tax", "Sarskild loneskatt pension", "manual_amount", "amount", "reporting_only", false, false),
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
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  environmentMode = "test",
  env = process.env,
  secretRuntimeBridgeRunner = null,
  supportsLegalEffect = false,
  modeWatermarkCode = null,
  orgAuthPlatform = null,
  hrPlatform = null,
  timePlatform = null,
  balancesPlatform = null,
  collectiveAgreementsPlatform = null,
  benefitsPlatform = null,
  travelPlatform = null,
  pensionPlatform = null,
  ledgerPlatform = null,
  bankingPlatform = null,
  tenantControlPlatform = null,
  evidencePlatform = null,
  ruleRegistry = null,
  providerBaselineRegistry = null,
  getCorePlatform = null,
  getRegulatedSubmissionsPlatform = null,
  secretStore = null,
  secretSealKey = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({ clock, seedRulePacks: EMPLOYER_CONTRIBUTION_RULE_PACKS });
  const providerBaselines =
    providerBaselineRegistry
    || createProviderBaselineRegistry({ clock, seedProviderBaselines: PAYROLL_PROVIDER_BASELINES });
  const payrollSecretStore =
    secretStore ||
    createConfiguredSecretStore({
      clock,
      env,
      bridgeRunner: secretRuntimeBridgeRunner || undefined,
      environmentMode,
      storeId: "payroll",
      masterKey: secretSealKey || `swedish-erp-payroll-seal:${environmentMode}`,
      activeKeyVersion: `payroll:${environmentMode}:v1`
    });
  const state = {
    payItems: new Map(),
    payItemIdsByCompany: new Map(),
    payItemIdsByCode: new Map(),
    payCalendars: new Map(),
    payCalendarIdsByCompany: new Map(),
    payCalendarIdsByCode: new Map(),
    payRuns: new Map(),
    payRunIdsByCompany: new Map(),
    payrollInputSnapshots: new Map(),
    payrollInputSnapshotIdsByCompany: new Map(),
    payrollInputSnapshotIdByRun: new Map(),
    taxDecisionSnapshots: new Map(),
    taxDecisionSnapshotIdsByCompany: new Map(),
    taxDecisionSnapshotIdsByEmployment: new Map(),
    employerContributionDecisionSnapshots: new Map(),
    employerContributionDecisionSnapshotIdsByCompany: new Map(),
    employerContributionDecisionSnapshotIdsByEmployment: new Map(),
    garnishmentDecisionSnapshots: new Map(),
    garnishmentDecisionSnapshotIdsByCompany: new Map(),
    garnishmentDecisionSnapshotIdsByEmployment: new Map(),
    remittanceInstructions: new Map(),
    remittanceInstructionIdsByCompany: new Map(),
    remittanceInstructionIdsByRun: new Map(),
    remittanceInstructionIdsByEmployment: new Map(),
    employeeReceivables: new Map(),
    employeeReceivableIdsByCompany: new Map(),
    employeeReceivableIdsByEmployment: new Map(),
    employeeReceivableIdsByRun: new Map(),
    receivableSettlementPlans: new Map(),
    receivableSettlementPlanIdsByCompany: new Map(),
    receivableSettlementPlanIdByReceivable: new Map(),
    receivableOffsetDecisions: new Map(),
    receivableOffsetDecisionIdsByCompany: new Map(),
    receivableOffsetDecisionIdsByReceivable: new Map(),
    receivableOffsetDecisionIdsByEmploymentPeriod: new Map(),
    receivableWriteOffDecisions: new Map(),
    receivableWriteOffDecisionIdsByCompany: new Map(),
    receivableWriteOffDecisionIdsByReceivable: new Map(),
    payRunEvents: new Map(),
    payRunEventIdsByRun: new Map(),
    payrollExceptions: new Map(),
    payrollExceptionIdsByRun: new Map(),
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
    agiSignatureIdsByVersion: new Map(),
    payrollPostings: new Map(),
    payrollPostingIdsByCompany: new Map(),
    payrollPostingIdByRun: new Map(),
    payrollPayoutBatches: new Map(),
    payrollPayoutBatchExportSecrets: new Map(),
    payrollPayoutBatchIdsByCompany: new Map(),
    payrollPayoutBatchIdByRun: new Map(),
    vacationLiabilitySnapshots: new Map(),
    vacationLiabilitySnapshotIdsByCompany: new Map(),
    documentClassificationPayloads: new Map(),
    documentClassificationPayloadIdsByCompany: new Map(),
    documentClassificationPayloadIdsByEmployment: new Map(),
    documentClassificationPayloadIdByIntent: new Map(),
    documentClassificationPayloadIdsByCase: new Map(),
    documentClassificationConsumptions: new Map(),
    documentClassificationConsumptionIdsByIntent: new Map(),
    documentClassificationConsumptionIdByKey: new Map()
  };

  if (seedDemo) {
    seedPayrollDemo(state, { clock, companyId: DEMO_COMPANY_ID });
  }
  migrateLegacyPayrollPayoutExportSecrets(state, {
    secretStore: payrollSecretStore
  });
  maskLegacyPayrollPayoutBatchLines(state);
  maskLegacyStoredPayslipRenderPayloads(state);
  const presentPayoutBatch = (record) =>
    presentPayrollPayoutBatch(state, record, {
      secretStore: payrollSecretStore
    });

  const engine = {
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
    listTaxDecisionSnapshots,
    createTaxDecisionSnapshot,
    approveTaxDecisionSnapshot,
    listEmployerContributionDecisionSnapshots,
    createEmployerContributionDecisionSnapshot,
    approveEmployerContributionDecisionSnapshot,
    listGarnishmentDecisionSnapshots,
    createGarnishmentDecisionSnapshot,
    approveGarnishmentDecisionSnapshot,
    listRemittanceInstructions,
    getRemittanceInstruction,
    settleRemittanceInstruction,
    returnRemittanceInstruction,
    correctRemittanceInstruction,
    listEmployeeReceivables,
    getEmployeeReceivable,
    listReceivableSettlementPlans,
    createReceivableSettlementPlan,
    listReceivableOffsetDecisions,
    createReceivableOffsetDecision,
    listReceivableWriteOffDecisions,
    createReceivableWriteOffDecision,
    approveReceivableWriteOffDecision,
    listEmploymentStatutoryProfiles,
    upsertEmploymentStatutoryProfile,
    listPayRuns,
    getPayRun,
    listPayrollInputSnapshots,
    getPayrollInputSnapshot,
    listPayrollExceptions,
    resolvePayrollException,
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
    createAgiCorrectionVersion,
    listPayrollPostings,
    getPayrollPosting,
    createPayrollPosting,
    listPayrollPayoutBatches,
    getPayrollPayoutBatch,
    createPayrollPayoutBatch,
    matchPayrollPayoutBatch,
    listVacationLiabilitySnapshots,
    createVacationLiabilitySnapshot,
    listPayrollDocumentClassificationPayloads,
    registerDocumentClassificationPayrollPayload,
    reverseDocumentClassificationPayrollPayload,
    exportDurableState,
    importDurableState
  };

  Object.defineProperty(engine, "rulePackGovernance", {
    value: Object.freeze({
      listRulePacks: (filters = {}) => rules.listRulePacks({ domain: "payroll", jurisdiction: "SE", ...filters }),
      getRulePack: (filters) => rules.getRulePack(filters),
      createDraftRulePackVersion: (input) => rules.createDraftRulePackVersion(input),
      validateRulePackVersion: (input) => rules.validateRulePackVersion(input),
      approveRulePackVersion: (input) => rules.approveRulePackVersion(input),
      publishRulePackVersion: (input) => rules.publishRulePackVersion(input),
      rollbackRulePackVersion: (input) => rules.rollbackRulePackVersion(input),
      listRulePackRollbacks: (filters = {}) => rules.listRulePackRollbacks({ domain: "payroll", jurisdiction: "SE", ...filters })
    }),
    enumerable: false
  });

  return engine;

  function exportDurableState() {
    migrateLegacyPayrollPayoutExportSecrets(state, {
      secretStore: payrollSecretStore
    });
    maskLegacyPayrollPayoutBatchLines(state);
    maskLegacyStoredPayslipRenderPayloads(state);
    return {
      ...serializeDurableState(state),
      secretStoreBundle: payrollSecretStore.exportSecretBundle()
    };
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
    payrollSecretStore.importSecretBundle(snapshot?.secretStoreBundle);
    migrateLegacyPayrollPayoutExportSecrets(state, {
      secretStore: payrollSecretStore
    });
    maskLegacyPayrollPayoutBatchLines(state);
    maskLegacyStoredPayslipRenderPayloads(state);
  }

  function listEmployerContributionRulePacks({ effectiveDate = null } = {}) {
    return listPayrollRulePacks({ effectiveDate }).filter(
      (candidate) => candidate.machineReadableRules?.contributionClasses != null
    );
  }

  function listPayrollRulePacks({ effectiveDate = null } = {}) {
    return rules
      .listRulePacks({ domain: "payroll", jurisdiction: "SE" })
      .filter((candidate) => !effectiveDate || (candidate.effectiveFrom <= effectiveDate && (!candidate.effectiveTo || candidate.effectiveTo > effectiveDate)))
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
    taxTreatmentCode = resolveDefaultTaxTreatmentCode(payItemCode),
    employerContributionTreatmentCode = resolveDefaultEmployerContributionTreatmentCode(payItemCode),
    agiMappingCode = null,
    ledgerAccountCode = null,
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
      ledgerAccountCode: requireText(
        String(ledgerAccountCode || resolveDefaultLedgerAccountCode(resolvedCode)),
        "pay_item_ledger_account_required"
      ),
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
      timezone: normalizeRequiredIanaTimeZone(timezone, "pay_calendar_timezone_required", { errorFactory: createError }),
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

  function listTaxDecisionSnapshots({ companyId, employmentId = null, status = null, decisionType = null, effectiveDate = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, PAYROLL_TAX_DECISION_STATUSES, "tax_decision_snapshot_status_invalid")
      : null;
    const resolvedDecisionTypes = decisionType
      ? resolveTaxDecisionTypeFilter(
          assertAllowed(decisionType, PAYROLL_TAX_DECISION_TYPES, "tax_decision_snapshot_type_invalid")
        )
      : null;
    const ids = employmentId
      ? state.taxDecisionSnapshotIdsByEmployment.get(buildPayrollEmploymentKey(resolvedCompanyId, requireText(employmentId, "employment_id_required"))) || []
      : state.taxDecisionSnapshotIdsByCompany.get(resolvedCompanyId) || [];
    return ids
      .map((taxDecisionSnapshotId) => state.taxDecisionSnapshots.get(taxDecisionSnapshotId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .filter((candidate) => (resolvedDecisionTypes ? resolvedDecisionTypes.has(candidate.decisionType) : true))
      .filter((candidate) => (effectiveDate ? decisionSnapshotCoversDate(candidate, effectiveDate) : true))
      .sort(
        (left, right) =>
          left.employmentId.localeCompare(right.employmentId) ||
          left.validFrom.localeCompare(right.validFrom) ||
          left.createdAt.localeCompare(right.createdAt)
      )
      .map(copy);
  }

  function createTaxDecisionSnapshot({
    companyId,
    employmentId,
    decisionType,
    incomeYear,
    validFrom,
    validTo = null,
    municipalityCode = null,
    tableCode = null,
    columnCode = null,
    adjustmentFixedAmount = null,
    adjustmentPercentage = null,
    fixedAdjustmentAmount = null,
    percentageAdjustment = null,
    withholdingRatePercent = null,
    withholdingFixedAmount = null,
    decisionSource,
    decisionReference,
    evidenceRef,
    reasonCode = null,
    overrideEndsOn = null,
    rollbackPlanRef = null,
    annualIncomeBasisAmount = null,
    sinkRatePercent = null,
    sinkSeaIncome = false,
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
        throw createError(404, "employment_not_found", "Employment was not found for tax decision snapshot.");
      }
    }
    const normalized = normalizeTaxDecisionSnapshot({
      employmentId: resolvedEmploymentId,
      decisionType,
      incomeYear,
      validFrom,
      validTo,
      municipalityCode,
      tableCode,
      columnCode,
      adjustmentFixedAmount: fixedAdjustmentAmount ?? adjustmentFixedAmount,
      adjustmentPercentage: percentageAdjustment ?? adjustmentPercentage,
      withholdingRatePercent,
      withholdingFixedAmount,
      decisionSource,
      decisionReference,
      evidenceRef,
      reasonCode,
      overrideEndsOn,
      rollbackPlanRef,
      annualIncomeBasisAmount,
      sinkRatePercent,
      sinkSeaIncome
    });
    const requiresDualReview = normalized.decisionType === "emergency_manual";
    const status = requiresDualReview ? "draft" : "approved";
    const now = nowIso(clock);
    const record = {
      taxDecisionSnapshotId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      ...normalized,
      status,
      requiresDualReview,
      approvedAt: status === "approved" ? now : null,
      approvedByActorId: status === "approved" ? requireText(actorId, "actor_id_required") : null,
      overrideEndsOn: normalized.overrideEndsOn,
      rollbackPlanRef: normalized.rollbackPlanRef,
      supersededAt: null,
      supersededBySnapshotId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    state.taxDecisionSnapshots.set(record.taxDecisionSnapshotId, record);
    appendToIndex(state.taxDecisionSnapshotIdsByCompany, resolvedCompanyId, record.taxDecisionSnapshotId);
    appendToIndex(
      state.taxDecisionSnapshotIdsByEmployment,
      buildPayrollEmploymentKey(resolvedCompanyId, resolvedEmploymentId),
      record.taxDecisionSnapshotId
    );
    if (status === "approved") {
      supersedeOverlappingTaxDecisionSnapshots(state, record);
    }
    return copy(record);
  }

  function approveTaxDecisionSnapshot({ companyId, taxDecisionSnapshotId, actorId = "system" } = {}) {
    const record = requireTaxDecisionSnapshot(state, companyId, taxDecisionSnapshotId);
    if (record.status === "approved") {
      return copy(record);
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (record.decisionType !== "emergency_manual") {
      record.status = "approved";
      record.approvedAt = nowIso(clock);
      record.approvedByActorId = resolvedActorId;
      record.updatedAt = record.approvedAt;
      supersedeOverlappingTaxDecisionSnapshots(state, record);
      return copy(record);
    }
    if (record.createdByActorId === resolvedActorId) {
      throw createError(
        409,
        "tax_decision_snapshot_dual_review_required",
        "Emergency manual tax decisions require approval by a different actor."
      );
    }
    assertEmergencyOverrideApprovalWindow({
      snapshot: record,
      currentDate: nowIso(clock).slice(0, 10),
      subjectLabel: "Emergency manual tax decisions",
      errorCode: "tax_decision_snapshot_override_expired"
    });
    record.status = "approved";
    record.approvedAt = nowIso(clock);
    record.approvedByActorId = resolvedActorId;
    record.updatedAt = record.approvedAt;
    supersedeOverlappingTaxDecisionSnapshots(state, record);
    return copy(record);
  }

  function listEmployerContributionDecisionSnapshots({
    companyId,
    employmentId = null,
    status = null,
    decisionType = null,
    effectiveDate = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_STATUSES, "employer_contribution_decision_snapshot_status_invalid")
      : null;
    const resolvedDecisionType = decisionType
      ? assertAllowed(
        decisionType,
        PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_TYPES,
        "employer_contribution_decision_snapshot_type_invalid"
      )
      : null;
    const ids = employmentId
      ? state.employerContributionDecisionSnapshotIdsByEmployment.get(
        buildPayrollEmploymentKey(resolvedCompanyId, requireText(employmentId, "employment_id_required"))
      ) || []
      : state.employerContributionDecisionSnapshotIdsByCompany.get(resolvedCompanyId) || [];
    return ids
      .map((employerContributionDecisionSnapshotId) => state.employerContributionDecisionSnapshots.get(employerContributionDecisionSnapshotId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .filter((candidate) => (resolvedDecisionType ? candidate.decisionType === resolvedDecisionType : true))
      .filter((candidate) => (effectiveDate ? decisionSnapshotCoversDate(candidate, effectiveDate) : true))
      .sort(
        (left, right) =>
          left.employmentId.localeCompare(right.employmentId) ||
          left.validFrom.localeCompare(right.validFrom) ||
          left.createdAt.localeCompare(right.createdAt)
      )
      .map(copy);
  }

  function createEmployerContributionDecisionSnapshot({
    companyId,
    employmentId,
    decisionType,
    ageBucket,
    legalBasisCode,
    validFrom,
    validTo = null,
    baseLimit = null,
    fullRate = null,
    reducedRate = null,
    reducedComponents = null,
    thresholds = null,
    vaxaEligibilityProfile = null,
    rulepackRef = null,
    specialConditions = {},
    decisionSource,
    decisionReference,
    evidenceRef,
    reasonCode = null,
    overrideEndsOn = null,
    rollbackPlanRef = null,
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
        throw createError(404, "employment_not_found", "Employment was not found for employer contribution decision snapshot.");
      }
    }
    const normalized = normalizeEmployerContributionDecisionSnapshot({
      employmentId: resolvedEmploymentId,
      decisionType,
      ageBucket,
      legalBasisCode,
      validFrom,
      validTo,
      baseLimit,
      fullRate,
      reducedRate,
      reducedComponents,
      thresholds,
      vaxaEligibilityProfile,
      rulepackRef,
      specialConditions,
      decisionSource,
      decisionReference,
      evidenceRef,
      reasonCode,
      overrideEndsOn,
      rollbackPlanRef
    });
    const resolvedRulePack = resolveEmployerContributionRulePackForSnapshot({
      validFrom: normalized.validFrom,
      fallbackRulepackRef: normalized.rulepackRef,
      rules
    });
    const normalizedWithRulePack = applyEmployerContributionDecisionRulePackDefaults({
      normalized,
      rulePack: resolvedRulePack
    });
    const requiresDualReview = normalized.decisionType === "vaxa" || normalized.decisionType === "emergency_manual";
    const status = requiresDualReview ? "draft" : "approved";
    const now = nowIso(clock);
    const record = {
      employerContributionDecisionSnapshotId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      ...normalizedWithRulePack,
      status,
      requiresDualReview,
      approvedAt: status === "approved" ? now : null,
      approvedByActorId: status === "approved" ? requireText(actorId, "actor_id_required") : null,
      overrideEndsOn: normalizedWithRulePack.overrideEndsOn,
      rollbackPlanRef: normalizedWithRulePack.rollbackPlanRef,
      supersededAt: null,
      supersededBySnapshotId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    state.employerContributionDecisionSnapshots.set(record.employerContributionDecisionSnapshotId, record);
    appendToIndex(
      state.employerContributionDecisionSnapshotIdsByCompany,
      resolvedCompanyId,
      record.employerContributionDecisionSnapshotId
    );
    appendToIndex(
      state.employerContributionDecisionSnapshotIdsByEmployment,
      buildPayrollEmploymentKey(resolvedCompanyId, resolvedEmploymentId),
      record.employerContributionDecisionSnapshotId
    );
    if (status === "approved") {
      supersedeOverlappingEmployerContributionDecisionSnapshots(state, record);
    }
    return copy(record);
  }

  function approveEmployerContributionDecisionSnapshot({
    companyId,
    employerContributionDecisionSnapshotId,
    actorId = "system"
  } = {}) {
    const record = requireEmployerContributionDecisionSnapshot(state, companyId, employerContributionDecisionSnapshotId);
    if (record.status === "approved") {
      return copy(record);
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (record.requiresDualReview && record.createdByActorId === resolvedActorId) {
      throw createError(
        409,
        "employer_contribution_decision_snapshot_dual_review_required",
        "Employer contribution decisions of this type require approval by a different actor."
      );
    }
    if (record.decisionType === "emergency_manual") {
      assertEmergencyOverrideApprovalWindow({
        snapshot: record,
        currentDate: nowIso(clock).slice(0, 10),
        subjectLabel: "Emergency manual employer contribution decisions",
        errorCode: "employer_contribution_decision_snapshot_override_expired"
      });
    }
    record.status = "approved";
    record.approvedAt = nowIso(clock);
    record.approvedByActorId = resolvedActorId;
    record.updatedAt = record.approvedAt;
    supersedeOverlappingEmployerContributionDecisionSnapshots(state, record);
    return copy(record);
  }

  function listGarnishmentDecisionSnapshots({ companyId, employmentId = null, status = null, decisionType = null, effectiveDate = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, PAYROLL_GARNISHMENT_DECISION_STATUSES, "garnishment_decision_snapshot_status_invalid")
      : null;
    const resolvedDecisionType = decisionType
      ? assertAllowed(decisionType, PAYROLL_GARNISHMENT_DECISION_TYPES, "garnishment_decision_snapshot_type_invalid")
      : null;
    const ids = employmentId
      ? state.garnishmentDecisionSnapshotIdsByEmployment.get(buildPayrollEmploymentKey(resolvedCompanyId, requireText(employmentId, "employment_id_required"))) || []
      : state.garnishmentDecisionSnapshotIdsByCompany.get(resolvedCompanyId) || [];
    return ids
      .map((garnishmentDecisionSnapshotId) => state.garnishmentDecisionSnapshots.get(garnishmentDecisionSnapshotId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .filter((candidate) => (resolvedDecisionType ? candidate.decisionType === resolvedDecisionType : true))
      .filter((candidate) => (effectiveDate ? decisionSnapshotCoversDate(candidate, effectiveDate) : true))
      .sort(
        (left, right) =>
          left.employmentId.localeCompare(right.employmentId) ||
          left.validFrom.localeCompare(right.validFrom) ||
          left.createdAt.localeCompare(right.createdAt)
      )
      .map(copy);
  }

  function createGarnishmentDecisionSnapshot({
    companyId,
    employmentId,
    decisionType,
    incomeYear,
    validFrom,
    validTo = null,
    deductionModelCode = "max_above_protected_amount",
    fixedDeductionAmount = null,
    maximumWithheldAmount = null,
    protectedAmountAmount,
    householdProfile,
    housingCostAmount = null,
    additionalAllowanceAmount = null,
    authorityCaseReference,
    remittanceRecipientName = "Kronofogden",
    remittanceMethodCode = "bankgiro",
    remittanceBankgiro = null,
    remittancePlusgiro = null,
    remittanceOcrReference = null,
    decisionSource,
    decisionReference,
    evidenceRef,
    reasonCode = null,
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
        throw createError(404, "employment_not_found", "Employment was not found for garnishment decision snapshot.");
      }
    }
    const normalized = normalizeGarnishmentDecisionSnapshot({
      employmentId: resolvedEmploymentId,
      decisionType,
      incomeYear,
      validFrom,
      validTo,
      deductionModelCode,
      fixedDeductionAmount,
      maximumWithheldAmount,
      protectedAmountAmount,
      householdProfile,
      housingCostAmount,
      additionalAllowanceAmount,
      authorityCaseReference,
      remittanceRecipientName,
      remittanceMethodCode,
      remittanceBankgiro,
      remittancePlusgiro,
      remittanceOcrReference,
      decisionSource,
      decisionReference,
      evidenceRef,
      reasonCode,
      rules
    });
    const requiresDualReview = normalized.decisionType === "manual_override";
    const status = requiresDualReview ? "draft" : "approved";
    const now = nowIso(clock);
    const record = {
      garnishmentDecisionSnapshotId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      ...normalized,
      status,
      requiresDualReview,
      approvedAt: status === "approved" ? now : null,
      approvedByActorId: status === "approved" ? requireText(actorId, "actor_id_required") : null,
      supersededAt: null,
      supersededBySnapshotId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    state.garnishmentDecisionSnapshots.set(record.garnishmentDecisionSnapshotId, record);
    appendToIndex(state.garnishmentDecisionSnapshotIdsByCompany, resolvedCompanyId, record.garnishmentDecisionSnapshotId);
    appendToIndex(
      state.garnishmentDecisionSnapshotIdsByEmployment,
      buildPayrollEmploymentKey(resolvedCompanyId, resolvedEmploymentId),
      record.garnishmentDecisionSnapshotId
    );
    if (status === "approved") {
      supersedeOverlappingGarnishmentDecisionSnapshots(state, record);
    }
    return copy(record);
  }

  function approveGarnishmentDecisionSnapshot({ companyId, garnishmentDecisionSnapshotId, actorId = "system" } = {}) {
    const record = requireGarnishmentDecisionSnapshot(state, companyId, garnishmentDecisionSnapshotId);
    if (record.status === "approved") {
      return copy(record);
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (record.requiresDualReview && record.createdByActorId === resolvedActorId) {
      throw createError(
        409,
        "garnishment_decision_snapshot_dual_review_required",
        "Manual garnishment overrides require approval by a different actor."
      );
    }
    record.status = "approved";
    record.approvedAt = nowIso(clock);
    record.approvedByActorId = resolvedActorId;
    record.updatedAt = record.approvedAt;
    supersedeOverlappingGarnishmentDecisionSnapshots(state, record);
    return copy(record);
  }

  function listRemittanceInstructions({ companyId, payRunId = null, employmentId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, PAYROLL_GARNISHMENT_REMITTANCE_STATUSES, "remittance_instruction_status_invalid")
      : null;
    let ids = state.remittanceInstructionIdsByCompany.get(resolvedCompanyId) || [];
    if (payRunId) {
      const scoped = new Set(state.remittanceInstructionIdsByRun.get(requireText(payRunId, "pay_run_id_required")) || []);
      ids = ids.filter((remittanceInstructionId) => scoped.has(remittanceInstructionId));
    }
    if (employmentId) {
      const scoped = new Set(
        state.remittanceInstructionIdsByEmployment.get(
          buildPayrollEmploymentKey(resolvedCompanyId, requireText(employmentId, "employment_id_required"))
        ) || []
      );
      ids = ids.filter((remittanceInstructionId) => scoped.has(remittanceInstructionId));
    }
    return ids
      .map((remittanceInstructionId) => state.remittanceInstructions.get(remittanceInstructionId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.employmentId.localeCompare(right.employmentId))
      .map((record) => presentRemittanceInstruction(state, record));
  }

  function getRemittanceInstruction({ companyId, remittanceInstructionId } = {}) {
    return presentRemittanceInstruction(state, requireRemittanceInstruction(state, companyId, remittanceInstructionId));
  }

  function settleRemittanceInstruction({
    companyId,
    remittanceInstructionId,
    settledOn = null,
    paymentOrderReference,
    bankEventId = null,
    actorId = "system"
  } = {}) {
    const record = requireRemittanceInstruction(state, companyId, remittanceInstructionId);
    if (record.status === "settled") {
      return presentRemittanceInstruction(state, record);
    }
    record.status = "settled";
    record.paymentOrderState = "settled";
    record.paymentOrderReference = requireText(paymentOrderReference, "remittance_instruction_payment_order_reference_required");
    record.bankEventId = normalizeOptionalText(bankEventId);
    record.settledAt = settledOn ? normalizeRequiredDate(settledOn, "remittance_instruction_settled_on_invalid") : nowIso(clock);
    record.settledByActorId = requireText(actorId, "actor_id_required");
    record.updatedAt = nowIso(clock);
    appendRunEvent(state, {
      payRunId: record.payRunId,
      companyId: record.companyId,
      eventType: "garnishment_remittance_settled",
      actorId,
      note: `Settled garnishment remittance ${record.remittanceInstructionId}.`,
      recordedAt: record.updatedAt
    });
    return presentRemittanceInstruction(state, record);
  }

  function returnRemittanceInstruction({
    companyId,
    remittanceInstructionId,
    reasonCode,
    actorId = "system"
  } = {}) {
    const record = requireRemittanceInstruction(state, companyId, remittanceInstructionId);
    record.status = "returned";
    record.paymentOrderState = "returned";
    record.returnReasonCode = requireText(reasonCode, "remittance_instruction_return_reason_required");
    record.returnedAt = nowIso(clock);
    record.returnedByActorId = requireText(actorId, "actor_id_required");
    record.updatedAt = record.returnedAt;
    appendRunEvent(state, {
      payRunId: record.payRunId,
      companyId: record.companyId,
      eventType: "garnishment_remittance_returned",
      actorId,
      note: `Returned garnishment remittance ${record.remittanceInstructionId}.`,
      recordedAt: record.updatedAt
    });
    return presentRemittanceInstruction(state, record);
  }

  function correctRemittanceInstruction({
    companyId,
    remittanceInstructionId,
    correctedAmount,
    correctionReasonCode,
    actorId = "system"
  } = {}) {
    const record = requireRemittanceInstruction(state, companyId, remittanceInstructionId);
    const correction = {
      remittanceCorrectionId: crypto.randomUUID(),
      correctedAmount: normalizeRequiredMoney(correctedAmount, "remittance_instruction_corrected_amount_required"),
      correctionReasonCode: requireText(correctionReasonCode, "remittance_instruction_correction_reason_required"),
      correctedAt: nowIso(clock),
      correctedByActorId: requireText(actorId, "actor_id_required")
    };
    record.status = "corrected";
    record.paymentOrderState = "corrected";
    record.correctedAmount = correction.correctedAmount;
    record.corrections = [...copy(record.corrections || []), correction];
    record.updatedAt = correction.correctedAt;
    appendRunEvent(state, {
      payRunId: record.payRunId,
      companyId: record.companyId,
      eventType: "garnishment_remittance_corrected",
      actorId,
      note: `Corrected garnishment remittance ${record.remittanceInstructionId}.`,
      recordedAt: record.updatedAt
    });
    return presentRemittanceInstruction(state, record);
  }

  function listEmployeeReceivables({ companyId, employmentId = null, status = null, sourcePayRunId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, EMPLOYEE_RECEIVABLE_STATUSES, "employee_receivable_status_invalid")
      : null;
    let ids = state.employeeReceivableIdsByCompany.get(resolvedCompanyId) || [];
    if (employmentId) {
      ids = state.employeeReceivableIdsByEmployment.get(
        buildPayrollEmploymentKey(resolvedCompanyId, requireText(employmentId, "employment_id_required"))
      ) || [];
    }
    if (sourcePayRunId) {
      const scopedIds = new Set(state.employeeReceivableIdsByRun.get(requireText(sourcePayRunId, "pay_run_id_required")) || []);
      ids = ids.filter((employeeReceivableId) => scopedIds.has(employeeReceivableId));
    }
    return ids
      .map((employeeReceivableId) => state.employeeReceivables.get(employeeReceivableId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.employmentId.localeCompare(right.employmentId))
      .map((record) => presentEmployeeReceivable(state, record));
  }

  function getEmployeeReceivable({ companyId, employeeReceivableId } = {}) {
    return presentEmployeeReceivable(state, requireEmployeeReceivable(state, companyId, employeeReceivableId));
  }

  function listReceivableSettlementPlans({ companyId, employeeReceivableId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, RECEIVABLE_SETTLEMENT_PLAN_STATUSES, "receivable_settlement_plan_status_invalid")
      : null;
    let ids = state.receivableSettlementPlanIdsByCompany.get(resolvedCompanyId) || [];
    if (employeeReceivableId) {
      const scopedId = state.receivableSettlementPlanIdByReceivable.get(
        requireText(employeeReceivableId, "employee_receivable_id_required")
      );
      ids = scopedId ? [scopedId] : [];
    }
    return ids
      .map((receivableSettlementPlanId) => state.receivableSettlementPlans.get(receivableSettlementPlanId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => presentReceivableSettlementPlan(state, record));
  }

  function createReceivableSettlementPlan({
    companyId,
    employeeReceivableId,
    firstScheduledReportingPeriod = null,
    actorId = "system"
  } = {}) {
    const receivable = requireEmployeeReceivable(state, companyId, employeeReceivableId);
    assertEmployeeReceivableOffsetable(receivable);
    const existingPlanId = state.receivableSettlementPlanIdByReceivable.get(receivable.employeeReceivableId) || null;
    if (existingPlanId) {
      const existingPlan = state.receivableSettlementPlans.get(existingPlanId) || null;
      if (existingPlan && existingPlan.status !== "cancelled") {
        return presentReceivableSettlementPlan(state, existingPlan);
      }
    }
    const record = createReceivableSettlementPlanRecord({
      state,
      receivable,
      firstScheduledReportingPeriod,
      actorId,
      clock
    });
    return presentReceivableSettlementPlan(state, record);
  }

  function listReceivableOffsetDecisions({
    companyId,
    employeeReceivableId = null,
    employmentId = null,
    reportingPeriod = null,
    status = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, RECEIVABLE_OFFSET_DECISION_STATUSES, "receivable_offset_decision_status_invalid")
      : null;
    let ids = state.receivableOffsetDecisionIdsByCompany.get(resolvedCompanyId) || [];
    if (employeeReceivableId) {
      ids = state.receivableOffsetDecisionIdsByReceivable.get(
        requireText(employeeReceivableId, "employee_receivable_id_required")
      ) || [];
    }
    if (employmentId && reportingPeriod) {
      ids = state.receivableOffsetDecisionIdsByEmploymentPeriod.get(
        buildReceivableEmploymentPeriodKey({
          companyId: resolvedCompanyId,
          employmentId: requireText(employmentId, "employment_id_required"),
          reportingPeriod
        })
      ) || [];
    }
    return ids
      .map((receivableOffsetDecisionId) => state.receivableOffsetDecisions.get(receivableOffsetDecisionId))
      .filter(Boolean)
      .filter((candidate) => (employmentId ? candidate.employmentId === employmentId : true))
      .filter((candidate) => (reportingPeriod ? candidate.reportingPeriod === normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid") : true))
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createReceivableOffsetDecision({
    companyId,
    employeeReceivableId,
    reportingPeriod,
    amount,
    note = null,
    actorId = "system"
  } = {}) {
    const receivable = requireEmployeeReceivable(state, companyId, employeeReceivableId);
    assertEmployeeReceivableOffsetable(receivable);
    const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "receivable_offset_reporting_period_required");
    const requestedAmount = normalizeRequiredMoney(amount, "receivable_offset_amount_required");
    if (requestedAmount <= 0) {
      throw createError(400, "receivable_offset_amount_invalid", "Receivable offset amount must be greater than zero.");
    }
    const openAmount = calculateEmployeeReceivableOpenAmount(receivable);
    if (requestedAmount > openAmount) {
      throw createError(
        409,
        "receivable_offset_exceeds_outstanding_amount",
        "Receivable offset amount may not exceed the outstanding employee receivable amount."
      );
    }
    const record = {
      receivableOffsetDecisionId: crypto.randomUUID(),
      companyId: receivable.companyId,
      employeeReceivableId: receivable.employeeReceivableId,
      employmentId: receivable.employmentId,
      employeeId: receivable.employeeId,
      reportingPeriod: resolvedReportingPeriod,
      requestedAmount,
      executedAmount: 0,
      status: "pending_execution",
      note: normalizeOptionalText(note),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      executedAt: null,
      executedByActorId: null,
      executedPayRunId: null,
      executedPayRunLineId: null
    };
    state.receivableOffsetDecisions.set(record.receivableOffsetDecisionId, record);
    appendToIndex(state.receivableOffsetDecisionIdsByCompany, record.companyId, record.receivableOffsetDecisionId);
    appendToIndex(state.receivableOffsetDecisionIdsByReceivable, record.employeeReceivableId, record.receivableOffsetDecisionId);
    appendToIndex(
      state.receivableOffsetDecisionIdsByEmploymentPeriod,
      buildReceivableEmploymentPeriodKey(record),
      record.receivableOffsetDecisionId
    );
    receivable.updatedAt = record.updatedAt;
    if (receivable.status === "open") {
      receivable.status = "scheduled_offset";
    }
    appendEmployeeReceivableEvent(state, {
      companyId: record.companyId,
      employeeReceivableId: record.employeeReceivableId,
      eventType: "employee_receivable_offset_decision_created",
      actorId,
      note: `Created employee receivable offset decision ${record.receivableOffsetDecisionId}.`,
      recordedAt: record.createdAt
    });
    return copy(record);
  }

  function listReceivableWriteOffDecisions({ companyId, employeeReceivableId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status
      ? assertAllowed(status, RECEIVABLE_WRITE_OFF_DECISION_STATUSES, "receivable_write_off_decision_status_invalid")
      : null;
    let ids = state.receivableWriteOffDecisionIdsByCompany.get(resolvedCompanyId) || [];
    if (employeeReceivableId) {
      ids = state.receivableWriteOffDecisionIdsByReceivable.get(
        requireText(employeeReceivableId, "employee_receivable_id_required")
      ) || [];
    }
    return ids
      .map((receivableWriteOffDecisionId) => state.receivableWriteOffDecisions.get(receivableWriteOffDecisionId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createReceivableWriteOffDecision({
    companyId,
    employeeReceivableId,
    amount = null,
    reasonCode,
    note = null,
    actorId = "system"
  } = {}) {
    const receivable = requireEmployeeReceivable(state, companyId, employeeReceivableId);
    assertEmployeeReceivableOffsetable(receivable);
    const openAmount = calculateEmployeeReceivableOpenAmount(receivable);
    const requestedAmount = amount == null
      ? openAmount
      : normalizeRequiredMoney(amount, "receivable_write_off_amount_required");
    if (requestedAmount <= 0) {
      throw createError(400, "receivable_write_off_amount_invalid", "Receivable write-off amount must be greater than zero.");
    }
    if (requestedAmount !== openAmount) {
      throw createError(
        409,
        "receivable_write_off_full_amount_required",
        "Receivable write-off must cover the full outstanding amount."
      );
    }
    const record = {
      receivableWriteOffDecisionId: crypto.randomUUID(),
      companyId: receivable.companyId,
      employeeReceivableId: receivable.employeeReceivableId,
      employmentId: receivable.employmentId,
      employeeId: receivable.employeeId,
      amount: requestedAmount,
      reasonCode: requireText(reasonCode, "receivable_write_off_reason_code_required"),
      note: normalizeOptionalText(note),
      status: "draft",
      requiresDualReview: true,
      postingIntentPreview: buildReceivableWriteOffPostingIntentPreview({
        receivable,
        amount: requestedAmount
      }),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      approvedAt: null,
      approvedByActorId: null,
      supersededAt: null
    };
    state.receivableWriteOffDecisions.set(record.receivableWriteOffDecisionId, record);
    appendToIndex(state.receivableWriteOffDecisionIdsByCompany, record.companyId, record.receivableWriteOffDecisionId);
    appendToIndex(state.receivableWriteOffDecisionIdsByReceivable, record.employeeReceivableId, record.receivableWriteOffDecisionId);
    appendEmployeeReceivableEvent(state, {
      companyId: record.companyId,
      employeeReceivableId: record.employeeReceivableId,
      eventType: "employee_receivable_write_off_decision_created",
      actorId,
      note: `Created employee receivable write-off decision ${record.receivableWriteOffDecisionId}.`,
      recordedAt: record.createdAt
    });
    return copy(record);
  }

  function approveReceivableWriteOffDecision({ companyId, receivableWriteOffDecisionId, actorId = "system" } = {}) {
    const record = requireReceivableWriteOffDecision(state, companyId, receivableWriteOffDecisionId);
    if (record.status === "approved") {
      return copy(record);
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (record.requiresDualReview === true && record.createdByActorId === resolvedActorId) {
      throw createError(
        409,
        "receivable_write_off_dual_review_required",
        "Employee receivable write-off approval requires a different actor."
      );
    }
    const receivable = requireEmployeeReceivable(state, companyId, record.employeeReceivableId);
    assertEmployeeReceivableOffsetable(receivable);
    receivable.writtenOffAmount = roundMoney(Number(receivable.writtenOffAmount || 0) + Number(record.amount || 0));
    receivable.outstandingAmount = 0;
    receivable.status = "written_off";
    receivable.writtenOffAt = nowIso(clock);
    receivable.writtenOffByActorId = resolvedActorId;
    receivable.updatedAt = receivable.writtenOffAt;
    record.status = "approved";
    record.approvedAt = receivable.writtenOffAt;
    record.approvedByActorId = resolvedActorId;
    record.updatedAt = record.approvedAt;
    cancelPendingReceivableSettlementArtifacts(state, receivable.employeeReceivableId, record.approvedAt);
    appendEmployeeReceivableEvent(state, {
      companyId: receivable.companyId,
      employeeReceivableId: receivable.employeeReceivableId,
      eventType: "employee_receivable_written_off",
      actorId,
      note: `Approved employee receivable write-off ${record.receivableWriteOffDecisionId}.`,
      recordedAt: record.approvedAt
    });
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
    manualRateReasonCode = null,
    fallbackTaxMode = null,
    fallbackTaxRatePercent = null,
    fallbackManualRateReasonCode = null,
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
      manualRateReasonCode,
      fallbackTaxMode,
      fallbackTaxRatePercent,
      fallbackManualRateReasonCode
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
      .map((candidate) => enrichPayRun(state, candidate, { evidencePlatform }));
  }

  function getPayRun({ companyId, payRunId } = {}) {
    const payRun = requirePayRun(state, companyId, payRunId);
    return enrichPayRun(state, payRun, { evidencePlatform });
  }

  function listPayrollInputSnapshots({ companyId, payRunId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.payrollInputSnapshotIdsByCompany.get(resolvedCompanyId) || [])
      .map((payrollInputSnapshotId) => state.payrollInputSnapshots.get(payrollInputSnapshotId))
      .filter(Boolean)
      .filter((candidate) => (payRunId ? candidate.payRunId === payRunId : true))
      .sort((left, right) => left.lockedAt.localeCompare(right.lockedAt) || left.payRunId.localeCompare(right.payRunId))
      .map(copy);
  }

  function getPayrollInputSnapshot({ companyId, payrollInputSnapshotId = null, payRunId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSnapshotId =
      normalizeOptionalText(payrollInputSnapshotId) ||
      state.payrollInputSnapshotIdByRun.get(requireText(payRunId, "pay_run_id_required"));
    if (!resolvedSnapshotId) {
      throw createError(404, "payroll_input_snapshot_not_found", "Payroll input snapshot was not found.");
    }
    const snapshot = state.payrollInputSnapshots.get(resolvedSnapshotId);
    if (!snapshot || snapshot.companyId !== resolvedCompanyId) {
      throw createError(404, "payroll_input_snapshot_not_found", "Payroll input snapshot was not found.");
    }
    return copy(snapshot);
  }

  function listPayrollExceptions({ companyId, payRunId, status = null, blockingOnly = false } = {}) {
    requirePayRun(state, companyId, payRunId);
    const resolvedStatus = status ? assertAllowed(status, PAYROLL_EXCEPTION_STATUSES, "payroll_exception_status_invalid") : null;
    return (state.payrollExceptionIdsByRun.get(payRunId) || [])
      .map((payrollExceptionId) => state.payrollExceptions.get(payrollExceptionId))
      .filter(Boolean)
      .filter((candidate) => (resolvedStatus ? candidate.status === resolvedStatus : true))
      .filter((candidate) => (blockingOnly ? candidate.blocking === true : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.code.localeCompare(right.code))
      .map(copy);
  }

  function resolvePayrollException({
    companyId,
    payRunId,
    payrollExceptionId,
    resolutionType = "resolved",
    note,
    actorId = "system"
  } = {}) {
    requirePayRun(state, companyId, payRunId);
    const record = requirePayrollException(state, companyId, payRunId, payrollExceptionId);
    if (record.status !== "open") {
      return copy(record);
    }
    if (record.resolutionPolicy !== "manual_review") {
      throw createError(
        409,
        "payroll_exception_manual_resolution_forbidden",
        "This payroll exception must be fixed in source data and recalculated, not manually resolved."
      );
    }
    record.status = assertAllowed(resolutionType, ["resolved", "waived"], "payroll_exception_resolution_type_invalid");
    record.resolvedAt = nowIso(clock);
    record.resolvedByActorId = requireText(actorId, "actor_id_required");
    record.resolutionNote = requireText(note, "payroll_exception_resolution_note_required");
    record.updatedAt = record.resolvedAt;
    const payRun = requirePayRun(state, companyId, payRunId);
    payRun.exceptionSummary = summarizePayrollExceptions(listPayrollExceptionsFromState(state, payRunId));
    payRun.updatedAt = record.updatedAt;
    appendRunEvent(state, {
      payRunId,
      companyId,
      eventType: "exception_resolved",
      actorId,
      note: `Resolved payroll exception ${record.code}.`,
      recordedAt: record.resolvedAt
    });
    return copy(record);
  }

  function approvePayRun({ companyId, payRunId, actorId = "system" } = {}) {
    const payRun = requirePayRun(state, companyId, payRunId);
    if (payRun.status === "approved") {
      if (!payRun.approvalEvidenceBundleId) {
        syncPayRunApprovalEvidenceBundle({ state, payRun, actorId, evidencePlatform, environmentMode });
      }
      return enrichPayRun(state, payRun, { evidencePlatform });
    }
    const blockingExceptions = listPayrollExceptions({
      companyId,
      payRunId,
      status: "open",
      blockingOnly: true
    });
    if (blockingExceptions.length > 0) {
      throw createError(
        409,
        "payroll_run_has_blocking_exceptions",
        "Payroll run has unresolved blocking exceptions and cannot be approved."
      );
    }
    applyApprovedVacationBalanceConsumptions({
      state,
      payRun,
      actorId,
      balancesPlatform
    });
    executeApprovedReceivableOffsetDecisionsForPayRun({
      state,
      payRun,
      actorId,
      clock
    });
    registerApprovedEmployeeReceivablesForPayRun({
      state,
      payRun,
      actorId,
      clock
    });
    autoResolveNegativeNetPayExceptionsForPayRun({
      state,
      payRun,
      actorId,
      clock
    });
    payRun.status = "approved";
    payRun.approvedAt = nowIso(clock);
    payRun.updatedAt = payRun.approvedAt;
    ensurePayRunRemittanceInstructions({
      state,
      payRun,
      actorId,
      clock
    });
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "approved",
      actorId,
      note: "Payroll run approved.",
      recordedAt: nowIso(clock)
    });
    for (const payRunLineId of state.payRunLineIdsByRun.get(payRun.payRunId) || []) {
      const line = state.payRunLines.get(payRunLineId);
      if (!line) {
        continue;
      }
      registerExternalPayrollConsumption({
        state,
        payRun,
        line,
        clock,
        actorId,
        stage: "approved",
        benefitsPlatform,
        travelPlatform,
        pensionPlatform
      });
    }
    syncPayRunApprovalEvidenceBundle({ state, payRun, actorId, evidencePlatform, environmentMode });
    return enrichPayRun(state, payRun, { evidencePlatform });
  }

  function createPayRun({
    companyId,
    sessionToken = null,
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
    taxDecisionSnapshots = [],
    employerContributionDecisionSnapshots = [],
    garnishmentDecisionSnapshots = [],
    migrationBatchId = null,
    correctionOfPayRunId = null,
    correctionReason = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const executionBoundary = resolvePayrollExecutionBoundary({
      companyId: resolvedCompanyId,
      environmentMode,
      supportsLegalEffect,
      modeWatermarkCode,
      tenantControlPlatform
    });
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
    }).sort((left, right) => left.employmentId.localeCompare(right.employmentId));
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
    const normalizedTaxDecisionSnapshots = normalizeTaxDecisionSnapshots(taxDecisionSnapshots);
    const normalizedEmployerContributionDecisionSnapshots = normalizeEmployerContributionDecisionSnapshots(
      employerContributionDecisionSnapshots
    );
    const normalizedGarnishmentDecisionSnapshots = normalizeGarnishmentDecisionSnapshots(garnishmentDecisionSnapshots);
    const migrationContext = resolvePayrollMigrationContext({
      companyId: resolvedCompanyId,
      sessionToken,
      migrationBatchId,
      getCorePlatform
    });
    const correctionSourceRun =
      correctionOfPayRunId != null ? requirePayRun(state, resolvedCompanyId, correctionOfPayRunId) : null;
    if (correctionSourceRun && resolvedRunType !== "correction") {
      throw createError(
        409,
        "payroll_correction_source_requires_correction_run",
        "correctionOfPayRunId can only be used together with runType=correction."
      );
    }

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
      migrationBatchId: migrationContext?.batch?.payrollMigrationBatchId || null,
      migrationSnapshot: migrationContext?.snapshot || null,
      correctionOfPayRunId: correctionSourceRun?.payRunId || null,
      correctionReason: normalizeOptionalText(correctionReason),
      payrollInputSnapshotId: null,
      payrollInputFingerprint: "",
      payRunFingerprint: "",
      sourceSnapshotHash: "",
      balanceSnapshotHash: "",
      agreementSnapshotHash: "",
      postingIntentSnapshotHash: "",
      bankPaymentSnapshotHash: "",
      executionBoundary: copy(executionBoundary),
      warningCodes: [],
      rulepackRefs: [],
      providerBaselineRefs: [],
      decisionSnapshotRefs: [],
      exceptionSummary: {
        totalCount: 0,
        blockingOpenCount: 0,
        openCount: 0,
        resolvedCount: 0
      },
      calculatedAt: nowIso(clock),
      approvedAt: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      calculationSteps: [],
      postingStatus: null,
      postingJournalEntryId: null,
      payoutBatchStatus: null,
      payoutBatchId: null,
      approvalEvidenceBundleId: null
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
      statutoryProfiles: [...normalizedStatutoryProfiles.values()],
      taxDecisionSnapshots: [...normalizedTaxDecisionSnapshots.values()],
      employerContributionDecisionSnapshots: [...normalizedEmployerContributionDecisionSnapshots.values()],
      garnishmentDecisionSnapshots: [...normalizedGarnishmentDecisionSnapshots.values()],
      migrationSnapshot: migrationContext?.snapshot || null,
      correctionOfPayRunId: correctionSourceRun?.payRunId || null,
      correctionReason: normalizeOptionalText(correctionReason),
      executionBoundary: copy(executionBoundary)
    };
    const agreementSnapshots = [];
    const balanceSnapshots = [];

    for (const employment of selectedEmployments) {
      const employmentTimeBase = resolveEmploymentTimeBase({
        companyId: resolvedCompanyId,
        employmentId: employment.employmentId,
        period,
        timePlatform
      });
      const payrollInputPeriod = resolveEmploymentPayrollInputPeriod({
        companyId: resolvedCompanyId,
        employmentId: employment.employmentId,
        period,
        timePlatform
      });
      const agreementContext = resolveAgreementContext({
        companyId: resolvedCompanyId,
        employment,
        period,
        collectiveAgreementsPlatform
      });
      const taxDecisionSnapshot = selectTaxDecisionSnapshot({
        state,
        companyId: resolvedCompanyId,
        employmentId: employment.employmentId,
        effectiveDate: period.payDate,
        runType: run.runType,
        overrideSnapshots: normalizedTaxDecisionSnapshots
      });
      const employerContributionDecisionSnapshot = selectEmployerContributionDecisionSnapshot({
        state,
        companyId: resolvedCompanyId,
        employmentId: employment.employmentId,
        effectiveDate: period.payDate,
        overrideSnapshots: normalizedEmployerContributionDecisionSnapshots
      });
      const garnishmentDecisionSnapshot = selectGarnishmentDecisionSnapshot({
        state,
        companyId: resolvedCompanyId,
        employmentId: employment.employmentId,
        effectiveDate: period.payDate,
        overrideSnapshots: normalizedGarnishmentDecisionSnapshots
      });
      const result = calculateEmploymentRun({
        state,
        rules,
        payRunId: run.payRunId,
        employment,
        period,
        runType: run.runType,
        manualInputs: normalizedManualInputs.filter((item) => item.employmentId === employment.employmentId),
        retroAdjustments: normalizedRetroAdjustments.filter((item) => item.employmentId === employment.employmentId),
        finalPayAdjustments: normalizedFinalPayAdjustments.filter((item) => item.employmentId === employment.employmentId),
        leavePayItemMappings: normalizedLeaveMappings,
        statutoryProfile: normalizedStatutoryProfiles.get(employment.employmentId) || null,
        taxDecisionSnapshot,
        employerContributionDecisionSnapshot,
        garnishmentDecisionSnapshot,
        executionBoundary,
        employmentTimeBase,
        payrollInputPeriod,
        agreementContext,
        hrPlatform,
        timePlatform,
        benefitsPlatform,
        travelPlatform,
        pensionPlatform,
        clock
      });
      employmentResults.push(result);
      warnings.push(...result.warnings);
      sourceSnapshot[employment.employmentId] = result.sourceSnapshot;
      agreementSnapshots.push(result.sourceSnapshot.agreementOverlay || null);
      balanceSnapshots.push({
        externalBalanceSnapshots: result.sourceSnapshot.externalBalanceSnapshots || [],
        vacationBalance: result.sourceSnapshot.vacationBalance || null
      });
    }

    run.sourceSnapshotHash = buildSnapshotHash(sourceSnapshot);
    run.balanceSnapshotHash = buildSnapshotHash(balanceSnapshots);
    run.agreementSnapshotHash = buildSnapshotHash(agreementSnapshots);
    run.postingIntentSnapshotHash = buildPayrollEmploymentPreviewHash(employmentResults, "postingIntentPreview");
    run.bankPaymentSnapshotHash = buildPayrollEmploymentPreviewHash(employmentResults, "bankPaymentPreview");
    run.rulepackRefs = collectPayRunRulepackRefs(employmentResults);
    run.providerBaselineRefs = collectPayRunProviderBaselineRefs({
      providerBaselineRegistry: providerBaselines,
      payRun: run
    });
    run.decisionSnapshotRefs = collectPayRunDecisionSnapshotRefs(run, employmentResults);
    const inputSnapshotRecord = createPayrollInputSnapshotRecord({
      run,
      sourceSnapshot,
      agreementSnapshots,
      balanceSnapshots,
      actorId,
      clock
    });
    run.payrollInputSnapshotId = inputSnapshotRecord.payrollInputSnapshotId;
    run.payrollInputFingerprint = inputSnapshotRecord.inputFingerprint;
    run.warningCodes = [...new Set(warnings.map((warning) => warning.code))].sort();
    run.calculationSteps = PAYROLL_STEP_DEFINITIONS.map((definition) =>
      summarizeStep(definition, employmentResults.map((result) => result.steps[definition.stepNo]))
    );

    state.payRuns.set(run.payRunId, run);
    appendToIndex(state.payRunIdsByCompany, resolvedCompanyId, run.payRunId);
    state.payrollInputSnapshots.set(inputSnapshotRecord.payrollInputSnapshotId, inputSnapshotRecord);
    appendToIndex(state.payrollInputSnapshotIdsByCompany, resolvedCompanyId, inputSnapshotRecord.payrollInputSnapshotId);
    state.payrollInputSnapshotIdByRun.set(run.payRunId, inputSnapshotRecord.payrollInputSnapshotId);
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
        registerExternalPayrollConsumption({
          state,
          payRun: run,
          line: stored,
          clock,
          actorId,
          stage: "calculated",
          benefitsPlatform,
          travelPlatform,
          pensionPlatform
        });
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

    rebuildPayrollExceptions({
      state,
      run,
      employmentResults,
      collectiveAgreementsPlatform,
      migrationContext,
      actorId,
      clock
    });

    run.payRunFingerprint = buildPayRunFingerprint({
      state,
      run
    });

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
      rulepackRefs: [],
      providerBaselineRefs: [],
      decisionSnapshotRefs: [],
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
      timePlatform,
      environmentMode,
      supportsLegalEffect,
      modeWatermarkCode,
      tenantControlPlatform
    });
    persistAgiMaterialization(state, materialized);
    submission.currentVersionId = materialized.version.agiSubmissionVersionId;
    submission.rulepackRefs = copy(materialized.version.rulepackRefs || []);
    submission.providerBaselineRefs = copy(materialized.version.providerBaselineRefs || []);
    submission.decisionSnapshotRefs = copy(materialized.version.decisionSnapshotRefs || []);
    submission.status = materialized.version.state;
    submission.updatedAt = nowIso(clock);
    syncAgiVersionEvidenceBundle({
      state,
      submission,
      version: state.agiSubmissionVersions.get(materialized.version.agiSubmissionVersionId),
      actorId,
      evidencePlatform
    });
    return getAgiSubmission({
      companyId: resolvedCompanyId,
      agiSubmissionId: submission.agiSubmissionId
    });
  }

  function validateAgiSubmission({ companyId, agiSubmissionId } = {}) {
    const submission = requireAgiSubmission(state, companyId, agiSubmissionId);
    const version = requireAgiSubmissionVersion(state, submission.currentVersionId);
    assertAgiVersionMutable(version, "validate");
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
    syncAgiVersionEvidenceBundle({
      state,
      submission,
      version,
      actorId: "system",
      evidencePlatform
    });
    return enrichAgiSubmission(state, submission);
  }

  function markAgiSubmissionReadyForSign({ companyId, agiSubmissionId, actorId = "system" } = {}) {
    const submission = requireAgiSubmission(state, companyId, agiSubmissionId);
    const currentVersion = requireAgiSubmissionVersion(state, submission.currentVersionId);
    assertAgiVersionMutable(currentVersion, "ready_for_sign");
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
    syncAgiVersionEvidenceBundle({
      state,
      submission,
      version,
      actorId,
      evidencePlatform
    });
    return enrichAgiSubmission(state, submission);
  }

  function submitAgiSubmission({
    companyId,
    agiSubmissionId,
    actorId = "system",
    mode = "test",
    simulatedOutcome = null,
    receiptMessage = null,
    receiptErrors = []
  } = {}) {
    const submission = requireAgiSubmission(state, companyId, agiSubmissionId);
    const version = requireAgiSubmissionVersion(state, submission.currentVersionId);
    const executionBoundary = normalizePayrollExecutionBoundary(
      version.executionBoundary,
      resolvePayrollExecutionBoundary({
        companyId: submission.companyId,
        environmentMode,
        supportsLegalEffect,
        modeWatermarkCode,
        tenantControlPlatform
      })
    );
    if (version.state !== "ready_for_sign") {
      throw createError(409, "agi_submission_not_ready_for_sign", "AGI submission must be ready_for_sign before submit.");
    }
    assertPayrollSubmissionModeAllowed({
      requestedMode: mode,
      executionBoundary
    });
    if (executionBoundary.supportsLegalEffect === true) {
      throw createError(
        409,
        "agi_submission_live_provider_not_implemented",
        "Protected runtime AGI submissions require provider-backed transport and receipt collection."
      );
    }
    const resolvedSimulatedOutcome = normalizeOptionalText(simulatedOutcome) || "accepted";

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
    version.submissionMode = executionBoundary.submissionModeCode;
    version.executionBoundary = copy(executionBoundary);
    version.trialGuard = buildPayrollTrialGuard(executionBoundary);
    version.updatedAt = version.submittedAt;
    submission.status = version.state;
    submission.updatedAt = version.submittedAt;

    syncAgiAuthoritySubmissionBridge({
      state,
      submission,
      version,
      actorId,
      mode,
      simulatedOutcome: resolvedSimulatedOutcome,
      receiptMessage,
      receiptErrors,
      getCorePlatform
    });

    lockAgiLeaveSignals({
      version,
      timePlatform,
      actorId,
      lockState: "submitted"
    });

    const receipt = appendAgiReceipt(state, {
      version,
      simulatedOutcome: resolvedSimulatedOutcome,
      message: receiptMessage,
      actorId,
      clock,
      executionBoundary
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
    version.updatedAt = nowIso(clock);
    submission.updatedAt = version.updatedAt;
    syncAgiVersionEvidenceBundle({
      state,
      submission,
      version,
      actorId,
      evidencePlatform
    });
    return enrichAgiSubmission(state, submission);
  }

  function syncAgiAuthoritySubmissionBridge({
    submission,
    version,
    actorId,
    mode,
    simulatedOutcome,
    receiptMessage = null,
    receiptErrors = []
  } = {}) {
    const regulatedSubmissionsPlatform = resolvePayrollRegulatedSubmissionsPlatform({
      getRegulatedSubmissionsPlatform,
      getCorePlatform
    });
    if (!regulatedSubmissionsPlatform || !submission || !version) {
      return null;
    }
    const bridgedSubmission = ensureAgiAuthoritySubmissionDraft({
      regulatedSubmissionsPlatform,
      submission,
      version,
      actorId
    });
    if (!bridgedSubmission) {
      return null;
    }
    const resolvedMode = normalizeOptionalText(mode || version.submissionMode) || "test";
    const bridgedTransport = regulatedSubmissionsPlatform.executeAuthoritySubmissionTransport({
      companyId: submission.companyId,
      submissionId: bridgedSubmission.submissionId,
      actorId,
      mode: resolvedMode,
      transportScenarioCode: resolvedMode === "trial" ? null : "technical_ack",
      message: normalizeOptionalText(receiptMessage)
    });
    if (resolvedMode === "trial") {
      return regulatedSubmissionsPlatform.executeSubmissionReceiptCollection({
        companyId: submission.companyId,
        submissionId: bridgedTransport.submissionId,
        actorId,
        triggerCode: "initial_dispatch"
      });
    }
    return regulatedSubmissionsPlatform.registerSubmissionReceipt({
      companyId: submission.companyId,
      submissionId: bridgedTransport.submissionId,
      receiptType: simulatedOutcome === "accepted" ? "business_ack" : "business_nack",
      providerStatus: `agi_${normalizeOptionalText(simulatedOutcome) || "accepted"}`,
      message:
        normalizeOptionalText(receiptMessage)
        || `AGI ${normalizeOptionalText(simulatedOutcome) || "accepted"} receipt mirrored into regulated submissions.`,
      requiredInput: buildAgiSubmissionRequiredInputCodes(receiptErrors),
      actorId,
      mode: resolvedMode,
      legalEffect: false
    });
  }

  function ensureAgiAuthoritySubmissionDraft({ regulatedSubmissionsPlatform, submission, version, actorId } = {}) {
    const existingAuthoritySubmissionId = normalizeOptionalText(version?.authoritySubmissionId);
    if (existingAuthoritySubmissionId) {
      try {
        return regulatedSubmissionsPlatform.getAuthoritySubmission({
          companyId: submission.companyId,
          submissionId: existingAuthoritySubmissionId
        });
      } catch {}
    }
    const payloadVersion = requireText(
      version?.adapterPayloadJson?.payloadVersion || "agi-json-v1",
      "agi_submission_payload_version_required"
    );
    const latestPayrollSignatureReference = resolveLatestAgiSignatureReference(version);
    const payload = buildAgiAuthoritySubmissionPayload({
      submission,
      version,
      payloadVersion,
      payrollSignatureReference: latestPayrollSignatureReference
    });
    const previousVersion = version?.previousSubmittedVersionId
      ? requireAgiSubmissionVersion(state, version.previousSubmittedVersionId)
      : null;
    const previousAuthoritySubmissionId = normalizeOptionalText(previousVersion?.authoritySubmissionId);
    const prepared =
      previousAuthoritySubmissionId
        ? regulatedSubmissionsPlatform.openSubmissionCorrection({
            companyId: submission.companyId,
            submissionId: previousAuthoritySubmissionId,
            actorId,
            reasonCode: version.correctionReason || "agi_correction_version",
            sourceObjectType: "payroll_agi_submission_version",
            sourceObjectId: version.agiSubmissionVersionId,
            sourceObjectVersion: version.agiSubmissionVersionId,
            payload,
            payloadVersion,
            providerKey: PAYROLL_AGI_PROVIDER_CODE,
            recipientId: "skatteverket:agi",
            submissionFamilyCode: "agi_monthly",
            evidencePackId: version.evidenceBundleId,
            signedState: "not_required",
            retryClass: "manual_only",
            correlationId: submission.agiSubmissionId
          }).submission
        : regulatedSubmissionsPlatform.prepareAuthoritySubmission({
            companyId: submission.companyId,
            submissionType: "agi_monthly",
            submissionFamilyCode: "agi_monthly",
            periodId: submission.reportingPeriod,
            sourceObjectType: "payroll_agi_submission_version",
            sourceObjectId: version.agiSubmissionVersionId,
            sourceObjectVersion: version.agiSubmissionVersionId,
            payloadVersion,
            providerKey: PAYROLL_AGI_PROVIDER_CODE,
            recipientId: "skatteverket:agi",
            payload,
            signedState: "not_required",
            evidencePackId: version.evidenceBundleId,
            retryClass: "manual_only",
            rulepackRefs: version.rulepackRefs || [],
            providerBaselineRefs: version.providerBaselineRefs || [],
            decisionSnapshotRefs: version.decisionSnapshotRefs || [],
            actorId,
            idempotencyKey: buildAgiAuthoritySubmissionIdempotencyKey({ submission, version }),
            correlationId: submission.agiSubmissionId
          });
    version.authoritySubmissionId = prepared.submissionId;
    return prepared;
  }

  function buildAgiAuthoritySubmissionPayload({ submission, version, payloadVersion, payrollSignatureReference = null } = {}) {
    return {
      sourceObjectVersion: version.agiSubmissionVersionId,
      currentVersionId: version.agiSubmissionVersionId,
      agiSubmissionId: submission.agiSubmissionId,
      agiSubmissionVersionId: version.agiSubmissionVersionId,
      reportingPeriod: submission.reportingPeriod,
      evidencePackId: version.evidenceBundleId,
      executionBoundary: copy(version.executionBoundary || {}),
      payloadVersion,
      payrollSignatureReference: normalizeOptionalText(payrollSignatureReference),
      declarationEnvelope: copy(version.adapterPayloadJson?.declarationEnvelope || {}),
      totals: copy(version.payloadJson?.totals || {}),
      employerTotals: copy(version.payloadJson?.employerTotals || {})
    };
  }

  function buildAgiAuthoritySubmissionIdempotencyKey({ submission, version } = {}) {
    return buildSnapshotHash({
      submissionType: "agi_monthly",
      companyId: submission?.companyId,
      reportingPeriod: submission?.reportingPeriod,
      agiSubmissionId: submission?.agiSubmissionId,
      agiSubmissionVersionId: version?.agiSubmissionVersionId,
      payloadHash: version?.payloadHash
    });
  }

  function resolveLatestAgiSignatureReference(version) {
    const signatureIds = state.agiSignatureIdsByVersion.get(version?.agiSubmissionVersionId) || [];
    const latestSignatureId = signatureIds[signatureIds.length - 1] || null;
    const latestSignature = latestSignatureId ? state.agiSignatures.get(latestSignatureId) : null;
    return normalizeOptionalText(latestSignature?.signatureReference);
  }

  function buildAgiSubmissionRequiredInputCodes(receiptErrors) {
    if (!Array.isArray(receiptErrors) || receiptErrors.length === 0) {
      return [];
    }
    return [...new Set(
      receiptErrors
        .map((error) => normalizeOptionalText(error?.errorCode || error?.code))
        .filter(Boolean)
    )];
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
      timePlatform,
      environmentMode,
      supportsLegalEffect,
      modeWatermarkCode,
      tenantControlPlatform
    });
    persistAgiMaterialization(state, materialized);
    submission.currentVersionId = materialized.version.agiSubmissionVersionId;
    submission.rulepackRefs = copy(materialized.version.rulepackRefs || []);
    submission.providerBaselineRefs = copy(materialized.version.providerBaselineRefs || []);
    submission.decisionSnapshotRefs = copy(materialized.version.decisionSnapshotRefs || []);
    submission.status = materialized.version.state;
    submission.updatedAt = nowIso(clock);
    syncAgiVersionEvidenceBundle({
      state,
      submission,
      version: state.agiSubmissionVersions.get(materialized.version.agiSubmissionVersionId),
      actorId,
      evidencePlatform
    });
    return enrichAgiSubmission(state, submission);
  }

  function listPayrollPostings({ companyId, payRunId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.payrollPostingIdsByCompany.get(resolvedCompanyId) || [])
      .map((payrollPostingId) => state.payrollPostings.get(payrollPostingId))
      .filter(Boolean)
      .filter((candidate) => (payRunId ? candidate.payRunId === payRunId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => presentPayrollPosting(state, record));
  }

  function getPayrollPosting({ companyId, payrollPostingId } = {}) {
    return presentPayrollPosting(state, requirePayrollPosting(state, companyId, payrollPostingId));
  }

  function createPayrollPosting({ companyId, payRunId, actorId = "system" } = {}) {
    const payRun = requireApprovedPayRun(state, companyId, payRunId);
    const existingPostingId = state.payrollPostingIdByRun.get(payRun.payRunId);
    if (existingPostingId) {
      return presentPayrollPosting(state, state.payrollPostings.get(existingPostingId));
    }
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      throw createError(500, "ledger_platform_missing", "Ledger platform is required to create payroll postings.");
    }

    const postingModel = buildPayrollPostingModel({
      state,
      payRun,
      ledgerPlatform,
      hrPlatform,
      rules
    });

    const posted = ledgerPlatform.applyPostingIntent({
      companyId: payRun.companyId,
      journalDate: payRun.payDate,
      recipeCode: payRun.runType === "correction" ? "PAYROLL_CORRECTION" : "PAYROLL_RUN",
      postingSignalCode: "payroll.run.posted",
      voucherSeriesPurposeCode: payRun.runType === "correction" ? "PAYROLL_CORRECTION" : "PAYROLL_RUN",
      fallbackVoucherSeriesCode: "H",
      sourceType: payRun.runType === "correction" ? "PAYROLL_CORRECTION" : "PAYROLL_RUN",
      sourceId: payRun.payRunId,
      sourceObjectVersion: postingModel.payloadHash,
      actorId,
      idempotencyKey: `payroll_post:${payRun.payRunId}:${postingModel.payloadHash}`,
      description: `Payroll ${payRun.reportingPeriod} ${payRun.runType}`,
      metadataJson: {
        pipelineStage: "payroll_posting",
        payRunId: payRun.payRunId,
        payrollInputSnapshotId: payRun.payrollInputSnapshotId,
        payrollInputFingerprint: payRun.payrollInputFingerprint,
        payRunFingerprint: payRun.payRunFingerprint,
        reportingPeriod: payRun.reportingPeriod,
        runType: payRun.runType,
        rulepackRefs: copy(payRun.rulepackRefs || []),
        providerBaselineRefs: copy(payRun.providerBaselineRefs || []),
        decisionSnapshotRefs: copy(payRun.decisionSnapshotRefs || [])
      },
      lines: postingModel.journalLines
    });
    const now = nowIso(clock);
    const record = {
      payrollPostingId: crypto.randomUUID(),
      companyId: payRun.companyId,
      payRunId: payRun.payRunId,
      reportingPeriod: payRun.reportingPeriod,
      runType: payRun.runType,
      status: "posted",
      journalEntryId: posted.journalEntry.journalEntryId,
      payloadHash: postingModel.payloadHash,
      payrollInputSnapshotId: payRun.payrollInputSnapshotId,
      payrollInputFingerprint: payRun.payrollInputFingerprint,
      payRunFingerprint: payRun.payRunFingerprint,
      sourceSnapshotHash: postingModel.sourceSnapshotHash,
      rulepackRefs: copy(payRun.rulepackRefs || []),
      providerBaselineRefs: copy(payRun.providerBaselineRefs || []),
      decisionSnapshotRefs: copy(payRun.decisionSnapshotRefs || []),
      totals: postingModel.totals,
      journalLines: postingModel.journalLines.map(copy),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    state.payrollPostings.set(record.payrollPostingId, record);
    appendToIndex(state.payrollPostingIdsByCompany, record.companyId, record.payrollPostingId);
    state.payrollPostingIdByRun.set(record.payRunId, record.payrollPostingId);
    payRun.updatedAt = now;
    payRun.postingStatus = record.status;
    payRun.postingJournalEntryId = record.journalEntryId;
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "posted",
      actorId,
      note: `Posted payroll journal ${posted.journalEntry.voucherSeriesCode}${posted.journalEntry.voucherNumber}.`,
      recordedAt: now
    });
    return presentPayrollPosting(state, record);
  }

  function listPayrollPayoutBatches({ companyId, payRunId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.payrollPayoutBatchIdsByCompany.get(resolvedCompanyId) || [])
      .map((payrollPayoutBatchId) => state.payrollPayoutBatches.get(payrollPayoutBatchId))
      .filter(Boolean)
      .filter((candidate) => (payRunId ? candidate.payRunId === payRunId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => presentPayoutBatch(record));
  }

  function getPayrollPayoutBatch({ companyId, payrollPayoutBatchId } = {}) {
    return presentPayoutBatch(requirePayrollPayoutBatch(state, companyId, payrollPayoutBatchId));
  }

  function createPayrollPayoutBatch({ companyId, payRunId, bankAccountId = null, actorId = "system" } = {}) {
    const payRun = requireApprovedPayRun(state, companyId, payRunId);
    const existingBatchId = state.payrollPayoutBatchIdByRun.get(payRun.payRunId);
    if (existingBatchId) {
      return presentPayoutBatch(state.payrollPayoutBatches.get(existingBatchId));
    }
    const posting = state.payrollPostingIdByRun.get(payRun.payRunId)
      ? state.payrollPostings.get(state.payrollPostingIdByRun.get(payRun.payRunId))
      : null;
    if (!posting) {
      throw createError(409, "payroll_posting_required", "Payroll posting must exist before payout export.");
    }

    const executionBoundary = normalizePayrollExecutionBoundary(
      payRun.executionBoundary,
      resolvePayrollExecutionBoundary({
        companyId: payRun.companyId,
        environmentMode,
        supportsLegalEffect,
        modeWatermarkCode,
        tenantControlPlatform
      })
    );
    const companyBankAccount = resolvePayrollSettlementRail({
      companyId: payRun.companyId,
      bankAccountId,
      bankingPlatform,
      executionBoundary
    });
    const batchModel = buildPayrollPayoutBatchModel({
      state,
      payRun,
      companyBankAccount,
      hrPlatform,
      executionBoundary
    });
    const now = nowIso(clock);
    const payoutBatchId = crypto.randomUUID();
    const exportSecretRecord = projectPayrollPayoutBatchExportSecretRecord({
      companyId: payRun.companyId,
      payrollPayoutBatchId: payoutBatchId,
      payRunId: payRun.payRunId,
      exportFileName: batchModel.exportFileName,
      exportPayload: batchModel.exportPayload,
      secretStore: payrollSecretStore
    });
    const record = {
      payrollPayoutBatchId: payoutBatchId,
      companyId: payRun.companyId,
      payRunId: payRun.payRunId,
      reportingPeriod: payRun.reportingPeriod,
      bankAccountId: companyBankAccount.bankAccountId,
      status: "exported",
      bankRailMode: batchModel.bankRailMode,
      executionBoundary: copy(executionBoundary),
      watermarkCode: executionBoundary.watermarkCode || null,
      totalAmount: batchModel.totalAmount,
      paymentDate: payRun.payDate,
      exportFileName: batchModel.exportFileName,
      exportPayload: null,
      exportPayloadHash: batchModel.payloadHash,
      payrollInputSnapshotId: payRun.payrollInputSnapshotId,
      payrollInputFingerprint: payRun.payrollInputFingerprint,
      payRunFingerprint: payRun.payRunFingerprint,
      rulepackRefs: copy(payRun.rulepackRefs || []),
      providerBaselineRefs: copy(payRun.providerBaselineRefs || []),
      decisionSnapshotRefs: copy(payRun.decisionSnapshotRefs || []),
      lines: batchModel.lines.map(maskPayrollPayoutLineForState),
      evidenceBundleId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now,
      matchedAt: null,
      matchedByActorId: null,
      matchedJournalEntryId: null,
      bankEventId: null
    };
    state.payrollPayoutBatchExportSecrets.set(record.payrollPayoutBatchId, exportSecretRecord);
    state.payrollPayoutBatches.set(record.payrollPayoutBatchId, record);
    appendToIndex(state.payrollPayoutBatchIdsByCompany, record.companyId, record.payrollPayoutBatchId);
    state.payrollPayoutBatchIdByRun.set(record.payRunId, record.payrollPayoutBatchId);
    payRun.updatedAt = now;
    payRun.payoutBatchStatus = record.status;
    payRun.payoutBatchId = record.payrollPayoutBatchId;
    record.evidenceBundleId = registerPayrollEvidenceBundle({
      evidencePlatform,
      executionBoundary,
      companyId: record.companyId,
      bundleType: "payroll_trial_payout_batch",
      sourceObjectType: "payroll_payout_batch",
      sourceObjectId: record.payrollPayoutBatchId,
      sourceObjectVersion: record.exportPayloadHash,
      title: `Payroll payout batch ${record.reportingPeriod}`,
      actorId,
      metadata: {
        bankRailMode: record.bankRailMode,
        legalEffect: executionBoundary.supportsLegalEffect === true,
        watermarkCode: record.watermarkCode
      },
      artifactRefs: [
        {
          artifactType: "payout_export",
          artifactRef: `payout:${record.payrollPayoutBatchId}`,
          checksum: record.exportPayloadHash,
          roleCode: "export_payload",
          metadata: {
            exportFileName: record.exportFileName
          }
        }
      ],
      sourceRefs: [
        {
          sourceType: "pay_run",
          sourceId: record.payRunId
        }
      ]
    });
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "payout_exported",
      actorId,
      note: `Exported payroll payout batch ${record.payrollPayoutBatchId}.`,
      recordedAt: now
    });
    return presentPayoutBatch(record);
  }

  function matchPayrollPayoutBatch({ companyId, payrollPayoutBatchId, bankEventId, matchedOn = null, actorId = "system" } = {}) {
    const batch = requirePayrollPayoutBatch(state, companyId, payrollPayoutBatchId);
    if (batch.status === "matched") {
      return presentPayoutBatch(batch);
    }
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      throw createError(500, "ledger_platform_missing", "Ledger platform is required to match payroll payouts to bank.");
    }
    const payRun = requireApprovedPayRun(state, batch.companyId, batch.payRunId);
    const executionBoundary = normalizePayrollExecutionBoundary(
      batch.executionBoundary,
      payRun.executionBoundary || null
    );
    if (executionBoundary.trialGuardActive === true) {
      assertTrialPayrollBankEventId(bankEventId);
    }
    const companyBankAccount = resolvePayrollSettlementRail({
      companyId: batch.companyId,
      bankAccountId: batch.bankAccountId,
      bankingPlatform,
      executionBoundary
    });
    const matchedDate = matchedOn ? normalizeRequiredDate(matchedOn, "payroll_payout_matched_on_invalid") : payRun.payDate;
    const skipLedgerMatchPosting = executionBoundary?.trialGuardActive === true && !companyBankAccount.sourceBankAccountId;
    if (roundMoney(batch.totalAmount) > 0 && !skipLedgerMatchPosting) {
      const posted = ledgerPlatform.applyPostingIntent({
        companyId: batch.companyId,
        journalDate: matchedDate,
        recipeCode: "PAYROLL_PAYOUT_MATCH",
        postingSignalCode: "bank.payment_order.settled",
        voucherSeriesPurposeCode: "PAYROLL_PAYOUT_MATCH",
        fallbackVoucherSeriesCode: "H",
        sourceType: "PAYROLL_RUN",
        sourceId: `${payRun.payRunId}:bank_match`,
        sourceObjectVersion: buildSnapshotHash({
          payrollPayoutBatchId: batch.payrollPayoutBatchId,
          bankEventId,
          matchedDate,
          totalAmount: roundMoney(batch.totalAmount),
          payRunFingerprint: payRun.payRunFingerprint
        }),
        actorId,
        idempotencyKey: `payroll_payout_match:${batch.payrollPayoutBatchId}:${requireText(bankEventId, "bank_event_id_required")}`,
        description: `Payroll payout match ${payRun.reportingPeriod}`,
        metadataJson: {
          pipelineStage: "payroll_payout_match",
          payRunId: payRun.payRunId,
          payrollInputSnapshotId: payRun.payrollInputSnapshotId,
          payrollInputFingerprint: payRun.payrollInputFingerprint,
          payRunFingerprint: payRun.payRunFingerprint,
          payrollPayoutBatchId: batch.payrollPayoutBatchId,
          rulepackRefs: copy(batch.rulepackRefs || []),
          providerBaselineRefs: copy(batch.providerBaselineRefs || []),
          decisionSnapshotRefs: copy(batch.decisionSnapshotRefs || [])
        },
        lines: mergePayrollJournalLines([
          {
            accountNumber: "2790",
            debitAmount: roundMoney(batch.totalAmount),
            creditAmount: 0,
            dimensionJson: {}
          },
          {
            accountNumber: requireText(companyBankAccount.ledgerAccountNumber, "bank_account_ledger_number_required"),
            debitAmount: 0,
            creditAmount: roundMoney(batch.totalAmount),
            dimensionJson: {}
          }
        ])
      });
      batch.matchedJournalEntryId = posted.journalEntry.journalEntryId;
    }
    batch.status = "matched";
    batch.bankEventId = requireText(bankEventId, "bank_event_id_required");
    batch.matchedAt = nowIso(clock);
    batch.matchedByActorId = requireText(actorId, "actor_id_required");
    batch.updatedAt = batch.matchedAt;
    payRun.updatedAt = batch.updatedAt;
    payRun.payoutBatchStatus = batch.status;
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "payout_matched",
      actorId,
      note: `Matched payroll payout batch ${batch.payrollPayoutBatchId} to bank event ${batch.bankEventId}.`,
      recordedAt: batch.updatedAt
    });
    return presentPayoutBatch(batch);
  }

  function listVacationLiabilitySnapshots({ companyId, reportingPeriod = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.vacationLiabilitySnapshotIdsByCompany.get(resolvedCompanyId) || [])
      .map((snapshotId) => state.vacationLiabilitySnapshots.get(snapshotId))
      .filter(Boolean)
      .filter((candidate) => (reportingPeriod ? candidate.reportingPeriod === reportingPeriod : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createVacationLiabilitySnapshot({ companyId, reportingPeriod, actorId = "system" } = {}) {
    const model = buildVacationLiabilitySnapshotModel({
      state,
      companyId,
      reportingPeriod,
      clock,
      hrPlatform,
      rules
    });
    const existing = listVacationLiabilitySnapshots({ companyId, reportingPeriod: model.reportingPeriod })
      .find((candidate) => candidate.snapshotHash === model.snapshotHash);
    if (existing) {
      return existing;
    }
    const record = {
      vacationLiabilitySnapshotId: crypto.randomUUID(),
      companyId: model.companyId,
      reportingPeriod: model.reportingPeriod,
      payRunIds: model.payRunIds,
      totals: model.totals,
      employeeSnapshots: model.employeeSnapshots,
      snapshotHash: model.snapshotHash,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.vacationLiabilitySnapshots.set(record.vacationLiabilitySnapshotId, record);
    appendToIndex(state.vacationLiabilitySnapshotIdsByCompany, record.companyId, record.vacationLiabilitySnapshotId);
    return copy(record);
  }

  function listPayrollDocumentClassificationPayloads({ companyId, employmentId = null, reportingPeriod = null } = {}) {
    return listDocumentClassificationPayloadBundleFromState(state, {
      companyId,
      employmentId,
      reportingPeriod
    });
  }

  function registerDocumentClassificationPayrollPayload({
    companyId,
    classificationCaseId,
    treatmentIntentId,
    documentId,
    employeeId,
    employmentId,
    reportingPeriod,
    treatmentCode,
    sourceType,
    sourceId = null,
    amount,
    currencyCode = "SEK",
    payLinePayloadJson,
    metadataJson = {},
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedTreatmentIntentId = requireText(treatmentIntentId, "treatment_intent_id_required");
    const existingPayloadId = state.documentClassificationPayloadIdByIntent.get(resolvedTreatmentIntentId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const now = nowIso(clock);
    const normalizedPayLinePayload = normalizeDocumentClassificationPayrollPayload({
      companyId: resolvedCompanyId,
      employeeId,
      employmentId,
      reportingPeriod,
      sourceType,
      sourceId: sourceId || resolvedTreatmentIntentId,
      amount,
      payLinePayloadJson,
      state
    });

    if (existingPayloadId) {
      const existing = state.documentClassificationPayloads.get(existingPayloadId);
      if (!existing) {
        state.documentClassificationPayloadIdByIntent.delete(resolvedTreatmentIntentId);
      } else {
        existing.reportingPeriod = normalizedPayLinePayload.reportingPeriod;
        existing.payItemCode = normalizedPayLinePayload.payLinePayloadJson.payItemCode;
        existing.processingStep = normalizedPayLinePayload.payLinePayloadJson.processingStep;
        existing.sourceType = normalizedPayLinePayload.payLinePayloadJson.sourceType;
        existing.sourceId = normalizedPayLinePayload.payLinePayloadJson.sourceId;
        existing.amount = normalizedPayLinePayload.payLinePayloadJson.amount;
        existing.currencyCode = requireText(currencyCode, "currency_code_required");
        existing.payLinePayloadJson = copy(normalizedPayLinePayload.payLinePayloadJson);
        existing.payloadHash = buildSnapshotHash(existing.payLinePayloadJson);
        existing.metadataJson = copy(metadataJson || {});
        existing.status = existing.status === "reversed" ? "pending" : existing.status;
        existing.updatedAt = now;
        existing.updatedByActorId = resolvedActorId;
        return presentDocumentClassificationPayload(state, existing);
      }
    }

    const record = {
      documentClassificationPayrollPayloadId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      classificationCaseId: requireText(classificationCaseId, "classification_case_id_required"),
      treatmentIntentId: resolvedTreatmentIntentId,
      documentId: requireText(documentId, "document_id_required"),
      employeeId: requireText(employeeId, "employee_id_required"),
      employmentId: requireText(employmentId, "employment_id_required"),
      reportingPeriod: normalizedPayLinePayload.reportingPeriod,
      treatmentCode: normalizeCode(treatmentCode, "treatment_code_required"),
      payItemCode: normalizedPayLinePayload.payLinePayloadJson.payItemCode,
      processingStep: normalizedPayLinePayload.payLinePayloadJson.processingStep,
      sourceType: normalizedPayLinePayload.payLinePayloadJson.sourceType,
      sourceId: normalizedPayLinePayload.payLinePayloadJson.sourceId,
      amount: normalizedPayLinePayload.payLinePayloadJson.amount,
      currencyCode: requireText(currencyCode, "currency_code_required"),
      status: "pending",
      payLinePayloadJson: copy(normalizedPayLinePayload.payLinePayloadJson),
      payloadHash: buildSnapshotHash(normalizedPayLinePayload.payLinePayloadJson),
      metadataJson: copy(metadataJson || {}),
      createdByActorId: resolvedActorId,
      createdAt: now,
      updatedAt: now,
      updatedByActorId: resolvedActorId,
      reversedAt: null,
      reversedByActorId: null,
      reversalReasonCode: null,
      replacementTreatmentIntentId: null
    };
    state.documentClassificationPayloads.set(record.documentClassificationPayrollPayloadId, record);
    appendToIndex(state.documentClassificationPayloadIdsByCompany, record.companyId, record.documentClassificationPayrollPayloadId);
    appendToIndex(
      state.documentClassificationPayloadIdsByEmployment,
      buildPayrollEmploymentKey(record.companyId, record.employmentId),
      record.documentClassificationPayrollPayloadId
    );
    appendToIndex(state.documentClassificationPayloadIdsByCase, record.classificationCaseId, record.documentClassificationPayrollPayloadId);
    state.documentClassificationPayloadIdByIntent.set(record.treatmentIntentId, record.documentClassificationPayrollPayloadId);
    return presentDocumentClassificationPayload(state, record);
  }

  function reverseDocumentClassificationPayrollPayload({
    companyId,
    treatmentIntentId,
    actorId = "system",
    reasonCode = "correction",
    replacementTreatmentIntentId = null
  } = {}) {
    const record = requireDocumentClassificationPayload(state, companyId, treatmentIntentId);
    record.status = "reversed";
    record.reversedAt = nowIso(clock);
    record.reversedByActorId = requireText(actorId, "actor_id_required");
    record.reversalReasonCode = normalizeCode(reasonCode, "document_classification_reversal_reason_required");
    record.replacementTreatmentIntentId = normalizeOptionalText(replacementTreatmentIntentId);
    record.updatedAt = record.reversedAt;
    record.updatedByActorId = record.reversedByActorId;
    return presentDocumentClassificationPayload(state, record);
  }
}

function requireApprovedPayRun(state, companyId, payRunId) {
  const payRun = requirePayRun(state, companyId, payRunId);
  if (payRun.status !== "approved") {
    throw createError(409, "pay_run_not_approved", "Payroll run must be approved before payroll posting or payout.");
  }
  return payRun;
}

function requirePayrollPosting(state, companyId, payrollPostingId) {
  const record = state.payrollPostings.get(requireText(payrollPostingId, "payroll_posting_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "payroll_posting_not_found", "Payroll posting was not found.");
  }
  return record;
}

function presentPayrollPosting(state, record) {
  if (!record) {
    return null;
  }
  const payRun = state.payRuns.get(record.payRunId) || null;
  const journalEntry = record.journalEntryId ? copy(record.journalEntryId) : null;
  return {
    ...copy(record),
    payRun: payRun ? enrichPayRun(state, payRun, { evidencePlatform: null }) : null,
    journalEntryId: journalEntry
  };
}

function requirePayrollPayoutBatch(state, companyId, payrollPayoutBatchId) {
  const record = state.payrollPayoutBatches.get(requireText(payrollPayoutBatchId, "payroll_payout_batch_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "payroll_payout_batch_not_found", "Payroll payout batch was not found.");
  }
  return record;
}

function resolvePayrollPayoutBatchExportPayload(state, record, { secretStore = null } = {}) {
  if (!record) {
    return null;
  }
  if (typeof record.exportPayload === "string") {
    return record.exportPayload;
  }
  const secretRecord = state.payrollPayoutBatchExportSecrets.get(record.payrollPayoutBatchId) || null;
  if (!secretRecord?.secretRef || !secretStore?.hasSecretMaterial?.({ secretId: secretRecord.secretRef })) {
    return null;
  }
  const material = secretStore.readSecretMaterial({
    secretId: secretRecord.secretRef,
    parse: true
  });
  return typeof material?.exportPayload === "string" ? material.exportPayload : null;
}

function presentPayrollPayoutBatch(state, record, { secretStore = null } = {}) {
  if (!record) {
    return null;
  }
  const payRun = state.payRuns.get(record.payRunId) || null;
  return {
    ...copy(record),
    exportPayload: resolvePayrollPayoutBatchExportPayload(state, record, {
      secretStore
    }),
    payRun: payRun ? enrichPayRun(state, payRun, { evidencePlatform: null }) : null
  };
}

function resolvePayrollCompanyBankAccount({ companyId, bankAccountId = null, bankingPlatform = null }) {
  if (!bankingPlatform) {
    throw createError(500, "banking_platform_missing", "Banking platform is required for payroll payout export.");
  }
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  if (bankAccountId) {
    return bankingPlatform.getBankAccount({
      companyId: resolvedCompanyId,
      bankAccountId
    });
  }
  const accounts = bankingPlatform.listBankAccounts({
    companyId: resolvedCompanyId,
    activeOnly: true
  });
  const selected = accounts.find((candidate) => candidate.isDefault) || accounts[0] || null;
  if (!selected) {
    throw createError(409, "company_bank_account_required", "An active company bank account is required for payroll payout export.");
  }
  return selected;
}

function resolvePayrollSettlementRail({ companyId, bankAccountId = null, bankingPlatform = null, executionBoundary = null }) {
  if (executionBoundary?.trialGuardActive === true) {
    let preferredAccount = null;
    try {
      preferredAccount =
        bankAccountId != null
          ? resolvePayrollCompanyBankAccount({
              companyId,
              bankAccountId,
              bankingPlatform
            })
          : bankingPlatform?.listBankAccounts?.({
              companyId: requireText(companyId, "company_id_required"),
              activeOnly: true
            })?.[0] || null;
    } catch {
      preferredAccount = null;
    }
    return {
      bankAccountId: `trial:${requireText(companyId, "company_id_required")}:payroll_rail`,
      ledgerAccountNumber: preferredAccount?.ledgerAccountNumber || "1110",
      railMode: "trial_non_live",
      sourceBankAccountId: preferredAccount?.bankAccountId || null
    };
  }
  return resolvePayrollCompanyBankAccount({
    companyId,
    bankAccountId,
    bankingPlatform
  });
}

function buildPayrollPostingModel({ state, payRun, ledgerPlatform, hrPlatform = null, rules = null }) {
  const lines = (state.payRunLineIdsByRun.get(payRun.payRunId) || [])
    .map((payRunLineId) => state.payRunLines.get(payRunLineId))
    .filter(Boolean);
  const payslips = (state.payslipIdsByRun.get(payRun.payRunId) || [])
    .map((payslipId) => state.payslips.get(payslipId))
    .filter(Boolean)
    .map(enrichPayslip);

  const journalLines = [];
  for (const line of lines) {
    const amount = roundMoney(Math.abs(directionalAmount(line)));
    if (!amount) {
      continue;
    }
    const dimensions = normalizePayrollDimensions(line.dimensionJson || {});
    if (line.compensationBucket === "gross_deduction") {
      journalLines.push({
        accountNumber: line.ledgerAccountCode,
        debitAmount: 0,
        creditAmount: amount,
        dimensionJson: dimensions
      });
      continue;
    }
    if (line.compensationBucket === "net_deduction") {
      journalLines.push({
        accountNumber: requireText(line.ledgerAccountCode || "2750", "payroll_net_deduction_ledger_account_required"),
        debitAmount: 0,
        creditAmount: amount,
        dimensionJson: dimensions
      });
      continue;
    }
      journalLines.push({
        accountNumber: line.ledgerAccountCode,
        debitAmount: amount,
        creditAmount: 0,
        dimensionJson: dimensions
      });
      const reportingLiabilityAccount = resolveReportingOnlyLiabilityAccount(line);
      if (reportingLiabilityAccount) {
        journalLines.push({
          accountNumber: reportingLiabilityAccount,
          debitAmount: 0,
          creditAmount: amount,
          dimensionJson: dimensions
        });
      } else if (line.reportingOnly === true && line.agiMappingCode === "taxable_benefit") {
        journalLines.push({
          accountNumber: "2790",
          debitAmount: 0,
          creditAmount: amount,
        dimensionJson: dimensions
      });
    }
  }

  const preliminaryTaxAmount = roundMoney(
    payslips.reduce((sum, payslip) => sum + Number(payslip.totals.preliminaryTax || 0), 0)
  );
  const employerContributionAmount = roundMoney(
    payslips.reduce((sum, payslip) => sum + Number(payslip.totals.employerContributionPreviewAmount || 0), 0)
  );
  const cashNetPayAmount = roundMoney(
    payslips.reduce((sum, payslip) => sum + Number(payslip.totals.cashNetPayAmount ?? Math.max(0, Number(payslip.totals.netPay || 0))), 0)
  );
  const employeeReceivableAmount = roundMoney(
    payslips.reduce(
      (sum, payslip) => sum + Number(payslip.totals.employeeReceivableAmount ?? Math.max(0, -Number(payslip.totals.netPay || 0))),
      0
    )
  );

  if (preliminaryTaxAmount > 0) {
    journalLines.push({
      accountNumber: "2710",
      debitAmount: 0,
      creditAmount: preliminaryTaxAmount,
      dimensionJson: {}
    });
  }
  if (employerContributionAmount > 0) {
    journalLines.push({
      accountNumber: "7110",
      debitAmount: employerContributionAmount,
      creditAmount: 0,
      dimensionJson: {}
    });
    journalLines.push({
      accountNumber: "2540",
      debitAmount: 0,
      creditAmount: employerContributionAmount,
      dimensionJson: {}
    });
  }

  const currentVacationSnapshot = buildVacationLiabilitySnapshotModel({
    state,
    companyId: payRun.companyId,
    reportingPeriod: payRun.reportingPeriod,
    clock: { now: payRun.payDate },
    hrPlatform,
    rules
  });
  const previousVacationSnapshot = findLatestVacationLiabilitySnapshotBeforePeriod(state, payRun.companyId, payRun.reportingPeriod);
  const vacationLiabilityDeltaAmount = roundMoney(
    Number(currentVacationSnapshot.totals.liabilityAmount || 0) - Number(previousVacationSnapshot?.totals?.liabilityAmount || 0)
  );
  const vacationEmployerContributionLiabilityDeltaAmount = roundMoney(
    Number(currentVacationSnapshot.totals.employerContributionLiabilityAmount || 0)
      - Number(previousVacationSnapshot?.totals?.employerContributionLiabilityAmount || 0)
  );
  if (vacationLiabilityDeltaAmount !== 0) {
    if (vacationLiabilityDeltaAmount > 0) {
      journalLines.push({
        accountNumber: "7780",
        debitAmount: vacationLiabilityDeltaAmount,
        creditAmount: 0,
        dimensionJson: {}
      });
      journalLines.push({
        accountNumber: "2730",
        debitAmount: 0,
        creditAmount: vacationLiabilityDeltaAmount,
        dimensionJson: {}
      });
    } else {
      journalLines.push({
        accountNumber: "2730",
        debitAmount: Math.abs(vacationLiabilityDeltaAmount),
        creditAmount: 0,
        dimensionJson: {}
      });
      journalLines.push({
        accountNumber: "7780",
        debitAmount: 0,
        creditAmount: Math.abs(vacationLiabilityDeltaAmount),
        dimensionJson: {}
      });
    }
  }
  if (vacationEmployerContributionLiabilityDeltaAmount !== 0) {
    if (vacationEmployerContributionLiabilityDeltaAmount > 0) {
      journalLines.push({
        accountNumber: "7110",
        debitAmount: vacationEmployerContributionLiabilityDeltaAmount,
        creditAmount: 0,
        dimensionJson: {}
      });
      journalLines.push({
        accountNumber: "2540",
        debitAmount: 0,
        creditAmount: vacationEmployerContributionLiabilityDeltaAmount,
        dimensionJson: {}
      });
    } else {
      journalLines.push({
        accountNumber: "2540",
        debitAmount: Math.abs(vacationEmployerContributionLiabilityDeltaAmount),
        creditAmount: 0,
        dimensionJson: {}
      });
      journalLines.push({
        accountNumber: "7110",
        debitAmount: 0,
        creditAmount: Math.abs(vacationEmployerContributionLiabilityDeltaAmount),
        dimensionJson: {}
      });
    }
  }

  if (cashNetPayAmount > 0) {
    journalLines.push({
      accountNumber: "2790",
      debitAmount: 0,
      creditAmount: cashNetPayAmount,
      dimensionJson: {}
    });
  }
  if (employeeReceivableAmount > 0) {
    journalLines.push({
      accountNumber: PAYROLL_EMPLOYEE_RECEIVABLE_ACCOUNT,
      debitAmount: employeeReceivableAmount,
      creditAmount: 0,
      dimensionJson: {}
    });
  }

  const mergedLines = mergePayrollJournalLines(journalLines);
  if (ledgerPlatform?.validateLedgerDimensions) {
    for (const line of mergedLines) {
      ledgerPlatform.validateLedgerDimensions({
        companyId: payRun.companyId,
        dimensions: line.dimensionJson || {}
      });
    }
  }
  const payloadHash = buildSnapshotHash({
    payRunId: payRun.payRunId,
    journalLines: mergedLines,
    preliminaryTaxAmount,
    employerContributionAmount,
    cashNetPayAmount,
    employeeReceivableAmount,
    vacationLiabilityAmount: currentVacationSnapshot.totals.liabilityAmount,
    vacationLiabilityDeltaAmount,
    vacationEmployerContributionLiabilityAmount: currentVacationSnapshot.totals.employerContributionLiabilityAmount,
    vacationEmployerContributionLiabilityDeltaAmount
  });
  return {
    sourceSnapshotHash: buildSnapshotHash({
      payRunId: payRun.payRunId,
      lineIds: lines.map((line) => line.payRunLineId),
      payslipIds: payslips.map((payslip) => payslip.payslipId)
    }),
    payloadHash,
    journalLines: mergedLines,
    totals: {
      preliminaryTaxAmount,
      employerContributionAmount,
      netPayAmount: cashNetPayAmount,
      cashNetPayAmount,
      employeeReceivableAmount,
      vacationLiabilityAmount: currentVacationSnapshot.totals.liabilityAmount,
      vacationLiabilityDeltaAmount,
      vacationEmployerContributionLiabilityAmount: currentVacationSnapshot.totals.employerContributionLiabilityAmount,
      vacationEmployerContributionLiabilityDeltaAmount
    }
  };
}

function buildPayrollPayoutBatchModel({ state, payRun, companyBankAccount, hrPlatform, executionBoundary = null }) {
  const trialGuardActive = executionBoundary?.trialGuardActive === true;
  const payslips = (state.payslipIdsByRun.get(payRun.payRunId) || [])
    .map((payslipId) => state.payslips.get(payslipId))
    .filter(Boolean)
    .map(enrichPayslip);
  const lines = payslips
    .map((payslip) => {
      const cashNetPayAmount = roundMoney(Number(payslip.totals.cashNetPayAmount ?? Math.max(0, Number(payslip.totals.netPay || 0))));
      if (!cashNetPayAmount) {
        return null;
      }
      const bankAccount =
        hrPlatform?.getEmployeeBankAccountDetails?.({
          companyId: payRun.companyId,
          employeeId: payslip.employee.employeeId
        }) ||
        payslip.bankAccount ||
        null;
      if (!bankAccount && !trialGuardActive) {
        throw createError(409, "employee_bank_account_missing", `Employee ${payslip.employee.employeeId} is missing a payout account.`);
      }
      const accountTarget = trialGuardActive
        ? buildTrialSafePayrollAccountTarget({
            reportingPeriod: payRun.reportingPeriod,
            employeeId: payslip.employee.employeeId,
            employmentId: payslip.employment.employmentId
          })
        : bankAccount?.iban ||
          bankAccount?.bankgiro ||
          bankAccount?.plusgiro ||
          [bankAccount?.clearingNumber, bankAccount?.accountNumber].filter(Boolean).join(":") ||
          bankAccount?.maskedAccountDisplay ||
          null;
      return {
        payrollPayoutLineId: crypto.randomUUID(),
        employmentId: payslip.employment.employmentId,
        employeeId: payslip.employee.employeeId,
        employeeNumber: payslip.employee.employeeNumber || null,
        payeeName: payslip.employee.displayName,
        payoutMethod: trialGuardActive ? "trial_non_live_rail" : bankAccount?.payoutMethod || null,
        accountTarget,
        employeeBankAccountId: trialGuardActive ? null : bankAccount?.employeeBankAccountId || null,
        amount: cashNetPayAmount,
        currencyCode: "SEK",
        paymentReference: `LON ${payRun.reportingPeriod} ${payslip.employee.employeeNumber || payslip.employee.employeeId.slice(0, 8)}`,
        bankRailMode: trialGuardActive ? "trial_non_live" : "standard",
        watermarkCode: executionBoundary?.watermarkCode || null
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.employeeId.localeCompare(right.employeeId));
  const exportRows = lines.map((line) =>
    [line.employeeNumber || "", line.payeeName, line.accountTarget, line.amount.toFixed(2), line.currencyCode, line.paymentReference].join(";")
  );
  const exportPayload = ["employee_no;payee;account;amount;currency;reference", ...exportRows].join("\n");
  return {
    lines,
    bankRailMode: trialGuardActive ? "trial_non_live" : "standard",
    exportFileName: `${trialGuardActive ? "TRIAL-" : ""}PAYROLL-${payRun.reportingPeriod}-${payRun.payRunId.slice(0, 8)}.csv`,
    totalAmount: roundMoney(lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)),
    exportPayload,
    payloadHash: buildSnapshotHash({
      payRunId: payRun.payRunId,
      bankAccountId: companyBankAccount.bankAccountId,
      executionBoundary: copy(executionBoundary || null),
      exportPayload
    })
  };
}

function presentEmployeeReceivable(state, record) {
  const settlementPlanId = record?.settlementPlanId || state.receivableSettlementPlanIdByReceivable.get(record?.employeeReceivableId) || null;
  const settlementPlan = settlementPlanId ? state.receivableSettlementPlans.get(settlementPlanId) || null : null;
  const offsetDecisions = (state.receivableOffsetDecisionIdsByReceivable.get(record.employeeReceivableId) || [])
    .map((receivableOffsetDecisionId) => state.receivableOffsetDecisions.get(receivableOffsetDecisionId))
    .filter(Boolean)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(copy);
  const writeOffDecisions = (state.receivableWriteOffDecisionIdsByReceivable.get(record.employeeReceivableId) || [])
    .map((receivableWriteOffDecisionId) => state.receivableWriteOffDecisions.get(receivableWriteOffDecisionId))
    .filter(Boolean)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(copy);
  return {
    ...copy(record),
    settlementPlan: settlementPlan ? presentReceivableSettlementPlan(state, settlementPlan) : null,
    offsetDecisions,
    writeOffDecisions
  };
}

function presentReceivableSettlementPlan(state, record) {
  const receivable = state.employeeReceivables.get(record.employeeReceivableId) || null;
  return {
    ...copy(record),
    currentOutstandingAmount: receivable ? roundMoney(Number(receivable.outstandingAmount || 0)) : null
  };
}

function summarizeEmployeeReceivables(receivables) {
  const items = Array.isArray(receivables) ? receivables : [];
  return {
    totalCount: items.length,
    openCount: items.filter((item) => item.status === "open").length,
    scheduledOffsetCount: items.filter((item) => item.status === "scheduled_offset").length,
    partiallySettledCount: items.filter((item) => item.status === "partially_settled").length,
    settledCount: items.filter((item) => item.status === "settled").length,
    writtenOffCount: items.filter((item) => item.status === "written_off").length,
    outstandingAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.outstandingAmount || 0), 0))
  };
}

function buildReceivableEmploymentPeriodKey({ companyId, employmentId, reportingPeriod }) {
  return `${requireText(companyId, "company_id_required")}:${requireText(employmentId, "employment_id_required")}:${normalizeReportingPeriod(reportingPeriod, "reporting_period_required")}`;
}

function buildNextReportingPeriod(reportingPeriod) {
  const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "reporting_period_required");
  const year = Number(resolvedReportingPeriod.slice(0, 4));
  const month = Number(resolvedReportingPeriod.slice(4, 6));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${String(nextYear).padStart(4, "0")}${String(nextMonth).padStart(2, "0")}`;
}

function calculateEmployeeReceivableOpenAmount(receivable) {
  return roundMoney(
    Number(receivable.amount || 0) - Number(receivable.settledAmount || 0) - Number(receivable.writtenOffAmount || 0)
  );
}

function assertEmployeeReceivableOffsetable(receivable) {
  if (!receivable) {
    throw createError(404, "employee_receivable_not_found", "Employee receivable was not found.");
  }
  if (["settled", "written_off"].includes(receivable.status)) {
    throw createError(
      409,
      "employee_receivable_not_open",
      "Employee receivable is no longer open for offset or write-off decisions."
    );
  }
}

function buildReceivableWriteOffPostingIntentPreview({ receivable, amount }) {
  const resolvedAmount = normalizeRequiredMoney(amount, "receivable_write_off_amount_required");
  const journalLines = mergePayrollJournalLines([
    {
      accountNumber: PAYROLL_EMPLOYEE_WRITE_OFF_EXPENSE_ACCOUNT,
      debitAmount: resolvedAmount,
      creditAmount: 0,
      dimensionJson: {}
    },
    {
      accountNumber: PAYROLL_EMPLOYEE_RECEIVABLE_ACCOUNT,
      debitAmount: 0,
      creditAmount: resolvedAmount,
      dimensionJson: {}
    }
  ]);
  return {
    payloadHash: buildSnapshotHash({
      employeeReceivableId: receivable.employeeReceivableId,
      amount: resolvedAmount,
      journalLines
    }),
    journalLines
  };
}

function appendEmployeeReceivableEvent(state, { companyId, employeeReceivableId, eventType, actorId, note, recordedAt }) {
  const receivable = state.employeeReceivables.get(requireText(employeeReceivableId, "employee_receivable_id_required")) || null;
  if (!receivable?.sourcePayRunId) {
    return;
  }
  appendRunEvent(state, {
    payRunId: receivable.sourcePayRunId,
    companyId: requireText(companyId, "company_id_required"),
    eventType,
    actorId,
    note,
    recordedAt
  });
}

function createReceivableSettlementInstallment({
  reportingPeriod,
  plannedAmount,
  status = "planned",
  executedAmount = 0,
  executedAt = null,
  executedPayRunId = null,
  executedPayRunLineId = null
}) {
  return {
    installmentId: crypto.randomUUID(),
    reportingPeriod: normalizeReportingPeriod(reportingPeriod, "reporting_period_required"),
    plannedAmount: normalizeRequiredMoney(plannedAmount, "receivable_settlement_planned_amount_required"),
    executedAmount: roundMoney(executedAmount || 0),
    status: assertAllowed(status, RECEIVABLE_SETTLEMENT_INSTALLMENT_STATUSES, "receivable_settlement_installment_status_invalid"),
    executedAt: normalizeOptionalIsoTimestamp(executedAt, "receivable_settlement_installment_executed_at_invalid"),
    executedPayRunId: normalizeOptionalText(executedPayRunId),
    executedPayRunLineId: normalizeOptionalText(executedPayRunLineId)
  };
}

function createReceivableSettlementPlanRecord({
  state,
  receivable,
  firstScheduledReportingPeriod = null,
  actorId = "system",
  clock,
  timestamp = null
}) {
  const createdAt = normalizeOptionalIsoTimestamp(timestamp, "receivable_settlement_plan_timestamp_invalid") || nowIso(clock);
  const plannedReportingPeriod = firstScheduledReportingPeriod
    ? normalizeReportingPeriod(firstScheduledReportingPeriod, "receivable_settlement_reporting_period_invalid")
    : buildNextReportingPeriod(receivable.sourceReportingPeriod);
  const record = {
    receivableSettlementPlanId: crypto.randomUUID(),
    companyId: receivable.companyId,
    employeeReceivableId: receivable.employeeReceivableId,
    employmentId: receivable.employmentId,
    employeeId: receivable.employeeId,
    sourcePayRunId: receivable.sourcePayRunId,
    sourceReportingPeriod: receivable.sourceReportingPeriod,
    status: "scheduled",
    installments: [
      createReceivableSettlementInstallment({
        reportingPeriod: plannedReportingPeriod,
        plannedAmount: calculateEmployeeReceivableOpenAmount(receivable)
      })
    ],
    createdByActorId: requireText(actorId, "actor_id_required"),
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    cancelledAt: null
  };
  state.receivableSettlementPlans.set(record.receivableSettlementPlanId, record);
  appendToIndex(state.receivableSettlementPlanIdsByCompany, record.companyId, record.receivableSettlementPlanId);
  state.receivableSettlementPlanIdByReceivable.set(record.employeeReceivableId, record.receivableSettlementPlanId);
  receivable.settlementPlanId = record.receivableSettlementPlanId;
  receivable.status = "scheduled_offset";
  receivable.updatedAt = record.updatedAt;
  appendEmployeeReceivableEvent(state, {
    companyId: receivable.companyId,
    employeeReceivableId: receivable.employeeReceivableId,
    eventType: "employee_receivable_settlement_plan_created",
    actorId,
    note: `Created employee receivable settlement plan ${record.receivableSettlementPlanId}.`,
    recordedAt: record.createdAt
  });
  return record;
}

function createReceivableOffsetLines({ state, payRunId = null, employment, reportingPeriod }) {
  const decisions = (state.receivableOffsetDecisionIdsByEmploymentPeriod.get(
    buildReceivableEmploymentPeriodKey({
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      reportingPeriod
    })
  ) || [])
    .map((receivableOffsetDecisionId) => state.receivableOffsetDecisions.get(receivableOffsetDecisionId))
    .filter(Boolean)
    .filter((decision) => decision.status === "pending_execution");
  if (decisions.length === 0) {
    return {
      lines: [],
      decisionPreviews: []
    };
  }
  const payItem = requirePayItemByCode(state, employment.companyId, "RECLAIM");
  const lines = [];
  const decisionPreviews = [];
  for (const decision of decisions) {
    const receivable = state.employeeReceivables.get(decision.employeeReceivableId) || null;
    if (!receivable || ["settled", "written_off"].includes(receivable.status)) {
      continue;
    }
    const openAmount = calculateEmployeeReceivableOpenAmount(receivable);
    const lineAmount = roundMoney(Math.min(Number(decision.requestedAmount || 0), openAmount));
    if (lineAmount <= 0) {
      continue;
    }
    lines.push(
      createPayLine({
        payItem,
        employment,
        amount: lineAmount,
        sourceType: "employee_receivable_offset_decision",
        sourceId: decision.receivableOffsetDecisionId,
        note: decision.note || `Employee receivable offset ${decision.receivableOffsetDecisionId}.`,
        processingStep: 13,
        overrides: {
          ledgerAccountCode: PAYROLL_EMPLOYEE_RECEIVABLE_ACCOUNT
        }
      })
    );
    decisionPreviews.push({
      receivableOffsetDecisionId: decision.receivableOffsetDecisionId,
      employeeReceivableId: decision.employeeReceivableId,
      requestedAmount: decision.requestedAmount,
      plannedAmount: lineAmount,
      openAmount,
      reportingPeriod: decision.reportingPeriod,
      payRunId: normalizeOptionalText(payRunId)
    });
  }
  return {
    lines,
    decisionPreviews
  };
}

function executeApprovedReceivableOffsetDecisionsForPayRun({ state, payRun, actorId = "system", clock }) {
  const storedLines = (state.payRunLineIdsByRun.get(payRun.payRunId) || [])
    .map((payRunLineId) => state.payRunLines.get(payRunLineId))
    .filter(Boolean)
    .filter((line) => line.sourceType === "employee_receivable_offset_decision");
  for (const line of storedLines) {
    const decision = state.receivableOffsetDecisions.get(requireText(line.sourceId, "receivable_offset_decision_id_required")) || null;
    if (!decision) {
      throw createError(409, "receivable_offset_decision_not_found", "Employee receivable offset decision was not found.");
    }
    if (decision.status !== "pending_execution") {
      continue;
    }
    const receivable = requireEmployeeReceivable(state, payRun.companyId, decision.employeeReceivableId);
    const openAmount = calculateEmployeeReceivableOpenAmount(receivable);
    const lineAmount = roundMoney(Math.abs(directionalAmount(line)));
    if (lineAmount > openAmount) {
      throw createError(
        409,
        "receivable_offset_pay_run_stale",
        "Employee receivable changed after payroll calculation. Recalculate the pay run before approval."
      );
    }
    decision.executedAmount = lineAmount;
    decision.status = "executed";
    decision.executedAt = nowIso(clock);
    decision.executedByActorId = requireText(actorId, "actor_id_required");
    decision.executedPayRunId = payRun.payRunId;
    decision.executedPayRunLineId = line.payRunLineId;
    decision.updatedAt = decision.executedAt;
    receivable.settledAmount = roundMoney(Number(receivable.settledAmount || 0) + lineAmount);
    receivable.outstandingAmount = calculateEmployeeReceivableOpenAmount(receivable);
    receivable.status = receivable.outstandingAmount > 0 ? "partially_settled" : "settled";
    receivable.updatedAt = decision.executedAt;
    if (receivable.outstandingAmount <= 0) {
      receivable.settledAt = decision.executedAt;
      receivable.settledByActorId = requireText(actorId, "actor_id_required");
    }
    syncReceivableSettlementPlanForExecution({
      state,
      receivable,
      decision,
      payRun,
      line,
      executedAt: decision.executedAt
    });
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "employee_receivable_offset_executed",
      actorId,
      note: `Executed employee receivable offset ${decision.receivableOffsetDecisionId}.`,
      recordedAt: decision.executedAt
    });
  }
}

function syncReceivableSettlementPlanForExecution({ state, receivable, decision, payRun, line, executedAt }) {
  const existingPlanId = state.receivableSettlementPlanIdByReceivable.get(receivable.employeeReceivableId) || null;
  const plan = existingPlanId
    ? state.receivableSettlementPlans.get(existingPlanId) || null
    : createReceivableSettlementPlanRecord({
      state,
      receivable,
      firstScheduledReportingPeriod: decision.reportingPeriod,
      actorId: decision.createdByActorId,
      clock: () => new Date(executedAt),
      timestamp: executedAt
    });
  let installment = (plan.installments || []).find((candidate) => candidate.reportingPeriod === decision.reportingPeriod) || null;
  if (!installment) {
    installment = createReceivableSettlementInstallment({
      reportingPeriod: decision.reportingPeriod,
      plannedAmount: decision.executedAmount
    });
    plan.installments.push(installment);
  }
  installment.executedAmount = roundMoney(Number(installment.executedAmount || 0) + Number(decision.executedAmount || 0));
  installment.executedAt = executedAt;
  installment.executedPayRunId = payRun.payRunId;
  installment.executedPayRunLineId = line.payRunLineId;
  installment.status =
    installment.executedAmount >= installment.plannedAmount
      ? "executed"
      : installment.executedAmount > 0
        ? "partially_executed"
        : installment.status;
  if (receivable.outstandingAmount <= 0) {
    plan.status = "completed";
    plan.completedAt = executedAt;
    for (const candidate of plan.installments || []) {
      if (candidate.status === "planned") {
        candidate.status = "cancelled";
      }
    }
  } else {
    plan.status = "scheduled";
    const hasFutureInstallment = (plan.installments || []).some(
      (candidate) =>
        candidate.reportingPeriod > payRun.reportingPeriod
        && ["planned", "partially_executed"].includes(candidate.status)
    );
    if (!hasFutureInstallment) {
      plan.installments.push(
        createReceivableSettlementInstallment({
          reportingPeriod: buildNextReportingPeriod(payRun.reportingPeriod),
          plannedAmount: receivable.outstandingAmount
        })
      );
    }
  }
  plan.updatedAt = executedAt;
}

function registerApprovedEmployeeReceivablesForPayRun({ state, payRun, actorId = "system", clock }) {
  const payslips = (state.payslipIdsByRun.get(payRun.payRunId) || [])
    .map((payslipId) => state.payslips.get(payslipId))
    .filter(Boolean);
  for (const payslip of payslips) {
    const receivableAmount = roundMoney(
      Number(payslip.renderPayload?.totals?.employeeReceivableAmount ?? Math.max(0, -Number(payslip.renderPayload?.totals?.netPay || 0)))
    );
    if (receivableAmount <= 0) {
      continue;
    }
    const existing = (state.employeeReceivableIdsByRun.get(payRun.payRunId) || [])
      .map((employeeReceivableId) => state.employeeReceivables.get(employeeReceivableId))
      .find((candidate) => candidate?.employmentId === payslip.employmentId);
    if (existing) {
      updateStoredPayslipReceivableState(state, payslip, existing);
      continue;
    }
    const createdAt = nowIso(clock);
    const receivable = {
      employeeReceivableId: crypto.randomUUID(),
      companyId: payRun.companyId,
      employmentId: payslip.employmentId,
      employeeId: payslip.employeeId,
      sourcePayRunId: payRun.payRunId,
      sourcePayslipId: payslip.payslipId,
      sourceReportingPeriod: payRun.reportingPeriod,
      sourcePayDate: payRun.payDate,
      amount: receivableAmount,
      settledAmount: 0,
      writtenOffAmount: 0,
      outstandingAmount: receivableAmount,
      currencyCode: "SEK",
      receivableAccountNumber: PAYROLL_EMPLOYEE_RECEIVABLE_ACCOUNT,
      settlementPlanId: null,
      status: "open",
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt,
      updatedAt: createdAt,
      settledAt: null,
      settledByActorId: null,
      writtenOffAt: null,
      writtenOffByActorId: null
    };
    state.employeeReceivables.set(receivable.employeeReceivableId, receivable);
    appendToIndex(state.employeeReceivableIdsByCompany, receivable.companyId, receivable.employeeReceivableId);
    appendToIndex(
      state.employeeReceivableIdsByEmployment,
      buildPayrollEmploymentKey(receivable.companyId, receivable.employmentId),
      receivable.employeeReceivableId
    );
    appendToIndex(state.employeeReceivableIdsByRun, receivable.sourcePayRunId, receivable.employeeReceivableId);
    createReceivableSettlementPlanRecord({
      state,
      receivable,
      firstScheduledReportingPeriod: buildNextReportingPeriod(payRun.reportingPeriod),
      actorId,
      clock
    });
    updateStoredPayslipReceivableState(state, payslip, receivable);
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "employee_receivable_registered",
      actorId,
      note: `Registered employee receivable ${receivable.employeeReceivableId} for employment ${receivable.employmentId}.`,
      recordedAt: createdAt
    });
  }
}

function updateStoredPayslipReceivableState(state, payslip, receivable) {
  payslip.renderPayload.totals = {
    ...copy(payslip.renderPayload.totals || {}),
    cashNetPayAmount: roundMoney(Number(payslip.renderPayload?.totals?.cashNetPayAmount ?? Math.max(0, Number(payslip.renderPayload?.totals?.netPay || 0)))),
    employeeReceivableAmount: roundMoney(Number(receivable.amount || 0)),
    employeeReceivableId: receivable.employeeReceivableId,
    employeeReceivableStatus: receivable.status,
    employeeReceivableOutstandingAmount: roundMoney(Number(receivable.outstandingAmount || 0)),
    receivableSettlementPlanId: receivable.settlementPlanId || null
  };
  payslip.snapshotHash = buildSnapshotHash(payslip.renderPayload);
}

function autoResolveNegativeNetPayExceptionsForPayRun({ state, payRun, actorId = "system", clock }) {
  let changed = false;
  for (const payrollExceptionId of state.payrollExceptionIdsByRun.get(payRun.payRunId) || []) {
    const record = state.payrollExceptions.get(payrollExceptionId) || null;
    if (!record || record.status !== "open" || record.code !== "negative_net_pay") {
      continue;
    }
    record.status = "resolved";
    record.resolvedAt = nowIso(clock);
    record.resolvedByActorId = requireText(actorId, "actor_id_required");
    record.resolutionNote = "Employee receivable chain registered on payroll approval.";
    record.updatedAt = record.resolvedAt;
    changed = true;
  }
  if (changed) {
    payRun.exceptionSummary = summarizePayrollExceptions(listPayrollExceptionsFromState(state, payRun.payRunId));
    payRun.updatedAt = nowIso(clock);
  }
}

function cancelPendingReceivableSettlementArtifacts(state, employeeReceivableId, updatedAt) {
  const planId = state.receivableSettlementPlanIdByReceivable.get(employeeReceivableId) || null;
  const plan = planId ? state.receivableSettlementPlans.get(planId) || null : null;
  if (plan) {
    plan.status = "cancelled";
    plan.cancelledAt = updatedAt;
    plan.updatedAt = updatedAt;
    plan.installments = (plan.installments || []).map((installment) => (
      ["planned", "partially_executed"].includes(installment.status)
        ? { ...installment, status: "cancelled" }
        : installment
    ));
  }
  for (const receivableOffsetDecisionId of state.receivableOffsetDecisionIdsByReceivable.get(employeeReceivableId) || []) {
    const decision = state.receivableOffsetDecisions.get(receivableOffsetDecisionId) || null;
    if (!decision || decision.status !== "pending_execution") {
      continue;
    }
    decision.status = "cancelled";
    decision.updatedAt = updatedAt;
  }
}

function projectPayrollPayoutBatchExportSecretRecord({
  companyId,
  payrollPayoutBatchId,
  payRunId,
  exportFileName,
  exportPayload,
  secretStore
}) {
  const secretMeta = secretStore.storeSecretMaterial({
    secretId: `payroll-payout-export:${payrollPayoutBatchId}`,
    classCode: "S3",
    material: {
      exportPayload
    },
    owner: {
      domainKey: "payroll",
      companyId,
      payrollPayoutBatchId,
      payRunId,
      objectType: "payroll_payout_export"
    },
    maskedValue: normalizeOptionalText(exportFileName) || `payroll-payout-export:${payrollPayoutBatchId}`,
    fingerprintPurpose: "payroll_payout_export"
  });
  return {
    secretRef: secretMeta.secretRef,
    keyVersion: secretMeta.keyVersion,
    fingerprint: secretMeta.fingerprint,
    maskedValue: secretMeta.maskedValue
  };
}

function maskSensitiveValue(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("trial://")) {
    return normalized;
  }
  const suffix = normalized.slice(-4);
  return `${"*".repeat(Math.max(normalized.length - 4, 4))}${suffix}`;
}

function maskPayrollPayoutLineForState(line) {
  if (!line) {
    return line;
  }
  return {
    ...copy(line),
    accountTarget:
      normalizeOptionalText(line.accountTarget)?.startsWith("trial://")
        ? line.accountTarget
        : maskSensitiveValue(line.accountTarget)
  };
}

function maskLegacyPayrollPayoutBatchLines(state) {
  for (const batch of state.payrollPayoutBatches.values()) {
    batch.lines = Array.isArray(batch.lines) ? batch.lines.map(maskPayrollPayoutLineForState) : [];
  }
}

function sanitizeStoredPayslipRenderPayload(renderPayload) {
  if (!renderPayload || typeof renderPayload !== "object") {
    return renderPayload;
  }
  const sanitized = copy(renderPayload);
  if (sanitized.bankPaymentPreview && typeof sanitized.bankPaymentPreview === "object") {
    sanitized.bankPaymentPreview = {
      ...copy(sanitized.bankPaymentPreview),
      accountTarget:
        normalizeOptionalText(sanitized.bankPaymentPreview.accountTarget)?.startsWith("trial://")
          ? sanitized.bankPaymentPreview.accountTarget
          : maskSensitiveValue(sanitized.bankPaymentPreview.accountTarget)
    };
  }
  return sanitized;
}

function maskLegacyStoredPayslipRenderPayloads(state) {
  for (const payslip of state.payslips.values()) {
    payslip.renderPayload = sanitizeStoredPayslipRenderPayload(payslip.renderPayload);
    payslip.snapshotHash = buildSnapshotHash(payslip.renderPayload);
  }
}

function migrateLegacyPayrollPayoutExportSecrets(state, { secretStore }) {
  for (const [payrollPayoutBatchId, batch] of state.payrollPayoutBatches.entries()) {
    const existingSecret = state.payrollPayoutBatchExportSecrets.get(payrollPayoutBatchId) || null;
    if (typeof batch.exportPayload !== "string") {
      continue;
    }
    if (!existingSecret?.secretRef) {
      state.payrollPayoutBatchExportSecrets.set(
        payrollPayoutBatchId,
        projectPayrollPayoutBatchExportSecretRecord({
          companyId: batch.companyId,
          payrollPayoutBatchId,
          payRunId: batch.payRunId,
          exportFileName: batch.exportFileName,
          exportPayload: batch.exportPayload,
          secretStore
        })
      );
    }
    batch.exportPayload = null;
  }
}

function buildVacationLiabilitySnapshotModel({ state, companyId, reportingPeriod, hrPlatform = null, rules = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "reporting_period_required");
  const approvedRuns = (state.payRunIdsByCompany.get(resolvedCompanyId) || [])
    .map((payRunId) => state.payRuns.get(payRunId))
    .filter(Boolean)
    .filter((payRun) => payRun.status === "approved" && payRun.reportingPeriod <= resolvedReportingPeriod)
    .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt));

  const legacyMetrics = collectVacationLiabilityLegacyMetrics({ state, approvedRuns });
  const employmentContexts = collectVacationLiabilityEmploymentContexts({
    state,
    companyId: resolvedCompanyId,
    approvedRuns
  });

  const keys = [...new Set([...legacyMetrics.keys(), ...employmentContexts.keys()])];
  const employeeSnapshots = keys
    .map((key) => {
      const legacy = legacyMetrics.get(key) || {
        employmentId: key.split(":")[0] || null,
        employeeId: key.split(":")[1] || null,
        vacationBasisAmount: 0,
        vacationSettlementAmount: 0
      };
      const context = employmentContexts.get(key) || null;
      const liabilityPreview = buildVacationLiabilityAmountPreview({
        state,
        companyId: resolvedCompanyId,
        context,
        reportingPeriod: resolvedReportingPeriod
      });
      const liabilityAmount = roundMoney(liabilityPreview.liabilityAmount || 0);
      const employerContributionPreview = buildVacationLiabilityEmployerContributionPreview({
        state,
        approvedRuns,
        companyId: resolvedCompanyId,
        reportingPeriod: resolvedReportingPeriod,
        employmentId: legacy.employmentId,
        employeeId: legacy.employeeId,
        liabilityAmount,
        hrPlatform,
        rules
      });
      return {
        ...legacy,
        ...liabilityPreview,
        liabilityAmount,
        employerContributionClassCode: employerContributionPreview.contributionClassCode,
        employerContributionRatePercent: employerContributionPreview.ratePercent,
        employerContributionLiabilityAmount: employerContributionPreview.amount,
        totalLiabilityAmount: roundMoney(liabilityAmount + employerContributionPreview.amount)
      };
    })
    .sort(
      (left, right) =>
        String(left.employeeId || "").localeCompare(String(right.employeeId || "")) ||
        String(left.employmentId || "").localeCompare(String(right.employmentId || ""))
    );

  const totals = {
    vacationBasisAmount: roundMoney(employeeSnapshots.reduce((sum, entry) => sum + Number(entry.vacationBasisAmount || 0), 0)),
    vacationSettlementAmount: roundMoney(employeeSnapshots.reduce((sum, entry) => sum + Number(entry.vacationSettlementAmount || 0), 0)),
    liabilityAmount: roundMoney(employeeSnapshots.reduce((sum, entry) => sum + Number(entry.liabilityAmount || 0), 0)),
    employerContributionLiabilityAmount: roundMoney(
      employeeSnapshots.reduce((sum, entry) => sum + Number(entry.employerContributionLiabilityAmount || 0), 0)
    ),
    totalLiabilityAmount: roundMoney(employeeSnapshots.reduce((sum, entry) => sum + Number(entry.totalLiabilityAmount || 0), 0))
  };

  return {
    companyId: resolvedCompanyId,
    reportingPeriod: resolvedReportingPeriod,
    payRunIds: approvedRuns.map((payRun) => payRun.payRunId),
    employeeSnapshots,
    totals,
    snapshotHash: buildSnapshotHash({
      companyId: resolvedCompanyId,
      reportingPeriod: resolvedReportingPeriod,
      employeeSnapshots,
      totals
    })
  };
}

function collectVacationLiabilityLegacyMetrics({ state, approvedRuns }) {
  const employeeMap = new Map();
  for (const payRun of approvedRuns) {
    for (const lineId of state.payRunLineIdsByRun.get(payRun.payRunId) || []) {
      const line = state.payRunLines.get(lineId);
      if (!line) {
        continue;
      }
      const key = `${line.employmentId}:${line.employeeId}`;
      const current = employeeMap.get(key) || {
        employmentId: line.employmentId,
        employeeId: line.employeeId,
        vacationBasisAmount: 0,
        vacationSettlementAmount: 0
      };
      if (line.affectsVacationBasis) {
        current.vacationBasisAmount = roundMoney(current.vacationBasisAmount + Math.max(0, directionalAmount(line)));
      }
      if (VACATION_LIABILITY_SETTLEMENT_CODES.has(line.payItemCode)) {
        current.vacationSettlementAmount = roundMoney(current.vacationSettlementAmount + Math.abs(directionalAmount(line)));
      }
      employeeMap.set(key, current);
    }
  }
  return employeeMap;
}

function collectVacationLiabilityEmploymentContexts({ state, companyId, approvedRuns }) {
  const contexts = new Map();
  for (const payRun of approvedRuns) {
    const snapshot = payRun.payrollInputSnapshotId ? state.payrollInputSnapshots.get(payRun.payrollInputSnapshotId) || null : null;
    if (!snapshot?.sourceSnapshot || typeof snapshot.sourceSnapshot !== "object") {
      continue;
    }
    for (const entry of Object.values(snapshot.sourceSnapshot)) {
      if (!entry?.employment?.employmentId) {
        continue;
      }
      const employmentId = entry.employment.employmentId;
      const employeeId = entry.employee?.employeeId || entry.employment.employeeId || null;
      const key = `${employmentId}:${employeeId}`;
      contexts.set(key, {
        companyId,
        employee: copy(entry.employee || null),
        employment: copy(entry.employment || null),
        contract: copy(entry.contract || null),
        hrSnapshot: copy(entry.hrSnapshot || null),
        scheduleAssignment: copy(entry.scheduleAssignment || null),
        vacationBalance: copy(entry.vacationBalance || null),
        agreementOverlay: copy(entry.agreementOverlay || null),
        payRunId: payRun.payRunId,
        payDate: payRun.payDate,
        reportingPeriod: payRun.reportingPeriod
      });
    }
  }
  return contexts;
}

function buildVacationLiabilityAmountPreview({ state, companyId, context = null, reportingPeriod } = {}) {
  const employmentId = context?.employment?.employmentId || null;
  const employeeId = context?.employee?.employeeId || context?.employment?.employeeId || null;
  const vacationBalance = context?.vacationBalance || null;
  const paidDaysRemaining = roundQuantity(vacationBalance?.paidDays || 0);
  const savedDaysRemaining = roundQuantity(vacationBalance?.savedDays || 0);
  const remainingDays = roundQuantity(paidDaysRemaining + savedDaysRemaining);
  const reportingPeriodEndDate = endOfMonth(Number(reportingPeriod.slice(0, 4)), Number(reportingPeriod.slice(4, 6)));

  const previewBase = {
    employmentId,
    employeeId,
    vacationBalanceSnapshotDate: vacationBalance?.snapshotDate || reportingPeriodEndDate,
    vacationYearStartDate: vacationBalance?.vacationYearStartDate || null,
    vacationYearEndDate: vacationBalance?.vacationYearEndDate || null,
    paidDaysRemaining,
    savedDaysRemaining,
    remainingDays,
    liabilityCalculationCode: remainingDays > 0 ? "vacation_days_remaining" : "no_remaining_vacation_days"
  };

  if (!context?.contract || !vacationBalance || remainingDays <= 0) {
    return {
      ...previewBase,
      vacationRuleCode: null,
      liabilityAmount: 0
    };
  }

  const ruleSelection = buildAutomaticSwedishVacationRuleSelection({
    state,
    companyId,
    employment: context.employment,
    contract: context.contract,
    vacationBalance
  });
  if (!ruleSelection.ruleCode) {
    return {
      ...previewBase,
      vacationRuleCode: null,
      liabilityAmount: 0
    };
  }

  if (ruleSelection.ruleCode === "procentregeln") {
    const vacationEntitlementDays = resolveAutomaticSwedishVacationEntitlementDays();
    const vacationPayPercent = resolveAutomaticSwedishVacationPayPercent(vacationEntitlementDays);
    const vacationPayBasisAmount = roundMoney(ruleSelection.totalVacationPayBasisAmount || 0);
    const vacationPayTotalAmount = roundMoney((vacationPayBasisAmount * vacationPayPercent) / 100);
    const vacationPayPerDayAmount =
      vacationEntitlementDays > 0 ? roundMoney(vacationPayTotalAmount / vacationEntitlementDays) : 0;
    const liabilityAmount = roundMoney(vacationPayPerDayAmount * remainingDays);
    return {
      ...previewBase,
      vacationRuleCode: "procentregeln",
      vacationRuleReasonCode: ruleSelection.reasonCode,
      earningYearStartDate: ruleSelection.earningYearStartDate,
      earningYearEndDate: ruleSelection.earningYearEndDate,
      vacationEntitlementDays,
      vacationPayBasisAmount,
      variableVacationBasisAmount: roundMoney(ruleSelection.variableVacationPayBasisAmount || 0),
      variableSharePercent: roundMoney(ruleSelection.variableSharePercent || 0),
      vacationPayPercent,
      vacationPayPerDayAmount,
      liabilityAmount
    };
  }

  const dailySalaryAmount = resolveAutomaticSwedishVacationMonthlySalaryLiabilityDayAmount({
    contract: context.contract,
    hrSnapshot: context.hrSnapshot,
    scheduleAssignment: context.scheduleAssignment
  });
  const supplementUnitRate = resolveAutomaticSwedishVacationSupplementUnitRate({
    companyId,
    employment: context.employment,
    contract: context.contract,
    hrSnapshot: context.hrSnapshot,
    agreementOverlay: context.agreementOverlay,
    state
  });
  const salaryLiabilityAmount = roundMoney(dailySalaryAmount * remainingDays);
  const supplementLiabilityAmount = roundMoney(supplementUnitRate * remainingDays);
  return {
    ...previewBase,
    vacationRuleCode: "sammaloneregeln",
    vacationRuleReasonCode: ruleSelection.reasonCode,
    earningYearStartDate: ruleSelection.earningYearStartDate,
    earningYearEndDate: ruleSelection.earningYearEndDate,
    totalVacationBasisAmount: roundMoney(ruleSelection.totalVacationPayBasisAmount || 0),
    variableVacationBasisAmount: roundMoney(ruleSelection.variableVacationPayBasisAmount || 0),
    variableSharePercent: roundMoney(ruleSelection.variableSharePercent || 0),
    vacationSalaryPerDayAmount: dailySalaryAmount,
    vacationSupplementPerDayAmount: supplementUnitRate,
    salaryLiabilityAmount,
    supplementLiabilityAmount,
    liabilityAmount: roundMoney(salaryLiabilityAmount + supplementLiabilityAmount)
  };
}

function findLatestVacationLiabilitySnapshotBeforePeriod(state, companyId, reportingPeriod) {
  return (state.vacationLiabilitySnapshotIdsByCompany.get(companyId) || [])
    .map((snapshotId) => state.vacationLiabilitySnapshots.get(snapshotId))
    .filter(Boolean)
    .filter((snapshot) => snapshot.reportingPeriod < reportingPeriod)
    .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
    .pop() || null;
}

function mergePayrollJournalLines(lines) {
  const grouped = new Map();
  for (const line of lines) {
    const key = stableStringify({
      accountNumber: line.accountNumber,
      dimensionJson: line.dimensionJson || {}
    });
    const existing = grouped.get(key);
    if (existing) {
      existing.debitAmount = roundMoney(existing.debitAmount + Number(line.debitAmount || 0));
      existing.creditAmount = roundMoney(existing.creditAmount + Number(line.creditAmount || 0));
      continue;
    }
    grouped.set(key, {
      accountNumber: requireText(String(line.accountNumber), "ledger_account_code_required"),
      debitAmount: roundMoney(Number(line.debitAmount || 0)),
      creditAmount: roundMoney(Number(line.creditAmount || 0)),
      dimensionJson: normalizePayrollDimensions(line.dimensionJson || {})
    });
  }
  return [...grouped.values()].filter((line) => line.debitAmount > 0 || line.creditAmount > 0);
}

function normalizePayrollDimensions(dimensions = {}) {
  const normalized = {};
  const projectId = normalizeOptionalText(dimensions.projectId);
  const costCenterCode = normalizeOptionalText(dimensions.costCenterCode);
  const businessAreaCode = normalizeOptionalText(dimensions.businessAreaCode);
  if (projectId) {
    normalized.projectId = projectId;
  }
  if (costCenterCode) {
    normalized.costCenterCode = costCenterCode;
  }
  if (businessAreaCode) {
    normalized.businessAreaCode = businessAreaCode;
  }
  return normalized;
}

const VACATION_LIABILITY_SETTLEMENT_CODES = new Set(["VACATION_PAY", "VACATION_SUPPLEMENT", "VACATION_DEDUCTION"]);

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

function syncAgiVersionEvidenceBundle({ state, submission, version, actorId = "system", evidencePlatform = null } = {}) {
  if (!version || !submission) {
    return null;
  }
  const payload = version.payloadJson || {};
  const employerTotals = payload.employerTotals || {};
  const receipts = (state.agiReceiptIdsByVersion.get(version.agiSubmissionVersionId) || [])
    .map((agiReceiptId) => state.agiReceipts.get(agiReceiptId))
    .filter(Boolean);
  const errors = (state.agiErrorIdsByVersion.get(version.agiSubmissionVersionId) || [])
    .map((agiErrorId) => state.agiErrors.get(agiErrorId))
    .filter(Boolean);
  const signatures = (state.agiSignatureIdsByVersion.get(version.agiSubmissionVersionId) || [])
    .map((agiSignatureId) => state.agiSignatures.get(agiSignatureId))
    .filter(Boolean);
  const evidenceBundleId = registerPayrollEvidenceBundle({
    evidencePlatform,
    executionBoundary: version.executionBoundary,
    companyId: version.companyId,
    bundleType: "payroll_agi_version",
    sourceObjectType: "payroll_agi_submission_version",
    sourceObjectId: version.agiSubmissionVersionId,
    sourceObjectVersion: buildAgiVersionEvidenceSourceVersion({
      version,
      receipts,
      errors,
      signatures
    }),
    title: `Payroll AGI ${version.reportingPeriod} v${version.versionNo}`,
    actorId,
    requireTrialGuard: false,
    previousEvidenceBundleId: version.evidenceBundleId || null,
    metadata: {
      agiSubmissionId: submission.agiSubmissionId,
      reportingPeriod: version.reportingPeriod,
      versionNo: version.versionNo,
      state: version.state,
      correctionReason: version.correctionReason || null,
      previousSubmittedVersionId: version.previousSubmittedVersionId || null,
      authoritySubmissionId: version.authoritySubmissionId || null,
      changedEmployeeIds: copy(version.changedEmployeeIds || []),
      sourcePayRunIds: copy(version.sourcePayRunIds || []),
      field487SummaArbetsgivaravgifterOchSlf: employerTotals.field487SummaArbetsgivaravgifterOchSlf ?? null,
      field497SummaSkatteavdrag: employerTotals.field497SummaSkatteavdrag ?? null,
      receiptCount: receipts.length,
      errorCount: errors.length,
      signatureCount: signatures.length,
      submissionMode: version.submissionMode || null
    },
    artifactRefs: [
      {
        artifactType: "agi_payload",
        artifactRef: `payload:${version.agiSubmissionVersionId}`,
        checksum: version.payloadHash,
        roleCode: "submission_payload",
        metadata: {
          payloadVersion: version.adapterPayloadJson?.payloadVersion || "agi-json-v1"
        }
      },
      {
        artifactType: "agi_employer_totals",
        artifactRef: `employer-totals:${version.agiSubmissionVersionId}`,
        checksum: buildSnapshotHash(employerTotals),
        roleCode: "employer_totals",
        metadata: {
          field487SummaArbetsgivaravgifterOchSlf: employerTotals.field487SummaArbetsgivaravgifterOchSlf ?? 0,
          field497SummaSkatteavdrag: employerTotals.field497SummaSkatteavdrag ?? 0
        }
      },
      ...(version.authoritySubmissionId
        ? [
            {
              artifactType: "regulated_submission_ref",
              artifactRef: `submission:${version.authoritySubmissionId}`,
              checksum: version.authoritySubmissionId,
              roleCode: "regulated_submission_bridge",
              metadata: {
                submissionType: "agi_monthly"
              }
            }
          ]
        : []),
      ...receipts.map((receipt) => ({
        artifactType: "agi_receipt",
        artifactRef: `receipt:${receipt.agiReceiptId}`,
        checksum: buildSnapshotHash(receipt.payloadJson || {}),
        roleCode: "submission_receipt",
        metadata: {
          receiptStatus: receipt.receiptStatus,
          receiptCode: receipt.receiptCode
        }
      }))
    ],
    sourceRefs: (version.sourcePayRunIds || []).map((payRunId) => ({
      sourceType: "pay_run",
      sourceId: payRunId
    })),
    relatedObjectRefs: [
      {
        objectType: "agi_submission",
        objectId: submission.agiSubmissionId
      },
      ...(version.previousSubmittedVersionId
        ? [{
            objectType: "agi_submission_version",
            objectId: version.previousSubmittedVersionId
          }]
        : []),
      ...receipts.map((receipt) => ({
        objectType: "agi_receipt",
        objectId: receipt.agiReceiptId
      })),
      ...signatures.map((signature) => ({
        objectType: "agi_signature",
        objectId: signature.agiSignatureId
      })),
      ...errors.map((error) => ({
        objectType: "agi_error",
        objectId: error.agiErrorId
      }))
    ]
  });
  if (evidenceBundleId) {
    version.evidenceBundleId = evidenceBundleId;
  }
  return evidenceBundleId;
}

function buildAgiVersionEvidenceSourceVersion({ version, receipts = [], errors = [], signatures = [] } = {}) {
  return buildSnapshotHash({
    agiSubmissionVersionId: version?.agiSubmissionVersionId || null,
    payloadHash: version?.payloadHash || null,
    state: version?.state || null,
    validationErrors: copy(version?.validationErrors || []),
    validationWarnings: copy(version?.validationWarnings || []),
    readyForSignAt: version?.readyForSignAt || null,
    submittedAt: version?.submittedAt || null,
    supersededAt: version?.supersededAt || null,
    submissionMode: version?.submissionMode || null,
    receiptIds: receipts.map((receipt) => receipt.agiReceiptId).sort(),
    errorIds: errors.map((error) => error.agiErrorId).sort(),
    signatureIds: signatures.map((signature) => signature.agiSignatureId).sort()
  });
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
  timePlatform,
  environmentMode = "test",
  supportsLegalEffect = false,
  modeWatermarkCode = null,
  tenantControlPlatform = null
}) {
  const approvedRuns = collectApprovedPayRunsForPeriod(state, companyId, reportingPeriod);
  const executionBoundary = derivePayrollExecutionBoundaryForApprovedRuns({
    approvedRuns,
    companyId,
    environmentMode,
    supportsLegalEffect,
    modeWatermarkCode,
    tenantControlPlatform
  });
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
  const specificationNumbers = assignAgiEmployeeSpecificationNumbers({
    previousEmployees: previousVersion?.payloadJson?.employees || [],
    employeeGroups
  });

  for (const group of employeeGroups) {
    const materializedEmployee = materializeAgiEmployeeGroup({
      companyId,
      reportingPeriod,
      group,
      createdAt: materializedAt,
      specificationNumber: specificationNumbers.get(group.employee.employeeId) || 1
    });
    employees.push(materializedEmployee.employee);
    employeeLines.push(...materializedEmployee.lines);
    absencePayloads.push(...materializedEmployee.absencePayloads);
    validationWarnings.push(...materializedEmployee.warnings);
    for (const employmentId of materializedEmployee.lockEmploymentIds) {
      lockEmploymentIds.add(employmentId);
    }
  }
  const employeeTotals = summarizeAgiEmployeeTotals(employees);
  const employerTotals = summarizeAgiEmployerTotals({
    state,
    approvedRuns,
    employeeTotals
  });

  const payload = {
    employer: {
      companyId,
      legalName: companyContext.legalName,
      orgNumber: companyContext.orgNumber,
      employerRegistrationValue: companyContext.employerRegistrationValue
    },
    reportingPeriod,
    sourcePayRunIds: approvedRuns.map((run) => run.payRunId),
    payrollInputSnapshotRefs: approvedRuns.map((run) => ({
      payRunId: run.payRunId,
      payrollInputSnapshotId: run.payrollInputSnapshotId,
      payrollInputFingerprint: run.payrollInputFingerprint,
      payRunFingerprint: run.payRunFingerprint
    })),
    rulepackRefs: dedupePayrollRulepackRefs(approvedRuns.flatMap((run) => run.rulepackRefs || [])),
    providerBaselineRefs: dedupeProviderBaselineRefs(approvedRuns.flatMap((run) => run.providerBaselineRefs || [])),
    decisionSnapshotRefs: dedupeDecisionSnapshotRefs(approvedRuns.flatMap((run) => run.decisionSnapshotRefs || [])),
    executionBoundary: copy(executionBoundary),
    totals: employeeTotals,
    employerTotals,
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
    rulepackRefs: copy(payload.rulepackRefs || []),
    providerBaselineRefs: copy(payload.providerBaselineRefs || []),
    decisionSnapshotRefs: copy(payload.decisionSnapshotRefs || []),
    payloadHash: buildSnapshotHash(payload),
    payloadJson: payload,
    adapterPayloadJson: {
      mode: executionBoundary.submissionModeCode,
      payloadVersion: "agi-json-v1",
      legalEffect: executionBoundary.supportsLegalEffect === true,
      watermarkCode: executionBoundary.watermarkCode || null,
      providerPolicyCode: executionBoundary.providerPolicyCode || null,
      declarationEnvelope: {
        employer: copy(payload.employer),
        reportingPeriod,
        mainRecord: {
          field487SummaArbetsgivaravgifterOchSlf: employerTotals.field487SummaArbetsgivaravgifterOchSlf,
          field497SummaSkatteavdrag: employerTotals.field497SummaSkatteavdrag
        },
        individuals: payload.employees.map((employee) => ({
          employeeId: employee.employeeId,
          specificationNumber: employee.specificationNumber,
          personIdentifierType: employee.personIdentifierType,
          personIdentifier: employee.personIdentifier,
          compensationFields: copy(employee.compensationFields || {}),
          taxFields: copy(employee.taxFields || {}),
          absence: copy(employee.absence || {})
        }))
      },
      payload
    },
    executionBoundary: copy(executionBoundary),
    trialGuard: buildPayrollTrialGuard(executionBoundary),
    evidenceBundleId: null,
    authoritySubmissionId: null,
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
    .sort(
      (left, right) =>
        left.payDate.localeCompare(right.payDate) ||
        left.runType.localeCompare(right.runType) ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.payRunId.localeCompare(right.payRunId)
    );
}

function buildAgiSourceSnapshotHash(payRuns) {
  return buildSnapshotHash(
    (payRuns || []).map((payRun) => ({
      payRunId: payRun.payRunId,
      reportingPeriod: payRun.reportingPeriod,
      payDate: payRun.payDate,
      runType: payRun.runType,
      status: payRun.status,
      payrollInputSnapshotId: payRun.payrollInputSnapshotId,
      payrollInputFingerprint: payRun.payrollInputFingerprint,
      payRunFingerprint: payRun.payRunFingerprint,
      sourceSnapshotHash: payRun.sourceSnapshotHash,
      rulepackRefs: payRun.rulepackRefs || [],
      decisionSnapshotRefs: payRun.decisionSnapshotRefs || []
    }))
  );
}

function collectPayRunRulepackRefs(employmentResults = []) {
  return dedupePayrollRulepackRefs(
    employmentResults.flatMap((result) => {
      const totals = result?.payslipRenderPayload?.totals || {};
      return [totals.taxDecision, totals.employerContributionDecision]
        .map((decisionObject) => buildPayrollRulepackRef(decisionObject))
        .filter(Boolean);
    })
  );
}

function collectPayRunProviderBaselineRefs({ providerBaselineRegistry, payRun } = {}) {
  const agiTransportBaselineRef = resolvePayrollProviderBaselineRef({
    providerBaselineRegistry,
    providerCode: PAYROLL_AGI_PROVIDER_CODE,
    baselineCode: PAYROLL_AGI_PROVIDER_BASELINE_CODE,
    effectiveDate: payRun?.payDate,
    contextCode: "payroll_provider_baseline_missing",
    metadata: {
      sourceDomain: "payroll",
      sourceObjectType: "pay_run",
      sourceObjectId: payRun?.payRunId || null,
      reportingPeriod: payRun?.reportingPeriod || null,
      profileCode: "agi_transport"
    }
  });
  return dedupeProviderBaselineRefs([agiTransportBaselineRef]);
}

function collectPayRunDecisionSnapshotRefs(run, employmentResults = []) {
  return dedupeDecisionSnapshotRefs(
    employmentResults.flatMap((result) => {
      const totals = result?.payslipRenderPayload?.totals || {};
      const employmentId = result?.employment?.employmentId || null;
      const employeeId = result?.employee?.employeeId || null;
      return [
        buildPayrollDecisionSnapshotRef({
          payRunId: run.payRunId,
          employmentId,
          employeeId,
          snapshotTypeCode: "payroll_tax_decision",
          decisionObject: totals.taxDecision
        }),
        buildPayrollDecisionSnapshotRef({
          payRunId: run.payRunId,
          employmentId,
          employeeId,
          snapshotTypeCode: "payroll_employer_contribution_decision",
          decisionObject: totals.employerContributionDecision
        }),
        buildPayrollDecisionSnapshotRef({
          payRunId: run.payRunId,
          employmentId,
          employeeId,
          snapshotTypeCode: "payroll_garnishment_decision",
          decisionObject: totals.garnishmentDecision
        })
      ].filter(Boolean);
    })
  );
}

function buildPayrollRulepackRef(decisionObject) {
  if (!decisionObject) {
    return null;
  }
  return requirePinnedPayrollDecisionRulepackRef(decisionObject, "payroll_rulepack_ref");
}

function assignAgiEmployeeSpecificationNumbers({ previousEmployees = [], employeeGroups = [] } = {}) {
  const previousByEmployeeId = new Map();
  let maxSpecificationNumber = 0;
  for (const employee of Array.isArray(previousEmployees) ? previousEmployees : []) {
    const employeeId = normalizeOptionalText(employee?.employeeId);
    const specificationNumber = normalizeAgiSpecificationNumber(employee?.specificationNumber);
    if (!employeeId || specificationNumber == null) {
      continue;
    }
    previousByEmployeeId.set(employeeId, specificationNumber);
    if (specificationNumber > maxSpecificationNumber) {
      maxSpecificationNumber = specificationNumber;
    }
  }
  const resolved = new Map();
  for (const group of employeeGroups || []) {
    const employeeId = requireText(group?.employee?.employeeId, "agi_employee_id_required");
    if (resolved.has(employeeId)) {
      continue;
    }
    const priorSpecificationNumber = previousByEmployeeId.get(employeeId);
    if (priorSpecificationNumber != null) {
      resolved.set(employeeId, priorSpecificationNumber);
      continue;
    }
    maxSpecificationNumber += 1;
    resolved.set(employeeId, maxSpecificationNumber);
  }
  return resolved;
}

function summarizeAgiEmployerTotals({ state, approvedRuns, employeeTotals } = {}) {
  const contributionBucketsByRate = new Map();
  const sourcePayRunIds = [];
  const sourcePayslipIds = [];
  let vaxaRefundExposureAmount = 0;

  for (const payRun of approvedRuns || []) {
    sourcePayRunIds.push(payRun.payRunId);
    const payslips = (state.payslipIdsByRun.get(payRun.payRunId) || [])
      .map((payslipId) => state.payslips.get(payslipId))
      .filter(Boolean);
    for (const payslip of payslips) {
      sourcePayslipIds.push(payslip.payslipId);
      const payslipTotals = payslip?.renderPayload?.totals || payslip?.totals || {};
      const decisionOutputs = payslipTotals?.employerContributionDecision?.outputs || {};
      const decisionType = normalizeOptionalText(decisionOutputs.decisionType) || null;
      const fullRatePercent = roundMoney(decisionOutputs.fullRatePercent || 0);
      const components = Array.isArray(decisionOutputs.contributionComponents) ? decisionOutputs.contributionComponents : [];
      const normalizedComponents =
        components.length > 0
          ? components
          : [{
              componentCode: decisionType === "vaxa" ? "vaxa_reduced_band" : "standard_contribution",
              baseAmount: roundMoney(decisionOutputs.contributionBase || payslipTotals?.employerContributionBase || 0),
              ratePercent: roundMoney(
                decisionType === "vaxa"
                  ? fullRatePercent
                  : decisionOutputs.ratePercent || 0
              )
            }];
      for (const component of normalizedComponents) {
        const baseAmount = roundMoney(Math.max(0, component?.baseAmount || 0));
        if (baseAmount <= 0) {
          continue;
        }
        const usesVaxaGrossUp = decisionType === "vaxa" && component.componentCode === "vaxa_reduced_band" && fullRatePercent > 0;
        const reportedRatePercent = roundMoney(
          usesVaxaGrossUp
            ? fullRatePercent
            : Math.max(0, Number(component?.ratePercent || 0))
        );
        const bucketKey = reportedRatePercent.toFixed(2);
        const current = contributionBucketsByRate.get(bucketKey) || {
          ratePercent: reportedRatePercent,
          baseAmount: 0,
          sourceDecisionTypes: new Set(),
          sourceComponentCodes: new Set(),
          sourcePayRunIds: new Set(),
          sourcePayslipIds: new Set(),
          usesVaxaGrossUp: false
        };
        current.baseAmount = roundMoney(current.baseAmount + baseAmount);
        current.sourceDecisionTypes.add(decisionType || "unknown");
        current.sourceComponentCodes.add(normalizeOptionalText(component?.componentCode) || "unknown");
        current.sourcePayRunIds.add(payRun.payRunId);
        current.sourcePayslipIds.add(payslip.payslipId);
        current.usesVaxaGrossUp = current.usesVaxaGrossUp || usesVaxaGrossUp;
        contributionBucketsByRate.set(bucketKey, current);
      }
      vaxaRefundExposureAmount = roundMoney(vaxaRefundExposureAmount + Number(decisionOutputs.taxAccountReliefAmount || 0));
    }
  }

  const contributionBuckets = [...contributionBucketsByRate.values()]
    .map((bucket) => {
      const declaredContributionAmount = roundMoney(bucket.baseAmount * (Number(bucket.ratePercent || 0) / 100));
      return {
        ratePercent: roundMoney(bucket.ratePercent || 0),
        baseAmount: roundMoney(bucket.baseAmount || 0),
        declaredContributionAmount,
        roundedContributionAmount: truncateKronaAmount(declaredContributionAmount),
        sourceDecisionTypes: [...bucket.sourceDecisionTypes].sort(),
        sourceComponentCodes: [...bucket.sourceComponentCodes].sort(),
        sourcePayRunIds: [...bucket.sourcePayRunIds].sort(),
        sourcePayslipIds: [...bucket.sourcePayslipIds].sort(),
        usesVaxaGrossUp: bucket.usesVaxaGrossUp
      };
    })
    .sort((left, right) => right.ratePercent - left.ratePercent || left.baseAmount - right.baseAmount);

  const taxDeductionAmount = truncateKronaAmount(
    Number(employeeTotals?.preliminaryTaxAmount || 0)
      + Number(employeeTotals?.sinkTaxAmount || 0)
      + Number(employeeTotals?.aSinkTaxAmount || 0)
  );
  const employerContributionAmount = contributionBuckets.reduce(
    (sum, bucket) => sum + Number(bucket.roundedContributionAmount || 0),
    0
  );

  return {
    field487SummaArbetsgivaravgifterOchSlf: employerContributionAmount,
    field497SummaSkatteavdrag: taxDeductionAmount,
    employerContributionAmount,
    slfAmount: 0,
    taxDeductionAmount,
    contributionBuckets,
    vaxaRefundExposureAmount: roundMoney(vaxaRefundExposureAmount),
    sourcePayRunIds: [...new Set(sourcePayRunIds)].sort(),
    sourcePayslipIds: [...new Set(sourcePayslipIds)].sort()
  };
}

function compareAgiEmployerTotals(actualTotals, expectedTotals) {
  return buildSnapshotHash(projectAgiEmployerTotalsForComparison(actualTotals)) === buildSnapshotHash(projectAgiEmployerTotalsForComparison(expectedTotals));
}

function projectAgiEmployerTotalsForComparison(totals = {}) {
  return {
    field487SummaArbetsgivaravgifterOchSlf: truncateKronaAmount(totals.field487SummaArbetsgivaravgifterOchSlf || 0),
    field497SummaSkatteavdrag: truncateKronaAmount(totals.field497SummaSkatteavdrag || 0),
    employerContributionAmount: truncateKronaAmount(totals.employerContributionAmount || 0),
    slfAmount: truncateKronaAmount(totals.slfAmount || 0),
    taxDeductionAmount: truncateKronaAmount(totals.taxDeductionAmount || 0),
    vaxaRefundExposureAmount: roundMoney(totals.vaxaRefundExposureAmount || 0),
    contributionBuckets: (totals.contributionBuckets || [])
      .map((bucket) => ({
        ratePercent: roundMoney(bucket.ratePercent || 0),
        baseAmount: roundMoney(bucket.baseAmount || 0),
        declaredContributionAmount: roundMoney(bucket.declaredContributionAmount || 0),
        roundedContributionAmount: truncateKronaAmount(bucket.roundedContributionAmount || 0),
        usesVaxaGrossUp: bucket.usesVaxaGrossUp === true
      }))
      .sort((left, right) => right.ratePercent - left.ratePercent || left.baseAmount - right.baseAmount)
  };
}

function buildPayrollRulepackRefFromRulePack(rulePack, effectiveDate = null) {
  if (!rulePack) {
    return null;
  }
  return {
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.checksum,
    effectiveDate: effectiveDate || rulePack.effectiveFrom || null
  };
}

function buildVacationLiabilityEmployerContributionPreview({
  state,
  approvedRuns,
  companyId,
  reportingPeriod,
  employmentId,
  employeeId,
  liabilityAmount,
  hrPlatform = null,
  rules = null
}) {
  const resolvedLiabilityAmount = roundMoney(Math.max(0, liabilityAmount || 0));
  if (resolvedLiabilityAmount <= 0) {
    return {
      amount: 0,
      ratePercent: 0,
      contributionClassCode: null
    };
  }

  const employee = resolveVacationLiabilityEmployeeRecord({
    state,
    approvedRuns,
    companyId,
    employmentId,
    employeeId,
    hrPlatform
  });
  if (!employee) {
    return {
      amount: 0,
      ratePercent: 0,
      contributionClassCode: null
    };
  }
  if (!rules) {
    return {
      amount: 0,
      ratePercent: 0,
      contributionClassCode: null
    };
  }

  const effectiveDate = endOfMonth(Number(reportingPeriod.slice(0, 4)), Number(reportingPeriod.slice(4, 6)));
  const statutoryProfile = getStoredEmploymentStatutoryProfileForSnapshot({ state, companyId, employmentId });
  const employerContributionDecisionSnapshot = selectEmployerContributionDecisionSnapshot({
    state,
    companyId,
    employmentId,
    effectiveDate
  });
  const preview = buildEmployerContributionPreview({
    rules,
    contributionBase: resolvedLiabilityAmount,
    employee,
    statutoryProfile,
    payDate: effectiveDate,
    employerContributionDecisionSnapshot
  });

  return {
    amount: roundMoney(preview.amount || 0),
    ratePercent: roundMoney(preview.decisionObject?.outputs?.ratePercent || 0),
    contributionClassCode: preview.decisionObject?.outputs?.contributionClassCode || null
  };
}

function resolveVacationLiabilityEmployeeRecord({ state, approvedRuns, companyId, employmentId, employeeId, hrPlatform = null }) {
  if (hrPlatform?.getEmployee && employeeId) {
    try {
      return hrPlatform.getEmployee({ companyId, employeeId });
    } catch {
      // Fall through to immutable payroll input snapshots when HR runtime data is unavailable.
    }
  }

  for (const payRun of [...approvedRuns].reverse()) {
    const snapshot = payRun.payrollInputSnapshotId ? state.payrollInputSnapshots.get(payRun.payrollInputSnapshotId) || null : null;
    const sourceSnapshot = snapshot?.sourceSnapshot?.[employmentId] || null;
    if (sourceSnapshot?.employee) {
      return copy(sourceSnapshot.employee);
    }
  }

  return employeeId
    ? {
        companyId,
        employeeId
      }
    : null;
}

function getStoredEmploymentStatutoryProfileForSnapshot({ state, companyId, employmentId }) {
  const profileId = state.employmentStatutoryProfileIdByEmployment.get(employmentId);
  const profile = profileId ? state.employmentStatutoryProfiles.get(profileId) || null : null;
  return profile && profile.companyId === companyId ? copy(profile) : null;
}

function buildPayrollDecisionSnapshotRef({ payRunId, employmentId, employeeId, snapshotTypeCode, decisionObject }) {
  if (!decisionObject || !decisionObject.inputs_hash) {
    return null;
  }
  const rulepackRef = requirePinnedPayrollDecisionRulepackRef(decisionObject, snapshotTypeCode);
  const decisionHash = buildSnapshotHash(decisionObject);
  return {
    decisionSnapshotId: buildSnapshotHash({
      payRunId,
      employmentId,
      employeeId,
      snapshotTypeCode,
      decisionHash
    }),
    snapshotTypeCode,
    sourceDomain: "payroll",
    sourceObjectId: payRunId,
    sourceObjectVersion: decisionObject.inputs_hash,
    employeeId: employeeId || null,
    employmentId: employmentId || null,
    decisionHash,
    rulepackId: rulepackRef.rulepackId,
    rulepackCode: rulepackRef.rulepackCode,
    rulepackVersion: rulepackRef.rulepackVersion,
    rulepackChecksum: rulepackRef.rulepackChecksum,
    effectiveDate: rulepackRef.effectiveDate
  };
}

function dedupePayrollRulepackRefs(values = []) {
  const refs = [];
  for (const candidate of values) {
    if (!candidate?.rulepackCode || !candidate?.rulepackVersion) {
      continue;
    }
    if (!refs.some((existing) => existing.rulepackCode === candidate.rulepackCode && existing.rulepackVersion === candidate.rulepackVersion)) {
      refs.push(copy(candidate));
    }
  }
  return refs;
}

function dedupeDecisionSnapshotRefs(values = []) {
  const refs = [];
  for (const candidate of values) {
    if (!candidate?.decisionSnapshotId) {
      continue;
    }
    if (!refs.some((existing) => existing.decisionSnapshotId === candidate.decisionSnapshotId)) {
      refs.push(copy(candidate));
    }
  }
  return refs;
}

function dedupeProviderBaselineRefs(values = []) {
  const refs = [];
  for (const candidate of values) {
    if (!candidate?.providerBaselineId && !candidate?.baselineCode && !candidate?.providerBaselineCode) {
      continue;
    }
    const normalized = requirePinnedPayrollProviderBaselineRef(candidate, "payroll_provider_baseline");
    const baselineCode = normalized.baselineCode;
    if (
      !refs.some(
        (existing) =>
          (existing.providerBaselineId || null) === normalized.providerBaselineId
          && (existing.baselineCode || existing.providerBaselineCode) === baselineCode
      )
    ) {
      refs.push(copy(normalized));
    }
  }
  return refs;
}

function requirePinnedPayrollProviderBaselineRef(candidate = {}, codePrefix = "payroll_provider_baseline") {
  const baselineCode = normalizeOptionalText(candidate.baselineCode) || normalizeOptionalText(candidate.providerBaselineCode);
  const providerBaselineId = normalizeOptionalText(candidate.providerBaselineId);
  const providerCode = normalizeOptionalText(candidate.providerCode);
  const providerBaselineVersion = normalizeOptionalText(candidate.providerBaselineVersion);
  const providerBaselineChecksum = normalizeOptionalText(candidate.providerBaselineChecksum);
  if (!providerBaselineId) {
    throw createError(409, `${codePrefix}_id_required`, "Provider baseline id is required.");
  }
  if (!providerCode) {
    throw createError(409, `${codePrefix}_provider_code_required`, "Provider code is required for payroll provider pinning.");
  }
  if (!baselineCode) {
    throw createError(409, `${codePrefix}_code_required`, "Provider baseline code is required for payroll provider pinning.");
  }
  if (!providerBaselineVersion) {
    throw createError(409, `${codePrefix}_version_required`, "Provider baseline version is required for payroll provider pinning.");
  }
  if (!providerBaselineChecksum) {
    throw createError(409, `${codePrefix}_checksum_required`, "Provider baseline checksum is required for payroll provider pinning.");
  }
  return {
    providerBaselineId,
    providerCode,
    baselineCode,
    providerBaselineVersion,
    providerBaselineChecksum,
    domain: normalizeOptionalText(candidate.domain),
    jurisdiction: normalizeOptionalText(candidate.jurisdiction),
    selectionMode: normalizeOptionalText(candidate.selectionMode),
    effectiveDate: normalizeOptionalText(candidate.effectiveDate),
    specVersion: normalizeOptionalText(candidate.specVersion),
    formatFamily: normalizeOptionalText(candidate.formatFamily),
    metadata: copy(candidate.metadata || {}),
    rollbackId: normalizeOptionalText(candidate.rollbackId)
  };
}

function resolvePayrollProviderBaselineRef({
  providerBaselineRegistry,
  providerCode,
  baselineCode,
  effectiveDate,
  contextCode = "payroll_provider_baseline_missing",
  metadata = {}
} = {}) {
  if (
    !providerBaselineRegistry
    || typeof providerBaselineRegistry.resolveProviderBaseline !== "function"
    || typeof providerBaselineRegistry.buildProviderBaselineRef !== "function"
  ) {
    throw createError(409, contextCode, "Payroll requires a provider baseline registry for historical pinning.");
  }
  const resolvedEffectiveDate = normalizeRequiredDate(effectiveDate || new Date().toISOString().slice(0, 10), "payroll_provider_baseline_effective_date_invalid");
  let providerBaseline = null;
  try {
    providerBaseline = providerBaselineRegistry.resolveProviderBaseline({
      domain: "integrations",
      jurisdiction: "SE",
      providerCode: requireText(providerCode, "payroll_provider_code_required"),
      baselineCode: requireText(baselineCode, "payroll_provider_baseline_code_required"),
      effectiveDate: resolvedEffectiveDate
    });
  } catch {
    providerBaseline = null;
  }
  if (!providerBaseline) {
    throw createError(
      409,
      contextCode,
      `Payroll requires a pinned provider baseline ref for ${providerCode}/${baselineCode} on ${resolvedEffectiveDate}.`
    );
  }
  return providerBaselineRegistry.buildProviderBaselineRef({
    effectiveDate: resolvedEffectiveDate,
    providerBaseline,
    metadata
  });
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

  for (const group of groups.values()) {
    group.payslips.sort(
      (left, right) =>
        `${left?.payDate || ""}:${left?.employmentId || ""}:${left?.payslipId || ""}`.localeCompare(
          `${right?.payDate || ""}:${right?.employmentId || ""}:${right?.payslipId || ""}`
        )
    );
    group.lines.sort((left, right) => {
      const leftKey = `${left.payRunId || ""}:${left.employmentId}:${left.displayOrder || 0}:${left.payItemCode}:${left.payRunLineId}`;
      const rightKey = `${right.payRunId || ""}:${right.employmentId}:${right.displayOrder || 0}:${right.payItemCode}:${right.payRunLineId}`;
      return leftKey.localeCompare(rightKey);
    });
    group.leaveSignals.sort((left, right) => {
      const leftKey = `${left.employmentId || ""}:${left.workDate || ""}:${left.signalType || ""}`;
      const rightKey = `${right.employmentId || ""}:${right.workDate || ""}:${right.signalType || ""}`;
      return leftKey.localeCompare(rightKey);
    });
    group.leaveEntries.sort((left, right) => {
      const leftKey = `${left.employmentId || ""}:${left.reportingPeriod || ""}:${left.leaveEntryId || ""}`;
      const rightKey = `${right.employmentId || ""}:${right.reportingPeriod || ""}:${right.leaveEntryId || ""}`;
      return leftKey.localeCompare(rightKey);
    });
  }

  return [...groups.values()].sort((left, right) =>
    `${left?.employee?.employeeId || ""}:${left?.employee?.identityValue || ""}`.localeCompare(
      `${right?.employee?.employeeId || ""}:${right?.employee?.identityValue || ""}`
    )
  );
}

function materializeAgiEmployeeGroup({ companyId, reportingPeriod, group, createdAt, specificationNumber }) {
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
  const aSinkTaxAmount = roundMoney(
    group.payslips
      .filter((payslip) => payslip.renderPayload?.totals?.taxDecision?.outputs?.taxFieldCode === "a_sink_tax")
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
    specificationNumber: requireAgiSpecificationNumber(specificationNumber),
    personIdentifierType: normalizeOptionalText(group.employee.identityType) || "other",
    personIdentifier: normalizeOptionalText(group.employee.identityValue) || normalizeOptionalText(group.employee.identityValueMasked),
    protectedIdentity: group.employee.protectedIdentity === true,
    countryCode: group.employee.countryCode || null,
    compensationFields: fieldTotals,
    taxFields: {
      preliminaryTax: taxFieldCodes.has("preliminary_tax") ? preliminaryTaxAmount : null,
      sinkTax: taxFieldCodes.has("sink_tax") ? sinkTaxAmount : null,
      aSinkTax: taxFieldCodes.has("a_sink_tax") ? aSinkTaxAmount : null
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
    specificationNumber: employeePayload.specificationNumber,
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
      summary.aSinkTaxAmount = roundMoney(summary.aSinkTaxAmount + Number(payload.taxFields.aSinkTax || 0));
      return summary;
    },
    {
      employeeCount: 0,
      cashCompensationAmount: 0,
      taxableBenefitAmount: 0,
      taxFreeAllowanceAmount: 0,
      pensionPremiumAmount: 0,
      preliminaryTaxAmount: 0,
      sinkTaxAmount: 0,
      aSinkTaxAmount: 0
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

function assertAgiVersionMutable(version, operationCode) {
  if (!version) {
    return;
  }
  if (["draft", "validated"].includes(version.state)) {
    return;
  }
  throw createError(
    409,
    "agi_version_immutable",
    `AGI version is immutable after leaving draft/validated state and cannot run ${operationCode}.`
  );
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
  const seenSpecificationNumbers = new Set();
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
    const specificationNumber = normalizeAgiSpecificationNumber(employee.specificationNumber);
    if (specificationNumber == null) {
      errors.push(
        createAgiValidationError(
          "agi_specification_number_missing",
          `Employee ${employee.employeeId} is missing a stable specification number for AGI correction replacement.`
        )
      );
    } else if (seenSpecificationNumbers.has(specificationNumber)) {
      errors.push(
        createAgiValidationError(
          "agi_specification_number_duplicate",
          `Specification number ${specificationNumber} is duplicated across AGI employee payloads.`
        )
      );
    } else {
      seenSpecificationNumbers.add(specificationNumber);
    }
  }

  let specificationNumbersStable = true;
  if (version.previousSubmittedVersionId) {
    const previousVersion = requireAgiSubmissionVersion(state, version.previousSubmittedVersionId);
    const previousEmployees = Array.isArray(previousVersion.payloadJson?.employees) ? previousVersion.payloadJson.employees : [];
    const previousSpecifications = new Map(
      previousEmployees
        .map((employee) => [normalizeOptionalText(employee?.employeeId), normalizeAgiSpecificationNumber(employee?.specificationNumber)])
        .filter(([employeeId, specificationNumber]) => employeeId && specificationNumber != null)
    );
    for (const employee of employees) {
      const employeeId = normalizeOptionalText(employee?.employeeId);
      const previousSpecificationNumber = employeeId ? previousSpecifications.get(employeeId) : null;
      if (previousSpecificationNumber != null && previousSpecificationNumber !== normalizeAgiSpecificationNumber(employee?.specificationNumber)) {
        specificationNumbersStable = false;
        errors.push(
          createAgiValidationError(
            "agi_specification_number_changed",
            `Employee ${employee.employeeId} must reuse the same specification number when correcting AGI.`
          )
        );
      }
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
  const employeeTotalsMatch =
    roundMoney(totals.cashCompensationAmount) === roundMoney(expectedTotals.cashCompensationAmount || 0) &&
    roundMoney(totals.taxableBenefitAmount) === roundMoney(expectedTotals.taxableBenefitAmount || 0) &&
    roundMoney(totals.preliminaryTaxAmount) === roundMoney(expectedTotals.preliminaryTaxAmount || 0) &&
    roundMoney(totals.sinkTaxAmount) === roundMoney(expectedTotals.sinkTaxAmount || 0) &&
    roundMoney(totals.aSinkTaxAmount) === roundMoney(expectedTotals.aSinkTaxAmount || 0) &&
    totals.employeeCount === Number(expectedTotals.employeeCount || 0);
  if (!employeeTotalsMatch) {
    errors.push(createAgiValidationError("agi_totals_mismatch", "AGI totals do not match the employee payloads."));
  }

  const expectedEmployerTotals = summarizeAgiEmployerTotals({
    state,
    approvedRuns: collectApprovedPayRunsForPeriod(state, submission.companyId, submission.reportingPeriod),
    employeeTotals: totals
  });
  const payloadEmployerTotals = payload.employerTotals || {};
  if (
    normalizeAgiWholeKronaAmount(payloadEmployerTotals.field487SummaArbetsgivaravgifterOchSlf) == null
    || normalizeAgiWholeKronaAmount(payloadEmployerTotals.field497SummaSkatteavdrag) == null
  ) {
    errors.push(
      createAgiValidationError(
        "agi_employer_totals_missing",
        "AGI employer totals must include field 487 and field 497 before submission readiness."
      )
    );
  }
  const employerTotalsMatch = compareAgiEmployerTotals(payloadEmployerTotals, expectedEmployerTotals);
  if (!employerTotalsMatch) {
    errors.push(
      createAgiValidationError(
        "agi_employer_totals_mismatch",
        "AGI employer totals do not match approved payroll employer-contribution and tax-deduction aggregates."
      )
    );
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
    totalsMatch: employeeTotalsMatch && employerTotalsMatch && specificationNumbersStable
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

function appendAgiReceipt(state, { version, simulatedOutcome, message, actorId, clock, executionBoundary = null }) {
  const boundary = normalizePayrollExecutionBoundary(executionBoundary, {
    modeCode: "test",
    environmentMode: "test",
    supportsLegalEffect: false,
    watermarkCode: null,
    trialGuardActive: false,
    submissionModeCode: "test"
  });
  const receipt = {
    agiReceiptId: crypto.randomUUID(),
    agiSubmissionVersionId: version.agiSubmissionVersionId,
    companyId: version.companyId,
    receiptStatus: assertAllowed(simulatedOutcome, ["accepted", "partially_rejected", "rejected"], "agi_receipt_status_invalid"),
    receiptCode: `${boundary.submissionModeCode}:${simulatedOutcome}`,
    message:
      normalizeOptionalText(message)
      || `${boundary.trialGuardActive ? "Trial" : boundary.supportsLegalEffect === true ? "Live" : "Non-live"} AGI receipt: ${simulatedOutcome}.`,
    receivedByActorId: requireText(actorId, "actor_id_required"),
    receivedAt: nowIso(clock),
    payloadJson: {
      mode: boundary.submissionModeCode,
      outcome: simulatedOutcome,
      legalEffect: boundary.supportsLegalEffect === true,
      watermarkCode: boundary.watermarkCode || null,
      providerPolicyCode: boundary.providerPolicyCode || null,
      executionBoundary: copy(boundary)
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

function resolvePayrollExecutionBoundary({
  companyId,
  environmentMode = "test",
  supportsLegalEffect = false,
  modeWatermarkCode = null,
  tenantControlPlatform = null
}) {
  const runtimeModeCode = normalizeOptionalText(environmentMode) || "test";
  const runtimeWatermarkCode = normalizeOptionalText(modeWatermarkCode) || runtimeModeCode.toUpperCase();
  const trialEnvironment = findLatestTrialEnvironmentForCompany(tenantControlPlatform, companyId);
  if (trialEnvironment) {
    assertPayrollTrialEnvironmentIsolated(trialEnvironment);
    return {
      boundaryCode: trialEnvironment.trialEnvironmentProfileId,
      source: "trial_environment_profile",
      modeCode: "trial",
      environmentMode: "trial",
      submissionModeCode: "trial",
      trialGuardActive: true,
      supportsLegalEffect: false,
      watermarkCode: normalizeOptionalText(trialEnvironment.watermarkCode) || runtimeWatermarkCode || "TRIAL",
      providerPolicyCode: normalizeOptionalText(trialEnvironment.providerPolicyCode) || "trial_safe_default",
      providerEnvironmentRef:
        normalizeOptionalText(trialEnvironment.providerPolicy?.adapters?.submissions?.providerEnvironmentRef)
        || "trial_safe",
      trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
      trialIsolationStatus: trialEnvironment.trialIsolationStatus,
      liveCredentialPolicy: trialEnvironment.liveCredentialPolicy || "blocked",
      liveSubmissionPolicy: trialEnvironment.liveSubmissionPolicy || "blocked",
      liveBankRailPolicy: trialEnvironment.liveBankRailPolicy || "blocked",
      liveEconomicEffectPolicy: trialEnvironment.liveEconomicEffectPolicy || "blocked"
    };
  }
  return {
    boundaryCode: `runtime:${runtimeModeCode}`,
    source: "runtime_mode",
    modeCode: runtimeModeCode,
    environmentMode: runtimeModeCode,
    submissionModeCode: runtimeModeCode === "production" ? "live" : runtimeModeCode,
    trialGuardActive: runtimeModeCode === "trial",
    supportsLegalEffect: supportsLegalEffect === true,
    watermarkCode: runtimeWatermarkCode || null,
    providerPolicyCode: null,
    providerEnvironmentRef: null,
    trialEnvironmentProfileId: null,
    trialIsolationStatus: runtimeModeCode === "trial" ? "runtime_trial_guard" : null,
    liveCredentialPolicy: supportsLegalEffect === true ? "allowed" : "blocked",
    liveSubmissionPolicy: supportsLegalEffect === true ? "allowed" : "blocked",
    liveBankRailPolicy: runtimeModeCode === "trial" ? "blocked" : supportsLegalEffect === true ? "allowed" : "non_live",
    liveEconomicEffectPolicy:
      runtimeModeCode === "trial" ? "blocked" : supportsLegalEffect === true ? "allowed" : "non_live"
  };
}

function normalizePayrollExecutionBoundary(boundary, fallbackBoundary = null) {
  if (!boundary && !fallbackBoundary) {
    return null;
  }
  return copy({
    ...(fallbackBoundary ? copy(fallbackBoundary) : {}),
    ...(boundary ? copy(boundary) : {})
  });
}

function derivePayrollExecutionBoundaryForApprovedRuns({
  approvedRuns,
  companyId,
  environmentMode = "test",
  supportsLegalEffect = false,
  modeWatermarkCode = null,
  tenantControlPlatform = null
}) {
  const fallbackBoundary = resolvePayrollExecutionBoundary({
    companyId,
    environmentMode,
    supportsLegalEffect,
    modeWatermarkCode,
    tenantControlPlatform
  });
  const storedBoundary = (approvedRuns || []).map((run) => run?.executionBoundary).find(Boolean) || null;
  return normalizePayrollExecutionBoundary(storedBoundary, fallbackBoundary);
}

function findLatestTrialEnvironmentForCompany(tenantControlPlatform, companyId) {
  if (!tenantControlPlatform || typeof tenantControlPlatform.snapshotTenantControl !== "function") {
    return null;
  }
  const snapshot = tenantControlPlatform.snapshotTenantControl();
  const entries = Array.isArray(snapshot?.trialEnvironmentProfiles) ? snapshot.trialEnvironmentProfiles : [];
  return entries
    .filter((entry) => entry.companyId === requireText(companyId, "company_id_required"))
    .filter((entry) => entry.mode === "trial")
    .filter((entry) => !["expired", "archived"].includes(entry.status))
    .sort((left, right) => {
      const leftKey = `${left.status === "active" ? "0" : "1"}:${left.updatedAt || left.createdAt || ""}:${left.trialEnvironmentProfileId}`;
      const rightKey = `${right.status === "active" ? "0" : "1"}:${right.updatedAt || right.createdAt || ""}:${right.trialEnvironmentProfileId}`;
      return rightKey.localeCompare(leftKey);
    })[0] || null;
}

function assertPayrollTrialEnvironmentIsolated(trialEnvironment) {
  if (!trialEnvironment || trialEnvironment.mode !== "trial") {
    throw createError(409, "trial_environment_mode_invalid", "Trial environment must run in trial mode.");
  }
  if (trialEnvironment.supportsRealCredentials !== false || trialEnvironment.liveCredentialPolicy !== "blocked") {
    throw createError(409, "trial_environment_live_credentials_not_blocked", "Trial environment must block live credentials.");
  }
  if (trialEnvironment.supportsLegalEffect !== false || trialEnvironment.liveSubmissionPolicy !== "blocked") {
    throw createError(409, "trial_environment_legal_effect_not_blocked", "Trial environment must block legal effect.");
  }
  if (trialEnvironment.liveBankRailPolicy !== "blocked" || trialEnvironment.liveEconomicEffectPolicy !== "blocked") {
    throw createError(
      409,
      "trial_environment_live_effect_not_blocked",
      "Trial environment must block live bank rails and live economic effect."
    );
  }
  if (normalizeOptionalText(trialEnvironment.providerPolicyCode) == null || trialEnvironment.trialIsolationStatus !== "isolated") {
    throw createError(409, "trial_environment_not_isolated", "Trial environment isolation policy is incomplete.");
  }
}

function assertPayrollSubmissionModeAllowed({ requestedMode, executionBoundary }) {
  const normalizedRequestedMode = normalizeOptionalText(requestedMode);
  if (!normalizedRequestedMode) {
    return;
  }
  if (executionBoundary?.supportsLegalEffect === true) {
    return;
  }
  if (["live", "production", "legal_effect"].includes(normalizedRequestedMode)) {
    throw createError(409, "agi_submission_live_mode_blocked", "Live AGI submission mode is blocked in this runtime boundary.");
  }
}

function buildPayrollTrialGuard(executionBoundary) {
  if (!executionBoundary?.trialGuardActive) {
    return null;
  }
  return {
    modeCode: executionBoundary.modeCode,
    legalEffect: false,
    watermarkCode: executionBoundary.watermarkCode || null,
    providerPolicyCode: executionBoundary.providerPolicyCode || null,
    trialEnvironmentProfileId: executionBoundary.trialEnvironmentProfileId || null,
    liveSubmissionPolicy: executionBoundary.liveSubmissionPolicy || "blocked",
    liveBankRailPolicy: executionBoundary.liveBankRailPolicy || "blocked"
  };
}

function buildPayrollWatermark(executionBoundary) {
  if (!executionBoundary?.trialGuardActive) {
    return null;
  }
  return {
    watermarkCode: executionBoundary.watermarkCode || "TRIAL",
    label: `${executionBoundary.watermarkCode || "TRIAL"} NON-LIVE`,
    legalEffect: false,
    displayText: `${executionBoundary.watermarkCode || "TRIAL"} - NO LEGAL EFFECT`
  };
}

function buildTrialSafePayrollAccountTarget({ reportingPeriod, employeeId, employmentId }) {
  return `trial://payroll/${normalizeReportingPeriod(reportingPeriod, "payroll_reporting_period_required")}/${String(employeeId).slice(0, 8)}/${String(employmentId).slice(0, 8)}`;
}

function assertTrialPayrollBankEventId(bankEventId) {
  const resolvedBankEventId = requireText(bankEventId, "bank_event_id_required");
  if (!/^(trial|sandbox|test):/u.test(resolvedBankEventId)) {
    throw createError(
      409,
      "trial_bank_event_non_live_required",
      "Trial payroll payout batches may only be matched against non-live bank events."
    );
  }
}

function syncPayRunApprovalEvidenceBundle({ state, payRun, actorId = "system", evidencePlatform = null, environmentMode = "test" }) {
  const payslips = (state.payslipIdsByRun.get(payRun.payRunId) || [])
    .map((payslipId) => state.payslips.get(payslipId))
    .filter(Boolean);
  const remittanceInstructions = (state.remittanceInstructionIdsByRun.get(payRun.payRunId) || [])
    .map((remittanceInstructionId) => state.remittanceInstructions.get(remittanceInstructionId))
    .filter(Boolean);
  const employeeReceivables = (state.employeeReceivableIdsByRun.get(payRun.payRunId) || [])
    .map((employeeReceivableId) => state.employeeReceivables.get(employeeReceivableId))
    .filter(Boolean);
  const receivableSettlementPlans = employeeReceivables
    .map((receivable) => state.receivableSettlementPlanIdByReceivable.get(receivable.employeeReceivableId))
    .filter(Boolean)
    .map((receivableSettlementPlanId) => state.receivableSettlementPlans.get(receivableSettlementPlanId))
    .filter(Boolean);
  const receivableOffsetDecisions = (state.receivableOffsetDecisionIdsByCompany.get(payRun.companyId) || [])
    .map((receivableOffsetDecisionId) => state.receivableOffsetDecisions.get(receivableOffsetDecisionId))
    .filter(Boolean)
    .filter((decision) => decision.executedPayRunId === payRun.payRunId);
  const exceptions = listPayrollExceptionsFromState(state, payRun.payRunId).map(copy);
  const events = (state.payRunEventIdsByRun.get(payRun.payRunId) || [])
    .map((eventId) => state.payRunEvents.get(eventId))
    .filter(Boolean)
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .map(copy);
  const bundleId = registerPayrollEvidenceBundle({
    evidencePlatform,
    executionBoundary: payRun.executionBoundary,
    companyId: payRun.companyId,
    bundleType: "payroll_approval",
    sourceObjectType: "pay_run",
    sourceObjectId: payRun.payRunId,
    sourceObjectVersion: payRun.updatedAt || payRun.approvedAt || payRun.createdAt,
    title: `Payroll approval ${payRun.reportingPeriod}`,
    actorId,
    requireTrialGuard: false,
    previousEvidenceBundleId: payRun.approvalEvidenceBundleId || null,
    metadata: {
      reportingPeriod: payRun.reportingPeriod,
      runType: payRun.runType,
      payDate: payRun.payDate,
      payRunFingerprint: payRun.payRunFingerprint,
      sourceSnapshotHash: payRun.sourceSnapshotHash,
      postingIntentSnapshotHash: payRun.postingIntentSnapshotHash,
      bankPaymentSnapshotHash: payRun.bankPaymentSnapshotHash,
      exceptionSummary: summarizePayrollExceptions(exceptions)
    },
    artifactRefs: [
      ...(payRun.payrollInputSnapshotId
        ? [{
            artifactType: "payroll_input_snapshot",
            artifactRef: payRun.payrollInputSnapshotId,
            checksum: payRun.payrollInputFingerprint || payRun.sourceSnapshotHash,
            roleCode: "input_snapshot"
          }]
        : []),
      ...payslips.map((payslip) => ({
        artifactType: "payslip_snapshot",
        artifactRef: payslip.payslipId,
        checksum: payslip.snapshotHash,
        roleCode: payslip.employeeId,
        metadata: {
          employeeId: payslip.employeeId
        }
      })),
      ...remittanceInstructions.map((instruction) => ({
        artifactType: "remittance_instruction",
        artifactRef: instruction.remittanceInstructionId,
        checksum: buildSnapshotHash({
          remittanceInstructionId: instruction.remittanceInstructionId,
          status: instruction.status,
          amount: instruction.amount,
          authorityCode: instruction.authorityCode,
          employmentId: instruction.employmentId
        }),
        roleCode: instruction.authorityCode || instruction.remittanceType || "remittance"
      })),
      ...exceptions.map((exception) => ({
        artifactType: "payroll_exception",
        artifactRef: exception.payrollExceptionId,
        checksum: buildSnapshotHash({
          payrollExceptionId: exception.payrollExceptionId,
          code: exception.code,
          status: exception.status,
          blocking: exception.blocking
        }),
        roleCode: exception.code
      })),
      ...employeeReceivables.map((receivable) => ({
        artifactType: "employee_receivable",
        artifactRef: receivable.employeeReceivableId,
        checksum: buildSnapshotHash({
          employeeReceivableId: receivable.employeeReceivableId,
          amount: receivable.amount,
          outstandingAmount: receivable.outstandingAmount,
          status: receivable.status
        }),
        roleCode: receivable.employmentId
      })),
      ...receivableSettlementPlans.map((plan) => ({
        artifactType: "employee_receivable_settlement_plan",
        artifactRef: plan.receivableSettlementPlanId,
        checksum: buildSnapshotHash({
          receivableSettlementPlanId: plan.receivableSettlementPlanId,
          employeeReceivableId: plan.employeeReceivableId,
          status: plan.status,
          installments: plan.installments || []
        }),
        roleCode: plan.employeeReceivableId
      })),
      ...receivableOffsetDecisions.map((decision) => ({
        artifactType: "employee_receivable_offset_decision",
        artifactRef: decision.receivableOffsetDecisionId,
        checksum: buildSnapshotHash({
          receivableOffsetDecisionId: decision.receivableOffsetDecisionId,
          employeeReceivableId: decision.employeeReceivableId,
          executedAmount: decision.executedAmount,
          status: decision.status
        }),
        roleCode: decision.employeeReceivableId
      })),
      ...events.map((event) => ({
        artifactType: "pay_run_event",
        artifactRef: event.payRunEventId,
        checksum: buildSnapshotHash({
          payRunEventId: event.payRunEventId,
          eventType: event.eventType,
          recordedAt: event.recordedAt
        }),
        roleCode: event.eventType
      }))
    ],
    auditRefs: [
      {
        actorId: requireText(actorId, "actor_id_required"),
        approvedAt: payRun.approvedAt,
        payRunStatus: payRun.status
      }
    ],
    signoffRefs: [
      {
        actorId: requireText(actorId, "actor_id_required"),
        approvedAt: payRun.approvedAt,
        payRunStatus: payRun.status
      }
    ],
    sourceRefs: [
      {
        payrollInputSnapshotId: payRun.payrollInputSnapshotId,
        payrollInputFingerprint: payRun.payrollInputFingerprint,
        payRunFingerprint: payRun.payRunFingerprint,
        sourceSnapshotHash: payRun.sourceSnapshotHash
      },
      ...copy(payRun.rulepackRefs || []),
      ...copy(payRun.providerBaselineRefs || []),
      ...copy(payRun.decisionSnapshotRefs || [])
    ],
    relatedObjectRefs: [
      ...(payRun.payrollInputSnapshotId
        ? [{
            objectType: "payroll_input_snapshot",
            objectId: payRun.payrollInputSnapshotId
          }]
        : []),
      ...payRun.employmentIds.map((employmentId) => ({
        objectType: "employment",
        objectId: employmentId
      })),
      ...employeeReceivables.map((receivable) => ({
        objectType: "employee_receivable",
        objectId: receivable.employeeReceivableId
      })),
      ...payslips.map((payslip) => ({
        objectType: "payslip",
        objectId: payslip.payslipId
      })),
      ...remittanceInstructions.map((instruction) => ({
        objectType: "remittance_instruction",
        objectId: instruction.remittanceInstructionId
      }))
    ],
    environmentMode
  });
  payRun.approvalEvidenceBundleId = bundleId || payRun.approvalEvidenceBundleId || null;
  return payRun.approvalEvidenceBundleId;
}

function registerPayrollEvidenceBundle({
  evidencePlatform,
  executionBoundary,
  companyId,
  bundleType,
  sourceObjectType,
  sourceObjectId,
  sourceObjectVersion,
  title,
  actorId = "system",
  metadata = {},
  artifactRefs = [],
  auditRefs = [],
  signoffRefs = [],
  sourceRefs = [],
  relatedObjectRefs = [],
  previousEvidenceBundleId = null,
  requireTrialGuard = true,
  environmentMode = "test"
}) {
  if ((requireTrialGuard && executionBoundary?.trialGuardActive !== true) || typeof evidencePlatform?.createFrozenEvidenceBundleSnapshot !== "function") {
    return null;
  }
  const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
    companyId,
    bundleType,
    sourceObjectType,
    sourceObjectId,
    sourceObjectVersion,
    title,
    retentionClass: "regulated",
    classificationCode: "restricted_internal",
    metadata: {
      ...copy(metadata || {}),
      watermarkCode: executionBoundary.watermarkCode || null,
      legalEffect: executionBoundary?.supportsLegalEffect === true,
      modeCode: executionBoundary?.modeCode || null,
      providerPolicyCode: executionBoundary.providerPolicyCode || null
    },
    artifactRefs,
    auditRefs,
    signoffRefs,
    sourceRefs,
    relatedObjectRefs,
    actorId,
    previousEvidenceBundleId,
    environmentMode: executionBoundary?.environmentMode || environmentMode || "test"
  });
  return bundle?.evidenceBundleId || null;
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
      payload: previewPayload,
      step: createPendingStep(16, {
        status: "validation_required",
        ...details
      })
    };
  }
  return {
    payload: previewPayload,
    step: createCompletedStep(16, details)
  };
}

function buildPayrollPostingIntentPreview({
  reportingPeriod,
  employment,
  lines,
  preliminaryTaxAmount,
  employerContributionAmount,
  netPayAmount,
  cashNetPayAmount = null,
  employeeReceivableAmount = null
}) {
  const dimensionKeys = [...new Set(lines.map((line) => stableStringify(normalizePayrollDimensions(line.dimensionJson || {}))))].sort();
  const payload = {
    employmentId: employment.employmentId,
    reportingPeriod,
    sourceLineCount: lines.length,
    grossLineCount: lines.filter((line) => line.compensationBucket === "gross_addition").length,
    grossDeductionLineCount: lines.filter((line) => line.compensationBucket === "gross_deduction").length,
    netDeductionLineCount: lines.filter((line) => line.compensationBucket === "net_deduction").length,
    preliminaryTaxAmount: roundMoney(preliminaryTaxAmount || 0),
    employerContributionAmount: roundMoney(employerContributionAmount || 0),
    netPayAmount: netPayAmount == null ? null : roundMoney(netPayAmount),
    cashNetPayAmount: cashNetPayAmount == null ? null : roundMoney(cashNetPayAmount),
    employeeReceivableAmount: employeeReceivableAmount == null ? null : roundMoney(employeeReceivableAmount),
    dimensions: dimensionKeys.map((serialized) => JSON.parse(serialized))
  };
  return {
    payload,
    step: createCompletedStep(17, {
      payloadHash: buildSnapshotHash(payload),
      previewItemCount: payload.sourceLineCount,
      dimensionCount: payload.dimensions.length,
      preliminaryTaxAmount: payload.preliminaryTaxAmount,
      employerContributionAmount: payload.employerContributionAmount,
      netPayAmount: payload.netPayAmount,
      cashNetPayAmount: payload.cashNetPayAmount,
      employeeReceivableAmount: payload.employeeReceivableAmount
    })
  };
}

function buildPayrollBankPaymentPreview({
  reportingPeriod,
  payDate,
  employee,
  employment,
  primaryBankAccount,
  netPayAmount,
  cashNetPayAmount = null,
  employeeReceivableAmount = null,
  executionBoundary = null
}) {
  const normalizedNetPayAmount = netPayAmount == null ? null : roundMoney(netPayAmount);
  const normalizedCashNetPayAmount =
    cashNetPayAmount == null
      ? normalizedNetPayAmount == null
        ? null
        : roundMoney(Math.max(0, normalizedNetPayAmount))
      : roundMoney(cashNetPayAmount);
  const normalizedEmployeeReceivableAmount =
    employeeReceivableAmount == null
      ? normalizedNetPayAmount == null
        ? null
        : roundMoney(Math.max(0, -normalizedNetPayAmount))
      : roundMoney(employeeReceivableAmount);
  const requiresBankPayout = normalizedCashNetPayAmount != null && normalizedCashNetPayAmount > 0;
  const trialGuardActive = executionBoundary?.trialGuardActive === true;
  const accountTarget = requiresBankPayout
    ? trialGuardActive
      ? buildTrialSafePayrollAccountTarget({
          reportingPeriod,
          employeeId: employee.employeeId,
          employmentId: employment.employmentId
        })
      : primaryBankAccount?.iban ||
        primaryBankAccount?.bankgiro ||
        primaryBankAccount?.plusgiro ||
        primaryBankAccount?.maskedAccountDisplay ||
        null
    : null;
  const payload = {
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    reportingPeriod,
    payDate,
    netPayAmount: normalizedNetPayAmount,
    cashNetPayAmount: normalizedCashNetPayAmount,
    employeeReceivableAmount: normalizedEmployeeReceivableAmount,
    requiresBankPayout,
    payoutReady: requiresBankPayout ? (trialGuardActive ? true : primaryBankAccount != null) : true,
    accountTarget,
    bankRailMode: trialGuardActive ? "trial_non_live" : "standard",
    legalEffect: executionBoundary?.supportsLegalEffect === true,
    watermarkCode: executionBoundary?.watermarkCode || null
  };
  return {
    payload,
    step: createCompletedStep(18, {
      payloadHash: buildSnapshotHash(payload),
      bankAccountPresent: primaryBankAccount != null,
      requiresBankPayout,
      payoutReady: payload.payoutReady,
      netPayAmount: normalizedNetPayAmount,
      cashNetPayAmount: normalizedCashNetPayAmount,
      employeeReceivableAmount: normalizedEmployeeReceivableAmount,
      bankRailMode: payload.bankRailMode
    })
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
        manualRateReasonCode: statutoryProfile.fallbackManualRateReasonCode ?? statutoryProfile.manualRateReasonCode ?? null,
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
  payRunId = null,
  employment,
  period,
  runType,
  manualInputs,
  retroAdjustments,
  finalPayAdjustments,
  leavePayItemMappings,
  statutoryProfile,
  taxDecisionSnapshot = null,
  employerContributionDecisionSnapshot = null,
  garnishmentDecisionSnapshot = null,
  executionBoundary = null,
  employmentTimeBase = null,
  payrollInputPeriod = null,
  agreementContext = null,
  hrPlatform,
  timePlatform,
  benefitsPlatform,
  travelPlatform,
  pensionPlatform,
  clock
}) {
  const hrSnapshot = employmentTimeBase?.hrSnapshot || null;
  const employee = hrSnapshot?.employee || resolveEmployeeSnapshot({ employment, hrPlatform });
  const contract = hrSnapshot?.activeContract || resolveActiveEmploymentContract(employment, period.endsOn);
  const primaryBankAccount = hrSnapshot?.primaryBankAccount || resolvePrimaryBankAccount({ companyId: employment.companyId, employeeId: employment.employeeId, hrPlatform });
  const timeEntries = payrollInputPeriod?.approvedTimeEntries
    ? payrollInputPeriod.approvedTimeEntries.map(copy)
    : timePlatform?.listTimeEntries
    ? listEmploymentTimeEntries({ companyId: employment.companyId, employmentId: employment.employmentId, period, timePlatform })
    : employmentTimeBase?.approvedTimeEntries || [];
  const leaveEntries = payrollInputPeriod?.approvedLeaveEntries
    ? payrollInputPeriod.approvedLeaveEntries.map(copy)
    : listEmploymentLeaveEntries({ companyId: employment.companyId, employmentId: employment.employmentId, period, timePlatform });
  const balances =
    employmentTimeBase?.timeBalances ||
    (timePlatform?.listTimeBalances
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
        });
  const agreementOverlay = agreementContext?.overlay || employmentTimeBase?.agreementOverlay || null;
  const benefitPayloadBundle = benefitsPlatform?.listPayrollBenefitPayloads
    ? benefitsPlatform.listPayrollBenefitPayloads({
        companyId: employment.companyId,
        employmentId: employment.employmentId,
        reportingPeriod: period.reportingPeriod
      })
    : { events: [], payLinePayloads: [], warnings: [] };
  const travelPayloadBundle = travelPlatform?.listPayrollTravelPayloads
    ? travelPlatform.listPayrollTravelPayloads({
        companyId: employment.companyId,
        employmentId: employment.employmentId,
        reportingPeriod: period.reportingPeriod
      })
    : { claims: [], payLinePayloads: [], warnings: [] };
  const documentClassificationPayloadBundle = listDocumentClassificationPayloadBundleFromState(state, {
    companyId: employment.companyId,
    employmentId: employment.employmentId,
    reportingPeriod: period.reportingPeriod
  });
  let pensionPayloadBundle = { enrollments: [], activeAgreements: [], basisSnapshots: [], events: [], payLinePayloads: [], warnings: [] };
  const payrollTravelClaims = (travelPayloadBundle.claims || []).map((claim) => ({
    travelClaimId: claim.travelClaimId,
    reportingPeriod: claim.reportingPeriod,
    approvalStatus: claim.approvalStatus,
    dimensionJson: normalizePayrollDimensions(claim.dimensionJson || {}),
    taxFreeTravelAllowance: claim.valuation?.taxFreeTravelAllowance || 0,
    taxableTravelAllowance: claim.valuation?.taxableTravelAllowance || 0,
    taxFreeMileage: claim.valuation?.taxFreeMileage || 0,
    taxableMileage: claim.valuation?.taxableMileage || 0,
    expenseReimbursementAmount: claim.valuation?.expenseReimbursementAmount || 0,
    deductibleExpenseVatAmount: claim.valuation?.deductibleExpenseVatAmount || 0,
    expenseVatDecidedCount: claim.valuation?.expenseVatDecidedCount || 0,
    expenseVatReviewCount: claim.valuation?.expenseVatReviewCount || 0,
    expenseVatNotClassifiedCount: claim.valuation?.expenseVatNotClassifiedCount || 0,
    advanceNetDeductionAmount: claim.valuation?.advanceNetDeductionAmount || 0,
    expenseSplit: copy(claim.valuation?.expenseSplit || null),
    reviewCodes: copy(claim.valuation?.reviewCodes || []),
    payrollDispatchStatus: copy(claim.payrollDispatchStatus || null)
  }));

  const sourceSnapshot = {
    employee,
    employment,
    hrSnapshot,
    contract,
    primaryBankAccount,
    scheduleAssignment: employmentTimeBase?.activeScheduleAssignment || null,
    approvedTimeSet: payrollInputPeriod?.approvedTimeSet || null,
    timeEntries,
    leaveEntries,
    absenceDecisions: payrollInputPeriod?.approvedAbsenceDecisions || [],
    balances,
    pendingTimeEntries: payrollInputPeriod?.pendingTimeEntries || employmentTimeBase?.pendingTimeEntries || [],
    pendingLeaveEntries: payrollInputPeriod?.pendingLeaveEntries || [],
    approvedTimeEntriesOutsideSet: payrollInputPeriod?.approvedTimeEntriesOutsideSet || [],
    approvedLeaveEntriesWithoutDecision: payrollInputPeriod?.approvedLeaveEntriesWithoutDecision || [],
    externalBalanceSnapshots: employmentTimeBase?.balanceSnapshots || [],
    vacationBalance: employmentTimeBase?.vacationBalance || null,
    agreementOverlay,
    executionBoundary: copy(executionBoundary),
    benefitEvents: (benefitPayloadBundle.events || []).map((event) => ({
      benefitEventId: event.benefitEventId,
      benefitCode: event.benefitCode,
      taxableValue: event.valuation?.taxableValue || 0,
      netDeductionValue: event.valuation?.netDeductionValue || 0,
      offsetBreakdown: copy(event.valuation?.offsetBreakdown || null),
      reviewCodes: copy(event.valuation?.reviewCodes || []),
      dimensionJson: normalizePayrollDimensions(event.dimensionJson || {}),
      payrollDispatchStatus: copy(event.payrollDispatchStatus || null)
    })),
    benefitPayrollPayloads: snapshotExternalPayrollLinePayloads(benefitPayloadBundle.payLinePayloads || []),
    documentClassificationIntents: (documentClassificationPayloadBundle.payloads || []).map((payload) => ({
      documentClassificationPayrollPayloadId: payload.documentClassificationPayrollPayloadId,
      treatmentIntentId: payload.treatmentIntentId,
      treatmentCode: payload.treatmentCode,
      processingStep: payload.processingStep,
      payItemCode: payload.payItemCode,
      amount: payload.amount,
      sourceType: payload.payLinePayloadJson?.sourceType || null,
      sourceId: payload.payLinePayloadJson?.sourceId || null,
      dimensionJson: normalizePayrollDimensions(payload.payLinePayloadJson?.dimensionJson || {}),
      dispatchStatus: payload.dispatchStatus?.latestStage || "not_dispatched"
    })),
    documentClassificationPayrollPayloads: snapshotExternalPayrollLinePayloads(
      documentClassificationPayloadBundle.payLinePayloads || []
    ),
    travelClaims: payrollTravelClaims,
    travelPayrollPayloads: snapshotExternalPayrollLinePayloads(travelPayloadBundle.payLinePayloads || []),
    garnishmentDecisionSnapshot: null,
    garnishmentComputation: null,
    pensionEnrollments: [],
    salaryExchangeAgreements: [],
    pensionEvents: [],
    pensionBasisSnapshots: [],
    pensionPayrollPayloads: []
  };

  const warnings = (benefitPayloadBundle.warnings || []).map((warningCode) =>
    createWarning(warningCode, `Benefit engine warning: ${warningCode}.`)
  );
  warnings.push(
    ...(travelPayloadBundle.warnings || []).map((warningCode) => createWarning(warningCode, `Travel engine warning: ${warningCode}.`))
  );
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
    pendingTimeApprovalCount: (payrollInputPeriod?.pendingTimeEntries || employmentTimeBase?.pendingTimeEntries || []).length,
    pendingLeaveApprovalCount: (payrollInputPeriod?.pendingLeaveEntries || []).length,
    approvedTimeSetId: payrollInputPeriod?.approvedTimeSet?.approvedTimeSetId || null,
    approvedTimeSetStatus: payrollInputPeriod?.approvedTimeSet?.status || null,
    absenceDecisionCount: (payrollInputPeriod?.approvedAbsenceDecisions || []).length,
    balanceSnapshotHash: buildSnapshotHash(balances),
    externalBalanceSnapshotHash: buildSnapshotHash({
      balanceSnapshots: employmentTimeBase?.balanceSnapshots || [],
      vacationBalance: employmentTimeBase?.vacationBalance || null
    }),
    agreementSnapshotHash: buildSnapshotHash(agreementOverlay)
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

  const variableLineBundle = createVariableLines({
    companyId: employment.companyId,
    employment,
    contract,
    period,
    runType,
    hrSnapshot,
    agreementOverlay,
    timeEntries,
    leaveEntries,
    leavePayItemMappings,
    manualInputs: manualInputs.filter((input) => input.processingStep === 4),
    employmentTimeBase,
    timePlatform,
    state,
    warnings
  });
  const variableLines = variableLineBundle.lines;
  if (variableLineBundle.automaticLeavePreview) {
    sourceSnapshot.automaticLeavePreview = copy(variableLineBundle.automaticLeavePreview);
    sourceSnapshot.vacationPayrollComputation = copy(variableLineBundle.automaticLeavePreview.vacation || null);
    sourceSnapshot.vacationVariablePayComputation = copy(variableLineBundle.automaticLeavePreview.vacationVariablePay || null);
  }
  const finalPayLines = createFinalPayLines({
    companyId: employment.companyId,
    employment,
    finalPayAdjustments,
    employmentTimeBase,
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

  const benefitLines = [
    ...createStepLinesFromPayloads({
      processingStep: 6,
      employment,
      payloads: benefitPayloadBundle.payLinePayloads || [],
      state
    }),
    ...createStepLinesFromManualInputs({
      processingStep: 6,
      employment,
      inputs: manualInputs,
      state
    })
  ];
  lines.push(...benefitLines);
  steps[6] = createCompletedStep(6, {
    ...summarizeLineStep(benefitLines),
    benefitEventCount: (benefitPayloadBundle.events || []).length
  });

  const travelLines = [
    ...createStepLinesFromPayloads({
      processingStep: 7,
      employment,
      payloads: documentClassificationPayloadBundle.payLinePayloads || [],
      state
    }),
    ...createStepLinesFromPayloads({
      processingStep: 7,
      employment,
      payloads: travelPayloadBundle.payLinePayloads || [],
      state
    }),
    ...createStepLinesFromManualInputs({
      processingStep: 7,
      employment,
      inputs: manualInputs,
      state
    })
  ];
  lines.push(...travelLines);
  steps[7] = createCompletedStep(7, {
    ...summarizeLineStep(travelLines),
    travelClaimCount: (travelPayloadBundle.claims || []).length,
    documentClassificationPayloadCount: (documentClassificationPayloadBundle.payloads || []).filter((payload) => payload.processingStep === 7).length
  });

  const grossCompensationBeforeDeductions = roundMoney(
    lines
      .filter((line) => line.compensationBucket === "gross_addition")
      .reduce((sum, line) => sum + directionalAmount(line), 0)
  );
  const pensionableBaseBeforeExchange = roundMoney(
    lines
      .filter((line) => line.affectsPensionBasis)
      .reduce((sum, line) => sum + directionalAmount(line), 0)
  );
  pensionPayloadBundle = pensionPlatform?.listPayrollPensionPayloads
    ? pensionPlatform.listPayrollPensionPayloads({
        companyId: employment.companyId,
        employeeId: employment.employeeId,
        employmentId: employment.employmentId,
        reportingPeriod: period.reportingPeriod,
        periodStartsOn: period.startsOn,
        periodEndsOn: period.endsOn,
        contractMonthlySalary: contract?.monthlySalary ?? null,
        grossCompensationBeforeDeductions,
        pensionableBaseBeforeExchange,
        agreementOverlay,
        actorId: "payroll-engine"
      })
    : { enrollments: [], activeAgreements: [], basisSnapshots: [], events: [], payLinePayloads: [], warnings: [] };
  sourceSnapshot.pensionEnrollments = (pensionPayloadBundle.enrollments || []).map((enrollment) => ({
    pensionEnrollmentId: enrollment.pensionEnrollmentId,
    planCode: enrollment.planCode,
    providerCode: enrollment.providerCode,
    contributionMode: enrollment.contributionMode,
    dimensionJson: normalizePayrollDimensions(enrollment.dimensionJson || {})
  }));
  sourceSnapshot.salaryExchangeAgreements = (pensionPayloadBundle.activeAgreements || []).map((agreement) => ({
    salaryExchangeAgreementId: agreement.salaryExchangeAgreementId,
    status: agreement.status,
    exchangeMode: agreement.exchangeMode,
    exchangeValue: agreement.exchangeValue,
    thresholdAmount: agreement.thresholdAmount,
    policyVersionRef: agreement.policyVersionRef,
    policyEffectiveFrom: agreement.policyEffectiveFrom,
    policyEffectiveTo: agreement.policyEffectiveTo,
    minimumMonthlyExchangeAmount: agreement.minimumMonthlyExchangeAmount,
    maximumExchangeShare: agreement.maximumExchangeShare,
    specialPayrollTaxRatePercent: agreement.specialPayrollTaxRatePercent,
    dimensionJson: normalizePayrollDimensions(agreement.dimensionJson || {}),
    payrollDispatchStatus: copy(agreement.payrollDispatchStatus || null)
  }));
  sourceSnapshot.pensionBasisSnapshots = (pensionPayloadBundle.basisSnapshots || []).map((snapshot) => ({
    pensionBasisSnapshotId: snapshot.pensionBasisSnapshotId,
    salaryExchangeAmount: snapshot.salaryExchangeAmount,
    pensionableBaseAfterExchange: snapshot.pensionableBaseAfterExchange,
    totalPensionPremiumAmount: snapshot.totalPensionPremiumAmount,
    specialPayrollTaxAmount: snapshot.specialPayrollTaxAmount,
    policyVersionRef: snapshot.policyVersionRef,
    policyEffectiveFrom: snapshot.policyEffectiveFrom,
    policyEffectiveTo: snapshot.policyEffectiveTo,
    specialPayrollTaxRatePercent: snapshot.specialPayrollTaxRatePercent,
    basisTreatmentCode: snapshot.basisTreatmentCode
  }));
  sourceSnapshot.pensionEvents = (pensionPayloadBundle.events || []).map((event) => ({
    pensionEventId: event.pensionEventId,
    planCode: event.planCode,
    providerCode: event.providerCode,
    contributionAmount: event.contributionAmount,
    salaryExchangeFlag: event.salaryExchangeFlag,
    extraPensionFlag: event.extraPensionFlag,
    dimensionJson: normalizePayrollDimensions(event.payrollLinePayloadJson?.dimensionJson || {}),
    payrollDispatchStatus: copy(event.payrollDispatchStatus || null)
  }));
  sourceSnapshot.pensionPayrollPayloads = snapshotExternalPayrollLinePayloads(pensionPayloadBundle.payLinePayloads || []);
  warnings.push(
    ...(pensionPayloadBundle.warnings || []).map((warningCode) => createWarning(warningCode, `Pension engine warning: ${warningCode}.`))
  );
  const grossDeductionLines = [
    ...createStepLinesFromPayloads({
      processingStep: 8,
      employment,
      payloads: pensionPayloadBundle.payLinePayloads || [],
      state
    }),
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
  const pensionLines = createStepLinesFromPayloads({
    processingStep: 9,
    employment,
    payloads: pensionPayloadBundle.payLinePayloads || [],
    state
  });
  lines.push(...pensionLines);
  steps[9] = createCompletedStep(9, {
    ...summarizeLineStep(pensionLines),
    pensionableBase,
    pensionEventCount: (pensionPayloadBundle.events || []).length,
    salaryExchangeAgreementCount: (pensionPayloadBundle.activeAgreements || []).length
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
    employmentContract: contract,
    statutoryProfile,
    taxDecisionSnapshot,
    executionBoundary,
    warnings
  });
  steps[11] = taxPreview.step;

  const employerContributionPreview = buildEmployerContributionPreview({
    rules,
    contributionBase: employerContributionBase,
    employee,
    statutoryProfile,
    payDate: period.payDate,
    employerContributionDecisionSnapshot
  });
  steps[12] = employerContributionPreview.step;
  const grossAfterDeductions = roundMoney(
    lines
      .filter((line) => line.compensationBucket === "gross_addition" || line.compensationBucket === "gross_deduction")
      .reduce((sum, line) => sum + directionalAmount(line), 0)
  );
  const garnishmentPreview = buildGarnishmentPreview({
    rules,
    grossAfterDeductions,
    preliminaryTaxAmount: taxPreview.amount,
    payDate: period.payDate,
    employee,
    garnishmentDecisionSnapshot,
    warnings
  });
  sourceSnapshot.garnishmentDecisionSnapshot = garnishmentPreview.snapshot || null;
  sourceSnapshot.garnishmentComputation = garnishmentPreview.payload || null;
  const receivableOffsetLineBundle = createReceivableOffsetLines({
    state,
    payRunId,
    employment,
    reportingPeriod: period.reportingPeriod
  });
  sourceSnapshot.employeeReceivableOffsetDecisions = copy(receivableOffsetLineBundle.decisionPreviews || []);

  const netDeductionLines = [
    ...createGeneratedGarnishmentLines({
      employment,
      preview: garnishmentPreview,
      state
    }),
    ...receivableOffsetLineBundle.lines,
    ...createStepLinesFromPayloads({
      processingStep: 13,
      employment,
      payloads: documentClassificationPayloadBundle.payLinePayloads || [],
      state
    }),
    ...createStepLinesFromPayloads({
      processingStep: 13,
      employment,
      payloads: benefitPayloadBundle.payLinePayloads || [],
      state
    }),
    ...createStepLinesFromPayloads({
      processingStep: 13,
      employment,
      payloads: travelPayloadBundle.payLinePayloads || [],
      state
    }),
    ...createStepLinesFromPayloads({
      processingStep: 13,
      employment,
      payloads: pensionPayloadBundle.payLinePayloads || [],
      state
    }),
    ...createStepLinesFromManualInputs({
      processingStep: 13,
      employment,
      inputs: manualInputs,
      state
    }),
    ...finalPayLines.netDeductions
  ];
  lines.push(...netDeductionLines);
  steps[13] = createCompletedStep(13, {
    ...summarizeLineStep(netDeductionLines),
    documentClassificationPayloadCount: (documentClassificationPayloadBundle.payloads || []).filter((payload) => payload.processingStep === 13).length
  });

  const lineTotals = summarizeTotals({
    lines,
    preliminaryTax: taxPreview.amount,
    employerContributionPreviewAmount: employerContributionPreview.amount
  });
  const taxableBenefitAmount = roundMoney(
    lines
      .filter((line) => line.agiMappingCode === "taxable_benefit")
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  const taxFreeAllowanceAmount = roundMoney(
    lines
      .filter((line) => line.agiMappingCode === "tax_free_allowance")
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  const expenseReimbursementAmount = roundMoney(
    lines
      .filter((line) => line.payItemCode === "EXPENSE_REIMBURSEMENT")
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  const travelDeductibleExpenseVatAmount = roundMoney(
    payrollTravelClaims.reduce((sum, claim) => sum + Number(claim.deductibleExpenseVatAmount || 0), 0)
  );
  const travelExpenseVatDecidedCount = payrollTravelClaims.reduce(
    (sum, claim) => sum + Number(claim.expenseVatDecidedCount || 0),
    0
  );
  const travelExpenseVatReviewCount = payrollTravelClaims.reduce(
    (sum, claim) => sum + Number(claim.expenseVatReviewCount || 0),
    0
  );
  const travelExpenseVatNotClassifiedCount = payrollTravelClaims.reduce(
    (sum, claim) => sum + Number(claim.expenseVatNotClassifiedCount || 0),
    0
  );
  const pensionPremiumAmount = roundMoney(
    lines
      .filter((line) => ["PENSION_PREMIUM", "FORA_PREMIUM", "EXTRA_PENSION_PREMIUM"].includes(line.payItemCode))
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  const salaryExchangeGrossDeductionAmount = roundMoney(
    lines
      .filter((line) => line.payItemCode === "SALARY_EXCHANGE_GROSS_DEDUCTION")
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  const pensionSpecialPayrollTaxAmount = roundMoney(
    lines
      .filter((line) => line.payItemCode === "PENSION_SPECIAL_PAYROLL_TAX")
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  const garnishmentAmount = roundMoney(
    lines
      .filter((line) => line.payItemCode === "GARNISHMENT")
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  const employeeReceivableOffsetAmount = roundMoney(
    lines
      .filter((line) => line.sourceType === "employee_receivable_offset_decision")
      .reduce((sum, line) => sum + Math.abs(line.amount || 0), 0)
  );
  if (taxableBenefitAmount > 0 && lineTotals.grossAfterDeductions <= 0) {
    warnings.push(
      createWarning(
        "benefit_without_cash_salary",
        "Taxable benefit exists without cash salary. Ordinary withholding cannot be completed through the payroll cash flow."
      )
    );
  }
  steps[14] = createCompletedStep(14, {
    grossEarnings: lineTotals.grossEarnings,
    grossDeductions: lineTotals.grossDeductions,
    netDeductions: lineTotals.netDeductions,
    netPay: lineTotals.netPay,
    taxableBenefitAmount,
    taxFreeAllowanceAmount,
    expenseReimbursementAmount,
    travelDeductibleExpenseVatAmount,
    travelExpenseVatDecidedCount,
    travelExpenseVatReviewCount,
    travelExpenseVatNotClassifiedCount,
    pensionPremiumAmount,
    garnishmentAmount,
    employeeReceivableOffsetAmount,
    salaryExchangeGrossDeductionAmount,
    pensionSpecialPayrollTaxAmount
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
    benefitEvents: benefitPayloadBundle.events || [],
    documentClassificationPayloads: documentClassificationPayloadBundle.payloads || [],
    travelClaims: travelPayloadBundle.claims || [],
    pensionEvents: pensionPayloadBundle.events || [],
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
      employerContributionDecision: employerContributionPreview.decisionObject,
      garnishmentAmount,
      garnishmentDecision: garnishmentPreview.decisionObject,
      employeeReceivableOffsetAmount,
      employeeReceivableOffsetDecisions: copy(receivableOffsetLineBundle.decisionPreviews || []),
      taxableBenefitAmount,
      taxFreeAllowanceAmount,
      expenseReimbursementAmount,
      travelDeductibleExpenseVatAmount,
      travelExpenseVatDecidedCount,
      travelExpenseVatReviewCount,
      travelExpenseVatNotClassifiedCount,
      pensionPremiumAmount,
      salaryExchangeGrossDeductionAmount,
      pensionSpecialPayrollTaxAmount
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
  const postingIntentPreview = buildPayrollPostingIntentPreview({
    reportingPeriod: period.reportingPeriod,
    employment,
    lines,
    preliminaryTaxAmount: taxPreview.amount,
    employerContributionAmount: employerContributionPreview.amount,
    netPayAmount: lineTotals.netPay,
    cashNetPayAmount: lineTotals.cashNetPayAmount,
    employeeReceivableAmount: lineTotals.employeeReceivableAmount
  });
  steps[17] = postingIntentPreview.step;
  const bankPaymentPreview = buildPayrollBankPaymentPreview({
    reportingPeriod: period.reportingPeriod,
    payDate: period.payDate,
    employee,
    employment,
    primaryBankAccount,
    netPayAmount: lineTotals.netPay,
    cashNetPayAmount: lineTotals.cashNetPayAmount,
    employeeReceivableAmount: lineTotals.employeeReceivableAmount,
    executionBoundary
  });
  steps[18] = bankPaymentPreview.step;
  payslipRenderPayload.agiPreview = agiPreview.payload;
  payslipRenderPayload.postingIntentPreview = postingIntentPreview.payload;
  payslipRenderPayload.bankPaymentPreview = bankPaymentPreview.payload;
  payslipRenderPayload.executionBoundary = copy(executionBoundary);
  payslipRenderPayload.watermark = buildPayrollWatermark(executionBoundary);

  return {
    employee,
    employment,
    contract,
    employmentTimeBase,
    payrollInputPeriod,
    agreementContext,
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

function createVariableLines({
  companyId,
  employment,
  contract,
  period,
  runType = "regular",
  hrSnapshot = null,
  agreementOverlay = null,
  timeEntries,
  leaveEntries,
  leavePayItemMappings,
  manualInputs,
  employmentTimeBase = null,
  timePlatform = null,
  state,
  warnings
}) {
  const lines = [];
  const hourlyRate = contract?.hourlyRate ?? null;
  const groupedTimeEntries = aggregateTimeEntriesByDimensions(timeEntries);

  if (contract?.salaryModelCode === "hourly_salary" && hourlyRate != null) {
    const payItem = getRequiredPayItemByCode(state, companyId, "HOURLY_SALARY");
    for (const group of groupedTimeEntries) {
      const workedHours = roundQuantity(group.workedMinutes / 60);
      const overtimeHours = roundQuantity(group.overtimeMinutes / 60);
      const baseHours = roundQuantity(Math.max(0, workedHours - overtimeHours));
      if (baseHours <= 0) {
        continue;
      }
      lines.push(
        createPayLine({
          payItem,
          employment,
          quantity: baseHours,
          unitRate: hourlyRate,
          amount: roundMoney(baseHours * hourlyRate),
          sourceType: "time_entry",
          sourceId: buildSourceSummaryId(group.timeEntryIds),
          dimensionJson: group.dimensionJson
        })
      );
    }
  }

  for (const group of groupedTimeEntries) {
    for (const definition of [
      { code: "OVERTIME", quantity: roundQuantity(group.overtimeMinutes / 60) },
      { code: "OB", quantity: roundQuantity(group.obMinutes / 60) },
      { code: "JOUR", quantity: roundQuantity(group.jourMinutes / 60) },
      { code: "STANDBY", quantity: roundQuantity(group.standbyMinutes / 60) }
    ]) {
      if (!definition.quantity) {
        continue;
      }
      const payItem = getRequiredPayItemByCode(state, companyId, definition.code);
      const configured = buildConfiguredQuantityLine({
        payItem,
        employment,
        contract,
        hrSnapshot,
        quantity: definition.quantity,
        agreementRateComponent: resolveAgreementPayItemRateComponent(agreementOverlay, definition.code),
        requireAgreementRate: Boolean(agreementOverlay),
        sourceType: "time_entry",
        sourceId: buildSourceSummaryId(group.timeEntryIds),
        dimensionJson: group.dimensionJson,
        warnings
      });
      if (configured) {
        lines.push(configured);
      }
    }
  }

  const automaticSwedishLeave = createAutomaticSwedishLeaveLines({
    companyId,
    employment,
    contract,
    period,
    hrSnapshot,
    employmentTimeBase,
    leaveEntries,
    agreementOverlay,
    timePlatform,
    state
  });
  lines.push(...automaticSwedishLeave.lines);

  const automaticVacationVariablePaySettlement = buildAutomaticSwedishVariableVacationPaySettlement({
    companyId,
    employment,
    contract,
    period,
    runType,
    employmentTimeBase,
    state
  });
  lines.push(...automaticVacationVariablePaySettlement.lines);

  const leaveGroups = aggregateLeaveEntries(
    leaveEntries.filter((entry) => !automaticSwedishLeave.handledLeaveEntryIds.has(entry.leaveEntryId))
  );
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
      hrSnapshot,
      quantity: group.quantityDays,
      unitRate: mapping.unitRate,
      rateFactor: mapping.rateFactor,
      agreementRateComponent: resolveAgreementPayItemRateComponent(agreementOverlay, payItem.payItemCode),
      requireAgreementRate: Boolean(agreementOverlay && payItem.payItemCode === "VACATION_SUPPLEMENT"),
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
    const agreementRateComponent = resolveAgreementPayItemRateComponent(agreementOverlay, payItem.payItemCode);
    if (manualInput.amount == null && manualInput.quantity != null && agreementRateComponent) {
      const configured = buildConfiguredQuantityLine({
        payItem,
        employment,
        contract,
        hrSnapshot,
        quantity: manualInput.quantity,
        unitRate: manualInput.unitRate,
        agreementRateComponent,
        requireAgreementRate: Boolean(agreementOverlay && isAgreementDrivenPayItemCode(payItem.payItemCode)),
        sourceType: manualInput.sourceType,
        sourceId: manualInput.sourceId,
        dimensionJson: manualInput.dimensionJson,
        warnings
      });
      if (configured) {
        lines.push(
          configured.sourcePeriod || configured.note
            ? {
                ...configured,
                sourcePeriod: manualInput.sourcePeriod,
                note: manualInput.note || configured.note
              }
            : configured
        );
      }
      continue;
    }
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
        note: manualInput.note,
        dimensionJson: manualInput.dimensionJson
      })
    );
  }

  const automaticPreview = {};
  if (automaticSwedishLeave.preview) {
    Object.assign(automaticPreview, automaticSwedishLeave.preview);
  }
  if (automaticVacationVariablePaySettlement.preview) {
    automaticPreview.vacationVariablePay = automaticVacationVariablePaySettlement.preview;
  }

  return {
    lines,
    automaticLeavePreview: Object.keys(automaticPreview).length > 0 ? automaticPreview : null
  };
}

function createAutomaticSwedishLeaveLines({
  companyId,
  employment,
  contract,
  period,
  hrSnapshot = null,
  employmentTimeBase = null,
  leaveEntries,
  agreementOverlay = null,
  timePlatform = null,
  state
}) {
  const handledLeaveEntryIds = new Set();
  const currentSickLeaveEntries = (leaveEntries || []).filter((entry) => entry.payrollTreatmentCode === "sick_leave");
  const currentVacationLeaveEntries = (leaveEntries || []).filter((entry) => entry.payrollTreatmentCode === "vacation");
  if (!period || (currentSickLeaveEntries.length === 0 && currentVacationLeaveEntries.length === 0)) {
    return {
      lines: [],
      handledLeaveEntryIds,
      preview: null
    };
  }

  for (const entry of currentSickLeaveEntries) {
    handledLeaveEntryIds.add(entry.leaveEntryId);
  }
  for (const entry of currentVacationLeaveEntries) {
    handledLeaveEntryIds.add(entry.leaveEntryId);
  }

  const historicalSickLeaveEntries =
    timePlatform?.listLeaveEntries
      ? timePlatform
          .listLeaveEntries({
            companyId,
            employmentId: employment.employmentId,
            status: "approved"
          })
          .filter((entry) => entry.payrollTreatmentCode === "sick_leave")
          .filter((entry) => entry.startDate <= period.endsOn)
      : currentSickLeaveEntries;

  const sickLines = currentSickLeaveEntries.length
    ? buildAutomaticSwedishSickLeaveLines({
        companyId,
        employment,
        contract,
        period,
        hrSnapshot,
        employmentTimeBase,
        leaveEntries: historicalSickLeaveEntries,
        state
      })
    : [];
  const vacationComputation = currentVacationLeaveEntries.length
    ? buildAutomaticSwedishVacationLeaveLines({
        companyId,
        employment,
        contract,
        period,
        hrSnapshot,
        employmentTimeBase,
        leaveEntries: currentVacationLeaveEntries,
        agreementOverlay,
        state
      })
    : { lines: [], preview: null };
  return {
    lines: [...sickLines, ...(vacationComputation.lines || [])],
    handledLeaveEntryIds,
    preview: {
      vacation: vacationComputation.preview || null
    }
  };
}

function buildAutomaticSwedishSickLeaveLines({
  companyId,
  employment,
  contract,
  period,
  hrSnapshot = null,
  employmentTimeBase = null,
  leaveEntries,
  state
}) {
  const scheduleAssignment = employmentTimeBase?.activeScheduleAssignment || null;
  const dayRecords = buildAutomaticSwedishSickLeaveDayRecords({
    employment,
    hrSnapshot,
    scheduleAssignment,
    leaveEntries,
    periodEndsOn: period.endsOn
  });
  if (dayRecords.length === 0) {
    return [];
  }

  const hourlyBaseRate = resolveAutomaticSwedishSickBaseHourlyRate({
    employment,
    contract,
    hrSnapshot,
    scheduleAssignment
  });
  const averageWeeklyHours = resolveAutomaticSwedishSickAverageWeeklyHours({
    employment,
    contract,
    hrSnapshot,
    scheduleAssignment
  });
  const sickPayHourlyRate = roundMoney(hourlyBaseRate * 0.8);
  const spells = buildAutomaticSwedishSickSpells({
    dayRecords,
    hrSnapshot,
    scheduleAssignment
  });
  const lines = [];
  const sickPayItem = getRequiredPayItemByCode(state, companyId, "SICK_PAY");
  const qualifyingDeductionItem = getRequiredPayItemByCode(state, companyId, "QUALIFYING_DEDUCTION");
  const sickAbsenceDeductionItem = getRequiredPayItemByCode(state, companyId, "SICK_ABSENCE_DEDUCTION");

  for (const spell of spells) {
    const qualifyingDeductionTarget = roundMoney(sickPayHourlyRate * averageWeeklyHours * 0.2);
    let remainingQualifyingDeduction = qualifyingDeductionTarget;

    for (const dayRecord of spell.days) {
      const employerPeriodDayNo = diffIsoDates(spell.startDate, dayRecord.date) + 1;
      const withinEmployerPeriod = employerPeriodDayNo <= 14;
      const absenceDeductionAmount = roundMoney(dayRecord.absenceHours * hourlyBaseRate);
      const sickPayAmount = withinEmployerPeriod ? roundMoney(dayRecord.absenceHours * sickPayHourlyRate) : 0;
      const qualifyingDeductionAmount =
        withinEmployerPeriod && remainingQualifyingDeduction > 0
          ? roundMoney(Math.min(remainingQualifyingDeduction, sickPayAmount))
          : 0;
      remainingQualifyingDeduction = roundMoney(Math.max(0, remainingQualifyingDeduction - qualifyingDeductionAmount));

      if (dayRecord.date < period.startsOn || dayRecord.date > period.endsOn) {
        continue;
      }

      const sourceId = buildAutomaticSwedishLeaveDaySourceId(dayRecord.leaveEntryIds, dayRecord.date);
      if (contract?.salaryModelCode === "monthly_salary" && absenceDeductionAmount > 0) {
        lines.push(
          createPayLine({
            payItem: sickAbsenceDeductionItem,
            employment,
            quantity: dayRecord.quantityDays,
            unitRate: resolveAutomaticSwedishLeaveDayUnitRate({
              hourlyRate: hourlyBaseRate,
              scheduledHours: dayRecord.scheduledHours,
              quantityDays: dayRecord.quantityDays,
              amount: absenceDeductionAmount
            }),
            amount: absenceDeductionAmount,
            sourceType: "leave_entry",
            sourceId,
            note: `Automatic statutory sick absence deduction for ${dayRecord.date}. Spell starts ${spell.startDate}.`
          })
        );
      }

      if (sickPayAmount > 0) {
        lines.push(
          createPayLine({
            payItem: sickPayItem,
            employment,
            quantity: dayRecord.quantityDays,
            unitRate: resolveAutomaticSwedishLeaveDayUnitRate({
              hourlyRate: sickPayHourlyRate,
              scheduledHours: dayRecord.scheduledHours,
              quantityDays: dayRecord.quantityDays,
              amount: sickPayAmount
            }),
            amount: sickPayAmount,
            sourceType: "leave_entry",
            sourceId,
            note: `Automatic statutory sick pay for ${dayRecord.date}, employer period day ${employerPeriodDayNo}.`
          })
        );
      }

      if (qualifyingDeductionAmount > 0) {
        const quantity = dayRecord.quantityDays > 0 ? dayRecord.quantityDays : 1;
        lines.push(
          createPayLine({
            payItem: qualifyingDeductionItem,
            employment,
            quantity,
            unitRate: roundMoney(qualifyingDeductionAmount / quantity),
            amount: qualifyingDeductionAmount,
            sourceType: "leave_entry",
            sourceId,
            note: `Automatic statutory qualifying deduction for sickness spell starting ${spell.startDate}.`
          })
        );
      }
    }
  }

  return lines;
}

function buildAutomaticSwedishSickLeaveDayRecords({
  employment,
  hrSnapshot = null,
  scheduleAssignment = null,
  leaveEntries,
  periodEndsOn
}) {
  const grouped = new Map();

  for (const entry of leaveEntries || []) {
    for (const leaveDay of entry.days || []) {
      if (!leaveDay?.date || leaveDay.date > periodEndsOn) {
        continue;
      }
      const scheduledHours = resolveAutomaticSwedishScheduledHoursForDate({
        workDate: leaveDay.date,
        hrSnapshot,
        scheduleAssignment
      });
      const absenceHours = resolveAutomaticSwedishSickAbsenceHours({
        employment,
        leaveDay,
        scheduledHours
      });
      if (absenceHours <= 0) {
        continue;
      }

      const current = grouped.get(leaveDay.date) || {
        date: leaveDay.date,
        leaveEntryIds: [],
        absenceHours: 0,
        scheduledHours,
        quantityDays: 0
      };
      current.leaveEntryIds.push(entry.leaveEntryId);
      current.absenceHours = roundMoney(current.absenceHours + absenceHours);
      current.scheduledHours =
        current.scheduledHours == null
          ? scheduledHours
          : Math.max(Number(current.scheduledHours || 0), Number(scheduledHours || 0));
      grouped.set(leaveDay.date, current);
    }
  }

  return [...grouped.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((dayRecord) => {
      const scheduledHours = Number(dayRecord.scheduledHours || 0);
      const cappedAbsenceHours =
        scheduledHours > 0 ? roundMoney(Math.min(dayRecord.absenceHours, scheduledHours)) : roundMoney(dayRecord.absenceHours);
      const quantityDays =
        scheduledHours > 0 ? roundQuantity(cappedAbsenceHours / scheduledHours) : roundQuantity(cappedAbsenceHours > 0 ? 1 : 0);
      return {
        ...dayRecord,
        leaveEntryIds: [...new Set(dayRecord.leaveEntryIds)].sort(),
        absenceHours: cappedAbsenceHours,
        quantityDays
      };
    });
}

function buildAutomaticSwedishSickSpells({ dayRecords, hrSnapshot = null, scheduleAssignment = null }) {
  const spells = [];
  let currentSpell = null;

  for (const dayRecord of dayRecords) {
    if (
      !currentSpell ||
      !shouldMergeAutomaticSwedishSickSpell({
        previousDate: currentSpell.days[currentSpell.days.length - 1].date,
        nextDate: dayRecord.date,
        hrSnapshot,
        scheduleAssignment
      })
    ) {
      currentSpell = {
        startDate: dayRecord.date,
        days: []
      };
      spells.push(currentSpell);
    }
    currentSpell.days.push(dayRecord);
  }

  return spells;
}

function shouldMergeAutomaticSwedishSickSpell({ previousDate, nextDate, hrSnapshot = null, scheduleAssignment = null }) {
  if (nextDate <= addIsoDays(previousDate, 1)) {
    return true;
  }

  let cursor = addIsoDays(previousDate, 1);
  while (cursor < nextDate) {
    if (Number(resolveAutomaticSwedishScheduledHoursForDate({ workDate: cursor, hrSnapshot, scheduleAssignment }) || 0) > 0) {
      return false;
    }
    cursor = addIsoDays(cursor, 1);
  }
  return true;
}

function resolveAutomaticSwedishSickBaseHourlyRate({ employment, contract, hrSnapshot = null, scheduleAssignment = null }) {
  if (contract?.hourlyRate != null) {
    return roundMoney(contract.hourlyRate);
  }
  if (contract?.monthlySalary == null) {
    throw createError(
      409,
      "statutory_sick_pay_basis_missing",
      `Automatic statutory sick pay requires hourlyRate or monthlySalary for ${employment.employmentNo}.`
    );
  }

  const ordinaryHoursPerMonth = Number(hrSnapshot?.activeSalaryBasis?.ordinaryHoursPerMonth || 0);
  if (ordinaryHoursPerMonth > 0) {
    return roundMoney(contract.monthlySalary / ordinaryHoursPerMonth);
  }

  const averageWeeklyHours = resolveAutomaticSwedishSickAverageWeeklyHours({
    employment,
    contract,
    hrSnapshot,
    scheduleAssignment
  });
  if (averageWeeklyHours > 0) {
    return roundMoney((contract.monthlySalary * 12) / (52 * averageWeeklyHours));
  }

  throw createError(
    409,
    "statutory_sick_pay_basis_missing",
    `Automatic statutory sick pay could not derive an hourly basis for ${employment.employmentNo}.`
  );
}

function resolveAutomaticSwedishSickAverageWeeklyHours({ employment, contract, hrSnapshot = null, scheduleAssignment = null }) {
  const standardWeeklyHours = Number(hrSnapshot?.activeSalaryBasis?.standardWeeklyHours || 0);
  if (standardWeeklyHours > 0) {
    return roundMoney(standardWeeklyHours);
  }

  const ordinaryHoursPerMonth = Number(hrSnapshot?.activeSalaryBasis?.ordinaryHoursPerMonth || 0);
  if (ordinaryHoursPerMonth > 0) {
    return roundMoney((ordinaryHoursPerMonth * 12) / 52);
  }

  const scheduledWeeklyHours = resolveAutomaticSwedishScheduledWeeklyHours(scheduleAssignment);
  if (scheduledWeeklyHours > 0) {
    return scheduledWeeklyHours;
  }

  throw createError(
    409,
    "statutory_sick_pay_weekly_hours_missing",
    `Automatic statutory sick pay requires standard weekly hours or a schedule for ${employment.employmentNo}.`
  );
}

function resolveAutomaticSwedishSickAbsenceHours({ employment, leaveDay, scheduledHours }) {
  if (leaveDay.extentHours != null) {
    return roundMoney(leaveDay.extentHours);
  }
  if (leaveDay.extentPercent == null) {
    return 0;
  }
  if (scheduledHours == null) {
    throw createError(
      409,
      "statutory_sick_pay_schedule_missing",
      `Automatic statutory sick pay requires scheduled hours for ${employment.employmentNo} on ${leaveDay.date}.`
    );
  }
  if (scheduledHours <= 0) {
    return 0;
  }
  return roundMoney((scheduledHours * leaveDay.extentPercent) / 100);
}

function resolveAutomaticSwedishScheduledHoursForDate({ workDate, hrSnapshot = null, scheduleAssignment = null }) {
  const scheduleDay = getAutomaticSwedishScheduleDayForDate(scheduleAssignment?.template || null, workDate);
  if (scheduleDay) {
    return roundMoney(Number(scheduleDay.plannedMinutes || 0) / 60);
  }
  if (scheduleAssignment?.template) {
    return 0;
  }

  const standardWeeklyHours = Number(hrSnapshot?.activeSalaryBasis?.standardWeeklyHours || 0);
  if (standardWeeklyHours > 0) {
    return weekdayFromIsoDate(workDate) <= 5 ? roundMoney(standardWeeklyHours / 5) : 0;
  }

  return null;
}

function resolveAutomaticSwedishScheduledWeeklyHours(scheduleAssignment = null) {
  const days = scheduleAssignment?.template?.days;
  if (!Array.isArray(days) || days.length === 0) {
    return 0;
  }
  return roundMoney(days.reduce((sum, day) => sum + Number(day?.plannedMinutes || 0), 0) / 60);
}

function resolveAutomaticSwedishVacationWorkingDaysPerWeek(scheduleAssignment = null) {
  const days = scheduleAssignment?.template?.days;
  if (!Array.isArray(days) || days.length === 0) {
    return 5;
  }
  const workingDaysPerWeek = days.filter((day) => Number(day?.plannedMinutes || 0) > 0).length;
  return workingDaysPerWeek > 0 ? workingDaysPerWeek : 5;
}

function resolveAutomaticSwedishVacationMonthlySalaryLiabilityDayAmount({
  contract,
  scheduleAssignment = null
} = {}) {
  if (contract?.monthlySalary == null) {
    return 0;
  }
  const workingDaysPerWeek = resolveAutomaticSwedishVacationWorkingDaysPerWeek(scheduleAssignment);
  return roundMoney((contract.monthlySalary * 12) / (52 * workingDaysPerWeek));
}

function resolveAutomaticSwedishLeaveDayUnitRate({ hourlyRate, scheduledHours, quantityDays, amount }) {
  if (scheduledHours > 0) {
    return roundMoney(hourlyRate * scheduledHours);
  }
  if (quantityDays > 0) {
    return roundMoney(amount / quantityDays);
  }
  return roundMoney(amount);
}

function buildAutomaticSwedishVacationLeaveLines({
  companyId,
  employment,
  contract,
  period,
  hrSnapshot = null,
  employmentTimeBase = null,
  leaveEntries,
  agreementOverlay = null,
  state
}) {
  const vacationBalance = employmentTimeBase?.vacationBalance || null;
  if (!vacationBalance) {
    throw createError(
      409,
      "statutory_vacation_balance_missing",
      `Automatic statutory vacation requires a vacation balance profile for ${employment.employmentNo}.`
    );
  }
  const ruleSelection = buildAutomaticSwedishVacationRuleSelection({
    state,
    companyId,
    employment,
    contract,
    vacationBalance
  });
  if (!ruleSelection.ruleCode) {
    throw createError(
      409,
      "statutory_vacation_salary_model_unsupported",
      `Automatic statutory vacation requires a supported salary model for ${employment.employmentNo}.`
    );
  }

  const dayRecords = buildAutomaticSwedishVacationLeaveDayRecords({
    employment,
    hrSnapshot,
    scheduleAssignment: employmentTimeBase?.activeScheduleAssignment || null,
    leaveEntries,
    periodStartsOn: period.startsOn,
    periodEndsOn: period.endsOn
  });
  if (dayRecords.length === 0) {
    return {
      lines: [],
      preview: null
    };
  }

  const allocations = allocateAutomaticSwedishVacationDays({
    employment,
    dayRecords,
    vacationBalance
  });
  if (allocations.some((allocation) => allocation.balanceBucket === "unpaid")) {
    throw createError(
      409,
      "statutory_vacation_balance_insufficient",
      `Automatic statutory vacation exceeds the available paid and saved vacation balance for ${employment.employmentNo}.`
    );
  }

  const paidDaysUsed = roundQuantity(
    allocations
      .filter((allocation) => allocation.balanceBucket === "paid")
      .reduce((sum, allocation) => sum + Number(allocation.quantityDays || 0), 0)
  );
  const savedDaysUsed = roundQuantity(
    allocations
      .filter((allocation) => allocation.balanceBucket === "saved")
      .reduce((sum, allocation) => sum + Number(allocation.quantityDays || 0), 0)
  );
  const previewBase = {
    ruleCode: ruleSelection.ruleCode,
    ruleReasonCode: ruleSelection.reasonCode,
    requestedDays: roundQuantity(dayRecords.reduce((sum, record) => sum + Number(record.quantityDays || 0), 0)),
    paidDaysAvailable: roundQuantity(vacationBalance.paidDays || 0),
    savedDaysAvailable: roundQuantity(vacationBalance.savedDays || 0),
    paidDaysUsed,
    savedDaysUsed,
    remainingPaidDays: roundQuantity(Number(vacationBalance.paidDays || 0) - paidDaysUsed),
    remainingSavedDays: roundQuantity(Number(vacationBalance.savedDays || 0) - savedDaysUsed),
    vacationYearStartDate: vacationBalance.vacationYearStartDate || null,
    vacationYearEndDate: vacationBalance.vacationYearEndDate || null,
    allocations: allocations.map((allocation) => ({
      date: allocation.date,
      quantityDays: allocation.quantityDays,
      balanceBucket: allocation.balanceBucket,
      sourceId: allocation.sourceId,
      leaveEntryIds: allocation.leaveEntryIds
    }))
  };

  if (ruleSelection.ruleCode === "sammaloneregeln") {
    const supplementPayItem = getRequiredPayItemByCode(state, companyId, "VACATION_SUPPLEMENT");
    const supplementUnitRate = resolveAutomaticSwedishVacationSupplementUnitRate({
      companyId,
      employment,
      contract,
      hrSnapshot,
      agreementOverlay,
      state
    });
    return {
      lines: allocations.map((allocation) =>
        createPayLine({
          payItem: supplementPayItem,
          employment,
          quantity: allocation.quantityDays,
          unitRate: supplementUnitRate,
          amount: roundMoney(supplementUnitRate * allocation.quantityDays),
          sourceType: "leave_entry",
          sourceId: allocation.sourceId,
          note: `Automatic statutory vacation supplement for ${allocation.date} (${allocation.balanceBucket} vacation day).`
        })
      ),
      preview: {
        ...previewBase,
        supplementUnitRate,
        supplementRateSource:
          agreementOverlay?.rateComponents?.payItemRates?.VACATION_SUPPLEMENT?.autoGenerate === true
            ? "agreement_overlay_auto"
            : "statutory_0_43_percent",
        variableVacationBasisAmount: ruleSelection.variableVacationPayBasisAmount,
        totalVacationBasisAmount: ruleSelection.totalVacationPayBasisAmount,
        variableSharePercent: ruleSelection.variableSharePercent,
        earningYearStartDate: ruleSelection.earningYearStartDate,
        earningYearEndDate: ruleSelection.earningYearEndDate
      }
    };
  }

  const percentageRuleModel = buildAutomaticSwedishPercentageVacationPayModel({
    state,
    companyId,
    employment,
    allocations,
    ruleSelection
  });

  return {
    lines: percentageRuleModel.lines,
    preview: {
      ...previewBase,
      earningYearStartDate: percentageRuleModel.earningYearStartDate,
      earningYearEndDate: percentageRuleModel.earningYearEndDate,
      vacationEntitlementDays: percentageRuleModel.vacationEntitlementDays,
      vacationPayBasisAmount: percentageRuleModel.vacationPayBasisAmount,
      vacationPayPercent: percentageRuleModel.vacationPayPercent,
      vacationPayTotalAmount: percentageRuleModel.vacationPayTotalAmount,
      vacationPayPerDayAmount: percentageRuleModel.vacationPayPerDayAmount,
      vacationPayBasisSource: "approved_pay_runs",
      basisPayRunIds: percentageRuleModel.basisPayRunIds,
      variableVacationBasisAmount: ruleSelection.variableVacationPayBasisAmount,
      variableSharePercent: ruleSelection.variableSharePercent
    }
  };
}

function resolveAutomaticSwedishVacationRuleCode({ state, companyId, employment, contract, vacationBalance } = {}) {
  return buildAutomaticSwedishVacationRuleSelection({
    state,
    companyId,
    employment,
    contract,
    vacationBalance
  }).ruleCode;
}

function buildAutomaticSwedishVacationRuleSelection({
  state,
  companyId,
  employment,
  contract,
  vacationBalance
} = {}) {
  if (contract?.salaryModelCode === "monthly_salary" && contract?.monthlySalary != null) {
    const earningYearStartDate = vacationBalance?.vacationYearStartDate
      ? shiftIsoDateByYears(vacationBalance.vacationYearStartDate, -1)
      : null;
    const earningYearEndDate = vacationBalance?.vacationYearStartDate
      ? shiftIsoDateByDays(vacationBalance.vacationYearStartDate, -1)
      : null;
    const basisModel =
      earningYearStartDate && earningYearEndDate
        ? buildAutomaticSwedishVacationPayBasisModel({
            state,
            companyId,
            employmentId: employment?.employmentId,
            earningYearStartDate,
            earningYearEndDate
          })
        : {
            totalVacationPayBasisAmount: 0,
            variableVacationPayBasisAmount: 0,
            basisPayRunIds: [],
            variableBasisPayRunIds: []
          };
    const totalVacationPayBasisAmount = roundMoney(basisModel.totalVacationPayBasisAmount || 0);
    const variableVacationPayBasisAmount = roundMoney(basisModel.variableVacationPayBasisAmount || 0);
    const variableSharePercent =
      totalVacationPayBasisAmount > 0
        ? roundMoney((variableVacationPayBasisAmount / totalVacationPayBasisAmount) * 100)
        : 0;

    if (totalVacationPayBasisAmount > 0 && variableVacationPayBasisAmount >= roundMoney(totalVacationPayBasisAmount * 0.1)) {
      return {
        ruleCode: "procentregeln",
        reasonCode: "monthly_variable_share_threshold",
        earningYearStartDate,
        earningYearEndDate,
        totalVacationPayBasisAmount,
        variableVacationPayBasisAmount,
        variableSharePercent,
        basisPayRunIds: basisModel.basisPayRunIds,
        variableBasisPayRunIds: basisModel.variableBasisPayRunIds
      };
    }
    return {
      ruleCode: "sammaloneregeln",
      reasonCode: "monthly_salary_fixed",
      earningYearStartDate,
      earningYearEndDate,
      totalVacationPayBasisAmount,
      variableVacationPayBasisAmount,
      variableSharePercent,
      basisPayRunIds: basisModel.basisPayRunIds,
      variableBasisPayRunIds: basisModel.variableBasisPayRunIds
    };
  }
  if (contract?.salaryModelCode === "hourly_salary" && contract?.hourlyRate != null) {
    const earningYearStartDate = vacationBalance?.vacationYearStartDate
      ? shiftIsoDateByYears(vacationBalance.vacationYearStartDate, -1)
      : null;
    const earningYearEndDate = vacationBalance?.vacationYearStartDate
      ? shiftIsoDateByDays(vacationBalance.vacationYearStartDate, -1)
      : null;
    const basisModel =
      earningYearStartDate && earningYearEndDate
        ? buildAutomaticSwedishVacationPayBasisModel({
            state,
            companyId,
            employmentId: employment?.employmentId,
            earningYearStartDate,
            earningYearEndDate
          })
        : {
            totalVacationPayBasisAmount: 0,
            variableVacationPayBasisAmount: 0,
            basisPayRunIds: [],
            variableBasisPayRunIds: []
          };
    return {
      ruleCode: "procentregeln",
      reasonCode: "hourly_salary",
      earningYearStartDate,
      earningYearEndDate,
      totalVacationPayBasisAmount: roundMoney(basisModel.totalVacationPayBasisAmount || 0),
      variableVacationPayBasisAmount: roundMoney(basisModel.variableVacationPayBasisAmount || 0),
      variableSharePercent: 100,
      basisPayRunIds: basisModel.basisPayRunIds,
      variableBasisPayRunIds: basisModel.variableBasisPayRunIds
    };
  }
  return {
    ruleCode: null,
    reasonCode: null,
    earningYearStartDate: null,
    earningYearEndDate: null,
    totalVacationPayBasisAmount: 0,
    variableVacationPayBasisAmount: 0,
    variableSharePercent: 0,
    basisPayRunIds: [],
    variableBasisPayRunIds: []
  };
}

function buildAutomaticSwedishPercentageVacationPayModel({
  state,
  companyId,
  employment,
  allocations,
  ruleSelection
}) {
  const vacationEntitlementDays = resolveAutomaticSwedishVacationEntitlementDays();
  const vacationPayPercent = resolveAutomaticSwedishVacationPayPercent(vacationEntitlementDays);
  const vacationPayBasisAmount = roundMoney(ruleSelection?.totalVacationPayBasisAmount || 0);
  const vacationPayTotalAmount = roundMoney((vacationPayBasisAmount * vacationPayPercent) / 100);
  const vacationPayPerDayAmount =
    vacationEntitlementDays > 0 ? roundMoney(vacationPayTotalAmount / vacationEntitlementDays) : 0;
  const vacationPayItem = getRequiredPayItemByCode(state, companyId, "VACATION_PAY");

  return {
    earningYearStartDate: ruleSelection?.earningYearStartDate || null,
    earningYearEndDate: ruleSelection?.earningYearEndDate || null,
    vacationEntitlementDays,
    vacationPayBasisAmount,
    vacationPayPercent,
    vacationPayTotalAmount,
    vacationPayPerDayAmount,
    basisPayRunIds: ruleSelection?.basisPayRunIds || [],
    lines: allocations.map((allocation) =>
      createPayLine({
        payItem: vacationPayItem,
        employment,
        quantity: allocation.quantityDays,
        unitRate: vacationPayPerDayAmount,
        amount: roundMoney(vacationPayPerDayAmount * allocation.quantityDays),
        sourceType: "leave_entry",
        sourceId: allocation.sourceId,
        note: `Automatic statutory vacation pay for ${allocation.date} (${allocation.balanceBucket} vacation day).`
      })
    )
  };
}

function buildAutomaticSwedishVacationPayBasisModel({
  state,
  companyId,
  employmentId,
  earningYearStartDate,
  earningYearEndDate
}) {
  let totalVacationPayBasisAmount = 0;
  let variableVacationPayBasisAmount = 0;
  const basisPayRunIds = [];
  const variableBasisPayRunIds = [];

  for (const payRunId of state.payRunIdsByCompany.get(companyId) || []) {
    const payRun = state.payRuns.get(payRunId);
    if (!payRun || payRun.status !== "approved" || !payRun.payDate) {
      continue;
    }
    if (payRun.payDate < earningYearStartDate || payRun.payDate > earningYearEndDate) {
      continue;
    }
    let payRunContributed = false;
    for (const lineId of state.payRunLineIdsByRun.get(payRun.payRunId) || []) {
      const line = state.payRunLines.get(lineId);
      if (!line || line.employmentId !== employmentId || !countsTowardAutomaticSwedishVacationPayBasis(line)) {
        continue;
      }
      const lineAmount = roundMoney(Math.max(0, directionalAmount(line)));
      totalVacationPayBasisAmount = roundMoney(totalVacationPayBasisAmount + lineAmount);
      payRunContributed = true;
      if (isAutomaticSwedishVariableVacationBasisLine(line)) {
        variableVacationPayBasisAmount = roundMoney(variableVacationPayBasisAmount + lineAmount);
        variableBasisPayRunIds.push(payRun.payRunId);
      }
    }
    if (payRunContributed) {
      basisPayRunIds.push(payRun.payRunId);
    }
  }

  return {
    totalVacationPayBasisAmount,
    variableVacationPayBasisAmount,
    basisPayRunIds: [...new Set(basisPayRunIds)].sort(),
    variableBasisPayRunIds: [...new Set(variableBasisPayRunIds)].sort()
  };
}

function countsTowardAutomaticSwedishVacationPayBasis(line) {
  if (!line || line.compensationBucket !== "gross_addition" || line.affectsVacationBasis !== true) {
    return false;
  }
  if (line.agiMappingCode !== "cash_compensation" || line.taxTreatmentCode !== "taxable") {
    return false;
  }
  return !["VACATION_PAY", "VACATION_SUPPLEMENT", "SICK_PAY", "FINAL_PAY"].includes(line.payItemCode);
}

function isAutomaticSwedishVariableVacationBasisLine(line) {
  return ["OVERTIME", "ADDITIONAL_TIME", "OB", "JOUR", "STANDBY", "BONUS", "COMMISSION"].includes(line?.payItemCode);
}

function resolveAutomaticSwedishVacationEntitlementDays() {
  return 25;
}

function resolveAutomaticSwedishVacationPayPercent(vacationEntitlementDays) {
  const extraDays = Math.max(0, Number(vacationEntitlementDays || 0) - 25);
  return roundMoney(12 + extraDays * 0.48);
}

function shiftIsoDateByYears(value, yearDelta) {
  const date = new Date(`${normalizeRequiredDate(value, "automatic_vacation_reference_date_required")}T12:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + yearDelta);
  return date.toISOString().slice(0, 10);
}

function shiftIsoDateByDays(value, dayDelta) {
  const date = new Date(`${normalizeRequiredDate(value, "automatic_vacation_reference_date_required")}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

function shiftIsoDateByMonths(value, monthDelta) {
  const date = new Date(`${normalizeRequiredDate(value, "automatic_vacation_reference_date_required")}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + monthDelta);
  return date.toISOString().slice(0, 10);
}

function buildAutomaticSwedishVariableVacationPaySettlement({
  companyId,
  employment,
  contract,
  period,
  runType = "regular",
  employmentTimeBase = null,
  state
}) {
  if (runType !== "regular") {
    return {
      lines: [],
      preview: null
    };
  }
  const vacationBalance = employmentTimeBase?.vacationBalance || null;
  if (!vacationBalance || !period?.payDate || period.payDate < vacationBalance.vacationYearStartDate) {
    return {
      lines: [],
      preview: null
    };
  }
  const ruleSelection = buildAutomaticSwedishVacationRuleSelection({
    state,
    companyId,
    employment,
    contract,
    vacationBalance
  });
  if (ruleSelection.ruleCode !== "sammaloneregeln") {
    return {
      lines: [],
      preview: null
    };
  }

  const earningYearStartDate = ruleSelection.earningYearStartDate;
  const earningYearEndDate = ruleSelection.earningYearEndDate;
  const variableVacationPayBasisAmount = roundMoney(ruleSelection.variableVacationPayBasisAmount || 0);
  if (!earningYearStartDate || !earningYearEndDate || variableVacationPayBasisAmount <= 0) {
    return {
      lines: [],
      preview: null
    };
  }

  const settlementSourceId = buildAutomaticSwedishVariableVacationSettlementSourceId({
    employmentId: employment.employmentId,
    earningYearStartDate,
    earningYearEndDate
  });
  if (
    hasApprovedAutomaticSwedishVariableVacationSettlement({
      state,
      companyId,
      employmentId: employment.employmentId,
      settlementSourceId
    })
  ) {
    return {
      lines: [],
      preview: null
    };
  }

  const variableVacationPayPercent = 12;
  const variableVacationPayAmount = roundMoney((variableVacationPayBasisAmount * variableVacationPayPercent) / 100);
  if (variableVacationPayAmount <= 0) {
    return {
      lines: [],
      preview: null
    };
  }

  const vacationPayItem = getRequiredPayItemByCode(state, companyId, "VACATION_PAY");
  return {
    lines: [
      createPayLine({
        payItem: vacationPayItem,
        employment,
        quantity: 1,
        unitRate: variableVacationPayAmount,
        amount: variableVacationPayAmount,
        sourceType: "vacation_year_settlement",
        sourceId: settlementSourceId,
        note: `Automatic statutory vacation pay settlement for variable pay earned ${earningYearStartDate} to ${earningYearEndDate}.`
      })
    ],
    preview: {
      ruleCode: "sammaloneregeln",
      earningYearStartDate,
      earningYearEndDate,
      variableVacationPayBasisAmount,
      variableVacationPayPercent,
      variableVacationPayAmount,
      totalVacationBasisAmount: ruleSelection.totalVacationPayBasisAmount,
      variableSharePercent: ruleSelection.variableSharePercent,
      settlementSourceId,
      settlementDueDate: shiftIsoDateByDays(shiftIsoDateByMonths(shiftIsoDateByDays(earningYearEndDate, 1), 1), -1),
      basisPayRunIds: ruleSelection.variableBasisPayRunIds || []
    }
  };
}

function buildAutomaticSwedishVariableVacationSettlementSourceId({
  employmentId,
  earningYearStartDate,
  earningYearEndDate
} = {}) {
  return buildSnapshotHash({
    settlementType: "automatic_vacation_variable_pay",
    employmentId,
    earningYearStartDate,
    earningYearEndDate
  });
}

function hasApprovedAutomaticSwedishVariableVacationSettlement({ state, companyId, employmentId, settlementSourceId } = {}) {
  for (const payRunId of state.payRunIdsByCompany.get(companyId) || []) {
    const payRun = state.payRuns.get(payRunId);
    if (!payRun || payRun.status !== "approved") {
      continue;
    }
    for (const lineId of state.payRunLineIdsByRun.get(payRun.payRunId) || []) {
      const line = state.payRunLines.get(lineId);
      if (
        line &&
        line.employmentId === employmentId &&
        line.payItemCode === "VACATION_PAY" &&
        line.sourceType === "vacation_year_settlement" &&
        line.sourceId === settlementSourceId
      ) {
        return true;
      }
    }
  }
  return false;
}

function buildAutomaticSwedishVacationLeaveDayRecords({
  employment,
  hrSnapshot = null,
  scheduleAssignment = null,
  leaveEntries,
  periodStartsOn,
  periodEndsOn
}) {
  const grouped = new Map();

  for (const entry of leaveEntries || []) {
    for (const leaveDay of entry.days || []) {
      if (!leaveDay?.date || leaveDay.date < periodStartsOn || leaveDay.date > periodEndsOn) {
        continue;
      }
      const scheduledHours = resolveAutomaticSwedishScheduledHoursForDate({
        workDate: leaveDay.date,
        hrSnapshot,
        scheduleAssignment
      });
      const absenceHours = resolveAutomaticSwedishVacationAbsenceHours({
        employment,
        leaveDay,
        scheduledHours
      });
      if (absenceHours <= 0) {
        continue;
      }

      const current = grouped.get(leaveDay.date) || {
        date: leaveDay.date,
        leaveEntryIds: [],
        absenceHours: 0,
        scheduledHours,
        quantityDays: 0
      };
      current.leaveEntryIds.push(entry.leaveEntryId);
      current.absenceHours = roundMoney(current.absenceHours + absenceHours);
      current.scheduledHours =
        current.scheduledHours == null
          ? scheduledHours
          : Math.max(Number(current.scheduledHours || 0), Number(scheduledHours || 0));
      grouped.set(leaveDay.date, current);
    }
  }

  return [...grouped.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((dayRecord) => {
      const scheduledHours = Number(dayRecord.scheduledHours || 0);
      const cappedAbsenceHours =
        scheduledHours > 0 ? roundMoney(Math.min(dayRecord.absenceHours, scheduledHours)) : roundMoney(dayRecord.absenceHours);
      const quantityDays =
        scheduledHours > 0 ? roundQuantity(cappedAbsenceHours / scheduledHours) : roundQuantity(cappedAbsenceHours > 0 ? 1 : 0);
      return {
        ...dayRecord,
        leaveEntryIds: [...new Set(dayRecord.leaveEntryIds)].sort(),
        absenceHours: cappedAbsenceHours,
        quantityDays
      };
    })
    .filter((dayRecord) => dayRecord.quantityDays > 0);
}

function resolveAutomaticSwedishVacationAbsenceHours({ employment, leaveDay, scheduledHours }) {
  if (leaveDay.extentHours != null) {
    return roundMoney(leaveDay.extentHours);
  }
  if (leaveDay.extentPercent == null) {
    return 0;
  }
  if (scheduledHours == null) {
    throw createError(
      409,
      "statutory_vacation_schedule_missing",
      `Automatic statutory vacation requires scheduled hours for ${employment.employmentNo} on ${leaveDay.date}.`
    );
  }
  if (scheduledHours <= 0) {
    return 0;
  }
  return roundMoney((scheduledHours * leaveDay.extentPercent) / 100);
}

function allocateAutomaticSwedishVacationDays({ employment, dayRecords, vacationBalance }) {
  let remainingPaidDays = roundQuantity(vacationBalance?.paidDays || 0);
  let remainingSavedDays = roundQuantity(vacationBalance?.savedDays || 0);
  const allocations = [];

  for (const dayRecord of dayRecords) {
    let remainingDayQuantity = roundQuantity(dayRecord.quantityDays || 0);
    if (remainingDayQuantity <= 0) {
      continue;
    }
    for (const bucket of ["paid", "saved"]) {
      const remainingBucketQuantity = bucket === "paid" ? remainingPaidDays : remainingSavedDays;
      if (remainingDayQuantity <= 0 || remainingBucketQuantity <= 0) {
        continue;
      }
      const consumedQuantity = roundQuantity(Math.min(remainingDayQuantity, remainingBucketQuantity));
      if (consumedQuantity <= 0) {
        continue;
      }
      allocations.push({
        date: dayRecord.date,
        leaveEntryIds: dayRecord.leaveEntryIds,
        quantityDays: consumedQuantity,
        balanceBucket: bucket,
        sourceId: buildAutomaticSwedishLeaveDaySourceId(dayRecord.leaveEntryIds, dayRecord.date)
      });
      remainingDayQuantity = roundQuantity(remainingDayQuantity - consumedQuantity);
      if (bucket === "paid") {
        remainingPaidDays = roundQuantity(remainingPaidDays - consumedQuantity);
      } else {
        remainingSavedDays = roundQuantity(remainingSavedDays - consumedQuantity);
      }
    }
    if (remainingDayQuantity > 0) {
      allocations.push({
        date: dayRecord.date,
        leaveEntryIds: dayRecord.leaveEntryIds,
        quantityDays: remainingDayQuantity,
        balanceBucket: "unpaid",
        sourceId: buildAutomaticSwedishLeaveDaySourceId(dayRecord.leaveEntryIds, dayRecord.date)
      });
    }
  }

  return allocations;
}

function resolveAutomaticSwedishVacationSupplementUnitRate({
  companyId,
  employment,
  contract,
  hrSnapshot = null,
  agreementOverlay = null,
  state
}) {
  const payItem = getRequiredPayItemByCode(state, companyId, "VACATION_SUPPLEMENT");
  const agreementRateComponent = normalizeAgreementRateComponent(
    resolveAgreementPayItemRateComponent(agreementOverlay, payItem.payItemCode),
    payItem.payItemCode
  );
  if (agreementRateComponent?.autoGenerate === true) {
    const configured = buildConfiguredQuantityLine({
      payItem,
      employment,
      contract,
      hrSnapshot,
      quantity: 1,
      agreementRateComponent,
      sourceType: "leave_entry",
      sourceId: "automatic_vacation_supplement",
      warnings: []
    });
    if (configured?.unitRate != null && configured.calculationStatus !== "rate_required") {
      return roundMoney(configured.unitRate);
    }
  }
  return roundMoney(Number(contract.monthlySalary || 0) * 0.0043);
}

function buildAutomaticSwedishLeaveDaySourceId(leaveEntryIds, workDate) {
  return buildSnapshotHash({
    leaveEntryIds: [...(leaveEntryIds || [])].filter(Boolean).sort(),
    workDate
  });
}

function getAutomaticSwedishScheduleDayForDate(template, workDate) {
  if (!template || !Array.isArray(template.days)) {
    return null;
  }
  const weekday = weekdayFromIsoDate(workDate);
  return template.days.find((candidate) => candidate.weekday === weekday) || null;
}

function weekdayFromIsoDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  const weekday = date.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function addIsoDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffIsoDates(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
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
        note: adjustment.note || `Retro correction for ${adjustment.originalPeriod}.`,
        dimensionJson: adjustment.dimensionJson
      })
    );
  }
  return lines;
}

function createFinalPayLines({ companyId, employment, finalPayAdjustments, employmentTimeBase = null, state }) {
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
          note: adjustment.note || "Final pay settlement.",
          dimensionJson: adjustment.dimensionJson
        })
      );
    }
    if (adjustment.remainingVacationSettlementAmount != null) {
      const payItem = requirePayItemByCode(state, companyId, "VACATION_PAY");
      const resolvedVacationDays = resolveFinalPayVacationDays({
        adjustment,
        employmentTimeBase
      });
      grossAdditions.push(
        createPayLine({
          payItem,
          employment,
          quantity: resolvedVacationDays,
          amount: adjustment.remainingVacationSettlementAmount,
          sourceType: "final_pay",
          sourceId: adjustment.terminationDate,
          note: "Remaining vacation settlement.",
          dimensionJson: adjustment.dimensionJson
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
          note: "Advance vacation recovery.",
          dimensionJson: adjustment.dimensionJson
        })
      );
    }
  }
  return { grossAdditions, grossDeductions, netDeductions };
}

function resolveFinalPayVacationDays({ adjustment, employmentTimeBase = null } = {}) {
  const explicitDays = adjustment?.remainingVacationDays;
  if (explicitDays != null) {
    return explicitDays;
  }
  const balanceDays = employmentTimeBase?.vacationBalance?.totalDays;
  if (balanceDays != null && Number(balanceDays) > 0) {
    return roundQuantity(balanceDays);
  }
  return 1;
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
        note: input.note,
        dimensionJson: input.dimensionJson,
        processingStep
      });
    });
}

function buildTaxPreview({
  rules,
  taxableBase,
  payDate,
  employee,
  employmentContract = null,
  statutoryProfile,
  taxDecisionSnapshot = null,
  executionBoundary = null,
  warnings
}) {
  const resolvedPayDate = normalizeRequiredDate(payDate, "pay_run_pay_date_invalid");
  const rulePack = rules.resolveRulePack({
    rulePackCode: PAYROLL_TAX_RULE_PACK_CODE,
    domain: "payroll",
    jurisdiction: "SE",
    effectiveDate: resolvedPayDate
  });
  const normalizedTaxableBase = roundMoney(Math.max(0, taxableBase || 0));
  const effectiveTaxContext = resolveEffectiveTaxDecisionContext({
    taxDecisionSnapshot,
    statutoryProfile,
    effectiveDate: resolvedPayDate,
    rulePack
  });
  assertTaxDecisionSourceAllowedForExecutionBoundary({
    effectiveTaxContext,
    executionBoundary
  });
  const decisionObjectBase = {
    inputs_hash: buildSnapshotHash({
      taxableBase: normalizedTaxableBase,
      payDate: resolvedPayDate,
      employeeId: employee?.employeeId || null,
      taxDecisionSnapshot: taxDecisionSnapshot || null,
      statutoryProfile: statutoryProfile || null,
      effectiveTaxContext
    }),
    rule_pack_id: rulePack.rulePackId,
    rule_pack_code: rulePack.rulePackCode,
    rule_pack_version: rulePack.version,
    rule_pack_checksum: rulePack.checksum,
    effective_date: resolvedPayDate,
    warnings: [],
    outputs: {
      taxableBase: normalizedTaxableBase
    }
  };

  if (!effectiveTaxContext || effectiveTaxContext.decisionType === "pending") {
    warnings.push(
      createWarning(
        "payroll_tax_profile_missing",
        "Preliminary tax requires an approved tax decision snapshot or compatible statutory fallback."
      )
    );
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

  if (effectiveTaxContext.sourceType === "tax_decision_snapshot") {
    const taxTableLookup = resolveOfficialTaxTableLookupForDecisionSnapshot({
      taxDecisionSnapshot: effectiveTaxContext,
      taxableBase: normalizedTaxableBase
    });
    const oneTimeTaxLookup = resolveOfficialOneTimeTaxLookupForDecisionSnapshot({
      taxDecisionSnapshot: effectiveTaxContext,
      taxableBase: normalizedTaxableBase,
      employmentContract
    });
    if (effectiveTaxContext.status !== "approved") {
      warnings.push(createWarning("tax_decision_snapshot_not_approved", "Tax decision snapshot must be approved before payroll calculation."));
      const decisionObject = {
        ...decisionObjectBase,
        decision_code: "PAYROLL_TAX_DECISION_NOT_APPROVED",
        outputs: {
          ...decisionObjectBase.outputs,
          preliminaryTax: null,
          taxFieldCode: "preliminary_tax",
          status: "pending"
        },
        warnings: ["tax_decision_snapshot_not_approved"],
        explanation: ["Approved TaxDecisionSnapshot is required before payroll calculation."]
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
    const snapshotAmount = resolveTaxDecisionSnapshotAmount({
      taxDecisionSnapshot: effectiveTaxContext,
      taxableBase: normalizedTaxableBase,
      sinkDefaults: rulePack.machineReadableRules?.sink || {},
      aSinkDefaults: rulePack.machineReadableRules?.aSink || {},
      taxTableLookup,
      oneTimeTaxLookup
    });
    if (snapshotAmount == null) {
      warnings.push(createWarning("tax_decision_snapshot_incomplete", "Tax decision snapshot could not resolve a withholding amount."));
      const taxFieldCode = resolveTaxFieldCodeForDecisionType(effectiveTaxContext.decisionType);
      const decisionObject = {
        ...decisionObjectBase,
        decision_code: "PAYROLL_TAX_DECISION_INCOMPLETE",
        outputs: {
          ...decisionObjectBase.outputs,
          preliminaryTax: null,
          taxFieldCode,
          status: "pending"
        },
        warnings: ["tax_decision_snapshot_incomplete"],
        explanation: [
          `decisionType=${effectiveTaxContext.decisionType}`,
          "The snapshot did not carry enough withholding instructions for this payroll calculation."
        ]
      };
      return {
        amount: null,
        status: "pending",
        taxFieldCode,
        decisionObject,
        step: createPendingStep(11, {
          status: "pending",
          taxableBase: normalizedTaxableBase,
          decisionObject
        })
      };
    }
    const taxFieldCode = resolveTaxFieldCodeForDecisionType(effectiveTaxContext.decisionType);
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: resolveTaxDecisionCode({
        decisionType: effectiveTaxContext.decisionType,
        sinkSeaIncome: effectiveTaxContext.sinkSeaIncome === true
      }),
      outputs: {
        ...decisionObjectBase.outputs,
        decisionType: effectiveTaxContext.decisionType,
        taxMode: effectiveTaxContext.decisionType,
        taxFieldCode,
        preliminaryTax: snapshotAmount,
        municipalityCode: effectiveTaxContext.municipalityCode || null,
        tableCode: effectiveTaxContext.tableCode || null,
        columnCode: effectiveTaxContext.columnCode || null,
        adjustmentFixedAmount: effectiveTaxContext.adjustmentFixedAmount ?? null,
        adjustmentPercentage: effectiveTaxContext.adjustmentPercentage ?? null,
        withholdingRatePercent: effectiveTaxContext.withholdingRatePercent ?? null,
        withholdingFixedAmount: effectiveTaxContext.withholdingFixedAmount ?? null,
        tableLookupMode: taxTableLookup?.valueMode ?? null,
        tableLookupValue: taxTableLookup?.sourceValue ?? null,
        tableLookupRowCode: taxTableLookup?.rowCode ?? null,
        tableLookupLowerBound: taxTableLookup?.lowerBound ?? null,
        tableLookupUpperBound: taxTableLookup?.upperBound ?? null,
        tableLookupSourceUrl: taxTableLookup?.sourceUrl ?? null,
        tableLookupSourceSha256: taxTableLookup?.sourceSha256 ?? null,
        annualIncomeBasisAmount: oneTimeTaxLookup?.annualIncomeBasisAmount ?? effectiveTaxContext.annualIncomeBasisAmount ?? null,
        oneTimeLookupRatePercent: oneTimeTaxLookup?.ratePercent ?? null,
        oneTimeLookupRowCode: oneTimeTaxLookup?.rowCode ?? null,
        oneTimeLookupLowerBound: oneTimeTaxLookup?.lowerBound ?? null,
        oneTimeLookupUpperBound: oneTimeTaxLookup?.upperBound ?? null,
        oneTimeLookupSourceUrl: oneTimeTaxLookup?.sourceUrl ?? null,
        oneTimeLookupSourceSha256: oneTimeTaxLookup?.sourceSha256 ?? null,
        sinkRatePercent: effectiveTaxContext.sinkRatePercent ?? null,
        sinkSeaIncome: effectiveTaxContext.sinkSeaIncome === true,
        decisionSource: effectiveTaxContext.decisionSource,
        decisionReference: effectiveTaxContext.decisionReference,
        evidenceRef: effectiveTaxContext.evidenceRef,
        reasonCode: effectiveTaxContext.reasonCode ?? null
      },
      explanation: [
        `decisionType=${effectiveTaxContext.decisionType}`,
        `decisionSource=${effectiveTaxContext.decisionSource}`,
        `decisionReference=${effectiveTaxContext.decisionReference}`,
        oneTimeTaxLookup ? `annualIncomeBasisAmount=${oneTimeTaxLookup.annualIncomeBasisAmount}` : null,
        `taxableBase=${normalizedTaxableBase}`
      ].filter(Boolean)
    };
    return {
      amount: snapshotAmount,
      status: effectiveTaxContext.decisionType === "emergency_manual" ? "resolved_emergency_manual" : `resolved_${effectiveTaxContext.decisionType}`,
      taxFieldCode,
      decisionObject,
      step: createCompletedStep(11, {
        decisionType: effectiveTaxContext.decisionType,
        preliminaryTax: snapshotAmount,
        taxFieldCode,
        decisionReference: effectiveTaxContext.decisionReference,
        decisionSource: effectiveTaxContext.decisionSource,
        decisionObject
      })
    };
  }

  if (effectiveTaxContext.taxMode === "manual_rate") {
    const taxRatePercent = effectiveTaxContext.taxRatePercent;
    const manualRateReasonCode = effectiveTaxContext.manualRateReasonCode;
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
        taxMode: effectiveTaxContext.taxMode,
        taxRatePercent,
        manualRateReasonCode,
        taxFieldCode: "preliminary_tax",
        preliminaryTax: amount
      },
      explanation: [
        `taxMode=${effectiveTaxContext.taxMode}`,
        `taxRatePercent=${taxRatePercent}`,
        `manualRateReasonCode=${manualRateReasonCode}`,
        `taxableBase=${normalizedTaxableBase}`
      ]
    };
    return {
      amount,
      status: effectiveTaxContext.fallbackApplied ? "resolved_fallback_manual_rate" : "resolved_manual_rate",
      taxFieldCode: "preliminary_tax",
      decisionObject,
      step: createCompletedStep(11, {
        taxMode: effectiveTaxContext.taxMode,
        taxRatePercent,
        manualRateReasonCode,
        preliminaryTax: amount,
        taxFieldCode: "preliminary_tax",
        fallbackApplied: effectiveTaxContext.fallbackApplied === true,
        decisionObject
      })
    };
  }

  if (effectiveTaxContext.taxMode === "sink") {
    const sinkRatePercent = effectiveTaxContext.sinkRatePercent;
    const amount = roundMoney(normalizedTaxableBase * (sinkRatePercent / 100));
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: effectiveTaxContext.sinkSeaIncome ? "PAYROLL_TAX_SINK_SEA_INCOME" : "PAYROLL_TAX_SINK",
      outputs: {
        ...decisionObjectBase.outputs,
        taxMode: "sink",
        taxFieldCode: "sink_tax",
        sinkRatePercent,
        sinkSeaIncome: effectiveTaxContext.sinkSeaIncome,
        sinkDecisionType: effectiveTaxContext.sinkDecisionType,
        preliminaryTax: amount
      },
      explanation: [
        `taxMode=sink`,
        `sinkRatePercent=${sinkRatePercent}`,
        `sinkSeaIncome=${effectiveTaxContext.sinkSeaIncome === true}`,
        `taxableBase=${normalizedTaxableBase}`
      ]
    };
    return {
      amount,
      status: effectiveTaxContext.sinkSeaIncome ? "resolved_sink_sea_income" : "resolved_sink",
      taxFieldCode: "sink_tax",
      decisionObject,
      step: createCompletedStep(11, {
        taxMode: "sink",
        sinkRatePercent,
        sinkSeaIncome: effectiveTaxContext.sinkSeaIncome === true,
        preliminaryTax: amount,
        taxFieldCode: "sink_tax",
        fallbackApplied: effectiveTaxContext.fallbackApplied === true,
        decisionObject
      })
    };
  }

  warnings.push(createWarning("payroll_tax_mode_invalid", `Unsupported tax mode ${effectiveTaxContext.taxMode || effectiveTaxContext.decisionType}.`));
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
    explanation: [`Unsupported tax mode ${effectiveTaxContext.taxMode || effectiveTaxContext.decisionType}.`]
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

function resolveEffectiveTaxDecisionContext({ taxDecisionSnapshot = null, statutoryProfile, effectiveDate, rulePack }) {
  if (taxDecisionSnapshot && decisionSnapshotCoversDate(taxDecisionSnapshot, effectiveDate)) {
    return {
      ...copy(taxDecisionSnapshot),
      sourceType: "tax_decision_snapshot"
    };
  }
  const effectiveProfile = resolveEffectiveTaxProfile({
    statutoryProfile,
    effectiveDate,
    rulePack
  });
  if (!effectiveProfile) {
    return null;
  }
  return {
    ...copy(effectiveProfile),
    sourceType: "legacy_statutory_profile",
    decisionType:
      effectiveProfile.taxMode === "manual_rate"
        ? "emergency_manual"
        : effectiveProfile.taxMode === "sink"
          ? "sink"
          : "pending",
    decisionSource: "legacy_statutory_profile",
    decisionReference: effectiveProfile.employmentId || null,
    evidenceRef: effectiveProfile.sinkDecisionDocumentId || null,
    reasonCode: effectiveProfile.manualRateReasonCode || null
  };
}

function assertTaxDecisionSourceAllowedForExecutionBoundary({ effectiveTaxContext, executionBoundary = null }) {
  if (!effectiveTaxContext || effectiveTaxContext.sourceType !== "legacy_statutory_profile") {
    return;
  }
  if (executionBoundary?.supportsLegalEffect !== true) {
    return;
  }
  const resolvedDecisionType = normalizeOptionalText(effectiveTaxContext.decisionType) || "pending";
  throw createError(
    409,
    "payroll_tax_decision_snapshot_required_for_legal_effect",
    `Protected runtime payroll requires an approved TaxDecisionSnapshot; legacy statutory profiles may not determine ${resolvedDecisionType} withholding in legal-effect mode.`
  );
}

function resolveTaxFieldCodeForDecisionType(decisionType) {
  if (decisionType === "sink") {
    return "sink_tax";
  }
  if (isASinkDecisionType(decisionType)) {
    return "a_sink_tax";
  }
  return "preliminary_tax";
}

function resolveTaxDecisionCode({ decisionType, sinkSeaIncome = false }) {
  const decisionCodeByType = {
    tabell: "PAYROLL_TAX_TABLE",
    jamkning: "PAYROLL_TAX_ADJUSTMENT",
    jamkning_fast: "PAYROLL_TAX_ADJUSTMENT_FIXED",
    jamkning_procent: "PAYROLL_TAX_ADJUSTMENT_PERCENT",
    engangsskatt: "PAYROLL_TAX_ONE_TIME",
    sink: sinkSeaIncome ? "PAYROLL_TAX_SINK_SEA_INCOME" : "PAYROLL_TAX_SINK",
    a_sink: "PAYROLL_TAX_A_SINK",
    asink: "PAYROLL_TAX_A_SINK",
    emergency_manual: "PAYROLL_TAX_EMERGENCY_MANUAL"
  };
  return decisionCodeByType[decisionType] || "PAYROLL_TAX_DECISION";
}

function resolveOfficialTaxTableLookupForDecisionSnapshot({ taxDecisionSnapshot, taxableBase }) {
  if (!taxDecisionSnapshot) {
    return null;
  }
  const usesTableLookup =
    taxDecisionSnapshot.decisionType === "tabell"
    || (isJamkningDecisionType(taxDecisionSnapshot.decisionType) && taxDecisionSnapshot.tableCode && taxDecisionSnapshot.columnCode);
  if (!usesTableLookup) {
    return null;
  }
  return lookupSkatteverketMonthlyTaxTable2026({
    tableCode: taxDecisionSnapshot.tableCode,
    columnCode: taxDecisionSnapshot.columnCode,
    grossMonthlyAmount: taxableBase
  });
}

function resolveOfficialOneTimeTaxLookupForDecisionSnapshot({
  taxDecisionSnapshot,
  taxableBase,
  employmentContract = null
}) {
  if (!taxDecisionSnapshot || taxDecisionSnapshot.decisionType !== "engangsskatt") {
    return null;
  }
  const annualIncomeBasisAmount = resolveAnnualIncomeBasisAmountForOneTimeTaxDecision({
    taxDecisionSnapshot,
    employmentContract
  });
  if (annualIncomeBasisAmount == null) {
    return null;
  }
  return lookupSkatteverketOneTimeTaxTable2026({
    columnCode: taxDecisionSnapshot.columnCode,
    annualIncomeBasisAmount,
    oneTimeAmount: taxableBase
  });
}

function resolveAnnualIncomeBasisAmountForOneTimeTaxDecision({
  taxDecisionSnapshot,
  employmentContract = null
}) {
  if (taxDecisionSnapshot?.annualIncomeBasisAmount != null) {
    return roundMoney(Math.max(0, taxDecisionSnapshot.annualIncomeBasisAmount));
  }
  if (employmentContract?.salaryModelCode === "monthly_salary" && Number.isFinite(Number(employmentContract.monthlySalary))) {
    return roundMoney(Math.max(0, Number(employmentContract.monthlySalary)) * 12);
  }
  return null;
}

function resolveTaxDecisionSnapshotAmount({
  taxDecisionSnapshot,
  taxableBase,
  sinkDefaults = {},
  aSinkDefaults = {},
  taxTableLookup = null,
  oneTimeTaxLookup = null
}) {
  if (!taxDecisionSnapshot) {
    return null;
  }
  if (taxDecisionSnapshot.decisionType === "sink") {
    const sinkRatePercent = taxDecisionSnapshot.sinkRatePercent ?? (taxDecisionSnapshot.sinkSeaIncome ? sinkDefaults.seaIncomeRatePercent : sinkDefaults.standardRatePercent);
    return sinkRatePercent == null ? null : roundMoney(taxableBase * (sinkRatePercent / 100));
  }
  if (isASinkDecisionType(taxDecisionSnapshot.decisionType)) {
    const aSinkRatePercent = taxDecisionSnapshot.withholdingRatePercent ?? aSinkDefaults.standardRatePercent;
    return aSinkRatePercent == null ? null : roundMoney(taxableBase * (aSinkRatePercent / 100));
  }
  if (taxDecisionSnapshot.decisionType === "engangsskatt") {
    return oneTimeTaxLookup?.withholdingAmount ?? null;
  }
  if (taxDecisionSnapshot.decisionType === "emergency_manual") {
    return taxDecisionSnapshot.withholdingRatePercent == null ? null : roundMoney(taxableBase * (taxDecisionSnapshot.withholdingRatePercent / 100));
  }
  if (taxDecisionSnapshot.decisionType === "tabell") {
    return taxTableLookup?.withholdingAmount ?? null;
  }
  if (isJamkningDecisionType(taxDecisionSnapshot.decisionType)) {
    let amount = null;
    if (
      taxDecisionSnapshot.decisionType === "jamkning_fast" &&
      taxDecisionSnapshot.withholdingFixedAmount == null &&
      taxTableLookup?.withholdingAmount != null
    ) {
      amount = roundMoney(taxTableLookup.withholdingAmount);
    } else if (taxDecisionSnapshot.withholdingFixedAmount != null) {
      amount = roundMoney(taxDecisionSnapshot.withholdingFixedAmount);
    } else if (taxDecisionSnapshot.withholdingRatePercent != null) {
      amount = roundMoney(taxableBase * (taxDecisionSnapshot.withholdingRatePercent / 100));
    } else if (taxDecisionSnapshot.adjustmentPercentage != null) {
      amount = roundMoney(taxableBase * (taxDecisionSnapshot.adjustmentPercentage / 100));
    } else if (taxTableLookup?.withholdingAmount != null) {
      amount = roundMoney(taxTableLookup.withholdingAmount);
    }
    if (amount == null) {
      return null;
    }
    if (taxDecisionSnapshot.adjustmentFixedAmount != null) {
      amount = roundMoney(amount + taxDecisionSnapshot.adjustmentFixedAmount);
    }
    return Math.max(0, roundMoney(amount));
  }
  return null;
}

function buildEmployerContributionPreview({
  rules,
  contributionBase,
  employee,
  statutoryProfile,
  payDate,
  employerContributionDecisionSnapshot = null
}) {
  const effectiveDate = normalizeRequiredDate(payDate, "pay_run_pay_date_invalid");
  const rulePack = rules.resolveRulePack({
    rulePackCode: PAYROLL_EMPLOYER_CONTRIBUTION_RULE_PACK_CODE,
    domain: "payroll",
    jurisdiction: "SE",
    effectiveDate
  });
  const machineRules = rulePack.machineReadableRules.contributionClasses || {};
  const normalizedContributionBase = roundMoney(Math.max(0, contributionBase || 0));
  const effectiveDecisionContext = resolveEffectiveEmployerContributionDecisionContext({
    employerContributionDecisionSnapshot,
    statutoryProfile,
    effectiveDate,
    employee,
    rulePack,
    machineRules
  });
  const appliedRulepackRef =
    effectiveDecisionContext?.rulepackRef
    || buildPayrollRulepackRefFromRulePack(rulePack, effectiveDate);
  const decisionObjectBase = {
    inputs_hash: buildSnapshotHash({
      contributionBase: normalizedContributionBase,
      payDate: effectiveDate,
      employeeId: employee?.employeeId || null,
      employerContributionDecisionSnapshot: employerContributionDecisionSnapshot || null,
      statutoryProfile: statutoryProfile || null,
      effectiveDecisionContext
    }),
    rule_pack_id: appliedRulepackRef?.rulepackId || rulePack.rulePackId,
    rule_pack_code: appliedRulepackRef?.rulepackCode || rulePack.rulePackCode,
    rule_pack_version: appliedRulepackRef?.rulepackVersion || rulePack.version,
    rule_pack_checksum: appliedRulepackRef?.rulepackChecksum || rulePack.checksum,
    effective_date: appliedRulepackRef?.effectiveDate || effectiveDate,
    warnings: [],
    outputs: {
      contributionBase: normalizedContributionBase
    }
  };

  if (!effectiveDecisionContext) {
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: "PAYROLL_EMPLOYER_CONTRIBUTION_PENDING",
      outputs: {
        ...decisionObjectBase.outputs,
        employerContributionPreviewAmount: null,
        status: "pending"
      },
      warnings: ["payroll_employer_contribution_profile_missing"],
      explanation: ["No effective employer contribution decision could be resolved for the pay date."]
    };
    return {
      amount: null,
      status: "pending",
      decisionObject,
      step: createPendingStep(12, {
        status: "pending",
        contributionBase: normalizedContributionBase,
        decisionObject
      })
    };
  }

  if (
    effectiveDecisionContext.sourceType === "employer_contribution_decision_snapshot"
    && effectiveDecisionContext.status !== "approved"
  ) {
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: "PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_NOT_APPROVED",
      decision_snapshot_id: effectiveDecisionContext.employerContributionDecisionSnapshotId || null,
      outputs: {
        ...decisionObjectBase.outputs,
        decisionType: effectiveDecisionContext.decisionType,
        employerContributionPreviewAmount: null,
        status: "pending"
      },
      warnings: ["employer_contribution_decision_snapshot_not_approved"],
      explanation: ["Approved employer contribution decision snapshot is required before payroll calculation."]
    };
    return {
      amount: null,
      status: "pending",
      decisionObject,
      step: createPendingStep(12, {
        status: "pending",
        contributionBase: normalizedContributionBase,
        decisionObject
      })
    };
  }

  const calculation = calculateEmployerContributionDecisionAmount({
    decisionContext: effectiveDecisionContext,
    contributionBase: normalizedContributionBase
  });
  const contributionClassCode =
    effectiveDecisionContext.contributionClassCode
    || mapEmployerContributionDecisionTypeToClassCode(effectiveDecisionContext.decisionType);
  const decisionObject = {
    ...decisionObjectBase,
    decision_code: resolveEmployerContributionDecisionCode(effectiveDecisionContext.decisionType),
    decision_snapshot_id: effectiveDecisionContext.employerContributionDecisionSnapshotId || null,
    outputs: {
      ...decisionObjectBase.outputs,
      contributionClassCode,
      decisionType: effectiveDecisionContext.decisionType,
      ageBucket: effectiveDecisionContext.ageBucket || null,
      legalBasisCode: effectiveDecisionContext.legalBasisCode || null,
      fullRatePercent: effectiveDecisionContext.fullRate,
      reducedRatePercent: resolveEmployerContributionReducedRatePercent(effectiveDecisionContext),
      baseLimit: resolveEmployerContributionThresholdAmount(effectiveDecisionContext),
      thresholds: copy(effectiveDecisionContext.thresholds || {}),
      reducedComponents: copy(effectiveDecisionContext.reducedComponents || []),
      vaxaEligibilityProfile: copy(effectiveDecisionContext.vaxaEligibilityProfile || null),
      rulepackRef: copy(appliedRulepackRef || null),
      specialConditions: copy(effectiveDecisionContext.specialConditions || {}),
      ratePercent: calculation.netRatePercent,
      grossRatePercent: calculation.grossRatePercent,
      employerContributionPreviewAmount: calculation.amount,
      grossContributionAmount: calculation.grossContributionAmount,
      referenceFullContributionAmount: calculation.referenceFullContributionAmount,
      netEmployerContributionAmount: calculation.netContributionAmount,
      taxAccountReliefAmount: calculation.taxAccountReliefAmount,
      taxAccountConsequence: calculation.taxAccountConsequence,
      contributionComponents: calculation.components,
      ...calculation.compatibilityOutputs
    },
    explanation: [
      `rulePackId=${appliedRulepackRef?.rulepackId || rulePack.rulePackId}`,
      `rulePackChecksum=${appliedRulepackRef?.rulepackChecksum || rulePack.checksum}`,
      `decisionType=${effectiveDecisionContext.decisionType}`,
      `contributionClassCode=${contributionClassCode}`,
      `netRatePercent=${calculation.netRatePercent}`,
      `contributionBase=${normalizedContributionBase}`,
      ...calculation.explanation
    ]
  };
  const status =
    effectiveDecisionContext.sourceType === "employer_contribution_decision_snapshot"
      ? "resolved_decision_snapshot"
      : "resolved_rule_pack";
  return {
    amount: calculation.amount,
    status,
    decisionObject,
    step: createCompletedStep(12, {
      rulePackId: rulePack.rulePackId,
      rulePackChecksum: rulePack.checksum,
      contributionClassCode,
      decisionType: effectiveDecisionContext.decisionType,
      ratePercent: calculation.netRatePercent,
      contributionBase: normalizedContributionBase,
      employerContributionPreviewAmount: calculation.amount,
      taxAccountReliefAmount: calculation.taxAccountReliefAmount,
      decisionObject
    })
  };
}

function buildGarnishmentPreview({
  rules,
  grossAfterDeductions,
  preliminaryTaxAmount,
  payDate,
  employee,
  garnishmentDecisionSnapshot = null,
  warnings
}) {
  if (!garnishmentDecisionSnapshot) {
    return {
      amount: 0,
      status: "not_applicable",
      decisionObject: null,
      payload: null,
      snapshot: null
    };
  }
  const effectiveDate = normalizeRequiredDate(payDate, "pay_run_pay_date_invalid");
  const rulePack = rules.resolveRulePack({
    rulePackCode: PAYROLL_GARNISHMENT_RULE_PACK_CODE,
    domain: "payroll",
    jurisdiction: "SE",
    effectiveDate
  });
  const normalizedGrossAfterDeductions = roundMoney(Math.max(0, grossAfterDeductions || 0));
  const decisionObjectBase = {
    inputs_hash: buildSnapshotHash({
      grossAfterDeductions: normalizedGrossAfterDeductions,
      preliminaryTaxAmount,
      payDate: effectiveDate,
      employeeId: employee?.employeeId || null,
      garnishmentDecisionSnapshot
    }),
    rule_pack_id: rulePack.rulePackId,
    rule_pack_code: rulePack.rulePackCode,
    rule_pack_version: rulePack.version,
    rule_pack_checksum: rulePack.checksum,
    effective_date: effectiveDate,
    warnings: [],
    outputs: {
      grossAfterDeductions: normalizedGrossAfterDeductions,
      preliminaryTaxAmount: preliminaryTaxAmount == null ? null : roundMoney(preliminaryTaxAmount)
    }
  };
  if (garnishmentDecisionSnapshot.status !== "approved") {
    warnings.push(
      createWarning(
        "garnishment_dual_review_required",
        "Approved garnishment decision snapshot is required before payroll can withhold payroll garnishment."
      )
    );
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: "PAYROLL_GARNISHMENT_DECISION_NOT_APPROVED",
      decision_snapshot_id: garnishmentDecisionSnapshot.garnishmentDecisionSnapshotId || null,
      outputs: {
        ...decisionObjectBase.outputs,
        status: "pending",
        garnishmentAmount: 0
      },
      warnings: ["garnishment_dual_review_required"],
      explanation: ["Approved garnishment decision snapshot is required before withholding."]
    };
    return {
      amount: 0,
      status: "pending",
      decisionObject,
      payload: null,
      snapshot: copy(garnishmentDecisionSnapshot)
    };
  }
  if (preliminaryTaxAmount == null) {
    const decisionObject = {
      ...decisionObjectBase,
      decision_code: "PAYROLL_GARNISHMENT_TAX_REQUIRED",
      decision_snapshot_id: garnishmentDecisionSnapshot.garnishmentDecisionSnapshotId || null,
      outputs: {
        ...decisionObjectBase.outputs,
        status: "pending",
        garnishmentAmount: 0
      },
      warnings: ["payroll_tax_profile_missing"],
      explanation: ["Preliminary tax must be resolved before garnishment can be calculated."]
    };
    return {
      amount: 0,
      status: "pending",
      decisionObject,
      payload: null,
      snapshot: copy(garnishmentDecisionSnapshot)
    };
  }
  const cashAfterTax = roundMoney(Math.max(0, normalizedGrossAfterDeductions - preliminaryTaxAmount));
  const protectedAmount = roundMoney(garnishmentDecisionSnapshot.protectedAmountAmount || 0);
  const availableAboveProtected = roundMoney(Math.max(0, cashAfterTax - protectedAmount));
  const uncappedAmount =
    garnishmentDecisionSnapshot.deductionModelCode === "fixed_amount"
      ? Math.min(roundMoney(garnishmentDecisionSnapshot.fixedDeductionAmount || 0), availableAboveProtected)
      : availableAboveProtected;
  const garnishmentAmount = roundMoney(
    Math.max(
      0,
      garnishmentDecisionSnapshot.maximumWithheldAmount == null
        ? uncappedAmount
        : Math.min(uncappedAmount, roundMoney(garnishmentDecisionSnapshot.maximumWithheldAmount))
    )
  );
  const payload = {
    garnishmentDecisionSnapshotId: garnishmentDecisionSnapshot.garnishmentDecisionSnapshotId,
    authorityCaseReference: garnishmentDecisionSnapshot.authorityCaseReference,
    protectedAmountAmount: protectedAmount,
    cashAfterTax,
    availableAboveProtected,
    deductionModelCode: garnishmentDecisionSnapshot.deductionModelCode,
    maximumWithheldAmount: garnishmentDecisionSnapshot.maximumWithheldAmount,
    fixedDeductionAmount: garnishmentDecisionSnapshot.fixedDeductionAmount,
    calculatedAmount: garnishmentAmount,
    remittanceRecipientName: garnishmentDecisionSnapshot.remittanceRecipientName,
    remittanceMethodCode: garnishmentDecisionSnapshot.remittanceMethodCode,
    remittanceBankgiro: garnishmentDecisionSnapshot.remittanceBankgiro,
    remittancePlusgiro: garnishmentDecisionSnapshot.remittancePlusgiro,
    remittanceOcrReference: garnishmentDecisionSnapshot.remittanceOcrReference,
    protectedAmountBaseline: copy(garnishmentDecisionSnapshot.protectedAmountBaseline || {})
  };
  const decisionObject = {
    ...decisionObjectBase,
    decision_code: "PAYROLL_GARNISHMENT_RESOLVED",
    decision_snapshot_id: garnishmentDecisionSnapshot.garnishmentDecisionSnapshotId,
    outputs: {
      ...decisionObjectBase.outputs,
      status: "resolved_decision_snapshot",
      decisionType: garnishmentDecisionSnapshot.decisionType,
      deductionModelCode: garnishmentDecisionSnapshot.deductionModelCode,
      protectedAmountAmount: protectedAmount,
      cashAfterTax,
      availableAboveProtected,
      garnishmentAmount,
      authorityCaseReference: garnishmentDecisionSnapshot.authorityCaseReference,
      garnishmentDecisionSnapshotId: garnishmentDecisionSnapshot.garnishmentDecisionSnapshotId,
      protectedAmountBaseline: copy(garnishmentDecisionSnapshot.protectedAmountBaseline || {}),
      householdProfile: copy(garnishmentDecisionSnapshot.householdProfile || {}),
      remittanceRecipientName: garnishmentDecisionSnapshot.remittanceRecipientName,
      remittanceMethodCode: garnishmentDecisionSnapshot.remittanceMethodCode,
      remittanceBankgiro: garnishmentDecisionSnapshot.remittanceBankgiro,
      remittancePlusgiro: garnishmentDecisionSnapshot.remittancePlusgiro,
      remittanceOcrReference: garnishmentDecisionSnapshot.remittanceOcrReference
    },
    explanation: [
      `rulePackId=${rulePack.rulePackId}`,
      `rulePackChecksum=${rulePack.checksum}`,
      `deductionModelCode=${garnishmentDecisionSnapshot.deductionModelCode}`,
      `cashAfterTax=${cashAfterTax}`,
      `protectedAmount=${protectedAmount}`,
      `availableAboveProtected=${availableAboveProtected}`
    ]
  };
  return {
    amount: garnishmentAmount,
    status: "resolved_decision_snapshot",
    decisionObject,
    payload,
    snapshot: copy(garnishmentDecisionSnapshot)
  };
}

function createGeneratedGarnishmentLines({ employment, preview, state }) {
  if (!preview || roundMoney(preview.amount || 0) <= 0) {
    return [];
  }
  const payItem = getRequiredPayItemByCode(state, employment.companyId, "GARNISHMENT");
  return [
    createPayLine({
      payItem,
      employment,
      amount: preview.amount,
      sourceType: "garnishment_decision_snapshot",
      sourceId: preview.snapshot?.garnishmentDecisionSnapshotId || null,
      note: preview.payload?.authorityCaseReference || "Garnishment withholding",
      processingStep: 13,
      overrides: {
        ledgerAccountCode: "2720"
      }
    })
  ];
}

function ensurePayRunRemittanceInstructions({ state, payRun, actorId = "system", clock }) {
  const existingByEmploymentId = new Map(
    (state.remittanceInstructionIdsByRun.get(payRun.payRunId) || [])
      .map((remittanceInstructionId) => state.remittanceInstructions.get(remittanceInstructionId))
      .filter(Boolean)
      .map((record) => [record.employmentId, record])
  );
  for (const payslipId of state.payslipIdsByRun.get(payRun.payRunId) || []) {
    const payslip = state.payslips.get(payslipId);
    if (!payslip) {
      continue;
    }
    const totals = payslip.renderPayload?.totals || {};
    const garnishmentAmount = roundMoney(totals.garnishmentAmount || 0);
    const garnishmentDecision = totals.garnishmentDecision || null;
    if (!garnishmentDecision || garnishmentAmount <= 0) {
      continue;
    }
    const existing = existingByEmploymentId.get(payslip.renderPayload?.employment?.employmentId || null);
    if (existing) {
      continue;
    }
    const record = buildRemittanceInstructionRecord({
      state,
      payRun,
      payslip,
      garnishmentDecision,
      actorId,
      clock
    });
    state.remittanceInstructions.set(record.remittanceInstructionId, record);
    appendToIndex(state.remittanceInstructionIdsByCompany, record.companyId, record.remittanceInstructionId);
    appendToIndex(state.remittanceInstructionIdsByRun, record.payRunId, record.remittanceInstructionId);
    appendToIndex(
      state.remittanceInstructionIdsByEmployment,
      buildPayrollEmploymentKey(record.companyId, record.employmentId),
      record.remittanceInstructionId
    );
    appendRunEvent(state, {
      payRunId: payRun.payRunId,
      companyId: payRun.companyId,
      eventType: "garnishment_remittance_created",
      actorId,
      note: `Created garnishment remittance ${record.remittanceInstructionId}.`,
      recordedAt: record.createdAt
    });
  }
}

function buildRemittanceInstructionRecord({ state, payRun, payslip, garnishmentDecision, actorId = "system", clock }) {
  const totals = payslip.renderPayload?.totals || {};
  const amount = roundMoney(totals.garnishmentAmount || 0);
  const employment = payslip.renderPayload?.employment || {};
  const employee = payslip.renderPayload?.employee || {};
  const decisionSnapshot = garnishmentDecision.outputs || {};
  const referenceSeed = {
    payRunId: payRun.payRunId,
    employmentId: employment.employmentId || null,
    authorityCaseReference: decisionSnapshot.authorityCaseReference || null,
    amount
  };
  const createdAt = nowIso(clock);
  return {
    remittanceInstructionId: crypto.randomUUID(),
    companyId: payRun.companyId,
    payRunId: payRun.payRunId,
    reportingPeriod: payRun.reportingPeriod,
    payDate: payRun.payDate,
    employmentId: requireText(employment.employmentId, "remittance_instruction_employment_id_required"),
    employeeId: requireText(employee.employeeId, "remittance_instruction_employee_id_required"),
    garnishmentDecisionSnapshotId: garnishmentDecision.decision_snapshot_id || null,
    amount,
    protectedAmountAmount: roundMoney(decisionSnapshot.protectedAmountAmount || 0),
    cashAfterTax: roundMoney(decisionSnapshot.cashAfterTax || 0),
    availableAboveProtected: roundMoney(decisionSnapshot.availableAboveProtected || 0),
    authorityCaseReference: normalizeOptionalText(decisionSnapshot.authorityCaseReference),
    remittanceRecipientName: normalizeOptionalText(decisionSnapshot.remittanceRecipientName) || "Kronofogden",
    remittanceMethodCode: normalizeOptionalText(decisionSnapshot.remittanceMethodCode) || "bankgiro",
    remittanceBankgiro: normalizeOptionalText(decisionSnapshot.remittanceBankgiro),
    remittancePlusgiro: normalizeOptionalText(decisionSnapshot.remittancePlusgiro),
    remittanceOcrReference: normalizeOptionalOcrReference(decisionSnapshot.remittanceOcrReference, "garnishment_decision_snapshot_remittance_ocr_invalid"),
    protectedAmountBaseline: copy(decisionSnapshot.protectedAmountBaseline || {}),
    householdProfile: copy(decisionSnapshot.householdProfile || {}),
    paymentOrderState: "payment_order_ready",
    paymentOrderReference: `KFM-${buildSnapshotHash(referenceSeed).slice(0, 12).toUpperCase()}`,
    paymentOrderPayload: {
      payeeName: normalizeOptionalText(decisionSnapshot.remittanceRecipientName) || "Kronofogden",
      paymentDate: payRun.payDate,
      amount,
      methodCode: normalizeOptionalText(decisionSnapshot.remittanceMethodCode) || "bankgiro",
      bankgiro: normalizeOptionalText(decisionSnapshot.remittanceBankgiro),
      plusgiro: normalizeOptionalText(decisionSnapshot.remittancePlusgiro),
      ocrReference: normalizeOptionalOcrReference(decisionSnapshot.remittanceOcrReference, "garnishment_decision_snapshot_remittance_ocr_invalid"),
      message: normalizeOptionalText(decisionSnapshot.authorityCaseReference) || `Payroll remittance ${payRun.reportingPeriod}`
    },
    status: "payment_order_ready",
    sourceSnapshotHash: payRun.sourceSnapshotHash,
    payRunFingerprint: payRun.payRunFingerprint,
    createdByActorId: requireText(actorId, "actor_id_required"),
    createdAt,
    updatedAt: createdAt,
    settledAt: null,
    settledByActorId: null,
    returnedAt: null,
    returnedByActorId: null,
    returnReasonCode: null,
    correctedAmount: null,
    corrections: [],
    bankEventId: null
  };
}

function presentRemittanceInstruction(state, record) {
  if (!record) {
    return null;
  }
  const payRun = state.payRuns.get(record.payRunId) || null;
  const decisionSnapshot = record.garnishmentDecisionSnapshotId
    ? state.garnishmentDecisionSnapshots.get(record.garnishmentDecisionSnapshotId) || null
    : null;
  return copy({
    ...record,
    payRun: payRun ? {
      payRunId: payRun.payRunId,
      reportingPeriod: payRun.reportingPeriod,
      payDate: payRun.payDate,
      runType: payRun.runType,
      status: payRun.status
    } : null,
    decisionSnapshot: decisionSnapshot ? copy(decisionSnapshot) : null
  });
}

function summarizeRemittanceInstructions(records = []) {
  return {
    totalCount: records.length,
    paymentOrderReadyCount: records.filter((record) => record.status === "payment_order_ready").length,
    settledCount: records.filter((record) => record.status === "settled").length,
    returnedCount: records.filter((record) => record.status === "returned").length,
    correctedCount: records.filter((record) => record.status === "corrected").length,
    totalAmount: roundMoney(records.reduce((sum, record) => sum + Number(record.amount || 0), 0))
  };
}

function resolveEffectiveEmployerContributionDecisionContext({
  employerContributionDecisionSnapshot = null,
  statutoryProfile,
  effectiveDate,
  employee,
  rulePack,
  machineRules
}) {
  if (employerContributionDecisionSnapshot && decisionSnapshotCoversDate(employerContributionDecisionSnapshot, effectiveDate)) {
    const canonicalSnapshot = applyEmployerContributionDecisionRulePackDefaults({
      normalized: employerContributionDecisionSnapshot,
      rulePack
    });
    return {
      ...copy(canonicalSnapshot),
      sourceType: "employer_contribution_decision_snapshot",
      contributionClassCode:
        employerContributionDecisionSnapshot.contributionClassCode
        || mapEmployerContributionDecisionTypeToClassCode(employerContributionDecisionSnapshot.decisionType),
      rulepackRef:
        canonicalSnapshot.rulepackRef
        || buildPayrollRulepackRefFromRulePack(rulePack, effectiveDate)
    };
  }
  return buildAutomaticEmployerContributionDecisionContext({
    employee,
    statutoryProfile,
    effectiveDate,
    rulePack,
    machineRules
  });
}

function buildAutomaticEmployerContributionDecisionContext({
  employee,
  statutoryProfile,
  effectiveDate,
  rulePack,
  machineRules
}) {
  const contributionClassCode = resolveEmployerContributionClassCode({
    employee,
    statutoryProfile,
    effectiveDate,
    machineRules
  });
  const classDefinition = machineRules[contributionClassCode] || machineRules.full || {};
  const fullRate = roundMoney(
    classDefinition?.standardRatePercent
      ?? machineRules.full?.ratePercent
      ?? classDefinition?.ratePercent
      ?? 0
  );
  const reducedRate = roundMoney(
    classDefinition?.reducedRatePercent
      ?? classDefinition?.ratePercent
      ?? fullRate
  );
  const ageBucket = resolveEmployerContributionAgeBucket({ employee, effectiveDate, contributionClassCode });
  const legalBasisCode = resolveEmployerContributionLegalBasisCode(contributionClassCode);
  const specialConditions = {
    autoDerived: true,
    sourceType: normalizeOptionalText(statutoryProfile?.contributionClassCode) ? "legacy_statutory_profile" : "rule_pack_auto"
  };
  if (contributionClassCode === "temporary_youth_reduction") {
    specialConditions.eligibleAgeYears = copy(classDefinition.eligibleAgeYears || {});
    specialConditions.eligibilityFrom = classDefinition.eligibilityFrom || null;
    specialConditions.eligibilityTo = classDefinition.eligibilityTo || null;
  }
  if (contributionClassCode === "no_contribution") {
    specialConditions.eligibilityBirthYearOnOrBefore = classDefinition.eligibilityBirthYearOnOrBefore ?? null;
  }
  const decisionType = mapEmployerContributionClassCodeToDecisionType(contributionClassCode);
  const thresholds = buildEmployerContributionThresholds({
    decisionType,
    baseLimit:
      contributionClassCode === "temporary_youth_reduction"
        ? normalizeRequiredMoney(classDefinition.thresholdAmount ?? 0, "payroll_employer_contribution_threshold_invalid")
        : null
  });
  const vaxaEligibilityProfile = decisionType === "vaxa"
    ? buildEmployerContributionVaxaEligibilityProfile({
      decisionType,
      vaxaEligibilityProfile: {
        supportWindowMonths: classDefinition.supportWindowMonths ?? null,
        supportEmployeeCountLimit: classDefinition.supportEmployeeCountLimit ?? null,
        supportMode: "tax_account_credit",
        refundProcessCode: classDefinition.refundProcessCode || "tax_account_credit_2026"
      },
      specialConditions
    })
    : null;
  const reducedComponents = buildEmployerContributionReducedComponents({
    decisionType,
    fullRate,
    reducedRate: contributionClassCode === "full" ? null : reducedRate,
    thresholds,
    vaxaEligibilityProfile
  });
  return {
    companyId: employee?.companyId || null,
    employmentId: employee?.employmentId || null,
    employerContributionDecisionSnapshotId: null,
    decisionType,
    contributionClassCode,
    ageBucket,
    legalBasisCode,
    validFrom: rulePack.effectiveFrom,
    validTo: rulePack.effectiveTo || null,
    baseLimit:
      contributionClassCode === "temporary_youth_reduction"
        ? normalizeRequiredMoney(classDefinition.thresholdAmount ?? 0, "payroll_employer_contribution_threshold_invalid")
        : null,
    fullRate,
    reducedRate: contributionClassCode === "full" ? null : reducedRate,
    reducedComponents,
    thresholds,
    vaxaEligibilityProfile,
    rulepackRef: buildPayrollRulepackRefFromRulePack(rulePack, effectiveDate),
    specialConditions,
    decisionSource: normalizeOptionalText(statutoryProfile?.contributionClassCode) ? "legacy_statutory_profile" : "rule_pack_auto",
    decisionReference: rulePack.rulePackId,
    evidenceRef: `rulepack:${rulePack.rulePackId}`,
    reasonCode: null,
    status: "approved",
    requiresDualReview: false,
    approvedAt: null,
    approvedByActorId: null,
    sourceType: normalizeOptionalText(statutoryProfile?.contributionClassCode) ? "legacy_statutory_profile" : "rule_pack_auto"
  };
}

function resolveEmployerContributionClassCode({ employee, statutoryProfile, effectiveDate, machineRules }) {
  const birthYear = employee?.dateOfBirth ? Number(String(employee.dateOfBirth).slice(0, 4)) : null;
  const noContributionBirthYearOnOrBefore = Number(machineRules?.no_contribution?.eligibilityBirthYearOnOrBefore);
  if (birthYear != null && Number.isFinite(noContributionBirthYearOnOrBefore) && birthYear <= noContributionBirthYearOnOrBefore) {
    return "no_contribution";
  }
  const explicitClassCode = normalizeOptionalText(statutoryProfile?.contributionClassCode);
  if (explicitClassCode && explicitClassCode !== "full") {
    return explicitClassCode;
  }
  const payoutYear = Number(String(effectiveDate).slice(0, 4));
  const ageAtYearStart = birthYear == null ? null : payoutYear - birthYear;
  if (ageAtYearStart != null && ageAtYearStart >= 67) {
    return "reduced_age_pension_only";
  }
  const youthClassDefinition = machineRules.temporary_youth_reduction;
  if (isYouthReductionEligible({ classDefinition: youthClassDefinition, birthYear, effectiveDate })) {
    return "temporary_youth_reduction";
  }
  return explicitClassCode || "full";
}

function calculateEmployerContributionDecisionAmount({ decisionContext, contributionBase }) {
  const normalizedContributionBase = roundMoney(Math.max(0, contributionBase || 0));
  const fullRatePercent = roundMoney(
    decisionContext.fullRate
      ?? resolveEmployerContributionReducedRatePercent(decisionContext)
      ?? 0
  );
  const resolvedReducedRatePercent = resolveEmployerContributionReducedRatePercent(decisionContext);
  const reducedRatePercent = resolvedReducedRatePercent == null ? null : roundMoney(resolvedReducedRatePercent);
  const resolvedThresholdAmount = resolveEmployerContributionThresholdAmount(decisionContext);
  const baseLimit = resolvedThresholdAmount == null ? null : normalizeRequiredMoney(
    resolvedThresholdAmount,
    "employer_contribution_decision_snapshot_base_limit_invalid"
  );
  let components = [];
  let taxAccountConsequence = null;

  if (decisionContext.decisionType === "temporary_youth_reduction") {
    components = buildSplitEmployerContributionComponents({
      contributionBase: normalizedContributionBase,
      reducedRatePercent: reducedRatePercent ?? fullRatePercent,
      fullRatePercent,
      baseLimit,
      reducedComponentCode: "temporary_youth_reduction_band",
      overflowComponentCode: "standard_overflow_band"
    });
  } else if (decisionContext.decisionType === "vaxa") {
    components = buildSplitEmployerContributionComponents({
      contributionBase: normalizedContributionBase,
      reducedRatePercent: reducedRatePercent ?? fullRatePercent,
      fullRatePercent,
      baseLimit,
      reducedComponentCode: "vaxa_reduced_band",
      overflowComponentCode: "standard_overflow_band"
    });
    const vaxaBase = roundMoney(components.filter((component) => component.componentCode === "vaxa_reduced_band").reduce((sum, component) => sum + component.baseAmount, 0));
    const vaxaAmount = roundMoney(components.filter((component) => component.componentCode === "vaxa_reduced_band").reduce((sum, component) => sum + component.amount, 0));
    const referenceBandAmount = roundMoney(vaxaBase * (fullRatePercent / 100));
    const reliefAmount = roundMoney(Math.max(0, referenceBandAmount - vaxaAmount));
    if (reliefAmount > 0) {
      taxAccountConsequence = {
        consequenceTypeCode: "vaxa_relief_credit",
        liabilityTypeCode: "employer_contributions",
        bookingTimingCode: "tax_account_assessment",
        creditAmount: reliefAmount,
        referenceBaseAmount: vaxaBase,
        reducedRatePercent: reducedRatePercent ?? null,
        fullRatePercent,
        legalBasisCode: decisionContext.legalBasisCode || null
      };
    }
  } else if (decisionContext.decisionType === "reduced_age_pension_only") {
    components = [
      buildEmployerContributionComponent({
        componentCode: "age_pension_only",
        baseAmount: normalizedContributionBase,
        ratePercent: reducedRatePercent ?? fullRatePercent
      })
    ];
  } else if (decisionContext.decisionType === "no_contribution") {
    components = [
      buildEmployerContributionComponent({
        componentCode: "no_contribution",
        baseAmount: normalizedContributionBase,
        ratePercent: 0
      })
    ];
  } else if (decisionContext.decisionType === "emergency_manual" && baseLimit != null && reducedRatePercent != null) {
    components = buildSplitEmployerContributionComponents({
      contributionBase: normalizedContributionBase,
      reducedRatePercent,
      fullRatePercent,
      baseLimit,
      reducedComponentCode: "manual_reduced_band",
      overflowComponentCode: "manual_overflow_band"
    });
  } else {
    const manualOrFullRate = reducedRatePercent ?? fullRatePercent;
    components = [
      buildEmployerContributionComponent({
        componentCode:
          decisionContext.decisionType === "emergency_manual"
            ? "manual_contribution"
            : "standard_contribution",
        baseAmount: normalizedContributionBase,
        ratePercent: manualOrFullRate
      })
    ];
  }

  const netContributionAmount = roundMoney(components.reduce((sum, component) => sum + component.amount, 0));
  const referenceFullContributionAmount = roundMoney(normalizedContributionBase * (fullRatePercent / 100));
  const taxAccountReliefAmount = roundMoney(Math.max(0, Number(taxAccountConsequence?.creditAmount || 0)));
  const grossContributionAmount =
      decisionContext.decisionType === "vaxa"
      ? referenceFullContributionAmount
      : netContributionAmount;
  const netRatePercent = normalizedContributionBase > 0 ? roundMoney((netContributionAmount / normalizedContributionBase) * 100) : 0;
  const grossRatePercent = normalizedContributionBase > 0 ? roundMoney((grossContributionAmount / normalizedContributionBase) * 100) : 0;
  const reducedContributionBase = roundMoney(
    components
      .filter((component) => component.componentCode !== "standard_overflow_band")
      .reduce((sum, component) => sum + component.baseAmount, 0)
  );
  const overflowContributionBase = roundMoney(
    components
      .filter((component) => component.componentCode === "standard_overflow_band" || component.componentCode === "manual_overflow_band")
      .reduce((sum, component) => sum + component.baseAmount, 0)
  );
  return {
    amount: netContributionAmount,
    netContributionAmount,
    grossContributionAmount,
    referenceFullContributionAmount,
    taxAccountReliefAmount,
    taxAccountConsequence,
    netRatePercent,
    grossRatePercent,
    components,
    compatibilityOutputs: {
      thresholdAmount: baseLimit,
      reducedContributionBase: baseLimit == null ? null : reducedContributionBase,
      overflowContributionBase: baseLimit == null ? null : overflowContributionBase,
      reducedRatePercent,
      overflowRatePercent: baseLimit == null ? null : fullRatePercent
    },
    explanation: [
      `grossContributionAmount=${grossContributionAmount}`,
      `netContributionAmount=${netContributionAmount}`,
      `referenceFullContributionAmount=${referenceFullContributionAmount}`,
      `taxAccountReliefAmount=${taxAccountReliefAmount}`
    ]
  };
}

function resolveEmployerContributionThresholdAmount(decisionContext = {}) {
  const thresholdSource = decisionContext.thresholds && typeof decisionContext.thresholds === "object"
    ? decisionContext.thresholds
    : {};
  const candidate =
    thresholdSource.baseLimitAmount
    ?? thresholdSource.reducedRateBaseLimitAmount
    ?? thresholdSource.monthlyBaseLimitAmount
    ?? decisionContext.baseLimit;
  return candidate == null ? null : normalizeRequiredMoney(candidate, "employer_contribution_decision_snapshot_base_limit_invalid");
}

function resolveEmployerContributionReducedRatePercent(decisionContext = {}) {
  if (Array.isArray(decisionContext.reducedComponents) && decisionContext.reducedComponents.length > 0) {
    const explicitReduced = decisionContext.reducedComponents.find((component) => component?.componentCode !== "standard_overflow_band");
    if (explicitReduced?.ratePercent != null) {
      return normalizeRequiredPercentage(
        explicitReduced.ratePercent,
        "employer_contribution_decision_snapshot_reduced_rate_invalid"
      );
    }
  }
  if (decisionContext.reducedRate == null) {
    return null;
  }
  return normalizeRequiredPercentage(
    decisionContext.reducedRate,
    "employer_contribution_decision_snapshot_reduced_rate_invalid"
  );
}

function buildSplitEmployerContributionComponents({
  contributionBase,
  reducedRatePercent,
  fullRatePercent,
  baseLimit,
  reducedComponentCode,
  overflowComponentCode
}) {
  const thresholdAmount = normalizeRequiredMoney(baseLimit ?? 0, "employer_contribution_decision_snapshot_base_limit_invalid");
  const reducedContributionBase = roundMoney(Math.min(contributionBase, thresholdAmount));
  const overflowContributionBase = roundMoney(Math.max(0, contributionBase - reducedContributionBase));
  return [
    buildEmployerContributionComponent({
      componentCode: reducedComponentCode,
      baseAmount: reducedContributionBase,
      ratePercent: reducedRatePercent
    }),
    buildEmployerContributionComponent({
      componentCode: overflowComponentCode,
      baseAmount: overflowContributionBase,
      ratePercent: fullRatePercent
    })
  ].filter((component) => component.baseAmount > 0 || component.amount > 0);
}

function buildEmployerContributionComponent({ componentCode, baseAmount, ratePercent }) {
  const normalizedBaseAmount = roundMoney(Math.max(0, baseAmount || 0));
  const normalizedRatePercent = roundMoney(Math.max(0, ratePercent || 0));
  return {
    componentCode,
    baseAmount: normalizedBaseAmount,
    ratePercent: normalizedRatePercent,
    amount: roundMoney(normalizedBaseAmount * (normalizedRatePercent / 100))
  };
}

function buildEmployerContributionThresholds({ decisionType, baseLimit = null, thresholds = null } = {}) {
  if (thresholds && typeof thresholds === "object" && !Array.isArray(thresholds)) {
    const baseLimitAmount =
      thresholds.baseLimitAmount
      ?? thresholds.reducedRateBaseLimitAmount
      ?? thresholds.monthlyBaseLimitAmount
      ?? baseLimit;
    const normalizedBaseLimitAmount =
      baseLimitAmount == null
        ? null
        : normalizeRequiredMoney(baseLimitAmount, "employer_contribution_decision_snapshot_base_limit_invalid");
    return {
      thresholdModeCode:
        normalizeOptionalText(thresholds.thresholdModeCode)
        || (normalizedBaseLimitAmount == null ? "none" : "monthly_base_limit"),
      baseLimitAmount: normalizedBaseLimitAmount,
      thresholdBasisCode:
        normalizeOptionalText(thresholds.thresholdBasisCode)
        || (normalizedBaseLimitAmount == null ? null : "employer_contribution_base"),
      periodCode: normalizeOptionalText(thresholds.periodCode) || (normalizedBaseLimitAmount == null ? null : "month"),
      currencyCode: normalizeOptionalText(thresholds.currencyCode) || (normalizedBaseLimitAmount == null ? null : "SEK")
    };
  }
  const normalizedBaseLimit =
    baseLimit == null ? null : normalizeRequiredMoney(baseLimit, "employer_contribution_decision_snapshot_base_limit_invalid");
  return {
    thresholdModeCode: normalizedBaseLimit == null ? "none" : "monthly_base_limit",
    baseLimitAmount: normalizedBaseLimit,
    thresholdBasisCode: normalizedBaseLimit == null ? null : "employer_contribution_base",
    periodCode: normalizedBaseLimit == null ? null : "month",
    currencyCode: normalizedBaseLimit == null ? null : "SEK",
    decisionType: decisionType || null
  };
}

function buildEmployerContributionReducedComponents({
  decisionType,
  fullRate,
  reducedRate = null,
  thresholds = null,
  reducedComponents = null,
  vaxaEligibilityProfile = null
} = {}) {
  if (Array.isArray(reducedComponents)) {
    return reducedComponents.map((component) => ({
      componentCode: requireText(component.componentCode, "employer_contribution_decision_snapshot_component_code_required"),
      ratePercent: normalizeRequiredPercentage(
        component.ratePercent,
        "employer_contribution_decision_snapshot_component_rate_invalid"
      ),
      baseLimitAmount: normalizeOptionalMoney(
        component.baseLimitAmount,
        "employer_contribution_decision_snapshot_component_base_limit_invalid"
      ),
      appliesToCode: normalizeOptionalText(component.appliesToCode),
      refundProcessCode: normalizeOptionalText(component.refundProcessCode)
    }));
  }
  const thresholdAmount = thresholds?.baseLimitAmount ?? null;
  switch (decisionType) {
    case "reduced_age_pension_only":
      return [{
        componentCode: "age_pension_only",
        ratePercent: normalizeRequiredPercentage(
          reducedRate ?? fullRate ?? 0,
          "employer_contribution_decision_snapshot_reduced_rate_invalid"
        ),
        baseLimitAmount: null,
        appliesToCode: "entire_base",
        refundProcessCode: null
      }];
    case "temporary_youth_reduction":
      return [{
        componentCode: "temporary_youth_reduction_band",
        ratePercent: normalizeRequiredPercentage(
          reducedRate ?? fullRate ?? 0,
          "employer_contribution_decision_snapshot_reduced_rate_invalid"
        ),
        baseLimitAmount: thresholdAmount,
        appliesToCode: "threshold_band",
        refundProcessCode: null
      }];
    case "vaxa":
      return [{
        componentCode: "vaxa_reduced_band",
        ratePercent: normalizeRequiredPercentage(
          reducedRate ?? fullRate ?? 0,
          "employer_contribution_decision_snapshot_reduced_rate_invalid"
        ),
        baseLimitAmount: thresholdAmount,
        appliesToCode: "threshold_band",
        refundProcessCode:
          normalizeOptionalText(vaxaEligibilityProfile?.refundProcessCode)
          || "tax_account_credit_2026"
      }];
    case "no_contribution":
      return [{
        componentCode: "no_contribution",
        ratePercent: 0,
        baseLimitAmount: null,
        appliesToCode: "entire_base",
        refundProcessCode: null
      }];
    case "emergency_manual":
      if (thresholdAmount != null && reducedRate != null) {
        return [{
          componentCode: "manual_reduced_band",
          ratePercent: normalizeRequiredPercentage(
            reducedRate,
            "employer_contribution_decision_snapshot_reduced_rate_invalid"
          ),
          baseLimitAmount: thresholdAmount,
          appliesToCode: "threshold_band",
          refundProcessCode: null
        }];
      }
      if (reducedRate != null || fullRate != null) {
        return [{
          componentCode: "manual_override",
          ratePercent: normalizeRequiredPercentage(
            reducedRate ?? fullRate ?? 0,
            "employer_contribution_decision_snapshot_reduced_rate_invalid"
          ),
          baseLimitAmount: null,
          appliesToCode: "entire_base",
          refundProcessCode: null
        }];
      }
      return [];
    default:
      return [];
  }
}

function buildEmployerContributionVaxaEligibilityProfile({
  decisionType,
  vaxaEligibilityProfile = null,
  specialConditions = {}
} = {}) {
  if (decisionType !== "vaxa") {
    return null;
  }
  const profile = vaxaEligibilityProfile && typeof vaxaEligibilityProfile === "object" && !Array.isArray(vaxaEligibilityProfile)
    ? vaxaEligibilityProfile
    : {};
  const legacyConditions = specialConditions && typeof specialConditions === "object" && !Array.isArray(specialConditions)
    ? specialConditions
    : {};
  return {
    eligibilitySourceCode:
      normalizeOptionalText(profile.eligibilitySourceCode)
      || normalizeOptionalText(legacyConditions.eligibilitySourceCode)
      || "manual_review",
    supportWindowMonths:
      profile.supportWindowMonths == null && legacyConditions.supportWindowMonths == null
        ? null
        : normalizeNonNegativeInteger(
          profile.supportWindowMonths ?? legacyConditions.supportWindowMonths,
          "employer_contribution_decision_snapshot_vaxa_support_window_invalid"
        ),
    supportEmployeeCountLimit:
      profile.supportEmployeeCountLimit == null && legacyConditions.supportEmployeeCountLimit == null
        ? null
        : normalizeNonNegativeInteger(
          profile.supportEmployeeCountLimit ?? legacyConditions.supportEmployeeCountLimit,
          "employer_contribution_decision_snapshot_vaxa_support_employee_limit_invalid"
        ),
    supportMode:
      normalizeOptionalText(profile.supportMode)
      || normalizeOptionalText(legacyConditions.supportMode)
      || "tax_account_credit",
    refundProcessCode:
      normalizeOptionalText(profile.refundProcessCode)
      || normalizeOptionalText(legacyConditions.refundProcessCode)
      || "tax_account_credit_2026",
    deMinimisAidTracked: profile.deMinimisAidTracked === true || legacyConditions.deMinimisAidTracked === true
  };
}

function augmentEmployerContributionSpecialConditions({
  decisionType,
  specialConditions = {},
  thresholds = null,
  vaxaEligibilityProfile = null,
  classDefinition = null
} = {}) {
  const normalized = copy(specialConditions || {});
  if (decisionType === "temporary_youth_reduction") {
    normalized.eligibleAgeYears = copy(classDefinition?.eligibleAgeYears || normalized.eligibleAgeYears || {});
    normalized.eligibilityFrom = classDefinition?.eligibilityFrom || normalized.eligibilityFrom || null;
    normalized.eligibilityTo = classDefinition?.eligibilityTo || normalized.eligibilityTo || null;
  }
  if (decisionType === "no_contribution") {
    normalized.eligibilityBirthYearOnOrBefore =
      classDefinition?.eligibilityBirthYearOnOrBefore
      ?? normalized.eligibilityBirthYearOnOrBefore
      ?? null;
  }
  if (decisionType === "vaxa" && vaxaEligibilityProfile) {
    normalized.supportWindowMonths = vaxaEligibilityProfile.supportWindowMonths;
    normalized.supportEmployeeCountLimit = vaxaEligibilityProfile.supportEmployeeCountLimit;
    normalized.supportMode = vaxaEligibilityProfile.supportMode;
    normalized.refundProcessCode = vaxaEligibilityProfile.refundProcessCode;
    normalized.baseLimitAmount = thresholds?.baseLimitAmount ?? normalized.baseLimitAmount ?? null;
  }
  return normalized;
}

function resolveEmployerContributionDecisionCode(decisionType) {
  switch (decisionType) {
    case "temporary_youth_reduction":
      return "PAYROLL_EMPLOYER_CONTRIBUTION_TEMPORARY_YOUTH_REDUCTION";
    case "reduced_age_pension_only":
      return "PAYROLL_EMPLOYER_CONTRIBUTION_REDUCED_AGE_PENSION_ONLY";
    case "vaxa":
      return "PAYROLL_EMPLOYER_CONTRIBUTION_VAXA";
    case "no_contribution":
      return "PAYROLL_EMPLOYER_CONTRIBUTION_NONE";
    case "emergency_manual":
      return "PAYROLL_EMPLOYER_CONTRIBUTION_EMERGENCY_MANUAL";
    default:
      return "PAYROLL_EMPLOYER_CONTRIBUTION_FULL";
  }
}

function mapEmployerContributionDecisionTypeToClassCode(decisionType) {
  switch (decisionType) {
    case "reduced_age_pension_only":
      return "reduced_age_pension_only";
    case "temporary_youth_reduction":
      return "temporary_youth_reduction";
    case "vaxa":
      return "vaxa";
    case "no_contribution":
      return "no_contribution";
    default:
      return "full";
  }
}

function mapEmployerContributionClassCodeToDecisionType(contributionClassCode) {
  switch (contributionClassCode) {
    case "reduced_age_pension_only":
      return "reduced_age_pension_only";
    case "temporary_youth_reduction":
      return "temporary_youth_reduction";
    case "no_contribution":
      return "no_contribution";
    default:
      return "full";
  }
}

function resolveEmployerContributionLegalBasisCode(contributionClassCode) {
  switch (contributionClassCode) {
    case "reduced_age_pension_only":
      return "se_age_pension_only_year_start_67_plus";
    case "temporary_youth_reduction":
      return "se_temporary_youth_reduction_2026_2027";
    case "no_contribution":
      return "se_no_contribution_birth_year_on_or_before_1937";
    default:
      return "se_full_employer_contribution";
  }
}

function resolveEmployerContributionAgeBucket({ employee, effectiveDate, contributionClassCode }) {
  const birthYear = employee?.dateOfBirth ? Number(String(employee.dateOfBirth).slice(0, 4)) : null;
  if (birthYear == null) {
    return contributionClassCode === "no_contribution" ? "birth_year_on_or_before_1937" : "standard";
  }
  const payoutYear = Number(String(effectiveDate).slice(0, 4));
  const ageAtYearStart = payoutYear - birthYear;
  if (contributionClassCode === "no_contribution") {
    return "birth_year_on_or_before_1937";
  }
  if (ageAtYearStart >= 67) {
    return "year_start_67_plus";
  }
  if (ageAtYearStart >= 19 && ageAtYearStart <= 23) {
    return "year_start_19_23";
  }
  return "standard";
}

function isYouthReductionEligible({ classDefinition, birthYear, effectiveDate }) {
  if (!classDefinition || birthYear == null) {
    return false;
  }
  const eligibleAgeYears = classDefinition.eligibleAgeYears || {};
  const minAge = Number(eligibleAgeYears.min);
  const maxAge = Number(eligibleAgeYears.max);
  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) {
    return false;
  }
  const payoutYear = Number(String(effectiveDate).slice(0, 4));
  const ageDuringPayoutYear = payoutYear - birthYear;
  if (ageDuringPayoutYear < minAge || ageDuringPayoutYear > maxAge) {
    return false;
  }
  const eligibilityFrom = normalizeRequiredDate(classDefinition.eligibilityFrom, "payroll_employer_contribution_eligibility_from_invalid");
  const eligibilityTo = normalizeRequiredDate(classDefinition.eligibilityTo, "payroll_employer_contribution_eligibility_to_invalid");
  return effectiveDate >= eligibilityFrom && effectiveDate <= eligibilityTo;
}

function summarizeTotals({ lines, preliminaryTax, employerContributionPreviewAmount }) {
  const grossEarnings = roundMoney(sumDirectional(lines, "gross_addition"));
  const grossDeductions = roundMoney(sumDirectional(lines, "gross_deduction"));
  const netDeductions = roundMoney(sumDirectional(lines, "net_deduction"));
  const grossAfterDeductions = roundMoney(grossEarnings - grossDeductions);
  const netPay =
    preliminaryTax == null ? null : roundMoney(grossAfterDeductions - preliminaryTax - netDeductions);
  const cashNetPayAmount = netPay == null ? null : roundMoney(Math.max(0, netPay));
  const employeeReceivableAmount = netPay == null ? null : roundMoney(Math.max(0, -netPay));

  return {
    grossEarnings,
    grossDeductions,
    grossAfterDeductions,
    preliminaryTax,
    netDeductions,
    netPay,
    cashNetPayAmount,
    employeeReceivableAmount,
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
    taxTreatmentCode: template.taxTreatmentCode ?? resolveDefaultTaxTreatmentCode(template.payItemCode),
    employerContributionTreatmentCode:
      template.employerContributionTreatmentCode ?? resolveDefaultEmployerContributionTreatmentCode(template.payItemCode),
    agiMappingCode: template.agiMappingCode ?? resolveDefaultAgiMappingCode(template.payItemCode),
    ledgerAccountCode: template.ledgerAccountCode ?? resolveDefaultLedgerAccountCode(template.payItemCode),
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

function resolvePrimaryBankAccount({ companyId, employeeId, hrPlatform }) {
  if (!hrPlatform?.getEmployeeBankAccountDetails) {
    return null;
  }
  try {
    return hrPlatform.getEmployeeBankAccountDetails({
      companyId: requireText(companyId, "company_id_required"),
      employeeId: requireText(employeeId, "employee_id_required")
    });
  } catch {
    return null;
  }
}

function resolveEmploymentTimeBase({ companyId, employmentId, period, timePlatform }) {
  if (!timePlatform?.getEmploymentTimeBase) {
    return null;
  }
  return timePlatform.getEmploymentTimeBase({
    companyId: requireText(companyId, "company_id_required"),
    employmentId: requireText(employmentId, "employment_id_required"),
    workDate: period.endsOn,
      cutoffDate: period.endsOn
    });
}

function resolveEmploymentPayrollInputPeriod({ companyId, employmentId, period, timePlatform }) {
  if (!timePlatform?.getPayrollInputPeriod) {
    return null;
  }
  return timePlatform.getPayrollInputPeriod({
    companyId: requireText(companyId, "company_id_required"),
    employmentId: requireText(employmentId, "employment_id_required"),
    startsOn: period.startsOn,
    endsOn: period.endsOn,
    reportingPeriod: period.reportingPeriod
  });
}

function resolveAgreementContext({ companyId, employment, period, collectiveAgreementsPlatform }) {
  if (!collectiveAgreementsPlatform) {
    return null;
  }
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const eventDate = normalizeRequiredDate(period.endsOn, "agreement_event_date_required");
  try {
    const activeAgreement =
      typeof collectiveAgreementsPlatform.getActiveAgreementForEmployment === "function"
        ? collectiveAgreementsPlatform.getActiveAgreementForEmployment({
            companyId: resolvedCompanyId,
            employeeId: employment.employeeId,
            employmentId: employment.employmentId,
            eventDate
          })
        : null;
    const overlay =
      typeof collectiveAgreementsPlatform.evaluateAgreementOverlay === "function"
        ? collectiveAgreementsPlatform.evaluateAgreementOverlay({
            companyId: resolvedCompanyId,
            employeeId: employment.employeeId,
            employmentId: employment.employmentId,
            eventDate
          })
        : null;
    return {
      eventDate,
      activeAgreement: activeAgreement ? copy(activeAgreement) : null,
      overlay: overlay ? copy(overlay) : null,
      error: null
    };
  } catch (error) {
    return {
      eventDate,
      activeAgreement: null,
      overlay: null,
      error: {
        code: error?.code || "collective_agreement_resolution_failed",
        message: error?.message || "Collective agreement resolution failed.",
        status: Number(error?.status || 409)
      }
    };
  }
}

function resolvePayrollMigrationContext({ companyId, sessionToken, migrationBatchId, getCorePlatform }) {
  const resolvedMigrationBatchId = normalizeOptionalText(migrationBatchId);
  if (!resolvedMigrationBatchId) {
    return null;
  }
  if (!sessionToken) {
    throw createError(
      400,
      "payroll_migration_session_required",
      "A session token is required when a payroll run references a payroll migration batch."
    );
  }
  const corePlatform = typeof getCorePlatform === "function" ? getCorePlatform() : null;
  if (!corePlatform?.getPayrollMigrationBatch) {
    throw createError(
      500,
      "payroll_migration_core_platform_missing",
      "Core migration platform is required when a payroll run references a payroll migration batch."
    );
  }
  const batch = corePlatform.getPayrollMigrationBatch({
    sessionToken,
    companyId: requireText(companyId, "company_id_required"),
    payrollMigrationBatchId: resolvedMigrationBatchId
  });
  const openDiffs =
    typeof corePlatform.getOpenPayrollMigrationDiffs === "function"
      ? corePlatform.getOpenPayrollMigrationDiffs({
          sessionToken,
          companyId,
          payrollMigrationBatchId: resolvedMigrationBatchId
        })
      : [];
  return {
    batch: copy(batch),
    openDiffs: copy(openDiffs || []),
    snapshot: {
      payrollMigrationBatchId: batch.payrollMigrationBatchId,
      status: batch.status,
      migrationMode: batch.migrationMode,
      sourceSystemCode: batch.sourceSystemCode,
      effectiveCutoverDate: batch.effectiveCutoverDate,
      firstTargetReportingPeriod: batch.firstTargetReportingPeriod,
      approvedForCutover: batch.approvedForCutover === true,
      validationSummary: copy(batch.validationSummary || {}),
      openDiffIds: (openDiffs || []).map((diff) => diff.payrollMigrationDiffId).filter(Boolean).sort(),
      openDiffCount: Array.isArray(openDiffs) ? openDiffs.length : 0
    }
  };
}

function resolvePayrollRegulatedSubmissionsPlatform({ getRegulatedSubmissionsPlatform = null, getCorePlatform = null } = {}) {
  const candidates = [
    typeof getRegulatedSubmissionsPlatform === "function" ? getRegulatedSubmissionsPlatform() : null,
    typeof getCorePlatform === "function" ? getCorePlatform() : null
  ];
  for (const candidate of candidates) {
    if (
      candidate
      && typeof candidate.prepareAuthoritySubmission === "function"
      && typeof candidate.signAuthoritySubmission === "function"
      && typeof candidate.getAuthoritySubmission === "function"
      && typeof candidate.executeAuthoritySubmissionTransport === "function"
      && typeof candidate.executeSubmissionReceiptCollection === "function"
      && typeof candidate.registerSubmissionReceipt === "function"
      && typeof candidate.openSubmissionCorrection === "function"
    ) {
      return candidate;
    }
  }
  return null;
}

function rebuildPayrollExceptions({
  state,
  run,
  employmentResults,
  collectiveAgreementsPlatform = null,
  migrationContext = null,
  actorId = "system",
  clock = () => new Date()
}) {
  for (const payrollExceptionId of state.payrollExceptionIdsByRun.get(run.payRunId) || []) {
    state.payrollExceptions.delete(payrollExceptionId);
  }
  state.payrollExceptionIdsByRun.set(run.payRunId, []);

  const seen = new Set();
  const records = [];
  const upsert = ({ employmentId = null, employeeId = null, code, message, details = {} }) => {
    const dedupeKey = `${employmentId || "run"}:${employeeId || "run"}:${code}`;
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);
    const record = createPayrollExceptionRecord({
      run,
      employmentId,
      employeeId,
      code,
      message,
      details,
      actorId,
      clock
    });
    records.push(record);
    state.payrollExceptions.set(record.payrollExceptionId, record);
    appendToIndex(state.payrollExceptionIdsByRun, run.payRunId, record.payrollExceptionId);
  };

  for (const result of employmentResults || []) {
    const employmentId = result.employment?.employmentId || null;
    const employeeId = result.employee?.employeeId || null;
    if (!result.contract) {
      upsert({
        employmentId,
        employeeId,
        code: "employment_contract_missing",
        message: `Employment ${employmentId} is missing an active contract for the payroll period.`,
        details: {
          reportingPeriod: run.reportingPeriod
        }
      });
    }
    const pendingTimeEntries = result.payrollInputPeriod?.pendingTimeEntries || result.employmentTimeBase?.pendingTimeEntries || [];
    if (pendingTimeEntries.length > 0) {
      upsert({
        employmentId,
        employeeId,
        code: "pending_time_approvals_exist",
        message: `Employment ${employmentId} has pending time entries that block payroll approval.`,
        details: {
          pendingTimeEntryIds: pendingTimeEntries.map((entry) => entry.timeEntryId).filter(Boolean).sort(),
          pendingTimeApprovalCount: pendingTimeEntries.length
        }
      });
    }
    if (result.payrollInputPeriod?.timeSetRequired === true && !result.payrollInputPeriod?.approvedTimeSet) {
      upsert({
        employmentId,
        employeeId,
        code: "approved_time_set_missing",
        message: `Employment ${employmentId} has approved time entries in the payroll period but no canonical approved time set covering the period.`,
        details: {
          reportingPeriod: run.reportingPeriod,
          periodStartsOn: run.periodStartsOn,
          periodEndsOn: run.periodEndsOn
        }
      });
    }
    const approvedTimeEntriesOutsideSet = result.payrollInputPeriod?.approvedTimeEntriesOutsideSet || [];
    if (approvedTimeEntriesOutsideSet.length > 0) {
      upsert({
        employmentId,
        employeeId,
        code: "approved_time_entries_outside_time_set",
        message: `Employment ${employmentId} has approved time entries that are not frozen by a canonical approved time set.`,
        details: {
          timeEntryIds: approvedTimeEntriesOutsideSet.map((entry) => entry.timeEntryId).filter(Boolean).sort(),
          reportingPeriod: run.reportingPeriod
        }
      });
    }
    const pendingLeaveEntries = result.payrollInputPeriod?.pendingLeaveEntries || [];
    if (pendingLeaveEntries.length > 0) {
      upsert({
        employmentId,
        employeeId,
        code: "pending_absence_approvals_exist",
        message: `Employment ${employmentId} has leave entries that still await an approved absence decision for the payroll period.`,
        details: {
          leaveEntryIds: pendingLeaveEntries.map((entry) => entry.leaveEntryId).filter(Boolean).sort(),
          reportingPeriod: run.reportingPeriod
        }
      });
    }
    const approvedLeaveEntriesWithoutDecision = result.payrollInputPeriod?.approvedLeaveEntriesWithoutDecision || [];
    if (approvedLeaveEntriesWithoutDecision.length > 0) {
      upsert({
        employmentId,
        employeeId,
        code: "absence_decision_missing",
        message: `Employment ${employmentId} has approved leave entries without a canonical absence decision.`,
        details: {
          leaveEntryIds: approvedLeaveEntriesWithoutDecision.map((entry) => entry.leaveEntryId).filter(Boolean).sort(),
          reportingPeriod: run.reportingPeriod
        }
      });
    }
    if (collectiveAgreementsPlatform) {
      if (result.agreementContext?.error) {
        upsert({
          employmentId,
          employeeId,
          code: "collective_agreement_resolution_failed",
          message: result.agreementContext.error.message,
          details: {
            eventDate: result.agreementContext.eventDate,
            errorCode: result.agreementContext.error.code
          }
        });
      } else if (!result.agreementContext?.activeAgreement || !result.agreementContext?.overlay) {
        upsert({
          employmentId,
          employeeId,
          code: "collective_agreement_missing",
          message: `Employment ${employmentId} saknar aktivt kollektivavtal eller effektiv regeloverlay for lopberakning.`,
          details: {
            eventDate: result.agreementContext?.eventDate || run.periodEndsOn,
            agreementVersionId: result.agreementContext?.activeAgreement?.agreementVersion?.agreementVersionId || null
          }
        });
      }
    }
    const netPay = Number(result.payslipRenderPayload?.totals?.netPay);
    if (Number.isFinite(netPay) && netPay < 0) {
      upsert({
        employmentId,
        employeeId,
        code: "negative_net_pay",
        message: `Employment ${employmentId} resulted in negative net pay and will create an employee receivable on approval.`,
        details: {
          netPay: roundMoney(netPay),
          employeeReceivableAmount: roundMoney(Math.abs(netPay))
        }
      });
    }
    for (const warning of result.warnings || []) {
      if (!PAYROLL_EXCEPTION_RULES[warning.code]) {
        continue;
      }
      upsert({
        employmentId,
        employeeId,
        code: warning.code,
        message: warning.message,
        details: {
          warningCode: warning.code
        }
      });
    }
  }

  if (migrationContext) {
    const blockingIssueCount = Number(migrationContext.batch?.validationSummary?.blockingIssueCount || 0);
    if (!["approved_for_cutover", "cutover_executed"].includes(migrationContext.batch?.status)) {
      upsert({
        code: "payroll_migration_batch_not_ready",
        message: `Payroll migration batch ${migrationContext.batch?.payrollMigrationBatchId} is not ready for payroll cutover.`,
        details: {
          payrollMigrationBatchId: migrationContext.batch?.payrollMigrationBatchId || null,
          payrollMigrationBatchStatus: migrationContext.batch?.status || null
        }
      });
    }
    if (blockingIssueCount > 0) {
      upsert({
        code: "payroll_migration_validation_blocking",
        message: `Payroll migration batch ${migrationContext.batch?.payrollMigrationBatchId} still has blocking validation issues.`,
        details: {
          payrollMigrationBatchId: migrationContext.batch?.payrollMigrationBatchId || null,
          blockingIssueCount,
          issues: copy(migrationContext.batch?.validationSummary?.issues || [])
        }
      });
    }
    if ((migrationContext.openDiffs || []).length > 0) {
      upsert({
        code: "payroll_migration_open_diffs",
        message: `Payroll migration batch ${migrationContext.batch?.payrollMigrationBatchId} has unresolved migration diffs.`,
        details: {
          payrollMigrationBatchId: migrationContext.batch?.payrollMigrationBatchId || null,
          openDiffIds: migrationContext.openDiffs.map((diff) => diff.payrollMigrationDiffId).filter(Boolean).sort(),
          openDiffCount: migrationContext.openDiffs.length
        }
      });
    }
  }

  run.exceptionSummary = summarizePayrollExceptions(records);
  run.updatedAt = nowIso(clock);
  return records.map(copy);
}

function createPayrollExceptionRecord({ run, employmentId = null, employeeId = null, code, message, details = {}, actorId, clock }) {
  const rule = PAYROLL_EXCEPTION_RULES[requireText(code, "payroll_exception_code_required")];
  if (!rule) {
    throw createError(500, "payroll_exception_rule_missing", `Payroll exception rule ${code} is not configured.`);
  }
  const now = nowIso(clock);
  return {
    payrollExceptionId: crypto.randomUUID(),
    companyId: run.companyId,
    payRunId: run.payRunId,
    reportingPeriod: run.reportingPeriod,
    employmentId: normalizeOptionalText(employmentId),
    employeeId: normalizeOptionalText(employeeId),
    code,
    message: requireText(message, "payroll_exception_message_required"),
    severity: rule.severity,
    blocking: rule.blocking === true,
    resolutionPolicy: rule.resolutionPolicy,
    status: "open",
    details: copy(details || {}),
    createdByActorId: requireText(actorId, "actor_id_required"),
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    resolvedByActorId: null,
    resolutionNote: null
  };
}

function summarizePayrollExceptions(exceptions) {
  const records = Array.isArray(exceptions) ? exceptions : [];
  return {
    totalCount: records.length,
    openCount: records.filter((record) => record.status === "open").length,
    blockingOpenCount: records.filter((record) => record.status === "open" && record.blocking === true).length,
    resolvedCount: records.filter((record) => record.status === "resolved").length,
    waivedCount: records.filter((record) => record.status === "waived").length
  };
}

function listPayrollExceptionsFromState(state, payRunId) {
  return (state.payrollExceptionIdsByRun.get(payRunId) || [])
    .map((payrollExceptionId) => state.payrollExceptions.get(payrollExceptionId))
    .filter(Boolean)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.code.localeCompare(right.code));
}

function requirePayrollException(state, companyId, payRunId, payrollExceptionId) {
  requirePayRun(state, companyId, payRunId);
  const record = state.payrollExceptions.get(requireText(payrollExceptionId, "payroll_exception_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.payRunId !== payRunId) {
    throw createError(404, "payroll_exception_not_found", "Payroll exception was not found.");
  }
  return record;
}

function createStoredPayslip({ companyId, payRunId, period, runType, result, generatedByActorId, generatedAt }) {
  const renderPayload = sanitizeStoredPayslipRenderPayload({
    reportingPeriod: period.reportingPeriod,
    payDate: period.payDate,
    runType,
    employee: result.employee,
    employment: result.employment,
    contract: result.contract,
    lines: result.lines,
    balances: result.payslipRenderPayload.balances,
    totals: result.payslipRenderPayload.totals,
    warnings: result.warnings,
    executionBoundary: result.payslipRenderPayload.executionBoundary || null,
    watermark: result.payslipRenderPayload.watermark || null,
    agiPreview: result.payslipRenderPayload.agiPreview || null,
    postingIntentPreview: result.payslipRenderPayload.postingIntentPreview || null,
    bankPaymentPreview: result.payslipRenderPayload.bankPaymentPreview || null
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

function registerExternalPayrollConsumption({
  state,
  payRun,
  line,
  clock,
  actorId,
  stage,
  benefitsPlatform,
  travelPlatform,
  pensionPlatform
}) {
  if (!payRun || !line?.sourceId) {
    return;
  }
  if (line.sourceType?.startsWith("document_classification_")) {
    registerDocumentClassificationPayrollConsumption({
      state,
      clock,
      companyId: payRun.companyId,
      treatmentIntentId: line.sourceId,
      payRunId: payRun.payRunId,
      payRunLineId: line.payRunLineId,
      payItemCode: line.payItemCode,
      processingStep: line.processingStep,
      sourceType: line.sourceType,
      amount: line.amount,
      sourceSnapshotHash: payRun.sourceSnapshotHash,
      stage,
      actorId
    });
    return;
  }
  if (
    (line.sourceType === "benefit_event" || line.sourceType === "benefit_net_deduction") &&
    typeof benefitsPlatform?.registerBenefitPayrollConsumption === "function"
  ) {
    benefitsPlatform.registerBenefitPayrollConsumption({
      companyId: payRun.companyId,
      benefitEventId: line.sourceId,
      payRunId: payRun.payRunId,
      payRunLineId: line.payRunLineId,
      payItemCode: line.payItemCode,
      processingStep: line.processingStep,
      sourceType: line.sourceType,
      amount: line.amount,
      sourceSnapshotHash: payRun.sourceSnapshotHash,
      stage,
      actorId
    });
    return;
  }
  if (line.sourceType === "travel_claim" && typeof travelPlatform?.registerTravelPayrollConsumption === "function") {
    travelPlatform.registerTravelPayrollConsumption({
      companyId: payRun.companyId,
      travelClaimId: line.sourceId,
      payRunId: payRun.payRunId,
      payRunLineId: line.payRunLineId,
      payItemCode: line.payItemCode,
      processingStep: line.processingStep,
      sourceType: line.sourceType,
      amount: line.amount,
      sourceSnapshotHash: payRun.sourceSnapshotHash,
      stage,
      actorId
    });
    return;
  }
  if (
    ["pension_event", "salary_exchange_agreement", "pension_basis_snapshot"].includes(line.sourceType) &&
    typeof pensionPlatform?.registerPensionPayrollConsumption === "function"
  ) {
    pensionPlatform.registerPensionPayrollConsumption({
      companyId: payRun.companyId,
      sourceType: line.sourceType,
      sourceId: line.sourceId,
      payRunId: payRun.payRunId,
      payRunLineId: line.payRunLineId,
      payItemCode: line.payItemCode,
      processingStep: line.processingStep,
      amount: line.amount,
      sourceSnapshotHash: payRun.sourceSnapshotHash,
      stage,
      actorId
    });
  }
}

function applyApprovedVacationBalanceConsumptions({ state, payRun, actorId = "system", balancesPlatform = null }) {
  if (!balancesPlatform?.recordBalanceTransaction || !payRun?.payrollInputSnapshotId) {
    return;
  }
  const payrollInputSnapshot = state.payrollInputSnapshots.get(payRun.payrollInputSnapshotId);
  const sourceSnapshot = payrollInputSnapshot?.sourceSnapshot;
  if (!sourceSnapshot || typeof sourceSnapshot !== "object") {
    return;
  }

  for (const [employmentId, employmentSnapshot] of Object.entries(sourceSnapshot)) {
    const vacationComputation = employmentSnapshot?.vacationPayrollComputation;
    const vacationBalance = employmentSnapshot?.vacationBalance;
    if (!vacationComputation || !vacationBalance || !Array.isArray(vacationComputation.allocations)) {
      continue;
    }
    for (const allocation of vacationComputation.allocations) {
      if (!allocation || !["paid", "saved"].includes(allocation.balanceBucket) || Number(allocation.quantityDays || 0) <= 0) {
        continue;
      }
      const balanceAccountId =
        allocation.balanceBucket === "paid"
          ? vacationBalance.paidDaysBalanceAccountId
          : vacationBalance.savedDaysBalanceAccountId;
      if (!balanceAccountId) {
        throw createError(
          409,
          "vacation_balance_account_missing",
          `Vacation ${allocation.balanceBucket} day balance account is missing for ${employmentId}.`
        );
      }
      balancesPlatform.recordBalanceTransaction({
        companyId: payRun.companyId,
        balanceAccountId,
        effectiveDate: allocation.date,
        transactionTypeCode: "spend",
        quantityDelta: roundQuantity(-Number(allocation.quantityDays || 0)),
        sourceDomainCode: "PAYROLL",
        sourceObjectType: "pay_run",
        sourceObjectId: payRun.payRunId,
        sourceReference: `vacation_${allocation.balanceBucket}:${allocation.date}`,
        idempotencyKey: `${payRun.payRunId}:${employmentId}:${allocation.balanceBucket}:${allocation.date}:${roundQuantity(allocation.quantityDays)}`,
        explanation: `Approved payroll consumed ${allocation.quantityDays} ${allocation.balanceBucket} vacation day(s) for ${allocation.date}.`,
        actorId
      });
    }
  }
}

function registerDocumentClassificationPayrollConsumption({
  state,
  clock,
  companyId,
  treatmentIntentId,
  payRunId,
  payRunLineId,
  payItemCode,
  processingStep,
  sourceType,
  amount,
  sourceSnapshotHash = null,
  stage = "calculated",
  actorId = "system"
}) {
  const payload = requireDocumentClassificationPayload(state, companyId, treatmentIntentId);
  const resolvedStage = assertAllowed(stage, PAYROLL_EXTERNAL_CONSUMPTION_STAGES, "document_classification_payroll_consumption_stage_invalid");
  const resolvedPayRunId = requireText(payRunId, "document_classification_payroll_consumption_pay_run_id_required");
  const resolvedPayRunLineId = requireText(payRunLineId, "document_classification_payroll_consumption_pay_run_line_id_required");
  const resolvedPayItemCode = requireText(payItemCode, "document_classification_payroll_consumption_pay_item_code_required");
  const resolvedProcessingStep = normalizeProcessingStep(processingStep, payload.payLinePayloadJson?.compensationBucket || null);
  const resolvedAmount = normalizeRequiredMoney(amount, "document_classification_payroll_consumption_amount_invalid");
  const resolvedActorId = requireText(actorId, "actor_id_required");
  const now = nowIso(clock);
  const existingId = state.documentClassificationConsumptionIdByKey.get(resolvedPayRunLineId);
  const existing = existingId ? state.documentClassificationConsumptions.get(existingId) : null;
  if (existing) {
    existing.stage = existing.stage === "approved" || resolvedStage === "approved" ? "approved" : "calculated";
    existing.amount = resolvedAmount;
    existing.sourceType = requireText(sourceType, "document_classification_payroll_consumption_source_type_required");
    existing.sourceSnapshotHash = normalizeOptionalText(sourceSnapshotHash);
    existing.updatedAt = now;
    if (existing.stage === "approved" && !existing.approvedAt) {
      existing.approvedAt = now;
      existing.approvedByActorId = resolvedActorId;
    }
    payload.status = existing.stage;
    payload.updatedAt = now;
    payload.updatedByActorId = resolvedActorId;
    return copy(existing);
  }

  const record = {
    documentClassificationPayrollConsumptionId: crypto.randomUUID(),
    documentClassificationPayrollPayloadId: payload.documentClassificationPayrollPayloadId,
    treatmentIntentId: payload.treatmentIntentId,
    companyId: payload.companyId,
    employeeId: payload.employeeId,
    employmentId: payload.employmentId,
    payRunId: resolvedPayRunId,
    payRunLineId: resolvedPayRunLineId,
    payItemCode: resolvedPayItemCode,
    processingStep: resolvedProcessingStep,
    sourceType: requireText(sourceType, "document_classification_payroll_consumption_source_type_required"),
    amount: resolvedAmount,
    sourceSnapshotHash: normalizeOptionalText(sourceSnapshotHash),
    stage: resolvedStage,
    calculatedAt: now,
    calculatedByActorId: resolvedActorId,
    approvedAt: resolvedStage === "approved" ? now : null,
    approvedByActorId: resolvedStage === "approved" ? resolvedActorId : null,
    updatedAt: now
  };
  state.documentClassificationConsumptions.set(record.documentClassificationPayrollConsumptionId, record);
  appendToIndex(
    state.documentClassificationConsumptionIdsByIntent,
    payload.treatmentIntentId,
    record.documentClassificationPayrollConsumptionId
  );
  state.documentClassificationConsumptionIdByKey.set(resolvedPayRunLineId, record.documentClassificationPayrollConsumptionId);
  payload.status = resolvedStage;
  payload.updatedAt = now;
  payload.updatedByActorId = resolvedActorId;
  return copy(record);
}

function presentDocumentClassificationPayload(state, record) {
  const consumptions = listDocumentClassificationConsumptions(state, record.treatmentIntentId);
  return copy({
    ...record,
    consumptions,
    dispatchStatus: summarizeDocumentClassificationConsumptions(consumptions)
  });
}

function listDocumentClassificationPayloadBundleFromState(state, { companyId, employmentId = null, reportingPeriod = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const scopedIds = employmentId
    ? state.documentClassificationPayloadIdsByEmployment.get(buildPayrollEmploymentKey(resolvedCompanyId, requireText(employmentId, "employment_id_required"))) || []
    : state.documentClassificationPayloadIdsByCompany.get(resolvedCompanyId) || [];
  const resolvedReportingPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid") : null;
  const payloads = scopedIds
    .map((payloadId) => state.documentClassificationPayloads.get(payloadId))
    .filter(Boolean)
    .filter((payload) => payload.status !== "reversed")
    .filter((payload) => (resolvedReportingPeriod ? payload.reportingPeriod === resolvedReportingPeriod : true))
    .filter((payload) => !hasApprovedDocumentClassificationConsumption(state, payload.treatmentIntentId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((payload) => presentDocumentClassificationPayload(state, payload));
  return {
    payloads,
    payLinePayloads: payloads.map((payload) => copy(payload.payLinePayloadJson)),
    warnings: []
  };
}

function listDocumentClassificationConsumptions(state, treatmentIntentId) {
  return (state.documentClassificationConsumptionIdsByIntent.get(treatmentIntentId) || [])
    .map((consumptionId) => state.documentClassificationConsumptions.get(consumptionId))
    .filter(Boolean)
    .map(copy);
}

function summarizeDocumentClassificationConsumptions(consumptions) {
  const items = Array.isArray(consumptions) ? consumptions : [];
  return {
    totalCount: items.length,
    calculatedCount: items.filter((record) => record.stage === "calculated").length,
    approvedCount: items.filter((record) => record.stage === "approved").length,
    latestStage: items.some((record) => record.stage === "approved") ? "approved" : items.length > 0 ? "calculated" : "not_dispatched",
    payRunIds: Array.from(new Set(items.map((record) => record.payRunId))).sort()
  };
}

function hasApprovedDocumentClassificationConsumption(state, treatmentIntentId) {
  return listDocumentClassificationConsumptions(state, treatmentIntentId).some((record) => record.stage === "approved");
}

function requireDocumentClassificationPayload(state, companyId, treatmentIntentId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedTreatmentIntentId = requireText(treatmentIntentId, "treatment_intent_id_required");
  const payloadId = state.documentClassificationPayloadIdByIntent.get(resolvedTreatmentIntentId);
  const payload = payloadId ? state.documentClassificationPayloads.get(payloadId) || null : null;
  if (!payload || payload.companyId !== resolvedCompanyId) {
    throw createError(404, "document_classification_payroll_payload_not_found", "Document classification payroll payload was not found.");
  }
  return payload;
}

function normalizeDocumentClassificationPayrollPayload({
  companyId,
  employeeId,
  employmentId,
  reportingPeriod,
  sourceType,
  sourceId,
  amount,
  payLinePayloadJson,
  state
}) {
  const payload = copy(payLinePayloadJson || {});
  payload.employmentId = requireText(payload.employmentId || employmentId, "document_classification_payroll_employment_id_required");
  payload.amount = normalizeRequiredMoney(payload.amount ?? amount, "document_classification_payroll_amount_invalid");
  payload.processingStep = normalizeProcessingStep(payload.processingStep, null);
  payload.payItemCode = normalizeCode(payload.payItemCode, "document_classification_payroll_pay_item_required");
  requirePayItemByCode(state, companyId, payload.payItemCode);
  payload.sourceType = requireText(payload.sourceType || sourceType, "document_classification_payroll_source_type_required");
  payload.sourceId = normalizeOptionalText(payload.sourceId) || requireText(sourceId, "document_classification_payroll_source_id_required");
  payload.sourcePeriod =
    normalizeOptionalReportingPeriod(payload.sourcePeriod) ||
    normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid");
  payload.note = normalizeOptionalText(payload.note);
  payload.dimensionJson = normalizePayrollDimensions(payload.dimensionJson || {});
  if (employeeId) {
    payload.employeeId = requireText(employeeId, "employee_id_required");
  }
  return {
    reportingPeriod: payload.sourcePeriod,
    payLinePayloadJson: payload
  };
}

function buildPayrollEmploymentKey(companyId, employmentId) {
  return `${companyId}:${employmentId}`;
}

function requireTaxDecisionSnapshot(state, companyId, taxDecisionSnapshotId) {
  const record = state.taxDecisionSnapshots.get(requireText(taxDecisionSnapshotId, "tax_decision_snapshot_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "tax_decision_snapshot_not_found", "Tax decision snapshot was not found.");
  }
  return record;
}

function requireEmployerContributionDecisionSnapshot(state, companyId, employerContributionDecisionSnapshotId) {
  const record = state.employerContributionDecisionSnapshots.get(
    requireText(employerContributionDecisionSnapshotId, "employer_contribution_decision_snapshot_id_required")
  );
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(
      404,
      "employer_contribution_decision_snapshot_not_found",
      "Employer contribution decision snapshot was not found."
    );
  }
  return record;
}

function requireGarnishmentDecisionSnapshot(state, companyId, garnishmentDecisionSnapshotId) {
  const record = state.garnishmentDecisionSnapshots.get(
    requireText(garnishmentDecisionSnapshotId, "garnishment_decision_snapshot_id_required")
  );
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "garnishment_decision_snapshot_not_found", "Garnishment decision snapshot was not found.");
  }
  return record;
}

function requireRemittanceInstruction(state, companyId, remittanceInstructionId) {
  const record = state.remittanceInstructions.get(
    requireText(remittanceInstructionId, "remittance_instruction_id_required")
  );
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "remittance_instruction_not_found", "Remittance instruction was not found.");
  }
  return record;
}

function requireEmployeeReceivable(state, companyId, employeeReceivableId) {
  const record = state.employeeReceivables.get(requireText(employeeReceivableId, "employee_receivable_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "employee_receivable_not_found", "Employee receivable was not found.");
  }
  return record;
}

function requireReceivableWriteOffDecision(state, companyId, receivableWriteOffDecisionId) {
  const record = state.receivableWriteOffDecisions.get(
    requireText(receivableWriteOffDecisionId, "receivable_write_off_decision_id_required")
  );
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "receivable_write_off_decision_not_found", "Employee receivable write-off decision was not found.");
  }
  return record;
}

function decisionSnapshotCoversDate(snapshot, effectiveDate) {
  const resolvedDate = normalizeRequiredDate(effectiveDate, "tax_decision_snapshot_effective_date_invalid");
  return (
    snapshot.validFrom <= resolvedDate
    && (!snapshot.validTo || snapshot.validTo >= resolvedDate)
    && (!snapshot.overrideEndsOn || snapshot.overrideEndsOn >= resolvedDate)
  );
}

function supersedeOverlappingTaxDecisionSnapshots(state, approvedSnapshot) {
  const scopeKey = buildPayrollEmploymentKey(approvedSnapshot.companyId, approvedSnapshot.employmentId);
  for (const taxDecisionSnapshotId of state.taxDecisionSnapshotIdsByEmployment.get(scopeKey) || []) {
    const candidate = state.taxDecisionSnapshots.get(taxDecisionSnapshotId);
    if (!candidate || candidate.taxDecisionSnapshotId === approvedSnapshot.taxDecisionSnapshotId) {
      continue;
    }
    if (candidate.status !== "approved" || candidate.decisionType !== approvedSnapshot.decisionType) {
      continue;
    }
    if (!intervalsOverlap(candidate.validFrom, candidate.validTo, approvedSnapshot.validFrom, approvedSnapshot.validTo)) {
      continue;
    }
    candidate.status = "superseded";
    candidate.supersededAt = approvedSnapshot.approvedAt || approvedSnapshot.updatedAt;
    candidate.supersededBySnapshotId = approvedSnapshot.taxDecisionSnapshotId;
    candidate.updatedAt = candidate.supersededAt;
  }
}

function supersedeOverlappingEmployerContributionDecisionSnapshots(state, approvedSnapshot) {
  const scopeKey = buildPayrollEmploymentKey(approvedSnapshot.companyId, approvedSnapshot.employmentId);
  for (const employerContributionDecisionSnapshotId of state.employerContributionDecisionSnapshotIdsByEmployment.get(scopeKey) || []) {
    const candidate = state.employerContributionDecisionSnapshots.get(employerContributionDecisionSnapshotId);
    if (
      !candidate
      || candidate.employerContributionDecisionSnapshotId === approvedSnapshot.employerContributionDecisionSnapshotId
    ) {
      continue;
    }
    if (candidate.status !== "approved" || candidate.decisionType !== approvedSnapshot.decisionType) {
      continue;
    }
    if (!intervalsOverlap(candidate.validFrom, candidate.validTo, approvedSnapshot.validFrom, approvedSnapshot.validTo)) {
      continue;
    }
    candidate.status = "superseded";
    candidate.supersededAt = approvedSnapshot.approvedAt || approvedSnapshot.updatedAt;
    candidate.supersededBySnapshotId = approvedSnapshot.employerContributionDecisionSnapshotId;
    candidate.updatedAt = candidate.supersededAt;
  }
}

function supersedeOverlappingGarnishmentDecisionSnapshots(state, approvedSnapshot) {
  const scopeKey = buildPayrollEmploymentKey(approvedSnapshot.companyId, approvedSnapshot.employmentId);
  for (const garnishmentDecisionSnapshotId of state.garnishmentDecisionSnapshotIdsByEmployment.get(scopeKey) || []) {
    const candidate = state.garnishmentDecisionSnapshots.get(garnishmentDecisionSnapshotId);
    if (!candidate || candidate.garnishmentDecisionSnapshotId === approvedSnapshot.garnishmentDecisionSnapshotId) {
      continue;
    }
    if (candidate.status !== "approved" || candidate.decisionType !== approvedSnapshot.decisionType) {
      continue;
    }
    if (!intervalsOverlap(candidate.validFrom, candidate.validTo, approvedSnapshot.validFrom, approvedSnapshot.validTo)) {
      continue;
    }
    candidate.status = "superseded";
    candidate.supersededAt = approvedSnapshot.approvedAt || approvedSnapshot.updatedAt;
    candidate.supersededBySnapshotId = approvedSnapshot.garnishmentDecisionSnapshotId;
    candidate.updatedAt = candidate.supersededAt;
  }
}

function intervalsOverlap(leftFrom, leftTo, rightFrom, rightTo) {
  const leftEnd = leftTo || "9999-12-31";
  const rightEnd = rightTo || "9999-12-31";
  return leftFrom <= rightEnd && rightFrom <= leftEnd;
}

function selectTaxDecisionSnapshot({
  state,
  companyId,
  employmentId,
  effectiveDate,
  runType,
  overrideSnapshots = new Map()
}) {
  const override = overrideSnapshots.get(employmentId) || null;
  if (override && decisionSnapshotCoversDate(override, effectiveDate)) {
    return {
      ...copy(override),
      taxDecisionSnapshotId: override.taxDecisionSnapshotId || buildSnapshotHash({
        companyId,
        employmentId,
        effectiveDate,
        decisionType: override.decisionType,
        decisionReference: override.decisionReference,
        evidenceRef: override.evidenceRef
      }),
      companyId,
      status: override.status || (override.decisionType === "emergency_manual" ? "draft" : "approved")
    };
  }
  const candidates = listApprovedTaxDecisionSnapshotsForEmployment(state, companyId, employmentId, effectiveDate);
  const preferredTypes =
    runType === "extra" || runType === "correction" || runType === "final"
      ? ["engangsskatt", "sink", "asink", "a_sink", "jamkning_fast", "jamkning_procent", "jamkning", "tabell", "emergency_manual"]
      : ["sink", "asink", "a_sink", "jamkning_fast", "jamkning_procent", "jamkning", "tabell", "engangsskatt", "emergency_manual"];
  for (const decisionType of preferredTypes) {
    const match = candidates.find((candidate) => candidate.decisionType === decisionType);
    if (match) {
      return copy(match);
    }
  }
  return null;
}

function selectEmployerContributionDecisionSnapshot({
  state,
  companyId,
  employmentId,
  effectiveDate,
  overrideSnapshots = new Map()
}) {
  const override = overrideSnapshots.get(employmentId) || null;
  if (override && decisionSnapshotCoversDate(override, effectiveDate)) {
    return {
      ...copy(override),
      employerContributionDecisionSnapshotId: override.employerContributionDecisionSnapshotId || buildSnapshotHash({
        companyId,
        employmentId,
        effectiveDate,
        decisionType: override.decisionType,
        decisionReference: override.decisionReference,
        evidenceRef: override.evidenceRef
      }),
      companyId,
      status:
        override.status
        || (override.decisionType === "vaxa" || override.decisionType === "emergency_manual" ? "draft" : "approved")
    };
  }
  const candidates = listApprovedEmployerContributionDecisionSnapshotsForEmployment(
    state,
    companyId,
    employmentId,
    effectiveDate
  );
  return candidates.length > 0 ? copy(candidates[candidates.length - 1]) : null;
}

function selectGarnishmentDecisionSnapshot({
  state,
  companyId,
  employmentId,
  effectiveDate,
  overrideSnapshots = new Map()
}) {
  const override = overrideSnapshots.get(employmentId) || null;
  if (override && decisionSnapshotCoversDate(override, effectiveDate)) {
    return {
      ...copy(override),
      garnishmentDecisionSnapshotId: override.garnishmentDecisionSnapshotId || buildSnapshotHash({
        companyId,
        employmentId,
        effectiveDate,
        decisionType: override.decisionType,
        decisionReference: override.decisionReference,
        evidenceRef: override.evidenceRef
      }),
      companyId,
      status: override.status || (override.decisionType === "manual_override" ? "draft" : "approved")
    };
  }
  const candidates = listApprovedGarnishmentDecisionSnapshotsForEmployment(state, companyId, employmentId, effectiveDate);
  return candidates.length > 0 ? copy(candidates[candidates.length - 1]) : null;
}

function listApprovedTaxDecisionSnapshotsForEmployment(state, companyId, employmentId, effectiveDate) {
  const scopeKey = buildPayrollEmploymentKey(requireText(companyId, "company_id_required"), requireText(employmentId, "employment_id_required"));
  return (state.taxDecisionSnapshotIdsByEmployment.get(scopeKey) || [])
    .map((taxDecisionSnapshotId) => state.taxDecisionSnapshots.get(taxDecisionSnapshotId))
    .filter(Boolean)
    .filter((candidate) => candidate.status === "approved")
    .filter((candidate) => decisionSnapshotCoversDate(candidate, effectiveDate))
    .sort((left, right) => left.validFrom.localeCompare(right.validFrom) || left.createdAt.localeCompare(right.createdAt));
}

function listApprovedEmployerContributionDecisionSnapshotsForEmployment(state, companyId, employmentId, effectiveDate) {
  const scopeKey = buildPayrollEmploymentKey(requireText(companyId, "company_id_required"), requireText(employmentId, "employment_id_required"));
  return (state.employerContributionDecisionSnapshotIdsByEmployment.get(scopeKey) || [])
    .map((employerContributionDecisionSnapshotId) => state.employerContributionDecisionSnapshots.get(employerContributionDecisionSnapshotId))
    .filter(Boolean)
    .filter((candidate) => candidate.status === "approved")
    .filter((candidate) => decisionSnapshotCoversDate(candidate, effectiveDate))
    .sort((left, right) => left.validFrom.localeCompare(right.validFrom) || left.createdAt.localeCompare(right.createdAt));
}

function listApprovedGarnishmentDecisionSnapshotsForEmployment(state, companyId, employmentId, effectiveDate) {
  const scopeKey = buildPayrollEmploymentKey(requireText(companyId, "company_id_required"), requireText(employmentId, "employment_id_required"));
  return (state.garnishmentDecisionSnapshotIdsByEmployment.get(scopeKey) || [])
    .map((garnishmentDecisionSnapshotId) => state.garnishmentDecisionSnapshots.get(garnishmentDecisionSnapshotId))
    .filter(Boolean)
    .filter((candidate) => candidate.status === "approved")
    .filter((candidate) => decisionSnapshotCoversDate(candidate, effectiveDate))
    .sort((left, right) => left.validFrom.localeCompare(right.validFrom) || left.createdAt.localeCompare(right.createdAt));
}

function createPayrollInputSnapshotRecord({
  run,
  sourceSnapshot,
  agreementSnapshots,
  balanceSnapshots,
  actorId,
  clock
}) {
  const decisionSnapshotHash = buildSnapshotHash(run.decisionSnapshotRefs || []);
  const model = {
    companyId: run.companyId,
    payRunId: run.payRunId,
    payCalendarId: run.payCalendarId,
    payCalendarCode: run.payCalendarCode,
    reportingPeriod: run.reportingPeriod,
    periodStartsOn: run.periodStartsOn,
    periodEndsOn: run.periodEndsOn,
    payDate: run.payDate,
    runType: run.runType,
    employmentIds: copy(run.employmentIds || []),
    migrationBatchId: run.migrationBatchId,
    migrationSnapshot: copy(run.migrationSnapshot || null),
    correctionOfPayRunId: run.correctionOfPayRunId,
    correctionReason: run.correctionReason,
    executionBoundary: copy(run.executionBoundary || null),
    sourceSnapshot: copy(sourceSnapshot || {}),
    agreementSnapshots: copy(agreementSnapshots || []),
    balanceSnapshots: copy(balanceSnapshots || []),
    rulepackRefs: copy(run.rulepackRefs || []),
    providerBaselineRefs: copy(run.providerBaselineRefs || []),
    decisionSnapshotRefs: copy(run.decisionSnapshotRefs || []),
    sourceSnapshotHash: run.sourceSnapshotHash,
    balanceSnapshotHash: run.balanceSnapshotHash,
    agreementSnapshotHash: run.agreementSnapshotHash,
    decisionSnapshotHash
  };
  return {
    payrollInputSnapshotId: crypto.randomUUID(),
    ...model,
    inputFingerprint: buildSnapshotHash(model),
    lockedAt: nowIso(clock),
    lockedByActorId: requireText(actorId, "actor_id_required")
  };
}

function buildPayrollEmploymentPreviewHash(employmentResults = [], previewKey) {
  return buildSnapshotHash(
    (employmentResults || [])
      .map((result) => ({
        payload: sanitizePayrollPreviewPayloadForHash(copy(result?.payslipRenderPayload?.[previewKey] || null))
      }))
      .sort((left, right) => {
        const leftKey = stableStringify(left.payload);
        const rightKey = stableStringify(right.payload);
        return leftKey.localeCompare(rightKey);
      })
  );
}

function sanitizePayrollPreviewPayloadForHash(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePayrollPreviewPayloadForHash(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const sanitized = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (key === "employeeId" || key === "employmentId" || key === "payRunId" || key === "payslipId") {
      continue;
    }
    sanitized[key] = sanitizePayrollPreviewPayloadForHash(candidate);
  }
  return sanitized;
}

function buildPayRunFingerprint({ state, run }) {
  return buildSnapshotHash({
    payRunId: run.payRunId,
    payrollInputSnapshotId: run.payrollInputSnapshotId,
    payrollInputFingerprint: run.payrollInputFingerprint,
    reportingPeriod: run.reportingPeriod,
    payDate: run.payDate,
    runType: run.runType,
    executionBoundary: copy(run.executionBoundary || null),
    postingIntentSnapshotHash: run.postingIntentSnapshotHash || "",
    bankPaymentSnapshotHash: run.bankPaymentSnapshotHash || "",
    warningCodes: copy(run.warningCodes || []),
    rulepackRefs: copy(run.rulepackRefs || []),
    providerBaselineRefs: copy(run.providerBaselineRefs || []),
    decisionSnapshotRefs: copy(run.decisionSnapshotRefs || []),
    calculationSteps: copy(run.calculationSteps || []),
    lines: (state.payRunLineIdsByRun.get(run.payRunId) || [])
      .map((lineId) => state.payRunLines.get(lineId))
      .filter(Boolean)
      .map((line) => ({
        employmentId: line.employmentId,
        payItemCode: line.payItemCode,
        amount: line.amount,
        quantity: line.quantity,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
        calculationStatus: line.calculationStatus,
        dimensionJson: copy(line.dimensionJson || {})
      }))
      .sort((left, right) => {
        const leftKey = `${left.employmentId}:${left.payItemCode}:${left.sourceType || ""}:${left.sourceId || ""}:${stableStringify(left.dimensionJson)}`;
        const rightKey = `${right.employmentId}:${right.payItemCode}:${right.sourceType || ""}:${right.sourceId || ""}:${stableStringify(right.dimensionJson)}`;
        return leftKey.localeCompare(rightKey);
      }),
    payslipSnapshotHashes: (state.payslipIdsByRun.get(run.payRunId) || [])
      .map((payslipId) => state.payslips.get(payslipId))
      .filter(Boolean)
      .map((payslip) => ({
        payslipId: payslip.payslipId,
        employmentId: payslip.employmentId,
        snapshotHash: payslip.snapshotHash
      }))
      .sort((left, right) => left.employmentId.localeCompare(right.employmentId)),
    exceptionSnapshots: listPayrollExceptionsFromState(state, run.payRunId)
      .map((exception) => ({
        code: exception.code,
        employmentId: exception.employmentId,
        employeeId: exception.employeeId,
        severity: exception.severity,
        blocking: exception.blocking,
        resolutionPolicy: exception.resolutionPolicy,
        details: copy(exception.details || {})
      }))
      .sort((left, right) => {
        const leftKey = `${left.code}:${left.employmentId || ""}:${left.employeeId || ""}`;
        const rightKey = `${right.code}:${right.employmentId || ""}:${right.employeeId || ""}`;
        return leftKey.localeCompare(rightKey);
      })
  });
}

function enrichPayRun(state, payRun, { evidencePlatform = null } = {}) {
  const exceptions = listPayrollExceptionsFromState(state, payRun.payRunId).map(copy);
  const payrollInputSnapshot = payRun.payrollInputSnapshotId
    ? state.payrollInputSnapshots.get(payRun.payrollInputSnapshotId) || null
    : null;
  const approvalEvidenceBundle =
    payRun.approvalEvidenceBundleId && typeof evidencePlatform?.getEvidenceBundle === "function"
      ? evidencePlatform.getEvidenceBundle({
          companyId: payRun.companyId,
          evidenceBundleId: payRun.approvalEvidenceBundleId
        })
      : null;
  const remittanceInstructions = (state.remittanceInstructionIdsByRun.get(payRun.payRunId) || [])
    .map((remittanceInstructionId) => state.remittanceInstructions.get(remittanceInstructionId))
    .filter(Boolean)
    .sort((left, right) => left.employmentId.localeCompare(right.employmentId) || left.createdAt.localeCompare(right.createdAt))
    .map((record) => presentRemittanceInstruction(state, record));
  const employeeReceivables = (state.employeeReceivableIdsByRun.get(payRun.payRunId) || [])
    .map((employeeReceivableId) => state.employeeReceivables.get(employeeReceivableId))
    .filter(Boolean)
    .sort((left, right) => left.employmentId.localeCompare(right.employmentId) || left.createdAt.localeCompare(right.createdAt))
    .map((record) => presentEmployeeReceivable(state, record));
  const receivableSettlementPlans = employeeReceivables
    .map((receivable) => state.receivableSettlementPlanIdByReceivable.get(receivable.employeeReceivableId))
    .filter(Boolean)
    .map((receivableSettlementPlanId) => state.receivableSettlementPlans.get(receivableSettlementPlanId))
    .filter(Boolean)
    .map((record) => presentReceivableSettlementPlan(state, record));
  const receivableOffsetDecisions = (state.receivableOffsetDecisionIdsByCompany.get(payRun.companyId) || [])
    .map((receivableOffsetDecisionId) => state.receivableOffsetDecisions.get(receivableOffsetDecisionId))
    .filter(Boolean)
    .filter((record) => record.executedPayRunId === payRun.payRunId || record.reportingPeriod === payRun.reportingPeriod)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(copy);
  return {
    ...copy(payRun),
    approvalEvidenceBundle,
    payrollInputSnapshot: payrollInputSnapshot ? copy(payrollInputSnapshot) : null,
    exceptionSummary: summarizePayrollExceptions(exceptions),
    exceptions,
    employeeReceivables,
    employeeReceivableSummary: summarizeEmployeeReceivables(employeeReceivables),
    receivableSettlementPlans,
    receivableOffsetDecisions,
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
      remittanceInstructions,
      remittanceSummary: summarizeRemittanceInstructions(remittanceInstructions),
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

function aggregateTimeEntriesByDimensions(timeEntries) {
  const groups = new Map();
  for (const entry of Array.isArray(timeEntries) ? timeEntries : []) {
    for (const fragment of splitTimeEntryByPayrollDimensions(entry)) {
      const key = stableStringify(fragment.dimensionJson);
      const current = groups.get(key) || {
        dimensionJson: fragment.dimensionJson,
        timeEntryIds: [],
        workedMinutes: 0,
        overtimeMinutes: 0,
        obMinutes: 0,
        jourMinutes: 0,
        standbyMinutes: 0
      };
      current.timeEntryIds.push(...fragment.timeEntryIds);
      current.workedMinutes += fragment.workedMinutes;
      current.overtimeMinutes += fragment.overtimeMinutes;
      current.obMinutes += fragment.obMinutes;
      current.jourMinutes += fragment.jourMinutes;
      current.standbyMinutes += fragment.standbyMinutes;
      groups.set(key, current);
    }
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      timeEntryIds: [...new Set(group.timeEntryIds)].sort()
    }))
    .sort((left, right) => stableStringify(left.dimensionJson).localeCompare(stableStringify(right.dimensionJson)));
}

function splitTimeEntryByPayrollDimensions(entry) {
  const workedMinutes = toNonNegativePayrollMinuteValue(entry?.workedMinutes);
  const dimensionAllocations = listTimeEntryPayrollDimensionAllocations(entry);
  if (dimensionAllocations.length === 0 || workedMinutes <= 0) {
    return [{
      dimensionJson: normalizePayrollDimensions({
        projectId: entry?.projectId
      }),
      timeEntryIds: [entry?.timeEntryId].filter(Boolean),
      workedMinutes,
      overtimeMinutes: toNonNegativePayrollMinuteValue(entry?.overtimeMinutes),
      obMinutes: toNonNegativePayrollMinuteValue(entry?.obMinutes),
      jourMinutes: toNonNegativePayrollMinuteValue(entry?.jourMinutes),
      standbyMinutes: toNonNegativePayrollMinuteValue(entry?.standbyMinutes)
    }];
  }

  const workedDistribution = distributePayrollMinutesByDimension(dimensionAllocations, workedMinutes);
  const overtimeDistribution = distributePayrollMinutesByDimension(
    dimensionAllocations,
    toNonNegativePayrollMinuteValue(entry?.overtimeMinutes)
  );
  const obDistribution = distributePayrollMinutesByDimension(
    dimensionAllocations,
    toNonNegativePayrollMinuteValue(entry?.obMinutes)
  );
  const jourDistribution = distributePayrollMinutesByDimension(
    dimensionAllocations,
    toNonNegativePayrollMinuteValue(entry?.jourMinutes)
  );
  const standbyDistribution = distributePayrollMinutesByDimension(
    dimensionAllocations,
    toNonNegativePayrollMinuteValue(entry?.standbyMinutes)
  );

  return dimensionAllocations.map((allocation, index) => ({
    dimensionJson: allocation.dimensionJson,
    timeEntryIds: [entry?.timeEntryId].filter(Boolean),
    workedMinutes: workedDistribution[index] || 0,
    overtimeMinutes: overtimeDistribution[index] || 0,
    obMinutes: obDistribution[index] || 0,
    jourMinutes: jourDistribution[index] || 0,
    standbyMinutes: standbyDistribution[index] || 0
  }));
}

function listTimeEntryPayrollDimensionAllocations(entry) {
  const allocationRefs = Array.isArray(entry?.allocationRefs) ? entry.allocationRefs : [];
  const allocations = allocationRefs
    .map((allocationRef, index) => ({
      allocationRefId: normalizeOptionalText(allocationRef?.allocationRefId) || `ALLOC-${index + 1}`,
      dimensionJson: normalizePayrollDimensions({
        projectId: allocationRef?.projectId
      }),
      allocationMinutes: toNonNegativePayrollMinuteValue(allocationRef?.allocationMinutes)
    }))
    .filter((allocation) => allocation.allocationMinutes > 0);
  return allocations.sort(
    (left, right) =>
      stableStringify(left.dimensionJson).localeCompare(stableStringify(right.dimensionJson))
      || left.allocationRefId.localeCompare(right.allocationRefId)
  );
}

function distributePayrollMinutesByDimension(dimensionAllocations, totalMinutes) {
  const resolvedTotalMinutes = toNonNegativePayrollMinuteValue(totalMinutes);
  if (resolvedTotalMinutes <= 0) {
    return dimensionAllocations.map(() => 0);
  }
  if (!Array.isArray(dimensionAllocations) || dimensionAllocations.length === 0) {
    return [];
  }
  if (dimensionAllocations.length === 1) {
    return [resolvedTotalMinutes];
  }
  const allocationTotalMinutes = dimensionAllocations.reduce((sum, allocation) => sum + allocation.allocationMinutes, 0);
  if (allocationTotalMinutes <= 0) {
    return [resolvedTotalMinutes, ...dimensionAllocations.slice(1).map(() => 0)];
  }
  const provisional = dimensionAllocations.map((allocation, index) => {
    const rawMinutes = (resolvedTotalMinutes * allocation.allocationMinutes) / allocationTotalMinutes;
    const assignedMinutes = Math.floor(rawMinutes);
    return {
      index,
      assignedMinutes,
      fractionalRemainder: rawMinutes - assignedMinutes,
      sortKey: `${stableStringify(allocation.dimensionJson)}:${allocation.allocationRefId}`
    };
  });
  let remainder = resolvedTotalMinutes - provisional.reduce((sum, allocation) => sum + allocation.assignedMinutes, 0);
  provisional.sort(
    (left, right) =>
      right.fractionalRemainder - left.fractionalRemainder
      || left.sortKey.localeCompare(right.sortKey)
  );
  for (let index = 0; index < provisional.length && remainder > 0; index += 1) {
    provisional[index].assignedMinutes += 1;
    remainder -= 1;
  }
  provisional.sort((left, right) => left.index - right.index);
  return provisional.map((allocation) => allocation.assignedMinutes);
}

function toNonNegativePayrollMinuteValue(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.round(numeric);
}

function buildConfiguredQuantityLine({
  payItem,
  employment,
  contract,
  hrSnapshot = null,
  quantity,
  unitRate = null,
  rateFactor = null,
  agreementRateComponent = null,
  requireAgreementRate = false,
  sourceType,
  sourceId,
  dimensionJson = null,
  warnings
}) {
  const resolvedQuantity = roundQuantity(quantity || 0);
  if (!resolvedQuantity) {
    return null;
  }

  const resolvedAgreementRate = normalizeAgreementRateComponent(agreementRateComponent, payItem.payItemCode);
  if (resolvedAgreementRate) {
    const lineFromAgreement = buildAgreementConfiguredQuantityLine({
      payItem,
      employment,
      contract,
      hrSnapshot,
      quantity: resolvedQuantity,
      agreementRateComponent: resolvedAgreementRate,
      sourceType,
      sourceId,
      dimensionJson,
      warnings
    });
    if (lineFromAgreement) {
      return lineFromAgreement;
    }
  }
  if (requireAgreementRate) {
    return buildAgreementRateMissingLine({
      payItem,
      employment,
      quantity: resolvedQuantity,
      sourceType,
      sourceId,
      dimensionJson,
      warnings,
      message: `Agreement overlay for ${payItem.payItemCode} is missing or non-executable for ${employment.employmentNo}.`
    });
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
        calculationStatus: "rate_required",
        dimensionJson
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
      sourceId,
      dimensionJson
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
      calculationStatus: "rate_required",
      dimensionJson
    });
  }

  return createPayLine({
    payItem,
    employment,
    quantity: resolvedQuantity,
    unitRate: effectiveUnitRate,
    amount: payItem.calculationBasis === "reporting_only" ? 0 : roundMoney(resolvedQuantity * effectiveUnitRate * resolvedRateFactor),
    sourceType,
    sourceId,
    dimensionJson
  });
}

function resolveAgreementPayItemRateComponent(agreementOverlay, payItemCode) {
  if (!agreementOverlay || typeof agreementOverlay !== "object") {
    return null;
  }
  const payItemRates = agreementOverlay.rateComponents?.payItemRates;
  if (!payItemRates || typeof payItemRates !== "object" || Array.isArray(payItemRates)) {
    return null;
  }
  return payItemRates[normalizeCode(payItemCode, "agreement_overlay_pay_item_code_required")] || null;
}

function isAgreementDrivenPayItemCode(payItemCode) {
  return ["OVERTIME", "OB", "JOUR", "STANDBY", "VACATION_SUPPLEMENT"].includes(
    normalizeCode(payItemCode, "agreement_overlay_pay_item_code_required")
  );
}

function normalizeAgreementRateComponent(component, payItemCode) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    return null;
  }
  const resolvedPayItemCode = normalizeCode(component.payItemCode || payItemCode, "agreement_overlay_pay_item_code_required");
  if (resolvedPayItemCode !== normalizeCode(payItemCode, "agreement_overlay_pay_item_code_required")) {
    return null;
  }
  const calculationMode = normalizeOptionalText(component.calculationMode);
  if (!calculationMode) {
    return null;
  }
  return {
    payItemCode: resolvedPayItemCode,
    calculationMode,
    basisCode: normalizeOptionalText(component.basisCode) || null,
    multiplier: normalizeOptionalNumber(component.multiplier, "agreement_overlay_multiplier_invalid"),
    unitRate: normalizeOptionalMoney(component.unitRate, "agreement_overlay_unit_rate_invalid"),
    percent: normalizeOptionalNumber(component.percent, "agreement_overlay_percent_invalid"),
    autoGenerate: component.autoGenerate === true,
    note: normalizeOptionalText(component.note)
  };
}

function buildAgreementConfiguredQuantityLine({
  payItem,
  employment,
  contract,
  hrSnapshot,
  quantity,
  agreementRateComponent,
  sourceType,
  sourceId,
  dimensionJson,
  warnings
}) {
  if (agreementRateComponent.calculationMode === "unit_rate") {
    if (agreementRateComponent.unitRate == null) {
      return buildAgreementRateMissingLine({
        payItem,
        employment,
        quantity,
        sourceType,
        sourceId,
        dimensionJson,
        warnings,
        message: `Agreement overlay for ${payItem.payItemCode} requires a unit rate for ${employment.employmentNo}.`
      });
    }
    return createPayLine({
      payItem,
      employment,
      quantity,
      unitRate: agreementRateComponent.unitRate,
      amount: payItem.calculationBasis === "reporting_only" ? 0 : roundMoney(quantity * agreementRateComponent.unitRate),
      sourceType,
      sourceId,
      note: agreementRateComponent.note,
      dimensionJson
    });
  }

  if (agreementRateComponent.calculationMode === "multiplier") {
    const basisAmount = resolveAgreementBasisAmount({
      basisCode: agreementRateComponent.basisCode || "contract_hourly_rate",
      contract,
      hrSnapshot,
      employment,
      warnings,
      payItemCode: payItem.payItemCode
    });
    if (basisAmount == null || agreementRateComponent.multiplier == null) {
      return buildAgreementRateMissingLine({
        payItem,
        employment,
        quantity,
        sourceType,
        sourceId,
        dimensionJson,
        warnings,
        message: `Agreement overlay for ${payItem.payItemCode} requires a base rate and multiplier for ${employment.employmentNo}.`
      });
    }
    const effectiveRate = roundMoney(basisAmount * agreementRateComponent.multiplier);
    return createPayLine({
      payItem,
      employment,
      quantity,
      unitRate: effectiveRate,
      amount: payItem.calculationBasis === "reporting_only" ? 0 : roundMoney(quantity * effectiveRate),
      sourceType,
      sourceId,
      note: agreementRateComponent.note,
      dimensionJson
    });
  }

  if (agreementRateComponent.calculationMode === "percent_of_basis") {
    const basisAmount = resolveAgreementBasisAmount({
      basisCode: agreementRateComponent.basisCode || "contract_monthly_salary",
      contract,
      hrSnapshot,
      employment,
      warnings,
      payItemCode: payItem.payItemCode
    });
    if (basisAmount == null || agreementRateComponent.percent == null) {
      return buildAgreementRateMissingLine({
        payItem,
        employment,
        quantity,
        sourceType,
        sourceId,
        dimensionJson,
        warnings,
        message: `Agreement overlay for ${payItem.payItemCode} requires a basis amount and percent for ${employment.employmentNo}.`
      });
    }
    const percentUnitRate = roundMoney(basisAmount * (agreementRateComponent.percent / 100));
    return createPayLine({
      payItem,
      employment,
      quantity,
      unitRate: percentUnitRate,
      amount: payItem.calculationBasis === "reporting_only" ? 0 : roundMoney(quantity * percentUnitRate),
      sourceType,
      sourceId,
      note: agreementRateComponent.note,
      dimensionJson
    });
  }

  return null;
}

function buildAgreementRateMissingLine({
  payItem,
  employment,
  quantity,
  sourceType,
  sourceId,
  dimensionJson,
  warnings,
  message
}) {
  warnings.push(createWarning("agreement_overlay_rate_missing", message));
  return createPayLine({
    payItem,
    employment,
    quantity,
    amount: 0,
    unitRate: null,
    sourceType,
    sourceId,
    calculationStatus: "rate_required",
    dimensionJson
  });
}

function resolveAgreementBasisAmount({ basisCode, contract, hrSnapshot = null, employment, warnings, payItemCode }) {
  const resolvedBasisCode = normalizeOptionalText(basisCode) || "contract_hourly_rate";
  if (resolvedBasisCode === "contract_hourly_rate" || resolvedBasisCode === "hourly_rate" || resolvedBasisCode === "derived_hourly_rate") {
    if (contract?.hourlyRate != null) {
      return roundMoney(contract.hourlyRate);
    }
    const ordinaryHoursPerMonth = Number(hrSnapshot?.activeSalaryBasis?.ordinaryHoursPerMonth || 0);
    if (contract?.monthlySalary != null && ordinaryHoursPerMonth > 0) {
      return roundMoney(contract.monthlySalary / ordinaryHoursPerMonth);
    }
    warnings.push(
      createWarning(
        "agreement_overlay_basis_missing",
        `Agreement overlay for ${payItemCode} could not derive hourly basis for ${employment.employmentNo}.`
      )
    );
    return null;
  }
  if (resolvedBasisCode === "contract_monthly_salary" || resolvedBasisCode === "monthly_salary") {
    if (contract?.monthlySalary != null) {
      return roundMoney(contract.monthlySalary);
    }
    warnings.push(
      createWarning(
        "agreement_overlay_basis_missing",
        `Agreement overlay for ${payItemCode} requires a monthly salary basis for ${employment.employmentNo}.`
      )
    );
    return null;
  }
  warnings.push(
    createWarning(
      "agreement_overlay_basis_unsupported",
      `Agreement overlay basis ${resolvedBasisCode} is unsupported for ${payItemCode} on ${employment.employmentNo}.`
    )
  );
  return null;
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
  calculationStatus = "calculated",
  processingStep = null,
  dimensionJson = null,
  overrides = {}
}) {
  return {
    employmentId: employment.employmentId,
    employeeId: employment.employeeId,
    payItemCode: payItem.payItemCode,
    payItemType: payItem.payItemType,
    displayName: normalizeOptionalText(overrides.displayName) || payItem.displayName,
    compensationBucket: payItem.compensationBucket,
    quantity: quantity == null ? null : roundQuantity(quantity),
    unitCode: payItem.unitCode,
    unitRate: unitRate == null ? null : roundMoney(unitRate),
    amount: roundMoney(amount),
    taxTreatmentCode: normalizeOptionalText(overrides.taxTreatmentCode) || payItem.taxTreatmentCode,
    employerContributionTreatmentCode:
      normalizeOptionalText(overrides.employerContributionTreatmentCode) || payItem.employerContributionTreatmentCode,
    agiMappingCode: normalizeOptionalText(overrides.agiMappingCode) || payItem.agiMappingCode,
    ledgerAccountCode: normalizeOptionalText(overrides.ledgerAccountCode) || payItem.ledgerAccountCode,
    affectsVacationBasis: overrides.affectsVacationBasis == null ? payItem.affectsVacationBasis : overrides.affectsVacationBasis === true,
    affectsPensionBasis: overrides.affectsPensionBasis == null ? payItem.affectsPensionBasis : overrides.affectsPensionBasis === true,
    includedInNetPay: overrides.includedInNetPay == null ? payItem.includedInNetPay : overrides.includedInNetPay !== false,
    reportingOnly: overrides.reportingOnly == null ? payItem.reportingOnly : overrides.reportingOnly === true,
    sourceType: requireText(String(sourceType || "manual"), "pay_line_source_type_required"),
    sourceId: normalizeOptionalText(sourceId),
    sourcePeriod: normalizeOptionalReportingPeriod(sourcePeriod),
    sourcePayRunId: normalizeOptionalText(sourcePayRunId),
    sourceLineId: normalizeOptionalText(sourceLineId),
    calculationStatus,
    processingStep: processingStep == null ? null : normalizeProcessingStep(processingStep, payItem.compensationBucket),
    note: normalizeOptionalText(note),
    displayOrder: payItemDisplayOrder(payItem.payItemCode),
    dimensionJson: normalizePayrollDimensions({
      ...(payItem.defaultDimensions || {}),
      ...(dimensionJson || {})
    })
  };
}

function snapshotExternalPayrollLinePayloads(payloads) {
  return (Array.isArray(payloads) ? payloads : [])
    .map((payload) => ({
      processingStep: payload?.processingStep == null ? null : Number(payload.processingStep),
      payItemCode: normalizeOptionalText(payload?.payItemCode),
      quantity: payload?.quantity == null ? null : roundQuantity(payload.quantity),
      unitRate: payload?.unitRate == null ? null : roundMoney(payload.unitRate),
      amount: roundMoney(Number(payload?.amount || 0)),
      sourceType: normalizeOptionalText(payload?.sourceType),
      sourceId: normalizeOptionalText(payload?.sourceId),
      sourcePeriod: normalizeOptionalReportingPeriod(payload?.sourcePeriod),
      note: normalizeOptionalText(payload?.note),
      dimensionJson: normalizePayrollDimensions(payload?.dimensionJson || {}),
      overrides: copy(payload?.overrides || {})
    }))
    .sort((left, right) => {
      const leftKey = `${left.processingStep ?? ""}:${left.payItemCode || ""}:${left.sourceType || ""}:${left.sourceId || ""}:${stableStringify(left.dimensionJson)}`;
      const rightKey = `${right.processingStep ?? ""}:${right.payItemCode || ""}:${right.sourceType || ""}:${right.sourceId || ""}:${stableStringify(right.dimensionJson)}`;
      return leftKey.localeCompare(rightKey);
    });
}

function createStepLinesFromPayloads({ processingStep, employment, payloads, state }) {
  return (Array.isArray(payloads) ? payloads : [])
    .filter((payload) => Number(payload.processingStep) === Number(processingStep))
    .map((payload) => {
      const payItem = requirePayItemByCode(state, employment.companyId, normalizeCode(payload.payItemCode, "payroll_payload_pay_item_code_required"));
      return createPayLine({
        payItem,
        employment,
        quantity: payload.quantity ?? null,
        unitRate: payload.unitRate ?? null,
        amount: payload.amount,
        sourceType: payload.sourceType || "benefit_event",
        sourceId: payload.sourceId || null,
        note: payload.note || null,
        dimensionJson: payload.dimensionJson || {},
        overrides: payload.overrides || {},
        processingStep
      });
    });
}

function normalizeManualInputs({ companyId, manualInputs, state }) {
  if (!Array.isArray(manualInputs)) {
    return [];
  }
  return manualInputs.map((input) => {
    const resolvedEmploymentId = requireText(input.employmentId, "payroll_input_employment_id_required");
    const payItemCode = normalizeCode(input.payItemCode, "payroll_input_pay_item_code_required");
    if (payItemCode === "GARNISHMENT") {
      throw createError(
        409,
        "garnishment_manual_input_forbidden",
        "Manual GARNISHMENT lines are forbidden. Use an approved garnishment decision snapshot instead."
      );
    }
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
      processingStep,
      dimensionJson: normalizePayrollDimensions({
        ...(input.dimensionJson || {}),
        projectId: input.projectId ?? input.dimensionJson?.projectId,
        costCenterCode: input.costCenterCode ?? input.dimensionJson?.costCenterCode,
        businessAreaCode: input.businessAreaCode ?? input.dimensionJson?.businessAreaCode
      })
    };
  }).sort((left, right) => {
    const leftKey = `${left.employmentId}:${left.processingStep}:${left.payItemCode}:${left.sourceType || ""}:${left.sourceId || ""}:${stableStringify(left.dimensionJson || {})}`;
    const rightKey = `${right.employmentId}:${right.processingStep}:${right.payItemCode}:${right.sourceType || ""}:${right.sourceId || ""}:${stableStringify(right.dimensionJson || {})}`;
    return leftKey.localeCompare(rightKey);
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
      note: normalizeOptionalText(adjustment.note),
      dimensionJson: normalizePayrollDimensions({
        ...(adjustment.dimensionJson || {}),
        projectId: adjustment.projectId ?? adjustment.dimensionJson?.projectId,
        costCenterCode: adjustment.costCenterCode ?? adjustment.dimensionJson?.costCenterCode,
        businessAreaCode: adjustment.businessAreaCode ?? adjustment.dimensionJson?.businessAreaCode
      })
    };
  }).sort((left, right) => {
    const leftKey = `${left.employmentId}:${left.originalPeriod}:${left.payItemCode}:${left.sourcePayRunId || ""}:${left.sourceLineId || ""}:${stableStringify(left.dimensionJson || {})}`;
    const rightKey = `${right.employmentId}:${right.originalPeriod}:${right.payItemCode}:${right.sourcePayRunId || ""}:${right.sourceLineId || ""}:${stableStringify(right.dimensionJson || {})}`;
    return leftKey.localeCompare(rightKey);
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
    note: normalizeOptionalText(adjustment.note),
    dimensionJson: normalizePayrollDimensions({
      ...(adjustment.dimensionJson || {}),
      projectId: adjustment.projectId ?? adjustment.dimensionJson?.projectId,
      costCenterCode: adjustment.costCenterCode ?? adjustment.dimensionJson?.costCenterCode,
      businessAreaCode: adjustment.businessAreaCode ?? adjustment.dimensionJson?.businessAreaCode
    })
  })).sort((left, right) => {
    const leftKey = `${left.employmentId}:${left.terminationDate}:${stableStringify(left.dimensionJson || {})}`;
    const rightKey = `${right.employmentId}:${right.terminationDate}:${stableStringify(right.dimensionJson || {})}`;
    return leftKey.localeCompare(rightKey);
  });
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
  })).sort((left, right) => {
    const leftKey = `${left.leaveTypeId || ""}:${left.leaveTypeCode || ""}:${left.payItemCode}`;
    const rightKey = `${right.leaveTypeId || ""}:${right.leaveTypeCode || ""}:${right.payItemCode}`;
    return leftKey.localeCompare(rightKey);
  });
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

function assertEmergencyOverrideSnapshotFields({
  snapshot,
  subjectLabel,
  validToRequiredCode,
  overrideEndsOnRequiredCode,
  overrideWindowInvalidCode,
  rollbackPlanRequiredCode
}) {
  if (!snapshot.validTo) {
    throw createError(400, validToRequiredCode, `${subjectLabel} require validTo.`);
  }
  if (!snapshot.overrideEndsOn) {
    throw createError(400, overrideEndsOnRequiredCode, `${subjectLabel} require overrideEndsOn.`);
  }
  if (snapshot.overrideEndsOn < snapshot.validFrom || snapshot.overrideEndsOn > snapshot.validTo) {
    throw createError(
      400,
      overrideWindowInvalidCode,
      `${subjectLabel} require overrideEndsOn within the validity interval.`
    );
  }
  if (!snapshot.rollbackPlanRef) {
    throw createError(400, rollbackPlanRequiredCode, `${subjectLabel} require rollbackPlanRef.`);
  }
}

function assertEmergencyOverrideApprovalWindow({ snapshot, currentDate, subjectLabel, errorCode }) {
  if (snapshot.overrideEndsOn && snapshot.overrideEndsOn < currentDate) {
    throw createError(409, errorCode, `${subjectLabel} cannot be approved after the override window has expired.`);
  }
}

function assertInlineDualReviewedSnapshot(snapshot, { statusValues, requiresDualReview, codePrefix, subjectLabel }) {
  if (snapshot.status !== "approved") {
    throw createError(409, `${codePrefix}_approval_required`, `${subjectLabel} must be approved before pay-run use.`);
  }
  if (!snapshot.createdByActorId) {
    throw createError(
      409,
      `${codePrefix}_created_by_actor_required`,
      `${subjectLabel} must include createdByActorId before pay-run use.`
    );
  }
  if (!snapshot.approvedByActorId) {
    throw createError(
      409,
      `${codePrefix}_approved_by_actor_required`,
      `${subjectLabel} must include approvedByActorId before pay-run use.`
    );
  }
  if (!snapshot.approvedAt) {
    throw createError(409, `${codePrefix}_approved_at_required`, `${subjectLabel} must include approvedAt before pay-run use.`);
  }
  if (requiresDualReview && snapshot.createdByActorId === snapshot.approvedByActorId) {
    throw createError(
      409,
      `${codePrefix}_dual_review_required`,
      `${subjectLabel} require approval by a different actor.`
    );
  }
  if (statusValues && !statusValues.includes(snapshot.status)) {
    throw createError(400, `${codePrefix}_status_invalid`, `${snapshot.status} is not a valid decision status.`);
  }
}

function normalizeTaxDecisionSnapshots(taxDecisionSnapshots) {
  const map = new Map();
  if (!Array.isArray(taxDecisionSnapshots)) {
    return map;
  }
  for (const snapshot of taxDecisionSnapshots) {
    const normalized = normalizeTaxDecisionSnapshot(snapshot);
    if (normalized.decisionType === "emergency_manual") {
      assertInlineDualReviewedSnapshot(normalized, {
        statusValues: PAYROLL_TAX_DECISION_STATUSES,
        requiresDualReview: true,
        codePrefix: "payroll_tax_decision_snapshot",
        subjectLabel: "Emergency manual tax decision snapshots"
      });
    }
    map.set(normalized.employmentId, normalized);
  }
  return map;
}

function normalizeTaxDecisionSnapshot(snapshot = {}) {
  const rawDecisionType = assertAllowed(
    normalizeOptionalText(snapshot.decisionType),
    PAYROLL_TAX_DECISION_TYPES,
    "tax_decision_snapshot_type_invalid"
  );
  const decisionType = canonicalizeTaxDecisionType({
    decisionType: rawDecisionType,
    adjustmentFixedAmount: snapshot.fixedAdjustmentAmount ?? snapshot.adjustmentFixedAmount,
    adjustmentPercentage: snapshot.percentageAdjustment ?? snapshot.adjustmentPercentage,
    withholdingRatePercent: snapshot.withholdingRatePercent
  });
  const validFrom = normalizeRequiredDate(snapshot.validFrom, "tax_decision_snapshot_valid_from_invalid");
  const validTo = normalizeOptionalDate(snapshot.validTo, "tax_decision_snapshot_valid_to_invalid");
  if (validTo && validTo < validFrom) {
    throw createError(400, "tax_decision_snapshot_interval_invalid", "Tax decision validity interval is invalid.");
  }
  const normalized = {
    employmentId: requireText(snapshot.employmentId, "tax_decision_snapshot_employment_id_required"),
    decisionType,
    incomeYear: normalizeIntegerInRange(snapshot.incomeYear, 2000, 2100, "tax_decision_snapshot_income_year_invalid"),
    validFrom,
    validTo,
    overrideEndsOn: normalizeOptionalDate(snapshot.overrideEndsOn, "tax_decision_snapshot_override_ends_on_invalid"),
    rollbackPlanRef: normalizeOptionalText(snapshot.rollbackPlanRef),
    status: normalizeOptionalSnapshotStatus(
      snapshot.status,
      PAYROLL_TAX_DECISION_STATUSES,
      "tax_decision_snapshot_status_invalid"
    ),
    createdByActorId: normalizeOptionalText(snapshot.createdByActorId),
    approvedByActorId: normalizeOptionalText(snapshot.approvedByActorId),
    approvedAt: normalizeOptionalIsoTimestamp(snapshot.approvedAt, "tax_decision_snapshot_approved_at_invalid"),
    municipalityCode: normalizeOptionalText(snapshot.municipalityCode),
    tableCode: normalizeOptionalText(snapshot.tableCode),
    columnCode: normalizeOptionalText(snapshot.columnCode),
    adjustmentFixedAmount: normalizeOptionalMoney(
      snapshot.fixedAdjustmentAmount ?? snapshot.adjustmentFixedAmount,
      "tax_decision_snapshot_adjustment_fixed_amount_invalid"
    ),
    adjustmentPercentage: normalizeOptionalNumber(
      snapshot.percentageAdjustment ?? snapshot.adjustmentPercentage,
      "tax_decision_snapshot_adjustment_percentage_invalid"
    ),
    withholdingRatePercent: normalizeOptionalNumber(
      snapshot.withholdingRatePercent,
      "tax_decision_snapshot_withholding_rate_invalid"
    ),
    withholdingFixedAmount: normalizeOptionalMoney(
      snapshot.withholdingFixedAmount,
      "tax_decision_snapshot_withholding_fixed_amount_invalid"
    ),
    decisionSource: requireText(snapshot.decisionSource, "tax_decision_snapshot_decision_source_required"),
    decisionReference: requireText(snapshot.decisionReference, "tax_decision_snapshot_decision_reference_required"),
    evidenceRef: requireText(snapshot.evidenceRef, "tax_decision_snapshot_evidence_ref_required"),
    reasonCode: normalizeOptionalText(snapshot.reasonCode),
    annualIncomeBasisAmount: normalizeOptionalMoney(
      snapshot.annualIncomeBasisAmount,
      "tax_decision_snapshot_annual_income_basis_amount_invalid"
    ),
    sinkRatePercent: normalizeOptionalNumber(snapshot.sinkRatePercent, "tax_decision_snapshot_sink_rate_invalid"),
    sinkSeaIncome: snapshot.sinkSeaIncome === true
  };

  if (decisionType === "tabell") {
    if (!normalized.municipalityCode || !normalized.tableCode || !normalized.columnCode) {
      throw createError(
        400,
        "tax_decision_snapshot_table_fields_required",
        "Table tax decisions require municipalityCode, tableCode and columnCode."
      );
    }
    if (normalized.withholdingRatePercent != null || normalized.withholdingFixedAmount != null) {
      throw createError(
        400,
        "tax_decision_snapshot_table_manual_withholding_forbidden",
        "Table tax decisions must resolve withholding from the official tax-table baseline, not from inline withholding values."
      );
    }
  }

  if (isJamkningDecisionType(decisionType)) {
    if (decisionType === "jamkning_fast" && normalized.adjustmentPercentage != null) {
      throw createError(
        400,
        "tax_decision_snapshot_adjustment_percentage_forbidden_for_fast_adjustment",
        "Fixed adjustment decisions may not carry adjustmentPercentage."
      );
    }
    if (decisionType === "jamkning_procent" && normalized.adjustmentFixedAmount != null) {
      throw createError(
        400,
        "tax_decision_snapshot_adjustment_fixed_amount_forbidden_for_percent_adjustment",
        "Percentage adjustment decisions may not carry adjustmentFixedAmount."
      );
    }
    if (normalized.adjustmentFixedAmount == null && normalized.adjustmentPercentage == null) {
      throw createError(
        400,
        "tax_decision_snapshot_adjustment_required",
        "Jamkning decisions require adjustmentFixedAmount or adjustmentPercentage."
      );
    }
    if (
      decisionType !== "jamkning_procent" &&
      normalized.withholdingRatePercent == null &&
      normalized.withholdingFixedAmount == null &&
      (!normalized.tableCode || !normalized.columnCode)
    ) {
      throw createError(
        400,
        "tax_decision_snapshot_jamkning_withholding_required",
        "Jamkning decisions require a withholding instruction or table reference."
      );
    }
  }

  if (decisionType === "engangsskatt") {
    if (!normalized.columnCode) {
      throw createError(
        400,
        "tax_decision_snapshot_one_time_column_required",
        "Engangsskatt decisions require columnCode."
      );
    }
    if (normalized.annualIncomeBasisAmount == null) {
      throw createError(
        400,
        "tax_decision_snapshot_one_time_annual_income_basis_required",
        "Engangsskatt decisions require annualIncomeBasisAmount."
      );
    }
    if (normalized.withholdingRatePercent != null || normalized.withholdingFixedAmount != null) {
      throw createError(
        400,
        "tax_decision_snapshot_one_time_inline_withholding_forbidden",
        "Engangsskatt decisions must resolve withholding from the official one-time tax baseline, not from inline withholding values."
      );
    }
  }

  if (decisionType === "sink" && normalized.sinkRatePercent == null) {
    throw createError(
      400,
      "tax_decision_snapshot_sink_rate_required",
      "SINK decisions require sinkRatePercent."
    );
  }

  if (isASinkDecisionType(decisionType) && normalized.sinkRatePercent != null) {
    throw createError(
      400,
      "tax_decision_snapshot_asink_sink_rate_forbidden",
      "A-SINK decisions use withholdingRatePercent or the official A-SINK default, not sinkRatePercent."
    );
  }

  if (decisionType === "emergency_manual") {
    if (normalized.withholdingRatePercent == null) {
      throw createError(
        400,
        "tax_decision_snapshot_emergency_rate_required",
        "Emergency manual tax decisions require withholdingRatePercent."
      );
    }
    if (!normalized.reasonCode) {
      throw createError(
        400,
        "tax_decision_snapshot_emergency_reason_required",
        "Emergency manual tax decisions require reasonCode."
      );
    }
    assertEmergencyOverrideSnapshotFields({
      snapshot: normalized,
      subjectLabel: "Emergency manual tax decisions",
      validToRequiredCode: "tax_decision_snapshot_emergency_valid_to_required",
      overrideEndsOnRequiredCode: "tax_decision_snapshot_emergency_override_ends_on_required",
      overrideWindowInvalidCode: "tax_decision_snapshot_emergency_override_window_invalid",
      rollbackPlanRequiredCode: "tax_decision_snapshot_emergency_rollback_plan_required"
    });
  }

  return normalized;
}

function normalizeEmployerContributionDecisionSnapshots(employerContributionDecisionSnapshots) {
  const map = new Map();
  if (!Array.isArray(employerContributionDecisionSnapshots)) {
    return map;
  }
  for (const snapshot of employerContributionDecisionSnapshots) {
    const normalized = normalizeEmployerContributionDecisionSnapshot(snapshot);
    if (PAYROLL_DUAL_REVIEW_EMPLOYER_CONTRIBUTION_DECISION_TYPES.includes(normalized.decisionType)) {
      assertInlineDualReviewedSnapshot(normalized, {
        statusValues: PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_STATUSES,
        requiresDualReview: true,
        codePrefix: "payroll_employer_contribution_decision_snapshot",
        subjectLabel: "Dual-review employer contribution decision snapshots"
      });
    }
    map.set(normalized.employmentId, normalized);
  }
  return map;
}

function normalizeOptionalPayrollRulepackRef(rulepackRef, codePrefix) {
  if (rulepackRef == null || rulepackRef === "") {
    return null;
  }
  if (typeof rulepackRef !== "object" || Array.isArray(rulepackRef)) {
    throw createError(400, `${codePrefix}_rulepack_ref_invalid`, "rulepackRef must be an object.");
  }
  const normalized = {
    rulepackId: normalizeOptionalText(rulepackRef.rulepackId ?? rulepackRef.rulePackId),
    rulepackCode: normalizeOptionalText(rulepackRef.rulepackCode ?? rulepackRef.rulePackCode),
    rulepackVersion: normalizeOptionalText(rulepackRef.rulepackVersion ?? rulepackRef.rulePackVersion),
    rulepackChecksum: normalizeOptionalText(rulepackRef.rulepackChecksum ?? rulepackRef.rulePackChecksum),
    effectiveDate: normalizeOptionalDate(
      rulepackRef.effectiveDate,
      `${codePrefix}_rulepack_effective_date_invalid`
    )
  };
  if (
    !normalized.rulepackId
    && !normalized.rulepackCode
    && !normalized.rulepackVersion
    && !normalized.rulepackChecksum
    && !normalized.effectiveDate
  ) {
    return null;
  }
  if (!normalized.rulepackId || !normalized.rulepackCode || !normalized.rulepackVersion || !normalized.rulepackChecksum) {
    throw createError(
      400,
      `${codePrefix}_rulepack_ref_incomplete`,
      "rulepackRef must carry rulepackId, rulepackCode, rulepackVersion and rulepackChecksum."
    );
  }
  return normalized;
}

function resolveEmployerContributionRulePackForSnapshot({ validFrom, fallbackRulepackRef = null, rules }) {
  if (rules && typeof rules.resolveRulePack === "function") {
    return rules.resolveRulePack({
      rulePackCode: PAYROLL_EMPLOYER_CONTRIBUTION_RULE_PACK_CODE,
      domain: "payroll",
      jurisdiction: "SE",
      effectiveDate: validFrom
    });
  }
  if (!fallbackRulepackRef) {
    return null;
  }
  return {
    rulePackId: fallbackRulepackRef.rulepackId,
    rulePackCode: fallbackRulepackRef.rulepackCode,
    version: fallbackRulepackRef.rulepackVersion,
    checksum: fallbackRulepackRef.rulepackChecksum,
    effectiveFrom: fallbackRulepackRef.effectiveDate || validFrom,
    machineReadableRules: {
      contributionClasses: {}
    }
  };
}

function resolveEmployerContributionRuleClassDefinitionForDecision({ decisionType, machineRules = {} } = {}) {
  switch (decisionType) {
    case "full":
      return machineRules.full || null;
    case "reduced_age_pension_only":
      return machineRules.reduced_age_pension_only || null;
    case "temporary_youth_reduction":
      return machineRules.temporary_youth_reduction || null;
    case "vaxa":
      return machineRules.vaxa || null;
    case "no_contribution":
      return machineRules.no_contribution || null;
    default:
      return null;
  }
}

function applyEmployerContributionDecisionRulePackDefaults({ normalized, rulePack } = {}) {
  const decisionContext = copy(normalized || {});
  const machineRules = rulePack?.machineReadableRules?.contributionClasses || {};
  const classDefinition = resolveEmployerContributionRuleClassDefinitionForDecision({
    decisionType: decisionContext.decisionType,
    machineRules
  });
  const fallbackFullRate = normalizeOptionalPercentage(
    machineRules.full?.ratePercent ?? classDefinition?.standardRatePercent ?? classDefinition?.ratePercent,
    "employer_contribution_decision_snapshot_full_rate_invalid"
  );
  const fallbackReducedRate = normalizeOptionalPercentage(
    classDefinition?.reducedRatePercent
    ?? classDefinition?.ratePercent
    ?? (decisionContext.decisionType === "vaxa" ? machineRules.reduced_age_pension_only?.ratePercent : null),
    "employer_contribution_decision_snapshot_reduced_rate_invalid"
  );
  const fallbackBaseLimit = normalizeOptionalMoney(
    classDefinition?.thresholdAmount,
    "employer_contribution_decision_snapshot_base_limit_invalid"
  );
  const fullRate = decisionContext.fullRate ?? fallbackFullRate;
  const thresholds = buildEmployerContributionThresholds({
    decisionType: decisionContext.decisionType,
    baseLimit: resolveEmployerContributionThresholdAmount(decisionContext) ?? fallbackBaseLimit,
    thresholds: decisionContext.thresholds || null
  });
  const vaxaEligibilityProfile = buildEmployerContributionVaxaEligibilityProfile({
    decisionType: decisionContext.decisionType,
    vaxaEligibilityProfile: decisionContext.vaxaEligibilityProfile || null,
    specialConditions: decisionContext.specialConditions || {}
  });
  const reducedRate =
    resolveEmployerContributionReducedRatePercent(decisionContext)
    ?? fallbackReducedRate;
  const reducedComponents = buildEmployerContributionReducedComponents({
    decisionType: decisionContext.decisionType,
    fullRate,
    reducedRate,
    thresholds,
    reducedComponents: decisionContext.reducedComponents || null,
    vaxaEligibilityProfile
  });
  const canonical = {
    ...decisionContext,
    fullRate,
    reducedRate,
    baseLimit: thresholds.baseLimitAmount,
    thresholds,
    reducedComponents,
    vaxaEligibilityProfile,
    rulepackRef:
      decisionContext.rulepackRef
      || buildPayrollRulepackRefFromRulePack(rulePack, decisionContext.validFrom || rulePack?.effectiveFrom || null)
  };
  canonical.specialConditions = augmentEmployerContributionSpecialConditions({
    decisionType: canonical.decisionType,
    specialConditions: canonical.specialConditions,
    thresholds: canonical.thresholds,
    vaxaEligibilityProfile: canonical.vaxaEligibilityProfile,
    classDefinition
  });
  assertEmployerContributionDecisionMatchesRulePack({
    normalized: canonical,
    rulePack,
    classDefinition,
    machineRules
  });
  return canonical;
}

function assertEmployerContributionDecisionMatchesRulePack({
  normalized,
  rulePack,
  classDefinition = null,
  machineRules = {}
} = {}) {
  if (!normalized || normalized.decisionType === "emergency_manual" || !rulePack) {
    return;
  }
  const fullRateReference = normalizeOptionalPercentage(
    machineRules.full?.ratePercent,
    "employer_contribution_decision_snapshot_full_rate_invalid"
  );
  if (fullRateReference != null && roundMoney(normalized.fullRate ?? 0) !== roundMoney(fullRateReference)) {
    throw createError(
      400,
      "employer_contribution_decision_snapshot_full_rate_mismatch",
      "Employer contribution decision fullRate must match the official 2026 rule pack."
    );
  }
  const reducedRate = resolveEmployerContributionReducedRatePercent(normalized);
  const baseLimit = resolveEmployerContributionThresholdAmount(normalized);
  switch (normalized.decisionType) {
    case "reduced_age_pension_only":
      if (roundMoney(reducedRate ?? -1) !== roundMoney(classDefinition?.ratePercent ?? -2)) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_reduced_rate_mismatch",
          "Reduced-age employer contribution decisions must match the official reduced rate."
        );
      }
      return;
    case "temporary_youth_reduction":
      if (roundMoney(reducedRate ?? -1) !== roundMoney(classDefinition?.reducedRatePercent ?? -2)) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_reduced_rate_mismatch",
          "Temporary youth employer contribution decisions must match the official reduced rate."
        );
      }
      if (roundMoney(baseLimit ?? -1) !== roundMoney(classDefinition?.thresholdAmount ?? -2)) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_base_limit_mismatch",
          "Temporary youth employer contribution decisions must match the official monthly threshold."
        );
      }
      if (classDefinition?.eligibilityFrom && normalized.validFrom < classDefinition.eligibilityFrom) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_effective_window_invalid",
          "Temporary youth employer contribution decisions may not start before the official eligibility window."
        );
      }
      if (classDefinition?.eligibilityTo && normalized.validTo && normalized.validTo > classDefinition.eligibilityTo) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_effective_window_invalid",
          "Temporary youth employer contribution decisions may not extend beyond the official eligibility window."
        );
      }
      return;
    case "vaxa":
      if (roundMoney(reducedRate ?? -1) !== roundMoney(classDefinition?.reducedRatePercent ?? -2)) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_reduced_rate_mismatch",
          "Vaxa employer contribution decisions must match the official reduced rate."
        );
      }
      if (roundMoney(baseLimit ?? -1) !== roundMoney(classDefinition?.thresholdAmount ?? -2)) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_base_limit_mismatch",
          "Vaxa employer contribution decisions must match the official monthly threshold."
        );
      }
      if (!normalized.vaxaEligibilityProfile) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_vaxa_profile_required",
          "Vaxa employer contribution decisions require vaxaEligibilityProfile."
        );
      }
      return;
    case "no_contribution":
      if (roundMoney(reducedRate ?? -1) !== 0) {
        throw createError(
          400,
          "employer_contribution_decision_snapshot_reduced_rate_mismatch",
          "No-contribution employer contribution decisions must carry a 0 percent reduced rate."
        );
      }
      return;
    default:
      return;
  }
}

function normalizeEmployerContributionDecisionSnapshot(snapshot = {}) {
  const decisionType = assertAllowed(
    normalizeOptionalText(snapshot.decisionType),
    PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_TYPES,
    "employer_contribution_decision_snapshot_type_invalid"
  );
  const validFrom = normalizeRequiredDate(
    snapshot.validFrom,
    "employer_contribution_decision_snapshot_valid_from_invalid"
  );
  const validTo = normalizeOptionalDate(snapshot.validTo, "employer_contribution_decision_snapshot_valid_to_invalid");
  if (validTo && validTo < validFrom) {
    throw createError(
      400,
      "employer_contribution_decision_snapshot_interval_invalid",
      "Employer contribution decision validity interval is invalid."
    );
  }
  const normalized = {
    employmentId: requireText(snapshot.employmentId, "employer_contribution_decision_snapshot_employment_id_required"),
    decisionType,
    ageBucket: requireText(snapshot.ageBucket, "employer_contribution_decision_snapshot_age_bucket_required"),
    legalBasisCode: requireText(snapshot.legalBasisCode, "employer_contribution_decision_snapshot_legal_basis_required"),
    validFrom,
    validTo,
    overrideEndsOn: normalizeOptionalDate(
      snapshot.overrideEndsOn,
      "employer_contribution_decision_snapshot_override_ends_on_invalid"
    ),
    rollbackPlanRef: normalizeOptionalText(snapshot.rollbackPlanRef),
    status: normalizeOptionalSnapshotStatus(
      snapshot.status,
      PAYROLL_EMPLOYER_CONTRIBUTION_DECISION_STATUSES,
      "employer_contribution_decision_snapshot_status_invalid"
    ),
    createdByActorId: normalizeOptionalText(snapshot.createdByActorId),
    approvedByActorId: normalizeOptionalText(snapshot.approvedByActorId),
    approvedAt: normalizeOptionalIsoTimestamp(
      snapshot.approvedAt,
      "employer_contribution_decision_snapshot_approved_at_invalid"
    ),
    baseLimit: normalizeOptionalMoney(
      snapshot.baseLimit,
      "employer_contribution_decision_snapshot_base_limit_invalid"
    ),
    fullRate: normalizeOptionalPercentage(
      snapshot.fullRate,
      "employer_contribution_decision_snapshot_full_rate_invalid"
    ),
    reducedRate: normalizeOptionalPercentage(
      snapshot.reducedRate,
      "employer_contribution_decision_snapshot_reduced_rate_invalid"
    ),
    specialConditions: normalizeOptionalJsonObject(
      snapshot.specialConditions,
      "employer_contribution_decision_snapshot_special_conditions_invalid"
    ),
    decisionSource: requireText(snapshot.decisionSource, "employer_contribution_decision_snapshot_decision_source_required"),
    decisionReference: requireText(
      snapshot.decisionReference,
      "employer_contribution_decision_snapshot_decision_reference_required"
    ),
    evidenceRef: requireText(snapshot.evidenceRef, "employer_contribution_decision_snapshot_evidence_ref_required"),
    reasonCode: normalizeOptionalText(snapshot.reasonCode),
    rulepackRef: normalizeOptionalPayrollRulepackRef(
      snapshot.rulepackRef || (
        snapshot.rule_pack_id || snapshot.rule_pack_code || snapshot.rule_pack_version || snapshot.rule_pack_checksum
          ? {
            rulepackId: snapshot.rule_pack_id,
            rulepackCode: snapshot.rule_pack_code,
            rulepackVersion: snapshot.rule_pack_version,
            rulepackChecksum: snapshot.rule_pack_checksum,
            effectiveDate: snapshot.effective_date || snapshot.rule_pack_effective_date || null
          }
          : null
      ),
      "employer_contribution_decision_snapshot"
    )
  };
  normalized.thresholds = buildEmployerContributionThresholds({
    decisionType,
    baseLimit: normalized.baseLimit,
    thresholds: snapshot.thresholds || null
  });
  normalized.vaxaEligibilityProfile = buildEmployerContributionVaxaEligibilityProfile({
    decisionType,
    vaxaEligibilityProfile: snapshot.vaxaEligibilityProfile || null,
    specialConditions: normalized.specialConditions
  });
  normalized.reducedComponents = buildEmployerContributionReducedComponents({
    decisionType,
    fullRate: normalized.fullRate,
    reducedRate: normalized.reducedRate,
    thresholds: normalized.thresholds,
    reducedComponents: snapshot.reducedComponents || null,
    vaxaEligibilityProfile: normalized.vaxaEligibilityProfile
  });
  normalized.baseLimit = resolveEmployerContributionThresholdAmount(normalized);
  normalized.reducedRate = resolveEmployerContributionReducedRatePercent(normalized);

  if (decisionType === "temporary_youth_reduction" || decisionType === "vaxa") {
    if (normalized.reducedRate == null || normalized.baseLimit == null) {
      throw createError(
        400,
        "employer_contribution_decision_snapshot_split_fields_required",
        "Split employer contribution decisions require reducedRate and baseLimit."
      );
    }
  }

  if (decisionType === "reduced_age_pension_only" && normalized.reducedRate == null) {
    throw createError(
      400,
      "employer_contribution_decision_snapshot_reduced_rate_required",
      "Reduced employer contribution decisions require reducedRate."
    );
  }

  if (decisionType === "no_contribution") {
    normalized.reducedRate = 0;
  }
  normalized.specialConditions = augmentEmployerContributionSpecialConditions({
    decisionType,
    specialConditions: normalized.specialConditions,
    thresholds: normalized.thresholds,
    vaxaEligibilityProfile: normalized.vaxaEligibilityProfile
  });

  if (decisionType === "emergency_manual") {
    if (!normalized.reasonCode) {
      throw createError(
        400,
        "employer_contribution_decision_snapshot_reason_required",
        "Emergency manual employer contribution decisions require reasonCode."
      );
    }
    if (normalized.reducedRate == null && normalized.fullRate == null) {
      throw createError(
        400,
        "employer_contribution_decision_snapshot_rate_required",
        "Emergency manual employer contribution decisions require a rate."
      );
    }
    assertEmergencyOverrideSnapshotFields({
      snapshot: normalized,
      subjectLabel: "Emergency manual employer contribution decisions",
      validToRequiredCode: "employer_contribution_decision_snapshot_valid_to_required",
      overrideEndsOnRequiredCode: "employer_contribution_decision_snapshot_override_ends_on_required",
      overrideWindowInvalidCode: "employer_contribution_decision_snapshot_override_window_invalid",
      rollbackPlanRequiredCode: "employer_contribution_decision_snapshot_rollback_plan_required"
    });
  }

  return normalized;
}

function normalizeGarnishmentDecisionSnapshots(garnishmentDecisionSnapshots) {
  const map = new Map();
  if (!Array.isArray(garnishmentDecisionSnapshots)) {
    return map;
  }
  for (const snapshot of garnishmentDecisionSnapshots) {
    const normalized = normalizeGarnishmentDecisionSnapshot(snapshot);
    map.set(normalized.employmentId, normalized);
  }
  return map;
}

function normalizeGarnishmentDecisionSnapshot(snapshot = {}) {
  const decisionType = assertAllowed(
    normalizeOptionalText(snapshot.decisionType),
    PAYROLL_GARNISHMENT_DECISION_TYPES,
    "garnishment_decision_snapshot_type_invalid"
  );
  const validFrom = normalizeRequiredDate(snapshot.validFrom, "garnishment_decision_snapshot_valid_from_invalid");
  const validTo = normalizeOptionalDate(snapshot.validTo, "garnishment_decision_snapshot_valid_to_invalid");
  if (validTo && validTo < validFrom) {
    throw createError(
      400,
      "garnishment_decision_snapshot_interval_invalid",
      "Garnishment decision validity interval is invalid."
    );
  }
  const deductionModelCode = assertAllowed(
    normalizeOptionalText(snapshot.deductionModelCode) || "max_above_protected_amount",
    PAYROLL_GARNISHMENT_DEDUCTION_MODEL_CODES,
    "garnishment_decision_snapshot_deduction_model_invalid"
  );
  const householdProfile = normalizeGarnishmentHouseholdProfile(snapshot.householdProfile);
  const remittanceMethodCode = assertAllowed(
    normalizeOptionalText(snapshot.remittanceMethodCode) || "bankgiro",
    ["bankgiro", "plusgiro", "manual"],
    "garnishment_decision_snapshot_remittance_method_invalid"
  );
  const normalized = {
    employmentId: requireText(snapshot.employmentId, "garnishment_decision_snapshot_employment_id_required"),
    decisionType,
    incomeYear: normalizeIntegerInRange(snapshot.incomeYear, 2000, 2100, "garnishment_decision_snapshot_income_year_invalid"),
    validFrom,
    validTo,
    deductionModelCode,
    fixedDeductionAmount: normalizeOptionalMoney(
      snapshot.fixedDeductionAmount,
      "garnishment_decision_snapshot_fixed_deduction_amount_invalid"
    ),
    maximumWithheldAmount: normalizeOptionalMoney(
      snapshot.maximumWithheldAmount,
      "garnishment_decision_snapshot_maximum_withheld_amount_invalid"
    ),
    protectedAmountAmount: normalizeRequiredMoney(
      snapshot.protectedAmountAmount,
      "garnishment_decision_snapshot_protected_amount_required"
    ),
    householdProfile,
    householdTypeCode: householdProfile.householdTypeCode,
    householdAdultCount: householdProfile.householdAdultCount,
    householdChildCount: householdProfile.householdChildCount,
    housingCostAmount: normalizeOptionalMoney(snapshot.housingCostAmount, "garnishment_decision_snapshot_housing_cost_invalid"),
    additionalAllowanceAmount: normalizeOptionalMoney(
      snapshot.additionalAllowanceAmount,
      "garnishment_decision_snapshot_additional_allowance_invalid"
    ),
    authorityCaseReference: requireText(
      snapshot.authorityCaseReference,
      "garnishment_decision_snapshot_authority_case_reference_required"
    ),
    remittanceRecipientName: requireText(
      snapshot.remittanceRecipientName || "Kronofogden",
      "garnishment_decision_snapshot_remittance_recipient_required"
    ),
    remittanceMethodCode,
    remittanceBankgiro: normalizeOptionalText(snapshot.remittanceBankgiro),
    remittancePlusgiro: normalizeOptionalText(snapshot.remittancePlusgiro),
    remittanceOcrReference: normalizeOptionalOcrReference(snapshot.remittanceOcrReference, "garnishment_decision_snapshot_remittance_ocr_invalid"),
    decisionSource: requireText(snapshot.decisionSource, "garnishment_decision_snapshot_decision_source_required"),
    decisionReference: requireText(snapshot.decisionReference, "garnishment_decision_snapshot_decision_reference_required"),
    evidenceRef: requireText(snapshot.evidenceRef, "garnishment_decision_snapshot_evidence_ref_required"),
    reasonCode: normalizeOptionalText(snapshot.reasonCode),
    protectedAmountBaseline: deriveGarnishmentProtectedAmountBaseline({
      rules: snapshot.rules || null,
      incomeYear: snapshot.incomeYear,
      householdProfile,
      housingCostAmount: snapshot.housingCostAmount,
      additionalAllowanceAmount: snapshot.additionalAllowanceAmount,
      protectedAmountAmount: snapshot.protectedAmountAmount
    })
  };

  if (deductionModelCode === "fixed_amount" && normalized.fixedDeductionAmount == null) {
    throw createError(
      400,
      "garnishment_decision_snapshot_fixed_amount_required",
      "Fixed amount garnishment decisions require fixedDeductionAmount."
    );
  }
  if (decisionType === "manual_override" && !normalized.reasonCode) {
    throw createError(
      400,
      "garnishment_decision_snapshot_reason_required",
      "Manual garnishment overrides require reasonCode."
    );
  }
  if (remittanceMethodCode === "bankgiro" && !normalized.remittanceBankgiro) {
    throw createError(
      400,
      "garnishment_decision_snapshot_bankgiro_required",
      "Bankgiro remittance requires remittanceBankgiro."
    );
  }
  if (remittanceMethodCode === "plusgiro" && !normalized.remittancePlusgiro) {
    throw createError(
      400,
      "garnishment_decision_snapshot_plusgiro_required",
      "Plusgiro remittance requires remittancePlusgiro."
    );
  }
  return normalized;
}

function normalizeGarnishmentHouseholdProfile(profile = {}) {
  const householdTypeCode = assertAllowed(
    normalizeOptionalText(profile.householdTypeCode),
    PAYROLL_GARNISHMENT_HOUSEHOLD_TYPE_CODES,
    "garnishment_decision_snapshot_household_type_invalid"
  );
  const childAgeBandCounts = {
    age_0_6: normalizeNonNegativeInteger(profile.childAgeBandCounts?.age_0_6 ?? 0, "garnishment_child_age_0_6_invalid"),
    age_7_10: normalizeNonNegativeInteger(profile.childAgeBandCounts?.age_7_10 ?? 0, "garnishment_child_age_7_10_invalid"),
    age_11_14: normalizeNonNegativeInteger(profile.childAgeBandCounts?.age_11_14 ?? 0, "garnishment_child_age_11_14_invalid"),
    age_15_plus: normalizeNonNegativeInteger(profile.childAgeBandCounts?.age_15_plus ?? 0, "garnishment_child_age_15_plus_invalid")
  };
  return {
    householdTypeCode,
    householdAdultCount: householdTypeCode === "cohabiting_adults" ? 2 : 1,
    householdChildCount: Object.values(childAgeBandCounts).reduce((sum, value) => sum + value, 0),
    childAgeBandCounts
  };
}

function deriveGarnishmentProtectedAmountBaseline({
  rules = null,
  incomeYear,
  householdProfile,
  housingCostAmount = null,
  additionalAllowanceAmount = null,
  protectedAmountAmount
}) {
  const yearStart = `${String(normalizeIntegerInRange(incomeYear, 2000, 2100, "garnishment_decision_snapshot_income_year_invalid"))}-01-01`;
  if (!rules || typeof rules.resolveRulePack !== "function") {
    throw createError(409, "garnishment_rulepack_missing", "Garnishment protected amount baseline requires a pinned payroll rulepack.");
  }
  const rulePack = rules
    .resolveRulePack({
      rulePackCode: PAYROLL_GARNISHMENT_RULE_PACK_CODE,
      domain: "payroll",
      jurisdiction: "SE",
      effectiveDate: yearStart
    });
  if (!rulePack?.rulePackId || !rulePack?.rulePackCode || !rulePack?.version || !rulePack?.checksum) {
    throw createError(409, "garnishment_rulepack_missing", "Garnishment protected amount baseline requires a pinned payroll rulepack.");
  }
  const machineRules = rulePack?.machineReadableRules || {};
  const adultBaseAmount = roundMoney(
    Number(machineRules.normalAmountByHouseholdType?.[householdProfile.householdTypeCode] || 0)
  );
  const childAgeBandCounts = copy(householdProfile.childAgeBandCounts || {});
  const childNormalAmount = roundMoney(
    Object.entries(childAgeBandCounts).reduce((sum, [ageBandCode, count]) => {
      const amount = Number(machineRules.childNormalAmountByAgeBand?.[ageBandCode] || 0);
      return sum + amount * Number(count || 0);
    }, 0)
  );
  const resolvedHousingCostAmount = roundMoney(Number(housingCostAmount || 0));
  const resolvedAdditionalAllowanceAmount = roundMoney(Number(additionalAllowanceAmount || 0));
  return {
    rulePackId: rulePack.rulePackId,
    rulePackCode: rulePack.rulePackCode,
    rulePackVersion: rulePack.version,
    rulePackChecksum: rulePack.checksum,
    effectiveDate: yearStart,
    householdTypeCode: householdProfile.householdTypeCode,
    householdAdultCount: householdProfile.householdAdultCount,
    householdChildCount: householdProfile.householdChildCount,
    childAgeBandCounts,
    adultBaseAmount,
    childNormalAmount,
    housingCostAmount: resolvedHousingCostAmount,
    additionalAllowanceAmount: resolvedAdditionalAllowanceAmount,
    derivedProtectedAmountAmount: roundMoney(
      adultBaseAmount + childNormalAmount + resolvedHousingCostAmount + resolvedAdditionalAllowanceAmount
    ),
    decisionProtectedAmountAmount: roundMoney(protectedAmountAmount || 0)
  };
}

function requirePinnedPayrollDecisionRulepackRef(decisionObject, contextCode = "payroll_decision") {
  if (
    !decisionObject?.rule_pack_id
    || !decisionObject?.rule_pack_code
    || !decisionObject?.rule_pack_version
    || !decisionObject?.rule_pack_checksum
  ) {
    throw createError(
      409,
      "payroll_decision_rulepack_missing",
      `${contextCode} requires a pinned payroll rulepack ref.`
    );
  }
  return {
    rulepackId: decisionObject.rule_pack_id,
    rulepackCode: decisionObject.rule_pack_code,
    rulepackVersion: decisionObject.rule_pack_version,
    rulepackChecksum: decisionObject.rule_pack_checksum,
    effectiveDate: decisionObject.effective_date || null
  };
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
  const manualRateReasonCode = normalizeOptionalText(profile.manualRateReasonCode);
  const fallbackManualRateReasonCode = normalizeOptionalText(profile.fallbackManualRateReasonCode);
  const sinkDecisionDocumentId = normalizeOptionalText(profile.sinkDecisionDocumentId);
  if (taxMode === "manual_rate" && !manualRateReasonCode) {
    throw createError(
      400,
      "statutory_profile_manual_rate_reason_required",
      "Manual-rate tax mode is deprecated and requires manualRateReasonCode."
    );
  }
  if (fallbackTaxMode === "manual_rate" && !fallbackManualRateReasonCode) {
    throw createError(
      400,
      "statutory_profile_fallback_manual_rate_reason_required",
      "Fallback manual-rate tax mode is deprecated and requires fallbackManualRateReasonCode."
    );
  }
  if (taxMode === "sink" && !sinkDecisionDocumentId) {
    throw createError(
      400,
      "statutory_profile_sink_decision_document_required",
      "SINK tax mode requires sinkDecisionDocumentId."
    );
  }
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
    sinkDecisionDocumentId,
    manualRateReasonCode,
    fallbackTaxMode,
    fallbackTaxRatePercent: normalizeOptionalNumber(profile.fallbackTaxRatePercent, "statutory_profile_fallback_tax_rate_invalid"),
    fallbackManualRateReasonCode
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
  return Object.freeze({
    payItemCode,
    payItemType,
    displayName,
    calculationBasis,
    unitCode,
    compensationBucket,
    taxTreatmentCode: resolveDefaultTaxTreatmentCode(payItemCode),
    employerContributionTreatmentCode: resolveDefaultEmployerContributionTreatmentCode(payItemCode),
    agiMappingCode: resolveDefaultAgiMappingCode(payItemCode),
    ledgerAccountCode: resolveDefaultLedgerAccountCode(payItemCode),
    affectsVacationBasis,
    affectsPensionBasis,
    includedInNetPay: compensationBucket !== "reporting_only",
    reportingOnly: compensationBucket === "reporting_only"
  });
}

function resolveDefaultTaxTreatmentCode(payItemCode) {
  const resolvedCode = normalizeCode(payItemCode, "pay_item_code_required");
  if (
    resolvedCode.startsWith("TAX_FREE_") ||
    ["NET_DEDUCTION", "GARNISHMENT", "ADVANCE", "RECLAIM", "EXPENSE_REIMBURSEMENT", "PENSION_PREMIUM", "FORA_PREMIUM", "EXTRA_PENSION_PREMIUM", "PENSION_SPECIAL_PAYROLL_TAX"].includes(
      resolvedCode
    )
  ) {
    return "non_taxable";
  }
  return "taxable";
}

function resolveDefaultEmployerContributionTreatmentCode(payItemCode) {
  const resolvedCode = normalizeCode(payItemCode, "pay_item_code_required");
  if (
    resolvedCode.startsWith("TAX_FREE_") ||
    ["NET_DEDUCTION", "GARNISHMENT", "ADVANCE", "RECLAIM", "EXPENSE_REIMBURSEMENT", "PENSION_PREMIUM", "FORA_PREMIUM", "EXTRA_PENSION_PREMIUM", "PENSION_SPECIAL_PAYROLL_TAX"].includes(
      resolvedCode
    )
  ) {
    return "excluded";
  }
  return "included";
}

function resolveDefaultAgiMappingCode(payItemCode) {
  const resolvedCode = normalizeCode(payItemCode, "pay_item_code_required");
  if (["BENEFIT"].includes(resolvedCode)) {
    return "taxable_benefit";
  }
  if (["EXPENSE_REIMBURSEMENT"].includes(resolvedCode)) {
    return "not_reported";
  }
  if (["PENSION_PREMIUM", "FORA_PREMIUM", "EXTRA_PENSION_PREMIUM"].includes(resolvedCode)) {
    return "pension_premium";
  }
  if (["PENSION_SPECIAL_PAYROLL_TAX"].includes(resolvedCode)) {
    return "not_reported";
  }
  if (["TAX_FREE_TRAVEL_ALLOWANCE", "TAX_FREE_MILEAGE"].includes(resolvedCode)) {
    return "tax_free_allowance";
  }
  if (["NET_DEDUCTION", "GARNISHMENT", "ADVANCE", "RECLAIM"].includes(resolvedCode)) {
    return "not_reported";
  }
  return "cash_compensation";
}

function resolveDefaultLedgerAccountCode(payItemCode) {
  const resolvedCode = normalizeCode(payItemCode, "pay_item_code_required");
  switch (resolvedCode) {
    case "MONTHLY_SALARY":
      return "7010";
    case "HOURLY_SALARY":
      return "7020";
    case "OVERTIME":
    case "ADDITIONAL_TIME":
      return "7030";
    case "OB":
      return "7040";
    case "JOUR":
    case "STANDBY":
      return "7050";
    case "BONUS":
    case "COMMISSION":
      return "7060";
    case "VACATION_PAY":
    case "VACATION_SUPPLEMENT":
    case "VACATION_DEDUCTION":
      return "7070";
    case "SICK_ABSENCE_DEDUCTION":
    case "SICK_PAY":
      return "7080";
    case "QUALIFYING_DEDUCTION":
    case "CARE_OF_CHILD":
    case "PARENTAL_LEAVE":
    case "LEAVE_WITHOUT_PAY":
    case "FINAL_PAY":
    case "CORRECTION":
    case "SALARY_EXCHANGE_GROSS_DEDUCTION":
      return "7090";
    case "BENEFIT":
      return "7290";
    case "TAX_FREE_TRAVEL_ALLOWANCE":
    case "TAXABLE_TRAVEL_ALLOWANCE":
      return "7310";
    case "TAX_FREE_MILEAGE":
      case "TAXABLE_MILEAGE":
        return "7320";
      case "EXPENSE_REIMBURSEMENT":
        return "7330";
      case "PENSION_PREMIUM":
        return "7130";
      case "FORA_PREMIUM":
        return "7150";
      case "EXTRA_PENSION_PREMIUM":
        return "7140";
      case "PENSION_SPECIAL_PAYROLL_TAX":
        return "7120";
      case "NET_DEDUCTION":
      case "ADVANCE":
      case "RECLAIM":
        return "2750";
      case "GARNISHMENT":
        return "2720";
    default:
      return "7090";
  }
}

function resolveReportingOnlyLiabilityAccount(line) {
  switch (line.payItemCode) {
    case "PENSION_PREMIUM":
    case "FORA_PREMIUM":
    case "EXTRA_PENSION_PREMIUM":
      return "2740";
    case "PENSION_SPECIAL_PAYROLL_TAX":
      return "2550";
    default:
      return null;
  }
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
  return normalizeOptionalIsoDateKernel(value, code, { errorFactory: createError });
}

function normalizeOptionalIsoTimestamp(value, code) {
  const resolved = normalizeOptionalText(value);
  if (!resolved) {
    return null;
  }
  const parsed = new Date(resolved);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== resolved) {
    throw createError(400, code, `${value} must be a full ISO-8601 UTC timestamp.`);
  }
  return resolved;
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
        .filter((candidate) => !candidate.effectiveTo || candidate.effectiveTo > effectiveDate)
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

function truncateKronaAmount(value) {
  return Math.trunc(Number(value || 0));
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function normalizeAgiSpecificationNumber(value) {
  if (value == null || value === "") {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }
  return normalized;
}

function requireAgiSpecificationNumber(value) {
  const specificationNumber = normalizeAgiSpecificationNumber(value);
  if (specificationNumber == null) {
    throw createError(400, "agi_specification_number_invalid", "AGI specification number must be a positive integer.");
  }
  return specificationNumber;
}

function normalizeAgiWholeKronaAmount(value) {
  if (value == null || value === "") {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    return null;
  }
  return normalized;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function normalizeRequiredDate(value, code) {
  return normalizeRequiredIsoDateKernel(value, code, { errorFactory: createError });
}

function normalizeOptionalOcrReference(value, code) {
  return normalizeOptionalOcrReferenceKernel(value, code, {
    errorFactory: createError,
    controlMode: "mod10"
  });
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

function normalizeOptionalSnapshotStatus(value, allowedValues, code) {
  const resolved = normalizeOptionalText(value);
  if (!resolved) {
    return null;
  }
  return assertAllowed(resolved, allowedValues, code);
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

function normalizeOptionalPercentage(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeRequiredPercentage(value, code);
}

function normalizeRequiredPercentage(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    throw createError(400, code, `${value} must be a percentage between 0 and 100.`);
  }
  return roundMoney(numeric);
}

function normalizeOptionalJsonObject(value, code) {
  if (value == null || value === "") {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw createError(400, code, "Expected a JSON object.");
  }
  return copy(value);
}

function normalizeIntegerInRange(value, min, max, code) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    throw createError(400, code, `${value} must be an integer between ${min} and ${max}.`);
  }
  return numeric;
}

function normalizeNonNegativeInteger(value, code) {
  return normalizeIntegerInRange(value, 0, 999, code);
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


function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
