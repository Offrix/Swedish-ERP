export type InvoiceDeliveryChannel = "pdf_email" | "peppol";
export type InvoiceDeliveryStatus = "prepared" | "delivered";
export type PaymentLinkStatus = "active" | "consumed" | "expired" | "cancelled";

export interface PreparedInvoiceDelivery {
  readonly deliveryId: string;
  readonly companyId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly channel: InvoiceDeliveryChannel;
  readonly documentType: "invoice" | "credit_note";
  readonly payloadType: string;
  readonly payloadVersion: string;
  readonly payloadHash: string;
  readonly status: InvoiceDeliveryStatus;
  readonly recipient: string;
  readonly buyerReference: string | null;
  readonly purchaseOrderReference: string | null;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
}

export interface PreparedPaymentLink {
  readonly paymentLinkId: string;
  readonly companyId: string;
  readonly invoiceId: string;
  readonly providerCode: string;
  readonly status: PaymentLinkStatus;
  readonly amount: number;
  readonly currencyCode: string;
  readonly url: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}
