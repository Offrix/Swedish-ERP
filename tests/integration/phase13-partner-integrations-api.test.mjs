import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { PARTNER_CONNECTION_TYPES } from "../../packages/domain-integrations/src/partners.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
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

test("Phase 13.2 API covers partner adapters, fallback, rate limits and replay-safe jobs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:10:00Z"),
    partnerContractTestExecutors: createPassingPartnerContractTestExecutors(),
    partnerOperationExecutors: createSuccessfulPartnerOperationExecutors()
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const catalog = await requestJson(baseUrl, `/v1/partners/catalog?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(catalog.items.length, PARTNER_CONNECTION_TYPES.length);
    assert.equal(catalog.items.every((item) => item.operationCodes.length > 0), true);

    const missingCredentials = await requestJson(baseUrl, "/v1/partners/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionType: "bank",
        providerCode: PROVIDER_CODES.bank,
        partnerCode: "missing_creds_partner",
        displayName: "Missing creds partner",
        mode: "sandbox",
        rateLimitPerMinute: 10,
        fallbackMode: "queue_retry"
      }
    });
    assert.equal(missingCredentials.error, "partner_credentials_ref_required");

    const connections = [];
    for (const connectionType of PARTNER_CONNECTION_TYPES) {
      connections.push(
        await requestJson(baseUrl, "/v1/partners/connections", {
          method: "POST",
          token: adminToken,
          expectedStatus: 201,
          body: {
            companyId: DEMO_IDS.companyId,
            connectionType,
            providerCode: PROVIDER_CODES[connectionType],
            displayName: `${connectionType} adapter`,
            mode: connectionType === "id06" ? "production" : "sandbox",
            rateLimitPerMinute: connectionType === "crm" ? 1 : 10,
            fallbackMode: "queue_retry",
            credentialsRef: `secret://${connectionType}`
          }
        })
      );
    }
    assert.equal(connections.length, PARTNER_CONNECTION_TYPES.length);
    assert.equal("credentialsRef" in connections[0], false);
    assert.equal(connections[0].credentialsPresent, true);

    const listed = await requestJson(baseUrl, `/v1/partners/connections?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(listed.items.length, PARTNER_CONNECTION_TYPES.length);
    assert.equal("credentialsRef" in listed.items[0], false);
    assert.equal(listed.items[0].credentialsPresent, true);
    assert.equal(listed.items.find((item) => item.connectionType === "bank").providerCode, PROVIDER_CODES.bank);

    const bankCapabilities = await requestJson(baseUrl, `/v1/partners/connections/${connections.find((connection) => connection.connectionType === "bank").connectionId}/capabilities?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(bankCapabilities.operationCodes.includes("tax_account_sync"), true);
    assert.equal(bankCapabilities.mode, "sandbox");
    assert.equal(bankCapabilities.providerCode, PROVIDER_CODES.bank);
    assert.equal(Array.isArray(bankCapabilities.objectMappings), true);
    assert.equal(Array.isArray(bankCapabilities.requiredEvents), true);
    assert.equal("credentialsRef" in bankCapabilities, false);

    const bankHealthCheck = await requestJson(baseUrl, `/v1/partners/connections/${connections.find((connection) => connection.connectionType === "bank").connectionId}/health-checks`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        checkSetCode: "full"
      }
    });
    assert.equal(typeof bankHealthCheck.healthCheckId, "string");
    assert.equal(Array.isArray(bankHealthCheck.results), true);

    for (const connection of connections) {
      await requestJson(baseUrl, `/v1/partners/connections/${connection.connectionId}/contract-tests`, {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          testPackCode: "test-pack-v1"
        }
      });
    }
    const contractResults = await requestJson(baseUrl, `/v1/partners/contract-tests?companyId=${DEMO_IDS.companyId}&status=passed`, {
      token: adminToken
    });
    assert.equal(contractResults.items.length, PARTNER_CONNECTION_TYPES.length);

    const bankConnection = connections.find((connection) => connection.connectionType === "bank");
    await requestJson(baseUrl, `/v1/partners/connections/${bankConnection.connectionId}/health`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "outage"
      }
    });

    const bankOperation = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: bankConnection.connectionId,
        operationCode: "payment_export",
        operationKey: "bank:payment_export:phase13-2-bank",
        payload: { payoutBatchId: "phase13-2-bank" }
      }
    });
    assert.equal(bankOperation.status, "fallback");
    assert.equal(typeof bankOperation.jobId, "string");

    const bankFailed = await requestJson(baseUrl, `/v1/jobs/${bankOperation.jobId}/fail`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        errorClass: "persistent_technical",
        errorMessage: "bank provider outage",
        replayAllowed: true
      }
    });
    assert.equal(bankFailed.status, "dead_lettered");

    const bankReplayPlan = await requestJson(baseUrl, `/v1/jobs/${bankOperation.jobId}/replay-plan`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        actorId: "phase13-2-admin",
        approvedByActorId: "phase13-2-approver"
      }
    });
    assert.equal(bankReplayPlan.status, "replay_planned");

    const bankReplay = await requestJson(baseUrl, `/v1/jobs/${bankOperation.jobId}/replay`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        actorId: "phase13-2-admin"
      }
    });
    assert.equal(bankReplay.originalJob.status, "replayed");
    assert.equal(bankReplay.replayJob.replayOfJobId, bankOperation.jobId);

    const crmConnection = connections.find((connection) => connection.connectionType === "crm");
    const firstCrmOperation = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: crmConnection.connectionId,
        operationCode: "customer_sync",
        operationKey: "crm:customer_sync:crm-1",
        payload: { customerId: "crm-1" }
      }
    });
    assert.equal(firstCrmOperation.status, "queued");
    assert.equal(firstCrmOperation.mode, "sandbox");
    const firstCrmDispatch = await requestJson(baseUrl, `/v1/partners/operations/${firstCrmOperation.operationId}/dispatch`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(firstCrmDispatch.status, "succeeded");

    const secondCrmOperation = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: crmConnection.connectionId,
        operationCode: "customer_sync",
        operationKey: "crm:customer_sync:crm-2",
        payload: { customerId: "crm-2" }
      }
    });
    assert.equal(secondCrmOperation.status, "rate_limited");
    assert.equal(typeof secondCrmOperation.jobId, "string");

    await requestJson(baseUrl, `/v1/partners/connections/${crmConnection.connectionId}/health`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "outage"
      }
    });

    const thirdCrmOperation = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: crmConnection.connectionId,
        operationCode: "customer_sync",
        operationKey: "crm:customer_sync:crm-3",
        payload: { customerId: "crm-3" }
      }
    });
    assert.equal(["fallback", "rate_limited"].includes(thirdCrmOperation.status), true);

    const crmOperationDetail = await requestJson(baseUrl, `/v1/partners/operations/${firstCrmOperation.operationId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(crmOperationDetail.status, "succeeded");
    assert.equal(Array.isArray(crmOperationDetail.receipts), true);

    const retryJob = await requestJson(baseUrl, "/v1/jobs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        jobType: "crm.customer_sync",
        payloadRef: "phase13-2-retry",
        payload: { customerId: "retry-1" }
      }
    });
    await requestJson(baseUrl, `/v1/jobs/${retryJob.jobId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        workerId: "crm-worker"
      }
    });
    await requestJson(baseUrl, `/v1/jobs/${retryJob.jobId}/fail`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        errorClass: "transient_technical",
        errorMessage: "crm retry budget exhausted"
      }
    });
    const earlyClaim = await requestJson(baseUrl, `/v1/jobs/${retryJob.jobId}/claim`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        workerId: "crm-worker"
      }
    });
    assert.equal(earlyClaim.error, "job_retry_not_ready");
    await requestJson(baseUrl, `/v1/jobs/${secondCrmOperation.jobId}/fail`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        errorClass: "persistent_technical",
        errorMessage: "crm replay required",
        replayAllowed: true
      }
    });
    await requestJson(baseUrl, `/v1/jobs/${thirdCrmOperation.jobId}/fail`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        errorClass: "persistent_technical",
        errorMessage: "crm provider still unavailable",
        replayAllowed: true
      }
    });

    const massRetry = await requestJson(baseUrl, "/v1/jobs/mass-retry", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        actorId: "phase13-2-admin",
        jobIds: [secondCrmOperation.jobId, thirdCrmOperation.jobId]
      }
    });
    assert.equal(massRetry.items.length, 2);
    assert.equal(massRetry.items.every((job) => job.status === "replay_planned"), true);

    const replayEnvelope = await requestJson(baseUrl, `/v1/partners/operations/${secondCrmOperation.operationId}/replay`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "manual_partner_repair"
      }
    });
    assert.equal(replayEnvelope.status, "replay_planned");
  } finally {
    await stopServer(server);
  }
});
