import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";

function createFixture() {
  const platform = createApiPlatform({
    runtimeMode: "test",
    env: {},
    seedDemo: false,
    criticalDomainStateStoreKind: "memory",
    clock: () => new Date("2026-03-31T10:00:00Z")
  });
  return { platform };
}

function createAccountingCompany(platform, { legalName, orgNumber, startDate = "2026-01-01", endDate = "2026-12-31" }) {
  const company = platform.createCompany({ legalName, orgNumber });
  const methodAssessment = platform.assessCashMethodEligibility({
    companyId: company.companyId,
    annualNetTurnoverSek: 0,
    legalFormCode: "AKTIEBOLAG",
    actorId: "phase7-sie"
  });
  const methodProfile = platform.createMethodProfile({
    companyId: company.companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: startDate,
    fiscalYearStartDate: startDate,
    eligibilityAssessmentId: methodAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "phase7-sie"
  });
  platform.activateMethodProfile({
    companyId: company.companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: "phase7-sie"
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId: company.companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "phase7-sie"
  });
  const fiscalYear = platform.createFiscalYear({
    companyId: company.companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate,
    endDate,
    approvalBasisCode: "BASELINE",
    actorId: "phase7-sie"
  });
  platform.activateFiscalYear({
    companyId: company.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "phase7-sie"
  });
  platform.installLedgerCatalog({
    companyId: company.companyId,
    actorId: "phase7-sie"
  });
  platform.ensureAccountingYearPeriod({
    companyId: company.companyId,
    fiscalYear: Number(startDate.slice(0, 4)),
    actorId: "phase7-sie"
  });
  ensureSieAccounts(platform, company.companyId);
  return { company, fiscalYear };
}

function ensureSieAccounts(platform, companyId) {
  for (const account of [
    ["1930", "Företagskonto", "1"],
    ["2081", "Aktiekapital", "2"],
    ["1510", "Kundfordringar", "1"],
    ["3010", "Försäljning varor", "3"]
  ]) {
    platform.upsertLedgerAccount({
      companyId,
      accountNumber: account[0],
      accountName: account[1],
      accountClass: account[2],
      locked: false,
      allowManualPosting: false,
      actorId: "phase7-sie"
    });
  }
}

function createPostedHistoricalJournal(platform, companyId, voucherSeriesCode = "A", importedVoucherNumber = 11) {
  if (voucherSeriesCode !== "A") {
    platform.upsertVoucherSeries({
      companyId,
      seriesCode: voucherSeriesCode,
      description: `Phase 7 SIE ${voucherSeriesCode}`,
      actorId: "phase7-sie"
    });
  }
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-03-15",
    voucherSeriesCode,
    sourceType: "HISTORICAL_IMPORT",
    sourceId: `phase7-sie:${voucherSeriesCode}:${importedVoucherNumber}`,
    description: "Exporterad kundfaktura",
    actorId: "phase7-sie",
    idempotencyKey: `phase7-sie:${voucherSeriesCode}:${importedVoucherNumber}`,
    importedFlag: true,
    lines: [
      {
        accountNumber: "1510",
        debitAmount: 1250,
        sourceType: "HISTORICAL_IMPORT",
        sourceId: "phase7-sie:line:1"
      },
      {
        accountNumber: "3010",
        creditAmount: 1250,
        sourceType: "HISTORICAL_IMPORT",
        sourceId: "phase7-sie:line:2"
      }
    ]
  });
  const validated = platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase7-sie"
  });
  return platform.postJournalEntry({
    companyId,
    journalEntryId: validated.journalEntry.journalEntryId,
    actorId: "phase7-sie",
    importedVoucherNumber
  }).journalEntry;
}

