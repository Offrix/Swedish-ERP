export type ClassificationCaseStatus =
  | "ingested"
  | "suggested"
  | "under_review"
  | "approved"
  | "dispatched"
  | "corrected"
  | "closed";

export type TreatmentIntentStatus = "draft" | "approved" | "dispatched" | "realized" | "reversed" | "failed";

export interface ExtractionProjection {
  readonly extractionProjectionId: string;
  readonly classificationCaseId: string;
  readonly treatmentLineId: string;
  readonly companyId: string;
  readonly documentId: string;
  readonly sourceOcrRunId: string | null;
  readonly extractionFamilyCode: string;
  readonly candidateObjectType: string;
  readonly targetDomainCode: string;
  readonly documentRoleCode: string;
  readonly attachmentRoleCode: string;
  readonly requiresReview: boolean;
  readonly reviewRiskClass: "low" | "medium" | "high" | "critical";
  readonly reviewReasonCodes: readonly string[];
  readonly normalizedFieldsJson: Record<string, unknown>;
  readonly attachmentRefs: readonly string[];
  readonly payloadHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClassificationCase {
  readonly classificationCaseId: string;
  readonly companyId: string;
  readonly documentId: string;
  readonly parentClassificationCaseId: string | null;
  readonly sourceOcrRunId: string | null;
  readonly scenarioCode: string;
  readonly status: ClassificationCaseStatus;
  readonly requiresReview: boolean;
  readonly reviewRiskClass: "low" | "medium" | "high" | "critical";
  readonly reviewReasonCodes: readonly string[];
  readonly reviewItemId: string | null;
  readonly totalAmount: number;
  readonly currencyCode: string;
  readonly extractionProjections?: readonly ExtractionProjection[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TreatmentIntent {
  readonly treatmentIntentId: string;
  readonly classificationCaseId: string;
  readonly treatmentLineId: string;
  readonly personLinkId: string | null;
  readonly companyId: string;
  readonly documentId: string;
  readonly targetDomainCode: string;
  readonly treatmentCode: string;
  readonly scenarioCode: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly status: TreatmentIntentStatus;
  readonly payloadJson: Record<string, unknown>;
}
