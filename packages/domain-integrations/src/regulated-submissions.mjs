import crypto from "node:crypto";

export const SUBMISSION_STATUSES = Object.freeze([
  "ready",
  "signed",
  "submitted",
  "received",
  "accepted",
  "transport_failed",
  "retry_pending",
  "domain_rejected",
  "finalized",
  "superseded"
]);
export const SUBMISSION_SIGNED_STATES = Object.freeze(["pending", "signed", "not_required"]);
export const SUBMISSION_RECEIPT_TYPES = Object.freeze(["technical_ack", "business_ack", "final_ack", "technical_nack", "business_nack"]);
export const SUBMISSION_RETRY_CLASSES = Object.freeze(["automatic", "manual_only", "forbidden"]);
export const SUBMISSION_ACTION_TYPES = Object.freeze(["retry", "collect_more_data", "correct_payload", "contact_provider", "close_as_duplicate"]);
export const SUBMISSION_ACTION_STATUSES = Object.freeze(["open", "claimed", "waiting_input", "resolved", "closed", "auto_resolved"]);
const SUBMISSION_ACTION_PRIORITIES = Object.freeze(["low", "normal", "high", "urgent"]);

export function createRegulatedSubmissionsModule({ state, clock, evidencePlatform, getCorePlatform } = {}) {
  return {
    submissionStatuses: SUBMISSION_STATUSES,
    submissionSignedStates: SUBMISSION_SIGNED_STATES,
    submissionReceiptTypes: SUBMISSION_RECEIPT_TYPES,
    submissionRetryClasses: SUBMISSION_RETRY_CLASSES,
    submissionActionTypes: SUBMISSION_ACTION_TYPES,
    submissionActionStatuses: SUBMISSION_ACTION_STATUSES,
    prepareAuthoritySubmission(input) {
      return prepareAuthoritySubmission({ state, clock, evidencePlatform }, input);
    },
    signAuthoritySubmission(input) {
      return signAuthoritySubmission({ state, clock, evidencePlatform }, input);
    },
    listAuthoritySubmissions(input) {
      return listAuthoritySubmissions({ state }, input);
    },
    getAuthoritySubmission(input) {
      return getAuthoritySubmission({ state }, input);
    },
    listSubmissionReceipts(input) {
      return listSubmissionReceipts({ state }, input);
    },
    getSubmissionEvidencePack(input) {
      return getSubmissionEvidencePack({ state, evidencePlatform }, input);
    },
    async submitAuthoritySubmission(input) {
      return submitAuthoritySubmission({ state, clock, getCorePlatform }, input);
    },
    async requestSubmissionReplay(input) {
      return requestSubmissionReplay({ state, clock, getCorePlatform }, input);
    },
    openSubmissionCorrection(input) {
      return openSubmissionCorrection({ state, clock, evidencePlatform }, input);
    },
    executeSubmissionReceiptCollection(input) {
      return executeSubmissionReceiptCollection({ state, clock, evidencePlatform }, input);
    },
    executeAuthoritySubmissionTransport(input) {
      return executeAuthoritySubmissionTransport({ state, clock, evidencePlatform }, input);
    },
    registerSubmissionReceipt(input) {
      return registerSubmissionReceipt({ state, clock, evidencePlatform }, input);
    },
    listSubmissionActionQueue(input) {
      return listSubmissionActionQueue({ state }, input);
    },
    retryAuthoritySubmission(input) {
      return retryAuthoritySubmission({ state, clock, evidencePlatform }, input);
    },
    resolveSubmissionQueueItem(input) {
      return resolveSubmissionQueueItem({ state, clock }, input);
    }
  };
}
function prepareAuthoritySubmission({ state, clock, evidencePlatform }, input = {}) {
  const submissionType = requireText(input.submissionType, "submission_type_required");
  const companyId = requireText(input.companyId, "company_id_required");
  const payloadVersion = requireText(input.payloadVersion, "payload_version_required");
  const providerKey = requireText(input.providerKey, "submission_provider_key_required");
  const recipientId = requireText(input.recipientId, "submission_recipient_id_required");
  const sourceObjectType = requireText(input.sourceObjectType, "submission_source_object_type_required");
  const sourceObjectId = requireText(input.sourceObjectId, "submission_source_object_id_required");
  const actorId = requireText(input.actorId || "system", "actor_id_required");
  const signedState = assertAllowed(input.signedState || "pending", SUBMISSION_SIGNED_STATES, "submission_signed_state_invalid");
  const priority = assertAllowed(input.priority || "normal", SUBMISSION_ACTION_PRIORITIES, "submission_priority_invalid");
  const payload = clone(input.payload ?? {});
  const payloadHash = hashObject(payload);
  const idempotencyKey = requireText(
    input.idempotencyKey || buildIdempotencyKey({ submissionType, providerKey, recipientId, sourceObjectType, sourceObjectId, payloadVersion, payloadHash, periodId: input.periodId || null }),
    "submission_idempotency_key_required"
  );
  const reuseKey = buildReuseKey(companyId, idempotencyKey, payloadHash);
  const existingId = state.submissionIdsByReuseKey.get(reuseKey);
  if (existingId) {
    const existing = state.submissions.get(existingId);
    if (existing && !["superseded"].includes(existing.status)) {
      return {
        ...enrichSubmission(state, existing),
        idempotentReplay: true
      };
    }
  }

  const preparedAt = nowIso(clock);
  const submission = {
    submissionId: crypto.randomUUID(),
    rootSubmissionId: null,
    previousSubmissionId: normalizeOptionalText(input.previousSubmissionId),
    supersedesSubmissionId: normalizeOptionalText(input.supersedesSubmissionId),
    correctionOfSubmissionId: normalizeOptionalText(input.correctionOfSubmissionId),
    correctionChainId: normalizeOptionalText(input.correctionChainId),
    submissionType,
    submissionFamilyCode: normalizeOptionalText(input.submissionFamilyCode),
    companyId,
    periodId: normalizeOptionalText(input.periodId),
    sourceObjectType,
    sourceObjectId,
    sourceObjectVersion: resolveSourceObjectVersion({
      explicitSourceObjectVersion: input.sourceObjectVersion,
      payload,
      payloadVersion
    }),
    sourceEvidenceBundleId: normalizeOptionalText(input.evidencePackId),
    evidencePackId: null,
    payloadVersion,
    attemptNo: Number(input.attemptNo || 1),
    status: signedState === "pending" ? "ready" : "signed",
    providerKey,
    recipientId,
    idempotencyKey,
    signedState,
    signatoryRoleRequired: normalizeOptionalText(input.signatoryRoleRequired),
    priority,
    retryClass: assertAllowed(input.retryClass || "manual_only", SUBMISSION_RETRY_CLASSES, "submission_retry_class_invalid"),
    payloadHash,
    payloadJson: payload,
    correlationId: normalizeOptionalText(input.correlationId) || crypto.randomUUID(),
    transportJobId: null,
    transportRequestedAt: null,
    submittedAt: null,
    acceptedAt: null,
    finalizedAt: null,
    signedAt: signedState === "signed" ? preparedAt : null,
    signedByActorId: signedState === "signed" ? actorId : null,
    createdByActorId: actorId,
    createdAt: preparedAt,
    updatedAt: preparedAt
  };
  submission.rootSubmissionId = submission.previousSubmissionId
    ? (state.submissions.get(submission.previousSubmissionId)?.rootSubmissionId || submission.previousSubmissionId)
    : submission.submissionId;
  state.submissions.set(submission.submissionId, submission);
  appendToIndex(state.submissionIdsByCompany, companyId, submission.submissionId);
  state.submissionIdsByReuseKey.set(reuseKey, submission.submissionId);
  if (evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
  }
  return {
    ...enrichSubmission(state, submission),
    idempotentReplay: false
  };
}

