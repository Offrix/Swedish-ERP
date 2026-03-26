import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createBenefitsPlatform } from "../../packages/domain-benefits/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeEmailCounter = 0;

test("Phase 9.1 values car and fuel benefits with the 2026 rule set", () => {
  const { benefitsPlatform, employee, employment } = createBenefitsFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 42000
  });

  const carBenefit = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    benefitCode: "CAR_BENEFIT",
    reportingPeriod: "202603",
    startDate: "2026-03-14",
    sourceId: "unit-car-202603",
    sourcePayload: {
      newCarPrice: 420000,
      extraEquipmentValue: 20000,
      vehicleTaxAnnual: 9000,
      privateUseOccurrences: 12,
      privateUseKm: 540,
      hasMileageLog: false
    },
    actorId: "unit-test"
  });
  assert.equal(carBenefit.valuation.decision.decisionCode, "BENEFIT_CAR_FORMULA_2026");
  assert.equal(carBenefit.valuation.taxableValue, 7968.5);
  assert.equal(carBenefit.valuation.decision.outputs.fullMonthApplied, true);
  assert.equal(carBenefit.valuation.decision.warnings.includes("benefit_car_missing_mileage_log"), true);

  const fuelBenefit = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    benefitCode: "FUEL_BENEFIT",
    reportingPeriod: "202603",
    occurredOn: "2026-03-20",
    sourceId: "unit-fuel-202603",
    sourcePayload: {
      vehicleContext: "benefit_car",
      marketValuePrivateFuel: 2000,
      fuelType: "liquid_fuel"
    },
    netDeductionValue: 400,
    actorId: "unit-test"
  });
  assert.equal(fuelBenefit.valuation.decision.decisionCode, "BENEFIT_FUEL_BENEFIT_CAR");
  assert.equal(fuelBenefit.valuation.taxableValueBeforeOffsets, 2400);
  assert.equal(fuelBenefit.valuation.taxableValue, 2000);
  assert.equal(fuelBenefit.postingIntents.some((intent) => intent.processingStep === 13 && intent.amount === 400), true);
});

test("Phase 9.1 keeps wellness tax free and taxes gifts from the first krona above threshold", () => {
  const { benefitsPlatform, employee, employment } = createBenefitsFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 42000
  });

  const wellness = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    benefitCode: "WELLNESS_ALLOWANCE",
    reportingPeriod: "202603",
    occurredOn: "2026-03-11",
    sourceId: "unit-wellness-202603",
    sourcePayload: {
      reimbursementAmount: 2500,
      calendarYearGrantedBeforeEvent: 0,
      equalTermsOffered: true,
      activityType: "yoga",
      activityDate: "2026-03-10",
      vendorName: "Unit Wellness"
    },
    actorId: "unit-test"
  });
  assert.equal(wellness.valuation.decision.decisionCode, "BENEFIT_WELLNESS_TAX_FREE");
  assert.equal(wellness.valuation.taxableValue, 0);

  const gift = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    benefitCode: "GIFT",
    reportingPeriod: "202612",
    occurredOn: "2026-12-10",
    sourceId: "unit-gift-202612",
    sourcePayload: {
      giftType: "CHRISTMAS",
      giftValueInclVat: 650
    },
    actorId: "unit-test"
  });
  assert.equal(gift.valuation.decision.decisionCode, "BENEFIT_GIFT_TAXABLE");
  assert.equal(gift.valuation.taxableValue, 650);
  assert.equal(gift.valuation.decision.explanation[0].includes("first krona"), true);
});

test("Phase 9.1 blocks unapproved benefit valuations from payroll consumption", () => {
  const fixture = createBenefitsFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 40000
  });

  fixture.benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: fixture.employee.employeeId,
    employmentId: fixture.employment.employmentId,
    benefitCode: "HEALTH_INSURANCE",
    reportingPeriod: "202603",
    occurredOn: "2026-03-10",
    sourceId: "unit-health-unapproved-202603",
    sourcePayload: {
      insurancePremium: 1000
    },
    actorId: "unit-test"
  });

  const payCalendar = fixture.payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = fixture.payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    statutoryProfiles: [
      {
        employmentId: fixture.employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(payRun.lines.some((line) => line.sourceType === "benefit_event"), false);
  assert.equal(payRun.payslips[0].totals.taxableBenefitAmount, 0);
});

