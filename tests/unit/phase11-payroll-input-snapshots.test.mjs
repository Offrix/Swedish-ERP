import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.5 payroll input snapshots lock immutable inputs and stable fingerprints", () => {
  const fixedNow = new Date("2026-03-28T08:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform
  });

  const employee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Signe",
    familyName: "Snapshot",
    monthlySalary: 41000
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
    workDate: "2026-03-16",
    workedMinutes: 480,
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const run = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BONUS",
        amount: 900,
        processingStep: 4,
        dimensionJson: {
          projectId: "project-snapshot-alpha"
        }
      }
    ],
    actorId: "unit-test"
  });

  const snapshotByRun = payrollPlatform.getPayrollInputSnapshot({
    companyId: COMPANY_ID,
    payRunId: run.payRunId
  });
  const snapshotById = payrollPlatform.getPayrollInputSnapshot({
    companyId: COMPANY_ID,
    payrollInputSnapshotId: run.payrollInputSnapshotId
  });
  const rereadRun = payrollPlatform.getPayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId
  });

  assert.equal(typeof run.payrollInputSnapshotId, "string");
  assert.equal(typeof run.payrollInputFingerprint, "string");
  assert.equal(typeof run.payRunFingerprint, "string");
  assert.equal(run.payrollInputSnapshot.payrollInputSnapshotId, run.payrollInputSnapshotId);
  assert.equal(run.payrollInputSnapshot.inputFingerprint, run.payrollInputFingerprint);
  assert.equal(run.payrollInputSnapshot.sourceSnapshotHash, run.sourceSnapshotHash);
  assert.equal(run.payrollInputSnapshot.balanceSnapshotHash, run.balanceSnapshotHash);
  assert.equal(run.payrollInputSnapshot.agreementSnapshotHash, run.agreementSnapshotHash);
  assert.equal(snapshotByRun.inputFingerprint, run.payrollInputFingerprint);
  assert.deepEqual(snapshotById, snapshotByRun);
  assert.deepEqual(rereadRun.payrollInputSnapshot, snapshotByRun);
  assert.equal(rereadRun.payRunFingerprint, run.payRunFingerprint);
  assert.equal(snapshotByRun.sourceSnapshot.manualInputs[0].dimensionJson.projectId, "project-snapshot-alpha");
  assert.equal(snapshotByRun.sourceSnapshot.employmentIds[0], employee.employment.employmentId);
});

function createMonthlyEmployee({ hrPlatform, givenName, familyName, monthlySalary }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue: "19800112-1234",
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll snapshot tester",
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
    bankName: "Payroll Snapshot Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
