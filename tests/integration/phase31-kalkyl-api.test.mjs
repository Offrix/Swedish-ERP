import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 31 migration adds kalkyl schema", async () => {
  const migration = await readText("packages/db/migrations/20260325004000_phase14_kalkyl.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS estimate_versions",
    "estimate_no TEXT NOT NULL",
    "version_no INTEGER NOT NULL",
    "lines_json JSONB NOT NULL DEFAULT '[]'::jsonb",
    "assumptions_json JSONB NOT NULL DEFAULT '[]'::jsonb"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Step 31 API creates estimates and converts them to quote payloads and project budgets", async () => {
  const enabledPlatform = createApiPlatform({
    clock: () => new Date("2026-03-25T09:30:00Z")
  });
  const enabledServer = createApiServer({
    platform: enabledPlatform,
    flags: enabledFlags()
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({
      clock: () => new Date("2026-03-25T09:30:00Z")
    }),
    flags: {
      ...enabledFlags(),
      phase10ProjectsEnabled: false
    }
  });

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.phase10ProjectsEnabled, true);
    for (const route of [
      "/v1/kalkyl/estimates",
      "/v1/kalkyl/estimates/:estimateVersionId/lines",
      "/v1/kalkyl/estimates/:estimateVersionId/convert-to-quote",
      "/v1/kalkyl/estimates/:estimateVersionId/convert-to-project-budget"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/kalkyl/estimates?companyId=${COMPANY_ID}`);
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform: enabledPlatform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const customer = await requestJson(baseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "Kalkylkund AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "30d",
        invoiceDeliveryMethod: "email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Offertgatan 10",
          postalCode: "11122",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-KALKYL-API",
        projectReferenceCode: "project-kalkyl-api",
        displayName: "Kalkyl API Project",
        customerId: customer.customerId,
        startsOn: "2026-03-20",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 180000
      }
    });

    const estimate = await requestJson(baseUrl, "/v1/kalkyl/estimates", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        projectId: project.projectId,
        title: "Offert Etapp 1",
        validFrom: "2026-03-25",
        validTo: "2026-04-25"
      }
    });
    assert.equal(estimate.status, "draft");

    await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/lines`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        lineTypeCode: "labor",
        description: "Installation och montage",
        quantity: 24,
        unitCode: "hour",
        costAmount: 12000,
        salesAmount: 24000,
        projectPhaseCode: "INSTALL"
      }
    });

    await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/assumptions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        assumptionCode: "MATERIAL_SLACK",
        description: "PÃ¥slag fÃ¶r spillmaterial",
        impactAmount: 3000
      }
    });

    const reviewed = await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/review`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(reviewed.status, "reviewed");

    const approved = await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approved.status, "approved");

    const quoted = await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/convert-to-quote`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        quoteTitle: "Offert Etapp 1 kundversion",
        validUntil: "2026-05-01"
      }
    });
    assert.equal(quoted.status, "quoted");
    assert.equal(quoted.quoteConversion.payload.lines.length, 1);
    assert.equal(quoted.quoteConversion.payload.lines[0].unitPrice, 1000);

    const converted = await requestJson(
      baseUrl,
      `/v1/kalkyl/estimates/${estimate.estimateVersionId}/convert-to-project-budget`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          projectId: project.projectId,
          budgetName: "Offertbudget Etapp 1",
          validFrom: "2026-03-25"
        }
      }
    );
    assert.equal(converted.status, "converted");
    assert.ok(converted.projectBudgetConversion.projectBudgetVersionId);

    const fetched = await requestJson(
      baseUrl,
      `/v1/kalkyl/estimates/${estimate.estimateVersionId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(fetched.status, "converted");
    assert.equal(fetched.totals.totalSalesAmount, 27000);
    assert.equal(fetched.projectBudgetConversion.lineCount, 3);

    const budgetList = await requestJson(baseUrl, `/v1/projects/${project.projectId}/budgets?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(budgetList.items.length >= 1, true);
    assert.equal(budgetList.items[0].totals.revenueAmount >= 27000, true);
  } finally {
    await stopServer(enabledServer);
    await stopServer(disabledServer);
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
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}

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
