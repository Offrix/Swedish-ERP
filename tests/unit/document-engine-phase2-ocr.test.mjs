import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";
import { createReviewCenterPlatform } from "../../packages/domain-review-center/src/index.mjs";

test("Phase 2.3 OCR distinguishes invoices, receipts and contracts", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-21T16:00:00Z")
  });

  const channel = engine.registerInboxChannel({
    companyId: "company-1",
    channelCode: "docs_inbox",
    inboundAddress: "docs@inbound.example.test",
    useCase: "documents_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.9
  });

  const invoiceDocumentId = ingestOne(engine, channel.inboundAddress, "<ocr-invoice-001>", "invoice.pdf", "Invoice: INV-1001 Supplier: Demo Leverantor AB Total: 1250.00 OCR: 12345").routedDocuments[0].documentId;
  const receiptDocumentId = ingestOne(engine, channel.inboundAddress, "<ocr-receipt-001>", "receipt.pdf", "Kvitto Butik: Centralbutiken Total: 250.00 Datum: 2026-03-21").routedDocuments[0].documentId;
  const contractDocumentId = ingestOne(engine, channel.inboundAddress, "<ocr-contract-001>", "contract.pdf", "Agreement: Serviceavtal Party: Customer AB Effective date: 2026-03-21").routedDocuments[0].documentId;

  const invoiceRun = engine.runDocumentOcr({ companyId: "company-1", documentId: invoiceDocumentId, actorId: "user-1" });
  const receiptRun = engine.runDocumentOcr({ companyId: "company-1", documentId: receiptDocumentId, actorId: "user-1" });
  const contractRun = engine.runDocumentOcr({ companyId: "company-1", documentId: contractDocumentId, actorId: "user-1" });

  assert.equal(invoiceRun.ocrRun.suggestedDocumentType, "supplier_invoice");
  assert.equal(receiptRun.ocrRun.suggestedDocumentType, "expense_receipt");
  assert.equal(contractRun.ocrRun.suggestedDocumentType, "contract");
  assert.equal(invoiceRun.ocrRun.providerCode, "google_document_ai");
  assert.equal(invoiceRun.ocrRun.processingMode, "sync");
  assert.equal(invoiceRun.ocrRun.processorType, "INVOICE_PROCESSOR");
  assert.equal(invoiceRun.reviewTask, null);
  assert.equal(receiptRun.reviewTask, null);
  assert.equal(contractRun.reviewTask, null);
});

