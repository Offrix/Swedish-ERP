import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createBankingPlatform } from "../../packages/domain-banking/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.5 registers employee receivables and blocks zero-clipping in posting and payout", () => {
  const { payrollPlatform, hrPlatform } = createFixture(new Date("2026-04-01T08:00:00Z"));
  const employee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Nina",
    familyName: "Negative",
    identityValue: "19800112-1238",
    monthlySalary: 32000
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

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const run = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "extra",
    employmentIds: [employee.employment.employmentId],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BENEFIT",
        amount: 1200,
        processingStep: 6
      }
    ],
    actorId: "unit-test"
  });

  assert.deepEqual(
    run.exceptions.map((item) => item.code).sort(),
    ["benefit_without_cash_salary", "negative_net_pay"]
  );
  assert.equal(run.exceptionSummary.blockingOpenCount, 0);
  assert.equal(run.payslips[0].totals.netPay, -360);
  assert.equal(run.payslips[0].totals.cashNetPayAmount, 0);
  assert.equal(run.payslips[0].totals.employeeReceivableAmount, 360);

  const approvedRun = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  assert.equal(approvedRun.employeeReceivables.length, 1);
  assert.equal(approvedRun.employeeReceivables[0].amount, 360);
  assert.equal(approvedRun.employeeReceivables[0].status, "scheduled_offset");
  assert.equal(approvedRun.employeeReceivables[0].outstandingAmount, 360);
  assert.equal(approvedRun.receivableSettlementPlans.length, 1);
  assert.equal(approvedRun.receivableSettlementPlans[0].installments[0].reportingPeriod, "202604");
  assert.equal(approvedRun.receivableSettlementPlans[0].installments[0].plannedAmount, 360);
  assert.equal(approvedRun.payslips[0].totals.employeeReceivableId, approvedRun.employeeReceivables[0].employeeReceivableId);
  assert.equal(approvedRun.payslips[0].totals.employeeReceivableStatus, "scheduled_offset");
  assert.equal(approvedRun.payslips[0].totals.employeeReceivableOutstandingAmount, 360);

  const posting = payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  const receivableAssetLine = posting.journalLines.find(
    (line) => line.accountNumber === "1300" && line.debitAmount === 360
  );
  assert.ok(receivableAssetLine);
  assert.equal(posting.totals.cashNetPayAmount, 0);
  assert.equal(posting.totals.employeeReceivableAmount, 360);

  const payoutBatch = payrollPlatform.createPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  assert.equal(payoutBatch.totalAmount, 0);
  assert.equal(payoutBatch.lines.length, 0);
});

test("Phase 11.5 executes explicit employee receivable offsets through payroll reclaim lines", () => {
  const { payrollPlatform, hrPlatform } = createFixture(new Date("2026-04-01T08:00:00Z"));
  const employee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Otto",
    familyName: "Offset",
    identityValue: "19800112-7771",
    monthlySalary: 32000
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

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const negativeRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "extra",
    employmentIds: [employee.employment.employmentId],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BENEFIT",
        amount: 1200,
        processingStep: 6
      }
    ],
    actorId: "unit-test"
  });
  const approvedNegativeRun = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: negativeRun.payRunId,
    actorId: "unit-test"
  });
  const receivableId = approvedNegativeRun.employeeReceivables[0].employeeReceivableId;

  const offsetDecision = payrollPlatform.createReceivableOffsetDecision({
    companyId: COMPANY_ID,
    employeeReceivableId: receivableId,
    reportingPeriod: "202604",
    amount: 300,
    note: "Recover in next monthly payroll.",
    actorId: "unit-test"
  });
  assert.equal(offsetDecision.status, "pending_execution");

  const offsetRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    employmentIds: [employee.employment.employmentId],
    actorId: "unit-test"
  });
  const reclaimLine = offsetRun.lines.find((line) => line.sourceId === offsetDecision.receivableOffsetDecisionId);
  assert.ok(reclaimLine);
  assert.equal(reclaimLine.payItemCode, "RECLAIM");
  assert.equal(reclaimLine.ledgerAccountCode, "1300");
  assert.equal(reclaimLine.amount, 300);
  assert.equal(offsetRun.payslips[0].totals.employeeReceivableOffsetAmount, 300);

  const approvedOffsetRun = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: offsetRun.payRunId,
    actorId: "unit-test"
  });
  const updatedReceivable = payrollPlatform.getEmployeeReceivable({
    companyId: COMPANY_ID,
    employeeReceivableId: receivableId
  });
  assert.equal(updatedReceivable.status, "partially_settled");
  assert.equal(updatedReceivable.settledAmount, 300);
  assert.equal(updatedReceivable.outstandingAmount, 60);
  const executedDecision = approvedOffsetRun.receivableOffsetDecisions.find(
    (decision) => decision.receivableOffsetDecisionId === offsetDecision.receivableOffsetDecisionId
  );
  assert.equal(executedDecision.status, "executed");
  assert.equal(executedDecision.executedPayRunId, offsetRun.payRunId);
  const settlementPlan = updatedReceivable.settlementPlan;
  assert.equal(settlementPlan.installments[0].status, "partially_executed");
  assert.equal(settlementPlan.installments[0].executedAmount, 300);
  assert.equal(settlementPlan.installments[1].reportingPeriod, "202605");
  assert.equal(settlementPlan.installments[1].plannedAmount, 60);

  const posting = payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: offsetRun.payRunId,
    actorId: "unit-test"
  });
  const offsetAssetCreditLine = posting.journalLines.find(
    (line) => line.accountNumber === "1300" && line.creditAmount === 300
  );
  assert.ok(offsetAssetCreditLine);
});

