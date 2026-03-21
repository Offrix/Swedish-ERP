import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";
import { createReportingEngine } from "../../packages/domain-reporting/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.3 stores reproducible report snapshots with drilldown to linked documents", () => {
  const clock = () => new Date("2026-03-21T22:15:00Z");
  const ledger = createLedgerEngine({ clock });
  const documents = createDocumentArchiveEngine({ clock });
  const reporting = createReportingEngine({
    clock,
    ledgerPlatform: ledger,
    documentPlatform: documents
  });

  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "user-1"
  });

  const januaryPeriod = ledger
    .listAccountingPeriods({ companyId: COMPANY_ID })
    .find((period) => period.startsOn === "2026-01-01");

  const posted = createPostedJournal({
    ledger,
    companyId: COMPANY_ID,
    actorId: "user-1",
    journalDate: "2026-01-15",
    idempotencyKey: "phase3-3-unit-origin",
    sourceId: "phase3-3-unit-origin",
    lines: [
      { accountNumber: "1110", debitAmount: 1250 },
      { accountNumber: "3010", creditAmount: 1250 }
    ]
  });

  const document = documents.createDocumentRecord({
    companyId: COMPANY_ID,
    documentType: "customer_invoice",
    sourceChannel: "manual",
    sourceReference: "phase3-3-unit-origin",
    actorId: "user-1"
  });
  documents.linkDocumentRecord({
    companyId: COMPANY_ID,
    documentId: document.documentId,
    targetType: "journal_entry",
    targetId: posted.journalEntry.journalEntryId,
    actorId: "user-1"
  });

  const snapshot = reporting.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: "trial_balance",
    accountingPeriodId: januaryPeriod.accountingPeriodId,
    actorId: "user-1"
  });
  const line = snapshot.lines.find((candidate) => candidate.lineKey === "1110");
  assert.ok(line);
  assert.equal(line.totalDebit, 1250);
  assert.equal(line.sourceDocumentCount, 1);

  createPostedJournal({
    ledger,
    companyId: COMPANY_ID,
    actorId: "user-1",
    journalDate: "2026-01-20",
    idempotencyKey: "phase3-3-unit-later",
    sourceId: "phase3-3-unit-later",
    lines: [
      { accountNumber: "1110", debitAmount: 350 },
      { accountNumber: "3010", creditAmount: 350 }
    ]
  });

  const historicalSnapshot = reporting.getReportSnapshot({
    companyId: COMPANY_ID,
    reportSnapshotId: snapshot.reportSnapshotId
  });
  const historicalLine = historicalSnapshot.lines.find((candidate) => candidate.lineKey === "1110");
  assert.equal(historicalLine.totalDebit, 1250);
  assert.equal(
    reporting.getReportLineDrilldown({
      companyId: COMPANY_ID,
      reportSnapshotId: snapshot.reportSnapshotId,
      lineKey: "1110"
    }).line.drilldownEntries[0].linkedDocuments[0].documentId,
    document.documentId
  );
});

test("Phase 3.3 supports journal search and reconciliation sign-off bound to snapshot evidence", () => {
  const clock = () => new Date("2026-03-21T22:30:00Z");
  const ledger = createLedgerEngine({ clock });
  const reporting = createReportingEngine({
    clock,
    ledgerPlatform: ledger
  });

  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "user-1"
  });

  const januaryPeriod = ledger
    .listAccountingPeriods({ companyId: COMPANY_ID })
    .find((period) => period.startsOn === "2026-01-01");

  createPostedJournal({
    ledger,
    companyId: COMPANY_ID,
    actorId: "user-1",
    journalDate: "2026-01-05",
    idempotencyKey: "phase3-3-unit-search",
    sourceId: "phase3-3-unit-search",
    lines: [
      { accountNumber: "1110", debitAmount: 900 },
      { accountNumber: "3010", creditAmount: 900 }
    ]
  });

  const search = reporting.searchJournalEntries({
    companyId: COMPANY_ID,
    query: "phase3-3-unit-search",
    accountNumber: "1110"
  });
  assert.equal(search.totalEntries, 1);
  assert.equal(search.items[0].sourceId, "phase3-3-unit-search");

  const reconciliation = reporting.createReconciliationRun({
    companyId: COMPANY_ID,
    accountingPeriodId: januaryPeriod.accountingPeriodId,
    areaCode: "bank",
    ledgerAccountNumbers: ["1110"],
    subledgerBalanceAmount: 900,
    actorId: "user-1",
    checklistSnapshotRef: "close-snapshot-phase3-3-unit"
  });
  assert.equal(reconciliation.reconciliationRun.status, "ready_for_signoff");

  const signoff = reporting.signOffReconciliationRun({
    companyId: COMPANY_ID,
    reconciliationRunId: reconciliation.reconciliationRun.reconciliationRunId,
    actorId: "user-1",
    signatoryRole: "close_signatory",
    evidenceRefs: ["close-snapshot-phase3-3-unit"]
  });
  assert.equal(signoff.reconciliationRun.status, "signed");
  assert.equal(signoff.signOff.evidenceSnapshotRef, reconciliation.reconciliationRun.snapshotHash);
});

function createPostedJournal({ ledger, companyId, actorId, journalDate, idempotencyKey, sourceId, lines }) {
  const created = ledger.createJournalEntry({
    companyId,
    journalDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId,
    idempotencyKey,
    lines
  });
  ledger.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
  return ledger.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
}
