export type Id06CompanyVerificationStatus = "requested" | "verified" | "failed" | "expired";
export type Id06PersonVerificationStatus = "requested" | "verified" | "failed" | "expired";
export type Id06CardLifecycleStatus = "unknown" | "active" | "inactive" | "blocked" | "expired";
export type Id06WorkplaceBindingStatus = "pending" | "active" | "suspended" | "revoked";
export type Id06WorkPassStatus = "issued" | "suspended" | "revoked" | "expired";

export interface Id06CompanyVerificationRef {
  readonly id06CompanyVerificationId: string;
  readonly companyId: string;
  readonly orgNo: string;
  readonly companyName: string;
  readonly externalCompanyRef: string | null;
  readonly providerCode: string;
  readonly status: Id06CompanyVerificationStatus;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly verifiedAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Id06PersonVerificationRef {
  readonly id06PersonVerificationId: string;
  readonly companyId: string;
  readonly employmentId: string | null;
  readonly workerIdentityType: string;
  readonly workerIdentityValue: string;
  readonly fullNameSnapshot: string;
  readonly externalPersonRef: string | null;
  readonly providerCode: string;
  readonly status: Id06PersonVerificationStatus;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly verifiedAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Id06EmployerLinkRef {
  readonly id06EmployerLinkId: string;
  readonly companyId: string;
  readonly employerOrgNo: string;
  readonly workerIdentityType: string;
  readonly workerIdentityValue: string;
  readonly id06CompanyVerificationId: string;
  readonly id06PersonVerificationId: string;
  readonly status: "active" | "suspended" | "expired";
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Id06CardStatusRef {
  readonly id06CardStatusId: string;
  readonly companyId: string;
  readonly employerOrgNo: string;
  readonly workerIdentityType: string;
  readonly workerIdentityValue: string;
  readonly cardReference: string;
  readonly maskedCardNumber: string | null;
  readonly providerCode: string;
  readonly status: Id06CardLifecycleStatus;
  readonly validFrom: string | null;
  readonly validTo: string | null;
  readonly validatedAt: string | null;
  readonly id06EmployerLinkId: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Id06WorkplaceBindingRef {
  readonly id06WorkplaceBindingId: string;
  readonly companyId: string;
  readonly workplaceId: string;
  readonly workplaceIdentifier: string;
  readonly constructionSiteId: string | null;
  readonly employerOrgNo: string;
  readonly workerIdentityType: string;
  readonly workerIdentityValue: string;
  readonly id06CardStatusId: string;
  readonly status: Id06WorkplaceBindingStatus;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly activatedAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Id06WorkPassRef {
  readonly id06WorkPassId: string;
  readonly companyId: string;
  readonly workplaceId: string;
  readonly id06WorkplaceBindingId: string;
  readonly workPassCode: string;
  readonly status: Id06WorkPassStatus;
  readonly issuedAt: string;
  readonly validFrom: string | null;
  readonly validTo: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Id06AttendanceMirrorRef {
  readonly id06AttendanceMirrorId: string;
  readonly companyId: string;
  readonly workplaceId: string;
  readonly attendanceEventId: string;
  readonly workerIdentityValue: string;
  readonly id06WorkplaceBindingId: string;
  readonly mirroredAt: string;
}

export interface Id06EvidenceBundleRef {
  readonly id06EvidenceBundleId: string;
  readonly companyId: string;
  readonly workplaceId: string;
  readonly workplaceIdentifier: string;
  readonly bindingCount: number;
  readonly workPassCount: number;
  readonly attendanceMirrorCount: number;
  readonly evidenceHash: string;
  readonly exportedAt: string;
  readonly createdByActorId: string;
}

export interface Id06AuditEventRef {
  readonly auditEventId: string;
  readonly companyId: string;
  readonly workplaceId: string | null;
  readonly actorId: string;
  readonly correlationId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly createdAt: string;
  readonly explanation: string;
}

export declare function createId06Platform(options?: Record<string, unknown>): Record<string, unknown>;
export declare function createId06Engine(options?: Record<string, unknown>): Record<string, unknown>;
