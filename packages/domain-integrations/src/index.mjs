import crypto from "node:crypto";
import { createIntegrationControlPlane } from "./control-plane.mjs";
import { createPartnerModule } from "./partners.mjs";
import { createPublicApiModule } from "./public-api.mjs";
import { createBolagsverketAnnualProvider, BOLAGSVERKET_ANNUAL_PROVIDER_CODE } from "./providers/bolagsverket-annual.mjs";
import { createEnableBankingProvider, ENABLE_BANKING_PROVIDER_CODE } from "./providers/enable-banking.mjs";
import { createGoogleDocumentAiProvider, GOOGLE_DOCUMENT_AI_PROVIDER_CODE } from "./providers/google-document-ai.mjs";
import {
  createHubSpotCrmProvider,
  HUBSPOT_CRM_PROVIDER_BASELINE_CODE,
  HUBSPOT_CRM_PROVIDER_CODE
} from "./providers/hubspot-crm.mjs";
import { createIso20022FilesProvider, ISO20022_FILES_PROVIDER_CODE } from "./providers/iso20022-files.mjs";
import { createLocalPasskeyProvider, LOCAL_PASSKEY_PROVIDER_CODE } from "./providers/local-passkey.mjs";
import { createLocalTotpProvider, LOCAL_TOTP_PROVIDER_CODE } from "./providers/local-totp.mjs";
import { createPageroPeppolProvider, PAGERO_PEPPOL_PROVIDER_CODE } from "./providers/pagero-peppol.mjs";
import { createPleoSpendProvider, PLEO_SPEND_PROVIDER_CODE } from "./providers/pleo-spend.mjs";
import { createPostmarkEmailProvider, POSTMARK_EMAIL_PROVIDER_CODE } from "./providers/postmark-email.mjs";
import { createSignicatBankIdProvider } from "./providers/signicat-bankid.mjs";
import {
  createSignicatSigningArchiveProvider,
  SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE
} from "./providers/signicat-signing-archive.mjs";
import { createSkatteverketAgiProvider, SKATTEVERKET_AGI_PROVIDER_CODE } from "./providers/skatteverket-agi.mjs";
import { createSkatteverketHusProvider, SKATTEVERKET_HUS_PROVIDER_CODE } from "./providers/skatteverket-hus.mjs";
import { createSkatteverketVatProvider, SKATTEVERKET_VAT_PROVIDER_CODE } from "./providers/skatteverket-vat.mjs";
import { createStripePaymentLinksProvider, STRIPE_PAYMENT_LINKS_PROVIDER_CODE } from "./providers/stripe-payment-links.mjs";
import { createTwilioSmsProvider, TWILIO_SMS_PROVIDER_CODE } from "./providers/twilio-sms.mjs";
import {
  createWorkOsFederationProvider,
  WORKOS_FEDERATION_PROVIDER_CODE
} from "./providers/workos-federation.mjs";
import { createProviderBaselineRegistry } from "../../rule-engine/src/index.mjs";
import { createRegulatedSubmissionsModule } from "../../domain-regulated-submissions/src/index.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const INVOICE_DELIVERY_CHANNELS = Object.freeze(["pdf_email", "peppol"]);
export const PAYMENT_LINK_STATUSES = Object.freeze(["active", "consumed", "expired", "cancelled"]);
export { GOOGLE_DOCUMENT_AI_PROVIDER_CODE } from "./providers/google-document-ai.mjs";
export { STRIPE_PAYMENT_LINKS_PROVIDER_CODE } from "./providers/stripe-payment-links.mjs";
export { POSTMARK_EMAIL_PROVIDER_CODE } from "./providers/postmark-email.mjs";
export { TWILIO_SMS_PROVIDER_CODE } from "./providers/twilio-sms.mjs";
export { PLEO_SPEND_PROVIDER_CODE } from "./providers/pleo-spend.mjs";
export { SKATTEVERKET_AGI_PROVIDER_CODE } from "./providers/skatteverket-agi.mjs";
export { SKATTEVERKET_VAT_PROVIDER_CODE } from "./providers/skatteverket-vat.mjs";
export { SKATTEVERKET_HUS_PROVIDER_CODE } from "./providers/skatteverket-hus.mjs";
export { BOLAGSVERKET_ANNUAL_PROVIDER_CODE } from "./providers/bolagsverket-annual.mjs";
export { LOCAL_PASSKEY_PROVIDER_CODE } from "./providers/local-passkey.mjs";
export { LOCAL_TOTP_PROVIDER_CODE } from "./providers/local-totp.mjs";
export { WORKOS_FEDERATION_PROVIDER_CODE } from "./providers/workos-federation.mjs";
export { SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE } from "./providers/signicat-signing-archive.mjs";
export { HUBSPOT_CRM_PROVIDER_CODE } from "./providers/hubspot-crm.mjs";
export const INTEGRATION_PROVIDER_BASELINES = Object.freeze([
  Object.freeze({
    providerBaselineId: "peppol-bis-billing-3-se-2026.1",
    baselineCode: "SE-PEPPOL-BIS-BILLING-3",
    providerCode: "pagero_online",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "peppol_bis_billing_3",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "3.0",
    checksum: "peppol-bis-billing-3-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Peppol BIS Billing 3 baseline for outbound invoice and credit-note envelopes."
  }),
  Object.freeze({
    providerBaselineId: "payment-link-api-se-2026.1",
    baselineCode: "SE-PAYMENT-LINK-API",
    providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "payment_link_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "payment-link-api-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Stripe payment-link baseline for governed hosted checkout and callback reconciliation."
  }),
  Object.freeze({
    providerBaselineId: "open-banking-core-se-2026.1",
    baselineCode: "SE-OPEN-BANKING-CORE",
    providerCode: "enable_banking",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "open_banking_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "open-banking-core-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Open-banking adapter baseline for statement sync, payment export and tax-account sync."
  }),
  Object.freeze({
    providerBaselineId: "bank-file-format-se-2026.1",
    baselineCode: "SE-BANK-FILE-FORMAT",
    providerCode: "bank_file_channel",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "bank_file_format",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "bank-file-format-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Bank file channel baseline for deterministic export/import file envelopes."
  }),
  Object.freeze({
    providerBaselineId: "postmark-email-api-se-2026.1",
    baselineCode: "SE-POSTMARK-EMAIL-API",
    providerCode: POSTMARK_EMAIL_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "transactional_email_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "postmark-email-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Postmark transactional email baseline for invoice and operational mail delivery."
  }),
  Object.freeze({
    providerBaselineId: "twilio-sms-api-se-2026.1",
    baselineCode: "SE-TWILIO-SMS-API",
    providerCode: TWILIO_SMS_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "transactional_sms_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "twilio-sms-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Twilio SMS baseline for operational and customer messaging."
  }),
  Object.freeze({
    providerBaselineId: "pleo-spend-api-se-2026.1",
    baselineCode: "SE-PLEO-SPEND-API",
    providerCode: PLEO_SPEND_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "spend_management_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "pleo-spend-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Pleo spend baseline for expense, receipt and card transaction synchronization."
  }),
  Object.freeze({
    providerBaselineId: "google-document-ai-ocr-se-2026.1",
    baselineCode: "SE-GOOGLE-DOCUMENT-AI-OCR",
    providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "document_ai_ocr",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "pretrained-ocr-v2.1-2024-08-07",
    checksum: "google-document-ai-ocr-se-2026.1",
    sourceSnapshotDate: "2026-03-28",
    semanticChangeSummary: "Google Document AI Enterprise OCR baseline for generic document OCR and quality scoring."
  }),
  Object.freeze({
    providerBaselineId: "google-document-ai-invoice-se-2026.1",
    baselineCode: "SE-GOOGLE-DOCUMENT-AI-INVOICE",
    providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "document_ai_invoice",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "pretrained-invoice-v2.0-2023-12-06",
    checksum: "google-document-ai-invoice-se-2026.1",
    sourceSnapshotDate: "2026-03-28",
    semanticChangeSummary: "Google Document AI Invoice Parser baseline for supplier-invoice OCR and entity extraction."
  }),
  Object.freeze({
    providerBaselineId: "skatteverket-agi-api-se-2026.1",
    baselineCode: "SE-SKATTEVERKET-AGI-API",
    providerCode: SKATTEVERKET_AGI_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "authority_transport_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "skatteverket-agi-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Skatteverket AGI transport baseline for official dispatch and receipt collection."
  }),
  Object.freeze({
    providerBaselineId: "skatteverket-vat-api-se-2026.1",
    baselineCode: "SE-SKATTEVERKET-VAT-API",
    providerCode: SKATTEVERKET_VAT_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "authority_transport_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "skatteverket-vat-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Skatteverket VAT transport baseline for official dispatch and XML fallback governance."
  }),
  Object.freeze({
    providerBaselineId: "skatteverket-hus-api-se-2026.1",
    baselineCode: "SE-SKATTEVERKET-HUS-API",
    providerCode: SKATTEVERKET_HUS_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "authority_transport_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "skatteverket-hus-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Skatteverket HUS transport baseline for official API and signed XML fallback."
  }),
  Object.freeze({
    providerBaselineId: "bolagsverket-annual-api-se-2026.1",
    baselineCode: "SE-BOLAGSVERKET-ANNUAL-API",
    providerCode: BOLAGSVERKET_ANNUAL_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "authority_transport_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "bolagsverket-annual-api-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Bolagsverket annual filing baseline for official annual report transport and fallback."
  }),
  Object.freeze({
    providerBaselineId: "id06-api-se-2026.1",
    baselineCode: "SE-ID06-API",
    providerCode: "official_id06_integration",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "id06_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "id06-api-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "ID06 provider adapter baseline for official workforce and site synchronization."
  }),
  Object.freeze({
    providerBaselineId: "signicat-bankid-broker-se-2026.1",
    baselineCode: "SE-SIGNICAT-BANKID-BROKER",
    providerCode: "signicat-bankid",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "auth_broker_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "signicat-bankid-broker-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Signicat BankID broker baseline for challenge start/collect and callback governance."
  }),
  Object.freeze({
    providerBaselineId: "workos-federation-broker-se-2026.1",
    baselineCode: "SE-WORKOS-FEDERATION-BROKER",
    providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "enterprise_federation_broker",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "workos-federation-broker-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "WorkOS broker baseline for enterprise SAML/OIDC federation authorization and callback handling."
  }),
  Object.freeze({
    providerBaselineId: "passkey-webauthn-se-2026.1",
    baselineCode: "SE-PASSKEY-WEBAUTHN",
    providerCode: LOCAL_PASSKEY_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "webauthn_passkey",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "passkey-webauthn-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Local passkey baseline for resident-key registration and assertion verification."
  }),
  Object.freeze({
    providerBaselineId: "totp-rfc6238-se-2026.1",
    baselineCode: "SE-TOTP-RFC6238",
    providerCode: LOCAL_TOTP_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "totp_rfc6238",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "totp-rfc6238-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Local TOTP baseline for enrollment and verification under RFC 6238."
  }),
  Object.freeze({
    providerBaselineId: "signicat-signing-archive-se-2026.1",
    baselineCode: "SE-SIGNICAT-SIGNING-ARCHIVE",
    providerCode: SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "signing_evidence_archive",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "signicat-signing-archive-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "Signicat signing archive baseline for signature evidence references and immutable archive checksums."
  }),
  Object.freeze({
    providerBaselineId: "hubspot-crm-objects-se-2026.1",
    baselineCode: HUBSPOT_CRM_PROVIDER_BASELINE_CODE,
    providerCode: HUBSPOT_CRM_PROVIDER_CODE,
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "crm_handoff_objects",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "v3-objects",
    checksum: "hubspot-crm-objects-se-2026.1",
    sourceSnapshotDate: "2026-03-29",
    semanticChangeSummary: "HubSpot CRM objects baseline for governed deal and custom-object handoff into project import batches."
  })
]);

