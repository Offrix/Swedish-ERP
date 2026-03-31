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
const ADVANTAGE_MOVE_RESULTS = [
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

const RELEASE_SLICES = [
  {
    label: "Finance advantage parity",
    segmentCode: "finance_payroll_ab",
    competitorCode: "fortnox",
    cutoverTemplateRef: "cutover-template://finance/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations"
    ],
    criteriaCodes: [
      "finance_ready_tenant_setup",
      "accounting_ap_ar_bank_vat",
      "payroll_agi",
      "annual_reporting_declarations",
      "integrations_api_webhooks",
      "migration_support_operations"
    ]
  },
  {
    label: "Service advantage parity",
    segmentCode: "service_project_company",
    competitorCode: "teamleader",
    cutoverTemplateRef: "cutover-template://service/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations",
      "project_profitability"
    ],
    criteriaCodes: [
      "portfolio_project_status",
      "resource_capacity",
      "quote_to_project_handoff",
      "time_expense_material_to_invoice",
      "project_profitability",
      "customer_context_execution"
    ]
  },
  {
    label: "Field advantage parity",
    segmentCode: "construction_service_id06",
    competitorCode: "bygglet",
    cutoverTemplateRef: "cutover-template://construction/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "hus_claim",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations",
      "project_profitability",
      "personalliggare_id06"
    ],
    criteriaCodes: [
      "work_order_service_order",
      "material_photo_signature_evidence",
      "personalliggare",
      "simple_field_execution",
      "change_order_semantics",
      "id06_compliance"
    ]
  }
];

test("Phase 18.4 end-to-end flow releases advantage bundle after full parity coverage", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T23:00:00Z")
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
      adminEmail: "phase18-advantage-e2e-owner@example.test",
      legalName: "Phase 18 Advantage E2E AB",
      orgNumber: "559900-9999"
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
      email: "phase18-advantage-e2e-finance@example.test",
      displayName: "Phase 18 Advantage E2E Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: companyToken,
      companyId: financeReady.companyId,
      email: "phase18-advantage-e2e-support@example.test",
      displayName: "Phase 18 Advantage E2E Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });
    const approvalActorIds = [financeApprover.user.userId, supportApprover.user.userId];

    const parityScorecardIds = [];
    for (const slice of RELEASE_SLICES) {
      const pilot = await requestJson(baseUrl, "/v1/pilot/executions", {
        method: "POST",
        token: companyToken,
        expectedStatus: 201,
        body: {
          companyId: financeReady.companyId,
          label: slice.label,
          scenarioCodes: slice.scenarioCodes
        }
      });
      for (const scenarioCode of slice.scenarioCodes) {
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
          approvalActorIds,
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
          segmentCode: slice.segmentCode,
          pilotExecutionIds: [pilot.pilotExecutionId]
        }
      });
      await requestJson(baseUrl, `/v1/pilot/cohorts/${cohort.pilotCohortId}/assess`, {
        method: "POST",
        token: companyToken,
        body: {
          decision: "accepted",
          approvalActorIds,
          reusableCutoverTemplateRefs: [slice.cutoverTemplateRef],
          rollbackEvidenceRefs: ["runbook://rollback/verified"]
        }
      });
      const parityScorecard = await requestJson(baseUrl, "/v1/release/parity-scorecards", {
        method: "POST",
        token: companyToken,
        expectedStatus: 201,
        body: {
          companyId: financeReady.companyId,
          competitorCode: slice.competitorCode,
          pilotCohortIds: [cohort.pilotCohortId],
          criteriaResults: slice.criteriaCodes.map((criterionCode) => ({
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
      parityScorecardIds.push(parityScorecard.parityScorecardId);
    }

    const bundle = await requestJson(baseUrl, "/v1/release/advantage-bundles", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        parityScorecardIds,
        moveResults: ADVANTAGE_MOVE_RESULTS,
        notes: "All winning moves released."
      }
    });
    assert.equal(bundle.status, "released");
    assert.equal(bundle.summary.releaseReady, true);
    assert.deepEqual(bundle.summary.greenParityCategories, [
      "crm_project_service",
      "field_vertical",
      "finance_platform"
    ]);

    const listed = await requestJson(baseUrl, `/v1/release/advantage-bundles?companyId=${financeReady.companyId}`, {
      token: companyToken
    });
    assert.equal(
      listed.items.some((item) => item.advantageReleaseBundleId === bundle.advantageReleaseBundleId && item.status === "released"),
      true
    );

    const evidence = await requestJson(
      baseUrl,
      `/v1/release/advantage-bundles/${bundle.advantageReleaseBundleId}/evidence`,
      { token: companyToken }
    );
    assert.equal(evidence.evidenceBundle.bundleType, "advantage_release_bundle");
    assert.equal(
      evidence.evidenceBundle.relatedObjectRefs.filter((ref) => ref.objectType === "parity_scorecard").length,
      3
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
      adminDisplayName: "Phase 18 Advantage E2E Owner",
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

