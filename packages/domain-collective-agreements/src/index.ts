export type AgreementFamilyStatus = "active" | "inactive";
export type AgreementVersionStatus = "draft" | "approved" | "active" | "historical" | "retired";
export type AgreementAssignmentStatus = "planned" | "active" | "historical";
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
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly assignmentReasonCode: string;
  readonly status: AgreementAssignmentStatus;
  readonly createdByActorId: string;
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
