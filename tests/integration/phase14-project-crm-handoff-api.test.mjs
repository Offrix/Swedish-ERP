import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.2 API converts accepted quote into canonical project handoff objects", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-12T10:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const root = await requestJson(baseUrl, "/", { token: sessionToken });
    for (const route of [
      "/v1/projects/quote-handoffs",
      "/v1/projects/:projectId/opportunity-links",
      "/v1/projects/:projectId/quote-links",
      "/v1/projects/:projectId/billing-plans",
      "/v1/projects/:projectId/status-updates"
    ]) {
      assert.equal(root.routes.includes(route), true, `${route} should be published`);
    }

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
        legalName: "API Handoff Customer AB",
        organizationNumber: "5566778808",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "CRM-gatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "CRM-gatan 1",
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
        itemCode: "HANDOFF-ITEM-141",
        description: "Project handoff service",
        itemType: "service",
        unitCode: "month",
        standardPrice: 12000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    });

    const quote = await requestJson(baseUrl, "/v1/ar/quotes", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        title: "API handoff quote",
        validUntil: "2026-05-31",
        currencyCode: "SEK",
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
    await requestJson(baseUrl, `/v1/ar/quotes/${quote.quoteId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        targetStatus: "accepted"
      }
    });

    const handoff = await requestJson(baseUrl, "/v1/projects/quote-handoffs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceQuoteId: quote.quoteId,
        projectCode: "P-API-142",
        projectReferenceCode: "phase14-api-handoff",
        externalSystemCode: "hubspot",
        externalOpportunityId: "deal-api-142",
        externalOpportunityRef: "Deal API 142",
        workModelCode: "service_order",
        billingPlanFrequencyCode: "monthly"
      }
    });

    assert.equal(handoff.project.projectCode, "P-API-142");
    assert.equal(handoff.quoteLink.sourceQuoteId, quote.quoteId);
    assert.equal(handoff.opportunityLink.externalOpportunityId, "deal-api-142");
    assert.equal(handoff.billingPlan.status, "active");
    assert.equal(handoff.statusUpdate.healthCode, "green");

    const opportunityLinks = await requestJson(
      baseUrl,
      `/v1/projects/${handoff.project.projectId}/opportunity-links?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const quoteLinks = await requestJson(
      baseUrl,
      `/v1/projects/${handoff.project.projectId}/quote-links?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const billingPlans = await requestJson(
      baseUrl,
      `/v1/projects/${handoff.project.projectId}/billing-plans?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const statusUpdates = await requestJson(
      baseUrl,
      `/v1/projects/${handoff.project.projectId}/status-updates?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${handoff.project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=${handoff.project.startsOn}`,
      { token: sessionToken }
    );

    assert.equal(opportunityLinks.items.length, 1);
    assert.equal(quoteLinks.items.length, 1);
    assert.equal(billingPlans.items.length, 1);
    assert.equal(statusUpdates.items.length, 1);
    assert.equal(workspace.opportunityLinkCount, 1);
    assert.equal(workspace.quoteLinkCount, 1);
    assert.equal(workspace.billingPlanCount, 1);
    assert.equal(workspace.customerContext.customerId, customer.customerId);
    assert.equal(workspace.customerContext.activeQuoteRef, quote.quoteNo);
    assert.equal(workspace.currentBillingPlan.status, "active");
  } finally {
    await stopServer(server);
  }
});

function enabledFlags() {
  return {
    phase1AuthOnboardingEnabled: true,
    phase2DocumentArchiveEnabled: true,
    phase2CompanyInboxEnabled: true,
    phase2OcrReviewEnabled: true,
    phase3LedgerEnabled: true,
    phase4VatEnabled: true,
    phase5ArEnabled: true,
    phase6ApEnabled: true,
    phase7HrEnabled: true,
    phase7TimeEnabled: true,
    phase7AbsenceEnabled: true,
    phase8PayrollEnabled: true,
    phase9BenefitsEnabled: true,
    phase9TravelEnabled: true,
    phase9PensionEnabled: true,
    phase10ProjectsEnabled: true,
    phase10FieldEnabled: true,
    phase10BuildEnabled: true
  };
}

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
