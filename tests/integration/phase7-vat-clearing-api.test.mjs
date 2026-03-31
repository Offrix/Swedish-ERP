import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 7.6 API posts, lists and reverses VAT clearing runs from real VAT declaration runs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-05T09:00:00Z")
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

    platform.evaluateVatDecision({
      companyId: DEMO_IDS.companyId,
      actorId: "phase7-api",
      transactionLine: buildTransactionLine({
        source_type: "AR_INVOICE",
        source_id: "phase7-api-vat-clearing-sale",
        supply_type: "sale",
        vat_code_candidate: "VAT_SE_DOMESTIC_25",
        line_amount_ex_vat: 1000,
        vat_rate: 25,
        tax_rate_candidate: 25
      })
    });
    platform.evaluateVatDecision({
      companyId: DEMO_IDS.companyId,
      actorId: "phase7-api",
      transactionLine: buildTransactionLine({
        source_type: "AP_INVOICE",
        source_id: "phase7-api-vat-clearing-purchase",
        supply_type: "purchase",
        vat_code_candidate: "VAT_SE_DOMESTIC_PURCHASE_25",
        line_amount_ex_vat: 400,
        vat_rate: 25,
        tax_rate_candidate: 25
      })
    });

    postJournal(platform, {
      journalDate: "2026-03-10",
      sourceId: "phase7-api-vat-clearing-sale",
      idempotencyKey: "phase7-api-vat-clearing-sale",
      lines: [
        { accountNumber: "1210", debitAmount: 1250 },
        { accountNumber: "3010", creditAmount: 1000 },
        { accountNumber: "2610", creditAmount: 250 }
      ]
    });
    postJournal(platform, {
      journalDate: "2026-03-18",
      sourceId: "phase7-api-vat-clearing-purchase",
      idempotencyKey: "phase7-api-vat-clearing-purchase",
      lines: [
        { accountNumber: "4010", debitAmount: 400 },
        { accountNumber: "2640", debitAmount: 100 },
        { accountNumber: "2410", creditAmount: 500 }
      ]
    });

    const declarationRun = platform.createVatDeclarationRun({
      companyId: DEMO_IDS.companyId,
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      actorId: "phase7-api",
      signer: "finance-signer"
    });

    const headers = {
      "idempotency-key": "phase7-api-vat-clearing"
    };
    const run = await requestJson(baseUrl, "/v1/ledger/vat-clearing-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers,
      body: {
        companyId: DEMO_IDS.companyId,
        vatDeclarationRunId: declarationRun.vatDeclarationRunId,
        sourceCode: "vat_return_close"
      }
    });
    const replay = await requestJson(baseUrl, "/v1/ledger/vat-clearing-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers,
      body: {
        companyId: DEMO_IDS.companyId,
        vatDeclarationRunId: declarationRun.vatDeclarationRunId,
        sourceCode: "vat_return_close"
      }
    });
    const listed = await requestJson(baseUrl, `/v1/ledger/vat-clearing-runs?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const fetched = await requestJson(
      baseUrl,
      `/v1/ledger/vat-clearing-runs/${run.vatClearingRunId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    const reversed = await requestJson(
      baseUrl,
      `/v1/ledger/vat-clearing-runs/${run.vatClearingRunId}/reverse`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "vat_return_restate",
          approvedByActorId: "finance-approver",
          approvedByRoleCode: "finance_manager"
        }
      }
    );

    const journal = platform.getJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: run.journalEntryId
    });

    assert.equal(run.vatClearingRunId, replay.vatClearingRunId);
    assert.equal(run.vatDeclarationRunId, declarationRun.vatDeclarationRunId);
    assert.equal(run.sourceNetBalanceAmount, -150);
    assert.equal(listed.items.some((item) => item.vatClearingRunId === run.vatClearingRunId), true);
    assert.equal(fetched.vatClearingRunId, run.vatClearingRunId);
    assert.equal(journal.lines.some((line) => line.accountNumber === "2610" && Number(line.debitAmount) === 250), true);
    assert.equal(journal.lines.some((line) => line.accountNumber === "2640" && Number(line.creditAmount) === 100), true);
    assert.equal(journal.lines.some((line) => line.accountNumber === "2650" && Number(line.creditAmount) === 150), true);
    assert.equal(reversed.status, "reversed");
    assert.equal(typeof reversed.reversalJournalEntryId, "string");
  } finally {
    await stopServer(server);
  }
});

function postJournal(platform, { journalDate, sourceId, idempotencyKey, lines }) {
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "phase7-api",
    idempotencyKey,
    description: sourceId,
    lines
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase7-api"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase7-api",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
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
    tax_date: "2026-03-10",
    invoice_date: "2026-03-10",
    delivery_date: "2026-03-10",
    prepayment_date: "2026-03-10",
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
    source_type: "AR_INVOICE",
    source_id: "phase7-api-vat-default",
    ...overrides
  };
}
