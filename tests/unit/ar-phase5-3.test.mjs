import test from "node:test";
import assert from "node:assert/strict";
import { createArEngine } from "../../packages/domain-ar/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createIntegrationEngine } from "../../packages/domain-integrations/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { buildTestCompanyProfile } from "../helpers/company-profiles.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const AR_TEST_ENGINE_OPTIONS = {
  companyProfilesById: {
    [COMPANY_ID]: buildTestCompanyProfile(COMPANY_ID)
  }
};

test("Phase 5.3 creates open items, handles partial payments and captures deterministic aging", () => {
  const clock = () => new Date("2026-08-01T09:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "user-1" });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  const issued = ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });

  const openItem = ar.listOpenItems({ companyId: COMPANY_ID })[0];
  assert.equal(issued.status, "issued");
  assert.equal(openItem.openAmount, 1250);
  assert.equal(openItem.status, "open");

  const allocation = ar.createOpenItemAllocation({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId,
    allocationAmount: 500,
    receiptAmount: 500,
    allocatedOn: "2026-08-01",
    sourceChannel: "manual",
    bankTransactionUid: "bank-txn-1",
    reasonCode: "partial_payment",
    actorId: "user-1"
  });
  const updatedOpenItem = ar.getOpenItem({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId
  });
  const updatedInvoice = ar.getInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId
  });
  const aging = ar.captureAgingSnapshot({
    companyId: COMPANY_ID,
    cutoffDate: "2026-08-01",
    actorId: "user-1"
  });
  const paymentJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: allocation.journalEntryId
  });

  assert.equal(updatedOpenItem.status, "partially_settled");
  assert.equal(updatedOpenItem.paidAmount, 500);
  assert.equal(updatedOpenItem.openAmount, 750);
  assert.equal(updatedInvoice.status, "partially_paid");
  assert.equal(updatedInvoice.remainingAmount, 750);
  assert.equal(paymentJournal.sourceType, "AR_PAYMENT");
  assert.equal(paymentJournal.voucherSeriesCode, "D");
  assert.equal(aging.bucketTotalsJson["1_30"], 750);
  assert.equal(aging.customerTotalsJson[customer.customerId], 750);
});

test("Phase 5.3 bank matching keeps overpayments in unmatched receipts and marks the run for review", () => {
  const clock = () => new Date("2026-08-05T08:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "user-1" });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  const issued = ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });

  const run = ar.createPaymentMatchingRun({
    companyId: COMPANY_ID,
    sourceChannel: "bank_file",
    transactions: [
      {
        bankTransactionUid: "bank-file-100",
        payerReference: issued.paymentReference,
        amount: 1500,
        currencyCode: "SEK",
        valueDate: "2026-08-05"
      }
    ],
    actorId: "user-1"
  });
  const snapshot = ar.snapshotAr();

  assert.equal(run.status, "review_required");
  assert.equal(run.allocations.length, 1);
  assert.equal(snapshot.unmatchedBankReceipts.length, 1);
  assert.equal(snapshot.unmatchedBankReceipts[0].remainingAmount, 250);
  assert.equal(snapshot.unmatchedBankReceipts[0].status, "unmatched");
});

test("Phase 5.3 can reverse a mis-match and reopen the open item without losing the receipt trail", () => {
  const clock = () => new Date("2026-08-10T08:30:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "user-1" });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-07-01",
    dueDate: "2026-07-15",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });
  const openItem = ar.listOpenItems({ companyId: COMPANY_ID })[0];
  const allocation = ar.createOpenItemAllocation({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId,
    allocationAmount: 1250,
    receiptAmount: 1250,
    allocatedOn: "2026-07-20",
    sourceChannel: "manual",
    bankTransactionUid: "bank-txn-rollback",
    reasonCode: "wrong_customer_match",
    actorId: "user-1"
  });

  const reversed = ar.reverseOpenItemAllocation({
    companyId: COMPANY_ID,
    arAllocationId: allocation.arAllocationId,
    reasonCode: "wrong_customer_match",
    actorId: "user-1"
  });
  const reopenedOpenItem = ar.getOpenItem({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId
  });
  const snapshot = ar.snapshotAr();

  assert.equal(reversed.status, "reversed");
  assert.equal(reopenedOpenItem.openAmount, 1250);
  assert.equal(reopenedOpenItem.status, "open");
  assert.equal(snapshot.unmatchedBankReceipts.length, 1);
  assert.equal(snapshot.unmatchedBankReceipts[0].remainingAmount, 1250);
});

