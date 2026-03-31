import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.1 API exposes metric catalog, light report builder, multi-source snapshots and export jobs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T11:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });
  seedReportingSources(platform);

  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: true,
      phase10ProjectsEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const metrics = await requestJson(`${baseUrl}/v1/reporting/metric-definitions?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(metrics.items.some((metric) => metric.metricCode === "cash_inflow_amount"), true);

    const customDefinition = await requestJson(`${baseUrl}/v1/reporting/report-definitions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        baseReportCode: "project_portfolio",
        reportCode: "project_portfolio_focus",
        name: "Project portfolio focus",
        metricCodes: ["project_billed_revenue_amount", "project_wip_amount", "project_forecast_margin_amount"],
        defaultFilters: {
          projectIds: [platform.listProjects({ companyId: COMPANY_ID })[0].projectId]
        }
      }
    });
    assert.equal(customDefinition.definitionKind, "light_builder");

    const cashflowSnapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "cashflow",
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
        viewMode: "period"
      }
    });
    const arSnapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "ar_open_items",
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
        viewMode: "period"
      }
    });
    const apSnapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "ap_open_items",
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
        viewMode: "period"
      }
    });
    const projectSnapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: customDefinition.reportCode,
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
        viewMode: "period"
      }
    });

    assert.equal(cashflowSnapshot.lines.length > 0, true);
    assert.equal(arSnapshot.lines.length > 0, true);
    assert.equal(apSnapshot.lines.length > 0, true);
    assert.equal(projectSnapshot.reportDefinitionKind, "light_builder");

    const exportJob = await requestJson(`${baseUrl}/v1/reporting/export-jobs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportSnapshotId: cashflowSnapshot.reportSnapshotId,
        format: "pdf"
      }
    });
    assert.equal(exportJob.status, "delivered");

    const listedExports = await requestJson(
      `${baseUrl}/v1/reporting/export-jobs?companyId=${COMPANY_ID}&reportSnapshotId=${cashflowSnapshot.reportSnapshotId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(listedExports.items.length, 1);

    const fetchedExport = await requestJson(
      `${baseUrl}/v1/reporting/export-jobs/${exportJob.reportExportJobId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.match(fetchedExport.artifactContent, /reportCode=cashflow/);
  } finally {
    await stopServer(server);
  }
});

function seedReportingSources(platform) {
  createPostedJournal({
    platform,
    companyId: COMPANY_ID,
    actorId: "seed",
    journalDate: "2026-01-05",
    sourceId: "phase11-api-cash",
    lines: [
      { accountNumber: "1110", debitAmount: 3000 },
      { accountNumber: "3010", creditAmount: 3000 }
    ]
  });

  const customer = platform.createCustomer({
    companyId: COMPANY_ID,
    legalName: "API Reporting Customer AB",
    organizationNumber: "5566771126",
    countryCode: "SE",
    languageCode: "SV",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    invoiceDeliveryMethod: "pdf_email",
    reminderProfileCode: "standard",
    billingAddress: { line1: "APIgatan 1", postalCode: "11157", city: "Stockholm", countryCode: "SE" },
    deliveryAddress: { line1: "APIgatan 1", postalCode: "11157", city: "Stockholm", countryCode: "SE" },
    actorId: "seed"
  });
  const item = platform.createItem({
    companyId: COMPANY_ID,
    description: "API reporting service",
    itemType: "service",
    unitCode: "hour",
    standardPrice: 2100,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25",
    actorId: "seed"
  });
  const arInvoice = platform.createInvoice({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    invoiceType: "standard",
    issueDate: "2026-01-08",
    dueDate: "2026-02-07",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 1, unitPrice: 2100 }],
    actorId: "seed"
  });
  platform.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: arInvoice.customerInvoiceId,
    actorId: "seed"
  });

  const supplier = platform.createSupplier({
    companyId: COMPANY_ID,
    legalName: "API Reporting Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "API Reporting Supplier AB",
    bankgiro: "5555-2222",
    defaultExpenseAccountNumber: "5410",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    requiresPo: false,
    actorId: "seed"
  });
  const supplierInvoice = platform.ingestSupplierInvoice({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    externalInvoiceRef: "SUP-API-1101",
    invoiceDate: "2026-01-09",
    dueDate: "2026-02-08",
    sourceChannel: "api",
    lines: [
      {
        description: "API subscriptions",
        quantity: 1,
        unitPrice: 900,
        expenseAccountNumber: "5410",
        vatCode: "VAT_SE_DOMESTIC_25"
      }
    ],
    actorId: "seed"
  });
  const matched = platform.runSupplierInvoiceMatch({
    companyId: COMPANY_ID,
    supplierInvoiceId: supplierInvoice.supplierInvoiceId,
    actorId: "seed"
  }).invoice;
  if (matched.status !== "approved") {
    platform.approveSupplierInvoice({
      companyId: COMPANY_ID,
      supplierInvoiceId: supplierInvoice.supplierInvoiceId,
      actorId: "seed"
    });
  }
  platform.postSupplierInvoice({
    companyId: COMPANY_ID,
    supplierInvoiceId: supplierInvoice.supplierInvoiceId,
    actorId: "seed"
  });
}

function createPostedJournal({ platform, companyId, actorId, journalDate, sourceId, lines }) {
  const created = platform.createJournalEntry({
    companyId,
    journalDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId,
    idempotencyKey: `phase11-api:${sourceId}`,
    lines
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
  return platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId,
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
}

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });

  const bankidStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return started.sessionToken;
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
