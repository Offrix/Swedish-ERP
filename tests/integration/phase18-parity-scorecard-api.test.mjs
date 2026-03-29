import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

const SERVICE_PROJECT_SCENARIOS = [
  "finance_core",
  "vat_cycle",
  "payroll_agi",
  "tax_account_reconciliation",
  "annual_reporting",
  "support_operations",
  "project_profitability"
];
const TEAMLEADER_CRITERIA = [
  "portfolio_project_status",
  "resource_capacity",
  "quote_to_project_handoff",
  "time_expense_material_to_invoice",
  "project_profitability",
  "customer_context_execution"
];
const GO_LIVE_GATES = [
  "finance_hygiene",
  "payroll_correctness",
  "regulated_submissions_recovery",
  "general_project_core",
  "field_pack_targeted",
  "trial_to_live",
  "migration_cutover",
  "api_webhooks",
  "bankid_sso_backoffice"
];

test("Phase 18.3 API exposes blocked parity scorecards when a competitor gap remains", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T21:30:00Z")
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
      adminEmail: "phase18-parity-api-owner@example.test",
      legalName: "Phase 18 Parity API AB",
      orgNumber: "559900-9797"
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
      email: "phase18-parity-api-finance@example.test",
      displayName: "Phase 18 Parity API Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: companyToken,
      companyId: financeReady.companyId,
      email: "phase18-parity-api-support@example.test",
      displayName: "Phase 18 Parity API Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });

    const pilot = await requestJson(baseUrl, "/v1/pilot/executions", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        label: "Teamleader parity pilot",
        scenarioCodes: SERVICE_PROJECT_SCENARIOS
      }
    });
    for (const scenarioCode of SERVICE_PROJECT_SCENARIOS) {
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
        segmentCode: "service_project_company",
        pilotExecutionIds: [pilot.pilotExecutionId]
      }
    });
    await requestJson(baseUrl, `/v1/pilot/cohorts/${cohort.pilotCohortId}/assess`, {
      method: "POST",
      token: companyToken,
      body: {
        decision: "accepted",
        approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
        reusableCutoverTemplateRefs: ["cutover-template://service-project/v1"],
        rollbackEvidenceRefs: ["runbook://rollback/verified"]
      }
    });

    const scorecard = await requestJson(baseUrl, "/v1/release/parity-scorecards", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        competitorCode: "teamleader",
        pilotCohortIds: [cohort.pilotCohortId],
        criteriaResults: TEAMLEADER_CRITERIA.map((criterionCode) => ({
          criterionCode,
          status: criterionCode === "resource_capacity" ? "amber" : "green",
          evidenceRefs: [`evidence://${criterionCode}`]
        })),
        gateResults: GO_LIVE_GATES.map((gateCode) => ({
          gateCode,
          status: "green",
          evidenceRefs: [`gate://${gateCode}`]
        }))
      }
    });
    assert.equal(scorecard.status, "blocked");
    assert.equal(scorecard.summary.parityAchieved, false);

    const listed = await requestJson(baseUrl, `/v1/release/parity-scorecards?companyId=${financeReady.companyId}&competitorCode=teamleader`, {
      token: companyToken
    });
    assert.equal(listed.items.some((item) => item.parityScorecardId === scorecard.parityScorecardId && item.status === "blocked"), true);
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
      adminDisplayName: "Phase 18 Parity API Owner"
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
