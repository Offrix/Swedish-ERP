import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createDefaultApiPlatform, createApiPlatform } from "../../apps/api/src/platform.mjs";
import { startDesktopWebServer } from "../../apps/desktop-web/src/server.mjs";
import { startFieldMobileServer } from "../../apps/field-mobile/src/server.mjs";
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

test("phase 1.2 api starter requires explicit runtime mode by default", async () => {
  await assert.rejects(
    () =>
      import("../../apps/api/src/server.mjs").then(({ startApiServer }) =>
        startApiServer({
          port: 0,
          env: {},
          logger: () => {}
        })
      ),
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

test("phase 1.2 desktop-web starter requires explicit runtime mode when enforcement is on", async () => {
  await assert.rejects(
    () =>
      startDesktopWebServer({
        port: 0,
        env: {},
        logger: () => {},
        enforceExplicitRuntimeMode: true
      }),
    /must declare runtime mode explicitly/u
  );
});

test("phase 1.2 field-mobile starter requires explicit runtime mode when enforcement is on", async () => {
  await assert.rejects(
    () =>
      startFieldMobileServer({
        port: 0,
        env: {},
        logger: () => {},
        enforceExplicitRuntimeMode: true
      }),
    /must declare runtime mode explicitly/u
  );
});

test("phase 1.2 desktop-web and field-mobile carry declared runtime mode metadata", async () => {
  const desktopRuntime = await startDesktopWebServer({
    port: 0,
    env: {
      ERP_RUNTIME_MODE: "trial"
    },
    logger: () => {},
    enforceExplicitRuntimeMode: true
  });
  const fieldRuntime = await startFieldMobileServer({
    port: 0,
    env: {
      ERP_RUNTIME_MODE: "sandbox_internal"
    },
    logger: () => {},
    enforceExplicitRuntimeMode: true
  });

  try {
    assert.equal(desktopRuntime.runtimeModeProfile.environmentMode, "trial");
    assert.equal(fieldRuntime.runtimeModeProfile.environmentMode, "sandbox_internal");
  } finally {
    await desktopRuntime.stop();
    await fieldRuntime.stop();
  }
});

test("Phase 2.5 api starter verifies canonical repository schema contract before listen", async () => {
  const originalListen = http.Server.prototype.listen;
  let listenCalls = 0;
  http.Server.prototype.listen = function patchedListen(...args) {
    listenCalls += 1;
    return originalListen.apply(this, args);
  };

  try {
    let verificationCalls = 0;
    const runtime = await import("../../apps/api/src/server.mjs").then(({ startApiServer }) =>
      startApiServer({
        port: 0,
        logger: () => {},
        platform: {
          environmentMode: "test",
          getRuntimeModeProfile: () => ({ environmentMode: "test" }),
          scanRuntimeInvariants: () => ({
            startupAllowed: true,
            activeStoreKind: "postgres",
            summary: {
              totalCount: 0,
              blockingCount: 0,
              warningCount: 0
            }
          }),
          async verifyRuntimeCanonicalRepositorySchemaContract() {
            verificationCalls += 1;
            assert.equal(listenCalls, 0);
            return {
              ok: true
            };
          }
        }
      })
    );

    try {
      assert.equal(verificationCalls, 1);
      assert.equal(listenCalls, 1);
    } finally {
      await runtime.stop();
    }
  } finally {
    http.Server.prototype.listen = originalListen;
  }
});

test("Phase 2.5 api starter fails closed before listen when canonical repository schema verification fails", async () => {
  const originalListen = http.Server.prototype.listen;
  let listenCalls = 0;
  http.Server.prototype.listen = function patchedListen(...args) {
    listenCalls += 1;
    return originalListen.apply(this, args);
  };

  try {
    await assert.rejects(
      () =>
        import("../../apps/api/src/server.mjs").then(({ startApiServer }) =>
          startApiServer({
            port: 0,
            logger: () => {},
            platform: {
              environmentMode: "production",
              getRuntimeModeProfile: () => ({ environmentMode: "production" }),
              scanRuntimeInvariants: () => ({
                startupAllowed: true,
                activeStoreKind: "postgres",
                summary: {
                  totalCount: 0,
                  blockingCount: 0,
                  warningCount: 0
                }
              }),
              async verifyRuntimeCanonicalRepositorySchemaContract() {
                throw new Error("canonical repository schema contract is incomplete");
              }
            }
          })
        ),
      /canonical repository schema contract is incomplete/u
    );
    assert.equal(listenCalls, 0);
  } finally {
    http.Server.prototype.listen = originalListen;
  }
});
