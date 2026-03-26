export const RUNTIME_MODE_CODES = Object.freeze([
  "trial",
  "sandbox_internal",
  "test",
  "pilot_parallel",
  "production"
]);

const RUNTIME_MODE_DEFINITIONS = Object.freeze({
  trial: Object.freeze({
    supportsLegalEffect: false,
    modeWatermarkCode: "TRIAL",
    sequenceSpace: "trial",
    providerEnvironmentRef: "trial_safe",
    dataRetentionClass: "trial_short_lived",
    bootstrapPolicyCode: "trial_scenario_only"
  }),
  sandbox_internal: Object.freeze({
    supportsLegalEffect: false,
    modeWatermarkCode: "SANDBOX",
    sequenceSpace: "sandbox_internal",
    providerEnvironmentRef: "sandbox",
    dataRetentionClass: "sandbox_internal",
    bootstrapPolicyCode: "sandbox_seed_allowed"
  }),
  test: Object.freeze({
    supportsLegalEffect: false,
    modeWatermarkCode: "TEST",
    sequenceSpace: "test",
    providerEnvironmentRef: "test",
    dataRetentionClass: "test_short_lived",
    bootstrapPolicyCode: "test_seed_allowed"
  }),
  pilot_parallel: Object.freeze({
    supportsLegalEffect: false,
    modeWatermarkCode: "PILOT",
    sequenceSpace: "pilot_parallel",
    providerEnvironmentRef: "pilot_parallel",
    dataRetentionClass: "pilot_parallel_evidence",
    bootstrapPolicyCode: "no_implicit_seed"
  }),
  production: Object.freeze({
    supportsLegalEffect: true,
    modeWatermarkCode: "LIVE",
    sequenceSpace: "production",
    providerEnvironmentRef: "production",
    dataRetentionClass: "production_regulated",
    bootstrapPolicyCode: "no_implicit_seed"
  })
});

function normalizeRuntimeModeCandidate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildRuntimeModeProfile(mode) {
  const definition = RUNTIME_MODE_DEFINITIONS[mode];
  if (!definition) {
    throw new Error(
      `Unknown runtime mode "${mode}". Expected one of: ${RUNTIME_MODE_CODES.join(", ")}.`
    );
  }

  return Object.freeze({
    environmentMode: mode,
    ...definition
  });
}

export function createBootstrapModePolicy(runtimeModeProfile) {
  const mode = runtimeModeProfile.environmentMode;
  const scenarioSeedAllowed = mode === "trial" || mode === "sandbox_internal" || mode === "test";

  return Object.freeze({
    policyCode: runtimeModeProfile.bootstrapPolicyCode,
    defaultBootstrapMode: "none",
    allowedBootstrapModes: Object.freeze(scenarioSeedAllowed ? ["none", "scenario_seed"] : ["none"]),
    scenarioSeedAllowed,
    autoseedForbidden: true
  });
}

export function resolveBootstrapSeeding({
  bootstrapMode = null,
  bootstrapScenarioCode = null,
  seedDemo
} = {}) {
  if (seedDemo === true) {
    return Object.freeze({
      bootstrapMode: "scenario_seed",
      bootstrapScenarioCode: bootstrapScenarioCode || "legacy_seed_demo",
      shouldSeedDemo: true
    });
  }

  if (seedDemo === false) {
    return Object.freeze({
      bootstrapMode: "none",
      bootstrapScenarioCode: null,
      shouldSeedDemo: false
    });
  }

  const resolvedBootstrapMode = bootstrapMode === "scenario_seed" || bootstrapScenarioCode ? "scenario_seed" : "none";

  return Object.freeze({
    bootstrapMode: resolvedBootstrapMode,
    bootstrapScenarioCode: resolvedBootstrapMode === "scenario_seed" ? bootstrapScenarioCode || "scenario_seed" : null,
    shouldSeedDemo: resolvedBootstrapMode === "scenario_seed"
  });
}

export function resolveRuntimeModeProfile({
  runtimeMode = null,
  env = process.env,
  starter = "runtime",
  requireExplicit = false,
  fallbackMode = "test"
} = {}) {
  const explicitMode = normalizeRuntimeModeCandidate(runtimeMode);
  const envMode =
    normalizeRuntimeModeCandidate(env?.ERP_RUNTIME_MODE) ||
    normalizeRuntimeModeCandidate(env?.RUNTIME_MODE) ||
    normalizeRuntimeModeCandidate(env?.APP_RUNTIME_MODE);

  const resolvedMode = explicitMode || envMode || (!requireExplicit ? fallbackMode : null);

  if (!resolvedMode) {
    throw new Error(
      `${starter} must declare runtime mode explicitly. Pass runtimeMode or set ERP_RUNTIME_MODE to one of: ${RUNTIME_MODE_CODES.join(", ")}.`
    );
  }

  return buildRuntimeModeProfile(resolvedMode);
}