function signAuthoritySubmission({ state, clock, evidencePlatform }, { companyId, submissionId, actorId, signatureReference = null } = {}) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (submission.signedState === "not_required") {
    return enrichSubmission(state, submission);
  }
  if (submission.status !== "ready" || submission.signedState !== "pending") {
    throw createError(409, "submission_not_ready_for_sign", "Submission must be ready before signing.");
  }
  submission.signedState = "signed";
  submission.status = "signed";
  submission.signedAt = nowIso(clock);
  submission.signedByActorId = requireText(actorId || "system", "actor_id_required");
  submission.signatureReference = normalizeOptionalText(signatureReference) || `signature:${submission.submissionId}`;
  submission.updatedAt = submission.signedAt;
  if (evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
  }
  return enrichSubmission(state, submission);
}

function listAuthoritySubmissions({ state }, { companyId, submissionType = null, sourceObjectType = null, sourceObjectId = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  return (state.submissionIdsByCompany.get(resolvedCompanyId) || [])
    .map((submissionId) => state.submissions.get(submissionId))
    .filter(Boolean)
    .filter((submission) => (submissionType ? submission.submissionType === submissionType : true))
    .filter((submission) => (sourceObjectType ? submission.sourceObjectType === sourceObjectType : true))
    .filter((submission) => (sourceObjectId ? submission.sourceObjectId === sourceObjectId : true))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((submission) => enrichSubmission(state, submission));
}

function getAuthoritySubmission({ state }, { companyId, submissionId } = {}) {
  return enrichSubmission(state, requireSubmission(state, companyId, submissionId));
}

function listSubmissionReceipts({ state }, { companyId, submissionId } = {}) {
  const submission = requireSubmission(state, companyId, submissionId);
  return getSubmissionReceipts(state, submission.submissionId).map(clone);
}

function getSubmissionEvidencePack({ state, evidencePlatform }, { companyId, submissionId } = {}) {
  const submission = requireSubmission(state, companyId, submissionId);
  return syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
}

function buildSubmissionEvidencePackPayload(state, submission) {
  const receipts = getSubmissionReceipts(state, submission.submissionId);
  const queueItems = getSubmissionQueueItems(state, submission.submissionId);
  return {
    submissionEvidencePackId: submission.evidencePackId || `submission-evidence:${submission.submissionId}`,
    submissionId: submission.submissionId,
    companyId: submission.companyId,
    submissionType: submission.submissionType,
    sourceObjectType: submission.sourceObjectType,
    sourceObjectId: submission.sourceObjectId,
    sourceObjectVersion: submission.sourceObjectVersion,
    sourceEvidenceBundleId: submission.sourceEvidenceBundleId || null,
    payloadHash: submission.payloadHash,
    payloadSchemaCode: submission.payloadVersion,
    correlationId: submission.correlationId,
    signingRequirementCode: submission.signedState,
    signerIdentity: submission.signedByActorId,
    signatureRefs: submission.signatureReference ? [submission.signatureReference] : [],
    submittedArtifactRefs: [
      {
        artifactType: "submission_payload",
        payloadHash: submission.payloadHash,
        payloadVersion: submission.payloadVersion
      }
    ],
    correctionLinks: getCorrectionLinksForSubmission(state, submission.submissionId).map(clone),
    receiptRefs: receipts.map((receipt) => buildReceiptRef(receipt)),
    preservedPriorReceiptRefs:
      submission.correctionOfSubmissionId && state.submissions.get(submission.correctionOfSubmissionId)
        ? getSubmissionReceipts(state, submission.correctionOfSubmissionId).map((receipt) => buildReceiptRef(receipt))
        : [],
    operatorActions: queueItems.map((queueItem) => ({
      queueItemId: queueItem.queueItemId,
      actionType: queueItem.actionType,
      status: queueItem.status,
      resolutionCode: queueItem.resolutionCode,
      ownerQueue: queueItem.ownerQueue,
      ownerUserId: queueItem.ownerUserId,
      updatedAt: queueItem.updatedAt
    })),
    auditRefs: [
      {
        submissionId: submission.submissionId,
        rootSubmissionId: submission.rootSubmissionId,
        previousSubmissionId: submission.previousSubmissionId,
        correctionOfSubmissionId: submission.correctionOfSubmissionId,
        correctionChainId: submission.correctionChainId,
        supersededBySubmissionId: submission.supersededBySubmissionId || null,
        sourceObjectVersion: submission.sourceObjectVersion,
        transportJobId: submission.transportJobId,
        createdByActorId: submission.createdByActorId,
        signedByActorId: submission.signedByActorId,
        correlationId: submission.correlationId,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      }
    ]
  };
}

function syncSubmissionEvidenceBundle({ state, evidencePlatform, submission }) {
  const payload = buildSubmissionEvidencePackPayload(state, submission);
  if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    return clone(payload);
  }
  const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
    companyId: submission.companyId,
    bundleType: "regulated_submission",
    sourceObjectType: "submission",
    sourceObjectId: submission.submissionId,
    sourceObjectVersion: `${submission.attemptNo}:${submission.status}:${submission.updatedAt}`,
    title: `Submission evidence ${submission.submissionId}`,
    retentionClass: "regulated",
    classificationCode: "restricted_internal",
    metadata: {
      compatibilityPayload: payload
    },
    artifactRefs: [
      ...payload.submittedArtifactRefs.map((artifact) => ({
        artifactType: artifact.artifactType,
        artifactRef: artifact.payloadHash,
        checksum: artifact.payloadHash,
        roleCode: artifact.payloadVersion,
        metadata: {
          payloadVersion: artifact.payloadVersion
        }
      })),
      ...payload.signatureRefs.map((signatureRef) => ({
        artifactType: "submission_signature",
        artifactRef: signatureRef,
        checksum: hashObject({
          signatureRef,
          submissionId: submission.submissionId
        }),
        roleCode: "signature"
      })),
      ...payload.receiptRefs.map((receiptRef) => ({
        artifactType: "submission_receipt",
        artifactRef: receiptRef.receiptId,
        checksum: receiptRef.rawReference || receiptRef.providerStatus || receiptRef.receiptType,
        roleCode: receiptRef.receiptType
      }))
    ],
    auditRefs: clone(payload.auditRefs),
    sourceRefs: [
      {
        sourceEvidenceBundleId: submission.sourceEvidenceBundleId || null
      },
      ...clone(payload.correctionLinks)
    ],
    relatedObjectRefs: [
      ...(submission.sourceEvidenceBundleId
        ? [
            {
              objectType: "evidence_bundle",
              objectId: submission.sourceEvidenceBundleId
            }
          ]
        : []),
      ...payload.operatorActions.map((action) => ({
        objectType: "submission_action_queue_item",
        objectId: action.queueItemId
      }))
    ],
    actorId: submission.createdByActorId || "system",
    correlationId: submission.correlationId,
    previousEvidenceBundleId: submission.evidencePackId || null
  });
  submission.evidencePackId = bundle.evidenceBundleId;
  return clone({
    ...payload,
    submissionEvidencePackId: bundle.evidenceBundleId,
    evidenceBundleId: bundle.evidenceBundleId,
    checksum: bundle.checksum,
    status: bundle.status,
    frozenAt: bundle.frozenAt,
    archivedAt: bundle.archivedAt
  });
}

