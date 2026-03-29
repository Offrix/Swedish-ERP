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

export function compareDateRanges(leftFrom, leftTo, rightFrom, rightTo) {
  const leftEnd = leftTo || "9999-12-31";
  const rightEnd = rightTo || "9999-12-31";
  return leftFrom <= rightEnd && rightFrom <= leftEnd;
}

export function nowIso(clock) {
  return new Date(clock()).toISOString();
}

export function currentDate(clock) {
  return nowIso(clock).slice(0, 10);
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
