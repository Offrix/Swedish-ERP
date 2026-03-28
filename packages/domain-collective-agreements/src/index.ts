export type AgreementFamilyStatus = "active" | "inactive";
export type AgreementVersionStatus = "draft" | "approved" | "active" | "historical" | "retired";
export type AgreementAssignmentStatus = "planned" | "active" | "historical";
export type AgreementCatalogEntryStatus = "draft" | "verified" | "published" | "superseded" | "retired";
export type AgreementIntakeCaseStatus =
  | "received"
  | "extraction_in_progress"
  | "review_pending"
  | "approved_for_publication"
  | "approved_for_local_supplement"
  | "rejected";
export type LocalAgreementSupplementStatus = "draft" | "review_pending" | "approved" | "superseded" | "retired";
export type AgreementOverrideTypeCode = "pay_rule" | "balance_rule" | "time_rule" | "rounding_rule" | "generic";

export interface AgreementFamily {
  readonly agreementFamilyId: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly sectorCode: string | null;
  readonly status: AgreementFamilyStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgreementVersion {
  readonly agreementVersionId: string;
  readonly agreementFamilyId: string;
  readonly companyId: string;
  readonly agreementFamilyCode: string;
  readonly versionCode: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly rulepackCode: string;
  readonly rulepackVersion: string;
  readonly status: AgreementVersionStatus;
  readonly ruleSetJson: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgreementAssignment {
  readonly agreementAssignmentId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly agreementFamilyId: string;
  readonly agreementFamilyCode: string;
  readonly agreementVersionId: string;
  readonly agreementCatalogEntryId: string | null;
  readonly localAgreementSupplementId: string | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly assignmentReasonCode: string;
  readonly status: AgreementAssignmentStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgreementCatalogEntry {
  readonly agreementCatalogEntryId: string;
  readonly companyId: string;
  readonly agreementFamilyId: string;
  readonly agreementFamilyCode: string;
  readonly agreementVersionId: string;
  readonly catalogCode: string;
  readonly dropdownLabel: string;
  readonly publicationScopeCode: string;
  readonly sourceIntakeCaseId: string | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly status: AgreementCatalogEntryStatus;
  readonly publishedByActorId: string;
  readonly publishedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgreementIntakeCase {
  readonly agreementIntakeCaseId: string;
  readonly companyId: string;
  readonly proposedFamilyCode: string;
  readonly proposedFamilyName: string;
  readonly requestedPublicationTarget: "catalog" | "local_supplement";
  readonly sourceDocumentRef: string | null;
  readonly intakeChannelCode: string;
  readonly requestedEmploymentId: string | null;
  readonly note: string | null;
  readonly status: AgreementIntakeCaseStatus;
  readonly submittedByActorId: string;
  readonly submittedAt: string;
  readonly extractionStartedAt: string | null;
  readonly reviewQueuedAt: string | null;
  readonly reviewedByActorId: string | null;
  readonly reviewedAt: string | null;
  readonly linkedAgreementVersionId: string | null;
  readonly linkedCatalogEntryId: string | null;
  readonly linkedLocalAgreementSupplementId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LocalAgreementSupplement {
  readonly localAgreementSupplementId: string;
  readonly companyId: string;
  readonly agreementFamilyId: string;
  readonly agreementFamilyCode: string;
  readonly agreementVersionId: string;
  readonly supplementCode: string;
  readonly displayName: string;
  readonly targetEmploymentId: string | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly overlayRuleSetJson: Record<string, unknown>;
  readonly sourceIntakeCaseId: string | null;
  readonly status: LocalAgreementSupplementStatus;
  readonly approvedByActorId: string;
  readonly approvedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgreementOverride {
  readonly agreementOverrideId: string;
  readonly companyId: string;
  readonly agreementAssignmentId: string;
  readonly agreementVersionId: string;
  readonly overrideTypeCode: AgreementOverrideTypeCode;
  readonly overridePayloadJson: Record<string, unknown>;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly reasonCode: string;
  readonly approvedByActorId: string;
  readonly approvedAt: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}
