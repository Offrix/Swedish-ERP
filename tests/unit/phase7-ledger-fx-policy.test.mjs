import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createArEngine } from "../../packages/domain-ar/src/index.mjs";
import { createApEngine } from "../../packages/domain-ap/src/index.mjs";
import { createIntegrationEngine } from "../../packages/domain-integrations/src/index.mjs";
import { buildTestCompanyProfile } from "../helpers/company-profiles.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const AR_TEST_ENGINE_OPTIONS = {
  companyProfilesById: {
    [COMPANY_ID]: buildTestCompanyProfile(COMPANY_ID)
  }
};

test("Phase 7.4 books foreign-currency manual journals in accounting currency and preserves original currency metadata", () => {
  const ledger = createLedgerPlatform({
    clock: () => new Date("2026-10-01T08:00:00Z"),
    seedDemo: false
  });
  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "tester"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "tester"
  });

  const created = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-10-01",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "fx-manual-usd",
    actorId: "tester",
    idempotencyKey: "fx-manual-usd",
    description: "FX manual journal",
    currencyCode: "USD",
    lines: [
      { accountNumber: "1510", debitAmount: 100, currencyCode: "USD", exchangeRate: 10.5 },
      { accountNumber: "3010", creditAmount: 100, currencyCode: "USD", exchangeRate: 10.5 }
    ]
  });

  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester"
  });
  const posted = ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  assert.equal(posted.journalEntry.currencyCode, "SEK");
  assert.equal(posted.journalEntry.accountingCurrencyCode, "SEK");
  assert.equal(posted.journalEntry.originalCurrencyCode, "USD");
  assert.equal(sumDebits(posted.journalEntry, "1510"), 1050);
  assert.equal(sumCredits(posted.journalEntry, "3010"), 1050);
  assert.equal(posted.journalEntry.lines[0].originalCurrencyCode, "USD");
  assert.equal(posted.journalEntry.lines[0].originalDebitAmount, 100);
  assert.equal(posted.journalEntry.lines[0].debitAmount, 1050);
});

test("Phase 7.4 supports explicit EUR accounting profiles while preserving original currency", () => {
  const ledger = createLedgerPlatform({
    clock: () => new Date("2026-10-02T08:00:00Z"),
    seedDemo: false
  });
  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    accountingCurrencyCode: "EUR",
    actorId: "tester"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "tester"
  });

  const created = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-10-02",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "fx-manual-eur-profile",
    actorId: "tester",
    idempotencyKey: "fx-manual-eur-profile",
    description: "FX manual journal EUR profile",
    currencyCode: "USD",
    lines: [
      { accountNumber: "1510", debitAmount: 100, currencyCode: "USD", exchangeRate: 0.92 },
      { accountNumber: "3010", creditAmount: 100, currencyCode: "USD", exchangeRate: 0.92 }
    ]
  });

  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester"
  });
  const posted = ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  assert.equal(posted.journalEntry.currencyCode, "EUR");
  assert.equal(posted.journalEntry.accountingCurrencyCode, "EUR");
  assert.equal(posted.journalEntry.originalCurrencyCode, "USD");
  assert.equal(sumDebits(posted.journalEntry, "1510"), 92);
  assert.equal(sumCredits(posted.journalEntry, "3010"), 92);
});

test("Phase 7.4 realizes FX gains on AR settlement while keeping the open item in original currency", () => {
  const clock = () => new Date("2026-10-03T08:00:00Z");
  const ledger = createLedgerPlatform({ clock, seedDemo: false });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "tester" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "tester" });

  const customer = createCustomer(ar, { currencyCode: "EUR" });
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-10-03",
    dueDate: "2026-10-31",
    currencyCode: "EUR",
    exchangeRate: 11,
    currencyVatAmountSek: 2750,
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "tester"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "tester"
  });

  const openItem = ar.listOpenItems({ companyId: COMPANY_ID })[0];
  assert.equal(openItem.currencyCode, "EUR");
  assert.equal(openItem.functionalCurrencyCode, "SEK");
  assert.equal(openItem.functionalOpenAmount, 13750);

  const allocation = ar.createOpenItemAllocation({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId,
    allocationAmount: 1250,
    receiptAmount: 1250,
    currencyCode: "EUR",
    settlementExchangeRate: 11.2,
    allocatedOn: "2026-10-10",
    reasonCode: "customer_payment",
    actorId: "tester"
  });
  const settlementJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: allocation.journalEntryId
  });
  const settledOpenItem = ar.getOpenItem({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId
  });

  assert.equal(sumDebits(settlementJournal, "1110"), 14000);
  assert.equal(sumCredits(settlementJournal, "1210"), 13750);
  assert.equal(sumCredits(settlementJournal, "7940"), 250);
  assert.equal(allocation.realizedFxAmount, 250);
  assert.equal(settledOpenItem.openAmount, 0);
  assert.equal(settledOpenItem.functionalOpenAmount, 0);
});

