import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createProviderBaselineRegistry, createRulePackRegistry } from "../../rule-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import {
  normalizeOptionalIsoDate as normalizeOptionalIsoDateKernel,
  normalizeOptionalVatCountryCode as normalizeOptionalVatCountryCodeKernel,
  normalizeOptionalVatNumber as normalizeOptionalVatNumberKernel,
  normalizeRequiredIsoDate as normalizeRequiredIsoDateKernel
} from "../../domain-core/src/validation.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const VAT_DECISION_STATUSES = Object.freeze(["decided", "review_required"]);
export const VAT_REVIEW_QUEUE_STATUSES = Object.freeze(["open", "resolved", "waived"]);
export const VAT_PERIOD_LOCK_STATUSES = Object.freeze(["locked", "unlocked"]);
export const VAT_BOX_AMOUNT_TYPES = Object.freeze(["taxable_base", "output_vat", "input_vat"]);
export const VAT_POSTING_DIRECTIONS = Object.freeze(["debit", "credit"]);

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK"
]);

const REQUIRED_DECISION_FIELDS = Object.freeze([
  "seller_country",
  "buyer_country",
  "supply_type",
  "goods_or_services",
  "invoice_date",
  "currency",
  "line_amount_ex_vat",
  "vat_rate",
  "source_type",
  "source_id",
  "buyer_is_taxable_person",
  "construction_service_flag",
  "import_flag",
  "export_flag",
  "reverse_charge_flag",
  "oss_flag",
  "ioss_flag",
  "tax_date",
  "line_quantity"
]);

const OPTIONAL_DECISION_FIELDS = Object.freeze([
  "credit_note_flag",
  "bad_debt_adjustment_flag",
  "original_vat_decision_id",
  "deduction_ratio",
  "ecb_exchange_rate_to_eur",
  "consignment_value_eur"
]);
const DOMESTIC_OUTPUT_BOX_BY_RATE = Object.freeze({
  "25.00": "10",
  "12.00": "11",
  "6.00": "12"
});
const REVERSE_CHARGE_OUTPUT_BOX_BY_RATE = Object.freeze({
  "25.00": "30",
  "12.00": "31",
  "6.00": "32"
});
const IMPORT_OUTPUT_BOX_BY_RATE = Object.freeze({
  "25.00": "60",
  "12.00": "61",
  "6.00": "62"
});
const DOMESTIC_PURCHASE_CANDIDATE_ALIASES = Object.freeze({
  VAT_SE_DOMESTIC_PURCHASE_25: ["VAT_SE_DOMESTIC_25", "VAT_SE_DOMESTIC_PURCHASE_25"],
  VAT_SE_DOMESTIC_PURCHASE_12: ["VAT_SE_DOMESTIC_12", "VAT_SE_DOMESTIC_PURCHASE_12"],
  VAT_SE_DOMESTIC_PURCHASE_6: ["VAT_SE_DOMESTIC_6", "VAT_SE_DOMESTIC_PURCHASE_6"],
  VAT_SE_DOMESTIC_PURCHASE_0: ["VAT_SE_EXEMPT", "VAT_SE_DOMESTIC_PURCHASE_0"]
});
const VAT_RULE_PACK_CODE = "SE-VAT-CORE";
const VAT_PROVIDER_CODE = "skatteverket_vat";
const VAT_PROVIDER_BASELINE_CODE = "SE-SKATTEVERKET-VAT-API";
const SEEDED_PROVIDER_BASELINES = Object.freeze([
  Object.freeze({
    providerBaselineId: "skatteverket-vat-api-se-2026.1",
    baselineCode: VAT_PROVIDER_BASELINE_CODE,
    providerCode: VAT_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "authority_transport_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "skatteverket-vat-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Skatteverket VAT transport baseline for official dispatch and XML fallback governance."
  })
]);

const VAT_CODE_DEFINITIONS = Object.freeze([
  createVatCodeDefinition("VAT_SE_DOMESTIC_25", "Domestic 25 %", 25, ["05", "10"], "vat_se_domestic_25"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_12", "Domestic 12 %", 12, ["05", "11"], "vat_se_domestic_12"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_6", "Domestic 6 %", 6, ["05", "12"], "vat_se_domestic_6"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_PURCHASE_25", "Domestic purchase 25 %", 25, ["48"], "vat_se_domestic_purchase_25"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_PURCHASE_12", "Domestic purchase 12 %", 12, ["48"], "vat_se_domestic_purchase_12"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_PURCHASE_6", "Domestic purchase 6 %", 6, ["48"], "vat_se_domestic_purchase_6"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_PURCHASE_0", "Domestic purchase 0 %", 0, [], "vat_se_domestic_purchase_0"),
  createVatCodeDefinition("VAT_SE_EXEMPT", "Exempt or zero-rated", 0, ["42"], "vat_se_exempt"),
  createVatCodeDefinition("VAT_SE_RC_BUILD_SELL", "Construction reverse charge sale", 0, ["41"], "vat_se_rc_build_sell"),
  createVatCodeDefinition("VAT_SE_RC_BUILD_PURCHASE", "Construction reverse charge purchase", 25, ["24", "30", "48"], "vat_se_rc_build_purchase"),
  createVatCodeDefinition("VAT_SE_EU_GOODS_B2B", "EU goods B2B sale", 0, ["35"], "vat_se_eu_goods_b2b"),
  createVatCodeDefinition("VAT_SE_EU_SERVICES_B2B", "EU services B2B sale", 0, ["39"], "vat_se_eu_services_b2b"),
  createVatCodeDefinition("VAT_SE_EU_B2C_OSS", "EU B2C OSS", 25, ["OSS"], "vat_se_eu_b2c_oss"),
  createVatCodeDefinition("VAT_SE_EU_B2C_IOSS", "EU B2C IOSS", 25, ["IOSS"], "vat_se_eu_b2c_ioss"),
  createVatCodeDefinition("VAT_SE_EXPORT_GOODS_0", "Export goods", 0, ["36"], "vat_se_export_goods_0"),
  createVatCodeDefinition("VAT_SE_EXPORT_SERVICE_0", "Export service", 0, ["40"], "vat_se_export_service_0"),
  createVatCodeDefinition("VAT_SE_IMPORT_GOODS", "Import goods", 25, ["50", "60", "48"], "vat_se_import_goods"),
  createVatCodeDefinition(
    "VAT_SE_NON_EU_SERVICE_PURCHASE_RC",
    "Non-EU service purchase reverse charge",
    25,
    ["22", "30", "48"],
    "vat_se_non_eu_service_purchase_rc"
  ),
  createVatCodeDefinition("VAT_SE_EU_GOODS_PURCHASE_RC", "EU goods purchase reverse charge", 25, ["20", "30", "48"], "vat_se_eu_goods_purchase_rc"),
  createVatCodeDefinition("VAT_SE_EU_SERVICES_PURCHASE_RC", "EU services purchase reverse charge", 25, ["21", "30", "48"], "vat_se_eu_services_purchase_rc"),
  createVatCodeDefinition(
    "VAT_SE_DOMESTIC_GOODS_PURCHASE_RC",
    "Domestic goods purchase reverse charge",
    25,
    ["23", "30", "48"],
    "vat_se_domestic_goods_purchase_rc"
  ),
  createVatCodeDefinition(
    "VAT_SE_DOMESTIC_SERVICES_PURCHASE_RC",
    "Domestic services purchase reverse charge",
    25,
    ["24", "30", "48"],
    "vat_se_domestic_services_purchase_rc"
  ),
  createVatCodeDefinition("VAT_REVIEW_REQUIRED", "Manual VAT review required", 0, [], "vat_review_required")
]);

const SEEDED_RULE_PACKS = Object.freeze([
  {
    rulePackId: "vat-se-2025.6",
    rulePackCode: VAT_RULE_PACK_CODE,
    domain: "vat",
    jurisdiction: "SE",
    effectiveFrom: "2025-01-01",
    effectiveTo: "2026-01-01",
    version: "2025.6",
    sourceSnapshotDate: "2026-03-21",
    semanticChangeSummary: "Expanded 2025 VAT reporting for OSS/IOSS, periodic statements and declaration snapshots.",
    machineReadableRules: {
      requiredFields: REQUIRED_DECISION_FIELDS,
      optionalFields: OPTIONAL_DECISION_FIELDS,
      reviewQueueCode: "vat_decision_review",
      supportedDecisionCodes: VAT_CODE_DEFINITIONS.map((definition) => definition.vatCode)
    },
    humanReadableExplanation: [
      "Domestic, EU, import, export and reverse-charge scenarios derive declaration boxes and VAT postings from transaction facts.",
      "Credit notes mirror the original VAT decision and missing originals route to manual review."
    ],
    testVectors: [
      { vectorId: "vat-2025-import", decisionCode: "VAT_SE_IMPORT_GOODS" },
      { vectorId: "vat-2025-build-sell", decisionCode: "VAT_SE_RC_BUILD_SELL" },
      { vectorId: "vat-2025-oss", decisionCode: "VAT_SE_EU_B2C_OSS" }
    ],
    migrationNotes: ["4.3 extends historical replay to OSS/IOSS and declaration reporting artifacts."]
  },
  {
    rulePackId: "vat-se-2026.3",
    rulePackCode: VAT_RULE_PACK_CODE,
    domain: "vat",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: "2026.3",
    sourceSnapshotDate: "2026-03-21",
    semanticChangeSummary: "Expanded VAT scenario engine with OSS/IOSS classification, periodic statements and declaration reporting.",
    machineReadableRules: {
      requiredFields: REQUIRED_DECISION_FIELDS,
      optionalFields: OPTIONAL_DECISION_FIELDS,
      reviewQueueCode: "vat_decision_review",
      supportedDecisionCodes: VAT_CODE_DEFINITIONS.map((definition) => definition.vatCode)
    },
    humanReadableExplanation: [
      "Transaction facts determine the VAT code, declaration boxes and VAT posting impact for Sweden, EU, import, export and reverse charge.",
      "When a credit note references an original VAT decision, the original decision is mirrored with negative declaration-box amounts and posting lines."
    ],
    testVectors: [
      { vectorId: "vat-2026-domestic-12", decisionCode: "VAT_SE_DOMESTIC_12" },
      { vectorId: "vat-2026-eu-purchase-rc", decisionCode: "VAT_SE_EU_SERVICES_PURCHASE_RC" },
      { vectorId: "vat-2026-credit-note", decisionCode: "VAT_SE_DOMESTIC_25" },
      { vectorId: "vat-2026-oss", decisionCode: "VAT_SE_EU_B2C_OSS" },
      { vectorId: "vat-2026-ioss", decisionCode: "VAT_SE_EU_B2C_IOSS" }
    ],
    migrationNotes: ["4.3 adds reporting artifacts while preserving earlier packs for replay."]
  }
]);

const VAT_CODE_BY_ID = Object.freeze(
  VAT_CODE_DEFINITIONS.reduce((accumulator, definition) => {
    accumulator[definition.vatCode] = definition;
    return accumulator;
  }, {})
);

const VAT_SCENARIO_BY_CODE = Object.freeze({
  VAT_SE_DOMESTIC_25: { decisionCategory: "domestic_standard_sale", invoiceTextRequirements: [] },
  VAT_SE_DOMESTIC_12: { decisionCategory: "domestic_standard_sale", invoiceTextRequirements: [] },
  VAT_SE_DOMESTIC_6: { decisionCategory: "domestic_standard_sale", invoiceTextRequirements: [] },
  VAT_SE_DOMESTIC_PURCHASE_25: { decisionCategory: "domestic_supplier_charged_purchase", invoiceTextRequirements: [] },
  VAT_SE_DOMESTIC_PURCHASE_12: { decisionCategory: "domestic_supplier_charged_purchase", invoiceTextRequirements: [] },
  VAT_SE_DOMESTIC_PURCHASE_6: { decisionCategory: "domestic_supplier_charged_purchase", invoiceTextRequirements: [] },
  VAT_SE_DOMESTIC_PURCHASE_0: { decisionCategory: "domestic_supplier_charged_purchase", invoiceTextRequirements: [] },
  VAT_SE_EXEMPT: { decisionCategory: "domestic_exempt_sale", invoiceTextRequirements: [] },
  VAT_SE_RC_BUILD_SELL: {
    decisionCategory: "construction_reverse_charge_sale",
    invoiceTextRequirements: ["buyer_vat_number_required", "reverse_charge_invoice_text_required"]
  },
  VAT_SE_RC_BUILD_PURCHASE: { decisionCategory: "construction_reverse_charge_purchase", invoiceTextRequirements: [] },
  VAT_SE_EU_GOODS_B2B: { decisionCategory: "eu_goods_b2b_sale", invoiceTextRequirements: ["buyer_vat_number_required"] },
  VAT_SE_EU_SERVICES_B2B: {
    decisionCategory: "eu_services_b2b_sale",
    invoiceTextRequirements: ["buyer_vat_number_required", "reverse_charge_invoice_text_required"]
  },
  VAT_SE_EU_B2C_OSS: { decisionCategory: "eu_b2c_oss_sale", invoiceTextRequirements: [] },
  VAT_SE_EU_B2C_IOSS: { decisionCategory: "eu_b2c_ioss_sale", invoiceTextRequirements: [] },
  VAT_SE_EXPORT_GOODS_0: { decisionCategory: "export_goods_sale", invoiceTextRequirements: [] },
  VAT_SE_EXPORT_SERVICE_0: { decisionCategory: "export_services_sale", invoiceTextRequirements: [] },
  VAT_SE_IMPORT_GOODS: { decisionCategory: "import_goods_purchase", invoiceTextRequirements: [] },
  VAT_SE_NON_EU_SERVICE_PURCHASE_RC: {
    decisionCategory: "non_eu_service_purchase_reverse_charge",
    invoiceTextRequirements: []
  },
  VAT_SE_EU_GOODS_PURCHASE_RC: { decisionCategory: "eu_goods_purchase_reverse_charge", invoiceTextRequirements: [] },
  VAT_SE_EU_SERVICES_PURCHASE_RC: {
    decisionCategory: "eu_services_purchase_reverse_charge",
    invoiceTextRequirements: []
  },
  VAT_SE_DOMESTIC_GOODS_PURCHASE_RC: {
    decisionCategory: "domestic_goods_purchase_reverse_charge",
    invoiceTextRequirements: []
  },
  VAT_SE_DOMESTIC_SERVICES_PURCHASE_RC: {
    decisionCategory: "domestic_services_purchase_reverse_charge",
    invoiceTextRequirements: []
  }
});

