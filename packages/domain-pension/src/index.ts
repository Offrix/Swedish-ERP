export type PensionPlanCode = "ITP1" | "ITP2" | "FORA" | "EXTRA_PENSION";
export type PensionProviderCode = "collectum" | "fora" | "custom";
export type PensionContributionMode = "rate_percent" | "fixed_amount";
export type SalaryExchangeStatus = "draft" | "active" | "paused" | "stopped";
export type SalaryExchangeMode = "fixed_amount" | "percent_of_gross";
export type SalaryExchangeBasisTreatment = "maintain_pre_exchange" | "reduce_with_exchange";
export type PensionReportStatus = "draft" | "ready" | "submitted" | "corrected";
export type PensionReconciliationStatus = "matched" | "difference_detected";
export type PensionPayrollConsumptionStage = "calculated" | "approved";

export interface PensionPlanRef {
  readonly pensionPlanId: string;
  readonly companyId: string;
  readonly planCode: PensionPlanCode;
  readonly providerCode: PensionProviderCode;
  readonly collectiveAgreementCode: string;
  readonly displayName: string;
  readonly reportModelCode: string;
  readonly defaultPayItemCode: string;
  readonly active: boolean;
}

export interface PensionEnrollmentRef {
  readonly pensionEnrollmentId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly planCode: PensionPlanCode;
  readonly providerCode: PensionProviderCode;
  readonly collectiveAgreementCode: string;
  readonly contributionMode: PensionContributionMode;
  readonly contributionRatePercent: number | null;
  readonly fixedContributionAmount: number | null;
  readonly contributionBasisCode: string;
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly status: string;
  readonly dimensionJson: Record<string, unknown>;
}

export interface SalaryExchangeSimulation {
  readonly policyVersionRef: string;
  readonly policyEffectiveFrom: string;
  readonly policyEffectiveTo: string | null;
  readonly minimumMonthlyExchangeAmount: number;
  readonly maximumExchangeShare: number;
  readonly exchangedAmount: number;
  readonly employerMarkupPercent: number;
  readonly employerMarkupAmount: number;
  readonly employerPensionContributionAmount: number;
  readonly projectedCashSalaryAfterExchange: number;
  readonly thresholdAmount: number;
  readonly specialPayrollTaxRatePercent: number;
  readonly warnings: readonly string[];
  readonly blockingIssues: readonly string[];
}

export interface SalaryExchangeAgreementRef {
  readonly salaryExchangeAgreementId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly status: SalaryExchangeStatus;
  readonly exchangeMode: SalaryExchangeMode;
  readonly exchangeValue: number;
  readonly employerMarkupPercent: number;
  readonly thresholdAmount: number;
  readonly policyVersionRef: string;
  readonly policyEffectiveFrom: string;
  readonly policyEffectiveTo: string | null;
  readonly minimumMonthlyExchangeAmount: number;
  readonly maximumExchangeShare: number;
  readonly specialPayrollTaxRatePercent: number;
  readonly basisTreatmentCode: SalaryExchangeBasisTreatment;
  readonly providerCode: PensionProviderCode;
  readonly preview: SalaryExchangeSimulation;
  readonly payrollConsumptions: readonly PensionPayrollConsumptionRecord[];
  readonly payrollDispatchStatus: PensionPayrollDispatchStatus;
}

export interface PensionBasisSnapshotRef {
  readonly pensionBasisSnapshotId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly reportingPeriod: string;
  readonly monthlyGrossSalaryBeforeExchange: number;
  readonly salaryExchangeAmount: number;
  readonly pensionableBaseBeforeExchange: number;
  readonly pensionableBaseAfterExchange: number;
  readonly totalPensionPremiumAmount: number;
  readonly specialPayrollTaxAmount: number;
  readonly policyVersionRef: string;
  readonly policyEffectiveFrom: string;
  readonly policyEffectiveTo: string | null;
  readonly specialPayrollTaxRatePercent: number;
  readonly basisTreatmentCode: SalaryExchangeBasisTreatment;
  readonly warningCodes: readonly string[];
  readonly snapshotHash: string;
  readonly payrollConsumptions: readonly PensionPayrollConsumptionRecord[];
  readonly payrollDispatchStatus: PensionPayrollDispatchStatus;
}

