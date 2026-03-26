import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatEngine } from "../../packages/domain-vat/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 4.3 classifies B2C threshold-below, OSS and IOSS while keeping special schemes outside the regular VAT return", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-22T00:01:00Z")
  });

  const thresholdBelow = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-3-unit-threshold-below",
      buyer_country: "FI",
      buyer_type: "consumer",
      buyer_vat_no: "NOT-REGISTERED",
      buyer_is_taxable_person: false,
      buyer_vat_number: "NOT-REGISTERED",
      buyer_vat_number_status: "not_applicable",
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      oss_flag: false,
      ioss_flag: false
    })
  });
  assert.equal(thresholdBelow.vatDecision.rulePackId, "vat-se-2026.3");
  assert.equal(thresholdBelow.vatDecision.decisionCategory, "eu_b2c_threshold_below");
  assert.equal(thresholdBelow.vatDecision.outputs.reportingChannel, "regular_vat_return");
  assert.deepEqual(thresholdBelow.vatDecision.declarationBoxAmounts, [
    { boxCode: "05", amount: 1000, amountType: "taxable_base" },
    { boxCode: "10", amount: 250, amountType: "output_vat" }
  ]);

  const ossDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-3-unit-oss",
      buyer_country: "FR",
      buyer_type: "consumer",
      buyer_vat_no: "NOT-REGISTERED",
      buyer_is_taxable_person: false,
      buyer_vat_number: "NOT-REGISTERED",
      buyer_vat_number_status: "not_applicable",
      currency: "EUR",
      ecb_exchange_rate_to_eur: 1,
      line_amount_ex_vat: 200,
      vat_code_candidate: "VAT_SE_EU_B2C_OSS",
      oss_flag: true
    })
  });
  assert.equal(ossDecision.vatDecision.outputs.reportingChannel, "oss");
  assert.deepEqual(ossDecision.vatDecision.outputs.ossRecord, {
    scheme: "oss",
    identifierState: "SE",
    orderType: "union",
    buyerCountry: "FR",
    vatRate: 25,
    euroBaseAmount: 200,
    euroVatAmount: 50,
    originalCurrency: "EUR",
    exchangeRateToEur: 1,
    consignmentValueEur: null
  });

  const iossDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
        source_id: "phase4-3-unit-ioss",
        seller_country: "SE",
        seller_vat_registration_country: "SE",
        buyer_country: "DE",
      buyer_type: "consumer",
      buyer_vat_no: "NOT-REGISTERED",
      buyer_is_taxable_person: false,
      buyer_vat_number: "NOT-REGISTERED",
      buyer_vat_number_status: "not_applicable",
      currency: "SEK",
      ecb_exchange_rate_to_eur: 0.1,
      consignment_value_eur: 120,
      line_amount_ex_vat: 1000,
      goods_or_services: "goods",
      import_flag: false,
      export_flag: false,
      vat_code_candidate: "VAT_SE_EU_B2C_IOSS",
      ioss_flag: true
    })
  });
  assert.equal(iossDecision.vatDecision.outputs.reportingChannel, "ioss");
  assert.equal(iossDecision.vatDecision.outputs.iossRecord.consignmentValueEur, 120);
  assert.equal(iossDecision.vatDecision.outputs.iossRecord.euroBaseAmount, 100);
  assert.equal(iossDecision.vatDecision.outputs.iossRecord.euroVatAmount, 25);

  const declarationRun = vat.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "user-1",
    signer: "vat-signer"
  });
  assert.deepEqual(declarationRun.declarationBoxSummary, [
    { boxCode: "05", amount: 1000, amountType: "taxable_base" },
    { boxCode: "10", amount: 250, amountType: "output_vat" }
  ]);
  assert.deepEqual(declarationRun.ossSummary, [
    {
      scheme: "oss",
      identifierState: "SE",
      orderType: "union",
      buyerCountry: "FR",
      vatRate: 25,
      euroBaseAmount: 200,
      euroVatAmount: 50,
      originalCurrencies: ["EUR"],
      exchangeRatesToEur: [1]
    }
  ]);
  assert.deepEqual(declarationRun.iossSummary, [
    {
      scheme: "ioss",
      identifierState: "SE",
      orderType: "import",
      buyerCountry: "DE",
      vatRate: 25,
      euroBaseAmount: 100,
      euroVatAmount: 25,
      originalCurrencies: ["SEK"],
      exchangeRatesToEur: [0.1]
    }
  ]);
});

