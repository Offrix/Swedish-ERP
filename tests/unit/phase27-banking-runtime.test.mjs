import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 27 banking runtime imports statement events, bridges tax account and opens reconciliation cases", () => {
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

  const openCases = platform.listBankReconciliationCases({
    companyId: COMPANY_ID,
    status: "open"
  });
  assert.equal(openCases.length, 1);
  const resolved = platform.resolveBankReconciliationCase({
    companyId: COMPANY_ID,
    reconciliationCaseId: openCases[0].reconciliationCaseId,
    resolutionCode: "written_off",
    resolutionNote: "Confirmed bank fee outside current scope.",
    actorId: "admin"
  });
  assert.equal(resolved.status, "written_off");
});
