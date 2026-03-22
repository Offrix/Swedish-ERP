export interface PayItemDefinition {
  readonly payItemId: string;
  readonly companyId: string;
  readonly payItemCode: string;
  readonly payItemType: string;
  readonly displayName: string;
  readonly calculationBasis: string;
  readonly unitCode: string;
  readonly compensationBucket: string;
  readonly defaultUnitAmount: number | null;
  readonly defaultRateFactor: number | null;
  readonly taxTreatmentCode: string;
  readonly employerContributionTreatmentCode: string;
  readonly agiMappingCode: string;
  readonly ledgerAccountCode: string;
  readonly defaultDimensions: Record<string, unknown>;
  readonly affectsVacationBasis: boolean;
  readonly affectsPensionBasis: boolean;
  readonly includedInNetPay: boolean;
  readonly reportingOnly: boolean;
  readonly active: boolean;
}

export interface PayCalendar {
  readonly payCalendarId: string;
  readonly companyId: string;
  readonly payCalendarCode: string;
  readonly displayName: string;
  readonly frequencyCode: string;
  readonly cutoffDay: number;
  readonly payDay: number;
  readonly timezone: string;
  readonly defaultCurrencyCode: string;
  readonly active: boolean;
}

export interface PayRunLine {
  readonly employmentId: string;
  readonly employeeId: string;
  readonly payItemCode: string;
  readonly payItemType: string;
  readonly displayName: string;
  readonly compensationBucket: string;
  readonly quantity: number | null;
  readonly unitCode: string;
  readonly unitRate: number | null;
  readonly amount: number;
  readonly taxTreatmentCode: string;
  readonly employerContributionTreatmentCode: string;
  readonly agiMappingCode: string;
  readonly ledgerAccountCode: string;
  readonly affectsVacationBasis: boolean;
  readonly affectsPensionBasis: boolean;
  readonly includedInNetPay: boolean;
  readonly reportingOnly: boolean;
  readonly sourceType: string;
  readonly sourceId: string | null;
  readonly sourcePeriod: string | null;
  readonly sourcePayRunId: string | null;
  readonly sourceLineId: string | null;
  readonly calculationStatus: string;
  readonly note: string | null;
}

export interface PayslipSnapshot {
  readonly payslipId: string;
  readonly payRunId: string;
  readonly snapshotHash: string;
  readonly reportingPeriod: string;
  readonly payDate: string;
  readonly runType: string;
  readonly employee: Record<string, unknown>;
  readonly employment: Record<string, unknown>;
  readonly contract: Record<string, unknown> | null;
  readonly lines: readonly PayRunLine[];
  readonly balances: Record<string, unknown>;
  readonly totals: Record<string, unknown>;
  readonly warnings: readonly Record<string, unknown>[];
  readonly generatedAt: string;
  readonly generatedByActorId: string;
  readonly regenerationNo: number;
  readonly regeneratedAt: string | null;
  readonly regeneratedByActorId: string | null;
}

export interface PayrollStepSummary {
  readonly stepNo: number;
  readonly stepCode: string;
  readonly description: string;
  readonly status: string;
  readonly employmentCount: number;
  readonly employmentStatuses: readonly string[];
}

export interface PayRunRef {
  readonly payRunId: string;
  readonly companyId: string;
  readonly reportingPeriod: string;
  readonly payDate: string;
  readonly runType: string;
  readonly status: string;
  readonly sourceSnapshotHash: string;
  readonly warningCodes: readonly string[];
  readonly calculationSteps: readonly PayrollStepSummary[];
  readonly lines: readonly PayRunLine[];
  readonly payslips: readonly PayslipSnapshot[];
}
