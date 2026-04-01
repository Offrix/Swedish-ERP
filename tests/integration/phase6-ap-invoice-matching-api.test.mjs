import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.2 API ingests supplier invoices, posts multi-line costs and blocks open variances", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-21T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "API Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false
      }
    });

    const ingested = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        externalInvoiceRef: "API-INV-6201",
        invoiceDate: "2026-09-21",
        dueDate: "2026-10-21",
        sourceChannel: "api",
        lines: [
          {
            description: "Consumables",
            quantity: 2,
            unitPrice: 500,
            expenseAccountNumber: "5410",
            vatCode: "VAT_SE_DOMESTIC_25"
          },
          {
            description: "Cloud tools",
            quantity: 1,
            unitPrice: 200,
            expenseAccountNumber: "5610",
            vatCode: "VAT_SE_DOMESTIC_25"
          }
        ]
      }
    });
    assert.equal(ingested.lines.length, 2);
    assert.equal(typeof ingested.lines[0].vatProposal.vatDecisionId, "string");
    assert.equal(ingested.lines[0].vatProposal.decisionCategory, "domestic_supplier_charged_purchase");
    assert.deepEqual(ingested.lines[0].vatProposal.declarationBoxCodes, ["48"]);

    const matched = await requestJson(baseUrl, `/v1/ap/invoices/${ingested.supplierInvoiceId}/match`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(matched.invoice.status, "approved");

    const posted = await requestJson(baseUrl, `/v1/ap/invoices/${ingested.supplierInvoiceId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(posted.status, "posted");
    assert.ok(posted.journalEntryId);

    const listed = await requestJson(baseUrl, `/v1/ap/invoices?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(listed.items.some((candidate) => candidate.supplierInvoiceId === ingested.supplierInvoiceId), true);

    const poSupplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "API Match Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        defaultExpenseAccountNumber: "4010",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: true,
        requiresReceipt: true
      }
    });

    const purchaseOrder = await requestJson(baseUrl, "/v1/ap/purchase-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: poSupplier.supplierId,
        requesterUserId: "user-1",
        lines: [
          {
            description: "Material",
            quantityOrdered: 10,
            unitPrice: 100,
            expenseAccountNumber: "4010",
            vatCode: "VAT_SE_DOMESTIC_25",
            receiptTargetType: "inventory"
          }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/ap/purchase-orders/${purchaseOrder.purchaseOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "approved"
      }
    });
    await requestJson(baseUrl, `/v1/ap/purchase-orders/${purchaseOrder.purchaseOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "sent"
      }
    });
    await requestJson(baseUrl, "/v1/ap/receipts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        purchaseOrderId: purchaseOrder.purchaseOrderId,
        receiptDate: "2026-09-21",
        receiverActorId: "user-1",
        lines: [
          {
            purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
            receivedQuantity: 4
          }
        ]
      }
    });

    const varianceInvoice = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: poSupplier.supplierId,
        purchaseOrderId: purchaseOrder.purchaseOrderId,
        externalInvoiceRef: "API-INV-6202",
        invoiceDate: "2026-09-21",
        dueDate: "2026-10-21",
        sourceChannel: "api",
        lines: [
          {
            description: "Material",
            quantity: 6,
            unitPrice: 100,
            expenseAccountNumber: "4010",
            vatCode: "VAT_SE_DOMESTIC_25",
            goodsOrServices: "goods",
            purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
            receiptRequired: true
          }
        ]
      }
    });

    const varianceMatch = await requestJson(baseUrl, `/v1/ap/invoices/${varianceInvoice.supplierInvoiceId}/match`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(varianceMatch.invoice.status, "pending_approval");
    assert.equal(varianceMatch.invoice.reviewRequired, true);
    assert.deepEqual(
      varianceMatch.invoice.variances.map((variance) => variance.varianceCode),
      ["receipt_variance"]
    );

    const blockedPost = await fetch(`${baseUrl}/v1/ap/invoices/${varianceInvoice.supplierInvoiceId}/post`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`,        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({
        companyId: COMPANY_ID
      })
    });
    assert.equal(blockedPost.status, 409);
    const blockedPayload = await blockedPost.json();
    assert.equal(blockedPayload.error, "supplier_invoice_review_required");
  } finally {
    await stopServer(server);
  }
});

