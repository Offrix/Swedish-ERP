import test from "node:test";
import assert from "node:assert/strict";
import { createAccountingMethodEngine } from "../../packages/domain-accounting-method/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";

test("Step 7 accounting method eligibility blocks high turnover and excluded entities", () => {
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    clock: () => new Date("2027-01-05T09:00:00Z")
  });

  const turnoverBlocked = engine.assessCashMethodEligibility({
    companyId: "company_turnover",
    annualNetTurnoverSek: 3_500_000,
    legalFormCode: "AB"
  });
  const entityBlocked = engine.assessCashMethodEligibility({
    companyId: "company_financial",
    annualNetTurnoverSek: 250_000,
    legalFormCode: "AB",
    financialEntityClassification: "CREDIT_INSTITUTION"
  });

  assert.equal(turnoverBlocked.eligibleForCashMethod, false);
  assert.deepEqual(turnoverBlocked.blockingReasons, ["net_turnover_exceeds_cash_method_limit"]);
  assert.equal(entityBlocked.eligibleForCashMethod, false);
  assert.deepEqual(entityBlocked.blockingReasons, ["financial_entity_excluded"]);
});

test("Step 7 accounting method profiles switch deterministically across a fiscal-year boundary", () => {
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    clock: () => new Date("2027-01-05T09:00:00Z")
  });

  const baselineAssessment = engine.assessCashMethodEligibility({
    companyId: "company_profile",
    annualNetTurnoverSek: 1_200_000,
    legalFormCode: "AB"
  });
  const baselineProfile = engine.createMethodProfile({
    companyId: "company_profile",
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: baselineAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "tester"
  });
  engine.activateMethodProfile({
    companyId: "company_profile",
    methodProfileId: baselineProfile.methodProfileId,
    actorId: "tester"
  });

  const cashAssessment = engine.assessCashMethodEligibility({
    companyId: "company_profile",
    annualNetTurnoverSek: 950_000,
    legalFormCode: "AB"
  });
  const changeRequest = engine.submitMethodChangeRequest({
    companyId: "company_profile",
    requestedMethodCode: "KONTANTMETOD",
    requestedEffectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    reasonCode: "METHOD_CHANGE",
    actorId: "tester"
  });
  engine.approveMethodChangeRequest({
    companyId: "company_profile",
    methodChangeRequestId: changeRequest.methodChangeRequestId,
    actorId: "approver"
  });
  const cashProfile = engine.createMethodProfile({
    companyId: "company_profile",
    methodCode: "KONTANTMETOD",
    effectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    eligibilityAssessmentId: cashAssessment.assessmentId,
    methodChangeRequestId: changeRequest.methodChangeRequestId,
    actorId: "tester"
  });
  engine.activateMethodProfile({
    companyId: "company_profile",
    methodProfileId: cashProfile.methodProfileId,
    actorId: "approver"
  });

  const preChangeMethod = engine.getActiveMethodForDate({
    companyId: "company_profile",
    accountingDate: "2026-06-15"
  });
  const postChangeMethod = engine.getActiveMethodForDate({
    companyId: "company_profile",
    accountingDate: "2027-01-05"
  });

  assert.equal(preChangeMethod.methodCode, "FAKTURERINGSMETOD");
  assert.equal(postChangeMethod.methodCode, "KONTANTMETOD");
  assert.equal(postChangeMethod.timingMode, "payment_date_with_year_end_catch_up");
  assert.equal(engine.listMethodChangeRequests({ companyId: "company_profile" })[0].status, "implemented");
});

