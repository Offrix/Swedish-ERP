export type ApSupplierStatus = "draft" | "active" | "blocked" | "archived";
export type ApPurchaseOrderStatus =
  | "draft"
  | "approved"
  | "sent"
  | "partially_received"
  | "fully_received"
  | "closed"
  | "cancelled";
export type ApReceiptTargetType = "expense" | "asset" | "inventory" | "project_material";
export type ApSupplierInvoiceStatus =
  | "draft"
  | "matching"
  | "pending_approval"
  | "approved"
  | "posted"
  | "scheduled_for_payment"
  | "paid"
  | "credited"
  | "voided";
export type ApSupplierInvoiceType = "standard" | "credit_note";
export type ApDuplicateStatus = "not_checked" | "exact_duplicate" | "suspect_duplicate" | "cleared";
export type ApMatchMode = "none" | "two_way" | "three_way";
export type ApMatchVarianceStatus = "open" | "accepted" | "corrected" | "closed";
export type ApInvoiceApprovalStatus = "not_required" | "pending" | "approved";

export interface ApSupplier {
  readonly supplierId: string;
  readonly companyId: string;
  readonly supplierNo: string;
  readonly legalName: string;
  readonly organizationNumber: string | null;
  readonly vatNumber: string | null;
  readonly countryCode: string;
  readonly currencyCode: string;
  readonly paymentTermsCode: string;
  readonly paymentRecipient: string | null;
  readonly bankgiro: string | null;
  readonly plusgiro: string | null;
  readonly iban: string | null;
  readonly bic: string | null;
  readonly defaultExpenseAccountNumber: string | null;
  readonly defaultVatCode: string | null;
  readonly defaultDimensionsJson: Record<string, string>;
  readonly defaultUnitPrice: number | null;
  readonly paymentBlocked: boolean;
  readonly bookingBlocked: boolean;
  readonly riskClassCode: string;
  readonly attestChainId: string | null;
  readonly requiresPo: boolean;
  readonly requiresReceipt: boolean;
  readonly allowCreditWithoutLink: boolean;
  readonly reverseChargeDefault: boolean;
  readonly status: ApSupplierStatus;
  readonly importSourceKey: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApPurchaseOrderLine {
  readonly purchaseOrderLineId: string;
  readonly lineNo: number;
  readonly description: string;
  readonly quantityOrdered: number;
  readonly unitPrice: number;
  readonly netAmount: number;
  readonly currencyCode: string;
  readonly vatCode: string | null;
  readonly expenseAccountNumber: string;
  readonly defaultDimensionsJson: Record<string, string>;
  readonly receiptTargetType: ApReceiptTargetType;
  readonly toleranceProfileCode: string;
  readonly overdeliveryTolerancePercent: number;
  readonly receivedQuantity: number;
  readonly invoicedQuantity: number;
}

export interface ApPurchaseOrder {
  readonly purchaseOrderId: string;
  readonly companyId: string;
  readonly poNo: string;
  readonly supplierId: string;
  readonly currencyCode: string;
  readonly requesterUserId: string;
  readonly approvalPolicyCode: string;
  readonly toleranceProfileCode: string;
  readonly expectedDeliveryDate: string | null;
  readonly defaultExpenseAccountNumber: string | null;
  readonly defaultVatCode: string | null;
  readonly defaultDimensionsJson: Record<string, string>;
  readonly defaultUnitPrice: number | null;
  readonly projectCode: string | null;
  readonly costCenterCode: string | null;
  readonly status: ApPurchaseOrderStatus;
  readonly lines: readonly ApPurchaseOrderLine[];
  readonly approvedByActorId: string | null;
  readonly approvedAt: string | null;
  readonly sentAt: string | null;
  readonly closedAt: string | null;
  readonly importSourceKey: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApReceiptLine {
  readonly apReceiptLineId: string;
  readonly purchaseOrderLineId: string;
  readonly lineNo: number;
  readonly receivedQuantity: number;
  readonly receivedPercent: number | null;
  readonly receiptTargetType: ApReceiptTargetType;
  readonly varianceCode: string | null;
  readonly comment: string | null;
}

export interface ApReceipt {
  readonly apReceiptId: string;
  readonly companyId: string;
  readonly supplierId: string;
  readonly purchaseOrderId: string;
  readonly receiptDate: string;
  readonly receiverActorId: string;
  readonly supplierInvoiceReference: string | null;
  readonly externalReceiptRef: string | null;
  readonly deliveryReference: string | null;
  readonly comment: string | null;
  readonly varianceCode: string | null;
  readonly duplicateKey: string;
  readonly lines: readonly ApReceiptLine[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApSupplierInvoiceLineVatProposal {
  readonly vatCode: string;
  readonly vatRate: number;
  readonly vatAmount: number;
  readonly explanation: string;
  readonly decisionCategory: string;
  readonly declarationBoxCodes: readonly string[];
  readonly postingEntries: readonly Record<string, unknown>[];
  readonly reviewRequired: boolean;
  readonly reviewQueueCodes: readonly string[];
  readonly vatDecisionId: string | null;
  readonly vatReviewQueueItemId: string | null;
}

export interface ApSupplierInvoiceLine {
  readonly supplierInvoiceLineId: string;
  readonly lineNo: number;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly netAmount: number;
  readonly expenseAccountNumber: string | null;
  readonly dimensionsJson: Record<string, string>;
  readonly allocationRequiredFieldCodes: readonly string[];
  readonly allocationMissingFieldCodes: readonly string[];
  readonly allocationInvalidFieldCodes: readonly string[];
  readonly allocationReviewRequired: boolean;
  readonly goodsOrServices: "goods" | "services";
  readonly reverseChargeFlag: boolean;
  readonly constructionServiceFlag: boolean;
  readonly deductionRatio: number;
  readonly vatCode: string;
  readonly vatRate: number;
  readonly vatAmount: number;
  readonly grossAmount: number;
  readonly vatProposal: ApSupplierInvoiceLineVatProposal;
  readonly receiptRequired: boolean;
  readonly purchaseOrderLineId: string | null;
  readonly purchaseOrderLineReference: string | null;
  readonly purchaseOrderMatchedLineId: string | null;
  readonly toleranceProfileCode: string;
  readonly reviewRequired: boolean;
  readonly reviewQueueCodes: readonly string[];
}

export interface ApSupplierInvoiceVariance {
  readonly supplierInvoiceVarianceId: string;
  readonly companyId: string;
  readonly supplierInvoiceId: string;
  readonly supplierInvoiceLineId: string;
  readonly varianceCode: string;
  readonly reviewQueueCode: string;
  readonly severity: string;
  readonly status: ApMatchVarianceStatus;
  readonly message: string;
  readonly expectedValue: unknown;
  readonly actualValue: unknown;
  readonly toleranceValue: unknown;
  readonly createdAt: string;
}

export interface ApSupplierInvoiceMatchRunLineResult {
  readonly supplierInvoiceLineId: string;
  readonly lineNo: number;
  readonly matchMode: ApMatchMode;
  readonly matchedPurchaseOrderLineId: string | null;
  readonly matchedReceiptQuantity: number;
  readonly variances: readonly ApSupplierInvoiceVariance[];
}

export interface ApSupplierInvoiceMatchRun {
  readonly supplierInvoiceMatchRunId: string;
  readonly companyId: string;
  readonly supplierInvoiceId: string;
  readonly matchMode: ApMatchMode;
  readonly status: "matched" | "review_required";
  readonly varianceCount: number;
  readonly reviewRequired: boolean;
  readonly lineResults: readonly ApSupplierInvoiceMatchRunLineResult[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ApSupplierInvoiceApprovalStep {
  readonly approvalChainStepId: string;
  readonly stepOrder: number;
  readonly approverRoleCode: string | null;
  readonly approverCompanyUserId: string | null;
  readonly delegationAllowed: boolean;
  readonly label: string;
  readonly status: "pending" | "approved" | "rejected";
  readonly actedAt: string | null;
  readonly actedByActorId: string | null;
  readonly actedByCompanyUserId: string | null;
  readonly actedByRoleCode: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApOpenItem {
  readonly apOpenItemId: string;
  readonly companyId: string;
  readonly supplierInvoiceId: string;
  readonly originalAmount: number;
  readonly openAmount: number;
  readonly reservedAmount: number;
  readonly paidAmount: number;
  readonly dueOn: string;
  readonly status: string;
  readonly paymentHold: boolean;
  readonly paymentHoldReasonCodes: readonly string[];
  readonly paymentReadinessStatus?: string | null;
  readonly paymentReadinessReasonCodes?: readonly string[];
  readonly importCaseId?: string | null;
  readonly classificationCaseId?: string | null;
  readonly paymentProposalId: string | null;
  readonly paymentOrderId: string | null;
  readonly lastPaymentOrderId: string | null;
  readonly lastBankEventId: string | null;
  readonly lastReservationJournalEntryId: string | null;
  readonly lastSettlementJournalEntryId: string | null;
  readonly lastReturnJournalEntryId: string | null;
  readonly lastRejectionJournalEntryId: string | null;
  readonly journalEntryId: string;
  readonly currencyCode: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
}

export interface ApSupplierInvoice {
  readonly supplierInvoiceId: string;
  readonly companyId: string;
  readonly supplierInvoiceNo: string;
  readonly supplierId: string;
  readonly purchaseOrderId: string | null;
  readonly purchaseOrderNo: string | null;
  readonly documentId: string | null;
  readonly documentVersionId: string | null;
  readonly sourceChannel: string;
  readonly invoiceType: ApSupplierInvoiceType;
  readonly originalSupplierInvoiceId: string | null;
  readonly creditReasonCode: string | null;
  readonly externalInvoiceRef: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly currencyCode: string;
  readonly netAmount: number;
  readonly vatAmount: number;
  readonly grossAmount: number;
  readonly paymentReference: string | null;
  readonly documentHash: string;
  readonly duplicateCheckStatus: ApDuplicateStatus;
  readonly duplicateFingerprintHash: string;
  readonly duplicateOfSupplierInvoiceId: string | null;
  readonly matchMode: ApMatchMode;
  readonly status: ApSupplierInvoiceStatus;
  readonly reviewRequired: boolean;
  readonly reviewQueueCodes: readonly string[];
  readonly approvalChainId: string | null;
  readonly approvalStatus: ApInvoiceApprovalStatus;
  readonly approvalSteps: readonly ApSupplierInvoiceApprovalStep[];
  readonly paymentHold: boolean;
  readonly paymentHoldReasonCodes: readonly string[];
  readonly paymentReadinessStatus?: string | null;
  readonly paymentReadinessReasonCodes?: readonly string[];
  readonly lines: readonly ApSupplierInvoiceLine[];
  readonly latestMatchRunId: string | null;
  readonly journalEntryId: string | null;
  readonly apOpenItemId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly postedAt: string | null;
  readonly paidAt: string | null;
  readonly variances?: readonly ApSupplierInvoiceVariance[];
  readonly matchRun?: ApSupplierInvoiceMatchRun | null;
}

export interface ApPaymentPreparation {
  readonly apPaymentPreparationId: string;
  readonly companyId: string;
  readonly apOpenItemId: string;
  readonly supplierInvoiceId: string;
  readonly supplierId: string;
  readonly invoiceType: ApSupplierInvoiceType;
  readonly status: string;
  readonly blockerCodes: readonly string[];
  readonly reviewRequired: boolean;
  readonly paymentHold: boolean;
  readonly amount: number;
  readonly currencyCode: string;
  readonly dueOn: string;
  readonly payeeName: string;
  readonly bankgiro: string | null;
  readonly plusgiro: string | null;
  readonly iban: string | null;
  readonly bic: string | null;
  readonly sourceStatus: {
    readonly openItemStatus: string;
    readonly invoiceStatus: string;
    readonly paymentReadinessStatus: string | null;
  };
}

export interface ApImportBatchItem {
  readonly result: "created" | "updated";
}

export interface ApSupplierImportBatchItem extends ApImportBatchItem {
  readonly supplierNo: string;
  readonly supplierId: string;
}

export interface ApPurchaseOrderImportBatchItem extends ApImportBatchItem {
  readonly poNo: string;
  readonly purchaseOrderId: string;
}

export interface ApSupplierImportBatch {
  readonly supplierImportBatchId: string;
  readonly companyId: string;
  readonly batchKey: string;
  readonly payloadHash: string;
  readonly status: "completed";
  readonly summary: {
    readonly created: number;
    readonly updated: number;
  };
  readonly items: readonly ApSupplierImportBatchItem[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ApPurchaseOrderImportBatch {
  readonly purchaseOrderImportBatchId: string;
  readonly companyId: string;
  readonly batchKey: string;
  readonly payloadHash: string;
  readonly status: "completed";
  readonly summary: {
    readonly created: number;
    readonly updated: number;
  };
  readonly items: readonly ApPurchaseOrderImportBatchItem[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ApAuditEvent {
  readonly auditEventId: string;
  readonly companyId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly createdAt: string;
}

export interface AccountsPayableSnapshot {
  readonly suppliers: readonly ApSupplier[];
  readonly purchaseOrders: readonly ApPurchaseOrder[];
  readonly receipts: readonly ApReceipt[];
  readonly supplierInvoices: readonly ApSupplierInvoice[];
  readonly supplierInvoiceMatchRuns: readonly ApSupplierInvoiceMatchRun[];
  readonly supplierInvoiceVariances: readonly ApSupplierInvoiceVariance[];
  readonly apOpenItems: readonly ApOpenItem[];
  readonly supplierImportBatches: readonly ApSupplierImportBatch[];
  readonly purchaseOrderImportBatches: readonly ApPurchaseOrderImportBatch[];
  readonly auditEvents: readonly ApAuditEvent[];
}
