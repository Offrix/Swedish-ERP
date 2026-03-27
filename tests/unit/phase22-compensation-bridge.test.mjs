import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createBenefitsPlatform } from "../../packages/domain-benefits/src/index.mjs";
import { createTravelPlatform } from "../../packages/domain-travel/src/index.mjs";
import { createPensionPlatform } from "../../packages/domain-pension/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeEmailCounter = 0;

test("Step 22 bridges benefits, travel and pension payloads into one payroll run without losing traceability", () => {
  const {
    benefitsPlatform,
    travelPlatform,
    pensionPlatform,
    payrollPlatform,
    employee,
    employment
  } = createCompensationBridgeFixture();

  const benefitEvent = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    benefitCode: "HEALTH_INSURANCE",
    reportingPeriod: "202603",
    occurredOn: "2026-03-10",
    sourceId: "step22-health-202603",
    sourcePayload: {
      insurancePremium: 1000
    },
    actorId: "unit-test"
  });
  benefitsPlatform.approveBenefitEvent({
    companyId: COMPANY_ID,
    benefitEventId: benefitEvent.benefitEventId,
    actorId: "unit-test"
  });

  travelPlatform.createTravelClaim({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    purpose: "Step 22 kundresa",
    startAt: "2026-03-10T08:15:00+01:00",
    endAt: "2026-03-11T20:30:00+01:00",
    homeLocation: "Uppsala",
    regularWorkLocation: "Uppsala",
    firstDestination: "Malmo",
    distanceFromHomeKm: 620,
    distanceFromRegularWorkKm: 620,
    requestedAllowanceAmount: 700,
    mealEvents: [
      {
        date: "2026-03-11",
        lunchProvided: true
      }
    ],
    mileageLogs: [
      {
        date: "2026-03-10",
        vehicleType: "BENEFIT_CAR",
        distanceKm: 210,
        claimedAmount: 294,
        employeePaidAllFuel: false
      }
    ],
    expenseReceipts: [
      {
        date: "2026-03-10",
        expenseType: "parking",
        paymentMethod: "private_card",
        amount: 100,
        currencyCode: "SEK"
      }
    ],
    travelAdvances: [
      {
        date: "2026-03-09",
        amountSek: 1200
      }
    ],
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

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "unit-test"
  });
  const approved = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });

  assert.equal(approved.lines.some((line) => line.payItemCode === "MONTHLY_SALARY"), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "TAX_FREE_TRAVEL_ALLOWANCE" && line.amount === 645), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "TAXABLE_TRAVEL_ALLOWANCE" && line.amount === 55), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "EXPENSE_REIMBURSEMENT" && line.amount === 100), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "ADVANCE" && line.amount === 106), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "PENSION_PREMIUM" && line.amount === 2925), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "EXTRA_PENSION_PREMIUM" && line.amount === 1500), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "EXTRA_PENSION_PREMIUM" && line.amount === 3174), true);
  assert.equal(approved.lines.some((line) => line.payItemCode === "SALARY_EXCHANGE_GROSS_DEDUCTION" && line.amount === 3000), true);
  assert.equal(approved.payslips[0].totals.taxableBenefitAmount, 600);
  assert.equal(approved.payslips[0].totals.taxFreeAllowanceAmount, 645);
  assert.equal(approved.payslips[0].totals.expenseReimbursementAmount, 100);
  assert.equal(approved.payslips[0].totals.salaryExchangeGrossDeductionAmount, 3000);
  assert.equal(approved.payslips[0].totals.pensionPremiumAmount, 7599);

  const consumedBenefitEvent = benefitsPlatform.listBenefitEvents({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  })[0];
  assert.equal(consumedBenefitEvent.payrollDispatchStatus.approvedCount, 1);
  assert.equal(consumedBenefitEvent.payrollConsumptions[0].payRunId, payRun.payRunId);

  const travelClaim = travelPlatform.listTravelClaims({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  })[0];
  assert.equal(travelClaim.payrollDispatchStatus.approvedCount, 5);
  assert.equal(travelClaim.payrollConsumptions.every((consumption) => consumption.payRunId === payRun.payRunId), true);

  const pensionEvents = pensionPlatform.listPensionEvents({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  });
  assert.equal(pensionEvents.some((event) => event.eventCode === "regular_pension_premium" && event.payrollDispatchStatus.approvedCount === 1), true);
  assert.equal(pensionEvents.some((event) => event.extraPensionFlag === true && event.eventCode === "regular_pension_premium" && event.payrollDispatchStatus.approvedCount === 1), true);
  assert.equal(pensionEvents.some((event) => event.eventCode === "salary_exchange_pension_premium" && event.payrollDispatchStatus.approvedCount === 0), true);

  const salaryExchangeAgreement = pensionPlatform.listSalaryExchangeAgreements({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId
  })[0];
  assert.equal(salaryExchangeAgreement.payrollDispatchStatus.approvedCount, 2);
});

function createCompensationBridgeFixture() {
  const fixedNow = new Date("2026-03-22T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const benefitsPlatform = createBenefitsPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const travelPlatform = createTravelPlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const pensionPlatform = createPensionPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform,
    benefitsPlatform,
    travelPlatform,
    pensionPlatform,
    ledgerPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Klara",
    familyName: "Kompensation",
    workEmail: `comp.bridge.${String(++employeeEmailCounter).padStart(4, "0")}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
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
    monthlySalary: 65000,
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Klara Kompensation",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "SEB",
    primaryAccount: true,
    actorId: "unit-test"
  });
  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });

  return {
    hrPlatform,
    timePlatform,
    benefitsPlatform,
    travelPlatform,
    pensionPlatform,
    ledgerPlatform,
    payrollPlatform,
    employee,
    employment
  };
}
