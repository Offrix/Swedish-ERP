export type FiscalYearStatus = "planned" | "active" | "closing" | "closed" | "historical";
export type FiscalYearKind = "CALENDAR" | "BROKEN" | "SHORT" | "EXTENDED";
export type FiscalYearChangeRequestStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "implemented";
export type FiscalPeriodLockState = "open" | "soft_locked" | "hard_locked" | "reopened";
export type OwnerTaxationCode = "LEGAL_PERSON_ONLY" | "PHYSICAL_PERSON_PARTICIPANT";

export interface FiscalYearProfile {
  readonly fiscalYearProfileId: string;
  readonly companyId: string;
  readonly legalFormCode: string;
  readonly ownerTaxationCode: OwnerTaxationCode;
  readonly mustUseCalendarYear: boolean;
  readonly groupAlignmentRequired: boolean;
  readonly rulepackCode: string;
  readonly rulepackVersion: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FiscalYearChangeRequest {
  readonly changeRequestId: string;
  readonly companyId: string;
  readonly requestedStartDate: string;
  readonly requestedEndDate: string;
  readonly yearKind: FiscalYearKind;
  readonly reasonCode: string;
  readonly taxAgencyPermissionRequired: boolean;
  readonly permissionStatus: "not_required" | "pending" | "granted";
  readonly permissionReference: string | null;
  readonly groupAlignmentStartDate: string | null;
  readonly groupAlignmentEndDate: string | null;
  readonly status: FiscalYearChangeRequestStatus;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly implementedAt: string | null;
  readonly requestedByActorId: string;
  readonly requestedAt: string;
  readonly updatedAt: string;
}

export interface FiscalPeriod {
  readonly periodId: string;
  readonly fiscalYearId: string;
  readonly companyId: string;
  readonly periodCode: string;
  readonly ordinal: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly lockState: FiscalPeriodLockState;
  readonly closeState: "open" | "closing" | "closed";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FiscalYear {
  readonly fiscalYearId: string;
  readonly companyId: string;
  readonly fiscalYearProfileId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly yearKind: FiscalYearKind;
  readonly approvalBasisCode: string;
  readonly changeRequestId: string | null;
  readonly status: FiscalYearStatus;
  readonly priorFiscalYearId: string | null;
  readonly nextFiscalYearId: string | null;
  readonly periodsGeneratedAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly periods?: readonly FiscalPeriod[];
}
