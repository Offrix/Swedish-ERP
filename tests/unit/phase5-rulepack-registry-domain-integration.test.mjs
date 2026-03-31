import test from "node:test";
import assert from "node:assert/strict";
import { createRulePackRegistry } from "../../packages/rule-engine/src/index.mjs";
import {
  createAccountingMethodEngine,
  ACCOUNTING_METHOD_RULEPACK_CODE
} from "../../packages/domain-accounting-method/src/index.mjs";
import {
  createFiscalYearEngine,
  FISCAL_YEAR_RULEPACK_CODE
} from "../../packages/domain-fiscal-year/src/index.mjs";
import {
  createLegalFormEngine,
  LEGAL_FORM_RULEPACK_CODE,
  ANNUAL_FILING_RULEPACK_CODE
} from "../../packages/domain-legal-form/src/index.mjs";
import {
  createHusPlatform,
  HUS_RULEPACK_CODE
} from "../../packages/domain-hus/src/index.mjs";
import { createTaxAccountEngine } from "../../packages/domain-tax-account/src/index.mjs";
import {
  TAX_ACCOUNT_RULEPACK_CODE,
  TAX_ACCOUNT_OFFSET_RULEPACK_CODE
} from "../../packages/domain-tax-account/src/constants.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";

const TEST_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

function buildRulePack({
  rulePackId,
  rulePackCode,
  domain,
  effectiveFrom,
  effectiveTo = null,
  version,
  checksum = null,
  machineReadableRules = {}
}) {
  return {
    rulePackId,
    rulePackCode,
    domain,
    jurisdiction: "SE",
    effectiveFrom,
    effectiveTo,
    version,
    checksum: checksum || rulePackId,
    sourceSnapshotDate: "2026-03-24",
    semanticChangeSummary: `${rulePackId} summary`,
    machineReadableRules,
    humanReadableExplanation: [],
    testVectors: [],
    migrationNotes: []
  };
}

test("phase 5.1 accounting-method pins registry rulepacks by assessment and effective date", () => {
  let ledger = null;
  const registry = createRulePackRegistry({
    seedRulePacks: [
      buildRulePack({
        rulePackId: "accounting-method-se-2026.9",
        rulePackCode: ACCOUNTING_METHOD_RULEPACK_CODE,
        domain: "accounting_method",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2027-01-01",
        version: "2026.9"
      }),
      buildRulePack({
        rulePackId: "accounting-method-se-2027.1",
        rulePackCode: ACCOUNTING_METHOD_RULEPACK_CODE,
        domain: "accounting_method",
        effectiveFrom: "2027-01-01",
        version: "2027.1"
      })
    ]
  });
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    ruleRegistry: registry,
    clock: () => new Date("2027-01-05T09:00:00Z"),
    getLedgerPlatform: () => ledger
  });
  ledger = createLedgerPlatform({
    seedDemo: false,
    accountingMethodPlatform: engine,
    clock: () => new Date("2027-12-31T09:00:00Z")
  });
  ledger.installLedgerCatalog({
    companyId: "company_accounting_method",
    actorId: "tester"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: "company_accounting_method",
    fiscalYear: 2027,
    actorId: "tester"
  });

  const assessment2026 = engine.assessCashMethodEligibility({
    companyId: "company_accounting_method",
    assessmentDate: "2026-12-15",
    annualNetTurnoverSek: 1_000_000,
    legalFormCode: "AB"
  });
  const assessment2027 = engine.assessCashMethodEligibility({
    companyId: "company_accounting_method",
    assessmentDate: "2027-01-02",
    annualNetTurnoverSek: 900_000,
    legalFormCode: "AB"
  });

  const profile2027 = engine.createMethodProfile({
    companyId: "company_accounting_method",
    methodCode: "KONTANTMETOD",
    effectiveFrom: "2027-01-01",
    fiscalYearStartDate: "2027-01-01",
    eligibilityAssessmentId: assessment2027.assessmentId,
    onboardingOverride: true,
    actorId: "tester"
  });
  engine.activateMethodProfile({
    companyId: "company_accounting_method",
    methodProfileId: profile2027.methodProfileId,
    actorId: "tester"
  });
  const catchUp = engine.runYearEndCatchUp({
    companyId: "company_accounting_method",
    fiscalYearEndDate: "2027-12-31",
    openItems: [
      {
        openItemType: "customer_invoice",
        sourceId: "inv_1",
        openItemAccountNumber: "1210",
        unpaidAmount: 500,
        recognitionDate: "2027-12-20",
        postingLines: [
          { accountNumber: "3010", creditAmount: 400 },
          { accountNumber: "2610", creditAmount: 100 }
        ]
      }
    ],
    actorId: "tester"
  });

  assert.equal(assessment2026.rulepackId, "accounting-method-se-2026.9");
  assert.equal(assessment2027.rulepackId, "accounting-method-se-2027.1");
  assert.equal(profile2027.rulepackId, "accounting-method-se-2027.1");
  assert.equal(profile2027.eligibilitySnapshot.rulepackId, "accounting-method-se-2027.1");
  assert.equal(catchUp.rulepackId, "accounting-method-se-2027.1");
  assert.equal(typeof catchUp.journalEntryId, "string");
});

