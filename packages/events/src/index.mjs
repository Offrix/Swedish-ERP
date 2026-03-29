import crypto from "node:crypto";
import { cloneValue as clone } from "../../domain-core/src/clone.mjs";

export const EVENT_ENVELOPE_VERSION = 1;
export const AUDIT_EVENT_VERSION = 2;

const AUDIT_RESULTS = new Set(["success", "blocked", "failed"]);
const AUDIT_ACTOR_TYPES = new Set(["user", "system", "support", "service"]);
const AUDIT_RESERVED_KEYS = new Set([
  "auditId",
  "auditEventId",
  "auditEnvelopeVersion",
  "action",
  "result",
  "actorId",
  "actorType",
  "sessionId",
  "companyId",
  "recordedAt",
  "entityType",
  "entityId",
  "explanation",
  "correlationId",
  "causationId",
  "auditClass",
  "metadata",
  "integrityHash"
]);

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function optionalText(value, fieldName) {
  if (value == null) {
    return undefined;
  }
  return requireText(value, fieldName);
}

function normalizeIsoTimestamp(value, fieldName) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${fieldName} must be a valid ISO timestamp or Date.`);
  }
  return date.toISOString();
}

function requirePayload(payload) {
  if (payload === undefined) {
    throw new TypeError("payload is required.");
  }
  return payload;
}

export function createEventEnvelope({
  eventId = crypto.randomUUID(),
  eventType,
  aggregateType,
  aggregateId,
  occurredAt = new Date(),
  recordedAt = occurredAt,
  companyId,
  actorId,
  correlationId,
  causationId = undefined,
  idempotencyKey = undefined,
  payload
} = {}) {
  return Object.freeze({
    eventId: requireText(eventId, "eventId"),
    eventType: requireText(eventType, "eventType"),
    aggregateType: requireText(aggregateType, "aggregateType"),
    aggregateId: requireText(aggregateId, "aggregateId"),
    occurredAt: normalizeIsoTimestamp(occurredAt, "occurredAt"),
    recordedAt: normalizeIsoTimestamp(recordedAt, "recordedAt"),
    companyId: requireText(companyId, "companyId"),
    actorId: requireText(actorId, "actorId"),
    correlationId: requireText(correlationId, "correlationId"),
    ...(causationId ? { causationId: optionalText(causationId, "causationId") } : {}),
    ...(idempotencyKey ? { idempotencyKey: optionalText(idempotencyKey, "idempotencyKey") } : {}),
    payload: requirePayload(payload)
  });
}

export function createAuditEnvelope({
  auditId = crypto.randomUUID(),
  action,
  result = "success",
  actorId,
  actorType = defaultActorType(actorId),
  sessionId = undefined,
  companyId,
  recordedAt = new Date(),
  entityType,
  entityId,
  explanation,
  correlationId,
  causationId = undefined,
  auditClass = "domain_action",
  metadata = {}
} = {}) {
  const { canonicalResult, legacyResult } = normalizeAuditResult(result);
  const normalizedActorType = requireText(actorType, "actorType");
  if (!AUDIT_ACTOR_TYPES.has(normalizedActorType)) {
    throw new TypeError(`actorType must be one of: ${[...AUDIT_ACTOR_TYPES].join(", ")}.`);
  }

  const normalizedMetadata = clone(metadata);
  if (legacyResult && normalizedMetadata.legacyResult === undefined) {
    normalizedMetadata.legacyResult = legacyResult;
  }

  const envelope = {
    auditId: requireText(auditId, "auditId"),
    auditEventId: requireText(auditId, "auditId"),
    auditEnvelopeVersion: AUDIT_EVENT_VERSION,
    action: requireText(action, "action"),
    result: canonicalResult,
    actorId: requireText(actorId, "actorId"),
    actorType: normalizedActorType,
    ...(sessionId ? { sessionId: optionalText(sessionId, "sessionId") } : {}),
    companyId: requireText(companyId, "companyId"),
    recordedAt: normalizeIsoTimestamp(recordedAt, "recordedAt"),
    entityType: requireText(entityType, "entityType"),
    entityId: requireText(entityId, "entityId"),
    explanation: requireText(explanation, "explanation"),
    correlationId: requireText(correlationId, "correlationId"),
    ...(causationId ? { causationId: optionalText(causationId, "causationId") } : {}),
    auditClass: requireText(auditClass, "auditClass"),
    metadata: normalizedMetadata
  };

  return Object.freeze({
    ...envelope,
    ...flattenMetadataAliases(normalizedMetadata),
    integrityHash: hashEnvelope(envelope)
  });
}

export function createAuditEnvelopeFromLegacyEvent({
  event = {},
  clock = () => new Date(),
  auditClass = "domain_action",
  actorType = undefined,
  sessionId = undefined
} = {}) {
  if (!event || typeof event !== "object") {
    throw new TypeError("event is required.");
  }

  const {
    auditId,
    auditEventId,
    companyId,
    actorId,
    action,
    result = "success",
    entityType,
    entityId,
    explanation,
    correlationId,
    causationId = undefined,
    recordedAt,
    createdAt,
    occurredAt,
    metadata = {},
    ...legacyExtras
  } = event;

  return createAuditEnvelope({
    auditId: auditId || auditEventId || crypto.randomUUID(),
    action,
    result,
    actorId,
    actorType,
    sessionId: event.sessionId || sessionId,
    companyId,
    recordedAt: recordedAt || createdAt || occurredAt || clock(),
    entityType,
    entityId,
    explanation: normalizeLegacyAuditExplanation({ action, entityType, entityId, explanation }),
    correlationId: correlationId || crypto.randomUUID(),
    causationId,
    auditClass,
    metadata: {
      ...clone(legacyExtras),
      ...clone(metadata)
    }
  });
}

export function isEventEnvelope(value) {
  return Boolean(
    value
      && typeof value === "object"
      && typeof value.eventId === "string"
      && typeof value.eventType === "string"
      && typeof value.aggregateType === "string"
      && typeof value.aggregateId === "string"
      && typeof value.occurredAt === "string"
      && typeof value.recordedAt === "string"
      && typeof value.companyId === "string"
      && typeof value.actorId === "string"
      && typeof value.correlationId === "string"
      && "payload" in value
  );
}

export function isAuditEnvelope(value) {
  return Boolean(
    value
      && typeof value === "object"
      && typeof value.auditId === "string"
      && typeof value.auditEventId === "string"
      && typeof value.auditEnvelopeVersion === "number"
      && typeof value.action === "string"
      && typeof value.result === "string"
      && AUDIT_RESULTS.has(value.result)
      && typeof value.actorId === "string"
      && typeof value.actorType === "string"
      && typeof value.companyId === "string"
      && typeof value.recordedAt === "string"
      && typeof value.entityType === "string"
      && typeof value.entityId === "string"
      && typeof value.explanation === "string"
      && typeof value.correlationId === "string"
      && typeof value.auditClass === "string"
      && typeof value.integrityHash === "string"
  );
}

function defaultActorType(actorId) {
  return requireText(actorId, "actorId") === "system" ? "system" : "user";
}


function flattenMetadataAliases(metadata) {
  return Object.fromEntries(
    Object.entries(metadata || {}).filter(([key]) => !AUDIT_RESERVED_KEYS.has(key))
  );
}

function normalizeLegacyAuditExplanation({ action, entityType, entityId, explanation }) {
  if (typeof explanation === "string" && explanation.trim().length > 0) {
    return explanation.trim();
  }
  return `${requireText(action, "action")} for ${requireText(entityType, "entityType")} ${requireText(entityId, "entityId")}.`;
}

function normalizeAuditResult(result) {
  const rawResult = requireText(result, "result").toLowerCase();
  if (AUDIT_RESULTS.has(rawResult)) {
    return {
      canonicalResult: rawResult,
      legacyResult: null
    };
  }
  if (["pending", "warning", "created", "updated", "clean"].includes(rawResult)) {
    return {
      canonicalResult: "success",
      legacyResult: rawResult
    };
  }
  if (["denied"].includes(rawResult)) {
    return {
      canonicalResult: "blocked",
      legacyResult: rawResult
    };
  }
  if (["error"].includes(rawResult)) {
    return {
      canonicalResult: "failed",
      legacyResult: rawResult
    };
  }
  throw new TypeError(`result must be one of: ${[...AUDIT_RESULTS].join(", ")}.`);
}

function hashEnvelope(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, sortDeep(value[key])])
    );
  }
  return value;
}
