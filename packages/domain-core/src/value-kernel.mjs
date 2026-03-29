export const VALUE_KERNEL_VERSION = "2026-03-29";

const DEFAULT_MONEY_SCALE = 2;
const DEFAULT_RATE_PRECISION = 6;
const DEFAULT_QUANTITY_PRECISION = 4;
const MAX_SCALE = 9;

export function roundMoney(value) {
  return roundWithScale(value, DEFAULT_MONEY_SCALE, "money_amount_invalid");
}

export function normalizeAmount(value, code = "amount_invalid") {
  return roundWithScale(value, DEFAULT_MONEY_SCALE, code);
}

export function normalizePositiveAmount(value, code = "amount_invalid") {
  const normalized = normalizeAmount(value, code);
  if (normalized < 0) {
    throw createValueKernelError(code, "Amount must be zero or positive.");
  }
  return normalized;
}

export function normalizeSignedAmount(value, code = "amount_invalid") {
  return normalizeAmount(value, code);
}

export function roundRate(value, precision = DEFAULT_RATE_PRECISION) {
  return roundWithScale(value, normalizeScale(precision, "rate_precision_invalid", DEFAULT_RATE_PRECISION), "rate_invalid");
}

export function roundQuantity(value, precision = DEFAULT_QUANTITY_PRECISION) {
  return roundWithScale(value, normalizeScale(precision, "quantity_precision_invalid", DEFAULT_QUANTITY_PRECISION), "quantity_invalid");
}

export function createMoneyAmount(value, { currencyCode = "SEK", scale = DEFAULT_MONEY_SCALE, source = "runtime" } = {}) {
  const resolvedScale = normalizeScale(scale, "money_scale_invalid", DEFAULT_MONEY_SCALE);
  const roundedAmount = roundWithScale(value, resolvedScale, "money_amount_invalid");
  return Object.freeze({
    amountMinor: amountToMinorUnits(roundedAmount, resolvedScale),
    currencyCode: normalizeCurrencyCode(currencyCode, "money_currency_invalid"),
    scale: resolvedScale,
    source: normalizeSource(source, "money_source_invalid"),
    amount: roundedAmount
  });
}

export function createRate(value, { precision = DEFAULT_RATE_PRECISION, source = "runtime" } = {}) {
  const resolvedPrecision = normalizeScale(precision, "rate_precision_invalid", DEFAULT_RATE_PRECISION);
  const roundedValue = roundWithScale(value, resolvedPrecision, "rate_invalid");
  const denominator = 10 ** resolvedPrecision;
  return Object.freeze({
    numerator: Math.round(roundedValue * denominator),
    denominator,
    precision: resolvedPrecision,
    source: normalizeSource(source, "rate_source_invalid"),
    value: roundedValue
  });
}

export function createQuantity(value, { precision = DEFAULT_QUANTITY_PRECISION, source = "runtime" } = {}) {
  const resolvedPrecision = normalizeScale(precision, "quantity_precision_invalid", DEFAULT_QUANTITY_PRECISION);
  const roundedValue = roundWithScale(value, resolvedPrecision, "quantity_invalid");
  return Object.freeze({
    value: roundedValue,
    precision: resolvedPrecision,
    source: normalizeSource(source, "quantity_source_invalid")
  });
}

export function createFxRate({
  baseCurrency,
  quoteCurrency,
  rate,
  rateScale = DEFAULT_RATE_PRECISION,
  source = "runtime",
  observedAt = null
} = {}) {
  const normalizedObservedAt = observedAt == null ? null : normalizeIsoTimestamp(observedAt, "fx_rate_observed_at_invalid");
  const resolvedRate = createRate(rate, { precision: rateScale, source });
  return Object.freeze({
    baseCurrency: normalizeCurrencyCode(baseCurrency, "fx_base_currency_invalid"),
    quoteCurrency: normalizeCurrencyCode(quoteCurrency, "fx_quote_currency_invalid"),
    rate: resolvedRate.value,
    rateScale: resolvedRate.precision,
    source: resolvedRate.source,
    observedAt: normalizedObservedAt
  });
}

export function amountToMinorUnits(value, scale = DEFAULT_MONEY_SCALE) {
  const resolvedScale = normalizeScale(scale, "money_scale_invalid", DEFAULT_MONEY_SCALE);
  const normalizedAmount = roundWithScale(value, resolvedScale, "money_amount_invalid");
  return Math.round(normalizedAmount * 10 ** resolvedScale);
}

export function minorUnitsToAmount(value, scale = DEFAULT_MONEY_SCALE) {
  const resolvedScale = normalizeScale(scale, "money_scale_invalid", DEFAULT_MONEY_SCALE);
  const numericValue = normalizeFiniteNumber(value, "money_minor_amount_invalid");
  if (!Number.isInteger(numericValue)) {
    throw createValueKernelError("money_minor_amount_invalid", "Minor amount must be an integer.");
  }
  return roundWithScale(numericValue / 10 ** resolvedScale, resolvedScale, "money_minor_amount_invalid");
}

export function createValueKernelError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  return error;
}

function roundWithScale(value, scale, code) {
  const numericValue = normalizeFiniteNumber(value, code);
  const factor = 10 ** scale;
  const adjusted = numericValue >= 0 ? numericValue + Number.EPSILON : numericValue - Number.EPSILON;
  return Math.round(adjusted * factor) / factor;
}

function normalizeFiniteNumber(value, code) {
  const numericValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(numericValue)) {
    throw createValueKernelError(code, "Value must be numeric.");
  }
  return numericValue;
}

function normalizeScale(value, code, defaultValue) {
  const resolvedValue = value == null ? defaultValue : Number(value);
  if (!Number.isInteger(resolvedValue) || resolvedValue < 0 || resolvedValue > MAX_SCALE) {
    throw createValueKernelError(code, `Scale or precision must be an integer between 0 and ${MAX_SCALE}.`);
  }
  return resolvedValue;
}

function normalizeCurrencyCode(value, code) {
  const resolvedValue = normalizeSource(value, code).toUpperCase();
  if (!/^[A-Z]{3}$/.test(resolvedValue)) {
    throw createValueKernelError(code, "Currency code must be a three-letter ISO code.");
  }
  return resolvedValue;
}

function normalizeSource(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createValueKernelError(code, "Source is required.");
  }
  return value.trim();
}

function normalizeIsoTimestamp(value, code) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) {
    throw createValueKernelError(code, "Timestamp must be a valid ISO value.");
  }
  return timestamp.toISOString();
}
