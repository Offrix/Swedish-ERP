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
