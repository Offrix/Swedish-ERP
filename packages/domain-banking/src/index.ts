export type BankAccountStatus = "active" | "blocked" | "archived";
export type PaymentProposalStatus =
  | "draft"
  | "approved"
  | "exported"
  | "submitted"
  | "accepted_by_bank"
  | "partially_executed"
  | "settled"
  | "failed"
  | "cancelled";
export type PaymentOrderStatus = "prepared" | "reserved" | "sent" | "accepted" | "booked" | "returned" | "rejected";
export type PaymentBatchStatus =
  | "draft"
  | "exported"
  | "submitted"
  | "accepted_by_bank"
  | "partially_executed"
  | "settled"
  | "failed"
  | "cancelled";
export type PaymentRailCode = "open_banking" | "iso20022_file" | "bankgiro_file";
export type PaymentFileFormatCode = "open_banking_api" | "pain.001" | "bankgiro_csv";
export type StatementImportSourceCode = "open_banking_sync" | "camt053_file" | "manual_statement";
export type StatementImportStatus = "processed" | "reconciliation_required";
export type BankReconciliationCaseStatus = "open" | "in_review" | "resolved" | "written_off";
export type BankReconciliationPendingActionCode = "approve_payment_order_statement" | "approve_tax_account_statement_bridge";
export type BankPaymentEventType = "booked" | "rejected" | "returned";
export type SettlementLiabilityObjectType = "ap_open_item" | "tax_account_event";
export type SettlementLiabilityLinkStatus = "pending" | "matched" | "settled" | "returned" | "rejected";

