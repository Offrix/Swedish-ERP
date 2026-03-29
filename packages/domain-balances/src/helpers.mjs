import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
export { copy };


export function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

export function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function normalizeCode(value, code) {
  const resolved = requireText(value, code);
  return resolved.trim().replaceAll(/[\s-]+/g, "_").toUpperCase();
}

export function normalizeRequiredDate(value, code) {
  const resolved = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createError(400, code, `${code} must be YYYY-MM-DD.`);
  }
  const parsed = new Date(`${resolved}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw createError(400, code, `${code} must be a valid date.`);
  }
  return resolved;
}

export function normalizeQuantity(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw createError(400, code, `${code} must be numeric.`);
  }
  return roundQuantity(numberValue);
}

export function roundQuantity(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

export function assertAllowed(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw createError(400, code, `${code} must be one of ${allowedValues.join(", ")}.`);
  }
  return value;
}

export function appendToIndex(map, key, value) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return existing;
  }
  map.set(key, [value]);
  return map.get(key);
}

export function setIndexValue(map, key, nestedKey, value) {
  map.set(`${key}::${nestedKey}`, value);
}

export function getIndexValue(map, key, nestedKey) {
  return map.get(`${key}::${nestedKey}`) || null;
}

export function nowIso(clock) {
  return new Date(clock()).toISOString();
}

export function currentDate(clock) {
  return nowIso(clock).slice(0, 10);
}

export function compareDates(left, right) {
  return left.localeCompare(right);
}

export function addDays(dateString, dayCount) {
  const date = new Date(`${normalizeRequiredDate(dateString, "date_invalid")}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(dayCount));
  return date.toISOString().slice(0, 10);
}

export function buildAccountKey({ companyId, balanceTypeCode, ownerTypeCode, employeeId = null, employmentId = null }) {
  return [companyId, balanceTypeCode, ownerTypeCode, employeeId || "-", employmentId || "-"].join("::");
}

export function createRunKey({ companyId, actionCode, idempotencyKey = null, sourceDate = null, targetDate = null, balanceTypeCode = null }) {
  if (idempotencyKey) {
    return `${companyId}::${actionCode}::${idempotencyKey}`;
  }
  return `${companyId}::${actionCode}::${sourceDate || "-"}::${targetDate || "-"}::${balanceTypeCode || "*"}`;
}

export function buildDeterministicId(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

export function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "balances_action",
      event: copy(event)
    })
  );
}

export function freezeRecord(record) {
  return Object.freeze(record);
}

export function resolveBalanceTypeCode(balanceTypeCode) {
  return normalizeCode(balanceTypeCode, "balance_type_code_required");
}
