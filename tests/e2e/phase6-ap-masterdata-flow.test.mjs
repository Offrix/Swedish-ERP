import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.1 AP routes toggle cleanly and support supplier, PO and receipt flow", async () => {
  const disabledServer = createApiServer({
    platform: createApiPlatform({
      clock: () => new Date("2026-09-20T09:00:00Z")
    }),
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: false
    }
  });
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const disabledUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const disabledResponse = await fetch(`${disabledUrl}/v1/ap/suppliers?companyId=${COMPANY_ID}`);
    assert.equal(disabledResponse.status, 503);
  } finally {
    await stopServer(disabledServer);
  }

  const platform = createApiPlatform({
    clock: () => new Date("2026-09-20T09:05:00Z")
  });
  const enabledServer = createApiServer({
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
  await new Promise((resolve) => enabledServer.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${enabledServer.address().port}`;

  try {
    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "Field Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET20",
        paymentRecipient: "Field Supplier AB",
        bankgiro: "5555-6666",
        defaultExpenseAccountNumber: "4010",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        defaultUnitPrice: 95
      }
    });

    const purchaseOrder = await requestJson(baseUrl, "/v1/ap/purchase-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        requesterUserId: "user-1",
        lines: [
          {
            description: "Insulation",
            quantityOrdered: 6
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

    const receipt = await requestJson(baseUrl, "/v1/ap/receipts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        purchaseOrderId: purchaseOrder.purchaseOrderId,
        receiptDate: "2026-09-20",
        receiverActorId: "user-1",
        supplierInvoiceReference: "FLOW-AP-1",
        lines: [
          {
            purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
            receivedQuantity: 3
          }
        ]
      }
    });

    const receipts = await requestJson(
      baseUrl,
      `/v1/ap/receipts?companyId=${COMPANY_ID}&supplierInvoiceReference=FLOW-AP-1`,
      { token: sessionToken }
    );
    assert.equal(receipts.items.length, 1);
    assert.equal(receipts.items[0].apReceiptId, receipt.apReceiptId);
  } finally {
    await stopServer(enabledServer);
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
  assert.equal(response.status, expectedStatus);
  return payload;
}
