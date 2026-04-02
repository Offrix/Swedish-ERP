import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";
import {
  ACCOUNT_CATALOG_VERSIONS,
  DSAM_ACCOUNTS,
  DEFAULT_CHART_TEMPLATE_ID,
  getAccountCatalogVersion,
  listAccountCatalogVersions,
  REQUIRED_ENGINE_ACCOUNTS,
  validateRequiredEngineAccounts
} from "./account-catalog.mjs";

export const LEDGER_STATES = Object.freeze(["draft", "approved_for_post", "posted", "reversed", "locked_by_period"]);
export const DEFAULT_LEDGER_CURRENCY = "SEK";
export const ALLOWED_ACCOUNTING_CURRENCY_CODES = Object.freeze(["SEK", "EUR"]);
export const FX_BALANCE_ORIENTATIONS = Object.freeze(["asset", "liability"]);
export const DEFAULT_REALIZED_FX_LOSS_ACCOUNT_NUMBER = "7930";
export const DEFAULT_REALIZED_FX_GAIN_ACCOUNT_NUMBER = "7940";
export const DEFAULT_VOUCHER_SERIES_CODES = Object.freeze("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
export const VOUCHER_SERIES_STATUSES = Object.freeze(["active", "paused", "archived"]);
export const LEDGER_ACCOUNT_STATUSES = Object.freeze(["active", "archived"]);
export const DIMENSION_VALUE_STATUSES = Object.freeze(["active", "archived"]);
export const DEFAULT_VOUCHER_SERIES_PURPOSE_MAP = Object.freeze({
  A: Object.freeze(["LEDGER_MANUAL", "LEDGER_CORRECTION"]),
  B: Object.freeze(["AR_INVOICE", "AR_DUNNING"]),
  C: Object.freeze(["AR_CREDIT_NOTE"]),
  D: Object.freeze(["AR_PAYMENT"]),
  E: Object.freeze(["AP_INVOICE", "AP_CREDIT_NOTE", "AP_PAYMENT"]),
  H: Object.freeze(["PAYROLL_RUN", "PAYROLL_CORRECTION", "PAYROLL_PAYOUT_MATCH"]),
  I: Object.freeze(["VAT_SETTLEMENT", "TAX_ACCOUNT_SETTLEMENT"]),
  V: Object.freeze(["LEDGER_REVERSAL", "AR_WRITEOFF"]),
  W: Object.freeze(["HISTORICAL_IMPORT"])
});
export const POSTING_SOURCE_TYPES = Object.freeze([
  "AR_INVOICE",
  "AR_CREDIT_NOTE",
  "AR_PAYMENT",
  "AP_INVOICE",
  "AP_CREDIT_NOTE",
  "AP_PAYMENT",
  "PAYROLL_RUN",
  "PAYROLL_CORRECTION",
  "BENEFIT_EVENT",
  "TRAVEL_CLAIM",
  "VAT_SETTLEMENT",
  "TAX_ACCOUNT_EVENT",
  "VAT_CLEARING",
  "BANK_IMPORT",
  "HISTORICAL_IMPORT",
  "MANUAL_JOURNAL",
  "ASSET_DEPRECIATION",
  "PERIOD_ACCRUAL",
  "YEAR_END_TRANSFER",
  "ROT_RUT_CLAIM",
  "PENSION_REPORT",
  "PROJECT_WIP",
  "OWNER_DISTRIBUTION"
]);
export const POSTING_JOURNAL_TYPES = Object.freeze([
  "operational_posting",
  "settlement_posting",
  "payroll_posting",
  "tax_account_posting",
  "year_end_adjustment",
  "reversal",
  "correction_replacement",
  "historical_import"
]);
export const YEAR_END_TRANSFER_KINDS = Object.freeze(["RESULT_TRANSFER", "RETAINED_EARNINGS_TRANSFER"]);
export const DEFAULT_CURRENT_YEAR_RESULT_ACCOUNT_NUMBER = "2040";
export const DEFAULT_RETAINED_EARNINGS_ACCOUNT_NUMBER = "2030";
export const DEFAULT_VAT_CLEARING_TARGET_ACCOUNT_NUMBER = "2650";
export const ASSET_CARD_STATUSES = Object.freeze(["active", "fully_depreciated", "disposed"]);
export const DEPRECIATION_METHOD_CODES = Object.freeze(["STRAIGHT_LINE_MONTHLY"]);
export const ACCRUAL_SCHEDULE_STATUSES = Object.freeze(["active", "completed", "reversed"]);
export const ACCRUAL_SCHEDULE_KINDS = Object.freeze([
  "PREPAID_EXPENSE",
  "ACCRUED_EXPENSE",
  "PREPAID_REVENUE",
  "ACCRUED_REVENUE"
]);
export const ACCRUAL_PATTERN_CODES = Object.freeze(["STRAIGHT_LINE_MONTHLY"]);

export const POSTING_RECIPE_DEFINITIONS = Object.freeze([
  Object.freeze({
    recipeCode: "OPENING_BALANCE",
    version: "2026.1",
    sourceDomain: "ledger",
    journalType: "historical_import",
    allowedSourceTypes: Object.freeze(["HISTORICAL_IMPORT"]),
    defaultVoucherSeriesPurposeCode: "HISTORICAL_IMPORT",
    fallbackVoucherSeriesCode: "W",
    defaultSignalCode: "ledger.opening_balance.posted"
  }),
  Object.freeze({
    recipeCode: "LEDGER_MANUAL_JOURNAL",
    version: "2026.1",
    sourceDomain: "ledger",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["MANUAL_JOURNAL"]),
    defaultVoucherSeriesPurposeCode: "LEDGER_MANUAL",
    fallbackVoucherSeriesCode: "A",
    defaultSignalCode: "ledger.manual_journal.created"
  }),
  Object.freeze({
    recipeCode: "AR_INVOICE",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AR_INVOICE"]),
    defaultVoucherSeriesPurposeCode: "AR_INVOICE",
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "ar.invoice.issued"
  }),
  Object.freeze({
    recipeCode: "AR_CREDIT_NOTE",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AR_CREDIT_NOTE"]),
    defaultVoucherSeriesPurposeCode: "AR_CREDIT_NOTE",
    fallbackVoucherSeriesCode: "C",
    defaultSignalCode: "ar.credit_note.issued"
  }),
  Object.freeze({
    recipeCode: "AR_PAYMENT_ALLOCATION",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AR_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AR_PAYMENT",
    fallbackVoucherSeriesCode: "D",
    defaultSignalCode: "ar.payment.allocated"
  }),
  Object.freeze({
    recipeCode: "AR_PAYMENT_REVERSAL",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AR_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AR_PAYMENT",
    fallbackVoucherSeriesCode: "D",
    defaultSignalCode: "ar.payment.reversed"
  }),
  Object.freeze({
    recipeCode: "AR_DUNNING_CHARGE",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AR_INVOICE"]),
    defaultVoucherSeriesPurposeCode: "AR_DUNNING",
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "ar.dunning.charge_booked"
  }),
  Object.freeze({
    recipeCode: "AR_WRITEOFF",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["MANUAL_JOURNAL"]),
    defaultVoucherSeriesPurposeCode: "AR_WRITEOFF",
    fallbackVoucherSeriesCode: "V",
    defaultSignalCode: "ar.writeoff.posted"
  }),
  Object.freeze({
    recipeCode: "AP_INVOICE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AP_INVOICE"]),
    defaultVoucherSeriesPurposeCode: "AP_INVOICE",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.invoice.posted"
  }),
  Object.freeze({
    recipeCode: "AP_CREDIT_NOTE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AP_CREDIT_NOTE"]),
    defaultVoucherSeriesPurposeCode: "AP_CREDIT_NOTE",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.credit_note.posted"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_RESERVE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.payment.reserved"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_RELEASE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.payment.released"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_SETTLEMENT",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "bank.payment_order.settled"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_RETURN",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "bank.payment_order.returned"
  }),
  Object.freeze({
    recipeCode: "PAYROLL_RUN",
    version: "2026.1",
    sourceDomain: "payroll",
    journalType: "payroll_posting",
    allowedSourceTypes: Object.freeze(["PAYROLL_RUN"]),
    defaultVoucherSeriesPurposeCode: "PAYROLL_RUN",
    fallbackVoucherSeriesCode: "H",
    defaultSignalCode: "payroll.run.posted"
  }),
  Object.freeze({
    recipeCode: "PAYROLL_CORRECTION",
    version: "2026.1",
    sourceDomain: "payroll",
    journalType: "payroll_posting",
    allowedSourceTypes: Object.freeze(["PAYROLL_CORRECTION"]),
    defaultVoucherSeriesPurposeCode: "PAYROLL_CORRECTION",
    fallbackVoucherSeriesCode: "H",
    defaultSignalCode: "payroll.run.posted"
  }),
  Object.freeze({
    recipeCode: "PAYROLL_PAYOUT_MATCH",
    version: "2026.1",
    sourceDomain: "payroll",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["PAYROLL_RUN"]),
    defaultVoucherSeriesPurposeCode: "PAYROLL_PAYOUT_MATCH",
    fallbackVoucherSeriesCode: "H",
    defaultSignalCode: "bank.payment_order.settled"
  }),
  Object.freeze({
    recipeCode: "BANK_STATEMENT_MATCH",
    version: "2026.1",
    sourceDomain: "banking",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["BANK_IMPORT"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "D",
    defaultSignalCode: "bank.statement.line.matched_and_approved"
  }),
  Object.freeze({
    recipeCode: "TAX_ACCOUNT_CLASSIFIED_EVENT",
    version: "2026.1",
    sourceDomain: "tax_account",
    journalType: "tax_account_posting",
    allowedSourceTypes: Object.freeze(["TAX_ACCOUNT_EVENT"]),
    defaultVoucherSeriesPurposeCode: "TAX_ACCOUNT_SETTLEMENT",
    fallbackVoucherSeriesCode: "I",
    defaultSignalCode: "tax_account.event.classified_and_approved"
  }),
  Object.freeze({
    recipeCode: "VAT_CLEARING",
    version: "2026.1",
    sourceDomain: "vat",
    journalType: "tax_account_posting",
    allowedSourceTypes: Object.freeze(["VAT_CLEARING"]),
    defaultVoucherSeriesPurposeCode: "VAT_SETTLEMENT",
    fallbackVoucherSeriesCode: "I",
    defaultSignalCode: "vat.clearing.completed"
  }),
  Object.freeze({
    recipeCode: "ASSET_DEPRECIATION",
    version: "2026.1",
    sourceDomain: "ledger",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["ASSET_DEPRECIATION"]),
    defaultVoucherSeriesPurposeCode: "LEDGER_MANUAL",
    fallbackVoucherSeriesCode: "A",
    defaultSignalCode: "asset.depreciation.booked"
  }),
  Object.freeze({
    recipeCode: "PERIOD_ACCRUAL",
    version: "2026.1",
    sourceDomain: "ledger",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["PERIOD_ACCRUAL"]),
    defaultVoucherSeriesPurposeCode: "LEDGER_MANUAL",
    fallbackVoucherSeriesCode: "A",
    defaultSignalCode: "accrual.booked"
  }),
  Object.freeze({
    recipeCode: "HUS_CLAIM_SUBMITTED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "hus.claim.submitted"
  }),
  Object.freeze({
    recipeCode: "HUS_CLAIM_ACCEPTED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "hus.claim.accepted"
  }),
  Object.freeze({
    recipeCode: "HUS_CLAIM_PARTIALLY_ACCEPTED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "hus.claim.partially_accepted"
  }),
  Object.freeze({
    recipeCode: "HUS_CLAIM_DIFFERENCE_CUSTOMER_RECEIVABLE",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "V",
    defaultSignalCode: "hus.claim.difference.customer_reinvoice"
  }),
  Object.freeze({
    recipeCode: "HUS_CLAIM_DIFFERENCE_WRITEOFF",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "V",
    defaultSignalCode: "hus.claim.difference.written_off"
  }),
  Object.freeze({
    recipeCode: "HUS_PAYOUT_SETTLED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "hus.payout.settled"
  }),
  Object.freeze({
    recipeCode: "HUS_RECOVERY_CONFIRMED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "V",
    defaultSignalCode: "hus.recovery.confirmed"
  }),
  Object.freeze({
    recipeCode: "PROJECT_WIP_BRIDGE",
    version: "2026.1",
    sourceDomain: "projects",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["PROJECT_WIP"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "A",
    defaultSignalCode: "project.wip_ledger_bridge.posted"
  }),
  Object.freeze({
    recipeCode: "YEAR_END_ADJUSTMENT",
    version: "2026.1",
    sourceDomain: "ledger_close",
    journalType: "year_end_adjustment",
    allowedSourceTypes: Object.freeze(["YEAR_END_TRANSFER"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "X",
    defaultSignalCode: "close.adjustment.approved"
  })
]);

const POSTING_RECIPES_BY_CODE = new Map(POSTING_RECIPE_DEFINITIONS.map((recipe) => [recipe.recipeCode, recipe]));

export {
  ACCOUNT_CATALOG_VERSIONS,
  DSAM_ACCOUNTS,
  DEFAULT_CHART_TEMPLATE_ID,
  getAccountCatalogVersion,
  listAccountCatalogVersions,
  REQUIRED_ENGINE_ACCOUNTS,
  validateRequiredEngineAccounts
};

export function buildJournalReversalLineInputs(lines = [], { sourceTypeOverride = null } = {}) {
  if (!Array.isArray(lines)) {
    throw httpError(400, "journal_lines_required", "Journal entry lines are required.");
  }
  return lines.map((line) => ({
    accountNumber: line.accountNumber,
    debitAmount: normalizeSignedMoney(line.originalCreditAmount ?? line.creditAmount ?? 0),
    creditAmount: normalizeSignedMoney(line.originalDebitAmount ?? line.debitAmount ?? 0),
    currencyCode: line.originalCurrencyCode || line.currencyCode || DEFAULT_LEDGER_CURRENCY,
    exchangeRate: line.exchangeRate == null ? null : normalizeRate(line.exchangeRate),
    functionalDebitAmount: normalizeSignedMoney(line.creditAmount ?? 0),
    functionalCreditAmount: normalizeSignedMoney(line.debitAmount ?? 0),
    dimensionJson: copy(line.dimensionJson),
    sourceType: sourceTypeOverride ? assertPostingSourceType(sourceTypeOverride) : assertPostingSourceType(line.sourceType || "MANUAL_JOURNAL"),
    sourceId: requireText(line.sourceId || "journal_reversal", "source_id_required")
  }));
}

export function buildRealizedFxJournalLine({
  differenceAmount,
  balanceOrientation,
  sourceType = "MANUAL_JOURNAL",
  sourceId,
  lineNumber = 1,
  gainAccountNumber = DEFAULT_REALIZED_FX_GAIN_ACCOUNT_NUMBER,
  lossAccountNumber = DEFAULT_REALIZED_FX_LOSS_ACCOUNT_NUMBER,
  dimensionJson = null
} = {}) {
  const normalizedDifferenceAmount = normalizeSignedMoney(differenceAmount);
  if (normalizedDifferenceAmount === 0) {
    return null;
  }
  const normalizedBalanceOrientation = assertFxBalanceOrientation(balanceOrientation);
  const gain =
    (normalizedBalanceOrientation === "asset" && normalizedDifferenceAmount > 0)
    || (normalizedBalanceOrientation === "liability" && normalizedDifferenceAmount < 0);
  const absoluteAmount = normalizeSignedMoney(Math.abs(normalizedDifferenceAmount));
  const line = {
    accountNumber: gain ? normalizeAccountNumber(gainAccountNumber) : normalizeAccountNumber(lossAccountNumber),
    debitAmount: gain ? 0 : absoluteAmount,
    creditAmount: gain ? absoluteAmount : 0,
    lineNumber,
    sourceType: assertPostingSourceType(sourceType),
    sourceId: requireText(sourceId, "source_id_required")
  };
  if (dimensionJson && Object.keys(dimensionJson).length > 0) {
    line.dimensionJson = copy(dimensionJson);
  }
  return line;
}

export function buildFxRevaluationJournalLines({
  carryingAccountNumber,
  differenceAmount,
  balanceOrientation,
  sourceType = "MANUAL_JOURNAL",
  sourceId,
  lineNumberStart = 1,
  gainAccountNumber = DEFAULT_REALIZED_FX_GAIN_ACCOUNT_NUMBER,
  lossAccountNumber = DEFAULT_REALIZED_FX_LOSS_ACCOUNT_NUMBER,
  carryingDimensionJson = null,
  fxDimensionJson = null
} = {}) {
  const normalizedDifferenceAmount = normalizeSignedMoney(differenceAmount);
  if (normalizedDifferenceAmount === 0) {
    return [];
  }
  const normalizedBalanceOrientation = assertFxBalanceOrientation(balanceOrientation);
  const absoluteAmount = normalizeSignedMoney(Math.abs(normalizedDifferenceAmount));
  const carryingLine = {
    accountNumber: normalizeAccountNumber(carryingAccountNumber),
    debitAmount: 0,
    creditAmount: 0,
    lineNumber: lineNumberStart,
    sourceType: assertPostingSourceType(sourceType),
    sourceId: requireText(sourceId, "source_id_required")
  };
  if (carryingDimensionJson && Object.keys(carryingDimensionJson).length > 0) {
    carryingLine.dimensionJson = copy(carryingDimensionJson);
  }
  if (normalizedBalanceOrientation === "asset") {
    if (normalizedDifferenceAmount > 0) {
      carryingLine.debitAmount = absoluteAmount;
    } else {
      carryingLine.creditAmount = absoluteAmount;
    }
  } else if (normalizedDifferenceAmount > 0) {
    carryingLine.creditAmount = absoluteAmount;
  } else {
    carryingLine.debitAmount = absoluteAmount;
  }
  const fxLine = buildRealizedFxJournalLine({
    differenceAmount: normalizedBalanceOrientation === "asset" ? normalizedDifferenceAmount : 0 - normalizedDifferenceAmount,
    balanceOrientation: "asset",
    sourceType,
    sourceId,
    lineNumber: lineNumberStart + 1,
    gainAccountNumber,
    lossAccountNumber,
    dimensionJson: fxDimensionJson
  });
  return fxLine ? [carryingLine, fxLine] : [carryingLine];
}

const DEMO_LEDGER_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const DIMENSION_TYPES = Object.freeze(["projects", "costCenters", "businessAreas", "serviceLines"]);
const DIMENSION_KEYS = Object.freeze(["projectId", "costCenterCode", "businessAreaCode", "serviceLineCode"]);
const DIMENSION_KEY_TO_CATALOG_KEY = Object.freeze({
  projectId: "projects",
  costCenterCode: "costCenters",
  businessAreaCode: "businessAreas",
  serviceLineCode: "serviceLines"
});
const DIMENSION_TYPE_CONFIG = Object.freeze({
  projects: Object.freeze({ valueKey: "projectId", codePrefix: "PRJ" }),
  costCenters: Object.freeze({ valueKey: "costCenterCode", codePrefix: "CC" }),
  businessAreas: Object.freeze({ valueKey: "businessAreaCode", codePrefix: "BA" }),
  serviceLines: Object.freeze({ valueKey: "serviceLineCode", codePrefix: "SL" })
});
const LOCKED_PERIOD_STATUSES = Object.freeze(["soft_locked", "hard_closed"]);
const DEMO_DIMENSION_CATALOG = Object.freeze({
  projects: Object.freeze([
    { code: "project-demo-alpha", label: "Demo Project Alpha", status: "active" },
    { code: "project-demo-beta", label: "Demo Project Beta", status: "active" }
  ]),
  costCenters: Object.freeze([
    { code: "CC-100", label: "Operations", status: "active" },
    { code: "CC-200", label: "Projects", status: "active" }
  ]),
  businessAreas: Object.freeze([
    { code: "BA-SERVICES", label: "Services", status: "active" },
    { code: "BA-FIELD", label: "Field", status: "active" }
  ]),
  serviceLines: Object.freeze([
    { code: "SL-SERVICE", label: "Service work", status: "active" },
    { code: "SL-INSTALL", label: "Installation work", status: "active" },
    { code: "SL-ROT", label: "ROT labor", status: "active" }
  ])
});

export function createLedgerPlatform(options = {}) {
  return createLedgerEngine(options);
}

export function createLedgerEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  accountingMethodPlatform = null,
  fiscalYearPlatform = null,
  getVatPlatform = null
} = {}) {
  const state = {
    accounts: new Map(),
    accountIdsByCompanyNumber: new Map(),
    accountingCurrencyProfilesByCompanyId: new Map(),
    fxRevaluationBatches: new Map(),
    fxRevaluationBatchIdsByCompanyKey: new Map(),
    voucherSeries: new Map(),
    voucherSeriesIdsByCompanyCode: new Map(),
    openingBalanceBatches: new Map(),
    openingBalanceBatchIdsByCompany: new Map(),
    openingBalanceBatchIdsByCompanyKey: new Map(),
    yearEndTransferBatches: new Map(),
    yearEndTransferBatchIdsByCompany: new Map(),
    yearEndTransferBatchIdsByCompanyKey: new Map(),
    vatClearingRuns: new Map(),
    vatClearingRunIdsByCompany: new Map(),
    vatClearingRunIdsByCompanyKey: new Map(),
    assetCards: new Map(),
    assetCardIdsByCompany: new Map(),
    assetCardIdsByCompanyKey: new Map(),
    depreciationBatches: new Map(),
    depreciationBatchIdsByCompany: new Map(),
    depreciationBatchIdsByCompanyKey: new Map(),
    accrualSchedules: new Map(),
    accrualScheduleIdsByCompany: new Map(),
    accrualScheduleIdsByCompanyKey: new Map(),
    accrualBatches: new Map(),
    accrualBatchIdsByCompany: new Map(),
    accrualBatchIdsByCompanyKey: new Map(),
    postingIntents: new Map(),
    postingIntentIdsByCompanyKey: new Map(),
    accountingPeriods: new Map(),
    dimensionCatalogsByCompanyId: new Map(),
    journalEntries: new Map(),
    journalLinesByEntryId: new Map(),
    idempotencyKeys: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
    synchronizeLedgerPeriodsForCompany(DEMO_LEDGER_COMPANY_ID);
  }

  return {
    ledgerStates: LEDGER_STATES,
    postingSourceTypes: POSTING_SOURCE_TYPES,
    postingJournalTypes: POSTING_JOURNAL_TYPES,
    postingRecipes: POSTING_RECIPE_DEFINITIONS,
    accountCatalogVersions: ACCOUNT_CATALOG_VERSIONS,
    defaultChartTemplateId: DEFAULT_CHART_TEMPLATE_ID,
    listAccountCatalogVersions,
    getAccountCatalogVersion,
    installLedgerCatalog,
    getAccountingCurrencyProfile,
    upsertAccountingCurrencyProfile,
    createFxRevaluationBatch,
    approveFxRevaluationBatch,
    postFxRevaluationBatch,
    reverseFxRevaluationBatch,
    getFxRevaluationBatch,
    listFxRevaluationBatches,
    ensureAccountingYearPeriod,
    listPostingRecipes,
    getPostingRecipe,
    listLedgerAccounts,
    upsertLedgerAccount,
    listVoucherSeries,
    getVoucherSeries,
    upsertVoucherSeries,
    createOpeningBalanceBatch,
    listOpeningBalanceBatches,
    getOpeningBalanceBatch,
    reverseOpeningBalanceBatch,
    createYearEndTransferBatch,
    listYearEndTransferBatches,
    getYearEndTransferBatch,
    reverseYearEndTransferBatch,
    createVatClearingRun,
    listVatClearingRuns,
    getVatClearingRun,
    reverseVatClearingRun,
    registerAssetCard,
    listAssetCards,
    getAssetCard,
    runDepreciationBatch,
    listDepreciationBatches,
    getDepreciationBatch,
    reverseDepreciationBatch,
    registerAccrualSchedule,
    listAccrualSchedules,
    getAccrualSchedule,
    runAccrualBatch,
    listAccrualBatches,
    getAccrualBatch,
    reverseAccrualBatch,
    reserveImportedVoucherNumber,
    resolveVoucherSeriesForPurpose,
    createPostingIntent,
    listAccountingPeriods,
    listLedgerDimensions,
    upsertLedgerDimensionValue,
    lockAccountingPeriod,
    reopenAccountingPeriod,
    applyPostingIntent,
    createJournalEntry,
    validateJournalEntry,
    postJournalEntry,
    reverseJournalEntry,
    correctJournalEntry,
    getJournalEntry,
    listJournalEntries,
    snapshotLedger,
    exportDurableState,
    importDurableState
  };

  function installLedgerCatalog({
    companyId,
    chartTemplateId = DEFAULT_CHART_TEMPLATE_ID,
    accountingCurrencyCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    let catalogVersion;
    try {
      catalogVersion = getAccountCatalogVersion(chartTemplateId);
    } catch (error) {
      throw httpError(
        404,
        "ledger_chart_template_not_found",
        `Ledger chart template ${chartTemplateId} is not published.`
      );
    }
    try {
      validateRequiredEngineAccounts(catalogVersion);
    } catch (error) {
      throw httpError(
        422,
        "ledger_chart_template_missing_required_accounts",
        `Ledger chart template ${catalogVersion.versionId} is missing required fallback account coverage.`
      );
    }
    const now = nowIso();
    let installedAccounts = 0;
    let installedVoucherSeries = 0;
    upsertAccountingCurrencyProfile({
      companyId: resolvedCompanyId,
      accountingCurrencyCode: accountingCurrencyCode || DEFAULT_LEDGER_CURRENCY,
      actorId,
      correlationId,
      sourceCode: "chart_install"
    });

    for (const definition of catalogVersion.accounts) {
      const key = toCompanyScopedKey(resolvedCompanyId, definition.accountNumber);
      if (state.accountIdsByCompanyNumber.has(key)) {
        continue;
      }
      const account = {
        accountId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        accountNumber: definition.accountNumber,
        accountName: definition.accountName,
        accountClass: definition.accountClass,
        status: "active",
        governanceVersion: 1,
        locked: true,
        systemManaged: true,
        allowManualPosting: true,
        requiredDimensionKeys: [],
        metadataJson: {
          chartTemplateId: catalogVersion.versionId,
          chartTemplateSourceName: catalogVersion.sourceName,
          chartTemplateSourceDocumentName: catalogVersion.sourceDocumentName,
          chartTemplateChecksumAlgorithm: catalogVersion.checksumAlgorithm,
          chartTemplateChecksum: catalogVersion.checksum,
          chartTemplateEffectiveFrom: catalogVersion.effectiveFrom,
          chartTemplatePublishedAt: catalogVersion.publishedAt,
          seedSource: "account_catalog_version",
          chartGovernanceStatus: "published",
          lastChangeReasonCode: "chart_install"
        },
        createdAt: now,
        updatedAt: now
      };
      state.accounts.set(account.accountId, account);
      state.accountIdsByCompanyNumber.set(key, account.accountId);
      installedAccounts += 1;
    }

    for (const seriesCode of DEFAULT_VOUCHER_SERIES_CODES) {
      const key = toCompanyScopedKey(resolvedCompanyId, seriesCode);
      if (state.voucherSeriesIdsByCompanyCode.has(key)) {
        continue;
      }
      const voucherSeries = {
        voucherSeriesId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        seriesCode,
        description: defaultSeriesDescription(seriesCode),
        nextNumber: 1,
        status: "active",
        purposeCodes: defaultSeriesPurposeCodes(seriesCode),
        importedSequencePreservationEnabled: true,
        profileVersion: 1,
        locked: true,
        systemManaged: true,
        changeReasonCode: "chart_install",
        createdAt: now,
        updatedAt: now
      };
      state.voucherSeries.set(voucherSeries.voucherSeriesId, voucherSeries);
      state.voucherSeriesIdsByCompanyCode.set(key, voucherSeries.voucherSeriesId);
      installedVoucherSeries += 1;
    }

    ensureDimensionCatalog(resolvedCompanyId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ledger.catalog.installed",
      entityType: "ledger_catalog",
      entityId: `${resolvedCompanyId}:${catalogVersion.versionId}:${catalogVersion.checksum}`,
      explanation: `Installed ${catalogVersion.versionId} chart and voucher series for ${resolvedCompanyId}.`
    });

    return {
      companyId: resolvedCompanyId,
      chartTemplateId: catalogVersion.versionId,
      chartTemplateChecksum: catalogVersion.checksum,
      chartTemplateSourceName: catalogVersion.sourceName,
      chartTemplateEffectiveFrom: catalogVersion.effectiveFrom,
      installedAccounts,
      installedVoucherSeries,
      totalAccounts: listLedgerAccounts({ companyId: resolvedCompanyId }).length,
      totalVoucherSeries: listVoucherSeries({ companyId: resolvedCompanyId }).length
    };
  }

  function listLedgerAccounts({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.accounts.values()]
      .filter((account) => account.companyId === resolvedCompanyId)
      .sort((left, right) => left.accountNumber.localeCompare(right.accountNumber))
      .map(copy);
  }

  function getAccountingCurrencyProfile({ companyId } = {}) {
    return copy(ensureAccountingCurrencyProfile(requireText(companyId, "company_id_required")));
  }

  function upsertAccountingCurrencyProfile({
    companyId,
    accountingCurrencyCode,
    actorId,
    sourceCode = "manual_update",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const normalizedAccountingCurrencyCode = assertAccountingCurrencyCode(accountingCurrencyCode);
    const now = nowIso();
    const existing = state.accountingCurrencyProfilesByCompanyId.get(resolvedCompanyId);
    if (existing && existing.accountingCurrencyCode === normalizedAccountingCurrencyCode) {
      return copy(existing);
    }
    if (existing && accountingCurrencyProfileHasUsage(resolvedCompanyId)) {
      throw httpError(
        409,
        "ledger_accounting_currency_locked_after_use",
        `Accounting currency for company ${resolvedCompanyId} cannot change after journals exist.`
      );
    }
    const profile = existing || {
      accountingCurrencyProfileId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      createdAt: now
    };
    profile.accountingCurrencyCode = normalizedAccountingCurrencyCode;
    profile.reportingCurrencyCode = normalizedAccountingCurrencyCode;
    profile.profileVersion = Number(profile.profileVersion || 0) + 1;
    profile.sourceCode = requireText(sourceCode, "ledger_accounting_currency_source_code_required");
    profile.updatedAt = now;
    state.accountingCurrencyProfilesByCompanyId.set(resolvedCompanyId, profile);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: existing ? "ledger.accounting_currency.updated" : "ledger.accounting_currency.created",
      entityType: "ledger_accounting_currency_profile",
      entityId: profile.accountingCurrencyProfileId,
      explanation: `${existing ? "Updated" : "Created"} accounting currency profile ${normalizedAccountingCurrencyCode}.`
    });
    return copy(profile);
  }

  function upsertLedgerAccount({
    companyId,
    accountNumber,
    accountName,
    accountClass,
    status = null,
    allowManualPosting = null,
    requiredDimensionKeys = null,
    locked = null,
    changeReasonCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedAccountNumber = normalizeAccountNumber(accountNumber);
    const now = nowIso();
    const key = toCompanyScopedKey(resolvedCompanyId, resolvedAccountNumber);
    const existingAccountId = state.accountIdsByCompanyNumber.get(key);
    const existing = existingAccountId ? state.accounts.get(existingAccountId) : null;
    const hasUsage = existing ? accountHasUsage({ companyId: resolvedCompanyId, accountId: existing.accountId }) : false;

    if (existing && hasUsage && !changeReasonCode) {
      throw httpError(
        409,
        "ledger_account_change_reason_required",
        `Ledger account ${resolvedAccountNumber} requires a change reason after it has been used in journals.`
      );
    }

    const record = existing || {
      accountId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      accountNumber: resolvedAccountNumber,
      createdAt: now,
      metadataJson: {}
    };

    const resolvedAccountClass = normalizeAccountClass(accountClass ?? existing?.accountClass);
    if (existing && hasUsage && resolvedAccountClass !== existing.accountClass) {
      throw httpError(
        409,
        "ledger_account_class_locked_after_use",
        `Ledger account ${resolvedAccountNumber} cannot change account class after it has been used in journals.`
      );
    }

    record.accountName = normalizeLedgerLabel(accountName ?? existing?.accountName, "account_name_required");
    record.accountClass = resolvedAccountClass;
    record.status = normalizeLedgerAccountStatus(status ?? existing?.status ?? "active");
    record.allowManualPosting = allowManualPosting == null ? existing?.allowManualPosting ?? true : allowManualPosting === true;
    record.requiredDimensionKeys = normalizeRequiredDimensionKeys(requiredDimensionKeys ?? existing?.requiredDimensionKeys ?? []);
    record.locked = locked == null ? existing?.locked ?? true : locked === true;
    record.systemManaged = existing?.systemManaged ?? false;
    record.governanceVersion = (existing?.governanceVersion || 0) + 1;
    record.metadataJson = {
      ...(existing?.metadataJson || {}),
      chartGovernanceStatus: "published",
      lastChangeReasonCode: changeReasonCode || existing?.metadataJson?.lastChangeReasonCode || (existing ? "governance_update" : "custom_account_create")
    };
    record.updatedAt = now;

    state.accounts.set(record.accountId, record);
    state.accountIdsByCompanyNumber.set(key, record.accountId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: existing ? "ledger.account.updated" : "ledger.account.created",
      entityType: "ledger_account",
      entityId: record.accountId,
      explanation: `${existing ? "Updated" : "Created"} ledger account ${record.accountNumber}.`
    });

    return copy(record);
  }

  function listVoucherSeries({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.voucherSeries.values()]
      .filter((voucherSeries) => voucherSeries.companyId === resolvedCompanyId)
      .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode))
      .map(copy);
  }

  function getVoucherSeries({ companyId, seriesCode } = {}) {
    return copy(requireVoucherSeries(requireText(companyId, "company_id_required"), seriesCode));
  }

  function upsertVoucherSeries({
    companyId,
    seriesCode,
    description = null,
    nextNumber = null,
    status = null,
    purposeCodes = null,
    importedSequencePreservationEnabled = null,
    locked = null,
    changeReasonCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSeriesCode = normalizeSeriesCode(seriesCode, "voucher_series_code_required");
    const now = nowIso();
    const existing = findVoucherSeries(state, resolvedCompanyId, resolvedSeriesCode);
    const hasUsage = existing ? voucherSeriesHasUsage({ companyId: resolvedCompanyId, voucherSeriesId: existing.voucherSeriesId }) : false;
    const resolvedStatus = normalizeVoucherSeriesStatus(status ?? existing?.status ?? "active");
    const resolvedPurposeCodes = normalizeVoucherSeriesPurposeCodes(
      purposeCodes ?? existing?.purposeCodes ?? defaultSeriesPurposeCodes(resolvedSeriesCode)
    );

    if (existing && hasUsage) {
      if (!changeReasonCode) {
        throw httpError(
          409,
          "voucher_series_change_reason_required",
          `Voucher series ${resolvedSeriesCode} requires a change reason after it has been used in journals.`
        );
      }
      if (JSON.stringify(resolvedPurposeCodes) !== JSON.stringify(existing.purposeCodes || [])) {
        throw httpError(
          409,
          "voucher_series_purposes_locked_after_use",
          `Voucher series ${resolvedSeriesCode} cannot change purpose mapping after it has been used in journals.`
        );
      }
    }

    ensureVoucherSeriesPurposeAvailability({
      state,
      companyId: resolvedCompanyId,
      purposeCodes: resolvedPurposeCodes,
      currentVoucherSeriesId: existing?.voucherSeriesId || null,
      status: resolvedStatus
    });

    const record = existing || {
      voucherSeriesId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      seriesCode: resolvedSeriesCode,
      createdAt: now
    };
    record.description = normalizeVoucherSeriesDescription(
      description ?? existing?.description ?? defaultSeriesDescription(resolvedSeriesCode)
    );
    record.nextNumber = normalizePositiveInteger(
      nextNumber ?? existing?.nextNumber ?? 1,
      "voucher_series_next_number_invalid"
    );
    record.status = resolvedStatus;
    record.purposeCodes = resolvedPurposeCodes;
    record.importedSequencePreservationEnabled =
      importedSequencePreservationEnabled == null
        ? existing?.importedSequencePreservationEnabled ?? true
        : Boolean(importedSequencePreservationEnabled);
    record.profileVersion = (existing?.profileVersion || 0) + 1;
    record.locked = locked == null ? existing?.locked ?? true : locked === true;
    record.systemManaged = existing?.systemManaged ?? false;
    record.changeReasonCode = changeReasonCode || existing?.changeReasonCode || (existing ? "governance_update" : "series_create");
    record.updatedAt = now;

    state.voucherSeries.set(record.voucherSeriesId, record);
    state.voucherSeriesIdsByCompanyCode.set(toCompanyScopedKey(resolvedCompanyId, resolvedSeriesCode), record.voucherSeriesId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: existing ? "ledger.voucher_series.updated" : "ledger.voucher_series.created",
      entityType: "voucher_series",
      entityId: record.voucherSeriesId,
      explanation: `${existing ? "Updated" : "Created"} voucher series ${record.seriesCode}.`
    });

    return copy(record);
  }

  function reserveImportedVoucherNumber({
    companyId,
    seriesCode,
    importedVoucherNumber,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const series = requireVoucherSeries(resolvedCompanyId, seriesCode);
    const resolvedImportedVoucherNumber = normalizePositiveInteger(
      importedVoucherNumber,
      "imported_voucher_number_invalid"
    );
    if (series.importedSequencePreservationEnabled !== true) {
      throw httpError(
        409,
        "voucher_series_import_preservation_disabled",
        `Voucher series ${series.seriesCode} does not allow imported sequence preservation.`
      );
    }

    const nextNumberAdjusted = series.nextNumber <= resolvedImportedVoucherNumber;
    if (nextNumberAdjusted) {
      series.nextNumber = resolvedImportedVoucherNumber + 1;
      series.updatedAt = nowIso();
    }

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.voucher_series.imported_number_reserved",
      entityType: "voucher_series",
      entityId: series.voucherSeriesId,
      explanation: `Reserved imported voucher number ${resolvedImportedVoucherNumber} in series ${series.seriesCode}.`
    });

    return {
      voucherSeries: copy(series),
      nextNumberAdjusted
    };
  }

  function createOpeningBalanceBatch({
    companyId,
    fiscalYearId,
    openingDate,
    sourceCode,
    externalReference = null,
    description = null,
    evidenceRefs = [],
    lines,
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const dedupeKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingBatchId = state.openingBalanceBatchIdsByCompanyKey.get(dedupeKey);
    if (existingBatchId) {
      return copy(requireOpeningBalanceBatch(resolvedCompanyId, existingBatchId));
    }

    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const fiscalYear = requireOpeningBalanceFiscalYear({
      companyId: resolvedCompanyId,
      fiscalYearId,
      openingDate
    });
    assertOpeningBalanceUniqueness({
      companyId: resolvedCompanyId,
      fiscalYearId: fiscalYear.fiscalYearId
    });

    const openingBalanceBatchId = crypto.randomUUID();
    const accountingCurrencyProfile = ensureAccountingCurrencyProfile(resolvedCompanyId);
    const accountingPeriod = resolveAccountingPeriod(resolvedCompanyId, fiscalYear.startDate);
    const normalizedLines = normalizeOpeningBalanceLineInputs({
      companyId: resolvedCompanyId,
      lines,
      sourceId: openingBalanceBatchId
    });
    const totals = calculateInputLineTotals(normalizedLines);
    const resolvedSourceCode = normalizeCode(sourceCode, "opening_balance_source_code_required");
    const resolvedEvidenceRefs = normalizeReferenceList(evidenceRefs);
    const resolvedDescription = normalizeOptionalText(description) || `Opening balance ${fiscalYear.startDate}`;

    const posted = applyPostingIntent({
      companyId: resolvedCompanyId,
      journalDate: fiscalYear.startDate,
      recipeCode: "OPENING_BALANCE",
      sourceType: "HISTORICAL_IMPORT",
      sourceId: openingBalanceBatchId,
      sourceObjectVersion: "1",
      description: resolvedDescription,
      actorId: resolvedActorId,
      idempotencyKey: `${resolvedIdempotencyKey}:journal`,
      lines: normalizedLines,
      currencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      metadataJson: {
        openingBalanceBatchId,
        openingBalanceSourceCode: resolvedSourceCode,
        openingBalanceExternalReference: normalizeOptionalText(externalReference),
        openingBalanceEvidenceRefs: resolvedEvidenceRefs,
        fiscalYearId: fiscalYear.fiscalYearId,
        fiscalYearStartDate: fiscalYear.startDate
      },
      correlationId
    });

    const batch = Object.freeze({
      openingBalanceBatchId,
      companyId: resolvedCompanyId,
      fiscalYearId: fiscalYear.fiscalYearId,
      fiscalYearStartDate: fiscalYear.startDate,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      openingDate: fiscalYear.startDate,
      status: "posted",
      sourceCode: resolvedSourceCode,
      externalReference: normalizeOptionalText(externalReference),
      accountingCurrencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      lineCount: normalizedLines.length,
      totals,
      journalEntryId: posted.journalEntry.journalEntryId,
      reversalJournalEntryId: null,
      evidenceRefs: resolvedEvidenceRefs,
      lines: Object.freeze(normalizedLines.map(copy)),
      createdByActorId: resolvedActorId,
      createdAt: nowIso(),
      reversedAt: null,
      reversedByActorId: null
    });

    state.openingBalanceBatches.set(batch.openingBalanceBatchId, batch);
    appendToIndex(state.openingBalanceBatchIdsByCompany, resolvedCompanyId, batch.openingBalanceBatchId);
    state.openingBalanceBatchIdsByCompanyKey.set(dedupeKey, batch.openingBalanceBatchId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.opening_balance.posted",
      entityType: "opening_balance_batch",
      entityId: batch.openingBalanceBatchId,
      explanation: `Posted opening balance batch for fiscal year ${fiscalYear.startDate}.`
    });

    return copy(batch);
  }

  function listOpeningBalanceBatches({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.openingBalanceBatchIdsByCompany.get(resolvedCompanyId) || [])
      .map((batchId) => state.openingBalanceBatches.get(batchId))
      .filter(Boolean)
      .sort((left, right) => left.openingDate.localeCompare(right.openingDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getOpeningBalanceBatch({ companyId, openingBalanceBatchId } = {}) {
    return copy(requireOpeningBalanceBatch(requireText(companyId, "company_id_required"), openingBalanceBatchId));
  }

  function reverseOpeningBalanceBatch({
    companyId,
    openingBalanceBatchId,
    reasonCode,
    reversedOn = null,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const batch = requireOpeningBalanceBatch(resolvedCompanyId, openingBalanceBatchId);
    if (batch.status === "reversed") {
      return copy(batch);
    }

    const reversed = reverseJournalEntry({
      companyId: resolvedCompanyId,
      journalEntryId: batch.journalEntryId,
      actorId: requireText(actorId, "actor_id_required"),
      approvedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
      approvedByRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required"),
      reasonCode: requireText(reasonCode, "reason_code_required"),
      correctionKey: `opening_balance:${batch.openingBalanceBatchId}`,
      journalDate: reversedOn ? normalizeDate(reversedOn, "opening_balance_reversed_on_invalid") : null,
      correlationId
    });

    const reversedBatch = Object.freeze({
      ...batch,
      status: "reversed",
      reversalJournalEntryId: reversed.reversalJournalEntry.journalEntryId,
      reversedAt: nowIso(),
      reversedByActorId: requireText(actorId, "actor_id_required")
    });
    state.openingBalanceBatches.set(reversedBatch.openingBalanceBatchId, reversedBatch);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.opening_balance.reversed",
      entityType: "opening_balance_batch",
      entityId: reversedBatch.openingBalanceBatchId,
      explanation: `Reversed opening balance batch ${reversedBatch.openingBalanceBatchId}.`
    });

    return copy(reversedBatch);
  }

  function createYearEndTransferBatch({
    companyId,
    fiscalYearId,
    transferKind,
    transferDate = null,
    sourceCode,
    externalReference = null,
    description = null,
    evidenceRefs = [],
    resultAccountNumber = DEFAULT_CURRENT_YEAR_RESULT_ACCOUNT_NUMBER,
    retainedEarningsAccountNumber = DEFAULT_RETAINED_EARNINGS_ACCOUNT_NUMBER,
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const resolvedTransferKind = assertYearEndTransferKind(transferKind);
    const dedupeKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingBatchId = state.yearEndTransferBatchIdsByCompanyKey.get(dedupeKey);
    if (existingBatchId) {
      return copy(requireYearEndTransferBatch(resolvedCompanyId, existingBatchId));
    }

    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const fiscalYear = requireYearEndTransferFiscalYear({
      companyId: resolvedCompanyId,
      fiscalYearId
    });
    assertYearEndTransferUniqueness({
      companyId: resolvedCompanyId,
      fiscalYearId: fiscalYear.fiscalYearId,
      transferKind: resolvedTransferKind
    });

    const resolvedTransferDate = resolveYearEndTransferDate({
      transferKind: resolvedTransferKind,
      fiscalYear,
      transferDate
    });
    const yearEndTransferBatchId = crypto.randomUUID();
    const accountingCurrencyProfile = ensureAccountingCurrencyProfile(resolvedCompanyId);
    const accountingPeriod = resolveAccountingPeriod(resolvedCompanyId, resolvedTransferDate);
    const resolvedSourceCode = normalizeCode(sourceCode, "year_end_transfer_source_code_required");
    const resolvedEvidenceRefs = normalizeReferenceList(evidenceRefs);
    let normalizedLines;
    let resolvedDescription;
    let resolvedResultAccountNumber = null;
    let resolvedRetainedEarningsAccountNumber = null;
    let capturedBalances = [];
    let sourceBalanceAmount = null;
    let resultTransferBatchId = null;

    if (resolvedTransferKind === "RESULT_TRANSFER") {
      const resultAccount = requireYearEndTransferEquityAccount({
        companyId: resolvedCompanyId,
        accountNumber: resultAccountNumber,
        errorCode: "year_end_transfer_result_account_required"
      });
      const prepared = buildResultTransferLineInputs({
        companyId: resolvedCompanyId,
        fiscalYear,
        resultAccountNumber: resultAccount.accountNumber,
        sourceId: yearEndTransferBatchId
      });
      normalizedLines = prepared.lines;
      capturedBalances = prepared.capturedBalances;
      resolvedResultAccountNumber = resultAccount.accountNumber;
      resolvedDescription =
        normalizeOptionalText(description) || `Year-end result transfer ${fiscalYear.endDate}`;
    } else {
      const resultTransferBatch = requireActiveYearEndTransferBatch({
        companyId: resolvedCompanyId,
        fiscalYearId: fiscalYear.fiscalYearId,
        transferKind: "RESULT_TRANSFER"
      });
      const sourceAccount = requireYearEndTransferEquityAccount({
        companyId: resolvedCompanyId,
        accountNumber: resultAccountNumber,
        errorCode: "retained_earnings_source_account_required"
      });
      const destinationAccount = requireYearEndTransferEquityAccount({
        companyId: resolvedCompanyId,
        accountNumber: retainedEarningsAccountNumber,
        errorCode: "retained_earnings_destination_account_required"
      });
      if (sourceAccount.accountNumber === destinationAccount.accountNumber) {
        throw httpError(
          409,
          "retained_earnings_account_conflict",
          "Retained earnings transfer requires different source and destination equity accounts."
        );
      }
      const prepared = buildRetainedEarningsTransferLineInputs({
        companyId: resolvedCompanyId,
        transferDate: resolvedTransferDate,
        sourceAccountNumber: sourceAccount.accountNumber,
        destinationAccountNumber: destinationAccount.accountNumber,
        sourceId: yearEndTransferBatchId
      });
      normalizedLines = prepared.lines;
      sourceBalanceAmount = prepared.sourceBalanceAmount;
      resolvedResultAccountNumber = sourceAccount.accountNumber;
      resolvedRetainedEarningsAccountNumber = destinationAccount.accountNumber;
      resultTransferBatchId = resultTransferBatch.yearEndTransferBatchId;
      resolvedDescription =
        normalizeOptionalText(description) || `Retained earnings transfer ${resolvedTransferDate}`;
    }

    const totals = calculateInputLineTotals(normalizedLines);
    const posted = applyPostingIntent({
      companyId: resolvedCompanyId,
      journalDate: resolvedTransferDate,
      recipeCode: "YEAR_END_ADJUSTMENT",
      sourceType: "YEAR_END_TRANSFER",
      sourceId: yearEndTransferBatchId,
      sourceObjectVersion: "1",
      description: resolvedDescription,
      actorId: resolvedActorId,
      idempotencyKey: `${resolvedIdempotencyKey}:journal`,
      lines: normalizedLines,
      currencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      metadataJson: {
        yearEndTransferBatchId,
        yearEndTransferKind: resolvedTransferKind,
        yearEndTransferSourceCode: resolvedSourceCode,
        yearEndTransferExternalReference: normalizeOptionalText(externalReference),
        yearEndTransferEvidenceRefs: resolvedEvidenceRefs,
        fiscalYearId: fiscalYear.fiscalYearId,
        fiscalYearStartDate: fiscalYear.startDate,
        fiscalYearEndDate: fiscalYear.endDate,
        resultAccountNumber: resolvedResultAccountNumber,
        retainedEarningsAccountNumber: resolvedRetainedEarningsAccountNumber,
        sourceBalanceAmount,
        resultTransferBatchId,
        capturedBalances
      },
      correlationId
    });

    const batch = Object.freeze({
      yearEndTransferBatchId,
      companyId: resolvedCompanyId,
      fiscalYearId: fiscalYear.fiscalYearId,
      fiscalYearStartDate: fiscalYear.startDate,
      fiscalYearEndDate: fiscalYear.endDate,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      transferKind: resolvedTransferKind,
      transferDate: resolvedTransferDate,
      status: "posted",
      sourceCode: resolvedSourceCode,
      externalReference: normalizeOptionalText(externalReference),
      accountingCurrencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      resultAccountNumber: resolvedResultAccountNumber,
      retainedEarningsAccountNumber: resolvedRetainedEarningsAccountNumber,
      lineCount: normalizedLines.length,
      totals,
      journalEntryId: posted.journalEntry.journalEntryId,
      reversalJournalEntryId: null,
      evidenceRefs: resolvedEvidenceRefs,
      capturedBalances: Object.freeze(capturedBalances.map(copy)),
      sourceBalanceAmount,
      resultTransferBatchId,
      lines: Object.freeze(normalizedLines.map(copy)),
      createdByActorId: resolvedActorId,
      createdAt: nowIso(),
      reversedAt: null,
      reversedByActorId: null
    });

    state.yearEndTransferBatches.set(batch.yearEndTransferBatchId, batch);
    appendToIndex(state.yearEndTransferBatchIdsByCompany, resolvedCompanyId, batch.yearEndTransferBatchId);
    state.yearEndTransferBatchIdsByCompanyKey.set(dedupeKey, batch.yearEndTransferBatchId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.year_end_transfer.posted",
      entityType: "year_end_transfer_batch",
      entityId: batch.yearEndTransferBatchId,
      explanation: `Posted ${resolvedTransferKind.toLowerCase()} batch for fiscal year ${fiscalYear.endDate}.`
    });

    return copy(batch);
  }

  function listYearEndTransferBatches({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.yearEndTransferBatchIdsByCompany.get(resolvedCompanyId) || [])
      .map((batchId) => state.yearEndTransferBatches.get(batchId))
      .filter(Boolean)
      .sort((left, right) => left.transferDate.localeCompare(right.transferDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getYearEndTransferBatch({ companyId, yearEndTransferBatchId } = {}) {
    return copy(requireYearEndTransferBatch(requireText(companyId, "company_id_required"), yearEndTransferBatchId));
  }

  function reverseYearEndTransferBatch({
    companyId,
    yearEndTransferBatchId,
    reasonCode,
    reversedOn = null,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const batch = requireYearEndTransferBatch(resolvedCompanyId, yearEndTransferBatchId);
    if (batch.status === "reversed") {
      return copy(batch);
    }

    const reversed = reverseJournalEntry({
      companyId: resolvedCompanyId,
      journalEntryId: batch.journalEntryId,
      actorId: requireText(actorId, "actor_id_required"),
      approvedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
      approvedByRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required"),
      reasonCode: requireText(reasonCode, "reason_code_required"),
      correctionKey: `year_end_transfer:${batch.yearEndTransferBatchId}`,
      journalDate: reversedOn ? normalizeDate(reversedOn, "year_end_transfer_reversed_on_invalid") : null,
      correlationId
    });

    const reversedBatch = Object.freeze({
      ...batch,
      status: "reversed",
      reversalJournalEntryId: reversed.reversalJournalEntry.journalEntryId,
      reversedAt: nowIso(),
      reversedByActorId: requireText(actorId, "actor_id_required")
    });
    state.yearEndTransferBatches.set(reversedBatch.yearEndTransferBatchId, reversedBatch);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.year_end_transfer.reversed",
      entityType: "year_end_transfer_batch",
      entityId: reversedBatch.yearEndTransferBatchId,
      explanation: `Reversed year-end transfer batch ${reversedBatch.yearEndTransferBatchId}.`
    });

    return copy(reversedBatch);
  }

  function createVatClearingRun({
    companyId,
    vatDeclarationRunId,
    clearingDate = null,
    sourceCode,
    targetAccountNumber = DEFAULT_VAT_CLEARING_TARGET_ACCOUNT_NUMBER,
    externalReference = null,
    description = null,
    evidenceRefs = [],
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedVatDeclarationRunId = requireText(vatDeclarationRunId, "vat_declaration_run_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const dedupeKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingRunId = state.vatClearingRunIdsByCompanyKey.get(dedupeKey);
    if (existingRunId) {
      return copy(requireVatClearingRun(resolvedCompanyId, existingRunId));
    }

    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const vatDeclarationRun = requireVatDeclarationRunForClearing({
      companyId: resolvedCompanyId,
      vatDeclarationRunId: resolvedVatDeclarationRunId
    });
    assertVatClearingUniqueness({
      companyId: resolvedCompanyId,
      vatDeclarationRunId: resolvedVatDeclarationRunId
    });

    const resolvedClearingDate = normalizeDate(
      clearingDate || vatDeclarationRun.toDate,
      "vat_clearing_date_invalid"
    );
    if (resolvedClearingDate !== vatDeclarationRun.toDate) {
      throw httpError(
        409,
        "vat_clearing_must_match_declaration_end",
        "VAT clearing must be posted on the VAT declaration end date."
      );
    }

    const vatClearingRunId = crypto.randomUUID();
    const accountingCurrencyProfile = ensureAccountingCurrencyProfile(resolvedCompanyId);
    const accountingPeriod = resolveAccountingPeriod(resolvedCompanyId, resolvedClearingDate);
    const resolvedSourceCode = normalizeCode(sourceCode, "vat_clearing_source_code_required");
    const resolvedEvidenceRefs = normalizeReferenceList(evidenceRefs);
    const resolvedTargetAccount = requireVatClearingTargetAccount({
      companyId: resolvedCompanyId,
      accountNumber: targetAccountNumber
    });
    const prepared = buildVatClearingLineInputs({
      companyId: resolvedCompanyId,
      fromDate: vatDeclarationRun.fromDate,
      toDate: vatDeclarationRun.toDate,
      targetAccountNumber: resolvedTargetAccount.accountNumber,
      sourceId: vatClearingRunId
    });
    const resolvedDescription =
      normalizeOptionalText(description) || `VAT clearing ${vatDeclarationRun.fromDate}..${vatDeclarationRun.toDate}`;
    const totals = calculateInputLineTotals(prepared.lines);
    const posted = applyPostingIntent({
      companyId: resolvedCompanyId,
      journalDate: resolvedClearingDate,
      recipeCode: "VAT_CLEARING",
      sourceType: "VAT_CLEARING",
      sourceId: vatClearingRunId,
      sourceObjectVersion: "1",
      description: resolvedDescription,
      actorId: resolvedActorId,
      idempotencyKey: `${resolvedIdempotencyKey}:journal`,
      lines: prepared.lines,
      currencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      metadataJson: {
        vatClearingRunId,
        vatDeclarationRunId: vatDeclarationRun.vatDeclarationRunId,
        vatDeclarationPeriodLockId: vatDeclarationRun.periodLockId || null,
        vatClearingSourceCode: resolvedSourceCode,
        vatClearingExternalReference: normalizeOptionalText(externalReference),
        vatClearingEvidenceRefs: resolvedEvidenceRefs,
        fromDate: vatDeclarationRun.fromDate,
        toDate: vatDeclarationRun.toDate,
        targetAccountNumber: resolvedTargetAccount.accountNumber,
        declarationBoxSummary: copy(vatDeclarationRun.declarationBoxSummary || []),
        decisionSnapshotRefs: copy(vatDeclarationRun.decisionSnapshotRefs || []),
        providerBaselineRefs: copy(vatDeclarationRun.providerBaselineRefs || []),
        rulepackRefs: copy(vatDeclarationRun.rulepackRefs || []),
        capturedBalances: prepared.capturedBalances,
        sourceNetBalanceAmount: prepared.sourceNetBalanceAmount
      },
      correlationId
    });

    const run = Object.freeze({
      vatClearingRunId,
      companyId: resolvedCompanyId,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      vatDeclarationRunId: vatDeclarationRun.vatDeclarationRunId,
      fromDate: vatDeclarationRun.fromDate,
      toDate: vatDeclarationRun.toDate,
      clearingDate: resolvedClearingDate,
      status: "posted",
      sourceCode: resolvedSourceCode,
      externalReference: normalizeOptionalText(externalReference),
      accountingCurrencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      targetAccountNumber: resolvedTargetAccount.accountNumber,
      lineCount: prepared.lines.length,
      totals,
      journalEntryId: posted.journalEntry.journalEntryId,
      reversalJournalEntryId: null,
      evidenceRefs: resolvedEvidenceRefs,
      declarationBoxSummary: Object.freeze(copy(vatDeclarationRun.declarationBoxSummary || [])),
      decisionSnapshotRefs: Object.freeze(copy(vatDeclarationRun.decisionSnapshotRefs || [])),
      providerBaselineRefs: Object.freeze(copy(vatDeclarationRun.providerBaselineRefs || [])),
      rulepackRefs: Object.freeze(copy(vatDeclarationRun.rulepackRefs || [])),
      capturedBalances: Object.freeze(prepared.capturedBalances.map(copy)),
      sourceNetBalanceAmount: prepared.sourceNetBalanceAmount,
      lines: Object.freeze(prepared.lines.map(copy)),
      createdByActorId: resolvedActorId,
      createdAt: nowIso(),
      reversedAt: null,
      reversedByActorId: null
    });

    state.vatClearingRuns.set(run.vatClearingRunId, run);
    appendToIndex(state.vatClearingRunIdsByCompany, resolvedCompanyId, run.vatClearingRunId);
    state.vatClearingRunIdsByCompanyKey.set(dedupeKey, run.vatClearingRunId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.vat_clearing.completed",
      entityType: "vat_clearing_run",
      entityId: run.vatClearingRunId,
      explanation: `Posted VAT clearing run ${vatDeclarationRun.fromDate}..${vatDeclarationRun.toDate}.`
    });

    return copy(run);
  }

  function listVatClearingRuns({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.vatClearingRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.vatClearingRuns.get(runId))
      .filter(Boolean)
      .sort((left, right) => left.toDate.localeCompare(right.toDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getVatClearingRun({ companyId, vatClearingRunId } = {}) {
    return copy(requireVatClearingRun(requireText(companyId, "company_id_required"), vatClearingRunId));
  }

  function reverseVatClearingRun({
    companyId,
    vatClearingRunId,
    reasonCode,
    reversedOn = null,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const run = requireVatClearingRun(resolvedCompanyId, vatClearingRunId);
    if (run.status === "reversed") {
      return copy(run);
    }

    const reversed = reverseJournalEntry({
      companyId: resolvedCompanyId,
      journalEntryId: run.journalEntryId,
      actorId: requireText(actorId, "actor_id_required"),
      approvedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
      approvedByRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required"),
      reasonCode: requireText(reasonCode, "reason_code_required"),
      correctionKey: `vat_clearing:${run.vatClearingRunId}`,
      journalDate: reversedOn ? normalizeDate(reversedOn, "vat_clearing_reversed_on_invalid") : null,
      correlationId
    });

    const reversedRun = Object.freeze({
      ...run,
      status: "reversed",
      reversalJournalEntryId: reversed.reversalJournalEntry.journalEntryId,
      reversedAt: nowIso(),
      reversedByActorId: requireText(actorId, "actor_id_required")
    });
    state.vatClearingRuns.set(reversedRun.vatClearingRunId, reversedRun);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.vat_clearing.reversed",
      entityType: "vat_clearing_run",
      entityId: reversedRun.vatClearingRunId,
      explanation: `Reversed VAT clearing run ${reversedRun.vatClearingRunId}.`
    });

    return copy(reversedRun);
  }

  function registerAssetCard({
    companyId,
    assetCode,
    assetName,
    acquisitionDate,
    inServiceDate = null,
    costAmount,
    residualValueAmount = 0,
    usefulLifeMonths,
    assetAccountNumber,
    accumulatedDepreciationAccountNumber,
    depreciationExpenseAccountNumber,
    depreciationMethodCode = "STRAIGHT_LINE_MONTHLY",
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const dedupeKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingAssetCardId = state.assetCardIdsByCompanyKey.get(dedupeKey);
    if (existingAssetCardId) {
      return copy(requireAssetCard(resolvedCompanyId, existingAssetCardId));
    }

    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const resolvedAssetCode = normalizeCode(assetCode, "asset_code_required");
    assertAssetCodeUnique({ companyId: resolvedCompanyId, assetCode: resolvedAssetCode });
    const resolvedAcquisitionDate = normalizeDate(acquisitionDate, "asset_acquisition_date_invalid");
    const resolvedInServiceDate = normalizeDate(inServiceDate || acquisitionDate, "asset_in_service_date_invalid");
    if (resolvedInServiceDate < resolvedAcquisitionDate) {
      throw httpError(409, "asset_in_service_before_acquisition", "Asset in-service date cannot be earlier than acquisition date.");
    }
    const resolvedMethodCode = assertDepreciationMethodCode(depreciationMethodCode);
    const resolvedUsefulLifeMonths = normalizePositiveInteger(usefulLifeMonths, "asset_useful_life_months_invalid");
    const resolvedCostAmount = normalizeSignedMoney(costAmount);
    const resolvedResidualValueAmount = normalizeSignedMoney(residualValueAmount || 0);
    if (!(resolvedCostAmount > 0)) {
      throw httpError(400, "asset_cost_amount_invalid", "Asset cost amount must be greater than zero.");
    }
    if (resolvedResidualValueAmount < 0 || resolvedResidualValueAmount >= resolvedCostAmount) {
      throw httpError(409, "asset_residual_value_invalid", "Asset residual value must be zero or less than the cost amount.");
    }

    const assetAccount = requireAssetBalanceSheetAccount({
      companyId: resolvedCompanyId,
      accountNumber: assetAccountNumber,
      errorCode: "asset_account_required"
    });
    const accumulatedDepreciationAccount = requireAssetBalanceSheetAccount({
      companyId: resolvedCompanyId,
      accountNumber: accumulatedDepreciationAccountNumber,
      errorCode: "asset_accumulated_depreciation_account_required"
    });
    const depreciationExpenseAccount = requireDepreciationExpenseAccount({
      companyId: resolvedCompanyId,
      accountNumber: depreciationExpenseAccountNumber
    });
    if (assetAccount.accountNumber === accumulatedDepreciationAccount.accountNumber) {
      throw httpError(
        409,
        "asset_accumulated_depreciation_account_conflict",
        "Asset account and accumulated depreciation account must be different."
      );
    }
    if (
      assetAccount.accountNumber === depreciationExpenseAccount.accountNumber
      || accumulatedDepreciationAccount.accountNumber === depreciationExpenseAccount.accountNumber
    ) {
      throw httpError(
        409,
        "asset_depreciation_account_conflict",
        "Depreciation expense account must be different from balance-sheet asset accounts."
      );
    }
    const depreciableBaseAmount = normalizeSignedMoney(resolvedCostAmount - resolvedResidualValueAmount);
    const monthlyDepreciationAmount = normalizeSignedMoney(depreciableBaseAmount / resolvedUsefulLifeMonths);
    const assetCardId = crypto.randomUUID();
    const assetCard = Object.freeze({
      assetCardId,
      companyId: resolvedCompanyId,
      assetCode: resolvedAssetCode,
      assetName: normalizeLedgerLabel(assetName, "asset_name_required"),
      acquisitionDate: resolvedAcquisitionDate,
      inServiceDate: resolvedInServiceDate,
      costAmount: resolvedCostAmount,
      residualValueAmount: resolvedResidualValueAmount,
      depreciableBaseAmount,
      bookedDepreciationAmount: 0,
      remainingDepreciableAmount: depreciableBaseAmount,
      usefulLifeMonths: resolvedUsefulLifeMonths,
      bookedInstallmentCount: 0,
      depreciationMethodCode: resolvedMethodCode,
      monthlyDepreciationAmount,
      assetAccountNumber: assetAccount.accountNumber,
      accumulatedDepreciationAccountNumber: accumulatedDepreciationAccount.accountNumber,
      depreciationExpenseAccountNumber: depreciationExpenseAccount.accountNumber,
      nextDepreciationDate: endOfMonth(resolvedInServiceDate),
      lastDepreciationBatchId: null,
      status: "active",
      createdByActorId: resolvedActorId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      disposedAt: null,
      disposedByActorId: null
    });

    state.assetCards.set(assetCard.assetCardId, assetCard);
    appendToIndex(state.assetCardIdsByCompany, resolvedCompanyId, assetCard.assetCardId);
    state.assetCardIdsByCompanyKey.set(dedupeKey, assetCard.assetCardId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.asset_card.registered",
      entityType: "asset_card",
      entityId: assetCard.assetCardId,
      explanation: `Registered asset card ${assetCard.assetCode}.`
    });

    return copy(assetCard);
  }

  function listAssetCards({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.assetCardIdsByCompany.get(resolvedCompanyId) || [])
      .map((assetCardId) => state.assetCards.get(assetCardId))
      .filter(Boolean)
      .sort((left, right) => left.assetCode.localeCompare(right.assetCode))
      .map(copy);
  }

  function getAssetCard({ companyId, assetCardId } = {}) {
    return copy(requireAssetCard(requireText(companyId, "company_id_required"), assetCardId));
  }

  function runDepreciationBatch({
    companyId,
    throughDate,
    description = null,
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const dedupeKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingBatchId = state.depreciationBatchIdsByCompanyKey.get(dedupeKey);
    if (existingBatchId) {
      return copy(requireDepreciationBatch(resolvedCompanyId, existingBatchId));
    }

    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const resolvedThroughDate = normalizeDate(throughDate, "depreciation_through_date_invalid");
    if (resolvedThroughDate !== endOfMonth(resolvedThroughDate)) {
      throw httpError(
        409,
        "depreciation_through_date_must_be_month_end",
        "Depreciation batches must run through a month-end date."
      );
    }
    const accountingCurrencyProfile = ensureAccountingCurrencyProfile(resolvedCompanyId);
    const accountingPeriod = resolveAccountingPeriod(resolvedCompanyId, resolvedThroughDate);
    const depreciationBatchId = crypto.randomUUID();
    const items = [];
    const lines = [];

    for (const assetCard of listAssetCards({ companyId: resolvedCompanyId })) {
      if (assetCard.status !== "active") {
        continue;
      }
      let scheduledDate = assetCard.nextDepreciationDate;
      let bookedAmount = assetCard.bookedDepreciationAmount;
      let bookedInstallmentCount = assetCard.bookedInstallmentCount;
      let assetBatchAmount = 0;
      let installmentCount = 0;
      let firstScheduledDate = null;
      let lastScheduledDate = null;
      while (
        scheduledDate
        && scheduledDate <= resolvedThroughDate
        && bookedAmount < assetCard.depreciableBaseAmount
        && bookedInstallmentCount < assetCard.usefulLifeMonths
      ) {
        const remainingAmount = normalizeSignedMoney(assetCard.depreciableBaseAmount - bookedAmount);
        const installmentAmount = bookedInstallmentCount >= assetCard.usefulLifeMonths - 1
          ? remainingAmount
          : Math.min(assetCard.monthlyDepreciationAmount, remainingAmount);
        if (!(installmentAmount > 0)) {
          break;
        }
        assetBatchAmount = normalizeSignedMoney(assetBatchAmount + installmentAmount);
        bookedAmount = normalizeSignedMoney(bookedAmount + installmentAmount);
        bookedInstallmentCount += 1;
        installmentCount += 1;
        firstScheduledDate = firstScheduledDate || scheduledDate;
        lastScheduledDate = scheduledDate;
        scheduledDate = advanceMonthlyScheduleDate(scheduledDate);
      }
      if (!(assetBatchAmount > 0)) {
        continue;
      }
      items.push({
        assetCardId: assetCard.assetCardId,
        assetCode: assetCard.assetCode,
        firstScheduledDate,
        lastScheduledDate,
        installmentCount,
        depreciationAmount: assetBatchAmount,
        priorBookedDepreciationAmount: assetCard.bookedDepreciationAmount,
        priorBookedInstallmentCount: assetCard.bookedInstallmentCount,
        priorNextDepreciationDate: assetCard.nextDepreciationDate,
        priorStatus: assetCard.status,
        priorLastDepreciationBatchId: assetCard.lastDepreciationBatchId
      });
      lines.push(
        {
          accountNumber: assetCard.depreciationExpenseAccountNumber,
          debitAmount: assetBatchAmount,
          sourceId: depreciationBatchId
        },
        {
          accountNumber: assetCard.accumulatedDepreciationAccountNumber,
          creditAmount: assetBatchAmount,
          sourceId: depreciationBatchId
        }
      );
    }

    if (items.length === 0) {
      throw httpError(409, "depreciation_batch_no_due_assets", "No active assets require depreciation for the supplied date.");
    }

    const normalizedLines = normalizeDepreciationLineInputs({
      companyId: resolvedCompanyId,
      lines,
      sourceId: depreciationBatchId
    });
    const totals = calculateInputLineTotals(normalizedLines);
    const posted = applyPostingIntent({
      companyId: resolvedCompanyId,
      journalDate: resolvedThroughDate,
      recipeCode: "ASSET_DEPRECIATION",
      sourceType: "ASSET_DEPRECIATION",
      sourceId: depreciationBatchId,
      sourceObjectVersion: "1",
      description: normalizeOptionalText(description) || `Depreciation batch ${resolvedThroughDate}`,
      actorId: resolvedActorId,
      idempotencyKey: `${resolvedIdempotencyKey}:journal`,
      lines: normalizedLines,
      currencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      metadataJson: {
        depreciationBatchId,
        throughDate: resolvedThroughDate,
        items: copy(items)
      },
      correlationId
    });

    for (const item of items) {
      const existingAssetCard = requireAssetCard(resolvedCompanyId, item.assetCardId);
      const bookedDepreciationAmount = normalizeSignedMoney(existingAssetCard.bookedDepreciationAmount + item.depreciationAmount);
      const remainingDepreciableAmount = normalizeSignedMoney(existingAssetCard.depreciableBaseAmount - bookedDepreciationAmount);
      const bookedInstallmentCount = existingAssetCard.bookedInstallmentCount + item.installmentCount;
      const nextDepreciationDate =
        remainingDepreciableAmount > 0 && bookedInstallmentCount < existingAssetCard.usefulLifeMonths
          ? advanceMonthlyScheduleDate(item.lastScheduledDate)
          : null;
      state.assetCards.set(
        existingAssetCard.assetCardId,
        Object.freeze({
          ...existingAssetCard,
          bookedDepreciationAmount,
          remainingDepreciableAmount,
          bookedInstallmentCount,
          nextDepreciationDate,
          lastDepreciationBatchId: depreciationBatchId,
          status: remainingDepreciableAmount > 0 ? "active" : "fully_depreciated",
          updatedAt: nowIso()
        })
      );
    }

    const batch = Object.freeze({
      depreciationBatchId,
      companyId: resolvedCompanyId,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      throughDate: resolvedThroughDate,
      status: "posted",
      accountingCurrencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      lineCount: normalizedLines.length,
      assetCount: items.length,
      totals,
      journalEntryId: posted.journalEntry.journalEntryId,
      reversalJournalEntryId: null,
      items: Object.freeze(items.map((item) => Object.freeze(copy(item)))),
      createdByActorId: resolvedActorId,
      createdAt: nowIso(),
      reversedAt: null,
      reversedByActorId: null
    });

    state.depreciationBatches.set(batch.depreciationBatchId, batch);
    appendToIndex(state.depreciationBatchIdsByCompany, resolvedCompanyId, batch.depreciationBatchId);
    state.depreciationBatchIdsByCompanyKey.set(dedupeKey, batch.depreciationBatchId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.asset.depreciation.booked",
      entityType: "depreciation_batch",
      entityId: batch.depreciationBatchId,
      explanation: `Posted depreciation batch through ${resolvedThroughDate}.`
    });

    return copy(batch);
  }

  function listDepreciationBatches({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.depreciationBatchIdsByCompany.get(resolvedCompanyId) || [])
      .map((batchId) => state.depreciationBatches.get(batchId))
      .filter(Boolean)
      .sort((left, right) => left.throughDate.localeCompare(right.throughDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getDepreciationBatch({ companyId, depreciationBatchId } = {}) {
    return copy(requireDepreciationBatch(requireText(companyId, "company_id_required"), depreciationBatchId));
  }

  function reverseDepreciationBatch({
    companyId,
    depreciationBatchId,
    reasonCode,
    reversedOn = null,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const batch = requireDepreciationBatch(resolvedCompanyId, depreciationBatchId);
    if (batch.status === "reversed") {
      return copy(batch);
    }
    for (const item of batch.items) {
      const assetCard = requireAssetCard(resolvedCompanyId, item.assetCardId);
      if (assetCard.lastDepreciationBatchId !== batch.depreciationBatchId) {
        throw httpError(
          409,
          "depreciation_batch_reversal_order_invalid",
          `Depreciation batch ${batch.depreciationBatchId} cannot be reversed after later depreciation postings for asset ${assetCard.assetCode}.`
        );
      }
    }

    const reversed = reverseJournalEntry({
      companyId: resolvedCompanyId,
      journalEntryId: batch.journalEntryId,
      actorId: requireText(actorId, "actor_id_required"),
      approvedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
      approvedByRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required"),
      reasonCode: requireText(reasonCode, "reason_code_required"),
      correctionKey: `asset_depreciation:${batch.depreciationBatchId}`,
      journalDate: reversedOn ? normalizeDate(reversedOn, "depreciation_reversed_on_invalid") : null,
      correlationId
    });

    for (const item of batch.items) {
      const assetCard = requireAssetCard(resolvedCompanyId, item.assetCardId);
      state.assetCards.set(
        assetCard.assetCardId,
        Object.freeze({
          ...assetCard,
          bookedDepreciationAmount: item.priorBookedDepreciationAmount,
          remainingDepreciableAmount: normalizeSignedMoney(assetCard.depreciableBaseAmount - item.priorBookedDepreciationAmount),
          bookedInstallmentCount: item.priorBookedInstallmentCount,
          nextDepreciationDate: item.priorNextDepreciationDate,
          lastDepreciationBatchId: item.priorLastDepreciationBatchId,
          status: item.priorStatus,
          updatedAt: nowIso()
        })
      );
    }

    const reversedBatch = Object.freeze({
      ...batch,
      status: "reversed",
      reversalJournalEntryId: reversed.reversalJournalEntry.journalEntryId,
      reversedAt: nowIso(),
      reversedByActorId: requireText(actorId, "actor_id_required")
    });
    state.depreciationBatches.set(reversedBatch.depreciationBatchId, reversedBatch);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.asset.depreciation.reversed",
      entityType: "depreciation_batch",
      entityId: reversedBatch.depreciationBatchId,
      explanation: `Reversed depreciation batch ${reversedBatch.depreciationBatchId}.`
    });

    return copy(reversedBatch);
  }

  function registerAccrualSchedule({
    companyId,
    scheduleCode,
    scheduleName,
    sourceReference = null,
    scheduleKind,
    startDate,
    endDate,
    totalAmount,
    patternCode = "STRAIGHT_LINE_MONTHLY",
    profitAndLossAccountNumber,
    balanceSheetAccountNumber,
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const dedupeKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingScheduleId = state.accrualScheduleIdsByCompanyKey.get(dedupeKey);
    if (existingScheduleId) {
      return copy(requireAccrualSchedule(resolvedCompanyId, existingScheduleId));
    }

    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const resolvedScheduleCode = normalizeCode(scheduleCode, "accrual_schedule_code_required");
    assertAccrualScheduleCodeUnique({ companyId: resolvedCompanyId, scheduleCode: resolvedScheduleCode });
    const resolvedScheduleKind = assertAccrualScheduleKind(scheduleKind);
    const resolvedPatternCode = assertAccrualPatternCode(patternCode);
    const resolvedStartDate = normalizeDate(startDate, "accrual_start_date_invalid");
    const resolvedEndDate = normalizeDate(endDate, "accrual_end_date_invalid");
    if (resolvedEndDate < resolvedStartDate) {
      throw httpError(409, "accrual_end_before_start", "Accrual end date cannot be earlier than start date.");
    }
    const resolvedTotalAmount = normalizeSignedMoney(totalAmount);
    if (!(resolvedTotalAmount > 0)) {
      throw httpError(400, "accrual_total_amount_invalid", "Accrual total amount must be greater than zero.");
    }

    const profitAndLossAccount = requireAccrualProfitLossAccount({
      companyId: resolvedCompanyId,
      accountNumber: profitAndLossAccountNumber,
      scheduleKind: resolvedScheduleKind
    });
    const balanceSheetAccount = requireAccrualBalanceSheetAccount({
      companyId: resolvedCompanyId,
      accountNumber: balanceSheetAccountNumber,
      scheduleKind: resolvedScheduleKind
    });
    if (profitAndLossAccount.accountNumber === balanceSheetAccount.accountNumber) {
      throw httpError(409, "accrual_account_conflict", "Profit-and-loss and balance-sheet accounts must be different.");
    }

    let totalPeriods = 0;
    let recognitionDate = endOfMonth(resolvedStartDate);
    const lastRecognitionDate = endOfMonth(resolvedEndDate);
    while (recognitionDate <= lastRecognitionDate) {
      totalPeriods += 1;
      recognitionDate = advanceMonthlyScheduleDate(recognitionDate);
    }
    if (totalPeriods < 1) {
      throw httpError(409, "accrual_schedule_has_no_periods", "Accrual schedule must cover at least one month-end.");
    }

    const monthlyRecognitionAmount = normalizeSignedMoney(resolvedTotalAmount / totalPeriods);
    const accrualScheduleId = crypto.randomUUID();
    const accrualSchedule = Object.freeze({
      accrualScheduleId,
      companyId: resolvedCompanyId,
      scheduleCode: resolvedScheduleCode,
      scheduleName: normalizeLedgerLabel(scheduleName, "accrual_schedule_name_required"),
      sourceReference: normalizeOptionalText(sourceReference),
      scheduleKind: resolvedScheduleKind,
      patternCode: resolvedPatternCode,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      totalAmount: resolvedTotalAmount,
      recognizedAmount: 0,
      remainingAmount: resolvedTotalAmount,
      totalPeriods,
      recognizedInstallmentCount: 0,
      monthlyRecognitionAmount,
      profitAndLossAccountNumber: profitAndLossAccount.accountNumber,
      balanceSheetAccountNumber: balanceSheetAccount.accountNumber,
      nextRecognitionDate: endOfMonth(resolvedStartDate),
      lastAccrualBatchId: null,
      status: "active",
      createdByActorId: resolvedActorId,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });

    state.accrualSchedules.set(accrualSchedule.accrualScheduleId, accrualSchedule);
    appendToIndex(state.accrualScheduleIdsByCompany, resolvedCompanyId, accrualSchedule.accrualScheduleId);
    state.accrualScheduleIdsByCompanyKey.set(dedupeKey, accrualSchedule.accrualScheduleId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.accrual_schedule.registered",
      entityType: "accrual_schedule",
      entityId: accrualSchedule.accrualScheduleId,
      explanation: `Registered accrual schedule ${accrualSchedule.scheduleCode}.`
    });

    return copy(accrualSchedule);
  }

  function listAccrualSchedules({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.accrualScheduleIdsByCompany.get(resolvedCompanyId) || [])
      .map((scheduleId) => state.accrualSchedules.get(scheduleId))
      .filter(Boolean)
      .sort((left, right) => left.scheduleCode.localeCompare(right.scheduleCode))
      .map(copy);
  }

  function getAccrualSchedule({ companyId, accrualScheduleId } = {}) {
    return copy(requireAccrualSchedule(requireText(companyId, "company_id_required"), accrualScheduleId));
  }

  function runAccrualBatch({
    companyId,
    throughDate,
    description = null,
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const dedupeKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingBatchId = state.accrualBatchIdsByCompanyKey.get(dedupeKey);
    if (existingBatchId) {
      return copy(requireAccrualBatch(resolvedCompanyId, existingBatchId));
    }

    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const resolvedThroughDate = normalizeDate(throughDate, "accrual_through_date_invalid");
    if (resolvedThroughDate !== endOfMonth(resolvedThroughDate)) {
      throw httpError(
        409,
        "accrual_through_date_must_be_month_end",
        "Accrual batches must run through a month-end date."
      );
    }
    const accountingCurrencyProfile = ensureAccountingCurrencyProfile(resolvedCompanyId);
    const accountingPeriod = resolveAccountingPeriod(resolvedCompanyId, resolvedThroughDate);
    const accrualBatchId = crypto.randomUUID();
    const items = [];
    const lines = [];

    for (const accrualSchedule of listAccrualSchedules({ companyId: resolvedCompanyId })) {
      if (accrualSchedule.status !== "active") {
        continue;
      }
      let scheduledDate = accrualSchedule.nextRecognitionDate;
      let recognizedAmount = accrualSchedule.recognizedAmount;
      let recognizedInstallmentCount = accrualSchedule.recognizedInstallmentCount;
      let scheduleBatchAmount = 0;
      let installmentCount = 0;
      let firstScheduledDate = null;
      let lastScheduledDate = null;
      while (
        scheduledDate
        && scheduledDate <= resolvedThroughDate
        && recognizedAmount < accrualSchedule.totalAmount
        && recognizedInstallmentCount < accrualSchedule.totalPeriods
      ) {
        const remainingAmount = normalizeSignedMoney(accrualSchedule.totalAmount - recognizedAmount);
        const installmentAmount = recognizedInstallmentCount >= accrualSchedule.totalPeriods - 1
          ? remainingAmount
          : Math.min(accrualSchedule.monthlyRecognitionAmount, remainingAmount);
        if (!(installmentAmount > 0)) {
          break;
        }
        scheduleBatchAmount = normalizeSignedMoney(scheduleBatchAmount + installmentAmount);
        recognizedAmount = normalizeSignedMoney(recognizedAmount + installmentAmount);
        recognizedInstallmentCount += 1;
        installmentCount += 1;
        firstScheduledDate = firstScheduledDate || scheduledDate;
        lastScheduledDate = scheduledDate;
        scheduledDate = advanceMonthlyScheduleDate(scheduledDate);
      }
      if (!(scheduleBatchAmount > 0)) {
        continue;
      }
      const postingProfile = resolveAccrualPostingProfile(accrualSchedule.scheduleKind);
      items.push({
        accrualScheduleId: accrualSchedule.accrualScheduleId,
        scheduleCode: accrualSchedule.scheduleCode,
        scheduleKind: accrualSchedule.scheduleKind,
        firstScheduledDate,
        lastScheduledDate,
        installmentCount,
        recognitionAmount: scheduleBatchAmount,
        priorRecognizedAmount: accrualSchedule.recognizedAmount,
        priorRecognizedInstallmentCount: accrualSchedule.recognizedInstallmentCount,
        priorNextRecognitionDate: accrualSchedule.nextRecognitionDate,
        priorStatus: accrualSchedule.status,
        priorLastAccrualBatchId: accrualSchedule.lastAccrualBatchId
      });
      lines.push(
        {
          accountNumber: postingProfile.debitAccountRole === "profit_and_loss"
            ? accrualSchedule.profitAndLossAccountNumber
            : accrualSchedule.balanceSheetAccountNumber,
          debitAmount: scheduleBatchAmount,
          sourceId: accrualBatchId
        },
        {
          accountNumber: postingProfile.creditAccountRole === "profit_and_loss"
            ? accrualSchedule.profitAndLossAccountNumber
            : accrualSchedule.balanceSheetAccountNumber,
          creditAmount: scheduleBatchAmount,
          sourceId: accrualBatchId
        }
      );
    }

    if (items.length === 0) {
      throw httpError(409, "accrual_batch_no_due_schedules", "No active accrual schedules require recognition for the supplied date.");
    }

    const normalizedLines = normalizeAccrualLineInputs({
      companyId: resolvedCompanyId,
      lines,
      sourceId: accrualBatchId
    });
    const totals = calculateInputLineTotals(normalizedLines);
    const posted = applyPostingIntent({
      companyId: resolvedCompanyId,
      journalDate: resolvedThroughDate,
      recipeCode: "PERIOD_ACCRUAL",
      sourceType: "PERIOD_ACCRUAL",
      sourceId: accrualBatchId,
      sourceObjectVersion: "1",
      description: normalizeOptionalText(description) || `Accrual batch ${resolvedThroughDate}`,
      actorId: resolvedActorId,
      idempotencyKey: `${resolvedIdempotencyKey}:journal`,
      lines: normalizedLines,
      currencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      metadataJson: {
        accrualBatchId,
        throughDate: resolvedThroughDate,
        items: copy(items)
      },
      correlationId
    });

    for (const item of items) {
      const existingSchedule = requireAccrualSchedule(resolvedCompanyId, item.accrualScheduleId);
      const recognizedAmount = normalizeSignedMoney(existingSchedule.recognizedAmount + item.recognitionAmount);
      const remainingAmount = normalizeSignedMoney(existingSchedule.totalAmount - recognizedAmount);
      const recognizedInstallmentCount = existingSchedule.recognizedInstallmentCount + item.installmentCount;
      const nextRecognitionDate =
        remainingAmount > 0 && recognizedInstallmentCount < existingSchedule.totalPeriods
          ? advanceMonthlyScheduleDate(item.lastScheduledDate)
          : null;
      state.accrualSchedules.set(
        existingSchedule.accrualScheduleId,
        Object.freeze({
          ...existingSchedule,
          recognizedAmount,
          remainingAmount,
          recognizedInstallmentCount,
          nextRecognitionDate,
          lastAccrualBatchId: accrualBatchId,
          status: remainingAmount > 0 ? "active" : "completed",
          updatedAt: nowIso()
        })
      );
    }

    const batch = Object.freeze({
      accrualBatchId,
      companyId: resolvedCompanyId,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      throughDate: resolvedThroughDate,
      status: "posted",
      accountingCurrencyCode: accountingCurrencyProfile.accountingCurrencyCode,
      lineCount: normalizedLines.length,
      scheduleCount: items.length,
      totals,
      journalEntryId: posted.journalEntry.journalEntryId,
      reversalJournalEntryId: null,
      items: Object.freeze(items.map((item) => Object.freeze(copy(item)))),
      createdByActorId: resolvedActorId,
      createdAt: nowIso(),
      reversedAt: null,
      reversedByActorId: null
    });

    state.accrualBatches.set(batch.accrualBatchId, batch);
    appendToIndex(state.accrualBatchIdsByCompany, resolvedCompanyId, batch.accrualBatchId);
    state.accrualBatchIdsByCompanyKey.set(dedupeKey, batch.accrualBatchId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.accrual.booked",
      entityType: "accrual_batch",
      entityId: batch.accrualBatchId,
      explanation: `Posted accrual batch through ${resolvedThroughDate}.`
    });

    return copy(batch);
  }

  function listAccrualBatches({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.accrualBatchIdsByCompany.get(resolvedCompanyId) || [])
      .map((batchId) => state.accrualBatches.get(batchId))
      .filter(Boolean)
      .sort((left, right) => left.throughDate.localeCompare(right.throughDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getAccrualBatch({ companyId, accrualBatchId } = {}) {
    return copy(requireAccrualBatch(requireText(companyId, "company_id_required"), accrualBatchId));
  }

  function reverseAccrualBatch({
    companyId,
    accrualBatchId,
    reasonCode,
    reversedOn = null,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const batch = requireAccrualBatch(resolvedCompanyId, accrualBatchId);
    if (batch.status === "reversed") {
      return copy(batch);
    }
    for (const item of batch.items) {
      const accrualSchedule = requireAccrualSchedule(resolvedCompanyId, item.accrualScheduleId);
      if (accrualSchedule.lastAccrualBatchId !== batch.accrualBatchId) {
        throw httpError(
          409,
          "accrual_batch_reversal_order_invalid",
          `Accrual batch ${batch.accrualBatchId} cannot be reversed after later accrual postings for schedule ${accrualSchedule.scheduleCode}.`
        );
      }
    }

    const reversed = reverseJournalEntry({
      companyId: resolvedCompanyId,
      journalEntryId: batch.journalEntryId,
      actorId: requireText(actorId, "actor_id_required"),
      approvedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
      approvedByRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required"),
      reasonCode: requireText(reasonCode, "reason_code_required"),
      correctionKey: `period_accrual:${batch.accrualBatchId}`,
      journalDate: reversedOn ? normalizeDate(reversedOn, "accrual_reversed_on_invalid") : null,
      correlationId
    });

    for (const item of batch.items) {
      const accrualSchedule = requireAccrualSchedule(resolvedCompanyId, item.accrualScheduleId);
      state.accrualSchedules.set(
        accrualSchedule.accrualScheduleId,
        Object.freeze({
          ...accrualSchedule,
          recognizedAmount: item.priorRecognizedAmount,
          remainingAmount: normalizeSignedMoney(accrualSchedule.totalAmount - item.priorRecognizedAmount),
          recognizedInstallmentCount: item.priorRecognizedInstallmentCount,
          nextRecognitionDate: item.priorNextRecognitionDate,
          lastAccrualBatchId: item.priorLastAccrualBatchId,
          status: item.priorStatus,
          updatedAt: nowIso()
        })
      );
    }

    const reversedBatch = Object.freeze({
      ...batch,
      status: "reversed",
      reversalJournalEntryId: reversed.reversalJournalEntry.journalEntryId,
      reversedAt: nowIso(),
      reversedByActorId: requireText(actorId, "actor_id_required")
    });
    state.accrualBatches.set(reversedBatch.accrualBatchId, reversedBatch);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.accrual.reversed",
      entityType: "accrual_batch",
      entityId: reversedBatch.accrualBatchId,
      explanation: `Reversed accrual batch ${reversedBatch.accrualBatchId}.`
    });

    return copy(reversedBatch);
  }

  function resolveVoucherSeriesForPurpose({
    companyId,
    purposeCode,
    preferredSeriesCode = null,
    includePaused = false
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedPurposeCode = normalizeVoucherSeriesPurposeCode(purposeCode, "voucher_series_purpose_code_required");

    if (preferredSeriesCode) {
      const preferredSeries = requireVoucherSeries(resolvedCompanyId, preferredSeriesCode);
      ensureVoucherSeriesUsable(preferredSeries, includePaused);
      if (!preferredSeries.purposeCodes.includes(resolvedPurposeCode)) {
        throw httpError(
          409,
          "voucher_series_purpose_mismatch",
          `Voucher series ${preferredSeries.seriesCode} is not configured for purpose ${resolvedPurposeCode}.`
        );
      }
      return copy(preferredSeries);
    }

    const candidates = listVoucherSeriesForPurpose({
      state,
      companyId: resolvedCompanyId,
      purposeCode: resolvedPurposeCode,
      includePaused
    });
    if (candidates.length === 0) {
      throw httpError(
        404,
        "voucher_series_purpose_not_configured",
        `No voucher series is configured for purpose ${resolvedPurposeCode}.`
      );
    }
    if (candidates.length > 1) {
      throw httpError(
        409,
        "voucher_series_purpose_ambiguous",
        `Multiple voucher series are active for purpose ${resolvedPurposeCode}.`
      );
    }
    return copy(candidates[0]);
  }

  function resolvePostingVoucherSeriesCode({
    companyId,
    explicitSeriesCode = null,
    purposeCode = null,
    fallbackSeriesCode = null
  } = {}) {
    if (explicitSeriesCode) {
      return normalizeSeriesCode(explicitSeriesCode, "voucher_series_code_required");
    }
    if (purposeCode) {
      try {
        return resolveVoucherSeriesForPurpose({
          companyId,
          purposeCode
        }).seriesCode;
      } catch (error) {
        if (!fallbackSeriesCode) {
          throw error;
        }
      }
    }
    return normalizeSeriesCode(fallbackSeriesCode, "voucher_series_code_required");
  }

  function listPostingRecipes() {
    return POSTING_RECIPE_DEFINITIONS.map(copy);
  }

  function getPostingRecipe({ recipeCode } = {}) {
    return copy(requirePostingRecipe(recipeCode));
  }

  function createPostingIntent({
    companyId,
    journalDate,
    voucherSeriesCode = null,
    voucherSeriesPurposeCode = null,
    fallbackVoucherSeriesCode = null,
    recipeCode,
    postingSignalCode = null,
    sourceType,
    sourceId,
    sourceObjectVersion = null,
    description = null,
    actorId,
    idempotencyKey,
    lines,
    currencyCode = DEFAULT_LEDGER_CURRENCY,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const recipe = requirePostingRecipe(recipeCode);
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const resolvedSourceType = assertPostingSourceType(sourceType);
    const resolvedSourceId = requireText(sourceId, "source_id_required");
    const resolvedSourceObjectVersion = normalizeOptionalText(sourceObjectVersion);
    if (!resolvedSourceObjectVersion) {
      throw httpError(400, "source_object_version_required", "Posting intents must bind an explicit source object version.");
    }
    if (!recipe.allowedSourceTypes.includes(resolvedSourceType)) {
      throw httpError(
        409,
        "posting_recipe_source_type_invalid",
        `Posting recipe ${recipe.recipeCode} does not allow source type ${resolvedSourceType}.`
      );
    }

    const replayKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    if (state.postingIntentIdsByCompanyKey.has(replayKey)) {
      const existingIntent = state.postingIntents.get(state.postingIntentIdsByCompanyKey.get(replayKey));
      if (!existingIntent) {
        throw httpError(409, "posting_intent_not_found", "Posting intent replay key points to a missing intent.");
      }
      if (existingIntent.sourceType !== resolvedSourceType || existingIntent.sourceId !== resolvedSourceId) {
        throw httpError(409, "idempotency_key_conflict", "Idempotency key already belongs to another posting source.");
      }
      return {
        postingIntent: copy(existingIntent),
        idempotentReplay: true
      };
    }

    const resolvedJournalDate = normalizeDate(journalDate, "journal_date_required");
    const resolvedVoucherSeriesCode = resolvePostingVoucherSeriesCode({
      companyId: resolvedCompanyId,
      explicitSeriesCode: voucherSeriesCode,
      purposeCode: voucherSeriesPurposeCode || recipe.defaultVoucherSeriesPurposeCode,
      fallbackSeriesCode: fallbackVoucherSeriesCode || recipe.fallbackVoucherSeriesCode
    });
    const resolvedDescription = resolvePostingIntentDescription({
      recipe,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      description
    });
    const normalizedMetadata = normalizeMetadata(metadataJson, false);
    const now = nowIso();
    const postingIntent = {
      intentId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      recipeCode: recipe.recipeCode,
      recipeVersion: recipe.version,
      voucherSeriesCode: resolvedVoucherSeriesCode,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      sourceObjectVersion: resolvedSourceObjectVersion,
      postingSignalCode: normalizeOptionalText(postingSignalCode) || recipe.defaultSignalCode,
      actorId: resolvedActorId,
      description: resolvedDescription,
      journalDate: resolvedJournalDate,
      metadataJson: {
        ...normalizedMetadata,
        journalType: recipe.journalType,
        postingRecipeCode: recipe.recipeCode,
        postingRecipeVersion: recipe.version,
        postingSignalCode: normalizeOptionalText(postingSignalCode) || recipe.defaultSignalCode,
        sourceDomain: recipe.sourceDomain,
        sourceObjectVersion: resolvedSourceObjectVersion,
        plannedCurrencyCode: normalizeCurrencyCode(currencyCode),
        plannedLineCount: Array.isArray(lines) ? lines.length : 0
      },
      occurredAt: now,
      idempotencyKey: resolvedIdempotencyKey
    };

    state.postingIntents.set(postingIntent.intentId, postingIntent);
    state.postingIntentIdsByCompanyKey.set(replayKey, postingIntent.intentId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.posting_intent.created",
      entityType: "posting_intent",
      entityId: postingIntent.intentId,
      explanation: `Created posting intent ${postingIntent.recipeCode} for ${postingIntent.sourceType} ${postingIntent.sourceId}.`
    });

    return {
      postingIntent: copy(postingIntent),
      idempotentReplay: false
    };
  }

  function applyPostingIntent({
    companyId,
    journalDate,
    voucherSeriesCode = null,
    voucherSeriesPurposeCode = null,
    fallbackVoucherSeriesCode = null,
    recipeCode,
    postingSignalCode = null,
    sourceType,
    sourceId,
    sourceObjectVersion = null,
    description = null,
    actorId,
    approvedByActorId = null,
    approvedByRoleCode = null,
    idempotencyKey,
    lines,
    currencyCode = DEFAULT_LEDGER_CURRENCY,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const intent = createPostingIntent({
      companyId,
      journalDate,
      voucherSeriesCode,
      voucherSeriesPurposeCode,
      fallbackVoucherSeriesCode,
      recipeCode,
      postingSignalCode,
      sourceType,
      sourceId,
      sourceObjectVersion,
      description,
      actorId,
      idempotencyKey,
      lines,
      currencyCode,
      metadataJson,
      correlationId
    });
    const recipe = requirePostingRecipe(recipeCode);
    const created = createJournalEntry({
      companyId,
      journalDate,
      voucherSeriesCode: intent.postingIntent.voucherSeriesCode,
      sourceType: intent.postingIntent.sourceType,
      sourceId,
      description: intent.postingIntent.description,
      actorId,
      idempotencyKey,
      lines,
      currencyCode,
      metadataJson: {
        ...copy(intent.postingIntent.metadataJson || {}),
        postingIntentId: intent.postingIntent.intentId
      },
      correlationId
    });
    const validated = validateJournalEntry({
      companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId,
      correlationId
    });
    const posted = postJournalEntry({
      companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId,
      approvedByActorId,
      approvedByRoleCode,
      correlationId
    });
    return {
      journalEntry: posted.journalEntry,
      postingIntent: intent.postingIntent,
      postingRecipe: copy(recipe),
      idempotentReplay: created.idempotentReplay === true
    };
  }

  function listAccountingPeriods({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    return [...state.accountingPeriods.values()]
      .filter((period) => period.companyId === resolvedCompanyId)
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn))
      .map(copy);
  }

  function ensureAccountingYearPeriod({
    companyId,
    fiscalYear = new Date(clock()).getUTCFullYear(),
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const resolvedFiscalYear = String(fiscalYear);
    if (!/^\d{4}$/.test(resolvedFiscalYear)) {
      throw httpError(400, "fiscal_year_invalid", "Fiscal year must be a four-digit year.");
    }
    const startsOn = `${resolvedFiscalYear}-01-01`;
    const endsOn = `${resolvedFiscalYear}-12-31`;
    const existing = [...state.accountingPeriods.values()].find(
      (period) =>
        period.companyId === resolvedCompanyId
        && period.startsOn === startsOn
        && period.endsOn === endsOn
    );
    if (existing) {
      return copy(existing);
    }

    const accountingPeriod = {
      accountingPeriodId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      startsOn,
      endsOn,
      fiscalYearId: null,
      fiscalPeriodId: null,
      status: "open",
      lockReasonCode: null,
      lockedByActorId: null,
      lockedAt: null,
      lockApprovalMode: null,
      lockApprovalActorIds: [],
      lockApprovalEvidenceRef: null,
      lockApprovedByActorId: null,
      lockApprovedByRoleCode: null,
      reopenedByActorId: null,
      reopenedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.accountingPeriods.set(accountingPeriod.accountingPeriodId, accountingPeriod);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ledger.accounting_period.seeded",
      entityType: "accounting_period",
      entityId: accountingPeriod.accountingPeriodId,
      explanation: `Ensured accounting period ${startsOn}..${endsOn}.`
    });

    return copy(accountingPeriod);
  }

  function listLedgerDimensions({ companyId } = {}) {
    return copy(ensureDimensionCatalog(requireText(companyId, "company_id_required")));
  }

  function upsertLedgerDimensionValue({
    companyId,
    dimensionType,
    code,
    label,
    status = null,
    locked = null,
    sourceDomain = "ledger",
    changeReasonCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedDimensionType = normalizeDimensionType(dimensionType);
    const catalog = ensureDimensionCatalog(resolvedCompanyId);
    const resolvedCode = normalizeDimensionValueCode(code, resolvedDimensionType);
    const existing = catalog[resolvedDimensionType].find((value) => value.code === resolvedCode) || null;
    const hasUsage = existing
      ? dimensionValueHasUsage({
          companyId: resolvedCompanyId,
          dimensionType: resolvedDimensionType,
          code: resolvedCode
        })
      : false;

    if (existing && hasUsage && !changeReasonCode) {
      throw httpError(
        409,
        "dimension_value_change_reason_required",
        `Dimension value ${resolvedCode} requires a change reason after it has been used in journals.`
      );
    }

    const now = nowIso();
    const record = existing || {
      dimensionValueId: crypto.randomUUID(),
      code: resolvedCode,
      dimensionType: resolvedDimensionType,
      createdAt: now
    };
    record.label = normalizeLedgerLabel(label ?? existing?.label, "dimension_label_required");
    record.status = normalizeDimensionValueStatus(status ?? existing?.status ?? "active");
    record.locked = locked == null ? existing?.locked ?? true : locked === true;
    record.sourceDomain = requireText(sourceDomain || existing?.sourceDomain || "ledger", "dimension_source_domain_required");
    record.dimensionType = resolvedDimensionType;
    record.version = (existing?.version || 0) + 1;
    record.updatedAt = now;
    record.changeReasonCode = changeReasonCode || existing?.changeReasonCode || (existing ? "catalog_update" : "catalog_create");

    if (existing) {
      const index = catalog[resolvedDimensionType].findIndex((value) => value.code === resolvedCode);
      catalog[resolvedDimensionType][index] = record;
    } else {
      catalog[resolvedDimensionType].push(record);
      catalog[resolvedDimensionType].sort((left, right) => left.code.localeCompare(right.code));
    }
    catalog.catalogVersion += 1;
    catalog.updatedAt = now;

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: existing ? "ledger.dimension_value.updated" : "ledger.dimension_value.created",
      entityType: "ledger_dimension_value",
      entityId: record.dimensionValueId,
      explanation: `${existing ? "Updated" : "Created"} ${resolvedDimensionType} value ${record.code}.`
    });

    return copy({
      catalogVersion: catalog.catalogVersion,
      dimensionType: resolvedDimensionType,
      dimensionValue: record
    });
  }

  function lockAccountingPeriod({
    companyId,
    accountingPeriodId,
    status = "soft_locked",
    actorId,
    reasonCode,
    approvedByActorId = null,
    approvedByRoleCode = null,
    approvalMode = null,
    approvalChainActorIds = [],
    approvalEvidenceRef = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const accountingPeriod = requireAccountingPeriodForCompany(resolvedCompanyId, accountingPeriodId);
    const targetStatus = assertLockStatus(status);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedReasonCode = requireText(reasonCode, "reason_code_required");

    if (accountingPeriod.status === targetStatus) {
      return {
        accountingPeriod: copy(accountingPeriod),
        affectedJournalEntries: []
      };
    }

    if (accountingPeriod.status === "hard_closed" && targetStatus !== "hard_closed") {
      throw httpError(409, "accounting_period_transition_invalid", "A hard-closed period must be reopened before its lock status changes.");
    }

    const hardCloseApproval = targetStatus === "hard_closed"
      ? resolveHardCloseApproval({
        actorId: resolvedActorId,
        approvedByActorId,
        approvedByRoleCode,
        approvalMode,
        approvalChainActorIds,
        approvalEvidenceRef
      })
      : null;

    const now = nowIso();
    accountingPeriod.status = targetStatus;
    accountingPeriod.lockReasonCode = resolvedReasonCode;
    accountingPeriod.lockedByActorId = resolvedActorId;
    accountingPeriod.lockedAt = now;
    accountingPeriod.lockApprovalMode = hardCloseApproval?.approvalMode || null;
    accountingPeriod.lockApprovalActorIds = hardCloseApproval?.approvalActorIds || [];
    accountingPeriod.lockApprovalEvidenceRef = hardCloseApproval?.approvalEvidenceRef || null;
    accountingPeriod.lockApprovedByActorId = hardCloseApproval?.approvedByActorId || null;
    accountingPeriod.lockApprovedByRoleCode = hardCloseApproval?.approvedByRoleCode || null;
    accountingPeriod.updatedAt = now;

    const affectedJournalEntries = toggleEntriesForLockedPeriod({
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      action: "lock"
    });

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.accounting_period.locked",
      entityType: "accounting_period",
      entityId: accountingPeriod.accountingPeriodId,
      explanation: `Locked accounting period ${accountingPeriod.startsOn}..${accountingPeriod.endsOn} as ${targetStatus}.`
    });

    return {
      accountingPeriod: copy(accountingPeriod),
      affectedJournalEntries: affectedJournalEntries.map((entry) => presentJournalEntry(entry))
    };
  }

  function reopenAccountingPeriod({
    companyId,
    accountingPeriodId,
    actorId,
    reasonCode,
    approvedByActorId,
    approvedByRoleCode = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const accountingPeriod = requireAccountingPeriodForCompany(resolvedCompanyId, accountingPeriodId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    requireText(reasonCode, "reason_code_required");
    assertSeniorFinanceApproval({
      actorId: resolvedActorId,
      approvedByActorId,
      approvedByRoleCode
    });

    if (accountingPeriod.status === "open") {
      return {
        accountingPeriod: copy(accountingPeriod),
        affectedJournalEntries: []
      };
    }

    const now = nowIso();
    accountingPeriod.status = "open";
    accountingPeriod.reopenedByActorId = resolvedActorId;
    accountingPeriod.reopenedAt = now;
    accountingPeriod.updatedAt = now;

    const affectedJournalEntries = toggleEntriesForLockedPeriod({
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      action: "unlock"
    });

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.accounting_period.reopened",
      entityType: "accounting_period",
      entityId: accountingPeriod.accountingPeriodId,
      explanation: `Reopened accounting period ${accountingPeriod.startsOn}..${accountingPeriod.endsOn}.`
    });

    return {
      accountingPeriod: copy(accountingPeriod),
      affectedJournalEntries: affectedJournalEntries.map((entry) => presentJournalEntry(entry))
    };
  }

  function createJournalEntry({
    companyId,
    journalDate,
    voucherSeriesCode,
    sourceType,
    sourceId,
    description = null,
    actorId,
    idempotencyKey,
    lines,
    importedFlag = false,
    currencyCode = DEFAULT_LEDGER_CURRENCY,
    metadataJson = {},
    correctionOfJournalEntryId = null,
    correctionKey = null,
    correctionType = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const resolvedSourceType = assertPostingSourceType(sourceType);
    const resolvedSourceId = requireText(sourceId, "source_id_required");
    const replayKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);

    if (state.idempotencyKeys.has(replayKey)) {
      const existingEntry = requireJournalEntry(resolvedCompanyId, state.idempotencyKeys.get(replayKey));
      if (existingEntry.sourceType !== resolvedSourceType || existingEntry.sourceId !== resolvedSourceId) {
        throw httpError(409, "idempotency_key_conflict", "Idempotency key already belongs to another posting source.");
      }
      return {
        journalEntry: presentJournalEntry(existingEntry),
        idempotentReplay: true
      };
    }

    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedVoucherSeries = requireVoucherSeries(resolvedCompanyId, voucherSeriesCode);
    const resolvedJournalDate = normalizeDate(journalDate, "journal_date_required");
    const accountingContext = resolveAccountingContext({
      companyId: resolvedCompanyId,
      journalDate: resolvedJournalDate
    });
    const accountingPeriod = accountingContext.accountingPeriod;
    const accountingCurrencyProfile = ensureAccountingCurrencyProfile(resolvedCompanyId);
    const accountingCurrencyCode = accountingCurrencyProfile.accountingCurrencyCode;
    const normalizedMetadata = normalizeMetadata(metadataJson, importedFlag);
    ensurePeriodAllowsEntryCreation(accountingPeriod, normalizedMetadata, resolvedActorId);
    const dimensionCatalog = ensureDimensionCatalog(resolvedCompanyId);
    const requestedCurrencyCode = normalizeCurrencyCode(currencyCode);

    const journalEntryId = crypto.randomUUID();
    const draftLines = normalizeJournalLines({
      companyId: resolvedCompanyId,
      journalEntryId,
      actorId: resolvedActorId,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      entryCurrencyCode: requestedCurrencyCode,
      accountingCurrencyCode,
      metadataJson: normalizedMetadata,
      dimensionCatalogVersion: dimensionCatalog.catalogVersion,
      lines
    });
    const totals = calculateTotals(draftLines);
    const now = nowIso();
    const resolvedDescription = resolveDraftDescription({
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      description
    });

    const entry = {
      journalEntryId,
      companyId: resolvedCompanyId,
      voucherSeriesId: resolvedVoucherSeries.voucherSeriesId,
      voucherSeriesCode: resolvedVoucherSeries.seriesCode,
      voucherSeriesProfileVersion: resolvedVoucherSeries.profileVersion || 1,
      dimensionCatalogVersion: dimensionCatalog.catalogVersion,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      fiscalYearId: accountingContext.fiscalYear?.fiscalYearId || accountingPeriod.fiscalYearId || null,
      fiscalPeriodId: accountingContext.fiscalPeriod?.periodId || accountingPeriod.fiscalPeriodId || null,
      accountingMethodProfileId: accountingContext.accountingMethodProfile?.methodProfileId || null,
      journalDate: resolvedJournalDate,
      voucherNumber: null,
      description: resolvedDescription,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      actorId: resolvedActorId,
      status: "draft",
      importedFlag: Boolean(importedFlag),
      currencyCode: accountingCurrencyCode,
      accountingCurrencyCode,
      accountingCurrencyProfileId: accountingCurrencyProfile.accountingCurrencyProfileId,
      accountingCurrencyProfileVersion: accountingCurrencyProfile.profileVersion || 1,
      originalCurrencyCode: requestedCurrencyCode !== accountingCurrencyCode ? requestedCurrencyCode : null,
      idempotencyKey: resolvedIdempotencyKey,
      metadataJson: normalizedMetadata,
      createdAt: now,
      updatedAt: now,
      validatedAt: null,
      approvedForPostAt: null,
      postedAt: null,
      reversalOfJournalEntryId: null,
      reversedByJournalEntryId: null,
      correctionOfJournalEntryId: correctionOfJournalEntryId ? requireText(correctionOfJournalEntryId, "correction_of_journal_entry_id_required") : null,
      correctionKey: correctionKey ? requireText(correctionKey, "correction_key_required") : null,
      correctionType: correctionType ? assertCorrectionType(correctionType) : null,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit
    };

    state.journalEntries.set(entry.journalEntryId, entry);
    state.journalLinesByEntryId.set(entry.journalEntryId, draftLines);
    state.idempotencyKeys.set(replayKey, entry.journalEntryId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.journal_entry.created",
      entityType: "journal_entry",
      entityId: entry.journalEntryId,
      explanation: `Created draft journal in series ${entry.voucherSeriesCode}.`
    });

    return {
      journalEntry: presentJournalEntry(entry),
      idempotentReplay: false
    };
  }

  function validateJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const entry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    if (entry.status === "locked_by_period") {
      throw httpError(409, "period_locked", "Journal entry belongs to a locked accounting period.");
    }
    if (entry.status === "posted" || entry.status === "approved_for_post") {
      return { journalEntry: presentJournalEntry(entry) };
    }
    if (entry.status !== "draft") {
      throw httpError(409, "ledger_state_invalid", `Journal entry cannot be validated from state ${entry.status}.`);
    }

    const accountingPeriod = requireAccountingPeriod(entry.accountingPeriodId);
    ensurePeriodAllowsEntryMutation(accountingPeriod, entry);
    const lines = requireJournalLines(entry.journalEntryId);
    validateLines(entry, lines);
    assertJournalDescription(entry);

    entry.status = "approved_for_post";
    entry.validatedAt = nowIso();
    entry.approvedForPostAt = entry.validatedAt;
    entry.updatedAt = entry.validatedAt;
    pushAudit({
      companyId: entry.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.journal_entry.approved_for_post",
      entityType: "journal_entry",
      entityId: entry.journalEntryId,
      explanation: `Approved draft journal ${entry.journalEntryId} for posting in series ${entry.voucherSeriesCode}.`
    });

    return {
      journalEntry: presentJournalEntry(entry)
    };
  }

  function postJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    approvedByActorId = null,
    approvedByRoleCode = null,
    importedVoucherNumber = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const entry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    if (entry.status === "posted") {
      return { journalEntry: presentJournalEntry(entry) };
    }
    if (entry.status !== "approved_for_post") {
      throw httpError(409, "journal_entry_not_approved_for_post", "Journal entry must be approved for post before posting.");
    }

    const accountingPeriod = requireAccountingPeriod(entry.accountingPeriodId);
    ensurePeriodAllowsEntryMutation(accountingPeriod, entry);
    assertJournalDescription(entry);
    assertJournalPostApproval({
      entry,
      actorId: requireText(actorId, "actor_id_required"),
      approvedByActorId,
      approvedByRoleCode
    });

    const voucherSeries = requireVoucherSeries(entry.companyId, entry.voucherSeriesCode);
    ensureVoucherSeriesUsable(voucherSeries, false);
    const now = nowIso();
    const resolvedImportedVoucherNumber = importedVoucherNumber == null
      ? null
      : normalizePositiveInteger(importedVoucherNumber, "imported_voucher_number_invalid");
    if (entry.voucherNumber == null) {
      if (resolvedImportedVoucherNumber != null) {
        if (entry.importedFlag !== true) {
          throw httpError(
            409,
            "journal_entry_imported_voucher_number_requires_imported_entry",
            "Imported voucher numbers may only be preserved for imported journal entries."
          );
        }
        if (voucherSeries.importedSequencePreservationEnabled !== true) {
          throw httpError(
            409,
            "voucher_series_imported_sequence_disabled",
            `Voucher series ${voucherSeries.seriesCode} does not allow imported voucher-number preservation.`
          );
        }
        for (const candidate of state.journalEntries.values()) {
          if (
            candidate.companyId === entry.companyId &&
            candidate.journalEntryId !== entry.journalEntryId &&
            candidate.voucherSeriesCode === voucherSeries.seriesCode &&
            candidate.voucherNumber === resolvedImportedVoucherNumber
          ) {
            throw httpError(
              409,
              "journal_entry_imported_voucher_number_conflict",
              `Voucher ${voucherSeries.seriesCode}${resolvedImportedVoucherNumber} is already in use.`
            );
          }
        }
        entry.voucherNumber = resolvedImportedVoucherNumber;
        if (voucherSeries.nextNumber <= resolvedImportedVoucherNumber) {
          voucherSeries.nextNumber = resolvedImportedVoucherNumber + 1;
        }
      } else {
        entry.voucherNumber = voucherSeries.nextNumber;
        voucherSeries.nextNumber += 1;
      }
      voucherSeries.updatedAt = now;
    }
    entry.status = "posted";
    entry.postedAt = now;
    entry.updatedAt = now;

    pushAudit({
      companyId: entry.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.journal_entry.posted",
      entityType: "journal_entry",
      entityId: entry.journalEntryId,
      explanation: `Posted voucher ${entry.voucherSeriesCode}${entry.voucherNumber}.`
    });

    return {
      journalEntry: presentJournalEntry(entry)
    };
  }

  function reverseJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    reasonCode,
    correctionKey,
    approvedByActorId = null,
    approvedByRoleCode = null,
    journalDate = null,
    voucherSeriesCode = null,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const originalEntry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedReasonCode = requireText(reasonCode, "reason_code_required");
    const resolvedCorrectionKey = requireText(correctionKey, "correction_key_required");

    if (originalEntry.status !== "posted" && originalEntry.status !== "reversed") {
      throw httpError(409, "journal_entry_not_posted", "Only posted journal entries can be reversed.");
    }

    if (originalEntry.reversedByJournalEntryId) {
      const existingReversal = requireJournalEntry(originalEntry.companyId, originalEntry.reversedByJournalEntryId);
      if (existingReversal.correctionKey === resolvedCorrectionKey) {
        return {
          originalJournalEntry: presentJournalEntry(originalEntry),
          reversalJournalEntry: presentJournalEntry(existingReversal),
          idempotentReplay: true
        };
      }
      throw httpError(409, "journal_entry_already_reversed", "Journal entry already has a linked full reversal.");
    }

    const target = resolveCorrectionTargetDate({
      companyId: originalEntry.companyId,
      originalEntry,
      requestedJournalDate: journalDate
    });
    const resolvedVoucherSeriesCode = voucherSeriesCode
      ? normalizeSeriesCode(voucherSeriesCode, "voucher_series_code_required")
      : resolveVoucherSeriesForPurpose({
          companyId: originalEntry.companyId,
          purposeCode: "LEDGER_REVERSAL"
        }).seriesCode;
    const reversalCreate = createJournalEntry({
      companyId: originalEntry.companyId,
      journalDate: target.journalDate,
      voucherSeriesCode: resolvedVoucherSeriesCode,
      sourceType: "MANUAL_JOURNAL",
      sourceId: `reversal:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      description: `Reversal of ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}`,
      actorId: resolvedActorId,
      idempotencyKey: `reversal:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      lines: reverseLines(requireJournalLines(originalEntry.journalEntryId)),
      metadataJson: {
        ...mergeJournalPinningMetadata(originalEntry.metadataJson, metadataJson),
        originalJournalEntryId: originalEntry.journalEntryId,
        originalPeriodUntouched: target.originalPeriodUntouched,
        pipelineStage: "ledger_reversal",
        reasonCode: resolvedReasonCode
      },
      correctionOfJournalEntryId: originalEntry.journalEntryId,
      correctionKey: resolvedCorrectionKey,
      correctionType: "full_reversal",
      correlationId
    });

    const validated = validateJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: reversalCreate.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      correlationId
    });
    const posted = postJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      approvedByActorId,
      approvedByRoleCode,
      correlationId
    });

    const now = nowIso();
    originalEntry.status = "reversed";
    originalEntry.reversedByJournalEntryId = posted.journalEntry.journalEntryId;
    originalEntry.updatedAt = now;
    const storedReversal = state.journalEntries.get(posted.journalEntry.journalEntryId);
    storedReversal.reversalOfJournalEntryId = originalEntry.journalEntryId;
    storedReversal.updatedAt = now;

    pushAudit({
      companyId: originalEntry.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.journal_entry.reversed",
      entityType: "journal_entry",
      entityId: originalEntry.journalEntryId,
      explanation: `Created reversal ${storedReversal.voucherSeriesCode}${storedReversal.voucherNumber} for ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}.`
    });

    return {
      originalJournalEntry: presentJournalEntry(originalEntry),
      reversalJournalEntry: presentJournalEntry(storedReversal),
      idempotentReplay: reversalCreate.idempotentReplay === true
    };
  }

  function correctJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    reasonCode,
    correctionKey,
    approvedByActorId = null,
    approvedByRoleCode = null,
    lines,
    journalDate = null,
    voucherSeriesCode = null,
    reverseOriginal = false,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const originalEntry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedReasonCode = requireText(reasonCode, "reason_code_required");
    const resolvedCorrectionKey = requireText(correctionKey, "correction_key_required");

    if (originalEntry.status !== "posted" && originalEntry.status !== "reversed") {
      throw httpError(409, "journal_entry_not_posted", "Only posted journal entries can be corrected.");
    }

    const target = resolveCorrectionTargetDate({
      companyId: originalEntry.companyId,
      originalEntry,
      requestedJournalDate: journalDate
    });

    let reversalJournalEntry = null;
    if (reverseOriginal) {
      reversalJournalEntry = reverseJournalEntry({
        companyId: originalEntry.companyId,
        journalEntryId: originalEntry.journalEntryId,
        actorId: resolvedActorId,
        reasonCode: resolvedReasonCode,
        correctionKey: `${resolvedCorrectionKey}:reversal`,
        approvedByActorId,
        approvedByRoleCode,
        journalDate: target.journalDate,
        correlationId
      }).reversalJournalEntry;
    }

    const resolvedVoucherSeriesCode = voucherSeriesCode
      ? normalizeSeriesCode(voucherSeriesCode, "voucher_series_code_required")
      : resolveVoucherSeriesForPurpose({
          companyId: originalEntry.companyId,
          purposeCode: "LEDGER_CORRECTION"
        }).seriesCode;

    const correctionCreate = createJournalEntry({
      companyId: originalEntry.companyId,
      journalDate: target.journalDate,
      voucherSeriesCode: resolvedVoucherSeriesCode,
      sourceType: "MANUAL_JOURNAL",
      sourceId: `correction:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      description: `Correction of ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}`,
      actorId: resolvedActorId,
      idempotencyKey: `correction:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      lines,
      metadataJson: {
        ...mergeJournalPinningMetadata(originalEntry.metadataJson, metadataJson),
        originalJournalEntryId: originalEntry.journalEntryId,
        originalPeriodUntouched: target.originalPeriodUntouched,
        pipelineStage: "ledger_correction",
        reasonCode: resolvedReasonCode
      },
      correctionOfJournalEntryId: originalEntry.journalEntryId,
      correctionKey: resolvedCorrectionKey,
      correctionType: reverseOriginal ? "reversal_and_rebook" : "delta",
      correlationId
    });

    const validated = validateJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: correctionCreate.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      correlationId
    });
    const posted = postJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      approvedByActorId,
      approvedByRoleCode,
      correlationId
    });

    const storedCorrection = state.journalEntries.get(posted.journalEntry.journalEntryId);
    pushAudit({
      companyId: originalEntry.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.journal_entry.corrected",
      entityType: "journal_entry",
      entityId: originalEntry.journalEntryId,
      explanation: `Created correction ${storedCorrection.voucherSeriesCode}${storedCorrection.voucherNumber} for ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}.`
    });

    return {
      originalJournalEntry: presentJournalEntry(originalEntry),
      reversalJournalEntry: reversalJournalEntry ? presentJournalEntry(state.journalEntries.get(reversalJournalEntry.journalEntryId)) : null,
      correctedJournalEntry: presentJournalEntry(storedCorrection),
      idempotentReplay: correctionCreate.idempotentReplay === true
    };
  }

  function getJournalEntry({ companyId, journalEntryId } = {}) {
    return presentJournalEntry(requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId));
  }

  function listJournalEntries({
    companyId,
    fiscalYearId = null,
    fromDate = null,
    toDate = null,
    statuses = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedFiscalYearId = fiscalYearId == null ? null : requireText(fiscalYearId, "fiscal_year_id_required");
    const resolvedFromDate = fromDate == null ? null : normalizeDate(fromDate, "from_date_invalid");
    const resolvedToDate = toDate == null ? null : normalizeDate(toDate, "to_date_invalid");
    const allowedStatuses = statuses == null
      ? null
      : new Set(
          (Array.isArray(statuses) ? statuses : [statuses]).map((status) => {
            const normalizedStatus = requireText(status, "ledger_state_invalid");
            if (!LEDGER_STATES.includes(normalizedStatus)) {
              throw httpError(400, "ledger_state_invalid", `Ledger state ${normalizedStatus} is invalid.`);
            }
            return normalizedStatus;
          })
        );

    return [...state.journalEntries.values()]
      .filter((entry) => entry.companyId === resolvedCompanyId)
      .filter((entry) => resolvedFiscalYearId == null || entry.fiscalYearId === resolvedFiscalYearId)
      .filter((entry) => resolvedFromDate == null || entry.journalDate >= resolvedFromDate)
      .filter((entry) => resolvedToDate == null || entry.journalDate <= resolvedToDate)
      .filter((entry) => allowedStatuses == null || allowedStatuses.has(entry.status))
      .sort((left, right) => {
        const byDate = left.journalDate.localeCompare(right.journalDate);
        if (byDate !== 0) {
          return byDate;
        }
        const leftVoucher = left.voucherNumber == null ? Number.MAX_SAFE_INTEGER : left.voucherNumber;
        const rightVoucher = right.voucherNumber == null ? Number.MAX_SAFE_INTEGER : right.voucherNumber;
        const bySeries = left.voucherSeriesCode.localeCompare(right.voucherSeriesCode);
        if (bySeries !== 0) {
          return bySeries;
        }
        return leftVoucher - rightVoucher || left.createdAt.localeCompare(right.createdAt);
      })
      .map((entry) => presentJournalEntry(entry));
  }

  function createFxRevaluationBatch({
    companyId,
    cutoffDate,
    scopeCode = "open_items",
    description = null,
    autoReverseOn = null,
    sourceRateSetCode = null,
    items,
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const scopedKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingBatchId = state.fxRevaluationBatchIdsByCompanyKey.get(scopedKey);
    if (existingBatchId) {
      return copy(requireFxRevaluationBatch(resolvedCompanyId, existingBatchId));
    }
    const normalizedItems = normalizeFxRevaluationItems(items);
    const now = nowIso();
    const batch = {
      fxRevaluationBatchId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      cutoffDate: normalizeDate(cutoffDate, "fx_revaluation_cutoff_date_invalid"),
      scopeCode: requireText(scopeCode, "fx_revaluation_scope_code_required"),
      description: normalizeOptionalText(description) || `FX revaluation ${scopeCode} ${cutoffDate}`,
      autoReverseOn: autoReverseOn ? normalizeDate(autoReverseOn, "fx_revaluation_auto_reverse_date_invalid") : null,
      sourceRateSetCode: normalizeOptionalText(sourceRateSetCode),
      idempotencyKey: resolvedIdempotencyKey,
      status: "draft",
      items: normalizedItems,
      totals: summarizeFxRevaluationItems(normalizedItems),
      createdByActorId: requireText(actorId, "actor_id_required"),
      approvedByActorId: null,
      approvedByRoleCode: null,
      journalEntryId: null,
      reversalJournalEntryId: null,
      createdAt: now,
      updatedAt: now
    };
    state.fxRevaluationBatches.set(batch.fxRevaluationBatchId, batch);
    state.fxRevaluationBatchIdsByCompanyKey.set(scopedKey, batch.fxRevaluationBatchId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: batch.createdByActorId,
      correlationId,
      action: "ledger.fx_revaluation_batch.created",
      entityType: "fx_revaluation_batch",
      entityId: batch.fxRevaluationBatchId,
      explanation: `Created FX revaluation batch ${batch.fxRevaluationBatchId} for ${batch.cutoffDate}.`
    });
    return copy(batch);
  }

  function approveFxRevaluationBatch({
    companyId,
    fxRevaluationBatchId,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    correlationId = crypto.randomUUID()
  } = {}) {
    const batch = requireFxRevaluationBatch(requireText(companyId, "company_id_required"), fxRevaluationBatchId);
    if (batch.status === "approved" || batch.status === "posted") {
      return copy(batch);
    }
    if (batch.status !== "draft") {
      throw httpError(409, "fx_revaluation_batch_state_invalid", `FX revaluation batch cannot be approved from state ${batch.status}.`);
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    assertSeniorFinanceApproval({
      actorId: resolvedActorId,
      approvedByActorId,
      approvedByRoleCode
    });
    batch.status = "approved";
    batch.approvedByActorId = normalizeOptionalText(approvedByActorId);
    batch.approvedByRoleCode = requireText(approvedByRoleCode, "approved_by_role_code_required").toLowerCase();
    batch.updatedAt = nowIso();
    pushAudit({
      companyId: batch.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.fx_revaluation_batch.approved",
      entityType: "fx_revaluation_batch",
      entityId: batch.fxRevaluationBatchId,
      explanation: `Approved FX revaluation batch ${batch.fxRevaluationBatchId}.`
    });
    return copy(batch);
  }

  function postFxRevaluationBatch({
    companyId,
    fxRevaluationBatchId,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    journalDate = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const batch = requireFxRevaluationBatch(requireText(companyId, "company_id_required"), fxRevaluationBatchId);
    if (batch.status === "posted") {
      return copy(batch);
    }
    if (batch.status !== "approved") {
      throw httpError(409, "fx_revaluation_batch_not_approved", "FX revaluation batch must be approved before posting.");
    }
    const lines = batch.items.flatMap((item, index) =>
      buildFxRevaluationJournalLines({
        carryingAccountNumber: item.accountNumber,
        differenceAmount: item.revaluationDeltaAmount,
        balanceOrientation: item.balanceOrientation,
        sourceType: "MANUAL_JOURNAL",
        sourceId: item.itemId,
        lineNumberStart: index * 2 + 1,
        carryingDimensionJson: item.dimensionJson,
        fxDimensionJson: item.dimensionJson
      })
    );
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const created = createJournalEntry({
      companyId: batch.companyId,
      journalDate: normalizeDate(journalDate || batch.cutoffDate, "fx_revaluation_posting_date_invalid"),
      voucherSeriesCode: "N",
      sourceType: "MANUAL_JOURNAL",
      sourceId: `fx_revaluation_batch:${batch.fxRevaluationBatchId}`,
      actorId: resolvedActorId,
      idempotencyKey: `fx_revaluation_post:${batch.fxRevaluationBatchId}`,
      description: batch.description,
      metadataJson: {
        pipelineStage: "fx_revaluation_batch",
        fxRevaluationBatchId: batch.fxRevaluationBatchId,
        cutoffDate: batch.cutoffDate,
        scopeCode: batch.scopeCode,
        sourceRateSetCode: batch.sourceRateSetCode,
        autoReverseOn: batch.autoReverseOn
      },
      lines,
      correlationId
    });
    validateJournalEntry({
      companyId: batch.companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      correlationId
    });
    const posted = postJournalEntry({
      companyId: batch.companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      approvedByActorId,
      approvedByRoleCode,
      correlationId
    });
    batch.status = "posted";
    batch.journalEntryId = posted.journalEntry.journalEntryId;
    batch.updatedAt = nowIso();
    pushAudit({
      companyId: batch.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.fx_revaluation_batch.posted",
      entityType: "fx_revaluation_batch",
      entityId: batch.fxRevaluationBatchId,
      explanation: `Posted FX revaluation batch ${batch.fxRevaluationBatchId}.`
    });
    return copy(batch);
  }

  function reverseFxRevaluationBatch({
    companyId,
    fxRevaluationBatchId,
    actorId,
    reasonCode,
    approvedByActorId = null,
    approvedByRoleCode = null,
    journalDate = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const batch = requireFxRevaluationBatch(requireText(companyId, "company_id_required"), fxRevaluationBatchId);
    if (batch.status === "reversed") {
      return copy(batch);
    }
    if (!batch.journalEntryId) {
      throw httpError(409, "fx_revaluation_batch_not_posted", "FX revaluation batch must be posted before reversal.");
    }
    const reversed = reverseJournalEntry({
      companyId: batch.companyId,
      journalEntryId: batch.journalEntryId,
      actorId: requireText(actorId, "actor_id_required"),
      reasonCode: requireText(reasonCode, "reason_code_required"),
      correctionKey: `fx_revaluation_reversal:${batch.fxRevaluationBatchId}`,
      approvedByActorId,
      approvedByRoleCode,
      journalDate,
      voucherSeriesCode: "N",
      correlationId
    });
    batch.status = "reversed";
    batch.reversalJournalEntryId = reversed.reversalJournalEntry.journalEntryId;
    batch.updatedAt = nowIso();
    pushAudit({
      companyId: batch.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.fx_revaluation_batch.reversed",
      entityType: "fx_revaluation_batch",
      entityId: batch.fxRevaluationBatchId,
      explanation: `Reversed FX revaluation batch ${batch.fxRevaluationBatchId}.`
    });
    return copy(batch);
  }

  function getFxRevaluationBatch({ companyId, fxRevaluationBatchId } = {}) {
    return copy(requireFxRevaluationBatch(requireText(companyId, "company_id_required"), fxRevaluationBatchId));
  }

  function listFxRevaluationBatches({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.fxRevaluationBatches.values()]
      .filter((batch) => batch.companyId === resolvedCompanyId)
      .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function requireFxRevaluationBatch(companyId, fxRevaluationBatchId) {
    const batch = state.fxRevaluationBatches.get(requireText(fxRevaluationBatchId, "fx_revaluation_batch_id_required"));
    if (!batch || batch.companyId !== companyId) {
      throw httpError(404, "fx_revaluation_batch_not_found", "FX revaluation batch was not found for the company.");
    }
    return batch;
  }

  function snapshotLedger() {
    return copy({
      accounts: [...state.accounts.values()],
      accountingCurrencyProfiles: [...state.accountingCurrencyProfilesByCompanyId.values()],
      fxRevaluationBatches: [...state.fxRevaluationBatches.values()],
      voucherSeries: [...state.voucherSeries.values()],
      openingBalanceBatches: [...state.openingBalanceBatches.values()],
      yearEndTransferBatches: [...state.yearEndTransferBatches.values()],
      vatClearingRuns: [...state.vatClearingRuns.values()],
      assetCards: [...state.assetCards.values()],
      depreciationBatches: [...state.depreciationBatches.values()],
      accrualSchedules: [...state.accrualSchedules.values()],
      accrualBatches: [...state.accrualBatches.values()],
      postingIntents: [...state.postingIntents.values()],
      accountingPeriods: [...state.accountingPeriods.values()],
      dimensionCatalogs: [...state.dimensionCatalogsByCompanyId.values()],
      journalEntries: [...state.journalEntries.values()].map((entry) => presentJournalEntry(entry)),
      auditEvents: state.auditEvents
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function ensureAccountingCurrencyProfile(companyId) {
    const existing = state.accountingCurrencyProfilesByCompanyId.get(companyId);
    if (existing) {
      return existing;
    }
    const now = nowIso();
    const profile = {
      accountingCurrencyProfileId: crypto.randomUUID(),
      companyId,
      accountingCurrencyCode: DEFAULT_LEDGER_CURRENCY,
      reportingCurrencyCode: DEFAULT_LEDGER_CURRENCY,
      profileVersion: 1,
      sourceCode: "default_profile",
      createdAt: now,
      updatedAt: now
    };
    state.accountingCurrencyProfilesByCompanyId.set(companyId, profile);
    return profile;
  }

  function accountingCurrencyProfileHasUsage(companyId) {
    for (const entry of state.journalEntries.values()) {
      if (entry.companyId === companyId) {
        return true;
      }
    }
    return false;
  }

  function requireOpeningBalanceFiscalYear({ companyId, fiscalYearId, openingDate }) {
    if (!fiscalYearPlatform || typeof fiscalYearPlatform.getFiscalYear !== "function") {
      throw httpError(409, "fiscal_year_runtime_required", "Opening balance posting requires the fiscal-year runtime.");
    }
    const fiscalYear = fiscalYearPlatform.getFiscalYear({
      companyId,
      fiscalYearId: requireText(fiscalYearId, "fiscal_year_id_required")
    });
    const resolvedOpeningDate = normalizeDate(openingDate, "opening_balance_date_invalid");
    if (resolvedOpeningDate !== fiscalYear.startDate) {
      throw httpError(409, "opening_balance_must_match_fiscal_year_start", "Opening balance date must match the fiscal-year start date.");
    }
    return fiscalYear;
  }

  function assertOpeningBalanceUniqueness({ companyId, fiscalYearId }) {
    for (const batch of state.openingBalanceBatches.values()) {
      if (batch.companyId === companyId && batch.fiscalYearId === fiscalYearId && batch.status !== "reversed") {
        throw httpError(409, "opening_balance_already_posted", "An opening balance batch is already posted for the fiscal year.");
      }
    }
  }

  function requireOpeningBalanceBatch(companyId, openingBalanceBatchId) {
    const batch = state.openingBalanceBatches.get(requireText(openingBalanceBatchId, "opening_balance_batch_id_required"));
    if (!batch || batch.companyId !== companyId) {
      throw httpError(404, "opening_balance_batch_not_found", "Opening balance batch was not found.");
    }
    return batch;
  }

  function requireYearEndTransferFiscalYear({ companyId, fiscalYearId }) {
    if (!fiscalYearPlatform || typeof fiscalYearPlatform.getFiscalYear !== "function") {
      throw httpError(409, "fiscal_year_runtime_required", "Year-end transfer posting requires the fiscal-year runtime.");
    }
    return fiscalYearPlatform.getFiscalYear({
      companyId,
      fiscalYearId: requireText(fiscalYearId, "fiscal_year_id_required")
    });
  }

  function assertYearEndTransferKind(value) {
    const normalized = requireText(value, "year_end_transfer_kind_required").toUpperCase();
    if (!YEAR_END_TRANSFER_KINDS.includes(normalized)) {
      throw httpError(400, "year_end_transfer_kind_invalid", "Year-end transfer kind is not supported.");
    }
    return normalized;
  }

  function resolveYearEndTransferDate({ transferKind, fiscalYear, transferDate }) {
    if (transferKind === "RESULT_TRANSFER") {
      const resolved = normalizeDate(transferDate || fiscalYear.endDate, "year_end_transfer_date_invalid");
      if (resolved !== fiscalYear.endDate) {
        throw httpError(
          409,
          "year_end_transfer_must_match_fiscal_year_end",
          "Result transfer must be posted on the fiscal-year end date."
        );
      }
      return resolved;
    }
    const resolved = normalizeDate(
      transferDate || addDaysToIsoDate(fiscalYear.endDate, 1),
      "retained_earnings_transfer_date_invalid"
    );
    if (resolved <= fiscalYear.endDate) {
      throw httpError(
        409,
        "retained_earnings_transfer_must_follow_fiscal_year_end",
        "Retained earnings transfer must be posted after the fiscal-year end date."
      );
    }
    return resolved;
  }

  function assertYearEndTransferUniqueness({ companyId, fiscalYearId, transferKind }) {
    for (const batch of state.yearEndTransferBatches.values()) {
      if (
        batch.companyId === companyId
        && batch.fiscalYearId === fiscalYearId
        && batch.transferKind === transferKind
        && batch.status !== "reversed"
      ) {
        throw httpError(
          409,
          "year_end_transfer_already_posted",
          `A ${transferKind.toLowerCase()} batch is already posted for the fiscal year.`
        );
      }
    }
  }

  function requireYearEndTransferBatch(companyId, yearEndTransferBatchId) {
    const batch = state.yearEndTransferBatches.get(requireText(yearEndTransferBatchId, "year_end_transfer_batch_id_required"));
    if (!batch || batch.companyId !== companyId) {
      throw httpError(404, "year_end_transfer_batch_not_found", "Year-end transfer batch was not found.");
    }
    return batch;
  }

  function requireActiveYearEndTransferBatch({ companyId, fiscalYearId, transferKind }) {
    const batch = [...state.yearEndTransferBatches.values()].find(
      (candidate) =>
        candidate.companyId === companyId
        && candidate.fiscalYearId === fiscalYearId
        && candidate.transferKind === transferKind
        && candidate.status !== "reversed"
    );
    if (!batch) {
      throw httpError(
        409,
        "year_end_transfer_dependency_missing",
        `Required ${transferKind.toLowerCase()} batch is not posted for the fiscal year.`
      );
    }
    return batch;
  }

  function requireYearEndTransferEquityAccount({ companyId, accountNumber, errorCode }) {
    const account = requireAccount(companyId, accountNumber);
    if (account.accountClass !== "2") {
      throw httpError(409, "year_end_transfer_equity_account_required", `Account ${account.accountNumber} must be an equity account (class 2).`);
    }
    return account;
  }

  function requireVatDeclarationRunForClearing({ companyId, vatDeclarationRunId }) {
    const vatPlatform = resolveVatPlatformForLedger();
    return vatPlatform.getVatDeclarationRun({
      companyId,
      vatDeclarationRunId: requireText(vatDeclarationRunId, "vat_declaration_run_id_required")
    });
  }

  function assertVatClearingUniqueness({ companyId, vatDeclarationRunId }) {
    for (const run of state.vatClearingRuns.values()) {
      if (run.companyId === companyId && run.vatDeclarationRunId === vatDeclarationRunId && run.status !== "reversed") {
        throw httpError(409, "vat_clearing_already_posted", "A VAT clearing run is already posted for the VAT declaration.");
      }
    }
  }

  function requireVatClearingRun(companyId, vatClearingRunId) {
    const run = state.vatClearingRuns.get(requireText(vatClearingRunId, "vat_clearing_run_id_required"));
    if (!run || run.companyId !== companyId) {
      throw httpError(404, "vat_clearing_run_not_found", "VAT clearing run was not found.");
    }
    return run;
  }

  function assertDepreciationMethodCode(value) {
    const normalized = requireText(value, "depreciation_method_code_required").toUpperCase();
    if (!DEPRECIATION_METHOD_CODES.includes(normalized)) {
      throw httpError(400, "depreciation_method_code_invalid", "Depreciation method code is not supported.");
    }
    return normalized;
  }

  function assertAssetCodeUnique({ companyId, assetCode }) {
    const resolvedAssetCode = normalizeCode(assetCode, "asset_code_required");
    for (const assetCard of state.assetCards.values()) {
      if (assetCard.companyId === companyId && assetCard.assetCode === resolvedAssetCode) {
        throw httpError(409, "asset_code_conflict", `Asset code ${resolvedAssetCode} already exists for the company.`);
      }
    }
    return resolvedAssetCode;
  }

  function requireAssetCard(companyId, assetCardId) {
    const assetCard = state.assetCards.get(requireText(assetCardId, "asset_card_id_required"));
    if (!assetCard || assetCard.companyId !== companyId) {
      throw httpError(404, "asset_card_not_found", "Asset card was not found.");
    }
    return assetCard;
  }

  function requireDepreciationBatch(companyId, depreciationBatchId) {
    const batch = state.depreciationBatches.get(requireText(depreciationBatchId, "depreciation_batch_id_required"));
    if (!batch || batch.companyId !== companyId) {
      throw httpError(404, "depreciation_batch_not_found", "Depreciation batch was not found.");
    }
    return batch;
  }

  function requireAssetBalanceSheetAccount({ companyId, accountNumber, errorCode = "asset_balance_sheet_account_required" }) {
    const account = requireAccount(companyId, normalizeAccountNumber(accountNumber));
    if (account.accountClass !== "1") {
      throw httpError(
        409,
        errorCode,
        `Account ${account.accountNumber} must be a class 1 balance-sheet asset account.`
      );
    }
    return account;
  }

  function requireDepreciationExpenseAccount({ companyId, accountNumber }) {
    const account = requireAccount(companyId, normalizeAccountNumber(accountNumber));
    if (account.accountClass !== "7") {
      throw httpError(
        409,
        "asset_depreciation_expense_account_required",
        `Account ${account.accountNumber} must be a class 7 depreciation expense account.`
      );
    }
    return account;
  }

  function assertAccrualScheduleKind(value) {
    const normalized = requireText(value, "accrual_schedule_kind_required").toUpperCase();
    if (!ACCRUAL_SCHEDULE_KINDS.includes(normalized)) {
      throw httpError(400, "accrual_schedule_kind_invalid", "Accrual schedule kind is not supported.");
    }
    return normalized;
  }

  function assertAccrualPatternCode(value) {
    const normalized = requireText(value, "accrual_pattern_code_required").toUpperCase();
    if (!ACCRUAL_PATTERN_CODES.includes(normalized)) {
      throw httpError(400, "accrual_pattern_code_invalid", "Accrual pattern code is not supported.");
    }
    return normalized;
  }

  function assertAccrualScheduleCodeUnique({ companyId, scheduleCode }) {
    const resolvedScheduleCode = normalizeCode(scheduleCode, "accrual_schedule_code_required");
    for (const schedule of state.accrualSchedules.values()) {
      if (schedule.companyId === companyId && schedule.scheduleCode === resolvedScheduleCode) {
        throw httpError(409, "accrual_schedule_code_conflict", `Accrual schedule code ${resolvedScheduleCode} already exists for the company.`);
      }
    }
    return resolvedScheduleCode;
  }

  function requireAccrualSchedule(companyId, accrualScheduleId) {
    const schedule = state.accrualSchedules.get(requireText(accrualScheduleId, "accrual_schedule_id_required"));
    if (!schedule || schedule.companyId !== companyId) {
      throw httpError(404, "accrual_schedule_not_found", "Accrual schedule was not found.");
    }
    return schedule;
  }

  function requireAccrualBatch(companyId, accrualBatchId) {
    const batch = state.accrualBatches.get(requireText(accrualBatchId, "accrual_batch_id_required"));
    if (!batch || batch.companyId !== companyId) {
      throw httpError(404, "accrual_batch_not_found", "Accrual batch was not found.");
    }
    return batch;
  }

  function requireAccrualProfitLossAccount({ companyId, accountNumber, scheduleKind }) {
    const account = requireAccount(companyId, normalizeAccountNumber(accountNumber));
    if (["PREPAID_REVENUE", "ACCRUED_REVENUE"].includes(scheduleKind)) {
      if (account.accountClass !== "3") {
        throw httpError(
          409,
          "accrual_revenue_account_required",
          `Account ${account.accountNumber} must be a class 3 revenue account for revenue accrual schedules.`
        );
      }
      return account;
    }
    if (!["4", "5", "6", "7", "8"].includes(account.accountClass)) {
      throw httpError(
        409,
        "accrual_expense_account_required",
        `Account ${account.accountNumber} must be a class 4-8 expense account for expense accrual schedules.`
      );
    }
    return account;
  }

  function requireAccrualBalanceSheetAccount({ companyId, accountNumber, scheduleKind }) {
    const account = requireAccount(companyId, normalizeAccountNumber(accountNumber));
    if (["PREPAID_EXPENSE", "ACCRUED_REVENUE"].includes(scheduleKind)) {
      if (account.accountClass !== "1") {
        throw httpError(
          409,
          "accrual_asset_account_required",
          `Account ${account.accountNumber} must be a class 1 asset account for this accrual schedule kind.`
        );
      }
      return account;
    }
    if (account.accountClass !== "2") {
      throw httpError(
        409,
        "accrual_liability_account_required",
        `Account ${account.accountNumber} must be a class 2 liability account for this accrual schedule kind.`
      );
    }
    return account;
  }

  function resolveAccrualPostingProfile(scheduleKind) {
    switch (scheduleKind) {
      case "PREPAID_EXPENSE":
      case "ACCRUED_EXPENSE":
        return Object.freeze({
          debitAccountRole: "profit_and_loss",
          creditAccountRole: "balance_sheet"
        });
      case "PREPAID_REVENUE":
      case "ACCRUED_REVENUE":
        return Object.freeze({
          debitAccountRole: "balance_sheet",
          creditAccountRole: "profit_and_loss"
        });
      default:
        throw httpError(400, "accrual_schedule_kind_invalid", "Accrual schedule kind is not supported.");
    }
  }

  function requireVatClearingTargetAccount({ companyId, accountNumber }) {
    const account = requireAccount(companyId, normalizeAccountNumber(accountNumber));
    if (account.accountClass !== "2") {
      throw httpError(409, "vat_clearing_target_account_invalid", `Account ${account.accountNumber} must be a balance-sheet VAT settlement account.`);
    }
    return account;
  }

  function resolveVatPlatformForLedger() {
    const platform = typeof getVatPlatform === "function" ? getVatPlatform() : null;
    if (!platform || typeof platform.getVatDeclarationRun !== "function") {
      throw httpError(409, "vat_runtime_required", "VAT clearing requires the VAT runtime.");
    }
    return platform;
  }

  function buildResultTransferLineInputs({ companyId, fiscalYear, resultAccountNumber, sourceId }) {
    const balances = summarizePostedAccountBalances({
      companyId,
      fromDate: fiscalYear.startDate,
      toDate: fiscalYear.endDate,
      accountClasses: ["3", "4", "5", "6", "7", "8"],
      excludeSourceTypes: ["YEAR_END_TRANSFER"]
    });
    if (balances.length === 0) {
      throw httpError(409, "year_end_transfer_no_profit_loss_balance", "No posted profit-and-loss balances exist for the fiscal year.");
    }
    const generatedLines = [];
    let netResultAmount = 0;
    for (const balance of balances) {
      netResultAmount = normalizeSignedMoney(netResultAmount + balance.balanceAmount);
      if (balance.balanceAmount > 0) {
        generatedLines.push({
          accountNumber: balance.accountNumber,
          creditAmount: balance.balanceAmount,
          sourceId
        });
      } else {
        generatedLines.push({
          accountNumber: balance.accountNumber,
          debitAmount: normalizeSignedMoney(0 - balance.balanceAmount),
          sourceId
        });
      }
    }
    if (netResultAmount > 0) {
      generatedLines.push({
        accountNumber: resultAccountNumber,
        debitAmount: netResultAmount,
        sourceId
      });
    } else if (netResultAmount < 0) {
      generatedLines.push({
        accountNumber: resultAccountNumber,
        creditAmount: normalizeSignedMoney(0 - netResultAmount),
        sourceId
      });
    }
    return {
      lines: normalizeYearEndTransferLineInputs({
        companyId,
        lines: generatedLines,
        sourceId
      }),
      capturedBalances: balances
    };
  }

  function buildRetainedEarningsTransferLineInputs({
    companyId,
    transferDate,
    sourceAccountNumber,
    destinationAccountNumber,
    sourceId
  }) {
    const balances = summarizePostedAccountBalances({
      companyId,
      toDate: transferDate,
      accountNumbers: [sourceAccountNumber]
    });
    const sourceBalanceAmount = balances[0]?.balanceAmount ?? 0;
    if (sourceBalanceAmount === 0) {
      throw httpError(
        409,
        "retained_earnings_source_balance_missing",
        "Source result account has no posted balance to transfer into retained earnings."
      );
    }
    return {
      lines: normalizeYearEndTransferLineInputs({
        companyId,
        sourceId,
        lines: [
          sourceBalanceAmount > 0
            ? { accountNumber: sourceAccountNumber, creditAmount: sourceBalanceAmount, sourceId }
            : { accountNumber: sourceAccountNumber, debitAmount: normalizeSignedMoney(0 - sourceBalanceAmount), sourceId },
          sourceBalanceAmount > 0
            ? { accountNumber: destinationAccountNumber, debitAmount: sourceBalanceAmount, sourceId }
            : { accountNumber: destinationAccountNumber, creditAmount: normalizeSignedMoney(0 - sourceBalanceAmount), sourceId }
        ]
      }),
      sourceBalanceAmount
    };
  }

  function buildVatClearingLineInputs({ companyId, fromDate, toDate, targetAccountNumber, sourceId }) {
    const capturedBalances = summarizePostedAccountBalances({
      companyId,
      fromDate,
      toDate,
      excludeSourceTypes: ["VAT_CLEARING"]
    }).filter((candidate) => isVatClearingSourceAccountNumber(candidate.accountNumber));
    if (capturedBalances.length === 0) {
      throw httpError(409, "vat_clearing_no_vat_balance", "No VAT balances are available to clear for the declaration period.");
    }

    const generatedLines = [];
    let sourceNetBalanceAmount = 0;
    for (const balance of capturedBalances) {
      sourceNetBalanceAmount = normalizeSignedMoney(sourceNetBalanceAmount + balance.balanceAmount);
      if (balance.balanceAmount > 0) {
        generatedLines.push({
          accountNumber: balance.accountNumber,
          creditAmount: balance.balanceAmount,
          sourceId
        });
      } else {
        generatedLines.push({
          accountNumber: balance.accountNumber,
          debitAmount: normalizeSignedMoney(0 - balance.balanceAmount),
          sourceId
        });
      }
    }

    if (sourceNetBalanceAmount > 0) {
      generatedLines.push({
        accountNumber: targetAccountNumber,
        debitAmount: sourceNetBalanceAmount,
        sourceId
      });
    } else if (sourceNetBalanceAmount < 0) {
      generatedLines.push({
        accountNumber: targetAccountNumber,
        creditAmount: normalizeSignedMoney(0 - sourceNetBalanceAmount),
        sourceId
      });
    }

    return {
      lines: normalizeVatClearingLineInputs({
        companyId,
        lines: generatedLines,
        sourceId
      }),
      capturedBalances,
      sourceNetBalanceAmount
    };
  }

  function summarizePostedAccountBalances({
    companyId,
    fromDate = null,
    toDate = null,
    accountClasses = null,
    accountNumbers = null,
    excludeSourceTypes = []
  }) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const accountClassSet = Array.isArray(accountClasses) && accountClasses.length > 0
      ? new Set(accountClasses.map((value) => requireText(String(value), "account_class_required")))
      : null;
    const accountNumberSet = Array.isArray(accountNumbers) && accountNumbers.length > 0
      ? new Set(accountNumbers.map((value) => normalizeAccountNumber(value)))
      : null;
    const excludedSourceTypes = new Set(
      (excludeSourceTypes || []).map((value) => assertPostingSourceType(requireText(value, "posting_source_type_required")))
    );
    const grouped = new Map();

    for (const entry of state.journalEntries.values()) {
      if (entry.companyId !== resolvedCompanyId || entry.status !== "posted") {
        continue;
      }
      if (fromDate && entry.journalDate < fromDate) {
        continue;
      }
      if (toDate && entry.journalDate > toDate) {
        continue;
      }
      if (excludedSourceTypes.has(entry.sourceType)) {
        continue;
      }
      for (const line of requireJournalLines(entry.journalEntryId)) {
        const account = state.accounts.get(line.accountId) || {
          accountNumber: line.accountNumber,
          accountName: line.accountName || `Account ${line.accountNumber}`,
          accountClass: String(line.accountNumber).slice(0, 1)
        };
        if (accountClassSet && !accountClassSet.has(account.accountClass)) {
          continue;
        }
        if (accountNumberSet && !accountNumberSet.has(account.accountNumber)) {
          continue;
        }
        const existing = grouped.get(account.accountNumber) || {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountClass: account.accountClass,
          balanceAmount: 0
        };
        existing.balanceAmount = normalizeSignedMoney(
          Number(existing.balanceAmount || 0) + Number(line.debitAmount || 0) - Number(line.creditAmount || 0)
        );
        grouped.set(account.accountNumber, existing);
      }
    }

    return [...grouped.values()]
      .filter((candidate) => candidate.balanceAmount !== 0)
      .sort((left, right) => left.accountNumber.localeCompare(right.accountNumber))
      .map((candidate) => Object.freeze(copy(candidate)));
  }

  function normalizeOpeningBalanceLineInputs({ companyId, lines, sourceId }) {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw httpError(400, "opening_balance_lines_required", "Opening balance requires at least two lines.");
    }
    const normalizedLines = lines.map((line) => {
      const accountNumber = normalizeAccountNumber(line.accountNumber);
      const account = requireAccount(companyId, accountNumber);
      if (!["1", "2"].includes(account.accountClass)) {
        throw httpError(
          409,
          "opening_balance_profit_loss_account_forbidden",
          `Opening balance line ${account.accountNumber} must use a balance-sheet account class (1-2).`
        );
      }
      const debitAmount = normalizeMoney(line.debitAmount || 0);
      const creditAmount = normalizeMoney(line.creditAmount || 0);
      if (!isPositiveMoney(debitAmount) && !isPositiveMoney(creditAmount)) {
        throw httpError(400, "opening_balance_line_amount_required", "Each opening balance line requires a debit or credit amount.");
      }
      if (isPositiveMoney(debitAmount) && isPositiveMoney(creditAmount)) {
        throw httpError(400, "opening_balance_line_single_sided_required", "Each opening balance line must be either debit or credit.");
      }
      return Object.freeze({
        accountNumber,
        debitAmount,
        creditAmount,
        dimensionJson: copy(line.dimensionJson || {}),
        sourceType: "HISTORICAL_IMPORT",
        sourceId: requireText(line.sourceId || sourceId, "source_id_required")
      });
    });
    const totals = calculateInputLineTotals(normalizedLines);
    if (totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "opening_balance_unbalanced", "Opening balance lines must balance debit and credit exactly.");
    }
    return Object.freeze(normalizedLines);
  }

  function normalizeYearEndTransferLineInputs({ companyId, lines, sourceId }) {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw httpError(400, "year_end_transfer_lines_required", "Year-end transfer requires at least two lines.");
    }
    const normalizedLines = lines.map((line) => {
      const account = requireAccount(companyId, line.accountNumber);
      const debitAmount = normalizeSignedMoney(line.debitAmount || 0);
      const creditAmount = normalizeSignedMoney(line.creditAmount || 0);
      if (debitAmount === 0 && creditAmount === 0) {
        throw httpError(400, "year_end_transfer_line_amount_required", "Each year-end transfer line requires a debit or credit amount.");
      }
      if (debitAmount > 0 && creditAmount > 0) {
        throw httpError(400, "year_end_transfer_line_single_sided_required", "Each year-end transfer line must be either debit or credit.");
      }
      return Object.freeze({
        accountNumber: account.accountNumber,
        debitAmount,
        creditAmount,
        dimensionJson: copy(line.dimensionJson || {}),
        sourceType: "YEAR_END_TRANSFER",
        sourceId: requireText(line.sourceId || sourceId, "line_source_id_required")
      });
    });
    const totals = calculateInputLineTotals(normalizedLines);
    if (totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "year_end_transfer_unbalanced", "Year-end transfer lines must balance debit and credit exactly.");
    }
    return Object.freeze(normalizedLines);
  }

  function normalizeVatClearingLineInputs({ companyId, lines, sourceId }) {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw httpError(400, "vat_clearing_lines_required", "VAT clearing requires at least two lines.");
    }
    const normalizedLines = lines.map((line) => {
      const account = requireAccount(companyId, line.accountNumber);
      const debitAmount = normalizeSignedMoney(line.debitAmount || 0);
      const creditAmount = normalizeSignedMoney(line.creditAmount || 0);
      if (debitAmount === 0 && creditAmount === 0) {
        throw httpError(400, "vat_clearing_line_amount_required", "Each VAT clearing line requires a debit or credit amount.");
      }
      if (debitAmount > 0 && creditAmount > 0) {
        throw httpError(400, "vat_clearing_line_single_sided_required", "Each VAT clearing line must be either debit or credit.");
      }
      return Object.freeze({
        accountNumber: account.accountNumber,
        debitAmount,
        creditAmount,
        dimensionJson: copy(line.dimensionJson || {}),
        sourceType: "VAT_CLEARING",
        sourceId: requireText(line.sourceId || sourceId, "line_source_id_required")
      });
    });
    const totals = calculateInputLineTotals(normalizedLines);
    if (totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "vat_clearing_unbalanced", "VAT clearing lines must balance debit and credit exactly.");
    }
    return Object.freeze(normalizedLines);
  }

  function normalizeDepreciationLineInputs({ companyId, lines, sourceId }) {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw httpError(400, "depreciation_lines_required", "Depreciation requires at least two lines.");
    }
    const normalizedLines = lines.map((line) => {
      const account = requireAccount(companyId, line.accountNumber);
      const debitAmount = normalizeSignedMoney(line.debitAmount || 0);
      const creditAmount = normalizeSignedMoney(line.creditAmount || 0);
      if (debitAmount === 0 && creditAmount === 0) {
        throw httpError(400, "depreciation_line_amount_required", "Each depreciation line requires a debit or credit amount.");
      }
      if (debitAmount > 0 && creditAmount > 0) {
        throw httpError(400, "depreciation_line_single_sided_required", "Each depreciation line must be either debit or credit.");
      }
      return Object.freeze({
        accountNumber: account.accountNumber,
        debitAmount,
        creditAmount,
        dimensionJson: copy(line.dimensionJson || {}),
        sourceType: "ASSET_DEPRECIATION",
        sourceId: requireText(line.sourceId || sourceId, "line_source_id_required")
      });
    });
    const totals = calculateInputLineTotals(normalizedLines);
    if (totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "depreciation_unbalanced", "Depreciation lines must balance debit and credit exactly.");
    }
    return Object.freeze(normalizedLines);
  }

  function normalizeAccrualLineInputs({ companyId, lines, sourceId }) {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw httpError(400, "accrual_lines_required", "Accrual requires at least two lines.");
    }
    const normalizedLines = lines.map((line) => {
      const account = requireAccount(companyId, line.accountNumber);
      const debitAmount = normalizeSignedMoney(line.debitAmount || 0);
      const creditAmount = normalizeSignedMoney(line.creditAmount || 0);
      if (debitAmount === 0 && creditAmount === 0) {
        throw httpError(400, "accrual_line_amount_required", "Each accrual line requires a debit or credit amount.");
      }
      if (debitAmount > 0 && creditAmount > 0) {
        throw httpError(400, "accrual_line_single_sided_required", "Each accrual line must be either debit or credit.");
      }
      return Object.freeze({
        accountNumber: account.accountNumber,
        debitAmount,
        creditAmount,
        dimensionJson: copy(line.dimensionJson || {}),
        sourceType: "PERIOD_ACCRUAL",
        sourceId: requireText(line.sourceId || sourceId, "line_source_id_required")
      });
    });
    const totals = calculateInputLineTotals(normalizedLines);
    if (totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "accrual_unbalanced", "Accrual lines must balance debit and credit exactly.");
    }
    return Object.freeze(normalizedLines);
  }

  function isVatClearingSourceAccountNumber(accountNumber) {
    const numeric = Number(normalizeAccountNumber(accountNumber));
    return Number.isInteger(numeric) && numeric >= 2610 && numeric <= 2640;
  }

  function calculateInputLineTotals(lines) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      totalDebit = normalizeMoney(totalDebit + normalizeMoney(line.debitAmount || 0));
      totalCredit = normalizeMoney(totalCredit + normalizeMoney(line.creditAmount || 0));
    }
    return Object.freeze({
      totalDebit,
      totalCredit
    });
  }

  function findVoucherSeries(runtimeState, companyId, seriesCode) {
    const normalizedCode = normalizeSeriesCode(seriesCode, "voucher_series_code_required");
    const voucherSeriesId = runtimeState.voucherSeriesIdsByCompanyCode.get(toCompanyScopedKey(companyId, normalizedCode));
    return voucherSeriesId ? runtimeState.voucherSeries.get(voucherSeriesId) : null;
  }

  function requireVoucherSeries(companyId, seriesCode) {
    const voucherSeries = findVoucherSeries(state, companyId, seriesCode);
    if (!voucherSeries) {
      const normalizedCode = normalizeSeriesCode(seriesCode, "voucher_series_code_required");
      throw httpError(404, "voucher_series_not_found", `Voucher series ${normalizedCode} was not found for the company.`);
    }
    return voucherSeries;
  }

  function ensureVoucherSeriesUsable(voucherSeries, includePaused) {
    if (!voucherSeries) {
      throw httpError(404, "voucher_series_not_found", "Voucher series was not found.");
    }
    if (voucherSeries.status === "archived" || (!includePaused && voucherSeries.status !== "active")) {
      throw httpError(409, "voucher_series_not_usable", `Voucher series ${voucherSeries.seriesCode} is not available for posting.`);
    }
  }

  function listVoucherSeriesForPurpose({ state: runtimeState, companyId, purposeCode, includePaused = false }) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedPurposeCode = normalizeVoucherSeriesPurposeCode(purposeCode, "voucher_series_purpose_code_required");
    return [...runtimeState.voucherSeries.values()]
      .filter((voucherSeries) => voucherSeries.companyId === resolvedCompanyId)
      .filter((voucherSeries) => Array.isArray(voucherSeries.purposeCodes) && voucherSeries.purposeCodes.includes(resolvedPurposeCode))
      .filter((voucherSeries) => (includePaused ? voucherSeries.status !== "archived" : voucherSeries.status === "active"))
      .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode));
  }

  function ensureVoucherSeriesPurposeAvailability({ state: runtimeState, companyId, purposeCodes, currentVoucherSeriesId = null, status }) {
    if (status !== "active" || purposeCodes.length === 0) {
      return;
    }
    for (const purposeCode of purposeCodes) {
      const conflictingSeries = listVoucherSeriesForPurpose({
        state: runtimeState,
        companyId,
        purposeCode
      }).find((voucherSeries) => voucherSeries.voucherSeriesId !== currentVoucherSeriesId);
      if (conflictingSeries) {
        throw httpError(
          409,
          "voucher_series_purpose_conflict",
          `Purpose ${purposeCode} is already assigned to active series ${conflictingSeries.seriesCode}.`
        );
      }
    }
  }

  function voucherSeriesHasUsage({ companyId, voucherSeriesId }) {
    return [...state.journalEntries.values()].some(
      (entry) => entry.companyId === companyId && entry.voucherSeriesId === voucherSeriesId
    );
  }

  function accountHasUsage({ companyId, accountId }) {
    for (const lines of state.journalLinesByEntryId.values()) {
      if (lines.some((line) => line.companyId === companyId && line.accountId === accountId)) {
        return true;
      }
    }
    return false;
  }

  function dimensionValueHasUsage({ companyId, dimensionType, code }) {
    const resolvedDimensionType = normalizeDimensionType(dimensionType);
    const valueKey = DIMENSION_TYPE_CONFIG[resolvedDimensionType].valueKey;
    for (const lines of state.journalLinesByEntryId.values()) {
      if (lines.some((line) => line.companyId === companyId && line.dimensionJson?.[valueKey] === code)) {
        return true;
      }
    }
    return false;
  }

  function resolveAccountingContext({ companyId, journalDate } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedJournalDate = normalizeDate(journalDate, "journal_date_required");
    const accountingMethodProfile = resolveActiveAccountingMethodProfile(resolvedCompanyId, resolvedJournalDate);
    const fiscalBinding = resolveFiscalBindingForDate(resolvedCompanyId, resolvedJournalDate);
    return {
      accountingMethodProfile,
      fiscalYear: fiscalBinding?.fiscalYear || null,
      fiscalPeriod: fiscalBinding?.fiscalPeriod || null,
      accountingPeriod: fiscalBinding?.accountingPeriod || resolveAccountingPeriod(resolvedCompanyId, resolvedJournalDate)
    };
  }

  function resolveActiveAccountingMethodProfile(companyId, journalDate) {
    if (!accountingMethodPlatform || typeof accountingMethodPlatform.getActiveMethodForDate !== "function") {
      return null;
    }
    return accountingMethodPlatform.getActiveMethodForDate({
      companyId,
      accountingDate: journalDate
    });
  }

  function resolveFiscalBindingForDate(companyId, journalDate) {
    if (!fiscalYearPlatform) {
      return null;
    }
    if (typeof fiscalYearPlatform.getActiveFiscalYearForDate !== "function" || typeof fiscalYearPlatform.getPeriodForDate !== "function") {
      return null;
    }
    const fiscalYear = fiscalYearPlatform.getActiveFiscalYearForDate({
      companyId,
      accountingDate: journalDate
    });
    const fiscalPeriod = fiscalYearPlatform.getPeriodForDate({
      companyId,
      accountingDate: journalDate
    });
    return {
      fiscalYear,
      fiscalPeriod,
      accountingPeriod: upsertAccountingPeriodFromFiscalPeriod({
        companyId,
        fiscalYear,
        fiscalPeriod
      })
    };
  }

  function synchronizeLedgerPeriodsForCompany(companyId) {
    if (!fiscalYearPlatform || typeof fiscalYearPlatform.listFiscalYears !== "function") {
      return;
    }
    const fiscalYears = fiscalYearPlatform.listFiscalYears({
      companyId
    });
    for (const fiscalYear of fiscalYears) {
      for (const fiscalPeriod of fiscalYear.periods || []) {
        upsertAccountingPeriodFromFiscalPeriod({
          companyId,
          fiscalYear,
          fiscalPeriod
        });
      }
    }
  }

  function findAccountingPeriodForDate(companyId, journalDate) {
    return [...state.accountingPeriods.values()].find(
      (candidate) => candidate.companyId === companyId && candidate.startsOn <= journalDate && candidate.endsOn >= journalDate
    );
  }

  function resolveAccountingPeriod(companyId, journalDate) {
    let accountingPeriod = findAccountingPeriodForDate(companyId, journalDate);
    if (!accountingPeriod) {
      const fiscalBinding = resolveFiscalBindingForDate(companyId, journalDate);
      accountingPeriod = fiscalBinding?.accountingPeriod || null;
    }
    if (!accountingPeriod) {
      throw httpError(404, "accounting_period_not_found", "No accounting period covers the supplied journal date.");
    }
    return accountingPeriod;
  }

  function upsertAccountingPeriodFromFiscalPeriod({ companyId, fiscalYear, fiscalPeriod } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedFiscalYearId = requireText(fiscalYear?.fiscalYearId, "fiscal_year_id_required");
    const resolvedFiscalPeriodId = requireText(fiscalPeriod?.periodId, "fiscal_period_id_required");
    const now = nowIso();
    const existing = [...state.accountingPeriods.values()].find(
      (candidate) =>
        candidate.companyId === resolvedCompanyId
        && (
          candidate.fiscalPeriodId === resolvedFiscalPeriodId
          || (candidate.startsOn === fiscalPeriod.startDate && candidate.endsOn === fiscalPeriod.endDate)
        )
    );
    if (existing) {
      existing.startsOn = fiscalPeriod.startDate;
      existing.endsOn = fiscalPeriod.endDate;
      existing.fiscalYearId = resolvedFiscalYearId;
      existing.fiscalPeriodId = resolvedFiscalPeriodId;
      existing.status = mergeAccountingPeriodStatus(existing.status, fiscalPeriod);
      existing.updatedAt = now;
      return existing;
    }

    const accountingPeriod = {
      accountingPeriodId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      startsOn: fiscalPeriod.startDate,
      endsOn: fiscalPeriod.endDate,
      fiscalYearId: resolvedFiscalYearId,
      fiscalPeriodId: resolvedFiscalPeriodId,
      status: mapLedgerStatusFromFiscalPeriod(fiscalPeriod),
      lockReasonCode: null,
      lockedByActorId: null,
      lockedAt: null,
      lockApprovalMode: null,
      lockApprovalActorIds: [],
      lockApprovalEvidenceRef: null,
      lockApprovedByActorId: null,
      lockApprovedByRoleCode: null,
      reopenedByActorId: null,
      reopenedAt: null,
      createdAt: now,
      updatedAt: now
    };
    state.accountingPeriods.set(accountingPeriod.accountingPeriodId, accountingPeriod);
    return accountingPeriod;
  }

  function mergeAccountingPeriodStatus(currentStatus, fiscalPeriod) {
    const fiscalStatus = mapLedgerStatusFromFiscalPeriod(fiscalPeriod);
    if (currentStatus === "hard_closed" || fiscalStatus === "hard_closed") {
      return "hard_closed";
    }
    if (currentStatus === "soft_locked" || fiscalStatus === "soft_locked") {
      return "soft_locked";
    }
    return "open";
  }

  function mapLedgerStatusFromFiscalPeriod(fiscalPeriod) {
    if (!fiscalPeriod) {
      return "open";
    }
    if (fiscalPeriod.closeState === "closed" || fiscalPeriod.lockState === "hard_locked") {
      return "hard_closed";
    }
    if (fiscalPeriod.lockState === "soft_locked") {
      return "soft_locked";
    }
    return "open";
  }

  function requireAccountingPeriod(accountingPeriodId) {
    const accountingPeriod = state.accountingPeriods.get(accountingPeriodId);
    if (!accountingPeriod) {
      throw httpError(404, "accounting_period_not_found", "Accounting period was not found.");
    }
    return accountingPeriod;
  }

  function requireAccountingPeriodForCompany(companyId, accountingPeriodId) {
    const accountingPeriod = requireAccountingPeriod(requireText(accountingPeriodId, "accounting_period_id_required"));
    if (accountingPeriod.companyId !== companyId) {
      throw httpError(404, "accounting_period_not_found", "Accounting period was not found.");
    }
    return accountingPeriod;
  }

  function ensurePeriodAllowsEntryCreation(accountingPeriod, metadataJson, actorId) {
    if (accountingPeriod.status === "open") {
      return;
    }
    if (accountingPeriod.status === "soft_locked" && hasSoftLockOverride(metadataJson)) {
      assertSoftLockOverrideApproval({
        actorId,
        metadataJson
      });
      return;
    }
    throw httpError(409, "period_locked", "Journal entry belongs to a locked accounting period.");
  }

  function ensurePeriodAllowsEntryMutation(accountingPeriod, entry) {
    if (entry.status === "locked_by_period") {
      throw httpError(409, "period_locked", "Journal entry belongs to a locked accounting period.");
    }
    ensurePeriodAllowsEntryCreation(accountingPeriod, entry.metadataJson, entry.actorId);
  }

  function ensureDimensionCatalog(companyId) {
    if (!state.dimensionCatalogsByCompanyId.has(companyId)) {
      state.dimensionCatalogsByCompanyId.set(companyId, {
        companyId,
        catalogVersion: 1,
        projects: createCatalogEntries(DEMO_DIMENSION_CATALOG.projects, "projects"),
        costCenters: createCatalogEntries(DEMO_DIMENSION_CATALOG.costCenters, "costCenters"),
        businessAreas: createCatalogEntries(DEMO_DIMENSION_CATALOG.businessAreas, "businessAreas"),
        serviceLines: createCatalogEntries(DEMO_DIMENSION_CATALOG.serviceLines, "serviceLines"),
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    }
    return state.dimensionCatalogsByCompanyId.get(companyId);
  }

  function toggleEntriesForLockedPeriod({ accountingPeriodId, action }) {
    const now = nowIso();
    const affected = [];
    for (const entry of state.journalEntries.values()) {
      if (entry.accountingPeriodId !== accountingPeriodId) {
        continue;
      }
      if (action === "lock" && (entry.status === "draft" || entry.status === "approved_for_post")) {
        entry.metadataJson.lockedByPeriodPreviousState = entry.status;
        entry.status = "locked_by_period";
        entry.updatedAt = now;
        affected.push(entry);
      }
      if (action === "unlock" && entry.status === "locked_by_period") {
        const previousState = entry.metadataJson.lockedByPeriodPreviousState === "approved_for_post" ? "approved_for_post" : "draft";
        delete entry.metadataJson.lockedByPeriodPreviousState;
        entry.status = previousState;
        entry.updatedAt = now;
        affected.push(entry);
      }
    }
    return affected;
  }

  function resolveCorrectionTargetDate({ companyId, originalEntry, requestedJournalDate }) {
    const originalPeriod = requireAccountingPeriod(originalEntry.accountingPeriodId);
    if (requestedJournalDate) {
      const resolvedJournalDate = normalizeDate(requestedJournalDate, "journal_date_required");
      const targetPeriod = resolveAccountingPeriod(companyId, resolvedJournalDate);
      if (originalPeriod.status === "hard_closed" && targetPeriod.accountingPeriodId === originalPeriod.accountingPeriodId) {
        throw httpError(
          409,
          "period_hard_closed_requires_next_open_period",
          "Corrections for hard-closed periods must be posted in the next open period unless the period is reopened."
        );
      }
      return {
        journalDate: resolvedJournalDate,
        targetPeriod,
        originalPeriodUntouched: targetPeriod.accountingPeriodId !== originalPeriod.accountingPeriodId
      };
    }

    if (originalPeriod.status === "hard_closed") {
      const targetPeriod = findNextOpenAccountingPeriod(companyId, originalPeriod.endsOn);
      return {
        journalDate: targetPeriod.startsOn,
        targetPeriod,
        originalPeriodUntouched: true
      };
    }

    return {
      journalDate: originalEntry.journalDate,
      targetPeriod: originalPeriod,
      originalPeriodUntouched: false
    };
  }

  function findNextOpenAccountingPeriod(companyId, afterDate) {
    const candidate = [...state.accountingPeriods.values()]
      .filter((period) => period.companyId === companyId && period.status === "open" && period.startsOn > afterDate)
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn))[0];
    if (!candidate) {
      throw httpError(409, "next_open_period_not_found", "No next open accounting period was found for the correction.");
    }
    return candidate;
  }

  function requireJournalEntry(companyId, journalEntryId) {
    const entry = state.journalEntries.get(requireText(journalEntryId, "journal_entry_id_required"));
    if (!entry || entry.companyId !== companyId) {
      throw httpError(404, "journal_entry_not_found", "Journal entry was not found.");
    }
    return entry;
  }

  function requireJournalLines(journalEntryId) {
    const lines = state.journalLinesByEntryId.get(journalEntryId);
    if (!lines || lines.length === 0) {
      throw httpError(400, "journal_lines_missing", "Journal entry has no lines.");
    }
    return lines;
  }

  function validateLines(entry, lines) {
    if (lines.length < 2) {
      throw httpError(400, "journal_lines_invalid", "Journal entries require at least two lines.");
    }

    for (const line of lines) {
      const account = requireAccount(entry.companyId, line.accountNumber);
      if (!isPositiveMoney(line.debitAmount) && !isPositiveMoney(line.creditAmount)) {
        throw httpError(400, "journal_line_amount_required", "Each journal line requires a debit or credit amount.");
      }
      if (isPositiveMoney(line.debitAmount) && isPositiveMoney(line.creditAmount)) {
        throw httpError(400, "journal_line_single_sided_required", "Each journal line must be either debit or credit.");
      }
      if (line.currencyCode !== entry.accountingCurrencyCode) {
        throw httpError(400, "journal_line_accounting_currency_invalid", "Journal lines must be stored in the company accounting currency.");
      }
      if (line.originalCurrencyCode && line.originalCurrencyCode !== entry.accountingCurrencyCode && !(Number(line.exchangeRate) > 0)) {
        throw httpError(400, "journal_line_exchange_rate_required", "Foreign-currency lines require a positive exchange rate.");
      }
      ensureRequiredDimensions({
        account,
        catalog: ensureDimensionCatalog(entry.companyId),
        companyId: entry.companyId,
        accountNumber: line.accountNumber,
        dimensionJson: line.dimensionJson,
        sourceType: line.sourceType,
        metadataJson: entry.metadataJson
      });
    }

    const totals = calculateTotals(lines);
    if (totals.totalDebit <= 0 || totals.totalCredit <= 0 || totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "journal_entry_unbalanced", "Journal entry must balance debit and credit exactly.");
    }
    entry.totalDebit = totals.totalDebit;
    entry.totalCredit = totals.totalCredit;
  }

  function normalizeJournalLines({
    companyId,
    journalEntryId,
    actorId,
    sourceType,
    sourceId,
    entryCurrencyCode,
    accountingCurrencyCode,
    metadataJson,
    dimensionCatalogVersion,
    lines
  }) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw httpError(400, "journal_lines_required", "Journal entry lines are required.");
    }

    const catalog = ensureDimensionCatalog(companyId);
    return lines.map((line, index) => {
      const account = requireAccount(companyId, line.accountNumber);
      const lineSourceType = line.sourceType ? assertPostingSourceType(line.sourceType) : sourceType;
      const originalDebitAmount = normalizeMoney(line.debitAmount || 0);
      const originalCreditAmount = normalizeMoney(line.creditAmount || 0);
      const originalCurrencyCode = normalizeCurrencyCode(line.currencyCode || entryCurrencyCode || accountingCurrencyCode);
      const exchangeRate = line.exchangeRate == null ? null : normalizeRate(line.exchangeRate);
      const functionalDebitAmount = line.functionalDebitAmount == null ? null : normalizeMoney(line.functionalDebitAmount);
      const functionalCreditAmount = line.functionalCreditAmount == null ? null : normalizeMoney(line.functionalCreditAmount);
      if (originalCurrencyCode !== accountingCurrencyCode && exchangeRate == null) {
        throw httpError(400, "journal_line_exchange_rate_required", "Foreign-currency lines require a positive exchange rate.");
      }
      const debitAmount =
        functionalDebitAmount != null
          ? functionalDebitAmount
          : originalCurrencyCode === accountingCurrencyCode
            ? originalDebitAmount
            : normalizeMoney(originalDebitAmount * exchangeRate);
      const creditAmount =
        functionalCreditAmount != null
          ? functionalCreditAmount
          : originalCurrencyCode === accountingCurrencyCode
            ? originalCreditAmount
            : normalizeMoney(originalCreditAmount * exchangeRate);
      const dimensionJson = normalizeDimensionJson({
        account,
        catalog,
        companyId,
        accountNumber: account.accountNumber,
        dimensionJson: line.dimensionJson || {},
        sourceType: lineSourceType,
        metadataJson
      });
      return {
        journalLineId: crypto.randomUUID(),
        journalEntryId,
        companyId,
        lineNumber: index + 1,
        accountId: account.accountId,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountVersion: account.governanceVersion || 1,
        debitAmount,
        creditAmount,
        currencyCode: accountingCurrencyCode,
        exchangeRate,
        originalCurrencyCode: originalCurrencyCode !== accountingCurrencyCode ? originalCurrencyCode : null,
        originalDebitAmount: originalCurrencyCode !== accountingCurrencyCode ? originalDebitAmount : null,
        originalCreditAmount: originalCurrencyCode !== accountingCurrencyCode ? originalCreditAmount : null,
        dimensionJson,
        dimensionCatalogVersion: dimensionCatalogVersion || 1,
        sourceType: lineSourceType,
        sourceId: requireText(line.sourceId || sourceId, "line_source_id_required"),
        actorId,
        createdAt: nowIso()
      };
    });
  }

  function requireAccount(companyId, accountNumber) {
    const key = toCompanyScopedKey(companyId, requireText(accountNumber, "account_number_required"));
    const accountId = state.accountIdsByCompanyNumber.get(key);
    if (!accountId) {
      throw httpError(404, "account_not_found", `Account ${accountNumber} was not found for the company.`);
    }
    const account = state.accounts.get(accountId);
    if (!account || account.status !== "active") {
      throw httpError(409, "ledger_account_not_active", `Ledger account ${accountNumber} is not active for new postings.`);
    }
    return account;
  }

  function presentJournalEntry(entry) {
    const lines = (state.journalLinesByEntryId.get(entry.journalEntryId) || []).map(copy);
    return copy({
      ...entry,
      accountingCurrencyCode: entry.accountingCurrencyCode || entry.currencyCode || DEFAULT_LEDGER_CURRENCY,
      originalCurrencyCode: entry.originalCurrencyCode || null,
      fiscalYearId: entry.fiscalYearId || null,
      fiscalPeriodId: entry.fiscalPeriodId || null,
      accountingMethodProfileId: entry.accountingMethodProfileId || null,
      lines
    });
  }

  function pushAudit(event) {
    state.auditEvents.push(
      createAuditEnvelopeFromLegacyEvent({
        clock,
        auditClass: "ledger_action",
        event
      })
    );
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

function seedDemoState(state, clock) {
  const now = new Date(clock()).toISOString();
  const catalogVersion = getAccountCatalogVersion(DEFAULT_CHART_TEMPLATE_ID);
  state.accountingCurrencyProfilesByCompanyId.set(DEMO_LEDGER_COMPANY_ID, {
    accountingCurrencyProfileId: crypto.randomUUID(),
    companyId: DEMO_LEDGER_COMPANY_ID,
    accountingCurrencyCode: DEFAULT_LEDGER_CURRENCY,
    reportingCurrencyCode: DEFAULT_LEDGER_CURRENCY,
    profileVersion: 1,
    sourceCode: "demo_seed",
    createdAt: now,
    updatedAt: now
  });
  for (let month = 0; month < 12; month += 1) {
    const startsOn = new Date(Date.UTC(2026, month, 1)).toISOString().slice(0, 10);
    const endsOn = new Date(Date.UTC(2026, month + 1, 0)).toISOString().slice(0, 10);
    const accountingPeriod = {
      accountingPeriodId: crypto.randomUUID(),
      companyId: DEMO_LEDGER_COMPANY_ID,
      startsOn,
      endsOn,
      fiscalYearId: null,
      fiscalPeriodId: null,
      status: "open",
      lockReasonCode: null,
      lockedByActorId: null,
      lockedAt: null,
      lockApprovalMode: null,
      lockApprovalActorIds: [],
      lockApprovalEvidenceRef: null,
      lockApprovedByActorId: null,
      lockApprovedByRoleCode: null,
      reopenedByActorId: null,
      reopenedAt: null,
      createdAt: now,
      updatedAt: now
    };
    state.accountingPeriods.set(accountingPeriod.accountingPeriodId, accountingPeriod);
  }
  state.dimensionCatalogsByCompanyId.set(DEMO_LEDGER_COMPANY_ID, {
    companyId: DEMO_LEDGER_COMPANY_ID,
    catalogVersion: 1,
    projects: createCatalogEntries(DEMO_DIMENSION_CATALOG.projects, "projects"),
    costCenters: createCatalogEntries(DEMO_DIMENSION_CATALOG.costCenters, "costCenters"),
    businessAreas: createCatalogEntries(DEMO_DIMENSION_CATALOG.businessAreas, "businessAreas"),
    serviceLines: createCatalogEntries(DEMO_DIMENSION_CATALOG.serviceLines, "serviceLines"),
    createdAt: now,
    updatedAt: now
  });
  seedChartTemplateAccounts(state, DEMO_LEDGER_COMPANY_ID, catalogVersion, now, "demo_seed");
  seedDefaultVoucherSeries(state, DEMO_LEDGER_COMPANY_ID, now, "demo_seed");
}

function seedChartTemplateAccounts(state, companyId, catalogVersion, now, changeReasonCode) {
  for (const definition of catalogVersion.accounts) {
    const key = toCompanyScopedKey(companyId, definition.accountNumber);
    if (state.accountIdsByCompanyNumber.has(key)) {
      continue;
    }
    const account = {
      accountId: crypto.randomUUID(),
      companyId,
      accountNumber: definition.accountNumber,
      accountName: definition.accountName,
      accountClass: definition.accountClass,
      status: "active",
      governanceVersion: 1,
      locked: true,
      systemManaged: true,
      allowManualPosting: true,
      requiredDimensionKeys: [],
      metadataJson: {
        chartTemplateId: catalogVersion.versionId,
        chartTemplateSourceName: catalogVersion.sourceName,
        chartTemplateSourceDocumentName: catalogVersion.sourceDocumentName,
        chartTemplateChecksumAlgorithm: catalogVersion.checksumAlgorithm,
        chartTemplateChecksum: catalogVersion.checksum,
        chartTemplateEffectiveFrom: catalogVersion.effectiveFrom,
        chartTemplatePublishedAt: catalogVersion.publishedAt,
        seedSource: "account_catalog_version",
        chartGovernanceStatus: "published",
        lastChangeReasonCode: changeReasonCode
      },
      createdAt: now,
      updatedAt: now
    };
    state.accounts.set(account.accountId, account);
    state.accountIdsByCompanyNumber.set(key, account.accountId);
  }
}

function seedDefaultVoucherSeries(state, companyId, now, changeReasonCode) {
  for (const seriesCode of DEFAULT_VOUCHER_SERIES_CODES) {
    const key = toCompanyScopedKey(companyId, seriesCode);
    if (state.voucherSeriesIdsByCompanyCode.has(key)) {
      continue;
    }
    const voucherSeries = {
      voucherSeriesId: crypto.randomUUID(),
      companyId,
      seriesCode,
      description: defaultSeriesDescription(seriesCode),
      nextNumber: 1,
      status: "active",
      purposeCodes: defaultSeriesPurposeCodes(seriesCode),
      importedSequencePreservationEnabled: true,
      profileVersion: 1,
      locked: true,
      systemManaged: true,
      changeReasonCode,
      createdAt: now,
      updatedAt: now
    };
    state.voucherSeries.set(voucherSeries.voucherSeriesId, voucherSeries);
    state.voucherSeriesIdsByCompanyCode.set(key, voucherSeries.voucherSeriesId);
  }
}

function appendToIndex(index, key, value) {
  const items = index.get(key) || [];
  items.push(value);
  index.set(key, items);
}

function normalizeReferenceList(values) {
  if (!Array.isArray(values)) {
    return Object.freeze([]);
  }
  const normalizedValues = [...new Set(values.map((value) => normalizeOptionalText(value)).filter(Boolean))];
  return Object.freeze(normalizedValues);
}

function defaultSeriesDescription(seriesCode) {
  const knownDescriptions = {
    A: "Manual journals",
    B: "Customer invoices",
    C: "Customer credit notes",
    D: "Customer payments and allocations",
    E: "Supplier invoices",
    H: "Payroll",
    I: "VAT",
    V: "Automated corrections and reversals",
    W: "Historical imports",
    X: "Audit and revision adjustments",
    Y: "Technical migration reserve",
    Z: "Blocked reserve series"
  };
  return knownDescriptions[seriesCode] || `Voucher series ${seriesCode}`;
}

function defaultSeriesPurposeCodes(seriesCode) {
  return copy(DEFAULT_VOUCHER_SERIES_PURPOSE_MAP[seriesCode] || []);
}

  function requirePostingRecipe(recipeCode) {
  const resolvedRecipeCode = requireText(recipeCode, "posting_recipe_code_required").toUpperCase();
  const recipe = POSTING_RECIPES_BY_CODE.get(resolvedRecipeCode);
  if (!recipe) {
    throw httpError(404, "posting_recipe_not_found", `Posting recipe ${resolvedRecipeCode} is not configured.`);
  }
  return recipe;
}

function createCatalogEntries(values = [], dimensionType) {
  return values.map((value) => ({
    dimensionValueId: crypto.randomUUID(),
    code: value.code,
    label: value.label,
    status: value.status || "active",
    locked: true,
    sourceDomain: "ledger_seed",
    version: 1,
    changeReasonCode: "catalog_seed",
    dimensionType,
    createdAt: null,
    updatedAt: null
  }));
}

function assertPostingSourceType(sourceType) {
  const resolvedSourceType = requireText(sourceType, "source_type_required");
  if (!POSTING_SOURCE_TYPES.includes(resolvedSourceType)) {
    throw httpError(400, "posting_source_type_invalid", `Unsupported posting source type ${resolvedSourceType}.`);
  }
  return resolvedSourceType;
}

function normalizeDate(value, code) {
  const input = requireText(value, code);
  const normalized = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(normalized.getTime())) {
    throw httpError(400, code, "Date is invalid.");
  }
  return normalized.toISOString().slice(0, 10);
}