export function createVatPlatform(options = {}) {
  return createVatEngine(options);
}

export function createVatEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  ledgerPlatform = null,
  providerBaselineRegistry = null
} = {}) {
  const ruleRegistry = createRulePackRegistry({
    clock,
    seedRulePacks: SEEDED_RULE_PACKS
  });
  const providerBaselines =
    providerBaselineRegistry || createProviderBaselineRegistry({ clock, seedProviderBaselines: SEEDED_PROVIDER_BASELINES });
  const ledger = ledgerPlatform || null;
  const state = {
    vatCodes: new Map(),
    vatCodeIdsByCompany: new Map(),
    vatDecisions: new Map(),
    vatDecisionIdsByCompany: new Map(),
    vatDecisionIdsByReplayKey: new Map(),
    vatReviewQueueItems: new Map(),
    vatReviewQueueIdsByCompany: new Map(),
    vatPeriodLocks: new Map(),
    vatPeriodLockIdsByCompany: new Map(),
    vatDeclarationRuns: new Map(),
    vatDeclarationRunIdsByCompany: new Map(),
    vatPeriodicStatementRuns: new Map(),
    vatPeriodicStatementRunIdsByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedVatMasterdata(state, clock);
  }

  const engine = {
    vatDecisionStatuses: VAT_DECISION_STATUSES,
    vatReviewQueueStatuses: VAT_REVIEW_QUEUE_STATUSES,
    vatPeriodLockStatuses: VAT_PERIOD_LOCK_STATUSES,
    vatBoxAmountTypes: VAT_BOX_AMOUNT_TYPES,
    vatPostingDirections: VAT_POSTING_DIRECTIONS,
    installVatCatalog,
    listVatCodes,
    listVatRulePacks,
    evaluateVatDecision,
    getVatDecision,
    listVatReviewQueue,
    resolveVatReviewQueueItem,
    getVatDeclarationBasis,
    listVatPeriodLocks,
    lockVatPeriod,
    unlockVatPeriod,
    createVatDeclarationRun,
    getVatDeclarationRun,
    createVatPeriodicStatementRun,
    getVatPeriodicStatementRun,
    summarizeVatDeclarationBoxes,
    snapshotVat,
    exportDurableState,
    importDurableState
  };

  Object.defineProperty(engine, "rulePackGovernance", {
    value: Object.freeze({
      listRulePacks: (filters = {}) => ruleRegistry.listRulePacks({ domain: "vat", jurisdiction: "SE", ...filters }),
      getRulePack: (filters) => ruleRegistry.getRulePack(filters),
      createDraftRulePackVersion: (input) => ruleRegistry.createDraftRulePackVersion(input),
      validateRulePackVersion: (input) => ruleRegistry.validateRulePackVersion(input),
      approveRulePackVersion: (input) => ruleRegistry.approveRulePackVersion(input),
      publishRulePackVersion: (input) => ruleRegistry.publishRulePackVersion(input),
      rollbackRulePackVersion: (input) => ruleRegistry.rollbackRulePackVersion(input),
      listRulePackRollbacks: (filters = {}) => ruleRegistry.listRulePackRollbacks({ domain: "vat", jurisdiction: "SE", ...filters })
    }),
    enumerable: false
  });

  return engine;

  function listVatCodes({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.vatCodeIdsByCompany.get(resolvedCompanyId) || [])
      .map((vatCodeId) => state.vatCodes.get(vatCodeId))
      .filter(Boolean)
      .sort((left, right) => left.vatCode.localeCompare(right.vatCode))
      .map(copy);
  }

  function installVatCatalog({ companyId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const existingVatCodes = listVatCodes({ companyId: resolvedCompanyId });
    if (existingVatCodes.length > 0) {
      return {
        companyId: resolvedCompanyId,
        installedVatCodes: 0,
        totalVatCodes: existingVatCodes.length,
        reviewQueueCode: "vat_decision_review"
      };
    }

    seedVatMasterdata(state, clock, resolvedCompanyId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "vat.catalog.installed",
      entityType: "vat_catalog",
      entityId: resolvedCompanyId,
      explanation: `Installed VAT catalog for ${resolvedCompanyId}.`
    });
    return {
      companyId: resolvedCompanyId,
      installedVatCodes: VAT_CODE_DEFINITIONS.length,
      totalVatCodes: listVatCodes({ companyId: resolvedCompanyId }).length,
      reviewQueueCode: "vat_decision_review"
    };
  }

  function listVatRulePacks({ effectiveDate = null } = {}) {
    const packs = ruleRegistry.listRulePacks({
      domain: "vat",
      jurisdiction: "SE"
    });
    if (!effectiveDate) {
      return packs;
    }
    const resolvedDate = normalizeDate(effectiveDate, "effective_date_invalid");
    return packs.filter((pack) => pack.effectiveFrom <= resolvedDate && (!pack.effectiveTo || pack.effectiveTo > resolvedDate));
  }

  function evaluateVatDecision({
    companyId,
    transactionLine,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const normalizedLine = normalizeTransactionLine(transactionLine);
    const effectiveDate = normalizedLine.tax_date || normalizedLine.invoice_date;
    const blockingPeriodLock = findLockedVatPeriodForDate({
      state,
      companyId: resolvedCompanyId,
      effectiveDate
    });
    if (blockingPeriodLock) {
      throw createError(
        409,
        "vat_period_locked",
        `VAT period ${blockingPeriodLock.fromDate}..${blockingPeriodLock.toDate} is locked and does not allow new VAT decisions.`
      );
    }
    const rulePack = ruleRegistry.resolveRulePack({
      rulePackCode: VAT_RULE_PACK_CODE,
      domain: "vat",
      jurisdiction: "SE",
      effectiveDate
    });
    const replayKey = toReplayKey(resolvedCompanyId, normalizedLine, rulePack.rulePackId);
    const existingDecisionId = state.vatDecisionIdsByReplayKey.get(replayKey);
    if (existingDecisionId) {
      const existingDecision = state.vatDecisions.get(existingDecisionId);
      return {
        vatDecision: copy(existingDecision),
        reviewQueueItem: existingDecision.reviewQueueItemId
          ? copy(state.vatReviewQueueItems.get(existingDecision.reviewQueueItemId))
          : null,
        idempotentReplay: true
      };
    }

    const classification = classifyVatDecision({
      companyId: resolvedCompanyId,
      normalizedLine,
      rulePack,
      state
    });
    const decisionRecord = {
      vatDecisionId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      sourceType: normalizedLine.source_type,
      sourceId: normalizedLine.source_id,
      vatCode: classification.outputs.vatCode,
      decisionCode: classification.decision.decisionCode,
      rulePackId: classification.decision.rulePackId,
      rulePackVersion: rulePack.version,
      sourceSnapshotDate: rulePack.sourceSnapshotDate,
      inputsHash: classification.decision.inputsHash,
      effectiveDate: classification.decision.effectiveDate,
      rulepackRef: buildVatRulepackRef(rulePack, classification.decision.effectiveDate),
      transactionLine: copy(normalizedLine),
      status: classification.decision.needsManualReview ? "review_required" : "decided",
      declarationBoxCodes: classification.outputs.declarationBoxCodes,
      declarationBoxAmounts: classification.outputs.declarationBoxAmounts,
      postingEntries: classification.outputs.postingEntries,
      bookingTemplateCode: classification.outputs.bookingTemplateCode,
      decisionCategory: classification.outputs.decisionCategory,
      invoiceTextRequirements: classification.outputs.invoiceTextRequirements,
      viesStatus: classification.outputs.viesStatus,
      deductionRuleCode: classification.outputs.deductionRuleCode,
      reverseChargeFlag: classification.outputs.reverseChargeFlag,
      ossFlag: classification.outputs.ossFlag,
      importFlag: classification.outputs.importFlag,
      creditNoteFlag: normalizedLine.credit_note_flag === true,
      originalVatDecisionId: normalizedLine.original_vat_decision_id || null,
      outputs: classification.decision.outputs,
      warnings: classification.decision.warnings,
      explanation: classification.decision.explanation,
      reviewQueueCode: classification.reviewQueueCode,
      reviewQueueItemId: null,
      createdByActorId: resolvedActorId,
      createdAt: nowIso()
    };

    let reviewQueueItem = null;
    if (classification.decision.needsManualReview) {
      reviewQueueItem = {
        vatReviewQueueItemId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        sourceType: normalizedLine.source_type,
        sourceId: normalizedLine.source_id,
        inputsHash: classification.decision.inputsHash,
        rulePackId: rulePack.rulePackId,
        effectiveDate,
        reviewReasonCode: classification.reviewReasonCode,
        reviewQueueCode: classification.reviewQueueCode,
        vatCodeCandidate: normalizedLine.vat_code_candidate || null,
        status: "open",
        warnings: classification.decision.warnings,
        explanation: classification.decision.explanation,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.vatReviewQueueItems.set(reviewQueueItem.vatReviewQueueItemId, reviewQueueItem);
      ensureCollection(state.vatReviewQueueIdsByCompany, resolvedCompanyId).push(reviewQueueItem.vatReviewQueueItemId);
      decisionRecord.reviewQueueItemId = reviewQueueItem.vatReviewQueueItemId;
    }

    state.vatDecisions.set(decisionRecord.vatDecisionId, decisionRecord);
    ensureCollection(state.vatDecisionIdsByCompany, resolvedCompanyId).push(decisionRecord.vatDecisionId);
    state.vatDecisionIdsByReplayKey.set(replayKey, decisionRecord.vatDecisionId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: classification.decision.needsManualReview ? "vat.decision.review_required" : "vat.decision.created",
      entityType: "vat_decision",
      entityId: decisionRecord.vatDecisionId,
      explanation: classification.decision.explanation.join("; ")
    });

    return {
      vatDecision: copy(decisionRecord),
      reviewQueueItem: reviewQueueItem ? copy(reviewQueueItem) : null,
      idempotentReplay: false
    };
  }

  function getVatDecision({ companyId, vatDecisionId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const decision = state.vatDecisions.get(requireText(vatDecisionId, "vat_decision_id_required"));
    if (!decision || decision.companyId !== resolvedCompanyId) {
      throw createError(404, "vat_decision_not_found", "VAT decision was not found.");
    }
    return copy(decision);
  }

  function listVatReviewQueue({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.vatReviewQueueIdsByCompany.get(resolvedCompanyId) || [])
      .map((reviewItemId) => state.vatReviewQueueItems.get(reviewItemId))
      .filter(Boolean)
      .filter((item) => (status ? item.status === status : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function resolveVatReviewQueueItem({
    companyId,
    vatReviewQueueItemId,
    vatCode,
    resolutionCode = "manual_vat_resolution",
    resolutionNote = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const reviewQueueItem = requireVatReviewQueueItemForCompany({
      companyId: resolvedCompanyId,
      vatReviewQueueItemId
    });
    if (reviewQueueItem.status !== "open") {
      throw createError(409, "vat_review_queue_item_not_open", "Only open VAT review queue items can be resolved.");
    }

    const vatDecision = requireVatDecisionByReviewQueueItem(reviewQueueItem.vatReviewQueueItemId);
    const blockingPeriodLock = findLockedVatPeriodForDate({
      state,
      companyId: resolvedCompanyId,
      effectiveDate: vatDecision.effectiveDate
    });
    if (blockingPeriodLock) {
      throw createError(
        409,
        "vat_period_locked",
        `VAT period ${blockingPeriodLock.fromDate}..${blockingPeriodLock.toDate} is locked and cannot accept review resolutions.`
      );
    }

    const resolvedVatCode = requireText(vatCode, "vat_code_required").toUpperCase();
    const resolvedOutputs = buildResolvedVatOutputs(vatDecision.transactionLine, resolvedVatCode);
    const now = nowIso();

    vatDecision.vatCode = resolvedVatCode;
    vatDecision.decisionCode = resolvedVatCode;
    vatDecision.status = "decided";
    vatDecision.declarationBoxCodes = resolvedOutputs.declarationBoxCodes;
    vatDecision.declarationBoxAmounts = resolvedOutputs.declarationBoxAmounts;
    vatDecision.postingEntries = resolvedOutputs.postingEntries;
    vatDecision.bookingTemplateCode = resolvedOutputs.bookingTemplateCode;
    vatDecision.decisionCategory = resolvedOutputs.decisionCategory;
    vatDecision.invoiceTextRequirements = resolvedOutputs.invoiceTextRequirements;
    vatDecision.viesStatus = resolvedOutputs.viesStatus;
    vatDecision.deductionRuleCode = resolvedOutputs.deductionRuleCode;
    vatDecision.reverseChargeFlag = resolvedOutputs.reverseChargeFlag;
    vatDecision.ossFlag = resolvedOutputs.ossFlag;
    vatDecision.importFlag = resolvedOutputs.importFlag;
    vatDecision.outputs = resolvedOutputs;
    vatDecision.warnings = [
      {
        code: "manual_vat_resolution_applied",
        message: `Manual VAT resolution ${resolutionCode} applied with VAT code ${resolvedVatCode}.`
      }
    ];
    vatDecision.explanation = [
      ...vatDecision.explanation.filter((entry) => !String(entry).includes("Decision routed to manual review")),
      `manual_resolution_code=${normalizeLowerString(resolutionCode) || "manual_vat_resolution"}`,
      `resolved_vat_code=${resolvedVatCode}`,
      `resolved_by_actor_id=${resolvedActorId}`
    ];
    vatDecision.updatedAt = now;

    reviewQueueItem.status = "resolved";
    reviewQueueItem.resolutionCode = normalizeLowerString(resolutionCode) || "manual_vat_resolution";
    reviewQueueItem.resolutionNote = typeof resolutionNote === "string" && resolutionNote.trim().length > 0 ? resolutionNote.trim() : null;
    reviewQueueItem.resolvedVatCode = resolvedVatCode;
    reviewQueueItem.resolvedVatDecisionId = vatDecision.vatDecisionId;
    reviewQueueItem.resolvedByActorId = resolvedActorId;
    reviewQueueItem.resolvedAt = now;
    reviewQueueItem.updatedAt = now;

    state.vatDecisionIdsByReplayKey.set(
      toReplayKey(resolvedCompanyId, vatDecision.transactionLine, vatDecision.rulePackId),
      vatDecision.vatDecisionId
    );

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "vat.review_queue.resolved",
      entityType: "vat_review_queue_item",
      entityId: reviewQueueItem.vatReviewQueueItemId,
      explanation: `Resolved VAT review queue item ${reviewQueueItem.vatReviewQueueItemId} to ${resolvedVatCode}.`
    });

    return {
      vatDecision: copy(vatDecision),
      reviewQueueItem: copy(reviewQueueItem)
    };
  }

  function getVatDeclarationBasis({ companyId, fromDate, toDate } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedFromDate = normalizeDate(fromDate, "from_date_invalid");
    const resolvedToDate = normalizeDate(toDate, "to_date_invalid");
    assertDateRange(resolvedFromDate, resolvedToDate, "vat_declaration_basis_date_range_invalid");
    return materializeVatDeclarationBasis({
      state,
      ledger,
      providerBaselineRegistry: providerBaselines,
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate
    });
  }

  function listVatPeriodLocks({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.vatPeriodLockIdsByCompany.get(resolvedCompanyId) || [])
      .map((vatPeriodLockId) => state.vatPeriodLocks.get(vatPeriodLockId))
      .filter(Boolean)
      .filter((item) => (status ? item.status === status : true))
      .sort((left, right) => left.fromDate.localeCompare(right.fromDate))
      .map(copy);
  }

  function lockVatPeriod({
    companyId,
    fromDate,
    toDate,
    reasonCode,
    basisSnapshotHash = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedFromDate = normalizeDate(fromDate, "from_date_invalid");
    const resolvedToDate = normalizeDate(toDate, "to_date_invalid");
    assertDateRange(resolvedFromDate, resolvedToDate, "vat_period_lock_date_range_invalid");

    const overlappingLocks = listLockedVatPeriodsForRange({
      state,
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate
    });
    const exactLock = overlappingLocks.find(
      (candidate) => candidate.fromDate === resolvedFromDate && candidate.toDate === resolvedToDate
    );
    if (exactLock) {
      return copy(exactLock);
    }
    if (overlappingLocks.length > 0) {
      throw createError(409, "vat_period_lock_overlap", "VAT period overlaps an already locked VAT declaration period.");
    }

    const basis = buildVatDeclarationBasis({
      state,
      ledger,
      providerBaselineRegistry: providerBaselines,
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate
    });
    if (basis.blockerCodes.length > 0) {
      throw createError(
        409,
        "vat_period_lock_blocked",
        `VAT period cannot be locked while blockers remain: ${basis.blockerCodes.join(", ")}.`
      );
    }
    if (basisSnapshotHash && basisSnapshotHash !== basis.sourceSnapshotHash) {
      throw createError(409, "vat_declaration_basis_stale", "VAT declaration basis snapshot hash no longer matches current state.");
    }

    const now = nowIso();
    const periodLock = {
      vatPeriodLockId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
      status: "locked",
      reasonCode: requireText(reasonCode, "vat_period_lock_reason_required"),
      basisSnapshotHash: basis.sourceSnapshotHash,
      blockerCodes: [],
      createdByActorId: resolvedActorId,
      createdAt: now,
      updatedAt: now,
      unlockedByActorId: null,
      unlockedAt: null,
      unlockReasonCode: null
    };

    state.vatPeriodLocks.set(periodLock.vatPeriodLockId, periodLock);
    ensureCollection(state.vatPeriodLockIdsByCompany, resolvedCompanyId).push(periodLock.vatPeriodLockId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "vat.period.locked",
      entityType: "vat_period_lock",
      entityId: periodLock.vatPeriodLockId,
      explanation: `Locked VAT period ${resolvedFromDate}..${resolvedToDate}.`
    });
    return copy(periodLock);
  }

  function unlockVatPeriod({
    companyId,
    vatPeriodLockId,
    reasonCode,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const periodLock = requireVatPeriodLockForCompany({
      companyId: resolvedCompanyId,
      vatPeriodLockId
    });
    if (periodLock.status === "unlocked") {
      return copy(periodLock);
    }
    const now = nowIso();
    periodLock.status = "unlocked";
    periodLock.unlockedByActorId = resolvedActorId;
    periodLock.unlockedAt = now;
    periodLock.unlockReasonCode = requireText(reasonCode, "vat_period_unlock_reason_required");
    periodLock.updatedAt = now;
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "vat.period.unlocked",
      entityType: "vat_period_lock",
      entityId: periodLock.vatPeriodLockId,
      explanation: `Unlocked VAT period ${periodLock.fromDate}..${periodLock.toDate}.`
    });
    return copy(periodLock);
  }

  function createVatDeclarationRun({
    companyId,
    fromDate,
    toDate,
    actorId = "system",
    correlationId = crypto.randomUUID(),
    previousSubmissionId = null,
    correctionReason = null,
    signer = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedFromDate = normalizeDate(fromDate, "from_date_invalid");
    const resolvedToDate = normalizeDate(toDate, "to_date_invalid");
    assertDateRange(resolvedFromDate, resolvedToDate, "vat_declaration_run_date_range_invalid");
    const basis = buildVatDeclarationBasis({
      state,
      ledger,
      providerBaselineRegistry: providerBaselines,
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate
    });
    if (basis.blockerCodes.length > 0) {
      throw createError(
        409,
        "vat_declaration_basis_blocked",
        `VAT declaration basis is blocked by: ${basis.blockerCodes.join(", ")}.`
      );
    }
    const decisions = collectDecidedVatDecisions({
      state,
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate
    });
    const regularDecisions = decisions.filter((decision) => decision.outputs.reportingChannel === "regular_vat_return");
    const ossDecisions = decisions.filter((decision) => decision.outputs.reportingChannel === "oss");
    const iossDecisions = decisions.filter((decision) => decision.outputs.reportingChannel === "ioss");
    const previousRun = previousSubmissionId
      ? requireVatDeclarationRunForCompany({
          companyId: resolvedCompanyId,
          vatDeclarationRunId: previousSubmissionId
        })
      : null;
    const changes = previousRun
      ? diffDeclarationBoxSummaries(previousRun.declarationBoxSummary || [], basis.declarationBoxSummary)
      : { changedBoxes: [], changedAmounts: [] };
    const run = {
      vatDeclarationRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
      declarationBoxSummary: basis.declarationBoxSummary,
      ossSummary: basis.ossSummary,
      iossSummary: basis.iossSummary,
      ledgerComparison: basis.ledgerComparison,
      previousSubmissionId: previousRun?.vatDeclarationRunId || null,
      correctionReason,
      changedBoxes: changes.changedBoxes,
      changedAmounts: changes.changedAmounts,
      signer: requireText(signer || actorId, "signer_required"),
      submittedAt: nowIso(),
      sourceSnapshotHash: basis.sourceSnapshotHash,
      periodLockId: basis.activePeriodLock?.vatPeriodLockId || null,
      rulepackRefs: copy(basis.rulepackRefs || []),
      providerBaselineRefs: copy(basis.providerBaselineRefs || []),
      decisionSnapshotRefs: copy(basis.decisionSnapshotRefs || [])
    };
    state.vatDeclarationRuns.set(run.vatDeclarationRunId, run);
    ensureCollection(state.vatDeclarationRunIdsByCompany, resolvedCompanyId).push(run.vatDeclarationRunId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "vat.declaration_run.materialized",
      entityType: "vat_declaration_run",
      entityId: run.vatDeclarationRunId,
      explanation: `Materialized VAT declaration run for ${resolvedFromDate}..${resolvedToDate}.`
    });
    return copy(run);
  }

  function getVatDeclarationRun({ companyId, vatDeclarationRunId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const run = state.vatDeclarationRuns.get(requireText(vatDeclarationRunId, "vat_declaration_run_id_required"));
    if (!run || run.companyId !== resolvedCompanyId) {
      throw createError(404, "vat_declaration_run_not_found", "VAT declaration run was not found.");
    }
    return copy(run);
  }

  function createVatPeriodicStatementRun({
    companyId,
    fromDate,
    toDate,
    actorId = "system",
    correlationId = crypto.randomUUID(),
    previousSubmissionId = null,
    correctionReason = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedFromDate = normalizeDate(fromDate, "from_date_invalid");
    const resolvedToDate = normalizeDate(toDate, "to_date_invalid");
    assertDateRange(resolvedFromDate, resolvedToDate, "vat_periodic_statement_run_date_range_invalid");
    const basis = buildVatDeclarationBasis({
      state,
      ledger,
      providerBaselineRegistry: providerBaselines,
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate
    });
    if (basis.blockerCodes.length > 0) {
      throw createError(
        409,
        "vat_periodic_statement_basis_blocked",
        `VAT periodic statement basis is blocked by: ${basis.blockerCodes.join(", ")}.`
      );
    }
    const decisions = collectDecidedVatDecisions({
      state,
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate
    }).filter((decision) => decision.outputs.euListEligible === true);
    const lines = buildPeriodicStatementLines(decisions);
    const previousRun = previousSubmissionId
      ? requireVatPeriodicStatementRunForCompany({
          companyId: resolvedCompanyId,
          vatPeriodicStatementRunId: previousSubmissionId
        })
      : null;
    const providerBaselineRefs =
      previousRun?.providerBaselineRefs?.length > 0
        ? copy(previousRun.providerBaselineRefs)
        : resolveVatProviderBaselineRefs({
            providerBaselineRegistry: providerBaselines,
            effectiveDate: resolvedToDate,
            companyId: resolvedCompanyId,
            sourceObjectType: "vat_periodic_statement_run",
            sourceObjectId: null
          });
    const run = {
      vatPeriodicStatementRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
      lineCount: lines.length,
      lines,
      previousSubmissionId: previousRun?.vatPeriodicStatementRunId || null,
      correctionReason,
      sourceSnapshotHash: basis.sourceSnapshotHash,
      generatedAt: nowIso(),
      generatedByActorId: actorId,
      rulepackRefs: collectVatRulepackRefs(decisions),
      providerBaselineRefs,
      decisionSnapshotRefs: collectVatDecisionSnapshotRefs(decisions)
    };
    state.vatPeriodicStatementRuns.set(run.vatPeriodicStatementRunId, run);
    ensureCollection(state.vatPeriodicStatementRunIdsByCompany, resolvedCompanyId).push(run.vatPeriodicStatementRunId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "vat.periodic_statement.materialized",
      entityType: "vat_periodic_statement_run",
      entityId: run.vatPeriodicStatementRunId,
      explanation: `Materialized periodic statement for ${resolvedFromDate}..${resolvedToDate}.`
    });
    return copy(run);
  }

  function getVatPeriodicStatementRun({ companyId, vatPeriodicStatementRunId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const run = state.vatPeriodicStatementRuns.get(requireText(vatPeriodicStatementRunId, "vat_periodic_statement_run_id_required"));
    if (!run || run.companyId !== resolvedCompanyId) {
      throw createError(404, "vat_periodic_statement_run_not_found", "VAT periodic statement run was not found.");
    }
    return copy(run);
  }

  function summarizeVatDeclarationBoxes({ companyId = null, vatDecisionIds = null } = {}) {
    const decisions = companyId
      ? (state.vatDecisionIdsByCompany.get(companyId) || []).map((decisionId) => state.vatDecisions.get(decisionId)).filter(Boolean)
      : [...state.vatDecisions.values()];
    const filtered = Array.isArray(vatDecisionIds)
      ? decisions.filter((decision) => vatDecisionIds.includes(decision.vatDecisionId))
      : decisions;
    return summarizeDecisionBoxAmounts(filtered);
  }

  function snapshotVat() {
    return copy({
      vatCodes: [...state.vatCodes.values()],
      vatDecisions: [...state.vatDecisions.values()],
      vatReviewQueueItems: [...state.vatReviewQueueItems.values()],
      vatPeriodLocks: [...state.vatPeriodLocks.values()],
      vatDeclarationRuns: [...state.vatDeclarationRuns.values()],
      vatPeriodicStatementRuns: [...state.vatPeriodicStatementRuns.values()],
      vatRulePacks: ruleRegistry.listRulePacks({ domain: "vat", jurisdiction: "SE" }),
      declarationBoxSummary: summarizeDecisionBoxAmounts([...state.vatDecisions.values()]),
      auditEvents: state.auditEvents
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function pushAudit(event) {
    state.auditEvents.push(
      createAuditEnvelopeFromLegacyEvent({
        clock,
        auditClass: "vat_action",
        event
      })
    );
  }

  function requireVatDeclarationRunForCompany({ companyId, vatDeclarationRunId }) {
    const run = state.vatDeclarationRuns.get(requireText(vatDeclarationRunId, "vat_declaration_run_id_required"));
    if (!run || run.companyId !== companyId) {
      throw createError(404, "vat_declaration_run_not_found", "VAT declaration run was not found.");
    }
    return run;
  }

  function requireVatPeriodicStatementRunForCompany({ companyId, vatPeriodicStatementRunId }) {
    const run = state.vatPeriodicStatementRuns.get(
      requireText(vatPeriodicStatementRunId, "vat_periodic_statement_run_id_required")
    );
    if (!run || run.companyId !== companyId) {
      throw createError(404, "vat_periodic_statement_run_not_found", "VAT periodic statement run was not found.");
    }
    return run;
  }

  function requireVatReviewQueueItemForCompany({ companyId, vatReviewQueueItemId }) {
    const item = state.vatReviewQueueItems.get(requireText(vatReviewQueueItemId, "vat_review_queue_item_id_required"));
    if (!item || item.companyId !== companyId) {
      throw createError(404, "vat_review_queue_item_not_found", "VAT review queue item was not found.");
    }
    return item;
  }

  function requireVatDecisionByReviewQueueItem(vatReviewQueueItemId) {
    const decision = [...state.vatDecisions.values()].find((candidate) => candidate.reviewQueueItemId === vatReviewQueueItemId);
    if (!decision) {
      throw createError(404, "vat_decision_not_found", "VAT decision for review queue item was not found.");
    }
    return decision;
  }

  function requireVatPeriodLockForCompany({ companyId, vatPeriodLockId }) {
    const lock = state.vatPeriodLocks.get(requireText(vatPeriodLockId, "vat_period_lock_id_required"));
    if (!lock || lock.companyId !== companyId) {
      throw createError(404, "vat_period_lock_not_found", "VAT period lock was not found.");
    }
    return lock;
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

function classifyVatDecision({ companyId, normalizedLine, rulePack, state }) {
  const missingFields = (rulePack.machineReadableRules.requiredFields || []).filter((field) => isMissingField(normalizedLine[field]));
  if (missingFields.length > 0) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "missing_mandatory_vat_fields",
      warningCode: "missing_mandatory_vat_fields",
      warningMessage: `Missing mandatory VAT fields: ${missingFields.join(", ")}`,
      explanation: [
        `company_id=${companyId}`,
        `rule_pack_id=${rulePack.rulePackId}`,
        `missing_fields=${missingFields.join(",")}`,
        "Decision routed to manual review because mandatory VAT facts are incomplete."
      ]
    });
  }

  if (normalizedLine.credit_note_flag === true) {
    return classifyCreditNoteMirror({ companyId, normalizedLine, rulePack, state });
  }

  if (normalizedLine.bad_debt_adjustment_flag === true) {
    return classifyBadDebtAdjustment({ companyId, normalizedLine, rulePack, state });
  }

  if (normalizedLine.deduction_ratio !== null && (normalizedLine.deduction_ratio < 0 || normalizedLine.deduction_ratio > 1)) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "invalid_deduction_ratio",
      warningCode: "invalid_deduction_ratio",
      warningMessage: "deduction_ratio must be between 0 and 1 when provided.",
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        `deduction_ratio=${normalizedLine.deduction_ratio}`,
        "Decision routed to manual review because deduction ratio is outside the supported interval."
      ]
    });
  }

  const scenario = deriveScenario(normalizedLine);
  if (!scenario.ok) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: scenario.reviewReasonCode,
      warningCode: scenario.reviewReasonCode,
      warningMessage: scenario.warningMessage,
      explanation: [
        `company_id=${companyId}`,
        `rule_pack_id=${rulePack.rulePackId}`,
        `seller_country=${normalizedLine.seller_country}`,
        `buyer_country=${normalizedLine.buyer_country}`,
        `goods_or_services=${normalizedLine.goods_or_services}`,
        scenario.explanation
      ]
    });
  }

  if (!isCompatibleVatCodeCandidate(normalizedLine, scenario.vatCode)) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "candidate_conflicts_with_inputs",
      warningCode: "candidate_conflicts_with_inputs",
      warningMessage: `VAT code candidate ${normalizedLine.vat_code_candidate} conflicts with derived code ${scenario.vatCode}.`,
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        `candidate=${normalizedLine.vat_code_candidate}`,
        `derived=${scenario.vatCode}`,
        "Decision routed to manual review because the VAT code candidate conflicts with transaction facts."
      ]
    });
  }

  if (
    scenario.decisionCategory === "domestic_supplier_charged_purchase" &&
    normalizedLine.deduction_ratio !== null &&
    normalizedLine.deduction_ratio !== 1
  ) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "unsupported_domestic_purchase_deduction_ratio",
      warningCode: "unsupported_domestic_purchase_deduction_ratio",
      warningMessage: "Domestic supplier-charged purchases with partial deduction must be reviewed before posting.",
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        `deduction_ratio=${normalizedLine.deduction_ratio}`,
        "Decision routed to manual review because domestic supplier-charged purchases do not yet support partial deduction auto-booking."
      ]
    });
  }

  const outputs = buildScenarioOutputs(normalizedLine, scenario);
  const explanation = [
    `rule_pack_id=${rulePack.rulePackId}`,
    `vat_code=${scenario.vatCode}`,
    `decision_category=${outputs.decisionCategory}`,
    `seller_country=${normalizedLine.seller_country}`,
    `buyer_country=${normalizedLine.buyer_country}`,
    `goods_or_services=${normalizedLine.goods_or_services}`,
    `vat_rate=${outputs.vatRate}`,
    `box_codes=${outputs.declarationBoxCodes.join(",") || "none"}`
  ];

  const decision = createVatDecision({
    normalizedLine,
    rulePack,
    decisionCode: scenario.vatCode,
    outputs,
    warnings: [],
    explanation,
    needsManualReview: false
  });

  return {
    decision,
    outputs,
    reviewReasonCode: null,
    reviewQueueCode: null
  };
}

