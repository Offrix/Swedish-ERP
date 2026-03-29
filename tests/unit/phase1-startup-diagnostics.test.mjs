import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { startApiServer } from "../../apps/api/src/server.mjs";
import { startWorker } from "../../apps/worker/src/worker.mjs";

test("phase 1.4 runtime diagnostics surface flat merge collisions as warnings in test mode", () => {
  const platform = createApiPlatform({
    runtimeMode: "test",
    env: {}
  });

  const findings = platform.listRuntimeInvariantFindings();
  const collisions = platform.listFlatMergeCollisions();
  const flatMergeFinding = findings.find((finding) => finding.findingCode === "flat_merge_collision");
  const mapTruthFinding = findings.find((finding) => finding.findingCode === "map_only_critical_truth");
  const stubProviderFinding = findings.find((finding) => finding.findingCode === "stub_provider_present");
  const simulatedRuntimeFinding = findings.find((finding) => finding.findingCode === "simulated_receipt_runtime");
  const forbiddenRouteFinding = findings.find((finding) => finding.findingCode === "forbidden_route_family_present");
  const phasebucketRouteFinding = findings.find(
    (finding) => finding.findingCode === "phasebucket_route_runtime_present"
  );

  assert.ok(flatMergeFinding);
  assert.ok(collisions.length > 0);
  assert.equal(collisions.some((finding) => finding.findingCode === "flat_merge_collision"), true);
  assert.ok(mapTruthFinding);
  assert.ok(stubProviderFinding);
  assert.equal(simulatedRuntimeFinding, undefined);
  assert.equal(forbiddenRouteFinding, undefined);
  assert.ok(phasebucketRouteFinding);
  assert.equal(flatMergeFinding.severityCode, "warning");
  assert.equal(platform.getRuntimeStartupDiagnostics().startupAllowed, true);
});

test("phase 1.4 api starter rejects protected boot when runtime invariants are blocking", async () => {
  await assert.rejects(
    () =>
      startApiServer({
        port: 0,
        env: {
          ERP_RUNTIME_MODE: "production"
        },
        logger: () => {},
        enforceExplicitRuntimeMode: true
      }),
    /startup blocked by runtime invariants/u
  );
});

test("phase 1.4 worker rejects protected boot when runtime store is not persistent", () => {
  assert.throws(
    () =>
      startWorker({
        intervalMs: 250,
        env: {
          ERP_RUNTIME_MODE: "pilot_parallel",
          WORKER_JOB_STORE: "memory"
        },
        logger: () => {},
        enforceExplicitRuntimeMode: true
      }),
    /startup blocked by runtime invariants/u
  );
});

test("phase 1.4 protected runtime does not auto-provision sqlite-backed critical truth", () => {
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {}
  });

  try {
    const durability = platform.listCriticalDomainDurability();
    assert.equal(durability.every((entry) => entry.truthMode === "in_memory_repository_envelope"), true);
    assert.equal(platform.getRuntimeStartupDiagnostics().startupAllowed, false);
  } finally {
    platform.closeCriticalDomainStateStore?.();
  }
});
