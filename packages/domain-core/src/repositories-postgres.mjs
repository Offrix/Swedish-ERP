import { createRequire } from "node:module";
import { cloneValue as clone } from "./clone.mjs";
import {
  COMMAND_RECEIPT_STATUSES,
  CORE_CANONICAL_REPOSITORY_TABLE,
  CanonicalRepositoryConflictError,
  DOMAIN_EVENT_RECORD_STATUSES,
  EVIDENCE_REF_RECORD_STATUSES,
  INBOX_MESSAGE_STATUSES
} from "./repositories.mjs";

const require = createRequire(import.meta.url);


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

function normalizeTimestamp(value) {
  const candidate = value == null ? new Date() : value;
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("recordedAt must be a valid timestamp.");
  }
  return date.toISOString();
}

function jsonValue(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return clone(value);
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

function mapRow(row, tableName) {
  if (!row) {
    return null;
  }
  return {
    tableName,
    boundedContextCode: row.bounded_context_code,
    objectType: row.object_type,
    companyId: row.company_id,
    objectId: row.object_id,
    status: row.status,
    payload: jsonValue(row.payload_json) || {},
    objectVersion: Number(row.object_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActorId: row.last_actor_id,
    lastCorrelationId: row.last_correlation_id
  };
}

function mapCommandReceiptRow(row) {
  if (!row) {
    return null;
  }
  return {
    commandReceiptId: row.command_receipt_id,
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
    commandPayload: jsonValue(row.command_payload_json) || {},
    metadata: jsonValue(row.metadata_json) || {},
    status: row.status,
    recordedAt: row.recorded_at,
    processedAt: row.processed_at
  };
}

function mapOutboxRow(row) {
  if (!row) {
    return null;
  }
  return {
    eventId: row.event_id,
    companyId: row.company_id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    payload: jsonValue(row.payload_json) || {},
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    publishedAt: row.published_at,
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    idempotencyKey: row.idempotency_key,
    status: row.published_at ? "published" : "pending"
  };
}

function mapInboxRow(row) {
  if (!row) {
    return null;
  }
  return {
    inboxMessageId: row.inbox_message_id,
    companyId: row.company_id,
    sourceSystem: row.source_system,
    messageId: row.message_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payloadHash: row.payload_hash,
    payload: jsonValue(row.payload_json) || {},
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    actorId: row.actor_id,
    status: row.status,
    receivedAt: row.received_at,
    processedAt: row.processed_at,
    errorCode: row.error_code
  };
}

function mapDomainEventRow(row) {
  if (!row) {
    return null;
  }
  return {
    domainEventId: row.domain_event_id,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    objectVersion: row.object_version == null ? null : Number(row.object_version),
    eventType: row.event_type,
    payload: jsonValue(row.payload_json) || {},
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    status: row.status,
    recordedAt: row.recorded_at
  };
}

function mapEvidenceRefRow(row) {
  if (!row) {
    return null;
  }
  return {
    evidenceRefId: row.evidence_ref_id,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    domainEventId: row.domain_event_id,
    evidenceRefType: row.evidence_ref_type,
    evidenceRef: row.evidence_ref,
    metadata: jsonValue(row.metadata_json) || {},
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    status: row.status,
    recordedAt: row.recorded_at
  };
}

function loadPostgresClient() {
  try {
    const postgresModule = require("postgres");
    return postgresModule?.default || postgresModule;
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : "unknown_error";
    throw new Error(`Postgres client package could not be loaded for canonical repositories: ${message}`);
  }
}

function escapeIdentifier(name) {
  const normalized = text(name, "tableName");
  if (!/^[a-z_][a-z0-9_]*$/u.test(normalized)) {
    throw new TypeError(`Unsafe SQL identifier: ${normalized}`);
  }
  return `"${normalized}"`;
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

async function fetchRow(tx, tableName, { boundedContextCode, objectType, companyId, objectId }) {
  const tableIdentifier = tx.unsafe(escapeIdentifier(tableName));
  const rows = await tx`
    select *
    from ${tableIdentifier}
    where bounded_context_code = ${boundedContextCode}
      and object_type = ${objectType}
      and company_id = ${companyId}
      and object_id = ${objectId}
    limit 1
  `;
  return rows[0] || null;
}

function createPostgresTransaction(tx) {
  return {
    kind: "postgres_canonical_repository_transaction",

    async getRecord({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = "core", objectType, companyId, objectId }) {
      const row = await fetchRow(tx, tableName, {
        boundedContextCode: text(boundedContextCode, "boundedContextCode"),
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId")
      });
      return mapRow(row, tableName);
    },

    async listRecords({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = "core", objectType, companyId }) {
      const tableIdentifier = tx.unsafe(escapeIdentifier(tableName));
      const rows = await tx`
        select *
        from ${tableIdentifier}
        where bounded_context_code = ${text(boundedContextCode, "boundedContextCode")}
          and object_type = ${text(objectType, "objectType")}
          and company_id = ${text(companyId, "companyId")}
        order by updated_at asc, object_id asc
      `;
      return rows.map((row) => mapRow(row, tableName));
    },

    async saveRecord({
      tableName = CORE_CANONICAL_REPOSITORY_TABLE,
      boundedContextCode = "core",
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
      const normalized = {
        tableName,
        boundedContextCode: text(boundedContextCode, "boundedContextCode"),
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId"),
        actorId: actorId == null ? null : text(actorId, "actorId"),
        correlationId: correlationId == null ? null : text(correlationId, "correlationId"),
        recordedAt: normalizeTimestamp(recordedAt),
        payload: clone(payload ?? {})
      };
      normalized.status = normalizeStatus(status, normalized.payload);

      const existing = await fetchRow(tx, normalized.tableName, normalized);
      const tableIdentifier = tx.unsafe(escapeIdentifier(normalized.tableName));
      if (!existing) {
        if (![null, 0].includes(expectedObjectVersion)) {
          throw createConflictError({
            ...normalized,
            expectedObjectVersion,
            actualObjectVersion: null,
            action: "create"
          });
        }
        const rows = await tx`
          insert into ${tableIdentifier} (
            bounded_context_code,
            object_type,
            company_id,
            object_id,
            status,
            payload_json,
            object_version,
            last_actor_id,
            last_correlation_id,
            created_at,
            updated_at
          ) values (
            ${normalized.boundedContextCode},
            ${normalized.objectType},
            ${normalized.companyId},
            ${normalized.objectId},
            ${normalized.status},
            ${JSON.stringify(normalized.payload)}::jsonb,
            1,
            ${normalized.actorId},
            ${normalized.correlationId},
            ${normalized.recordedAt},
            ${normalized.recordedAt}
          )
          returning *
        `;
        return mapRow(rows[0], normalized.tableName);
      }

      if (expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.object_version)) {
        throw createConflictError({
          ...normalized,
          expectedObjectVersion,
          actualObjectVersion: existing.object_version,
          action: "update"
        });
      }

      const rows = await tx`
        update ${tableIdentifier}
        set status = ${normalized.status},
            payload_json = ${JSON.stringify(normalized.payload)}::jsonb,
            object_version = object_version + 1,
            last_actor_id = ${normalized.actorId},
            last_correlation_id = ${normalized.correlationId},
            updated_at = ${normalized.recordedAt}
        where bounded_context_code = ${normalized.boundedContextCode}
          and object_type = ${normalized.objectType}
          and company_id = ${normalized.companyId}
          and object_id = ${normalized.objectId}
          and object_version = ${Number(expectedObjectVersion)}
        returning *
      `;
      if (rows.length === 0) {
        throw createConflictError({
          ...normalized,
          expectedObjectVersion,
          actualObjectVersion: null,
          action: "update"
        });
      }
      return mapRow(rows[0], normalized.tableName);
    },

    async deleteRecord({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = "core", objectType, companyId, objectId, expectedObjectVersion }) {
      const normalized = {
        tableName,
        boundedContextCode: text(boundedContextCode, "boundedContextCode"),
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId")
      };
      const existing = await fetchRow(tx, normalized.tableName, normalized);
      if (!existing || expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.object_version)) {
        throw createConflictError({
          ...normalized,
          expectedObjectVersion,
          actualObjectVersion: existing?.object_version ?? null,
          action: "delete"
        });
      }
      const tableIdentifier = tx.unsafe(escapeIdentifier(normalized.tableName));
      await tx`
        delete from ${tableIdentifier}
        where bounded_context_code = ${normalized.boundedContextCode}
          and object_type = ${normalized.objectType}
          and company_id = ${normalized.companyId}
          and object_id = ${normalized.objectId}
          and object_version = ${Number(expectedObjectVersion)}
      `;
      return mapRow(existing, normalized.tableName);
    },

    async getCommandReceipt({ companyId, commandType = null, commandId = null, idempotencyKey = null }) {
      const rows = await tx`
        select *
        from command_receipts
        where company_id = ${text(companyId, "companyId")}
          and (${commandType == null} or command_type = ${commandType == null ? null : text(commandType, "commandType")})
          and (${commandId == null} or command_id = ${commandId == null ? null : text(commandId, "commandId")})
          and (${idempotencyKey == null} or idempotency_key = ${idempotencyKey == null ? null : text(idempotencyKey, "idempotencyKey")})
        order by recorded_at desc
        limit 1
      `;
      return mapCommandReceiptRow(rows[0] || null);
    },

    async listCommandReceipts({ companyId, commandType = null }) {
      const rows = await tx`
        select *
        from command_receipts
        where company_id = ${text(companyId, "companyId")}
          and (${commandType == null} or command_type = ${commandType == null ? null : text(commandType, "commandType")})
        order by recorded_at asc, command_receipt_id asc
      `;
      return rows.map(mapCommandReceiptRow);
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
        expectedObjectVersion: expectedObjectVersion == null ? null : Number(expectedObjectVersion),
        resultingObjectVersion: resultingObjectVersion == null ? null : Number(resultingObjectVersion),
        actorId: text(actorId, "actorId"),
        sessionRevision: positiveInteger(sessionRevision, "sessionRevision"),
        correlationId: text(correlationId, "correlationId"),
        causationId: optionalText(causationId, "causationId"),
        payloadHash: text(payloadHash, "payloadHash"),
        commandPayload: clone(commandPayload ?? {}),
        metadata: clone(metadata || {}),
        status: assertAllowed(status, COMMAND_RECEIPT_STATUSES, "status"),
        recordedAt: normalizeTimestamp(recordedAt)
      };
      const rows = await tx`
        insert into command_receipts (
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
        ) values (
          ${normalized.companyId},
          ${normalized.commandType},
          ${normalized.aggregateType},
          ${normalized.aggregateId},
          ${normalized.commandId},
          ${normalized.idempotencyKey},
          ${normalized.expectedObjectVersion},
          ${normalized.resultingObjectVersion},
          ${normalized.actorId},
          ${normalized.sessionRevision},
          ${normalized.correlationId},
          ${normalized.causationId},
          ${normalized.payloadHash},
          ${JSON.stringify(normalized.commandPayload)}::jsonb,
          ${JSON.stringify(normalized.metadata)}::jsonb,
          ${normalized.status},
          ${normalized.recordedAt},
          ${normalized.recordedAt}
        )
        returning *
      `;
      return mapCommandReceiptRow(rows[0]);
    },

    async listOutboxMessages({ companyId, aggregateType = null, aggregateId = null, commandReceiptId = null, published = null }) {
      const rows = await tx`
        select *
        from outbox_events
        where company_id = ${text(companyId, "companyId")}
          and (${aggregateType == null} or aggregate_type = ${aggregateType == null ? null : text(aggregateType, "aggregateType")})
          and (${aggregateId == null} or aggregate_id = ${aggregateId == null ? null : text(aggregateId, "aggregateId")})
          and (${commandReceiptId == null} or command_receipt_id = ${commandReceiptId == null ? null : text(commandReceiptId, "commandReceiptId")})
          and (${published == null} or (${published} = true and published_at is not null) or (${published} = false and published_at is null))
        order by recorded_at asc, event_id asc
      `;
      return rows.map(mapOutboxRow);
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
      const rows = await tx`
        insert into outbox_events (
          event_id,
          company_id,
          event_type,
          aggregate_type,
          aggregate_id,
          payload_json,
          occurred_at,
          recorded_at,
          published_at,
          command_receipt_id,
          actor_id,
          correlation_id,
          causation_id,
          idempotency_key
        ) values (
          ${text(eventId, "eventId")},
          ${text(companyId, "companyId")},
          ${text(eventType, "eventType")},
          ${text(aggregateType, "aggregateType")},
          ${text(aggregateId, "aggregateId")},
          ${JSON.stringify(clone(payload ?? {}))}::jsonb,
          ${normalizedOccurredAt},
          ${normalizedRecordedAt},
          null,
          ${optionalText(commandReceiptId, "commandReceiptId")},
          ${text(actorId, "actorId")},
          ${text(correlationId, "correlationId")},
          ${optionalText(causationId, "causationId")},
          ${optionalText(idempotencyKey, "idempotencyKey")}
        )
        returning *
      `;
      return mapOutboxRow(rows[0]);
    },

    async markOutboxMessagePublished({ eventId, publishedAt = null }) {
      const rows = await tx`
        update outbox_events
        set published_at = ${normalizeTimestamp(publishedAt)}
        where event_id = ${text(eventId, "eventId")}
        returning *
      `;
      return mapOutboxRow(rows[0] || null);
    },

    async getInboxMessage({ companyId, sourceSystem, messageId }) {
      const rows = await tx`
        select *
        from command_inbox_messages
        where company_id = ${text(companyId, "companyId")}
          and source_system = ${text(sourceSystem, "sourceSystem")}
          and message_id = ${text(messageId, "messageId")}
        limit 1
      `;
      return mapInboxRow(rows[0] || null);
    },

    async listInboxMessages({ companyId, sourceSystem = null, status = null }) {
      const rows = await tx`
        select *
        from command_inbox_messages
        where company_id = ${text(companyId, "companyId")}
          and (${sourceSystem == null} or source_system = ${sourceSystem == null ? null : text(sourceSystem, "sourceSystem")})
          and (${status == null} or status = ${status == null ? null : assertAllowed(status, INBOX_MESSAGE_STATUSES, "status")})
        order by received_at asc, inbox_message_id asc
      `;
      return rows.map(mapInboxRow);
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
      const existing = await this.getInboxMessage({ companyId, sourceSystem, messageId });
      if (existing) {
        return existing;
      }
      const rows = await tx`
        insert into command_inbox_messages (
          company_id,
          source_system,
          message_id,
          aggregate_type,
          aggregate_id,
          payload_hash,
          payload_json,
          correlation_id,
          causation_id,
          actor_id,
          status,
          received_at,
          processed_at,
          error_code
        ) values (
          ${text(companyId, "companyId")},
          ${text(sourceSystem, "sourceSystem")},
          ${text(messageId, "messageId")},
          ${optionalText(aggregateType, "aggregateType")},
          ${optionalText(aggregateId, "aggregateId")},
          ${text(payloadHash, "payloadHash")},
          ${JSON.stringify(clone(payload ?? {}))}::jsonb,
          ${optionalText(correlationId, "correlationId")},
          ${optionalText(causationId, "causationId")},
          ${optionalText(actorId, "actorId")},
          ${assertAllowed(status, INBOX_MESSAGE_STATUSES, "status")},
          ${normalizeTimestamp(receivedAt)},
          null,
          null
        )
        returning *
      `;
      return mapInboxRow(rows[0]);
    },

    async markInboxMessageProcessed({ inboxMessageId, processedAt = null, status = "processed", errorCode = null }) {
      const rows = await tx`
        update command_inbox_messages
        set processed_at = ${normalizeTimestamp(processedAt)},
            status = ${assertAllowed(status, INBOX_MESSAGE_STATUSES, "status")},
            error_code = ${optionalText(errorCode, "errorCode")}
        where inbox_message_id = ${text(inboxMessageId, "inboxMessageId")}
        returning *
      `;
      return mapInboxRow(rows[0] || null);
    },

    async listDomainEvents({ companyId, aggregateType = null, aggregateId = null, commandReceiptId = null }) {
      const rows = await tx`
        select *
        from command_domain_events
        where company_id = ${text(companyId, "companyId")}
          and (${aggregateType == null} or aggregate_type = ${aggregateType == null ? null : text(aggregateType, "aggregateType")})
          and (${aggregateId == null} or aggregate_id = ${aggregateId == null ? null : text(aggregateId, "aggregateId")})
          and (${commandReceiptId == null} or command_receipt_id = ${commandReceiptId == null ? null : text(commandReceiptId, "commandReceiptId")})
        order by recorded_at asc, domain_event_id asc
      `;
      return rows.map(mapDomainEventRow);
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
    }) {
      const rows = await tx`
        insert into command_domain_events (
          domain_event_id,
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
        ) values (
          ${text(domainEventId, "domainEventId")},
          ${text(companyId, "companyId")},
          ${text(aggregateType, "aggregateType")},
          ${text(aggregateId, "aggregateId")},
          ${optionalText(commandReceiptId, "commandReceiptId")},
          ${objectVersion == null ? null : Number(objectVersion)},
          ${text(eventType, "eventType")},
          ${JSON.stringify(clone(payload ?? {}))}::jsonb,
          ${text(actorId, "actorId")},
          ${text(correlationId, "correlationId")},
          ${optionalText(causationId, "causationId")},
          ${assertAllowed(status, DOMAIN_EVENT_RECORD_STATUSES, "status")},
          ${normalizeTimestamp(recordedAt)}
        )
        returning *
      `;
      return mapDomainEventRow(rows[0]);
    },

    async listEvidenceRefs({
      companyId,
      aggregateType = null,
      aggregateId = null,
      commandReceiptId = null,
      domainEventId = null,
      evidenceRefType = null
    }) {
      const rows = await tx`
        select *
        from command_evidence_refs
        where company_id = ${text(companyId, "companyId")}
          and (${aggregateType == null} or aggregate_type = ${aggregateType == null ? null : text(aggregateType, "aggregateType")})
          and (${aggregateId == null} or aggregate_id = ${aggregateId == null ? null : text(aggregateId, "aggregateId")})
          and (${commandReceiptId == null} or command_receipt_id = ${commandReceiptId == null ? null : text(commandReceiptId, "commandReceiptId")})
          and (${domainEventId == null} or domain_event_id = ${domainEventId == null ? null : text(domainEventId, "domainEventId")})
          and (${evidenceRefType == null} or evidence_ref_type = ${evidenceRefType == null ? null : text(evidenceRefType, "evidenceRefType")})
        order by recorded_at asc, evidence_ref_id asc
      `;
      return rows.map(mapEvidenceRefRow);
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
    }) {
      const rows = await tx`
        insert into command_evidence_refs (
          evidence_ref_id,
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
        ) values (
          ${text(evidenceRefId, "evidenceRefId")},
          ${text(companyId, "companyId")},
          ${text(aggregateType, "aggregateType")},
          ${text(aggregateId, "aggregateId")},
          ${optionalText(commandReceiptId, "commandReceiptId")},
          ${optionalText(domainEventId, "domainEventId")},
          ${text(evidenceRefType, "evidenceRefType")},
          ${text(evidenceRef, "evidenceRef")},
          ${JSON.stringify(clone(metadata || {}))}::jsonb,
          ${optionalText(actorId, "actorId")},
          ${optionalText(correlationId, "correlationId")},
          ${optionalText(causationId, "causationId")},
          ${assertAllowed(status, EVIDENCE_REF_RECORD_STATUSES, "status")},
          ${normalizeTimestamp(recordedAt)}
        )
        returning *
      `;
      return mapEvidenceRefRow(rows[0]);
    }
  };
}

