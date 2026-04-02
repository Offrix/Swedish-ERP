export type HusCaseState =
  | "draft"
  | "claim_ready"
  | "claimed"
  | "accepted"
  | "partially_accepted"
  | "rejected"
  | "paid_out"
  | "recovered"
  | "written_off";

export type HusServiceTypeCode = "rot" | "rut" | "not_eligible";
export type HusHousingFormCode = "smallhouse" | "owner_apartment" | "condominium" | "rental_apartment" | "household_other";
export type HusClaimEligibilityStatus = "blocked" | "not_ready" | "partial_ready" | "ready" | "claimed_out";
export type HusAuthorityReceivableStatus =
  | "submitted"
  | "difference_pending"
  | "cleared_for_payout"
  | "settled"
  | "partially_paid_out"
  | "paid_out"
  | "recovered"
  | "written_off";
export type HusCustomerReceivableStatus = "open" | "written_off";
export type HusPayoutSettlementModelCode = "bank_account" | "tax_account";

export interface HusRulepackRef {
  readonly rulepackId: string;
  readonly rulepackCode: string;
  readonly rulepackVersion: string;
  readonly rulepackChecksum: string;
  readonly ruleYear: number;
  readonly rateWindowCode: string | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly officialSourceRefs: readonly string[];
}

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
  readonly buyerIdentityRef: string;
  readonly buyerIdentityMaskedValue: string | null;
  readonly allocationPercent: number;
  readonly relationCode: string;
  readonly eligibilityFlags: {
    readonly residentAtAddress: boolean;
    readonly ownsResidence: boolean;
  };
  readonly identityValidationStatus?: string;
  readonly identityValidatedAt?: string | null;
  readonly customerShareAmount: number;
  readonly preliminaryReductionAmount: number;
  readonly evidenceRefs?: readonly string[];
}

export interface HusServiceLineRef {
  readonly husServiceLineId: string;
  readonly lineNo: number;
  readonly description: string;
  readonly serviceTypeCode: HusServiceTypeCode;
  readonly workedHours: number | null;
  readonly laborCostAmount: number;
  readonly laborCostInclVatAmount: number;
  readonly laborCostExVatAmount: number;
  readonly vatAmount: number;
  readonly vatRate?: number;
  readonly materialAmount: number;
  readonly travelAmount: number;
  readonly equipmentAmount: number;
  readonly adminAmount: number;
  readonly otherAmount: number;
  readonly totalAmount: number;
  readonly eligibleLaborAmount: number;
  readonly reductionRate?: number;
  readonly preliminaryReductionAmount: number;
  readonly customerShareAmount: number;
  readonly rulepackRef?: HusRulepackRef | null;
}

export interface HusPaymentAllocationRef {
  readonly husCustomerPaymentId: string;
  readonly paidOn: string;
  readonly latestAllowedSubmissionDate: string;
  readonly claimReductionAmount: number;
  readonly rulepackId?: string;
  readonly rulepackCode?: string;
  readonly rulepackVersion?: string;
  readonly rulepackChecksum?: string;
  readonly rulepackRef?: HusRulepackRef | null;
  readonly reductionRate?: number;
  readonly paymentEvidenceRef?: string | null;
}

export interface HusBuyerAllocationRef {
  readonly husCaseBuyerId: string;
  readonly displayName: string;
  readonly personalIdentityNumber: string;
  readonly buyerIdentityRef?: string | null;
  readonly buyerIdentityMaskedValue?: string | null;
  readonly allocationPercent: number;
  readonly requestedAmount: number;
  readonly annualCapAmount: number;
  readonly serviceTypeCapAmount: number;
  readonly annualUsedAmountBeforeClaim: number;
  readonly serviceTypeUsedAmountBeforeClaim: number;
  readonly usedAnnualCapAmount?: number;
  readonly usedServiceTypeCapAmount?: number;
  readonly remainingAnnualCapAmountAfterClaim: number;
  readonly remainingServiceTypeCapAmountAfterClaim: number;
  readonly remainingAnnualCapAmount?: number;
  readonly remainingServiceTypeCapAmount?: number;
  readonly rulepackRef?: HusRulepackRef | null;
  readonly evidenceRefs?: readonly string[];
}

export interface HusTransportProfileRef {
  readonly transportType: "json" | "xml" | "direct_api";
  readonly deliveryChannelCode: "legacy_json" | "signed_xml" | "direct_api";
  readonly serializationFormatCode: "json" | "xml" | "canonical_json";
  readonly supportsOfficialSubmission: boolean;
}

export interface HusReceivableReconciliationEntryRef {
  readonly husReceivableReconciliationEntryId: string;
  readonly eventCode: string;
  readonly eventDate: string;
  readonly amount: number | null;
  readonly journalEntryId: string | null;
  readonly balanceAfterAmount: number | null;
  readonly actorId: string;
  readonly note: string | null;
  readonly createdAt: string;
}

export interface HusAuthorityReceivableRef {
  readonly husAuthorityReceivableId: string;
  readonly companyId: string;
  readonly husCaseId: string;
  readonly husClaimId: string;
  readonly submittedOn: string;
  readonly originalAmount: number;
  readonly outstandingAmount: number;
  readonly approvedAmount: number;
  readonly rejectedAmount: number;
  readonly payoutSettledAmount: number;
  readonly recoveredAmount: number;
  readonly submissionJournalEntryId: string | null;
  readonly decisionJournalEntryId: string | null;
  readonly status: HusAuthorityReceivableStatus;
  readonly reconciliationEntries: readonly HusReceivableReconciliationEntryRef[];
}

export interface HusCustomerReceivableRef {
  readonly husCustomerReceivableId: string;
  readonly companyId: string;
  readonly husCaseId: string;
  readonly husClaimId: string;
  readonly husDecisionDifferenceId: string;
  readonly status: HusCustomerReceivableStatus;
  readonly amount: number;
  readonly outstandingAmount: number;
  readonly journalEntryId: string | null;
  readonly resolutionCode: string;
  readonly reconciliationEntries: readonly HusReceivableReconciliationEntryRef[];
}

export interface HusClaimRef {
  readonly husClaimId: string;
  readonly companyId: string;
  readonly husCaseId: string;
  readonly versionNo: number;
  readonly requestedAmount: number;
  readonly claimReadyAt?: string | null;
  readonly claimReadyState?: string | null;
  readonly claimRuleYear?: number;
  readonly transportType: "json" | "xml" | "direct_api";
  readonly status: string;
  readonly submittedOn: string | null;
  readonly payloadHash: string | null;
  readonly claimReadinessStatus: HusClaimEligibilityStatus;
  readonly paymentAllocations: readonly HusPaymentAllocationRef[];
  readonly buyerAllocations: readonly HusBuyerAllocationRef[];
  readonly rulepackRef?: HusRulepackRef | null;
  readonly claimReadyEvidenceRefs?: readonly string[];
  readonly authorityReceivableId?: string | null;
  readonly submissionJournalEntryId?: string | null;
  readonly submissionAttemptRef?: string | null;
  readonly decisionRef?: string | null;
  readonly transportProfile: HusTransportProfileRef;
}
