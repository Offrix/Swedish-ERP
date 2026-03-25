import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { PAYROLL_STEP_DEFINITIONS, createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.1 payroll core keeps the calculation chain ordered and payslips regenerable", () => {
  const { payrollPlatform, employment } = createPayrollFixture();
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    manualInputs: [
      {
        employmentId: employment.employmentId,
        payItemCode: "BONUS",
        amount: 2500,
        processingStep: 4,
        note: "Performance bonus."
      },
      {
        employmentId: employment.employmentId,
        payItemCode: "BENEFIT",
        amount: 1800,
        processingStep: 6,
        note: "Car benefit preview."
      }
    ],
    statutoryProfiles: [
      {
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(
    payRun.calculationSteps.map((step) => step.stepCode).join(","),
    PAYROLL_STEP_DEFINITIONS.map((step) => step.stepCode).join(",")
  );
  assert.equal(payRun.payslips.length, 1);
  assert.equal(payRun.payslips[0].totals.preliminaryTax, 13290);
  assert.equal(payRun.payslips[0].totals.netPay, 29210);

  const regenerated = payrollPlatform.regeneratePaySlip({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    employmentId: employment.employmentId,
    actorId: "unit-test"
  });
  assert.equal(regenerated.regenerationNo, 1);
  assert.equal(regenerated.snapshotHash, payRun.payslips[0].snapshotHash);
});

test("Phase 8.1 payroll core keeps retro corrections traceable and supports final pay", () => {
  const { payrollPlatform, employment } = createPayrollFixture();
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const regularRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    statutoryProfiles: [
      {
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30
      }
    ],
    actorId: "unit-test"
  });

  const correctionRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "correction",
    retroAdjustments: [
      {
        employmentId: employment.employmentId,
        payItemCode: "CORRECTION",
        amount: 1800,
        originalPeriod: "202602",
        sourcePayRunId: regularRun.payRunId,
        sourceLineId: regularRun.lines[0].payRunLineId,
        note: "Retro bonus."
      }
    ],
    actorId: "unit-test"
  });

  const retroLine = correctionRun.lines.find((line) => line.payItemCode === "CORRECTION");
  assert.ok(retroLine);
  assert.equal(retroLine.sourcePeriod, "202602");
  assert.equal(retroLine.sourcePayRunId, regularRun.payRunId);
  assert.equal(correctionRun.events.some((event) => event.eventType === "calculated"), true);

  const finalRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    runType: "final",
    finalPayAdjustments: [
      {
        employmentId: employment.employmentId,
        terminationDate: "2026-04-12",
        finalSettlementAmount: 12000,
        remainingVacationDays: 4,
        remainingVacationSettlementAmount: 4800,
        advanceVacationRecoveryAmount: 1500,
        note: "Final pay settlement."
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(finalRun.lines.some((line) => line.payItemCode === "FINAL_PAY"), true);
  assert.equal(finalRun.lines.some((line) => line.payItemCode === "VACATION_PAY"), true);
  assert.equal(
    finalRun.lines.some((line) => line.payItemCode === "CORRECTION" && line.compensationBucket === "net_deduction"),
    true
  );
});

test("Phase 8.1 payroll auto-applies the temporary youth employer contribution reduction from April 2026", () => {
  const { payrollPlatform, employment } = createPayrollFixture({
    givenName: "Ylva",
    familyName: "Youth",
    workEmail: "ylva.youth@example.com",
    dateOfBirth: "2005-05-12",
    monthlySalary: 30000
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    statutoryProfiles: [
      {
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(payRun.payslips[0].totals.employerContributionPreviewAmount, 6773.5);
  assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.contributionClassCode, "temporary_youth_reduction");
  assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.reducedContributionBase, 25000);
  assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.overflowContributionBase, 5000);
  assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.reducedRatePercent, 20.81);
  assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.overflowRatePercent, 31.42);
});

function createPayrollFixture({
  givenName = "Paula",
  familyName = "Payroll",
  workEmail = "paula.payroll@example.com",
  dateOfBirth = null,
  monthlySalary = 40000
} = {}) {
  const fixedNow = new Date("2026-03-22T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    hrPlatform,
    timePlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    workEmail,
    dateOfBirth,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll specialist",
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
    accountHolderName: "Paula Payroll",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Unit Test Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });

  return {
    payrollPlatform,
    employee,
    employment
  };
}
