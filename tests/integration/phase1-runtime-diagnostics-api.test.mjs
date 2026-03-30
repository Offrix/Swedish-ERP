import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("phase 1.4 runtime endpoints expose startup diagnostics and bootstrap validation", async () => {
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {},
    criticalDomainStateStoreKind: "memory"
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const rootResponse = await fetch(`${baseUrl}/`);
    assert.equal(rootResponse.status, 200);
    const rootPayload = await rootResponse.json();
    assert.equal(rootPayload.routes.includes("/v1/public/sandbox/catalog"), false);

    const specResponse = await fetch(`${baseUrl}/v1/public/spec`);
    assert.equal(specResponse.status, 200);
    const specPayload = await specResponse.json();
    assert.equal(specPayload.endpoints.some((endpoint) => endpoint.path === "/v1/public/sandbox/catalog"), false);

    const runtimeModeResponse = await fetch(`${baseUrl}/v1/system/runtime-mode`);
    assert.equal(runtimeModeResponse.status, 200);
    const runtimeModePayload = await runtimeModeResponse.json();
    assert.equal(runtimeModePayload.runtimeModeProfile.environmentMode, "production");
    assert.equal(runtimeModePayload.activeStoreKind, "memory");
    assert.equal(runtimeModePayload.criticalDomainStoreKind, "memory");
    assert.equal(runtimeModePayload.startupAllowed, false);

    const invariantsResponse = await fetch(`${baseUrl}/v1/system/invariants`);
    assert.equal(invariantsResponse.status, 200);
    const invariantsPayload = await invariantsResponse.json();
    assert.equal(Array.isArray(invariantsPayload.findings), true);
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "missing_persistent_store"),
      true
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "critical_domain_store_not_persistent"),
      true
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "flat_merge_collision"),
      true
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "map_only_critical_truth"),
      true
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "stub_provider_present"),
      true
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "simulated_receipt_runtime"),
      false
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "forbidden_route_family_present"),
      false
    );
    assert.equal(
      invariantsPayload.findings.some(
        (finding) => finding.findingCode === "phasebucket_route_runtime_present"
      ),
      false
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      true
    );

    const validateResponse = await fetch(`${baseUrl}/v1/system/bootstrap/validate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        bootstrapMode: "scenario_seed",
        bootstrapScenarioCode: "trial_seed",
        activeStoreKind: "memory"
      })
    });
    assert.equal(validateResponse.status, 200);
    const validatePayload = await validateResponse.json();
    assert.equal(
      validatePayload.findings.some((finding) => finding.findingCode === "seed_demo_forbidden"),
      true
    );
  } finally {
    await stopServer(server);
  }
});

test("phase 1.4 bootstrap validation surfaces sqlite critical truth even when runtime store override is postgres", async () => {
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {},
    criticalDomainStateStoreKind: "sqlite"
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const validateResponse = await fetch(`${baseUrl}/v1/system/bootstrap/validate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        activeStoreKind: "postgres",
        criticalDomainStoreKind: "sqlite"
      })
    });
    assert.equal(validateResponse.status, 200);
    const payload = await validateResponse.json();
    assert.equal(payload.activeStoreKind, "postgres");
    assert.equal(payload.criticalDomainStoreKind, "sqlite");
    assert.equal(
      payload.findings.some((finding) => finding.findingCode === "critical_domain_store_not_persistent"),
      true
    );
    assert.equal(
      payload.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      true
    );
  } finally {
    await stopServer(server);
  }
});