export function createIntegrationPlatform(options = {}) {
  return createIntegrationEngine(options);
}

export function createIntegrationEngine({
  clock = () => new Date(),
  environmentMode = "test",
  paymentBaseUrl = "https://payments.local",
  webhookDeliveryExecutor = undefined,
  partnerContractTestExecutors = undefined,
  partnerOperationExecutors = undefined,
  evidencePlatform = null,
  getCorePlatform = null,
  providerBaselineRegistry = null
} = {}) {
  const providerBaselines =
    providerBaselineRegistry || createProviderBaselineRegistry({ clock, seedProviderBaselines: INTEGRATION_PROVIDER_BASELINES });
  const enableBankingProvider = createEnableBankingProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const bankFileProvider = createIso20022FilesProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const paymentLinkProvider = createStripePaymentLinksProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines,
    checkoutBaseUrl: paymentBaseUrl
  });
  const peppolProvider = createPageroPeppolProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const emailProvider = createPostmarkEmailProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const smsProvider = createTwilioSmsProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const spendProvider = createPleoSpendProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const documentOcrProvider = createGoogleDocumentAiProvider({
    clock,
    environmentMode,
    providerEnvironmentRef: environmentMode === "production" ? "production" : "sandbox",
    providerBaselineRegistry: providerBaselines
  });
  const agiTransportProvider = createSkatteverketAgiProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const vatTransportProvider = createSkatteverketVatProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const husTransportProvider = createSkatteverketHusProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const annualTransportProvider = createBolagsverketAnnualProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const signicatBankIdProvider = createSignicatBankIdProvider({
    clock,
    environmentMode,
    providerMode: environmentMode === "production" ? "production" : "sandbox",
    providerBaselineRegistry: providerBaselines
  });
  const workOsFederationProvider = createWorkOsFederationProvider({
    clock,
    environmentMode,
    providerMode: environmentMode === "production" ? "production" : "sandbox",
    providerBaselineRegistry: providerBaselines
  });
  const localPasskeyProvider = createLocalPasskeyProvider({
    environmentMode
  });
  const localTotpProvider = createLocalTotpProvider({
    environmentMode
  });
  const signingEvidenceArchiveProvider = createSignicatSigningArchiveProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const hubSpotCrmProvider = createHubSpotCrmProvider({
    clock,
    environmentMode,
    providerBaselineRegistry: providerBaselines
  });
  const state = {
    submissions: new Map(),
    submissionIdsByCompany: new Map(),
    submissionIdsByReuseKey: new Map(),
    submissionAttempts: new Map(),
    submissionAttemptIdsBySubmission: new Map(),
    receipts: new Map(),
    receiptIdsBySubmission: new Map(),
    submissionRecoveries: new Map(),
    submissionRecoveryIdsBySubmission: new Map(),
    correctionLinks: new Map(),
    correctionLinkIdsByOriginalSubmission: new Map(),
    correctionLinkIdsByCorrectingSubmission: new Map(),
    submissionEvidencePacks: new Map(),
    queueItems: new Map(),
    queueItemIdsByCompany: new Map(),
    queueItemIdsBySubmission: new Map(),
    publicApiCompatibilityBaselines: new Map(),
    publicApiClients: new Map(),
    publicApiTokens: new Map(),
    webhookSubscriptions: new Map(),
    webhookEvents: new Map(),
    webhookDeliveries: new Map(),
    partnerConnections: new Map(),
    partnerHealthChecks: new Map(),
    partnerContractResults: new Map(),
    partnerOperations: new Map(),
    partnerRateLimitCounters: new Map(),
    asyncJobs: new Map(),
    asyncDeadLetters: new Map()
  };
  const publicApiModule = createPublicApiModule({
    state,
    clock,
    deliveryExecutor: webhookDeliveryExecutor
  });
  const partnerModule = createPartnerModule({
    state,
    clock,
    contractTestExecutors: partnerContractTestExecutors,
    operationExecutors: partnerOperationExecutors,
    providerBaselineRegistry: providerBaselines
  });
  const integrationControlPlane = createIntegrationControlPlane({
    state,
    clock,
    environmentMode,
    getPartnerModule: () => partnerModule,
    getAdapterProviders: () => [
      documentOcrProvider,
      paymentLinkProvider,
      emailProvider,
      smsProvider,
      spendProvider,
      agiTransportProvider,
      vatTransportProvider,
      husTransportProvider,
      annualTransportProvider,
      signicatBankIdProvider,
      workOsFederationProvider,
      localPasskeyProvider,
      localTotpProvider,
      signingEvidenceArchiveProvider,
      hubSpotCrmProvider
    ]
  });
  const regulatedSubmissionsModule = createRegulatedSubmissionsModule({
    state,
    clock,
    evidencePlatform,
    getCorePlatform,
    signingArchiveProvider: signingEvidenceArchiveProvider
  });
  const createPartnerConnection = (input = {}) => {
    const connection = partnerModule.createPartnerConnection(input);
    const registeredConnection = integrationControlPlane.registerPartnerConnection({
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      actorId: input.actorId || "system"
    });
    if (typeof input.credentialsRef === "string" && input.credentialsRef.trim().length > 0) {
      const existingCredentialMetadata = integrationControlPlane.listCredentialSetMetadata({
        companyId: connection.companyId,
        connectionId: connection.connectionId
      });
      if (existingCredentialMetadata.length === 0) {
        const [manifest] = integrationControlPlane.listAdapterCapabilityManifests({
          surfaceCode: "partner",
          connectionType: connection.connectionType,
          providerCode: connection.providerCode
        });
        const credentialKind =
          manifest?.requiredCredentialKinds?.find((kind) => integrationControlPlane.credentialKinds.includes(kind))
          || "api_credentials";
        integrationControlPlane.recordCredentialSetMetadata({
          companyId: connection.companyId,
          connectionId: connection.connectionId,
          credentialRef: input.credentialsRef,
          credentialKind,
          secretManagerRef: input.secretManagerRef || input.credentialsRef,
          callbackDomain: input.config?.callbackDomain || null,
          callbackPath: input.config?.callbackPath || null,
          expiresAt: input.config?.credentialsExpiresAt || null,
          actorId: input.actorId || "system"
        });
      }
    }
    if (registeredConnection.consentRequired && input.config?.consentExpiresAt) {
      const existingConsents = integrationControlPlane.listConsentGrants({
        companyId: connection.companyId,
        connectionId: connection.connectionId
      });
      if (existingConsents.length === 0) {
        integrationControlPlane.authorizeConsent({
          companyId: connection.companyId,
          connectionId: connection.connectionId,
          scopeSet: ["legacy_partner_consent"],
          grantType: "legacy_partner_backfill",
          expiresAt: input.config.consentExpiresAt,
          actorId: input.actorId || "system"
        });
      }
    }
    return connection;
  };

  return {
    ...publicApiModule,
    ...partnerModule,
    ...integrationControlPlane,
    ...regulatedSubmissionsModule,
    createPartnerConnection,
    deliveryChannels: INVOICE_DELIVERY_CHANNELS,
    paymentLinkStatuses: PAYMENT_LINK_STATUSES,
    getDocumentOcrCapabilityManifest: () => documentOcrProvider.getCapabilityManifest(),
    startDocumentOcrExtraction: (input) => documentOcrProvider.startExtraction(input),
    collectDocumentOcrOperation: (input) => documentOcrProvider.collectOperation(input),
    providerBaselineRegistry: providerBaselines,
    listProviderBaselines: (filters) => providerBaselines.listProviderBaselines(filters),
    resolveProviderBaseline: (filters) => providerBaselines.resolveProviderBaseline(filters),
    snapshotProviderBaselineRegistry: () => providerBaselines.snapshotProviderBaselineRegistry(),
    prepareBankStatementSync: (input) => enableBankingProvider.prepareStatementSync(input),
    prepareBankPaymentExport: (input) => enableBankingProvider.preparePaymentExport(input),
    prepareTaxAccountSync: (input) => enableBankingProvider.prepareTaxAccountSync(input),
    prepareBankFileExchange: (input) => bankFileProvider.prepareFileExchange(input),
    prepareInvoiceDelivery,
    createPaymentLink,
    prepareEmailNotification: (input) => emailProvider.prepareEmailDelivery(input),
    prepareSmsNotification: (input) => smsProvider.prepareSmsDelivery(input),
    prepareSpendSync: (input) => spendProvider.prepareSpendSync(input),
    prepareOfficialSubmissionTransport,
    archiveSigningEvidence: (input) => signingEvidenceArchiveProvider.archiveSignedEvidence(input),
    listSigningEvidenceArchives: (input) => signingEvidenceArchiveProvider.listArchiveRecords(input),
    prepareProjectImportBatchFromAdapter,
    snapshotIntegrations() {
      return clone({
        submissions: [...state.submissions.values()].map((submission) =>
          regulatedSubmissionsModule.getAuthoritySubmission({
            companyId: submission.companyId,
            submissionId: submission.submissionId
          })
        ),
        submissionAttempts: [...state.submissionAttempts.values()],
        receipts: [...state.receipts.values()],
        submissionRecoveries: [...state.submissionRecoveries.values()],
        correctionLinks: [...state.correctionLinks.values()],
        submissionEvidencePacks: [...state.submissionEvidencePacks.values()],
        actionQueueItems: [...state.queueItems.values()],
        publicApiCompatibilityBaselines: [...state.publicApiCompatibilityBaselines.values()],
        publicApiClients: [...state.publicApiClients.values()],
        publicApiTokens: [...state.publicApiTokens.values()],
        webhookSubscriptions: [...state.webhookSubscriptions.values()],
          webhookEvents: [...state.webhookEvents.values()],
          webhookDeliveries: [...state.webhookDeliveries.values()],
          integrationConnections: [...state.integrationConnections.values()],
          credentialSetMetadata: [...state.credentialSetMetadata.values()],
          consentGrants: [...state.consentGrants.values()],
          integrationHealthChecks: [...state.integrationHealthChecks.values()],
          partnerConnections: [...state.partnerConnections.values()],
          partnerHealthChecks: [...state.partnerHealthChecks.values()],
        partnerContractResults: [...state.partnerContractResults.values()],
        partnerOperations: [...state.partnerOperations.values()],
        asyncJobs: [...state.asyncJobs.values()],
        asyncDeadLetters: [...state.asyncDeadLetters.values()],
        providerBaselines: providerBaselines.snapshotProviderBaselineRegistry(),
        providerSnapshots: {
          documentOcrProvider: documentOcrProvider.snapshot(),
          paymentLinkProvider: paymentLinkProvider.snapshot(),
          peppolProvider: peppolProvider.snapshot(),
          emailProvider: emailProvider.snapshot(),
          smsProvider: smsProvider.snapshot(),
          enableBankingProvider: enableBankingProvider.snapshot(),
          bankFileProvider: bankFileProvider.snapshot(),
          spendProvider: spendProvider.snapshot(),
          agiTransportProvider: agiTransportProvider.snapshot(),
          vatTransportProvider: vatTransportProvider.snapshot(),
          husTransportProvider: husTransportProvider.snapshot(),
          annualTransportProvider: annualTransportProvider.snapshot(),
          signicatBankIdProvider: signicatBankIdProvider.snapshot(),
          workOsFederationProvider: workOsFederationProvider.snapshot(),
          localPasskeyProvider: localPasskeyProvider.snapshot(),
          localTotpProvider: localTotpProvider.snapshot(),
          signingEvidenceArchiveProvider: signingEvidenceArchiveProvider.snapshot()
        }
      });
    },
    exportDurableState,
    importDurableState
  };

  function exportDurableState() {
    return {
      ...serializeDurableState(state),
      providerSnapshots: {
        documentOcrProvider: documentOcrProvider.snapshot(),
        paymentLinkProvider: paymentLinkProvider.snapshot(),
        peppolProvider: peppolProvider.snapshot(),
        emailProvider: emailProvider.snapshot(),
        smsProvider: smsProvider.snapshot(),
        enableBankingProvider: enableBankingProvider.snapshot(),
        bankFileProvider: bankFileProvider.snapshot(),
        spendProvider: spendProvider.snapshot(),
        agiTransportProvider: agiTransportProvider.snapshot(),
        vatTransportProvider: vatTransportProvider.snapshot(),
        husTransportProvider: husTransportProvider.snapshot(),
        annualTransportProvider: annualTransportProvider.snapshot(),
        signicatBankIdProvider: signicatBankIdProvider.snapshot(),
        workOsFederationProvider: workOsFederationProvider.snapshot(),
        localPasskeyProvider: localPasskeyProvider.snapshot(),
        localTotpProvider: localTotpProvider.snapshot(),
        signingEvidenceArchiveProvider: signingEvidenceArchiveProvider.snapshot(),
        hubSpotCrmProvider: hubSpotCrmProvider.snapshot()
      }
    };
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
    documentOcrProvider.restore(snapshot?.providerSnapshots?.documentOcrProvider || snapshot?.documentOcrProvider || {});
    paymentLinkProvider.restore(snapshot?.providerSnapshots?.paymentLinkProvider || {});
    peppolProvider.restore(snapshot?.providerSnapshots?.peppolProvider || {});
    emailProvider.restore(snapshot?.providerSnapshots?.emailProvider || {});
    smsProvider.restore(snapshot?.providerSnapshots?.smsProvider || {});
    enableBankingProvider.restore(snapshot?.providerSnapshots?.enableBankingProvider || {});
    bankFileProvider.restore(snapshot?.providerSnapshots?.bankFileProvider || {});
    spendProvider.restore(snapshot?.providerSnapshots?.spendProvider || {});
    agiTransportProvider.restore(snapshot?.providerSnapshots?.agiTransportProvider || {});
    vatTransportProvider.restore(snapshot?.providerSnapshots?.vatTransportProvider || {});
    husTransportProvider.restore(snapshot?.providerSnapshots?.husTransportProvider || {});
    annualTransportProvider.restore(snapshot?.providerSnapshots?.annualTransportProvider || {});
    signicatBankIdProvider.restore(snapshot?.providerSnapshots?.signicatBankIdProvider || {});
    workOsFederationProvider.restore(snapshot?.providerSnapshots?.workOsFederationProvider || {});
    localPasskeyProvider.restore(snapshot?.providerSnapshots?.localPasskeyProvider || {});
    localTotpProvider.restore(snapshot?.providerSnapshots?.localTotpProvider || {});
    signingEvidenceArchiveProvider.restore(snapshot?.providerSnapshots?.signingEvidenceArchiveProvider || {});
    hubSpotCrmProvider.restore(snapshot?.providerSnapshots?.hubSpotCrmProvider || {});
  }

  function prepareProjectImportBatchFromAdapter({
    companyId,
    connectionId,
    providerCode = null,
    payload = {},
    sourceExportCapturedAt = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedConnectionId = requireText(connectionId, "integration_connection_id_required");
    const connection = integrationControlPlane.getIntegrationConnection({
      companyId: resolvedCompanyId,
      connectionId: resolvedConnectionId
    });
    if (connection.surfaceCode !== "crm_handoff") {
      throw createError(409, "integration_connection_surface_invalid", "Integration connection must use crm_handoff surface.");
    }
    if (providerCode && connection.providerCode !== providerCode) {
      throw createError(409, "integration_provider_code_mismatch", "Requested provider does not match integration connection.");
    }
    if (connection.credentialsConfigured !== true) {
      throw createError(409, "integration_credentials_missing", "Integration connection must have configured credentials.");
    }
    if (connection.providerCode !== HUBSPOT_CRM_PROVIDER_CODE) {
      throw createError(400, "integration_provider_code_invalid", `${connection.providerCode} is not yet implemented for project import adapters.`);
    }
    return hubSpotCrmProvider.prepareProjectImportBatch({
      companyId: resolvedCompanyId,
      integrationConnectionId: connection.connectionId,
      sourceExportCapturedAt,
      ...(payload && typeof payload === "object" ? payload : {})
    });
  }

  function prepareInvoiceDelivery({
    companyId,
    invoice,
    customer,
    deliveryChannel,
    recipientEmails = [],
    buyerReference = null,
    purchaseOrderReference = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedChannel = assertAllowed(deliveryChannel || invoice.deliveryChannel, INVOICE_DELIVERY_CHANNELS, "invoice_delivery_channel_invalid");
    if (resolvedChannel === "pdf_email") {
      const recipients = uniqueEmails(recipientEmails);
      if (recipients.length === 0) {
        throw createError(400, "invoice_delivery_recipient_required", "PDF delivery requires at least one recipient email.");
      }
      const delivery = emailProvider.prepareEmailDelivery({
        companyId: resolvedCompanyId,
        sourceObjectId: invoice.customerInvoiceId,
        recipientEmails: recipients,
        templateCode: "ar_invoice_pdf_v1",
        subjectLine: `Invoice ${invoice.invoiceNumber}`,
        templateModel: {
          documentType: invoice.invoiceType === "credit_note" ? "credit_note" : "invoice",
          invoiceId: invoice.customerInvoiceId,
          invoiceNumber: invoice.invoiceNumber,
          issuedAt: invoice.issuedAt,
          dueDate: invoice.dueDate,
          customerName: customer.legalName,
          lines: invoice.lines,
          totals: invoice.totals
        }
      });
      return {
        ...delivery,
        invoiceId: invoice.customerInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
        channel: resolvedChannel,
        documentType: invoice.invoiceType === "credit_note" ? "credit_note" : "invoice",
        recipient: recipients.join(","),
        buyerReference: normalizeOptionalText(buyerReference),
        purchaseOrderReference: normalizeOptionalText(purchaseOrderReference),
        payload: delivery.templateModel
      };
    }

    return peppolProvider.prepareInvoiceDelivery({
      companyId: resolvedCompanyId,
      invoice,
      customer,
      buyerReference,
      purchaseOrderReference
    });
  }

  function createPaymentLink({
    companyId,
    invoiceId,
    amount,
    currencyCode,
    providerCode,
    expiresAt
  } = {}) {
    const resolvedProviderCode = requireText(providerCode, "payment_link_provider_code_required");
    if (resolvedProviderCode !== STRIPE_PAYMENT_LINKS_PROVIDER_CODE) {
      throw createError(
        409,
        "payment_link_provider_not_supported",
        `${resolvedProviderCode} is not supported in phase 16.4.`
      );
    }
    return paymentLinkProvider.createPaymentLink({
      companyId,
      invoiceId,
      amount,
      currencyCode,
      expiresAt
    });
  }

  function prepareOfficialSubmissionTransport({ submissionType, ...input } = {}) {
    const provider = selectOfficialTransportProvider(submissionType);
    return provider.prepareTransport({
      ...input,
      submissionType
    });
  }

  function selectOfficialTransportProvider(submissionType) {
    const resolvedSubmissionType = requireText(submissionType, "submission_type_required");
    if (resolvedSubmissionType.startsWith("agi")) {
      return agiTransportProvider;
    }
    if (resolvedSubmissionType.startsWith("vat")) {
      return vatTransportProvider;
    }
    if (resolvedSubmissionType.startsWith("hus")) {
      return husTransportProvider;
    }
    if (resolvedSubmissionType.startsWith("income_tax") || resolvedSubmissionType.startsWith("annual")) {
      return annualTransportProvider;
    }
    return vatTransportProvider;
  }
}

function uniqueEmails(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeEmail(value)))];
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).trim();
}

