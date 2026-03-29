import crypto from "node:crypto";
import { cloneValue as clone } from "./clone.mjs";
import { createEnvelopeCrypto } from "./crypto.mjs";
import { assertSecurityClassCode } from "./security-classes.mjs";

export const SECRET_STORE_BUNDLE_VERSION = 1;
const PROTECTED_SECRET_RUNTIME_MODES = new Set(["pilot_parallel", "production"]);

function createSecretError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function text(value, code, message, { trim = true } = {}) {
  if (typeof value !== "string") {
    throw createSecretError(code, message);
  }
  const normalized = trim ? value.trim() : value;
  if (!normalized.length) {
    throw createSecretError(code, message);
  }
  return normalized;
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function serializeSecretMaterial(material) {
  if (typeof material === "string") {
    return Object.freeze({
      materialFormat: "utf8_string",
      plaintext: text(material, "secret_material_required", "Secret material is required.", { trim: false })
    });
  }
  return Object.freeze({
    materialFormat: "stable_json",
    plaintext: stableStringify(clone(material ?? null))
  });
}

function deserializeSecretMaterial(record, plaintext) {
  if (record.materialFormat === "stable_json") {
    return JSON.parse(plaintext);
  }
  return plaintext;
}

function normalizeBlindIndexInputs(blindIndexInputs = []) {
  if (!Array.isArray(blindIndexInputs)) {
    throw createSecretError("secret_blind_index_inputs_invalid", "Secret blind index inputs must be an array.");
  }
  return blindIndexInputs
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) =>
      Object.freeze({
        purpose: text(entry.purpose, "secret_blind_index_purpose_required", "Secret blind index purpose is required."),
        value: text(entry.value, "secret_blind_index_value_required", "Secret blind index value is required.", {
          trim: false
        })
      })
    );
}

