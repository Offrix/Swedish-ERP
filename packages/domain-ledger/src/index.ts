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
  | "VAT_CLEARING"
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

export interface VatClearingCapturedBalance {
  readonly accountNumber: string;
  readonly accountName: string;
  readonly accountClass: string;
  readonly balanceAmount: number;
}

export interface VatClearingBatchLine {
  readonly accountNumber: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly dimensionJson: Record<string, unknown>;
  readonly sourceType: "VAT_CLEARING";
  readonly sourceId: string;
}

export interface VatClearingRun {
  readonly vatClearingRunId: string;
  readonly companyId: string;
  readonly accountingPeriodId: string;
  readonly vatDeclarationRunId: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly clearingDate: string;
  readonly status: "posted" | "reversed";
  readonly sourceCode: string;
  readonly externalReference: string | null;
  readonly accountingCurrencyCode: string;
  readonly targetAccountNumber: string;
  readonly lineCount: number;
  readonly totals: {
    readonly totalDebit: number;
    readonly totalCredit: number;
  };
  readonly journalEntryId: string;
  readonly reversalJournalEntryId: string | null;
  readonly evidenceRefs: readonly string[];
  readonly declarationBoxSummary: readonly Record<string, unknown>[];
  readonly decisionSnapshotRefs: readonly Record<string, unknown>[];
  readonly providerBaselineRefs: readonly Record<string, unknown>[];
  readonly rulepackRefs: readonly Record<string, unknown>[];
  readonly capturedBalances: readonly VatClearingCapturedBalance[];
  readonly sourceNetBalanceAmount: number;
  readonly lines: readonly VatClearingBatchLine[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly reversedAt: string | null;
  readonly reversedByActorId: string | null;
}

export interface AssetCard {
  readonly assetCardId: string;
  readonly companyId: string;
  readonly assetCode: string;
  readonly assetName: string;
  readonly acquisitionDate: string;
  readonly inServiceDate: string;
  readonly costAmount: number;
  readonly residualValueAmount: number;
  readonly depreciableBaseAmount: number;
  readonly bookedDepreciationAmount: number;
  readonly remainingDepreciableAmount: number;
  readonly usefulLifeMonths: number;
  readonly bookedInstallmentCount: number;
  readonly depreciationMethodCode: "STRAIGHT_LINE_MONTHLY";
  readonly monthlyDepreciationAmount: number;
  readonly assetAccountNumber: string;
  readonly accumulatedDepreciationAccountNumber: string;
  readonly depreciationExpenseAccountNumber: string;
  readonly nextDepreciationDate: string | null;
  readonly lastDepreciationBatchId: string | null;
  readonly status: "active" | "fully_depreciated" | "disposed";
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly disposedAt: string | null;
  readonly disposedByActorId: string | null;
}

export interface DepreciationBatchItem {
  readonly assetCardId: string;
  readonly assetCode: string;
  readonly firstScheduledDate: string;
  readonly lastScheduledDate: string;
  readonly installmentCount: number;
  readonly depreciationAmount: number;
  readonly priorBookedDepreciationAmount: number;
  readonly priorBookedInstallmentCount: number;
  readonly priorNextDepreciationDate: string | null;
  readonly priorStatus: "active" | "fully_depreciated" | "disposed";
  readonly priorLastDepreciationBatchId: string | null;
}

export interface DepreciationBatch {
  readonly depreciationBatchId: string;
  readonly companyId: string;
  readonly accountingPeriodId: string;
  readonly throughDate: string;
  readonly status: "posted" | "reversed";
  readonly accountingCurrencyCode: string;
  readonly lineCount: number;
  readonly assetCount: number;
  readonly totals: {
    readonly totalDebit: number;
    readonly totalCredit: number;
  };
  readonly journalEntryId: string;
  readonly reversalJournalEntryId: string | null;
  readonly items: readonly DepreciationBatchItem[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly reversedAt: string | null;
  readonly reversedByActorId: string | null;
}

export interface AccrualSchedule {
  readonly accrualScheduleId: string;
  readonly companyId: string;
  readonly scheduleCode: string;
  readonly scheduleName: string;
  readonly sourceReference: string | null;
  readonly scheduleKind: "PREPAID_EXPENSE" | "ACCRUED_EXPENSE" | "PREPAID_REVENUE" | "ACCRUED_REVENUE";
  readonly patternCode: "STRAIGHT_LINE_MONTHLY";
  readonly startDate: string;
  readonly endDate: string;
  readonly totalAmount: number;
  readonly recognizedAmount: number;
  readonly remainingAmount: number;
  readonly totalPeriods: number;
  readonly recognizedInstallmentCount: number;
  readonly monthlyRecognitionAmount: number;
  readonly profitAndLossAccountNumber: string;
  readonly balanceSheetAccountNumber: string;
  readonly nextRecognitionDate: string | null;
  readonly lastAccrualBatchId: string | null;
  readonly status: "active" | "completed" | "reversed";
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccrualBatchItem {
  readonly accrualScheduleId: string;
  readonly scheduleCode: string;
  readonly scheduleKind: "PREPAID_EXPENSE" | "ACCRUED_EXPENSE" | "PREPAID_REVENUE" | "ACCRUED_REVENUE";
  readonly firstScheduledDate: string;
  readonly lastScheduledDate: string;
  readonly installmentCount: number;
  readonly recognitionAmount: number;
  readonly priorRecognizedAmount: number;
  readonly priorRecognizedInstallmentCount: number;
  readonly priorNextRecognitionDate: string | null;
  readonly priorStatus: "active" | "completed" | "reversed";
  readonly priorLastAccrualBatchId: string | null;
}

export interface AccrualBatch {
  readonly accrualBatchId: string;
  readonly companyId: string;
  readonly accountingPeriodId: string;
  readonly throughDate: string;
  readonly status: "posted" | "reversed";
  readonly accountingCurrencyCode: string;
  readonly lineCount: number;
  readonly scheduleCount: number;
  readonly totals: {
    readonly totalDebit: number;
    readonly totalCredit: number;
  };
  readonly journalEntryId: string;
  readonly reversalJournalEntryId: string | null;
  readonly items: readonly AccrualBatchItem[];
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

export declare function createVatClearingRun(options: {
  companyId: string;
  vatDeclarationRunId: string;
  clearingDate?: string | null;
  sourceCode: string;
  targetAccountNumber?: string;
  externalReference?: string | null;
  description?: string | null;
  evidenceRefs?: readonly string[];
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): VatClearingRun;

export declare function listVatClearingRuns(options: {
  companyId: string;
}): readonly VatClearingRun[];

export declare function getVatClearingRun(options: {
  companyId: string;
  vatClearingRunId: string;
}): VatClearingRun;

export declare function reverseVatClearingRun(options: {
  companyId: string;
  vatClearingRunId: string;
  reasonCode: string;
  reversedOn?: string | null;
  actorId: string;
  approvedByActorId: string;
  approvedByRoleCode: string;
  correlationId?: string;
}): VatClearingRun;

export declare function registerAssetCard(options: {
  companyId: string;
  assetCode: string;
  assetName: string;
  acquisitionDate: string;
  inServiceDate?: string | null;
  costAmount: number | string;
  residualValueAmount?: number | string;
  usefulLifeMonths: number;
  assetAccountNumber: string;
  accumulatedDepreciationAccountNumber: string;
  depreciationExpenseAccountNumber: string;
  depreciationMethodCode?: "STRAIGHT_LINE_MONTHLY";
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): AssetCard;

export declare function listAssetCards(options: {
  companyId: string;
}): readonly AssetCard[];

export declare function getAssetCard(options: {
  companyId: string;
  assetCardId: string;
}): AssetCard;

export declare function runDepreciationBatch(options: {
  companyId: string;
  throughDate: string;
  description?: string | null;
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): DepreciationBatch;

export declare function listDepreciationBatches(options: {
  companyId: string;
}): readonly DepreciationBatch[];

export declare function getDepreciationBatch(options: {
  companyId: string;
  depreciationBatchId: string;
}): DepreciationBatch;

export declare function reverseDepreciationBatch(options: {
  companyId: string;
  depreciationBatchId: string;
  reasonCode: string;
  reversedOn?: string | null;
  actorId: string;
  approvedByActorId: string;
  approvedByRoleCode: string;
  correlationId?: string;
}): DepreciationBatch;

export declare function registerAccrualSchedule(options: {
  companyId: string;
  scheduleCode: string;
  scheduleName: string;
  sourceReference?: string | null;
  scheduleKind: "PREPAID_EXPENSE" | "ACCRUED_EXPENSE" | "PREPAID_REVENUE" | "ACCRUED_REVENUE";
  startDate: string;
  endDate: string;
  totalAmount: number | string;
  patternCode?: "STRAIGHT_LINE_MONTHLY";
  profitAndLossAccountNumber: string;
  balanceSheetAccountNumber: string;
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): AccrualSchedule;

export declare function listAccrualSchedules(options: {
  companyId: string;
}): readonly AccrualSchedule[];

export declare function getAccrualSchedule(options: {
  companyId: string;
  accrualScheduleId: string;
}): AccrualSchedule;

export declare function runAccrualBatch(options: {
  companyId: string;
  throughDate: string;
  description?: string | null;
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): AccrualBatch;

export declare function listAccrualBatches(options: {
  companyId: string;
}): readonly AccrualBatch[];

export declare function getAccrualBatch(options: {
  companyId: string;
  accrualBatchId: string;
}): AccrualBatch;

export declare function reverseAccrualBatch(options: {
  companyId: string;
  accrualBatchId: string;
  reasonCode: string;
  reversedOn?: string | null;
  actorId: string;
  approvedByActorId: string;
  approvedByRoleCode: string;
  correlationId?: string;
}): AccrualBatch;

export declare function createJournalEntry(options: {
  companyId: string;
  journalDate: string;
  voucherSeriesCode: string;
  sourceType: PostingSourceType;
  sourceId: string;
  description?: string | null;
  actorId: string;
  idempotencyKey: string;
  lines: readonly JournalLineInput[];
  importedFlag?: boolean;
  currencyCode?: string;
  metadataJson?: Record<string, unknown>;
  correctionOfJournalEntryId?: string | null;
  correctionKey?: string | null;
  correctionType?: JournalCorrectionType | null;
  correlationId?: string;
}): { journalEntry: JournalEntry; idempotentReplay?: boolean };

export declare function validateJournalEntry(options: {
  companyId: string;
  journalEntryId: string;
  actorId: string;
  correlationId?: string;
}): { journalEntry: JournalEntry };

export declare function postJournalEntry(options: {
  companyId: string;
  journalEntryId: string;
  actorId: string;
  approvedByActorId?: string | null;
  approvedByRoleCode?: string | null;
  importedVoucherNumber?: number | string | null;
  correlationId?: string;
}): { journalEntry: JournalEntry };

export declare function reverseJournalEntry(options: {
  companyId: string;
  journalEntryId: string;
  actorId: string;
  reasonCode: string;
  correctionKey: string;
  approvedByActorId?: string | null;
  approvedByRoleCode?: string | null;
  journalDate?: string | null;
  voucherSeriesCode?: string | null;
  metadataJson?: Record<string, unknown>;
  correlationId?: string;
}): {
  originalJournalEntry: JournalEntry;
  reversalJournalEntry: JournalEntry;
  idempotentReplay?: boolean;
};

export declare function correctJournalEntry(options: {
  companyId: string;
  journalEntryId: string;
  actorId: string;
  reasonCode: string;
  correctionKey: string;
  approvedByActorId?: string | null;
  approvedByRoleCode?: string | null;
  lines: readonly JournalLineInput[];
  journalDate?: string | null;
  voucherSeriesCode?: string | null;
  reverseOriginal?: boolean;
  metadataJson?: Record<string, unknown>;
  correlationId?: string;
}): CorrectionResult & { idempotentReplay?: boolean };

export declare function getJournalEntry(options: {
  companyId: string;
  journalEntryId: string;
}): JournalEntry;

export declare function listJournalEntries(options: {
  companyId: string;
  fiscalYearId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  statuses?: readonly LedgerState[] | LedgerState | null;
}): readonly JournalEntry[];
