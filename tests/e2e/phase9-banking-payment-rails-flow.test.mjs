import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.4/9.6 e2e flow keeps payment rails while forcing explicit approval before statement posting", async () => {
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

    const bankAccount = await requestJson(baseUrl, "/v1/banking/accounts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankName: "SEB",
        ledgerAccountNumber: "1110",
        accountNumber: "5566778899",
        currencyCode: "SEK"
      }
    });

    const openBankingFlow = await createAndSettleProposal({
      baseUrl,
      platform,
      token: sessionToken,
      bankAccountId: bankAccount.bankAccountId,
      externalInvoiceRef: "PHASE94-E2E-OB",
      paymentRailCode: "open_banking"
    });
    assert.equal(openBankingFlow.exported.paymentBatch.paymentRailCode, "open_banking");
    assert.match(openBankingFlow.exported.paymentBatch.exportPayload, /"orders":/);

    const statementImport = await requestJson(baseUrl, "/v1/banking/statement-events/import", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankAccountId: bankAccount.bankAccountId,
        statementDate: "2026-11-16",
        sourceChannelCode: "open_banking_sync",
        providerReference: "enable-banking-e2e-1",
        events: [
          {
            externalReference: "BANK-E2E-9401-BOOK",
            bookingDate: "2026-11-16",
            amount: -1250,
            linkedPaymentOrderId: openBankingFlow.paymentOrderId,
            paymentOrderAction: "booked"
          }
        ]
      }
    });
    assert.equal(statementImport.statementImport.status, "reconciliation_required");

    const openCases = await requestJson(baseUrl, `/v1/banking/reconciliation-cases?companyId=${COMPANY_ID}&status=open`, {
      token: sessionToken
    });
    assert.equal(openCases.items.length, 1);
    assert.equal(openCases.items[0].caseTypeCode, "payment_order_posting_gate");
    await requestJson(baseUrl, `/v1/banking/reconciliation-cases/${openCases.items[0].reconciliationCaseId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionCode: "approve_payment_order_statement",
        resolutionNote: "Approved payment order settlement from statement."
      }
    });

    const fileRailFlow = await createAndSettleProposal({
      baseUrl,
      platform,
      token: sessionToken,
      bankAccountId: bankAccount.bankAccountId,
      externalInvoiceRef: "PHASE94-E2E-FILE",
      paymentRailCode: "iso20022_file",
      settle: false
    });
    assert.equal(fileRailFlow.exported.paymentBatch.paymentRailCode, "iso20022_file");
    assert.match(fileRailFlow.exported.paymentBatch.exportPayload, /<PaymentBatch/);
    assert.match(fileRailFlow.exported.paymentBatch.exportPayload, /format="pain\.001"/);

    const settlementLinks = await requestJson(baseUrl, `/v1/banking/settlement-links?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(settlementLinks.items.some((item) => item.paymentOrderId === openBankingFlow.paymentOrderId && item.status === "settled"), true);

    const paymentBatches = await requestJson(baseUrl, `/v1/banking/payment-batches?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(paymentBatches.items.length, 2);
    assert.equal(paymentBatches.items.some((item) => item.paymentRailCode === "open_banking" && item.status === "settled"), true);
    assert.equal(paymentBatches.items.some((item) => item.paymentRailCode === "iso20022_file" && item.status === "accepted_by_bank"), true);
  } finally {
    await stopServer(server);
  }
});

async function createAndSettleProposal({ baseUrl, platform, token, bankAccountId, externalInvoiceRef, paymentRailCode, settle = true }) {
  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: `Supplier ${externalInvoiceRef}`,
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: `Supplier ${externalInvoiceRef}`,
    bankgiro: "7777-5656",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "admin"
  });
  const invoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef,
    invoiceDate: "2026-11-15",
    dueDate: "2026-12-15",
    sourceChannel: "api",
    lines: [
      {
        description: "E2E payment rail spend",
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
  const proposal = await requestJson(baseUrl, "/v1/banking/payment-proposals", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      bankAccountId,
      apOpenItemIds: [posted.apOpenItemId],
      paymentDate: "2026-12-15",
      paymentRailCode
    }
  });
  await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/approve`, {
    method: "POST",
    token,
    body: { companyId: COMPANY_ID }
  });
  const exported = await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/export`, {
    method: "POST",
    token,
    body: { companyId: COMPANY_ID }
  });
  await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/submit`, {
    method: "POST",
    token,
    body: { companyId: COMPANY_ID }
  });
  const accepted = await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/accept`, {
    method: "POST",
    token,
    body: { companyId: COMPANY_ID }
  });

  return {
    proposal,
    exported,
    accepted,
    paymentOrderId: accepted.orders[0].paymentOrderId
  };
}

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
