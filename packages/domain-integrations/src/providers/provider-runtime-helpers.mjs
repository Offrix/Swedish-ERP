import crypto from "node:crypto";

export function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, `${code} is required.`);
  }
  return normalized;
}

export function normalizeOptionalText(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).trim() || null;
}

export function normalizeUpperCode(value, code, length) {
  const normalized = requireText(value, code).toUpperCase();
  if (length && normalized.length !== length) {
    throw createError(400, code, `${code} must have length ${length}.`);
  }
  return normalized;
}

export function normalizeMoney(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createError(400, code, `${code} must be greater than zero.`);
  }
  return Math.round(number * 100) / 100;
}

export function normalizeDate(value, code) {
  const normalized = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, `${code} must use YYYY-MM-DD.`);
  }
  return normalized;
}

export function nowIso(clock) {
  return clock().toISOString();
}

export function addDaysIso(date, days) {
  const parsed = new Date(`${normalizeDate(date, "provider_date_invalid")}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + Number(days || 0));
  return parsed.toISOString().slice(0, 10);
}

export function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function resolveProviderMode(environmentMode) {
  const normalized = normalizeOptionalText(environmentMode) || "test";
  return ["production", "pilot_parallel"].includes(normalized) ? "production" : "sandbox";
}

export function defaultProviderEnvironmentRef(environmentMode, providerMode) {
  const normalized = normalizeOptionalText(environmentMode) || "test";
  if (normalized === "trial") {
    return "trial_safe";
  }
  if (normalized === "sandbox") {
    return "sandbox";
  }
  if (normalized === "test") {
    return "test";
  }
  return providerMode === "production" ? "production" : "sandbox";
}

export function buildModeMatrix({
  trialSafe,
  sandboxSupported,
  testSupported = true,
  productionSupported = true,
  supportsLegalEffect
}) {
  return Object.freeze({
    trial_safe: trialSafe === true,
    sandbox_supported: sandboxSupported === true,
    test_supported: testSupported === true,
    production_supported: productionSupported === true,
    supportsLegalEffect: supportsLegalEffect === true
  });
}

export function buildProviderBaselineRef({
  providerBaselineRegistry,
  providerCode,
  baselineCode,
  effectiveDate,
  metadata = {}
}) {
  if (providerBaselineRegistry && typeof providerBaselineRegistry.resolveProviderBaseline === "function") {
    const providerBaseline = providerBaselineRegistry.resolveProviderBaseline({
      domain: "integrations",
      jurisdiction: "SE",
      providerCode,
      baselineCode,
      effectiveDate
    });
    return providerBaselineRegistry.buildProviderBaselineRef({
      effectiveDate,
      providerBaseline,
      metadata
    });
  }
  return Object.freeze({
    providerCode,
    baselineCode,
    providerBaselineId: `${providerCode}:${baselineCode}:${effectiveDate}`,
    providerBaselineVersion: effectiveDate,
    providerBaselineChecksum: hashObject({
      providerCode,
      baselineCode,
      effectiveDate,
      metadata
    }),
    effectiveDate,
    metadata: clone(metadata)
  });
}

export function createStatelessProvider({
  providerCode,
  surfaceCode,
  connectionType,
  environmentMode = "test",
  providerEnvironmentRef = null,
  requiredCredentialKinds = ["api_credentials"],
  sandboxSupported = true,
  trialSafe = true,
  supportsLegalEffectInProduction = true,
  profiles = [],
  supportsAsyncCallback = false,
  supportsRerun = false
}) {
  const providerMode = resolveProviderMode(environmentMode);
  const resolvedProviderEnvironmentRef =
    providerEnvironmentRef || defaultProviderEnvironmentRef(environmentMode, providerMode);
  const supportsLegalEffect = providerMode === "production" && supportsLegalEffectInProduction === true;
  const allowedEnvironmentModes = [];
  if (trialSafe === true) {
    allowedEnvironmentModes.push("trial");
  }
  if (sandboxSupported === true) {
    allowedEnvironmentModes.push("sandbox");
  }
  allowedEnvironmentModes.push("test");
  if (supportsLegalEffectInProduction === true) {
    allowedEnvironmentModes.push("pilot_parallel", "production");
  }
  const modeMatrix = buildModeMatrix({
    trialSafe,
    sandboxSupported,
    testSupported: true,
    productionSupported: supportsLegalEffectInProduction,
    supportsLegalEffect
  });
  return {
    providerCode,
    providerMode,
    providerEnvironmentRef: resolvedProviderEnvironmentRef,
    getCapabilityManifest() {
      return Object.freeze({
        manifestId: `${surfaceCode}:${connectionType}:${providerCode}`,
        surfaceCode,
        connectionType,
        providerCode,
        requiredCredentialKinds: [...requiredCredentialKinds],
        sandboxSupported,
        trialSafe,
        supportsLegalEffect,
        supportsAsyncCallback,
        supportsRerun,
        allowedEnvironmentModes: [...new Set(allowedEnvironmentModes)],
        modeMatrix,
        profiles: clone(profiles)
      });
    },
    snapshot() {
      return {};
    },
    restore() {}
  };
}

export function buildProviderReference(prefix, values = []) {
  const parts = [prefix, ...values.map((value) => normalizeOptionalText(value)).filter(Boolean)];
  return `${parts.join(":")}:${crypto.randomUUID()}`;
}

export function normalizeEmail(value, code = "email_invalid") {
  const email = requireText(value, code).toLowerCase();
  if (!email.includes("@")) {
    throw createError(400, code, `${code} is invalid.`);
  }
  return email;
}

export function normalizePhoneNumber(value, code = "phone_number_invalid") {
  const phone = requireText(value, code).replace(/\s+/g, "");
  if (!/^\+?[0-9]{6,18}$/.test(phone)) {
    throw createError(400, code, `${code} is invalid.`);
  }
  return phone;
}
