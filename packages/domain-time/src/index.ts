export type TimeClockEventType = "clock_in" | "clock_out";
export type TimeBalanceType = "flex_minutes" | "comp_minutes" | "overtime_minutes";
export type TimeEntrySourceType = "manual" | "clock" | "import";
export type LeaveSignalType = "none" | "parental_benefit" | "temporary_parental_benefit";
export type LeaveEntryStatus = "draft" | "submitted" | "approved" | "rejected";
export type LeaveSignalLockState = "ready_for_sign" | "signed" | "submitted";

export interface TimeScheduleTemplateDay {
  readonly weekday: number;
  readonly plannedMinutes: number;
  readonly obMinutes: number;
  readonly jourMinutes: number;
  readonly standbyMinutes: number;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly breakMinutes: number;
}

export interface TimeScheduleTemplate {
  readonly scheduleTemplateId: string;
  readonly companyId: string;
  readonly scheduleTemplateCode: string;
  readonly displayName: string;
  readonly timezone: string;
  readonly active: boolean;
  readonly days: readonly TimeScheduleTemplateDay[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TimeScheduleAssignment {
  readonly timeScheduleAssignmentId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly scheduleTemplateId: string;
  readonly scheduleTemplateCode: string;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface TimeClockEvent {
  readonly timeClockEventId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly eventType: TimeClockEventType;
  readonly occurredAt: string;
  readonly workDate: string;
  readonly sourceChannel: string;
  readonly projectId: string | null;
  readonly activityCode: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface TimeEntry {
  readonly timeEntryId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly workDate: string;
  readonly projectId: string | null;
  readonly activityCode: string | null;
  readonly sourceType: TimeEntrySourceType;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly breakMinutes: number;
  readonly workedMinutes: number;
  readonly scheduledMinutes: number;
  readonly overtimeMinutes: number;
  readonly obMinutes: number;
  readonly jourMinutes: number;
  readonly standbyMinutes: number;
  readonly flexDeltaMinutes: number;
  readonly compDeltaMinutes: number;
  readonly sourceClockEventIds: readonly string[];
  readonly scheduleTemplateId: string | null;
  readonly scheduleTemplateCode: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface TimeBalanceTransaction {
  readonly timeBalanceTransactionId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly balanceType: TimeBalanceType;
  readonly effectiveDate: string;
  readonly deltaMinutes: number;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly explanation: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface TimeBalanceSnapshot {
  readonly companyId: string;
  readonly employmentId: string;
  readonly cutoffDate: string;
  readonly snapshotHash: string;
  readonly balances: Readonly<Record<TimeBalanceType, number>>;
  readonly transactions: readonly TimeBalanceTransaction[];
}

export interface TimePeriodLock {
  readonly timePeriodLockId: string;
  readonly companyId: string;
  readonly employmentId: string | null;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly reasonCode: string;
  readonly note: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface LeaveType {
  readonly leaveTypeId: string;
  readonly companyId: string;
  readonly leaveTypeCode: string;
  readonly displayName: string;
  readonly signalType: LeaveSignalType;
  readonly requiresManagerApproval: boolean;
  readonly requiresSupportingDocument: boolean;
  readonly active: boolean;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeaveDay {
  readonly date: string;
  readonly extentPercent: number | null;
  readonly extentHours: number | null;
  readonly note: string | null;
}

export interface LeaveSignalCompleteness {
  readonly complete: boolean;
  readonly missingFields: readonly string[];
}

export interface LeaveEntryEvent {
  readonly leaveEntryEventId: string;
  readonly companyId: string;
  readonly leaveEntryId: string;
  readonly eventType: string;
  readonly status: string;
  readonly note: string | null;
  readonly actorId: string;
  readonly recordedAt: string;
}

export interface LeaveSignal {
  readonly leaveSignalId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly leaveEntryId: string;
  readonly reportingPeriod: string;
  readonly workDate: string;
  readonly specificationNo: number;
  readonly signalType: LeaveSignalType;
  readonly extentPercent: number | null;
  readonly extentHours: number | null;
  readonly complete: boolean;
  readonly createdAt: string;
}

export interface LeaveEntry {
  readonly leaveEntryId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly leaveTypeId: string;
  readonly leaveTypeCode: string;
  readonly status: LeaveEntryStatus;
  readonly startDate: string;
  readonly endDate: string;
  readonly reportingPeriod: string | null;
  readonly days: readonly LeaveDay[];
  readonly note: string | null;
  readonly supportingDocumentId: string | null;
  readonly sourceChannel: string;
  readonly signalCompleteness: LeaveSignalCompleteness;
  readonly managerEmploymentId: string | null;
  readonly submittedAt: string | null;
  readonly approvedAt: string | null;
  readonly rejectedAt: string | null;
  readonly rejectedReason: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly events: readonly LeaveEntryEvent[];
  readonly signals: readonly LeaveSignal[];
}

export interface LeaveSignalLock {
  readonly leaveSignalLockId: string;
  readonly companyId: string;
  readonly employmentId: string | null;
  readonly reportingPeriod: string;
  readonly lockState: LeaveSignalLockState;
  readonly note: string | null;
  readonly sourceReference: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}
