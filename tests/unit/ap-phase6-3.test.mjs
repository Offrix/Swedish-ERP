import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.3 direct platform flow supports multi-step approval, payment reserve, settlement and idempotent return", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-25T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });

  const adminSessionToken = await loginWithRequiredFactors({ platform, companyId: COMPANY_ID, email: DEMO_ADMIN_EMAIL });
  const approverSessionToken = await loginWithRequiredFactors({ platform, companyId: COMPANY_ID, email: DEMO_APPROVER_EMAIL });
  assert.ok(adminSessionToken);
  assert.ok(approverSessionToken);

  const companyUsers = platform.listCompanyUsers({
    sessionToken: adminSessionToken,
    companyId: COMPANY_ID
  });
  const admin = companyUsers.find((candidate) => candidate.roleCode === "company_admin");
  const approver = companyUsers.find((candidate) => candidate.roleCode === "approver");
  assert.ok(admin);
  assert.ok(approver);

  const approvalChain = platform.createApprovalChain({
    sessionToken: adminSessionToken,
    companyId: COMPANY_ID,
    scopeCode: "ap",
    objectType: "ap_supplier_invoice",
    steps: [
      {
        approverCompanyUserId: admin.companyUserId,
        label: "supplier_invoice_prepare"
      },
      {
        approverCompanyUserId: approver.companyUserId,
        label: "supplier_invoice_attest"
      }
    ]
  });

  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Phase 6.3 Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "Phase 6.3 Supplier AB",
    bankgiro: "5555-5555",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    attestChainId: approvalChain.approvalChainId,
    actorId: "admin"
  });

  const ingested = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "SUP-6301",
    invoiceDate: "2026-09-25",
    dueDate: "2026-10-25",
    sourceChannel: "api",
    lines: [
      {
        description: "Office and subscriptions",
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
    supplierInvoiceId: ingested.supplierInvoiceId,
    actorId: "admin"
  });
  assert.equal(matched.invoice.status, "pending_approval");
  assert.equal(matched.invoice.approvalSteps.length, 2);

  const partiallyApproved = platform.approveSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: ingested.supplierInvoiceId,
    actorId: "admin-user",
    actorCompanyUserId: admin.companyUserId,
    actorRoleCodes: ["company_admin"]
  });
  assert.equal(partiallyApproved.status, "pending_approval");
  assert.throws(
    () =>
      platform.postSupplierInvoice({
        companyId: COMPANY_ID,
        supplierInvoiceId: ingested.supplierInvoiceId,
        actorId: "admin"
      }),
    /Supplier invoice must be approved without open variances before posting/
  );

  const approved = platform.approveSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: ingested.supplierInvoiceId,
    actorId: "approver-user",
    actorCompanyUserId: approver.companyUserId,
    actorRoleCodes: ["approver"]
  });
  assert.equal(approved.status, "approved");

  const posted = platform.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: ingested.supplierInvoiceId,
    actorId: "admin"
  });
  assert.equal(posted.status, "posted");
  assert.ok(posted.apOpenItemId);

  const bankAccount = platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Nordea",
    ledgerAccountNumber: "1110",
    accountNumber: "1234567890",
    currencyCode: "SEK",
    isDefault: true,
    actorId: "admin"
  });

  const proposal = platform.createPaymentProposal({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    apOpenItemIds: [posted.apOpenItemId],
    paymentDate: "2026-10-25",
    actorId: "admin"
  });
  assert.equal(proposal.status, "draft");

  platform.approvePaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  const exported = platform.exportPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "admin"
  });
  assert.equal(exported.status, "exported");
  assert.match(exported.exportPayload, /payee;account;amount;currency;due_date;reference/);

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

  const booked = platform.bookPaymentOrder({
    companyId: COMPANY_ID,
    paymentOrderId,
    bankEventId: "BANK-BOOK-6301",
    bookedOn: "2026-10-26",
    actorId: "admin"
  });
  assert.equal(booked.paymentProposal.status, "settled");
  assert.equal(booked.paymentOrder.status, "booked");

  const bookingJournal = platform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: booked.bankPaymentEvent.journalEntryId
  });
  assert.equal(sumDebits(bookingJournal, "2450"), 1250);
  assert.equal(sumCredits(bookingJournal, "1110"), 1250);

  const returned = platform.returnPaymentOrder({
    companyId: COMPANY_ID,
    paymentOrderId,
    bankEventId: "BANK-RETURN-6301",
    returnedOn: "2026-10-27",
    actorId: "admin"
  });
  assert.equal(returned.paymentOrder.status, "returned");
  const replay = platform.returnPaymentOrder({
    companyId: COMPANY_ID,
    paymentOrderId,
    bankEventId: "BANK-RETURN-6301",
    returnedOn: "2026-10-27",
    actorId: "admin"
  });
  assert.equal(replay.idempotentReplay, true);

  const returnJournal = platform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: returned.bankPaymentEvent.journalEntryId
  });
  assert.equal(sumDebits(returnJournal, "1110"), 1250);
  assert.equal(sumCredits(returnJournal, "2410"), 1250);

  const reopenedInvoice = platform.getSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: ingested.supplierInvoiceId
  });
  const reopenedOpenItem = platform.getApOpenItem({
    companyId: COMPANY_ID,
    apOpenItemId: posted.apOpenItemId
  });
  assert.equal(reopenedInvoice.status, "posted");
  assert.equal(reopenedOpenItem.status, "open");
  assert.equal(reopenedOpenItem.openAmount, 1250);
});

