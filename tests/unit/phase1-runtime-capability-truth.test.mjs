import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import {
  HUBSPOT_CRM_PROVIDER_CODE,
  STRIPE_PAYMENT_LINKS_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

test("phase 1.4 capability manifests expose explicit environment truth", () => {
  const platform = createApiPlatform({
    runtimeMode: "test",
    env: {}
  });

  const paymentManifest = platform.listAdapterCapabilityManifests({ surfaceCode: "payment_link" })
    .find((manifest) => manifest.providerCode === STRIPE_PAYMENT_LINKS_PROVIDER_CODE);
  assert.ok(paymentManifest);
  assert.equal(paymentManifest.supportsLegalEffectInProduction, true);
  assert.equal(paymentManifest.environmentCapabilityTruth.trial.receiptMode, "trial_simulated");
  assert.equal(paymentManifest.environmentCapabilityTruth.production.receiptMode, "provider_receipt_required");
  assert.equal(paymentManifest.environmentCapabilityTruth.production.liveCoverageEligible, true);
  assert.equal(paymentManifest.environmentCapabilityTruth.production.exposureClass, "legal_effect");

  const crmManifest = platform.listAdapterCapabilityManifests({ surfaceCode: "crm_handoff" })
    .find((manifest) => manifest.providerCode === HUBSPOT_CRM_PROVIDER_CODE);
  assert.ok(crmManifest);
  assert.equal(crmManifest.supportsLegalEffectInProduction, false);
  assert.equal(crmManifest.environmentCapabilityTruth.production.receiptMode, "internal_audit_only");
  assert.equal(crmManifest.environmentCapabilityTruth.production.liveCoverageEligible, false);
  assert.equal(crmManifest.environmentCapabilityTruth.production.exposureClass, "non_legal_effect");
});

test("phase 1.4 protected public api spec hides sandbox-only catalog", () => {
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {}
  });

  const spec = platform.getPublicApiSpec();
  assert.equal(spec.endpoints.some((endpoint) => endpoint.path === "/v1/public/sandbox/catalog"), false);
  const apiSpecScope = spec.auth.scopeCatalog.find((scope) => scope.scopeCode === "api_spec.read");
  assert.ok(apiSpecScope);
  assert.equal(apiSpecScope.exampleEndpoints.includes("/v1/public/sandbox/catalog"), false);

  assert.throws(
    () => platform.getPublicApiSandboxCatalog({ companyId: "company-phase1-protected" }),
    (error) => error?.code === "public_api_sandbox_catalog_not_available"
  );
});
