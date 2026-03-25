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

export type PublicApiMode = "sandbox" | "production";
export type PublicApiClientStatus = "active" | "revoked";
export type PublicApiScopeCode =
  | "api_spec.read"
  | "reporting.read"
  | "submission.read"
  | "legal_form.read"
  | "annual_reporting.read"
  | "tax_account.read"
  | "webhook.manage"
  | "partner.read"
  | "automation.read";
export type WebhookDeliveryStatus = "queued" | "running" | "sent" | "failed" | "rate_limited" | "suppressed" | "disabled";
export type PartnerConnectionType = "bank" | "peppol" | "pension" | "crm" | "commerce" | "id06";
export type PartnerConnectionStatus = "active" | "degraded" | "outage" | "disabled";
export type PartnerFallbackMode = "queue_retry" | "manual_review" | "disabled";
export type PartnerOperationStatus = "queued" | "running" | "succeeded" | "failed" | "fallback" | "rate_limited" | "retry_scheduled";
export type AsyncJobStatus = "queued" | "claimed" | "running" | "succeeded" | "failed" | "retry_scheduled" | "dead_lettered" | "replay_planned" | "replayed";
export type AsyncJobRiskClass = "normal" | "high_risk" | "restricted";
export type AsyncJobErrorClass = "transient_technical" | "persistent_technical" | "business_input" | "downstream_unknown";

export interface PublicApiClient {
  readonly clientId: string;
  readonly companyId: string;
  readonly displayName: string;
  readonly mode: PublicApiMode;
  readonly scopes: readonly PublicApiScopeCode[];
  readonly status: PublicApiClientStatus;
}

export interface WebhookSubscription {
  readonly subscriptionId: string;
  readonly companyId: string;
  readonly clientId: string;
  readonly mode: PublicApiMode;
  readonly eventTypes: readonly string[];
  readonly targetUrl: string;
  readonly status: string;
}

export interface PartnerConnection {
  readonly connectionId: string;
  readonly companyId: string;
  readonly connectionType: PartnerConnectionType;
  readonly partnerCode: string;
  readonly status: PartnerConnectionStatus;
  readonly fallbackMode: PartnerFallbackMode;
}

export interface PartnerOperation {
  readonly operationId: string;
  readonly companyId: string;
  readonly connectionId: string;
  readonly connectionType: PartnerConnectionType;
  readonly operationCode: string;
  readonly status: PartnerOperationStatus;
}

export interface AsyncJobRef {
  readonly jobId: string;
  readonly companyId: string;
  readonly jobType: string;
  readonly status: AsyncJobStatus;
  readonly riskClass: AsyncJobRiskClass;
  readonly lastErrorClass: AsyncJobErrorClass | null;
}
