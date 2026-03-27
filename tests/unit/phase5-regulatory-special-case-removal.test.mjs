import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.5 payroll blocks free manual-rate and undocumented SINK profiles", () => {
  const { payrollPlatform, employment } = createPayrollFixture();

  assert.throws(
    () =>
      payrollPlatform.upsertEmploymentStatutoryProfile({
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        actorId: "phase5-5-unit"
      }),
    (error) => error?.code === "statutory_profile_manual_rate_reason_required"
  );

  assert.throws(
    () =>
      payrollPlatform.upsertEmploymentStatutoryProfile({
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        taxMode: "sink",
        sinkDecisionType: "ordinary_sink",
        sinkValidFrom: "2026-01-01",
        sinkValidTo: "2026-12-31",
        sinkRatePercent: 22.5,
        actorId: "phase5-5-unit"
      }),
    (error) => error?.code === "statutory_profile_sink_decision_document_required"
  );
});

test("Phase 5.5 employer contribution age special case resolves from rulepack data instead of hardcoded branch", () => {
  const { payrollPlatform, employment } = createPayrollFixture({
    dateOfBirth: "1937-04-10",
    monthlySalary: 36000
  });

  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    actorId: "phase5-5-unit"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "phase5-5-unit"
  });

  assert.equal(payRun.payslips.length, 1);
  assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.contributionClassCode, "no_contribution");
  assert.equal(payRun.payslips[0].totals.employerContributionPreviewAmount, 0);
});

function createPayrollFixture({ dateOfBirth = "1992-05-14", monthlySalary = 42000 } = {}) {
  const fixedNow = new Date("2026-03-27T08:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Elsa",
    familyName: "Regulatory",
    workEmail: `elsa.${dateOfBirth.replaceAll("-", "")}@example.test`,
    dateOfBirth,
    actorId: "phase5-5-unit"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll subject",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "phase5-5-unit"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary,
    actorId: "phase5-5-unit"
  });

  return {
    hrPlatform,
    timePlatform,
    payrollPlatform,
    employee,
    employment
  };
}