function addDaysToIsoDate(value, days) {
  const normalized = new Date(`${normalizeDate(value, "date_invalid")}T00:00:00.000Z`);
  normalized.setUTCDate(normalized.getUTCDate() + Number(days || 0));
  return normalized.toISOString().slice(0, 10);
}

function endOfMonth(value) {
  const normalized = new Date(`${normalizeDate(value, "date_invalid")}T00:00:00.000Z`);
  return new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

function advanceMonthlyScheduleDate(value) {
  const normalized = new Date(`${normalizeDate(value, "date_invalid")}T00:00:00.000Z`);
  return new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() + 2, 0)).toISOString().slice(0, 10);
}

function normalizeSeriesCode(value, code) {
  const normalized = requireText(value, code).toUpperCase();
  if (!/^[A-Z0-9_-]{1,20}$/.test(normalized)) {
    throw httpError(400, code, "Series code must be 1-20 characters using A-Z, 0-9, underscore or hyphen.");
  }
  return normalized;
}

function normalizeVoucherSeriesDescription(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw httpError(400, "voucher_series_description_required", "Voucher series description is required.");
  }
  return normalized;
}

function normalizeVoucherSeriesStatus(value) {
  const normalized = requireText(value, "voucher_series_status_required");
  if (!VOUCHER_SERIES_STATUSES.includes(normalized)) {
    throw httpError(400, "voucher_series_status_invalid", `Unsupported voucher series status ${normalized}.`);
  }
  return normalized;
}

