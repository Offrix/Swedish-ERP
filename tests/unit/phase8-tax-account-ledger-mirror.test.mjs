import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createTaxAccountEngine } from "../../packages/domain-tax-account/src/index.mjs";

function createTaxMirrorFixture(clock) {
  const ledger = createLedgerEngine({
    clock,
    seedDemo: false
  });
  const taxAccount = createTaxAccountEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger
  });
  return { ledger, taxAccount };
}

function installFinanceTruth(ledger, companyId, actorId = "phase8-tax-account") {
  ledger.installLedgerCatalog({
    companyId,
    actorId
  });
  ledger.ensureAccountingYearPeriod({
    companyId,
    fiscalYear: 2026,
    actorId
  });
}

test("Phase 8.5 tax-account assessment mirror posts mapped authority events into ledger", () => {
  const companyId = "phase8_tax_account_ledger_assessment";
  const clock = () => new Date("2026-03-31T08:00:00Z");
  const { ledger, taxAccount } = createTaxMirrorFixture(clock);
  installFinanceTruth(ledger, companyId);

  taxAccount.registerExpectedTaxLiability({
    companyId,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_run_phase85_2026_02",
    sourceReference: "VAT-PHASE85-2026-02",
    periodKey: "2026-02",
    dueDate: "2026-03-12",
    amount: 9300,
    actorId: "phase8-tax-account"
  });

  const imported = taxAccount.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2026-03-31",
    events: [
      {
        eventTypeCode: "VAT_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 9300,
        externalReference: "SKV-VAT-PHASE85-MIRROR",
        sourceObjectType: "vat_declaration_run",
        sourceObjectId: "vat_run_phase85_2026_02",
        periodKey: "2026-02"
      }
    ],
    actorId: "phase8-tax-account"
  });

  taxAccount.createTaxAccountReconciliation({
    companyId,
    actorId: "phase8-tax-account"
  });

  const event = taxAccount.getTaxAccountEvent({
    companyId,
    taxAccountEventId: imported.items[0].taxAccountEventId
  });
  assert.ok(event.journalEntryId);
  assert.equal(event.mappingStatus, "reconciled");
  assert.equal(event.ledgerPostingStatus, "posted");

  const journal = ledger.getJournalEntry({
    companyId,
    journalEntryId: event.journalEntryId
  });
  assert.equal(journal.metadataJson.postingRecipeCode, "TAX_ACCOUNT_CLASSIFIED_EVENT");
  assert.equal(journal.metadataJson.counterLedgerAccountNumber, "2650");
  assert.equal(journal.lines.some((line) => line.accountNumber === "2650" && line.debitAmount === 9300), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "1630" && line.creditAmount === 9300), true);
});

