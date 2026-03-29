import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

const PROTECTED_RUNTIME_MODES = new Set(["pilot_parallel", "production"]);
const PERSISTENT_STORE_KINDS = new Set(["postgres"]);
const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_CACHE = new Map();
const MAP_ONLY_CRITICAL_TARGETS = Object.freeze([
  Object.freeze({ domainKey: "orgAuth", relativePath: "packages/domain-org-auth/src/index.mjs" }),
  Object.freeze({ domainKey: "ledger", relativePath: "packages/domain-ledger/src/index.mjs" }),
  Object.freeze({ domainKey: "vat", relativePath: "packages/domain-vat/src/index.mjs" }),
  Object.freeze({ domainKey: "ar", relativePath: "packages/domain-ar/src/index.mjs" }),
  Object.freeze({ domainKey: "ap", relativePath: "packages/domain-ap/src/index.mjs" }),
  Object.freeze({ domainKey: "payroll", relativePath: "packages/domain-payroll/src/index.mjs" }),
  Object.freeze({ domainKey: "taxAccount", relativePath: "packages/domain-tax-account/src/engine.mjs" }),
  Object.freeze({ domainKey: "reviewCenter", relativePath: "packages/domain-review-center/src/engine.mjs" }),
  Object.freeze({ domainKey: "projects", relativePath: "packages/domain-projects/src/index.mjs" }),
  Object.freeze({ domainKey: "integrations", relativePath: "packages/domain-integrations/src/index.mjs" })
]);
const STUB_PROVIDER_TARGETS = Object.freeze([
  Object.freeze({
    domainKey: "orgAuth",
    relativePath: "packages/domain-org-auth/src/index.mjs",
    pattern: /providerMode:\s*"stub"|getBankIdCompletionTokenForTesting/gu,
    summary: "BankID provider remains stubbed.",
    remediation: "Replace stubbed BankID behavior with real provider integration before protected boot."
  }),
  Object.freeze({
    domainKey: "documents",
    relativePath: "packages/document-engine/src/index.mjs",
    pattern: /textract-stub-|textract_[^"]*_stub/gu,
    summary: "OCR/document classification still relies on stub provider outputs.",
    remediation: "Replace stub OCR providers with real OCR provider adapters before protected boot."
  })
]);
const PHASEBUCKET_ROUTE_TARGETS = Object.freeze([
  Object.freeze({
    domainKey: "apiPhasebucketRoutes",
    relativePath: "apps/api/src/server.mjs",
    pattern: /\.\/phase(?:6|13|14|16)[^"]*routes\.mjs|tryHandlePhase(?:6|13|14|16)/gu,
    summary: "API runtime still depends on phasebucket route handlers.",
    remediation: "Replace phasebucket route handlers with domain-driven route families before protected boot or parity claims."
  })
]);

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

function normalizeStoreKind(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  if (normalized === "memory" || normalized.includes("memory")) {
    return "memory";
  }
  if (normalized === "sqlite" || normalized.includes("sqlite")) {
    return "sqlite";
  }
  if (normalized === "postgres" || normalized.includes("postgres")) {
    return "postgres";
  }
  return normalized;
}

function toArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function readWorkspaceSource(relativePath, workspaceRoot = WORKSPACE_ROOT) {
  const sourcePath = path.join(workspaceRoot, relativePath);
  if (SOURCE_CACHE.has(sourcePath)) {
    return SOURCE_CACHE.get(sourcePath);
  }

  const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : null;
  SOURCE_CACHE.set(sourcePath, source);
  return source;
}

function countMatches(source, pattern) {
  if (typeof source !== "string" || !(pattern instanceof RegExp)) {
    return 0;
  }
  return [...source.matchAll(pattern)].length;
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

function collectMapOnlyTruthFindings({ protectedMode, startupSurface, workspaceRoot, domains = {} }) {
  const findings = [];

  for (const target of MAP_ONLY_CRITICAL_TARGETS) {
    const durability =
      typeof domains?.[target.domainKey]?.getCriticalDomainDurability === "function"
        ? domains[target.domainKey].getCriticalDomainDurability()
        : null;
    if (["durable_snapshot", "repository_envelope"].includes(durability?.truthMode)) {
      continue;
    }

    const source = readWorkspaceSource(target.relativePath, workspaceRoot);
    const mapCount = countMatches(source, /new Map\(/gu);
    if (mapCount === 0) {
      continue;
    }

    findings.push(
      createRuntimeInvariantFinding({
        findingCode: "map_only_critical_truth",
        severityCode: protectedMode ? "blocking" : "warning",
        startupSurface,
        categoryCode: "source_of_truth",
        domainKey: target.domainKey,
        summary: `${target.domainKey} still keeps critical truth in process memory.`,
        detail: `${target.relativePath} contains ${mapCount} in-memory Map registries that still act as runtime truth.`,
        remediation: `Move ${target.domainKey} to durable repositories before protected boot.`
      })
    );
  }

  return findings;
}

function collectPatternFindings({
  protectedMode,
  startupSurface,
  workspaceRoot,
  targets,
  findingCode,
  categoryCode
}) {
  const findings = [];

  for (const target of targets) {
    const source = readWorkspaceSource(target.relativePath, workspaceRoot);
    const matchCount = countMatches(source, target.pattern);
    if (matchCount === 0) {
      continue;
    }

    findings.push(
      createRuntimeInvariantFinding({
        findingCode,
        severityCode: protectedMode ? "blocking" : "warning",
        startupSurface,
        categoryCode,
        domainKey: target.domainKey,
        summary: target.summary,
        detail:
          target.routeFamilyCode
            ? `${target.relativePath} still exposes forbidden route family ${target.routeFamilyCode}.`
            : `${target.relativePath} matched ${matchCount} honesty-scan markers.`,
        remediation: target.remediation
      })
    );
  }

  return findings;
}

function collectIntegrationCapabilityTruthFindings({
  protectedMode,
  startupSurface,
  domains = {},
  runtimeModeProfile
}) {
  const integrations = domains?.integrations;
  if (!integrations || typeof integrations.listAdapterCapabilityManifests !== "function") {
    return [];
  }

  const findings = [];
  const environmentMode = runtimeModeProfile?.environmentMode || "test";
  const manifests = integrations.listAdapterCapabilityManifests();
  for (const manifest of manifests) {
    const truth = manifest?.environmentCapabilityTruth;
    const currentTruth = truth?.[environmentMode];
    if (!truth || !currentTruth) {
      findings.push(
        createRuntimeInvariantFinding({
          findingCode: "provider_capability_truth_incomplete",
          severityCode: protectedMode ? "blocking" : "warning",
          startupSurface,
          categoryCode: "provider_reality",
          domainKey: "integrations",
          capabilityCode: manifest?.providerCode || null,
          summary: `${manifest?.providerCode || "adapter"} lacks explicit environment capability truth.`,
          detail: `Capability manifest ${manifest?.manifestId || "unknown"} is missing environmentCapabilityTruth for ${environmentMode}.`,
          remediation: "Publish explicit capability truth for every adapter and environment before protected boot."
        })
      );
      continue;
    }
    if (
      currentTruth.supportsLegalEffect === true
      && currentTruth.receiptMode !== "provider_receipt_required"
    ) {
      findings.push(
        createRuntimeInvariantFinding({
          findingCode: "provider_capability_truth_invalid",
          severityCode: protectedMode ? "blocking" : "warning",
          startupSurface,
          categoryCode: "provider_reality",
          domainKey: "integrations",
          capabilityCode: manifest.providerCode,
          summary: `${manifest.providerCode} claims legal effect without provider receipt enforcement.`,
          detail: `Environment ${environmentMode} resolves to exposureClass=${currentTruth.exposureClass} and receiptMode=${currentTruth.receiptMode}.`,
          remediation: "Legal-effect adapters must require provider receipts in protected runtime."
        })
      );
    }
  }

  if (typeof integrations.getPublicApiSpec === "function") {
    const spec = integrations.getPublicApiSpec({ environmentMode });
    const endpointPaths = Array.isArray(spec?.endpoints) ? spec.endpoints.map((endpoint) => endpoint.path) : [];
    if (protectedMode && endpointPaths.includes("/v1/public/sandbox/catalog")) {
      findings.push(
        createRuntimeInvariantFinding({
          findingCode: "forbidden_route_family_present",
          severityCode: "blocking",
          startupSurface,
          categoryCode: "route_surface",
          domainKey: "integrations",
          summary: "Protected runtime still exposes sandbox-only public API catalog.",
          detail: "Public API spec for protected runtime still contains /v1/public/sandbox/catalog.",
          remediation: "Hide sandbox-only public routes from protected runtime metadata and route exposure."
        })
      );
    }
  }

  return findings;
}

function collectDemoDataFindings({ protectedMode, startupSurface, domains }) {
  if (!protectedMode) {
    return [];
  }

  const orgAuth = domains?.orgAuth;
  if (!orgAuth || typeof orgAuth.getCompanyProfile !== "function") {
    return [];
  }

  try {
    const companyProfile = orgAuth.getCompanyProfile({ companyId: DEMO_IDS.companyId });
    if (!companyProfile || companyProfile.companyId !== DEMO_IDS.companyId) {
      return [];
    }

    return [
      createRuntimeInvariantFinding({
        findingCode: "demo_data_present_in_protected_mode",
        severityCode: "blocking",
        startupSurface,
        categoryCode: "demo_data",
        domainKey: "orgAuth",
        summary: "Protected runtime still contains demo tenant data.",
        detail: `Demo company ${DEMO_IDS.companyId} is present in runtime state.`,
        remediation: "Remove demo seed data before protected boot."
      })
    ];
  } catch {
    return [];
  }
}

function collectSecretStoreFindings({ protectedMode, startupSurface, domains = {} }) {
  const findings = [];

  for (const [domainKey, domain] of Object.entries(domains)) {
    if (!domain || typeof domain.listSecretStorePostures !== "function") {
      continue;
    }

    for (const posture of toArray(domain.listSecretStorePostures())) {
      if (!posture || posture.bankGradeReady === true) {
        continue;
      }

      const reasonCodes = toArray(posture.reasonCodes).filter((code) => typeof code === "string");
      findings.push(
        createRuntimeInvariantFinding({
          findingCode: "secret_runtime_not_bank_grade",
          severityCode: protectedMode ? "blocking" : "warning",
          startupSurface,
          categoryCode: "security",
          domainKey,
          activeStoreKind: posture.providerKind || null,
          summary: `${domainKey} secret runtime is not bank-grade ready.`,
          detail:
            `Secret store ${posture.storeId || "unknown"} runs with providerKind=${posture.providerKind || "unknown"} `
            + `in ${posture.environmentMode || "unknown"} mode`
            + (reasonCodes.length > 0 ? ` (${reasonCodes.join(", ")}).` : "."),
          remediation: "Configure an external KMS/HSM-backed secret runtime before pilot or production."
        })
      );
    }
  }

  return findings;
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
  const normalizedExplicit = normalizeStoreKind(explicitStoreKind);
  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  const envStoreKind =
    normalizeStoreKind(env?.ERP_RUNTIME_STORE_KIND) ||
    normalizeStoreKind(env?.RUNTIME_STORE_KIND) ||
    normalizeStoreKind(env?.WORKER_JOB_STORE);

  if (envStoreKind === "postgres") {
    return "postgres";
  }
  if (envStoreKind === "sqlite") {
    return "sqlite";
  }
  if (envStoreKind === "memory") {
    return "memory";
  }
  if (env?.POSTGRES_URL || env?.DATABASE_URL || env?.POSTGRES_HOST) {
    return "postgres";
  }

  return "memory";
}

export function resolveCriticalDomainStoreKind({
  explicitStoreKind = null,
  env = process.env
} = {}) {
  const normalizedExplicit = normalizeStoreKind(explicitStoreKind);
  if (normalizedExplicit) {
    return normalizedExplicit;
  }
  const envStoreKind = normalizeStoreKind(env?.ERP_CRITICAL_DOMAIN_STATE_STORE);
  if (envStoreKind) {
    return envStoreKind;
  }
  if (env?.ERP_CRITICAL_DOMAIN_STATE_URL || env?.CRITICAL_DOMAIN_STATE_URL) {
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
  criticalDomainStoreKind = null,
  env = process.env,
  versionRef = null,
  disabledAdapters = [],
  workspaceRoot = WORKSPACE_ROOT
} = {}) {
  const findings = [];
  const protectedMode = PROTECTED_RUNTIME_MODES.has(runtimeModeProfile?.environmentMode);
  const normalizedBootstrapMode = normalizeText(bootstrapMode) || "none";
  const normalizedBootstrapScenarioCode = normalizeText(bootstrapScenarioCode);
  const normalizedStoreKind = normalizeStoreKind(activeStoreKind) || "memory";
  const normalizedCriticalDomainStoreKind = resolveCriticalDomainStoreKind({
    explicitStoreKind: criticalDomainStoreKind,
    env
  });
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

  if (protectedMode && !PERSISTENT_STORE_KINDS.has(normalizedCriticalDomainStoreKind)) {
    findings.push(
      createRuntimeInvariantFinding({
        findingCode: "critical_domain_store_not_persistent",
        severityCode: "blocking",
        startupSurface,
        categoryCode: "persistence",
        activeStoreKind: normalizedCriticalDomainStoreKind,
        summary: `${runtimeModeProfile.environmentMode} boot requires Postgres-backed critical domain truth.`,
        detail:
          `Detected criticalDomainStoreKind=${normalizedCriticalDomainStoreKind}. `
          + "Protected modes must not boot with memory or sqlite critical domain state.",
        remediation: "Move critical domain truth onto the Postgres-backed runtime path before pilot or production."
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

  findings.push(
    ...collectMapOnlyTruthFindings({
      protectedMode,
      startupSurface,
      workspaceRoot,
      domains
    })
  );
  findings.push(
    ...collectPatternFindings({
      protectedMode,
      startupSurface,
      workspaceRoot,
      targets: STUB_PROVIDER_TARGETS,
      findingCode: "stub_provider_present",
      categoryCode: "provider_reality"
    })
  );
  findings.push(
    ...collectIntegrationCapabilityTruthFindings({
      protectedMode,
      startupSurface,
      domains,
      runtimeModeProfile
    })
  );
  findings.push(
    ...collectPatternFindings({
      protectedMode,
      startupSurface,
      workspaceRoot,
      targets: PHASEBUCKET_ROUTE_TARGETS,
      findingCode: "phasebucket_route_runtime_present",
      categoryCode: "route_surface"
    })
  );
  findings.push(
    ...collectDemoDataFindings({
      protectedMode,
      startupSurface,
      domains
    })
  );
  findings.push(
    ...collectSecretStoreFindings({
      protectedMode,
      startupSurface,
      domains
    })
  );

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
    criticalDomainStoreKind: normalizedCriticalDomainStoreKind,
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
