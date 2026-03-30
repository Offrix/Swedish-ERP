import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createBankingPlatform } from "../../packages/domain-banking/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.3 payroll durable export stores payout exports outside plain snapshot state", () => {
  const fixedNow = new Date("2026-03-22T09:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
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
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });
  const bankingPlatform = createBankingPlatform({
    clock: () => fixedNow
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
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
    identityValue: "19800112-1238",
    hourlyRate: 200
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
    projectId: "project-demo-alpha",
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

  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });

  payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });

  const payoutBatch = payrollPlatform.createPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });

  assert.match(payoutBatch.exportPayload, /5000:1234567890/);

  const durableState = payrollPlatform.exportDurableState();
  const serialized = JSON.stringify(durableState);

  assert.equal(serialized.includes("5000:1234567890"), false);
  assert.equal(serialized.includes("employee_no;payee;account;amount;currency;reference"), false);

  const restoredPayrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    ledgerPlatform,
    bankingPlatform
  });
  restoredPayrollPlatform.importDurableState(durableState);

  const restoredBatch = restoredPayrollPlatform.getPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payrollPayoutBatchId: payoutBatch.payrollPayoutBatchId
  });

  assert.match(restoredBatch.exportPayload, /5000:1234567890/);
  assert.equal(restoredBatch.lines[0].accountTarget.includes("1234567890"), false);
});

function createHourlyEmployee({ hrPlatform, givenName, familyName, identityValue, hourlyRate }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityValue,
    identityType: "personnummer",
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Konsult",
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
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
