export type FieldWorkOrderStatus =
  | "draft"
  | "ready_for_dispatch"
  | "dispatched"
  | "in_progress"
  | "completed"
  | "invoiced"
  | "cancelled";

export type FieldMaterialReservationStatus = "active" | "released" | "fulfilled" | "cancelled";
export type FieldConflictRecordStatus = "open" | "resolved" | "dismissed";

export interface InventoryLocationRef {
  readonly inventoryLocationId: string;
  readonly companyId: string;
  readonly locationCode: string;
  readonly displayName: string;
  readonly locationType: "warehouse" | "truck" | "site";
  readonly projectId: string | null;
}

export interface InventoryItemRef {
  readonly inventoryItemId: string;
  readonly companyId: string;
  readonly itemCode: string;
  readonly displayName: string;
  readonly unitCode: string;
  readonly arItemId: string | null;
  readonly salesUnitPriceAmount: number;
  readonly onHandQuantity: number;
}

export interface OperationalCaseRef {
  readonly operationalCaseId: string;
  readonly companyId: string;
  readonly operationalCaseNo: string;
  readonly projectId: string;
  readonly customerId: string | null;
  readonly displayName: string;
  readonly caseTypeCode: string;
  readonly packCodes: readonly string[];
  readonly status: FieldWorkOrderStatus;
  readonly invoiceReadyBlocked: boolean;
  readonly openConflictCount: number;
  readonly versionNo: number;
}

export interface FieldWorkOrderRef {
  readonly workOrderId: string;
  readonly operationalCaseId: string;
  readonly companyId: string;
  readonly workOrderNo: string;
  readonly operationalCaseNo: string;
  readonly projectId: string;
  readonly customerId: string | null;
  readonly displayName: string;
  readonly packCodes: readonly string[];
  readonly status: FieldWorkOrderStatus;
  readonly signatureStatus: "pending" | "captured" | "voided";
  readonly customerInvoiceId: string | null;
  readonly versionNo: number;
}

export interface MaterialReservationRef {
  readonly materialReservationId: string;
  readonly operationalCaseId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly inventoryItemId: string;
  readonly inventoryLocationId: string;
  readonly quantity: number;
  readonly remainingQuantity: number;
  readonly status: FieldMaterialReservationStatus;
}

export interface MaterialUsageRef {
  readonly materialUsageId: string;
  readonly workOrderId: string;
  readonly operationalCaseId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly inventoryItemId: string;
  readonly inventoryLocationId: string;
  readonly quantity: number;
  readonly status: string;
}

export interface SignatureRecordRef {
  readonly signatureRecordId: string;
  readonly operationalCaseId: string;
  readonly workOrderId: string;
  readonly companyId: string;
  readonly signerName: string;
  readonly signedAt: string;
  readonly status: "pending" | "captured" | "voided";
}

export interface FieldSyncEnvelopeRef {
  readonly fieldSyncEnvelopeId: string;
  readonly companyId: string;
  readonly clientMutationId: string;
  readonly objectType: string;
  readonly mutationType: string;
  readonly syncStatus: "pending" | "synced" | "conflicted" | "failed_terminal";
  readonly serverObjectId: string | null;
  readonly conflictRecordId: string | null;
}

export interface FieldEvidenceRef {
  readonly fieldEvidenceId: string;
  readonly companyId: string;
  readonly operationalCaseId: string | null;
  readonly projectId: string | null;
  readonly evidenceTypeCode: string;
  readonly linkedObjectType: string;
  readonly linkedObjectId: string;
}

export interface ConflictRecordRef {
  readonly conflictRecordId: string;
  readonly companyId: string;
  readonly operationalCaseId: string | null;
  readonly projectId: string | null;
  readonly syncEnvelopeId: string | null;
  readonly conflictTypeCode: string;
  readonly objectType: string;
  readonly mutationType: string;
  readonly lastErrorCode: string | null;
  readonly status: FieldConflictRecordStatus;
}
