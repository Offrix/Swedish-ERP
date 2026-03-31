import test from "node:test";
import assert from "node:assert/strict";
import { DSAM_ACCOUNTS, createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";

test("Phase 3.1 installs DSAM accounts and A-Z voucher series", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-21T18:00:00Z")
  });

  const install = engine.installLedgerCatalog({
    companyId: "company-1",
    actorId: "user-1"
  });

  assert.equal(install.installedAccounts, DSAM_ACCOUNTS.length);
  assert.equal(install.installedVoucherSeries, 26);
  assert.equal(engine.listLedgerAccounts({ companyId: "company-1" }).length, DSAM_ACCOUNTS.length);
  assert.equal(engine.listVoucherSeries({ companyId: "company-1" }).length, 26);
});

test("Phase 3.1 derives DSAM account classes from BAS account numbers", () => {
  const administrationAccount = DSAM_ACCOUNTS.find((account) => account.accountNumber === "6000");
  const payrollAccount = DSAM_ACCOUNTS.find((account) => account.accountNumber === "7070");
  const revenueAccount = DSAM_ACCOUNTS.find((account) => account.accountNumber === "3010");

  assert.equal(administrationAccount?.accountClass, "6");
  assert.equal(payrollAccount?.accountClass, "7");
  assert.equal(revenueAccount?.accountClass, "3");
});

test("Phase 3.1 validates balance, preserves idempotency, marks imports and numbers vouchers deterministically", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-21T18:15:00Z")
  });

  engine.installLedgerCatalog({
    companyId: "00000000-0000-4000-8000-000000000001",
    actorId: "user-1"
  });
  engine.ensureAccountingYearPeriod({
    companyId: "00000000-0000-4000-8000-000000000001",
    fiscalYear: 2026,
    actorId: "user-1"
  });

  const firstDraft = engine.createJournalEntry({
    companyId: "00000000-0000-4000-8000-000000000001",
    journalDate: "2026-03-21",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "manual-001",
    actorId: "user-1",
    idempotencyKey: "manual-001",
    lines: [
      { accountNumber: "1110", debitAmount: 1250 },
      { accountNumber: "2010", creditAmount: 1250 }
    ]
  });
  assert.equal(firstDraft.journalEntry.voucherNumber, null);
  assert.equal(firstDraft.idempotentReplay, false);

  const replay = engine.createJournalEntry({
    companyId: "00000000-0000-4000-8000-000000000001",
    journalDate: "2026-03-21",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "manual-001",
    actorId: "user-1",
    idempotencyKey: "manual-001",
    lines: [
      { accountNumber: "1110", debitAmount: 1250 },
      { accountNumber: "2010", creditAmount: 1250 }
    ]
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.journalEntry.journalEntryId, firstDraft.journalEntry.journalEntryId);

  const validated = engine.validateJournalEntry({
    companyId: "00000000-0000-4000-8000-000000000001",
    journalEntryId: firstDraft.journalEntry.journalEntryId,
    actorId: "user-1"
  });
  assert.equal(validated.journalEntry.status, "approved_for_post");

  const posted = engine.postJournalEntry({
    companyId: "00000000-0000-4000-8000-000000000001",
    journalEntryId: firstDraft.journalEntry.journalEntryId,
    actorId: "user-1",
    approvedByActorId: "user-2",
    approvedByRoleCode: "finance_manager"
  });
  assert.equal(posted.journalEntry.status, "posted");
  assert.equal(posted.journalEntry.voucherNumber, 1);

  const importedDraft = engine.createJournalEntry({
    companyId: "00000000-0000-4000-8000-000000000001",
    journalDate: "2026-03-22",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "import-001",
    actorId: "user-1",
    idempotencyKey: "import-001",
    importedFlag: true,
    lines: [
      { accountNumber: "1110", debitAmount: 500 },
      { accountNumber: "2650", creditAmount: 500 }
    ]
  });
  assert.equal(importedDraft.journalEntry.voucherNumber, null);
  assert.equal(importedDraft.journalEntry.importedFlag, true);
  assert.equal(importedDraft.journalEntry.metadataJson.importSourceType, "historical_import");

  assert.throws(
    () =>
      engine.validateJournalEntry({
        companyId: "00000000-0000-4000-8000-000000000001",
        journalEntryId: engine.createJournalEntry({
          companyId: "00000000-0000-4000-8000-000000000001",
          journalDate: "2026-03-23",
          voucherSeriesCode: "A",
          sourceType: "MANUAL_JOURNAL",
          sourceId: "bad-001",
          actorId: "user-1",
          idempotencyKey: "bad-001",
          lines: [
            { accountNumber: "1110", debitAmount: 100 },
            { accountNumber: "2010", creditAmount: 99 }
          ]
        }).journalEntry.journalEntryId,
        actorId: "user-1"
      }),
    /balance/i
  );
});
