import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.3 API exposes billing/profitability routes and hybrid change-order flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-15T10:00:00Z")
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
      "/v1/projects/:projectId/profitability-adjustments",
      "/v1/projects/:projectId/profitability-adjustments/:projectProfitabilityAdjustmentId/decide",
      "/v1/projects/:projectId/invoice-readiness-assessments"
    ]) {
      assert.equal(root.routes.includes(route), true, `${route} should be published`);
    }

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-API-143",
        projectReferenceCode: "phase14-api-143",
        displayName: "Phase 14.3 API project",
        startsOn: "2026-04-01",
        status: "active",
        billingModelCode: "retainer_capacity",
        revenueRecognitionModelCode: "over_time",
        contractValueAmount: 12000
      }
    });

    const revenuePlan = await requestJson(baseUrl, `/v1/projects/${project.projectId}/revenue-plans`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        versionLabel: "baseline",
        lines: [
          {
            recognitionDate: "2026-04-10",
            triggerTypeCode: "manual",
            amount: 12000,
            note: "baseline"
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/revenue-plans/${revenuePlan.projectRevenuePlanId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/billing-plans`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        frequencyCode: "monthly",
        triggerCode: "manual",
        startsOn: "2026-04-01",
        status: "active",
        lines: [
          {
            plannedInvoiceDate: "2026-04-10",
            amount: 12000,
            triggerCode: "manual",
            note: "baseline"
          }
        ]
      }
    });

    const adjustment = await requestJson(baseUrl, `/v1/projects/${project.projectId}/profitability-adjustments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        impactCode: "revenue",
        amount: 750,
        effectiveDate: "2026-04-12",
        reasonCode: "expansion",
        note: "API-created profitability adjustment"
      }
    });
    assert.equal(adjustment.status, "pending_review");

    const listedAdjustments = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/profitability-adjustments?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(listedAdjustments.items.length, 1);

    const decidedAdjustment = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/profitability-adjustments/${adjustment.projectProfitabilityAdjustmentId}/decide`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          decision: "approved"
        }
      }
    );
    assert.equal(decidedAdjustment.status, "approved");

    const readiness = await requestJson(baseUrl, `/v1/projects/${project.projectId}/invoice-readiness-assessments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-04-15"
      }
    });
    assert.equal(readiness.status, "ready");
    assert.equal(readiness.invoiceReadyAmount, 12000);

    const listedAssessments = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/invoice-readiness-assessments?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(listedAssessments.items.length, 1);

    const changeOrder = await requestJson(baseUrl, `/v1/projects/${project.projectId}/change-orders`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        scopeCode: "addition",
        title: "Hybrid extension",
        description: "Phase 14.3 API change order",
        revenueImpactAmount: 3000,
        costImpactAmount: 1500,
        scheduleImpactMinutes: 120,
        customerApprovalRequiredFlag: true
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        nextStatus: "priced"
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        nextStatus: "approved",
        customerApprovedAt: "2026-04-18"
      }
    });
    const applied = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "applied",
          effectiveDate: "2026-04-20",
          billingPlanFrequencyCode: "monthly",
          billingPlanTriggerCode: "change_order_approval"
        }
      }
    );
    assert.equal(applied.status, "applied");
    assert.ok(applied.appliedRevenuePlanId);
    assert.ok(applied.appliedBillingPlanId);

    const billingPlans = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/billing-plans?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(billingPlans.items.length >= 2, true);
    assert.equal(
      billingPlans.items.some((plan) => plan.projectBillingPlanId === applied.appliedBillingPlanId && plan.status === "active"),
      true
    );

    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-04-20`,
      { token: sessionToken }
    );
    assert.equal(workspace.currentBillingPlan.projectBillingPlanId, applied.appliedBillingPlanId);
    assert.equal(workspace.projectProfitabilityAdjustments.length, 1);
    assert.equal(workspace.invoiceReadinessAssessmentCount >= 1, true);
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
