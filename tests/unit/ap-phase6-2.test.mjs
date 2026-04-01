import test from "node:test";
import assert from "node:assert/strict";
import { createApEngine } from "../../packages/domain-ap/src/index.mjs";
import { createAccountingMethodEngine } from "../../packages/domain-accounting-method/src/index.mjs";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.2 ingests OCR invoice lines, explains VAT and posts multiple cost lines correctly", () => {
  const clock = () => new Date("2026-03-25T10:00:00Z");
  const documents = createDocumentArchiveEngine({ clock });
  const ledger = createLedgerPlatform({ clock });
  const vat = createVatPlatform({ clock, ledgerPlatform: ledger });
  const ap = createApEngine({
    clock,
    seedDemo: false,
    vatPlatform: vat,
    ledgerPlatform: ledger,
    documentPlatform: documents
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "user-1"
  });

  const channel = documents.registerInboxChannel({
    companyId: COMPANY_ID,
    channelCode: "ap_docs",
    inboundAddress: "ap@inbound.example.test",
    useCase: "supplier_invoice_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.85
  });
  const ingested = documents.ingestEmailMessage({
    companyId: COMPANY_ID,
    recipientAddress: channel.inboundAddress,
    messageId: "<phase6-2-unit-ocr-001>",
    rawStorageKey: "raw-mail/phase6-2-unit-ocr-001.eml",
    attachments: [
      {
        filename: "invoice.pdf",
        mimeType: "application/pdf",
        storageKey: "documents/originals/phase6-2-unit-ocr-001.pdf",
        contentText: [
          "Invoice: OCR-6102",
          "Supplier: OCR Supplier AB",
          "Invoice date: 2026-03-25",
          "Due date: 2026-04-24",
          "Currency: SEK",
          "Net: 1200.00",
          "VAT: 300.00",
          "Total: 1500.00",
          "OCR: 556677",
          "Line 1: Office supplies Qty: 2 Unit: 500.00 VAT: VAT_SE_DOMESTIC_25 Account: 5410",
          "Line 2: Cloud hosting Qty: 1 Unit: 200.00 VAT: VAT_SE_DOMESTIC_25 Account: 5610"
        ].join("\n")
      }
    ],
    actorId: "user-1"
  });
  const documentId = ingested.routedDocuments[0].documentId;
  documents.runDocumentOcr({
    companyId: COMPANY_ID,
    documentId,
    actorId: "user-1"
  });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    legalName: "OCR Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "user-1"
  });

  const invoice = ap.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    documentId,
    sourceChannel: "email",
    actorId: "user-1"
  });
  assert.equal(invoice.lines.length, 2);
  assert.equal(invoice.lines[0].netAmount, 1000);
  assert.equal(invoice.lines[1].netAmount, 200);
  assert.equal(typeof invoice.lines[0].vatProposal.vatDecisionId, "string");
  assert.equal(invoice.lines[0].vatProposal.decisionCategory, "domestic_supplier_charged_purchase");
  assert.deepEqual(invoice.lines[0].vatProposal.declarationBoxCodes, ["48"]);
  assert.match(invoice.lines[0].vatProposal.explanation.join(" "), /VAT_SE_DOMESTIC_PURCHASE_25/);

  const matched = ap.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "user-1"
  });
  assert.equal(matched.invoice.status, "approved");

  const posted = ap.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "user-1"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: posted.journalEntryId
  });

  assert.equal(posted.status, "posted");
  assert.equal(posted.grossAmount, 1500);
  assert.equal(journal.status, "posted");
  assert.equal(journal.lines.some((line) => line.accountNumber === "5410" && line.debitAmount === 1000), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "5610" && line.debitAmount === 200), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "2640" && line.debitAmount === 300), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "2410" && line.creditAmount === 1500), true);
  assert.equal(journal.metadataJson.postingRecipeCode, "AP_INVOICE");
  assert.equal(journal.metadataJson.journalType, "operational_posting");
  assert.equal(journal.metadataJson.postingSignalCode, "ap.invoice.posted");
  assert.equal(journal.metadataJson.sourceObjectVersion, invoice.duplicateFingerprintHash);
});

