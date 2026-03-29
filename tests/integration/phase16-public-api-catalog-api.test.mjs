import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.2 API publishes versioned public spec and sandbox catalog contracts", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T09:30:00Z")
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

    const spec = await requestJson(baseUrl, "/v1/public/spec?version=2026-03-25");
    assert.equal(spec.currentVersion, "2026-03-25");
    assert.equal(spec.canonicalApiVersion, "2026-03-27");
    assert.equal(spec.supportedVersions.some((entry) => entry.version === "2026-03-25"), true);
    assert.equal(spec.auth.scopeCatalog.some((scope) => scope.scopeCode === "api_spec.read"), true);
    assert.equal(spec.endpoints.some((endpoint) => endpoint.path === "/v1/public/report-snapshots"), true);
    assert.equal(spec.webhookEventCatalog.some((event) => event.eventType === "report.snapshot.ready"), true);

    const unsupported = await requestJson(baseUrl, "/v1/public/spec?version=2026-03-22", {
      expectedStatus: 400
    });
    assert.equal(unsupported.error, "public_api_spec_version_unsupported");

    const client = await requestJson(baseUrl, "/v1/public-api/clients", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        displayName: "Phase 16.2 Sandbox Client",
        mode: "sandbox",
        scopes: ["api_spec.read", "reporting.read", "tax_account.read", "webhook.manage"]
      }
    });
    assert.equal(client.specVersion, "2026-03-25");
    assert.equal(client.supportedGrantTypes.includes("client_credentials"), true);

    const token = await requestJson(baseUrl, "/v1/public/oauth/token", {
      method: "POST",
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        scopes: ["api_spec.read", "reporting.read", "tax_account.read"]
      }
    });

    const sandbox = await requestJson(baseUrl, `/v1/public/sandbox/catalog?companyId=${DEMO_IDS.companyId}`, {
      token: token.accessToken
    });
    assert.equal(sandbox.watermarkCode, "SANDBOX_PUBLIC_API");
    assert.equal(sandbox.supportsLegalEffect, false);
    assert.equal(sandbox.clientCredentials.tokenEndpoint, "/v1/public/oauth/token");
    assert.equal(sandbox.scopeCatalog.some((scope) => scope.scopeCode === "tax_account.read"), true);
    assert.equal(Array.isArray(sandbox.reportSnapshotExamples), true);
    assert.equal(sandbox.taxAccountSummaryExample.watermarkCode, "SANDBOX_PUBLIC_API");
    assert.equal(sandbox.exampleWebhookEvents.some((event) => event.eventType === "submission.updated"), true);

    const baseline = await requestJson(baseUrl, "/v1/public-api/compatibility-baselines", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        version: "2026-03-25",
        routeHash: "phase16-2-routes",
        specHash: "phase16-2-spec",
        endpointCount: spec.endpoints.length
      }
    });
    assert.equal(baseline.version, "2026-03-25");
    assert.equal(baseline.specHash, "phase16-2-spec");
    assert.equal(baseline.endpointCount, spec.endpoints.length);
  } finally {
    await stopServer(server);
  }
});
