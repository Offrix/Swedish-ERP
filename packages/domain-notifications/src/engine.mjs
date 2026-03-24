import crypto from "node:crypto";
import {
  NOTIFICATION_ACTION_CODES,
  NOTIFICATION_CHANNEL_CODES,
  NOTIFICATION_DELIVERY_STATUSES,
  NOTIFICATION_PRIORITY_CODES,
  NOTIFICATION_RECIPIENT_TYPES,
  NOTIFICATION_STATUSES
} from "./constants.mjs";

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
    auditEvents: []
  };

  return {
    notificationStatuses: NOTIFICATION_STATUSES,
    notificationRecipientTypes: NOTIFICATION_RECIPIENT_TYPES,
    notificationPriorityCodes: NOTIFICATION_PRIORITY_CODES,
    notificationChannelCodes: NOTIFICATION_CHANNEL_CODES,
    createNotification,
    listNotifications,
    getNotification,
    deliverNotification,
    markNotificationRead,
    acknowledgeNotification,
    snoozeNotification,
    cancelNotification,
    listNotificationAuditEvents,
    snapshotNotifications
  };

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
      .filter((notification) => (onlyUnread ? !["read", "acknowledged"].includes(notification.status) : true))
      .sort(compareNotifications);
  }

  function getNotification({ companyId, notificationId } = {}) {
    return presentNotification(state, requireNotification(state, companyId, notificationId), { includeHistory: true });
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

  function markNotificationRead({ companyId, notificationId, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    if (["cancelled", "expired"].includes(notification.status)) {
      throw createError(409, "notification_not_readable", "Notification cannot be read from its current status.");
    }
    notification.status = notification.status === "acknowledged" ? "acknowledged" : "read";
    notification.lastReadAt = nowIso(clock);
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
    appendAction(state, clock, notification, { actionCode: "snooze", resultCode: "success", actedBy: requireText(actorId, "actor_id_required") });
    return presentNotification(state, notification, { includeHistory: true });
  }

  function cancelNotification({ companyId, notificationId, actorId = "system" } = {}) {
    const notification = requireNotification(state, companyId, notificationId);
    notification.status = "cancelled";
    appendAction(state, clock, notification, { actionCode: "cancel", resultCode: "success", actedBy: requireText(actorId, "actor_id_required") });
    return presentNotification(state, notification, { includeHistory: true });
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
      auditEvents: state.auditEvents.map(copy)
    };
  }
}

function presentNotification(state, notification, { includeHistory = false } = {}) {
  const result = {
    ...copy(notification),
    unread: !["read", "acknowledged"].includes(notification.status)
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

function compareNotifications(left, right) {
  const priorityRank = NOTIFICATION_PRIORITY_CODES.indexOf(right.priorityCode) - NOTIFICATION_PRIORITY_CODES.indexOf(left.priorityCode);
  if (priorityRank !== 0) {
    return priorityRank;
  }
  return right.createdAt.localeCompare(left.createdAt);
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
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

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
