import test from "node:test";
import assert from "node:assert/strict";
import { BANKID_PROVIDER_CODE } from "../../packages/auth-core/src/index.mjs";
import { createDurableStateSnapshotArtifact, SECURITY_CLASS_CODES } from "../../packages/domain-core/src/index.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 3.1 centralizes security classes across inventory, auth and integration credentials", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T12:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  platform.registerManagedSecret({
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
  platform.registerCallbackSecret({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    mode: "production",
    providerCode: "payments",
    callbackLabel: "payments-webhook",
    callbackDomain: "callbacks.example.test",
    callbackPath: "/payments/webhook",
    currentSecretRef: "vault://prod/payments/webhook-secret-v1",
    ownerUserId: DEMO_IDS.userId,
    backupOwnerUserId: DEMO_IDS.userId,
    rotationCadenceDays: 90
  });
  platform.registerCertificateChain({
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
  const connection = platform.createIntegrationConnection({
    companyId: DEMO_IDS.companyId,
    surfaceCode: "auth_identity",
    connectionType: "bankid_authentication",
    providerCode: BANKID_PROVIDER_CODE,
    displayName: "BankID auth",
    environmentMode: "production",
    credentialsRef: "secret://signicat/prod",
    secretManagerRef: "vault://prod/signicat/client-secret",
    callbackDomain: "bankid.auth.swedish-erp.example.com",
    callbackPath: "/v1/auth/bankid/callback",
    actorId: "phase3-1-unit"
  });

  const catalog = platform.getSecurityClassificationCatalog({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.deepEqual(catalog.classes.map((entry) => entry.classCode), SECURITY_CLASS_CODES);
  assert.equal(
    catalog.fieldClassifications.some(
      (entry) => entry.fieldCode === "certificate_chain.private_key_secret_ref" && entry.classCode === "S5"
    ),
    true
  );
  assert.equal(catalog.inventorySummary.managedSecretCount, 1);
  assert.equal(catalog.inventorySummary.callbackSecretCount, 1);
  assert.equal(catalog.inventorySummary.certificateChainCount, 1);
  assert.equal(catalog.inventorySummary.integrationCredentialSetCount, 1);
  assert.equal(catalog.inventorySummary.countsByClass.S5, 1);
  assert.equal(catalog.inventorySummary.countsByClass.S4 >= 4, true);

  const credentials = platform.listCredentialSetMetadata({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId
  });
  assert.equal(credentials.length, 1);
  assert.equal(credentials[0].credentialRefClassCode, "S4");
  assert.equal(credentials[0].secretManagerRefClassCode, "S4");

  const identityIsolation = platform.getIdentityIsolationSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(
    identityIsolation.modeCatalog.every(
      (entry) => entry.credentialSecretClassCode === "S4" && entry.webhookSecretClassCode === "S4"
    ),
    true
  );
});

test("Phase 3.1 rejects non-canonical snapshot class masks", () => {
  assert.throws(
    () =>
      createDurableStateSnapshotArtifact({
        domainKey: "orgAuth",
        snapshot: {},
        classMask: ["S9"]
      }),
    (error) => error?.code === "snapshot_artifact_class_mask_invalid"
  );
});
