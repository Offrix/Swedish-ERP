import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createKeyedEnvelopeCrypto } from "./crypto.mjs";
import { createSecretStore } from "./secrets.mjs";

const AWS_KMS_BRIDGE_PATH = fileURLToPath(new URL("./aws-kms-bridge.mjs", import.meta.url));
export const AWS_KMS_SECRET_RUNTIME_PROVIDER = "aws_kms";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function requiredText(value, code, message) {
  const normalized = optionalText(value);
  if (!normalized) {
    fail(code, message);
  }
  return normalized;
}

function normalizeKeyId(value, code) {
  const normalized = requiredText(value, code, "AWS KMS key id is required.");
  if (normalized.startsWith("arn:") || normalized.startsWith("alias/")) {
    return normalized;
  }
  if (normalized.includes("/")) {
    return `alias/${normalized}`;
  }
  return normalized;
}

function decodeBase64Material(value, code, message) {
  return Buffer.from(requiredText(value, code, message), "base64");
}

function combineRootMaterial({ purpose, modeRootKeyMaterial, secondaryRootKeyMaterial, storeId, environmentMode }) {
  return crypto.hkdfSync(
    "sha256",
    secondaryRootKeyMaterial,
    modeRootKeyMaterial,
    Buffer.from(`swedish-erp:${purpose}:${storeId}:${environmentMode}`),
    32
  );
}

