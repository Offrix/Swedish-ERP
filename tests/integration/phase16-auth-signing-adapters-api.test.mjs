import test from "node:test";
import assert from "node:assert/strict";
import { BANKID_PROVIDER_CODE } from "../../packages/auth-core/src/index.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import {
  LOCAL_PASSKEY_PROVIDER_CODE,
  LOCAL_TOTP_PROVIDER_CODE,
  SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
  WORKOS_FEDERATION_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.5 API exposes auth/signing adapter manifests and validates callback health", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T15:40:00Z")
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

    const authManifests = await requestJson(
      baseUrl,
      `/v1/integrations/capability-manifests?companyId=${DEMO_IDS.companyId}&surfaceCode=auth_identity`,
      { token: adminToken }
    );
    assert.equal(authManifests.items.some((item) => item.providerCode === BANKID_PROVIDER_CODE), true);

    const localFactorManifests = await requestJson(
      baseUrl,
      `/v1/integrations/capability-manifests?companyId=${DEMO_IDS.companyId}&surfaceCode=auth_local_factor`,
      { token: adminToken }
    );
    assert.equal(localFactorManifests.items.some((item) => item.providerCode === LOCAL_PASSKEY_PROVIDER_CODE), true);
    assert.equal(localFactorManifests.items.some((item) => item.providerCode === LOCAL_TOTP_PROVIDER_CODE), true);

    const archiveManifests = await requestJson(
      baseUrl,
      `/v1/integrations/capability-manifests?companyId=${DEMO_IDS.companyId}&surfaceCode=evidence_archive`,
      { token: adminToken }
    );
    assert.equal(archiveManifests.items.some((item) => item.providerCode === SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE), true);

    const workosConnection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "enterprise_federation",
        connectionType: "enterprise_sso",
        providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
        displayName: "WorkOS production",
        environmentMode: "production",
        credentialsRef: "secret://workos/prod",
        secretManagerRef: "vault://workos/prod",
        callbackDomain: "federation.auth.swedish-erp.example.com",
        callbackPath: "/v1/auth/federation/callback"
      }
    });

    const passkeyConnection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "auth_local_factor",
        connectionType: "passkey",
        providerCode: LOCAL_PASSKEY_PROVIDER_CODE,
        displayName: "Local passkey",
        environmentMode: "production"
      }
    });
    assert.equal(passkeyConnection.credentialsConfigured, true);

    for (const connectionId of [workosConnection.connectionId, passkeyConnection.connectionId]) {
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

    const workosHealth = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${workosConnection.connectionId}/health-checks`,
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
    assert.equal(workosHealth.results.find((result) => result.checkCode === "callback_registration")?.status, "passed");

    const passkeyHealth = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${passkeyConnection.connectionId}/health-checks`,
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
    assert.equal(passkeyHealth.results.find((result) => result.checkCode === "credentials_configured")?.status, "passed");
  } finally {
    await stopServer(server);
  }
});
