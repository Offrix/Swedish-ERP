export type FieldWorkOrderStatus =
  | "draft"
  | "ready_for_dispatch"
  | "dispatched"
  | "in_progress"
  | "completed"
  | "invoiced"
  | "cancelled";

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

export interface FieldWorkOrderRef {
  readonly workOrderId: string;
  readonly companyId: string;
  readonly workOrderNo: string;
  readonly projectId: string;
  readonly customerId: string | null;
  readonly displayName: string;
  readonly status: FieldWorkOrderStatus;
  readonly signatureStatus: "pending" | "captured" | "voided";
  readonly customerInvoiceId: string | null;
  readonly versionNo: number;
}

export interface FieldSyncEnvelopeRef {
  readonly fieldSyncEnvelopeId: string;
  readonly companyId: string;
  readonly clientMutationId: string;
  readonly objectType: string;
  readonly mutationType: string;
  readonly syncStatus: "pending" | "synced" | "conflicted" | "failed_terminal";
  readonly serverObjectId: string | null;
}