function runAwsKmsBridgeSync(command, payload, { env = process.env } = {}) {
  try {
    const raw = execFileSync(process.execPath, [AWS_KMS_BRIDGE_PATH, command], {
      env,
      input: JSON.stringify(payload),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return JSON.parse(raw);
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    fail(
      "aws_kms_bridge_failed",
      stderr.length > 0
        ? `AWS KMS bridge failed: ${stderr}`
        : "AWS KMS bridge failed to unwrap secret runtime material."
    );
  }
}

export function resolveAwsKmsSecretRuntimeConfig(env = process.env) {
  const provider = optionalText(env?.ERP_SECRET_RUNTIME_PROVIDER);
  if (provider !== AWS_KMS_SECRET_RUNTIME_PROVIDER) {
    return null;
  }

  return Object.freeze({
    provider,
    region:
      requiredText(
        env?.ERP_AWS_KMS_REGION || env?.AWS_REGION || env?.AWS_DEFAULT_REGION,
        "aws_kms_region_required",
        "AWS KMS region is required."
      ),
    modeRootKeyId: normalizeKeyId(env?.ERP_AWS_KMS_MODE_ROOT_KEY_ID, "aws_kms_mode_root_key_id_required"),
    modeRootWrappedKeyMaterialB64: requiredText(
      env?.ERP_AWS_KMS_MODE_ROOT_WRAPPED_B64,
      "aws_kms_mode_root_wrapped_required",
      "Wrapped mode-root material is required."
    ),
    serviceKekKeyId: normalizeKeyId(env?.ERP_AWS_KMS_SERVICE_KEK_KEY_ID, "aws_kms_service_kek_key_id_required"),
    serviceKekWrappedKeyMaterialB64: requiredText(
      env?.ERP_AWS_KMS_SERVICE_KEK_WRAPPED_B64,
      "aws_kms_service_kek_wrapped_required",
      "Wrapped service KEK material is required."
    ),
    blindIndexKeyId: normalizeKeyId(env?.ERP_AWS_KMS_BLIND_INDEX_KEY_ID, "aws_kms_blind_index_key_id_required"),
    blindIndexWrappedKeyMaterialB64: requiredText(
      env?.ERP_AWS_KMS_BLIND_INDEX_WRAPPED_B64,
      "aws_kms_blind_index_wrapped_required",
      "Wrapped blind-index material is required."
    )
  });
}

export function createAwsKmsBackedEnvelopeCrypto({
  env = process.env,
  storeId,
  environmentMode = "test",
  activeKeyVersion = null,
  bridgeRunner = runAwsKmsBridgeSync
} = {}) {
  const config = resolveAwsKmsSecretRuntimeConfig(env);
  if (!config) {
    return null;
  }

  const unwrapped = bridgeRunner(
    "decrypt-root-bundle",
    {
      region: config.region,
      modeRootKeyId: config.modeRootKeyId,
      modeRootWrappedKeyMaterialB64: config.modeRootWrappedKeyMaterialB64,
      serviceKekKeyId: config.serviceKekKeyId,
      serviceKekWrappedKeyMaterialB64: config.serviceKekWrappedKeyMaterialB64,
      blindIndexKeyId: config.blindIndexKeyId,
      blindIndexWrappedKeyMaterialB64: config.blindIndexWrappedKeyMaterialB64
    },
    { env }
  );

  const modeRootKeyMaterial = decodeBase64Material(
    unwrapped?.modeRoot?.plaintextKeyMaterialB64,
    "aws_kms_mode_root_unwrapped_required",
    "AWS KMS mode-root material is required."
  );
  const serviceKekKeyMaterial = decodeBase64Material(
    unwrapped?.serviceKek?.plaintextKeyMaterialB64,
    "aws_kms_service_kek_unwrapped_required",
    "AWS KMS service KEK material is required."
  );
  const blindIndexKeyMaterial = decodeBase64Material(
    unwrapped?.blindIndex?.plaintextKeyMaterialB64,
    "aws_kms_blind_index_unwrapped_required",
    "AWS KMS blind-index material is required."
  );

  return createKeyedEnvelopeCrypto({
    envelopeRootKeyMaterial: combineRootMaterial({
      purpose: "envelope",
      modeRootKeyMaterial,
      secondaryRootKeyMaterial: serviceKekKeyMaterial,
      storeId: requiredText(storeId, "secret_store_id_required", "Secret store id is required."),
      environmentMode
    }),
    blindIndexRootKeyMaterial: combineRootMaterial({
      purpose: "blind-index",
      modeRootKeyMaterial,
      secondaryRootKeyMaterial: blindIndexKeyMaterial,
      storeId: requiredText(storeId, "secret_store_id_required", "Secret store id is required."),
      environmentMode
    }),
    activeKeyVersion:
      optionalText(activeKeyVersion)
      || `aws-kms:${config.region}:${environmentMode}:${requiredText(storeId, "secret_store_id_required", "Secret store id is required.")}:v1`,
    providerKind: "aws_kms"
  });
}

export function createConfiguredSecretStore({
  clock = () => new Date(),
  environmentMode = "test",
  storeId = "default",
  masterKey = null,
  activeKeyVersion = null,
  env = process.env,
  bridgeRunner = runAwsKmsBridgeSync
} = {}) {
  const cryptoRuntime =
    createAwsKmsBackedEnvelopeCrypto({
      env,
      storeId,
      environmentMode,
      activeKeyVersion,
      bridgeRunner
    }) || null;

  return createSecretStore({
    clock,
    environmentMode,
    storeId,
    masterKey,
    activeKeyVersion,
    cryptoRuntime
  });
}

export function provisionAwsKmsSecretRuntimeBundle({
  env = process.env,
  region = env?.ERP_AWS_KMS_REGION || env?.AWS_REGION || env?.AWS_DEFAULT_REGION,
  modeRootKeyId = env?.ERP_AWS_KMS_MODE_ROOT_KEY_ID,
  serviceKekKeyId = env?.ERP_AWS_KMS_SERVICE_KEK_KEY_ID,
  blindIndexKeyId = env?.ERP_AWS_KMS_BLIND_INDEX_KEY_ID,
  bridgeRunner = runAwsKmsBridgeSync
} = {}) {
  const result = bridgeRunner(
    "provision-root-bundle",
    {
      region: requiredText(region, "aws_kms_region_required", "AWS KMS region is required."),
      modeRootKeyId: normalizeKeyId(modeRootKeyId, "aws_kms_mode_root_key_id_required"),
      serviceKekKeyId: normalizeKeyId(serviceKekKeyId, "aws_kms_service_kek_key_id_required"),
      blindIndexKeyId: normalizeKeyId(blindIndexKeyId, "aws_kms_blind_index_key_id_required")
    },
    { env }
  );

  return Object.freeze({
    region: requiredText(result.region, "aws_kms_region_required", "AWS KMS region is required."),
    modeRootKeyId: normalizeKeyId(result?.modeRoot?.keyId, "aws_kms_mode_root_key_id_required"),
    modeRootWrappedKeyMaterialB64: requiredText(
      result?.modeRoot?.wrappedKeyMaterialB64,
      "aws_kms_mode_root_wrapped_required",
      "Wrapped mode-root material is required."
    ),
    serviceKekKeyId: normalizeKeyId(result?.serviceKek?.keyId, "aws_kms_service_kek_key_id_required"),
    serviceKekWrappedKeyMaterialB64: requiredText(
      result?.serviceKek?.wrappedKeyMaterialB64,
      "aws_kms_service_kek_wrapped_required",
      "Wrapped service KEK material is required."
    ),
    blindIndexKeyId: normalizeKeyId(result?.blindIndex?.keyId, "aws_kms_blind_index_key_id_required"),
    blindIndexWrappedKeyMaterialB64: requiredText(
      result?.blindIndex?.wrappedKeyMaterialB64,
      "aws_kms_blind_index_wrapped_required",
      "Wrapped blind-index material is required."
    )
  });
}
