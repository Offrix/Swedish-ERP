import crypto from "node:crypto";
import {
  DEMO_COMPANY_ID,
  REVIEW_ACTIVE_ITEM_STATUSES,
  REVIEW_CENTER_RULEPACK_CODE,
  REVIEW_CENTER_RULEPACK_VERSION,
  REVIEW_DECISION_CODES,
  REVIEW_ITEM_STATUSES,
  REVIEW_QUEUE_STATUSES,
  REVIEW_REQUIRED_DECISION_TYPES,
  REVIEW_RISK_CLASSES
} from "./constants.mjs";

export function createReviewCenterPlatform(options = {}) {
  return createReviewCenterEngine(options);
}

export function createReviewCenterEngine({ clock = () => new Date(), seedDemo = true } = {}) {
  const state = {
    reviewQueues: new Map(),
    reviewQueueIdsByCompany: new Map(),
    reviewQueueIdByCompanyAndCode: new Map(),
    reviewItems: new Map(),
    reviewItemIdsByCompany: new Map(),
    reviewItemIdsByQueue: new Map(),
    reviewItemIdByDedupeKey: new Map(),
    reviewDecisions: new Map(),
    reviewDecisionIdsByItem: new Map(),
    reviewAssignments: new Map(),
    reviewAssignmentIdsByItem: new Map(),
    reviewEvents: [],
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
  }

  return {
    reviewQueueStatuses: REVIEW_QUEUE_STATUSES,
    reviewItemStatuses: REVIEW_ITEM_STATUSES,
    reviewDecisionCodes: REVIEW_DECISION_CODES,
    reviewRiskClasses: REVIEW_RISK_CLASSES,
    reviewRequiredDecisionTypes: REVIEW_REQUIRED_DECISION_TYPES,
    createReviewQueue,
    listReviewCenterQueues,
    getReviewCenterQueue,
    createReviewItem,
    listReviewCenterItems,
    getReviewCenterItem,
    claimReviewCenterItem,
    startReviewCenterItem,
    reassignReviewCenterItem,
    requestReviewMoreInput,
    decideReviewCenterItem,
    closeReviewCenterItem,
    listReviewCenterEvents,
    listReviewCenterAuditEvents,
    snapshotReviewCenter
  };

  function createReviewQueue({
    companyId,
    queueCode,
    label,
    description = null,
    ownerTeamId = null,
    defaultRiskClass = "medium",
    defaultSlaHours = 24,
    allowedSourceDomains = [],
    requiredDecisionTypes = ["generic_review"],
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedQueueCode = normalizeCode(queueCode, "review_queue_code_required");
    const queueKey = buildQueueKey(resolvedCompanyId, resolvedQueueCode);
    if (state.reviewQueueIdByCompanyAndCode.has(queueKey)) {
      throw createError(409, "review_queue_code_exists", "Review queue code already exists for the company.");
    }

    const queue = buildQueueRecord({
      clock,
      companyId: resolvedCompanyId,
      queueCode: resolvedQueueCode,
      label: requireText(label, "review_queue_label_required"),
      description: normalizeOptionalText(description),
      ownerTeamId: normalizeOptionalText(ownerTeamId),
      defaultRiskClass: assertAllowed(normalizeEnumValue(defaultRiskClass, "review_queue_risk_class_required"), REVIEW_RISK_CLASSES, "review_queue_risk_class_invalid"),
      defaultSlaHours: normalizePositiveInteger(defaultSlaHours, "review_queue_default_sla_hours_invalid"),
      allowedSourceDomains: normalizeCodeList(allowedSourceDomains),
      requiredDecisionTypes: normalizeRequiredDecisionTypes(requiredDecisionTypes),
      createdByActorId: requireText(actorId, "actor_id_required")
    });

    state.reviewQueues.set(queue.reviewQueueId, queue);
    appendToIndex(state.reviewQueueIdsByCompany, resolvedCompanyId, queue.reviewQueueId);
    state.reviewQueueIdByCompanyAndCode.set(queueKey, queue.reviewQueueId);
    pushReviewEvent(state, clock, {
      companyId: resolvedCompanyId,
      actorId: queue.createdByActorId,
      eventType: "review_queue.created",
      reviewQueueId: queue.reviewQueueId,
      payload: { queueCode: queue.queueCode }
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: queue.createdByActorId,
      action: "review_center.queue_created",
      entityType: "review_queue",
      entityId: queue.reviewQueueId,
      explanation: `Created review queue ${queue.queueCode}.`
    });
    return presentQueue(state, queue, clock);
  }

  function listReviewCenterQueues({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status == null
      ? null
      : assertAllowed(normalizeEnumValue(status, "review_queue_status_required"), REVIEW_QUEUE_STATUSES, "review_queue_status_invalid");
    return (state.reviewQueueIdsByCompany.get(resolvedCompanyId) || [])
      .map((queueId) => state.reviewQueues.get(queueId))
      .filter(Boolean)
      .filter((queue) => (resolvedStatus ? queue.status === resolvedStatus : true))
      .map((queue) => presentQueue(state, queue, clock))
      .sort((left, right) => left.label.localeCompare(right.label) || left.queueCode.localeCompare(right.queueCode));
  }

  function getReviewCenterQueue({ companyId, reviewQueueId = null, queueCode = null } = {}) {
    return presentQueue(state, requireQueue(state, companyId, { reviewQueueId, queueCode }), clock);
  }

  function createReviewItem({
    companyId,
    queueId = null,
    queueCode = null,
    reviewTypeCode,
    sourceDomainCode,
    sourceObjectType,
    sourceObjectId,
    sourceReference = null,
    sourceObjectLabel = null,
    requiredDecisionType = "generic_review",
    riskClass = null,
    title,
    summary = null,
    requestedPayload = {},
    evidenceRefs = [],
    policyCode = null,
    actorContext = {},
    assignedUserId = null,
    assignedTeamId = null,
    slaDueAt = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const queue = requireQueue(state, resolvedCompanyId, { reviewQueueId: queueId, queueCode });
    const resolvedSourceDomainCode = normalizeCode(sourceDomainCode, "source_domain_code_required");
    if (queue.allowedSourceDomains.length > 0 && !queue.allowedSourceDomains.includes(resolvedSourceDomainCode)) {
      throw createError(409, "review_queue_source_domain_not_allowed", "Source domain is not allowed in the selected review queue.");
    }

    const resolvedRequiredDecisionType = assertAllowed(
      normalizeEnumValue(requiredDecisionType, "required_decision_type_required"),
      REVIEW_REQUIRED_DECISION_TYPES,
      "required_decision_type_invalid"
    );
    if (!queue.requiredDecisionTypes.includes(resolvedRequiredDecisionType)) {
      throw createError(409, "review_queue_decision_type_not_allowed", "Decision type is not allowed in the selected review queue.");
    }

    const dedupeKey = buildDedupeKey({
      companyId: resolvedCompanyId,
      reviewQueueId: queue.reviewQueueId,
      sourceDomainCode: resolvedSourceDomainCode,
      sourceObjectType: requireText(sourceObjectType, "source_object_type_required"),
      sourceObjectId: requireText(sourceObjectId, "source_object_id_required"),
      reviewTypeCode: normalizeCode(reviewTypeCode, "review_type_code_required"),
      requiredDecisionType: resolvedRequiredDecisionType
    });
    const existingItemId = state.reviewItemIdByDedupeKey.get(dedupeKey);
    if (existingItemId) {
      const existingItem = state.reviewItems.get(existingItemId);
      if (existingItem && REVIEW_ACTIVE_ITEM_STATUSES.includes(existingItem.status)) {
        return presentItem(state, existingItem, clock);
      }
    }

    const now = nowIso(clock);
    const item = {
      reviewItemId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      reviewQueueId: queue.reviewQueueId,
      queueCode: queue.queueCode,
      reviewTypeCode: normalizeCode(reviewTypeCode, "review_type_code_required"),
      sourceDomainCode: resolvedSourceDomainCode,
      sourceObjectType: requireText(sourceObjectType, "source_object_type_required"),
      sourceObjectId: requireText(sourceObjectId, "source_object_id_required"),
      sourceReference: normalizeOptionalText(sourceReference),
      sourceObjectLabel: normalizeOptionalText(sourceObjectLabel),
      requiredDecisionType: resolvedRequiredDecisionType,
      riskClass: assertAllowed(normalizeEnumValue(riskClass || queue.defaultRiskClass, "review_risk_class_required"), REVIEW_RISK_CLASSES, "review_risk_class_invalid"),
      title: requireText(title, "review_item_title_required"),
      summary: normalizeOptionalText(summary),
      status: "open",
      policyCode: normalizeOptionalText(policyCode),
      requestedPayloadJson: copy(requestedPayload || {}),
      evidenceRefs: normalizeStringList(evidenceRefs),
      actorContextJson: copy(actorContext || {}),
      claimedByActorId: null,
      claimedAt: null,
      waitingInputReasonCode: null,
      waitingInputNote: null,
      latestDecisionId: null,
      latestAssignmentId: null,
      escalationCount: 0,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now,
      slaDueAt: normalizeOptionalDateTime(slaDueAt) || addHours(now, queue.defaultSlaHours),
      closedAt: null,
      closedByActorId: null,
      metadataJson: {
        rulepackCode: REVIEW_CENTER_RULEPACK_CODE,
        rulepackVersion: REVIEW_CENTER_RULEPACK_VERSION
      }
    };

    state.reviewItems.set(item.reviewItemId, item);
    appendToIndex(state.reviewItemIdsByCompany, resolvedCompanyId, item.reviewItemId);
    appendToIndex(state.reviewItemIdsByQueue, queue.reviewQueueId, item.reviewItemId);
    state.reviewItemIdByDedupeKey.set(dedupeKey, item.reviewItemId);

    if (assignedUserId || assignedTeamId) {
      const assignment = appendAssignment(state, clock, item, {
        assignedUserId,
        assignedTeamId,
        assignedByActorId: item.createdByActorId,
        reasonCode: "initial_assignment"
      });
      item.latestAssignmentId = assignment.reviewAssignmentId;
      item.updatedAt = nowIso(clock);
    }

    pushReviewEvent(state, clock, {
      companyId: resolvedCompanyId,
      actorId: item.createdByActorId,
      eventType: "review_item.created",
      reviewItemId: item.reviewItemId,
      reviewQueueId: item.reviewQueueId,
      payload: {
        queueCode: item.queueCode,
        sourceDomainCode: item.sourceDomainCode,
        sourceObjectType: item.sourceObjectType,
        sourceObjectId: item.sourceObjectId
      }
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: item.createdByActorId,
      action: "review_center.item_created",
      entityType: "review_item",
      entityId: item.reviewItemId,
      explanation: `Created review item ${item.reviewItemId} in queue ${item.queueCode}.`
    });
    return presentItem(state, item, clock);
  }

  function listReviewCenterItems({ companyId, queueCode = null, status = null, assignedUserId = null, riskClass = null, sourceDomainCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedQueueCode = normalizeOptionalCode(queueCode);
    const resolvedStatus = normalizeOptionalEnumValue(status, REVIEW_ITEM_STATUSES, "review_item_status_invalid");
    const resolvedAssignedUserId = normalizeOptionalText(assignedUserId);
    const resolvedRiskClass = normalizeOptionalEnumValue(riskClass, REVIEW_RISK_CLASSES, "review_risk_class_invalid");
    const resolvedSourceDomainCode = normalizeOptionalCode(sourceDomainCode);

    return (state.reviewItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((reviewItemId) => state.reviewItems.get(reviewItemId))
      .filter(Boolean)
      .map((item) => presentItem(state, item, clock))
      .filter((item) => (resolvedQueueCode ? item.queueCode === resolvedQueueCode : true))
      .filter((item) => (resolvedStatus ? item.status === resolvedStatus : true))
      .filter((item) => (resolvedAssignedUserId ? item.currentAssignment?.assignedUserId === resolvedAssignedUserId : true))
      .filter((item) => (resolvedRiskClass ? item.riskClass === resolvedRiskClass : true))
      .filter((item) => (resolvedSourceDomainCode ? item.sourceDomainCode === resolvedSourceDomainCode : true))
      .sort(compareReviewItems);
  }

  function getReviewCenterItem({ companyId, reviewItemId } = {}) {
    return presentItem(state, requireItem(state, companyId, reviewItemId), clock, { includeHistory: true });
  }

  function claimReviewCenterItem({ companyId, reviewItemId, actorId = "system" } = {}) {
    const item = requireItem(state, companyId, reviewItemId);
    if (!["open", "waiting_input", "escalated"].includes(item.status)) {
      throw createError(409, "review_item_not_claimable", "Review item cannot be claimed from its current status.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (item.claimedByActorId && item.claimedByActorId !== resolvedActorId) {
      throw createError(409, "review_item_already_claimed", "Review item is already claimed by another actor.");
    }

    const latestAssignment = getLatestAssignment(state, item.reviewItemId);
    const assignment = appendAssignment(state, clock, item, {
      assignedUserId: resolvedActorId,
      assignedTeamId: latestAssignment?.assignedTeamId || null,
      assignedByActorId: resolvedActorId,
      reasonCode: "claim"
    });

    item.status = "claimed";
    item.claimedByActorId = resolvedActorId;
    item.claimedAt = item.claimedAt || nowIso(clock);
    item.latestAssignmentId = assignment.reviewAssignmentId;
    item.updatedAt = nowIso(clock);
    pushReviewEvent(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      eventType: "review_item.claimed",
      reviewItemId: item.reviewItemId,
      reviewQueueId: item.reviewQueueId,
      payload: { reviewAssignmentId: assignment.reviewAssignmentId }
    });
    pushAudit(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      action: "review_center.item_claimed",
      entityType: "review_item",
      entityId: item.reviewItemId,
      explanation: `Claimed review item ${item.reviewItemId}.`
    });
    return presentItem(state, item, clock, { includeHistory: true });
  }

  function startReviewCenterItem({ companyId, reviewItemId, actorId = "system" } = {}) {
    const item = requireItem(state, companyId, reviewItemId);
    if (item.status !== "claimed") {
      throw createError(409, "review_item_not_startable", "Review item must be claimed before review can start.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (item.claimedByActorId !== resolvedActorId) {
      throw createError(409, "review_item_claim_owner_required", "Only the claiming actor can start the review.");
    }
    item.status = "in_review";
    item.updatedAt = nowIso(clock);
    pushReviewEvent(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      eventType: "review_item.started",
      reviewItemId: item.reviewItemId,
      reviewQueueId: item.reviewQueueId,
      payload: {}
    });
    pushAudit(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      action: "review_center.item_started",
      entityType: "review_item",
      entityId: item.reviewItemId,
      explanation: `Started review on item ${item.reviewItemId}.`
    });
    return presentItem(state, item, clock, { includeHistory: true });
  }

  function reassignReviewCenterItem({ companyId, reviewItemId, assignedUserId = null, assignedTeamId = null, actorId = "system", reasonCode = "reassign" } = {}) {
    const item = requireItem(state, companyId, reviewItemId);
    if (["approved", "rejected", "closed"].includes(item.status)) {
      throw createError(409, "review_item_not_reassignable", "Closed review outcomes cannot be reassigned.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const assignment = appendAssignment(state, clock, item, {
      assignedUserId,
      assignedTeamId,
      assignedByActorId: resolvedActorId,
      reasonCode
    });
    item.latestAssignmentId = assignment.reviewAssignmentId;
    item.claimedByActorId = null;
    item.claimedAt = null;
    item.status = "open";
    item.updatedAt = nowIso(clock);
    pushReviewEvent(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      eventType: "review_item.reassigned",
      reviewItemId: item.reviewItemId,
      reviewQueueId: item.reviewQueueId,
      payload: { reviewAssignmentId: assignment.reviewAssignmentId, reasonCode }
    });
    pushAudit(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      action: "review_center.item_reassigned",
      entityType: "review_item",
      entityId: item.reviewItemId,
      explanation: `Reassigned review item ${item.reviewItemId}.`
    });
    return presentItem(state, item, clock, { includeHistory: true });
  }

  function requestReviewMoreInput({ companyId, reviewItemId, reasonCode, note = null, actorId = "system" } = {}) {
    const item = requireItem(state, companyId, reviewItemId);
    if (!["claimed", "in_review"].includes(item.status)) {
      throw createError(409, "review_item_not_waiting_input_eligible", "Review item cannot move to waiting_input from its current status.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (item.claimedByActorId !== resolvedActorId) {
      throw createError(409, "review_item_claim_owner_required", "Only the claiming actor can request more input.");
    }
    item.status = "waiting_input";
    item.waitingInputReasonCode = normalizeCode(reasonCode, "review_input_reason_required");
    item.waitingInputNote = normalizeOptionalText(note);
    item.updatedAt = nowIso(clock);
    pushReviewEvent(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      eventType: "review_item.waiting_input",
      reviewItemId: item.reviewItemId,
      reviewQueueId: item.reviewQueueId,
      payload: { reasonCode: item.waitingInputReasonCode }
    });
    pushAudit(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      action: "review_center.item_waiting_input",
      entityType: "review_item",
      entityId: item.reviewItemId,
      explanation: `Review item ${item.reviewItemId} is waiting for more input.`
    });
    return presentItem(state, item, clock, { includeHistory: true });
  }

  function decideReviewCenterItem({
    companyId,
    reviewItemId,
    decisionCode,
    reasonCode,
    note = null,
    decisionPayload = {},
    evidenceRefs = [],
    overrideReasonCode = null,
    resultingCommand = null,
    targetQueueCode = null,
    actorId = "system"
  } = {}) {
    const item = requireItem(state, companyId, reviewItemId);
    if (!["claimed", "in_review", "waiting_input", "escalated"].includes(item.status)) {
      throw createError(409, "review_item_not_decidable", "Review item cannot be decided from its current status.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (["claimed", "in_review"].includes(item.status) && item.claimedByActorId && item.claimedByActorId !== resolvedActorId) {
      throw createError(409, "review_item_claim_owner_required", "Only the claiming actor can decide the review item.");
    }

    const resolvedDecisionCode = assertAllowed(normalizeEnumValue(decisionCode, "review_decision_code_required"), REVIEW_DECISION_CODES, "review_decision_code_invalid");
    const resolvedReasonCode = normalizeCode(reasonCode, "review_decision_reason_required");
    const resultingStatus = resolvedDecisionCode === "approve" ? "approved" : resolvedDecisionCode === "reject" ? "rejected" : "escalated";
    const targetQueue = resolvedDecisionCode === "escalate"
      ? requireQueue(state, item.companyId, { queueCode: targetQueueCode || item.queueCode })
      : null;

    const now = nowIso(clock);
    const decision = {
      reviewDecisionId: crypto.randomUUID(),
      companyId: item.companyId,
      reviewItemId: item.reviewItemId,
      queueCodeBeforeDecision: item.queueCode,
      decisionCode: resolvedDecisionCode,
      resultingStatus,
      decidedByActorId: resolvedActorId,
      decidedAt: now,
      reasonCode: resolvedReasonCode,
      note: normalizeOptionalText(note),
      overrideReasonCode: normalizeOptionalText(overrideReasonCode),
      decisionPayloadJson: copy(decisionPayload || {}),
      evidenceRefs: normalizeStringList(evidenceRefs),
      resultingCommand: normalizeOptionalStructured(resultingCommand),
      targetQueueId: targetQueue?.reviewQueueId || null,
      targetQueueCode: targetQueue?.queueCode || null
    };
    state.reviewDecisions.set(decision.reviewDecisionId, decision);
    appendToIndex(state.reviewDecisionIdsByItem, item.reviewItemId, decision.reviewDecisionId);

    item.latestDecisionId = decision.reviewDecisionId;
    item.status = resultingStatus;
    item.waitingInputReasonCode = null;
    item.waitingInputNote = null;
    item.updatedAt = now;
    if (resultingStatus === "escalated") {
      item.reviewQueueId = targetQueue.reviewQueueId;
      item.queueCode = targetQueue.queueCode;
      appendUniqueToIndex(state.reviewItemIdsByQueue, targetQueue.reviewQueueId, item.reviewItemId);
      item.escalationCount += 1;
      item.claimedByActorId = null;
      item.claimedAt = null;
    }

    pushReviewEvent(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      eventType: "review_item.decided",
      reviewItemId: item.reviewItemId,
      reviewQueueId: item.reviewQueueId,
      payload: { decisionCode: resolvedDecisionCode, resultingStatus, targetQueueCode: targetQueue?.queueCode || null }
    });
    pushAudit(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      action: "review_center.item_decided",
      entityType: "review_item",
      entityId: item.reviewItemId,
      explanation: `Review item ${item.reviewItemId} decided as ${resolvedDecisionCode}.`
    });
    return presentItem(state, item, clock, { includeHistory: true });
  }

  function closeReviewCenterItem({ companyId, reviewItemId, actorId = "system", note = null } = {}) {
    const item = requireItem(state, companyId, reviewItemId);
    if (!["approved", "rejected", "escalated"].includes(item.status)) {
      throw createError(409, "review_item_not_closable", "Review item can only be closed after a final outcome.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    item.status = "closed";
    item.closedAt = nowIso(clock);
    item.closedByActorId = resolvedActorId;
    item.updatedAt = item.closedAt;
    pushReviewEvent(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      eventType: "review_item.closed",
      reviewItemId: item.reviewItemId,
      reviewQueueId: item.reviewQueueId,
      payload: { note: normalizeOptionalText(note) }
    });
    pushAudit(state, clock, {
      companyId: item.companyId,
      actorId: resolvedActorId,
      action: "review_center.item_closed",
      entityType: "review_item",
      entityId: item.reviewItemId,
      explanation: `Review item ${item.reviewItemId} closed.`
    });
    return presentItem(state, item, clock, { includeHistory: true });
  }

  function listReviewCenterEvents({ companyId, reviewItemId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReviewItemId = normalizeOptionalText(reviewItemId);
    return state.reviewEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedReviewItemId ? event.reviewItemId === resolvedReviewItemId : true))
      .map(copy);
  }

  function listReviewCenterAuditEvents({ companyId, reviewItemId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReviewItemId = normalizeOptionalText(reviewItemId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedReviewItemId ? event.entityId === resolvedReviewItemId : true))
      .map(copy);
  }

  function snapshotReviewCenter() {
    return {
      reviewQueues: [...state.reviewQueues.values()].map(copy),
      reviewItems: [...state.reviewItems.values()].map(copy),
      reviewDecisions: [...state.reviewDecisions.values()].map(copy),
      reviewAssignments: [...state.reviewAssignments.values()].map(copy),
      reviewEvents: state.reviewEvents.map(copy),
      auditEvents: state.auditEvents.map(copy)
    };
  }
}

