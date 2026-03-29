import test from "node:test";
import assert from "node:assert/strict";
import { createCommandMutationRuntime } from "../../packages/domain-core/src/command-log.mjs";
import {
  createBoundedContextCanonicalRepositories,
  createCoreCanonicalRepositories,
  createInMemoryCanonicalRepositoryStore
} from "../../packages/domain-core/src/repositories.mjs";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

test("Phase 2.2 command runtime writes repository mutation, command receipt and outbox in the same transaction", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const runtime = createCommandMutationRuntime({
    store,
    clock: () => new Date("2026-03-26T11:45:00.000Z")
  });

  const execution = await runtime.executeMutation({
    companyId: COMPANY_ID,
    commandType: "core.portfolio_membership.create",
    aggregateType: "bureau_portfolio_membership",
    aggregateId: "portfolio-1",
    actorId: "user-1",
    sessionRevision: 3,
    commandId: "command-portfolio-1",
    idempotencyKey: "portfolio-membership:create:portfolio-1",
    commandPayload: {
      portfolioId: "portfolio-1",
      bureauOrgId: COMPANY_ID,
      clientCompanyId: "22222222-2222-2222-2222-222222222222",
      status: "active"
    },
    mutation: async ({ coreRepositories, queueDomainEvent, queueEvidenceRef, queueOutboxMessage }) => {
      const saved = await coreRepositories.portfolios.save({
        companyId: COMPANY_ID,
        objectId: "portfolio-1",
        payload: {
          portfolioId: "portfolio-1",
          bureauOrgId: COMPANY_ID,
          clientCompanyId: "22222222-2222-2222-2222-222222222222",
          status: "active"
        },
        actorId: "user-1",
        correlationId: "corr-1"
      });
      queueDomainEvent({
        eventType: "core.portfolio_membership.committed",
        objectVersion: saved.objectVersion,
        payload: {
          portfolioId: saved.objectId,
          status: saved.payload.status
        }
      });
      queueOutboxMessage({
        eventType: "command.accepted",
        payload: {
          aggregateId: saved.objectId,
          objectVersion: saved.objectVersion
        }
      });
      queueEvidenceRef({
        evidenceRefType: "audit_bundle",
        evidenceRef: "evidence://portfolio-1",
        metadata: {
          aggregateId: saved.objectId
        }
      });
      return {
        result: saved,
        resultingObjectVersion: saved.objectVersion
      };
    }
  });

  assert.equal(execution.duplicate, false);
  assert.equal(execution.commandReceipt.commandType, "core.portfolio_membership.create");
  assert.equal(execution.commandReceipt.expectedObjectVersion, null);
  assert.equal(execution.commandReceipt.resultingObjectVersion, 1);
  assert.equal(execution.commandReceipt.sessionRevision, 3);
  assert.equal(execution.domainEvents.length, 1);
  assert.equal(execution.domainEvents[0].commandReceiptId, execution.commandReceipt.commandReceiptId);
  assert.equal(execution.outboxMessages.length, 1);
  assert.equal(execution.outboxMessages[0].commandReceiptId, execution.commandReceipt.commandReceiptId);
  assert.equal(execution.evidenceRefs.length, 1);
  assert.equal(execution.evidenceRefs[0].commandReceiptId, execution.commandReceipt.commandReceiptId);

  const repositories = createCoreCanonicalRepositories({ store });
  const storedPortfolio = await repositories.portfolios.get({
    companyId: COMPANY_ID,
    objectId: "portfolio-1"
  });
  assert.equal(storedPortfolio.objectVersion, 1);

  const receipts = await runtime.listCommandReceipts({ companyId: COMPANY_ID });
  assert.equal(receipts.length, 1);
  const domainEvents = await runtime.listDomainEvents({ companyId: COMPANY_ID });
  assert.equal(domainEvents.length, 1);
  const outboxMessages = await runtime.listOutboxMessages({ companyId: COMPANY_ID });
  assert.equal(outboxMessages.length, 1);
  const evidenceRefs = await runtime.listEvidenceRefs({ companyId: COMPANY_ID });
  assert.equal(evidenceRefs.length, 1);
});

