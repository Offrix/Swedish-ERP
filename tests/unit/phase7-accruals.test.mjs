import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";

const COMPANY_ID = "phase7-accrual-company";

function createAccrualFixture() {
  const clock = () => new Date("2026-04-05T09:00:00Z");
  const fiscalYear = createFiscalYearEngine({
    clock,
    seedDemo: false
  });
  const profile = fiscalYear.createFiscalYearProfile({
    companyId: COMPANY_ID,
    legalFormCode: "AKTIEBOLAG",
    actorId: "tester"
  });
  const fy2026 = fiscalYear.createFiscalYear({
    companyId: COMPANY_ID,
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BOOKKEEPING_ENTRY",
    actorId: "tester"
  });
  fiscalYear.activateFiscalYear({
    companyId: COMPANY_ID,
    fiscalYearId: fy2026.fiscalYearId,
    actorId: "tester"
  });

  const ledger = createLedgerEngine({
    clock,
    seedDemo: false,
    fiscalYearPlatform: fiscalYear
  });
  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "tester"
  });
  installAccrualAccounts(ledger);

  return {
    ledger,
    fy2026
  };
}

function installAccrualAccounts(ledger) {
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "1730",
    accountName: "Förutbetalda kostnader",
    accountClass: "1",
    locked: false,
    allowManualPosting: false,
    actorId: "tester"
  });
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "1790",
    accountName: "Upplupna intäkter",
    accountClass: "1",
    locked: false,
    allowManualPosting: false,
    actorId: "tester"
  });
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "2970",
    accountName: "Förutbetalda intäkter",
    accountClass: "2",
    locked: false,
    allowManualPosting: false,
    actorId: "tester"
  });
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "2990",
    accountName: "Upplupna kostnader",
    accountClass: "2",
    locked: false,
    allowManualPosting: false,
    actorId: "tester"
  });
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "6110",
    accountName: "Kontorsmaterial",
    accountClass: "6",
    locked: false,
    actorId: "tester"
  });
}

test("Phase 7.6 accrual runtime recognizes prepaid expense and prepaid revenue monthly and supports reversal", () => {
  const { ledger } = createAccrualFixture();

  const prepaidExpense = ledger.registerAccrualSchedule({
    companyId: COMPANY_ID,
    scheduleCode: "PREPAID-001",
    scheduleName: "Försäkring Q1",
    scheduleKind: "PREPAID_EXPENSE",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    totalAmount: 300,
    profitAndLossAccountNumber: "6110",
    balanceSheetAccountNumber: "1730",
    actorId: "tester",
    idempotencyKey: "accrual-schedule-expense"
  });
  const prepaidRevenue = ledger.registerAccrualSchedule({
    companyId: COMPANY_ID,
    scheduleCode: "PREPAID-REV-001",
    scheduleName: "Serviceavtal Q1",
    scheduleKind: "PREPAID_REVENUE",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    totalAmount: 600,
    profitAndLossAccountNumber: "3010",
    balanceSheetAccountNumber: "2970",
    actorId: "tester",
    idempotencyKey: "accrual-schedule-revenue"
  });
  const scheduleReplay = ledger.registerAccrualSchedule({
    companyId: COMPANY_ID,
    scheduleCode: "PREPAID-001",
    scheduleName: "Försäkring Q1",
    scheduleKind: "PREPAID_EXPENSE",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    totalAmount: 300,
    profitAndLossAccountNumber: "6110",
    balanceSheetAccountNumber: "1730",
    actorId: "tester",
    idempotencyKey: "accrual-schedule-expense"
  });

  const batch = ledger.runAccrualBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-03-31",
    actorId: "tester",
    idempotencyKey: "accrual-q1"
  });
  const batchReplay = ledger.runAccrualBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-03-31",
    actorId: "tester",
    idempotencyKey: "accrual-q1"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: batch.journalEntryId
  });
  const updatedExpense = ledger.getAccrualSchedule({
    companyId: COMPANY_ID,
    accrualScheduleId: prepaidExpense.accrualScheduleId
  });
  const updatedRevenue = ledger.getAccrualSchedule({
    companyId: COMPANY_ID,
    accrualScheduleId: prepaidRevenue.accrualScheduleId
  });

  const reversed = ledger.reverseAccrualBatch({
    companyId: COMPANY_ID,
    accrualBatchId: batch.accrualBatchId,
    reasonCode: "month_end_restate",
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const restoredExpense = ledger.getAccrualSchedule({
    companyId: COMPANY_ID,
    accrualScheduleId: prepaidExpense.accrualScheduleId
  });

  assert.equal(scheduleReplay.accrualScheduleId, prepaidExpense.accrualScheduleId);
  assert.equal(batchReplay.accrualBatchId, batch.accrualBatchId);
  assert.equal(batch.scheduleCount, 2);
  assert.equal(journal.lines.some((line) => line.accountNumber === "6110" && Number(line.debitAmount) === 300), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "1730" && Number(line.creditAmount) === 300), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "2970" && Number(line.debitAmount) === 600), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "3010" && Number(line.creditAmount) === 600), true);
  assert.equal(updatedExpense.status, "completed");
  assert.equal(updatedExpense.recognizedAmount, 300);
  assert.equal(updatedExpense.remainingAmount, 0);
  assert.equal(updatedExpense.nextRecognitionDate, null);
  assert.equal(updatedRevenue.status, "completed");
  assert.equal(updatedRevenue.recognizedAmount, 600);
  assert.equal(reversed.status, "reversed");
  assert.equal(typeof reversed.reversalJournalEntryId, "string");
  assert.equal(restoredExpense.status, "active");
  assert.equal(restoredExpense.recognizedAmount, 0);
  assert.equal(restoredExpense.remainingAmount, 300);
  assert.equal(restoredExpense.nextRecognitionDate, "2026-01-31");
});