test("Phase 6.4 direct platform flow blocks person-linked AP documents from posting and payment readiness", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-26T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });

  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Benefit Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "Benefit Supplier AB",
    bankgiro: "5555-1111",
    defaultExpenseAccountNumber: "7699",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "admin"
  });
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Ada",
    familyName: "Lovelace",
    workEmail: "ada.ap@example.test",
    actorId: "admin"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly",
    startDate: "2026-01-01",
    actorId: "admin"
  });
  const document = platform.createDocumentRecord({
    companyId: COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "phase6-4-person-linked-ap",
    actorId: "admin"
  });
  const classificationCase = platform.createClassificationCase({
    companyId: COMPANY_ID,
    documentId: document.documentId,
    actorId: "admin",
    lineInputs: [
      {
        lineType: "document_total",
        description: "Employee wellness package",
        amount: 2000,
        treatmentCode: "WELLNESS_ALLOWANCE",
        person: {
          employeeId: employee.employeeId,
          employmentId: employment.employmentId,
          personRelationCode: "employee"
        },
        factsJson: {
          benefitCode: "WELLNESS_ALLOWANCE",
          activityType: "gym",
          vendorName: "Benefit Supplier AB",
          equalTermsOffered: true,
          providedAsGiftCard: false,
          carryOverFromPriorYear: false,
          reimbursementAmount: 2000,
          calendarYearGrantedBeforeEvent: 0
        }
      }
    ]
  });

  const invoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    classificationCaseId: classificationCase.classificationCaseId,
    externalInvoiceRef: "SUP-6401",
    invoiceDate: "2026-09-26",
    dueDate: "2026-10-26",
    sourceChannel: "api",
    lines: [
      {
        description: "Employee wellness package",
        quantity: 1,
        unitPrice: 2000,
        expenseAccountNumber: "7699",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "admin"
  });
  assert.equal(invoice.classificationCaseId, classificationCase.classificationCaseId);

  const matched = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "admin"
  });
  assert.equal(matched.invoice.reviewRequired, true);
  assert.equal(matched.invoice.reviewQueueCodes.includes("person_linked_document"), true);
  assert.equal(matched.invoice.paymentHoldReasonCodes.includes("person_linked_classification_pending"), true);
  assert.equal(matched.invoice.paymentReadinessStatus, "not_ready");
  assert.throws(
    () =>
      platform.postSupplierInvoice({
        companyId: COMPANY_ID,
        supplierInvoiceId: invoice.supplierInvoiceId,
        actorId: "admin"
      }),
    /approved without open variances/i
  );

  platform.approveClassificationCase({
    companyId: COMPANY_ID,
    classificationCaseId: classificationCase.classificationCaseId,
    actorId: "admin"
  });
  const rematched = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "admin"
  });
  assert.equal(rematched.invoice.paymentHoldReasonCodes.includes("person_linked_classification_pending"), false);
  assert.equal(rematched.invoice.paymentHoldReasonCodes.includes("person_linked_handoff_required"), true);
  assert.equal(rematched.invoice.reviewRequired, true);
});

