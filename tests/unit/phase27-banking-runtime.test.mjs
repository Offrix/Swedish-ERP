import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 27 banking runtime gates statement-driven payment and tax-account effects behind explicit approval", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-10-10T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });

  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Runtime Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "Runtime Supplier AB",
    bankgiro: "7777-1212",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "admin"
  });
  const invoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "STEP27-INV-1",
    invoiceDate: "2026-10-10",
    dueDate: "2026-11-09",
    sourceChannel: "api",
    lines: [
      {
        description: "Runtime spend",
        quantity: 1,
        unitPrice: 1000,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "admin"
  });
  const matched = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "admin"
  });
  if (matched.invoice.status !== "approved") {
    platform.approveSupplierInvoice({
      companyId: COMPANY_ID,
      supplierInvoiceId: invoice.supplierInvoiceId,
      actorId: "admin"
    });
  }
  const posted = platform.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "admin"
  });

  const bankAccount = platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "SEB",
    ledgerAccountNumber: "1110",
    accountNumber: "5566778899",
    currencyCode: "SEK",
    actorId: "admin"
  });
  const proposal = platform.createPaymentProposal({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    apOpenItemIds: [posted.apOpenItemId],
    paymentDate: "2026-11-09",
    actorId: "admin"
  });
  platform.approvePaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  platform.exportPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  platform.submitPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  const accepted = platform.acceptPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  const paymentOrderId = accepted.orders[0].paymentOrderId;

  const bookedImport = platform.importBankStatementEvents({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    statementDate: "2026-11-10",
    events: [
      {
        externalReference: "BANK-STMT-2701-BOOK",
        bookingDate: "2026-11-10",
        amount: -1250,
        counterpartyName: "Runtime Supplier AB",
        referenceText: "STEP27-INV-1",
        linkedPaymentOrderId: paymentOrderId,
        paymentOrderAction: "booked"
      }
    ],
    actorId: "admin"
  });
  assert.equal(bookedImport.importedCount, 1);
  assert.equal(bookedImport.items[0].matchStatus, "matched_payment_order");
  assert.equal(bookedImport.items[0].processingStatus, "reconciliation_required");
  assert.equal(platform.getPaymentProposal({ companyId: COMPANY_ID, paymentProposalId: proposal.paymentProposalId }).status, "accepted_by_bank");
  let openCases = platform.listBankReconciliationCases({
    companyId: COMPANY_ID,
    status: "open"
  });
  assert.equal(openCases.length, 1);
  assert.equal(openCases[0].caseTypeCode, "payment_order_posting_gate");
  const approvedPaymentGate = platform.resolveBankReconciliationCase({
    companyId: COMPANY_ID,
    reconciliationCaseId: openCases[0].reconciliationCaseId,
    resolutionCode: "approve_payment_order_statement",
    resolutionNote: "Confirmed payment order settlement from bank statement.",
    actorId: "admin"
  });
  assert.equal(approvedPaymentGate.executedActionCode, "approve_payment_order_statement");
  assert.equal(platform.getPaymentProposal({ companyId: COMPANY_ID, paymentProposalId: proposal.paymentProposalId }).status, "settled");

  const replayImport = platform.importBankStatementEvents({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    statementDate: "2026-11-10",
    events: [
      {
        externalReference: "BANK-STMT-2701-BOOK",
        bookingDate: "2026-11-10",
        amount: -1250,
        linkedPaymentOrderId: paymentOrderId,
        paymentOrderAction: "booked"
      }
    ],
    actorId: "admin"
  });
  assert.equal(replayImport.duplicateCount, 1);

  const taxImport = platform.importBankStatementEvents({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    statementDate: "2026-11-11",
    events: [
      {
        externalReference: "BANK-STMT-2701-TAX",
        bookingDate: "2026-11-11",
        amount: -12500,
        counterpartyName: "Skatteverket",
        referenceText: "Tax account payment",
        statementCategoryCode: "tax_account"
      }
    ],
    actorId: "admin"
  });
  assert.equal(taxImport.items[0].matchStatus, "matched_tax_account");
  assert.equal(taxImport.items[0].processingStatus, "reconciliation_required");
  assert.equal(
    platform.listTaxAccountEvents({ companyId: COMPANY_ID }).some((event) => event.externalReference === "BANK-STMT-2701-TAX"),
    false
  );
  openCases = platform.listBankReconciliationCases({
    companyId: COMPANY_ID,
    status: "open"
  });
  assert.equal(openCases.length, 1);
  assert.equal(openCases[0].caseTypeCode, "tax_account_posting_gate");
  const approvedTaxGate = platform.resolveBankReconciliationCase({
    companyId: COMPANY_ID,
    reconciliationCaseId: openCases[0].reconciliationCaseId,
    resolutionCode: "approve_tax_account_statement_bridge",
    resolutionNote: "Approved tax-account import from bank statement.",
    actorId: "admin"
  });
  assert.equal(approvedTaxGate.executedActionCode, "approve_tax_account_statement_bridge");
  assert.equal(
    platform.listTaxAccountEvents({ companyId: COMPANY_ID }).some((event) => event.externalReference === "BANK-STMT-2701-TAX"),
    true
  );

  const unmatchedImport = platform.importBankStatementEvents({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    statementDate: "2026-11-12",
    events: [
      {
        externalReference: "BANK-STMT-2701-UNMATCHED",
        bookingDate: "2026-11-12",
        amount: 400,
        counterpartyName: "Unknown Counterparty",
        referenceText: "Unknown"
      }
    ],
    actorId: "admin"
  });
  assert.equal(unmatchedImport.items[0].processingStatus, "reconciliation_required");

  openCases = platform.listBankReconciliationCases({
    companyId: COMPANY_ID,
    status: "open"
  });
  assert.equal(openCases.length, 1);
  assert.equal(openCases[0].caseTypeCode, "unmatched_statement_event");
  const resolved = platform.resolveBankReconciliationCase({
    companyId: COMPANY_ID,
    reconciliationCaseId: openCases[0].reconciliationCaseId,
    resolutionCode: "written_off",
    resolutionNote: "Confirmed bank fee outside current scope.",
    actorId: "admin"
  });
  assert.equal(resolved.status, "written_off");
});

