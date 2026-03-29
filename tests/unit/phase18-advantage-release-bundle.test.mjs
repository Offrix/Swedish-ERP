import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

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
const FIELD_CRITERIA = [
  "work_order_service_order",
  "material_photo_signature_evidence",
  "personalliggare",
  "simple_field_execution",
  "change_order_semantics",
  "id06_compliance"
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

test("Phase 18.4 advantage release bundle records released bundle when parity and differentiators are green", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T22:30:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 Advantage AB",
    orgNumber: "559900-9991",
    adminEmail: "phase18-advantage-owner@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });
  const financeApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-advantage-finance@example.test",
    displayName: "Phase 18 Advantage Finance",
    roleCode: "approver",
    requiresMfa: true
  });
  const supportApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-advantage-support@example.test",
    displayName: "Phase 18 Advantage Support",
    roleCode: "bureau_user",
    requiresMfa: true
  });

  const financeScorecard = createAcceptedCohortAndParityScorecard({
    tenantControl,
    companyToken,
    companyId: financeReady.companyId,
    financeApproverUserId: financeApprover.user.userId,
    supportApproverUserId: supportApprover.user.userId,
    label: "Finance parity",
    segmentCode: "finance_payroll_ab",
    scenarioCodes: FINANCE_SCENARIOS,
    competitorCode: "fortnox",
    criteriaCodes: FINANCE_CRITERIA,
    cutoverTemplateRef: "cutover-template://finance/v1"
  });
  const serviceScorecard = createAcceptedCohortAndParityScorecard({
    tenantControl,
    companyToken,
    companyId: financeReady.companyId,
    financeApproverUserId: financeApprover.user.userId,
    supportApproverUserId: supportApprover.user.userId,
    label: "Service parity",
    segmentCode: "service_project_company",
    scenarioCodes: SERVICE_PROJECT_SCENARIOS,
    competitorCode: "teamleader",
    criteriaCodes: SERVICE_CRITERIA,
    cutoverTemplateRef: "cutover-template://service/v1"
  });
  const fieldScorecard = createAcceptedCohortAndParityScorecard({
    tenantControl,
    companyToken,
    companyId: financeReady.companyId,
    financeApproverUserId: financeApprover.user.userId,
    supportApproverUserId: supportApprover.user.userId,
    label: "Field parity",
    segmentCode: "construction_service_id06",
    scenarioCodes: CONSTRUCTION_SCENARIOS,
    competitorCode: "bygglet",
    criteriaCodes: FIELD_CRITERIA,
    cutoverTemplateRef: "cutover-template://construction/v1"
  });

  const bundle = tenantControl.recordAdvantageReleaseBundle({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    parityScorecardIds: [
      financeScorecard.parityScorecardId,
      serviceScorecard.parityScorecardId,
      fieldScorecard.parityScorecardId
    ],
    moveResults: ADVANTAGE_MOVE_RESULTS,
    notes: "Advantage pack released."
  });
  assert.equal(bundle.status, "released");
  assert.equal(bundle.summary.releaseReady, true);
  assert.deepEqual(bundle.summary.missingParityCategories, []);
  assert.equal(bundle.summary.greenMoveCount, 5);

  const evidence = tenantControl.exportAdvantageReleaseBundleEvidence({
    sessionToken: companyToken,
    advantageReleaseBundleId: bundle.advantageReleaseBundleId
  });
  const evidenceArtifacts = evidence.artifacts || evidence.artifactRefs || [];
  const relatedObjectRefs = evidence.relatedObjectRefs || [];
  assert.equal(evidence.bundleType, "advantage_release_bundle");
  assert.equal(evidenceArtifacts.some((item) => item.artifactType === "advantage_release_bundle_matrix"), true);
  assert.equal(
    relatedObjectRefs.some(
      (ref) => ref.objectType === "parity_scorecard" && ref.objectId === financeScorecard.parityScorecardId
    ),
    true
  );
});