function normalizeVoucherSeriesPurposeCode(value, code = "voucher_series_purpose_code_required") {
  const normalized = requireText(value, code).toUpperCase();
  if (!/^[A-Z0-9_:-]{2,64}$/.test(normalized)) {
    throw httpError(400, code, "Voucher series purpose code format is invalid.");
  }
  return normalized;
}

function normalizeVoucherSeriesPurposeCodes(values) {
  if (!Array.isArray(values)) {
    throw httpError(400, "voucher_series_purpose_codes_invalid", "Voucher series purpose codes must be an array.");
  }
  return [...new Set(values.map((value) => normalizeVoucherSeriesPurposeCode(value)))].sort();
}

function resolveDraftDescription({ sourceType, sourceId, description }) {
  const normalizedDescription = normalizeOptionalText(description);
  if (normalizedDescription) {
    return normalizedDescription;
  }
  return `${requireText(sourceType, "source_type_required")}:${requireText(sourceId, "source_id_required")}`;
}

function resolvePostingIntentDescription({ recipe, sourceType, sourceId, description }) {
  const normalizedDescription = normalizeOptionalText(description);
  if (normalizedDescription) {
    return normalizedDescription;
  }
  return `${requireText(recipe?.recipeCode, "posting_recipe_code_required")}:${requireText(sourceType, "source_type_required")}:${requireText(sourceId, "source_id_required")}`;
}

