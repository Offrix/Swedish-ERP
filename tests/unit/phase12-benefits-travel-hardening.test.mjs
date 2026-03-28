import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createBenefitsPlatform } from "../../packages/domain-benefits/src/index.mjs";
import { createTravelPlatform } from "../../packages/domain-travel/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.4 payroll input snapshot carries benefit offset and travel expense-split review state", () => {
  const fixedNow = new Date("2026-03-28T12:00:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
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
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform,
    benefitsPlatform,
    travelPlatform
  });

  const employee = createEmployeeWithContract({
    hrPlatform,
    givenName: "Hardy",
    familyName: "Review",
    workEmail: "hardy.review@example.com",
    identityValue: "19800112-7777",
    monthlySalary: 42000
  });
  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });

  const benefitEvent = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employee.employeeId,
    employmentId: employee.employment.employmentId,
    benefitCode: "FUEL_BENEFIT",
    reportingPeriod: "202603",
    occurredOn: "2026-03-15",
    sourceId: "phase12-benefit-hardening",
    employeePaidValue: 100,
    netDeductionValue: 400,
    sourcePayload: {
      vehicleContext: "benefit_car",
      marketValuePrivateFuel: 2000,
      fuelType: "liquid_fuel"
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
    employeeId: employee.employee.employeeId,
    employmentId: employee.employment.employmentId,
    purpose: "Hardened travel split",
    startAt: "2026-03-10T08:15:00+01:00",
    endAt: "2026-03-11T20:30:00+01:00",
    homeLocation: "Uppsala",
    regularWorkLocation: "Uppsala",
    firstDestination: "Malmo",
    distanceFromHomeKm: 620,
    distanceFromRegularWorkKm: 620,
    requestedAllowanceAmount: 700,
    mileageLogs: [
      {
        date: "2026-03-10",
        vehicleType: "OWN_CAR",
        distanceKm: 380,
        claimedAmount: 950
      }
    ],
    expenseReceipts: [
      {
        date: "2026-03-10",
        expenseType: "parking",
        paymentMethod: "private_card",
        amount: 140,
        currencyCode: "SEK"
      },
      {
        date: "2026-03-10",
        expenseType: "taxi",
        paymentMethod: "company_card",
        amount: 600,
        currencyCode: "SEK"
      }
    ],
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const run = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    actorId: "unit-test"
  });

  const snapshot = payrollPlatform.getPayrollInputSnapshot({
    companyId: COMPANY_ID,
    payRunId: run.payRunId
  });
  const employmentSnapshot = snapshot.sourceSnapshot[employee.employment.employmentId];
  assert.equal(employmentSnapshot.benefitEvents[0].offsetBreakdown.totalOffsetValue, 500);
  assert.equal(employmentSnapshot.benefitEvents[0].reviewCodes.includes("benefit_mixed_offset_review"), true);
  assert.equal(employmentSnapshot.travelClaims[0].expenseSplit.companyCardExpenseAmount, 600);
  assert.equal(employmentSnapshot.travelClaims[0].reviewCodes.includes("travel_expense_split_review"), true);
});

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
    bankName: "Phase12 Hardening Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
