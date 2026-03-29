import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase16IntegrationRoutes({ req, res, url, path, platform }) {
  if (req.method === "GET" && path === "/v1/integrations/capability-manifests") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "integration_connection",
      objectId: companyId,
      scopeCode: "integration_connection"
    });
    writeJson(res, 200, {
      items: platform.listAdapterCapabilityManifests({
        surfaceCode: optionalText(url.searchParams.get("surfaceCode")),
        providerCode: optionalText(url.searchParams.get("providerCode")),
        connectionType: optionalText(url.searchParams.get("connectionType"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/integrations/connections") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "integration_connection",
      objectId: companyId,
      scopeCode: "integration_connection"
    });
    writeJson(
      res,
      201,
      platform.createIntegrationConnection({
        companyId,
        surfaceCode: body.surfaceCode,
        connectionType: body.connectionType,
        providerCode: body.providerCode,
        displayName: body.displayName,
        environmentMode: body.environmentMode,
        rateLimitPerMinute: body.rateLimitPerMinute,
        fallbackMode: body.fallbackMode,
        credentialsRef: body.credentialsRef,
        credentialKind: body.credentialKind,
        secretManagerRef: body.secretManagerRef,
        callbackDomain: body.callbackDomain,
        callbackPath: body.callbackPath,
        credentialsExpiresAt: body.credentialsExpiresAt,
        consentGrant: body.consentGrant || null,
        config: body.config || {},
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/integrations/connections") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "integration_connection",
      objectId: companyId,
      scopeCode: "integration_connection"
    });
    writeJson(res, 200, {
      items: platform.listIntegrationConnections({
        companyId,
        surfaceCode: optionalText(url.searchParams.get("surfaceCode")),
        environmentMode: optionalText(url.searchParams.get("environmentMode"))
      })
    });
    return true;
  }

  const connectionMatch = matchPath(path, "/v1/integrations/connections/:connectionId");
  if (req.method === "GET" && connectionMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "integration_connection",
      objectId: connectionMatch.connectionId,
      scopeCode: "integration_connection"
    });
    writeJson(res, 200, platform.getIntegrationConnection({ companyId, connectionId: connectionMatch.connectionId }));
    return true;
  }

  const credentialsMatch = matchPath(path, "/v1/integrations/connections/:connectionId/credentials");
  if (req.method === "POST" && credentialsMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "integration_connection",
      objectId: credentialsMatch.connectionId,
      scopeCode: "integration_connection"
    });
    writeJson(
      res,
      201,
      platform.recordCredentialSetMetadata({
        companyId,
        connectionId: credentialsMatch.connectionId,
        credentialRef: body.credentialsRef,
        credentialKind: body.credentialKind,
        secretManagerRef: body.secretManagerRef,
        callbackDomain: body.callbackDomain,
        callbackPath: body.callbackPath,
        expiresAt: body.expiresAt,
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && credentialsMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "integration_connection",
      objectId: credentialsMatch.connectionId,
      scopeCode: "integration_connection"
    });
    writeJson(res, 200, {
      items: platform.listCredentialSetMetadata({
        companyId,
        connectionId: credentialsMatch.connectionId
      })
    });
    return true;
  }

  const consentsMatch = matchPath(path, "/v1/integrations/connections/:connectionId/consents");
  if (req.method === "POST" && consentsMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "integration_connection",
      objectId: consentsMatch.connectionId,
      scopeCode: "integration_connection"
    });
    writeJson(
      res,
      201,
      platform.authorizeConsent({
        companyId,
        connectionId: consentsMatch.connectionId,
        scopeSet: body.scopeSet,
        grantType: body.grantType,
        externalConsentRef: body.externalConsentRef,
        expiresAt: body.expiresAt,
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && consentsMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "integration_connection",
      objectId: consentsMatch.connectionId,
      scopeCode: "integration_connection"
    });
    writeJson(res, 200, {
      items: platform.listConsentGrants({
        companyId,
        connectionId: consentsMatch.connectionId
      })
    });
    return true;
  }

  const healthChecksMatch = matchPath(path, "/v1/integrations/connections/:connectionId/health-checks");
  if (req.method === "POST" && healthChecksMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "integration_connection",
      objectId: healthChecksMatch.connectionId,
      scopeCode: "integration_connection"
    });
    writeJson(
      res,
      201,
      platform.runIntegrationHealthCheck({
        companyId,
        connectionId: healthChecksMatch.connectionId,
        checkSetCode: body.checkSetCode || "standard",
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && healthChecksMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "integration_connection",
      objectId: healthChecksMatch.connectionId,
      scopeCode: "integration_connection"
    });
    writeJson(res, 200, {
      items: platform.listIntegrationHealthChecks({
        companyId,
        connectionId: healthChecksMatch.connectionId
      })
    });
    return true;
  }

  return false;
}
