import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  EVENT_ENVELOPE_VERSION,
  createCommandEnvelope,
  createReceiptEnvelope
} from "../../events/src/index.mjs";
import {
  cloneSnapshotValue,
  deserializeSnapshotValue,
  serializeSnapshotValue
} from "./clone.mjs";

export const CRITICAL_DOMAIN_STATE_TABLE = "critical_domain_state_snapshots";
export const CRITICAL_DOMAIN_STATE_SCHEMA_VERSION = 1;
export const CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE = "critical_domain_command_receipts";
export const CRITICAL_DOMAIN_DOMAIN_EVENT_TABLE = "critical_domain_domain_events";
export const CRITICAL_DOMAIN_OUTBOX_MESSAGE_TABLE = "critical_domain_outbox_messages";
export const CRITICAL_DOMAIN_EVIDENCE_REF_TABLE = "critical_domain_evidence_refs";
export const SQLITE_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT = Object.freeze({
  tables: Object.freeze({
    critical_domain_state_snapshots: Object.freeze({
      columns: Object.freeze([
        "domain_key",
        "schema_version",
        "snapshot_json",
        "snapshot_hash",
        "persisted_at",
        "object_version",
        "durability_policy",
        "adapter_kind"
      ])
    }),
    critical_domain_command_receipts: Object.freeze({
      columns: Object.freeze([
        "command_receipt_id",
        "domain_key",
        "company_id",
        "command_type",
        "aggregate_type",
        "aggregate_id",
        "command_id",
        "idempotency_key",
        "expected_object_version",
        "resulting_object_version",
        "actor_id",
        "session_revision",
        "correlation_id",
        "causation_id",
        "payload_hash",
        "command_payload_json",
        "metadata_json",
        "status",
        "recorded_at",
        "processed_at"
      ]),
      indexes: Object.freeze([
        "critical_domain_command_receipts_company_recorded_idx"
      ])
    }),
    critical_domain_domain_events: Object.freeze({
      columns: Object.freeze([
        "domain_event_id",
        "domain_key",
        "company_id",
        "aggregate_type",
        "aggregate_id",
        "command_receipt_id",
        "object_version",
        "event_type",
        "payload_json",
        "actor_id",
        "correlation_id",
        "causation_id",
        "status",
        "recorded_at"
      ]),
      indexes: Object.freeze([
        "critical_domain_domain_events_company_recorded_idx",
        "critical_domain_domain_events_receipt_idx"
      ])
    }),
    critical_domain_outbox_messages: Object.freeze({
      columns: Object.freeze([
        "outbox_message_id",
        "domain_key",
        "company_id",
        "aggregate_type",
        "aggregate_id",
        "command_receipt_id",
        "event_type",
        "payload_json",
        "actor_id",
        "correlation_id",
        "causation_id",
        "idempotency_key",
        "status",
        "recorded_at",
        "published_at"
      ]),
      indexes: Object.freeze([
        "critical_domain_outbox_messages_company_recorded_idx",
        "critical_domain_outbox_messages_receipt_idx"
      ])
    }),
    critical_domain_evidence_refs: Object.freeze({
      columns: Object.freeze([
        "evidence_ref_id",
        "domain_key",
        "company_id",
        "aggregate_type",
        "aggregate_id",
        "command_receipt_id",
        "domain_event_id",
        "evidence_ref_type",
        "evidence_ref",
        "metadata_json",
        "actor_id",
        "correlation_id",
        "causation_id",
        "status",
        "recorded_at"
      ]),
      indexes: Object.freeze([
        "critical_domain_evidence_refs_company_recorded_idx",
        "critical_domain_evidence_refs_receipt_idx"
      ])
    })
  })
});

export class CriticalDomainStateConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CriticalDomainStateConflictError";
    this.code = "critical_domain_state_conflict";
    this.details = cloneSnapshotValue(details);
  }
}

function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function normalizeTimestamp(value = null) {
  const candidate = value == null ? new Date() : new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    throw new TypeError("persistedAt must be a valid timestamp.");
  }
  return candidate.toISOString();
}

function hashSnapshot(snapshot) {
  return crypto.createHash("sha256").update(JSON.stringify(serializeSnapshotValue(snapshot ?? null))).digest("hex");
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(serializeSnapshotValue(payload ?? null))).digest("hex");
}

function normalizeExpectedObjectVersion(value) {
  if (value == null) {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new TypeError("expectedObjectVersion must be a non-negative integer.");
  }
  return normalized;
}

function normalizeObjectVersion(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError("objectVersion must be a positive integer.");
  }
  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function optionalText(value, fieldName) {
  if (value == null) {
    return null;
  }
  return text(value, fieldName);
}

function createConflictError({ domainKey, expectedObjectVersion, actualObjectVersion, action }) {
  return new CriticalDomainStateConflictError("Critical domain state optimistic concurrency check failed.", {
    domainKey,
    expectedObjectVersion,
    actualObjectVersion,
    action
  });
}

function buildCommandReceiptCommandKey({ companyId, commandType, commandId }) {
  return [companyId, commandType, commandId].join("::");
}

function buildCommandReceiptIdempotencyKey({ companyId, idempotencyKey }) {
  return [companyId, idempotencyKey].join("::");
}

function mapCommandReceiptRecord(record) {
  if (!record) {
    return null;
  }
  return cloneSnapshotValue(record);
}

function mapDomainEventRecord(record) {
  if (!record) {
    return null;
  }
  return cloneSnapshotValue(record);
}

function mapOutboxMessageRecord(record) {
  if (!record) {
    return null;
  }
  return {
    eventEnvelopeVersion: record.eventEnvelopeVersion ?? EVENT_ENVELOPE_VERSION,
    ...cloneSnapshotValue(record)
  };
}

function mapEvidenceRefRecord(record) {
  if (!record) {
    return null;
  }
  return cloneSnapshotValue(record);
}

export function createCriticalDomainCommandEnvelope({
  commandId,
  commandType,
  aggregateType,
  aggregateId,
  companyId,
  actorId,
  sessionRevision,
  correlationId,
  causationId = null,
  idempotencyKey,
  recordedAt,
  commandPayload = {},
  payloadHash,
  metadata = {}
}) {
  return createCommandEnvelope({
    commandId,
    commandType,
    aggregateType,
    aggregateId,
    companyId,
    actorId,
    sessionRevision,
    correlationId,
    causationId: causationId || undefined,
    idempotencyKey,
    recordedAt,
    commandPayload,
    payloadHash,
    metadata
  });
}

