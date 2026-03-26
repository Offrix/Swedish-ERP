import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createAccountingMethodPlatform } from "../../packages/domain-accounting-method/src/index.mjs";
import { createFiscalYearPlatform } from "../../packages/domain-fiscal-year/src/index.mjs";
import { readText } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.1 migration binds ledger journals and periods to fiscal year and method references", async () => {
  const migration = await readText("packages/db/migrations/20260324110000_phase14_ledger_foundation_bridge.sql");

  for (const fragment of [
    "ALTER TABLE accounting_periods",
    "ADD COLUMN IF NOT EXISTS fiscal_year_id",
    "ADD COLUMN IF NOT EXISTS fiscal_period_id",
    "ALTER TABLE journal_entries",
    "ADD COLUMN IF NOT EXISTS accounting_method_profile_id",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_accounting_periods_company_fiscal_period",
    "CREATE INDEX IF NOT EXISTS ix_journal_entries_company_method_profile"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 14.1 ledger binds journals to the active fiscal year, fiscal period and accounting method profile", () => {
  const clock = () => new Date("2026-03-24T09:00:00Z");
  const accountingMethodPlatform = createAccountingMethodPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo"
  });
  const fiscalYearPlatform = createFiscalYearPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo"
  });
  const engine = createLedgerEngine({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    accountingMethodPlatform,
    fiscalYearPlatform
  });

  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "user-1"
  });

  const accountingDate = "2026-03-21";
  const activeMethod = accountingMethodPlatform.getActiveMethodForDate({
    companyId: COMPANY_ID,
    accountingDate
  });
  const activeFiscalYear = fiscalYearPlatform.getActiveFiscalYearForDate({
    companyId: COMPANY_ID,
    accountingDate
  });
  const activeFiscalPeriod = fiscalYearPlatform.getPeriodForDate({
    companyId: COMPANY_ID,
    accountingDate
  });

  const periods = engine.listAccountingPeriods({ companyId: COMPANY_ID });
  assert.equal(periods.length, 12);
  const syncedPeriod = periods.find((period) => period.fiscalPeriodId === activeFiscalPeriod.periodId);
  assert.ok(syncedPeriod);
  assert.equal(syncedPeriod.fiscalYearId, activeFiscalYear.fiscalYearId);
  assert.equal(syncedPeriod.startsOn, activeFiscalPeriod.startDate);
  assert.equal(syncedPeriod.endsOn, activeFiscalPeriod.endDate);

  const created = engine.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: accountingDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase14-ledger-foundation-001",
    actorId: "user-1",
    idempotencyKey: "phase14-ledger-foundation-001",
    lines: [
      { accountNumber: "1110", debitAmount: 2400 },
      { accountNumber: "2010", creditAmount: 2400 }
    ]
  });

  assert.equal(created.journalEntry.fiscalYearId, activeFiscalYear.fiscalYearId);
  assert.equal(created.journalEntry.fiscalPeriodId, activeFiscalPeriod.periodId);
  assert.equal(created.journalEntry.accountingMethodProfileId, activeMethod.methodProfileId);
  assert.equal(created.journalEntry.accountingPeriodId, syncedPeriod.accountingPeriodId);
});

test("Phase 14.1 ledger preserves legacy fallback behavior when method and fiscal platforms are absent", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-24T09:15:00Z")
  });

  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "user-1"
  });
  engine.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "user-1"
  });

  const created = engine.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-21",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase14-ledger-legacy-001",
    actorId: "user-1",
    idempotencyKey: "phase14-ledger-legacy-001",
    lines: [
      { accountNumber: "1110", debitAmount: 800 },
      { accountNumber: "2010", creditAmount: 800 }
    ]
  });

  assert.equal(created.journalEntry.fiscalYearId, null);
  assert.equal(created.journalEntry.fiscalPeriodId, null);
  assert.equal(created.journalEntry.accountingMethodProfileId, null);
});
