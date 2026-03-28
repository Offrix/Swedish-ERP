export type HusCaseState =
  | "draft"
  | "classified"
  | "invoice_blocked"
  | "invoiced"
  | "customer_partially_paid"
  | "customer_paid"
  | "claim_draft"
  | "claim_submitted"
  | "claim_accepted"
  | "claim_partially_accepted"
  | "claim_rejected"
  | "paid_out"
  | "recovery_pending"
  | "closed";

export type HusServiceTypeCode = "rot" | "rut" | "not_eligible";
export type HusHousingFormCode = "smallhouse" | "owner_apartment" | "condominium" | "rental_apartment" | "household_other";
export type HusClaimEligibilityStatus = "blocked" | "not_ready" | "partial_ready" | "ready" | "claimed_out";

export interface HusPropertyProfileRef {
  readonly housingFormCode: HusHousingFormCode | null;
  readonly propertyDesignation: string | null;
  readonly apartmentDesignation: string | null;
  readonly housingAssociationOrgNumber: string | null;
  readonly serviceAddressLine1: string | null;
  readonly postalCode: string | null;
  readonly city: string | null;
}

export interface HusCaseBuyerRef {
  readonly husCaseBuyerId: string;
  readonly buyerNo: number;
  readonly displayName: string;
  readonly personalIdentityNumber: string;
  readonly allocationPercent: number;
  readonly relationCode: string;
  readonly eligibilityFlags: {
    readonly residentAtAddress: boolean;
    readonly ownsResidence: boolean;
  };
  readonly customerShareAmount: number;
  readonly preliminaryReductionAmount: number;
}

export interface HusServiceLineRef {
  readonly husServiceLineId: string;
  readonly lineNo: number;
  readonly description: string;
  readonly serviceTypeCode: HusServiceTypeCode;
  readonly workedHours: number | null;
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

export interface HusPaymentAllocationRef {
  readonly husCustomerPaymentId: string;
  readonly paidOn: string;
  readonly latestAllowedSubmissionDate: string;
  readonly claimReductionAmount: number;
}

export interface HusBuyerAllocationRef {
  readonly husCaseBuyerId: string;
  readonly displayName: string;
  readonly personalIdentityNumber: string;
  readonly allocationPercent: number;
  readonly requestedAmount: number;
  readonly annualCapAmount: number;
  readonly serviceTypeCapAmount: number;
  readonly annualUsedAmountBeforeClaim: number;
  readonly serviceTypeUsedAmountBeforeClaim: number;
  readonly remainingAnnualCapAmountAfterClaim: number;
  readonly remainingServiceTypeCapAmountAfterClaim: number;
}

export interface HusTransportProfileRef {
  readonly transportType: "json" | "xml" | "direct_api";
  readonly deliveryChannelCode: "legacy_json" | "signed_xml" | "direct_api";
  readonly serializationFormatCode: "json" | "xml" | "canonical_json";
  readonly supportsOfficialSubmission: boolean;
}

export interface HusClaimRef {
  readonly husClaimId: string;
  readonly companyId: string;
  readonly husCaseId: string;
  readonly versionNo: number;
  readonly requestedAmount: number;
  readonly transportType: "json" | "xml" | "direct_api";
  readonly status: string;
  readonly submittedOn: string | null;
  readonly payloadHash: string | null;
  readonly claimReadinessStatus: HusClaimEligibilityStatus;
  readonly paymentAllocations: readonly HusPaymentAllocationRef[];
  readonly buyerAllocations: readonly HusBuyerAllocationRef[];
  readonly transportProfile: HusTransportProfileRef;
}
