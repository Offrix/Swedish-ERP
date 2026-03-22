import crypto from "node:crypto";

export const INVOICE_DELIVERY_CHANNELS = Object.freeze(["pdf_email", "peppol"]);
export const PAYMENT_LINK_STATUSES = Object.freeze(["active", "consumed", "expired", "cancelled"]);

export function createIntegrationPlatform(options = {}) {
  return createIntegrationEngine(options);
}

export function createIntegrationEngine({ clock = () => new Date(), paymentBaseUrl = "https://payments.local" } = {}) {
  return {
    deliveryChannels: INVOICE_DELIVERY_CHANNELS,
    paymentLinkStatuses: PAYMENT_LINK_STATUSES,
    prepareInvoiceDelivery,
    createPaymentLink
  };

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
    providerCode = "internal_mock",
    expiresAt
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedInvoiceId = requireText(invoiceId, "customer_invoice_id_required");
    const resolvedAmount = normalizeMoney(amount, "payment_link_amount_invalid");
    const resolvedCurrencyCode = normalizeUpperCode(currencyCode, "currency_code_required", 3);
    const paymentLinkId = crypto.randomUUID();
    const resolvedExpiresAt = normalizeDate(expiresAt || addDaysIso(nowIso(clock).slice(0, 10), 14), "payment_link_expiry_invalid");
    return {
      paymentLinkId,
      companyId: resolvedCompanyId,
      invoiceId: resolvedInvoiceId,
      providerCode: requireText(providerCode, "payment_link_provider_code_required"),
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

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
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
