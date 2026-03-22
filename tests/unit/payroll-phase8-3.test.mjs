import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createBankingPlatform } from "../../packages/domain-banking/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.3 payroll posting preserves dimensions, exports payouts and reproduces vacation liability snapshots", () => {
  const fixedNow = new Date("2026-03-22T09:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({ clock: () => fixedNow });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  const bankingPlatform = createBankingPlatform({
    clock: () => fixedNow
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    ledgerPlatform,
    bankingPlatform
  });

  bankingPlatform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Payroll House Bank",
    ledgerAccountNumber: "1110",
    clearingNumber: "5000",
    accountNumber: "5566778899",
    isDefault: true,
    actorId: "unit-test"
  });

  const employee = createHourlyEmployee({
    hrPlatform,
    givenName: "Lina",
    familyName: "Ledger",
    identityValue: "19800112-1234",
    hourlyRate: 200
  });

  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    taxMode: "manual_rate",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 480,
    projectId: "project-demo-alpha",
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
        amount: 1500,
        processingStep: 4,
        dimensionJson: {
          projectId: "project-demo-beta",
          costCenterCode: "CC-200",
          businessAreaCode: "BA-FIELD"
        }
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(run.calculationSteps.find((step) => step.stepNo === 17)?.status, "completed");
  assert.equal(run.calculationSteps.find((step) => step.stepNo === 18)?.status, "completed");

  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });

  const posting = payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  const salaryLine = posting.journalLines.find((line) => line.accountNumber === "7020");
  const bonusLine = posting.journalLines.find((line) => line.accountNumber === "7060");
  assert.deepEqual(salaryLine.dimensionJson, { projectId: "project-demo-alpha" });
  assert.deepEqual(bonusLine.dimensionJson, {
    projectId: "project-demo-beta",
    costCenterCode: "CC-200",
    businessAreaCode: "BA-FIELD"
  });

  const payoutBatch = payrollPlatform.createPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  assert.match(payoutBatch.exportPayload, /5000:1234567890/);

  const matchedBatch = payrollPlatform.matchPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payrollPayoutBatchId: payoutBatch.payrollPayoutBatchId,
    bankEventId: "bank-unit-payroll-202603",
    actorId: "unit-test"
  });
  assert.equal(matchedBatch.status, "matched");
  assert.ok(matchedBatch.matchedJournalEntryId);

  const snapshot = payrollPlatform.createVacationLiabilitySnapshot({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  const repeatedSnapshot = payrollPlatform.createVacationLiabilitySnapshot({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  assert.equal(repeatedSnapshot.vacationLiabilitySnapshotId, snapshot.vacationLiabilitySnapshotId);
  assert.equal(snapshot.totals.liabilityAmount > 0, true);
});

function createHourlyEmployee({ hrPlatform, givenName, familyName, identityValue, hourlyRate }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll consultant",
    payModelCode: "hourly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate,
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
    bankName: "Payroll Employee Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
