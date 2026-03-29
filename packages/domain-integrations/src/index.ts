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
  readonly providerCode?: string;
  readonly providerBaselineId?: string;
  readonly providerBaselineCode?: string;
  readonly providerBaselineVersion?: string;
  readonly providerBaselineChecksum?: string;
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
  readonly providerBaselineId: string;
  readonly providerBaselineCode: string;
  readonly providerBaselineVersion: string;
  readonly providerBaselineChecksum: string;
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
export type IntegrationSurfaceCode =
  | "partner"
  | "document_ai"
  | "payment_link"
  | "notification_email"
  | "notification_sms"
  | "spend"
  | "regulated_transport";
export type IntegrationEnvironmentMode = "trial" | "sandbox" | "test" | "pilot_parallel" | "production";
export type CredentialKind = "api_credentials" | "client_secret" | "certificate_ref" | "file_channel_credentials";
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
export type WebhookDeliveryStatus = "queued" | "running" | "sent" | "failed" | "rate_limited" | "suppressed" | "disabled" | "dead_lettered";
export type PartnerConnectionType = "bank" | "peppol" | "pension" | "crm" | "commerce" | "id06";
export type PartnerConnectionStatus = "active" | "degraded" | "outage" | "disabled";
export type PartnerFallbackMode = "queue_retry" | "manual_review" | "disabled";
export type PartnerOperationStatus = "queued" | "running" | "succeeded" | "failed" | "fallback" | "rate_limited" | "retry_scheduled";
export type AsyncJobStatus = "queued" | "claimed" | "running" | "succeeded" | "failed" | "retry_scheduled" | "dead_lettered" | "replay_planned" | "replayed";
export type AsyncJobRiskClass = "normal" | "high_risk" | "restricted";
export type AsyncJobErrorClass = "transient_technical" | "persistent_technical" | "business_input" | "downstream_unknown";

export interface IntegrationModeMatrix {
  readonly trial_safe: boolean;
  readonly sandbox_supported: boolean;
  readonly test_supported: boolean;
  readonly production_supported: boolean;
  readonly supportsLegalEffect: boolean;
}

export interface IntegrationConnection {
  readonly connectionId: string;
  readonly companyId: string;
  readonly surfaceCode: IntegrationSurfaceCode;
  readonly connectionType: string;
  readonly providerCode: string;
  readonly displayName: string;
  readonly environmentMode: IntegrationEnvironmentMode;
  readonly providerEnvironmentRef: string;
  readonly supportsLegalEffect: boolean;
  readonly sandboxSupported: boolean;
  readonly trialSafe: boolean;
  readonly modeMatrix: IntegrationModeMatrix;
  readonly fallbackMode: PartnerFallbackMode;
  readonly rateLimitPerMinute: number;
  readonly requiredCredentialKinds: readonly CredentialKind[];
  readonly consentRequired: boolean;
  readonly capabilityManifestId: string;
  readonly credentialsConfigured: boolean;
  readonly credentialMetadataCount: number;
  readonly consentGrantCount: number;
  readonly consentsAuthorized: boolean;
  readonly healthStatus: string;
}

