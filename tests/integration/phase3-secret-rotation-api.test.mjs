import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 3.5 API formalizes secrets, callback overlap and observability summaries", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T09:00:00Z")
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
      email: "phase3-field-user@example.test",
      displayName: "Phase 3 Field User",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase3-field-user@example.test"
    });

    const managedSecret = await requestJson(baseUrl, "/v1/ops/secrets", {
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
    const callbackSecret = await requestJson(baseUrl, "/v1/ops/callback-secrets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "payments",
        callbackLabel: "payments-webhook",
        callbackDomain: "callbacks.example.test",
        callbackPath: "/payments/webhook",
        currentSecretRef: "vault://production/payments/webhook-secret-v1",
        managedSecretId: managedSecret.managedSecretId,
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        rotationCadenceDays: 90
      }
    });
    const certificateChain = await requestJson(baseUrl, "/v1/ops/certificate-chains", {
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
    const rotationRecord = await requestJson(baseUrl, `/v1/ops/secrets/${managedSecret.managedSecretId}/rotate`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        nextSecretRef: "vault://production/payments/webhook-secret-v2",
        nextSecretVersion: "webhook-secret-v2",
        verificationMode: "synthetic_smoke",
        dualRunningUntil: "2026-03-29T09:00:00.000Z",
        callbackSecretIds: [callbackSecret.callbackSecretId],
        certificateChainIds: [certificateChain.certificateChainId]
      }
    });
    assert.equal(rotationRecord.status, "rotated");

    const listedManagedSecrets = await requestJson(baseUrl, `/v1/ops/secrets?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.equal(listedManagedSecrets.items.length, 1);
    assert.equal(listedManagedSecrets.items[0].currentSecretRef.includes("webhook-secret-v2"), false);
    assert.equal(listedManagedSecrets.items[0].status, "dual_running");

    const listedCallbackSecrets = await requestJson(baseUrl, `/v1/ops/callback-secrets?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.equal(listedCallbackSecrets.items[0].status, "dual_running");
    assert.equal(listedCallbackSecrets.items[0].currentSecretRef.includes("webhook-secret-v2"), false);

    const listedCertificateChains = await requestJson(baseUrl, `/v1/ops/certificate-chains?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.equal(listedCertificateChains.items[0].status, "renewal_due");
    assert.equal(listedCertificateChains.items[0].privateKeySecretRef.includes("webhook-secret-v2"), false);

    const rotationHistory = await requestJson(baseUrl, `/v1/ops/secret-rotations?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.equal(rotationHistory.items.length, 1);

    const observability = await requestJson(baseUrl, `/v1/ops/observability?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.equal(observability.metrics.rotationDueSecretCount, 0);
    assert.equal(observability.metrics.expiringCertificateCount, 1);
    assert.equal(observability.metrics.secretIsolationViolationCount, 0);
    assert.equal(observability.secretManagement.secretRotationRecordCount, 1);

    const forbiddenSecretsList = await requestJson(baseUrl, `/v1/ops/secrets?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(forbiddenSecretsList.error, "backoffice_role_forbidden");
  } finally {
    await stopServer(server);
  }
});
