import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createArEngine } from "../../packages/domain-ar/src/index.mjs";
import { createApEngine } from "../../packages/domain-ap/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { createIntegrationEngine } from "../../packages/domain-integrations/src/index.mjs";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createBankingPlatform } from "../../packages/domain-banking/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";
import { buildTestCompanyProfile } from "../helpers/company-profiles.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const AR_TEST_ENGINE_OPTIONS = {
  companyProfilesById: {
    [COMPANY_ID]: buildTestCompanyProfile(COMPANY_ID)
  }
};

test("Step 10 ledger voucher series resolves by purpose and preserves imported numbering", () => {
  const ledger = createLedgerPlatform({
    clock: () => new Date("2026-03-24T12:00:00Z"),
    seedDemo: false
  });
  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "unit-test" });

  assert.equal(
    ledger.resolveVoucherSeriesForPurpose({
      companyId: COMPANY_ID,
      purposeCode: "AR_INVOICE"
    }).seriesCode,
    "B"
  );

  ledger.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "B",
    description: "AR dunning and reminders",
    status: "active",
    purposeCodes: ["AR_DUNNING"],
    actorId: "unit-test"
  });
  const customSeries = ledger.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "ARX",
    description: "Custom AR voucher series",
    nextNumber: 900,
    purposeCodes: ["AR_INVOICE"],
    importedSequencePreservationEnabled: true,
    actorId: "unit-test"
  });

  const resolved = ledger.resolveVoucherSeriesForPurpose({
    companyId: COMPANY_ID,
    purposeCode: "AR_INVOICE"
  });
  const reserved = ledger.reserveImportedVoucherNumber({
    companyId: COMPANY_ID,
    seriesCode: customSeries.seriesCode,
    importedVoucherNumber: 950,
    actorId: "unit-test"
  });

  assert.equal(resolved.seriesCode, "ARX");
  assert.equal(reserved.nextNumberAdjusted, true);
  assert.equal(reserved.voucherSeries.nextNumber, 951);
});

test("Step 10 AR invoice numbering and ledger voucher series are configurable independently", () => {
  const clock = () => new Date("2026-03-24T13:00:00Z");
  const ledger = createLedgerPlatform({ clock, seedDemo: false });
  const vat = createVatPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    ledgerPlatform: ledger
  });
  const integrations = createIntegrationEngine({ clock });
  const ar = createArEngine({
    clock,
    seedDemo: false,
    vatPlatform: vat,
    ledgerPlatform: ledger,
    integrationPlatform: integrations,
    ...AR_TEST_ENGINE_OPTIONS
  });

  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "unit-test" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "unit-test" });
  ledger.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "B",
    description: "Dunning only",
    status: "active",
    purposeCodes: ["AR_DUNNING"],
    actorId: "unit-test"
  });
  ledger.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "ARX",
    description: "Customer invoices custom",
    nextNumber: 500,
    purposeCodes: ["AR_INVOICE"],
    importedSequencePreservationEnabled: true,
    actorId: "unit-test"
  });

  ar.upsertInvoiceSeries({
    companyId: COMPANY_ID,
    seriesCode: "B",
    prefix: "INV-",
    description: "Paused legacy invoice series",
    status: "paused",
    invoiceTypeCodes: ["standard", "partial", "subscription"],
    voucherSeriesPurposeCode: "AR_INVOICE",
    actorId: "unit-test"
  });
  const invoiceSeries = ar.upsertInvoiceSeries({
    companyId: COMPANY_ID,
    seriesCode: "STD",
    prefix: "CUS-",
    description: "Custom standard invoices",
    nextNumber: 42,
    invoiceTypeCodes: ["standard"],
    voucherSeriesPurposeCode: "AR_INVOICE",
    actorId: "unit-test"
  });

  const customer = ar.createCustomer({
    companyId: COMPANY_ID,
    legalName: "Series Customer AB",
    organizationNumber: "5566778899",
    countryCode: "SE",
    languageCode: "SV",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    invoiceDeliveryMethod: "pdf_email",
    reminderProfileCode: "standard",
    billingAddress: {
      line1: "Seriegatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    deliveryAddress: {
      line1: "Seriegatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    }
  });
  const item = ar.createItem({
    companyId: COMPANY_ID,
    itemCode: "SERV-STD",
    description: "Standard service",
    itemType: "service",
    unitCode: "hour",
    standardPrice: 1000,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25"
  });
  const invoice = ar.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    invoiceSeriesCode: invoiceSeries.seriesCode,
    issueDate: "2026-03-24",
    dueDate: "2026-04-23",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
    actorId: "unit-test"
  });
  const issued = ar.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "unit-test"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: issued.journalEntryId
  });

  assert.equal(issued.invoiceSeriesCode, "STD");
  assert.equal(issued.invoiceNumber, "CUS-00042");
  assert.equal(journal.voucherSeriesCode, "ARX");
});