test("Phase 8.2 AP models F-skatt and A-skatt work-compensation consequences without overblocking low annual amounts", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-09-27T08:00:00Z")
  });

  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: "A-skatt Consultant",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "A-skatt Consultant",
    bankgiro: "4444-0000",
    defaultExpenseAccountNumber: "6540",
    defaultVatCode: "VAT_SE_EXEMPT",
    requiresPo: false,
    taxStatusCode: "a_skatt",
    counterpartyTypeCode: "sole_trader",
    actorId: "admin"
  });

  const firstInvoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "SUP-TAX-8201",
    invoiceDate: "2026-09-27",
    dueDate: "2026-10-27",
    sourceChannel: "api",
    lines: [
      {
        description: "Consulting day 1",
        quantity: 1,
        unitPrice: 5000,
        expenseAccountNumber: "6540",
        vatCode: "VAT_SE_EXEMPT",
        workCompensationFlag: true
      }
    ],
    actorId: "admin"
  });
  const firstMatch = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: firstInvoice.supplierInvoiceId,
    actorId: "admin"
  });
  assert.equal(firstMatch.invoice.reviewRequired, false);
  assert.equal(firstMatch.invoice.paymentHold, false);
  assert.equal(firstMatch.invoice.supplierTaxAssessmentStatus, "monitoring");
  assert.equal(firstMatch.invoice.supplierTaxConsequenceCodes.includes("annual_work_compensation_threshold_monitoring_required"), true);

  const secondInvoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "SUP-TAX-8202",
    invoiceDate: "2026-10-02",
    dueDate: "2026-11-01",
    sourceChannel: "api",
    lines: [
      {
        description: "Consulting day 2",
        quantity: 1,
        unitPrice: 6000,
        expenseAccountNumber: "6540",
        vatCode: "VAT_SE_EXEMPT",
        workCompensationFlag: true
      }
    ],
    actorId: "admin"
  });
  const secondMatch = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: secondInvoice.supplierInvoiceId,
    actorId: "admin"
  });
  assert.equal(secondMatch.invoice.reviewRequired, true);
  assert.equal(secondMatch.invoice.paymentHold, true);
  assert.equal(secondMatch.invoice.supplierTaxAssessmentStatus, "review_required");
  assert.equal(secondMatch.invoice.reviewQueueCodes.includes("supplier_tax_review_required"), true);
  assert.equal(secondMatch.invoice.paymentHoldReasonCodes.includes("supplier_tax_withholding_required"), true);
  assert.equal(secondMatch.invoice.paymentHoldReasonCodes.includes("supplier_employer_contributions_required"), true);
  assert.equal(secondMatch.invoice.supplierTaxConsequenceCodes.includes("tax_withholding_30_required"), true);
  assert.equal(secondMatch.invoice.supplierTaxConsequenceCodes.includes("employer_contributions_required"), true);
  assert.equal(secondMatch.invoice.supplierTaxAnnualCompensationAmount, 11000);
});

test("Phase 9.2 direct platform flow posts AP credit notes with dedicated recipe and exposes non-payable payment prep", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-10-28T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });

  const adminSessionToken = await loginWithRequiredFactors({ platform, companyId: COMPANY_ID, email: DEMO_ADMIN_EMAIL });
  assert.ok(adminSessionToken);

  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Credit Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "Credit Supplier AB",
    bankgiro: "6666-6666",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "admin"
  });

  const original = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "SUP-9201",
    invoiceDate: "2026-10-28",
    dueDate: "2026-11-27",
    sourceChannel: "api",
    lines: [
      {
        description: "Office services",
        quantity: 1,
        unitPrice: 1000,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "admin"
  });
  platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: original.supplierInvoiceId,
    actorId: "admin"
  });
  const postedOriginal = platform.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: original.supplierInvoiceId,
    actorId: "admin"
  });

  const credit = platform.createSupplierCreditNote({
    companyId: COMPANY_ID,
    supplierInvoiceId: postedOriginal.supplierInvoiceId,
    externalInvoiceRef: "SUP-9201-CR",
    invoiceDate: "2026-10-29",
    dueDate: "2026-10-29",
    creditReasonCode: "supplier_price_adjustment",
    actorId: "admin"
  });
  assert.equal(credit.invoiceType, "credit_note");
  assert.equal(credit.originalSupplierInvoiceId, postedOriginal.supplierInvoiceId);

  const matchedCredit = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: credit.supplierInvoiceId,
    actorId: "admin"
  });
  assert.equal(matchedCredit.invoice.reviewRequired, false);

  const postedCredit = platform.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: credit.supplierInvoiceId,
    actorId: "admin"
  });
  const creditJournal = platform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: postedCredit.journalEntryId
  });
  assert.equal(creditJournal.sourceType, "AP_CREDIT_NOTE");
  assert.equal(creditJournal.metadataJson.postingRecipeCode, "AP_CREDIT_NOTE");
  assert.equal(sumCredits(creditJournal, "5410"), 1000);
  assert.equal(sumCredits(creditJournal, "2640"), 250);
  assert.equal(sumDebits(creditJournal, "2410"), 1250);

  const creditOpenItem = platform.getApOpenItem({
    companyId: COMPANY_ID,
    apOpenItemId: postedCredit.apOpenItemId
  });
  assert.equal(creditOpenItem.openAmount, -1250);
  const paymentPreparation = platform.getApPaymentPreparation({
    companyId: COMPANY_ID,
    apOpenItemId: creditOpenItem.apOpenItemId
  });
  assert.equal(paymentPreparation.status, "not_applicable");
  assert.equal(paymentPreparation.blockerCodes.includes("credit_note_not_payable"), true);
});

async function loginWithRequiredFactors({ platform, companyId, email }) {
  const started = platform.startLogin({
    companyId,
    email
  });
  platform.verifyTotp({
    sessionToken: started.sessionToken,
    code: platform.getTotpCodeForTesting({ companyId, email })
  });
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = platform.startBankIdAuthentication({
      sessionToken: started.sessionToken
    });
    platform.collectBankIdAuthentication({
      sessionToken: started.sessionToken,
      orderRef: bankIdStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
    });
  }
  return started.sessionToken;
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
