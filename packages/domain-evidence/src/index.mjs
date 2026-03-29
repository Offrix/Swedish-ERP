import crypto from "node:crypto";
import { createAuditEnvelope } from "../../events/src/index.mjs";
import { cloneValue as clone } from "../../domain-core/src/clone.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const EVIDENCE_BUNDLE_STATUSES = Object.freeze(["open", "frozen", "archived"]);

export function createEvidencePlatform(options = {}) {
  return createEvidenceEngine(options);
}

export function createEvidenceEngine({
  clock = () => new Date(),
  environmentMode = "test"
} = {}) {
  const state = {
    bundles: new Map(),
    bundleIdsByCompany: new Map(),
    bundleIdsBySource: new Map(),
    artifacts: new Map(),
    artifactIdsByBundle: new Map(),
    auditEvents: []
  };

  return {
    evidenceBundleStatuses: EVIDENCE_BUNDLE_STATUSES,
    createEvidenceBundle,
    appendEvidenceArtifact,
    freezeEvidenceBundle,
    archiveEvidenceBundle,
    createFrozenEvidenceBundleSnapshot,
    listEvidenceBundles,
    getEvidenceBundle,
    listEvidenceAuditEvents,
    exportDurableState,
    importDurableState
  };

  function createEvidenceBundle({
    companyId,
    bundleType,
    sourceObjectType,
    sourceObjectId,
    sourceObjectVersion = null,
    title = null,
    retentionClass = "regulated",
    classificationCode = "restricted_internal",
    metadata = {},
    actorId = "system",
    correlationId = crypto.randomUUID(),
    relatedObjectRefs = [],
    environmentMode: explicitEnvironmentMode = null
  } = {}) {
    const record = {
      evidenceBundleId: crypto.randomUUID(),
      companyId: requireText(companyId, "company_id_required"),
      bundleType: requireText(bundleType, "evidence_bundle_type_required"),
      sourceObjectType: requireText(sourceObjectType, "evidence_source_object_type_required"),
      sourceObjectId: requireText(sourceObjectId, "evidence_source_object_id_required"),
      sourceObjectVersion: normalizeOptionalText(sourceObjectVersion),
      environmentMode: normalizeOptionalText(explicitEnvironmentMode) || normalizeOptionalText(environmentMode) || "test",
      retentionClass: requireText(retentionClass, "evidence_retention_class_required"),
      classificationCode: requireText(classificationCode, "evidence_classification_code_required"),
      title: normalizeOptionalText(title),
      status: "open",
      metadata: clone(metadata || {}),
      artifactCount: 0,
      checksum: null,
      auditRefs: [],
      sourceRefs: [],
      signoffRefs: [],
      relatedObjectRefs: normalizeRefs(relatedObjectRefs),
      priorEvidenceBundleId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      frozenAt: null,
      archivedAt: null
    };
    state.bundles.set(record.evidenceBundleId, record);
    appendToIndex(state.bundleIdsByCompany, record.companyId, record.evidenceBundleId);
    appendToIndex(state.bundleIdsBySource, toSourceKey(record.companyId, record.sourceObjectType, record.sourceObjectId), record.evidenceBundleId);
    appendAuditEvent({
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "evidence.bundle.created",
      entityType: "evidence_bundle",
      entityId: record.evidenceBundleId,
      explanation: `Created ${record.bundleType} evidence bundle for ${record.sourceObjectType}:${record.sourceObjectId}.`
    });
    return materializeEvidenceBundle(record.evidenceBundleId);
  }

  function appendEvidenceArtifact({
    companyId,
    evidenceBundleId,
    artifactType,
    artifactRef = null,
    checksum = null,
    contentHash = null,
    roleCode = null,
    metadata = {},
    immutable = true,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const bundle = requireBundle(companyId, evidenceBundleId);
    if (bundle.status !== "open") {
      throw createError(409, "evidence_bundle_not_open", "Evidence artifacts can only be appended to open bundles.");
    }
    const artifact = {
      evidenceArtifactId: crypto.randomUUID(),
      evidenceBundleId: bundle.evidenceBundleId,
      companyId: bundle.companyId,
      artifactType: requireText(artifactType, "evidence_artifact_type_required"),
      artifactRef: normalizeOptionalText(artifactRef),
      checksum: normalizeOptionalText(checksum) || normalizeOptionalText(contentHash),
      contentHash: normalizeOptionalText(contentHash) || normalizeOptionalText(checksum),
      roleCode: normalizeOptionalText(roleCode),
      immutable: immutable !== false,
      metadata: clone(metadata || {}),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.artifacts.set(artifact.evidenceArtifactId, artifact);
    appendToIndex(state.artifactIdsByBundle, artifact.evidenceBundleId, artifact.evidenceArtifactId);
    bundle.artifactCount = (state.artifactIdsByBundle.get(bundle.evidenceBundleId) || []).length;
    bundle.updatedAt = artifact.createdAt;
    appendAuditEvent({
      companyId: bundle.companyId,
      actorId: artifact.createdByActorId,
      correlationId,
      action: "evidence.artifact.appended",
      entityType: "evidence_bundle",
      entityId: bundle.evidenceBundleId,
      explanation: `Appended ${artifact.artifactType} artifact to evidence bundle ${bundle.evidenceBundleId}.`
    });
    return clone(artifact);
  }

  function freezeEvidenceBundle({
    companyId,
    evidenceBundleId,
    actorId = "system",
    correlationId = crypto.randomUUID(),
    auditRefs = [],
    sourceRefs = [],
    signoffRefs = [],
    relatedObjectRefs = []
  } = {}) {
    const bundle = requireBundle(companyId, evidenceBundleId);
    if (bundle.status === "frozen" || bundle.status === "archived") {
      return materializeEvidenceBundle(bundle.evidenceBundleId);
    }
    bundle.auditRefs = normalizeObjectList(auditRefs);
    bundle.sourceRefs = normalizeObjectList(sourceRefs);
    bundle.signoffRefs = normalizeObjectList(signoffRefs);
    bundle.relatedObjectRefs = normalizeRefs(relatedObjectRefs);
    bundle.checksum = hashObject({
      bundle: {
        companyId: bundle.companyId,
        bundleType: bundle.bundleType,
        sourceObjectType: bundle.sourceObjectType,
        sourceObjectId: bundle.sourceObjectId,
        sourceObjectVersion: bundle.sourceObjectVersion,
        environmentMode: bundle.environmentMode,
        retentionClass: bundle.retentionClass,
        classificationCode: bundle.classificationCode,
        metadata: bundle.metadata
      },
      artifacts: listArtifacts(bundle.evidenceBundleId).map((artifact) => ({
        artifactType: artifact.artifactType,
        artifactRef: artifact.artifactRef,
        checksum: artifact.checksum,
        contentHash: artifact.contentHash,
        roleCode: artifact.roleCode,
        metadata: artifact.metadata
      })),
      auditRefs: bundle.auditRefs,
      sourceRefs: bundle.sourceRefs,
      signoffRefs: bundle.signoffRefs,
      relatedObjectRefs: bundle.relatedObjectRefs
    });
    bundle.status = "frozen";
    bundle.frozenAt = nowIso(clock);
    bundle.updatedAt = bundle.frozenAt;
    appendAuditEvent({
      companyId: bundle.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "evidence.bundle.frozen",
      entityType: "evidence_bundle",
      entityId: bundle.evidenceBundleId,
      explanation: `Froze evidence bundle ${bundle.evidenceBundleId}.`
    });
    return materializeEvidenceBundle(bundle.evidenceBundleId);
  }

  function archiveEvidenceBundle({
    companyId,
    evidenceBundleId,
    actorId = "system",
    correlationId = crypto.randomUUID(),
    reasonCode = "superseded"
  } = {}) {
    const bundle = requireBundle(companyId, evidenceBundleId);
    if (bundle.status === "archived") {
      return materializeEvidenceBundle(bundle.evidenceBundleId);
    }
    if (bundle.status === "open") {
      freezeEvidenceBundle({
        companyId,
        evidenceBundleId,
        actorId,
        correlationId
      });
    }
    bundle.status = "archived";
    bundle.archivedAt = nowIso(clock);
    bundle.updatedAt = bundle.archivedAt;
    bundle.archiveReasonCode = requireText(reasonCode, "evidence_archive_reason_required");
    appendAuditEvent({
      companyId: bundle.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "evidence.bundle.archived",
      entityType: "evidence_bundle",
      entityId: bundle.evidenceBundleId,
      explanation: `Archived evidence bundle ${bundle.evidenceBundleId} with reason ${bundle.archiveReasonCode}.`
    });
    return materializeEvidenceBundle(bundle.evidenceBundleId);
  }

  function createFrozenEvidenceBundleSnapshot({
    companyId,
    bundleType,
    sourceObjectType,
    sourceObjectId,
    sourceObjectVersion = null,
    title = null,
    retentionClass = "regulated",
    classificationCode = "restricted_internal",
    metadata = {},
    artifactRefs = [],
    auditRefs = [],
    sourceRefs = [],
    signoffRefs = [],
    relatedObjectRefs = [],
    actorId = "system",
    correlationId = crypto.randomUUID(),
    previousEvidenceBundleId = null,
    environmentMode: explicitEnvironmentMode = null
  } = {}) {
    const normalizedMetadata = clone(metadata || {});
    const fingerprint = normalizeOptionalText(normalizedMetadata.contentFingerprint) || hashObject({
      bundleType,
      sourceObjectType,
      sourceObjectId,
      sourceObjectVersion: normalizeOptionalText(sourceObjectVersion),
      metadata: normalizedMetadata,
      artifactRefs: normalizeObjectList(artifactRefs),
      auditRefs: normalizeObjectList(auditRefs),
      sourceRefs: normalizeObjectList(sourceRefs),
      signoffRefs: normalizeObjectList(signoffRefs),
      relatedObjectRefs: normalizeRefs(relatedObjectRefs)
    });
    normalizedMetadata.contentFingerprint = fingerprint;

    const previousBundle = previousEvidenceBundleId
      ? state.bundles.get(text(previousEvidenceBundleId, "evidence_bundle_id_required"))
      : findLatestBundleForSource({
          companyId,
          bundleType,
          sourceObjectType,
          sourceObjectId
        });

    if (
      previousBundle &&
      previousBundle.companyId === text(companyId, "company_id_required") &&
      previousBundle.metadata?.contentFingerprint === fingerprint &&
      previousBundle.status !== "archived"
    ) {
      return materializeEvidenceBundle(previousBundle.evidenceBundleId);
    }

    const bundle = createEvidenceBundle({
      companyId,
      bundleType,
      sourceObjectType,
      sourceObjectId,
      sourceObjectVersion,
      title,
      retentionClass,
      classificationCode,
      metadata: normalizedMetadata,
      actorId,
      correlationId,
      relatedObjectRefs,
      environmentMode: explicitEnvironmentMode
    });
    for (const artifactRef of normalizeObjectList(artifactRefs)) {
      appendEvidenceArtifact({
        companyId,
        evidenceBundleId: bundle.evidenceBundleId,
        artifactType: requireText(artifactRef.artifactType, "evidence_artifact_type_required"),
        artifactRef: artifactRef.artifactRef || null,
        checksum: artifactRef.checksum || artifactRef.contentHash || null,
        contentHash: artifactRef.contentHash || artifactRef.checksum || null,
        roleCode: artifactRef.roleCode || null,
        metadata: artifactRef.metadata || {},
        immutable: artifactRef.immutable !== false,
        actorId,
        correlationId
      });
    }
    const frozen = freezeEvidenceBundle({
      companyId,
      evidenceBundleId: bundle.evidenceBundleId,
      actorId,
      correlationId,
      auditRefs,
      sourceRefs,
      signoffRefs,
      relatedObjectRefs
    });
    if (previousBundle && previousBundle.evidenceBundleId !== frozen.evidenceBundleId && previousBundle.status !== "archived") {
      const archived = state.bundles.get(previousBundle.evidenceBundleId);
      archived.priorEvidenceBundleId = frozen.evidenceBundleId;
      archiveEvidenceBundle({
        companyId,
        evidenceBundleId: previousBundle.evidenceBundleId,
        actorId,
        correlationId,
        reasonCode: "superseded"
      });
    }
    return frozen;
  }

  function listEvidenceBundles({
    companyId,
    bundleType = null,
    sourceObjectType = null,
    sourceObjectId = null,
    status = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedBundleType = normalizeOptionalText(bundleType);
    const resolvedSourceObjectType = normalizeOptionalText(sourceObjectType);
    const resolvedSourceObjectId = normalizeOptionalText(sourceObjectId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.bundleIdsByCompany.get(resolvedCompanyId) || [])
      .map((bundleId) => state.bundles.get(bundleId))
      .filter(Boolean)
      .filter((bundle) => (resolvedBundleType ? bundle.bundleType === resolvedBundleType : true))
      .filter((bundle) => (resolvedSourceObjectType ? bundle.sourceObjectType === resolvedSourceObjectType : true))
      .filter((bundle) => (resolvedSourceObjectId ? bundle.sourceObjectId === resolvedSourceObjectId : true))
      .filter((bundle) => (resolvedStatus ? bundle.status === resolvedStatus : true))
      .sort((left, right) => resolveBundleSortKey(left).localeCompare(resolveBundleSortKey(right)))
      .map((bundle) => materializeEvidenceBundle(bundle.evidenceBundleId));
  }

  function getEvidenceBundle({ companyId, evidenceBundleId } = {}) {
    return materializeEvidenceBundle(requireBundle(companyId, evidenceBundleId).evidenceBundleId);
  }

  function listEvidenceAuditEvents({ companyId, evidenceBundleId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedBundleId = normalizeOptionalText(evidenceBundleId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedBundleId ? event.entityId === resolvedBundleId : true))
      .map(clone);
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function materializeEvidenceBundle(evidenceBundleId) {
    const bundle = state.bundles.get(text(evidenceBundleId, "evidence_bundle_id_required"));
    if (!bundle) {
      throw createError(404, "evidence_bundle_not_found", "Evidence bundle was not found.");
    }
    return clone({
      ...bundle,
      artifacts: listArtifacts(bundle.evidenceBundleId)
    });
  }

  function listArtifacts(evidenceBundleId) {
    return (state.artifactIdsByBundle.get(text(evidenceBundleId, "evidence_bundle_id_required")) || [])
      .map((artifactId) => state.artifacts.get(artifactId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function requireBundle(companyId, evidenceBundleId) {
    const bundle = state.bundles.get(text(evidenceBundleId, "evidence_bundle_id_required"));
    if (!bundle || bundle.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "evidence_bundle_not_found", "Evidence bundle was not found.");
    }
    return bundle;
  }

  function findLatestBundleForSource({ companyId, bundleType, sourceObjectType, sourceObjectId }) {
    const sourceKey = toSourceKey(
      requireText(companyId, "company_id_required"),
      requireText(sourceObjectType, "evidence_source_object_type_required"),
      requireText(sourceObjectId, "evidence_source_object_id_required")
    );
    return (state.bundleIdsBySource.get(sourceKey) || [])
      .map((bundleId) => state.bundles.get(bundleId))
      .filter(Boolean)
      .filter((bundle) => bundle.bundleType === requireText(bundleType, "evidence_bundle_type_required"))
      .sort((left, right) => resolveBundleSortKey(right).localeCompare(resolveBundleSortKey(left)))[0] || null;
  }

  function appendAuditEvent({
    companyId,
    actorId,
    correlationId,
    action,
    entityType,
    entityId,
    explanation
  }) {
    state.auditEvents.push(
      createAuditEnvelope({
        companyId,
        actorId,
        correlationId,
        action,
        entityType,
        entityId,
        explanation,
        result: "success",
        auditClass: "evidence_action",
        recordedAt: nowIso(clock)
      })
    );
  }
}

function resolveBundleSortKey(bundle) {
  return bundle.frozenAt || bundle.createdAt;
}

function appendToIndex(map, key, value) {
  const existing = map.get(key) || [];
  if (!existing.includes(value)) {
    map.set(key, [...existing, value]);
  }
}

function toSourceKey(companyId, sourceObjectType, sourceObjectId) {
  return `${companyId}::${sourceObjectType}::${sourceObjectId}`;
}


function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, "Required text value is missing.");
  }
  return value.trim();
}

function text(value, code) {
  return requireText(value, code);
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function normalizeRefs(refs) {
  return normalizeObjectList(refs).map((entry) => ({
    objectType: requireText(entry.objectType, "evidence_ref_object_type_required"),
    objectId: requireText(entry.objectId, "evidence_ref_object_id_required"),
    relationCode: normalizeOptionalText(entry.relationCode),
    metadata: clone(entry.metadata || {})
  }));
}

function normalizeObjectList(value) {
  return Array.isArray(value) ? value.map((entry) => clone(entry || {})) : [];
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
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

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