test("Step 7 accounting method exposes executable directives for AR/AP recognition timing", () => {
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    clock: () => new Date("2027-01-05T09:00:00Z")
  });

  const baselineAssessment = engine.assessCashMethodEligibility({
    companyId: "company_policy_runtime",
    annualNetTurnoverSek: 1_200_000,
    legalFormCode: "AB"
  });
  const baselineProfile = engine.createMethodProfile({
    companyId: "company_policy_runtime",
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: baselineAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "tester"
  });
  engine.activateMethodProfile({
    companyId: "company_policy_runtime",
    methodProfileId: baselineProfile.methodProfileId,
    actorId: "tester"
  });

  const invoiceMethodPolicy = engine.getActiveMethodPolicy({
    companyId: "company_policy_runtime",
    accountingDate: "2026-06-15"
  });
  const invoiceIssueDirective = engine.resolveExecutionDirective({
    companyId: "company_policy_runtime",
    accountingDate: "2026-06-15",
    eventCode: "AR_INVOICE_ISSUE"
  });

  const cashAssessment = engine.assessCashMethodEligibility({
    companyId: "company_policy_runtime",
    annualNetTurnoverSek: 950_000,
    legalFormCode: "AB"
  });
  const cashChangeRequest = engine.submitMethodChangeRequest({
    companyId: "company_policy_runtime",
    requestedMethodCode: "KONTANTMETOD",
    requestedEffectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    reasonCode: "METHOD_CHANGE",
    actorId: "tester"
  });
  engine.approveMethodChangeRequest({
    companyId: "company_policy_runtime",
    methodChangeRequestId: cashChangeRequest.methodChangeRequestId,
    actorId: "approver"
  });
  const cashProfile = engine.createMethodProfile({
    companyId: "company_policy_runtime",
    methodCode: "KONTANTMETOD",
    effectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    eligibilityAssessmentId: cashAssessment.assessmentId,
    methodChangeRequestId: cashChangeRequest.methodChangeRequestId,
    actorId: "tester"
  });
  engine.activateMethodProfile({
    companyId: "company_policy_runtime",
    methodProfileId: cashProfile.methodProfileId,
    actorId: "approver"
  });

  const cashMethodPolicy = engine.getActiveMethodPolicy({
    companyId: "company_policy_runtime",
    accountingDate: "2027-02-10"
  });
  const cashIssueDirective = engine.resolveExecutionDirective({
    companyId: "company_policy_runtime",
    accountingDate: "2027-02-10",
    eventCode: "AR_INVOICE_ISSUE"
  });
  const cashPaymentDirective = engine.resolveExecutionDirective({
    companyId: "company_policy_runtime",
    accountingDate: "2027-02-10",
    eventCode: "AR_PAYMENT_ALLOCATION"
  });
  const cashApDirective = engine.resolveExecutionDirective({
    companyId: "company_policy_runtime",
    accountingDate: "2027-02-10",
    eventCode: "AP_PAYMENT_SETTLEMENT"
  });
  const cashYearEndDirective = engine.resolveExecutionDirective({
    companyId: "company_policy_runtime",
    accountingDate: "2027-12-31",
    eventCode: "YEAR_END_CATCH_UP"
  });

  assert.equal(invoiceMethodPolicy.methodCode, "FAKTURERINGSMETOD");
  assert.equal(invoiceMethodPolicy.arInvoiceRecognitionTrigger, "AR_INVOICE_ISSUE");
  assert.equal(invoiceMethodPolicy.yearEndCatchUpRequired, false);
  assert.equal(invoiceIssueDirective.primaryRecognitionRequired, true);
  assert.equal(invoiceIssueDirective.vatDecisionRequired, true);
  assert.equal(invoiceIssueDirective.ledgerOperationalPostingRequired, true);

  assert.equal(cashMethodPolicy.methodCode, "KONTANTMETOD");
  assert.equal(cashMethodPolicy.arInvoiceRecognitionTrigger, "AR_PAYMENT_ALLOCATION");
  assert.equal(cashMethodPolicy.apInvoiceRecognitionTrigger, "AP_PAYMENT_SETTLEMENT");
  assert.equal(cashMethodPolicy.yearEndCatchUpRequired, true);
  assert.equal(cashIssueDirective.primaryRecognitionRequired, false);
  assert.equal(cashIssueDirective.vatDecisionRequired, false);
  assert.equal(cashIssueDirective.ledgerOperationalPostingRequired, false);
  assert.equal(cashPaymentDirective.primaryRecognitionRequired, true);
  assert.equal(cashPaymentDirective.vatDecisionRequired, true);
  assert.equal(cashPaymentDirective.ledgerOperationalPostingRequired, true);
  assert.equal(cashApDirective.primaryRecognitionRequired, true);
  assert.equal(cashApDirective.vatDecisionRequired, true);
  assert.equal(cashYearEndDirective.primaryRecognitionRequired, true);
  assert.equal(cashYearEndDirective.vatDecisionRequired, true);
  assert.equal(cashYearEndDirective.ledgerOperationalPostingRequired, true);
});