test("Phase 2.3 review queue supports manual correction and rerun creates new derivative versions", () => {
  const reviewCenterPlatform = createReviewCenterPlatform({
    clock: () => new Date("2026-03-21T16:30:00Z")
  });
  reviewCenterPlatform.createReviewQueue({
    companyId: "company-1",
    queueCode: "DOCUMENT_REVIEW",
    label: "Document review",
    ownerTeamId: "finance_ops",
    priority: "high",
    defaultRiskClass: "high",
    defaultSlaHours: 8,
    escalationPolicyCode: "DOCUMENT_ESCALATION",
    allowedSourceDomains: ["DOCUMENTS"],
    requiredDecisionTypes: ["classification"],
    actorId: "system"
  });
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-21T16:30:00Z"),
    getReviewCenterPlatform: () => reviewCenterPlatform
  });

  const channel = engine.registerInboxChannel({
    companyId: "company-1",
    channelCode: "review_inbox",
    inboundAddress: "review@inbound.example.test",
    useCase: "documents_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.9
  });

  const invoice = ingestOne(
    engine,
    channel.inboundAddress,
    "<ocr-rerun-001>",
    "invoice.pdf",
    "Invoice: INV-2001 Supplier: Demo Leverantor AB Total: 1999.00 OCR: 55555"
  );
  const invoiceDocumentId = invoice.routedDocuments[0].documentId;
  engine.runDocumentOcr({
    companyId: "company-1",
    documentId: invoiceDocumentId,
    actorId: "user-1"
  });
  engine.runDocumentOcr({
    companyId: "company-1",
    documentId: invoiceDocumentId,
    reasonCode: "model_upgrade",
    actorId: "user-1"
  });

  const ambiguous = ingestOne(
    engine,
    channel.inboundAddress,
    "<ocr-review-001>",
    "mystery.pdf",
    "Document total 100.00"
  );
  const ambiguousDocumentId = ambiguous.routedDocuments[0].documentId;
  const reviewRun = engine.runDocumentOcr({
    companyId: "company-1",
    documentId: ambiguousDocumentId,
    actorId: "user-1"
  });

  assert.equal(reviewRun.reviewTask?.taskType, "document_review");
  assert.equal(reviewRun.reviewTask?.status, "open");
  assert.equal(typeof reviewRun.reviewTask?.reviewItemId, "string");
  assert.equal(reviewRun.ocrRun.reviewRequired, true);

  assert.throws(
    () =>
      engine.claimReviewTask({
        companyId: "company-1",
        reviewTaskId: reviewRun.reviewTask.reviewTaskId,
        actorId: "reviewer-1"
      }),
    (error) => error?.code === "review_task_review_center_required"
  );

  const claimedReviewItem = reviewCenterPlatform.claimReviewCenterItem({
    companyId: "company-1",
    reviewItemId: reviewRun.reviewTask.reviewItemId,
    actorId: "reviewer-1"
  });
  assert.equal(claimedReviewItem.status, "claimed");

  const claimed = engine.claimReviewTask({
    companyId: "company-1",
    reviewTaskId: reviewRun.reviewTask.reviewTaskId,
    actorId: "reviewer-1",
    reviewCenterManaged: true
  });
  assert.equal(claimed.task.status, "claimed");

  assert.throws(
    () =>
      engine.correctReviewTask({
        companyId: "company-1",
        reviewTaskId: reviewRun.reviewTask.reviewTaskId,
        correctedDocumentType: "contract",
        correctedFieldsJson: {
          contractTitle: {
            value: "Manual service agreement",
            confidence: 1
          }
        },
        correctionComment: "Contract title added manually.",
        actorId: "reviewer-1"
      }),
    (error) => error?.code === "review_task_review_center_required"
  );

  const corrected = engine.correctReviewTask({
    companyId: "company-1",
    reviewTaskId: reviewRun.reviewTask.reviewTaskId,
    correctedDocumentType: "contract",
    correctedFieldsJson: {
      contractTitle: {
        value: "Manual service agreement",
        confidence: 1
      }
    },
    correctionComment: "Contract title added manually.",
    actorId: "reviewer-1",
    reviewCenterManaged: true
  });
  assert.equal(corrected.task.status, "corrected");

  assert.throws(
    () =>
      engine.approveReviewTask({
        companyId: "company-1",
        reviewTaskId: reviewRun.reviewTask.reviewTaskId,
        actorId: "reviewer-1"
      }),
    (error) => error?.code === "review_task_review_center_required"
  );

  const approvedReviewItem = reviewCenterPlatform.decideReviewCenterItem({
    companyId: "company-1",
    reviewItemId: reviewRun.reviewTask.reviewItemId,
    decisionCode: "approve",
    reasonCode: "document_review_complete",
    actorId: "reviewer-1"
  });
  assert.equal(approvedReviewItem.status, "approved");

  const approved = engine.approveReviewTask({
    companyId: "company-1",
    reviewTaskId: reviewRun.reviewTask.reviewTaskId,
    actorId: "reviewer-1",
    reviewCenterManaged: true
  });
  assert.equal(approved.task.status, "approved");
  assert.equal(approved.document.documentType, "contract");
  assert.equal(approved.document.status, "reviewed");

  const rerunState = engine.getDocumentOcrRuns({
    companyId: "company-1",
    documentId: invoiceDocumentId
  });
  assert.equal(rerunState.ocrRuns.length, 2);
  assert.equal(rerunState.ocrRuns[0].status, "superseded");
  assert.equal(rerunState.ocrRuns[0].supersededByOcrRunId, rerunState.ocrRuns[1].ocrRunId);
  assert.equal(rerunState.ocrRuns[1].status, "completed");

  const snapshot = engine.snapshotDocumentArchive();
  const invoiceVersions = snapshot.versions.filter((version) => version.documentId === invoiceDocumentId);
  assert.equal(invoiceVersions.filter((version) => version.variantType === "ocr").length, 2);
  assert.equal(invoiceVersions.filter((version) => version.variantType === "classification").length, 2);
});

