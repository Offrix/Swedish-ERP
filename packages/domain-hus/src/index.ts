export type HusCaseState =
  | "draft"
  | "classified"
  | "invoiced"
  | "customer_partially_paid"
  | "customer_paid"
  | "claim_draft"
  | "claim_submitted"
  | "claim_accepted"
  | "claim_partially_accepted"
  | "claim_rejected"
  | "paid_out"
  | "credit_pending"
  | "recovery_pending"
  | "closed";

export type HusServiceTypeCode = "rot" | "rut" | "not_eligible";

export interface HusCaseBuyerRef {
  readonly husCaseBuyerId: string;
  readonly buyerNo: number;
  readonly displayName: string;
  readonly personalIdentityNumber: string;
  readonly allocationPercent: number;
  readonly customerShareAmount: number;
  readonly preliminaryReductionAmount: number;
}

export interface HusServiceLineRef {
  readonly husServiceLineId: string;
  readonly lineNo: number;
  readonly description: string;
  readonly serviceTypeCode: HusServiceTypeCode;
  readonly laborCostAmount: number;
  readonly materialAmount: number;
  readonly travelAmount: number;
  readonly equipmentAmount: number;
  readonly adminAmount: number;
  readonly otherAmount: number;
  readonly totalAmount: number;
  readonly eligibleLaborAmount: number;
  readonly preliminaryReductionAmount: number;
  readonly customerShareAmount: number;
}

export interface HusClaimRef {
  readonly husClaimId: string;
  readonly companyId: string;
  readonly husCaseId: string;
  readonly versionNo: number;
  readonly requestedAmount: number;
  readonly transportType: "json" | "xml";
  readonly status: string;
  readonly submittedOn: string | null;
  readonly payloadHash: string | null;
}
