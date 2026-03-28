import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import {
  ASSESSMENT_EVENT_TYPES,
  CREDIT_EVENT_TYPES,
  EVENT_TYPE_TO_LIABILITY_TYPE,
  LIABILITY_TYPE_PRIORITY
} from "./constants.mjs";

export function buildHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableStringify(value) {
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

export function appendToIndex(index, key, value) {
  const items = index.get(key) || [];
  items.push(value);
  index.set(key, items);
}

export function appendUniqueToIndex(index, key, value) {
  const items = index.get(key) || [];
  if (!items.includes(value)) {
    items.push(value);
    index.set(key, items);
  }
}

export function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "tax_account_action",
      event
    })
  );
}

export function nowIso(clock) {
  return new Date(clock()).toISOString();
}

export function currentDate(clock) {
  return nowIso(clock).slice(0, 10);
}

export function normalizeDate(value, code) {
  const resolved = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createError(400, code, "Date must use YYYY-MM-DD format.");
  }
  return resolved;
}

export function normalizeOptionalDate(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeDate(value, code);
}

export function normalizeMoney(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createError(400, code, "Amount must be a non-negative number.");
  }
  return roundMoney(numeric);
}

export function normalizeUpperCode(value, code, expectedLength = null) {
  const resolved = requireText(String(value || ""), code).toUpperCase();
  if (expectedLength && resolved.length !== expectedLength) {
    throw createError(400, code, `${code} must have length ${expectedLength}.`);
  }
  return resolved;
}

export function normalizeLowerCode(value, code) {
  return requireText(String(value || ""), code).toLowerCase();
}

export function normalizeCode(value, code) {
  return requireText(String(value || ""), code)
    .replaceAll(/[^A-Za-z0-9_]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
    .toUpperCase();
}

export function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const resolved = String(value).trim();
  return resolved.length > 0 ? resolved : null;
}

export function normalizeOptionalStatus(value, allowedValues, code) {
  if (value == null || value === "") {
    return null;
  }
  const resolved = requireText(String(value), code);
  const matchedValue = allowedValues.find((allowedValue) => allowedValue.toLowerCase() === resolved.toLowerCase());
  if (!matchedValue) {
    throw createError(400, code, `${resolved} is not allowed.`);
  }
  return matchedValue;
}

export function normalizeOptionalAllowedCode(value, allowedValues, code) {
  if (value == null || value === "") {
    return null;
  }
  return assertAllowed(normalizeCode(value, code), allowedValues, code);
}

export function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

export function assertAllowed(value, allowedValues, code) {
  const resolved = requireText(String(value || ""), code);
  if (!allowedValues.includes(resolved)) {
    throw createError(400, code, `${resolved} is not allowed.`);
  }
  return resolved;
}

export function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function copy(value) {
  return value == null ? value : structuredClone(value);
}

export function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function isAssessmentEvent(event) {
  return ASSESSMENT_EVENT_TYPES.has(event.eventTypeCode);
}

export function isCreditEvent(event) {
  return CREDIT_EVENT_TYPES.has(event.eventTypeCode) && event.effectDirection === "credit";
}

export function deriveEffectDirection(eventTypeCode) {
  return CREDIT_EVENT_TYPES.has(eventTypeCode) ? "credit" : "debit";
}

export function resolveLiabilityPriority(liabilityTypeCode) {
  return LIABILITY_TYPE_PRIORITY[liabilityTypeCode] || 999;
}

export function compareTaxAccountEvents(left, right) {
  return (
    left.eventDate.localeCompare(right.eventDate) ||
    left.postingDate.localeCompare(right.postingDate) ||
    left.externalReference.localeCompare(right.externalReference)
  );
}

export function compareReconciliationItems(left, right) {
  return (
    left.dueDate.localeCompare(right.dueDate) ||
    resolveLiabilityPriority(left.liabilityTypeCode) - resolveLiabilityPriority(right.liabilityTypeCode) ||
    left.sourceObjectType.localeCompare(right.sourceObjectType) ||
    left.sourceObjectId.localeCompare(right.sourceObjectId)
  );
}

export function determineReconciliationItemStatus({ expectedAmount, assessedAmount, settledAmount }) {
  const normalizedExpectedAmount = roundMoney(expectedAmount);
  const normalizedAssessedAmount = roundMoney(assessedAmount);
  const normalizedSettledAmount = roundMoney(settledAmount);
  const settlementBase = Math.min(normalizedExpectedAmount, normalizedAssessedAmount);
  if (normalizedSettledAmount >= settlementBase && settlementBase > 0) {
    return "settled";
  }
  if (normalizedSettledAmount > 0) {
    return "partially_offset";
  }
  if (normalizedAssessedAmount >= normalizedExpectedAmount && normalizedExpectedAmount > 0) {
    return "assessment_matched";
  }
  return "open";
}

