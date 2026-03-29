import crypto from "node:crypto";
import { cloneValue as clone } from "../../../domain-core/src/clone.mjs";
export { clone };

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

export const RECEIPT_MODE_CODES = Object.freeze([
  "trial_simulated",
  "provider_test_receipt",
  "internal_audit_only",
  "provider_receipt_required"
]);
export const PROVIDER_ENVIRONMENT_MODES = Object.freeze([
  "trial",
  "sandbox",
  "test",
  "pilot_parallel",
  "production"
]);

export function buildReceiptModePolicy({
  trialSafe,
  sandboxSupported,
  testSupported = true,
  productionSupported = true,
  supportsLegalEffectInProduction = true
}) {
  const policy = {};
  if (trialSafe === true) {
    policy.trial = "trial_simulated";
  }
  if (sandboxSupported === true) {
    policy.sandbox = supportsLegalEffectInProduction === true ? "provider_test_receipt" : "internal_audit_only";
  }
  if (testSupported === true) {
    policy.test = supportsLegalEffectInProduction === true ? "provider_test_receipt" : "internal_audit_only";
  }
  if (productionSupported === true) {
    const productionMode = supportsLegalEffectInProduction === true ? "provider_receipt_required" : "internal_audit_only";
    policy.pilot_parallel = productionMode;
    policy.production = productionMode;
  }
  return Object.freeze(policy);
}

export function resolveReceiptModeForEnvironment(receiptModePolicy = {}, environmentMode = "test") {
  const normalized = normalizeOptionalText(environmentMode) || "test";
  const resolved = receiptModePolicy?.[normalized];
  if (!resolved || !RECEIPT_MODE_CODES.includes(resolved)) {
    throw createError(400, "provider_receipt_mode_invalid", `Receipt mode is not configured for ${normalized}.`);
  }
  return resolved;
}

export function resolveRuntimeReceiptMode(receiptModePolicy = {}, environmentMode = "test") {
  const normalized = normalizeOptionalText(environmentMode) || "test";
  if (receiptModePolicy?.[normalized]) {
    return resolveReceiptModeForEnvironment(receiptModePolicy, normalized);
  }
  for (const fallbackMode of ["test", "sandbox", "pilot_parallel", "production", "trial"]) {
    if (receiptModePolicy?.[fallbackMode]) {
      return resolveReceiptModeForEnvironment(receiptModePolicy, fallbackMode);
    }
  }
  throw createError(400, "provider_receipt_mode_invalid", "Receipt mode policy has no supported environments.");
}

export function buildModeMatrix({
  trialSafe,
  sandboxSupported,
  testSupported = true,
  productionSupported = true,
  supportsLegalEffect,
  receiptModePolicy = {}
}) {
  return Object.freeze({
    trial_safe: trialSafe === true,
    sandbox_supported: sandboxSupported === true,
    test_supported: testSupported === true,
    production_supported: productionSupported === true,
    supportsLegalEffect: supportsLegalEffect === true,
    receiptModePolicy: clone(receiptModePolicy)
  });
}

export function buildEnvironmentCapabilityTruth({
  trialSafe,
  sandboxSupported,
  testSupported = true,
  productionSupported = true,
  supportsLegalEffectInProduction = true,
  receiptModePolicy = {}
}) {
  return Object.freeze(
    Object.fromEntries(
      PROVIDER_ENVIRONMENT_MODES.map((environmentMode) => {
        const enabled =
          environmentMode === "trial"
            ? trialSafe === true
            : environmentMode === "sandbox"
              ? sandboxSupported === true
              : environmentMode === "test"
                ? testSupported === true
                : productionSupported === true;
        const receiptMode = receiptModePolicy?.[environmentMode] || null;
        const supportsLegalEffect = enabled && ["pilot_parallel", "production"].includes(environmentMode)
          ? supportsLegalEffectInProduction === true
          : false;
        const exposureClass = !enabled
          ? "disabled"
          : environmentMode === "trial"
            ? "trial_only"
            : environmentMode === "sandbox"
              ? "sandbox_only"
              : environmentMode === "test"
                ? "test_only"
                : supportsLegalEffect
                  ? "legal_effect"
                  : "non_legal_effect";
        return [
          environmentMode,
          Object.freeze({
            environmentMode,
            enabled,
            receiptMode,
            supportsLegalEffect,
            liveCoverageEligible: supportsLegalEffect,
            exposureClass
          })
        ];
      })
    )
  );
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
  productionSupported = supportsLegalEffectInProduction,
  profiles = [],
  supportsAsyncCallback = false,
  supportsRerun = false,
  requiresCallbackRegistration = false
}) {
  const providerMode = resolveProviderMode(environmentMode);
  const resolvedProviderEnvironmentRef =
    providerEnvironmentRef || defaultProviderEnvironmentRef(environmentMode, providerMode);
  const supportsLegalEffect = providerMode === "production" && supportsLegalEffectInProduction === true;
  const receiptModePolicy = buildReceiptModePolicy({
    trialSafe,
    sandboxSupported,
    testSupported: true,
    productionSupported,
    supportsLegalEffectInProduction
  });
  const receiptMode = resolveRuntimeReceiptMode(receiptModePolicy, environmentMode);
  const allowedEnvironmentModes = [];
  if (trialSafe === true) {
    allowedEnvironmentModes.push("trial");
  }
  if (sandboxSupported === true) {
    allowedEnvironmentModes.push("sandbox");
  }
  allowedEnvironmentModes.push("test");
  if (productionSupported === true) {
    allowedEnvironmentModes.push("pilot_parallel", "production");
  }
  const modeMatrix = buildModeMatrix({
    trialSafe,
    sandboxSupported,
    testSupported: true,
    productionSupported,
    supportsLegalEffect,
    receiptModePolicy
  });
  const environmentCapabilityTruth = buildEnvironmentCapabilityTruth({
    trialSafe,
    sandboxSupported,
    testSupported: true,
    productionSupported,
    supportsLegalEffectInProduction,
    receiptModePolicy
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
        supportsLegalEffectInProduction,
        receiptMode,
        receiptModePolicy: clone(receiptModePolicy),
        supportsAsyncCallback,
        supportsRerun,
        requiresCallbackRegistration,
        runtimeEnvironmentMode: normalizeOptionalText(environmentMode) || "test",
        runtimeExposureClass: environmentCapabilityTruth[normalizeOptionalText(environmentMode) || "test"]?.exposureClass || "disabled",
        environmentCapabilityTruth: clone(environmentCapabilityTruth),
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
