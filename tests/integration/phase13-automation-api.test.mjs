import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 13.3 API keeps automation deterministic, explainable and human-reviewed", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:20:00Z")
  });
  const baselineLedgerEntryCount = platform.snapshotLedger().journalEntries.length;
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const rulePack = await requestJson(baseUrl, "/v1/automation/rule-packs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        rulePackId: "phase13-3-pack",
        domain: "automation",
        jurisdiction: "SE",
        effectiveFrom: "2026-01-01",
        version: "1",
        semanticChangeSummary: "Phase 13.3 baseline automation rules.",
        machineReadableRules: {
          when: [{ field: "documentType", equals: "supplier_invoice" }],
          then: { route: "ap.review" }
        },
        humanReadableExplanation: ["Deterministic AP routing."],
        testVectors: [{ input: { documentType: "supplier_invoice" }, output: { route: "ap.review" } }]
      }
    });
    assert.equal(rulePack.rulePackId, "phase13-3-pack");

    const posting = await requestJson(baseUrl, "/v1/automation/posting-suggestions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceObjectType: "supplier_invoice",
        sourceObjectId: "supplier-invoice-1",
        rulePackId: rulePack.rulePackId,
        evidence: {
          documentType: "supplier_invoice",
          amount: 1250
        },
        candidatePostings: [
          {
            postingKey: "supplier_invoice_default",
            score: 0.88,
            lines: [
              { accountNumber: "5410", debitAmount: 1250, creditAmount: 0 },
              { accountNumber: "2440", debitAmount: 0, creditAmount: 1250 }
            ]
          }
        ]
      }
    });
    assert.equal(posting.outputs.safeToPost, false);
    assert.equal(posting.confidence > 0.8, true);
    assert.equal(posting.explanation.length >= 2, true);

    const classification = await requestJson(baseUrl, "/v1/automation/classifications", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        classifierType: "document_type",
        rulePackId: rulePack.rulePackId,
        evidence: {
          documentType: "supplier_invoice",
          ocrConfidence: 0.91
        },
        candidates: [
          { code: "supplier_invoice", score: 0.91 },
          { code: "expense_receipt", score: 0.33 }
        ]
      }
    });
    assert.equal(classification.outputs.selectedCode, "supplier_invoice");
    assert.equal(classification.confidence >= 0.9, true);

    const anomaly = await requestJson(baseUrl, "/v1/automation/anomalies", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        anomalyType: "invoice_amount_variance",
        rulePackId: rulePack.rulePackId,
        actualValue: 1450,
        expectedValue: 1000,
        tolerancePercent: 10,
        evidence: {
          source: "ocr_vs_po"
        }
      }
    });
    assert.equal(anomaly.outputs.flagged, true);
    assert.equal(anomaly.warnings.length, 1);

    const decisions = await requestJson(baseUrl, `/v1/automation/decisions?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(decisions.items.length, 3);

    const decision = await requestJson(baseUrl, `/v1/automation/decisions/${posting.decisionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(decision.decisionId, posting.decisionId);

    const overridden = await requestJson(baseUrl, `/v1/automation/decisions/${posting.decisionId}/override`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        actorId: DEMO_IDS.userId,
        overrideReasonCode: "manual_accounting_review",
        acceptedOutputs: {
          suggestedLines: posting.outputs.suggestedLines,
          safeToPost: false,
          postingKey: posting.outputs.postingKey
        }
      }
    });
    assert.equal(overridden.state, "manual_override");
    assert.equal(platform.snapshotLedger().journalEntries.length, baselineLedgerEntryCount);
  } finally {
    await stopServer(server);
  }
});
