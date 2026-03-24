import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { createIntegrationPlatform } from "../../packages/domain-integrations/src/index.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

const FIXED_NOW = new Date("2026-03-22T16:30:00Z");
const COMPANY_ID = DEMO_IDS.companyId;

test("Phase 12.2 builds tax declaration underlag and authority overviews from locked annual-report evidence", () => {
  const platform = createApiPlatform({
    clock: () => FIXED_NOW
  });

  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase12-2-unit"
  });

  const period = platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase12-2-unit"
  });

  postJournal(platform, "phase12-2-unit-income", 12000);
  materializeVatOverview(platform);
  materializePayrollAndAgiOverview(platform);
  materializeHusOverview(platform);

  platform.lockAccountingPeriod({
    companyId: COMPANY_ID,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId: "phase12-2-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });

  const annualPackage = platform.createAnnualReportPackage({
    companyId: COMPANY_ID,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k2",
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Phase 12.2 annual report",
      accounting_policies: "K2 policy baseline"
    },
    noteSections: {
      notes_bundle: "Annual notes",
      simplified_notes: "Simplified notes"
    }
  });

  const authorityOverview = platform.getAnnualAuthorityOverview({
    companyId: COMPANY_ID,
    packageId: annualPackage.packageId
  });
  assert.equal(authorityOverview.vat.runCount, 1);
  assert.equal(authorityOverview.agi.submissionCount, 1);
  assert.equal(authorityOverview.hus.claimCount, 1);
  assert.equal(authorityOverview.hus.totalApprovedAmount, 3000);
  assert.equal(authorityOverview.specialPayrollTax.snapshotCount, 1);
  assert.equal(authorityOverview.specialPayrollTax.specialPayrollTaxAmount > 0, true);
  assert.equal(authorityOverview.legalFormCode, "AKTIEBOLAG");
  assert.equal(authorityOverview.declarationProfileCode, "INK2");

  const taxPackage = platform.createTaxDeclarationPackage({
    companyId: COMPANY_ID,
    packageId: annualPackage.packageId,
    actorId: DEMO_IDS.userId
  });
  assert.equal(taxPackage.exports.length, 6);
  assert.deepEqual(
    taxPackage.exports.map((entry) => entry.exportCode),
    [
      "ink2_support_json",
      "sru_rows_csv",
      "vat_audit_overview_json",
      "agi_audit_overview_json",
      "hus_summary_json",
      "special_payroll_tax_json"
    ]
  );
  assert.equal(taxPackage.exports.every((entry) => entry.allChecksPassed), true);
  assert.equal(
    taxPackage.exports.find((entry) => entry.exportCode === "sru_rows_csv").content.includes("record_type;field_code;amount"),
    true
  );
  assert.equal(
    taxPackage.exports.find((entry) => entry.exportCode === "agi_audit_overview_json").payload.overview.totalCashCompensationAmount > 0,
    true
  );

  const second = platform.createTaxDeclarationPackage({
    companyId: COMPANY_ID,
    packageId: annualPackage.packageId,
    actorId: DEMO_IDS.userId
  });
  assert.equal(second.taxDeclarationPackageId, taxPackage.taxDeclarationPackageId);
  assert.equal(second.outputChecksum, taxPackage.outputChecksum);
});

test("Phase 12.2 submission engine separates accepted from finalized and deduplicates identical receipts", () => {
  const integrationPlatform = createIntegrationPlatform({
    clock: () => FIXED_NOW
  });

  let submission = integrationPlatform.prepareAuthoritySubmission({
    companyId: "company-1",
    submissionType: "income_tax_return",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-1",
    payloadVersion: "phase12.2",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    payload: {
      exportCode: "ink_support_json",
      checksum: "phase12-2-underlag"
    },
    actorId: "phase12-2-unit"
  });

  submission = integrationPlatform.signAuthoritySubmission({
    companyId: "company-1",
    submissionId: submission.submissionId,
    actorId: "phase12-2-unit"
  });
  submission = integrationPlatform.submitAuthoritySubmission({
    companyId: "company-1",
    submissionId: submission.submissionId,
    actorId: "phase12-2-unit",
    simulatedTransportOutcome: "technical_ack"
  });
  submission = integrationPlatform.registerSubmissionReceipt({
    companyId: "company-1",
    submissionId: submission.submissionId,
    receiptType: "business_ack",
    rawReference: "ref-1",
    actorId: "phase12-2-unit"
  });
  submission = integrationPlatform.registerSubmissionReceipt({
    companyId: "company-1",
    submissionId: submission.submissionId,
    receiptType: "business_ack",
    rawReference: "ref-1",
    actorId: "phase12-2-unit"
  });
  assert.equal(submission.status, "accepted");
  assert.equal(submission.receipts.length, 2);
  assert.equal(typeof submission.acceptedAt, "string");

  submission = integrationPlatform.registerSubmissionReceipt({
    companyId: "company-1",
    submissionId: submission.submissionId,
    receiptType: "final_ack",
    rawReference: "ref-2",
    actorId: "phase12-2-unit"
  });
  assert.equal(submission.status, "finalized");
  assert.equal(submission.receipts.length, 3);
});

