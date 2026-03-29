import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 16.2 public API spec publishes scope catalog, supported versions and compatibility metadata", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T09:00:00Z")
  });

  const spec = platform.getPublicApiSpec();
  assert.equal(spec.version, "2026-03-25");
  assert.equal(spec.currentVersion, "2026-03-25");
  assert.equal(spec.canonicalApiVersion, "2026-03-27");
  assert.equal(Array.isArray(spec.supportedVersions), true);
  assert.equal(spec.supportedVersions.some((entry) => entry.version === "2026-03-25" && entry.status === "stable"), true);
  assert.equal(spec.auth.supportedGrantTypes.includes("client_credentials"), true);
  assert.equal(spec.auth.tokenEndpoint, "/v1/public/oauth/token");
  assert.equal(spec.auth.scopeCatalog.some((scope) => scope.scopeCode === "tax_account.read"), true);
  assert.equal(spec.endpoints.some((endpoint) => endpoint.path === "/v1/public/tax-account/summary"), true);
  assert.equal(spec.webhookEventCatalog.some((event) => event.eventType === "submission.updated"), true);
  assert.equal(spec.compatibility.baselineRecordingSupported, true);
  assert.equal(spec.compatibility.routeHashAlgorithm, "sha256_stable_json");

  assert.throws(
    () => platform.getPublicApiSpec({ version: "2026-03-22" }),
    (error) => error?.code === "public_api_spec_version_unsupported"
  );
});

test("Phase 16.2 compatibility baselines persist validated spec hash and endpoint count", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T09:05:00Z")
  });

  const spec = platform.getPublicApiSpec();
  const baseline = platform.recordPublicApiCompatibilityBaseline({
    companyId: DEMO_IDS.companyId,
    version: spec.version,
    routeHash: "phase16-2-route-hash",
    specHash: "phase16-2-spec-hash",
    endpointCount: spec.endpoints.length,
    actorId: "phase16-2-unit"
  });

  assert.equal(baseline.version, "2026-03-25");
  assert.equal(baseline.specHash, "phase16-2-spec-hash");
  assert.equal(baseline.endpointCount, spec.endpoints.length);
});

test("Phase 16.2 sandbox catalog is trial-safe, watermarked and contract-complete", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T09:10:00Z")
  });

  const catalog = platform.getPublicApiSandboxCatalog({ companyId: DEMO_IDS.companyId });
  assert.equal(catalog.mode, "sandbox");
  assert.equal(catalog.watermarkCode, "SANDBOX_PUBLIC_API");
  assert.equal(catalog.supportsLegalEffect, false);
  assert.equal(Array.isArray(catalog.scopeCatalog), true);
  assert.equal(catalog.scopeCatalog.some((scope) => scope.scopeCode === "reporting.read"), true);
  assert.equal(catalog.clientCredentials.tokenEndpoint, "/v1/public/oauth/token");
  assert.equal(catalog.clientCredentials.supportedGrantTypes.includes("client_credentials"), true);
  assert.equal(catalog.clientCredentials.supportedModes.includes("sandbox"), true);
  assert.equal(catalog.reportSnapshotExamples[0].payload.watermarkCode, "SANDBOX_PUBLIC_API");
  assert.equal(catalog.taxAccountSummaryExample.watermarkCode, "SANDBOX_PUBLIC_API");
  assert.equal(catalog.exampleWebhookEvents.some((event) => event.eventType === "annual_reporting.package.updated"), true);
  assert.equal(catalog.apiSpec.supportedVersions.some((entry) => entry.version === "2026-03-25"), true);
});
