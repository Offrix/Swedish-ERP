import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";

const COMPANY_ID = "phase7-opening-balance-company";

function createOpeningBalanceFixture() {
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
  const createdFiscalYear = fiscalYear.createFiscalYear({
    companyId: COMPANY_ID,
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    approvalBasisCode: "BOOKKEEPING_ENTRY",
    actorId: "tester"
  });
  const activeFiscalYear = fiscalYear.activateFiscalYear({
    companyId: COMPANY_ID,
    fiscalYearId: createdFiscalYear.fiscalYearId,
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
  return {
    ledger,
    activeFiscalYear
  };
}

test("Phase 7.5 opening balances post as first-class historical-import batches and can be reversed", () => {
  const { ledger, activeFiscalYear } = createOpeningBalanceFixture();

  const batch = ledger.createOpeningBalanceBatch({
    companyId: COMPANY_ID,
    fiscalYearId: activeFiscalYear.fiscalYearId,
    openingDate: "2027-01-01",
    sourceCode: "migration_cutover",
    externalReference: "fortnox-cutover-2027",
    evidenceRefs: ["sie4://import/2027-opening"],
    lines: [
      { accountNumber: "1110", debitAmount: 1000 },
      { accountNumber: "2010", creditAmount: 800 },
      { accountNumber: "2990", creditAmount: 200 }
    ],
    actorId: "tester",
    idempotencyKey: "phase7-opening-balance-1"
  });
  const replay = ledger.createOpeningBalanceBatch({
    companyId: COMPANY_ID,
    fiscalYearId: activeFiscalYear.fiscalYearId,
    openingDate: "2027-01-01",
    sourceCode: "migration_cutover",
    externalReference: "fortnox-cutover-2027",
    evidenceRefs: ["sie4://import/2027-opening"],
    lines: [
      { accountNumber: "1110", debitAmount: 1000 },
      { accountNumber: "2010", creditAmount: 800 },
      { accountNumber: "2990", creditAmount: 200 }
    ],
    actorId: "tester",
    idempotencyKey: "phase7-opening-balance-1"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: batch.journalEntryId
  });
  const listed = ledger.listOpeningBalanceBatches({
    companyId: COMPANY_ID
  });
  const reversed = ledger.reverseOpeningBalanceBatch({
    companyId: COMPANY_ID,
    openingBalanceBatchId: batch.openingBalanceBatchId,
    reasonCode: "migration_restate",
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  assert.equal(batch.openingBalanceBatchId, replay.openingBalanceBatchId);
  assert.equal(batch.status, "posted");
  assert.equal(batch.fiscalYearId, activeFiscalYear.fiscalYearId);
  assert.equal(batch.totals.totalDebit, 1000);
  assert.equal(batch.totals.totalCredit, 1000);
  assert.equal(batch.accountingCurrencyCode, "SEK");
  assert.equal(journal.sourceType, "HISTORICAL_IMPORT");
  assert.equal(journal.voucherSeriesCode, "W");
  assert.equal(journal.metadataJson.openingBalanceBatchId, batch.openingBalanceBatchId);
  assert.equal(journal.lines.some((line) => line.accountNumber === "1110" && Number(line.debitAmount) === 1000), true);
  assert.equal(listed.length, 1);
  assert.equal(reversed.status, "reversed");
  assert.equal(typeof reversed.reversalJournalEntryId, "string");
});

test("Phase 7.5 opening balances reject profit-and-loss accounts", () => {
  const { ledger, activeFiscalYear } = createOpeningBalanceFixture();

  assert.throws(
    () =>
      ledger.createOpeningBalanceBatch({
        companyId: COMPANY_ID,
        fiscalYearId: activeFiscalYear.fiscalYearId,
        openingDate: "2027-01-01",
        sourceCode: "migration_cutover",
        lines: [
          { accountNumber: "1110", debitAmount: 1000 },
          { accountNumber: "3010", creditAmount: 1000 }
        ],
        actorId: "tester",
        idempotencyKey: "phase7-opening-balance-profit-loss"
      }),
    (error) => error?.code === "opening_balance_profit_loss_account_forbidden"
  );
});