test("Phase 12.2 submission engine routes transport failures into action queue and blocks forbidden retry", () => {
  const integrationPlatform = createIntegrationPlatform({
    clock: () => FIXED_NOW
  });

  let submission = integrationPlatform.prepareAuthoritySubmission({
    companyId: "company-2",
    submissionType: "vat_declaration",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-2",
    payloadVersion: "phase12.2",
    providerKey: "skatteverket",
    recipientId: "skatteverket:vat",
    payload: {
      exportCode: "vat_audit_overview_json"
    },
    signedState: "not_required",
    retryClass: "forbidden",
    actorId: "phase12-2-unit"
  });

  submission = integrationPlatform.submitAuthoritySubmission({
    companyId: "company-2",
    submissionId: submission.submissionId,
    actorId: "phase12-2-unit",
    simulatedTransportOutcome: "transport_failed"
  });

  assert.equal(submission.status, "transport_failed");
  assert.equal(submission.actionQueueItems.length, 1);
  assert.equal(submission.actionQueueItems[0].actionType, "retry");
  assert.throws(
    () =>
      integrationPlatform.retryAuthoritySubmission({
        companyId: "company-2",
        submissionId: submission.submissionId,
        actorId: "phase12-2-unit"
      }),
    (error) => error?.code === "submission_retry_forbidden"
  );
});

function materializeVatOverview(platform) {
  platform.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "phase12-2-unit",
    transactionLine: {
      seller_country: "SE",
      seller_vat_registration_country: "SE",
      buyer_country: "SE",
      buyer_type: "business",
      buyer_vat_no: "SE556677889901",
      buyer_is_taxable_person: true,
      buyer_vat_number: "SE556677889901",
      buyer_vat_number_status: "valid",
      supply_type: "sale",
      goods_or_services: "goods",
      supply_subtype: "standard",
      property_related_flag: false,
      construction_service_flag: false,
      transport_end_country: "SE",
      import_flag: false,
      export_flag: false,
      reverse_charge_flag: false,
      oss_flag: false,
      ioss_flag: false,
      currency: "SEK",
      tax_date: "2026-03-21",
      invoice_date: "2026-03-21",
      delivery_date: "2026-03-21",
      prepayment_date: "2026-03-21",
      line_amount_ex_vat: 1000,
      line_discount: 0,
      line_quantity: 1,
      line_uom: "ea",
      vat_rate: 25,
      tax_rate_candidate: 25,
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      exemption_reason: "not_applicable",
      invoice_text_code: "domestic_standard",
      report_box_code: "05",
      project_id: "00000000-0000-4000-8000-000000000041",
      source_type: "AR_INVOICE",
      source_id: "phase12-2-vat"
    }
  });

  platform.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "phase12-2-unit",
    signer: "phase12-2-signer"
  });
}

function materializePayrollAndAgiOverview(platform) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Ari",
    familyName: "Annual",
    identityType: "personnummer",
    identityValue: "19850412-1234",
    workEmail: "ari.annual@example.com",
    actorId: "phase12-2-unit"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Controller",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "phase12-2-unit"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary: 42000,
    currencyCode: "SEK",
    actorId: "phase12-2-unit"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Ari Annual",
    clearingNumber: "5000",
    accountNumber: "1234500001",
    bankName: "Phase 12 Test Bank",
    primaryAccount: true,
    actorId: "phase12-2-unit"
  });
  platform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    taxMode: "manual_rate",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "phase12-2-unit"
  });
  platform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    planCode: "ITP1",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 4.5,
    actorId: "phase12-2-unit"
  });
  platform.listPayrollPensionPayloads({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603",
    periodStartsOn: "2026-03-01",
    periodEndsOn: "2026-03-31",
    contractMonthlySalary: 42000,
    grossCompensationBeforeDeductions: 42000,
    pensionableBaseBeforeExchange: 42000,
    actorId: "phase12-2-unit"
  });

  const payCalendar = platform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = platform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "phase12-2-unit"
  });
  platform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "phase12-2-unit"
  });

  const agiSubmission = platform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "phase12-2-unit"
  });
  platform.validateAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: agiSubmission.agiSubmissionId
  });
  platform.markAgiSubmissionReadyForSign({
    companyId: COMPANY_ID,
    agiSubmissionId: agiSubmission.agiSubmissionId,
    actorId: "phase12-2-unit"
  });
  platform.submitAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: agiSubmission.agiSubmissionId,
    actorId: "phase12-2-unit",
    simulatedOutcome: "accepted"
  });
}

function materializeHusOverview(platform) {
  const husCase = platform.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-12-2-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:23",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase12-2-unit"
  });
  platform.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Anna Andersson",
        personalIdentityNumber: "197501019999",
        allocationPercent: 100
      }
    ],
    serviceLines: [
      {
        description: "ROT labor and material",
        serviceTypeCode: "rot",
        workedHours: 8,
        laborCostAmount: 10000,
        materialAmount: 5000
      }
    ],
    actorId: "phase12-2-unit"
  });
  platform.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-12-2-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "phase12-2-unit"
  });
  platform.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 12000,
    paidOn: "2026-03-15",
    paymentChannel: "bankgiro",
    paymentReference: "BG-12-2-001",
    actorId: "phase12-2-unit"
  });
  const claim = platform.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "phase12-2-unit"
  });
  platform.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "phase12-2-unit"
  });
  platform.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-18",
    approvedAmount: 3000,
    reasonCode: "accepted",
    actorId: "phase12-2-unit"
  });
}

function postJournal(platform, sourceId, amount) {
  const created = platform.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-01-15",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "phase12-2-unit",
    idempotencyKey: sourceId,
    lines: [
      { accountNumber: "1510", debitAmount: amount },
      { accountNumber: "3010", creditAmount: amount }
    ]
  });
  platform.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-2-unit"
  });
  platform.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-2-unit"
  });
}
