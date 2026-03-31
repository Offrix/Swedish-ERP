import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 18.1 pilot execution requires passed scenarios, rollback preparedness and signoff coverage", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T17:00:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    platform,
    tenantControl,
    legalName: "Phase 18 Pilot AB",
    orgNumber: "559900-8181",
    adminEmail: "phase18-owner@example.test"
  });
  const financeReadyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });

  const financeApprover = platform.createCompanyUser({
    sessionToken: financeReadyToken,
    companyId: financeReady.companyId,
    email: "phase18-finance@example.test",
    displayName: "Phase 18 Finance",
    roleCode: "approver",
    requiresMfa: true
  });
  const supportApprover = platform.createCompanyUser({
    sessionToken: financeReadyToken,
    companyId: financeReady.companyId,
    email: "phase18-support@example.test",
    displayName: "Phase 18 Support",
    roleCode: "bureau_user",
    requiresMfa: true
  });

  const pilot = tenantControl.startPilotExecution({
    sessionToken: financeReadyToken,
    companyId: financeReady.companyId,
    label: "Internal finance pilot"
  });
  assert.equal(pilot.status, "in_progress");
  assert.equal(pilot.scenarioSummary.pendingCount, 7);
  assert.equal(pilot.financeReadinessSnapshot.status, "finance_ready");

  const failed = tenantControl.recordPilotScenarioOutcome({
    sessionToken: financeReadyToken,
    pilotExecutionId: pilot.pilotExecutionId,
    scenarioCode: "finance_core",
    status: "failed",
    blockerCodes: ["bank_reconciliation_missing"],
    evidenceRefs: ["runbook://finance_core/failure"]
  });
  assert.equal(failed.status, "blocked");
  assert.equal(failed.blockingIssueCodes.includes("pilot_scenarios_failed"), true);

  tenantControl.recordPilotScenarioOutcome({
    sessionToken: financeReadyToken,
    pilotExecutionId: pilot.pilotExecutionId,
    scenarioCode: "finance_core",
    status: "passed",
    evidenceRefs: ["runbook://finance_core/passed"]
  });
  for (const scenarioCode of [
    "vat_cycle",
    "payroll_agi",
    "hus_claim",
    "tax_account_reconciliation",
    "annual_reporting",
    "support_operations"
  ]) {
    tenantControl.recordPilotScenarioOutcome({
      sessionToken: financeReadyToken,
      pilotExecutionId: pilot.pilotExecutionId,
      scenarioCode,
      status: "passed",
      evidenceRefs: [`runbook://${scenarioCode}/passed`]
    });
  }

  assert.throws(
    () =>
      tenantControl.completePilotExecution({
        sessionToken: financeReadyToken,
        pilotExecutionId: pilot.pilotExecutionId,
        approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
        rollbackStrategyCode: "restore_previous_live_and_reconcile"
      }),
    (error) => error?.code === "pilot_execution_rollback_evidence_required"
  );

  const completed = tenantControl.completePilotExecution({
    sessionToken: financeReadyToken,
    pilotExecutionId: pilot.pilotExecutionId,
    approvalActorIds: [financeApprover.user.userId, supportApprover.user.userId],
    rollbackStrategyCode: "restore_previous_live_and_reconcile",
    rollbackEvidenceRefs: ["runbook://rollback/verified"],
    notes: "Internal dogfood finance pilot completed."
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.gateStatus, "completed");
  assert.equal(completed.latestEvidenceBundleId != null, true);
  assert.equal(completed.approvalCoverage.complete, true);
  assert.equal(completed.rollbackPreparedness.status, "verified");

  const exportedEvidence = tenantControl.exportPilotExecutionEvidence({
    sessionToken: financeReadyToken,
    pilotExecutionId: pilot.pilotExecutionId
  });
  assert.equal(exportedEvidence.bundleType, "pilot_execution");

  const profile = tenantControl.getCompanySetupProfile({
    sessionToken: financeReadyToken,
    companyId: financeReady.companyId
  });
  assert.equal(profile.status, "pilot");

  const executions = tenantControl.listPilotExecutions({
    sessionToken: financeReadyToken,
    companyId: financeReady.companyId
  });
  assert.equal(executions.length >= 1, true);
});

function bootstrapFinanceReadyCompany({ platform, tenantControl, legalName, orgNumber, adminEmail }) {
  const onboardingRun = tenantControl.createTenantBootstrap({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName: "Phase 18 Owner",
    legalFormCode: "AKTIEBOLAG",
    registrations: [{ registrationType: "vat", registrationValue: "configured-vat", status: "configured" }],
    fiscalYearStartDate: "2026-01-01",
    fiscalYearEndDate: "2026-12-31",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",    accountingYear: "2026"
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
  const profile = tenantControl.snapshotTenantControl().companySetupProfiles.find((item) => item.companyId === onboardingRun.companyId);
  assert.equal(profile?.status, "finance_ready");
  return {
    companyId: onboardingRun.companyId,
    adminEmail
  };
}