test("phase 5.1 fiscal-year pins registry rulepacks on profile, request and fiscal year", () => {
  const registry = createRulePackRegistry({
    seedRulePacks: [
      buildRulePack({
        rulePackId: "fiscal-year-se-2026.4",
        rulePackCode: FISCAL_YEAR_RULEPACK_CODE,
        domain: "fiscal_year",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2027-01-01",
        version: "2026.4"
      }),
      buildRulePack({
        rulePackId: "fiscal-year-se-2027.1",
        rulePackCode: FISCAL_YEAR_RULEPACK_CODE,
        domain: "fiscal_year",
        effectiveFrom: "2027-01-01",
        version: "2027.1"
      })
    ]
  });
  const engine = createFiscalYearEngine({
    seedDemo: false,
    ruleRegistry: registry,
    clock: () => new Date("2026-06-01T09:00:00Z")
  });

  const profile = engine.createFiscalYearProfile({
    companyId: "company_fiscal_year",
    legalFormCode: "AKTIEBOLAG",
    actorId: "tester"
  });
  const request = engine.submitFiscalYearChangeRequest({
    companyId: "company_fiscal_year",
    requestedStartDate: "2027-01-01",
    requestedEndDate: "2027-12-31",
    reasonCode: "BASELINE",
    actorId: "tester"
  });
  engine.approveFiscalYearChangeRequest({
    companyId: "company_fiscal_year",
    changeRequestId: request.changeRequestId,
    actorId: "approver"
  });
  const fiscalYear = engine.createFiscalYear({
    companyId: "company_fiscal_year",
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    approvalBasisCode: "BASELINE",
    changeRequestId: request.changeRequestId,
    actorId: "tester"
  });

  assert.equal(profile.rulepackId, "fiscal-year-se-2026.4");
  assert.equal(request.rulepackId, "fiscal-year-se-2027.1");
  assert.equal(fiscalYear.rulepackId, "fiscal-year-se-2027.1");
});

test("phase 5.1 legal-form and annual-obligation profiles resolve separate rulepack families", () => {
  const registry = createRulePackRegistry({
    seedRulePacks: [
      buildRulePack({
        rulePackId: "legal-form-se-2027.1",
        rulePackCode: LEGAL_FORM_RULEPACK_CODE,
        domain: "legal_form",
        effectiveFrom: "2027-01-01",
        version: "2027.1"
      }),
      buildRulePack({
        rulePackId: "annual-filing-se-2027.1",
        rulePackCode: ANNUAL_FILING_RULEPACK_CODE,
        domain: "annual_filing",
        effectiveFrom: "2027-01-01",
        version: "2027.1"
      })
    ]
  });
  const engine = createLegalFormEngine({
    seedDemo: false,
    ruleRegistry: registry,
    clock: () => new Date("2027-01-05T09:00:00Z")
  });

  const profile = engine.createLegalFormProfile({
    companyId: "company_legal_form",
    legalFormCode: "AKTIEBOLAG",
    effectiveFrom: "2027-01-01",
    actorId: "tester"
  });
  const obligation = engine.createReportingObligationProfile({
    companyId: "company_legal_form",
    legalFormProfileId: profile.legalFormProfileId,
    fiscalYearKey: "2027",
    requiresAnnualReport: true,
    requiresYearEndAccounts: false,
    requiresBolagsverketFiling: true,
    requiresTaxDeclarationPackage: true,
    actorId: "tester"
  });

  assert.equal(profile.rulepackId, "legal-form-se-2027.1");
  assert.equal(obligation.rulepackId, "annual-filing-se-2027.1");
});