function assertJournalDescription(entry) {
  if (normalizeOptionalText(entry?.description)) {
    return;
  }
  throw httpError(400, "journal_description_required", "Description is required before a journal can be approved or posted.");
}

function assertJournalPostApproval({ entry, actorId, approvedByActorId, approvedByRoleCode }) {
  if (entry?.sourceType !== "MANUAL_JOURNAL") {
    return;
  }
  assertSeniorFinanceApproval({
    actorId,
    approvedByActorId,
    approvedByRoleCode
  });
  entry.metadataJson = {
    ...(entry.metadataJson || {}),
    postingApprovalApprovedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
    postingApprovalRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required").toLowerCase()
  };
}

function normalizeAccountNumber(value) {
  const normalized = requireText(value, "account_number_required");
  if (!/^[1-8][0-9]{3}$/.test(normalized)) {
    throw httpError(400, "account_number_invalid", "Ledger account numbers must be four digits in BAS-style range 1000-8999.");
  }
  return normalized;
}

function normalizeAccountClass(value) {
  const normalized = requireText(value, "account_class_required");
  if (!/^[1-8]$/.test(normalized)) {
    throw httpError(400, "account_class_invalid", "Ledger account class must be a single digit between 1 and 8.");
  }
  return normalized;
}

function normalizeLedgerAccountStatus(value) {
  const normalized = requireText(value, "ledger_account_status_required");
  if (!LEDGER_ACCOUNT_STATUSES.includes(normalized)) {
    throw httpError(400, "ledger_account_status_invalid", `Unsupported ledger account status ${normalized}.`);
  }
  return normalized;
}

