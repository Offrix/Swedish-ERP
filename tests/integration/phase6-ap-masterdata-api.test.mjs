import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.1 migration and seeds add supplier, purchase-order, receipt and import artifacts", async () => {
  const migration = await readText("packages/db/migrations/20260321140000_phase6_ap_masterdata_po_receipts.sql");
  for (const fragment of [
    "ALTER TABLE suppliers",
    "CREATE TABLE IF NOT EXISTS supplier_contacts",
    "CREATE TABLE IF NOT EXISTS ap_tolerance_profiles",
    "CREATE TABLE IF NOT EXISTS purchase_order_lines",
    "CREATE TABLE IF NOT EXISTS purchase_order_receipts",
    "CREATE TABLE IF NOT EXISTS ap_import_batches",
    "CREATE TABLE IF NOT EXISTS ap_supplier_invoice_fingerprints",
    "CREATE TABLE IF NOT EXISTS ap_supplier_invoice_receipt_links"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321140010_phase6_ap_masterdata_po_receipts_seed.sql");
  for (const fragment of ["supplier_contacts", "purchase_order_receipts", "SUPINV-7781"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321141000_phase6_ap_masterdata_po_receipts_demo_seed.sql");
  for (const fragment of ["SUP-2001", "PO-2026-0201", "BL-INV-4451"]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 6.1 API imports suppliers and POs, then records linked receipts with duplicate protection", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-15T10:00:00Z")
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

    const supplierBatch = await requestJson(baseUrl, "/v1/ap/suppliers/imports", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        batchKey: "suppliers-6101",
        suppliers: [
          {
            supplierNo: "SUP6101",
            legalName: "Phase 6 Supplier AB",
            countryCode: "SE",
            currencyCode: "SEK",
            paymentTermsCode: "NET30",
            paymentRecipient: "Phase 6 Supplier AB",
            bankgiro: "1234-5678",
            defaultExpenseAccountNumber: "4010",
            defaultVatCode: "VAT_SE_DOMESTIC_25",
            defaultUnitPrice: 120
          }
        ]
      }
    });
    assert.equal(supplierBatch.summary.created, 1);
    const fetchedSupplierBatch = await requestJson(
      baseUrl,
      `/v1/ap/suppliers/imports/${supplierBatch.supplierImportBatchId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(fetchedSupplierBatch.summary.created, 1);

    const suppliers = await requestJson(baseUrl, `/v1/ap/suppliers?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(suppliers.items.length, 1);

    const poBatch = await requestJson(baseUrl, "/v1/ap/purchase-orders/imports", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        batchKey: "po-6101",
        purchaseOrders: [
          {
            poNo: "PO6101",
            supplierId: suppliers.items[0].supplierId,
            requesterUserId: "user-1",
            lines: [
              {
                description: "Materials",
                quantityOrdered: 10
              }
            ]
          }
        ]
      }
    });
    assert.equal(poBatch.summary.created, 1);
    const fetchedPoBatch = await requestJson(
      baseUrl,
      `/v1/ap/purchase-orders/imports/${poBatch.purchaseOrderImportBatchId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(fetchedPoBatch.summary.created, 1);

    const purchaseOrders = await requestJson(baseUrl, `/v1/ap/purchase-orders?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(purchaseOrders.items.length, 1);
    assert.equal(purchaseOrders.items[0].lines[0].expenseAccountNumber, "4010");
    assert.equal(purchaseOrders.items[0].lines[0].unitPrice, 120);

    await requestJson(baseUrl, `/v1/ap/purchase-orders/${purchaseOrders.items[0].purchaseOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "approved"
      }
    });
    const sentPurchaseOrder = await requestJson(baseUrl, `/v1/ap/purchase-orders/${purchaseOrders.items[0].purchaseOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "sent"
      }
    });
    assert.equal(sentPurchaseOrder.status, "sent");

    const receipt = await requestJson(baseUrl, "/v1/ap/receipts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        purchaseOrderId: purchaseOrders.items[0].purchaseOrderId,
        receiptDate: "2026-09-15",
        receiverActorId: "user-1",
        supplierInvoiceReference: "SUP-INV-6101",
        externalReceiptRef: "DELIV-6101",
        lines: [
          {
            purchaseOrderLineId: purchaseOrders.items[0].lines[0].purchaseOrderLineId,
            receivedQuantity: 5
          }
        ]
      }
    });

    const duplicate = await requestJson(baseUrl, "/v1/ap/receipts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        purchaseOrderId: purchaseOrders.items[0].purchaseOrderId,
        receiptDate: "2026-09-15",
        receiverActorId: "user-1",
        supplierInvoiceReference: "SUP-INV-6101",
        externalReceiptRef: "DELIV-6101",
        lines: [
          {
            purchaseOrderLineId: purchaseOrders.items[0].lines[0].purchaseOrderLineId,
            receivedQuantity: 5
          }
        ]
      }
    });
    assert.equal(duplicate.apReceiptId, receipt.apReceiptId);

    const fetchedReceipt = await requestJson(
      baseUrl,
      `/v1/ap/receipts/${receipt.apReceiptId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(fetchedReceipt.supplierInvoiceReference, "SUP-INV-6101");

    const linkedReceipts = await requestJson(
      baseUrl,
      `/v1/ap/receipts?companyId=${COMPANY_ID}&supplierInvoiceReference=SUP-INV-6101`,
      { token: sessionToken }
    );
    assert.equal(linkedReceipts.items.length, 1);

    const refreshedPurchaseOrder = await requestJson(
      baseUrl,
      `/v1/ap/purchase-orders/${purchaseOrders.items[0].purchaseOrderId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(refreshedPurchaseOrder.status, "partially_received");
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
  assert.equal(response.status, expectedStatus);
  return payload;
}