test("Step 7 year-end catch-up is idempotent and only allowed for cash method", () => {
  let ledger = null;
  let vat = null;
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    clock: () => new Date("2027-12-31T15:00:00Z"),
    getLedgerPlatform: () => ledger,
    getVatPlatform: () => vat
  });
  ledger = createLedgerPlatform({
    seedDemo: false,
    clock: () => new Date("2027-12-31T15:00:00Z"),
    accountingMethodPlatform: engine
  });
  vat = createVatPlatform({
    seedDemo: false,
    clock: () => new Date("2027-12-31T15:00:00Z"),
    ledgerPlatform: ledger
  });
  ledger.installLedgerCatalog({
    companyId: "company_catchup",
    actorId: "tester"
  });
  vat.installVatCatalog({
    companyId: "company_catchup",
    actorId: "tester"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: "company_catchup",
    fiscalYear: 2027,
    actorId: "tester"
  });

  const cashAssessment = engine.assessCashMethodEligibility({
    companyId: "company_catchup",
    annualNetTurnoverSek: 750_000,
    legalFormCode: "AB"
  });
  const cashProfile = engine.createMethodProfile({
    companyId: "company_catchup",
    methodCode: "KONTANTMETOD",
    effectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    eligibilityAssessmentId: cashAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "tester"
  });
  engine.activateMethodProfile({
    companyId: "company_catchup",
    methodProfileId: cashProfile.methodProfileId,
    actorId: "approver"
  });

  const firstRun = engine.runYearEndCatchUp({
    companyId: "company_catchup",
    fiscalYearEndDate: "2027-12-31",
    openItems: [
      {
        openItemType: "customer_invoice",
        sourceId: "inv_1",
        openItemAccountNumber: "1210",
        unpaidAmount: 1250,
        recognitionDate: "2027-12-15",
        vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
          supply_type: "sale",
          goods_or_services: "goods",
          invoice_date: "2027-12-15",
          line_amount_ex_vat: 1000,
          vat_rate: 25,
          tax_rate_candidate: 25,
          vat_code_candidate: "VAT_SE_DOMESTIC_25",
          report_box_code: "05"
        }),
        postingLines: [
          { accountNumber: "3010", creditAmount: 1000 },
          { accountNumber: "2610", creditAmount: 250 }
        ]
      },
      {
        openItemType: "supplier_invoice",
        sourceId: "sup_1",
        openItemAccountNumber: "2410",
        unpaidAmount: 400,
        recognitionDate: "2027-12-20",
        vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
          supply_type: "purchase",
          goods_or_services: "services",
          invoice_date: "2027-12-20",
          line_amount_ex_vat: 320,
          vat_rate: 25,
          tax_rate_candidate: 25,
          vat_code_candidate: "VAT_SE_DOMESTIC_PURCHASE_25",
          report_box_code: "48"
        }),
        postingLines: [
          { accountNumber: "5410", debitAmount: 320 },
          { accountNumber: "2640", debitAmount: 80 }
        ]
      }
    ],
    actorId: "tester"
  });
  const replayRun = engine.runYearEndCatchUp({
    companyId: "company_catchup",
    fiscalYearEndDate: "2027-12-31",
    openItems: [
      {
        openItemType: "customer_invoice",
        sourceId: "inv_1",
        openItemAccountNumber: "1210",
        unpaidAmount: 1250,
        recognitionDate: "2027-12-15",
        vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
          supply_type: "sale",
          goods_or_services: "goods",
          invoice_date: "2027-12-15",
          line_amount_ex_vat: 1000,
          vat_rate: 25,
          tax_rate_candidate: 25,
          vat_code_candidate: "VAT_SE_DOMESTIC_25",
          report_box_code: "05"
        }),
        postingLines: [
          { accountNumber: "3010", creditAmount: 1000 },
          { accountNumber: "2610", creditAmount: 250 }
        ]
      },
      {
        openItemType: "supplier_invoice",
        sourceId: "sup_1",
        openItemAccountNumber: "2410",
        unpaidAmount: 400,
        recognitionDate: "2027-12-20",
        vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
          supply_type: "purchase",
          goods_or_services: "services",
          invoice_date: "2027-12-20",
          line_amount_ex_vat: 320,
          vat_rate: 25,
          tax_rate_candidate: 25,
          vat_code_candidate: "VAT_SE_DOMESTIC_PURCHASE_25",
          report_box_code: "48"
        }),
        postingLines: [
          { accountNumber: "5410", debitAmount: 320 },
          { accountNumber: "2640", debitAmount: 80 }
        ]
      }
    ],
    actorId: "tester"
  });
  const decemberBasisAfterCatchUp = vat.getVatDeclarationBasis({
    companyId: "company_catchup",
    fromDate: "2027-12-01",
    toDate: "2027-12-31"
  });
  const catchUpJournal = ledger.getJournalEntry({
    companyId: "company_catchup",
    journalEntryId: firstRun.journalEntryId
  });
  const reversedRun = engine.reverseYearEndCatchUpRun({
    companyId: "company_catchup",
    yearEndCatchUpRunId: firstRun.yearEndCatchUpRunId,
    reasonCode: "year_end_reversal",
    actorId: "tester",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const decemberBasisAfterReversal = vat.getVatDeclarationBasis({
    companyId: "company_catchup",
    fromDate: "2027-12-01",
    toDate: "2027-12-31"
  });

  assert.equal(firstRun.yearEndCatchUpRunId, replayRun.yearEndCatchUpRunId);
  assert.equal(typeof firstRun.journalEntryId, "string");
  assert.equal(firstRun.vatDecisionIds.length, 2);
  assert.equal(firstRun.items[0].vatDecisionIds.length, 1);
  assert.equal(firstRun.items[1].vatDecisionIds.length, 1);
  assert.equal(catchUpJournal.sourceType, "YEAR_END_TRANSFER");
  assert.equal(catchUpJournal.lines.some((line) => line.accountNumber === "1210" && Number(line.debitAmount) === 1250), true);
  assert.equal(catchUpJournal.lines.some((line) => line.accountNumber === "2410" && Number(line.creditAmount) === 400), true);
  assert.deepEqual(firstRun.totals, {
    receivablesAmount: 1250,
    payablesAmount: 400
  });
  assert.equal(decemberBasisAfterCatchUp.decisionCount, 2);
  assert.equal(decemberBasisAfterCatchUp.declarationEligibleDecisionCount, 2);
  assert.deepEqual(decemberBasisAfterCatchUp.declarationBoxSummary, [
    { boxCode: "05", amount: 1000, amountType: "taxable_base" },
    { boxCode: "10", amount: 250, amountType: "output_vat" },
    { boxCode: "48", amount: 80, amountType: "input_vat" }
  ]);
  assert.equal(reversedRun.status, "reversed");
  assert.equal(typeof reversedRun.reversalJournalEntryId, "string");
  assert.equal(reversedRun.reversalVatDecisionIds.length, 2);
  assert.equal(reversedRun.items[0].reversalVatDecisionIds.length, 1);
  assert.equal(reversedRun.items[1].reversalVatDecisionIds.length, 1);
  assert.equal(decemberBasisAfterReversal.decisionCount, 4);
  assert.equal(decemberBasisAfterReversal.declarationEligibleDecisionCount, 4);
  assert.deepEqual(decemberBasisAfterReversal.declarationBoxSummary, [
    { boxCode: "05", amount: 0, amountType: "taxable_base" },
    { boxCode: "10", amount: 0, amountType: "output_vat" },
    { boxCode: "48", amount: 0, amountType: "input_vat" }
  ]);
});