function buildReviewDecision({ normalizedLine, rulePack, reviewReasonCode, warningCode, warningMessage, explanation }) {
  const reviewCode = VAT_CODE_BY_ID.VAT_REVIEW_REQUIRED;
  const outputs = {
    vatCode: reviewCode.vatCode,
    decisionCategory: "review_required",
    declarationBoxCodes: [],
    declarationBoxAmounts: [],
    postingEntries: [],
    bookingTemplateCode: reviewCode.bookingTemplateCode,
    invoiceTextRequirements: [],
    viesStatus: resolveViesStatus(normalizedLine),
    deductionRuleCode: resolveDeductionRuleCode(normalizedLine),
    reverseChargeFlag: normalizedLine.reverse_charge_flag === true,
    ossFlag: normalizedLine.oss_flag === true,
    importFlag: normalizedLine.import_flag === true,
    reportingChannel: "regular_vat_return",
    euListEligible: false,
    ossRecord: null,
    iossRecord: null,
    vatRate: 0,
    rateType: reviewCode.rateType
  };
  const decision = createVatDecision({
    normalizedLine,
    rulePack,
    decisionCode: reviewCode.vatCode,
    outputs,
    warnings: [{ code: warningCode, message: warningMessage }],
    explanation,
    needsManualReview: true
  });

  return {
    decision,
    outputs,
    reviewReasonCode,
    reviewQueueCode: rulePack.machineReadableRules.reviewQueueCode || "vat_decision_review"
  };
}

