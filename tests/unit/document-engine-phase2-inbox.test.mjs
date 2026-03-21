import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";

test("Phase 2.2 inbox splits attachments, routes valid documents and quarantines invalid ones", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-21T14:00:00Z")
  });

  const channel = engine.registerInboxChannel({
    companyId: "company-1",
    channelCode: "ap_inbox",
    inboundAddress: "ap@inbound.example.test",
    useCase: "supplier_invoice_inbox",
    allowedMimeTypes: ["application/pdf", "image/png"],
    maxAttachmentSizeBytes: 1024 * 1024,
    defaultDocumentType: "supplier_invoice",
    actorId: "user-1"
  });

  const ingested = engine.ingestEmailMessage({
    companyId: "company-1",
    recipientAddress: channel.inboundAddress,
    messageId: "<phase2-inbox-unit-001@inbound.example.test>",
    rawStorageKey: "raw-mail/company-1/phase2-inbox-unit-001.eml",
    senderAddress: "supplier@example.test",
    subject: "Supplier invoice batch",
    attachments: [
      {
        filename: "invoice-a.pdf",
        mimeType: "application/pdf",
        storageKey: "documents/originals/invoice-a.pdf",
        contentText: "invoice-a"
      },
      {
        filename: "invoice-b.png",
        mimeType: "image/png",
        storageKey: "documents/originals/invoice-b.png",
        contentText: "invoice-b"
      },
      {
        filename: "virus.exe",
        mimeType: "application/x-msdownload",
        storageKey: "documents/quarantine/virus.exe",
        contentText: "virus-bytes",
        scanResult: "malware"
      }
    ],
    actorId: "user-1"
  });

  assert.equal(ingested.duplicateDetected, false);
  assert.equal(ingested.message.status, "accepted");
  assert.equal(ingested.message.routedDocumentCount, 2);
  assert.equal(ingested.message.quarantinedAttachmentCount, 1);
  assert.equal(ingested.attachments.length, 3);
  assert.deepEqual(
    ingested.attachments.map((attachment) => attachment.status),
    ["queued", "queued", "quarantined"]
  );
  assert.equal(ingested.routedDocuments.length, 2);
  assert.equal(
    ingested.routedDocuments.every((document) => document.metadataJson.rawMailId === ingested.message.emailIngestMessageId),
    true
  );
  assert.equal(
    ingested.routedDocuments.every((document) => document.sourceChannel === "email_inbox"),
    true
  );

  const duplicate = engine.ingestEmailMessage({
    companyId: "company-1",
    recipientAddress: channel.inboundAddress,
    messageId: "<phase2-inbox-unit-001@inbound.example.test>",
    rawStorageKey: "raw-mail/company-1/phase2-inbox-unit-001-retry.eml",
    attachments: [
      {
        filename: "invoice-a.pdf",
        mimeType: "application/pdf",
        storageKey: "documents/originals/invoice-a.pdf",
        contentText: "invoice-a"
      }
    ],
    actorId: "user-1"
  });

  assert.equal(duplicate.duplicateDetected, true);
  assert.equal(duplicate.message.emailIngestMessageId, ingested.message.emailIngestMessageId);

  const snapshot = engine.snapshotDocumentArchive();
  assert.equal(snapshot.inboxChannels.length, 1);
  assert.equal(snapshot.emailMessages.length, 1);
  assert.equal(snapshot.emailAttachments.length, 3);
  assert.equal(snapshot.documents.length, 2);
  assert.equal(
    snapshot.auditEvents.some((event) => event.action === "email_ingest.attachment.quarantined"),
    true
  );
  assert.equal(
    snapshot.auditEvents.some((event) => event.action === "email_ingest.duplicate_detected"),
    true
  );
});
