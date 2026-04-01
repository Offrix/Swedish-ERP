import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 26 AP stays blocked when a supplier invoice is both import-linked and person-linked through classification", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T09:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const employee = platform.createEmployee({
      companyId: DEMO_IDS.companyId,
      givenName: "Ada",
      familyName: "Lovelace",
      workEmail: "ada.ap.step26@example.test",
      actorId: DEMO_IDS.userId
    });
    const employment = platform.createEmployment({
      companyId: DEMO_IDS.companyId,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Operator",
      payModelCode: "monthly_salary",
      startDate: "2026-01-01",
      actorId: DEMO_IDS.userId
    });

    await requestJson(baseUrl, "/v1/inbox/channels", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        channelCode: "step26_docs_inbox",
        inboundAddress: "step26-docs@inbound.example.test",
        useCase: "documents_inbox",
        allowedMimeTypes: ["application/pdf"],
        maxAttachmentSizeBytes: 1048576,
        classificationConfidenceThreshold: 0.9,
        fieldConfidenceThreshold: 0.9
      }
    });

    const sourceDocument = await ingestSingleDocument({
      baseUrl,
      token: adminToken,
      companyId: DEMO_IDS.companyId,
      recipientAddress: "step26-docs@inbound.example.test",
      messageId: "<step26-private-import-001>",
      filename: "step26-supplier-invoice.pdf",
      contentText:
        "Invoice: STEP26-INV-001 Supplier: Step 26 Supplier AB Invoice Date: 2026-03-24 Due Date: 2026-04-23 Currency: SEK Total: 1499.00 OCR: STEP26001"
    });
    const sourceOcr = await runOcr(baseUrl, adminToken, sourceDocument.documentId);
    assert.equal(sourceOcr.ocrRun.suggestedDocumentType, "supplier_invoice");
    assert.equal(sourceOcr.ocrRun.reviewRequired, false);

    const customsDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "supplier_invoice",
      sourceReference: "step26-customs-001",
      actorId: DEMO_IDS.userId
    });

    const classification = await requestJson(baseUrl, `/v1/documents/${sourceDocument.documentId}/classification-cases`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        lineInputs: [
          {
            description: "Privat kortkop pa foretagskort",
            amount: 1499,
            treatmentCode: "PRIVATE_RECEIVABLE",
            person: {
              employeeId: employee.employeeId,
              employmentId: employment.employmentId,
              personRelationCode: "employee"
            }
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/review-center/items/${classification.reviewItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(
      baseUrl,
      `/v1/review-center/items/${classification.reviewItemId}/approve`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "classification_confirmed",
          note: "Privat utgift ska aldrig passera AP som bolagskostnad."
        }
      }
    );
    const dispatchedClassification = await requestJson(
      baseUrl,
      `/v1/documents/${sourceDocument.documentId}/classification-cases/${classification.classificationCaseId}/dispatch`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId
        }
      }
    );
    assert.equal(dispatchedClassification.status, "dispatched");

    const importCase = await requestJson(baseUrl, "/v1/import-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        caseReference: "STEP26-IMP-001",
        goodsOriginCountry: "CN",
        customsReference: "STEP26-CUST-001",
        initialDocuments: [
          {
            documentId: sourceDocument.documentId,
            roleCode: "PRIMARY_SUPPLIER_DOCUMENT"
          }
        ],
        initialComponents: [
          {
            componentType: "GOODS",
            amount: 1499
          },
          {
            componentType: "IMPORT_VAT",
            amount: 374.75
          }
        ]
      }
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalName: "Step 26 Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        bankgiro: "9876-5432",
        paymentRecipient: "Step 26 Supplier AB",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false
      }
    });

    const invoice = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        supplierId: supplier.supplierId,
        documentId: sourceDocument.documentId,
        classificationCaseId: classification.classificationCaseId,
        importCaseId: importCase.importCaseId,
        externalInvoiceRef: "STEP26-INV-001",
        invoiceDate: "2026-03-24",
        dueDate: "2026-04-23",
        sourceChannel: "api",
        lines: [
          {
            description: "Import-linked private spend",
            quantity: 1,
            unitPrice: 1499,
            expenseAccountNumber: "5410",
            vatCode: "VAT_SE_DOMESTIC_25",
            importCaseRequired: true
          }
        ]
      }
    });

    const firstMatch = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/match`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(firstMatch.invoice.reviewRequired, true);
    assert.equal(firstMatch.invoice.reviewQueueCodes.includes("person_linked_document"), true);
    assert.equal(firstMatch.invoice.paymentHoldReasonCodes.includes("person_linked_handoff_required"), true);
    assert.equal(firstMatch.invoice.paymentHoldReasonCodes.includes("import_case_incomplete"), true);

    await requestJson(baseUrl, `/v1/import-cases/${importCase.importCaseId}/attach-document`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        documentId: customsDocument.documentId,
        roleCode: "CUSTOMS_EVIDENCE"
      }
    });
    await requestJson(baseUrl, `/v1/import-cases/${importCase.importCaseId}/recalculate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/review-center/items/${importCase.reviewItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/review-center/items/${importCase.reviewItemId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "import_case_complete",
        note: "Import case complete but AP must still stay blocked by person-linked handoff."
      }
    });

    const secondMatch = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/match`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(secondMatch.invoice.importCaseStatus, "approved");
    assert.equal(secondMatch.invoice.importCaseCompletenessStatus, "complete");
    assert.equal(secondMatch.invoice.reviewRequired, true);
    assert.equal(secondMatch.invoice.classificationCaseStatus, "dispatched");
    assert.equal(secondMatch.invoice.paymentHoldReasonCodes.includes("import_case_incomplete"), false);
    assert.equal(secondMatch.invoice.paymentHoldReasonCodes.includes("person_linked_handoff_required"), true);
    assert.equal(secondMatch.invoice.paymentReadinessStatus, "not_ready");
    assert.equal(secondMatch.invoice.paymentReadinessReasonCodes.includes("review_required"), true);

    const blockedPost = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/post`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(blockedPost.error, "supplier_invoice_review_required");
  } finally {
    await stopServer(server);
  }
});

