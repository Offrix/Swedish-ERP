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
