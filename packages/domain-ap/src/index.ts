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
  readonly supplierImportBatches: readonly ApSupplierImportBatch[];
  readonly purchaseOrderImportBatches: readonly ApPurchaseOrderImportBatch[];
  readonly auditEvents: readonly ApAuditEvent[];
}
