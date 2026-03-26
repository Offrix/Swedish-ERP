import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import {
  createPassingPartnerContractTestExecutors,
  createSuccessfulPartnerOperationExecutors
} from "../helpers/phase13-integrations-fixtures.mjs";

const PROVIDER_CODES = Object.freeze({
  bank: "enable_banking",
  peppol: "pagero_online",
  pension: "tenant_managed_pension_export",
  crm: "generic_crm_rest",
  commerce: "generic_commerce_rest",
  id06: "official_id06_integration"
});

test("Phase 13.2 partner adapters expose contract tests, fallback and replay-safe jobs", async () => {
  let currentTime = new Date("2026-03-22T18:30:00Z");
  const platform = createApiPlatform({
    clock: () => currentTime,
    partnerContractTestExecutors: createPassingPartnerContractTestExecutors(),
    partnerOperationExecutors: createSuccessfulPartnerOperationExecutors()
  });

  const connections = platform.partnerConnectionTypes.map((connectionType) =>
    platform.createPartnerConnection({
      companyId: DEMO_IDS.companyId,
      connectionType,
      providerCode: PROVIDER_CODES[connectionType],
      displayName: `${connectionType} partner`,
      mode: connectionType === "id06" ? "production" : "sandbox",
      rateLimitPerMinute: connectionType === "bank" ? 1 : 60,
      fallbackMode: "queue_retry",
      credentialsRef: `secret://${connectionType}`,
      actorId: "phase13-2-unit"
    })
  );
  const catalog = platform.listPartnerConnectionCatalog();
  assert.equal(catalog.length, platform.partnerConnectionTypes.length);
  assert.equal(catalog.every((entry) => entry.supportedProviders.length > 0), true);
  assert.equal(catalog.every((entry) => entry.supportedOperations.length > 0), true);
  assert.equal("credentialsRef" in connections[0], false);
  assert.equal(connections[0].credentialsPresent, true);

  const listedConnections = platform.listPartnerConnections({
    companyId: DEMO_IDS.companyId
  });
  assert.equal("credentialsRef" in listedConnections[0], false);
  assert.equal(listedConnections[0].credentialsPresent, true);

  const contractResults = await Promise.all(
    connections.map((connection) =>
      platform.runAdapterContractTest({
        companyId: DEMO_IDS.companyId,
        connectionId: connection.connectionId,
        testPackCode: platform.getPartnerConnectionCapabilities({
          companyId: DEMO_IDS.companyId,
          connectionId: connection.connectionId
        }).contractTestPackCode,
        actorId: "phase13-2-unit"
      })
    )
  );
  assert.equal(contractResults.length, platform.partnerConnectionTypes.length);
  assert.equal(contractResults.every((result) => result.status === "passed"), true);
  assert.equal(contractResults.every((result) => result.assertions.length > 0), true);
  assert.equal(contractResults.filter((result) => result.connectionType !== "id06").every((result) => result.mode === "sandbox"), true);
  assert.equal(contractResults.find((result) => result.connectionType === "id06").mode, "production");

  const bankConnection = connections.find((connection) => connection.connectionType === "bank");
  const bankCapabilities = platform.getPartnerConnectionCapabilities({
    companyId: DEMO_IDS.companyId,
    connectionId: bankConnection.connectionId
  });
  assert.equal(bankCapabilities.operationCodes.includes("tax_account_sync"), true);
  assert.equal(bankCapabilities.mode, "sandbox");
  assert.equal(bankCapabilities.providerCode, PROVIDER_CODES.bank);
  assert.equal(Array.isArray(bankCapabilities.objectMappings), true);
  assert.equal(Array.isArray(bankCapabilities.requiredEvents), true);
  assert.equal("credentialsRef" in bankCapabilities, false);
  const healthCheck = platform.runPartnerHealthCheck({
    companyId: DEMO_IDS.companyId,
    connectionId: bankConnection.connectionId,
    checkSetCode: "full",
    actorId: "phase13-2-unit"
  });
  assert.equal(typeof healthCheck.healthCheckId, "string");
  assert.equal(Array.isArray(healthCheck.results), true);
  assert.equal(["healthy", "degraded", "outage"].includes(healthCheck.status), true);
  const queued = await platform.dispatchPartnerOperation({
    companyId: DEMO_IDS.companyId,
    connectionId: bankConnection.connectionId,
    operationCode: "statement_sync",
    operationKey: "bank:statement-sync:1",
    payload: { cursor: "cursor-1" },
    actorId: "phase13-2-unit"
  });
  assert.equal(queued.status, "queued");
  assert.equal(queued.mode, "sandbox");
  const succeeded = await platform.executePartnerOperation({
    companyId: DEMO_IDS.companyId,
    operationId: queued.operationId,
    actorId: "phase13-2-unit"
  });
  assert.equal(succeeded.status, "succeeded");
  assert.equal(succeeded.receiptRefs.length, 1);
  assert.equal(succeeded.receipts.length, 1);
  const operationDetail = platform.getPartnerOperation({
    companyId: DEMO_IDS.companyId,
    operationId: queued.operationId
  });
  assert.equal(operationDetail.receipts.length, 1);
  assert.equal(operationDetail.attempts.length, 1);
  await assert.rejects(
    () =>
      platform.dispatchPartnerOperation({
        companyId: DEMO_IDS.companyId,
        connectionId: bankConnection.connectionId,
        operationCode: "customer_sync",
        payload: { customerId: "invalid" },
        actorId: "phase13-2-unit"
      }),
    (error) => error?.code === "partner_operation_code_not_supported"
  );

  const rateLimited = await platform.dispatchPartnerOperation({
    companyId: DEMO_IDS.companyId,
    connectionId: bankConnection.connectionId,
    operationCode: "statement_sync",
    operationKey: "bank:statement-sync:2",
    payload: { cursor: "cursor-2" },
    actorId: "phase13-2-unit"
  });
  assert.equal(rateLimited.status, "rate_limited");
  assert.ok(rateLimited.jobId);

  const deadLettered = platform.failAsyncJobAttempt({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    errorClass: "persistent_technical",
    errorMessage: "schema drift",
    replayAllowed: true
  });
  assert.equal(deadLettered.status, "dead_lettered");
  assert.equal(deadLettered.deadLetter.replayAllowed, true);
  assert.throws(
    () =>
      platform.planJobReplay({
        companyId: DEMO_IDS.companyId,
        jobId: rateLimited.jobId,
        actorId: "phase13-2-unit",
        approvedByActorId: "phase13-2-unit"
      }),
    (error) => error?.code === "job_replay_self_approval_forbidden"
  );

  const replayPlan = platform.planJobReplay({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    actorId: "phase13-2-unit",
    approvedByActorId: DEMO_IDS.userId
  });
  assert.equal(replayPlan.status, "replay_planned");
  const operationReplay = platform.replayPartnerOperation({
    companyId: DEMO_IDS.companyId,
    operationId: rateLimited.operationId,
    actorId: "phase13-2-unit",
    reasonCode: "manual_partner_repair",
    approvedByActorId: DEMO_IDS.userId
  });
  assert.equal(operationReplay.status, "replay_planned");

  const replayed = platform.executeJobReplay({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    actorId: "phase13-2-unit"
  });
  assert.equal(replayed.originalJob.status, "replayed");
  assert.equal(replayed.replayJob.replayOfJobId, rateLimited.jobId);

  const retryJob = platform.enqueueAsyncJob({
    companyId: DEMO_IDS.companyId,
    jobType: "crm.customer_sync",
    payloadRef: "phase13-retry",
    payload: { customerId: "retry-1" },
    actorId: "phase13-2-unit"
  });
  platform.claimAsyncJob({
    companyId: DEMO_IDS.companyId,
    jobId: retryJob.jobId,
    workerId: "crm-worker"
  });
  const scheduledRetry = platform.failAsyncJobAttempt({
    companyId: DEMO_IDS.companyId,
    jobId: retryJob.jobId,
    errorClass: "transient_technical",
    errorMessage: "temporary outage"
  });
  assert.equal(scheduledRetry.status, "retry_scheduled");
  assert.throws(
    () =>
      platform.claimAsyncJob({
        companyId: DEMO_IDS.companyId,
        jobId: retryJob.jobId,
        workerId: "crm-worker"
      }),
    (error) => error?.code === "job_retry_not_ready"
  );
  currentTime = new Date("2026-03-22T18:36:00Z");
  const claimedRetry = platform.claimAsyncJob({
    companyId: DEMO_IDS.companyId,
    jobId: retryJob.jobId,
    workerId: "crm-worker"
  });
  assert.equal(claimedRetry.status, "claimed");
});

test("Phase 13.2 partner connections require explicit credentials refs in every environment", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T18:30:00Z")
  });

  assert.throws(
    () =>
      platform.createPartnerConnection({
        companyId: DEMO_IDS.companyId,
        connectionType: "bank",
        providerCode: PROVIDER_CODES.bank,
        displayName: "Bank partner",
        mode: "sandbox",
        fallbackMode: "queue_retry",
        actorId: "phase13-2-unit"
      }),
    (error) => error?.code === "partner_credentials_ref_required"
  );
});
