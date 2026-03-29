import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

const FINAL_CHECKLIST_CODES = [
  "technical",
  "regulated",
  "support",
  "migration",
  "security",
  "parity",
  "advantage",
  "trial_sales_readiness"
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
const PARITY_SLICES = [
  {
    label: "Finance parity",
    segmentCode: "finance_payroll_ab",
    competitorCode: "fortnox",
    cutoverTemplateRef: "cutover-template://finance/v1",
    scenarioCodes: ["finance_core", "vat_cycle", "payroll_agi", "tax_account_reconciliation", "annual_reporting", "support_operations"],
    criteriaCodes: ["finance_ready_tenant_setup", "accounting_ap_ar_bank_vat", "payroll_agi", "annual_reporting_declarations", "integrations_api_webhooks", "migration_support_operations"]
  },
  {
    label: "Service parity",
    segmentCode: "service_project_company",
    competitorCode: "teamleader",
    cutoverTemplateRef: "cutover-template://service/v1",
    scenarioCodes: ["finance_core", "vat_cycle", "payroll_agi", "tax_account_reconciliation", "annual_reporting", "support_operations", "project_profitability"],
    criteriaCodes: ["portfolio_project_status", "resource_capacity", "quote_to_project_handoff", "time_expense_material_to_invoice", "project_profitability", "customer_context_execution"]
  },
  {
    label: "Field parity",
    segmentCode: "construction_service_id06",
    competitorCode: "bygglet",
    cutoverTemplateRef: "cutover-template://construction/v1",
    scenarioCodes: ["finance_core", "vat_cycle", "payroll_agi", "hus_claim", "tax_account_reconciliation", "annual_reporting", "support_operations", "project_profitability", "personalliggare_id06"],
    criteriaCodes: ["work_order_service_order", "material_photo_signature_evidence", "personalliggare", "simple_field_execution", "change_order_semantics", "id06_compliance"]
  }
];
const SUPPLEMENTAL_SEGMENTS = [
  {
    label: "HUS pilot",
    segmentCode: "hus_business",
    cutoverTemplateRef: "cutover-template://hus/v1",
    scenarioCodes: ["finance_core", "vat_cycle", "payroll_agi", "hus_claim", "tax_account_reconciliation", "annual_reporting", "support_operations"]
  },
  {
    label: "Enterprise pilot",
    segmentCode: "enterprise_sso_customer",
    cutoverTemplateRef: "cutover-template://enterprise/v1",
    scenarioCodes: ["finance_core", "vat_cycle", "payroll_agi", "tax_account_reconciliation", "annual_reporting", "support_operations", "enterprise_auth"]
  }
];
const ADVANTAGE_MOVES = [
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

test("Phase 18.6 API records, lists and exports final general availability gate", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T00:30:00Z")
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
      adminEmail: "phase18-go-live-api-owner@example.test",
      legalName: "Phase 18 GA API AB",
      orgNumber: "559901-0104"
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
      email: "phase18-go-live-api-finance@example.test",
      displayName: "Phase 18 Go Live API Finance",
      roleCode: "approver",
      requiresMfa: true
    });
    const supportApprover = platform.createCompanyUser({
      sessionToken: companyToken,
      companyId: financeReady.companyId,
      email: "phase18-go-live-api-support@example.test",
      displayName: "Phase 18 Go Live API Support",
      roleCode: "bureau_user",
      requiresMfa: true
    });
    const approvalActorIds = [financeApprover.user.userId, supportApprover.user.userId];

    const pilotExecutionIds = [];
    const pilotCohortIds = [];
    const parityScorecardIds = [];
    for (const slice of PARITY_SLICES) {
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
      pilotExecutionIds.push(pilot.pilotExecutionId);
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
      pilotCohortIds.push(cohort.pilotCohortId);
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
    for (const slice of SUPPLEMENTAL_SEGMENTS) {
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
      pilotExecutionIds.push(pilot.pilotExecutionId);
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
      pilotCohortIds.push(cohort.pilotCohortId);
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
    }

    const bundle = await requestJson(baseUrl, "/v1/release/advantage-bundles", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        parityScorecardIds,
        moveResults: ADVANTAGE_MOVES
      }
    });
    const freezeRecord = await requestJson(baseUrl, "/v1/release/ui-contract-freezes", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        advantageReleaseBundleId: bundle.advantageReleaseBundleId
      }
    });

    const gate = await requestJson(baseUrl, "/v1/release/go-live-gates", {
      method: "POST",
      token: companyToken,
      expectedStatus: 201,
      body: {
        companyId: financeReady.companyId,
        pilotExecutionIds,
        pilotCohortIds,
        parityScorecardIds,
        advantageReleaseBundleId: bundle.advantageReleaseBundleId,
        uiContractFreezeRecordId: freezeRecord.uiContractFreezeRecordId,
        checklistResults: FINAL_CHECKLIST_CODES.map((checklistCode) => ({
          checklistCode,
          status: "green",
          evidenceRefs: [`go-live://${checklistCode}/green`]
        })),
        notes: "Ready for general availability."
      }
    });
    assert.equal(gate.status, "approved");
    assert.equal(gate.summary.generalAvailabilityReady, true);
    assert.deepEqual(gate.summary.missingPilotSegmentCodes, []);

    const listed = await requestJson(baseUrl, `/v1/release/go-live-gates?companyId=${financeReady.companyId}`, {
      token: companyToken
    });
    assert.equal(
      listed.items.some((item) => item.goLiveGateRecordId === gate.goLiveGateRecordId && item.status === "approved"),
      true
    );

    const reloaded = await requestJson(baseUrl, `/v1/release/go-live-gates/${gate.goLiveGateRecordId}`, {
      token: companyToken
    });
    assert.equal(reloaded.advantageReleaseBundleId, bundle.advantageReleaseBundleId);
    assert.equal(reloaded.uiContractFreezeRecordId, freezeRecord.uiContractFreezeRecordId);
    assert.equal(reloaded.summary.greenChecklistCodes.length, FINAL_CHECKLIST_CODES.length);

    const evidence = await requestJson(baseUrl, `/v1/release/go-live-gates/${gate.goLiveGateRecordId}/evidence`, {
      token: companyToken
    });
    assert.equal(evidence.evidenceBundle.bundleType, "go_live_gate_record");
    assert.equal(
      (evidence.evidenceBundle.artifacts || evidence.evidenceBundle.artifactRefs || []).some(
        (artifact) => artifact.artifactType === "go_live_gate_manifest"
      ),
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
      adminDisplayName: "Phase 18 Go Live API Owner"
    }
  });
  for (const [routePath, body] of [
    [
      "registrations",
      {
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
        chartTemplateId: "DSAM-2026",
        voucherSeriesCodes: ["A", "B", "E", "H", "I"]
      }
    ],
    [
      "vat",
      {
        vatScheme: "se_standard",
        filingPeriod: "monthly"
      }
    ],
    [
      "periods",
      {
        year: 2026
      }
    ]
  ]) {
    await requestJson(baseUrl, `/v1/onboarding/runs/${onboardingRun.tenantBootstrapId}/steps/${routePath}`, {
      method: "POST",
      expectedStatus: 200,
      body: {
        ...body,
        resumeToken: onboardingRun.resumeToken
      }
    });
  }
  return {
    companyId: onboardingRun.companyId,
    adminEmail
  };
}