test("Phase 4.3 builds reproducible periodic statements and separates goods from services", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-22T00:02:00Z")
  });

  vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-3-unit-eu-goods-1",
      buyer_country: "DE",
      buyer_type: "business",
      buyer_vat_no: "DE123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number: "DE123456789",
      buyer_vat_number_status: "valid",
      goods_or_services: "goods",
      vat_code_candidate: "VAT_SE_EU_GOODS_B2B",
      line_amount_ex_vat: 700
    })
  });
  vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-3-unit-eu-goods-2",
      buyer_country: "DE",
      buyer_type: "business",
      buyer_vat_no: "DE123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number: "DE123456789",
      buyer_vat_number_status: "valid",
      goods_or_services: "goods",
      vat_code_candidate: "VAT_SE_EU_GOODS_B2B",
      line_amount_ex_vat: 300
    })
  });
  vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-3-unit-eu-service-1",
      buyer_country: "DE",
      buyer_type: "business",
      buyer_vat_no: "DE123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number: "DE123456789",
      buyer_vat_number_status: "valid",
      goods_or_services: "services",
      vat_code_candidate: "VAT_SE_EU_SERVICES_B2B",
      line_amount_ex_vat: 450
    })
  });

  const firstRun = vat.createVatPeriodicStatementRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "user-1"
  });
  const secondRun = vat.createVatPeriodicStatementRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    previousSubmissionId: firstRun.vatPeriodicStatementRunId,
    correctionReason: "re-run",
    actorId: "user-1"
  });

  assert.equal(firstRun.lineCount, 2);
  assert.deepEqual(firstRun.lines, [
    {
      customerCountry: "DE",
      customerVatNumber: "DE123456789",
      buyerVatNumberStatus: "valid",
      goodsOrServices: "goods",
      taxableAmount: 1000,
      decisionIds: [
        firstRun.lines[0].decisionIds[0],
        firstRun.lines[0].decisionIds[1]
      ].sort()
    },
    {
      customerCountry: "DE",
      customerVatNumber: "DE123456789",
      buyerVatNumberStatus: "valid",
      goodsOrServices: "services",
      taxableAmount: 450,
      decisionIds: [firstRun.lines[1].decisionIds[0]]
    }
  ]);
  assert.deepEqual(secondRun.lines, firstRun.lines);
  assert.equal(secondRun.sourceSnapshotHash, firstRun.sourceSnapshotHash);
  assert.equal(secondRun.previousSubmissionId, firstRun.vatPeriodicStatementRunId);
});

test("Phase 4.3 declaration corrections diff changed boxes and can reconcile against ledger evidence", () => {
  const ledger = createLedgerPlatform({
    clock: () => new Date("2026-03-22T00:03:00Z")
  });
  const vat = createVatEngine({
    clock: () => new Date("2026-03-22T00:03:00Z"),
    ledgerPlatform: ledger
  });

  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    chartTemplateId: "DSAM-2026",
    actorId: "user-1"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "user-1"
  });
  const entry = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-21",
    voucherSeriesCode: "B",
    sourceType: "AR_INVOICE",
    sourceId: "phase4-3-unit-domestic-ledger",
    idempotencyKey: "phase4-3-unit-domestic-ledger",
    actorId: "user-1",
    lines: [
      { accountNumber: "1210", debitAmount: 1250 },
      { accountNumber: "3010", creditAmount: 1000 },
      { accountNumber: "2610", creditAmount: 250 }
    ]
  });
  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: entry.journalEntry.journalEntryId,
    actorId: "user-1"
  });
  ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: entry.journalEntry.journalEntryId,
    actorId: "user-1"
  });

  vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-3-unit-domestic-ledger",
      line_amount_ex_vat: 1000,
      vat_code_candidate: "VAT_SE_DOMESTIC_25"
    })
  });

  const firstRun = vat.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "user-1",
    signer: "signer-a"
  });
  assert.equal(firstRun.ledgerComparison.matched, true);

  vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-3-unit-domestic-ledger-2",
      line_amount_ex_vat: 500,
      vat_code_candidate: "VAT_SE_DOMESTIC_25"
    })
  });

  const correctionRun = vat.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    previousSubmissionId: firstRun.vatDeclarationRunId,
    correctionReason: "late_invoice",
    actorId: "user-1",
    signer: "signer-b"
  });
  assert.deepEqual(correctionRun.changedBoxes, ["05", "10"]);
  assert.deepEqual(correctionRun.changedAmounts, [
    { boxCode: "05", amountType: "taxable_base", previousAmount: 1000, currentAmount: 1500 },
    { boxCode: "10", amountType: "output_vat", previousAmount: 250, currentAmount: 375 }
  ]);
  assert.equal(correctionRun.previousSubmissionId, firstRun.vatDeclarationRunId);
  assert.equal(correctionRun.correctionReason, "late_invoice");
});

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
    tax_date: "2026-03-21",
    invoice_date: "2026-03-21",
    delivery_date: "2026-03-21",
    prepayment_date: "2026-03-21",
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
    project_id: PROJECT_ID,
    source_type: "AR_INVOICE",
    source_id: "phase4-3-unit-default",
    ...overrides
  };
}