export function resolveCanonicalRepositoryConnectionString({
  connectionString = null,
  env = process.env
} = {}) {
  if (connectionString) {
    return connectionString;
  }
  if (env.CANONICAL_REPOSITORY_URL) {
    return env.CANONICAL_REPOSITORY_URL;
  }
  if (env.POSTGRES_URL) {
    return env.POSTGRES_URL;
  }
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  if (!env.POSTGRES_HOST) {
    return null;
  }
  const missingKeys = ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"].filter((key) => !env[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing Postgres environment variables for canonical repositories: ${missingKeys.join(", ")}.`);
  }
  const user = env.POSTGRES_USER;
  const password = env.POSTGRES_PASSWORD;
  const host = env.POSTGRES_HOST;
  const port = env.POSTGRES_PORT || "5432";
  const database = env.POSTGRES_DB;
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function createPostgresCanonicalRepositoryStore({
  connectionString = null,
  env = process.env,
  max = 5,
  idleTimeout = 20,
  connectTimeout = 10
} = {}) {
  const resolvedConnectionString = resolveCanonicalRepositoryConnectionString({ connectionString, env });
  if (!resolvedConnectionString) {
    throw new Error("Postgres connection information is required for canonical repositories.");
  }
  const postgres = loadPostgresClient();
  const sql = postgres(resolvedConnectionString, {
    max,
    idle_timeout: idleTimeout,
    connect_timeout: connectTimeout,
    prepare: false,
    onnotice: () => {}
  });

  return {
    kind: "postgres_canonical_repository_store",

    async close() {
      await sql.end({ timeout: 5 });
    },

    async withTransaction(work) {
      return sql.begin((tx) => work(createPostgresTransaction(tx)));
    }
  };
}