function classifyCreditNoteMirror({ companyId, normalizedLine, rulePack, state }) {
  if (!normalizedLine.original_vat_decision_id) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "missing_original_vat_decision",
      warningCode: "missing_original_vat_decision",
      warningMessage: "Credit note VAT evaluation requires original_vat_decision_id.",
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        "Decision routed to manual review because the credit note does not reference an original VAT decision."
      ]
    });
  }

  const originalDecision = state.vatDecisions.get(normalizedLine.original_vat_decision_id);
  if (!originalDecision || originalDecision.companyId !== companyId) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "original_vat_decision_missing",
      warningCode: "original_vat_decision_missing",
      warningMessage: `Original VAT decision ${normalizedLine.original_vat_decision_id} was not found for credit-note mirroring.`,
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        `original_vat_decision_id=${normalizedLine.original_vat_decision_id}`,
        "Decision routed to manual review because the original VAT decision could not be found."
      ]
    });
  }

  const outputs = {
    ...copy(originalDecision.outputs || {}),
    decisionCategory: "credit_note_mirror",
    declarationBoxAmounts: invertAmounts(originalDecision.outputs?.declarationBoxAmounts || originalDecision.declarationBoxAmounts || []),
    postingEntries: invertAmounts(originalDecision.outputs?.postingEntries || originalDecision.postingEntries || []),
    declarationBoxCodes: uniqueBoxCodes(originalDecision.outputs?.declarationBoxAmounts || originalDecision.declarationBoxAmounts || []),
    invoiceTextRequirements: copy(originalDecision.outputs?.invoiceTextRequirements || originalDecision.invoiceTextRequirements || [])
  };
  const decision = createVatDecision({
    normalizedLine,
    rulePack,
    decisionCode: originalDecision.vatCode,
    outputs,
    warnings: [],
    explanation: [
      `rule_pack_id=${rulePack.rulePackId}`,
      `mirrored_original_vat_decision_id=${normalizedLine.original_vat_decision_id}`,
      `original_vat_code=${originalDecision.vatCode}`,
      "Credit note mirrored the original VAT decision with inverted declaration-box amounts and posting entries."
    ],
    needsManualReview: false
  });

  return {
    decision,
    outputs,
    reviewReasonCode: null,
    reviewQueueCode: null
  };
}

function classifyBadDebtAdjustment({ companyId, normalizedLine, rulePack, state }) {
  if (!normalizedLine.original_vat_decision_id) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "missing_original_vat_decision",
      warningCode: "missing_original_vat_decision",
      warningMessage: "Bad-debt VAT adjustment requires original_vat_decision_id.",
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        "Decision routed to manual review because the bad-debt adjustment does not reference an original VAT decision."
      ]
    });
  }

  const originalDecision = state.vatDecisions.get(normalizedLine.original_vat_decision_id);
  if (!originalDecision || originalDecision.companyId !== companyId) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "original_vat_decision_missing",
      warningCode: "original_vat_decision_missing",
      warningMessage: `Original VAT decision ${normalizedLine.original_vat_decision_id} was not found for bad-debt adjustment.`,
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        `original_vat_decision_id=${normalizedLine.original_vat_decision_id}`,
        "Decision routed to manual review because the original VAT decision could not be found."
      ]
    });
  }

  const originalPostingEntries = originalDecision.outputs?.postingEntries || originalDecision.postingEntries || [];
  const originalDeclarationBoxAmounts =
    originalDecision.outputs?.declarationBoxAmounts || originalDecision.declarationBoxAmounts || [];
  const outputVatAmount = roundMoney(
    originalPostingEntries.reduce(
      (sum, entry) => (entry?.vatEffect === "output_vat" ? sum + Math.abs(Number(entry.amount || 0)) : sum),
      0
    )
  );
  if (outputVatAmount <= 0) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "original_vat_decision_not_output_vat",
      warningCode: "original_vat_decision_not_output_vat",
      warningMessage: "Bad-debt VAT adjustment requires an original decision with output VAT.",
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        `original_vat_decision_id=${normalizedLine.original_vat_decision_id}`,
        "Decision routed to manual review because the original VAT decision does not contain output VAT to reverse."
      ]
    });
  }

  const outputs = {
    ...copy(originalDecision.outputs || {}),
    decisionCategory: "bad_debt_adjustment",
    declarationBoxAmounts: invertAmounts(originalDeclarationBoxAmounts),
    postingEntries: invertAmounts(originalPostingEntries),
    declarationBoxCodes: uniqueBoxCodes(originalDeclarationBoxAmounts),
    invoiceTextRequirements: []
  };
  const decision = createVatDecision({
    normalizedLine,
    rulePack,
    decisionCode: originalDecision.vatCode,
    outputs,
    warnings: [],
    explanation: [
      `rule_pack_id=${rulePack.rulePackId}`,
      `mirrored_original_vat_decision_id=${normalizedLine.original_vat_decision_id}`,
      `original_vat_code=${originalDecision.vatCode}`,
      "Bad-debt VAT adjustment mirrored the original VAT decision with inverted declaration-box amounts and posting entries."
    ],
    needsManualReview: false
  });

  return {
    decision,
    outputs,
    reviewReasonCode: null,
    reviewQueueCode: null
  };
}

