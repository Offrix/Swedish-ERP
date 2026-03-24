import test from "node:test";
import assert from "node:assert/strict";
import { createArEngine } from "../../packages/domain-ar/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createIntegrationEngine } from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.2 issues an invoice only once and reuses the posted journal on repeated issue calls", () => {
  const clock = () => new Date("2026-03-22T12:30:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-22",
    dueDate: "2026-04-21",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });

  const firstIssue = ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });
  const secondIssue = ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });

  const postedEntries = ledger.snapshotLedger().journalEntries.filter((entry) => entry.sourceId === invoice.customerInvoiceId);
  assert.equal(firstIssue.invoiceNumber, secondIssue.invoiceNumber);
  assert.equal(firstIssue.journalEntryId, secondIssue.journalEntryId);
  assert.equal(postedEntries.length, 1);
  assert.equal(postedEntries[0].status, "posted");
});

test("Phase 5.2 full credit note closes the credited invoice and posts a separate AR credit journal", () => {
  const clock = () => new Date("2026-03-22T12:45:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const customer = createCustomer(ar, {
    peppolScheme: "0088",
    peppolIdentifier: "0007:5566778899"
  });
  const item = createItem(ar);
  const original = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-22",
    dueDate: "2026-04-21",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: original.customerInvoiceId,
    actorId: "user-1"
  });

  const credit = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    originalInvoiceId: original.customerInvoiceId,
    invoiceType: "credit_note",
    issueDate: "2026-03-23",
    dueDate: "2026-03-23",
    amendmentReason: "Full kredit av ursprungsfaktura",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  const issuedCredit = ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: credit.customerInvoiceId,
    actorId: "user-1"
  });

  const originalAfterCredit = ar.getInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: original.customerInvoiceId
  });
  const creditJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: issuedCredit.journalEntryId
  });

  assert.equal(originalAfterCredit.status, "credited");
  assert.equal(originalAfterCredit.remainingAmount, 0);
  assert.match(issuedCredit.invoiceNumber, /^CRN-/);
  assert.equal(creditJournal.sourceType, "AR_CREDIT_NOTE");
  assert.equal(creditJournal.voucherSeriesCode, "C");
});

test("Phase 5.2 validates Peppol delivery and creates payment links from issued invoices", () => {
  const clock = () => new Date("2026-03-22T13:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const customer = createCustomer(ar, {
    peppolScheme: "0088",
    peppolIdentifier: "0007:5566778899"
  });
  const item = createItem(ar);
  const contract = ar.createContract({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    title: "Subscription contract",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    invoiceFrequency: "monthly",
    currencyCode: "SEK",
    terminationRuleCode: "notice_30_days",
    creditRuleCode: "remaining_period_credit",
    status: "active",
    lines: [{ itemId: item.arItemId, quantity: 2, unitPrice: 1000 }]
  });
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    sourceContractId: contract.contractId,
    invoiceType: "subscription",
    issueDate: "2026-03-22",
    dueDate: "2026-04-21",
    currencyCode: "SEK",
    deliveryChannel: "peppol",
    buyerReference: "BR-100",
    actorId: "user-1"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });

  const delivery = ar.deliverInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });
  const paymentLink = ar.createInvoicePaymentLink({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });

  assert.equal(delivery.channel, "peppol");
  assert.equal(delivery.payloadType, "peppol_bis_billing_3");
  assert.equal(delivery.recipient, "0088:0007:5566778899");
  assert.equal(paymentLink.status, "active");
});

test("Phase 5.2 marks invoice delivery as failed when Peppol validation data is missing", () => {
  const clock = () => new Date("2026-03-22T13:15:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const customer = createCustomer(ar, {
    peppolScheme: "0088",
    peppolIdentifier: "0007:5566778899"
  });
  const item = createItem(ar);
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-22",
    dueDate: "2026-04-21",
    currencyCode: "SEK",
    deliveryChannel: "peppol",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "user-1"
  });

  assert.throws(
    () =>
      ar.deliverInvoice({
        companyId: COMPANY_ID,
        customerInvoiceId: invoice.customerInvoiceId,
        actorId: "user-1"
      }),
    (error) => error.code === "peppol_reference_missing"
  );

  const failedInvoice = ar.getInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId
  });
  assert.equal(failedInvoice.status, "delivery_failed");
});

