export interface DocumentState {
  readonly documentId: string;
  readonly companyId: string;
  readonly status: "received" | "stored" | "classified" | "reviewed" | "linked";
}
