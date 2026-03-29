import crypto from "node:crypto";

export const INTEGRATION_SURFACE_CODES = Object.freeze(["partner", "document_ai"]);
export const INTEGRATION_ENVIRONMENT_MODES = Object.freeze(["trial", "sandbox", "test", "pilot_parallel", "production"]);
export const CREDENTIAL_KINDS = Object.freeze(["api_credentials", "client_secret", "certificate_ref", "file_channel_credentials"]);

export function createIntegrationControlPlane({
  state,
  clock = () => new Date(),
  environmentMode: defaultRuntimeEnvironmentMode = "test",
  getPartnerModule = null,
  getDocumentOcrProvider = null
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
    if (surfaceCode !== "partner") {
      throw error(409, "integration_surface_creation_not_supported", `${surfaceCode} connections are not supported in phase 16.1.`);
    }
    const resolvedEnvironmentMode = allowed(
      input.environmentMode || defaultEnvironmentMode(defaultRuntimeEnvironmentMode),
      INTEGRATION_ENVIRONMENT_MODES,
      "integration_environment_mode_invalid"
    );
    const partnerModule = requirePartnerModule(getPartnerModule);
    const manifest = requirePartnerManifest(partnerModule, input.connectionType, input.providerCode);
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
    const registered = registerPartnerConnection({
      companyId: input.companyId,
      connectionId: partnerConnection.connectionId,
      environmentMode: resolvedEnvironmentMode,
      actorId: input.actorId || "system"
    });
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
      supportsLegalEffect: supportsLegalEffect(resolvedEnvironmentMode),
      sandboxSupported: manifest.sandboxSupported,
      trialSafe: manifest.trialSafe,
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
    const documentOcrProvider = typeof getDocumentOcrProvider === "function" ? getDocumentOcrProvider() : null;
    if (documentOcrProvider?.getCapabilityManifest) {
      const manifest = documentOcrProvider.getCapabilityManifest();
      manifests.push({
        manifestId: `document_ai:${manifest.providerCode}:${manifest.providerMode}`,
        surfaceCode: "document_ai",
        connectionType: "document_ai",
        providerCode: manifest.providerCode,
        requiredCredentialKinds: ["api_credentials"],
        sandboxSupported: manifest.sandboxSupported === true,
        trialSafe: manifest.trialSafe === true,
        supportsLegalEffect: manifest.supportsLegalEffect === true,
        allowedEnvironmentModes: modeMatrixToAllowedEnvironmentModes(manifest.modeMatrix),
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
    const credentials = listForConnection(state.credentialMetadataIdsByConnection, state.credentialSetMetadata, connectionId).filter((item) => item.status === "active");
    const consents = listForConnection(state.consentGrantIdsByConnection, state.consentGrants, connectionId).filter((item) => item.status === "authorized");
    const partnerHealth = connection.surfaceCode === "partner"
      ? requirePartnerModule(getPartnerModule).runPartnerHealthCheck({ companyId, connectionId, checkSetCode, actorId })
      : null;
    const results = [
      check("credentials_configured", credentials.length > 0 ? "passed" : "failed", credentials.length > 0 ? "Credentials configured." : "Credentials missing.", clock),
      check("environment_isolation", hasCrossModeReuse(state, connection, credentials) ? "failed" : "passed", hasCrossModeReuse(state, connection, credentials) ? "Credential reuse across environments detected." : "Credentials isolated per environment.", clock),
      check("rate_limit_policy", connection.rateLimitPerMinute > 0 ? "passed" : "failed", connection.rateLimitPerMinute > 0 ? "Rate limit policy configured." : "Rate limit policy missing.", clock),
      check("fallback_mode", typeof connection.fallbackMode === "string" && connection.fallbackMode.length > 0 ? "passed" : "failed", connection.fallbackMode ? `Fallback mode ${connection.fallbackMode}.` : "Fallback mode missing.", clock),
      check("provider_baseline", connection.providerBaselineRef ? "passed" : "warning", connection.providerBaselineRef ? "Provider baseline pinned." : "Provider baseline missing.", clock)
    ];
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

function buildPartnerManifest(entry, providerCode) {
  const sandboxSupported = entry.supportsSandbox === true;
  const modeMatrix = {
    trial_safe: sandboxSupported,
    sandbox_supported: sandboxSupported,
    test_supported: true,
    production_supported: true,
    supportsLegalEffect: true
  };
  return {
    manifestId: `partner:${entry.connectionType}:${providerCode}`,
    surfaceCode: "partner",
    connectionType: entry.connectionType,
    providerCode,
    requiredCredentialKinds: [...entry.requiredCredentials],
    sandboxSupported,
    trialSafe: sandboxSupported,
    supportsLegalEffect: true,
    allowedEnvironmentModes: sandboxSupported ? ["trial", "sandbox", "test", "pilot_parallel", "production"] : ["pilot_parallel", "production"],
    modeMatrix
  };
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
    credentialsConfigured: credentials.length > 0,
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

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function error(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
