import test from "node:test";
import assert from "node:assert/strict";
import { createVatEngine } from "../../packages/domain-vat/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 4.1 returns traceable VAT decisions and replays historical rule packs deterministically", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-21T23:30:00Z")
  });

  const historical = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-1-unit-2025",
      invoice_date: "2025-11-15",
      delivery_date: "2025-11-15",
      tax_date: "2025-11-15"
    })
  });
  assert.equal(historical.vatDecision.rulePackId, "vat-se-2025.6");
  assert.equal(historical.vatDecision.status, "decided");
  assert.ok(historical.vatDecision.inputsHash);
  assert.match(historical.vatDecision.explanation.join(" "), /rule_pack_id=vat-se-2025\.6/);

  const current = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-1-unit-2026",
      invoice_date: "2026-03-21",
      delivery_date: "2026-03-21",
      tax_date: "2026-03-21"
    })
  });
  assert.equal(current.vatDecision.rulePackId, "vat-se-2026.3");
  assert.deepEqual(current.vatDecision.declarationBoxCodes, ["05", "10"]);
  assert.equal(current.vatDecision.bookingTemplateCode, "vat_se_domestic_25");

  const replay = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-1-unit-2026",
      invoice_date: "2026-03-21",
      delivery_date: "2026-03-21",
      tax_date: "2026-03-21"
    })
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.vatDecision.vatDecisionId, current.vatDecision.vatDecisionId);
});

test("Phase 4.1 routes unclear VAT cases to review queue instead of silent auto-booking", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-21T23:35:00Z")
  });

  const review = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-1-unit-review",
      line_quantity: null
    })
  });

  assert.equal(review.vatDecision.status, "review_required");
  assert.equal(review.vatDecision.vatCode, "VAT_REVIEW_REQUIRED");
  assert.equal(review.reviewQueueItem.reviewReasonCode, "missing_mandatory_vat_fields");
  assert.equal(vat.listVatReviewQueue({ companyId: COMPANY_ID }).length, 1);
});

test("Phase 8.3 persists VIES truth, normalizes Greece to EL and blocks EU goods without valid VIES status", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-31T00:15:00Z")
  });

  const greekDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-el-vies-valid",
      buyer_country: "GR",
      buyer_vat_no: "GR123456789",
      buyer_vat_number: "GR123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number_status: "valid",
      goods_or_services: "goods",
      vat_code_candidate: "VAT_SE_EU_GOODS_B2B"
    })
  });

  assert.equal(greekDecision.vatDecision.status, "decided");
  assert.equal(greekDecision.vatDecision.transactionLine.buyer_country, "EL");
  assert.equal(greekDecision.vatDecision.transactionLine.buyer_vat_number, "EL123456789");
  assert.equal(greekDecision.vatDecision.outputs.viesStatus, "valid");
  assert.equal(greekDecision.vatDecision.viesStatus, "valid");
  assert.equal(greekDecision.vatDecision.outputs.euListEligible, true);
  assert.equal(greekDecision.vatDecision.decisionCategory, "eu_goods_b2b_sale");
  assert.deepEqual(greekDecision.vatDecision.declarationBoxCodes, ["35"]);

  const invalidDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-invalid-vies",
      buyer_country: "DE",
      buyer_vat_no: "DE123456789",
      buyer_vat_number: "DE123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number_status: "invalid",
      goods_or_services: "goods",
      vat_code_candidate: "VAT_SE_EU_GOODS_B2B"
    })
  });

  assert.equal(invalidDecision.vatDecision.status, "review_required");
  assert.equal(invalidDecision.vatDecision.outputs.viesStatus, "invalid");
  assert.equal(invalidDecision.vatDecision.viesStatus, "invalid");
  assert.equal(invalidDecision.reviewQueueItem.reviewReasonCode, "buyer_vat_number_not_vies_valid");
});

test("Phase 8.3 requires valid VIES truth for EU B2B services before reverse-charge treatment is accepted", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-31T00:25:00Z")
  });

  const validServiceDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-eu-service-vies-valid",
      buyer_country: "DE",
      buyer_vat_no: "DE123456789",
      buyer_vat_number: "DE123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number_status: "valid",
      goods_or_services: "services",
      vat_code_candidate: "VAT_SE_EU_SERVICES_B2B"
    })
  });

  assert.equal(validServiceDecision.vatDecision.status, "decided");
  assert.equal(validServiceDecision.vatDecision.decisionCategory, "eu_services_b2b_sale");
  assert.equal(validServiceDecision.vatDecision.outputs.viesStatus, "valid");
  assert.equal(validServiceDecision.vatDecision.outputs.euListEligible, true);
  assert.deepEqual(validServiceDecision.vatDecision.declarationBoxCodes, ["39"]);
  assert.equal(
    validServiceDecision.vatDecision.invoiceTextRequirements.includes("reverse_charge_invoice_text_required"),
    true
  );

  const invalidServiceDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-eu-service-vies-invalid",
      buyer_country: "DE",
      buyer_vat_no: "DE123456789",
      buyer_vat_number: "DE123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number_status: "invalid",
      goods_or_services: "services",
      vat_code_candidate: "VAT_SE_EU_SERVICES_B2B"
    })
  });

  assert.equal(invalidServiceDecision.vatDecision.status, "review_required");
  assert.equal(invalidServiceDecision.vatDecision.outputs.viesStatus, "invalid");
  assert.equal(invalidServiceDecision.reviewQueueItem.reviewReasonCode, "buyer_vat_number_not_vies_valid");
});

test("Phase 8.3 uses prepayment date as effective VAT date when it precedes invoice date and no explicit tax date exists", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-31T11:00:00Z")
  });

  const prepaymentDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-prepayment-effective-date",
      invoice_date: "2026-01-10",
      delivery_date: "2026-01-10",
      tax_date: null,
      prepayment_date: "2025-12-20"
    })
  });
  assert.equal(prepaymentDecision.vatDecision.effectiveDate, "2025-12-20");
  assert.equal(prepaymentDecision.vatDecision.rulePackId, "vat-se-2025.6");

  const explicitTaxDateDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-tax-date-wins",
      invoice_date: "2026-01-10",
      delivery_date: "2026-01-10",
      tax_date: "2026-01-05",
      prepayment_date: "2025-12-20"
    })
  });
  assert.equal(explicitTaxDateDecision.vatDecision.effectiveDate, "2026-01-05");
  assert.equal(explicitTaxDateDecision.vatDecision.rulePackId, "vat-se-2026.3");
});

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
    source_id: "phase4-1-unit-default",
    ...overrides
  };
}