function buildQueueRecord({ clock, companyId, queueCode, label, description, ownerTeamId, defaultRiskClass, defaultSlaHours, allowedSourceDomains, requiredDecisionTypes, createdByActorId }) {
  const now = nowIso(clock);
  return {
    reviewQueueId: crypto.randomUUID(),
    companyId,
    queueCode,
    label,
    description,
    ownerTeamId,
    status: "active",
    defaultRiskClass,
    defaultSlaHours,
    allowedSourceDomains,
    requiredDecisionTypes,
    createdByActorId,
    createdAt: now,
    updatedAt: now
  };
}

function presentQueue(state, queue, clock) {
  const items = (state.reviewItemIdsByQueue.get(queue.reviewQueueId) || [])
    .map((reviewItemId) => state.reviewItems.get(reviewItemId))
    .filter(Boolean);
  const now = nowIso(clock);
  return {
    ...copy(queue),
    metrics: {
      openItemCount: items.filter((item) => item.status === "open").length,
      claimedItemCount: items.filter((item) => item.status === "claimed" || item.status === "in_review").length,
      waitingInputCount: items.filter((item) => item.status === "waiting_input").length,
      escalatedItemCount: items.filter((item) => item.status === "escalated").length,
      overdueItemCount: items.filter((item) => REVIEW_ACTIVE_ITEM_STATUSES.includes(item.status) && item.slaDueAt < now).length
    }
  };
}

