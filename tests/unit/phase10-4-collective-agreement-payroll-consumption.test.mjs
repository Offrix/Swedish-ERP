import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createCollectiveAgreementsPlatform } from "../../packages/domain-collective-agreements/src/index.mjs";
import { createPensionPlatform } from "../../packages/domain-pension/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeEmailCounter = 0;

test("Phase 10.4 payroll consumes agreement overlay rates for overtime, OB, jour and standby", () => {
  const { timePlatform, payrollPlatform, employment, payCalendar } = createAgreementPayrollFixture({
    payModelCode: "hourly_salary",
    hourlyRate: 200,
    ruleSet: {
      overtimeMultiplier: 1.75,
      obCategoryA: 45,
      jourUnitRate: 30,
      standbyUnitRate: 18
    }
  });

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 540,
    overtimeMinutes: 60,
    obMinutes: 120,
    jourMinutes: 60,
    standbyMinutes: 30,
    approvalMode: "auto",
    actorId: "unit-test"
  });
  timePlatform.approveTimeSet({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    actorId: "unit-test"
  });

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "unit-test"
  });

  assert.equal(findLine(payRun, "HOURLY_SALARY").amount, 1600);
  assert.equal(findLine(payRun, "OVERTIME").quantity, 1);
  assert.equal(findLine(payRun, "OVERTIME").unitRate, 350);
  assert.equal(findLine(payRun, "OVERTIME").amount, 350);
  assert.equal(findLine(payRun, "OB").quantity, 2);
  assert.equal(findLine(payRun, "OB").unitRate, 45);
  assert.equal(findLine(payRun, "OB").amount, 90);
  assert.equal(findLine(payRun, "JOUR").quantity, 1);
  assert.equal(findLine(payRun, "JOUR").unitRate, 30);
  assert.equal(findLine(payRun, "JOUR").amount, 30);
  assert.equal(findLine(payRun, "STANDBY").quantity, 0.5);
  assert.equal(findLine(payRun, "STANDBY").unitRate, 18);
  assert.equal(findLine(payRun, "STANDBY").amount, 9);
  assert.equal(payRun.payslips[0].warnings.some((warning) => warning.code === "agreement_overlay_rate_missing"), false);
});

test("Phase 10.4 blocks static fallback when agreement overlay lacks a required rate component", () => {
  const { timePlatform, payrollPlatform, employment, payCalendar } = createAgreementPayrollFixture({
    payModelCode: "hourly_salary",
    hourlyRate: 220,
    ruleSet: {
      overtimeMultiplier: 1.5
    }
  });

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-19",
    workedMinutes: 480,
    obMinutes: 60,
    approvalMode: "auto",
    actorId: "unit-test"
  });
  timePlatform.approveTimeSet({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    actorId: "unit-test"
  });

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "unit-test"
  });

  const obLine = findLine(payRun, "OB");
  assert.equal(obLine.calculationStatus, "rate_required");
  assert.equal(obLine.amount, 0);
  assert.equal(payRun.payslips[0].warnings.some((warning) => warning.code === "agreement_overlay_rate_missing"), true);
});

