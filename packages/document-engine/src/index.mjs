import crypto from "node:crypto";
import { createAuditEnvelope } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import {
  createGoogleDocumentAiProvider,
  GOOGLE_DOCUMENT_AI_PROVIDER_CODE
} from "../../domain-integrations/src/providers/google-document-ai.mjs";

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

export const INBOX_CHANNEL_STATUSES = Object.freeze(["active", "disabled"]);
export const EMAIL_INGEST_STATES = Object.freeze(["received", "accepted", "rejected", "quarantined"]);
export const EMAIL_ATTACHMENT_STATES = Object.freeze(["received", "queued", "quarantined"]);
export const ATTACHMENT_SCAN_RESULTS = Object.freeze(["clean", "malware", "spam", "policy_violation"]);
export const OCR_RUN_STATES = Object.freeze(["queued", "running", "completed", "failed", "superseded"]);
export const REVIEW_TASK_STATES = Object.freeze(["open", "claimed", "corrected", "approved", "rejected", "requeued"]);
export const OCR_DOCUMENT_TYPES = Object.freeze(["supplier_invoice", "expense_receipt", "contract", "unknown"]);

const MAX_ATTACHMENTS_PER_MESSAGE = 10;
const MAX_OCR_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_OCR_PAGE_COUNT = 500;

