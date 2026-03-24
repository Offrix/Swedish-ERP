import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createPensionPlatform } from "../../packages/domain-pension/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeEmailCounter = 0;

test("Phase 9.3 warns when salary exchange pushes cash salary under the 2026 threshold", () => {
  const { pensionPlatform, employee, employment } = createPensionFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 55000
  });

  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    planCode: "ITP1",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 4.5,
    actorId: "unit-test"
  });
  pensionPlatform.createSalaryExchangeAgreement({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    startsOn: "2026-01-01",
    exchangeMode: "fixed_amount",
    exchangeValue: 1000,
    actorId: "unit-test"
  });

  const payloadBundle = pensionPlatform.listPayrollPensionPayloads({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603",
    periodStartsOn: "2026-03-01",
    periodEndsOn: "2026-03-31",
    contractMonthlySalary: 55000,
    grossCompensationBeforeDeductions: 55000,
    pensionableBaseBeforeExchange: 55000,
    actorId: "unit-test"
  });

  assert.equal(payloadBundle.warnings.includes("salary_exchange_threshold_warning"), true);
  assert.equal(payloadBundle.payLinePayloads.some((line) => line.payItemCode === "SALARY_EXCHANGE_GROSS_DEDUCTION" && line.amount === 1000), true);
  assert.equal(payloadBundle.payLinePayloads.some((line) => line.payItemCode === "PENSION_PREMIUM" && line.amount === 2475), true);
  assert.equal(payloadBundle.payLinePayloads.some((line) => line.payItemCode === "EXTRA_PENSION_PREMIUM" && line.amount === 1058), true);
  assert.equal(payloadBundle.payLinePayloads.some((line) => line.payItemCode === "PENSION_SPECIAL_PAYROLL_TAX"), true);
});

test("Phase 9.3 carries pension, extra pension and salary exchange into payroll and posting", () => {
  const { pensionPlatform, payrollPlatform, ledgerPlatform, employee, employment } = createPensionFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 65000
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });

  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    planCode: "ITP1",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 4.5,
    actorId: "unit-test"
  });
  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    planCode: "EXTRA_PENSION",
    startsOn: "2026-01-01",
    contributionMode: "fixed_amount",
    fixedContributionAmount: 1500,
    providerCode: "collectum",
    actorId: "unit-test"
  });
  pensionPlatform.createSalaryExchangeAgreement({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    startsOn: "2026-01-01",
    exchangeMode: "fixed_amount",
    exchangeValue: 3000,
    actorId: "unit-test"
  });
  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    taxMode: "manual_rate",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });
  const pensionEvents = pensionPlatform.listPensionEvents({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  });
  const salaryExchangeAgreement = pensionPlatform.listSalaryExchangeAgreements({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId
  })[0];
  const basisSnapshot = pensionPlatform.listPensionBasisSnapshots({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  })[0];

  assert.equal(payRun.lines.some((line) => line.payItemCode === "PENSION_PREMIUM" && line.amount === 2925), true);
  assert.equal(payRun.lines.some((line) => line.payItemCode === "EXTRA_PENSION_PREMIUM" && line.amount === 1500), true);
  assert.equal(payRun.lines.some((line) => line.payItemCode === "EXTRA_PENSION_PREMIUM" && line.amount === 3174), true);
  assert.equal(payRun.lines.some((line) => line.payItemCode === "SALARY_EXCHANGE_GROSS_DEDUCTION" && line.amount === 3000), true);
  assert.equal(payRun.payslips[0].totals.pensionPremiumAmount, 7599);
  assert.equal(payRun.payslips[0].totals.salaryExchangeGrossDeductionAmount, 3000);
  assert.equal(pensionEvents.length, 3);
  assert.equal(
    pensionEvents.filter((event) => event.eventCode === "regular_pension_premium").every((event) => event.payrollDispatchStatus.approvedCount === 1),
    true
  );
  assert.equal(
    pensionEvents.find((event) => event.eventCode === "salary_exchange_pension_premium").payrollDispatchStatus.totalCount,
    0
  );
  assert.equal(salaryExchangeAgreement.payrollDispatchStatus.approvedCount, 2);
  assert.equal(basisSnapshot.payrollDispatchStatus.approvedCount, 1);

  const posting = payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });
  assert.equal(posting.journalLines.some((line) => line.accountNumber === "7130"), true);
  assert.equal(posting.journalLines.some((line) => line.accountNumber === "7140"), true);
  assert.equal(posting.journalLines.some((line) => line.accountNumber === "7120"), true);
  assert.equal(posting.journalLines.some((line) => line.accountNumber === "2740"), true);
  assert.equal(posting.journalLines.some((line) => line.accountNumber === "2550"), true);

  const report = pensionPlatform.createPensionReport({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    providerCode: "collectum",
    actorId: "unit-test"
  });
  const reconciliation = pensionPlatform.createPensionReconciliation({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    providerCode: "collectum",
    invoicedAmount: 7599,
    actorId: "unit-test"
  });
  assert.equal(report.totals.contributionAmount, 7599);
  assert.equal(reconciliation.status, "matched");
});

test("Phase 9.3 generates ITP2 annual salary and Fora monthly wage reporting payloads", () => {
  const { pensionPlatform, employee, employment } = createPensionFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 70000
  });

  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    planCode: "ITP2",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 6.2,
    actorId: "unit-test"
  });
  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    planCode: "FORA",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 4.2,
    actorId: "unit-test"
  });

  pensionPlatform.listPayrollPensionPayloads({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603",
    periodStartsOn: "2026-03-01",
    periodEndsOn: "2026-03-31",
    contractMonthlySalary: 70000,
    grossCompensationBeforeDeductions: 70000,
    pensionableBaseBeforeExchange: 70000,
    actorId: "unit-test"
  });

  const collectumReport = pensionPlatform.createPensionReport({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    providerCode: "collectum",
    actorId: "unit-test"
  });
  const foraReport = pensionPlatform.createPensionReport({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    providerCode: "fora",
    actorId: "unit-test"
  });
  const itp2Line = collectumReport.lines.find((line) => line.planCode === "ITP2");
  const foraLine = foraReport.lines.find((line) => line.planCode === "FORA");
  assert.equal(itp2Line.payloadJson.annualPensionableSalary, 840000);
  assert.equal(foraLine.payloadJson.wageAmount, 70000);
  assert.equal(foraReport.dueDate, "2026-04-30");
});

function createPensionFixture({ payModelCode, monthlySalary = null, hourlyRate = null }) {
  const fixedNow = new Date("2026-03-22T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const pensionPlatform = createPensionPlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    hrPlatform,
    timePlatform,
    pensionPlatform,
    ledgerPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Pia",
    familyName: "Pension",
    workEmail: `pia.${String(++employeeEmailCounter).padStart(4, "0")}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Pension specialist",
    payModelCode,
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: payModelCode,
    monthlySalary,
    hourlyRate,
    actorId: "unit-test"
  });

  return {
    hrPlatform,
    timePlatform,
    pensionPlatform,
    ledgerPlatform,
    payrollPlatform,
    employee,
    employment
  };
}