function createVatDecision({ normalizedLine, rulePack, decisionCode, outputs, warnings, explanation, needsManualReview }) {
  return {
    decisionCode,
    inputsHash: hashObject(normalizedLine),
    rulePackId: rulePack.rulePackId,
    effectiveDate: normalizedLine.tax_date || normalizedLine.invoice_date,
    outputs,
    warnings,
    explanation,
    needsManualReview,
    generatedAt: new Date().toISOString()
  };
}

function normalizeTransactionLine(transactionLine) {
  const candidate = transactionLine && typeof transactionLine === "object" ? copy(transactionLine) : {};
  const normalized = {};
  for (const field of REQUIRED_DECISION_FIELDS) {
    normalized[field] = normalizeFieldValue(candidate[field]);
  }
  for (const field of OPTIONAL_DECISION_FIELDS) {
    normalized[field] = normalizeFieldValue(candidate[field]);
  }
  normalized.buyer_type = normalizeLowerString(candidate.buyer_type);
  normalized.seller_country = normalizeCountry(candidate.seller_country);
  normalized.seller_vat_registration_country = normalizeCountry(candidate.seller_vat_registration_country);
  normalized.buyer_country = normalizeCountry(candidate.buyer_country);
  normalized.transport_end_country = normalizeCountry(candidate.transport_end_country);
  normalized.goods_or_services = normalizeGoodsOrServices(candidate.goods_or_services);
  normalized.supply_type = normalizeLowerString(candidate.supply_type);
  normalized.supply_subtype = normalizeLowerString(candidate.supply_subtype);
  normalized.invoice_date = normalizeOptionalDate(candidate.invoice_date);
  normalized.delivery_date = normalizeOptionalDate(candidate.delivery_date);
  normalized.tax_date = normalizeOptionalDate(candidate.tax_date);
  normalized.prepayment_date = normalizeOptionalDate(candidate.prepayment_date);
  normalized.currency = normalizeUpperString(candidate.currency);
  normalized.vat_code_candidate = normalizeUpperString(candidate.vat_code_candidate);
  normalized.source_type = normalizeUpperString(candidate.source_type);
  normalized.source_id = typeof candidate.source_id === "string" ? candidate.source_id.trim() : candidate.source_id;
  normalized.project_id = typeof candidate.project_id === "string" ? candidate.project_id.trim() : candidate.project_id;
  normalized.buyer_vat_no = normalizeOptionalVatNumber(candidate.buyer_vat_no, normalized.buyer_country);
  normalized.buyer_vat_number = normalizeOptionalVatNumber(candidate.buyer_vat_number, normalized.buyer_country);
  normalized.buyer_vat_number_status = normalizeVatNumberStatus(candidate.buyer_vat_number_status);
  normalized.invoice_text_code = typeof candidate.invoice_text_code === "string" ? candidate.invoice_text_code.trim() : candidate.invoice_text_code;
  normalized.report_box_code = typeof candidate.report_box_code === "string" ? candidate.report_box_code.trim() : candidate.report_box_code;
  normalized.exemption_reason = typeof candidate.exemption_reason === "string" ? candidate.exemption_reason.trim() : candidate.exemption_reason;
  normalized.line_amount_ex_vat = normalizeOptionalNumber(candidate.line_amount_ex_vat);
  normalized.vat_rate = normalizeOptionalNumber(candidate.vat_rate);
  normalized.tax_rate_candidate = normalizeOptionalNumber(candidate.tax_rate_candidate);
  normalized.line_discount = normalizeOptionalNumber(candidate.line_discount);
  normalized.line_quantity = normalizeOptionalNumber(candidate.line_quantity);
  normalized.import_flag = normalizeOptionalBoolean(candidate.import_flag);
  normalized.export_flag = normalizeOptionalBoolean(candidate.export_flag);
  normalized.reverse_charge_flag = normalizeOptionalBoolean(candidate.reverse_charge_flag);
  normalized.oss_flag = normalizeOptionalBoolean(candidate.oss_flag);
  normalized.ioss_flag = normalizeOptionalBoolean(candidate.ioss_flag);
  normalized.property_related_flag = normalizeOptionalBoolean(candidate.property_related_flag);
  normalized.construction_service_flag = normalizeOptionalBoolean(candidate.construction_service_flag);
  normalized.buyer_is_taxable_person = normalizeOptionalBoolean(candidate.buyer_is_taxable_person);
  normalized.credit_note_flag = normalizeOptionalBoolean(candidate.credit_note_flag);
  normalized.bad_debt_adjustment_flag = normalizeOptionalBoolean(candidate.bad_debt_adjustment_flag);
  normalized.original_vat_decision_id =
    typeof candidate.original_vat_decision_id === "string" ? candidate.original_vat_decision_id.trim() : null;
  normalized.deduction_ratio = normalizeOptionalNumber(candidate.deduction_ratio);
  normalized.ecb_exchange_rate_to_eur = normalizeOptionalNumber(candidate.ecb_exchange_rate_to_eur);
  normalized.consignment_value_eur = normalizeOptionalNumber(candidate.consignment_value_eur);
  normalized.line_uom = typeof candidate.line_uom === "string" ? candidate.line_uom.trim() : candidate.line_uom;
  normalized.region = deriveRegion(normalized.buyer_country);
  return normalized;
}

function seedVatMasterdata(state, clock, companyId = DEMO_COMPANY_ID) {
  const now = new Date(clock()).toISOString();
  state.vatCodeIdsByCompany.set(companyId, []);
  for (const definition of VAT_CODE_DEFINITIONS) {
    const vatCodeId = crypto.randomUUID();
    const record = {
      vatCodeId,
      companyId,
      ...copy(definition),
      createdAt: now,
      updatedAt: now
    };
    state.vatCodes.set(vatCodeId, record);
    state.vatCodeIdsByCompany.get(companyId).push(vatCodeId);
  }
}

function createVatCodeDefinition(vatCode, label, vatRate, declarationBoxCodes, bookingTemplateCode) {
  return {
    vatCode,
    label,
    vatRate,
    rateType: vatRate === 0 ? "zero_or_exempt" : "standard_or_special",
    declarationBoxCodes,
    bookingTemplateCode,
    activeFlag: true
  };
}

function deriveScenario(normalizedLine) {
  const region = normalizedLine.region;
  const goodsOrServices = normalizeGoodsOrServices(normalizedLine.goods_or_services);
  const viesStatus = resolveViesStatus(normalizedLine);
  if (goodsOrServices !== "goods" && goodsOrServices !== "services") {
    return reviewScenario("unsupported_goods_or_services", "goods_or_services must be goods or services.");
  }

  if (normalizedLine.supply_type === "sale") {
    if (normalizedLine.seller_country !== "SE") {
      return reviewScenario("unsupported_seller_country", "VAT engine only supports Swedish selling entities in this phase.");
    }
    if (normalizedLine.construction_service_flag && normalizedLine.reverse_charge_flag === true && normalizedLine.buyer_country === "SE") {
      return acceptScenario("VAT_SE_RC_BUILD_SELL", "construction_reverse_charge_sale", [
        "buyer_vat_number_required",
        "reverse_charge_invoice_text_required"
      ]);
    }
    if (normalizedLine.export_flag === true || region === "NON_EU") {
      return acceptScenario(
        goodsOrServices === "goods" ? "VAT_SE_EXPORT_GOODS_0" : "VAT_SE_EXPORT_SERVICE_0",
        goodsOrServices === "goods" ? "export_goods_sale" : "export_services_sale"
      );
    }
    if (normalizedLine.buyer_country === "SE") {
      if (normalizedLine.reverse_charge_flag === true) {
        return reviewScenario("unsupported_domestic_reverse_charge_sale", "Non-construction domestic reverse-charge sales are not modeled in this phase.");
      }
      if (isExemptLine(normalizedLine)) {
        return acceptScenario("VAT_SE_EXEMPT", "domestic_exempt_sale");
      }
      const domesticCode = domesticCodeFromRate(normalizedLine);
      if (!domesticCode) {
        return reviewScenario("unsupported_domestic_vat_rate", "Domestic sales must resolve to 25, 12, 6 or exempt.");
      }
      return acceptScenario(domesticCode, "domestic_standard_sale");
    }
    if (region === "EU" && normalizedLine.buyer_is_taxable_person === true) {
      if (goodsOrServices === "goods" && !normalizedLine.buyer_vat_number) {
        return reviewScenario(
          "missing_buyer_vat_number",
          "EU B2B goods sales require the buyer VAT number before VAT-free treatment can be decided."
        );
      }
      if (goodsOrServices === "goods" && viesStatus !== "valid") {
        return reviewScenario(
          "buyer_vat_number_not_vies_valid",
          `EU B2B goods sales require a VAT number with VIES-valid status; current status is ${viesStatus}.`
        );
      }
      return acceptScenario(
        goodsOrServices === "goods" ? "VAT_SE_EU_GOODS_B2B" : "VAT_SE_EU_SERVICES_B2B",
        goodsOrServices === "goods" ? "eu_goods_b2b_sale" : "eu_services_b2b_sale",
        ["buyer_vat_number_required"]
      );
    }
    if (region === "EU" && normalizedLine.buyer_is_taxable_person === false) {
      if (normalizedLine.ioss_flag === true) {
        const consignmentValueEur = resolveConsignmentValueEur(normalizedLine);
        if (consignmentValueEur === null || consignmentValueEur > 150) {
          return reviewScenario("ioss_not_eligible", "IOSS requires a consignment value in euro at or below 150.");
        }
        return acceptScenario("VAT_SE_EU_B2C_IOSS", "eu_b2c_ioss_sale");
      }
      if (normalizedLine.oss_flag === true) {
        return acceptScenario("VAT_SE_EU_B2C_OSS", "eu_b2c_oss_sale");
      }
      if (normalizedLine.buyer_country !== "SE") {
        const domesticCode = domesticCodeFromRate(normalizedLine);
        if (!domesticCode) {
          return reviewScenario("unsupported_eu_b2c_rate", "EU B2C threshold-below sales must resolve to 25, 12, 6 or exempt.");
        }
        return acceptScenario(domesticCode, "eu_b2c_threshold_below");
      }
      return reviewScenario("eu_b2c_requires_oss_classification", "EU B2C sales require OSS or domestic threshold classification.");
    }
    return reviewScenario("unsupported_sale_scenario", "Could not derive a supported VAT scenario for the sale.");
  }

  if (normalizedLine.supply_type === "purchase") {
    if (normalizedLine.buyer_country !== "SE") {
      return reviewScenario("unsupported_buyer_country", "VAT engine only supports Swedish buying entities in this phase.");
    }
    if (goodsOrServices === "goods" && normalizedLine.import_flag === true) {
      return acceptScenario("VAT_SE_IMPORT_GOODS", "import_goods_purchase");
    }
    if (normalizedLine.construction_service_flag && normalizedLine.reverse_charge_flag === true && normalizedLine.seller_country === "SE") {
      return acceptScenario("VAT_SE_RC_BUILD_PURCHASE", "construction_reverse_charge_purchase");
    }
    if (normalizedLine.seller_country === "SE") {
      if (normalizedLine.reverse_charge_flag === true) {
        return acceptScenario(
          goodsOrServices === "goods" ? "VAT_SE_DOMESTIC_GOODS_PURCHASE_RC" : "VAT_SE_DOMESTIC_SERVICES_PURCHASE_RC",
          goodsOrServices === "goods" ? "domestic_goods_purchase_reverse_charge" : "domestic_services_purchase_reverse_charge"
        );
      }
      if (isExemptLine(normalizedLine)) {
        return acceptScenario("VAT_SE_DOMESTIC_PURCHASE_0", "domestic_supplier_charged_purchase");
      }
      const domesticPurchaseCode = domesticPurchaseCodeFromRate(normalizedLine);
      if (!domesticPurchaseCode) {
        return reviewScenario(
          "unsupported_domestic_purchase_vat_rate",
          "Domestic supplier-charged purchases must resolve to 25, 12, 6 or exempt."
        );
      }
      return acceptScenario(domesticPurchaseCode, "domestic_supplier_charged_purchase");
    }
    if (deriveRegion(normalizedLine.seller_country) === "EU") {
      return acceptScenario(
        goodsOrServices === "goods" ? "VAT_SE_EU_GOODS_PURCHASE_RC" : "VAT_SE_EU_SERVICES_PURCHASE_RC",
        goodsOrServices === "goods" ? "eu_goods_purchase_reverse_charge" : "eu_services_purchase_reverse_charge"
      );
    }
    if (deriveRegion(normalizedLine.seller_country) === "NON_EU" && goodsOrServices === "services") {
      return acceptScenario("VAT_SE_NON_EU_SERVICE_PURCHASE_RC", "non_eu_service_purchase_reverse_charge");
    }
    return reviewScenario("unsupported_purchase_scenario", "Could not derive a supported VAT scenario for the purchase.");
  }

  return reviewScenario("unsupported_supply_type", "supply_type must be sale or purchase.");
}

