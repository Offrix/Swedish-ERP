import {
  authorizeCompanyAccess,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14TaxAccountRoutes({ req, res, url, path, platform, helpers }) {
  const { assertFinanceOperationsReadAccess } = helpers;

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

  return false;
}
