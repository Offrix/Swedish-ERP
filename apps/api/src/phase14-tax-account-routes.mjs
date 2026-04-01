import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14TaxAccountRoutes({ req, res, url, path, platform, helpers }) {
  const { assertFinanceOperationsReadAccess } = helpers;

  if (req.method === "GET" && path === "/v1/tax-account/liabilities") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account_reconciliation_item",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listExpectedTaxLiabilities({ companyId }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  const liabilityMatch = matchPath(path, "/v1/tax-account/liabilities/:reconciliationItemId");
  if (req.method === "GET" && liabilityMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account_reconciliation_item",
      objectId: liabilityMatch.reconciliationItemId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      item: platform.getExpectedTaxLiability({
        companyId,
        reconciliationItemId: liabilityMatch.reconciliationItemId
      }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/events") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxAccountEvents({
        companyId,
        eventTypeCode: optionalText(url.searchParams.get("eventTypeCode")),
        mappingStatus: optionalText(url.searchParams.get("mappingStatus")),
        reconciliationStatus: optionalText(url.searchParams.get("reconciliationStatus"))
      }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  const eventClassificationMatch = matchPath(path, "/v1/tax-account/events/:taxAccountEventId/classify");
  if (req.method === "POST" && eventClassificationMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account_event",
      objectId: eventClassificationMatch.taxAccountEventId,
      scopeCode: "tax_account"
    });
    const result = platform.classifyTaxAccountEvent({
      companyId,
      taxAccountEventId: eventClassificationMatch.taxAccountEventId,
      liabilityTypeCode: body.liabilityTypeCode,
      reconciliationItemId: body.reconciliationItemId,
      sourceObjectType: body.sourceObjectType,
      sourceObjectId: body.sourceObjectId,
      periodKey: body.periodKey,
      ledgerCounterAccountNumber: body.ledgerCounterAccountNumber,
      differenceCaseId: body.differenceCaseId,
      classificationCode: body.classificationCode,
      resolutionNote: body.resolutionNote,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_event",
      resourceId: eventClassificationMatch.taxAccountEventId,
      payload: result,
      mode: "production"
    });
    writeJson(res, 200, result);
    return true;
  }

  if (req.method === "POST" && path === "/v1/tax-account/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    const result = platform.importTaxAccountEvents({
      companyId,
      importSource: body.importSource,
      statementDate: body.statementDate,
      importBatchId: body.importBatchId,
      events: body.events,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_import_batch",
      resourceId: result.importBatch.importBatchId,
      payload: {
        importBatch: result.importBatch,
        importedCount: result.items.length,
        balance: platform.getTaxAccountBalance({ companyId })
      },
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/offset-suggestions") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account_offset",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxAccountOffsetSuggestions({
        companyId,
        reconciliationRunId: optionalText(url.searchParams.get("reconciliationRunId"))
      }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/reconciliations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxAccountReconciliations({ companyId }),
      openDifferenceCases: platform.listOpenTaxAccountDifferenceCases({ companyId }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/tax-account/reconciliations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    const result = platform.createTaxAccountReconciliation({
      companyId,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_reconciliation_run",
      resourceId: result.reconciliationRunId,
      payload: result,
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/offsets") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account_offset",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxAccountOffsets({ companyId }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/tax-account/offsets") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    const result = platform.approveTaxAccountOffset({
      companyId,
      taxAccountEventId: body.taxAccountEventId,
      reconciliationItemId: body.reconciliationItemId,
      offsetAmount: body.offsetAmount,
      offsetReasonCode: body.offsetReasonCode,
      reconciliationRunId: body.reconciliationRunId,
      approvalNote: body.approvalNote,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_offset",
      resourceId: result.taxAccountOffsetId,
      payload: {
        offset: result,
        balance: platform.getTaxAccountBalance({ companyId })
      },
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/discrepancy-cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account_difference_case",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxAccountDifferenceCases({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  const discrepancyCaseMatch = matchPath(path, "/v1/tax-account/discrepancy-cases/:discrepancyCaseId");
  if (req.method === "GET" && discrepancyCaseMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account_difference_case",
      objectId: discrepancyCaseMatch.discrepancyCaseId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      item: platform.getTaxAccountDifferenceCase({
        companyId,
        discrepancyCaseId: discrepancyCaseMatch.discrepancyCaseId
      }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  const discrepancyCaseReviewMatch = matchPath(path, "/v1/tax-account/discrepancy-cases/:discrepancyCaseId/review");
  if (req.method === "POST" && discrepancyCaseReviewMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account_difference_case",
      objectId: discrepancyCaseReviewMatch.discrepancyCaseId,
      scopeCode: "tax_account"
    });
    const result = platform.reviewTaxAccountDifferenceCase({
      companyId,
      discrepancyCaseId: discrepancyCaseReviewMatch.discrepancyCaseId,
      reviewNote: body.reviewNote,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_difference_case",
      resourceId: discrepancyCaseReviewMatch.discrepancyCaseId,
      payload: {
        discrepancyCase: result,
        balance: platform.getTaxAccountBalance({ companyId })
      },
      mode: "production"
    });
    writeJson(res, 200, result);
    return true;
  }

  const discrepancyCaseResolveMatch = matchPath(path, "/v1/tax-account/discrepancy-cases/:discrepancyCaseId/resolve");
  if (req.method === "POST" && discrepancyCaseResolveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account_difference_case",
      objectId: discrepancyCaseResolveMatch.discrepancyCaseId,
      scopeCode: "tax_account"
    });
    const result = platform.resolveTaxAccountDifferenceCase({
      companyId,
      discrepancyCaseId: discrepancyCaseResolveMatch.discrepancyCaseId,
      resolutionNote: body.resolutionNote,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_difference_case",
      resourceId: discrepancyCaseResolveMatch.discrepancyCaseId,
      payload: {
        discrepancyCase: result,
        balance: platform.getTaxAccountBalance({ companyId })
      },
      mode: "production"
    });
    writeJson(res, 200, result);
    return true;
  }

  const discrepancyCaseWaiveMatch = matchPath(path, "/v1/tax-account/discrepancy-cases/:discrepancyCaseId/waive");
  if (req.method === "POST" && discrepancyCaseWaiveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account_difference_case",
      objectId: discrepancyCaseWaiveMatch.discrepancyCaseId,
      scopeCode: "tax_account"
    });
    const result = platform.waiveTaxAccountDifferenceCase({
      companyId,
      discrepancyCaseId: discrepancyCaseWaiveMatch.discrepancyCaseId,
      waiverReasonCode: body.waiverReasonCode,
      resolutionNote: body.resolutionNote,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_difference_case",
      resourceId: discrepancyCaseWaiveMatch.discrepancyCaseId,
      payload: {
        discrepancyCase: result,
        balance: platform.getTaxAccountBalance({ companyId })
      },
      mode: "production"
    });
    writeJson(res, 200, result);
    return true;
  }

  return false;
}