test("Phase 18.4 advantage release bundle rejects na move statuses", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T22:35:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 Advantage Guard AB",
    orgNumber: "559900-9992",
    adminEmail: "phase18-advantage-guard@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });

  assert.throws(
    () =>
      tenantControl.recordAdvantageReleaseBundle({
        sessionToken: companyToken,
        companyId: financeReady.companyId,
        parityScorecardIds: [],
        moveResults: ADVANTAGE_MOVE_RESULTS.map((item) =>
          item.moveCode === "unified_receipts_recovery"
            ? { ...item, status: "na" }
            : item
        )
      }),
    (error) => error?.code === "advantage_move_status_invalid"
  );
});

function createAcceptedCohortAndParityScorecard({
  tenantControl,
  companyToken,
  companyId,
  financeApproverUserId,
  supportApproverUserId,
  label,
  segmentCode,
  scenarioCodes,
  competitorCode,
  criteriaCodes,
  cutoverTemplateRef
}) {
  const cohort = createAcceptedPilotCohort({
    tenantControl,
    companyToken,
    companyId,
    financeApproverUserId,
    supportApproverUserId,
    label,
    segmentCode,
    scenarioCodes,
    cutoverTemplateRef
  });
  return tenantControl.recordParityScorecard({
    sessionToken: companyToken,
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
  });
}

function createAcceptedPilotCohort({
  tenantControl,
  companyToken,
  companyId,
  financeApproverUserId,
  supportApproverUserId,
  label,
  segmentCode,
  scenarioCodes,
  cutoverTemplateRef
}) {
  const pilot = tenantControl.startPilotExecution({
    sessionToken: companyToken,
    companyId,
    label,
    scenarioCodes
  });
  for (const scenarioCode of scenarioCodes) {
    tenantControl.recordPilotScenarioOutcome({
      sessionToken: companyToken,
      pilotExecutionId: pilot.pilotExecutionId,
      scenarioCode,
      status: "passed",
      evidenceRefs: [`runbook://${scenarioCode}/passed`]
    });
  }
  tenantControl.completePilotExecution({
    sessionToken: companyToken,
    pilotExecutionId: pilot.pilotExecutionId,
    approvalActorIds: [financeApproverUserId, supportApproverUserId],
    rollbackStrategyCode: "restore_previous_live_and_reconcile",
    rollbackEvidenceRefs: ["runbook://rollback/verified"]
  });
  const cohort = tenantControl.startPilotCohort({
    sessionToken: companyToken,
    companyId,
    segmentCode,
    pilotExecutionIds: [pilot.pilotExecutionId]
  });
  return tenantControl.assessPilotCohort({
    sessionToken: companyToken,
    pilotCohortId: cohort.pilotCohortId,
    decision: "accepted",
    approvalActorIds: [financeApproverUserId, supportApproverUserId],
    reusableCutoverTemplateRefs: [cutoverTemplateRef],
    rollbackEvidenceRefs: ["runbook://rollback/verified"]
  });
}

function bootstrapFinanceReadyCompany({ tenantControl, legalName, orgNumber, adminEmail }) {
  const onboardingRun = tenantControl.createTenantBootstrap({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName: "Phase 18 Advantage Owner",
    accountingYear: "2026"
  });
  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "registrations",
    payload: {
      registrations: [
        { registrationType: "f_tax", registrationValue: "configured-f-tax", status: "configured" },
        { registrationType: "vat", registrationValue: "configured-vat", status: "configured" },
        { registrationType: "employer", registrationValue: "configured-employer", status: "configured" }
      ]
    }
  });
  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "chart_template",
    payload: {
      chartTemplateId: "DSAM-2026",
      voucherSeriesCodes: ["A", "B", "E", "H", "I"]
    }
  });
  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "vat_setup",
    payload: {
      vatScheme: "se_standard",
      filingPeriod: "monthly"
    }
  });
  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "fiscal_periods",
    payload: {
      year: 2026
    }
  });
  return {
    companyId: onboardingRun.companyId,
    adminEmail
  };
}