test("Phase 5.3 blocks dunning on held disputes and books deterministic reminder charges otherwise", () => {
  const clock = () => new Date("2026-08-12T07:45:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "user-1" });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-07-01",
    dueDate: "2026-07-15",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });
  const openItem = ar.listOpenItems({ companyId: COMPANY_ID })[0];

  const bookedRun = ar.createDunningRun({
    companyId: COMPANY_ID,
    runDate: "2026-08-12",
    stageCode: "stage_1",
    actorId: "user-1"
  });
  const afterDunning = ar.getOpenItem({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId
  });
  assert.equal(bookedRun.summary.items, 1);
  assert.equal(bookedRun.summary.feesGenerated, 1);
  assert.equal(bookedRun.items[0].feeAmount, 60);
  assert.equal(bookedRun.items[0].interestAmount, 9.59);
  assert.equal(afterDunning.collectionStageCode, "stage_1");
  assert.equal(afterDunning.openAmount, 1319.59);

  ar.updateOpenItemCollectionState({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId,
    disputeFlag: true,
    actorId: "user-1"
  });
  const skippedRun = ar.createDunningRun({
    companyId: COMPANY_ID,
    runDate: "2026-09-12",
    stageCode: "stage_2",
    actorId: "user-1"
  });
  assert.equal(skippedRun.summary.skipped, 1);
  assert.equal(skippedRun.items[0].skipReasonCode, "dunning_hold");
});

test("Phase 8.1 posts full-invoice bad debt VAT relief as split loss and VAT journal lines", () => {
  const clock = () => new Date("2026-09-01T08:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const vat = createVatPlatform({ clock, ledgerPlatform: ledger });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    vatPlatform: vat,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "user-1" });
  vat.installVatCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });
  const openItem = ar.listOpenItems({ companyId: COMPANY_ID })[0];

  const writeoff = ar.createWriteoff({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId,
    writeoffAmount: 1250,
    writeoffDate: "2026-09-01",
    reasonCode: "confirmed_customer_loss",
    applyBadDebtVatRelief: true,
    policyLimitAmount: 2000,
    approvedByActorId: "finance-approver-1",
    approvedByRoleCode: "finance_manager",
    actorId: "user-1"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: writeoff.journalEntryId
  });
  const vatDecision = vat.getVatDecision({
    companyId: COMPANY_ID,
    vatDecisionId: writeoff.badDebtVatDecisionIds[0]
  });
  const writtenOffOpenItem = ar.getOpenItem({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId
  });

  assert.equal(writeoff.badDebtVatReliefApplied, true);
  assert.equal(writeoff.badDebtVatReliefAmount, 250);
  assert.equal(writeoff.badDebtVatDecisionIds.length, 1);
  assert.equal(vatDecision.decisionCategory, "bad_debt_adjustment");
  assert.equal(sumJournalAmount(journal, "6900", "debit"), 1000);
  assert.equal(sumJournalAmount(journal, "2610", "debit"), 250);
  assert.equal(sumJournalAmount(journal, "1210", "credit"), 1250);
  assert.equal(writtenOffOpenItem.status, "written_off");
  assert.equal(writtenOffOpenItem.openAmount, 0);
  assert.equal(journal.metadataJson.postingApprovalApprovedByActorId, "finance-approver-1");
  assert.equal(journal.metadataJson.postingApprovalRoleCode, "finance_manager");
});

test("Phase 8.1 blocks automatic bad debt VAT relief after partial settlement", () => {
  const clock = () => new Date("2026-09-02T08:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const vat = createVatPlatform({ clock, ledgerPlatform: ledger });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    vatPlatform: vat,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "user-1" });
  vat.installVatCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });
  const openItem = ar.listOpenItems({ companyId: COMPANY_ID })[0];
  ar.createOpenItemAllocation({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId,
    allocationAmount: 500,
    receiptAmount: 500,
    allocatedOn: "2026-08-01",
    sourceChannel: "manual",
    bankTransactionUid: "bank-txn-bad-debt-block",
    reasonCode: "partial_payment",
    actorId: "user-1"
  });
  const partiallySettled = ar.getOpenItem({
    companyId: COMPANY_ID,
    arOpenItemId: openItem.arOpenItemId
  });

  assert.throws(
    () =>
      ar.createWriteoff({
        companyId: COMPANY_ID,
        arOpenItemId: partiallySettled.arOpenItemId,
        writeoffAmount: 750,
        writeoffDate: "2026-09-02",
        reasonCode: "confirmed_customer_loss",
        applyBadDebtVatRelief: true,
        policyLimitAmount: 2000,
        actorId: "user-1"
      }),
    (error) => error?.code === "bad_debt_vat_review_required"
  );
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

function sumJournalAmount(journal, accountNumber, side) {
  return journal.lines
    .filter((line) => line.accountNumber === accountNumber)
    .reduce((sum, line) => sum + Number(side === "debit" ? line.debitAmount || 0 : line.creditAmount || 0), 0);
}
