import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.3 AR receivables routes toggle cleanly and the flow covers partial payment, reversal, dunning hold and aging", async () => {
  const clock = () => new Date("2026-08-12T11:00:00Z");
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
    assert.equal(root.routes.includes("/v1/ar/open-items"), true);
    assert.equal(root.routes.includes("/v1/ar/payment-matching-runs"), true);
    assert.equal(root.routes.includes("/v1/ar/dunning-runs"), true);
    assert.equal(root.routes.includes("/v1/ar/aging-snapshots"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/ar/open-items?companyId=${COMPANY_ID}`);
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
        legalName: "E2E Receivables Customer AB",
        organizationNumber: "5591223341",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET14",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
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

    const item = await requestJson(enabledBaseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        description: "E2E receivables service",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    });

    const invoice = await requestJson(enabledBaseUrl, "/v1/ar/invoices", {
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
    const issued = await requestJson(enabledBaseUrl, `/v1/ar/invoices/${invoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const openItems = await requestJson(enabledBaseUrl, `/v1/ar/open-items?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(openItems.items.length, 1);

    const matchingRun = await requestJson(enabledBaseUrl, "/v1/ar/payment-matching-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceChannel: "bank_file",
        transactions: [
          {
            bankTransactionUid: "e2e-bank-txn-5301",
            payerReference: issued.paymentReference,
            amount: 500,
            currencyCode: "SEK",
            valueDate: "2026-08-12"
          }
        ]
      }
    });
    assert.equal(matchingRun.status, "completed");

    const agingAfterPayment = await requestJson(enabledBaseUrl, "/v1/ar/aging-snapshots", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-08-12"
      }
    });
    assert.equal(agingAfterPayment.bucketTotalsJson["1_30"], 750);

    await requestJson(enabledBaseUrl, `/v1/ar/allocations/${matchingRun.allocations[0].arAllocationId}/reverse`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        reasonCode: "wrong_customer_match"
      }
    });

    await requestJson(enabledBaseUrl, `/v1/ar/open-items/${openItems.items[0].arOpenItemId}/collection-state`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        disputeFlag: true
      }
    });

    const dunningRun = await requestJson(enabledBaseUrl, "/v1/ar/dunning-runs", {
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