function buildScenarioOutputs(normalizedLine, scenario) {
  const definition = VAT_CODE_BY_ID[scenario.vatCode];
  const baseAmount = roundMoney(normalizedLine.line_amount_ex_vat - (normalizedLine.line_discount || 0));
  const rate = resolveVatRate(normalizedLine, definition);
  const deductionRatio = normalizedLine.deduction_ratio === null ? 1 : normalizedLine.deduction_ratio;
  const viesStatus = resolveViesStatus(normalizedLine);
  const deductionRuleCode = resolveDeductionRuleCode(normalizedLine);
  const reverseChargeFlag =
    normalizedLine.reverse_charge_flag === true || String(scenario.decisionCategory || "").includes("reverse_charge");
  const ossFlag = normalizedLine.oss_flag === true || scenario.decisionCategory === "eu_b2c_oss_sale";
  const importFlag = normalizedLine.import_flag === true || scenario.decisionCategory === "import_goods_purchase";
  let declarationBoxAmounts = [];
  let postingEntries = [];
  let invoiceTextRequirements = copy(scenario.invoiceTextRequirements || []);

  switch (scenario.decisionCategory) {
    case "domestic_standard_sale": {
      const outputBox = requireBox(DOMESTIC_OUTPUT_BOX_BY_RATE, rate, "unsupported_domestic_vat_rate");
      const outputVat = calculateVat(baseAmount, rate);
      declarationBoxAmounts = [
        createBoxAmount("05", baseAmount, "taxable_base"),
        createBoxAmount(outputBox, outputVat, "output_vat")
      ];
      postingEntries = [
        createPostingEntry("net_sale", "credit", baseAmount, "taxable_base"),
        createPostingEntry("output_vat", "credit", outputVat, "output_vat")
      ];
      break;
    }
    case "domestic_exempt_sale":
      declarationBoxAmounts = [createBoxAmount("42", baseAmount, "taxable_base")];
      postingEntries = [createPostingEntry("net_sale", "credit", baseAmount, "taxable_base")];
      break;
    case "construction_reverse_charge_sale":
      declarationBoxAmounts = [createBoxAmount("41", baseAmount, "taxable_base")];
      postingEntries = [createPostingEntry("net_sale", "credit", baseAmount, "taxable_base")];
      invoiceTextRequirements = uniqueStrings([...invoiceTextRequirements, "buyer_vat_number_required", "reverse_charge_invoice_text_required"]);
      break;
    case "eu_goods_b2b_sale":
      declarationBoxAmounts = [createBoxAmount("35", baseAmount, "taxable_base")];
      postingEntries = [createPostingEntry("net_sale", "credit", baseAmount, "taxable_base")];
      invoiceTextRequirements = uniqueStrings([...invoiceTextRequirements, "buyer_vat_number_required"]);
      break;
    case "eu_services_b2b_sale":
      declarationBoxAmounts = [createBoxAmount("39", baseAmount, "taxable_base")];
      postingEntries = [createPostingEntry("net_sale", "credit", baseAmount, "taxable_base")];
      invoiceTextRequirements = uniqueStrings([...invoiceTextRequirements, "buyer_vat_number_required", "reverse_charge_invoice_text_required"]);
      break;
    case "eu_b2c_oss_sale": {
      const outputVat = calculateVat(baseAmount, rate);
      declarationBoxAmounts = [createBoxAmount("OSS", baseAmount, "taxable_base")];
      postingEntries = [
        createPostingEntry("net_sale", "credit", baseAmount, "taxable_base"),
        createPostingEntry("output_vat", "credit", outputVat, "output_vat")
      ];
      break;
    }
    case "eu_b2c_ioss_sale": {
      const outputVat = calculateVat(baseAmount, rate);
      declarationBoxAmounts = [createBoxAmount("IOSS", baseAmount, "taxable_base")];
      postingEntries = [
        createPostingEntry("net_sale", "credit", baseAmount, "taxable_base"),
        createPostingEntry("output_vat", "credit", outputVat, "output_vat")
      ];
      break;
    }
    case "eu_b2c_threshold_below": {
      const outputBox = requireBox(DOMESTIC_OUTPUT_BOX_BY_RATE, rate, "unsupported_eu_b2c_rate");
      const outputVat = calculateVat(baseAmount, rate);
      declarationBoxAmounts = [
        createBoxAmount("05", baseAmount, "taxable_base"),
        createBoxAmount(outputBox, outputVat, "output_vat")
      ];
      postingEntries = [
        createPostingEntry("net_sale", "credit", baseAmount, "taxable_base"),
        createPostingEntry("output_vat", "credit", outputVat, "output_vat")
      ];
      break;
    }
    case "export_goods_sale":
      declarationBoxAmounts = [createBoxAmount("36", baseAmount, "taxable_base")];
      postingEntries = [createPostingEntry("net_sale", "credit", baseAmount, "taxable_base")];
      break;
    case "export_services_sale":
      declarationBoxAmounts = [createBoxAmount("40", baseAmount, "taxable_base")];
      postingEntries = [createPostingEntry("net_sale", "credit", baseAmount, "taxable_base")];
      break;
    case "domestic_supplier_charged_purchase": {
      const inputVat = calculateVat(baseAmount, rate);
      declarationBoxAmounts = inputVat > 0 ? [createBoxAmount("48", inputVat, "input_vat")] : [];
      postingEntries =
        inputVat > 0
          ? [createPostingEntry("input_vat_supplier_charged", "debit", inputVat, "input_vat")]
          : [];
      break;
    }
    case "import_goods_purchase": {
      const outputBox = requireBox(IMPORT_OUTPUT_BOX_BY_RATE, rate, "unsupported_import_vat_rate");
      const vatAmount = calculateVat(baseAmount, rate);
      declarationBoxAmounts = [
        createBoxAmount("50", baseAmount, "taxable_base"),
        createBoxAmount(outputBox, vatAmount, "output_vat")
      ];
      postingEntries = [createPostingEntry("output_vat_self_assessed", "credit", vatAmount, "output_vat")];
      if (deductionRatio > 0) {
        const deductible = roundMoney(vatAmount * deductionRatio);
        declarationBoxAmounts.push(createBoxAmount("48", deductible, "input_vat"));
        postingEntries.push(createPostingEntry("input_vat_deductible", "debit", deductible, "input_vat"));
      }
      break;
    }
    case "eu_goods_purchase_reverse_charge":
      return buildReverseChargePurchaseOutputs("20", baseAmount, rate, deductionRatio, definition, scenario.decisionCategory, normalizedLine);
    case "eu_services_purchase_reverse_charge":
      return buildReverseChargePurchaseOutputs("21", baseAmount, rate, deductionRatio, definition, scenario.decisionCategory, normalizedLine);
    case "non_eu_service_purchase_reverse_charge":
      return buildReverseChargePurchaseOutputs("22", baseAmount, rate, deductionRatio, definition, scenario.decisionCategory, normalizedLine);
    case "domestic_goods_purchase_reverse_charge":
      return buildReverseChargePurchaseOutputs("23", baseAmount, rate, deductionRatio, definition, scenario.decisionCategory, normalizedLine);
    case "domestic_services_purchase_reverse_charge":
    case "construction_reverse_charge_purchase":
      return buildReverseChargePurchaseOutputs("24", baseAmount, rate, deductionRatio, definition, scenario.decisionCategory, normalizedLine);
    default:
      throw createError(500, "vat_scenario_not_supported", `Unsupported VAT scenario ${scenario.decisionCategory}.`);
  }

  return {
    vatCode: definition.vatCode,
    decisionCategory: scenario.decisionCategory,
    declarationBoxCodes: uniqueBoxCodes(declarationBoxAmounts),
    declarationBoxAmounts,
    postingEntries,
    bookingTemplateCode: definition.bookingTemplateCode,
    invoiceTextRequirements,
    viesStatus,
    deductionRuleCode,
    reverseChargeFlag,
    ossFlag,
    importFlag,
    reportingChannel: resolveReportingChannel(scenario.decisionCategory),
    euListEligible:
      (scenario.decisionCategory === "eu_goods_b2b_sale" || scenario.decisionCategory === "eu_services_b2b_sale") &&
      viesStatus === "valid",
    ossRecord:
      scenario.decisionCategory === "eu_b2c_oss_sale"
        ? buildSpecialSchemeRecord("oss", normalizedLine, baseAmount, rate)
        : null,
    iossRecord:
      scenario.decisionCategory === "eu_b2c_ioss_sale"
        ? buildSpecialSchemeRecord("ioss", normalizedLine, baseAmount, rate)
        : null,
    vatRate: rate,
    rateType: definition.rateType
  };
}

function buildReverseChargePurchaseOutputs(baseBox, baseAmount, rate, deductionRatio, definition, decisionCategory, normalizedLine) {
  const outputBox = requireBox(REVERSE_CHARGE_OUTPUT_BOX_BY_RATE, rate, "unsupported_reverse_charge_vat_rate");
  const vatAmount = calculateVat(baseAmount, rate);
  const declarationBoxAmounts = [
    createBoxAmount(baseBox, baseAmount, "taxable_base"),
    createBoxAmount(outputBox, vatAmount, "output_vat")
  ];
  const postingEntries = [createPostingEntry("output_vat_self_assessed", "credit", vatAmount, "output_vat")];
  if (deductionRatio > 0) {
    const deductible = roundMoney(vatAmount * deductionRatio);
    declarationBoxAmounts.push(createBoxAmount("48", deductible, "input_vat"));
    postingEntries.push(createPostingEntry("input_vat_deductible", "debit", deductible, "input_vat"));
  }
  return {
    vatCode: definition.vatCode,
    decisionCategory,
    declarationBoxCodes: uniqueBoxCodes(declarationBoxAmounts),
    declarationBoxAmounts,
    postingEntries,
    bookingTemplateCode: definition.bookingTemplateCode,
    invoiceTextRequirements: [],
    viesStatus: resolveViesStatus(normalizedLine),
    deductionRuleCode: resolveDeductionRuleCode(normalizedLine),
    reverseChargeFlag: true,
    ossFlag: false,
    importFlag: false,
    reportingChannel: "regular_vat_return",
    euListEligible: false,
    ossRecord: null,
    iossRecord: null,
    vatRate: rate,
    rateType: definition.rateType
  };
}

function acceptScenario(vatCode, decisionCategory, invoiceTextRequirements = []) {
  return {
    ok: true,
    vatCode,
    decisionCategory,
    invoiceTextRequirements
  };
}

function buildResolvedVatOutputs(normalizedLine, vatCode) {
  const resolvedVatCode = requireText(vatCode, "vat_code_required").toUpperCase();
  if (resolvedVatCode === "VAT_REVIEW_REQUIRED") {
    throw createError(400, "vat_resolution_code_invalid", "Manual VAT resolution must choose a supported VAT code.");
  }
  const scenario = VAT_SCENARIO_BY_CODE[resolvedVatCode];
  if (!scenario) {
    throw createError(400, "vat_resolution_code_invalid", `Unsupported VAT code ${resolvedVatCode} for manual resolution.`);
  }
  return buildScenarioOutputs(normalizedLine, {
    vatCode: resolvedVatCode,
    decisionCategory: scenario.decisionCategory,
    invoiceTextRequirements: copy(scenario.invoiceTextRequirements || [])
  });
}

function reviewScenario(reviewReasonCode, warningMessage) {
  return {
    ok: false,
    reviewReasonCode,
    warningMessage,
    explanation: warningMessage
  };
}

function summarizeDecisionBoxAmounts(decisions) {
  const totals = new Map();
  for (const decision of decisions) {
    const rows = decision.declarationBoxAmounts || decision.outputs?.declarationBoxAmounts || [];
    for (const row of rows) {
      const key = `${row.boxCode}:${row.amountType}`;
      totals.set(key, roundMoney((totals.get(key) || 0) + Number(row.amount || 0)));
    }
  }
  return [...totals.entries()]
    .map(([key, amount]) => {
      const [boxCode, amountType] = key.split(":");
      return { boxCode, amountType, amount };
    })
    .sort((left, right) => `${left.boxCode}:${left.amountType}`.localeCompare(`${right.boxCode}:${right.amountType}`));
}

function invertAmounts(rows) {
  return rows.map((row) => ({
    ...copy(row),
    amount: roundMoney(-Number(row.amount || 0))
  }));
}

