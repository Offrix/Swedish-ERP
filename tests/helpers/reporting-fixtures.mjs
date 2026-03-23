export function seedReportSnapshot(platform, companyId, sourceId = "fixture") {
  platform.installLedgerCatalog({ companyId, actorId: sourceId });
  platform.ensureAccountingYearPeriod({ companyId, fiscalYear: 2026, actorId: sourceId });
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-03-10",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: `${sourceId}-journal`,
    actorId: sourceId,
    idempotencyKey: `${sourceId}-journal`,
    lines: [
      { accountNumber: "1510", debitAmount: 2500 },
      { accountNumber: "3010", creditAmount: 2500 }
    ]
  });
  platform.validateJournalEntry({ companyId, journalEntryId: created.journalEntry.journalEntryId, actorId: sourceId });
  platform.postJournalEntry({ companyId, journalEntryId: created.journalEntry.journalEntryId, actorId: sourceId });
  return platform.runReportSnapshot({
    companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-03-31",
    actorId: sourceId
  });
}
