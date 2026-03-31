import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 18.1 API exposes internal finance pilot execution runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T17:30:00Z")
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
      adminEmail: "phase18-api-owner@example.test",
      legalName: "Phase 18 API Pilot AB",
      orgNumber: "559900-9197"
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
      email: "phase18-api-finance@example.test",
      displayName: "Phase 18 API Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: financeReadyToken,
      companyId: financeReady.companyId,
      email: "phase18-api-support@example.test",
      displayName: "Phase 18 API Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });

    const started = await requestJson(baseUrl, "/v1/pilot/executions", {
      method: "POST",
      token: financeReadyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        label: "API internal finance pilot"
      }
    });
    assert.equal(started.status, "in_progress");
    assert.equal(started.scenarioSummary.pendingCount, 7);

    const blocked = await requestJson(
      baseUrl,
      `/v1/pilot/executions/${started.pilotExecutionId}/scenarios/finance_core`,
      {
        method: "POST",
        token: financeReadyToken,
        body: {
          status: "blocked",
          blockerCodes: ["close_cycle_incomplete"],
          evidenceRefs: ["runbook://finance_core/blocked"]
        }
      }
    );
    assert.equal(blocked.status, "blocked");

    for (const scenarioCode of [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "hus_claim",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations"
    ]) {
      const updated = await requestJson(
        baseUrl,
        `/v1/pilot/executions/${started.pilotExecutionId}/scenarios/${scenarioCode}`,
        {
          method: "POST",
          token: financeReadyToken,
          body: {
            status: "passed",
            evidenceRefs: [`runbook://${scenarioCode}/passed`]
          }
        }
      );
      assert.equal(updated.scenarioResults.some((item) => item.scenarioCode === scenarioCode && item.status === "passed"), true);
    }

    const completed = await requestJson(
      baseUrl,
      `/v1/pilot/executions/${started.pilotExecutionId}/complete`,
      {
        method: "POST",
        token: financeReadyToken,
        body: {
          approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
          rollbackStrategyCode: "restore_previous_live_and_reconcile",
          rollbackEvidenceRefs: ["runbook://rollback/verified"],
          notes: "Pilot API flow complete"
        }
      }
    );
    assert.equal(completed.status, "completed");
    assert.equal(completed.latestEvidenceBundleId != null, true);

    const listed = await requestJson(baseUrl, `/v1/pilot/executions?companyId=${financeReady.companyId}`, {
      token: financeReadyToken
    });
    assert.equal(listed.items.some((item) => item.pilotExecutionId === started.pilotExecutionId), true);

    const single = await requestJson(baseUrl, `/v1/pilot/executions/${started.pilotExecutionId}`, {
      token: financeReadyToken
    });
    assert.equal(single.status, "completed");

    const evidence = await requestJson(baseUrl, `/v1/pilot/executions/${started.pilotExecutionId}/evidence`, {
      token: financeReadyToken
    });
    assert.equal(evidence.evidenceBundle.bundleType, "pilot_execution");

    const profile = await requestJson(baseUrl, `/v1/tenant/bootstrap/profile?companyId=${financeReady.companyId}`, {
      token: financeReadyToken
    });
    assert.equal(profile.status, "pilot");
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
      adminDisplayName: "Phase 18 API Owner",
    legalFormCode: "AKTIEBOLAG",
    registrations: [{ registrationType: "vat", registrationValue: "configured-vat", status: "configured" }],
    fiscalYearStartDate: "2026-01-01",
    fiscalYearEndDate: "2026-12-31",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",    }
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

