import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";

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
  assert.equal(invoiceRun.reviewTask, null);
  assert.equal(receiptRun.reviewTask, null);
  assert.equal(contractRun.reviewTask, null);
});

test("Phase 2.3 review queue supports manual correction and rerun creates new derivative versions", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-21T16:30:00Z")
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
  assert.equal(reviewRun.ocrRun.reviewRequired, true);

  const claimed = engine.claimReviewTask({
    companyId: "company-1",
    reviewTaskId: reviewRun.reviewTask.reviewTaskId,
    actorId: "reviewer-1"
  });
  assert.equal(claimed.task.status, "claimed");

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
    actorId: "reviewer-1"
  });
  assert.equal(corrected.task.status, "corrected");

  const approved = engine.approveReviewTask({
    companyId: "company-1",
    reviewTaskId: reviewRun.reviewTask.reviewTaskId,
    actorId: "reviewer-1"
  });
  assert.equal(approved.task.status, "approved");
  assert.equal(approved.document.documentType, "contract");
  assert.equal(approved.document.status, "reviewed");

  const rerunState = engine.getDocumentOcrRuns({
    companyId: "company-1",
    documentId: invoiceDocumentId
  });
  assert.equal(rerunState.ocrRuns.length, 2);

  const snapshot = engine.snapshotDocumentArchive();
  const invoiceVersions = snapshot.versions.filter((version) => version.documentId === invoiceDocumentId);
  assert.equal(invoiceVersions.filter((version) => version.variantType === "ocr").length, 2);
  assert.equal(invoiceVersions.filter((version) => version.variantType === "classification").length, 2);
});

function ingestOne(engine, recipientAddress, messageId, filename, contentText) {
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
        contentText
      }
    ],
    actorId: "user-1"
  });
}