test("phase 5.1 HUS pins rulepack refs on case, claim and decision", () => {
  const registry = createRulePackRegistry({
    seedRulePacks: [
      buildRulePack({
        rulePackId: "hus-se-2027.1",
        rulePackCode: HUS_RULEPACK_CODE,
        domain: "hus",
        effectiveFrom: "2027-01-01",
        version: "2027.1",
        machineReadableRules: { ruleYear: 2027 }
      })
    ]
  });
  const hus = createHusPlatform({
    ruleRegistry: registry,
    clock: () => new Date("2027-03-24T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: TEST_COMPANY_ID,
    caseReference: "HUS-5-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2027-03-10",
    ruleYear: 2027,
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:23",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2027-03-01",
    actorId: "tester"
  });
  hus.classifyHusCase({
    companyId: TEST_COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [{ displayName: "Anna Andersson", personalIdentityNumber: "197501019991", allocationPercent: 100 }],
    serviceLines: [{ description: "ROT labor", serviceTypeCode: "rot", workedHours: 8, laborCostAmount: 10000 }],
    actorId: "tester"
  });
  hus.markHusCaseInvoiced({
    companyId: TEST_COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-5-INV-001",
    invoiceIssuedOn: "2027-03-11",
    actorId: "tester"
  });
  hus.recordHusCustomerPayment({
    companyId: TEST_COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 5000,
    paidOn: "2027-03-15",
    paymentChannel: "bankgiro",
    paymentReference: "BG-5-001",
    actorId: "tester"
  });
  const claim = hus.createHusClaim({
    companyId: TEST_COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "tester"
  });
  hus.submitHusClaim({
    companyId: TEST_COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2027-03-16",
    actorId: "tester"
  });
  const decision = hus.recordHusDecision({
    companyId: TEST_COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2027-03-18",
    approvedAmount: claim.requestedAmount,
    reasonCode: "accepted",
    actorId: "tester"
  });

  assert.equal(husCase.rulepackId, "hus-se-2027.1");
  assert.equal(claim.rulepackId, "hus-se-2027.1");
  assert.equal(decision.husDecision.rulepackId, "hus-se-2027.1");
});

test("phase 5.1 tax-account pins mapping and offset rulepacks on liabilities, suggestions and approvals", () => {
  const registry = createRulePackRegistry({
    seedRulePacks: [
      buildRulePack({
        rulePackId: "tax-account-mapping-se-2027.1",
        rulePackCode: TAX_ACCOUNT_RULEPACK_CODE,
        domain: "tax_account",
        effectiveFrom: "2027-01-01",
        version: "2027.1"
      }),
      buildRulePack({
        rulePackId: "tax-account-offset-se-2027.1",
        rulePackCode: TAX_ACCOUNT_OFFSET_RULEPACK_CODE,
        domain: "tax_account",
        effectiveFrom: "2027-01-01",
        version: "2027.1"
      })
    ]
  });
  const engine = createTaxAccountEngine({
    clock: () => new Date("2027-03-24T10:00:00Z"),
    seedDemo: false,
    ruleRegistry: registry
  });
  const companyId = "company_tax_rulepack";

  const expectedLiability = engine.registerExpectedTaxLiability({
    companyId,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_run_2027_02",
    sourceReference: "VAT-2027-02",
    periodKey: "2027-02",
    dueDate: "2027-03-12",
    amount: 12500,
    actorId: "user_1"
  });
  engine.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2027-03-24",
    events: [
      {
        eventTypeCode: "VAT_ASSESSMENT",
        eventDate: "2027-03-12",
        postingDate: "2027-03-12",
        amount: 12500,
        externalReference: "SKV-VAT-2027-02",
        sourceObjectType: "vat_declaration_run",
        sourceObjectId: "vat_run_2027_02",
        periodKey: "2027-02"
      },
      {
        eventTypeCode: "PAYMENT",
        eventDate: "2027-03-12",
        postingDate: "2027-03-12",
        amount: 12500,
        externalReference: "SKV-PAY-2027-03-12"
      }
    ],
    actorId: "user_1"
  });

  const reconciliation = engine.createTaxAccountReconciliation({
    companyId,
    actorId: "user_1"
  });
  const approvedOffset = engine.approveTaxAccountOffset({
    companyId,
    taxAccountEventId: reconciliation.suggestedOffsets[0].taxAccountEventId,
    reconciliationItemId: reconciliation.suggestedOffsets[0].reconciliationItemId,
    offsetAmount: reconciliation.suggestedOffsets[0].offsetAmount,
    offsetReasonCode: reconciliation.suggestedOffsets[0].offsetReasonCode,
    reconciliationRunId: reconciliation.reconciliationRunId,
    actorId: "user_1"
  });
  const paymentEvent = engine.listTaxAccountEvents({ companyId, eventTypeCode: "PAYMENT" })[0];

  assert.equal(expectedLiability.rulepackId, "tax-account-mapping-se-2027.1");
  assert.equal(reconciliation.suggestedOffsets[0].rulepackId, "tax-account-offset-se-2027.1");
  assert.equal(approvedOffset.rulepackId, "tax-account-offset-se-2027.1");
  assert.equal(paymentEvent.mappedByRulepackId, "tax-account-offset-se-2027.1");
});
