import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.2 employer contribution decisions handle age buckets, threshold splits and vaxa tax-account relief", () => {
  const fixedNow = new Date("2026-03-28T09:45:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
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

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const olderEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Algot",
    familyName: "Aldersavgift",
    monthlySalary: 30000,
    identityValue: "19590203-1111",
    dateOfBirth: "1959-02-03"
  });
  const olderRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [olderEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(olderRun.payslips[0].totals.employerContributionPreviewAmount, 3063);
  assert.equal(olderRun.payslips[0].totals.employerContributionDecision.outputs.decisionType, "reduced_age_pension_only");
  assert.equal(olderRun.payslips[0].totals.employerContributionDecision.outputs.ageBucket, "year_start_67_plus");

  const youthEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Ylva",
    familyName: "Youthdecision",
    monthlySalary: 30000,
    identityValue: "20050512-2222",
    dateOfBirth: "2005-05-12"
  });
  const youthRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    employmentIds: [youthEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(youthRun.payslips[0].totals.employerContributionPreviewAmount, 6773.5);
  assert.equal(
    youthRun.payslips[0].totals.employerContributionDecision.outputs.decisionType,
    "temporary_youth_reduction"
  );
  assert.deepEqual(
    youthRun.payslips[0].totals.employerContributionDecision.outputs.contributionComponents.map((component) => component.componentCode),
    ["temporary_youth_reduction_band", "standard_overflow_band"]
  );
  assert.equal(youthRun.payslips[0].totals.employerContributionDecision.outputs.referenceFullContributionAmount, 9426);

  const vaxaEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Vera",
    familyName: "Vaxa",
    monthlySalary: 30000,
    identityValue: "19900112-3333",
    dateOfBirth: "1990-01-12"
  });
  const vaxaDraft = payrollPlatform.createEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: vaxaEmployee.employment.employmentId,
    decisionType: "vaxa",
    ageBucket: "standard",
    legalBasisCode: "se_vaxa_2025_extended",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    baseLimit: 25000,
    fullRate: 31.42,
    reducedRate: 10.21,
    specialConditions: {
      supportWindowMonths: 24,
      supportEmployeeCountLimit: 2,
      supportMode: "tax_account_credit"
    },
    decisionSource: "support_review",
    decisionReference: "vaxa-2026-001",
    evidenceRef: "evidence-vaxa-2026-001",
    actorId: "payroll-agent-1"
  });
  assert.equal(vaxaDraft.status, "draft");
  assert.throws(
    () =>
      payrollPlatform.approveEmployerContributionDecisionSnapshot({
        companyId: COMPANY_ID,
        employerContributionDecisionSnapshotId: vaxaDraft.employerContributionDecisionSnapshotId,
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "employer_contribution_decision_snapshot_dual_review_required"
  );
  const vaxaApproved = payrollPlatform.approveEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employerContributionDecisionSnapshotId: vaxaDraft.employerContributionDecisionSnapshotId,
    actorId: "payroll-agent-2"
  });
  assert.equal(vaxaApproved.status, "approved");
  const vaxaRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [vaxaEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(vaxaRun.payslips[0].totals.employerContributionPreviewAmount, 4123.5);
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.decisionType, "vaxa");
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.referenceFullContributionAmount, 9426);
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.taxAccountReliefAmount, 5302.5);
  assert.equal(
    vaxaRun.payslips[0].totals.employerContributionDecision.outputs.taxAccountConsequence.creditAmount,
    5302.5
  );
});

function createMonthlyEmployee({ hrPlatform, givenName, familyName, monthlySalary, identityValue, dateOfBirth }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    dateOfBirth,
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Employer contribution tester",
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
    bankName: "Payroll Contribution Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
