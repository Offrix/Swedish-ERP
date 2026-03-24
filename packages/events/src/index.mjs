import crypto from "node:crypto";

export const EVENT_ENVELOPE_VERSION = 1;
export const AUDIT_EVENT_VERSION = 1;

const AUDIT_RESULTS = new Set(["success", "blocked", "failed"]);

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
  result,
  actorId,
  companyId,
  recordedAt = new Date(),
  entityType,
  entityId,
  explanation,
  correlationId
} = {}) {
  const normalizedResult = requireText(result, "result");
  if (!AUDIT_RESULTS.has(normalizedResult)) {
    throw new TypeError(`result must be one of: ${[...AUDIT_RESULTS].join(", ")}.`);
  }

  return Object.freeze({
    auditId: requireText(auditId, "auditId"),
    action: requireText(action, "action"),
    result: normalizedResult,
    actorId: requireText(actorId, "actorId"),
    companyId: requireText(companyId, "companyId"),
    recordedAt: normalizeIsoTimestamp(recordedAt, "recordedAt"),
    entityType: requireText(entityType, "entityType"),
    entityId: requireText(entityId, "entityId"),
    explanation: requireText(explanation, "explanation"),
    correlationId: requireText(correlationId, "correlationId")
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
      && typeof value.action === "string"
      && typeof value.result === "string"
      && AUDIT_RESULTS.has(value.result)
      && typeof value.actorId === "string"
      && typeof value.companyId === "string"
      && typeof value.recordedAt === "string"
      && typeof value.entityType === "string"
      && typeof value.entityId === "string"
      && typeof value.explanation === "string"
      && typeof value.correlationId === "string"
  );
}
