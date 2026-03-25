import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 16 API enforces AI boundary review creation and tenant kill switch", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T18:30:00Z")
  });
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
    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_APPROVER_IDS.companyUserId,
      permissionCode: "company.manage",
      objectType: "feature_flag",
      objectId: DEMO_IDS.companyId
    });

    const postingDecision = await requestJson(baseUrl, "/v1/automation/posting-suggestions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceObjectType: "supplier_invoice",
        sourceObjectId: "phase16-posting-source",
        candidatePostings: [
          {
            postingKey: "supplier_invoice_default",
            score: 0.89,
            lines: [
              { accountNumber: "5410", debitAmount: 1250, creditAmount: 0 },
              { accountNumber: "2440", debitAmount: 0, creditAmount: 1250 }
            ]
          }
        ],
        evidence: {
          documentType: "supplier_invoice",
          personImpact: true,
          aiGenerated: true,
          modelProvider: "openai",
          modelVersion: "gpt-5.4"
        }
      }
    });

    assert.equal(postingDecision.reviewRequired, true);
    assert.equal(postingDecision.reviewQueueCode, "PAYROLL_REVIEW");
    assert.equal(typeof postingDecision.reviewItemId, "string");
    assert.equal(postingDecision.finalizationAllowed, false);
    assert.equal(postingDecision.outputs.safeToPost, false);

    const reviewItem = await requestJson(
      baseUrl,
      `/v1/review-center/items/${postingDecision.reviewItemId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(reviewItem.sourceDomainCode, "AUTOMATION");
    assert.equal(reviewItem.requiredDecisionType, "payroll_treatment");

    await requestJson(baseUrl, "/v1/ops/feature-flags", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        flagKey: "automation.ai.classification.enabled",
        description: "Disable AI classifications during incident containment.",
        flagType: "kill_switch",
        scopeType: "company",
        scopeRef: DEMO_IDS.companyId,
        defaultEnabled: true,
        enabled: false,
        ownerUserId: DEMO_IDS.userId,
        riskClass: "high",
        sunsetAt: "2026-12-31",
        changeReason: "AI classifications are disabled during incident containment.",
        approvalActorIds: [DEMO_APPROVER_IDS.userId]
      }
    });

    const blocked = await requestJson(baseUrl, "/v1/automation/classifications", {
      method: "POST",
      token: adminToken,
      expectedStatus: 503,
      body: {
        companyId: DEMO_IDS.companyId,
        classifierType: "document_type",
        evidence: {
          aiGenerated: true,
          modelProvider: "openai",
          modelVersion: "gpt-5.4"
        },
        candidates: [{ code: "supplier_invoice", score: 0.99 }]
      }
    });
    assert.equal(blocked.error, "automation_ai_disabled");
  } finally {
    await stopServer(server);
  }
});
