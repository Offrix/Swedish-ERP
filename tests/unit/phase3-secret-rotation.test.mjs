import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 3.5 formalizes managed secrets, callback overlap and certificate renewal summaries", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T09:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const managedSecret = platform.registerManagedSecret({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    mode: "production",
    providerCode: "payments",
    secretType: "webhook_signing_secret",
    secretRef: "vault://prod/payments/webhook-secret-v1",
    ownerUserId: DEMO_IDS.userId,
    backupOwnerUserId: DEMO_IDS.userId,
    rotationCadenceDays: 90
  });
  const callbackSecret = platform.registerCallbackSecret({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    mode: "production",
    providerCode: "payments",
    callbackLabel: "payments-webhook",
    callbackDomain: "callbacks.example.test",
    callbackPath: "/payments/webhook",
    currentSecretRef: "vault://prod/payments/webhook-secret-v1",
    managedSecretId: managedSecret.managedSecretId,
    ownerUserId: DEMO_IDS.userId,
    backupOwnerUserId: DEMO_IDS.userId,
    rotationCadenceDays: 90
  });
  const certificateChain = platform.registerCertificateChain({
    sessionToken: adminToken,
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
  });

  const rotationRecord = platform.rotateManagedSecret({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    managedSecretId: managedSecret.managedSecretId,
    nextSecretRef: "vault://production/payments/webhook-secret-v2",
    nextSecretVersion: "webhook-secret-v2",
    verificationMode: "synthetic_smoke",
    dualRunningUntil: "2026-03-29T09:00:00.000Z",
    callbackSecretIds: [callbackSecret.callbackSecretId],
    certificateChainIds: [certificateChain.certificateChainId]
  });

  assert.equal(rotationRecord.status, "rotated");
  assert.equal(rotationRecord.nextSecretVersion, "webhook-secret-v2");
  assert.equal(rotationRecord.nextSecretRef.includes("webhook-secret-v2"), false);

  const listedManagedSecrets = platform.listManagedSecrets({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(listedManagedSecrets[0].mode, "production");
  assert.equal(listedManagedSecrets[0].currentSecretRef.includes("webhook-secret-v2"), false);
  assert.equal(listedManagedSecrets[0].status, "dual_running");

  const listedCallbackSecrets = platform.listCallbackSecrets({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(listedCallbackSecrets[0].status, "dual_running");
  assert.equal(listedCallbackSecrets[0].currentSecretRef.includes("webhook-secret-v2"), false);

  const listedCertificateChains = platform.listCertificateChains({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(listedCertificateChains[0].status, "renewal_due");
  assert.equal(listedCertificateChains[0].privateKeySecretRef.includes("webhook-secret-v2"), false);

  const supportCase = platform.createSupportCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    category: "security_rotation",
    severity: "high"
  });
  const verifyRegisteredRefs = platform.runAdminDiagnostic({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    commandType: "verify_secret_refs",
    input: {
      secretRefs: [
        "vault://production/payments/webhook-secret-v2"
      ]
    }
  });
  assert.equal(verifyRegisteredRefs.resultSummary.verified, true);
  assert.equal(verifyRegisteredRefs.resultSummary.secretRefInventory[0].registered, true);

  const verifyUnknownRef = platform.runAdminDiagnostic({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    commandType: "verify_secret_refs",
    input: {
      secretRefs: [
        "vault://prod/payments/unknown-secret"
      ]
    }
  });
  assert.equal(verifyUnknownRef.resultSummary.verified, false);

  const summary = platform.getSecretManagementSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(summary.managedSecretCount, 1);
  assert.equal(summary.secretRotationRecordCount, 1);
  assert.equal(summary.dualRunningCallbackSecretCount, 1);
  assert.equal(summary.expiringCertificateCount, 1);
  assert.equal(summary.modeIsolationViolationCount, 0);
});
