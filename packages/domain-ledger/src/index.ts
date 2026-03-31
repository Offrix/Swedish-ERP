export type LedgerState = "draft" | "approved_for_post" | "posted" | "reversed" | "locked_by_period";
export type VoucherSeriesCode = string;
export type VoucherSeriesPurposeCode = string;
export type VoucherSeriesStatus = "active" | "paused" | "archived";
export type AccountingCurrencyCode = "SEK" | "EUR";
export type YearEndTransferKind = "RESULT_TRANSFER" | "RETAINED_EARNINGS_TRANSFER";

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
  | "HISTORICAL_IMPORT"
  | "MANUAL_JOURNAL"
  | "ASSET_DEPRECIATION"
  | "PERIOD_ACCRUAL"
  | "YEAR_END_TRANSFER"
  | "ROT_RUT_CLAIM"
  | "PENSION_REPORT"
  | "PROJECT_WIP";

export interface PostingIntent {
  readonly intentId: string;
  readonly recipeCode: string;
  readonly recipeVersion: string;
  readonly voucherSeriesCode: VoucherSeriesCode;
  readonly sourceType: PostingSourceType;
  readonly sourceId: string;
  readonly companyId: string;
  readonly sourceObjectVersion: string;
  readonly postingSignalCode: string;
  readonly actorId: string;
  readonly description: string;
  readonly journalDate: string;
  readonly metadataJson: Record<string, unknown>;
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

export type RequiredEngineAccounts = Readonly<Record<string, readonly string[]>>;

export declare const REQUIRED_ENGINE_ACCOUNTS: RequiredEngineAccounts;
export declare const ALLOWED_ACCOUNTING_CURRENCY_CODES: readonly AccountingCurrencyCode[];

export declare function validateRequiredEngineAccounts(
  catalogVersion: AccountCatalogVersion,
  requiredEngineAccounts?: RequiredEngineAccounts
): AccountCatalogVersion;

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

export interface AccountingCurrencyProfile {
  readonly accountingCurrencyProfileId: string;
  readonly companyId: string;
  readonly accountingCurrencyCode: AccountingCurrencyCode;
  readonly reportingCurrencyCode: AccountingCurrencyCode;
  readonly profileVersion: number;
  readonly sourceCode: string;
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
  readonly functionalDebitAmount?: number | string | null;
  readonly functionalCreditAmount?: number | string | null;
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
  readonly originalCurrencyCode?: string | null;
  readonly originalDebitAmount?: number | null;
  readonly originalCreditAmount?: number | null;
  readonly dimensionJson: Record<string, unknown>;
  readonly sourceType: PostingSourceType;
  readonly sourceId: string;
  readonly actorId: string;
  readonly createdAt: string;
}

export interface OpeningBalanceBatchLine {
  readonly accountNumber: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly dimensionJson: Record<string, unknown>;
  readonly sourceType: "HISTORICAL_IMPORT";
  readonly sourceId: string;
}

export interface OpeningBalanceBatch {
  readonly openingBalanceBatchId: string;
  readonly companyId: string;
  readonly fiscalYearId: string;
  readonly fiscalYearStartDate: string;
  readonly accountingPeriodId: string;
  readonly openingDate: string;
  readonly status: "posted" | "reversed";
  readonly sourceCode: string;
  readonly externalReference: string | null;
  readonly accountingCurrencyCode: string;
  readonly lineCount: number;
  readonly totals: {
    readonly totalDebit: number;
    readonly totalCredit: number;
  };
  readonly journalEntryId: string;
  readonly reversalJournalEntryId: string | null;
  readonly evidenceRefs: readonly string[];
  readonly lines: readonly OpeningBalanceBatchLine[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly reversedAt: string | null;
  readonly reversedByActorId: string | null;
}

export interface YearEndTransferBatchLine {
  readonly accountNumber: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly dimensionJson: Record<string, unknown>;
  readonly sourceType: "YEAR_END_TRANSFER";
  readonly sourceId: string;
}

export interface YearEndTransferCapturedBalance {
  readonly accountNumber: string;
  readonly accountName: string;
  readonly accountClass: string;
  readonly balanceAmount: number;
}

export interface YearEndTransferBatch {
  readonly yearEndTransferBatchId: string;
  readonly companyId: string;
  readonly fiscalYearId: string;
  readonly fiscalYearStartDate: string;
  readonly fiscalYearEndDate: string;
  readonly accountingPeriodId: string;
  readonly transferKind: YearEndTransferKind;
  readonly transferDate: string;
  readonly status: "posted" | "reversed";
  readonly sourceCode: string;
  readonly externalReference: string | null;
  readonly accountingCurrencyCode: string;
  readonly resultAccountNumber: string | null;
  readonly retainedEarningsAccountNumber: string | null;
  readonly lineCount: number;
  readonly totals: {
    readonly totalDebit: number;
    readonly totalCredit: number;
  };
  readonly journalEntryId: string;
  readonly reversalJournalEntryId: string | null;
  readonly evidenceRefs: readonly string[];
  readonly capturedBalances: readonly YearEndTransferCapturedBalance[];
  readonly sourceBalanceAmount: number | null;
  readonly resultTransferBatchId: string | null;
  readonly lines: readonly YearEndTransferBatchLine[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly reversedAt: string | null;
  readonly reversedByActorId: string | null;
}

export interface CorrectionResult {
  readonly originalJournalEntry: JournalEntry;
  readonly reversalJournalEntry: JournalEntry | null;
  readonly correctedJournalEntry: JournalEntry;
}

export declare function getAccountingCurrencyProfile(options: { companyId: string }): AccountingCurrencyProfile;

export declare function upsertAccountingCurrencyProfile(options: {
  companyId: string;
  accountingCurrencyCode: AccountingCurrencyCode;
  actorId: string;
  sourceCode?: string;
  correlationId?: string;
}): AccountingCurrencyProfile;

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
  readonly voucherNumber: number | null;
  readonly description: string | null;
  readonly sourceType: PostingSourceType;
  readonly sourceId: string;
  readonly actorId: string;
  readonly status: LedgerState;
  readonly importedFlag: boolean;
  readonly currencyCode: string;
  readonly accountingCurrencyCode: string;
  readonly accountingCurrencyProfileId?: string | null;
  readonly accountingCurrencyProfileVersion?: number | null;
  readonly originalCurrencyCode?: string | null;
  readonly idempotencyKey: string;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly validatedAt: string | null;
  readonly approvedForPostAt?: string | null;
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

export declare function createOpeningBalanceBatch(options: {
  companyId: string;
  fiscalYearId: string;
  openingDate: string;
  sourceCode: string;
  externalReference?: string | null;
  description?: string | null;
  evidenceRefs?: readonly string[];
  lines: readonly JournalLineInput[];
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): OpeningBalanceBatch;

export declare function listOpeningBalanceBatches(options: { companyId: string }): readonly OpeningBalanceBatch[];

export declare function getOpeningBalanceBatch(options: {
  companyId: string;
  openingBalanceBatchId: string;
}): OpeningBalanceBatch;

export declare function reverseOpeningBalanceBatch(options: {
  companyId: string;
  openingBalanceBatchId: string;
  reasonCode: string;
  reversedOn?: string | null;
  actorId: string;
  approvedByActorId: string;
  approvedByRoleCode: string;
  correlationId?: string;
}): OpeningBalanceBatch;

export declare function createYearEndTransferBatch(options: {
  companyId: string;
  fiscalYearId: string;
  transferKind: YearEndTransferKind;
  transferDate?: string | null;
  sourceCode: string;
  externalReference?: string | null;
  description?: string | null;
  evidenceRefs?: readonly string[];
  resultAccountNumber?: string;
  retainedEarningsAccountNumber?: string;
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): YearEndTransferBatch;

export declare function listYearEndTransferBatches(options: {
  companyId: string;
}): readonly YearEndTransferBatch[];

export declare function getYearEndTransferBatch(options: {
  companyId: string;
  yearEndTransferBatchId: string;
}): YearEndTransferBatch;

export declare function reverseYearEndTransferBatch(options: {
  companyId: string;
  yearEndTransferBatchId: string;
  reasonCode: string;
  reversedOn?: string | null;
  actorId: string;
  approvedByActorId: string;
  approvedByRoleCode: string;
  correlationId?: string;
}): YearEndTransferBatch;
