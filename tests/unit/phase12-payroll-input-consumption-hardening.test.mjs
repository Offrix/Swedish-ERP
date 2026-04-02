import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createCollectiveAgreementsPlatform } from "../../packages/domain-collective-agreements/src/index.mjs";
import { createBenefitsPlatform } from "../../packages/domain-benefits/src/index.mjs";
import { createTravelPlatform } from "../../packages/domain-travel/src/index.mjs";
import { createPensionPlatform } from "../../packages/domain-pension/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeEmailCounter = 0;

test("Phase 11.7 splits time-driven payroll lines by approved project allocations while preserving agreement rates", () => {
  const fixedNow = new Date("2026-03-29T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const collectiveAgreementsPlatform = createCollectiveAgreementsPlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform,
    collectiveAgreementsPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform,
    collectiveAgreementsPlatform
  });

  const employee = createEmployeeWithContract({
    hrPlatform,
    givenName: "Disa",
    familyName: "Dimension",
    workEmail: nextEmail("dimension"),
    identityValue: "19800112-1238",
    payModelCode: "hourly_salary",
    hourlyRate: 200,
    collectiveAgreementCode: "DIMENSION_OVERLAY"
  });
  installCollectiveAgreementOverlay({
    collectiveAgreementsPlatform,
    employee,
    agreementCode: "DIMENSION_OVERLAY",
    versionCode: "DIMENSION_OVERLAY_2026_01",
    ruleSet: {
      overtimeMultiplier: 1.75,
      obCategoryA: 45,
      jourUnitRate: 30,
      standbyUnitRate: 18
    }
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

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 480,
    overtimeMinutes: 60,
    obMinutes: 120,
    jourMinutes: 60,
    standbyMinutes: 60,
    approvalMode: "auto",
    allocationRefs: [
      {
        projectId: "project-alpha",
        activityCode: "installation",
        allocationMinutes: 360
      },
      {
        projectId: "project-beta",
        activityCode: "service",
        allocationMinutes: 120
      }
    ],
    actorId: "unit-test"
  });
  timePlatform.approveTimeSet({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    actorId: "unit-test"
  });

  assertLine(payRun, "HOURLY_SALARY", "project-alpha", {
    quantity: 5.25,
    unitRate: 200,
    amount: 1050
  });
  assertLine(payRun, "HOURLY_SALARY", "project-beta", {
    quantity: 1.75,
    unitRate: 200,
    amount: 350
  });
  assertLine(payRun, "OVERTIME", "project-alpha", {
    quantity: 0.75,
    unitRate: 350,
    amount: 262.5
  });
  assertLine(payRun, "OVERTIME", "project-beta", {
    quantity: 0.25,
    unitRate: 350,
    amount: 87.5
  });
  assertLine(payRun, "OB", "project-alpha", {
    quantity: 1.5,
    unitRate: 45,
    amount: 67.5
  });
  assertLine(payRun, "OB", "project-beta", {
    quantity: 0.5,
    unitRate: 45,
    amount: 22.5
  });
  assertLine(payRun, "JOUR", "project-alpha", {
    quantity: 0.75,
    unitRate: 30,
    amount: 22.5
  });
  assertLine(payRun, "JOUR", "project-beta", {
    quantity: 0.25,
    unitRate: 30,
    amount: 7.5
  });
  assertLine(payRun, "STANDBY", "project-alpha", {
    quantity: 0.75,
    unitRate: 18,
    amount: 13.5
  });
  assertLine(payRun, "STANDBY", "project-beta", {
    quantity: 0.25,
    unitRate: 18,
    amount: 4.5
  });
  assert.equal(
    payRun.payrollInputSnapshot.sourceSnapshot[employee.employment.employmentId].timeEntries[0].allocationRefs.length,
    2
  );
});

