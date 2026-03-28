import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.3 e2e flow moves a supplier invoice from approval to bank return and back to open AP state", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-11-05T08:00:00Z")
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
    const adminSessionToken = await loginWithRequiredFactors({ baseUrl, platform, companyId: COMPANY_ID, email: DEMO_ADMIN_EMAIL });
    const approverSessionToken = await loginWithRequiredFactors({ baseUrl, platform, companyId: COMPANY_ID, email: DEMO_APPROVER_EMAIL });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });

    const users = await requestJson(baseUrl, `/v1/org/companies/${COMPANY_ID}/users?companyId=${COMPANY_ID}`, {
      token: adminSessionToken
    });
    const admin = users.items.find((candidate) => candidate.roleCode === "company_admin");
    const approver = users.items.find((candidate) => candidate.roleCode === "approver");
    assert.ok(admin);
    assert.ok(approver);

    const chain = await requestJson(baseUrl, "/v1/org/attest-chains", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        scopeCode: "ap",
        objectType: "ap_supplier_invoice",
        steps: [
          { approverCompanyUserId: admin.companyUserId, label: "e2e_prepare" },
          { approverCompanyUserId: approver.companyUserId, label: "e2e_attest" }
        ]
      }
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "E2E Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        paymentRecipient: "E2E Supplier AB",
        bankgiro: "8888-8888",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false,
        attestChainId: chain.approvalChainId
      }
    });

    const invoice = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        externalInvoiceRef: "E2E-INV-6301",
        invoiceDate: "2026-11-05",
        dueDate: "2026-12-05",
        sourceChannel: "api",
        lines: [{ description: "E2E spend", quantity: 1, unitPrice: 1000, expenseAccountNumber: "5410", vatCode: "VAT_SE_DOMESTIC_25" }]
      }
    });

    await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/match`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    const firstApproval = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/approve`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(firstApproval.status, "pending_approval");
    const approved = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/approve`, {
      method: "POST",
      token: approverSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(approved.status, "approved");

    const posted = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/post`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(posted.status, "posted");

    const bankAccount = await requestJson(baseUrl, "/v1/banking/accounts", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankName: "Handelsbanken",
        ledgerAccountNumber: "1110",
        accountNumber: "4455667788",
        currencyCode: "SEK"
      }
    });

    const proposal = await requestJson(baseUrl, "/v1/banking/payment-proposals", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankAccountId: bankAccount.bankAccountId,
        apOpenItemIds: [posted.apOpenItemId],
        paymentDate: "2026-12-05"
      }
    });

    await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/approve`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    const exported = await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/export`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(exported.orders[0].status, "reserved");

    await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/submit`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    const accepted = await requestJson(baseUrl, `/v1/banking/payment-proposals/${proposal.paymentProposalId}/accept`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    const paymentOrderId = accepted.orders[0].paymentOrderId;

    const booked = await requestJson(baseUrl, `/v1/banking/payment-orders/${paymentOrderId}/book`, {
      method: "POST",
      token: adminSessionToken,
      body: {
        companyId: COMPANY_ID,
        bankEventId: "E2E-BOOK-6301",
        bookedOn: "2026-12-06"
      }
    });
    assert.equal(booked.paymentProposal.status, "settled");

    const returned = await requestJson(baseUrl, `/v1/banking/payment-orders/${paymentOrderId}/return`, {
      method: "POST",
      token: adminSessionToken,
      body: {
        companyId: COMPANY_ID,
        bankEventId: "E2E-RETURN-6301",
        returnedOn: "2026-12-07"
      }
    });
    assert.equal(returned.paymentOrder.status, "returned");

    const openItem = await requestJson(baseUrl, `/v1/ap/open-items/${posted.apOpenItemId}?companyId=${COMPANY_ID}`, {
      token: adminSessionToken
    });
    assert.equal(openItem.status, "open");
    assert.equal(openItem.openAmount, 1250);

    const refreshedInvoice = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}?companyId=${COMPANY_ID}`, {
      token: adminSessionToken
    });
    assert.equal(refreshedInvoice.status, "posted");
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.2 e2e flow creates a supplier credit note and keeps it outside live payment prep", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-11-08T08:00:00Z")
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
    const adminSessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "E2E Credit Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        paymentRecipient: "E2E Credit Supplier AB",
        bankgiro: "7777-1212",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false
      }
    });

    const invoice = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        externalInvoiceRef: "E2E-CREDIT-001",
        invoiceDate: "2026-11-08",
        dueDate: "2026-12-08",
        sourceChannel: "api",
        lines: [
          {
            description: "Consulting block",
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
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    const posted = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/post`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });

    const credit = await requestJson(baseUrl, `/v1/ap/invoices/${posted.supplierInvoiceId}/credits`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        externalInvoiceRef: "E2E-CREDIT-001-CN",
        invoiceDate: "2026-11-09",
        dueDate: "2026-11-09",
        creditReasonCode: "quality_claim"
      }
    });
    await requestJson(baseUrl, `/v1/ap/invoices/${credit.supplierInvoiceId}/match`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    const postedCredit = await requestJson(baseUrl, `/v1/ap/invoices/${credit.supplierInvoiceId}/post`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });

    const paymentPreparation = await requestJson(
      baseUrl,
      `/v1/ap/open-items/${postedCredit.apOpenItemId}/payment-preparation?companyId=${COMPANY_ID}`,
      {
        token: adminSessionToken
      }
    );
    assert.equal(paymentPreparation.invoiceType, "credit_note");
    assert.equal(paymentPreparation.status, "not_applicable");
    assert.equal(paymentPreparation.blockerCodes.includes("credit_note_not_payable"), true);
  } finally {
    await stopServer(server);
  }
});

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: { companyId, email }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: { code: platform.getTotpCodeForTesting({ companyId, email }) }
  });
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: started.sessionToken
    });
    await requestJson(baseUrl, "/v1/auth/bankid/collect", {
      method: "POST",
      token: started.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
  }
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
