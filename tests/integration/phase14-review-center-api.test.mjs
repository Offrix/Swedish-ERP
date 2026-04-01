import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
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
        email: "review-payroll@example.test",
        displayName: "Review Payroll",
        roleCode: "payroll_admin"
      }
    });
    const payrollAdminToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "review-payroll@example.test"
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
    const payrollSeeded = platform.createReviewItem({
      companyId: DEMO_IDS.companyId,
      queueCode: "PAYROLL_REVIEW",
      reviewTypeCode: "PAYROLL_VARIANCE",
      sourceDomainCode: "PAYROLL",
      sourceObjectType: "pay_run",
      sourceObjectId: "pay_api_1",
      requiredDecisionType: "generic_review",
      riskClass: "high",
      title: "Payroll requires review",
      summary: "Payroll queue item created for scope verification.",
      evidenceRefs: ["payrun:pay_api_1"],
      actorId: DEMO_IDS.userId
    });

    const root = await requestJson(baseUrl, "/", { token: adminToken });
    assert.equal(root.routes.includes("/v1/review-center/items/:reviewItemId/start"), true);
    assert.equal(root.routes.includes("/v1/review-center/items/:reviewItemId/request-more-input"), true);
    assert.equal(root.routes.includes("/v1/review-center/items/:reviewItemId/reassign"), true);
    assert.equal(root.routes.includes("/v1/review-center/items/:reviewItemId/close"), true);

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

    const payrollQueues = await requestJson(
      baseUrl,
      `/v1/review-center/queues?companyId=${DEMO_IDS.companyId}`,
      { token: payrollAdminToken }
    );
    assert.equal(payrollQueues.items.some((item) => item.queueCode === "DOCUMENT_REVIEW"), false);
    assert.equal(payrollQueues.items.some((item) => item.queueCode === "PAYROLL_REVIEW"), true);

    const payrollDocumentItems = await requestJson(
      baseUrl,
      `/v1/review-center/items?companyId=${DEMO_IDS.companyId}&queueCode=DOCUMENT_REVIEW&status=open`,
      { token: payrollAdminToken }
    );
    assert.equal(payrollDocumentItems.items.length, 0);

    const payrollDetailForbidden = await requestJson(
      baseUrl,
      `/v1/review-center/items/${seeded.reviewItemId}?companyId=${DEMO_IDS.companyId}`,
      { token: payrollAdminToken, expectedStatus: 403 }
    );
    assert.equal(payrollDetailForbidden.error, "review_center_scope_forbidden");

    const payrollClaimForbidden = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/claim`, {
      method: "POST",
      token: payrollAdminToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(payrollClaimForbidden.error, "review_center_scope_forbidden");

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

    const started = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/start`, {
      method: "POST",
      token: approverToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(started.status, "in_review");

    const waitingInput = await requestJson(
      baseUrl,
      `/v1/review-center/items/${seeded.reviewItemId}/request-more-input`,
      {
        method: "POST",
        token: approverToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "missing_person_link",
          note: "Need explicit handoff before approval."
        }
      }
    );
    assert.equal(waitingInput.status, "waiting_input");
    assert.equal(waitingInput.waitingInputReasonCode, "MISSING_PERSON_LINK");

    const reclaimed = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/claim`, {
      method: "POST",
      token: approverToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reclaimed.status, "claimed");

    const reassigned = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/reassign`, {
      method: "POST",
      token: approverToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        assignedUserId: DEMO_IDS.userId,
        reasonCode: "queue_rebalance"
      }
    });
    assert.equal(reassigned.status, "open");
    assert.equal(reassigned.currentAssignment.assignedUserId, DEMO_IDS.userId);

    const adminClaimed = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/claim`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(adminClaimed.status, "claimed");
    assert.equal(adminClaimed.currentAssignment.assignedUserId, DEMO_IDS.userId);

    const approved = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
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

    const closed = await requestJson(baseUrl, `/v1/review-center/items/${seeded.reviewItemId}/close`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        note: "Downstream outcome consumed."
      }
    });
    assert.equal(closed.status, "closed");

    const payrollItems = await requestJson(
      baseUrl,
      `/v1/review-center/items?companyId=${DEMO_IDS.companyId}&queueCode=PAYROLL_REVIEW&status=open`,
      { token: payrollAdminToken }
    );
    assert.equal(payrollItems.items.some((item) => item.reviewItemId === payrollSeeded.reviewItemId), true);

    const fetched = await requestJson(
      baseUrl,
      `/v1/review-center/items/${seeded.reviewItemId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(fetched.status, "closed");
    assert.equal(fetched.latestDecision.reasonCode, "CLASSIFICATION_CONFIRMED");
    assert.equal(fetched.currentAssignment.assignedUserId, DEMO_IDS.userId);
    assert.equal(fetched.assignmentHistory.length >= 4, true);
    assert.equal(fetched.decisionHistory.length, 1);
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.5 review-center approval is the only manual approval path for classification and import cases", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T12:00:00Z")
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

    const document = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "expense_receipt",
      sourceReference: "review-center-only-001",
      actorId: DEMO_IDS.userId
    });
    const classificationCase = platform.createClassificationCase({
      companyId: DEMO_IDS.companyId,
      documentId: document.documentId,
      actorId: DEMO_IDS.userId,
      lineInputs: [
        {
          description: "Privat kortkop",
          amount: 990,
          treatmentCode: "PRIVATE_RECEIVABLE"
        }
      ]
    });
    assert.equal(Boolean(classificationCase.reviewItemId), true);

    const directClassificationApprove = await requestJson(
      baseUrl,
      `/v1/documents/${document.documentId}/classification-cases/${classificationCase.classificationCaseId}/decide`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 409,
        body: {
          companyId: DEMO_IDS.companyId,
          approvalNote: "Ska blockeras."
        }
      }
    );
    assert.equal(directClassificationApprove.error, "classification_case_review_center_required");

    await requestJson(baseUrl, `/v1/review-center/items/${classificationCase.reviewItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const classificationApproved = await requestJson(baseUrl, `/v1/review-center/items/${classificationCase.reviewItemId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "classification_confirmed",
        note: "Godkand via review center."
      }
    });
    assert.equal(classificationApproved.status, "approved");
    assert.equal(classificationApproved.sourceObjectSnapshot.status, "approved");

    const supplierDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "supplier_invoice",
      sourceReference: "review-center-import-001",
      actorId: DEMO_IDS.userId
    });
    const importCase = platform.createImportCase({
      companyId: DEMO_IDS.companyId,
      caseReference: "IMP-REVIEW-001",
      goodsOriginCountry: "SE",
      requiresCustomsEvidence: false,
      initialDocuments: [{ documentId: supplierDocument.documentId, roleCode: "PRIMARY_SUPPLIER_DOCUMENT" }],
      initialComponents: [{ componentType: "GOODS", amount: 1400 }],
      actorId: DEMO_IDS.userId
    });
    assert.equal(Boolean(importCase.reviewItemId), true);

    const directImportApprove = await requestJson(baseUrl, `/v1/import-cases/${importCase.importCaseId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalNote: "Ska blockeras."
      }
    });
    assert.equal(directImportApprove.error, "import_case_review_center_required");

    await requestJson(baseUrl, `/v1/review-center/items/${importCase.reviewItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const importApproved = await requestJson(baseUrl, `/v1/review-center/items/${importCase.reviewItemId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "import_case_complete",
        note: "Godkand via review center."
      }
    });
    assert.equal(importApproved.status, "approved");
    assert.equal(importApproved.sourceObjectSnapshot.status, "approved");
  } finally {
    await stopServer(server);
  }
});

test("Step 17 API exposes backoffice SLA scan for review-center queues", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-26T00:30:00Z")
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

    await requestJson(baseUrl, `/v1/org/companies/${DEMO_IDS.companyId}/users`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        email: "sla-field@example.test",
        displayName: "SLA Field",
        roleCode: "field_user"
      }
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "sla-field@example.test"
    });

    const overdueReview = platform.createReviewItem({
      companyId: DEMO_IDS.companyId,
      queueCode: "DOCUMENT_REVIEW",
      reviewTypeCode: "DOCUMENT_AMBIGUITY",
      sourceDomainCode: "DOCUMENTS",
      sourceObjectType: "document",
      sourceObjectId: "doc_sla_1",
      requiredDecisionType: "classification",
      riskClass: "high",
      title: "Document SLA breach",
      summary: "Backoffice SLA scan should escalate this item.",
      slaDueAt: "2026-03-25T10:00:00Z",
      actorId: DEMO_IDS.userId
    });

    const fieldUserDenied = await requestJson(baseUrl, "/v1/backoffice/review-center/sla-scan", {
      method: "POST",
      token: fieldUserToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(fieldUserDenied.error, "missing_permission");

    const firstScan = await requestJson(baseUrl, "/v1/backoffice/review-center/sla-scan", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        asOf: "2026-03-26T00:30:00Z"
      }
    });
    assert.equal(firstScan.scan.totalEscalationCount, 1);
    assert.equal(firstScan.workItems.length, 1);
    assert.equal(firstScan.notifications.length, 1);
    assert.equal(firstScan.activityEntries.length, 1);
    assert.equal(firstScan.incidentSignals.length, 0);
    assert.equal(firstScan.scan.escalations[0].reviewItemId, overdueReview.reviewItemId);
    assert.equal(firstScan.scan.escalations[0].escalationKind, "sla_breach");
    assert.equal(firstScan.workItems[0].sourceId, overdueReview.reviewItemId);

    const recurringScan = await requestJson(baseUrl, "/v1/backoffice/review-center/sla-scan", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        asOf: "2026-03-26T09:00:00Z"
      }
    });
    assert.equal(recurringScan.scan.totalEscalationCount, 1);
    assert.equal(recurringScan.scan.escalations[0].escalationKind, "recurring_sla_breach");
    assert.equal(recurringScan.incidentSignals.length, 1);
    assert.equal(recurringScan.incidentSignals[0].signalType, "review_queue_sla_breach");
    assert.equal(recurringScan.notifications[0].recipientType, "team");
  } finally {
    await stopServer(server);
  }
});