test("Phase 11.7 payroll input snapshot locks external payroll payload dimensions for benefits, travel and pension", () => {
  const fixedNow = new Date("2026-03-29T12:00:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const vatPlatform = createVatPlatform({
    clock: () => fixedNow
  });
  const benefitsPlatform = createBenefitsPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const travelPlatform = createTravelPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    vatPlatform
  });
  const pensionPlatform = createPensionPlatform({
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
    travelPlatform,
    pensionPlatform
  });

  const employee = createEmployeeWithContract({
    hrPlatform,
    givenName: "Pella",
    familyName: "Payload",
    workEmail: nextEmail("payload"),
    identityValue: "19820314-4442",
    payModelCode: "monthly_salary",
    monthlySalary: 65000
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
    benefitCode: "HEALTH_INSURANCE",
    reportingPeriod: "202603",
    occurredOn: "2026-03-10",
    sourceId: "phase117-benefit",
    sourcePayload: {
      insurancePremium: 1000
    },
    dimensionJson: {
      projectId: "project-benefit",
      costCenterCode: "CC-BEN",
      businessAreaCode: "BA-OPS"
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
    purpose: "Dimensioned travel",
    startAt: "2026-03-10T08:15:00+01:00",
    endAt: "2026-03-11T20:30:00+01:00",
    homeLocation: "Uppsala",
    regularWorkLocation: "Uppsala",
    firstDestination: "Malmo",
    distanceFromHomeKm: 620,
    distanceFromRegularWorkKm: 620,
    requestedAllowanceAmount: 700,
    dimensionJson: {
      projectId: "project-travel",
      costCenterCode: "CC-TRAVEL"
    },
    expenseReceipts: [
      {
        date: "2026-03-10",
        expenseType: "parking",
        paymentMethod: "private_card",
        amount: 140,
        currencyCode: "SEK",
        sellerCountry: "SE",
        goodsOrServices: "services",
        amountExVat: 112,
        vatRate: 25
      }
    ],
    actorId: "unit-test"
  });

  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employee.employeeId,
    employmentId: employee.employment.employmentId,
    planCode: "ITP1",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 4.5,
    dimensionJson: {
      projectId: "project-pension",
      costCenterCode: "CC-PENSION"
    },
    actorId: "unit-test"
  });
  pensionPlatform.createSalaryExchangeAgreement({
    companyId: COMPANY_ID,
    employeeId: employee.employee.employeeId,
    employmentId: employee.employment.employmentId,
    startsOn: "2026-01-01",
    exchangeMode: "fixed_amount",
    exchangeValue: 3000,
    dimensionJson: {
      projectId: "project-salary-exchange",
      businessAreaCode: "BA-PENSION"
    },
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    actorId: "unit-test"
  });

  const employmentSnapshot = payRun.payrollInputSnapshot.sourceSnapshot[employee.employment.employmentId];
  assert.deepEqual(employmentSnapshot.benefitEvents[0].dimensionJson, {
    projectId: "project-benefit",
    costCenterCode: "CC-BEN",
    businessAreaCode: "BA-OPS"
  });
  assert.deepEqual(employmentSnapshot.benefitPayrollPayloads[0].dimensionJson, {
    projectId: "project-benefit",
    costCenterCode: "CC-BEN",
    businessAreaCode: "BA-OPS"
  });
  assert.deepEqual(employmentSnapshot.travelClaims[0].dimensionJson, {
    projectId: "project-travel",
    costCenterCode: "CC-TRAVEL"
  });
  assert.equal(
    employmentSnapshot.travelPayrollPayloads.some(
      (payload) => payload.dimensionJson.projectId === "project-travel" && payload.dimensionJson.costCenterCode === "CC-TRAVEL"
    ),
    true
  );
  assert.deepEqual(employmentSnapshot.pensionEnrollments[0].dimensionJson, {
    projectId: "project-pension",
    costCenterCode: "CC-PENSION"
  });
  assert.deepEqual(employmentSnapshot.salaryExchangeAgreements[0].dimensionJson, {
    projectId: "project-salary-exchange",
    businessAreaCode: "BA-PENSION"
  });
  assert.equal(
    employmentSnapshot.pensionEvents.some(
      (event) => event.dimensionJson.projectId === "project-pension" && event.dimensionJson.costCenterCode === "CC-PENSION"
    ),
    true
  );
  assert.equal(
    employmentSnapshot.pensionPayrollPayloads.some(
      (payload) => payload.payItemCode === "PENSION_PREMIUM" && payload.dimensionJson.projectId === "project-pension"
    ),
    true
  );
  assert.equal(
    employmentSnapshot.pensionPayrollPayloads.some(
      (payload) =>
        payload.payItemCode === "SALARY_EXCHANGE_GROSS_DEDUCTION"
        && payload.dimensionJson.projectId === "project-salary-exchange"
    ),
    true
  );
  assert.equal(
    payRun.lines.some(
      (line) => line.sourceId === benefitEvent.benefitEventId && line.dimensionJson.projectId === "project-benefit"
    ),
    true
  );
  assert.equal(
    payRun.lines.some(
      (line) => line.payItemCode === "TAX_FREE_TRAVEL_ALLOWANCE" && line.dimensionJson.projectId === "project-travel"
    ),
    true
  );
  assert.equal(
    payRun.lines.some(
      (line) => line.payItemCode === "PENSION_PREMIUM" && line.dimensionJson.projectId === "project-pension"
    ),
    true
  );
  assert.equal(
    payRun.lines.some(
      (line) => line.payItemCode === "SALARY_EXCHANGE_GROSS_DEDUCTION" && line.dimensionJson.projectId === "project-salary-exchange"
    ),
    true
  );
});

