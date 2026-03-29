import test from "node:test";
import assert from "node:assert/strict";
import {
  createEnvelopeCrypto,
  createSecretStore,
  deserializeSnapshotValue
} from "../../packages/domain-core/src/index.mjs";
import {
  createOrgAuthPlatform,
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";

test("Phase 3.2 central crypto and secret store provide stable envelope encryption and blind indexes", () => {
  const cryptoRuntime = createEnvelopeCrypto({
    masterKey: "phase3-secret-master",
    activeKeyVersion: "phase3-v1"
  });
  const envelope = cryptoRuntime.seal("bank-grade-secret", {
    aad: {
      secretId: "secret-1",
      classCode: "S4"
    }
  });
  assert.equal(
    cryptoRuntime.open(envelope, {
      aad: {
        secretId: "secret-1",
        classCode: "S4"
      }
    }),
    "bank-grade-secret"
  );
  assert.equal(
    cryptoRuntime.createBlindIndex("556677-1100", { purpose: "org_number_lookup" }).digest,
    cryptoRuntime.createBlindIndex("556677-1100", { purpose: "org_number_lookup" }).digest
  );
  assert.throws(
    () =>
      cryptoRuntime.open(envelope, {
        aad: {
          secretId: "secret-2",
          classCode: "S4"
        }
      })
  );

  const secretStore = createSecretStore({
    clock: () => new Date("2026-03-29T13:00:00Z"),
    environmentMode: "test",
    storeId: "phase3-test",
    masterKey: "phase3-store-master",
    activeKeyVersion: "phase3-store-v1"
  });
  const stored = secretStore.storeSecretMaterial({
    secretId: "provider-token",
    classCode: "S4",
    material: "oauth-refresh-token",
    blindIndexInputs: [
      {
        purpose: "provider_token_lookup",
        value: "oauth-refresh-token"
      }
    ],
    fingerprintPurpose: "provider_token_fingerprint"
  });
  assert.equal(stored.secretRef, "provider-token");
  assert.equal(secretStore.readSecretMaterial({ secretId: "provider-token" }), "oauth-refresh-token");
  const bundle = secretStore.exportSecretBundle();
  assert.equal(bundle.entries.length, 1);
  assert.equal(JSON.stringify(bundle).includes("oauth-refresh-token"), false);
});

test("Phase 3.2 org auth exports only secret refs and restores auth broker flows from secret store bundle", () => {
  const clock = () => new Date("2026-03-29T14:30:00Z");
  const platform = createOrgAuthPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo"
  });

  const adminLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: adminLogin.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      now: clock()
    })
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: adminLogin.sessionToken
  });
  const federationStart = platform.startFederationAuthentication({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL,
    connectionId: "acme-sso",
    redirectUri: "https://app.example.test/auth/federation/callback"
  });

  const durableState = platform.exportDurableState();
  const serialized = JSON.stringify(durableState);
  assert.equal(serialized.includes(bankIdStart.qrStartSecret), false);
  assert.equal(serialized.includes(platform.getFederationAuthorizationCodeForTesting(federationStart.authRequestId)), false);
  assert.equal("authBrokerEnvelope" in durableState, false);
  assert.equal(typeof durableState.authBrokerSecretRef?.secretRef, "string");
  assert.equal(Array.isArray(durableState.secretStoreBundle?.entries), true);
  assert.equal(durableState.secretStoreBundle.entries.length >= 3, true);
  const authFactorSecrets = [...deserializeSnapshotValue(durableState.authFactorSecrets).values()];
  const authChallengeSecrets = [...deserializeSnapshotValue(durableState.authChallengeSecrets).values()];
  assert.equal(
    authFactorSecrets.every((record) => !("envelope" in record) && typeof record.secretRef === "string"),
    true
  );
  assert.equal(
    authChallengeSecrets.every((record) => !("envelope" in record) && typeof record.challengeRef === "string"),
    true
  );

  const restoredPlatform = createOrgAuthPlatform({ clock });
  restoredPlatform.importDurableState(durableState);
  const restoredCollect = restoredPlatform.collectBankIdAuthentication({
    sessionToken: adminLogin.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: restoredPlatform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });
  assert.equal(restoredCollect.session.status, "active");
  const restoredFederation = restoredPlatform.completeFederationAuthentication({
    sessionToken: federationStart.sessionToken,
    authRequestId: federationStart.authRequestId,
    authorizationCode: restoredPlatform.getFederationAuthorizationCodeForTesting(federationStart.authRequestId),
    state: federationStart.state
  });
  assert.equal(restoredFederation.session.status, "active");
});

