import test from "node:test";
import assert from "node:assert/strict";
import { createReviewCenterEngine } from "../../packages/domain-review-center/src/index.mjs";

test("Step 12 review center creates queues, deduplicates items and records final decisions", () => {
  const engine = createReviewCenterEngine({
    clock: () => new Date("2026-03-24T13:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_review_1";

  const documentQueue = engine.createReviewQueue({
    companyId,
    queueCode: "DOCUMENT_REVIEW",
    label: "Document review",
    allowedSourceDomains: ["DOCUMENTS"],
    requiredDecisionTypes: ["classification"],
    actorId: "ops_admin"
  });
  const seniorQueue = engine.createReviewQueue({
    companyId,
    queueCode: "TAX_ACCOUNT_REVIEW",
    label: "Tax account review",
    allowedSourceDomains: ["DOCUMENTS", "TAX_ACCOUNT"],
    requiredDecisionTypes: ["classification", "tax_reconciliation", "generic_review"],
    actorId: "ops_admin"
  });

  const firstItem = engine.createReviewItem({
    companyId,
    queueCode: documentQueue.queueCode,
    reviewTypeCode: "DOCUMENT_AMBIGUITY",
    sourceDomainCode: "DOCUMENTS",
    sourceObjectType: "document",
    sourceObjectId: "doc_1",
    requiredDecisionType: "classification",
    riskClass: "high",
    title: "Ambiguous supplier document",
    summary: "OCR confidence is below threshold and requires reviewer decision.",
    evidenceRefs: ["document:doc_1"],
    actorId: "system"
  });
  const duplicateItem = engine.createReviewItem({
    companyId,
    queueCode: documentQueue.queueCode,
    reviewTypeCode: "DOCUMENT_AMBIGUITY",
    sourceDomainCode: "DOCUMENTS",
    sourceObjectType: "document",
    sourceObjectId: "doc_1",
    requiredDecisionType: "classification",
    title: "Should dedupe",
    actorId: "system"
  });

  assert.equal(duplicateItem.reviewItemId, firstItem.reviewItemId);
  assert.equal(engine.listReviewCenterQueues({ companyId })[0].metrics.openItemCount, 1);

  const claimed = engine.claimReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    actorId: "reviewer_1"
  });
  assert.equal(claimed.status, "claimed");
  assert.equal(claimed.currentAssignment.assignedUserId, "reviewer_1");

  const inReview = engine.startReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    actorId: "reviewer_1"
  });
  assert.equal(inReview.status, "in_review");

  const waitingInput = engine.requestReviewMoreInput({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    reasonCode: "missing_person_link",
    note: "Need employee match before classification can complete.",
    actorId: "reviewer_1"
  });
  assert.equal(waitingInput.status, "waiting_input");

  const reclaimed = engine.claimReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    actorId: "reviewer_1"
  });
  assert.equal(reclaimed.status, "claimed");

  const escalated = engine.decideReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    decisionCode: "escalate",
    reasonCode: "requires_tax_reconciliation_owner",
    targetQueueCode: seniorQueue.queueCode,
    note: "Escalated to specialist queue.",
    actorId: "reviewer_1"
  });
  assert.equal(escalated.status, "escalated");
  assert.equal(escalated.queueCode, seniorQueue.queueCode);

  const claimedEscalation = engine.claimReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    actorId: "reviewer_2"
  });
  assert.equal(claimedEscalation.currentAssignment.assignedUserId, "reviewer_2");

  const approved = engine.decideReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    decisionCode: "approve",
    reasonCode: "classification_confirmed",
    note: "Final classification confirmed by senior reviewer.",
    decisionPayload: {
      finalDocumentType: "supplier_invoice"
    },
    evidenceRefs: ["classification:v2"],
    actorId: "reviewer_2"
  });
  assert.equal(approved.status, "approved");
  assert.equal(approved.latestDecision.decisionCode, "approve");
  assert.equal(approved.latestDecision.decisionPayloadJson.finalDocumentType, "supplier_invoice");

  const closed = engine.closeReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    actorId: "reviewer_2",
    note: "Review outcome consumed by source domain."
  });
  assert.equal(closed.status, "closed");
  assert.equal(closed.decisionHistory.length, 2);
  assert.equal(engine.listReviewCenterEvents({ companyId, reviewItemId: firstItem.reviewItemId }).length >= 6, true);
});
