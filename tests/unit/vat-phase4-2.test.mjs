import test from "node:test";
import assert from "node:assert/strict";
import { createVatEngine } from "../../packages/domain-vat/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 4.2 derives declaration-box amounts for domestic, import and reverse-charge scenarios", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-21T23:55:00Z")
  });

  const domestic = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase4-2-unit-domestic-12",
      vat_rate: 12,
      tax_rate_candidate: 12,
      vat_code_candidate: "VAT_SE_DOMESTIC_12",
      line_amount_ex_vat: 800
    })
  });
  assert.equal(domestic.vatDecision.rulePackId, "vat-se-2026.3");
  assert.equal(domestic.vatDecision.decisionCategory, "domestic_standard_sale");
  assert.deepEqual(domestic.vatDecision.declarationBoxAmounts, [
    { boxCode: "05", amount: 800, amountType: "taxable_base" },
    { boxCode: "11", amount: 96, amountType: "output_vat" }
  ]);

  const importDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_IMPORT",
      source_id: "phase4-2-unit-import",
      supply_type: "purchase",
      seller_country: "CN",
      buyer_country: "SE",
      goods_or_services: "goods",
      import_flag: true,
      export_flag: false,
      reverse_charge_flag: false,
      vat_rate: 25,
      tax_rate_candidate: 25,
      vat_code_candidate: "VAT_SE_IMPORT_GOODS",
      line_amount_ex_vat: 2400
    })
  });
  assert.deepEqual(importDecision.vatDecision.declarationBoxAmounts, [
    { boxCode: "50", amount: 2400, amountType: "taxable_base" },
    { boxCode: "60", amount: 600, amountType: "output_vat" },
    { boxCode: "48", amount: 600, amountType: "input_vat" }
  ]);
  assert.deepEqual(importDecision.vatDecision.postingEntries, [
    { entryCode: "output_vat_self_assessed", direction: "credit", amount: 600, vatEffect: "output_vat" },
    { entryCode: "input_vat_deductible", direction: "debit", amount: 600, vatEffect: "input_vat" }
  ]);

  const domesticPurchase = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase4-2-unit-domestic-purchase",
      supply_type: "purchase",
      seller_country: "SE",
      buyer_country: "SE",
      goods_or_services: "services",
      vat_rate: 25,
      tax_rate_candidate: 25,
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      line_amount_ex_vat: 1200
    })
  });
  assert.equal(domesticPurchase.vatDecision.decisionCategory, "domestic_supplier_charged_purchase");
  assert.equal(domesticPurchase.vatDecision.vatCode, "VAT_SE_DOMESTIC_PURCHASE_25");
  assert.deepEqual(domesticPurchase.vatDecision.declarationBoxAmounts, [{ boxCode: "48", amount: 300, amountType: "input_vat" }]);
  assert.deepEqual(domesticPurchase.vatDecision.postingEntries, [
    { entryCode: "input_vat_supplier_charged", direction: "debit", amount: 300, vatEffect: "input_vat" }
  ]);

  const reverseCharge = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase4-2-unit-eu-service-purchase",
      supply_type: "purchase",
      seller_country: "DE",
      buyer_country: "SE",
      goods_or_services: "services",
      import_flag: false,
      export_flag: false,
      reverse_charge_flag: false,
      vat_rate: 25,
      tax_rate_candidate: 25,
      vat_code_candidate: "VAT_SE_EU_SERVICES_PURCHASE_RC",
      line_amount_ex_vat: 1000
    })
  });
  assert.equal(reverseCharge.vatDecision.decisionCategory, "eu_services_purchase_reverse_charge");
  assert.deepEqual(reverseCharge.vatDecision.declarationBoxAmounts, [
    { boxCode: "21", amount: 1000, amountType: "taxable_base" },
    { boxCode: "30", amount: 250, amountType: "output_vat" },
    { boxCode: "48", amount: 250, amountType: "input_vat" }
  ]);

  const summary = vat.summarizeVatDeclarationBoxes({ companyId: COMPANY_ID });
  assert.deepEqual(summary, [
    { boxCode: "05", amountType: "taxable_base", amount: 800 },
    { boxCode: "11", amountType: "output_vat", amount: 96 },
    { boxCode: "21", amountType: "taxable_base", amount: 1000 },
    { boxCode: "30", amountType: "output_vat", amount: 250 },
    { boxCode: "48", amountType: "input_vat", amount: 1150 },
    { boxCode: "50", amountType: "taxable_base", amount: 2400 },
    { boxCode: "60", amountType: "output_vat", amount: 600 }
  ]);
});

test("Phase 4.2 mirrors original VAT decisions for credit notes and reviews missing originals", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-21T23:56:00Z")
  });

  const original = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AR_INVOICE",
      source_id: "phase4-2-unit-credit-original",
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      line_amount_ex_vat: 1000
    })
  });

  const mirrored = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AR_CREDIT_NOTE",
      source_id: "phase4-2-unit-credit-note",
      credit_note_flag: true,
      original_vat_decision_id: original.vatDecision.vatDecisionId,
      vat_code_candidate: "VAT_SE_DOMESTIC_25"
    })
  });
  assert.equal(mirrored.vatDecision.decisionCategory, "credit_note_mirror");
  assert.deepEqual(mirrored.vatDecision.declarationBoxAmounts, [
    { boxCode: "05", amount: -1000, amountType: "taxable_base" },
    { boxCode: "10", amount: -250, amountType: "output_vat" }
  ]);

  const missingOriginal = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AR_CREDIT_NOTE",
      source_id: "phase4-2-unit-credit-note-missing",
      credit_note_flag: true,
      original_vat_decision_id: "00000000-0000-4000-8000-999999999999",
      vat_code_candidate: "VAT_SE_DOMESTIC_25"
    })
  });
  assert.equal(missingOriginal.vatDecision.status, "review_required");
  assert.equal(missingOriginal.reviewQueueItem.reviewReasonCode, "original_vat_decision_missing");
});

