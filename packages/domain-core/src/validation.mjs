export const VALIDATION_KERNEL_VERSION = "2026.1";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const DIGITS_ONLY_PATTERN = /^\d+$/;
const OCR_REFERENCE_PATTERN = /^\d{2,25}$/;
const ALPHANUMERIC_PATTERN = /^[A-Z0-9]+$/;
const VAT_COUNTRY_ALIASES = Object.freeze({
  EL: "EL",
  GR: "EL"
});
const SUPPORTED_TIME_ZONES = typeof Intl.supportedValuesOf === "function" ? new Set(Intl.supportedValuesOf("timeZone")) : null;

export function normalizeRequiredIsoDate(value, code, options = {}) {
  const normalized = normalizeOptionalIsoDate(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "Date is required.");
  }
  return normalized;
}

export function normalizeOptionalIsoDate(value, code, { errorFactory = null } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
  if (!ISO_DATE_PATTERN.test(normalized)) {
    raiseValidationError(errorFactory, code, "Date must use YYYY-MM-DD.");
  }
  const [year, month, day] = normalized.split("-").map((candidate) => Number(candidate));
  assertValidDate(year, month, day, code, errorFactory);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeRequiredCountryCode(value, code, options = {}) {
  const normalized = normalizeOptionalCountryCode(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "Country code is required.");
  }
  return normalized;
}

export function normalizeOptionalCountryCode(value, code, { errorFactory = null } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!COUNTRY_CODE_PATTERN.test(normalized)) {
    raiseValidationError(errorFactory, code, "Country code must contain exactly two letters.");
  }
  return normalized;
}

export function normalizeRequiredVatCountryCode(value, code, options = {}) {
  const normalized = normalizeOptionalVatCountryCode(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "VAT country code is required.");
  }
  return normalized;
}

export function normalizeOptionalVatCountryCode(value, code, { errorFactory = null } = {}) {
  const normalized = normalizeOptionalCountryCode(value, code, { errorFactory });
  if (!normalized) {
    return null;
  }
  return VAT_COUNTRY_ALIASES[normalized] || normalized;
}

export function normalizeRequiredIanaTimeZone(value, code, options = {}) {
  const normalized = normalizeOptionalIanaTimeZone(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "Time zone is required.");
  }
  return normalized;
}

export function normalizeOptionalIanaTimeZone(value, code, { errorFactory = null } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  try {
    const resolved = new Intl.DateTimeFormat("en-US", { timeZone: normalized }).resolvedOptions().timeZone;
    if (!resolved) {
      raiseValidationError(errorFactory, code, "Time zone is invalid.");
    }
    if (SUPPORTED_TIME_ZONES && !SUPPORTED_TIME_ZONES.has(resolved)) {
      raiseValidationError(errorFactory, code, "Time zone is invalid.");
    }
    return resolved;
  } catch {
    raiseValidationError(errorFactory, code, "Time zone is invalid.");
  }
}

export function normalizeRequiredSwedishOrganizationNumber(value, code, options = {}) {
  const normalized = normalizeOptionalSwedishOrganizationNumber(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "Organization number is required.");
  }
  return normalized;
}

export function normalizeOptionalSwedishOrganizationNumber(value, code, { errorFactory = null } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const digits = extractDigitString(value);
  if (digits.length !== 10 && digits.length !== 12) {
    raiseValidationError(errorFactory, code, "Swedish organization numbers must contain 10 or 12 digits.");
  }
  const canonical = digits.slice(-10);
  if (!isValidMod10Number(canonical)) {
    raiseValidationError(errorFactory, code, "Swedish organization number checksum is invalid.");
  }
  return canonical;
}

export function normalizeRequiredSwedishIdentityNumber(value, code, options = {}) {
  const normalized = normalizeOptionalSwedishIdentityNumber(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "Identity number is required.");
  }
  return normalized;
}

export function normalizeOptionalSwedishIdentityNumber(
  value,
  code,
  {
    errorFactory = null,
    expectedType = null,
    referenceDate = new Date()
  } = {}
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  const digits = extractDigitString(raw);
  if (digits.length !== 10 && digits.length !== 12) {
    raiseValidationError(errorFactory, code, "Identity number must contain 10 or 12 digits.");
  }
  const separator = raw.includes("+") ? "+" : raw.includes("-") ? "-" : null;
  const canonical = digits.slice(-10);
  if (!isValidMod10Number(canonical)) {
    raiseValidationError(errorFactory, code, "Identity number checksum is invalid.");
  }
  const month = Number(canonical.slice(2, 4));
  const rawDay = Number(canonical.slice(4, 6));
  const detectedType = rawDay > 60 ? "samordningsnummer" : "personnummer";
  if (expectedType && expectedType !== detectedType) {
    raiseValidationError(errorFactory, code, `Identity number must be ${expectedType}.`);
  }
  const fullYear = digits.length === 12 ? Number(digits.slice(0, 4)) : inferFullYear({
    twoDigitYear: Number(canonical.slice(0, 2)),
    month,
    rawDay,
    separator,
    referenceDate
  });
  const day = detectedType === "samordningsnummer" ? rawDay - 60 : rawDay;
  assertValidDate(fullYear, month, day, code, errorFactory);
  return canonical;
}

