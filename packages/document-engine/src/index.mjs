import crypto from "node:crypto";

export const DOCUMENT_STATES = Object.freeze([
  "received",
  "virus_scanned",
  "stored",
  "ocr_done",
  "classified",
  "reviewed",
  "linked",
  "archived",
  "under_legal_hold",
  "deletion_pending",
  "deleted"
]);

export const DOCUMENT_VARIANT_TYPES = Object.freeze([
  "original",
  "ocr",
  "rendered_pdf",
  "thumbnail",
  "classification"
]);

export function createDocumentArchiveEngine({ clock = () => new Date() } = {}) {
  const state = {
    documents: new Map(),
    versions: new Map(),
    links: new Map(),
    versionIdsByDocument: new Map(),
    linkIdsByDocument: new Map(),
    auditEvents: []
  };

  return {
    createDocumentRecord,
    appendDocumentVersion,
    linkDocumentRecord,
    exportDocumentChain,
    getDocumentRecord,
    snapshotDocumentArchive
  };

  function createDocumentRecord({
    companyId,
    documentType = null,
    sourceChannel = "manual",
    sourceReference = null,
    retentionPolicyCode = null,
    metadataJson = {},
    receivedAt = nowIso(),
    actorId = "system",
    correlationId = crypto.randomUUID(),
    documentId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required", "Company id is required.");
    const now = nowIso();
    const document = {
      documentId,
      companyId: resolvedCompanyId,
      documentType,
      status: "received",
      sourceChannel: requireText(sourceChannel, "source_channel_required", "Source channel is required."),
      sourceReference: sourceReference || null,
      retentionPolicyCode,
      duplicateOfDocumentId: null,
      metadataJson: copy(metadataJson),
      receivedAt: normalizeTimestamp(receivedAt),
      storageConfirmedAt: null,
      lastExportedAt: null,
      createdAt: now,
      updatedAt: now
    };

    state.documents.set(document.documentId, document);
    state.versionIdsByDocument.set(document.documentId, []);
    state.linkIdsByDocument.set(document.documentId, []);
    pushAudit({
      companyId: document.companyId,
      actorId,
      action: "document.received",
      result: "success",
      entityType: "document",
      entityId: document.documentId,
      explanation: `Document received from ${document.sourceChannel}.`,
      correlationId
    });

    return copy(document);
  }

  function appendDocumentVersion({
    companyId,
    documentId,
    variantType,
    storageKey,
    mimeType,
    contentText = null,
    contentBase64 = null,
    fileHash = null,
    fileSizeBytes = null,
    sourceReference = null,
    derivesFromDocumentVersionId = null,
    metadataJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const document = requireDocument({ companyId, documentId });
    const resolvedVariantType = requireVariantType(variantType);
    const resolvedStorageKey = requireText(storageKey, "storage_key_required", "Storage key is required.");
    const resolvedMimeType = requireText(mimeType, "mime_type_required", "MIME type is required.");
    const existingVersions = listDocumentVersions(document.documentId);
    const originalVersion = existingVersions.find((candidate) => candidate.variantType === "original");

    if (resolvedVariantType === "original" && originalVersion) {
      throw createError(409, "document_original_exists", "Original version already exists for this document.");
    }
    if (resolvedVariantType !== "original" && !originalVersion) {
      throw createError(409, "document_original_missing", "A derivative cannot be stored before the original version exists.");
    }

    let derivedFromVersionId = derivesFromDocumentVersionId || null;
    if (resolvedVariantType !== "original") {
      derivedFromVersionId = requireText(
        derivedFromVersionId,
        "derived_from_version_required",
        "Derivative versions must reference the version they derive from."
      );
    }
    if (derivedFromVersionId) {
      const parent = state.versions.get(derivedFromVersionId);
      if (!parent || parent.documentId !== document.documentId) {
        throw createError(400, "derived_from_version_invalid", "Derived version must point to a version in the same document chain.");
      }
    }

    const { resolvedHash, resolvedSize } = resolveContent({
      contentText,
      contentBase64,
      fileHash,
      fileSizeBytes
    });

    const version = {
      documentVersionId: crypto.randomUUID(),
      documentId: document.documentId,
      companyId: document.companyId,
      variantType: resolvedVariantType,
      immutable: true,
      storageKey: resolvedStorageKey,
      mimeType: resolvedMimeType,
      contentHash: resolvedHash,
      fileSizeBytes: resolvedSize,
      sourceReference: sourceReference || document.sourceReference || null,
      derivesFromDocumentVersionId: derivedFromVersionId,
      metadataJson: copy(metadataJson),
      createdAt: nowIso()
    };

    const duplicateOfDocumentIds = findDuplicateDocumentIds({
      companyId: document.companyId,
      documentId: document.documentId,
      contentHash: version.contentHash,
      sourceReference: version.sourceReference
    });

    state.versions.set(version.documentVersionId, version);
    state.versionIdsByDocument.get(document.documentId).push(version.documentVersionId);
    document.status = "stored";
    document.storageConfirmedAt ??= nowIso();
    document.updatedAt = nowIso();
    if (duplicateOfDocumentIds.length > 0 && !document.duplicateOfDocumentId) {
      document.duplicateOfDocumentId = duplicateOfDocumentIds[0];
    }

    pushAudit({
      companyId: document.companyId,
      actorId,
      action: "document.version.stored",
      result: "success",
      entityType: "document_version",
      entityId: version.documentVersionId,
      explanation: `${resolvedVariantType} version stored under ${resolvedStorageKey}.`,
      correlationId
    });

    if (duplicateOfDocumentIds.length > 0) {
      pushAudit({
        companyId: document.companyId,
        actorId,
        action: "document.duplicate.detected",
        result: "warning",
        entityType: "document",
        entityId: document.documentId,
        explanation: `Duplicate detected against document(s): ${duplicateOfDocumentIds.join(", ")}.`,
        correlationId
      });
    }

    return {
      document: copy(document),
      version: copy(version),
      duplicateDetected: duplicateOfDocumentIds.length > 0,
      duplicateOfDocumentIds
    };
  }

  function linkDocumentRecord({
    companyId,
    documentId,
    targetType,
    targetId,
    metadataJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const document = requireDocument({ companyId, documentId });
    const resolvedTargetType = requireText(targetType, "target_type_required", "Link target type is required.");
    const resolvedTargetId = requireText(targetId, "target_id_required", "Link target id is required.");
    const existing = listDocumentLinks(document.documentId).find(
      (candidate) => candidate.targetType === resolvedTargetType && candidate.targetId === resolvedTargetId
    );
    if (existing) {
      return {
        document: copy(document),
        link: copy(existing)
      };
    }

    const link = {
      documentLinkId: crypto.randomUUID(),
      documentId: document.documentId,
      companyId: document.companyId,
      targetType: resolvedTargetType,
      targetId: resolvedTargetId,
      linkedByActorId: actorId,
      metadataJson: copy(metadataJson),
      linkedAt: nowIso()
    };

    state.links.set(link.documentLinkId, link);
    state.linkIdsByDocument.get(document.documentId).push(link.documentLinkId);
    document.status = "linked";
    document.updatedAt = nowIso();

    pushAudit({
      companyId: document.companyId,
      actorId,
      action: "document.linked",
      result: "success",
      entityType: "document_link",
      entityId: link.documentLinkId,
      explanation: `Document linked to ${resolvedTargetType}:${resolvedTargetId}.`,
      correlationId
    });

    return {
      document: copy(document),
      link: copy(link)
    };
  }

  function exportDocumentChain({ companyId, documentId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const document = requireDocument({ companyId, documentId });
    document.lastExportedAt = nowIso();
    document.updatedAt = nowIso();

    pushAudit({
      companyId: document.companyId,
      actorId,
      action: "document.exported",
      result: "success",
      entityType: "document",
      entityId: document.documentId,
      explanation: "Document chain exported.",
      correlationId
    });

    const versions = listDocumentVersions(document.documentId);
    const links = listDocumentLinks(document.documentId);
    const versionIds = new Set(versions.map((candidate) => candidate.documentVersionId));
    const linkIds = new Set(links.map((candidate) => candidate.documentLinkId));
    const auditTrail = state.auditEvents
      .filter((event) => {
        if (event.companyId !== document.companyId) {
          return false;
        }
        if (event.entityType === "document" && event.entityId === document.documentId) {
          return true;
        }
        if (event.entityType === "document_version" && versionIds.has(event.entityId)) {
          return true;
        }
        if (event.entityType === "document_link" && linkIds.has(event.entityId)) {
          return true;
        }
        return false;
      })
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map((event) => copy(event));

    return {
      document: copy(document),
      versions: versions.map((candidate) => copy(candidate)),
      links: links.map((candidate) => copy(candidate)),
      auditTrail
    };
  }

  function getDocumentRecord({ companyId, documentId } = {}) {
    return copy(requireDocument({ companyId, documentId }));
  }

  function snapshotDocumentArchive() {
    return {
      documents: [...state.documents.values()].map((candidate) => copy(candidate)),
      versions: [...state.versions.values()].map((candidate) => copy(candidate)),
      links: [...state.links.values()].map((candidate) => copy(candidate)),
      auditEvents: state.auditEvents.map((candidate) => copy(candidate))
    };
  }

  function requireDocument({ companyId, documentId }) {
    const resolvedDocumentId = requireText(documentId, "document_id_required", "Document id is required.");
    const document = state.documents.get(resolvedDocumentId);
    if (!document) {
      throw createError(404, "document_not_found", "Document was not found.");
    }
    if (companyId && document.companyId !== companyId) {
      throw createError(403, "cross_company_forbidden", "Document belongs to another company.");
    }
    return document;
  }

  function listDocumentVersions(documentId) {
    return (state.versionIdsByDocument.get(documentId) || [])
      .map((versionId) => state.versions.get(versionId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function listDocumentLinks(documentId) {
    return (state.linkIdsByDocument.get(documentId) || [])
      .map((linkId) => state.links.get(linkId))
      .filter(Boolean)
      .sort((left, right) => left.linkedAt.localeCompare(right.linkedAt));
  }

  function findDuplicateDocumentIds({ companyId, documentId, contentHash, sourceReference }) {
    const duplicates = new Set();
    for (const version of state.versions.values()) {
      if (version.companyId !== companyId || version.documentId === documentId) {
        continue;
      }
      if (version.contentHash === contentHash) {
        duplicates.add(version.documentId);
        continue;
      }
      if (sourceReference && version.sourceReference && version.sourceReference === sourceReference) {
        duplicates.add(version.documentId);
      }
    }
    for (const candidate of state.documents.values()) {
      if (candidate.companyId !== companyId || candidate.documentId === documentId) {
        continue;
      }
      if (sourceReference && candidate.sourceReference && candidate.sourceReference === sourceReference) {
        duplicates.add(candidate.documentId);
      }
    }
    return [...duplicates].sort();
  }

  function pushAudit({ companyId, actorId, action, result, entityType, entityId, explanation, correlationId }) {
    state.auditEvents.push({
      auditId: crypto.randomUUID(),
      companyId,
      actorId,
      action,
      result,
      entityType,
      entityId,
      explanation,
      correlationId,
      recordedAt: nowIso()
    });
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

function requireVariantType(value) {
  const variantType = requireText(value, "variant_type_required", "Variant type is required.");
  if (!DOCUMENT_VARIANT_TYPES.includes(variantType)) {
    throw createError(400, "variant_type_invalid", `Unsupported document variant type: ${variantType}.`);
  }
  return variantType;
}

function resolveContent({ contentText, contentBase64, fileHash, fileSizeBytes }) {
  let buffer = null;
  if (typeof contentBase64 === "string" && contentBase64.length > 0) {
    buffer = Buffer.from(contentBase64, "base64");
  } else if (typeof contentText === "string") {
    buffer = Buffer.from(contentText, "utf8");
  }

  const resolvedHash =
    typeof fileHash === "string" && fileHash.length > 0
      ? fileHash
      : crypto.createHash("sha256").update(buffer || Buffer.from("")).digest("hex");
  const resolvedSize = Number.isFinite(fileSizeBytes) ? Number(fileSizeBytes) : (buffer?.byteLength ?? 0);
  return {
    resolvedHash,
    resolvedSize
  };
}

function normalizeTimestamp(value) {
  return new Date(value).toISOString();
}

function requireText(value, code, message) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, message);
  }
  return value.trim();
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}