async function submitAuthoritySubmission(
  { state, clock, getCorePlatform },
  { companyId, submissionId, actorId, mode = "test", simulatedTransportOutcome = "technical_ack", providerReference = null, message = null } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (submission.status === "submitted" && submission.transportJobId && !hasSubmissionTransportReceipt(state, submission.submissionId)) {
    return {
      ...enrichSubmission(state, submission),
      transportQueued: true,
      queuedJob: resolveQueuedTransportJob(getCorePlatform, submission.transportJobId)
    };
  }
  if (submission.status !== "signed") {
    throw createError(409, "submission_not_signed", "Submission must be signed before dispatch.");
  }

  markSubmissionSubmitted(submission, {
    clock,
    mode,
    providerReference,
    message
  });

  const corePlatform = resolveCorePlatform(getCorePlatform);
  if (corePlatform) {
    const queuedJob = await corePlatform.enqueueRuntimeJob({
      companyId: submission.companyId,
      jobType: "submission.transport",
      sourceObjectType: "submission",
      sourceObjectId: submission.submissionId,
      idempotencyKey: `submission-transport:${submission.submissionId}:${submission.attemptNo}`,
      payload: {
        submissionId: submission.submissionId,
        mode: submission.dispatchMode,
        simulatedTransportOutcome: normalizeOptionalText(simulatedTransportOutcome) || "technical_ack",
        providerReference: submission.providerReference,
        message: submission.dispatchMessage
      },
      actorId: requireText(actorId || "system", "actor_id_required")
    });
    submission.transportJobId = queuedJob.jobId;
    submission.transportRequestedAt = submission.submittedAt;
    submission.updatedAt = submission.transportRequestedAt;
    return {
      ...enrichSubmission(state, submission),
      transportQueued: true,
      queuedJob
    };
  }

  return executeAuthoritySubmissionTransport(
    { state, clock },
    {
      companyId,
      submissionId,
      actorId,
      mode,
      simulatedTransportOutcome,
      providerReference,
      message
    }
  );
}

