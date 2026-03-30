import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 4.3 migration and seed add VAT reporting artifacts for declaration runs and periodic statements", async () => {
  const migration = await readText("packages/db/migrations/20260321100000_phase4_vat_reporting.sql");
  for (const fragment of [
    "ADD COLUMN IF NOT EXISTS transaction_line_json",
    "ADD COLUMN IF NOT EXISTS reporting_channel",
    "CREATE TABLE IF NOT EXISTS vat_declaration_runs",
    "CREATE TABLE IF NOT EXISTS vat_periodic_statement_runs"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321100010_phase4_vat_reporting_seed.sql");
  for (const fragment of ["vat-se-2025.6", "vat-se-2026.3", "VAT_SE_EU_B2C_IOSS"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Phase 4.3 API materializes declaration runs with ledger comparison and reproducible periodic statements", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T00:05:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminSession = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(`${baseUrl}/v1/ledger/chart/install`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    const domesticDecision = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-3-api-domestic",
          vat_code_candidate: "VAT_SE_DOMESTIC_25",
          line_amount_ex_vat: 1000
        })
      }
    });

    const ledgerEntry = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "B",
        sourceType: "AR_INVOICE",
        sourceId: "phase4-3-api-domestic",
        idempotencyKey: "phase4-3-api-domestic",
        description: "VAT reporting domestic invoice",
        lines: [
          { accountNumber: "1210", debitAmount: 1250 },
          { accountNumber: "3010", creditAmount: 1000 },
          { accountNumber: "2610", creditAmount: 250 }
        ]
      }
    });
    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${ledgerEntry.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${ledgerEntry.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });

    await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-3-api-oss",
          buyer_country: "FR",
          buyer_type: "consumer",
          buyer_vat_no: "NOT-REGISTERED",
          buyer_is_taxable_person: false,
          buyer_vat_number: "NOT-REGISTERED",
          buyer_vat_number_status: "not_applicable",
          currency: "EUR",
          ecb_exchange_rate_to_eur: 1,
          line_amount_ex_vat: 200,
          vat_code_candidate: "VAT_SE_EU_B2C_OSS",
          oss_flag: true
        })
      }
    });
    const euGoodsLedgerEntry = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "B",
        sourceType: "AR_INVOICE",
        sourceId: "phase4-3-api-eu-goods",
        idempotencyKey: "phase4-3-api-eu-goods",
        description: "VAT reporting EU goods",
        lines: [
          { accountNumber: "1220", debitAmount: 700 },
          { accountNumber: "3110", creditAmount: 700 }
        ]
      }
    });
    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${euGoodsLedgerEntry.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${euGoodsLedgerEntry.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });

    await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-3-api-eu-goods",
          buyer_country: "DE",
          buyer_type: "business",
          buyer_vat_no: "DE123456789",
          buyer_is_taxable_person: true,
          buyer_vat_number: "DE123456789",
          buyer_vat_number_status: "valid",
          goods_or_services: "goods",
          vat_code_candidate: "VAT_SE_EU_GOODS_B2B",
          line_amount_ex_vat: 700
        })
      }
    });
    const euServiceLedgerEntry = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "B",
        sourceType: "AR_INVOICE",
        sourceId: "phase4-3-api-eu-service",
        idempotencyKey: "phase4-3-api-eu-service",
        description: "VAT reporting EU service",
        lines: [
          { accountNumber: "1220", debitAmount: 450 },
          { accountNumber: "3120", creditAmount: 450 }
        ]
      }
    });
    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${euServiceLedgerEntry.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${euServiceLedgerEntry.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });

    await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-3-api-eu-service",
          buyer_country: "DE",
          buyer_type: "business",
          buyer_vat_no: "DE123456789",
          buyer_is_taxable_person: true,
          buyer_vat_number: "DE123456789",
          buyer_vat_number_status: "valid",
          goods_or_services: "services",
          vat_code_candidate: "VAT_SE_EU_SERVICES_B2B",
          line_amount_ex_vat: 450
        })
      }
    });

    const declarationRun = await requestJson(`${baseUrl}/v1/vat/declaration-runs`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        signer: "finance-signer"
      }
    });
    assert.deepEqual(declarationRun.declarationBoxSummary, [
      { boxCode: "05", amount: 1000, amountType: "taxable_base" },
      { boxCode: "10", amount: 250, amountType: "output_vat" },
      { boxCode: "35", amount: 700, amountType: "taxable_base" },
      { boxCode: "39", amount: 450, amountType: "taxable_base" }
    ]);
    assert.equal(declarationRun.ossSummary.length, 1);
    assert.equal(declarationRun.ossSummary[0].buyerCountry, "FR");
    assert.equal(declarationRun.ledgerComparison.matched, true);
    assert.equal(declarationRun.ledgerComparison.expectedCredit, 2400);
    assert.equal(declarationRun.ledgerComparison.actualCredit, 2400);

    const fetchedDeclaration = await requestJson(
      `${baseUrl}/v1/vat/declaration-runs/${declarationRun.vatDeclarationRunId}?companyId=${COMPANY_ID}`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(fetchedDeclaration.vatDeclarationRunId, declarationRun.vatDeclarationRunId);

    const periodicRun = await requestJson(`${baseUrl}/v1/vat/periodic-statements`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        fromDate: "2026-03-01",
        toDate: "2026-03-31"
      }
    });
    assert.equal(periodicRun.lineCount, 2);
    assert.deepEqual(
      periodicRun.lines.map((line) => ({
        customerCountry: line.customerCountry,
        customerVatNumber: line.customerVatNumber,
        goodsOrServices: line.goodsOrServices,
        taxableAmount: line.taxableAmount
      })),
      [
        {
          customerCountry: "DE",
          customerVatNumber: "DE123456789",
          goodsOrServices: "goods",
          taxableAmount: 700
        },
        {
          customerCountry: "DE",
          customerVatNumber: "DE123456789",
          goodsOrServices: "services",
          taxableAmount: 450
        }
      ]
    );

    const periodicRunReplay = await requestJson(`${baseUrl}/v1/vat/periodic-statements`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        previousSubmissionId: periodicRun.vatPeriodicStatementRunId,
        correctionReason: "re-run"
      }
    });
    assert.deepEqual(periodicRunReplay.lines, periodicRun.lines);
    assert.equal(periodicRunReplay.sourceSnapshotHash, periodicRun.sourceSnapshotHash);

    const fetchedPeriodicRun = await requestJson(
      `${baseUrl}/v1/vat/periodic-statements/${periodicRun.vatPeriodicStatementRunId}?companyId=${COMPANY_ID}`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(fetchedPeriodicRun.vatPeriodicStatementRunId, periodicRun.vatPeriodicStatementRunId);
  } finally {
    await stopServer(server);
  }
});

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

  return {
    sessionToken: started.sessionToken
  };
}

