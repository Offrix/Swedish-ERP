import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

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
const FINANCE_SCENARIOS = [
  "finance_core",
  "vat_cycle",
  "payroll_agi",
  "tax_account_reconciliation",
  "annual_reporting",
  "support_operations"
];
const SERVICE_PROJECT_SCENARIOS = [
  ...FINANCE_SCENARIOS,
  "project_profitability"
];
const FINANCE_CRITERIA = [
  "finance_ready_tenant_setup",
  "accounting_ap_ar_bank_vat",
  "payroll_agi",
  "annual_reporting_declarations",
  "integrations_api_webhooks",
  "migration_support_operations"
];
const SERVICE_CRITERIA = [
  "portfolio_project_status",
  "resource_capacity",
  "quote_to_project_handoff",
  "time_expense_material_to_invoice",
  "project_profitability",
  "customer_context_execution"
];
const GREEN_MOVES = [
  "tax_account_cockpit",
  "unified_receipts_recovery",
  "migration_concierge",
  "safe_trial_to_live",
  "project_profitability_mission_control"
].map((moveCode) => ({
  moveCode,
  status: "green",
  evidenceRefs: [`advantage://${moveCode}/green`]
}));

test("Phase 18.4 API exposes blocked advantage release bundles when parity coverage is incomplete", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T22:45:00Z")
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
      adminEmail: "phase18-advantage-api-owner@example.test",
      legalName: "Phase 18 Advantage API AB",
      orgNumber: "559901-0013"
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
      email: "phase18-advantage-api-finance@example.test",
      displayName: "Phase 18 Advantage API Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: companyToken,
      companyId: financeReady.companyId,
      email: "phase18-advantage-api-support@example.test",
      displayName: "Phase 18 Advantage API Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });

    const financeScorecard = await createAcceptedCohortAndParityScorecard({
      baseUrl,
      token: companyToken,
      companyId: financeReady.companyId,
      approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
      label: "Finance parity",
      segmentCode: "finance_payroll_ab",
      scenarioCodes: FINANCE_SCENARIOS,
      competitorCode: "fortnox",
      criteriaCodes: FINANCE_CRITERIA,
      cutoverTemplateRef: "cutover-template://finance/v1"
    });
    const serviceScorecard = await createAcceptedCohortAndParityScorecard({
      baseUrl,
      token: companyToken,
      companyId: financeReady.companyId,
      approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
      label: "Service parity",
      segmentCode: "service_project_company",
      scenarioCodes: SERVICE_PROJECT_SCENARIOS,
      competitorCode: "teamleader",
      criteriaCodes: SERVICE_CRITERIA,
      cutoverTemplateRef: "cutover-template://service/v1"
    });

    const blockedBundle = await requestJson(baseUrl, "/v1/release/advantage-bundles", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        parityScorecardIds: [financeScorecard.parityScorecardId, serviceScorecard.parityScorecardId],
        moveResults: GREEN_MOVES
      }
    });
    assert.equal(blockedBundle.status, "blocked");
    assert.deepEqual(blockedBundle.summary.missingParityCategories, ["field_vertical"]);

    const listed = await requestJson(baseUrl, `/v1/release/advantage-bundles?companyId=${financeReady.companyId}`, {
      token: companyToken
    });
    assert.equal(
      listed.items.some(
        (item) => item.advantageReleaseBundleId === blockedBundle.advantageReleaseBundleId && item.status === "blocked"
      ),
      true
    );

    const evidence = await requestJson(
      baseUrl,
      `/v1/release/advantage-bundles/${blockedBundle.advantageReleaseBundleId}/evidence`,
      { token: companyToken }
    );
    assert.equal(evidence.evidenceBundle.bundleType, "advantage_release_bundle");
  } finally {
    await stopServer(server);
  }
});

async function createAcceptedCohortAndParityScorecard({
  baseUrl,
  token,
  companyId,
  approvalActorIds,
  label,
  segmentCode,
  scenarioCodes,
  competitorCode,
  criteriaCodes,
  cutoverTemplateRef
}) {
  const pilot = await requestJson(baseUrl, "/v1/pilot/executions", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId,
      label,
      scenarioCodes
    }
  });
  for (const scenarioCode of scenarioCodes) {
    await requestJson(baseUrl, `/v1/pilot/executions/${pilot.pilotExecutionId}/scenarios/${scenarioCode}`, {
      method: "POST",
      token,
      body: {
        status: "passed",
        evidenceRefs: [`runbook://${scenarioCode}/passed`]
      }
    });
  }
  await requestJson(baseUrl, `/v1/pilot/executions/${pilot.pilotExecutionId}/complete`, {
    method: "POST",
    token,
    body: {
      approvalActorIds,
      rollbackStrategyCode: "restore_previous_live_and_reconcile",
      rollbackEvidenceRefs: ["runbook://rollback/verified"]
    }
  });
  const cohort = await requestJson(baseUrl, "/v1/pilot/cohorts", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId,
      segmentCode,
      pilotExecutionIds: [pilot.pilotExecutionId]
    }
  });
  await requestJson(baseUrl, `/v1/pilot/cohorts/${cohort.pilotCohortId}/assess`, {
    method: "POST",
    token,
    body: {
      decision: "accepted",
      approvalActorIds,
      reusableCutoverTemplateRefs: [cutoverTemplateRef],
      rollbackEvidenceRefs: ["runbook://rollback/verified"]
    }
  });
  return requestJson(baseUrl, "/v1/release/parity-scorecards", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId,
      competitorCode,
      pilotCohortIds: [cohort.pilotCohortId],
      criteriaResults: criteriaCodes.map((criterionCode) => ({
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
}

async function bootstrapFinanceReadyCompany({ baseUrl, adminEmail, legalName, orgNumber }) {
  const onboardingRun = await requestJson(baseUrl, "/v1/tenant/bootstrap", {
    method: "POST",
    expectedStatus: 201,
    body: {
      legalName,
      orgNumber,
      adminEmail,
      adminDisplayName: "Phase 18 Advantage API Owner"
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