test("Phase 8.6 cash method posts supplier invoices operationally without invoice-date ledger booking", () => {
  const clock = () => new Date("2026-03-29T10:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const vat = createVatPlatform({ clock, ledgerPlatform: ledger });
  const accountingMethod = createActiveAccountingMethodPlatform({
    clock,
    companyId: COMPANY_ID,
    methodCode: "KONTANTMETOD",
    effectiveFrom: "2026-01-01"
  });
  const ap = createApEngine({
    clock,
    seedDemo: false,
    accountingMethodPlatform: accountingMethod,
    vatPlatform: vat,
    ledgerPlatform: ledger
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "user-1"
  });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Cash Method Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "Cash Method Supplier AB",
    bankgiro: "5555-7777",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "user-1"
  });
  const invoice = ap.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "CASH-AP-6201",
    invoiceDate: "2026-03-29",
    dueDate: "2026-04-28",
    sourceChannel: "api",
    lines: [
      {
        description: "Cash-method supplier invoice",
        quantity: 1,
        unitPrice: 1000,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "user-1"
  });
  const matched = ap.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "user-1"
  });
  const posted = ap.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "user-1"
  });
  const openItem = ap.getApOpenItem({
    companyId: COMPANY_ID,
    apOpenItemId: posted.apOpenItemId
  });
  const ledgerEntries = ledger.snapshotLedger().journalEntries.filter((entry) => entry.sourceId === invoice.supplierInvoiceId);

  assert.equal(matched.invoice.status, "approved");
  assert.equal(posted.status, "posted");
  assert.equal(posted.journalEntryId, null);
  assert.equal(posted.primaryRecognitionTrigger, "AP_PAYMENT_SETTLEMENT");
  assert.equal(posted.recognizedGrossAmount, 0);
  assert.equal(posted.recognizedVatAmount, 0);
  assert.equal(posted.lines[0].recognizedNetAmount, 0);
  assert.equal(posted.lines[0].recognizedVatAmount, 0);
  assert.equal(openItem.openAmount, 1250);
  assert.equal(openItem.status, "open");
  assert.equal(openItem.journalEntryId, null);
  assert.equal(ledgerEntries.length, 0);
});

test("Phase 6.2 blocks posting when 3-way matching finds receipt variance", () => {
  const clock = () => new Date("2026-03-25T11:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const vat = createVatPlatform({ clock, ledgerPlatform: ledger });
  const ap = createApEngine({
    clock,
    seedDemo: false,
    vatPlatform: vat,
    ledgerPlatform: ledger
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "user-1"
  });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Three Way Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    defaultExpenseAccountNumber: "4010",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: true,
    requiresReceipt: true,
    actorId: "user-1"
  });
  const purchaseOrder = ap.createPurchaseOrder({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    requesterUserId: "user-1",
    lines: [
      {
        description: "Warehouse material",
        quantityOrdered: 10,
        unitPrice: 100,
        expenseAccountNumber: "4010",
        vatCode: "VAT_SE_DOMESTIC_25",
        receiptTargetType: "inventory"
      }
    ],
    actorId: "user-1"
  });
  ap.transitionPurchaseOrderStatus({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    targetStatus: "approved",
    actorId: "user-1"
  });
  ap.transitionPurchaseOrderStatus({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    targetStatus: "sent",
    actorId: "user-1"
  });
  ap.createReceipt({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    receiptDate: "2026-03-25",
    receiverActorId: "user-1",
    lines: [
      {
        purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
        receivedQuantity: 5
      }
    ],
    actorId: "user-1"
  });

  const invoice = ap.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    externalInvoiceRef: "TW-6102",
    invoiceDate: "2026-03-25",
    dueDate: "2026-04-24",
    lines: [
      {
        description: "Warehouse material",
        quantity: 7,
        unitPrice: 100,
        expenseAccountNumber: "4010",
        vatCode: "VAT_SE_DOMESTIC_25",
        purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
        goodsOrServices: "goods",
        receiptRequired: true
      }
    ],
    actorId: "user-1"
  });

  const matched = ap.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "user-1"
  });

  assert.equal(matched.invoice.reviewRequired, true);
  assert.equal(matched.invoice.status, "pending_approval");
  assert.deepEqual(
    matched.invoice.variances.map((variance) => variance.varianceCode),
    ["receipt_variance"]
  );

  assert.throws(
    () =>
      ap.postSupplierInvoice({
        companyId: COMPANY_ID,
        supplierInvoiceId: invoice.supplierInvoiceId,
        actorId: "user-1"
      }),
    /approved without open variances/i
  );
});