test("Phase 7.6 accrual runtime enforces reversal order after later batches", () => {
  const { ledger } = createAccrualFixture();
  ledger.registerAccrualSchedule({
    companyId: COMPANY_ID,
    scheduleCode: "ACCRUAL-001",
    scheduleName: "Hyra Q1-Q2",
    scheduleKind: "PREPAID_EXPENSE",
    startDate: "2026-01-01",
    endDate: "2026-04-30",
    totalAmount: 400,
    profitAndLossAccountNumber: "6110",
    balanceSheetAccountNumber: "1730",
    actorId: "tester",
    idempotencyKey: "accrual-schedule-order"
  });

  const batchOne = ledger.runAccrualBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-03-31",
    actorId: "tester",
    idempotencyKey: "accrual-order-q1"
  });
  ledger.runAccrualBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-04-30",
    actorId: "tester",
    idempotencyKey: "accrual-order-q2"
  });

  assert.throws(
    () =>
      ledger.reverseAccrualBatch({
        companyId: COMPANY_ID,
        accrualBatchId: batchOne.accrualBatchId,
        reasonCode: "month_end_restate",
        actorId: "tester",
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }),
    (error) => error?.code === "accrual_batch_reversal_order_invalid"
  );
});

test("Phase 7.6 accrual runtime requires month-end batch dates", () => {
  const { ledger } = createAccrualFixture();
  ledger.registerAccrualSchedule({
    companyId: COMPANY_ID,
    scheduleCode: "ACCRUAL-002",
    scheduleName: "Försäkring april",
    scheduleKind: "PREPAID_EXPENSE",
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    totalAmount: 100,
    profitAndLossAccountNumber: "6110",
    balanceSheetAccountNumber: "1730",
    actorId: "tester",
    idempotencyKey: "accrual-month-end"
  });

  assert.throws(
    () =>
      ledger.runAccrualBatch({
        companyId: COMPANY_ID,
        throughDate: "2026-04-15",
        actorId: "tester",
        idempotencyKey: "accrual-bad-date"
      }),
    (error) => error?.code === "accrual_through_date_must_be_month_end"
  );
});
