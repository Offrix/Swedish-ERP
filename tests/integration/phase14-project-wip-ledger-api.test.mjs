import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.2 API exposes revenue-recognition and WIP ledger bridge routes with journal-backed posting", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-05-31T10:00:00Z")
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
      "/v1/projects/:projectId/revenue-recognition-plans",
      "/v1/projects/:projectId/revenue-recognition-plans/:projectRevenueRecognitionPlanId/activate",
      "/v1/projects/:projectId/wip-ledger-bridges"
    ]) {
      assert.equal(root.routes.includes(route), true, `${route} should be published`);
    }
    assert.equal(
      root.routeContracts.some(
        (routeContract) =>
          routeContract.method === "POST"
          && routeContract.path === "/v1/projects/:projectId/revenue-recognition-plans"
          && routeContract.requiredActionClass === "project_revenue_recognition_plan_create"
      ),
      true
    );
    assert.equal(
      root.routeContracts.some(
        (routeContract) =>
          routeContract.method === "POST"
          && routeContract.path === "/v1/projects/:projectId/revenue-recognition-plans/:projectRevenueRecognitionPlanId/activate"
          && routeContract.requiredActionClass === "project_revenue_recognition_plan_activate"
      ),
      true
    );
    assert.equal(
      root.routeContracts.some(
        (routeContract) =>
          routeContract.method === "POST"
          && routeContract.path === "/v1/projects/:projectId/wip-ledger-bridges"
          && routeContract.requiredActionClass === "project_wip_ledger_bridge_post"
      ),
      true
    );

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });
    platform.ensureAccountingYearPeriod({
      companyId: COMPANY_ID,
      fiscalYear: 2026,
      actorId: "phase14-2-api"
    });

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-API-142",
        projectReferenceCode: "phase14-api-wip-ledger",
        displayName: "Phase 14.2 API project",
        startsOn: "2026-04-01",
        status: "active",
        billingModelCode: "fixed_price",
        revenueRecognitionModelCode: "over_time",
        contractValueAmount: 100000
      }
    });

    platform.createProjectAgreement({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      agreementNo: "AGR-API-142",
      title: "Signed API agreement",
      status: "signed",
      commercialModelCode: "project_core_generic",
      billingModelCode: "fixed_price",
      revenueRecognitionModelCode: "over_time",
      signedOn: "2026-04-01",
      effectiveFrom: "2026-04-01",
      contractValueAmount: 100000,
      actorId: "phase14-2-api"
    });
    platform.createProjectBudgetVersion({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      budgetName: "API budget",
      validFrom: "2026-04-01",
      lines: [
        { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202604", amount: 50000 },
        { lineKind: "cost", categoryCode: "other_cost", reportingPeriod: "202604", amount: 15000 }
      ],
      actorId: "phase14-2-api"
    });
    const revenuePlan = platform.createProjectRevenuePlan({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      versionLabel: "api-baseline",
      lines: [
        {
          recognitionDate: "2026-04-30",
          triggerTypeCode: "manual",
          amount: 50000,
          note: "API revenue plan"
        }
      ],
      actorId: "phase14-2-api"
    });
    platform.approveProjectRevenuePlan({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      projectRevenuePlanId: revenuePlan.projectRevenuePlanId,
      actorId: "phase14-2-api"
    });

    const recognitionPlan = await requestJson(baseUrl, `/v1/projects/${project.projectId}/revenue-recognition-plans`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceProjectRevenuePlanId: revenuePlan.projectRevenuePlanId
      }
    });
    assert.equal(recognitionPlan.status, "draft");
    assert.equal(recognitionPlan.journalRules.contractAssetAccountNumber, "1620");

    const recognitionPlans = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/revenue-recognition-plans?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(recognitionPlans.items.length, 1);

    const activatedPlan = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/revenue-recognition-plans/${recognitionPlan.projectRevenueRecognitionPlanId}/activate`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(activatedPlan.status, "active");

    const firstBridge = await requestJson(baseUrl, `/v1/projects/${project.projectId}/wip-ledger-bridges`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-04-30"
      }
    });
    assert.equal(firstBridge.status, "posted");
    assert.equal(firstBridge.targetContractAssetAmount, 50000);
    assert.equal(firstBridge.deltaContractAssetAmount, 50000);

    const replayBridge = await requestJson(baseUrl, `/v1/projects/${project.projectId}/wip-ledger-bridges`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-04-30"
      }
    });
    assert.equal(replayBridge.projectWipLedgerBridgeId, firstBridge.projectWipLedgerBridgeId);

    const bridges = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/wip-ledger-bridges?companyId=${COMPANY_ID}&reportingPeriod=202604`,
      { token: sessionToken }
    );
    assert.equal(bridges.items.length, 1);

    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-05-31`,
      { token: sessionToken }
    );
    assert.equal(
      workspace.currentProjectRevenueRecognitionPlan.projectRevenueRecognitionPlanId,
      recognitionPlan.projectRevenueRecognitionPlanId
    );
    assert.equal(workspace.currentProjectWipLedgerBridge.projectWipLedgerBridgeId, firstBridge.projectWipLedgerBridgeId);

    const journal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: firstBridge.journalEntryId
    });
    assert.equal(journal.lines.some((line) => line.accountNumber === "1620" && line.debitAmount === 50000), true);
    assert.equal(journal.lines.some((line) => line.accountNumber === "3090" && line.creditAmount === 50000), true);
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
