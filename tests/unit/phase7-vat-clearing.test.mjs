import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";
import { createVatEngine } from "../../packages/domain-vat/src/index.mjs";

const COMPANY_ID = "phase7-vat-clearing-company";

function createVatClearingFixture() {
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

  let vat = null;
  const ledger = createLedgerEngine({
    clock,
    seedDemo: false,
    fiscalYearPlatform: fiscalYear,
    getVatPlatform: () => vat
  });
  vat = createVatEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger
  });

  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "tester"
  });
  vat.installVatCatalog({
    companyId: COMPANY_ID,
    actorId: "tester"
  });

  const saleDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "tester",
    transactionLine: buildTransactionLine({
      source_type: "AR_INVOICE",
      source_id: "phase7-vat-clearing-sale",
      supply_type: "sale",
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      line_amount_ex_vat: 1000,
      vat_rate: 25,
      tax_rate_candidate: 25
    })
  });
  const purchaseDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "tester",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase7-vat-clearing-purchase",
      supply_type: "purchase",
      vat_code_candidate: "VAT_SE_DOMESTIC_PURCHASE_25",
      line_amount_ex_vat: 400,
      vat_rate: 25,
      tax_rate_candidate: 25
    })
  });

  postJournal(ledger, {
    journalDate: "2026-03-10",
    sourceId: "phase7-vat-clearing-sale",
    idempotencyKey: "phase7-vat-clearing-sale",
    lines: [
      { accountNumber: "1210", debitAmount: 1250 },
      { accountNumber: "3010", creditAmount: 1000 },
      { accountNumber: "2610", creditAmount: 250 }
    ]
  });
  postJournal(ledger, {
    journalDate: "2026-03-18",
    sourceId: "phase7-vat-clearing-purchase",
    idempotencyKey: "phase7-vat-clearing-purchase",
    lines: [
      { accountNumber: "4010", debitAmount: 400 },
      { accountNumber: "2640", debitAmount: 100 },
      { accountNumber: "2410", creditAmount: 500 }
    ]
  });

  const declarationRun = vat.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "tester",
    signer: "finance-signer"
  });

  return {
    ledger,
    vat,
    fy2026,
    declarationRun,
    decisions: [saleDecision, purchaseDecision]
  };
}

function postJournal(ledger, { journalDate, sourceId, idempotencyKey, lines }) {
  const created = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "tester",
    idempotencyKey,
    description: sourceId,
    lines
  });
  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester"
  });
  ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
}

function buildTransactionLine(overrides = {}) {
  return {
    seller_country: "SE",
    seller_vat_registration_country: "SE",
    buyer_country: "SE",
    buyer_type: "business",
    buyer_vat_no: "SE556677889901",
    buyer_is_taxable_person: true,
    buyer_vat_number: "SE556677889901",
    buyer_vat_number_status: "valid",
    supply_type: "sale",
    goods_or_services: "goods",
    supply_subtype: "standard",
    property_related_flag: false,
    construction_service_flag: false,
    transport_end_country: "SE",
    import_flag: false,
    export_flag: false,
    reverse_charge_flag: false,
    oss_flag: false,
    ioss_flag: false,
    currency: "SEK",
    tax_date: "2026-03-10",
    invoice_date: "2026-03-10",
    delivery_date: "2026-03-10",
    prepayment_date: "2026-03-10",
    line_amount_ex_vat: 1000,
    line_discount: 0,
    line_quantity: 1,
    line_uom: "ea",
    vat_rate: 25,
    tax_rate_candidate: 25,
    vat_code_candidate: "VAT_SE_DOMESTIC_25",
    exemption_reason: "not_applicable",
    invoice_text_code: "domestic_standard",
    report_box_code: "05",
    source_type: "AR_INVOICE",
    source_id: "phase7-vat-default",
    ...overrides
  };
}

test("Phase 7.6 VAT clearing zeroes 2610-2640 balances against 2650 and supports reversal", () => {
  const { ledger, declarationRun } = createVatClearingFixture();

  const vatClearingRun = ledger.createVatClearingRun({
    companyId: COMPANY_ID,
    vatDeclarationRunId: declarationRun.vatDeclarationRunId,
    sourceCode: "vat_return_close",
    actorId: "tester",
    idempotencyKey: "phase7-vat-clearing"
  });
  const replay = ledger.createVatClearingRun({
    companyId: COMPANY_ID,
    vatDeclarationRunId: declarationRun.vatDeclarationRunId,
    sourceCode: "vat_return_close",
    actorId: "tester",
    idempotencyKey: "phase7-vat-clearing"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: vatClearingRun.journalEntryId
  });
  const reversed = ledger.reverseVatClearingRun({
    companyId: COMPANY_ID,
    vatClearingRunId: vatClearingRun.vatClearingRunId,
    reasonCode: "vat_return_restate",
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  assert.equal(vatClearingRun.vatClearingRunId, replay.vatClearingRunId);
  assert.equal(vatClearingRun.capturedBalances.length, 2);
  assert.equal(vatClearingRun.sourceNetBalanceAmount, -150);
  assert.equal(journal.lines.some((line) => line.accountNumber === "2610" && Number(line.debitAmount) === 250), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "2640" && Number(line.creditAmount) === 100), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "2650" && Number(line.creditAmount) === 150), true);
  assert.equal(reversed.status, "reversed");
  assert.equal(typeof reversed.reversalJournalEntryId, "string");
});

test("Phase 7.6 VAT clearing requires a real VAT declaration run", () => {
  const { ledger } = createVatClearingFixture();

  assert.throws(
    () =>
      ledger.createVatClearingRun({
        companyId: COMPANY_ID,
        vatDeclarationRunId: "missing-run",
        sourceCode: "vat_return_close",
        actorId: "tester",
        idempotencyKey: "phase7-vat-clearing-missing"
      }),
    (error) => error?.code === "vat_declaration_run_not_found"
  );
});
