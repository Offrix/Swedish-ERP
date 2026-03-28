export type TaxAccountEventEffectDirection = "credit" | "debit";
export type TaxAccountEventMappingStatus = "imported" | "mapped" | "posted_to_ledger" | "reconciled" | "corrected";
export type TaxAccountEventReconciliationStatus = "imported" | "unmatched" | "partially_matched" | "matched" | "closed";
export type TaxAccountDifferenceCaseStatus = "open" | "reviewed" | "resolved" | "waived";
export type TaxAccountReconciliationItemStatus = "open" | "assessment_matched" | "partially_offset" | "settled";

export interface TaxAccountImportBatch {
  readonly importBatchId: string;
  readonly companyId: string;
  readonly importSource: string;
  readonly statementDate: string | null;
  readonly importedCount: number;
  readonly duplicateCount: number;
  readonly eventIds: readonly string[];
  readonly importedByActorId: string;
  readonly importedAt: string;
  readonly updatedAt: string;
}

export interface TaxAccountEvent {
  readonly taxAccountEventId: string;
  readonly companyId: string;
  readonly importBatchId: string;
  readonly importSource: string;
  readonly eventDate: string;
  readonly postingDate: string;
  readonly eventTypeCode: string;
  readonly effectDirection: TaxAccountEventEffectDirection;
  readonly amount: number;
  readonly currencyCode: string;
  readonly externalReference: string;
  readonly sourceReference: string;
  readonly sourceObjectType: string | null;
  readonly sourceObjectId: string | null;
  readonly liabilityTypeCode: string | null;
  readonly periodKey: string | null;
  readonly mappingStatus: TaxAccountEventMappingStatus;
  readonly reconciliationStatus: TaxAccountEventReconciliationStatus;
  readonly mappedTargetObjectType: string | null;
  readonly mappedTargetObjectId: string | null;
  readonly mappedLiabilityTypeCode: string | null;
  readonly mappedByRuleCode: string | null;
  readonly classificationCode?: string | null;
  readonly classificationApprovedByActorId?: string | null;
  readonly classificationApprovedAt?: string | null;
  readonly classificationResolutionNote?: string | null;
  readonly ledgerPostingStatus: "pending" | "posted";
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TaxAccountReconciliationItem {
  readonly reconciliationItemId: string;
  readonly companyId: string;
  readonly liabilityTypeCode: string;
  readonly sourceDomainCode: string;
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  readonly sourceReference: string | null;
  readonly periodKey: string | null;
  readonly dueDate: string;
  readonly currencyCode: string;
  readonly expectedAmount: number;
  readonly assessedAmount: number;
  readonly settledAmount: number;
  readonly status: TaxAccountReconciliationItemStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly remainingAssessmentAmount: number;
  readonly remainingSettlementAmount: number;
}

export interface TaxAccountOffset {
  readonly taxAccountOffsetId: string;
  readonly companyId: string;
  readonly taxAccountEventId: string;
  readonly reconciliationItemId: string;
  readonly reconciliationRunId: string | null;
  readonly offsetAmount: number;
  readonly offsetDate: string;
  readonly offsetReasonCode: string;
  readonly status: "approved";
  readonly approvalNote: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface TaxAccountBalance {
  readonly creditBalance: number;
  readonly debitBalance: number;
  readonly netBalance: number;
  readonly openCreditAmount: number;
  readonly openSettlementAmount: number;
  readonly openDifferenceCaseCount: number;
  readonly blockerCodes: readonly string[];
  readonly readyForClose: boolean;
  readonly readyForFiling: boolean;
}

export interface TaxAccountDifferenceCase {
  readonly discrepancyCaseId: string;
  readonly companyId: string;
  readonly status: TaxAccountDifferenceCaseStatus;
  readonly differenceTypeCode: string;
  readonly grossDifferenceAmount: number;
  readonly reviewRequired: boolean;
  readonly taxAccountEventId: string | null;
  readonly reconciliationItemId: string | null;
  readonly explanation: string;
  readonly detectedAt: string;
  readonly updatedAt: string;
  readonly reviewedAt?: string | null;
  readonly reviewedByActorId?: string | null;
  readonly reviewNote?: string | null;
  readonly resolvedAt: string | null;
  readonly resolvedByActorId: string | null;
  readonly resolutionNote: string | null;
  readonly waivedAt?: string | null;
  readonly waivedByActorId?: string | null;
  readonly waiverReasonCode?: string | null;
}

export interface TaxAccountSuggestedOffset {
  readonly taxAccountEventId: string;
  readonly reconciliationItemId: string;
  readonly offsetAmount: number;
  readonly offsetReasonCode: string;
  readonly rulepackId: string;
  readonly rulepackCode: string;
  readonly rulepackVersion: string;
  readonly rulepackChecksum: string;
  readonly priority: number;
}

export interface TaxAccountReconciliationRun {
  readonly reconciliationRunId: string;
  readonly companyId: string;
  readonly summary: TaxAccountBalance;
  readonly eventIdsReviewed: readonly string[];
  readonly suggestedOffsets: readonly TaxAccountSuggestedOffset[];
  readonly discrepancyCaseIds: readonly string[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}
