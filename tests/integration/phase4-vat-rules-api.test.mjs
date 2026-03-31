import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 4.2 migration and seed add VAT execution tables and rule-pack updates", async () => {
  const migration = await readText("packages/db/migrations/20260321090000_phase4_vat_rule_execution.sql");
  for (const fragment of [
    "ALTER TABLE vat_decisions",
    "CREATE TABLE IF NOT EXISTS vat_decision_box_amounts",
    "CREATE TABLE IF NOT EXISTS vat_decision_posting_entries"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321090010_phase4_vat_rules_seed.sql");
  for (const fragment of [
    "vat-se-2026.2",
    "VAT_SE_RC_BUILD_PURCHASE",
    '["39"]',
    '["40"]'
  ]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Phase 4.2 API returns derived declaration-box amounts and mirrored credit notes", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-21T23:57:00Z")
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

    const decision = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase4-2-api-import",
          source_type: "AP_IMPORT",
          supply_type: "purchase",
          seller_country: "CN",
          buyer_country: "SE",
          goods_or_services: "goods",
          import_flag: true,
          vat_code_candidate: "VAT_SE_IMPORT_GOODS",
          line_amount_ex_vat: 2400
        })
      }
    });
    assert.equal(decision.vatDecision.rulePackId, "vat-se-2026.3");
    assert.deepEqual(decision.vatDecision.declarationBoxAmounts, [
      { boxCode: "50", amount: 2400, amountType: "taxable_base" },
      { boxCode: "60", amount: 600, amountType: "output_vat" },
      { boxCode: "48", amount: 600, amountType: "input_vat" }
    ]);

    const original = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AR_INVOICE",
          source_id: "phase4-2-api-credit-original",
          vat_code_candidate: "VAT_SE_DOMESTIC_25"
        })
      }
    });

    const mirrored = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AR_CREDIT_NOTE",
          source_id: "phase4-2-api-credit-note",
          credit_note_flag: true,
          original_vat_decision_id: original.vatDecision.vatDecisionId,
          vat_code_candidate: "VAT_SE_DOMESTIC_25"
        })
      }
    });
    assert.equal(mirrored.vatDecision.decisionCategory, "credit_note_mirror");
    assert.deepEqual(mirrored.vatDecision.declarationBoxAmounts, [
      { boxCode: "05", amount: -1000, amountType: "taxable_base" },
      { boxCode: "10", amount: -250, amountType: "output_vat" }
    ]);

    const review = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AR_CREDIT_NOTE",
          source_id: "phase4-2-api-credit-missing",
          credit_note_flag: true,
          original_vat_decision_id: "00000000-0000-4000-8000-999999999999",
          vat_code_candidate: "VAT_SE_DOMESTIC_25"
        })
      }
    });
    assert.equal(review.vatDecision.status, "review_required");
    assert.equal(review.reviewQueueItem.reviewReasonCode, "original_vat_decision_missing");
  } finally {
    await stopServer(server);
  }
});

