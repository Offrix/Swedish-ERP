import test from "node:test";
import assert from "node:assert/strict";
import { createArEngine } from "../../packages/domain-ar/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.1 versions quotes after send without mutating the previously sent version", () => {
  const ar = createArEngine({
    clock: () => new Date("2026-03-22T09:00:00Z"),
    seedDemo: false
  });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const quote = ar.createQuote({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    title: "Managed service offer",
    validUntil: "2026-04-30",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 10 }]
  });

  ar.transitionQuote({
    companyId: COMPANY_ID,
    quoteId: quote.quoteId,
    targetStatus: "sent"
  });
  const revised = ar.reviseQuote({
    companyId: COMPANY_ID,
    quoteId: quote.quoteId,
    lines: [{ itemId: item.arItemId, quantity: 12 }]
  });

  assert.equal(revised.versions.length, 2);
  assert.equal(revised.currentVersionNo, 2);
  assert.equal(revised.status, "draft");
  assert.equal(revised.versions[0].status, "sent");
  assert.equal(revised.versions[0].quantity, undefined);
  assert.equal(revised.versions[0].lines[0].quantity, 10);
  assert.equal(revised.versions[1].lines[0].quantity, 12);
  assert.equal(revised.versions[1].supersedesQuoteVersionId, revised.versions[0].quoteVersionId);
});

test("Phase 5.1 generates a gap-free invoice plan when an accepted quote becomes an active contract", () => {
  const ar = createArEngine({
    clock: () => new Date("2026-03-22T09:30:00Z"),
    seedDemo: false
  });

  const customer = createCustomer(ar);
  const item = createItem(ar);
  const quote = ar.createQuote({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    title: "Quarterly maintenance",
    validUntil: "2026-05-31",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 3000 }]
  });

  ar.transitionQuote({ companyId: COMPANY_ID, quoteId: quote.quoteId, targetStatus: "sent" });
  ar.transitionQuote({ companyId: COMPANY_ID, quoteId: quote.quoteId, targetStatus: "accepted" });

  const contract = ar.createContract({
    companyId: COMPANY_ID,
    sourceQuoteId: quote.quoteId,
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    invoiceFrequency: "monthly",
    terminationRuleCode: "notice_30_days",
    creditRuleCode: "remaining_period_credit",
    status: "active"
  });

  assert.equal(contract.status, "active");
  assert.equal(contract.invoicePlan.length, 3);
  assert.deepEqual(
    contract.invoicePlan.map((row) => ({
      plannedInvoiceDate: row.plannedInvoiceDate,
      periodStartsOn: row.periodStartsOn,
      periodEndsOn: row.periodEndsOn,
      amount: row.amount
    })),
    [
      { plannedInvoiceDate: "2026-01-01", periodStartsOn: "2026-01-01", periodEndsOn: "2026-01-31", amount: 3000 },
      { plannedInvoiceDate: "2026-02-01", periodStartsOn: "2026-02-01", periodEndsOn: "2026-02-28", amount: 3000 },
      { plannedInvoiceDate: "2026-03-01", periodStartsOn: "2026-03-01", periodEndsOn: "2026-03-31", amount: 3000 }
    ]
  );

  const converted = ar.getQuote({ companyId: COMPANY_ID, quoteId: quote.quoteId });
  assert.equal(converted.status, "converted");
  assert.equal(converted.convertedContractId, contract.contractId);
});