test("Step 10 AP postings resolve configurable voucher series by purpose", () => {
  const clock = () => new Date("2026-03-25T10:00:00Z");
  const ledger = createLedgerPlatform({ clock, seedDemo: false });
  const vat = createVatPlatform({ clock, ledgerPlatform: ledger });
  const ap = createApEngine({
    clock,
    seedDemo: false,
    vatPlatform: vat,
    ledgerPlatform: ledger
  });

  ledger.installLedgerCatalog({ companyId: COMPANY_ID, actorId: "unit-test" });
  ledger.ensureAccountingYearPeriod({ companyId: COMPANY_ID, fiscalYear: 2026, actorId: "unit-test" });
  ledger.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "E",
    description: "Paused AP legacy series",
    status: "paused",
    purposeCodes: ["AP_INVOICE", "AP_PAYMENT"],
    actorId: "unit-test"
  });
  ledger.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "SUPP",
    description: "Supplier vouchers custom",
    nextNumber: 700,
    purposeCodes: ["AP_INVOICE", "AP_PAYMENT"],
    actorId: "unit-test"
  });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Purpose Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    defaultExpenseAccountNumber: "4010",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "unit-test"
  });
  const invoice = ap.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "SUPP-7001",
    invoiceDate: "2026-03-25",
    dueDate: "2026-04-24",
    lines: [
      {
        description: "Custom series AP line",
        quantity: 1,
        unitPrice: 1000,
        expenseAccountNumber: "4010",
        vatCode: "VAT_SE_DOMESTIC_25",
        goodsOrServices: "services"
      }
    ],
    actorId: "unit-test"
  });
  ap.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "unit-test"
  });
  const posted = ap.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: invoice.supplierInvoiceId,
    actorId: "unit-test"
  });
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: posted.journalEntryId
  });

  assert.equal(journal.voucherSeriesCode, "SUPP");
});

test("Step 10 payroll postings and payout matching resolve configurable voucher series by purpose", () => {
  const fixedNow = new Date("2026-03-22T09:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow,
    seedDemo: false
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });
  ledgerPlatform.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "H",
    description: "Paused payroll legacy series",
    status: "paused",
    purposeCodes: ["PAYROLL_RUN", "PAYROLL_CORRECTION", "PAYROLL_PAYOUT_MATCH"],
    actorId: "unit-test"
  });
  ledgerPlatform.upsertVoucherSeries({
    companyId: COMPANY_ID,
    seriesCode: "LON",
    description: "Payroll custom series",
    nextNumber: 800,
    purposeCodes: ["PAYROLL_RUN", "PAYROLL_CORRECTION", "PAYROLL_PAYOUT_MATCH"],
    actorId: "unit-test"
  });

  const bankingPlatform = createBankingPlatform({
    clock: () => fixedNow
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    ledgerPlatform,
    bankingPlatform
  });

  bankingPlatform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Payroll House Bank",
    ledgerAccountNumber: "1110",
    clearingNumber: "5000",
    accountNumber: "5566778899",
    isDefault: true,
    actorId: "unit-test"
  });

  const employee = createHourlyEmployee({
    hrPlatform,
    givenName: "Lina",
    familyName: "Ledger",
    identityValue: "19800112-1238",
    hourlyRate: 200
  });

  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 480,
    projectId: "project-demo-alpha",
    actorId: "unit-test"
  });
  timePlatform.approveTimeSet({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const run = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });

  const posting = payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  const postingJournal = ledgerPlatform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: posting.journalEntryId
  });

  const payoutBatch = payrollPlatform.createPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  const matchedBatch = payrollPlatform.matchPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payrollPayoutBatchId: payoutBatch.payrollPayoutBatchId,
    bankEventId: "bank-unit-payroll-series-202603",
    actorId: "unit-test"
  });
  const matchedJournal = ledgerPlatform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: matchedBatch.matchedJournalEntryId
  });

  assert.equal(postingJournal.voucherSeriesCode, "LON");
  assert.equal(matchedJournal.voucherSeriesCode, "LON");
});

function createHourlyEmployee({ hrPlatform, givenName, familyName, identityValue, hourlyRate }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll consultant",
    payModelCode: "hourly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate,
    currencyCode: "SEK",
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Payroll Employee Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