test("Step 27 banking runtime posts fees, interest and settlements through explicit approval", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-10-12T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });

  const bankAccount = platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Handelsbanken",
    ledgerAccountNumber: "1110",
    accountNumber: "6677889900",
    currencyCode: "SEK",
    actorId: "admin"
  });

  const imported = platform.importBankStatementEvents({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    statementDate: "2026-11-13",
    events: [
      {
        externalReference: "BANK-STMT-2702-FEE",
        bookingDate: "2026-11-13",
        amount: -25,
        statementCategoryCode: "bank_fee",
        referenceText: "Monthly fee"
      },
      {
        externalReference: "BANK-STMT-2702-INT",
        bookingDate: "2026-11-13",
        amount: 12.5,
        statementCategoryCode: "interest_income",
        referenceText: "Interest income"
      },
      {
        externalReference: "BANK-STMT-2702-SETTLE",
        bookingDate: "2026-11-13",
        amount: -300,
        statementCategoryCode: "settlement",
        offsetLedgerAccountNumber: "2310",
        referenceText: "Loan settlement"
      }
    ],
    actorId: "admin"
  });

  assert.equal(imported.importedCount, 3);
  assert.equal(imported.matchedStatementPostingCount, 3);
  for (const item of imported.items) {
    assert.equal(item.matchStatus, "matched_statement_posting");
    assert.equal(item.processingStatus, "reconciliation_required");
  }

  for (const item of imported.items) {
    const resolved = platform.resolveBankReconciliationCase({
      companyId: COMPANY_ID,
      reconciliationCaseId: item.reconciliationCaseId,
      resolutionCode: "approve_bank_statement_posting",
      resolutionNote: "Approved bank statement posting.",
      actorId: "admin"
    });
    assert.equal(resolved.executedActionCode, "approve_bank_statement_posting");
  }

  const feeEvent = platform.getBankStatementEvent({
    companyId: COMPANY_ID,
    bankStatementEventId: imported.items.find((item) => item.externalReference === "BANK-STMT-2702-FEE").bankStatementEventId
  });
  assert.equal(feeEvent.processingStatus, "processed");
  assert.equal(feeEvent.matchedObjectType, "journal_entry");
  assert.ok(feeEvent.journalEntryId);
  const feeJournal = platform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: feeEvent.journalEntryId
  });
  assert.equal(feeJournal.lines.some((line) => line.accountNumber === "6060" && line.debitAmount === 25), true);
  assert.equal(feeJournal.lines.some((line) => line.accountNumber === "1110" && line.creditAmount === 25), true);

  const interestEvent = platform.getBankStatementEvent({
    companyId: COMPANY_ID,
    bankStatementEventId: imported.items.find((item) => item.externalReference === "BANK-STMT-2702-INT").bankStatementEventId
  });
  assert.equal(interestEvent.processingStatus, "processed");
  assert.ok(interestEvent.journalEntryId);
  const interestJournal = platform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: interestEvent.journalEntryId
  });
  assert.equal(interestJournal.lines.some((line) => line.accountNumber === "1110" && line.debitAmount === 12.5), true);
  assert.equal(interestJournal.lines.some((line) => line.accountNumber === "7950" && line.creditAmount === 12.5), true);

  const settlementEvent = platform.getBankStatementEvent({
    companyId: COMPANY_ID,
    bankStatementEventId: imported.items.find((item) => item.externalReference === "BANK-STMT-2702-SETTLE").bankStatementEventId
  });
  assert.equal(settlementEvent.processingStatus, "processed");
  assert.ok(settlementEvent.journalEntryId);
  const settlementJournal = platform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: settlementEvent.journalEntryId
  });
  assert.equal(settlementJournal.lines.some((line) => line.accountNumber === "2310" && line.debitAmount === 300), true);
  assert.equal(settlementJournal.lines.some((line) => line.accountNumber === "1110" && line.creditAmount === 300), true);
});
