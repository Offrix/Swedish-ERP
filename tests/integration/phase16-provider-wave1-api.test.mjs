import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.4 API exposes wave-1 manifests and supports non-partner provider connections", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T12:10:00Z")
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

    for (const permissionCode of ["company.manage", "company.read"]) {
      platform.createObjectGrant({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        companyUserId: DEMO_IDS.companyUserId,
        permissionCode,
        objectType: "integration_connection",
        objectId: DEMO_IDS.companyId
      });
    }

    const paymentManifests = await requestJson(
      baseUrl,
      `/v1/integrations/capability-manifests?companyId=${DEMO_IDS.companyId}&surfaceCode=payment_link`,
      { token: adminToken }
    );
    assert.equal(paymentManifests.items.some((item) => item.providerCode === "stripe_payment_links"), true);

    const regulatedManifests = await requestJson(
      baseUrl,
      `/v1/integrations/capability-manifests?companyId=${DEMO_IDS.companyId}&surfaceCode=regulated_transport`,
      { token: adminToken }
    );
    assert.equal(regulatedManifests.items.some((item) => item.providerCode === "skatteverket_agi"), true);
    assert.equal(regulatedManifests.items.some((item) => item.providerCode === "bolagsverket_annual"), true);

    const createdConnection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "payment_link",
        connectionType: "payment_link",
        providerCode: "stripe_payment_links",
        displayName: "Stripe wave 1",
        environmentMode: "trial",
        credentialsRef: "secret://stripe/trial",
        secretManagerRef: "vault://stripe/trial"
      }
    });
    assert.equal(createdConnection.surfaceCode, "payment_link");
    assert.equal(createdConnection.providerCode, "stripe_payment_links");
    assert.equal(createdConnection.trialSafe, true);

    for (const permissionCode of ["company.manage", "company.read"]) {
      platform.createObjectGrant({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        companyUserId: DEMO_IDS.companyUserId,
        permissionCode,
        objectType: "integration_connection",
        objectId: createdConnection.connectionId
      });
    }

    const connection = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(connection.providerEnvironmentRef, "trial_safe");

    const healthCheck = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}/health-checks`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          checkSetCode: "standard"
        }
      }
    );
    assert.equal(["healthy", "degraded"].includes(healthCheck.status), true);
  } finally {
    await stopServer(server);
  }
});
