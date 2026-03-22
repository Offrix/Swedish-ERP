import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.1 migration and seed add AR masterdata artifacts", async () => {
  const migration = await readText("packages/db/migrations/20260321110000_phase5_ar_masterdata.sql");
  for (const fragment of [
    "ADD COLUMN IF NOT EXISTS customer_no",
    "CREATE TABLE IF NOT EXISTS customer_contacts",
    "CREATE TABLE IF NOT EXISTS ar_items",
    "CREATE TABLE IF NOT EXISTS ar_price_lists",
    "CREATE TABLE IF NOT EXISTS quote_versions",
    "CREATE TABLE IF NOT EXISTS contracts",
    "CREATE TABLE IF NOT EXISTS invoice_plans",
    "CREATE TABLE IF NOT EXISTS ar_customer_import_batches"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321110010_phase5_ar_masterdata_seed.sql");
  for (const fragment of ["Nordic Property Services AB", "SVC-MONTHLY-OPS", "quote_versions", "invoice_plans"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Phase 5.1 API supports customer masterdata, quote revision, contract plan generation and import batches", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:30:00Z")
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

    const customer = await requestJson(baseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "API Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Hamngatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Hamngatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });

    const contact = await requestJson(baseUrl, `/v1/ar/customers/${customer.customerId}/contacts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        displayName: "Kontakt Kund",
        email: "kontakt@example.com",
        roleCode: "billing",
        defaultBilling: true
      }
    });
    assert.equal(contact.customerId, customer.customerId);

    const item = await requestJson(baseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "SUB-API",
        description: "API subscription",
        itemType: "subscription",
        unitCode: "month",
        standardPrice: 5000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25",
        recurringFlag: true
      }
    });

    const priceList = await requestJson(baseUrl, "/v1/ar/price-lists", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        priceListCode: "API-2026",
        description: "API price list",
        currencyCode: "SEK",
        validFrom: "2026-01-01",
        lines: [
          {
            itemId: item.arItemId,
            unitPrice: 5000,
            validFrom: "2026-01-01"
          }
        ]
      }
    });

    const quote = await requestJson(baseUrl, "/v1/ar/quotes", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        title: "API offer",
        validUntil: "2026-06-30",
        currencyCode: "SEK",
        priceListId: priceList.priceListId,
        lines: [{ itemId: item.arItemId, quantity: 2 }]
      }
    });

    await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "sent"
      }
    });

    const revisedQuote = await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/revise`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        lines: [{ itemId: item.arItemId, quantity: 3 }]
      }
    });
    assert.equal(revisedQuote.currentVersionNo, 2);

    await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "sent"
      }
    });
    const acceptedQuote = await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "accepted"
      }
    });
    assert.equal(acceptedQuote.status, "accepted");

    const contract = await requestJson(baseUrl, "/v1/ar/contracts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceQuoteId: quote.quoteId,
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        invoiceFrequency: "monthly",
        terminationRuleCode: "notice_30_days",
        creditRuleCode: "remaining_period_credit",
        status: "active"
      }
    });
    assert.equal(contract.invoicePlan.length, 3);

    const importBatch = await requestJson(baseUrl, "/v1/ar/customers/imports", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        batchKey: "api-import-1",
        rows: [
          {
            customerNo: "CUST-API-IMPORT-1",
            legalName: "Imported API Customer AB",
            organizationNumber: "5566778899",
            countryCode: "SE",
            languageCode: "SV",
            currencyCode: "SEK",
            paymentTermsCode: "NET30",
            invoiceDeliveryMethod: "pdf_email",
            reminderProfileCode: "standard",
            importSourceKey: "crm:api-1",
            billingAddress: {
              line1: "Importgatan 1",
              postalCode: "11157",
              city: "Stockholm",
              countryCode: "SE"
            },
            deliveryAddress: {
              line1: "Importgatan 1",
              postalCode: "11157",
              city: "Stockholm",
              countryCode: "SE"
            }
          }
        ]
      }
    });
    assert.equal(importBatch.idempotentReplay, false);

    const fetchedBatch = await requestJson(
      baseUrl,
      `/v1/ar/customers/imports/${importBatch.customerImportBatch.customerImportBatchId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(fetchedBatch.batchKey, "api-import-1");
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
