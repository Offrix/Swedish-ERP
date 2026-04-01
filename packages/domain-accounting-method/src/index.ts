export type AccountingMethodCode = "KONTANTMETOD" | "FAKTURERINGSMETOD";
export type AccountingMethodProfileStatus = "planned" | "active" | "historical";
export type AccountingMethodTimingMode = "payment_date_with_year_end_catch_up" | "invoice_date_accrual";
export type AccountingMethodExecutionEventCode =
  | "AR_INVOICE_ISSUE"
  | "AR_PAYMENT_ALLOCATION"
  | "AP_INVOICE_POST"
  | "AP_PAYMENT_SETTLEMENT"
  | "YEAR_END_CATCH_UP";
export type MethodChangeRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "superseded"
  | "implemented";
export type FinancialEntityClassification =
  | "NON_FINANCIAL"
  | "CREDIT_INSTITUTION"
  | "SECURITIES_COMPANY"
  | "INSURANCE_COMPANY"
  | "FINANCIAL_HOLDING_GROUP";

export interface MethodEligibilityAssessment {
  readonly assessmentId: string;
  readonly companyId: string;
  readonly assessmentDate: string;
  readonly legalFormCode: string;
  readonly netTurnoverBasisSek: number;
  readonly entityTypeBasis: string;
  readonly financialEntityClassification: FinancialEntityClassification;
  readonly financialEntityExclusion: boolean;
  readonly rulepackCode: string;
  readonly rulepackVersion: string;
  readonly eligibleForCashMethod: boolean;
  readonly blockingReasons: readonly string[];
  readonly assessedByActorId: string;
  readonly assessedAt: string;
}

export interface AccountingMethodProfile {
  readonly methodProfileId: string;
  readonly companyId: string;
  readonly methodCode: AccountingMethodCode;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly fiscalYearStartDate: string | null;
  readonly legalBasisCode: string;
  readonly eligibilityAssessmentId: string;
  readonly eligibilitySnapshot: {
    readonly eligibleForCashMethod: boolean;
    readonly blockingReasons: readonly string[];
    readonly netTurnoverBasisSek: number;
    readonly legalFormCode: string;
    readonly financialEntityClassification: FinancialEntityClassification;
    readonly rulepackVersion: string;
  };
  readonly status: AccountingMethodProfileStatus;
  readonly onboardingOverride: boolean;
  readonly methodChangeRequestId: string | null;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly activatedBy: string | null;
  readonly activatedAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly supersededBy: string | null;
}

export interface MethodChangeRequest {
  readonly methodChangeRequestId: string;
  readonly companyId: string;
  readonly currentMethodCode: AccountingMethodCode | null;
  readonly requestedMethodCode: AccountingMethodCode;
  readonly requestedEffectiveFrom: string;
  readonly fiscalYearStartDate: string | null;
  readonly reasonCode: string;
  readonly requestedByActorId: string;
  readonly requestedAt: string;
  readonly status: MethodChangeRequestStatus;
  readonly decisionNote: string | null;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly implementedAt: string | null;
  readonly onboardingOverride: boolean;
  readonly updatedAt: string;
}

export interface YearEndCatchUpPostingLine {
  readonly accountNumber: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly currencyCode: string;
  readonly exchangeRate: number | null;
  readonly functionalDebitAmount: number;
  readonly functionalCreditAmount: number;
  readonly dimensionJson: Record<string, unknown>;
  readonly sourceId: string;
}

export interface ActiveAccountingMethodProfile extends AccountingMethodProfile {
  readonly accountingDate: string;
  readonly timingMode: AccountingMethodTimingMode;
}

export interface AccountingMethodPolicy {
  readonly companyId: string;
  readonly accountingDate: string;
  readonly methodProfileId: string;
  readonly methodCode: AccountingMethodCode;
  readonly timingMode: AccountingMethodTimingMode;
  readonly arInvoiceRecognitionTrigger: "AR_INVOICE_ISSUE" | "AR_PAYMENT_ALLOCATION";
  readonly apInvoiceRecognitionTrigger: "AP_INVOICE_POST" | "AP_PAYMENT_SETTLEMENT";
  readonly arVatRecognitionTrigger: "AR_INVOICE_ISSUE" | "AR_PAYMENT_ALLOCATION";
  readonly apVatRecognitionTrigger: "AP_INVOICE_POST" | "AP_PAYMENT_SETTLEMENT";
  readonly receivableRecognitionDateBasis: "invoice_date" | "payment_date";
  readonly payableRecognitionDateBasis: "invoice_date" | "payment_date";
  readonly vatRecognitionDateBasis: "invoice_date" | "payment_date";
  readonly settlementPostingRequired: true;
  readonly yearEndCatchUpRequired: boolean;
}

export interface AccountingMethodExecutionDirective extends AccountingMethodPolicy {
  readonly eventCode: AccountingMethodExecutionEventCode;
  readonly primaryRecognitionRequired: boolean;
  readonly vatDecisionRequired: boolean;
  readonly ledgerOperationalPostingRequired: boolean;
  readonly operationalDocumentIssueAllowed: boolean;
}

export interface YearEndCatchUpItem {
  readonly openItemType: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly recognitionDate: string;
  readonly dueDate: string | null;
  readonly unpaidAmount: number;
  readonly functionalUnpaidAmount: number;
  readonly currency: string;
  readonly exchangeRate: number | null;
  readonly vatAmount: number | null;
  readonly counterpartyId: string | null;
  readonly openItemAccountNumber: string;
  readonly accountingCurrencyCode: string;
  readonly postingIntentCode: string;
  readonly postingLines: readonly YearEndCatchUpPostingLine[];
}

export interface YearEndCatchUpRun {
  readonly yearEndCatchUpRunId: string;
  readonly companyId: string;
  readonly fiscalYearEndDate: string;
  readonly methodProfileId: string;
  readonly methodCode: AccountingMethodCode;
  readonly rulepackVersion: string;
  readonly timingSignal: "year_end_catch_up";
  readonly status: "completed" | "reversed";
  readonly snapshotHash: string;
  readonly capturedItemCount: number;
  readonly accountingCurrencyCode: string;
  readonly journalEntryId: string | null;
  readonly reversalJournalEntryId: string | null;
  readonly totals: {
    readonly receivablesAmount: number;
    readonly payablesAmount: number;
  };
  readonly items: readonly YearEndCatchUpItem[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly reversedAt?: string;
  readonly reversedByActorId?: string;
}
