import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 12 API exposes review-center queues, items, claim and decide flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T14:00:00Z")
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
    const approverToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL
    });

    await requestJson(baseUrl, `/v1/org/companies/${DEMO_IDS.companyId}/users`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        email: "review-field@example.test",
        displayName: "Review Field",
        roleCode: "field_user"
      }
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "review-field@example.test"
    });

    const seeded = platform.createReviewItem({
      companyId: DEMO_IDS.companyId,
      queueCode: "DOCUMENT_REVIEW",
      reviewTypeCode: "DOCUMENT_AMBIGUITY",
      sourceDomainCode: "DOCUMENTS",
      sourceObjectType: "document",
      sourceObjectId: "doc_api_1",
      requiredDecisionType: "classification",
      riskClass: "high",
      title: "Document requires review",
      summary: "Cross-domain review center item created for API verification.",
      evidenceRefs: ["document:doc_api_1"],
      actorId: DEMO_IDS.userId
    });

    const queues = await requestJson(
      baseUrl,
      `/v1/review-center/queues?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(queues.items.some((item) => item.queueCode === "DOCUMENT_REVIEW" && item.metrics.openItemCount >= 1), true);

    const items = await requestJson(
      baseUrl,
      `/v1/review-center/items?companyId=${DEMO_IDS.companyId}&queueCode=DOCUMENT_REVIEW&status=open`,
      { token: adminToken }
    );
    assert.equal(items.items.some((item) => item.reviewItemId === seeded.reviewItemId), true);

    const fieldUserListForbidden = await requestJson(
      baseUrl,
      `/v1/review-center/items?companyId=${DEMO_IDS.companyId}&queueCode=DOCUMENT_REVIEW&status=open`,
      { token: fieldUserToken, expectedStatus: 403 }
    );
    assert.equal(fieldUserListForbidden.error, "review_center_role_forbidden");

    const claimed = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/claim`, {
      method: "POST",
      token: approverToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(claimed.status, "claimed");
    assert.equal(claimed.currentAssignment.assignedUserId, DEMO_APPROVER_IDS.userId);

    const adminDecideForbidden = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/decide`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId,
        decisionCode: "approve",
        reasonCode: "classification_confirmed",
        note: "Admin should not bypass active assignment.",
        decisionPayload: {
          finalDocumentType: "supplier_invoice"
        },
        evidenceRefs: ["classification:forbidden"]
      }
    });
    assert.equal(adminDecideForbidden.error, "review_center_assignment_required");

    const approved = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/decide`, {
      method: "POST",
      token: approverToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        decisionCode: "approve",
        reasonCode: "classification_confirmed",
        note: "Approved in API integration test.",
        decisionPayload: {
          finalDocumentType: "supplier_invoice"
        },
        evidenceRefs: ["classification:approved"]
      }
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.latestDecision.decisionCode, "approve");

    const fetched = await requestJson(
      baseUrl,
      `/v1/review-center/items/${seeded.reviewItemId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(fetched.latestDecision.reasonCode, "CLASSIFICATION_CONFIRMED");
    assert.equal(fetched.currentAssignment.assignedUserId, DEMO_APPROVER_IDS.userId);
  } finally {
    await stopServer(server);
  }
});
