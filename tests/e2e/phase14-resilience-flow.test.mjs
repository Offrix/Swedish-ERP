import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.2 flow exposes ops routes and keeps disable plus recovery artifacts visible", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T22:40:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/ops/feature-flags"), true);
    assert.equal(root.routes.includes("/v1/ops/emergency-disables/:emergencyDisableId/release"), true);
    assert.equal(root.routes.includes("/v1/ops/chaos-scenarios"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ops/feature-flags", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        flagKey: "search.async_exports",
        description: "Controls async report exports.",
        flagType: "ops",
        scopeType: "company",
        scopeRef: DEMO_IDS.companyId,
        ownerUserId: DEMO_IDS.userId,
        riskClass: "medium",
        sunsetAt: "2026-12-31",
        enabled: true
      }
    });
    const disable = await requestJson(baseUrl, "/v1/ops/emergency-disables", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        flagKey: "search.async_exports",
        reasonCode: "incident_lockdown",
        expiresInMinutes: 15
      }
    });
    await requestJson(baseUrl, "/v1/ops/load-profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        profileCode: "pilot_target",
        targetThroughputPerMinute: 900,
        observedP95Ms: 210,
        queueRecoverySeconds: 50,
        status: "passed"
      }
    });

    const flags = await requestJson(baseUrl, `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(flags.resolved["search.async_exports"], false);
    const released = await requestJson(baseUrl, `/v1/ops/emergency-disables/${disable.emergencyDisable.emergencyDisableId}/release`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        verificationSummary: "Export worker backlog is empty and provider checks are green."
      }
    });
    assert.equal(released.emergencyDisable.status, "released");
    const flagsAfterRelease = await requestJson(baseUrl, `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(flagsAfterRelease.resolved["search.async_exports"], true);
  } finally {
    await stopServer(server);
  }
});
