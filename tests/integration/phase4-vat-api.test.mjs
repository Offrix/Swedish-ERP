import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 4.1 migration creates rule packs, VAT codes and VAT review queue tables", async () => {
  const migration = await readText("packages/db/migrations/20260321080000_phase4_vat_masterdata_rulepacks.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS rule_packs",
    "CREATE TABLE IF NOT EXISTS vat_codes",
    "CREATE TABLE IF NOT EXISTS vat_review_queue_items",
    "ALTER TABLE vat_decisions"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 4.1 API exposes VAT masterdata, dated rule packs, explainable decisions and review queue", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-21T23:40:00Z")
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

    const codes = await requestJson(`${baseUrl}/v1/vat/codes?companyId=${COMPANY_ID}`, {
      token: adminSession.sessionToken
    });
    assert.ok(codes.items.find((item) => item.vatCode === "VAT_SE_DOMESTIC_25"));

    const packs2025 = await requestJson(`${baseUrl}/v1/vat/rule-packs?companyId=${COMPANY_ID}&effectiveDate=2025-11-15`, {
      token: adminSession.sessionToken
    });
    assert.equal(packs2025.items.length, 1);
    assert.equal(packs2025.items[0].rulePackId, "vat-se-2025.6");

    const decision2025 = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-1-api-2025",
          invoice_date: "2025-11-15",
          delivery_date: "2025-11-15",
          tax_date: "2025-11-15"
        })
      }
    });
    assert.equal(decision2025.vatDecision.rulePackId, "vat-se-2025.6");

    const review = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-1-api-review",
          buyer_vat_number_status: null
        })
      }
    });
    assert.equal(review.vatDecision.status, "review_required");
    assert.equal(review.reviewQueueItem.reviewReasonCode, "missing_mandatory_vat_fields");

    const decision = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-1-api-domestic"
        })
      }
    });
    assert.equal(decision.vatDecision.status, "decided");
    assert.ok(decision.vatDecision.inputsHash);
    assert.equal(decision.vatDecision.rulePackId, "vat-se-2026.3");

    const fetched = await requestJson(
      `${baseUrl}/v1/vat/decisions/${decision.vatDecision.vatDecisionId}?companyId=${COMPANY_ID}`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(fetched.vatDecisionId, decision.vatDecision.vatDecisionId);

    const queue = await requestJson(`${baseUrl}/v1/vat/review-queue?companyId=${COMPANY_ID}`, {
      token: adminSession.sessionToken
    });
    assert.equal(queue.items.length, 1);
    assert.equal(queue.items[0].reviewReasonCode, "missing_mandatory_vat_fields");
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
    source_id: "phase4-1-api-default",
    ...overrides
  };
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