test("Phase 7.4 realizes FX losses on AP settlement and posts revaluation batches as first-class ledger objects", () => {
  const clock = () => new Date("2026-10-04T08:00:00Z");
  const ledger = createLedgerPlatform({ clock, seedDemo: false });
  const ap = createApEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "tester" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "tester" });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    legalName: "EUR Supplier AB",
    countryCode: "SE",
    currencyCode: "EUR",
    paymentTermsCode: "NET30",
    paymentRecipient: "EUR Supplier AB",
    bankgiro: "5555-5555",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "tester"
  });
  const ingested = ap.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "EUR-AP-7401",
    invoiceDate: "2026-10-04",
    dueDate: "2026-10-31",
    sourceChannel: "api",
    currencyCode: "EUR",
    exchangeRate: 11,
    lines: [
      {
        description: "Foreign supplier services",
        quantity: 1,
        unitPrice: 1000,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "tester"
  });
  ap.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: ingested.supplierInvoiceId,
    actorId: "tester"
  });
  ap.approveSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: ingested.supplierInvoiceId,
    actorId: "tester"
  });
  const postedInvoice = ap.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: ingested.supplierInvoiceId,
    actorId: "tester"
  });
  const reserved = ap.reserveApOpenItem({
    companyId: COMPANY_ID,
    apOpenItemId: postedInvoice.apOpenItemId,
    paymentOrderId: "fx-ap-order",
    bankAccountNumber: "1110",
    actorId: "tester"
  });
  const settlement = ledger.applyPostingIntent({
    companyId: COMPANY_ID,
    journalDate: "2026-10-10",
    recipeCode: "AP_PAYMENT_SETTLEMENT",
    postingSignalCode: "bank.payment_order.settled",
    sourceType: "AP_PAYMENT",
    sourceId: "fx-ap-order:book",
    sourceObjectVersion: "phase7.4.ap.fx.loss",
    actorId: "tester",
    idempotencyKey: "phase7.4.ap.fx.loss",
    description: "FX AP settlement",
    lines: [
      {
        accountNumber: "2450",
        debitAmount: 1250,
        currencyCode: "EUR",
        exchangeRate: 11,
        functionalDebitAmount: 13750
      },
      {
        accountNumber: "1110",
        creditAmount: 1250,
        currencyCode: "EUR",
        exchangeRate: 11.2,
        functionalCreditAmount: 14000
      },
      {
        accountNumber: "7930",
        debitAmount: 250
      }
    ]
  });
  const settlementJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: settlement.journalEntry.journalEntryId
  });

  assert.equal(reserved.openItem.functionalReservedAmount, 13750);
  assert.equal(sumDebits(settlementJournal, "2450"), 13750);
  assert.equal(sumCredits(settlementJournal, "1110"), 14000);
  assert.equal(sumDebits(settlementJournal, "7930"), 250);

  const batch = ledger.createFxRevaluationBatch({
    companyId: COMPANY_ID,
    cutoffDate: "2026-10-31",
    scopeCode: "ar_open_items",
    description: "Month-end FX revaluation",
    items: [
      {
        itemId: "ar-open-item-1",
        itemType: "ar_open_item",
        accountNumber: "1510",
        balanceOrientation: "asset",
        originalCurrencyCode: "EUR",
        originalAmount: 1000,
        carryingFunctionalAmount: 11000,
        revaluedFunctionalAmount: 11500
      }
    ],
    actorId: "tester",
    idempotencyKey: "phase7-4-revaluation"
  });
  const approvedBatch = ledger.approveFxRevaluationBatch({
    companyId: COMPANY_ID,
    fxRevaluationBatchId: batch.fxRevaluationBatchId,
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const postedBatch = ledger.postFxRevaluationBatch({
    companyId: COMPANY_ID,
    fxRevaluationBatchId: batch.fxRevaluationBatchId,
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const revaluationJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: postedBatch.journalEntryId
  });
  const reversedBatch = ledger.reverseFxRevaluationBatch({
    companyId: COMPANY_ID,
    fxRevaluationBatchId: batch.fxRevaluationBatchId,
    actorId: "tester",
    reasonCode: "batch_test_reversal",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  assert.equal(approvedBatch.status, "approved");
  assert.equal(postedBatch.status, "posted");
  assert.equal(sumDebits(revaluationJournal, "1510"), 500);
  assert.equal(sumCredits(revaluationJournal, "7940"), 500);
  assert.equal(reversedBatch.status, "reversed");
  assert.equal(typeof reversedBatch.reversalJournalEntryId, "string");
});

function createCustomer(ar, overrides = {}) {
  return ar.createCustomer({
    companyId: COMPANY_ID,
    legalName: "Customer Example AB",
    organizationNumber: "5566778899",
    countryCode: "SE",
    languageCode: "SV",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    invoiceDeliveryMethod: "pdf_email",
    reminderProfileCode: "standard",
    billingAddress: {
      line1: "Testgatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    deliveryAddress: {
      line1: "Testgatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    ...overrides
  });
}

function createItem(ar) {
  return ar.createItem({
    companyId: COMPANY_ID,
    description: "Managed operations",
    itemType: "service",
    unitCode: "hour",
    standardPrice: 1000,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25",
    recurringFlag: true
  });
}

function sumDebits(journalEntry, accountNumber) {
  return Number(
    (journalEntry.lines || [])
      .filter((line) => line.accountNumber === accountNumber)
      .reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
      .toFixed(2)
  );
}

function sumCredits(journalEntry, accountNumber) {
  return Number(
    (journalEntry.lines || [])
      .filter((line) => line.accountNumber === accountNumber)
      .reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
      .toFixed(2)
  );
}