function normalizeDimensionValueStatus(value) {
  const normalized = requireText(value, "dimension_value_status_required");
  if (!DIMENSION_VALUE_STATUSES.includes(normalized)) {
    throw httpError(400, "dimension_value_status_invalid", `Unsupported dimension value status ${normalized}.`);
  }
  return normalized;
}

function normalizeLedgerLabel(value, code) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw httpError(400, code, `${code} is required.`);
  }
  return normalized;
}

function normalizeCode(value, code) {
  const normalized = requireText(value, code)
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (!normalized) {
    throw httpError(400, code, `${code} is required.`);
  }
  return normalized;
}

function normalizeRequiredDimensionKeys(values) {
  if (!Array.isArray(values)) {
    throw httpError(400, "required_dimension_keys_invalid", "Required dimension keys must be an array.");
  }
  return [...new Set(values.map((value) => {
    const normalized = requireText(value, "dimension_key_required");
    if (!DIMENSION_KEYS.includes(normalized)) {
      throw httpError(400, "dimension_key_invalid", `Unsupported ledger dimension ${normalized}.`);
    }
    return normalized;
  }))].sort();
}

function normalizeDimensionType(value) {
  const normalized = requireText(value, "dimension_type_required");
  if (!DIMENSION_TYPES.includes(normalized)) {
    throw httpError(400, "dimension_type_invalid", `Unsupported ledger dimension type ${normalized}.`);
  }
  return normalized;
}

