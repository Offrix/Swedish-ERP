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
  readonly manualRateReasonCode: string | null;
  readonly fallbackTaxMode: "pending" | "manual_rate" | "sink" | null;
  readonly fallbackTaxRatePercent: number | null;
  readonly fallbackManualRateReasonCode: string | null;
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
  readonly payrollInputSnapshotId: string | null;
  readonly payrollInputFingerprint: string | null;
  readonly payRunFingerprint: string | null;
  readonly sourceSnapshotHash: string;
  readonly rulepackRefs: readonly Record<string, unknown>[];
  readonly providerBaselineRefs: readonly Record<string, unknown>[];
  readonly decisionSnapshotRefs: readonly Record<string, unknown>[];
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
  readonly bankRailMode: string;
  readonly watermarkCode: string | null;
}

export interface PayrollPayoutBatch {
  readonly payrollPayoutBatchId: string;
  readonly companyId: string;
  readonly payRunId: string;
  readonly reportingPeriod: string;
  readonly bankAccountId: string;
  readonly status: string;
  readonly bankRailMode: string;
  readonly executionBoundary: Record<string, unknown> | null;
  readonly watermarkCode: string | null;
  readonly totalAmount: number;
  readonly paymentDate: string;
  readonly exportFileName: string;
  readonly exportPayload: string;
  readonly exportPayloadHash: string;
  readonly payrollInputSnapshotId: string | null;
  readonly payrollInputFingerprint: string | null;
  readonly payRunFingerprint: string | null;
  readonly rulepackRefs: readonly Record<string, unknown>[];
  readonly providerBaselineRefs: readonly Record<string, unknown>[];
  readonly decisionSnapshotRefs: readonly Record<string, unknown>[];
  readonly lines: readonly PayrollPayoutBatchLine[];
  readonly evidenceBundleId: string | null;
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
  readonly executionBoundary: Record<string, unknown> | null;
  readonly trialGuard: Record<string, unknown> | null;
  readonly evidenceBundleId: string | null;
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
  readonly executionBoundary: Record<string, unknown> | null;
  readonly watermark: Record<string, unknown> | null;
  readonly agiPreview: Record<string, unknown> | null;
  readonly postingIntentPreview: Record<string, unknown> | null;
  readonly bankPaymentPreview: Record<string, unknown> | null;
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

export interface TaxDecisionSnapshot {
  readonly taxDecisionSnapshotId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly decisionType:
    | "tabell"
    | "jamkning"
    | "jamkning_fast"
    | "jamkning_procent"
    | "engangsskatt"
    | "sink"
    | "a_sink"
    | "asink"
    | "emergency_manual";
  readonly incomeYear: number;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly municipalityCode: string | null;
  readonly tableCode: string | null;
  readonly columnCode: string | null;
  readonly adjustmentFixedAmount: number | null;
  readonly adjustmentPercentage: number | null;
  readonly withholdingRatePercent: number | null;
  readonly withholdingFixedAmount: number | null;
  readonly annualIncomeBasisAmount: number | null;
  readonly decisionSource: string;
  readonly decisionReference: string;
  readonly evidenceRef: string;
  readonly reasonCode: string | null;
  readonly sinkRatePercent: number | null;
  readonly sinkSeaIncome: boolean;
  readonly status: "draft" | "approved" | "superseded";
  readonly requiresDualReview: boolean;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly supersededAt: string | null;
  readonly supersededBySnapshotId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EmployerContributionDecisionSnapshot {
  readonly employerContributionDecisionSnapshotId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly decisionType:
    | "full"
    | "reduced_age_pension_only"
    | "temporary_youth_reduction"
    | "vaxa"
    | "no_contribution"
    | "emergency_manual";
  readonly ageBucket: string;
  readonly legalBasisCode: string;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly baseLimit: number | null;
  readonly fullRate: number;
  readonly reducedRate: number | null;
  readonly specialConditions: Record<string, unknown>;
  readonly decisionSource: string;
  readonly decisionReference: string;
  readonly evidenceRef: string;
  readonly reasonCode: string | null;
  readonly status: "draft" | "approved" | "superseded";
  readonly requiresDualReview: boolean;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly supersededAt: string | null;
  readonly supersededBySnapshotId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GarnishmentDecisionSnapshot {
  readonly garnishmentDecisionSnapshotId: string;
  readonly companyId: string;
  readonly employmentId: string;
  readonly decisionType: "authority_order" | "manual_override";
  readonly incomeYear: number;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly deductionModelCode: "max_above_protected_amount" | "fixed_amount";
  readonly fixedDeductionAmount: number | null;
  readonly maximumWithheldAmount: number | null;
  readonly protectedAmountAmount: number;
  readonly householdProfile: Record<string, unknown>;
  readonly householdTypeCode: "single_adult" | "cohabiting_adults";
  readonly householdAdultCount: number;
  readonly householdChildCount: number;
  readonly housingCostAmount: number | null;
  readonly additionalAllowanceAmount: number | null;
  readonly protectedAmountBaseline: Record<string, unknown>;
  readonly authorityCaseReference: string;
  readonly remittanceRecipientName: string;
  readonly remittanceMethodCode: string;
  readonly remittanceBankgiro: string | null;
  readonly remittancePlusgiro: string | null;
  readonly remittanceOcrReference: string | null;
  readonly decisionSource: string;
  readonly decisionReference: string;
  readonly evidenceRef: string;
  readonly reasonCode: string | null;
  readonly status: "draft" | "approved" | "superseded";
  readonly requiresDualReview: boolean;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly supersededAt: string | null;
  readonly supersededBySnapshotId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RemittanceInstruction {
  readonly remittanceInstructionId: string;
  readonly companyId: string;
  readonly payRunId: string;
  readonly reportingPeriod: string;
  readonly payDate: string;
  readonly employmentId: string;
  readonly employeeId: string;
  readonly garnishmentDecisionSnapshotId: string | null;
  readonly amount: number;
  readonly protectedAmountAmount: number;
  readonly cashAfterTax: number;
  readonly availableAboveProtected: number;
  readonly authorityCaseReference: string | null;
  readonly remittanceRecipientName: string;
  readonly remittanceMethodCode: string;
  readonly remittanceBankgiro: string | null;
  readonly remittancePlusgiro: string | null;
  readonly remittanceOcrReference: string | null;
  readonly protectedAmountBaseline: Record<string, unknown>;
  readonly householdProfile: Record<string, unknown>;
  readonly paymentOrderState: string;
  readonly paymentOrderReference: string;
  readonly paymentOrderPayload: Record<string, unknown>;
  readonly status: "payment_order_ready" | "settled" | "returned" | "corrected";
  readonly sourceSnapshotHash: string;
  readonly payRunFingerprint: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly settledAt: string | null;
  readonly settledByActorId: string | null;
  readonly returnedAt: string | null;
  readonly returnedByActorId: string | null;
  readonly returnReasonCode: string | null;
  readonly correctedAmount: number | null;
  readonly corrections: readonly Record<string, unknown>[];
  readonly bankEventId: string | null;
  readonly payRun: Record<string, unknown> | null;
  readonly decisionSnapshot: GarnishmentDecisionSnapshot | null;
}

export interface DocumentClassificationPayrollConsumption {
  readonly documentClassificationPayrollConsumptionId: string;
  readonly documentClassificationPayrollPayloadId: string;
  readonly treatmentIntentId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly payRunId: string;
  readonly payRunLineId: string;
  readonly payItemCode: string;
  readonly processingStep: number;
  readonly sourceType: string;
  readonly amount: number;
  readonly sourceSnapshotHash: string | null;
  readonly stage: string;
  readonly calculatedAt: string;
  readonly calculatedByActorId: string;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly updatedAt: string;
}

export interface DocumentClassificationPayrollPayload {
  readonly documentClassificationPayrollPayloadId: string;
  readonly companyId: string;
  readonly classificationCaseId: string;
  readonly treatmentIntentId: string;
  readonly documentId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly reportingPeriod: string;
  readonly treatmentCode: string;
  readonly payItemCode: string;
  readonly processingStep: number;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly status: string;
  readonly payLinePayloadJson: Record<string, unknown>;
  readonly payloadHash: string;
  readonly metadataJson: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedByActorId: string;
  readonly reversedAt: string | null;
  readonly reversedByActorId: string | null;
  readonly reversalReasonCode: string | null;
  readonly replacementTreatmentIntentId: string | null;
  readonly consumptions: readonly DocumentClassificationPayrollConsumption[];
  readonly dispatchStatus: {
    readonly totalCount: number;
    readonly calculatedCount: number;
    readonly approvedCount: number;
    readonly latestStage: string;
    readonly payRunIds: readonly string[];
  };
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
  readonly executionBoundary: Record<string, unknown> | null;
  readonly payrollInputSnapshotId: string | null;
  readonly payrollInputFingerprint: string;
  readonly payRunFingerprint: string;
  readonly sourceSnapshotHash: string;
  readonly balanceSnapshotHash: string;
  readonly agreementSnapshotHash: string;
  readonly postingIntentSnapshotHash: string;
  readonly bankPaymentSnapshotHash: string;
  readonly warningCodes: readonly string[];
  readonly rulepackRefs: readonly Record<string, unknown>[];
  readonly providerBaselineRefs: readonly Record<string, unknown>[];
  readonly decisionSnapshotRefs: readonly Record<string, unknown>[];
  readonly payrollInputSnapshot: PayrollInputSnapshot | null;
  readonly exceptionSummary: Record<string, number>;
  readonly calculationSteps: readonly PayrollStepSummary[];
  readonly exceptions: readonly PayrollException[];
  readonly lines: readonly PayRunLine[];
  readonly remittanceInstructions: readonly RemittanceInstruction[];
  readonly remittanceSummary: Record<string, number>;
  readonly payslips: readonly PayslipSnapshot[];
}

export interface PayrollInputSnapshot {
  readonly payrollInputSnapshotId: string;
  readonly companyId: string;
  readonly payRunId: string;
  readonly payCalendarId: string;
  readonly payCalendarCode: string;
  readonly reportingPeriod: string;
  readonly periodStartsOn: string;
  readonly periodEndsOn: string;
  readonly payDate: string;
  readonly runType: string;
  readonly employmentIds: readonly string[];
  readonly migrationBatchId: string | null;
  readonly migrationSnapshot: Record<string, unknown> | null;
  readonly correctionOfPayRunId: string | null;
  readonly correctionReason: string | null;
  readonly executionBoundary: Record<string, unknown> | null;
  readonly sourceSnapshot: Record<string, unknown>;
  readonly agreementSnapshots: readonly Record<string, unknown>[];
  readonly balanceSnapshots: readonly Record<string, unknown>[];
  readonly rulepackRefs: readonly Record<string, unknown>[];
  readonly providerBaselineRefs: readonly Record<string, unknown>[];
  readonly decisionSnapshotRefs: readonly Record<string, unknown>[];
  readonly sourceSnapshotHash: string;
  readonly balanceSnapshotHash: string;
  readonly agreementSnapshotHash: string;
  readonly decisionSnapshotHash: string;
  readonly inputFingerprint: string;
  readonly lockedAt: string;
  readonly lockedByActorId: string;
}
