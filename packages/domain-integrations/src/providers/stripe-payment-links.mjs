import crypto from "node:crypto";
import {
  addDaysIso,
  buildProviderBaselineRef,
  createStatelessProvider,
  normalizeDate,
  normalizeMoney,
  normalizeUpperCode,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const STRIPE_PAYMENT_LINKS_PROVIDER_CODE = "stripe_payment_links";

export function createStripePaymentLinksProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null,
  checkoutBaseUrl = "https://buy.stripe.local"
} = {}) {
  const provider = createStatelessProvider({
    providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
    surfaceCode: "payment_link",
    connectionType: "payment_link",
    environmentMode,
    requiredCredentialKinds: ["api_credentials"],
    sandboxSupported: true,
    trialSafe: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "stripe_payment_link_v1",
        baselineCode: "SE-PAYMENT-LINK-API",
        operationCodes: ["payment_link_create", "payment_link_expire", "payment_status_sync"]
      }
    ]
  });

  return {
    ...provider,
    createPaymentLink
  };

  function createPaymentLink({ companyId, invoiceId, amount, currencyCode, expiresAt } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedInvoiceId = requireText(invoiceId, "customer_invoice_id_required");
    const resolvedAmount = normalizeMoney(amount, "payment_link_amount_invalid");
    const resolvedCurrencyCode = normalizeUpperCode(currencyCode, "currency_code_required", 3);
    const resolvedExpiresAt = normalizeDate(expiresAt || addDaysIso(nowIso(clock).slice(0, 10), 14), "payment_link_expiry_invalid");
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
      baselineCode: "SE-PAYMENT-LINK-API",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        invoiceId: resolvedInvoiceId,
        currencyCode: resolvedCurrencyCode
      }
    });
    const checkoutSessionId = `plink_${crypto.randomUUID().replace(/-/g, "")}`;
    const paymentLinkId = crypto.randomUUID();
    return Object.freeze({
      paymentLinkId,
      companyId: resolvedCompanyId,
      invoiceId: resolvedInvoiceId,
      providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerHostedReference: checkoutSessionId,
      providerBaselineId: providerBaselineRef.providerBaselineId,
      providerBaselineCode: providerBaselineRef.baselineCode,
      providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
      providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
      providerBaselineRef,
      status: "active",
      amount: resolvedAmount,
      currencyCode: resolvedCurrencyCode,
      url: `${checkoutBaseUrl.replace(/\/+$/, "")}/${checkoutSessionId}`,
      expiresAt: resolvedExpiresAt,
      createdAt: nowIso(clock)
    });
  }
}
