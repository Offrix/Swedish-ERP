import crypto from "node:crypto";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";

export const VAT_DECISION_STATUSES = Object.freeze(["decided", "review_required"]);
export const VAT_REVIEW_QUEUE_STATUSES = Object.freeze(["open", "resolved", "waived"]);

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
  "buyer_type",
  "buyer_vat_no",
  "supply_type",
  "goods_or_services",
  "invoice_date",
  "delivery_date",
  "currency",
  "line_amount_ex_vat",
  "vat_rate",
  "vat_code_candidate",
  "project_id",
  "source_type",
  "source_id",
  "seller_vat_registration_country",
  "buyer_is_taxable_person",
  "buyer_vat_number",
  "buyer_vat_number_status",
  "supply_subtype",
  "property_related_flag",
  "construction_service_flag",
  "transport_end_country",
  "import_flag",
  "export_flag",
  "reverse_charge_flag",
  "oss_flag",
  "ioss_flag",
  "tax_date",
  "prepayment_date",
  "line_discount",
  "line_quantity",
  "line_uom",
  "tax_rate_candidate",
  "exemption_reason",
  "invoice_text_code",
  "report_box_code"
]);

const VAT_CODE_DEFINITIONS = Object.freeze([
  createVatCodeDefinition("VAT_SE_DOMESTIC_25", "Domestic 25 %", 25, ["05", "10"], "vat_se_domestic_25"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_12", "Domestic 12 %", 12, ["05", "11"], "vat_se_domestic_12"),
  createVatCodeDefinition("VAT_SE_DOMESTIC_6", "Domestic 6 %", 6, ["05", "12"], "vat_se_domestic_6"),
  createVatCodeDefinition("VAT_SE_EXEMPT", "Exempt or zero-rated", 0, ["40"], "vat_se_exempt"),
  createVatCodeDefinition("VAT_SE_RC_BUILD_SELL", "Construction reverse charge", 25, ["41", "30"], "vat_se_rc_build_sell"),
  createVatCodeDefinition("VAT_SE_EU_GOODS_B2B", "EU goods B2B", 0, ["35"], "vat_se_eu_goods_b2b"),
  createVatCodeDefinition("VAT_SE_EU_SERVICES_B2B", "EU services B2B", 0, ["38"], "vat_se_eu_services_b2b"),
  createVatCodeDefinition("VAT_SE_EU_B2C_OSS", "EU B2C OSS", 0, ["OSS"], "vat_se_eu_b2c_oss"),
  createVatCodeDefinition("VAT_SE_EXPORT_GOODS_0", "Export goods", 0, ["36"], "vat_se_export_goods_0"),
  createVatCodeDefinition("VAT_SE_IMPORT_GOODS", "Import goods", 25, ["50", "60"], "vat_se_import_goods"),
  createVatCodeDefinition("VAT_SE_NON_EU_SERVICE_PURCHASE_RC", "Non-EU service purchase reverse charge", 25, ["22", "30", "48"], "vat_se_non_eu_service_purchase_rc"),
  createVatCodeDefinition("VAT_REVIEW_REQUIRED", "Manual VAT review required", 0, [], "vat_review_required")
]);

const SEEDED_RULE_PACKS = Object.freeze([
  {
    rulePackId: "vat-se-2025.4",
    domain: "vat",
    jurisdiction: "SE",
    effectiveFrom: "2025-01-01",
    effectiveTo: "2025-12-31",
    version: "2025.4",
    sourceSnapshotDate: "2025-12-31",
    semanticChangeSummary: "Historical VAT decision baseline before 2026 pack refresh.",
    machineReadableRules: {
      requiredFields: REQUIRED_DECISION_FIELDS,
      reviewQueueCode: "vat_decision_review",
      supportedDecisionCodes: VAT_CODE_DEFINITIONS.map((definition) => definition.vatCode),
      decisionExpectations: buildDecisionExpectations()
    },
    humanReadableExplanation: [
      "Use the candidate only when the mandatory VAT facts are present and structurally consistent.",
      "Missing or contradictory facts must route to manual review instead of silent booking."
    ],
    testVectors: [
      { vectorId: "vat-historical-domestic-25", decisionCode: "VAT_SE_DOMESTIC_25" },
      { vectorId: "vat-historical-review-required", decisionCode: "VAT_REVIEW_REQUIRED" }
    ],
    migrationNotes: ["Historical rule pack retained for deterministic replay."]
  },
  {
    rulePackId: "vat-se-2026.1",
    domain: "vat",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: "2026.1",
    sourceSnapshotDate: "2026-03-21",
    semanticChangeSummary: "Initial production VAT masterdata and decision object baseline for 2026.",
    machineReadableRules: {
      requiredFields: REQUIRED_DECISION_FIELDS,
      reviewQueueCode: "vat_decision_review",
      supportedDecisionCodes: VAT_CODE_DEFINITIONS.map((definition) => definition.vatCode),
      decisionExpectations: buildDecisionExpectations()
    },
    humanReadableExplanation: [
      "Resolve a rule pack by jurisdiction and date before a VAT decision is accepted.",
      "If a transaction misses mandatory fields or the candidate conflicts with structural facts, queue it for review."
    ],
    testVectors: [
      { vectorId: "vat-domestic-25", decisionCode: "VAT_SE_DOMESTIC_25" },
      { vectorId: "vat-eu-goods-b2b", decisionCode: "VAT_SE_EU_GOODS_B2B" },
      { vectorId: "vat-review-missing-fields", decisionCode: "VAT_REVIEW_REQUIRED" }
    ],
    migrationNotes: ["4.1 pack establishes masterdata, decision object traceability and review routing."]
  }
]);

export function createVatPlatform(options = {}) {
  return createVatEngine(options);
}

export function createVatEngine({ clock = () => new Date(), seedDemo = true } = {}) {
  const ruleRegistry = createRulePackRegistry({
    clock,
    seedRulePacks: SEEDED_RULE_PACKS
  });
  const state = {
    vatCodes: new Map(),
    vatCodeIdsByCompany: new Map(),
    vatDecisions: new Map(),
    vatDecisionIdsByCompany: new Map(),
    vatDecisionIdsByReplayKey: new Map(),
    vatReviewQueueItems: new Map(),
    vatReviewQueueIdsByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedVatMasterdata(state, clock);
  }

  return {
    vatDecisionStatuses: VAT_DECISION_STATUSES,
    vatReviewQueueStatuses: VAT_REVIEW_QUEUE_STATUSES,
    listVatCodes,
    listVatRulePacks,
    evaluateVatDecision,
    getVatDecision,
    listVatReviewQueue,
    snapshotVat
  };

  function listVatCodes({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.vatCodeIdsByCompany.get(resolvedCompanyId) || [])
      .map((vatCodeId) => state.vatCodes.get(vatCodeId))
      .filter(Boolean)
      .sort((left, right) => left.vatCode.localeCompare(right.vatCode))
      .map(copy);
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
    return packs.filter((pack) => pack.effectiveFrom <= resolvedDate && (!pack.effectiveTo || pack.effectiveTo >= resolvedDate));
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
    const rulePack = ruleRegistry.resolveRulePack({
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
      rulePack
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
      status: classification.decision.needsManualReview ? "review_required" : "decided",
      declarationBoxCodes: classification.outputs.declarationBoxCodes,
      bookingTemplateCode: classification.outputs.bookingTemplateCode,
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

  function snapshotVat() {
    return copy({
      vatCodes: [...state.vatCodes.values()],
      vatDecisions: [...state.vatDecisions.values()],
      vatReviewQueueItems: [...state.vatReviewQueueItems.values()],
      vatRulePacks: ruleRegistry.listRulePacks({ domain: "vat", jurisdiction: "SE" }),
      auditEvents: state.auditEvents
    });
  }

  function pushAudit({ companyId, actorId, correlationId, action, entityType, entityId, explanation }) {
    state.auditEvents.push({
      auditEventId: crypto.randomUUID(),
      companyId,
      actorId,
      correlationId,
      action,
      entityType,
      entityId,
      explanation,
      recordedAt: nowIso()
    });
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

function classifyVatDecision({ companyId, normalizedLine, rulePack }) {
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

  const vatCode = normalizedLine.vat_code_candidate;
  const vatCodeDefinition = VAT_CODE_DEFINITIONS.find((definition) => definition.vatCode === vatCode);
  if (!vatCodeDefinition) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "unknown_vat_code_candidate",
      warningCode: "unknown_vat_code_candidate",
      warningMessage: `VAT code candidate ${vatCode} is not registered in masterdata.`,
      explanation: [
        `company_id=${companyId}`,
        `rule_pack_id=${rulePack.rulePackId}`,
        `vat_code_candidate=${vatCode}`,
        "Decision routed to manual review because the VAT code candidate is unknown."
      ]
    });
  }

  const expectation = rulePack.machineReadableRules.decisionExpectations?.[vatCodeDefinition.vatCode] || {};
  const mismatches = findExpectationMismatches(expectation, normalizedLine);
  if (mismatches.length > 0) {
    return buildReviewDecision({
      normalizedLine,
      rulePack,
      reviewReasonCode: "candidate_conflicts_with_inputs",
      warningCode: "candidate_conflicts_with_inputs",
      warningMessage: `VAT code candidate ${vatCodeDefinition.vatCode} conflicts with inputs: ${mismatches.join(", ")}`,
      explanation: [
        `rule_pack_id=${rulePack.rulePackId}`,
        `vat_code_candidate=${vatCodeDefinition.vatCode}`,
        `mismatches=${mismatches.join(",")}`,
        "Decision routed to manual review because the candidate conflicts with structural VAT facts."
      ]
    });
  }

  const explanation = [
    `rule_pack_id=${rulePack.rulePackId}`,
    `vat_code=${vatCodeDefinition.vatCode}`,
    `seller_country=${normalizedLine.seller_country}`,
    `buyer_country=${normalizedLine.buyer_country}`,
    `goods_or_services=${normalizedLine.goods_or_services}`,
    `vat_rate=${normalizedLine.vat_rate}`,
    `source_type=${normalizedLine.source_type}`
  ];

  const decision = {
    ...createVatDecision(rulePack, normalizedLine, vatCodeDefinition, false, [], explanation),
    outputs: {
      vatCode: vatCodeDefinition.vatCode,
      declarationBoxCodes: vatCodeDefinition.declarationBoxCodes,
      bookingTemplateCode: vatCodeDefinition.bookingTemplateCode,
      vatRate: vatCodeDefinition.vatRate,
      rateType: vatCodeDefinition.rateType
    }
  };

  return {
    decision,
    outputs: decision.outputs,
    reviewReasonCode: null,
    reviewQueueCode: null
  };
}

function buildReviewDecision({ normalizedLine, rulePack, reviewReasonCode, warningCode, warningMessage, explanation }) {
  const reviewCode = VAT_CODE_DEFINITIONS.find((definition) => definition.vatCode === "VAT_REVIEW_REQUIRED");
  const decision = {
    ...createVatDecision(
      rulePack,
      normalizedLine,
      reviewCode,
      true,
      [{ code: warningCode, message: warningMessage }],
      explanation
    ),
    outputs: {
      vatCode: reviewCode.vatCode,
      declarationBoxCodes: reviewCode.declarationBoxCodes,
      bookingTemplateCode: reviewCode.bookingTemplateCode,
      vatRate: reviewCode.vatRate,
      rateType: reviewCode.rateType
    }
  };

  return {
    decision,
    outputs: decision.outputs,
    reviewReasonCode,
    reviewQueueCode: rulePack.machineReadableRules.reviewQueueCode || "vat_decision_review"
  };
}

function createVatDecision(rulePack, normalizedLine, vatCodeDefinition, needsManualReview, warnings, explanation) {
  const decision = {
    decisionCode: vatCodeDefinition.vatCode,
    inputsHash: hashObject(normalizedLine),
    rulePackId: rulePack.rulePackId,
    effectiveDate: normalizedLine.tax_date || normalizedLine.invoice_date,
    outputs: {},
    warnings,
    explanation,
    needsManualReview
  };
  return decision;
}

function normalizeTransactionLine(transactionLine) {
  const candidate = transactionLine && typeof transactionLine === "object" ? copy(transactionLine) : {};
  const normalized = {};
  for (const field of REQUIRED_DECISION_FIELDS) {
    normalized[field] = normalizeFieldValue(candidate[field]);
  }
  normalized.buyer_type = normalizeUpperString(candidate.buyer_type);
  normalized.seller_country = normalizeCountry(candidate.seller_country);
  normalized.seller_vat_registration_country = normalizeCountry(candidate.seller_vat_registration_country);
  normalized.buyer_country = normalizeCountry(candidate.buyer_country);
  normalized.transport_end_country = normalizeCountry(candidate.transport_end_country);
  normalized.goods_or_services = normalizeLowerString(candidate.goods_or_services);
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
  normalized.buyer_vat_no = typeof candidate.buyer_vat_no === "string" ? candidate.buyer_vat_no.trim() : candidate.buyer_vat_no;
  normalized.buyer_vat_number = typeof candidate.buyer_vat_number === "string" ? candidate.buyer_vat_number.trim() : candidate.buyer_vat_number;
  normalized.buyer_vat_number_status = normalizeLowerString(candidate.buyer_vat_number_status);
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
  normalized.line_uom = typeof candidate.line_uom === "string" ? candidate.line_uom.trim() : candidate.line_uom;
  normalized.region = deriveRegion(normalized.buyer_country);
  return normalized;
}

function seedVatMasterdata(state, clock) {
  const now = new Date(clock()).toISOString();
  const companyId = DEMO_COMPANY_ID;
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

function buildDecisionExpectations() {
  return {
    VAT_SE_DOMESTIC_25: {
      seller_country: "SE",
      buyer_country: "SE",
      import_flag: false,
      export_flag: false,
      reverse_charge_flag: false
    },
    VAT_SE_DOMESTIC_12: {
      seller_country: "SE",
      buyer_country: "SE",
      import_flag: false,
      export_flag: false,
      reverse_charge_flag: false
    },
    VAT_SE_DOMESTIC_6: {
      seller_country: "SE",
      buyer_country: "SE",
      import_flag: false,
      export_flag: false,
      reverse_charge_flag: false
    },
    VAT_SE_EXEMPT: {
      seller_country: "SE",
      buyer_country: "SE"
    },
    VAT_SE_RC_BUILD_SELL: {
      seller_country: "SE",
      buyer_country: "SE",
      construction_service_flag: true,
      reverse_charge_flag: true
    },
    VAT_SE_EU_GOODS_B2B: {
      seller_country: "SE",
      region: "EU",
      buyer_is_taxable_person: true,
      goods_or_services: "goods"
    },
    VAT_SE_EU_SERVICES_B2B: {
      seller_country: "SE",
      region: "EU",
      buyer_is_taxable_person: true,
      goods_or_services: "services"
    },
    VAT_SE_EU_B2C_OSS: {
      seller_country: "SE",
      region: "EU",
      buyer_is_taxable_person: false,
      oss_flag: true
    },
    VAT_SE_EXPORT_GOODS_0: {
      seller_country: "SE",
      export_flag: true,
      goods_or_services: "goods"
    }
  };
}

function findExpectationMismatches(expectation, normalizedLine) {
  const mismatches = [];
  for (const [key, expectedValue] of Object.entries(expectation || {})) {
    if (expectedValue === undefined) {
      continue;
    }
    if (normalizedLine[key] !== expectedValue) {
      mismatches.push(`${key}:${normalizedLine[key]}!=${expectedValue}`);
    }
  }
  return mismatches;
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

function normalizeCountry(value) {
  const normalized = normalizeUpperString(value);
  return normalized || null;
}

function normalizeOptionalDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return normalizeDate(value, "date_invalid");
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Number(number.toFixed(2));
}

function normalizeOptionalBoolean(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return value === true || value === "true";
}

function normalizeDate(value, code) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw createError(400, code, `${code} must be an ISO date.`);
  }
  return value.trim();
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

function copy(value) {
  return JSON.parse(JSON.stringify(value));
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