test("Phase 3.2 integrations durable export redacts webhook and OCR callback secrets but restores runtime flows", async () => {
  const clock = () => new Date("2026-03-29T22:00:00Z");
  const sentDeliveries = [];
  const platform = createApiPlatform({
    clock,
    webhookDeliveryExecutor: async ({ delivery }) => {
      sentDeliveries.push(delivery.deliveryId);
      return {
        outcome: "sent",
        httpStatus: 202
      };
    }
  });

  const client = platform.createPublicApiClient({
    companyId: DEMO_IDS.companyId,
    displayName: "Phase 3.2 webhook client",
    mode: "sandbox",
    scopes: ["api_spec.read", "webhook.manage"],
    actorId: "phase3-2"
  });
  const subscription = platform.createWebhookSubscription({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId,
    mode: "sandbox",
    eventTypes: ["report.snapshot.ready"],
    targetUrl: "https://example.test/phase3-secret-redaction",
    actorId: "phase3-2"
  });
  const extraction = platform.startDocumentOcrExtraction({
    companyId: DEMO_IDS.companyId,
    documentId: "phase3-secret-redaction-doc",
    mimeType: "application/pdf",
    profileCode: "invoice_parse",
    pageCount: 20,
    callbackMode: "manual_provider_callback",
    sourceText: "Invoice 1001",
    reasonCode: "phase3_secret_redaction"
  });

  const durableState = platform.getDomain("integrations").exportDurableState();
  const serialized = JSON.stringify(durableState);
  assert.equal(serialized.includes(subscription.secret), false);
  assert.equal(serialized.includes(extraction.callbackToken), false);
  const webhookSecretRecords = [...deserializeSnapshotValue(durableState.webhookSubscriptionSecrets).values()];
  assert.equal(
    webhookSecretRecords.every((record) => !("envelope" in record) && typeof record.secretRef === "string"),
    true
  );
  assert.equal(typeof durableState.providerSnapshots.documentOcrProvider.protectedSecretRef, "string");
  assert.equal(Array.isArray(durableState.secretStoreBundle?.entries), true);

  const restoredPlatform = createApiPlatform({
    clock,
    webhookDeliveryExecutor: async ({ delivery }) => {
      sentDeliveries.push(delivery.deliveryId);
      return {
        outcome: "sent",
        httpStatus: 202
      };
    }
  });
  restoredPlatform.getDomain("integrations").importDurableState(durableState);
  const restoredExtraction = restoredPlatform.collectDocumentOcrOperation({
    operationName: extraction.operationName,
    callbackToken: extraction.callbackToken
  });
  assert.equal(restoredExtraction.status, "completed");

  const event = restoredPlatform.emitWebhookEvent({
    companyId: DEMO_IDS.companyId,
    eventType: "report.snapshot.ready",
    resourceType: "report_snapshot",
    resourceId: "phase3-secret-redaction-snapshot",
    payload: {
      snapshotId: "phase3-secret-redaction-snapshot"
    },
    mode: "sandbox",
    eventKey: "phase3-2:durable"
  });
  const dispatch = await restoredPlatform.dispatchWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    deliveryId: event.deliveries[0].deliveryId,
    actorId: "phase3-2"
  });
  assert.equal(dispatch.items[0].status, "sent");
  assert.equal(sentDeliveries.length >= 1, true);
});