test("Phase 8.3 API models domestic supplier-charged partial and blocked deduction without forcing review", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-31T09:00:00Z")
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

    const partial = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AP_INVOICE",
          source_id: "phase8-3-api-domestic-partial-deduction",
          supply_type: "purchase",
          seller_country: "SE",
          buyer_country: "SE",
          goods_or_services: "services",
          vat_rate: 25,
          tax_rate_candidate: 25,
          vat_code_candidate: "VAT_SE_DOMESTIC_25",
          line_amount_ex_vat: 1200,
          deduction_ratio: 0.5
        })
      }
    });
    assert.equal(partial.vatDecision.status, "decided");
    assert.equal(partial.vatDecision.deductionRuleCode, "partial_deduction");
    assert.deepEqual(partial.vatDecision.declarationBoxAmounts, [{ boxCode: "48", amount: 150, amountType: "input_vat" }]);

    const blocked = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AP_INVOICE",
          source_id: "phase8-3-api-domestic-blocked-deduction",
          supply_type: "purchase",
          seller_country: "SE",
          buyer_country: "SE",
          goods_or_services: "services",
          vat_rate: 25,
          tax_rate_candidate: 25,
          vat_code_candidate: "VAT_SE_DOMESTIC_25",
          line_amount_ex_vat: 1200,
          deduction_ratio: 0
        })
      }
    });
    assert.equal(blocked.vatDecision.status, "decided");
    assert.equal(blocked.vatDecision.deductionRuleCode, "blocked_deduction");
    assert.deepEqual(blocked.vatDecision.declarationBoxAmounts, []);

    const propertyService = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase8-3-api-property-service",
          buyer_country: "DE",
          goods_or_services: "services",
          property_related_flag: true,
          vat_code_candidate: "VAT_SE_EU_SERVICES_B2B"
        })
      }
    });
    assert.equal(propertyService.vatDecision.status, "review_required");
    assert.equal(propertyService.reviewQueueItem.reviewReasonCode, "property_service_requires_property_jurisdiction");

    const passengerTransport = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AP_INVOICE",
          source_id: "phase8-3-api-passenger-transport",
          supply_type: "purchase",
          seller_country: "DE",
          buyer_country: "SE",
          goods_or_services: "services",
          supply_subtype: "passenger_transport",
          vat_code_candidate: "VAT_SE_EU_SERVICES_PURCHASE_RC"
        })
      }
    });
    assert.equal(passengerTransport.vatDecision.status, "review_required");
    assert.equal(passengerTransport.reviewQueueItem.reviewReasonCode, "passenger_transport_requires_route_jurisdiction");

    const eventAdmission = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase8-3-api-event-admission",
          buyer_country: "FR",
          goods_or_services: "services",
          supply_subtype: "event_admission",
          vat_code_candidate: "VAT_SE_EU_SERVICES_B2B"
        })
      }
    });
    assert.equal(eventAdmission.vatDecision.status, "review_required");
    assert.equal(eventAdmission.reviewQueueItem.reviewReasonCode, "event_admission_requires_event_jurisdiction");

    const restaurantService = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AP_INVOICE",
          source_id: "phase8-3-api-restaurant-service",
          supply_type: "purchase",
          seller_country: "DK",
          buyer_country: "SE",
          goods_or_services: "services",
          supply_subtype: "restaurant_catering",
          vat_code_candidate: "VAT_SE_EU_SERVICES_PURCHASE_RC"
        })
      }
    });
    assert.equal(restaurantService.vatDecision.status, "review_required");
    assert.equal(restaurantService.reviewQueueItem.reviewReasonCode, "restaurant_service_requires_service_jurisdiction");

    const passengerCarPurchase = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AP_INVOICE",
          source_id: "phase8-3-api-passenger-car-purchase",
          supply_type: "purchase",
          seller_country: "SE",
          buyer_country: "SE",
          goods_or_services: "goods",
          supply_subtype: "passenger_car_purchase",
          vat_code_candidate: "VAT_SE_DOMESTIC_25",
          line_amount_ex_vat: 200000
        })
      }
    });
    assert.equal(passengerCarPurchase.vatDecision.status, "review_required");
    assert.equal(passengerCarPurchase.reviewQueueItem.reviewReasonCode, "passenger_car_purchase_requires_exception_review");

    const passengerCarLease = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AP_INVOICE",
          source_id: "phase8-3-api-passenger-car-lease",
          supply_type: "purchase",
          seller_country: "SE",
          buyer_country: "SE",
          goods_or_services: "services",
          supply_subtype: "passenger_car_lease",
          vat_code_candidate: "VAT_SE_DOMESTIC_25",
          line_amount_ex_vat: 1200,
          deduction_ratio: 0.5
        })
      }
    });
    assert.equal(passengerCarLease.vatDecision.status, "decided");
    assert.equal(passengerCarLease.vatDecision.deductionRuleCode, "partial_deduction");
    assert.deepEqual(passengerCarLease.vatDecision.declarationBoxAmounts, [{ boxCode: "48", amount: 150, amountType: "input_vat" }]);

    const representation = await requestJson(`${baseUrl}/v1/vat/decisions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_type: "AP_INVOICE",
          source_id: "phase8-3-api-representation",
          supply_type: "purchase",
          seller_country: "SE",
          buyer_country: "SE",
          goods_or_services: "services",
          supply_subtype: "representation",
          vat_code_candidate: "VAT_SE_DOMESTIC_12",
          vat_rate: 12,
          tax_rate_candidate: 12,
          line_amount_ex_vat: 1000
        })
      }
    });
    assert.equal(representation.vatDecision.status, "review_required");
    assert.equal(representation.reviewQueueItem.reviewReasonCode, "representation_requires_explicit_vat_basis");
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
    source_id: "phase4-2-api-default",
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
