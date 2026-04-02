import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createBalancesPlatform } from "../../packages/domain-balances/src/index.mjs";
import { createCollectiveAgreementsPlatform } from "../../packages/domain-collective-agreements/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.4 auto-calculates statutory vacation supplement, uses paid days before saved days and consumes balances on approval", () => {
  const { payrollPlatform, timePlatform, balancesPlatform, employment, paidAccount, savedAccount } = createVacationFixture({
    paidDays: 2,
    savedDays: 1
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const vacationLeaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "VACATION_PAID",
    displayName: "Vacation paid",
    payrollTreatmentCode: "vacation",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    leaveTypeId: vacationLeaveType.leaveTypeId,
    reportingPeriod: "202604",
    days: [
      { date: "2026-04-01", extentPercent: 100 },
      { date: "2026-04-02", extentPercent: 100 },
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
    payRun.lines.filter((line) => line.payItemCode === "VACATION_SUPPLEMENT").map((line) => line.amount),
    [137.6, 137.6, 137.6]
  );
  assert.equal(payRun.payslips[0].totals.taxableBase, 32412.8);
  assert.equal(payRun.payslips[0].totals.employerContributionBase, 32412.8);

  const vacationComputation = payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation;
  assert.ok(vacationComputation);
  assert.equal(vacationComputation.ruleCode, "sammaloneregeln");
  assert.equal(vacationComputation.requestedDays, 3);
  assert.equal(vacationComputation.paidDaysUsed, 2);
  assert.equal(vacationComputation.savedDaysUsed, 1);
  assert.deepEqual(vacationComputation.allocations.map((allocation) => allocation.balanceBucket), ["paid", "paid", "saved"]);

  const approved = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });
  assert.equal(approved.status, "approved");

  const balanceAfterApproval = balancesPlatform.getVacationBalance({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    snapshotDate: "2026-04-30"
  });
  assert.equal(balanceAfterApproval.paidDays, 0);
  assert.equal(balanceAfterApproval.savedDays, 0);

  const paidTransactionCountAfterApproval = balancesPlatform.listBalanceTransactions({
    companyId: COMPANY_ID,
    balanceAccountId: paidAccount.balanceAccountId
  }).length;
  const savedTransactionCountAfterApproval = balancesPlatform.listBalanceTransactions({
    companyId: COMPANY_ID,
    balanceAccountId: savedAccount.balanceAccountId
  }).length;

  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });

  assert.equal(
    balancesPlatform.listBalanceTransactions({
      companyId: COMPANY_ID,
      balanceAccountId: paidAccount.balanceAccountId
    }).length,
    paidTransactionCountAfterApproval
  );
  assert.equal(
    balancesPlatform.listBalanceTransactions({
      companyId: COMPANY_ID,
      balanceAccountId: savedAccount.balanceAccountId
    }).length,
    savedTransactionCountAfterApproval
  );
});

test("Phase 11.4 blocks automatic statutory vacation when approved leave exceeds available paid and saved days", () => {
  const { payrollPlatform, timePlatform, employment } = createVacationFixture({
    paidDays: 1,
    savedDays: 0
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const vacationLeaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "VACATION_LIMIT",
    displayName: "Vacation limit",
    payrollTreatmentCode: "vacation",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    leaveTypeId: vacationLeaveType.leaveTypeId,
    reportingPeriod: "202604",
    days: [
      { date: "2026-04-01", extentPercent: 100 },
      { date: "2026-04-02", extentPercent: 100 }
    ],
    actorId: "unit-test"
  });
  timePlatform.submitLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: leaveEntry.leaveEntryId,
    actorId: "unit-test"
  });

  assert.throws(
    () =>
      payrollPlatform.createPayRun({
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
      }),
    (error) => {
      assert.equal(error.code, "statutory_vacation_balance_insufficient");
      return true;
    }
  );
});

