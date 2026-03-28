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
export const SUBMISSION_ENVELOPE_STATES = Object.freeze([
  "draft",
  "locked",
  "queued",
  "submitted",
  "awaiting_receipts",
  "technically_accepted",
  "technically_rejected",
  "materially_accepted",
  "materially_rejected",
  "corrected",
  "abandoned"
]);
export const SUBMISSION_ATTEMPT_STATUSES = Object.freeze(["queued", "running", "succeeded", "failed", "skipped"]);
export const SUBMISSION_TRANSPORT_SCENARIOS = Object.freeze(["technical_ack", "technical_nack", "transport_failed", "queued_only"]);
const SUBMISSION_ACTION_PRIORITIES = Object.freeze(["low", "normal", "high", "urgent"]);

export function createRegulatedSubmissionsModule({ state, clock, evidencePlatform, getCorePlatform } = {}) {
  return {
    submissionStatuses: SUBMISSION_STATUSES,
    submissionSignedStates: SUBMISSION_SIGNED_STATES,
    submissionReceiptTypes: SUBMISSION_RECEIPT_TYPES,
    submissionRetryClasses: SUBMISSION_RETRY_CLASSES,
    submissionActionTypes: SUBMISSION_ACTION_TYPES,
    submissionActionStatuses: SUBMISSION_ACTION_STATUSES,
    submissionEnvelopeStates: SUBMISSION_ENVELOPE_STATES,
    submissionAttemptStatuses: SUBMISSION_ATTEMPT_STATUSES,
    submissionTransportScenarios: SUBMISSION_TRANSPORT_SCENARIOS,
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
    listSubmissionAttempts(input) {
      return listSubmissionAttempts({ state }, input);
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
    rulepackRefs: normalizeRulepackRefs(input.rulepackRefs ?? payload.rulepackRefs ?? []),
    providerBaselineRefs: normalizeProviderBaselineRefs(input.providerBaselineRefs ?? payload.providerBaselineRefs ?? []),
    decisionSnapshotRefs: normalizeDecisionSnapshotRefs(input.decisionSnapshotRefs ?? payload.decisionSnapshotRefs ?? []),
    payloadHash,
    payloadJson: payload,
    correlationId: normalizeOptionalText(input.correlationId) || crypto.randomUUID(),
    transportJobId: null,
    lastTransportJobId: null,
    transportRequestedAt: null,
    lastTransportPlan: null,
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
  syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
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
  syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
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

function listSubmissionAttempts({ state }, { companyId, submissionId } = {}) {
  const submission = requireSubmission(state, companyId, submissionId);
  return getSubmissionAttempts(state, submission.submissionId).map(clone);
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
  const attempts = getSubmissionAttempts(state, submission.submissionId);
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
    rulepackRefs: clone(submission.rulepackRefs || []),
    providerBaselineRefs: clone(submission.providerBaselineRefs || []),
    decisionSnapshotRefs: clone(submission.decisionSnapshotRefs || []),
    correlationId: submission.correlationId,
    envelopeState: deriveSubmissionEnvelopeState(submission),
    legalEffect: submission.dispatchMode !== "trial",
    signingRequirementCode: submission.signedState,
    signerIdentity: submission.signedByActorId,
    signatureRefs: submission.signatureReference ? [submission.signatureReference] : [],
    submittedArtifactRefs: [
      {
        artifactType: "submission_payload",
        payloadHash: submission.payloadHash,
        payloadVersion: submission.payloadVersion
      },
      ...(submission.lastTransportPlan
        ? [
            {
              artifactType: "submission_transport_plan",
              payloadHash: hashObject(submission.lastTransportPlan),
              payloadVersion: submission.lastTransportPlan.transportRouteCode
            }
          ]
        : [])
    ],
    attemptRefs: attempts.map((attempt) => buildAttemptRef(attempt)),
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
        lastTransportJobId: submission.lastTransportJobId || null,
        lastTransportPlan: clone(submission.lastTransportPlan || null),
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
    const evidencePack = createCanonicalSubmissionEvidencePackRef(payload);
    state.submissionEvidencePacks?.set(submission.submissionId, evidencePack);
    return clone(evidencePack);
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
      ...clone(payload.correctionLinks),
      ...payload.rulepackRefs.map((ref) => ({
        sourceType: "rulepack_ref",
        ...clone(ref)
      })),
      ...payload.providerBaselineRefs.map((ref) => ({
        sourceType: "provider_baseline_ref",
        ...clone(ref)
      })),
      ...payload.decisionSnapshotRefs.map((ref) => ({
        sourceType: "decision_snapshot_ref",
        ...clone(ref)
      }))
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
  const evidencePack = createCanonicalSubmissionEvidencePackRef({
    ...payload,
    submissionEvidencePackId: bundle.evidenceBundleId,
    evidenceBundleId: bundle.evidenceBundleId,
    checksum: bundle.checksum,
    status: bundle.status,
    frozenAt: bundle.frozenAt,
    archivedAt: bundle.archivedAt
  });
  state.submissionEvidencePacks?.set(submission.submissionId, evidencePack);
  return clone(evidencePack);
}

async function submitAuthoritySubmission(
  { state, clock, getCorePlatform },
  {
    companyId,
    submissionId,
    actorId,
    mode = "test",
    transportScenarioCode = null,
    simulatedTransportOutcome = null,
    providerReference = null,
    message = null
  } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  const resolvedTransportScenarioCode = resolveRequestedTransportScenarioCode({
    mode,
    transportScenarioCode,
    simulatedTransportOutcome
  });
  if (submission.status === "submitted" && submission.transportJobId && !hasSubmissionTransportReceipt(state, submission.submissionId)) {
    const queuedTransportPlan = resolveSubmissionTransportPlan({
      submission,
      mode: submission.dispatchMode || mode,
      transportScenarioCode: resolvedTransportScenarioCode,
      providerReference: submission.providerReference,
      message: submission.dispatchMessage
    });
    ensureSubmissionAttempt(state, {
      submission,
      clock,
      attemptStageCode: "transport",
      triggerCode: "initial_dispatch",
      actorId,
      mode: submission.dispatchMode || mode,
      legalEffect: (submission.dispatchMode || mode) !== "trial",
      payloadHash: submission.payloadHash,
      providerReference: submission.providerReference,
      transportPlan: queuedTransportPlan,
      queuedJobId: submission.transportJobId,
      replayReasonCode: null,
      status: "queued"
    });
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
  const transportPlan = resolveSubmissionTransportPlan({
    submission,
    mode: submission.dispatchMode,
    transportScenarioCode: resolvedTransportScenarioCode,
    providerReference: submission.providerReference,
    message: submission.dispatchMessage
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
        transportScenarioCode: transportPlan.transportScenarioCode,
        providerReference: submission.providerReference,
        message: submission.dispatchMessage
      },
      actorId: requireText(actorId || "system", "actor_id_required")
    });
    submission.transportJobId = queuedJob.jobId;
    submission.lastTransportJobId = queuedJob.jobId;
    submission.transportRequestedAt = submission.submittedAt;
    submission.lastTransportPlan = clone(transportPlan);
    submission.updatedAt = submission.transportRequestedAt;
    ensureSubmissionAttempt(state, {
      submission,
      clock,
      attemptStageCode: "transport",
      triggerCode: "initial_dispatch",
      actorId,
      mode: submission.dispatchMode,
      legalEffect: submission.dispatchMode !== "trial",
      payloadHash: submission.payloadHash,
      providerReference: submission.providerReference,
      transportPlan,
      queuedJobId: queuedJob.jobId,
      replayReasonCode: null,
      status: "queued"
    });
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
      transportScenarioCode: transportPlan.transportScenarioCode,
      providerReference,
      message,
      triggerCode: "initial_dispatch"
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
    transportScenarioCode = null,
    simulatedTransportOutcome = null,
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
  const resolvedTransportScenarioCode =
    targetJobType === "submission.transport"
      ? resolveRequestedTransportScenarioCode({
          mode: submission.dispatchMode || "test",
          transportScenarioCode,
          simulatedTransportOutcome
        })
      : null;
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
              transportScenarioCode: resolvedTransportScenarioCode,
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
    ensureSubmissionAttempt(state, {
      submission,
      clock,
      attemptStageCode: targetJobType === "submission.transport" ? "transport" : "receipt_collection",
      triggerCode: "replay",
      actorId,
      mode: targetJobType === "submission.transport" ? submission.dispatchMode || "test" : submission.dispatchMode || null,
      legalEffect: (submission.dispatchMode || "test") !== "trial",
      payloadHash: submission.payloadHash,
      providerReference: submission.providerReference,
      transportPlan:
        targetJobType === "submission.transport"
          ? resolveSubmissionTransportPlan({
              submission,
              mode: submission.dispatchMode || "test",
              transportScenarioCode: resolvedTransportScenarioCode,
              providerReference: submission.providerReference,
              message: normalizeOptionalText(message) || submission.dispatchMessage
            })
          : null,
      queuedJobId: queuedJob.jobId,
      replayReasonCode: resolvedReasonCode,
      status: "queued"
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
          transportScenarioCode: resolvedTransportScenarioCode,
          providerReference: submission.providerReference,
          message,
          triggerCode: "replay",
          replayReasonCode: resolvedReasonCode
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
        requiredInput,
        triggerCode: "replay",
        replayReasonCode: resolvedReasonCode
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
      rulepackRefs: previous.rulepackRefs,
      providerBaselineRefs: previous.providerBaselineRefs,
      decisionSnapshotRefs: previous.decisionSnapshotRefs,
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
  syncSubmissionEvidenceBundle({ state, evidencePlatform, submission: previous });

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
  {
    companyId,
    submissionId,
    actorId,
    mode = "test",
    transportScenarioCode = null,
    simulatedTransportOutcome = null,
    providerReference = null,
    message = null,
    requiredInput = [],
    triggerCode = "replay",
    replayReasonCode = null,
    jobId = null
  } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  const resolvedTransportScenarioCode = resolveRequestedTransportScenarioCode({
    mode,
    transportScenarioCode,
    simulatedTransportOutcome
  });
  const transportPlan = resolveSubmissionTransportPlan({
    submission,
    mode,
    transportScenarioCode: resolvedTransportScenarioCode,
    providerReference,
    message
  });
  const attempt = ensureSubmissionAttempt(state, {
    submission,
    clock,
    attemptStageCode: "transport",
    triggerCode,
    actorId,
    mode,
    legalEffect: mode !== "trial",
    payloadHash: submission.payloadHash,
    providerReference: transportPlan.providerReference || submission.providerReference,
    transportPlan,
    queuedJobId: normalizeOptionalText(jobId),
    replayReasonCode: normalizeOptionalText(replayReasonCode),
    status: normalizeOptionalText(jobId) ? "queued" : "running"
  });
  markSubmissionAttemptRunning(attempt, nowIso(clock), normalizeOptionalText(jobId));
  if (submission.status === "signed") {
    markSubmissionSubmitted(submission, {
      clock,
      mode,
      providerReference: transportPlan.providerReference,
      message
    });
  }
  if (submission.status !== "submitted") {
    finalizeSubmissionAttempt(attempt, {
      status: "skipped",
      completedAt: nowIso(clock),
      resultCode: "submission_transport_not_dispatchable",
      messageText: "Submission was not dispatchable."
    });
    return {
      ...enrichSubmission(state, submission),
      executionSkipped: true,
      skipReasonCode: "submission_transport_not_dispatchable"
    };
  }
  if (hasSubmissionTransportReceipt(state, submission.submissionId)) {
    finalizeSubmissionAttempt(attempt, {
      status: "skipped",
      completedAt: nowIso(clock),
      resultCode: "submission_transport_already_recorded",
      messageText: "Transport receipt already exists for this submission."
    });
    return {
      ...enrichSubmission(state, submission),
      executionSkipped: true,
      skipReasonCode: "submission_transport_already_recorded"
    };
  }
  submission.transportJobId = null;
  submission.lastTransportJobId = normalizeOptionalText(jobId) || submission.lastTransportJobId;
  submission.lastTransportPlan = clone(transportPlan);
  submission.updatedAt = nowIso(clock);
  if (transportPlan.resultCode === "transport_failed") {
    submission.status = "transport_failed";
    submission.updatedAt = nowIso(clock);
    finalizeSubmissionAttempt(attempt, {
      status: "failed",
      completedAt: submission.updatedAt,
      resultCode: "transport_failed",
      messageText: transportPlan.messageText,
      providerReference: transportPlan.providerReference || submission.providerReference,
      transportPlan
    });
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
    syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
    return enrichSubmission(state, submission);
  }

  if (transportPlan.technicalReceiptType) {
    registerSubmissionReceipt(
      { state, clock, evidencePlatform },
      {
        companyId,
        submissionId,
        receiptType: transportPlan.technicalReceiptType,
        providerStatus: transportPlan.technicalReceiptType,
        rawReference: transportPlan.providerReference || submission.providerReference,
        message: transportPlan.messageText,
        actorId,
        submissionAttemptId: attempt.submissionAttemptId,
        mode,
        legalEffect: mode !== "trial"
      }
    );
  } else if (transportPlan.fallbackActivated === true || transportPlan.resultCode === "official_transport_queued") {
    createQueueItem(state, {
      submission,
      actionType: "contact_provider",
      priority: submission.priority,
      ownerQueue: ownerQueueForSubmission(submission),
      retryAfter: null,
      slaDueAt: nowIso(clock),
      requiredInput: transportPlan.requiredInput,
      rootCauseCode: transportPlan.fallbackCode || "official_transport_pending",
      clock
    });
    syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
  }
  finalizeSubmissionAttempt(attempt, {
    status: "succeeded",
    completedAt: nowIso(clock),
    resultCode: transportPlan.resultCode,
    messageText: transportPlan.messageText,
    providerReference: transportPlan.providerReference || submission.providerReference,
    receiptType: transportPlan.technicalReceiptType,
    transportPlan
  });
  return enrichSubmission(state, submission);
}

function executeSubmissionReceiptCollection(
  { state, clock, evidencePlatform },
  {
    companyId,
    submissionId,
    actorId,
    simulatedReceiptType = null,
    providerStatus = null,
    message = null,
    isFinal = null,
    requiredInput = [],
    triggerCode = "replay",
    replayReasonCode = null,
    jobId = null
  } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  const attempt = ensureSubmissionAttempt(state, {
    submission,
    clock,
    attemptStageCode: "receipt_collection",
    triggerCode,
    actorId,
    mode: submission.dispatchMode || null,
    legalEffect: (submission.dispatchMode || "test") !== "trial",
    payloadHash: submission.payloadHash,
    providerReference: submission.providerReference,
    queuedJobId: normalizeOptionalText(jobId),
    replayReasonCode: normalizeOptionalText(replayReasonCode),
    status: normalizeOptionalText(jobId) ? "queued" : "running"
  });
  markSubmissionAttemptRunning(attempt, nowIso(clock), normalizeOptionalText(jobId));
  if (["finalized", "superseded"].includes(submission.status)) {
    finalizeSubmissionAttempt(attempt, {
      status: "skipped",
      completedAt: nowIso(clock),
      resultCode: "submission_receipt_collection_not_allowed",
      messageText: "Receipt collection is not allowed for this submission."
    });
    return {
      ...enrichSubmission(state, submission),
      executionSkipped: true,
      skipReasonCode: "submission_receipt_collection_not_allowed"
    };
  }
  const receiptType = normalizeOptionalText(simulatedReceiptType);
  if (!receiptType) {
    finalizeSubmissionAttempt(attempt, {
      status: "skipped",
      completedAt: nowIso(clock),
      resultCode: "submission_receipt_collection_no_receipt_available",
      messageText: "No receipt was available for collection."
    });
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
      actorId,
      submissionAttemptId: attempt.submissionAttemptId,
      mode: submission.dispatchMode || null,
      legalEffect: (submission.dispatchMode || "test") !== "trial"
    }
  );
}

function registerSubmissionReceipt(
  { state, clock, evidencePlatform },
  {
    companyId,
    submissionId,
    receiptType,
    providerStatus = null,
    rawReference = null,
    message = null,
    isFinal = null,
    requiredInput = [],
    actorId = "system",
    submissionAttemptId = null,
    mode = null,
    legalEffect = null
  } = {}
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
    if (submissionAttemptId) {
      const attempt = state.submissionAttempts?.get(submissionAttemptId);
      if (attempt) {
        finalizeSubmissionAttempt(attempt, {
          status: "skipped",
          completedAt: nowIso(clock),
          resultCode: "duplicate_receipt_ignored",
          messageText: "Duplicate receipt ignored.",
          receiptType: normalizedType
        });
      }
    }
    return enrichSubmission(state, submission);
  }
  const attempt =
    normalizeOptionalText(submissionAttemptId) && state.submissionAttempts?.get(submissionAttemptId)
      ? state.submissionAttempts.get(submissionAttemptId)
      : ensureSubmissionAttempt(state, {
          submission,
          clock,
          attemptStageCode: "receipt_collection",
          triggerCode: "manual_receipt",
          actorId,
          mode: normalizeOptionalText(mode) || submission.dispatchMode || null,
          legalEffect: legalEffect == null ? (submission.dispatchMode || "test") !== "trial" : legalEffect === true,
          payloadHash: submission.payloadHash,
          providerReference: normalizeOptionalText(rawReference) || normalizeOptionalText(providerStatus) || submission.providerReference,
          queuedJobId: null,
          replayReasonCode: null,
          status: "running"
        });
  const receipt = {
    receiptId: crypto.randomUUID(),
    submissionId: submission.submissionId,
    submissionAttemptId: attempt?.submissionAttemptId || null,
    sequenceNo: nextSequenceNo(state.receiptIdsBySubmission.get(submission.submissionId)),
    receiptType: normalizedType,
    providerStatus: normalizeOptionalText(providerStatus) || normalizedType,
    normalizedStatus: normalizedType,
    rawReference: normalizeOptionalText(rawReference),
    messageText: normalizeOptionalText(message),
    isFinal: isFinal == null ? normalizedType === "final_ack" || normalizedType.endsWith("_nack") : isFinal === true,
    providerKey: submission.providerKey,
    payloadHash: submission.payloadHash,
    mode: normalizeOptionalText(mode) || submission.dispatchMode || null,
    legalEffect: legalEffect == null ? (submission.dispatchMode || "test") !== "trial" : legalEffect === true,
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
  syncSubmissionEvidenceBundle({ state, evidencePlatform, submission });
  if (attempt) {
    finalizeSubmissionAttempt(attempt, {
      status: normalizedType.endsWith("_nack") ? "failed" : "succeeded",
      completedAt: receipt.receivedAt,
      resultCode: normalizedType,
      messageText: receipt.messageText,
      receiptType: normalizedType,
      providerReference: receipt.rawReference || submission.providerReference
    });
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
      rulepackRefs: previous.rulepackRefs,
      providerBaselineRefs: previous.providerBaselineRefs,
      decisionSnapshotRefs: previous.decisionSnapshotRefs,
      attemptNo: previous.attemptNo + 1,
      priority: previous.priority,
      retryClass: previous.retryClass,
      signatoryRoleRequired: previous.signatoryRoleRequired,
      correlationId: previous.correlationId
    }
  );
  syncSubmissionEvidenceBundle({ state, evidencePlatform, submission: previous });
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
    canonicalEnvelope: createCanonicalSubmissionEnvelopeRef(state, submission),
    attempts: getSubmissionAttempts(state, submission.submissionId).map(clone),
    correctionLinks: getCorrectionLinksForSubmission(state, submission.submissionId).map(clone),
    receipts: getSubmissionReceipts(state, submission.submissionId).map(clone),
    actionQueueItems: getSubmissionQueueItems(state, submission.submissionId).map(clone),
    currentEvidencePack: clone(state.submissionEvidencePacks?.get(submission.submissionId) || null)
  });
}

export function createCanonicalSubmissionEnvelopeRef(state, submission) {
  return clone({
    submissionId: submission.submissionId,
    companyId: submission.companyId,
    submissionType: submission.submissionType,
    rootSubmissionId: submission.rootSubmissionId,
    previousSubmissionId: submission.previousSubmissionId,
    correctionOfSubmissionId: submission.correctionOfSubmissionId,
    correctionChainId: submission.correctionChainId,
    sourceObjectType: submission.sourceObjectType,
    sourceObjectId: submission.sourceObjectId,
    sourceObjectVersion: submission.sourceObjectVersion,
    payloadVersion: submission.payloadVersion,
    payloadHash: submission.payloadHash,
    providerKey: submission.providerKey,
    recipientId: submission.recipientId,
    envelopeState: deriveSubmissionEnvelopeState(submission),
    signedState: submission.signedState,
    legalEffect: (submission.dispatchMode || "test") !== "trial",
    sourceEvidenceBundleId: submission.sourceEvidenceBundleId || null,
    currentEvidencePackId: submission.evidencePackId || null,
    transportAdapterCode: submission.lastTransportPlan?.transportAdapterCode || null,
    transportRouteCode: submission.lastTransportPlan?.transportRouteCode || null,
    fallbackActivated: submission.lastTransportPlan?.fallbackActivated === true,
    fallbackCode: submission.lastTransportPlan?.fallbackCode || null,
    receiptCount: getSubmissionReceipts(state, submission.submissionId).length,
    attemptCount: getSubmissionAttempts(state, submission.submissionId).length,
    correctionCount: getCorrectionLinksForSubmission(state, submission.submissionId).length,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt
  });
}

export function createCanonicalSubmissionEvidencePackRef(payload = {}) {
  return clone({
    submissionEvidencePackId: requireText(payload.submissionEvidencePackId, "submission_evidence_pack_id_required"),
    evidenceBundleId: normalizeOptionalText(payload.evidenceBundleId),
    submissionId: requireText(payload.submissionId, "submission_id_required"),
    companyId: requireText(payload.companyId, "company_id_required"),
    submissionType: requireText(payload.submissionType, "submission_type_required"),
    sourceObjectType: requireText(payload.sourceObjectType, "submission_source_object_type_required"),
    sourceObjectId: requireText(payload.sourceObjectId, "submission_source_object_id_required"),
    sourceObjectVersion: requireText(payload.sourceObjectVersion, "submission_source_object_version_required"),
    sourceEvidenceBundleId: normalizeOptionalText(payload.sourceEvidenceBundleId),
    payloadHash: requireText(payload.payloadHash, "submission_payload_hash_required"),
    payloadSchemaCode: requireText(payload.payloadSchemaCode, "submission_payload_schema_required"),
    envelopeState: assertAllowed(payload.envelopeState || "draft", SUBMISSION_ENVELOPE_STATES, "submission_envelope_state_invalid"),
    legalEffect: payload.legalEffect === false ? false : true,
    checksum: normalizeOptionalText(payload.checksum),
    status: normalizeOptionalText(payload.status),
    frozenAt: normalizeOptionalText(payload.frozenAt),
    archivedAt: normalizeOptionalText(payload.archivedAt),
    correlationId: normalizeOptionalText(payload.correlationId),
    signingRequirementCode: normalizeOptionalText(payload.signingRequirementCode),
    signerIdentity: normalizeOptionalText(payload.signerIdentity),
    signatureRefs: clone(payload.signatureRefs || []),
    submittedArtifactRefs: clone(payload.submittedArtifactRefs || []),
    attemptRefs: clone(payload.attemptRefs || []),
    correctionLinks: clone(payload.correctionLinks || []),
    receiptRefs: clone(payload.receiptRefs || []),
    preservedPriorReceiptRefs: clone(payload.preservedPriorReceiptRefs || []),
    operatorActions: clone(payload.operatorActions || []),
    auditRefs: clone(payload.auditRefs || []),
    rulepackRefs: clone(payload.rulepackRefs || []),
    providerBaselineRefs: clone(payload.providerBaselineRefs || []),
    decisionSnapshotRefs: clone(payload.decisionSnapshotRefs || [])
  });
}

function deriveSubmissionEnvelopeState(submission) {
  if (submission.status === "superseded") {
    return "corrected";
  }
  if (submission.status === "retry_pending") {
    return "technically_rejected";
  }
  if (submission.status === "transport_failed") {
    return "technically_rejected";
  }
  if (submission.status === "domain_rejected") {
    return "materially_rejected";
  }
  if (submission.status === "finalized") {
    return "materially_accepted";
  }
  if (submission.status === "accepted") {
    return "materially_accepted";
  }
  if (submission.status === "received") {
    return "technically_accepted";
  }
  if (submission.status === "submitted" && submission.transportJobId) {
    return "queued";
  }
  if (submission.status === "submitted") {
    return "awaiting_receipts";
  }
  if (submission.status === "signed") {
    return "locked";
  }
  return "draft";
}

function getSubmissionAttempts(state, submissionId) {
  return (state.submissionAttemptIdsBySubmission?.get(submissionId) || [])
    .map((submissionAttemptId) => state.submissionAttempts?.get(submissionAttemptId))
    .filter(Boolean)
    .sort((left, right) => left.submissionAttemptNo - right.submissionAttemptNo);
}

function buildAttemptRef(attempt) {
  return {
    submissionAttemptId: attempt.submissionAttemptId,
    submissionAttemptNo: attempt.submissionAttemptNo,
    attemptStageCode: attempt.attemptStageCode,
    triggerCode: attempt.triggerCode,
    status: attempt.status,
    mode: attempt.mode,
    legalEffect: attempt.legalEffect,
    payloadHash: attempt.payloadHash,
    providerKey: attempt.providerKey,
    providerReference: attempt.providerReference,
    transportAdapterCode: attempt.transportAdapterCode || null,
    transportRouteCode: attempt.transportRouteCode || null,
    officialChannelCode: attempt.officialChannelCode || null,
    fallbackCode: attempt.fallbackCode || null,
    fallbackActivated: attempt.fallbackActivated === true,
    transportScenarioCode: attempt.transportScenarioCode || null,
    receiptType: attempt.receiptType,
    requestedAt: attempt.requestedAt,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt
  };
}

function ensureSubmissionAttempt(
  state,
  {
    submission,
    clock,
    attemptStageCode,
    triggerCode,
    actorId,
    mode,
    legalEffect,
    payloadHash,
    providerReference,
    transportPlan = null,
    queuedJobId = null,
    replayReasonCode = null,
    status = "queued"
  }
) {
  const resolvedQueuedJobId = normalizeOptionalText(queuedJobId);
  if (resolvedQueuedJobId) {
    const existing = getSubmissionAttempts(state, submission.submissionId).find((attempt) => attempt.queuedJobId === resolvedQueuedJobId);
    if (existing) {
      return existing;
    }
  }
  const requestedAt = nowIso(clock);
  const attempt = {
    submissionAttemptId: crypto.randomUUID(),
    submissionId: submission.submissionId,
    companyId: submission.companyId,
    submissionAttemptNo: nextSequenceNo(state.submissionAttemptIdsBySubmission?.get(submission.submissionId)),
    attemptStageCode,
    triggerCode,
    status: assertAllowed(status, SUBMISSION_ATTEMPT_STATUSES, "submission_attempt_status_invalid"),
    mode: normalizeOptionalText(mode),
    legalEffect: legalEffect === false ? false : true,
    payloadHash: submission.payloadHash || requireText(payloadHash, "submission_payload_hash_required"),
    providerKey: submission.providerKey,
    providerReference: normalizeOptionalText(providerReference),
    transportAdapterCode: normalizeOptionalText(transportPlan?.transportAdapterCode),
    transportRouteCode: normalizeOptionalText(transportPlan?.transportRouteCode),
    officialChannelCode: normalizeOptionalText(transportPlan?.officialChannelCode),
    fallbackCode: normalizeOptionalText(transportPlan?.fallbackCode),
    fallbackActivated: transportPlan?.fallbackActivated === true,
    transportScenarioCode: normalizeOptionalText(transportPlan?.transportScenarioCode),
    receiptType: null,
    queuedJobId: resolvedQueuedJobId,
    replayReasonCode: normalizeOptionalText(replayReasonCode),
    actorId: requireText(actorId || "system", "actor_id_required"),
    requestedAt,
    startedAt: status === "running" ? requestedAt : null,
    completedAt: null,
    resultCode: null,
    messageText: null,
    updatedAt: requestedAt
  };
  state.submissionAttempts?.set(attempt.submissionAttemptId, attempt);
  appendToIndex(state.submissionAttemptIdsBySubmission, submission.submissionId, attempt.submissionAttemptId);
  return attempt;
}

function markSubmissionAttemptRunning(attempt, timestamp, queuedJobId = null) {
  if (!attempt) {
    return;
  }
  attempt.status = "running";
  attempt.queuedJobId = normalizeOptionalText(queuedJobId) || attempt.queuedJobId;
  attempt.startedAt = attempt.startedAt || timestamp;
  attempt.updatedAt = timestamp;
}

function finalizeSubmissionAttempt(
  attempt,
  {
    status,
    completedAt,
    resultCode = null,
    messageText = null,
    receiptType = null,
    providerReference = null,
    transportPlan = null
  }
) {
  if (!attempt) {
    return;
  }
  attempt.status = assertAllowed(status, SUBMISSION_ATTEMPT_STATUSES, "submission_attempt_status_invalid");
  attempt.completedAt = completedAt;
  attempt.resultCode = normalizeOptionalText(resultCode);
  attempt.messageText = normalizeOptionalText(messageText);
  attempt.receiptType = normalizeOptionalText(receiptType);
  attempt.providerReference = normalizeOptionalText(providerReference) || attempt.providerReference;
  if (transportPlan) {
    attempt.transportAdapterCode = normalizeOptionalText(transportPlan.transportAdapterCode) || attempt.transportAdapterCode;
    attempt.transportRouteCode = normalizeOptionalText(transportPlan.transportRouteCode) || attempt.transportRouteCode;
    attempt.officialChannelCode = normalizeOptionalText(transportPlan.officialChannelCode) || attempt.officialChannelCode;
    attempt.fallbackCode = normalizeOptionalText(transportPlan.fallbackCode) || attempt.fallbackCode;
    attempt.fallbackActivated = transportPlan.fallbackActivated === true;
    attempt.transportScenarioCode = normalizeOptionalText(transportPlan.transportScenarioCode) || attempt.transportScenarioCode;
  }
  attempt.updatedAt = completedAt;
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

function resolveRequestedTransportScenarioCode({ mode, transportScenarioCode = null, simulatedTransportOutcome = null } = {}) {
  const normalizedScenario = normalizeOptionalText(transportScenarioCode) || normalizeOptionalText(simulatedTransportOutcome);
  const resolvedMode = normalizeExecutionMode(mode);
  if (!normalizedScenario) {
    return isLiveExecutionMode(resolvedMode) ? null : "technical_ack";
  }
  assertAllowed(normalizedScenario, SUBMISSION_TRANSPORT_SCENARIOS, "submission_transport_scenario_invalid");
  if (isLiveExecutionMode(resolvedMode)) {
    throw createError(
      409,
      "submission_transport_scenario_forbidden_in_live_mode",
      "Explicit transport scenarios are only allowed in non-live execution modes."
    );
  }
  return normalizedScenario;
}

function resolveSubmissionTransportPlan({ submission, mode, transportScenarioCode = null, providerReference = null, message = null } = {}) {
  const resolvedMode = normalizeExecutionMode(mode);
  const profile = resolveSubmissionTransportProfile(submission);
  const resolvedProviderReference = normalizeOptionalText(providerReference) || submission.providerReference || buildFallbackProviderReference(submission, profile);
  const resolvedMessage = normalizeOptionalText(message);
  const scenarioCode = resolveRequestedTransportScenarioCode({
    mode: resolvedMode,
    transportScenarioCode
  });
  const fallbackActivated = isLiveExecutionMode(resolvedMode) || profile.forceOfficialFallback === true;
  if (fallbackActivated) {
    return {
      transportAdapterCode: profile.transportAdapterCode,
      transportRouteCode: profile.transportRouteCode,
      officialChannelCode: profile.officialChannelCode,
      fallbackCode: profile.fallbackCode,
      fallbackActivated: true,
      transportScenarioCode: null,
      providerReference: resolvedProviderReference,
      technicalReceiptType: null,
      resultCode: "official_transport_queued",
      messageText:
        resolvedMessage
        || `Submission dispatched through ${profile.transportAdapterCode} using official fallback ${profile.fallbackCode}.`,
      requiredInput: clone(profile.requiredInput || [])
    };
  }

  if (scenarioCode === "transport_failed") {
    return {
      transportAdapterCode: profile.transportAdapterCode,
      transportRouteCode: profile.transportRouteCode,
      officialChannelCode: profile.officialChannelCode,
      fallbackCode: profile.fallbackCode,
      fallbackActivated: false,
      transportScenarioCode: scenarioCode,
      providerReference: resolvedProviderReference,
      technicalReceiptType: null,
      resultCode: "transport_failed",
      messageText: resolvedMessage || `Submission transport failed in ${resolvedMode} mode.`,
      requiredInput: []
    };
  }

  return {
    transportAdapterCode: profile.transportAdapterCode,
    transportRouteCode: profile.transportRouteCode,
    officialChannelCode: profile.officialChannelCode,
    fallbackCode: profile.fallbackCode,
    fallbackActivated: false,
    transportScenarioCode: scenarioCode,
    providerReference: resolvedProviderReference,
    technicalReceiptType: scenarioCode === "queued_only" ? null : scenarioCode,
    resultCode: scenarioCode === "queued_only" ? "official_transport_queued" : scenarioCode,
    messageText:
      resolvedMessage
      || `Submission dispatched through ${profile.transportAdapterCode} in ${resolvedMode} mode via ${profile.transportRouteCode}.`,
    requiredInput: scenarioCode === "queued_only" ? clone(profile.requiredInput || []) : []
  };
}

function resolveSubmissionTransportProfile(submission) {
  const baselineCodes = new Set((submission.providerBaselineRefs || []).map((candidate) => candidate.baselineCode || candidate.providerBaselineCode).filter(Boolean));
  if (submission.submissionType.startsWith("agi")) {
    return {
      transportAdapterCode: "skatteverket_agi_adapter",
      transportRouteCode: "official_api",
      officialChannelCode: "skatteverket_agi_api",
      fallbackCode: "skatteverket_agi_file_upload",
      requiredInput: ["official_submission_receipt"]
    };
  }
  if (submission.submissionType.startsWith("vat")) {
    return {
      transportAdapterCode: "skatteverket_vat_adapter",
      transportRouteCode: "official_api",
      officialChannelCode: "skatteverket_vat_api",
      fallbackCode: "skatteverket_vat_xml_upload",
      requiredInput: ["official_submission_receipt"]
    };
  }
  if (submission.submissionType.startsWith("hus")) {
    const preferredRoute = normalizeOptionalText(submission.payloadJson?.transportType) || "direct_api";
    return {
      transportAdapterCode: "skatteverket_hus_adapter",
      transportRouteCode: preferredRoute === "xml" ? "signed_xml_upload" : "official_api",
      officialChannelCode: preferredRoute === "xml" ? "skatteverket_hus_xml" : "skatteverket_hus_api",
      fallbackCode: "skatteverket_hus_signed_xml_fallback",
      requiredInput: ["signed_hus_xml_receipt"]
    };
  }
  if (submission.submissionType.startsWith("income_tax") || submission.submissionType.startsWith("annual")) {
    const hasIxbrl = baselineCodes.has("SE-IXBRL-FILING");
    const hasSru = baselineCodes.has("SE-SRU-FILE");
    return {
      transportAdapterCode: "annual_filing_adapter",
      transportRouteCode: hasIxbrl ? "ixbrl_filing" : hasSru ? "sru_file_export" : "official_json_export",
      officialChannelCode: hasIxbrl ? "bolagsverket_ixbrl" : hasSru ? "skatteverket_sru" : "skatteverket_annual_json",
      fallbackCode: hasIxbrl ? "signed_ixbrl_upload" : hasSru ? "signed_sru_upload" : "signed_json_upload",
      requiredInput: [hasIxbrl ? "ixbrl_receipt" : hasSru ? "sru_receipt" : "annual_declaration_receipt"]
    };
  }
  return {
    transportAdapterCode: "generic_authority_adapter",
    transportRouteCode: "official_api",
    officialChannelCode: "generic_authority_channel",
    fallbackCode: "official_submission_fallback",
    requiredInput: ["official_submission_receipt"]
  };
}

function buildFallbackProviderReference(submission, profile) {
  return `${profile.transportAdapterCode}:${submission.submissionId}:${submission.attemptNo}`;
}

function isLiveExecutionMode(mode) {
  return ["production", "pilot"].includes(normalizeExecutionMode(mode));
}

function normalizeExecutionMode(mode) {
  return normalizeOptionalText(mode) || "test";
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
    submissionAttemptId: receipt.submissionAttemptId || null,
    receiptType: receipt.receiptType,
    providerKey: receipt.providerKey || null,
    providerStatus: receipt.providerStatus,
    rawReference: receipt.rawReference,
    payloadHash: receipt.payloadHash || null,
    mode: receipt.mode || null,
    legalEffect: receipt.legalEffect === false ? false : true,
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

function normalizeRulepackRefs(values = []) {
  return dedupeRefs(
    values,
    (candidate) => requireText(candidate.rulepackCode, "submission_rulepack_code_required"),
    (candidate) => ({
      rulepackId: normalizeOptionalText(candidate.rulepackId),
      rulepackCode: requireText(candidate.rulepackCode, "submission_rulepack_code_required"),
      rulepackVersion: requireText(candidate.rulepackVersion, "submission_rulepack_version_required"),
      rulepackChecksum: normalizeOptionalText(candidate.rulepackChecksum),
      effectiveDate: normalizeOptionalText(candidate.effectiveDate),
      scopeCode: normalizeOptionalText(candidate.scopeCode),
      sourceObjectId: normalizeOptionalText(candidate.sourceObjectId),
      sourceObjectVersion: normalizeOptionalText(candidate.sourceObjectVersion)
    })
  );
}

function normalizeProviderBaselineRefs(values = []) {
  return dedupeRefs(
    values,
    (candidate) =>
      normalizeOptionalText(candidate.providerBaselineId)
      || requireText(candidate.baselineCode || candidate.providerBaselineCode, "submission_provider_baseline_code_required"),
    (candidate) => ({
      providerBaselineId: normalizeOptionalText(candidate.providerBaselineId),
      providerCode: normalizeOptionalText(candidate.providerCode),
      baselineCode: requireText(candidate.baselineCode || candidate.providerBaselineCode, "submission_provider_baseline_code_required"),
      providerBaselineVersion: requireText(candidate.providerBaselineVersion, "submission_provider_baseline_version_required"),
      providerBaselineChecksum: normalizeOptionalText(candidate.providerBaselineChecksum),
      effectiveDate: normalizeOptionalText(candidate.effectiveDate),
      formatFamily: normalizeOptionalText(candidate.formatFamily)
    })
  );
}

function normalizeDecisionSnapshotRefs(values = []) {
  return dedupeRefs(
    values,
    (candidate) =>
      normalizeOptionalText(candidate.decisionSnapshotId)
      || buildDecisionSnapshotIdentity(candidate),
    (candidate) => ({
      decisionSnapshotId: normalizeOptionalText(candidate.decisionSnapshotId) || buildDecisionSnapshotIdentity(candidate),
      snapshotTypeCode: requireText(candidate.snapshotTypeCode, "submission_decision_snapshot_type_required"),
      sourceDomain: normalizeOptionalText(candidate.sourceDomain),
      sourceObjectId: normalizeOptionalText(candidate.sourceObjectId),
      sourceObjectVersion: normalizeOptionalText(candidate.sourceObjectVersion),
      employeeId: normalizeOptionalText(candidate.employeeId),
      employmentId: normalizeOptionalText(candidate.employmentId),
      decisionHash: normalizeOptionalText(candidate.decisionHash),
      rulepackId: normalizeOptionalText(candidate.rulepackId),
      rulepackCode: normalizeOptionalText(candidate.rulepackCode),
      rulepackVersion: normalizeOptionalText(candidate.rulepackVersion),
      rulepackChecksum: normalizeOptionalText(candidate.rulepackChecksum),
      effectiveDate: normalizeOptionalText(candidate.effectiveDate)
    })
  );
}

function dedupeRefs(values, keyResolver, mapper) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }
  const refs = [];
  const seen = new Set();
  for (const candidate of values) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const mapped = mapper(candidate);
    const key = keyResolver(mapped);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push(mapped);
  }
  return refs;
}

function buildDecisionSnapshotIdentity(candidate = {}) {
  return hashObject({
    snapshotTypeCode: normalizeOptionalText(candidate.snapshotTypeCode),
    sourceDomain: normalizeOptionalText(candidate.sourceDomain),
    sourceObjectId: normalizeOptionalText(candidate.sourceObjectId),
    sourceObjectVersion: normalizeOptionalText(candidate.sourceObjectVersion),
    employeeId: normalizeOptionalText(candidate.employeeId),
    employmentId: normalizeOptionalText(candidate.employmentId),
    decisionHash: normalizeOptionalText(candidate.decisionHash),
    rulepackCode: normalizeOptionalText(candidate.rulepackCode),
    rulepackVersion: normalizeOptionalText(candidate.rulepackVersion)
  });
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
