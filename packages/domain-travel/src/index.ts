export type TravelApprovalStatus = "submitted" | "approved" | "rejected";
export type MileageVehicleType = "OWN_CAR" | "BENEFIT_CAR" | "BENEFIT_CAR_ELECTRIC";
export type ExpensePaymentMethod = "private_card" | "company_card" | "cash";

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
  readonly travelAdvanceAmount: number;
  readonly netTravelPayoutAmount: number;
  readonly advanceNetDeductionAmount: number;
  readonly sourceSnapshotHash: string;
  readonly warnings: readonly string[];
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
