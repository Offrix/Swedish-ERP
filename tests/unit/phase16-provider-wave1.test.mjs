import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntegrationEngine,
  BOLAGSVERKET_ANNUAL_PROVIDER_CODE,
  PLEO_SPEND_PROVIDER_CODE,
  POSTMARK_EMAIL_PROVIDER_CODE,
  SKATTEVERKET_AGI_PROVIDER_CODE,
  SKATTEVERKET_HUS_PROVIDER_CODE,
  SKATTEVERKET_VAT_PROVIDER_CODE,
  STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
  TWILIO_SMS_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

function buildInvoice() {
  return {
    customerInvoiceId: "inv-16-4-1",
    invoiceNumber: "INV-16041",
    invoiceType: "standard",
    issueDate: "2026-03-29",
    dueDate: "2026-04-28",
    issuedAt: "2026-03-29T10:00:00.000Z",
    currencyCode: "SEK",
    paymentReference: "5555001",
    lines: [
      {
        description: "Managed service",
        quantity: 1,
        unitCode: "HUR",
        unitPrice: 1000,
        lineAmount: 1000,
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    totals: {
      netAmount: 1000,
      vatAmount: 250,
      grossAmount: 1250
    }
  };
}

function buildCustomer(overrides = {}) {
  return {
    legalName: "Wave 1 Customer AB",
    countryCode: "SE",
    peppolScheme: "0088",
    peppolIdentifier: "5566778899",
    ...overrides
  };
}

test("Phase 16.4 exposes wave-1 capability manifests and generic integration connections", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T12:00:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests();
  for (const providerCode of [
    STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
    POSTMARK_EMAIL_PROVIDER_CODE,
    TWILIO_SMS_PROVIDER_CODE,
    PLEO_SPEND_PROVIDER_CODE,
    SKATTEVERKET_AGI_PROVIDER_CODE,
    SKATTEVERKET_VAT_PROVIDER_CODE,
    SKATTEVERKET_HUS_PROVIDER_CODE,
    BOLAGSVERKET_ANNUAL_PROVIDER_CODE
  ]) {
    assert.equal(manifests.some((manifest) => manifest.providerCode === providerCode), true);
  }

  const stripeConnection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "payment_link",
    connectionType: "payment_link",
    providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
    displayName: "Stripe trial",
    environmentMode: "trial",
    credentialsRef: "secret://stripe/trial",
    secretManagerRef: "vault://stripe/trial",
    actorId: "phase16-4-unit"
  });
  assert.equal(stripeConnection.surfaceCode, "payment_link");
  assert.equal(stripeConnection.providerCode, STRIPE_PAYMENT_LINKS_PROVIDER_CODE);
  assert.equal(stripeConnection.trialSafe, true);
  assert.equal(stripeConnection.credentialsConfigured, true);

  const emailConnection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "notification_email",
    connectionType: "notification_email",
    providerCode: POSTMARK_EMAIL_PROVIDER_CODE,
    displayName: "Postmark sandbox",
    environmentMode: "sandbox",
    credentialsRef: "secret://postmark/sandbox",
    secretManagerRef: "vault://postmark/sandbox",
    actorId: "phase16-4-unit"
  });
  assert.equal(emailConnection.surfaceCode, "notification_email");
  assert.equal(emailConnection.providerEnvironmentRef, "sandbox");
});

test("Phase 16.4 uses real provider adapters for finance, notifications, spend and official transports", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T12:05:00Z")
  });
  const invoice = buildInvoice();
  const customer = buildCustomer();

  const pdfDelivery = platform.prepareInvoiceDelivery({
    companyId: COMPANY_ID,
    invoice,
    customer,
    deliveryChannel: "pdf_email",
    recipientEmails: ["billing@example.se"]
  });
  assert.equal(pdfDelivery.providerCode, POSTMARK_EMAIL_PROVIDER_CODE);
  assert.equal(pdfDelivery.providerBaselineCode, "SE-POSTMARK-EMAIL-API");

  const peppolDelivery = platform.prepareInvoiceDelivery({
    companyId: COMPANY_ID,
    invoice,
    customer,
    deliveryChannel: "peppol",
    buyerReference: "BUYER-1"
  });
  assert.equal(peppolDelivery.providerCode, "pagero_online");
  assert.equal(peppolDelivery.providerBaselineCode, "SE-PEPPOL-BIS-BILLING-3");

  const paymentLink = platform.createPaymentLink({
    companyId: COMPANY_ID,
    invoiceId: invoice.customerInvoiceId,
    amount: 1250,
    currencyCode: "SEK",
    providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE
  });
  assert.equal(paymentLink.providerCode, STRIPE_PAYMENT_LINKS_PROVIDER_CODE);
  assert.equal(paymentLink.providerBaselineCode, "SE-PAYMENT-LINK-API");

  const bankSync = platform.prepareBankStatementSync({
    companyId: COMPANY_ID,
    bankAccountId: "bank-account-1",
    windowStart: "2026-03-01",
    windowEnd: "2026-03-29"
  });
  assert.equal(bankSync.providerCode, "enable_banking");

  const bankFileExchange = platform.prepareBankFileExchange({
    companyId: COMPANY_ID,
    sourceObjectId: "payment-batch-1",
    messageType: "pain.001.001.03",
    direction: "outbound"
  });
  assert.equal(bankFileExchange.providerCode, "bank_file_channel");

  const spendSync = platform.prepareSpendSync({
    companyId: COMPANY_ID,
    cursor: "pleo-cursor-1"
  });
  assert.equal(spendSync.providerCode, PLEO_SPEND_PROVIDER_CODE);

  const smsDelivery = platform.prepareSmsNotification({
    companyId: COMPANY_ID,
    sourceObjectId: "work-item-1",
    recipientPhoneNumber: "+46701234567",
    textBody: "Action required"
  });
  assert.equal(smsDelivery.providerCode, TWILIO_SMS_PROVIDER_CODE);

  const agiTransport = platform.prepareOfficialSubmissionTransport({
    companyId: COMPANY_ID,
    submissionId: "submission-agi-1",
    submissionType: "agi_monthly",
    payloadHash: "agi-hash"
  });
  assert.equal(agiTransport.providerCode, SKATTEVERKET_AGI_PROVIDER_CODE);

  const annualTransport = platform.prepareOfficialSubmissionTransport({
    companyId: COMPANY_ID,
    submissionId: "submission-annual-1",
    submissionType: "annual_report",
    payloadHash: "annual-hash"
  });
  assert.equal(annualTransport.providerCode, BOLAGSVERKET_ANNUAL_PROVIDER_CODE);
});