test("Phase 8.3 models domestic supplier-charged partial and blocked deduction without forced review", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-31T08:45:00Z")
  });

  const partial = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-domestic-partial-deduction",
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
  });
  assert.equal(partial.vatDecision.status, "decided");
  assert.equal(partial.vatDecision.deductionRuleCode, "partial_deduction");
  assert.deepEqual(partial.vatDecision.declarationBoxAmounts, [{ boxCode: "48", amount: 150, amountType: "input_vat" }]);
  assert.deepEqual(partial.vatDecision.postingEntries, [
    { entryCode: "input_vat_supplier_charged", direction: "debit", amount: 150, vatEffect: "input_vat" }
  ]);

  const blocked = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-domestic-blocked-deduction",
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
  });
  assert.equal(blocked.vatDecision.status, "decided");
  assert.equal(blocked.vatDecision.deductionRuleCode, "blocked_deduction");
  assert.deepEqual(blocked.vatDecision.declarationBoxAmounts, []);
  assert.deepEqual(blocked.vatDecision.postingEntries, []);
});

test("Phase 8.3 blocks cross-border service place-of-supply exceptions from default reverse-charge automation", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-31T09:15:00Z")
  });

  const propertyService = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-property-service",
      buyer_country: "DE",
      goods_or_services: "services",
      property_related_flag: true,
      vat_code_candidate: "VAT_SE_EU_SERVICES_B2B"
    })
  });
  assert.equal(propertyService.vatDecision.status, "review_required");
  assert.equal(propertyService.reviewQueueItem.reviewReasonCode, "property_service_requires_property_jurisdiction");

  const passengerTransport = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-passenger-transport",
      supply_type: "purchase",
      seller_country: "DE",
      buyer_country: "SE",
      goods_or_services: "services",
      supply_subtype: "passenger_transport",
      vat_code_candidate: "VAT_SE_EU_SERVICES_PURCHASE_RC"
    })
  });
  assert.equal(passengerTransport.vatDecision.status, "review_required");
  assert.equal(passengerTransport.reviewQueueItem.reviewReasonCode, "passenger_transport_requires_route_jurisdiction");

  const eventAdmission = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase8-3-unit-event-admission",
      buyer_country: "FR",
      goods_or_services: "services",
      supply_subtype: "event_admission",
      vat_code_candidate: "VAT_SE_EU_SERVICES_B2B"
    })
  });
  assert.equal(eventAdmission.vatDecision.status, "review_required");
  assert.equal(eventAdmission.reviewQueueItem.reviewReasonCode, "event_admission_requires_event_jurisdiction");

  const restaurantService = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-restaurant-service",
      supply_type: "purchase",
      seller_country: "DK",
      buyer_country: "SE",
      goods_or_services: "services",
      supply_subtype: "restaurant_catering",
      vat_code_candidate: "VAT_SE_EU_SERVICES_PURCHASE_RC"
    })
  });
  assert.equal(restaurantService.vatDecision.status, "review_required");
  assert.equal(restaurantService.reviewQueueItem.reviewReasonCode, "restaurant_service_requires_service_jurisdiction");
});

test("Phase 8.3 blocks passenger-car purchase and representation auto-deduction while allowing explicit 50 percent lease deduction", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-31T09:30:00Z")
  });

  const passengerCarPurchase = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-passenger-car-purchase",
      supply_type: "purchase",
      seller_country: "SE",
      buyer_country: "SE",
      goods_or_services: "goods",
      supply_subtype: "passenger_car_purchase",
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      line_amount_ex_vat: 200000
    })
  });
  assert.equal(passengerCarPurchase.vatDecision.status, "review_required");
  assert.equal(passengerCarPurchase.reviewQueueItem.reviewReasonCode, "passenger_car_purchase_requires_exception_review");

  const passengerCarLease = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-passenger-car-lease",
      supply_type: "purchase",
      seller_country: "SE",
      buyer_country: "SE",
      goods_or_services: "services",
      supply_subtype: "passenger_car_lease",
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      line_amount_ex_vat: 1200,
      deduction_ratio: 0.5
    })
  });
  assert.equal(passengerCarLease.vatDecision.status, "decided");
  assert.equal(passengerCarLease.vatDecision.deductionRuleCode, "partial_deduction");
  assert.deepEqual(passengerCarLease.vatDecision.declarationBoxAmounts, [{ boxCode: "48", amount: 150, amountType: "input_vat" }]);

  const passengerCarLeaseWithoutRatio = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-passenger-car-lease-missing-ratio",
      supply_type: "purchase",
      seller_country: "SE",
      buyer_country: "SE",
      goods_or_services: "services",
      supply_subtype: "passenger_car_lease",
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      line_amount_ex_vat: 1200
    })
  });
  assert.equal(passengerCarLeaseWithoutRatio.vatDecision.status, "review_required");
  assert.equal(passengerCarLeaseWithoutRatio.reviewQueueItem.reviewReasonCode, "passenger_car_lease_requires_explicit_deduction_ratio");

  const representation = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_type: "AP_INVOICE",
      source_id: "phase8-3-unit-representation",
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
  });
  assert.equal(representation.vatDecision.status, "review_required");
  assert.equal(representation.reviewQueueItem.reviewReasonCode, "representation_requires_explicit_vat_basis");
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
    source_id: "phase4-2-unit-default",
    ...overrides
  };
}
