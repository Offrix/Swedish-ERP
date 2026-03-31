import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.3 migration and seeds add open-item, matching, dunning and aging artifacts", async () => {
  const migration = await readText("packages/db/migrations/20260321130000_phase5_ar_receivables_dunning_matching.sql");
  for (const fragment of [
    "ALTER TABLE ar_open_items",
    "CREATE TABLE IF NOT EXISTS ar_open_item_events",
    "CREATE TABLE IF NOT EXISTS ar_payment_matching_runs",
    "CREATE TABLE IF NOT EXISTS ar_allocations",
    "CREATE TABLE IF NOT EXISTS ar_unmatched_bank_receipts",
    "CREATE TABLE IF NOT EXISTS ar_dunning_runs",
    "CREATE TABLE IF NOT EXISTS ar_writeoffs",
    "CREATE TABLE IF NOT EXISTS ar_aging_snapshots"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321130010_phase5_ar_receivables_dunning_matching_seed.sql");
  for (const fragment of ["ar_open_items", "ar_allocations", "ar_dunning_runs", "ar_aging_snapshots"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321131000_phase5_ar_receivables_dunning_matching_demo_seed.sql");
  for (const fragment of ["demo-bank-txn-1101-part", "dunning:stage_2:demo:2026-06-30", "ar_writeoffs"]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Phase 5.3 API handles payment matching, reversals, dunning and aging snapshots", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-08-12T10:00:00Z")
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
      phase5ArEnabled: true
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

    const customer = await requestJson(baseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "Receivables API Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Fakturagatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Fakturagatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });

    const item = await requestJson(baseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "API-AR-5301",
        description: "Receivables service",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    });

    const invoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "standard",
        issueDate: "2026-07-01",
        dueDate: "2026-07-15",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });

    const issued = await requestJson(baseUrl, `/v1/ar/invoices/${invoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const openItems = await requestJson(baseUrl, `/v1/ar/open-items?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(openItems.items.length, 1);

    const matchingRun = await requestJson(baseUrl, "/v1/ar/payment-matching-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceChannel: "bank_file",
        transactions: [
          {
            bankTransactionUid: "api-bank-txn-5301",
            payerReference: issued.paymentReference,
            amount: 500,
            currencyCode: "SEK",
            valueDate: "2026-08-12"
          }
        ]
      }
    });
    assert.equal(matchingRun.allocations.length, 1);
    assert.equal(matchingRun.status, "completed");

    const openItemAfterPayment = await requestJson(
      baseUrl,
      `/v1/ar/open-items/${openItems.items[0].arOpenItemId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(openItemAfterPayment.status, "partially_settled");
    assert.equal(openItemAfterPayment.openAmount, 750);

    const reversed = await requestJson(baseUrl, `/v1/ar/allocations/${matchingRun.allocations[0].arAllocationId}/reverse`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        reasonCode: "wrong_customer_match"
      }
    });
    assert.equal(reversed.status, "reversed");

    await requestJson(baseUrl, `/v1/ar/open-items/${openItems.items[0].arOpenItemId}/collection-state`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        disputeFlag: true
      }
    });

    const dunningRun = await requestJson(baseUrl, "/v1/ar/dunning-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        runDate: "2026-08-12",
        stageCode: "stage_1"
      }
    });
    assert.equal(dunningRun.summary.skipped, 1);
    assert.equal(dunningRun.items[0].skipReasonCode, "dunning_hold");

    const aging = await requestJson(baseUrl, "/v1/ar/aging-snapshots", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-08-12"
      }
    });
    assert.equal(aging.bucketTotalsJson["1_30"], 1250);
  } finally {
    await stopServer(server);
  }
});

test("Phase 8.1 API posts bad-debt VAT relief with dual control and blocks it after partial settlement", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-02T10:00:00Z")
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
      phase5ArEnabled: true
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
      body: { companyId: COMPANY_ID }
    });

    const customer = await requestJson(baseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "Bad Debt Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Fakturagatan 2",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Fakturagatan 2",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });

    const item = await requestJson(baseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "API-AR-8101",
        description: "Bad debt eligible service",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    });

    const firstInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "standard",
        issueDate: "2026-07-01",
        dueDate: "2026-07-31",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/ar/invoices/${firstInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: { companyId: COMPANY_ID }
    });

    const firstOpenItems = await requestJson(baseUrl, `/v1/ar/open-items?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const firstOpenItem = firstOpenItems.items.find((candidate) => candidate.customerInvoiceId === firstInvoice.customerInvoiceId);
    assert.ok(firstOpenItem);

    const writeoff = await requestJson(baseUrl, `/v1/ar/open-items/${firstOpenItem.arOpenItemId}/writeoffs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        writeoffAmount: 1250,
        writeoffDate: "2026-09-01",
        reasonCode: "confirmed_customer_loss",
        applyBadDebtVatRelief: true,
        policyLimitAmount: 2000,
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }
    });
    assert.equal(writeoff.badDebtVatReliefApplied, true);
    assert.equal(writeoff.badDebtVatReliefAmount, 250);
    assert.equal(writeoff.badDebtVatDecisionIds.length, 1);

    const writeoffJournal = await requestJson(
      baseUrl,
      `/v1/ledger/journal-entries/${writeoff.journalEntryId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    const vatDecision = await requestJson(
      baseUrl,
      `/v1/vat/decisions/${writeoff.badDebtVatDecisionIds[0]}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    const writtenOffOpenItem = await requestJson(
      baseUrl,
      `/v1/ar/open-items/${firstOpenItem.arOpenItemId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );

    assert.equal(vatDecision.decisionCategory, "bad_debt_adjustment");
    assert.equal(sumJournalAmount(writeoffJournal, "6900", "debit"), 1000);
    assert.equal(sumJournalAmount(writeoffJournal, "2610", "debit"), 250);
    assert.equal(sumJournalAmount(writeoffJournal, "1210", "credit"), 1250);
    assert.equal(writeoffJournal.metadataJson.postingApprovalApprovedByActorId, "finance-approver");
    assert.equal(writeoffJournal.metadataJson.postingApprovalRoleCode, "finance_manager");
    assert.equal(writtenOffOpenItem.status, "written_off");
    assert.equal(writtenOffOpenItem.openAmount, 0);

    const secondInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "standard",
        issueDate: "2026-07-05",
        dueDate: "2026-08-04",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });

    const secondIssued = await requestJson(baseUrl, `/v1/ar/invoices/${secondInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: { companyId: COMPANY_ID }
    });

    const secondOpenItems = await requestJson(baseUrl, `/v1/ar/open-items?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const secondOpenItem = secondOpenItems.items.find((candidate) => candidate.customerInvoiceId === secondInvoice.customerInvoiceId);
    assert.ok(secondOpenItem);

    const matchingRun = await requestJson(baseUrl, "/v1/ar/payment-matching-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceChannel: "bank_file",
        transactions: [
          {
            bankTransactionUid: "api-bank-txn-8101-partial",
            payerReference: secondIssued.paymentReference,
            amount: 500,
            currencyCode: "SEK",
            valueDate: "2026-08-15"
          }
        ]
      }
    });
    assert.equal(matchingRun.allocations.length, 1);

    const blocked = await requestJson(baseUrl, `/v1/ar/open-items/${secondOpenItem.arOpenItemId}/writeoffs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        writeoffAmount: 750,
        writeoffDate: "2026-09-02",
        reasonCode: "confirmed_customer_loss",
        applyBadDebtVatRelief: true,
        policyLimitAmount: 2000,
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }
    });
    assert.equal(blocked.error, "bad_debt_vat_review_required");
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
  assert.equal(response.status, expectedStatus);
  return payload;
}

function sumJournalAmount(journal, accountNumber, side) {
  return journal.lines
    .filter((line) => line.accountNumber === accountNumber)
    .reduce((sum, line) => sum + Number(side === "debit" ? line.debitAmount || 0 : line.creditAmount || 0), 0);
}
