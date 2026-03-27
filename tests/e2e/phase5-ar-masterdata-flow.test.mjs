import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.1 exposes AR routes and supports quote revision plus active contract plan generation end-to-end", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T11:00:00Z")
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
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.phase5ArEnabled, true);
    assert.equal(root.routes.includes("/v1/ar/customers"), true);
    assert.equal(root.routes.includes("/v1/ar/contracts/:contractId/status"), true);

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
        legalName: "E2E Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "E2E-vagen 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "E2E-vagen 1",
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
        description: "E2E recurring service",
        itemType: "service",
        unitCode: "month",
        standardPrice: 4200,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25",
        recurringFlag: true,
        projectBoundFlag: true
      }
    });

    const quote = await requestJson(baseUrl, "/v1/ar/quotes", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        title: "E2E offer",
        validUntil: "2026-06-30",
        currencyCode: "SEK",
        lines: [{ itemId: item.arItemId, quantity: 1, projectId: "project-e2e-alpha" }]
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
    const revised = await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/revise`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        lines: [{ itemId: item.arItemId, quantity: 2, projectId: "project-e2e-alpha" }]
      }
    });
    assert.equal(revised.currentVersionNo, 2);
    assert.equal(revised.versions[0].status, "sent");
    assert.equal(revised.versions[1].status, "draft");

    await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "sent"
      }
    });
    await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "accepted"
      }
    });
    const quoteLinkedInvoice = await requestJson(baseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        sourceQuoteId: quote.quoteId,
        invoiceType: "standard",
        issueDate: "2026-03-24",
        dueDate: "2026-04-23"
      }
    });
    assert.equal(quoteLinkedInvoice.primaryProjectId, "project-e2e-alpha");
    const filteredInvoices = await requestJson(
      baseUrl,
      `/v1/ar/invoices?companyId=${COMPANY_ID}&projectId=project-e2e-alpha`,
      {
        token: sessionToken
      }
    );
    assert.equal(filteredInvoices.items.some((entry) => entry.customerInvoiceId === quoteLinkedInvoice.customerInvoiceId), true);

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
    assert.equal(contract.invoicePlan[0].plannedInvoiceDate, "2026-01-01");
  } finally {
    await stopServer(server);
  }
});

test("Phase 5.1 AR routes are disabled cleanly behind the phase 5 feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T11:05:00Z")
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
      phase5ArEnabled: false
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const started = await requestJson(baseUrl, "/v1/auth/login", {
      method: "POST",
      body: {
        companyId: COMPANY_ID,
        email: DEMO_ADMIN_EMAIL
      }
    });
    const blocked = await requestJson(baseUrl, `/v1/ar/customers/${crypto.randomUUID()}?companyId=${COMPANY_ID}`, {
      token: started.sessionToken,
      expectedStatus: 503
    });
    assert.equal(blocked.error, "feature_disabled");
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
