import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

const CONSTRUCTION_SEGMENT_SCENARIOS = [
  "finance_core",
  "vat_cycle",
  "payroll_agi",
  "hus_claim",
  "tax_account_reconciliation",
  "annual_reporting",
  "support_operations",
  "project_profitability",
  "personalliggare_id06"
];

test("Phase 18.2 segment cohort flow proves construction service pilot acceptance", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T20:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const financeReady = await bootstrapFinanceReadyCompany({
      baseUrl,
      adminEmail: "phase18-segment-owner@example.test",
      legalName: "Phase 18 Construction Pilot AB",
      orgNumber: "559900-9593"
    });
    const companyToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: financeReady.companyId,
      email: financeReady.adminEmail
    });
    const financeApprover = platform.createCompanyUser({
      sessionToken: companyToken,
      companyId: financeReady.companyId,
      email: "phase18-segment-finance@example.test",
      displayName: "Phase 18 Segment Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: companyToken,
      companyId: financeReady.companyId,
      email: "phase18-segment-support@example.test",
      displayName: "Phase 18 Segment Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });

    const trial = await requestJson(baseUrl, "/v1/trial/environments", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        label: "Construction trial"
      }
    });
    const parallelRun = await requestJson(baseUrl, "/v1/tenant/parallel-runs", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        trialEnvironmentProfileId: trial.trialEnvironmentProfileId,
        runWindowDays: 21
      }
    });
    const pilot = await requestJson(baseUrl, "/v1/pilot/executions", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        label: "Construction service pilot",
        scenarioCodes: CONSTRUCTION_SEGMENT_SCENARIOS,
        trialEnvironmentProfileId: trial.trialEnvironmentProfileId,
        parallelRunPlanId: parallelRun.parallelRunPlanId
      }
    });

    for (const scenarioCode of CONSTRUCTION_SEGMENT_SCENARIOS) {
      await requestJson(baseUrl, `/v1/pilot/executions/${pilot.pilotExecutionId}/scenarios/${scenarioCode}`, {
        method: "POST",
        token: companyToken,
        body: {
          status: "passed",
          evidenceRefs: [`runbook://${scenarioCode}/passed`]
        }
      });
    }

    await requestJson(baseUrl, `/v1/pilot/executions/${pilot.pilotExecutionId}/complete`, {
      method: "POST",
      token: companyToken,
      body: {
        approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
        rollbackStrategyCode: "restore_previous_live_and_reconcile",
        rollbackEvidenceRefs: ["runbook://rollback/verified"]
      }
    });

    const cohort = await requestJson(baseUrl, "/v1/pilot/cohorts", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        segmentCode: "construction_service_id06",
        label: "Construction segment cohort",
        pilotExecutionIds: [pilot.pilotExecutionId]
      }
    });
    assert.equal(cohort.status, "running");
    assert.equal(cohort.coverageSummary.readyForAcceptance, true);

    const accepted = await requestJson(baseUrl, `/v1/pilot/cohorts/${cohort.pilotCohortId}/assess`, {
      method: "POST",
      token: companyToken,
      body: {
        decision: "accepted",
        approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
        reusableCutoverTemplateRefs: ["cutover-template://construction-service/v1"],
        rollbackEvidenceRefs: ["runbook://rollback/verified"],
        notes: "Construction service segment accepted."
      }
    });
    assert.equal(accepted.status, "accepted");

    const evidence = await requestJson(baseUrl, `/v1/pilot/cohorts/${cohort.pilotCohortId}/evidence`, {
      token: companyToken
    });
    assert.equal(evidence.evidenceBundle.relatedObjectRefs.some((ref) => ref.objectType === "pilot_execution" && ref.objectId === pilot.pilotExecutionId), true);
    assert.equal(evidence.evidenceBundle.relatedObjectRefs.some((ref) => ref.objectType === "company" && ref.objectId === financeReady.companyId), true);
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
      adminDisplayName: "Phase 18 Segment Owner",
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

