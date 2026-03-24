export type ArCustomerStatus = "active" | "blocked" | "archived";
export type ArPriceListStatus = "draft" | "active" | "inactive";
export type ArQuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
export type ArContractStatus = "draft" | "pending_approval" | "active" | "paused" | "terminated" | "expired";
export type ArInvoiceFrequency = "monthly" | "quarterly" | "annual" | "one_time";
export type ArInvoiceType = "standard" | "credit_note" | "partial" | "subscription";
export type ArInvoiceStatus =
  | "draft"
  | "validated"
  | "approved"
  | "issued"
  | "delivered"
  | "delivery_failed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "disputed"
  | "credited"
  | "written_off"
  | "reversed";
export type ArInvoiceDeliveryChannel = "pdf_email" | "peppol";
export type ArInvoiceSeriesStatus = "active" | "paused" | "archived";
export type ArPaymentLinkStatus = "active" | "consumed" | "expired" | "cancelled";
export type ArOpenItemStatus = "open" | "partially_settled" | "settled" | "disputed" | "written_off" | "reversed";
export type ArCollectionStage = "none" | "stage_1" | "stage_2" | "escalated" | "hold" | "closed";
export type ArAllocationType = "payment" | "credit_note" | "prepayment" | "writeoff_adjustment";
export type ArAllocationStatus = "proposed" | "confirmed" | "reversed";
export type ArPaymentMatchRunStatus = "received" | "matched" | "review_required" | "completed" | "failed";
export type ArPaymentMatchSourceChannel = "bank_feed" | "bank_file" | "webhook" | "manual";
export type ArPaymentMatchCandidateStatus = "proposed" | "confirmed" | "rejected" | "reversed";
export type ArUnmatchedReceiptStatus = "unmatched" | "partially_allocated" | "allocated" | "reversed";
export type ArDunningRunStatus = "draft" | "executed" | "reversed" | "cancelled";
export type ArDunningItemActionStatus = "proposed" | "booked" | "skipped" | "reversed";
export type ArAgingBucketCode = "current" | "1_30" | "31_60" | "61_90" | "91_plus";

export interface ArAddress {
  readonly line1: string;
  readonly line2: string | null;
  readonly postalCode: string;
  readonly city: string;
  readonly countryCode: string;
}