test("Phase 9.1 integrates benefits into payroll, AGI and payroll posting with and without cash salary", () => {
  const salaryFixture = createBenefitsFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 40000
  });

  const healthInsurance = salaryFixture.benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: salaryFixture.employee.employeeId,
    employmentId: salaryFixture.employment.employmentId,
    benefitCode: "HEALTH_INSURANCE",
    reportingPeriod: "202603",
    occurredOn: "2026-03-10",
    sourceId: "unit-health-202603",
    sourcePayload: {
      insurancePremium: 1000
    },
    actorId: "unit-test"
  });
  salaryFixture.benefitsPlatform.approveBenefitEvent({
    companyId: COMPANY_ID,
    benefitEventId: healthInsurance.benefitEventId,
    actorId: "unit-test"
  });

  const salaryCalendar = salaryFixture.payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const salaryRun = salaryFixture.payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: salaryCalendar.payCalendarId,
    reportingPeriod: "202603",
    statutoryProfiles: [
      {
        employmentId: salaryFixture.employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    actorId: "unit-test"
  });
  salaryFixture.payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: salaryRun.payRunId,
    actorId: "unit-test"
  });
  const consumedHealthInsurance = salaryFixture.benefitsPlatform.listBenefitEvents({
    companyId: COMPANY_ID,
    employmentId: salaryFixture.employment.employmentId,
    reportingPeriod: "202603"
  })[0];

  assert.equal(salaryRun.lines.some((line) => line.ledgerAccountCode === "7230" && line.agiMappingCode === "taxable_benefit"), true);
  assert.equal(salaryRun.payslips[0].totals.taxableBenefitAmount, 600);
  assert.equal(consumedHealthInsurance.payrollConsumptions.length, 1);
  assert.equal(consumedHealthInsurance.payrollConsumptions[0].payRunId, salaryRun.payRunId);
  assert.equal(consumedHealthInsurance.payrollConsumptions[0].stage, "approved");
  assert.equal(consumedHealthInsurance.payrollDispatchStatus.approvedCount, 1);

  const posting = salaryFixture.payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: salaryRun.payRunId,
    actorId: "unit-test"
  });
  assert.equal(posting.journalLines.some((line) => line.accountNumber === "7230"), true);

  const agiSubmission = salaryFixture.payrollPlatform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  const agiEmployee = agiSubmission.currentVersion.employees.find(
    (candidate) => candidate.employeeId === salaryFixture.employee.employeeId
  );
  assert.equal(agiEmployee.payloadJson.compensationFields.taxableBenefitAmount, 600);

  const benefitOnlyFixture = createBenefitsFixture({
    payModelCode: "hourly_salary",
    hourlyRate: 350
  });
  const benefitOnlyCar = benefitOnlyFixture.benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: benefitOnlyFixture.employee.employeeId,
    employmentId: benefitOnlyFixture.employment.employmentId,
    benefitCode: "CAR_BENEFIT",
    reportingPeriod: "202603",
    startDate: "2026-03-14",
    sourceId: "unit-benefit-only-car-202603",
    sourcePayload: {
      newCarPrice: 420000,
      extraEquipmentValue: 20000,
      vehicleTaxAnnual: 9000
    },
    actorId: "unit-test"
  });
  benefitOnlyFixture.benefitsPlatform.approveBenefitEvent({
    companyId: COMPANY_ID,
    benefitEventId: benefitOnlyCar.benefitEventId,
    actorId: "unit-test"
  });

  const benefitOnlyCalendar = benefitOnlyFixture.payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const benefitOnlyRun = benefitOnlyFixture.payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: benefitOnlyCalendar.payCalendarId,
    reportingPeriod: "202603",
    statutoryProfiles: [
      {
        employmentId: benefitOnlyFixture.employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    actorId: "unit-test"
  });
  assert.equal(benefitOnlyRun.warningCodes.includes("benefit_without_cash_salary"), true);
  assert.equal(benefitOnlyRun.payslips[0].totals.taxableBenefitAmount, 7968.5);
});

function createBenefitsFixture({ payModelCode, monthlySalary = null, hourlyRate = null }) {
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
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform,
    benefitsPlatform,
    ledgerPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Beata",
    familyName: "Benefit",
    workEmail: `beata.${String(++employeeEmailCounter).padStart(4, "0")}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Benefit specialist",
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
    currencyCode: "SEK",
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Beata Benefit",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Benefits Test Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });

  return {
    hrPlatform,
    timePlatform,
    benefitsPlatform,
    payrollPlatform,
    employee,
    employment
  };
}
