import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.2 AR invoicing routes toggle cleanly and the end-to-end flow covers issue, deliver and pay-link", async () => {
  const clock = () => new Date("2026-03-22T14:30:00Z");
  const enabledPlatform = createApiPlatform({ clock });
  const enabledServer = createApiServer({
    platform: enabledPlatform,
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
  const disabledServer = createApiServer({
    platform: createApiPlatform({ clock }),
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

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const enabledBaseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(enabledBaseUrl, "/");
    assert.equal(root.phase5ArEnabled, true);
    assert.equal(root.routes.includes("/v1/ar/invoices/:customerInvoiceId/issue"), true);
    assert.equal(root.routes.includes("/v1/ar/invoices/:customerInvoiceId/deliver"), true);
    assert.equal(root.routes.includes("/v1/ar/invoices/:customerInvoiceId/payment-links"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/ar/invoices?companyId=${COMPANY_ID}`);
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const sessionToken = await loginWithStrongAuth({
      baseUrl: enabledBaseUrl,
      platform: enabledPlatform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(enabledBaseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    const customer = await requestJson(enabledBaseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "E2E Invoice Customer AB",
        organizationNumber: "5591223344",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET14",
        invoiceDeliveryMethod: "peppol",
        reminderProfileCode: "standard",
        peppolScheme: "0007",
        peppolIdentifier: "5591223344",
        billingAddress: {
          line1: "E2E-straket 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "E2E-straket 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });

    await requestJson(enabledBaseUrl, `/v1/ar/customers/${customer.customerId}/contacts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        displayName: "E2E Billing",
        email: "ap@e2e-invoice.test",
        roleCode: "billing",
        defaultBilling: true
      }
    });

    const item = await requestJson(enabledBaseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        description: "E2E managed service",
        itemType: "subscription",
        unitCode: "month",
        standardPrice: 4200,
        revenueAccountNumber: "3310",
        vatCode: "VAT_SE_DOMESTIC_25",
        recurringFlag: true
      }
    });

    const contract = await requestJson(enabledBaseUrl, "/v1/ar/contracts", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        title: "E2E platform agreement",
        startDate: "2026-03-01",
        endDate: "2026-06-30",
        invoiceFrequency: "monthly",
        currencyCode: "SEK",
        terminationRuleCode: "notice_30_days",
        creditRuleCode: "remaining_period_credit",
        status: "active",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 1,
            unitPrice: 4200
          }
        ]
      }
    });

    const invoice = await requestJson(enabledBaseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        sourceContractId: contract.contractId,
        invoiceType: "subscription",
        issueDate: "2026-03-22",
        dueDate: "2026-04-05",
        deliveryChannel: "peppol",
        buyerReference: "E2E-BUYER-REF"
      }
    });

    const issued = await requestJson(enabledBaseUrl, `/v1/ar/invoices/${invoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.match(issued.invoiceNumber, /^INV-/);
    assert.equal(issued.status, "issued");

    const delivered = await requestJson(enabledBaseUrl, `/v1/ar/invoices/${invoice.customerInvoiceId}/deliver`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(delivered.channel, "peppol");
    assert.equal(delivered.payload.references.buyerReference, "E2E-BUYER-REF");

    const payLink = await requestJson(enabledBaseUrl, `/v1/ar/invoices/${invoice.customerInvoiceId}/payment-links`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        providerCode: "internal_mock"
      }
    });
    assert.equal(payLink.status, "active");
  } finally {
    await stopServer(disabledServer);
    await stopServer(enabledServer);
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
