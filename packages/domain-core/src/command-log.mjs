import crypto, { createHash } from "node:crypto";
import { createEventEnvelope } from "../../events/src/index.mjs";
import { createCoreCanonicalRepositories } from "./repositories.mjs";
import { cloneValue as clone } from "./clone.mjs";


function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function positiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function hashPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

function repositoryBundle(value) {
  if (value == null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("createRepositories must return a plain object.");
  }
  return value;
}

export function createCommandMutationRuntime({
  store,
  clock = () => new Date(),
  createRepositories = null
} = {}) {
  if (!store || typeof store.withTransaction !== "function") {
    throw new TypeError("A canonical repository store is required for the command mutation runtime.");
  }
  if (createRepositories != null && typeof createRepositories !== "function") {
    throw new TypeError("createRepositories must be a function.");
  }

  return {
    verifyMutationStoreSchemaContract,
    async executeMutation({
      companyId,
      commandType,
      aggregateType,
      aggregateId,
      actorId,
      sessionRevision,
      commandId = crypto.randomUUID(),
      idempotencyKey = `${commandType}:${commandId}`,
      correlationId = crypto.randomUUID(),
      causationId = null,
      expectedObjectVersion = null,
      commandPayload = {},
      metadata = {},
      mutation
    } = {}) {
      const normalized = {
        companyId: text(companyId, "companyId"),
        commandType: text(commandType, "commandType"),
        aggregateType: text(aggregateType, "aggregateType"),
        aggregateId: text(aggregateId, "aggregateId"),
        actorId: text(actorId, "actorId"),
        sessionRevision: positiveInteger(sessionRevision, "sessionRevision"),
        commandId: text(commandId, "commandId"),
        idempotencyKey: text(idempotencyKey, "idempotencyKey"),
        correlationId: text(correlationId, "correlationId"),
        causationId: causationId == null ? null : text(causationId, "causationId"),
        expectedObjectVersion: expectedObjectVersion == null ? null : Number(expectedObjectVersion),
        commandPayload: clone(commandPayload ?? {}),
        metadata: clone(metadata || {})
      };
      if (typeof mutation !== "function") {
        throw new TypeError("mutation is required.");
      }

      await verifyMutationStoreSchemaContract();
      return store.withTransaction(async (transaction) => {
        const existingReceipt =
          await transaction.getCommandReceipt({
            companyId: normalized.companyId,
            commandType: normalized.commandType,
            commandId: normalized.commandId
          })
          || await transaction.getCommandReceipt({
            companyId: normalized.companyId,
            idempotencyKey: normalized.idempotencyKey
          });
        if (existingReceipt) {
          return {
            duplicate: true,
            commandReceipt: existingReceipt,
            domainEvents: await transaction.listDomainEvents({
              companyId: normalized.companyId,
              commandReceiptId: existingReceipt.commandReceiptId
            }),
            outboxMessages: await transaction.listOutboxMessages({
              companyId: normalized.companyId,
              commandReceiptId: existingReceipt.commandReceiptId
            }),
            evidenceRefs: await transaction.listEvidenceRefs({
              companyId: normalized.companyId,
              commandReceiptId: existingReceipt.commandReceiptId
            }),
            mutationResult: null
          };
        }

        const queuedOutboxMessages = [];
        const queuedDomainEvents = [];
        const queuedEvidenceRefs = [];
        const repositories = repositoryBundle(
          createRepositories?.({
            transaction,
            command: clone(normalized)
          })
        );
        const coreRepositories = repositories.coreRepositories || createCoreCanonicalRepositories({ transaction });
        const mutationOutput = await mutation({
          transaction,
          repositories: {
            ...repositories,
            coreRepositories
          },
          coreRepositories,
          command: clone(normalized),
          queueOutboxMessage(message) {
            queuedOutboxMessages.push(clone(message || {}));
          },
          queueDomainEvent(event) {
            queuedDomainEvents.push(clone(event || {}));
          },
          queueEvidenceRef(evidenceRef) {
            queuedEvidenceRefs.push(clone(evidenceRef || {}));
          }
        });

        const receipt = await transaction.appendCommandReceipt({
          companyId: normalized.companyId,
          commandType: normalized.commandType,
          aggregateType: normalized.aggregateType,
          aggregateId: normalized.aggregateId,
          commandId: normalized.commandId,
          idempotencyKey: normalized.idempotencyKey,
          expectedObjectVersion: normalized.expectedObjectVersion,
          resultingObjectVersion: mutationOutput?.resultingObjectVersion ?? null,
          actorId: normalized.actorId,
          sessionRevision: normalized.sessionRevision,
          correlationId: normalized.correlationId,
          causationId: normalized.causationId,
          payloadHash: hashPayload(normalized.commandPayload),
          commandPayload: normalized.commandPayload,
          metadata: normalized.metadata,
          recordedAt: clock()
        });

        const domainEvents = [];
        for (const queued of queuedDomainEvents) {
          domainEvents.push(await transaction.appendDomainEvent({
            domainEventId: queued.domainEventId || crypto.randomUUID(),
            companyId: normalized.companyId,
            aggregateType: queued.aggregateType || normalized.aggregateType,
            aggregateId: queued.aggregateId || normalized.aggregateId,
            commandReceiptId: receipt.commandReceiptId,
            objectVersion: queued.objectVersion ?? mutationOutput?.resultingObjectVersion ?? null,
            eventType: text(queued.eventType, "eventType"),
            payload: clone(queued.payload ?? {}),
            actorId: queued.actorId || normalized.actorId,
            correlationId: queued.correlationId || normalized.correlationId,
            causationId: queued.causationId || receipt.commandReceiptId,
            recordedAt: queued.recordedAt || clock()
          }));
        }

        const outboxMessages = [];
        for (const queued of queuedOutboxMessages) {
          const envelope = createEventEnvelope({
            eventId: queued.eventId || crypto.randomUUID(),
            eventType: text(queued.eventType, "eventType"),
            aggregateType: queued.aggregateType || normalized.aggregateType,
            aggregateId: queued.aggregateId || normalized.aggregateId,
            occurredAt: queued.occurredAt || clock(),
            recordedAt: queued.recordedAt || clock(),
            companyId: normalized.companyId,
            actorId: queued.actorId || normalized.actorId,
            correlationId: queued.correlationId || normalized.correlationId,
            causationId: queued.causationId || receipt.commandReceiptId,
            idempotencyKey: queued.idempotencyKey || normalized.idempotencyKey,
            payload: clone(queued.payload ?? {})
          });
          outboxMessages.push(await transaction.enqueueOutboxMessage({
            ...envelope,
            commandReceiptId: receipt.commandReceiptId
          }));
        }

        const evidenceRefs = [];
        for (const queued of queuedEvidenceRefs) {
          evidenceRefs.push(await transaction.appendEvidenceRef({
            evidenceRefId: queued.evidenceRefId || crypto.randomUUID(),
            companyId: normalized.companyId,
            aggregateType: queued.aggregateType || normalized.aggregateType,
            aggregateId: queued.aggregateId || normalized.aggregateId,
            commandReceiptId: receipt.commandReceiptId,
            domainEventId: queued.domainEventId || null,
            evidenceRefType: text(queued.evidenceRefType, "evidenceRefType"),
            evidenceRef: text(queued.evidenceRef, "evidenceRef"),
            metadata: clone(queued.metadata || {}),
            actorId: queued.actorId || normalized.actorId,
            correlationId: queued.correlationId || normalized.correlationId,
            causationId: queued.causationId || receipt.commandReceiptId,
            recordedAt: queued.recordedAt || clock()
          }));
        }

        return {
          duplicate: false,
          commandReceipt: receipt,
          domainEvents,
          outboxMessages,
          evidenceRefs,
          mutationResult: mutationOutput?.result ?? null
        };
      });
    },

    async listCommandReceipts({ companyId, commandType = null } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.listCommandReceipts({
          companyId: text(companyId, "companyId"),
          commandType
        })
      );
    },

    async listOutboxMessages({ companyId, aggregateType = null, aggregateId = null, commandReceiptId = null, published = null } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.listOutboxMessages({
          companyId: text(companyId, "companyId"),
          aggregateType,
          aggregateId,
          commandReceiptId,
          published
        })
      );
    },

    async listDomainEvents({ companyId, aggregateType = null, aggregateId = null, commandReceiptId = null } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.listDomainEvents({
          companyId: text(companyId, "companyId"),
          aggregateType,
          aggregateId,
          commandReceiptId
        })
      );
    },

    async listEvidenceRefs({
      companyId,
      aggregateType = null,
      aggregateId = null,
      commandReceiptId = null,
      domainEventId = null,
      evidenceRefType = null
    } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.listEvidenceRefs({
          companyId: text(companyId, "companyId"),
          aggregateType,
          aggregateId,
          commandReceiptId,
          domainEventId,
          evidenceRefType
        })
      );
    },

    async markOutboxMessagePublished({ eventId, publishedAt = null } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.markOutboxMessagePublished({
          eventId: text(eventId, "eventId"),
          publishedAt: publishedAt || clock()
        })
      );
    },

    async recordInboxMessage({
      companyId,
      sourceSystem,
      messageId,
      aggregateType = null,
      aggregateId = null,
      payload,
      correlationId = null,
      causationId = null,
      actorId = null
    } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.recordInboxMessage({
          companyId: text(companyId, "companyId"),
          sourceSystem: text(sourceSystem, "sourceSystem"),
          messageId: text(messageId, "messageId"),
          aggregateType,
          aggregateId,
          payloadHash: hashPayload(payload),
          payload,
          correlationId,
          causationId,
          actorId,
          receivedAt: clock()
        })
      );
    },

    async listInboxMessages({ companyId, sourceSystem = null, status = null } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.listInboxMessages({
          companyId: text(companyId, "companyId"),
          sourceSystem,
          status
        })
      );
    },

    async markInboxMessageProcessed({ inboxMessageId, processedAt = null, status = "processed", errorCode = null } = {}) {
      await verifyMutationStoreSchemaContract();
      return store.withTransaction((transaction) =>
        transaction.markInboxMessageProcessed({
          inboxMessageId: text(inboxMessageId, "inboxMessageId"),
          processedAt: processedAt || clock(),
          status,
          errorCode
        })
      );
    }
  };

  async function verifyMutationStoreSchemaContract() {
    if (typeof store.verifySchemaContract === "function") {
      return store.verifySchemaContract();
    }
    return {
      ok: true,
      schemaContractEnforced: false,
      storeKind: typeof store.kind === "string" ? store.kind : "unknown",
      verifiedAt: normalizeVerificationTimestamp(clock())
    };
  }
}

function normalizeVerificationTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
