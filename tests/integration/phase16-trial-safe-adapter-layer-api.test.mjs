import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import {
  HUBSPOT_CRM_PROVIDER_CODE,
  SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
  STRIPE_PAYMENT_LINKS_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.7 API exposes receipt mode policy and fences trial adapters away from legal effect", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T00:20:00Z"),
    runtimeMode: "trial"
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
    const stripeManifest = paymentManifests.items.find((item) => item.providerCode === STRIPE_PAYMENT_LINKS_PROVIDER_CODE);
    assert.equal(stripeManifest.receiptModePolicy.trial, "trial_simulated");
    assert.equal(stripeManifest.receiptModePolicy.production, "provider_receipt_required");

    const trialStripeConnection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "payment_link",
        connectionType: "payment_link",
        providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
        displayName: "Trial Stripe",
        environmentMode: "trial",
        credentialsRef: "secret://stripe/trial-api",
        secretManagerRef: "vault://stripe/trial-api"
      }
    });
    assert.equal(trialStripeConnection.receiptMode, "trial_simulated");
    assert.equal(trialStripeConnection.supportsLegalEffect, false);

    const productionHubspotConnection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: HUBSPOT_CRM_PROVIDER_CODE,
        displayName: "Production HubSpot",
        environmentMode: "production",
        credentialsRef: "secret://hubspot/prod-api",
        secretManagerRef: "vault://hubspot/prod-api"
      }
    });
    assert.equal(productionHubspotConnection.receiptMode, "internal_audit_only");
    assert.equal(productionHubspotConnection.supportsLegalEffect, false);

    for (const connectionId of [trialStripeConnection.connectionId, productionHubspotConnection.connectionId]) {
      for (const permissionCode of ["company.manage", "company.read"]) {
        platform.createObjectGrant({
          sessionToken: adminToken,
          companyId: DEMO_IDS.companyId,
          companyUserId: DEMO_IDS.companyUserId,
          permissionCode,
          objectType: "integration_connection",
          objectId: connectionId
        });
      }
    }

    const healthCheck = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${trialStripeConnection.connectionId}/health-checks`,
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
    assert.equal(
      healthCheck.results.some((result) => result.checkCode === "trial_receipt_mode" && result.status === "passed"),
      true
    );

    const blockedTrialAgi = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "evidence_archive",
        connectionType: "signing_evidence_archive",
        providerCode: SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
        displayName: "Trial signing archive",
        environmentMode: "trial",
        credentialsRef: "secret://signing-archive/trial-api",
        secretManagerRef: "vault://signing-archive/trial-api"
      }
    });
    assert.equal(blockedTrialAgi.error, "integration_environment_mode_not_supported");
  } finally {
    await stopServer(server);
  }
});
