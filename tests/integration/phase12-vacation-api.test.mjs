import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.4 API auto-calculates statutory vacation supplement and consumes paid/saved balances on approval", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const employee = platform.createEmployee({
      companyId: COMPANY_ID,
      givenName: "Alva",
      familyName: "Api Vacation",
      workEmail: "alva.api.vacation@example.com",
      dateOfBirth: "1990-01-01",
      actorId: "integration-test"
    });
    const employment = platform.createEmployment({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Payroll specialist",
      payModelCode: "monthly_salary",
      startDate: "2025-01-01",
      actorId: "integration-test"
    });
    platform.recordEmploymentSalaryBasis({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryBasisCode: "MONTHLY_STANDARD",
      payModelCode: "monthly_salary",
      standardWeeklyHours: 40,
      ordinaryHoursPerMonth: 160,
      actorId: "integration-test"
    });
    platform.addEmploymentContract({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryModelCode: "monthly_salary",
      monthlySalary: 32000,
      currencyCode: "SEK",
      actorId: "integration-test"
    });
    platform.addEmployeeBankAccount({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      payoutMethod: "domestic_account",
      accountHolderName: "Alva Api Vacation",
      clearingNumber: "5000",
      accountNumber: "1234567890",
      bankName: "Integration Test Bank",
      primaryAccount: true,
      actorId: "integration-test"
    });
    const scheduleTemplate = platform.createScheduleTemplate({
      companyId: COMPANY_ID,
      scheduleTemplateCode: "FULL_TIME_WEEKDAY_VACATION_API",
      displayName: "Full-time weekday vacation API",
      days: [
        { weekday: 1, plannedMinutes: 480 },
        { weekday: 2, plannedMinutes: 480 },
        { weekday: 3, plannedMinutes: 480 },
        { weekday: 4, plannedMinutes: 480 },
        { weekday: 5, plannedMinutes: 480 }
      ],
      actorId: "integration-test"
    });
    platform.assignScheduleTemplate({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
      validFrom: "2025-01-01",
      actorId: "integration-test"
    });

    const paidType = platform.createBalanceType({
      companyId: COMPANY_ID,
      balanceTypeCode: "VACATION_PAID_DAYS",
      label: "Vacation paid days",
      unitCode: "days",
      negativeAllowed: false,
      carryForwardModeCode: "none",
      expiryModeCode: "none",
      actorId: "integration-test"
    });
    const savedType = platform.createBalanceType({
      companyId: COMPANY_ID,
      balanceTypeCode: "VACATION_SAVED_DAYS",
      label: "Vacation saved days",
      unitCode: "days",
      negativeAllowed: false,
      carryForwardModeCode: "none",
      expiryModeCode: "fixed_date",
      expiryMonthDay: "03-31",
      expiryYearOffset: 5,
      actorId: "integration-test"
    });
    platform.createVacationBalanceProfile({
      companyId: COMPANY_ID,
      vacationBalanceProfileCode: "SEMESTERLAGEN",
      label: "Semesterlagen",
      paidDaysBalanceTypeCode: paidType.balanceTypeCode,
      savedDaysBalanceTypeCode: savedType.balanceTypeCode,
      vacationYearStartMonthDay: "04-01",
      minimumPaidDaysToRetain: 20,
      maxSavedDaysPerYear: 5,
      actorId: "integration-test"
    });
    const paidAccount = platform.openBalanceAccount({
      companyId: COMPANY_ID,
      balanceTypeCode: paidType.balanceTypeCode,
      ownerTypeCode: "employment",
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      actorId: "integration-test"
    });
    const savedAccount = platform.openBalanceAccount({
      companyId: COMPANY_ID,
      balanceTypeCode: savedType.balanceTypeCode,
      ownerTypeCode: "employment",
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      actorId: "integration-test"
    });
    platform.recordBalanceTransaction({
      companyId: COMPANY_ID,
      balanceAccountId: paidAccount.balanceAccountId,
      effectiveDate: "2025-04-01",
      transactionTypeCode: "baseline",
      quantityDelta: 2,
      sourceDomainCode: "PAYROLL_MIGRATION",
      sourceObjectType: "migration_batch",
      sourceObjectId: "vacation-paid-baseline-api",
      actorId: "integration-test"
    });
    platform.recordBalanceTransaction({
      companyId: COMPANY_ID,
      balanceAccountId: savedAccount.balanceAccountId,
      effectiveDate: "2025-04-01",
      transactionTypeCode: "baseline",
      quantityDelta: 1,
      sourceDomainCode: "PAYROLL_MIGRATION",
      sourceObjectType: "migration_batch",
      sourceObjectId: "vacation-saved-baseline-api",
      actorId: "integration-test"
    });

    const leaveType = await requestJson(baseUrl, "/v1/hr/leave-types", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        leaveTypeCode: "VACATION_API",
        displayName: "Vacation API",
        payrollTreatmentCode: "vacation",
        requiresManagerApproval: false
      }
    });
    assert.equal(leaveType.payrollTreatmentCode, "vacation");

    const leaveEntry = platform.createLeaveEntry({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      reportingPeriod: "202604",
      days: [
        { date: "2026-04-01", extentPercent: 100 },
        { date: "2026-04-02", extentPercent: 100 },
        { date: "2026-04-03", extentPercent: 100 }
      ],
      actorId: "integration-test"
    });
    platform.submitLeaveEntry({
      companyId: COMPANY_ID,
      leaveEntryId: leaveEntry.leaveEntryId,
      actorId: "integration-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    const payRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        employmentIds: [employment.employmentId],
        statutoryProfiles: [
          {
            employmentId: employment.employmentId,
            taxMode: "manual_rate",
            manualRateReasonCode: "emergency_manual_transition",
            taxRatePercent: 30,
            contributionClassCode: "full"
          }
        ]
      }
    });

    assert.deepEqual(
      payRun.lines.filter((line) => line.payItemCode === "VACATION_SUPPLEMENT").map((line) => line.amount),
      [137.6, 137.6, 137.6]
    );
    assert.equal(payRun.payslips[0].totals.taxableBase, 32412.8);
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.paidDaysUsed,
      2
    );
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.savedDaysUsed,
      1
    );

    const approved = await requestJson(baseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approved.status, "approved");

    const balanceAfterApproval = await requestJson(
      baseUrl,
      `/v1/balances/vacation-balances?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}&snapshotDate=2026-04-30`,
      {
        token: sessionToken
      }
    );
    assert.equal(balanceAfterApproval.paidDays, 0);
    assert.equal(balanceAfterApproval.savedDays, 0);
  } finally {
    await stopServer(server);
  }
});

