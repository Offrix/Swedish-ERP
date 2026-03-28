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

  const reassigned = engine.reassignReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    assignedUserId: "reviewer_2",
    assignedTeamId: "tax_ops",
    actorId: "reviewer_1",
    reasonCode: "specialist_required"
  });
  assert.equal(reassigned.status, "open");
  assert.equal(reassigned.currentAssignment.assignedUserId, "reviewer_2");
  assert.equal(reassigned.currentAssignment.assignedTeamId, "tax_ops");

  const claimedBySpecialist = engine.claimReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    actorId: "reviewer_2"
  });
  assert.equal(claimedBySpecialist.currentAssignment.assignedUserId, "reviewer_2");

  const escalated = engine.decideReviewCenterItem({
    companyId,
    reviewItemId: firstItem.reviewItemId,
    decisionCode: "escalate",
    reasonCode: "requires_tax_reconciliation_owner",
    targetQueueCode: seniorQueue.queueCode,
    note: "Escalated to specialist queue.",
    actorId: "reviewer_2"
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

test("Step 17 review center SLA scan records first and recurring breaches", () => {
  const engine = createReviewCenterEngine({
    clock: () => new Date("2026-03-26T00:30:00Z"),
    seedDemo: false
  });
  const companyId = "company_review_sla_1";

  const queue = engine.createReviewQueue({
    companyId,
    queueCode: "PAYROLL_REVIEW",
    label: "Payroll review",
    ownerTeamId: "payroll_ops",
    priority: "critical",
    defaultSlaHours: 4,
    escalationPolicyCode: "PAYROLL_SLA_ESCALATION",
    allowedSourceDomains: ["PAYROLL"],
    requiredDecisionTypes: ["generic_review"],
    actorId: "ops_admin"
  });

  const item = engine.createReviewItem({
    companyId,
    queueCode: queue.queueCode,
    reviewTypeCode: "PAYROLL_VARIANCE",
    sourceDomainCode: "PAYROLL",
    sourceObjectType: "pay_run",
    sourceObjectId: "payrun_2026_03",
    requiredDecisionType: "generic_review",
    title: "Payroll variance requires review",
    summary: "Variance exceeded threshold and breached the first SLA window.",
    slaDueAt: "2026-03-25T20:00:00Z",
    actorId: "system"
  });

  const firstScan = engine.runReviewCenterSlaScan({
    companyId,
    asOf: "2026-03-26T00:30:00Z",
    actorId: "ops_admin"
  });
  assert.equal(firstScan.totalEscalationCount, 1);
  assert.equal(firstScan.escalations[0].escalationKind, "sla_breach");
  assert.equal(firstScan.escalations[0].priority, "critical");
  assert.equal(firstScan.escalations[0].escalationPolicyCode, "PAYROLL_SLA_ESCALATION");
  assert.equal(firstScan.queues[0].slaDueAt, item.slaDueAt);
  assert.equal(firstScan.queues[0].openCount, 1);
  assert.equal(firstScan.queues[0].blockedCount, 0);

  const tooSoonScan = engine.runReviewCenterSlaScan({
    companyId,
    asOf: "2026-03-26T02:00:00Z",
    actorId: "ops_admin"
  });
  assert.equal(tooSoonScan.totalEscalationCount, 0);

  const recurringScan = engine.runReviewCenterSlaScan({
    companyId,
    asOf: "2026-03-26T05:00:00Z",
    actorId: "ops_admin"
  });
  assert.equal(recurringScan.totalEscalationCount, 1);
  assert.equal(recurringScan.escalations[0].escalationKind, "recurring_sla_breach");
  assert.equal(recurringScan.escalations[0].breachCount, 2);
  assert.equal(recurringScan.escalations[0].reviewItemId, item.reviewItemId);

  const refreshed = engine.getReviewCenterItem({
    companyId,
    reviewItemId: item.reviewItemId
  });
  assert.equal(refreshed.slaBreachCount, 2);
  assert.equal(refreshed.lastEscalationId, recurringScan.escalations[0].reviewEscalationId);

  const snapshot = engine.snapshotReviewCenter();
  assert.equal(snapshot.reviewEscalations.length, 2);
});

test("Step 6.3 review center trims queues, items and item detail by viewer team scope", () => {
  const engine = createReviewCenterEngine({
    clock: () => new Date("2026-03-27T08:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_review_scope_1";

  engine.createReviewQueue({
    companyId,
    queueCode: "DOCUMENT_REVIEW",
    label: "Document review",
    ownerTeamId: "finance_ops",
    allowedSourceDomains: ["DOCUMENTS"],
    requiredDecisionTypes: ["classification"],
    actorId: "ops_admin"
  });
  engine.createReviewQueue({
    companyId,
    queueCode: "PAYROLL_REVIEW",
    label: "Payroll review",
    ownerTeamId: "payroll_ops",
    allowedSourceDomains: ["PAYROLL"],
    requiredDecisionTypes: ["generic_review"],
    actorId: "ops_admin"
  });

  const financeItem = engine.createReviewItem({
    companyId,
    queueCode: "DOCUMENT_REVIEW",
    reviewTypeCode: "DOCUMENT_AMBIGUITY",
    sourceDomainCode: "DOCUMENTS",
    sourceObjectType: "document",
    sourceObjectId: "doc_scope_1",
    requiredDecisionType: "classification",
    title: "Finance scoped review",
    actorId: "system"
  });
  const payrollItem = engine.createReviewItem({
    companyId,
    queueCode: "PAYROLL_REVIEW",
    reviewTypeCode: "PAYROLL_VARIANCE",
    sourceDomainCode: "PAYROLL",
    sourceObjectType: "pay_run",
    sourceObjectId: "pay_scope_1",
    requiredDecisionType: "generic_review",
    title: "Payroll scoped review",
    actorId: "system"
  });

  const financeQueues = engine.listReviewCenterQueues({
    companyId,
    viewerUserId: "finance_user",
    viewerTeamIds: ["finance_ops"]
  });
  assert.deepEqual(financeQueues.map((queue) => queue.queueCode), ["DOCUMENT_REVIEW"]);
  assert.equal(financeQueues[0].metrics.openItemCount, 1);

  const payrollQueues = engine.listReviewCenterQueues({
    companyId,
    viewerUserId: "payroll_user",
    viewerTeamIds: ["payroll_ops"]
  });
  assert.deepEqual(payrollQueues.map((queue) => queue.queueCode), ["PAYROLL_REVIEW"]);
  assert.equal(payrollQueues[0].metrics.openItemCount, 1);

  const financeVisibleItems = engine.listReviewCenterItems({
    companyId,
    viewerUserId: "finance_user",
    viewerTeamIds: ["finance_ops"]
  });
  assert.deepEqual(financeVisibleItems.map((item) => item.reviewItemId), [financeItem.reviewItemId]);

  const payrollVisibleItems = engine.listReviewCenterItems({
    companyId,
    viewerUserId: "payroll_user",
    viewerTeamIds: ["payroll_ops"]
  });
  assert.deepEqual(payrollVisibleItems.map((item) => item.reviewItemId), [payrollItem.reviewItemId]);

  assert.throws(
    () => engine.getReviewCenterItem({
      companyId,
      reviewItemId: financeItem.reviewItemId,
      viewerUserId: "payroll_user",
      viewerTeamIds: ["payroll_ops"]
    }),
    (candidate) => candidate?.code === "review_center_scope_forbidden"
  );
});
