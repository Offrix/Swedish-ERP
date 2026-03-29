import crypto from "node:crypto";
import { cloneValue as clone } from "../../domain-core/src/clone.mjs";
import {
  buildEnvironmentCapabilityTruth,
  buildReceiptModePolicy,
  resolveReceiptModeForEnvironment
} from "./providers/provider-runtime-helpers.mjs";

export const INTEGRATION_SURFACE_CODES = Object.freeze([
  "partner",
  "crm_handoff",
  "document_ai",
  "payment_link",
  "notification_email",
  "notification_sms",
  "spend",
  "regulated_transport",
  "auth_identity",
  "enterprise_federation",
  "auth_local_factor",
  "evidence_archive"
]);
export const INTEGRATION_ENVIRONMENT_MODES = Object.freeze(["trial", "sandbox", "test", "pilot_parallel", "production"]);
export const CREDENTIAL_KINDS = Object.freeze(["api_credentials", "client_secret", "certificate_ref", "file_channel_credentials"]);

export function createIntegrationControlPlane({
  state,
  clock = () => new Date(),
  environmentMode: defaultRuntimeEnvironmentMode = "test",
  getPartnerModule = null,
  getAdapterProviders = null
} = {}) {
  state.integrationConnections ||= new Map();
  state.credentialSetMetadata ||= new Map();
  state.consentGrants ||= new Map();
  state.integrationHealthChecks ||= new Map();
  state.credentialMetadataIdsByConnection ||= new Map();
  state.consentGrantIdsByConnection ||= new Map();
  state.integrationHealthCheckIdsByConnection ||= new Map();

  return {
    integrationSurfaceCodes: INTEGRATION_SURFACE_CODES,
    integrationEnvironmentModes: INTEGRATION_ENVIRONMENT_MODES,
    credentialKinds: CREDENTIAL_KINDS,
    createIntegrationConnection,
    registerPartnerConnection,
    listIntegrationConnections,
    getIntegrationConnection,
    listAdapterCapabilityManifests,
    recordCredentialSetMetadata,
    listCredentialSetMetadata,
    authorizeConsent,
    listConsentGrants,
    runIntegrationHealthCheck,
    listIntegrationHealthChecks
  };

  function createIntegrationConnection(input = {}) {
    const surfaceCode = allowed(input.surfaceCode || "partner", INTEGRATION_SURFACE_CODES, "integration_surface_code_invalid");
    const resolvedEnvironmentMode = allowed(
      input.environmentMode || defaultEnvironmentMode(defaultRuntimeEnvironmentMode),
      INTEGRATION_ENVIRONMENT_MODES,
      "integration_environment_mode_invalid"
    );
    const manifest = requireIntegrationManifest({
      partnerModule: surfaceCode === "partner" ? requirePartnerModule(getPartnerModule) : null,
      surfaceCode,
      connectionType: input.connectionType,
      providerCode: input.providerCode,
      getAdapterProviders
    });
    if (!manifest.allowedEnvironmentModes.includes(resolvedEnvironmentMode)) {
      throw error(409, "integration_environment_mode_not_supported", `${input.providerCode} does not support ${resolvedEnvironmentMode}.`);
    }
    assertCredentialIsolation({
      state,
      companyId: input.companyId,
      providerCode: input.providerCode,
      environmentMode: resolvedEnvironmentMode,
      credentialRef: input.credentialsRef,
      secretManagerRef: input.secretManagerRef
    });
    const registered =
      surfaceCode === "partner"
        ? registerPartnerSurfaceConnection({ input, manifest, resolvedEnvironmentMode })
        : createDirectIntegrationConnection({ input, manifest, resolvedEnvironmentMode });
    if (typeof input.credentialsRef === "string" && input.credentialsRef.trim().length > 0) {
      recordCredentialSetMetadata({
        companyId: input.companyId,
        connectionId: registered.connectionId,
        credentialRef: input.credentialsRef,
        credentialKind: input.credentialKind || inferCredentialKind(manifest),
        secretManagerRef: input.secretManagerRef || input.credentialsRef,
        callbackDomain: input.callbackDomain,
        callbackPath: input.callbackPath,
        expiresAt: input.credentialsExpiresAt,
        actorId: input.actorId || "system"
      });
    }
    if (input.consentGrant) {
      authorizeConsent({
        companyId: input.companyId,
        connectionId: registered.connectionId,
        scopeSet: input.consentGrant.scopeSet,
        grantType: input.consentGrant.grantType,
        externalConsentRef: input.consentGrant.externalConsentRef,
        expiresAt: input.consentGrant.expiresAt,
        actorId: input.actorId || "system"
      });
    }
    return getIntegrationConnection({ companyId: input.companyId, connectionId: registered.connectionId });
  }

  function registerPartnerSurfaceConnection({ input, manifest, resolvedEnvironmentMode }) {
    const partnerModule = requirePartnerModule(getPartnerModule);
    const partnerConnection = partnerModule.createPartnerConnection({
      companyId: input.companyId,
      connectionType: input.connectionType,
      providerCode: input.providerCode,
      displayName: input.displayName,
      mode: toPartnerMode(resolvedEnvironmentMode),
      rateLimitPerMinute: input.rateLimitPerMinute,
      fallbackMode: input.fallbackMode,
      credentialsRef: text(input.credentialsRef, "integration_credentials_ref_required"),
      config: {
        ...(input.config || {}),
        credentialsExpiresAt: input.credentialsExpiresAt,
        callbackDomain: input.callbackDomain,
        callbackPath: input.callbackPath
      },
      actorId: input.actorId || "system"
    });
    return registerPartnerConnection({
      companyId: input.companyId,
      connectionId: partnerConnection.connectionId,
      environmentMode: resolvedEnvironmentMode,
      actorId: input.actorId || "system"
    });
  }

  function createDirectIntegrationConnection({ input, manifest, resolvedEnvironmentMode }) {
    const createdAt = nowIso(clock);
    const record = {
      connectionId: crypto.randomUUID(),
      companyId: text(input.companyId, "company_id_required"),
      surfaceCode: manifest.surfaceCode,
      connectionType: manifest.connectionType,
      providerCode: manifest.providerCode,
      displayName: text(input.displayName, "integration_display_name_required"),
      environmentMode: resolvedEnvironmentMode,
      providerEnvironmentRef: providerEnvironmentRefForMode(resolvedEnvironmentMode),
      supportsLegalEffect: supportsLegalEffectForManifest(manifest, resolvedEnvironmentMode),
      receiptMode: resolveReceiptModeForEnvironment(resolveManifestReceiptModePolicy(manifest), resolvedEnvironmentMode),
      sandboxSupported: manifest.sandboxSupported === true,
      trialSafe: manifest.trialSafe === true,
      liveCoverageEligible: supportsLegalEffectForManifest(manifest, resolvedEnvironmentMode),
      runtimeExposureClass:
        manifest.environmentCapabilityTruth?.[resolvedEnvironmentMode]?.exposureClass
        || (supportsLegalEffectForManifest(manifest, resolvedEnvironmentMode) ? "legal_effect" : "non_legal_effect"),
      environmentCapabilityTruth: clone(manifest.environmentCapabilityTruth || null),
      modeMatrix: clone(manifest.modeMatrix),
      fallbackMode: optional(input.fallbackMode) || "queue_retry",
      rateLimitPerMinute: Number(input.rateLimitPerMinute || 60),
      requiredCredentialKinds: [...manifest.requiredCredentialKinds],
      requiredCallbackRegistration: manifest.requiresCallbackRegistration === true,
      supportsAsyncCallback: manifest.supportsAsyncCallback === true,
      consentRequired: manifest.requiredCredentialKinds.includes("consent_grant"),
      providerBaselineRef: clone(input.providerBaselineRef || null),
      capabilityManifestId: manifest.manifestId,
      createdByActorId: text(input.actorId || "system", "actor_id_required"),
      createdAt,
      updatedAt: createdAt
    };
    state.integrationConnections.set(record.connectionId, record);
    return materializeConnection(state, clock, record);
  }

  function registerPartnerConnection({ companyId, connectionId, environmentMode = null, actorId = "system" } = {}) {
    const partnerConnection = requirePartnerConnection(state, companyId, connectionId);
    const manifest = requirePartnerManifest(requirePartnerModule(getPartnerModule), partnerConnection.connectionType, partnerConnection.providerCode);
    const resolvedEnvironmentMode = environmentMode || fromPartnerMode(partnerConnection.mode);
    const existing = state.integrationConnections.get(connectionId) || {};
    const record = {
      connectionId: partnerConnection.connectionId,
      companyId: partnerConnection.companyId,
      surfaceCode: "partner",
      connectionType: partnerConnection.connectionType,
      providerCode: partnerConnection.providerCode,
      displayName: partnerConnection.displayName,
      environmentMode: resolvedEnvironmentMode,
      providerEnvironmentRef: providerEnvironmentRefForMode(resolvedEnvironmentMode),
      supportsLegalEffect: supportsLegalEffectForManifest(manifest, resolvedEnvironmentMode),
      receiptMode: resolveReceiptModeForEnvironment(resolveManifestReceiptModePolicy(manifest), resolvedEnvironmentMode),
      sandboxSupported: manifest.sandboxSupported,
      trialSafe: manifest.trialSafe,
      liveCoverageEligible: supportsLegalEffectForManifest(manifest, resolvedEnvironmentMode),
      runtimeExposureClass:
        manifest.environmentCapabilityTruth?.[resolvedEnvironmentMode]?.exposureClass
        || (supportsLegalEffectForManifest(manifest, resolvedEnvironmentMode) ? "legal_effect" : "non_legal_effect"),
      environmentCapabilityTruth: clone(manifest.environmentCapabilityTruth || null),
      modeMatrix: clone(manifest.modeMatrix),
      fallbackMode: partnerConnection.fallbackMode,
      rateLimitPerMinute: partnerConnection.rateLimitPerMinute,
      requiredCredentialKinds: [...manifest.requiredCredentialKinds],
      consentRequired: manifest.requiredCredentialKinds.includes("consent_grant"),
      providerBaselineRef: clone(partnerConnection.providerBaselineRef || null),
      capabilityManifestId: manifest.manifestId,
      createdByActorId: existing.createdByActorId || text(actorId, "actor_id_required"),
      createdAt: existing.createdAt || partnerConnection.createdAt || nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.integrationConnections.set(record.connectionId, record);
    return materializeConnection(state, clock, record);
  }

  function listIntegrationConnections({ companyId, surfaceCode = null, environmentMode = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    return [...state.integrationConnections.values()]
      .filter((item) => item.companyId === resolvedCompanyId)
      .filter((item) => (surfaceCode ? item.surfaceCode === surfaceCode : true))
      .filter((item) => (environmentMode ? item.environmentMode === environmentMode : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((item) => materializeConnection(state, clock, item));
  }

  function getIntegrationConnection({ companyId, connectionId } = {}) {
    return materializeConnection(state, clock, requireIntegrationConnection(state, companyId, connectionId));
  }

  function listAdapterCapabilityManifests({ surfaceCode = null, providerCode = null, connectionType = null } = {}) {
    const manifests = [];
    const partnerModule = typeof getPartnerModule === "function" ? getPartnerModule() : null;
    if (partnerModule?.listPartnerConnectionCatalog) {
      for (const entry of partnerModule.listPartnerConnectionCatalog()) {
        for (const supportedProviderCode of entry.supportedProviders) {
          manifests.push(buildPartnerManifest(entry, supportedProviderCode));
        }
      }
    }
    const adapterProviders = typeof getAdapterProviders === "function" ? getAdapterProviders() : [];
    for (const provider of Array.isArray(adapterProviders) ? adapterProviders : []) {
      if (typeof provider?.getCapabilityManifest !== "function") {
        continue;
      }
      const manifest = provider.getCapabilityManifest();
      manifests.push({
        manifestId: manifest.manifestId || `${manifest.surfaceCode}:${manifest.connectionType}:${manifest.providerCode}`,
        surfaceCode: manifest.surfaceCode,
        connectionType: manifest.connectionType,
        providerCode: manifest.providerCode,
        requiredCredentialKinds: clone(manifest.requiredCredentialKinds || ["api_credentials"]),
        sandboxSupported: manifest.sandboxSupported === true,
        trialSafe: manifest.trialSafe === true,
        supportsLegalEffect: manifest.supportsLegalEffect === true,
        supportsLegalEffectInProduction: manifest.supportsLegalEffectInProduction === true,
        receiptMode: manifest.receiptMode || null,
        receiptModePolicy: clone(manifest.receiptModePolicy || manifest.modeMatrix?.receiptModePolicy || {}),
        runtimeEnvironmentMode: manifest.runtimeEnvironmentMode || null,
        runtimeExposureClass: manifest.runtimeExposureClass || null,
        environmentCapabilityTruth: clone(manifest.environmentCapabilityTruth || null),
        supportsAsyncCallback: manifest.supportsAsyncCallback === true,
        requiresCallbackRegistration: manifest.requiresCallbackRegistration === true,
        allowedEnvironmentModes: clone(manifest.allowedEnvironmentModes || modeMatrixToAllowedEnvironmentModes(manifest.modeMatrix)),
        modeMatrix: clone(manifest.modeMatrix),
        profiles: clone(manifest.profiles || [])
      });
    }
    return manifests
      .filter((item) => (surfaceCode ? item.surfaceCode === surfaceCode : true))
      .filter((item) => (providerCode ? item.providerCode === providerCode : true))
      .filter((item) => (connectionType ? item.connectionType === connectionType : true))
      .map(clone);
  }

  function recordCredentialSetMetadata({ companyId, connectionId, credentialRef, credentialKind, secretManagerRef = null, callbackDomain = null, callbackPath = null, expiresAt = null, actorId = "system" } = {}) {
    const connection = requireIntegrationConnection(state, companyId, connectionId);
    const resolvedKind = allowed(credentialKind, CREDENTIAL_KINDS, "integration_credential_kind_invalid");
    assertCredentialIsolation({
      state,
      companyId,
      providerCode: connection.providerCode,
      environmentMode: connection.environmentMode,
      credentialRef,
      secretManagerRef,
      existingConnectionId: connectionId
    });
    for (const metadata of listForConnection(state.credentialMetadataIdsByConnection, state.credentialSetMetadata, connectionId)) {
      if (metadata.status === "active" && metadata.credentialKind === resolvedKind) {
        metadata.status = "superseded";
        metadata.updatedAt = nowIso(clock);
      }
    }
    const metadata = {
      credentialSetId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      providerCode: connection.providerCode,
      environmentMode: connection.environmentMode,
      credentialKind: resolvedKind,
      credentialRef,
      credentialRefFingerprint: fingerprint(credentialRef),
      secretManagerRef: text(secretManagerRef || credentialRef, "integration_secret_manager_ref_required"),
      secretManagerRefFingerprint: fingerprint(secretManagerRef || credentialRef),
      callbackDomain: optional(callbackDomain),
      callbackPath: optional(callbackPath),
      expiresAt: expiresAt ? iso(expiresAt, "integration_credentials_expiry_invalid") : null,
      status: "active",
      createdByActorId: text(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.credentialSetMetadata.set(metadata.credentialSetId, metadata);
    appendId(state.credentialMetadataIdsByConnection, connectionId, metadata.credentialSetId);
    connection.updatedAt = nowIso(clock);
    return presentCredential(metadata);
  }

  function listCredentialSetMetadata({ companyId, connectionId } = {}) {
    requireIntegrationConnection(state, companyId, connectionId);
    return listForConnection(state.credentialMetadataIdsByConnection, state.credentialSetMetadata, connectionId).map(presentCredential);
  }

  function authorizeConsent({ companyId, connectionId, scopeSet = [], grantType = "oauth2_access", externalConsentRef = null, expiresAt = null, actorId = "system" } = {}) {
    const connection = requireIntegrationConnection(state, companyId, connectionId);
    const normalizedScopeSet = normalizeScopeSet(scopeSet);
    for (const consent of listForConnection(state.consentGrantIdsByConnection, state.consentGrants, connectionId)) {
      if (consent.status === "authorized") {
        consent.status = "revoked";
        consent.revokedAt = nowIso(clock);
        consent.updatedAt = nowIso(clock);
      }
    }
    const consent = {
      consentGrantId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      providerCode: connection.providerCode,
      environmentMode: connection.environmentMode,
      grantType: text(grantType, "integration_consent_grant_type_required"),
      scopeSet: normalizedScopeSet,
      externalConsentRef: optional(externalConsentRef),
      status: "authorized",
      authorizedByActorId: text(actorId, "actor_id_required"),
      authorizedAt: nowIso(clock),
      expiresAt: expiresAt ? iso(expiresAt, "integration_consent_expiry_invalid") : null,
      revokedAt: null,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.consentGrants.set(consent.consentGrantId, consent);
    appendId(state.consentGrantIdsByConnection, connectionId, consent.consentGrantId);
    connection.updatedAt = nowIso(clock);
    return clone(consent);
  }

  function listConsentGrants({ companyId, connectionId } = {}) {
    requireIntegrationConnection(state, companyId, connectionId);
    return listForConnection(state.consentGrantIdsByConnection, state.consentGrants, connectionId).map(clone);
  }

  function runIntegrationHealthCheck({ companyId, connectionId, actorId = "system", checkSetCode = "standard" } = {}) {
    const connection = requireIntegrationConnection(state, companyId, connectionId);
    const manifest = requireIntegrationManifest({
      partnerModule: connection.surfaceCode === "partner" ? requirePartnerModule(getPartnerModule) : null,
      surfaceCode: connection.surfaceCode,
      connectionType: connection.connectionType,
      providerCode: connection.providerCode,
      getAdapterProviders
    });
    const credentials = listForConnection(state.credentialMetadataIdsByConnection, state.credentialSetMetadata, connectionId).filter((item) => item.status === "active");
    const consents = listForConnection(state.consentGrantIdsByConnection, state.consentGrants, connectionId).filter((item) => item.status === "authorized");
    const partnerHealth = connection.surfaceCode === "partner"
      ? requirePartnerModule(getPartnerModule).runPartnerHealthCheck({ companyId, connectionId, checkSetCode, actorId })
      : null;
    const credentialsRequired = (manifest.requiredCredentialKinds || []).length > 0;
    const callbackConfigured = credentials.some(
      (item) => typeof item.callbackDomain === "string" && item.callbackDomain.length > 0
        && typeof item.callbackPath === "string" && item.callbackPath.length > 0
    );
    const credentialsConfigured = credentialsRequired ? credentials.length > 0 : true;
    const results = [
      check(
        "credentials_configured",
        credentialsConfigured ? "passed" : "failed",
        credentialsConfigured
          ? credentialsRequired
            ? "Credentials configured."
            : "Credentials not required for this adapter."
          : "Credentials missing.",
        clock
      ),
      check("environment_isolation", hasCrossModeReuse(state, connection, credentials) ? "failed" : "passed", hasCrossModeReuse(state, connection, credentials) ? "Credential reuse across environments detected." : "Credentials isolated per environment.", clock),
      check("rate_limit_policy", connection.rateLimitPerMinute > 0 ? "passed" : "failed", connection.rateLimitPerMinute > 0 ? "Rate limit policy configured." : "Rate limit policy missing.", clock),
      check("fallback_mode", typeof connection.fallbackMode === "string" && connection.fallbackMode.length > 0 ? "passed" : "failed", connection.fallbackMode ? `Fallback mode ${connection.fallbackMode}.` : "Fallback mode missing.", clock),
      check("provider_baseline", connection.providerBaselineRef ? "passed" : "warning", connection.providerBaselineRef ? "Provider baseline pinned." : "Provider baseline missing.", clock),
      check(
        "trial_receipt_mode",
        connection.environmentMode !== "trial" || (connection.receiptMode === "trial_simulated" && connection.supportsLegalEffect !== true) ? "passed" : "failed",
        connection.environmentMode !== "trial"
          ? `Receipt mode ${connection.receiptMode}.`
          : connection.receiptMode === "trial_simulated" && connection.supportsLegalEffect !== true
            ? "Trial connection is fenced to simulated receipts only."
            : "Trial connection is not fenced away from legal-effect receipts.",
        clock
      )
    ];
    if (manifest.requiresCallbackRegistration === true) {
      results.push(
        check(
          "callback_registration",
          callbackConfigured ? "passed" : "failed",
          callbackConfigured ? "Callback domain and path configured." : "Callback domain/path missing.",
          clock
        )
      );
    }
    if (connection.consentRequired) {
      results.push(check("consent_authorized", consents.length > 0 ? "passed" : "failed", consents.length > 0 ? "Consent authorized." : "Consent required but missing.", clock));
    }
    if (partnerHealth) {
      results.push(check("partner_runtime_health", partnerHealth.status === "healthy" ? "passed" : partnerHealth.status === "degraded" ? "warning" : "failed", `Partner runtime is ${partnerHealth.status}.`, clock));
    }
    const health = {
      integrationHealthCheckId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      providerCode: connection.providerCode,
      environmentMode: connection.environmentMode,
      checkSetCode: text(checkSetCode, "integration_health_check_set_code_required"),
      actorId: text(actorId, "actor_id_required"),
      delegatedPartnerHealthCheckId: partnerHealth?.healthCheckId || null,
      status: summarize(results),
      results,
      executedAt: nowIso(clock)
    };
    state.integrationHealthChecks.set(health.integrationHealthCheckId, health);
    appendId(state.integrationHealthCheckIdsByConnection, connectionId, health.integrationHealthCheckId);
    connection.updatedAt = nowIso(clock);
    return clone(health);
  }

  function listIntegrationHealthChecks({ companyId, connectionId } = {}) {
    requireIntegrationConnection(state, companyId, connectionId);
    return listForConnection(state.integrationHealthCheckIdsByConnection, state.integrationHealthChecks, connectionId).map(clone);
  }
}

function requirePartnerModule(getPartnerModule) {
  const module = typeof getPartnerModule === "function" ? getPartnerModule() : null;
  if (!module?.listPartnerConnectionCatalog) {
    throw error(500, "integration_partner_runtime_missing", "Partner integration runtime is not available.");
  }
  return module;
}

function requirePartnerManifest(partnerModule, connectionType, providerCode) {
  const entry = partnerModule.listPartnerConnectionCatalog().find((item) => item.connectionType === text(connectionType, "integration_connection_type_required"));
  if (!entry) {
    throw error(400, "integration_connection_type_invalid", `Unsupported connection type ${connectionType}.`);
  }
  if (!entry.supportedProviders.includes(text(providerCode, "integration_provider_code_required"))) {
    throw error(400, "integration_provider_code_invalid", `${providerCode} is not supported for ${connectionType}.`);
  }
  return buildPartnerManifest(entry, providerCode);
}

function requireIntegrationManifest({ partnerModule = null, surfaceCode, connectionType, providerCode, getAdapterProviders = null }) {
  if (surfaceCode === "partner") {
    return requirePartnerManifest(partnerModule, connectionType, providerCode);
  }
  const manifest = listNonPartnerManifests(getAdapterProviders).find(
    (candidate) =>
      candidate.surfaceCode === text(surfaceCode, "integration_surface_code_invalid")
      && candidate.connectionType === text(connectionType, "integration_connection_type_required")
      && candidate.providerCode === text(providerCode, "integration_provider_code_required")
  );
  if (!manifest) {
    throw error(400, "integration_provider_code_invalid", `${providerCode} is not supported for ${surfaceCode}/${connectionType}.`);
  }
  return manifest;
}

function buildPartnerManifest(entry, providerCode) {
  const sandboxSupported = entry.supportsSandbox === true;
  const receiptModePolicy = buildReceiptModePolicy({
    trialSafe: sandboxSupported,
    sandboxSupported,
    testSupported: true,
    productionSupported: true,
    supportsLegalEffectInProduction: true
  });
  const modeMatrix = {
    trial_safe: sandboxSupported,
    sandbox_supported: sandboxSupported,
    test_supported: true,
    production_supported: true,
    supportsLegalEffect: true,
    receiptModePolicy: clone(receiptModePolicy)
  };
  const environmentCapabilityTruth = buildEnvironmentCapabilityTruth({
    trialSafe: sandboxSupported,
    sandboxSupported,
    testSupported: true,
    productionSupported: true,
    supportsLegalEffectInProduction: true,
    receiptModePolicy
  });
  return {
    manifestId: `partner:${entry.connectionType}:${providerCode}`,
    surfaceCode: "partner",
    connectionType: entry.connectionType,
    providerCode,
    requiredCredentialKinds: [...entry.requiredCredentials],
    sandboxSupported,
    trialSafe: sandboxSupported,
    supportsLegalEffect: true,
    supportsLegalEffectInProduction: true,
    receiptMode: resolveReceiptModeForEnvironment(receiptModePolicy, sandboxSupported ? "trial" : "production"),
    receiptModePolicy: clone(receiptModePolicy),
    runtimeEnvironmentMode: sandboxSupported ? "trial" : "production",
    runtimeExposureClass: sandboxSupported ? "trial_only" : "legal_effect",
    environmentCapabilityTruth: clone(environmentCapabilityTruth),
    allowedEnvironmentModes: sandboxSupported ? ["trial", "sandbox", "test", "pilot_parallel", "production"] : ["pilot_parallel", "production"],
    modeMatrix
  };
}

function resolveManifestReceiptModePolicy(manifest = {}) {
  return manifest.receiptModePolicy
    || manifest.modeMatrix?.receiptModePolicy
    || buildReceiptModePolicy({
      trialSafe: manifest.trialSafe === true,
      sandboxSupported: manifest.sandboxSupported === true,
      testSupported: true,
      productionSupported: Array.isArray(manifest.allowedEnvironmentModes)
        ? manifest.allowedEnvironmentModes.includes("production") || manifest.allowedEnvironmentModes.includes("pilot_parallel")
        : true,
      supportsLegalEffectInProduction: manifest.supportsLegalEffect === true
    });
}

function supportsLegalEffectForManifest(manifest = {}, environmentMode = "test") {
  try {
    return resolveReceiptModeForEnvironment(resolveManifestReceiptModePolicy(manifest), environmentMode) === "provider_receipt_required";
  } catch {
    return false;
  }
}

function listNonPartnerManifests(getAdapterProviders) {
  const providers = typeof getAdapterProviders === "function" ? getAdapterProviders() : [];
  return (Array.isArray(providers) ? providers : [])
    .filter((provider) => typeof provider?.getCapabilityManifest === "function")
    .map((provider) => provider.getCapabilityManifest());
}

function inferCredentialKind(manifest) {
  return manifest.requiredCredentialKinds.find((kind) => CREDENTIAL_KINDS.includes(kind)) || "api_credentials";
}

function materializeConnection(state, clock, record) {
  const credentials = listForConnection(state.credentialMetadataIdsByConnection, state.credentialSetMetadata, record.connectionId).filter((item) => item.status === "active").map(presentCredential);
  const consents = listForConnection(state.consentGrantIdsByConnection, state.consentGrants, record.connectionId).filter((item) => item.status === "authorized").map(clone);
  const healthChecks = listForConnection(state.integrationHealthCheckIdsByConnection, state.integrationHealthChecks, record.connectionId);
  const latestHealth = [...healthChecks].sort((left, right) => right.executedAt.localeCompare(left.executedAt))[0] || null;
  const partnerConnection = state.partnerConnections?.get(record.connectionId) || null;
  const minuteKey = `${record.companyId}:${record.connectionId}:${nowIso(clock).slice(0, 16)}`;
    return clone({
      ...record,
      status: partnerConnection?.status || "active",
      healthStatus: latestHealth?.status || partnerConnection?.healthStatus || "unknown",
      credentialsConfigured: record.requiredCredentialKinds.length === 0 ? true : credentials.length > 0,
      credentialMetadataCount: credentials.length,
      consentGrantCount: consents.length,
      consentsAuthorized: consents.length > 0,
    currentMinuteRateLimitCount: state.partnerRateLimitCounters?.get(minuteKey) || 0,
    credentials,
    consents,
    latestHealthCheckId: latestHealth?.integrationHealthCheckId || null,
    latestHealthCheckAt: latestHealth?.executedAt || null
  });
}

function presentCredential(item) {
  return {
    credentialSetId: item.credentialSetId,
    companyId: item.companyId,
    connectionId: item.connectionId,
    providerCode: item.providerCode,
    environmentMode: item.environmentMode,
    credentialKind: item.credentialKind,
    credentialRefFingerprint: item.credentialRefFingerprint,
    credentialRefPreview: preview(item.credentialRef),
    secretManagerRefFingerprint: item.secretManagerRefFingerprint,
    secretManagerRefPreview: preview(item.secretManagerRef),
    callbackDomain: item.callbackDomain,
    callbackPath: item.callbackPath,
    expiresAt: item.expiresAt,
    status: item.status,
    createdByActorId: item.createdByActorId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function requireIntegrationConnection(state, companyId, connectionId) {
  const record = state.integrationConnections.get(text(connectionId, "integration_connection_id_required"));
  if (!record || record.companyId !== text(companyId, "company_id_required")) {
    throw error(404, "integration_connection_not_found", "Integration connection was not found.");
  }
  return record;
}

function requirePartnerConnection(state, companyId, connectionId) {
  const record = state.partnerConnections.get(text(connectionId, "partner_connection_id_required"));
  if (!record || record.companyId !== text(companyId, "company_id_required")) {
    throw error(404, "partner_connection_not_found", "Partner connection was not found.");
  }
  return record;
}

function listForConnection(indexMap, sourceMap, connectionId) {
  return (indexMap.get(connectionId) || []).map((id) => sourceMap.get(id)).filter(Boolean);
}

function appendId(indexMap, connectionId, id) {
  const ids = indexMap.get(connectionId) || [];
  if (!ids.includes(id)) {
    ids.push(id);
    indexMap.set(connectionId, ids);
  }
}

function assertCredentialIsolation({ state, companyId, providerCode, environmentMode, credentialRef, secretManagerRef = null, existingConnectionId = null }) {
  if (optional(credentialRef) === null) {
    return;
  }
  const credentialRefFingerprint = fingerprint(text(credentialRef, "integration_credentials_ref_required"));
  const secretManagerRefFingerprint = fingerprint(text(secretManagerRef || credentialRef, "integration_secret_manager_ref_required"));
  const resolvedCompanyId = text(companyId, "company_id_required");
  const resolvedProviderCode = text(providerCode, "integration_provider_code_required");
  const resolvedEnvironmentMode = allowed(environmentMode, INTEGRATION_ENVIRONMENT_MODES, "integration_environment_mode_invalid");
  for (const item of state.credentialSetMetadata.values()) {
    if (item.companyId !== resolvedCompanyId || item.providerCode !== resolvedProviderCode || item.connectionId === existingConnectionId || item.environmentMode === resolvedEnvironmentMode) {
      continue;
    }
    if (item.credentialRefFingerprint === credentialRefFingerprint || item.secretManagerRefFingerprint === secretManagerRefFingerprint) {
      throw error(409, "integration_credentials_mode_reuse_forbidden", `Credentials for ${resolvedProviderCode} may not be reused across ${item.environmentMode} and ${resolvedEnvironmentMode}.`);
    }
  }
}

function hasCrossModeReuse(state, connection, credentials) {
  if (credentials.length === 0) {
    return false;
  }
  return credentials.some((metadata) =>
    [...state.credentialSetMetadata.values()].some((candidate) =>
      candidate.connectionId !== connection.connectionId
      && candidate.providerCode === connection.providerCode
      && candidate.environmentMode !== connection.environmentMode
      && candidate.credentialRefFingerprint === metadata.credentialRefFingerprint
    )
  );
}

function normalizeScopeSet(scopeSet) {
  if (!Array.isArray(scopeSet) || scopeSet.length === 0) {
    throw error(400, "integration_consent_scope_required", "At least one consent scope is required.");
  }
  return [...new Set(scopeSet.map((item) => text(item, "integration_consent_scope_required")))];
}

function toPartnerMode(environmentMode) {
  if (environmentMode === "production" || environmentMode === "pilot_parallel") {
    return "production";
  }
  if (environmentMode === "test") {
    return "test";
  }
  return "sandbox";
}

function fromPartnerMode(partnerMode) {
  if (partnerMode === "production") {
    return "production";
  }
  if (partnerMode === "test") {
    return "test";
  }
  return "sandbox";
}

function defaultEnvironmentMode(runtimeMode) {
  return INTEGRATION_ENVIRONMENT_MODES.includes(runtimeMode) ? runtimeMode : runtimeMode === "production" ? "production" : "sandbox";
}

function supportsLegalEffect(environmentMode) {
  return environmentMode === "production" || environmentMode === "pilot_parallel";
}

function providerEnvironmentRefForMode(environmentMode) {
  if (environmentMode === "trial") {
    return "trial_safe";
  }
  if (environmentMode === "sandbox") {
    return "sandbox";
  }
  if (environmentMode === "test") {
    return "test";
  }
  if (environmentMode === "pilot_parallel") {
    return "pilot_parallel";
  }
  return "production";
}

function modeMatrixToAllowedEnvironmentModes(modeMatrix = null) {
  if (!modeMatrix || typeof modeMatrix !== "object") {
    return [];
  }
  const allowedModes = [];
  if (modeMatrix.trial_safe) {
    allowedModes.push("trial");
  }
  if (modeMatrix.sandbox_supported) {
    allowedModes.push("sandbox");
  }
  if (modeMatrix.test_supported) {
    allowedModes.push("test");
  }
  if (modeMatrix.production_supported) {
    allowedModes.push("pilot_parallel", "production");
  }
  return allowedModes;
}

function summarize(results) {
  if (results.some((item) => item.status === "failed")) {
    return "outage";
  }
  if (results.some((item) => item.status === "warning")) {
    return "degraded";
  }
  return "healthy";
}

function check(checkCode, status, summary, clock) {
  return { checkCode, status, summary, observedAt: nowIso(clock) };
}

function preview(value) {
  const resolved = optional(value);
  if (!resolved) {
    return null;
  }
  return resolved.length <= 8 ? resolved : `${resolved.slice(0, 4)}***${resolved.slice(-4)}`;
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function iso(value, code) {
  const resolved = new Date(text(value, code));
  if (Number.isNaN(resolved.getTime())) {
    throw error(400, code, `${code} is invalid.`);
  }
  return resolved.toISOString();
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function optional(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw error(400, code, `${code} is required.`);
  }
  return value.trim();
}

function allowed(value, allowedValues, code) {
  const resolved = text(value, code);
  if (!allowedValues.includes(resolved)) {
    throw error(400, code, `${code} does not allow ${resolved}.`);
  }
  return resolved;
}


function error(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