function presentItem(state, item, clock, { includeHistory = false } = {}) {
  const currentAssignment = getLatestAssignment(state, item.reviewItemId);
  const latestDecision = getLatestDecision(state, item.reviewItemId);
  const result = {
    ...copy(item),
    queue: state.reviewQueues.get(item.reviewQueueId) ? copy(state.reviewQueues.get(item.reviewQueueId)) : null,
    currentAssignment: currentAssignment ? copy(currentAssignment) : null,
    latestDecision: latestDecision ? copy(latestDecision) : null,
    isOverdue: REVIEW_ACTIVE_ITEM_STATUSES.includes(item.status) && item.slaDueAt < nowIso(clock)
  };
  if (includeHistory) {
    result.assignmentHistory = (state.reviewAssignmentIdsByItem.get(item.reviewItemId) || []).map((assignmentId) => copy(state.reviewAssignments.get(assignmentId))).filter(Boolean);
    result.decisionHistory = (state.reviewDecisionIdsByItem.get(item.reviewItemId) || []).map((decisionId) => copy(state.reviewDecisions.get(decisionId))).filter(Boolean);
  }
  return result;
}

function appendAssignment(state, clock, item, { assignedUserId = null, assignedTeamId = null, assignedByActorId, reasonCode }) {
  const assignment = {
    reviewAssignmentId: crypto.randomUUID(),
    companyId: item.companyId,
    reviewItemId: item.reviewItemId,
    assignedUserId: normalizeOptionalText(assignedUserId),
    assignedTeamId: normalizeOptionalText(assignedTeamId),
    assignedByActorId: requireText(assignedByActorId, "actor_id_required"),
    assignedAt: nowIso(clock),
    reasonCode: normalizeCode(reasonCode, "review_assignment_reason_required")
  };
  state.reviewAssignments.set(assignment.reviewAssignmentId, assignment);
  appendToIndex(state.reviewAssignmentIdsByItem, item.reviewItemId, assignment.reviewAssignmentId);
  return assignment;
}