test("Phase 7.6 SIE4 export includes headers, opening balances and posted vouchers", () => {
  const { platform } = createFixture();
  const { company, fiscalYear } = createAccountingCompany(platform, {
    legalName: "SIE Export AB",
    orgNumber: "559900-4412"
  });

  platform.createOpeningBalanceBatch({
    companyId: company.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    openingDate: "2026-01-01",
    sourceCode: "CUTOVER",
    actorId: "phase7-sie",
    idempotencyKey: "phase7-sie-opening",
    lines: [
      {
        accountNumber: "1930",
        debitAmount: 50000,
        sourceType: "HISTORICAL_IMPORT",
        sourceId: "phase7-opening-1"
      },
      {
        accountNumber: "2081",
        creditAmount: 50000,
        sourceType: "HISTORICAL_IMPORT",
        sourceId: "phase7-opening-2"
      }
    ]
  });
  createPostedHistoricalJournal(platform, company.companyId, "A", 11);

  const exported = platform.exportSie4({
    companyId: company.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "phase7-sie",
    idempotencyKey: "phase7-sie-export"
  });

  assert.equal(exported.formatCode, "SIE4");
  assert.match(exported.content, /#SIETYP 4/);
  assert.match(exported.content, /#FNAMN "SIE Export AB"/);
  assert.match(exported.content, /#ORGNR 5599004412/);
  assert.match(exported.content, /#RAR 0 20260101 20261231/);
  assert.match(exported.content, /#IB 0 1930 50000\.00/);
  assert.match(exported.content, /#IB 0 2081 -50000\.00/);
  assert.match(exported.content, /#VER A 11 20260315 "Exporterad kundfaktura"/);
  assert.match(exported.content, /#TRANS 1510 \{\} 1250\.00 20260315 "Exporterad kundfaktura"/);
  assert.equal(platform.getSieExportJob({ companyId: company.companyId, sieExportJobId: exported.sieExportJobId }).checksum, exported.checksum);
});

test("Phase 7.6 SIE4 import opening-balance mode creates a real opening balance batch", () => {
  const { platform } = createFixture();
  const { company, fiscalYear } = createAccountingCompany(platform, {
    legalName: "SIE Import AB",
    orgNumber: "559900-5518"
  });

  const imported = platform.importSie4({
    companyId: company.companyId,
    modeCode: "opening_balance_batch",
    fiscalYearId: fiscalYear.fiscalYearId,
    content: [
      "#FLAGGA 0",
      "#PROGRAM \"Fixture\" \"1.0\"",
      "#FORMAT PC8",
      "#SIETYP 4",
      "#FNAMN \"SIE Import AB\"",
      "#ORGNR 559900-5511",
      "#RAR 0 20260101 20261231",
      "#KONTO 1930 \"Företagskonto\"",
      "#KONTO 2081 \"Aktiekapital\"",
      "#IB 0 1930 25000.00",
      "#IB 0 2081 -25000.00"
    ].join("\r\n"),
    actorId: "phase7-sie",
    idempotencyKey: "phase7-sie-import-opening"
  });

  const batch = platform.getOpeningBalanceBatch({
    companyId: company.companyId,
    openingBalanceBatchId: imported.openingBalanceBatchId
  });

  assert.equal(imported.modeCode, "opening_balance_batch");
  assert.equal(batch.fiscalYearId, fiscalYear.fiscalYearId);
  assert.equal(batch.lines.some((line) => line.accountNumber === "1930" && Number(line.debitAmount) === 25000), true);
  assert.equal(batch.lines.some((line) => line.accountNumber === "2081" && Number(line.creditAmount) === 25000), true);
});

test("Phase 7.6 SIE4 journal-history import preserves voucher series and voucher numbers on roundtrip", () => {
  const { platform } = createFixture();
  const source = createAccountingCompany(platform, {
    legalName: "SIE Källa AB",
    orgNumber: "559900-6615"
  });
  const target = createAccountingCompany(platform, {
    legalName: "SIE Mål AB",
    orgNumber: "559901-0039"
  });

  createPostedHistoricalJournal(platform, source.company.companyId, "ZI", 47);
  const exported = platform.exportSie4({
    companyId: source.company.companyId,
    fiscalYearId: source.fiscalYear.fiscalYearId,
    actorId: "phase7-sie",
    idempotencyKey: "phase7-sie-roundtrip-export"
  });

  const imported = platform.importSie4({
    companyId: target.company.companyId,
    modeCode: "journal_history",
    content: exported.content,
    actorId: "phase7-sie",
    idempotencyKey: "phase7-sie-roundtrip-import"
  });

  assert.equal(imported.importedJournalEntryIds.length, 1);
  const journalEntry = platform.getJournalEntry({
    companyId: target.company.companyId,
    journalEntryId: imported.importedJournalEntryIds[0]
  });

  assert.equal(journalEntry.importedFlag, true);
  assert.equal(journalEntry.voucherSeriesCode, "ZI");
  assert.equal(journalEntry.voucherNumber, 47);
  assert.equal(journalEntry.lines.some((line) => line.accountNumber === "1510" && Number(line.debitAmount) === 1250), true);
  assert.equal(journalEntry.lines.some((line) => line.accountNumber === "3010" && Number(line.creditAmount) === 1250), true);
});
