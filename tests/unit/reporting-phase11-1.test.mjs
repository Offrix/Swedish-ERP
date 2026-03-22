import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.1 materializes cashflow, receivables, payables, project reports and deterministic exports", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:15:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });

  createPostedJournal({
    platform,
    companyId: COMPANY_ID,
    actorId: "unit-test",
    journalDate: "2026-01-10",
    sourceId: "phase11-cashflow",
    lines: [
      { accountNumber: "1110", debitAmount: 2500 },
      { accountNumber: "3010", creditAmount: 2500 }
    ]
  });

  const customer = platform.createCustomer({
    companyId: COMPANY_ID,
    legalName: "Reporting Customer AB",
    organizationNumber: "5566770011",
    countryCode: "SE",
    languageCode: "SV",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    invoiceDeliveryMethod: "pdf_email",
    reminderProfileCode: "standard",
    billingAddress: { line1: "Rapportgatan 1", postalCode: "11157", city: "Stockholm", countryCode: "SE" },
    deliveryAddress: { line1: "Rapportgatan 1", postalCode: "11157", city: "Stockholm", countryCode: "SE" },
    actorId: "unit-test"
  });
  const item = platform.createItem({
    companyId: COMPANY_ID,
    description: "Reporting service",
    itemType: "service",
    unitCode: "hour",
    standardPrice: 1800,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25",
    actorId: "unit-test"
  });
  const invoice = platform.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-01-15",
    dueDate: "2026-02-14",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1800 }],
    actorId: "unit-test"
  });
  const issuedInvoice = platform.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "unit-test"
  });

  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Reporting Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "Reporting Supplier AB",
    bankgiro: "5555-1111",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "unit-test"
  });
  const supplierInvoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "SUP-1101",
    invoiceDate: "2026-01-18",
    dueDate: "2026-02-17",
    sourceChannel: "api",
    lines: [
      {
        description: "Subscriptions",
        quantity: 1,
        unitPrice: 1200,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "unit-test"
  });
  const matchedSupplierInvoice = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: supplierInvoice.supplierInvoiceId,
    actorId: "unit-test"
  }).invoice;
  const approvedSupplierInvoice =
    matchedSupplierInvoice.status === "approved"
      ? matchedSupplierInvoice
      : platform.approveSupplierInvoice({
          companyId: COMPANY_ID,
          supplierInvoiceId: supplierInvoice.supplierInvoiceId,
          actorId: "unit-test"
        });
  const postedSupplierInvoice = platform.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: approvedSupplierInvoice.supplierInvoiceId,
    actorId: "unit-test"
  });

  const projectSeed = platform.listProjects({ companyId: COMPANY_ID })[0];
  assert.ok(projectSeed);

  const metricDefinitions = platform.listMetricDefinitions({ companyId: COMPANY_ID });
  assert.equal(metricDefinitions.some((metric) => metric.metricCode === "project_wip_amount"), true);

  const customDefinition = platform.createReportDefinition({
    companyId: COMPANY_ID,
    baseReportCode: "project_portfolio",
    reportCode: "project_portfolio_focus",
    name: "Project portfolio focus",
    metricCodes: ["project_billed_revenue_amount", "project_wip_amount", "project_forecast_margin_amount"],
    defaultFilters: {
      projectIds: [projectSeed.projectId]
    },
    actorId: "unit-test"
  });
  assert.equal(customDefinition.definitionKind, "light_builder");
  assert.equal(customDefinition.metricCatalog.length, 3);

  const cashflowSnapshot = platform.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: "cashflow",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    viewMode: "period",
    actorId: "unit-test"
  });
  const arSnapshot = platform.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: "ar_open_items",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    viewMode: "period",
    actorId: "unit-test"
  });
  const apSnapshot = platform.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: "ap_open_items",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    viewMode: "period",
    actorId: "unit-test"
  });
  const projectSnapshot = platform.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: customDefinition.reportCode,
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    viewMode: "period",
    actorId: "unit-test"
  });

  assert.equal(cashflowSnapshot.reportCode, "cashflow");
  assert.equal(cashflowSnapshot.lines.some((line) => line.metricValues.net_cash_movement_amount === 2500), true);
  assert.equal(arSnapshot.lines.some((line) => line.metricValues.ar_open_amount === issuedInvoice.remainingAmount), true);
  assert.equal(apSnapshot.lines.some((line) => line.metricValues.ap_open_amount === postedSupplierInvoice.grossAmount), true);
  assert.equal(projectSnapshot.reportDefinitionKind, "light_builder");
  assert.equal(projectSnapshot.lines.length > 0, true);

  const excelExport = platform.requestReportExportJob({
    companyId: COMPANY_ID,
    reportSnapshotId: cashflowSnapshot.reportSnapshotId,
    format: "excel",
    actorId: "unit-test"
  });
  const pdfExport = platform.requestReportExportJob({
    companyId: COMPANY_ID,
    reportSnapshotId: cashflowSnapshot.reportSnapshotId,
    format: "pdf",
    actorId: "unit-test"
  });

  assert.equal(excelExport.status, "delivered");
  assert.equal(pdfExport.status, "delivered");
  assert.match(excelExport.artifactName, /cashflow_2026-01-01_2026-01-31\.xlsx/);
  assert.match(pdfExport.artifactName, /cashflow_2026-01-01_2026-01-31\.pdf/);
  assert.match(excelExport.artifactContent, /net_cash_movement_amount/);
  assert.match(pdfExport.artifactContent, /reportCode=cashflow/);
});

function createPostedJournal({ platform, companyId, actorId, journalDate, sourceId, lines }) {
  const created = platform.createJournalEntry({
    companyId,
    journalDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId,
    idempotencyKey: `reporting-phase11:${sourceId}`,
    lines
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
  return platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
}