export function createCriticalDomainReceiptEnvelope({
  commandReceipt,
  domainEvents = [],
  outboxMessages = [],
  evidenceRefs = [],
  status = null
}) {
  return createReceiptEnvelope({
    receiptId: commandReceipt.commandReceiptId,
    receiptType: "command_receipt",
    status: status || commandReceipt.status,
    companyId: commandReceipt.companyId,
    actorId: commandReceipt.actorId,
    correlationId: commandReceipt.correlationId,
    causationId: commandReceipt.causationId || undefined,
    idempotencyKey: commandReceipt.idempotencyKey,
    commandId: commandReceipt.commandId,
    commandType: commandReceipt.commandType,
    aggregateType: commandReceipt.aggregateType,
    aggregateId: commandReceipt.aggregateId,
    recordedAt: commandReceipt.processedAt || commandReceipt.recordedAt,
    payload: {
      commandReceiptId: commandReceipt.commandReceiptId,
      resultingObjectVersion: commandReceipt.resultingObjectVersion,
      domainEventCount: domainEvents.length,
      outboxMessageCount: outboxMessages.length,
      evidenceRefCount: evidenceRefs.length
    }
  });
}

export function createInMemoryCriticalDomainStateStore() {
  const records = new Map();
  const commandReceipts = new Map();
  const domainEvents = new Map();
  const outboxMessages = new Map();
  const evidenceRefs = new Map();

  return {
    kind: "memory_critical_domain_state_store",

    load(domainKey) {
      const record = records.get(text(domainKey, "domainKey")) || null;
      return record ? cloneSnapshotValue(record) : null;
    },

    save({
      domainKey,
      snapshot,
      expectedObjectVersion = null,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const normalizedExpectedObjectVersion = normalizeExpectedObjectVersion(expectedObjectVersion);
      const existingRecord = records.get(normalizedDomainKey) || null;
      if (
        existingRecord
        && normalizedExpectedObjectVersion !== null
        && normalizedExpectedObjectVersion !== existingRecord.objectVersion
      ) {
        throw createConflictError({
          domainKey: normalizedDomainKey,
          expectedObjectVersion: normalizedExpectedObjectVersion,
          actualObjectVersion: existingRecord.objectVersion,
          action: "update"
        });
      }
      if (!existingRecord && ![null, 0].includes(normalizedExpectedObjectVersion)) {
        throw createConflictError({
          domainKey: normalizedDomainKey,
          expectedObjectVersion: normalizedExpectedObjectVersion,
          actualObjectVersion: null,
          action: "create"
        });
      }
      const record = {
        domainKey: normalizedDomainKey,
        schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
        snapshot: cloneSnapshotValue(snapshot ?? {}),
        snapshotHash: hashSnapshot(snapshot),
        persistedAt: normalizeTimestamp(persistedAt),
        objectVersion: existingRecord ? existingRecord.objectVersion + 1 : 1,
        durabilityPolicy: optionalText(durabilityPolicy, "durabilityPolicy"),
        adapterKind: optionalText(adapterKind, "adapterKind")
      };
      records.set(normalizedDomainKey, record);
      return cloneSnapshotValue(record);
    },

    list() {
      return [...records.values()].map((record) => cloneSnapshotValue(record));
    },

    recordMutation({
      domainKey,
      companyId,
      commandType,
      aggregateType,
      aggregateId,
      commandId = crypto.randomUUID(),
      idempotencyKey = null,
      expectedObjectVersion = null,
      actorId = "system",
      sessionRevision = 1,
      correlationId = crypto.randomUUID(),
      causationId = null,
      commandPayload = {},
      metadata = {},
      domainEventRecords = [],
      outboxMessageRecords = [],
      evidenceRefRecords = [],
      snapshot,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const normalizedCompanyId = text(companyId, "companyId");
      const normalizedCommandType = text(commandType, "commandType");
      const normalizedAggregateType = text(aggregateType, "aggregateType");
      const normalizedAggregateId = text(aggregateId, "aggregateId");
      const normalizedCommandId = text(commandId, "commandId");
      const normalizedIdempotencyKey =
        optionalText(idempotencyKey, "idempotencyKey")
        || `${normalizedCommandType}:${normalizedCommandId}`;
      const normalizedExpectedObjectVersion = normalizeExpectedObjectVersion(expectedObjectVersion);
      const normalizedActorId = text(actorId, "actorId");
      const normalizedSessionRevision = normalizePositiveInteger(sessionRevision, "sessionRevision");
      const normalizedCorrelationId = text(correlationId, "correlationId");
      const normalizedCausationId = optionalText(causationId, "causationId");
      const normalizedRecordedAt = normalizeTimestamp(persistedAt);
      const existingByCommand = commandReceipts.get(
        buildCommandReceiptCommandKey({
          companyId: normalizedCompanyId,
          commandType: normalizedCommandType,
          commandId: normalizedCommandId
        })
      ) || null;
      const existingByIdempotency = commandReceipts.get(
        buildCommandReceiptIdempotencyKey({
          companyId: normalizedCompanyId,
          idempotencyKey: normalizedIdempotencyKey
        })
      ) || null;
      if (existingByCommand || existingByIdempotency) {
        const existingReceipt = existingByCommand || existingByIdempotency;
        const existingDomainEvents = [...domainEvents.values()]
          .filter((record) => record.commandReceiptId === existingReceipt.commandReceiptId)
          .map(mapDomainEventRecord);
        const existingOutboxMessages = [...outboxMessages.values()]
          .filter((record) => record.commandReceiptId === existingReceipt.commandReceiptId)
          .map(mapOutboxMessageRecord);
        const existingEvidenceRefs = [...evidenceRefs.values()]
          .filter((record) => record.commandReceiptId === existingReceipt.commandReceiptId)
          .map(mapEvidenceRefRecord);
        return Object.freeze({
          duplicate: true,
          stateRecord: this.load(normalizedDomainKey),
          commandEnvelope: createCriticalDomainCommandEnvelope(existingReceipt),
          commandReceipt: mapCommandReceiptRecord(existingReceipt),
          receiptEnvelope: createCriticalDomainReceiptEnvelope({
            commandReceipt: existingReceipt,
            domainEvents: existingDomainEvents,
            outboxMessages: existingOutboxMessages,
            evidenceRefs: existingEvidenceRefs,
            status: "duplicate"
          }),
          domainEvents: existingDomainEvents,
          outboxMessages: existingOutboxMessages,
          evidenceRefs: existingEvidenceRefs
        });
      }

      const stateRecord = this.save({
        domainKey: normalizedDomainKey,
        snapshot,
        expectedObjectVersion: normalizedExpectedObjectVersion,
        persistedAt: normalizedRecordedAt,
        durabilityPolicy,
        adapterKind
      });

      const receipt = Object.freeze({
        commandReceiptId: crypto.randomUUID(),
        domainKey: normalizedDomainKey,
        companyId: normalizedCompanyId,
        commandType: normalizedCommandType,
        aggregateType: normalizedAggregateType,
        aggregateId: normalizedAggregateId,
        commandId: normalizedCommandId,
        idempotencyKey: normalizedIdempotencyKey,
        expectedObjectVersion: normalizedExpectedObjectVersion,
        resultingObjectVersion: stateRecord.objectVersion,
        actorId: normalizedActorId,
        sessionRevision: normalizedSessionRevision,
        correlationId: normalizedCorrelationId,
        causationId: normalizedCausationId,
        payloadHash: hashPayload(commandPayload),
        commandPayload: cloneSnapshotValue(commandPayload ?? {}),
        metadata: cloneSnapshotValue(metadata ?? {}),
        status: "accepted",
        recordedAt: normalizedRecordedAt,
        processedAt: normalizedRecordedAt
      });
      commandReceipts.set(
        buildCommandReceiptCommandKey({
          companyId: normalizedCompanyId,
          commandType: normalizedCommandType,
          commandId: normalizedCommandId
        }),
        receipt
      );
      commandReceipts.set(
        buildCommandReceiptIdempotencyKey({
          companyId: normalizedCompanyId,
          idempotencyKey: normalizedIdempotencyKey
        }),
        receipt
      );

      const recordedDomainEvents = domainEventRecords.map((record) => {
        const normalized = Object.freeze({
          domainEventId: record.domainEventId || crypto.randomUUID(),
          domainKey: normalizedDomainKey,
          companyId: normalizedCompanyId,
          aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
          aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
          commandReceiptId: receipt.commandReceiptId,
          objectVersion: record.objectVersion == null ? stateRecord.objectVersion : Number(record.objectVersion),
          eventType: text(record.eventType, "eventType"),
          payload: cloneSnapshotValue(record.payload ?? {}),
          actorId: text(record.actorId || normalizedActorId, "actorId"),
          correlationId: text(record.correlationId || normalizedCorrelationId, "correlationId"),
          causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
          status: "recorded",
          recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt)
        });
        domainEvents.set(normalized.domainEventId, normalized);
        return normalized;
      });

      const recordedOutboxMessages = outboxMessageRecords.map((record) => {
        const normalized = Object.freeze({
          outboxMessageId: record.outboxMessageId || crypto.randomUUID(),
          domainKey: normalizedDomainKey,
          companyId: normalizedCompanyId,
          aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
          aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
          commandReceiptId: receipt.commandReceiptId,
          eventType: text(record.eventType, "eventType"),
          payload: cloneSnapshotValue(record.payload ?? {}),
          actorId: text(record.actorId || normalizedActorId, "actorId"),
          correlationId: text(record.correlationId || normalizedCorrelationId, "correlationId"),
          causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
          idempotencyKey: optionalText(record.idempotencyKey, "idempotencyKey"),
          status: "pending",
          recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt),
          publishedAt: null
        });
        outboxMessages.set(normalized.outboxMessageId, normalized);
        return normalized;
      });

      const recordedEvidenceRefs = evidenceRefRecords.map((record) => {
        const normalized = Object.freeze({
          evidenceRefId: record.evidenceRefId || crypto.randomUUID(),
          domainKey: normalizedDomainKey,
          companyId: normalizedCompanyId,
          aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
          aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
          commandReceiptId: receipt.commandReceiptId,
          domainEventId: optionalText(record.domainEventId, "domainEventId"),
          evidenceRefType: text(record.evidenceRefType, "evidenceRefType"),
          evidenceRef: text(record.evidenceRef, "evidenceRef"),
          metadata: cloneSnapshotValue(record.metadata ?? {}),
          actorId: optionalText(record.actorId || normalizedActorId, "actorId"),
          correlationId: optionalText(record.correlationId || normalizedCorrelationId, "correlationId"),
          causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
          status: "recorded",
          recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt)
        });
        evidenceRefs.set(normalized.evidenceRefId, normalized);
        return normalized;
      });

      return Object.freeze({
        duplicate: false,
        stateRecord: cloneSnapshotValue(stateRecord),
        commandEnvelope: createCriticalDomainCommandEnvelope(receipt),
        commandReceipt: mapCommandReceiptRecord(receipt),
        receiptEnvelope: createCriticalDomainReceiptEnvelope({
          commandReceipt: receipt,
          domainEvents: recordedDomainEvents,
          outboxMessages: recordedOutboxMessages,
          evidenceRefs: recordedEvidenceRefs
        }),
        domainEvents: recordedDomainEvents.map(mapDomainEventRecord),
        outboxMessages: recordedOutboxMessages.map(mapOutboxMessageRecord),
        evidenceRefs: recordedEvidenceRefs.map(mapEvidenceRefRecord)
      });
    },

    listCommandReceipts({ domainKey = null, companyId = null } = {}) {
      return [...commandReceipts.values()]
        .filter((record) => (domainKey ? record.domainKey === domainKey : true))
        .filter((record) => (companyId ? record.companyId === companyId : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.commandReceiptId.localeCompare(right.commandReceiptId))
        .map(mapCommandReceiptRecord);
    },

    listDomainEvents({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      return [...domainEvents.values()]
        .filter((record) => (domainKey ? record.domainKey === domainKey : true))
        .filter((record) => (companyId ? record.companyId === companyId : true))
        .filter((record) => (commandReceiptId ? record.commandReceiptId === commandReceiptId : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.domainEventId.localeCompare(right.domainEventId))
        .map(mapDomainEventRecord);
    },

    listOutboxMessages({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      return [...outboxMessages.values()]
        .filter((record) => (domainKey ? record.domainKey === domainKey : true))
        .filter((record) => (companyId ? record.companyId === companyId : true))
        .filter((record) => (commandReceiptId ? record.commandReceiptId === commandReceiptId : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.outboxMessageId.localeCompare(right.outboxMessageId))
        .map(mapOutboxMessageRecord);
    },

    listEvidenceRefs({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      return [...evidenceRefs.values()]
        .filter((record) => (domainKey ? record.domainKey === domainKey : true))
        .filter((record) => (companyId ? record.companyId === companyId : true))
        .filter((record) => (commandReceiptId ? record.commandReceiptId === commandReceiptId : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.evidenceRefId.localeCompare(right.evidenceRefId))
        .map(mapEvidenceRefRecord);
    },

    close() {}
  };
}

function ensureDatabaseDirectory(filePath) {
  if (filePath === ":memory:") {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    domainKey: row.domain_key,
    schemaVersion: Number(row.schema_version),
    snapshot: row.snapshot_json ? deserializeSnapshotValue(JSON.parse(row.snapshot_json)) : {},
    snapshotHash: row.snapshot_hash,
    persistedAt: row.persisted_at,
    objectVersion: normalizeObjectVersion(row.object_version),
    durabilityPolicy: row.durability_policy,
    adapterKind: row.adapter_kind
  };
}

function mapSqliteCommandReceiptRow(row) {
  if (!row) {
    return null;
  }
  return {
    commandReceiptId: row.command_receipt_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    commandType: row.command_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandId: row.command_id,
    idempotencyKey: row.idempotency_key,
    expectedObjectVersion: row.expected_object_version == null ? null : Number(row.expected_object_version),
    resultingObjectVersion: row.resulting_object_version == null ? null : Number(row.resulting_object_version),
    actorId: row.actor_id,
    sessionRevision: Number(row.session_revision),
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    payloadHash: row.payload_hash,
    commandPayload: row.command_payload_json ? deserializeSnapshotValue(JSON.parse(row.command_payload_json)) : {},
    metadata: row.metadata_json ? deserializeSnapshotValue(JSON.parse(row.metadata_json)) : {},
    status: row.status,
    recordedAt: row.recorded_at,
    processedAt: row.processed_at
  };
}

function mapSqliteDomainEventRow(row) {
  if (!row) {
    return null;
  }
  return {
    domainEventId: row.domain_event_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    objectVersion: row.object_version == null ? null : Number(row.object_version),
    eventType: row.event_type,
    payload: row.payload_json ? deserializeSnapshotValue(JSON.parse(row.payload_json)) : {},
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    status: row.status,
    recordedAt: row.recorded_at
  };
}

function mapSqliteOutboxRow(row) {
  if (!row) {
    return null;
  }
  return {
    eventEnvelopeVersion: EVENT_ENVELOPE_VERSION,
    outboxMessageId: row.outbox_message_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    eventType: row.event_type,
    payload: row.payload_json ? deserializeSnapshotValue(JSON.parse(row.payload_json)) : {},
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    recordedAt: row.recorded_at,
    publishedAt: row.published_at
  };
}

function mapSqliteEvidenceRefRow(row) {
  if (!row) {
    return null;
  }
  return {
    evidenceRefId: row.evidence_ref_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    domainEventId: row.domain_event_id,
    evidenceRefType: row.evidence_ref_type,
    evidenceRef: row.evidence_ref,
    metadata: row.metadata_json ? deserializeSnapshotValue(JSON.parse(row.metadata_json)) : {},
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    status: row.status,
    recordedAt: row.recorded_at
  };
}

function verifySqliteCriticalDomainStateStoreSchemaContract(db) {
  const tableRows = db.prepare("select name from sqlite_master where type = 'table'").all();
  const indexRows = db.prepare("select name, tbl_name from sqlite_master where type = 'index'").all();
  const availableTables = new Set(tableRows.map((row) => row.name));
  const availableIndexes = new Set(indexRows.map((row) => `${row.tbl_name}:${row.name}`));
  const missingTables = [];
  const missingColumns = [];
  const missingIndexes = [];

  for (const [tableName, tableContract] of Object.entries(SQLITE_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.tables)) {
    if (!availableTables.has(tableName)) {
      missingTables.push(tableName);
      continue;
    }
    const columnRows = db.prepare(`pragma table_info(${tableName})`).all();
    const availableColumns = new Set(columnRows.map((row) => row.name));
    for (const columnName of tableContract.columns || []) {
      if (!availableColumns.has(columnName)) {
        missingColumns.push(`${tableName}.${columnName}`);
      }
    }
    for (const indexName of tableContract.indexes || []) {
      if (!availableIndexes.has(`${tableName}:${indexName}`)) {
        missingIndexes.push(`${tableName}.${indexName}`);
      }
    }
  }

  const failureMessages = [];
  if (missingTables.length > 0) {
    failureMessages.push(`missing tables [${missingTables.join(", ")}]`);
  }
  if (missingColumns.length > 0) {
    failureMessages.push(`missing columns [${missingColumns.join(", ")}]`);
  }
  if (missingIndexes.length > 0) {
    failureMessages.push(`missing indexes [${missingIndexes.join(", ")}]`);
  }
  if (failureMessages.length > 0) {
    throw new Error(`Critical domain state store schema contract is incomplete: ${failureMessages.join("; ")}.`);
  }

  return Object.freeze({
    ok: true,
    verifiedAt: new Date().toISOString(),
    checkedTables: Object.keys(SQLITE_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.tables),
    checkedIndexes: Object.values(SQLITE_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.tables)
      .flatMap((tableContract) => [...(tableContract.indexes || [])])
  });
}

export function createSqliteCriticalDomainStateStore({ filePath }) {
  const resolvedFilePath = text(filePath, "filePath");
  ensureDatabaseDirectory(resolvedFilePath);
  const db = new DatabaseSync(resolvedFilePath);
  db.exec(`
    create table if not exists ${CRITICAL_DOMAIN_STATE_TABLE} (
      domain_key text primary key,
      schema_version integer not null,
      snapshot_json text not null,
      snapshot_hash text not null,
      persisted_at text not null,
      object_version integer not null default 1,
      durability_policy text,
      adapter_kind text
    );
    create table if not exists ${CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE} (
      command_receipt_id text primary key,
      domain_key text not null,
      company_id text not null,
      command_type text not null,
      aggregate_type text not null,
      aggregate_id text not null,
      command_id text not null,
      idempotency_key text not null,
      expected_object_version integer,
      resulting_object_version integer,
      actor_id text not null,
      session_revision integer not null,
      correlation_id text not null,
      causation_id text,
      payload_hash text not null,
      command_payload_json text not null,
      metadata_json text not null,
      status text not null,
      recorded_at text not null,
      processed_at text not null,
      unique (company_id, command_type, command_id),
      unique (company_id, idempotency_key)
    );
    create table if not exists ${CRITICAL_DOMAIN_DOMAIN_EVENT_TABLE} (
      domain_event_id text primary key,
      domain_key text not null,
      company_id text not null,
      aggregate_type text not null,
      aggregate_id text not null,
      command_receipt_id text,
      object_version integer,
      event_type text not null,
      payload_json text not null,
      actor_id text not null,
      correlation_id text not null,
      causation_id text,
      status text not null,
      recorded_at text not null
    );
    create table if not exists ${CRITICAL_DOMAIN_OUTBOX_MESSAGE_TABLE} (
      outbox_message_id text primary key,
      domain_key text not null,
      company_id text not null,
      aggregate_type text not null,
      aggregate_id text not null,
      command_receipt_id text,
      event_type text not null,
      payload_json text not null,
      actor_id text not null,
      correlation_id text not null,
      causation_id text,
      idempotency_key text,
      status text not null,
      recorded_at text not null,
      published_at text
    );
    create table if not exists ${CRITICAL_DOMAIN_EVIDENCE_REF_TABLE} (
      evidence_ref_id text primary key,
      domain_key text not null,
      company_id text not null,
      aggregate_type text not null,
      aggregate_id text not null,
      command_receipt_id text,
      domain_event_id text,
      evidence_ref_type text not null,
      evidence_ref text not null,
      metadata_json text not null,
      actor_id text,
      correlation_id text,
      causation_id text,
      status text not null,
      recorded_at text not null
    );
    create index if not exists critical_domain_command_receipts_company_recorded_idx
      on ${CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE} (company_id, recorded_at, command_receipt_id);
    create index if not exists critical_domain_domain_events_company_recorded_idx
      on ${CRITICAL_DOMAIN_DOMAIN_EVENT_TABLE} (company_id, recorded_at, domain_event_id);
    create index if not exists critical_domain_domain_events_receipt_idx
      on ${CRITICAL_DOMAIN_DOMAIN_EVENT_TABLE} (command_receipt_id);
    create index if not exists critical_domain_outbox_messages_company_recorded_idx
      on ${CRITICAL_DOMAIN_OUTBOX_MESSAGE_TABLE} (company_id, recorded_at, outbox_message_id);
    create index if not exists critical_domain_outbox_messages_receipt_idx
      on ${CRITICAL_DOMAIN_OUTBOX_MESSAGE_TABLE} (command_receipt_id);
    create index if not exists critical_domain_evidence_refs_company_recorded_idx
      on ${CRITICAL_DOMAIN_EVIDENCE_REF_TABLE} (company_id, recorded_at, evidence_ref_id);
    create index if not exists critical_domain_evidence_refs_receipt_idx
      on ${CRITICAL_DOMAIN_EVIDENCE_REF_TABLE} (command_receipt_id);
  `);
  const tableInfo = db.prepare(`pragma table_info(${CRITICAL_DOMAIN_STATE_TABLE})`).all();
  const columnNames = new Set(tableInfo.map((row) => row.name));
  if (!columnNames.has("object_version")) {
    db.exec(`alter table ${CRITICAL_DOMAIN_STATE_TABLE} add column object_version integer not null default 1;`);
  }
  if (!columnNames.has("durability_policy")) {
    db.exec(`alter table ${CRITICAL_DOMAIN_STATE_TABLE} add column durability_policy text;`);
  }
  if (!columnNames.has("adapter_kind")) {
    db.exec(`alter table ${CRITICAL_DOMAIN_STATE_TABLE} add column adapter_kind text;`);
  }
  const selectStatement = db.prepare(`
    select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
    from ${CRITICAL_DOMAIN_STATE_TABLE}
    where domain_key = ?
  `);
  const insertStatement = db.prepare(`
    insert into ${CRITICAL_DOMAIN_STATE_TABLE} (
      domain_key,
      schema_version,
      snapshot_json,
      snapshot_hash,
      persisted_at,
      object_version,
      durability_policy,
      adapter_kind
    ) values (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStatement = db.prepare(`
    update ${CRITICAL_DOMAIN_STATE_TABLE}
    set schema_version = ?,
        snapshot_json = ?,
        snapshot_hash = ?,
        persisted_at = ?,
        object_version = ?,
        durability_policy = ?,
        adapter_kind = ?
    where domain_key = ?
      and object_version = ?
  `);
  const listStatement = db.prepare(`
    select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
    from ${CRITICAL_DOMAIN_STATE_TABLE}
    order by domain_key asc
  `);
  const selectCommandReceiptByCommandStatement = db.prepare(`
    select *
    from ${CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE}
    where company_id = ?
      and command_type = ?
      and command_id = ?
    limit 1
  `);
  const selectCommandReceiptByIdempotencyStatement = db.prepare(`
    select *
    from ${CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE}
    where company_id = ?
      and idempotency_key = ?
    limit 1
  `);
  const insertCommandReceiptStatement = db.prepare(`
    insert into ${CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE} (
      command_receipt_id,
      domain_key,
      company_id,
      command_type,
      aggregate_type,
      aggregate_id,
      command_id,
      idempotency_key,
      expected_object_version,
      resulting_object_version,
      actor_id,
      session_revision,
      correlation_id,
      causation_id,
      payload_hash,
      command_payload_json,
      metadata_json,
      status,
      recorded_at,
      processed_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const listCommandReceiptsStatement = db.prepare(`
    select *
    from ${CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE}
    where (? is null or domain_key = ?)
      and (? is null or company_id = ?)
    order by recorded_at asc, command_receipt_id asc
  `);
  const insertDomainEventStatement = db.prepare(`
    insert into ${CRITICAL_DOMAIN_DOMAIN_EVENT_TABLE} (
      domain_event_id,
      domain_key,
      company_id,
      aggregate_type,
      aggregate_id,
      command_receipt_id,
      object_version,
      event_type,
      payload_json,
      actor_id,
      correlation_id,
      causation_id,
      status,
      recorded_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const listDomainEventsStatement = db.prepare(`
    select *
    from ${CRITICAL_DOMAIN_DOMAIN_EVENT_TABLE}
    where (? is null or domain_key = ?)
      and (? is null or company_id = ?)
      and (? is null or command_receipt_id = ?)
    order by recorded_at asc, domain_event_id asc
  `);
  const insertOutboxMessageStatement = db.prepare(`
    insert into ${CRITICAL_DOMAIN_OUTBOX_MESSAGE_TABLE} (
      outbox_message_id,
      domain_key,
      company_id,
      aggregate_type,
      aggregate_id,
      command_receipt_id,
      event_type,
      payload_json,
      actor_id,
      correlation_id,
      causation_id,
      idempotency_key,
      status,
      recorded_at,
      published_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const listOutboxMessagesStatement = db.prepare(`
    select *
    from ${CRITICAL_DOMAIN_OUTBOX_MESSAGE_TABLE}
    where (? is null or domain_key = ?)
      and (? is null or company_id = ?)
      and (? is null or command_receipt_id = ?)
    order by recorded_at asc, outbox_message_id asc
  `);
  const insertEvidenceRefStatement = db.prepare(`
    insert into ${CRITICAL_DOMAIN_EVIDENCE_REF_TABLE} (
      evidence_ref_id,
      domain_key,
      company_id,
      aggregate_type,
      aggregate_id,
      command_receipt_id,
      domain_event_id,
      evidence_ref_type,
      evidence_ref,
      metadata_json,
      actor_id,
      correlation_id,
      causation_id,
      status,
      recorded_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const listEvidenceRefsStatement = db.prepare(`
    select *
    from ${CRITICAL_DOMAIN_EVIDENCE_REF_TABLE}
    where (? is null or domain_key = ?)
      and (? is null or company_id = ?)
      and (? is null or command_receipt_id = ?)
    order by recorded_at asc, evidence_ref_id asc
  `);
  let schemaContractVerification = null;
  const runMutationTransaction = (payload) => {
    let result = null;
    let transactionActive = false;
    try {
      db.exec("BEGIN IMMEDIATE");
      transactionActive = true;
    const {
      normalizedDomainKey,
      normalizedCompanyId,
      normalizedCommandType,
      normalizedAggregateType,
      normalizedAggregateId,
      normalizedCommandId,
      normalizedIdempotencyKey,
      normalizedExpectedObjectVersion,
      normalizedActorId,
      normalizedSessionRevision,
      normalizedCorrelationId,
      normalizedCausationId,
      normalizedRecordedAt,
      normalizedCommandPayload,
      normalizedMetadata,
      snapshot,
      durabilityPolicy,
      adapterKind,
      domainEventRecords,
      outboxMessageRecords,
      evidenceRefRecords
    } = payload;
    const existingByCommand = mapSqliteCommandReceiptRow(
      selectCommandReceiptByCommandStatement.get(
        normalizedCompanyId,
        normalizedCommandType,
        normalizedCommandId
      )
    );
    const existingByIdempotency = mapSqliteCommandReceiptRow(
      selectCommandReceiptByIdempotencyStatement.get(
        normalizedCompanyId,
        normalizedIdempotencyKey
      )
    );
    if (existingByCommand || existingByIdempotency) {
      const existingReceipt = existingByCommand || existingByIdempotency;
      const existingDomainEvents = listDomainEventsStatement
        .all(null, null, normalizedCompanyId, normalizedCompanyId, existingReceipt.commandReceiptId, existingReceipt.commandReceiptId)
        .map(mapSqliteDomainEventRow);
      const existingOutboxMessages = listOutboxMessagesStatement
        .all(null, null, normalizedCompanyId, normalizedCompanyId, existingReceipt.commandReceiptId, existingReceipt.commandReceiptId)
        .map(mapSqliteOutboxRow);
      const existingEvidenceRefs = listEvidenceRefsStatement
        .all(null, null, normalizedCompanyId, normalizedCompanyId, existingReceipt.commandReceiptId, existingReceipt.commandReceiptId)
        .map(mapSqliteEvidenceRefRow);
      return {
        duplicate: true,
        stateRecord: mapRow(selectStatement.get(normalizedDomainKey)),
        commandEnvelope: createCriticalDomainCommandEnvelope(existingReceipt),
        commandReceipt: existingReceipt,
        receiptEnvelope: createCriticalDomainReceiptEnvelope({
          commandReceipt: existingReceipt,
          domainEvents: existingDomainEvents,
          outboxMessages: existingOutboxMessages,
          evidenceRefs: existingEvidenceRefs,
          status: "duplicate"
        }),
        domainEvents: existingDomainEvents,
        outboxMessages: existingOutboxMessages,
        evidenceRefs: existingEvidenceRefs
      };
    }

    const existingRecord = mapRow(selectStatement.get(normalizedDomainKey));
    const stateRecord = {
      domainKey: normalizedDomainKey,
      schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
      snapshot: cloneSnapshotValue(snapshot ?? {}),
      snapshotHash: hashSnapshot(snapshot),
      persistedAt: normalizedRecordedAt,
      objectVersion: existingRecord ? existingRecord.objectVersion + 1 : 1,
      durabilityPolicy: optionalText(durabilityPolicy, "durabilityPolicy"),
      adapterKind: optionalText(adapterKind, "adapterKind")
    };
    if (
      existingRecord
      && normalizedExpectedObjectVersion !== null
      && normalizedExpectedObjectVersion !== existingRecord.objectVersion
    ) {
      throw createConflictError({
        domainKey: normalizedDomainKey,
        expectedObjectVersion: normalizedExpectedObjectVersion,
        actualObjectVersion: existingRecord.objectVersion,
        action: "update"
      });
    }
    if (!existingRecord && ![null, 0].includes(normalizedExpectedObjectVersion)) {
      throw createConflictError({
        domainKey: normalizedDomainKey,
        expectedObjectVersion: normalizedExpectedObjectVersion,
        actualObjectVersion: null,
        action: "create"
      });
    }
    if (!existingRecord) {
      insertStatement.run(
        stateRecord.domainKey,
        stateRecord.schemaVersion,
        JSON.stringify(serializeSnapshotValue(stateRecord.snapshot)),
        stateRecord.snapshotHash,
        stateRecord.persistedAt,
        stateRecord.objectVersion,
        stateRecord.durabilityPolicy,
        stateRecord.adapterKind
      );
    } else {
      const result = updateStatement.run(
        stateRecord.schemaVersion,
        JSON.stringify(serializeSnapshotValue(stateRecord.snapshot)),
        stateRecord.snapshotHash,
        stateRecord.persistedAt,
        stateRecord.objectVersion,
        stateRecord.durabilityPolicy,
        stateRecord.adapterKind,
        stateRecord.domainKey,
        existingRecord.objectVersion
      );
      if (Number(result.changes) !== 1) {
        throw createConflictError({
          domainKey: normalizedDomainKey,
          expectedObjectVersion: existingRecord.objectVersion,
          actualObjectVersion: mapRow(selectStatement.get(normalizedDomainKey))?.objectVersion ?? null,
          action: "update"
        });
      }
    }

    const receipt = {
      commandReceiptId: crypto.randomUUID(),
      domainKey: normalizedDomainKey,
      companyId: normalizedCompanyId,
      commandType: normalizedCommandType,
      aggregateType: normalizedAggregateType,
      aggregateId: normalizedAggregateId,
      commandId: normalizedCommandId,
      idempotencyKey: normalizedIdempotencyKey,
      expectedObjectVersion: normalizedExpectedObjectVersion,
      resultingObjectVersion: stateRecord.objectVersion,
      actorId: normalizedActorId,
      sessionRevision: normalizedSessionRevision,
      correlationId: normalizedCorrelationId,
      causationId: normalizedCausationId,
      payloadHash: hashPayload(normalizedCommandPayload),
      commandPayload: cloneSnapshotValue(normalizedCommandPayload),
      metadata: cloneSnapshotValue(normalizedMetadata),
      status: "accepted",
      recordedAt: normalizedRecordedAt,
      processedAt: normalizedRecordedAt
    };
    insertCommandReceiptStatement.run(
      receipt.commandReceiptId,
      receipt.domainKey,
      receipt.companyId,
      receipt.commandType,
      receipt.aggregateType,
      receipt.aggregateId,
      receipt.commandId,
      receipt.idempotencyKey,
      receipt.expectedObjectVersion,
      receipt.resultingObjectVersion,
      receipt.actorId,
      receipt.sessionRevision,
      receipt.correlationId,
      receipt.causationId,
      receipt.payloadHash,
      JSON.stringify(serializeSnapshotValue(receipt.commandPayload)),
      JSON.stringify(serializeSnapshotValue(receipt.metadata)),
      receipt.status,
      receipt.recordedAt,
      receipt.processedAt
    );

    const recordedDomainEvents = domainEventRecords.map((record) => {
      const normalized = {
        domainEventId: record.domainEventId || crypto.randomUUID(),
        domainKey: normalizedDomainKey,
        companyId: normalizedCompanyId,
        aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
        aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
        commandReceiptId: receipt.commandReceiptId,
        objectVersion: record.objectVersion == null ? stateRecord.objectVersion : Number(record.objectVersion),
        eventType: text(record.eventType, "eventType"),
        payload: cloneSnapshotValue(record.payload ?? {}),
        actorId: text(record.actorId || normalizedActorId, "actorId"),
        correlationId: text(record.correlationId || normalizedCorrelationId, "correlationId"),
        causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
        status: "recorded",
        recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt)
      };
      insertDomainEventStatement.run(
        normalized.domainEventId,
        normalized.domainKey,
        normalized.companyId,
        normalized.aggregateType,
        normalized.aggregateId,
        normalized.commandReceiptId,
        normalized.objectVersion,
        normalized.eventType,
        JSON.stringify(serializeSnapshotValue(normalized.payload)),
        normalized.actorId,
        normalized.correlationId,
        normalized.causationId,
        normalized.status,
        normalized.recordedAt
      );
      return normalized;
    });

    const recordedOutboxMessages = outboxMessageRecords.map((record) => {
      const normalized = {
        outboxMessageId: record.outboxMessageId || crypto.randomUUID(),
        domainKey: normalizedDomainKey,
        companyId: normalizedCompanyId,
        aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
        aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
        commandReceiptId: receipt.commandReceiptId,
        eventType: text(record.eventType, "eventType"),
        payload: cloneSnapshotValue(record.payload ?? {}),
        actorId: text(record.actorId || normalizedActorId, "actorId"),
        correlationId: text(record.correlationId || normalizedCorrelationId, "correlationId"),
        causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
        idempotencyKey: optionalText(record.idempotencyKey, "idempotencyKey"),
        status: "pending",
        recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt),
        publishedAt: null
      };
      insertOutboxMessageStatement.run(
        normalized.outboxMessageId,
        normalized.domainKey,
        normalized.companyId,
        normalized.aggregateType,
        normalized.aggregateId,
        normalized.commandReceiptId,
        normalized.eventType,
        JSON.stringify(serializeSnapshotValue(normalized.payload)),
        normalized.actorId,
        normalized.correlationId,
        normalized.causationId,
        normalized.idempotencyKey,
        normalized.status,
        normalized.recordedAt,
        normalized.publishedAt
      );
      return normalized;
    });

    const recordedEvidenceRefs = evidenceRefRecords.map((record) => {
      const normalized = {
        evidenceRefId: record.evidenceRefId || crypto.randomUUID(),
        domainKey: normalizedDomainKey,
        companyId: normalizedCompanyId,
        aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
        aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
        commandReceiptId: receipt.commandReceiptId,
        domainEventId: optionalText(record.domainEventId, "domainEventId"),
        evidenceRefType: text(record.evidenceRefType, "evidenceRefType"),
        evidenceRef: text(record.evidenceRef, "evidenceRef"),
        metadata: cloneSnapshotValue(record.metadata ?? {}),
        actorId: optionalText(record.actorId || normalizedActorId, "actorId"),
        correlationId: optionalText(record.correlationId || normalizedCorrelationId, "correlationId"),
        causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
        status: "recorded",
        recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt)
      };
      insertEvidenceRefStatement.run(
        normalized.evidenceRefId,
        normalized.domainKey,
        normalized.companyId,
        normalized.aggregateType,
        normalized.aggregateId,
        normalized.commandReceiptId,
        normalized.domainEventId,
        normalized.evidenceRefType,
        normalized.evidenceRef,
        JSON.stringify(serializeSnapshotValue(normalized.metadata)),
        normalized.actorId,
        normalized.correlationId,
        normalized.causationId,
        normalized.status,
        normalized.recordedAt
      );
      return normalized;
    });

    result = {
      duplicate: false,
      stateRecord,
      commandEnvelope: createCriticalDomainCommandEnvelope(receipt),
      commandReceipt: receipt,
      receiptEnvelope: createCriticalDomainReceiptEnvelope({
        commandReceipt: receipt,
        domainEvents: recordedDomainEvents,
        outboxMessages: recordedOutboxMessages,
        evidenceRefs: recordedEvidenceRefs
      }),
      domainEvents: recordedDomainEvents,
      outboxMessages: recordedOutboxMessages,
      evidenceRefs: recordedEvidenceRefs
    };
    } catch (error) {
      if (transactionActive) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // Best effort rollback; preserve original failure below.
        }
      }
      throw error;
    }

    db.exec("COMMIT");
    return result;
  };

  return {
    kind: "sqlite_critical_domain_state_store",
    filePath: resolvedFilePath,

    load(domainKey) {
      return mapRow(selectStatement.get(text(domainKey, "domainKey")));
    },

    save({
      domainKey,
      snapshot,
      expectedObjectVersion = null,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const normalizedExpectedObjectVersion = normalizeExpectedObjectVersion(expectedObjectVersion);
      const existingRecord = mapRow(selectStatement.get(normalizedDomainKey));
      const record = {
        domainKey: normalizedDomainKey,
        schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
        snapshot: cloneSnapshotValue(snapshot ?? {}),
        snapshotHash: hashSnapshot(snapshot),
        persistedAt: normalizeTimestamp(persistedAt),
        objectVersion: existingRecord ? existingRecord.objectVersion + 1 : 1,
        durabilityPolicy: optionalText(durabilityPolicy, "durabilityPolicy"),
        adapterKind: optionalText(adapterKind, "adapterKind")
      };
      if (
        existingRecord
        && normalizedExpectedObjectVersion !== null
        && normalizedExpectedObjectVersion !== existingRecord.objectVersion
      ) {
        throw createConflictError({
          domainKey: normalizedDomainKey,
          expectedObjectVersion: normalizedExpectedObjectVersion,
          actualObjectVersion: existingRecord.objectVersion,
          action: "update"
        });
      }
      if (!existingRecord && ![null, 0].includes(normalizedExpectedObjectVersion)) {
        throw createConflictError({
          domainKey: normalizedDomainKey,
          expectedObjectVersion: normalizedExpectedObjectVersion,
          actualObjectVersion: null,
          action: "create"
        });
      }
      if (!existingRecord) {
        insertStatement.run(
          record.domainKey,
          record.schemaVersion,
          JSON.stringify(serializeSnapshotValue(record.snapshot)),
          record.snapshotHash,
          record.persistedAt,
          record.objectVersion,
          record.durabilityPolicy,
          record.adapterKind
        );
        return record;
      }
      const result = updateStatement.run(
        record.schemaVersion,
        JSON.stringify(serializeSnapshotValue(record.snapshot)),
        record.snapshotHash,
        record.persistedAt,
        record.objectVersion,
        record.durabilityPolicy,
        record.adapterKind,
        record.domainKey,
        existingRecord.objectVersion
      );
      if (Number(result.changes) !== 1) {
        throw createConflictError({
          domainKey: normalizedDomainKey,
          expectedObjectVersion: existingRecord.objectVersion,
          actualObjectVersion: mapRow(selectStatement.get(normalizedDomainKey))?.objectVersion ?? null,
          action: "update"
        });
      }
      return record;
    },

    list() {
      return listStatement.all().map(mapRow);
    },

    recordMutation({
      domainKey,
      companyId,
      commandType,
      aggregateType,
      aggregateId,
      commandId = crypto.randomUUID(),
      idempotencyKey = null,
      expectedObjectVersion = null,
      actorId = "system",
      sessionRevision = 1,
      correlationId = crypto.randomUUID(),
      causationId = null,
      commandPayload = {},
      metadata = {},
      domainEventRecords = [],
      outboxMessageRecords = [],
      evidenceRefRecords = [],
      snapshot,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      return cloneSnapshotValue(
        runMutationTransaction({
          normalizedDomainKey: text(domainKey, "domainKey"),
          normalizedCompanyId: text(companyId, "companyId"),
          normalizedCommandType: text(commandType, "commandType"),
          normalizedAggregateType: text(aggregateType, "aggregateType"),
          normalizedAggregateId: text(aggregateId, "aggregateId"),
          normalizedCommandId: text(commandId, "commandId"),
          normalizedIdempotencyKey:
            optionalText(idempotencyKey, "idempotencyKey")
            || `${text(commandType, "commandType")}:${text(commandId, "commandId")}`,
          normalizedExpectedObjectVersion: normalizeExpectedObjectVersion(expectedObjectVersion),
          normalizedActorId: text(actorId, "actorId"),
          normalizedSessionRevision: normalizePositiveInteger(sessionRevision, "sessionRevision"),
          normalizedCorrelationId: text(correlationId, "correlationId"),
          normalizedCausationId: optionalText(causationId, "causationId"),
          normalizedRecordedAt: normalizeTimestamp(persistedAt),
          normalizedCommandPayload: cloneSnapshotValue(commandPayload ?? {}),
          normalizedMetadata: cloneSnapshotValue(metadata ?? {}),
          snapshot,
          durabilityPolicy,
          adapterKind,
          domainEventRecords: cloneSnapshotValue(domainEventRecords ?? []),
          outboxMessageRecords: cloneSnapshotValue(outboxMessageRecords ?? []),
          evidenceRefRecords: cloneSnapshotValue(evidenceRefRecords ?? [])
        })
      );
    },

    listCommandReceipts({ domainKey = null, companyId = null } = {}) {
      return listCommandReceiptsStatement
        .all(domainKey, domainKey, companyId, companyId)
        .map(mapSqliteCommandReceiptRow);
    },

    listDomainEvents({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      return listDomainEventsStatement
        .all(domainKey, domainKey, companyId, companyId, commandReceiptId, commandReceiptId)
        .map(mapSqliteDomainEventRow);
    },

    listOutboxMessages({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      return listOutboxMessagesStatement
        .all(domainKey, domainKey, companyId, companyId, commandReceiptId, commandReceiptId)
        .map(mapSqliteOutboxRow);
    },

    listEvidenceRefs({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      return listEvidenceRefsStatement
        .all(domainKey, domainKey, companyId, companyId, commandReceiptId, commandReceiptId)
        .map(mapSqliteEvidenceRefRow);
    },

    verifySchemaContract() {
      if (!schemaContractVerification) {
        schemaContractVerification = verifySqliteCriticalDomainStateStoreSchemaContract(db);
      }
      return schemaContractVerification;
    },

    close() {
      db.close();
    }
  };
}
