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
  if (!reviewItem || decisionCode !== "approve") {
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
  if (!reviewItem || decisionCode !== "approve") {
    return null;
  }

  const resolvedActorId = typeof actorId === "string" && actorId.trim().length > 0 ? actorId.trim() : null;
  if (!resolvedActorId) {
    throw createHttpError(400, "actor_id_required", "actorId is required.");
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

  return null;
}
