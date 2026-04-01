export type ImportCaseStatus =
  | "opened"
  | "collecting_documents"
  | "ready_for_review"
  | "approved"
  | "applied"
  | "rejected"
  | "posted"
  | "corrected"
  | "closed";

export interface ImportCaseCorrectionRequest {
  readonly importCaseCorrectionRequestId: string;
  readonly companyId: string;
  readonly importCaseId: string;
  readonly status: "open" | "approved" | "rejected" | "superseded";
  readonly reasonCode: string;
  readonly reasonNote: string | null;
  readonly evidenceRefs: readonly string[];
  readonly requestedByActorId: string;
  readonly requestedAt: string;
  readonly decidedAt: string | null;
  readonly decidedByActorId: string | null;
  readonly decisionCode: "approve" | "reject" | null;
  readonly decisionNote: string | null;
  readonly replacementImportCaseId: string | null;
}

export interface ImportCaseDownstreamApplication {
  readonly applicationStatus: "pending" | "applied";
  readonly targetDomainCode: string | null;
  readonly targetObjectType: string | null;
  readonly targetObjectId: string | null;
  readonly appliedCommandKey: string | null;
  readonly appliedPayloadHash: string | null;
  readonly appliedAt: string | null;
  readonly appliedByActorId: string | null;
}

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
  readonly correctionRequests?: readonly ImportCaseCorrectionRequest[];
  readonly downstreamApplication?: ImportCaseDownstreamApplication;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
