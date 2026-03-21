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

export const INBOX_CHANNEL_STATUSES = Object.freeze(["active", "disabled"]);
export const EMAIL_INGEST_STATES = Object.freeze(["received", "accepted", "rejected", "quarantined"]);
export const EMAIL_ATTACHMENT_STATES = Object.freeze(["received", "queued", "quarantined"]);
export const ATTACHMENT_SCAN_RESULTS = Object.freeze(["clean", "malware", "spam", "policy_violation"]);

export function createDocumentArchiveEngine({ clock = () => new Date() } = {}) {
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
    auditEvents: []
  };

  return {
    createDocumentRecord,
    appendDocumentVersion,
    linkDocumentRecord,
    exportDocumentChain,
    getDocumentRecord,
    registerInboxChannel,
    ingestEmailMessage,
    getEmailIngestMessage,
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

  function registerInboxChannel({
    companyId,
    channelCode,
    inboundAddress,
    useCase,
    allowedMimeTypes,
    maxAttachmentSizeBytes,
    defaultDocumentType = null,
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

  function snapshotDocumentArchive() {
    return {
      documents: [...state.documents.values()].map((candidate) => copy(candidate)),
      versions: [...state.versions.values()].map((candidate) => copy(candidate)),
      links: [...state.links.values()].map((candidate) => copy(candidate)),
      inboxChannels: [...state.inboxChannels.values()].map((candidate) => copy(candidate)),
      emailMessages: [...state.emailMessages.values()].map((candidate) => copy(candidate)),
      emailAttachments: [...state.attachments.values()].map((candidate) => copy(candidate)),
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
        filename: attachment.filename
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
  const scanResult = requireText(value, "scan_result_required", "Scan result is required.");
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
