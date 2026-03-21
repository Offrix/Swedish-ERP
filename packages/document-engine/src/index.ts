export interface DocumentRecord {
  readonly documentId: string;
  readonly companyId: string;
  readonly kind: string;
  readonly createdAt: string;
}

export interface DocumentVersion {
  readonly documentVersionId: string;
  readonly documentId: string;
  readonly variant: "original" | "ocr" | "rendered_pdf" | "thumbnail" | "classification";
  readonly immutable: boolean;
  readonly contentHash: string;
  readonly createdAt: string;
}

export interface DocumentLink {
  readonly documentId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly linkedAt: string;
}

