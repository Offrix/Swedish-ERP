import test from "node:test";
import assert from "node:assert/strict";
import { BANKID_PROVIDER_CODE } from "../../packages/auth-core/src/index.mjs";
import {
  createIntegrationEngine,
  LOCAL_PASSKEY_PROVIDER_CODE,
  LOCAL_TOTP_PROVIDER_CODE,
  SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
  WORKOS_FEDERATION_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.5 exposes auth, federation, local factor and signing archive capability manifests", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T15:00:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests();
  assert.equal(manifests.some((manifest) => manifest.surfaceCode === "auth_identity" && manifest.providerCode === BANKID_PROVIDER_CODE), true);
  assert.equal(manifests.some((manifest) => manifest.surfaceCode === "enterprise_federation" && manifest.providerCode === WORKOS_FEDERATION_PROVIDER_CODE), true);
  assert.equal(manifests.some((manifest) => manifest.surfaceCode === "auth_local_factor" && manifest.providerCode === LOCAL_PASSKEY_PROVIDER_CODE), true);
  assert.equal(manifests.some((manifest) => manifest.surfaceCode === "auth_local_factor" && manifest.providerCode === LOCAL_TOTP_PROVIDER_CODE), true);
  assert.equal(manifests.some((manifest) => manifest.surfaceCode === "evidence_archive" && manifest.providerCode === SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE), true);
});

test("Phase 16.5 local factor connections are credentialless but still healthy", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T15:10:00Z")
  });

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "auth_local_factor",
    connectionType: "passkey",
    providerCode: LOCAL_PASSKEY_PROVIDER_CODE,
    displayName: "Local passkey",
    environmentMode: "production",
    actorId: "phase16-5-unit"
  });
  assert.equal(connection.credentialsConfigured, true);
  assert.deepEqual(connection.requiredCredentialKinds, []);

  const healthCheck = platform.runIntegrationHealthCheck({
    companyId: COMPANY_ID,
    connectionId: connection.connectionId,
    actorId: "phase16-5-unit"
  });
  const credentialResult = healthCheck.results.find((result) => result.checkCode === "credentials_configured");
  assert.equal(credentialResult.status, "passed");
  assert.equal(healthCheck.results.some((result) => result.status === "failed"), false);
  assert.equal(healthCheck.results.find((result) => result.checkCode === "provider_baseline")?.status, "warning");
});

test("Phase 16.5 async auth adapters enforce callback registration in health checks", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T15:20:00Z")
  });

  const missingCallback = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "enterprise_federation",
    connectionType: "enterprise_sso",
    providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
    displayName: "WorkOS missing callback",
    environmentMode: "production",
    credentialsRef: "secret://workos/prod",
    secretManagerRef: "vault://workos/prod",
    actorId: "phase16-5-unit"
  });
  const missingCallbackHealth = platform.runIntegrationHealthCheck({
    companyId: COMPANY_ID,
    connectionId: missingCallback.connectionId,
    actorId: "phase16-5-unit"
  });
  assert.equal(missingCallbackHealth.results.find((result) => result.checkCode === "callback_registration")?.status, "failed");

  const configuredCallback = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "auth_identity",
    connectionType: "bankid_authentication",
    providerCode: BANKID_PROVIDER_CODE,
    displayName: "Signicat configured",
    environmentMode: "production",
    credentialsRef: "secret://signicat/prod",
    secretManagerRef: "vault://signicat/prod",
    callbackDomain: "bankid.auth.swedish-erp.example.com",
    callbackPath: "/v1/auth/bankid/callback",
    actorId: "phase16-5-unit"
  });
  const configuredHealth = platform.runIntegrationHealthCheck({
    companyId: COMPANY_ID,
    connectionId: configuredCallback.connectionId,
    actorId: "phase16-5-unit"
  });
  assert.equal(configuredHealth.results.find((result) => result.checkCode === "callback_registration")?.status, "passed");
});

test("Phase 16.5 signing archive provider emits immutable signing evidence refs", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T15:30:00Z")
  });

  const archiveRecord = platform.archiveSigningEvidence({
    companyId: COMPANY_ID,
    sourceObjectType: "authority_submission",
    sourceObjectId: "submission-16-5",
    sourceObjectVersion: "v1",
    signerActorId: "phase16-5-signer",
    evidenceBundleId: "evidence-bundle-16-5",
    signaturePayloadHash: "abcdef1234567890abcdef1234567890",
    signoffHash: "abcdef1234567890abcdef1234567890"
  });

  assert.equal(archiveRecord.providerCode, SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE);
  assert.equal(archiveRecord.providerBaselineCode, "SE-SIGNICAT-SIGNING-ARCHIVE");
  assert.equal(archiveRecord.signatureReference.startsWith("signature:"), true);
  assert.equal(platform.listSigningEvidenceArchives({ companyId: COMPANY_ID }).length, 1);
});
