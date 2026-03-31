import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.2 allocates voucher numbers on post and requires dual control for manual journals", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-31T09:00:00Z"),
    seedDemo: false
  });

  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  engine.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });

  const created = engine.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-31",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase7-2-manual",
    actorId: "unit-test",
    idempotencyKey: "phase7-2-manual",
    description: "Manual period-end adjustment",
    lines: [
      { accountNumber: "1110", debitAmount: 900 },
      { accountNumber: "2010", creditAmount: 900 }
    ]
  });

  assert.equal(created.journalEntry.voucherNumber, null);

  const approved = engine.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "unit-test"
  });
  assert.equal(approved.journalEntry.status, "approved_for_post");

  assert.throws(
    () =>
      engine.postJournalEntry({
        companyId: COMPANY_ID,
        journalEntryId: created.journalEntry.journalEntryId,
        actorId: "unit-test"
      }),
    /dual control/i
  );

  assert.throws(
    () =>
      engine.postJournalEntry({
        companyId: COMPANY_ID,
        journalEntryId: created.journalEntry.journalEntryId,
        actorId: "unit-test",
        approvedByActorId: "unit-test",
        approvedByRoleCode: "finance_manager"
      }),
    /dual control/i
  );

  const posted = engine.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "unit-test",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  assert.equal(posted.journalEntry.status, "posted");
  assert.equal(posted.journalEntry.voucherNumber, 1);
  assert.equal(posted.journalEntry.metadataJson.postingApprovalApprovedByActorId, "finance-approver");
});

test("Phase 7.2 creates first-class posting intents and persists intent refs on journals", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-31T09:30:00Z"),
    seedDemo: false
  });

  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  engine.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });

  const applied = engine.applyPostingIntent({
    companyId: COMPANY_ID,
    journalDate: "2026-03-31",
    recipeCode: "AR_INVOICE",
    sourceType: "AR_INVOICE",
    sourceId: "invoice-7-2",
    sourceObjectVersion: "invoice:v7",
    actorId: "unit-test",
    idempotencyKey: "invoice-7-2",
    lines: [
      { accountNumber: "1210", debitAmount: 1250 },
      { accountNumber: "3010", creditAmount: 1000 },
      { accountNumber: "2610", creditAmount: 250 }
    ]
  });

  assert.equal(typeof applied.postingIntent.intentId, "string");
  assert.equal(applied.postingIntent.recipeCode, "AR_INVOICE");
  assert.equal(applied.journalEntry.metadataJson.postingIntentId, applied.postingIntent.intentId);
  assert.equal(applied.journalEntry.voucherNumber, 1);

  const snapshot = engine.snapshotLedger();
  assert.equal(snapshot.postingIntents.length, 1);
  assert.equal(snapshot.postingIntents[0].intentId, applied.postingIntent.intentId);
});

test("Phase 7.2 requires real dual control on soft-lock overrides", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-31T10:00:00Z"),
    seedDemo: false
  });

  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  engine.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });
  const period = engine.listAccountingPeriods({ companyId: COMPANY_ID }).find((candidate) => candidate.startsOn === "2026-01-01");
  engine.lockAccountingPeriod({
    companyId: COMPANY_ID,
    accountingPeriodId: period.accountingPeriodId,
    status: "soft_locked",
    actorId: "unit-test",
    reasonCode: "month_close"
  });

  assert.throws(
    () =>
      engine.createJournalEntry({
        companyId: COMPANY_ID,
        journalDate: "2026-01-15",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "soft-lock-no-override",
        actorId: "unit-test",
        idempotencyKey: "soft-lock-no-override",
        description: "Blocked draft",
        lines: [
          { accountNumber: "1110", debitAmount: 400 },
          { accountNumber: "2010", creditAmount: 400 }
        ]
      }),
    /locked accounting period/i
  );

  assert.throws(
    () =>
      engine.createJournalEntry({
        companyId: COMPANY_ID,
        journalDate: "2026-01-15",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "soft-lock-self-approve",
        actorId: "unit-test",
        idempotencyKey: "soft-lock-self-approve",
        description: "Blocked override",
        metadataJson: {
          periodLockOverrideApprovedByActorId: "unit-test",
          periodLockOverrideApprovedByRoleCode: "finance_manager",
          periodLockOverrideReasonCode: "urgent_adjustment"
        },
        lines: [
          { accountNumber: "1110", debitAmount: 400 },
          { accountNumber: "2010", creditAmount: 400 }
        ]
      }),
    /dual control/i
  );

  const created = engine.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-01-15",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "soft-lock-approved",
    actorId: "unit-test",
    idempotencyKey: "soft-lock-approved",
    description: "Approved override journal",
    metadataJson: {
      periodLockOverrideApprovedByActorId: "finance-approver",
      periodLockOverrideApprovedByRoleCode: "finance_manager",
      periodLockOverrideReasonCode: "urgent_adjustment"
    },
    lines: [
      { accountNumber: "1110", debitAmount: 400 },
      { accountNumber: "2010", creditAmount: 400 }
    ]
  });
  assert.equal(created.journalEntry.status, "draft");
});
