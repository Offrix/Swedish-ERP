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
    identityValue: "19800112-5511",
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

function createEmployeeWithoutBankAccount({ platform, givenName, familyName, workEmail, identityValue, monthlySalary }) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail,
    actorId: "unit-test"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Trial payroll employee",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
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
