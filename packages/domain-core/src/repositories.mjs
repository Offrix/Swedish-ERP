import crypto from "node:crypto";
import { EVENT_ENVELOPE_VERSION } from "../../events/src/index.mjs";
import { cloneValue as clone } from "./clone.mjs";

export const CORE_CANONICAL_REPOSITORY_TABLE = "core_domain_records";
export const COMMAND_RECEIPT_STATUSES = Object.freeze(["accepted", "duplicate", "replayed"]);
export const OUTBOX_MESSAGE_STATUSES = Object.freeze(["pending", "published"]);
export const INBOX_MESSAGE_STATUSES = Object.freeze(["recorded", "processed", "rejected"]);
export const DOMAIN_EVENT_RECORD_STATUSES = Object.freeze(["recorded"]);
export const EVIDENCE_REF_RECORD_STATUSES = Object.freeze(["recorded"]);

export const CORE_CANONICAL_REPOSITORY_OBJECT_TYPES = Object.freeze({
  portfolios: "bureau_portfolio_membership",
  requests: "bureau_client_request",
  approvals: "bureau_approval_package",
  workItems: "bureau_work_item",
  operationalWorkItems: "operational_work_item",
  comments: "core_comment",
  closeChecklists: "close_checklist",
  closeBlockers: "close_blocker",
  closeSignoffs: "close_signoff",
  closeReopenRequests: "close_reopen_request",
  supportCases: "support_case",
  impersonationSessions: "impersonation_session",
  accessReviewBatches: "access_review_batch",
  adminDiagnostics: "admin_diagnostic",
  breakGlassSessions: "break_glass_session",
  featureFlags: "feature_flag",
  emergencyDisables: "emergency_disable",
  loadProfiles: "load_profile",
  restoreDrills: "restore_drill",
  chaosScenarios: "chaos_scenario",
  auditCorrelations: "audit_correlation",
  incidentSignals: "incident_signal",
  runtimeIncidents: "runtime_incident",
  runtimeIncidentEvents: "runtime_incident_event",
  runtimeIncidentPostReviews: "runtime_incident_post_review",
  runtimeRestorePlans: "runtime_restore_plan",
  mappingSets: "mapping_set",
  importBatches: "import_batch",
  migrationCorrections: "migration_correction",
  diffReports: "diff_report",
  cutoverPlans: "cutover_plan",
  migrationAcceptanceRecords: "migration_acceptance_record",
  postCutoverCorrectionCases: "post_cutover_correction_case",
  payrollMigrationBatches: "payroll_migration_batch",
  employeeMigrationRecords: "employee_migration_record",
  balanceBaselines: "balance_baseline",
  payrollMigrationDiffs: "payroll_migration_diff",
  payrollMigrationApprovals: "payroll_migration_approval"
});

const CORE_BOUNDED_CONTEXT_CODE = "core";


function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function optionalText(value, fieldName) {
  if (value == null) {
    return null;
  }
  return text(value, fieldName);
}

function positiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function assertAllowed(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new TypeError(`${fieldName} must be one of ${allowedValues.join(", ")}.`);
  }
  return value;
}

function normalizeStatus(value, payload) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof payload?.status === "string" && payload.status.trim().length > 0) {
    return payload.status.trim();
  }
  return null;
}

function normalizeTimestamp(value) {
  const candidate = value == null ? new Date() : value;
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("recordedAt must be a valid timestamp.");
  }
  return date.toISOString();
}

function buildRecordKey({ tableName, boundedContextCode, objectType, companyId, objectId }) {
  return [tableName, boundedContextCode, objectType, companyId, objectId].join("::");
}

function buildCommandReceiptCommandKey({ companyId, commandType, commandId }) {
  return [companyId, commandType, commandId].join("::");
}

function buildCommandReceiptIdempotencyKey({ companyId, idempotencyKey }) {
  return [companyId, idempotencyKey].join("::");
}

function buildInboxKey({ companyId, sourceSystem, messageId }) {
  return [companyId, sourceSystem, messageId].join("::");
}

function buildDomainEventKey({ companyId, domainEventId }) {
  return [companyId, domainEventId].join("::");
}

