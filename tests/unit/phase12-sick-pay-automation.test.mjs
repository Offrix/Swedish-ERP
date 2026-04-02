import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.4 auto-calculates Swedish sick absence deduction, sick pay and qualifying deduction", () => {
  const { payrollPlatform, timePlatform, employment } = createSickPayFixture();
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const sickLeaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "SICK_LEAVE",
    displayName: "Sick leave",
    payrollTreatmentCode: "sick_leave",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    leaveTypeId: sickLeaveType.leaveTypeId,
    reportingPeriod: "202604",
    days: [
      { date: "2026-04-01", extentPercent: 100 },
      { date: "2026-04-02", extentPercent: 50 },
      { date: "2026-04-03", extentPercent: 100 }
    ],
    actorId: "unit-test"
  });
  timePlatform.submitLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: leaveEntry.leaveEntryId,
    actorId: "unit-test"
  });

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    statutoryProfiles: [
      {
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        manualRateReasonCode: "emergency_manual_transition",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    actorId: "unit-test"
  });

  assert.deepEqual(
    payRun.lines.filter((line) => line.payItemCode === "SICK_ABSENCE_DEDUCTION").map((line) => line.amount),
    [1600, 800, 1600]
  );
  assert.deepEqual(
    payRun.lines.filter((line) => line.payItemCode === "SICK_PAY").map((line) => line.amount),
    [1280, 640, 1280]
  );
  assert.deepEqual(
    payRun.lines.filter((line) => line.payItemCode === "QUALIFYING_DEDUCTION").map((line) => line.amount),
    [1280]
  );
  assert.equal(payRun.payslips[0].totals.taxableBase, 29920);
  assert.equal(payRun.payslips[0].totals.employerContributionBase, 29920);
  assert.equal(payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].leaveEntries[0].payrollTreatmentCode, "sick_leave");
  assert.equal(payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].absenceDecisions[0].payrollTreatmentCode, "sick_leave");
});

test("Phase 11.4 carries the qualifying deduction across a sickness spell that started in the previous month", () => {
  const { payrollPlatform, timePlatform, employment } = createSickPayFixture();
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const sickLeaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "SICK_CROSS_PERIOD",
    displayName: "Cross-period sick leave",
    payrollTreatmentCode: "sick_leave",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    leaveTypeId: sickLeaveType.leaveTypeId,
    reportingPeriod: "202604",
    days: [
      { date: "2026-03-30", extentPercent: 100 },
      { date: "2026-03-31", extentPercent: 100 },
      { date: "2026-04-01", extentPercent: 100 },
      { date: "2026-04-02", extentPercent: 50 },
      { date: "2026-04-03", extentPercent: 100 }
    ],
    actorId: "unit-test"
  });
  timePlatform.submitLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: leaveEntry.leaveEntryId,
    actorId: "unit-test"
  });

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    statutoryProfiles: [
      {
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        manualRateReasonCode: "emergency_manual_transition",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    actorId: "unit-test"
  });

  assert.deepEqual(
    payRun.lines.filter((line) => line.payItemCode === "SICK_ABSENCE_DEDUCTION").map((line) => line.amount),
    [1600, 800, 1600]
  );
  assert.deepEqual(
    payRun.lines.filter((line) => line.payItemCode === "SICK_PAY").map((line) => line.amount),
    [1280, 640, 1280]
  );
  assert.equal(payRun.lines.some((line) => line.payItemCode === "QUALIFYING_DEDUCTION"), false);
  assert.equal(payRun.payslips[0].totals.taxableBase, 31200);
  assert.equal(payRun.payslips[0].totals.employerContributionBase, 31200);
});

function createSickPayFixture() {
  const fixedNow = new Date("2026-04-01T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
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

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Siri",
    familyName: "Sickpay",
    workEmail: "siri.sickpay@example.com",
    dateOfBirth: "1990-01-01",
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
  hrPlatform.recordEmploymentSalaryBasis({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryBasisCode: "MONTHLY_STANDARD",
    payModelCode: "monthly_salary",
    standardWeeklyHours: 40,
    ordinaryHoursPerMonth: 160,
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary: 32000,
    currencyCode: "SEK",
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Siri Sickpay",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Unit Test Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });

  const scheduleTemplate = timePlatform.createScheduleTemplate({
    companyId: COMPANY_ID,
    scheduleTemplateCode: "FULL_TIME_WEEKDAY",
    displayName: "Full-time weekday",
    days: [
      { weekday: 1, plannedMinutes: 480 },
      { weekday: 2, plannedMinutes: 480 },
      { weekday: 3, plannedMinutes: 480 },
      { weekday: 4, plannedMinutes: 480 },
      { weekday: 5, plannedMinutes: 480 }
    ],
    actorId: "unit-test"
  });
  timePlatform.assignScheduleTemplate({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
    validFrom: "2025-01-01",
    actorId: "unit-test"
  });

  return {
    payrollPlatform,
    timePlatform,
    employee,
    employment
  };
}