test("Phase 10.2 OCR provider supports async callback and quality-driven review", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-28T11:00:00Z")
  });

  const channel = engine.registerInboxChannel({
    companyId: "company-1",
    channelCode: "async_ocr",
    inboundAddress: "async@inbound.example.test",
    useCase: "documents_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.9
  });

  const documentId = ingestOne(
    engine,
    channel.inboundAddress,
    "<ocr-async-001>",
    "invoice.pdf",
    "[OCR_LOW_CONFIDENCE] Invoice: INV-3001 Supplier: Demo Leverantor AB Total: 2400.00",
    20
  ).routedDocuments[0].documentId;

  const pending = engine.runDocumentOcr({
    companyId: "company-1",
    documentId,
    callbackMode: "manual_provider_callback",
    actorId: "user-1"
  });
  assert.equal(pending.ocrRun.status, "running");
  assert.equal(pending.ocrRun.processingMode, "batch_lro");
  assert.equal(typeof pending.ocrRun.providerOperationRef, "string");
  assert.equal(typeof pending.providerCallbackToken, "string");
  assert.equal("callbackToken" in pending.ocrRun.metadataJson, false);
  assert.equal(JSON.stringify(engine.snapshotDocumentArchive()).includes(pending.providerCallbackToken), false);

  const completed = engine.completeDocumentOcrProviderCallback({
    companyId: "company-1",
    documentId,
    ocrRunId: pending.ocrRun.ocrRunId,
    callbackToken: pending.providerCallbackToken,
    actorId: "reviewer-1"
  });
  assert.equal(completed.ocrRun.status, "completed");
  assert.equal(completed.ocrRun.processingMode, "batch_lro");
  assert.equal(completed.ocrRun.textConfidence < 0.9, true);
  assert.equal(completed.reviewTask?.status, "open");
  assert.equal(completed.reviewTask?.taskType, "document_review");
});

test("Phase 10.2 OCR provider enforces processor page limits", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-28T11:30:00Z")
  });

  const channel = engine.registerInboxChannel({
    companyId: "company-1",
    channelCode: "limit_ocr",
    inboundAddress: "limit@inbound.example.test",
    useCase: "documents_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.9
  });

  const documentId = ingestOne(
    engine,
    channel.inboundAddress,
    "<ocr-limit-001>",
    "invoice-over-limit.pdf",
    "Invoice: INV-9999 Supplier: Demo Leverantor AB Total: 9999.00",
    201
  ).routedDocuments[0].documentId;

  assert.throws(
    () =>
      engine.runDocumentOcr({
        companyId: "company-1",
        documentId,
        callbackMode: "manual_provider_callback",
        actorId: "user-1"
      }),
    /ocr profile invoice_parse allows at most 200 pages in batch mode/i
  );
});

test("Phase 3.2 OCR provider callback requires explicit token and never persists it in run state", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-28T11:31:00Z")
  });

  const channel = engine.registerInboxChannel({
    companyId: "company-1",
    channelCode: "secure_async_ocr",
    inboundAddress: "secure-async@inbound.example.test",
    useCase: "documents_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.9
  });

  const documentId = ingestOne(
    engine,
    channel.inboundAddress,
    "<ocr-secure-001>",
    "invoice-secure.pdf",
    "[OCR_LOW_CONFIDENCE] Invoice: INV-3100 Supplier: Demo Leverantor AB Total: 2500.00",
    20
  ).routedDocuments[0].documentId;

  const pending = engine.runDocumentOcr({
    companyId: "company-1",
    documentId,
    callbackMode: "manual_provider_callback",
    actorId: "user-1"
  });

  assert.equal(typeof pending.providerCallbackToken, "string");
  assert.equal("callbackToken" in pending.ocrRun.metadataJson, false);

  assert.throws(
    () =>
      engine.completeDocumentOcrProviderCallback({
        companyId: "company-1",
        documentId,
        ocrRunId: pending.ocrRun.ocrRunId,
        actorId: "reviewer-1"
      }),
    (error) => error?.code === "ocr_provider_callback_token_required" && error?.status === 403
  );
});

function ingestOne(engine, recipientAddress, messageId, filename, contentText, pageCount = 1) {
  return engine.ingestEmailMessage({
    companyId: "company-1",
    recipientAddress,
    messageId,
    rawStorageKey: `raw-mail/${messageId}.eml`,
    attachments: [
      {
        filename,
        mimeType: "application/pdf",
        storageKey: `documents/originals/${filename}`,
        contentText,
        pageCount
      }
    ],
    actorId: "user-1"
  });
}
