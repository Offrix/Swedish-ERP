import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import {
  createPassingPartnerContractTestExecutors,
  createSuccessfulPartnerOperationExecutors
} from "../helpers/phase13-integrations-fixtures.mjs";

test("Phase 16.3 API exposes partner contract-test packs, health summaries and connection-aware dead letters", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:30:00Z"),
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

    const packs = await requestJson(baseUrl, `/v1/partners/contract-test-packs?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(packs.items.some((pack) => pack.connectionType === "bank" && pack.providerCode === "enable_banking"), true);

    const productionConnection = await requestJson(baseUrl, "/v1/partners/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionType: "id06",
        providerCode: "official_id06_integration",
        displayName: "ID06 production adapter",
        mode: "production",
        credentialsRef: "secret://id06"
      }
    });

    const blocked = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: productionConnection.connectionId,
        operationCode: "attendance_sync",
        payload: { attendanceBatchId: "phase16-3-id06" }
      }
    });
    assert.equal(blocked.error, "partner_contract_test_required");

    await requestJson(baseUrl, `/v1/partners/connections/${productionConnection.connectionId}/contract-tests`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const queued = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: productionConnection.connectionId,
        operationCode: "attendance_sync",
        payload: { attendanceBatchId: "phase16-3-id06" }
      }
    });
    assert.equal(queued.status, "queued");

    const executed = await requestJson(baseUrl, `/v1/partners/operations/${queued.operationId}/dispatch`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(executed.status, "succeeded");

    const healthCheck = await requestJson(baseUrl, `/v1/partners/connections/${productionConnection.connectionId}/health-checks`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        checkSetCode: "full"
      }
    });
    assert.equal(typeof healthCheck.healthCheckId, "string");

    const healthChecks = await requestJson(baseUrl, `/v1/partners/connections/${productionConnection.connectionId}/health-checks?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(healthChecks.items.length, 1);
    const healthSummary = await requestJson(baseUrl, `/v1/partners/connections/${productionConnection.connectionId}/health-summary?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(healthSummary.contractTestGreen, true);
    assert.equal(healthSummary.latestHealthCheck.healthCheckId, healthCheck.healthCheckId);

    const bankConnection = await requestJson(baseUrl, "/v1/partners/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionType: "bank",
        providerCode: "enable_banking",
        displayName: "Bank sandbox adapter",
        mode: "sandbox",
        rateLimitPerMinute: 1,
        fallbackMode: "queue_retry",
        credentialsRef: "secret://bank"
      }
    });

    await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: bankConnection.connectionId,
        operationCode: "statement_sync",
        operationKey: "phase16-3:bank:1",
        payload: { cursor: "cursor-1" }
      }
    });
    const rateLimited = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: bankConnection.connectionId,
        operationCode: "statement_sync",
        operationKey: "phase16-3:bank:2",
        payload: { cursor: "cursor-2" }
      }
    });
    assert.equal(rateLimited.status, "rate_limited");

    await requestJson(baseUrl, `/v1/jobs/${rateLimited.jobId}/fail`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        errorClass: "persistent_technical",
        errorMessage: "bank schema drift",
        replayAllowed: true
      }
    });

    const connectionJobs = await requestJson(baseUrl, `/v1/jobs?companyId=${DEMO_IDS.companyId}&connectionId=${bankConnection.connectionId}`, {
      token: adminToken
    });
    assert.equal(connectionJobs.items.every((job) => job.connectionId === bankConnection.connectionId), true);

    const deadLetters = await requestJson(baseUrl, `/v1/jobs/dead-letters?companyId=${DEMO_IDS.companyId}&connectionId=${bankConnection.connectionId}`, {
      token: adminToken
    });
    assert.equal(deadLetters.items.length, 1);
    assert.equal(deadLetters.items[0].job.connectionId, bankConnection.connectionId);
  } finally {
    await stopServer(server);
  }
});