test("Phase 5.1 imports customers idempotently and updates the existing customer on a new batch", () => {
  const ar = createArEngine({
    clock: () => new Date("2026-03-22T10:00:00Z"),
    seedDemo: false
  });

  const firstRun = ar.importCustomers({
    companyId: COMPANY_ID,
    batchKey: "crm-sync-2026-03-22-1",
    rows: [
      {
        customerNo: "CUST-IMPORT-1",
        legalName: "Import Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        importSourceKey: "crm:1",
        billingAddress: {
          line1: "Sveavagen 10",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Sveavagen 10",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        contacts: [
          {
            displayName: "Anna Import",
            email: "anna.import@example.com",
            roleCode: "billing",
            defaultBilling: true
          }
        ]
      }
    ]
  });
  const replay = ar.importCustomers({
    companyId: COMPANY_ID,
    batchKey: "crm-sync-2026-03-22-1",
    rows: [
      {
        customerNo: "CUST-IMPORT-1",
        legalName: "Import Customer AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        importSourceKey: "crm:1",
        billingAddress: {
          line1: "Sveavagen 10",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Sveavagen 10",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        contacts: [
          {
            displayName: "Anna Import",
            email: "anna.import@example.com",
            roleCode: "billing",
            defaultBilling: true
          }
        ]
      }
    ]
  });
  const secondRun = ar.importCustomers({
    companyId: COMPANY_ID,
    batchKey: "crm-sync-2026-03-22-2",
    rows: [
      {
        customerNo: "CUST-IMPORT-1",
        legalName: "Import Customer Updated AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET20",
        invoiceDeliveryMethod: "peppol",
        reminderProfileCode: "priority",
        importSourceKey: "crm:1",
        billingAddress: {
          line1: "Sveavagen 11",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Sveavagen 11",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    ]
  });

  assert.equal(firstRun.idempotentReplay, false);
  assert.equal(firstRun.customerImportBatch.createdCustomers, 1);
  assert.equal(firstRun.customerImportBatch.createdContacts, 1);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(secondRun.customerImportBatch.updatedCustomers, 1);

  const customer = ar.listCustomers({ companyId: COMPANY_ID })[0];
  assert.equal(customer.legalName, "Import Customer Updated AB");
  assert.equal(customer.paymentTermsCode, "NET20");
  assert.equal(customer.invoiceDeliveryMethod, "peppol");
});

test("Step 25 freezes accepted quote versions into invoice drafts and materializes project links", () => {
  const ar = createArEngine({
    clock: () => new Date("2026-03-24T12:00:00Z"),
    seedDemo: false
  });

  const customer = createCustomer(ar);
  const item = createItem(ar, {
    projectBoundFlag: true
  });
  const quote = ar.createQuote({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    title: "Project-bound offer",
    validUntil: "2026-06-30",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 2, projectId: "project-alpha" }]
  });

  ar.transitionQuote({ companyId: COMPANY_ID, quoteId: quote.quoteId, targetStatus: "sent" });
  const accepted = ar.transitionQuote({ companyId: COMPANY_ID, quoteId: quote.quoteId, targetStatus: "accepted" });
  const acceptedVersion = accepted.versions[accepted.versions.length - 1];

  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    sourceQuoteId: quote.quoteId,
    invoiceType: "standard",
    issueDate: "2026-03-24",
    dueDate: "2026-04-23",
    actorId: "user-1"
  });

  assert.equal(invoice.sourceQuoteId, quote.quoteId);
  assert.equal(invoice.sourceQuoteVersionId, acceptedVersion.quoteVersionId);
  assert.equal(invoice.lines[0].projectId, "project-alpha");
  assert.deepEqual(invoice.projectIds, ["project-alpha"]);
  assert.equal(invoice.primaryProjectId, "project-alpha");
  assert.equal(invoice.projectLinkStatus, "single_project");
  assert.equal(invoice.sourceVersion, acceptedVersion.quoteVersionId);
  assert.equal(acceptedVersion.sentAt != null, true);
  assert.equal(acceptedVersion.acceptedAt != null, true);
});

test("Step 25 blocks invoice drafts from non-ready quote versions and quote-breaking overrides", () => {
  const ar = createArEngine({
    clock: () => new Date("2026-03-24T12:15:00Z"),
    seedDemo: false
  });

  const customer = createCustomer(ar);
  const item = createItem(ar, {
    projectBoundFlag: true
  });
  const quote = ar.createQuote({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    title: "Controlled quote",
    validUntil: "2026-06-30",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, projectId: "project-beta" }]
  });

  assert.throws(
    () =>
      ar.createInvoice({
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        sourceQuoteId: quote.quoteId,
        invoiceType: "standard",
        issueDate: "2026-03-24",
        dueDate: "2026-04-23",
        actorId: "user-1"
      }),
    (error) => error.code === "quote_not_invoice_ready"
  );

  ar.transitionQuote({ companyId: COMPANY_ID, quoteId: quote.quoteId, targetStatus: "sent" });
  ar.transitionQuote({ companyId: COMPANY_ID, quoteId: quote.quoteId, targetStatus: "accepted" });

  assert.throws(
    () =>
      ar.createInvoice({
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        sourceQuoteId: quote.quoteId,
        invoiceType: "standard",
        issueDate: "2026-03-24",
        dueDate: "2026-04-23",
        lines: [{ itemId: item.arItemId, quantity: 2, projectId: "project-beta" }],
        actorId: "user-1"
      }),
    (error) => error.code === "quote_version_mismatch"
  );
});

function createCustomer(ar) {
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
    }
  });
}

function createItem(ar, overrides = {}) {
  return ar.createItem({
    companyId: COMPANY_ID,
    description: "Managed operations",
    itemType: "service",
    unitCode: "month",
    standardPrice: 3000,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25",
    recurringFlag: true,
    ...overrides
  });
}
