import crypto from "node:crypto";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
export { copy };

export function appendToIndex(index, key, value) {
  const bucket = index.get(key) || [];
  bucket.push(value);
  index.set(key, bucket);
}

export function buildHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}


export function createError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

export function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function requireText(value, code, message = "Text value is required.") {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, message);
  }
  return normalized;
}

export function normalizeCode(value, code) {
  return requireText(value, code).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
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

export function nowIso(clock) {
  return clock().toISOString();
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
