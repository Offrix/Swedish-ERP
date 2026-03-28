import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPensionPlatform } from "../../packages/domain-pension/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.5 payroll input snapshot carries salary exchange policy and pension basis policy refs", () => {
  const fixedNow = new Date("2026-03-28T12:00:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
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
    pensionPlatform
  });

  const employee = createEmployeeWithContract({
    hrPlatform,
    givenName: "Pia",
    familyName: "Policy",
    workEmail: "pia.policy@example.com",
    identityValue: "19820314-4444",
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

  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employee.employeeId,
    employmentId: employee.employment.employmentId,
    planCode: "ITP1",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 4.5,
    actorId: "unit-test"
  });
  pensionPlatform.createSalaryExchangeAgreement({
    companyId: COMPANY_ID,
    employeeId: employee.employee.employeeId,
    employmentId: employee.employment.employmentId,
    startsOn: "2026-01-01",
    exchangeMode: "fixed_amount",
    exchangeValue: 3000,
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
  assert.equal(employmentSnapshot.salaryExchangeAgreements[0].policyVersionRef, "se_salary_exchange_policy_2026_v1");
  assert.equal(employmentSnapshot.salaryExchangeAgreements[0].minimumMonthlyExchangeAmount, 500);
  assert.equal(employmentSnapshot.salaryExchangeAgreements[0].specialPayrollTaxRatePercent, 24.26);
  assert.equal(employmentSnapshot.pensionBasisSnapshots[0].policyVersionRef, "se_salary_exchange_policy_2026_v1");
  assert.equal(employmentSnapshot.pensionBasisSnapshots[0].specialPayrollTaxRatePercent, 24.26);
  assert.equal(employmentSnapshot.pensionBasisSnapshots[0].basisTreatmentCode, "maintain_pre_exchange");
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
    jobTitle: "Pension employee",
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
    bankName: "Phase12 Pension Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