test("Phase 11.4 API auto-calculates statutory vacation pay with procentregeln for hourly salary", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const employee = platform.createEmployee({
      companyId: COMPANY_ID,
      givenName: "Hugo",
      familyName: "Api Percentage Vacation",
      workEmail: "hugo.api.percentage.vacation@example.com",
      dateOfBirth: "1990-01-01",
      actorId: "integration-test"
    });
    const employment = platform.createEmployment({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Hourly consultant",
      payModelCode: "hourly_salary",
      startDate: "2025-01-01",
      actorId: "integration-test"
    });
    platform.recordEmploymentSalaryBasis({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryBasisCode: "HOURLY_STANDARD",
      payModelCode: "hourly_salary",
      standardWeeklyHours: 40,
      ordinaryHoursPerMonth: 173.33,
      actorId: "integration-test"
    });
    platform.addEmploymentContract({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryModelCode: "hourly_salary",
      hourlyRate: 200,
      currencyCode: "SEK",
      actorId: "integration-test"
    });
    platform.addEmployeeBankAccount({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      payoutMethod: "domestic_account",
      accountHolderName: "Hugo Api Percentage Vacation",
      clearingNumber: "5000",
      accountNumber: "1234567890",
      bankName: "Integration Test Bank",
      primaryAccount: true,
      actorId: "integration-test"
    });
    const scheduleTemplate = platform.createScheduleTemplate({
      companyId: COMPANY_ID,
      scheduleTemplateCode: "FULL_TIME_WEEKDAY_VACATION_API_PERCENTAGE",
      displayName: "Full-time weekday vacation API percentage",
      days: [
        { weekday: 1, plannedMinutes: 480 },
        { weekday: 2, plannedMinutes: 480 },
        { weekday: 3, plannedMinutes: 480 },
        { weekday: 4, plannedMinutes: 480 },
        { weekday: 5, plannedMinutes: 480 }
      ],
      actorId: "integration-test"
    });
    platform.assignScheduleTemplate({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
      validFrom: "2025-01-01",
      actorId: "integration-test"
    });

    const paidType = platform.createBalanceType({
      companyId: COMPANY_ID,
      balanceTypeCode: "VACATION_PAID_DAYS",
      label: "Vacation paid days",
      unitCode: "days",
      negativeAllowed: false,
      carryForwardModeCode: "none",
      expiryModeCode: "none",
      actorId: "integration-test"
    });
    const savedType = platform.createBalanceType({
      companyId: COMPANY_ID,
      balanceTypeCode: "VACATION_SAVED_DAYS",
      label: "Vacation saved days",
      unitCode: "days",
      negativeAllowed: false,
      carryForwardModeCode: "none",
      expiryModeCode: "fixed_date",
      expiryMonthDay: "03-31",
      expiryYearOffset: 5,
      actorId: "integration-test"
    });
    platform.createVacationBalanceProfile({
      companyId: COMPANY_ID,
      vacationBalanceProfileCode: "SEMESTERLAGEN",
      label: "Semesterlagen",
      paidDaysBalanceTypeCode: paidType.balanceTypeCode,
      savedDaysBalanceTypeCode: savedType.balanceTypeCode,
      vacationYearStartMonthDay: "04-01",
      minimumPaidDaysToRetain: 20,
      maxSavedDaysPerYear: 5,
      actorId: "integration-test"
    });
    const paidAccount = platform.openBalanceAccount({
      companyId: COMPANY_ID,
      balanceTypeCode: paidType.balanceTypeCode,
      ownerTypeCode: "employment",
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      actorId: "integration-test"
    });
    const savedAccount = platform.openBalanceAccount({
      companyId: COMPANY_ID,
      balanceTypeCode: savedType.balanceTypeCode,
      ownerTypeCode: "employment",
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      actorId: "integration-test"
    });
    platform.recordBalanceTransaction({
      companyId: COMPANY_ID,
      balanceAccountId: paidAccount.balanceAccountId,
      effectiveDate: "2026-04-01",
      transactionTypeCode: "baseline",
      quantityDelta: 2,
      sourceDomainCode: "PAYROLL_MIGRATION",
      sourceObjectType: "migration_batch",
      sourceObjectId: "vacation-paid-baseline-api-percentage",
      actorId: "integration-test"
    });
    platform.recordBalanceTransaction({
      companyId: COMPANY_ID,
      balanceAccountId: savedAccount.balanceAccountId,
      effectiveDate: "2026-04-01",
      transactionTypeCode: "baseline",
      quantityDelta: 1,
      sourceDomainCode: "PAYROLL_MIGRATION",
      sourceObjectType: "migration_batch",
      sourceObjectId: "vacation-saved-baseline-api-percentage",
      actorId: "integration-test"
    });

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
      platform.createTimeEntry({
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        workDate,
        workedMinutes: 480,
        approvalMode: "auto",
        actorId: "integration-test"
      });
    }
    platform.approveTimeSet({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      startsOn: "2026-03-01",
      endsOn: "2026-03-31",
      actorId: "integration-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    await createApprovedVacationHistoryRunApi({
      baseUrl,
      token: sessionToken,
      payCalendarId: payCalendar.payCalendarId,
      employmentId: employment.employmentId,
      reportingPeriod: "202603"
    });
    await createApprovedVacationHistoryRunApi({
      baseUrl,
      token: sessionToken,
      payCalendarId: payCalendar.payCalendarId,
      employmentId: employment.employmentId,
      reportingPeriod: "202602",
      manualInputs: [
        {
          employmentId: employment.employmentId,
          payItemCode: "BONUS",
          amount: 4000,
          processingStep: 4,
          note: "Vacation basis bonus API"
        }
      ]
    });

    const leaveType = await requestJson(baseUrl, "/v1/hr/leave-types", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        leaveTypeCode: "VACATION_API_PERCENTAGE_RULE",
        displayName: "Vacation API percentage rule",
        payrollTreatmentCode: "vacation",
        requiresManagerApproval: false
      }
    });
    assert.equal(leaveType.payrollTreatmentCode, "vacation");

    const leaveEntry = platform.createLeaveEntry({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      reportingPeriod: "202604",
      days: [
        { date: "2026-04-01", extentPercent: 100 },
        { date: "2026-04-02", extentPercent: 100 },
        { date: "2026-04-03", extentPercent: 100 }
      ],
      actorId: "integration-test"
    });
    platform.submitLeaveEntry({
      companyId: COMPANY_ID,
      leaveEntryId: leaveEntry.leaveEntryId,
      actorId: "integration-test"
    });

    const payRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        employmentIds: [employment.employmentId],
        statutoryProfiles: [
          {
            employmentId: employment.employmentId,
            taxMode: "manual_rate",
            manualRateReasonCode: "emergency_manual_transition",
            taxRatePercent: 30,
            contributionClassCode: "full"
          }
        ]
      }
    });

    assert.deepEqual(
      payRun.lines.filter((line) => line.payItemCode === "VACATION_PAY").map((line) => line.amount),
      [96, 96, 96]
    );
    assert.equal(payRun.lines.some((line) => line.payItemCode === "VACATION_SUPPLEMENT"), false);
    assert.equal(payRun.payslips[0].totals.taxableBase, 288);
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.ruleCode,
      "procentregeln"
    );
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.vacationPayBasisAmount,
      20000
    );
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.vacationPayPerDayAmount,
      96
    );

    const approved = await requestJson(baseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approved.status, "approved");

    const balanceAfterApproval = await requestJson(
      baseUrl,
      `/v1/balances/vacation-balances?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}&snapshotDate=2026-04-30`,
      {
        token: sessionToken
      }
    );
    assert.equal(balanceAfterApproval.paidDays, 0);
    assert.equal(balanceAfterApproval.savedDays, 0);
  } finally {
    await stopServer(server);
  }
});

