import crypto from "node:crypto";
import { cloneValue as clone } from "./clone.mjs";

export const SECRET_ENVELOPE_ALGORITHM = "aes-256-gcm";
export const SECRET_BLIND_INDEX_ALGORITHM = "hmac-sha256";
export const DEFAULT_SECRET_CRYPTO_PROVIDER_KIND = "software_kms";
export const DEFAULT_SECRET_KEY_VERSION = "software-kms-v1";

function text(value, code, message, { trim = true } = {}) {
  if (typeof value !== "string") {
    throw createCryptoError(code, message);
  }
  const normalized = trim ? value.trim() : value;
  if (!normalized.length) {
    throw createCryptoError(code, message);
  }
  return normalized;
}

function createCryptoError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
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

function normalizeAad(aad) {
  if (aad == null) {
    return null;
  }
  return stableStringify(clone(aad));
}

function normalizeKeyMaterial(value, code, message) {
  if (Buffer.isBuffer(value)) {
    if (value.length === 0) {
      throw createCryptoError(code, message);
    }
    return Buffer.from(value);
  }
  if (value instanceof Uint8Array) {
    if (value.byteLength === 0) {
      throw createCryptoError(code, message);
    }
    return Buffer.from(value);
  }
  if (value instanceof ArrayBuffer) {
    if (value.byteLength === 0) {
      throw createCryptoError(code, message);
    }
    return Buffer.from(value);
  }
  if (typeof value === "string") {
    const normalized = text(value, code, message, { trim: false });
    return Buffer.from(normalized, "utf8");
  }
  throw createCryptoError(code, message);
}

