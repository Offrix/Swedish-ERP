import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  createPassingPartnerContractTestExecutors,
  createSuccessfulPartnerOperationExecutors
} from "../helpers/phase13-integrations-fixtures.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.1 API exposes integration control-plane, credentials, consent, health and environment isolation", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T11:00:00Z"),
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

    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_IDS.companyUserId,
      permissionCode: "company.manage",
      objectType: "integration_connection",
      objectId: DEMO_IDS.companyId
    });
    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_IDS.companyUserId,
      permissionCode: "company.read",
      objectType: "integration_connection",
      objectId: DEMO_IDS.companyId
    });

    const manifests = await requestJson(
      baseUrl,
      `/v1/integrations/capability-manifests?companyId=${DEMO_IDS.companyId}&surfaceCode=partner`,
      {
        token: adminToken
      }
    );
    assert.equal(manifests.items.some((item) => item.providerCode === "enable_banking"), true);
    const bankManifest = manifests.items.find((item) => item.providerCode === "enable_banking");
    assert.equal(bankManifest.modeMatrix.trial_safe, true);
    assert.equal(bankManifest.allowedEnvironmentModes.includes("sandbox"), true);

    const createdConnection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "partner",
        connectionType: "bank",
        providerCode: "enable_banking",
        displayName: "Bank sandbox connection",
        environmentMode: "sandbox",
        rateLimitPerMinute: 20,
        fallbackMode: "queue_retry",
        credentialsRef: "secret://enable-banking/sandbox-primary",
        secretManagerRef: "vault://enable-banking/sandbox-primary",
        credentialKind: "api_credentials",
        credentialsExpiresAt: "2026-12-31T23:59:59Z"
      }
    });
    assert.equal(createdConnection.environmentMode, "sandbox");
    assert.equal(createdConnection.providerEnvironmentRef, "sandbox");
    assert.equal(createdConnection.credentialsConfigured, true);

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

    const connections = await requestJson(
      baseUrl,
      `/v1/integrations/connections?companyId=${DEMO_IDS.companyId}&environmentMode=sandbox`,
      { token: adminToken }
    );
    assert.equal(connections.items.length >= 1, true);

    const connection = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(connection.connectionId, createdConnection.connectionId);
    assert.equal(connection.modeMatrix.sandbox_supported, true);

    const rotatedCredential = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}/credentials`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          credentialsRef: "secret://enable-banking/sandbox-rotated",
          secretManagerRef: "vault://enable-banking/sandbox-rotated",
          credentialKind: "api_credentials",
          expiresAt: "2027-01-31T23:59:59Z"
        }
      }
    );
    assert.equal(rotatedCredential.status, "active");

    const credentialMetadata = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}/credentials?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(credentialMetadata.items.length, 2);
    assert.equal(credentialMetadata.items.filter((item) => item.status === "active").length, 1);
    assert.equal("credentialRef" in credentialMetadata.items[0], false);

    const consent = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}/consents`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          scopeSet: ["accounts.read", "payments.write"],
          grantType: "open_banking_consent",
          externalConsentRef: "consent-phase16-1"
        }
      }
    );
    assert.equal(consent.status, "authorized");

    const consentList = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}/consents?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(consentList.items.length, 1);
    assert.equal(consentList.items[0].scopeSet.includes("accounts.read"), true);

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
    assert.equal(healthCheck.results.some((result) => result.checkCode === "environment_isolation"), true);

    const healthChecks = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${createdConnection.connectionId}/health-checks?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(healthChecks.items.length, 1);

    const duplicateCredentials = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "partner",
        connectionType: "bank",
        providerCode: "enable_banking",
        displayName: "Bank production connection",
        environmentMode: "production",
        rateLimitPerMinute: 20,
        fallbackMode: "queue_retry",
        credentialsRef: "secret://enable-banking/sandbox-rotated",
        secretManagerRef: "vault://enable-banking/sandbox-rotated",
        credentialKind: "api_credentials"
      }
    });
    assert.equal(duplicateCredentials.error, "integration_credentials_mode_reuse_forbidden");
  } finally {
    await stopServer(server);
  }
});
