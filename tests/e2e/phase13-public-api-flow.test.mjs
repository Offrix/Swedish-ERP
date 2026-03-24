import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { seedReportSnapshot } from "../helpers/reporting-fixtures.mjs";

test("Phase 13.1 flow exposes public routes and lets a sandbox client consume snapshots and webhook events", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T22:00:00Z")
  });
  const reportSnapshot = seedReportSnapshot(platform, DEMO_IDS.companyId, "phase13-1-e2e");
  platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "annual_report_submission",
    sourceObjectType: "report_snapshot",
    sourceObjectId: reportSnapshot.reportSnapshotId,
    payloadVersion: "2026-03-22",
    providerKey: "bolagsverket",
    recipientId: "bolagsverket:annual-report",
    payload: {
      reportSnapshotId: reportSnapshot.reportSnapshotId
    },
    signedState: "not_required",
    actorId: "phase13-1-e2e"
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/public/oauth/token"), true);
    assert.equal(root.routes.includes("/v1/public-api/webhooks"), true);
    assert.equal(root.routes.includes("/v1/public/legal-forms/declaration-profile"), true);
    assert.equal(root.routes.includes("/v1/public/tax-account/summary"), true);

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
        displayName: "Phase 13 E2E Client",
        mode: "sandbox",
        scopes: ["api_spec.read", "reporting.read", "submission.read", "legal_form.read", "tax_account.read", "webhook.manage"]
      }
    });
    const token = await requestJson(baseUrl, "/v1/public/oauth/token", {
      method: "POST",
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        scopes: ["api_spec.read", "reporting.read", "submission.read", "legal_form.read", "tax_account.read"]
      }
    });

    const sandbox = await requestJson(baseUrl, `/v1/public/sandbox/catalog?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    assert.equal(sandbox.mode, "sandbox");

    const snapshots = await requestJson(baseUrl, `/v1/public/report-snapshots?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    const submissions = await requestJson(baseUrl, `/v1/public/submissions?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    const declarationProfile = await requestJson(
      baseUrl,
      `/v1/public/legal-forms/declaration-profile?companyId=${DEMO_IDS.companyId}&asOfDate=2026-03-22&fiscalYearKey=2026`,
      {
        token: token.accessToken
      }
    );
    const taxSummary = await requestJson(baseUrl, `/v1/public/tax-account/summary?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    assert.equal(snapshots.items.length, 1);
    assert.equal(submissions.items.length, 1);
    assert.equal(declarationProfile.declarationProfileCode, "INK2");
    assert.equal(typeof taxSummary.netBalance, "number");

    const subscription = await requestJson(baseUrl, "/v1/public-api/webhooks", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        mode: "sandbox",
        eventTypes: ["report.snapshot.ready"],
        targetUrl: "https://example.test/phase13-e2e"
      }
    });
    await requestJson(baseUrl, "/v1/public-api/webhook-events", {
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
        eventKey: "phase13-1-e2e:event"
      }
    });
    await requestJson(baseUrl, "/v1/public-api/webhook-events", {
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
        eventKey: "phase13-1-e2e:event"
      }
    });
    const deliveries = await requestJson(
      baseUrl,
      `/v1/public-api/webhook-deliveries?companyId=${DEMO_IDS.companyId}&subscriptionId=${subscription.subscriptionId}`,
      { token: adminToken }
    );
    assert.equal(deliveries.items.length, 1);
  } finally {
    await stopServer(server);
  }
});
