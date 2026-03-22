export type TimeClockEventType = "clock_in" | "clock_out";
export type TimeBalanceType = "flex_minutes" | "comp_minutes" | "overtime_minutes";
export type TimeEntrySourceType = "manual" | "clock" | "import";

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
