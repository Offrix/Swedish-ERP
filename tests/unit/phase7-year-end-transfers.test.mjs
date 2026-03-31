import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";

const COMPANY_ID = "phase7-year-end-transfer-company";

function createYearEndTransferFixture() {
  const clock = () => new Date("2027-01-05T09:00:00Z");
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
  const fy2027 = fiscalYear.createFiscalYear({
    companyId: COMPANY_ID,
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    approvalBasisCode: "BOOKKEEPING_ENTRY",
    actorId: "tester"
  });
  fiscalYear.activateFiscalYear({
    companyId: COMPANY_ID,
    fiscalYearId: fy2027.fiscalYearId,
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
  postJournal(ledger, {
    journalDate: "2026-06-15",
    sourceId: "phase7-year-end-transfer-revenue",
    idempotencyKey: "phase7-year-end-transfer-revenue",
    lines: [
      { accountNumber: "1110", debitAmount: 1000 },
      { accountNumber: "3010", creditAmount: 1000 }
    ]
  });
  postJournal(ledger, {
    journalDate: "2026-09-20",
    sourceId: "phase7-year-end-transfer-expense",
    idempotencyKey: "phase7-year-end-transfer-expense",
    lines: [
      { accountNumber: "4010", debitAmount: 400 },
      { accountNumber: "2410", creditAmount: 400 }
    ]
  });
  return {
    ledger,
    fy2026,
    fy2027
  };
}

function postJournal(ledger, { journalDate, sourceId, idempotencyKey, lines }) {
  const created = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "tester",
    idempotencyKey,
    description: sourceId,
    lines
  });
  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester"
  });
  ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
}

test("Phase 7.5 year-end result transfer closes P&L accounts and retained earnings transfer moves current result into equity", () => {
  const { ledger, fy2026 } = createYearEndTransferFixture();

  const resultTransfer = ledger.createYearEndTransferBatch({
    companyId: COMPANY_ID,
    fiscalYearId: fy2026.fiscalYearId,
    transferKind: "RESULT_TRANSFER",
    sourceCode: "year_end_close",
    actorId: "tester",
    idempotencyKey: "phase7-result-transfer"
  });
  const replay = ledger.createYearEndTransferBatch({
    companyId: COMPANY_ID,
    fiscalYearId: fy2026.fiscalYearId,
    transferKind: "RESULT_TRANSFER",
    sourceCode: "year_end_close",
    actorId: "tester",
    idempotencyKey: "phase7-result-transfer"
  });
  const resultJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: resultTransfer.journalEntryId
  });
  const retainedTransfer = ledger.createYearEndTransferBatch({
    companyId: COMPANY_ID,
    fiscalYearId: fy2026.fiscalYearId,
    transferKind: "RETAINED_EARNINGS_TRANSFER",
    transferDate: "2027-01-01",
    sourceCode: "annual_result_disposition",
    actorId: "tester",
    idempotencyKey: "phase7-retained-transfer"
  });
  const retainedJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: retainedTransfer.journalEntryId
  });
  const reversedRetained = ledger.reverseYearEndTransferBatch({
    companyId: COMPANY_ID,
    yearEndTransferBatchId: retainedTransfer.yearEndTransferBatchId,
    reasonCode: "board_restate",
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  assert.equal(resultTransfer.yearEndTransferBatchId, replay.yearEndTransferBatchId);
  assert.equal(resultTransfer.transferKind, "RESULT_TRANSFER");
  assert.equal(resultTransfer.transferDate, "2026-12-31");
  assert.equal(resultTransfer.capturedBalances.length, 2);
  assert.equal(resultJournal.lines.some((line) => line.accountNumber === "3010" && Number(line.debitAmount) === 1000), true);
  assert.equal(resultJournal.lines.some((line) => line.accountNumber === "4010" && Number(line.creditAmount) === 400), true);
  assert.equal(resultJournal.lines.some((line) => line.accountNumber === "2040" && Number(line.creditAmount) === 600), true);

  assert.equal(retainedTransfer.transferKind, "RETAINED_EARNINGS_TRANSFER");
  assert.equal(retainedTransfer.resultTransferBatchId, resultTransfer.yearEndTransferBatchId);
  assert.equal(retainedTransfer.sourceBalanceAmount, -600);
  assert.equal(retainedJournal.lines.some((line) => line.accountNumber === "2040" && Number(line.debitAmount) === 600), true);
  assert.equal(retainedJournal.lines.some((line) => line.accountNumber === "2030" && Number(line.creditAmount) === 600), true);

  assert.equal(reversedRetained.status, "reversed");
  assert.equal(typeof reversedRetained.reversalJournalEntryId, "string");
});

test("Phase 7.5 retained earnings transfer requires posted result transfer first", () => {
  const { ledger, fy2026 } = createYearEndTransferFixture();

  assert.throws(
    () =>
      ledger.createYearEndTransferBatch({
        companyId: COMPANY_ID,
        fiscalYearId: fy2026.fiscalYearId,
        transferKind: "RETAINED_EARNINGS_TRANSFER",
        transferDate: "2027-01-01",
        sourceCode: "annual_result_disposition",
        actorId: "tester",
        idempotencyKey: "phase7-retained-without-result-transfer"
      }),
    (error) => error?.code === "year_end_transfer_dependency_missing"
  );
});