function normalizeDimensionValueCode(value, dimensionType) {
  const resolvedDimensionType = normalizeDimensionType(dimensionType);
  const rawValue = requireText(value, "dimension_value_code_required");
  const normalized = resolvedDimensionType === "projects" ? rawValue : rawValue.toUpperCase();
  const prefix = DIMENSION_TYPE_CONFIG[resolvedDimensionType].codePrefix;
  if (!new RegExp(`^${prefix}-[A-Z0-9_-]{2,32}$`).test(normalized) && resolvedDimensionType !== "projects") {
    throw httpError(400, "dimension_value_code_invalid", `Dimension values for ${resolvedDimensionType} must use ${prefix}-prefixed codes.`);
  }
  if (resolvedDimensionType === "projects" && !/^[a-z0-9_-]{3,64}$/i.test(normalized)) {
    throw httpError(400, "dimension_value_code_invalid", "Project dimension codes must be 3-64 characters.");
  }
  return normalized;
}

function normalizePositiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw httpError(400, code, "Value must be a positive integer.");
  }
  return number;
}

function normalizeCurrencyCode(value) {
  const code = requireText(value, "currency_code_required").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw httpError(400, "currency_code_invalid", "Currency code must be a three-letter ISO-style code.");
  }
  return code;
}

function assertAccountingCurrencyCode(value) {
  const code = normalizeCurrencyCode(value);
  if (!ALLOWED_ACCOUNTING_CURRENCY_CODES.includes(code)) {
    throw httpError(400, "ledger_accounting_currency_invalid", "Accounting currency must be SEK or EUR.");
  }
  return code;
}

function normalizeMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw httpError(400, "money_invalid", "Amounts must be numeric and non-negative.");
  }
  return Number(number.toFixed(2));
}

function normalizeSignedMoney(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    throw httpError(400, "money_invalid", "Amounts must be numeric.");
  }
  return Number(number.toFixed(2));
}

function normalizeRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw httpError(400, "exchange_rate_invalid", "Exchange rate must be a positive number.");
  }
  return Number(number.toFixed(8));
}

function calculateTotals(lines) {
  return {
    totalDebit: Number(lines.reduce((sum, line) => sum + Number(line.debitAmount), 0).toFixed(2)),
    totalCredit: Number(lines.reduce((sum, line) => sum + Number(line.creditAmount), 0).toFixed(2))
  };
}

function assertFxBalanceOrientation(value) {
  const normalizedValue = requireText(value, "fx_balance_orientation_required").toLowerCase();
  if (!FX_BALANCE_ORIENTATIONS.includes(normalizedValue)) {
    throw httpError(400, "fx_balance_orientation_invalid", "FX balance orientation must be asset or liability.");
  }
  return normalizedValue;
}

function normalizeMetadata(metadataJson, importedFlag) {
  const normalized = copy(metadataJson || {});
  normalized.rulepackRefs = normalizeJournalRulepackRefs(normalized.rulepackRefs);
  normalized.providerBaselineRefs = normalizeJournalProviderBaselineRefs(normalized.providerBaselineRefs);
  normalized.decisionSnapshotRefs = normalizeJournalDecisionSnapshotRefs(normalized.decisionSnapshotRefs);
  if (importedFlag && !normalized.importSourceType) {
    normalized.importSourceType = "historical_import";
  }
  if (!normalized.pipelineStage) {
    normalized.pipelineStage = "ledger_posting";
  }
  return normalized;
}