test("Phase 11.4 API switches monthly salary vacation to procentregeln when variable pay reaches ten percent", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const employee = platform.createEmployee({
      companyId: COMPANY_ID,
      givenName: "Maja",
      familyName: "Api Monthly Percentage Vacation",
      workEmail: "maja.api.monthly.percentage.vacation@example.com",
      dateOfBirth: "1990-01-01",
      actorId: "integration-test"
    });
    const employment = platform.createEmployment({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Payroll specialist",
      payModelCode: "monthly_salary",
      startDate: "2025-01-01",
      actorId: "integration-test"
    });
    platform.recordEmploymentSalaryBasis({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryBasisCode: "MONTHLY_STANDARD",
      payModelCode: "monthly_salary",
      standardWeeklyHours: 40,
      ordinaryHoursPerMonth: 160,
      actorId: "integration-test"
    });
    platform.addEmploymentContract({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryModelCode: "monthly_salary",
      monthlySalary: 32000,
      currencyCode: "SEK",
      actorId: "integration-test"
    });
    platform.addEmployeeBankAccount({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      payoutMethod: "domestic_account",
      accountHolderName: "Maja Api Monthly Percentage Vacation",
      clearingNumber: "5000",
      accountNumber: "1234567890",
      bankName: "Integration Test Bank",
      primaryAccount: true,
      actorId: "integration-test"
    });
    const scheduleTemplate = platform.createScheduleTemplate({
      companyId: COMPANY_ID,
      scheduleTemplateCode: "FULL_TIME_WEEKDAY_VACATION_API_MONTHLY_PERCENTAGE",
      displayName: "Full-time weekday vacation API monthly percentage",
      days: [
        { weekday: 1, plannedMinutes: 480 },
        { weekday: 2, plannedMinutes: 480 },
        { weekday: 3, plannedMinutes: 480 },
        { weekday: 4, plannedMinutes: 480 },
        { weekday: 5, plannedMinutes: 480 }
      ],
      actorId: "integration-test"
    });
    platform.assignScheduleTemplate({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
      validFrom: "2025-01-01",
      actorId: "integration-test"
    });

    const paidType = platform.createBalanceType({
      companyId: COMPANY_ID,
      balanceTypeCode: "VACATION_PAID_DAYS",
      label: "Vacation paid days",
      unitCode: "days",
      negativeAllowed: false,
      carryForwardModeCode: "none",
      expiryModeCode: "none",
      actorId: "integration-test"
    });
    const savedType = platform.createBalanceType({
      companyId: COMPANY_ID,
      balanceTypeCode: "VACATION_SAVED_DAYS",
      label: "Vacation saved days",
      unitCode: "days",
      negativeAllowed: false,
      carryForwardModeCode: "none",
      expiryModeCode: "fixed_date",
      expiryMonthDay: "03-31",
      expiryYearOffset: 5,
      actorId: "integration-test"
    });
    platform.createVacationBalanceProfile({
      companyId: COMPANY_ID,
      vacationBalanceProfileCode: "SEMESTERLAGEN",
      label: "Semesterlagen",
      paidDaysBalanceTypeCode: paidType.balanceTypeCode,
      savedDaysBalanceTypeCode: savedType.balanceTypeCode,
      vacationYearStartMonthDay: "04-01",
      minimumPaidDaysToRetain: 20,
      maxSavedDaysPerYear: 5,
      actorId: "integration-test"
    });
    const paidAccount = platform.openBalanceAccount({
      companyId: COMPANY_ID,
      balanceTypeCode: paidType.balanceTypeCode,
      ownerTypeCode: "employment",
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      actorId: "integration-test"
    });
    platform.recordBalanceTransaction({
      companyId: COMPANY_ID,
      balanceAccountId: paidAccount.balanceAccountId,
      effectiveDate: "2026-04-01",
      transactionTypeCode: "baseline",
      quantityDelta: 3,
      sourceDomainCode: "PAYROLL_MIGRATION",
      sourceObjectType: "migration_batch",
      sourceObjectId: "vacation-paid-baseline-api-monthly-percentage",
      actorId: "integration-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    await createApprovedVacationHistoryRunApi({
      baseUrl,
      token: sessionToken,
      payCalendarId: payCalendar.payCalendarId,
      employmentId: employment.employmentId,
      reportingPeriod: "202603",
      manualInputs: [
        {
          employmentId: employment.employmentId,
          payItemCode: "BONUS",
          amount: 4000,
          processingStep: 4,
          note: "Monthly percentage threshold bonus API"
        }
      ]
    });

    const leaveType = await requestJson(baseUrl, "/v1/hr/leave-types", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        leaveTypeCode: "VACATION_API_MONTHLY_PERCENTAGE_RULE",
        displayName: "Vacation API monthly percentage rule",
        payrollTreatmentCode: "vacation",
        requiresManagerApproval: false
      }
    });
    const leaveEntry = platform.createLeaveEntry({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      reportingPeriod: "202604",
      days: [
        { date: "2026-04-01", extentPercent: 100 },
        { date: "2026-04-02", extentPercent: 100 },
        { date: "2026-04-03", extentPercent: 100 }
      ],
      actorId: "integration-test"
    });
    platform.submitLeaveEntry({
      companyId: COMPANY_ID,
      leaveEntryId: leaveEntry.leaveEntryId,
      actorId: "integration-test"
    });

    const payRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        employmentIds: [employment.employmentId],
        statutoryProfiles: [
          {
            employmentId: employment.employmentId,
            taxMode: "manual_rate",
            manualRateReasonCode: "emergency_manual_transition",
            taxRatePercent: 30,
            contributionClassCode: "full"
          }
        ]
      }
    });

    assert.deepEqual(
      payRun.lines
        .filter((line) => line.payItemCode === "VACATION_PAY" && line.sourceType === "leave_entry")
        .map((line) => line.amount),
      [172.8, 172.8, 172.8]
    );
    assert.equal(payRun.lines.some((line) => line.payItemCode === "VACATION_SUPPLEMENT"), false);
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.ruleCode,
      "procentregeln"
    );
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.ruleReasonCode,
      "monthly_variable_share_threshold"
    );
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.vacationPayBasisAmount,
      36000
    );
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.variableVacationBasisAmount,
      4000
    );
    assert.equal(
      payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].vacationPayrollComputation.variableSharePercent,
      11.11
    );
  } finally {
    await stopServer(server);
  }
});

function enabledFlags() {
  return {
    phase1AuthOnboardingEnabled: true,
    phase2DocumentArchiveEnabled: true,
    phase2CompanyInboxEnabled: true,
    phase2OcrReviewEnabled: true,
    phase3LedgerEnabled: true,
    phase4VatEnabled: true,
    phase5ArEnabled: true,
    phase6ApEnabled: true,
    phase7HrEnabled: true,
    phase7TimeEnabled: true,
    phase7AbsenceEnabled: true,
    phase8PayrollEnabled: true,
    phase12PayrollTrialGuardsEnabled: true
  };
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: started.sessionToken
    });
    await requestJson(baseUrl, "/v1/auth/bankid/collect", {
      method: "POST",
      token: started.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
  }
  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())
    ? crypto.randomUUID()
    : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}

async function createApprovedVacationHistoryRunApi({
  baseUrl,
  token,
  payCalendarId,
  employmentId,
  reportingPeriod,
  manualInputs = []
}) {
  const payRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
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
      manualInputs
    }
  });
  return requestJson(baseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
    method: "POST",
    token,
    expectedStatus: 200,
    body: {
      companyId: COMPANY_ID
    }
  });
}
