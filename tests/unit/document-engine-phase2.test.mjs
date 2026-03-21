import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";

test("document archive keeps original and derivative separate and exports a complete chain", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-21T12:00:00Z")
  });

  const document = engine.createDocumentRecord({
    companyId: "company-1",
    documentType: "supplier_invoice",
    sourceChannel: "manual",
    sourceReference: "scan-001",
    actorId: "user-1"
  });

  const original = engine.appendDocumentVersion({
    companyId: "company-1",
    documentId: document.documentId,
    variantType: "original",
    storageKey: "documents/originals/scan-001.pdf",
    mimeType: "application/pdf",
    contentText: "supplier invoice original bytes",
    sourceReference: "scan-001",
    actorId: "user-1"
  });

  const derivative = engine.appendDocumentVersion({
    companyId: "company-1",
    documentId: document.documentId,
    variantType: "ocr",
    storageKey: "documents/ocr/scan-001.txt",
    mimeType: "text/plain",
    contentText: "OCR output",
    sourceReference: "scan-001",
    derivesFromDocumentVersionId: original.version.documentVersionId,
    actorId: "user-1"
  });

  const linked = engine.linkDocumentRecord({
    companyId: "company-1",
    documentId: document.documentId,
    targetType: "supplier_invoice",
    targetId: "SUP-INV-1001",
    actorId: "user-1"
  });

  const exported = engine.exportDocumentChain({
    companyId: "company-1",
    documentId: document.documentId,
    actorId: "user-1"
  });

  assert.equal(original.version.variantType, "original");
  assert.equal(derivative.version.variantType, "ocr");
  assert.notEqual(original.version.documentVersionId, derivative.version.documentVersionId);
  assert.equal(derivative.version.derivesFromDocumentVersionId, original.version.documentVersionId);
  assert.equal(linked.document.status, "linked");
  assert.equal(exported.versions.length, 2);
  assert.equal(exported.links.length, 1);
  assert.match(
    exported.auditTrail.map((event) => event.action).join(","),
    /document\.received.*document\.version\.stored.*document\.linked.*document\.exported/
  );
});

test("document archive detects duplicates by hash and source reference without blocking storage", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-21T12:00:00Z")
  });

  const first = engine.createDocumentRecord({
    companyId: "company-1",
    documentType: "supplier_invoice",
    sourceReference: "dup-001",
    actorId: "user-1"
  });
  engine.appendDocumentVersion({
    companyId: "company-1",
    documentId: first.documentId,
    variantType: "original",
    storageKey: "documents/originals/dup-001.pdf",
    mimeType: "application/pdf",
    contentText: "same content",
    sourceReference: "dup-001",
    actorId: "user-1"
  });

  const second = engine.createDocumentRecord({
    companyId: "company-1",
    documentType: "supplier_invoice",
    sourceReference: "dup-001",
    actorId: "user-1"
  });
  const duplicate = engine.appendDocumentVersion({
    companyId: "company-1",
    documentId: second.documentId,
    variantType: "original",
    storageKey: "documents/originals/dup-001-copy.pdf",
    mimeType: "application/pdf",
    contentText: "same content",
    sourceReference: "dup-001",
    actorId: "user-1"
  });

  assert.equal(duplicate.duplicateDetected, true);
  assert.equal(duplicate.duplicateOfDocumentIds.includes(first.documentId), true);
  assert.equal(duplicate.document.duplicateOfDocumentId, first.documentId);
});