export function createKeyedEnvelopeCrypto({
  envelopeRootKeyMaterial,
  blindIndexRootKeyMaterial = envelopeRootKeyMaterial,
  activeKeyVersion = DEFAULT_SECRET_KEY_VERSION,
  providerKind = DEFAULT_SECRET_CRYPTO_PROVIDER_KIND
} = {}) {
  const envelopeRootKey = normalizeKeyMaterial(
    envelopeRootKeyMaterial,
    "crypto_envelope_root_key_required",
    "Envelope crypto root key material is required."
  );
  const blindIndexRootKey = normalizeKeyMaterial(
    blindIndexRootKeyMaterial,
    "crypto_blind_index_root_key_required",
    "Blind index root key material is required."
  );
  const resolvedActiveKeyVersion = text(
    activeKeyVersion,
    "crypto_active_key_version_required",
    "Envelope crypto active key version is required."
  );
  const resolvedProviderKind = text(
    providerKind,
    "crypto_provider_kind_required",
    "Envelope crypto provider kind is required."
  );
  const derivedKeyCache = new Map();

  function deriveKey(purpose, keyVersion = resolvedActiveKeyVersion, { rootKind = "envelope" } = {}) {
    const resolvedPurpose = text(purpose, "crypto_key_purpose_required", "Envelope crypto key purpose is required.");
    const resolvedKeyVersion = text(
      keyVersion,
      "crypto_key_version_required",
      "Envelope crypto key version is required."
    );
    const resolvedRootKind = rootKind === "blind_index" ? "blind_index" : "envelope";
    const cacheKey = `${resolvedRootKind}:${resolvedPurpose}:${resolvedKeyVersion}`;
    if (!derivedKeyCache.has(cacheKey)) {
      const rootKey = resolvedRootKind === "blind_index" ? blindIndexRootKey : envelopeRootKey;
      const derivedKey = crypto.hkdfSync(
        "sha256",
        rootKey,
        Buffer.from("swedish-erp"),
        Buffer.from(cacheKey),
        32
      );
      derivedKeyCache.set(cacheKey, derivedKey);
    }
    return derivedKeyCache.get(cacheKey);
  }

  function seal(plaintext, { aad = null, keyVersion = resolvedActiveKeyVersion } = {}) {
    const resolvedPlaintext = text(
      plaintext,
      "crypto_plaintext_required",
      "Envelope crypto plaintext is required.",
      { trim: false }
    );
    const resolvedKeyVersion = text(
      keyVersion,
      "crypto_key_version_required",
      "Envelope crypto key version is required."
    );
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      SECRET_ENVELOPE_ALGORITHM,
      deriveKey("envelope", resolvedKeyVersion, { rootKind: "envelope" }),
      iv
    );
    const normalizedAad = normalizeAad(aad);
    if (normalizedAad) {
      cipher.setAAD(Buffer.from(normalizedAad, "utf8"));
    }
    const ciphertext = Buffer.concat([cipher.update(resolvedPlaintext, "utf8"), cipher.final()]);
    return Object.freeze({
      providerKind: resolvedProviderKind,
      keyVersion: resolvedKeyVersion,
      algorithm: SECRET_ENVELOPE_ALGORITHM,
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64")
    });
  }

  function open(envelope, { aad = null } = {}) {
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
      throw createCryptoError("crypto_envelope_required", "Envelope crypto envelope is required.");
    }
    const resolvedAlgorithm = text(
      envelope.algorithm,
      "crypto_envelope_algorithm_required",
      "Envelope crypto algorithm is required."
    );
    if (resolvedAlgorithm !== SECRET_ENVELOPE_ALGORITHM) {
      throw createCryptoError("crypto_envelope_algorithm_invalid", "Envelope crypto algorithm is not supported.");
    }
    const resolvedKeyVersion = text(
      envelope.keyVersion || envelope.keyId,
      "crypto_envelope_key_version_required",
      "Envelope crypto key version is required."
    );
    const decipher = crypto.createDecipheriv(
      SECRET_ENVELOPE_ALGORITHM,
      deriveKey("envelope", resolvedKeyVersion, { rootKind: "envelope" }),
      Buffer.from(text(envelope.iv, "crypto_envelope_iv_required", "Envelope crypto IV is required."), "base64")
    );
    const normalizedAad = normalizeAad(aad);
    if (normalizedAad) {
      decipher.setAAD(Buffer.from(normalizedAad, "utf8"));
    }
    decipher.setAuthTag(
      Buffer.from(
        text(envelope.authTag, "crypto_envelope_auth_tag_required", "Envelope crypto auth tag is required."),
        "base64"
      )
    );
    return Buffer.concat([
      decipher.update(
        Buffer.from(
          text(
            envelope.ciphertext,
            "crypto_envelope_ciphertext_required",
            "Envelope crypto ciphertext is required."
          ),
          "base64"
        )
      ),
      decipher.final()
    ]).toString("utf8");
  }

  function fingerprint(value, { purpose = "secret_material" } = {}) {
    return crypto
      .createHmac(
        "sha256",
        deriveKey(
          text(purpose, "crypto_fingerprint_purpose_required", "Fingerprint purpose is required."),
          resolvedActiveKeyVersion,
          { rootKind: "blind_index" }
        )
      )
      .update(text(value, "crypto_fingerprint_value_required", "Fingerprint value is required.", { trim: false }), "utf8")
      .digest("hex");
  }

  function createBlindIndex(value, { purpose, keyVersion = resolvedActiveKeyVersion } = {}) {
    const resolvedPurpose = text(purpose, "crypto_blind_index_purpose_required", "Blind index purpose is required.");
    const resolvedValue = text(value, "crypto_blind_index_value_required", "Blind index value is required.", {
      trim: false
    });
    const resolvedKeyVersion = text(
      keyVersion,
      "crypto_blind_index_key_version_required",
      "Blind index key version is required."
    );
    return Object.freeze({
      purpose: resolvedPurpose,
      keyVersion: resolvedKeyVersion,
      algorithm: SECRET_BLIND_INDEX_ALGORITHM,
      digest: crypto.createHmac(
        "sha256",
        deriveKey(`blind_index:${resolvedPurpose}`, resolvedKeyVersion, { rootKind: "blind_index" })
      ).update(resolvedValue, "utf8").digest("hex")
    });
  }

  return Object.freeze({
    providerKind: resolvedProviderKind,
    activeKeyVersion: resolvedActiveKeyVersion,
    envelopeAlgorithm: SECRET_ENVELOPE_ALGORITHM,
    blindIndexAlgorithm: SECRET_BLIND_INDEX_ALGORITHM,
    seal,
    open,
    fingerprint,
    createBlindIndex
  });
}

export function createEnvelopeCrypto({
  masterKey = "swedish-erp-secret-root",
  activeKeyVersion = DEFAULT_SECRET_KEY_VERSION,
  providerKind = DEFAULT_SECRET_CRYPTO_PROVIDER_KIND
} = {}) {
  const rootKey = normalizeKeyMaterial(
    masterKey,
    "crypto_master_key_required",
    "Envelope crypto master key is required."
  );
  return createKeyedEnvelopeCrypto({
    envelopeRootKeyMaterial: rootKey,
    blindIndexRootKeyMaterial: rootKey,
    activeKeyVersion,
    providerKind
  });
}