test("Phase 10.4 materializes vacation supplement and agreement pension additions through payroll", () => {
  const { pensionPlatform, payrollPlatform, employment, payCalendar } = createAgreementPayrollFixture({
    payModelCode: "monthly_salary",
    monthlySalary: 50000,
    ordinaryHoursPerMonth: 160,
    ruleSet: {
      rateComponents: {
        vacationSupplement: {
          calculationMode: "percent_of_basis",
          basisCode: "contract_monthly_salary",
          percent: 0.8,
          autoGenerate: true
        },
        pensionAdditions: [
          {
            componentCode: "FORA_AUTO",
            planCode: "FORA",
            providerCode: "fora",
            payItemCode: "FORA_PREMIUM",
            contributionMode: "rate_percent",
            contributionRatePercent: 4.5,
            basisCode: "pensionable_base_after_exchange",
            note: "Fora via agreement overlay"
          }
        ]
      }
    }
  });

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    manualInputs: [
      {
        employmentId: employment.employmentId,
        payItemCode: "VACATION_SUPPLEMENT",
        quantity: 2,
        processingStep: 4,
        note: "Vacation supplement from overlay"
      }
    ],
    actorId: "unit-test"
  });
  const approved = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });

  assert.equal(findLine(approved, "VACATION_SUPPLEMENT").unitRate, 400);
  assert.equal(findLine(approved, "VACATION_SUPPLEMENT").amount, 800);
  assert.equal(findLine(approved, "FORA_PREMIUM").amount, 2286);
  assert.equal(findLine(approved, "PENSION_SPECIAL_PAYROLL_TAX").amount, 554.58);
  assert.equal(approved.payslips[0].totals.pensionPremiumAmount, 2286);
  assert.equal(approved.payslips[0].totals.pensionSpecialPayrollTaxAmount, 554.58);

  const agreementEvent = pensionPlatform.listPensionEvents({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  }).find((event) => event.eventCode === "agreement_pension_premium");
  assert.ok(agreementEvent);
  assert.equal(agreementEvent.planCode, "FORA");
  assert.equal(agreementEvent.providerCode, "fora");
  assert.equal(agreementEvent.reportBasisAmount, 50800);
  assert.equal(agreementEvent.contributionAmount, 2286);
  assert.equal(agreementEvent.payrollDispatchStatus.approvedCount, 1);
});

function createAgreementPayrollFixture({
  payModelCode,
  hourlyRate = null,
  monthlySalary = null,
  ordinaryHoursPerMonth = 173.33,
  ruleSet
}) {
  const fixedNow = new Date("2026-03-22T08:00:00Z");
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
    collectiveAgreementsPlatform,
    pensionPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Kollektiv",
    familyName: "Anstalld",
    workEmail: `agreement.${String(++employeeEmailCounter).padStart(4, "0")}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Field specialist",
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
    collectiveAgreementCode: "TEKNIK_OVERLAY",
    actorId: "unit-test"
  });
  if (payModelCode === "monthly_salary") {
    hrPlatform.recordEmploymentSalaryBasis({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryBasisCode: "MONTHLY_FULLTIME",
      payModelCode,
      employmentRatePercent: 100,
      standardWeeklyHours: 40,
      ordinaryHoursPerMonth,
      actorId: "unit-test"
    });
  }
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Kollektiv Anstalld",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Unit Test Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });

  const family = collectiveAgreementsPlatform.createAgreementFamily({
    companyId: COMPANY_ID,
    code: "TEKNIK_OVERLAY",
    name: "Teknik overlay",
    actorId: "unit-test"
  });
  const version = collectiveAgreementsPlatform.publishAgreementVersion({
    companyId: COMPANY_ID,
    agreementFamilyId: family.agreementFamilyId,
    versionCode: "TEKNIK_OVERLAY_2026_01",
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet,
    actorId: "unit-test"
  });
  const catalogEntry = collectiveAgreementsPlatform.publishAgreementCatalogEntry({
    companyId: COMPANY_ID,
    agreementVersionId: version.agreementVersionId,
    dropdownLabel: "Teknik overlay 2026",
    actorId: "unit-test"
  });
  collectiveAgreementsPlatform.assignAgreementToEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
    effectiveFrom: "2026-01-01",
    assignmentReasonCode: "HIRING",
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
    collectiveAgreementsPlatform,
    timePlatform,
    pensionPlatform,
    payrollPlatform,
    employee,
    employment,
    payCalendar: payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0]
  };
}

function findLine(payRun, payItemCode) {
  const line = payRun.lines.find((candidate) => candidate.payItemCode === payItemCode);
  assert.ok(line, `Expected line ${payItemCode} to exist.`);
  return line;
}
