import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.7 payroll trial guards watermark pay runs and force non-live AGI receipts", () => {
  const platform = createApiPlatform({
    runtimeMode: "trial",
    env: {},
    criticalDomainStateStoreKind: "memory",
    bootstrapScenarioCode: "test_default_demo",
    clock: () => new Date("2026-03-28T13:00:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: COMPANY_ID,
    email: DEMO_ADMIN_EMAIL
  });
  tenantControl.createTrialEnvironment({
    sessionToken: adminToken,
    companyId: COMPANY_ID,
    seedScenarioCode: "salary_employer_with_agi"
  });

  const employee = createEmployeeWithoutBankAccount({
    platform,
    givenName: "Tora",
    familyName: "Trial",
    workEmail: "tora.trial@example.com",
    identityValue: "19800112-5510",
    monthlySalary: 35500
  });
  const payCalendar = platform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const run = platform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    taxDecisionSnapshots: [createTabellDecision(employee.employment.employmentId)],
    actorId: "unit-test"
  });

  assert.equal(run.executionBoundary.modeCode, "trial");
  assert.equal(run.executionBoundary.trialGuardActive, true);
  assert.equal(run.payslips[0].watermark.watermarkCode, "TRIAL");
  assert.equal(run.payslips[0].bankPaymentPreview.bankRailMode, "trial_non_live");
  assert.equal(run.payslips[0].bankPaymentPreview.payoutReady, true);
  assert.match(run.payslips[0].bankPaymentPreview.accountTarget, /^trial:\/\/payroll\//u);

  platform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  const submission = platform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  platform.validateAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: submission.agiSubmissionId
  });
  platform.markAgiSubmissionReadyForSign({
    companyId: COMPANY_ID,
    agiSubmissionId: submission.agiSubmissionId,
    actorId: "unit-test"
  });

  assert.throws(
    () =>
      platform.submitAgiSubmission({
        companyId: COMPANY_ID,
        agiSubmissionId: submission.agiSubmissionId,
        actorId: "unit-test",
        mode: "live"
      }),
    (error) => error?.code === "agi_submission_live_mode_blocked"
  );

  const accepted = platform.submitAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: submission.agiSubmissionId,
    actorId: "unit-test",
    simulatedOutcome: "accepted"
  });
  assert.equal(accepted.currentVersion.submissionMode, "trial");
  assert.equal(accepted.currentVersion.trialGuard.watermarkCode, "TRIAL");
  assert.equal(accepted.currentVersion.receipts[0].receiptCode, "trial:accepted");
  assert.equal(accepted.currentVersion.receipts[0].payloadJson.legalEffect, false);
  assert.equal(accepted.currentVersion.evidenceBundleId != null, true);
});

test("Phase 1.4 production runtime blocks AGI live submission until provider-backed transport exists", () => {
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {},
    criticalDomainStateStoreKind: "memory",
    clock: () => new Date("2026-03-28T13:30:00Z")
  });
  const onboardingRun = platform.createOnboardingRun({
    legalName: "Protected Runtime Payroll AB",
    orgNumber: "559900-2200",
    adminEmail: "owner@protected-payroll.test",
    adminDisplayName: "Protected Payroll Owner",
    accountingYear: "2026"
  });
  platform.updateOnboardingStep({
    runId: onboardingRun.runId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "registrations",
    payload: {
      registrations: [{ registrationType: "employer", registrationValue: "configured-employer", status: "configured" }]
    }
  });
  const companyId = onboardingRun.companyId;
  const payCalendar = createProductionPayrollBaseline(platform, companyId);

  const employee = createEmployeeWithoutBankAccount({
    platform,
    companyId,
    givenName: "Lars",
    familyName: "Live",
    workEmail: "lars.live@example.com",
    identityValue: "19740101-1114",
    monthlySalary: 36500
  });
  const run = platform.createPayRun({
    companyId,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    taxDecisionSnapshots: [createTabellDecision(employee.employment.employmentId)],
    actorId: "unit-test"
  });

  platform.approvePayRun({
    companyId,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  const submission = platform.createAgiSubmission({
    companyId,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  platform.validateAgiSubmission({
    companyId,
    agiSubmissionId: submission.agiSubmissionId
  });
  platform.markAgiSubmissionReadyForSign({
    companyId,
    agiSubmissionId: submission.agiSubmissionId,
    actorId: "unit-test"
  });

  assert.throws(
    () =>
      platform.submitAgiSubmission({
        companyId,
        agiSubmissionId: submission.agiSubmissionId,
        actorId: "unit-test"
      }),
    (error) => error?.code === "agi_submission_live_provider_not_implemented"
  );
});

function createEmployeeWithoutBankAccount({ platform, companyId = COMPANY_ID, givenName, familyName, workEmail, identityValue, monthlySalary }) {
  const employee = platform.createEmployee({
    companyId,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail,
    actorId: "unit-test"
  });
  const employment = platform.createEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Trial payroll employee",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  platform.addEmploymentContract({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary,
    currencyCode: "SEK",
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}

function createTabellDecision(employmentId) {
  return {
    employmentId,
    decisionType: "tabell",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
    withholdingFixedAmount: 9600,
    decisionSource: "skatteverket_table_import",
    decisionReference: "tabell-34-kolumn-1-2026",
    evidenceRef: "evidence-tax-table-2026"
  };
}

function createProductionPayrollBaseline(platform, companyId) {
  platform.createPayItem({
    companyId,
    payItemCode: "MONTHLY_SALARY",
    payItemType: "monthly_salary",
    displayName: "Manadslon",
    calculationBasis: "contract_monthly_salary",
    unitCode: "month",
    compensationBucket: "gross_addition",
    affectsVacationBasis: true,
    affectsPensionBasis: true,
    actorId: "unit-test"
  });
  return platform.createPayCalendar({
    companyId,
    payCalendarCode: "PROD-MONTHLY",
    displayName: "Production Monthly",
    actorId: "unit-test"
  });
}
