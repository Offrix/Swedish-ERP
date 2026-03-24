export type PersonalliggareRegistrationStatus =
  | "draft"
  | "checklist_in_progress"
  | "registered"
  | "active"
  | "closed";

export type PersonalliggareIndustryPackCode = "bygg";
export type PersonalliggareThresholdStatus =
  | "threshold_pending"
  | "threshold_not_met"
  | "registration_required"
  | "active"
  | "inactive";
export type PersonalliggareSourceChannel = "kiosk" | "mobile" | "admin";
export type PersonalliggareAttendanceEventType = "check_in" | "check_out" | "correction";
export type PersonalliggareAttendanceEventStatus = "captured" | "synced" | "corrected" | "voided_by_correction";
export type PersonalliggareDeviceTrustStatus = "pending" | "trusted" | "revoked";

export interface ConstructionSiteRegistrationRef {
  readonly constructionSiteRegistrationId: string;
  readonly registrationReference: string;
  readonly status: PersonalliggareRegistrationStatus;
  readonly registeredOn: string | null;
  readonly checklistItems: readonly string[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AttendanceIdentitySnapshotRef {
  readonly attendanceIdentitySnapshotId: string;
  readonly identitySnapshotKey: string;
  readonly employmentId: string | null;
  readonly workerIdentityType: string;
  readonly workerIdentityValue: string;
  readonly fullNameSnapshot: string;
  readonly employerOrgNo: string;
  readonly contractorOrgNo: string;
  readonly roleAtWorkplace: string;
  readonly createdAt: string;
}

export interface ContractorSnapshotRef {
  readonly contractorSnapshotId: string;
  readonly contractorSnapshotKey: string;
  readonly employerOrgNo: string;
  readonly contractorOrgNo: string;
  readonly roleAtWorkplace: string;
  readonly createdAt: string;
}

export interface AttendanceCorrectionRef {
  readonly attendanceCorrectionId: string;
  readonly correctionReason: string;
  readonly correctedTimestamp: string | null;
  readonly correctedEventType: PersonalliggareAttendanceEventType | null;
  readonly correctedWorkerIdentityValue: string | null;
  readonly correctedEmployerOrgNo: string | null;
  readonly correctedContractorOrgNo: string | null;
  readonly correctedRoleAtWorkplace: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface AttendanceEventRef {
  readonly attendanceEventId: string;
  readonly employmentId: string | null;
  readonly attendanceIdentitySnapshotId: string;
  readonly contractorSnapshotId: string;
  readonly workerIdentityType: string;
  readonly workerIdentityValue: string;
  readonly fullNameSnapshot: string;
  readonly employerOrgNo: string;
  readonly contractorOrgNo: string;
  readonly roleAtWorkplace: string;
  readonly eventType: PersonalliggareAttendanceEventType;
  readonly eventTimestamp: string;
  readonly sourceChannel: PersonalliggareSourceChannel;
  readonly deviceId: string | null;
  readonly clientEventId: string | null;
  readonly workplaceIdentifier: string;
  readonly offlineFlag: boolean;
  readonly status: PersonalliggareAttendanceEventStatus;
  readonly geoContext: Record<string, unknown>;
  readonly originalAttendanceEventId?: string;
  readonly correctionReason?: string;
  readonly correctedEventType?: PersonalliggareAttendanceEventType | null;
  readonly correctedWorkerIdentityValue?: string | null;
  readonly correctedEmployerOrgNo?: string | null;
  readonly correctedContractorOrgNo?: string | null;
  readonly correctedRoleAtWorkplace?: string | null;
  readonly corrections: readonly AttendanceCorrectionRef[];
  readonly idempotencyKey: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface KioskDeviceRef {
  readonly kioskDeviceId: string;
  readonly deviceCode: string;
  readonly displayName: string;
  readonly trustStatus: PersonalliggareDeviceTrustStatus;
  readonly enrollmentTokenHash: string;
  readonly trustedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface AttendanceExportRef {
  readonly attendanceExportId: string;
  readonly exportType: "daily" | "person" | "employer" | "audit";
  readonly exportDate: string | null;
  readonly eventCount: number;
  readonly correctionCount: number;
  readonly controlChainHash: string;
  readonly payloadJson: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface AttendanceAuditEventRef {
  readonly auditEventId: string;
  readonly companyId: string;
  readonly constructionSiteId: string | null;
  readonly actorId: string;
  readonly correlationId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly projectId: string | null;
  readonly createdAt: string;
  readonly explanation: string;
}

export interface IndustryPackRef {
  readonly industryPackCode: PersonalliggareIndustryPackCode;
  readonly description: string;
  readonly thresholdRuleCode: string;
  readonly deviceTrustRequired: boolean;
}

export interface ConstructionSiteRef {
  readonly constructionSiteId: string;
  readonly workplaceId: string;
  readonly companyId: string;
  readonly siteCode: string;
  readonly siteName: string;
  readonly siteAddress: string;
  readonly builderOrgNo: string;
  readonly projectId: string | null;
  readonly industryPackCode: PersonalliggareIndustryPackCode;
  readonly siteTypeCode: string;
  readonly workplaceIdentifier: string;
  readonly estimatedTotalCostExVat: number;
  readonly thresholdRequiredFlag: boolean;
  readonly thresholdEvaluationStatus: PersonalliggareThresholdStatus;
  readonly registrationStatus: PersonalliggareRegistrationStatus;
  readonly equipmentStatus: "pending" | "available" | "trusted";
  readonly startDate: string;
  readonly endDate: string | null;
  readonly registrations: readonly ConstructionSiteRegistrationRef[];
  readonly attendanceEvents: readonly AttendanceEventRef[];
  readonly attendanceIdentitySnapshots: readonly AttendanceIdentitySnapshotRef[];
  readonly contractorSnapshots: readonly ContractorSnapshotRef[];
  readonly kioskDevices: readonly KioskDeviceRef[];
  readonly exports: readonly AttendanceExportRef[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
