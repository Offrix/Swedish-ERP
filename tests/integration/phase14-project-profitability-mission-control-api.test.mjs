import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.3 API exposes profitability mission control snapshots with blocker and risk truth", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-05-20T10:00:00Z")
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
    assert.equal(
      root.routes.includes("/v1/projects/:projectId/profitability-mission-control-snapshots"),
      true
    );
    assert.equal(
      root.routeContracts.some(
        (routeContract) =>
          routeContract.method === "POST"
          && routeContract.path === "/v1/projects/:projectId/profitability-mission-control-snapshots"
          && routeContract.requiredActionClass === "project_profitability_mission_control_materialize"
      ),
      true
    );

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-API-143-MC",
        projectReferenceCode: "phase14-api-143-mc",
        displayName: "Phase 14.3 API mission control project",
        startsOn: "2026-05-01",
        status: "active",
        billingModelCode: "retainer_capacity",
        revenueRecognitionModelCode: "over_time",
        contractValueAmount: 24000
      }
    });

    platform.createProjectAgreement({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      agreementNo: "AGR-API-143-MC",
      title: "API mission control agreement",
      status: "signed",
      commercialModelCode: "project_core_generic",
      billingModelCode: "retainer_capacity",
      revenueRecognitionModelCode: "over_time",
      signedOn: "2026-05-01",
      effectiveFrom: "2026-05-01",
      contractValueAmount: 24000,
      actorId: "phase14-3-api"
    });
    const revenuePlan = platform.createProjectRevenuePlan({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      versionLabel: "baseline",
      lines: [
        {
          recognitionDate: "2026-05-10",
          triggerTypeCode: "manual",
          amount: 24000,
          note: "API mission-control baseline"
        }
      ],
      actorId: "phase14-3-api"
    });
    platform.approveProjectRevenuePlan({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      projectRevenuePlanId: revenuePlan.projectRevenuePlanId,
      actorId: "phase14-3-api"
    });
    platform.createProjectBillingPlan({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      frequencyCode: "monthly",
      triggerCode: "manual",
      startsOn: "2026-05-01",
      status: "active",
      lines: [
        {
          plannedInvoiceDate: "2026-05-10",
          amount: 24000,
          triggerCode: "manual",
          note: "API mission-control baseline"
        }
      ],
      actorId: "phase14-3-api"
    });
    const statusUpdate = platform.createProjectStatusUpdate({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      statusDate: "2026-05-18",
      healthCode: "amber",
      progressPercent: 40,
      blockerCodes: ["customer_signoff_pending"],
      atRiskReason: "Customer signoff is delayed",
      note: "API weekly steering update",
      actorId: "phase14-3-api"
    });
    platform.createProjectProfitabilityAdjustment({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      impactCode: "margin",
      amount: 100,
      effectiveDate: "2026-05-19",
      reasonCode: "manual_review",
      actorId: "phase14-3-api"
    });
    platform.createProjectRisk({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      title: "Delayed signoff",
      description: "Customer signoff may slip",
      categoryCode: "schedule",
      severityCode: "critical",
      probabilityCode: "high",
      mitigationPlan: "Escalate to sponsor",
      dueDate: "2026-05-19",
      sourceProjectStatusUpdateId: statusUpdate.projectStatusUpdateId,
      actorId: "phase14-3-api"
    });

    const snapshot = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/profitability-mission-control-snapshots`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          cutoffDate: "2026-05-20"
        }
      }
    );
    assert.equal(snapshot.healthCode, "red");
    assert.equal(snapshot.atRiskFlag, true);
    assert.equal(snapshot.blockerCodes.includes("CUSTOMER_SIGNOFF_PENDING"), true);
    assert.equal(snapshot.reviewCodes.includes("profitability_adjustment_pending_review"), true);
    assert.equal(snapshot.reviewCodes.includes("project_risk_attention_required"), true);
    assert.equal(snapshot.riskSummary.criticalRiskCount, 1);
    assert.equal(snapshot.revenueSummary.approvedValueAmount, 24000);
    assert.equal(snapshot.revenueSummary.invoiceReadyAmount, 24000);

    const listedSnapshots = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/profitability-mission-control-snapshots?companyId=${COMPANY_ID}&reportingPeriod=202605`,
      { token: sessionToken }
    );
    assert.equal(listedSnapshots.items.length, 1);

    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-05-20`,
      { token: sessionToken }
    );
    assert.equal(
      workspace.currentProjectProfitabilityMissionControlSnapshot.projectProfitabilityMissionControlSnapshotId,
      snapshot.projectProfitabilityMissionControlSnapshotId
    );
    assert.equal(workspace.warningCodes.includes("profitability_mission_control_missing"), false);
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
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())
    ? crypto.randomUUID()
    : null;
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
