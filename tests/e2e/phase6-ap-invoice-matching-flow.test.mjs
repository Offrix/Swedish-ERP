import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.2 end-to-end flow ingests OCR invoice, matches and posts through API", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-22T09:00:00Z")
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
    const root = await requestJson(baseUrl, "/", {});
    assert.equal(root.phase6ApEnabled, true);
    assert.equal(root.routes.includes("/v1/ap/invoices/ingest"), true);

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
        legalName: "E2E OCR Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false
      }
    });

    await requestJson(baseUrl, "/v1/inbox/channels", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        channelCode: "ap_invoice_inbox",
        inboundAddress: "ap-invoices@inbound.example.test",
        useCase: "supplier_invoice_inbox",
        allowedMimeTypes: ["application/pdf"],
        maxAttachmentSizeBytes: 1048576,
        classificationConfidenceThreshold: 0.9,
        fieldConfidenceThreshold: 0.85
      }
    });

    const ingestedMessage = await requestJson(baseUrl, "/v1/inbox/messages", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        recipientAddress: "ap-invoices@inbound.example.test",
        messageId: "<phase6-2-e2e-ocr-001>",
        rawStorageKey: "raw-mail/phase6-2-e2e-ocr-001.eml",
        attachments: [
          {
            filename: "supplier-invoice.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/phase6-2-e2e-ocr-001.pdf",
            contentText: [
              "Invoice: E2E-6201",
              "Supplier: E2E OCR Supplier AB",
              "Invoice date: 2026-09-22",
              "Due date: 2026-10-22",
              "Currency: SEK",
              "Net: 1200.00",
              "VAT: 300.00",
              "Total: 1500.00",
              "OCR: 998877",
              "Line 1: Safety gear Qty: 2 Unit: 500.00 VAT: VAT_SE_DOMESTIC_25 Account: 5420",
              "Line 2: Software license Qty: 1 Unit: 200.00 VAT: VAT_SE_DOMESTIC_25 Account: 5610"
            ].join("\n")
          }
        ]
      }
    });
    const documentId = ingestedMessage.routedDocuments[0].documentId;

    const ocrRun = await requestJson(baseUrl, `/v1/documents/${documentId}/ocr/runs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(ocrRun.ocrRun.suggestedDocumentType, "supplier_invoice");

    const invoice = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        documentId,
        sourceChannel: "email"
      }
    });
    assert.equal(invoice.lines.length, 2);
    assert.equal(invoice.lines[0].expenseAccountNumber, "5420");
    assert.equal(invoice.lines[1].expenseAccountNumber, "5610");

    const matched = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/match`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(matched.invoice.status, "approved");

    const posted = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(posted.status, "posted");
    assert.ok(posted.journalEntryId);

    const fetched = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(fetched.status, "posted");
    assert.equal(fetched.matchRun.status, "matched");
    assert.deepEqual(fetched.variances, []);
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
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
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
