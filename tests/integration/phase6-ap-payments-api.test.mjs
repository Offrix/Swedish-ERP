import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.3 API blocks unauthorized payments, books payouts correctly and re-imports returns idempotently", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-10-01T08:00:00Z")
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

    const companyUsers = await requestJson(baseUrl, `/v1/org/companies/${COMPANY_ID}/users?companyId=${COMPANY_ID}`, {
      token: adminSessionToken
    });
    const admin = companyUsers.items.find((candidate) => candidate.roleCode === "company_admin");
    const approver = companyUsers.items.find((candidate) => candidate.roleCode === "approver");
    assert.ok(admin);
    assert.ok(approver);

    const approvalChain = await requestJson(baseUrl, "/v1/org/attest-chains", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        scopeCode: "ap",
        objectType: "ap_supplier_invoice",
        steps: [
          {
            approverCompanyUserId: admin.companyUserId,
            label: "phase6_3_prepare"
          },
          {
            approverCompanyUserId: approver.companyUserId,
            label: "phase6_3_attest"
          }
        ]
      }
    });

    const supplier = await requestJson(baseUrl, "/v1/ap/suppliers", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "API Payment Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        bankgiro: "9999-9999",
        paymentRecipient: "API Payment Supplier AB",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false,
        attestChainId: approvalChain.approvalChainId
      }
    });

    const invoice = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        externalInvoiceRef: "API-PAY-6301",
        invoiceDate: "2026-10-01",
        dueDate: "2026-10-31",
        sourceChannel: "api",
        lines: [
          {
            description: "Admin services",
            quantity: 1,
            unitPrice: 1000,
            expenseAccountNumber: "5410",
            vatCode: "VAT_SE_DOMESTIC_25"
          }
        ]
      }
    });

    const matched = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/match`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(matched.invoice.status, "pending_approval");

    const firstApproval = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/approve`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(firstApproval.status, "pending_approval");

    const blockedPost = await fetch(`${baseUrl}/v1/ap/invoices/${invoice.supplierInvoiceId}/post`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminSessionToken}`,        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({ companyId: COMPANY_ID })
    });
    const blockedPostPayload = await blockedPost.json();
    assert.equal(blockedPost.status, 409);
    assert.equal(blockedPostPayload.error, "supplier_invoice_review_required");

    const approvedInvoice = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/approve`, {
      method: "POST",
      token: approverSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(approvedInvoice.status, "approved");

    const posted = await requestJson(baseUrl, `/v1/ap/invoices/${invoice.supplierInvoiceId}/post`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    assert.equal(posted.status, "posted");
    const invoiceJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: posted.journalEntryId
    });
    assert.equal(invoiceJournal.metadataJson.postingRecipeCode, "AP_INVOICE");
    assert.equal(invoiceJournal.metadataJson.journalType, "operational_posting");

    const bankAccount = await requestJson(baseUrl, "/v1/banking/accounts", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankName: "SEB",
        ledgerAccountNumber: "1110",
        accountNumber: "5566778899",
        currencyCode: "SEK",
        isDefault: true
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
        paymentDate: "2026-10-31"
      }
    });

    const forbiddenExport = await fetch(`${baseUrl}/v1/banking/payment-proposals/${proposal.paymentProposalId}/export`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${approverSessionToken}`,        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({ companyId: COMPANY_ID })
    });
    const forbiddenPayload = await forbiddenExport.json();
    assert.equal(forbiddenExport.status, 403);
    assert.equal(forbiddenPayload.error, "missing_permission");

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
    assert.equal(exported.status, "exported");

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
        bankEventId: "BANK-BOOK-API-6301",
        bookedOn: "2026-11-01"
      }
    });
    assert.equal(booked.paymentProposal.status, "settled");

    const bookingJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: booked.bankPaymentEvent.journalEntryId
    });
    assert.equal(sumDebits(bookingJournal, "2450"), 1250);
    assert.equal(sumCredits(bookingJournal, "1110"), 1250);
    assert.equal(bookingJournal.metadataJson.postingRecipeCode, "AP_PAYMENT_SETTLEMENT");
    assert.equal(bookingJournal.metadataJson.journalType, "settlement_posting");

    const returned = await requestJson(baseUrl, `/v1/banking/payment-orders/${paymentOrderId}/return`, {
      method: "POST",
      token: adminSessionToken,
      body: {
        companyId: COMPANY_ID,
        bankEventId: "BANK-RETURN-API-6301",
        returnedOn: "2026-11-02"
      }
    });
    const returnJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: returned.bankPaymentEvent.journalEntryId
    });
    assert.equal(returnJournal.metadataJson.postingRecipeCode, "AP_PAYMENT_RETURN");
    assert.equal(returnJournal.metadataJson.journalType, "settlement_posting");
    assert.equal(returned.paymentOrder.status, "returned");

    const replay = await requestJson(baseUrl, `/v1/banking/payment-orders/${paymentOrderId}/return`, {
      method: "POST",
      token: adminSessionToken,
      body: {
        companyId: COMPANY_ID,
        bankEventId: "BANK-RETURN-API-6301",
        returnedOn: "2026-11-02"
      }
    });
    assert.equal(replay.idempotentReplay, true);
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.2 API creates AP credit notes and exposes non-payable payment preparation", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-10-03T08:00:00Z")
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
        legalName: "API Credit Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        bankgiro: "1212-1212",
        paymentRecipient: "API Credit Supplier AB",
        defaultExpenseAccountNumber: "5410",
        defaultVatCode: "VAT_SE_DOMESTIC_25",
        requiresPo: false
      }
    });

    const original = await requestJson(baseUrl, "/v1/ap/invoices/ingest", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        supplierId: supplier.supplierId,
        externalInvoiceRef: "API-CR-001",
        invoiceDate: "2026-10-03",
        dueDate: "2026-11-02",
        sourceChannel: "api",
        lines: [
          {
            description: "Managed service",
            quantity: 1,
            unitPrice: 1000,
            expenseAccountNumber: "5410",
            vatCode: "VAT_SE_DOMESTIC_25"
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/ap/invoices/${original.supplierInvoiceId}/match`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });
    const postedOriginal = await requestJson(baseUrl, `/v1/ap/invoices/${original.supplierInvoiceId}/post`, {
      method: "POST",
      token: adminSessionToken,
      body: { companyId: COMPANY_ID }
    });

    const credit = await requestJson(baseUrl, `/v1/ap/invoices/${postedOriginal.supplierInvoiceId}/credits`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        externalInvoiceRef: "API-CR-001-CN",
        invoiceDate: "2026-10-04",
        dueDate: "2026-10-04",
        creditReasonCode: "supplier_rebate"
      }
    });
    assert.equal(credit.invoiceType, "credit_note");
    assert.equal(credit.originalSupplierInvoiceId, postedOriginal.supplierInvoiceId);

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

    const creditJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: postedCredit.journalEntryId
    });
    assert.equal(creditJournal.metadataJson.postingRecipeCode, "AP_CREDIT_NOTE");
    assert.equal(sumDebits(creditJournal, "2410"), 1250);
    assert.equal(sumCredits(creditJournal, "5410"), 1000);

    const paymentPreparation = await requestJson(
      baseUrl,
      `/v1/ap/open-items/${postedCredit.apOpenItemId}/payment-preparation?companyId=${COMPANY_ID}`,
      {
        token: adminSessionToken
      }
    );
    assert.equal(paymentPreparation.status, "not_applicable");
    assert.equal(paymentPreparation.blockerCodes.includes("credit_note_not_payable"), true);

    const bankAccount = await requestJson(baseUrl, "/v1/banking/accounts", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankName: "Nordea",
        ledgerAccountNumber: "1110",
        accountNumber: "555500001234",
        currencyCode: "SEK",
        isDefault: true
      }
    });
    const blockedProposal = await requestJson(baseUrl, "/v1/banking/payment-proposals", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        bankAccountId: bankAccount.bankAccountId,
        apOpenItemIds: [postedCredit.apOpenItemId],
        paymentDate: "2026-10-04"
      }
    });
    assert.equal(blockedProposal.error, "credit_note_not_payable");
  } finally {
    await stopServer(server);
  }
});

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
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

function sumDebits(journalEntry, accountNumber) {
  return Number(
    (journalEntry.lines || [])
      .filter((line) => line.accountNumber === accountNumber)
      .reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
      .toFixed(2)
  );
}

function sumCredits(journalEntry, accountNumber) {
  return Number(
    (journalEntry.lines || [])
      .filter((line) => line.accountNumber === accountNumber)
      .reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
      .toFixed(2)
  );
}
