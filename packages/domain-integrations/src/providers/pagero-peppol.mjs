import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  hashObject,
  normalizeOptionalText,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const PAGERO_PEPPOL_PROVIDER_CODE = "pagero_online";

export function createPageroPeppolProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: PAGERO_PEPPOL_PROVIDER_CODE,
    surfaceCode: "partner",
    connectionType: "peppol",
    environmentMode,
    requiredCredentialKinds: ["api_credentials", "certificate_ref"],
    sandboxSupported: true,
    trialSafe: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "peppol_bis_billing_3",
        baselineCode: "SE-PEPPOL-BIS-BILLING-3",
        operationCodes: ["invoice_send", "credit_note_send", "status_sync", "inbound_document_sync"]
      }
    ]
  });

  return {
    ...provider,
    prepareInvoiceDelivery
  };

  function prepareInvoiceDelivery({
    companyId,
    invoice,
    customer,
    buyerReference = null,
    purchaseOrderReference = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const documentType = invoice.invoiceType === "credit_note" ? "credit_note" : "invoice";
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
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: PAGERO_PEPPOL_PROVIDER_CODE,
      baselineCode: "SE-PEPPOL-BIS-BILLING-3",
      effectiveDate: invoice.issueDate || nowIso(clock).slice(0, 10),
      metadata: {
        invoiceId: invoice.customerInvoiceId,
        channel: "peppol"
      }
    });
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
    return Object.freeze({
      deliveryId: `peppol:${invoice.customerInvoiceId}:${Date.now()}`,
      companyId: resolvedCompanyId,
      invoiceId: invoice.customerInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      channel: "peppol",
      documentType,
      payloadType: "peppol_bis_billing_3",
      payloadVersion: "3.0",
      payloadHash: hashObject(payload),
      providerCode: PAGERO_PEPPOL_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerHostedReference: `pagero:${invoice.customerInvoiceId}`,
      providerBaselineId: providerBaselineRef.providerBaselineId,
      providerBaselineCode: providerBaselineRef.baselineCode,
      providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
      providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
      providerBaselineRef,
      status: "prepared",
      recipient: `${peppolScheme}:${peppolId}`,
      buyerReference: resolvedBuyerReference,
      purchaseOrderReference: resolvedPurchaseOrderReference,
      payload,
      createdAt: nowIso(clock)
    });
  }
}