export function normalizeRequiredVatNumber(value, code, options = {}) {
  const normalized = normalizeOptionalVatNumber(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "VAT number is required.");
  }
  return normalized;
}

export function normalizeOptionalVatNumber(value, code, { errorFactory = null, countryCode = null } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const compact = String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact) {
    return null;
  }
  if (!ALPHANUMERIC_PATTERN.test(compact)) {
    raiseValidationError(errorFactory, code, "VAT number may only contain letters and digits.");
  }
  let prefix = null;
  let body = compact;
  if (/^[A-Z]{2}/.test(compact)) {
    prefix = compact.slice(0, 2);
    body = compact.slice(2);
  } else if (countryCode) {
    prefix = normalizeRequiredVatCountryCode(countryCode, code, { errorFactory });
  }
  if (prefix) {
    const normalizedPrefix = normalizeRequiredVatCountryCode(prefix, code, { errorFactory });
    if (!body) {
      raiseValidationError(errorFactory, code, "VAT number body is missing.");
    }
    return `${normalizedPrefix}${body}`;
  }
  return compact;
}

export function normalizeRequiredPaymentReference(value, code, options = {}) {
  const normalized = normalizeOptionalPaymentReference(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "Payment reference is required.");
  }
  return normalized;
}

export function normalizeOptionalPaymentReference(value, code, { errorFactory = null, maxLength = 64 } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }
  if (normalized.length > maxLength) {
    raiseValidationError(errorFactory, code, `Payment reference may not exceed ${maxLength} characters.`);
  }
  return normalized.toUpperCase();
}

export function normalizeRequiredOcrReference(value, code, options = {}) {
  const normalized = normalizeOptionalOcrReference(value, code, options);
  if (!normalized) {
    raiseValidationError(options.errorFactory, code, "OCR reference is required.");
  }
  return normalized;
}

export function normalizeOptionalOcrReference(
  value,
  code,
  {
    errorFactory = null,
    controlMode = "none",
    allowedLengths = null
  } = {}
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = extractDigitString(value);
  if (!OCR_REFERENCE_PATTERN.test(normalized)) {
    raiseValidationError(
      errorFactory,
      code,
      "OCR reference must contain only digits and be between 2 and 25 digits long."
    );
  }
  if (Array.isArray(allowedLengths) && allowedLengths.length > 0 && !allowedLengths.includes(normalized.length)) {
    raiseValidationError(errorFactory, code, "OCR reference length is not allowed.");
  }
  if (controlMode === "length_digit_mod10") {
    const expectedLengthDigit = normalized.length % 10;
    if (Number(normalized[normalized.length - 2]) !== expectedLengthDigit) {
      raiseValidationError(errorFactory, code, "OCR reference length digit is invalid.");
    }
  }
  if (controlMode === "mod10" || controlMode === "length_digit_mod10" || controlMode === "fixed_length_mod10") {
    if (!isValidMod10Number(normalized)) {
      raiseValidationError(errorFactory, code, "OCR reference checksum is invalid.");
    }
  }
  return normalized;
}

function inferFullYear({ twoDigitYear, month, rawDay, separator, referenceDate }) {
  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const todayYear = reference.getUTCFullYear();
  const centuryBase = Math.floor(todayYear / 100) * 100;
  let candidateYear = centuryBase + twoDigitYear;
  const day = rawDay > 60 ? rawDay - 60 : rawDay;
  if (!isValidDate(candidateYear, month, day)) {
    candidateYear -= 100;
  } else {
    const candidateValue = Number(`${candidateYear}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`);
    const referenceValue = Number(
      `${todayYear}${String(reference.getUTCMonth() + 1).padStart(2, "0")}${String(reference.getUTCDate()).padStart(2, "0")}`
    );
    if (candidateValue > referenceValue || separator === "+") {
      candidateYear -= 100;
    }
  }
  if (!isValidDate(candidateYear, month, day)) {
    raiseValidationError(null, "identity_number_date_invalid", "Identity number date part is invalid.");
  }
  return candidateYear;
}

function assertValidDate(year, month, day, code, errorFactory) {
  if (!isValidDate(year, month, day)) {
    raiseValidationError(errorFactory, code, "Date is invalid.");
  }
}

function isValidDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function extractDigitString(value) {
  return String(value).replace(/\D/g, "");
}

function isValidMod10Number(digits) {
  if (!DIGITS_ONLY_PATTERN.test(digits) || digits.length < 2) {
    return false;
  }
  let sum = 0;
  for (let index = 0; index < digits.length - 1; index += 1) {
    let digit = Number(digits[index]);
    digit *= index % 2 === 0 ? 2 : 1;
    if (digit > 9) {
      digit -= 9;
    }
    sum += digit;
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return expectedCheckDigit === Number(digits[digits.length - 1]);
}

function raiseValidationError(errorFactory, code, message) {
  if (typeof errorFactory === "function") {
    throw errorFactory(400, code, message);
  }
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  throw error;
}