async function requestSubmissionReplay(
  { state, clock, getCorePlatform },
  {
    companyId,
    submissionId,
    actorId,
    reasonCode,
    idempotencyKey = null,
    simulatedTransportOutcome = "technical_ack",
    simulatedReceiptType = null,
    providerStatus = null,
    message = null,
    requiredInput = []
  } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (["finalized", "superseded"].includes(submission.status)) {
    throw createError(409, "submission_replay_not_allowed", "Replay is not allowed for finalized or superseded submissions.");
  }
  const corePlatform = resolveCorePlatform(getCorePlatform);
  const resolvedReasonCode = requireText(reasonCode, "submission_replay_reason_code_required");
  const targetJobType = hasSubmissionTransportReceipt(state, submission.submissionId) ? "submission.receipt.collect" : "submission.transport";
  const resolvedIdempotencyKey =
    normalizeOptionalText(idempotencyKey) ||
    hashObject({
      submissionId: submission.submissionId,
      targetJobType,
      reasonCode: resolvedReasonCode,
      receiptCount: getSubmissionReceipts(state, submission.submissionId).length,
      status: submission.status
    });
  if (corePlatform) {
    const queuedJob = await corePlatform.enqueueRuntimeJob({
      companyId: submission.companyId,
      jobType: targetJobType,
      sourceObjectType: "submission",
      sourceObjectId: submission.submissionId,
      idempotencyKey: resolvedIdempotencyKey,
      payload:
        targetJobType === "submission.transport"
          ? {
              submissionId: submission.submissionId,
              mode: submission.dispatchMode || "test",
              simulatedTransportOutcome: normalizeOptionalText(simulatedTransportOutcome) || "technical_ack",
              providerReference: submission.providerReference,
              message: normalizeOptionalText(message) || submission.dispatchMessage,
              replayReasonCode: resolvedReasonCode
            }
          : {
              submissionId: submission.submissionId,
              simulatedReceiptType: normalizeOptionalText(simulatedReceiptType),
              providerStatus: normalizeOptionalText(providerStatus),
              message: normalizeOptionalText(message),
              requiredInput: Array.isArray(requiredInput) ? requiredInput : [],
              replayReasonCode: resolvedReasonCode
            },
      actorId: requireText(actorId || "system", "actor_id_required")
    });
    return {
      submission: enrichSubmission(state, submission),
      replayQueued: true,
      replayTarget: targetJobType,
      queuedJob
    };
  }

  if (targetJobType === "submission.transport") {
    return {
      submission: executeAuthoritySubmissionTransport(
        { state, clock },
        {
          companyId,
          submissionId,
          actorId,
          mode: submission.dispatchMode || "test",
          simulatedTransportOutcome,
          providerReference: submission.providerReference,
          message
        }
      ),
      replayQueued: false,
      replayTarget: targetJobType
    };
  }

  return {
    submission: executeSubmissionReceiptCollection(
      { state, clock },
      {
        companyId,
        submissionId,
        actorId,
        simulatedReceiptType,
        providerStatus,
        message,
        requiredInput
      }
    ),
    replayQueued: false,
    replayTarget: targetJobType
  };
}

function openSubmissionCorrection(
  { state, clock, evidencePlatform },
  {
    companyId,
    submissionId,
    actorId,
    reasonCode,
    sourceObjectType = null,
    sourceObjectId = null,
    sourceObjectVersion = null,
    payload = null,
    payloadVersion = null,
    providerKey = null,
    recipientId = null,
    signedState = null,
    signatoryRoleRequired = null,
    submissionFamilyCode = null,
    evidencePackId = null,
    priority = null,
    retryClass = null,
    idempotencyKey = null,
    correlationId = null
  } = {}
) {
  const previous = requireSubmission(state, companyId, submissionId);
  const resolvedReasonCode = requireText(reasonCode, "submission_correction_reason_code_required");
  const resolvedPayload = payload == null ? clone(previous.payloadJson) : clone(payload);
  const resolvedSourceObjectType = requireText(sourceObjectType || previous.sourceObjectType, "submission_source_object_type_required");
  const resolvedSourceObjectId = requireText(sourceObjectId || previous.sourceObjectId, "submission_source_object_id_required");
  const resolvedPayloadVersion = requireText(payloadVersion || previous.payloadVersion, "payload_version_required");
  const resolvedSourceObjectVersion = resolveSourceObjectVersion({
    explicitSourceObjectVersion: sourceObjectVersion,
    payload: resolvedPayload,
    payloadVersion: resolvedPayloadVersion
  });
  const resolvedPayloadHash = hashObject(resolvedPayload);
  const resolvedIdempotencyKey =
    normalizeOptionalText(idempotencyKey) ||
    hashObject({
      originalSubmissionId: previous.submissionId,
      reasonCode: resolvedReasonCode,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      sourceObjectVersion: resolvedSourceObjectVersion,
      payloadHash: resolvedPayloadHash
    });

  const existingCorrection = findExistingCorrectionSubmission(state, previous.submissionId, {
    idempotencyKey: resolvedIdempotencyKey,
    payloadHash: resolvedPayloadHash
  });
  if (existingCorrection) {
    return {
      previousSubmission: enrichSubmission(state, previous),
      submission: enrichSubmission(state, existingCorrection),
      correctionLink: clone(findCorrectionLink(state, previous.submissionId, existingCorrection.submissionId)),
      idempotentReplay: true
    };
  }

  if (["ready", "signed", "superseded"].includes(previous.status)) {
    throw createError(
      409,
      "submission_correction_not_allowed",
      "Correction requires a previously dispatched submission that has not already been superseded."
    );
  }
  if (
    resolvedSourceObjectType === previous.sourceObjectType &&
    resolvedSourceObjectId === previous.sourceObjectId &&
    resolvedSourceObjectVersion === previous.sourceObjectVersion &&
    resolvedPayloadHash === previous.payloadHash
  ) {
    throw createError(
      409,
      "submission_correction_requires_new_version",
      "Correction requires a new source-object version or a materially different payload."
    );
  }

  const timestamp = nowIso(clock);
  const correctionChainId = previous.correctionChainId || previous.submissionId;
  const correction = prepareAuthoritySubmission(
    { state, clock },
    {
      companyId: previous.companyId,
      submissionType: previous.submissionType,
      periodId: previous.periodId,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      sourceObjectVersion: resolvedSourceObjectVersion,
      payloadVersion: resolvedPayloadVersion,
      providerKey: providerKey || previous.providerKey,
      recipientId: recipientId || previous.recipientId,
      payload: resolvedPayload,
      signedState: signedState || (previous.signedState === "not_required" ? "not_required" : "pending"),
      signatoryRoleRequired: signatoryRoleRequired ?? previous.signatoryRoleRequired,
      submissionFamilyCode: submissionFamilyCode ?? previous.submissionFamilyCode,
      evidencePackId: evidencePackId ?? resolvedPayload.evidencePackId ?? previous.sourceEvidenceBundleId ?? null,
      previousSubmissionId: previous.submissionId,
      supersedesSubmissionId: previous.submissionId,
      correctionOfSubmissionId: previous.submissionId,
      correctionChainId,
      priority: priority || previous.priority,
      retryClass: retryClass || previous.retryClass,
      actorId: actorId || "system",
      idempotencyKey: resolvedIdempotencyKey,
      correlationId: normalizeOptionalText(correlationId) || previous.correlationId
    }
  );

  previous.status = "superseded";
  previous.supersededBySubmissionId = correction.submissionId;
  previous.updatedAt = timestamp;
  autoResolveQueueItems(state, previous.submissionId, "correction_spawned", previous.updatedAt);
  if (evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    syncSubmissionEvidenceBundle({ state, evidencePlatform, submission: previous });
  }

  const correctionLink =
    findCorrectionLink(state, previous.submissionId, correction.submissionId) ||
    createCorrectionLink(state, {
      originalSubmissionId: previous.submissionId,
      correctingSubmissionId: correction.submissionId,
      correctionChainId,
      reasonCode: resolvedReasonCode,
      actorId,
      clock
    });

  return {
    previousSubmission: enrichSubmission(state, previous),
    submission: correction,
    correctionLink: clone(correctionLink),
    idempotentReplay: false
  };
}

