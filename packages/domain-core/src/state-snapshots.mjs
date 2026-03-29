import crypto from "node:crypto";
import {
  cloneSnapshotValue,
  deserializeSnapshotValue,
  serializeSnapshotValue
} from "./clone.mjs";
import { assertSecurityClassCode } from "./security-classes.mjs";

export const DURABLE_SNAPSHOT_ARTIFACT_SCHEMA_VERSION = 1;

function replaceMap(target, source) {
  target.clear();
  for (const [key, value] of source.entries()) {
    target.set(key, value);
  }
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

function createSnapshotArtifactError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function text(value, code, message) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createSnapshotArtifactError(code, message);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeTimestamp(value, code, message) {
  const candidate = value == null ? new Date().toISOString() : value;
  const parsed = new Date(text(candidate, code, message));
  if (Number.isNaN(parsed.getTime())) {
    throw createSnapshotArtifactError(code, message);
  }
  return parsed.toISOString();
}

function normalizePositiveInteger(value, code, message) {
  if (!Number.isInteger(value) || value <= 0) {
    throw createSnapshotArtifactError(code, message);
  }
  return value;
}

function normalizeNullableObjectVersion(value, code, message) {
  if (value == null) {
    return null;
  }
  return normalizePositiveInteger(value, code, message);
}

function normalizeClassMask(classMask) {
  if (!Array.isArray(classMask) || classMask.length === 0) {
    throw createSnapshotArtifactError(
      "snapshot_artifact_class_mask_required",
      "Snapshot artifact requires at least one class mask entry."
    );
  }
  return [...new Set(classMask.map((entry) =>
    assertSecurityClassCode(entry, {
      code: "snapshot_artifact_class_mask_invalid",
      message: "Snapshot artifact class mask entries must use canonical S0-S5 codes.",
      createError: createSnapshotArtifactError
    })
  ))].sort();
}

function cloneSerializedSnapshotPayload(snapshotPayload) {
  if (!snapshotPayload || typeof snapshotPayload !== "object" || Array.isArray(snapshotPayload)) {
    throw createSnapshotArtifactError(
      "snapshot_artifact_payload_invalid",
      "Snapshot artifact payload must be a serialized snapshot object."
    );
  }
  return cloneSnapshotValue(snapshotPayload);
}

function computeSnapshotArtifactChecksum(body) {
  return crypto.createHash("sha256").update(stableStringify(body)).digest("hex");
}

export function createDurableStateSnapshotArtifact({
  domainKey,
  snapshot,
  snapshotSchemaVersion = DURABLE_SNAPSHOT_ARTIFACT_SCHEMA_VERSION,
  classMask = ["S2"],
  exportedAt = null,
  sourceObjectVersion = null,
  sourceSnapshotHash = null,
  adapterKind = null,
  durabilityPolicy = null,
  scopeCompanyId = null,
  metadata = {}
} = {}) {
  const normalizedDomainKey = text(
    domainKey,
    "snapshot_artifact_domain_key_required",
    "Snapshot artifact domain key is required."
  );
  const snapshotPayload = cloneSerializedSnapshotPayload(snapshot ?? {});
  const normalizedBody = Object.freeze({
    artifactType: "durable_state_snapshot",
    artifactVersion: DURABLE_SNAPSHOT_ARTIFACT_SCHEMA_VERSION,
    domainKey: normalizedDomainKey,
    snapshotSchemaVersion: normalizePositiveInteger(
      snapshotSchemaVersion,
      "snapshot_artifact_schema_version_invalid",
      "Snapshot artifact schema version must be a positive integer."
    ),
    classMask: normalizeClassMask(classMask),
    exportedAt: normalizeTimestamp(
      exportedAt,
      "snapshot_artifact_exported_at_invalid",
      "Snapshot artifact exportedAt must be a valid timestamp."
    ),
    sourceObjectVersion: normalizeNullableObjectVersion(
      sourceObjectVersion,
      "snapshot_artifact_source_object_version_invalid",
      "Snapshot artifact source object version must be null or a positive integer."
    ),
    sourceSnapshotHash: optionalText(sourceSnapshotHash),
    adapterKind: optionalText(adapterKind),
    durabilityPolicy: optionalText(durabilityPolicy),
    scopeCompanyId: optionalText(scopeCompanyId),
    metadata: serializeSnapshotValue(metadata ?? {}),
    snapshotPayload
  });

  return Object.freeze({
    snapshotArtifactId: crypto.randomUUID(),
    ...normalizedBody,
    checksum: computeSnapshotArtifactChecksum(normalizedBody)
  });
}

export function validateDurableStateSnapshotArtifact(
  artifact,
  { expectedDomainKey = null, expectedSnapshotSchemaVersion = null } = {}
) {
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw createSnapshotArtifactError(
      "snapshot_artifact_required",
      "Snapshot artifact object is required."
    );
  }

  const snapshotArtifactId = text(
    artifact.snapshotArtifactId,
    "snapshot_artifact_id_required",
    "Snapshot artifact id is required."
  );
  const normalizedBody = Object.freeze({
    artifactType: text(
      artifact.artifactType,
      "snapshot_artifact_type_required",
      "Snapshot artifact type is required."
    ),
    artifactVersion: normalizePositiveInteger(
      artifact.artifactVersion,
      "snapshot_artifact_version_invalid",
      "Snapshot artifact version must be a positive integer."
    ),
    domainKey: text(
      artifact.domainKey,
      "snapshot_artifact_domain_key_required",
      "Snapshot artifact domain key is required."
    ),
    snapshotSchemaVersion: normalizePositiveInteger(
      artifact.snapshotSchemaVersion,
      "snapshot_artifact_schema_version_invalid",
      "Snapshot artifact schema version must be a positive integer."
    ),
    classMask: normalizeClassMask(artifact.classMask),
    exportedAt: normalizeTimestamp(
      artifact.exportedAt,
      "snapshot_artifact_exported_at_invalid",
      "Snapshot artifact exportedAt must be a valid timestamp."
    ),
    sourceObjectVersion: normalizeNullableObjectVersion(
      artifact.sourceObjectVersion,
      "snapshot_artifact_source_object_version_invalid",
      "Snapshot artifact source object version must be null or a positive integer."
    ),
    sourceSnapshotHash: optionalText(artifact.sourceSnapshotHash),
    adapterKind: optionalText(artifact.adapterKind),
    durabilityPolicy: optionalText(artifact.durabilityPolicy),
    scopeCompanyId: optionalText(artifact.scopeCompanyId),
    metadata: serializeSnapshotValue(deserializeSnapshotValue(artifact.metadata ?? {})),
    snapshotPayload: cloneSerializedSnapshotPayload(artifact.snapshotPayload)
  });
  const checksum = text(
    artifact.checksum,
    "snapshot_artifact_checksum_required",
    "Snapshot artifact checksum is required."
  );

  if (normalizedBody.artifactType !== "durable_state_snapshot") {
    throw createSnapshotArtifactError(
      "snapshot_artifact_type_invalid",
      "Snapshot artifact type is not supported."
    );
  }
  if (expectedDomainKey && normalizedBody.domainKey !== expectedDomainKey) {
    throw createSnapshotArtifactError(
      "snapshot_artifact_domain_key_mismatch",
      "Snapshot artifact domain key does not match the requested domain."
    );
  }
  if (
    expectedSnapshotSchemaVersion != null
    && normalizedBody.snapshotSchemaVersion !== expectedSnapshotSchemaVersion
  ) {
    throw createSnapshotArtifactError(
      "snapshot_artifact_schema_version_mismatch",
      "Snapshot artifact schema version does not match the expected domain snapshot schema."
    );
  }

  const expectedChecksum = computeSnapshotArtifactChecksum(normalizedBody);
  if (checksum !== expectedChecksum) {
    throw createSnapshotArtifactError(
      "snapshot_artifact_checksum_mismatch",
      "Snapshot artifact checksum did not match the payload."
    );
  }

  return Object.freeze({
    snapshotArtifactId,
    ...normalizedBody,
    checksum,
    metadata: cloneSnapshotValue(deserializeSnapshotValue(normalizedBody.metadata)),
    snapshotPayload: cloneSnapshotValue(normalizedBody.snapshotPayload)
  });
}

