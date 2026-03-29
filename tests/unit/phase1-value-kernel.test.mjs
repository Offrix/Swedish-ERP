import test from "node:test";
import assert from "node:assert/strict";

import {
  VALUE_KERNEL_VERSION,
  amountToMinorUnits,
  createFxRate,
  createMoneyAmount,
  createQuantity,
  createRate,
  minorUnitsToAmount,
  normalizeAmount,
  normalizePositiveAmount,
  normalizeSignedAmount,
  roundMoney,
  roundQuantity,
  roundRate
} from "../../packages/domain-core/src/value-kernel.mjs";

test("value kernel exposes a pinned version", () => {
  assert.equal(VALUE_KERNEL_VERSION, "2026-03-29");
});

test("roundMoney uses canonical two-decimal rounding for positive and negative values", () => {
  assert.equal(roundMoney(10.005), 10.01);
  assert.equal(roundMoney(-10.005), -10.01);
  assert.equal(roundMoney("10,004"), 10);
});

test("amount normalization enforces numeric inputs and positive-only variant", () => {
  assert.equal(normalizeAmount("-25.556", "amount_invalid"), -25.56);
  assert.equal(normalizeSignedAmount(-3.214, "signed_amount_invalid"), -3.21);
  assert.equal(normalizePositiveAmount("25.554", "positive_amount_invalid"), 25.55);
  assert.throws(() => normalizePositiveAmount(-1, "positive_amount_invalid"), /Amount must be zero or positive/);
  assert.throws(() => normalizeAmount("abc", "amount_invalid"), /Value must be numeric/);
});

test("rate and quantity round with independent precision", () => {
  assert.equal(roundRate(0.123456789), 0.123457);
  assert.equal(roundQuantity(12.345678), 12.3457);
});

test("MoneyAmount stores minor units and normalized currency metadata", () => {
  const money = createMoneyAmount("123.456", { currencyCode: "sek", source: "unit_test" });
  assert.deepEqual(money, {
    amountMinor: 12346,
    currencyCode: "SEK",
    scale: 2,
    source: "unit_test",
    amount: 123.46
  });
  assert.throws(() => createMoneyAmount(1, { currencyCode: "SE", source: "unit_test" }), /Currency code must be a three-letter ISO code/);
});

test("Rate and FxRate preserve canonical metadata", () => {
  const rate = createRate("0.1234567", { precision: 5, source: "unit_test" });
  assert.deepEqual(rate, {
    numerator: 12346,
    denominator: 100000,
    precision: 5,
    source: "unit_test",
    value: 0.12346
  });

  const fxRate = createFxRate({
    baseCurrency: "sek",
    quoteCurrency: "eur",
    rate: "0.0912345",
    rateScale: 6,
    source: "ecb",
    observedAt: "2026-03-29T12:30:00+01:00"
  });
  assert.deepEqual(fxRate, {
    baseCurrency: "SEK",
    quoteCurrency: "EUR",
    rate: 0.091235,
    rateScale: 6,
    source: "ecb",
    observedAt: "2026-03-29T11:30:00.000Z"
  });
});

test("Quantity and minor-unit conversions remain reversible for canonical scales", () => {
  const quantity = createQuantity("12.34567", { precision: 3, source: "unit_test" });
  assert.deepEqual(quantity, {
    value: 12.346,
    precision: 3,
    source: "unit_test"
  });

  assert.equal(amountToMinorUnits(12.34), 1234);
  assert.equal(minorUnitsToAmount(1234), 12.34);
  assert.throws(() => minorUnitsToAmount(12.34), /Minor amount must be an integer/);
});
