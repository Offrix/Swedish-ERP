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

export async function tryHandlePhase13PublicRoutes({ req, res, url, path, platform }) {
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
    writeJson(res, 200, {
      items: platform.listAuthoritySubmissions({
        companyId,
        submissionType: optionalText(url.searchParams.get("submissionType")),
        sourceObjectType: optionalText(url.searchParams.get("sourceObjectType")),
        sourceObjectId: optionalText(url.searchParams.get("sourceObjectId"))
      })
    });
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
