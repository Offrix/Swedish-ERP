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

export interface DocumentArchivePlatform {
  createDocumentRecord(input: {
    companyId: string;
    documentType?: string | null;
    sourceChannel?: string;
    sourceReference?: string | null;
    retentionPolicyCode?: string | null;
    metadataJson?: Record<string, unknown>;
    receivedAt?: string;
    actorId?: string;
    correlationId?: string;
  }): unknown;
}
