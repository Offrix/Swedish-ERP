import crypto from "node:crypto";
import {
  NOTIFICATION_ACTION_CODES,
  NOTIFICATION_CHANNEL_CODES,
  NOTIFICATION_DELIVERY_STATUSES,
  NOTIFICATION_DIGEST_STATUSES,
  NOTIFICATION_ESCALATION_STATUSES,
  NOTIFICATION_PRIORITY_CODES,
  NOTIFICATION_RECIPIENT_TYPES,
  NOTIFICATION_STATUSES
} from "./constants.mjs";
import { createAuditEnvelope } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

export function createNotificationsPlatform(options = {}) {
  return createNotificationsEngine(options);
}

export function createNotificationsEngine({ clock = () => new Date() } = {}) {
  const state = {
    notifications: new Map(),
    notificationIdsByCompany: new Map(),
    notificationIdByDedupeKey: new Map(),
    deliveries: new Map(),
    deliveryIdsByNotification: new Map(),
    actions: new Map(),
    actionIdsByNotification: new Map(),
    digests: new Map(),
    digestIdsByCompany: new Map(),
    digestIdByFingerprint: new Map(),
    escalations: new Map(),
    escalationIdsByCompany: new Map(),
    escalationIdsByNotification: new Map(),
    auditEvents: []
  };

  const engine = {
    notificationStatuses: NOTIFICATION_STATUSES,
    notificationRecipientTypes: NOTIFICATION_RECIPIENT_TYPES,
    notificationPriorityCodes: NOTIFICATION_PRIORITY_CODES,
    notificationChannelCodes: NOTIFICATION_CHANNEL_CODES,
    notificationDigestStatuses: NOTIFICATION_DIGEST_STATUSES,
    notificationEscalationStatuses: NOTIFICATION_ESCALATION_STATUSES,
    createNotification,
    listNotifications,
    getNotificationInboxSummary,
    getNotification,
    deliverNotification,
    retryNotificationDelivery,
    bulkApplyNotificationAction,
    buildNotificationDigest,
    listNotificationDigests,
    getNotificationDigest,
    expireNotification,
    expireNotificationsDue,
    releaseSnoozedNotifications,
    markNotificationRead,
    acknowledgeNotification,
    snoozeNotification,
    cancelNotification,
    scanNotificationEscalations,
    listNotificationEscalations,
    listNotificationAuditEvents,
    snapshotNotifications
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function createNotification({
    companyId,
    recipientType,
    recipientId,
    categoryCode,
    priorityCode = "medium",
    sourceDomainCode,
    sourceObjectType,
    sourceObjectId,
    title,
    body,
    expiresAt = null,
    deepLink = null,
    dedupeKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedRecipientType = assertAllowed(normalizeEnumValue(recipientType, "notification_recipient_type_required"), NOTIFICATION_RECIPIENT_TYPES, "notification_recipient_type_invalid");
    const resolvedRecipientId = requireText(recipientId, "notification_recipient_id_required");
    const resolvedCategoryCode = normalizeCode(categoryCode, "notification_category_code_required");
    const resolvedPriorityCode = assertAllowed(normalizeEnumValue(priorityCode, "notification_priority_code_required"), NOTIFICATION_PRIORITY_CODES, "notification_priority_code_invalid");
    const resolvedSourceDomainCode = normalizeCode(sourceDomainCode, "notification_source_domain_required");
    const resolvedSourceObjectType = requireText(sourceObjectType, "notification_source_object_type_required");
    const resolvedSourceObjectId = requireText(sourceObjectId, "notification_source_object_id_required");
    const resolvedDedupeKey = normalizeOptionalText(dedupeKey) || [resolvedCompanyId, resolvedRecipientType, resolvedRecipientId, resolvedCategoryCode, resolvedSourceDomainCode, resolvedSourceObjectType, resolvedSourceObjectId].join("::");
    const existingId = state.notificationIdByDedupeKey.get(resolvedDedupeKey);
    if (existingId) {
      const existing = state.notifications.get(existingId);
      if (existing && !["cancelled", "expired", "acknowledged"].includes(existing.status)) {
        return presentNotification(state, existing);
      }
    }

    const notification = {
      notificationId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      recipientType: resolvedRecipientType,
      recipientId: resolvedRecipientId,
      categoryCode: resolvedCategoryCode,
      priorityCode: resolvedPriorityCode,
      sourceDomainCode: resolvedSourceDomainCode,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      title: requireText(title, "notification_title_required"),
      body: requireText(body, "notification_body_required"),
      status: "created",
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      expiresAt: normalizeOptionalDateTime(expiresAt),
      deepLink: normalizeOptionalText(deepLink),
      lastReadAt: null,
      acknowledgedAt: null,
      snoozedUntil: null,
      dedupeKey: resolvedDedupeKey,
      createdByActorId: requireText(actorId, "actor_id_required")
    };
    state.notifications.set(notification.notificationId, notification);
    appendToIndex(state.notificationIdsByCompany, resolvedCompanyId, notification.notificationId);
    state.notificationIdByDedupeKey.set(resolvedDedupeKey, notification.notificationId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: notification.createdByActorId,
      action: "notification.created",
      entityType: "notification",
      entityId: notification.notificationId,
      explanation: `Created ${resolvedCategoryCode} notification for ${resolvedRecipientType} ${resolvedRecipientId}.`
    });
    return presentNotification(state, notification);
  }

  function listNotifications({ companyId, recipientType = null, recipientId = null, status = null, categoryCode = null, onlyUnread = false } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedRecipientType = recipientType == null ? null : assertAllowed(normalizeEnumValue(recipientType, "notification_recipient_type_required"), NOTIFICATION_RECIPIENT_TYPES, "notification_recipient_type_invalid");
    const resolvedStatus = status == null ? null : assertAllowed(normalizeEnumValue(status, "notification_status_required"), NOTIFICATION_STATUSES, "notification_status_invalid");
    const resolvedCategoryCode = normalizeOptionalCode(categoryCode);
    return (state.notificationIdsByCompany.get(resolvedCompanyId) || [])
      .map((notificationId) => state.notifications.get(notificationId))
      .filter(Boolean)
      .map((notification) => presentNotification(state, notification))
      .filter((notification) => (resolvedRecipientType ? notification.recipientType === resolvedRecipientType : true))
      .filter((notification) => (recipientId ? notification.recipientId === recipientId : true))
      .filter((notification) => (resolvedStatus ? notification.status === resolvedStatus : true))
      .filter((notification) => (resolvedCategoryCode ? notification.categoryCode === resolvedCategoryCode : true))
      .filter((notification) => (onlyUnread ? isNotificationUnread(notification) : true))
      .sort(compareNotifications);
  }

  function getNotification({ companyId, notificationId } = {}) {
    return presentNotification(state, requireNotification(state, companyId, notificationId), { includeHistory: true });
  }

  function getNotificationInboxSummary({ companyId, recipientType = null, recipientId = null, status = null, categoryCode = null, onlyUnread = false } = {}) {
    const items = listNotifications({
      companyId,
      recipientType,
      recipientId,
      status,
      categoryCode,
      onlyUnread
    });
    const countsByStatus = Object.fromEntries(NOTIFICATION_STATUSES.map((statusCode) => [statusCode, 0]));
    const countsByPriority = Object.fromEntries(NOTIFICATION_PRIORITY_CODES.map((priorityCode) => [priorityCode, 0]));
    const categorySummaries = new Map();
    for (const item of items) {
      countsByStatus[item.status] += 1;
      countsByPriority[item.priorityCode] += 1;
      const categorySummary = ensureCategorySummary(categorySummaries, item.categoryCode);
      categorySummary.totalCount += 1;
      categorySummary.countsByPriority[item.priorityCode] += 1;
      if (item.unread) {
        categorySummary.unreadCount += 1;
      }
    }
    return {
      totalCount: items.length,
      unreadCount: items.filter((item) => item.unread).length,
      countsByStatus,
      countsByPriority,
      groups: [...categorySummaries.values()].sort((left, right) => left.categoryCode.localeCompare(right.categoryCode))
    };
  }

  function deliverNotification({ companyId, notificationId, channelCode = "in_app", status = "delivered", failureReasonCode = null, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    if (["cancelled", "expired"].includes(notification.status)) {
      throw createError(409, "notification_not_deliverable", "Notification cannot be delivered from its current status.");
    }
    const resolvedChannelCode = assertAllowed(normalizeEnumValue(channelCode, "notification_channel_code_required"), NOTIFICATION_CHANNEL_CODES, "notification_channel_code_invalid");
    const resolvedDeliveryStatus = assertAllowed(normalizeEnumValue(status, "notification_delivery_status_required"), NOTIFICATION_DELIVERY_STATUSES, "notification_delivery_status_invalid");
    const deliveries = state.deliveryIdsByNotification.get(notification.notificationId) || [];
    const delivery = {
      notificationDeliveryId: crypto.randomUUID(),
      notificationId: notification.notificationId,
      companyId: notification.companyId,
      channelCode: resolvedChannelCode,
      attemptNo: deliveries.length + 1,
      status: resolvedDeliveryStatus,
      deliveredAt: resolvedDeliveryStatus === "delivered" ? nowIso(clock) : null,
      failureReasonCode: resolvedDeliveryStatus === "failed" ? normalizeCode(failureReasonCode || "delivery_failed", "notification_failure_reason_required") : null
    };
    state.deliveries.set(delivery.notificationDeliveryId, delivery);
    appendToIndex(state.deliveryIdsByNotification, notification.notificationId, delivery.notificationDeliveryId);
    notification.status = resolvedDeliveryStatus === "delivered" ? "delivered" : "queued";
    notification.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: notification.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "notification.delivered",
      entityType: "notification",
      entityId: notification.notificationId,
      explanation: `Delivery attempt ${delivery.attemptNo} via ${resolvedChannelCode} ended in ${resolvedDeliveryStatus}.`
    });
    return presentNotification(state, notification, { includeHistory: true });
  }

  function retryNotificationDelivery({ companyId, notificationId, channelCode = null, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    const latestDelivery = (state.deliveryIdsByNotification.get(notification.notificationId) || [])
      .map((deliveryId) => state.deliveries.get(deliveryId))
      .filter(Boolean)
      .sort((left, right) => right.attemptNo - left.attemptNo)[0] || null;
    return deliverNotification({
      companyId,
      notificationId,
      channelCode: channelCode || latestDelivery?.channelCode || "in_app",
      status: "queued",
      actorId
    });
  }

  function bulkApplyNotificationAction({ companyId, notificationIds, actionCode, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActionCode = normalizeEnumValue(actionCode, "notification_action_code_required");
    if (!["read", "acknowledge"].includes(resolvedActionCode)) {
      throw createError(400, "notification_bulk_action_invalid", "Bulk notification action is not supported.");
    }
    const targetNotifications = resolveBulkNotificationTargets({
      state,
      companyId: resolvedCompanyId,
      notificationIds,
      actionCode: resolvedActionCode
    });
    const items = targetNotifications.map((notification) => (
      resolvedActionCode === "read"
        ? markNotificationRead({ companyId: resolvedCompanyId, notificationId: notification.notificationId, actorId })
        : acknowledgeNotification({ companyId: resolvedCompanyId, notificationId: notification.notificationId, actorId })
    ));
    return {
      actionCode: resolvedActionCode,
      totalCount: items.length,
      items
    };
  }

  function buildNotificationDigest({
    companyId,
    recipientType,
    recipientId,
    channelCode = "in_app",
    categoryCode = null,
    onlyUnread = true,
    generatedAt = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedRecipientType = assertAllowed(normalizeEnumValue(recipientType, "notification_recipient_type_required"), NOTIFICATION_RECIPIENT_TYPES, "notification_recipient_type_invalid");
    const resolvedRecipientId = requireText(recipientId, "notification_recipient_id_required");
    const resolvedChannelCode = assertAllowed(normalizeEnumValue(channelCode, "notification_channel_code_required"), NOTIFICATION_CHANNEL_CODES, "notification_channel_code_invalid");
    const items = listNotifications({
      companyId: resolvedCompanyId,
      recipientType: resolvedRecipientType,
      recipientId: resolvedRecipientId,
      categoryCode,
      onlyUnread
    });
    const summary = getNotificationInboxSummary({
      companyId: resolvedCompanyId,
      recipientType: resolvedRecipientType,
      recipientId: resolvedRecipientId,
      categoryCode,
      onlyUnread
    });
    const resolvedGeneratedAt = normalizeOptionalDateTime(generatedAt) || nowIso(clock);
    const resolvedCategoryCode = normalizeOptionalCode(categoryCode);
    const fingerprint = buildDigestFingerprint({
      companyId: resolvedCompanyId,
      recipientType: resolvedRecipientType,
      recipientId: resolvedRecipientId,
      channelCode: resolvedChannelCode,
      categoryCode: resolvedCategoryCode,
      onlyUnread,
      notificationIds: items.map((item) => item.notificationId)
    });
    const existingDigestId = state.digestIdByFingerprint.get(fingerprint);
    if (existingDigestId) {
      const existingDigest = state.digests.get(existingDigestId);
      if (existingDigest && existingDigest.status !== "superseded") {
        return copy(existingDigest);
      }
    }

    for (const digestId of state.digestIdsByCompany.get(resolvedCompanyId) || []) {
      const existingDigest = state.digests.get(digestId);
      if (!existingDigest || existingDigest.status === "superseded") {
        continue;
      }
      if (
        existingDigest.recipientType === resolvedRecipientType
        && existingDigest.recipientId === resolvedRecipientId
        && existingDigest.channelCode === resolvedChannelCode
        && existingDigest.categoryCode === resolvedCategoryCode
        && existingDigest.onlyUnread === onlyUnread
      ) {
        existingDigest.status = "superseded";
        existingDigest.supersededAt = resolvedGeneratedAt;
        existingDigest.updatedAt = resolvedGeneratedAt;
      }
    }

    const digest = {
      notificationDigestId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      recipientType: resolvedRecipientType,
      recipientId: resolvedRecipientId,
      channelCode: resolvedChannelCode,
      categoryCode: resolvedCategoryCode,
      onlyUnread,
      generatedAt: resolvedGeneratedAt,
      totalCount: summary.totalCount,
      unreadCount: summary.unreadCount,
      countsByPriority: copy(summary.countsByPriority),
      groups: copy(summary.groups),
      notificationIds: items.map((item) => item.notificationId),
      newestCreatedAt: items[0]?.createdAt || null,
      oldestCreatedAt: items.length > 0 ? items[items.length - 1].createdAt : null,
      status: "built",
      fingerprint,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: resolvedGeneratedAt,
      updatedAt: resolvedGeneratedAt,
      supersededAt: null
    };
    state.digests.set(digest.notificationDigestId, digest);
    appendToIndex(state.digestIdsByCompany, resolvedCompanyId, digest.notificationDigestId);
    state.digestIdByFingerprint.set(fingerprint, digest.notificationDigestId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: digest.createdByActorId,
      action: "notification.digest_built",
      entityType: "notification_digest",
      entityId: digest.notificationDigestId,
      explanation: `Built notification digest for ${resolvedRecipientType} ${resolvedRecipientId} on ${resolvedChannelCode}.`
    });
    return copy(digest);
  }

  function listNotificationDigests({
    companyId,
    recipientType = null,
    recipientId = null,
    channelCode = null,
    categoryCode = null,
    status = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedRecipientType = recipientType == null ? null : assertAllowed(normalizeEnumValue(recipientType, "notification_recipient_type_required"), NOTIFICATION_RECIPIENT_TYPES, "notification_recipient_type_invalid");
    const resolvedChannelCode = channelCode == null ? null : assertAllowed(normalizeEnumValue(channelCode, "notification_channel_code_required"), NOTIFICATION_CHANNEL_CODES, "notification_channel_code_invalid");
    const resolvedStatus = status == null ? null : assertAllowed(normalizeEnumValue(status, "notification_digest_status_required"), NOTIFICATION_DIGEST_STATUSES, "notification_digest_status_invalid");
    const resolvedCategoryCode = normalizeOptionalCode(categoryCode);
    return (state.digestIdsByCompany.get(resolvedCompanyId) || [])
      .map((digestId) => state.digests.get(digestId))
      .filter(Boolean)
      .map(copy)
      .filter((digest) => (resolvedRecipientType ? digest.recipientType === resolvedRecipientType : true))
      .filter((digest) => (recipientId ? digest.recipientId === recipientId : true))
      .filter((digest) => (resolvedChannelCode ? digest.channelCode === resolvedChannelCode : true))
      .filter((digest) => (resolvedCategoryCode ? digest.categoryCode === resolvedCategoryCode : true))
      .filter((digest) => (resolvedStatus ? digest.status === resolvedStatus : true))
      .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt) || right.notificationDigestId.localeCompare(left.notificationDigestId));
  }

  function getNotificationDigest({ companyId, notificationDigestId } = {}) {
    const digest = state.digests.get(requireText(notificationDigestId, "notification_digest_id_required"));
    if (!digest) {
      throw createError(404, "notification_digest_not_found", "Notification digest was not found.");
    }
    if (companyId && digest.companyId !== companyId) {
      throw createError(403, "cross_company_forbidden", "Notification digest belongs to another company.");
    }
    return copy(digest);
  }

  function expireNotification({ companyId, notificationId, actorId = "system", reasonCode = "expired" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    if (["cancelled", "expired", "acknowledged"].includes(notification.status)) {
      return presentNotification(state, notification, { includeHistory: true });
    }
    notification.status = "expired";
    notification.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: notification.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "notification.expired",
      entityType: "notification",
      entityId: notification.notificationId,
      explanation: `Notification ${notification.notificationId} expired with reason ${normalizeCode(reasonCode, "notification_expire_reason_required")}.`
    });
    return presentNotification(state, notification, { includeHistory: true });
  }

  function expireNotificationsDue({ companyId = null, asOf = null, actorId = "system", reasonCode = "expired" } = {}) {
    const resolvedCompanyId = normalizeOptionalText(companyId);
    const cutoff = normalizeOptionalDateTime(asOf) || nowIso(clock);
    const items = [...state.notifications.values()]
      .filter((notification) => (resolvedCompanyId ? notification.companyId === resolvedCompanyId : true))
      .filter((notification) => Boolean(notification.expiresAt) && notification.expiresAt <= cutoff)
      .filter((notification) => !["cancelled", "expired", "acknowledged"].includes(notification.status))
      .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt))
      .map((notification) => expireNotification({
        companyId: notification.companyId,
        notificationId: notification.notificationId,
        actorId,
        reasonCode
      }));
    return {
      asOf: cutoff,
      totalCount: items.length,
      items
    };
  }

  function releaseSnoozedNotifications({ companyId = null, asOf = null, actorId = "system" } = {}) {
    const resolvedCompanyId = normalizeOptionalText(companyId);
    const cutoff = normalizeOptionalDateTime(asOf) || nowIso(clock);
    const items = [...state.notifications.values()]
      .filter((notification) => (resolvedCompanyId ? notification.companyId === resolvedCompanyId : true))
      .filter((notification) => notification.status === "snoozed")
      .filter((notification) => Boolean(notification.snoozedUntil) && notification.snoozedUntil <= cutoff)
      .sort((left, right) => left.snoozedUntil.localeCompare(right.snoozedUntil))
      .map((notification) => releaseSnoozedNotification({
        state,
        clock,
        notification,
        actorId
      }));
    return {
      asOf: cutoff,
      totalCount: items.length,
      items
    };
  }

  function markNotificationRead({ companyId, notificationId, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    if (["cancelled", "expired"].includes(notification.status)) {
      throw createError(409, "notification_not_readable", "Notification cannot be read from its current status.");
    }
    notification.status = notification.status === "acknowledged" ? "acknowledged" : "read";
    notification.lastReadAt = nowIso(clock);
    notification.updatedAt = nowIso(clock);
    appendAction(state, clock, notification, { actionCode: "read", resultCode: "success", actedBy: requireText(actorId, "actor_id_required") });
    return presentNotification(state, notification, { includeHistory: true });
  }

  function acknowledgeNotification({ companyId, notificationId, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    if (["cancelled", "expired"].includes(notification.status)) {
      throw createError(409, "notification_not_acknowledgeable", "Notification cannot be acknowledged from its current status.");
    }
    notification.status = "acknowledged";
    notification.acknowledgedAt = nowIso(clock);
    notification.updatedAt = nowIso(clock);
    appendAction(state, clock, notification, { actionCode: "acknowledge", resultCode: "success", actedBy: requireText(actorId, "actor_id_required") });
    return presentNotification(state, notification, { includeHistory: true });
  }

  function snoozeNotification({ companyId, notificationId, until, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    if (["cancelled", "expired", "acknowledged"].includes(notification.status)) {
      throw createError(409, "notification_not_snoozable", "Notification cannot be snoozed from its current status.");
    }
    notification.status = "snoozed";
    notification.snoozedUntil = normalizeOptionalDateTime(until) || addHours(nowIso(clock), 4);
    notification.updatedAt = nowIso(clock);
    appendAction(state, clock, notification, { actionCode: "snooze", resultCode: "success", actedBy: requireText(actorId, "actor_id_required") });
    return presentNotification(state, notification, { includeHistory: true });
  }

  function cancelNotification({ companyId, notificationId, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    notification.status = "cancelled";
    notification.updatedAt = nowIso(clock);
    appendAction(state, clock, notification, { actionCode: "cancel", resultCode: "success", actedBy: requireText(actorId, "actor_id_required") });
    return presentNotification(state, notification, { includeHistory: true });
  }

  function scanNotificationEscalations({ companyId, asOf = null, escalationPolicyCode = "notification.default", actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedAsOf = normalizeOptionalDateTime(asOf) || nowIso(clock);
    const resolvedPolicyCode = normalizeCode(escalationPolicyCode, "notification_escalation_policy_code_required");
    const items = [];
    let createdCount = 0;
    let recurringCount = 0;

    for (const notification of listNotificationsForEscalation(state, resolvedCompanyId)) {
      const thresholdMinutes = resolveNotificationEscalationThresholdMinutes(notification.priorityCode);
      const ageMinutes = calculateNotificationAgeMinutes(state, notification, resolvedAsOf);
      if (ageMinutes < thresholdMinutes) {
        continue;
      }
      const breachLevel = Math.max(1, Math.floor(ageMinutes / thresholdMinutes));
      const existingEscalation = findNotificationEscalation(state, notification.notificationId, breachLevel);
      if (existingEscalation) {
        items.push(copy(existingEscalation));
        continue;
      }
      if (breachLevel > 1) {
        recurringCount += 1;
      } else {
        createdCount += 1;
      }
      const escalation = createNotificationEscalation({
        state,
        clock,
        notification,
        breachLevel,
        thresholdMinutes,
        triggeredAt: resolvedAsOf,
        escalationPolicyCode: resolvedPolicyCode,
        actorId
      });
      items.push(escalation);
    }

    return {
      asOf: resolvedAsOf,
      scannedCount: (state.notificationIdsByCompany.get(resolvedCompanyId) || []).length,
      createdCount,
      recurringCount,
      items
    };
  }

  function listNotificationEscalations({ companyId, notificationId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status == null ? null : assertAllowed(normalizeEnumValue(status, "notification_escalation_status_required"), NOTIFICATION_ESCALATION_STATUSES, "notification_escalation_status_invalid");
    return (state.escalationIdsByCompany.get(resolvedCompanyId) || [])
      .map((escalationId) => state.escalations.get(escalationId))
      .filter(Boolean)
      .map(copy)
      .filter((escalation) => (notificationId ? escalation.notificationId === notificationId : true))
      .filter((escalation) => (resolvedStatus ? escalation.status === resolvedStatus : true))
      .sort((left, right) => right.triggeredAt.localeCompare(left.triggeredAt) || right.notificationEscalationId.localeCompare(left.notificationEscalationId));
  }

  function listNotificationAuditEvents({ companyId, notificationId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return state.auditEvents.filter((event) => event.companyId === resolvedCompanyId && (!notificationId || event.entityId === notificationId)).map(copy);
  }

  function snapshotNotifications() {
    return {
      notifications: [...state.notifications.values()].map(copy),
      deliveries: [...state.deliveries.values()].map(copy),
      actions: [...state.actions.values()].map(copy),
      digests: [...state.digests.values()].map(copy),
      escalations: [...state.escalations.values()].map(copy),
      auditEvents: state.auditEvents.map(copy)
    };
  }
}

function presentNotification(state, notification, { includeHistory = false } = {}) {
  const result = {
    ...copy(notification),
    unread: isNotificationUnread(notification)
  };
  if (includeHistory) {
    result.deliveries = (state.deliveryIdsByNotification.get(notification.notificationId) || []).map((deliveryId) => copy(state.deliveries.get(deliveryId))).filter(Boolean);
    result.actions = (state.actionIdsByNotification.get(notification.notificationId) || []).map((actionId) => copy(state.actions.get(actionId))).filter(Boolean);
  }
  return result;
}

function appendAction(state, clock, notification, { actionCode, resultCode, actedBy }) {
  const action = {
    notificationActionId: crypto.randomUUID(),
    notificationId: notification.notificationId,
    companyId: notification.companyId,
    actionCode: assertAllowed(normalizeEnumValue(actionCode, "notification_action_code_required"), NOTIFICATION_ACTION_CODES, "notification_action_code_invalid"),
    actedBy: requireText(actedBy, "actor_id_required"),
    actedAt: nowIso(clock),
    resultCode: normalizeCode(resultCode, "notification_action_result_required")
  };
  state.actions.set(action.notificationActionId, action);
  appendToIndex(state.actionIdsByNotification, notification.notificationId, action.notificationActionId);
  pushAudit(state, clock, {
    companyId: notification.companyId,
    actorId: action.actedBy,
    action: `notification.${action.actionCode}`,
    entityType: "notification",
    entityId: notification.notificationId,
    explanation: `Notification ${notification.notificationId} received action ${action.actionCode}.`
  });
  return action;
}

function requireNotification(state, companyId, notificationId) {
  const notification = state.notifications.get(requireText(notificationId, "notification_id_required"));
  if (!notification) {
    throw createError(404, "notification_not_found", "Notification was not found.");
  }
  if (companyId && notification.companyId !== companyId) {
    throw createError(403, "cross_company_forbidden", "Notification belongs to another company.");
  }
  return notification;
}

function resolveBulkNotificationTargets({ state, companyId, notificationIds, actionCode }) {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw createError(400, "notification_ids_required", "At least one notification id is required.");
  }
  const uniqueIds = [...new Set(notificationIds.map((notificationId) => requireText(notificationId, "notification_id_required")))];
  const notifications = uniqueIds.map((notificationId) => requireNotification(state, companyId, notificationId));
  for (const notification of notifications) {
    if (actionCode === "read" && ["cancelled", "expired"].includes(notification.status)) {
      throw createError(409, "notification_not_readable", "Notification cannot be read from its current status.");
    }
    if (actionCode === "acknowledge" && ["cancelled", "expired"].includes(notification.status)) {
      throw createError(409, "notification_not_acknowledgeable", "Notification cannot be acknowledged from its current status.");
    }
  }
  return notifications;
}

function compareNotifications(left, right) {
  const priorityRank = NOTIFICATION_PRIORITY_CODES.indexOf(right.priorityCode) - NOTIFICATION_PRIORITY_CODES.indexOf(left.priorityCode);
  if (priorityRank !== 0) {
    return priorityRank;
  }
  return right.createdAt.localeCompare(left.createdAt);
}

function ensureCategorySummary(categorySummaries, categoryCode) {
  let summary = categorySummaries.get(categoryCode);
  if (!summary) {
    summary = {
      categoryCode,
      totalCount: 0,
      unreadCount: 0,
      countsByPriority: Object.fromEntries(NOTIFICATION_PRIORITY_CODES.map((priorityCode) => [priorityCode, 0]))
    };
    categorySummaries.set(categoryCode, summary);
  }
  return summary;
}

function isNotificationUnread(notification) {
  return !["read", "acknowledged", "snoozed", "expired", "cancelled"].includes(notification.status);
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

function buildDigestFingerprint({ companyId, recipientType, recipientId, channelCode, categoryCode, onlyUnread, notificationIds }) {
  return [
    companyId,
    recipientType,
    recipientId,
    channelCode,
    categoryCode || "all",
    onlyUnread ? "unread_only" : "all_items",
    ...(Array.isArray(notificationIds) ? notificationIds : [])
  ].join("::");
}

function releaseSnoozedNotification({ state, clock, notification, actorId }) {
  notification.status = resolveReleasedNotificationStatus(state, notification);
  notification.snoozedUntil = null;
  notification.updatedAt = nowIso(clock);
  appendAction(state, clock, notification, {
    actionCode: "release_snooze",
    resultCode: "success",
    actedBy: requireText(actorId, "actor_id_required")
  });
  return presentNotification(state, notification, { includeHistory: true });
}

function resolveReleasedNotificationStatus(state, notification) {
  const latestDelivery = (state.deliveryIdsByNotification.get(notification.notificationId) || [])
    .map((deliveryId) => state.deliveries.get(deliveryId))
    .filter(Boolean)
    .sort((left, right) => right.attemptNo - left.attemptNo)[0] || null;
  if (!latestDelivery) {
    return "created";
  }
  return latestDelivery.status === "delivered" ? "delivered" : "queued";
}

function listNotificationsForEscalation(state, companyId) {
  return (state.notificationIdsByCompany.get(companyId) || [])
    .map((notificationId) => state.notifications.get(notificationId))
    .filter(Boolean)
    .filter((notification) => ["created", "queued", "delivered"].includes(notification.status));
}

function resolveNotificationEscalationThresholdMinutes(priorityCode) {
  switch (priorityCode) {
    case "critical":
      return 60;
    case "high":
      return 240;
    case "medium":
      return 720;
    default:
      return 2880;
  }
}

function calculateNotificationAgeMinutes(state, notification, asOf) {
  const deliveries = (state.deliveryIdsByNotification.get(notification.notificationId) || [])
    .map((deliveryId) => state.deliveries.get(deliveryId))
    .filter(Boolean)
    .sort((left, right) => right.attemptNo - left.attemptNo);
  const effectiveStart = deliveries.find((delivery) => delivery.deliveredAt)?.deliveredAt || notification.createdAt;
  return Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(effectiveStart)) / 60000));
}

function findNotificationEscalation(state, notificationId, breachLevel) {
  return (state.escalationIdsByNotification.get(notificationId) || [])
    .map((escalationId) => state.escalations.get(escalationId))
    .filter(Boolean)
    .find((escalation) => escalation.breachLevel === breachLevel) || null;
}

function createNotificationEscalation({
  state,
  clock,
  notification,
  breachLevel,
  thresholdMinutes,
  triggeredAt,
  escalationPolicyCode,
  actorId
}) {
  const priorEscalations = (state.escalationIdsByNotification.get(notification.notificationId) || [])
    .map((escalationId) => state.escalations.get(escalationId))
    .filter(Boolean)
    .filter((escalation) => escalation.status === "open");
  for (const priorEscalation of priorEscalations) {
    priorEscalation.status = "superseded";
    priorEscalation.updatedAt = triggeredAt;
  }
  const escalation = {
    notificationEscalationId: crypto.randomUUID(),
    notificationId: notification.notificationId,
    companyId: notification.companyId,
    recipientType: notification.recipientType,
    recipientId: notification.recipientId,
    priorityCode: notification.priorityCode,
    categoryCode: notification.categoryCode,
    escalationPolicyCode,
    thresholdMinutes,
    breachLevel,
    recurringBreach: breachLevel > 1,
    status: "open",
    triggeredAt,
    createdByActorId: requireText(actorId, "actor_id_required"),
    createdAt: triggeredAt,
    updatedAt: triggeredAt
  };
  state.escalations.set(escalation.notificationEscalationId, escalation);
  appendToIndex(state.escalationIdsByCompany, notification.companyId, escalation.notificationEscalationId);
  appendToIndex(state.escalationIdsByNotification, notification.notificationId, escalation.notificationEscalationId);
  pushAudit(state, clock, {
    companyId: notification.companyId,
    actorId: escalation.createdByActorId,
    action: "notification.escalated",
    entityType: "notification_escalation",
    entityId: escalation.notificationEscalationId,
    explanation: escalation.recurringBreach
      ? `Recurring escalation created for notification ${notification.notificationId}.`
      : `Escalation created for notification ${notification.notificationId}.`
  });
  appendAction(state, clock, notification, {
    actionCode: "escalate",
    resultCode: escalation.recurringBreach ? "recurring_breach" : "first_breach",
    actedBy: escalation.createdByActorId
  });
  return copy(escalation);
}

function pushAudit(state, clock, {
  companyId,
  actorId,
  action,
  entityType,
  entityId,
  explanation,
  result = "success",
  correlationId = crypto.randomUUID(),
  metadata = {},
  sessionId = null
}) {
  state.auditEvents.push(
    createAuditEnvelope({
      companyId,
      actorId,
      action,
      entityType,
      entityId,
      explanation,
      result,
      correlationId,
      metadata,
      sessionId,
      recordedAt: new Date(clock()),
      auditClass: "notification_action"
    })
  );
}

function normalizeCode(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function normalizeOptionalCode(value) {
  return value == null || String(value).trim().length === 0 ? null : normalizeCode(value, "code_required");
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeEnumValue(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toLowerCase();
}

function normalizeOptionalDateTime(value) {
  if (value == null || String(value).trim().length === 0) {
    return null;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw createError(400, "notification_datetime_invalid", "Datetime is invalid.");
  }
  return date.toISOString();
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

