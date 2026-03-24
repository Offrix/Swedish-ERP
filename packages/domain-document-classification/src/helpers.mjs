import crypto from "node:crypto";
import {
  CLASSIFICATION_CASE_STATUSES,
  CLASSIFICATION_REVIEW_REASON_CODES,
  CLASSIFICATION_REVIEW_RISK_CLASSES,
  PERSON_RELATION_CODES,
  TREATMENT_CODES,
  TREATMENT_INTENT_STATUSES,
  TREATMENT_LINE_TYPES,
  TREATMENT_SCENARIO_CODES,
  TREATMENT_TARGET_DOMAINS
} from "./constants.mjs";

export function appendToIndex(index, key, value) {
  const bucket = index.get(key) || [];
  bucket.push(value);
  index.set(key, bucket);
}

export function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

export function nowIso(clock) {
  return clock().toISOString();
}

export function requireText(value, code, message = "Text value is required.") {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, message);
  }
  return normalized;
}

export function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCode(value, code) {
  return requireText(value, code).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

export function normalizeScenarioCode(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return "unknown";
  }
  return assertAllowed(normalized.toLowerCase().replace(/[^a-z0-9]+/g, "_"), TREATMENT_SCENARIO_CODES, "classification_scenario_invalid");
}

export function normalizeEnumValue(value, code) {
  return requireText(value, code).toLowerCase();
}

export function normalizeMoney(value, code) {
  if (value == null || value === "") {
    throw createError(400, code, "Money value is required.");
  }
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw createError(400, code, "Money value is invalid.");
  }
  return roundMoney(parsed);
}

export function normalizeOptionalMoney(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeMoney(value, code);
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function normalizeDate(value, code) {
  const normalized = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, "Date must be in YYYY-MM-DD format.");
  }
  return normalized;
}

export function normalizeOptionalDate(value, code) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalizeDate(normalized, code) : null;
}

export function assertAllowed(value, allowed, code) {
  if (!allowed.includes(value)) {
    throw createError(400, code, `Value "${value}" is not allowed.`);
  }
  return value;
}

export function normalizeTreatmentCode(value) {
  return assertAllowed(normalizeCode(value, "treatment_code_required"), TREATMENT_CODES, "treatment_code_invalid");
}

export function normalizeTreatmentLineType(value) {
  return assertAllowed(normalizeEnumValue(value, "treatment_line_type_required"), TREATMENT_LINE_TYPES, "treatment_line_type_invalid");
}

export function normalizeIntentStatus(value) {
  return assertAllowed(normalizeEnumValue(value, "treatment_intent_status_required"), TREATMENT_INTENT_STATUSES, "treatment_intent_status_invalid");
}

export function normalizeCaseStatus(value) {
  return assertAllowed(normalizeEnumValue(value, "classification_case_status_required"), CLASSIFICATION_CASE_STATUSES, "classification_case_status_invalid");
}

export function normalizeTargetDomain(value) {
  return assertAllowed(normalizeCode(value, "target_domain_required"), TREATMENT_TARGET_DOMAINS, "target_domain_invalid");
}

export function normalizePersonRelationCode(value) {
  return assertAllowed(normalizeEnumValue(value || "employee", "person_relation_code_required"), PERSON_RELATION_CODES, "person_relation_code_invalid");
}

export function normalizeRiskClass(value) {
  return assertAllowed(normalizeEnumValue(value || "medium", "classification_review_risk_required"), CLASSIFICATION_REVIEW_RISK_CLASSES, "classification_review_risk_invalid");
}

export function normalizeReasonCode(value) {
  return assertAllowed(normalizeCode(value, "classification_review_reason_required"), CLASSIFICATION_REVIEW_REASON_CODES, "classification_review_reason_invalid");
}

export function buildHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function pickHighestRisk(left, right) {
  const ranking = { low: 1, medium: 2, high: 3, critical: 4 };
  return ranking[right] > ranking[left] ? right : left;
}

export function sortByCreatedAt(left, right) {
  return left.createdAt.localeCompare(right.createdAt);
}
