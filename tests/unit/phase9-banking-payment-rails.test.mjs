import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.4/9.6 builds first-class payment rails while gating statement posting behind explicit approval", () => {
  const platform = createPreparedPlatform();
  const bankAccount = platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "SEB",
    ledgerAccountNumber: "1110",
    accountNumber: "5566778899",
    currencyCode: "SEK",
    actorId: "admin"
  });
  const { proposal, paymentOrderId } = createApprovedPaymentProposal({
    platform,
    bankAccountId: bankAccount.bankAccountId,
    externalInvoiceRef: "PHASE94-OB-1",
    paymentRailCode: "open_banking"
  });

  assert.equal(proposal.paymentBatch.paymentRailCode, "open_banking");
  assert.equal(proposal.paymentBatch.providerCode, "enable_banking");
  assert.equal(proposal.paymentBatch.providerBaselineCode, "SE-OPEN-BANKING-CORE");

  const exported = platform.exportPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  assert.equal(exported.paymentBatch.paymentFileFormatCode, "open_banking_api");
  assert.match(exported.paymentBatch.exportFileName, /\.json$/);
  assert.match(exported.paymentBatch.exportPayload, /"rail":"open_banking"/);

  platform.submitPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  platform.acceptPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });

  const imported = platform.importBankStatementEvents({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    statementDate: "2026-11-10",
    sourceChannelCode: "open_banking_sync",
    providerReference: "enable-banking-sync-1",
    events: [
      {
        externalReference: "BANK-STMT-9401-BOOK",
        bookingDate: "2026-11-10",
        amount: -1250,
        linkedPaymentOrderId: paymentOrderId,
        paymentOrderAction: "booked"
      }
    ],
    actorId: "admin"
  });

  assert.equal(imported.statementImport.status, "reconciliation_required");
  assert.equal(imported.statementImport.providerCode, "enable_banking");
  assert.equal(imported.statementImport.providerBaselineCode, "SE-OPEN-BANKING-CORE");
  assert.equal(imported.statementImport.matchedPaymentOrderCount, 1);
  assert.equal(imported.statementImport.reconciliationRequiredCount, 1);

  const paymentBatch = platform.getPaymentBatch({
    companyId: COMPANY_ID,
    paymentBatchId: proposal.paymentBatch.paymentBatchId
  });
  assert.equal(paymentBatch.status, "accepted_by_bank");
  assert.equal(paymentBatch.orderCount, 1);

  const settlementLinks = platform.listSettlementLiabilityLinks({
    companyId: COMPANY_ID,
    paymentOrderId
  });
  assert.equal(settlementLinks.length, 1);
  assert.equal(settlementLinks[0].liabilityObjectType, "ap_open_item");
  assert.equal(settlementLinks[0].status, "matched");
  assert.equal(settlementLinks[0].bankStatementEventId, imported.items[0].bankStatementEventId);

  const openCases = platform.listBankReconciliationCases({
    companyId: COMPANY_ID,
    status: "open"
  });
  assert.equal(openCases.length, 1);
  assert.equal(openCases[0].caseTypeCode, "payment_order_posting_gate");
  const approvedGate = platform.resolveBankReconciliationCase({
    companyId: COMPANY_ID,
    reconciliationCaseId: openCases[0].reconciliationCaseId,
    resolutionCode: "approve_payment_order_statement",
    resolutionNote: "Approved payment order settlement from statement.",
    actorId: "admin"
  });
  assert.equal(approvedGate.executedActionCode, "approve_payment_order_statement");

  const settledBatch = platform.getPaymentBatch({
    companyId: COMPANY_ID,
    paymentBatchId: proposal.paymentBatch.paymentBatchId
  });
  assert.equal(settledBatch.status, "settled");
  const settledLinks = platform.listSettlementLiabilityLinks({
    companyId: COMPANY_ID,
    paymentOrderId
  });
  assert.equal(settledLinks[0].status, "settled");
});

test("Phase 9.4 exports ISO20022 rail batches with explicit ISO20022 baseline", () => {
  const platform = createPreparedPlatform();
  const bankAccount = platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Nordea",
    ledgerAccountNumber: "1110",
    accountNumber: "1122334455",
    currencyCode: "SEK",
    actorId: "admin"
  });
  const { proposal } = createApprovedPaymentProposal({
    platform,
    bankAccountId: bankAccount.bankAccountId,
    externalInvoiceRef: "PHASE94-BF-1",
    paymentRailCode: "iso20022_file"
  });

  const exported = platform.exportPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });

  assert.equal(exported.paymentBatch.paymentRailCode, "iso20022_file");
  assert.equal(exported.paymentBatch.providerCode, "bank_file_channel");
  assert.equal(exported.paymentBatch.providerBaselineCode, "SE-ISO20022-BANK-FILE");
  assert.equal(exported.paymentBatch.paymentFileFormatCode, "pain.001");
  assert.match(exported.paymentBatch.exportFileName, /\.xml$/);
  assert.match(exported.paymentBatch.exportPayload, /format="pain\.001"/);
});

function createPreparedPlatform() {
  const platform = createApiPlatform({
    clock: () => new Date("2026-10-10T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });
  return platform;
}

function createApprovedPaymentProposal({ platform, bankAccountId, externalInvoiceRef, paymentRailCode }) {
  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: `Supplier ${externalInvoiceRef}`,
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: `Supplier ${externalInvoiceRef}`,
    bankgiro: "7777-1212",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "admin"
  });
  const invoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef,
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
  const proposal = platform.createPaymentProposal({
    companyId: COMPANY_ID,
    bankAccountId,
    apOpenItemIds: [posted.apOpenItemId],
    paymentDate: "2026-11-09",
    paymentRailCode,
    actorId: "admin"
  });
  const approved = platform.approvePaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  return {
    proposal: approved,
    paymentOrderId: approved.orders[0].paymentOrderId
  };
}
