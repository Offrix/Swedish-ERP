import { createHttpError } from "./route-helpers.mjs";

export function applyReviewCenterClaimSideEffects({
  platform,
  companyId,
  reviewItem,
  actorId
} = {}) {
  if (!reviewItem) {
    return null;
  }

  const resolvedActorId = typeof actorId === "string" && actorId.trim().length > 0 ? actorId.trim() : null;
  if (!resolvedActorId) {
    throw createHttpError(400, "actor_id_required", "actorId is required.");
  }

  if (reviewItem.sourceDomainCode === "DOCUMENTS" && reviewItem.sourceObjectType === "review_task") {
    if (typeof platform.claimReviewTask !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "Document review-task runtime is unavailable.");
    }
    return platform.claimReviewTask({
      companyId,
      reviewTaskId: reviewItem.sourceObjectId,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  return null;
}

export function resolveReviewCenterDecisionReasonCode({
  reviewItem,
  decisionCode,
  reasonCode = null
} = {}) {
  if (typeof reasonCode === "string" && reasonCode.trim().length > 0) {
    return reasonCode;
  }
  if (!reviewItem) {
    return reasonCode;
  }
  if (reviewItem.sourceDomainCode === "IMPORT_CASES" && reviewItem.sourceObjectType === "import_case_correction_request") {
    return decisionCode === "approve" ? "import_case_correction_approved" : "import_case_correction_rejected";
  }
  if (decisionCode !== "approve") {
    return reasonCode;
  }
  if (reviewItem.sourceDomainCode === "DOCUMENT_CLASSIFICATION" && reviewItem.sourceObjectType === "classification_case") {
    return "classification_confirmed";
  }
  if (reviewItem.sourceDomainCode === "IMPORT_CASES" && reviewItem.sourceObjectType === "import_case") {
    return "import_case_complete";
  }
  if (reviewItem.sourceDomainCode === "DOCUMENTS" && reviewItem.sourceObjectType === "review_task") {
    return "document_review_complete";
  }
  if (reviewItem.sourceDomainCode === "VAT" && reviewItem.sourceObjectType === "vat_decision") {
    return "vat_treatment_resolved";
  }
  return reasonCode;
}

export function applyReviewCenterDecisionSideEffects({
  platform,
  companyId,
  reviewItem,
  decisionCode,
  note = null,
  actorId
} = {}) {
  if (!reviewItem) {
    return null;
  }

  const resolvedActorId = typeof actorId === "string" && actorId.trim().length > 0 ? actorId.trim() : null;
  if (!resolvedActorId) {
    throw createHttpError(400, "actor_id_required", "actorId is required.");
  }

  if (reviewItem.sourceDomainCode === "IMPORT_CASES" && reviewItem.sourceObjectType === "import_case_correction_request") {
    if (typeof platform.decideImportCaseCorrectionRequest !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "Import-case correction runtime is unavailable.");
    }
    const requestedPayload = reviewItem.requestedPayloadJson || {};
    const importCaseId = typeof requestedPayload.importCaseId === "string" && requestedPayload.importCaseId.trim().length > 0
      ? requestedPayload.importCaseId.trim()
      : null;
    if (!importCaseId) {
      throw createHttpError(409, "review_center_import_case_payload_missing", "Import-case correction reviews must reference the importCaseId in requestedPayload.");
    }
    const decisionPayload = reviewItem.latestDecision?.decisionPayloadJson || {};
    return platform.decideImportCaseCorrectionRequest({
      companyId,
      importCaseId,
      importCaseCorrectionRequestId: reviewItem.sourceObjectId,
      decisionCode,
      decisionNote: decisionPayload.decisionNote || note || null,
      replacementCaseReference: decisionPayload.replacementCaseReference || null,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  if (decisionCode !== "approve") {
    return null;
  }

  if (reviewItem.sourceDomainCode === "DOCUMENT_CLASSIFICATION" && reviewItem.sourceObjectType === "classification_case") {
    if (typeof platform.approveClassificationCase !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "Classification approval runtime is unavailable.");
    }
    return platform.approveClassificationCase({
      companyId,
      classificationCaseId: reviewItem.sourceObjectId,
      approvalNote: note,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  if (reviewItem.sourceDomainCode === "IMPORT_CASES" && reviewItem.sourceObjectType === "import_case") {
    if (typeof platform.approveImportCase !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "Import-case approval runtime is unavailable.");
    }
    return platform.approveImportCase({
      companyId,
      importCaseId: reviewItem.sourceObjectId,
      approvalNote: note,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  if (reviewItem.sourceDomainCode === "DOCUMENTS" && reviewItem.sourceObjectType === "review_task") {
    if (typeof platform.approveReviewTask !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "Document review-task approval runtime is unavailable.");
    }
    return platform.approveReviewTask({
      companyId,
      reviewTaskId: reviewItem.sourceObjectId,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  if (reviewItem.sourceDomainCode === "VAT" && reviewItem.sourceObjectType === "vat_decision") {
    if (typeof platform.resolveVatDecisionReview !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "VAT review resolution runtime is unavailable.");
    }
    const decisionPayload = reviewItem.latestDecision?.decisionPayloadJson || {};
    const vatCode = typeof decisionPayload.vatCode === "string" && decisionPayload.vatCode.trim().length > 0
      ? decisionPayload.vatCode.trim()
      : null;
    if (!vatCode) {
      throw createHttpError(409, "review_center_vat_payload_missing", "VAT review decisions must include a vatCode decision payload.");
    }
    return platform.resolveVatDecisionReview({
      companyId,
      vatDecisionId: reviewItem.sourceObjectId,
      vatCode,
      resolutionCode: decisionPayload.resolutionCode || "manual_vat_resolution",
      resolutionNote: decisionPayload.resolutionNote || note || null,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  return null;
}

export function applyReviewCenterSourceAction({
  platform,
  companyId,
  reviewItem,
  actionCode,
  actionPayload = {},
  actorId
} = {}) {
  if (!reviewItem) {
    return null;
  }

  const resolvedActorId = typeof actorId === "string" && actorId.trim().length > 0 ? actorId.trim() : null;
  if (!resolvedActorId) {
    throw createHttpError(400, "actor_id_required", "actorId is required.");
  }
  const resolvedActionCode = typeof actionCode === "string" && actionCode.trim().length > 0 ? actionCode.trim().toLowerCase() : null;
  if (!resolvedActionCode) {
    throw createHttpError(400, "review_center_source_action_required", "actionCode is required.");
  }

  if (reviewItem.sourceDomainCode === "DOCUMENTS" && reviewItem.sourceObjectType === "review_task" && resolvedActionCode === "correct") {
    if (typeof platform.correctReviewTask !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "Document correction runtime is unavailable.");
    }
    return platform.correctReviewTask({
      companyId,
      reviewTaskId: reviewItem.sourceObjectId,
      correctedDocumentType: actionPayload.correctedDocumentType,
      correctedFieldsJson: actionPayload.correctedFieldsJson || {},
      correctionComment: actionPayload.correctionComment || null,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  if (reviewItem.sourceDomainCode === "DOCUMENT_CLASSIFICATION" && reviewItem.sourceObjectType === "classification_case" && resolvedActionCode === "correct") {
    if (typeof platform.correctClassificationCase !== "function") {
      throw createHttpError(409, "review_center_source_action_unavailable", "Classification correction runtime is unavailable.");
    }
    return platform.correctClassificationCase({
      companyId,
      classificationCaseId: reviewItem.sourceObjectId,
      lineInputs: actionPayload.lineInputs || [],
      extractedFields: actionPayload.extractedFields || {},
      sourceOcrRunId: actionPayload.sourceOcrRunId || null,
      reasonCode: actionPayload.reasonCode || "correction",
      reasonNote: actionPayload.reasonNote || null,
      actorId: resolvedActorId,
      reviewCenterManaged: true
    });
  }

  throw createHttpError(
    409,
    "review_center_source_action_unavailable",
    `Source action ${resolvedActionCode} is unavailable for ${reviewItem.sourceDomainCode}/${reviewItem.sourceObjectType}.`
  );
}
