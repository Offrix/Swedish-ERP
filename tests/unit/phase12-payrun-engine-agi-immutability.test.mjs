import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.3 pay-run preview hashes stay deterministic even when manual input order changes", () => {
  const left = createPayrollFixture();
  const right = createPayrollFixture();
  const payCalendarLeft = left.payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payCalendarRight = right.payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const inputVariants = [
    [
      {
        employmentId: left.employment.employmentId,
        payItemCode: "COMMISSION",
        amount: 1800,
        processingStep: 4
      },
      {
        employmentId: left.employment.employmentId,
        payItemCode: "BONUS",
        amount: 1200,
        processingStep: 4
      }
    ],
    [
      {
        employmentId: right.employment.employmentId,
        payItemCode: "BONUS",
        amount: 1200,
        processingStep: 4
      },
      {
        employmentId: right.employment.employmentId,
        payItemCode: "COMMISSION",
        amount: 1800,
        processingStep: 4
      }
    ]
  ];

  const leftRun = left.payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendarLeft.payCalendarId,
    reportingPeriod: "202603",
    taxDecisionSnapshots: [createTabellDecision(left.employment.employmentId)],
    manualInputs: inputVariants[0],
    actorId: "unit-test"
  });
  const rightRun = right.payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendarRight.payCalendarId,
    reportingPeriod: "202603",
    taxDecisionSnapshots: [createTabellDecision(right.employment.employmentId)],
    manualInputs: inputVariants[1],
    actorId: "unit-test"
  });

  assert.equal(leftRun.postingIntentSnapshotHash, rightRun.postingIntentSnapshotHash);
  assert.equal(leftRun.bankPaymentSnapshotHash, rightRun.bankPaymentSnapshotHash);
  assert.deepEqual(
    leftRun.lines.filter((line) => ["BONUS", "COMMISSION"].includes(line.payItemCode)).map((line) => line.payItemCode),
    ["BONUS", "COMMISSION"]
  );
});

test("Phase 12.3 AGI versions become immutable after ready_for_sign and later correction drafts stay editable", () => {
  const fixedNow = new Date("2026-03-28T11:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform
  });

  const employee = createEmployeeWithContract({
    hrPlatform,
    givenName: "Agi",
    familyName: "Immutable",
    workEmail: "agi.immutable@example.com",
    identityValue: "19800112-8886",
    monthlySalary: 40000
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const regularRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    taxDecisionSnapshots: [createTabellDecision(employee.employment.employmentId)],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: regularRun.payRunId,
    actorId: "unit-test"
  });

  const submission = payrollPlatform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  payrollPlatform.validateAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: submission.agiSubmissionId
  });
  payrollPlatform.markAgiSubmissionReadyForSign({
    companyId: COMPANY_ID,
    agiSubmissionId: submission.agiSubmissionId,
    actorId: "unit-test"
  });

  assert.throws(
    () =>
      payrollPlatform.validateAgiSubmission({
        companyId: COMPANY_ID,
        agiSubmissionId: submission.agiSubmissionId
      }),
    (error) => error?.code === "agi_version_immutable"
  );

  payrollPlatform.submitAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: submission.agiSubmissionId,
    actorId: "unit-test",
    simulatedOutcome: "accepted"
  });
  assert.throws(
    () =>
      payrollPlatform.markAgiSubmissionReadyForSign({
        companyId: COMPANY_ID,
        agiSubmissionId: submission.agiSubmissionId,
        actorId: "unit-test"
      }),
    (error) => error?.code === "agi_version_immutable"
  );

  const correctionRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "correction",
    retroAdjustments: [
        {
          employmentId: employee.employment.employmentId,
          payItemCode: "CORRECTION",
          amount: 18000,
          originalPeriod: "202602",
          sourcePayRunId: regularRun.payRunId,
          sourceLineId: regularRun.lines[0].payRunLineId
      }
    ],
    taxDecisionSnapshots: [createTabellDecision(employee.employment.employmentId)],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: correctionRun.payRunId,
    actorId: "unit-test"
  });
  const correctionDraft = payrollPlatform.createAgiCorrectionVersion({
    companyId: COMPANY_ID,
    agiSubmissionId: submission.agiSubmissionId,
    correctionReason: "Immutable AGI correction.",
    actorId: "unit-test"
  });
  const revalidated = payrollPlatform.validateAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: correctionDraft.agiSubmissionId
  });
  assert.equal(revalidated.currentVersion.state, "validated");
});

function createPayrollFixture() {
  const fixedNow = new Date("2026-03-28T10:30:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform
  });
  const { employment } = createEmployeeWithContract({
    hrPlatform,
    givenName: "Pia",
    familyName: "Preview",
    workEmail: "pia.preview@example.com",
    identityValue: "19800112-9991",
    monthlySalary: 40000
  });
  return {
    payrollPlatform,
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
    withholdingFixedAmount: 11800,
    decisionSource: "skatteverket_table_import",
    decisionReference: "tabell-34-kolumn-1-2026",
    evidenceRef: "evidence-tax-table-2026"
  };
}

function createEmployeeWithContract({ hrPlatform, givenName, familyName, workEmail, identityValue, monthlySalary }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll employee",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary,
    currencyCode: "SEK",
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Unit Test Payroll Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
