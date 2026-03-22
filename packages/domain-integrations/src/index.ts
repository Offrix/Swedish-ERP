export type InvoiceDeliveryChannel = "pdf_email" | "peppol";
export type InvoiceDeliveryStatus = "prepared" | "delivered";
export type PaymentLinkStatus = "active" | "consumed" | "expired" | "cancelled";
export type SubmissionStatus = "ready" | "signed" | "submitted" | "received" | "accepted" | "transport_failed" | "retry_pending" | "domain_rejected" | "finalized" | "superseded";
export type SubmissionSignedState = "pending" | "signed" | "not_required";
export type SubmissionReceiptType = "technical_ack" | "business_ack" | "final_ack" | "technical_nack" | "business_nack";
export type SubmissionRetryClass = "automatic" | "manual_only" | "forbidden";
export type SubmissionActionType = "retry" | "collect_more_data" | "correct_payload" | "contact_provider" | "close_as_duplicate";
export type SubmissionActionStatus = "open" | "claimed" | "waiting_input" | "resolved" | "closed" | "auto_resolved";

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

export interface AuthoritySubmissionRef {
  readonly submissionId: string;
  readonly companyId: string;
  readonly submissionType: string;
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  readonly status: SubmissionStatus;
  readonly signedState: SubmissionSignedState;
  readonly retryClass: SubmissionRetryClass;
}
