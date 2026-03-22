import crypto from "node:crypto";
import http from "node:http";
import { defaultApiPlatform } from "./platform.mjs";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";

export function createApiServer({ platform = defaultApiPlatform, flags = readFeatureFlags(process.env) } = {}) {
  return http.createServer((req, res) => {
    handleRequest({ req, res, platform, flags }).catch((error) => {
      writeError(res, error);
    });
  });
}

export async function startApiServer({
  port = Number(process.env.PORT || 3000),
  logger = console.log,
  platform = defaultApiPlatform,
  flags = readFeatureFlags(process.env)
} = {}) {
  const server = createApiServer({ platform, flags });
  await new Promise((resolve) => {
    server.listen(port, resolve);
  });
  logger(`api listening on http://localhost:${port}`);
  return {
    port,
    server,
    stop: () => stopServer(server)
  };
}

async function handleRequest({ req, res, platform, flags }) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  if (path === "/" || path === "/healthz" || path === "/readyz") {
    writeJson(
      res,
      200,
      path === "/"
        ? {
            service: "api",
            status: "ok",
            phase1AuthOnboardingEnabled: flags.phase1AuthOnboardingEnabled,
            phase2DocumentArchiveEnabled: flags.phase2DocumentArchiveEnabled,
            phase2CompanyInboxEnabled: flags.phase2CompanyInboxEnabled,
            phase2OcrReviewEnabled: flags.phase2OcrReviewEnabled,
            phase3LedgerEnabled: flags.phase3LedgerEnabled,
            phase4VatEnabled: flags.phase4VatEnabled,
            phase5ArEnabled: flags.phase5ArEnabled,
            phase6ApEnabled: flags.phase6ApEnabled,
            routes: [
              "/healthz",
              "/readyz",
              "/v1/auth/login",
              "/v1/onboarding/runs",
              "/v1/documents",
              "/v1/documents/:documentId/export",
              "/v1/inbox/channels",
              "/v1/inbox/messages",
              "/v1/documents/:documentId/ocr/runs",
              "/v1/review-tasks/:reviewTaskId",
              "/v1/ledger/chart/install",
              "/v1/ledger/accounts",
              "/v1/ledger/accounting-periods",
              "/v1/ledger/dimensions",
              "/v1/ledger/voucher-series",
              "/v1/ledger/journal-entries",
              "/v1/ledger/journal-entries/:journalEntryId",
              "/v1/ledger/journal-entries/:journalEntryId/reverse",
              "/v1/ledger/journal-entries/:journalEntryId/correct",
              "/v1/reporting/report-definitions",
              "/v1/reporting/report-snapshots",
              "/v1/reporting/report-snapshots/:reportSnapshotId",
              "/v1/reporting/report-snapshots/:reportSnapshotId/drilldown",
              "/v1/reporting/journal-search",
              "/v1/reporting/reconciliations",
              "/v1/reporting/reconciliations/:reconciliationRunId",
              "/v1/reporting/reconciliations/:reconciliationRunId/signoff",
              "/v1/vat/codes",
              "/v1/vat/rule-packs",
              "/v1/vat/decisions",
              "/v1/vat/decisions/:vatDecisionId",
              "/v1/vat/review-queue",
              "/v1/vat/declaration-runs",
              "/v1/vat/declaration-runs/:vatDeclarationRunId",
              "/v1/vat/periodic-statements",
              "/v1/vat/periodic-statements/:vatPeriodicStatementRunId",
              "/v1/ar/customers",
              "/v1/ar/customers/:customerId",
              "/v1/ar/customers/:customerId/contacts",
              "/v1/ar/customers/imports",
              "/v1/ar/customers/imports/:customerImportBatchId",
              "/v1/ar/items",
              "/v1/ar/items/:itemId",
              "/v1/ar/price-lists",
              "/v1/ar/price-lists/:priceListId",
              "/v1/ar/quotes",
              "/v1/ar/quotes/:quoteId",
              "/v1/ar/quotes/:quoteId/status",
              "/v1/ar/quotes/:quoteId/revise",
              "/v1/ar/contracts",
              "/v1/ar/contracts/:contractId",
              "/v1/ar/contracts/:contractId/status",
              "/v1/ar/invoices",
              "/v1/ar/invoices/:customerInvoiceId",
              "/v1/ar/invoices/:customerInvoiceId/issue",
              "/v1/ar/invoices/:customerInvoiceId/deliver",
              "/v1/ar/invoices/:customerInvoiceId/payment-links",
              "/v1/ar/open-items",
              "/v1/ar/open-items/:arOpenItemId",
              "/v1/ar/open-items/:arOpenItemId/collection-state",
              "/v1/ar/open-items/:arOpenItemId/allocations",
              "/v1/ar/open-items/:arOpenItemId/writeoffs",
              "/v1/ar/allocations/:arAllocationId/reverse",
              "/v1/ar/payment-matching-runs",
              "/v1/ar/payment-matching-runs/:arPaymentMatchingRunId",
              "/v1/ar/dunning-runs",
              "/v1/ar/dunning-runs/:arDunningRunId",
              "/v1/ar/aging-snapshots",
              "/v1/ap/suppliers",
              "/v1/ap/suppliers/:supplierId",
              "/v1/ap/suppliers/:supplierId/status",
              "/v1/ap/suppliers/imports",
              "/v1/ap/suppliers/imports/:supplierImportBatchId",
              "/v1/ap/purchase-orders",
              "/v1/ap/purchase-orders/:purchaseOrderId",
              "/v1/ap/purchase-orders/:purchaseOrderId/status",
              "/v1/ap/purchase-orders/imports",
              "/v1/ap/purchase-orders/imports/:purchaseOrderImportBatchId",
              "/v1/ap/receipts",
              "/v1/ap/receipts/:apReceiptId",
              "/v1/ap/invoices",
              "/v1/ap/invoices/ingest",
              "/v1/ap/invoices/:supplierInvoiceId",
              "/v1/ap/invoices/:supplierInvoiceId/match",
              "/v1/ap/invoices/:supplierInvoiceId/post"
            ]
          }
        : { status: "ok" }
    );
    return;
  }

  if (!flags.phase1AuthOnboardingEnabled && isPhase1Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 1 auth and onboarding routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase2DocumentArchiveEnabled && isPhase2Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.1 document archive routes are disabled by configuration."
    });
    return;
  }

  if ((!flags.phase2DocumentArchiveEnabled || !flags.phase2CompanyInboxEnabled) && isPhase2InboxRoute(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.2 company inbox routes are disabled by configuration."
    });
    return;
  }

  if ((!flags.phase2DocumentArchiveEnabled || !flags.phase2OcrReviewEnabled) && isPhase23Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.3 OCR and review routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase3LedgerEnabled && isPhase3Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 3 ledger and reporting routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase4VatEnabled && isPhase4Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 4 VAT routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase5ArEnabled && isPhase5Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 5 AR routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase6ApEnabled && isPhase6Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 6 AP routes are disabled by configuration."
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/login") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startLogin(body));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/logout") {
    writeJson(res, 200, {
      session: platform.logout({ sessionToken: readSessionToken(req, await readJsonBody(req, true)) })
    });
    return;
  }

  const revokeMatch = matchPath(path, "/v1/auth/sessions/:sessionId/revoke");
  if (req.method === "POST" && revokeMatch) {
    writeJson(res, 200, {
      session: platform.revokeSession({
        sessionToken: readSessionToken(req, await readJsonBody(req, true)),
        targetSessionId: revokeMatch.sessionId
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/totp/enroll") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.beginTotpEnrollment({ sessionToken: readSessionToken(req, body), label: body.label }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/totp/verify") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.verifyTotp({
        sessionToken: readSessionToken(req, body),
        code: body.code,
        factorId: body.factorId || null
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/register-options") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.beginPasskeyRegistration({ sessionToken: readSessionToken(req, body), deviceName: body.deviceName }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/register-verify") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.finishPasskeyRegistration({
        sessionToken: readSessionToken(req, body),
        challengeId: body.challengeId,
        credentialId: body.credentialId,
        publicKey: body.publicKey,
        deviceName: body.deviceName
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/assert") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.assertPasskey({
        sessionToken: readSessionToken(req, body),
        credentialId: body.credentialId,
        assertion: body.assertion
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/start") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startBankIdAuthentication({ sessionToken: readSessionToken(req, body) }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/collect") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.collectBankIdAuthentication({
        sessionToken: readSessionToken(req, body),
        orderRef: body.orderRef,
        completionToken: body.completionToken
      })
    );
    return;
  }

  const usersMatch = matchPath(path, "/v1/org/companies/:companyId/users");
  if (usersMatch && req.method === "GET") {
    writeJson(res, 200, {
      items: platform.listCompanyUsers({
        sessionToken: readSessionToken(req),
        companyId: usersMatch.companyId
      })
    });
    return;
  }

  if (usersMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createCompanyUser({
        sessionToken: readSessionToken(req, body),
        companyId: usersMatch.companyId,
        email: body.email,
        displayName: body.displayName,
        roleCode: body.roleCode,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        requiresMfa: body.requiresMfa
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/delegations") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createDelegation({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/object-grants") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createObjectGrant({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/attest-chains") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createApprovalChain({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  const approvalChainMatch = matchPath(path, "/v1/org/attest-chains/:approvalChainId");
  if (approvalChainMatch && req.method === "GET") {
    writeJson(res, 200, platform.getApprovalChain({ approvalChainId: approvalChainMatch.approvalChainId }));
    return;
  }

  if (req.method === "POST" && path === "/v1/authz/check") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.checkAuthorization({
        sessionToken: readSessionToken(req, body),
        action: body.action,
        resource: body.resource
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/onboarding/runs") {
    const body = await readJsonBody(req);
    writeJson(res, 201, platform.createOnboardingRun(body));
    return;
  }

  const onboardingRunMatch = matchPath(path, "/v1/onboarding/runs/:runId");
  if (onboardingRunMatch && req.method === "GET") {
    writeJson(
      res,
      200,
      platform.getOnboardingRun({
        runId: onboardingRunMatch.runId,
        resumeToken: url.searchParams.get("resumeToken") || req.headers["x-resume-token"]
      })
    );
    return;
  }

  const onboardingChecklistMatch = matchPath(path, "/v1/onboarding/runs/:runId/checklist");
  if (onboardingChecklistMatch && req.method === "GET") {
    writeJson(
      res,
      200,
      platform.getOnboardingChecklist({
        runId: onboardingChecklistMatch.runId,
        resumeToken: url.searchParams.get("resumeToken") || req.headers["x-resume-token"]
      })
    );
    return;
  }

  const stepMatchers = {
    company_profile: matchPath(path, "/v1/onboarding/runs/:runId/steps/company"),
    registrations: matchPath(path, "/v1/onboarding/runs/:runId/steps/registrations"),
    chart_template: matchPath(path, "/v1/onboarding/runs/:runId/steps/chart"),
    vat_setup: matchPath(path, "/v1/onboarding/runs/:runId/steps/vat"),
    fiscal_periods: matchPath(path, "/v1/onboarding/runs/:runId/steps/periods")
  };

  if (req.method === "POST") {
    for (const [stepCode, match] of Object.entries(stepMatchers)) {
      if (!match) {
        continue;
      }
      const body = await readJsonBody(req);
      writeJson(
        res,
        200,
        platform.updateOnboardingStep({
          runId: match.runId,
          resumeToken: body.resumeToken || req.headers["x-resume-token"],
          stepCode,
          payload: body
        })
      );
      return;
    }
  }

  if (req.method === "POST" && path === "/v1/documents") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.createDocumentRecord({
        companyId,
        documentType: body.documentType || null,
        sourceChannel: body.sourceChannel || "manual",
        sourceReference: body.sourceReference || null,
        retentionPolicyCode: body.retentionPolicyCode || null,
        metadataJson: body.metadataJson || {},
        receivedAt: body.receivedAt || new Date().toISOString(),
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentVersionsMatch = matchPath(path, "/v1/documents/:documentId/versions");
  if (documentVersionsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.appendDocumentVersion({
        companyId,
        documentId: documentVersionsMatch.documentId,
        variantType: body.variantType,
        storageKey: body.storageKey,
        mimeType: body.mimeType,
        contentText: body.contentText || null,
        contentBase64: body.contentBase64 || null,
        fileHash: body.fileHash || null,
        fileSizeBytes: body.fileSizeBytes ?? null,
        sourceReference: body.sourceReference || null,
        derivesFromDocumentVersionId: body.derivesFromDocumentVersionId || null,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentLinksMatch = matchPath(path, "/v1/documents/:documentId/links");
  if (documentLinksMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.linkDocumentRecord({
        companyId,
        documentId: documentLinksMatch.documentId,
        targetType: body.targetType,
        targetId: body.targetId,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentExportMatch = matchPath(path, "/v1/documents/:documentId/export");
  if (documentExportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.exportDocumentChain({
        companyId,
        documentId: documentExportMatch.documentId,
        actorId: principal.userId,
        correlationId: createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/inbox/channels") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.registerInboxChannel({
        companyId,
        channelCode: body.channelCode,
        inboundAddress: body.inboundAddress,
        useCase: body.useCase,
        allowedMimeTypes: body.allowedMimeTypes,
        maxAttachmentSizeBytes: body.maxAttachmentSizeBytes,
        defaultDocumentType: body.defaultDocumentType || null,
        classificationConfidenceThreshold: body.classificationConfidenceThreshold ?? null,
        fieldConfidenceThreshold: body.fieldConfidenceThreshold ?? null,
        defaultReviewQueueCode: body.defaultReviewQueueCode || "classification_low_confidence",
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/inbox/messages") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    const result = platform.ingestEmailMessage({
      companyId,
      recipientAddress: body.recipientAddress,
      messageId: body.messageId,
      rawStorageKey: body.rawStorageKey,
      senderAddress: body.senderAddress || null,
      subject: body.subject || null,
      payloadJson: body.payloadJson || {},
      receivedAt: body.receivedAt || new Date().toISOString(),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    });
    writeJson(res, result.duplicateDetected ? 200 : 201, result);
    return;
  }

  const emailIngestMessageMatch = matchPath(path, "/v1/inbox/messages/:emailIngestMessageId");
  if (emailIngestMessageMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.getEmailIngestMessage({
        companyId,
        emailIngestMessageId: emailIngestMessageMatch.emailIngestMessageId
      })
    );
    return;
  }

  const documentOcrRunsMatch = matchPath(path, "/v1/documents/:documentId/ocr/runs");
  if (documentOcrRunsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.runDocumentOcr({
        companyId,
        documentId: documentOcrRunsMatch.documentId,
        reasonCode: body.reasonCode || "initial_ingest",
        modelVersion: body.modelVersion || "textract-stub-2026-03-21",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (documentOcrRunsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.getDocumentOcrRuns({
        companyId,
        documentId: documentOcrRunsMatch.documentId
      })
    );
    return;
  }

  const reviewTaskMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId");
  if (reviewTaskMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.getReviewTask({
        companyId,
        reviewTaskId: reviewTaskMatch.reviewTaskId
      })
    );
    return;
  }

  const reviewTaskClaimMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId/claim");
  if (reviewTaskClaimMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      200,
      platform.claimReviewTask({
        companyId,
        reviewTaskId: reviewTaskClaimMatch.reviewTaskId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const reviewTaskCorrectMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId/correct");
  if (reviewTaskCorrectMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      200,
      platform.correctReviewTask({
        companyId,
        reviewTaskId: reviewTaskCorrectMatch.reviewTaskId,
        correctedDocumentType: body.correctedDocumentType,
        correctedFieldsJson: body.correctedFieldsJson || {},
        correctionComment: body.correctionComment || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const reviewTaskApproveMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId/approve");
  if (reviewTaskApproveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      200,
      platform.approveReviewTask({
        companyId,
        reviewTaskId: reviewTaskApproveMatch.reviewTaskId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ledger/chart/install") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      201,
      platform.installLedgerCatalog({
        companyId,
        chartTemplateId: body.chartTemplateId || undefined,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/accounts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, {
      items: platform.listLedgerAccounts({ companyId })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/accounting-periods") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, {
      items: platform.listAccountingPeriods({ companyId })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/dimensions") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, platform.listLedgerDimensions({ companyId }));
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/voucher-series") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, {
      items: platform.listVoucherSeries({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ledger/journal-entries") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      201,
      platform.createJournalEntry({
        companyId,
        journalDate: body.journalDate,
        voucherSeriesCode: body.voucherSeriesCode,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        description: body.description || null,
        actorId: principal.userId,
        idempotencyKey: body.idempotencyKey,
        lines: body.lines,
        importedFlag: body.importedFlag === true,
        currencyCode: body.currencyCode || "SEK",
        metadataJson: body.metadataJson || {},
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const accountingPeriodLockMatch = matchPath(path, "/v1/ledger/accounting-periods/:accountingPeriodId/lock");
  if (accountingPeriodLockMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.lockAccountingPeriod({
        companyId,
        accountingPeriodId: accountingPeriodLockMatch.accountingPeriodId,
        status: body.status || "soft_locked",
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        approvedByActorId: body.approvedByActorId || null,
        approvedByRoleCode: body.approvedByRoleCode || null,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const accountingPeriodReopenMatch = matchPath(path, "/v1/ledger/accounting-periods/:accountingPeriodId/reopen");
  if (accountingPeriodReopenMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.reopenAccountingPeriod({
        companyId,
        accountingPeriodId: accountingPeriodReopenMatch.accountingPeriodId,
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        approvedByActorId: body.approvedByActorId,
        approvedByRoleCode: body.approvedByRoleCode || null,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId");
  if (journalEntryMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.getJournalEntry({
        companyId,
        journalEntryId: journalEntryMatch.journalEntryId
      })
    );
    return;
  }

  const journalEntryReverseMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/reverse");
  if (journalEntryReverseMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.reverseJournalEntry({
        companyId,
        journalEntryId: journalEntryReverseMatch.journalEntryId,
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        correctionKey: body.correctionKey,
        journalDate: body.journalDate || null,
        voucherSeriesCode: body.voucherSeriesCode || "V",
        metadataJson: body.metadataJson || {},
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryCorrectMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/correct");
  if (journalEntryCorrectMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.correctJournalEntry({
        companyId,
        journalEntryId: journalEntryCorrectMatch.journalEntryId,
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        correctionKey: body.correctionKey,
        lines: body.lines,
        journalDate: body.journalDate || null,
        voucherSeriesCode: body.voucherSeriesCode || "A",
        reverseOriginal: body.reverseOriginal === true,
        metadataJson: body.metadataJson || {},
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryValidateMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/validate");
  if (journalEntryValidateMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.validateJournalEntry({
        companyId,
        journalEntryId: journalEntryValidateMatch.journalEntryId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryPostMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/post");
  if (journalEntryPostMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.postJournalEntry({
        companyId,
        journalEntryId: journalEntryPostMatch.journalEntryId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/report-definitions") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(res, 200, {
      items: platform.listReportDefinitions({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/reporting/report-snapshots") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      201,
      platform.runReportSnapshot({
        companyId,
        reportCode: body.reportCode,
        accountingPeriodId: body.accountingPeriodId || null,
        viewMode: body.viewMode || null,
        fromDate: body.fromDate || null,
        toDate: body.toDate || null,
        asOfDate: body.asOfDate || null,
        filters: body.filters || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const reportSnapshotMatch = matchPath(path, "/v1/reporting/report-snapshots/:reportSnapshotId");
  if (reportSnapshotMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.getReportSnapshot({
        companyId,
        reportSnapshotId: reportSnapshotMatch.reportSnapshotId
      })
    );
    return;
  }

  const reportDrilldownMatch = matchPath(path, "/v1/reporting/report-snapshots/:reportSnapshotId/drilldown");
  if (reportDrilldownMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.getReportLineDrilldown({
        companyId,
        reportSnapshotId: reportDrilldownMatch.reportSnapshotId,
        lineKey: requireText(url.searchParams.get("lineKey"), "line_key_required", "lineKey query parameter is required.")
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/journal-search") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    const dimensionFilters = {};
    for (const key of ["projectId", "costCenterCode", "businessAreaCode"]) {
      const value = url.searchParams.get(key);
      if (value) {
        dimensionFilters[key] = value;
      }
    }
    writeJson(
      res,
      200,
      platform.searchJournalEntries({
        companyId,
        reportSnapshotId: url.searchParams.get("reportSnapshotId") || null,
        query: url.searchParams.get("query") || null,
        accountNumber: url.searchParams.get("accountNumber") || null,
        sourceType: url.searchParams.get("sourceType") || null,
        sourceId: url.searchParams.get("sourceId") || null,
        status: url.searchParams.get("status") || null,
        voucherSeriesCode: url.searchParams.get("voucherSeriesCode") || null,
        journalDateFrom: url.searchParams.get("journalDateFrom") || null,
        journalDateTo: url.searchParams.get("journalDateTo") || null,
        dimensionFilters
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/reporting/reconciliations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      201,
      platform.createReconciliationRun({
        companyId,
        accountingPeriodId: body.accountingPeriodId,
        areaCode: body.areaCode,
        cutoffDate: body.cutoffDate || null,
        ledgerAccountNumbers: Array.isArray(body.ledgerAccountNumbers) ? body.ledgerAccountNumbers : [],
        subledgerBalanceAmount: body.subledgerBalanceAmount ?? null,
        materialityThresholdAmount: body.materialityThresholdAmount ?? 0,
        differenceItems: Array.isArray(body.differenceItems) ? body.differenceItems : [],
        ownerUserId: body.ownerUserId || null,
        signoffRequired: body.signoffRequired !== false,
        checklistSnapshotRef: body.checklistSnapshotRef || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/reconciliations") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(res, 200, {
      items: platform.listReconciliationRuns({
        companyId,
        accountingPeriodId: url.searchParams.get("accountingPeriodId") || null,
        areaCode: url.searchParams.get("areaCode") || null
      })
    });
    return;
  }

  const reconciliationMatch = matchPath(path, "/v1/reporting/reconciliations/:reconciliationRunId");
  if (reconciliationMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.getReconciliationRun({
        companyId,
        reconciliationRunId: reconciliationMatch.reconciliationRunId
      })
    );
    return;
  }

  const reconciliationSignoffMatch = matchPath(path, "/v1/reporting/reconciliations/:reconciliationRunId/signoff");
  if (reconciliationSignoffMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.signOffReconciliationRun({
        companyId,
        reconciliationRunId: reconciliationSignoffMatch.reconciliationRunId,
        actorId: principal.userId,
        signatoryRole: body.signatoryRole || "close_signatory",
        comment: body.comment || null,
        evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs : [],
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/vat/codes") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(res, 200, {
      items: platform.listVatCodes({
        companyId
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/vat/rule-packs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(res, 200, {
      items: platform.listVatRulePacks({
        effectiveDate: url.searchParams.get("effectiveDate") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/vat/decisions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      201,
      platform.evaluateVatDecision({
        companyId,
        transactionLine: body.transactionLine || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const vatDecisionMatch = matchPath(path, "/v1/vat/decisions/:vatDecisionId");
  if (vatDecisionMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      200,
      platform.getVatDecision({
        companyId,
        vatDecisionId: vatDecisionMatch.vatDecisionId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/vat/review-queue") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(res, 200, {
      items: platform.listVatReviewQueue({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/vat/declaration-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      201,
      platform.createVatDeclarationRun({
        companyId,
        fromDate: body.fromDate,
        toDate: body.toDate,
        previousSubmissionId: body.previousSubmissionId || null,
        correctionReason: body.correctionReason || null,
        signer: body.signer || principal.userId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const vatDeclarationRunMatch = matchPath(path, "/v1/vat/declaration-runs/:vatDeclarationRunId");
  if (vatDeclarationRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      200,
      platform.getVatDeclarationRun({
        companyId,
        vatDeclarationRunId: vatDeclarationRunMatch.vatDeclarationRunId
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/vat/periodic-statements") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      201,
      platform.createVatPeriodicStatementRun({
        companyId,
        fromDate: body.fromDate,
        toDate: body.toDate,
        previousSubmissionId: body.previousSubmissionId || null,
        correctionReason: body.correctionReason || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const vatPeriodicStatementRunMatch = matchPath(path, "/v1/vat/periodic-statements/:vatPeriodicStatementRunId");
  if (vatPeriodicStatementRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      200,
      platform.getVatPeriodicStatementRun({
        companyId,
        vatPeriodicStatementRunId: vatPeriodicStatementRunMatch.vatPeriodicStatementRunId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/customers") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listCustomers({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/customers") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createCustomer({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arCustomerMatch = matchPath(path, "/v1/ar/customers/:customerId");
  if (arCustomerMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getCustomer({
        companyId,
        customerId: arCustomerMatch.customerId
      })
    );
    return;
  }

  const arCustomerContactsMatch = matchPath(path, "/v1/ar/customers/:customerId/contacts");
  if (arCustomerContactsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listCustomerContacts({
        companyId,
        customerId: arCustomerContactsMatch.customerId
      })
    });
    return;
  }

  if (arCustomerContactsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createCustomerContact({
        ...body,
        companyId,
        customerId: arCustomerContactsMatch.customerId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/customers/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_customer_import",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.importCustomers({
        companyId,
        batchKey: body.batchKey,
        rows: Array.isArray(body.rows) ? body.rows : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arCustomerImportBatchMatch = matchPath(path, "/v1/ar/customers/imports/:customerImportBatchId");
  if (arCustomerImportBatchMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer_import",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getCustomerImportBatch({
        companyId,
        customerImportBatchId: arCustomerImportBatchMatch.customerImportBatchId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/items") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_item",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listItems({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/items") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createItem({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arItemMatch = matchPath(path, "/v1/ar/items/:itemId");
  if (arItemMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getItem({
        companyId,
        itemId: arItemMatch.itemId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/price-lists") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_price_list",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listPriceLists({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/price-lists") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_price_list",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createPriceList({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arPriceListMatch = matchPath(path, "/v1/ar/price-lists/:priceListId");
  if (arPriceListMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_price_list",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getPriceList({
        companyId,
        priceListId: arPriceListMatch.priceListId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/quotes") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listQuotes({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/quotes") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createQuote({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arQuoteMatch = matchPath(path, "/v1/ar/quotes/:quoteId");
  if (arQuoteMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getQuote({
        companyId,
        quoteId: arQuoteMatch.quoteId
      })
    );
    return;
  }

  const arQuoteStatusMatch = matchPath(path, "/v1/ar/quotes/:quoteId/status");
  if (arQuoteStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.transitionQuote({
        companyId,
        quoteId: arQuoteStatusMatch.quoteId,
        targetStatus: body.targetStatus,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arQuoteReviseMatch = matchPath(path, "/v1/ar/quotes/:quoteId/revise");
  if (arQuoteReviseMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.reviseQuote({
        ...body,
        companyId,
        quoteId: arQuoteReviseMatch.quoteId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/contracts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listContracts({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/contracts") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createContract({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arContractMatch = matchPath(path, "/v1/ar/contracts/:contractId");
  if (arContractMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getContract({
        companyId,
        contractId: arContractMatch.contractId
      })
    );
    return;
  }

  const arContractStatusMatch = matchPath(path, "/v1/ar/contracts/:contractId/status");
  if (arContractStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.transitionContractStatus({
        companyId,
        contractId: arContractStatusMatch.contractId,
        targetStatus: body.targetStatus,
        resolvedEndDate: body.resolvedEndDate || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/invoices") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listInvoices({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/invoices") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createInvoice({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arInvoiceMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId");
  if (arInvoiceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getInvoice({
        companyId,
        customerInvoiceId: arInvoiceMatch.customerInvoiceId
      })
    );
    return;
  }

  const arInvoiceIssueMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId/issue");
  if (arInvoiceIssueMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.issueInvoice({
        companyId,
        customerInvoiceId: arInvoiceIssueMatch.customerInvoiceId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arInvoiceDeliverMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId/deliver");
  if (arInvoiceDeliverMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.deliverInvoice({
        companyId,
        customerInvoiceId: arInvoiceDeliverMatch.customerInvoiceId,
        deliveryChannel: body.deliveryChannel || null,
        recipientEmails: Array.isArray(body.recipientEmails) ? body.recipientEmails : null,
        buyerReference: body.buyerReference || null,
        purchaseOrderReference: body.purchaseOrderReference || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arInvoicePaymentLinksMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId/payment-links");
  if (arInvoicePaymentLinksMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createInvoicePaymentLink({
        companyId,
        customerInvoiceId: arInvoicePaymentLinksMatch.customerInvoiceId,
        amount: body.amount ?? null,
        expiresAt: body.expiresAt || null,
        providerCode: body.providerCode || "internal_mock",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/open-items") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listOpenItems({
        companyId,
        customerId: url.searchParams.get("customerId") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  const arOpenItemMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId");
  if (arOpenItemMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getOpenItem({
        companyId,
        arOpenItemId: arOpenItemMatch.arOpenItemId
      })
    );
    return;
  }

  const arOpenItemCollectionMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId/collection-state");
  if (arOpenItemCollectionMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.updateOpenItemCollectionState({
        companyId,
        arOpenItemId: arOpenItemCollectionMatch.arOpenItemId,
        collectionStageCode: body.collectionStageCode || null,
        disputeFlag: body.disputeFlag,
        dunningHoldFlag: body.dunningHoldFlag,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arOpenItemAllocationMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId/allocations");
  if (arOpenItemAllocationMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createOpenItemAllocation({
        companyId,
        arOpenItemId: arOpenItemAllocationMatch.arOpenItemId,
        allocationAmount: body.allocationAmount,
        allocatedOn: body.allocatedOn || null,
        allocationType: body.allocationType || "payment",
        sourceChannel: body.sourceChannel || "manual",
        bankTransactionUid: body.bankTransactionUid || null,
        statementLineHash: body.statementLineHash || null,
        externalEventRef: body.externalEventRef || null,
        arPaymentMatchingRunId: body.arPaymentMatchingRunId || null,
        unmatchedBankReceiptId: body.unmatchedBankReceiptId || null,
        receiptAmount: body.receiptAmount ?? null,
        currencyCode: body.currencyCode || null,
        reasonCode: body.reasonCode || "manual_allocation",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arOpenItemWriteoffMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId/writeoffs");
  if (arOpenItemWriteoffMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createWriteoff({
        companyId,
        arOpenItemId: arOpenItemWriteoffMatch.arOpenItemId,
        writeoffAmount: body.writeoffAmount,
        writeoffDate: body.writeoffDate,
        reasonCode: body.reasonCode,
        policyLimitAmount: body.policyLimitAmount ?? undefined,
        approvedByActorId: body.approvedByActorId || null,
        ledgerAccountNumber: body.ledgerAccountNumber ?? undefined,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arAllocationReverseMatch = matchPath(path, "/v1/ar/allocations/:arAllocationId/reverse");
  if (arAllocationReverseMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_allocation",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.reverseOpenItemAllocation({
        companyId,
        arAllocationId: arAllocationReverseMatch.arAllocationId,
        reversedOn: body.reversedOn || null,
        reasonCode: body.reasonCode,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/payment-matching-runs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_payment_matching_run",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listPaymentMatchingRuns({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/payment-matching-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_payment_matching_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createPaymentMatchingRun({
        companyId,
        sourceChannel: body.sourceChannel,
        externalBatchRef: body.externalBatchRef || null,
        idempotencyKey: body.idempotencyKey || null,
        transactions: Array.isArray(body.transactions) ? body.transactions : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arPaymentMatchingRunMatch = matchPath(path, "/v1/ar/payment-matching-runs/:arPaymentMatchingRunId");
  if (arPaymentMatchingRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_payment_matching_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getPaymentMatchingRun({
        companyId,
        arPaymentMatchingRunId: arPaymentMatchingRunMatch.arPaymentMatchingRunId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/dunning-runs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_dunning_run",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listDunningRuns({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/dunning-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_dunning_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createDunningRun({
        companyId,
        runDate: body.runDate,
        stageCode: body.stageCode,
        annualInterestRatePercent: body.annualInterestRatePercent ?? undefined,
        reminderFeeAmount: body.reminderFeeAmount ?? undefined,
        idempotencyKey: body.idempotencyKey || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arDunningRunMatch = matchPath(path, "/v1/ar/dunning-runs/:arDunningRunId");
  if (arDunningRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_dunning_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getDunningRun({
        companyId,
        arDunningRunId: arDunningRunMatch.arDunningRunId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/aging-snapshots") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_aging_snapshot",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listAgingSnapshots({
        companyId,
        cutoffDate: url.searchParams.get("cutoffDate") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/aging-snapshots") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_aging_snapshot",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.captureAgingSnapshot({
        companyId,
        cutoffDate: body.cutoffDate,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/suppliers") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(res, 200, {
      items: platform.listSuppliers({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/suppliers") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.createSupplier({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apSupplierMatch = matchPath(path, "/v1/ap/suppliers/:supplierId");
  if (apSupplierMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getSupplier({
        companyId,
        supplierId: apSupplierMatch.supplierId
      })
    );
    return;
  }

  const apSupplierStatusMatch = matchPath(path, "/v1/ap/suppliers/:supplierId/status");
  if (apSupplierStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.transitionSupplierStatus({
        companyId,
        supplierId: apSupplierStatusMatch.supplierId,
        targetStatus: body.targetStatus,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/suppliers/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.importSuppliers({
        companyId,
        batchKey: body.batchKey,
        suppliers: Array.isArray(body.suppliers) ? body.suppliers : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apSupplierImportMatch = matchPath(path, "/v1/ap/suppliers/imports/:supplierImportBatchId");
  if (apSupplierImportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getSupplierImportBatch({
        companyId,
        supplierImportBatchId: apSupplierImportMatch.supplierImportBatchId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/purchase-orders") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(res, 200, {
      items: platform.listPurchaseOrders({
        companyId,
        supplierId: url.searchParams.get("supplierId") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/purchase-orders") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.createPurchaseOrder({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apPurchaseOrderMatch = matchPath(path, "/v1/ap/purchase-orders/:purchaseOrderId");
  if (apPurchaseOrderMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getPurchaseOrder({
        companyId,
        purchaseOrderId: apPurchaseOrderMatch.purchaseOrderId
      })
    );
    return;
  }

  const apPurchaseOrderStatusMatch = matchPath(path, "/v1/ap/purchase-orders/:purchaseOrderId/status");
  if (apPurchaseOrderStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.transitionPurchaseOrderStatus({
        companyId,
        purchaseOrderId: apPurchaseOrderStatusMatch.purchaseOrderId,
        targetStatus: body.targetStatus,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/purchase-orders/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_purchase_order_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.importPurchaseOrders({
        companyId,
        batchKey: body.batchKey,
        purchaseOrders: Array.isArray(body.purchaseOrders) ? body.purchaseOrders : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apPurchaseOrderImportMatch = matchPath(path, "/v1/ap/purchase-orders/imports/:purchaseOrderImportBatchId");
  if (apPurchaseOrderImportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_purchase_order_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getPurchaseOrderImportBatch({
        companyId,
        purchaseOrderImportBatchId: apPurchaseOrderImportMatch.purchaseOrderImportBatchId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/receipts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_receipt",
      scopeCode: "ap"
    });
    writeJson(res, 200, {
      items: platform.listReceipts({
        companyId,
        purchaseOrderId: url.searchParams.get("purchaseOrderId") || null,
        supplierInvoiceReference: url.searchParams.get("supplierInvoiceReference") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/receipts") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_receipt",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.createReceipt({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apReceiptMatch = matchPath(path, "/v1/ap/receipts/:apReceiptId");
  if (apReceiptMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_receipt",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getReceipt({
        companyId,
        apReceiptId: apReceiptMatch.apReceiptId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/invoices") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    const reviewRequired = url.searchParams.get("reviewRequired");
    writeJson(res, 200, {
      items: platform.listSupplierInvoices({
        companyId,
        status: url.searchParams.get("status") || null,
        reviewRequired: reviewRequired === null ? null : reviewRequired === "true"
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/invoices/ingest") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.ingestSupplierInvoice({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apInvoiceMatch = matchPath(path, "/v1/ap/invoices/:supplierInvoiceId");
  if (apInvoiceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getSupplierInvoice({
        companyId,
        supplierInvoiceId: apInvoiceMatch.supplierInvoiceId
      })
    );
    return;
  }

  const apInvoiceMatchRun = matchPath(path, "/v1/ap/invoices/:supplierInvoiceId/match");
  if (apInvoiceMatchRun && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.runSupplierInvoiceMatch({
        companyId,
        supplierInvoiceId: apInvoiceMatchRun.supplierInvoiceId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apInvoicePost = matchPath(path, "/v1/ap/invoices/:supplierInvoiceId/post");
  if (apInvoicePost && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.postSupplierInvoice({
        companyId,
        supplierInvoiceId: apInvoicePost.supplierInvoiceId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  writeJson(res, 404, { error: "not_found" });
}

function authorizeDocumentAccess({ platform, sessionToken, companyId, permissionCode }) {
  return authorizeCompanyAccess({
    platform,
    sessionToken,
    companyId,
    permissionCode,
    objectType: "document",
    scopeCode: "document"
  });
}

function authorizeCompanyAccess({ platform, sessionToken, companyId, permissionCode, objectType, scopeCode }) {
  const { principal, decision } = platform.checkAuthorization({
    sessionToken,
    action: permissionCode,
    resource: {
      companyId,
      objectType,
      objectId: companyId,
      scopeCode
    }
  });
  if (!decision.allowed) {
    throw createHttpError(403, decision.reasonCode, decision.explanation);
  }
  return principal;
}

function matchPath(actualPath, template) {
  const actualParts = actualPath.split("/").filter(Boolean);
  const templateParts = template.split("/").filter(Boolean);
  if (actualParts.length !== templateParts.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index];
    const actualPart = actualParts[index];
    if (templatePart.startsWith(":")) {
      params[templatePart.slice(1)] = decodeURIComponent(actualPart);
      continue;
    }
    if (templatePart !== actualPart) {
      return null;
    }
  }
  return params;
}

function isPhase1Route(path) {
  return path.startsWith("/v1/auth") || path.startsWith("/v1/org") || path.startsWith("/v1/onboarding");
}

function isPhase2Route(path) {
  return path.startsWith("/v1/documents");
}

function isPhase2InboxRoute(path) {
  return path.startsWith("/v1/inbox");
}

function isPhase23Route(path) {
  return path.includes("/ocr/") || path.startsWith("/v1/review-tasks");
}

function isPhase3Route(path) {
  return path.startsWith("/v1/ledger") || path.startsWith("/v1/reporting");
}

function isPhase4Route(path) {
  return path.startsWith("/v1/vat");
}

function isPhase5Route(path) {
  return path.startsWith("/v1/ar");
}

function isPhase6Route(path) {
  return path.startsWith("/v1/ap");
}

async function readJsonBody(req, allowEmpty = false) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    return allowEmpty ? {} : {};
  }
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Request body is not valid JSON.");
    error.status = 400;
    error.code = "json_invalid";
    throw error;
  }
}

function readSessionToken(req, body = {}) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return body.sessionToken || null;
}

function requireText(value, code, message) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(400, code, message);
  }
  return value.trim();
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function writeError(res, error) {
  writeJson(res, error.status || error.statusCode || 500, {
    error: error.code || "internal_error",
    message: error.message || "Unexpected error"
  });
}

function createCorrelationId() {
  return crypto.randomUUID();
}

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function readFeatureFlags(env) {
  return {
    phase1AuthOnboardingEnabled: String(env.PHASE1_AUTH_ONBOARDING_ENABLED || "true").toLowerCase() !== "false",
    phase2DocumentArchiveEnabled: String(env.PHASE2_DOCUMENT_ARCHIVE_ENABLED || "true").toLowerCase() !== "false",
    phase2CompanyInboxEnabled: String(env.PHASE2_COMPANY_INBOX_ENABLED || "true").toLowerCase() !== "false",
    phase2OcrReviewEnabled: String(env.PHASE2_OCR_REVIEW_ENABLED || "true").toLowerCase() !== "false",
    phase3LedgerEnabled: String(env.PHASE3_LEDGER_ENABLED || "true").toLowerCase() !== "false",
    phase4VatEnabled: String(env.PHASE4_VAT_ENABLED || "true").toLowerCase() !== "false",
    phase5ArEnabled: String(env.PHASE5_AR_ENABLED || "true").toLowerCase() !== "false",
    phase6ApEnabled: String(env.PHASE6_AP_ENABLED || "true").toLowerCase() !== "false"
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = await startApiServer();
  process.on("SIGINT", async () => {
    await runtime.stop();
    process.exit(0);
  });
}