function projectSecretMetadata(record) {
  return Object.freeze({
    secretRef: record.secretId,
    secretId: record.secretId,
    classCode: record.classCode,
    keyVersion: record.keyVersion,
    storageMode: "secret_store",
    providerKind: record.providerKind,
    maskedValue: record.maskedValue,
    fingerprint: record.fingerprint,
    blindIndexes: clone(record.blindIndexes),
    owner: clone(record.owner),
    mode: record.mode,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

function summarizeSecurityPosture({
  storeId,
  environmentMode,
  runtime
}) {
  const protectedMode = PROTECTED_SECRET_RUNTIME_MODES.has(environmentMode);
  const externalKeyManagerConfigured = runtime.providerKind !== "software_kms";
  const reasonCodes = [];

  if (protectedMode && !externalKeyManagerConfigured) {
    reasonCodes.push("external_kms_hsm_not_configured");
  }

  return Object.freeze({
    storeId,
    environmentMode,
    providerKind: runtime.providerKind,
    activeKeyVersion: runtime.activeKeyVersion,
    externalKeyManagerConfigured,
    bankGradeReady: !protectedMode || externalKeyManagerConfigured,
    reasonCodes: Object.freeze(reasonCodes)
  });
}

export function createSecretStore({
  clock = () => new Date(),
  environmentMode = "test",
  storeId = "default",
  masterKey = null,
  activeKeyVersion = null,
  cryptoRuntime = null
} = {}) {
  const resolvedEnvironmentMode = optionalText(environmentMode) || "test";
  const resolvedStoreId = text(storeId, "secret_store_id_required", "Secret store id is required.");
  const runtime =
    cryptoRuntime ||
    createEnvelopeCrypto({
      masterKey: masterKey || `swedish-erp-secret-store:${resolvedStoreId}:${resolvedEnvironmentMode}`,
      activeKeyVersion: activeKeyVersion || `${resolvedStoreId}:${resolvedEnvironmentMode}:v1`
    });
  const records = new Map();

  function readMetadata(secretId) {
    const record = records.get(text(secretId, "secret_ref_required", "Secret ref is required."));
    if (!record) {
      throw createSecretError("secret_ref_not_found", "Secret ref was not found in the secret store.");
    }
    return record;
  }

  function storeSecretMaterial({
    secretId = crypto.randomUUID(),
    classCode = "S4",
    material,
    owner = null,
    mode = resolvedEnvironmentMode,
    maskedValue = null,
    blindIndexInputs = [],
    fingerprintPurpose = "secret_material"
  } = {}) {
    const resolvedSecretId = text(secretId, "secret_ref_required", "Secret ref is required.");
    const resolvedClassCode = assertSecurityClassCode(classCode, {
      code: "secret_class_code_invalid",
      message: "Secret class code must be one of S0-S5.",
      createError: createSecretError
    });
    const serializedMaterial = serializeSecretMaterial(material);
    const blindIndexes = normalizeBlindIndexInputs(blindIndexInputs).map((entry) =>
      runtime.createBlindIndex(entry.value, { purpose: entry.purpose })
    );
    const fingerprint = runtime.fingerprint(serializedMaterial.plaintext, {
      purpose: text(
        fingerprintPurpose,
        "secret_fingerprint_purpose_required",
        "Secret fingerprint purpose is required."
      )
    });
    const existing = records.get(resolvedSecretId);
    const createdAt = existing?.createdAt || new Date(clock()).toISOString();
    const ownerSnapshot = clone(owner ?? null);
    let envelope = existing?.envelope || null;
    const metadataUnchanged =
      !!existing
      && existing.fingerprint === fingerprint
      && existing.classCode === resolvedClassCode
      && existing.materialFormat === serializedMaterial.materialFormat
      && stableStringify(existing.blindIndexes) === stableStringify(blindIndexes)
      && stableStringify(existing.owner) === stableStringify(ownerSnapshot)
      && existing.mode === optionalText(mode)
      && existing.maskedValue === optionalText(maskedValue);

    if (!existing || existing.fingerprint !== fingerprint || existing.classCode !== resolvedClassCode) {
      envelope = runtime.seal(serializedMaterial.plaintext, {
        aad: {
          secretId: resolvedSecretId,
          classCode: resolvedClassCode
        }
      });
    }

    if (metadataUnchanged) {
      return projectSecretMetadata(existing);
    }

    const nextRecord = Object.freeze({
      secretId: resolvedSecretId,
      classCode: resolvedClassCode,
      keyVersion: envelope.keyVersion,
      providerKind: runtime.providerKind,
      materialFormat: serializedMaterial.materialFormat,
      maskedValue: optionalText(maskedValue),
      fingerprint,
      blindIndexes,
      owner: ownerSnapshot,
      mode: optionalText(mode),
      createdAt,
      updatedAt:
        existing
        && existing.fingerprint === fingerprint
        && existing.classCode === resolvedClassCode
          ? existing.updatedAt
          : new Date(clock()).toISOString(),
      envelope
    });
    records.set(resolvedSecretId, nextRecord);
    return projectSecretMetadata(nextRecord);
  }

  function readSecretMaterial({ secretId, parse = false } = {}) {
    const record = readMetadata(secretId);
    const plaintext = runtime.open(record.envelope, {
      aad: {
        secretId: record.secretId,
        classCode: record.classCode
      }
    });
    return parse ? deserializeSecretMaterial(record, plaintext) : plaintext;
  }

  function hasSecretMaterial({ secretId } = {}) {
    return records.has(text(secretId, "secret_ref_required", "Secret ref is required."));
  }

  function getSecretMetadata({ secretId } = {}) {
    return projectSecretMetadata(readMetadata(secretId));
  }

  function listSecretMetadata({ classCode = null } = {}) {
    const resolvedClassCode = optionalText(classCode);
    return [...records.values()]
      .filter((record) => (resolvedClassCode ? record.classCode === resolvedClassCode : true))
      .sort((left, right) => left.secretId.localeCompare(right.secretId))
      .map(projectSecretMetadata);
  }

  function exportSecretBundle() {
    return Object.freeze({
      bundleType: "secret_store_bundle",
      bundleVersion: SECRET_STORE_BUNDLE_VERSION,
      storeId: resolvedStoreId,
      environmentMode: resolvedEnvironmentMode,
      providerKind: runtime.providerKind,
      activeKeyVersion: runtime.activeKeyVersion,
      entries: [...records.values()]
        .sort((left, right) => left.secretId.localeCompare(right.secretId))
        .map((record) => clone(record))
    });
  }

  function getSecurityPosture() {
    return summarizeSecurityPosture({
      storeId: resolvedStoreId,
      environmentMode: resolvedEnvironmentMode,
      runtime
    });
  }

  function importSecretBundle(bundle = null) {
    records.clear();
    if (!bundle || typeof bundle !== "object") {
      return;
    }
    for (const entry of Array.isArray(bundle.entries) ? bundle.entries : []) {
      const secretId = text(entry.secretId, "secret_ref_required", "Secret ref is required.");
      const classCode = assertSecurityClassCode(entry.classCode, {
        code: "secret_class_code_invalid",
        message: "Secret class code must be one of S0-S5.",
        createError: createSecretError
      });
      records.set(
        secretId,
        Object.freeze({
          secretId,
          classCode,
          keyVersion: text(
            entry.keyVersion || entry.envelope?.keyVersion || entry.envelope?.keyId,
            "secret_key_version_required",
            "Secret key version is required."
          ),
          providerKind: optionalText(entry.providerKind) || runtime.providerKind,
          materialFormat: optionalText(entry.materialFormat) || "utf8_string",
          maskedValue: optionalText(entry.maskedValue),
          fingerprint: text(entry.fingerprint, "secret_fingerprint_required", "Secret fingerprint is required."),
          blindIndexes: Array.isArray(entry.blindIndexes) ? clone(entry.blindIndexes) : [],
          owner: clone(entry.owner ?? null),
          mode: optionalText(entry.mode),
          createdAt: text(entry.createdAt, "secret_created_at_required", "Secret created timestamp is required."),
          updatedAt: text(entry.updatedAt, "secret_updated_at_required", "Secret updated timestamp is required."),
          envelope: clone(entry.envelope)
        })
      );
    }
  }

  return Object.freeze({
    storeId: resolvedStoreId,
    environmentMode: resolvedEnvironmentMode,
    providerKind: runtime.providerKind,
    activeKeyVersion: runtime.activeKeyVersion,
    getSecurityPosture,
    storeSecretMaterial,
    readSecretMaterial,
    hasSecretMaterial,
    getSecretMetadata,
    listSecretMetadata,
    exportSecretBundle,
    importSecretBundle
  });
}