function executeAuthoritySubmissionTransport(
  { state, clock, evidencePlatform },
  { companyId, submissionId, actorId, mode = "test", simulatedTransportOutcome = "technical_ack", providerReference = null, message = null, requiredInput = [] } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (submission.status === "signed") {
    markSubmissionSubmitted(submission, {
      clock,
      mode,
      providerReference,
      message
    });
  }
  if (submission.status !== "submitted") {
    return {
      ...enrichSubmission(state, submission),
      executionSkipped: true,
      skipReasonCode: "submission_transport_not_dispatchable"
    };
  }
  if (hasSubmissionTransportReceipt(state, submission.submissionId)) {
    return {
      ...enrichSubmission(state, submission),
      executionSkipped: true,
      skipReasonCode: "submission_transport_already_recorded"
    };
  }
  const outcome = normalizeOptionalText(simulatedTransportOutcome) || "technical_ack";
  if (outcome === "transport_failed") {
    submission.status = "transport_failed";
    submission.updatedAt = nowIso(clock);
    createQueueItem(state, {
      submission,
      actionType: "retry",
      priority: submission.priority,
      ownerQueue: ownerQueueForSubmission(submission),
      retryAfter: addMinutesIso(submission.updatedAt, 15),
      slaDueAt: addMinutesIso(submission.updatedAt, 15),
      requiredInput: [],
      rootCauseCode: "transport_failed",
      clock
    });
    if (evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
      syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
    }
    return enrichSubmission(state, submission);
  }

  if (outcome === "technical_ack" || outcome === "technical_nack") {
    registerSubmissionReceipt(
      { state, clock, evidencePlatform },
      {
        companyId,
        submissionId,
        receiptType: outcome,
        providerStatus: outcome,
        rawReference: submission.providerReference,
        message,
        actorId
      }
    );
  }
  return enrichSubmission(state, submission);
}

function executeSubmissionReceiptCollection(
  { state, clock, evidencePlatform },
  { companyId, submissionId, actorId, simulatedReceiptType = null, providerStatus = null, message = null, isFinal = null, requiredInput = [] } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (["finalized", "superseded"].includes(submission.status)) {
    return {
      ...enrichSubmission(state, submission),
      executionSkipped: true,
      skipReasonCode: "submission_receipt_collection_not_allowed"
    };
  }
  const receiptType = normalizeOptionalText(simulatedReceiptType);
  if (!receiptType) {
    return {
      ...enrichSubmission(state, submission),
      executionSkipped: true,
      skipReasonCode: "submission_receipt_collection_no_receipt_available"
    };
  }
  return registerSubmissionReceipt(
    { state, clock, evidencePlatform },
    {
      companyId,
      submissionId,
      receiptType,
      providerStatus,
      rawReference: null,
      message,
      isFinal,
      requiredInput,
      actorId
    }
  );
}

