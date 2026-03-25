import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationsEngine } from "../../packages/domain-notifications/src/index.mjs";
import { createActivityEngine } from "../../packages/domain-activity/src/index.mjs";

test("Step 13 notifications deduplicate active items and track delivery and user actions", () => {
  const notifications = createNotificationsEngine({
    clock: () => new Date("2026-03-24T15:00:00Z")
  });
  const companyId = "company_notify_1";

  const notification = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_1",
    categoryCode: "review_due",
    priorityCode: "high",
    sourceDomainCode: "REVIEW_CENTER",
    sourceObjectType: "review_item",
    sourceObjectId: "review_1",
    title: "Review item waiting",
    body: "A review item requires your attention.",
    actorId: "system"
  });
  const duplicate = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_1",
    categoryCode: "review_due",
    priorityCode: "high",
    sourceDomainCode: "REVIEW_CENTER",
    sourceObjectType: "review_item",
    sourceObjectId: "review_1",
    title: "Duplicate",
    body: "Should not create a second active notification.",
    actorId: "system"
  });
  assert.equal(duplicate.notificationId, notification.notificationId);

  const delivered = notifications.deliverNotification({
    companyId,
    notificationId: notification.notificationId,
    channelCode: "in_app",
    actorId: "system"
  });
  assert.equal(delivered.status, "delivered");

  const read = notifications.markNotificationRead({
    companyId,
    notificationId: notification.notificationId,
    actorId: "user_1"
  });
  assert.equal(read.status, "read");

  const acknowledged = notifications.acknowledgeNotification({
    companyId,
    notificationId: notification.notificationId,
    actorId: "user_1"
  });
  assert.equal(acknowledged.status, "acknowledged");
  assert.equal(acknowledged.actions.length, 2);

  const queued = notifications.createNotification({
    companyId,
    recipientType: "team",
    recipientId: "finance_ops",
    categoryCode: "deadline_warning",
    priorityCode: "medium",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work_1",
    title: "Deadline warning",
    body: "Work item will be overdue soon.",
    actorId: "system"
  });
  const failedDelivery = notifications.deliverNotification({
    companyId,
    notificationId: queued.notificationId,
    channelCode: "email",
    status: "failed",
    failureReasonCode: "smtp_unreachable",
    actorId: "system"
  });
  assert.equal(failedDelivery.status, "queued");

  const snoozed = notifications.snoozeNotification({
    companyId,
    notificationId: queued.notificationId,
    until: "2026-03-24T18:00:00Z",
    actorId: "user_2"
  });
  assert.equal(snoozed.status, "snoozed");
  const retried = notifications.retryNotificationDelivery({
    companyId,
    notificationId: queued.notificationId,
    actorId: "support_1"
  });
  assert.equal(retried.status, "queued");
  assert.equal(retried.deliveries.length, 2);
  assert.equal(retried.deliveries[1].status, "queued");
  assert.equal(retried.deliveries[1].channelCode, "email");

  const summary = notifications.getNotificationInboxSummary({
    companyId,
    recipientType: "user",
    recipientId: "user_1"
  });
  assert.equal(summary.totalCount, 1);
  assert.equal(summary.unreadCount, 0);
  assert.equal(summary.countsByStatus.acknowledged, 1);
  assert.equal(summary.countsByPriority.high, 1);
  assert.deepEqual(summary.groups, [
    {
      categoryCode: "REVIEW_DUE",
      totalCount: 1,
      unreadCount: 0,
      countsByPriority: {
        low: 0,
        medium: 0,
        high: 1,
        critical: 0
      }
    }
  ]);
});

test("Step 13 notifications support bulk read and acknowledge without double-processing duplicate ids", () => {
  const notifications = createNotificationsEngine({
    clock: () => new Date("2026-03-24T17:00:00Z")
  });
  const companyId = "company_notify_bulk_1";

  const first = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_bulk_1",
    categoryCode: "deadline_warning",
    priorityCode: "medium",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work_1",
    title: "Deadline warning",
    body: "A work item deadline is approaching.",
    actorId: "system"
  });
  const second = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_bulk_1",
    categoryCode: "review_due",
    priorityCode: "high",
    sourceDomainCode: "REVIEW_CENTER",
    sourceObjectType: "review_item",
    sourceObjectId: "review_bulk_1",
    title: "Review assigned",
    body: "A review item requires action.",
    actorId: "system"
  });

  const bulkRead = notifications.bulkApplyNotificationAction({
    companyId,
    notificationIds: [first.notificationId, first.notificationId, second.notificationId],
    actionCode: "read",
    actorId: "user_bulk_1"
  });
  assert.equal(bulkRead.actionCode, "read");
  assert.equal(bulkRead.totalCount, 2);
  assert.deepEqual(
    bulkRead.items.map((item) => item.notificationId).sort(),
    [first.notificationId, second.notificationId].sort()
  );
  assert.equal(bulkRead.items.every((item) => item.status === "read"), true);

  const bulkAck = notifications.bulkApplyNotificationAction({
    companyId,
    notificationIds: [first.notificationId, second.notificationId],
    actionCode: "acknowledge",
    actorId: "user_bulk_1"
  });
  assert.equal(bulkAck.actionCode, "acknowledge");
  assert.equal(bulkAck.totalCount, 2);
  assert.equal(bulkAck.items.every((item) => item.status === "acknowledged"), true);

  const firstDetail = notifications.getNotification({ companyId, notificationId: first.notificationId });
  assert.equal(firstDetail.actions.length, 2);
  assert.deepEqual(
    firstDetail.actions.map((action) => action.actionCode),
    ["read", "acknowledge"]
  );
});