test("Phase 9.2 blocks AP posting for missing governed allocation dimensions and carries approved allocations into journals", () => {
  const clock = () => new Date("2026-03-28T09:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const vat = createVatPlatform({ clock, ledgerPlatform: ledger });
  const ap = createApEngine({
    clock,
    seedDemo: false,
    vatPlatform: vat,
    ledgerPlatform: ledger
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "user-1"
  });
  ledger.upsertLedgerDimensionValue({
    companyId: COMPANY_ID,
    dimensionType: "serviceLines",
    code: "SL-OPS",
    label: "Operations",
    locked: false,
    sourceDomain: "ap",
    actorId: "user-1"
  });
  ledger.upsertLedgerAccount({
    companyId: COMPANY_ID,
    accountNumber: "5410",
    accountName: "Forbrukningsinventarier",
    accountClass: "5",
    requiredDimensionKeys: ["serviceLineCode"],
    locked: false,
    changeReasonCode: "phase_9_2_ap_allocation_dimensions",
    actorId: "user-1"
  });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Allocation Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    bankgiro: "7000-7000",
    paymentRecipient: "Allocation Supplier AB",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "user-1"
  });

  const missingAllocationInvoice = ap.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "ALLOC-MISSING-001",
    invoiceDate: "2026-03-28",
    dueDate: "2026-04-27",
    sourceChannel: "api",
    lines: [
      {
        description: "Managed services",
        quantity: 1,
        unitPrice: 1000,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "user-1"
  });
  assert.equal(missingAllocationInvoice.reviewRequired, true);
  assert.equal(missingAllocationInvoice.reviewQueueCodes.includes("allocation_review_required"), true);
  assert.deepEqual(missingAllocationInvoice.lines[0].allocationRequiredFieldCodes, ["service_line_code"]);
  assert.deepEqual(missingAllocationInvoice.lines[0].allocationMissingFieldCodes, ["service_line_code"]);

  const matchedMissing = ap.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: missingAllocationInvoice.supplierInvoiceId,
    actorId: "user-1"
  });
  assert.equal(matchedMissing.invoice.reviewRequired, true);
  assert.throws(
    () =>
      ap.postSupplierInvoice({
        companyId: COMPANY_ID,
        supplierInvoiceId: missingAllocationInvoice.supplierInvoiceId,
        actorId: "user-1"
      }),
    /approved without open variances/i
  );

  const dimensionedInvoice = ap.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "ALLOC-READY-001",
    invoiceDate: "2026-03-28",
    dueDate: "2026-04-27",
    sourceChannel: "api",
    lines: [
      {
        description: "Managed services",
        quantity: 1,
        unitPrice: 1000,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25",
        dimensionsJson: {
          serviceLineCode: "SL-OPS"
        }
      }
    ],
    actorId: "user-1"
  });
  const matchedReady = ap.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: dimensionedInvoice.supplierInvoiceId,
    actorId: "user-1"
  });
  assert.equal(matchedReady.invoice.reviewRequired, false);
  const posted = ap.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: dimensionedInvoice.supplierInvoiceId,
    actorId: "user-1"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: posted.journalEntryId
  });
  const expenseLine = journal.lines.find((line) => line.accountNumber === "5410");
  assert.equal(expenseLine.dimensionJson.serviceLineCode, "SL-OPS");
});

function createActiveAccountingMethodPlatform({ clock, companyId, methodCode, effectiveFrom }) {
  const accountingMethod = createAccountingMethodEngine({
    seedDemo: false,
    clock
  });
  const assessment = accountingMethod.assessCashMethodEligibility({
    companyId,
    annualNetTurnoverSek: 1_000_000,
    legalFormCode: "AB",
    actorId: "user-1"
  });
  const profile = accountingMethod.createMethodProfile({
    companyId,
    methodCode,
    effectiveFrom,
    fiscalYearStartDate: effectiveFrom,
    eligibilityAssessmentId: assessment.assessmentId,
    onboardingOverride: true,
    actorId: "user-1"
  });
  accountingMethod.activateMethodProfile({
    companyId,
    methodProfileId: profile.methodProfileId,
    actorId: "user-1"
  });
  return accountingMethod;
}
