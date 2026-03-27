import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 10 API configures voucher and invoice series and issues invoices against the configured runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T14:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    await requestJson(baseUrl, "/v1/ledger/voucher-series", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        seriesCode: "B",
        description: "Dunning only",
        status: "active",
        purposeCodes: ["AR_DUNNING"]
      }
    });
    const customVoucherSeries = await requestJson(baseUrl, "/v1/ledger/voucher-series", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        seriesCode: "ARX",
        description: "Custom AR voucher series",
        nextNumber: 900,
        purposeCodes: ["AR_INVOICE"],
        importedSequencePreservationEnabled: true
      }
    });
    const voucherSeriesList = await requestJson(baseUrl, `/v1/ledger/voucher-series?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(voucherSeriesList.items.some((item) => item.seriesCode === customVoucherSeries.seriesCode), true);

    await requestJson(baseUrl, "/v1/ar/invoice-series", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        seriesCode: "B",
        prefix: "INV-",
        description: "Paused legacy invoice series",
        status: "paused",
        invoiceTypeCodes: ["standard", "partial", "subscription"],
        voucherSeriesPurposeCode: "AR_INVOICE"
      }
    });
    const customInvoiceSeries = await requestJson(baseUrl, "/v1/ar/invoice-series", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        seriesCode: "STD",
        prefix: "CUS-",
        description: "Custom standard invoice series",
        nextNumber: 42,
        invoiceTypeCodes: ["standard"],
        voucherSeriesPurposeCode: "AR_INVOICE",
        importedSequencePreservationEnabled: true
      }
    });
    const invoiceSeriesList = await requestJson(baseUrl, `/v1/ar/invoice-series?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(invoiceSeriesList.items.some((item) => item.seriesCode === customInvoiceSeries.seriesCode), true);

    const customer = platform.createCustomer({
      companyId: DEMO_IDS.companyId,
      legalName: "API Series Customer AB",
      organizationNumber: "5566778899",
      countryCode: "SE",
      languageCode: "SV",
      currencyCode: "SEK",
      paymentTermsCode: "NET30",
      invoiceDeliveryMethod: "pdf_email",
      reminderProfileCode: "standard",
      billingAddress: {
        line1: "API-gatan 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      },
      deliveryAddress: {
        line1: "API-gatan 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      },
      actorId: "seed"
    });
    const item = platform.createItem({
      companyId: DEMO_IDS.companyId,
      itemCode: "API-SERIES",
      description: "API custom series item",
      itemType: "service",
      unitCode: "hour",
      standardPrice: 1000,
      revenueAccountNumber: "3010",
      vatCode: "VAT_SE_DOMESTIC_25",
      actorId: "seed"
    });
    const invoice = platform.createInvoice({
      companyId: DEMO_IDS.companyId,
      customerId: customer.customerId,
      invoiceType: "standard",
      invoiceSeriesCode: customInvoiceSeries.seriesCode,
      issueDate: "2026-03-24",
      dueDate: "2026-04-23",
      currencyCode: "SEK",
      lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 1000 }],
      actorId: "seed"
    });

    const issued = await requestJson(baseUrl, `/v1/ar/invoices/${invoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const journal = await requestJson(
      baseUrl,
      `/v1/ledger/journal-entries/${issued.journalEntryId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );

    assert.equal(issued.invoiceSeriesCode, "STD");
    assert.equal(issued.invoiceNumber, "CUS-00042");
    assert.equal(journal.voucherSeriesCode, "ARX");
  } finally {
    await stopServer(server);
  }
});
