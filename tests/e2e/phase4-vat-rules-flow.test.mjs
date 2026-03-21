import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 4.2 end-to-end flow exposes VAT routes and returns explainable box-level decisions", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-21T23:58:00Z")
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
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.phase4VatEnabled, true);

    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const decision = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-2-e2e-build-sell",
          buyer_country: "SE",
          construction_service_flag: true,
          reverse_charge_flag: true,
          vat_rate: 25,
          tax_rate_candidate: 25,
          goods_or_services: "services",
          vat_code_candidate: "VAT_SE_RC_BUILD_SELL"
        })
      }
    });
    assert.equal(decision.vatDecision.decisionCategory, "construction_reverse_charge_sale");
    assert.deepEqual(decision.vatDecision.declarationBoxAmounts, [
      { boxCode: "41", amount: 1000, amountType: "taxable_base" }
    ]);
    assert.deepEqual(decision.vatDecision.invoiceTextRequirements, [
      "buyer_vat_number_required",
      "reverse_charge_invoice_text_required"
    ]);

    const replay = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-2-e2e-build-sell",
          buyer_country: "SE",
          construction_service_flag: true,
          reverse_charge_flag: true,
          goods_or_services: "services",
          vat_code_candidate: "VAT_SE_RC_BUILD_SELL"
        })
      }
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.vatDecision.vatDecisionId, decision.vatDecision.vatDecisionId);
  } finally {
    await stopServer(server);
  }
});

test("Phase 4.2 feature flag still disables VAT routes cleanly", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-21T23:59:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: false
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const started = await requestJson(baseUrl, "/v1/auth/login", {
      method: "POST",
      body: {
        companyId: COMPANY_ID,
        email: DEMO_ADMIN_EMAIL
      }
    });
    const blocked = await requestJson(baseUrl, `/v1/vat/codes?companyId=${COMPANY_ID}`, {
      token: started.sessionToken,
      expectedStatus: 503
    });
    assert.equal(blocked.error, "feature_disabled");
  } finally {
    await stopServer(server);
  }
});

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });

  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return started.sessionToken;
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
    source_id: "phase4-2-e2e-default",
    ...overrides
  };
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
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
