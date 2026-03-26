import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.2 validates required project dimensions and known dimension values", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-21T20:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });

  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "user-1"
  });
  assert.throws(
    () =>
      engine.createJournalEntry({
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "A",
        sourceType: "PROJECT_WIP",
        sourceId: "phase3-2-project-missing",
        actorId: "user-1",
        idempotencyKey: "phase3-2-project-missing",
        lines: [
          { accountNumber: "5410", debitAmount: 1250 },
          { accountNumber: "1110", creditAmount: 1250 }
        ]
      }),
    /project dimension/i
  );

  const draft = engine.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-21",
    voucherSeriesCode: "A",
    sourceType: "PROJECT_WIP",
    sourceId: "phase3-2-project-ok",
    actorId: "user-1",
    idempotencyKey: "phase3-2-project-ok",
    lines: [
      {
        accountNumber: "5410",
        debitAmount: 1250,
        dimensionJson: {
          projectId: "project-demo-alpha",
          costCenterCode: "CC-200",
          businessAreaCode: "BA-SERVICES"
        }
      },
      { accountNumber: "1110", creditAmount: 1250 }
    ]
  });

  assert.equal(draft.journalEntry.lines[0].dimensionJson.projectId, "project-demo-alpha");
  assert.equal(draft.journalEntry.lines[0].dimensionJson.costCenterCode, "CC-200");
  assert.equal(draft.journalEntry.lines[0].dimensionJson.businessAreaCode, "BA-SERVICES");
});

test("Phase 3.2 locks periods against mutation and corrections create new vouchers in the next open period after hard close", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-21T20:15:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });

  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "user-1"
  });
  const januaryPeriod = engine
    .listAccountingPeriods({ companyId: COMPANY_ID })
    .find((period) => period.startsOn === "2026-01-01");

  const draft = engine.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-01-15",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase3-2-lock-source",
    actorId: "user-1",
    idempotencyKey: "phase3-2-lock-source",
    lines: [
      { accountNumber: "1110", debitAmount: 1000 },
      { accountNumber: "2010", creditAmount: 1000 }
    ]
  });

  const softLock = engine.lockAccountingPeriod({
    companyId: COMPANY_ID,
    accountingPeriodId: januaryPeriod.accountingPeriodId,
    status: "soft_locked",
    actorId: "user-1",
    reasonCode: "month_close"
  });
  assert.equal(softLock.accountingPeriod.status, "soft_locked");
  assert.equal(softLock.affectedJournalEntries[0].status, "locked_by_period");

  assert.throws(
    () =>
      engine.validateJournalEntry({
        companyId: COMPANY_ID,
        journalEntryId: draft.journalEntry.journalEntryId,
        actorId: "user-1"
      }),
    /locked accounting period/i
  );

  const reopened = engine.reopenAccountingPeriod({
    companyId: COMPANY_ID,
    accountingPeriodId: januaryPeriod.accountingPeriodId,
    actorId: "user-1",
    reasonCode: "close_adjustment",
    approvedByActorId: "user-2",
    approvedByRoleCode: "close_signatory"
  });
  assert.equal(reopened.accountingPeriod.status, "open");
  assert.equal(reopened.affectedJournalEntries[0].status, "draft");

  engine.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: draft.journalEntry.journalEntryId,
    actorId: "user-1"
  });
  const posted = engine.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: draft.journalEntry.journalEntryId,
    actorId: "user-1"
  });
  assert.equal(posted.journalEntry.status, "posted");

  engine.lockAccountingPeriod({
    companyId: COMPANY_ID,
    accountingPeriodId: januaryPeriod.accountingPeriodId,
    status: "hard_closed",
    actorId: "user-1",
    reasonCode: "year_end_close",
    approvedByActorId: "user-2",
    approvedByRoleCode: "finance_manager"
  });

  const correction = engine.correctJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: draft.journalEntry.journalEntryId,
    actorId: "user-1",
    reasonCode: "bank_reclass",
    correctionKey: "phase3-2-correction-001",
    reverseOriginal: true,
    lines: [
      {
        accountNumber: "5410",
        debitAmount: 350,
        dimensionJson: {
          projectId: "project-demo-alpha",
          costCenterCode: "CC-200",
          businessAreaCode: "BA-SERVICES"
        }
      },
      { accountNumber: "1110", creditAmount: 350 }
    ]
  });

  assert.equal(correction.originalJournalEntry.status, "reversed");
  assert.equal(correction.reversalJournalEntry.voucherSeriesCode, "V");
  assert.equal(correction.reversalJournalEntry.journalDate, "2026-02-01");
  assert.equal(correction.correctedJournalEntry.status, "posted");
  assert.equal(correction.correctedJournalEntry.journalDate, "2026-02-01");
  assert.equal(correction.correctedJournalEntry.correctionOfJournalEntryId, draft.journalEntry.journalEntryId);
  assert.equal(correction.correctedJournalEntry.correctionType, "reversal_and_rebook");
});
