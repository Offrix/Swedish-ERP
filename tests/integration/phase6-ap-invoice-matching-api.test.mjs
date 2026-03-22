import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
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
        authorization: `Bearer ${sessionToken}`
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
