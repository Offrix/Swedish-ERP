import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

const SERVICE_PROJECT_SCENARIOS = [
  "finance_core",
  "vat_cycle",
  "payroll_agi",
  "tax_account_reconciliation",
  "annual_reporting",
  "support_operations",
  "project_profitability"
];

test("Phase 18.2 pilot cohorts operationalize segment acceptance with reusable cutover evidence", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T19:00:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 Cohort AB",
    orgNumber: "559900-9393",
    adminEmail: "phase18-cohort-owner@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });
  const financeApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-cohort-finance@example.test",
    displayName: "Phase 18 Cohort Finance",
    roleCode: "approver",
    requiresMfa: true
  });
  const supportApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-cohort-support@example.test",
    displayName: "Phase 18 Cohort Support",
    roleCode: "bureau_user",
    requiresMfa: true
  });

  const pilot = tenantControl.startPilotExecution({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    label: "Service project pilot",
    scenarioCodes: SERVICE_PROJECT_SCENARIOS
  });
  for (const scenarioCode of SERVICE_PROJECT_SCENARIOS) {
    tenantControl.recordPilotScenarioOutcome({
      sessionToken: companyToken,
      pilotExecutionId: pilot.pilotExecutionId,
      scenarioCode,
      status: "passed",
      evidenceRefs: [`runbook://${scenarioCode}/passed`]
    });
  }
  const completedPilot = tenantControl.completePilotExecution({
    sessionToken: companyToken,
    pilotExecutionId: pilot.pilotExecutionId,
    approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
    rollbackStrategyCode: "restore_previous_live_and_reconcile",
    rollbackEvidenceRefs: ["runbook://rollback/verified"]
  });
  assert.equal(completedPilot.status, "completed");

  const cohort = tenantControl.startPilotCohort({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    segmentCode: "service_project_company",
    label: "Service project cohort"
  });
  assert.equal(cohort.status, "planned");
  assert.equal(cohort.coverageSummary.readyForAcceptance, false);

  const running = tenantControl.attachPilotExecutionsToCohort({
    sessionToken: companyToken,
    pilotCohortId: cohort.pilotCohortId,
    pilotExecutionIds: [pilot.pilotExecutionId]
  });
  assert.equal(running.status, "running");
  assert.equal(running.coverageSummary.readyForAcceptance, true);
  assert.equal(running.coverageSummary.missingScenarioCodes.length, 0);

  assert.throws(
    () =>
      tenantControl.assessPilotCohort({
        sessionToken: companyToken,
        pilotCohortId: cohort.pilotCohortId,
        decision: "accepted",
        approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
        rollbackEvidenceRefs: ["runbook://rollback/verified"]
      }),
    (error) => error?.code === "pilot_cohort_cutover_template_required"
  );

  const accepted = tenantControl.assessPilotCohort({
    sessionToken: companyToken,
    pilotCohortId: cohort.pilotCohortId,
    decision: "accepted",
    approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
    reusableCutoverTemplateRefs: ["cutover-template://service-project/v1"],
    rollbackEvidenceRefs: ["runbook://rollback/verified"],
    notes: "Segment cohort accepted."
  });
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.latestEvidenceBundleId != null, true);

  const evidence = tenantControl.exportPilotCohortEvidence({
    sessionToken: companyToken,
    pilotCohortId: cohort.pilotCohortId
  });
  assert.equal(evidence.bundleType, "pilot_cohort");
  assert.equal(evidence.relatedObjectRefs.some((ref) => ref.objectType === "pilot_execution" && ref.objectId === pilot.pilotExecutionId), true);

  const listed = tenantControl.listPilotCohorts({
    sessionToken: companyToken,
    companyId: financeReady.companyId
  });
  assert.equal(listed.some((item) => item.pilotCohortId === cohort.pilotCohortId && item.status === "accepted"), true);
});

function bootstrapFinanceReadyCompany({ tenantControl, legalName, orgNumber, adminEmail }) {
  const onboardingRun = tenantControl.createTenantBootstrap({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName: "Phase 18 Cohort Owner",
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