export interface BankAccount {
  readonly bankAccountId: string;
  readonly companyId: string;
  readonly bankAccountNo: string;
  readonly bankName: string;
  readonly ledgerAccountNumber: string;
  readonly currencyCode: string;
  readonly clearingNumber: string | null;
  readonly accountNumber: string | null;
  readonly bankgiro: string | null;
  readonly plusgiro: string | null;
  readonly iban: string | null;
  readonly bic: string | null;
  readonly status: BankAccountStatus;
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PaymentOrder {
  readonly paymentOrderId: string;
  readonly companyId: string;
  readonly paymentProposalId: string;
  readonly paymentBatchId: string;
  readonly bankAccountId: string;
  readonly apOpenItemId: string;
  readonly supplierInvoiceId: string;
  readonly supplierId: string;
  readonly settlementLiabilityObjectType: SettlementLiabilityObjectType;
  readonly settlementLiabilityObjectId: string;
  readonly settlementLiabilitySourceDomain: string;
  readonly paymentRailCode: PaymentRailCode;
  readonly paymentFileFormatCode: PaymentFileFormatCode;
  readonly providerCode: string | null;
  readonly providerBaselineCode: string | null;
  readonly status: PaymentOrderStatus;
  readonly payeeName: string;
  readonly bankgiro: string | null;
  readonly plusgiro: string | null;
  readonly iban: string | null;
  readonly bic: string | null;
  readonly paymentReference: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly dueDate: string;
  readonly lineageKey: string;
  readonly reservedJournalEntryId: string | null;
  readonly bookedJournalEntryId: string | null;
  readonly rejectedJournalEntryId: string | null;
  readonly returnedJournalEntryId: string | null;
  readonly bankEventId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PaymentBatch {
  readonly paymentBatchId: string;
  readonly paymentBatchNo: string;
  readonly companyId: string;
  readonly paymentProposalId: string;
  readonly bankAccountId: string;
  readonly paymentRailCode: PaymentRailCode;
  readonly paymentFileFormatCode: string;
  readonly providerCode: string | null;
  readonly providerBaselineId: string | null;
  readonly providerBaselineCode: string | null;
  readonly providerBaselineVersion: string | null;
  readonly providerBaselineChecksum: string | null;
  readonly providerReference: string | null;
  readonly deliveryMode: string;
  readonly status: PaymentBatchStatus;
  readonly paymentDate: string;
  readonly currencyCode: string;
  readonly totalAmount: number;
  readonly orderCount: number;
  readonly exportFileName: string | null;
  readonly exportPayload: string | null;
  readonly exportPayloadHash: string | null;
  readonly exportedAt: string | null;
  readonly submittedAt: string | null;
  readonly acceptedByBankAt: string | null;
  readonly settledAt: string | null;
  readonly failedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly bankAccount?: BankAccount | null;
  readonly proposal?: {
    readonly paymentProposalId: string;
    readonly paymentProposalNo: string;
    readonly status: PaymentProposalStatus;
  } | null;
  readonly orders?: readonly PaymentOrder[];
}

export interface PaymentProposal {
  readonly paymentProposalId: string;
  readonly companyId: string;
  readonly paymentProposalNo: string;
  readonly bankAccountId: string;
  readonly paymentBatchId: string;
  readonly paymentRailCode: PaymentRailCode;
  readonly paymentFileFormatCode: string;
  readonly providerCode: string | null;
  readonly providerBaselineId: string | null;
  readonly providerBaselineCode: string | null;
  readonly providerBaselineVersion: string | null;
  readonly providerBaselineChecksum: string | null;
  readonly providerReference: string | null;
  readonly status: PaymentProposalStatus;
  readonly paymentDate: string;
  readonly currencyCode: string;
  readonly totalAmount: number;
  readonly sourceOpenItemSetHash: string;
  readonly exportFileName: string | null;
  readonly exportPayload: string | null;
  readonly exportPayloadHash: string | null;
  readonly approvedByActorId: string | null;
  readonly approvedAt: string | null;
  readonly exportedAt: string | null;
  readonly submittedAt: string | null;
  readonly acceptedByBankAt: string | null;
  readonly settledAt: string | null;
  readonly failedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly bankAccount?: BankAccount | null;
  readonly paymentBatch?: PaymentBatch | null;
  readonly orders?: readonly PaymentOrder[];
}

export interface BankStatementEvent {
  readonly bankStatementEventId: string;
  readonly statementImportId: string;
  readonly companyId: string;
  readonly bankAccountId: string;
  readonly externalReference: string;
  readonly bookingDate: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly counterpartyName: string | null;
  readonly referenceText: string | null;
  readonly statementCategoryCode: string;
  readonly sourceChannelCode: StatementImportSourceCode;
  readonly statementFileFormatCode: string;
  readonly providerCode: string | null;
  readonly providerReference: string | null;
  readonly linkedPaymentOrderId: string | null;
  readonly paymentOrderAction: string | null;
  readonly matchStatus: string;
  readonly processingStatus: string;
  readonly matchedObjectType: string | null;
  readonly matchedObjectId: string | null;
  readonly reconciliationCaseId: string | null;
  readonly taxAccountEventId: string | null;
  readonly failureReasonCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StatementImport {
  readonly statementImportId: string;
  readonly statementImportNo: string;
  readonly companyId: string;
  readonly bankAccountId: string;
  readonly statementDate: string;
  readonly sourceChannelCode: StatementImportSourceCode;
  readonly statementFileFormatCode: string;
  readonly providerCode: string | null;
  readonly providerBaselineId: string | null;
  readonly providerBaselineCode: string | null;
  readonly providerBaselineVersion: string | null;
  readonly providerBaselineChecksum: string | null;
  readonly providerReference: string | null;
  readonly sourceFileName: string | null;
  readonly status: StatementImportStatus;
  readonly importedCount: number;
  readonly duplicateCount: number;
  readonly matchedPaymentOrderCount: number;
  readonly matchedTaxAccountCount: number;
  readonly reconciliationRequiredCount: number;
  readonly eventCount: number;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly bankAccount?: BankAccount | null;
  readonly items?: readonly BankStatementEvent[];
}

export interface BankReconciliationCase {
  readonly reconciliationCaseId: string;
  readonly companyId: string;
  readonly bankAccountId: string;
  readonly bankStatementEventId: string;
  readonly caseTypeCode: string;
  readonly status: BankReconciliationCaseStatus;
  readonly differenceAmount: number;
  readonly reasonCode: string;
  readonly pendingActionCode: BankReconciliationPendingActionCode | null;
  readonly pendingTargetObjectType: string | null;
  readonly pendingTargetObjectId: string | null;
  readonly pendingPayload: Record<string, unknown> | null;
  readonly resolutionCode: string | null;
  readonly resolutionNote: string | null;
  readonly resolvedAt: string | null;
  readonly resolvedByActorId: string | null;
  readonly executedActionCode: BankReconciliationPendingActionCode | null;
  readonly executedActionAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BankPaymentEvent {
  readonly bankPaymentEventId: string;
  readonly companyId: string;
  readonly paymentOrderId: string;
  readonly bankEventId: string;
  readonly eventType: BankPaymentEventType;
  readonly status: string;
  readonly journalEntryId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SettlementLiabilityLink {
  readonly settlementLiabilityLinkId: string;
  readonly companyId: string;
  readonly paymentBatchId: string | null;
  readonly paymentProposalId: string | null;
  readonly paymentOrderId: string | null;
  readonly bankStatementEventId: string | null;
  readonly bankPaymentEventId: string | null;
  readonly bankAccountId: string | null;
  readonly liabilityObjectType: SettlementLiabilityObjectType;
  readonly liabilityObjectId: string;
  readonly relatedObjectType: string | null;
  readonly relatedObjectId: string | null;
  readonly expectedAmount: number;
  readonly settledAmount: number;
  readonly currencyCode: string;
  readonly status: SettlementLiabilityLinkStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}
