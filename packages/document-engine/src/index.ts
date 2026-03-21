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