export function applyDurableStateSnapshotArtifact(
  targetState,
  artifact,
  {
    expectedDomainKey = null,
    expectedSnapshotSchemaVersion = null,
    preserveKeys = [],
    customHydrators = {}
  } = {}
) {
  const validatedArtifact = validateDurableStateSnapshotArtifact(artifact, {
    expectedDomainKey,
    expectedSnapshotSchemaVersion
  });
  applyDurableStateSnapshot(targetState, validatedArtifact.snapshotPayload, {
    preserveKeys,
    customHydrators
  });
  return validatedArtifact;
}

export function serializeDurableState(state, { excludeKeys = [], customSerializers = {} } = {}) {
  const excluded = new Set(excludeKeys);
  const payload = {};

  for (const [key, value] of Object.entries(state || {})) {
    if (excluded.has(key)) {
      continue;
    }
    if (typeof customSerializers[key] === "function") {
      payload[key] = serializeSnapshotValue(customSerializers[key](value));
      continue;
    }
    payload[key] = serializeSnapshotValue(value);
  }

  return payload;
}

export function applyDurableStateSnapshot(
  targetState,
  snapshot,
  { preserveKeys = [], customHydrators = {} } = {}
) {
  const preserved = new Set(preserveKeys);
  const restored = deserializeSnapshotValue(snapshot || {});

  for (const [key, targetValue] of Object.entries(targetState || {})) {
    if (preserved.has(key)) {
      continue;
    }

    if (typeof customHydrators[key] === "function") {
      customHydrators[key](targetValue, restored[key]);
      continue;
    }

    const nextValue = restored[key];
    if (targetValue instanceof Map) {
      replaceMap(targetValue, nextValue instanceof Map ? nextValue : new Map());
      continue;
    }

    if (Array.isArray(targetValue)) {
      targetValue.splice(0, targetValue.length, ...(Array.isArray(nextValue) ? nextValue : []));
      continue;
    }

    targetState[key] = cloneSnapshotValue(nextValue);
  }
}