function normalizeEmail(value) {
  const email = requireText(value, "email_required").toLowerCase();
  if (!email.includes("@")) {
    throw createError(400, "email_invalid", "Email address is invalid.");
  }
  return email;
}

function normalizeUpperCode(value, code, length) {
  const normalized = requireText(value, code).toUpperCase();
  if (normalized.length !== length) {
    throw createError(400, code, `${code} must have length ${length}.`);
  }
  return normalized;
}

function normalizeMoney(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createError(400, code, `${code} must be greater than zero.`);
  }
  return roundMoney(number);
}

function normalizeDate(value, code) {
  const input = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw createError(400, code, `${code} must be an ISO date.`);
  }
  return input;
}

function addDaysIso(date, days) {
  const resolved = new Date(`${date}T00:00:00.000Z`);
  resolved.setUTCDate(resolved.getUTCDate() + days);
  return resolved.toISOString().slice(0, 10);
}

function addMinutesIso(timestamp, minutes) {
  const resolved = new Date(timestamp);
  resolved.setUTCMinutes(resolved.getUTCMinutes() + minutes);
  return resolved.toISOString();
}

function assertAllowed(value, allowedValues, code) {
  const resolvedValue = requireText(value, code);
  if (!allowedValues.includes(resolvedValue)) {
    throw createError(400, code, `${code} does not allow ${resolvedValue}.`);
  }
  return resolvedValue;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function resolveProviderBaselineRef(providerBaselines, { providerCode, baselineCode, effectiveDate, metadata = {} }) {
  const resolvedBaseline = providerBaselines.resolveProviderBaseline({
    domain: "integrations",
    jurisdiction: "SE",
    providerCode,
    baselineCode,
    effectiveDate
  });
  return providerBaselines.buildProviderBaselineRef({
    effectiveDate,
    providerBaseline: resolvedBaseline,
    metadata
  });
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