export interface CredentialSetMetadata {
  readonly credentialSetId: string;
  readonly companyId: string;
  readonly connectionId: string;
  readonly providerCode: string;
  readonly environmentMode: IntegrationEnvironmentMode;
  readonly credentialKind: CredentialKind;
  readonly credentialRefFingerprint: string;
  readonly credentialRefPreview: string | null;
  readonly secretManagerRefFingerprint: string;
  readonly secretManagerRefPreview: string | null;
  readonly callbackDomain: string | null;
  readonly callbackPath: string | null;
  readonly expiresAt: string | null;
  readonly status: "active" | "superseded";
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ConsentGrant {
  readonly consentGrantId: string;
  readonly companyId: string;
  readonly connectionId: string;
  readonly providerCode: string;
  readonly environmentMode: IntegrationEnvironmentMode;
  readonly grantType: string;
  readonly scopeSet: readonly string[];
  readonly externalConsentRef: string | null;
  readonly status: "authorized" | "revoked";
  readonly authorizedByActorId: string;
  readonly authorizedAt: string;
  readonly expiresAt: string | null;
  readonly revokedAt: string | null;
}

export interface IntegrationHealthCheck {
  readonly integrationHealthCheckId: string;
  readonly companyId: string;
  readonly connectionId: string;
  readonly providerCode: string;
  readonly environmentMode: IntegrationEnvironmentMode;
  readonly checkSetCode: string;
  readonly actorId: string;
  readonly delegatedPartnerHealthCheckId: string | null;
  readonly status: "healthy" | "degraded" | "outage";
  readonly executedAt: string;
}

export interface PublicApiClient {
  readonly clientId: string;
  readonly companyId: string;
  readonly displayName: string;
  readonly mode: PublicApiMode;
  readonly scopes: readonly PublicApiScopeCode[];
  readonly specVersion: string;
  readonly supportedGrantTypes: readonly string[];
  readonly tokenEndpoint: string;
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
  readonly providerCode: string;
  readonly partnerCode: string;
  readonly mode: "sandbox" | "test" | "production";
  readonly status: PartnerConnectionStatus;
  readonly healthStatus: "unknown" | "healthy" | "degraded" | "outage";
  readonly fallbackMode: PartnerFallbackMode;
  readonly credentialsConfigured?: boolean;
  readonly credentialsPresent?: boolean;
  readonly latestReceiptAt?: string | null;
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
  readonly connectionId: string | null;
  readonly connectionType: PartnerConnectionType | null;
  readonly providerCode: string | null;
  readonly sourceSurfaceCode: string | null;
  readonly lastErrorClass: AsyncJobErrorClass | null;
}

export interface PartnerContractTestPack {
  readonly testPackCode: string;
  readonly connectionType: PartnerConnectionType;
  readonly providerCode: string;
  readonly supportedModes: readonly string[];
  readonly assertions: readonly string[];
  readonly requiredEvents: readonly string[];
  readonly replaySafe: boolean;
  readonly operationCodes: readonly string[];
  readonly defaultRateLimitPerMinute: number;
  readonly providerBaselineCode: string | null;
}

export interface PartnerHealthCheck {
  readonly healthCheckId: string;
  readonly companyId: string;
  readonly connectionId: string;
  readonly providerCode: string;
  readonly checkSetCode: string;
  readonly actorId: string;
  readonly status: "healthy" | "degraded" | "outage";
  readonly results: readonly {
    readonly checkCode: string;
    readonly status: "passed" | "warning" | "failed";
    readonly summary: string;
    readonly observedAt: string;
  }[];
  readonly executedAt: string;
}

export interface PartnerHealthSummary {
  readonly connectionId: string;
  readonly companyId: string;
  readonly connectionType: PartnerConnectionType;
  readonly providerCode: string;
  readonly mode: "sandbox" | "test" | "production";
  readonly connectionStatus: PartnerConnectionStatus;
  readonly healthStatus: "unknown" | "healthy" | "degraded" | "outage";
  readonly latestHealthCheck: PartnerHealthCheck | null;
  readonly lastContractResultStatus: "passed" | "failed" | null;
  readonly contractTestGreen: boolean;
  readonly lastSuccessfulOperationAt: string | null;
  readonly lastFailureOperationAt: string | null;
  readonly latestReceiptAt: string | null;
  readonly deadLetterCount: number;
  readonly replayPlannedCount: number;
  readonly retryScheduledCount: number;
  readonly fallbackOperationCount: number;
  readonly rateLimitedOperationCount: number;
}

export interface AsyncDeadLetterRef {
  readonly deadLetterId: string;
  readonly jobId: string;
  readonly companyId: string;
  readonly enteredAt: string;
  readonly terminalReason: AsyncJobErrorClass;
  readonly operatorState: string;
  readonly replayAllowed: boolean;
  readonly riskClass: AsyncJobRiskClass;
  readonly job: {
    readonly jobId: string;
    readonly jobType: string;
    readonly status: AsyncJobStatus;
    readonly connectionId: string | null;
    readonly connectionType: PartnerConnectionType | null;
    readonly providerCode: string | null;
    readonly sourceSurfaceCode: string | null;
    readonly updatedAt: string;
  } | null;
}