function registerSubmissionReceipt(
  { state, clock, evidencePlatform },
  { companyId, submissionId, receiptType, providerStatus = null, rawReference = null, message = null, isFinal = null, requiredInput = [], actorId = "system" } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (["finalized", "superseded"].includes(submission.status)) {
    throw createError(409, "submission_receipt_not_allowed", "Receipts cannot be appended to a finalized or superseded submission.");
  }
  const normalizedType = assertAllowed(receiptType, SUBMISSION_RECEIPT_TYPES, "submission_receipt_type_invalid");
  const existingReceipt = findMatchingReceipt(state, submission.submissionId, {
    receiptType: normalizedType,
    providerStatus,
    rawReference,
    message,
    isFinal
  });
  if (existingReceipt) {
    return enrichSubmission(state, submission);
  }
  const receipt = {
    receiptId: crypto.randomUUID(),
    submissionId: submission.submissionId,
    sequenceNo: nextSequenceNo(state.receiptIdsBySubmission.get(submission.submissionId)),
    receiptType: normalizedType,
    providerStatus: normalizeOptionalText(providerStatus) || normalizedType,
    normalizedStatus: normalizedType,
    rawReference: normalizeOptionalText(rawReference),
    messageText: normalizeOptionalText(message),
    isFinal: isFinal == null ? normalizedType === "final_ack" || normalizedType.endsWith("_nack") : isFinal === true,
    receivedByActorId: requireText(actorId || "system", "actor_id_required"),
    receivedAt: nowIso(clock)
  };
  state.receipts.set(receipt.receiptId, receipt);
  appendToIndex(state.receiptIdsBySubmission, submission.submissionId, receipt.receiptId);

  if (normalizedType === "technical_ack" || normalizedType === "business_ack") {
    submission.status = normalizedType === "business_ack" ? "accepted" : "received";
    if (normalizedType === "business_ack") {
      submission.acceptedAt = receipt.receivedAt;
    }
    submission.updatedAt = receipt.receivedAt;
  } else if (normalizedType === "final_ack") {
    submission.status = "finalized";
    submission.acceptedAt = submission.acceptedAt || receipt.receivedAt;
    submission.finalizedAt = receipt.receivedAt;
    submission.updatedAt = receipt.receivedAt;
    autoResolveQueueItems(state, submission.submissionId, "receipt_final_ack", receipt.receivedAt);
  } else if (normalizedType === "technical_nack") {
    submission.status = "transport_failed";
    submission.updatedAt = receipt.receivedAt;
      createQueueItem(state, {
        submission,
        actionType: "retry",
        priority: escalatePriority(submission.priority, "technical_nack"),
        ownerQueue: ownerQueueForSubmission(submission),
        retryAfter: addMinutesIso(receipt.receivedAt, 15),
        slaDueAt: addMinutesIso(receipt.receivedAt, 15),
        requiredInput: [],
        rootCauseCode: "technical_nack",
        clock
      });
    } else if (normalizedType === "business_nack") {
    submission.status = "domain_rejected";
    submission.updatedAt = receipt.receivedAt;
      createQueueItem(state, {
        submission,
        actionType: Array.isArray(requiredInput) && requiredInput.length > 0 ? "collect_more_data" : "correct_payload",
        priority: escalatePriority(submission.priority, "business_nack"),
        ownerQueue: ownerQueueForSubmission(submission),
        retryAfter: null,
        slaDueAt: receipt.receivedAt,
        requiredInput: Array.isArray(requiredInput) ? requiredInput : [],
        rootCauseCode: "business_nack",
        clock
      });
    }
  if (evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
  }
  return enrichSubmission(state, submission);
}

function listSubmissionActionQueue({ state }, { companyId, status = null, ownerQueue = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  return (state.queueItemIdsByCompany.get(resolvedCompanyId) || [])
    .map((queueItemId) => state.queueItems.get(queueItemId))
    .filter(Boolean)
    .filter((queueItem) => (status ? queueItem.status === status : true))
    .filter((queueItem) => (ownerQueue ? queueItem.ownerQueue === ownerQueue : true))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(clone);
}

function retryAuthoritySubmission({ state, clock, evidencePlatform }, { companyId, submissionId, actorId } = {}) {
  const previous = requireSubmission(state, companyId, submissionId);
  if (previous.status !== "transport_failed") {
    throw createError(409, "submission_not_retryable", "Only transport-failed submissions can be retried with the same payload.");
  }
  if (previous.retryClass === "forbidden") {
    throw createError(409, "submission_retry_forbidden", "Retry is forbidden for this submission.");
  }
  previous.status = "retry_pending";
  previous.updatedAt = nowIso(clock);
  autoResolveQueueItems(state, previous.submissionId, "retry_spawned", previous.updatedAt);

  const retried = prepareAuthoritySubmission(
    { state, clock },
    {
      companyId: previous.companyId,
      submissionType: previous.submissionType,
      periodId: previous.periodId,
      sourceObjectType: previous.sourceObjectType,
      sourceObjectId: previous.sourceObjectId,
      sourceObjectVersion: previous.sourceObjectVersion,
      payloadVersion: previous.payloadVersion,
      providerKey: previous.providerKey,
      recipientId: previous.recipientId,
      payload: previous.payloadJson,
      signedState: previous.signedState,
      actorId: actorId || "system",
      idempotencyKey: `${previous.idempotencyKey}:retry:${previous.attemptNo + 1}`,
      previousSubmissionId: previous.submissionId,
      correctionOfSubmissionId: previous.correctionOfSubmissionId,
      correctionChainId: previous.correctionChainId || previous.rootSubmissionId,
      submissionFamilyCode: previous.submissionFamilyCode,
      evidencePackId: previous.sourceEvidenceBundleId,
      attemptNo: previous.attemptNo + 1,
      priority: previous.priority,
      retryClass: previous.retryClass,
      signatoryRoleRequired: previous.signatoryRoleRequired,
      correlationId: previous.correlationId
    }
  );
  if (evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    syncSubmissionEvidenceBundle({ state, evidencePlatform, submission: previous });
  }
  return {
    previousSubmission: enrichSubmission(state, previous),
    submission: retried
  };
}

function resolveSubmissionQueueItem(
  { state, clock },
  { companyId, queueItemId, resolutionCode, actorId = "system", ownerUserId = null } = {}
) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const queueItem = state.queueItems.get(requireText(queueItemId, "submission_queue_item_id_required"));
  if (!queueItem || queueItem.companyId !== resolvedCompanyId) {
    throw createError(404, "submission_queue_item_not_found", "Submission queue item was not found.");
  }
  if (!["open", "claimed", "waiting_input"].includes(queueItem.status)) {
    return clone(queueItem);
  }
  queueItem.ownerUserId = normalizeOptionalText(ownerUserId) || normalizeOptionalText(queueItem.ownerUserId);
  queueItem.status = "resolved";
  queueItem.resolutionCode = requireText(resolutionCode, "submission_queue_resolution_code_required");
  queueItem.resolvedByActorId = requireText(actorId || "system", "actor_id_required");
  queueItem.updatedAt = nowIso(clock);
  return clone(queueItem);
}