function buildEvidenceRefKey({ companyId, evidenceRefId }) {
  return [companyId, evidenceRefId].join("::");
}

function toRepositoryObject(record) {
  if (!record) {
    return null;
  }
  return {
    tableName: record.tableName,
    boundedContextCode: record.boundedContextCode,
    objectType: record.objectType,
    companyId: record.companyId,
    objectId: record.objectId,
    status: record.status,
    payload: clone(record.payload),
    objectVersion: record.objectVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastActorId: record.lastActorId,
    lastCorrelationId: record.lastCorrelationId
  };
}

function toCommandReceiptObject(record) {
  if (!record) {
    return null;
  }
  return {
    commandReceiptId: record.commandReceiptId,
    companyId: record.companyId,
    commandType: record.commandType,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    commandId: record.commandId,
    idempotencyKey: record.idempotencyKey,
    expectedObjectVersion: record.expectedObjectVersion,
    resultingObjectVersion: record.resultingObjectVersion,
    actorId: record.actorId,
    sessionRevision: record.sessionRevision,
    correlationId: record.correlationId,
    causationId: record.causationId,
    payloadHash: record.payloadHash,
    commandPayload: clone(record.commandPayload),
    metadata: clone(record.metadata),
    status: record.status,
    recordedAt: record.recordedAt,
    processedAt: record.processedAt
  };
}

function toOutboxMessageObject(record) {
  if (!record) {
    return null;
  }
  return {
    eventEnvelopeVersion: record.eventEnvelopeVersion ?? EVENT_ENVELOPE_VERSION,
    eventId: record.eventId,
    companyId: record.companyId,
    eventType: record.eventType,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    commandReceiptId: record.commandReceiptId,
    payload: clone(record.payload),
    occurredAt: record.occurredAt,
    recordedAt: record.recordedAt,
    publishedAt: record.publishedAt,
    actorId: record.actorId,
    correlationId: record.correlationId,
    causationId: record.causationId,
    idempotencyKey: record.idempotencyKey,
    status: record.status
  };
}

function toInboxMessageObject(record) {
  if (!record) {
    return null;
  }
  return {
    inboxMessageId: record.inboxMessageId,
    companyId: record.companyId,
    sourceSystem: record.sourceSystem,
    messageId: record.messageId,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    payloadHash: record.payloadHash,
    payload: clone(record.payload),
    correlationId: record.correlationId,
    causationId: record.causationId,
    actorId: record.actorId,
    status: record.status,
    receivedAt: record.receivedAt,
    processedAt: record.processedAt,
    errorCode: record.errorCode
  };
}

function toDomainEventObject(record) {
  if (!record) {
    return null;
  }
  return {
    domainEventId: record.domainEventId,
    companyId: record.companyId,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    commandReceiptId: record.commandReceiptId,
    objectVersion: record.objectVersion,
    eventType: record.eventType,
    payload: clone(record.payload),
    actorId: record.actorId,
    correlationId: record.correlationId,
    causationId: record.causationId,
    status: record.status,
    recordedAt: record.recordedAt
  };
}

function toEvidenceRefObject(record) {
  if (!record) {
    return null;
  }
  return {
    evidenceRefId: record.evidenceRefId,
    companyId: record.companyId,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    commandReceiptId: record.commandReceiptId,
    domainEventId: record.domainEventId,
    evidenceRefType: record.evidenceRefType,
    evidenceRef: record.evidenceRef,
    metadata: clone(record.metadata),
    actorId: record.actorId,
    correlationId: record.correlationId,
    causationId: record.causationId,
    status: record.status,
    recordedAt: record.recordedAt
  };
}

export class CanonicalRepositoryConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CanonicalRepositoryConflictError";
    this.code = "canonical_repository_conflict";
    this.details = clone(details);
  }
}

function createConflictError({ tableName, boundedContextCode, objectType, companyId, objectId, expectedObjectVersion, actualObjectVersion, action }) {
  return new CanonicalRepositoryConflictError("Optimistic concurrency check failed.", {
    tableName,
    boundedContextCode,
    objectType,
    companyId,
    objectId,
    expectedObjectVersion: expectedObjectVersion == null ? null : Number(expectedObjectVersion),
    actualObjectVersion: actualObjectVersion == null ? null : Number(actualObjectVersion),
    action
  });
}

