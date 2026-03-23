import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 13.2 flow exposes partner routes and runs fallback plus replay without mutating history", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T22:10:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/partners/operations"), true);
    assert.equal(root.routes.includes("/v1/jobs/:jobId/replay"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const connection = await requestJson(baseUrl, "/v1/partners/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionType: "peppol",
        partnerCode: "peppol_partner",
        displayName: "Peppol Adapter",
        mode: "sandbox",
        rateLimitPerMinute: 5,
        fallbackMode: "queue_retry",
        credentialsRef: "secret://peppol"
      }
    });
    await requestJson(baseUrl, `/v1/partners/connections/${connection.connectionId}/contract-tests`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/partners/connections/${connection.connectionId}/health`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "outage"
      }
    });

    const operation = await requestJson(baseUrl, "/v1/partners/operations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        connectionId: connection.connectionId,
        operationCode: "invoice_delivery",
        payload: { invoiceId: "INV-13-E2E" }
      }
    });
    assert.equal(operation.status, "fallback");

    const failed = await requestJson(baseUrl, `/v1/jobs/${operation.jobId}/fail`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        errorClass: "persistent_technical",
        errorMessage: "peppol outage",
        replayAllowed: true
      }
    });
    assert.equal(failed.status, "dead_lettered");

    await requestJson(baseUrl, `/v1/jobs/${operation.jobId}/replay-plan`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        actorId: "phase13-2-e2e",
        approvedByActorId: "phase13-2-approver"
      }
    });
    const replayed = await requestJson(baseUrl, `/v1/jobs/${operation.jobId}/replay`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        actorId: "phase13-2-e2e"
      }
    });
    assert.equal(replayed.originalJob.status, "replayed");

    const jobs = await requestJson(baseUrl, `/v1/jobs?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(jobs.items.length >= 2, true);
  } finally {
    await stopServer(server);
  }
});