export interface PensionPayrollLinePayload {
  readonly processingStep: number;
  readonly payItemCode: string;
  readonly amount: number;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourcePeriod: string;
  readonly note: string | null;
  readonly dimensionJson: Record<string, unknown>;
}

export interface PensionPayrollConsumptionRecord {
  readonly pensionPayrollConsumptionId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly sourceType: "pension_event" | "salary_exchange_agreement" | "pension_basis_snapshot";
  readonly sourceId: string;
  readonly payRunId: string;
  readonly payRunLineId: string;
  readonly payItemCode: string;
  readonly processingStep: number;
  readonly amount: number;
  readonly sourceSnapshotHash: string | null;
  readonly stage: PensionPayrollConsumptionStage;
}

export interface PensionPayrollDispatchStatus {
  readonly totalCount: number;
  readonly calculatedCount: number;
  readonly approvedCount: number;
  readonly latestStage: PensionPayrollConsumptionStage | "not_dispatched";
  readonly payRunIds: readonly string[];
}

export interface PensionEventRef {
  readonly pensionEventId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly reportingPeriod: string;
  readonly planCode: PensionPlanCode;
  readonly providerCode: PensionProviderCode;
  readonly collectiveAgreementCode: string;
  readonly eventCode: string;
  readonly pensionableSalary: number;
  readonly reportBasisAmount: number;
  readonly contributionRatePercent: number | null;
  readonly contributionAmount: number;
  readonly salaryExchangeFlag: boolean;
  readonly extraPensionFlag: boolean;
  readonly reportStatus: PensionReportStatus;
  readonly invoiceReconciliationStatus: string;
  readonly payrollLinePayloadJson: PensionPayrollLinePayload;
  readonly warningCodes: readonly string[];
  readonly payrollConsumptions: readonly PensionPayrollConsumptionRecord[];
  readonly payrollDispatchStatus: PensionPayrollDispatchStatus;
}

export interface PensionReportLineRef {
  readonly pensionReportLineId: string;
  readonly collectiveAgreementCode: string;
  readonly planCode: PensionPlanCode;
  readonly providerCode: PensionProviderCode;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly reportingBasisAmount: number;
  readonly contributionAmount: number;
  readonly payloadJson: Record<string, unknown>;
}

export interface PensionProviderExportInstructionRef {
  readonly instructionVersionRef: string;
  readonly providerCode: PensionProviderCode;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly transportModeCode: string;
  readonly payloadFormatCode: string;
  readonly submissionChannelCode: string;
  readonly legalEffectMode: string;
  readonly reportDueStrategy: string;
  readonly invoiceDueDayOfNextMonth: number | null;
}

export interface PensionReportRef {
  readonly pensionReportId: string;
  readonly companyId: string;
  readonly reportingPeriod: string;
  readonly providerCode: PensionProviderCode;
  readonly reportStatus: PensionReportStatus;
  readonly providerExportInstruction: PensionProviderExportInstructionRef;
  readonly dueDate: string | null;
  readonly invoiceDueDate: string | null;
  readonly totals: Record<string, unknown>;
  readonly lines: readonly PensionReportLineRef[];
}

export interface PensionReconciliationRef {
  readonly pensionReconciliationId: string;
  readonly companyId: string;
  readonly reportingPeriod: string;
  readonly providerCode: PensionProviderCode;
  readonly expectedAmount: number;
  readonly invoicedAmount: number;
  readonly differenceAmount: number;
  readonly status: PensionReconciliationStatus;
  readonly invoiceDocumentId: string | null;
}

export interface PensionPayrollPayloadBundle {
  readonly enrollments: readonly PensionEnrollmentRef[];
  readonly activeAgreements: readonly SalaryExchangeAgreementRef[];
  readonly basisSnapshots: readonly PensionBasisSnapshotRef[];
  readonly events: readonly PensionEventRef[];
  readonly payLinePayloads: readonly PensionPayrollLinePayload[];
  readonly warnings: readonly string[];
}
