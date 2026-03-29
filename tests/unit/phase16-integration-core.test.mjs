import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import {
  createPassingPartnerContractTestExecutors,
  createSuccessfulPartnerOperationExecutors
} from "../helpers/phase13-integrations-fixtures.mjs";

test("Phase 16.1 integration core materializes canonical connections, credentials, consent and isolation", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:00:00Z"),
    partnerContractTestExecutors: createPassingPartnerContractTestExecutors(),
    partnerOperationExecutors: createSuccessfulPartnerOperationExecutors()
  });

  const manifests = platform.listAdapterCapabilityManifests({ surfaceCode: "partner" });
  assert.equal(manifests.some((manifest) => manifest.providerCode === "enable_banking"), true);
  assert.equal(manifests.some((manifest) => manifest.providerCode === "google_document_ai"), false);
  const bankManifest = manifests.find((manifest) => manifest.providerCode === "enable_banking");
  assert.equal(bankManifest.modeMatrix.trial_safe, true);
  assert.equal(bankManifest.modeMatrix.production_supported, true);
  const documentAiManifests = platform.listAdapterCapabilityManifests({ surfaceCode: "document_ai" });
  assert.equal(documentAiManifests.length, 1);
  assert.equal(documentAiManifests[0].trialSafe, true);
  assert.equal(documentAiManifests[0].modeMatrix.trial_safe, true);
  assert.equal(documentAiManifests[0].allowedEnvironmentModes.includes("trial"), true);

  const connection = platform.createIntegrationConnection({
    companyId: DEMO_IDS.companyId,
    surfaceCode: "partner",
    connectionType: "bank",
    providerCode: "enable_banking",
    displayName: "Sandbox bank adapter",
    environmentMode: "sandbox",
    rateLimitPerMinute: 10,
    fallbackMode: "queue_retry",
    credentialsRef: "secret://enable-banking/sandbox",
    secretManagerRef: "vault://enable-banking/sandbox",
    credentialKind: "api_credentials",
    credentialsExpiresAt: "2026-12-31T23:59:59Z",
    actorId: "phase16-1-unit"
  });

  assert.equal(connection.surfaceCode, "partner");
  assert.equal(connection.environmentMode, "sandbox");
  assert.equal(connection.providerEnvironmentRef, "sandbox");
  assert.equal(connection.credentialsConfigured, true);
  assert.equal(connection.consentRequired, true);

  const credentialMetadata = platform.listCredentialSetMetadata({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId
  });
  assert.equal(credentialMetadata.length, 1);
  assert.equal(credentialMetadata[0].credentialKind, "api_credentials");
  assert.equal(typeof credentialMetadata[0].credentialRefFingerprint, "string");
  assert.equal("credentialRef" in credentialMetadata[0], false);

  const consentGrant = platform.authorizeConsent({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId,
    scopeSet: ["accounts.read", "payments.write"],
    grantType: "open_banking_consent",
    externalConsentRef: "ob-consent-1",
    actorId: "phase16-1-unit"
  });
  assert.equal(consentGrant.status, "authorized");

  const health = platform.runIntegrationHealthCheck({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId,
    actorId: "phase16-1-unit"
  });
  assert.equal(["healthy", "degraded"].includes(health.status), true);
  assert.equal(health.results.some((result) => result.checkCode === "consent_authorized" && result.status === "passed"), true);

  assert.throws(
    () =>
      platform.createIntegrationConnection({
        companyId: DEMO_IDS.companyId,
        surfaceCode: "partner",
        connectionType: "bank",
        providerCode: "enable_banking",
        displayName: "Production bank adapter",
        environmentMode: "production",
        rateLimitPerMinute: 10,
        fallbackMode: "queue_retry",
        credentialsRef: "secret://enable-banking/sandbox",
        secretManagerRef: "vault://enable-banking/sandbox",
        credentialKind: "api_credentials",
        credentialsExpiresAt: "2026-12-31T23:59:59Z",
        actorId: "phase16-1-unit"
      }),
    (error) => error?.code === "integration_credentials_mode_reuse_forbidden"
  );
});

test("Phase 16.1 legacy partner creation still backfills canonical integration control records", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:05:00Z")
  });

  const partnerConnection = platform.createPartnerConnection({
    companyId: DEMO_IDS.companyId,
    connectionType: "peppol",
    providerCode: "pagero_online",
    displayName: "Peppol adapter",
    mode: "sandbox",
    rateLimitPerMinute: 30,
    fallbackMode: "queue_retry",
    credentialsRef: "secret://pagero/sandbox",
    actorId: "phase16-1-unit"
  });

  const connection = platform.getIntegrationConnection({
    companyId: DEMO_IDS.companyId,
    connectionId: partnerConnection.connectionId
  });
  assert.equal(connection.providerCode, "pagero_online");
  assert.equal(connection.credentialMetadataCount, 1);
  assert.equal(connection.capabilityManifestId, "partner:peppol:pagero_online");
});

test("Phase 16.1 defaults connection environment mode from runtime profile without TDZ regressions", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:10:00Z"),
    runtimeMode: "trial"
  });

  const connection = platform.createIntegrationConnection({
    companyId: DEMO_IDS.companyId,
    surfaceCode: "partner",
    connectionType: "bank",
    providerCode: "enable_banking",
    displayName: "Trial bank adapter",
    rateLimitPerMinute: 10,
    fallbackMode: "queue_retry",
    credentialsRef: "secret://enable-banking/trial",
    secretManagerRef: "vault://enable-banking/trial",
    credentialKind: "api_credentials",
    actorId: "phase16-1-unit"
  });

  assert.equal(connection.environmentMode, "trial");
  assert.equal(connection.providerEnvironmentRef, "trial_safe");
  assert.equal(connection.modeMatrix.trial_safe, true);
});
