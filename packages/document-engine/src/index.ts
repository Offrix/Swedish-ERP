export interface DocumentRecord {
  readonly documentId: string;
  readonly companyId: string;
  readonly documentType: string | null;
  readonly status:
    | "received"
    | "virus_scanned"
    | "stored"
    | "ocr_done"
    | "classified"
    | "reviewed"
    | "linked"
    | "archived"
    | "under_legal_hold"
    | "deletion_pending"
    | "deleted";
  readonly sourceChannel: string;
  readonly sourceReference: string | null;
  readonly retentionPolicyCode: string | null;
  readonly duplicateOfDocumentId: string | null;
  readonly receivedAt: string;
  readonly storageConfirmedAt: string | null;
  readonly lastExportedAt: string | null;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DocumentVersion {
  readonly documentVersionId: string;
  readonly documentId: string;
  readonly companyId: string;
  readonly variantType: "original" | "ocr" | "rendered_pdf" | "thumbnail" | "classification";
  readonly immutable: boolean;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly contentHash: string;
  readonly fileSizeBytes: number;
  readonly sourceReference: string | null;
  readonly derivesFromDocumentVersionId: string | null;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
}

export interface DocumentLink {
  readonly documentLinkId: string;
  readonly documentId: string;
  readonly companyId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly linkedByActorId: string;
  readonly metadataJson: Record<string, unknown>;
  readonly linkedAt: string;
}

export interface InboxChannel {
  readonly inboxChannelId: string;
  readonly companyId: string;
  readonly channelCode: string;
  readonly inboundAddress: string;
  readonly useCase: string;
  readonly status: "active" | "disabled";
  readonly allowedMimeTypes: readonly string[];
  readonly maxAttachmentSizeBytes: number;
  readonly defaultDocumentType: string | null;
  readonly classificationConfidenceThreshold: number | null;
  readonly fieldConfidenceThreshold: number | null;
  readonly defaultReviewQueueCode: string;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EmailIngestMessage {
  readonly emailIngestMessageId: string;
  readonly companyId: string;
  readonly inboxChannelId: string;
  readonly channelCode: string;
  readonly messageId: string;
  readonly recipientAddress: string;
  readonly senderAddress: string | null;
  readonly subject: string | null;
  readonly rawStorageKey: string;
  readonly status: "received" | "accepted" | "rejected" | "quarantined";
  readonly duplicateOfEmailIngestMessageId: string | null;
  readonly routedDocumentCount: number;
  readonly quarantinedAttachmentCount: number;
  readonly payloadJson: Record<string, unknown>;
  readonly receivedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EmailIngestAttachment {
  readonly emailIngestAttachmentId: string;
  readonly emailIngestMessageId: string;
  readonly companyId: string;
  readonly attachmentIndex: number;
  readonly filename: string;
  readonly mimeType: string;
  readonly fileHash: string;
  readonly fileSizeBytes: number;
  readonly storageKey: string;
  readonly scanResult: "clean" | "malware" | "spam" | "policy_violation";
  readonly status: "received" | "queued" | "quarantined";
  readonly quarantineReasonCode: string | null;
  readonly documentId: string | null;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OcrRun {
  readonly ocrRunId: string;
  readonly documentId: string;
  readonly companyId: string;
  readonly sourceDocumentVersionId: string;
  readonly profileCode: string;
  readonly modelVersion: string;
  readonly reasonCode: string;
  readonly status: "requested" | "processing" | "completed" | "failed";
  readonly reviewRequired: boolean;
  readonly suggestedDocumentType: "supplier_invoice" | "expense_receipt" | "contract" | "unknown";
  readonly classificationConfidence: number;
  readonly classificationCandidatesJson: Array<Record<string, unknown>>;
  readonly extractedText: string;
  readonly extractedFieldsJson: Record<string, unknown>;
  readonly ocrDocumentVersionId: string | null;
  readonly classificationDocumentVersionId: string | null;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly failedAt: string | null;
  readonly errorCode: string | null;
  readonly metadataJson: Record<string, unknown>;
}

export interface ReviewTask {
  readonly reviewTaskId: string;
  readonly companyId: string;
  readonly documentId: string;
  readonly ocrRunId: string;
  readonly queueCode: string;
  readonly taskType: string;
  readonly status: "open" | "claimed" | "corrected" | "approved" | "rejected" | "requeued";
  readonly suggestedDocumentType: string | null;
  readonly suggestedFieldsJson: Record<string, unknown>;
  readonly correctedDocumentType: string | null;
  readonly correctedFieldsJson: Record<string, unknown>;
  readonly confidenceScore: number;
  readonly createdByActorId: string;
  readonly claimedByActorId: string | null;
  readonly claimedAt: string | null;
  readonly correctionComment: string | null;
  readonly correctedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly approvedAt: string | null;
  readonly manualClassificationVersionId: string | null;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DocumentArchiveAuditEvent {
  readonly auditId: string;
  readonly companyId: string;
  readonly actorId: string;
  readonly action: string;
  readonly result: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly correlationId: string;
  readonly recordedAt: string;
}

export interface DocumentChainExport {
  readonly document: DocumentRecord;
  readonly versions: readonly DocumentVersion[];
  readonly links: readonly DocumentLink[];
  readonly auditTrail: readonly DocumentArchiveAuditEvent[];
}

export interface EmailIngestSummary {
  readonly channel: InboxChannel;
  readonly message: EmailIngestMessage;
  readonly attachments: readonly EmailIngestAttachment[];
  readonly routedDocuments: readonly DocumentRecord[];
  readonly duplicateDetected?: boolean;
}
