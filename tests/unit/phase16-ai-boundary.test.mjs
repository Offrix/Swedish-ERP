import test from "node:test";
import assert from "node:assert/strict";
import { createAutomationAiEngine, AUTOMATION_FLAG_KEYS } from "../../packages/rule-engine/src/index.mjs";
import { createReviewCenterPlatform } from "../../packages/domain-review-center/src/index.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Step 16 AI boundary forces review, creates review items and closes them on manual override", () => {
  const reviewCenter = createReviewCenterPlatform({
    clock: () => new Date("2026-03-24T18:00:00Z")
  });
  const automation = createAutomationAiEngine({
    clock: () => new Date("2026-03-24T18:00:00Z"),
    resolveRuntimeFlags: () => ({}),
    getReviewCenterPlatform: () => reviewCenter
  });

  const decision = automation.classifyArtifact({
    companyId: DEMO_IDS.companyId,
    companyUserId: DEMO_IDS.companyUserId,
    classifierType: "document_type",
    candidates: [
      { code: "company_cost", score: 0.97 },
      { code: "private_spend", score: 0.51 }
    ],
    evidence: {
      personImpact: true,
      privateSpendCandidate: true,
      aiGenerated: true,
      modelProvider: "openai",
      modelVersion: "gpt-5.4"
    },
    actorId: DEMO_IDS.companyUserId
  });

  assert.equal(decision.reviewRequired, true);
  assert.equal(decision.reviewQueueCode, "PAYROLL_REVIEW");
  assert.equal(typeof decision.reviewItemId, "string");
  assert.equal(decision.finalizationAllowed, false);
  assert.equal(decision.submissionAllowed, false);
  assert.equal(decision.downstreamDispatchAllowed, false);
  assert.equal(decision.policyHits.includes("person_or_payroll_impact_requires_review"), true);

  const reviewItem = reviewCenter.getReviewCenterItem({
    companyId: DEMO_IDS.companyId,
    reviewItemId: decision.reviewItemId
  });
  assert.equal(reviewItem.sourceDomainCode, "AUTOMATION");
  assert.equal(reviewItem.requiredDecisionType, "payroll_treatment");

  const overridden = automation.overrideAutomationDecision({
    companyId: DEMO_IDS.companyId,
    decisionId: decision.decisionId,
    actorId: DEMO_IDS.companyUserId,
    overrideReasonCode: "manual_payroll_review",
    acceptedOutputs: {
      classifierType: "document_type",
      selectedCode: "private_spend",
      finalizationAllowed: false,
      submissionAllowed: false,
      downstreamDispatchAllowed: false
    }
  });

  assert.equal(overridden.state, "manual_override");
  assert.equal(
    reviewCenter.getReviewCenterItem({
      companyId: DEMO_IDS.companyId,
      reviewItemId: decision.reviewItemId
    }).status,
    "closed"
  );
});

test("Step 16 AI boundary blocks module-disabled AI decisions and forbids safe-to-post overrides", () => {
  const reviewCenter = createReviewCenterPlatform({
    clock: () => new Date("2026-03-24T18:10:00Z")
  });
  const automation = createAutomationAiEngine({
    clock: () => new Date("2026-03-24T18:10:00Z"),
    resolveRuntimeFlags: () => ({
      [AUTOMATION_FLAG_KEYS.classification]: false
    }),
    getReviewCenterPlatform: () => reviewCenter
  });

  assert.throws(
    () =>
      automation.createNoCodeRulePack({
        rulePackId: "illegal-domain-pack",
        domain: "vat",
        jurisdiction: "SE",
        effectiveFrom: "2026-01-01",
        version: "1",
        semanticChangeSummary: "Should be blocked."
      }),
    (error) => error?.status === 409 && error?.code === "automation_rule_pack_domain_forbidden"
  );

  assert.throws(
    () =>
      automation.classifyArtifact({
        companyId: DEMO_IDS.companyId,
        companyUserId: DEMO_IDS.companyUserId,
        classifierType: "document_type",
        evidence: { aiGenerated: true, modelProvider: "openai", modelVersion: "gpt-5.4" }
      }),
    (error) => error?.status === 503 && error?.code === "automation_ai_disabled"
  );

  const postingAutomation = createAutomationAiEngine({
    clock: () => new Date("2026-03-24T18:12:00Z"),
    resolveRuntimeFlags: () => ({}),
    getReviewCenterPlatform: () => reviewCenter
  });
  const postingDecision = postingAutomation.suggestLedgerPosting({
    companyId: DEMO_IDS.companyId,
    companyUserId: DEMO_IDS.companyUserId,
    sourceObjectType: "supplier_invoice",
    sourceObjectId: "supplier-invoice-boundary",
    candidatePostings: [
      {
        postingKey: "supplier_default",
        score: 0.91,
        lines: [
          { accountNumber: "5410", debitAmount: 1250, creditAmount: 0 },
          { accountNumber: "2440", debitAmount: 0, creditAmount: 1250 }
        ]
      }
    ],
    evidence: {
      documentType: "supplier_invoice",
      aiGenerated: true,
      modelProvider: "openai",
      modelVersion: "gpt-5.4"
    }
  });

  assert.equal(postingDecision.outputs.safeToPost, false);
  assert.equal(postingDecision.reviewRequired, true);

  assert.throws(
    () =>
      postingAutomation.overrideAutomationDecision({
        companyId: DEMO_IDS.companyId,
        decisionId: postingDecision.decisionId,
        actorId: DEMO_IDS.companyUserId,
        overrideReasonCode: "manual_accounting_review",
        acceptedOutputs: {
          ...postingDecision.outputs,
          safeToPost: true
        }
      }),
    (error) => error?.status === 409 && error?.code === "automation_finalization_forbidden"
  );
});
