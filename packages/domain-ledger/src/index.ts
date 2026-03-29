export type LedgerState = "draft" | "validated" | "posted" | "reversed" | "locked_by_period";
export type VoucherSeriesCode = string;
export type VoucherSeriesPurposeCode = string;
export type VoucherSeriesStatus = "active" | "paused" | "archived";

export type PostingSourceType =
  | "AR_INVOICE"
  | "AR_CREDIT_NOTE"
  | "AR_PAYMENT"
  | "AP_INVOICE"
  | "AP_CREDIT_NOTE"
  | "AP_PAYMENT"
  | "PAYROLL_RUN"
  | "PAYROLL_CORRECTION"
  | "BENEFIT_EVENT"
  | "TRAVEL_CLAIM"
  | "VAT_SETTLEMENT"
  | "BANK_IMPORT"
  | "MANUAL_JOURNAL"
  | "ASSET_DEPRECIATION"
  | "PERIOD_ACCRUAL"
  | "YEAR_END_TRANSFER"
  | "ROT_RUT_CLAIM"
  | "PENSION_REPORT"
  | "PROJECT_WIP";

export interface PostingIntent {
  readonly sourceType: PostingSourceType;
  readonly sourceId: string;
  readonly companyId: string;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
}

export interface LedgerAccount {
  readonly accountId: string;
  readonly companyId: string;
  readonly accountNumber: string;
  readonly accountName: string;
  readonly accountClass: string;
  readonly status: string;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccountCatalogAccount {
  readonly accountNumber: string;
  readonly accountName: string;
  readonly accountClass: string;
}

export interface AccountCatalogVersion {
  readonly versionId: string;
  readonly templateKind: string;
  readonly sourceName: string;
  readonly sourceDocumentName: string;
  readonly effectiveFrom: string;
  readonly publishedAt: string;
  readonly checksumAlgorithm: string;
  readonly checksum: string;
  readonly accountCount: number;
  readonly accounts: readonly AccountCatalogAccount[];
}

export interface VoucherSeries {
  readonly voucherSeriesId: string;
  readonly companyId: string;
  readonly seriesCode: VoucherSeriesCode;
  readonly description: string;
  readonly nextNumber: number;
  readonly status: VoucherSeriesStatus;
  readonly purposeCodes: readonly VoucherSeriesPurposeCode[];
  readonly importedSequencePreservationEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccountingPeriod {
  readonly accountingPeriodId: string;
  readonly companyId: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly fiscalYearId?: string | null;
  readonly fiscalPeriodId?: string | null;
  readonly status: "open" | "soft_locked" | "hard_closed";
  readonly lockReasonCode?: string | null;
  readonly lockedByActorId?: string | null;
  readonly lockedAt?: string | null;
  readonly reopenedByActorId?: string | null;
  readonly reopenedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LedgerDimensionCatalog {
  readonly companyId: string;
  readonly projects: readonly LedgerDimensionValue[];
  readonly costCenters: readonly LedgerDimensionValue[];
  readonly businessAreas: readonly LedgerDimensionValue[];
}

export interface LedgerDimensionValue {
  readonly code: string;
  readonly label: string;
  readonly status: "active" | "inactive";
}

export interface JournalLineInput {
  readonly accountNumber: string;
  readonly debitAmount?: number | string;
  readonly creditAmount?: number | string;
  readonly currencyCode?: string;
  readonly exchangeRate?: number | string | null;
  readonly dimensionJson?: Record<string, unknown>;
  readonly sourceType?: PostingSourceType;
  readonly sourceId?: string | null;
}

export interface JournalLine {
  readonly journalLineId: string;
  readonly journalEntryId: string;
  readonly companyId: string;
  readonly lineNumber: number;
  readonly accountId: string;
  readonly accountNumber: string;
  readonly accountName: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly currencyCode: string;
  readonly exchangeRate: number | null;
  readonly dimensionJson: Record<string, unknown>;
  readonly sourceType: PostingSourceType;
  readonly sourceId: string;
  readonly actorId: string;
  readonly createdAt: string;
}

export interface CorrectionResult {
  readonly originalJournalEntry: JournalEntry;
  readonly reversalJournalEntry: JournalEntry | null;
  readonly correctedJournalEntry: JournalEntry;
}

export type JournalCorrectionType = "delta" | "full_reversal" | "reversal_and_rebook";

export interface JournalEntry {
  readonly journalEntryId: string;
  readonly companyId: string;
  readonly voucherSeriesId: string;
  readonly voucherSeriesCode: VoucherSeriesCode;
  readonly accountingPeriodId: string;
  readonly fiscalYearId: string | null;
  readonly fiscalPeriodId: string | null;
  readonly accountingMethodProfileId: string | null;
  readonly journalDate: string;
  readonly voucherNumber: number;
  readonly description: string | null;
  readonly sourceType: PostingSourceType;
  readonly sourceId: string;
  readonly actorId: string;
  readonly status: LedgerState;
  readonly importedFlag: boolean;
  readonly currencyCode: string;
  readonly idempotencyKey: string;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly validatedAt: string | null;
  readonly postedAt: string | null;
  readonly reversalOfJournalEntryId: string | null;
  readonly reversedByJournalEntryId: string | null;
  readonly correctionOfJournalEntryId: string | null;
  readonly correctionKey: string | null;
  readonly correctionType: JournalCorrectionType | null;
  readonly totalDebit: number;
  readonly totalCredit: number;
  readonly lines: readonly JournalLine[];
}