function buildTransactionLine(overrides = {}) {
  return {
    seller_country: "SE",
    seller_vat_registration_country: "SE",
    buyer_country: "SE",
    buyer_type: "business",
    buyer_vat_no: "SE556677889901",
    buyer_is_taxable_person: true,
    buyer_vat_number: "SE556677889901",
    buyer_vat_number_status: "valid",
    supply_type: "sale",
    goods_or_services: "goods",
    supply_subtype: "standard",
    property_related_flag: false,
    construction_service_flag: false,
    transport_end_country: "SE",
    import_flag: false,
    export_flag: false,
    reverse_charge_flag: false,
    oss_flag: false,
    ioss_flag: false,
    currency: "SEK",
    tax_date: "2026-03-21",
    invoice_date: "2026-03-21",
    delivery_date: "2026-03-21",
    prepayment_date: "2026-03-21",
    line_amount_ex_vat: 1000,
    line_discount: 0,
    line_quantity: 1,
    line_uom: "ea",
    vat_rate: 25,
    tax_rate_candidate: 25,
    vat_code_candidate: "VAT_SE_DOMESTIC_25",
    exemption_reason: "not_applicable",
    invoice_text_code: "domestic_standard",
    report_box_code: "05",
    project_id: PROJECT_ID,
    source_type: "AR_INVOICE",
    source_id: "phase4-3-api-default",
    ...overrides
  };
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