test("Step 13 notifications expire due items without mutating terminal notifications", () => {
  const notifications = createNotificationsEngine({
    clock: () => new Date("2026-03-24T19:00:00Z")
  });
  const companyId = "company_notify_expire_1";

  const due = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_expire_1",
    categoryCode: "deadline_warning",
    priorityCode: "medium",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work_expire_1",
    title: "Due now",
    body: "This notification should expire.",
    expiresAt: "2026-03-24T18:00:00Z",
    actorId: "system"
  });
  const future = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_expire_1",
    categoryCode: "deadline_warning",
    priorityCode: "low",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work_expire_2",
    title: "Future",
    body: "This notification should stay active.",
    expiresAt: "2026-03-24T20:00:00Z",
    actorId: "system"
  });
  const acknowledged = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_expire_1",
    categoryCode: "review_due",
    priorityCode: "high",
    sourceDomainCode: "REVIEW_CENTER",
    sourceObjectType: "review_item",
    sourceObjectId: "review_expire_1",
    title: "Already acknowledged",
    body: "This notification should remain acknowledged.",
    expiresAt: "2026-03-24T17:00:00Z",
    actorId: "system"
  });
  notifications.acknowledgeNotification({
    companyId,
    notificationId: acknowledged.notificationId,
    actorId: "user_expire_1"
  });

  const expired = notifications.expireNotificationsDue({
    companyId,
    asOf: "2026-03-24T19:00:00Z",
    actorId: "scheduler_1",
    reasonCode: "notification_ttl_elapsed"
  });
  assert.equal(expired.totalCount, 1);
  assert.equal(expired.items[0].notificationId, due.notificationId);
  assert.equal(expired.items[0].status, "expired");

  assert.equal(notifications.getNotification({ companyId, notificationId: future.notificationId }).status, "created");
  assert.equal(notifications.getNotification({ companyId, notificationId: acknowledged.notificationId }).status, "acknowledged");
});

test("Step 13 activity projects append-only entries and hides by policy without duplicates", () => {
  const activity = createActivityEngine({
    clock: () => new Date("2026-03-24T15:30:00Z")
  });
  const companyId = "company_activity_1";

  const entry = activity.projectActivityEntry({
    companyId,
    objectType: "review_item",
    objectId: "review_1",
    activityType: "review_item_decided",
    actorType: "user",
    actorSnapshot: { userId: "user_1" },
    summary: "Review item approved.",
    sourceEventId: "evt_1",
    visibilityScope: "company",
    relatedObjects: [
      {
        relatedObjectType: "document",
        relatedObjectId: "doc_1",
        relationCode: "primary_document"
      }
    ],
    actorId: "system"
  });
  const duplicate = activity.projectActivityEntry({
    companyId,
    objectType: "review_item",
    objectId: "review_1",
    activityType: "review_item_decided",
    actorType: "user",
    actorSnapshot: { userId: "user_1" },
    summary: "Duplicate should dedupe.",
    sourceEventId: "evt_1",
    visibilityScope: "company",
    actorId: "system"
  });
  assert.equal(duplicate.activityEntryId, entry.activityEntryId);

  const list = activity.listActivityEntries({
    companyId,
    relatedObjectType: "document",
    relatedObjectId: "doc_1"
  });
  assert.equal(list.length, 1);

  const hidden = activity.hideActivityEntryByPolicy({
    companyId,
    activityEntryId: entry.activityEntryId,
    reasonCode: "sensitive_actor_hidden",
    actorId: "backoffice_1"
  });
  assert.equal(hidden.status, "hidden_by_policy");
});

test("Step 13 activity supports stable cursor pagination", () => {
  const activity = createActivityEngine({
    clock: () => new Date("2026-03-24T16:30:00Z")
  });
  const companyId = "company_activity_page_1";

  const first = activity.projectActivityEntry({
    companyId,
    objectType: "review_item",
    objectId: "review_page_1",
    activityType: "review_item_created",
    actorType: "system",
    actorSnapshot: { actorId: "system" },
    summary: "Older entry.",
    occurredAt: "2026-03-24T16:00:00Z",
    sourceEventId: "page_evt_1",
    visibilityScope: "company",
    actorId: "system"
  });
  const second = activity.projectActivityEntry({
    companyId,
    objectType: "review_item",
    objectId: "review_page_1",
    activityType: "review_item_updated",
    actorType: "user",
    actorSnapshot: { userId: "user_1" },
    summary: "Newer entry.",
    occurredAt: "2026-03-24T16:05:00Z",
    sourceEventId: "page_evt_2",
    visibilityScope: "company",
    actorId: "user_1"
  });

  const firstPage = activity.listActivityEntriesPage({
    companyId,
    objectType: "review_item",
    objectId: "review_page_1",
    limit: 1
  });
  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.items[0].activityEntryId, second.activityEntryId);
  assert.equal(typeof firstPage.nextCursor, "string");

  const secondPage = activity.listActivityEntriesPage({
    companyId,
    objectType: "review_item",
    objectId: "review_page_1",
    limit: 1,
    cursor: firstPage.nextCursor
  });
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.items[0].activityEntryId, first.activityEntryId);
  assert.equal(secondPage.nextCursor, null);
});