test("Phase 2.2 command runtime suppresses duplicate commands by idempotency key", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const runtime = createCommandMutationRuntime({ store });
  let mutationCalls = 0;

  const input = {
    companyId: COMPANY_ID,
    commandType: "core.support_case.open",
    aggregateType: "support_case",
    aggregateId: "case-1",
    actorId: "user-2",
    sessionRevision: 9,
    commandId: "command-case-1",
    idempotencyKey: "support-case:case-1",
    commandPayload: {
      supportCaseId: "case-1",
      companyId: COMPANY_ID,
      severity: "high",
      status: "open"
    },
    mutation: async ({ coreRepositories, queueOutboxMessage }) => {
      mutationCalls += 1;
      const saved = await coreRepositories.supportCases.save({
        companyId: COMPANY_ID,
        objectId: "case-1",
        payload: {
          supportCaseId: "case-1",
          companyId: COMPANY_ID,
          severity: "high",
          status: "open"
        }
      });
      queueOutboxMessage({
        eventType: "command.accepted",
        payload: { supportCaseId: saved.objectId }
      });
      return {
        result: saved,
        resultingObjectVersion: saved.objectVersion
      };
    }
  };

  const first = await runtime.executeMutation(input);
  const second = await runtime.executeMutation(input);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(mutationCalls, 1);
  assert.equal((await runtime.listCommandReceipts({ companyId: COMPANY_ID })).length, 1);
  assert.equal((await runtime.listDomainEvents({ companyId: COMPANY_ID })).length, 0);
  assert.equal((await runtime.listOutboxMessages({ companyId: COMPANY_ID })).length, 1);
  assert.equal((await runtime.listEvidenceRefs({ companyId: COMPANY_ID })).length, 0);
});

test("Phase 2.2 command runtime supports bounded-context repository bundles in the same transaction", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const runtime = createCommandMutationRuntime({
    store,
    createRepositories: ({ transaction, command }) => {
      assert.equal(command.commandType, "collective_agreement.catalog.publish");
      return {
        collectiveAgreements: createBoundedContextCanonicalRepositories({
          transaction,
          boundedContextCode: "collective_agreements",
          objectTypes: {
            catalogEntries: "collective_agreement_catalog_entry"
          }
        })
      };
    }
  });

  const execution = await runtime.executeMutation({
    companyId: COMPANY_ID,
    commandType: "collective_agreement.catalog.publish",
    aggregateType: "collective_agreement_catalog_entry",
    aggregateId: "agreement-1",
    actorId: "user-3",
    sessionRevision: 7,
    commandId: "command-agreement-1",
    idempotencyKey: "collective-agreement:agreement-1",
    commandPayload: {
      agreementId: "agreement-1",
      agreementFamilyCode: "unionen_tjansteman",
      versionCode: "2026.1"
    },
    mutation: async ({ repositories, queueDomainEvent, queueEvidenceRef, queueOutboxMessage }) => {
      const saved = await repositories.collectiveAgreements.catalogEntries.save({
        companyId: COMPANY_ID,
        objectId: "agreement-1",
        payload: {
          agreementId: "agreement-1",
          agreementFamilyCode: "unionen_tjansteman",
          versionCode: "2026.1",
          publicationStatus: "published"
        },
        actorId: "user-3",
        correlationId: "corr-agreement-1"
      });
      queueDomainEvent({
        eventType: "collective_agreement.catalog_entry.published",
        aggregateType: "collective_agreement_catalog_entry",
        aggregateId: saved.objectId,
        objectVersion: saved.objectVersion,
        payload: {
          agreementId: saved.objectId
        }
      });
      queueOutboxMessage({
        eventType: "command.accepted",
        aggregateType: "collective_agreement_catalog_entry",
        aggregateId: saved.objectId,
        payload: {
          agreementId: saved.objectId,
          objectVersion: saved.objectVersion
        }
      });
      queueEvidenceRef({
        aggregateType: "collective_agreement_catalog_entry",
        aggregateId: saved.objectId,
        evidenceRefType: "publication_bundle",
        evidenceRef: "evidence://agreement-1/publication"
      });
      return {
        result: saved,
        resultingObjectVersion: saved.objectVersion
      };
    }
  });

  assert.equal(execution.duplicate, false);
  assert.equal(execution.commandReceipt.commandType, "collective_agreement.catalog.publish");
  assert.equal(execution.commandReceipt.resultingObjectVersion, 1);
  assert.equal(execution.domainEvents.length, 1);
  assert.equal(execution.outboxMessages.length, 1);
  assert.equal(execution.evidenceRefs.length, 1);
  assert.equal(execution.outboxMessages[0].commandReceiptId, execution.commandReceipt.commandReceiptId);

  const agreementRepositories = createBoundedContextCanonicalRepositories({
    store,
    boundedContextCode: "collective_agreements",
    objectTypes: {
      catalogEntries: "collective_agreement_catalog_entry"
    }
  });
  const storedAgreement = await agreementRepositories.catalogEntries.get({
    companyId: COMPANY_ID,
    objectId: "agreement-1"
  });
  assert.equal(storedAgreement.objectVersion, 1);
  assert.equal(storedAgreement.payload.publicationStatus, "published");
  assert.equal((await runtime.listCommandReceipts({ companyId: COMPANY_ID })).length, 1);
  assert.equal((await runtime.listDomainEvents({ companyId: COMPANY_ID })).length, 1);
  assert.equal((await runtime.listOutboxMessages({ companyId: COMPANY_ID })).length, 1);
  assert.equal((await runtime.listEvidenceRefs({ companyId: COMPANY_ID })).length, 1);
});

