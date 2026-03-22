export type ArCustomerStatus = "active" | "blocked" | "archived";
export type ArPriceListStatus = "draft" | "active" | "inactive";
export type ArQuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
export type ArContractStatus = "draft" | "pending_approval" | "active" | "paused" | "terminated" | "expired";
export type ArInvoiceFrequency = "monthly" | "quarterly" | "annual" | "one_time";

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

export interface AccountsReceivableSnapshot {
  readonly customers: readonly ArCustomer[];
  readonly contacts: readonly ArCustomerContact[];
  readonly items: readonly ArItem[];
  readonly priceLists: readonly ArPriceList[];
  readonly quotes: readonly ArQuote[];
  readonly contracts: readonly ArContract[];
  readonly customerImportBatches: readonly ArCustomerImportBatch[];
  readonly auditEvents: readonly ArAuditEvent[];
}