test("Phase 11.4 auto-generates vacation supplement from the agreement overlay when an executable override exists", () => {
  const { payrollPlatform, timePlatform, employment } = createVacationFixture({
    paidDays: 1,
    savedDays: 0,
    vacationSupplementPercent: 0.8
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const vacationLeaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "VACATION_OVERLAY",
    displayName: "Vacation overlay",
    payrollTreatmentCode: "vacation",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    leaveTypeId: vacationLeaveType.leaveTypeId,
    reportingPeriod: "202604",
    days: [{ date: "2026-04-01", extentPercent: 100 }],
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

  const supplementLine = payRun.lines.find((line) => line.payItemCode === "VACATION_SUPPLEMENT");
  assert.ok(supplementLine);
  assert.equal(supplementLine.unitRate, 256);
  assert.equal(supplementLine.amount, 256);
  assert.equal(
    payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.supplementRateSource,
    "agreement_overlay_auto"
  );
});

test("Phase 11.4 auto-calculates statutory vacation pay for hourly salary with procentregeln from approved earning-year runs", () => {
  const { payrollPlatform, timePlatform, balancesPlatform, employment, paidAccount, savedAccount } = createVacationFixture({
    paidDays: 2,
    savedDays: 1,
    payModelCode: "hourly_salary",
    salaryModelCode: "hourly_salary",
    monthlySalary: null,
    hourlyRate: 200,
    ordinaryHoursPerMonth: 173.33
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  for (const workDate of [
    "2026-03-02",
    "2026-03-03",
    "2026-03-04",
    "2026-03-05",
    "2026-03-06",
    "2026-03-09",
    "2026-03-10",
    "2026-03-11",
    "2026-03-12",
    "2026-03-13"
  ]) {
    timePlatform.createTimeEntry({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      workDate,
      workedMinutes: 480,
      approvalMode: "auto",
      actorId: "unit-test"
    });
  }
  timePlatform.approveTimeSet({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    actorId: "unit-test"
  });
  approveVacationHistoryRun({
    payrollPlatform,
    payCalendarId: payCalendar.payCalendarId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  });
  approveVacationHistoryRun({
    payrollPlatform,
    payCalendarId: payCalendar.payCalendarId,
    employmentId: employment.employmentId,
    reportingPeriod: "202602",
    manualInputs: [
      {
        employmentId: employment.employmentId,
        payItemCode: "BONUS",
        amount: 4000,
        processingStep: 4,
        note: "Vacation basis bonus"
      }
    ]
  });

  const vacationLeaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "VACATION_PERCENTAGE_RULE",
    displayName: "Vacation percentage rule",
    payrollTreatmentCode: "vacation",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    leaveTypeId: vacationLeaveType.leaveTypeId,
    reportingPeriod: "202604",
    days: [
      { date: "2026-04-01", extentPercent: 100 },
      { date: "2026-04-02", extentPercent: 100 },
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
    payRun.lines.filter((line) => line.payItemCode === "VACATION_PAY").map((line) => line.amount),
    [96, 96, 96]
  );
  assert.equal(payRun.lines.some((line) => line.payItemCode === "VACATION_SUPPLEMENT"), false);
  assert.equal(payRun.payslips[0].totals.taxableBase, 288);
  assert.equal(payRun.payslips[0].totals.employerContributionBase, 288);

  const vacationComputation = payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation;
  assert.ok(vacationComputation);
  assert.equal(vacationComputation.ruleCode, "procentregeln");
  assert.equal(vacationComputation.earningYearStartDate, "2025-04-01");
  assert.equal(vacationComputation.earningYearEndDate, "2026-03-31");
  assert.equal(vacationComputation.vacationPayBasisAmount, 20000);
  assert.equal(vacationComputation.vacationPayPercent, 12);
  assert.equal(vacationComputation.vacationPayPerDayAmount, 96);
  assert.equal(vacationComputation.paidDaysUsed, 2);
  assert.equal(vacationComputation.savedDaysUsed, 1);
  assert.equal(vacationComputation.basisPayRunIds.length, 2);

  const approved = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });
  assert.equal(approved.status, "approved");

  const balanceAfterApproval = balancesPlatform.getVacationBalance({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    snapshotDate: "2026-04-30"
  });
  assert.equal(balanceAfterApproval.paidDays, 0);
  assert.equal(balanceAfterApproval.savedDays, 0);

  const paidTransactionCountAfterApproval = balancesPlatform.listBalanceTransactions({
    companyId: COMPANY_ID,
    balanceAccountId: paidAccount.balanceAccountId
  }).length;
  const savedTransactionCountAfterApproval = balancesPlatform.listBalanceTransactions({
    companyId: COMPANY_ID,
    balanceAccountId: savedAccount.balanceAccountId
  }).length;

  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });

  assert.equal(
    balancesPlatform.listBalanceTransactions({
      companyId: COMPANY_ID,
      balanceAccountId: paidAccount.balanceAccountId
    }).length,
    paidTransactionCountAfterApproval
  );
  assert.equal(
    balancesPlatform.listBalanceTransactions({
      companyId: COMPANY_ID,
      balanceAccountId: savedAccount.balanceAccountId
    }).length,
    savedTransactionCountAfterApproval
  );
});

