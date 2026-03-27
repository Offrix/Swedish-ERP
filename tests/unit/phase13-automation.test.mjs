import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 13.3 automation decisions carry confidence, explanation and safe overrides", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T19:00:00Z")
  });

  const rulePack = platform.createNoCodeRulePack({
    rulePackId: "automation-phase13-pack",
    domain: "automation",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    version: "1",
    semanticChangeSummary: "Phase 13 automation rules",
    machineReadableRules: {
      conditions: [{ field: "documentType", equals: "supplier_invoice" }],
      then: { selectedCode: "supplier_invoice" }
    },
    humanReadableExplanation: ["Supplier invoices are classified deterministically."],
    testVectors: [],
    migrationNotes: []
  });
  const evaluation = platform.evaluateNoCodeRulePack({
    rulePackId: rulePack.rulePackId,
    facts: { documentType: "supplier_invoice" }
  });
  assert.equal(evaluation.matched, true);

  const postingDecision = platform.suggestLedgerPosting({
    companyId: DEMO_IDS.companyId,
    sourceObjectType: "supplier_invoice",
    sourceObjectId: "phase13-posting-source",
    rulePackId: rulePack.rulePackId,
    evidence: { documentType: "supplier_invoice" },
    candidatePostings: [
      {
        postingKey: "supplier_default",
        score: 0.91,
        lines: [
          { accountNumber: "5410", debitAmount: 1200, creditAmount: 0 },
          { accountNumber: "2440", debitAmount: 0, creditAmount: 1200 }
        ]
      }
    ],
    actorId: "phase13-3-unit"
  });
  assert.equal(postingDecision.outputs.safeToPost, false);
  assert.equal(postingDecision.confidence > 0.85, true);
  assert.equal(postingDecision.explanation.length > 0, true);

  const classificationDecision = platform.classifyArtifact({
    companyId: DEMO_IDS.companyId,
    classifierType: "document_type",
    rulePackId: rulePack.rulePackId,
    evidence: { documentType: "supplier_invoice", ocrConfidence: 0.88 },
    actorId: "phase13-3-unit"
  });
  assert.equal(classificationDecision.outputs.selectedCode, "supplier_invoice");
  assert.equal(classificationDecision.explanation.length > 0, true);

  const anomalyDecision = platform.detectAnomaly({
    companyId: DEMO_IDS.companyId,
    anomalyType: "variance_check",
    actualValue: 1450,
    expectedValue: 1000,
    tolerancePercent: 10,
    evidence: { reportCode: "trial_balance" },
    actorId: "phase13-3-unit"
  });
  assert.equal(anomalyDecision.outputs.flagged, true);
  assert.equal(anomalyDecision.needsManualReview, true);

  const overridden = platform.overrideAutomationDecision({
    companyId: DEMO_IDS.companyId,
    decisionId: classificationDecision.decisionId,
    actorId: "phase13-3-reviewer",
    overrideReasonCode: "operator_confirmed",
    acceptedOutputs: {
      classifierType: "document_type",
      selectedCode: "supplier_invoice"
    }
  });
  assert.equal(overridden.state, "manual_override");
  assert.equal(platform.listAutomationDecisions({ companyId: DEMO_IDS.companyId }).length, 3);
});
