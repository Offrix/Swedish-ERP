import crypto from "node:crypto";
import { createIntegrationControlPlane } from "./control-plane.mjs";
import { createPartnerModule } from "./partners.mjs";
import { createPublicApiModule } from "./public-api.mjs";
import { createGoogleDocumentAiProvider, GOOGLE_DOCUMENT_AI_PROVIDER_CODE } from "./providers/google-document-ai.mjs";
import { createProviderBaselineRegistry } from "../../rule-engine/src/index.mjs";
import { createRegulatedSubmissionsModule } from "../../domain-regulated-submissions/src/index.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const INVOICE_DELIVERY_CHANNELS = Object.freeze(["pdf_email", "peppol"]);
export const PAYMENT_LINK_STATUSES = Object.freeze(["active", "consumed", "expired", "cancelled"]);
export { GOOGLE_DOCUMENT_AI_PROVIDER_CODE } from "./providers/google-document-ai.mjs";
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
    providerCode: "internal_mock",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "payment_link_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "payment-link-api-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Internal payment-link contract baseline for deterministic trial and sandbox checkout flows."
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
  const documentOcrProvider = createGoogleDocumentAiProvider({
    clock,
    environmentMode,
    providerEnvironmentRef: environmentMode === "production" ? "production" : "sandbox",
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
    getDocumentOcrProvider: () => documentOcrProvider
  });
  const regulatedSubmissionsModule = createRegulatedSubmissionsModule({
    state,
    clock,
    evidencePlatform,
    getCorePlatform
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
    prepareInvoiceDelivery,
    createPaymentLink,
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
        documentOcrProvider: documentOcrProvider.snapshot()
      });
    },
    exportDurableState,
    importDurableState
  };

  function exportDurableState() {
    return {
      ...serializeDurableState(state),
      providerSnapshots: {
        documentOcrProvider: documentOcrProvider.snapshot()
      }
    };
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
    documentOcrProvider.restore(snapshot?.providerSnapshots?.documentOcrProvider || snapshot?.documentOcrProvider || {});
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
    const documentType = invoice.invoiceType === "credit_note" ? "credit_note" : "invoice";
    if (resolvedChannel === "pdf_email") {
      const recipients = uniqueEmails(recipientEmails);
      if (recipients.length === 0) {
        throw createError(400, "invoice_delivery_recipient_required", "PDF delivery requires at least one recipient email.");
      }
      const payload = {
        templateCode: "ar_invoice_pdf_v1",
        documentType,
        invoiceId: invoice.customerInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        customerName: customer.legalName,
        lines: invoice.lines,
        totals: invoice.totals
      };
      return {
        deliveryId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        invoiceId: invoice.customerInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
        channel: resolvedChannel,
        documentType,
        payloadType: "pdf_render_request",
        payloadVersion: "1.0",
        payloadHash: hashObject(payload),
        status: "delivered",
        recipient: recipients.join(","),
        buyerReference: normalizeOptionalText(buyerReference),
        purchaseOrderReference: normalizeOptionalText(purchaseOrderReference),
        payload,
        createdAt: nowIso(clock)
      };
    }

    const peppolBaseline = resolveProviderBaselineRef(providerBaselines, {
      providerCode: "pagero_online",
      baselineCode: "SE-PEPPOL-BIS-BILLING-3",
      effectiveDate: invoice.issueDate || nowIso(clock).slice(0, 10),
      metadata: {
        invoiceId: invoice.customerInvoiceId,
        channel: "peppol"
      }
    });
    const peppolId = normalizeOptionalText(customer.peppolIdentifier);
    const peppolScheme = normalizeOptionalText(customer.peppolScheme);
    if (!peppolId || !peppolScheme) {
      throw createError(400, "peppol_identifier_missing", "Peppol delivery requires customer identifier and scheme.");
    }
    const resolvedBuyerReference = normalizeOptionalText(buyerReference);
    const resolvedPurchaseOrderReference = normalizeOptionalText(purchaseOrderReference);
    if (!resolvedBuyerReference && !resolvedPurchaseOrderReference) {
      throw createError(
        400,
        "peppol_reference_missing",
        "Peppol delivery requires buyer reference or purchase-order reference for outbound validation."
      );
    }
    const payload = {
      standard: "Peppol BIS Billing 3",
      documentType,
      invoiceId: invoice.customerInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentReference: invoice.paymentReference,
      seller: {
        companyId: resolvedCompanyId
      },
      buyer: {
        legalName: customer.legalName,
        countryCode: customer.countryCode,
        peppolIdentifier: peppolId,
        peppolScheme
      },
      references: {
        buyerReference: resolvedBuyerReference,
        purchaseOrderReference: resolvedPurchaseOrderReference
      },
      currencyCode: invoice.currencyCode,
      lines: invoice.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitCode: line.unitCode,
        unitPrice: line.unitPrice,
        lineAmount: line.lineAmount,
        vatCode: line.vatCode
      })),
      totals: invoice.totals
    };
    return {
      deliveryId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      invoiceId: invoice.customerInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      channel: resolvedChannel,
      documentType,
      payloadType: "peppol_bis_billing_3",
      payloadVersion: "3.0",
      payloadHash: hashObject(payload),
      providerCode: peppolBaseline.providerCode,
      providerBaselineId: peppolBaseline.providerBaselineId,
      providerBaselineCode: peppolBaseline.baselineCode,
      providerBaselineVersion: peppolBaseline.providerBaselineVersion,
      providerBaselineChecksum: peppolBaseline.providerBaselineChecksum,
      providerBaselineRef: peppolBaseline,
      status: "prepared",
      recipient: `${peppolScheme}:${peppolId}`,
      buyerReference: resolvedBuyerReference,
      purchaseOrderReference: resolvedPurchaseOrderReference,
      payload,
      createdAt: nowIso(clock)
    };
  }

  function createPaymentLink({
    companyId,
    invoiceId,
    amount,
    currencyCode,
    providerCode,
    expiresAt
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedInvoiceId = requireText(invoiceId, "customer_invoice_id_required");
    const resolvedAmount = normalizeMoney(amount, "payment_link_amount_invalid");
    const resolvedCurrencyCode = normalizeUpperCode(currencyCode, "currency_code_required", 3);
    const paymentLinkId = crypto.randomUUID();
    const resolvedExpiresAt = normalizeDate(expiresAt || addDaysIso(nowIso(clock).slice(0, 10), 14), "payment_link_expiry_invalid");
    const paymentLinkBaseline = resolveProviderBaselineRef(providerBaselines, {
      providerCode: requireText(providerCode, "payment_link_provider_code_required"),
      baselineCode: "SE-PAYMENT-LINK-API",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        invoiceId: resolvedInvoiceId,
        currencyCode: resolvedCurrencyCode
      }
    });
    return {
      paymentLinkId,
      companyId: resolvedCompanyId,
      invoiceId: resolvedInvoiceId,
      providerCode: paymentLinkBaseline.providerCode,
      providerBaselineId: paymentLinkBaseline.providerBaselineId,
      providerBaselineCode: paymentLinkBaseline.baselineCode,
      providerBaselineVersion: paymentLinkBaseline.providerBaselineVersion,
      providerBaselineChecksum: paymentLinkBaseline.providerBaselineChecksum,
      providerBaselineRef: paymentLinkBaseline,
      status: "active",
      amount: resolvedAmount,
      currencyCode: resolvedCurrencyCode,
      url: `${paymentBaseUrl.replace(/\/+$/, "")}/${resolvedInvoiceId}/${paymentLinkId}`,
      expiresAt: resolvedExpiresAt,
      createdAt: nowIso(clock)
    };
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

