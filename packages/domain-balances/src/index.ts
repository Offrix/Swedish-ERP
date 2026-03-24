export type BalanceUnitCode = "days" | "hours" | "minutes" | "sek" | "units";
export type BalanceOwnerTypeCode = "company" | "employee" | "employment";
export type BalanceAccountStatus = "open" | "closed";
export type BalanceTransactionTypeCode =
  | "baseline"
  | "earn"
  | "spend"
  | "carry_forward_in"
  | "carry_forward_out"
  | "expire"
  | "correction";
export type BalanceCarryForwardModeCode = "none" | "full" | "cap";
export type BalanceExpiryModeCode = "none" | "rolling_days" | "fixed_date";

export interface BalanceType {
  readonly balanceTypeId: string;
  readonly companyId: string;
  readonly balanceTypeCode: string;
  readonly label: string;
  readonly unitCode: BalanceUnitCode;
  readonly negativeAllowed: boolean;
  readonly minimumBalance: number | null;
  readonly maximumBalance: number | null;
  readonly carryForwardModeCode: BalanceCarryForwardModeCode;
  readonly carryForwardCapQuantity: number | null;
  readonly expiryModeCode: BalanceExpiryModeCode;
  readonly expiryDays: number | null;
  readonly expiryMonthDay: string | null;
  readonly expiryYearOffset: number;
  readonly active: boolean;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BalanceAccount {
  readonly balanceAccountId: string;
  readonly companyId: string;
  readonly balanceTypeId: string;
  readonly balanceTypeCode: string;
  readonly ownerTypeCode: BalanceOwnerTypeCode;
  readonly employeeId: string | null;
  readonly employmentId: string | null;
  readonly status: BalanceAccountStatus;
  readonly openedOn: string;
  readonly closedOn: string | null;
  readonly externalReference: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly balanceType: BalanceType;
}

export interface BalanceTransaction {
  readonly balanceTransactionId: string;
  readonly companyId: string;
  readonly balanceAccountId: string;
  readonly balanceTypeId: string;
  readonly balanceTypeCode: string;
  readonly ownerTypeCode: BalanceOwnerTypeCode;
  readonly employeeId: string | null;
  readonly employmentId: string | null;
  readonly effectiveDate: string;
  readonly transactionTypeCode: BalanceTransactionTypeCode;
  readonly quantityDelta: number;
  readonly quantityAfter: number;
  readonly unitCode: BalanceUnitCode;
  readonly sourceDomainCode: string;
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  readonly sourceReference: string | null;
  readonly idempotencyKey: string | null;
  readonly explanation: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}
