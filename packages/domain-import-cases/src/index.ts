export type ImportCaseStatus =
  | "opened"
  | "collecting_documents"
  | "ready_for_review"
  | "approved"
  | "posted"
  | "corrected"
  | "closed";

export interface ImportCase {
  readonly importCaseId: string;
  readonly companyId: string;
  readonly caseReference: string;
  readonly status: ImportCaseStatus;
  readonly goodsOriginCountry: string | null;
  readonly customsReference: string | null;
  readonly currencyCode: string;
  readonly completenessStatus: "collecting" | "blocking" | "complete";
  readonly blockingReasonCodes: readonly string[];
  readonly reviewItemId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
