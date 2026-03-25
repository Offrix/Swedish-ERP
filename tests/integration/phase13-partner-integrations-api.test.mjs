import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { PARTNER_CONNECTION_TYPES } from "../../packages/domain-integrations/src/partners.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import {
  createPassingPartnerContractTestExecutors,
  createSuccessfulPartnerOperationExecutors
} from "../helpers/phase13-integrations-fixtures.mjs";

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
            partnerCode: `${connectionType}_partner`,
            displayName: `${connectionType} adapter`,
            mode: "sandbox",
            rateLimitPerMinute: connectionType === "crm" ? 1 : 10,
            fallbackMode: "queue_retry",
            credentialsRef: `secret://${connectionType}`
          }
        })
      );
    }
    assert.equal(connections.length, PARTNER_CONNECTION_TYPES.length);

    const listed = await requestJson(baseUrl, `/v1/partners/connections?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(listed.items.length, PARTNER_CONNECTION_TYPES.length);

    const bankCapabilities = await requestJson(baseUrl, `/v1/partners/connections/${connections.find((connection) => connection.connectionType === "bank").connectionId}/capabilities?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(bankCapabilities.operationCodes.includes("tax_account_sync"), true);
    assert.equal(bankCapabilities.mode, "sandbox");

    for (const connection of connections) {
      await requestJson(baseUrl, `/v1/partners/connections/${connection.connectionId}/contract-tests`, {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId
        }
      });
    }
    const contractResults = await requestJson(baseUrl, `/v1/partners/contract-tests?companyId=${DEMO_IDS.companyId}`, {
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
        payload: { customerId: "crm-3" }
      }
    });
    assert.equal(["fallback", "rate_limited"].includes(thirdCrmOperation.status), true);

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
  } finally {
    await stopServer(server);
  }
});
