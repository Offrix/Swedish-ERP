export type OwnerDistributionDecisionStatus =
  | "draft"
  | "board_proposed"
  | "review_pending"
  | "stamma_ready"
  | "stamma_resolved"
  | "payable"
  | "scheduled"
  | "paid"
  | "partially_paid"
  | "reversed";

export type OwnerDistributionTaxProfileCode =
  | "swedish_private_person"
  | "swedish_company"
  | "foreign_recipient";

export type FreeEquityProofSourceType =
  | "annual_report_package"
  | "interim_balance";

export type DividendPaymentInstructionStatus =
  | "scheduled"
  | "partially_paid"
  | "paid"
  | "reversed";

export type Ku31DraftStatus = "draft" | "ready" | "superseded";
export type KupongskattRecordStatus = "scheduled" | "partially_paid" | "paid" | "reversed";

export interface ShareClass {
  readonly shareClassId: string;
  readonly companyId: string;
  readonly name: string;
  readonly votesPerShare: number;
  readonly dividendPriorityCode: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface HolderRef {
  readonly holderId: string;
  readonly displayName: string;
  readonly taxProfileCode: OwnerDistributionTaxProfileCode;
  readonly identityReference: string;
  readonly identityMaskedValue: string;
  readonly countryCode: string;
}

export interface ShareholderHoldingSnapshot {
  readonly snapshotId: string;
  readonly companyId: string;
  readonly effectiveDate: string;
  readonly evidenceRef: string;
  readonly holders: readonly {
    readonly holderRef: HolderRef;
    readonly shareClassHoldings: readonly {
      readonly shareClassId: string;
      readonly shareClassName: string;
      readonly dividendPriorityCode: string;
      readonly shareCount: number;
    }[];
    readonly totalShareCount: number;
  }[];
  readonly totalShareCount: number;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FreeEquitySnapshot {
  readonly freeEquitySnapshotId: string;
  readonly companyId: string;
  readonly effectiveDate: string;
  readonly freeEquityAmount: number;
  readonly proofRef: {
    readonly proofSourceType: FreeEquityProofSourceType;
    readonly annualReportPackageId: string | null;
    readonly annualReportVersionId: string | null;
    readonly annualReportVersionLockedAt: string | null;
    readonly annualReportVersionSignoffHash: string | null;
    readonly evidenceRef: string | null;
    readonly approvedByActorId: string | null;
    readonly approvedByRoleCode: string | null;
    readonly approvedAt: string | null;
  };
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DividendPaymentInstruction {
  readonly instructionId: string;
  readonly companyId: string;
  readonly decisionId: string;
  readonly recipientRef: HolderRef;
  readonly grossAmount: number;
  readonly withholdingProfile: {
    readonly profileCode: string;
    readonly withholdingRate: number;
    readonly withholdingAmount: number;
    readonly treatyEvidenceRef: string | null;
    readonly treatyApprovedByActorId: string | null;
    readonly treatyApprovedByRoleCode: string | null;
    readonly paymentDate: string;
  };
  readonly withheldAmount: number;
  readonly netAmount: number;
  readonly paymentDate: string;
  readonly status: DividendPaymentInstructionStatus;
  readonly paidGrossAmount: number;
  readonly paidNetAmount: number;
  readonly paidWithholdingAmount: number;
  readonly journalEntryIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Ku31Draft {
  readonly draftId: string;
  readonly companyId: string;
  readonly decisionId: string;
  readonly recipientRef: HolderRef;
  readonly paymentInstructionId: string;
  readonly paymentDate: string;
  readonly fieldMap: Readonly<Record<string, unknown>>;
  readonly filingYear: number;
  readonly controlStatementDueDate: string;
  readonly statutoryDisclosureDueDate: string;
  readonly status: Ku31DraftStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface KupongskattRecord {
  readonly kupongskattRecordId: string;
  readonly recordId: string;
  readonly companyId: string;
  readonly decisionId: string;
  readonly instructionId: string;
  readonly recipientRef: HolderRef;
  readonly withholdingRate: number;
  readonly treatyEvidenceRef: string | null;
  readonly paymentDate: string;
  readonly amount: number;
  readonly paidAmount: number;
  readonly status: KupongskattRecordStatus;
  readonly authorityPaymentDueDate: string;
  readonly treatyApprovedByActorId: string | null;
  readonly treatyApprovedByRoleCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DividendDecision {
  readonly decisionId: string;
  readonly companyId: string;
  readonly decisionDate: string;
  readonly legalFormCode: string;
  readonly status: OwnerDistributionDecisionStatus;
  readonly holdingSnapshotId: string;
  readonly freeEquitySnapshotId: string;
  readonly boardProposal: Readonly<Record<string, unknown>>;
  readonly stammaResolution: Readonly<Record<string, unknown>> | null;
  readonly journalPlan: Readonly<Record<string, unknown>>;
  readonly shareAllocationPlan: Readonly<Record<string, unknown>>;
  readonly totalAmount: number;
  readonly recipientAllocations: readonly Readonly<Record<string, unknown>>[];
  readonly paymentInstructionIds: readonly string[];
  readonly ku31DraftIds: readonly string[];
  readonly kupongskattRecordIds: readonly string[];
  readonly payoutRuns: readonly Readonly<Record<string, unknown>>[];
  readonly stateHistory: readonly Readonly<Record<string, unknown>>[];
  readonly paidGrossAmount: number;
  readonly paidNetAmount: number;
  readonly paidWithholdingAmount: number;
  readonly reversalJournalEntryIds: readonly string[];
  readonly rulepackRefs: readonly Readonly<Record<string, unknown>>[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly paymentInstructions: readonly DividendPaymentInstruction[];
  readonly ku31Drafts: readonly Ku31Draft[];
  readonly kupongskattRecords: readonly KupongskattRecord[];
}

export declare const OWNER_DISTRIBUTION_DECISION_STATUSES: readonly OwnerDistributionDecisionStatus[];
export declare const OWNER_DISTRIBUTION_TAX_PROFILE_CODES: readonly OwnerDistributionTaxProfileCode[];
export declare const FREE_EQUITY_PROOF_SOURCE_TYPES: readonly FreeEquityProofSourceType[];
export declare const DIVIDEND_PAYMENT_INSTRUCTION_STATUSES: readonly DividendPaymentInstructionStatus[];
export declare const KU31_DRAFT_STATUSES: readonly Ku31DraftStatus[];
export declare const KUPONGSKATT_RECORD_STATUSES: readonly KupongskattRecordStatus[];
export declare const OWNER_DISTRIBUTION_RULEPACK_CODE: string;
export declare const OWNER_DISTRIBUTION_RULEPACK_VERSION: string;
export declare const OWNER_DISTRIBUTION_MAIN_KUPONGSKATT_RATE: number;

export interface OwnerDistributionsEngine {
  readonly ownerDistributionDecisionStatuses: readonly OwnerDistributionDecisionStatus[];
  readonly ownerDistributionTaxProfileCodes: readonly OwnerDistributionTaxProfileCode[];
  readonly freeEquityProofSourceTypes: readonly FreeEquityProofSourceType[];
  readonly dividendPaymentInstructionStatuses: readonly DividendPaymentInstructionStatus[];
  readonly ku31DraftStatuses: readonly Ku31DraftStatus[];
  readonly kupongskattRecordStatuses: readonly KupongskattRecordStatus[];
  createShareClass(input: Record<string, unknown>): ShareClass;
  listShareClasses(input: { companyId: string }): readonly ShareClass[];
  getShareClass(input: { companyId: string; shareClassId: string }): ShareClass;
  createShareholderHoldingSnapshot(input: Record<string, unknown>): ShareholderHoldingSnapshot;
  listShareholderHoldingSnapshots(input: { companyId: string }): readonly ShareholderHoldingSnapshot[];
  getShareholderHoldingSnapshot(input: { companyId: string; snapshotId: string }): ShareholderHoldingSnapshot;
  createFreeEquitySnapshot(input: Record<string, unknown>): FreeEquitySnapshot;
  listFreeEquitySnapshots(input: { companyId: string }): readonly FreeEquitySnapshot[];
  getFreeEquitySnapshot(input: { companyId: string; freeEquitySnapshotId: string }): FreeEquitySnapshot;
  proposeDividendDecision(input: Record<string, unknown>): DividendDecision;
  submitDividendDecisionForReview(input: Record<string, unknown>): DividendDecision;
  markDividendDecisionStammaReady(input: Record<string, unknown>): DividendDecision;
  resolveDividendAtStamma(input: Record<string, unknown>): DividendDecision;
  scheduleDividendPayout(input: Record<string, unknown>): DividendDecision;
  listDividendDecisions(input: { companyId: string }): readonly DividendDecision[];
  getDividendDecision(input: { companyId: string; decisionId: string }): DividendDecision;
  listDividendPaymentInstructions(input: { companyId: string; decisionId?: string | null }): readonly DividendPaymentInstruction[];
  recordDividendPayout(input: Record<string, unknown>): DividendDecision;
  reverseDividendPayout(input: Record<string, unknown>): DividendDecision;
  buildKu31Draft(input: Record<string, unknown>): {
    readonly decisionId: string;
    readonly items: readonly Ku31Draft[];
    readonly skippedRecipients: readonly Readonly<Record<string, unknown>>[];
  };
  listKu31Drafts(input: { companyId: string; decisionId?: string | null }): readonly Ku31Draft[];
  getKu31Draft(input: { companyId: string; draftId: string }): Ku31Draft;
  listKupongskattRecords(input: { companyId: string; decisionId?: string | null }): readonly KupongskattRecord[];
  getKupongskattRecord(input: { companyId: string; kupongskattRecordId: string }): KupongskattRecord;
  listOwnerDistributionAuditEvents(input: { companyId: string; resourceId?: string | null }): readonly Readonly<Record<string, unknown>>[];
  snapshotOwnerDistributions(): Readonly<Record<string, unknown>>;
  exportDurableState(): Readonly<Record<string, unknown>>;
  importDurableState(snapshot: Readonly<Record<string, unknown>>): void;
}

export declare function createOwnerDistributionsPlatform(options?: Record<string, unknown>): OwnerDistributionsEngine;
export declare function createOwnerDistributionsEngine(options?: Record<string, unknown>): OwnerDistributionsEngine;