export function createDocumentArchiveEngine({
  clock = () => new Date(),
  environmentMode = "test",
  getIntegrationsPlatform = null,
  ocrProvider = null
} = {}) {
  const defaultOcrProvider =
    ocrProvider ||
    createGoogleDocumentAiProvider({
      clock,
      environmentMode,
      providerEnvironmentRef: environmentMode === "production" ? "production" : "sandbox"
    });
  const state = {
    documents: new Map(),
    versions: new Map(),
    links: new Map(),
    versionIdsByDocument: new Map(),
    linkIdsByDocument: new Map(),
    inboxChannels: new Map(),
    inboxChannelIdByKey: new Map(),
    inboxChannelIdByAddress: new Map(),
    emailMessages: new Map(),
    attachmentIdsByMessage: new Map(),
    attachments: new Map(),
    ocrRuns: new Map(),
    ocrRunIdsByDocument: new Map(),
    reviewTasks: new Map(),
    reviewTaskIdsByDocument: new Map(),
    auditEvents: []
  };

  const engine = {
    createDocumentRecord,
    appendDocumentVersion,
    linkDocumentRecord,
    exportDocumentChain,
    getDocumentRecord,
    getDocumentVersions,
    registerInboxChannel,
    ingestEmailMessage,
    getEmailIngestMessage,
    runDocumentOcr,
    completeDocumentOcrProviderCallback,
    getDocumentOcrRuns,
    claimReviewTask,
    correctReviewTask,
    approveReviewTask,
    getReviewTask,
    snapshotDocumentArchive
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function createDocumentRecord({
    companyId,
    documentType = null,
    sourceChannel = "manual",
    sourceReference = null,
    retentionPolicyCode = null,
    retentionClassCode = null,
    metadataJson = {},
    receivedAt = nowIso(),
    actorId = "system",
    correlationId = crypto.randomUUID(),
    documentId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required", "Company id is required.");
    const now = nowIso();
    const resolvedMetadata = copy(metadataJson);
    const resolvedSourceChannel = requireText(sourceChannel, "source_channel_required", "Source channel is required.");
    const resolvedRetentionClassCode = resolveRetentionClassCode({
      retentionClassCode,
      retentionPolicyCode,
      metadataJson: resolvedMetadata
    });
    const sourceFingerprint = createSourceFingerprint({
      companyId: resolvedCompanyId,
      sourceChannel: resolvedSourceChannel,
      sourceReference,
      metadataJson: resolvedMetadata
    });
    const document = {
      documentId,
      companyId: resolvedCompanyId,
      documentType,
      status: "received",
      sourceChannel: resolvedSourceChannel,
      sourceReference: sourceReference || null,
      retentionPolicyCode,
      retentionClassCode: resolvedRetentionClassCode,
      sourceFingerprint,
      duplicateOfDocumentId: null,
      originalDocumentVersionId: null,
      latestDocumentVersionId: null,
      evidenceRefs: buildDocumentEvidenceRefs({
        documentId,
        sourceFingerprint,
        retentionClassCode: resolvedRetentionClassCode,
        originalDocumentVersionId: null,
        latestDocumentVersionId: null
      }),
      metadataJson: resolvedMetadata,
      receivedAt: normalizeTimestamp(receivedAt),
      storageConfirmedAt: null,
      lastExportedAt: null,
      createdAt: now,
      updatedAt: now
    };

    state.documents.set(document.documentId, document);
    state.versionIdsByDocument.set(document.documentId, []);
    state.linkIdsByDocument.set(document.documentId, []);
    state.ocrRunIdsByDocument.set(document.documentId, []);
    state.reviewTaskIdsByDocument.set(document.documentId, []);
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
    retentionClassCode = null,
    derivesFromDocumentVersionId = null,
    metadataJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const document = requireDocument({ companyId, documentId });
    const resolvedVariantType = requireVariantType(variantType);
    const resolvedStorageKey = requireText(storageKey, "storage_key_required", "Storage key is required.");
    const resolvedMimeType = normalizeMimeType(mimeType);
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
    const storedMetadata = copy(metadataJson);
    if (typeof contentText === "string" && contentText.length > 0 && storedMetadata.ocrSourceText === undefined) {
      storedMetadata.ocrSourceText = contentText;
    }
    const resolvedRetentionClassCode = resolveRetentionClassCode({
      retentionClassCode,
      retentionPolicyCode: document.retentionPolicyCode,
      metadataJson: storedMetadata,
      fallbackRetentionClassCode: document.retentionClassCode
    });
    const resolvedSourceReference = sourceReference || document.sourceReference || null;
    const sourceFingerprint = createSourceFingerprint({
      companyId: document.companyId,
      sourceChannel: document.sourceChannel,
      sourceReference: resolvedSourceReference,
      metadataJson: {
        ...copy(document.metadataJson),
        ...storedMetadata
      }
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
      checksumAlgorithm: "sha256",
      checksumSha256: resolvedHash,
      fileSizeBytes: resolvedSize,
      sourceReference: resolvedSourceReference,
      sourceFingerprint,
      retentionClassCode: resolvedRetentionClassCode,
      derivesFromDocumentVersionId: derivedFromVersionId,
      evidenceRefs: buildDocumentVersionEvidenceRefs({
        documentId: document.documentId,
        documentVersionId: null,
        storageKey: resolvedStorageKey,
        checksumSha256: resolvedHash,
        sourceFingerprint,
        retentionClassCode: resolvedRetentionClassCode,
        derivesFromDocumentVersionId: derivedFromVersionId
      }),
      metadataJson: storedMetadata,
      createdAt: nowIso()
    };
    version.evidenceRefs = buildDocumentVersionEvidenceRefs({
      documentId: document.documentId,
      documentVersionId: version.documentVersionId,
      storageKey: resolvedStorageKey,
      checksumSha256: resolvedHash,
      sourceFingerprint,
      retentionClassCode: resolvedRetentionClassCode,
      derivesFromDocumentVersionId: derivedFromVersionId
    });

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
    document.retentionClassCode = resolvedRetentionClassCode;
    document.sourceFingerprint = sourceFingerprint;
    document.originalDocumentVersionId ??= version.documentVersionId;
    document.latestDocumentVersionId = version.documentVersionId;
    document.evidenceRefs = buildDocumentEvidenceRefs({
      documentId: document.documentId,
      sourceFingerprint,
      retentionClassCode: resolvedRetentionClassCode,
      originalDocumentVersionId: document.originalDocumentVersionId,
      latestDocumentVersionId: document.latestDocumentVersionId
    });
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
    document.evidenceRefs = buildDocumentEvidenceRefs({
      documentId: document.documentId,
      sourceFingerprint: document.sourceFingerprint,
      retentionClassCode: document.retentionClassCode,
      originalDocumentVersionId: document.originalDocumentVersionId,
      latestDocumentVersionId: document.latestDocumentVersionId
    });
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

  function getDocumentVersions({ companyId, documentId } = {}) {
    requireDocument({ companyId, documentId });
    return listDocumentVersions(documentId).map(copy);
  }

  function registerInboxChannel({
    companyId,
    channelCode,
    inboundAddress,
    useCase,
    allowedMimeTypes,
    maxAttachmentSizeBytes,
    defaultDocumentType = null,
    classificationConfidenceThreshold = null,
    fieldConfidenceThreshold = null,
    defaultReviewQueueCode = "classification_low_confidence",
    metadataJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID(),
    inboxChannelId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required", "Company id is required.");
    const resolvedChannelCode = requireText(channelCode, "channel_code_required", "Channel code is required.");
    const resolvedInboundAddress = normalizeEmailAddress(inboundAddress);
    const resolvedUseCase = requireText(useCase, "use_case_required", "Use case is required.");
    const resolvedAllowedMimeTypes = resolveAllowedMimeTypes(allowedMimeTypes);
    const resolvedMaxAttachmentSizeBytes = requirePositiveInteger(
      maxAttachmentSizeBytes,
      "max_attachment_size_invalid",
      "Max attachment size must be a positive integer."
    );
    const channelKey = `${resolvedCompanyId}:${resolvedChannelCode}`;

    if (state.inboxChannelIdByKey.has(channelKey)) {
      throw createError(409, "inbox_channel_exists", "Inbox channel already exists for this company and channel code.");
    }
    if (state.inboxChannelIdByAddress.has(resolvedInboundAddress)) {
      throw createError(409, "inbound_address_exists", "Inbound address is already registered.");
    }

    const now = nowIso();
    const channel = {
      inboxChannelId,
      companyId: resolvedCompanyId,
      channelCode: resolvedChannelCode,
      inboundAddress: resolvedInboundAddress,
      useCase: resolvedUseCase,
      status: "active",
      allowedMimeTypes: resolvedAllowedMimeTypes,
      maxAttachmentSizeBytes: resolvedMaxAttachmentSizeBytes,
      defaultDocumentType: defaultDocumentType || null,
      classificationConfidenceThreshold: resolveOptionalThreshold(
        classificationConfidenceThreshold,
        "classification_threshold_invalid",
        "Classification confidence threshold must be between 0 and 1."
      ),
      fieldConfidenceThreshold: resolveOptionalThreshold(
        fieldConfidenceThreshold,
        "field_threshold_invalid",
        "Field confidence threshold must be between 0 and 1."
      ),
      defaultReviewQueueCode: requireText(
        defaultReviewQueueCode,
        "review_queue_code_required",
        "Default review queue code is required."
      ),
      metadataJson: copy(metadataJson),
      createdAt: now,
      updatedAt: now
    };

    state.inboxChannels.set(channel.inboxChannelId, channel);
    state.inboxChannelIdByKey.set(channelKey, channel.inboxChannelId);
    state.inboxChannelIdByAddress.set(channel.inboundAddress, channel.inboxChannelId);

    pushAudit({
      companyId: channel.companyId,
      actorId,
      action: "inbox.channel.registered",
      result: "success",
      entityType: "inbox_channel",
      entityId: channel.inboxChannelId,
      explanation: `Inbox channel ${channel.channelCode} registered for ${channel.inboundAddress}.`,
      correlationId
    });

    return copy(channel);
  }

  function ingestEmailMessage({
    companyId = null,
    recipientAddress,
    messageId,
    rawStorageKey,
    senderAddress = null,
    subject = null,
    payloadJson = {},
    receivedAt = nowIso(),
    attachments = [],
    actorId = "system",
    correlationId = crypto.randomUUID(),
    emailIngestMessageId = crypto.randomUUID()
  } = {}) {
    const channel = requireInboxChannelByAddress(recipientAddress);
    if (companyId && channel.companyId !== companyId) {
      throw createError(403, "cross_company_forbidden", "Inbox channel belongs to another company.");
    }

    const resolvedMessageId = requireText(messageId, "message_id_required", "Message id is required.");
    const resolvedRawStorageKey = requireText(rawStorageKey, "raw_storage_key_required", "Raw storage key is required.");
    const resolvedAttachments = requireArray(attachments, "attachments_required", "Attachments must be an array.");
    if (resolvedAttachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw createError(
        400,
        "attachment_limit_exceeded",
        `A single message may not contain more than ${MAX_ATTACHMENTS_PER_MESSAGE} attachments.`
      );
    }

    const existingMessage = findEmailMessageDuplicate({
      companyId: channel.companyId,
      channelId: channel.inboxChannelId,
      messageId: resolvedMessageId
    });

    if (existingMessage) {
      pushAudit({
        companyId: channel.companyId,
        actorId,
        action: "email_ingest.duplicate_detected",
        result: "warning",
        entityType: "email_ingest_message",
        entityId: existingMessage.emailIngestMessageId,
        explanation: `Duplicate message-id ${resolvedMessageId} received for channel ${channel.channelCode}.`,
        correlationId
      });
      const existing = buildEmailIngestSummary(existingMessage, channel);
      return {
        ...existing,
        duplicateDetected: true
      };
    }

    const now = nowIso();
    const message = {
      emailIngestMessageId,
      companyId: channel.companyId,
      inboxChannelId: channel.inboxChannelId,
      channelCode: channel.channelCode,
      messageId: resolvedMessageId,
      recipientAddress: normalizeEmailAddress(recipientAddress),
      senderAddress: senderAddress ? normalizeEmailAddress(senderAddress) : null,
      subject: subject ? String(subject) : null,
      rawStorageKey: resolvedRawStorageKey,
      status: "received",
      duplicateOfEmailIngestMessageId: null,
      routedDocumentCount: 0,
      quarantinedAttachmentCount: 0,
      payloadJson: copy(payloadJson),
      receivedAt: normalizeTimestamp(receivedAt),
      createdAt: now,
      updatedAt: now
    };

    state.emailMessages.set(message.emailIngestMessageId, message);
    state.attachmentIdsByMessage.set(message.emailIngestMessageId, []);

    pushAudit({
      companyId: message.companyId,
      actorId,
      action: "email_ingest.received",
      result: "success",
      entityType: "email_ingest_message",
      entityId: message.emailIngestMessageId,
      explanation: `Raw email ${resolvedMessageId} received for ${channel.channelCode}.`,
      correlationId
    });

    if (resolvedAttachments.length === 0) {
      message.status = "rejected";
      message.updatedAt = nowIso();
      pushAudit({
        companyId: message.companyId,
        actorId,
        action: "email_ingest.rejected",
        result: "warning",
        entityType: "email_ingest_message",
        entityId: message.emailIngestMessageId,
        explanation: "Email ingest rejected because no attachments were provided.",
        correlationId
      });
      return {
        ...buildEmailIngestSummary(message, channel),
        duplicateDetected: false
      };
    }

    for (const [index, attachmentInput] of resolvedAttachments.entries()) {
      const attachment = createEmailAttachmentRecord({
        channel,
        message,
        attachmentInput,
        attachmentIndex: index,
        actorId,
        correlationId
      });
      if (attachment.status === "quarantined") {
        message.quarantinedAttachmentCount += 1;
      }
      if (attachment.documentId) {
        message.routedDocumentCount += 1;
      }
    }

    if (message.routedDocumentCount > 0) {
      message.status = "accepted";
    } else if (message.quarantinedAttachmentCount > 0) {
      message.status = "quarantined";
    } else {
      message.status = "rejected";
    }
    message.updatedAt = nowIso();

    pushAudit({
      companyId: message.companyId,
      actorId,
      action: `email_ingest.${message.status}`,
      result: message.status === "accepted" ? "success" : "warning",
      entityType: "email_ingest_message",
      entityId: message.emailIngestMessageId,
      explanation: `Email ingest finished with ${message.routedDocumentCount} routed attachment(s) and ${message.quarantinedAttachmentCount} quarantined attachment(s).`,
      correlationId
    });

    return {
      ...buildEmailIngestSummary(message, channel),
      duplicateDetected: false
    };
  }

  function getEmailIngestMessage({ companyId, emailIngestMessageId } = {}) {
    const message = requireEmailMessage({ companyId, emailIngestMessageId });
    const channel = state.inboxChannels.get(message.inboxChannelId);
    return buildEmailIngestSummary(message, channel);
  }

  function runDocumentOcr({
    companyId,
    documentId,
    reasonCode = "initial_ingest",
    modelVersion = null,
    callbackMode = "auto",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const document = requireDocument({ companyId, documentId });
    const channel = requireInboxChannelForDocument(document);
    const thresholds = requireOcrThresholds(channel);
    const originalVersion = requireOriginalDocumentVersion(document.documentId);
    const pageCount = resolvePageCount(originalVersion);
    const sourceText = buildOcrSourceText({ document, originalVersion });
    const resolvedOcrProvider = resolveDocumentOcrProvider({
      defaultOcrProvider,
      getIntegrationsPlatform
    });
    if (originalVersion.fileSizeBytes > MAX_OCR_FILE_SIZE_BYTES) {
      throw createError(409, "ocr_input_too_large", "Document exceeds the OCR size limit.");
    }
    if (pageCount > MAX_OCR_PAGE_COUNT) {
      throw createError(409, "ocr_page_limit_exceeded", "Document exceeds the OCR page limit.");
    }

    const now = nowIso();
    const run = {
      ocrRunId: crypto.randomUUID(),
      documentId: document.documentId,
      companyId: document.companyId,
      sourceDocumentVersionId: originalVersion.documentVersionId,
      profileCode: determineOcrProfile({
        channel,
        originalVersion,
        sourceText,
        filename: readMetadataText(originalVersion.metadataJson, "filename")
      }),
      modelVersion: null,
      reasonCode: requireText(reasonCode, "reason_code_required", "Reason code is required."),
      status: "queued",
      reviewRequired: false,
      suggestedDocumentType: "unknown",
      classificationConfidence: 0,
      classificationCandidatesJson: [],
      extractedText: "",
      extractedFieldsJson: {},
      providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
      providerEnvironmentRef: resolvedOcrProvider.providerEnvironmentRef || (environmentMode === "production" ? "production" : "sandbox"),
      processingMode: "sync",
      providerOperationRef: null,
      providerCallbackMode: "none",
      pageCount,
      maxSyncPages: null,
      maxBatchPages: null,
      processorType: null,
      qualityScore: null,
      textConfidence: null,
      supersededByOcrRunId: null,
      ocrDocumentVersionId: null,
      classificationDocumentVersionId: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      errorCode: null,
      metadataJson: {}
    };

    state.ocrRuns.set(run.ocrRunId, run);
    state.ocrRunIdsByDocument.get(document.documentId).push(run.ocrRunId);

    pushAudit({
      companyId: run.companyId,
      actorId,
      action: "ocr.run.requested",
      result: "success",
      entityType: "ocr_run",
      entityId: run.ocrRunId,
      explanation: `OCR run requested for document ${document.documentId}.`,
      correlationId
    });

    run.status = "running";
    run.startedAt = nowIso();
    run.updatedAt = nowIso();

    const providerOutcome = resolvedOcrProvider.startExtraction({
      companyId: document.companyId,
      documentId: document.documentId,
      mimeType: originalVersion.mimeType,
      filename: readMetadataText(originalVersion.metadataJson, "filename") || readMetadataText(document.metadataJson, "filename"),
      profileCode: run.profileCode,
      requestedModelVersion: normalizeOptionalText(modelVersion),
      reasonCode: run.reasonCode,
      pageCount,
      sourceText,
      callbackMode
    });
    hydrateRunFromProviderOutcome({ run, providerOutcome });

    if (providerOutcome.status !== "completed") {
      run.metadataJson = {
        ...copy(run.metadataJson),
        thresholds,
        callbackToken: providerOutcome.callbackToken
      };
      document.status = "ocr_done";
      document.updatedAt = nowIso();
      document.metadataJson.latestOcrRunId = run.ocrRunId;
      pushAudit({
        companyId: run.companyId,
        actorId,
        action: "ocr.run.accepted",
        result: "success",
        entityType: "ocr_run",
        entityId: run.ocrRunId,
        explanation: `OCR run ${run.ocrRunId} accepted by ${run.providerCode} in ${run.processingMode} mode.`,
        correlationId
      });
      return {
        document: copy(document),
        ocrRun: copy(run),
        reviewTask: null,
        ocrVersion: null,
        classificationVersion: null
      };
    }

    return finalizeCompletedOcrRun({
      document,
      channel,
      thresholds,
      originalVersion,
      run,
      providerOutcome,
      actorId,
      correlationId
    });
  }

  function completeDocumentOcrProviderCallback({
    companyId,
    documentId,
    ocrRunId,
    callbackToken = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const document = requireDocument({ companyId, documentId });
    const channel = requireInboxChannelForDocument(document);
    const thresholds = requireOcrThresholds(channel);
    const originalVersion = requireOriginalDocumentVersion(document.documentId);
    const run = requireOcrRun({ companyId, ocrRunId });
    if (run.documentId !== document.documentId) {
      throw createError(409, "ocr_run_document_mismatch", "OCR run does not belong to the provided document.");
    }
    if (run.status !== "running" || run.processingMode !== "batch_lro" || !run.providerOperationRef) {
      throw createError(409, "ocr_run_callback_not_pending", "OCR run is not awaiting provider callback completion.");
    }

    const resolvedOcrProvider = resolveDocumentOcrProvider({
      defaultOcrProvider,
      getIntegrationsPlatform
    });
    const providerOutcome = resolvedOcrProvider.collectOperation({
      operationName: run.providerOperationRef,
      callbackToken: callbackToken || run.metadataJson?.callbackToken || null
    });
    hydrateRunFromProviderOutcome({ run, providerOutcome });

    return finalizeCompletedOcrRun({
      document,
      channel,
      thresholds,
      originalVersion,
      run,
      providerOutcome,
      actorId,
      correlationId
    });
  }

  function getDocumentOcrRuns({ companyId, documentId } = {}) {
    const document = requireDocument({ companyId, documentId });
    return {
      document: copy(document),
      ocrRuns: listOcrRuns(document.documentId).map((candidate) => copy(candidate)),
      reviewTasks: listReviewTasks(document.documentId).map((candidate) => copy(candidate))
    };
  }

  function claimReviewTask({ companyId, reviewTaskId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const task = requireReviewTask({ companyId, reviewTaskId });
    if (!["open", "requeued"].includes(task.status)) {
      throw createError(409, "review_task_not_claimable", "Review task cannot be claimed from its current status.");
    }
    task.status = "claimed";
    task.claimedByActorId = actorId;
    task.claimedAt = nowIso();
    task.updatedAt = nowIso();

    pushAudit({
      companyId: task.companyId,
      actorId,
      action: "review_task.claimed",
      result: "success",
      entityType: "review_task",
      entityId: task.reviewTaskId,
      explanation: `Review task ${task.reviewTaskId} claimed.`,
      correlationId
    });

    return buildReviewTaskSummary(task);
  }

  function correctReviewTask({
    companyId,
    reviewTaskId,
    correctedDocumentType,
    correctedFieldsJson = {},
    correctionComment = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const task = requireReviewTask({ companyId, reviewTaskId });
    if (task.status === "open" || task.status === "requeued") {
      claimReviewTask({ companyId, reviewTaskId, actorId, correlationId });
    }
    if (task.status !== "claimed") {
      throw createError(409, "review_task_not_correctable", "Review task must be claimed before it can be corrected.");
    }

    const document = requireDocument({ companyId: task.companyId, documentId: task.documentId });
    const run = requireOcrRun({ companyId: task.companyId, ocrRunId: task.ocrRunId });
    const correctedType = requireDocumentType(correctedDocumentType);
    const manualClassificationVersion = appendDocumentVersion({
      companyId: task.companyId,
      documentId: task.documentId,
      variantType: "classification",
      storageKey: `documents/classification/${task.documentId}/${task.reviewTaskId}-manual.json`,
      mimeType: "application/json",
      contentText: JSON.stringify({
        correctedDocumentType: correctedType,
        correctedFieldsJson,
        correctionComment
      }),
      sourceReference: `${task.documentId}:classification:manual:${task.reviewTaskId}`,
      derivesFromDocumentVersionId: run.classificationDocumentVersionId,
      metadataJson: {
        reviewTaskId: task.reviewTaskId,
        correctedDocumentType: correctedType,
        correctedFieldsJson: copy(correctedFieldsJson),
        correctionComment
      },
      actorId,
      correlationId
    });

    task.correctedDocumentType = correctedType;
    task.correctedFieldsJson = copy(correctedFieldsJson);
    task.correctionComment = correctionComment || null;
    task.manualClassificationVersionId = manualClassificationVersion.version.documentVersionId;
    task.status = "corrected";
    task.correctedAt = nowIso();
    task.updatedAt = nowIso();
    document.updatedAt = nowIso();

    pushAudit({
      companyId: task.companyId,
      actorId,
      action: "review_task.corrected",
      result: "success",
      entityType: "review_task",
      entityId: task.reviewTaskId,
      explanation: `Review task ${task.reviewTaskId} corrected to ${correctedType}.`,
      correlationId
    });

    return buildReviewTaskSummary(task);
  }

  function approveReviewTask({ companyId, reviewTaskId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const task = requireReviewTask({ companyId, reviewTaskId });
    if (!["claimed", "corrected"].includes(task.status)) {
      throw createError(409, "review_task_not_approvable", "Review task cannot be approved from its current status.");
    }

    const document = requireDocument({ companyId: task.companyId, documentId: task.documentId });
    const finalDocumentType = task.correctedDocumentType || task.suggestedDocumentType || "unknown";
    document.documentType = finalDocumentType;
    document.status = "reviewed";
    document.updatedAt = nowIso();
    delete document.metadataJson.pendingReviewQueueCode;

    task.status = "approved";
    task.approvedByActorId = actorId;
    task.approvedAt = nowIso();
    task.updatedAt = nowIso();

    pushAudit({
      companyId: task.companyId,
      actorId,
      action: "review_task.approved",
      result: "success",
      entityType: "review_task",
      entityId: task.reviewTaskId,
      explanation: `Review task ${task.reviewTaskId} approved with final type ${finalDocumentType}.`,
      correlationId
    });

    return buildReviewTaskSummary(task);
  }

  function getReviewTask({ companyId, reviewTaskId } = {}) {
    return buildReviewTaskSummary(requireReviewTask({ companyId, reviewTaskId }));
  }

  function finalizeCompletedOcrRun({
    document,
    channel,
    thresholds,
    originalVersion,
    run,
    providerOutcome,
    actorId,
    correlationId
  }) {
    const sourceText = providerOutcome.sourceText;
    const classification = classifyDocument({
      channel,
      sourceText,
      filename: readMetadataText(originalVersion.metadataJson, "filename"),
      mimeType: originalVersion.mimeType
    });
    const heuristicExtractedFields = extractOcrFields({
      sourceText,
      suggestedDocumentType: classification.suggestedDocumentType
    });
    const providerExtractedFields = normalizeProviderExtractedFields(providerOutcome.entityHints);
    const extractedFields = {
      ...copy(heuristicExtractedFields),
      ...copy(providerExtractedFields)
    };
    const resolvedClassification = refineClassification({
      classification,
      extractedFields,
      thresholds
    });
    const reviewDecision = evaluateReviewRequirement({
      classification: resolvedClassification,
      extractedFields,
      thresholds,
      providerOutcome
    });

    const ocrVersion = appendDocumentVersion({
      companyId: document.companyId,
      documentId: document.documentId,
      variantType: "ocr",
      storageKey: `documents/ocr/${document.documentId}/${run.ocrRunId}.txt`,
      mimeType: "text/plain",
      contentText: sourceText,
      sourceReference: `${document.documentId}:ocr:${run.ocrRunId}`,
      derivesFromDocumentVersionId: originalVersion.documentVersionId,
      metadataJson: {
        ocrRunId: run.ocrRunId,
        profileCode: run.profileCode,
        modelVersion: run.modelVersion,
        reasonCode: run.reasonCode,
        pageCount: run.pageCount,
        providerCode: run.providerCode,
        providerEnvironmentRef: run.providerEnvironmentRef,
        processingMode: run.processingMode,
        providerOperationRef: run.providerOperationRef,
        processorType: run.processorType,
        processorVersion: run.modelVersion,
        qualityScore: run.qualityScore,
        textConfidence: run.textConfidence
      },
      actorId,
      correlationId
    });

    const classificationPayload = {
      suggestedDocumentType: resolvedClassification.suggestedDocumentType,
      confidence: resolvedClassification.confidence,
      candidates: resolvedClassification.candidates,
      extractedFields,
      reviewRequired: reviewDecision.reviewRequired,
      providerCode: run.providerCode,
      processingMode: run.processingMode,
      textConfidence: run.textConfidence,
      qualityScore: run.qualityScore
    };
    const classificationVersion = appendDocumentVersion({
      companyId: document.companyId,
      documentId: document.documentId,
      variantType: "classification",
      storageKey: `documents/classification/${document.documentId}/${run.ocrRunId}.json`,
      mimeType: "application/json",
      contentText: JSON.stringify(classificationPayload),
      sourceReference: `${document.documentId}:classification:${run.ocrRunId}`,
      derivesFromDocumentVersionId: ocrVersion.version.documentVersionId,
      metadataJson: {
        ocrRunId: run.ocrRunId,
        suggestedDocumentType: resolvedClassification.suggestedDocumentType,
        confidence: resolvedClassification.confidence,
        candidates: resolvedClassification.candidates,
        extractedFields,
        reviewRequired: reviewDecision.reviewRequired,
        providerCode: run.providerCode,
        processingMode: run.processingMode,
        textConfidence: run.textConfidence,
        qualityScore: run.qualityScore
      },
      actorId,
      correlationId
    });

    markPriorOcrRunsSuperseded({
      documentId: document.documentId,
      completedRunId: run.ocrRunId
    });

    run.status = "completed";
    run.reviewRequired = reviewDecision.reviewRequired;
    run.suggestedDocumentType = resolvedClassification.suggestedDocumentType;
    run.classificationConfidence = resolvedClassification.confidence;
    run.classificationCandidatesJson = resolvedClassification.candidates;
    run.extractedText = sourceText;
    run.extractedFieldsJson = extractedFields;
    run.ocrDocumentVersionId = ocrVersion.version.documentVersionId;
    run.classificationDocumentVersionId = classificationVersion.version.documentVersionId;
    run.completedAt = nowIso();
    run.updatedAt = nowIso();
    run.metadataJson = {
      ...copy(run.metadataJson),
      reviewReasonCode: reviewDecision.reasonCode,
      thresholds
    };

    document.status = "classified";
    document.updatedAt = nowIso();
    document.metadataJson.latestOcrRunId = run.ocrRunId;
    document.metadataJson.lastSuggestedDocumentType = resolvedClassification.suggestedDocumentType;
    document.metadataJson.lastClassificationConfidence = resolvedClassification.confidence;

    let reviewTask = null;
    if (reviewDecision.reviewRequired) {
      document.metadataJson.pendingReviewQueueCode = reviewDecision.queueCode;
      reviewTask = createReviewTask({
        document,
        run,
        reviewDecision,
        actorId,
        correlationId
      });
    } else {
      document.documentType = resolvedClassification.suggestedDocumentType;
      delete document.metadataJson.pendingReviewQueueCode;
    }

    pushAudit({
      companyId: run.companyId,
      actorId,
      action: "ocr.run.completed",
      result: reviewDecision.reviewRequired ? "warning" : "success",
      entityType: "ocr_run",
      entityId: run.ocrRunId,
      explanation: `OCR run completed with suggestion ${resolvedClassification.suggestedDocumentType} at confidence ${resolvedClassification.confidence.toFixed(2)}.`,
      correlationId
    });

    return {
      document: copy(document),
      ocrRun: copy(run),
      reviewTask: reviewTask ? copy(reviewTask) : null,
      ocrVersion: copy(ocrVersion.version),
      classificationVersion: copy(classificationVersion.version)
    };
  }

  function hydrateRunFromProviderOutcome({ run, providerOutcome }) {
    run.providerCode = providerOutcome.providerCode || GOOGLE_DOCUMENT_AI_PROVIDER_CODE;
    run.providerEnvironmentRef = providerOutcome.providerEnvironmentRef || run.providerEnvironmentRef;
    run.processingMode = providerOutcome.processingMode || "sync";
    run.providerOperationRef = providerOutcome.operationName || null;
    run.providerCallbackMode = providerOutcome.callbackMode || "none";
    run.pageCount = providerOutcome.pageCount || run.pageCount;
    run.maxSyncPages = providerOutcome.maxSyncPages ?? null;
    run.maxBatchPages = providerOutcome.maxBatchPages ?? null;
    run.processorType = providerOutcome.processorType || null;
    run.modelVersion = providerOutcome.processorVersion || run.modelVersion;
    run.qualityScore = typeof providerOutcome.qualityScore === "number" ? providerOutcome.qualityScore : null;
    run.textConfidence = typeof providerOutcome.textConfidence === "number" ? providerOutcome.textConfidence : null;
    run.metadataJson = {
      ...copy(run.metadataJson),
      providerBaselineRef: copy(providerOutcome.providerBaselineRef || null),
      pagePayloads: copy(providerOutcome.pages || []),
      entityHints: copy(providerOutcome.entityHints || {})
    };
    run.updatedAt = nowIso();
  }

  function markPriorOcrRunsSuperseded({ documentId, completedRunId }) {
    for (const candidate of listOcrRuns(documentId)) {
      if (candidate.ocrRunId === completedRunId || candidate.status !== "completed") {
        continue;
      }
      candidate.status = "superseded";
      candidate.supersededByOcrRunId = completedRunId;
      candidate.updatedAt = nowIso();
    }
  }

  function snapshotDocumentArchive() {
    return {
      documents: [...state.documents.values()].map((candidate) => copy(candidate)),
      versions: [...state.versions.values()].map((candidate) => copy(candidate)),
      links: [...state.links.values()].map((candidate) => copy(candidate)),
      inboxChannels: [...state.inboxChannels.values()].map((candidate) => copy(candidate)),
      emailMessages: [...state.emailMessages.values()].map((candidate) => copy(candidate)),
      emailAttachments: [...state.attachments.values()].map((candidate) => copy(candidate)),
      ocrRuns: [...state.ocrRuns.values()].map((candidate) => copy(candidate)),
      reviewTasks: [...state.reviewTasks.values()].map((candidate) => copy(candidate)),
      auditEvents: state.auditEvents.map((candidate) => copy(candidate))
    };
  }

  function createEmailAttachmentRecord({ channel, message, attachmentInput, attachmentIndex, actorId, correlationId }) {
    const resolvedInput = attachmentInput && typeof attachmentInput === "object" ? attachmentInput : {};
    const resolvedMimeType = normalizeMimeType(resolvedInput.mimeType);
    const resolvedFilename = requireText(resolvedInput.filename, "filename_required", "Attachment filename is required.");
    const resolvedStorageKey = requireText(resolvedInput.storageKey, "storage_key_required", "Attachment storage key is required.");
    const resolvedScanResult = resolveAttachmentScanResult(resolvedInput.scanResult);
    const sourceReference = `${message.messageId}:${attachmentIndex}`;
    ensureContentIdentity(resolvedInput);
    const { resolvedHash, resolvedSize } = resolveContent({
      contentText: resolvedInput.contentText || null,
      contentBase64: resolvedInput.contentBase64 || null,
      fileHash: resolvedInput.fileHash || null,
      fileSizeBytes: resolvedInput.fileSizeBytes ?? null
    });

    const quarantineReasonCode = resolveAttachmentQuarantineReason({
      channel,
      mimeType: resolvedMimeType,
      fileSizeBytes: resolvedSize,
      scanResult: resolvedScanResult
    });
    const attachment = {
      emailIngestAttachmentId: crypto.randomUUID(),
      emailIngestMessageId: message.emailIngestMessageId,
      companyId: message.companyId,
      attachmentIndex,
      filename: resolvedFilename,
      mimeType: resolvedMimeType,
      fileHash: resolvedHash,
      fileSizeBytes: resolvedSize,
      storageKey: resolvedStorageKey,
      scanResult: resolvedScanResult,
      status: quarantineReasonCode ? "quarantined" : "queued",
      quarantineReasonCode,
      documentId: null,
      metadataJson: copy(resolvedInput.metadataJson || {}),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    state.attachments.set(attachment.emailIngestAttachmentId, attachment);
    state.attachmentIdsByMessage.get(message.emailIngestMessageId).push(attachment.emailIngestAttachmentId);

    if (attachment.status === "quarantined") {
      pushAudit({
        companyId: attachment.companyId,
        actorId,
        action: "email_ingest.attachment.quarantined",
        result: "warning",
        entityType: "email_ingest_attachment",
        entityId: attachment.emailIngestAttachmentId,
        explanation: `Attachment ${attachment.filename} quarantined with reason ${attachment.quarantineReasonCode}.`,
        correlationId
      });
      return attachment;
    }

    const document = createDocumentRecord({
      companyId: message.companyId,
      documentType: resolvedInput.documentType || channel.defaultDocumentType || null,
      sourceChannel: "email_inbox",
      sourceReference,
      retentionPolicyCode: resolvedInput.retentionPolicyCode || null,
      metadataJson: {
        inboxChannelId: channel.inboxChannelId,
        mailboxCode: channel.channelCode,
        rawMailId: message.emailIngestMessageId,
        sourceMessageId: message.messageId,
        sourceAttachmentIndex: attachmentIndex,
        recipientAddress: message.recipientAddress,
        subject: message.subject,
        filename: attachment.filename,
        ...copy(attachment.metadataJson)
      },
      receivedAt: message.receivedAt,
      actorId,
      correlationId
    });

    appendDocumentVersion({
      companyId: message.companyId,
      documentId: document.documentId,
      variantType: "original",
      storageKey: attachment.storageKey,
      mimeType: attachment.mimeType,
      contentText: resolvedInput.contentText || null,
      contentBase64: resolvedInput.contentBase64 || null,
      fileHash: attachment.fileHash,
      fileSizeBytes: attachment.fileSizeBytes,
      sourceReference,
      metadataJson: {
        inboxChannelId: channel.inboxChannelId,
        rawMailId: message.emailIngestMessageId,
        filename: attachment.filename,
        ocrSourceText: resolvedInput.contentText || null,
        pageCount: resolvedInput.pageCount ?? 1
      },
      actorId,
      correlationId
    });

    attachment.documentId = document.documentId;
    attachment.updatedAt = nowIso();

    pushAudit({
      companyId: attachment.companyId,
      actorId,
      action: "email_ingest.attachment.queued",
      result: "success",
      entityType: "email_ingest_attachment",
      entityId: attachment.emailIngestAttachmentId,
      explanation: `Attachment ${attachment.filename} routed to the document queue as document ${document.documentId}.`,
      correlationId
    });

    return attachment;
  }

  function createReviewTask({ document, run, reviewDecision, actorId, correlationId }) {
    const task = {
      reviewTaskId: crypto.randomUUID(),
      companyId: document.companyId,
      documentId: document.documentId,
      ocrRunId: run.ocrRunId,
      queueCode: reviewDecision.queueCode,
      taskType: "document_review",
      status: "open",
      suggestedDocumentType: run.suggestedDocumentType,
      suggestedFieldsJson: copy(run.extractedFieldsJson),
      correctedDocumentType: null,
      correctedFieldsJson: {},
      confidenceScore: run.classificationConfidence,
      createdByActorId: actorId,
      claimedByActorId: null,
      claimedAt: null,
      correctionComment: null,
      correctedAt: null,
      approvedByActorId: null,
      approvedAt: null,
      manualClassificationVersionId: null,
      metadataJson: {
        reasonCode: reviewDecision.reasonCode
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    state.reviewTasks.set(task.reviewTaskId, task);
    state.reviewTaskIdsByDocument.get(document.documentId).push(task.reviewTaskId);

    pushAudit({
      companyId: task.companyId,
      actorId,
      action: "review_task.opened",
      result: "warning",
      entityType: "review_task",
      entityId: task.reviewTaskId,
      explanation: `Review task opened in ${task.queueCode} for document ${task.documentId}.`,
      correlationId
    });

    return task;
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

  function requireEmailMessage({ companyId, emailIngestMessageId }) {
    const resolvedEmailIngestMessageId = requireText(
      emailIngestMessageId,
      "email_ingest_message_id_required",
      "Email ingest message id is required."
    );
    const message = state.emailMessages.get(resolvedEmailIngestMessageId);
    if (!message) {
      throw createError(404, "email_ingest_message_not_found", "Email ingest message was not found.");
    }
    if (companyId && message.companyId !== companyId) {
      throw createError(403, "cross_company_forbidden", "Email ingest message belongs to another company.");
    }
    return message;
  }

  function requireInboxChannelByAddress(recipientAddress) {
    const resolvedRecipientAddress = normalizeEmailAddress(recipientAddress);
    const channelId = state.inboxChannelIdByAddress.get(resolvedRecipientAddress);
    if (!channelId) {
      throw createError(404, "inbox_channel_not_found", "No inbox channel matches the recipient address.");
    }
    const channel = state.inboxChannels.get(channelId);
    if (!channel || channel.status !== "active") {
      throw createError(409, "inbox_channel_disabled", "Inbox channel is not active.");
    }
    return channel;
  }

  function requireInboxChannelForDocument(document) {
    const channelId = document.metadataJson?.inboxChannelId;
    if (!channelId) {
      throw createError(409, "document_inbox_channel_missing", "Document is missing inbox channel metadata.");
    }
    const channel = state.inboxChannels.get(channelId);
    if (!channel) {
      throw createError(404, "inbox_channel_not_found", "Document inbox channel was not found.");
    }
    return channel;
  }

  function requireOriginalDocumentVersion(documentId) {
    const originalVersion = listDocumentVersions(documentId).find((candidate) => candidate.variantType === "original");
    if (!originalVersion) {
      throw createError(409, "document_original_missing", "Original document version is required before OCR can run.");
    }
    return originalVersion;
  }

  function requireReviewTask({ companyId, reviewTaskId }) {
    const resolvedReviewTaskId = requireText(reviewTaskId, "review_task_id_required", "Review task id is required.");
    const task = state.reviewTasks.get(resolvedReviewTaskId);
    if (!task) {
      throw createError(404, "review_task_not_found", "Review task was not found.");
    }
    if (companyId && task.companyId !== companyId) {
      throw createError(403, "cross_company_forbidden", "Review task belongs to another company.");
    }
    return task;
  }

  function requireOcrRun({ companyId, ocrRunId }) {
    const resolvedOcrRunId = requireText(ocrRunId, "ocr_run_id_required", "OCR run id is required.");
    const run = state.ocrRuns.get(resolvedOcrRunId);
    if (!run) {
      throw createError(404, "ocr_run_not_found", "OCR run was not found.");
    }
    if (companyId && run.companyId !== companyId) {
      throw createError(403, "cross_company_forbidden", "OCR run belongs to another company.");
    }
    return run;
  }

  function requireOcrThresholds(channel) {
    if (channel.classificationConfidenceThreshold === null || channel.fieldConfidenceThreshold === null) {
      throw createError(
        409,
        "inbox_channel_thresholds_missing",
        "Inbox channel is missing OCR confidence thresholds."
      );
    }
    return {
      classificationConfidenceThreshold: channel.classificationConfidenceThreshold,
      fieldConfidenceThreshold: channel.fieldConfidenceThreshold
    };
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

  function listEmailAttachments(emailIngestMessageId) {
    return (state.attachmentIdsByMessage.get(emailIngestMessageId) || [])
      .map((attachmentId) => state.attachments.get(attachmentId))
      .filter(Boolean)
      .sort((left, right) => left.attachmentIndex - right.attachmentIndex);
  }

  function listOcrRuns(documentId) {
    return (state.ocrRunIdsByDocument.get(documentId) || [])
      .map((ocrRunId) => state.ocrRuns.get(ocrRunId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function listReviewTasks(documentId) {
    return (state.reviewTaskIdsByDocument.get(documentId) || [])
      .map((reviewTaskId) => state.reviewTasks.get(reviewTaskId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function buildEmailIngestSummary(message, channel) {
    const attachments = listEmailAttachments(message.emailIngestMessageId);
    const routedDocuments = attachments
      .filter((candidate) => candidate.documentId)
      .map((candidate) => requireDocument({ companyId: message.companyId, documentId: candidate.documentId }));

    return {
      channel: copy(channel),
      message: copy(message),
      attachments: attachments.map((candidate) => copy(candidate)),
      routedDocuments: routedDocuments.map((candidate) => copy(candidate))
    };
  }

  function buildReviewTaskSummary(task) {
    const document = requireDocument({ companyId: task.companyId, documentId: task.documentId });
    const ocrRun = requireOcrRun({ companyId: task.companyId, ocrRunId: task.ocrRunId });
    return {
      task: copy(task),
      document: copy(document),
      ocrRun: copy(ocrRun)
    };
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

  function findEmailMessageDuplicate({ companyId, channelId, messageId }) {
    for (const message of state.emailMessages.values()) {
      if (message.companyId === companyId && message.inboxChannelId === channelId && message.messageId === messageId) {
        return message;
      }
    }
    return null;
  }

  function pushAudit({
    companyId,
    actorId,
    action,
    result = "success",
    entityType,
    entityId,
    explanation,
    correlationId = crypto.randomUUID(),
    metadata = {},
    sessionId = null
  }) {
    state.auditEvents.push(
      createAuditEnvelope({
        auditId: crypto.randomUUID(),
        companyId,
        actorId,
        action,
        result,
        entityType,
        entityId,
        explanation,
        correlationId,
        metadata,
        sessionId,
        recordedAt: new Date(clock()),
        auditClass: "document_action"
      })
    );
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

function requireDocumentType(value) {
  const documentType = requireText(value, "document_type_required", "Document type is required.");
  if (!OCR_DOCUMENT_TYPES.includes(documentType)) {
    throw createError(400, "document_type_invalid", `Unsupported OCR document type: ${documentType}.`);
  }
  return documentType;
}

function resolveAllowedMimeTypes(value) {
  const items = requireArray(value, "allowed_mime_types_required", "Allowed MIME types must be an array.");
  if (items.length === 0) {
    throw createError(400, "allowed_mime_types_required", "At least one allowed MIME type is required.");
  }
  return [...new Set(items.map((item) => normalizeMimeType(item)))];
}

function resolveAttachmentScanResult(value) {
  if (value === undefined || value === null || value === "") {
    return "clean";
  }
  const scanResult = requireText(value, "scan_result_required", "Scan result is required.").toLowerCase();
  if (!ATTACHMENT_SCAN_RESULTS.includes(scanResult)) {
    throw createError(400, "scan_result_invalid", `Unsupported attachment scan result: ${scanResult}.`);
  }
  return scanResult;
}

function resolveAttachmentQuarantineReason({ channel, mimeType, fileSizeBytes, scanResult }) {
  if (!channel.allowedMimeTypes.includes(mimeType)) {
    return "mime_type_not_allowed";
  }
  if (fileSizeBytes > channel.maxAttachmentSizeBytes) {
    return "attachment_too_large";
  }
  if (scanResult !== "clean") {
    return `${scanResult}_detected`;
  }
  return null;
}

function ensureContentIdentity(input) {
  const hasContentText = typeof input.contentText === "string" && input.contentText.length > 0;
  const hasContentBase64 = typeof input.contentBase64 === "string" && input.contentBase64.length > 0;
  const hasFileHash = typeof input.fileHash === "string" && input.fileHash.length > 0;
  if (!hasContentText && !hasContentBase64 && !hasFileHash) {
    throw createError(
      400,
      "file_identity_required",
      "Attachment content or file hash is required so the ingest remains deterministic."
    );
  }
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
  const resolvedSize = Number.isFinite(fileSizeBytes) ? Number(fileSizeBytes) : buffer?.byteLength ?? 0;
  return {
    resolvedHash,
    resolvedSize
  };
}

function determineOcrProfile({ channel, originalVersion, sourceText = "", filename = "" }) {
  const normalized = normalizeForMatching([channel.useCase, sourceText, filename].filter(Boolean).join("\n"));
  if (originalVersion.mimeType === "application/xml") {
    return "structured_document_parse";
  }
  if (
    channel.useCase.includes("invoice")
    || channel.useCase.includes("receipt")
    || normalized.includes("invoice")
    || normalized.includes("faktura")
    || normalized.includes("receipt")
    || normalized.includes("kvitto")
  ) {
    return "invoice_parse";
  }
  return "generic_document_ocr";
}

function buildOcrSourceText({ document, originalVersion }) {
  const parts = [
    readMetadataText(originalVersion.metadataJson, "ocrSourceText"),
    readMetadataText(document.metadataJson, "ocrSourceText"),
    readMetadataText(originalVersion.metadataJson, "filename"),
    readMetadataText(document.metadataJson, "filename"),
    readMetadataText(document.metadataJson, "subject"),
    document.sourceReference || ""
  ].filter(Boolean);
  return parts.join("\n");
}

function classifyDocument({ channel, sourceText, filename, mimeType }) {
  const text = normalizeForMatching([sourceText, filename, channel.useCase].filter(Boolean).join("\n"));
  const scoreMap = new Map([
    ["supplier_invoice", mimeType === "application/xml" ? 0.98 : 0.15],
    ["expense_receipt", 0.15],
    ["contract", 0.15],
    ["unknown", 0.1]
  ]);

  addClassificationScore(scoreMap, "supplier_invoice", text, [
    ["invoice", 0.38],
    ["faktura", 0.42],
    ["supplier", 0.18],
    ["leverantor", 0.18],
    ["ocr", 0.12],
    ["buyer reference", 0.08],
    ["iban", 0.08]
  ]);
  addClassificationScore(scoreMap, "expense_receipt", text, [
    ["receipt", 0.42],
    ["kvitto", 0.45],
    ["store", 0.12],
    ["butik", 0.12],
    ["card", 0.08]
  ]);
  addClassificationScore(scoreMap, "contract", text, [
    ["contract", 0.44],
    ["agreement", 0.4],
    ["avtal", 0.44],
    ["effective date", 0.08],
    ["parter", 0.08],
    ["party", 0.08]
  ]);

  const candidates = [...scoreMap.entries()]
    .map(([documentType, confidence]) => ({
      documentType,
      confidence: clampConfidence(confidence)
    }))
    .sort((left, right) => right.confidence - left.confidence);

  const top = candidates[0];
  return {
    suggestedDocumentType: top.documentType,
    confidence: top.confidence,
    candidates
  };
}

function addClassificationScore(scoreMap, documentType, haystack, patterns) {
  let score = scoreMap.get(documentType) || 0;
  for (const [pattern, weight] of patterns) {
    if (haystack.includes(pattern)) {
      score += weight;
    }
  }
  scoreMap.set(documentType, score);
}

function refineClassification({ classification, extractedFields, thresholds }) {
  const adjustedConfidence = boostClassificationConfidence({
    classification,
    extractedFields,
    thresholds
  });
  if (adjustedConfidence === classification.confidence) {
    return classification;
  }

  const candidates = classification.candidates
    .map((candidate) =>
      candidate.documentType === classification.suggestedDocumentType
        ? {
            ...candidate,
            confidence: adjustedConfidence
          }
        : candidate
    )
    .sort((left, right) => right.confidence - left.confidence);

  return {
    ...classification,
    confidence: adjustedConfidence,
    candidates
  };
}

function boostClassificationConfidence({ classification, extractedFields, thresholds }) {
  if (classification.suggestedDocumentType !== "supplier_invoice") {
    return classification.confidence;
  }

  const fieldThreshold = thresholds.fieldConfidenceThreshold;
  const hasStrongRequiredFields = ["counterparty", "invoiceNumber", "totalAmount"].every((fieldName) =>
    hasFieldConfidence(extractedFields[fieldName], fieldThreshold)
  );

  if (!hasStrongRequiredFields) {
    return classification.confidence;
  }

  let bonus = 0.08;
  if (hasFieldConfidence(extractedFields.invoiceDate, fieldThreshold)) {
    bonus += 0.03;
  }
  if (hasFieldConfidence(extractedFields.dueDate, fieldThreshold)) {
    bonus += 0.03;
  }
  if (hasFieldConfidence(extractedFields.currencyCode, fieldThreshold)) {
    bonus += 0.01;
  }
  if (hasFieldConfidence(extractedFields.netAmount, fieldThreshold)) {
    bonus += 0.01;
  }
  if (hasFieldConfidence(extractedFields.vatAmount, fieldThreshold)) {
    bonus += 0.01;
  }

  const lineItems = Array.isArray(extractedFields.lineItems?.value) ? extractedFields.lineItems.value : [];
  if (lineItems.length > 0 && extractedFields.lineItems.confidence >= fieldThreshold) {
    bonus += 0.04;
    const declaredNetAmount = parseMoneyField(extractedFields.netAmount);
    if (declaredNetAmount !== null) {
      const extractedNetAmount = roundMoney(lineItems.reduce((total, lineItem) => total + Number(lineItem.netAmount || 0), 0));
      if (Math.abs(extractedNetAmount - declaredNetAmount) <= 0.01) {
        bonus += 0.02;
      }
    }
  }

  return clampConfidence(classification.confidence + bonus);
}

function hasFieldConfidence(field, threshold) {
  return Boolean(field?.value) && typeof field.confidence === "number" && field.confidence >= threshold;
}

function parseMoneyField(field) {
  if (!field?.value) {
    return null;
  }
  const parsed = Number(String(field.value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractOcrFields({ sourceText, suggestedDocumentType }) {
  const normalized = sourceText.replace(/\r/g, "");
  const fields = {};

  if (suggestedDocumentType === "supplier_invoice") {
    fields.counterparty = extractField(normalized, [/(?:supplier|leverantor)\s*[:#-]?\s*([^\n]+)/i]);
    fields.invoiceNumber = extractField(normalized, [/(?:invoice|faktura)\s*(?:number|nr)?\s*[:#-]?\s*([A-Z0-9-]+)/i]);
    fields.invoiceDate = extractField(normalized, [/(?:invoice date|fakturadatum|datum)\s*[:#-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i]);
    fields.dueDate = extractField(normalized, [/(?:due date|forfallodatum|forfaller)\s*[:#-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i]);
    fields.currencyCode = extractField(normalized, [/(?:currency|valuta)\s*[:#-]?\s*([A-Z]{3})/i]);
    fields.netAmount = extractField(normalized, [/(?:net|netto)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]{2})?)/i]);
    fields.vatAmount = extractField(normalized, [/(?:vat|moms)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]{2})?)/i]);
    fields.totalAmount = extractField(normalized, [/(?:total|summa|brutto)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]{2})?)/i]);
    fields.reference = extractField(normalized, [/(?:ocr|reference|referens|order)\s*[:#-]?\s*([A-Z0-9-]+)/i]);
    fields.purchaseOrderReference = extractField(normalized, [/(?:po|purchase order|inkopsorder|orderref|order reference)\s*[:#-]?\s*([A-Z0-9-]+)/i]);
    fields.lineItems = extractInvoiceLineItems(normalized);
    return fields;
  }

  if (suggestedDocumentType === "expense_receipt") {
    fields.storeName = extractField(normalized, [/(?:store|butik)\s*[:#-]?\s*([^\n]+)/i]);
    fields.totalAmount = extractField(normalized, [/(?:total|summa)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]{2})?)/i]);
    fields.receiptDate = extractField(normalized, [/(?:date|datum)\s*[:#-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i]);
    return fields;
  }

  if (suggestedDocumentType === "contract") {
    fields.contractTitle = extractField(normalized, [/(?:contract|agreement|avtal)\s*[:#-]?\s*([^\n]+)/i]);
    fields.counterparty = extractField(normalized, [/(?:party|motpart)\s*[:#-]?\s*([^\n]+)/i]);
    fields.effectiveDate = extractField(normalized, [/(?:effective date|galler fran|galler fr o m)\s*[:#-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i]);
    return fields;
  }

  return {};
}

function extractInvoiceLineItems(sourceText) {
  const candidateLines = sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lineItems = [];

  for (const line of candidateLines) {
    if (!/(?:line|rad)\b/i.test(line) && !/(?:qty|quantity|antal)\b/i.test(line)) {
      continue;
    }
    const descriptionMatch = line.match(/(?:line|rad)\s*\d*\s*[:#-]?\s*(.+?)(?=\s+(?:qty|quantity|antal|unit|pris|net|amount|belopp|vat|moms|account|konto)\b|$)/i);
    const quantity = extractNumericToken(line, [/(?:qty|quantity|antal)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]+)?)/i]);
    const unitPrice = extractNumericToken(line, [/(?:unit(?:\s*price)?|pris)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]{2})?)/i]);
    const netAmount =
      extractNumericToken(line, [/(?:net|amount|belopp)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]{2})?)/i]) ??
      (quantity !== null && unitPrice !== null ? roundMoney(quantity * unitPrice) : null);
    const vatCodeMatch = line.match(/(?:vat|moms)\s*[:#-]?\s*([A-Z0-9_%-]+)/i);
    const accountMatch = line.match(/(?:account|konto)\s*[:#-]?\s*([0-9]{4})/i);
    const poLineRefMatch = line.match(/(?:po\s*line|order\s*line|porad)\s*[:#-]?\s*([A-Z0-9-]+)/i);

    if (!descriptionMatch && quantity === null && unitPrice === null && netAmount === null) {
      continue;
    }

    lineItems.push({
      description: descriptionMatch ? descriptionMatch[1].trim() : "OCR line",
      quantity,
      unitPrice,
      netAmount,
      vatCode: vatCodeMatch ? vatCodeMatch[1].trim().toUpperCase() : null,
      expenseAccountNumber: accountMatch ? accountMatch[1].trim() : null,
      purchaseOrderLineReference: poLineRefMatch ? poLineRefMatch[1].trim() : null
    });
  }

  return {
    value: lineItems,
    confidence: lineItems.length > 0 ? 0.96 : 0
  };
}

function extractField(sourceText, patterns) {
  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match?.[1]) {
      const value = match[1].trim();
      return {
        value,
        confidence: guessFieldConfidence(value)
      };
    }
  }
  return {
    value: null,
    confidence: 0
  };
}

function extractNumericToken(sourceText, patterns) {
  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match?.[1]) {
      const value = Number(String(match[1]).replace(",", "."));
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function guessFieldConfidence(value) {
  if (!value) {
    return 0;
  }
  if (value.length >= 10) {
    return 0.97;
  }
  if (value.length >= 5) {
    return 0.93;
  }
  return 0.88;
}

function evaluateReviewRequirement({ classification, extractedFields, thresholds, providerOutcome = null }) {
  if (classification.suggestedDocumentType === "unknown") {
    return {
      reviewRequired: true,
      queueCode: "classification_low_confidence",
      reasonCode: "unknown_document_type"
    };
  }

  if (classification.confidence < thresholds.classificationConfidenceThreshold) {
    return {
      reviewRequired: true,
      queueCode: "classification_low_confidence",
      reasonCode: "classification_below_threshold"
    };
  }

  if (typeof providerOutcome?.textConfidence === "number" && providerOutcome.textConfidence < thresholds.classificationConfidenceThreshold) {
    return {
      reviewRequired: true,
      queueCode: "ocr_low_confidence",
      reasonCode: "provider_text_confidence_below_threshold"
    };
  }

  if (typeof providerOutcome?.qualityScore === "number" && providerOutcome.qualityScore < thresholds.fieldConfidenceThreshold) {
    return {
      reviewRequired: true,
      queueCode: "ocr_low_confidence",
      reasonCode: "provider_quality_below_threshold"
    };
  }

  const requiredFields = requiredFieldsForType(classification.suggestedDocumentType);
  for (const fieldName of requiredFields) {
    const field = extractedFields[fieldName];
    if (!field?.value || field.confidence < thresholds.fieldConfidenceThreshold) {
      return {
        reviewRequired: true,
        queueCode: "ocr_low_confidence",
        reasonCode: `field_${fieldName}_below_threshold`
      };
    }
  }

  return {
    reviewRequired: false,
    queueCode: null,
    reasonCode: null
  };
}

function requiredFieldsForType(documentType) {
  if (documentType === "supplier_invoice") {
    return ["counterparty", "invoiceNumber", "totalAmount"];
  }
  if (documentType === "expense_receipt") {
    return ["storeName", "totalAmount"];
  }
  if (documentType === "contract") {
    return ["contractTitle"];
  }
  return [];
}

function resolvePageCount(originalVersion) {
  const pageCount = originalVersion.metadataJson?.pageCount;
  return Number.isInteger(pageCount) && pageCount > 0 ? Number(pageCount) : 1;
}

function readMetadataText(metadataJson, key) {
  const value = metadataJson?.[key];
  return typeof value === "string" ? value : "";
}

function resolveDocumentOcrProvider({ defaultOcrProvider, getIntegrationsPlatform }) {
  const integrationsPlatform = typeof getIntegrationsPlatform === "function" ? getIntegrationsPlatform() : null;
  if (
    integrationsPlatform
    && typeof integrationsPlatform.startDocumentOcrExtraction === "function"
    && typeof integrationsPlatform.collectDocumentOcrOperation === "function"
    && typeof integrationsPlatform.getDocumentOcrCapabilityManifest === "function"
  ) {
    const capabilityManifest = integrationsPlatform.getDocumentOcrCapabilityManifest();
    return {
      providerCode: capabilityManifest.providerCode,
      providerEnvironmentRef: capabilityManifest.providerEnvironmentRef,
      startExtraction: (input) => integrationsPlatform.startDocumentOcrExtraction(input),
      collectOperation: (input) => integrationsPlatform.collectDocumentOcrOperation(input)
    };
  }
  return defaultOcrProvider;
}

function normalizeProviderExtractedFields(entityHints = {}) {
  const normalized = {};
  if (entityHints.invoiceId?.value) {
    normalized.invoiceNumber = copy(entityHints.invoiceId);
  }
  if (entityHints.supplierName?.value) {
    normalized.counterparty = copy(entityHints.supplierName);
  }
  if (entityHints.totalAmount?.value) {
    normalized.totalAmount = copy(entityHints.totalAmount);
  }
  if (entityHints.dueDate?.value) {
    normalized.dueDate = copy(entityHints.dueDate);
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveRetentionClassCode({
  retentionClassCode = null,
  retentionPolicyCode = null,
  metadataJson = {},
  fallbackRetentionClassCode = null
} = {}) {
  const directValue = [retentionClassCode, metadataJson?.retentionClassCode, fallbackRetentionClassCode, retentionPolicyCode]
    .find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  return directValue ? directValue.trim() : "unspecified";
}

function createSourceFingerprint({ companyId, sourceChannel, sourceReference = null, metadataJson = {} } = {}) {
  const fingerprintPayload = {
    companyId: requireText(companyId, "company_id_required", "Company id is required."),
    sourceChannel: requireText(sourceChannel, "source_channel_required", "Source channel is required."),
    sourceReference: typeof sourceReference === "string" && sourceReference.trim().length > 0 ? sourceReference.trim() : null,
    filename: readMetadataText(metadataJson, "filename"),
    senderAddress: readMetadataText(metadataJson, "senderAddress"),
    subject: readMetadataText(metadataJson, "subject"),
    inboundAddress: readMetadataText(metadataJson, "inboundAddress"),
    mailboxCode: readMetadataText(metadataJson, "mailboxCode"),
    rawMailId: readMetadataText(metadataJson, "rawMailId")
  };
  return crypto.createHash("sha256").update(JSON.stringify(fingerprintPayload)).digest("hex");
}

function buildDocumentEvidenceRefs({
  documentId,
  sourceFingerprint,
  retentionClassCode,
  originalDocumentVersionId,
  latestDocumentVersionId
}) {
  return compactEvidenceRefs([
    `document:${documentId}`,
    sourceFingerprint ? `source_fingerprint:${sourceFingerprint}` : null,
    retentionClassCode ? `retention_class:${retentionClassCode}` : null,
    originalDocumentVersionId ? `original_version:${originalDocumentVersionId}` : null,
    latestDocumentVersionId ? `latest_version:${latestDocumentVersionId}` : null
  ]);
}

function buildDocumentVersionEvidenceRefs({
  documentId,
  documentVersionId,
  storageKey,
  checksumSha256,
  sourceFingerprint,
  retentionClassCode,
  derivesFromDocumentVersionId
}) {
  return compactEvidenceRefs([
    `document:${documentId}`,
    documentVersionId ? `document_version:${documentVersionId}` : null,
    storageKey ? `storage:${storageKey}` : null,
    checksumSha256 ? `checksum:sha256:${checksumSha256}` : null,
    sourceFingerprint ? `source_fingerprint:${sourceFingerprint}` : null,
    retentionClassCode ? `retention_class:${retentionClassCode}` : null,
    derivesFromDocumentVersionId ? `derived_from:${derivesFromDocumentVersionId}` : null
  ]);
}

function compactEvidenceRefs(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))].sort();
}

function normalizeForMatching(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("å", "a")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o");
}

function clampConfidence(value) {
  return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}

function normalizeTimestamp(value) {
  return new Date(value).toISOString();
}

function normalizeEmailAddress(value) {
  return requireText(value, "email_address_required", "Email address is required.").toLowerCase();
}

function normalizeMimeType(value) {
  return requireText(value, "mime_type_required", "MIME type is required.").toLowerCase();
}

function requirePositiveInteger(value, code, message) {
  if (!Number.isInteger(value) || value <= 0) {
    throw createError(400, code, message);
  }
  return Number(value);
}

function requireArray(value, code, message) {
  if (!Array.isArray(value)) {
    throw createError(400, code, message);
  }
  return value;
}

function resolveOptionalThreshold(value, code, message) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw createError(400, code, message);
  }
  return Number(value);
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