function enrichSubmission(state, submission) {
  return clone({
    ...submission,
    correctionLinks: getCorrectionLinksForSubmission(state, submission.submissionId).map(clone),
    receipts: getSubmissionReceipts(state, submission.submissionId).map(clone),
    actionQueueItems: getSubmissionQueueItems(state, submission.submissionId).map(clone)
  });
}

function createQueueItem(
  state,
  { submission, actionType, priority, ownerQueue, retryAfter, slaDueAt = null, requiredInput = [], rootCauseCode, clock }
) {
  const existing = (state.queueItemIdsBySubmission.get(submission.submissionId) || [])
    .map((queueItemId) => state.queueItems.get(queueItemId))
    .filter(Boolean)
    .find((candidate) => ["open", "claimed", "waiting_input"].includes(candidate.status) && candidate.actionType === actionType && candidate.rootCauseCode === rootCauseCode);
  if (existing) {
    if (slaDueAt) {
      existing.slaDueAt = normalizeOptionalText(slaDueAt);
    }
    if (retryAfter) {
      existing.retryAfter = normalizeOptionalText(retryAfter);
    }
    return existing;
  }
  const queueItem = {
    queueItemId: crypto.randomUUID(),
    submissionId: submission.submissionId,
    companyId: submission.companyId,
    actionType,
    priority,
    ownerQueue: ownerQueue || "submission_operator",
    ownerUserId: null,
    status: "open",
    retryAfter,
    slaDueAt: normalizeOptionalText(slaDueAt),
    requiredInput: clone(requiredInput),
    resolutionCode: null,
    rootCauseCode,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.queueItems.set(queueItem.queueItemId, queueItem);
  appendToIndex(state.queueItemIdsByCompany, queueItem.companyId, queueItem.queueItemId);
  appendToIndex(state.queueItemIdsBySubmission, queueItem.submissionId, queueItem.queueItemId);
  return queueItem;
}

function autoResolveQueueItems(state, submissionId, resolutionCode, timestamp) {
  for (const queueItemId of state.queueItemIdsBySubmission.get(submissionId) || []) {
    const queueItem = state.queueItems.get(queueItemId);
    if (!queueItem || !["open", "claimed", "waiting_input"].includes(queueItem.status)) {
      continue;
    }
    queueItem.status = "auto_resolved";
    queueItem.resolutionCode = resolutionCode;
    queueItem.updatedAt = timestamp;
  }
}

function markSubmissionSubmitted(submission, { clock, mode, providerReference = null, message = null }) {
  submission.status = "submitted";
  submission.submittedAt = nowIso(clock);
  submission.updatedAt = submission.submittedAt;
  submission.dispatchMode = requireText(mode, "submission_mode_required");
  submission.providerReference = normalizeOptionalText(providerReference);
  submission.dispatchMessage = normalizeOptionalText(message);
}

function requireSubmission(state, companyId, submissionId) {
  const submission = state.submissions.get(requireText(submissionId, "submission_id_required"));
  if (!submission || submission.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "submission_not_found", "Submission was not found.");
  }
  return submission;
}

function findMatchingReceipt(state, submissionId, { receiptType, providerStatus = null, rawReference = null, message = null, isFinal = null } = {}) {
  const normalizedProviderStatus = normalizeOptionalText(providerStatus) || receiptType;
  const normalizedReference = normalizeOptionalText(rawReference);
  const normalizedMessage = normalizeOptionalText(message);
  const normalizedFinal = isFinal == null ? receiptType === "final_ack" || receiptType.endsWith("_nack") : isFinal === true;
  return (state.receiptIdsBySubmission.get(submissionId) || [])
    .map((receiptId) => state.receipts.get(receiptId))
    .filter(Boolean)
    .find(
      (receipt) =>
        receipt.receiptType === receiptType &&
        receipt.providerStatus === normalizedProviderStatus &&
        receipt.rawReference === normalizedReference &&
        receipt.messageText === normalizedMessage &&
        receipt.isFinal === normalizedFinal
    );
}

function getSubmissionReceipts(state, submissionId) {
  return (state.receiptIdsBySubmission.get(submissionId) || [])
    .map((receiptId) => state.receipts.get(receiptId))
    .filter(Boolean)
    .sort((left, right) => left.sequenceNo - right.sequenceNo);
}