test("Phase 6.4 API blocks AP posting until linked import case is complete and approved", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-22T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "Import Linked Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        paymentRecipient: "Import Linked Supplier AB",
        bankgiro: "1234-8888",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false
      }
    });

    const supplierDocument = platform.createDocumentRecord({
      companyId: COMPANY_ID,
      documentType: "supplier_invoice",
      sourceReference: "phase6-4-import-supplier",
      actorId: "user-1"
    });
    const customsDocument = platform.createDocumentRecord({
      companyId: COMPANY_ID,
      documentType: "supplier_invoice",
      sourceReference: "phase6-4-import-customs",
      actorId: "user-1"
    });
    const importCase = platform.createImportCase({
      companyId: COMPANY_ID,
      caseReference: "IMP-API-6401",
      goodsOriginCountry: "CN",
      customsReference: "IMP-CUST-6401",
      initialDocuments: [
        {
          documentId: supplierDocument.documentId,
          roleCode: "PRIMARY_SUPPLIER_DOCUMENT"
        }
      ],
      initialComponents: [
        {
          componentType: "GOODS",
          amount: 1000
        },
        {
          componentType: "IMPORT_VAT",
          amount: 250
        }
      ],
      actorId: "user-1"
    });

    const ingested = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        importCaseId: importCase.importCaseId,
        externalInvoiceRef: "API-INV-6401",
        invoiceDate: "2026-09-22",
        dueDate: "2026-10-22",
        sourceChannel: "api",
        lines: [
          {
            description: "Import-linked service cost",
            quantity: 1,
            unitPrice: 1000,
            expenseAccountNumber: "5410",
            vatCode: "VAT_SE_DOMESTIC_25",
            importCaseRequired: true
          }
        ]
      }
    });
    assert.equal(ingested.importCaseId, importCase.importCaseId);

    const blockedMatch = await requestJson(baseUrl, `/v1/ap/invoices/${ingested.supplierInvoiceId}/match`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(blockedMatch.invoice.reviewRequired, true);
    assert.equal(blockedMatch.invoice.reviewQueueCodes.includes("import_case_review"), true);
    assert.equal(blockedMatch.invoice.paymentHoldReasonCodes.includes("import_case_incomplete"), true);

    platform.attachDocumentToImportCase({
      companyId: COMPANY_ID,
      importCaseId: importCase.importCaseId,
      documentId: customsDocument.documentId,
      roleCode: "CUSTOMS_EVIDENCE",
      actorId: "user-1"
    });
    platform.recalculateImportCase({
      companyId: COMPANY_ID,
      importCaseId: importCase.importCaseId,
      actorId: "user-1"
    });
    platform.claimReviewCenterItem({
      companyId: COMPANY_ID,
      reviewItemId: importCase.reviewItemId,
      actorId: "user-1"
    });
    platform.decideReviewCenterItem({
      companyId: COMPANY_ID,
      reviewItemId: importCase.reviewItemId,
      decisionCode: "approve",
      reasonCode: "import_case_complete",
      actorId: "user-1"
    });
    platform.approveImportCase({
      companyId: COMPANY_ID,
      importCaseId: importCase.importCaseId,
      approvalNote: "Complete import case for AP payment readiness.",
      actorId: "user-1",
      reviewCenterManaged: true
    });

    const approvedMatch = await requestJson(baseUrl, `/v1/ap/invoices/${ingested.supplierInvoiceId}/match`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approvedMatch.invoice.reviewRequired, false);
    assert.equal(approvedMatch.invoice.importCaseStatus, "approved");
    assert.equal(approvedMatch.invoice.importCaseCompletenessStatus, "complete");

    const posted = await requestJson(baseUrl, `/v1/ap/invoices/${ingested.supplierInvoiceId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(posted.status, "posted");
    assert.equal(posted.paymentReadinessStatus, "ready");
  } finally {
    await stopServer(server);
  }
});

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });

  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}
