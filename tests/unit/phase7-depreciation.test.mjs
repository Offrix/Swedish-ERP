import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";

const COMPANY_ID = "phase7-depreciation-company";

function createDepreciationFixture() {
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
  installDepreciationAccounts(ledger);

  return {
    ledger,
    fy2026
  };
}

function installDepreciationAccounts(ledger) {
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "1260",
    accountName: "Inventarier",
    accountClass: "1",
    locked: false,
    allowManualPosting: false,
    actorId: "tester"
  });
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "1269",
    accountName: "Ackumulerade avskrivningar inventarier",
    accountClass: "1",
    locked: false,
    allowManualPosting: false,
    actorId: "tester"
  });
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "7830",
    accountName: "Avskrivningar inventarier",
    accountClass: "7",
    locked: false,
    actorId: "tester"
  });
}

test("Phase 7.6 depreciation registers asset cards, posts monthly straight-line depreciation and supports reversal", () => {
  const { ledger } = createDepreciationFixture();

  const assetCard = ledger.registerAssetCard({
    companyId: COMPANY_ID,
    assetCode: "INV-2026-001",
    assetName: "Laptoppark",
    acquisitionDate: "2026-01-15",
    inServiceDate: "2026-01-15",
    costAmount: 1200,
    usefulLifeMonths: 12,
    assetAccountNumber: "1260",
    accumulatedDepreciationAccountNumber: "1269",
    depreciationExpenseAccountNumber: "7830",
    actorId: "tester",
    idempotencyKey: "asset-card-1"
  });
  const assetReplay = ledger.registerAssetCard({
    companyId: COMPANY_ID,
    assetCode: "INV-2026-001",
    assetName: "Laptoppark",
    acquisitionDate: "2026-01-15",
    inServiceDate: "2026-01-15",
    costAmount: 1200,
    usefulLifeMonths: 12,
    assetAccountNumber: "1260",
    accumulatedDepreciationAccountNumber: "1269",
    depreciationExpenseAccountNumber: "7830",
    actorId: "tester",
    idempotencyKey: "asset-card-1"
  });

  const batch = ledger.runDepreciationBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-03-31",
    actorId: "tester",
    idempotencyKey: "depreciation-q1"
  });
  const batchReplay = ledger.runDepreciationBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-03-31",
    actorId: "tester",
    idempotencyKey: "depreciation-q1"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: batch.journalEntryId
  });
  const updatedAssetCard = ledger.getAssetCard({
    companyId: COMPANY_ID,
    assetCardId: assetCard.assetCardId
  });

  const reversed = ledger.reverseDepreciationBatch({
    companyId: COMPANY_ID,
    depreciationBatchId: batch.depreciationBatchId,
    reasonCode: "asset_schedule_restate",
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const restoredAssetCard = ledger.getAssetCard({
    companyId: COMPANY_ID,
    assetCardId: assetCard.assetCardId
  });

  assert.equal(assetReplay.assetCardId, assetCard.assetCardId);
  assert.equal(assetCard.nextDepreciationDate, "2026-01-31");
  assert.equal(batchReplay.depreciationBatchId, batch.depreciationBatchId);
  assert.equal(batch.assetCount, 1);
  assert.equal(batch.items[0].installmentCount, 3);
  assert.equal(batch.items[0].depreciationAmount, 300);
  assert.equal(journal.lines.some((line) => line.accountNumber === "7830" && Number(line.debitAmount) === 300), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "1269" && Number(line.creditAmount) === 300), true);
  assert.equal(updatedAssetCard.bookedDepreciationAmount, 300);
  assert.equal(updatedAssetCard.bookedInstallmentCount, 3);
  assert.equal(updatedAssetCard.remainingDepreciableAmount, 900);
  assert.equal(updatedAssetCard.nextDepreciationDate, "2026-04-30");
  assert.equal(updatedAssetCard.status, "active");
  assert.equal(reversed.status, "reversed");
  assert.equal(typeof reversed.reversalJournalEntryId, "string");
  assert.equal(restoredAssetCard.bookedDepreciationAmount, 0);
  assert.equal(restoredAssetCard.bookedInstallmentCount, 0);
  assert.equal(restoredAssetCard.remainingDepreciableAmount, 1200);
  assert.equal(restoredAssetCard.nextDepreciationDate, "2026-01-31");
  assert.equal(restoredAssetCard.status, "active");
});

test("Phase 7.6 depreciation enforces reversal order after later batches", () => {
  const { ledger } = createDepreciationFixture();
  const assetCard = ledger.registerAssetCard({
    companyId: COMPANY_ID,
    assetCode: "INV-2026-002",
    assetName: "Maskin",
    acquisitionDate: "2026-01-01",
    inServiceDate: "2026-01-01",
    costAmount: 1200,
    usefulLifeMonths: 12,
    assetAccountNumber: "1260",
    accumulatedDepreciationAccountNumber: "1269",
    depreciationExpenseAccountNumber: "7830",
    actorId: "tester",
    idempotencyKey: "asset-card-2"
  });

  const batchOne = ledger.runDepreciationBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-03-31",
    actorId: "tester",
    idempotencyKey: "depreciation-q1-order"
  });
  ledger.runDepreciationBatch({
    companyId: COMPANY_ID,
    throughDate: "2026-04-30",
    actorId: "tester",
    idempotencyKey: "depreciation-q2-order"
  });

  assert.equal(typeof assetCard.assetCardId, "string");
  assert.throws(
    () =>
      ledger.reverseDepreciationBatch({
        companyId: COMPANY_ID,
        depreciationBatchId: batchOne.depreciationBatchId,
        reasonCode: "asset_schedule_restate",
        actorId: "tester",
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }),
    (error) => error?.code === "depreciation_batch_reversal_order_invalid"
  );
});

test("Phase 7.6 depreciation requires month-end batch dates", () => {
  const { ledger } = createDepreciationFixture();
  ledger.registerAssetCard({
    companyId: COMPANY_ID,
    assetCode: "INV-2026-003",
    assetName: "Inventarie",
    acquisitionDate: "2026-01-20",
    inServiceDate: "2026-01-20",
    costAmount: 1200,
    usefulLifeMonths: 12,
    assetAccountNumber: "1260",
    accumulatedDepreciationAccountNumber: "1269",
    depreciationExpenseAccountNumber: "7830",
    actorId: "tester",
    idempotencyKey: "asset-card-3"
  });

  assert.throws(
    () =>
      ledger.runDepreciationBatch({
        companyId: COMPANY_ID,
        throughDate: "2026-03-15",
        actorId: "tester",
        idempotencyKey: "depreciation-non-month-end"
      }),
    (error) => error?.code === "depreciation_through_date_must_be_month_end"
  );
});
