import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createTravelPlatform } from "../../packages/domain-travel/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeEmailCounter = 0;

test("Phase 9.2 values domestic travel, meal reduction, mileage and taxable excess correctly", () => {
  const { travelPlatform, employee, employment } = createTravelFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 42000
  });

  const claim = travelPlatform.createTravelClaim({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    purpose: "Kundmote i Malmo",
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
        currencyCode: "SEK",
        documentId: null
      }
    ],
    travelAdvances: [
      {
        date: "2026-03-09",
        amountSek: 300
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(claim.valuation.travelType, "domestic");
  assert.equal(claim.valuation.statutoryTaxFreeMaxAllowance, 645);
  assert.equal(claim.valuation.taxFreeTravelAllowance, 645);
  assert.equal(claim.valuation.taxableTravelAllowance, 55);
  assert.equal(claim.valuation.taxFreeMileage, 950);
  assert.equal(claim.valuation.expenseReimbursementAmount, 140);
  assert.equal(claim.valuation.netTravelPayoutAmount, 1490);
  assert.equal(claim.travelDays.find((day) => day.date === "2026-03-11" && day.dayClassification === "full").mealReductionAmount, 105);
  assert.equal(claim.valuation.warnings.includes("travel_allowance_excess_taxable"), true);
});

test("Phase 9.2 resolves foreign multi-country days using the longest 06-24 overlap", () => {
  const { travelPlatform, employee, employment } = createTravelFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 42000
  });

  const claim = travelPlatform.createTravelClaim({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    purpose: "Resa Paris Frankfurt",
    startAt: "2026-03-16T07:00:00+01:00",
    endAt: "2026-03-18T21:30:00+01:00",
    homeLocation: "Stockholm",
    regularWorkLocation: "Stockholm",
    distanceFromHomeKm: 720,
    distanceFromRegularWorkKm: 720,
    countrySegments: [
      {
        startAt: "2026-03-16T07:00:00+01:00",
        endAt: "2026-03-17T11:00:00+01:00",
        countryCode: "FR",
        locationKey: "Paris"
      },
      {
        startAt: "2026-03-17T11:00:00+01:00",
        endAt: "2026-03-18T21:30:00+01:00",
        countryCode: "DE",
        locationKey: "Frankfurt"
      }
    ],
    mealEvents: [
      {
        date: "2026-03-16",
        breakfastProvided: true
      },
      {
        date: "2026-03-17",
        lunchProvided: true
      }
    ],
    actorId: "unit-test"
  });

  const march17 = claim.travelDays.find((day) => day.date === "2026-03-17" && day.dayClassification === "full");
  assert.equal(march17.countryName, "Tyskland");
  assert.equal(march17.baseAmount, 760);
  assert.equal(march17.mealReductionAmount, 266);

  const march16 = claim.travelDays.find((day) => day.date === "2026-03-16" && day.dayClassification === "full");
  assert.equal(march16.countryName, "Frankrike");
  assert.equal(march16.mealReductionAmount, 128);
});

test("Phase 9.2 feeds payroll with tax-free allowances, taxable mileage and advance settlement", () => {
  const { travelPlatform, payrollPlatform, employee, employment } = createTravelFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 40000
  });

  travelPlatform.createTravelClaim({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    purpose: "Teknikresa",
    startAt: "2026-03-10T08:15:00+01:00",
    endAt: "2026-03-11T20:30:00+01:00",
    homeLocation: "Uppsala",
    regularWorkLocation: "Uppsala",
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

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "unit-test"
  });

  assert.equal(payRun.lines.some((line) => line.payItemCode === "TAX_FREE_TRAVEL_ALLOWANCE" && line.amount === 645), true);
  assert.equal(payRun.lines.some((line) => line.payItemCode === "TAXABLE_TRAVEL_ALLOWANCE" && line.amount === 55), true);
  assert.equal(payRun.lines.some((line) => line.payItemCode === "TAXABLE_MILEAGE" && line.amount === 294), true);
  assert.equal(payRun.lines.some((line) => line.payItemCode === "EXPENSE_REIMBURSEMENT" && line.amount === 100), true);
  assert.equal(payRun.lines.some((line) => line.payItemCode === "ADVANCE" && line.amount === 106), true);
  assert.equal(payRun.payslips[0].totals.taxFreeAllowanceAmount, 645);
  assert.equal(payRun.payslips[0].totals.expenseReimbursementAmount, 100);
  assert.equal(payRun.warningCodes.includes("travel_mileage_tax_free_denied_benefit_car_fuel"), true);
});

function createTravelFixture({ payModelCode, monthlySalary = null, hourlyRate = null }) {
  const fixedNow = new Date("2026-03-22T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const travelPlatform = createTravelPlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    hrPlatform,
    timePlatform,
    travelPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Tora",
    familyName: "Travel",
    workEmail: `travel.unit.${employeeEmailCounter += 1}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
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
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Tora Travel",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Unit Test Bank",
    primaryAccount: true,
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

  return {
    hrPlatform,
    timePlatform,
    travelPlatform,
    payrollPlatform,
    employee,
    employment
  };
}
