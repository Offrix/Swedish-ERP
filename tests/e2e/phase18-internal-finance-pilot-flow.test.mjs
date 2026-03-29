import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 18.1 internal finance pilot flow links trial and parallel run into pilot evidence", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T18:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const financeReady = await bootstrapFinanceReadyCompany({
      baseUrl,
      adminEmail: "phase18-e2e-owner@example.test",
      legalName: "Phase 18 E2E Pilot AB",
      orgNumber: "559900-9296"
    });
    const financeReadyToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: financeReady.companyId,
      email: financeReady.adminEmail
    });
    const financeApprover = platform.createCompanyUser({
      sessionToken: financeReadyToken,
      companyId: financeReady.companyId,
      email: "phase18-e2e-finance@example.test",
      displayName: "Phase 18 E2E Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: financeReadyToken,
      companyId: financeReady.companyId,
      email: "phase18-e2e-support@example.test",
      displayName: "Phase 18 E2E Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });

    const trial = await requestJson(baseUrl, "/v1/trial/environments", {
      method: "POST",
      token: financeReadyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        label: "Pilot linked trial"
      }
    });
    const parallelRun = await requestJson(baseUrl, "/v1/tenant/parallel-runs", {
      method: "POST",
      token: financeReadyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        trialEnvironmentProfileId: trial.trialEnvironmentProfileId,
        runWindowDays: 14
      }
    });

    const pilot = await requestJson(baseUrl, "/v1/pilot/executions", {
      method: "POST",
      token: financeReadyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        label: "Internal linked pilot",
        trialEnvironmentProfileId: trial.trialEnvironmentProfileId,
        parallelRunPlanId: parallelRun.parallelRunPlanId
      }
    });
    assert.equal(pilot.parallelRunPlanId, parallelRun.parallelRunPlanId);

    for (const scenarioCode of [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "hus_claim",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations"
    ]) {
      await requestJson(
        baseUrl,
        `/v1/pilot/executions/${pilot.pilotExecutionId}/scenarios/${scenarioCode}`,
        {
          method: "POST",
          token: financeReadyToken,
          body: {
            status: "passed",
            evidenceRefs: [`runbook://${scenarioCode}/passed`]
          }
        }
      );
    }

    const completed = await requestJson(
      baseUrl,
      `/v1/pilot/executions/${pilot.pilotExecutionId}/complete`,
      {
        method: "POST",
        token: financeReadyToken,
        body: {
          approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
          rollbackStrategyCode: "restore_previous_live_and_reconcile",
          rollbackEvidenceRefs: ["runbook://rollback/verified"]
        }
      }
    );
    assert.equal(completed.status, "completed");

    const evidence = await requestJson(baseUrl, `/v1/pilot/executions/${pilot.pilotExecutionId}/evidence`, {
      token: financeReadyToken
    });
    assert.equal(
      evidence.evidenceBundle.relatedObjectRefs.some((ref) => ref.objectType === "trial_environment_profile" && ref.objectId === trial.trialEnvironmentProfileId),
      true
    );
    assert.equal(
      evidence.evidenceBundle.relatedObjectRefs.some((ref) => ref.objectType === "parallel_run_plan" && ref.objectId === parallelRun.parallelRunPlanId),
      true
    );
  } finally {
    await stopServer(server);
  }
});

async function bootstrapFinanceReadyCompany({ baseUrl, adminEmail, legalName, orgNumber }) {
  const onboardingRun = await requestJson(baseUrl, "/v1/tenant/bootstrap", {
    method: "POST",
    expectedStatus: 201,
    body: {
      legalName,
      orgNumber,
      adminEmail,
      adminDisplayName: "Phase 18 E2E Owner"
    }
  });
  for (const [routePath, body] of [
    [
      "registrations",
      {
        resumeToken: onboardingRun.resumeToken,
        registrations: [
          { registrationType: "f_tax", registrationValue: "configured-f-tax", status: "configured" },
          { registrationType: "vat", registrationValue: "configured-vat", status: "configured" },
          { registrationType: "employer", registrationValue: "configured-employer", status: "configured" }
        ]
      }
    ],
    [
      "chart",
      {
        resumeToken: onboardingRun.resumeToken,
        chartTemplateId: "DSAM-2026",
        voucherSeriesCodes: ["A", "B", "E", "H", "I"]
      }
    ],
    [
      "vat",
      {
        resumeToken: onboardingRun.resumeToken,
        vatScheme: "se_standard",
        filingPeriod: "monthly"
      }
    ],
    [
      "periods",
      {
        resumeToken: onboardingRun.resumeToken,
        year: 2026
      }
    ]
  ]) {
    await requestJson(baseUrl, `/v1/onboarding/runs/${onboardingRun.tenantBootstrapId}/steps/${routePath}`, {
      method: "POST",
      body
    });
  }
  return {
    companyId: onboardingRun.companyId,
    adminEmail
  };
}