function createMemoryTransaction(records, commandReceipts, outboxMessages, inboxMessages, domainEvents, evidenceRefs) {
  function findCommandReceipt({ companyId, commandType = null, commandId = null, idempotencyKey = null }) {
    const normalizedCompanyId = text(companyId, "companyId");
    return [...commandReceipts.values()].find((candidate) =>
      candidate.companyId === normalizedCompanyId
      && (commandType ? candidate.commandType === text(commandType, "commandType") : true)
      && (commandId ? candidate.commandId === text(commandId, "commandId") : true)
      && (idempotencyKey ? candidate.idempotencyKey === text(idempotencyKey, "idempotencyKey") : true)
    ) || null;
  }

  return {
    kind: "memory_canonical_repository_transaction",

    async getRecord({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = CORE_BOUNDED_CONTEXT_CODE, objectType, companyId, objectId }) {
      const key = buildRecordKey({
        tableName,
        boundedContextCode,
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId")
      });
      return toRepositoryObject(records.get(key) || null);
    },

    async listRecords({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = CORE_BOUNDED_CONTEXT_CODE, objectType, companyId }) {
      const normalizedObjectType = text(objectType, "objectType");
      const normalizedCompanyId = text(companyId, "companyId");
      return [...records.values()]
        .filter((record) =>
          record.tableName === tableName
          && record.boundedContextCode === boundedContextCode
          && record.objectType === normalizedObjectType
          && record.companyId === normalizedCompanyId
        )
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt) || left.objectId.localeCompare(right.objectId))
        .map(toRepositoryObject);
    },

    async saveRecord({
      tableName = CORE_CANONICAL_REPOSITORY_TABLE,
      boundedContextCode = CORE_BOUNDED_CONTEXT_CODE,
      objectType,
      companyId,
      objectId,
      status = null,
      payload,
      expectedObjectVersion = null,
      actorId = null,
      correlationId = null,
      recordedAt = null
    }) {
      const normalizedObjectType = text(objectType, "objectType");
      const normalizedCompanyId = text(companyId, "companyId");
      const normalizedObjectId = text(objectId, "objectId");
      const key = buildRecordKey({
        tableName,
        boundedContextCode,
        objectType: normalizedObjectType,
        companyId: normalizedCompanyId,
        objectId: normalizedObjectId
      });
      const existing = records.get(key) || null;
      const normalizedRecordedAt = normalizeTimestamp(recordedAt);
      const normalizedPayload = clone(payload ?? {});
      const normalizedStatus = normalizeStatus(status, normalizedPayload);

      if (!existing) {
        if (![null, 0].includes(expectedObjectVersion)) {
          throw createConflictError({
            tableName,
            boundedContextCode,
            objectType: normalizedObjectType,
            companyId: normalizedCompanyId,
            objectId: normalizedObjectId,
            expectedObjectVersion,
            actualObjectVersion: null,
            action: "create"
          });
        }
        const created = {
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId: normalizedCompanyId,
          objectId: normalizedObjectId,
          status: normalizedStatus,
          payload: normalizedPayload,
          objectVersion: 1,
          createdAt: normalizedRecordedAt,
          updatedAt: normalizedRecordedAt,
          lastActorId: actorId ? text(actorId, "actorId") : null,
          lastCorrelationId: correlationId ? text(correlationId, "correlationId") : null
        };
        records.set(key, created);
        return toRepositoryObject(created);
      }

      if (expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.objectVersion)) {
        throw createConflictError({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId: normalizedCompanyId,
          objectId: normalizedObjectId,
          expectedObjectVersion,
          actualObjectVersion: existing.objectVersion,
          action: "update"
        });
      }

      const updated = {
        ...existing,
        status: normalizedStatus,
        payload: normalizedPayload,
        objectVersion: existing.objectVersion + 1,
        updatedAt: normalizedRecordedAt,
        lastActorId: actorId ? text(actorId, "actorId") : existing.lastActorId,
        lastCorrelationId: correlationId ? text(correlationId, "correlationId") : existing.lastCorrelationId
      };
      records.set(key, updated);
      return toRepositoryObject(updated);
    },

    async deleteRecord({
      tableName = CORE_CANONICAL_REPOSITORY_TABLE,
      boundedContextCode = CORE_BOUNDED_CONTEXT_CODE,
      objectType,
      companyId,
      objectId,
      expectedObjectVersion
    }) {
      const normalizedObjectType = text(objectType, "objectType");
      const normalizedCompanyId = text(companyId, "companyId");
      const normalizedObjectId = text(objectId, "objectId");
      const key = buildRecordKey({
        tableName,
        boundedContextCode,
        objectType: normalizedObjectType,
        companyId: normalizedCompanyId,
        objectId: normalizedObjectId
      });
      const existing = records.get(key) || null;
      if (!existing || expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.objectVersion)) {
        throw createConflictError({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId: normalizedCompanyId,
          objectId: normalizedObjectId,
          expectedObjectVersion,
          actualObjectVersion: existing?.objectVersion ?? null,
          action: "delete"
        });
      }
      records.delete(key);
      return toRepositoryObject(existing);
    },

    async getCommandReceipt({ companyId, commandType = null, commandId = null, idempotencyKey = null }) {
      return toCommandReceiptObject(findCommandReceipt({ companyId, commandType, commandId, idempotencyKey }));
    },

    async listCommandReceipts({ companyId, commandType = null }) {
      const normalizedCompanyId = text(companyId, "companyId");
      return [...commandReceipts.values()]
        .filter((candidate) => candidate.companyId === normalizedCompanyId)
        .filter((candidate) => (commandType ? candidate.commandType === text(commandType, "commandType") : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.commandReceiptId.localeCompare(right.commandReceiptId))
        .map(toCommandReceiptObject);
    },

    async appendCommandReceipt({
      companyId,
      commandType,
      aggregateType,
      aggregateId,
      commandId = crypto.randomUUID(),
      idempotencyKey,
      expectedObjectVersion = null,
      resultingObjectVersion = null,
      actorId,
      sessionRevision,
      correlationId,
      causationId = null,
      payloadHash,
      commandPayload,
      metadata = {},
      status = "accepted",
      recordedAt = null
    }) {
      const normalized = {
        companyId: text(companyId, "companyId"),
        commandType: text(commandType, "commandType"),
        aggregateType: text(aggregateType, "aggregateType"),
        aggregateId: text(aggregateId, "aggregateId"),
        commandId: text(commandId, "commandId"),
        idempotencyKey: text(idempotencyKey, "idempotencyKey"),
        actorId: text(actorId, "actorId"),
        sessionRevision: positiveInteger(sessionRevision, "sessionRevision"),
        correlationId: text(correlationId, "correlationId"),
        causationId: optionalText(causationId, "causationId"),
        payloadHash: text(payloadHash, "payloadHash"),
        commandPayload: clone(commandPayload ?? {}),
        metadata: clone(metadata || {}),
        status: assertAllowed(status, COMMAND_RECEIPT_STATUSES, "status"),
        recordedAt: normalizeTimestamp(recordedAt),
        expectedObjectVersion: expectedObjectVersion == null ? null : Number(expectedObjectVersion),
        resultingObjectVersion: resultingObjectVersion == null ? null : Number(resultingObjectVersion)
      };
      const existingByCommand = findCommandReceipt({
        companyId: normalized.companyId,
        commandType: normalized.commandType,
        commandId: normalized.commandId
      });
      const existingByIdempotency = findCommandReceipt({
        companyId: normalized.companyId,
        idempotencyKey: normalized.idempotencyKey
      });
      if (existingByCommand || existingByIdempotency) {
        throw createConflictError({
          tableName: "command_receipts",
          boundedContextCode: CORE_BOUNDED_CONTEXT_CODE,
          objectType: normalized.commandType,
          companyId: normalized.companyId,
          objectId: normalized.commandId,
          expectedObjectVersion: normalized.expectedObjectVersion,
          actualObjectVersion: existingByCommand?.resultingObjectVersion ?? existingByIdempotency?.resultingObjectVersion ?? null,
          action: "command_receipt_duplicate"
        });
      }
      const receipt = {
        commandReceiptId: crypto.randomUUID(),
        processedAt: normalized.recordedAt,
        ...normalized
      };
      commandReceipts.set(receipt.commandReceiptId, receipt);
      return toCommandReceiptObject(receipt);
    },

    async listOutboxMessages({ companyId, aggregateType = null, aggregateId = null, commandReceiptId = null, published = null }) {
      const normalizedCompanyId = text(companyId, "companyId");
      return [...outboxMessages.values()]
        .filter((candidate) => candidate.companyId === normalizedCompanyId)
        .filter((candidate) => (aggregateType ? candidate.aggregateType === text(aggregateType, "aggregateType") : true))
        .filter((candidate) => (aggregateId ? candidate.aggregateId === text(aggregateId, "aggregateId") : true))
        .filter((candidate) => (commandReceiptId ? candidate.commandReceiptId === text(commandReceiptId, "commandReceiptId") : true))
        .filter((candidate) => (published == null ? true : published ? Boolean(candidate.publishedAt) : !candidate.publishedAt))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.eventId.localeCompare(right.eventId))
        .map(toOutboxMessageObject);
    },

    async enqueueOutboxMessage({
      eventId = crypto.randomUUID(),
      companyId,
      eventType,
      aggregateType,
      aggregateId,
      commandReceiptId = null,
      payload,
      occurredAt = null,
      recordedAt = null,
      actorId,
      correlationId,
      causationId = null,
      idempotencyKey = null
    }) {
      const normalizedRecordedAt = normalizeTimestamp(recordedAt);
      const normalizedOccurredAt = normalizeTimestamp(occurredAt || normalizedRecordedAt);
      const message = {
        eventId: text(eventId, "eventId"),
        companyId: text(companyId, "companyId"),
        eventType: text(eventType, "eventType"),
        aggregateType: text(aggregateType, "aggregateType"),
        aggregateId: text(aggregateId, "aggregateId"),
        commandReceiptId: optionalText(commandReceiptId, "commandReceiptId"),
        payload: clone(payload ?? {}),
        occurredAt: normalizedOccurredAt,
        recordedAt: normalizedRecordedAt,
        publishedAt: null,
        actorId: text(actorId, "actorId"),
        correlationId: text(correlationId, "correlationId"),
        causationId: optionalText(causationId, "causationId"),
        idempotencyKey: optionalText(idempotencyKey, "idempotencyKey"),
        status: "pending"
      };
      outboxMessages.set(message.eventId, message);
      return toOutboxMessageObject(message);
    },

    async markOutboxMessagePublished({ eventId, publishedAt = null }) {
      const message = outboxMessages.get(text(eventId, "eventId"));
      if (!message) {
        return null;
      }
      message.publishedAt = normalizeTimestamp(publishedAt);
      message.status = "published";
      return toOutboxMessageObject(message);
    },

    async getInboxMessage({ companyId, sourceSystem, messageId }) {
      const key = buildInboxKey({
        companyId: text(companyId, "companyId"),
        sourceSystem: text(sourceSystem, "sourceSystem"),
        messageId: text(messageId, "messageId")
      });
      return toInboxMessageObject(inboxMessages.get(key) || null);
    },

    async listInboxMessages({ companyId, sourceSystem = null, status = null }) {
      const normalizedCompanyId = text(companyId, "companyId");
      return [...inboxMessages.values()]
        .filter((candidate) => candidate.companyId === normalizedCompanyId)
        .filter((candidate) => (sourceSystem ? candidate.sourceSystem === text(sourceSystem, "sourceSystem") : true))
        .filter((candidate) => (status ? candidate.status === assertAllowed(status, INBOX_MESSAGE_STATUSES, "status") : true))
        .sort((left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.inboxMessageId.localeCompare(right.inboxMessageId))
        .map(toInboxMessageObject);
    },

    async recordInboxMessage({
      companyId,
      sourceSystem,
      messageId,
      aggregateType = null,
      aggregateId = null,
      payloadHash,
      payload,
      correlationId = null,
      causationId = null,
      actorId = null,
      status = "recorded",
      receivedAt = null
    }) {
      const normalized = {
        companyId: text(companyId, "companyId"),
        sourceSystem: text(sourceSystem, "sourceSystem"),
        messageId: text(messageId, "messageId"),
        aggregateType: optionalText(aggregateType, "aggregateType"),
        aggregateId: optionalText(aggregateId, "aggregateId"),
        payloadHash: text(payloadHash, "payloadHash"),
        payload: clone(payload ?? {}),
        correlationId: optionalText(correlationId, "correlationId"),
        causationId: optionalText(causationId, "causationId"),
        actorId: optionalText(actorId, "actorId"),
        status: assertAllowed(status, INBOX_MESSAGE_STATUSES, "status"),
        receivedAt: normalizeTimestamp(receivedAt),
        processedAt: null,
        errorCode: null
      };
      const key = buildInboxKey(normalized);
      const existing = inboxMessages.get(key) || null;
      if (existing) {
        return toInboxMessageObject(existing);
      }
      const message = {
        inboxMessageId: crypto.randomUUID(),
        ...normalized
      };
      inboxMessages.set(key, message);
      return toInboxMessageObject(message);
    },

    async markInboxMessageProcessed({ inboxMessageId, processedAt = null, status = "processed", errorCode = null }) {
      const message = [...inboxMessages.values()].find((candidate) => candidate.inboxMessageId === text(inboxMessageId, "inboxMessageId")) || null;
      if (!message) {
        return null;
      }
      message.status = assertAllowed(status, INBOX_MESSAGE_STATUSES, "status");
      message.processedAt = normalizeTimestamp(processedAt);
      message.errorCode = optionalText(errorCode, "errorCode");
      return toInboxMessageObject(message);
    },

    async listDomainEvents({ companyId, aggregateType = null, aggregateId = null, commandReceiptId = null } = {}) {
      const normalizedCompanyId = text(companyId, "companyId");
      return [...domainEvents.values()]
        .filter((candidate) => candidate.companyId === normalizedCompanyId)
        .filter((candidate) => (aggregateType ? candidate.aggregateType === text(aggregateType, "aggregateType") : true))
        .filter((candidate) => (aggregateId ? candidate.aggregateId === text(aggregateId, "aggregateId") : true))
        .filter((candidate) => (commandReceiptId ? candidate.commandReceiptId === text(commandReceiptId, "commandReceiptId") : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.domainEventId.localeCompare(right.domainEventId))
        .map(toDomainEventObject);
    },

    async appendDomainEvent({
      domainEventId = crypto.randomUUID(),
      companyId,
      aggregateType,
      aggregateId,
      commandReceiptId = null,
      objectVersion = null,
      eventType,
      payload,
      actorId,
      correlationId,
      causationId = null,
      status = "recorded",
      recordedAt = null
    } = {}) {
      const event = {
        domainEventId: text(domainEventId, "domainEventId"),
        companyId: text(companyId, "companyId"),
        aggregateType: text(aggregateType, "aggregateType"),
        aggregateId: text(aggregateId, "aggregateId"),
        commandReceiptId: optionalText(commandReceiptId, "commandReceiptId"),
        objectVersion: objectVersion == null ? null : Number(objectVersion),
        eventType: text(eventType, "eventType"),
        payload: clone(payload ?? {}),
        actorId: text(actorId, "actorId"),
        correlationId: text(correlationId, "correlationId"),
        causationId: optionalText(causationId, "causationId"),
        status: assertAllowed(status, DOMAIN_EVENT_RECORD_STATUSES, "status"),
        recordedAt: normalizeTimestamp(recordedAt)
      };
      domainEvents.set(
        buildDomainEventKey({ companyId: event.companyId, domainEventId: event.domainEventId }),
        event
      );
      return toDomainEventObject(event);
    },

    async listEvidenceRefs({
      companyId,
      aggregateType = null,
      aggregateId = null,
      commandReceiptId = null,
      domainEventId = null,
      evidenceRefType = null
    } = {}) {
      const normalizedCompanyId = text(companyId, "companyId");
      return [...evidenceRefs.values()]
        .filter((candidate) => candidate.companyId === normalizedCompanyId)
        .filter((candidate) => (aggregateType ? candidate.aggregateType === text(aggregateType, "aggregateType") : true))
        .filter((candidate) => (aggregateId ? candidate.aggregateId === text(aggregateId, "aggregateId") : true))
        .filter((candidate) => (commandReceiptId ? candidate.commandReceiptId === text(commandReceiptId, "commandReceiptId") : true))
        .filter((candidate) => (domainEventId ? candidate.domainEventId === text(domainEventId, "domainEventId") : true))
        .filter((candidate) => (evidenceRefType ? candidate.evidenceRefType === text(evidenceRefType, "evidenceRefType") : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.evidenceRefId.localeCompare(right.evidenceRefId))
        .map(toEvidenceRefObject);
    },

    async appendEvidenceRef({
      evidenceRefId = crypto.randomUUID(),
      companyId,
      aggregateType,
      aggregateId,
      commandReceiptId = null,
      domainEventId = null,
      evidenceRefType,
      evidenceRef,
      metadata = {},
      actorId = null,
      correlationId = null,
      causationId = null,
      status = "recorded",
      recordedAt = null
    } = {}) {
      const record = {
        evidenceRefId: text(evidenceRefId, "evidenceRefId"),
        companyId: text(companyId, "companyId"),
        aggregateType: text(aggregateType, "aggregateType"),
        aggregateId: text(aggregateId, "aggregateId"),
        commandReceiptId: optionalText(commandReceiptId, "commandReceiptId"),
        domainEventId: optionalText(domainEventId, "domainEventId"),
        evidenceRefType: text(evidenceRefType, "evidenceRefType"),
        evidenceRef: text(evidenceRef, "evidenceRef"),
        metadata: clone(metadata || {}),
        actorId: optionalText(actorId, "actorId"),
        correlationId: optionalText(correlationId, "correlationId"),
        causationId: optionalText(causationId, "causationId"),
        status: assertAllowed(status, EVIDENCE_REF_RECORD_STATUSES, "status"),
        recordedAt: normalizeTimestamp(recordedAt)
      };
      evidenceRefs.set(
        buildEvidenceRefKey({ companyId: record.companyId, evidenceRefId: record.evidenceRefId }),
        record
      );
      return toEvidenceRefObject(record);
    }
  };
}

export function createInMemoryCanonicalRepositoryStore() {
  const records = new Map();
  const commandReceipts = new Map();
  const outboxMessages = new Map();
  const inboxMessages = new Map();
  const domainEvents = new Map();
  const evidenceRefs = new Map();

  return {
    kind: "memory_canonical_repository_store",

    async close() {},

    async withTransaction(work) {
      const transactionalRecords = new Map();
      for (const [key, value] of records.entries()) {
        transactionalRecords.set(key, clone(value));
      }
      const transactionalCommandReceipts = new Map();
      for (const [key, value] of commandReceipts.entries()) {
        transactionalCommandReceipts.set(key, clone(value));
      }
      const transactionalOutboxMessages = new Map();
      for (const [key, value] of outboxMessages.entries()) {
        transactionalOutboxMessages.set(key, clone(value));
      }
      const transactionalInboxMessages = new Map();
      for (const [key, value] of inboxMessages.entries()) {
        transactionalInboxMessages.set(key, clone(value));
      }
      const transactionalDomainEvents = new Map();
      for (const [key, value] of domainEvents.entries()) {
        transactionalDomainEvents.set(key, clone(value));
      }
      const transactionalEvidenceRefs = new Map();
      for (const [key, value] of evidenceRefs.entries()) {
        transactionalEvidenceRefs.set(key, clone(value));
      }
      const transaction = createMemoryTransaction(
        transactionalRecords,
        transactionalCommandReceipts,
        transactionalOutboxMessages,
        transactionalInboxMessages,
        transactionalDomainEvents,
        transactionalEvidenceRefs
      );
      const result = await work(transaction);
      records.clear();
      for (const [key, value] of transactionalRecords.entries()) {
        records.set(key, value);
      }
      commandReceipts.clear();
      for (const [key, value] of transactionalCommandReceipts.entries()) {
        commandReceipts.set(key, value);
      }
      outboxMessages.clear();
      for (const [key, value] of transactionalOutboxMessages.entries()) {
        outboxMessages.set(key, value);
      }
      inboxMessages.clear();
      for (const [key, value] of transactionalInboxMessages.entries()) {
        inboxMessages.set(key, value);
      }
      domainEvents.clear();
      for (const [key, value] of transactionalDomainEvents.entries()) {
        domainEvents.set(key, value);
      }
      evidenceRefs.clear();
      for (const [key, value] of transactionalEvidenceRefs.entries()) {
        evidenceRefs.set(key, value);
      }
      return result;
    },

    snapshot() {
      return {
        records: [...records.values()].map(toRepositoryObject),
        commandReceipts: [...commandReceipts.values()].map(toCommandReceiptObject),
        outboxMessages: [...outboxMessages.values()].map(toOutboxMessageObject),
        inboxMessages: [...inboxMessages.values()].map(toInboxMessageObject),
        domainEvents: [...domainEvents.values()].map(toDomainEventObject),
        evidenceRefs: [...evidenceRefs.values()].map(toEvidenceRefObject)
      };
    }
  };
}

function createRepositoryExecutor({ store = null, transaction = null }) {
  if (transaction) {
    return async (work) => work(transaction);
  }
  if (!store || typeof store.withTransaction !== "function") {
    throw new TypeError("A canonical repository store or transaction is required.");
  }
  return async (work) => store.withTransaction(work);
}

export function createCanonicalJsonRepository({
  store = null,
  transaction = null,
  tableName = CORE_CANONICAL_REPOSITORY_TABLE,
  boundedContextCode = CORE_BOUNDED_CONTEXT_CODE,
  objectType
}) {
  const normalizedObjectType = text(objectType, "objectType");
  const execute = createRepositoryExecutor({ store, transaction });

  return {
    tableName,
    boundedContextCode,
    objectType: normalizedObjectType,

    async get({ companyId, objectId }) {
      return execute((tx) =>
        tx.getRecord({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId,
          objectId
        })
      );
    },

    async list({ companyId }) {
      return execute((tx) =>
        tx.listRecords({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId
        })
      );
    },

    async save({
      companyId,
      objectId,
      status = null,
      payload,
      expectedObjectVersion = null,
      actorId = null,
      correlationId = crypto.randomUUID(),
      recordedAt = null
    }) {
      return execute((tx) =>
        tx.saveRecord({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId,
          objectId,
          status,
          payload,
          expectedObjectVersion,
          actorId,
          correlationId,
          recordedAt
        })
      );
    },

    async delete({ companyId, objectId, expectedObjectVersion }) {
      return execute((tx) =>
        tx.deleteRecord({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId,
          objectId,
          expectedObjectVersion
        })
      );
    }
  };
}

function normalizeRepositoryObjectTypes(objectTypes) {
  if (!objectTypes || typeof objectTypes !== "object" || Array.isArray(objectTypes)) {
    throw new TypeError("objectTypes must be a plain object keyed by repository name.");
  }

  const entries = Object.entries(objectTypes).map(([repositoryKey, objectType]) => [
    text(repositoryKey, "repositoryKey"),
    text(objectType, `objectType:${repositoryKey}`)
  ]);

  if (entries.length === 0) {
    throw new TypeError("objectTypes must contain at least one repository definition.");
  }

  return entries;
}

export function createBoundedContextCanonicalRepositories({
  store = null,
  transaction = null,
  tableName = CORE_CANONICAL_REPOSITORY_TABLE,
  boundedContextCode,
  objectTypes
} = {}) {
  const normalizedBoundedContextCode = text(
    boundedContextCode,
    "boundedContextCode"
  );
  const normalizedObjectTypes = normalizeRepositoryObjectTypes(objectTypes);

  return Object.fromEntries(
    normalizedObjectTypes.map(([key, objectType]) => [
      key,
      createCanonicalJsonRepository({
        store,
        transaction,
        tableName,
        boundedContextCode: normalizedBoundedContextCode,
        objectType
      })
    ])
  );
}

export function createCoreCanonicalRepositories({ store = null, transaction = null } = {}) {
  return createBoundedContextCanonicalRepositories({
    store,
    transaction,
    tableName: CORE_CANONICAL_REPOSITORY_TABLE,
    boundedContextCode: CORE_BOUNDED_CONTEXT_CODE,
    objectTypes: CORE_CANONICAL_REPOSITORY_OBJECT_TYPES
  });
}