test("Phase 11.5 requires dual review for employee receivable write-offs", () => {
  const { payrollPlatform, hrPlatform } = createFixture(new Date("2026-04-01T08:00:00Z"));
  const employee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Wera",
    familyName: "Writeoff",
    identityValue: "19900101-0017",
    monthlySalary: 32000
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

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const negativeRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "extra",
    employmentIds: [employee.employment.employmentId],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BENEFIT",
        amount: 1200,
        processingStep: 6
      }
    ],
    actorId: "unit-test"
  });
  const approvedNegativeRun = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: negativeRun.payRunId,
    actorId: "unit-test"
  });
  const receivableId = approvedNegativeRun.employeeReceivables[0].employeeReceivableId;

  const draftWriteOff = payrollPlatform.createReceivableWriteOffDecision({
    companyId: COMPANY_ID,
    employeeReceivableId: receivableId,
    reasonCode: "employee_departed_unrecoverable",
    actorId: "reviewer-a"
  });
  assert.equal(draftWriteOff.status, "draft");
  assert.deepEqual(
    draftWriteOff.postingIntentPreview.journalLines.map((line) => [line.accountNumber, line.debitAmount, line.creditAmount]),
    [
      ["7790", 360, 0],
      ["1300", 0, 360]
    ]
  );
  assert.throws(
    () =>
      payrollPlatform.approveReceivableWriteOffDecision({
        companyId: COMPANY_ID,
        receivableWriteOffDecisionId: draftWriteOff.receivableWriteOffDecisionId,
        actorId: "reviewer-a"
      }),
    (error) => error?.code === "receivable_write_off_dual_review_required"
  );

  const approvedWriteOff = payrollPlatform.approveReceivableWriteOffDecision({
    companyId: COMPANY_ID,
    receivableWriteOffDecisionId: draftWriteOff.receivableWriteOffDecisionId,
    actorId: "reviewer-b"
  });
  assert.equal(approvedWriteOff.status, "approved");
  const writtenOffReceivable = payrollPlatform.getEmployeeReceivable({
    companyId: COMPANY_ID,
    employeeReceivableId: receivableId
  });
  assert.equal(writtenOffReceivable.status, "written_off");
  assert.equal(writtenOffReceivable.outstandingAmount, 0);
  assert.equal(writtenOffReceivable.writtenOffAmount, 360);
});

function createFixture(fixedNow) {
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
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
  bankingPlatform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Payroll House Bank",
    ledgerAccountNumber: "1110",
    clearingNumber: "5000",
    accountNumber: "5566778899",
    isDefault: true,
    actorId: "unit-test"
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    ledgerPlatform,
    bankingPlatform
  });
  return {
    orgAuthPlatform,
    hrPlatform,
    ledgerPlatform,
    bankingPlatform,
    payrollPlatform
  };
}

function createMonthlyEmployee({ hrPlatform, givenName, familyName, identityValue, monthlySalary }) {
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
    jobTitle: "Payroll receivable tester",
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
    bankName: "Employee Payroll Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
