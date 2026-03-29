import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase13PartnerRoutes({ req, res, url, path, platform }) {
  if (req.method === "GET" && path === "/v1/partners/contract-test-packs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_contract_test",
      objectId: companyId,
      scopeCode: "partner_contract_test"
    });
    writeJson(res, 200, {
      items: platform.listAdapterContractTestPacks({
        connectionType: optionalText(url.searchParams.get("connectionType")),
        providerCode: optionalText(url.searchParams.get("providerCode"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/partners/connections") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "partner_connection",
      objectId: companyId,
      scopeCode: "partner_connection"
    });
    writeJson(
      res,
      201,
      platform.createPartnerConnection({
        companyId,
        connectionType: body.connectionType,
        providerCode: body.providerCode || body.partnerCode,
        displayName: body.displayName,
        mode: body.mode,
        rateLimitPerMinute: body.rateLimitPerMinute,
        fallbackMode: body.fallbackMode,
        credentialsRef: body.credentialsRef,
        config: body.config || {},
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/partners/catalog") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_connection",
      objectId: companyId,
      scopeCode: "partner_connection"
    });
    writeJson(res, 200, {
      items: platform.listPartnerConnectionCatalog()
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/partners/connections") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_connection",
      objectId: companyId,
      scopeCode: "partner_connection"
    });
    writeJson(res, 200, {
      items: platform.listPartnerConnections({
        companyId,
        connectionType: optionalText(url.searchParams.get("connectionType")),
        providerCode: optionalText(url.searchParams.get("providerCode")),
        mode: optionalText(url.searchParams.get("mode"))
      })
    });
    return true;
  }

  const partnerCapabilitiesMatch = matchPath(path, "/v1/partners/connections/:connectionId/capabilities");
  if (req.method === "GET" && partnerCapabilitiesMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_connection",
      objectId: partnerCapabilitiesMatch.connectionId,
      scopeCode: "partner_connection"
    });
    writeJson(res, 200, platform.getPartnerConnectionCapabilities({ companyId, connectionId: partnerCapabilitiesMatch.connectionId }));
    return true;
  }

  const partnerHealthMatch = matchPath(path, "/v1/partners/connections/:connectionId/health");
  if (req.method === "POST" && partnerHealthMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "partner_connection",
      objectId: partnerHealthMatch.connectionId,
      scopeCode: "partner_connection"
    });
    const result = platform.setPartnerConnectionHealth({
      companyId,
      connectionId: partnerHealthMatch.connectionId,
      status: body.status
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "partner.connection.updated",
      resourceType: "partner_connection",
      resourceId: result.connectionId,
      payload: result,
      mode: result.mode
    });
    writeJson(res, 200, result);
    return true;
  }

  const partnerHealthCheckMatch = matchPath(path, "/v1/partners/connections/:connectionId/health-checks");
  if (req.method === "GET" && partnerHealthCheckMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_connection",
      objectId: partnerHealthCheckMatch.connectionId,
      scopeCode: "partner_connection"
    });
    writeJson(res, 200, {
      items: platform.listPartnerHealthChecks({
        companyId,
        connectionId: partnerHealthCheckMatch.connectionId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }
  if (req.method === "POST" && partnerHealthCheckMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "partner_connection",
      objectId: partnerHealthCheckMatch.connectionId,
      scopeCode: "partner_connection"
    });
    writeJson(
      res,
      201,
      platform.runPartnerHealthCheck({
        companyId,
        connectionId: partnerHealthCheckMatch.connectionId,
        checkSetCode: body.checkSetCode || "standard",
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  const partnerHealthSummaryMatch = matchPath(path, "/v1/partners/connections/:connectionId/health-summary");
  if (req.method === "GET" && partnerHealthSummaryMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_connection",
      objectId: partnerHealthSummaryMatch.connectionId,
      scopeCode: "partner_connection"
    });
    writeJson(res, 200, platform.getPartnerHealthSummary({ companyId, connectionId: partnerHealthSummaryMatch.connectionId }));
    return true;
  }

  const contractTestMatch = matchPath(path, "/v1/partners/connections/:connectionId/contract-tests");
  if (req.method === "POST" && contractTestMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "partner_contract_test",
      objectId: contractTestMatch.connectionId,
      scopeCode: "partner_contract_test"
    });
    const result = await platform.runAdapterContractTest({
      companyId,
      connectionId: contractTestMatch.connectionId,
      testPackCode: body.testPackCode || null,
      mode: body.mode || null,
      actorId: body.actorId || "session_user"
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "partner.contract_test.completed",
      resourceType: "partner_contract_test",
      resourceId: result.contractResultId,
      payload: result,
      mode: result.mode
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/partners/contract-tests") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_contract_test",
      objectId: companyId,
      scopeCode: "partner_contract_test"
    });
    writeJson(res, 200, {
      items: platform.listAdapterContractResults({
        companyId,
        connectionId: optionalText(url.searchParams.get("connectionId")),
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/partners/operations") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "partner_operation",
      objectId: body.connectionId,
      scopeCode: "partner_operation"
    });
    const operation = await platform.dispatchPartnerOperation({
      companyId,
      connectionId: body.connectionId,
      operationCode: body.operationCode,
      operationKey: body.operationKey || null,
      payload: body.payload || {},
      dryRun: body.dryRun === true,
      actorId: body.actorId || "session_user"
    });
    if (operation.status === "succeeded") {
      platform.emitWebhookEvent({
        companyId,
        eventType: "partner.operation.completed",
        resourceType: "partner_operation",
        resourceId: operation.operationId,
        payload: operation,
        mode: operation.mode
      });
    } else if (operation.status === "fallback" || operation.status === "rate_limited") {
      platform.emitWebhookEvent({
        companyId,
        eventType: "partner.operation.failed",
        resourceType: "partner_operation",
        resourceId: operation.operationId,
        payload: operation,
        mode: operation.mode
      });
    }
    writeJson(res, 201, operation);
    return true;
  }

  const partnerOperationDispatchMatch = matchPath(path, "/v1/partners/operations/:operationId/dispatch");
  if (req.method === "POST" && partnerOperationDispatchMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "partner_operation",
      objectId: partnerOperationDispatchMatch.operationId,
      scopeCode: "partner_operation"
    });
    const operation = await platform.executePartnerOperation({
      companyId,
      operationId: partnerOperationDispatchMatch.operationId,
      actorId: body.actorId || "session_user"
    });
    if (operation.status === "succeeded") {
      platform.emitWebhookEvent({
        companyId,
        eventType: "partner.operation.completed",
        resourceType: "partner_operation",
        resourceId: operation.operationId,
        payload: operation,
        mode: operation.mode
      });
    } else if (["failed", "fallback", "rate_limited", "retry_scheduled"].includes(operation.status)) {
      platform.emitWebhookEvent({
        companyId,
        eventType: "partner.operation.failed",
        resourceType: "partner_operation",
        resourceId: operation.operationId,
        payload: operation,
        mode: operation.mode
      });
    }
    writeJson(res, 200, operation);
    return true;
  }

  if (req.method === "GET" && path === "/v1/partners/operations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_operation",
      objectId: companyId,
      scopeCode: "partner_operation"
    });
    writeJson(res, 200, {
      items: platform.listPartnerOperations({
        companyId,
        connectionId: optionalText(url.searchParams.get("connectionId")),
        status: optionalText(url.searchParams.get("status")),
        operationCode: optionalText(url.searchParams.get("operationCode"))
      })
    });
    return true;
  }

  const partnerOperationMatch = matchPath(path, "/v1/partners/operations/:operationId");
  if (req.method === "GET" && partnerOperationMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "partner_operation",
      objectId: partnerOperationMatch.operationId,
      scopeCode: "partner_operation"
    });
    writeJson(res, 200, platform.getPartnerOperation({ companyId, operationId: partnerOperationMatch.operationId }));
    return true;
  }

  const partnerOperationReplayMatch = matchPath(path, "/v1/partners/operations/:operationId/replay");
  if (req.method === "POST" && partnerOperationReplayMatch) {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "partner_operation",
      objectId: partnerOperationReplayMatch.operationId,
      scopeCode: "partner_operation"
    });
    writeJson(
      res,
      200,
      platform.replayPartnerOperation({
        companyId,
        operationId: partnerOperationReplayMatch.operationId,
        actorId: body.actorId || "session_user",
        reasonCode: body.reasonCode || null,
        approvedByActorId: body.approvedByActorId || null
      })
    );
    return true;
  }

  return false;
}