test("Step 24 blocks reverse-charge invoices until buyer VAT and legal text are present", () => {
  const clock = () => new Date("2026-03-24T09:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const customer = createCustomer(ar);
  const reverseChargeItem = createItem(ar, {
    vatCode: "VAT_SE_RC_BUILD_SELL"
  });

  const blocked = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-24",
    dueDate: "2026-04-23",
    lines: [{ itemId: reverseChargeItem.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  const blockedEvaluation = ar.getInvoiceFieldEvaluation({
    companyId: COMPANY_ID,
    customerInvoiceId: blocked.customerInvoiceId
  });
  assert.equal(blockedEvaluation.scenarioCode, "reverse_charge_invoice");
  assert.equal(blockedEvaluation.status, "blocked");
  assert.equal(blockedEvaluation.missingFieldCodes.includes("buyer_vat_number"), true);
  assert.equal(blockedEvaluation.missingFieldCodes.includes("special_legal_text"), true);
  assert.throws(
    () =>
      ar.issueInvoice({
        companyId: COMPANY_ID,
        customerInvoiceId: blocked.customerInvoiceId,
        actorId: "user-1"
      }),
    (error) => error.code === "invoice_issue_blocked"
  );

  const passable = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-24",
    dueDate: "2026-04-23",
    buyerVatNumber: "SE556677889901",
    specialLegalText: "Omvänd betalningsskyldighet",
    lines: [{ itemId: reverseChargeItem.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "user-1"
  });
  const passedEvaluation = ar.getInvoiceFieldEvaluation({
    companyId: COMPANY_ID,
    customerInvoiceId: passable.customerInvoiceId
  });
  assert.equal(passedEvaluation.status, "passed");
  const issued = ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: passable.customerInvoiceId,
    actorId: "user-1"
  });
  assert.equal(issued.status, "issued");
});

test("Step 24 blocks export and HUS invoices until legal overlays are complete", () => {
  const clock = () => new Date("2026-03-24T09:30:00Z");
  const ledger = createLedgerPlatform({ clock });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    ledgerPlatform: ledger,
    integrationPlatform: integrations
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "user-1" });

  const exportCustomer = createCustomer(ar, {
    legalName: "US Customer Inc",
    organizationNumber: null,
    countryCode: "US",
    languageCode: "EN",
    billingAddress: {
      line1: "1 Export Road",
      postalCode: "94016",
      city: "San Francisco",
      countryCode: "US"
    },
    deliveryAddress: {
      line1: "1 Export Road",
      postalCode: "94016",
      city: "San Francisco",
      countryCode: "US"
    }
  });
  const exportItem = createItem(ar, {
    vatCode: "VAT_SE_EXPORT_SERVICE_0"
  });
  const blockedExport = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: exportCustomer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-24",
    dueDate: "2026-04-23",
    lines: [{ itemId: exportItem.arItemId, quantity: 1, unitPrice: 2000 }],
    actorId: "user-1"
  });
  const blockedExportEvaluation = ar.getInvoiceFieldEvaluation({
    companyId: COMPANY_ID,
    customerInvoiceId: blockedExport.customerInvoiceId
  });
  assert.equal(blockedExportEvaluation.scenarioCode, "export_invoice");
  assert.equal(blockedExportEvaluation.status, "blocked");
  assert.equal(blockedExportEvaluation.missingFieldCodes.includes("delivery_date"), true);
  assert.equal(blockedExportEvaluation.missingFieldCodes.includes("export_evidence_reference"), true);

  const husCustomer = createCustomer(ar, {
    legalName: "HUS Customer AB",
    organizationNumber: null
  });
  const husItem = createItem(ar);
  const blockedHus = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: husCustomer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-24",
    dueDate: "2026-04-23",
    husCaseId: "hus-case-001",
    lines: [{ itemId: husItem.arItemId, quantity: 1, unitPrice: 5000 }],
    actorId: "user-1"
  });
  const blockedHusEvaluation = ar.getInvoiceFieldEvaluation({
    companyId: COMPANY_ID,
    customerInvoiceId: blockedHus.customerInvoiceId
  });
  assert.equal(blockedHusEvaluation.scenarioCode, "hus_invoice");
  assert.equal(blockedHusEvaluation.status, "blocked");
  assert.equal(blockedHusEvaluation.missingFieldCodes.includes("hus_property_designation"), true);
  assert.equal(blockedHusEvaluation.missingFieldCodes.includes("hus_buyer_identity_number"), true);

  const passableHus = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: husCustomer.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-24",
    dueDate: "2026-04-23",
    husCaseId: "hus-case-002",
    husPropertyDesignation: "UPPSALA SUNNERSTA 1:23",
    husBuyerIdentityNumber: "197001011234",
    husServiceTypeCode: "rot",
    lines: [{ itemId: husItem.arItemId, quantity: 1, unitPrice: 5000 }],
    actorId: "user-1"
  });
  const passableHusEvaluation = ar.getInvoiceFieldEvaluation({
    companyId: COMPANY_ID,
    customerInvoiceId: passableHus.customerInvoiceId
  });
  assert.equal(passableHusEvaluation.status, "passed");
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

function createItem(ar, overrides = {}) {
  return ar.createItem({
    companyId: COMPANY_ID,
    description: "Managed operations",
    itemType: "service",
    unitCode: "month",
    standardPrice: 1000,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25",
    recurringFlag: true,
    ...overrides
  });
}
