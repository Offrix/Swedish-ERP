import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

const FINANCE_SCENARIOS = [
  "finance_core",
  "vat_cycle",
  "payroll_agi",
  "tax_account_reconciliation",
  "annual_reporting",
  "support_operations"
];
const FINANCE_CRITERIA = [
  "finance_ready_tenant_setup",
  "accounting_ap_ar_bank_vat",
  "payroll_agi",
  "annual_reporting_declarations",
  "integrations_api_webhooks",
  "migration_support_operations"
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

test("Phase 18.3 parity scorecard records green finance parity against Fortnox", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T21:00:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 Parity AB",
    orgNumber: "559900-9696",
    adminEmail: "phase18-parity-owner@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });
  const financeApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-parity-finance@example.test",
    displayName: "Phase 18 Parity Finance",
    roleCode: "approver",
    requiresMfa: true
  });
  const supportApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-parity-support@example.test",
    displayName: "Phase 18 Parity Support",
    roleCode: "bureau_user",
    requiresMfa: true
  });

  const acceptedCohort = createAcceptedPilotCohort({
    tenantControl,
    companyToken,
    companyId: financeReady.companyId,
    financeApproverUserId: financeApprover.user.userId,
    supportApproverUserId: supportApprover.user.userId,
    segmentCode: "finance_payroll_ab",
    scenarioCodes: FINANCE_SCENARIOS,
    cutoverTemplateRef: "cutover-template://finance/v1"
  });

  const scorecard = tenantControl.recordParityScorecard({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    competitorCode: "fortnox",
    pilotCohortIds: [acceptedCohort.pilotCohortId],
    criteriaResults: FINANCE_CRITERIA.map((criterionCode) => ({
      criterionCode,
      status: "green",
      evidenceRefs: [`evidence://${criterionCode}/green`]
    })),
    gateResults: GO_LIVE_GATES.map((gateCode) => ({
      gateCode,
      status: "green",
      evidenceRefs: [`gate://${gateCode}/green`]
    })),
    notes: "Fortnox parity achieved."
  });
  assert.equal(scorecard.status, "green");
  assert.equal(scorecard.summary.parityAchieved, true);

  const evidence = tenantControl.exportParityScorecardEvidence({
    sessionToken: companyToken,
    parityScorecardId: scorecard.parityScorecardId
  });
  assert.equal(evidence.bundleType, "parity_scorecard");
  assert.equal(evidence.relatedObjectRefs.some((ref) => ref.objectType === "pilot_cohort" && ref.objectId === acceptedCohort.pilotCohortId), true);
});

function createAcceptedPilotCohort({
  tenantControl,
  companyToken,
  companyId,
  financeApproverUserId,
  supportApproverUserId,
  segmentCode,
  scenarioCodes,
  cutoverTemplateRef
}) {
  const pilot = tenantControl.startPilotExecution({
    sessionToken: companyToken,
    companyId,
    label: `${segmentCode} pilot`,
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
    adminDisplayName: "Phase 18 Parity Owner",
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
