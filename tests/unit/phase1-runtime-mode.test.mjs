import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultApiPlatform, createApiPlatform } from "../../apps/api/src/platform.mjs";
import { startWorker } from "../../apps/worker/src/worker.mjs";
import {
  createBootstrapModePolicy,
  resolveRuntimeModeProfile
} from "../../scripts/lib/runtime-mode.mjs";

test("phase 1.2 resolves explicit runtime modes into deterministic profiles", () => {
  const profile = resolveRuntimeModeProfile({
    runtimeMode: "pilot_parallel",
    env: {},
    starter: "unit-test",
    requireExplicit: true
  });

  assert.equal(profile.environmentMode, "pilot_parallel");
  assert.equal(profile.supportsLegalEffect, false);
  assert.equal(profile.modeWatermarkCode, "PILOT");

  const bootstrapPolicy = createBootstrapModePolicy(profile);
  assert.equal(bootstrapPolicy.defaultBootstrapMode, "none");
  assert.deepEqual(bootstrapPolicy.allowedBootstrapModes, ["none"]);
  assert.equal(bootstrapPolicy.autoseedForbidden, true);
});

test("phase 1.2 starter defaults fail fast when runtime mode is missing in explicit mode", () => {
  assert.throws(
    () =>
      createDefaultApiPlatform({
        env: {},
        enforceExplicitRuntimeMode: true
      }),
    /must declare runtime mode explicitly/u
  );
});

test("phase 1.2 api platform carries runtime mode metadata", () => {
  const platform = createApiPlatform({
    runtimeMode: "trial",
    env: {}
  });

  assert.equal(platform.environmentMode, "trial");
  assert.equal(platform.supportsLegalEffect, false);
  assert.equal(platform.getRuntimeModeProfile().modeWatermarkCode, "TRIAL");
  assert.equal(platform.bootstrapModePolicy.defaultBootstrapMode, "none");
  assert.equal(platform.runtimeContracts.runtime.environmentMode, "trial");
});

test("phase 1.2 worker resolves runtime mode before entering the polling loop", async () => {
  const logs = [];
  const runtime = startWorker({
    intervalMs: 250,
    env: {
      WORKER_JOB_STORE: "memory",
      ERP_RUNTIME_MODE: "sandbox_internal"
    },
    logger: (message) => {
      logs.push(message);
    }
  });

  try {
    assert.equal(runtime.platform.environmentMode, "sandbox_internal");
    assert.equal(runtime.platform.supportsLegalEffect, false);
    assert.equal(logs.some((message) => /sandbox_internal/u.test(message)), true);
  } finally {
    await runtime.stop();
  }
});