test("Step 7 accounting method requires explicit fiscal-year boundary unless onboarding override is used", () => {
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    clock: () => new Date("2027-01-05T09:00:00Z")
  });

  const assessment = engine.assessCashMethodEligibility({
    companyId: "company_boundary_rules",
    annualNetTurnoverSek: 900_000,
    legalFormCode: "AB"
  });

  assert.throws(
    () =>
      engine.submitMethodChangeRequest({
        companyId: "company_boundary_rules",
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        reasonCode: "METHOD_CHANGE",
        actorId: "tester"
      }),
    (error) => error?.code === "method_change_request_fiscal_year_start_required"
  );

  assert.throws(
    () =>
      engine.createMethodProfile({
        companyId: "company_boundary_rules",
        methodCode: "FAKTURERINGSMETOD",
        effectiveFrom: "2026-01-01",
        eligibilityAssessmentId: assessment.assessmentId,
        actorId: "tester"
      }),
    (error) => error?.code === "method_profile_fiscal_year_start_required"
  );
});

test("Step 7 accounting method supersedes older unresolved change requests for the same fiscal-year boundary", () => {
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    clock: () => new Date("2027-01-05T09:00:00Z")
  });

  const baselineAssessment = engine.assessCashMethodEligibility({
    companyId: "company_request_supersession",
    annualNetTurnoverSek: 1_100_000,
    legalFormCode: "AB"
  });
  const baselineProfile = engine.createMethodProfile({
    companyId: "company_request_supersession",
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: baselineAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "tester"
  });
  engine.activateMethodProfile({
    companyId: "company_request_supersession",
    methodProfileId: baselineProfile.methodProfileId,
    actorId: "tester"
  });

  const firstRequest = engine.submitMethodChangeRequest({
    companyId: "company_request_supersession",
    requestedMethodCode: "KONTANTMETOD",
    requestedEffectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    reasonCode: "METHOD_CHANGE",
    actorId: "tester"
  });
  const replacementRequest = engine.submitMethodChangeRequest({
    companyId: "company_request_supersession",
    requestedMethodCode: "KONTANTMETOD",
    requestedEffectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    reasonCode: "METHOD_CHANGE_REVISED",
    actorId: "tester"
  });

  const history = engine.getMethodHistory({
    companyId: "company_request_supersession"
  });
  const superseded = history.changeRequests.find((request) => request.methodChangeRequestId === firstRequest.methodChangeRequestId);
  const latest = history.changeRequests.find((request) => request.methodChangeRequestId === replacementRequest.methodChangeRequestId);

  assert.equal(superseded.status, "superseded");
  assert.equal(superseded.supersededByMethodChangeRequestId, replacementRequest.methodChangeRequestId);
  assert.equal(latest.status, "submitted");
});

function buildYearEndCatchUpVatTransactionLine(overrides = {}) {
  return {
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
    tax_date: "2027-12-31",
    invoice_date: "2027-12-31",
    delivery_date: "2027-12-31",
    prepayment_date: null,
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
    ...overrides
  };
}
