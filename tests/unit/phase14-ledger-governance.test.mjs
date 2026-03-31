import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.3 governance version-stamps journals and enforces required service-line dimensions", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-28T08:00:00Z"),
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

  const governedAccount = engine.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "6540",
    accountName: "Konsultarvoden styrd",
    accountClass: "6",
    requiredDimensionKeys: ["serviceLineCode"],
    actorId: "unit-test"
  });
  const dimensionUpdate = engine.upsertLedgerDimensionValue({
    companyId: COMPANY_ID,
    dimensionType: "serviceLines",
    code: "SL-CONSULT",
    label: "Consulting delivery",
    actorId: "unit-test"
  });

  assert.throws(
    () =>
      engine.createJournalEntry({
        companyId: COMPANY_ID,
        journalDate: "2026-03-28",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase8-3-ledger-missing-service-line",
        actorId: "unit-test",
        idempotencyKey: "phase8-3-ledger-missing-service-line",
        lines: [
          { accountNumber: "6540", debitAmount: 1200 },
          { accountNumber: "2010", creditAmount: 1200 }
        ]
      }),
    /requires dimension serviceLineCode/i
  );

  const draft = engine.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-28",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase8-3-ledger-service-line-ok",
    actorId: "unit-test",
    idempotencyKey: "phase8-3-ledger-service-line-ok",
    lines: [
      {
        accountNumber: "6540",
        debitAmount: 1200,
        dimensionJson: {
          serviceLineCode: "SL-CONSULT"
        }
      },
      { accountNumber: "2010", creditAmount: 1200 }
    ]
  });

  assert.equal(draft.journalEntry.voucherSeriesProfileVersion, 1);
  assert.equal(draft.journalEntry.dimensionCatalogVersion, dimensionUpdate.catalogVersion);
  assert.equal(draft.journalEntry.lines[0].accountVersion, governedAccount.governanceVersion);
  assert.equal(draft.journalEntry.lines[0].dimensionCatalogVersion, dimensionUpdate.catalogVersion);
  assert.equal(draft.journalEntry.lines[0].dimensionJson.serviceLineCode, "SL-CONSULT");
});

test("Phase 8.3 locks voucher-series purpose mapping and account class changes after usage", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-28T08:30:00Z"),
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
    journalDate: "2026-03-28",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase8-3-governance-lock",
    actorId: "unit-test",
    idempotencyKey: "phase8-3-governance-lock",
    lines: [
      { accountNumber: "1110", debitAmount: 1000 },
      { accountNumber: "2010", creditAmount: 1000 }
    ]
  });
  engine.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "unit-test"
  });
  engine.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "unit-test",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  assert.throws(
    () =>
      engine.upsertVoucherSeries({
        companyId: COMPANY_ID,
        seriesCode: "A",
        description: "Repurposed manual series",
        purposeCodes: ["AR_INVOICE"],
        changeReasonCode: "attempted_repurpose_after_use",
        actorId: "unit-test"
      }),
    /cannot change purpose mapping after it has been used/i
  );

  assert.throws(
    () =>
      engine.upsertLedgerAccount({
        companyId: COMPANY_ID,
        accountNumber: "2010",
        accountName: "Eget kapital",
        accountClass: "3",
        changeReasonCode: "attempted_reclass_after_use",
        actorId: "unit-test"
      }),
    /cannot change account class after it has been used/i
  );
});