test("Phase 11.4 auto-settles sammaloneregeln variable vacation pay once after the vacation year closes", () => {
  const { payrollPlatform, employment } = createVacationFixture({
    paidDays: 2,
    savedDays: 0
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  approveVacationHistoryRun({
    payrollPlatform,
    payCalendarId: payCalendar.payCalendarId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603",
    manualInputs: [
      {
        employmentId: employment.employmentId,
        payItemCode: "BONUS",
        amount: 2000,
        processingStep: 4,
        note: "Variable vacation basis below threshold"
      }
    ]
  });

  const aprilRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    statutoryProfiles: [createVacationStatutoryProfile(employment.employmentId)],
    actorId: "unit-test"
  });

  const settlementLines = aprilRun.lines.filter(
    (line) => line.payItemCode === "VACATION_PAY" && line.sourceType === "vacation_year_settlement"
  );
  assert.equal(settlementLines.length, 1);
  assert.equal(settlementLines[0].amount, 240);

  const variablePayComputation = aprilRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationVariablePayComputation;
  assert.ok(variablePayComputation);
  assert.equal(variablePayComputation.ruleCode, "sammaloneregeln");
  assert.equal(variablePayComputation.variableVacationPayBasisAmount, 2000);
  assert.equal(variablePayComputation.variableVacationPayAmount, 240);
  assert.equal(variablePayComputation.settlementDueDate, "2026-04-30");

  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: aprilRun.payRunId,
    actorId: "unit-test"
  });

  const mayRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202605",
    statutoryProfiles: [createVacationStatutoryProfile(employment.employmentId)],
    actorId: "unit-test"
  });
  assert.equal(mayRun.lines.some((line) => line.sourceType === "vacation_year_settlement"), false);
});

