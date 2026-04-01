import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 27 migration adds banking statement and reconciliation runtime tables", async () => {
  const migration = await readText("packages/db/migrations/20260324240000_phase14_banking_runtime_statement_reconciliation.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS bank_statement_events",
    "CREATE TABLE IF NOT EXISTS bank_reconciliation_cases",
    "ALTER TABLE payment_orders",
    "ix_bank_statement_events_phase14_match",
    "ix_bank_reconciliation_cases_phase14_status"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Step 27 API gates statement-driven payment and tax-account effects behind explicit approval", async () => {
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
    platform.createCompanyUser({
      sessionToken,
      companyId: COMPANY_ID,
      email: "banking-field@example.test",
      displayName: "Banking Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: "banking-field@example.test"
    });

    platform.installLedgerCatalog({
      companyId: COMPANY_ID,
      actorId: "system"
    });
    const supplier = platform.createSupplier({
      companyId: COMPANY_ID,
      legalName: "API Banking Runtime AB",
      countryCode: "SE",
      currencyCode: "SEK",
      paymentTermsCode: "NET30",
      paymentRecipient: "API Banking Runtime AB",
      bankgiro: "7777-3434",
      defaultExpenseAccountNumber: "5410",
      defaultVatCode: "VAT_SE_DOMESTIC_25",
      requiresPo: false,
      actorId: "admin"
    });
    const invoice = platform.ingestSupplierInvoice({
      companyId: COMPANY_ID,
      supplierId: supplier.supplierId,
      externalInvoiceRef: "STEP27-API-INV-1",
      invoiceDate: "2026-11-15",
      dueDate: "2026-12-15",
      sourceChannel: "api",
      lines: [
        {
          description: "API runtime spend",
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
    const bankAccount = platform.createBankAccount({
      companyId: COMPANY_ID,
      bankName: "Nordea",
      ledgerAccountNumber: "1110",
      accountNumber: "9988776655",
      currencyCode: "SEK",
      actorId: "admin"
    });
    const proposal = platform.createPaymentProposal({
      companyId: COMPANY_ID,
      bankAccountId: bankAccount.bankAccountId,
      apOpenItemIds: [posted.apOpenItemId],
      paymentDate: "2026-12-15",
      actorId: "admin"
    });
    platform.approvePaymentProposal({
      companyId: COMPANY_ID,
      paymentProposalId: proposal.paymentProposalId,
      actorId: "admin"
    });
    platform.exportPaymentProposal({
      companyId: COMPANY_ID,
      paymentProposalId: proposal.paymentProposalId,
      actorId: "admin"
    });
    platform.submitPaymentProposal({
      companyId: COMPANY_ID,
      paymentProposalId: proposal.paymentProposalId,
      actorId: "admin"
    });
    const accepted = platform.acceptPaymentProposal({
      companyId: COMPANY_ID,
      paymentProposalId: proposal.paymentProposalId,
      actorId: "admin"
    });
    const paymentOrderId = accepted.orders[0].paymentOrderId;

    const imported = await requestJson(baseUrl, "/v1/banking/statement-events/import", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankAccountId: bankAccount.bankAccountId,
        statementDate: "2026-11-16",
        events: [
          {
            externalReference: "BANK-API-STEP27-BOOK",
            bookingDate: "2026-11-16",
            amount: -1250,
            linkedPaymentOrderId: paymentOrderId,
            paymentOrderAction: "booked"
          },
          {
            externalReference: "BANK-API-STEP27-TAX",
            bookingDate: "2026-11-16",
            amount: -15000,
            statementCategoryCode: "tax_account",
            counterpartyName: "Skatteverket",
            referenceText: "skattekonto"
          },
          {
            externalReference: "BANK-API-STEP27-UNMATCHED",
            bookingDate: "2026-11-16",
            amount: 300,
            counterpartyName: "Unknown",
            referenceText: "unmatched"
          }
        ]
      }
    });
    assert.equal(imported.importedCount, 3);

    const events = await requestJson(baseUrl, `/v1/banking/statement-events?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(events.items.length, 3);
    assert.equal(events.items.some((event) => event.matchStatus === "matched_payment_order"), true);
    assert.equal(events.items.some((event) => event.matchStatus === "matched_tax_account"), true);
    assert.equal(events.items.filter((event) => event.processingStatus === "reconciliation_required").length, 3);

    const taxAccountEvents = await requestJson(baseUrl, `/v1/tax-account/events?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(taxAccountEvents.items.some((event) => event.externalReference === "BANK-API-STEP27-TAX"), false);

    const reconciliationCases = await requestJson(baseUrl, `/v1/banking/reconciliation-cases?companyId=${COMPANY_ID}&status=open`, {
      token: sessionToken
    });
    assert.equal(reconciliationCases.items.length, 3);

    const paymentGate = reconciliationCases.items.find((item) => item.caseTypeCode === "payment_order_posting_gate");
    assert.ok(paymentGate);
    const approvedPaymentGate = await requestJson(
      baseUrl,
      `/v1/banking/reconciliation-cases/${paymentGate.reconciliationCaseId}/resolve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          resolutionCode: "approve_payment_order_statement",
          resolutionNote: "Approved payment order settlement from statement."
        }
      }
    );
    assert.equal(approvedPaymentGate.executedActionCode, "approve_payment_order_statement");

    const taxGate = reconciliationCases.items.find((item) => item.caseTypeCode === "tax_account_posting_gate");
    assert.ok(taxGate);
    const approvedTaxGate = await requestJson(
      baseUrl,
      `/v1/banking/reconciliation-cases/${taxGate.reconciliationCaseId}/resolve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          resolutionCode: "approve_tax_account_statement_bridge",
          resolutionNote: "Approved tax-account import from statement."
        }
      }
    );
    assert.equal(approvedTaxGate.executedActionCode, "approve_tax_account_statement_bridge");

    const resolved = await requestJson(
      baseUrl,
      `/v1/banking/reconciliation-cases/${reconciliationCases.items.find((item) => item.caseTypeCode === "unmatched_statement_event").reconciliationCaseId}/resolve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          resolutionCode: "written_off",
          resolutionNote: "Validated as unmatched bank fee."
        }
      }
    );
    assert.equal(resolved.status, "written_off");

    const fetchedEvent = await requestJson(
      baseUrl,
      `/v1/banking/statement-events/${reconciliationCases.items.find((item) => item.caseTypeCode === "unmatched_statement_event").bankStatementEventId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(fetchedEvent.processingStatus, "processed");

    const settlementLinks = await requestJson(baseUrl, `/v1/banking/settlement-links?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(settlementLinks.items.some((item) => item.paymentOrderId === paymentOrderId && item.status === "settled"), true);
    assert.equal(settlementLinks.items.some((item) => item.liabilityObjectType === "tax_account_event" && item.status === "settled"), true);

    const paymentBatches = await requestJson(baseUrl, `/v1/banking/payment-batches?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(paymentBatches.items[0].status, "settled");

    const resolvedTaxAccountEvents = await requestJson(baseUrl, `/v1/tax-account/events?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(resolvedTaxAccountEvents.items.some((event) => event.externalReference === "BANK-API-STEP27-TAX"), true);

    const forbiddenEvents = await fetch(`${baseUrl}/v1/banking/statement-events?companyId=${COMPANY_ID}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbiddenEvents.status, 403);
    await forbiddenEvents.json();
  } finally {
    await stopServer(server);
  }
});

test("Step 27 API posts bank fees, interest and settlements through statement approval", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-11-18T08:00:00Z")
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
    const bankAccount = platform.createBankAccount({
      companyId: COMPANY_ID,
      bankName: "SEB",
      ledgerAccountNumber: "1110",
      accountNumber: "5544332211",
      currencyCode: "SEK",
      actorId: "admin"
    });

    const imported = await requestJson(baseUrl, "/v1/banking/statement-events/import", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        bankAccountId: bankAccount.bankAccountId,
        statementDate: "2026-11-19",
        events: [
          {
            externalReference: "BANK-API-STEP27-FEE",
            bookingDate: "2026-11-19",
            amount: -39,
            statementCategoryCode: "bank_fee",
            referenceText: "Monthly service fee"
          },
          {
            externalReference: "BANK-API-STEP27-INT",
            bookingDate: "2026-11-19",
            amount: 18.75,
            statementCategoryCode: "interest_income",
            referenceText: "Bank interest"
          },
          {
            externalReference: "BANK-API-STEP27-SETTLE",
            bookingDate: "2026-11-19",
            amount: -450,
            statementCategoryCode: "settlement",
            offsetLedgerAccountNumber: "2310",
            referenceText: "Loan repayment"
          }
        ]
      }
    });
    assert.equal(imported.importedCount, 3);
    assert.equal(imported.matchedStatementPostingCount, 3);

    const events = await requestJson(baseUrl, `/v1/banking/statement-events?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const statementPostingEvents = events.items.filter((event) => event.matchStatus === "matched_statement_posting");
    assert.equal(statementPostingEvents.length, 3);
    assert.equal(statementPostingEvents.every((event) => event.processingStatus === "reconciliation_required"), true);

    const reconciliationCases = await requestJson(baseUrl, `/v1/banking/reconciliation-cases?companyId=${COMPANY_ID}&status=open`, {
      token: sessionToken
    });
    assert.equal(reconciliationCases.items.length, 3);
    assert.equal(reconciliationCases.items.every((item) => item.caseTypeCode === "bank_statement_posting_gate"), true);

    for (const reconciliationCase of reconciliationCases.items) {
      const resolved = await requestJson(
        baseUrl,
        `/v1/banking/reconciliation-cases/${reconciliationCase.reconciliationCaseId}/resolve`,
        {
          method: "POST",
          token: sessionToken,
          body: {
            companyId: COMPANY_ID,
            resolutionCode: "approve_bank_statement_posting",
            resolutionNote: "Approved statement posting."
          }
        }
      );
      assert.equal(resolved.executedActionCode, "approve_bank_statement_posting");
    }

    const resolvedEvents = await requestJson(baseUrl, `/v1/banking/statement-events?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const feeEvent = resolvedEvents.items.find((event) => event.externalReference === "BANK-API-STEP27-FEE");
    const interestEvent = resolvedEvents.items.find((event) => event.externalReference === "BANK-API-STEP27-INT");
    const settlementEvent = resolvedEvents.items.find((event) => event.externalReference === "BANK-API-STEP27-SETTLE");

    for (const event of [feeEvent, interestEvent, settlementEvent]) {
      assert.equal(event.processingStatus, "processed");
      assert.equal(event.matchedObjectType, "journal_entry");
      assert.ok(event.journalEntryId);
    }

    const feeJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: feeEvent.journalEntryId
    });
    assert.equal(feeJournal.lines.some((line) => line.accountNumber === "6060" && line.debitAmount === 39), true);
    assert.equal(feeJournal.lines.some((line) => line.accountNumber === "1110" && line.creditAmount === 39), true);

    const interestJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: interestEvent.journalEntryId
    });
    assert.equal(interestJournal.lines.some((line) => line.accountNumber === "1110" && line.debitAmount === 18.75), true);
    assert.equal(interestJournal.lines.some((line) => line.accountNumber === "7950" && line.creditAmount === 18.75), true);

    const settlementJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: settlementEvent.journalEntryId
    });
    assert.equal(settlementJournal.lines.some((line) => line.accountNumber === "2310" && line.debitAmount === 450), true);
    assert.equal(settlementJournal.lines.some((line) => line.accountNumber === "1110" && line.creditAmount === 450), true);
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

async function loginWithTotpOnly({ baseUrl, platform, companyId, email }) {
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
