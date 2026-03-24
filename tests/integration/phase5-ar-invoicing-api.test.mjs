import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.2 migration and seeds add invoicing delivery, credit-link and payment-link artifacts", async () => {
  const migration = await readText("packages/db/migrations/20260321120000_phase5_ar_invoicing_delivery.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS ar_invoice_number_series",
    "ALTER TABLE customer_invoices",
    "CREATE TABLE IF NOT EXISTS customer_invoice_lines",
    "CREATE TABLE IF NOT EXISTS customer_invoice_credit_links",
    "CREATE TABLE IF NOT EXISTS customer_invoice_issue_events",
    "CREATE TABLE IF NOT EXISTS customer_invoice_deliveries",
    "CREATE TABLE IF NOT EXISTS customer_invoice_payment_links"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321120010_phase5_ar_invoicing_delivery_seed.sql");
  for (const fragment of ["ar_invoice_number_series", "customer_invoice_deliveries", "customer_invoice_payment_links"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321121000_phase5_ar_invoicing_delivery_demo_seed.sql");
  for (const fragment of ["CRN-2101", "customer_invoice_credit_links", "peppol.validation.failed"]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Step 24 migration adds invoice legal field evaluation artifacts", async () => {
  const migration = await readText("packages/db/migrations/20260324210000_phase14_invoice_field_rules.sql");
  for (const fragment of [
    "ALTER TABLE customer_invoices",
    "CREATE TABLE IF NOT EXISTS customer_invoice_field_evaluations",
    "CREATE TABLE IF NOT EXISTS customer_invoice_field_requirements",
    "scenario_code TEXT NOT NULL",
    "blocking_rule_count INTEGER NOT NULL DEFAULT 0"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 5.2 API issues invoices idempotently, closes credits, validates Peppol delivery and creates payment links", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T14:00:00Z")
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
        legalName: "Invoice API Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        peppolScheme: "0007",
        peppolIdentifier: "5566778899",
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

    await requestJson(baseUrl, `/v1/ar/customers/${customer.customerId}/contacts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        displayName: "Billing Contact",
        email: "billing@invoice-api.test",
        roleCode: "billing",
        defaultBilling: true
      }
    });

    const item = await requestJson(baseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "API-INV-001",
        description: "Invoice API service",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    });

    const standardInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "standard",
        issueDate: "2026-03-22",
        dueDate: "2026-04-21",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });

    const firstIssue = await requestJson(baseUrl, `/v1/ar/invoices/${standardInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    const secondIssue = await requestJson(baseUrl, `/v1/ar/invoices/${standardInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(firstIssue.invoiceNumber, secondIssue.invoiceNumber);
    assert.equal(firstIssue.journalEntryId, secondIssue.journalEntryId);
    assert.equal(firstIssue.invoiceSeriesCode, "B");

    const pdfDelivery = await requestJson(baseUrl, `/v1/ar/invoices/${standardInvoice.customerInvoiceId}/deliver`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(pdfDelivery.channel, "pdf_email");
    assert.equal(pdfDelivery.recipient, "billing@invoice-api.test");

    const creditInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        originalInvoiceId: standardInvoice.customerInvoiceId,
        invoiceType: "credit_note",
        issueDate: "2026-03-23",
        dueDate: "2026-03-23",
        amendmentReason: "Full kredit av ursprungsfaktura",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });
    const issuedCredit = await requestJson(baseUrl, `/v1/ar/invoices/${creditInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(issuedCredit.invoiceSeriesCode, "C");
    assert.match(issuedCredit.invoiceNumber, /^CRN-/);

    const originalAfterCredit = await requestJson(
      baseUrl,
      `/v1/ar/invoices/${standardInvoice.customerInvoiceId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(originalAfterCredit.status, "credited");
    assert.equal(originalAfterCredit.remainingAmount, 0);

    const partialInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "partial",
        issueDate: "2026-03-24",
        dueDate: "2026-04-23",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 0.5,
            unitPrice: 1000
          }
        ]
      }
    });
    assert.equal(partialInvoice.invoiceType, "partial");

    const contract = await requestJson(baseUrl, "/v1/ar/contracts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        title: "Subscription agreement",
        startDate: "2026-03-01",
        endDate: "2026-05-31",
        invoiceFrequency: "monthly",
        currencyCode: "SEK",
        terminationRuleCode: "notice_30_days",
        creditRuleCode: "remaining_period_credit",
        status: "active",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 2,
            unitPrice: 1000
          }
        ]
      }
    });

    const subscriptionInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        sourceContractId: contract.contractId,
        invoiceType: "subscription",
        issueDate: "2026-03-25",
        dueDate: "2026-04-24",
        deliveryChannel: "peppol",
        buyerReference: "BUYER-REF-100"
      }
    });

    await requestJson(baseUrl, `/v1/ar/invoices/${subscriptionInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const peppolDelivery = await requestJson(baseUrl, `/v1/ar/invoices/${subscriptionInvoice.customerInvoiceId}/deliver`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(peppolDelivery.channel, "peppol");
    assert.equal(peppolDelivery.payloadType, "peppol_bis_billing_3");
    assert.equal(peppolDelivery.buyerReference, "BUYER-REF-100");

    const paymentLink = await requestJson(baseUrl, `/v1/ar/invoices/${subscriptionInvoice.customerInvoiceId}/payment-links`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(paymentLink.status, "active");
    assert.match(paymentLink.url, /payments\.local/);
  } finally {
    await stopServer(server);
  }
});

test("Step 24 API exposes invoice field evaluation and blocks reverse-charge issue until required fields exist", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:00:00Z")
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

    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/ar/invoices/:customerInvoiceId/field-evaluation"), true);

    const customer = await requestJson(baseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "Invoice Rules Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Regelgatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Regelgatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });

    const reverseChargeItem = await requestJson(baseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "API-RC-001",
        description: "Reverse charge service",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_RC_BUILD_SELL"
      }
    });

    const blockedInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "standard",
        issueDate: "2026-03-24",
        dueDate: "2026-04-23",
        lines: [
          {
            itemId: reverseChargeItem.arItemId,
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });

    const blockedEvaluation = await requestJson(
      baseUrl,
      `/v1/ar/invoices/${blockedInvoice.customerInvoiceId}/field-evaluation?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(blockedEvaluation.scenarioCode, "reverse_charge_invoice");
    assert.equal(blockedEvaluation.status, "blocked");
    assert.equal(blockedEvaluation.missingFieldCodes.includes("buyer_vat_number"), true);
    assert.equal(blockedEvaluation.missingFieldCodes.includes("special_legal_text"), true);

    const blockedIssue = await fetch(`${baseUrl}/v1/ar/invoices/${blockedInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyId: COMPANY_ID
      })
    });
    const blockedPayload = await blockedIssue.json();
    assert.equal(blockedIssue.status, 409);
    assert.equal(blockedPayload.error, "invoice_issue_blocked");

    const passableInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "standard",
        issueDate: "2026-03-24",
        dueDate: "2026-04-23",
        buyerVatNumber: "SE556677889901",
        specialLegalText: "Omvänd betalningsskyldighet",
        lines: [
          {
            itemId: reverseChargeItem.arItemId,
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });
    const issued = await requestJson(baseUrl, `/v1/ar/invoices/${passableInvoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(issued.status, "issued");
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
