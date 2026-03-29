import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import {
  assertProtectedRuntimeSimulationInputAllowed,
  filterAdvertisedRoutesForRuntime,
  resolveProtectedExecutionMode
} from "../../apps/api/src/server.mjs";

test("phase 1.4 protected runtime route guards filter sandbox exposure and block non-live overrides", () => {
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {}
  });

  assert.deepEqual(
    filterAdvertisedRoutesForRuntime({
      platform,
      routes: ["/healthz", "/v1/public/sandbox/catalog", "/v1/public/spec"]
    }),
    ["/healthz", "/v1/public/spec"]
  );

  assert.throws(
    () =>
      resolveProtectedExecutionMode({
        platform,
        requestedMode: "test",
        errorCode: "submission_mode_override_forbidden_in_protected_runtime",
        noun: "Authority submission"
      }),
    (error) => error?.code === "submission_mode_override_forbidden_in_protected_runtime"
  );

  assert.throws(
    () =>
      assertProtectedRuntimeSimulationInputAllowed({
        platform,
        values: ["technical_ack"],
        errorCode: "submission_simulated_transport_forbidden_in_protected_runtime",
        noun: "Authority submission"
      }),
    (error) => error?.code === "submission_simulated_transport_forbidden_in_protected_runtime"
  );
});

test("phase 1.4 non-protected runtime route guards keep sandbox exposure and allow simulation", () => {
  const platform = createApiPlatform({
    runtimeMode: "test",
    env: {}
  });

  assert.deepEqual(
    filterAdvertisedRoutesForRuntime({
      platform,
      routes: ["/healthz", "/v1/public/sandbox/catalog", "/v1/public/spec"]
    }),
    ["/healthz", "/v1/public/sandbox/catalog", "/v1/public/spec"]
  );

  assert.equal(
    resolveProtectedExecutionMode({
      platform,
      requestedMode: "trial",
      noun: "Authority submission"
    }),
    "trial"
  );

  assert.doesNotThrow(() =>
    assertProtectedRuntimeSimulationInputAllowed({
      platform,
      values: ["technical_ack"],
      noun: "Authority submission"
    })
  );
});
