import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.4/9.6 API exposes payment rails while requiring explicit approval for statement posting", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-11-15T08:00:00Z")
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

    platform.installLedgerCatalog({
      companyId: COMPANY_ID,
      actorId: "system"
    });
    const supplier = platform.createSupplier({
      companyId: COMPANY_ID,
      legalName: "API Payment Rails AB",
      countryCode: "SE",
      currencyCode: "SEK",
      paymentTermsCode: "NET30",
      paymentRecipient: "API Payment Rails AB",
      bankgiro: "7777-3434",
      defaultExpenseAccountNumber: "5410",
      defaultVatCode: "VAT_SE_DOMESTIC_25",
      requiresPo: false,
      actorId: "admin"
    });
    const invoice = platform.ingestSupplierInvoice({
      companyId: COMPANY_ID,
      supplierId: supplier.supplierId,
      externalInvoiceRef: "PHASE94-API-INV-1",
      invoiceDate: "2026-11-15",
      dueDate: "2026-12-15",
      sourceChannel: "api",
      lines: [
        {
          description: "API payment rails spend",
          quantity: 1,
          unitPrice: 1000,
          expenseAccountNumber: "5410",
          vatCode: "VAT_SE_DOMESTIC_25"
        }
      ],
      actorId: "admin"
    });
    const matched = platform.runSupplierInvoiceMatch({
      companyId: COMPANY_ID,
      supplierInvoiceId: invoice.supplierInvoiceId,
      actorId: "admin"
    });
    if (matched.invoice.status !== "approved") {
      platform.approveSupplierInvoice({
        companyId: COMPANY_ID,
        supplierInvoiceId: invoice.supplierInvoiceId,
        actorId: "admin"
      });
    }
    const posted = platform.postSupplierInvoice({
      companyId: COMPANY_ID,
      supplierInvoiceId: invoice.supplierInvoiceId,
      actorId: "admin"
    });
    const bankAccount = await requestJson(baseUrl, "/v1/banking/accounts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankName: "Nordea",
        ledgerAccountNumber: "1110",
        accountNumber: "9988776655",
        currencyCode: "SEK"
      }
    });
    const proposal = await requestJson(baseUrl, "/v1/banking/payment-proposals", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankAccountId: bankAccount.bankAccountId,
        apOpenItemIds: [posted.apOpenItemId],
        paymentDate: "2026-12-15",
        paymentRailCode: "open_banking"
      }
    });
    const approved = await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });
    const exported = await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/export`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });
    const accepted = await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/accept`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });
    const paymentOrderId = accepted.orders[0].paymentOrderId;

    assert.equal(approved.paymentBatch.paymentRailCode, "open_banking");
    assert.equal(exported.paymentBatch.providerBaselineCode, "SE-OPEN-BANKING-CORE");

    const imported = await requestJson(baseUrl, "/v1/banking/statement-events/import", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankAccountId: bankAccount.bankAccountId,
        statementDate: "2026-11-16",
        sourceChannelCode: "open_banking_sync",
        providerReference: "enable-banking-sync-api-1",
        events: [
          {
            externalReference: "BANK-API-9401-BOOK",
            bookingDate: "2026-11-16",
            amount: -1250,
            linkedPaymentOrderId: paymentOrderId,
            paymentOrderAction: "booked"
          },
          {
            externalReference: "BANK-API-9401-TAX",
            bookingDate: "2026-11-16",
            amount: -15000,
            statementCategoryCode: "tax_account",
            counterpartyName: "Skatteverket",
            referenceText: "skattekonto"
          }
        ]
      }
    });

    assert.equal(imported.statementImport.providerCode, "enable_banking");
    assert.equal(imported.statementImport.status, "reconciliation_required");
    assert.equal(imported.statementImport.matchedPaymentOrderCount, 1);
    assert.equal(imported.statementImport.matchedTaxAccountCount, 1);
    assert.equal(imported.statementImport.reconciliationRequiredCount, 2);

    const paymentBatches = await requestJson(baseUrl, `/v1/banking/payment-batches?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(paymentBatches.items.length, 1);
    assert.equal(paymentBatches.items[0].status, "accepted_by_bank");

    const fetchedBatch = await requestJson(
      baseUrl,
      `/v1/banking/payment-batches/${approved.paymentBatch.paymentBatchId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(fetchedBatch.providerBaselineCode, "SE-OPEN-BANKING-CORE");

    const statementImports = await requestJson(baseUrl, `/v1/banking/statement-imports?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(statementImports.items.length, 1);
    assert.equal(statementImports.items[0].status, "reconciliation_required");

    const fetchedImport = await requestJson(
      baseUrl,
      `/v1/banking/statement-imports/${imported.statementImport.statementImportId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(fetchedImport.items.length, 2);

    const reconciliationCases = await requestJson(baseUrl, `/v1/banking/reconciliation-cases?companyId=${COMPANY_ID}&status=open`, {
      token: sessionToken
    });
    assert.equal(reconciliationCases.items.length, 2);

    const paymentGate = reconciliationCases.items.find((item) => item.caseTypeCode === "payment_order_posting_gate");
    assert.ok(paymentGate);
    const taxGate = reconciliationCases.items.find((item) => item.caseTypeCode === "tax_account_posting_gate");
    assert.ok(taxGate);

    await requestJson(baseUrl, `/v1/banking/reconciliation-cases/${paymentGate.reconciliationCaseId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionCode: "approve_payment_order_statement",
        resolutionNote: "Approved payment order settlement from statement."
      }
    });
    await requestJson(baseUrl, `/v1/banking/reconciliation-cases/${taxGate.reconciliationCaseId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionCode: "approve_tax_account_statement_bridge",
        resolutionNote: "Approved tax-account import from statement."
      }
    });

    const settlementLinks = await requestJson(baseUrl, `/v1/banking/settlement-links?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(settlementLinks.items.some((item) => item.paymentOrderId === paymentOrderId && item.status === "settled"), true);
    assert.equal(settlementLinks.items.some((item) => item.liabilityObjectType === "tax_account_event"), true);

    const settledPaymentBatches = await requestJson(baseUrl, `/v1/banking/payment-batches?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(settledPaymentBatches.items[0].status, "settled");
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
