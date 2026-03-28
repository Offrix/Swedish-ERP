export interface DocumentState {
  readonly documentId: string;
  readonly companyId: string;
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
}

export interface InboxChannelState {
  readonly inboxChannelId: string;
  readonly companyId: string;
  readonly channelCode: string;
  readonly inboundAddress: string;
  readonly status: "active" | "disabled";
}

export interface EmailIngestState {
  readonly emailIngestMessageId: string;
  readonly companyId: string;
  readonly inboxChannelId: string;
  readonly messageId: string;
  readonly status: "received" | "accepted" | "rejected" | "quarantined";
  readonly routedDocumentCount: number;
  readonly quarantinedAttachmentCount: number;
}

export interface OcrRunState {
  readonly ocrRunId: string;
  readonly companyId: string;
  readonly documentId: string;
  readonly status: "requested" | "processing" | "completed" | "failed";
  readonly suggestedDocumentType: "supplier_invoice" | "expense_receipt" | "contract" | "unknown";
  readonly classificationConfidence: number;
}

export interface ReviewTaskState {
  readonly reviewTaskId: string;
  readonly companyId: string;
  readonly documentId: string;
  readonly queueCode: string;
  readonly status: "open" | "claimed" | "corrected" | "approved" | "rejected" | "requeued";
}

export interface DocumentArchivePlatform {
  createDocumentRecord(input: {
    companyId: string;
    documentType?: string | null;
    sourceChannel?: string;
    sourceReference?: string | null;
    retentionPolicyCode?: string | null;
    retentionClassCode?: string | null;
    metadataJson?: Record<string, unknown>;
    receivedAt?: string;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  appendDocumentVersion(input: {
    companyId: string;
    documentId: string;
    variantType: "original" | "ocr" | "rendered_pdf" | "thumbnail" | "classification";
    storageKey: string;
    mimeType: string;
    contentText?: string | null;
    contentBase64?: string | null;
    fileHash?: string | null;
    fileSizeBytes?: number | null;
    sourceReference?: string | null;
    retentionClassCode?: string | null;
    derivesFromDocumentVersionId?: string | null;
    metadataJson?: Record<string, unknown>;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  linkDocumentRecord(input: {
    companyId: string;
    documentId: string;
    targetType: string;
    targetId: string;
    metadataJson?: Record<string, unknown>;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  exportDocumentChain(input: {
    companyId: string;
    documentId: string;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  getDocumentRecord(input: {
    companyId: string;
    documentId: string;
  }): unknown;
  getDocumentVersions(input: {
    companyId: string;
    documentId: string;
  }): unknown;
  registerInboxChannel(input: {
    companyId: string;
    channelCode: string;
    inboundAddress: string;
    useCase: string;
    allowedMimeTypes: string[];
    maxAttachmentSizeBytes: number;
    defaultDocumentType?: string | null;
    classificationConfidenceThreshold?: number | null;
    fieldConfidenceThreshold?: number | null;
    defaultReviewQueueCode?: string;
    metadataJson?: Record<string, unknown>;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  ingestEmailMessage(input: {
    companyId?: string | null;
    recipientAddress: string;
    messageId: string;
    rawStorageKey: string;
    senderAddress?: string | null;
    subject?: string | null;
    payloadJson?: Record<string, unknown>;
    receivedAt?: string;
    attachments?: Array<Record<string, unknown>>;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  getEmailIngestMessage(input: {
    companyId: string;
    emailIngestMessageId: string;
  }): unknown;
  runDocumentOcr(input: {
    companyId: string;
    documentId: string;
    reasonCode?: string;
    modelVersion?: string;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  getDocumentOcrRuns(input: {
    companyId: string;
    documentId: string;
  }): unknown;
  claimReviewTask(input: {
    companyId: string;
    reviewTaskId: string;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  correctReviewTask(input: {
    companyId: string;
    reviewTaskId: string;
    correctedDocumentType: "supplier_invoice" | "expense_receipt" | "contract" | "unknown";
    correctedFieldsJson?: Record<string, unknown>;
    correctionComment?: string | null;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  approveReviewTask(input: {
    companyId: string;
    reviewTaskId: string;
    actorId?: string;
    correlationId?: string;
  }): unknown;
  getReviewTask(input: {
    companyId: string;
    reviewTaskId: string;
  }): unknown;
}
