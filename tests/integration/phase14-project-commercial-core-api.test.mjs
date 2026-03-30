import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.1 API exposes general project commercial core routes and workflow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-10T10:00:00Z")
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
      "/v1/projects/:projectId/engagements",
      "/v1/projects/:projectId/work-models",
      "/v1/projects/:projectId/work-packages",
      "/v1/projects/:projectId/delivery-milestones",
      "/v1/projects/:projectId/work-logs",
      "/v1/projects/:projectId/revenue-plans",
      "/v1/projects/:projectId/revenue-plans/:projectRevenuePlanId/approve",
      "/v1/projects/:projectId/profitability-snapshots"
    ]) {
      assert.equal(root.routes.includes(route), true, `${route} should be published`);
    }

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-API-141",
        projectReferenceCode: "phase14-api-commercial-core",
        displayName: "Phase 14.1 API project",
        startsOn: "2026-04-01",
        status: "active",
        billingModelCode: "fixed_price",
        revenueRecognitionModelCode: "over_time",
        contractValueAmount: 40000
      }
    });

    const engagement = await requestJson(baseUrl, `/v1/projects/${project.projectId}/engagements`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        displayName: "API consulting engagement",
        workModelCode: "time_only",
        startsOn: "2026-04-01",
        status: "active"
      }
    });

    const workModel = await requestJson(baseUrl, `/v1/projects/${project.projectId}/work-models`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectEngagementId: engagement.projectEngagementId,
        modelCode: "time_only",
        title: "API consulting work model"
      }
    });

    const workPackage = await requestJson(baseUrl, `/v1/projects/${project.projectId}/work-packages`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectEngagementId: engagement.projectEngagementId,
        projectWorkModelId: workModel.projectWorkModelId,
        title: "Discovery package",
        startsOn: "2026-04-01",
        endsOn: "2026-04-15",
        status: "active"
      }
    });

    const milestone = await requestJson(baseUrl, `/v1/projects/${project.projectId}/delivery-milestones`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectWorkPackageId: workPackage.projectWorkPackageId,
        title: "Discovery accepted",
        targetDate: "2026-04-15",
        plannedRevenueAmount: 25000
      }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/work-logs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectWorkPackageId: workPackage.projectWorkPackageId,
        projectDeliveryMilestoneId: milestone.projectDeliveryMilestoneId,
        workDate: "2026-04-10",
        minutes: 480,
        description: "Customer workshop and wrap-up",
        status: "approved"
      }
    });

    const revenuePlan = await requestJson(baseUrl, `/v1/projects/${project.projectId}/revenue-plans`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        versionLabel: "API revenue baseline",
        lines: [
          {
            recognitionDate: "2026-04-15",
            triggerTypeCode: "milestone_acceptance",
            amount: 25000,
            projectWorkPackageId: workPackage.projectWorkPackageId,
            projectDeliveryMilestoneId: milestone.projectDeliveryMilestoneId
          },
          {
            recognitionDate: "2026-04-30",
            triggerTypeCode: "manual",
            amount: 15000,
            projectWorkPackageId: workPackage.projectWorkPackageId
          }
        ]
      }
    });

    const approvedRevenuePlan = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/revenue-plans/${revenuePlan.projectRevenuePlanId}/approve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(approvedRevenuePlan.status, "approved");

    const profitabilitySnapshot = await requestJson(baseUrl, `/v1/projects/${project.projectId}/profitability-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-04-30"
      }
    });

    const engagements = await requestJson(baseUrl, `/v1/projects/${project.projectId}/engagements?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(engagements.items.length, 1);

    const profitabilitySnapshots = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/profitability-snapshots?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(profitabilitySnapshots.items.length, 1);
    assert.equal(
      profitabilitySnapshots.items[0].projectProfitabilitySnapshotId,
      profitabilitySnapshot.projectProfitabilitySnapshotId
    );

    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-04-30`,
      {
        token: sessionToken
      }
    );
    assert.equal(workspace.engagementCount, 1);
    assert.equal(workspace.workModelCount, 1);
    assert.equal(workspace.workPackageCount, 1);
    assert.equal(workspace.deliveryMilestoneCount, 1);
    assert.equal(workspace.approvedRevenuePlanCount, 1);
    assert.equal(workspace.currentProfitabilitySnapshotId, profitabilitySnapshot.projectProfitabilitySnapshotId);
    assert.equal(workspace.warningCodes.includes("engagement_missing"), false);
    assert.equal(workspace.warningCodes.includes("work_model_missing"), false);
    assert.equal(workspace.warningCodes.includes("approved_revenue_plan_missing"), false);
    assert.equal(
      workspace.complianceIndicatorStrip.some(
        (indicator) => indicator.indicatorCode === "commercial_core" && indicator.status === "ok" && indicator.count === 2
      ),
      true
    );
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
