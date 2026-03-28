import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";

test("Phase 10.1 document chain carries source fingerprint, retention class and evidence refs", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-28T08:00:00Z")
  });

  const document = engine.createDocumentRecord({
    companyId: "company-1",
    documentType: "supplier_invoice",
    sourceChannel: "email_inbox",
    sourceReference: "mail-100",
    retentionPolicyCode: "supplier_invoice_standard",
    metadataJson: {
      filename: "invoice-100.pdf",
      senderAddress: "supplier@example.com",
      mailboxCode: "ap-inbox"
    },
    actorId: "user-1"
  });

  assert.equal(document.retentionClassCode, "supplier_invoice_standard");
  assert.equal(typeof document.sourceFingerprint, "string");
  assert.equal(document.sourceFingerprint.length, 64);
  assert.equal(document.evidenceRefs.includes(`document:${document.documentId}`), true);
  assert.equal(
    document.evidenceRefs.includes(`retention_class:${document.retentionClassCode}`),
    true
  );

  const original = engine.appendDocumentVersion({
    companyId: document.companyId,
    documentId: document.documentId,
    variantType: "original",
    storageKey: "documents/originals/invoice-100.pdf",
    mimeType: "application/pdf",
    contentText: "invoice 100 original bytes",
    actorId: "user-1"
  });

  assert.equal(original.version.checksumAlgorithm, "sha256");
  assert.equal(original.version.checksumSha256, original.version.contentHash);
  assert.equal(original.version.sourceFingerprint, document.sourceFingerprint);
  assert.equal(original.version.retentionClassCode, document.retentionClassCode);
  assert.equal(
    original.version.evidenceRefs.includes(`checksum:sha256:${original.version.checksumSha256}`),
    true
  );

  const derivative = engine.appendDocumentVersion({
    companyId: document.companyId,
    documentId: document.documentId,
    variantType: "ocr",
    storageKey: "documents/ocr/invoice-100.txt",
    mimeType: "text/plain",
    contentText: "ocr text",
    derivesFromDocumentVersionId: original.version.documentVersionId,
    actorId: "user-1"
  });

  const currentDocument = engine.getDocumentRecord({
    companyId: document.companyId,
    documentId: document.documentId
  });
  const versions = engine.getDocumentVersions({
    companyId: document.companyId,
    documentId: document.documentId
  });

  assert.equal(currentDocument.originalDocumentVersionId, original.version.documentVersionId);
  assert.equal(currentDocument.latestDocumentVersionId, derivative.version.documentVersionId);
  assert.equal(versions.length, 2);
  assert.equal(
    versions.some((version) => version.evidenceRefs.includes(`document_version:${version.documentVersionId}`)),
    true
  );
  assert.equal(
    derivative.version.evidenceRefs.includes(`derived_from:${original.version.documentVersionId}`),
    true
  );
});