test("Phase 8.2 API exposes explicit AP supplier payment block and release without leaving stale invoice holds", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T09:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalName: "Blocked Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        bankgiro: "5555-2222",
        paymentRecipient: "Blocked Supplier AB",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false
      }
    });

    const invoice = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        supplierId: supplier.supplierId,
        externalInvoiceRef: "STEP26-BLOCK-001",
        invoiceDate: "2026-03-25",
        dueDate: "2026-04-24",
        sourceChannel: "api",
        lines: [
          {
            description: "Standard office cost",
            quantity: 1,
            unitPrice: 1000,
            expenseAccountNumber: "5410",
            vatCode: "VAT_SE_DOMESTIC_25"
          }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/match`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/post`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const blockedSupplier = await requestJson(baseUrl, `/v1/ap/suppliers/${supplier.supplierId}/payment-block`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCodes: ["manual_payment_block"]
      }
    });
    assert.equal(blockedSupplier.paymentBlocked, true);
    assert.equal(blockedSupplier.paymentBlockReasonCodes.includes("manual_payment_block"), true);

    const blockedInvoice = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(blockedInvoice.paymentHold, true);
    assert.equal(blockedInvoice.paymentHoldReasonCodes.includes("manual_payment_block"), true);

    const releasedSupplier = await requestJson(
      baseUrl,
      `/v1/ap/suppliers/${supplier.supplierId}/payment-block/release`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId
        }
      }
    );
    assert.equal(releasedSupplier.paymentBlocked, false);

    const releasedInvoice = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(releasedInvoice.paymentHold, false);
    assert.equal(releasedInvoice.paymentHoldReasonCodes.includes("manual_payment_block"), false);
  } finally {
    await stopServer(server);
  }
});

async function ingestSingleDocument({ baseUrl, token, companyId, recipientAddress, messageId, filename, contentText }) {
  const ingested = await requestJson(baseUrl, "/v1/inbox/messages", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId,
      recipientAddress,
      messageId,
      rawStorageKey: `raw-mail/${messageId}.eml`,
      attachments: [
        {
          filename,
          mimeType: "application/pdf",
          storageKey: `documents/originals/${filename}`,
          contentText
        }
      ]
    }
  });
  return ingested.routedDocuments[0];
}

async function runOcr(baseUrl, token, documentId) {
  return requestJson(baseUrl, `/v1/documents/${documentId}/ocr/runs`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: DEMO_IDS.companyId
    }
  });
}