export function determineCreditEventReconciliationStatus(state, taxAccountEventId) {
  const remainingAmount = remainingCreditAmountForEvent(state, taxAccountEventId);
  if (remainingAmount === 0) {
    return "closed";
  }
  const approvedOffsets = listOffsetsByEvent(state, taxAccountEventId);
  if (approvedOffsets.length === 0) {
    return "unmatched";
  }
  return "partially_matched";
}

export function remainingCreditAmountForEvent(state, taxAccountEventId) {
  const event = state.events.get(taxAccountEventId);
  if (!event || event.effectDirection !== "credit") {
    return 0;
  }
  const consumedAmount = listOffsetsByEvent(state, taxAccountEventId).reduce((sum, offset) => sum + offset.offsetAmount, 0);
  return roundMoney(event.amount - consumedAmount);
}

export function listOffsetsByEvent(state, taxAccountEventId) {
  return [...state.offsets.values()].filter((offset) => offset.taxAccountEventId === taxAccountEventId);
}

export function presentTaxAccountEvent(state, event) {
  return copy({
    ...event,
    remainingOffsetAmount: event.effectDirection === "credit" ? remainingCreditAmountForEvent(state, event.taxAccountEventId) : 0
  });
}

export function presentReconciliationItem(item) {
  const remainingAssessmentAmount = Math.max(roundMoney(item.expectedAmount - item.assessedAmount), 0);
  const settlementBaseAmount = Math.min(item.expectedAmount, item.assessedAmount);
  const remainingSettlementAmount = Math.max(roundMoney(settlementBaseAmount - item.settledAmount), 0);
  return copy({
    ...item,
    remainingAssessmentAmount,
    remainingSettlementAmount
  });
}

export function buildImportIdentity(event) {
  return buildHash({
    companyId: event.companyId,
    importSource: event.importSource,
    externalReference: event.externalReference,
    sourceReference: event.sourceReference,
    postingDate: event.postingDate,
    eventTypeCode: event.eventTypeCode,
    effectDirection: event.effectDirection,
    amount: event.amount
  });
}

export function normalizeImportedEvent(rawEvent, { companyId, importBatchId, importSource, actorId, clock, allowedEventTypes, allowedDirections, allowedLiabilityTypes }) {
  if (!rawEvent || typeof rawEvent !== "object" || Array.isArray(rawEvent)) {
    throw createError(400, "tax_account_event_invalid", "Each tax-account event must be an object.");
  }
  const eventTypeCode = assertAllowed(normalizeCode(rawEvent.eventTypeCode, "tax_account_event_type_required"), allowedEventTypes, "tax_account_event_type_invalid");
  const effectDirection = assertAllowed(
    normalizeLowerCode(rawEvent.effectDirection || deriveEffectDirection(eventTypeCode), "tax_account_event_effect_direction_required"),
    allowedDirections,
    "tax_account_event_effect_direction_invalid"
  );
  return {
    taxAccountEventId: crypto.randomUUID(),
    companyId,
    importBatchId,
    importSource,
    eventDate: normalizeDate(rawEvent.eventDate || rawEvent.postingDate, "tax_account_event_date_invalid"),
    postingDate: normalizeDate(rawEvent.postingDate || rawEvent.eventDate, "tax_account_posting_date_invalid"),
    eventTypeCode,
    effectDirection,
    amount: normalizeMoney(rawEvent.amount, "tax_account_event_amount_invalid"),
    currencyCode: normalizeUpperCode(rawEvent.currencyCode || "SEK", "tax_account_currency_code_required", 3),
    externalReference: requireText(rawEvent.externalReference || rawEvent.sourceReference, "tax_account_external_reference_required"),
    sourceReference: requireText(rawEvent.sourceReference || rawEvent.externalReference, "tax_account_source_reference_required"),
    sourceObjectType: normalizeOptionalText(rawEvent.sourceObjectType),
    sourceObjectId: normalizeOptionalText(rawEvent.sourceObjectId),
    liabilityTypeCode: normalizeOptionalAllowedCode(
      rawEvent.liabilityTypeCode || EVENT_TYPE_TO_LIABILITY_TYPE[eventTypeCode] || null,
      allowedLiabilityTypes,
      "tax_account_event_liability_type_invalid"
    ),
    periodKey: normalizeOptionalText(rawEvent.periodKey),
    mappingStatus: "imported",
    reconciliationStatus: "imported",
    mappedTargetObjectType: null,
    mappedTargetObjectId: null,
    mappedLiabilityTypeCode: null,
    mappedByRuleCode: null,
    classificationCode: null,
    classificationApprovedByActorId: null,
    classificationApprovedAt: null,
    classificationResolutionNote: null,
    ledgerPostingStatus: "pending",
    createdByActorId: actorId,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
}
