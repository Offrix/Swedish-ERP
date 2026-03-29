import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

const CONSTRUCTION_SCENARIOS = [
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
const BYGGLEt_CRITERIA = [
  "work_order_service_order",
  "material_photo_signature_evidence",
  "personalliggare",
  "simple_field_execution",
  "change_order_semantics",
  "id06_compliance"
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

test("Phase 18.3 parity board flow records green field parity against Bygglet", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T22:00:00Z")
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
      adminEmail: "phase18-parity-board-owner@example.test",
      legalName: "Phase 18 Parity Board AB",
      orgNumber: "559900-9890"
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
      email: "phase18-parity-board-finance@example.test",
      displayName: "Phase 18 Parity Board Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: companyToken,
      companyId: financeReady.companyId,
      email: "phase18-parity-board-support@example.test",
      displayName: "Phase 18 Parity Board Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });

    const pilot = await requestJson(baseUrl, "/v1/pilot/executions", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        label: "Bygglet parity pilot",
        scenarioCodes: CONSTRUCTION_SCENARIOS
      }
    });
    for (const scenarioCode of CONSTRUCTION_SCENARIOS) {
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
        pilotExecutionIds: [pilot.pilotExecutionId]
      }
    });
    await requestJson(baseUrl, `/v1/pilot/cohorts/${cohort.pilotCohortId}/assess`, {
      method: "POST",
      token: companyToken,
      body: {
        decision: "accepted",
        approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
        reusableCutoverTemplateRefs: ["cutover-template://construction-service/v1"],
        rollbackEvidenceRefs: ["runbook://rollback/verified"]
      }
    });

    const scorecard = await requestJson(baseUrl, "/v1/release/parity-scorecards", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        competitorCode: "bygglet",
        pilotCohortIds: [cohort.pilotCohortId],
        criteriaResults: BYGGLEt_CRITERIA.map((criterionCode) => ({
          criterionCode,
          status: "green",
          evidenceRefs: [`evidence://${criterionCode}/green`]
        })),
        gateResults: GO_LIVE_GATES.map((gateCode) => ({
          gateCode,
          status: "green",
          evidenceRefs: [`gate://${gateCode}/green`]
        }))
      }
    });
    assert.equal(scorecard.status, "green");

    const evidence = await requestJson(baseUrl, `/v1/release/parity-scorecards/${scorecard.parityScorecardId}/evidence`, {
      token: companyToken
    });
    assert.equal(evidence.evidenceBundle.bundleType, "parity_scorecard");
    assert.equal(evidence.evidenceBundle.relatedObjectRefs.some((ref) => ref.objectType === "pilot_cohort" && ref.objectId === cohort.pilotCohortId), true);
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
      adminDisplayName: "Phase 18 Parity Board Owner"
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
