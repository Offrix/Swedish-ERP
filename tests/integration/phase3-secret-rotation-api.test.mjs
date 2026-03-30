import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
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

test("Phase 3.6 API records emergency revoke containment against runtime incidents", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T09:00:00Z")
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

    const managedSecret = await requestJson(baseUrl, "/v1/ops/secrets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "banking",
        secretType: "api_secret",
        secretRef: "vault://prod/banking/api-secret-v1",
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        rotationCadenceDays: 30
      }
    });
    const callbackSecret = await requestJson(baseUrl, "/v1/ops/callback-secrets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "banking",
        callbackLabel: "banking-webhook",
        callbackDomain: "banking.example.test",
        callbackPath: "/banking/webhook",
        currentSecretRef: "vault://production/banking/api-secret-v1",
        managedSecretId: managedSecret.managedSecretId,
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        rotationCadenceDays: 30
      }
    });
    const certificateChain = await requestJson(baseUrl, "/v1/ops/certificate-chains", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "banking",
        certificateLabel: "banking-cert",
        callbackDomain: "banking.example.test",
        subjectCommonName: "banking.example.test",
        sanDomains: ["banking.example.test"],
        privateKeySecretRef: "vault://prod/banking/api-secret-v1",
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        notAfter: "2026-12-31T00:00:00.000Z",
        renewalWindowDays: 30
      }
    });
    const incident = await requestJson(baseUrl, "/v1/backoffice/incidents", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        title: "Banking provider compromise",
        summary: "Emergency revoke and containment are required.",
        severity: "critical",
        commanderUserId: DEMO_IDS.userId,
        relatedObjectRefs: [{ objectType: "managed_secret", objectId: managedSecret.managedSecretId }]
      }
    });

    const revoked = await requestJson(baseUrl, `/v1/ops/secrets/${managedSecret.managedSecretId}/revoke`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: incident.incident.incidentId,
        reasonCode: "credential_compromise"
      }
    });
    assert.equal(revoked.managedSecret.status, "retired");
    assert.equal(revoked.linkedCallbackSecrets[0].status, "retired");
    assert.equal(revoked.linkedCertificateChains[0].status, "revoked");
    assert.equal(revoked.rotationRecord.status, "revoked");

    const incidentEvents = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/events?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    const mitigationEvent = incidentEvents.items.find((item) => item.eventType === "mitigation_started");
    assert.equal(Boolean(mitigationEvent), true);
    assert.equal(mitigationEvent.relatedObjectRefs.some((ref) => ref.objectType === "managed_secret" && ref.objectId === managedSecret.managedSecretId), true);
    assert.equal(mitigationEvent.relatedObjectRefs.some((ref) => ref.objectType === "callback_secret" && ref.objectId === callbackSecret.callbackSecretId), true);
    assert.equal(mitigationEvent.relatedObjectRefs.some((ref) => ref.objectType === "certificate_chain" && ref.objectId === certificateChain.certificateChainId), true);

    const observability = await requestJson(baseUrl, `/v1/ops/observability?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.equal(observability.secretManagement.retiredManagedSecretCount, 1);
    assert.equal(observability.secretManagement.retiredCallbackSecretCount, 1);
    assert.equal(observability.secretManagement.revokedCertificateCount, 1);
    assert.equal(observability.secretManagement.revokedSecretRotationCount, 1);
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.6 API supports direct callback and certificate emergency revoke routes", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T09:00:00Z")
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

    const callbackSecret = await requestJson(baseUrl, "/v1/ops/callback-secrets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "ocr",
        callbackLabel: "ocr-webhook",
        callbackDomain: "ocr.example.test",
        callbackPath: "/ocr/webhook",
        currentSecretRef: "vault://prod/ocr/webhook-secret-v1",
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        rotationCadenceDays: 30
      }
    });
    const certificateChain = await requestJson(baseUrl, "/v1/ops/certificate-chains", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production",
        providerCode: "ocr",
        certificateLabel: "ocr-cert",
        callbackDomain: "ocr.example.test",
        subjectCommonName: "ocr.example.test",
        sanDomains: ["ocr.example.test"],
        privateKeySecretRef: "vault://prod/ocr/private-key-v1",
        ownerUserId: DEMO_IDS.userId,
        backupOwnerUserId: DEMO_IDS.userId,
        notAfter: "2026-12-31T00:00:00.000Z",
        renewalWindowDays: 30
      }
    });
    const incident = await requestJson(baseUrl, "/v1/backoffice/incidents", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        title: "OCR callback compromise",
        summary: "Containment is required for callback and certificate assets.",
        severity: "high",
        commanderUserId: DEMO_IDS.userId
      }
    });

    const revokedCallback = await requestJson(baseUrl, `/v1/ops/callback-secrets/${callbackSecret.callbackSecretId}/revoke`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: incident.incident.incidentId,
        reasonCode: "callback_secret_compromise"
      }
    });
    assert.equal(revokedCallback.status, "retired");

    const revokedCertificate = await requestJson(baseUrl, `/v1/ops/certificate-chains/${certificateChain.certificateChainId}/revoke`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: incident.incident.incidentId,
        reasonCode: "certificate_compromise"
      }
    });
    assert.equal(revokedCertificate.status, "revoked");

    const incidentEvents = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/events?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken,
      expectedStatus: 200
    });
    assert.equal(incidentEvents.items.filter((item) => item.eventType === "mitigation_started").length, 2);
    assert.equal(
      incidentEvents.items.some((item) => item.relatedObjectRefs.some((ref) => ref.objectType === "callback_secret" && ref.objectId === callbackSecret.callbackSecretId)),
      true
    );
    assert.equal(
      incidentEvents.items.some((item) => item.relatedObjectRefs.some((ref) => ref.objectType === "certificate_chain" && ref.objectId === certificateChain.certificateChainId)),
      true
    );
  } finally {
    await stopServer(server);
  }
});
