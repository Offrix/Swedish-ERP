export interface AttendanceEventRef {
  readonly attendanceEventId: string;
  readonly employmentId: string | null;
  readonly workerIdentityType: string;
  readonly workerIdentityValue: string;
  readonly fullNameSnapshot: string;
  readonly employerOrgNo: string;
  readonly contractorOrgNo: string;
  readonly eventType: "check_in" | "check_out" | "correction";
  readonly eventTimestamp: string;
  readonly sourceChannel: "kiosk" | "mobile" | "admin";
  readonly offlineFlag: boolean;
  readonly createdAt: string;
}

export interface ConstructionSiteRef {
  readonly constructionSiteId: string;
  readonly companyId: string;
  readonly siteCode: string;
  readonly siteName: string;
  readonly siteAddress: string;
  readonly builderOrgNo: string;
  readonly projectId: string | null;
  readonly estimatedTotalCostExVat: number;
  readonly thresholdRequiredFlag: boolean;
  readonly registrationStatus: string;
  readonly startDate: string;
  readonly endDate: string | null;
}