function getLatestAssignment(state, reviewItemId) {
  const assignmentIds = state.reviewAssignmentIdsByItem.get(reviewItemId) || [];
  return assignmentIds.length === 0 ? null : state.reviewAssignments.get(assignmentIds.at(-1)) || null;
}

function getLatestDecision(state, reviewItemId) {
  const decisionIds = state.reviewDecisionIdsByItem.get(reviewItemId) || [];
  return decisionIds.length === 0 ? null : state.reviewDecisions.get(decisionIds.at(-1)) || null;
}

function requireQueue(state, companyId, { reviewQueueId = null, queueCode = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  let queue = null;
  if (normalizeOptionalText(reviewQueueId)) {
    queue = state.reviewQueues.get(reviewQueueId) || null;
  } else if (normalizeOptionalCode(queueCode)) {
    const queueId = state.reviewQueueIdByCompanyAndCode.get(buildQueueKey(resolvedCompanyId, normalizeOptionalCode(queueCode)));
    queue = queueId ? state.reviewQueues.get(queueId) || null : null;
  } else {
    throw createError(400, "review_queue_reference_required", "Either reviewQueueId or queueCode is required.");
  }
  if (!queue) {
    throw createError(404, "review_queue_not_found", "Review queue was not found.");
  }
  if (queue.companyId !== resolvedCompanyId) {
    throw createError(403, "cross_company_forbidden", "Review queue belongs to another company.");
  }
  return queue;
}

function requireItem(state, companyId, reviewItemId) {
  const item = state.reviewItems.get(requireText(reviewItemId, "review_item_id_required"));
  if (!item) {
    throw createError(404, "review_item_not_found", "Review item was not found.");
  }
  if (companyId && item.companyId !== companyId) {
    throw createError(403, "cross_company_forbidden", "Review item belongs to another company.");
  }
  return item;
}

function seedDemoState(state, clock) {
  const demoQueues = [
    ["DOCUMENT_REVIEW", "Document review", "finance_ops", "high", 8, ["DOCUMENTS", "DOCUMENT_CLASSIFICATION", "AUTOMATION"], ["classification", "generic_review"]],
    ["VAT_REVIEW", "VAT review", "finance_ops", "high", 12, ["VAT", "IMPORT_CASES"], ["vat_treatment", "generic_review"]],
    ["PAYROLL_REVIEW", "Payroll review", "payroll_ops", "critical", 4, ["PAYROLL", "BENEFITS", "DOCUMENT_CLASSIFICATION", "AUTOMATION"], ["payroll_treatment", "generic_review"]],
    ["TAX_ACCOUNT_REVIEW", "Tax account review", "finance_ops", "high", 24, ["TAX_ACCOUNT", "VAT", "PAYROLL", "HUS"], ["tax_reconciliation", "generic_review"]],
    ["HUS_REVIEW", "HUS review", "finance_ops", "critical", 8, ["HUS", "AR"], ["hus_outcome", "generic_review"]]
  ];
  for (const [queueCode, label, ownerTeamId, defaultRiskClass, defaultSlaHours, allowedSourceDomains, requiredDecisionTypes] of demoQueues) {
    const queue = buildQueueRecord({
      clock,
      companyId: DEMO_COMPANY_ID,
      queueCode,
      label,
      description: null,
      ownerTeamId,
      defaultRiskClass,
      defaultSlaHours,
      allowedSourceDomains,
      requiredDecisionTypes,
      createdByActorId: "system"
    });
    state.reviewQueues.set(queue.reviewQueueId, queue);
    appendToIndex(state.reviewQueueIdsByCompany, DEMO_COMPANY_ID, queue.reviewQueueId);
    state.reviewQueueIdByCompanyAndCode.set(buildQueueKey(DEMO_COMPANY_ID, queue.queueCode), queue.reviewQueueId);
  }
}

function buildQueueKey(companyId, queueCode) {
  return `${companyId}::${queueCode}`;
}

function buildDedupeKey({ companyId, reviewQueueId, sourceDomainCode, sourceObjectType, sourceObjectId, reviewTypeCode, requiredDecisionType }) {
  return [companyId, reviewQueueId, sourceDomainCode, sourceObjectType, sourceObjectId, reviewTypeCode, requiredDecisionType].join("::");
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

function appendUniqueToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  if (!index.get(key).includes(value)) {
    index.get(key).push(value);
  }
}

function pushReviewEvent(state, clock, { companyId, actorId, eventType, reviewItemId = null, reviewQueueId = null, payload = {} }) {
  state.reviewEvents.push({
    reviewEventId: crypto.randomUUID(),
    companyId,
    actorId,
    eventType,
    reviewItemId,
    reviewQueueId,
    payload: copy(payload),
    recordedAt: nowIso(clock)
  });
}

function pushAudit(state, clock, { companyId, actorId, action, entityType, entityId, explanation }) {
  state.auditEvents.push({
    auditEventId: crypto.randomUUID(),
    companyId,
    actorId,
    action,
    entityType,
    entityId,
    explanation,
    recordedAt: nowIso(clock)
  });
}

function compareReviewItems(left, right) {
  const overdueSort = Number(right.isOverdue) - Number(left.isOverdue);
  if (overdueSort !== 0) {
    return overdueSort;
  }
  return left.slaDueAt.localeCompare(right.slaDueAt) || left.createdAt.localeCompare(right.createdAt);
}

function normalizeCode(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function normalizeOptionalCode(value) {
  if (value == null || String(value).trim().length === 0) {
    return null;
  }
  return String(value).trim().replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function normalizeOptionalAllowedCode(value, allowed, code) {
  const resolved = normalizeOptionalCode(value);
  return resolved == null ? null : assertAllowed(resolved, allowed, code);
}

function normalizeOptionalEnumValue(value, allowed, code) {
  const resolved = value == null || String(value).trim().length === 0
    ? null
    : normalizeEnumValue(value, code);
  return resolved == null ? null : assertAllowed(resolved, allowed, code);
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeCodeList(values) {
  if (!Array.isArray(values)) {
    return Object.freeze([]);
  }
  return Object.freeze([...new Set(values.map((value) => normalizeCode(value, "code_required")))]);
}

function normalizeRequiredDecisionTypes(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw createError(400, "review_queue_required_decision_types_required", "requiredDecisionTypes must contain at least one value.");
  }
  return Object.freeze([...new Set(values.map((value) => assertAllowed(normalizeEnumValue(value, "required_decision_type_required"), REVIEW_REQUIRED_DECISION_TYPES, "required_decision_type_invalid")))]);
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => requireText(value, "list_value_required")))];
}

function normalizePositiveInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, code, "Value must be a positive integer.");
  }
  return parsed;
}

function normalizeOptionalDateTime(value) {
  if (value == null || String(value).trim().length === 0) {
    return null;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw createError(400, "review_datetime_invalid", "Datetime is invalid.");
  }
  return date.toISOString();
}

function normalizeOptionalStructured(value) {
  if (value == null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw createError(400, "review_resulting_command_invalid", "resultingCommand must be an object.");
  }
  return copy(value);
}

function normalizeEnumValue(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toLowerCase();
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function assertAllowed(value, allowed, code) {
  if (!allowed.includes(value)) {
    throw createError(400, code, `Value "${value}" is not allowed.`);
  }
  return value;
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function addHours(isoValue, hours) {
  const date = new Date(isoValue);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