test("Phase 8.5 refund offsets and manual adjustments produce tax-account mirror journals", () => {
  const companyId = "phase8_tax_account_ledger_refund";
  const clock = () => new Date("2026-03-31T09:00:00Z");
  const { ledger, taxAccount } = createTaxMirrorFixture(clock);
  installFinanceTruth(ledger, companyId);

  const agiLiability = taxAccount.registerExpectedTaxLiability({
    companyId,
    liabilityTypeCode: "AGI",
    sourceDomainCode: "PAYROLL",
    sourceObjectType: "agi_run",
    sourceObjectId: "agi_run_phase85_2026_02",
    sourceReference: "AGI-PHASE85-2026-02",
    periodKey: "2026-02",
    dueDate: "2026-03-12",
    amount: 12000,
    actorId: "phase8-tax-account"
  });
  const vatLiability = taxAccount.registerExpectedTaxLiability({
    companyId,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_run_phase85_refund_2026_02",
    sourceReference: "VAT-PHASE85-REFUND-2026-02",
    periodKey: "2026-02",
    dueDate: "2026-03-12",
    amount: 15000,
    actorId: "phase8-tax-account"
  });

  const imported = taxAccount.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2026-03-31",
    events: [
      {
        eventTypeCode: "AGI_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 12000,
        externalReference: "SKV-AGI-PHASE85",
        sourceObjectType: "agi_run",
        sourceObjectId: "agi_run_phase85_2026_02",
        periodKey: "2026-02"
      },
      {
        eventTypeCode: "VAT_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 15000,
        externalReference: "SKV-VAT-PHASE85",
        sourceObjectType: "vat_declaration_run",
        sourceObjectId: "vat_run_phase85_refund_2026_02",
        periodKey: "2026-02"
      },
      {
        eventTypeCode: "REFUND",
        eventDate: "2026-03-31",
        postingDate: "2026-03-31",
        amount: 20000,
        externalReference: "SKV-REFUND-PHASE85"
      }
    ],
    actorId: "phase8-tax-account"
  });

  const reconciliation = taxAccount.createTaxAccountReconciliation({
    companyId,
    actorId: "phase8-tax-account"
  });
  const refundEvent = imported.items.find((item) => item.eventTypeCode === "REFUND");
  const refundSuggestions = reconciliation.suggestedOffsets
    .filter((item) => item.taxAccountEventId === refundEvent.taxAccountEventId)
    .sort((left, right) => left.priority - right.priority);
  assert.equal(refundSuggestions.length, 2);
  assert.equal(refundSuggestions[0].reconciliationItemId, agiLiability.reconciliationItemId);
  assert.equal(refundSuggestions[0].priority, 1);
  assert.equal(refundSuggestions[1].reconciliationItemId, vatLiability.reconciliationItemId);
  assert.equal(refundSuggestions[1].priority, 2);

  const approvedRefundOffset = taxAccount.approveTaxAccountOffset({
    companyId,
    taxAccountEventId: refundSuggestions[0].taxAccountEventId,
    reconciliationItemId: refundSuggestions[0].reconciliationItemId,
    offsetAmount: refundSuggestions[0].offsetAmount,
    offsetReasonCode: refundSuggestions[0].offsetReasonCode,
    reconciliationRunId: reconciliation.reconciliationRunId,
    actorId: "phase8-tax-account"
  });
  assert.ok(approvedRefundOffset.journalEntryId);

  const refundJournal = ledger.getJournalEntry({
    companyId,
    journalEntryId: approvedRefundOffset.journalEntryId
  });
  assert.equal(refundJournal.lines.some((line) => line.accountNumber === "1630" && line.debitAmount === 12000), true);
  assert.equal(refundJournal.lines.some((line) => line.accountNumber === "2710" && line.creditAmount === 12000), true);

  const manualAdjustmentImport = taxAccount.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2026-03-31",
    events: [
      {
        eventTypeCode: "MANUAL_ADJUSTMENT",
        effectDirection: "debit",
        eventDate: "2026-03-31",
        postingDate: "2026-03-31",
        amount: 400,
        externalReference: "SKV-MANUAL-PHASE85"
      }
    ],
    actorId: "phase8-tax-account"
  });
  const manualRun = taxAccount.createTaxAccountReconciliation({
    companyId,
    actorId: "phase8-tax-account"
  });
  assert.equal(manualRun.discrepancyCaseIds.length >= 1, true);

  const manualAdjustment = taxAccount.classifyTaxAccountEvent({
    companyId,
    taxAccountEventId: manualAdjustmentImport.items[0].taxAccountEventId,
    liabilityTypeCode: "F_TAX",
    ledgerCounterAccountNumber: "2510",
    differenceCaseId: manualRun.discrepancyCaseIds[0],
    resolutionNote: "Manual tax-office adjustment mapped to income-tax liability.",
    actorId: "phase8-tax-account"
  });
  assert.ok(manualAdjustment.event.journalEntryId);
  assert.equal(manualAdjustment.event.reconciliationStatus, "closed");

  const manualJournal = ledger.getJournalEntry({
    companyId,
    journalEntryId: manualAdjustment.event.journalEntryId
  });
  assert.equal(manualJournal.lines.some((line) => line.accountNumber === "2510" && line.debitAmount === 400), true);
  assert.equal(manualJournal.lines.some((line) => line.accountNumber === "1630" && line.creditAmount === 400), true);
});
