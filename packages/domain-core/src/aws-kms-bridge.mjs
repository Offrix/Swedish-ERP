import crypto from "node:crypto";
import fs from "node:fs";
import { KMSClient, DecryptCommand, EncryptCommand } from "@aws-sdk/client-kms";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function readStdinJson() {
  const raw = fs.readFileSync(0, "utf8");
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {};
  }
  return JSON.parse(raw);
}

function text(value, code, message, { trim = true } = {}) {
  if (typeof value !== "string") {
    fail(code, message);
  }
  const normalized = trim ? value.trim() : value;
  if (!normalized.length) {
    fail(code, message);
  }
  return normalized;
}

function normalizeKeyId(value) {
  const normalized = text(value, "aws_kms_key_id_required", "AWS KMS key id is required.");
  if (normalized.startsWith("arn:") || normalized.startsWith("alias/")) {
    return normalized;
  }
  if (normalized.includes("/")) {
    return `alias/${normalized}`;
  }
  return normalized;
}

function buildEncryptionContext(purpose) {
  return Object.freeze({
    "swedish-erp-domain": "secret-runtime",
    "swedish-erp-purpose": purpose
  });
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value, code, message) {
  return Buffer.from(text(value, code, message), "base64");
}

function createClient(region) {
  return new KMSClient({
    region: text(region, "aws_kms_region_required", "AWS region is required.")
  });
}

async function provisionWrappedRoot({ client, keyId, purpose }) {
  const plaintext = crypto.randomBytes(32);
  const response = await client.send(
    new EncryptCommand({
      KeyId: normalizeKeyId(keyId),
      Plaintext: plaintext,
      EncryptionContext: buildEncryptionContext(purpose)
    })
  );
  return Object.freeze({
    keyId: normalizeKeyId(keyId),
    purpose,
    wrappedKeyMaterialB64: toBase64(response.CiphertextBlob)
  });
}

async function decryptWrappedRoot({ client, keyId, purpose, wrappedKeyMaterialB64 }) {
  const response = await client.send(
    new DecryptCommand({
      KeyId: normalizeKeyId(keyId),
      CiphertextBlob: fromBase64(
        wrappedKeyMaterialB64,
        "aws_kms_wrapped_key_material_required",
        "Wrapped AWS KMS key material is required."
      ),
      EncryptionContext: buildEncryptionContext(purpose)
    })
  );
  return Object.freeze({
    keyId: normalizeKeyId(keyId),
    purpose,
    plaintextKeyMaterialB64: toBase64(response.Plaintext)
  });
}

async function handleProvisionRootBundle(payload) {
  const client = createClient(payload.region);
  const modeRoot = await provisionWrappedRoot({
    client,
    keyId: payload.modeRootKeyId,
    purpose: "mode-root"
  });
  const serviceKek = await provisionWrappedRoot({
    client,
    keyId: payload.serviceKekKeyId,
    purpose: "service-kek"
  });
  const blindIndex = await provisionWrappedRoot({
    client,
    keyId: payload.blindIndexKeyId,
    purpose: "blind-index"
  });

  return Object.freeze({
    bundleVersion: 1,
    region: payload.region,
    modeRoot,
    serviceKek,
    blindIndex
  });
}

async function handleDecryptRootBundle(payload) {
  const client = createClient(payload.region);
  const modeRoot = await decryptWrappedRoot({
    client,
    keyId: payload.modeRootKeyId,
    purpose: "mode-root",
    wrappedKeyMaterialB64: payload.modeRootWrappedKeyMaterialB64
  });
  const serviceKek = await decryptWrappedRoot({
    client,
    keyId: payload.serviceKekKeyId,
    purpose: "service-kek",
    wrappedKeyMaterialB64: payload.serviceKekWrappedKeyMaterialB64
  });
  const blindIndex = await decryptWrappedRoot({
    client,
    keyId: payload.blindIndexKeyId,
    purpose: "blind-index",
    wrappedKeyMaterialB64: payload.blindIndexWrappedKeyMaterialB64
  });

  return Object.freeze({
    bundleVersion: 1,
    region: payload.region,
    modeRoot,
    serviceKek,
    blindIndex
  });
}

const command = process.argv[2];
const payload = readStdinJson();

try {
  let result;
  if (command === "provision-root-bundle") {
    result = await handleProvisionRootBundle(payload);
  } else if (command === "decrypt-root-bundle") {
    result = await handleDecryptRootBundle(payload);
  } else {
    fail("aws_kms_bridge_command_invalid", `Unsupported AWS KMS bridge command: ${command || "none"}.`);
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${error.code || "aws_kms_bridge_error"}: ${error.message}\n`);
  process.exitCode = 1;
}
