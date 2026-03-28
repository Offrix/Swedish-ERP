export type TravelApprovalStatus = "submitted" | "approved" | "rejected";
export type MileageVehicleType = "OWN_CAR" | "BENEFIT_CAR" | "BENEFIT_CAR_ELECTRIC";
export type ExpensePaymentMethod = "private_card" | "company_card" | "cash";
export type TravelPayrollConsumptionStage = "calculated" | "approved";

export interface TravelClaimRef {
  readonly travelClaimId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly reportingPeriod: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly approvalStatus: TravelApprovalStatus;
}

export interface TravelClaimValuation {
  readonly travelValuationId: string;
  readonly travelClaimId: string;
  readonly companyId: string;
  readonly reportingPeriod: string;
  readonly taxYear: string;
  readonly ruleVersion: string;
  readonly travelType: "domestic" | "foreign";
  readonly statutoryTaxFreeAllowed: boolean;
  readonly statutoryTaxFreeMaxAllowance: number;
  readonly requestedAllowanceAmount: number;
  readonly taxFreeTravelAllowance: number;
  readonly taxableTravelAllowance: number;
  readonly taxFreeMileage: number;
  readonly taxableMileage: number;
  readonly expenseReimbursementAmount: number;
  readonly companyCardExpenseAmount: number;
  readonly expenseSplit: {
    readonly privateCardExpenseAmount: number;
    readonly cashExpenseAmount: number;
    readonly employeeOutlayExpenseAmount: number;
    readonly companyCardExpenseAmount: number;
    readonly totalExpenseAmount: number;
    readonly mixedFundingSources: boolean;
  };
  readonly travelAdvanceAmount: number;
  readonly netTravelPayoutAmount: number;
  readonly advanceNetDeductionAmount: number;
  readonly sourceSnapshotHash: string;
  readonly warnings: readonly string[];
  readonly reviewCodes: readonly string[];
  readonly explanation: readonly string[];
}

export interface TravelPayrollLinePayload {
  readonly processingStep: number;
  readonly payItemCode: string;
  readonly amount: number;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly note: string;
  readonly dimensionJson: Record<string, unknown>;
  readonly overrides: Record<string, unknown>;
}

export interface TravelPayrollConsumptionRecord {
  readonly travelPayrollConsumptionId: string;
  readonly travelClaimId: string;
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
  readonly stage: TravelPayrollConsumptionStage;
}

export interface TravelPayrollDispatchStatus {
  readonly totalCount: number;
  readonly calculatedCount: number;
  readonly approvedCount: number;
  readonly latestStage: TravelPayrollConsumptionStage | "not_dispatched";
  readonly payRunIds: readonly string[];
}

export interface TravelClaimRecord extends TravelClaimRef {
  readonly purpose: string;
  readonly homeLocation?: string | null;
  readonly regularWorkLocation?: string | null;
  readonly firstDestination?: string | null;
  readonly travelDays: readonly Record<string, unknown>[];
  readonly mealEvents: readonly Record<string, unknown>[];
  readonly countrySegments: readonly Record<string, unknown>[];
  readonly mileageLogs: readonly Record<string, unknown>[];
  readonly expenseReceipts: readonly Record<string, unknown>[];
  readonly travelAdvances: readonly Record<string, unknown>[];
  readonly postingIntents: readonly Record<string, unknown>[];
  readonly valuation: TravelClaimValuation | null;
  readonly payrollConsumptions: readonly TravelPayrollConsumptionRecord[];
  readonly payrollDispatchStatus: TravelPayrollDispatchStatus;
}
