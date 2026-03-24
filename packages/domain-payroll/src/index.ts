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

export interface EmploymentStatutoryProfile {
  readonly employmentStatutoryProfileId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly taxMode: "pending" | "manual_rate" | "sink";
  readonly taxRatePercent: number | null;
  readonly contributionClassCode: string | null;
  readonly sinkDecisionType: string | null;
  readonly sinkValidFrom: string | null;
  readonly sinkValidTo: string | null;
  readonly sinkRatePercent: number | null;
  readonly sinkSeaIncome: boolean;
  readonly sinkDecisionDocumentId: string | null;
  readonly fallbackTaxMode: "pending" | "manual_rate" | "sink" | null;
  readonly fallbackTaxRatePercent: number | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly dimensionJson: Record<string, unknown>;
}

export interface PayrollPostingLine {
  readonly accountNumber: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly dimensionJson: Record<string, unknown>;
}

export interface PayrollPosting {
  readonly payrollPostingId: string;
  readonly companyId: string;
  readonly payRunId: string;
  readonly reportingPeriod: string;
  readonly runType: string;
  readonly status: string;
  readonly journalEntryId: string;
  readonly payloadHash: string;
  readonly sourceSnapshotHash: string;
  readonly totals: Record<string, unknown>;
  readonly journalLines: readonly PayrollPostingLine[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PayrollPayoutBatchLine {
  readonly payrollPayoutLineId: string;
  readonly employmentId: string;
  readonly employeeId: string;
  readonly employeeNumber: string | null;
  readonly payeeName: string;
  readonly payoutMethod: string | null;
  readonly accountTarget: string | null;
  readonly employeeBankAccountId: string | null;
  readonly amount: number;
  readonly currencyCode: string;
  readonly paymentReference: string;
}

export interface PayrollPayoutBatch {
  readonly payrollPayoutBatchId: string;
  readonly companyId: string;
  readonly payRunId: string;
  readonly reportingPeriod: string;
  readonly bankAccountId: string;
  readonly status: string;
  readonly totalAmount: number;
  readonly paymentDate: string;
  readonly exportFileName: string;
  readonly exportPayload: string;
  readonly exportPayloadHash: string;
  readonly lines: readonly PayrollPayoutBatchLine[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly matchedAt: string | null;
  readonly matchedByActorId: string | null;
  readonly matchedJournalEntryId: string | null;
  readonly bankEventId: string | null;
}

export interface VacationLiabilitySnapshot {
  readonly vacationLiabilitySnapshotId: string;
  readonly companyId: string;
  readonly reportingPeriod: string;
  readonly payRunIds: readonly string[];
  readonly totals: Record<string, unknown>;
  readonly employeeSnapshots: readonly Record<string, unknown>[];
  readonly snapshotHash: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface AgiEmployeeLine {
  readonly agiEmployeeLineId: string;
  readonly agiEmployeeId: string;
  readonly agiSubmissionVersionId: string;
  readonly companyId: string;
  readonly employeeId: string | null;
  readonly sourcePayRunId: string | null;
  readonly sourcePayRunLineId: string | null;
  readonly payItemCode: string;
  readonly agiMappingCode: string;
  readonly amount: number;
  readonly directionalAmount: number;
  readonly payloadJson: Record<string, unknown>;
}

export interface AgiEmployeePayload {
  readonly agiEmployeeId: string;
  readonly agiSubmissionVersionId: string;
  readonly companyId: string;
  readonly employeeId: string | null;
  readonly personIdentifierType: string;
  readonly personIdentifier: string | null;
  readonly protectedIdentity: boolean;
  readonly payloadHash: string;
  readonly payloadJson: Record<string, unknown>;
  readonly lines: readonly AgiEmployeeLine[];
}

export interface AgiSubmissionVersion {
  readonly agiSubmissionVersionId: string;
  readonly agiSubmissionId: string;
  readonly companyId: string;
  readonly reportingPeriod: string;
  readonly versionNo: number;
  readonly state: string;
  readonly previousVersionId: string | null;
  readonly previousSubmittedVersionId: string | null;
  readonly correctionReason: string | null;
  readonly sourcePayRunIds: readonly string[];
  readonly sourceSnapshotHash: string;
  readonly payloadHash: string;
  readonly payloadJson: Record<string, unknown>;
  readonly adapterPayloadJson: Record<string, unknown>;
  readonly changedEmployeeIds: readonly string[];
  readonly lockEmploymentIds: readonly string[];
  readonly validationErrors: readonly Record<string, unknown>[];
  readonly validationWarnings: readonly Record<string, unknown>[];
  readonly totalsMatch: boolean;
  readonly validatedAt: string | null;
  readonly readyForSignAt: string | null;
  readonly readyForSignByActorId: string | null;
  readonly submittedAt: string | null;
  readonly submittedByActorId: string | null;
  readonly submissionMode: string | null;
  readonly supersededAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly employees: readonly AgiEmployeePayload[];
  readonly absencePayloads: readonly Record<string, unknown>[];
  readonly receipts: readonly Record<string, unknown>[];
  readonly errors: readonly Record<string, unknown>[];
  readonly signatures: readonly Record<string, unknown>[];
}

export interface AgiSubmission {
  readonly agiSubmissionId: string;
  readonly companyId: string;
  readonly agiPeriodId: string;
  readonly reportingPeriod: string;
  readonly currentVersionId: string | null;
  readonly latestSubmittedVersionId: string | null;
  readonly status: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly currentVersion: AgiSubmissionVersion | null;
  readonly versions: readonly AgiSubmissionVersion[];
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

export interface PayrollException {
  readonly payrollExceptionId: string;
  readonly companyId: string;
  readonly payRunId: string;
  readonly reportingPeriod: string;
  readonly employmentId: string | null;
  readonly employeeId: string | null;
  readonly code: string;
  readonly message: string;
  readonly severity: string;
  readonly blocking: boolean;
  readonly resolutionPolicy: string;
  readonly status: string;
  readonly details: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt: string | null;
  readonly resolvedByActorId: string | null;
  readonly resolutionNote: string | null;
}

export interface PayRunRef {
  readonly payRunId: string;
  readonly companyId: string;
  readonly payCalendarId: string;
  readonly payCalendarCode: string;
  readonly reportingPeriod: string;
  readonly periodStartsOn: string;
  readonly periodEndsOn: string;
  readonly payDate: string;
  readonly runType: string;
  readonly status: string;
  readonly migrationBatchId: string | null;
  readonly migrationSnapshot: Record<string, unknown> | null;
  readonly correctionOfPayRunId: string | null;
  readonly correctionReason: string | null;
  readonly sourceSnapshotHash: string;
  readonly balanceSnapshotHash: string;
  readonly agreementSnapshotHash: string;
  readonly warningCodes: readonly string[];
  readonly exceptionSummary: Record<string, number>;
  readonly calculationSteps: readonly PayrollStepSummary[];
  readonly exceptions: readonly PayrollException[];
  readonly lines: readonly PayRunLine[];
  readonly payslips: readonly PayslipSnapshot[];
}
