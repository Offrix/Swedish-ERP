import crypto from "node:crypto";
import {
  authorizeCompanyAccess,
  authorizePublicAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase13Route({ req, res, url, path, platform }) {
  if (req.method === "POST" && path === "/v1/public/oauth/token") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.exchangePublicApiClientCredentials({
        companyId: body.companyId,
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        scopes: body.scopes,
        expiresInMinutes: body.expiresInMinutes
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/spec") {
    writeJson(res, 200, platform.getPublicApiSpec({ version: url.searchParams.get("version") || undefined }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/sandbox/catalog") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizePublicAccess({ platform, req, requiredScopes: ["api_spec.read"], mode: "sandbox", companyId });
    writeJson(res, 200, platform.getPublicApiSandboxCatalog({ companyId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/report-snapshots") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizePublicAccess({ platform, req, requiredScopes: ["reporting.read"], companyId });
    const reporting = platform.snapshotReporting();
    writeJson(res, 200, {
      items: reporting.reportSnapshots
        .filter((snapshot) => snapshot.companyId === companyId)
        .sort((left, right) => left.generatedAt.localeCompare(right.generatedAt))
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/submissions") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizePublicAccess({ platform, req, requiredScopes: ["submission.read"], companyId });
    writeJson(
      res,
      200,
      {
        items: platform.listAuthoritySubmissions({
          companyId,
          submissionType: optionalText(url.searchParams.get("submissionType")),
          sourceObjectType: optionalText(url.searchParams.get("sourceObjectType")),
          sourceObjectId: optionalText(url.searchParams.get("sourceObjectId"))
        })
      }
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/legal-forms/declaration-profile") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const asOfDate = requireText(url.searchParams.get("asOfDate"), "as_of_date_required", "asOfDate is required.");
    authorizePublicAccess({ platform, req, requiredScopes: ["legal_form.read"], companyId });
    writeJson(
      res,
      200,
      platform.resolveDeclarationProfile({
        companyId,
        asOfDate,
        fiscalYearKey: optionalText(url.searchParams.get("fiscalYearKey")),
        fiscalYearId: optionalText(url.searchParams.get("fiscalYearId")),
        accountingPeriodId: optionalText(url.searchParams.get("accountingPeriodId"))
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/annual-reporting/packages") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizePublicAccess({ platform, req, requiredScopes: ["annual_reporting.read"], companyId });
    writeJson(res, 200, {
      items: platform.listAnnualReportPackages({ companyId }).map(presentPublicAnnualPackage)
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/tax-account/summary") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizePublicAccess({ platform, req, requiredScopes: ["tax_account.read"], companyId });
    const snapshot = platform.snapshotTaxAccount({ companyId });
    writeJson(res, 200, presentPublicTaxAccountSummary(snapshot));
    return true;
  }

  if (req.method === "GET" && path === "/v1/public/tax-account/reconciliations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizePublicAccess({ platform, req, requiredScopes: ["tax_account.read"], companyId });
    const snapshot = platform.snapshotTaxAccount({ companyId });
    writeJson(res, 200, {
      items: platform.listTaxAccountReconciliations({ companyId }).map(presentPublicTaxAccountReconciliation),
      balance: snapshot.balance,
      openDifferenceCaseCount: snapshot.discrepancies.length
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/public-api/clients") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "public_api_client",
      objectId: companyId,
      scopeCode: "public_api_client"
    });
    writeJson(
      res,
      201,
      platform.createPublicApiClient({
        companyId,
        displayName: body.displayName,
        mode: body.mode,
        scopes: body.scopes,
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/public-api/clients") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "public_api_client",
      objectId: companyId,
      scopeCode: "public_api_client"
    });
    writeJson(res, 200, {
      items: platform.listPublicApiClients({
        companyId,
        mode: optionalText(url.searchParams.get("mode"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/public-api/tokens") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "public_api_token",
      objectId: companyId,
      scopeCode: "public_api_token"
    });
    writeJson(
      res,
      201,
      platform.issuePublicApiToken({
        companyId,
        clientId: body.clientId,
        scopes: body.scopes,
        actorId: body.actorId || "session_user",
        expiresInMinutes: body.expiresInMinutes
      })
    );
    return true;
  }

  if (req.method === "POST" && path === "/v1/public-api/compatibility-baselines") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "public_api_baseline",
      objectId: companyId,
      scopeCode: "public_api_baseline"
    });
    const spec = platform.getPublicApiSpec({ version: body.version || "2026-03-22" });
    writeJson(
      res,
      201,
      platform.recordPublicApiCompatibilityBaseline({
        companyId,
        version: spec.version,
        routeHash: body.routeHash || hashObject(spec),
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/public-api/compatibility-baselines") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "public_api_baseline",
      objectId: companyId,
      scopeCode: "public_api_baseline"
    });
    writeJson(res, 200, {
      items: platform.listPublicApiCompatibilityBaselines({ companyId })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/public-api/webhooks") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "webhook_subscription",
      objectId: companyId,
      scopeCode: "webhook_subscription"
    });
    writeJson(
      res,
      201,
      platform.createWebhookSubscription({
        companyId,
        clientId: body.clientId,
        mode: body.mode,
        eventTypes: body.eventTypes,
        targetUrl: body.targetUrl,
        actorId: body.actorId || "session_user",
        description: body.description
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/public-api/webhooks") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "webhook_subscription",
      objectId: companyId,
      scopeCode: "webhook_subscription"
    });
    writeJson(res, 200, {
      items: platform.listWebhookSubscriptions({
        companyId,
        clientId: optionalText(url.searchParams.get("clientId"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/public-api/webhook-events") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "webhook_event",
      objectId: companyId,
      scopeCode: "webhook_event"
    });
    writeJson(
      res,
      201,
      platform.emitWebhookEvent({
        companyId,
        eventType: body.eventType,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        payload: body.payload || {},
        mode: body.mode,
        eventKey: body.eventKey
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/public-api/webhook-events") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "webhook_event",
      objectId: companyId,
      scopeCode: "webhook_event"
    });
    writeJson(res, 200, {
      items: platform.listWebhookEvents({
        companyId,
        mode: optionalText(url.searchParams.get("mode")),
        eventType: optionalText(url.searchParams.get("eventType"))
      })
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/public-api/webhook-deliveries") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "webhook_delivery",
      objectId: companyId,
      scopeCode: "webhook_delivery"
    });
    writeJson(res, 200, {
      items: platform.listWebhookDeliveries({
        companyId,
        subscriptionId: optionalText(url.searchParams.get("subscriptionId")),
        eventId: optionalText(url.searchParams.get("eventId"))
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
        partnerCode: body.partnerCode,
        displayName: body.displayName,
        mode: body.mode,
        rateLimitPerMinute: body.rateLimitPerMinute,
        fallbackMode: body.fallbackMode,
        credentialsRef: body.credentialsRef,
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

  if (req.method === "POST" && path === "/v1/public-api/webhook-deliveries/dispatch") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "webhook_delivery",
      objectId: companyId,
      scopeCode: "webhook_delivery"
    });
    writeJson(
      res,
      200,
      await platform.dispatchWebhookDeliveries({
        companyId,
        deliveryId: body.deliveryId,
        subscriptionId: body.subscriptionId,
        eventId: body.eventId,
        actorId: body.actorId || "session_user",
        limit: body.limit
      })
    );
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
        connectionType: optionalText(url.searchParams.get("connectionType"))
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
    writeJson(
      res,
      200,
      platform.getPartnerConnectionCapabilities({
        companyId,
        connectionId: partnerCapabilitiesMatch.connectionId
      })
    );
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
        connectionId: optionalText(url.searchParams.get("connectionId"))
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
      payload: body.payload || {},
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
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/jobs") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: companyId,
      scopeCode: "async_job"
    });
    writeJson(
      res,
      201,
      platform.enqueueAsyncJob({
        companyId,
        jobType: body.jobType,
        payloadRef: body.payloadRef,
        payload: body.payload || {},
        priority: body.priority,
        riskClass: body.riskClass,
        retryPolicy: body.retryPolicy,
        sourceEventId: body.sourceEventId,
        sourceActionId: body.sourceActionId,
        idempotencyKey: body.idempotencyKey,
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/jobs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "async_job",
      objectId: companyId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, {
      items: platform.listAsyncJobs({
        companyId,
        status: optionalText(url.searchParams.get("status")),
        jobType: optionalText(url.searchParams.get("jobType"))
      })
    });
    return true;
  }

  const jobMatch = matchPath(path, "/v1/jobs/:jobId");
  if (req.method === "GET" && jobMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "async_job",
      objectId: jobMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.getAsyncJob({ companyId, jobId: jobMatch.jobId }));
    return true;
  }

  const jobClaimMatch = matchPath(path, "/v1/jobs/:jobId/claim");
  if (req.method === "POST" && jobClaimMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobClaimMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.claimAsyncJob({ companyId, jobId: jobClaimMatch.jobId, workerId: body.workerId }));
    return true;
  }

  const jobCompleteMatch = matchPath(path, "/v1/jobs/:jobId/complete");
  if (req.method === "POST" && jobCompleteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobCompleteMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.completeAsyncJob({ companyId, jobId: jobCompleteMatch.jobId, resultSummary: body.resultSummary || {} }));
    return true;
  }

  const jobFailMatch = matchPath(path, "/v1/jobs/:jobId/fail");
  if (req.method === "POST" && jobFailMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobFailMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(
      res,
      200,
      platform.failAsyncJobAttempt({
        companyId,
        jobId: jobFailMatch.jobId,
        errorClass: body.errorClass,
        errorMessage: body.errorMessage,
        replayAllowed: body.replayAllowed
      })
    );
    return true;
  }

  const jobReplayPlanMatch = matchPath(path, "/v1/jobs/:jobId/replay-plan");
  if (req.method === "POST" && jobReplayPlanMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobReplayPlanMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(
      res,
      200,
      platform.planJobReplay({
        companyId,
        jobId: jobReplayPlanMatch.jobId,
        actorId: body.actorId || "session_user",
        approvedByActorId: body.approvedByActorId || null
      })
    );
    return true;
  }

  const jobReplayMatch = matchPath(path, "/v1/jobs/:jobId/replay");
  if (req.method === "POST" && jobReplayMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobReplayMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.executeJobReplay({ companyId, jobId: jobReplayMatch.jobId, actorId: body.actorId || "session_user" }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/jobs/mass-retry") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: companyId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, {
      items: platform.massRetryJobs({
        companyId,
        jobIds: body.jobIds,
        actorId: body.actorId || "session_user"
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/automation/rule-packs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_rule_pack",
      objectId: companyId,
      scopeCode: "automation_rule_pack"
    });
    writeJson(
      res,
      201,
      platform.createNoCodeRulePack({
        rulePackId: body.rulePackId,
        domain: body.domain || "automation",
        jurisdiction: body.jurisdiction || "SE",
        effectiveFrom: body.effectiveFrom || new Date().toISOString().slice(0, 10),
        effectiveTo: body.effectiveTo || null,
        version: body.version || "1",
        semanticChangeSummary: body.semanticChangeSummary || "Automation rule pack created via API.",
        machineReadableRules: body.machineReadableRules || {},
        humanReadableExplanation: body.humanReadableExplanation || [],
        testVectors: body.testVectors || [],
        migrationNotes: body.migrationNotes || [],
        companyTypes: body.companyTypes || [],
        registrationCodes: body.registrationCodes || [],
        groupCodes: body.groupCodes || [],
        specialCaseCodes: body.specialCaseCodes || []
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/automation/rule-packs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "automation_rule_pack",
      objectId: companyId,
      scopeCode: "automation_rule_pack"
    });
    writeJson(res, 200, {
      items: platform.listNoCodeRulePacks({
        domain: optionalText(url.searchParams.get("domain")),
        jurisdiction: optionalText(url.searchParams.get("jurisdiction"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/automation/posting-suggestions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    const decision = platform.suggestLedgerPosting({
      companyId,
      companyUserId: principal.companyUserId || null,
      sourceObjectType: body.sourceObjectType,
      sourceObjectId: body.sourceObjectId,
      candidatePostings: body.candidatePostings,
      evidence: body.evidence || {},
      rulePackId: body.rulePackId,
      effectiveDate: body.effectiveDate,
      actorId: body.actorId || principal.companyUserId || "session_user"
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "automation.decision.ready",
      resourceType: "automation_decision",
      resourceId: decision.decisionId,
      payload: decision
    });
    writeJson(res, 201, decision);
    return true;
  }

  if (req.method === "POST" && path === "/v1/automation/classifications") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    const decision = platform.classifyArtifact({
      companyId,
      companyUserId: principal.companyUserId || null,
      classifierType: body.classifierType,
      candidates: body.candidates,
      evidence: body.evidence || {},
      rulePackId: body.rulePackId,
      effectiveDate: body.effectiveDate,
      actorId: body.actorId || principal.companyUserId || "session_user"
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "automation.decision.ready",
      resourceType: "automation_decision",
      resourceId: decision.decisionId,
      payload: decision
    });
    writeJson(res, 201, decision);
    return true;
  }

  if (req.method === "POST" && path === "/v1/automation/anomalies") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    const decision = platform.detectAnomaly({
      companyId,
      companyUserId: principal.companyUserId || null,
      anomalyType: body.anomalyType,
      actualValue: body.actualValue,
      expectedValue: body.expectedValue,
      tolerancePercent: body.tolerancePercent,
      evidence: body.evidence || {},
      rulePackId: body.rulePackId,
      effectiveDate: body.effectiveDate,
      actorId: body.actorId || principal.companyUserId || "session_user"
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "automation.decision.ready",
      resourceType: "automation_decision",
      resourceId: decision.decisionId,
      payload: decision
    });
    writeJson(res, 201, decision);
    return true;
  }

  if (req.method === "GET" && path === "/v1/automation/decisions") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    writeJson(res, 200, {
      items: platform.listAutomationDecisions({
        companyId,
        decisionType: optionalText(url.searchParams.get("decisionType"))
      })
    });
    return true;
  }

  const automationDecisionMatch = matchPath(path, "/v1/automation/decisions/:decisionId");
  if (req.method === "GET" && automationDecisionMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "automation_decision",
      objectId: automationDecisionMatch.decisionId,
      scopeCode: "automation_decision"
    });
    writeJson(res, 200, platform.getAutomationDecision({ companyId, decisionId: automationDecisionMatch.decisionId }));
    return true;
  }

  const automationOverrideMatch = matchPath(path, "/v1/automation/decisions/:decisionId/override");
  if (req.method === "POST" && automationOverrideMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: automationOverrideMatch.decisionId,
      scopeCode: "automation_decision"
    });
    writeJson(
      res,
      200,
      platform.overrideAutomationDecision({
        companyId,
        decisionId: automationOverrideMatch.decisionId,
        actorId: body.actorId || "session_user",
        overrideReasonCode: body.overrideReasonCode,
        acceptedOutputs: body.acceptedOutputs
      })
    );
    return true;
  }

  return false;
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function presentPublicAnnualPackage(record) {
  return {
    packageId: record.packageId,
    accountingPeriodId: record.accountingPeriodId,
    fiscalYear: record.fiscalYear,
    profileCode: record.profileCode,
    status: record.status,
    legalFormCode: record.legalFormCode,
    declarationProfileCode: record.declarationProfileCode,
    packageFamilyCode: record.packageFamilyCode,
    currentVersionId: record.currentVersionId,
    currentEvidencePackId: record.currentEvidencePackId,
    versionCount: Array.isArray(record.versions) ? record.versions.length : 0,
    correctionOfPackageId: record.correctionOfPackageId || null,
    requiresAnnualReport: record.requiresAnnualReport === true,
    requiresBolagsverketFiling: record.requiresBolagsverketFiling === true,
    requiresTaxDeclarationPackage: record.requiresTaxDeclarationPackage !== false,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function presentPublicTaxAccountSummary(snapshot) {
  const latestReconciliation = Array.isArray(snapshot.reconciliations) && snapshot.reconciliations.length > 0
    ? snapshot.reconciliations[snapshot.reconciliations.length - 1]
    : null;
  return {
    ...snapshot.balance,
    importedBatchCount: Array.isArray(snapshot.importBatches) ? snapshot.importBatches.length : 0,
    eventCount: Array.isArray(snapshot.events) ? snapshot.events.length : 0,
    reconciliationItemCount: Array.isArray(snapshot.reconciliationItems) ? snapshot.reconciliationItems.length : 0,
    reconciliationRunCount: Array.isArray(snapshot.reconciliations) ? snapshot.reconciliations.length : 0,
    latestReconciliationRunId: latestReconciliation?.reconciliationRunId || null
  };
}

function presentPublicTaxAccountReconciliation(run) {
  return {
    reconciliationRunId: run.reconciliationRunId,
    createdAt: run.createdAt,
    createdByActorId: run.createdByActorId,
    summary: run.summary,
    reviewedEventCount: Array.isArray(run.eventIdsReviewed) ? run.eventIdsReviewed.length : 0,
    suggestedOffsetCount: Array.isArray(run.suggestedOffsets) ? run.suggestedOffsets.length : 0,
    discrepancyCaseCount: Array.isArray(run.discrepancyCaseIds) ? run.discrepancyCaseIds.length : 0
  };
}
