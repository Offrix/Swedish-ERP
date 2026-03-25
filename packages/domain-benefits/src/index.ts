export type BenefitCode =
  | "CAR_BENEFIT"
  | "FUEL_BENEFIT"
  | "WELLNESS_ALLOWANCE"
  | "GIFT"
  | "MEAL_BENEFIT"
  | "HEALTH_INSURANCE";

export type BenefitTaxability = "taxable" | "tax_free" | "partially_taxable";
export type BenefitPayrollConsumptionStage = "calculated" | "approved";
export type BenefitEventStatus = "valued" | "approved" | "dispatched_to_payroll" | "corrected" | "closed";
export type BenefitValuationStatus = "proposed" | "approved" | "superseded";

export interface BenefitCatalogItem {
  readonly benefitCatalogId: string;
  readonly companyId: string;
  readonly benefitCode: BenefitCode;
  readonly displayName: string;
  readonly defaultLedgerAccountCode: string;
  readonly defaultAgiMappingCode: string;
  readonly defaultPayItemCode: string;
  readonly supportedValuationMethods: readonly string[];
  readonly active: boolean;
}

export interface BenefitDecision {
  readonly decisionCode: string;
  readonly inputsHash: string;
  readonly ruleVersion: string;
  readonly effectiveDate: string;
  readonly outputs: Record<string, unknown>;
  readonly warnings: readonly string[];
  readonly explanation: readonly string[];
}

export interface BenefitValuationRecord {
  readonly benefitValuationId: string;
  readonly benefitEventId: string;
  readonly companyId: string;
  readonly benefitCode: BenefitCode;
  readonly reportingPeriod: string;
  readonly taxYear: string;
  readonly valuationMethod: string;
  readonly employerPaidValue: number;
  readonly marketValue: number;
  readonly taxableValueBeforeOffsets: number;
  readonly taxableValue: number;
  readonly taxFreeValue: number;
  readonly employeePaidValue: number;
  readonly netDeductionValue: number;
  readonly agiMappingCode: string;
  readonly ledgerAccountCode: string;
  readonly taxability: BenefitTaxability;
  readonly cashSalaryRequiredForWithholding: boolean;
  readonly status: BenefitValuationStatus;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly decision: BenefitDecision;
}

export interface BenefitPayrollLinePayload {
  readonly processingStep: number;
  readonly payItemCode: string;
  readonly amount: number;
  readonly quantity?: number | null;
  readonly unitRate?: number | null;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly note?: string | null;
  readonly dimensionJson: Record<string, unknown>;
  readonly overrides: Record<string, unknown>;
}

export interface BenefitPayrollConsumptionRecord {
  readonly benefitPayrollConsumptionId: string;
  readonly benefitEventId: string;
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
  readonly stage: BenefitPayrollConsumptionStage;
}

export interface BenefitPayrollDispatchStatus {
  readonly totalCount: number;
  readonly calculatedCount: number;
  readonly approvedCount: number;
  readonly latestStage: BenefitPayrollConsumptionStage | "not_dispatched";
  readonly payRunIds: readonly string[];
}

export interface BenefitEventRecord {
  readonly benefitEventId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly benefitCode: BenefitCode;
  readonly reportingPeriod: string;
  readonly taxYear: string;
  readonly occurredOn: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly sourceType: string;
  readonly sourceId: string | null;
  readonly supportingDocumentId: string | null;
  readonly dimensionJson: Record<string, unknown>;
  readonly payloadJson: Record<string, unknown>;
  readonly status: BenefitEventStatus;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly catalogItem: BenefitCatalogItem;
  readonly valuation: BenefitValuationRecord;
  readonly deductions: readonly Record<string, unknown>[];
  readonly documents: readonly Record<string, unknown>[];
  readonly postingIntents: readonly Record<string, unknown>[];
  readonly agiMappings: readonly Record<string, unknown>[];
  readonly payrollConsumptions: readonly BenefitPayrollConsumptionRecord[];
  readonly payrollDispatchStatus: BenefitPayrollDispatchStatus;
}