function uniqueBoxCodes(rows) {
  return [...new Set(rows.map((row) => row.boxCode).filter(Boolean))];
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function createBoxAmount(boxCode, amount, amountType) {
  return {
    boxCode,
    amount: roundMoney(amount),
    amountType
  };
}

function createPostingEntry(entryCode, direction, amount, vatEffect) {
  return {
    entryCode,
    direction,
    amount: roundMoney(amount),
    vatEffect
  };
}

function normalizeVatNumberStatus(value) {
  const normalized = normalizeLowerString(value);
  if (!normalized) {
    return null;
  }
  if (["valid", "verified", "confirmed"].includes(normalized)) {
    return "valid";
  }
  if (["invalid", "rejected"].includes(normalized)) {
    return "invalid";
  }
  if (["not_applicable", "na"].includes(normalized)) {
    return "not_applicable";
  }
  if (["unchecked", "unverified", "unknown", "pending", "service_unavailable", "unavailable"].includes(normalized)) {
    return "unverified";
  }
  return normalized;
}

function resolveViesStatus(normalizedLine) {
  if (!normalizedLine || normalizedLine.region !== "EU" || normalizedLine.buyer_is_taxable_person !== true) {
    return "not_applicable";
  }
  if (!normalizedLine.buyer_vat_number) {
    return "missing";
  }
  const status = normalizeVatNumberStatus(normalizedLine.buyer_vat_number_status);
  if (status === "valid") {
    return "valid";
  }
  if (status === "invalid") {
    return "invalid";
  }
  if (status === "not_applicable") {
    return "unverified";
  }
  if (!status) {
    return "unverified";
  }
  return "unverified";
}

function resolveDeductionRuleCode(normalizedLine) {
  const deductionRatio = Number(normalizedLine?.deduction_ratio ?? 1);
  if (deductionRatio <= 0) {
    return "blocked_deduction";
  }
  if (deductionRatio >= 1) {
    return "full_deduction";
  }
  return "partial_deduction";
}

function isCompatibleVatCodeCandidate(normalizedLine, derivedVatCode) {
  if (!normalizedLine.vat_code_candidate) {
    return true;
  }
  if (normalizedLine.vat_code_candidate === derivedVatCode) {
    return true;
  }
  if (
    normalizedLine.supply_type === "purchase" &&
    normalizedLine.seller_country === "SE" &&
    normalizedLine.buyer_country === "SE" &&
    normalizedLine.reverse_charge_flag !== true
  ) {
    const aliases = DOMESTIC_PURCHASE_CANDIDATE_ALIASES[derivedVatCode] || [];
    return aliases.includes(normalizedLine.vat_code_candidate);
  }
  return false;
}

function domesticCodeFromRate(normalizedLine) {
  const rate = formatRate(resolveVatRate(normalizedLine, null));
  if (rate === "25.00") {
    return "VAT_SE_DOMESTIC_25";
  }
  if (rate === "12.00") {
    return "VAT_SE_DOMESTIC_12";
  }
  if (rate === "6.00") {
    return "VAT_SE_DOMESTIC_6";
  }
  return null;
}

function domesticPurchaseCodeFromRate(normalizedLine) {
  const rate = formatRate(resolveVatRate(normalizedLine, null));
  if (rate === "25.00") {
    return "VAT_SE_DOMESTIC_PURCHASE_25";
  }
  if (rate === "12.00") {
    return "VAT_SE_DOMESTIC_PURCHASE_12";
  }
  if (rate === "6.00") {
    return "VAT_SE_DOMESTIC_PURCHASE_6";
  }
  return null;
}

function isExemptLine(normalizedLine) {
  return resolveVatRate(normalizedLine, null) === 0 || normalizedLine.exemption_reason === "exempt";
}

function resolveVatRate(normalizedLine, definition) {
  return roundMoney(normalizedLine.tax_rate_candidate ?? normalizedLine.vat_rate ?? definition?.vatRate ?? 0);
}

function calculateVat(baseAmount, rate) {
  return roundMoney(baseAmount * (rate / 100));
}

function requireBox(mapping, rate, code) {
  const box = mapping[formatRate(rate)];
  if (!box) {
    throw createError(400, code, `No declaration box is configured for VAT rate ${rate}.`);
  }
  return box;
}

function resolveReportingChannel(decisionCategory) {
  if (decisionCategory === "eu_b2c_oss_sale") {
    return "oss";
  }
  if (decisionCategory === "eu_b2c_ioss_sale") {
    return "ioss";
  }
  return "regular_vat_return";
}

function buildSpecialSchemeRecord(scheme, normalizedLine, baseAmount, rate) {
  const exchangeRate = resolveEcbExchangeRate(normalizedLine);
  return {
    scheme,
    identifierState: "SE",
    orderType: scheme === "oss" ? "union" : "import",
    buyerCountry: normalizedLine.buyer_country,
    vatRate: rate,
    euroBaseAmount: roundMoney(baseAmount * exchangeRate),
    euroVatAmount: roundMoney(calculateVat(baseAmount, rate) * exchangeRate),
    originalCurrency: normalizedLine.currency,
    exchangeRateToEur: exchangeRate,
    consignmentValueEur: scheme === "ioss" ? resolveConsignmentValueEur(normalizedLine) : null
  };
}

function summarizeOssIossDecisions(decisions, scheme) {
  const rows = new Map();
  for (const decision of decisions) {
    const record = scheme === "oss" ? decision.outputs.ossRecord : decision.outputs.iossRecord;
    if (!record) {
      continue;
    }
    const key = `${record.buyerCountry}:${record.vatRate}`;
    if (!rows.has(key)) {
      rows.set(key, {
        scheme,
        identifierState: record.identifierState,
        orderType: record.orderType,
        buyerCountry: record.buyerCountry,
        vatRate: record.vatRate,
        euroBaseAmount: 0,
        euroVatAmount: 0,
        originalCurrencies: new Set(),
        exchangeRatesToEur: new Set()
      });
    }
    const current = rows.get(key);
    current.euroBaseAmount = roundMoney(current.euroBaseAmount + record.euroBaseAmount);
    current.euroVatAmount = roundMoney(current.euroVatAmount + record.euroVatAmount);
    current.originalCurrencies.add(record.originalCurrency);
    current.exchangeRatesToEur.add(record.exchangeRateToEur);
  }
  return [...rows.values()].map((row) => ({
    scheme: row.scheme,
    identifierState: row.identifierState,
    orderType: row.orderType,
    buyerCountry: row.buyerCountry,
    vatRate: row.vatRate,
    euroBaseAmount: row.euroBaseAmount,
    euroVatAmount: row.euroVatAmount,
    originalCurrencies: [...row.originalCurrencies].sort(),
    exchangeRatesToEur: [...row.exchangeRatesToEur].sort((left, right) => left - right)
  }));
}

function buildPeriodicStatementLines(decisions) {
  const grouped = new Map();
  for (const decision of decisions) {
    const goodsOrServices = decision.transactionLine.goods_or_services === "goods" ? "goods" : "services";
    const customerVatNumber = decision.transactionLine.buyer_vat_number;
    const customerCountry = decision.transactionLine.buyer_country;
    const key = `${customerCountry}:${customerVatNumber}:${goodsOrServices}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        customerCountry,
        customerVatNumber,
        buyerVatNumberStatus: decision.transactionLine.buyer_vat_number_status,
        goodsOrServices,
        taxableAmount: 0,
        decisionIds: []
      });
    }
    const current = grouped.get(key);
    current.taxableAmount = roundMoney(
      current.taxableAmount + Number(decision.transactionLine.line_amount_ex_vat || 0) - Number(decision.transactionLine.line_discount || 0)
    );
    current.decisionIds.push(decision.vatDecisionId);
  }
  return [...grouped.values()]
    .map((row) => ({
      customerCountry: row.customerCountry,
      customerVatNumber: row.customerVatNumber,
      buyerVatNumberStatus: row.buyerVatNumberStatus,
      goodsOrServices: row.goodsOrServices,
      taxableAmount: row.taxableAmount,
      decisionIds: row.decisionIds.sort()
    }))
    .sort((left, right) =>
      `${left.customerCountry}:${left.customerVatNumber}:${left.goodsOrServices}`.localeCompare(
        `${right.customerCountry}:${right.customerVatNumber}:${right.goodsOrServices}`
      )
    );
}

function diffDeclarationBoxSummaries(previousSummary, currentSummary) {
  const previousMap = new Map(previousSummary.map((row) => [`${row.boxCode}:${row.amountType}`, row.amount]));
  const currentMap = new Map(currentSummary.map((row) => [`${row.boxCode}:${row.amountType}`, row.amount]));
  const keys = [...new Set([...previousMap.keys(), ...currentMap.keys()])].sort();
  const changedBoxes = [];
  const changedAmounts = [];
  for (const key of keys) {
    const previousAmount = previousMap.get(key) || 0;
    const currentAmount = currentMap.get(key) || 0;
    if (roundMoney(previousAmount) !== roundMoney(currentAmount)) {
      const [boxCode, amountType] = key.split(":");
      changedBoxes.push(boxCode);
      changedAmounts.push({
        boxCode,
        amountType,
        previousAmount: roundMoney(previousAmount),
        currentAmount: roundMoney(currentAmount)
      });
    }
  }
  return {
    changedBoxes: [...new Set(changedBoxes)],
    changedAmounts
  };
}

function compareDeclarationWithLedger({ ledger, companyId, decisions }) {
  const expectedDebit = roundMoney(sumPostingDirection(decisions, "debit"));
  const expectedCredit = roundMoney(sumPostingDirection(decisions, "credit"));
  if (!ledger || typeof ledger.snapshotLedger !== "function") {
    return {
      matched: false,
      reason: "ledger_not_available",
      expectedDebit,
      expectedCredit,
      actualDebit: 0,
      actualCredit: 0
    };
  }
  const sourceKeys = [...new Set(decisions.map((decision) => `${decision.sourceType}:${decision.sourceId}`))];
  const sourceKeySet = new Set(sourceKeys);
  const snapshot = ledger.snapshotLedger();
  const matchedEntries = snapshot.journalEntries.filter(
    (entry) => entry.companyId === companyId && sourceKeySet.has(`${entry.sourceType}:${entry.sourceId}`)
  );

  const actualLinesBySource = new Map();
  for (const entry of matchedEntries) {
    const sourceKey = `${entry.sourceType}:${entry.sourceId}`;
    if (!actualLinesBySource.has(sourceKey)) {
      actualLinesBySource.set(sourceKey, []);
    }
    actualLinesBySource.get(sourceKey).push(
      ...entry.lines
        .map((line) => {
          if (Number(line.debitAmount || 0) > 0) {
            return { direction: "debit", amount: roundMoney(line.debitAmount) };
          }
          if (Number(line.creditAmount || 0) > 0) {
            return { direction: "credit", amount: roundMoney(line.creditAmount) };
          }
          return null;
        })
        .filter(Boolean)
    );
  }

  let actualDebit = 0;
  let actualCredit = 0;
  let missingSourceKeyCount = 0;
  let unmatchedExpectedLineCount = 0;
  for (const sourceKey of sourceKeys) {
    const sourceDecisions = decisions.filter((decision) => `${decision.sourceType}:${decision.sourceId}` === sourceKey);
    const remainingActualLines = [...(actualLinesBySource.get(sourceKey) || [])];
    if (remainingActualLines.length === 0) {
      missingSourceKeyCount += 1;
      continue;
    }
    for (const decision of sourceDecisions) {
      for (const postingEntry of decision.postingEntries || []) {
        const index = remainingActualLines.findIndex(
          (line) => line.direction === postingEntry.direction && line.amount === roundMoney(postingEntry.amount)
        );
        if (index === -1) {
        unmatchedExpectedLineCount += 1;
        continue;
      }
      const [matchedLine] = remainingActualLines.splice(index, 1);
      if (matchedLine.direction === "debit") {
        actualDebit = roundMoney(actualDebit + matchedLine.amount);
      } else {
        actualCredit = roundMoney(actualCredit + matchedLine.amount);
      }
    }
  }
  }
  let reason = null;
  if (unmatchedExpectedLineCount > 0) {
    reason = "ledger_totals_do_not_match";
  } else if (missingSourceKeyCount > 0) {
    reason = "ledger_evidence_missing";
  }
  return {
    matched: unmatchedExpectedLineCount === 0 && expectedDebit === actualDebit && expectedCredit === actualCredit,
    reason,
    expectedDebit,
    expectedCredit,
    actualDebit,
    actualCredit,
    matchedEntryCount: matchedEntries.length,
    missingSourceKeyCount,
    unmatchedExpectedLineCount
  };
}

function collectDecidedVatDecisions({ state, companyId, fromDate, toDate }) {
  return (state.vatDecisionIdsByCompany.get(companyId) || [])
    .map((decisionId) => state.vatDecisions.get(decisionId))
    .filter(Boolean)
    .filter((decision) => decision.status === "decided")
    .filter((decision) => decision.effectiveDate >= fromDate && decision.effectiveDate <= toDate)
    .map(copy);
}

function collectVatDecisionsForPeriod({ state, companyId, fromDate, toDate }) {
  return (state.vatDecisionIdsByCompany.get(companyId) || [])
    .map((decisionId) => state.vatDecisions.get(decisionId))
    .filter(Boolean)
    .filter((decision) => decision.effectiveDate >= fromDate && decision.effectiveDate <= toDate)
    .map(copy);
}

function collectOpenVatReviewQueueItemsForPeriod({ state, companyId, decisions }) {
  return decisions
    .filter((decision) => decision.status === "review_required" && decision.reviewQueueItemId)
    .map((decision) => state.vatReviewQueueItems.get(decision.reviewQueueItemId))
    .filter(Boolean)
    .filter((reviewQueueItem) => reviewQueueItem.companyId === companyId && reviewQueueItem.status === "open")
    .map(copy);
}

function buildVatDeclarationBasis({ state, ledger, providerBaselineRegistry = null, companyId, fromDate, toDate }) {
  const periodDecisions = collectVatDecisionsForPeriod({ state, companyId, fromDate, toDate });
  const decidedDecisions = periodDecisions.filter((decision) => decision.status === "decided");
  const regularDecisions = decidedDecisions.filter((decision) => decision.outputs.reportingChannel === "regular_vat_return");
  const ossDecisions = decidedDecisions.filter((decision) => decision.outputs.reportingChannel === "oss");
  const iossDecisions = decidedDecisions.filter((decision) => decision.outputs.reportingChannel === "ioss");
  const openReviewQueueItems = collectOpenVatReviewQueueItemsForPeriod({
    state,
    companyId,
    decisions: periodDecisions
  });
  const ledgerComparison = compareDeclarationWithLedger({ ledger, companyId, decisions: regularDecisions });
  const blockerCodes = [];
  const reviewBoundaryCodes = [];

  if (openReviewQueueItems.length > 0) {
    blockerCodes.push("open_review_queue_items");
    reviewBoundaryCodes.push("uncertain_vat_requires_review");
  }

  if (ledgerComparison.reason === "ledger_totals_do_not_match" && regularDecisions.length > 0) {
    blockerCodes.push("ledger_mismatch_requires_review");
    reviewBoundaryCodes.push("ledger_mismatch_requires_review");
  }
  if (ledgerComparison.reason === "ledger_evidence_missing" && regularDecisions.length > 0) {
    reviewBoundaryCodes.push("ledger_evidence_missing");
  }

  const activePeriodLock = findExactLockedVatPeriod({
    state,
    companyId,
    fromDate,
    toDate
  });
  const providerBaselineRefs = resolveVatProviderBaselineRefs({
    providerBaselineRegistry,
    effectiveDate: toDate,
    companyId,
    sourceObjectType: "vat_declaration_basis",
    sourceObjectId: `${companyId}:${fromDate}:${toDate}`
  });

  return {
    companyId,
    fromDate,
    toDate,
    decisionCount: periodDecisions.length,
    decidedDecisionCount: decidedDecisions.length,
    reviewRequiredDecisionCount: periodDecisions.length - decidedDecisions.length,
    regularDecisionCount: regularDecisions.length,
    ossDecisionCount: ossDecisions.length,
    iossDecisionCount: iossDecisions.length,
    declarationBoxSummary: summarizeDecisionBoxAmounts(regularDecisions),
    ossSummary: summarizeOssIossDecisions(ossDecisions, "oss"),
    iossSummary: summarizeOssIossDecisions(iossDecisions, "ioss"),
    ledgerComparison,
    openReviewQueueItemCount: openReviewQueueItems.length,
    openReviewQueueItems,
    reviewBoundaryCodes: [...new Set(reviewBoundaryCodes)],
    blockerCodes: [...new Set(blockerCodes)],
    readyForLock: blockerCodes.length === 0,
    readyForDeclaration: blockerCodes.length === 0,
    activePeriodLock: activePeriodLock ? copy(activePeriodLock) : null,
    rulepackRefs: collectVatRulepackRefs(periodDecisions),
    providerBaselineRefs,
    decisionSnapshotRefs: collectVatDecisionSnapshotRefs(decidedDecisions),
    sourceSnapshotHash: hashObject({
      companyId,
      fromDate,
      toDate,
      decisions: periodDecisions.map((decision) => ({
        vatDecisionId: decision.vatDecisionId,
        status: decision.status,
        vatCode: decision.vatCode,
        effectiveDate: decision.effectiveDate,
        inputsHash: decision.inputsHash,
        rulepackRef: toVatRulepackRef(decision)
      })),
      openReviewQueueItemIds: openReviewQueueItems.map((item) => item.vatReviewQueueItemId),
      lockId: activePeriodLock?.vatPeriodLockId || null,
      providerBaselineRefs
    })
  };
}

function materializeVatDeclarationBasis({ state, ledger, providerBaselineRegistry = null, companyId, fromDate, toDate }) {
  const basis = buildVatDeclarationBasis({ state, ledger, providerBaselineRegistry, companyId, fromDate, toDate });
  return copy(basis);
}

function listLockedVatPeriodsForRange({ state, companyId, fromDate, toDate }) {
  return [...state.vatPeriodLocks.values()]
    .filter((candidate) => candidate.companyId === companyId && candidate.status === "locked")
    .filter((candidate) => rangesOverlap(candidate.fromDate, candidate.toDate, fromDate, toDate))
    .map(copy);
}

function findExactLockedVatPeriod({ state, companyId, fromDate, toDate }) {
  return [...state.vatPeriodLocks.values()].find(
    (candidate) =>
      candidate.companyId === companyId
      && candidate.status === "locked"
      && candidate.fromDate === fromDate
      && candidate.toDate === toDate
  );
}

function findLockedVatPeriodForDate({ state, companyId, effectiveDate }) {
  return [...state.vatPeriodLocks.values()].find(
    (candidate) =>
      candidate.companyId === companyId
      && candidate.status === "locked"
      && candidate.fromDate <= effectiveDate
      && candidate.toDate >= effectiveDate
  );
}

function rangesOverlap(leftFrom, leftTo, rightFrom, rightTo) {
  return leftFrom <= rightTo && rightFrom <= leftTo;
}

function sumPostingDirection(decisions, direction) {
  return decisions.reduce(
    (sum, decision) =>
      sum +
      (decision.postingEntries || []).reduce(
        (entrySum, entry) => entrySum + (entry.direction === direction ? Number(entry.amount || 0) : 0),
        0
      ),
    0
  );
}

function resolveEcbExchangeRate(normalizedLine) {
  if (normalizedLine.currency === "EUR") {
    return 1;
  }
  if (normalizedLine.ecb_exchange_rate_to_eur === null) {
    throw createError(
      400,
      "ecb_exchange_rate_required",
      "OSS/IOSS evaluation requires ecb_exchange_rate_to_eur when the transaction currency is not EUR."
    );
  }
  return roundMoney(normalizedLine.ecb_exchange_rate_to_eur);
}

function resolveConsignmentValueEur(normalizedLine) {
  if (normalizedLine.consignment_value_eur !== null) {
    return roundMoney(normalizedLine.consignment_value_eur);
  }
  try {
    return roundMoney((normalizedLine.line_amount_ex_vat || 0) * resolveEcbExchangeRate(normalizedLine));
  } catch {
    return null;
  }
}

function deriveRegion(countryCode) {
  if (!countryCode) {
    return null;
  }
  if (countryCode === "SE") {
    return "SE";
  }
  return EU_COUNTRY_CODES.has(countryCode) ? "EU" : "NON_EU";
}

function toReplayKey(companyId, normalizedLine, rulePackId) {
  return `${companyId}:${rulePackId}:${normalizedLine.source_type}:${normalizedLine.source_id}:${hashObject(normalizedLine)}`;
}

function ensureCollection(map, key) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  return map.get(key);
}

function isMissingField(value) {
  return value === null || value === undefined || value === "";
}

function normalizeFieldValue(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  return value ?? null;
}

function normalizeUpperString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().toUpperCase() : null;
}

function normalizeLowerString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : null;
}

function normalizeGoodsOrServices(value) {
  const normalized = normalizeLowerString(value);
  if (normalized === "good") {
    return "goods";
  }
  if (normalized === "service") {
    return "services";
  }
  return normalized;
}

function normalizeCountry(value) {
  return normalizeOptionalVatCountryCodeKernel(value, "vat_country_invalid", { errorFactory: createError });
}

function buildVatRulepackRef(rulePack, effectiveDate) {
  if (!rulePack?.rulePackId || !rulePack?.rulePackCode || !rulePack?.version) {
    return null;
  }
  return {
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.rulePackId,
    effectiveDate: normalizeDate(effectiveDate || rulePack.effectiveFrom || new Date().toISOString().slice(0, 10), "vat_rulepack_ref_effective_date_invalid"),
    sourceSnapshotDate: rulePack.sourceSnapshotDate || null
  };
}

function toVatRulepackRef(decision) {
  if (!decision || typeof decision !== "object") {
    return null;
  }
  if (decision.rulepackRef && typeof decision.rulepackRef === "object") {
    return copy(decision.rulepackRef);
  }
  if (!decision.rulePackId || !decision.rulePackVersion) {
    return null;
  }
  return {
    rulepackId: decision.rulePackId,
    rulepackCode: VAT_RULE_PACK_CODE,
    rulepackVersion: decision.rulePackVersion,
    rulepackChecksum: decision.rulePackId,
    effectiveDate: decision.effectiveDate || null,
    sourceSnapshotDate: decision.sourceSnapshotDate || null
  };
}

function collectVatRulepackRefs(decisions = []) {
  return dedupeVatRulepackRefs(decisions.map((decision) => toVatRulepackRef(decision)).filter(Boolean));
}

function collectVatDecisionSnapshotRefs(decisions = []) {
  return dedupeVatDecisionSnapshotRefs(decisions.map((decision) => buildVatDecisionSnapshotRef(decision)).filter(Boolean));
}

function buildVatDecisionSnapshotRef(decision) {
  if (!decision?.vatDecisionId) {
    return null;
  }
  const rulepackRef = toVatRulepackRef(decision);
  return {
    decisionSnapshotId: decision.vatDecisionId,
    snapshotTypeCode: "vat_decision",
    sourceDomain: "vat",
    sourceObjectId: decision.vatDecisionId,
    sourceObjectVersion: decision.inputsHash || null,
    decisionHash: hashObject({
      vatDecisionId: decision.vatDecisionId,
      status: decision.status,
      vatCode: decision.vatCode,
      effectiveDate: decision.effectiveDate,
      declarationBoxAmounts: decision.declarationBoxAmounts || [],
      inputsHash: decision.inputsHash
    }),
    rulepackId: rulepackRef?.rulepackId || null,
    rulepackCode: rulepackRef?.rulepackCode || null,
    rulepackVersion: rulepackRef?.rulepackVersion || null,
    rulepackChecksum: rulepackRef?.rulepackChecksum || null,
    effectiveDate: decision.effectiveDate || null
  };
}

function resolveVatProviderBaselineRefs({ providerBaselineRegistry, effectiveDate, companyId = null, sourceObjectType, sourceObjectId = null } = {}) {
  if (
    !providerBaselineRegistry
    || typeof providerBaselineRegistry.resolveProviderBaseline !== "function"
    || typeof providerBaselineRegistry.buildProviderBaselineRef !== "function"
  ) {
    return [];
  }
  const providerBaseline = providerBaselineRegistry.resolveProviderBaseline({
    domain: "integrations",
    jurisdiction: "SE",
    providerCode: VAT_PROVIDER_CODE,
    baselineCode: VAT_PROVIDER_BASELINE_CODE,
    effectiveDate
  });
  return dedupeProviderBaselineRefs([
    providerBaselineRegistry.buildProviderBaselineRef({
      effectiveDate,
      providerBaseline,
      metadata: {
        sourceDomain: "vat",
        companyId,
        sourceObjectType: sourceObjectType || null,
        sourceObjectId
      }
    })
  ]);
}

function dedupeVatRulepackRefs(values = []) {
  const refs = [];
  const seen = new Set();
  for (const candidate of values) {
    if (!candidate?.rulepackCode || !candidate?.rulepackVersion) {
      continue;
    }
    const key = `${candidate.rulepackCode}:${candidate.rulepackVersion}:${candidate.effectiveDate || ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push(copy(candidate));
  }
  return refs;
}

function dedupeProviderBaselineRefs(values = []) {
  const refs = [];
  const seen = new Set();
  for (const candidate of values) {
    if (!candidate?.providerBaselineId && !candidate?.baselineCode) {
      continue;
    }
    const key = candidate.providerBaselineId || candidate.baselineCode;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push(copy(candidate));
  }
  return refs;
}

function dedupeVatDecisionSnapshotRefs(values = []) {
  const refs = [];
  const seen = new Set();
  for (const candidate of values) {
    if (!candidate?.decisionSnapshotId) {
      continue;
    }
    if (seen.has(candidate.decisionSnapshotId)) {
      continue;
    }
    seen.add(candidate.decisionSnapshotId);
    refs.push(copy(candidate));
  }
  return refs;
}

function normalizeOptionalDate(value) {
  return normalizeOptionalIsoDateKernel(value, "date_invalid", { errorFactory: createError });
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return roundMoney(number);
}

function normalizeOptionalBoolean(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return value === true || value === "true";
}

function normalizeDate(value, code) {
  return normalizeRequiredIsoDateKernel(value, code, { errorFactory: createError });
}

function normalizeOptionalVatNumber(value, countryCode = null) {
  return normalizeOptionalVatNumberKernel(value, "vat_number_invalid", {
    errorFactory: createError,
    countryCode
  });
}

function assertDateRange(fromDate, toDate, code) {
  if (fromDate > toDate) {
    throw createError(400, code, `${code} requires fromDate to be on or before toDate.`);
  }
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatRate(value) {
  return Number(value || 0).toFixed(2);
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}


function hashObject(value) {
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
