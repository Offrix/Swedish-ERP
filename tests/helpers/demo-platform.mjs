import { createApiPlatform as createRuntimeApiPlatform } from "../../apps/api/src/platform.mjs";

export const TEST_DEFAULT_DEMO_SCENARIO_CODE = "test_default_demo";

export function createExplicitDemoApiPlatform(options = {}) {
  const normalizedOptions = {
    runtimeMode: "test",
    env: {},
    criticalDomainStateStoreKind: "memory",
    ...options
  };

  if (!normalizedOptions.bootstrapScenarioCode && normalizedOptions.seedDemo !== false) {
    normalizedOptions.bootstrapScenarioCode = TEST_DEFAULT_DEMO_SCENARIO_CODE;
  }

  return createRuntimeApiPlatform(normalizedOptions);
}