test("Phase 2.2 command runtime rolls back repository, command receipt and outbox on mutation failure", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const runtime = createCommandMutationRuntime({ store });

  await assert.rejects(
    runtime.executeMutation({
      companyId: COMPANY_ID,
      commandType: "core.feature_flag.create",
      aggregateType: "feature_flag",
      aggregateId: "flag-1",
      actorId: "user-3",
      sessionRevision: 4,
      commandId: "command-flag-1",
      idempotencyKey: "feature-flag:flag-1",
      commandPayload: {
        featureFlagId: "flag-1",
        flagKey: "trial_mode"
      },
      mutation: async ({ coreRepositories, queueDomainEvent, queueEvidenceRef, queueOutboxMessage }) => {
        await coreRepositories.featureFlags.save({
          companyId: COMPANY_ID,
          objectId: "flag-1",
          payload: {
            featureFlagId: "flag-1",
            companyId: COMPANY_ID,
            flagKey: "trial_mode",
            status: "draft"
          }
        });
        queueDomainEvent({
          eventType: "core.feature_flag.created",
          payload: {
            featureFlagId: "flag-1"
          }
        });
        queueOutboxMessage({
          eventType: "command.accepted",
          payload: {
            featureFlagId: "flag-1"
          }
        });
        queueEvidenceRef({
          evidenceRefType: "audit_bundle",
          evidenceRef: "evidence://feature-flag-1"
        });
        throw new Error("mutation_failed");
      }
    }),
    /mutation_failed/u
  );

  const repositories = createCoreCanonicalRepositories({ store });
  assert.equal((await repositories.featureFlags.list({ companyId: COMPANY_ID })).length, 0);
  assert.equal((await runtime.listCommandReceipts({ companyId: COMPANY_ID })).length, 0);
  assert.equal((await runtime.listDomainEvents({ companyId: COMPANY_ID })).length, 0);
  assert.equal((await runtime.listOutboxMessages({ companyId: COMPANY_ID })).length, 0);
  assert.equal((await runtime.listEvidenceRefs({ companyId: COMPANY_ID })).length, 0);
});

test("Phase 2.2 inbox runtime deduplicates incoming messages and records processing state", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const runtime = createCommandMutationRuntime({ store });

  const first = await runtime.recordInboxMessage({
    companyId: COMPANY_ID,
    sourceSystem: "skatteverket",
    messageId: "receipt-1",
    aggregateType: "submission",
    aggregateId: "submission-1",
    payload: {
      receiptType: "technical_ack"
    },
    correlationId: "corr-receipt-1"
  });
  const duplicate = await runtime.recordInboxMessage({
    companyId: COMPANY_ID,
    sourceSystem: "skatteverket",
    messageId: "receipt-1",
    aggregateType: "submission",
    aggregateId: "submission-1",
    payload: {
      receiptType: "technical_ack"
    },
    correlationId: "corr-receipt-1"
  });
  assert.equal(first.inboxMessageId, duplicate.inboxMessageId);

  const processed = await runtime.markInboxMessageProcessed({
    inboxMessageId: first.inboxMessageId,
    status: "processed"
  });
  assert.equal(processed.status, "processed");
  assert.equal((await runtime.listInboxMessages({ companyId: COMPANY_ID, status: "processed" })).length, 1);
});