function mergeJournalPinningMetadata(originalMetadata = {}, overrideMetadata = {}) {
  const original = normalizeMetadata(originalMetadata, false);
  const override = normalizeMetadata(overrideMetadata, false);
  return {
    ...original,
    ...override,
    rulepackRefs: mergeUniqueRefs(original.rulepackRefs, override.rulepackRefs, (candidate) => `${candidate.rulepackCode}:${candidate.rulepackVersion}`),
    providerBaselineRefs: mergeUniqueRefs(
      original.providerBaselineRefs,
      override.providerBaselineRefs,
      (candidate) => `${candidate.providerBaselineId || ""}:${candidate.baselineCode || ""}:${candidate.providerBaselineVersion || ""}`
    ),
    decisionSnapshotRefs: mergeUniqueRefs(original.decisionSnapshotRefs, override.decisionSnapshotRefs, (candidate) => candidate.decisionSnapshotId)
  };
}

function normalizeJournalRulepackRefs(values = []) {
  return mergeUniqueRefs([], values, (candidate) => `${candidate.rulepackCode}:${candidate.rulepackVersion}`, (candidate) => ({
    rulepackId: normalizeOptionalText(candidate.rulepackId),
    rulepackCode: requireText(candidate.rulepackCode, "ledger_rulepack_code_required"),
    rulepackVersion: requireText(candidate.rulepackVersion, "ledger_rulepack_version_required"),
    rulepackChecksum: normalizeOptionalText(candidate.rulepackChecksum),
    effectiveDate: normalizeOptionalText(candidate.effectiveDate)
  }));
}

function normalizeJournalProviderBaselineRefs(values = []) {
  return mergeUniqueRefs(
    [],
    values,
    (candidate) => `${candidate.providerBaselineId || ""}:${candidate.baselineCode || candidate.providerBaselineCode}:${candidate.providerBaselineVersion || ""}`,
    (candidate) => ({
      providerBaselineId: normalizeOptionalText(candidate.providerBaselineId),
      providerCode: normalizeOptionalText(candidate.providerCode),
      baselineCode: requireText(candidate.baselineCode || candidate.providerBaselineCode, "ledger_provider_baseline_code_required"),
      providerBaselineVersion: requireText(candidate.providerBaselineVersion, "ledger_provider_baseline_version_required"),
      providerBaselineChecksum: normalizeOptionalText(candidate.providerBaselineChecksum),
      effectiveDate: normalizeOptionalText(candidate.effectiveDate)
    })
  );
}

function normalizeJournalDecisionSnapshotRefs(values = []) {
  return mergeUniqueRefs(
    [],
    values,
    (candidate) => normalizeOptionalText(candidate.decisionSnapshotId) || hashPayload(candidate),
    (candidate) => ({
      decisionSnapshotId: normalizeOptionalText(candidate.decisionSnapshotId) || hashPayload(candidate),
      snapshotTypeCode: requireText(candidate.snapshotTypeCode, "ledger_decision_snapshot_type_required"),
      sourceDomain: normalizeOptionalText(candidate.sourceDomain),
      sourceObjectId: normalizeOptionalText(candidate.sourceObjectId),
      sourceObjectVersion: normalizeOptionalText(candidate.sourceObjectVersion),
      employeeId: normalizeOptionalText(candidate.employeeId),
      employmentId: normalizeOptionalText(candidate.employmentId),
      decisionHash: normalizeOptionalText(candidate.decisionHash),
      rulepackId: normalizeOptionalText(candidate.rulepackId),
      rulepackCode: normalizeOptionalText(candidate.rulepackCode),
      rulepackVersion: normalizeOptionalText(candidate.rulepackVersion),
      rulepackChecksum: normalizeOptionalText(candidate.rulepackChecksum),
      effectiveDate: normalizeOptionalText(candidate.effectiveDate)
    })
  );
}

function mergeUniqueRefs(baseValues = [], overrideValues = [], keyResolver, mapper = (value) => copy(value)) {
  const refs = [];
  const seen = new Set();
  for (const candidate of [...(Array.isArray(baseValues) ? baseValues : []), ...(Array.isArray(overrideValues) ? overrideValues : [])]) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const mapped = mapper(candidate);
    const key = keyResolver(mapped);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push(mapped);
  }
  return refs;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDimensionJson({ account, catalog, companyId, accountNumber, dimensionJson, sourceType, metadataJson }) {
  if (!dimensionJson || typeof dimensionJson !== "object" || Array.isArray(dimensionJson)) {
    throw httpError(400, "dimension_json_invalid", "Dimension data must be an object.");
  }

  const normalized = {};
  for (const key of Object.keys(dimensionJson)) {
    if (!DIMENSION_KEYS.includes(key)) {
      throw httpError(400, "dimension_key_invalid", `Unsupported ledger dimension ${key}.`);
    }
    const value = dimensionJson[key];
    if (value == null || String(value).trim().length === 0) {
      continue;
    }
    normalized[key] = String(value).trim();
  }

  ensureRequiredDimensions({
    account,
    catalog,
    companyId,
    accountNumber,
    dimensionJson: normalized,
    sourceType,
    metadataJson
  });
  return normalized;
}

function ensureRequiredDimensions({ account, catalog, companyId, accountNumber, dimensionJson, sourceType, metadataJson }) {
  if (dimensionJson.projectId) {
    requireDimensionValue(catalog.projects, "projectId", dimensionJson.projectId);
  }
  if (dimensionJson.costCenterCode) {
    requireDimensionValue(catalog.costCenters, "costCenterCode", dimensionJson.costCenterCode);
  }
  if (dimensionJson.businessAreaCode) {
    requireDimensionValue(catalog.businessAreas, "businessAreaCode", dimensionJson.businessAreaCode);
  }
  if (dimensionJson.serviceLineCode) {
    requireDimensionValue(catalog.serviceLines, "serviceLineCode", dimensionJson.serviceLineCode);
  }

  if (requiresProjectDimension({ accountNumber, sourceType, metadataJson }) && !dimensionJson.projectId) {
    throw httpError(400, "project_dimension_required", "Project-cost postings require a project dimension.");
  }

  for (const requiredDimensionKey of account?.requiredDimensionKeys || []) {
    if (!dimensionJson[requiredDimensionKey]) {
      throw httpError(
        400,
        "required_dimension_missing",
        `Ledger account ${account.accountNumber} requires dimension ${requiredDimensionKey} for new postings.`
      );
    }
  }
}

function requireDimensionValue(values, dimensionKey, code) {
  const value = values.find((candidate) => candidate.code === code);
  if (!value || value.status !== "active") {
    throw httpError(400, "dimension_value_not_found", `Dimension ${dimensionKey} value ${code} is not active for the company.`);
  }
}

function requiresProjectDimension({ accountNumber, sourceType, metadataJson }) {
  const dimensionRequiredByContext =
    sourceType === "PROJECT_WIP" || (metadataJson && metadataJson.dimensionRequirementCode === "project_cost");
  if (!dimensionRequiredByContext) {
    return false;
  }
  const normalizedAccountNumber = String(accountNumber || "");
  return /^[4-8]/.test(normalizedAccountNumber);
}

function reverseLines(lines) {
  return buildJournalReversalLineInputs(lines, { sourceTypeOverride: "MANUAL_JOURNAL" });
}

function normalizeFxRevaluationItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, "fx_revaluation_items_required", "FX revaluation batch requires at least one item.");
  }
  const seenItemIds = new Set();
  return items
    .map((item) => {
      const normalizedItemId = requireText(item.itemId, "fx_revaluation_item_id_required");
      if (seenItemIds.has(normalizedItemId)) {
        throw httpError(409, "revaluation_conflict", `FX revaluation item ${normalizedItemId} appears more than once in the batch.`);
      }
      seenItemIds.add(normalizedItemId);
      const carryingFunctionalAmount = normalizeSignedMoney(item.carryingFunctionalAmount);
      const revaluedFunctionalAmount = normalizeSignedMoney(item.revaluedFunctionalAmount);
        return {
          itemId: normalizedItemId,
          itemType: requireText(item.itemType, "fx_revaluation_item_type_required"),
          accountNumber: normalizeAccountNumber(item.accountNumber),
          balanceOrientation: assertFxBalanceOrientation(item.balanceOrientation),
          originalCurrencyCode: normalizeCurrencyCode(item.originalCurrencyCode || DEFAULT_LEDGER_CURRENCY),
          originalAmount: normalizeSignedMoney(item.originalAmount),
          carryingFunctionalAmount,
          revaluedFunctionalAmount,
          revaluationDeltaAmount: normalizeSignedMoney(revaluedFunctionalAmount - carryingFunctionalAmount),
          dimensionJson: copy(item.dimensionJson || {}),
          metadataJson: copy(item.metadataJson || {})
        };
      })
      .filter((item) => item.revaluationDeltaAmount !== 0);
}

function summarizeFxRevaluationItems(items) {
  return {
    itemCount: items.length,
    totalDeltaAmount: normalizeSignedMoney(items.reduce((sum, item) => sum + Number(item.revaluationDeltaAmount || 0), 0))
  };
}

function hasSoftLockOverride(metadataJson) {
  return Boolean(
    metadataJson &&
      typeof metadataJson === "object" &&
      metadataJson.periodLockOverrideApprovedByActorId &&
      metadataJson.periodLockOverrideApprovedByRoleCode &&
      metadataJson.periodLockOverrideReasonCode
  );
}

function assertSoftLockOverrideApproval({ actorId, metadataJson }) {
  assertSeniorFinanceApproval({
    actorId: requireText(actorId, "actor_id_required"),
    approvedByActorId: metadataJson.periodLockOverrideApprovedByActorId,
    approvedByRoleCode: metadataJson.periodLockOverrideApprovedByRoleCode
  });
  requireText(metadataJson.periodLockOverrideReasonCode, "period_lock_override_reason_code_required");
}

function assertLockStatus(status) {
  const resolvedStatus = requireText(status, "accounting_period_status_required");
  if (!LOCKED_PERIOD_STATUSES.includes(resolvedStatus)) {
    throw httpError(400, "accounting_period_status_invalid", `Unsupported accounting period lock status ${resolvedStatus}.`);
  }
  return resolvedStatus;
}

function assertSeniorFinanceApproval({ actorId, approvedByActorId, approvedByRoleCode }) {
  const resolvedApprovedByActorId = normalizeOptionalText(approvedByActorId);
  if (!resolvedApprovedByActorId) {
    throw httpError(400, "dual_control_required", "Dual control requires a second approving actor for this operation.");
  }
  if (resolvedApprovedByActorId === actorId) {
    throw httpError(400, "dual_control_required", "Dual control requires requester and approver to be different actors.");
  }
  const resolvedRoleCode = requireText(approvedByRoleCode, "approved_by_role_code_required").toLowerCase();
  if (!["close_signatory", "finance_manager", "company_admin"].includes(resolvedRoleCode)) {
    throw httpError(400, "senior_finance_role_required", "A senior finance approver is required for this operation.");
  }
}

function resolveHardCloseApproval({
  actorId,
  approvedByActorId,
  approvedByRoleCode,
  approvalMode = null,
  approvalChainActorIds = [],
  approvalEvidenceRef = null
}) {
  const resolvedApprovalMode = normalizeOptionalText(approvalMode);
  if (resolvedApprovalMode === "close_signoff_chain") {
    const resolvedApprovalActorIds = [...new Set(
      (Array.isArray(approvalChainActorIds) ? approvalChainActorIds : [])
        .map((candidate) => normalizeOptionalText(candidate))
        .filter(Boolean)
    )];
    if (resolvedApprovalActorIds.length === 0) {
      throw httpError(400, "approval_chain_actor_required", "Hard close via sign-off chain requires at least one prior approving actor.");
    }
    if (!resolvedApprovalActorIds.some((candidate) => candidate !== actorId)) {
      throw httpError(400, "dual_control_required", "Hard close sign-off chain requires a second actor in the approval chain.");
    }
    return {
      approvalMode: "close_signoff_chain",
      approvalActorIds: resolvedApprovalActorIds,
      approvalEvidenceRef: requireText(approvalEvidenceRef, "approval_evidence_ref_required"),
      approvedByActorId: null,
      approvedByRoleCode: null
    };
  }

  assertSeniorFinanceApproval({ actorId, approvedByActorId, approvedByRoleCode });
  return {
    approvalMode: "direct_approval",
    approvalActorIds: [requireText(approvedByActorId, "approved_by_actor_id_required")],
    approvalEvidenceRef: normalizeOptionalText(approvalEvidenceRef),
    approvedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
    approvedByRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required").toLowerCase()
  };
}

function assertCorrectionType(correctionType) {
  const resolvedCorrectionType = requireText(correctionType, "correction_type_required");
  if (!["delta", "full_reversal", "reversal_and_rebook"].includes(resolvedCorrectionType)) {
    throw httpError(400, "correction_type_invalid", `Unsupported correction type ${resolvedCorrectionType}.`);
  }
  return resolvedCorrectionType;
}

function toCompanyScopedKey(companyId, value) {
  return `${companyId}:${value}`;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function isPositiveMoney(value) {
  return Number(value) > 0;
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

