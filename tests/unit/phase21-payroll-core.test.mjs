import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createBalancesPlatform } from "../../packages/domain-balances/src/index.mjs";
import { createCollectiveAgreementsPlatform } from "../../packages/domain-collective-agreements/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 21 payroll surfaces migration, agreement and approval exceptions before approval", () => {
  const fixedNow = new Date("2026-03-24T09:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const balancesPlatform = createBalancesPlatform({ clock: () => fixedNow, hrPlatform });
  const collectiveAgreementsPlatform = createCollectiveAgreementsPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform,
    balancesPlatform,
    collectiveAgreementsPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    balancesPlatform,
    collectiveAgreementsPlatform,
    getCorePlatform: () => ({
      getPayrollMigrationBatch() {
        return {
          payrollMigrationBatchId: "mig-batch-001",
          companyId: COMPANY_ID,
          status: "draft",
          validationSummary: {
            blockingIssueCount: 2,
            issues: [
              {
                code: "payroll_migration_records_missing",
                severity: "blocking",
                message: "At least one employee migration record is required."
              }
            ]
          }
        };
      },
      getOpenPayrollMigrationDiffs() {
        return [
          {
            payrollMigrationDiffId: "mig-diff-001",
            status: "open"
          }
        ];
      }
    })
  });

  const employee = createEmployeeWithContract({
    hrPlatform,
    givenName: "Elin",
    familyName: "Exception",
    monthlySalary: 39000
  });
  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 240,
    approvalMode: "manual",
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const run = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    sessionToken: "session-step21",
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "extra",
    employmentIds: [employee.employment.employmentId],
    migrationBatchId: "mig-batch-001",
    statutoryProfiles: [
      {
        employmentId: employee.employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    ],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BENEFIT",
        amount: 1000,
        processingStep: 6
      }
    ],
    actorId: "unit-test"
  });

  const codes = run.exceptions.map((item) => item.code).sort();
  assert.deepEqual(codes, [
    "benefit_without_cash_salary",
    "collective_agreement_missing",
    "negative_net_pay",
    "payroll_migration_batch_not_ready",
    "payroll_migration_open_diffs",
    "payroll_migration_validation_blocking",
    "pending_time_approvals_exist"
  ]);
  assert.equal(run.exceptionSummary.totalCount, 7);
  assert.equal(run.exceptionSummary.blockingOpenCount, 5);

  const warning = run.exceptions.find((item) => item.code === "benefit_without_cash_salary");
  const resolved = payrollPlatform.resolvePayrollException({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    payrollExceptionId: warning.payrollExceptionId,
    resolutionType: "resolved",
    note: "Handled via manual benefit review.",
    actorId: "unit-test"
  });
  assert.equal(resolved.status, "resolved");

  const refreshed = payrollPlatform.getPayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId
  });
  assert.equal(refreshed.exceptionSummary.resolvedCount, 1);
  assert.equal(refreshed.exceptionSummary.blockingOpenCount, 5);
  assert.throws(
    () =>
      payrollPlatform.approvePayRun({
        companyId: COMPANY_ID,
        payRunId: run.payRunId,
        actorId: "unit-test"
      }),
    (error) => error?.code === "payroll_run_has_blocking_exceptions"
  );
});

function createEmployeeWithContract({ hrPlatform, givenName, familyName, monthlySalary }) {
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
    jobTitle: "Payroll operator",
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
    bankName: "Unit Test Payroll Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