function createEmployeeWithContract({
  hrPlatform,
  givenName,
  familyName,
  workEmail,
  identityValue,
  payModelCode,
  hourlyRate = null,
  monthlySalary = null,
  collectiveAgreementCode = null
}) {
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
    jobTitle: "Payroll hardening employee",
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
    hourlyRate,
    monthlySalary,
    collectiveAgreementCode,
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
    bankName: "Payroll Hardening Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}

function installCollectiveAgreementOverlay({
  collectiveAgreementsPlatform,
  employee,
  agreementCode,
  versionCode,
  ruleSet
}) {
  const family = collectiveAgreementsPlatform.createAgreementFamily({
    companyId: COMPANY_ID,
    code: agreementCode,
    name: agreementCode,
    actorId: "unit-test"
  });
  const version = collectiveAgreementsPlatform.publishAgreementVersion({
    companyId: COMPANY_ID,
    agreementFamilyId: family.agreementFamilyId,
    versionCode,
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet,
    actorId: "unit-test"
  });
  const catalogEntry = collectiveAgreementsPlatform.publishAgreementCatalogEntry({
    companyId: COMPANY_ID,
    agreementVersionId: version.agreementVersionId,
    dropdownLabel: `${agreementCode} 2026`,
    actorId: "unit-test"
  });
  collectiveAgreementsPlatform.assignAgreementToEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employee.employeeId,
    employmentId: employee.employment.employmentId,
    agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
    effectiveFrom: "2026-01-01",
    assignmentReasonCode: "HIRING",
    actorId: "unit-test"
  });
}

function assertLine(payRun, payItemCode, projectId, expected) {
  const line = payRun.lines.find(
    (candidate) => candidate.payItemCode === payItemCode && candidate.dimensionJson.projectId === projectId
  );
  assert.ok(line, `Expected ${payItemCode} line for ${projectId}.`);
  if (expected.quantity != null) {
    assert.equal(line.quantity, expected.quantity);
  }
  if (expected.unitRate != null) {
    assert.equal(line.unitRate, expected.unitRate);
  }
  if (expected.amount != null) {
    assert.equal(line.amount, expected.amount);
  }
}

function nextEmail(prefix) {
  employeeEmailCounter += 1;
  return `${prefix}.${String(employeeEmailCounter).padStart(4, "0")}@example.com`;
}
