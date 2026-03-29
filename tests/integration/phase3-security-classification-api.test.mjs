import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { BANKID_PROVIDER_CODE } from "../../packages/auth-core/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 3.1 API exposes central security classification inventory", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T12:30:00Z")
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
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase3-security-reader@example.test",
      displayName: "Phase 3 Security Reader",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase3-security-reader@example.test"
    });

    await requestJson(baseUrl, "/v1/ops/secrets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "payments",
        secretType: "webhook_signing_secret",
        secretRef: "vault://prod/payments/webhook-secret-v1",
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        rotationCadenceDays: 90
      }
    });
    await requestJson(baseUrl, "/v1/ops/certificate-chains", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "payments",
        certificateLabel: "payments-callback-cert",
        callbackDomain: "callbacks.example.test",
        subjectCommonName: "callbacks.example.test",
        sanDomains: ["callbacks.example.test"],
        privateKeySecretRef: "vault://prod/payments/callback-private-key-v1",
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        notAfter: "2026-04-10T00:00:00.000Z",
        renewalWindowDays: 30
      }
    });
    await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "auth_identity",
        connectionType: "bankid_authentication",
        providerCode: BANKID_PROVIDER_CODE,
        displayName: "BankID auth",
        environmentMode: "production",
        credentialsRef: "secret://signicat/prod",
        secretManagerRef: "vault://prod/signicat/client-secret",
        callbackDomain: "bankid.auth.swedish-erp.example.com",
        callbackPath: "/v1/auth/bankid/callback"
      }
    });

    const catalog = await requestJson(baseUrl, `/v1/security/classes?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.deepEqual(catalog.classes.map((entry) => entry.classCode), ["S0", "S1", "S2", "S3", "S4", "S5"]);
    assert.equal(
      catalog.fieldClassifications.some(
        (entry) => entry.fieldCode === "integration.secret_manager_ref" && entry.classCode === "S4"
      ),
      true
    );
    assert.equal(catalog.inventorySummary.managedSecretCount, 1);
    assert.equal(catalog.inventorySummary.integrationCredentialSetCount, 1);
    assert.equal(catalog.inventorySummary.countsByClass.S5, 1);
    assert.equal(catalog.inventorySummary.countsByClass.S4 >= 3, true);

    const forbidden = await requestJson(baseUrl, `/v1/security/classes?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(forbidden.error, "backoffice_role_forbidden");
  } finally {
    await stopServer(server);
  }
});
