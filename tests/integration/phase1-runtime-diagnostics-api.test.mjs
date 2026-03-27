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
    const runtimeModeResponse = await fetch(`${baseUrl}/v1/system/runtime-mode`);
    assert.equal(runtimeModeResponse.status, 200);
    const runtimeModePayload = await runtimeModeResponse.json();
    assert.equal(runtimeModePayload.runtimeModeProfile.environmentMode, "production");
    assert.equal(runtimeModePayload.activeStoreKind, "memory");
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
      true
    );
    assert.equal(
      invariantsPayload.findings.some((finding) => finding.findingCode === "forbidden_route_family_present"),
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