function getSubmissionQueueItems(state, submissionId) {
  return (state.queueItemIdsBySubmission.get(submissionId) || [])
    .map((queueItemId) => state.queueItems.get(queueItemId))
    .filter(Boolean)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function getCorrectionLinksForSubmission(state, submissionId) {
  return [
    ...(state.correctionLinkIdsByOriginalSubmission.get(submissionId) || []),
    ...(state.correctionLinkIdsByCorrectingSubmission.get(submissionId) || [])
  ]
    .map((correctionLinkId) => state.correctionLinks.get(correctionLinkId))
    .filter(Boolean)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function hasSubmissionTransportReceipt(state, submissionId) {
  return (state.receiptIdsBySubmission.get(submissionId) || [])
    .map((receiptId) => state.receipts.get(receiptId))
    .filter(Boolean)
    .some((receipt) => receipt.receiptType === "technical_ack" || receipt.receiptType === "technical_nack");
}

function resolveCorePlatform(getCorePlatform) {
  if (typeof getCorePlatform !== "function") {
    return null;
  }
  const corePlatform = getCorePlatform();
  if (!corePlatform || typeof corePlatform.enqueueRuntimeJob !== "function") {
    return null;
  }
  return corePlatform;
}

function resolveQueuedTransportJob(getCorePlatform, jobId) {
  const corePlatform = resolveCorePlatform(getCorePlatform);
  if (!corePlatform || typeof corePlatform.getRuntimeJob !== "function" || !jobId) {
    return {
      jobId
    };
  }
  return {
    jobId
  };
}

function buildReceiptRef(receipt) {
  return {
    receiptId: receipt.receiptId,
    receiptType: receipt.receiptType,
    providerStatus: receipt.providerStatus,
    rawReference: receipt.rawReference,
    rawPayloadHash: hashObject({
      receiptType: receipt.receiptType,
      providerStatus: receipt.providerStatus,
      rawReference: receipt.rawReference,
      messageText: receipt.messageText,
      receivedAt: receipt.receivedAt
    }),
    receivedAt: receipt.receivedAt,
    isFinal: receipt.isFinal
  };
}

function createCorrectionLink(
  state,
  { originalSubmissionId, correctingSubmissionId, correctionChainId, reasonCode, actorId = "system", clock }
) {
  const correctionLink = {
    correctionLinkId: crypto.randomUUID(),
    originalSubmissionId,
    correctingSubmissionId,
    correctionChainId,
    reasonCode,
    createdByActorId: requireText(actorId || "system", "actor_id_required"),
    createdAt: nowIso(clock)
  };
  state.correctionLinks.set(correctionLink.correctionLinkId, correctionLink);
  appendToIndex(state.correctionLinkIdsByOriginalSubmission, originalSubmissionId, correctionLink.correctionLinkId);
  appendToIndex(state.correctionLinkIdsByCorrectingSubmission, correctingSubmissionId, correctionLink.correctionLinkId);
  return correctionLink;
}

function findCorrectionLink(state, originalSubmissionId, correctingSubmissionId) {
  return (state.correctionLinkIdsByOriginalSubmission.get(originalSubmissionId) || [])
    .map((correctionLinkId) => state.correctionLinks.get(correctionLinkId))
    .filter(Boolean)
    .find((correctionLink) => correctionLink.correctingSubmissionId === correctingSubmissionId);
}

function findExistingCorrectionSubmission(state, originalSubmissionId, { idempotencyKey, payloadHash }) {
  return (state.correctionLinkIdsByOriginalSubmission.get(originalSubmissionId) || [])
    .map((correctionLinkId) => state.correctionLinks.get(correctionLinkId))
    .filter(Boolean)
    .map((correctionLink) => state.submissions.get(correctionLink.correctingSubmissionId))
    .filter(Boolean)
    .find((submission) => submission.idempotencyKey === idempotencyKey && submission.payloadHash === payloadHash);
}

function ownerQueueForSubmission(submission) {
  if (submission.submissionType.startsWith("vat") || submission.submissionType.startsWith("income_tax") || submission.submissionType.startsWith("annual")) {
    return "tax_operator";
  }
  if (submission.submissionType.startsWith("agi")) {
    return "tax_operator";
  }
  if (submission.submissionType.startsWith("hus")) {
    return "hus_operator";
  }
  if (submission.submissionType.startsWith("peppol")) {
    return "peppol_operator";
  }
  return "submission_operator";
}

function buildReuseKey(companyId, idempotencyKey, payloadHash) {
  return `${companyId}:${idempotencyKey}:${payloadHash}`;
}

function resolveSourceObjectVersion({ explicitSourceObjectVersion = null, payload = {}, payloadVersion }) {
  return (
    normalizeOptionalText(explicitSourceObjectVersion) ||
    normalizeOptionalText(payload.sourceObjectVersion) ||
    normalizeOptionalText(payload.currentVersionId) ||
    normalizeOptionalText(payload.annualReportVersionId) ||
    normalizeOptionalText(payload.outputChecksum) ||
    requireText(payloadVersion, "payload_version_required")
  );
}

function buildIdempotencyKey({ submissionType, providerKey, recipientId, sourceObjectType, sourceObjectId, payloadVersion, payloadHash, periodId }) {
  return hashObject({
    submissionType,
    providerKey,
    recipientId,
    sourceObjectType,
    sourceObjectId,
    payloadVersion,
    payloadHash,
    periodId: periodId || null
  });
}

function nextSequenceNo(receiptIds) {
  return Array.isArray(receiptIds) ? receiptIds.length + 1 : 1;
}

function appendToIndex(map, key, value) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(value);
}

function escalatePriority(priority, failureType) {
  if (failureType === "business_nack") {
    return priority === "urgent" ? "urgent" : "high";
  }
  return priority;
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).trim();
}

function addMinutesIso(timestamp, minutes) {
  const resolved = new Date(timestamp);
  resolved.setUTCMinutes(resolved.getUTCMinutes() + minutes);
  return resolved.toISOString();
}

function assertAllowed(value, allowedValues, code) {
  const resolvedValue = requireText(value, code);
  if (!allowedValues.includes(resolvedValue)) {
    throw createError(400, code, `${code} does not allow ${resolvedValue}.`);
  }
  return resolvedValue;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
