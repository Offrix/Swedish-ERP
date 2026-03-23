import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { seedReportSnapshot } from "../helpers/reporting-fixtures.mjs";

test("Phase 13.1 API enforces OAuth scopes, exposes sandbox data and keeps webhooks idempotent", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:00:00Z")
  });
  const reportSnapshot = seedReportSnapshot(platform, DEMO_IDS.companyId, "phase13-1-api");
  platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "income_tax_return",
    sourceObjectType: "report_snapshot",
    sourceObjectId: reportSnapshot.reportSnapshotId,
    payloadVersion: "2026-03-22",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    payload: {
      reportSnapshotId: reportSnapshot.reportSnapshotId
    },
    signedState: "not_required",
    actorId: "phase13-1-api"
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

    const client = await requestJson(baseUrl, "/v1/public-api/clients", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        displayName: "Phase 13 API Client",
        mode: "sandbox",
        scopes: ["api_spec.read", "reporting.read", "submission.read", "webhook.manage"]
      }
    });
    const productionClient = await requestJson(baseUrl, "/v1/public-api/clients", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        displayName: "Phase 13 API Prod Client",
        mode: "production",
        scopes: ["api_spec.read", "reporting.read", "submission.read", "webhook.manage"]
      }
    });

    await requestJson(baseUrl, "/v1/public-api/compatibility-baselines", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        version: "2026-03-22",
        routeHash: "phase13-1-api-routes"
      }
    });

    const limitedToken = await requestJson(baseUrl, "/v1/public/oauth/token", {
      method: "POST",
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        scopes: ["api_spec.read"]
      }
    });

    const denied = await requestJson(baseUrl, `/v1/public/report-snapshots?companyId=${DEMO_IDS.companyId}`, {
      token: limitedToken.accessToken,
      expectedStatus: 403
    });
    assert.equal(denied.error, "public_api_scope_denied");

    const token = await requestJson(baseUrl, "/v1/public/oauth/token", {
      method: "POST",
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        scopes: ["api_spec.read", "reporting.read", "submission.read"]
      }
    });

    const spec = await requestJson(baseUrl, "/v1/public/spec");
    assert.equal(spec.auth.scheme, "oauth2_client_credentials");

    const sandbox = await requestJson(baseUrl, `/v1/public/sandbox/catalog?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    assert.equal(sandbox.mode, "sandbox");

    const snapshots = await requestJson(baseUrl, `/v1/public/report-snapshots?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    assert.equal(snapshots.items.length >= 1, true);

    const submissions = await requestJson(baseUrl, `/v1/public/submissions?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    assert.equal(submissions.items.length, 1);

    const baselines = await requestJson(baseUrl, `/v1/public-api/compatibility-baselines?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(baselines.items.length, 1);

    const subscription = await requestJson(baseUrl, "/v1/public-api/webhooks", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        mode: "sandbox",
        eventTypes: ["report.snapshot.ready"],
        targetUrl: "https://example.test/phase13-1/webhook"
      }
    });
    assert.equal(typeof subscription.secret, "string");
    const listedSubscriptions = await requestJson(baseUrl, `/v1/public-api/webhooks?companyId=${DEMO_IDS.companyId}&clientId=${client.clientId}`, {
      token: adminToken
    });
    assert.equal("secret" in listedSubscriptions.items[0], false);
    assert.equal(listedSubscriptions.items[0].secretPresent, true);

    const mismatchedMode = await requestJson(baseUrl, "/v1/public-api/webhooks", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        mode: "production",
        eventTypes: ["report.snapshot.ready"],
        targetUrl: "https://example.test/phase13-1/mismatch"
      }
    });
    assert.equal(mismatchedMode.error, "public_api_webhook_mode_mismatch");

    const emitted = await requestJson(baseUrl, "/v1/public-api/webhook-events", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        eventType: "report.snapshot.ready",
        resourceType: "report_snapshot",
        resourceId: reportSnapshot.reportSnapshotId,
        payload: { reportSnapshotId: reportSnapshot.reportSnapshotId },
        mode: "sandbox",
        eventKey: "phase13-1-api:event"
      }
    });
    const duplicate = await requestJson(baseUrl, "/v1/public-api/webhook-events", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        eventType: "report.snapshot.ready",
        resourceType: "report_snapshot",
        resourceId: reportSnapshot.reportSnapshotId,
        payload: { reportSnapshotId: reportSnapshot.reportSnapshotId },
        mode: "sandbox",
        eventKey: "phase13-1-api:event"
      }
    });
    assert.equal(duplicate.eventId, emitted.eventId);
    const productionEmitted = await requestJson(baseUrl, "/v1/public-api/webhook-events", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        eventType: "report.snapshot.ready",
        resourceType: "report_snapshot",
        resourceId: reportSnapshot.reportSnapshotId,
        payload: { reportSnapshotId: reportSnapshot.reportSnapshotId, mode: productionClient.mode },
        mode: "production",
        eventKey: "phase13-1-api:event"
      }
    });
    assert.notEqual(productionEmitted.eventId, emitted.eventId);

    const deliveries = await requestJson(
      baseUrl,
      `/v1/public-api/webhook-deliveries?companyId=${DEMO_IDS.companyId}&subscriptionId=${subscription.subscriptionId}`,
      {
        token: adminToken
      }
    );
    assert.equal(deliveries.items.length, 1);
  } finally {
    await stopServer(server);
  }
});
