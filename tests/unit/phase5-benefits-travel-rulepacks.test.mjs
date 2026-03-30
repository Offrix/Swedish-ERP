import test from "node:test";
import assert from "node:assert/strict";
import { createRulePackRegistry } from "../../packages/rule-engine/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createBenefitsPlatform, BENEFITS_RULEPACK_CODE } from "../../packages/domain-benefits/src/index.mjs";
import { createTravelPlatform, TRAVEL_RULEPACK_CODE } from "../../packages/domain-travel/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeCounter = 0;

test("Phase 5.1 resolves benefits from the effective-dated rulepack", () => {
  const fixedNow = new Date("2027-03-10T08:00:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Bella",
    familyName: "Benefit",
    workEmail: `benefits.rulepack.${employeeCounter += 1}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "unit-test"
  });

  const ruleRegistry = createRulePackRegistry({
    clock: () => fixedNow,
    seedRulePacks: [
      {
        rulePackId: "benefits-se-2027.1",
        rulePackCode: BENEFITS_RULEPACK_CODE,
        domain: "benefits",
        jurisdiction: "SE",
        effectiveFrom: "2027-01-01",
        effectiveTo: null,
        version: "2027.1",
        checksum: "benefits-se-2027.1",
        sourceSnapshotDate: "2027-01-01",
        semanticChangeSummary: "Raises the 2027 wellness tax-free limit for the effective-date test vector.",
        machineReadableRules: {
          ruleYear: 2027,
          wellnessTaxFreeLimit: 6000
        }
      }
    ]
  });

  const benefitsPlatform = createBenefitsPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    ruleRegistry
  });

  const event = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    benefitCode: "WELLNESS_ALLOWANCE",
    reportingPeriod: "202703",
    occurredOn: "2027-03-08",
    sourceId: "phase5-benefits-2027",
    sourcePayload: {
      reimbursementAmount: 5500,
      calendarYearGrantedBeforeEvent: 0,
      equalTermsOffered: true,
      activityType: "massage",
      activityDate: "2027-03-07",
      vendorName: "Rulepack Wellness"
    },
    actorId: "unit-test"
  });

  assert.equal(event.valuation.rulepackId, "benefits-se-2027.1");
  assert.equal(event.valuation.ruleVersion, "2027.1");
  assert.equal(event.valuation.decision.rulePackId, "benefits-se-2027.1");
  assert.equal(event.valuation.decision.decisionCode, "BENEFIT_WELLNESS_TAX_FREE");
  assert.equal(event.valuation.taxableValue, 0);
  assert.equal(event.valuation.decision.outputs.taxFreeLimit, 6000);
});

test("Phase 5.1 resolves travel allowances and mileage from the effective-dated rulepack", () => {
  const fixedNow = new Date("2027-04-18T08:00:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Tilde",
    familyName: "Travel",
    workEmail: `travel.rulepack.${employeeCounter += 1}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "unit-test"
  });

  const ruleRegistry = createRulePackRegistry({
    clock: () => fixedNow,
    seedRulePacks: [
      {
        rulePackId: "travel-se-2027.1",
        rulePackCode: TRAVEL_RULEPACK_CODE,
        domain: "travel",
        jurisdiction: "SE",
        effectiveFrom: "2027-01-01",
        effectiveTo: null,
        version: "2027.1",
        checksum: "travel-se-2027.1",
        sourceSnapshotDate: "2027-01-01",
        semanticChangeSummary: "Raises domestic allowance and mileage rates for the 2027 effective-date test vector.",
        machineReadableRules: {
          ruleYear: 2027,
          domesticAllowances: {
            fullDay: 330,
            halfDay: 165,
            longTripThreeMonthsFullDay: 231,
            longTripTwoYearsFullDay: 165,
            nightAllowance: 165
          },
          distanceThresholdKm: 50,
          preApprovalThresholdSek: 5000,
          domesticMealReductionTable: {
            330: { breakfast: 66, lunchOrDinner: 116, lunchAndDinner: 231, fullDay: 281 },
            231: { breakfast: 46, lunchOrDinner: 81, lunchAndDinner: 162, fullDay: 196 },
            165: { breakfast: 33, lunchOrDinner: 58, lunchAndDinner: 116, fullDay: 140 },
            99: { breakfast: 20, lunchOrDinner: 35, lunchAndDinner: 69, fullDay: 84 }
          },
          foreignMealReductionRates: {
            breakfast: 0.15,
            lunchOrDinner: 0.35,
            lunchAndDinner: 0.7,
            fullDay: 0.85
          },
          mileageRatesPerKm: {
            OWN_CAR: 3.1,
            BENEFIT_CAR: 1.6,
            BENEFIT_CAR_ELECTRIC: 1.3
          },
          foreignNormalAmounts: {
            Sverige: { amountSek: 330 }
          }
        }
      }
    ]
  });

  const travelPlatform = createTravelPlatform({
    clock: () => fixedNow,
    hrPlatform,
    ruleRegistry
  });

  const claim = travelPlatform.createTravelClaim({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    purpose: "Rulepack test travel",
    startAt: "2027-04-14T08:00:00+02:00",
    endAt: "2027-04-15T20:00:00+02:00",
    homeLocation: "Uppsala",
    regularWorkLocation: "Uppsala",
    distanceFromHomeKm: 220,
    distanceFromRegularWorkKm: 220,
    requestedAllowanceAmount: 825,
    mealEvents: [
      {
        date: "2027-04-15",
        lunchProvided: true
      }
    ],
    mileageLogs: [
      {
        date: "2027-04-14",
        vehicleType: "OWN_CAR",
        distanceKm: 100
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(claim.valuation.rulepackId, "travel-se-2027.1");
  assert.equal(claim.valuation.ruleVersion, "2027.1");
  assert.equal(claim.valuation.statutoryTaxFreeMaxAllowance, 709);
  assert.equal(claim.valuation.taxFreeMileage, 310);
  assert.equal(claim.valuation.taxableTravelAllowance, 116);
  assert.equal(claim.travelDays.find((day) => day.date === "2027-04-15" && day.dayClassification === "full").mealReductionAmount, 116);
});
