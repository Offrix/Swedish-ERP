import test from "node:test";
import assert from "node:assert/strict";
import { createAccountingMethodEngine } from "../../packages/domain-accounting-method/src/index.mjs";

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

test("Step 7 year-end catch-up is idempotent and only allowed for cash method", () => {
  const engine = createAccountingMethodEngine({
    seedDemo: false,
    clock: () => new Date("2027-12-31T15:00:00Z")
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
      { openItemType: "customer_invoice", sourceId: "inv_1", unpaidAmount: 1250, recognitionDate: "2027-12-15" },
      { openItemType: "supplier_invoice", sourceId: "sup_1", unpaidAmount: 400, recognitionDate: "2027-12-20" }
    ],
    actorId: "tester"
  });
  const replayRun = engine.runYearEndCatchUp({
    companyId: "company_catchup",
    fiscalYearEndDate: "2027-12-31",
    openItems: [
      { openItemType: "customer_invoice", sourceId: "inv_1", unpaidAmount: 1250, recognitionDate: "2027-12-15" },
      { openItemType: "supplier_invoice", sourceId: "sup_1", unpaidAmount: 400, recognitionDate: "2027-12-20" }
    ],
    actorId: "tester"
  });

  assert.equal(firstRun.yearEndCatchUpRunId, replayRun.yearEndCatchUpRunId);
  assert.deepEqual(firstRun.totals, {
    receivablesAmount: 1250,
    payablesAmount: 400
  });
});
