import crypto from "node:crypto";
import { SEARCH_VISIBILITY_SCOPES } from "./constants.mjs";

export function normalizeCode(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

export function normalizeEnumValue(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toLowerCase();
}

export function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalDateTime(value) {
  if (value == null || String(value).trim().length === 0) {
    return null;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw createError(400, "search_datetime_invalid", "Datetime is invalid.");
  }
  return date.toISOString();
}

export function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

export function assertAllowed(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw createError(400, code, `Value "${value}" is not allowed.`);
  }
  return value;
}

export function dedupeStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))];
}

export function normalizePlainObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createError(400, code, `${code} must be an object.`);
  }
  return value;
}

export function normalizeObjectOrDefault(value) {
  if (value == null) {
    return {};
  }
  return normalizePlainObject(value, "plain_object_required");
}

export function normalizePermissionScope(value, fallbackScopeCode) {
  const normalized = normalizeObjectOrDefault(value);
  return {
    scopeCode: assertAllowed(
      normalizeEnumValue(normalized.scopeCode || fallbackScopeCode || "company", "search_visibility_scope_required"),
      SEARCH_VISIBILITY_SCOPES,
      "search_visibility_scope_invalid"
    ),
    ownerUserId: normalizeOptionalText(normalized.ownerUserId),
    teamId: normalizeOptionalText(normalized.teamId)
  };
}

export function isVisible(permissionScope, viewerUserId, viewerTeamIds) {
  const scopeCode = normalizeEnumValue(permissionScope?.scopeCode || "company", "search_visibility_scope_required");
  if (scopeCode === "private") {
    return viewerUserId != null && permissionScope?.ownerUserId === viewerUserId;
  }
  if (scopeCode === "team") {
    return Boolean(permissionScope?.teamId) && viewerTeamIds.includes(permissionScope.teamId);
  }
  return true;
}

export function isSavedViewVisible(savedView, viewerUserId, viewerTeamIds) {
  if (savedView.visibilityCode === "private") {
    return savedView.ownerUserId === viewerUserId;
  }
  if (savedView.visibilityCode === "team") {
    return savedView.ownerUserId === viewerUserId || (savedView.sharedWithTeamId && viewerTeamIds.includes(savedView.sharedWithTeamId));
  }
  return true;
}

export function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

export function documentRegistryKey(companyId, projectionCode, objectId) {
  return `${companyId}::${projectionCode}::${objectId}`;
}

export function hashObject(value) {
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

export function nowIso(clock) {
  return new Date(clock()).toISOString();
}

export function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function newId() {
  return crypto.randomUUID();
}