test("Phase 11.4 switches monthly salary vacation to procentregeln when variable pay reaches ten percent of the earning year", () => {
  const { payrollPlatform, timePlatform, employment } = createVacationFixture({
    paidDays: 3,
    savedDays: 0
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  approveVacationHistoryRun({
    payrollPlatform,
    payCalendarId: payCalendar.payCalendarId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603",
    manualInputs: [
      {
        employmentId: employment.employmentId,
        payItemCode: "BONUS",
        amount: 4000,
        processingStep: 4,
        note: "Variable vacation basis above threshold"
      }
    ]
  });

  const vacationLeaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "VACATION_MONTHLY_PERCENTAGE_RULE",
    displayName: "Vacation monthly percentage rule",
    payrollTreatmentCode: "vacation",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    leaveTypeId: vacationLeaveType.leaveTypeId,
    reportingPeriod: "202604",
    days: [
      { date: "2026-04-01", extentPercent: 100 },
      { date: "2026-04-02", extentPercent: 100 },
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
    statutoryProfiles: [createVacationStatutoryProfile(employment.employmentId)],
    actorId: "unit-test"
  });

  assert.deepEqual(
    payRun.lines
      .filter((line) => line.payItemCode === "VACATION_PAY" && line.sourceType === "leave_entry")
      .map((line) => line.amount),
    [172.8, 172.8, 172.8]
  );
  assert.equal(payRun.lines.some((line) => line.payItemCode === "VACATION_SUPPLEMENT"), false);

  const vacationComputation = payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation;
  assert.ok(vacationComputation);
  assert.equal(vacationComputation.ruleCode, "procentregeln");
  assert.equal(vacationComputation.ruleReasonCode, "monthly_variable_share_threshold");
  assert.equal(vacationComputation.vacationPayBasisAmount, 36000);
  assert.equal(vacationComputation.variableVacationBasisAmount, 4000);
  assert.equal(vacationComputation.variableSharePercent, 11.11);
  assert.equal(vacationComputation.vacationPayPerDayAmount, 172.8);
});

test("Phase 11.4 values vacation liability from remaining paid and saved days plus employer contributions", () => {
  const { payrollPlatform, employment } = createVacationFixture({
    paidDays: 2,
    savedDays: 1
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    statutoryProfiles: [createVacationStatutoryProfile(employment.employmentId)],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });

  const snapshot = payrollPlatform.createVacationLiabilitySnapshot({
    companyId: COMPANY_ID,
    reportingPeriod: "202604",
    actorId: "unit-test"
  });
  assert.equal(snapshot.employeeSnapshots.length, 1);
  const employeeSnapshot = snapshot.employeeSnapshots[0];
  assert.equal(employeeSnapshot.vacationRuleCode, "sammaloneregeln");
  assert.equal(employeeSnapshot.paidDaysRemaining, 2);
  assert.equal(employeeSnapshot.savedDaysRemaining, 1);
  assert.equal(employeeSnapshot.remainingDays, 3);
  assert.equal(employeeSnapshot.vacationSalaryPerDayAmount, 1476.92);
  assert.equal(employeeSnapshot.vacationSupplementPerDayAmount, 137.6);
  assert.equal(employeeSnapshot.salaryLiabilityAmount, 4430.76);
  assert.equal(employeeSnapshot.supplementLiabilityAmount, 412.8);
  assert.equal(employeeSnapshot.liabilityAmount, 4843.56);
  assert.equal(employeeSnapshot.employerContributionRatePercent, 31.42);
  assert.equal(employeeSnapshot.employerContributionLiabilityAmount, 1521.85);
  assert.equal(employeeSnapshot.totalLiabilityAmount, 6365.41);
});

function createVacationFixture({
  paidDays,
  savedDays,
  vacationSupplementPercent = null,
  payModelCode = "monthly_salary",
  salaryModelCode = "monthly_salary",
  monthlySalary = 32000,
  hourlyRate = null,
  ordinaryHoursPerMonth = 160,
  standardWeeklyHours = 40
} = {}) {
  const fixedNow = new Date("2026-04-01T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const balancesPlatform = createBalancesPlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const collectiveAgreementsPlatform = createCollectiveAgreementsPlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform,
    balancesPlatform,
    collectiveAgreementsPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    balancesPlatform,
    collectiveAgreementsPlatform,
    timePlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Vera",
    familyName: "Vacation",
    workEmail: `vera.vacation.${payModelCode}.${paidDays}.${savedDays}.${vacationSupplementPercent || 0}.${hourlyRate || 0}@example.com`,
    dateOfBirth: "1990-01-01",
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll specialist",
    payModelCode,
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.recordEmploymentSalaryBasis({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryBasisCode: payModelCode === "hourly_salary" ? "HOURLY_STANDARD" : "MONTHLY_STANDARD",
    payModelCode,
    standardWeeklyHours,
    ordinaryHoursPerMonth,
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode,
    monthlySalary,
    hourlyRate,
    currencyCode: "SEK",
    collectiveAgreementCode: vacationSupplementPercent == null ? null : "TEKNIK_OVERLAY",
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Vera Vacation",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Unit Test Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });

  const scheduleTemplate = timePlatform.createScheduleTemplate({
    companyId: COMPANY_ID,
    scheduleTemplateCode: "FULL_TIME_WEEKDAY_VACATION",
    displayName: "Full-time weekday vacation",
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

  const paidType = balancesPlatform.createBalanceType({
    companyId: COMPANY_ID,
    balanceTypeCode: "VACATION_PAID_DAYS",
    label: "Vacation paid days",
    unitCode: "days",
    negativeAllowed: false,
    carryForwardModeCode: "none",
    expiryModeCode: "none",
    actorId: "unit-test"
  });
  const savedType = balancesPlatform.createBalanceType({
    companyId: COMPANY_ID,
    balanceTypeCode: "VACATION_SAVED_DAYS",
    label: "Vacation saved days",
    unitCode: "days",
    negativeAllowed: false,
    carryForwardModeCode: "none",
    expiryModeCode: "fixed_date",
    expiryMonthDay: "03-31",
    expiryYearOffset: 5,
    actorId: "unit-test"
  });
  balancesPlatform.createVacationBalanceProfile({
    companyId: COMPANY_ID,
    vacationBalanceProfileCode: "SEMESTERLAGEN",
    label: "Semesterlagen",
    paidDaysBalanceTypeCode: paidType.balanceTypeCode,
    savedDaysBalanceTypeCode: savedType.balanceTypeCode,
    vacationYearStartMonthDay: "04-01",
    minimumPaidDaysToRetain: 20,
    maxSavedDaysPerYear: 5,
    actorId: "unit-test"
  });

  const paidAccount = balancesPlatform.openBalanceAccount({
    companyId: COMPANY_ID,
    balanceTypeCode: paidType.balanceTypeCode,
    ownerTypeCode: "employment",
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    actorId: "unit-test"
  });
  const savedAccount = balancesPlatform.openBalanceAccount({
    companyId: COMPANY_ID,
    balanceTypeCode: savedType.balanceTypeCode,
    ownerTypeCode: "employment",
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    actorId: "unit-test"
  });
  if (paidDays > 0) {
    balancesPlatform.recordBalanceTransaction({
      companyId: COMPANY_ID,
      balanceAccountId: paidAccount.balanceAccountId,
      effectiveDate: "2025-04-01",
      transactionTypeCode: "baseline",
      quantityDelta: paidDays,
      sourceDomainCode: "PAYROLL_MIGRATION",
      sourceObjectType: "migration_batch",
      sourceObjectId: "vacation-paid-baseline",
      actorId: "unit-test"
    });
  }
  if (savedDays > 0) {
    balancesPlatform.recordBalanceTransaction({
      companyId: COMPANY_ID,
      balanceAccountId: savedAccount.balanceAccountId,
      effectiveDate: "2025-04-01",
      transactionTypeCode: "baseline",
      quantityDelta: savedDays,
      sourceDomainCode: "PAYROLL_MIGRATION",
      sourceObjectType: "migration_batch",
      sourceObjectId: "vacation-saved-baseline",
      actorId: "unit-test"
    });
  }

  if (vacationSupplementPercent != null) {
    const family = collectiveAgreementsPlatform.createAgreementFamily({
      companyId: COMPANY_ID,
      code: "TEKNIK_OVERLAY",
      name: "Teknik Overlay",
      actorId: "unit-test"
    });
    const version = collectiveAgreementsPlatform.publishAgreementVersion({
      companyId: COMPANY_ID,
      agreementFamilyId: family.agreementFamilyId,
      versionCode: "TEKNIK_OVERLAY_2026_01",
      effectiveFrom: "2025-01-01",
      rulepackVersion: "2026.1",
      ruleSet: {
        rateComponents: {
          vacationSupplement: {
            calculationMode: "percent_of_basis",
            basisCode: "contract_monthly_salary",
            percent: vacationSupplementPercent,
            autoGenerate: true
          }
        }
      },
      actorId: "unit-test"
    });
    const catalogEntry = collectiveAgreementsPlatform.publishAgreementCatalogEntry({
      companyId: COMPANY_ID,
      agreementVersionId: version.agreementVersionId,
      dropdownLabel: "Teknik Overlay 2026",
      actorId: "unit-test"
    });
    collectiveAgreementsPlatform.assignAgreementToEmployment({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
      effectiveFrom: "2025-01-01",
      assignmentReasonCode: "HIRING",
      actorId: "unit-test"
    });
  }

  return {
    payrollPlatform,
    timePlatform,
    balancesPlatform,
    employment,
    paidAccount,
    savedAccount
  };
}

function approveVacationHistoryRun({
  payrollPlatform,
  payCalendarId,
  employmentId,
  reportingPeriod,
  manualInputs = []
}) {
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId,
    reportingPeriod,
    employmentIds: [employmentId],
    statutoryProfiles: [
      {
        employmentId,
        taxMode: "manual_rate",
        manualRateReasonCode: "emergency_manual_transition",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    manualInputs,
    actorId: "unit-test"
  });
  return payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });
}

function createVacationStatutoryProfile(employmentId) {
  return {
    employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full"
  };
}