export interface ArCustomer {
  readonly customerId: string;
  readonly companyId: string;
  readonly customerNo: string;
  readonly legalName: string;
  readonly organizationNumber: string | null;
  readonly countryCode: string;
  readonly languageCode: string;
  readonly currencyCode: string;
  readonly paymentTermsCode: string;
  readonly invoiceDeliveryMethod: string;
  readonly creditLimitAmount: number;
  readonly reminderProfileCode: string;
  readonly peppolScheme: string | null;
  readonly peppolIdentifier: string | null;
  readonly vatStatus: string;
  readonly billingAddress: ArAddress;
  readonly deliveryAddress: ArAddress;
  readonly customerStatus: ArCustomerStatus;
  readonly allowReminderFee: boolean;
  readonly allowInterest: boolean;
  readonly allowPartialDelivery: boolean;
  readonly blockedForInvoicing: boolean;
  readonly blockedForDelivery: boolean;
  readonly importSourceKey?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArCustomerContact {
  readonly customerContactId: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly displayName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly roleCode: string;
  readonly defaultBilling: boolean;
  readonly defaultDelivery: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArItem {
  readonly arItemId: string;
  readonly companyId: string;
  readonly itemCode: string;
  readonly description: string;
  readonly itemType: string;
  readonly unitCode: string;
  readonly standardPrice: number;
  readonly revenueAccountNumber: string;
  readonly vatCode: string;
  readonly recurringFlag: boolean;
  readonly projectBoundFlag: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArPriceListLine {
  readonly priceListLineId: string;
  readonly lineNumber: number;
  readonly itemId: string;
  readonly itemCode: string;
  readonly unitPrice: number;
  readonly currencyCode: string;
  readonly validFrom: string;
  readonly validTo: string | null;
}

export interface ArPriceList {
  readonly priceListId: string;
  readonly companyId: string;
  readonly priceListCode: string;
  readonly description: string;
  readonly currencyCode: string;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly status: ArPriceListStatus;
  readonly lines: readonly ArPriceListLine[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArCommercialLine {
  readonly lineId: string;
  readonly lineNumber: number;
  readonly itemId: string | null;
  readonly itemCode: string | null;
  readonly projectId: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitCode: string;
  readonly unitPrice: number;
  readonly lineAmount: number;
  readonly revenueAccountNumber: string;
  readonly vatCode: string;
  readonly recurringFlag: boolean;
  readonly projectBoundFlag: boolean;
}

export interface ArQuoteVersion {
  readonly quoteVersionId: string;
  readonly versionNo: number;
  readonly status: ArQuoteStatus;
  readonly supersedesQuoteVersionId: string | null;
  readonly customerId: string;
  readonly title: string;
  readonly validUntil: string;
  readonly currencyCode: string;
  readonly discountModel: string;
  readonly priceListId: string | null;
  readonly lines: readonly ArCommercialLine[];
  readonly totalAmount: number;
  readonly sourceSnapshotHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArQuote {
  readonly quoteId: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly quoteNo: string;
  readonly currentVersionId: string;
  readonly currentVersionNo: number;
  readonly status: ArQuoteStatus;
  readonly convertedContractId: string | null;
  readonly versions: readonly ArQuoteVersion[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArInvoicePlanRow {
  readonly invoicePlanRowId: string;
  readonly sequenceNo: number;
  readonly plannedInvoiceDate: string;
  readonly periodStartsOn: string;
  readonly periodEndsOn: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly status: "planned";
}

export interface ArContract {
  readonly contractId: string;
  readonly companyId: string;
  readonly contractNo: string;
  readonly customerId: string;
  readonly sourceQuoteId: string | null;
  readonly sourceQuoteVersionId: string | null;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly invoiceFrequency: ArInvoiceFrequency;
  readonly currencyCode: string;
  readonly minimumFeeAmount: number;
  readonly indexationAnnualPercent: number;
  readonly indexationAppliesFrom: string | null;
  readonly terminationRuleCode: string;
  readonly creditRuleCode: string;
  readonly status: ArContractStatus;
  readonly lines: readonly ArCommercialLine[];
  readonly invoicePlan: readonly ArInvoicePlanRow[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArCustomerImportBatch {
  readonly customerImportBatchId: string;
  readonly companyId: string;
  readonly batchKey: string;
  readonly payloadHash: string;
  readonly rowCount: number;
  readonly createdCustomers: number;
  readonly updatedCustomers: number;
  readonly createdContacts: number;
  readonly importedCustomerIds: readonly string[];
  readonly createdAt: string;
}

export interface ArAuditEvent {
  readonly auditEventId: string;
  readonly companyId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly recordedAt: string;
}

export interface ArInvoiceTotals {
  readonly netAmount: number;
  readonly vatAmount: number;
  readonly grossAmount: number;
}

export interface ArInvoiceDelivery {
  readonly deliveryId: string;
  readonly companyId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly channel: ArInvoiceDeliveryChannel;
  readonly documentType: "invoice" | "credit_note";
  readonly payloadType: string;
  readonly payloadVersion: string;
  readonly payloadHash: string;
  readonly status: string;
  readonly recipient: string;
  readonly buyerReference: string | null;
  readonly purchaseOrderReference: string | null;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ArInvoicePaymentLink {
  readonly paymentLinkId: string;
  readonly companyId: string;
  readonly invoiceId: string;
  readonly providerCode: string;
  readonly status: ArPaymentLinkStatus;
  readonly amount: number;
  readonly currencyCode: string;
  readonly url: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface ArInvoiceSeries {
  readonly arInvoiceSeriesId: string;
  readonly companyId: string;
  readonly seriesCode: string;
  readonly prefix: string;
  readonly description: string;
  readonly nextNumber: number;
  readonly status: ArInvoiceSeriesStatus;
  readonly invoiceTypeCodes: readonly ArInvoiceType[];
  readonly voucherSeriesPurposeCode: string;
  readonly importedSequencePreservationEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArInvoice {
  readonly customerInvoiceId: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly sourceContractId: string | null;
  readonly sourceQuoteId: string | null;
  readonly originalInvoiceId: string | null;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly invoiceType: ArInvoiceType;
  readonly status: ArInvoiceStatus;
  readonly deliveryChannel: ArInvoiceDeliveryChannel;
  readonly invoiceNumber: string | null;
  readonly invoiceSeriesCode: string | null;
  readonly invoiceSequenceNumber: number | null;
  readonly issueIdempotencyKey: string | null;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly currencyCode: string;
  readonly lines: readonly ArCommercialLine[];
  readonly totals: ArInvoiceTotals;
  readonly buyerReference: string | null;
  readonly purchaseOrderReference: string | null;
  readonly recipientEmails: readonly string[];
  readonly journalEntryId: string | null;
  readonly issuedAt: string | null;
  readonly validatedAt: string | null;
  readonly approvedAt: string | null;
  readonly deliveredAt: string | null;
  readonly deliveries: readonly ArInvoiceDelivery[];
  readonly paymentLinks: readonly ArInvoicePaymentLink[];
  readonly creditedAmount: number;
  readonly remainingAmount: number;
  readonly paymentReference: string | null;
  readonly invoiceGenerationKey: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArOpenItem {
  readonly arOpenItemId: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly customerCountryCode: string;
  readonly customerInvoiceId: string | null;
  readonly originalCustomerInvoiceId: string | null;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly idempotencyKey: string;
  readonly currencyCode: string;
  readonly functionalCurrencyCode: string;
  readonly originalAmount: number;
  readonly openAmount: number;
  readonly paidAmount: number;
  readonly creditedAmount: number;
  readonly writeoffAmount: number;
  readonly disputedAmount: number;
  readonly dueOn: string | null;
  readonly openedOn: string;
  readonly closedOn: string | null;
  readonly lastActivityAt: string | null;
  readonly agingBucketCode: ArAgingBucketCode;
  readonly collectionStageCode: ArCollectionStage;
  readonly disputeFlag: boolean;
  readonly dunningHoldFlag: boolean;
  readonly status: ArOpenItemStatus;
  readonly metadataJson: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArOpenItemEvent {
  readonly arOpenItemEventId: string;
  readonly arOpenItemId: string;
  readonly companyId: string;
  readonly eventCode: string;
  readonly eventReasonCode: string | null;
  readonly eventSourceType: string;
  readonly eventSourceId: string;
  readonly amountDelta: number;
  readonly openAmountBefore: number;
  readonly openAmountAfter: number;
  readonly snapshotJson: Record<string, unknown>;
  readonly occurredAt: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ArAllocation {
  readonly arAllocationId: string;
  readonly companyId: string;
  readonly arOpenItemId: string;
  readonly customerInvoiceId: string | null;
  readonly allocationType: ArAllocationType;
  readonly sourceChannel: ArPaymentMatchSourceChannel | "system";
  readonly status: ArAllocationStatus;
  readonly allocatedAmount: number;
  readonly currencyCode: string;
  readonly functionalAmount: number;
  readonly allocatedOn: string;
  readonly bankTransactionUid: string | null;
  readonly statementLineHash: string | null;
  readonly externalEventRef: string;
  readonly arPaymentMatchingRunId: string | null;
  readonly reversalOfAllocationId: string | null;
  readonly reasonCode: string;
  readonly unmatchedBankReceiptId: string | null;
  readonly suspenseAmount: number;
  readonly journalEntryId: string | null;
  readonly reversalJournalEntryId: string | null;
  readonly metadataJson: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArUnmatchedBankReceipt {
  readonly arUnmatchedBankReceiptId: string;
  readonly companyId: string;
  readonly bankTransactionUid: string;
  readonly statementLineHash: string;
  readonly valueDate: string;
  readonly amount: number;
  readonly remainingAmount: number;
  readonly currencyCode: string;
  readonly payerReference: string | null;
  readonly customerHint: string | null;
  readonly status: ArUnmatchedReceiptStatus;
  readonly linkedArAllocationId: string | null;
  readonly payloadJson: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArPaymentMatchCandidate {
  readonly arPaymentMatchCandidateId: string;
  readonly arPaymentMatchingRunId: string | null;
  readonly companyId: string;
  readonly arOpenItemId: string | null;
  readonly customerId: string | null;
  readonly bankTransactionUid: string;
  readonly statementLineHash: string;
  readonly payerReference: string | null;
  readonly amount: number;
  readonly currencyCode: string;
  readonly valueDate: string;
  readonly matchScore: number;
  readonly status: ArPaymentMatchCandidateStatus;
  readonly reasonCode: string;
  readonly payloadJson: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ArPaymentMatchingRun {
  readonly arPaymentMatchingRunId: string;
  readonly companyId: string;
  readonly sourceChannel: ArPaymentMatchSourceChannel;
  readonly externalBatchRef: string | null;
  readonly idempotencyKey: string;
  readonly status: ArPaymentMatchRunStatus;
  readonly runStartedAt: string;
  readonly runCompletedAt: string | null;
  readonly stats: {
    readonly processed: number;
    readonly matched: number;
    readonly reviewRequired: number;
  };
  readonly candidates: readonly ArPaymentMatchCandidate[];
  readonly allocations: readonly ArAllocation[];
  readonly unmatchedReceipts: readonly ArUnmatchedBankReceipt[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ArDunningRunItem {
  readonly arDunningRunItemId: string;
  readonly arDunningRunId: string;
  readonly companyId: string;
  readonly arOpenItemId: string;
  readonly customerInvoiceId: string | null;
  readonly stageCode: Exclude<ArCollectionStage, "none" | "hold" | "closed">;
  readonly feeAmount: number;
  readonly interestAmount: number;
  readonly lateCompensationAmount: number;
  readonly actionStatus: ArDunningItemActionStatus;
  readonly skipReasonCode: string | null;
  readonly journalEntryIds: readonly string[];
  readonly payloadJson: Record<string, unknown>;
  readonly createdAt: string;
}

export interface ArDunningRun {
  readonly arDunningRunId: string;
  readonly companyId: string;
  readonly runDate: string;
  readonly stageCode: Exclude<ArCollectionStage, "none" | "hold" | "closed">;
  readonly status: ArDunningRunStatus;
  readonly calculationWindowStart: string;
  readonly calculationWindowEnd: string;
  readonly idempotencyKey: string;
  readonly summary: {
    readonly items: number;
    readonly feesGenerated: number;
    readonly interestGenerated: number;
    readonly skipped: number;
  };
  readonly items: readonly ArDunningRunItem[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ArWriteoff {
  readonly arWriteoffId: string;
  readonly companyId: string;
  readonly arOpenItemId: string;
  readonly customerInvoiceId: string | null;
  readonly arAllocationId: string | null;
  readonly status: "proposed" | "approved" | "posted" | "reversed";
  readonly reasonCode: string;
  readonly policyLimitAmount: number;
  readonly requiresApproval: boolean;
  readonly approvedByActorId: string | null;
  readonly writeoffAmount: number;
  readonly currencyCode: string;
  readonly functionalAmount: number;
  readonly ledgerAccountNumber: string;
  readonly writeoffDate: string;
  readonly reversalOfWriteoffId: string | null;
  readonly journalEntryId: string | null;
  readonly metadataJson: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ArAgingSnapshot {
  readonly arAgingSnapshotId: string;
  readonly companyId: string;
  readonly cutoffDate: string;
  readonly sourceHash: string;
  readonly openItemCount: number;
  readonly bucketTotalsJson: Record<ArAgingBucketCode, number>;
  readonly customerTotalsJson: Record<string, number>;
  readonly generatedByActorId: string;
  readonly generatedAt: string;
}

export interface AccountsReceivableSnapshot {
  readonly customers: readonly ArCustomer[];
  readonly contacts: readonly ArCustomerContact[];
  readonly items: readonly ArItem[];
  readonly priceLists: readonly ArPriceList[];
  readonly quotes: readonly ArQuote[];
  readonly contracts: readonly ArContract[];
  readonly invoiceSeries: readonly ArInvoiceSeries[];
  readonly invoices: readonly ArInvoice[];
  readonly paymentLinks: readonly ArInvoicePaymentLink[];
  readonly openItems: readonly ArOpenItem[];
  readonly openItemEvents: readonly ArOpenItemEvent[];
  readonly paymentMatchingRuns: readonly ArPaymentMatchingRun[];
  readonly paymentMatchCandidates: readonly ArPaymentMatchCandidate[];
  readonly allocations: readonly ArAllocation[];
  readonly unmatchedBankReceipts: readonly ArUnmatchedBankReceipt[];
  readonly dunningRuns: readonly ArDunningRun[];
  readonly writeoffs: readonly ArWriteoff[];
  readonly agingSnapshots: readonly ArAgingSnapshot[];
  readonly customerImportBatches: readonly ArCustomerImportBatch[];
  readonly auditEvents: readonly ArAuditEvent[];
}
