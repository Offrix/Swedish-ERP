const PROTECTED_RUNTIME_MODES = new Set(["pilot_parallel", "production"]);
const PERSISTENT_STORE_KINDS = new Set(["postgres"]);

function freeze(value) {
  return Object.freeze(value);
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function resolveVersionRef({ versionRef = null, env = process.env } = {}) {
  return (
    normalizeText(versionRef) ||
    normalizeText(env?.ERP_BUILD_REF) ||
    normalizeText(env?.GIT_COMMIT) ||
    normalizeText(env?.VERCEL_GIT_COMMIT_SHA) ||
    "workspace"
  );
}

function createRuntimeInvariantFinding({
  findingCode,
  findingState = "detected",
  severityCode = "warning",
  startupSurface = "runtime",
  categoryCode,
  domainKey = null,
  capabilityCode = null,
  activeStoreKind = null,
  summary,
  detail,
  remediation
}) {
  return freeze({
    findingCode,
    findingState,
    severityCode,
    blocking: severityCode === "blocking",
    startupSurface,
    categoryCode,
    domainKey,
    capabilityCode,
    activeStoreKind,
    summary,
    detail,
    remediation
  });
}

function detectFlatMergeCollisions({ domainRegistry = [], domains = {}, mergeOrder = [] } = {}) {
  const collisions = [];
  const seenCapabilities = new Map();
  const registrationsByKey = new Map(domainRegistry.map((registration) => [registration.domainKey, registration]));

  for (const domainKey of mergeOrder) {
    const platform = domains[domainKey];
    if (!platform || typeof platform !== "object") {
      continue;
    }

    const registration = registrationsByKey.get(domainKey);
    const capabilities = Array.isArray(registration?.capabilities)
      ? registration.capabilities
      : Object.keys(platform).sort();

    for (const capabilityCode of capabilities) {
      const previousOwner = seenCapabilities.get(capabilityCode);
      if (previousOwner) {
        collisions.push(
          freeze({
            capabilityCode,
            firstDomainKey: previousOwner.domainKey,
            firstBuildOrder: previousOwner.buildOrder,
            overridingDomainKey: domainKey,
            overridingBuildOrder: registration?.buildOrder || null
          })
        );
        continue;
      }

      seenCapabilities.set(
        capabilityCode,
        freeze({
          domainKey,
          buildOrder: registration?.buildOrder || null
        })
      );
    }
  }

  return freeze(collisions);
}

export function resolveRuntimeStoreKind({
  explicitStoreKind = null,
  env = process.env
} = {}) {
  const normalizedExplicit = normalizeText(explicitStoreKind);
  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  const envStoreKind =
    normalizeText(env?.ERP_RUNTIME_STORE_KIND) ||
    normalizeText(env?.RUNTIME_STORE_KIND) ||
    normalizeText(env?.WORKER_JOB_STORE);

  if (envStoreKind === "postgres") {
    return "postgres";
  }
  if (envStoreKind === "memory") {
    return "memory";
  }
  if (env?.POSTGRES_URL || env?.DATABASE_URL || env?.POSTGRES_HOST) {
    return "postgres";
  }

  return "memory";
}

export function scanRuntimeInvariants({
  startupSurface = "runtime",
  runtimeModeProfile,
  bootstrapModePolicy,
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = false,
  domainRegistry = [],
  domains = {},
  mergeOrder = [],
  activeStoreKind = "memory",
  env = process.env,
  versionRef = null,
  disabledAdapters = []
} = {}) {
  const findings = [];
  const protectedMode = PROTECTED_RUNTIME_MODES.has(runtimeModeProfile?.environmentMode);
  const normalizedBootstrapMode = normalizeText(bootstrapMode) || "none";
  const normalizedBootstrapScenarioCode = normalizeText(bootstrapScenarioCode);
  const normalizedStoreKind = normalizeText(activeStoreKind) || "memory";
  const allowedBootstrapModes = toArray(bootstrapModePolicy?.allowedBootstrapModes);

  if (seedDemo === true || normalizedBootstrapMode === "scenario_seed" || normalizedBootstrapScenarioCode) {
    if (protectedMode) {
      findings.push(
        createRuntimeInvariantFinding({
          findingCode: "seed_demo_forbidden",
          severityCode: "blocking",
          startupSurface,
          categoryCode: "bootstrap_policy",
          summary: `Boot mode ${runtimeModeProfile.environmentMode} cannot use scenario seeding.`,
          detail: `bootstrapMode=${normalizedBootstrapMode}, bootstrapScenarioCode=${normalizedBootstrapScenarioCode || "none"}, seedDemo=${seedDemo === true}.`,
          remediation: "Remove demo/bootstrap scenario input before starting pilot or production."
        })
      );
    }
  }

  if (allowedBootstrapModes.length > 0 && !allowedBootstrapModes.includes(normalizedBootstrapMode)) {
    findings.push(
      createRuntimeInvariantFinding({
        findingCode: "bootstrap_mode_forbidden",
        severityCode: protectedMode ? "blocking" : "warning",
        startupSurface,
        categoryCode: "bootstrap_policy",
        summary: `Bootstrap mode ${normalizedBootstrapMode} is not allowed for ${runtimeModeProfile.environmentMode}.`,
        detail: `Allowed bootstrap modes: ${allowedBootstrapModes.join(", ")}.`,
        remediation: "Align bootstrap mode with the runtime mode policy before boot."
      })
    );
  }

  if (protectedMode && !PERSISTENT_STORE_KINDS.has(normalizedStoreKind)) {
    findings.push(
      createRuntimeInvariantFinding({
        findingCode: "missing_persistent_store",
        severityCode: "blocking",
        startupSurface,
        categoryCode: "persistence",
        activeStoreKind: normalizedStoreKind,
        summary: `${runtimeModeProfile.environmentMode} boot requires a persistent store.`,
        detail: `Detected activeStoreKind=${normalizedStoreKind}. Protected modes must not boot with in-memory runtime state.`,
        remediation: "Configure a persistent store before starting pilot or production."
      })
    );
  }

  for (const collision of detectFlatMergeCollisions({ domainRegistry, domains, mergeOrder })) {
    findings.push(
      createRuntimeInvariantFinding({
        findingCode: "flat_merge_collision",
        severityCode: protectedMode ? "blocking" : "warning",
        startupSurface,
        categoryCode: "flat_merge",
        domainKey: collision.overridingDomainKey,
        capabilityCode: collision.capabilityCode,
        summary: `Capability ${collision.capabilityCode} is shadowed during flat platform merge.`,
        detail: `${collision.firstDomainKey} registers the capability before ${collision.overridingDomainKey}, so the later merge overwrites the earlier method.`,
        remediation: "Rename, hide or route the duplicate capability explicitly before protected boot."
      })
    );
  }

  const blockingFindings = freeze(findings.filter((finding) => finding.blocking));
  const warningFindings = freeze(findings.filter((finding) => !finding.blocking));

  return freeze({
    startupSurface,
    runtimeModeProfile: freeze({ ...runtimeModeProfile }),
    bootstrapModePolicy: freeze({ ...bootstrapModePolicy }),
    bootstrapMode: normalizedBootstrapMode,
    bootstrapScenarioCode: normalizedBootstrapScenarioCode,
    seedDemo: seedDemo === true,
    activeStoreKind: normalizedStoreKind,
    disabledAdapters: freeze(toArray(disabledAdapters)),
    versionRef: resolveVersionRef({ versionRef, env }),
    findings: freeze(findings),
    blockingFindings,
    warningFindings,
    summary: freeze({
      totalCount: findings.length,
      blockingCount: blockingFindings.length,
      warningCount: warningFindings.length
    }),
    startupAllowed: blockingFindings.length === 0
  });
}

export function assertRuntimeStartupAllowed({
  diagnostics,
  starter = "runtime"
} = {}) {
  if (!diagnostics || diagnostics.startupAllowed !== false) {
    return diagnostics;
  }

  const findingSummary = diagnostics.blockingFindings
    .map((finding) => `${finding.findingCode}:${finding.categoryCode}`)
    .join(", ");

  throw new Error(
    `${starter} startup blocked by runtime invariants (${diagnostics.runtimeModeProfile.environmentMode}): ${findingSummary}.`
  );
}
